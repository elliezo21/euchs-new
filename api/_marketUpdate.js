/**
 * 다시 보내기 = 판매처에 있는 상품 수정 (2026-10-02, 순수 — 서버 api/marketplace.js와 화면 src/lib/studioMarketplaceRules.js·studioSentList.js가 같이 쓴다)
 * 규칙: 내 상품 1개 = 판매처마다 상품 1개. 같은 내 상품(export_id)·같은 판매처·같은 계정(market_account)으로 "살아 있는 상품"이 있으면
 *       새로 등록하지 않고 그 상품을 수정한다. 여러 개(예전 중복)면 가장 최근 것을 수정하고 나머지 수는 화면 칩 안내로만. 삭제됨·실패뿐이면 새로 등록.
 *
 * [판매처별 수정 방식 — 공식 문서]
 *   쿠팡       상품 수정(승인필요) PUT /v2/providers/seller_api/apis/api/v1/marketplace/seller-products (developers.coupang.com/ko/api/products/modify-product, 2026-10-02 확인)
 *                "옵션 수정 : 수정하고 싶은 옵션의 아이템 상단에 [sellerProductItemId]와 [vendorItemId] 삽입" — 빠지면 새 옵션 · "이미 승인완료된 이력이 있는 옵션은 삭제 불가"
 *                requested "true : 저장 및 자동으로 판매 승인 요청"
 *                salePrice "상품 수정 API를 통한 판매가격 수정은 상품 승인 요청 전에만 가능 / 승인완료 이후 판매가격 수정은 [상품 아이템별 가격 변경] API를 통해 변경 가능"
 *                maximumBuyCount "…판매수량 수정은 상품 승인 요청 전에만 가능 / 승인완료 이후 재고 수정은 [상품 아이템별 수량 변경] API를 통해 변경 가능"
 *                originalPrice "승인완료 이후 할인율기준가 수정은 [상품 아이템별 할인율 기준가격 변경] API를 통해 변경 가능"
 *              → 승인 완료 상품의 가격·재고는 상품 수정으로 바뀌지 않는다. 옵션별 API(승인 없음)로 바꾼다:
 *                PUT …/vendor-items/{vendorItemId}/prices/{price} (changing-price-of-each-item-of-a-product — 10원 단위, 기본 50% 인하·100% 인상 한도)
 *                PUT …/vendor-items/{vendorItemId}/quantities/{quantity} (changing-quantity-of-each-product-item)
 *                PUT …/vendor-items/{vendorItemId}/original-prices/{originalPrice} (change-the-base-price-for-discount-rate-at-an-item-level — 10원 단위)
 *              등록상품 조회 GET …/seller-products/{id} (querying-product): 응답 data.vendorId("업체코드") · items[].sellerProductItemId·vendorItemId·salePrice·originalPrice·maximumBuyCount
 *                오류 원문 "업체[A00123456]는 다른 업체[A0011***5]의 상품을 조회할 수 없습니다." · "상품(123456789)의 데이터가 없습니다."
 *                · "상품 정보가 등록 또는 수정되고 있습니다. 잠시 후 다시 조회해 주시기 바랍니다."
 *   스마트스토어 (v2) 원상품 수정 PUT /external/v2/products/origin-products/{originProductNo}
 *              (apicenter.commerce.naver.com/docs/commerce-api/current/update-origin-product-product — 페이지 OpenAPI 원문, 2026-10-02 확인)
 *                본문 = 등록과 같은 { originProduct, smartstoreChannelProduct } 구조 — 칸마다 "미입력 시 false/0으로 저장" → 전체 덮어쓰기.
 *                그래서 (v2) 원상품 조회 GET …/origin-products/{no} 응답을 바탕으로 우리가 바꾸는 칸만 덮어 보낸다 (mergeSmartstoreUpdate)
 *                optionCombinations[].id "옵션 ID를 입력한 경우, 옵션 ID의 옵션 정보를 수정합니다. 옵션 ID를 입력하지 않은 경우, 옵션값의 옵션 정보를 수정합니다
 *                  (해당 옵션값이 존재하지 않으면 옵션 신규 등록)" → 조회한 id를 옵션값으로 짝지어 넣는다
 *                statusType "상품 수정 시에는 SALE(판매 중), SUSPENSION(판매 중지)만 입력할 수 있습니다 … 품절 상태의 상품을 판매 중으로 변경하는 경우,
 *                  StockQuantity(재고 수량)와 함께 statusType을 SALE(판매 중)로 입력해야 합니다."
 *                channelProductDisplayStatusType "ON, SUSPENSION만 입력 가능합니다." · 응답 { originProductNo, smartstoreChannelProductNo }
 *   11번가     상품수정 PUT http://api.11st.co.kr/rest/prodservices/product/{prdNo} · 헤더 openapikey · 본문 = 등록과 같은 Product XML 전체(EUC-KR)
 *              (11번가 OPEN API 개발가이드 — 해성 계정으로 채팅 Claude가 2026-10-02 열람)
 *                "기존 데이터는 사라지고 수정되는 정보로 교체" = 전체 덮어쓰기 → 등록 XML을 만드는 함수(buildElevenstProduct) 그대로 전체를 보낸다
 *                기본즉시할인 cuponcheck=S(기존값 유지)는 수정 때만 — 넣는다(우리가 할인 칸을 다루지 않으므로 판매자의 즉시할인을 지우지 않게)
 *                출고지·반품지 주소코드(addrSeqOut·addrSeqIn)를 빼면 수정 시점 기본주소로 바뀜 → 늘 넣는다(등록 XML에 이미 있음)
 *                판매가 수정은 최대 50% 인상·80% 인하 · 옵션가는 판매가의 +100%/−50%, 0원 옵션 1개 이상 (옵션 규칙은 _marketOptions.elevenstOptionProblems가 등록 때부터 검사)
 *              주인 확인 = 판매자 상품코드 조회(GET …/prodmarketservice/sellerprodcode/{sellerPrdCd}) 응답에 우리 상품번호가 있으면 이 키(계정)의 상품
 *                (elevenstOwnerOf — 106 판매정상종료·108 판매금지면 살아 있지 않음 → 새로 등록). 코드가 없는 예전 기록은 조회할 열쇠가 없어
 *                확인 없이 수정을 시도한다(11번가가 키로 주인을 확인해 거절하면 그 문구 그대로) — 수정 XML에 코드를 넣으므로 그다음부터는 조회된다
 *   지그재그   updateProduct(input: UpdateProductInput!) — 문서(상품 갱신): 생성과 같은 입력 + id, "id가 주어지지 않으면 값이 일치하더라도 새로 생성"
 *              → 상품 조회(product)로 옵션·옵션 값·품목·대표 이미지·카테고리 id를 읽어 짝지어 넣는다(api/_zigzagFields.js mergeZigzagUpdate)
 *              재고만 바뀌면 updateItemAvailableStockQuantity(문서: 아이템 재고 갱신) · 주인 = 이 스토어 키로 product가 조회되는지(없으면 null)
 */

