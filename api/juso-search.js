/**
 * Vercel Serverless Function: /api/juso-search
 * 도로명주소 검색 (행정안전부 도로명주소 검색 API) — 주소 입력칸 자동완성용
 *
 * POST { keyword: string, page?: number }
 * →    { success: true, items: [...], totalCount }
 *      { success: false, reason: 'input'|'unavailable'|'rate_limited' }
 *
 * ★ 비로그인 허용: 회원가입 화면(LoginModal)의 사업장 주소 칸에서도 쓰기 때문이다.
 *   대신 IP당 분당 호출 상한을 둔다(api/_juso.js createRateLimiter).
 *   주소 검색 결과는 공개 정보라 로그인 없이 돌려줘도 개인정보 노출은 없다 —
 *   막아야 할 것은 승인키 사용량 소모와 행안부 쪽 IP 차단이다.
 *
 * 환경변수: JUSO_KR_API_KEY (서버 전용, 브라우저 노출 금지, 로그 출력 금지)
 */

import { JUSO_KR_URL, callJuso, sanitizeKeyword, matchKeyOf, clientIp, createRateLimiter } from './_juso.js'

const COUNT_PER_PAGE = 10
const MAX_PAGE = 20
// 300ms 디바운스로 한 사람이 빠르게 타이핑해도 분당 수십 회 수준 — 그 이상은 남용으로 본다
const isRateLimited = createRateLimiter(60)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const ip = clientIp(req)
  if (isRateLimited(ip)) {
    console.warn(`[juso-search] 호출 상한 초과 ip=${ip}`)
    return res.status(429).json({ success: false, reason: 'rate_limited' })
  }

  const body = req.body || {}
  const keyword = sanitizeKeyword(body.keyword)
  const pageNum = parseInt(body.page, 10)
  const page = Number.isFinite(pageNum) && pageNum >= 1 && pageNum <= MAX_PAGE ? pageNum : 1

  // 공식 규칙: 두 글자 미만(E0008)은 검색 불가 — 호출하지 않고 빈 목록
  if (keyword.length < 2) {
    return res.status(200).json({ success: true, items: [], totalCount: 0 })
  }

  const result = await callJuso(JUSO_KR_URL, process.env.JUSO_KR_API_KEY, keyword, page, COUNT_PER_PAGE)
  if (!result.ok) {
    if (result.reason === 'unavailable') console.error(`[juso-search] 행안부 호출 실패: ${result.error}`)
    return res.status(200).json({ success: false, reason: result.reason })
  }

  const items = result.items.map(j => ({
    zipNo: String(j.zipNo || ''),
    roadAddr: String(j.roadAddr || ''),
    roadAddrPart1: String(j.roadAddrPart1 || ''),
    roadAddrPart2: String(j.roadAddrPart2 || ''),
    jibunAddr: String(j.jibunAddr || ''),
    bdNm: String(j.bdNm || ''),
    bdMgtSn: String(j.bdMgtSn || ''),
    // 도로명주소(영문) — 검색 API 공식 출력 필드. 사업장 영문주소에 그대로 쓴다.
    engAddr: String(j.engAddr || ''),
    // 영문주소 매칭 키 — engAddr가 비었을 때 예비로 /api/juso-english 호출에 쓴다 (api/juso-english.js가 같은 함수로 비교)
    matchKey: matchKeyOf(j),
  }))

  return res.status(200).json({ success: true, items, totalCount: result.totalCount })
}
