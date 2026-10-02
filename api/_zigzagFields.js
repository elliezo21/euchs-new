/**
 * 지그재그(카카오스타일) 상품 보내기 — 화면(StudioSendZigzag.vue)과 서버(api/_zigzag.js · api/marketplace.js)가 같이 쓰는 규칙 (순수 — import 없음)
 *
 * 근거 (2026-10-02 열람 — 원문은 docs/vendor/)
 *   스키마  docs/vendor/zigzag-openapi.graphql (https://zigzag.kr/_openapi/openapi.graphql) — 필수값 = "!" (카카오스타일 Open API FAQ)
 *   문서    https://zigzag.kr/_openapi/docs/ — 상품(api-product)·상품 생성(product/product-creation)·상품 갱신(product/product-update)·
 *           카테고리(api-category)·스토어(api-shop)·API 호출하기(request)·API 인증하기(authorization) — 본문은 docs/vendor/zigzag-docs/*.txt
 *
 * CreateProductInput 필수(!) 칸과 우리가 채우는 값
 *   name                 상품명 (화면)
 *   description          상세 이미지 HTML (문서 "상품의 상세정보 (description)은 10글자 이상") — 판매용 공개 창고 영구 주소 <img>
 *   essential_code       카테고리 asset essential_codes 중 하나 (문서 상품 생성) — 화면에서 고른다
 *   sales_status         ON_SALE (스토어배송 예제) · 품목은 재고 0이면 SOLD_OUT (문서 "재고가 0인 경우 → 판매중(ON_SALE) 상태로 변경 불가")
 *   display_status       VISIBLE|HIDDEN — 화면에서 고른다(기본 HIDDEN: 스마트스토어 기본 전시중지와 같은 이유 — 확인 전 바로 노출되지 않게)
 *   option_list          옵션 종류(name) + 값(value_list) — 우리 옵션 편집기(_marketOptions.optionsPayload)의 groupNames·values
 *   item_list            옵션 조합 = 구매 단위(attribute_list name/value · inventory.quantity · site_list original_price) — 최대 200개(문서)
 *   image_list           MAIN 1장 = 대표 이미지(origin_url 공개 주소 — ProductImageInput origin_url: String!, 지그재그가 image_url(CDN)로 받는다)
 *   category             { category_id } — Query.category 최하위
 *   site_list            [{ site, country, original_price(시중판매가), shipping_fee }] — 스토어 판매 채널(Query.shop site_country_list)에 ZIGZAG·KR이 있을 때만
 *   item site_list       [{ site, country, original_price(품목 판매가 = 판매가 + 옵션 추가금액) }] — 문서 "item_list.site_list는 필수"
 * 선택 칸 중 넣는 것: fulfillment_type MERCHANT(스토어배송) · shipping_days(문서 "MERCHANT 발송소요일 필수", 일반배송 1~7일) · shipping_type GENERAL ·
 *   address.return_id(반송지 — shop_shipping_address_list) · bundle_type · tax_type · parallel_imported · brand_id(선택) · trait_list(해외구매대행) ·
 *   external_code(솔루션사 관리코드 = 내 상품 id — 생성만, 갱신 입력에는 칸이 없다) · auditor(셀러의 솔루션사 로그인 아이디 — 카카오스타일 Open API FAQ)
 */

