/**
 * 스튜디오 → 판매처(쿠팡) 연동 — 브라우저 쪽 (서버 api/marketplace.js, 2026-09-28 2~3단계)
 *
 * 화면(StudioExportList.vue)의 [판매처로 보내기]는 sendToMarketplace(exportId) 하나만 부른다.
 *   → { status:'ready', prepare } → 보내기 창(StudioSendModal). 연결 전인 판매처는 창 안에서 [연결하기]로 안내
 * 실패는 throw — err.code = 서버 코드, err.message = 서버 문구(있으면) 또는 studioErrorMessage('marketplace', code)
 */
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

export const MARKET_LABEL = { coupang: '쿠팡', cafe24: '카페24', smartstore: '스마트스토어', '11st': '11번가' }
export const SEND_STATUS_LABEL = { sending: '전송 중', approval_pending: '승인 대기', approved: '승인', registered: '등록됨', rejected: '반려', failed: '실패' } // registered = 카페24·스마트스토어(승인 절차 없음 — 등록 즉시 끝)
// 색: 전송 중·승인 대기 = 회색, 승인·등록됨 = 초록, 반려·실패 = 빨강 (st-badge 위에 덧붙이는 클래스)
export const SEND_STATUS_CLASS = { sending: '', approval_pending: '', approved: 'st-badge-ok', registered: 'st-badge-ok', rejected: 'st-badge-danger', failed: 'st-badge-danger' }
export const REP_SIZE = 1000 // 브라우저가 만드는 대표 이미지 한 변(px) — 쿠팡 정사각형 500~5000
export { isNotReady, needsGuide, latestSendByExport, sendsByExport, badgeReason, SEND_BADGE_CLASS, SETTINGS_TABS, CHANNEL_TABS } from '@/lib/studioMarketplaceRules'

/** 서버 응답 → Error (서버가 message를 주면 그대로 — coupang_*·template_invalid·required_missing 등) */
export function marketplaceError(r) {
  const serverMsg = typeof r?.data?.message === 'string' && r.data.message !== r.code ? r.data.message : ''
  const err = new Error(serverMsg || studioErrorMessage('marketplace', r.code))
  err.code = r.code
  return err
}
async function call(action, body = {}) {
  const r = await callStudioApi('marketplace', { action, ...body })
  if (!r.ok) throw marketplaceError(r)
  return r.data
}

export const getMarketplaceStatus = () => call('status')
export const connectCoupang = (form) => call('connect', form)
export const disconnectCoupang = () => call('disconnect')
export const refreshPlaces = () => call('refresh_places')
export const listTemplates = () => call('templates_list')
export const saveTemplate = (template) => call('template_save', { template })
export const deleteTemplate = (id) => call('template_delete', { id })
export const prepareSend = (exportId) => call('send_prepare', { exportId })
export const prepareResend = (resendId) => call('send_prepare', { resendId })
export const predictCategory = (productName, brand) => call('category_predict', { productName, brand })
export const searchBrand = (brandName) => call('brand_search', { brandName })
export const getCategoryMeta =(categoryCode) => call('category_meta', { categoryCode })
export const sendProduct = (payload) => call('send', payload)
export const listSends = () => call('sends_list')
export const syncSends = () => call('sync')
// 11번가 · 스마트스토어 · 카페24 연결 (2026-09-30) — 상태는 studioMarketLinks.js가 한 곳에서 들고 있다
export const getMarketLinks = () => call('market_status')
export const connectElevenst = (form) => call('connect_11st', form)
export const disconnectElevenst = () => call('disconnect_11st')
export const connectSmartstore = (form) => call('connect_smartstore', form)
export const disconnectSmartstore = () => call('disconnect_smartstore')
// 카페24 = 우리 앱 방식 — 고객은 쇼핑몰 ID만. origin = 돌아오는 주소(www/비www 중 등록된 것)를 서버가 고르는 재료
const pageOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '')
export const beginCafe24 = (mallId) => call('cafe24_begin', { mall_id: mallId, origin: pageOrigin() })   // → { authorizeUrl } (카페24 동의 화면)
export const launchCafe24 = (query) => call('cafe24_launch', { query, origin: pageOrigin() })           // 쇼핑몰 관리자에서 앱을 열었을 때 — 쿼리 원문(hmac 확인) → { mallId, authorizeUrl }
export const finishCafe24 = (code, state) => call('cafe24_finish', { code, state })
export const disconnectCafe24 = () => call('disconnect_cafe24')
// 카페24 상품 보내기 (2026-09-30) — 서버가 토큰 갱신·이미지 업로드·등록(진열 안 함)까지. 창의 카페24 섹션(StudioSendCafe24)이 부른다
export const listCafe24Categories = () => call('cafe24_categories')                         // → { categories:[{ no, depth, parentNo, name, fullName }] }
export const sendCafe24Product = (payload) => call('cafe24_send', payload)                  // { exportId, productName, price, categoryNo?, repImageId, fit } → { sendId, productNo, status:'registered', adminUrl }
// 스마트스토어 상품 보내기 (2026-10-01) — 서버가 토큰·이미지 업로드(네이버 주소)·등록까지. 창의 스마트스토어 섹션(StudioSendSmartstore)이 부른다
export const listSmartstoreCategories = () => call('smartstore_categories')                 // → { categories:[{ id, name, wholeName }] } (리프만)
export const listSmartstoreAddresses = () => call('smartstore_addresses')                   // → { addresses:[{ id, name, type, address, phone }], defaults:{ shipping, return } }
export const sendSmartstoreProduct = (payload) => call('smartstore_send', payload)          // → { sendId, originProductNo, channelProductNo, status:'registered', display }
// 11번가 상품 보내기 (2026-10-01) — 서버가 이미지 주소·EUC-KR XML 등록까지. 창의 11번가 섹션(StudioSendElevenst)이 부른다
export const listElevenstCategories = () => call('elevenst_categories')                     // → { categories:[{ id, name, wholeName }] } (최하위만)
export const listElevenstAddresses = () => call('elevenst_addresses')                       // → { outAddresses, inAddresses, last:{ out, in }, defaults:{ out, in } }
export const sendElevenstProduct = (payload) => call('elevenst_send', payload)              // → { sendId, productNo, status:'registered', stopped, stopError }

