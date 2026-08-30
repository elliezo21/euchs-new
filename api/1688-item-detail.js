/**
 * Vercel Serverless Function: /api/1688-item-detail
 * OneBound 1688 상품 상세 조회 프록시
 * - 1차 엔드포인트: 1688global
 * - 2차 폴백: 1688
 * - 게이트웨이: https://api-gw.onebound.cn
 * - 타임아웃: 8000ms (8초)
 */

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache'
}

function isErrorResponse(data) {
  if (!data) return true
  const code = String(data.error_code || '').trim()
  const errField = String(data.error || '').trim().toLowerCase()
  const reason = String(data.reason || data.message || data.error_msg || '').toLowerCase()

  // OneBound 정상 응답: error_code=0000, error=ok → 에러로 처리하지 않음
  if (code === '0' || code === '0000' || errField === 'ok' || errField === 'success') return false

  // 진짜 에러: 4005(자격증명 만료), 4000(파라미터 오류) 등
  if (code === '4005' || code === '4000' || code === '4001' || code === '4002') return true
  if (reason.includes('已到期') || reason.includes('expired') || reason.includes('invalid key')) return true

  // 상품 데이터가 있으면 에러가 아님
  if (data.item || data.items || data.result) return false

  return false
}

async function fetchDetail(endpoint, cleanNumericId, OB_KEY, OB_SECRET, OB_SESSION, timeoutMs) {
  const sessionParam = OB_SESSION ? `&session=${encodeURIComponent(OB_SESSION)}&session_id=${encodeURIComponent(OB_SESSION)}` : ''
  const targetUrl = `${ONEBOUND_BASE_URL}/${endpoint}/item_get/?key=${OB_KEY}&secret=${OB_SECRET}${sessionParam}&num_iid=${cleanNumericId}&result_type=json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.log(`[1688-item-detail] Calling ${endpoint}:`, targetUrl.replace(/secret=[^&]+/, 'secret=***').replace(/session=[^&]+/, 'session=***').replace(/session_id=[^&]+/, 'session_id=***'))
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)

    let resData = null
    try { resData = await r.json() } catch (je) { return null }
    return resData
  } catch (err) {
    clearTimeout(timer)
    return null
  }
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
  const OB_SESSION = process.env.ONEBOUND_SESSION || process.env.VITE_ONEBOUND_SESSION || 'c349df22-2929-4571-8d32-c25412728b33'

  // 1차: 1688global 시도 (신규 인가 세션 적용)
  let resData = await fetchDetail('1688global', cleanNumericId, OB_KEY, OB_SECRET, OB_SESSION, 5000)

  // 1688global 실패 또는 4005 에러 시 2차 1688 시도
  if (!resData || isErrorResponse(resData)) {
    console.warn('[1688-item-detail] 1688global failed or 4005. Trying 1688 endpoint...')
    const fallbackData = await fetchDetail('1688', cleanNumericId, OB_KEY, OB_SECRET, OB_SESSION, 4000)
    if (fallbackData && !isErrorResponse(fallbackData)) {
      resData = fallbackData
    }
  }

  if (!resData || isErrorResponse(resData)) {
    const errorMsg = resData?.reason || resData?.error || 'OneBound API Key 만료 또는 조회 불가 (4005)'
    console.warn('[1688-item-detail] Final error:', errorMsg)
    return res.status(200).json({
      success: false,
      message: errorMsg,
      error_code: resData?.error_code || '4005',
      data: null
    })
  }

  const itemObj = resData.item || resData.result || {}
  const mergedData = {
    ...resData,
    ...itemObj,
    raw: resData
  }

  return res.status(200).json({
    success: true,
    data: mergedData,
    raw: resData
  })
}




