/**
 * Vercel Serverless Function: /api/marketplace — 스튜디오 → 판매처(쿠팡) 연동 (2~3단계, 2026-09-28)
 * 파일 하나에 action 여러 개 (함수 개수 절약). 쿠팡 호출은 전부 고정 IP 중계(api/_coupang.js coupangCall)를 거친다.
 *
 * POST (studioGuard 필수 — 스튜디오 자격 없는 사용자 403) { action, ... }
 *   status            → { connected, account?, places, daysLeft, ready:{ enc, relay } }
 *   connect           { seller_login_id, vendor_id, access_key, secret_key, expires_at } → 출고지·반품지 조회로 키 검증 → 암호화 저장 + places 저장
 *   disconnect        → 계정·출고지·템플릿 삭제 (전송 기록은 남긴다)
 *   refresh_places    → 출고지·반품지 다시 조회·저장
 *   templates_list    → { templates, places }
 *   template_save     { template:{ id?, ... } } → 쿠팡 규칙 검증(_coupang.validateTemplate) 후 저장 → { template }
 *   template_delete   { id }
 *   send_prepare      { exportId } → { export:{ id, title, projectTitle, files:[{ key, name, width, height }] }, images:[{ id, url, width, height, sourceUrl }](대표 이미지 후보 = 그 작업의 사진), templates, places,
 *                       source(1688에서 가져온 작업이면 저장해 둔 제목·속성·옵션 줄 + 번역 캐시의 한국어, 아니면 null — 외부 호출 없음), limits }
 *   category_predict  { productName, brand? } → { result, categoryCode, categoryName }
 *   send_prepare      { resendId } → 위와 같음 + resend:{ sendId, sellerProductId, reason, revision, form(보냈던 값), categoryName } — 반려된 전송만 (고쳐서 다시 보내기)
 *   send              { …, resendId } → 새 상품을 만들지 않고 상품 조회(옵션 id) → 상품 수정(PUT seller-products, 같은 sellerProductId, requested true) 한 번. 승인 요청 API는 부르지 않는다. 회차 이력은 request_json.revisions
 *   send              사진: repImageId(작업 사진 id)·fit('contain'|'cover')·optionImages[{ key, imageId }] — 서버가 보내는 순간 Storage 원본을 읽어 정사각형 JPG 1000px로 만든다
 *                     (창을 열 때 준 서명 주소 images[].url은 화면 표시용 — 10분 뒤 만료돼도 보내기와 상관없다). 상세 이미지는 쿠팡이 받을 때 서버가 Storage에서 읽는다
 *   brand_search      { brandName } → { brands:[{ brandId, brandName, uidRequired, uidTypes }] }  (쿠팡 브랜드 검색 — 문서 58230017410841)
 *   category_meta     { categoryCode } → { attributes, notices, singleItem, certifications }
 *   send              { exportId, templateId, categoryCode, saleMode('domestic'|'agent' 필수 — 기본값 없음), outboundDays?,
 *                       productName(등록상품명), displayName?(노출상품명), generalName?(제품명), brand, manufacture?, modelNo?,
 *                       items:[{ name, originalPrice, salePrice, stock, sku, gtin?, attributes:{}, imageKey?('r01'..) }],
 *                       notices:[{ noticeCategoryName, noticeCategoryDetailName, content }], certifications?:[{ type, code }], documents?:[{ templateName, dataBase64 }](PDF·JPG·PNG 3MB),
 *                       advanced?:{ parallelImported, taxType, adultOnly, offerCondition, unionDeliveryType, maxPerPerson, maxPerPersonDays },
 *                       repImage:{ dataBase64 }(정사각형 JPG — 브라우저가 만든다), optionImages?:[{ key:'r01', dataBase64 }](6장까지), searchTags? }
 *                     항목 규칙은 api/_coupangFields.js (화면과 같은 파일)
 *                     → 대표 이미지 검사·저장 → marketplace_sends(sending) → 상품 생성(requested:true) → { sendId, sellerProductId, status }
 *   sends_list        → { sends:[…] }  (2026-10-02 100건 한도 없음 — LIST_PAGE씩 끝까지, 화면에 필요한 칸만 · request_json 원문 없음)
 *   sync              { since? } → 판매처 상태 확인 (판매처 공통 checkMarket — 쿠팡·스마트스토어·11번가, 조회만) → { errors, more, sends(more가 false일 때만) }
 *                       since = 이번 확인을 시작한 시각 — 그 뒤에 확인한 기록은 건너뛴다(나눠 부를 때 다음 묶음으로). 규칙·근거 api/_marketStatus.js
 *   market_status     → { elevenst, smartstore, cafe24: { connected, account } }   (2026-09-30 — 카페24는 refresh 만료 7일 전이면 이때 갱신)
 *   connect_11st      { seller_login_id, api_key } → 중계 경유 출고지 조회로 키 확인(api/_elevenst.js) → 암호화 저장(쿠팡과 같은 표·방식) — 연결까지만
 *   disconnect_11st   → 11번가 계정 삭제
 *   connect_smartstore { client_id, client_secret } → 중계 경유 인증 토큰 발급으로 확인(api/_smartstore.js) → 암호화 저장(11번가와 같은 표·방식) — 보내기는 smartstore_send (2026-10-01)
 *   disconnect_smartstore → 스마트스토어 계정 삭제
 *   cafe24_begin      { mall_id, origin } → { authorizeUrl } (우리 앱 "EUCHS 스튜디오"의 카페24 동의 화면 — api/_cafe24.js, DB 쓰기 없음)
 *   cafe24_launch     { query, origin } → 쇼핑몰 관리자에서 앱을 열었을 때 App URL 쿼리 hmac 확인 → { mallId, authorizeUrl } (틀리면 400 bad_launch)
 *   cafe24_finish     { code, state } → state 확인 → 우리 앱 값으로 토큰 교환 · 권한 확인 → 토큰 암호화 저장(connected)
 *   disconnect_cafe24 → 카페24 계정 삭제
 *   cafe24_categories → { categories:[{ no, depth, parentNo, name, fullName }] }  (고객 쇼핑몰 상품분류 — 2026-09-30 카페24 보내기)
 *   cafe24_send       { exportId, productName, price, categoryNo?, repImageId, fit? } → 토큰 갱신(필요하면) → 이미지 업로드(대표 + 상세) → 상품 등록(진열·판매 안 함) → marketplace_sends(cafe24, registered) → { sendId, productNo, status, adminUrl }
 *   smartstore_categories → { categories:[{ id, name, wholeName }] }  (리프 카테고리 — 2026-10-01 스마트스토어 보내기)
 *   smartstore_addresses  → { addresses:[{ id, name, type, address, phone, overseas }], last:{ shipping, return }, defaults:{ shipping, return } }  (판매자 주소록 · last = 마지막 등록 성공 때 주소)
 *   elevenst_categories → { categories:[{ id, name, wholeName }] } (최하위만 — 11번가 공개 조회)
 *   elevenst_addresses  → { outAddresses, inAddresses:[{ id, name, address, phone }], last:{ out, in }, defaults:{ out, in } } (판매자 주소록 — 읽기만)
 *   elevenst_send       { exportId, productName, brand?, categoryId, categoryName?, price, stock, repImageId, fit?, vat, minorOk?, origin, kc, kcCerts?, delivery(feeType 01·02·03 조건부 무료 + freeOver), asDetail, rtngExchDetail, notice(+ items), testStop?(관리자만) } → { sendId, productNo, status:'registered', stopped }
 *   smartstore_send   { exportId, productName, salePrice, stock, leafCategoryId, categoryName?, repImageId, fit?, display?('SUSPENSION' 기본|'ON'), delivery(+ shippingOverseas), afterService, origin, notice, customsTaxType?(해외 출고지면 필수) }
 *                     → 토큰 → marketplace_sends(smartstore, sending) → 이미지 업로드(대표 + 상세, 네이버 주소) → 상품 등록 → registered(원상품번호·채널상품번호) → { sendId, originProductNo, channelProductNo, status }
 *   다시 보내기 = 판매처에 있는 상품 수정 (2026-10-02 — 규칙·근거 api/_marketUpdate.js): send·smartstore_send·elevenst_send는 같은 내 상품·같은 판매처·같은 계정으로
 *     살아 있는 상품(등록 완료·승인 완료·승인 대기)이 있으면 새로 등록하지 않는다 — 쿠팡·스마트스토어·11번가 = 그 상품 수정(같은 기록, request_json.revisions — 11번가는 2026-10-02 상품수정 PUT)
 *     응답에 updated:true(쿠팡은 way 'modify'|'price_stock'|'none'). send_prepare.existing = 판매처마다 이미 있는 상품
 * GET ?t={토큰}  (로그인 없음 — 쿠팡이 이미지를 내려받는 짧은 주소, _marketplaceCrypto 토큰 30분) → 파일 바이트 그대로 (302 아님)
 *
 * 비밀: 키는 MARKETPLACE_ENC_KEY로 암호화해 marketplace_accounts에만. 응답·로그·기록(request_json)에 키·서명을 넣지 않는다.
 * 환경변수: MARKETPLACE_ENC_KEY · MARKETPLACE_RELAY_URL · MARKETPLACE_RELAY_SECRET · MARKETPLACE_PUBLIC_URL(이미지 주소 기준, 기본 https://www.euchs.co.kr) · CAFE24_CLIENT_ID · CAFE24_CLIENT_SECRET(카페24 우리 앱)
 */
import { studioGuard, sendError, sb, storageDownload, storageUpload, storageSignDownload } from './_studio.js'
import { loadEncKey, encryptSecret, decryptSecret, makeImageToken, verifyImageToken } from './_marketplaceCrypto.js'
import {
  PATHS, coupangCall, CoupangError, normalizeOutbound, normalizeReturnCenters, validateTemplate, summarizeCategoryMeta,
  missingRequired, buildProductBody, mapCoupangStatus, DELIVERY_COMPANIES, RELAY_IP, NOT_READY_MESSAGE, NOT_READY_CODES,
} from './_coupang.js'
import { readDimensions } from './studio-ingest.js'
import { extractFacts, factTexts, withKo } from './_studioFacts.js'
import { resendPlan } from './_coupangFields.js'
import { detailImageOver, detailImageServerMessage } from './_marketDetailLimits.js'
import { orderedOptionsOf, ORDERED_ORDERS_MAX } from './_marketOrdered.js'
import { ORDER_OK_STATUSES } from './_studioBg.js'
import { extractSkus1688, isSaleMode, DOC_MAX, BRAND_MAX, BRAND_NOT_FOUND, normalizeBrands, pickBrand, detailImagePlans, formFromBody, DETAIL_MAX_BYTES, cleanOptionLinks } from './_coupangFields.js'
import { renderDetailPiece, shrinkBytes, renderSquare } from './_coupangImage.js'
import { publishMarketImages, MarketImagesError } from './_marketImages.js'
import {
  verifyElevenstKey, ElevenstError, elevenstCall, ELEVENST_PATHS, ELEVENST_CATEGORY_URL, decodeXmlBytes, normalizeElevenstCategories, normalizeElevenstAddresses,
  translateElevenstApi, buildElevenstProduct, elevenstDetailImageUrls, parseClientMessage, lastElevenstAddresses,
  parseModifyMessage, parseSellerCodeProducts, elevenstSellerCode, isElevenstSellerCode,
} from './_elevenst.js'
import { pickElevenstAddress, ELEVENST_SEND_PUBLIC, feeHasBase, SETTLEMENT_ERROR_RE, SETTLEMENT_MESSAGE } from './_elevenstFields.js'
import {
  smartstoreToken, SmartstoreError, smartstoreApi, SS_PATHS, buildSmartstoreProduct, normalizeSsCategories, normalizeAddressBooks, defaultAddress, uploadedImageUrls, productNosOf,
  imageMime, planUploads, buildImageMultipart, UPLOAD_IMAGE_MAX, DISPLAY_STATUSES,
} from './_smartstore.js'
import { lastAddressesOf } from './_smartstoreFields.js'
import {
  STATUS_CHECK_MARKETS, CHECK_STATUSES, CHECK_BATCH, SS_SINGLE_MAX, SS_SEARCH_PATH, ssOriginProductPath, smartstoreStatusOf, smartstoreSearchBody,
  smartstoreSearchStatuses, isSsNotFound, STOP_CODES, DELETED, SS_STATUS_LABEL, checkSince, LIST_PAGE, LIST_PAGES_MAX, NEW_CHECK_STATUSES, ELEVENST_LOOKUP_MAX, elevenstStatusOf, elevenstProductOf,
  COUPANG_SINGLE_MAX, SINGLE_CHECK_STATUSES, COUPANG_DELETED_PAGES_MAX, coupangDeletedQuery, coupangListPage, SS_ACCOUNT_PATH, smartstoreAccountOf, accountJudge,
} from './_marketStatus.js'
import {
  Cafe24Error, authorizeUrl, makeState, verifyState, verifyLaunch, exchangeCode, refreshAccess, missingScopes, needsRefresh, isMallId, normalizeMallId, appCredentials, redirectKeyFor, CAFE24_REDIRECT_URIS,
  cafe24Api, accessNeedsRefresh, isWon, cleanProductName, isCategoryNo, buildCafe24Product, isDisplayFlag, buildCafe24ProductImage, productImagePath, productNoOf, normalizeCategories, uploadedPaths, responseShape, CATEGORY_PAGE, CATEGORY_MAX_PAGES, cafe24AdminProductUrl,
} from './_cafe24.js'
import { lookupCachedTranslations } from './_translationCache.js'
import {
  LIVE_SEND_STATUSES, UPDATE_MODES, updatePlan, coupangOwnerOf, smartstoreOwnerOf, isCoupangApproved, coupangContentKey, coupangPriceStockChanges, coupangPriceProblem,
  coupangChangeOrder, coupangUpdateWay, mergeSmartstoreUpdate, SS_UPDATABLE_STATUS, elevenstOwnerOf,
} from './_marketUpdate.js'
import { ZigzagError, ZIGZAG_ERRORS, zigzagConfig, zigzagCall, Q as ZQ, ADDRESS_PAGE as Z_ADDRESS_PAGE, ADDRESS_PAGES_MAX as Z_ADDRESS_PAGES_MAX, normalizeShop, normalizeZigzagAddresses } from './_zigzag.js'
import {
  ZIGZAG, zigzagKeyProblems, normalizeZigzagCategories, normalizeEssentialTemplates, buildZigzagProduct, mergeZigzagUpdate, zigzagContentKey, zigzagStockChanges,
  zigzagStatusOf, SUMMARY_MAX as Z_SUMMARY_MAX, ZIGZAG_SINGLE_MAX,
} from './_zigzagFields.js'
import { PREVIOUS_SELECT, previousOf } from './_marketPrevious.js'
import crypto from 'crypto'
import { CACHE_SOURCE_LANG, CACHE_TARGET_LANG } from './_crossborderKo.js'

const MARKET = 'coupang'
const BUCKET = 'studio'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VENDOR_RE = /^[A-Za-z0-9]{1,20}$/
const KEY_MAX_DAYS = 180
const REP_MIN = 500, REP_MAX = 5000, REP_MAX_BYTES = 3 * 1024 * 1024
const REP_SIZE = 1000 // 서버가 만드는 대표 이미지·옵션 사진 한 변(px)
const PREVIEW_URL_SEC = 3600 // 보내기 창에 보여 주는 사진 주소(서명) — 화면 표시용. 보낼 때는 쓰지 않는다
const OPTION_IMAGE_MAX = 6 // 옵션 대표 이미지(서로 다른 사진) — 요청 본문 크기 때문에 6장까지, 나머지 옵션은 상품 대표 이미지를 쓴다
const DOC_MAX_BYTES = 3 * 1024 * 1024 // 쿠팡 제한은 5MB — 요청 본문 크기 때문에 3MB까지 받는다
const DOC_TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }
const OFFER_ID_RE = /^\d{9,16}$/
const ACCOUNT_PUBLIC = 'id,seller_login_id,vendor_id,key_last4,expires_at,status,last_checked_at,last_error,created_at,updated_at'
const TEMPLATE_SELECT = 'id,name,delivery_charge_type,delivery_charge,free_ship_over_amount,delivery_charge_on_return,return_charge,exchange_charge,outbound_shipping_time_day,delivery_company_code,outbound_place_code,return_center_code,remote_area_deliverable,is_default,created_at,updated_at'
const SEND_SELECT = 'id,export_id,market,seller_product_id,status,market_status,reason,approval_requested_at,last_synced_at,created_at,updated_at,request_json'

function marketConfig() {
  return {
    relayUrl: process.env.MARKETPLACE_RELAY_URL || '',
    relaySecret: process.env.MARKETPLACE_RELAY_SECRET || '',
    publicUrl: (process.env.MARKETPLACE_PUBLIC_URL || 'https://www.euchs.co.kr').replace(/\/$/, ''),
  }
}
function encKeyOr(res) {
  try { return loadEncKey() } catch (e) {
    console.error('[marketplace] MARKETPLACE_ENC_KEY 문제:', e.message)
    sendError(res, 503, 'enc_not_ready', NOT_READY_MESSAGE)
    return null
  }
}
function sniffMime(b) {
  if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg'
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png'
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  return null
}
function daysLeft(iso) { return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000) }

// ── 계정 ──
async function loadAccountRow(ctx, select = ACCOUNT_PUBLIC) {
  const rows = await sb(ctx.cfg, `marketplace_accounts?select=${select}&user_id=eq.${ctx.userId}&market=eq.${MARKET}&limit=1`)
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}
/** 복호화한 호출 재료. 없으면 null (부르는 쪽이 not_connected) */
async function loadCredentials(ctx, encKey) {
  const row = await loadAccountRow(ctx, `${ACCOUNT_PUBLIC},access_key_enc,secret_key_enc`)
  if (!row) return null
  const m = marketConfig()
  return {
    row,
    call: { relayUrl: m.relayUrl, relaySecret: m.relaySecret, vendorId: row.vendor_id, accessKey: decryptSecret(row.access_key_enc, encKey), secretKey: decryptSecret(row.secret_key_enc, encKey) },
  }
}
async function loadPlaces(ctx) {
  const rows = await sb(ctx.cfg, `marketplace_places?select=id,kind,place_code,name,address,usable,is_default,fetched_at&user_id=eq.${ctx.userId}&market=eq.${MARKET}&order=kind,name`)
  return Array.isArray(rows) ? rows : []
}
/** 쿠팡에서 출고지·반품지 조회 → 정리된 행. 실패는 CoupangError throw */
async function fetchPlaces(call) {
  const ob = await coupangCall(call, { method: 'GET', path: PATHS.outbound, query: 'pageNum=1&pageSize=50' })
  const rc = await coupangCall(call, { method: 'GET', path: PATHS.returnCenters(call.vendorId), query: 'pageNum=1&pageSize=50' })
  return [...normalizeOutbound(ob?.content ?? ob?.data?.content ?? ob?.data), ...normalizeReturnCenters(rc?.data?.content ?? rc?.content ?? rc?.data)]
}
async function savePlaces(ctx, places) {
  await sb(ctx.cfg, `marketplace_places?user_id=eq.${ctx.userId}&market=eq.${MARKET}`, { method: 'DELETE', prefer: 'return=minimal' })
  if (!places.length) return
  const rows = places.map((p, i) => ({ user_id: ctx.userId, market: MARKET, kind: p.kind, place_code: p.place_code, name: p.name, address: p.address, usable: p.usable, is_default: i === places.findIndex(x => x.kind === p.kind), fetched_at: new Date().toISOString() }))
  await sb(ctx.cfg, 'marketplace_places', { method: 'POST', body: rows, prefer: 'return=minimal' })
}
function coupangFail(res, e, where) {
  if (e instanceof CoupangError) {
    // 우리 쪽 준비 문제(중계 설정·연결)는 error로 — 고객 화면에는 원인이 안 보이므로 로그가 유일한 단서
    if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] ${where} 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw} — MARKETPLACE_RELAY_URL·MARKETPLACE_RELAY_SECRET 설정과 중계 상태 확인`)
    else console.warn(`[marketplace] ${where} 쿠팡 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
  }
  throw e
}

async function status(ctx, body, res) {
  const m = marketConfig()
  let enc = true
  try { loadEncKey() } catch { enc = false }
  const account = await loadAccountRow(ctx)
  const places = account ? await loadPlaces(ctx) : []
  let acc = null
  if (account) {
    // 칸을 하나씩 고른다 — 행을 통째로 펼치지 않는다(암호문 칸이 응답에 섞이지 않게)
    const left = daysLeft(account.expires_at)
    acc = {
      seller_login_id: account.seller_login_id, vendor_id: account.vendor_id, key_last4: account.key_last4, expires_at: account.expires_at,
      status: left < 0 && account.status === 'connected' ? 'expired' : account.status,
      last_checked_at: account.last_checked_at, last_error: account.last_error,
    }
  }
  return res.status(200).json({ connected: !!acc, account: acc, places, daysLeft: acc ? daysLeft(acc.expires_at) : null, ready: { enc, relay: !!(m.relayUrl && m.relaySecret) }, relayIp: RELAY_IP, deliveryCompanies: DELIVERY_COMPANIES })
}

