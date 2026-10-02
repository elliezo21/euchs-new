/**
 * 보내기 창 입력값 기억 (2026-10-02) — 같은 상품(내 상품 id)을 다시 열면 마지막에 [보내기]를 누를 때 넣었던 값을 다시 보여 준다
 *
 * [왜 브라우저 저장인가] 기존 칸을 먼저 찾아봤다:
 *   marketplace_sends.request_json = 판매처에 실제로 보낸 본문 — 보내기 전 검사에서 막힌 실패(예: 상세 이미지 장 수)는 기록 자체가 없고,
 *   판매처 호출 전 실패는 request_json이 비어 있다. 지난 값 send_prepare.previous(api/_marketPrevious.js)도 판매가·재고·카테고리만(지그재그 배송비·옵션 없음)
 *   → 새 DB 칸 없이 이 브라우저(localStorage)에 남긴다. 키에 사용자 id를 넣어 다른 계정과 섞이지 않는다. 판매처 연결 키·토큰은 넣지 않는다(입력 칸 값만)
 * [모양] { v, at, common:{ productName, price, stock, opts, repImageId, fit } | null, sections:{ [market]: 섹션 draftOut() } }
 */
import { cloneOptionEditor } from './studioOptionEditor.js'

export const DRAFT_VERSION = 1
export const draftKey = (uid, exportId) => `studio-send-draft:${uid}:${exportId}`

/** 공통 정보에서 기억할 칸 */
export function commonDraft(common) {
  if (!common) return null
  return { productName: common.productName ?? '', price: common.price ?? null, stock: common.stock ?? null, opts: cloneOptionEditor(common.opts), repImageId: common.repImageId ?? null, fit: common.fit || 'contain' }
}
/** 기억한 공통 값을 지금 공통 정보에 덮는다 — 대표 이미지는 지금 후보에 있을 때만 */
export function applyCommonDraft(common, d, candidateIds = []) {
  if (!common || !d) return common
  if (typeof d.productName === 'string') common.productName = d.productName
  if (d.price === null || Number.isInteger(d.price)) common.price = d.price
  if (d.stock === null || Number.isInteger(d.stock)) common.stock = d.stock
  if (d.opts && Array.isArray(d.opts.groups)) common.opts = cloneOptionEditor(d.opts)
  if (d.repImageId && candidateIds.includes(d.repImageId)) common.repImageId = d.repImageId
  if (d.fit === 'contain' || d.fit === 'cover') common.fit = d.fit
  return common
}
/** 객체에서 정한 칸만 (값이 undefined면 뺀다) */
export const pickFields = (obj, keys) => Object.fromEntries(keys.filter(k => obj?.[k] !== undefined).map(k => [k, obj[k]]))

/** 읽기 — 없거나 모양이 다르면 null (브라우저 저장소를 못 쓰면 console.warn 뒤 null — 창은 예전처럼 빈 값으로 열린다) */
export function readDraft(storage, uid, exportId) {
  if (!uid || !exportId || !storage) return null
  let raw
  try { raw = storage.getItem(draftKey(uid, exportId)) } catch (e) { console.warn('[studioSendDraft] 입력값을 읽지 못함(브라우저 저장소):', e?.message); return null }
  if (!raw) return null
  let d
  try { d = JSON.parse(raw) } catch (e) { console.warn('[studioSendDraft] 기억한 입력값 모양이 달라 버림:', e?.message); return null }
  return d && d.v === DRAFT_VERSION && typeof d.sections === 'object' ? d : null
}
export function writeDraft(storage, uid, exportId, { common = null, sections = {} } = {}) {
  if (!uid || !exportId || !storage) return false
  const d = { v: DRAFT_VERSION, at: new Date().toISOString(), common, sections }
  try { storage.setItem(draftKey(uid, exportId), JSON.stringify(d)); return true } catch (e) { console.warn('[studioSendDraft] 입력값을 남기지 못함(브라우저 저장소):', e?.message); return false }
}