export const ZIGZAG = 'zigzag'
export const ZIGZAG_SITE = 'ZIGZAG'
export const ZIGZAG_COUNTRY = 'KR'
export const DESCRIPTION_MIN = 10 // 문서: 상세정보는 10글자 이상
export const ITEM_MAX = 200 // 문서: item_list 최대 200개
export const SHIPPING_DAYS_MIN = 1
export const SHIPPING_DAYS_MAX = 7 // 문서: 일반배송(GENERAL) 1~7일
export const FEE_TYPES = [{ code: 'FREE', name: '무료' }, { code: 'CHARGED', name: '고정 배송비' }, { code: 'CONDITIONAL_FREE', name: '조건부 무료' }]
// 부분 반품 배송비 (2026-10-02) — 스키마 CatalogProductShippingReturnFeeInput { total: Int!, partial: Int } · 문서(api-product) "partial - 무료배송으로 구매한 상품 중 일부만 반품할 때 구매자가 부담해야 하는 반품비용"
//   운영 실측(2026-10-02 지그재그 알파 가게): 무료배송에 partial이 없으면 "무료배송은 부분반품비가 필수 입력되어야 합니다." 로 거절
//   조건부 무료도 조건을 채우면 무료배송 구매가 되므로 같이 보낸다(문서 설명 기준) · 고정 배송비는 보내지 않는다(예전 그대로)
export const needsPartialReturn = feeType => feeType === 'FREE' || feeType === 'CONDITIONAL_FREE'
export const DISPLAY_STATUSES = [{ code: 'HIDDEN', name: '숨김' }, { code: 'VISIBLE', name: '노출' }]
export const BUNDLE_TYPES = [{ code: 'CONSOLIDATED', name: '묶음배송 가능' }, { code: 'SEPARATED', name: '묶음배송 불가' }]
export const TAX_TYPES = [{ code: 'TAX', name: '과세' }, { code: 'FREE', name: '면세' }]
export const PARALLEL_TYPES = [{ code: 'NOT_PARALLEL_IMPORTED', name: '병행수입 아님' }, { code: 'PARALLEL_IMPORTED', name: '병행수입' }]
export const OVERSEAS_TRAIT = 'OVERSEAS_PURCHASE_AGENCY' // 문서 ProductTrait: 해외구매대행
export const ESSENTIAL_DEFAULT = '상품 상세페이지 참조' // 문서 예제(디지털 상품 고시 값)와 같은 글자
export const ESSENTIAL_COUNTRY_KEY = 'country_of_manufacturer'
export const ESSENTIAL_COUNTRY_DEFAULT = '중국' // 다른 판매처와 같은 기본(1688 상품) — 판매자가 바꾼다
export const SALES_LABEL = { PREPARING: '준비중', ON_SALE: '판매중', SOLD_OUT: '품절', SUSPENDED: '판매중단', CLOSED: '삭제' } // 문서 ProductSalesStatus 설명
export const DISPLAY_LABEL = { VISIBLE: '노출', HIDDEN: '숨김' }

const clean = s => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const isWon = (n, min = 0) => Number.isInteger(n) && n >= min && n <= 999999999
const kstDay = (d = new Date()) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10)

// ── 연결 ──
/** 키 입력 검사 — Access Key·Secret Key (공백 없는 영문·숫자·기호 8~200자) */
export function zigzagKeyProblems({ accessKey = '', secretKey = '' } = {}) {
  const out = []
  if (!/^[\x21-\x7e]{8,200}$/.test(String(accessKey || '').trim())) out.push('Access Key')
  if (!/^[\x21-\x7e]{8,200}$/.test(String(secretKey || '').trim())) out.push('Secret Key')
  return out
}

// ── 카테고리 ──
const assetOf = (c, key) => (Array.isArray(c?.asset_list) ? c.asset_list : []).find(a => a?.key === key) || null
const listOf = a => (Array.isArray(a?.values?.values) ? a.values.values : null)
/**
 * Query.category 트리 → 최하위 [{ id, name, wholeName, essentialCodes }] (전체 이름 순)
 * essential_codes·applicable_types = 그 카테고리 asset, 없으면 위 카테고리에서 물려받는다(문서 size_category 상속 규칙과 같은 방식으로 본다)
 * 등록형 스토어배송(entry_type DIRECT · fulfillment_type MERCHANT)을 받지 않는다고 적힌 카테고리는 뺀다 — 적힌 것이 없으면 뺄 근거가 없어 둔다
 */
