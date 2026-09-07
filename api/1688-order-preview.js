/**
 * Vercel Serverless Function: /api/1688-order-preview
 * OneBound 1688global alibaba.createOrder.preview 프록시
 *
 * 역할: 실제 발주(fastCreateOrder)가 아닌 "미리보기"만 호출.
 *       주문을 생성하지 않고 가격·배송비·재고 등을 사전 확인한다.
 *
 * 엔드포인트: https://api-gw.onebound.cn/1688global/custom
 * method:     com.alibaba.trade/alibaba.createOrder.preview
 *
 * 인증: 환경변수에서만 로드 (평문 하드코딩 절대 금지)
 *   - ONEBOUND_KEY, ONEBOUND_SECRET, ONEBOUND_SESSION
 *
 * 배송 주소: addressId 6402758024 (圆圆A45, 청양류 C구 38동 이우)
 *   — 계정에 저장된 주소 ID만 전달하면 서버가 전체 주소를 조회함.
 *
 * addressParam 구조 확인 여부:
 *   확실 — 저장된 주소 사용 시 addressId 단일 필드로 충분.
 *      (alibaba.trade.receiveAddress.get으로 id 확보 후 그대로 사용)
 *
 * cargoParamList 구조 확인 여부:
 *   확실 — [{ offerId, specId, quantity }]
 */

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'
const ADDRESS_ID = '6402758024' // 圆圆A45 — 청양류 C구 38동 1층 이우, 기본 배송지

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

  // 요청 바디 파싱
  const { numIid, specId, quantity, orderNumber } = req.body || {}

  if (!numIid || !specId || !quantity) {
    return res.status(400).json({
      success: false,
      message: '필수 파라미터 누락: numIid(상품ID), specId(SKU ID), quantity(수량)가 모두 필요합니다.',
    })
  }

  // 환경변수에서만 인증정보 로드 (평문 하드코딩 금지 원칙 준수)
  const OB_KEY     = process.env.ONEBOUND_KEY     || ''
  const OB_SECRET  = process.env.ONEBOUND_SECRET  || ''
  const OB_SESSION = process.env.ONEBOUND_SESSION || ''

  if (!OB_KEY || !OB_SECRET || !OB_SESSION) {
    console.error('[1688-order-preview] 환경변수 누락:', {
      hasKey: !!OB_KEY,
      hasSecret: !!OB_SECRET,
      hasSession: !!OB_SESSION,
    })
    return res.status(500).json({
      success: false,
      message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)',
    })
  }

  // _o_args 조립
  // addressParam: 저장된 주소 ID만 전달 (서버가 계정 내 전체 주소 조회)
  // cargoParamList: offerId = 1688 상품 ID, specId = SKU ID
  const oArgs = {
    flow: 'general',
    addressParam: {
      addressId: ADDRESS_ID,
    },
    cargoParamList: [
      {
        offerId: String(numIid),
        specId: String(specId),
        quantity: Number(quantity),
      },
    ],
  }

  // Query string 조립
  const params = new URLSearchParams({
    key: OB_KEY,
    secret: OB_SECRET,
    method: 'com.alibaba.trade/alibaba.createOrder.preview',
    session: OB_SESSION,
    _o_args: JSON.stringify(oArgs),
    lang: 'zh-CN',
  })

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`

  console.log('[1688-order-preview] Calling preview API:', {
    url: targetUrl
      .replace(/secret=[^&]+/, 'secret=***')
      .replace(/session=[^&]+/, 'session=***'),
    numIid,
    specId,
    quantity,
    orderNumber: orderNumber || '(없음)',
  })

  // 12초 타임아웃
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
      console.warn('[1688-order-preview] JSON 파싱 실패:', je.message)
      return res.status(502).json({
        success: false,
        message: '원바운드 API 응답을 JSON으로 파싱할 수 없습니다.',
      })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn('[1688-order-preview] 요청 타임아웃 (12초 초과)')
      return res.status(504).json({ success: false, message: '원바운드 API 요청 타임아웃 (12초)' })
    }
    console.error('[1688-order-preview] fetch 오류:', err.message)
    return res.status(502).json({ success: false, message: '원바운드 API 통신 오류: ' + err.message })
  }

  console.log('[1688-order-preview] 응답:', {
    error_code: resData?.error_code,
    error: resData?.error,
    reason: resData?.reason,
    hasResponse: !!resData?.response,
  })

  // 에러 판정
  const errorCode = String(resData?.error_code || '').trim()
  const errorMsg  = resData?.reason || resData?.error || ''
  const isError   = errorCode && errorCode !== '0' && errorCode !== '0000'

  if (isError) {
    console.warn('[1688-order-preview] API 에러 응답:', errorCode, errorMsg)
    return res.status(200).json({
      success: false,
      message: errorMsg || `OneBound 오류 (code: ${errorCode})`,
      code: errorCode,
      raw: resData,
    })
  }

  // 성공
  const previewData = resData?.response || resData
  return res.status(200).json({
    success: true,
    preview: previewData,
    raw: resData,
  })
}
