/**
 * 사진 자르기 · 띠 잘라내기 (12-1단계) — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-crop.mjs)
 *
 * ★ 저장 위치: studio_images.edit 안의 두 칸 (지우기 layers·필터 look과 나란히 — 템플릿을 바꿔도 남는다, 결정 7)
 *     edit.crop = { x, y, w, h }      원본 픽셀. 없음 = 자르기 없음
 *     edit.cuts = [ { y, h }, … ]     원본 픽셀 기준 가로 띠(사진 폭 전체). y 순서, 겹치지 않게. 없음 = 띠 없음
 *   둘 다 기본값(없음)이면 칸을 두지 않는다 (예전 사진과 같은 모양 — withShape).
 * ★ 적용 순서 (모든 그리기 경로 공통 — geometryOf 하나): 원본 → 지우기 결과(완성 JPG 또는 원본+조각) → 띠 잘라내기(띠를 빼고 위아래를 붙임)
 *   → 자르기 → 필터 → 꾸미기. 자르기 네모도 원본 좌표라서 "원본에서 자르기 네모 안 + 띠가 아닌 부분"을 위에서부터 이어 붙인 것이 결과다.
 *   지우기 레이어 좌표는 원본 기준 그대로 (자르기·띠와 상관없이).
 * ★ 완성 JPG(5단계)에는 넣지 않는다 — 필터처럼 화면·미리보기·내보내기에서 적용. 그래서 자르기·띠를 바꿔도 erase_v가 안 올라가
 *   완성 JPG를 다시 만들 필요가 없다 (완성 JPG = 원본 크기의 지운 사진, 그 위에 자르기를 적용).
 */

export const SHAPE_MIN = 20     // 자르기 네모 가로·세로, 띠 높이, 띠를 빼고 남는 높이의 최소 (원본 px)
export const CUTS_MAX = 50      // 한 사진의 띠 개수
export const CROP_RATIOS = [
  { key: 'free', label: '자유', ratio: null },
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
  { key: 'orig', label: '원본 비율', ratio: 'orig' },
]

const okSize = (W, H) => Number.isInteger(W) && Number.isInteger(H) && W >= SHAPE_MIN && H >= SHAPE_MIN
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * 자르기 네모 정리 — 사진 안으로, 가로·세로 SHAPE_MIN 이상, 정수. 잘못된 값·사진 전체와 같은 네모 = null(자르기 없음)
 */
export function normalizeCrop(crop, W, H) {
  if (!crop || typeof crop !== 'object' || !okSize(W, H)) return null
  const [x0, y0, w0, h0] = [crop.x, crop.y, crop.w, crop.h].map(num)
  if ([x0, y0, w0, h0].some(v => v === null) || w0 <= 0 || h0 <= 0) return null
  const x = Math.min(W - SHAPE_MIN, Math.max(0, Math.round(x0)))
  const y = Math.min(H - SHAPE_MIN, Math.max(0, Math.round(y0)))
  const w = Math.min(W - x, Math.max(SHAPE_MIN, Math.round(w0)))
  const h = Math.min(H - y, Math.max(SHAPE_MIN, Math.round(h0)))
  if (x === 0 && y === 0 && w === W && h === H) return null
  return { x, y, w, h }
}

/**
 * 띠 정리 — 사진 안으로 자르고, y 순서, 겹치거나 붙은 띠는 합치고, SHAPE_MIN보다 얇은 띠는 뺀다(최대 CUTS_MAX개).
 * 띠를 빼고 남는 높이가 SHAPE_MIN보다 작으면 사진이 없어지므로 띠 전체를 없음([])으로 본다.
 */
export function normalizeCuts(cuts, H) {
  if (!Array.isArray(cuts) || !Number.isInteger(H) || H < SHAPE_MIN) return []
  const list = []
  for (const c of cuts) {
    const y = num(c?.y), h = num(c?.h)
    if (y === null || h === null || h <= 0) continue
    const a = Math.max(0, Math.round(y)), b = Math.min(H, Math.round(y + h))
    if (b > a) list.push([a, b])
  }
  list.sort((p, q) => p[0] - q[0])
  const merged = []
  for (const [a, b] of list) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  const out = merged.filter(([a, b]) => b - a >= SHAPE_MIN).slice(0, CUTS_MAX).map(([a, b]) => ({ y: a, h: b - a }))
  const removed = out.reduce((n, c) => n + c.h, 0)
  return H - removed >= SHAPE_MIN ? out : []
}