/**
 * [판매처로 보내기] 진입 — 연결·내 상품을 확인하고 보내기 창에 필요한 값을 돌려준다.
 * 연결 전이어도 창은 연다 — 창 맨 위 "보낼 판매처"에서 그 판매처가 자물쇠 + [연결하기]로 보인다(prepare.markets).
 * @returns {Promise<{ status:'ready', prepare }>}
 */
export async function sendToMarketplace(exportId) {
  const prepare = await prepareSend(exportId)
  return { status: 'ready', prepare }
}

/** 반려된 전송 [고쳐서 다시 보내기] 진입 — prepare.resend에 그 전송의 값이 들어 있다 */
export async function resendToMarketplace(sendId) {
  const prepare = await prepareResend(sendId)
  return { status: 'ready', prepare }
}

/**
 * (보내기에는 쓰지 않는다 — 보낼 때는 서버가 Storage 원본을 읽어 만든다. 서명 주소는 10분 뒤 만료되므로 보내는 길에 두지 않는다)
 * 고른 사진을 정사각형 JPG(REP_SIZE)로 만든다 (짧은 변 기준 가운데 자르기 또는 흰 여백)
 * @param {string} url 사진 주소(서명 URL) @param {'cover'|'contain'} fit
 * @returns {Promise<string>} base64 (data: 접두어 없이)
 */
export async function makeSquareJpeg(url, fit = 'contain') {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`사진을 불러오지 못했어요 (HTTP ${resp.status})`)
  const bmp = await createImageBitmap(await resp.blob())
  try {
    const c = document.createElement('canvas')
    c.width = REP_SIZE
    c.height = REP_SIZE
    const g = c.getContext('2d')
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, REP_SIZE, REP_SIZE)
    const s = fit === 'cover' ? Math.max(REP_SIZE / bmp.width, REP_SIZE / bmp.height) : Math.min(REP_SIZE / bmp.width, REP_SIZE / bmp.height)
    const w = bmp.width * s, h = bmp.height * s
    g.drawImage(bmp, (REP_SIZE - w) / 2, (REP_SIZE - h) / 2, w, h)
    const dataUrl = c.toDataURL('image/jpeg', 0.9)
    return dataUrl.slice(dataUrl.indexOf(',') + 1)
  } finally {
    bmp.close()
  }
}

// 보내기 요청 본문 상한(글자 수) — 서버가 받는 본문이 4.5MB라 그보다 작게 막는다
export const SEND_BODY_MAX = 4 * 1000 * 1000

/** 파일 → base64 (data: 접두어 없이) */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => { const s = String(r.result || ''); resolve(s.slice(s.indexOf(',') + 1)) }
    r.onerror = () => reject(r.error || new Error('파일을 읽지 못했어요'))
    r.readAsDataURL(file)
  })
}

// 템플릿마다 마지막으로 고른 판매 방식 — 이 브라우저에만 기억한다(편의). 처음에는 값이 없어 고객이 직접 고른다
const SALE_MODE_KEY = id => `studio-mk-sale-mode:${id}`
export function readSaleMode(templateId) {
  try { return localStorage.getItem(SALE_MODE_KEY(templateId)) || '' } catch (e) {
    console.warn('[studioMarketplace] 판매 방식 기억을 읽지 못함 (고객이 다시 고른다):', e?.message)
    return ''
  }
}
export function rememberSaleMode(templateId, mode) {
  try { localStorage.setItem(SALE_MODE_KEY(templateId), mode) } catch (e) {
    console.warn('[studioMarketplace] 판매 방식 기억을 저장하지 못함:', e?.message)
  }
}

/** 만료일 표시 — D-14부터 경고 */
export function expiryState(expiresAt) {
  const left = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000)
  if (!Number.isFinite(left)) return { left: null, level: 'ok', label: '' }
  if (left < 0) return { left, level: 'expired', label: '만료됨' }
  if (left <= 14) return { left, level: 'warn', label: `D-${left} · 재발급 필요` }
  return { left, level: 'ok', label: `D-${left}` }
}

export function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '-'
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString()
  return `${k.slice(0, 4)}.${k.slice(5, 7)}.${k.slice(8, 10)} ${k.slice(11, 16)}`
}
