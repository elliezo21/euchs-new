/**
 * Vercel Serverless Function: /api/1688-item-detail
 * Otapi 1688 RapidAPI 상품 상세 조회 프록시 (BatchGetItemFullInfo)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // 다양한 파라미터 키 수용 (itemId / offerId / num_iid / id)
  const rawId = req.query?.itemId || req.query?.offerId || req.query?.num_iid || req.query?.id || ''
  let targetId = String(rawId).trim()

  if (!targetId || targetId === 'undefined' || targetId === 'null') {
    console.error('[1688-item-detail] Missing or invalid itemId. query:', req.query)
    return res.status(400).json({
      success: false,
      message: '상품 ID(itemId)가 누락되었거나 유효하지 않습니다.',
      received: req.query
    })
  }

  // Otapi ID 규격 보정: 숫자만 있는 경우 'abb-' 접두사 추가
  if (/^\d+$/.test(targetId)) {
    targetId = `abb-${targetId}`
  }

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = 'otapi-1688.p.rapidapi.com'

  const headers = {
    'x-rapidapi-key': rapidKey,
    'x-rapidapi-host': rapidHost
  }

  console.log(`[1688-item-detail] Requesting Otapi BatchGetItemFullInfo for itemId: ${targetId}`)

  try {
    const targetUrl = new URL(`https://${rapidHost}/BatchGetItemFullInfo`)
    targetUrl.searchParams.set('language', 'zh')
    targetUrl.searchParams.set('itemId', targetId)

    const response = await fetch(targetUrl.toString(), { headers })

    let data
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-item-detail] Failed to parse JSON. status:', response.status, 'body:', text.slice(0, 300))
      return res.status(502).json({ success: false, message: 'Otapi 응답 파싱 실패', status: response.status })
    }

    // Result.Item 또는 Result.ItemFullInfo 또는 Result
    const itemData = data?.Result?.Item || data?.Result?.ItemFullInfo || data?.Result || data

    return res.status(200).json({
      success: true,
      data: itemData,
      raw: data,
      status: response.status
    })
  } catch (err) {
    console.error('[1688-item-detail] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || '1688 detail server error' })
  }
}


