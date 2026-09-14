/**
 * Vercel Serverless Function: /api/1688-freight-estimate
 *
 * 역할: 1688 상품의 실제 중국 내륙 택배비(sumCarriage)를 조회합니다.
 *
 * ※ 설계 결정 근거 (2026-09-14 실제 API 호출 테스트 결과):
 *   - 원래 계획: com.alibaba.fenxiao.crossborder/product.freight.estimate 사용
 *   - 실측 결과: 해당 method는 1688global/custom 구독에서 미지원
 *     (all variants: error_code 5000, call_args: [], offerId 788598752048 및
 *      856203386574 두 상품 모두 동일 실패, /slash/colon/no-session/flat-params 4가지 방식 전부 실패)
 *   - 대안 채택: alibaba.createOrder.preview (이미 프로젝트에 구현됨, error_code 0000 정상 응답)
 *     → response.orderPreviewResuslt[0].sumCarriage (단위: 분(fen), ÷100 = 위안)
 *     실측: offerId=788598752048, qty=2 → sumCarriage=200 → ¥2.00 (2026-09-14)
 *
 * 요청 (하위호환 유지):
 *   1) 단일 SKU (기존): GET /api/1688-freight-estimate?offerId=...&specId=...&quantity=...
 *   2) 배열 (여러 SKU): POST /api/1688-freight-estimate
 *        body: { cargoParamList: [{ offerId|numIid, specId, quantity }, ...] }
 * 응답: { success: true, freight: <CNY float> }  ← cargoParamList 전체 합계 운임(CNY)
 *        | { success: false, freight: null, message: ... }
 *
 * 인증: 환경변수에서만 (평문 하드코딩 절대 금지)
 *   - ONEBOUND_KEY, ONEBOUND_SECRET, ONEBOUND_SESSION
 *
 * 배송 주소: addressId 6402758024 (圆圆A45, 이우 청양류 C구 38동 — 이우 물류창고)
 *
 * toProvinceCode/toCityCode: product.freight.estimate 실패로 이 API에서는 불필요.
 *   (alibaba.createOrder.preview는 addressId 기반으로 1688 서버가 주소를 직접 조회함)
 */

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'
const ADDRESS_ID = '6402758024' // 圆圆A45 — 이우 물류창고, 기존 발주 API와 동일

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, freight: null, message: 'GET 또는 POST 요청만 허용됩니다.' })
  }

  // ── 입력 파싱 (하위호환 유지) ─────────────────────────────────────────────
  // 1) POST body: { cargoParamList: [{ offerId|numIid, specId, quantity }] }  ← 배열(여러 SKU)
  // 2) GET query: ?offerId=...&specId=...&quantity=...  ← 기존 단일 SKU 방식 그대로 동작
  let cargoList = []

  if (req.method === 'POST') {
    const body = req.body || {}
    if (Array.isArray(body.cargoParamList) && body.cargoParamList.length > 0) {
      cargoList = body.cargoParamList
        .filter((it) => it && (it.offerId || it.numIid) && it.specId)
        .map((it) => ({
          offerId: String(it.offerId ?? it.numIid),
          specId: String(it.specId),
          quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
        }))
    }
  } else {
    const { offerId, specId, quantity } = req.query || {}
    if (offerId && specId) {
      cargoList = [{
        offerId: String(offerId),
        specId: String(specId),
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
      }]
    }
  }

  if (cargoList.length === 0) {
    return res.status(400).json({
      success: false,
      freight: null,
      message: '필수 파라미터 누락: cargoParamList(배열) 또는 offerId/specId/quantity가 필요합니다.',
    })
  }

  // 환경변수에서만 인증정보 로드
  const OB_KEY     = process.env.ONEBOUND_KEY     || ''
  const OB_SECRET  = process.env.ONEBOUND_SECRET  || ''
  const OB_SESSION = process.env.ONEBOUND_SESSION || ''

  if (!OB_KEY || !OB_SECRET || !OB_SESSION) {
    console.error('[1688-freight-estimate] 환경변수 누락:', {
      hasKey: !!OB_KEY,
      hasSecret: !!OB_SECRET,
      hasSession: !!OB_SESSION,
    })
    return res.status(500).json({
      success: false,
      freight: null,
      message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)',
    })
  }

  // alibaba.createOrder.preview _o_args 조립
  const oArgs = {
    flow: 'general',
    addressParam: { addressId: ADDRESS_ID },
    cargoParamList: cargoList,
  }

  const params = new URLSearchParams({
    key: OB_KEY,
    secret: OB_SECRET,
    method: 'com.alibaba.trade/alibaba.createOrder.preview',
    session: OB_SESSION,
    _o_args: JSON.stringify(oArgs),
    lang: 'zh-CN',
  })

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`

  console.log('[1688-freight-estimate] 호출:', {
    url: targetUrl
      .replace(/secret=[^\&]+/, 'secret=***')
      .replace(/session=[^\&]+/, 'session=***'),
    cargoCount: cargoList.length,
    cargoParamList: cargoList,
  })

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
      console.warn('[1688-freight-estimate] JSON 파싱 실패:', je.message)
      return res.status(200).json({ success: false, freight: null, message: 'API 응답 파싱 실패' })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn('[1688-freight-estimate] 타임아웃 (12초)')
      return res.status(200).json({ success: false, freight: null, message: '타임아웃 (12초)' })
    }
    console.error('[1688-freight-estimate] fetch 오류:', err.message)
    return res.status(200).json({ success: false, freight: null, message: `통신 오류: ${err.message}` })
  }

  // 에러 판정
  const errorCode = String(resData?.error_code || '').trim()
  const isError = errorCode && errorCode !== '0' && errorCode !== '0000'
  if (isError) {
    console.warn('[1688-freight-estimate] API 에러:', errorCode, resData?.reason)
    return res.status(200).json({
      success: false,
      freight: null,
      message: resData?.reason || `OneBound 오류 (code: ${errorCode})`,
      code: errorCode,
    })
  }

  // sumCarriage 추출 (단위: 분(fen) → ÷100 = CNY)
  // 실측 근거: offerId=788598752048, qty=2 → sumCarriage=200 → ¥2.00 (2026-09-14)
  const previewResult = resData?.response?.orderPreviewResuslt?.[0]
  if (!previewResult) {
    console.warn('[1688-freight-estimate] orderPreviewResuslt 없음:', JSON.stringify(resData).slice(0, 200))
    return res.status(200).json({ success: false, freight: null, message: 'preview 결과 없음' })
  }

  const sumCarriage = previewResult.sumCarriage
  if (sumCarriage === null || sumCarriage === undefined) {
    // sumCarriage=0 은 包邮(무료배송). undefined/null만 "미제공"으로 처리.
    console.log('[1688-freight-estimate] sumCarriage 없음 (undefined) — freight null 반환')
    return res.status(200).json({ success: false, freight: null, message: 'sumCarriage 미제공' })
  }

  // 분(fen) → 위안(CNY)
  const freightCny = Number((Number(sumCarriage) / 100).toFixed(2))

  console.log('[1688-freight-estimate] 성공:', { cargoCount: cargoList.length, cargoParamList: cargoList, sumCarriage, freightCny })

  return res.status(200).json({
    success: true,
    freight: freightCny, // CNY, 수량 전체 기준 총 배송비 (개당 단가가 아님)
  })
}
