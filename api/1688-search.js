/**
 * Vercel Serverless Function: /api/1688-search
 * 1688 DataHub RapidAPI 정식 검색 프록시
 * - item_search?q=${encodeURIComponent(q)}&page=${page}&sort=default
 * - RapidAPI 원본 응답 JSON을 { success: true, data: resData } 형태로 클라이언트에 온전히 전달
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawQ = req.query?.q || req.query?.keyword || req.query?.text || ''
  const q = String(rawQ).trim()
  const { page = '1', sort = 'default', price_min = '', price_max = '' } = req.query || {}

  if (!q) {
    console.error('[1688-search] Missing search keyword. query:', req.query)
    return res.status(400).json({ success: false, message: '검색 키워드(q)가 누락되었습니다.' })
  }

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

  const headers = {
    'x-rapidapi-key': rapidKey,
    'x-rapidapi-host': rapidHost
  }

  console.log(`[1688-search] Executing live item_search for q="${q}" page=${page} sort=${sort}`)

  try {
    const targetUrl = new URL(`https://${rapidHost}/item_search`)
    targetUrl.searchParams.set('q', q)
    targetUrl.searchParams.set('page', String(page))
    targetUrl.searchParams.set('sort', sort || 'default')
    if (price_min) targetUrl.searchParams.set('price_min', price_min)
    if (price_max) targetUrl.searchParams.set('price_max', price_max)

    const response = await fetch(targetUrl.toString(), { headers })

    let data = null
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-search] JSON parse fail. status:', response.status, 'body:', text.slice(0, 300))
    }

    return res.status(200).json({ success: true, data, status: response.status })

  } catch (err) {
    console.error('[1688-search] Proxy error:', err.message)
    return res.status(500).json({ success: false, message: err.message || '1688 search proxy error' })
  }
}



