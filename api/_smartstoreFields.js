/**
 * 스마트스토어 보내기 — 화면(StudioSendSmartstore.vue)과 서버(api/_smartstore.js)가 같이 쓰는 값 (순수 — import 없음, 브라우저 번들에 들어가도 된다)
 * 근거: 공식 문서 apicenter.commerce.naver.com/docs/commerce-api/current — create-product-product(전시 상태), seller-dispatch-product-orders-pay-order-seller(택배사 코드)
 */
// 등록 때 넣을 수 있는 전시 상태 — "ON, SUSPENSION만 입력 가능" (문서). 첫째가 기본(전시중지)
export const DISPLAY_STATUSES = ['SUSPENSION', 'ON']
// 택배사 — 발송 처리 API 택배사 코드 표에서 큰 5곳 (문서 값 그대로)
export const SS_DELIVERY_COMPANIES = [
  { code: 'CJGLS', name: 'CJ대한통운' }, { code: 'HYUNDAI', name: '롯데택배' }, { code: 'HANJIN', name: '한진택배' }, { code: 'KGB', name: '로젠택배' }, { code: 'EPOST', name: '우체국택배' },
]
// 원산지 — 03(기타-상세 설명에 표시)·04(기타-직접 입력, content 필수) (문서)
export const ORIGIN_CODES = ['03', '04']
// 관부가세 — originProduct.detailAttribute.customsTaxType. "출고지 주소가 해외 주소인 경우 필수" (create-product-product 문서 표 그대로)
//   INCLUDED 비고: "노출 채널이 해외직구인 경우 INCLUDED만 허용" — 해외직구 채널 여부는 확인 못 함[모름] → 고객이 고른다(기본값 없음)
//   2026-10-01 운영 1차: 해외(항주) 출고지로 보냈다가 400 customsTaxType.required.overseas
export const CUSTOMS_TAX_TYPES = [
  { code: 'NOT_APPLICABLE', name: '부과 대상 아님' }, { code: 'INCLUDED', name: '관부가세 포함' }, { code: 'EXCLUDED', name: '관부가세 미포함' },
]
export const isCustomsTaxType = v => CUSTOMS_TAX_TYPES.some(t => t.code === v)
