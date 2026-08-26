/**
 * Vercel Serverless Function: /api/1688-detail
 * 1688 DataHub RapidAPI 상품 상세 조회 프록시
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // 다양한 파라미터 키 수용 (itemId / offerId / num_iid / id)
  const rawId = req.query?.itemId || req.query?.offerId || req.query?.num_iid || req.query?.id || ''
  const targetId = String(rawId).trim()

  // 빈값 / "undefined" / "null" 방어
  if (!targetId || targetId === 'undefined' || targetId === 'null') {
    console.error('[1688-detail] Missing or invalid itemId. query:', req.query)
    return res.status(400).json({
      success: false,
      message: '상품 ID(itemId)가 누락되었거나 유효하지 않습니다.',
      received: req.query
    })
  }

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

  if (!rapidKey) {
    console.error('[1688-detail] RAPIDAPI_KEY not set')
    return res.status(500).json({ success: false, message: 'RAPIDAPI_KEY 환경변수가 설정되지 않았습니다.' })
  }

  console.log(`[1688-detail] Requesting itemId: ${targetId}`)

  try {
    const targetUrl = new URL(`https://${rapidHost}/item_detail`)
    targetUrl.searchParams.set('itemId', targetId)

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
      console.error('[1688-detail] Failed to parse JSON response. status:', response.status, 'body:', text.slice(0, 500))
      return res.status(502).json({ success: false, message: 'RapidAPI 응답 파싱 실패', status: response.status })
    }

    if (!response.ok) {
      console.error('[1688-detail] RapidAPI returned error status:', response.status, JSON.stringify(data).slice(0, 500))
    } else {
      console.log('[1688-detail] RapidAPI success for itemId:', targetId, '| keys:', Object.keys(data || {}).slice(0, 10))
    }

    return res.status(response.status).json({ success: response.ok, data, status: response.status })
  } catch (err) {
    console.error('[1688-detail] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || '1688 detail server error' })
  }
}
