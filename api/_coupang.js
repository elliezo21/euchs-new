/**
 * 쿠팡 Open API — 서명·중계 호출·오류 번역·서킷 브레이커·상품 본문 만들기 (파일명이 _로 시작하므로 라우트로 노출되지 않는다)
 * 흐름은 api/marketplace.js. 여기는 순수 함수 위주(테스트 scripts/test-marketplace.mjs).
 *
 * [인증 — developers.coupang.com/hc/en-us/articles/360033461914]
 *   Authorization: CEA algorithm=HmacSHA256, access-key={accessKey}, signed-date={datetime}, signature={hex}
 *   datetime = yyMMdd'T'HHmmss'Z' (UTC) / 서명 문자열 = datetime + method + path + query(물음표 없이) / HMAC-SHA256 hex
 *   path는 쿠팡 원래 path (중계 접두어 "/coupang" 제외)
 * [중계 — 고정 IP 3.39.196.112] {MARKETPLACE_RELAY_URL}/coupang{path}?{query} + 헤더 x-relay-secret. 중계는 authorization·content-type·accept·x-requested-by·x-extended-timeout만 넘긴다. 본문 5MB·30초
 * [요청 제한] 429 = 잠시 후 / 403 "Sorry! Access denied" = IP 10분 차단 → 5초 안 오류 20건이면 10분 멈춤 (developers.coupang.com FAQ 권고)
 */
import crypto from 'crypto'
import {
  SALE_MODES, isSaleMode, OUTBOUND_DAYS_MIN, OUTBOUND_DAYS_MAX, normalizeAdvanced, cleanSearchTags, realCerts, docRequired,
  CERT_NONE, NAME_MAX, ITEMS_MAX, STOCK_MAX, NOTICE_LEN, DOC_MAX, DOC_PATH_MAX,
} from './_coupangFields.js'

export const COUPANG_HOST = 'https://api-gateway.coupang.com'
export const RELAY_IP = '3.39.196.112'
export const RELAY_TIMEOUT_MS = 30000

export const PATHS = {
  outbound: '/v2/providers/marketplace_openapi/apis/api/v2/vendor/shipping-place/outbound',
  returnCenters: vendorId => `/v2/providers/openapi/apis/api/v5/vendors/${vendorId}/returnShippingCenters`,
  predict: '/v2/providers/openapi/apis/api/v1/categorization/predict',
  categoryMeta: code => `/v2/providers/seller_api/apis/api/v1/marketplace/meta/category-related-metas/display-category-codes/${code}`,
  products: '/v2/providers/seller_api/apis/api/v1/marketplace/seller-products',
  product: id => `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${id}`,
  histories: id => `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${id}/histories`,
}

/** yyMMdd'T'HHmmss'Z' (UTC) */
export function signedDate(d = new Date()) {
  const iso = d.toISOString() // 2026-09-28T06:03:12.345Z
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`
}

/** @returns {string} Authorization 헤더 값 */
export function ceaAuthorization({ accessKey, secretKey, method, path, query = '', date = signedDate() }) {
  const message = `${date}${method.toUpperCase()}${path}${query}`
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex')
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${date}, signature=${signature}`
}

// ── 서킷 브레이커 (인스턴스 안 메모리 — 서버리스는 인스턴스마다 따로 센다) ──
export const BREAKER_WINDOW_MS = 5000
export const BREAKER_ERRORS = 20
export const BREAKER_OPEN_MS = 10 * 60 * 1000

export function createBreaker(now = () => Date.now()) {
  const errors = []    // 최근 오류 시각
  let openUntil = 0
  return {
    /** 지금 막혀 있으면 남은 ms, 아니면 0 */
    blockedFor() { const t = now(); return openUntil > t ? openUntil - t : 0 },
    recordError() {
      const t = now()
      errors.push(t)
      while (errors.length && errors[0] < t - BREAKER_WINDOW_MS) errors.shift()
      if (errors.length >= BREAKER_ERRORS) { openUntil = t + BREAKER_OPEN_MS; errors.length = 0 }
    },
    recordOk() { errors.length = 0 },
  }
}
const breakers = new Map() // vendorId → breaker
export function breakerFor(vendorId) {
  if (!breakers.has(vendorId)) breakers.set(vendorId, createBreaker())
  return breakers.get(vendorId)
}