export function normalizeZigzagCategories(root) {
  const out = []
  const walk = (c, names, inherited) => {
    if (!c) return
    const codes = listOf(assetOf(c, 'essential_codes')) || inherited.codes
    const types = listOf(assetOf(c, 'applicable_types')) || inherited.types
    const kids = Array.isArray(c.children) ? c.children : []
    const here = names.concat(clean(c.name))
    if (!kids.length) {
      const direct = !types || types.some(t => t?.entry_type === 'DIRECT' && t?.fulfillment_type === 'MERCHANT')
      if (/^\d{1,20}$/.test(String(c.id ?? '')) && direct) out.push({ id: String(c.id), name: clean(c.name), wholeName: here.join('>'), essentialCodes: (codes || []).map(String) })
      return
    }
    for (const k of kids) walk(k, here, { codes, types })
  }
  // 맨 위(root_category)는 이름에 넣지 않는다
  for (const k of Array.isArray(root?.children) ? root.children : []) walk(k, [], { codes: listOf(assetOf(root, 'essential_codes')), types: listOf(assetOf(root, 'applicable_types')) })
  return out.sort((a, b) => a.wholeName.localeCompare(b.wholeName, 'ko'))
}

// ── 상품정보제공고시 ──
/** getAllEssentialTemplate → [{ code, name, fields:[{ key, name, type, preset, shopInfo }] }] (values.values — 문서 응답 예제 모양) */
export function normalizeEssentialTemplates(list) {
  return (Array.isArray(list) ? list : []).map(t => ({
    code: String(t?.code ?? ''), name: clean(t?.name),
    fields: (listOf(t) || []).filter(f => typeof f?.key === 'string' && f.key && typeof f?.name === 'string')
      .map(f => ({ key: f.key, name: clean(f.name), type: f.type === 'date' ? 'date' : 'text', preset: typeof f.value === 'string' ? f.value : null, shopInfo: f.enable_shop_info === true })),
  })).filter(t => t.code && t.fields.length)
}
/**
 * 고시 처음 값 — 제조국 = 중국(다른 판매처와 같은 기본) · 날짜 칸 = 오늘(문서 "제조년월 등록이 어려우신 경우, 등록일자로 저장") · 나머지 "상품 상세페이지 참조"
 * 템플릿 기본값(preset — 예: 제조국 "한국", 수입자 "수입아님")은 1688 수입 상품과 맞지 않을 수 있어 처음 값으로 쓰지 않는다(화면에 참고로 보인다)
 */
export function essentialDefaults(fields, now = new Date()) {
  return Object.fromEntries((Array.isArray(fields) ? fields : []).map(f => [f.key, f.key === ESSENTIAL_COUNTRY_KEY ? ESSENTIAL_COUNTRY_DEFAULT : f.type === 'date' ? kstDay(now) : ESSENTIAL_DEFAULT]))
}

// ── 옵션 → option_list · item_list ──
/**
 * 우리 옵션(_marketOptions.optionsPayload { groupNames, rows:[{ values, addPrice, stock }] }) 또는 단일 상품(stock) → 지그재그 옵션·품목
 * 품목 가격 = 판매가 + 추가금액(1원 이상) · 재고 0 = 품절(SOLD_OUT) · 같은 조합 두 번 = 거절
 * 단일 상품: option_list [] + 품목 1개(attribute_list []) — 스키마상 빈 배열이 허용되지만(! 는 배열 자체) 지그재그가 받는지는 문서에 없다 → 보고서 "Slack 문의 필요"
 * @returns {{ ok:true, optionList, itemList, stockTotal } | { ok:false, message }}
 */
