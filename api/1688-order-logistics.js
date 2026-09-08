/**
 * Vercel Serverless Function: /api/1688-order-logistics
 * OneBound 1688global — com.alibaba.logistics/alibaba.trade.getLogisticsInfos.buyerView
 *
 * 목적: 1688 판매자가 발송한 운송장번호·택배사를 자동 조회
 *
 * ⚠️  주의: orderId(1688 주문번호)는 19자리 Long 형식.
 *           JS Number()나 JSON.stringify로 감싸면 정밀도 손실이 발생하므로
 *           반드시 템플릿 리터럴로 _o_args 문자열을 직접 조립한다.
 *
 * 인증: 환경변수에서만 로드 (평문 하드코딩 절대 금지)
 *   - ONEBOUND_KEY, ONEBOUND_SECRET
 *
 * Phase 3 확장 메모:
 *   이 함수는 순수 조회 전용(side-effect 없음).
 *   현재는 관리자 버튼 클릭으로 트리거되지만,
 *   이후 자동 폴링 시스템이 동일한 엔드포인트를 직접 호출하는 방식으로
 *   호출 주체만 교체하면 된다 — 조회 로직 자체는 수정 불필요.
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

  // ── 입력 파라미터 ─────────────────────────────────────────────────
  const { orderId } = req.body || {}

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: '필수 파라미터 누락: orderId (1688 주문번호) 가 필요합니다.',
    })
  }

  // orderId는 문자열로 수신. 숫자만 포함되어 있는지 기본 검증
  const orderIdStr = String(orderId).trim()
  if (!/^\d+$/.test(orderIdStr)) {
    return res.status(400).json({
      success: false,
      message: `orderId 형식 오류: 숫자만 허용됩니다. 받은 값: "${orderIdStr}"`,
    })
  }

  // ── 환경변수에서만 인증정보 로드 ─────────────────────────────────
  const OB_KEY    = process.env.ONEBOUND_KEY    || ''
  const OB_SECRET = process.env.ONEBOUND_SECRET || ''

  if (!OB_KEY || !OB_SECRET) {
    console.error('[1688-order-logistics] ❌ 환경변수 누락:', {
      hasKey: !!OB_KEY,
      hasSecret: !!OB_SECRET,
      timestamp: new Date().toISOString(),
    })
    return res.status(500).json({
      success: false,
      message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET)',
    })
  }

  // ── _o_args 조립 ──────────────────────────────────────────────────
  // ⚠️  JSON.stringify / Number() 사용 금지 — BigInt 정밀도 손실 방지
  //     orderId는 따옴표 없는 순수 Long 형태로 직접 삽입
  const oArgsString = `{"webSite":"1688","orderId":${orderIdStr}}`

  // 진행 조건 2: raw payload를 반드시 로그에 남길 것
  console.log('[1688-order-logistics] [_o_args RAW PAYLOAD]:', oArgsString)
  console.log('[1688-order-logistics] 물류 조회 시작:', {
    orderId: orderIdStr,
    timestamp: new Date().toISOString(),
  })

  // ── Query string 조립 ─────────────────────────────────────────────
  const params = new URLSearchParams({
    key:     OB_KEY,
    secret:  OB_SECRET,
    method:  'com.alibaba.logistics/alibaba.trade.getLogisticsInfos.buyerView',
    _o_args: oArgsString,
    lang:    'zh-CN',
  })

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`

  // 로그에 찍을 때는 key/secret 마스킹
  const maskedUrl = targetUrl
    .replace(/key=[^&]+/, 'key=***')
    .replace(/secret=[^&]+/, 'secret=***')
  console.log('[1688-order-logistics] OneBound URL:', maskedUrl)

  // ── 12초 타임아웃 ────────────────────────────────────────────────
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
      console.warn('[1688-order-logistics] ⚠️ JSON 파싱 실패:', je.message)
      return res.status(502).json({
        success: false,
        message: '원바운드 API 응답을 JSON으로 파싱할 수 없습니다.',
        errorType: 'parse_error',
      })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn('[1688-order-logistics] ⏱️ 요청 타임아웃 (12초 초과):', { orderId: orderIdStr })
      return res.status(504).json({
        success: false,
        message: '원바운드 API 요청 타임아웃 (12초)',
        errorType: 'timeout',
      })
    }
    console.error('[1688-order-logistics] ❌ fetch 오류:', err.message)
    return res.status(502).json({
      success: false,
      message: '원바운드 API 통신 오류: ' + err.message,
      errorType: 'network_error',
    })
  }

  // ── 응답 로그 ────────────────────────────────────────────────────
  console.log('[1688-order-logistics] 원바운드 응답 수신:', {
    orderId: orderIdStr,
    error_code: resData?.error_code,
    error: resData?.error,
    reason: resData?.reason,
    responseType: Array.isArray(resData?.response) ? `array(${resData.response.length})` : typeof resData?.response,
    timestamp: new Date().toISOString(),
  })

  // ── 외부 에러 판정 ────────────────────────────────────────────────
  const outerCode = String(resData?.error_code ?? '').trim()

  // 5000: "물류 추적 정보 없음" — 아직 발송 전
  if (outerCode === '5000') {
    const reason = resData?.reason || resData?.error || ''
    console.log('[1688-order-logistics] ℹ️ 물류 정보 없음 (아직 발송 전):', { orderId: orderIdStr, reason })
    return res.status(200).json({
      success: false,
      message: '아직 발송 전이거나 운송장이 등록되지 않았습니다.',
      errorType: 'no_logistics_info',
    })
  }

  // 그 외 에러 (4005 권한, gw.xxx 등)
  if (outerCode && outerCode !== '0' && outerCode !== '0000') {
    const reason = resData?.reason || resData?.error || ''
    console.warn('[1688-order-logistics] ❌ 외부 API 에러:', {
      orderId: orderIdStr,
      error_code: outerCode,
      reason,
    })
    return res.status(200).json({
      success: false,
      message: reason || `OneBound 오류 (code: ${outerCode})`,
      errorType: 'api_error',
      code: outerCode,
    })
  }

  // ── 내부 에러 판정 (gw.ParamMissing 등) ──────────────────────────
  const innerResp = resData?.response
  if (innerResp && !Array.isArray(innerResp) && innerResp.error_code) {
    const innerCode = innerResp.error_code
    const innerMsg  = innerResp.error_message || innerResp.exception || ''
    console.warn('[1688-order-logistics] ❌ 내부 gw 에러:', {
      orderId: orderIdStr,
      innerCode,
      innerMsg,
    })
    return res.status(200).json({
      success: false,
      message: `OneBound 내부 오류 (${innerCode}): ${innerMsg}`,
      errorType: 'gw_error',
      code: innerCode,
    })
  }

  // ── 성공: 물류 정보 파싱 ─────────────────────────────────────────
  // getLogisticsInfos 응답: response = 배열 (각 배송 건)
  const logisticsList = Array.isArray(innerResp) ? innerResp : []

  if (logisticsList.length === 0) {
    console.log('[1688-order-logistics] ℹ️ 물류 배열이 비어 있음:', { orderId: orderIdStr })
    return res.status(200).json({
      success: false,
      message: '운송장 정보가 아직 등록되지 않았습니다.',
      errorType: 'empty_logistics',
    })
  }

  // 첫 번째 배송 건 기준 (크로스보더 단일 주문은 보통 1건)
  const first = logisticsList[0]
  const trackingNo  = first.logisticsBillNo      || ''  // 운송장번호
  const carrier     = first.logisticsCompanyName || ''  // 택배사명 (예: "申通快递(STO)")
  const carrierCode = first.logisticsCompanyNo   || ''  // 택배사 코드 (예: "STO")
  const status      = first.status               || ''  // "SIGN" = 수령완료

  console.log('[1688-order-logistics] ✅ 물류 조회 성공:', {
    orderId: orderIdStr,
    trackingNo,
    carrier,
    carrierCode,
    status,
    timestamp: new Date().toISOString(),
  })

  return res.status(200).json({
    success: true,
    trackingNo,
    carrier,
    carrierCode,
    status,
    raw: logisticsList,  // 원본 전체 (디버깅용)
  })
}
