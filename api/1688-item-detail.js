/**
 * Vercel Serverless Function: /api/1688-item-detail
 * OneBound 1688 상품 상세 조회 프록시
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawId = (req.query && (req.query.itemId || req.query.id || req.query.offerId || req.query.num_iid)) || ''
  const targetId = String(rawId).trim()

  if (!targetId || targetId === 'undefined' || targetId === 'null') {
    return res.status(400).json({ success: false, message: '상품 ID(itemId)가 누락되었거나 유효하지 않습니다.', data: null })
  }

  // OneBound는 순수 숫자 ID 사용
  const cleanNumericId = targetId.replace(/[^0-9]/g, '')
  if (!cleanNumericId) {
    return res.status(400).json({ success: false, message: '유효한 숫자 ID가 없습니다. id=' + targetId, data: null })
  }

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/item_get/?key=${OB_KEY}&secret=${OB_SECRET}&num_iid=${cleanNumericId}&result_type=json`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8초 제한

  try {
    console.log('[1688-item-detail] Calling 1688global item_get:', targetUrl.replace(/secret=[^&]+/, 'secret=***'))
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
      console.warn('[1688-item-detail] JSON parse fail HTTP=' + r.status + ' body:', text.slice(0, 200))
      return res.status(200).json({
        success: false,
        message: '상세 응답 파싱 실패 (HTTP ' + r.status + ')',
        data: null
      })
    }

    if (!resData) {
      return res.status(200).json({ success: false, message: '빈 응답', data: null })
    }

    // OneBound 응답: { item: {...}, translate_result: {...}, props_list: {...}, ... }
    // item 객체와 최상위 객체 필드를 온전히 보존하여 클라이언트에 전달
    const itemObj = resData.item || resData.result || {}
    const mergedData = {
      ...resData,
      ...itemObj,
      raw: resData
    }

    console.log('[1688-item-detail] Success. Merged keys count:', Object.keys(mergedData).length, 'Sample:', Object.keys(mergedData).slice(0, 15))

    return res.status(200).json({
      success: true,
      data: mergedData,
      raw: resData,
      status: r.status
    })
  } catch (err) {
    clearTimeout(timeout)
    const isTimeout = err.name === 'AbortError'
    const errorMsg = isTimeout ? '상세 조회 응답이 지연되고 있습니다 (8s 타임아웃).' : (err.message || '통신 실패')
    console.error('[1688-item-detail] Error:', errorMsg)
    return res.status(200).json({
      success: false,
      message: errorMsg,
      isTimeout,
      data: null
    })
  }
}