/** 살아 있는 상품 = 등록 완료·승인 완료·승인 대기 (삭제됨·판매 종료·실패·반려·전송 중은 아님) */
export const LIVE_SEND_STATUSES = ['registered', 'approved', 'approval_pending']
/** 판매처별 다시 보내기 방법 — 'modify' = 판매처에 있는 상품을 수정 · 'manual' = 수정 API 근거 없음(판매처에서 직접 수정, 보내기 막음 — 지금은 쓰는 판매처 없음). 없으면 예전처럼 새로 등록 */
export const UPDATE_MODES = { coupang: 'modify', smartstore: 'modify', '11st': 'modify', zigzag: 'modify' }
/** 수정하면 판매처 승인을 다시 받는 판매처 */
export const REAPPROVAL_MARKETS = ['coupang']

const accountOf = s => (typeof s?.account === 'string' ? s.account.trim() : '')
const timeOf = iso => { const t = new Date(iso).getTime(); return Number.isFinite(t) ? t : 0 }

/**
 * 같은 내 상품·같은 판매처 기록 → 수정 계획
 * @param {[{ id, status, sellerProductId, account, createdAt }]} sends 그 내 상품·그 판매처의 기록
 * @param {string} market @param {string|null} currentAccount 지금 연결된 계정 식별값 (모르면 null)
 * @returns {{ mode:'create'|'modify'|'manual', candidates:[send], target:send|null, extra:number }}
 *   candidates = 살아 있고 다른 계정이 아닌 기록(최근순) — 계정이 같으면 바로, 기록이 없으면(예전 기록) 서버가 판매처 조회로 확인한 뒤 고른다
 *   extra = 고른 것 말고 더 있는 살아 있는 상품 수 (화면 안내 "같은 상품이 판매처에 N개 더 있습니다")
 */