/** edit → { crop, cuts } (정리한 값 — 그리기용) */
export function readShape(edit, W, H) {
  const e = edit && typeof edit === 'object' ? edit : {}
  return { crop: normalizeCrop(e.crop, W, H), cuts: normalizeCuts(e.cuts, H) }
}

/** edit에 자르기·띠를 넣은 새 edit — layers·look 등 다른 칸은 그대로. 없음이면 칸을 뺀다 */
export function withShape(edit, { crop, cuts }) {
  const base = edit && typeof edit === 'object' && !Array.isArray(edit) ? edit : {}
  const { crop: _c, cuts: _k, ...rest } = base
  const out = { ...rest }
  if (crop) out.crop = { x: crop.x, y: crop.y, w: crop.w, h: crop.h }
  if (Array.isArray(cuts) && cuts.length) out.cuts = cuts.map(c => ({ y: c.y, h: c.h }))
  return out
}

/** 자르기·띠가 없는지 */
export function isPlainShape(shape) {
  return !shape?.crop && !(shape?.cuts?.length)
}

/**
 * 결과 모양 — 모든 그리기 경로가 이 함수 하나를 쓴다.
 * @param {number} W,H 원본 크기 (완성 JPG도 원본 크기)  @param {{ crop?, cuts? }|object} shape edit 또는 { crop, cuts }
 * @returns {{ srcW, srcH, x, width, height, pieces: { sy, h, dy }[], identity: boolean, cropIgnored: boolean, crop, cuts }}
 *   pieces = 원본의 가로 조각(x ~ x+width, sy ~ sy+h)을 결과의 dy에 그린다 (위에서부터 이어 붙임).
 *   cropIgnored = 자르기 네모가 모두 띠 안이라 남는 것이 없어 자르기를 쓰지 않음 (화면이 알린다)
 */
export function geometryOf(W, H, shape) {
  const crop = normalizeCrop(shape?.crop, W, H)
  const cuts = normalizeCuts(shape?.cuts, H)
  const kept = []
  let y = 0
  for (const c of cuts) { if (c.y > y) kept.push([y, c.y]); y = c.y + c.h }
  if (y < H) kept.push([y, H])
  const build = region => {
    const pieces = []
    let dy = 0
    for (const [a, b] of kept) {
      const s = Math.max(a, region.y0), e = Math.min(b, region.y1)
      if (e > s) { pieces.push({ sy: s, h: e - s, dy }); dy += e - s }
    }
    return { pieces, height: dy }
  }
  let region = crop ? { x: crop.x, w: crop.w, y0: crop.y, y1: crop.y + crop.h } : { x: 0, w: W, y0: 0, y1: H }
  let r = build(region)
  let cropIgnored = false
  if (r.height < 1 && crop) {
    cropIgnored = true
    region = { x: 0, w: W, y0: 0, y1: H }
    r = build(region)
  }
  return {
    srcW: W, srcH: H, x: region.x, width: region.w, height: r.height, pieces: r.pieces,
    identity: !crop && cuts.length === 0, cropIgnored, crop: cropIgnored ? null : crop, cuts,
  }
}

/**
 * 결과를 ctx의 네모(dx, dy, dw, dh)에 그린다 — 조각마다 위·아래 경계를 정수로 맞춰 틈이 생기지 않게
 * @param {CanvasImageSource} source 원본 크기의 지운 사진 (원본 img·합성 캔버스·완성 JPG)
 */
export function drawGeometry(ctx, source, geo, dx, dy, dw, dh) {
  const k = dh / geo.height
  for (const p of geo.pieces) {
    const top = Math.round(dy + p.dy * k), bottom = Math.round(dy + (p.dy + p.h) * k)
    if (bottom > top) ctx.drawImage(source, geo.x, p.sy, geo.width, p.h, dx, top, dw, bottom - top)
  }
}

