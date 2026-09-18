/**
 * Vercel Serverless Function: /api/home-section-cache
 * 몰메인 6섹션 서버 공용 1688 검색결과 캐시 프록시
 *
 * home_section_cache 테이블은 RLS만 켜져 있고 anon/authenticated용 정책이 전혀 없어
 * (기본 거부) 브라우저(anon key)로는 직접 읽기/쓰기가 전부 막혀 있다. 이 서버리스
 * 함수만 SUPABASE_SERVICE_ROLE_KEY로 RLS를 우회해 접근한다 — 1688-search.js가
 * OneBound API를 중계하는 것과 같은 구조를 Supabase 대상으로 적용한 것.
 *
 * GET    ?sections=md,fashion&date=2026-09-18   → 오늘 저장된 섹션들의 payload 조회
 * POST   { sectionKey, cachedDate, payload }     → 신규 수집 결과 저장 (upsert)
 * DELETE ?date=2026-09-18                        → (관리자 전용) 해당 날짜 캐시 전체 삭제
 *
 * 환경변수 (api/1688-order-create.js와 동일):
 *   SUPABASE_URL              = https://kkqxdvytjcwqiditkqay.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = <service_role key>  ← 절대 브라우저 번들에 노출 금지
 */

const SECTION_KEY_RE = /^[a-z0-9_]{1,40}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_PAYLOAD_ITEMS = 20
const MAX_PAYLOAD_BYTES = 50000

function getServiceRoleConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return { url, serviceRoleKey }
}

/**
 * 관리자 세션 토큰 검증 (api/1688-order-create.js의 verifyAdminToken과 동일 로직)
 * DELETE(캐시 초기화)만 관리자 전용이므로 이 엔드포인트에서 재사용한다.
 */
async function verifyAdminToken(token) {
  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    return { ok: false, error: 'Supabase 환경변수 미설정' }
  }
  if (!token) {
    return { ok: false, error: '인증 토큰 없음' }
  }
  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${token}` },
    })
    if (!userRes.ok) return { ok: false, error: '유효하지 않은 세션 토큰' }
    const userData = await userRes.json()
    if (!userData?.id) return { ok: false, error: '세션에서 user_id 추출 실패' }

    const rpcRes = await fetch(`${url}/rest/v1/rpc/is_admin_or_staff`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (!rpcRes.ok) {
      const errBody = await rpcRes.json().catch(() => ({}))
      return { ok: false, error: `is_admin_or_staff RPC 오류: ${errBody?.message || rpcRes.status}` }
    }
    const isAdmin = await rpcRes.json()
    if (!isAdmin) return { ok: false, error: '관리자/스태프 권한 없음' }
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function handleGet(req, res, url, serviceRoleKey) {
  const sectionsRaw = String((req.query && req.query.sections) || '').trim()
  const date = String((req.query && req.query.date) || '').trim()

  if (!sectionsRaw || !DATE_RE.test(date)) {
    return res.status(400).json({ success: false, message: 'sections, date(YYYY-MM-DD) 파라미터가 필요합니다.' })
  }

  const sectionKeys = sectionsRaw.split(',').map(s => s.trim()).filter(s => SECTION_KEY_RE.test(s))
  if (sectionKeys.length === 0) {
    return res.status(200).json({ success: true, data: {} })
  }

  try {
    const inList = sectionKeys.join(',')
    const qs = `select=section_key,payload&cached_date=eq.${date}&section_key=in.(${inList})`
    const r = await fetch(`${url}/rest/v1/home_section_cache?${qs}`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
    })
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}))
      console.warn('[home-section-cache] GET 조회 실패:', errBody?.message || r.status)
      return res.status(200).json({ success: true, data: {} }) // 조회 실패 시에도 클라이언트는 캐시미스로 취급해 1688 재조회
    }
    const rows = await r.json()
    const data = {}
    for (const row of rows || []) {
      if (Array.isArray(row.payload) && row.payload.length > 0) data[row.section_key] = row.payload
    }
    return res.status(200).json({ success: true, data })
  } catch (e) {
    console.warn('[home-section-cache] GET 예외:', e.message)
    return res.status(200).json({ success: true, data: {} })
  }
}

async function handlePost(req, res, url, serviceRoleKey) {
  const body = req.body || {}
  const sectionKey = String(body.sectionKey || '').trim()
  const cachedDate = String(body.cachedDate || '').trim()
  const payload = body.payload

  if (!SECTION_KEY_RE.test(sectionKey) || !DATE_RE.test(cachedDate)) {
    return res.status(400).json({ success: false, message: 'sectionKey/cachedDate 형식이 올바르지 않습니다.' })
  }
  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ success: false, message: 'payload는 비어있지 않은 배열이어야 합니다.' })
  }
  if (payload.length > MAX_PAYLOAD_ITEMS) {
    return res.status(400).json({ success: false, message: `payload 항목이 너무 많습니다(최대 ${MAX_PAYLOAD_ITEMS}개).` })
  }
  const serialized = JSON.stringify(payload)
  if (serialized.length > MAX_PAYLOAD_BYTES) {
    return res.status(400).json({ success: false, message: 'payload 크기가 너무 큽니다.' })
  }

  try {
    const r = await fetch(`${url}/rest/v1/home_section_cache?on_conflict=section_key,cached_date`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{
        section_key: sectionKey,
        cached_date: cachedDate,
        payload,
        updated_at: new Date().toISOString(),
      }]),
    })
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}))
      console.warn('[home-section-cache] POST 저장 실패:', sectionKey, errBody?.message || r.status)
      return res.status(200).json({ success: false, message: errBody?.message || `HTTP ${r.status}` })
    }
    return res.status(200).json({ success: true })
  } catch (e) {
    console.warn('[home-section-cache] POST 예외:', sectionKey, e.message)
    return res.status(200).json({ success: false, message: e.message })
  }
}

async function handleDelete(req, res, url, serviceRoleKey) {
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const adminCheck = await verifyAdminToken(bearerToken)
  if (!adminCheck.ok) {
    console.warn('[home-section-cache] ⛔ 관리자 인증 실패 — 캐시 초기화 차단:', adminCheck.error)
    return res.status(401).json({ success: false, message: `관리자 인증 실패: ${adminCheck.error}` })
  }

  const date = String((req.query && req.query.date) || '').trim()
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ success: false, message: 'date(YYYY-MM-DD) 파라미터가 필요합니다.' })
  }

  try {
    const r = await fetch(`${url}/rest/v1/home_section_cache?cached_date=eq.${date}`, {
      method: 'DELETE',
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
    })
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}))
      return res.status(200).json({ success: false, message: errBody?.message || `HTTP ${r.status}` })
    }
    return res.status(200).json({ success: true })
  } catch (e) {
    return res.status(200).json({ success: false, message: e.message })
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    console.error('[home-section-cache] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    return res.status(500).json({ success: false, message: 'Supabase 서버 환경변수 미설정' })
  }

  if (req.method === 'GET') return handleGet(req, res, url, serviceRoleKey)
  if (req.method === 'POST') return handlePost(req, res, url, serviceRoleKey)
  if (req.method === 'DELETE') return handleDelete(req, res, url, serviceRoleKey)

  return res.status(405).json({ success: false, message: 'Method not allowed' })
}
