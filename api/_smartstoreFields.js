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
// 배송비 종류 — create-product-product deliveryFeeType enum 중 이 섹션이 쓰는 3개 (문서 값 그대로. 수량별·구간별은 쓰지 않는다)
//   CONDITIONAL_FREE + freeConditionalAmount("배송비 유형이 '조건부 무료'일 경우 입력합니다.") — 2026-10-01 추가
export const SS_FEE_TYPES = ['FREE', 'PAID', 'CONDITIONAL_FREE']
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
// 용도가 정해진 유형 — 이 밖(사업장·추가 사업장·일반·빈 값)은 "용도 미지정". 정산 계좌(OVERSEAS_BANK)는 배송 주소가 아니라 기본으로 고르지 않는다
const ADDRESS_USE = {
  shipping: { main: 'RELEASE', center: 'LOGISTICS_CENTER_RELEASE' },
  return: { main: 'REFUND_OR_EXCHANGE', center: 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE' },
}
const PURPOSE_TYPES = ['RELEASE', 'LOGISTICS_CENTER_RELEASE', 'REFUND_OR_EXCHANGE', 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE']
/**
 * 처음 골라 둘 주소록 번호 (화면 StudioSendSmartstore·서버 smartstore_addresses가 같이 쓴다) — 출고지·반품지 각각 따로
 *   ① 마지막으로 등록에 성공한 상품의 주소(lastId)가 지금 목록에 있으면 그것
 *   ② 국내(overseas 아님) 그 용도 유형 (출고지 RELEASE / 반품지 REFUND_OR_EXCHANGE)
 *   ③ 국내 용도 미지정 주소 (일반·사업장 등 — 2026-10-01 운영: 이니드 "상품출고지(일반)")
 *   ④ 국내 물류센터 유형 (물류센터 출고지 / 물류센터 반품/교환지) — 맨 뒤 (2026-10-01 해성 결정)
 *   ⑤ 그래도 없으면 예전 그대로: 국내 첫째 → 목록 첫째(해외만 있을 때 — 관부가세 칸이 나온다)
 * @param {{ id:number, type:string, overseas:boolean }[]} list  @param {'shipping'|'return'} kind  @param {number|null} [lastId]
 */
export function pickSmartstoreAddress(list, kind, lastId = null) {
  const all = (Array.isArray(list) ? list : []).filter(a => a && a.type !== 'OVERSEAS_BANK')
  if (lastId != null) { const hit = all.find(a => a.id === lastId); if (hit) return hit.id }
  const use = kind === 'return' ? ADDRESS_USE.return : ADDRESS_USE.shipping
  const domestic = all.filter(a => a.overseas !== true)
  const hit = domestic.find(a => a.type === use.main) || domestic.find(a => !PURPOSE_TYPES.includes(a.type)) || domestic.find(a => a.type === use.center)
  return (hit || domestic[0] || all[0])?.id ?? null
}
// [주소록 관리] 버튼 — 스마트스토어센터 첫 화면. 주소록 화면의 고유 주소는 공식 문서·안내에서 찾지 못함[모름] → 첫 화면 (2026-10-01)
export const SMARTSTORE_CENTER_URL = 'https://sell.smartstore.naver.com/'
/** 등록 본문(request_json.body)의 claimDeliveryInfo → 마지막에 쓴 { shipping, return } 주소록 번호 (없거나 이상하면 null) */
export function lastAddressesOf(claim) {
  const id = v => (Number.isSafeInteger(v) && v > 0 ? v : null)
  return { shipping: id(claim?.shippingAddressId), return: id(claim?.returnAddressId) }
}

// ── 등록 템플릿(마켓 공용 값 — api/_listingTemplates.js) ↔ 스마트스토어 섹션 칸 (2026-10-01) ──
// 스마트스토어 칸으로 바꾸는 일은 여기서만. 템플릿에 값이 없는 칸은 돌려주지 않는다(화면이 처음 값을 그대로 둔다)
// 스마트스토어 보내기에 칸이 없는 값(브랜드·제조국·반품/교환 안내·KC·고시 유형·제주/도서산간 추가비)은 쓰지 않는다
export const AS_GUIDE_MAX = 300 // A/S 안내 — 화면 칸 maxlength·서버 cleanText(guide, 300)와 같은 길이
export const AS_GUIDE_LONG_NOTE = `템플릿의 A/S 안내가 ${AS_GUIDE_MAX}자를 넘어 적용하지 않았습니다. A/S 안내를 직접 입력하세요.`
const isWonValue = v => Number.isInteger(v) && v >= 0
/**
 * 상품정보 템플릿 data → 섹션 칸 (일부)
 *   maker → manufacturer(고시 제조자) · asContact → asPhone · asGuide → asGuide(300자 넘으면 안 덮고 안내)
 *   원산지: 상세설명 참조 → 03 · 해외 + 나라 이름 → 04 직접 입력(content = 나라 이름) · 국내는 안 덮음(04에 국내 지역을 넣어도 되는지 문서로 확인 못 함[모름])
 * @returns {{ form:object, notes:string[] }}
 */
export function smartstoreFormFromProduct(data = {}) {
  const form = {}, notes = []
  const s = v => String(v ?? '').trim()
  if (s(data?.maker)) form.manufacturer = s(data.maker)
  if (s(data?.asContact)) form.asPhone = s(data.asContact)
  const guide = s(data?.asGuide)
  if (guide && [...guide].length > AS_GUIDE_MAX) notes.push(AS_GUIDE_LONG_NOTE)
  else if (guide) form.asGuide = guide
  const o = data?.origin || {}
  if (o.type === 'refer') { form.originCode = '03'; form.originContent = '' }
  else if (o.type === 'overseas' && s(o.place)) { form.originCode = '04'; form.originContent = s(o.place) }
  return { form, notes }
}
/**
 * 배송 템플릿 data → 섹션 칸 (일부) — 무료 FREE · 고정 PAID + baseFee · 조건부 무료 CONDITIONAL_FREE + baseFee + freeOver · 반품(편도)·교환(왕복) 배송비
 * @returns {{ form:object, notes:string[] }}
 */
export function smartstoreFormFromShipping(data = {}) {
  const form = {}, notes = []
  const won = v => (isWonValue(v) ? v : null)
  if (data?.feeType === 'free') { form.feeType = 'FREE'; form.baseFee = null; form.freeOver = null }
  else if (data?.feeType === 'fixed') { form.feeType = 'PAID'; form.baseFee = won(data.fee); form.freeOver = null }
  else if (data?.feeType === 'conditional') { form.feeType = 'CONDITIONAL_FREE'; form.baseFee = won(data.fee); form.freeOver = won(data.freeOver) }
  if (isWonValue(data?.returnFee)) form.returnFee = data.returnFee
  if (isWonValue(data?.exchangeFee)) form.exchangeFee = data.exchangeFee
  return { form, notes }
}
/** 섹션 칸 → 상품정보 템플릿 data (마켓 공용 값 — [현재 값으로 새 템플릿 저장]). 스마트스토어에 없는 값은 비워 둔다 */
export function productTemplateFromSmartstoreForm(f = {}) {
  const s = v => String(v ?? '').trim()
  return {
    origin: f.originCode === '04' && s(f.originContent) ? { type: 'overseas', place: s(f.originContent) } : f.originCode === '03' ? { type: 'refer', place: '' } : { type: '', place: '' },
    maker: s(f.manufacturer), country: '', brand: '', asContact: s(f.asPhone), asGuide: s(f.asGuide), returnGuide: '',
  }
}
/** 섹션 칸 → 배송 템플릿 data */
export function shippingTemplateFromSmartstoreForm(f = {}) {
  const n = v => (isWonValue(v) ? v : null)
  const feeType = f.feeType === 'FREE' ? 'free' : f.feeType === 'PAID' ? 'fixed' : f.feeType === 'CONDITIONAL_FREE' ? 'conditional' : ''
  return { feeType, fee: feeType === 'fixed' || feeType === 'conditional' ? n(f.baseFee) : null, freeOver: feeType === 'conditional' ? n(f.freeOver) : null, jejuFee: null, islandFee: null, returnFee: n(f.returnFee), exchangeFee: n(f.exchangeFee) }
}
