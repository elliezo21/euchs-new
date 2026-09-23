/**
 * Vercel Serverless Function: /api/verify-business
 * 사업자 인증을 국세청 "사업자등록정보 진위확인" API로 서버에서 판정한다 (로그인 필수)
 *
 * ★ 왜 서버인가:
 *   예전에는 고객 브라우저가 형식 검사만 통과하면 profiles에 직접
 *   is_business_verified=true / verification_status='verified' / tier='business'를 UPDATE했다.
 *   개발자도구로 누구나 인증을 켤 수 있었다. 이제 인증 필드는 이 API(service_role)와
 *   관리자만 바꿀 수 있다 (DB 트리거 trg_guard_profile_verification이 브라우저 변경을 막는다).
 *
 * POST { representativeName: string, openDate: 'YYYY-MM-DD' }
 *   · 사업자번호·상호·통관부호는 body로 받지 않는다 — DB(profiles)에 저장된 값을 쓴다.
 * →    { success, status: 'verified'|'pending', reason: 'ok'|'format'|'mismatch'|'closed'|'unavailable', errors: [] }
 *
 * 국세청 API (공공데이터포털 15081808, Swagger: infuser.odcloud.kr/api/stages/28493/api-docs 대조 확인):
 *   POST https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey={키}
 *   body: { businesses: [{ b_no, start_dt(YYYYMMDD), p_nm }] }   ← 필수 3개만 보낸다
 *     (b_nm 상호 등 선택 항목을 보내면 표기 차이만으로 불일치가 나므로 보내지 않는다)
 *   응답: { status_code:'OK', data:[{ b_no, valid:'01'|'02', valid_msg?, status?:{ b_stt_cd:'01'|'02'|'03', ... } }] }
 *     valid '01' = 일치, '02' = 확인할 수 없음
 *     b_stt_cd '01' 계속사업자, '02' 휴업자, '03' 폐업자
 *   ※ returnType 쿼리는 Swagger에 없는 파라미터라 붙이지 않는다. Accept 헤더로 JSON을 요청한다.
 *
 * 환경변수:
 *   SUPABASE_URL(또는 VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY — service_role은 브라우저 노출 금지
 *   NTS_API_KEY — 공공데이터포털 인증키. 값은 절대 로그에 남기지 않는다.
 */

import { verifyUserToken } from './bulk-item-detail.js'

const NTS_VALIDATE_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/validate'
const NTS_TIMEOUT_MS = 10000

const PROFILE_COLUMNS = 'id,company_name,business_number,pccc,representative_name,business_open_date,is_business_verified,verification_status'

function getServiceRoleConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return { url, serviceRoleKey }
}

