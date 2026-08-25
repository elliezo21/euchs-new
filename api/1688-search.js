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

  const { q, page = '1', sort = 'default', price_min = '', price_max = '' } = req.query || {}

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

  try {
    const targetUrl = new URL(https:///item_search)
    targetUrl.searchParams.set('q', q || '')
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

    const data = await response.json()
    return res.status(response.status).json({ success: response.ok, data, status: response.status })
  } catch (err) {
    console.error('[1688-search] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || '1688 search server error' })
  }
}
