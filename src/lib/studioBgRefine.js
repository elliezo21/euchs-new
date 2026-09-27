/**
 * 배경 경계 다듬기 (17-3) — AI 마스크를 붓으로 고치는 계산 (순수 함수, DOM 없음 — node 테스트: scripts/test-studio-bg-refine.mjs)
 *
 * ★ 마스크 = 한 픽셀에 한 바이트(0~255, 흰 255 = 제품) · 가로×세로 = AI 마스크(edit.bg.mask.w × h)와 같다.
 * ★ 붓 두 가지: 'keep'(살리기 → 255 쪽으로) / 'erase'(지우기 → 0 쪽으로).
 *   한 획의 덮는 정도(coverage 0~255)는 획의 모든 선분 중 가장 큰 값 — 같은 자리를 한 획에서 여러 번 지나가도 두 번 칠해지지 않는다.
 *   결과 = 획을 시작할 때 마스크 + (목표 − 그 값) × coverage / 255.
 *   화면에서 칠하는 동안(선분마다 조금씩)과 되돌리기 뒤 다시 쌓을 때(replayOps)가 같은 함수·같은 순서라 결과가 바이트까지 같다.
 * ★ 붓 가장자리 부드럽기는 한 값으로 고정 (REFINE_SOFTNESS — 반지름의 바깥 30%가 부드럽게 줄어든다, 최소 1px).
 * ★ 저장 파일 이름의 key = sha256(가로|세로|마스크 바이트) 앞 16자 → 내용이 바뀌면 이름도 바뀐다 (서명 업로드는 같은 경로를 덮어쓰지 못한다).
 */

export const REFINE_SOFTNESS = 0.3
export const REFINE_MODES = ['keep', 'erase']

/** 목표 값 — 살리기 255, 지우기 0 */
export function targetOf(mode) {
  return mode === 'keep' ? 255 : 0
}

/** 반지름 r에서 거리 d의 덮는 정도 0~1 (안쪽은 1, 바깥 soft px 동안 부드럽게 0으로) */
export function brushAlpha(d, r) {
  const soft = Math.max(1, r * REFINE_SOFTNESS)
  const inner = r - soft
  if (d <= inner) return 1
  if (d >= r) return 0
  const t = (r - d) / soft
  return t * t * (3 - 2 * t)
}

/**
 * 선분 (x0,y0)-(x1,y1) 하나를 coverage에 찍는다 (한 픽셀의 값 = 지금까지 값과 이번 값 중 큰 것). 픽셀 가운데(x+0.5, y+0.5) 기준.
 * @param {Uint8Array} cov 가로×세로 한 바이트씩 (이 획의 덮는 정도)
 * @returns {{x,y,w,h}|null} 바뀐 범위 (사진 밖이면 null)
 */
export function stampSegment(cov, W, H, x0, y0, x1, y1, r) {
  const bx0 = Math.max(0, Math.floor(Math.min(x0, x1) - r))
  const by0 = Math.max(0, Math.floor(Math.min(y0, y1) - r))
  const bx1 = Math.min(W, Math.ceil(Math.max(x0, x1) + r))
  const by1 = Math.min(H, Math.ceil(Math.max(y0, y1) + r))
  if (bx1 <= bx0 || by1 <= by0) return null
  const dx = x1 - x0, dy = y1 - y0
  const len2 = dx * dx + dy * dy
  for (let y = by0; y < by1; y++) {
    const py = y + 0.5
    for (let x = bx0; x < bx1; x++) {
      const px = x + 0.5
      let t = len2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0
      t = t < 0 ? 0 : t > 1 ? 1 : t
      const ex = px - (x0 + t * dx), ey = py - (y0 + t * dy)
      const a = brushAlpha(Math.sqrt(ex * ex + ey * ey), r)
      if (a <= 0) continue
      const v = Math.round(a * 255)
      const i = y * W + x
      if (v > cov[i]) cov[i] = v
    }
  }
  return { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 }
}

/** 획의 i번째 선분 (점 하나뿐인 획은 그 점) — [x0,y0,x1,y1] */
export function segmentOf(pts, i) {
  if (pts.length <= 2) return [pts[0], pts[1], pts[0], pts[1]]
  return [pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3]]
}
export function segmentCount(pts) {
  return pts.length <= 2 ? 1 : pts.length / 2 - 1
}

/** 범위 안에서 mask = base + (목표 − base) × cov / 255 (base가 mask와 같은 배열이어도 된다 — 칸마다 읽고 쓴다) */
export function applyCoverage(mask, base, cov, W, target, rect) {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x, i = y * W + rect.x; x < rect.x + rect.w; x++, i++) {
      const c = cov[i]
      if (c === 0) { mask[i] = base[i]; continue }
      const b = base[i]
      mask[i] = b + Math.round(((target - b) * c) / 255)
    }
  }
}

