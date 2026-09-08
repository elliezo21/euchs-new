/**
 * Vercel Serverless Function: /api/1688-order-create
 * OneBound 1688global alibaba.trade.fastCreateOrder 프록시
 *
 * ⚠️  경고: 이 함수는 실제 1688 판매자에게 진짜 주문을 발송하고
 *           실제 결제가 연동되는 기능입니다.
 *           반드시 프론트엔드에서 "정말 발주하시겠습니까?" 확인 모달을
 *           거친 후에만 호출해야 합니다.
 *
 * 엔드포인트: https://api-gw.onebound.cn/1688global/custom
 * method:     com.alibaba.trade/alibaba.trade.fastCreateOrder
 *
 * 인증: 환경변수에서만 로드 (평문 하드코딩 절대 금지)
 *   - ONEBOUND_KEY, ONEBOUND_SECRET, ONEBOUND_SESSION
 *
 * 배송 주소: addressId 6402758024 (圆圆A45, 청양류 C구 38동 이우)
 *   — preview와 동일한 addressId 재사용
 *
 * 안전장치:
 *   1. confirmToken 필수 — 프론트엔드 확인 절차를 거쳤음을 증명하는 토큰
 *      현재값: "EUCHS_ORDER_CONFIRMED" (프론트 확인 모달이 붙으면 동적 토큰으로 교체 가능)
 *   2. 모든 발주 시도 (성공/실패 무관)를 서버 로그에 명시적으로 기록
 *   3. 필수 파라미터 엄격 검증 (빠진 것이 하나라도 있으면 400)
 */

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'
const ADDRESS_ID = '6402758024' // 圆圆A45 — 청양류 C구 38동 1층 이우, 기본 배송지

