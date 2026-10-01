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

// 주소록 유형 addressType — get-page-addresses-sellers 문서 enum(AddressBookType.sellers) 8개 그대로 (2026-10-01 문서 확인)
export const ADDRESS_TYPES = {
  REPRESENTATIVE: '사업장', BUSINESS: '추가 사업장', GENERAL: '일반', RELEASE: '출고지', REFUND_OR_EXCHANGE: '반품/교환지',
  LOGISTICS_CENTER_RELEASE: '물류센터 출고지', LOGISTICS_CENTER_REFUND_OR_EXCHANGE: '물류센터 반품/교환지', OVERSEAS_BANK: '해외 정산 계좌 은행',
}
// 용도별 유형 — 앞이 먼저. 정산 계좌(OVERSEAS_BANK)는 배송 주소가 아니라 기본으로 고르지 않는다
const ADDRESS_USE = {
  shipping: ['RELEASE', 'LOGISTICS_CENTER_RELEASE'],
  return: ['REFUND_OR_EXCHANGE', 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE'],
}
/**
 * 처음 골라 둘 주소록 번호 (화면 StudioSendSmartstore·서버 smartstore_addresses가 같이 쓴다)
 *   ① 마지막으로 등록에 성공한 상품의 주소(lastId)가 지금 목록에 있으면 그것 — 출고지·반품지 각각 따로
 *   ② 국내(overseas 아님) 주소 중 그 용도 유형(출고지 = RELEASE → 물류센터 출고지 / 반품지 = REFUND_OR_EXCHANGE → 물류센터 반품/교환지)
 *   ③ 없으면 국내 주소 중 다른 용도가 아닌 것(출고지 자리에 반품/교환지를 먼저 넣지 않음 — 2026-10-01 운영: 출고지 기본이 "반품교환지"로 잡힘)
 *   ④ 그래도 없으면 예전 그대로: 국내 첫째 → 목록 첫째(해외만 있을 때 — 관부가세 칸이 나온다)
 * @param {{ id:number, type:string, overseas:boolean }[]} list  @param {'shipping'|'return'} kind  @param {number|null} [lastId]
 */
export function pickSmartstoreAddress(list, kind, lastId = null) {
  const all = (Array.isArray(list) ? list : []).filter(a => a && a.type !== 'OVERSEAS_BANK')
  if (lastId != null) { const hit = all.find(a => a.id === lastId); if (hit) return hit.id }
  const use = kind === 'return' ? ADDRESS_USE.return : ADDRESS_USE.shipping
  const other = kind === 'return' ? ADDRESS_USE.shipping : ADDRESS_USE.return
  const domestic = all.filter(a => a.overseas !== true)
  for (const t of use) { const hit = domestic.find(a => a.type === t); if (hit) return hit.id }
  return (domestic.find(a => !other.includes(a.type)) || domestic[0] || all[0])?.id ?? null
}
/** 등록 본문(request_json.body)의 claimDeliveryInfo → 마지막에 쓴 { shipping, return } 주소록 번호 (없거나 이상하면 null) */
export function lastAddressesOf(claim) {
  const id = v => (Number.isSafeInteger(v) && v > 0 ? v : null)
  return { shipping: id(claim?.shippingAddressId), return: id(claim?.returnAddressId) }
}
