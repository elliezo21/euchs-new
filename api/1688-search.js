/**
 * Vercel Serverless Function: /api/1688-search
 * OneBound 1688 키워드 검색 프록시
 * - 1차 엔드포인트: 1688global
 * - 2차 폴백: 1688
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
  const code = String(data.error_code || data.error || '')
  const reason = String(data.reason || data.message || data.error_msg || '')
  return code === '4005' || code === '4000' || reason.includes('已到期') || reason.includes('expired') || !!data.error
}

async function fetchSearch(endpoint, queryZh, page, OB_KEY, OB_SECRET, timeoutMs) {
  const targetUrl = `${ONEBOUND_BASE_URL}/${endpoint}/item_search/?key=${OB_KEY}&secret=${OB_SECRET}&q=${encodeURIComponent(queryZh)}&page=${page}&result_type=json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.log(`[1688-search] Calling ${endpoint}:`, targetUrl.replace(/secret=[^&]+/, 'secret=***'))
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)

    let resData = null
    try { resData = await r.json() } catch (je) { return null }
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

  if (!queryZh) {
    return res.status(400).json(Object.assign({ success: false, message: '검색 키워드(q)가 누락되었습니다.' }, SAFE_EMPTY))
  }

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'

  // 1차: 1688global 시도
  let resData = await fetchSearch('1688global', queryZh, page, OB_KEY, OB_SECRET, 5000)

  // 1688global이 실패하거나 4005 에러인 경우 2차 1688 시도
  if (!resData || isErrorResponse(resData)) {
    console.warn('[1688-search] 1688global failed or 4005. Trying 1688 endpoint...')
    const fallbackData = await fetchSearch('1688', queryZh, page, OB_KEY, OB_SECRET, 4000)
    if (fallbackData && !isErrorResponse(fallbackData)) {
      resData = fallbackData
    }
  }

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