// ── 오류 번역 (쿠팡·중계 원문 → 고객 문구). 키·서명은 절대 안 들어간다 ──
// 우리 쪽 준비 문제(중계·키 설정)는 고객에게 NOT_READY_MESSAGE만 보이고, 원인은 서버 로그에만 남긴다 (code로 구분)
export const NOT_READY_MESSAGE = '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'
export const NOT_READY_CODES = ['relay_not_configured', 'relay_unreachable', 'relay_denied']
export class CoupangError extends Error {
  constructor(code, message, { status = 0, raw = '' } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.raw = String(raw || '').slice(0, 300)
  }
}

/**
 * @param {number} status HTTP 상태 (0 = 네트워크)
 * @param {string} text 응답 본문 원문
 * @returns {{ code, message }}
 */
export function translateCoupangError(status, text = '') {
  const t = String(text || '')
  if (status === 0) return { code: 'relay_unreachable', message: NOT_READY_MESSAGE }
  if (status === 401 && /relay/i.test(t)) return { code: 'relay_denied', message: NOT_READY_MESSAGE }
  if (status === 403 && /Not allowed IP/i.test(t)) return { code: 'ip_not_allowed', message: `쿠팡 Wing에 IP ${RELAY_IP}가 등록됐는지 확인해 주세요. 등록 후 최대 30분 뒤 반영돼요.` }
  if (status === 403 && /Access denied/i.test(t)) return { code: 'access_denied', message: '쿠팡이 잠시 요청을 막았어요(약 10분). 잠시 후 다시 시도해 주세요.' }
  if (status === 401 || (status === 403 && /signature|access[- ]?key|auth/i.test(t))) return { code: 'bad_key', message: 'Access Key·Secret Key가 맞지 않아요. Wing에서 발급한 값을 다시 확인해 주세요.' }
  if (status === 403 && /vendor/i.test(t)) return { code: 'bad_vendor', message: '업체코드가 이 키와 맞지 않아요. Wing의 업체코드를 확인해 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '쿠팡 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }
  if (status === 404) return { code: 'coupang_not_found', message: '쿠팡에서 대상을 찾지 못했어요.' }
  if (status === 400) {
    let msg = ''
    try { msg = JSON.parse(t)?.message || '' } catch { /* JSON 아님 */ }
    return { code: 'coupang_rejected', message: msg ? `쿠팡이 요청을 거절했어요: ${msg.slice(0, 300)}` : '쿠팡이 요청을 거절했어요. 입력값을 확인해 주세요.' }
  }
  if (status >= 500) return { code: 'coupang_server', message: '쿠팡이 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  return { code: 'coupang_error', message: `쿠팡 요청이 실패했어요 (HTTP ${status}).` }
}

/** 로그·기록용 원문 정리 — 키·서명이 섞여 있을 수 없는 응답 본문만 받지만, 만약을 위해 서명 형태의 긴 hex는 가린다 */
export function scrubRaw(text) {
  return String(text || '').replace(/[0-9a-f]{40,}/gi, '[hex]').slice(0, 500)
}

/**
 * 쿠팡 호출 (중계 경유). 성공 = JSON 본문. 실패 = CoupangError throw (재시도 없음 — 문서 권고).
 * @param {{ relayUrl, relaySecret, accessKey, secretKey, vendorId, fetchImpl? }} c
 * @param {{ method, path, query?, body?, extendedTimeout? }} req
 */
export async function coupangCall(c, { method, path, query = '', body, extendedTimeout = false }) {
  if (!c.relayUrl || !c.relaySecret) throw new CoupangError('relay_not_configured', NOT_READY_MESSAGE)
  const breaker = breakerFor(c.vendorId)
  const left = breaker.blockedFor()
  if (left > 0) throw new CoupangError('breaker_open', `쿠팡 오류가 잦아 잠시 멈췄어요. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)

  const url = `${c.relayUrl.replace(/\/$/, '')}/coupang${path}${query ? `?${query}` : ''}`
  const headers = {
    'Authorization': ceaAuthorization({ accessKey: c.accessKey, secretKey: c.secretKey, method, path, query }),
    'Content-Type': 'application/json;charset=UTF-8',
    'Accept': 'application/json',
    'X-Requested-By': c.vendorId,
    'x-relay-secret': c.relaySecret,
  }
  if (extendedTimeout) headers['X-EXTENDED-TIMEOUT'] = '90000'
  const fetchImpl = c.fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS)
  let r, text
  try {
    r = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal })
    text = await r.text()
  } catch (e) {
    breaker.recordError()
    const tr = translateCoupangError(0)
    throw new CoupangError(tr.code, tr.message, { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  if (!r.ok) {
    breaker.recordError()
    const tr = translateCoupangError(r.status, text)
    throw new CoupangError(tr.code, tr.message, { status: r.status, raw: scrubRaw(text) })
  }
  breaker.recordOk()
  let json
  try { json = text ? JSON.parse(text) : null } catch { throw new CoupangError('coupang_bad_json', '쿠팡 응답을 읽지 못했어요.', { status: r.status, raw: scrubRaw(text) }) }
  // 쿠팡은 HTTP 200에 code:'ERROR'로 실패를 주기도 한다
  if (json && typeof json === 'object' && typeof json.code === 'string' && json.code !== 'SUCCESS' && json.code !== '200') {
    breaker.recordError()
    throw new CoupangError('coupang_rejected', `쿠팡이 요청을 거절했어요: ${String(json.message || json.code).slice(0, 300)}`, { status: r.status, raw: scrubRaw(text) })
  }
  return json
}

// ── 출고지·반품지 정리 (비밀 없는 칸만 marketplace_places.address에) ──
function pickAddress(placeAddresses) {
  const a = (Array.isArray(placeAddresses) ? placeAddresses : []).find(x => x && (x.addressType === 'JIBUN' || x.addressType === 'ROADNAME')) || (placeAddresses || [])[0] || {}
  return {
    zip: a.returnZipCode ?? a.zipCode ?? '',
    address: a.returnAddress ?? a.address ?? '',
    addressDetail: a.returnAddressDetail ?? a.addressDetail ?? '',
    contact: a.companyContactNumber ?? '',
  }
}
/** 출고지 응답 content[] → 저장 행 */
export function normalizeOutbound(rows) {
  return (Array.isArray(rows) ? rows : []).filter(r => r && r.outboundShippingPlaceCode != null).map(r => ({
    kind: 'outbound', place_code: String(r.outboundShippingPlaceCode), name: String(r.shippingPlaceName || '출고지').slice(0, 100),
    usable: r.usable !== false, address: pickAddress(r.placeAddresses),
  }))
}
/** 반품지 응답 content[] → 저장 행 */
export function normalizeReturnCenters(rows) {
  return (Array.isArray(rows) ? rows : []).filter(r => r && r.returnCenterCode != null).map(r => ({
    kind: 'return', place_code: String(r.returnCenterCode), name: String(r.shippingPlaceName || '반품지').slice(0, 100),
    usable: r.usable !== false, address: { ...pickAddress(r.placeAddresses), deliverCode: r.deliverCode ?? '', deliverName: r.deliverName ?? '' },
  }))
}

// ── 템플릿 검증 (쿠팡 상품 생성 규칙) ──
export const DELIVERY_CHARGE_TYPES = ['FREE', 'NOT_FREE', 'CHARGE_RECEIVED', 'CONDITIONAL_FREE']
/**
 * @returns {{ ok:true, value } | { ok:false, message }}  value = marketplace_templates 칸 (id·user_id·market 제외)
 */
export function validateTemplate(t, places) {
  const int = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null }
  const name = String(t?.name ?? '').trim()
  if (!name || name.length > 50) return { ok: false, message: '템플릿 이름은 1~50자예요.' }
  const type = String(t?.delivery_charge_type ?? '')
  if (!DELIVERY_CHARGE_TYPES.includes(type)) return { ok: false, message: '배송비 종류를 골라 주세요.' }
  const charge = int(t?.delivery_charge, 0, 1000000), over = int(t?.free_ship_over_amount, 0, 100000000)
  const onReturn = int(t?.delivery_charge_on_return, 0, 1000000), ret = int(t?.return_charge, 0, 1000000), exch = int(t?.exchange_charge ?? 0, 0, 1000000)
  const days = int(t?.outbound_shipping_time_day, 1, 30)
  if (charge === null || over === null || onReturn === null || ret === null || exch === null) return { ok: false, message: '금액은 0 이상의 정수여야 해요.' }
  if (days === null) return { ok: false, message: '출고 소요일은 1~30일이에요.' }
  if (type === 'FREE' && charge !== 0) return { ok: false, message: '무료배송이면 기본 배송비는 0원이어야 해요.' }
  if (type !== 'FREE' && type !== 'CONDITIONAL_FREE' && charge === 0) return { ok: false, message: '유료배송이면 기본 배송비를 넣어 주세요.' }
  if (type === 'CONDITIONAL_FREE') {
    if (over <= 0) return { ok: false, message: '조건부 무료배송 기준 금액을 넣어 주세요.' }
    if (charge === 0) return { ok: false, message: '조건부 무료배송이면 기준 미만일 때의 배송비를 넣어 주세요.' }
  }
  if (over % 100 !== 0) return { ok: false, message: '조건부 무료배송 기준 금액은 100원 단위예요.' }
  if (onReturn > 0 && (ret < onReturn || ret > onReturn * 1.5)) return { ok: false, message: '초도배송비(무료배송 상품 반품 시)는 반품배송비의 100~150%여야 해요.' }
  const company = String(t?.delivery_company_code ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9_]{1,20}$/.test(company)) return { ok: false, message: '택배사 코드를 골라 주세요.' }
  const out = String(t?.outbound_place_code ?? ''), rc = String(t?.return_center_code ?? '')
  const has = (kind, code) => (places || []).some(p => p.kind === kind && p.place_code === code)
  if (!has('outbound', out)) return { ok: false, message: '출고지를 골라 주세요. (연결 상태에서 [출고지·반품지 새로고침])' }
  if (!has('return', rc)) return { ok: false, message: '반품지를 골라 주세요. (연결 상태에서 [출고지·반품지 새로고침])' }
  return {
    ok: true,
    value: {
      name, delivery_charge_type: type, delivery_charge: charge, free_ship_over_amount: type === 'CONDITIONAL_FREE' ? over : 0,
      delivery_charge_on_return: onReturn, return_charge: ret, exchange_charge: exch, outbound_shipping_time_day: days,
      delivery_company_code: company, outbound_place_code: out, return_center_code: rc,
      remote_area_deliverable: t?.remote_area_deliverable !== false, is_default: t?.is_default === true,
    },
  }
}

// ── 쿠팡 택배사 코드 (Wing 코드표 중 자주 쓰는 것 — 화면 선택용) ──
export const DELIVERY_COMPANIES = [
  ['CJGLS', 'CJ대한통운'], ['HANJIN', '한진택배'], ['LOTTE', '롯데택배'], ['LOGEN', '로젠택배'], ['EPOST', '우체국택배'],
  ['KDEXP', '경동택배'], ['DAESIN', '대신택배'], ['ILYANG', '일양로지스'], ['CVSNET', 'GS편의점택배'], ['CUPOST', 'CU편의점택배'],
]

// ── 카테고리 메타 → 필수 항목 ──
/**
 * @returns {{ attributes:[{ name, required, dataType, unit, units, exposed, group }], notices:[{ category, items:[{ name, required }] }], singleItem:boolean,
 *             certifications:[{ type, name, required, recommend, needsCode }], documents:[{ templateName, rule }], offerConditions:string[] }}
 *   group = 택1 묶음 번호('' = 묶음 아님) · documents.rule = MANDATORY | OPTIONAL | MANDATORY_PARALLEL_IMPORTED | MANDATORY_OVERSEAS_PURCHASED
 */
export function summarizeCategoryMeta(meta) {
  const d = meta?.data || meta || {}
  const attributes = (Array.isArray(d.attributes) ? d.attributes : []).map(a => ({
    name: String(a.attributeTypeName || ''), required: a.required === 'MANDATORY', dataType: a.dataType || 'STRING',
    unit: a.basicUnit || '', units: Array.isArray(a.usableUnits) ? a.usableUnits.map(String) : [], exposed: a.exposed === 'EXPOSED',
    group: a.groupNumber == null || String(a.groupNumber) === 'NONE' ? '' : String(a.groupNumber),
  })).filter(a => a.name)
  const notices = (Array.isArray(d.noticeCategories) ? d.noticeCategories : []).map(n => ({
    category: String(n.noticeCategoryName || ''),
    items: (Array.isArray(n.noticeCategoryDetailNames) ? n.noticeCategoryDetailNames : []).map(x => ({ name: String(x.noticeCategoryDetailName || x.name || ''), required: x.required === 'MANDATORY' })),
  })).filter(n => n.category)
  const certifications = (Array.isArray(d.certifications) ? d.certifications : []).map(c => ({
    type: String(c.certificationType || ''), name: String(c.name || ''), required: c.required === 'MANDATORY', recommend: c.required === 'RECOMMEND', needsCode: c.dataType === 'CODE',
  })).filter(c => c.type)
  const documents = (Array.isArray(d.requiredDocumentNames) ? d.requiredDocumentNames : []).map(x => ({ templateName: String(x.templateName || ''), rule: String(x.required || 'OPTIONAL') })).filter(x => x.templateName)
  const offerConditions = (Array.isArray(d.allowedOfferConditions) ? d.allowedOfferConditions : []).map(String)
  return { attributes, notices, singleItem: d.isAllowSingleItem === true, certifications, documents, offerConditions }
}

/**
 * 보내기 전 필수값 검사 — 화면과 서버가 같은 규칙. @returns {string[]} 빠진 것
 * @param {{ attributes?, notices?, noticeCategory?, certifications?:[{ type, code }], documents?:[{ templateName }], saleMode?, parallelImported?, skipAttributes?, skipProduct? }} v
 *   noticeCategory = 고른 고시 분류 이름(없으면 첫 분류) · skipAttributes = 옵션 검사를 건너뜀 · skipProduct = 상품 단위(고시·인증·서류) 검사를 건너뜀
 */
export function missingRequired(summary, { attributes = {}, notices = {}, noticeCategory = '', certifications = [], documents = [], saleMode, parallelImported, skipAttributes = false, skipProduct = false } = {}) {
  const out = []
  const filled = name => !!String(attributes[name] ?? '').trim()
  if (!skipAttributes) {
    const doneGroups = new Set()
    for (const a of summary.attributes) {
      if (!a.required) continue
      if (a.group) { // 택1 묶음 — 묶음 안에서 하나만 채우면 된다
        if (doneGroups.has(a.group)) continue
        doneGroups.add(a.group)
        const members = summary.attributes.filter(x => x.required && x.group === a.group)
        if (!members.some(x => filled(x.name))) out.push(`옵션·속성 "${members.map(x => x.name).join('" 또는 "')}"`)
      } else if (!filled(a.name)) out.push(`옵션·속성 "${a.name}"`)
    }
  }
  if (skipProduct) return out
  if (summary.notices.length) {
    const n = summary.notices.find(x => x.category === noticeCategory) || summary.notices[0] // 화면이 고른 고시 분류 하나 — 그 분류의 필수 항목
    for (const it of n.items) if (it.required && !String(notices[it.name] ?? '').trim()) out.push(`상품고시 "${it.name}"`)
  }
  const certs = Array.isArray(certifications) ? certifications : []
  for (const c of realCerts(summary.certifications || [])) {
    const got = certs.find(x => x && x.type === c.type)
    if (c.required && !got) out.push(`인증정보 "${c.name || c.type}"`)
    else if (got && c.needsCode && !String(got.code ?? '').trim()) out.push(`인증정보 "${c.name || c.type}" 인증번호`)
  }
  const docs = Array.isArray(documents) ? documents : []
  for (const d of summary.documents || []) {
    if (docRequired(d.rule, { saleMode, parallelImported }) && !docs.some(x => x && x.templateName === d.templateName)) out.push(`구비서류 "${d.templateName}"`)
  }
  return out
}

// ── 상품 생성 본문 ──
export const SALE_END = '2099-12-31T23:59:59'
export const MAX_STOCK = STOCK_MAX
export const ATTR_NAME_MAX = 25
export const ATTR_VALUE_MAX = 30
function money(v) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null }

/**
 * @param {object} p  { account:{ vendor_id, seller_login_id }, template, places, categoryCode,
 *                      saleMode(필수 'domestic'|'agent' — 기본값 없음), outboundDays?(비우면 템플릿 값),
 *                      productName(등록상품명), displayName?(노출상품명 — 비우면 등록상품명), generalName?(제품명), brand(필수), manufacture?, modelNo?,
 *                      items:[{ name, originalPrice, salePrice, stock, sku(필수 품번), gtin?(선택), attributes:{}, imageUrl?(옵션 대표 이미지 — 없으면 repImageUrl) }],
 *                      attributeMeta?:[{ name, dataType, unit, exposed }](카테고리 메타 — 단위 붙이기·검색옵션 표시),
 *                      notices:[{ noticeCategoryName, noticeCategoryDetailName, content }], certifications?:[{ type, code }], documents?:[{ templateName, url }],
 *                      advanced?:{ parallelImported, taxType, adultOnly, offerCondition, unionDeliveryType, maxPerPerson, maxPerPersonDays },
 *                      repImageUrl, detailImageUrls:[], searchTags:[], saleStartedAt }
 * @returns {{ ok:true, body } | { ok:false, message }}
 */
export function buildProductBody(p) {
  const name = String(p.productName || '').trim()
  if (!name || name.length > NAME_MAX) return { ok: false, message: `등록상품명은 1~${NAME_MAX}자예요.` }
  const displayName = String(p.displayName || '').trim() || name
  if (displayName.length > NAME_MAX) return { ok: false, message: `노출상품명은 ${NAME_MAX}자까지예요.` }
  const generalName = String(p.generalName || '').trim()
  if (generalName.length > NAME_MAX) return { ok: false, message: `제품명은 ${NAME_MAX}자까지예요.` }
  const modelNo = String(p.modelNo || '').trim()
  if (modelNo.length > 50) return { ok: false, message: '모델번호는 50자까지예요.' }
  // 판매 방식 — 기본값 없음. 고르지 않으면 보내지 않는다 (국내 재고 / 해외구매대행은 통관·배송이 달라 잘못 보내면 안 된다)
  if (!isSaleMode(p.saleMode)) return { ok: false, message: '판매 방식을 골라 주세요. (국내 재고 판매 / 해외구매대행)' }
  const mode = SALE_MODES[p.saleMode]
  const adv = normalizeAdvanced(p.advanced || {})
  if (!adv.ok) return adv
  const A = adv.value
  // 쿠팡 정책(2026-06-01 이후 발급 키): 브랜드·상품식별정보(GTIN 또는 품번)·필수 구매옵션이 비면 노출 제한 (해성 추가 지시 2026-09-28)
  // 필드명은 문서(360033877853) 확인: 상품 레벨 brand·manufacture / items[] externalVendorSku(판매자 상품코드=품번)·barcode·emptyBarcode·emptyBarcodeReason·modelNo
  const brand = String(p.brand || '').trim()
  if (!brand || brand.length > 50) return { ok: false, message: '브랜드를 넣어 주세요. 브랜드가 없으면 자체브랜드명을 넣어요.' }
  if (/[^\p{L}\p{N}]/u.test(brand)) return { ok: false, message: '브랜드는 한글·영어·숫자만, 띄어쓰기·특수문자 없이 넣어 주세요.' }
  if (!/^\d+$/.test(String(p.categoryCode || ''))) return { ok: false, message: '카테고리를 골라 주세요.' }
  const t = p.template
  const rc = (p.places || []).find(x => x.kind === 'return' && x.place_code === t.return_center_code)
  const ob = (p.places || []).find(x => x.kind === 'outbound' && x.place_code === t.outbound_place_code)
  if (!rc || !ob) return { ok: false, message: '템플릿의 출고지·반품지가 지금 목록에 없어요. 템플릿을 다시 저장해 주세요.' }
  if (!rc.address?.zip || !rc.address?.address) return { ok: false, message: '반품지 주소 정보가 비어 있어요. [출고지·반품지 새로고침]을 눌러 주세요.' }
  const items = Array.isArray(p.items) ? p.items : []
  if (!items.length || items.length > ITEMS_MAX) return { ok: false, message: `옵션은 1~${ITEMS_MAX}개예요.` }
  if (!p.repImageUrl) return { ok: false, message: '대표 이미지를 골라 주세요.' }
  const days = p.outboundDays == null || p.outboundDays === '' ? Number(t.outbound_shipping_time_day) : Number(p.outboundDays)
  if (!Number.isInteger(days) || days < OUTBOUND_DAYS_MIN || days > OUTBOUND_DAYS_MAX) return { ok: false, message: `출고 소요일은 ${OUTBOUND_DAYS_MIN}~${OUTBOUND_DAYS_MAX}일이에요.` }
  const imagesFor = rep => {
    const list = [{ imageOrder: 0, imageType: 'REPRESENTATION', vendorPath: rep }]
    ;(p.detailImageUrls || []).slice(0, 9).forEach((u, i) => list.push({ imageOrder: i + 1, imageType: 'DETAIL', vendorPath: u }))
    return list
  }
  const contents = (p.detailImageUrls || []).length
    ? [{ contentsType: 'IMAGE_NO_SPACE', contentDetails: (p.detailImageUrls || []).map(u => ({ content: u, detailType: 'IMAGE' })) }]
    : []
  // 인증 — 고른 것이 없으면 문서 규칙대로 NOT_REQUIRED 한 줄
  const certIn = (Array.isArray(p.certifications) ? p.certifications : []).filter(c => c && c.type && c.type !== CERT_NONE)
  for (const c of certIn) {
    if (!/^[A-Z0-9_]{1,60}$/.test(String(c.type))) return { ok: false, message: '인증정보 종류가 올바르지 않아요.' }
    if (String(c.code ?? '').length > 100) return { ok: false, message: '인증번호는 100자까지예요.' }
  }
  const certifications = certIn.length ? certIn.map(c => ({ certificationType: String(c.type), certificationCode: String(c.code ?? '').trim() })) : [{ certificationType: CERT_NONE, certificationCode: '' }]
  const docsIn = (Array.isArray(p.documents) ? p.documents : []).filter(d => d && d.templateName && d.url)
  if (docsIn.length > DOC_MAX) return { ok: false, message: `구비서류는 ${DOC_MAX}개까지예요.` }
  for (const d of docsIn) if (String(d.url).length > DOC_PATH_MAX) return { ok: false, message: '구비서류 주소가 너무 길어요.' }
  const tags = cleanSearchTags(p.searchTags, { brand }).tags
  const metaOf = n => (Array.isArray(p.attributeMeta) ? p.attributeMeta : []).find(a => a.name === n)
  const seenNames = new Set(), seenCombos = new Set()
  const outItems = []
  for (const it of items) {
    const itemName = String(it.name || '').trim()
    if (!itemName || itemName.length > 150) return { ok: false, message: '옵션 이름은 1~150자예요.' }
    if (seenNames.has(itemName)) return { ok: false, message: `옵션 이름 "${itemName}"이 두 번 있어요. 옵션 이름은 서로 달라야 해요.` }
    seenNames.add(itemName)
    const sale = money(it.salePrice), orig = money(it.originalPrice ?? it.salePrice)
    if (!sale || !orig) return { ok: false, message: `옵션 "${itemName}"의 가격을 넣어 주세요.` }
    if (sale > orig) return { ok: false, message: `옵션 "${itemName}"의 판매가가 정가보다 커요.` }
    const stock = Number(it.stock)
    if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) return { ok: false, message: `옵션 "${itemName}"의 재고는 0~${MAX_STOCK}이에요.` }
    const attrs = []
    for (const [k, v] of Object.entries(it.attributes || {})) {
      let value = String(v ?? '').trim()
      if (!k || !value) continue
      const am = metaOf(k)
      if (am && am.dataType === 'NUMBER' && am.unit && /^\d+(\.\d+)?$/.test(value)) value = `${value}${am.unit}` // 문서: 옵션값은 단위 포함(예: 200ml)
      if (String(k).length > ATTR_NAME_MAX) return { ok: false, message: `옵션 종류 "${k}"는 ${ATTR_NAME_MAX}자까지예요.` }
      if (value.length > ATTR_VALUE_MAX) return { ok: false, message: `옵션 "${itemName}"의 ${k} 값은 ${ATTR_VALUE_MAX}자까지예요.` }
      const a = { attributeTypeName: k, attributeValueName: value }
      if (am && am.exposed === false) a.exposed = 'NONE' // 검색옵션(필터) — 문서: exposed "NONE"
      attrs.push(a)
    }
    if (!attrs.length) return { ok: false, message: `옵션 "${itemName}"의 속성을 하나 이상 넣어 주세요.` }
    const combo = JSON.stringify(attrs.filter(a => a.exposed !== 'NONE').map(a => [a.attributeTypeName, a.attributeValueName]).sort())
    if (items.length > 1 && seenCombos.has(combo)) return { ok: false, message: `옵션 "${itemName}"의 구매옵션 값이 다른 옵션과 같아요. 옵션마다 값이 달라야 해요.` }
    seenCombos.add(combo)
    const sku = String(it.sku || '').trim()
    if (!sku || sku.length > 50) return { ok: false, message: `옵션 "${itemName}"의 품번(판매자 상품코드)을 넣어 주세요.` }
    const gtin = String(it.gtin || '').replace(/\s/g, '')
    if (gtin && !/^\d{8,14}$/.test(gtin)) return { ok: false, message: `옵션 "${itemName}"의 GTIN(바코드)은 숫자 8~14자리예요. 없으면 비워 두세요.` }
    const ident = gtin ? { barcode: gtin, emptyBarcode: false } : { emptyBarcode: true, emptyBarcodeReason: '바코드가 없는 상품(품번으로 식별)' }
    const item = {
      itemName, originalPrice: orig, salePrice: sale, maximumBuyCount: stock, maximumBuyForPerson: A.maxPerPerson, maximumBuyForPersonPeriod: A.maxPerPersonDays,
      externalVendorSku: sku, ...ident,
      outboundShippingTimeDay: days, unitCount: 1, adultOnly: A.adultOnly, taxType: A.taxType,
      parallelImported: A.parallelImported, overseasPurchased: mode.overseasPurchased, pccNeeded: mode.pccNeeded,
      certifications,
      images: imagesFor(it.imageUrl || p.repImageUrl), attributes: attrs, contents,
      notices: (p.notices || []).map(n => ({ noticeCategoryName: n.noticeCategoryName, noticeCategoryDetailName: n.noticeCategoryDetailName, content: String(n.content).slice(0, NOTICE_LEN) })),
      searchTags: tags, offerCondition: A.offerCondition,
    }
    if (modelNo) item.modelNo = modelNo
    outItems.push(item)
  }
  const body = {
    displayCategoryCode: Number(p.categoryCode), sellerProductName: name, vendorId: p.account.vendor_id,
    saleStartedAt: p.saleStartedAt, saleEndedAt: SALE_END, displayProductName: displayName, brand, manufacture: String(p.manufacture || '').trim() || brand,
    deliveryMethod: mode.deliveryMethod, deliveryCompanyCode: t.delivery_company_code, deliveryChargeType: t.delivery_charge_type,
    deliveryCharge: t.delivery_charge, freeShipOverAmount: t.free_ship_over_amount, deliveryChargeOnReturn: t.delivery_charge_on_return,
    remoteAreaDeliverable: t.remote_area_deliverable ? 'Y' : 'N', unionDeliveryType: A.unionDeliveryType,
    returnCenterCode: rc.place_code, returnChargeName: rc.name, companyContactNumber: rc.address.contact || '',
    returnZipCode: rc.address.zip, returnAddress: rc.address.address, returnAddressDetail: rc.address.addressDetail || '',
    returnCharge: t.return_charge, outboundShippingPlaceCode: Number.isNaN(Number(ob.place_code)) ? ob.place_code : Number(ob.place_code),
    vendorUserId: p.account.seller_login_id, requested: true, items: outItems,
  }
  if (generalName) body.generalProductName = generalName
  if (docsIn.length) body.requiredDocuments = docsIn.map(d => ({ templateName: String(d.templateName), vendorDocumentPath: String(d.url) }))
  return { ok: true, body }
}

/** 쿠팡 statusName → 우리 status */
export function mapCoupangStatus(statusName) {
  const s = String(statusName || '')
  if (s === '승인완료' || s === '부분승인완료') return 'approved'
  if (s === '승인반려') return 'rejected'
  if (s === '상품삭제') return 'failed'
  return 'approval_pending' // 심사중·임시저장·승인대기중
}
