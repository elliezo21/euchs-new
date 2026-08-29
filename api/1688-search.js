/**
 * Vercel Serverless Function: /api/1688-search
 * OneBound 1688 키워드 검색 프록시
 * - 공식 승인 엔드포인트: 1688global
 * - 게이트웨이: https://api-gw.onebound.cn
 * - 타임아웃: 8000ms (8초 - Vercel Serverless 10초 제한 안전 마진)
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

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/item_search/?key=${OB_KEY}&secret=${OB_SECRET}&q=${encodeURIComponent(queryZh)}&page=${page}&result_type=json`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8초 제한

  try {
    console.log('[1688-search] Calling 1688global search:', targetUrl.replace(/secret=[^&]+/, 'secret=***'))
    const r = await fetch(targetUrl, {
      method: 'GET',
      headers: FETCH_HEADERS,
      signal: controller.signal
    })
    clearTimeout(timeout)

    let resData = null
    try {
      resData = await r.json()
    } catch (je) {
      const text = await r.text().catch(() => '')
      console.warn('[1688-search] JSON parse fail HTTP=' + r.status + ' body:', text.slice(0, 200))
      return res.status(200).json(Object.assign({
        success: false,
        message: '검색 응답 파싱 실패 (HTTP ' + r.status + ')'
      }, SAFE_EMPTY))
    }

    if (!resData) {
      return res.status(200).json(Object.assign({ success: false, message: '빈 응답' }, SAFE_EMPTY))
    }

    console.log('[1688-search] Success. Keys:', Object.keys(resData).slice(0, 10))
    return res.status(200).json({
      success: true,
      data: resData,
      status: r.status
    })
  } catch (err) {
    clearTimeout(timeout)
    const isTimeout = err.name === 'AbortError'
    const errorMsg = isTimeout ? '검색 응답이 지연되고 있습니다 (8s 타임아웃).' : (err.message || '통신 실패')
    console.error('[1688-search] Error:', errorMsg)
    return res.status(200).json(Object.assign({
      success: false,
      message: errorMsg,
      isTimeout
    }, SAFE_EMPTY))
  }
}