// 프론트엔드 확인 절차를 거쳤음을 증명하는 confirmToken 기대값
// 추후 동적 서명 방식으로 강화 가능 (e.g. HMAC + 타임스탬프)
const EXPECTED_CONFIRM_TOKEN = 'EUCHS_ORDER_CONFIRMED'

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache',
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 요청만 허용됩니다.' })
  }

  // ── 안전장치 1: confirmToken 검증 ──────────────────────────────────────
  // 프론트엔드에서 "정말 발주하시겠습니까?" 확인 절차를 거친 후에만
  // 이 토큰을 포함해 호출해야 한다. 없거나 틀리면 403으로 차단.
  const { numIid, specId, quantity, orderNumber, confirmToken } = req.body || {}

  if (!confirmToken || confirmToken !== EXPECTED_CONFIRM_TOKEN) {
    console.warn('[1688-order-create] ⛔ confirmToken 불일치 — 발주 차단:', {
      orderNumber: orderNumber || '(없음)',
      numIid: numIid || '(없음)',
      receivedToken: confirmToken ? '(값 있으나 불일치)' : '(없음)',
      timestamp: new Date().toISOString(),
    })
    return res.status(403).json({
      success: false,
      message: '발주 확인 토큰이 없거나 올바르지 않습니다. 확인 절차를 거쳐 다시 시도하세요.',
    })
  }

  // ── 필수 파라미터 엄격 검증 ───────────────────────────────────────────
  if (!numIid || !specId || !quantity || !orderNumber) {
    console.warn('[1688-order-create] ⛔ 필수 파라미터 누락:', {
      hasNumIid: !!numIid,
      hasSpecId: !!specId,
      hasQuantity: !!quantity,
      hasOrderNumber: !!orderNumber,
      timestamp: new Date().toISOString(),
    })
    return res.status(400).json({
      success: false,
      message: '필수 파라미터 누락: numIid(상품ID), specId(SKU ID), quantity(수량), orderNumber(EUCHS 주문번호)가 모두 필요합니다.',
    })
  }

  // quantity 숫자 유효성 검증
  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
    return res.status(400).json({
      success: false,
      message: `수량(quantity)이 유효하지 않습니다: ${quantity} (1~999 정수여야 합니다)`,
    })
  }

  // ── 환경변수에서만 인증정보 로드 ─────────────────────────────────────
  const OB_KEY     = process.env.ONEBOUND_KEY     || ''
  const OB_SECRET  = process.env.ONEBOUND_SECRET  || ''
  const OB_SESSION = process.env.ONEBOUND_SESSION || ''

  if (!OB_KEY || !OB_SECRET || !OB_SESSION) {
    console.error('[1688-order-create] ❌ 환경변수 누락:', {
      hasKey: !!OB_KEY,
      hasSecret: !!OB_SECRET,
      hasSession: !!OB_SESSION,
      timestamp: new Date().toISOString(),
    })
    return res.status(500).json({
      success: false,
      message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)',
    })
  }

  // ── _o_args 조립 (preview와 동일한 구조, method만 fastCreateOrder로 변경) ──
  const oArgs = {
    flow: 'general',
    addressParam: {
      addressId: ADDRESS_ID,
    },
    cargoParamList: [
      {
        offerId: String(numIid),
        specId: String(specId),
        quantity: qty,
      },
    ],
  }

  // ── Query string 조립 ────────────────────────────────────────────────
  const params = new URLSearchParams({
    key: OB_KEY,
    secret: OB_SECRET,
    method: 'com.alibaba.trade/alibaba.trade.fastCreateOrder',
    session: OB_SESSION,
    _o_args: JSON.stringify(oArgs),
    lang: 'zh-CN',
  })

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`

  // ── 안전장치 2: 발주 시도 로그 (추적 가능하도록 명확히 기록) ──────────
  console.log('[1688-order-create] 🚀 발주 시도 시작:', {
    euchs_orderNumber: orderNumber,
    numIid: String(numIid),
    specId: String(specId),
    quantity: qty,
    addressId: ADDRESS_ID,
    timestamp: new Date().toISOString(),
    // secret/session은 절대 로그에 남기지 않음
    url: targetUrl
      .replace(/secret=[^&]+/, 'secret=***')
      .replace(/session=[^&]+/, 'session=***'),
  })

  // ── 12초 타임아웃 ────────────────────────────────────────────────────
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  let resData = null
  try {
    const r = await fetch(targetUrl, {
      method: 'GET',
      headers: FETCH_HEADERS,
      signal: controller.signal,
    })
    clearTimeout(timer)

    try {
      resData = await r.json()
    } catch (je) {
      console.warn('[1688-order-create] ⚠️ JSON 파싱 실패:', {
        euchs_orderNumber: orderNumber,
        error: je.message,
        timestamp: new Date().toISOString(),
      })
      return res.status(502).json({
        success: false,
        message: '원바운드 API 응답을 JSON으로 파싱할 수 없습니다.',
      })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn('[1688-order-create] ⏱️ 요청 타임아웃 (12초 초과):', {
        euchs_orderNumber: orderNumber,
        numIid: String(numIid),
        timestamp: new Date().toISOString(),
      })
      return res.status(504).json({ success: false, message: '원바운드 API 요청 타임아웃 (12초)' })
    }
    console.error('[1688-order-create] ❌ fetch 오류:', {
      euchs_orderNumber: orderNumber,
      error: err.message,
      timestamp: new Date().toISOString(),
    })
    return res.status(502).json({ success: false, message: '원바운드 API 통신 오류: ' + err.message })
  }

  // ── 응답 로그 ────────────────────────────────────────────────────────
  const errorCode = String(resData?.error_code || '').trim()
  const errorMsg  = resData?.reason || resData?.error || ''
  const isError   = errorCode && errorCode !== '0' && errorCode !== '0000'

  console.log('[1688-order-create] 원바운드 응답 수신:', {
    euchs_orderNumber: orderNumber,
    numIid: String(numIid),
    specId: String(specId),
    quantity: qty,
    error_code: resData?.error_code,
    error: resData?.error,
    reason: resData?.reason,
    hasResponse: !!resData?.response,
    // fastCreateOrder 성공 시 response 안에 orderId가 포함됨
    orderId: resData?.response?.orderId || resData?.response?.result?.orderId || null,
    timestamp: new Date().toISOString(),
  })

  // ── 에러 판정 ────────────────────────────────────────────────────────
  if (isError) {
    console.warn('[1688-order-create] ❌ 발주 실패 (API 에러 응답):', {
      euchs_orderNumber: orderNumber,
      numIid: String(numIid),
      specId: String(specId),
      quantity: qty,
      error_code: errorCode,
      reason: errorMsg,
      timestamp: new Date().toISOString(),
    })
    return res.status(200).json({
      success: false,
      message: errorMsg || `OneBound 오류 (code: ${errorCode})`,
      code: errorCode,
      raw: resData,
    })
  }

  // ── 성공: orderId 추출 ───────────────────────────────────────────────
  // fastCreateOrder 응답 구조:
  //   { error_code: "0", response: { orderId: "...", ... } }
  // preview와 달리 orderId 필드가 핵심 — 두 경로 모두 커버
  const responseData = resData?.response || {}
  const orderId = responseData?.orderId || responseData?.result?.orderId || null

  console.log('[1688-order-create] ✅ 발주 성공:', {
    euchs_orderNumber: orderNumber,
    china_orderId: orderId,
    numIid: String(numIid),
    specId: String(specId),
    quantity: qty,
    timestamp: new Date().toISOString(),
  })

  return res.status(200).json({
    success: true,
    orderId,
    raw: resData,
  })
}
