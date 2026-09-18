/**
 * Vercel Serverless Function: /api/1688-search
 * OneBound 1688 키워드 검색 프록시
 * - 엔드포인트: 1688global 단독 사용 (2026-09-18부로 "1688" non-global 폴백 제거 —
 *   OneBound 계정 매니저가 해당 계정에서 1688 플랫폼 item_get/item_search 사용 중단 안내)
 * - 게이트웨이: https://api-gw.onebound.cn
 * - 타임아웃: 8000ms (8초)
 */

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache'
}

const SAFE_EMPTY = {
  success: false,
  data: { items: { item: [] }, total_results: '0', page_size: '0' }
}

function isErrorResponse(data) {
  if (!data) return true
  const code = String(data.error_code || '').trim()
  const errField = String(data.error || '').trim().toLowerCase()
  const reason = String(data.reason || data.message || data.error_msg || '').toLowerCase()

  // OneBound 정상 응답: error_code=0000, error=ok → 에러로 처리하지 않음
  if (code === '0' || code === '0000' || errField === 'ok' || errField === 'success') return false

  // 진짜 에러: 4005(자격증명 만료), 4000(파라미터 오류), 4010(동시요청 부하 시 실측 확인 —
  // "不存在相应的数据信息api_init", 문서상 "API not found"지만 실측상 동시 burst에서만 발생) 등
  if (code === '4005' || code === '4000' || code === '4001' || code === '4002' || code === '4010') return true
  if (reason.includes('已到期') || reason.includes('expired') || reason.includes('invalid key')) return true

  // 상품 데이터가 있으면 에러가 아님
  if (data.items || data.item || data.result) return false

  return false
}

async function fetchSearch(endpoint, queryZh, page, OB_KEY, OB_SECRET, timeoutMs, cat = null) {
  // 공식 문서 확인: 1688global/item_search는 key·secret·q·page만 요구. session 불필요.
  const catParam = cat ? `&cat=${encodeURIComponent(cat)}` : ''
  const targetUrl = `${ONEBOUND_BASE_URL}/${endpoint}/item_search/?key=${OB_KEY}&secret=${OB_SECRET}&q=${encodeURIComponent(queryZh)}&page=${page}&result_type=json${catParam}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.log(`[1688-search] Calling ${endpoint}:`, targetUrl.replace(/secret=[^&]+/, 'secret=***'))
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)

    let resData = null
    try { resData = await r.json() } catch (je) { return null }
    if (resData) {
      console.log('[OneBound Raw Keys]:', Object.keys(resData || {}))
      console.log('[OneBound Items Sample]:', JSON.stringify(resData.items || resData.data || {}).slice(0, 250))
    }
    return resData
  } catch (err) {
    clearTimeout(timer)
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawQ = req.query && (req.query.q || req.query.keyword || req.query.text) || ''
  const queryZh = String(rawQ).trim()
  const page = String((req.query && req.query.page) || '1').trim()
  const cat = (req.query && req.query.cat) ? String(req.query.cat).trim() : null

  if (!queryZh) {
    return res.status(400).json(Object.assign({ success: false, message: '검색 키워드(q)가 누락되었습니다.' }, SAFE_EMPTY))
  }

  // 환경변수에서만 인증키 로드 (평문 하드코딩 금지 원칙)
  const OB_KEY    = process.env.ONEBOUND_KEY    || process.env.VITE_ONEBOUND_KEY    || ''
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || ''

  if (!OB_KEY || !OB_SECRET) {
    console.error('[1688-search] ONEBOUND_KEY 또는 ONEBOUND_SECRET 환경변수가 설정되지 않았습니다.')
    return res.status(500).json({ success: false, message: 'API 인증 환경변수 누락', data: null })
  }

  // 1688global만 사용 (session 파라미터 불필요)
  // ⚠️ 2026-09-18: OneBound 계정 매니저 확인 — "1688"(non-global) 플랫폼의 item_get/
  // item_search는 해당 계정에서 사용 불가 판정(오늘 13회 시도 전부 실패, 실제조회수 0).
  // 매니저가 명시적으로 이 두 API는 쓰지 말라고 안내해 2차 폴백 호출을 제거함.
  // 1688global은 같은 날 1,095회 정상 성공 중이라 이쪽만 사용.
  const resData = await fetchSearch('1688global', queryZh, page, OB_KEY, OB_SECRET, 5000, cat)

  // 최종 응답 검증
  if (!resData || isErrorResponse(resData)) {
    const errorMsg = resData?.reason || resData?.error || 'OneBound API Key 만료 또는 통신 불가 (4005)'
    console.warn('[1688-search] Final error:', errorMsg)
    return res.status(200).json(Object.assign({
      success: false,
      message: errorMsg,
      error_code: resData?.error_code || '4005'
    }, SAFE_EMPTY))
  }

  return res.status(200).json({
    success: true,
    data: resData
  })
}




