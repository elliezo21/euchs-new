/**
 * 스튜디오 → 판매처(쿠팡) 연동 — 브라우저 쪽 (서버 api/marketplace.js, 2026-09-28 2~3단계)
 *
 * 화면(StudioExportList.vue)의 [판매처로 보내기]는 sendToMarketplace(exportId) 하나만 부른다.
 *   → { status:'ready', prepare } 면 보내기 창(StudioSendModal)을 연다 / 'not_connected' 면 판매처 연결 화면으로 안내
 * 실패는 throw — err.code = 서버 코드, err.message = 서버 문구(있으면) 또는 studioErrorMessage('marketplace', code)
 */
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

export const MARKET_LABEL = { coupang: '쿠팡' }
export const SEND_STATUS_LABEL = { sending: '전송 중', approval_pending: '승인 대기', approved: '승인', rejected: '반려', failed: '실패' }
export const SEND_STATUS_CLASS = { sending: 'st-badge-outline', approval_pending: 'st-badge-accent', approved: 'st-badge-solid', rejected: 'st-badge-danger', failed: 'st-badge-danger' }
export const REP_SIZE = 1000 // 브라우저가 만드는 대표 이미지 한 변(px) — 쿠팡 정사각형 500~5000

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
export const predictCategory = (productName, brand) => call('category_predict', { productName, brand })
export const getCategoryMeta = (categoryCode) => call('category_meta', { categoryCode })
export const sendProduct = (payload) => call('send', payload)
export const listSends = () => call('sends_list')
export const syncSends = () => call('sync')

/**
 * [판매처로 보내기] 진입 — 연결·완성작을 확인하고 보내기 창에 필요한 값을 돌려준다.
 * @returns {Promise<{ status:'ready', prepare } | { status:'not_connected', message }>}
 */
export async function sendToMarketplace(exportId) {
  const prepare = await prepareSend(exportId)
  if (!prepare.connected) return { status: 'not_connected', message: '먼저 [판매처 연결]에서 쿠팡을 연결해 주세요.' }
  return { status: 'ready', prepare }
}

/**
 * 대표 이미지 — 고른 사진을 정사각형 JPG(REP_SIZE)로 만든다 (짧은 변 기준 가운데 자르기 또는 흰 여백)
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
