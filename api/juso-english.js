/**
 * Vercel Serverless Function: /api/juso-english
 * 한글 도로명주소 → 영문 도로명주소 (행정안전부 영문주소 검색 API) — 로그인 필수
 *
 * 쓰임: 통관정보 화면의 사업장 주소 영문 변환(T/T 해외송금 인보이스용). 로그인한 화면에서만 쓰므로
 *       api/verify-business.js와 같은 로그인 검증(verifyUserToken)을 적용한다.
 *
 * POST { roadAddrPart1: string, matchKey: { admCd, rnMgtSn, udrtYn, buldMnnm, buldSlno } }
 *   · roadAddrPart1·matchKey는 /api/juso-search가 돌려준 값 그대로.
 * →    { success: true, roadAddr: '영문 도로명주소' }
 *      { success: false, reason: 'not_found'|'unavailable'|'bad_request' }
 *
 * ★ 틀린 영문을 넣지 않는다:
 *   한글 도로명(roadAddrPart1)으로 영문 API를 검색한 뒤, 결과 중 매칭 키가 "정확히 같은" 건만 쓴다.
 *   매칭 건이 없거나, 서로 다른 영문 주소가 2건 이상이면 확정하지 않고 실패로 돌려준다.
 *
 * 환경변수: JUSO_EN_API_KEY, SUPABASE_URL(또는 VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import { verifyUserToken } from './bulk-item-detail.js'
import { JUSO_EN_URL, callJuso, sanitizeKeyword, matchKeyOf, sameMatchKey } from './_juso.js'

// 같은 도로명 검색 결과가 많을 때를 대비해 한 번에 넉넉히 받는다 (공식 범위 0 < n <= 100)
const COUNT_PER_PAGE = 50

function getServiceRoleConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return { url, serviceRoleKey }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    console.error('[juso-english] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    return res.status(500).json({ success: false, message: 'Supabase 서버 환경변수 미설정' })
  }

  // ── 1. 로그인 검증 (api/bulk-item-detail.js와 같은 함수) ──
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const auth = await verifyUserToken(bearerToken, url, serviceRoleKey)
  if (!auth.ok) {
    console.warn('[juso-english] 인증 실패:', auth.error)
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  // ── 2. 입력 검증 ──
  const body = req.body || {}
  const keyword = sanitizeKeyword(body.roadAddrPart1)
  const wantKey = matchKeyOf(body.matchKey)
  if (keyword.length < 2 || !wantKey) {
    return res.status(400).json({ success: false, reason: 'bad_request' })
  }

  // ── 3. 영문주소 검색 ──
  const result = await callJuso(JUSO_EN_URL, process.env.JUSO_EN_API_KEY, keyword, 1, COUNT_PER_PAGE)
  if (!result.ok) {
    console.error(`[juso-english] 행안부 호출 실패 user=${auth.userId}: ${result.error}`)
    // 검색어 문제(input)도 고객 입장에서는 "영문을 찾지 못함"이다
    return res.status(200).json({ success: false, reason: result.reason === 'input' ? 'not_found' : 'unavailable' })
  }

  // ── 4. 매칭 키로 1건 확정 ──
  const matched = result.items.filter(j => sameMatchKey(matchKeyOf(j), wantKey))
  const distinct = [...new Set(matched.map(j => String(j.roadAddr || '').trim()).filter(Boolean))]
  if (distinct.length !== 1) {
    console.warn(
      `[juso-english] 영문 확정 실패 user=${auth.userId} keyword="${keyword}" ` +
      `검색 ${result.items.length}건(전체 ${result.totalCount}) / 매칭 ${matched.length}건 / 서로 다른 영문 ${distinct.length}건`
    )
    return res.status(200).json({ success: false, reason: 'not_found' })
  }

  return res.status(200).json({ success: true, roadAddr: distinct[0] })
}
