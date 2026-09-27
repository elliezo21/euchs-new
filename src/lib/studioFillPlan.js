/**
 * 지우기 계산 순서 — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-fill-plan.mjs)
 *
 * ★ 계산 순서 규칙 (편집기 화면과 1-9 굽기가 반드시 같아야 한다)
 *   1) 지우기 레이어는 edit.layers 배열 순서(앞 = 먼저 그린 것)대로 차례로 메운다.
 *      레이어 k의 테두리 색은 "원본 + 레이어 0…k−1을 메운 결과"에서 읽는다.
 *   2) 메우는 범위 = 영역을 사방 pad px 넓힌 사각형(이미지 안으로 자름). 테두리 샘플은 그 바깥 RING px.
 *   3) 결과는 전체 이미지 한 장에 순서대로 applyFill 한 것과 픽셀 단위로 같다.
 *      편집기는 이를 영역 주변만 잘라서 계산한다:
 *        - 영향 범위 = 메우는 범위 + RING. 두 레이어의 영향 범위가 겹치면 "연결됨".
 *        - 레이어 k를 계산할 때, 자기 잘라낸 조각(메우는 범위 + RING + CROP_EXTRA)에
 *          연결된 앞 레이어들의 결과 조각을 순서대로 덮어쓴 뒤 applyFill 한다.
 *          (연결 판정 "영향 범위 겹침"은 "앞 레이어의 메우는 범위가 k의 잘라낸 조각에 닿음"과 같은 조건이다)
 *        - 떨어진 레이어끼리는 서로 영향이 없으므로 따로 계산한다.
 *      굽기(1-9)는 전체 이미지에 1)을 그대로 적용하면 된다.
 *   4) 캐시 키 = 자기 (id, x,y,w,h, method, pad) + 연결된 앞 레이어 전부(이어진 것까지)의 같은 값.
 *      앞 레이어가 바뀌면 뒤 레이어도 다시 계산된다.
 *
 * edit 값 → studioFill 인자: method 'coons' → 'bilinear', 'solid' → 'solid', ring RING, feather 0 (1-5 랩 기본값)
 *
 * ★ AI(method 'ai', 1-6b-3b): 메우는 범위 = 사방 max(pad, k), 잘라내는 범위 = 메우는 범위 + 여백 (k·여백은 studioAi/aiGeometry 규칙).
 *   영향 범위(연결 판정)는 메우는 범위 + RING으로 다른 방식과 같게 둔다. 계산 순서 규칙 1)~2)도 같다
 *   (연결된 앞 레이어 결과를 잘라낸 조각에 덮어쓴 뒤 엔진에 넣는다 — pastePrior).
 *   AI는 결과가 기기마다 조금씩 달라 3)의 "픽셀 단위로 같다"가 성립하지 않는다 → 결과 조각 PNG를 저장해 두고 쓴다.
 *   AI 계산은 비동기라 fillOnCrop이 아니라 편집기(StudioCanvas)가 엔진을 부른다. fillOnCrop은 'ai'를 unknown_method로 거절한다.
 *   AI는 [지우기]를 눌렀을 때만 계산한다 — 안 지운 앞 AI가 있을 때의 규칙은 effectiveKey·aiEraseSet 주석.
 *
 * ★ 덮기(type 'cover', 12-2 — studioCover.js)도 같은 배열·같은 순서 규칙으로 계산한다 (지우기 → 덮기 → 지우기가 섞여도 배열 순서대로).
 *   덮기는 읽는 곳이 두 군데(가져올 곳 + 덮을 곳)라서 연결 판정을 "앞 레이어가 쓰는 범위 + RING"과 "내가 읽는 범위들 + RING"의 겹침으로 일반화했다.
 *   지우기는 쓰는 범위 = 읽는 범위 = 메우는 범위라 예전 판정(영향 범위끼리 겹침)과 똑같다 → 지우기만 있는 사진의 계획·key는 예전 그대로.
 *   덮기는 AI가 아니므로 coons·단색과 같이 다룬다(effectiveKey — 안 지운 앞 AI는 원본 그대로 보고, 지우면 다시 계산).
 */
import { applyFill } from './studioFill.js'
import { expandRect } from './studioCoords.js'
import { aiK, aiMargin } from './studioAi/aiGeometry.js'
import { brushHash, solidFillBrush, rasterizeStrokes } from './studioBrush.js'
import { coverArea, coverReadRects, coverOwnKey, coverSourceArea, blendCover } from './studioCover.js'

