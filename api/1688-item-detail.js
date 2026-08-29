/**
 * Vercel Serverless Function: /api/1688-item-detail
 * OneBound 1688 상품 상세 조회 프록시
 * - 엔드포인트: https://api-gw.onebound.net/1688/item_get/
 * - 응답: item 객체 원본 전달 (item_imgs[], props_list, skus, seller_info 포함)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // 다양한 파라미터 키 수용
  const rawId = req.query?.itemId || req.query?.id || req.query?.offerId || req.query?.num_iid || ''
  let targetId = String(rawId).trim()

  if (!targetId || targetId === 'undefined' || targetId === 'null') {
    console.error('[1688-item-detail] Missing or invalid itemId. query:', req.query)
    return res.status(400).json({
      success: false,
      message: '상품 ID(itemId)가 누락되었거나 유효하지 않습니다.',
      received: { query: req.query }
    })
  }

  // OneBound는 순수 숫자 ID 사용 (abb- 접두사 제거)
  const cleanNumericId = targetId.replace(/[^0-9]/g, '')
  if (!cleanNumericId) {
    return res.status(400).json({ success: false, message: '유효한 숫자 ID가 없습니다.' })
  }

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'

  const targetUrl = `https://api-gw.onebound.net/1688/item_get/?key=${OB_KEY}&secret=${OB_SECRET}&num_iid=${cleanNumericId}&result_type=json`

  console.log(`[1688-item-detail] OneBound call for num_iid: ${cleanNumericId}`)

  try {
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' }
    })

    let data = null
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-item-detail] JSON parse fail. status:', response.status, 'body:', text.slice(0, 300))
      return res.status(502).json({ success: false, message: 'OneBound 응답 파싱 실패', status: response.status })
    }

    if (!response.ok) {
      console.error(`[1688-item-detail] OneBound HTTP ${response.status} for id: ${cleanNumericId}`, JSON.stringify(data).slice(0, 300))
    }

    // OneBound 응답 구조: { item: {...}, translate_result: {...} }
    const itemData = data?.item || data?.result?.item || data || null

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
