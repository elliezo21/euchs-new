/**
 * Vercel Serverless Function: /api/1688-crossborder-pay
 * OneBound 1688global alibaba.crossBorderPay.url.get 프록시
 *
 * cb(cross-border) 타입 주문 전용 결제 링크 발급 API.
 * protocolPay.preparePay와 달리 실결제를 직접 실행하지 않고,
 * 관리자가 브라우저에서 열어 직접 결제를 완료하는 URL을 반환한다.
 *
 * 성공 판정 — 3조건 모두 충족해야 success: true:
 *   1. 외부 error_code === "0000"
 *   2. response.success === "true"  (문자열)
 *   3. response.payUrl 존재 (비어있지 않음)
 *
 * 인증: 환경변수에서만 로드 (평문 하드코딩 절대 금지)
 *   - ONEBOUND_KEY, ONEBOUND_SECRET, ONEBOUND_SESSION
 */

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'

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

  const { tradeId } = req.body || {}

  // tradeId 필수 검증
  if (!tradeId) {
    return res.status(400).json({
      success: false,
      message: '결제 링크 발급에는 tradeId(1688 주문번호)가 필수입니다.',
    })
  }
  const tradeIdStr = String(tradeId).trim()
  if (!/^\d+$/.test(tradeIdStr)) {
    return res.status(400).json({
      success: false,
      message: `tradeId 형식 오류: 숫자만 허용됩니다. 받은 값: "${tradeIdStr}"`,
    })
  }

  // 환경변수에서만 인증정보 로드
  const OB_KEY     = process.env.ONEBOUND_KEY     || ''
  const OB_SECRET  = process.env.ONEBOUND_SECRET  || ''
  const OB_SESSION = process.env.ONEBOUND_SESSION || ''

  if (!OB_KEY || !OB_SECRET || !OB_SESSION) {
    console.error('[1688-crossborder-pay] 환경변수 누락:', {
      hasKey: !!OB_KEY, hasSecret: !!OB_SECRET, hasSession: !!OB_SESSION,
      timestamp: new Date().toISOString(),
    })
    return res.status(500).json({
      success: false,
      message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)',
    })
  }

  const params = new URLSearchParams({
    key:     OB_KEY,
    secret:  OB_SECRET,
    session: OB_SESSION,
    method:  'com.alibaba.trade/alibaba.crossBorderPay.url.get',
    _o_args: JSON.stringify({ orderIdList: [tradeIdStr] }),
    lang:    'zh-CN',
  })

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`
  const maskedUrl = targetUrl
    .replace(/secret=[^&]+/, 'secret=***')
    .replace(/session=[^&]+/, 'session=***')

  console.log('[1688-crossborder-pay] 결제 링크 발급 요청:', {
    tradeId: tradeIdStr,
    url: maskedUrl,
    timestamp: new Date().toISOString(),
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
      console.warn('[1688-crossborder-pay] JSON 파싱 실패:', {
        error: je.message, tradeId: tradeIdStr, timestamp: new Date().toISOString(),
      })
      return res.status(502).json({ success: false, message: '원바운드 API 응답을 JSON으로 파싱할 수 없습니다.' })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn('[1688-crossborder-pay] 타임아웃 (12초):', {
        tradeId: tradeIdStr, timestamp: new Date().toISOString(),
      })
      return res.status(504).json({ success: false, message: '원바운드 API 요청 타임아웃 (12초)' })
    }
    console.error('[1688-crossborder-pay] fetch 오류:', {
      error: err.message, tradeId: tradeIdStr, timestamp: new Date().toISOString(),
    })
    return res.status(502).json({ success: false, message: '원바운드 API 통신 오류: ' + err.message })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 성공 판정 — 3조건 모두 충족해야 success: true
  //   1. 외부 error_code === "0000"
  //   2. response.success === "true"
  //   3. response.payUrl 존재
  // ─────────────────────────────────────────────────────────────────────────

  const outerCode   = String(resData?.error_code ?? '').trim()
  const outerReason = resData?.reason || resData?.error || ''
  const innerResp   = resData?.response || {}
  const innerSuccess = String(innerResp?.success ?? '').trim()
  const payUrl       = (innerResp?.payUrl || '').trim()

  // 조건 1: 외부 error_code
  if (outerCode !== '0' && outerCode !== '0000') {
    console.warn('[1688-crossborder-pay] 외부 에러:', {
      tradeId: tradeIdStr,
      outer_error_code: outerCode,
      outer_reason: outerReason,
      full_response: resData,
      timestamp: new Date().toISOString(),
    })
    return res.status(200).json({
      success: false,
      message: outerReason || `OneBound 외부 오류 (error_code: ${outerCode})`,
      debug: { outer_error_code: outerCode, outer_reason: outerReason },
      raw: resData,
    })
  }

  // 조건 2+3: response.success + payUrl
  if (innerSuccess !== 'true' || !payUrl) {
    console.warn('[1688-crossborder-pay] 결제 링크 발급 실패:', {
      tradeId: tradeIdStr,
      outer_error_code: outerCode,
      response_success: innerSuccess,
      payUrl: payUrl || '(없음)',
      full_response: resData,
      timestamp: new Date().toISOString(),
    })
    return res.status(200).json({
      success: false,
      message: `결제 링크 발급 실패 (response.success=${innerSuccess}, payUrl=${payUrl || '없음'})`,
      debug: {
        outer_error_code: outerCode,
        response_success: innerSuccess,
        payUrl: payUrl || null,
      },
      raw: resData,
    })
  }

  // 성공
  console.log('[1688-crossborder-pay] 결제 링크 발급 성공:', {
    tradeId: tradeIdStr,
    payUrl,
    timestamp: new Date().toISOString(),
  })

  return res.status(200).json({
    success: true,
    tradeId: tradeIdStr,
    payUrl,
    raw: resData,
  })
}