export function updatePlan(sends, market, currentAccount = null) {
  const cur = typeof currentAccount === 'string' ? currentAccount.trim() : ''
  const live = (Array.isArray(sends) ? sends : [])
    .filter(s => s && LIVE_SEND_STATUSES.includes(s.status) && /^\d{1,20}$/.test(String(s.sellerProductId ?? '')))
    .filter(s => !(cur && accountOf(s) && accountOf(s) !== cur)) // 다른 계정으로 보낸 상품은 지금 연결로 수정할 수 없다
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
  const how = UPDATE_MODES[market]
  if (!how || !live.length) return { mode: 'create', candidates: [], target: null, extra: 0 }
  // 같은 계정으로 확인된 기록을 먼저 (계정 기록이 없는 예전 기록은 그다음 — 최근순)
  const ordered = [...live.filter(s => cur && accountOf(s) === cur), ...live.filter(s => !(cur && accountOf(s) === cur))]
  return { mode: how, candidates: ordered, target: ordered[0], extra: ordered.length - 1 }
}

/** 판매처 응답으로 본 상품 주인 — 'mine' 지금 연결된 계정의 상품 · 'other' 다른 계정 · 'none' 상품 없음 · 'unknown' 판단 못 함(잠시 뒤 다시) */
export const OWNERS = ['mine', 'other', 'none', 'unknown']
/**
 * 쿠팡 등록상품 조회 결과 → 주인 (querying-product 응답 data.vendorId · 오류 원문 — 위 머리 주석)
 * @param {{ ok:boolean, data?:object, raw?:string }} r  ok = 조회 성공(data = 응답 data) · 실패면 raw = 쿠팡 응답 원문
 */
export function coupangOwnerOf(r, vendorId) {
  const v = String(vendorId || '').trim()
  if (r?.ok) {
    const got = r.data?.vendorId != null ? String(r.data.vendorId).trim() : ''
    if (!got || !v) return 'unknown'
    return got === v ? 'mine' : 'other'
  }
  const raw = String(r?.raw || '')
  if (/다른 업체\S*의 상품을 조회할 수 없습니다/.test(raw)) return 'other'
  if (/의 데이터가 없습니다/.test(raw)) return 'none'
  return 'unknown'
}
/**
 * 스마트스토어 원상품 조회 결과 → 주인. 토큰은 "내 스토어 애플리케이션"(type SELF — 그 스토어만, api/_smartstore.js)이라 조회되면 그 스토어 상품
 * 404 code NOT_FOUND "데이터 없음"(read-origin-product-product)은 지운 상품인지 다른 스토어 상품인지 구분이 안 된다 → 'none'(주인을 정하지 않음)
 */
export function smartstoreOwnerOf(r) {
  if (r?.ok) return r.json?.originProduct ? 'mine' : 'unknown'
  if (r?.status === 404 && /"code"\s*:\s*"NOT_FOUND"/.test(String(r?.raw || ''))) return 'none'
  return 'unknown'
}

