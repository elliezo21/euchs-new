/**
 * Vercel Serverless Function: /api/1688-search
 * 1688 DataHub RapidAPI 검색 프록시
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // 다양한 검색어 파라미터 키 수용 (q / keyword / text)
  const rawQ = req.query?.q || req.query?.keyword || req.query?.text || ''
  const q = String(rawQ).trim()
  const { page = '1', sort = 'default', price_min = '', price_max = '' } = req.query || {}

  if (!q) {
    console.error('[1688-search] Missing search keyword. query:', req.query)
    return res.status(400).json({ success: false, message: '검색 키워드(q)가 누락되었습니다.' })
  }

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

  if (!rapidKey) {
    console.error('[1688-search] RAPIDAPI_KEY not set')
    return res.status(500).json({ success: false, message: 'RAPIDAPI_KEY 환경변수가 설정되지 않았습니다.' })
  }

  console.log(`[1688-search] Requesting q="${q}" page=${page}`)

  try {
    const targetUrl = new URL(`https://${rapidHost}/item_search`)
    targetUrl.searchParams.set('q', q)
    targetUrl.searchParams.set('page', page)
    if (sort && sort !== 'default') targetUrl.searchParams.set('sort', sort)
    if (price_min) targetUrl.searchParams.set('price_min', price_min)
    if (price_max) targetUrl.searchParams.set('price_max', price_max)

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'x-rapidapi-key': rapidKey,
        'x-rapidapi-host': rapidHost
      }
    })

    let data
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-search] Failed to parse JSON. status:', response.status, 'body:', text.slice(0, 300))
      return res.status(502).json({ success: false, message: 'RapidAPI 응답 파싱 실패', status: response.status })
    }

    if (!response.ok) {
      console.error('[1688-search] RapidAPI error status:', response.status, JSON.stringify(data).slice(0, 300))
      return res.status(response.status).json({ success: false, data, status: response.status })
    }

    // ── 내용 레벨 에러 감지 (HTTP 200이지만 code 205 = no results / quota exceeded) ──
    const apiStatus = data?.result?.status
    if (apiStatus && (apiStatus.data === 'error' || (apiStatus.code && apiStatus.code !== 200))) {
      const errCode = apiStatus.code
      const errMsg = apiStatus.msg ? JSON.stringify(apiStatus.msg) : String(errCode)
      console.warn(`[1688-search] API content error code=${errCode} for q="${q}": ${errMsg}`)

      // code 205: no results found (검색어에 해당하는 상품 없음 또는 API 쿼터 초과)
      const isQuotaOrNoResult = errCode === 205 || errCode === 429 ||
        String(errMsg).toLowerCase().includes('exceeded') ||
        String(errMsg).toLowerCase().includes('no results')

      return res.status(200).json({
        success: false,
        data,
        apiCode: errCode,
        apiError: errMsg,
        isQuotaExceeded: isQuotaOrNoResult,
        status: response.status
      })
    }

    const resultCount = data?.result?.resultList?.length ?? data?.resultList?.length ?? '?'
    console.log(`[1688-search] OK for q="${q}" | resultList: ${resultCount}개`)

    return res.status(response.status).json({ success: response.ok, data, status: response.status })

  } catch (err) {
    console.error('[1688-search] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || '1688 search server error' })
  }
}
