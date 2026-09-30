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
 *   sends_list        → { sends:[…] }
 *   sync              → 승인대기 건을 쿠팡에서 다시 읽어(상품 조회 + histories) 갱신 → { sends }
 *   market_status     → { elevenst, smartstore, cafe24: { connected, account } }   (2026-09-30 — 카페24는 refresh 만료 7일 전이면 이때 갱신)
 *   connect_11st      { seller_login_id, api_key } → 중계 경유 출고지 조회로 키 확인(api/_elevenst.js) → 암호화 저장(쿠팡과 같은 표·방식) — 연결까지만
 *   disconnect_11st   → 11번가 계정 삭제
 *   connect_smartstore { client_id, client_secret } → 중계 경유 인증 토큰 발급으로 확인(api/_smartstore.js) → 암호화 저장(11번가와 같은 표·방식) — 연결까지만
 *   disconnect_smartstore → 스마트스토어 계정 삭제
 *   cafe24_begin      { mall_id, client_id, client_secret } → 앱 값 암호화 저장(status pending) → { authorizeUrl } (카페24 동의 화면 — api/_cafe24.js)
 *   cafe24_finish     { code, state } → state 확인 → 토큰 교환 · 권한 확인 → 토큰 암호화 저장(connected)
 *   disconnect_cafe24 → 카페24 계정 삭제
 * GET ?t={토큰}  (로그인 없음 — 쿠팡이 이미지를 내려받는 짧은 주소, _marketplaceCrypto 토큰 30분) → 파일 바이트 그대로 (302 아님)
 *
 * 비밀: 키는 MARKETPLACE_ENC_KEY로 암호화해 marketplace_accounts에만. 응답·로그·기록(request_json)에 키·서명을 넣지 않는다.
 * 환경변수: MARKETPLACE_ENC_KEY · MARKETPLACE_RELAY_URL · MARKETPLACE_RELAY_SECRET · MARKETPLACE_PUBLIC_URL(이미지 주소 기준, 기본 https://www.euchs.co.kr)
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
import { extractSkus1688, isSaleMode, DOC_MAX, BRAND_MAX, BRAND_NOT_FOUND, normalizeBrands, pickBrand, detailImagePlans, formFromBody, DETAIL_MAX_BYTES } from './_coupangFields.js'
import { renderDetailPiece, shrinkBytes, renderSquare } from './_coupangImage.js'
import { verifyElevenstKey, ElevenstError } from './_elevenst.js'
import { smartstoreToken, SmartstoreError } from './_smartstore.js'
import { Cafe24Error, authorizeUrl, makeState, verifyState, exchangeCode, refreshAccess, missingScopes, needsRefresh, isMallId, normalizeMallId } from './_cafe24.js'
import { lookupCachedTranslations } from './_translationCache.js'
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
const SENDS_LIST_MAX = 100
const SYNC_MAX = 30
const ACCOUNT_PUBLIC = 'id,seller_login_id,vendor_id,key_last4,expires_at,status,last_checked_at,last_error,created_at,updated_at'
const TEMPLATE_SELECT = 'id,name,delivery_charge_type,delivery_charge,free_ship_over_amount,delivery_charge_on_return,return_charge,exchange_charge,outbound_shipping_time_day,delivery_company_code,outbound_place_code,return_center_code,remote_area_deliverable,is_default,created_at,updated_at'
const SEND_SELECT = 'id,export_id,market,seller_product_id,status,coupang_status,reason,approval_requested_at,last_synced_at,created_at,updated_at,request_json'

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
// 연결까지만 — 보내기는 다음 작업. SQL docs/sql/2026-09-30-marketplace-11st-requests.sql 실행 전이면 503 marketplace_sql_missing(원인 로그)
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
/** 카페24 행 → 화면 값. pending(동의 대기)은 연결 전으로 · refresh 만료가 지났으면 expired */
function cafe24Public(c) {
  if (!c || c.status === 'pending') return { connected: false, account: null }
  const expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now()
  return { connected: true, account: { mall_id: c.seller_login_id, key_last4: c.key_last4, status: expired && c.status === 'connected' ? 'expired' : c.status, expires_at: c.expires_at, last_checked_at: c.last_checked_at, last_error: c.last_error } }
}
async function marketStatus(ctx, body, res) {
  const a = await oneAccount(ctx, ELEVENST, ELEVENST_PUBLIC)
  const s = await oneAccount(ctx, SMARTSTORE, ELEVENST_PUBLIC)
  let c = await oneAccount(ctx, CAFE24, CAFE24_PUBLIC)
  if (c && c.status === 'connected' && needsRefresh(c.expires_at)) c = (await keepCafe24Alive(ctx)) || c // 연결 유지 — 2주 refresh 만료 전에 갱신
  return res.status(200).json({
    elevenst: a ? { connected: true, account: { seller_login_id: a.seller_login_id, key_last4: a.key_last4, status: a.status, last_checked_at: a.last_checked_at, last_error: a.last_error } } : { connected: false, account: null },
    // 스마트스토어 — 칸을 하나씩 고른다(암호문 칸 없음). key_last4 = 애플리케이션 ID 끝 4자리 · 시크릿은 어떤 형태로도 안 내려감
    smartstore: s ? { connected: true, account: { key_last4: s.key_last4, status: s.status, last_checked_at: s.last_checked_at, last_error: s.last_error } } : { connected: false, account: null },
    // 카페24 — 쇼핑몰 ID·Client ID 끝 4자리·연결 유지 기한만. 시크릿·토큰은 안 내려감
    cafe24: cafe24Public(c),
    relayIp: RELAY_IP,
  })
}

// ── 카페24 (2026-09-30 S3-3) — 고객이 만든 앱의 Client ID·Secret → 카페24 동의 화면 → 연결 탭으로 돌아와 코드 교환 ──
// cafe24_begin  { mall_id, client_id, client_secret } → 암호화 저장(status pending) → { authorizeUrl } — 브라우저가 그 주소로 간다
// cafe24_finish { code, state } → state(이 사용자·10분) 확인 → 토큰 교환 → 권한 확인 → 토큰 암호화 저장(status connected)
async function cafe24Begin(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  const mallId = normalizeMallId(body.mall_id), id = String(body.client_id ?? '').trim(), secret = String(body.client_secret ?? '').trim()
  if (!isMallId(mallId)) return sendError(res, 400, 'invalid_input', '쇼핑몰 ID를 넣어 주세요. (영문 소문자·숫자)')
  if (!/^[\x21-\x7e]{8,200}$/.test(id)) return sendError(res, 400, 'invalid_input', 'Client ID를 넣어 주세요.')
  if (!/^[\x21-\x7e]{8,200}$/.test(secret)) return sendError(res, 400, 'invalid_input', 'Client Secret을 넣어 주세요.')
  const row = {
    user_id: ctx.userId, market: CAFE24, seller_login_id: mallId, vendor_id: null,
    access_key_enc: encryptSecret(id, encKey), secret_key_enc: encryptSecret(secret, encKey), key_last4: id.slice(-4).replace(/[^A-Za-z0-9-]/g, '-'),
    oauth_enc: null, access_expires_at: null, expires_at: null, status: 'pending', last_checked_at: null, last_error: null,
  }
  try {
    await sb(ctx.cfg, 'marketplace_accounts?on_conflict=user_id,market', { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=minimal' })
  } catch (e) {
    if (isSchemaGap(e)) {
      console.error('[marketplace] 카페24 앱 값 저장 실패 — marketplace_accounts에 cafe24·oauth_enc 없음(docs/sql/2026-09-30-marketplace-11st-requests.sql 실행 필요):', e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    throw e
  }
  console.info(`[marketplace] 카페24 연결 시작 ${ctx.userId} mall=${mallId}`)
  return res.status(200).json({ authorizeUrl: authorizeUrl({ mallId, clientId: id, state: makeState(encKey, ctx.userId) }) })
}
async function cafe24Credentials(ctx, encKey) {
  const row = await oneAccount(ctx, CAFE24, `${CAFE24_PUBLIC},access_key_enc,secret_key_enc,oauth_enc`)
  if (!row) return null
  return { row, call: { mallId: row.seller_login_id, clientId: decryptSecret(row.access_key_enc, encKey), clientSecret: decryptSecret(row.secret_key_enc, encKey), breakerKey: ctx.userId } }
}
async function saveCafe24Token(ctx, encKey, tok) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${CAFE24}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: { oauth_enc: encryptSecret(JSON.stringify({ access_token: tok.accessToken, refresh_token: tok.refreshToken }), encKey), access_expires_at: tok.accessExpiresAt, expires_at: tok.refreshExpiresAt, status: 'connected', last_checked_at: new Date().toISOString(), last_error: null },
  })
}
function cafe24Fail(res, e, where) {
  if (!(e instanceof Cafe24Error)) throw e
  console.warn(`[marketplace] 카페24 ${where} 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
  return sendError(res, e.status === 429 ? 429 : e.code === 'invalid_input' ? 400 : 502, e.code, e.message)
}
async function cafe24Finish(ctx, body, res) {
  const encKey = encKeyOr(res)
  if (!encKey) return
  if (!verifyState(encKey, body.state, ctx.userId)) return sendError(res, 400, 'bad_state', '연결 시간이 지났어요. [연결하기]를 다시 눌러 주세요.')
  const code = String(body.code ?? '').trim()
  if (!/^[\x21-\x7e]{4,500}$/.test(code)) return sendError(res, 400, 'invalid_input', '동의 결과를 읽지 못했어요. [연결하기]를 다시 눌러 주세요.')
  let cred
  try { cred = await cafe24Credentials(ctx, encKey) } catch (e) {
    console.error('[marketplace] 카페24 앱 값 복호화 실패:', e.message)
    return sendError(res, 500, 'decrypt_failed', '저장된 앱 값을 읽지 못했어요. [연결하기]를 다시 눌러 주세요.')
  }
  if (!cred) return sendError(res, 409, 'not_started', '연결을 시작한 기록이 없어요. [연결하기]를 다시 눌러 주세요.')
  let tok
  try { tok = await exchangeCode(cred.call, code) } catch (e) { return cafe24Fail(res, e, 'finish') }
  if (tok.mallId && tok.mallId !== cred.call.mallId) {
    console.warn(`[marketplace] 카페24 쇼핑몰 ID 다름: 넣은 값 ${cred.call.mallId} · 동의한 곳 ${tok.mallId}`)
    return sendError(res, 400, 'mall_mismatch', '넣은 쇼핑몰 ID와 동의한 쇼핑몰이 달라요. 쇼핑몰 ID를 확인해 주세요.')
  }
  const lack = missingScopes(tok.scopes)
  if (lack.length) return sendError(res, 400, 'scope_missing', `카페24 앱 권한에서 상품 읽기·쓰기와 상품분류 읽기를 모두 골라 주세요. (빠진 권한: ${lack.join(', ')})`)
  await saveCafe24Token(ctx, encKey, tok)
  console.info(`[marketplace] 카페24 연결 ${ctx.userId} mall=${cred.call.mallId}`)
  return marketStatus(ctx, body, res)
}
/** refresh 토큰 갱신 — 새 refresh 토큰을 바로 저장한다(예전 것은 카페24가 폐기). 실패면 기록만 남기고 null */
async function keepCafe24Alive(ctx) {
  let encKey
  try { encKey = loadEncKey() } catch (e) { console.error('[marketplace] 카페24 갱신: MARKETPLACE_ENC_KEY 문제:', e.message); return null }
  try {
    const cred = await cafe24Credentials(ctx, encKey)
    if (!cred?.row?.oauth_enc) return null
    const { refresh_token: rt } = JSON.parse(decryptSecret(cred.row.oauth_enc, encKey))
    await saveCafe24Token(ctx, encKey, await refreshAccess(cred.call, rt))
    return oneAccount(ctx, CAFE24, CAFE24_PUBLIC)
  } catch (e) {
    console.warn('[marketplace] 카페24 연결 유지(토큰 갱신) 실패:', e.code || '', e.message, e.raw || '')
    if (e instanceof Cafe24Error && ['bad_key', 'code_expired'].includes(e.code)) {
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
// 키 확인 = 중계 경유 인증 토큰 발급(api/_smartstore.js). 토큰은 저장하지 않는다. 연결까지만 — 보내기는 다음 작업
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
  console.info(`[marketplace] 스마트스토어 연결 ${ctx.userId}`)
  return marketStatus(ctx, body, res)
}
async function disconnectSmartstore(ctx, body, res) {
  await sb(ctx.cfg, `marketplace_accounts?user_id=eq.${ctx.userId}&market=eq.${SMARTSTORE}`, { method: 'DELETE', prefer: 'return=minimal' })
  return marketStatus(ctx, body, res)
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
    skus: skus.rows.map(r => ({ skuId: r.skuId, values: r.values.map(v => ({ name: pair(v.name), value: pair(v.value) })), priceCny: r.priceCny, stock: r.stock, imageUrl: r.imageUrl })),
  }
}
/** 다시 보낼 전송 — 내 것이고 반려 상태이고 쿠팡 상품 번호가 있어야 한다. 아니면 응답을 보내고 null */
async function loadRejectedSend(ctx, resendId, res) {
  const id = String(resendId ?? '').trim().toLowerCase()
  if (!UUID_RE.test(id)) { sendError(res, 400, 'invalid_input', 'resendId 형식이 올바르지 않아요.'); return null }
  const rows = await sb(ctx.cfg, `marketplace_sends?select=${SEND_SELECT}&id=eq.${id}&user_id=eq.${ctx.userId}&market=eq.${MARKET}&limit=1`)
  const s = Array.isArray(rows) ? rows[0] : null
  if (!s) { sendError(res, 404, 'not_found', '보낸 상품을 찾을 수 없어요. 목록을 새로고침해 주세요.'); return null }
  if (s.status !== 'rejected' || !/^\d{1,20}$/.test(String(s.seller_product_id || ''))) { sendError(res, 409, 'not_rejected', '반려된 상품만 고쳐서 다시 보낼 수 있어요. [상태 새로고침]을 눌러 주세요.'); return null }
  if (!s.export_id) { sendError(res, 404, 'not_found', '내 상품을 찾을 수 없어요. 목록을 새로고침해 주세요.'); return null }
  return s
}
const revisionsOf = s => (Array.isArray(s?.request_json?.revisions) ? s.request_json.revisions : [])
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
  const images = []
  for (const im of Array.isArray(imgs) ? imgs : []) {
    try { images.push({ id: im.id, path: im.original_path, width: im.width, height: im.height, included: im.included, sourceUrl: im.source_url || null, url: await storageSignDownload(ctx.cfg, BUCKET, im.original_path, PREVIEW_URL_SEC) }) }
    catch (e) { console.error('[marketplace] 사진 서명 주소 실패:', im.original_path, e.message) }
  }
  const [projRows, templates, places, account] = await Promise.all([
    sb(ctx.cfg, `studio_projects?select=title,offer_id&id=eq.${ex.project_id}&limit=1`), loadTemplates(ctx), loadPlaces(ctx), loadAccountRow(ctx),
  ])
  const source = await loadSource(ctx, projRows?.[0]?.offer_id)
  const connected = !!account && daysLeft(account.expires_at) >= 0
  return res.status(200).json({
    connected, markets: { [MARKET]: { connected } }, // 판매처마다 연결 여부 — 보내기 창 "보낼 판매처" 줄이 쓴다
    // projectTitle = 작업의 지금 이름 (내 상품을 만든 뒤 작업 이름을 한글로 고쳤을 수 있다 — 보내기 창의 상품명 기본값이 먼저 본다)
    export: { id: ex.id, title: ex.title || projRows?.[0]?.title || '', projectTitle: projRows?.[0]?.title || '', mode: ex.mode, format: ex.format, files: ex.files.map(f => ({ key: f.key, name: f.name, width: f.width, height: f.height })) },
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
  let prev = null
  if (body.resendId != null) {
    prev = await loadRejectedSend(ctx, body.resendId, res)
    if (!prev) return
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

  // 전송 기록 먼저 (id가 이미지 토큰 재료) — 다시 보내기는 예전 기록을 그대로 쓴다
  const created = prev ? [{ id: prev.id }] : await sb(ctx.cfg, 'marketplace_sends?select=id', { method: 'POST', body: { user_id: ctx.userId, export_id: ex.id, market: MARKET, status: 'sending', request_json: {} }, prefer: 'return=representation' })
  const sendId = created?.[0]?.id
  if (!sendId) throw new Error('marketplace_sends insert: id 없음')
  const fileTag = prev ? `${sendId}_${Date.now().toString(36)}` : sendId // 다시 보낼 때는 새 파일 이름 (예전 회차 파일을 덮지 않는다)
  const fail = async (status, code, message, extra = {}) => {
    if (prev) return sendError(res, status, code, message) // 다시 보내기가 실패해도 기록은 "반려" 그대로 — 고쳐서 또 보낼 수 있다
    await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { status: 'failed', reason: message.slice(0, 2000), ...extra }, prefer: 'return=minimal' }).catch(e => console.error('[marketplace] 실패 기록도 못 남김:', sendId, e.message))
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
  let current = null, plan = null
  if (prev) {
    try { current = await coupangCall(cred.call, { method: 'GET', path: PATHS.product(prev.seller_product_id) }) } catch (e) { return coupangFail(res, e, 'send/resend-get') }
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
  const requestJson = { body: built.body, files, pieces, categoryName: body.categoryName || null, revisions }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: { request_json: requestJson }, prefer: 'return=minimal' })
  if (prev) return await resend(ctx, res, { cred, prev, sendId, requestJson, plan })

  let r
  try { r = await coupangCall(cred.call, { method: 'POST', path: PATHS.products, body: built.body, extendedTimeout: true }) } catch (e) {
    if (!(e instanceof CoupangError)) throw e
    console.warn(`[marketplace] 상품 생성 실패 ${e.code} (HTTP ${e.status}): ${e.raw}`)
    return fail(e.status === 429 ? 429 : 502, e.code, e.message, { result_json: { code: e.code, status: e.status, raw: e.raw } })
  }
  const sellerProductId = r?.data != null ? String(r.data) : null
  const patch = { seller_product_id: sellerProductId && /^\d{1,20}$/.test(sellerProductId) ? sellerProductId : null, status: 'approval_pending', approval_requested_at: new Date().toISOString(), result_json: { code: r?.code, message: r?.message, data: r?.data } }
  await sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
  console.info(`[marketplace] 쿠팡 상품 생성 ${ctx.userId} send=${sendId} product=${patch.seller_product_id}`)
  return res.status(200).json({ sendId, sellerProductId: patch.seller_product_id, status: 'approval_pending' })
}

/**
 * 반려 상품 다시 승인 요청 — 상품 수정(PUT seller-products · 같은 sellerProductId · requested true) 한 번. 승인 요청 API는 부르지 않는다 (resendPlan)
 *   쿠팡이 수정을 거절하면 그 문구를 그대로 돌려준다. 기록은 "반려" 그대로
 * 회차 이력: request_json.revisions[] = { n, at, previousReason, previousStatus, coupangStatus(보내기 직전 쿠팡 상태), via('modify'), approval }
 *   (예전 회차에는 via 'approval'·approval false가 남아 있을 수 있다 — 승인 요청 API를 부르던 때의 기록)
 */
async function resend(ctx, res, { cred, prev, sendId, requestJson, plan }) {
  const pid = prev.seller_product_id
  const rev = { n: requestJson.revisions.length + 1, at: new Date().toISOString(), previousReason: prev.reason || null, previousStatus: prev.coupang_status || null, coupangStatus: plan.statusName || null, via: plan.via, approval: false }
  const save = patch => sb(ctx.cfg, `marketplace_sends?id=eq.${sendId}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
  let r
  try { r = await coupangCall(cred.call, { method: 'PUT', path: PATHS.products, body: requestJson.body, extendedTimeout: true }) } catch (e) {
    if (!(e instanceof CoupangError)) throw e
    console.warn(`[marketplace] 상품 수정 실패 ${e.code} (HTTP ${e.status}) product=${pid}: ${e.raw}`)
    return sendError(res, e.status === 429 ? 429 : 502, e.code, e.message)
  }
  await save({
    status: 'approval_pending', coupang_status: null, reason: null, approval_requested_at: new Date().toISOString(),
    request_json: { ...requestJson, revisions: [...requestJson.revisions, { ...rev, approval: true }] },
    result_json: { code: r?.code, message: r?.message, data: r?.data, step: 'resend' },
  })
  console.info(`[marketplace] 쿠팡 상품 수정 + 승인 요청 ${ctx.userId} send=${sendId} product=${pid} 회차=${rev.n} 쿠팡 상태="${plan.statusName}" 방법=${rev.via}`)
  return res.status(200).json({ sendId, sellerProductId: pid, status: 'approval_pending', resend: true, revision: rev.n })
}

// ── 처리현황 ──
function publicSend(s) {
  return {
    id: s.id, exportId: s.export_id, market: s.market || MARKET, sellerProductId: s.seller_product_id, status: s.status, coupangStatus: s.coupang_status, reason: s.reason,
    productName: s.request_json?.body?.sellerProductName || null, categoryName: s.request_json?.categoryName || null, revision: revisionsOf(s).length,
    approvalRequestedAt: s.approval_requested_at, lastSyncedAt: s.last_synced_at, createdAt: s.created_at, updatedAt: s.updated_at,
  }
}
async function loadSends(ctx) {
  const rows = await sb(ctx.cfg, `marketplace_sends?select=${SEND_SELECT}&user_id=eq.${ctx.userId}&market=eq.${MARKET}&order=created_at.desc&limit=${SENDS_LIST_MAX}`)
  return (Array.isArray(rows) ? rows : []).map(publicSend)
}
async function sendsList(ctx, body, res) {
  return res.status(200).json({ sends: await loadSends(ctx) })
}
async function sync(ctx, body, res) {
  const cred = await withCredentials(ctx, res)
  if (!cred) return
  const rows = await sb(ctx.cfg, `marketplace_sends?select=${SEND_SELECT}&user_id=eq.${ctx.userId}&market=eq.${MARKET}&seller_product_id=not.is.null&status=in.(sending,approval_pending,rejected)&order=created_at.desc&limit=${SYNC_MAX}`)
  const errors = []
  for (const s of Array.isArray(rows) ? rows : []) {
    try {
      const r = await coupangCall(cred.call, { method: 'GET', path: PATHS.product(s.seller_product_id) })
      const statusName = r?.data?.statusName || ''
      const next = mapCoupangStatus(statusName)
      const patch = { status: next, coupang_status: statusName.slice(0, 40) || null, last_synced_at: new Date().toISOString() }
      if (next === 'rejected') {
        try {
          const h = await coupangCall(cred.call, { method: 'GET', path: PATHS.histories(s.seller_product_id) })
          const list = Array.isArray(h?.data) ? h.data : (Array.isArray(h?.data?.content) ? h.data.content : [])
          const rej = [...list].reverse().find(x => /반려/.test(String(x?.status || ''))) || list[list.length - 1]
          if (rej?.comment) patch.reason = String(rej.comment).slice(0, 2000)
        } catch (e) { console.warn('[marketplace] 반려 사유 조회 실패:', s.seller_product_id, e.code || e.message) }
      }
      await sb(ctx.cfg, `marketplace_sends?id=eq.${s.id}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
    } catch (e) {
      if (!(e instanceof CoupangError)) throw e
      console.warn('[marketplace] 상태 조회 실패:', s.seller_product_id, e.code, e.raw)
      errors.push({ id: s.id, code: e.code, message: e.message })
      if (e.code === 'breaker_open' || e.code === 'rate_limited' || e.code === 'access_denied') break
    }
  }
  return res.status(200).json({ sends: await loadSends(ctx), errors })
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
    if (body.action === 'cafe24_finish') return await cafe24Finish(ctx, body, res)
    if (body.action === 'disconnect_cafe24') return await disconnectCafe24(ctx, body, res)
    return sendError(res, 400, 'invalid_input', "action은 'status'·'connect'·'disconnect'·'refresh_places'·'templates_list'·'template_save'·'template_delete'·'send_prepare'·'category_predict'·'brand_search'·'category_meta'·'send'·'sends_list'·'sync'·'market_status'·'connect_11st'·'disconnect_11st'·'connect_smartstore'·'disconnect_smartstore'·'cafe24_begin'·'cafe24_finish'·'disconnect_cafe24' 중 하나여야 합니다.")
  } catch (e) {
    if (e?.status === 404 || e?.status === 401 || e?.status === 403) {
      console.error(`[marketplace] ${body.action} 표를 쓸 수 없음(GRANT·표 — docs/sql/2026-09-28-marketplace-coupang.sql):`, e.message)
      return sendError(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE)
    }
    console.error(`[marketplace] ${body.action} 처리 실패:`, e.message)
    return sendError(res, 500, 'internal', '판매처 연동 처리 중 오류가 발생했습니다.')
  }
}