/**
 * 11번가 판매자 상품코드 조회 결과 → 주인 (위 머리 주석)
 * @param {{ ok:boolean, products?:{ prdNo, selStatCd }[], code?:string }} r ok = 조회 성공(products = parseSellerCodeProducts 결과)
 * @param {string} prdNo 우리 기록의 상품번호 · @param {string|null} sellerPrdCd 우리 기록의 판매자 상품코드(없으면 예전 기록)
 * @returns {'mine'|'none'|'unknown'|'legacy'}  legacy = 코드 없는 예전 기록(확인 없이 수정 시도) · 'none' = 이 키로 조회되지 않거나 판매 종료(106·108)
 */
export function elevenstOwnerOf(r, prdNo, sellerPrdCd) {
  if (!sellerPrdCd) return 'legacy'
  if (!r?.ok) return 'unknown'
  const hit = (Array.isArray(r.products) ? r.products : []).find(p => String(p?.prdNo) === String(prdNo ?? ''))
  if (!hit) return 'none'
  return ['106', '108'].includes(String(hit.selStatCd ?? '')) ? 'none' : 'mine'
}

// ── 쿠팡 ──
const COUPANG_APPROVED = ['승인완료', '부분승인완료']
export const isCoupangApproved = statusName => COUPANG_APPROVED.includes(String(statusName || ''))
/** 쿠팡 가격 변경 단위 (문서: "최소 10원 단위로 입력 가능합니다. (1원 단위 가격 입력 불가)") */
export const COUPANG_PRICE_UNIT = 10
/**
 * 내용 서명 — 가격·재고·옵션 id·이미지 주소(보낼 때마다 토큰이 바뀜)·판매 시작일을 뺀 상품 수정 본문 + 이미지·서류 원본 표식.
 * 지난번과 같으면 "가격·재고만 바뀜"으로 본다 (승인 완료 상품은 옵션별 API로만 바꾸고 다시 승인을 받지 않는다)
 * @param {object} body 상품 생성/수정 본문 · @param {object} sources 이미지·서류 원본 표식 { rep, options:{}, docs:{}, detail:{} } (해시·경로)
 * @returns {string} 비교용 글자 (해시는 부르는 쪽이 — 순수 함수라 crypto를 쓰지 않는다)
 */
export function coupangContentKey(body, sources = {}) {
  const b = JSON.parse(JSON.stringify(body || {}))
  for (const k of ['saleStartedAt', 'requested', 'sellerProductId']) delete b[k]
  if (Array.isArray(b.requiredDocuments)) b.requiredDocuments = b.requiredDocuments.map(d => d?.templateName || '')
  b.items = (Array.isArray(b.items) ? b.items : []).map(it => {
    const { sellerProductItemId, vendorItemId, salePrice, originalPrice, maximumBuyCount, images, contents, ...rest } = it || {}
    return rest
  })
  return JSON.stringify({ b, s: sources })
}
/**
 * 승인 완료 상품에서 옵션별로 바꿀 가격·재고 (옵션별 API — 다시 승인 없음)
 * @param {object[]} ours 보낼 본문 items (sellerProductItemId·vendorItemId가 붙은 것) · @param {object[]} theirs 쿠팡 등록상품 조회 data.items
 * @returns {[{ vendorItemId, itemName, salePrice?, originalPrice?, stock? }]} 바뀐 칸만. vendorItemId가 없는 옵션(새 옵션·승인 전)은 빠진다
 */