export function zigzagOptionRows(options, price, stock) {
  if (!isWon(price, 1)) return { ok: false, message: '판매가를 입력하세요.' }
  const site = op => [{ site: ZIGZAG_SITE, country: ZIGZAG_COUNTRY, original_price: op }]
  if (options == null) {
    if (!Number.isInteger(stock) || stock < 0 || stock > 99999999) return { ok: false, message: '재고 수량을 입력하세요.' }
    return { ok: true, optionList: [], itemList: [{ sales_status: stock > 0 ? 'ON_SALE' : 'SOLD_OUT', attribute_list: [], inventory: { quantity: stock }, site_list: site(price) }], stockTotal: stock }
  }
  const names = (Array.isArray(options.groupNames) ? options.groupNames : []).map(clean)
  const rows = Array.isArray(options.rows) ? options.rows : []
  if (!names.length || !rows.length) return { ok: false, message: '판매할 옵션을 1개 이상 선택하세요.' }
  if (names.some(n => !n)) return { ok: false, message: '옵션 종류 이름(예: 색상)을 입력하세요.' }
  if (new Set(names).size !== names.length) return { ok: false, message: '옵션 종류 이름이 겹칩니다. 서로 다른 이름으로 입력하세요.' }
  if (rows.length > ITEM_MAX) return { ok: false, message: `지그재그 옵션 조합은 ${ITEM_MAX}개까지 등록할 수 있습니다. (지금 ${rows.length}개)` }
  const values = names.map(() => [])
  const seen = new Set()
  const itemList = []
  for (const r of rows) {
    const vals = (Array.isArray(r?.values) ? r.values : []).map(clean)
    if (vals.length !== names.length || vals.some(v => !v)) return { ok: false, message: '옵션 값을 모두 입력하세요.' }
    const key = vals.join('\u0001')
    if (seen.has(key)) return { ok: false, message: `같은 옵션 조합이 두 번 있습니다: ${vals.join(' / ')}` }
    seen.add(key)
    if (!Number.isInteger(r.addPrice) || !isWon(price + r.addPrice, 1)) return { ok: false, message: `옵션 "${vals.join(' / ')}"의 추가금액을 확인하세요. (판매가 + 추가금액이 1원 이상)` }
    if (!Number.isInteger(r.stock) || r.stock < 0 || r.stock > 99999999) return { ok: false, message: `옵션 "${vals.join(' / ')}"의 재고 수량을 입력하세요.` }
    vals.forEach((v, i) => { if (!values[i].includes(v)) values[i].push(v) })
    itemList.push({ sales_status: r.stock > 0 ? 'ON_SALE' : 'SOLD_OUT', attribute_list: names.map((n, i) => ({ name: n, value: vals[i] })), inventory: { quantity: r.stock }, site_list: site(price + r.addPrice) })
  }
  return { ok: true, optionList: names.map((n, i) => ({ name: n, value_list: values[i].map(v => ({ value: v })) })), itemList, stockTotal: itemList.reduce((s, it) => s + it.inventory.quantity, 0) }
}

// ── 상세 HTML ──
const escAttr = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** 상세설명 HTML — 이미지만 위에서 아래로 (문서 예제 모양 <html><div><img …></div>…</html>) */
export const zigzagDescription = (urls, name) => `<html>${(Array.isArray(urls) ? urls : []).filter(Boolean).map((u, i) => `<div><img src="${escAttr(u)}" alt="${escAttr(name || '상품')} 상세 ${i + 1}" /></div>`).join('')}</html>`

// ── 상품 입력 ──
/**
 * CreateProductInput (갱신은 mergeZigzagUpdate가 id를 붙인다). 화면 값만 — 금액은 바꾸지 않는다(반올림·임의 숫자 없음)
 * @param {{ productName, price, listPrice?, stock?, options?, categoryId, essentialCode, essentials:{ [key]: value }, essentialFields:[{ key, name }],
 *           display, delivery:{ feeType, baseFee?, freeOver?, jejuFee, isolatedFee, returnFee, partialReturnFee?(무료·조건부 무료 필수), exchangeFee, shippingDays, bundle, returnId },
 *           taxType, parallel, overseas?, brandId?, repUrl, detailUrls, exportId?, auditor? }} p
 * @returns {{ ok:true, input, summary } | { ok:false, message }}
 */