async function connect(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const login = String(body.seller_login_id ?? '').trim(), vendor = String(body.vendor_id ?? '').trim()
  const ak = String(body.access_key ?? '').trim(), sk = String(body.secret_key ?? '').trim()
  const exp = new Date(String(body.expires_at ?? ''))
  if (!login || login.length > 100) return sendError(res, 400, 'invalid_input', 'Wing 로그인 ID를 넣어 주세요.')
  if (!VENDOR_RE.test(vendor)) return sendError(res, 400, 'invalid_input', '업체코드는 영문·숫자 20자 이내예요. (예: A00012345)')
  if (!ak || ak.length > 200 || !sk || sk.length > 200) return sendError(res, 400, 'invalid_input', 'Access Key와 Secret Key를 넣어 주세요.')
  if (!Number.isFinite(exp.getTime()) || exp.getTime() < Date.now() || exp.getTime() > Date.now() + (KEY_MAX_DAYS + 1) * 86400000) return sendError(res, 400, 'invalid_input', `키 유효기간은 오늘부터 ${KEY_MAX_DAYS}일 안의 날짜여야 해요.`)
  const m = marketConfig()
  const call = { relayUrl: m.relayUrl, relaySecret: m.relaySecret, vendorId: vendor, accessKey: ak, secretKey: sk }
  let places
  try { places = await fetchPlaces(call) } catch (e) { return coupangFail(res, e, 'connect') }
  const row = {
    user_id: ctx.userId, market: MARKET, seller_login_id: login, vendor_id: vendor,
    access_key_enc: encryptSecret(ak, encKey), secret_key_enc: encryptSecret(sk, encKey), key_last4: ak.slice(-4),
    expires_at: exp.toISOString(), status: 'connected', last_checked_at: new Date().toISOString(), last_error: null,
  }
  await sb(ctx.cfg, 'marketplace_accounts?on_conflict=user_id,market', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' })
  await savePlaces(ctx, places)
  console.info(`[marketplace] 쿠팡 연결 ${ctx.userId} vendor=${vendor} places=${places.length}`)
  return status(ctx, body, res)
}

async function disconnect(ctx, body, res) {
  for (const t of ['marketplace_templates', 'marketplace_places', 'marketplace_accounts']) {
    await sb(ctx.cfg, `${t}?user_id=eq.${ctx.userId}&market=eq.${MARKET}`, { method: 'DELETE', prefer: 'return=minimal' })
  }
  return res.status(200).json({ ok: true })
}

// ── 11번가 · 스마트스토어 · 카페24 연결 (2026-09-30) ──
// 쿠팡과 같은 표(marketplace_accounts)·같은 암호화(encryptSecret). 11번가·스마트스토어는 같은 중계(MARKETPLACE_RELAY_*), 카페24는 IP 제한이 없어 바로 부른다(api/_cafe24.js)
// 11번가는 연결까지만(보내기는 다음 작업) · 스마트스토어 보내기 = smartstoreSend. SQL docs/sql/2026-09-30-marketplace-11st-requests.sql 실행 전이면 503 marketplace_sql_missing(원인 로그)
// 다른 판매처(지그재그·에이블리·G마켓·옥션·메이크샵·고도몰)는 화면에 "예정"만 — 서버 action 없음 (S3-3에서 연결 신청을 걷어냄)
const ELEVENST = '11st'
const SMARTSTORE = 'smartstore'
const CAFE24 = 'cafe24'
const ELEVENST_PUBLIC = 'seller_login_id,key_last4,status,last_checked_at,last_error,created_at'
const CAFE24_PUBLIC = 'seller_login_id,key_last4,status,expires_at,last_checked_at,last_error,created_at'
const isSchemaGap = e => e?.status === 400 && /check constraint|violates|null value|23514|23502|42703|column/i.test(String(e?.message || ''))

async function oneAccount(ctx, market, select) {
  const rows = await sb(ctx.cfg, `marketplace_accounts?select=${select}&user_id=eq.${ctx.userId}&market=eq.${market}&limit=1`)
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}
/** 카페24 행 → 화면 값 (쇼핑몰 ID·상태·연결 유지 기한만 — 토큰은 안 내려감). refresh 만료가 지났으면 expired */
function cafe24Public(c) {
  if (!c) return { connected: false, account: null }
  const expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now()
  return { connected: true, account: { mall_id: c.seller_login_id, status: expired && c.status === 'connected' ? 'expired' : c.status, expires_at: c.expires_at, last_checked_at: c.last_checked_at, last_error: c.last_error } }
}
/**
 * 카페24는 관리자·스태프(ctx.isAdmin = is_admin_or_staff — 테스트몰 유지용)만 (2026-10-01 — 카페24 앱 심사 반려: 자체 소싱 기능과 경쟁이라 허용 불가).
 * 고객에게는 화면에서 숨기고, 서버도 cafe24_* 요청을 거절한다. 카페24 코드·DB 기록은 지우지 않는다
 */
const cafe24Allowed = ctx => ctx?.isAdmin === true
// 11번가 보내기 — 공개 스위치(api/_elevenstFields.js ELEVENST_SEND_PUBLIC)가 꺼져 있으면 관리자·스태프만 (실전 테스트 전, 2026-10-01). 연결(connect_11st)은 그대로
const elevenstSendAllowed = ctx => ELEVENST_SEND_PUBLIC || ctx?.isAdmin === true
const ELEVENST_SEND_ACTIONS = ['elevenst_categories', 'elevenst_addresses', 'elevenst_send']
const CAFE24_ACTIONS = ['cafe24_begin', 'cafe24_launch', 'cafe24_finish', 'disconnect_cafe24', 'cafe24_categories', 'cafe24_send']
async function marketStatus(ctx, body, res) {
  const a = await oneAccount(ctx, ELEVENST, ELEVENST_PUBLIC)
  const s = await oneAccount(ctx, SMARTSTORE, ELEVENST_PUBLIC)
  const z = await oneAccount(ctx, ZIGZAG, ELEVENST_PUBLIC)
  // 고객이면 카페24 계정을 읽지 않는다(연결 안 됨으로 — 토큰 갱신도 안 부름)
  let c = cafe24Allowed(ctx) ? await oneAccount(ctx, CAFE24, CAFE24_PUBLIC) : null
  if (c && c.status === 'connected' && needsRefresh(c.expires_at)) c = (await keepCafe24Alive(ctx)) || c // 연결 유지 — 2주 refresh 만료 전에 갱신
  return res.status(200).json({
    elevenst: a ? { connected: true, account: { seller_login_id: a.seller_login_id, key_last4: a.key_last4, status: a.status, last_checked_at: a.last_checked_at, last_error: a.last_error } } : { connected: false, account: null },
    // 스마트스토어 — 칸을 하나씩 고른다(암호문 칸 없음). key_last4 = 애플리케이션 ID 끝 4자리 · 시크릿은 어떤 형태로도 안 내려감
    smartstore: s ? { connected: true, account: { key_last4: s.key_last4, status: s.status, last_checked_at: s.last_checked_at, last_error: s.last_error } } : { connected: false, account: null },
    // 지그재그 (2026-10-02) — 스토어 이름(seller_login_id에 저장)·Access Key 끝 4자리만. Secret Key는 어떤 형태로도 안 내려감
    zigzag: z ? { connected: true, account: { shop_name: z.seller_login_id, key_last4: z.key_last4, status: z.status, last_checked_at: z.last_checked_at, last_error: z.last_error } } : { connected: false, account: null },
    // 카페24 — 쇼핑몰 ID·상태·연결 유지 기한만. 앱 값·토큰은 안 내려감
    cafe24: cafe24Public(c),
    relayIp: RELAY_IP,
  })
}

// ── 카페24 (2026-09-30 앱 방식) — 우리 앱 "EUCHS 스튜디오"(CAFE24_CLIENT_ID·SECRET, 서버 환경변수만)로 동의 → 연결 탭으로 돌아와 코드 교환 ──
// cafe24_begin  { mall_id, origin } → { authorizeUrl } — DB에 쓰지 않음(쇼핑몰 ID·돌아오는 주소는 서명된 state 안에)
// cafe24_launch { query, origin } → 쇼핑몰 관리자에서 앱을 열었을 때(App URL) 쿼리 원문의 hmac 확인 → { mallId, authorizeUrl } · 틀리면 400 bad_launch(연결 안 함)
// cafe24_finish { code, state } → state(이 사용자·10분·쇼핑몰·돌아오는 주소) 확인 → 토큰 교환 → 권한 확인 → 토큰 암호화 저장(connected)
function cafe24AppOr(res, where) {
  const app = appCredentials()
  if (!app) {
    console.error(`[marketplace] 카페24 ${where}: CAFE24_CLIENT_ID·CAFE24_CLIENT_SECRET 환경변수 없음`)
    sendError(res, 503, 'cafe24_not_ready', NOT_READY_MESSAGE)
  }
  return app
}
function cafe24Authorize(encKey, app, ctx, mallId, origin) {
  const rk = redirectKeyFor(origin)
  return authorizeUrl({ mallId, clientId: app.clientId, state: makeState(encKey, ctx.userId, mallId, rk), redirectUri: CAFE24_REDIRECT_URIS[rk] })
}
async function cafe24Begin(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const app = cafe24AppOr(res, 'begin')
  if (!app) return
  const mallId = normalizeMallId(body.mall_id)
  if (!isMallId(mallId)) return sendError(res, 400, 'invalid_input', '쇼핑몰 ID를 넣어 주세요. (영문 소문자·숫자)')
  console.info(`[marketplace] 카페24 연결 시작 ${ctx.userId} mall=${mallId}`)
  return res.status(200).json({ authorizeUrl: cafe24Authorize(encKey, app, ctx, mallId, body.origin) })
}
async function cafe24Launch(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const app = cafe24AppOr(res, 'launch')
  if (!app) return
  const v = verifyLaunch(app.clientSecret, String(body.query ?? '').slice(0, 4000))
  if (!v.ok) {
    console.warn(`[marketplace] 카페24 앱 실행 주소 확인 실패 ${ctx.userId}: ${v.reason}`)
    return sendError(res, 400, 'bad_launch', '카페24에서 연 주소를 확인하지 못했어요. 쇼핑몰 ID를 넣고 [연결하기]를 눌러 주세요.')
  }
  console.info(`[marketplace] 카페24 앱 실행 → 연결 시작 ${ctx.userId} mall=${v.mallId}`)
  return res.status(200).json({ mallId: v.mallId, authorizeUrl: cafe24Authorize(encKey, app, ctx, v.mallId, body.origin) })
}
async function saveCafe24Token(ctx, encKey, mallId, tok) {
  const row = {
    user_id: ctx.userId, market: CAFE24, seller_login_id: mallId, vendor_id: null,
    access_key_enc: null, secret_key_enc: null, key_last4: mallId.slice(-4).padStart(4, '-'), // 고객별 앱 값 없음 — key_last4는 표 규칙(4글자)을 채우는 쇼핑몰 ID 끝자리(화면에 안 씀)
    oauth_enc: encryptSecret(JSON.stringify({ access_token: tok.accessToken, refresh_token: tok.refreshToken }), encKey),
    access_expires_at: tok.accessExpiresAt, expires_at: tok.refreshExpiresAt, status: 'connected', last_checked_at: new Date().toISOString(), last_error: null,
  }
  await sb(ctx.cfg, 'marketplace_accounts?on_conflict=user_id,market', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' })
}
function cafe24Fail(res, e, where) {
  if (!(e instanceof Cafe24Error)) throw e
  if (e.code === 'cafe24_not_ready') console.error(`[marketplace] 카페24 ${where}: 우리 앱 값·돌아오는 주소 문제 (HTTP ${e.status}): ${e.raw} — CAFE24_CLIENT_ID·SECRET과 앱 설정 Redirect URI 확인`)
  else console.warn(`[marketplace] 카페24 ${where} 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
  return sendError(res, e.code === 'cafe24_not_ready' ? 503 : e.status === 429 ? 429 : e.code === 'invalid_input' ? 400 : 502, e.code, e.message)
}
async function cafe24Finish(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const app = cafe24AppOr(res, 'finish')
  if (!app) return
  const st = verifyState(encKey, body.state, ctx.userId)
  if (!st) return sendError(res, 400, 'bad_state', '연결 시간이 지났어요. [연결하기]를 다시 눌러 주세요.')
  const code = String(body.code ?? '').trim()
  if (!/^[\x21-\x7e]{4,500}$/.test(code)) return sendError(res, 400, 'invalid_input', '동의 결과를 읽지 못했어요. [연결하기]를 다시 눌러 주세요.')
  let tok
  try { tok = await exchangeCode({ mallId: st.mallId, ...app, breakerKey: ctx.userId }, code, st.redirectUri) } catch (e) { return cafe24Fail(res, e, 'finish') }
  if (tok.mallId && tok.mallId !== st.mallId) {
    console.warn(`[marketplace] 카페24 쇼핑몰 ID 다름: 시작한 곳 ${st.mallId} · 동의한 곳 ${tok.mallId}`)
    return sendError(res, 400, 'mall_mismatch', '넣은 쇼핑몰 ID와 동의한 쇼핑몰이 달라요. 쇼핑몰 ID를 확인해 주세요.')
  }
  const lack = missingScopes(tok.scopes)
  if (lack.length) {
    console.error(`[marketplace] 카페24 권한 빠짐 ${ctx.userId}: ${lack.join(',')} — 앱 설정 권한 확인`)
    return sendError(res, 503, 'cafe24_not_ready', NOT_READY_MESSAGE)
  }
  try {
    await saveCafe24Token(ctx, encKey, st.mallId, tok)
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error('[marketplace] 카페24 토큰 저장 실패 — marketplace_accounts 카페24 규칙이 예전 방식(docs/sql/2026-09-30-cafe24-app-mode.sql 실행 필요):', e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  console.info(`[marketplace] 카페24 연결 ${ctx.userId} mall=${st.mallId}`)
  return marketStatus(ctx, body, res)
}
/** refresh 토큰 갱신 — 새 refresh 토큰을 바로 저장한다(예전 것은 카페24가 폐기). 실패면 기록만 남기고 null */
async function keepCafe24Alive(ctx) {
  let encKey
  try { encKey = loadEncKey() } catch (e) { console.error('[marketplace] 카페24 갱신: MARKETPLACE_ENC_KEY 문제:', e.message); return null }
  const app = appCredentials()
  if (!app) { console.error('[marketplace] 카페24 갱신: CAFE24_CLIENT_ID·CAFE24_CLIENT_SECRET 환경변수 없음'); return null }
  try {
    const row = await oneAccount(ctx, CAFE24, `${CAFE24_PUBLIC},oauth_enc`)
    if (!row?.oauth_enc) return null
    const { refresh_token: rt } = JSON.parse(decryptSecret(row.oauth_enc, encKey))
    await saveCafe24Token(ctx, encKey, row.seller_login_id, await refreshAccess({ mallId: row.seller_login_id, ...app, breakerKey: ctx.userId }, rt))
    return oneAccount(ctx, CAFE24, CAFE24_PUBLIC)
  } catch (e) {
    if (e instanceof Cafe24Error && e.code === 'cafe24_not_ready') console.error('[marketplace] 카페24 연결 유지(토큰 갱신): 우리 앱 값 문제', e.raw || '')
    else console.warn('[marketplace] 카페24 연결 유지(토큰 갱신) 실패:', e.code || '', e.message, e.raw || '')
    // 고객 쪽 동의가 끝난 경우(invalid_grant — 갱신 토큰 만료·폐기·앱 삭제)만 "다시 연결 필요"로. 우리 쪽 문제·장애는 상태를 바꾸지 않는다
    if (e instanceof Cafe24Error && e.code === 'code_expired') {
      await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${CAFE24}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'invalid', last_error: e.message.slice(0, 500) } })
      return oneAccount(ctx, CAFE24, CAFE24_PUBLIC)
    }
    return null
  }
}
async function disconnectCafe24(ctx, body, res) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${CAFE24}`, { method: 'DELETE', prefer: 'return=minimal' })
  return marketStatus(ctx, body, res)
}

// ── 카페24 상품 보내기 (2026-09-30) ──
// cafe24_categories → { categories:[{ no, depth, parentNo, name, fullName }] }  (고객 쇼핑몰 상품분류 — 고르지 않으면 미분류로 등록)
// cafe24_send { exportId, productName, price(원·정수), categoryNo?, repImageId, fit?, display?('T'|'F' 기본 'F') } → { sendId, productNo, status:'registered', adminUrl }
//   토큰: access가 지났거나 5분 안에 지나면 refresh로 갱신해 바로 저장(refresh는 매번 바뀜). refresh가 지났거나 갱신이 거절되면 status 'expired' + "다시 연결"
//   사진: 우리 토큰 주소(30분)는 안 쓴다 — ① 상세 장을 이미지 업로드 API(products/images, NNEditor 경로)로 올려 description <img>에만 ② 상품 등록(대표 이미지 없이)
//         ③ 대표(정사각형 1000 JPG)는 등록 뒤 전용 API(products/{product_no}/images, image_upload_type A, data URI) — ③만 실패하면 registered + repImageError 안내
//   등록은 기본 진열 안 함·판매 안 함(display F·selling F) — body.display 'T'(진열함)면 둘 다 T로 즉시 노출. 옵션 없음(has_option F)
//   기록: marketplace_sends(market 'cafe24', status sending → registered / failed, seller_product_id = product_no). SQL docs/sql/2026-09-30-marketplace-sends-cafe24.sql 실행 전이면 503 marketplace_sql_missing
const CAFE24_SEND_SELECT = `${CAFE24_PUBLIC},oauth_enc,access_expires_at`
async function markCafe24(ctx, patch) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${CAFE24}`, { method: 'PATCH', prefer: 'return=minimal', body: patch })
}
/**
 * 호출 재료 { mallId, accessToken, breakerKey } — 없거나 만료면 응답을 보내고 null.
 * force = true면 access 만료와 상관없이 갱신한다(401을 받은 뒤 한 번 더)
 */
async function cafe24Credentials(ctx, res, { force = false } = {}) {
  const encKey = encKeyOr(res)
  if (!encKey) return null
  const app = cafe24AppOr(res, 'send')
  if (!app) return null
  const row = await oneAccount(ctx, CAFE24, CAFE24_SEND_SELECT)
  if (!row?.oauth_enc) { sendError(res, 409, 'not_connected', '먼저 카페24를 연결해 주세요.'); return null }
  if (row.status !== 'connected') { sendError(res, 409, 'key_expired', '카페24 연결이 끊겼어요. [연결] 탭에서 다시 연결해 주세요.'); return null }
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    await markCafe24(ctx, { status: 'expired', last_error: '연결 유지 기한(2주)이 지났어요.' })
    sendError(res, 409, 'key_expired', '카페24 연결 기한이 지났어요. [연결] 탭에서 다시 연결해 주세요.')
    return null
  }
  let tok
  try { tok = JSON.parse(decryptSecret(row.oauth_enc, encKey)) } catch (e) {
    console.error('[marketplace] 카페24 토큰 복호화 실패:', e.message)
    sendError(res, 500, 'decrypt_failed', '저장된 연결 정보를 읽지 못했어요. 연결을 해제하고 다시 연결해 주세요.')
    return null
  }
  const mallId = row.seller_login_id
  if (force || accessNeedsRefresh(row.access_expires_at)) {
    try {
      const fresh = await refreshAccess({ mallId, ...app, breakerKey: ctx.userId }, tok.refresh_token)
      await saveCafe24Token(ctx, encKey, mallId, fresh) // 새 refresh 토큰을 바로 저장 (예전 것은 카페24가 폐기)
      tok = { access_token: fresh.accessToken, refresh_token: fresh.refreshToken }
      console.info(`[marketplace] 카페24 토큰 갱신 ${ctx.userId} mall=${mallId}`)
    } catch (e) {
      if (!(e instanceof Cafe24Error)) throw e
      if (e.code === 'code_expired') { // invalid_grant — refresh 토큰 만료·폐기·앱 삭제 → 고객이 다시 동의해야 한다
        await markCafe24(ctx, { status: 'expired', last_error: e.message.slice(0, 500) })
        console.warn(`[marketplace] 카페24 갱신 거절(재인증 필요) ${ctx.userId}: ${e.raw}`)
        sendError(res, 409, 'key_expired', '카페24 인증이 만료됐어요. [연결] 탭에서 다시 연결해 주세요.')
        return null
      }
      cafe24Fail(res, e, 'send/refresh')
      return null
    }
  }
  return { mallId, accessToken: tok.access_token, breakerKey: ctx.userId }
}
/** Admin API 호출 — 401(토큰 무효)이면 강제 갱신 뒤 한 번 더. 실패는 Cafe24Error throw (부르는 쪽이 cafe24Fail) */
async function cafe24CallRetry(ctx, res, credRef, req) {
  try { return await cafe24Api(credRef.value, req) } catch (e) {
    if (!(e instanceof Cafe24Error) || e.code !== 'token_invalid') throw e
    console.warn(`[marketplace] 카페24 401 → 토큰 갱신 뒤 다시 ${ctx.userId} ${req.method} ${req.path}`)
    const next = await cafe24Credentials(ctx, res, { force: true })
    if (!next) throw new Cafe24Error('responded', '') // 이미 응답을 보냈다
    credRef.value = next
    return cafe24Api(credRef.value, req)
  }
}
async function cafe24Categories(ctx, body, res) {
  const cred = await cafe24Credentials(ctx, res)
  if (!cred) return
  const credRef = { value: cred }
  const categories = []
  try {
    for (let page = 0; page < CATEGORY_MAX_PAGES; page++) {
      const r = await cafe24CallRetry(ctx, res, credRef, { method: 'GET', path: '/categories', query: `limit=${CATEGORY_PAGE}&offset=${page * CATEGORY_PAGE}` })
      const rows = normalizeCategories(r)
      categories.push(...rows)
      if (rows.length < CATEGORY_PAGE) break
      if (page === CATEGORY_MAX_PAGES - 1) console.error(`[marketplace] 카페24 상품분류가 ${CATEGORY_PAGE * CATEGORY_MAX_PAGES}개를 넘음 — 앞부분만 보여 줌 ${ctx.userId}`)
    }
  } catch (e) {
    if (e instanceof Cafe24Error && e.code === 'responded') return
    return cafe24Fail(res, e, 'categories')
  }
  return res.status(200).json({ categories })
}
async function cafe24Send(ctx, body, res) {
  const cred = await cafe24Credentials(ctx, res)
  if (!cred) return
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const productName = cleanProductName(body.productName)
  if (!productName) return sendError(res, 400, 'invalid_input', '상품명을 넣어 주세요.')
  const price = body.price
  if (!isWon(price)) return sendError(res, 400, 'invalid_input', '판매가를 원 단위 정수로 넣어 주세요.')
  const categoryNo = body.categoryNo == null || body.categoryNo === '' ? null : Number(body.categoryNo)
  if (categoryNo != null && !isCategoryNo(categoryNo)) return sendError(res, 400, 'invalid_input', '상품 분류가 올바르지 않아요.')
  // 진열상태 — 'T'|'F'만, 없으면 'F'(진열안함·판매안함). 'T'면 등록 즉시 노출(판매함까지)
  const display = body.display == null || body.display === '' ? 'F' : body.display
  if (!isDisplayFlag(display)) return sendError(res, 400, 'invalid_input', '진열상태는 진열함·진열안함 중 하나예요.')
  const rep = await squareFromImage(ctx, ex, body.repImageId, body.fit)
  if (rep.error) return sendError(res, 400, 'rep_image_invalid', rep.error)

  // 전송 기록 먼저 — 표 규칙이 예전(쿠팡만)이면 여기서 503 (카페24를 부르기 전에 막힌다)
  let created
  try {
    created = await sb(ctx.cfg, 'marketplace_sends?select=id', { method: 'POST', body: { user_id: ctx.userId, export_id: ex.id, market: CAFE24, status: 'sending', request_json: {} }, prefer: 'return=representation' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error('[marketplace] 카페24 전송 기록 실패 — marketplace_sends market 규칙이 쿠팡뿐(docs/sql/2026-09-30-marketplace-sends-cafe24.sql 실행 필요):', e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  const sendId = created?.[0]?.id
  if (!sendId) throw new Error('marketplace_sends insert: id 없음')
  const fail = async (status, code, message, extra = {}) => {
    await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { status: 'failed', reason: message.slice(0, 2000), ...extra }, prefer: 'return=minimal' }).catch(e => console.error('[marketplace] 실패 기록도 못 남김:', sendId, e.message))
    return sendError(res, status, code, message)
  }
  const credRef = { value: cred }
  // 사진 업로드 응답 모양(responseShape — 값 없이 최상위 키·image 종류·길이·첫 원소 키·path 앞 40자). 첫 장 것을 result_json.shape에 남겨 운영 응답 모양을 DB로 확인한다. ★ c24Fail보다 먼저 선언
  let uploadShape = null
  const c24Fail = async (e, where) => {
    if (e instanceof Cafe24Error && e.code === 'responded') { // 갱신 실패 응답은 cafe24Credentials가 이미 보냈다 — 기록만 남긴다
      await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { status: 'failed', reason: '카페24 인증이 만료됐어요. [연결] 탭에서 다시 연결해 주세요.' }, prefer: 'return=minimal' }).catch(err => console.error('[marketplace] 실패 기록도 못 남김:', sendId, err.message))
      return
    }
    if (!(e instanceof Cafe24Error)) throw e
    console.warn(`[marketplace] 카페24 ${where} 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    return fail(e.status === 429 ? 429 : e.code === 'invalid_input' ? 400 : 502, e.code, e.message, { result_json: { code: e.code, status: e.status, step: where, shape: uploadShape } })
  }
  // 상세 이미지 올리기 — 내 상품 파일 그대로, 한 장씩 (요청 본문 크기 때문에 20장 묶음을 쓰지 않는다). 이 경로(NNEditor)는 상세설명 HTML에만 쓴다
  const upload = async (buf, where) => {
    const r = await cafe24CallRetry(ctx, res, credRef, { method: 'POST', path: '/products/images', body: { requests: [{ image: buf.toString('base64') }] }, timeoutMs: 60000 })
    const shape = responseShape(r)
    if (!uploadShape) uploadShape = shape
    const paths = uploadedPaths(r)
    if (!paths) {
      console.error(`[marketplace] 카페24 사진 업로드 응답 모양이 다름 ${ctx.userId} send=${sendId} ${where}:`, JSON.stringify(shape))
      throw new Cafe24Error('market_bad_json', '카페24가 올린 사진 경로를 주지 않았어요. 잠시 후 다시 시도해 주세요.', { status: 200, raw: `shape=${JSON.stringify(shape)}` })
    }
    return paths[0]
  }
  const detailPaths = []
  try {
    for (const f of ex.files) {
      const dl = await storageDownload(ctx.cfg, BUCKET, f.path)
      if (!dl.found) {
        console.error('[marketplace] 카페24 상세 이미지 원본이 Storage에 없음:', f.path)
        return fail(404, 'not_found', '내 상품 파일을 찾을 수 없어요. 작업을 다시 저장한 뒤 보내 주세요.')
      }
      detailPaths.push(await upload(dl.buf, `upload/${f.key}`))
    }
  } catch (e) { return c24Fail(e, 'upload') }
  // ② 상품 등록 — 대표 이미지 없이(detail_image에 NNEditor 경로를 넣으면 422 "Wrong image path" — 2026-09-30 운영)
  const built = buildCafe24Product({ productName, price, categoryNo, detailPaths, display })
  if (!built.ok) return fail(400, 'invalid_input', built.message)
  const requestJson = { body: built.body, mallId: cred.mallId, files: Object.fromEntries(ex.files.map(f => [f.key, f.path])), imagePaths: { detail: detailPaths } }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { request_json: requestJson }, prefer: 'return=minimal' })
  let r
  try { r = await cafe24CallRetry(ctx, res, credRef, { method: 'POST', path: '/products', body: built.body, timeoutMs: 60000 }) } catch (e) { return c24Fail(e, 'product') }
  // 상품 번호 — 숫자(integer)든 문자열이든 productNoOf(순수 함수, 값 테스트 있음)로 읽어 문자열로 저장한다
  const productNo = productNoOf(r)
  if (!productNo) {
    const productShape = { ...responseShape(r), productKeys: r?.product && typeof r.product === 'object' ? Object.keys(r.product).slice(0, 10) : undefined, productNoType: typeof r?.product?.product_no } // 값 없이 모양만
    // 번호를 잃지 않게: 숫자 모양이 아니어도 값이 있으면 기록에는 남긴다(seller_product_id는 표 규칙이 숫자만이라 result_json에)
    const rawNo = r?.product?.product_no != null ? String(r.product.product_no).slice(0, 40) : null
    console.error('[marketplace] 카페24 상품 등록 응답에 product_no 없음(또는 숫자 모양 아님):', sendId, JSON.stringify({ ...productShape, rawNo }))
    return fail(502, 'market_bad_json', '카페24가 상품 번호를 주지 않았어요. 카페24 쇼핑몰 관리 화면에서 상품이 등록됐는지 확인해 주세요.', { result_json: { code: 'market_bad_json', step: 'product', shape: uploadShape, productShape, rawProductNo: rawNo } })
  }
  // 등록은 됐다 — 먼저 registered로 남긴다 (③ 대표 이미지가 실패해도 상품은 카페24에 있다)
  const resultJson = { product_no: productNo, product_code: r.product?.product_code || null, display: r.product?.display || null, selling: r.product?.selling || null, shape: uploadShape }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { seller_product_id: productNo, status: 'registered', result_json: resultJson }, prefer: 'return=minimal' })
  // ③ 대표 이미지 — 전용 API(POST /products/{product_no}/images, image_upload_type A, data URI). 실패해도 상품은 registered 그대로 + 안내
  const repImage = { ok: false }
  let alreadyResponded = false // 갱신 실패면 cafe24Credentials가 이미 409를 보냈다
  try {
    const rb = buildCafe24ProductImage(rep.buf)
    if (!rb.ok) throw new Cafe24Error('invalid_input', rb.message)
    const ri = await cafe24CallRetry(ctx, res, credRef, { method: 'POST', path: `/products/${productNo}/images`, body: rb.body, timeoutMs: 60000 })
    const path = productImagePath(ri)
    repImage.shape = { ...responseShape(ri), imageKeys: ri?.image && typeof ri.image === 'object' ? Object.keys(ri.image).slice(0, 10) : undefined, path40: path ? path.slice(0, 40) : undefined }
    if (!path) throw new Cafe24Error('market_bad_json', '카페24가 대표 이미지 경로를 주지 않았어요.', { status: 200, raw: `shape=${JSON.stringify(repImage.shape)}` })
    repImage.ok = true
  } catch (e) {
    if (!(e instanceof Cafe24Error)) throw e
    if (e.code === 'responded') { alreadyResponded = true; repImage.code = 'key_expired'; repImage.message = '카페24 인증이 만료됐어요.' }
    else { repImage.code = e.code; repImage.message = e.message }
    console.warn(`[marketplace] 카페24 대표 이미지 실패(상품은 등록됨) ${ctx.userId} send=${sendId} product_no=${productNo} ${e.code} (HTTP ${e.status}): ${e.raw}`)
  }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { result_json: { ...resultJson, repImage } }, prefer: 'return=minimal' }).catch(err => console.error('[marketplace] 대표 이미지 결과 기록 실패:', sendId, err.message))
  if (alreadyResponded) return
  console.info(`[marketplace] 카페24 상품 등록 ${ctx.userId} send=${sendId} mall=${cred.mallId} product_no=${productNo} detail=${detailPaths.length} rep=${repImage.ok ? 'ok' : repImage.code}`)
  const repImageError = repImage.ok ? null : `상품은 등록되었으나 대표 이미지 업로드에 실패했습니다. 카페24 관리자에서 등록하세요. (사유: ${repImage.message})`
  return res.status(200).json({ sendId, productNo, sellerProductId: productNo, status: 'registered', display, adminUrl: cafe24AdminProductUrl(cred.mallId, productNo), repImageError })
}
async function connectElevenst(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const login = String(body.seller_login_id ?? '').trim(), key = String(body.api_key ?? '').trim()
  if (!login || login.length > 100) return sendError(res, 400, 'invalid_input', '11번가 셀러 ID를 넣어 주세요.')
  if (!/^[\x21-\x7e]{8,200}$/.test(key)) return sendError(res, 400, 'invalid_input', 'API 키를 넣어 주세요. (공백 없이 8자 이상)')
  const m = marketConfig()
  try {
    await verifyElevenstKey({ relayUrl: m.relayUrl, relaySecret: m.relaySecret, apiKey: key, breakerKey: ctx.userId })
  } catch (e) {
    if (!(e instanceof ElevenstError)) throw e
    if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 11번가 connect 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw} — MARKETPLACE_RELAY_URL·SECRET·relay.js 11st 대상 확인`)
    else console.warn(`[marketplace] 11번가 connect 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
  }
  const row = {
    user_id: ctx.userId, market: ELEVENST, seller_login_id: login, vendor_id: null,
    access_key_enc: encryptSecret(key, encKey), secret_key_enc: null, key_last4: key.slice(-4).replace(/[^A-Za-z0-9-]/g, '-'),
    expires_at: null, status: 'connected', last_checked_at: new Date().toISOString(), last_error: null,
  }
  try {
    await sb(ctx.cfg, 'marketplace_accounts?on_conflict=user_id,market', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error('[marketplace] 11번가 계정 저장 실패 — marketplace_accounts가 아직 쿠팡 전용(docs/sql/2026-09-30-marketplace-11st-requests.sql 실행 필요):', e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  console.info(`[marketplace] 11번가 연결 ${ctx.userId}`)
  return marketStatus(ctx, body, res)
}
// 스마트스토어 (2026-09-30) — 11번가와 같은 방식: 같은 표·같은 암호화·같은 중계. 애플리케이션 ID = access_key_enc, 시크릿 = secret_key_enc
// 키 확인 = 중계 경유 인증 토큰 발급(api/_smartstore.js). 토큰은 저장하지 않는다. 보내기는 아래 smartstoreSend (2026-10-01)
async function connectSmartstore(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const id = String(body.client_id ?? '').trim(), secret = String(body.client_secret ?? '').trim()
  if (!/^[\x21-\x7e]{4,200}$/.test(id)) return sendError(res, 400, 'invalid_input', '애플리케이션 ID를 넣어 주세요.')
  if (!/^[\x21-\x7e]{8,200}$/.test(secret)) return sendError(res, 400, 'invalid_input', '애플리케이션 시크릿을 넣어 주세요.')
  const m = marketConfig()
  try {
    await smartstoreToken({ relayUrl: m.relayUrl, relaySecret: m.relaySecret, clientId: id, clientSecret: secret, breakerKey: ctx.userId })
  } catch (e) {
    if (!(e instanceof SmartstoreError)) throw e
    if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 스마트스토어 connect 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw} — MARKETPLACE_RELAY_URL·SECRET·relay.js smartstore 대상 확인`)
    else console.warn(`[marketplace] 스마트스토어 connect 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
  }
  const row = {
    user_id: ctx.userId, market: SMARTSTORE, seller_login_id: '내 스토어 애플리케이션', vendor_id: null,
    access_key_enc: encryptSecret(id, encKey), secret_key_enc: encryptSecret(secret, encKey), key_last4: id.slice(-4).replace(/[^A-Za-z0-9-]/g, '-'),
    expires_at: null, status: 'connected', last_checked_at: new Date().toISOString(), last_error: null,
  }
  try {
    await sb(ctx.cfg, 'marketplace_accounts?on_conflict=user_id,market', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error('[marketplace] 스마트스토어 계정 저장 실패 — marketplace_accounts market 체크에 smartstore 없음(docs/sql/2026-09-30-marketplace-11st-requests.sql 실행 필요):', e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  await resetSmartstoreAccountKey(ctx) // 다른 스토어로 바꿔 연결했을 수 있다 — 계정 식별값은 다음 보내기·확인 때 다시 읽는다
  console.info(`[marketplace] 스마트스토어 연결 ${ctx.userId}`)
  return marketStatus(ctx, body, res)
}
async function disconnectSmartstore(ctx, body, res) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${SMARTSTORE}`, { method: 'DELETE', prefer: 'return=minimal' })
  return marketStatus(ctx, body, res)
}

// ── 스마트스토어 상품 보내기 (2026-10-01) ── 규칙·근거는 api/_smartstore.js (공식 문서 경로 주석)
// 모든 네이버 호출은 연결과 같은 중계(MARKETPLACE_RELAY_*). 토큰은 action마다 새로 받고 저장하지 않는다
// 기록: marketplace_sends(market 'smartstore', sending → registered / failed, seller_product_id = 원상품번호, result_json.channelProductNo = 채널상품번호)
//   SQL docs/sql/2026-10-01-marketplace-sends-smartstore.sql 실행 전이면 기록을 만들 때 503 marketplace_sql_missing (네이버에 아무것도 올리기 전)
const ADDRESS_PAGES_MAX = 5 // 주소록 500개까지
function smartstoreFail(res, e, where) {
  if (!(e instanceof SmartstoreError)) throw e
  if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 스마트스토어 ${where} 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw} — MARKETPLACE_RELAY_URL·SECRET·relay.js smartstore 대상 확인`)
  else console.warn(`[marketplace] 스마트스토어 ${where} 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
  return sendError(res, e.status === 429 ? 429 : e.code === 'invalid_input' ? 400 : 502, e.code, e.message)
}
/** 호출 재료 { relayUrl, relaySecret, accessToken, breakerKey } — 연결 전·복호화 실패·토큰 실패면 응답을 보내고 null */
async function smartstoreCredentials(ctx, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return null
  const row = await oneAccount(ctx, SMARTSTORE, `${ELEVENST_PUBLIC},access_key_enc,secret_key_enc`)
  if (!row?.access_key_enc || !row?.secret_key_enc) { sendError(res, 409, 'not_connected', '먼저 스마트스토어를 연결하세요.'); return null }
  let clientId, clientSecret
  try { clientId = decryptSecret(row.access_key_enc, encKey); clientSecret = decryptSecret(row.secret_key_enc, encKey) } catch (e) {
    console.error('[marketplace] 스마트스토어 키 복호화 실패:', e.message)
    sendError(res, 500, 'decrypt_failed', '저장된 연결 정보를 읽지 못했습니다. 연결을 해제하고 다시 연결하세요.')
    return null
  }
  const m = marketConfig()
  let tok
  try { tok = await smartstoreToken({ relayUrl: m.relayUrl, relaySecret: m.relaySecret, clientId, clientSecret, breakerKey: ctx.userId }) } catch (e) { smartstoreFail(res, e, 'token'); return null }
  return { relayUrl: m.relayUrl, relaySecret: m.relaySecret, accessToken: tok.access_token, breakerKey: ctx.userId }
}
async function smartstoreCategories(ctx, body, res) {
  const cred = await smartstoreCredentials(ctx, res)
  if (!cred) return
  let r
  try { r = await smartstoreApi(cred, { method: 'GET', path: SS_PATHS.categories, query: 'last=true' }) } catch (e) { return smartstoreFail(res, e, 'categories') }
  const categories = normalizeSsCategories(r.json)
  if (!categories.length) console.error(`[marketplace] 스마트스토어 카테고리 응답에 리프가 없음 ${ctx.userId}: type=${Array.isArray(r.json) ? `array(${r.json.length})` : typeof r.json}`)
  return res.status(200).json({ categories })
}
async function smartstoreAddresses(ctx, body, res) {
  const cred = await smartstoreCredentials(ctx, res)
  if (!cred) return
  const addresses = []
  try {
    for (let page = 1; page <= ADDRESS_PAGES_MAX; page++) {
      const r = await smartstoreApi(cred, { method: 'GET', path: SS_PATHS.addressBooks, query: `page=${page}` })
      addresses.push(...normalizeAddressBooks(r.json))
      const total = Number(r.json?.totalPage) || 1
      if (page >= total) break
      if (page === ADDRESS_PAGES_MAX) console.error(`[marketplace] 스마트스토어 주소록이 ${ADDRESS_PAGES_MAX}페이지를 넘음 — 앞부분만 ${ctx.userId}`)
    }
  } catch (e) { return smartstoreFail(res, e, 'addresses') }
  const last = await lastSmartstoreAddresses(ctx)
  return res.status(200).json({ addresses, last, defaults: { shipping: defaultAddress(addresses, 'shipping', last), return: defaultAddress(addresses, 'return', last) } })
}
/**
 * 마지막으로 등록에 성공한(상품 번호가 있는) 스마트스토어 보내기의 출고지·반품지 — 새 DB 칸 없이 그때 보낸 본문(request_json.body)에서 읽는다
 * 못 읽으면 기억 없이 기본 규칙만 (주소록은 그대로 보여 준다) — 원인은 로그로
 */
async function lastSmartstoreAddresses(ctx) {
  try {
    const rows = await sb(ctx.cfg, `marketplace_sends?select=claim:request_json->body->originProduct->deliveryInfo->claimDeliveryInfo&user_id=eq.${ctx.userId}&market=eq.${SMARTSTORE}&seller_product_id=not.is.null&order=created_at.desc&limit=1`)
    return lastAddressesOf(rows?.[0]?.claim)
  } catch (e) {
    console.error('[marketplace] 스마트스토어 마지막 출고지·반품지 조회 실패 — 기본 규칙으로:', ctx.userId, e.message)
    return lastAddressesOf(null)
  }
}
/** 화면 값 → 등록 재료 (이미지 주소는 올린 뒤에 채운다) */
function smartstoreInput(body) {
  const num = v => (v === '' || v == null ? NaN : Number(v))
  const d = body.delivery && typeof body.delivery === 'object' ? body.delivery : {}
  return {
    productName: body.productName, salePrice: num(body.salePrice), stock: num(body.stock), leafCategoryId: body.leafCategoryId,
    display: body.display == null || body.display === '' ? DISPLAY_STATUSES[0] : body.display, // 기본 전시중지
    delivery: { company: d.company, feeType: d.feeType, baseFee: d.feeType === 'PAID' || d.feeType === 'CONDITIONAL_FREE' ? num(d.baseFee) : undefined, ...(d.feeType === 'CONDITIONAL_FREE' ? { freeOver: num(d.freeOver) } : {}), returnFee: num(d.returnFee), exchangeFee: num(d.exchangeFee), shippingAddressId: num(d.shippingAddressId), returnAddressId: num(d.returnAddressId), shippingOverseas: d.shippingOverseas === true },
    afterService: body.afterService || {}, origin: body.origin || {}, notice: body.notice || {},
    customsTaxType: body.customsTaxType, // 해외 출고지일 때만 화면이 보낸다 (2026-10-01 운영 1차 400)
    options: marketOptionsInput(body.options), // 옵션(조합형)을 쓸 때만 화면이 보낸다 — 없으면 단일상품
  }
}
/** 화면 옵션 → 등록 재료 (스마트스토어·11번가 공용). 숫자 칸은 숫자로만 읽고(빈칸 = NaN → 검사에서 거절) 값은 그대로 — 검사는 판매처 본문 함수(_marketOptions) 한 곳 */
function marketOptionsInput(o) {
  if (o == null) return null
  const num = v => (v === '' || v == null ? NaN : Number(v))
  const rows = Array.isArray(o.rows) ? o.rows : []
  return {
    groupNames: Array.isArray(o.groupNames) ? o.groupNames.map(s => String(s ?? '')) : [],
    rows: rows.map(r => ({ values: Array.isArray(r?.values) ? r.values.map(s => String(s ?? '')) : [], addPrice: num(r?.addPrice), stock: num(r?.stock) })),
  }
}
// 보내는 중 가드 (2026-10-01 중복 등록 방지 — 스마트스토어·11번가만, 쿠팡은 다음 단계) — 같은 사용자·같은 내 상품·같은 판매처의
// 'sending' 기록이 2분 안에 있으면 새로 등록하지 않고 409 send_in_progress (두 번 누름·두 탭). 판매처 1건 보내기 실측 최대 8.3초(10/1 DB)라 2분이면 넉넉하다.
// 2분이 지난 'sending'(함수가 중간에 끊긴 기록)은 막지 않는다 — 고객이 다시 보낼 수 있어야 한다
const SEND_IN_PROGRESS_MS = 2 * 60 * 1000
const SEND_IN_PROGRESS_MESSAGE = '이 상품을 이 판매처로 보내는 중입니다. 잠시 후 [보낸 상품]에서 결과를 확인하세요.'
async function sendInProgress(ctx, exportId, market) {
  const since = new Date(Date.now() - SEND_IN_PROGRESS_MS).toISOString()
  const rows = await sb(ctx.cfg, `marketplace_sends?select=id&user_id=eq.${ctx.userId}&export_id=eq.${exportId}&market=eq.${market}&status=eq.sending&created_at=gte.${encodeURIComponent(since)}&limit=1`)
  return Array.isArray(rows) && rows.length > 0
}

// ── 다시 보내기 = 판매처에 있는 상품 수정 (2026-10-02) — 규칙·근거 api/_marketUpdate.js ──
// 같은 내 상품·같은 판매처·같은 계정으로 살아 있는 상품(등록 완료·승인 완료·승인 대기)이 있으면 새로 등록하지 않고 그 상품을 수정한다
const TARGET_SELECT = `${SEND_SELECT},market_account,result_json`
const TARGET_CHECK_FAILED = '판매처에 있는 상품을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
/**
 * 같은 작업(project)의 내 상품 id 전부 (2026-10-02) — [내 상품] 목록 한 줄 = 작업 하나. [다운로드]로 보관한 예전 결과물로 보냈던 상품도
 * 같은 작업의 지금 결과물로 다시 보내면 새로 등록하지 않고 그 상품을 수정한다. 작업을 못 찾으면 그 내 상품 하나만
 */
async function projectExportIds(ctx, exportId) {
  const rows = await sb(ctx.cfg, `studio_exports?select=project_id&id=eq.${exportId}&user_id=eq.${ctx.userId}&limit=1`)
  const pid = Array.isArray(rows) ? rows[0]?.project_id : null
  if (!pid) return [exportId]
  const all = await sb(ctx.cfg, `studio_exports?select=id&project_id=eq.${pid}&user_id=eq.${ctx.userId}`)
  const ids = (Array.isArray(all) ? all : []).map(r => r.id).filter(Boolean)
  return ids.includes(exportId) ? ids : [exportId, ...ids]
}
/** 그 작업(같은 작업의 내 상품 전부)·그 판매처의 살아 있는 기록 (최근순) → updatePlan 재료 */
async function liveSendRows(ctx, exportId, market) {
  const ids = await projectExportIds(ctx, exportId)
  const rows = await sb(ctx.cfg, `marketplace_sends?select=${TARGET_SELECT}&user_id=eq.${ctx.userId}&export_id=in.(${ids.join(',')})&market=eq.${market}&status=in.(${LIVE_SEND_STATUSES.join(',')})&seller_product_id=not.is.null&order=created_at.desc`)
  return (Array.isArray(rows) ? rows : []).map(r => ({ ...r, sellerProductId: r.seller_product_id, account: r.market_account, createdAt: r.created_at }))
}
/**
 * 수정할 상품 고르기 — 후보를 최근순으로 판매처에 조회해 "지금 연결된 계정의 상품"(owner 'mine')인 첫 번째를 고른다.
 * 계정 기록이 없던 예전 기록이 판매처 응답으로 이 계정 상품임이 확인되면 market_account를 채운다.
 * 'other'(다른 계정)·'none'(판매처에 없음)은 건너뛴다(추측으로 삭제됨 처리하지 않는다). 'unknown'(판단 못 함)이면 새로 등록하지 않고 멈춘다
 * @param {{ market, exportId, account, owner?:(s)=>Promise<{ who, current?, status?, code?, message? }> }} o  owner가 없으면(11번가) 확인 없이 계획 그대로
 * @returns {Promise<null | { mode:'create' } | { mode:'manual', target, extra } | { mode:'modify', target, current, extra }>}  null = 응답을 이미 보냄
 */
async function findUpdateTarget(ctx, res, { market, exportId, account, owner }) {
  let rows
  try { rows = await liveSendRows(ctx, exportId, market) } catch (e) {
    if (isNewColumnMissing(e)) { newSqlMissing(res, e, `${market} 보내기`); return null }
    throw e
  }
  const plan = updatePlan(rows, market, account)
  if (plan.mode !== 'modify') return plan.mode === 'manual' ? { mode: 'manual', target: plan.target, extra: plan.extra } : { mode: 'create' }
  let skipped = 0
  for (const s of plan.candidates) {
    const r = await owner(s)
    // legacy = 판매처 조회 열쇠가 없는 예전 기록(11번가 판매자 상품코드 없음) — 확인 없이 수정을 시도하고, 판매처가 키로 주인을 확인해 거절하면 그 문구 그대로
    if (r.who === 'mine' || r.who === 'legacy') {
      if (account && s.account !== account) await recordSendAccount(ctx, s.id, account) // 예전 기록 — 판매처 응답으로 이 계정 상품임을 확인했다
      return { mode: 'modify', target: s, current: r.current, extra: plan.candidates.length - 1 - skipped }
    }
    if (r.who === 'unknown') {
      console.warn(`[marketplace] ${market} 수정 대상 확인 실패 ${ctx.userId} send=${s.id} product=${s.seller_product_id}: ${r.code || ''} ${r.raw || ''}`)
      sendError(res, r.status || 502, r.code || 'market_check_failed', r.message || TARGET_CHECK_FAILED)
      return null
    }
    skipped++
    console.info(`[marketplace] ${market} 수정 대상에서 뺌(${r.who === 'other' ? '다른 계정 상품' : '판매처에 없음'}) ${ctx.userId} send=${s.id} product=${s.seller_product_id}`)
  }
  return { mode: 'create' }
}
/** 쿠팡 등록상품 조회로 주인 확인 — 조회 결과(current)는 상품 수정 본문의 옵션 id 재료 */
async function coupangOwner(cred, s) {
  try {
    const j = await coupangCall(cred.call, { method: 'GET', path: PATHS.product(s.seller_product_id) })
    const who = coupangOwnerOf({ ok: true, data: j?.data }, cred.row.vendor_id)
    return who === 'unknown' ? { who, code: 'market_bad_json', raw: 'vendorId 없음' } : { who, current: j }
  } catch (e) {
    if (!(e instanceof CoupangError)) throw e
    const who = coupangOwnerOf({ ok: false, raw: e.raw }, cred.row.vendor_id)
    return { who, status: e.status === 429 ? 429 : 502, code: e.code, message: who === 'unknown' ? e.message : '', raw: e.raw }
  }
}
/** 스마트스토어 원상품 조회로 주인 확인 — 조회 결과(current)는 원상품 수정 본문의 바탕 */
async function smartstoreOwner(cred, s) {
  try {
    const r = await smartstoreApi(cred, { method: 'GET', path: ssOriginProductPath(s.seller_product_id) })
    const who = smartstoreOwnerOf({ ok: true, json: r.json })
    return who === 'unknown' ? { who, code: 'market_bad_json', raw: 'originProduct 없음' } : { who, current: r.json }
  } catch (e) {
    if (!(e instanceof SmartstoreError)) throw e
    const who = smartstoreOwnerOf({ ok: false, status: e.status, raw: e.raw })
    return { who, status: e.status === 429 ? 429 : 502, code: e.code, message: who === 'unknown' ? e.message : '', raw: e.raw }
  }
}
/**
 * 11번가 판매자 상품코드 조회로 주인 확인 (근거 api/_marketUpdate.js elevenstOwnerOf). 코드가 없는 예전 기록 = 'legacy'(조회하지 않음)
 */
async function elevenstOwner(cred, s) {
  const code = s.request_json?.summary?.sellerPrdCd
  if (!isElevenstSellerCode(code)) return { who: 'legacy' }
  try {
    const xml = await elevenstCall(cred, { method: 'GET', path: ELEVENST_PATHS.sellerCode(code), translate: (st, t) => translateElevenstApi(st, t, '조회') })
    return { who: elevenstOwnerOf({ ok: true, products: parseSellerCodeProducts(xml) }, s.seller_product_id, code) }
  } catch (e) {
    if (!(e instanceof ElevenstError)) throw e
    return { who: 'unknown', status: e.status === 429 ? 429 : 502, code: e.code, message: e.message, raw: e.raw }
  }
}
const sha16 = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32)

/**
 * 스마트스토어 이미지 준비·업로드 — 대표(정사각형 JPG) + 내 상품 파일. 한 장이 중계 본문 제한을 넘으면 JPG 품질만 낮춘다.
 * 묶음마다 한 요청(10장·본문 상한), 한 번에 한 요청씩 (문서: 스토어당 동시 요청 금지)
 * @returns {{ ok:true, urls } | { ok:false, status, code, message, extra? } | { ok:false, error:SmartstoreError, step }}
 */
async function uploadSmartstoreImages(ctx, cred, ex, rep, tag) {
  const images = [{ buf: rep.buf, mime: 'image/jpeg' }]
  for (const f of ex.files) {
    const dl = await storageDownload(ctx.cfg, BUCKET, f.path)
    if (!dl.found) {
      console.error('[marketplace] 스마트스토어 상세 이미지 원본이 Storage에 없음:', f.path)
      return { ok: false, status: 404, code: 'not_found', message: '내 상품 파일을 찾을 수 없습니다. 작업을 다시 저장한 뒤 보내세요.' }
    }
    let buf = dl.buf, mime = imageMime(buf)
    if (!mime) return { ok: false, status: 400, code: 'invalid_input', message: '내 상품 파일 형식을 읽지 못했습니다. 작업을 다시 저장한 뒤 보내세요.' }
    if (buf.length > UPLOAD_IMAGE_MAX) {
      const out = await shrinkBytes(buf, { maxBytes: UPLOAD_IMAGE_MAX })
      if (out.tooBig) {
        console.error(`[marketplace] 스마트스토어 상세 이미지가 품질 ${out.quality}에서도 ${UPLOAD_IMAGE_MAX}바이트를 넘음: ${f.path} ${out.buf.length}`)
        return { ok: false, status: 400, code: 'invalid_input', message: '상세 이미지 한 장이 너무 큽니다. 섹션별 여러 장으로 다시 저장하세요.' }
      }
      buf = out.buf
      mime = out.mime
    }
    images.push({ buf, mime })
  }
  const urls = []
  for (const group of planUploads(images.map(im => im.buf.length))) {
    const mp = buildImageMultipart(group.map(i => images[i]))
    let r
    try { r = await smartstoreApi(cred, { method: 'POST', path: SS_PATHS.imageUpload, multipart: mp }) } catch (e) {
      if (!(e instanceof SmartstoreError)) throw e
      return { ok: false, error: e, step: 'upload' }
    }
    const got = uploadedImageUrls(r.json, group.length)
    if (!got) {
      const shape = { keys: r.json && typeof r.json === 'object' ? Object.keys(r.json).slice(0, 10) : typeof r.json, len: Array.isArray(r.json?.images) ? r.json.images.length : null, sent: group.length }
      console.error(`[marketplace] 스마트스토어 이미지 업로드 응답 모양이 다름 ${tag}:`, JSON.stringify(shape))
      return { ok: false, status: 502, code: 'market_bad_json', message: '판매처가 이미지 주소를 주지 않았습니다. 잠시 후 다시 시도해 주세요.', extra: { result_json: { code: 'market_bad_json', step: 'upload', shape } } }
    }
    urls.push(...got)
  }
  return { ok: true, urls }
}
/**
 * 스마트스토어 다시 보내기 = 원상품 수정 (2026-10-02) — 새 기록·새 상품을 만들지 않는다. 같은 기록(같은 원상품번호)에 회차 이력(request_json.revisions)
 *   원상품 조회(found.current — findUpdateTarget이 이미 받음) → 이미지 업로드 → 우리 등록 본문 → 조회한 상품 위에 우리 칸만 덮기(mergeSmartstoreUpdate) → PUT 원상품 수정
 *   실패하면 기록은 그대로 (판매처의 상품도 그대로)
 */
async function smartstoreUpdate(ctx, res, { cred, input, ex, rep, body, found }) {
  const t = found.target
  const no = String(t.seller_product_id)
  const st = found.current?.originProduct?.statusType
  if (!SS_UPDATABLE_STATUS.includes(st)) {
    console.warn(`[marketplace] 스마트스토어 수정 불가 상태 ${ctx.userId} send=${t.id} origin=${no} statusType=${st}`)
    return sendError(res, 409, 'market_state', `판매처 상품 상태가 '${SS_STATUS_LABEL[st] || st || '알 수 없음'}'이라 수정할 수 없습니다. 스마트스토어센터에서 상품 상태를 확인하세요.`)
  }
  const ssErr = (e, step) => {
    if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 스마트스토어 ${step} 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    else console.warn(`[marketplace] 스마트스토어 ${step} 실패 ${e.code} (HTTP ${e.status}) send=${t.id}: ${e.raw}`)
    return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
  }
  const up = await uploadSmartstoreImages(ctx, cred, ex, rep, `update send=${t.id}`)
  if (!up.ok) return up.error ? ssErr(up.error, 'update/upload') : sendError(res, up.status, up.code, up.message)
  const built = buildSmartstoreProduct({ ...input, repUrl: up.urls[0], detailUrls: up.urls.slice(1) })
  if (!built.ok) return sendError(res, 400, 'invalid_input', built.message)
  const m = mergeSmartstoreUpdate(found.current, built.body)
  if (!m.ok) {
    console.error(`[marketplace] 스마트스토어 수정 본문을 만들지 못함 send=${t.id}: ${m.code}`)
    return sendError(res, 502, m.code, m.message || TARGET_CHECK_FAILED)
  }
  let r
  try { r = await smartstoreApi(cred, { method: 'PUT', path: ssOriginProductPath(no), json: m.body, what: '수정' }) } catch (e) {
    if (!(e instanceof SmartstoreError)) throw e
    return ssErr(e, 'update/product')
  }
  const nos = productNosOf(r.text)
  const before = t.result_json?.channelProductNo || null
  const channel = nos.channelProductNo || before
  if (before && nos.channelProductNo && before !== nos.channelProductNo) console.warn(`[marketplace] 스마트스토어 수정 뒤 채널상품번호가 바뀜 send=${t.id} ${before} → ${nos.channelProductNo}`)
  const revisions = revisionsOf(t)
  const rev = { n: revisions.length + 1, at: new Date().toISOString(), via: 'modify', previousStatus: t.market_status || null, channelProductNo: channel, optionIds: m.optionIds }
  // 목록에 보이는 전시 상태 = 판매처 값 그대로 (다시 보내기로 고객이 판매처에서 바꾼 전시를 덮지 않는다)
  const sentBody = { ...built.body, smartstoreChannelProduct: { ...built.body.smartstoreChannelProduct, channelProductDisplayStatusType: m.display } }
  const requestJson = {
    ...(t.request_json || {}), body: sentBody, files: Object.fromEntries(ex.files.map(f => [f.key, f.path])), revisions: [...revisions, rev],
    categoryName: typeof body.categoryName === 'string' ? body.categoryName.slice(0, 300) : (t.request_json?.categoryName ?? null),
  }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${t.id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', prefer: 'return=minimal', body: { request_json: requestJson, result_json: { ...(t.result_json || {}), originProductNo: no, channelProductNo: channel, display: m.display, step: 'update' } } })
  console.info(`[marketplace] 스마트스토어 상품 수정 ${ctx.userId} send=${t.id} origin=${no} channel=${channel} 회차=${rev.n} 더 있는 상품=${found.extra}`)
  return res.status(200).json({ sendId: t.id, originProductNo: no, channelProductNo: channel, sellerProductId: no, status: t.status, display: m.display, updated: true, revision: rev.n, extra: found.extra })
}
async function smartstoreSend(ctx, body, res) {
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const input = smartstoreInput(body)
  // 입력 검사를 네이버를 부르기 전에 — 이미지 주소 자리는 검사용 값
  const pre = buildSmartstoreProduct({ ...input, repUrl: '-', detailUrls: ['-'] })
  if (!pre.ok) return sendError(res, 400, 'invalid_input', pre.message)
  const ssOver = detailImageOver(SMARTSTORE, ex.files.length) // 화면 빠짐 목록과 같은 규칙 (api/_marketDetailLimits.js)
  if (ssOver) return sendError(res, 400, 'invalid_input', detailImageServerMessage(ssOver.max))
  const rep = await squareFromImage(ctx, ex, body.repImageId, body.fit)
  if (rep.error) return sendError(res, 400, 'rep_image_invalid', rep.error)
  if (await sendInProgress(ctx, ex.id, SMARTSTORE)) return sendError(res, 409, 'send_in_progress', SEND_IN_PROGRESS_MESSAGE) // 토큰 받기 전 — 막히면 네이버 호출 없음
  const cred = await smartstoreCredentials(ctx, res)
  if (!cred) return
  // 다시 보내기 — 이 스토어에 살아 있는 같은 상품이 있으면 새로 등록하지 않고 그 상품을 수정한다 (원상품 조회 → 우리 칸만 덮기 → 수정)
  const account = await smartstoreAccountKey(ctx, cred)
  const found = await findUpdateTarget(ctx, res, { market: SMARTSTORE, exportId: ex.id, account, owner: s => smartstoreOwner(cred, s) })
  if (!found) return
  if (found.mode === 'modify') return await smartstoreUpdate(ctx, res, { cred, input, ex, rep, body, found })

  let created
  try {
    created = await sb(ctx.cfg, 'marketplace_sends?select=id', { method: 'POST', body: { user_id: ctx.userId, export_id: ex.id, market: SMARTSTORE, status: 'sending', request_json: {} }, prefer: 'return=representation' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error('[marketplace] 스마트스토어 전송 기록 실패 — marketplace_sends market 규칙에 smartstore 없음(docs/sql/2026-10-01-marketplace-sends-smartstore.sql 실행 필요):', e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  const sendId = created?.[0]?.id
  if (!sendId) throw new Error('marketplace_sends insert: id 없음')
  const fail = async (status, code, message, extra = {}) => {
    await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { status: 'failed', reason: message.slice(0, 2000), ...extra }, prefer: 'return=minimal' }).catch(e => console.error('[marketplace] 실패 기록도 못 남김:', sendId, e.message))
    return sendError(res, status, code, message)
  }
  const ssFail = (e, step) => {
    if (!(e instanceof SmartstoreError)) throw e
    if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 스마트스토어 ${step} 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    else console.warn(`[marketplace] 스마트스토어 ${step} 실패 ${e.code} (HTTP ${e.status}) send=${sendId}: ${e.raw}`)
    return fail(e.status === 429 ? 429 : 502, e.code, e.message, { result_json: { code: e.code, status: e.status, step, raw: e.raw } })
  }

  // ①② 이미지 준비·업로드 (수정과 같은 함수)
  const up = await uploadSmartstoreImages(ctx, cred, ex, rep, `send=${sendId}`)
  if (!up.ok) {
    if (up.error) return ssFail(up.error, up.step)
    return fail(up.status, up.code, up.message, up.extra)
  }
  const urls = up.urls
  // ③ 상품 등록
  const built = buildSmartstoreProduct({ ...input, repUrl: urls[0], detailUrls: urls.slice(1) })
  if (!built.ok) return fail(400, 'invalid_input', built.message)
  const requestJson = { body: built.body, categoryName: typeof body.categoryName === 'string' ? body.categoryName.slice(0, 300) : null, files: Object.fromEntries(ex.files.map(f => [f.key, f.path])) }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { request_json: requestJson }, prefer: 'return=minimal' })
  let r
  try { r = await smartstoreApi(cred, { method: 'POST', path: SS_PATHS.products, json: built.body, what: '등록' }) } catch (e) { return ssFail(e, 'product') }
  const nos = productNosOf(r.text)
  if (!nos.originProductNo) {
    const shape = { keys: r.json && typeof r.json === 'object' ? Object.keys(r.json).slice(0, 10) : typeof r.json }
    console.error('[marketplace] 스마트스토어 등록 응답에 originProductNo 없음:', sendId, JSON.stringify(shape))
    return fail(502, 'market_bad_json', '판매처가 상품 번호를 주지 않았습니다. 스마트스토어센터에서 상품이 등록되었는지 확인하세요.', { result_json: { code: 'market_bad_json', step: 'product', shape } })
  }
  const display = built.body.smartstoreChannelProduct.channelProductDisplayStatusType
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { seller_product_id: nos.originProductNo, status: 'registered', result_json: { originProductNo: nos.originProductNo, channelProductNo: nos.channelProductNo, display } }, prefer: 'return=minimal' })
  await recordSmartstoreAccount(ctx, sendId, cred)
  console.info(`[marketplace] 스마트스토어 상품 등록 ${ctx.userId} send=${sendId} origin=${nos.originProductNo} channel=${nos.channelProductNo} images=${urls.length} display=${display}`)
  return res.status(200).json({ sendId, originProductNo: nos.originProductNo, channelProductNo: nos.channelProductNo, sellerProductId: nos.originProductNo, status: 'registered', display })
}

// ── 11번가 상품 보내기 (2026-10-01) ── 규칙·근거는 api/_elevenst.js · api/_elevenstFields.js
// 카테고리 = 11번가 공개 조회(키·중계 없음) · 출고지/반품지·등록·판매중지 = 연결과 같은 중계 + openapikey(셀러 키). 판매자 주소록은 읽기만
// 기록: marketplace_sends(market '11st', sending → registered / failed, seller_product_id = 11번가 상품번호)
//   SQL docs/sql/2026-10-01-marketplace-sends-11st.sql 실행 전이면 기록을 만들 때 503 marketplace_sql_missing (11번가에 아무것도 보내기 전)
const ELEVENST_CATEGORY_TIMEOUT_MS = 25000
function elevenstFail(res, e, where) {
  if (!(e instanceof ElevenstError)) throw e
  if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 11번가 ${where} 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw} — MARKETPLACE_RELAY_URL·SECRET·relay.js 11st 대상 확인`)
  else console.warn(`[marketplace] 11번가 ${where} 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
  return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
}
/** 호출 재료 { relayUrl, relaySecret, apiKey, breakerKey } — 연결 전·복호화 실패면 응답을 보내고 null */
async function elevenstCredentials(ctx, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return null
  const row = await oneAccount(ctx, ELEVENST, `${ELEVENST_PUBLIC},access_key_enc`)
  if (!row?.access_key_enc) { sendError(res, 409, 'not_connected', '먼저 11번가를 연결하세요.'); return null }
  let apiKey
  try { apiKey = decryptSecret(row.access_key_enc, encKey) } catch (e) {
    console.error('[marketplace] 11번가 키 복호화 실패:', e.message)
    sendError(res, 500, 'decrypt_failed', '저장된 연결 정보를 읽지 못했습니다. 연결을 해제하고 다시 연결하세요.')
    return null
  }
  const m = marketConfig()
  return { relayUrl: m.relayUrl, relaySecret: m.relaySecret, apiKey, breakerKey: ctx.userId }
}
async function elevenstCategories(ctx, body, res) {
  const cred = await elevenstCredentials(ctx, res) // 연결된 사람만 (카테고리 조회 자체는 키가 필요 없다)
  if (!cred) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ELEVENST_CATEGORY_TIMEOUT_MS)
  let r, buf
  try {
    r = await fetch(ELEVENST_CATEGORY_URL, { headers: { Accept: 'application/xml' }, signal: controller.signal })
    buf = Buffer.from(await r.arrayBuffer())
  } catch (e) {
    console.error('[marketplace] 11번가 카테고리 조회 실패(연결):', e?.name === 'AbortError' ? 'timeout' : e?.message)
    return sendError(res, 502, 'market_server', '판매처가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.')
  } finally {
    clearTimeout(timer)
  }
  if (!r.ok) {
    console.error(`[marketplace] 11번가 카테고리 조회 HTTP ${r.status}`)
    return sendError(res, 502, 'market_server', '판매처가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.')
  }
  const categories = normalizeElevenstCategories(decodeXmlBytes(buf, r.headers.get('content-type')))
  if (!categories.length) console.error(`[marketplace] 11번가 카테고리 응답에 최하위가 없음 ${ctx.userId}: bytes=${buf.length}`)
  return res.status(200).json({ categories })
}
/** 마지막으로 등록에 성공한 11번가 보내기의 출고지·반품지 — 새 DB 칸 없이 그때 기록(request_json.summary)에서. 못 읽으면 기억 없이(원인 로그) */
async function lastElevenstAddressPair(ctx) {
  try {
    const rows = await sb(ctx.cfg, `marketplace_sends?select=summary:request_json->summary&user_id=eq.${ctx.userId}&market=eq.${ELEVENST}&seller_product_id=not.is.null&order=created_at.desc&limit=1`)
    return lastElevenstAddresses(rows?.[0]?.summary)
  } catch (e) {
    console.error('[marketplace] 11번가 마지막 출고지·반품지 조회 실패 — 목록 첫째로:', ctx.userId, e.message)
    return lastElevenstAddresses(null)
  }
}
async function elevenstAddresses(ctx, body, res) {
  const cred = await elevenstCredentials(ctx, res)
  if (!cred) return
  const lists = {}
  for (const [kind, path] of [['out', ELEVENST_PATHS.outbound], ['in', ELEVENST_PATHS.inbound]]) {
    let xml
    try { xml = await elevenstCall(cred, { method: 'GET', path, translate: (s, t) => translateElevenstApi(s, t, '요청') }) } catch (e) { return elevenstFail(res, e, `addresses/${kind}`) }
    const list = normalizeElevenstAddresses(xml)
    if (!list) {
      console.warn(`[marketplace] 11번가 주소 조회 결과가 SUCCESS 아님 ${ctx.userId} ${kind}: ${String(xml).slice(0, 300)}`)
      return sendError(res, 502, 'market_rejected', '판매처 주소록을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    lists[kind] = list
  }
  const last = await lastElevenstAddressPair(ctx)
  return res.status(200).json({ outAddresses: lists.out, inAddresses: lists.in, last, defaults: { out: pickElevenstAddress(lists.out, last.out), in: pickElevenstAddress(lists.in, last.in) } })
}
/** 화면 값 → 등록 재료 (이미지 주소는 기록을 만든 뒤에 채운다) */
function elevenstInput(body) {
  const num = v => (v === '' || v == null ? NaN : Number(v))
  const d = body.delivery && typeof body.delivery === 'object' ? body.delivery : {}
  const n = body.notice && typeof body.notice === 'object' ? body.notice : {}
  return {
    productName: body.productName, brand: body.brand, categoryId: body.categoryId, price: num(body.price), stock: num(body.stock), vat: body.vat,
    minorOk: body.minorOk !== false, kc: body.kc && typeof body.kc === 'object' ? body.kc : {}, kcCerts: body.kcCerts && typeof body.kcCerts === 'object' ? body.kcCerts : {},
    origin: body.origin && typeof body.origin === 'object' ? { kind: body.origin.kind, code: body.origin.code } : {},
    delivery: { feeType: d.feeType, fee: feeHasBase(d.feeType) ? num(d.fee) : undefined, freeOver: d.feeType === '03' ? num(d.freeOver) : undefined, jejuFee: num(d.jejuFee), islandFee: num(d.islandFee), returnFee: num(d.returnFee), exchangeFee: num(d.exchangeFee), outAddr: d.outAddr, inAddr: d.inAddr, sendCloseTmplt: d.sendCloseTmplt },
    asDetail: body.asDetail, rtngExchDetail: body.rtngExchDetail,
    // 고시 나머지 항목 { 항목 코드: 값 } — 글자만 받는다 (그 유형의 항목이 아닌 코드는 noticeItemsFor가 쓰지 않는다)
    notice: { type: n.type, maker: n.maker, country: n.country, phone: n.phone, items: n.items && typeof n.items === 'object' && !Array.isArray(n.items) ? Object.fromEntries(Object.entries(n.items).slice(0, 40).filter(([k, v]) => /^\d{1,12}$/.test(k) && typeof v === 'string').map(([k, v]) => [k, v.slice(0, 200)])) : {} },
    options: marketOptionsInput(body.options), // 옵션(싱글옵션)을 쓸 때만 화면이 보낸다 — 없으면 단일상품
  }
}
/**
 * 11번가 이미지 준비 + 본문 — 등록·수정이 같이 쓴다
 *   대표 이미지 = 우리 토큰 주소(11번가가 내려받아 복사 — 토큰은 기록 sendId의 request_json.files.rep를 읽는다)
 *   상세 이미지 = 판매용 공개 창고(영구 주소). 11번가는 상세 HTML 안 이미지를 복사하지 않아 토큰 주소(30분)를 쓰면 깨진다. 하나라도 실패하면 멈춘다
 * @returns {{ ok:true, built, files, publicImages } | { ok:false, status, code, message, extra? }}
 */
async function elevenstPrepare(ctx, { ex, rep, input, sendId, encKey, repName, sellerPrdCd, modify }) {
  const repPath = `${ex.folder}/marketplace/${repName}`
  try { await storageUpload(ctx.cfg, BUCKET, repPath, rep.buf, 'image/jpeg') } catch (e) {
    console.error('[marketplace] 11번가 대표 이미지 저장 실패:', repPath, e.message)
    return { ok: false, status: 500, code: 'storage_error', message: '대표 이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
  }
  const m = marketConfig()
  const urlOf = key => `${m.publicUrl}/api/marketplace?t=${makeImageToken(encKey, sendId, key)}`
  const files = { rep: repPath, ...Object.fromEntries(ex.files.map(f => [f.key, f.path])) }
  let published
  try { published = await publishMarketImages(ctx.cfg, { sourceBucket: BUCKET, files: ex.files }) } catch (e) {
    if (!(e instanceof MarketImagesError)) throw e
    console.error(`[marketplace] 11번가 상세 이미지 공개 창고 복사 실패 send=${sendId}:`, e.message, e.cause?.message ?? '', e.leftover.length ? `남은 경로 ${e.leftover.join(',')}` : '')
    return { ok: false, status: 500, code: 'market_images_failed', message: `상세 이미지를 올리지 못해 보내기를 멈췄습니다. (${e.message}) 잠시 후 다시 시도해 주세요.`, extra: { result_json: { step: 'images', message: e.message, leftover: e.leftover } } }
  }
  const publicImages = { bucket: published.bucket, folder: published.folder, paths: published.paths }
  const built = buildElevenstProduct({ ...input, repUrl: urlOf('rep'), detailUrls: elevenstDetailImageUrls({ files: ex.files, urlOf: key => published.urls[key] }), sellerPrdCd, modify })
  if (!built.ok) return { ok: false, status: 400, code: 'invalid_input', message: built.message, extra: { request_json: { files, publicImages } } }
  return { ok: true, built, files, publicImages }
}
/**
 * 11번가 다시 보내기 = 상품수정 PUT (2026-10-02 — 근거 api/_marketUpdate.js 머리 주석). 새 기록·새 상품을 만들지 않는다. 같은 기록에 회차 이력(request_json.revisions)
 *   본문 = 등록과 같은 함수(buildElevenstProduct)로 만든 Product XML 전체 + cuponcheck=S · 판매자 상품코드 = 기록에 있던 코드(없던 예전 기록이면 이번에 넣는다)
 *   11번가가 대표 이미지를 내려받을 때 이 기록의 files.rep를 읽으므로 PUT 전에 request_json을 새 값으로 저장하고, 실패하면 예전 값으로 되돌린다
 */
async function elevenstUpdate(ctx, res, { cred, input, ex, rep, body, found, encKey }) {
  const t = found.target
  const prdNo = String(t.seller_product_id)
  const revisions = revisionsOf(t)
  const n = revisions.length + 1
  const before = t.request_json || {}
  const code = isElevenstSellerCode(before.summary?.sellerPrdCd) ? before.summary.sellerPrdCd : elevenstSellerCode(ex.id)
  const prep = await elevenstPrepare(ctx, { ex, rep, input, sendId: t.id, encKey, repName: `${t.id}_rep_r${n}.jpg`, sellerPrdCd: code, modify: true })
  if (!prep.ok) return sendError(res, prep.status, prep.code, prep.message)
  const categoryName = typeof body.categoryName === 'string' ? body.categoryName.slice(0, 300) : (before.categoryName ?? null)
  const next = { ...before, summary: prep.built.summary, xml: prep.built.xml, files: prep.files, publicImages: prep.publicImages, categoryName }
  const patchRequest = rj => sb(ctx.cfg, `marketplace_sends?id=eq.${t.id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', prefer: 'return=minimal', body: { request_json: rj } })
  await patchRequest(next)
  const restore = () => patchRequest(before).catch(e => console.error('[marketplace] 11번가 수정 실패 뒤 기록 되돌리기도 실패:', t.id, e.message))
  let xml
  try {
    xml = await elevenstCall(cred, { method: 'PUT', path: ELEVENST_PATHS.modify(prdNo), body: prep.built.buf, contentType: 'text/xml', translate: (s, tx) => translateElevenstApi(s, tx, '수정') })
  } catch (e) {
    if (!(e instanceof ElevenstError)) throw e
    await restore()
    if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 11번가 수정 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    else console.warn(`[marketplace] 11번가 수정 실패 ${e.code} (HTTP ${e.status}) send=${t.id} prdNo=${prdNo}: ${e.raw}`)
    return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
  }
  const cm = parseModifyMessage(xml, prdNo)
  if (!cm.ok) {
    await restore()
    console.warn(`[marketplace] 11번가 수정 응답이 성공 아님 send=${t.id} prdNo=${prdNo} 응답 상품번호=${cm.productNo}: code=${cm.code} ${String(xml).slice(0, 300)}`)
    const settle = SETTLEMENT_ERROR_RE.test(cm.message)
    const message = settle ? SETTLEMENT_MESSAGE : cm.message ? `판매처에서 수정을 거절했습니다: ${cm.message.slice(0, 500)}` : '판매처가 수정 결과를 주지 않았습니다. 셀러오피스에서 상품을 확인하세요.'
    return sendError(res, 502, settle ? 'settlement_unverified' : 'market_rejected', message)
  }
  const rev = { n, at: new Date().toISOString(), via: 'modify', previousStatus: t.market_status || null, sellerPrdCd: code }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${t.id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', prefer: 'return=minimal', body: { request_json: { ...next, revisions: [...revisions, rev] }, result_json: { ...(t.result_json || {}), productNo: prdNo, resultCode: cm.code, message: cm.message, step: 'update' } } })
  console.info(`[marketplace] 11번가 상품 수정 ${ctx.userId} send=${t.id} prdNo=${prdNo} 회차=${n} 코드=${code === before.summary?.sellerPrdCd ? '기존' : '새로 넣음'} 더 있는 상품=${found.extra}`)
  return res.status(200).json({ sendId: t.id, productNo: prdNo, sellerProductId: prdNo, status: t.status, updated: true, revision: n, extra: found.extra, stopped: false, stopError: '' })
}
async function elevenstSend(ctx, body, res) {
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const input = elevenstInput(body)
  // 입력 검사를 11번가를 부르기 전에 — 이미지 주소 자리는 검사용 값
  const pre = buildElevenstProduct({ ...input, repUrl: '-', detailUrls: ['-'] })
  if (!pre.ok) return sendError(res, 400, 'invalid_input', pre.message)
  const esOver = detailImageOver(ELEVENST, ex.files.length) // 화면 빠짐 목록과 같은 규칙 (api/_marketDetailLimits.js)
  if (esOver) return sendError(res, 400, 'invalid_input', detailImageServerMessage(esOver.max))
  const testStop = body.testStop === true && ctx.isAdmin === true // 등록 직후 판매중지 — 관리자·스태프 테스트용만 (고객이 보내도 무시)
  const rep = await squareFromImage(ctx, ex, body.repImageId, body.fit)
  if (rep.error) return sendError(res, 400, 'rep_image_invalid', rep.error)
  if (await sendInProgress(ctx, ex.id, ELEVENST)) return sendError(res, 409, 'send_in_progress', SEND_IN_PROGRESS_MESSAGE)
  const cred = await elevenstCredentials(ctx, res)
  if (!cred) return
  const encKey = loadEncKey()
  // 다시 보내기 (2026-10-02) — 이 키(계정)에 살아 있는 같은 상품이 있으면 새로 등록하지 않고 그 상품을 수정한다 (판매자 상품코드 조회 → 상품수정 PUT, 근거 api/_marketUpdate.js)
  // 11번가는 계정 식별값을 기록하지 않는다(account null) — 주인은 이 키로 한 조회 결과(우리 상품번호가 있는지)로 확인한다
  const found = await findUpdateTarget(ctx, res, { market: ELEVENST, exportId: ex.id, account: null, owner: s => elevenstOwner(cred, s) })
  if (!found) return
  if (found.mode === 'modify') return await elevenstUpdate(ctx, res, { cred, input, ex, rep, body, found, encKey })

  let created
  try {
    created = await sb(ctx.cfg, 'marketplace_sends?select=id', { method: 'POST', body: { user_id: ctx.userId, export_id: ex.id, market: ELEVENST, status: 'sending', request_json: {} }, prefer: 'return=representation' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error('[marketplace] 11번가 전송 기록 실패 — marketplace_sends market 규칙에 11st 없음(docs/sql/2026-10-01-marketplace-sends-11st.sql 실행 필요):', e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  const sendId = created?.[0]?.id
  if (!sendId) throw new Error('marketplace_sends insert: id 없음')
  const fail = async (status, code, message, extra = {}) => {
    await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { status: 'failed', reason: message.slice(0, 2000), ...extra }, prefer: 'return=minimal' }).catch(e => console.error('[marketplace] 실패 기록도 못 남김:', sendId, e.message))
    return sendError(res, status, code, message)
  }

  // ①②③ 대표 이미지(토큰 주소)·상세 이미지(공개 창고 영구 주소)·등록 본문 — 수정과 같은 함수. 판매자 상품코드 = 내 상품 id (상태 조회 열쇠, 2026-10-02)
  const prep = await elevenstPrepare(ctx, { ex, rep, input, sendId, encKey, repName: `${sendId}_rep.jpg`, sellerPrdCd: elevenstSellerCode(ex.id), modify: false })
  if (!prep.ok) return fail(prep.status, prep.code, prep.message, prep.extra)
  const { built, files, publicImages } = prep
  const categoryName = typeof body.categoryName === 'string' ? body.categoryName.slice(0, 300) : null
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { request_json: { summary: built.summary, xml: built.xml, files, categoryName, publicImages } }, prefer: 'return=minimal' })
  // ④ 등록
  let xml
  try { xml = await elevenstCall(cred, { method: 'POST', path: ELEVENST_PATHS.product, body: built.buf, contentType: 'text/xml', translate: (s, t) => translateElevenstApi(s, t, '등록') }) } catch (e) {
    if (!(e instanceof ElevenstError)) throw e
    if (NOT_READY_CODES.includes(e.code)) console.error(`[marketplace] 11번가 등록 중계 문제 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    else console.warn(`[marketplace] 11번가 등록 실패 ${e.code} (HTTP ${e.status}) send=${sendId}: ${e.raw}`)
    return fail(e.status === 429 ? 429 : 502, e.code, e.message, { result_json: { code: e.code, status: e.status, step: 'product', raw: e.raw } })
  }
  const cm = parseClientMessage(xml)
  if (!cm.ok) {
    console.warn(`[marketplace] 11번가 등록 응답이 성공 아님 send=${sendId}: code=${cm.code} ${String(xml).slice(0, 300)}`)
    const settle = SETTLEMENT_ERROR_RE.test(cm.message) // 정산계좌 인증 — 화면 문구만 바꾸고 원문은 result_json.message에 그대로
    const message = settle ? SETTLEMENT_MESSAGE : cm.message ? `판매처에서 등록을 거절했습니다: ${cm.message.slice(0, 500)}` : '판매처가 상품 번호를 주지 않았습니다. 셀러오피스에서 상품이 등록되었는지 확인하세요.'
    return fail(502, settle ? 'settlement_unverified' : 'market_rejected', message, { result_json: { code: cm.code, step: 'product', message: cm.message } })
  }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { seller_product_id: cm.productNo, status: 'registered', result_json: { productNo: cm.productNo, resultCode: cm.code, message: cm.message } }, prefer: 'return=minimal' })
  console.info(`[marketplace] 11번가 상품 등록 ${ctx.userId} send=${sendId} prdNo=${cm.productNo} code=${cm.code} images=${ex.files.length + 1}`)
  // ⑤ 테스트용 판매중지 (관리자·스태프만) — 실패해도 등록은 그대로, 안내만
  let stopped = false, stopError = ''
  if (testStop) {
    try {
      await elevenstCall(cred, { method: 'PUT', path: ELEVENST_PATHS.stopDisplay(cm.productNo), translate: (s, t) => translateElevenstApi(s, t, '판매중지') })
      stopped = true
      await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { result_json: { productNo: cm.productNo, resultCode: cm.code, message: cm.message, stopped: true } }, prefer: 'return=minimal' })
    } catch (e) {
      if (!(e instanceof ElevenstError)) throw e
      console.warn(`[marketplace] 11번가 판매중지 실패 send=${sendId} prdNo=${cm.productNo} ${e.code}: ${e.raw}`)
      stopError = '등록은 완료되었지만 판매중지 처리에 실패했습니다. 셀러오피스에서 판매중지하세요.'
    }
  }
  return res.status(200).json({ sendId, productNo: cm.productNo, sellerProductId: cm.productNo, status: 'registered', stopped, stopError })
}

// ── 지그재그(카카오스타일) 연결·보내기 (2026-10-02) — 규칙·근거 api/_zigzag.js · api/_zigzagFields.js 머리 주석 ──
// 같은 표·같은 암호화: Access Key = access_key_enc · Secret Key = secret_key_enc · 스토어 이름 = seller_login_id(화면 표시) · 스토어 ID = market_account(계정 식별값)
// 호출은 중계 없이 바로(지그재그 문서에 IP 제한 없음) · 헤더 x-solution = KAKAOSTYLE_X_SOLUTION · 주소 = KAKAOSTYLE_API_URL(기본 운영)
// SQL docs/sql/2026-10-02-marketplace-zigzag.sql 실행 전이면 계정 저장·전송 기록에서 503 marketplace_sql_missing (원인 로그 — 지그재그에는 아무것도 보내기 전)
const ZIGZAG_SQL = 'docs/sql/2026-10-02-marketplace-zigzag.sql'
function zigzagFail(res, e, where) {
  if (!(e instanceof ZigzagError)) throw e
  if (e.code === 'zigzag_not_ready') console.error(`[marketplace] 지그재그 ${where}: KAKAOSTYLE_X_SOLUTION 환경변수 없음`)
  else console.warn(`[marketplace] 지그재그 ${where} 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
  return sendError(res, e.code === 'zigzag_not_ready' ? 503 : e.status === 429 ? 429 : 502, e.code, e.message)
}
function zigzagConfigOr(res, where) {
  const c = zigzagConfig()
  if (!c) {
    console.error(`[marketplace] 지그재그 ${where}: KAKAOSTYLE_X_SOLUTION 환경변수 없음 — 다른 값이면 상품이 전송되지 않으므로 부르지 않음`)
    sendError(res, 503, 'zigzag_not_ready', NOT_READY_MESSAGE)
  }
  return c
}
async function connectZigzag(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const ak = String(body.access_key ?? '').trim(), sk = String(body.secret_key ?? '').trim()
  const bad = zigzagKeyProblems({ accessKey: ak, secretKey: sk })
  if (bad.length) return sendError(res, 400, 'invalid_input', `${bad.join('·')}를 넣어 주세요.`)
  const cfg = zigzagConfigOr(res, 'connect')
  if (!cfg) return
  // 연결 확인 = 스토어 정보 조회(문서 필요 권한 GET-PRODUCT). 상품갱신(UPDATE-PRODUCT) 권한은 조회로 확인할 수 없다 — 첫 보내기에서 판매처 응답으로 안내
  let shop
  try { shop = normalizeShop((await zigzagCall({ ...cfg, accessKey: ak, secretKey: sk, breakerKey: ctx.userId }, { query: ZQ.shop })).shop) } catch (e) { return zigzagFail(res, e, 'connect') }
  if (!shop) {
    console.warn('[marketplace] 지그재그 connect: 스토어 정보가 비어 있음', ctx.userId)
    return sendError(res, 502, 'shop_not_ready', ZIGZAG_ERRORS.shop_not_ready)
  }
  const row = {
    user_id: ctx.userId, market: ZIGZAG, seller_login_id: (shop.shopName || shop.shopId).slice(0, 100), vendor_id: null,
    access_key_enc: encryptSecret(ak, encKey), secret_key_enc: encryptSecret(sk, encKey), key_last4: ak.slice(-4).replace(/[^A-Za-z0-9-]/g, '-'),
    expires_at: null, status: 'connected', last_checked_at: new Date().toISOString(), last_error: null, market_account: shop.shopId.slice(0, 100),
  }
  try {
    await sb(ctx.cfg, 'marketplace_accounts?on_conflict=user_id,market', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error(`[marketplace] 지그재그 계정 저장 실패 — marketplace_accounts market 체크에 zigzag 없음(${ZIGZAG_SQL} 실행 필요):`, e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  console.info(`[marketplace] 지그재그 연결 ${ctx.userId} shop=${shop.shopId} 판매채널 ZIGZAG·KR=${shop.zigzagKr}`)
  return marketStatus(ctx, body, res)
}
async function disconnectZigzag(ctx, body, res) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${ZIGZAG}`, { method: 'DELETE', prefer: 'return=minimal' })
  return marketStatus(ctx, body, res)
}
/** 호출 재료 { url, solution, accessKey, secretKey, breakerKey, shopId } — 연결 전·설정 없음·복호화 실패면 응답을 보내고 null */
async function zigzagCredentials(ctx, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return null
  const row = await oneAccount(ctx, ZIGZAG, `${ELEVENST_PUBLIC},access_key_enc,secret_key_enc,market_account`)
  if (!row?.access_key_enc || !row?.secret_key_enc) { sendError(res, 409, 'not_connected', '먼저 지그재그를 연결하세요.'); return null }
  const cfg = zigzagConfigOr(res, 'credentials')
  if (!cfg) return null
  let accessKey, secretKey
  try { accessKey = decryptSecret(row.access_key_enc, encKey); secretKey = decryptSecret(row.secret_key_enc, encKey) } catch (e) {
    console.error('[marketplace] 지그재그 키 복호화 실패:', e.message)
    sendError(res, 500, 'decrypt_failed', '저장된 연결 정보를 읽지 못했습니다. 연결을 해제하고 다시 연결하세요.')
    return null
  }
  return { ...cfg, accessKey, secretKey, breakerKey: ctx.userId, shopId: row.market_account || null }
}
/** 마지막으로 등록에 성공한 지그재그 보내기의 반송지 (기록 request_json.summary.returnId) — 못 읽으면 null (원인 로그) */
async function lastZigzagReturnId(ctx) {
  try {
    const rows = await sb(ctx.cfg, `marketplace_sends?select=summary:request_json->summary&user_id=eq.${ctx.userId}&market=eq.${ZIGZAG}&seller_product_id=not.is.null&order=created_at.desc&limit=1`)
    const id = rows?.[0]?.summary?.returnId
    return /^\d{1,20}$/.test(String(id ?? '')) ? String(id) : null
  } catch (e) {
    console.error('[marketplace] 지그재그 마지막 반송지 조회 실패 — 기본 주소로:', ctx.userId, e.message)
    return null
  }
}
/** 보내기 창 재료 — 스토어(브랜드·판매 채널)·카테고리·고시 템플릿·배송주소록 (모두 GET-PRODUCT 조회) */
async function zigzagMeta(ctx, body, res) {
  const cred = await zigzagCredentials(ctx, res)
  if (!cred) return
  try {
    const shop = normalizeShop((await zigzagCall(cred, { query: ZQ.shop })).shop)
    const categories = normalizeZigzagCategories((await zigzagCall(cred, { query: ZQ.category })).category)
    const templates = normalizeEssentialTemplates((await zigzagCall(cred, { query: ZQ.essentials })).getAllEssentialTemplate)
    const addresses = []
    for (let page = 0; page < Z_ADDRESS_PAGES_MAX; page++) {
      const d = (await zigzagCall(cred, { query: ZQ.addresses, variables: { limit_count: Z_ADDRESS_PAGE, skip_count: page * Z_ADDRESS_PAGE } })).shop_shipping_address_list
      addresses.push(...normalizeZigzagAddresses(d?.item_list))
      if (addresses.length >= Number(d?.total_count || 0) || !(d?.item_list || []).length) break
      if (page === Z_ADDRESS_PAGES_MAX - 1) console.error(`[marketplace] 지그재그 배송주소록이 ${Z_ADDRESS_PAGE * Z_ADDRESS_PAGES_MAX}개를 넘음 — 앞부분만 ${ctx.userId}`)
    }
    if (!categories.length) console.error(`[marketplace] 지그재그 카테고리 응답에 최하위가 없음 ${ctx.userId}`)
    if (!templates.length) console.error(`[marketplace] 지그재그 고시 템플릿 응답이 비어 있음(모양 다름?) ${ctx.userId}`)
    return res.status(200).json({ shop, categories, templates, addresses, lastReturnId: await lastZigzagReturnId(ctx) })
  } catch (e) { return zigzagFail(res, e, 'meta') }
}
/** 화면 값 → 상품 입력 재료 (이미지 주소는 올린 뒤에 채운다) */
function zigzagInput(body) {
  const num = v => (v === '' || v == null ? NaN : Number(v))
  const d = body.delivery && typeof body.delivery === 'object' ? body.delivery : {}
  const ess = body.essentials && typeof body.essentials === 'object' && !Array.isArray(body.essentials) ? body.essentials : {}
  return {
    productName: body.productName, price: num(body.price), listPrice: body.listPrice === '' || body.listPrice == null ? null : num(body.listPrice), stock: num(body.stock),
    options: marketOptionsInput(body.options), categoryId: body.categoryId, essentialCode: body.essentialCode,
    // 고시 칸 이름(key·name)은 고른 템플릿 그대로 화면이 보낸다(getAllEssentialTemplate) — 글자만 받는다
    essentialFields: (Array.isArray(body.essentialFields) ? body.essentialFields : []).slice(0, 60).filter(f => typeof f?.key === 'string' && typeof f?.name === 'string').map(f => ({ key: f.key.slice(0, 100), name: f.name.slice(0, 200) })),
    essentials: Object.fromEntries(Object.entries(ess).slice(0, 60).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k.slice(0, 100), v.slice(0, 1000)])),
    display: body.display,
    delivery: { feeType: d.feeType, baseFee: num(d.baseFee), freeOver: num(d.freeOver), jejuFee: num(d.jejuFee), isolatedFee: num(d.isolatedFee), returnFee: num(d.returnFee), partialReturnFee: num(d.partialReturnFee), exchangeFee: num(d.exchangeFee), shippingDays: num(d.shippingDays), bundle: d.bundle, returnId: d.returnId },
    taxType: body.taxType, parallel: body.parallel, overseas: body.overseas === true, brandId: body.brandId,
  }
}
/** 지그재그 상품 조회로 주인 확인 — 이 스토어 키로 조회되면 이 스토어 상품(문서: 상품이 없으면 null). 조회 결과(current)는 갱신 입력의 id 재료 */
async function zigzagOwner(cred, s) {
  try {
    const p = (await zigzagCall(cred, { query: ZQ.product, variables: { id: String(s.seller_product_id) } })).product
    if (!p) return { who: 'none' }
    if (p.sales_status === 'CLOSED') return { who: 'none' } // 문서: CLOSED = 삭제
    return { who: 'mine', current: p }
  } catch (e) {
    if (!(e instanceof ZigzagError)) throw e
    return { who: 'unknown', status: e.status === 429 ? 429 : 502, code: e.code, message: e.message, raw: e.raw }
  }
}
/** 대표 이미지(정사각형 JPG) + 내 상품 파일 → 판매용 공개 창고(영구 주소). 하나라도 실패하면 멈춘다 */
async function zigzagImages(ctx, { ex, rep, repName }) {
  const repPath = `${ex.folder}/marketplace/${repName}`
  try { await storageUpload(ctx.cfg, BUCKET, repPath, rep.buf, 'image/jpeg') } catch (e) {
    console.error('[marketplace] 지그재그 대표 이미지 저장 실패:', repPath, e.message)
    return { ok: false, status: 500, code: 'storage_error', message: '대표 이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
  }
  const all = [{ key: 'rep', path: repPath }, ...ex.files.map(f => ({ key: f.key, path: f.path }))]
  try {
    const published = await publishMarketImages(ctx.cfg, { sourceBucket: BUCKET, files: all })
    return { ok: true, urls: published.urls, files: Object.fromEntries(all.map(f => [f.key, f.path])), publicImages: { bucket: published.bucket, folder: published.folder, paths: published.paths } }
  } catch (e) {
    if (!(e instanceof MarketImagesError)) throw e
    console.error('[marketplace] 지그재그 이미지 공개 창고 복사 실패:', e.message, e.cause?.message ?? '', e.leftover.length ? `남은 경로 ${e.leftover.join(',')}` : '')
    return { ok: false, status: 500, code: 'market_images_failed', message: `이미지를 올리지 못해 보내기를 멈췄습니다. (${e.message}) 잠시 후 다시 시도해 주세요.`, extra: { result_json: { step: 'images', message: e.message, leftover: e.leftover } } }
  }
}
/** auditor = 셀러의 솔루션사 로그인 아이디(카카오스타일 Open API FAQ) — 우리 서비스 로그인 아이디 = 로그인 이메일(토큰 email). 없으면 넣지 않는다(원인 로그) */
function zigzagAuditor(ctx) {
  if (typeof ctx.email === 'string' && ctx.email) return ctx.email
  console.warn('[marketplace] 지그재그 auditor: 로그인 이메일이 없어 수정자 칸을 비움', ctx.userId)
  return ''
}
const zigzagSources = (ex, rep) => ({ rep: sha16(rep.buf), files: ex.files.map(f => f.path) })
/**
 * 지그재그 다시 보내기 = 상품 갱신 (문서 상품 갱신 — 생성과 같은 입력 + id). 새 기록·새 상품을 만들지 않는다. 같은 기록에 회차 이력
 *   내용이 지난번과 같고 재고만 바뀌면 아이템 재고 갱신(updateItemAvailableStockQuantity)만 · 바뀐 것이 없으면 호출 없음
 *   실패하면 기록은 그대로(기록은 판매처 성공 뒤에만 바꾼다 — 이미지는 공개 창고 영구 주소라 기록이 미리 바뀔 필요가 없다)
 */
async function zigzagUpdate(ctx, res, { cred, input, ex, rep, body, found }) {
  const t = found.target
  const id = String(t.seller_product_id)
  const before = t.request_json || {}
  const revisions = revisionsOf(t)
  const n = revisions.length + 1
  const sources = zigzagSources(ex, rep)
  const cmp = buildZigzagProduct({ ...input, repUrl: '-', detailUrls: ex.files.map(() => '-'), exportId: ex.id })
  if (!cmp.ok) return sendError(res, 400, 'invalid_input', cmp.message)
  const contentKey = zigzagContentKey(cmp.input, sources)
  const changes = zigzagStockChanges({ sameContent: before.contentKey === contentKey, productId: id, merged: mergeZigzagUpdate(found.current, cmp.input).input, cur: found.current })
  const save = async (patch, rev) => sb(ctx.cfg, `marketplace_sends?id=eq.${t.id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', prefer: 'return=minimal', body: { request_json: { ...before, ...patch, revisions: [...revisions, rev] }, result_json: { ...(t.result_json || {}), productId: id, step: 'update', way: rev.way } } })
  if (changes && !changes.length) {
    console.info(`[marketplace] 지그재그 바뀐 것 없음 — 호출 안 함 ${ctx.userId} send=${t.id} product=${id}`)
    return res.status(200).json({ sendId: t.id, productId: id, sellerProductId: id, status: t.status, updated: true, way: 'none', extra: found.extra })
  }
  if (changes) {
    try { await zigzagCall(cred, { query: ZQ.stock, variables: { input: changes } }) } catch (e) { return zigzagFail(res, e, 'update/stock') }
    const items = (before.input?.item_list || []).map((it, i) => ({ ...it, inventory: cmp.input.item_list[i]?.inventory ?? it.inventory, sales_status: cmp.input.item_list[i]?.sales_status ?? it.sales_status }))
    await save({ input: { ...(before.input || {}), item_list: items }, summary: { ...(before.summary || {}), stock: cmp.summary.stock } }, { n, at: new Date().toISOString(), via: 'modify', way: 'stock', previousStatus: t.market_status || null, changed: changes.length })
    console.info(`[marketplace] 지그재그 재고만 변경 ${ctx.userId} send=${t.id} product=${id} 품목 ${changes.length}개 회차=${n}`)
    return res.status(200).json({ sendId: t.id, productId: id, sellerProductId: id, status: t.status, updated: true, way: 'stock', revision: n, extra: found.extra })
  }
  const img = await zigzagImages(ctx, { ex, rep, repName: `${t.id}_rep_r${n}.jpg` })
  if (!img.ok) return sendError(res, img.status, img.code, img.message)
  const built = buildZigzagProduct({ ...input, repUrl: img.urls.rep, detailUrls: ex.files.map(f => img.urls[f.key]), exportId: ex.id, auditor: zigzagAuditor(ctx) })
  if (!built.ok) return sendError(res, 400, 'invalid_input', built.message)
  const merged = mergeZigzagUpdate(found.current, built.input)
  let data
  try { data = await zigzagCall(cred, { query: ZQ.update, variables: { input: merged.input } }) } catch (e) { return zigzagFail(res, e, 'update/product') }
  if (data?.updateProduct !== true) {
    console.warn(`[marketplace] 지그재그 상품 갱신 응답이 true가 아님 send=${t.id} product=${id}:`, JSON.stringify(data).slice(0, 200))
    return sendError(res, 502, 'market_rejected', '판매처가 수정 결과를 주지 않았습니다. 파트너센터에서 상품을 확인하세요.')
  }
  const categoryName = typeof body.categoryName === 'string' ? body.categoryName.slice(0, 300) : (before.categoryName ?? null)
  await save({ input: built.input, summary: built.summary, files: img.files, publicImages: img.publicImages, categoryName, contentKey },
    { n, at: new Date().toISOString(), via: 'modify', way: 'modify', previousStatus: t.market_status || null, itemIds: merged.itemIds.map(x => x.id) })
  console.info(`[marketplace] 지그재그 상품 갱신 ${ctx.userId} send=${t.id} product=${id} 회차=${n} 품목 ${merged.itemIds.length}개(기존 id ${merged.itemIds.filter(x => x.id).length}) 더 있는 상품=${found.extra}`)
  return res.status(200).json({ sendId: t.id, productId: id, sellerProductId: id, status: t.status, updated: true, way: 'modify', revision: n, extra: found.extra, display: built.input.display_status })
}
async function zigzagSend(ctx, body, res) {
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const input = zigzagInput(body)
  const pre = buildZigzagProduct({ ...input, repUrl: '-', detailUrls: ['-'] }) // 입력 검사를 지그재그를 부르기 전에
  if (!pre.ok) return sendError(res, 400, 'invalid_input', pre.message)
  const rep = await squareFromImage(ctx, ex, body.repImageId, body.fit)
  if (rep.error) return sendError(res, 400, 'rep_image_invalid', rep.error)
  if (await sendInProgress(ctx, ex.id, ZIGZAG)) return sendError(res, 409, 'send_in_progress', SEND_IN_PROGRESS_MESSAGE)
  const cred = await zigzagCredentials(ctx, res)
  if (!cred) return
  // 다시 보내기 — 이 스토어에 살아 있는 같은 상품이 있으면 새로 등록하지 않고 갱신한다 (계정 식별값 = 스토어 ID)
  const found = await findUpdateTarget(ctx, res, { market: ZIGZAG, exportId: ex.id, account: cred.shopId, owner: s => zigzagOwner(cred, s) })
  if (!found) return
  if (found.mode === 'modify') return await zigzagUpdate(ctx, res, { cred, input, ex, rep, body, found })

  let created
  try {
    created = await sb(ctx.cfg, 'marketplace_sends?select=id', { method: 'POST', body: { user_id: ctx.userId, export_id: ex.id, market: ZIGZAG, status: 'sending', request_json: {} }, prefer: 'return=representation' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error(`[marketplace] 지그재그 전송 기록 실패 — marketplace_sends market 규칙에 zigzag 없음(${ZIGZAG_SQL} 실행 필요):`, e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  const sendId = created?.[0]?.id
  if (!sendId) throw new Error('marketplace_sends insert: id 없음')
  const fail = async (status, code, message, extra = {}) => {
    await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { status: 'failed', reason: message.slice(0, 2000), ...extra }, prefer: 'return=minimal' }).catch(e => console.error('[marketplace] 실패 기록도 못 남김:', sendId, e.message))
    return sendError(res, status, code, message)
  }
  const img = await zigzagImages(ctx, { ex, rep, repName: `${sendId}_rep.jpg` })
  if (!img.ok) return fail(img.status, img.code, img.message, img.extra)
  const built = buildZigzagProduct({ ...input, repUrl: img.urls.rep, detailUrls: ex.files.map(f => img.urls[f.key]), exportId: ex.id, auditor: zigzagAuditor(ctx) })
  if (!built.ok) return fail(400, 'invalid_input', built.message)
  const cmp = buildZigzagProduct({ ...input, repUrl: '-', detailUrls: ex.files.map(() => '-'), exportId: ex.id })
  const categoryName = typeof body.categoryName === 'string' ? body.categoryName.slice(0, 300) : null
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', prefer: 'return=minimal', body: { request_json: { input: built.input, summary: built.summary, files: img.files, publicImages: img.publicImages, categoryName, contentKey: zigzagContentKey(cmp.input, zigzagSources(ex, rep)) } } })
  let data
  try { data = await zigzagCall(cred, { query: ZQ.create, variables: { input: built.input } }) } catch (e) {
    if (!(e instanceof ZigzagError)) throw e
    if (e.code === 'zigzag_not_ready') console.error('[marketplace] 지그재그 등록: KAKAOSTYLE_X_SOLUTION 환경변수 없음')
    else console.warn(`[marketplace] 지그재그 등록 실패 ${e.code} (HTTP ${e.status}) send=${sendId}: ${e.raw}`)
    return fail(e.status === 429 ? 429 : 502, e.code, e.message, { result_json: { code: e.code, status: e.status, step: 'product', raw: e.raw } })
  }
  const productId = data?.createProduct != null ? String(data.createProduct) : ''
  if (!/^\d{1,20}$/.test(productId)) {
    console.error('[marketplace] 지그재그 등록 응답의 상품 ID가 숫자가 아님(seller_product_id 규칙 밖):', sendId, productId.slice(0, 60))
    return fail(502, 'market_bad_json', '판매처가 상품 번호를 주지 않았습니다. 파트너센터에서 상품이 등록되었는지 확인하세요.', { result_json: { code: 'market_bad_json', step: 'product', productId: productId.slice(0, 60) } })
  }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { seller_product_id: productId, status: 'registered', result_json: { productId, display: built.input.display_status } }, prefer: 'return=minimal' })
  await recordSendAccount(ctx, sendId, cred.shopId)
  console.info(`[marketplace] 지그재그 상품 등록 ${ctx.userId} send=${sendId} product=${productId} 품목 ${built.input.item_list.length}개 images=${ex.files.length + 1}`)
  return res.status(200).json({ sendId, productId, sellerProductId: productId, status: 'registered', display: built.input.display_status })
}

async function disconnectElevenst(ctx, body, res) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${ELEVENST}`, { method: 'DELETE', prefer: 'return=minimal' })
  return marketStatus(ctx, body, res)
}
async function withCredentials(ctx, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return null
  let cred
  try { cred = await loadCredentials(ctx, encKey) } catch (e) {
    console.error('[marketplace] 키 복호화 실패:', e.message)
    sendError(res, 500, 'decrypt_failed', '저장된 키를 읽지 못했어요. 연결을 해제하고 다시 연결해 주세요.')
    return null
  }
  if (!cred) { sendError(res, 409, 'not_connected', '먼저 쿠팡을 연결해 주세요.'); return null }
  if (daysLeft(cred.row.expires_at) < 0) { sendError(res, 409, 'key_expired', '키 유효기간이 지났어요. Wing에서 재발급한 키로 다시 연결해 주세요.'); return null }
  return cred
}
async function markChecked(ctx, ok, err) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${MARKET}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: ok ? { status: 'connected', last_checked_at: new Date().toISOString(), last_error: null } : { status: 'invalid', last_error: String(err).slice(0, 500) },
  })
}

async function refreshPlaces(ctx, body, res) {
  const cred = await withCredentials(ctx, res)
  if (!cred) return
  let places
  try { places = await fetchPlaces(cred.call) } catch (e) {
    if (e instanceof CoupangError && ['bad_key', 'ip_not_allowed', 'bad_vendor'].includes(e.code)) await markChecked(ctx, false, e.message)
    return coupangFail(res, e, 'refresh_places')
  }
  await savePlaces(ctx, places)
  await markChecked(ctx, true)
  return status(ctx, body, res)
}

// ── 템플릿 ──
async function loadTemplates(ctx) {
  const rows = await sb(ctx.cfg, `marketplace_templates?select=${TEMPLATE_SELECT}&user_id=eq.${ctx.userId}&market=eq.${MARKET}&order=is_default.desc,created_at`)
  return Array.isArray(rows) ? rows : []
}
async function templatesList(ctx, body, res) {
  return res.status(200).json({ templates: await loadTemplates(ctx), places: await loadPlaces(ctx), deliveryCompanies: DELIVERY_COMPANIES })
}
async function templateSave(ctx, body, res) {
  const t = body.template && typeof body.template === 'object' ? body.template : {}
  const v = validateTemplate(t, await loadPlaces(ctx))
  if (!v.ok) return sendError(res, 400, 'template_invalid', v.message)
  const id = t.id ? String(t.id).toLowerCase() : null
  if (id && !UUID_RE.test(id)) return sendError(res, 400, 'invalid_input', '템플릿 id 형식이 올바르지 않아요.')
  if (v.value.is_default) {
    await sb(ctx.cfg, `marketplace_templates?user_id=eq.${ctx.userId}&market=eq.${MARKET}`, { method: 'PATCH', body: { is_default: false }, prefer: 'return=minimal' })
  }
  let saved
  try {
    if (id) {
      saved = await sb(ctx.cfg, `marketplace_templates?id=eq.${id}&user_id=eq.${ctx.userId}&select=${TEMPLATE_SELECT}`, { method: 'PATCH', body: v.value, prefer: 'return=representation' })
      if (!Array.isArray(saved) || !saved[0]) return sendError(res, 404, 'not_found', '템플릿을 찾을 수 없어요.')
    } else {
      saved = await sb(ctx.cfg, `marketplace_templates?select=${TEMPLATE_SELECT}`, { method: 'POST', body: { user_id: ctx.userId, market: MARKET, ...v.value }, prefer: 'return=representation' })
    }
  } catch (e) {
    if (e.status === 409) return sendError(res, 409, 'template_duplicate', '같은 이름의 템플릿이 이미 있어요.')
    throw e
  }
  return res.status(200).json({ template: saved[0] })
}
async function templateDelete(ctx, body, res) {
  const id = String(body.id ?? '').toLowerCase()
  if (!UUID_RE.test(id)) return sendError(res, 400, 'invalid_input', '템플릿 id 형식이 올바르지 않아요.')
  await sb(ctx.cfg, `marketplace_templates?id=eq.${id}&user_id=eq.${ctx.userId}`, { method: 'DELETE', prefer: 'return=minimal' })
  return res.status(200).json({ ok: true })
}

// ── 보내기 ──
async function loadOwnedExport(ctx, body, res) {
  const id = String(body.exportId ?? '').trim().toLowerCase()
  if (!UUID_RE.test(id)) { sendError(res, 400, 'invalid_input', 'exportId 형식이 올바르지 않아요.'); return null }
  const rows = await sb(ctx.cfg, `studio_exports?select=id,project_id,folder,title,format,mode,files&id=eq.${id}&user_id=eq.${ctx.userId}&limit=1`)
  const ex = Array.isArray(rows) ? rows[0] : null
  if (!ex || !Array.isArray(ex.files) || !ex.files.length) { sendError(res, 404, 'not_found', '내 상품을 찾을 수 없어요. 목록을 새로고침해 주세요.'); return null }
  return ex
}
/**
 * 그 작업이 1688에서 가져온 상품이면 저장해 둔 상품 정보(제목·속성·옵션 줄) + 번역 캐시에 있는 한국어. 아니면 null.
 * 외부 호출 없음(OneBound·번역 API를 부르지 않는다). 가격은 1688 원본(위안) 그대로 — 원화 판매가는 만들지 않는다.
 */
async function loadSource(ctx, offerId) {
  if (!OFFER_ID_RE.test(String(offerId ?? ''))) return null
  const rows = await sb(ctx.cfg, `studio_product_snapshots?select=status,item:raw->item&offer_id=eq.${offerId}&limit=1`)
  const snap = Array.isArray(rows) && rows.length ? rows[0] : null
  if (!snap || snap.status !== 'ok' || !snap.item) {
    console.info(`[marketplace] send_prepare ${offerId}: 저장된 상품 정보 없음 (status=${snap?.status ?? '행 없음'})`)
    return null
  }
  const facts = extractFacts(snap.item)
  const skus = extractSkus1688(snap.item)
  const texts = new Set(factTexts(facts))
  for (const r of skus.rows) for (const v of r.values) { texts.add(v.name); texts.add(v.value) }
  let ko = new Map()
  try { ko = await lookupCachedTranslations([...texts], CACHE_SOURCE_LANG, CACHE_TARGET_LANG) } catch (e) {
    console.error(`[marketplace] send_prepare ${offerId}: 번역 캐시 조회 실패 — 원문만 보냄:`, e.message)
  }
  const pair = zh => { const t = ko.get(zh); return { zh, ko: typeof t === 'string' && t.trim() && t !== zh ? t.trim() : null } }
  return {
    from: '1688', offerId: String(offerId), ...withKo(facts, ko), skuTotal: skus.total,
    skus: skus.rows.map(r => ({ skuId: r.skuId, specId: r.specId, values: r.values.map(v => ({ name: pair(v.name), value: pair(v.value) })), priceCny: r.priceCny, stock: r.stock, imageUrl: r.imageUrl })),
  }
}
/** 다시 보낼 전송 — 내 것이고 반려 상태이고 쿠팡 상품 번호가 있어야 한다. 아니면 응답을 보내고 null */
async function loadRejectedSend(ctx, resendId, res) {
  const id = String(resendId ?? '').trim().toLowerCase()
  if (!UUID_RE.test(id)) { sendError(res, 400, 'invalid_input', 'resendId 형식이 올바르지 않아요.'); return null }
  const rows = await sb(ctx.cfg, `marketplace_sends?select=${SEND_SELECT}&id=eq.${id}&user_id=eq.${ctx.userId}&market=eq.${MARKET}&limit=1`)
  const s = Array.isArray(rows) ? rows[0] : null
  if (!s) { sendError(res, 404, 'not_found', '보낸 상품을 찾을 수 없어요. 목록을 새로고침해 주세요.'); return null }
  if (s.status !== 'rejected' || !/^\d{1,20}$/.test(String(s.seller_product_id || ''))) { sendError(res, 409, 'not_rejected', '반려된 상품만 고쳐서 다시 보낼 수 있습니다. [지금 확인]을 누르세요.'); return null }
  if (!s.export_id) { sendError(res, 404, 'not_found', '내 상품을 찾을 수 없어요. 목록을 새로고침해 주세요.'); return null }
  return s
}
const revisionsOf = s => (Array.isArray(s?.request_json?.revisions) ? s.request_json.revisions : [])
/**
 * 보내기 창 — 판매처마다 이미 있는 상품 (판매처를 부르지 않는다 — DB 기록·저장된 계정 식별값만).
 * 계정 기록이 없는 예전 기록도 "수정"으로 보이고, 보낼 때 서버가 판매처 조회로 확인한다(findUpdateTarget)
 */
async function existingInMarkets(ctx, exportId) {
  const markets = Object.keys(UPDATE_MODES)
  // option_links·prev_items = 쿠팡 기록만 값이 있다 (2026-10-02 — 옵션 이름 연결을 다시 쓰고, 옵션 구성이 바뀌는지 보내기 창이 본다)
  // 같은 작업의 내 상품 전부에서 찾는다 (projectExportIds — 보낼 때 findUpdateTarget과 같은 범위)
  const ids = await projectExportIds(ctx, exportId)
  const rows = await sb(ctx.cfg, `marketplace_sends?select=id,market,status,seller_product_id,market_account,created_at,option_links:request_json->optionLinks,prev_items:request_json->body->items&user_id=eq.${ctx.userId}&export_id=in.(${ids.join(',')})&market=in.(${markets.join(',')})&status=in.(${LIVE_SEND_STATUSES.join(',')})&seller_product_id=not.is.null`)
  const list = (Array.isArray(rows) ? rows : []).map(r => ({ ...r, sellerProductId: r.seller_product_id, account: r.market_account, createdAt: r.created_at }))
  if (!list.length) return {}
  const accounts = await currentAccounts(ctx)
  const out = {}
  for (const m of markets) {
    const plan = updatePlan(list.filter(r => r.market === m), m, accounts[m] ?? null)
    if (plan.mode === 'create') continue
    out[m] = { mode: plan.mode, sendId: plan.target.id, sellerProductId: String(plan.target.seller_product_id), status: plan.target.status, extra: plan.extra }
    if (m === MARKET) {
      out[m].optionLinks = cleanOptionLinks(plan.target.option_links)
      out[m].itemNames = (Array.isArray(plan.target.prev_items) ? plan.target.prev_items : []).map(it => String(it?.itemName ?? '').trim()).filter(Boolean)
    }
  }
  return out
}
/**
 * 작업의 1688 제목(title_zh) → 번역 캐시의 한국어 (2026-10-02 ②-1 — 보내기 창 제목에 중국어를 보이지 않게). 외부 호출 없음. 없거나 실패면 ''(원인 로그)
 *   화면 표시용이다 — 상품명 입력칸에는 넣지 않는다
 */
async function titleKoOf(titleZh) {
  const zh = typeof titleZh === 'string' ? titleZh.trim() : ''
  if (!zh) return ''
  try {
    const t = (await lookupCachedTranslations([zh], CACHE_SOURCE_LANG, CACHE_TARGET_LANG)).get(zh)
    return typeof t === 'string' && t.trim() && t.trim() !== zh ? t.trim() : ''
  } catch (e) {
    console.error('[marketplace] send_prepare: 제목 번역 캐시 조회 실패 — 이름 없이 보냄:', e.message)
    return ''
  }
}
/** 이 고객이 이 1688 상품을 주문한 옵션 — 결제 확인된 주문만(ORDER_OK_STATUSES), 최근 ORDERED_ORDERS_MAX건 (규칙·근거 api/_marketOrdered.js) */
async function loadOrdered(ctx, offerId) {
  if (!OFFER_ID_RE.test(String(offerId ?? ''))) return []
  const rows = await sb(ctx.cfg, `orders?select=order_number,items&user_id=eq.${ctx.userId}&status=in.(${ORDER_OK_STATUSES.join(',')})&order=created_at.desc&limit=${ORDERED_ORDERS_MAX}`)
  return orderedOptionsOf(rows, String(offerId))
}
const SIGN_POOL = 8 // 사진 서명 주소를 동시에 만드는 수
/** items를 n개씩 동시에 worker로 — 결과 순서는 items 순서 그대로 */
async function runSignPool(items, n, worker) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await worker(items[i]) }
  }))
  return out
}
async function sendPrepare(ctx, body, res) {
  let prev = null
  if (body.resendId != null) {
    prev = await loadRejectedSend(ctx, body.resendId, res)
    if (!prev) return
    body = { ...body, exportId: prev.export_id }
  }
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const imgs = await sb(ctx.cfg, `studio_images?select=id,kind,source_url,original_path,width,height,sort_order,included&project_id=eq.${ex.project_id}&user_id=eq.${ctx.userId}&ingest_status=eq.done&original_path=not.is.null&order=sort_order&limit=60`)
  // 사진 서명 주소 — 예전에는 한 장씩 차례로(사진 60장 = 60번 왕복, 2026-10-02 실측 창 열기 약 20초) → 동시에 SIGN_POOL장씩. 순서는 그대로
  //   kind(gallery = 1688 대표 사진 · desc = 1688 상세 설명 사진 · upload = 내 사진)·sortOrder를 같이 준다 — 대표 이미지 후보는 화면이 gallery·upload만 고른다(studioMarketplaceRules.repImageCandidates)
  const signed = runSignPool(Array.isArray(imgs) ? imgs : [], SIGN_POOL, async im => {
    try { return { id: im.id, kind: im.kind, sortOrder: im.sort_order, path: im.original_path, width: im.width, height: im.height, included: im.included, sourceUrl: im.source_url || null, url: await storageSignDownload(ctx.cfg, BUCKET, im.original_path, PREVIEW_URL_SEC) } }
    catch (e) { console.error('[marketplace] 사진 서명 주소 실패:', im.original_path, e.message); return null }
  })
  const [projRows, templates, places, account, signedList] = await Promise.all([
    sb(ctx.cfg, `studio_projects?select=title,title_zh,offer_id&id=eq.${ex.project_id}&limit=1`), loadTemplates(ctx), loadPlaces(ctx), loadAccountRow(ctx), signed,
  ])
  const images = signedList.filter(Boolean)
  const connected = !!account && daysLeft(account.expires_at) >= 0
  // 1688 원천 · 판매처에 이미 있는 상품 · 지난 값 — 서로 기다리지 않게 동시에 (2026-10-02 창 열기 속도)
  // 판매처마다 마지막으로 보낸 판매가·재고·카테고리 (2026-10-02 여러 상품 한 번에 보내기 — 같은 작업의 결과물 전부, 판매처를 부르지 않음)
  const prevRowsP = projectExportIds(ctx, ex.id).then(ids => sb(ctx.cfg, `marketplace_sends?select=${PREVIOUS_SELECT}&user_id=eq.${ctx.userId}&export_id=in.(${ids.join(',')})&order=created_at.desc&limit=200`))
  const existingP = existingInMarkets(ctx, ex.id).then(v => ({ v }), e => ({ e }))
  const [source, existingR, prevRows, ordered, titleKo] = await Promise.all([loadSource(ctx, projRows?.[0]?.offer_id), existingP, prevRowsP, loadOrdered(ctx, projRows?.[0]?.offer_id), titleKoOf(projRows?.[0]?.title_zh)])
  if (existingR.e) {
    if (isNewColumnMissing(existingR.e)) return newSqlMissing(res, existingR.e, 'send_prepare')
    throw existingR.e
  }
  const existing = existingR.v
  const previous = previousOf(prevRows)
  return res.status(200).json({
    existing, // 판매처마다 이미 있는 상품 (2026-10-02) — { [market]: { mode:'modify'|'manual', sendId, sellerProductId, status, extra } } · 없으면 새로 등록
    previous, // 판매처마다 마지막으로 보낸 { price, stock, category:{ id, name }, at, status } (2026-10-02 — api/_marketPrevious.js)
    ordered, // 이 고객이 이 1688 상품을 이유씨에서 주문한 옵션 [{ specId, color, size, quantity, orders:[주문 번호] }] (2026-10-02 — api/_marketOrdered.js) · 1688 상품이 아니면 []
    connected, markets: { [MARKET]: { connected } }, // 판매처마다 연결 여부 — 보내기 창 "보낼 판매처" 줄이 쓴다
    // projectTitle = 작업의 지금 이름 · titleKo = 1688 제목의 한국어(번역 캐시) — 보내기 창 제목 표시용(studioProductList.productName과 같은 순서, 2026-10-02 ②-1). 상품명 칸에는 넣지 않는다
    export: { id: ex.id, title: ex.title || projRows?.[0]?.title || '', projectTitle: projRows?.[0]?.title || '', titleKo, mode: ex.mode, format: ex.format, files: ex.files.map(f => ({ key: f.key, name: f.name, width: f.width, height: f.height })) },
    images, templates, places, source, limits: { optionImages: OPTION_IMAGE_MAX, documents: DOC_MAX, documentBytes: DOC_MAX_BYTES },
    resend: prev ? { sendId: prev.id, sellerProductId: prev.seller_product_id, reason: prev.reason || '', revision: revisionsOf(prev).length, form: formFromBody(prev.request_json?.body), categoryName: prev.request_json?.categoryName || '' } : null,
  })
}
async function categoryPredict(ctx, body, res) {
  const cred = await withCredentials(ctx, res)
  if (!cred) return
  const productName = String(body.productName ?? '').trim().slice(0, 100)
  if (!productName) return sendError(res, 400, 'invalid_input', '상품명을 넣어 주세요.')
  const payload = { productName }
  if (body.brand) payload.brand = String(body.brand).slice(0, 50)
  let r
  try { r = await coupangCall(cred.call, { method: 'POST', path: PATHS.predict, body: payload }) } catch (e) { return coupangFail(res, e, 'category_predict') }
  const d = r?.data || {}
  return res.status(200).json({ result: d.autoCategorizationPredictionResultType || 'FAILURE', categoryCode: d.predictedCategoryId ? String(d.predictedCategoryId) : null, categoryName: d.predictedCategoryName || null })
}
/** 쿠팡 브랜드 검색 (문서 58230017410841) → [{ brandId, brandName, uidRequired, uidTypes }]. 실패는 CoupangError throw */
async function searchBrands(call, name) {
  const r = await coupangCall(call, { method: 'POST', path: PATHS.brandSearch, body: { brandName: name, countPerPage: 10, page: 1 } })
  return normalizeBrands(r)
}
async function brandSearch(ctx, body, res) {
  const cred = await withCredentials(ctx, res)
  if (!cred) return
  const name = String(body.brandName ?? '').trim().slice(0, BRAND_MAX)
  if (!name) return sendError(res, 400, 'invalid_input', '브랜드 이름을 넣어 주세요.')
  let brands
  try { brands = await searchBrands(cred.call, name) } catch (e) { return coupangFail(res, e, 'brand_search') }
  return res.status(200).json({ brands })
}
async function categoryMeta(ctx, body, res) {
  const cred = await withCredentials(ctx, res)
  if (!cred) return
  const code = String(body.categoryCode ?? '').trim()
  if (!/^\d{1,12}$/.test(code)) return sendError(res, 400, 'invalid_input', '카테고리 코드는 숫자예요.')
  let r
  try { r = await coupangCall(cred.call, { method: 'GET', path: PATHS.categoryMeta(code) }) } catch (e) { return coupangFail(res, e, 'category_meta') }
  return res.status(200).json(summarizeCategoryMeta(r))
}

/** 대표 이미지 — 정사각형 JPG(base64). 매직바이트·정사각형·500~5000px·3MB */
function checkRepImage(b64) {
  let buf
  try { buf = Buffer.from(String(b64 || ''), 'base64') } catch { return { error: '대표 이미지를 읽지 못했어요.' } }
  return checkRepBuffer(buf)
}
function checkRepBuffer(buf) {
  if (!buf || !buf.length) return { error: '대표 이미지를 골라 주세요.' }
  if (buf.length > REP_MAX_BYTES) return { error: '대표 이미지는 3MB 이하여야 해요.' }
  const mime = sniffMime(buf)
  if (mime !== 'image/jpeg') return { error: '대표 이미지는 JPG여야 해요.' }
  const d = readDimensions(buf, mime)
  if (!d) return { error: '대표 이미지 크기를 읽지 못했어요.' }
  if (d.width !== d.height) return { error: '대표 이미지는 정사각형이어야 해요.' }
  if (d.width < REP_MIN || d.width > REP_MAX) return { error: `대표 이미지는 한 변 ${REP_MIN}~${REP_MAX}px이어야 해요.` }
  return { buf, width: d.width }
}
/**
 * 고른 작업 사진(id) → 정사각형 JPG. 보내는 순간 서버가 Storage에서 원본을 직접 읽는다
 *   (보내기 창을 오래 열어 둬도 된다 — 창을 열 때 받은 서명 주소는 화면에 보여 주는 데만 쓰고 보낼 때는 쓰지 않는다)
 * @returns {Promise<{ buf, width } | { error }>}
 */
async function squareFromImage(ctx, ex, imageId, fit) {
  const id = String(imageId ?? '').trim().toLowerCase()
  if (!UUID_RE.test(id)) return { error: '대표 이미지를 골라 주세요.' }
  const rows = await sb(ctx.cfg, `studio_images?select=id,original_path&id=eq.${id}&project_id=eq.${ex.project_id}&user_id=eq.${ctx.userId}&ingest_status=eq.done&original_path=not.is.null&limit=1`)
  const path = Array.isArray(rows) ? rows[0]?.original_path : null
  if (!path) return { error: '고른 사진을 찾을 수 없어요. 창을 닫고 다시 열어 주세요.' }
  const dl = await storageDownload(ctx.cfg, BUCKET, path)
  if (!dl.found) {
    console.error('[marketplace] 대표·옵션 사진 원본이 Storage에 없음:', path)
    return { error: '고른 사진을 찾을 수 없어요. 창을 닫고 다시 열어 주세요.' }
  }
  let buf
  try { buf = await renderSquare(dl.buf, { size: REP_SIZE, fit: fit === 'cover' ? 'cover' : 'contain' }) } catch (e) {
    console.error('[marketplace] 정사각형 사진 만들기 실패:', path, e.message)
    return { error: '고른 사진을 읽지 못했어요. 다른 사진을 골라 주세요.' }
  }
  return checkRepBuffer(buf)
}
function kstStart() {
  const k = new Date(Date.now() + 9 * 3600000).toISOString()
  return `${k.slice(0, 10)}T00:00:00`
}
async function send(ctx, body, res) {
  const cred = await withCredentials(ctx, res)
  if (!cred) return
  const encKey = loadEncKey()
  // 고쳐서 다시 보내기 — 반려된 전송을 같은 쿠팡 상품 번호로 고친다(새 전송 기록·새 상품을 만들지 않는다)
  // mode: 'create' 새로 등록 · 'resend' 반려 상품 고치기([수정 후 재전송]) · 'update' 살아 있는 상품 수정(같은 내 상품을 다시 보냄 — 2026-10-02)
  let prev = null, mode = 'create', current = null, extra = 0
  if (body.resendId != null) {
    prev = await loadRejectedSend(ctx, body.resendId, res)
    if (!prev) return
    mode = 'resend'
    body = { ...body, exportId: prev.export_id }
  }
  const ex = await loadOwnedExport(ctx, body, res)
  if (!ex) return
  const tid = String(body.templateId ?? '').toLowerCase()
  if (!UUID_RE.test(tid)) return sendError(res, 400, 'invalid_input', '배송/반품 템플릿을 골라 주세요.')
  const [templates, places] = await Promise.all([loadTemplates(ctx), loadPlaces(ctx)])
  const template = templates.find(t => t.id === tid)
  if (!template) return sendError(res, 404, 'not_found', '템플릿을 찾을 수 없어요.')
  // 판매 방식 — 기본값 없음. 고르지 않았으면 아무것도 만들지 않고 돌려보낸다
  if (!isSaleMode(body.saleMode)) return sendError(res, 400, 'sale_mode_missing', '판매 방식을 골라 주세요. (국내 재고 판매 / 해외구매대행)')
  // 대표 이미지 — repImageId(작업 사진 id)면 서버가 원본을 읽어 만든다. repImage.dataBase64(이미 만든 정사각형 JPG)도 받는다
  const rep = body.repImageId != null ? await squareFromImage(ctx, ex, body.repImageId, body.fit) : checkRepImage(body.repImage?.dataBase64)
  if (rep.error) return sendError(res, 400, 'rep_image_invalid', rep.error)
  // 옵션 대표 이미지 (선택) — [{ key:'r01', imageId }] 또는 [{ key:'r01', dataBase64 }] · 옵션은 items[].imageKey로 가리킨다
  const optImgs = []
  for (const o of Array.isArray(body.optionImages) ? body.optionImages : []) {
    const key = String(o?.key ?? '')
    if (!/^r\d{2}$/.test(key) || optImgs.some(x => x.key === key)) return sendError(res, 400, 'invalid_input', '옵션 이미지 값이 올바르지 않아요.')
    if (optImgs.length >= OPTION_IMAGE_MAX) return sendError(res, 400, 'invalid_input', `옵션 이미지는 서로 다른 사진 ${OPTION_IMAGE_MAX}장까지예요.`)
    const c = o?.imageId != null ? await squareFromImage(ctx, ex, o.imageId, body.fit) : checkRepImage(o?.dataBase64)
    if (c.error) return sendError(res, 400, 'rep_image_invalid', `옵션 이미지: ${c.error}`)
    optImgs.push({ key, buf: c.buf })
  }
  // 구비서류 (필요한 카테고리만) — [{ templateName, dataBase64 }]
  const docs = []
  for (const d of Array.isArray(body.documents) ? body.documents : []) {
    const templateName = String(d?.templateName ?? '').trim()
    if (!templateName || templateName.length > 100) return sendError(res, 400, 'invalid_input', '구비서류 이름이 올바르지 않아요.')
    if (docs.length >= DOC_MAX) return sendError(res, 400, 'invalid_input', `구비서류는 ${DOC_MAX}개까지예요.`)
    let buf
    try { buf = Buffer.from(String(d?.dataBase64 || ''), 'base64') } catch { buf = Buffer.alloc(0) }
    if (!buf.length) return sendError(res, 400, 'document_invalid', `구비서류 "${templateName}" 파일을 올려 주세요.`)
    if (buf.length > DOC_MAX_BYTES) return sendError(res, 400, 'document_invalid', `구비서류 "${templateName}"는 3MB 이하여야 해요.`)
    const mime = sniffMime(buf)
    if (!DOC_TYPES[mime]) return sendError(res, 400, 'document_invalid', `구비서류 "${templateName}"는 PDF·JPG·PNG만 올릴 수 있어요.`)
    docs.push({ templateName, buf, mime, ext: DOC_TYPES[mime], key: `d${String(docs.length + 1).padStart(2, '0')}` })
  }
  const certsIn = (Array.isArray(body.certifications) ? body.certifications : []).map(c => ({ type: String(c?.type ?? ''), code: String(c?.code ?? '').trim() })).filter(c => c.type)

  // 카테고리 필수값 — 화면이 보낸 값을 서버가 메타로 다시 검사 (화면을 건너뛰어도 막힌다)
  const code = String(body.categoryCode ?? '').trim()
  if (!/^\d{1,12}$/.test(code)) return sendError(res, 400, 'invalid_input', '카테고리를 골라 주세요.')
  let meta
  try { meta = summarizeCategoryMeta(await coupangCall(cred.call, { method: 'GET', path: PATHS.categoryMeta(code) })) } catch (e) { return coupangFail(res, e, 'send/meta') }
  const items = Array.isArray(body.items) ? body.items : []
  const noticesIn = Array.isArray(body.notices) ? body.notices : []
  const noticeMap = Object.fromEntries(noticesIn.map(n => [String(n?.noticeCategoryDetailName || ''), String(n?.content || '')]))
  const noticeCategory = String(noticesIn[0]?.noticeCategoryName || body.noticeCategory || '')
  const missing = new Set()
  for (const it of items.length ? items : [{}]) for (const m of missingRequired(meta, { attributes: it?.attributes || {}, skipProduct: true })) missing.add(m)
  for (const m of missingRequired(meta, { skipAttributes: true, notices: noticeMap, noticeCategory, certifications: certsIn, documents: docs, saleMode: body.saleMode, parallelImported: body.advanced?.parallelImported })) missing.add(m)
  if (missing.size) return sendError(res, 400, 'required_missing', `필수 항목이 비어 있어요: ${[...missing].join(', ')}`)
  if (!meta.singleItem && items.length < 1) return sendError(res, 400, 'invalid_input', '옵션을 하나 이상 넣어 주세요.')
  for (const it of items) if (it?.imageKey && !optImgs.some(x => x.key === it.imageKey)) return sendError(res, 400, 'invalid_input', '옵션 이미지 값이 올바르지 않아요.')

  // 브랜드 (선택) — 이름을 넣었으면 쿠팡 브랜드 검색으로 brandId를 확인해 같이 보낸다. 비웠으면 brand·brandId를 보내지 않는다
  let brand = null
  const brandName = String(body.brand ?? '').trim().slice(0, BRAND_MAX)
  if (brandName) {
    let found
    try { found = await searchBrands(cred.call, brandName) } catch (e) { return coupangFail(res, e, 'send/brand') }
    const wanted = String(body.brandId ?? '').trim()
    if (wanted) brand = found.find(b => b.brandId === wanted) || null
    else { const pick = pickBrand(found, brandName); if (pick.state === 'one') brand = pick.brand; else if (pick.state === 'many') return sendError(res, 400, 'brand_choose', '같은 이름의 브랜드가 여러 개예요. 브랜드를 골라 주세요.') }
    if (!brand) return sendError(res, 400, 'brand_not_found', BRAND_NOT_FOUND)
  }

  // 다시 보내기 — 같은 내 상품·같은 업체코드로 살아 있는 쿠팡 상품이 있으면 새로 등록하지 않고 그 상품을 수정한다 (등록상품 조회로 주인·옵션 id 확인)
  if (!prev) {
    const found = await findUpdateTarget(ctx, res, { market: MARKET, exportId: ex.id, account: cred.row.vendor_id, owner: s => coupangOwner(cred, s) })
    if (!found) return
    if (found.mode === 'modify') { prev = found.target; current = found.current; extra = found.extra; mode = 'update' }
  }

  // 전송 기록 먼저 (id가 이미지 토큰 재료) — 다시 보내기·수정은 예전 기록을 그대로 쓴다
  const created = prev ? [{ id: prev.id }] : await sb(ctx.cfg, 'marketplace_sends?select=id', { method: 'POST', body: { user_id: ctx.userId, export_id: ex.id, market: MARKET, status: 'sending', request_json: {} }, prefer: 'return=representation' })
  const sendId = created?.[0]?.id
  if (!sendId) throw new Error('marketplace_sends insert: id 없음')
  const fileTag = prev ? `${sendId}_${Date.now().toString(36)}` : sendId // 다시 보낼 때는 새 파일 이름 (예전 회차 파일을 덮지 않는다)
  // 다시 보내기·수정이 실패하면 기록은 그대로("반려"·"승인 완료" 등) — 보내려던 본문(request_json)도 예전 것으로 되돌린다
  const restore = () => (prev ? sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { request_json: prev.request_json || {} }, prefer: 'return=minimal' }).catch(e => console.error('[marketplace] 보내려던 본문 되돌리기 실패:', sendId, e.message)) : null)
  const fail = async (status, code, message, extraPatch = {}) => {
    if (prev) { await restore(); return sendError(res, status, code, message) }
    await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { status: 'failed', reason: message.slice(0, 2000), ...extraPatch }, prefer: 'return=minimal' }).catch(e => console.error('[marketplace] 실패 기록도 못 남김:', sendId, e.message))
    return sendError(res, status, code, message)
  }

  // 대표 이미지 저장 + 이미지 주소(토큰)
  const repPath = `${ex.folder}/marketplace/${fileTag}_rep.jpg`
  try { await storageUpload(ctx.cfg, BUCKET, repPath, rep.buf, 'image/jpeg') } catch (e) {
    console.error('[marketplace] 대표 이미지 저장 실패:', repPath, e.message)
    return fail(500, 'storage_error', '대표 이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  const m = marketConfig()
  const files = { rep: repPath }
  const urlOf = key => `${m.publicUrl}/api/marketplace?t=${makeImageToken(encKey, sendId, key)}`
  try {
    for (const o of optImgs) {
      const path = `${ex.folder}/marketplace/${fileTag}_${o.key}.jpg`
      await storageUpload(ctx.cfg, BUCKET, path, o.buf, 'image/jpeg')
      files[o.key] = path
    }
    for (const d of docs) {
      const path = `${ex.folder}/marketplace/${fileTag}_${d.key}.${d.ext}`
      await storageUpload(ctx.cfg, BUCKET, path, d.buf, d.mime)
      files[d.key] = path
    }
  } catch (e) {
    console.error('[marketplace] 옵션 이미지·구비서류 저장 실패:', sendId, e.message)
    return fail(500, 'storage_error', '파일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  // 상세 이미지 — 쿠팡 규격(한 변 500~5000, 10MB)에 맞게 나누고 채운다. 여기서는 계획만 세우고(detailImagePlans), 쿠팡이 내려받을 때 그 조각을 만들어 준다(serveImage)
  const detailUrls = []
  const pieces = {}
  for (const p of detailImagePlans(ex.files)) {
    const f = ex.files.find(x => x.key === p.src)
    files[p.key] = f.path
    if (p.changed) pieces[p.key] = { x: p.x, y: p.y, w: p.w, h: p.h, outW: p.outW, outH: p.outH }
    detailUrls.push(urlOf(p.key))
  }
  // 다시 보내기 — 쿠팡에 있는 그 상품의 옵션 id를 읽어 온다 (상품 수정 본문에 넣는다). 상태는 이력에 적기만 하고 방법을 나누지 않는다
  let plan = null
  if (prev) {
    if (!current) {
      try { current = await coupangCall(cred.call, { method: 'GET', path: PATHS.product(prev.seller_product_id) }) } catch (e) { await restore(); return coupangFail(res, e, 'send/resend-get') }
    }
    plan = { ...resendPlan(), statusName: String(current?.data?.statusName || '') }
  }

  const single = { name: String(body.productName || '').slice(0, 150), originalPrice: body.originalPrice, salePrice: body.salePrice, stock: body.stock, sku: body.sku, gtin: body.gtin, attributes: body.attributes || {} }
  const built = buildProductBody({
    account: cred.row, template, places, categoryCode: code, saleMode: body.saleMode, outboundDays: body.outboundDays,
    productName: body.productName, displayName: body.displayName, generalName: body.generalName, brand: brand ? brand.brandName : '', brandId: brand ? brand.brandId : '', manufacture: body.manufacture, modelNo: body.modelNo,
    items: (items.length ? items : [single]).map(it => ({ ...it, imageUrl: it?.imageKey ? urlOf(it.imageKey) : '' })),
    attributeMeta: meta.attributes,
    notices: noticesIn.filter(n => n && n.noticeCategoryName && n.noticeCategoryDetailName && String(n.content || '').trim()),
    certifications: certsIn, documents: docs.map(d => ({ templateName: d.templateName, url: urlOf(d.key) })), advanced: body.advanced && typeof body.advanced === 'object' ? body.advanced : {},
    repImageUrl: urlOf('rep'), detailImageUrls: detailUrls, searchTags: Array.isArray(body.searchTags) ? body.searchTags : [], saleStartedAt: kstStart(),
    update: prev ? { sellerProductId: prev.seller_product_id, items: Array.isArray(current?.data?.items) ? current.data.items : [], requested: plan.requested } : null,
  })
  if (!built.ok) return fail(400, 'invalid_input', built.message)
  const revisions = revisionsOf(prev)
  // 내용 표식 — 다음에 다시 보낼 때 "가격·재고만 바뀜"을 가린다 (이미지·서류는 원본 바이트 해시, 상세는 내 상품 파일 경로)
  const sources = { rep: sha16(rep.buf), options: Object.fromEntries(optImgs.map(o => [o.key, sha16(o.buf)])), docs: Object.fromEntries(docs.map(d => [d.templateName, sha16(d.buf)])), detail: Object.fromEntries(ex.files.map(f => [f.key, f.path])) }
  const contentKey = sha16(coupangContentKey(built.body, sources))
  // optionLinks = 공통 옵션 종류 → 쿠팡 옵션 이름 연결 (2026-10-02 — 다시 보낼 때 보내기 창이 그대로 쓴다. 보낸 본문과 별개 기록)
  const requestJson = { body: built.body, files, pieces, categoryName: body.categoryName || null, revisions, contentKey, optionLinks: cleanOptionLinks(body.optionLinks) }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { request_json: requestJson }, prefer: 'return=minimal' })
  if (prev) return await updateCoupang(ctx, res, { cred, prev, sendId, requestJson, plan, current, mode, extra, restore })

  let r
  try { r = await coupangCall(cred.call, { method: 'POST', path: PATHS.products, body: built.body, extendedTimeout: true }) } catch (e) {
    if (!(e instanceof CoupangError)) throw e
    console.warn(`[marketplace] 상품 생성 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    return fail(e.status === 429 ? 429 : 502, e.code, e.message, { result_json: { code: e.code, status: e.status, raw: e.raw } })
  }
  const sellerProductId = r?.data != null ? String(r.data) : null
  const patch = { seller_product_id: sellerProductId && /^\d{1,20}$/.test(sellerProductId) ? sellerProductId : null, status: 'approval_pending', approval_requested_at: new Date().toISOString(), result_json: { code: r?.code, message: r?.message, data: r?.data } }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
  await recordSendAccount(ctx, sendId, cred.row.vendor_id) // 보낸 계정(업체코드) — 상태 확인 때 지금 연결된 계정과 비교
  console.info(`[marketplace] 쿠팡 상품 생성 ${ctx.userId} send=${sendId} product=${patch.seller_product_id}`)
  return res.status(200).json({ sendId, sellerProductId: patch.seller_product_id, status: 'approval_pending' })
}

/**
 * 쿠팡에 있는 상품 수정 — 새 기록·새 상품을 만들지 않는다 (같은 기록 · 같은 sellerProductId). 근거 api/_marketUpdate.js
 *   mode 'resend' = 반려 상품 [수정 후 재전송] · 'update' = 살아 있는 상품(승인 대기·승인 완료)을 같은 내 상품으로 다시 보냄
 *   방법(coupangUpdateWay):
 *     'modify'      상품 수정 PUT(같은 sellerProductId · 옵션 id · requested true = 다시 승인 요청) → "승인 대기"
 *                   승인 완료 상품이면 가격·재고는 상품 수정으로 바뀌지 않으므로(문서) 바뀐 옵션만 옵션별 API를 이어서 부른다
 *     'price_stock' 승인 완료 + 내용은 지난번과 같고 가격·재고만 바뀜 → 옵션별 가격·정가·재고 API만 (다시 승인 없음 · 상태 그대로)
 *     'none'        바뀐 것 없음 → 아무것도 부르지 않음
 *   승인 요청 API는 부르지 않는다 (resendPlan). 쿠팡이 거절하면 그 문구를 그대로 돌려주고 기록은 그대로(보내려던 본문도 되돌림)
 * 회차 이력: request_json.revisions[] = { n, at, previousReason, previousStatus, coupangStatus(보내기 직전 쿠팡 상태), via('modify'|'price_stock'), approval, changes? }
 *   (예전 회차에는 via 'approval'·approval false가 남아 있을 수 있다 — 승인 요청 API를 부르던 때의 기록)
 */
async function updateCoupang(ctx, res, { cred, prev, sendId, requestJson, plan, current, mode, extra, restore }) {
  const pid = prev.seller_product_id
  const statusName = plan.statusName
  const approved = mode === 'update' && isCoupangApproved(statusName)
  const changes = approved ? coupangPriceStockChanges(requestJson.body.items, current?.data?.items) : []
  const prevKey = String(prev.request_json?.contentKey || '')
  const way = mode === 'resend' ? 'modify' : coupangUpdateWay({ approved, sameContent: !!prevKey && prevKey === requestJson.contentKey, changes })
  const rev = { n: requestJson.revisions.length + 1, at: new Date().toISOString(), previousReason: prev.reason || null, previousStatus: prev.market_status || null, coupangStatus: statusName || null, via: way === 'price_stock' ? 'price_stock' : plan.via, approval: false }
  const save = patch => sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
  const base = { sendId, sellerProductId: pid, updated: mode === 'update', resend: mode === 'resend', extra }
  if (way === 'none') {
    await restore()
    console.info(`[marketplace] 쿠팡 다시 보내기 — 바뀐 것 없음 ${ctx.userId} send=${sendId} product=${pid}`)
    return res.status(200).json({ ...base, status: prev.status, way, unchanged: true })
  }
  const problem = coupangPriceProblem(changes)
  if (problem) { await restore(); return sendError(res, 400, 'invalid_input', problem) }
  let r = null
  if (way === 'modify') {
    try { r = await coupangCall(cred.call, { method: 'PUT', path: PATHS.products, body: requestJson.body, extendedTimeout: true }) } catch (e) {
      if (!(e instanceof CoupangError)) throw e
      console.warn(`[marketplace] 상품 수정 실패 ${e.code} (HTTP ${e.status}) product=${pid}: ${e.raw}`)
      await restore()
      return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
    }
  }
  // 승인 완료 옵션의 가격·정가·재고 — 옵션마다 순서(coupangChangeOrder)대로. 하나라도 실패하면 거기서 멈추고 바꾼 것까지만 기록
  const applied = []
  let psError = null
  outer: for (const c of changes) {
    for (const k of coupangChangeOrder(c)) {
      const path = k === 'salePrice' ? PATHS.itemPrice(c.vendorItemId, c.salePrice) : k === 'originalPrice' ? PATHS.itemOriginalPrice(c.vendorItemId, c.originalPrice) : PATHS.itemQuantity(c.vendorItemId, c.stock)
      try {
        await coupangCall(cred.call, { method: 'PUT', path })
        applied.push({ vendorItemId: c.vendorItemId, itemName: c.itemName, field: k, value: k === 'stock' ? c.stock : c[k] })
      } catch (e) {
        if (!(e instanceof CoupangError)) throw e
        console.warn(`[marketplace] 쿠팡 옵션 ${k} 변경 실패 ${e.code} (HTTP ${e.status}) product=${pid} vendorItem=${c.vendorItemId}: ${e.raw}`)
        psError = { code: e.code, status: e.status, message: `옵션 "${c.itemName}"의 ${k === 'stock' ? '재고' : k === 'salePrice' ? '판매가' : '정가'} 변경 실패: ${e.message}` }
        break outer
      }
    }
  }
  if (way === 'price_stock' && !applied.length) { await restore(); return sendError(res, psError.status === 429 ? 429 : 502, psError.code, psError.message) }
  const done = { ...rev, approval: way === 'modify', ...(changes.length ? { changes: applied } : {}) }
  await save({
    ...(way === 'modify' ? { status: 'approval_pending', market_status: null, reason: null, approval_requested_at: new Date().toISOString() } : {}),
    request_json: { ...requestJson, revisions: [...requestJson.revisions, done] },
    result_json: { ...(r ? { code: r?.code, message: r?.message, data: r?.data } : {}), step: mode, way, ...(psError ? { priceStockError: psError.message } : {}) },
  })
  await recordSendAccount(ctx, sendId, cred.row.vendor_id)
  const status = way === 'modify' ? 'approval_pending' : prev.status
  console.info(`[marketplace] 쿠팡 상품 ${mode === 'resend' ? '수정 + 승인 요청' : '수정'} ${ctx.userId} send=${sendId} product=${pid} 회차=${done.n} 쿠팡 상태="${statusName}" 방법=${way} 옵션 변경=${applied.length}/${changes.length}`)
  return res.status(200).json({ ...base, status, way, revision: done.n, priceStockError: psError ? psError.message : null })
}

// ── 처리현황 ──
// 목록에 필요한 칸만 (2026-10-02 — request_json 원문은 보낸 본문이라 크다: 기록 수천 건이면 응답이 수십 MB가 된다). 판매처마다 상품명 위치가 다르다
const LIST_SELECT = [
  'id', 'export_id', 'market', 'seller_product_id', 'status', 'market_status', 'market_account', 'reason', 'approval_requested_at', 'last_synced_at', 'created_at', 'updated_at',
  'nm_coupang:request_json->body->>sellerProductName', 'nm_cafe24:request_json->body->request->>product_name',
  'nm_smartstore:request_json->body->originProduct->>name', 'nm_11st:request_json->summary->>prdNm', 'nm_zigzag:request_json->input->>name',
  'category_name:request_json->>categoryName', 'revisions:request_json->revisions', 'mall_id:request_json->>mallId',
  'c24_display:request_json->body->request->>display', 'ss_display:request_json->body->smartstoreChannelProduct->>channelProductDisplayStatusType',
  'channel_product_no:result_json->>channelProductNo',
].join(',')
const NAME_COL = { [MARKET]: 'nm_coupang', [CAFE24]: 'nm_cafe24', [SMARTSTORE]: 'nm_smartstore', [ELEVENST]: 'nm_11st', [ZIGZAG]: 'nm_zigzag' }
/** @param {object} s 목록 줄 · @param {object} accounts 판매처 → 지금 연결된 계정 식별값 (accountJudge 'other'면 accountMismatch) */
function publicSend(s, accounts = {}) {
  const market = s.market || MARKET
  const c24 = market === CAFE24
  const ss = market === SMARTSTORE
  return {
    // marketStatus = 판매처가 준 상태 원문 (쿠팡 statusName · 스마트스토어 판매 중·판매 중지·삭제 … — 칸 market_status 하나)
    // accountMismatch = 지금 연결된 계정과 다른 계정으로 보낸 기록 → 상태를 확인하지 않는다 (화면 칩 안내)
    id: s.id, exportId: s.export_id, market, sellerProductId: s.seller_product_id, status: s.status, marketStatus: s.market_status, reason: s.reason,
    accountMismatch: accountJudge(s.market_account, accounts[market]) === 'other',
    productName: s[NAME_COL[market]] || null, categoryName: s.category_name || null, revision: Array.isArray(s.revisions) ? s.revisions.length : 0,
    adminUrl: c24 ? cafe24AdminProductUrl(s.mall_id, s.seller_product_id) : null, // 카페24 = 관리자 상품 화면
    display: c24 ? (s.c24_display === 'T' ? 'T' : 'F') : null, // 카페24 진열상태(보낸 값 — 관리자에서 바꾼 뒤는 모름)
    // 스마트스토어 = 보낸 전시 상태(ON|SUSPENSION — 스마트스토어센터에서 바꾼 뒤는 모름) · 채널상품번호
    ssDisplay: ss ? (s.ss_display === 'ON' ? 'ON' : 'SUSPENSION') : null,
    channelProductNo: ss ? (s.channel_product_no || null) : null,
    approvalRequestedAt: s.approval_requested_at, lastSyncedAt: s.last_synced_at, createdAt: s.created_at, updatedAt: s.updated_at,
    sentAt: sentAtOf(s), // 마지막으로 판매처에 보낸 시각 = 마지막 수정 회차(revisions[].at) 또는 처음 보낸 때 — [내 상품] "변경사항 미전송" 판정
  }
}
/** 마지막으로 판매처에 보낸 시각 (2026-10-02) — 수정 회차가 있으면 가장 늦은 회차 시각, 없으면 기록을 만든 때 */
function sentAtOf(s) {
  let at = new Date(s.created_at).getTime()
  for (const r of Array.isArray(s.revisions) ? s.revisions : []) { const t = new Date(r?.at).getTime(); if (Number.isFinite(t) && (!Number.isFinite(at) || t > at)) at = t }
  return Number.isFinite(at) ? new Date(at).toISOString() : null
}
// 목록은 모든 판매처 (쿠팡 + 카페24 + 스마트스토어 + 11번가) · 100건 한도 없음 — LIST_PAGE(1000)씩 끝까지 (2026-10-02)
// 화면이 상품별로 묶고 상태 카드 숫자·거르기·검색을 하므로 기록 전부가 필요하다. 쪽 경계에서 같은 줄이 두 번 오면 하나만
async function loadSends(ctx) {
  // 카페24 기록은 관리자·스태프에게만 (2026-10-01 카페24 고객에게 숨김 — 기록은 DB에 그대로)
  const markets = cafe24Allowed(ctx) ? `${MARKET},${CAFE24},${SMARTSTORE},${ELEVENST},${ZIGZAG}` : `${MARKET},${SMARTSTORE},${ELEVENST},${ZIGZAG}`
  const accounts = await currentAccounts(ctx)
  const byId = new Map()
  for (let page = 0; page < LIST_PAGES_MAX; page++) {
    const rows = await sb(ctx.cfg, `marketplace_sends?select=${LIST_SELECT}&user_id=eq.${ctx.userId}&market=in.(${markets})&order=created_at.desc,id.desc&limit=${LIST_PAGE}&offset=${page * LIST_PAGE}`)
    const list = Array.isArray(rows) ? rows : []
    for (const r of list) if (!byId.has(r.id)) byId.set(r.id, r)
    if (list.length < LIST_PAGE) return [...byId.values()].map(r => publicSend(r, accounts))
  }
  console.error(`[marketplace] 보낸 상품 기록이 ${LIST_PAGE * LIST_PAGES_MAX}건을 넘음 — 최근 것만 보냄 ${ctx.userId}`)
  return [...byId.values()].map(r => publicSend(r, accounts))
}
/** 판매처 → 지금 연결된 계정 식별값 (쿠팡 = vendor_id · 스마트스토어 = market_account(계정 정보 조회 accountUid) — 근거 api/_marketStatus.js). 없으면 그 판매처 칸이 없다 */
async function currentAccounts(ctx) {
  const rows = await sb(ctx.cfg, `marketplace_accounts?select=market,vendor_id,market_account&user_id=eq.${ctx.userId}&market=in.(${STATUS_CHECK_MARKETS.join(',')})`)
  const out = {}
  for (const r of Array.isArray(rows) ? rows : []) out[r.market] = r.market === MARKET ? r.vendor_id : r.market_account
  return out
}
/** 칸 이름 변경·계정 칸 SQL(docs/sql/2026-10-02-marketplace-sends-deleted.sql) 실행 전 — PostgREST가 모르는 칸이라고 거절 */
const isNewColumnMissing = e => e?.status === 400 && /market_status|market_account/.test(String(e?.message || ''))
function newSqlMissing(res, e, where) {
  console.error(`[marketplace] ${where}: market_status·market_account 칸 없음 — docs/sql/2026-10-02-marketplace-sends-deleted.sql 실행 필요:`, e.message)
  return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
}
async function sendsList(ctx, body, res) {
  try {
    return res.status(200).json({ sends: await loadSends(ctx) })
  } catch (e) {
    if (isNewColumnMissing(e)) return newSqlMissing(res, e, 'sends_list')
    throw e
  }
}
/**
 * 보낸 기록에 계정 식별값 남기기 — 칸이 아직 없으면(SQL 실행 전) 기록 없이 넘어간다(보내기는 그대로 성공). 값이 없으면 남기지 않는다
 */
async function recordSendAccount(ctx, sendId, account) {
  if (!account) return
  try {
    await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}&user_id=eq.${ctx.userId}`, { method: 'PATCH', body: { market_account: account }, prefer: 'return=minimal' })
  } catch (e) {
    if (!isNewColumnMissing(e)) throw e
    console.error('[marketplace] 보낸 계정을 기록하지 못함 — docs/sql/2026-10-02-marketplace-sends-deleted.sql 실행 필요:', sendId, e.message)
  }
}
/**
 * 스마트스토어 지금 연결된 계정 식별값(accountUid) — 저장된 값(marketplace_accounts.market_account)이 있으면 그것, 없으면 계정 정보 조회 1번 후 저장.
 * 못 읽으면 null (보내기·확인은 그대로 — 그 기록은 "삭제됨" 판정을 하지 않는다)
 */
async function smartstoreAccountKey(ctx, cred) {
  let saved = null
  try {
    const rows = await sb(ctx.cfg, `marketplace_accounts?select=market_account&user_id=eq.${ctx.userId}&market=eq.${SMARTSTORE}`)
    saved = Array.isArray(rows) && rows[0] ? rows[0].market_account : null
  } catch (e) {
    if (!isNewColumnMissing(e)) throw e
    console.error('[marketplace] 스마트스토어 계정 식별값 칸 없음 — docs/sql/2026-10-02-marketplace-sends-deleted.sql 실행 필요:', e.message)
    return null
  }
  if (saved) return saved
  let uid = null
  try {
    const r = await smartstoreApi(cred, { method: 'GET', path: SS_ACCOUNT_PATH })
    uid = smartstoreAccountOf(r.json)
  } catch (e) {
    if (!(e instanceof SmartstoreError)) throw e
    console.warn('[marketplace] 스마트스토어 계정 정보 조회 실패 (계정 판정 없이 계속):', e.code, e.status, e.raw)
    return null
  }
  if (!uid) { console.error('[marketplace] 스마트스토어 계정 정보 응답에 accountUid 없음 (계정 판정 없이 계속)'); return null }
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${SMARTSTORE}`, { method: 'PATCH', body: { market_account: uid }, prefer: 'return=minimal' })
  return uid
}
/** 스마트스토어 등록 성공 뒤 보낸 계정 기록 — 상품은 이미 등록됐으므로 여기서 무엇이 실패해도 보내기 응답은 성공 그대로(원인 로그, 그 기록은 계정 판정 없음) */
async function recordSmartstoreAccount(ctx, sendId, cred) {
  try {
    await recordSendAccount(ctx, sendId, await smartstoreAccountKey(ctx, cred))
  } catch (e) {
    console.error('[marketplace] 스마트스토어 보낸 계정 기록 실패 (보내기는 성공):', sendId, e.message)
  }
}
/** 스마트스토어를 (다시) 연결하면 저장해 둔 계정 식별값을 비운다 — 다른 스토어로 바꿔 연결했을 수 있다. 다음 보내기·확인 때 계정 정보 조회로 다시 채운다 */
async function resetSmartstoreAccountKey(ctx) {
  try {
    await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${SMARTSTORE}`, { method: 'PATCH', body: { market_account: null }, prefer: 'return=minimal' })
  } catch (e) {
    if (!isNewColumnMissing(e)) throw e
    console.error('[marketplace] 스마트스토어 계정 식별값 칸 없음 — docs/sql/2026-10-02-marketplace-sends-deleted.sql 실행 필요:', e.message)
  }
}

// ── 판매처 상태 확인 (2026-10-02) — 조회만. 판매처 공통 흐름 = sync → 판매처마다 checkMarket → CHECKERS[판매처] ──
// 규칙·근거·한도는 api/_marketStatus.js. 확인 대상 = 판매처 상품번호가 있고 CHECK_STATUSES인 기록(같은 작업을 여러 번 보낸 옛 기록도 — 칩의 "N건"이 맞도록)
// seller_code = 11번가 판매자 상품코드(2026-10-02 — 상태 조회 열쇠, 다른 판매처는 null)
const CHECK_SELECT = 'id,market,seller_product_id,status,market_status,market_account,reason,last_synced_at,seller_code:request_json->summary->>sellerPrdCd'
/** 연결 함수(withCredentials·smartstoreCredentials)는 실패하면 res에 오류를 보낸다 — 판매처마다 따로 확인할 때는 응답 대신 오류만 받는다 */
function errorSink() {
  const sink = { error: null, code: 0, status(c) { sink.code = c; return sink }, json(b) { sink.error = { code: b?.code || 'unknown', message: b?.message || '' }; return sink } }
  return sink
}
/** 상태 저장 — 새 상태('deleted'·'ended')가 DB check에 아직 없으면(SQL 실행 전) 상태는 그대로 두고 원문·확인 시각만 (원인 로그) */
const isStatusCheckError = e => e?.status === 400 && /marketplace_sends_status_check|23514/.test(String(e?.message || ''))
const STATUS_SQL = { deleted: 'docs/sql/2026-10-02-marketplace-sends-deleted.sql', ended: 'docs/sql/2026-10-02-marketplace-sends-ended.sql' }
async function patchSend(ctx, id, patch) {
  try {
    await sb(ctx.cfg, `marketplace_sends?id=eq.${id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
  } catch (e) {
    if (!NEW_CHECK_STATUSES.includes(patch.status) || !isStatusCheckError(e)) throw e
    console.error(`[marketplace] 상태 ${patch.status}를 저장하지 못함 — ${STATUS_SQL[patch.status]} 실행 필요:`, id, e.message)
    const { status, ...rest } = patch
    await sb(ctx.cfg, `marketplace_sends?id=eq.${id}&user_id=eq.${ctx.userId}`, { method: 'PATCH', body: rest, prefer: 'return=minimal' })
  }
}
/** 바뀐 것이 없는 기록 — 확인 시각만 한 번에 (주소 길이 때문에 100개씩) */
async function touchSynced(ctx, ids) {
  const at = new Date().toISOString()
  for (let i = 0; i < ids.length; i += 100) {
    await sb(ctx.cfg, `marketplace_sends?id=in.(${ids.slice(i, i + 100).join(',')})&user_id=eq.${ctx.userId}`, { method: 'PATCH', body: { last_synced_at: at }, prefer: 'return=minimal' })
  }
}
/**
 * 쿠팡 (2026-10-02 호출 줄이기) — 계정(vendorId)이 다른 기록은 부르지 않는다
 *   승인 대기·전송 중·반려 = 하나씩 등록상품 조회(COUPANG_SINGLE_MAX까지, 반려로 바뀌었거나 사유가 비었을 때만 histories 1번 더)
 *   승인 완료(같은 계정) = 상품 목록 페이징 조회 status=DELETED를 쪽마다 훑어 한꺼번에 — 목록에 있으면 삭제됨
 *   계정 기록이 없는 예전 기록(2026-10-02 계정 채우기) = 하나씩 등록상품 조회 — 응답 data.vendorId가 지금 업체코드와 같으면 market_account를 채우고 정상 판정.
 *     "다른 업체…조회할 수 없습니다"·"…의 데이터가 없습니다"(지운 상품인지 다른 계정 상품인지 모름)는 채우지 않고 판정도 하지 않는다 (근거 api/_marketUpdate.js coupangOwnerOf)
 * @returns {'done'|'partial'|'stopped'}  partial = 하나씩 조회할 것이 남음(다음 요청에서)
 */
async function checkCoupang(ctx, rows, errors) {
  const sink = errorSink()
  const cred = await withCredentials(ctx, sink)
  if (!cred) { errors.push({ market: MARKET, ...sink.error }); return 'stopped' }
  const vendor = cred.row.vendor_id
  const filled = new Set() // 이번 확인에서 판매처 응답으로 계정을 채운 기록
  const judge = s => (filled.has(s.id) ? 'same' : accountJudge(s.market_account, vendor))
  const quiet = [], singles = [], live = []
  for (const s of rows) {
    if (judge(s) === 'other') quiet.push(s.id) // 다른 계정으로 보낸 기록 — 지금 연결로는 조회되지 않는다(확인 시각만)
    else if (SINGLE_CHECK_STATUSES.includes(s.status) || judge(s) === 'unknown') singles.push(s) // 계정 기록 없음 = 하나씩 조회해 계정부터 확인
    else live.push(s)
  }
  const partial = singles.length > COUPANG_SINGLE_MAX
  for (const s of singles.slice(0, COUPANG_SINGLE_MAX)) {
    try {
      const r = await coupangCall(cred.call, { method: 'GET', path: PATHS.product(s.seller_product_id) })
      if (judge(s) === 'unknown') {
        if (coupangOwnerOf({ ok: true, data: r?.data }, vendor) !== 'mine') { console.warn('[marketplace] 쿠팡 계정 채우기: 응답 업체코드가 다름·없음 (판정 안 함):', s.seller_product_id); quiet.push(s.id); continue }
        await recordSendAccount(ctx, s.id, vendor)
        filled.add(s.id)
      }
      const statusName = r?.data?.statusName || ''
      const next = mapCoupangStatus(statusName)
      if (next === DELETED && judge(s) !== 'same') { quiet.push(s.id); continue } // 계정 기록이 없으면 삭제 판정을 하지 않는다
      const raw = statusName.slice(0, 40) || null
      const patch = { status: next, market_status: raw, last_synced_at: new Date().toISOString() }
      if (next === 'rejected' && (s.status !== 'rejected' || !s.reason)) {
        try {
          const h = await coupangCall(cred.call, { method: 'GET', path: PATHS.histories(s.seller_product_id) })
          const list = Array.isArray(h?.data) ? h.data : (Array.isArray(h?.data?.content) ? h.data.content : [])
          const rej = [...list].reverse().find(x => /반려/.test(String(x?.status || ''))) || list[list.length - 1]
          if (rej?.comment) patch.reason = String(rej.comment).slice(0, 2000)
        } catch (e) { console.warn('[marketplace] 반려 사유 조회 실패:', s.seller_product_id, e.code || e.message) }
      }
      if (next === s.status && raw === s.market_status && !('reason' in patch)) quiet.push(s.id)
      else await patchSend(ctx, s.id, patch)
    } catch (e) {
      if (!(e instanceof CoupangError)) throw e
      // 계정 기록이 없는 기록 — "다른 업체"·"데이터가 없습니다"는 이 계정 상품인지 모른다: 채우지 않고 판정도 하지 않는다(오류로도 세지 않음)
      if (judge(s) === 'unknown' && ['other', 'none'].includes(coupangOwnerOf({ ok: false, raw: e.raw }, vendor))) { quiet.push(s.id); continue }
      console.warn('[marketplace] 쿠팡 상태 조회 실패:', s.seller_product_id, e.code, e.raw)
      errors.push({ market: MARKET, id: s.id, code: e.code, message: e.message })
      if (STOP_CODES.includes(e.code)) { await touchSynced(ctx, quiet); return 'stopped' }
      quiet.push(s.id) // 이 기록만의 오류 — 확인 시각을 남겨 다음 묶음이 다른 기록으로 넘어가게
    }
  }
  if (live.length) {
    const deleted = new Set()
    let token = '', complete = false
    try {
      for (let page = 0; page < COUPANG_DELETED_PAGES_MAX; page++) {
        const r = await coupangCall(cred.call, { method: 'GET', path: PATHS.products, query: coupangDeletedQuery(vendor, token) })
        const pg = coupangListPage(r)
        pg.ids.forEach(id => deleted.add(id))
        if (!pg.next) { complete = true; break }
        token = pg.next
      }
    } catch (e) {
      if (!(e instanceof CoupangError)) throw e
      console.warn('[marketplace] 쿠팡 삭제 상품 목록 조회 실패:', e.code, e.raw)
      errors.push({ market: MARKET, code: e.code, message: e.message })
      await touchSynced(ctx, quiet)
      return 'stopped'
    }
    if (!complete) console.warn(`[marketplace] 쿠팡 삭제 상품 목록이 ${COUPANG_DELETED_PAGES_MAX}쪽을 넘음 — 앞쪽만 봄(못 본 삭제는 "삭제됨"으로 바꾸지 않음) ${ctx.userId}`)
    for (const s of live) {
      if (deleted.has(String(s.seller_product_id))) await patchSend(ctx, s.id, { status: DELETED, market_status: '상품삭제', last_synced_at: new Date().toISOString() })
      else quiet.push(s.id)
    }
  }
  await touchSynced(ctx, quiet)
  return partial ? 'partial' : 'done'
}
/**
 * 스마트스토어 — 토큰 1번 + (계정 식별값이 없으면 계정 정보 조회 1번) + 상품 목록 조회 1번(원상품번호 최대 500개).
 * 계정이 다른 기록은 조회하지 않는다. 검색 결과에 없는 상품은 같은 계정일 때만 원상품 조회로 하나씩(SS_SINGLE_MAX까지 — 404 NOT_FOUND = 삭제)
 * DELETE·404로 "삭제됨"을 판정하는 것은 같은 계정일 때만 — 계정 기록이 없는 예전 기록은 상태 그대로
 * @returns {'done'|'partial'|'stopped'}  partial = 하나씩 조회할 것이 남음(다음 요청에서)
 */
async function checkSmartstore(ctx, rows, errors) {
  const sink = errorSink()
  const cred = await smartstoreCredentials(ctx, sink)
  if (!cred) { errors.push({ market: SMARTSTORE, ...sink.error }); return 'stopped' }
  const account = await smartstoreAccountKey(ctx, cred)
  const judge = s => accountJudge(s.market_account, account)
  const quiet = rows.filter(s => judge(s) === 'other').map(s => s.id)
  const mine = rows.filter(s => judge(s) !== 'other')
  if (!mine.length) { await touchSynced(ctx, quiet); return 'done' }
  let found
  try {
    const r = await smartstoreApi(cred, { method: 'POST', path: SS_SEARCH_PATH, json: smartstoreSearchBody(mine.map(s => s.seller_product_id)) })
    found = smartstoreSearchStatuses(r.json)
  } catch (e) {
    if (!(e instanceof SmartstoreError)) throw e
    console.warn('[marketplace] 스마트스토어 상품 목록 조회 실패:', e.code, e.status, e.raw)
    errors.push({ market: SMARTSTORE, code: e.code, message: e.message })
    await touchSynced(ctx, quiet)
    return 'stopped'
  }
  let singles = 0, partial = false
  for (const s of mine) {
    let statusType = found.get(String(s.seller_product_id))
    // 계정 기록이 없는 예전 기록(2026-10-02) — 상품 목록 조회는 이 스토어 토큰(type SELF)으로 부르므로 결과에 있으면 이 스토어 상품 → 계정을 채운다.
    // 결과에 없으면(지운 상품인지 다른 스토어 상품인지 모름) 채우지 않고 판정도 하지 않는다
    if (statusType != null && account && judge(s) === 'unknown') { await recordSendAccount(ctx, s.id, account); s.market_account = account }
    const same = judge(s) === 'same'
    if (statusType == null) {
      if (!same) { quiet.push(s.id); continue } // 계정 기록이 없으면 "없음"으로 삭제를 판정하지 않는다 — 부르지 않는다
      if (singles >= SS_SINGLE_MAX) { partial = true; continue } // 다음 요청에서 (확인 시각을 남기지 않는다)
      singles++
      try {
        const r = await smartstoreApi(cred, { method: 'GET', path: ssOriginProductPath(s.seller_product_id) })
        statusType = r.json?.originProduct?.statusType
      } catch (e) {
        if (!(e instanceof SmartstoreError)) throw e
        if (isSsNotFound(e.status, e.raw)) statusType = 'DELETE'
        else {
          console.warn('[marketplace] 스마트스토어 원상품 조회 실패:', s.seller_product_id, e.code, e.status, e.raw)
          errors.push({ market: SMARTSTORE, id: s.id, code: e.code, message: e.message })
          if (STOP_CODES.includes(e.code)) { await touchSynced(ctx, quiet); return 'stopped' }
          quiet.push(s.id)
          continue
        }
      }
    }
    const next = smartstoreStatusOf(statusType)
    if (!next) { console.warn('[marketplace] 스마트스토어 상태 값을 모름 (기록 그대로):', s.seller_product_id, statusType); quiet.push(s.id); continue }
    if (next.status === DELETED && !same) { quiet.push(s.id); continue }
    if (next.status === s.status && next.raw === s.market_status) quiet.push(s.id)
    else await patchSend(ctx, s.id, { status: next.status, market_status: next.raw, last_synced_at: new Date().toISOString() })
  }
  await touchSynced(ctx, quiet)
  return partial ? 'partial' : 'done'
}
/**
 * 11번가 (2026-10-02) — 판매자 상품코드 조회(코드마다 1번, ELEVENST_LOOKUP_MAX까지). 근거·상태 표 api/_marketStatus.js
 * 판정은 응답에 우리 상품번호(prdNo)가 있을 때만 — 코드가 없는 예전 기록·응답에 없는 상품·모르는 상태 값은 기록을 바꾸지 않는다(확인 시각만)
 * 조회는 이 키로 부르므로 응답에 있는 상품 = 지금 연결된 계정의 상품 (계정 식별값은 기록하지 않는다 — 보고 참고)
 * @returns {'done'|'partial'|'stopped'}
 */
async function checkElevenst(ctx, rows, errors) {
  const sink = errorSink()
  const cred = await elevenstCredentials(ctx, sink)
  if (!cred) { errors.push({ market: ELEVENST, ...sink.error }); return 'stopped' }
  const quiet = rows.filter(s => !isElevenstSellerCode(s.seller_code)).map(s => s.id)
  const byCode = new Map()
  for (const s of rows) if (isElevenstSellerCode(s.seller_code)) (byCode.get(s.seller_code) || byCode.set(s.seller_code, []).get(s.seller_code)).push(s)
  const codes = [...byCode.keys()]
  for (const code of codes.slice(0, ELEVENST_LOOKUP_MAX)) {
    let products
    try {
      const xml = await elevenstCall(cred, { method: 'GET', path: ELEVENST_PATHS.sellerCode(code), translate: (st, t) => translateElevenstApi(st, t, '요청') })
      products = parseSellerCodeProducts(xml)
    } catch (e) {
      if (!(e instanceof ElevenstError)) throw e
      console.warn('[marketplace] 11번가 상태 조회 실패:', code, e.code, e.status, e.raw)
      errors.push({ market: ELEVENST, id: byCode.get(code)[0].id, code: e.code, message: e.message })
      if (STOP_CODES.includes(e.code)) { await touchSynced(ctx, quiet); return 'stopped' }
      quiet.push(...byCode.get(code).map(s => s.id))
      continue
    }
    for (const s of byCode.get(code)) {
      const hit = elevenstProductOf(products, s.seller_product_id)
      const next = hit ? elevenstStatusOf(hit.selStatCd, hit.selStatNm) : null
      if (!next) {
        if (!hit) console.info('[marketplace] 11번가 조회 결과에 우리 상품번호 없음 (판정 안 함):', s.seller_product_id, code, `받은 상품 ${products.length}개`)
        else console.warn('[marketplace] 11번가 상태 값을 모름 (기록 그대로):', s.seller_product_id, hit.selStatCd)
        quiet.push(s.id)
        continue
      }
      if (next.status === s.status && next.raw === s.market_status) quiet.push(s.id)
      else await patchSend(ctx, s.id, { status: next.status, market_status: next.raw, last_synced_at: new Date().toISOString() })
    }
  }
  await touchSynced(ctx, quiet)
  return codes.length > ELEVENST_LOOKUP_MAX ? 'partial' : 'done'
}
/**
 * 지그재그 (2026-10-02) — 간략화된 상품 기본정보 목록(product_summary_list — 문서: DIRECT 샵 전용, 한 번에 최대 100개) 1번
 *   목록에 없는 상품은 같은 계정(스토어 ID)일 때만 상품 조회(product — 없으면 null)를 하나씩(ZIGZAG_SINGLE_MAX까지) → null = 삭제됨
 *   상태: CLOSED(문서 "삭제") = 삭제됨 · 그 밖 = 등록 완료 + 원문 "판매중 · 노출" 등 (api/_zigzagFields.js zigzagStatusOf)
 *   계정 기록이 없는 예전 기록은 목록(이 스토어 키)에 나오면 이 스토어 상품 → 계정 채우고 판정 · 안 나오면 판정 안 함
 * @returns {'done'|'partial'|'stopped'}
 */
async function checkZigzag(ctx, rows, errors) {
  const sink = errorSink()
  const cred = await zigzagCredentials(ctx, sink)
  if (!cred) { errors.push({ market: ZIGZAG, ...sink.error }); return 'stopped' }
  const account = cred.shopId
  const judge = s => accountJudge(s.market_account, account)
  const quiet = rows.filter(s => judge(s) === 'other').map(s => s.id)
  const mine = rows.filter(s => judge(s) !== 'other').slice(0, Z_SUMMARY_MAX)
  if (!mine.length) { await touchSynced(ctx, quiet); return 'done' }
  let found
  try {
    const d = await zigzagCall(cred, { query: ZQ.summary, variables: { input: { product_id_list: mine.map(s => String(s.seller_product_id)) } } })
    found = new Map((d?.product_summary_list?.item_list || []).filter(p => p?.id != null).map(p => [String(p.id), p]))
  } catch (e) {
    if (!(e instanceof ZigzagError)) throw e
    console.warn('[marketplace] 지그재그 상품 목록 조회 실패:', e.code, e.status, e.raw)
    errors.push({ market: ZIGZAG, code: e.code, message: e.message })
    await touchSynced(ctx, quiet)
    return 'stopped'
  }
  let singles = 0, partial = rows.filter(s => judge(s) !== 'other').length > Z_SUMMARY_MAX
  for (const s of mine) {
    let p = found.get(String(s.seller_product_id)) || null
    if (p && account && judge(s) === 'unknown') { await recordSendAccount(ctx, s.id, account); s.market_account = account }
    const same = judge(s) === 'same'
    if (!p) {
      if (!same) { quiet.push(s.id); continue } // 계정 기록이 없으면 "없음"으로 삭제를 판정하지 않는다
      if (singles >= ZIGZAG_SINGLE_MAX) { partial = true; continue }
      singles++
      try {
        p = (await zigzagCall(cred, { query: ZQ.product, variables: { id: String(s.seller_product_id) } })).product || { sales_status: 'CLOSED' } // 문서: 상품이 없으면 null
      } catch (e) {
        if (!(e instanceof ZigzagError)) throw e
        console.warn('[marketplace] 지그재그 상품 조회 실패:', s.seller_product_id, e.code, e.status, e.raw)
        errors.push({ market: ZIGZAG, id: s.id, code: e.code, message: e.message })
        if (STOP_CODES.includes(e.code)) { await touchSynced(ctx, quiet); return 'stopped' }
        quiet.push(s.id)
        continue
      }
    }
    const next = zigzagStatusOf(p.sales_status, p.display_status)
    if (!next) { console.warn('[marketplace] 지그재그 상태 값을 모름 (기록 그대로):', s.seller_product_id, p.sales_status); quiet.push(s.id); continue }
    if (next.status === DELETED && !same) { quiet.push(s.id); continue }
    if (next.status === s.status && next.raw === s.market_status) quiet.push(s.id)
    else await patchSend(ctx, s.id, { status: next.status, market_status: next.raw, last_synced_at: new Date().toISOString() })
  }
  await touchSynced(ctx, quiet)
  return partial ? 'partial' : 'done'
}
const CHECKERS = { [MARKET]: checkCoupang, [SMARTSTORE]: checkSmartstore, [ELEVENST]: checkElevenst, [ZIGZAG]: checkZigzag }
async function checkMarket(ctx, market, since, errors) {
  const batch = CHECK_BATCH[market]
  const or = encodeURIComponent(`(last_synced_at.is.null,last_synced_at.lt."${since}")`)
  const rows = await sb(ctx.cfg, `marketplace_sends?select=${CHECK_SELECT}&user_id=eq.${ctx.userId}&market=eq.${market}&seller_product_id=not.is.null&status=in.(${CHECK_STATUSES.join(',')})&or=${or}&order=last_synced_at.asc.nullsfirst,created_at.desc&limit=${batch + 1}`)
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) return false
  const result = await CHECKERS[market](ctx, list.slice(0, batch), errors)
  return result === 'partial' || (result === 'done' && list.length > batch) // 남은 것이 있으면 true
}
async function sync(ctx, body, res) {
  const since = checkSince(body?.since)
  const errors = []
  let more = false
  try {
    for (const market of STATUS_CHECK_MARKETS) {
      if (await checkMarket(ctx, market, since, errors)) more = true
    }
    // 남은 것이 있으면 목록을 보내지 않는다 — 화면이 같은 since로 다시 부르고, 끝날 때 한 번만 받는다
    return res.status(200).json(more ? { errors, more } : { errors, more, sends: await loadSends(ctx) })
  } catch (e) {
    if (isNewColumnMissing(e)) return newSqlMissing(res, e, 'sync')
    throw e
  }
}

// ── GET: 쿠팡이 내려받는 이미지 (로그인 없음 · 토큰만) ──
async function serveImage(req, res) {
  const cfgOk = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!cfgOk) {
    console.error('[marketplace] 이미지 전달: SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 없음')
    return sendError(res, 500, 'server_misconfigured', '이미지를 전달하지 못했습니다.')
  }
  const cfg = { supabaseUrl: process.env.SUPABASE_URL, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY }
  let encKey
  try { encKey = loadEncKey() } catch (e) {
    console.error('[marketplace] 이미지 전달: MARKETPLACE_ENC_KEY 문제:', e.message)
    return sendError(res, 503, 'enc_not_ready', NOT_READY_MESSAGE)
  }
  const url = new URL(req.url || '/', 'http://x')
  const tok = verifyImageToken(encKey, url.searchParams.get('t'))
  if (!tok) return sendError(res, 404, 'not_found', 'not found')
  const rows = await sb(cfg, `marketplace_sends?select=request_json&id=eq.${tok.sendId}&limit=1`)
  const path = rows?.[0]?.request_json?.files?.[tok.key]
  if (typeof path !== 'string' || !path) return sendError(res, 404, 'not_found', 'not found')
  const dl = await storageDownload(cfg, BUCKET, path)
  if (!dl.found) return sendError(res, 404, 'not_found', 'not found')
  let mime = sniffMime(dl.buf) || (path.endsWith('.png') ? 'image/png' : path.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
  // 상세 이미지 — 보낼 때 세운 계획(request_json.pieces)대로 조각을 만들어 준다. 계획에 없는 장은 받은 그대로, 10MB를 넘을 때만 품질을 낮춘다
  const piece = rows?.[0]?.request_json?.pieces?.[tok.key]
  if (piece && mime.startsWith('image/')) {
    const out = await renderDetailPiece(dl.buf, piece)
    if (out.tooBig) console.error(`[marketplace] 상세 이미지 조각이 품질 ${out.quality}에서도 10MB를 넘음: ${tok.sendId} ${tok.key} ${out.buf.length}바이트`)
    dl.buf = out.buf
    mime = out.mime
  } else if (/^\d/.test(tok.key) && mime.startsWith('image/') && dl.buf.length > DETAIL_MAX_BYTES) {
    const out = await shrinkBytes(dl.buf)
    if (out.tooBig) console.error(`[marketplace] 상세 이미지가 품질 ${out.quality}에서도 10MB를 넘음: ${tok.sendId} ${tok.key} ${out.buf.length}바이트`)
    dl.buf = out.buf
    mime = out.mime
  }
  res.setHeader('Content-Type', mime)
  res.setHeader('Content-Length', String(dl.buf.length))
  res.setHeader('Cache-Control', 'private, max-age=0, no-store')
  res.statusCode = 200
  return res.end(dl.buf)
}

// ── handler ──
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try { return await serveImage(req, res) } catch (e) {
      console.error('[marketplace] 이미지 전달 실패:', e.message)
      return sendError(res, 500, 'internal', '이미지를 전달하지 못했습니다.')
    }
  }
  const ctx = await studioGuard(req, res)
  if (!ctx) return
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (ELEVENST_SEND_ACTIONS.includes(body.action) && !elevenstSendAllowed(ctx)) {
    console.warn(`[marketplace] 11번가 보내기 요청 거절(공개 전·관리자 아님) ${ctx.userId}: ${body.action}`)
    return sendError(res, 403, 'market_unavailable', '지원하지 않는 판매처입니다.')
  }
  if (CAFE24_ACTIONS.includes(body.action) && !cafe24Allowed(ctx)) {
    console.warn(`[marketplace] 카페24 요청 거절(관리자 아님) ${ctx.userId}: ${body.action}`)
    return sendError(res, 403, 'market_unavailable', '지원하지 않는 판매처입니다.')
  }
  try {
    if (body.action === 'status') return await status(ctx, body, res)
    if (body.action === 'connect') return await connect(ctx, body, res)
    if (body.action === 'disconnect') return await disconnect(ctx, body, res)
    if (body.action === 'refresh_places') return await refreshPlaces(ctx, body, res)
    if (body.action === 'templates_list') return await templatesList(ctx, body, res)
    if (body.action === 'template_save') return await templateSave(ctx, body, res)
    if (body.action === 'template_delete') return await templateDelete(ctx, body, res)
    if (body.action === 'send_prepare') return await sendPrepare(ctx, body, res)
    if (body.action === 'category_predict') return await categoryPredict(ctx, body, res)
    if (body.action === 'brand_search') return await brandSearch(ctx, body, res)
    if (body.action === 'category_meta') return await categoryMeta(ctx, body, res)
    if (body.action === 'send') return await send(ctx, body, res)
    if (body.action === 'sends_list') return await sendsList(ctx, body, res)
    if (body.action === 'sync') return await sync(ctx, body, res)
    if (body.action === 'market_status') return await marketStatus(ctx, body, res)
    if (body.action === 'connect_11st') return await connectElevenst(ctx, body, res)
    if (body.action === 'disconnect_11st') return await disconnectElevenst(ctx, body, res)
    if (body.action === 'connect_smartstore') return await connectSmartstore(ctx, body, res)
    if (body.action === 'disconnect_smartstore') return await disconnectSmartstore(ctx, body, res)
    if (body.action === 'cafe24_begin') return await cafe24Begin(ctx, body, res)
    if (body.action === 'cafe24_launch') return await cafe24Launch(ctx, body, res)
    if (body.action === 'cafe24_finish') return await cafe24Finish(ctx, body, res)
    if (body.action === 'disconnect_cafe24') return await disconnectCafe24(ctx, body, res)
    if (body.action === 'cafe24_categories') return await cafe24Categories(ctx, body, res)
    if (body.action === 'cafe24_send') return await cafe24Send(ctx, body, res)
    if (body.action === 'smartstore_categories') return await smartstoreCategories(ctx, body, res)
    if (body.action === 'smartstore_addresses') return await smartstoreAddresses(ctx, body, res)
    if (body.action === 'smartstore_send') return await smartstoreSend(ctx, body, res)
    if (body.action === 'elevenst_categories') return await elevenstCategories(ctx, body, res)
    if (body.action === 'elevenst_addresses') return await elevenstAddresses(ctx, body, res)
    if (body.action === 'elevenst_send') return await elevenstSend(ctx, body, res)
    if (body.action === 'connect_zigzag') return await connectZigzag(ctx, body, res)
    if (body.action === 'disconnect_zigzag') return await disconnectZigzag(ctx, body, res)
    if (body.action === 'zigzag_meta') return await zigzagMeta(ctx, body, res)
    if (body.action === 'zigzag_send') return await zigzagSend(ctx, body, res)
    return sendError(res, 400, 'invalid_input', "action은 'status'·'connect'·'disconnect'·'refresh_places'·'templates_list'·'template_save'·'template_delete'·'send_prepare'·'category_predict'·'brand_search'·'category_meta'·'send'·'sends_list'·'sync'·'market_status'·'connect_11st'·'disconnect_11st'·'connect_smartstore'·'disconnect_smartstore'·'cafe24_begin'·'cafe24_launch'·'cafe24_finish'·'disconnect_cafe24'·'cafe24_categories'·'cafe24_send'·'smartstore_categories'·'smartstore_addresses'·'smartstore_send'·'elevenst_categories'·'elevenst_addresses'·'elevenst_send'·'connect_zigzag'·'disconnect_zigzag'·'zigzag_meta'·'zigzag_send' 중 하나여야 합니다.")
  } catch (e) {
    if (e?.status === 404 || e?.status === 401 || e?.status === 403) {
      console.error(`[marketplace] ${body.action} 표를 쓸 수 없음(GRANT·표 — docs/sql/2026-09-28-marketplace-coupang.sql):`, e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    console.error(`[marketplace] ${body.action} 처리 실패:`, e.message)
    return sendError(res, 500, 'internal', '판매처 연동 처리 중 오류가 발생했습니다.')
  }
}
