/**
 * Vercel Serverless Function: /api/1688-item-detail
 * OneBound 1688global 상품 상세 조회 프록시
 * - 1차 엔드포인트: 1688global (강제 직결, 정식 세션 바인딩)
 * - 2차 폴백: 1688 (1688global 완전 실패 시만)
 * - 게이트웨이: https://api-gw.onebound.cn
 * - 타임아웃: 7000ms / 5000ms
 */

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache'
}

/**
 * OneBound 에러 응답 판별
 * - error_code="0" / "0000" 또는 error="ok"/"success" -> 정상 (false)
 * - item/items/result 객체 존재 -> 정상 (false)
 * - 4013(接口已到期), 4005, 4000 등 -> 에러 (true)
 */
function isErrorResponse(data) {
  if (!data) return true
  const code = String(data.error_code || '').trim()
  const errField = String(data.error || '').trim().toLowerCase()
  const reason = String(data.reason || data.message || data.error_msg || '').toLowerCase()

  // 정상 응답: error_code=0000 또는 error=ok
  if (code === '0' || code === '0000' || errField === 'ok' || errField === 'success') return false

  // 상품 데이터가 있으면 에러 아님
  if (data.item || data.items || data.result) return false

  // 명시적 에러 코드 (4013: 接口已到期 포함)
  const ERROR_CODES = ['4013', '4005', '4000', '4001', '4002', '4003', '4004', '4006', '4007', '4008']
  if (ERROR_CODES.includes(code)) return true

  // 에러 키워드 검출
  if (
    reason.includes('已到期') ||
    reason.includes('expired') ||
    reason.includes('invalid key') ||
    reason.includes('unauthorized') ||
    reason.includes('接口') ||
    errField.includes('expired') ||
    errField.includes('invalid')
  ) return true

  return false
}

async function fetchDetail(endpoint, cleanNumericId, OB_KEY, OB_SECRET, OB_SESSION, timeoutMs) {
  const sessionParam = OB_SESSION
    ? `&session=${encodeURIComponent(OB_SESSION)}&session_id=${encodeURIComponent(OB_SESSION)}`
    : ''
  const targetUrl = `${ONEBOUND_BASE_URL}/${endpoint}/item_get/?key=${OB_KEY}&secret=${OB_SECRET}${sessionParam}&num_iid=${cleanNumericId}&result_type=json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.log(
      `[1688-item-detail] Calling ${endpoint}:`,
      targetUrl
        .replace(/secret=[^&]+/, 'secret=***')
        .replace(/session=[^&]+/g, 'session=***')
        .replace(/session_id=[^&]+/g, 'session_id=***')
    )
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)

    let resData = null
    try {
      resData = await r.json()
    } catch (je) {
      console.warn(`[1688-item-detail] JSON parse error for ${endpoint}:`, je.message)
      return null
    }

    const errCode = resData?.error_code || ''
    const errMsg = resData?.reason || resData?.error || ''
    console.log(`[1688-item-detail] ${endpoint} response: error_code=${errCode} error=${errMsg} hasItem=${!!resData?.item}`)
    return resData
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn(`[1688-item-detail] ${endpoint} timed out after ${timeoutMs}ms`)
    } else {
      console.warn(`[1688-item-detail] ${endpoint} fetch error:`, err.message)
    }
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

  const cleanNumericId = targetId.replace(/[^0-9]/g, '')
  if (!cleanNumericId) {
    return res.status(400).json({ success: false, message: '유효한 숫자 ID가 없습니다. id=' + targetId, data: null })
  }

  const OB_KEY     = process.env.ONEBOUND_KEY     || process.env.VITE_ONEBOUND_KEY     || 't_821093731214'
  const OB_SECRET  = process.env.ONEBOUND_SECRET  || process.env.VITE_ONEBOUND_SECRET  || '121412a0'
  const OB_SESSION = process.env.ONEBOUND_SESSION || process.env.VITE_ONEBOUND_SESSION || 'c349df22-2929-4571-8d32-c25412728b33'

  // 1차: 1688global 강제 직결 (정식 세션 바인딩)
  let resData = await fetchDetail('1688global', cleanNumericId, OB_KEY, OB_SECRET, OB_SESSION, 7000)

  // 1688global 에러(4013 포함) 시에만 2차 1688 폴백
  if (!resData || isErrorResponse(resData)) {
    const errCode = resData?.error_code || 'no-data'
    const errMsg  = resData?.reason || resData?.error || 'unknown'
    console.warn(`[1688-item-detail] 1688global failed (${errCode}: ${errMsg}). Trying 1688 fallback...`)
    const fallbackData = await fetchDetail('1688', cleanNumericId, OB_KEY, OB_SECRET, OB_SESSION, 5000)
    if (fallbackData && !isErrorResponse(fallbackData)) {
      resData = fallbackData
    }
  }

  // 최종 에러 처리
  if (!resData || isErrorResponse(resData)) {
    const errorCode = resData?.error_code || '4013'
    const errorMsg  = resData?.reason || resData?.error_msg || resData?.error || '接口已到期 — OneBound 세션 만료 또는 조회 불가'
    console.warn('[1688-item-detail] Final error:', errorCode, errorMsg)
    return res.status(200).json({
      success: false,
      message: errorMsg,
      error_code: errorCode,
      data: null
    })
  }

  // 성공: item 객체 추출 및 병합 반환
  const itemObj = resData.item || resData.result || {}
  const mergedData = {
    ...resData,
    ...itemObj,
    raw: resData
  }

  console.log('[1688-item-detail] Success. item keys:', Object.keys(itemObj).slice(0, 12))

  return res.status(200).json({
    success: true,
    data: mergedData,
    raw: resData
  })
}