export function buildZigzagProduct(p) {
  const name = clean(p?.productName)
  if (!name) return { ok: false, message: '상품명을 입력하세요.' }
  if (!/^\d{1,20}$/.test(String(p?.categoryId ?? ''))) return { ok: false, message: '카테고리를 선택하세요.' }
  if (!isWon(p?.price, 1)) return { ok: false, message: '판매가를 입력하세요.' }
  const listPrice = p?.listPrice == null || p.listPrice === '' ? p.price : p.listPrice
  if (!isWon(listPrice, 1)) return { ok: false, message: '시중판매가를 확인하세요.' }
  const opt = zigzagOptionRows(p?.options ?? null, p.price, p?.stock)
  if (!opt.ok) return { ok: false, message: opt.message }
  const code = String(p?.essentialCode ?? '')
  const fields = Array.isArray(p?.essentialFields) ? p.essentialFields : []
  if (!code || !fields.length) return { ok: false, message: '상품정보제공고시 종류를 선택하세요.' }
  const essentials = fields.map(f => ({ key: f.key, name: clean(f.name), value: clean(p?.essentials?.[f.key]) }))
  const emptyEss = essentials.find(e => !e.value)
  if (emptyEss) return { ok: false, message: `상품정보제공고시 "${emptyEss.name}" 값을 입력하세요.` }
  if (!DISPLAY_STATUSES.some(s => s.code === p?.display)) return { ok: false, message: '노출 상태를 선택하세요.' }
  const d = p?.delivery || {}
  if (!FEE_TYPES.some(t => t.code === d.feeType)) return { ok: false, message: '배송비 종류를 선택하세요.' }
  const baseFee = d.feeType === 'FREE' ? 0 : d.baseFee // 문서: 무료배송인 경우 base_fee 0
  if (!isWon(baseFee, d.feeType === 'FREE' ? 0 : 1)) return { ok: false, message: '기본 배송비를 입력하세요.' }
  if (d.feeType === 'CONDITIONAL_FREE' && !isWon(d.freeOver, 1)) return { ok: false, message: '무료배송 조건 금액을 입력하세요.' }
  if (!isWon(d.jejuFee) || !isWon(d.isolatedFee)) return { ok: false, message: '제주·도서산간 추가 배송비를 입력하세요.' }
  if (!isWon(d.returnFee) || !isWon(d.exchangeFee)) return { ok: false, message: '반품·교환 배송비를 입력하세요.' }
  const partial = needsPartialReturn(d.feeType)
  if (partial && !isWon(d.partialReturnFee)) return { ok: false, message: '부분 반품 배송비를 입력하세요.' }
  if (!Number.isInteger(d.shippingDays) || d.shippingDays < SHIPPING_DAYS_MIN || d.shippingDays > SHIPPING_DAYS_MAX) return { ok: false, message: `발송소요일은 ${SHIPPING_DAYS_MIN}~${SHIPPING_DAYS_MAX}일 중에서 입력하세요.` }
  if (!BUNDLE_TYPES.some(b => b.code === d.bundle)) return { ok: false, message: '묶음배송 여부를 선택하세요.' }
  if (!/^\d{1,20}$/.test(String(d.returnId ?? ''))) return { ok: false, message: '반송지를 선택하세요.' }
  if (!TAX_TYPES.some(t => t.code === p?.taxType)) return { ok: false, message: '과세 여부를 선택하세요.' }
  if (!PARALLEL_TYPES.some(t => t.code === p?.parallel)) return { ok: false, message: '병행수입 여부를 선택하세요.' }
  if (typeof p?.repUrl !== 'string' || !p.repUrl) return { ok: false, message: '대표 이미지를 준비하지 못했습니다.' }
  if (!Array.isArray(p?.detailUrls) || !p.detailUrls.length) return { ok: false, message: '상세 이미지를 준비하지 못했습니다.' }
  const description = zigzagDescription(p.detailUrls, name)
  if (description.length < DESCRIPTION_MIN) return { ok: false, message: '상세 이미지를 준비하지 못했습니다.' }
  const brandId = p?.brandId == null || p.brandId === '' ? null : String(p.brandId)
  const input = {
    name, description, fulfillment_type: 'MERCHANT', essential_code: code, essentials,
    sales_status: 'ON_SALE', display_status: p.display, option_list: opt.optionList, item_list: opt.itemList,
    image_list: [{ image_type: 'MAIN', origin_url: p.repUrl }], category: { category_id: String(p.categoryId) },
    site_list: [{
      site: ZIGZAG_SITE, country: ZIGZAG_COUNTRY, original_price: listPrice,
      shipping_fee: {
        fee_type: d.feeType, base_fee: baseFee, area_fee: { jeju: d.jejuFee, isolated: d.isolatedFee },
        ...(d.feeType === 'CONDITIONAL_FREE' ? { conditional_amount: d.freeOver } : {}), // 문서: 조건부 무료배송이 아닌 경우는 비워 두세요
        return_fee: { total: d.returnFee, ...(partial ? { partial: d.partialReturnFee } : {}) }, exchange_fee: d.exchangeFee,
      },
    }],
    ...(brandId ? { brand_id: brandId } : {}),
    parallel_imported: p.parallel, shipping_days: d.shippingDays, shipping_type: 'GENERAL', address: { return_id: String(d.returnId) },
    bundle_type: d.bundle, tax_type: p.taxType, ...(p.overseas === true ? { trait_list: [{ trait_type: OVERSEAS_TRAIT }] } : {}),
    ...(p.exportId ? { external_code: String(p.exportId) } : {}),
    ...(typeof p.auditor === 'string' && p.auditor ? { auditor: p.auditor } : {}),
  }
  const summary = { name, price: p.price, listPrice, stock: opt.stockTotal, items: opt.itemList.length, categoryId: String(p.categoryId), essentialCode: code, display: p.display, feeType: d.feeType, returnId: String(d.returnId) }
  return { ok: true, input, summary }
}