/** 'YYYY-MM-DD' 형식이고 실제 존재하는 날짜인지 (2020-02-30 같은 값 거부) */
function isValidDateStr(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

async function readProfile(userId, url, serviceRoleKey) {
  const r = await fetch(`${url}/rest/v1/profiles?select=${PROFILE_COLUMNS}&id=eq.${encodeURIComponent(userId)}`, {
    headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(`profiles 조회 실패: ${err?.message || r.status}`)
  }
  const rows = await r.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

/**
 * profiles 행 수정 (service_role). filters는 추가 PostgREST 조건 문자열.
 * @returns {Promise<number>} 수정된 행 수
 */
async function patchProfile(userId, patch, filters, url, serviceRoleKey) {
  const r = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}${filters}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(patch),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(`profiles 수정 실패: ${err?.message || r.status}`)
  }
  const rows = await r.json()
  return Array.isArray(rows) ? rows.length : 0
}

/**
 * 국세청 진위확인 호출.
 * @returns {Promise<{ ok: true, valid: string, bSttCd: string|null } | { ok: false, error: string }>}
 */
async function callNtsValidate(bNo, startDt, pNm) {
  const rawKey = String(process.env.NTS_API_KEY || '').trim()
  if (!rawKey) return { ok: false, error: 'NTS_API_KEY 환경변수 미설정' }

  // 공공데이터포털은 Encoding/Decoding 두 가지 키를 준다. '%'가 있으면 이미 인코딩된 키 — 그대로 쓴다(이중 인코딩 금지).
  const serviceKey = rawKey.includes('%') ? rawKey : encodeURIComponent(rawKey)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NTS_TIMEOUT_MS)
  let r, text
  try {
    r = await fetch(`${NTS_VALIDATE_URL}?serviceKey=${serviceKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ businesses: [{ b_no: bNo, start_dt: startDt, p_nm: pNm }] }),
      signal: controller.signal,
    })
    text = await r.text()
  } catch (e) {
    // URL에 키가 들어 있으므로 요청 URL은 로그에 남기지 않는다
    return { ok: false, error: e.name === 'AbortError' ? `타임아웃(${NTS_TIMEOUT_MS}ms)` : `네트워크 오류: ${e.message}` }
  } finally {
    clearTimeout(timer)
  }

  if (!r.ok) return { ok: false, error: `HTTP ${r.status} ${String(text || '').slice(0, 300)}` }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: `JSON 아닌 응답: ${String(text || '').slice(0, 300)}` }
  }
  if (data?.status_code !== 'OK') return { ok: false, error: `status_code=${data?.status_code}` }

  const item = Array.isArray(data.data) ? data.data[0] : null
  if (!item || String(item.b_no || '') !== bNo) {
    return { ok: false, error: `응답 data[0] 없음/사업자번호 불일치: ${JSON.stringify(data).slice(0, 300)}` }
  }
  return { ok: true, valid: String(item.valid || ''), bSttCd: item.status?.b_stt_cd ? String(item.status.b_stt_cd) : null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    console.error('[verify-business] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    return res.status(500).json({ success: false, message: 'Supabase 서버 환경변수 미설정' })
  }

  // ── 1. 로그인 검증 (api/bulk-item-detail.js와 같은 함수) ──
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const auth = await verifyUserToken(bearerToken, url, serviceRoleKey)
  if (!auth.ok) {
    console.warn('[verify-business] 인증 실패:', auth.error)
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }
  const userId = auth.userId

  // ── 2. 저장된 프로필 조회 (사업자번호·상호·통관부호의 기준) ──
  let profile
  try {
    profile = await readProfile(userId, url, serviceRoleKey)
  } catch (e) {
    console.error('[verify-business] 프로필 조회 오류:', e.message)
    return res.status(200).json({ success: false, status: 'pending', reason: 'unavailable', errors: [] })
  }
  if (!profile) {
    console.error(`[verify-business] profiles 행 없음 user=${userId}`)
    return res.status(404).json({ success: false, message: '회원 정보를 찾을 수 없습니다.' })
  }
  const currentStatus = profile.is_business_verified === true ? 'verified' : 'pending'

  // ── 3. 형식 검사 ──
  const body = req.body || {}
  const representativeName = String(body.representativeName || '').trim()
  const openDate = String(body.openDate || '').trim()
  const bNo = String(profile.business_number || '').replace(/[^0-9]/g, '')
  // 통관부호는 비어있지 않음만 본다 — 사업자 통관고유부호는 상호로 시작해 P+12 형식이 아니다.
  // 형식·진위 검증은 관세청 유니패스 API로 따로 한다(값 변형 없음).
  const pccc = String(profile.pccc || '').trim()

  const errors = []
  if (!String(profile.company_name || '').trim()) errors.push('상호명을 입력해주세요.')
  if (bNo.length !== 10) errors.push('사업자등록번호는 10자리 숫자여야 합니다.')
  if (!pccc) errors.push('통관부호를 입력해주세요.')
  if (!representativeName) errors.push('대표자명을 입력해주세요.')
  if (!isValidDateStr(openDate)) errors.push('개업일자를 입력해주세요. (사업자등록증의 개업연월일)')
  if (errors.length > 0) {
    return res.status(200).json({ success: false, status: currentStatus, reason: 'format', errors })
  }

  // ── 4. 국세청 진위확인 ──
  const nts = await callNtsValidate(bNo, openDate.replace(/-/g, ''), representativeName)
  if (!nts.ok) {
    // 인증 상태는 건드리지 않는다. 원문은 서버 로그에만.
    console.error(`[verify-business] 국세청 호출 실패 user=${userId}:`, nts.error)
    return res.status(200).json({ success: false, status: currentStatus, reason: 'unavailable', errors: [] })
  }

  let reason
  if (nts.valid === '02') {
    reason = 'mismatch'
  } else if (nts.valid === '01' && nts.bSttCd === '01') {
    reason = 'ok'
  } else if (nts.valid === '01' && (nts.bSttCd === '02' || nts.bSttCd === '03')) {
    reason = 'closed'
  } else {
    console.error(`[verify-business] 알 수 없는 국세청 판정 user=${userId}: valid=${nts.valid} b_stt_cd=${nts.bSttCd}`)
    return res.status(200).json({ success: false, status: currentStatus, reason: 'unavailable', errors: [] })
  }

  // ── 5. 결과 저장 (service_role) ──
  try {
    if (reason === 'ok') {
      // 확인한 사업자번호가 그 사이 바뀌었으면 0행 — 다른 번호에 인증이 붙지 않게 한다
      const n = await patchProfile(userId, {
        is_business_verified: true,
        verification_status: 'verified',
        tier: 'business',
        business_verified_at: new Date().toISOString(),
        representative_name: representativeName,
        business_open_date: openDate,
        updated_at: new Date().toISOString(),
      }, `&business_number=eq.${encodeURIComponent(profile.business_number)}`, url, serviceRoleKey)
      if (n === 0) {
        console.error(`[verify-business] 인증 저장 0행 — 확인 도중 사업자번호가 바뀐 것으로 보임 user=${userId}`)
        return res.status(200).json({ success: false, status: currentStatus, reason: 'unavailable', errors: [] })
      }
      console.log(`[verify-business] 인증 완료 user=${userId}`)
      return res.status(200).json({ success: true, status: 'verified', reason: 'ok', errors: [] })
    }

    // 불일치·휴폐업: 인증 필드는 그대로(pending 유지).
    // 이미 인증된 회원(기존 6명 등)은 소급 해제하지 않으며, 입력값도 service_role로 덮어쓰지 않는다 —
    // service_role 쓰기는 트리거의 "대표자명·개업일 변경 시 pending 복귀"를 거치지 않기 때문이다.
    // (브라우저 저장 경로에서는 트리거가 정상 동작한다)
    if (profile.is_business_verified !== true) {
      await patchProfile(userId, {
        representative_name: representativeName,
        business_open_date: openDate,
        updated_at: new Date().toISOString(),
      }, '', url, serviceRoleKey)
    }
    console.log(`[verify-business] 인증 불가 user=${userId} reason=${reason}`)
    return res.status(200).json({ success: false, status: currentStatus, reason, errors: [] })
  } catch (e) {
    console.error(`[verify-business] 결과 저장 오류 user=${userId}:`, e.message)
    return res.status(200).json({ success: false, status: currentStatus, reason: 'unavailable', errors: [] })
  }
}
