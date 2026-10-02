/**
 * 판매처별 상세 이미지 장 수 상한 — 서버(api/marketplace.js 보내기 검사)와 보내기 창·여러 상품 보내기 창(빠짐 목록)이 같이 쓰는 규칙 (순수 — import 없음)
 *
 * 근거 (2026-10-02 조사 — 보고서 docs/reports/2026-10-02-*-detail-slices.md)
 *   스마트스토어 30장 = 판매처 규정이 아니라 우리 상한. 이미지 업로드 API는 한 번에 10장(문서)이라 30장 = 업로드 3번 — 함수 시간 60초 안에서 보내려고 정한 값
 *   11번가 30장 = 스마트스토어 값을 그대로 쓰던 것(예전 marketplace.js가 _smartstore.js DETAIL_IMAGE_MAX를 같이 썼다). 11번가 문서의 장 수 규정은 확인 못 함
 *   쿠팡·지그재그 = 장 수 상한을 문서에서 확인 못 함 → 넣지 않는다 (쿠팡은 한 변 5000px·10MB 규격만 — api/_coupangFields.js detailImagePlan이 맞춘다)
 * 운영(2026-10-02): 섹션 50개 = 상세 이미지 50장 → 스마트스토어·11번가가 서버에서 "30장까지"로 거절했는데 보내기 창 빠짐 목록은 비어 있었다 → 화면에서 먼저 막는다
 */
export const DETAIL_IMAGE_LIMITS = { smartstore: 30, '11st': 30 }

/** 이 판매처에 상세 이미지 count장을 보낼 수 없으면 { max, over } · 되면 null */
export function detailImageOver(market, count) {
  const max = DETAIL_IMAGE_LIMITS[market]
  if (!Number.isInteger(max) || !Number.isInteger(count) || count <= max) return null
  return { max, over: count - max }
}

/** 빠짐 목록 한 줄 (판매처 이름은 창이 앞에 붙인다) */
export const detailImageMissing = (count, { max, over }) => `상세 이미지 ${max}장까지 보낼 수 있어요 (지금 ${count}장 · ${over}장 초과)`

/** 서버 거절 문구 (예전 문구 그대로) */
export const detailImageServerMessage = max => `상세 이미지는 ${max}장까지 보낼 수 있습니다.`
