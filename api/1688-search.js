/**
 * Vercel Serverless Function: /api/1688-search
 * OneBound 1688 키워드 검색 프록시
 * - 엔드포인트: https://api-gw.onebound.net/1688/item_search/
 * - 응답 배열(items.item[]) → { success: true, data: resData } 반환
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawQ = req.query?.q || req.query?.keyword || req.query?.text || ''
  const queryZh = String(rawQ).trim()
  const page = req.query?.page || '1'

  if (!queryZh) {
    console.error('[1688-search] Missing search keyword. query:', req.query)
    return res.status(400).json({ success: false, message: '검색 키워드(q)가 누락되었습니다.' })
  }

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'

  const targetUrl = `https://api-gw.onebound.net/1688/item_search/?key=${OB_KEY}&secret=${OB_SECRET}&q=${encodeURIComponent(queryZh)}&page=${page}&result_type=json`

  console.log(`[1688-search] OneBound call: ${targetUrl.replace(OB_SECRET, '***')}`)

  try {
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' }
    })

    let resData = null
    try {
      resData = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-search] JSON parse fail. status:', response.status, 'body:', text.slice(0, 300))
      return res.status(502).json({ success: false, message: 'OneBound 응답 파싱 실패', status: response.status })
    }

    console.log('[1688-search] OneBound status:', response.status, '| top keys:', Object.keys(resData || {}).slice(0, 6))

    return res.status(200).json({
      success: true,
      data: resData,
      status: response.status
    })

  } catch (err) {
    console.error('[1688-search] Proxy error:', err.message)
    return res.status(500).json({ success: false, message: err.message || '1688 search proxy error' })
  }
}