// ── 다시 보내기 = 갱신 ──
const itemKey = attrs => (Array.isArray(attrs) ? attrs : []).map(a => `${clean(a?.name)}=${clean(a?.value)}`).sort().join('\u0001')
/**
 * 갱신 입력 = 생성 입력 + 조회한 상품(Query.product)의 id. 문서(상품 갱신): "id가 존재하는 경우 해당 데이터는 갱신 … id가 주어지지 않으면 값이 일치하더라도 새로 생성"
 * → 옵션은 이름으로, 옵션 값은 값으로, 품목은 속성 조합으로, 대표 이미지는 MAIN 첫째, 카테고리는 상품 카테고리 id를 짝지어 넣는다
 * external_code는 갱신 입력(UpdateProductInput)에 칸이 없어 뺀다. 검색어·사이즈 정보는 보내지 않는다(문서: null이면 기존 값 유지)
 * @returns {{ input, itemIds:[{ key, id|null }] }}
 */
export function mergeZigzagUpdate(cur, input) {
  const { external_code, ...rest } = input || {}
  const out = JSON.parse(JSON.stringify(rest))
  out.id = String(cur?.id ?? '')
  const curOpts = Array.isArray(cur?.option_list) ? cur.option_list : []
  out.option_list = out.option_list.map(o => {
    const co = curOpts.find(c => clean(c?.name) === o.name)
    if (!co) return o
    const cv = Array.isArray(co.value_list) ? co.value_list : []
    return { id: String(co.id), ...o, value_list: o.value_list.map(v => { const hit = cv.find(x => clean(x?.value) === v.value); return hit ? { id: String(hit.id), ...v } : v }) }
  })
  const curItems = (Array.isArray(cur?.item_list) ? cur.item_list : []).filter(it => it && it.deleted !== true)
  const used = new Set()
  out.item_list = out.item_list.map(it => {
    const hit = curItems.find(c => !used.has(c.id) && itemKey(c.attribute_list) === itemKey(it.attribute_list))
    if (!hit) return it
    used.add(hit.id)
    return { id: String(hit.id), ...it }
  })
  const mainImg = (Array.isArray(cur?.image_list) ? cur.image_list : []).find(im => im?.image_type === 'MAIN')
  if (mainImg?.id != null) out.image_list = out.image_list.map((im, i) => (i === 0 ? { id: String(mainImg.id), ...im } : im))
  if (cur?.category?.id != null) out.category = { id: String(cur.category.id), category_id: out.category.category_id }
  return { input: out, itemIds: out.item_list.map(it => ({ key: itemKey(it.attribute_list), id: it.id ?? null })) }
}
/**
 * 내용 서명 — 재고만 바뀌었는지 보는 비교용 글자. 재고(inventory)·품목 판매 상태(재고 0 ↔ 품절)·이미지 주소(보낼 때마다 공개 창고 폴더가 바뀜)·
 * 상세 HTML·수정자를 뺀 생성 입력 + 이미지 원본 표식(sources — 대표 이미지 해시·상세 파일 경로)
 */
