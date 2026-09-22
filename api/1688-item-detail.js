/**
 * Vercel Serverless Function: /api/1688-item-detail
 * OneBound 1688global 상품 상세 조회 프록시
 * - 엔드포인트: 1688global 단독 사용 (강제 직결, 정식 세션 바인딩)
 *   (2026-09-18부로 "1688" non-global 폴백 제거 — OneBound 계정 매니저가 해당 계정에서
 *    1688 플랫폼 item_get/item_search 사용 중단 안내)
 * - 게이트웨이: https://api-gw.onebound.cn
 * - 타임아웃: 7000ms
 */

import { isCrossborderKoEnabled, enrichDetailWithKo } from './_crossborderKo.js'

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'

// 이 창구 전체에 쓸 수 있는 시간(ms).
// vercel.json에서 이 함수의 maxDuration을 30초로 선언했으므로 여유 5초를 남긴다.
// (공식 API에 한국어가 없는 상품은 OneBound lang=ko 폴백이 붙어 실측 9초까지 걸린다 —
//  기본 제한 10초로는 그 경로가 상시 잘려서 maxDuration을 올렸다)
const ROUTE_BUDGET_MS = 25000

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

async function fetchDetail(endpoint, cleanNumericId, OB_KEY, OB_SECRET, timeoutMs) {
  // 공식 문서(open.onebound.cn/help/api/1688global.item_get.html) 확인:
  // 1688global/item_get 필수 파라미터는 key·secret·num_iid 세 가지만 요구.
  // session/session_id는 미지원 파라미터 → 추가하지 않음.
  const targetUrl = `${ONEBOUND_BASE_URL}/${endpoint}/item_get/?key=${OB_KEY}&secret=${OB_SECRET}&num_iid=${cleanNumericId}&result_type=json`
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
  const routeStart = Date.now()
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

  // 환경변수에서만 인증키 로드 (평문 하드코딩 금지 원칙 준수)
  const OB_KEY    = process.env.ONEBOUND_KEY    || process.env.VITE_ONEBOUND_KEY    || ''
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || ''

  if (!OB_KEY || !OB_SECRET) {
    console.error('[1688-item-detail] ONEBOUND_KEY 또는 ONEBOUND_SECRET 환경변수가 설정되지 않았습니다.')
    return res.status(500).json({ success: false, message: 'API 인증 환경변수 누락', data: null })
  }

  // 1688global 단독 사용 (정식 개통 경로, session 파라미터 불필요 확인됨)
  // ⚠️ 2026-09-18: OneBound 계정 매니저 확인 — "1688"(non-global) 플랫폼의 item_get/
  // item_search는 해당 계정에서 사용 불가 판정(그날 13회 시도 전부 실패, 실제조회수 0).
  // 매니저가 명시적으로 이 두 API는 쓰지 말라고 안내해 2차 폴백 호출을 제거함.
  const resData = await fetchDetail('1688global', cleanNumericId, OB_KEY, OB_SECRET, 7000)

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

  // ── 1688 공식 다국어 API로 번역 캐시 선충전 (되돌리기: CROSSBORDER_KO_ENABLED=false) ──
  // 응답 데이터(가격·재고·specId·SKU)는 손대지 않는다. translation_cache만 채워서,
  // 클라이언트가 곧바로 보낼 번역 요청이 파파고 없이 캐시 적중으로 끝나게 한다.
  // 그래서 응답보다 "먼저" 저장을 끝내야 한다(await).
  if (isCrossborderKoEnabled()) {
    try {
      await enrichDetailWithKo(itemObj, cleanNumericId, {
        deadline: routeStart + ROUTE_BUDGET_MS,
      })
    } catch (e) {
      console.warn('[1688-item-detail] 한글 보강 실패 — 상세는 그대로 반환합니다:', e.message)
    }
  }

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