export function coupangPriceStockChanges(ours, theirs) {
  const byItem = new Map((Array.isArray(theirs) ? theirs : []).filter(t => t?.sellerProductItemId != null).map(t => [String(t.sellerProductItemId), t]))
  const out = []
  for (const it of Array.isArray(ours) ? ours : []) {
    if (it?.vendorItemId == null || it?.sellerProductItemId == null) continue
    const t = byItem.get(String(it.sellerProductItemId))
    if (!t) continue
    const c = { vendorItemId: it.vendorItemId, itemName: it.itemName }
    if (Number(t.salePrice) !== Number(it.salePrice)) c.salePrice = it.salePrice
    if (Number(t.originalPrice) !== Number(it.originalPrice)) c.originalPrice = it.originalPrice
    if (Number(t.maximumBuyCount) !== Number(it.maximumBuyCount)) c.stock = it.maximumBuyCount
    if ('salePrice' in c || 'originalPrice' in c || 'stock' in c) { c.before = { salePrice: t.salePrice, originalPrice: t.originalPrice }; out.push(c) }
  }
  return out
}
/** 가격 변경 값 검사 — 10원 단위가 아니면 쿠팡이 거절한다(문서). 문제 문구 또는 '' */
export function coupangPriceProblem(changes) {
  for (const c of Array.isArray(changes) ? changes : []) {
    for (const k of ['salePrice', 'originalPrice']) {
      if (k in c && (!Number.isInteger(c[k]) || c[k] % COUPANG_PRICE_UNIT !== 0)) return `옵션 "${c.itemName}"의 ${k === 'salePrice' ? '판매가' : '정가'}는 ${COUPANG_PRICE_UNIT}원 단위로 입력하세요. (승인 완료된 상품의 가격 변경 규칙)`
    }
  }
  return ''
}
/**
 * 옵션 하나의 가격 변경 순서 — 판매가가 정가보다 커지는 순간이 없게: 정가를 올릴 때는 정가 먼저, 내릴 때는 판매가 먼저
 * @returns {('originalPrice'|'salePrice'|'stock')[]}
 */
export function coupangChangeOrder(c) {
  const keys = []
  const up = 'originalPrice' in c && Number(c.originalPrice) >= Number(c.before?.originalPrice ?? 0)
  if (up) keys.push('originalPrice')
  if ('salePrice' in c) keys.push('salePrice')
  if ('originalPrice' in c && !up) keys.push('originalPrice')
  if ('stock' in c) keys.push('stock')
  return keys
}
/**
 * 쿠팡 수정 방법 — 'modify' = 상품 수정(PUT, 다시 승인 요청) · 'price_stock' = 옵션별 가격·재고 API만(승인 없음) · 'none' = 바뀐 것 없음
 * 승인 완료가 아니면(승인 대기·반려·임시저장) 늘 상품 수정 — 아직 옵션 id(vendorItemId)가 없거나 수정 본문의 가격·재고가 반영된다
 * @param {{ approved:boolean, sameContent:boolean, changes:object[] }} p
 */
export function coupangUpdateWay({ approved, sameContent, changes }) {
  if (!approved || !sameContent) return 'modify'
  return (Array.isArray(changes) && changes.length) ? 'price_stock' : 'none'
}

// ── 스마트스토어 ──
const comboKey = c => [1, 2, 3].map(i => String(c?.[`optionName${i}`] ?? '').trim()).join('\u0001')
/**
 * 원상품 수정 본문 — 조회한 상품(cur) 위에 우리 등록 본문(ours)의 칸만 덮는다. 우리가 다루지 않는 칸(추가 이미지·판매자 코드·태그·혜택 등)은 조회한 값 그대로.
 * 옵션: 우리 옵션을 옵션값(optionName1~3)으로 조회한 옵션과 짝지어 id를 넣는다(짝이 없으면 새 옵션 — 문서). 우리가 옵션을 안 쓰면 옵션 정보를 뺀다
 * 판매 상태: 판매 중지(SUSPENSION)는 그대로, 판매 중·품절은 SALE (문서 — 수정 때는 SALE·SUSPENSION만, 품절 → 판매 중은 재고와 함께 SALE)
 * 전시 상태: 판매처에서 정한 값(ON·SUSPENSION)을 그대로 — 고객이 판매처에서 바꾼 전시를 다시 보내기로 덮지 않는다
 * @returns {{ ok:true, body, display } | { ok:false, code, message }}
 */
