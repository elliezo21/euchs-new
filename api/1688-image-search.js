/**
 * Vercel Serverless Function: /api/1688-image-search
 * OneBound 1688 이미지(사진) 검색 프록시
 * - 엔드포인트: https://api-gw.onebound.net/1688/item_search_img/
 * - 유사 상품 40개 반환
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // imgUrl 파라미터 수신 및 검증
  const rawImgUrl = req.query?.imgUrl || req.query?.img_url || ''
  const imgUrl = String(rawImgUrl).trim()

  if (!imgUrl || imgUrl === 'undefined' || imgUrl === 'null') {
    console.error('[1688-image-search] Missing or invalid imgUrl. query:', req.query)
    return res.status(400).json({
      success: false,
      message: '이미지 URL(imgUrl)이 누락되었거나 유효하지 않습니다.',
      received: req.query
    })
  }

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'

  const targetUrl = `https://api-gw.onebound.net/1688/item_search_img/?key=${OB_KEY}&secret=${OB_SECRET}&img_url=${encodeURIComponent(imgUrl)}&result_type=json`

  console.log(`[1688-image-search] OneBound image search: ${imgUrl.slice(0, 100)}...`)

  try {
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' }
    })

    let data = null
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-image-search] JSON parse fail. status:', response.status, 'body:', text.slice(0, 500))
      return res.status(502).json({ success: false, message: 'OneBound 응답 파싱 실패', status: response.status })
    }

    if (!response.ok) {
      console.error('[1688-image-search] OneBound error status:', response.status, JSON.stringify(data).slice(0, 500))
    } else {
      // OneBound 이미지 검색 응답: { items: { item: [...] } } 또는 { result: { resultList: [...] } }
      const resultCount = data?.items?.item?.length ?? data?.result?.resultList?.length ?? 0
      console.log('[1688-image-search] OneBound success | items:', resultCount)
    }

    return res.status(response.ok ? 200 : response.status).json({
      success: response.ok,
      data,
      status: response.status
    })
  } catch (err) {
    console.error('[1688-image-search] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || '1688 image search server error' })
  }
}