export const RING = 2       // 테두리 샘플 두께 (studioFill ring)
export const CROP_EXTRA = 2 // 잘라낼 때 ring 바깥 여유
const METHOD_MAP = { coons: 'bilinear', solid: 'solid' }

/** AI 레이어의 실제 넓힘 폭 = max(pad, k) */
export function aiGrow(l, W, H) {
  return Math.max(l.pad, aiK(W, H))
}

/** 칠한 모양을 넓히는 폭 — AI는 max(pad, k), 그 밖은 pad (네모·붓 공통) */
export function growOf(l, W, H) {
  return l.method === 'ai' ? aiGrow(l, W, H) : l.pad
}

/**
 * 실제로 메워지는 범위 (원본 좌표).
 * 붓(shape 'brush')은 x,y,w,h = 칠한 모양을 감싸는 사각형이므로 같은 식으로 넓히면 넓힌 모양을 감싸는 사각형이 된다
 * (그 안에서 실제로 칠하는 곳은 마스크 — studioBrush.rasterizeStrokes).
 */
export function fillArea(l, W, H) {
  return expandRect(l, growOf(l, W, H), W, H)
}

/** 결과가 쓰이는 범위 — 지우기 = 메우는 범위, 덮기 = 덮을 곳 + feather */
export function writeRect(l, W, H) {
  return l.type === 'cover' ? coverArea(l, W, H) : fillArea(l, W, H)
}

/** 계산이 읽는 범위들 — 지우기 = 메우는 범위(테두리 샘플은 아래 RING), 덮기 = 가져올 곳 + 덮을 곳 */
export function readRects(l, W, H) {
  return l.type === 'cover' ? coverReadRects(l, W, H) : [fillArea(l, W, H)]
}

/** 영향 범위 = 쓰는 범위 + 테두리 샘플 */
export function influenceRect(l, W, H) {
  return expandRect(writeRect(l, W, H), RING, W, H)
}

/** 앞 레이어 j가 뒤 레이어 k의 계산에 영향을 주는가 (j가 쓰는 범위 + RING이 k가 읽는 범위 + RING에 닿음) */
function touches(infJ, readsK) {
  return readsK.some(r => rectsOverlap(infJ, r))
}

/** 계산할 때 잘라내는 범위 */
export function cropRect(l, W, H) {
  if (l.method === 'ai') return expandRect(fillArea(l, W, H), aiMargin(W, H), W, H)
  return expandRect(fillArea(l, W, H), RING + CROP_EXTRA, W, H)
}

/**
 * ★ AI는 [지우기]를 눌러야 계산한다 (1-6b-3b 해성 변경). 그래서 앞에 연결된 AI가 아직 안 지워졌을 수 있다.
 *   coons·단색은 그런 앞 AI를 "없는 것"(원본 그대로)으로 보고 먼저 계산하고, 그 AI를 지우면 다시 계산해야 한다.
 *   → 화면 계산에 쓰는 key = 계산 key + 아직 안 지운 앞 AI 목록. AI 레이어 자신은 계산 key 그대로
 *     (AI는 앞에 연결된 AI가 모두 지워진 뒤에만 계산한다 — aiEraseSet으로 같이 지운다).
 * @param entry     fillPlan 결과 한 줄 { id, chain, key }
 * @param fillsById id → 레이어
 * @param aiDone    id → 그 AI 레이어의 결과가 지금 화면에 있는가
 */
export function effectiveKey(entry, fillsById, aiDone) {
  if (fillsById.get(entry.id)?.method === 'ai') return entry.key
  const missing = entry.chain.filter(id => fillsById.get(id)?.method === 'ai' && !aiDone(id))
  return missing.length ? `${entry.key} ~ai-missing:${missing.join(',')}` : entry.key
}

/** [지우기]를 누르면 같이 지울 AI 레이어 = 앞에 연결된(chain) AI 중 안 지운 것 + 자기 (배열 순서) */
export function aiEraseSet(entry, fillsById, aiDone) {
  return [...entry.chain.filter(id => fillsById.get(id)?.method === 'ai' && !aiDone(id)), entry.id]
}

/**
 * AI 결과 조각 key — sha256(계산 key + '|' + 모델) 앞 16자 (16진수 소문자).
 * 레이어의 ai.key가 지금 이 값과 같으면 저장된 PNG를 그대로 쓴다.
 */
