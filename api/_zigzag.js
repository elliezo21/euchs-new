/**
 * 지그재그(카카오스타일) Open API — 호출·서명·오류 번역 (2026-10-02)
 *
 * [호출 — 문서 "API 호출하기"] POST {KAKAOSTYLE_API_URL} · Content-Type: application/json · 본문 { query, variables }
 *   성공 = data · 실패 = errors 배열({ message }) · 시각은 CrTimestamp(UTC 밀리초)
 *   주소는 환경변수 KAKAOSTYLE_API_URL (기본 = 운영 https://openapi.zigzag.kr/1/graphql · 테스트 https://openapi.alpha.zigzag.kr/1/graphql)
 * [인증 — 문서 "API 인증하기"] Authorization: CEA algorithm=HmacSHA256, access-key=<Access Key>, signed-date=<밀리초>, signature=<서명>
 *   문서 예제(Java·PHP·Python 모두 같음): query의 공백(\s+)을 ' '로 바꾼 뒤 message = signedDate + '.' + query, 서명 = HMAC-SHA1(secretKey, message) hex
 *   (헤더 글자는 HmacSHA256이지만 예제는 SHA1 — 예제를 따른다). 서명한 것과 같은 query(공백 정리한 것)를 본문에 보낸다
 *   권한: GET-PRODUCT 상품조회 · UPDATE-PRODUCT 상품갱신 (키는 쇼핑몰별 발급)
 * [x-solution] 모든 요청 헤더 x-solution = 환경변수 KAKAOSTYLE_X_SOLUTION (카카오스타일 Open API FAQ — 다른 값이면 상품이 전송되지 않음).
 *   입력값의 solution 칸은 스키마에서 deprecated("x-solution 헤더값으로 대체") — 쓰지 않는다
 * [중계] 지그재그 문서에 접속 IP 제한이 없다 → 쿠팡·11번가처럼 고정 IP 중계를 거치지 않고 바로 부른다. 재시도 없음 · 같은 서킷 브레이커(breakerFor)
 * [오류 코드] 문서에 오류 코드 목록이 없다 — 응답 errors[].message 글자로만 나눈다(classifyZigzagError). 맞지 않으면 판매처 원문을 그대로 보인다
 */
import crypto from 'crypto'
import { breakerFor, NOT_READY_MESSAGE } from './_coupang.js'

export const ZIGZAG_API_URL_DEFAULT = 'https://openapi.zigzag.kr/1/graphql'
const TIMEOUT_MS = 25000

export class ZigzagError extends Error {
  constructor(code, message, { status = 0, raw = '' } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.raw = String(raw || '').slice(0, 500)
  }
}

/** 환경변수 → 호출 설정. x-solution이 없으면 null (보내지 않는다 — 다른 값이면 상품이 전송되지 않음) */
export function zigzagConfig(env = process.env) {
  const solution = String(env.KAKAOSTYLE_X_SOLUTION || '').trim()
  const url = String(env.KAKAOSTYLE_API_URL || '').trim() || ZIGZAG_API_URL_DEFAULT
  if (!solution) return null
  return { url, solution }
}