/** 두 범위를 합친 범위 */
export function unionRect(a, b) {
  if (!a) return b
  if (!b) return a
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/** 올바른 획인지 — { mode: 'keep'|'erase', size: 1 이상, pts: [x,y,…] 짝수·유한 } */
export function isValidRefineStroke(s) {
  return !!s && REFINE_MODES.includes(s.mode) && Number.isFinite(s.size) && s.size >= 1
    && Array.isArray(s.pts) && s.pts.length >= 2 && s.pts.length % 2 === 0 && s.pts.every(Number.isFinite)
}

/**
 * 획 하나를 마스크에 칠한다 (마스크를 고친다). 화면에서 칠하는 동안과 같은 결과 — 다시 쌓기·테스트용.
 * @param {Uint8Array} scratch 가로×세로 0으로 채운 작업 칸 (없으면 새로 만든다. 쓰고 나면 다시 0으로 돌려 둔다)
 * @returns {{x,y,w,h}|null} 바뀐 범위
 */
export function paintStroke(mask, W, H, stroke, scratch = null) {
  if (!isValidRefineStroke(stroke)) {
    console.error('[studioBgRefine] 획 모양이 이상함 — 칠하지 않음:', stroke)
    return null
  }
  const cov = scratch || new Uint8Array(W * H)
  const r = stroke.size / 2
  let rect = null
  for (let i = 0, n = segmentCount(stroke.pts); i < n; i++) {
    const [x0, y0, x1, y1] = segmentOf(stroke.pts, i)
    rect = unionRect(rect, stampSegment(cov, W, H, x0, y0, x1, y1, r))
  }
  if (!rect) return null
  // 한 픽셀을 한 번만 바꾸므로 base = mask 그대로 (읽은 뒤 같은 칸에 쓴다) — 화면에서는 획 시작 값을 따로 둔다
  applyCoverage(mask, mask, cov, W, targetOf(stroke.mode), rect)
  clearRect(cov, W, rect)
  return rect
}

/** 범위를 0으로 */
export function clearRect(buf, W, rect) {
  for (let y = rect.y; y < rect.y + rect.h; y++) buf.fill(0, y * W + rect.x, y * W + rect.x + rect.w)
}

/**
 * 다듬기 화면의 동작 목록을 처음부터 다시 쌓는다 (되돌리기·다시 뒤).
 *   op = { type: 'stroke', stroke } | { type: 'ai' }  ('ai' = [AI 결과로 되돌리기] — 그 순간 AI 마스크로 바꾼다)
 * @param {Uint8Array} start 화면을 열 때 마스크 (다듬은 것이 있으면 그것, 없으면 AI)
 * @param {Uint8Array} ai AI 마스크 (edit.bg.mask — 절대 고치지 않는다)
 * @returns {Uint8Array} 새 마스크
 */
export function replayOps(start, ai, ops, W, H) {
  const mask = start.slice()
  const scratch = new Uint8Array(W * H)
  for (const op of ops) {
    if (op.type === 'ai') mask.set(ai)
    else if (op.type === 'stroke') paintStroke(mask, W, H, op.stroke, scratch)
  }
  return mask
}

/** 두 마스크가 바이트까지 같은지 */
export function sameMask(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/** RGBA 픽셀(마스크 PNG를 캔버스로 읽은 것) → 마스크 (첫 바이트 = R 또는 회색 — studioBg.applyMaskToRgba와 같은 규칙) */
export function maskFromRgba(rgba) {
  const n = rgba.length >> 2
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) out[i] = rgba[i * 4]
  return out
}

/** 마스크 → RGBA 픽셀 (R=G=B=값, A=255 — PNG로 저장할 캔버스용) */
export function maskToRgba(mask, out = new Uint8ClampedArray(mask.length * 4)) {
  for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
    const v = mask[i]
    out[j] = v; out[j + 1] = v; out[j + 2] = v; out[j + 3] = 255
  }
  return out
}

/**
 * 저장 이름 key = sha256(가로|세로|마스크) 앞 16자 (브라우저·node 모두 crypto.subtle)
 * @returns {Promise<string>}
 */
export async function refineKey(mask, W, H) {
  const head = new TextEncoder().encode(`${W}|${H}|`)
  const buf = new Uint8Array(head.length + mask.length)
  buf.set(head, 0)
  buf.set(mask, head.length)
  const d = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', buf))
  return Array.from(d.subarray(0, 8), b => b.toString(16).padStart(2, '0')).join('')
}
