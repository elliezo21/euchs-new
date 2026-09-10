/**
 * Vercel Serverless Function: /api/1688-protocol-pay
 * OneBound 1688global alibaba.trade.pay.protocolPay 프록시
 *
 * ⚠️  경고: action="pay" 호출은 실제 알리페이 면제결제(免密支付)를 발생시킵니다.
 *           EUCHS → 1688 판매자로 실제 대금이 지급됩니다.
 *           프론트엔드에서 관리자가 명시적으로 버튼을 클릭한 경우에만 호출해야 합니다.
 *
 * 지원 action:
 *   "isopen" — alibaba.trade.pay.protocolPay.isopen
 *              ALIPAY 채널 signedStatus 반환 (모니터링/진단 전용, 블로킹 아님)
 *   "pay"    — alibaba.trade.pay.protocolPay.preparePay
 *              tradeId(1688 orderId)로 실제 면제결제 실행
 *
 * 성공 판정 — 2단계 중첩 검사 (Fail-Fast):
 *   Step 1. 외부 error_code ∉ {"0","0000"} → 즉시 실패
 *   Step 2. 내부 response.error_code 가 실질적으로 존재하면 → 실패
 *   Step 3. 두 조건 모두 통과한 경우에만 success: true 반환
 *   ※ "fetch 자체가 에러 없이 끝남"을 성공 기준으로 절대 사용하지 않음
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

  const { action, tradeId } = req.body || {}

  // action 검증
  if (!action || !['isopen', 'pay'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'action은 "isopen" 또는 "pay"여야 합니다.',
    })
  }

  // pay 액션 전용: tradeId 필수
  if (action === 'pay') {
    if (!tradeId) {
      console.warn('[1688-protocol-pay] ⛔ pay 액션에 tradeId 누락:', { timestamp: new Date().toISOString() })
      return res.status(400).json({ success: false, message: 'pay 액션에는 tradeId(1688 주문번호)가 필수입니다.' })
    }
    const tradeIdStr = String(tradeId).trim()
    if (!/^\d+$/.test(tradeIdStr)) {
      return res.status(400).json({
        success: false,
        message: `tradeId 형식 오류: 숫자만 허용됩니다. 받은 값: "${tradeIdStr}"`,
      })
    }
  }

  // 환경변수에서만 인증정보 로드
  const OB_KEY     = process.env.ONEBOUND_KEY     || ''
  const OB_SECRET  = process.env.ONEBOUND_SECRET  || ''
  const OB_SESSION = process.env.ONEBOUND_SESSION || ''

  if (!OB_KEY || !OB_SECRET || !OB_SESSION) {
    console.error('[1688-protocol-pay] ❌ 환경변수 누락:', {
      hasKey: !!OB_KEY, hasSecret: !!OB_SECRET, hasSession: !!OB_SESSION,
      timestamp: new Date().toISOString(),
    })
    return res.status(500).json({
      success: false,
      message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)',
    })
  }

  // action별 method & _o_args 결정
  let method, oArgs, logLabel

  if (action === 'isopen') {
    method   = 'com.alibaba.trade/alibaba.trade.pay.protocolPay.isopen'
    oArgs    = JSON.stringify({})
    logLabel = 'isopen'
  } else {
    const tradeIdStr = String(tradeId).trim()
    method   = 'com.alibaba.trade/alibaba.trade.pay.protocolPay.preparePay'
    oArgs    = JSON.stringify({ tradeWithholdPreparePayParam: { tradeId: tradeIdStr } })
    logLabel = `preparePay(tradeId=${tradeId})`
  }

  // Query string 조립
  const params = new URLSearchParams({ key: OB_KEY, secret: OB_SECRET, session: OB_SESSION, method, _o_args: oArgs, lang: 'zh-CN' })
  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`
  const maskedUrl = targetUrl.replace(/secret=[^&]+/, 'secret=***').replace(/session=[^&]+/, 'session=***')

  console.log(`[1688-protocol-pay] 🚀 ${logLabel} 호출 시작:`, {
    action, tradeId: tradeId || null, url: maskedUrl, timestamp: new Date().toISOString(),
  })

  // 12초 타임아웃
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  let resData = null
  try {
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)

    try {
      resData = await r.json()
    } catch (je) {
      console.warn(`[1688-protocol-pay] ⚠️ ${logLabel} JSON 파싱 실패:`, { error: je.message, timestamp: new Date().toISOString() })
      return res.status(502).json({ success: false, message: '원바운드 API 응답을 JSON으로 파싱할 수 없습니다.' })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn(`[1688-protocol-pay] ⏱️ ${logLabel} 타임아웃 (12초):`, { tradeId: tradeId || null, timestamp: new Date().toISOString() })
      return res.status(504).json({ success: false, message: '원바운드 API 요청 타임아웃 (12초)' })
    }
    console.error(`[1688-protocol-pay] ❌ ${logLabel} fetch 오류:`, { error: err.message, tradeId: tradeId || null, timestamp: new Date().toISOString() })
    return res.status(502).json({ success: false, message: '원바운드 API 통신 오류: ' + err.message })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 성공/실패 판정 — 2단계 중첩 검사 (Fail-Fast)
  // ※ "fetch 자체가 에러 없이 끝났다"를 성공 기준으로 사용하지 않음
  //   반드시 응답 바디 안의 실제 값으로만 판단
  // ─────────────────────────────────────────────────────────────────────────

  // Step 1. 외부 error_code 확인
  const outerCode = String(resData?.error_code ?? '').trim()
  const outerReason = resData?.reason || resData?.error || ''
  const outerIsError = outerCode && outerCode !== '0' && outerCode !== '0000'

  if (outerIsError) {
    console.warn(`[1688-protocol-pay] ❌ ${logLabel} 외부 에러 (Step 1 실패):`, {
      action, tradeId: tradeId || null,
      outer_error_code: outerCode, outer_reason: outerReason,
      full_response: resData, timestamp: new Date().toISOString(),
    })
    return res.status(200).json({
      success: false,
      message: outerReason || `OneBound 외부 오류 (error_code: ${outerCode})`,
      debug: { outer_error_code: outerCode, outer_reason: outerReason },
      raw: resData,
    })
  }

  // Step 2. 내부 response.error_code 확인
  // dry-run 확인: 외부 "0000"이어도 response.error_code에 "gw.ISPInvokeError" 등이 올 수 있음
  const innerResp     = resData?.response || {}
  const innerCode     = innerResp?.error_code
  const innerCodeStr  = (innerCode !== null && innerCode !== undefined) ? String(innerCode).trim() : ''
  const innerIsError  = innerCodeStr !== '' && innerCodeStr !== 'null'

  if (innerIsError) {
    const innerMessage   = innerResp?.error_message || ''
    const innerException = innerResp?.exception || ''
    const innerRequestId = innerResp?.request_id || ''

    console.warn(`[1688-protocol-pay] ❌ ${logLabel} 내부 에러 (Step 2 실패):`, {
      action, tradeId: tradeId || null,
      outer_error_code: outerCode,
      inner_error_code: innerCodeStr,
      inner_error_message: innerMessage,
      inner_exception: innerException,
      inner_request_id: innerRequestId,
      full_response: resData,
      timestamp: new Date().toISOString(),
    })
    return res.status(200).json({
      success: false,
      message: `1688 내부 오류 (${innerCodeStr})${innerMessage && innerMessage !== 'null' ? ': ' + innerMessage : ''}`,
      debug: {
        outer_error_code: outerCode,
        inner_error_code: innerCodeStr,
        inner_error_message: innerMessage,
        inner_exception: innerException,
        inner_request_id: innerRequestId,
      },
      raw: resData,
    })
  }

  // Step 3. 두 조건 모두 통과 → 성공
  console.log(`[1688-protocol-pay] ✅ ${logLabel} 성공:`, {
    action, tradeId: tradeId || null,
    outer_error_code: outerCode,
    responseKeys: Object.keys(innerResp),
    timestamp: new Date().toISOString(),
  })

  // action별 성공 응답 가공
  if (action === 'isopen') {
    const agreements = Array.isArray(innerResp?.paymentAgreements) ? innerResp.paymentAgreements : []
    const alipay = agreements.find(a => a.payChannel === 'ALIPAY') || null
    const shegou = agreements.find(a => a.payChannel === 'SHEGOU') || null
    return res.status(200).json({
      success: true,
      alipay: {
        signedStatus:  alipay?.signedStatus  || 'false',
        bindingStatus: alipay?.bindingStatus || 'false',
        agreementNo:   alipay?.agreementNo   || null,
        signUrl:       alipay?.signUrl       || null,
      },
      shegou: { signedStatus: shegou?.signedStatus || 'false' },
      raw: resData,
    })
  }

  // action === 'pay'
  return res.status(200).json({
    success: true,
    message: '1688 면제결제(protocolPay) 요청이 정상 처리되었습니다.',
    tradeId: String(tradeId).trim(),
    raw: resData,
  })
}