export function zigzagContentKey(input, sources = {}) {
  const b = JSON.parse(JSON.stringify(input || {}))
  for (const k of ['description', 'auditor', 'image_list']) delete b[k]
  b.item_list = (Array.isArray(b.item_list) ? b.item_list : []).map(({ inventory, sales_status, ...it }) => it)
  return JSON.stringify({ b, s: sources })
}
/**
 * 재고만 바꿀 수 있는지 — 내용 서명이 지난번과 같고 모든 품목에 조회한 id가 있을 때 → updateItemAvailableStockQuantity (문서: 아이템 재고 갱신)
 * @returns {null | [{ product_id, item_id, quantity }]}  바뀐 재고만 (빈 배열 = 바뀐 것 없음)
 */
export function zigzagStockChanges({ sameContent, productId, merged, cur }) {
  if (!sameContent) return null
  const items = Array.isArray(merged?.item_list) ? merged.item_list : []
  if (!items.length || items.some(it => it.id == null)) return null
  const now = new Map((Array.isArray(cur?.item_list) ? cur.item_list : []).map(it => [String(it.id), it?.inventory?.quantity]))
  // 재고가 0을 넘나들면(품절 ↔ 판매중) 품목 판매 상태도 바뀌어야 한다 — 재고 API가 상태를 같이 바꾸는지 문서에 없어 상품 갱신으로 보낸다
  if (items.some(it => { const b = now.get(String(it.id)); return Number.isInteger(b) && (b === 0) !== (it.inventory.quantity === 0) })) return null
  return items.filter(it => now.get(String(it.id)) !== it.inventory.quantity).map(it => ({ product_id: String(productId), item_id: String(it.id), quantity: it.inventory.quantity }))
}

// ── 상태 ──
/**
 * sales_status·display_status → 우리 기록 { status, raw }. CLOSED(문서 "삭제") = 삭제됨, 그 밖의 문서 값 = 등록 완료(원문에 판매·노출 상태). 모르는 값 = null
 */
export function zigzagStatusOf(sales, display) {
  const s = String(sales || '')
  if (!(s in SALES_LABEL)) return null
  if (s === 'CLOSED') return { status: 'deleted', raw: SALES_LABEL.CLOSED }
  const d = DISPLAY_LABEL[String(display || '')]
  return { status: 'registered', raw: d ? `${SALES_LABEL[s]} · ${d}` : SALES_LABEL[s] }
}
/** 상태 확인 — product_summary_list 한 번에 최대 100개(문서) */
export const SUMMARY_MAX = 100
/** 요약 목록에 없는 상품을 한 번 요청에서 하나씩 조회하는 최대 수 (Query.product — 없으면 null) */
export const ZIGZAG_SINGLE_MAX = 10
