/**
 * 네이버 커머스API(스마트스토어) — 전자서명·중계 호출·오류 번역 (2026-09-30 연결 · 2026-10-01 상품 보내기)
 * 11번가(api/_elevenst.js)·쿠팡과 같은 방식: 고정 IP 중계 {MARKETPLACE_RELAY_URL}/smartstore{path} + 헤더 x-relay-secret · 재시도 없음 · 같은 서킷 브레이커(breakerFor)
 *
 * [인증 토큰 — 확인한 곳]
 *   POST https://api.commerce.naver.com/external/v1/oauth2/token  (호스트·경로: 공식 저장소 github.com/commerce-api-naver/commerce-api 토론 #1915·#611)
 *   본문 application/x-www-form-urlencoded 만 (2025-02부터 — 공식 공지 #1729)
 *   client_id · timestamp(밀리초 13자리, 호출 시각 기준 5분 안 — 공식 답변 #357) · client_secret_sign · grant_type=client_credentials · type=SELF
 *   type=SELF: "내 스토어 애플리케이션"은 SELF만, account_id 없음 (공식 답변 #780)
 *   허용 안 된 IP = HTTP 403 GW.IP_NOT_ALLOWED "호출이 허용되지 않은 IP입니다." (공식 답변 #2291)
 * [전자서명 — 확인함 2026-10-01] password = client_id + "_" + timestamp → bcrypt(password, salt = client_secret) → base64
 *   공식 문서 apicenter.commerce.naver.com/docs/auth "전자서명 생성 방법" (Java 예시는 URL-safe base64 — 우리는 표준 base64를 form-urlencoded로 보낸다. 2026-10-01 운영 연결 성공)
 *   토큰 요청 본문 칸 = 공식 문서 /docs/commerce-api/current/exchange-sellers-auth (client_id·timestamp·grant_type=client_credentials·client_secret_sign·type, application/x-www-form-urlencoded)
 * [연결 확인] 토큰이 발급되면 애플리케이션 ID·시크릿·호출 IP가 맞는 것으로 본다 — 따로 가벼운 조회 API를 부르지 않는다
 *   (토큰 발급에도 IP 제한이 걸리는지는 확인 필요 — 안 걸리면 IP 문제는 첫 보내기 때 드러난다)
 */
import bcrypt from 'bcryptjs'
import { breakerFor, NOT_READY_MESSAGE, RELAY_IP } from './_coupang.js'
import { DISPLAY_STATUSES, SS_DELIVERY_COMPANIES, ORIGIN_CODES } from './_smartstoreFields.js'

export const SMARTSTORE_PATHS = { token: '/external/v1/oauth2/token' }
const RELAY_TIMEOUT_MS = 25000

export class SmartstoreError extends Error {
  constructor(code, message, { status = 0, raw = '' } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.raw = String(raw || '').slice(0, 300)
  }
}

/** 시크릿이 bcrypt salt 모양인지 ($2a$·$2b$·$2y$ + 비용 2자리 + $ + 22자) — 아니면 네이버를 부르지 않고 알린다 */
export const isBcryptSalt = s => /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{22}/.test(String(s || ''))

/**
 * client_secret_sign = base64( bcrypt(client_id + "_" + timestamp, salt = client_secret) )  [확인 필요 — 위 주석]
 * @param {string} clientId @param {string} clientSecret @param {number} timestamp 밀리초
 */
export function smartstoreSign(clientId, clientSecret, timestamp) {
  const hashed = bcrypt.hashSync(`${clientId}_${timestamp}`, clientSecret)
  return Buffer.from(hashed, 'utf8').toString('base64')
}

/**
 * 네이버 응답 → 오류 (null = 성공). 오류 본문은 JSON { code, message } 모양 [확인 필요 — GW.IP_NOT_ALLOWED 외 코드]
 */