/** 서명 대상 query — 문서 예제: query.replaceAll("\\s+", " ") (앞뒤 공백은 예제에 없어 건드리지 않는다) */
export const normalizeQuery = q => String(q ?? '').replace(/\s+/g, ' ')
/** Authorization 헤더 (문서 예제 그대로) */
export function zigzagAuthorization(accessKey, secretKey, query, signedDate) {
  const date = String(signedDate)
  const signature = crypto.createHmac('sha1', String(secretKey)).update(`${date}.${normalizeQuery(query)}`).digest('hex')
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${date}, signature=${signature}`
}

// ── 오류 ── (문서에 오류 코드가 없다 — 글자로 나누고, 맞지 않으면 원문)
export const ZIGZAG_ERRORS = {
  bad_key: 'Access Key 또는 Secret Key가 맞지 않습니다. 파트너센터 [API 인증키 관리]에서 발급한 키를 다시 확인하세요.',
  no_permission: '인증키 권한이 부족합니다. 파트너센터 [API 인증키 관리]에서 "상품조회"와 "상품갱신" 권한을 선택해 다시 발급하세요.',
  shop_not_ready: '입점이 끝난 스토어의 인증키인지 확인하세요. 입점이 완료되지 않은 스토어는 연결할 수 없습니다.',
}
const PERMISSION_RE = /permission|권한|forbidden|not\s*allowed|GET-PRODUCT|UPDATE-PRODUCT|access\s*denied/i
const KEY_RE = /signature|서명|access[-_\s]?key|secret|unauthori[sz]ed|unauthenticated|인증|invalid\s*(api\s*)?key|expired/i
const SHOP_RE = /(shop|store|스토어|입점)[^.]*(not\s*found|없|찾을 수|승인|approv|inactive|closed|중지)|입점/i
/**
 * 판매처 응답 → { code, message } (고객 문구). 순서: 권한 → 키 → 입점. 셋 다 아니면 원문 그대로(market_rejected)
 * @param {number} status HTTP 상태 · @param {string[]} messages errors[].message
 */
export function classifyZigzagError(status, messages = []) {
  const text = (Array.isArray(messages) ? messages : []).filter(Boolean).join(' / ')
  if (status === 0) return { code: 'market_unreachable', message: '판매처가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '판매처 요청이 많아 잠시 멈췄습니다. 잠시 후 다시 시도해 주세요.' }
  if (text && PERMISSION_RE.test(text)) return { code: 'no_permission', message: ZIGZAG_ERRORS.no_permission }
  if (text && KEY_RE.test(text)) return { code: 'bad_key', message: ZIGZAG_ERRORS.bad_key }
  if (text && SHOP_RE.test(text)) return { code: 'shop_not_ready', message: ZIGZAG_ERRORS.shop_not_ready }
  if (!text && (status === 401 || status === 403)) return { code: 'bad_key', message: `${ZIGZAG_ERRORS.bad_key} 권한(상품조회·상품갱신)도 함께 확인하세요.` }
  if (status >= 500 && !text) return { code: 'market_server', message: '판매처가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.' }
  return { code: 'market_rejected', message: text ? `판매처 응답: ${text.slice(0, 500)}` : `판매처 요청이 실패했습니다. (HTTP ${status})` }
}

/**
 * 호출. 성공 = data. 실패 = ZigzagError throw (재시도 없음)
 * @param {{ url, solution, accessKey, secretKey, breakerKey, fetchImpl?, now? }} c
 * @param {{ query:string, variables?:object }} req
 */
export async function zigzagCall(c, { query, variables = {} }) {
  if (!c?.url || !c?.solution) throw new ZigzagError('zigzag_not_ready', NOT_READY_MESSAGE)
  const breaker = breakerFor(`zigzag:${c.breakerKey || ''}`)
  const left = breaker.blockedFor()
  if (left > 0) throw new ZigzagError('breaker_open', `지그재그 오류가 잦아 잠시 멈췄습니다. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)
  const q = normalizeQuery(query)
  const signedDate = String(c.now ? c.now() : Date.now())
  const headers = { 'Content-Type': 'application/json', 'Authorization': zigzagAuthorization(c.accessKey, c.secretKey, q, signedDate), 'x-solution': c.solution }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let r, text
  try {
    r = await (c.fetchImpl || fetch)(c.url, { method: 'POST', headers, body: JSON.stringify({ query: q, variables }), signal: controller.signal })
    text = await r.text()
  } catch (e) {
    breaker.recordError()
    throw new ZigzagError('market_unreachable', '판매처가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.', { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  const messages = Array.isArray(json?.errors) ? json.errors.map(e => (typeof e?.message === 'string' ? e.message : '')).filter(Boolean) : []
  if (!r.ok || messages.length || !json || json.data == null) {
    breaker.recordError()
    const t = classifyZigzagError(r.status, messages.length ? messages : (json ? [] : [String(text || '').slice(0, 200)].filter(Boolean)))
    throw new ZigzagError(t.code, t.message, { status: r.status, raw: messages.length ? messages.join(' / ') : String(text || '') })
  }
  breaker.recordOk()
  return json.data
}

// ── 쿼리 (칸 이름은 docs/vendor/zigzag-openapi.graphql 그대로) ──
export const Q = {
  shop: 'query GetShop { shop { shop_id shop_name allowed_brand_list { brand_id brand_name } site_country_list { site site_name country_code country_name } attribute_list { site country_code key value } } }',
  category: 'query GetCategory { category { id name asset_list { key values } children { id name asset_list { key values } children { id name asset_list { key values } children { id name asset_list { key values } children { id name asset_list { key values } children { id name asset_list { key values } } } } } } } }',
  essentials: 'query GetAllEssentialTemplate { getAllEssentialTemplate { id code name values } }',
  addresses: 'query shop_shipping_address_list($limit_count: Int, $skip_count: Int) { shop_shipping_address_list(limit_count: $limit_count, skip_count: $skip_count) { total_count item_list { id shop_id name postcode address address_detail shipping_company is_default } } }',
  product: 'query GetProduct($id: ID!) { product(id: $id) { id sales_status display_status category { id category_id } option_list { id name value_list { id value } } item_list { id deleted attribute_list { name value } inventory { quantity } } image_list { id image_type origin_url } } }',
  summary: 'query GetProductSummaryList($input: ProductSummaryListInput!) { product_summary_list(input: $input) { item_list { id sales_status display_status } } }',
  create: 'mutation ($input: CreateProductInput!) { createProduct(input: $input) }',
  update: 'mutation ($input: UpdateProductInput!) { updateProduct(input: $input) }',
  stock: 'mutation ($input: [ItemAvailableStockQuantityInput!]!) { updateItemAvailableStockQuantity(input: $input) }',
}
export const ADDRESS_PAGE = 50 // 문서: 최대 50
export const ADDRESS_PAGES_MAX = 4

/** 스토어 응답 → 화면 값 { shopId, shopName, brands, zigzagKr } — 판매 채널에 ZIGZAG·KR이 있어야 보낼 수 있다 */
export function normalizeShop(shop) {
  if (!shop || !shop.shop_id) return null
  const sites = Array.isArray(shop.site_country_list) ? shop.site_country_list : []
  return {
    shopId: String(shop.shop_id), shopName: String(shop.shop_name || ''),
    brands: (Array.isArray(shop.allowed_brand_list) ? shop.allowed_brand_list : []).filter(b => b?.brand_id != null).map(b => ({ id: String(b.brand_id), name: String(b.brand_name || '') })),
    zigzagKr: sites.some(s => s?.site === 'ZIGZAG' && s?.country_code === 'KR'),
    overseasAgency: (Array.isArray(shop.attribute_list) ? shop.attribute_list : []).some(a => a?.key === 'OVERSEAS_PURCHASING_AGENCY' && a?.value === 'TRUE'),
  }
}
/** 배송주소록 → [{ id, name, address, isDefault }] */
export const normalizeZigzagAddresses = list => (Array.isArray(list) ? list : []).filter(a => /^\d{1,20}$/.test(String(a?.id ?? '')))
  .map(a => ({ id: String(a.id), name: String(a.name || ''), address: [a.address, a.address_detail].filter(Boolean).join(' '), isDefault: a.is_default === true }))