/** 결과 크기의 목표 폭 tw에서의 높이 (정수, 최소 1) */
export function geometryHeightAt(geo, tw) {
  return Math.max(1, Math.round((geo.height * tw) / geo.width))
}

// ── 자르기 창의 네모 조작 (원본 px) ──

/** 비율(가로/세로)을 맞춘 네모 — 지금 네모의 가운데를 두고, 지금 네모 안에 들어가는 가장 큰 크기. 사진 밖이면 안으로 */
export function fitRatio(rect, ratio, W, H) {
  if (!ratio) return rect
  let w = rect.w, h = rect.w / ratio
  if (h > rect.h) { h = rect.h; w = h * ratio }
  w = Math.max(SHAPE_MIN, Math.min(W, Math.round(w)))
  h = Math.max(SHAPE_MIN, Math.min(H, Math.round(h)))
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2
  const x = Math.min(W - w, Math.max(0, Math.round(cx - w / 2)))
  const y = Math.min(H - h, Math.max(0, Math.round(cy - h / 2)))
  return { x, y, w, h }
}

/**
 * 손잡이로 네모 바꾸기 — handle 'move' | 'n' 's' 'e' 'w' 'ne' 'nw' 'se' 'sw', dx·dy = 끈 거리(원본 px).
 * 반대쪽 변은 제자리, 사진 안, 최소 SHAPE_MIN. ratio(가로/세로)가 있으면 모서리·변 모두 비율 유지(모서리 = 가로 기준, 위아래 변 = 세로 기준)
 */
export function dragCrop(rect, handle, dx, dy, ratio, W, H) {
  if (handle === 'move') {
    return { ...rect, x: Math.min(W - rect.w, Math.max(0, Math.round(rect.x + dx))), y: Math.min(H - rect.h, Math.max(0, Math.round(rect.y + dy))) }
  }
  let x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.w, y1 = rect.y + rect.h
  if (handle.includes('w')) x0 = Math.min(x1 - SHAPE_MIN, Math.max(0, x0 + dx))
  if (handle.includes('e')) x1 = Math.max(x0 + SHAPE_MIN, Math.min(W, x1 + dx))
  if (handle.includes('n')) y0 = Math.min(y1 - SHAPE_MIN, Math.max(0, y0 + dy))
  if (handle.includes('s')) y1 = Math.max(y0 + SHAPE_MIN, Math.min(H, y1 + dy))
  if (ratio) {
    const horizontal = handle.includes('e') || handle.includes('w')
    let w = x1 - x0, h = y1 - y0
    if (horizontal) h = w / ratio; else w = h * ratio
    // 사진 밖으로 나가면 줄인다 (고정된 쪽 기준)
    const maxW = handle.includes('w') ? x1 : handle.includes('e') ? W - x0 : W
    const maxH = handle.includes('n') ? y1 : handle.includes('s') ? H - y0 : H
    const k = Math.min(1, maxW / w, maxH / h)
    w *= k; h *= k
    if (handle.includes('w')) x0 = x1 - w; else if (handle.includes('e')) x1 = x0 + w; else { const cx = (x0 + x1) / 2; x0 = cx - w / 2; x1 = cx + w / 2 }
    if (handle.includes('n')) y0 = y1 - h; else if (handle.includes('s')) y1 = y0 + h; else { const cy = (y0 + y1) / 2; y0 = cy - h / 2; y1 = cy + h / 2 }
  }
  const x = Math.round(Math.max(0, x0)), y = Math.round(Math.max(0, y0))
  return { x, y, w: Math.max(SHAPE_MIN, Math.round(Math.min(W, x1) - x)), h: Math.max(SHAPE_MIN, Math.round(Math.min(H, y1) - y)) }
}

/** 목록 표시 — "잘림", "띠 2", "잘림 · 띠 2", 없으면 '' */
export function shapeMark(shape) {
  const parts = []
  if (shape?.crop) parts.push('잘림')
  if (shape?.cuts?.length) parts.push(`띠 ${shape.cuts.length}`)
  return parts.join(' · ')
}