export const SS_UPDATABLE_STATUS = ['SALE', 'OUTOFSTOCK', 'SUSPENSION']
export function mergeSmartstoreUpdate(cur, ours) {
  const co = cur?.originProduct
  const no = ours?.originProduct
  if (!co || !no) return { ok: false, code: 'market_bad_json', message: '판매처 상품 정보를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.' }
  if (!SS_UPDATABLE_STATUS.includes(co.statusType)) return { ok: false, code: 'market_state', status: co.statusType, message: '' }
  const o = JSON.parse(JSON.stringify(co))
  o.statusType = co.statusType === 'SUSPENSION' ? 'SUSPENSION' : 'SALE'
  o.leafCategoryId = no.leafCategoryId
  o.name = no.name
  o.detailContent = no.detailContent
  o.images = { ...(o.images || {}), representativeImage: no.images.representativeImage }
  o.salePrice = no.salePrice
  o.stockQuantity = no.stockQuantity
  const nd = no.deliveryInfo || {}
  o.deliveryInfo = {
    ...(o.deliveryInfo || {}),
    deliveryType: nd.deliveryType, deliveryAttributeType: nd.deliveryAttributeType, deliveryCompany: nd.deliveryCompany, deliveryFee: nd.deliveryFee,
    claimDeliveryInfo: { ...(o.deliveryInfo?.claimDeliveryInfo || {}), ...(nd.claimDeliveryInfo || {}) },
  }
  const na = no.detailAttribute || {}
  const da = { ...(o.detailAttribute || {}) }
  da.afterServiceInfo = na.afterServiceInfo
  da.originAreaInfo = na.originAreaInfo
  da.minorPurchasable = na.minorPurchasable
  da.productInfoProvidedNotice = na.productInfoProvidedNotice
  if ('customsTaxType' in na) da.customsTaxType = na.customsTaxType
  if (na.optionInfo) {
    const pool = (Array.isArray(da.optionInfo?.optionCombinations) ? da.optionInfo.optionCombinations : []).filter(c => c && c.id != null)
    const used = new Set()
    const combos = na.optionInfo.optionCombinations.map(c => {
      const hit = pool.find(p => !used.has(p.id) && comboKey(p) === comboKey(c))
      if (!hit) return { ...c }
      used.add(hit.id)
      return { id: hit.id, ...c }
    })
    const { optionSimple, optionStandards, ...restOpt } = da.optionInfo || {} // 단독형·표준형은 조합형과 함께 쓸 수 없다(문서)
    da.optionInfo = { ...restOpt, ...na.optionInfo, optionCombinations: combos }
  } else {
    delete da.optionInfo
  }
  o.detailAttribute = da
  const cs = cur.smartstoreChannelProduct && typeof cur.smartstoreChannelProduct === 'object' ? JSON.parse(JSON.stringify(cur.smartstoreChannelProduct)) : { ...(ours.smartstoreChannelProduct || {}) }
  if (!['ON', 'SUSPENSION'].includes(cs.channelProductDisplayStatusType)) cs.channelProductDisplayStatusType = ours.smartstoreChannelProduct?.channelProductDisplayStatusType
  if (typeof cs.naverShoppingRegistration !== 'boolean') cs.naverShoppingRegistration = ours.smartstoreChannelProduct?.naverShoppingRegistration === true
  const body = { originProduct: o, smartstoreChannelProduct: cs }
  if (cur.windowChannelProduct && typeof cur.windowChannelProduct === 'object') body.windowChannelProduct = cur.windowChannelProduct
  return { ok: true, body, display: cs.channelProductDisplayStatusType, optionIds: optionIdsOf(o) }
}
const optionIdsOf = o => (Array.isArray(o?.detailAttribute?.optionInfo?.optionCombinations) ? o.detailAttribute.optionInfo.optionCombinations.map(c => c.id ?? null) : [])
