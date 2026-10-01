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