export async function aiPatchKey(planKey, modelId) {
  if (!planKey || !modelId) throw new Error(`aiPatchKey: 값이 비어 있음 (planKey=${!!planKey}, modelId=${!!modelId})`)
  const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${planKey}|${modelId}`))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

export function ownKey(l) {
  if (l.type === 'cover') return coverOwnKey(l)
  const base = `${l.id}|${l.x},${l.y},${l.w},${l.h}|${l.method}|${l.pad}`
  return l.shape === 'brush' ? `${base}|brush:${brushHash(l.brush)}` : base // 붓: 획이 바뀌면 key가 바뀐다
}

/**
 * 레이어 목록(지우기·덮기, 배열 순서) → 계산 계획
 * @returns {{ id, deps: string[], chain: string[], key: string }[]}
 *   deps: 직접 연결된 앞 레이어 (계산 때 덮어쓸 조각), chain: 이어진 앞 레이어 전부 (캐시 키용), 둘 다 배열 순서
 */
export function fillPlan(fills, W, H) {
  const inf = fills.map(l => influenceRect(l, W, H))
  const reads = fills.map(l => readRects(l, W, H).map(r => expandRect(r, RING, W, H)))
  const chains = []
  return fills.map((l, k) => {
    const deps = []
    const chainSet = new Set()
    for (let j = 0; j < k; j++) {
      if (!touches(inf[j], reads[k])) continue
      deps.push(j)
      chainSet.add(j)
      for (const c of chains[j]) chainSet.add(c)
    }
    const chain = [...chainSet].sort((a, b) => a - b)
    chains[k] = chain
    return {
      id: l.id,
      deps: deps.map(j => fills[j].id),
      chain: chain.map(j => fills[j].id),
      key: [...chain.map(j => ownKey(fills[j])), ownKey(l)].join(' > '),
    }
  })
}

/** 연결 그룹 (서로 이어진 레이어 묶음, 각 묶음은 배열 순서) */
export function connectedGroups(fills, W, H) {
  const inf = fills.map(l => influenceRect(l, W, H))
  const reads = fills.map(l => readRects(l, W, H).map(r => expandRect(r, RING, W, H)))
  const parent = fills.map((_, i) => i)
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let a = 0; a < fills.length; a++) {
    for (let b = a + 1; b < fills.length; b++) {
      if (touches(inf[a], reads[b])) parent[find(b)] = find(a)
    }
  }
  const groups = new Map()
  fills.forEach((l, i) => {
    const r = find(i)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r).push(l.id)
  })
  return [...groups.values()]
}

/** 연결된 앞 레이어 결과들을 배열 순서대로 잘라낸 조각에 덮어쓴다 (AI 계산 전 준비 — fillOnCrop과 같은 규칙) */
export function pastePrior(cropData, crop, prior = []) {
  for (const p of prior) paste(cropData, crop, p)
}

/** 앞 레이어 결과 조각(area 크기 RGBA)을 잘라낸 조각 위에 그대로 덮어쓴다 (알파 포함 픽셀 복사) */
function paste(cropData, crop, p) {
  const x0 = Math.max(crop.x, p.area.x), y0 = Math.max(crop.y, p.area.y)
  const x1 = Math.min(crop.x + crop.w, p.area.x + p.area.w), y1 = Math.min(crop.y + crop.h, p.area.y + p.area.h)
  if (x1 <= x0 || y1 <= y0) return
  const dst = cropData.data, src = p.data.data
  const rowLen = (x1 - x0) * 4
  for (let y = y0; y < y1; y++) {
    const so = ((y - p.area.y) * p.area.w + (x0 - p.area.x)) * 4
    const d = ((y - crop.y) * crop.w + (x0 - crop.x)) * 4
    dst.set(src.subarray(so, so + rowLen), d)
  }
}

/**
 * 잘라낸 조각에서 레이어 하나를 계산한다.
 * @param cropData  { data: Uint8ClampedArray, width, height } — 원본의 crop 범위 픽셀 (직접 고친다)
 * @param crop      cropRect(l, W, H)
 * @param prior     연결된 앞 레이어 결과 [{ area, data }] (배열 순서)
 * @returns {{ ok: true, area, data } | { ok: false, reason }}  data = 메운 범위의 RGBA ({ data, width, height })
 */
export function fillOnCrop(cropData, crop, l, W, H, prior = []) {
  if (l.type === 'cover') return { ok: false, reason: 'cover_needs_two_crops' } // 덮기는 coverOnCrops
  if (l.method === 'clear') return clearOnCrop(cropData, crop, l, W, H, prior)
  if (l.shape === 'brush') return fillBrushOnCrop(cropData, crop, l, W, H, prior)
  const method = METHOD_MAP[l.method]
  if (!method) return { ok: false, reason: `unknown_method:${l.method}` }
  const area = fillArea(l, W, H)
  if (area.w < 1 || area.h < 1) return { ok: false, reason: 'empty_rect' }
  pastePrior(cropData, crop, prior)
  const local = { x: area.x - crop.x, y: area.y - crop.y, w: area.w, h: area.h }
  const res = applyFill(cropData, local, method, { ring: RING, feather: 0 })
  if (!res.ok) return { ok: false, reason: res.reason }
  const out = new Uint8ClampedArray(area.w * area.h * 4)
  for (let y = 0; y < area.h; y++) {
    const so = ((local.y + y) * crop.w + local.x) * 4
    out.set(cropData.data.subarray(so, so + area.w * 4), y * area.w * 4)
  }
  return { ok: true, area, data: { data: out, width: area.w, height: area.h } }
}

/** 덮기 계산 때 잘라내는 두 범위 — 가져올 곳(+feather)·덮을 곳(+feather) */
export function coverCrops(l, W, H) {
  return { src: coverSourceArea(l, W, H), dst: coverArea(l, W, H) }
}

/**
 * 잘라낸 두 조각에서 덮기 하나를 계산한다 (fillOnCrop과 같은 규칙: 연결된 앞 레이어 결과를 두 조각에 덮어쓴 뒤 계산).
 * @param srcData  coverCrops(l).src 범위 픽셀 (직접 고친다)  @param dstData  coverCrops(l).dst 범위 픽셀 (직접 고친다)
 * @returns {{ ok: true, area, data } | { ok: false, reason }}
 */
export function coverOnCrops(srcData, dstData, l, W, H, prior = []) {
  const { src, dst } = coverCrops(l, W, H)
  pastePrior(srcData, src, prior)
  pastePrior(dstData, dst, prior)
  return blendCover(srcData, dstData, l, W, H)
}

/**
 * 삭제(method 'clear') — 선택 영역을 투명하게 비운다 (포토샵 Delete). 네모 = 메우는 범위 전부, 붓 = 칠한 모양(pad 넓힘)만.
 * 결과 조각은 다른 지우기와 같은 모양(메우는 범위 RGBA) — 비운 곳은 알파 0, 나머지는 (앞 레이어가 반영된) 원래 픽셀 그대로.
 * 쌓을 때는 조각을 덮어 그리지 않고 비운 곳을 뚫는다 (studioFillPatch clearMask → 화면 destination-out, composeErased도 같게).
 */
function clearOnCrop(cropData, crop, l, W, H, prior) {
  const area = fillArea(l, W, H)
  if (area.w < 1 || area.h < 1) return { ok: false, reason: 'empty_rect' }
  pastePrior(cropData, crop, prior)
  const mask = l.shape === 'brush' ? rasterizeStrokes(l.brush.strokes, area, l.pad) : null
  const local = { x: area.x - crop.x, y: area.y - crop.y }
  const out = new Uint8ClampedArray(area.w * area.h * 4)
  for (let y = 0; y < area.h; y++) {
    const so = ((local.y + y) * crop.w + local.x) * 4
    out.set(cropData.data.subarray(so, so + area.w * 4), y * area.w * 4)
  }
  for (let i = 0, n = area.w * area.h; i < n; i++) if (!mask || mask[i]) out[i * 4 + 3] = 0
  return { ok: true, area, data: { data: out, width: area.w, height: area.h } }
}

/** 붓 단색 — 칠한 모양(pad 넓힘)만 채우고, 메우는 범위 안이라도 모양 밖은 (앞 레이어가 반영된) 원래 픽셀 그대로 */
function fillBrushOnCrop(cropData, crop, l, W, H, prior) {
  if (l.method !== 'solid') return { ok: false, reason: `unknown_method:${l.method}` } // 붓 AI는 엔진이 계산
  const area = fillArea(l, W, H)
  if (area.w < 1 || area.h < 1) return { ok: false, reason: 'empty_rect' }
  pastePrior(cropData, crop, prior)
  const res = solidFillBrush(cropData, crop, l.brush.strokes, l.pad, W, H)
  if (!res.ok) return { ok: false, reason: res.reason }
  const local = { x: area.x - crop.x, y: area.y - crop.y }
  const out = new Uint8ClampedArray(area.w * area.h * 4)
  for (let y = 0; y < area.h; y++) {
    const so = ((local.y + y) * crop.w + local.x) * 4
    out.set(cropData.data.subarray(so, so + area.w * 4), y * area.w * 4)
  }
  return { ok: true, area, data: { data: out, width: area.w, height: area.h } }
}
