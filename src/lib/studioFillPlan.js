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
 */
import { applyFill } from './studioFill.js'
import { expandRect } from './studioCoords.js'

export const RING = 2       // 테두리 샘플 두께 (studioFill ring)
export const CROP_EXTRA = 2 // 잘라낼 때 ring 바깥 여유
const METHOD_MAP = { coons: 'bilinear', solid: 'solid' }

/** 실제로 메워지는 범위 (원본 좌표) */
export function fillArea(l, W, H) {
  return expandRect(l, l.pad, W, H)
}

/** 영향 범위 = 메우는 범위 + 테두리 샘플 */
export function influenceRect(l, W, H) {
  return expandRect(fillArea(l, W, H), RING, W, H)
}

/** 계산할 때 잘라내는 범위 */
export function cropRect(l, W, H) {
  return expandRect(fillArea(l, W, H), RING + CROP_EXTRA, W, H)
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

export function ownKey(l) {
  return `${l.id}|${l.x},${l.y},${l.w},${l.h}|${l.method}|${l.pad}`
}

/**
 * 레이어 목록(지우기만, 배열 순서) → 계산 계획
 * @returns {{ id, deps: string[], chain: string[], key: string }[]}
 *   deps: 직접 연결된 앞 레이어 (계산 때 덮어쓸 조각), chain: 이어진 앞 레이어 전부 (캐시 키용), 둘 다 배열 순서
 */
export function fillPlan(fills, W, H) {
  const inf = fills.map(l => influenceRect(l, W, H))
  const chains = []
  return fills.map((l, k) => {
    const deps = []
    const chainSet = new Set()
    for (let j = 0; j < k; j++) {
      if (!rectsOverlap(inf[j], inf[k])) continue
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
  const parent = fills.map((_, i) => i)
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let a = 0; a < fills.length; a++) {
    for (let b = a + 1; b < fills.length; b++) {
      if (rectsOverlap(inf[a], inf[b])) parent[find(b)] = find(a)
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
  const method = METHOD_MAP[l.method]
  if (!method) return { ok: false, reason: `unknown_method:${l.method}` }
  const area = fillArea(l, W, H)
  if (area.w < 1 || area.h < 1) return { ok: false, reason: 'empty_rect' }
  for (const p of prior) paste(cropData, crop, p)
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
