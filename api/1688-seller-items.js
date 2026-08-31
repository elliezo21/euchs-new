/**
 * Vercel Serverless Function: /api/1688-seller-items
 * OneBound 1688global 공급사 상품 목록 조회 프록시
 *
 * 엔드포인트: 1688global/item_search_shop
 * 파라미터: nick = seller_info.nick 값 (예: _sopid@BBB4YpUim_o3YvIkItZZwCIXg)
 *
 * NOTE: 현재 OneBound 구독 플랜에 item_search_shop 미포함 (4005 권한없음)
 *   -> OneBound 담당자(QQ:3142401606 / 위챗:onebound1997)에게 권한 추가 요청 시 활성화
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const nick = (req.query?.nick || req.query?.sellerId || '').trim()
  const page = req.query?.page || '1'

  if (!nick) {
    return res.status(400).json({ success: false, message: 'nick 파라미터 누락 (seller_info.nick 값 필요)' })
  }

  const OB_KEY    = process.env.ONEBOUND_KEY    || process.env.VITE_ONEBOUND_KEY    || ''
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || ''

  if (!OB_KEY || !OB_SECRET) {
    return res.status(500).json({ success: false, message: 'ONEBOUND_KEY 또는 ONEBOUND_SECRET 환경변수 누락' })
  }

  const targetUrl = 'https://api-gw.onebound.cn/1688global/item_search_shop/?key=' + OB_KEY
    + '&secret=' + OB_SECRET
    + '&nick=' + encodeURIComponent(nick)
    + '&page=' + page
    + '&result_type=json'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
      signal: controller.signal
    })
    clearTimeout(timer)

    const resData = await response.json().catch(() => null)
    const errCode = String(resData?.error_code || '').trim()
    const items = resData?.items?.item || resData?.items || []

    return res.status(200).json({
      success: !errCode || errCode === '0' || errCode === '0000',
      data: resData,
      items: Array.isArray(items) ? items : [],
      error_code: errCode
    })
  } catch (err) {
    clearTimeout(timer)
    return res.status(502).json({ success: false, message: err.message })
  }
}