export function translateSmartstore(status, text = '') {
  const t = String(text || '')
  if (status === 0) return { code: 'relay_unreachable', message: NOT_READY_MESSAGE }
  if (status === 401 && /relay/i.test(t)) return { code: 'relay_denied', message: NOT_READY_MESSAGE }
  if (/IP_NOT_ALLOWED|허용되지 않은 IP/i.test(t)) return { code: 'ip_not_allowed', message: `커머스API센터의 애플리케이션에 API 호출 IP ${RELAY_IP}가 등록됐는지 확인해 주세요.` }
  if (/timestamp/i.test(t)) return { code: 'market_rejected', message: '네이버가 요청 시각을 받지 않았어요. 잠시 후 다시 시도해 주세요.' }
  if (status === 401 || status === 403 || /invalid_client|client_secret|client_id|GW\.AUTHN|인증/i.test(t)) return { code: 'bad_key', message: '애플리케이션 ID·시크릿이 맞지 않아요. 커머스API센터에서 다시 복사해 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '네이버 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 500) return { code: 'market_server', message: '네이버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 400) return { code: 'market_rejected', message: `네이버가 요청을 거절했어요 (HTTP ${status}).` }
  return null
}

/**
 * 인증 토큰 발급 (중계 경유) — 성공 = { access_token, expires_in }. 실패 = SmartstoreError throw (재시도 없음)
 * 토큰은 연결 확인에만 쓰고 저장하지 않는다
 * @param {{ relayUrl, relaySecret, clientId, clientSecret, breakerKey, now?, fetchImpl? }} c
 */
export async function smartstoreToken(c) {
  if (!c.relayUrl || !c.relaySecret) throw new SmartstoreError('relay_not_configured', NOT_READY_MESSAGE)
  if (!isBcryptSalt(c.clientSecret)) throw new SmartstoreError('bad_key', '애플리케이션 시크릿 모양이 맞지 않아요. 커머스API센터에서 시크릿을 그대로 복사해 주세요.')
  const breaker = breakerFor(`smartstore:${c.breakerKey || ''}`)
  const left = breaker.blockedFor()
  if (left > 0) throw new SmartstoreError('breaker_open', `네이버 오류가 잦아 잠시 멈췄어요. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)
  const timestamp = (c.now || Date.now)()
  const form = new URLSearchParams({
    client_id: c.clientId, timestamp: String(timestamp), client_secret_sign: smartstoreSign(c.clientId, c.clientSecret, timestamp),
    grant_type: 'client_credentials', type: 'SELF',
  })
  const url = `${c.relayUrl.replace(/\/$/, '')}/smartstore${SMARTSTORE_PATHS.token}`
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'x-relay-secret': c.relaySecret }
  const fetchImpl = c.fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS)
  let r, text
  try {
    r = await fetchImpl(url, { method: 'POST', headers, body: form.toString(), signal: controller.signal })
    text = await r.text()
  } catch (e) {
    breaker.recordError()
    throw new SmartstoreError('relay_unreachable', NOT_READY_MESSAGE, { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  const scrub = s => String(s || '').replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"[가림]"').replace(/[0-9a-f]{24,}/gi, '[hex]')
  const tr = translateSmartstore(r.status, text)
  if (tr) {
    breaker.recordError()
    throw new SmartstoreError(tr.code, tr.message, { status: r.status, raw: scrub(text) })
  }
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* 아래에서 모양 검사 */ }
  if (!json || typeof json.access_token !== 'string' || !json.access_token) {
    breaker.recordError()
    throw new SmartstoreError('market_bad_json', '네이버 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.', { status: r.status, raw: scrub(text) })
  }
  breaker.recordOk()
  return { access_token: json.access_token, expires_in: json.expires_in }
}

// ─────────────────────────────────────────────────────────────────────────────
// 상품 보내기 (2026-10-01) — 확인한 곳: 공식 문서 apicenter.commerce.naver.com/docs/commerce-api/current (Docusaurus 페이지에 든 OpenAPI 원문)
//   토큰           POST /external/v1/oauth2/token             (위 smartstoreToken 그대로 — 보낼 때마다 새로 받고 저장하지 않는다. 남은 시간 30분 이상이면 네이버가 같은 토큰을 돌려준다 — o-auth-2-0)
//   이미지 업로드  POST /external/v1/product-images/upload     multipart/form-data, 칸 이름 imageFiles(같은 이름 반복), 한 번에 10장, JPG·GIF·PNG·BMP (upload-product)
//                  응답 { images:[{ url }] }. 합계 10MB 미만·Content-Type = 실제 형식·스토어당 한 번에 한 요청 (공식 토론 #117 — 메인테이너 답)
//   상품 등록      POST /external/v2/products                 { originProduct, smartstoreChannelProduct } → { originProductNo, smartstoreChannelProductNo } (create-product-product)
//                  대표 이미지 URL은 반드시 이미지 업로드 API가 돌려준 URL (같은 문서 images 설명 · 공식 토론 #1964)
//                  statusType: "상품 등록 시에는 SALE(판매 중)만 입력할 수 있으며 … SUSPENSION(판매 중지)을 입력하면 SALE로 등록됩니다" → 등록 때 판매중지는 불가. 숨기기는 전시 상태(SUSPENSION)로만
//                  channelProductDisplayStatusType: "ON, SUSPENSION만 입력 가능"
//   카테고리       GET  /external/v1/categories?last=true     [{ wholeCategoryName, id, name, last }] (get-category-list-product — last = 리프만. 등록에는 leafCategoryId)
//   주소록         GET  /external/v1/seller/addressbooks-for-page?page=N  { addressBooks:[{ addressBookNo, name, addressType, … }], page, totalPage } 페이지당 100개 (get-page-addresses-sellers)
//   택배사 코드    발송 처리 API의 deliveryCompanyCode 표 (seller-dispatch-product-orders-pay-order-seller) — 화면에는 큰 5곳만
// [모름 — 넣지 않음] 상세설명(detailContent)에 외부 이미지 주소를 써도 되는지 문서에 없다. 네이버가 detailContent 이미지 주소를 검사한다(공식 토론 #1882 "InvalidImageUrl")
//   → 상세 이미지도 이미지 업로드 API로 올린 네이버 주소만 쓴다 (우리 토큰 주소 ?t= 안 씀)
// [모름 — 넣지 않음] 상품정보제공고시의 반품비용·청약철회 등 5칸(returnCostReason 등)은 문서에 required 표시가 있지만 "미입력 시 상품상세 참조로 입력됩니다"라 보내지 않는다 — 운영 첫 등록에서 확인
// [모름] 원산지 코드 02(수입산)는 상세 지역 코드(원산지 코드 조회 API)가 필요한지 문서로 확정 못 함 → 화면은 03(상세설명에 표시)·04(직접 입력)만
const API_TIMEOUT_MS = 30000 // 중계가 30초에서 끊는다 (api/_coupang.js 중계 주석 — 본문 5MB·30초, content-type·authorization·accept만 넘김)
export const SS_PATHS = {
  imageUpload: '/external/v1/product-images/upload',
  products: '/external/v2/products',
  categories: '/external/v1/categories',
  addressBooks: '/external/v1/seller/addressbooks-for-page',
}
export const UPLOAD_FILES_MAX = 10 // 한 번에 올리는 장 수 (문서)
// 한 요청 본문 상한 — 중계 서버 본문 제한 5MB(그리고 네이버 합계 10MB 미만) 안쪽에 multipart 머리 여유를 둔다
export const UPLOAD_BODY_MAX = 4500000
export const UPLOAD_IMAGE_MAX = UPLOAD_BODY_MAX - 2000 // 한 장 상한 — 넘으면 JPG 품질을 낮춘다(_coupangImage.shrinkBytes)
export const DETAIL_IMAGE_MAX = 30 // 상세 이미지 장 수 (함수 시간 60초 안에서 — 내 상품 파일은 보통 10장 안쪽)
export const SALE_PRICE_MAX = 999999990 // 문서 max
export const STOCK_MAX = 99999999 // 문서 max
export const BASE_FEE_MAX = 100000 // 기본 배송비 문서 max
export const CLAIM_FEE_MAX = 1000000 // 반품·교환 배송비 문서 max
// 전시 상태·택배사·원산지 코드 = 화면과 같은 파일 (api/_smartstoreFields.js — 순수)
export { DISPLAY_STATUSES, SS_DELIVERY_COMPANIES, ORIGIN_CODES }
const NOTICE_LIMITS = { itemName: 50, modelName: 50, manufacturer: 200, phone: 30 } // 기타 재화 고시 maxLength (문서)

const cleanText = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
export const cleanSsName = s => cleanText(s, 300)
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** 상세설명 HTML — 네이버에 올린 이미지 주소를 위에서 아래로 <img> (alt = 상품명 + 번호). 글자·스크립트 없음 */
export function ssDetailHtml(urls, productName) {
  const list = (Array.isArray(urls) ? urls : []).filter(u => typeof u === 'string' && u)
  const name = escapeHtml(cleanSsName(productName) || '상품')
  return `<div style="text-align:center">${list.map((u, i) => `<img src="${escapeHtml(u)}" alt="${name} 상세 ${i + 1}" style="max-width:100%;height:auto;display:block;margin:0 auto" />`).join('')}</div>`
}

/**
 * 상품 등록 본문 (POST /v2/products). 화면에서 받은 값만 — 모르는 칸은 넣지 않는다
 * @param {{ productName, salePrice, stock, leafCategoryId, repUrl, detailUrls:string[], display,
 *           delivery:{ company, feeType:'FREE'|'PAID', baseFee?, returnFee, exchangeFee, shippingAddressId, returnAddressId },
 *           afterService:{ phone, guide }, origin:{ code:'03'|'04', content? }, notice:{ itemName, modelName, manufacturer } }} p
 * @returns {{ ok:true, body } | { ok:false, message }}
 */
export function buildSmartstoreProduct(p) {
  const name = cleanSsName(p?.productName)
  if (!name) return { ok: false, message: '상품명을 넣어 주세요.' }
  if (!isInt(p?.salePrice, 1, SALE_PRICE_MAX)) return { ok: false, message: '판매가는 1원 이상 정수(원)여야 해요.' }
  if (!isInt(p?.stock, 0, STOCK_MAX)) return { ok: false, message: '재고 수량은 0 이상 정수여야 해요.' }
  const leaf = String(p?.leafCategoryId ?? '')
  if (!/^\d{1,20}$/.test(leaf)) return { ok: false, message: '카테고리를 골라 주세요.' }
  if (typeof p?.repUrl !== 'string' || !p.repUrl) return { ok: false, message: '대표 이미지를 올리지 못했어요.' }
  if (!Array.isArray(p?.detailUrls) || !p.detailUrls.length) return { ok: false, message: '상세 이미지를 올리지 못했어요.' }
  if (!DISPLAY_STATUSES.includes(p?.display)) return { ok: false, message: '전시 상태 값이 올바르지 않아요.' }
  const d = p?.delivery || {}
  if (!SS_DELIVERY_COMPANIES.some(c => c.code === d.company)) return { ok: false, message: '택배사를 골라 주세요.' }
  if (d.feeType !== 'FREE' && d.feeType !== 'PAID') return { ok: false, message: '배송비 종류를 골라 주세요.' }
  if (d.feeType === 'PAID' && !isInt(d.baseFee, 1, BASE_FEE_MAX)) return { ok: false, message: `기본 배송비는 1~${BASE_FEE_MAX.toLocaleString('ko-KR')}원 정수여야 해요.` }
  if (!isInt(d.returnFee, 0, CLAIM_FEE_MAX) || !isInt(d.exchangeFee, 0, CLAIM_FEE_MAX)) return { ok: false, message: '반품·교환 배송비를 0 이상 정수(원)로 넣어 주세요.' }
  if (!isInt(d.shippingAddressId, 1, Number.MAX_SAFE_INTEGER) || !isInt(d.returnAddressId, 1, Number.MAX_SAFE_INTEGER)) return { ok: false, message: '출고지·반품지를 골라 주세요.' }
  const as = p?.afterService || {}
  const phone = cleanText(as.phone, NOTICE_LIMITS.phone), guide = cleanText(as.guide, 300)
  if (!phone || !guide) return { ok: false, message: 'A/S 전화번호와 A/S 안내를 넣어 주세요.' }
  const o = p?.origin || {}
  if (!ORIGIN_CODES.includes(o.code)) return { ok: false, message: '원산지 표시 방법을 골라 주세요.' }
  const originContent = cleanText(o.content, 200)
  if (o.code === '04' && !originContent) return { ok: false, message: '원산지를 넣어 주세요.' }
  const n = p?.notice || {}
  const itemName = cleanText(n.itemName, NOTICE_LIMITS.itemName), modelName = cleanText(n.modelName, NOTICE_LIMITS.modelName), manufacturer = cleanText(n.manufacturer, NOTICE_LIMITS.manufacturer)
  if (!itemName || !modelName || !manufacturer) return { ok: false, message: '상품정보제공고시(품명·모델명·제조자)를 넣어 주세요.' }

  const deliveryFee = d.feeType === 'PAID' ? { deliveryFeeType: 'PAID', baseFee: d.baseFee, deliveryFeePayType: 'PREPAID' } : { deliveryFeeType: 'FREE' }
  const body = {
    originProduct: {
      statusType: 'SALE', // 등록 때는 SALE만 (문서) — 고객에게 숨기는 것은 전시 상태로
      leafCategoryId: leaf,
      name,
      detailContent: ssDetailHtml(p.detailUrls, name),
      images: { representativeImage: { url: p.repUrl } },
      salePrice: p.salePrice,
      stockQuantity: p.stock,
      deliveryInfo: {
        deliveryType: 'DELIVERY', deliveryAttributeType: 'NORMAL', deliveryCompany: d.company,
        deliveryFee,
        claimDeliveryInfo: { returnDeliveryFee: d.returnFee, exchangeDeliveryFee: d.exchangeFee, shippingAddressId: d.shippingAddressId, returnAddressId: d.returnAddressId },
      },
      detailAttribute: {
        afterServiceInfo: { afterServiceTelephoneNumber: phone, afterServiceGuideContent: guide },
        originAreaInfo: o.code === '04' ? { originAreaCode: '04', content: originContent } : { originAreaCode: '03' },
        minorPurchasable: true,
        productInfoProvidedNotice: { productInfoProvidedNoticeType: 'ETC', etc: { itemName, modelName, manufacturer, customerServicePhoneNumber: phone } },
      },
    },
    smartstoreChannelProduct: { naverShoppingRegistration: false, channelProductDisplayStatusType: p.display },
  }
  return { ok: true, body }
}

/** 카테고리 응답 → 리프만 [{ id, name, wholeName }] (전체 이름 순) */
export function normalizeSsCategories(json) {
  const list = Array.isArray(json) ? json : []
  return list
    .filter(c => c && c.last === true && /^\d{1,20}$/.test(String(c.id ?? '')))
    .map(c => ({ id: String(c.id), name: String(c.name || ''), wholeName: String(c.wholeCategoryName || c.name || '') }))
    .sort((a, b) => a.wholeName.localeCompare(b.wholeName, 'ko'))
}
/** 주소록 한 페이지 → [{ id, name, type, address, phone }] */
export function normalizeAddressBooks(json) {
  const list = Array.isArray(json?.addressBooks) ? json.addressBooks : []
  return list
    .filter(a => a && Number.isSafeInteger(Number(a.addressBookNo)) && Number(a.addressBookNo) > 0)
    .map(a => ({ id: Number(a.addressBookNo), name: String(a.name || ''), type: String(a.addressType || ''), address: String(a.address || [a.baseAddress, a.detailAddress].filter(Boolean).join(' ')), phone: String(a.phoneNumber1 || '') }))
}
/** 기본으로 고를 주소 — 출고지는 RELEASE, 반품지는 REFUND_OR_EXCHANGE 첫째 (없으면 null — 고객이 고른다) */
export function defaultAddress(list, kind) {
  const want = kind === 'return' ? 'REFUND_OR_EXCHANGE' : 'RELEASE'
  return (Array.isArray(list) ? list : []).find(a => a.type === want)?.id ?? null
}

/** 이미지 업로드 응답 → 주소 배열 (보낸 장 수와 다르면 null) */
export function uploadedImageUrls(json, count) {
  const list = Array.isArray(json?.images) ? json.images : null
  if (!list || list.length !== count) return null
  const urls = list.map(x => (x && typeof x.url === 'string' ? x.url : ''))
  return urls.every(Boolean) ? urls : null
}
/** 상품 등록 응답 원문 → 번호 (int64라 JSON 숫자로 읽지 않고 글자 그대로) */
export function productNosOf(text) {
  const t = String(text || '')
  const pick = k => { const m = new RegExp(`"${k}"\\s*:\\s*"?(\\d{1,20})"?`).exec(t); return m ? m[1] : null }
  return { originProductNo: pick('originProductNo'), channelProductNo: pick('smartstoreChannelProductNo') }
}
/** 실제 이미지 형식 (확장자가 아니라 바이트로 — 공식 토론 #117) */
export function imageMime(buf) {
  if (!buf || buf.length < 4) return null
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif'
  return null
}
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }
/**
 * 올릴 장들을 요청 단위로 묶는다 — 한 요청 = 10장 이하 · 본문 UPLOAD_BODY_MAX 이하 (순서 그대로)
 * @param {number[]} sizes 장마다 바이트 @returns {number[][]} 장 번호 묶음
 */
export function planUploads(sizes, { maxBytes = UPLOAD_BODY_MAX, maxCount = UPLOAD_FILES_MAX, overhead = 300 } = {}) {
  const groups = []
  let cur = [], bytes = 0
  sizes.forEach((s, i) => {
    const add = s + overhead
    if (cur.length && (cur.length >= maxCount || bytes + add > maxBytes)) { groups.push(cur); cur = []; bytes = 0 }
    cur.push(i)
    bytes += add
  })
  if (cur.length) groups.push(cur)
  return groups
}
/** multipart/form-data 본문 (칸 이름 imageFiles 반복 · 장마다 실제 형식 Content-Type · 파일 이름 확장자 = 실제 형식) */
export function buildImageMultipart(images, boundary = `----euchs${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`) {
  const chunks = []
  images.forEach((im, i) => {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="imageFiles"; filename="${String(i + 1).padStart(2, '0')}.${EXT[im.mime] || 'jpg'}"\r\nContent-Type: ${im.mime}\r\n\r\n`, 'utf8'), im.buf, Buffer.from('\r\n', 'utf8'))
  })
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'))
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` }
}

/** 상품·주소록·카테고리 API 오류 → 고객 문구 (null = 성공). 네이버 문구(message·invalidInputs)는 그대로 붙인다 */
export function translateSmartstoreApi(status, text = '') {
  const t = String(text || '')
  if (status === 0) return { code: 'relay_unreachable', message: NOT_READY_MESSAGE }
  if (status === 401 && /relay/i.test(t)) return { code: 'relay_denied', message: NOT_READY_MESSAGE }
  if (/IP_NOT_ALLOWED|허용되지 않은 IP/i.test(t)) return { code: 'ip_not_allowed', message: `커머스API센터의 애플리케이션에 API 호출 IP ${RELAY_IP}가 등록됐는지 확인해 주세요.` }
  if (status < 400) return null
  let j = null
  try { j = JSON.parse(t) } catch { /* JSON 아님 — 아래 기본 문구 */ }
  const detail = [typeof j?.message === 'string' ? j.message : '', ...(Array.isArray(j?.invalidInputs) ? j.invalidInputs.map(x => [x?.name, x?.message].filter(Boolean).join(': ')) : [])].filter(Boolean).join(' / ').slice(0, 500)
  if (status === 401) return { code: 'token_invalid', message: '스마트스토어 인증에 실패했어요. [연결] 탭에서 다시 연결해 주세요.' }
  if (status === 403) return { code: 'scope_denied', message: detail ? `네이버가 요청을 거절했어요: ${detail}` : '커머스API센터 애플리케이션의 API 그룹(상품/N배송·판매자정보)을 확인해 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '네이버 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 500) return { code: 'market_server', message: '네이버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  return { code: 'market_rejected', message: detail ? `네이버가 요청을 거절했어요: ${detail}` : `네이버가 요청을 거절했어요 (HTTP ${status}).` }
}

/**
 * 커머스API 한 번 (중계 경유 · 재시도 없음). 성공 = { json, text }. 실패 = SmartstoreError throw
 * @param {{ relayUrl, relaySecret, accessToken, breakerKey, fetchImpl? }} c
 * @param {{ method, path, query?, json?, multipart?:{ body:Buffer, contentType }, timeoutMs? }} req
 */
export async function smartstoreApi(c, { method, path, query = '', json, multipart, timeoutMs = API_TIMEOUT_MS }) {
  if (!c.relayUrl || !c.relaySecret) throw new SmartstoreError('relay_not_configured', NOT_READY_MESSAGE)
  const breaker = breakerFor(`smartstore:${c.breakerKey || ''}`)
  const left = breaker.blockedFor()
  if (left > 0) throw new SmartstoreError('breaker_open', `네이버 오류가 잦아 잠시 멈췄어요. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)
  const url = `${c.relayUrl.replace(/\/$/, '')}/smartstore${path}${query ? `?${query}` : ''}`
  const headers = { 'Authorization': `Bearer ${c.accessToken}`, 'Accept': 'application/json', 'x-relay-secret': c.relaySecret }
  let body
  if (multipart) { headers['Content-Type'] = multipart.contentType; body = multipart.body }
  else if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json) }
  const fetchImpl = c.fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let r, text
  try {
    r = await fetchImpl(url, { method, headers, body, signal: controller.signal })
    text = await r.text()
  } catch (e) {
    breaker.recordError()
    throw new SmartstoreError('relay_unreachable', NOT_READY_MESSAGE, { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  const tr = translateSmartstoreApi(r.status, text)
  if (tr) {
    breaker.recordError()
    throw new SmartstoreError(tr.code, tr.message, { status: r.status, raw: String(text || '').slice(0, 300) })
  }
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch {
    breaker.recordError()
    throw new SmartstoreError('market_bad_json', '네이버 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.', { status: r.status, raw: String(text || '').slice(0, 300) })
  }
  breaker.recordOk()
  return { json: parsed, text }
}
