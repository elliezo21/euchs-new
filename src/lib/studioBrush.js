/**
 * 붓으로 칠한 지우기 영역 — 순수 함수 (DOM·canvas 없음, node 테스트: scripts/test-studio-brush.mjs)
 *
 * ★ 레이어 모양 (edit v2 안, 1-6b-3b):
 *   { id, type:'fill', shape:'brush', x, y, w, h, method:'ai'|'solid', pad, ai?,
 *     brush: { strokes: [ { mode:'add'|'sub', size, pts:[x1,y1,x2,y2,...] } ] } }
 *   x,y,w,h = 칠한 모양(획을 차례로 칠하고 덜어낸 결과)을 감싸는 사각형 (이미지 안). pts·size는 원본 픽셀 정수.
 *   shape가 없으면 네모 (기존 레이어).
 * ★ 마스크는 브라우저 canvas가 아니라 여기서 직접 그린다 — 기기·브라우저마다 가장자리 픽셀이 달라지면
 *   단색 결과와 계산 key가 흔들린다. 규칙: 픽셀 (x,y)는 어떤 선분까지의 거리² ≤ (size/2)²이면 칠해짐.
 *   획은 배열 순서대로: add는 칠하고, sub는 지운다.
 * ★ 넓힘(AI k, 단색 pad)은 칠한 모양을 원(유클리드 거리)으로 넓힌다 — 거리 변환(EDT)으로 정확히.
 */

export const BRUSH_SIZE_MIN = 2
export const BRUSH_SIZE_MAX = 600
// 레이어당 점 수 상한 — edit는 자동 저장 때마다 JSON 통째로 쓴다. 점 하나 ≈ 숫자 2개 ≈ 9~10바이트라
// 2000점 ≈ 20KB/레이어. 1920px 사진에서 글자 한 줄을 붓 48px로 칠하면 단순화 후 획당 약 30~80점 → 25~60획.
// 레이어 60개가 모두 상한이어도 약 1.2MB (DB 행·전송은 견디지만, 자동 저장이 무거워지지 않게 이 이상은 막는다)
export const BRUSH_MAX_POINTS = 2000
export const BRUSH_MAX_STROKES = 200
export const BRUSH_RING = 2 // 단색 테두리 샘플 두께 (studioFillPlan RING과 같게)

// ── 모양 검사 ─────────────────────────────────────────────────────────────────
export function brushPointCount(brush) {
  return (brush?.strokes || []).reduce((n, s) => n + (Array.isArray(s?.pts) ? s.pts.length / 2 : 0), 0)
}

export function isValidStroke(s) {
  return !!s && (s.mode === 'add' || s.mode === 'sub')
    && Number.isInteger(s.size) && s.size >= BRUSH_SIZE_MIN && s.size <= BRUSH_SIZE_MAX
    && Array.isArray(s.pts) && s.pts.length >= 2 && s.pts.length % 2 === 0 && s.pts.every(Number.isInteger)
}

/** 붓 레이어의 brush 필드 + 칠하기 방식 모양 검사 (틀리면 그리지 않고 보존) */
export function isValidBrushLayer(l) {
  const b = l?.brush
  return l?.shape === 'brush' && (l.method === 'ai' || l.method === 'solid')
    && !!b && Array.isArray(b.strokes) && b.strokes.length >= 1 && b.strokes.length <= BRUSH_MAX_STROKES
    && b.strokes.every(isValidStroke) && b.strokes.some(s => s.mode === 'add')
    && brushPointCount(b) <= BRUSH_MAX_POINTS
}

// ── 단순화 ────────────────────────────────────────────────────────────────────
/** 점 간격: 붓 크기의 1/4 (최소 1px) — 이보다 가까운 점은 칠한 모양을 거의 바꾸지 않는다 */
export function brushSpacing(size) {
  return Math.max(1, size / 4)
}

function perpDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  return Math.abs((px - ax) * dy - (py - ay) * dx) / Math.sqrt(len2)
}

function rdp(pts, eps) {
  const n = pts.length / 2
  if (n <= 2) return pts.slice()
  const keep = new Uint8Array(n)
  keep[0] = keep[n - 1] = 1
  const stack = [[0, n - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let best = -1, bi = -1
    for (let i = a + 1; i < b; i++) {
      const d = perpDist(pts[i * 2], pts[i * 2 + 1], pts[a * 2], pts[a * 2 + 1], pts[b * 2], pts[b * 2 + 1])
      if (d > best) { best = d; bi = i }
    }
    if (best > eps) { keep[bi] = 1; stack.push([a, bi], [bi, b]) }
  }
  const out = []
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1])
  return out
}

/**
 * 칠하는 중 모은 점 → 저장할 점 (정수). 1) 간격(크기/4)보다 가까운 점 버리기 2) 거의 직선인 점 줄이기(RDP, 허용 오차 크기의 2%)
 * 실측(scripts/test-studio-brush.mjs, 원·물결 곡선): 점 6~17분의 1, 가장자리 최대 이동 1px(크기 10)·1.4px(30)·2.2px(60)
 *   = 크기의 약 4% 이내. 허용 오차를 1%로 줄여도 이동은 거의 같고 점만 늘어서 2%로 정했다.
 */
export function simplifyStroke(pts, size) {
  if (pts.length < 2) return []
  const gap = brushSpacing(size)
  const out = [Math.round(pts[0]), Math.round(pts[1])]
  for (let i = 2; i < pts.length; i += 2) {
    const x = Math.round(pts[i]), y = Math.round(pts[i + 1])
    const lx = out[out.length - 2], ly = out[out.length - 1]
    const last = i === pts.length - 2
    if (Math.hypot(x - lx, y - ly) >= gap || (last && (x !== lx || y !== ly))) out.push(x, y)
  }
  return rdp(out, Math.max(0.5, size * 0.02))
}

// ── 마스크 그리기 ─────────────────────────────────────────────────────────────
/** 획이 닿을 수 있는 범위 (넓힘 전) */
export function strokeExtent(s) {
  const r = s.size / 2
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < s.pts.length; i += 2) {
    x0 = Math.min(x0, s.pts[i]); x1 = Math.max(x1, s.pts[i])
    y0 = Math.min(y0, s.pts[i + 1]); y1 = Math.max(y1, s.pts[i + 1])
  }
  return { x: Math.floor(x0 - r), y: Math.floor(y0 - r), w: Math.ceil(x1 + r) - Math.floor(x0 - r) + 1, h: Math.ceil(y1 + r) - Math.floor(y0 - r) + 1 }
}

function stamp(mask, rect, s, value) {
  const r2 = (s.size / 2) ** 2
  const r = s.size / 2
  const p = s.pts
  const segs = Math.max(1, p.length / 2 - 1)
  for (let k = 0; k < segs; k++) {
    const ax = p[k * 2], ay = p[k * 2 + 1]
    const bx = p.length >= 4 ? p[k * 2 + 2] : ax, by = p.length >= 4 ? p[k * 2 + 3] : ay
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy
    const X0 = Math.max(rect.x, Math.floor(Math.min(ax, bx) - r)), X1 = Math.min(rect.x + rect.w - 1, Math.ceil(Math.max(ax, bx) + r))
    const Y0 = Math.max(rect.y, Math.floor(Math.min(ay, by) - r)), Y1 = Math.min(rect.y + rect.h - 1, Math.ceil(Math.max(ay, by) + r))
    for (let y = Y0; y <= Y1; y++) {
      const row = (y - rect.y) * rect.w - rect.x
      for (let x = X0; x <= X1; x++) {
        let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2
        if (t < 0) t = 0; else if (t > 1) t = 1
        const ex = x - (ax + t * dx), ey = y - (ay + t * dy)
        if (ex * ex + ey * ey <= r2) mask[row + x] = value
      }
    }
  }
}

/** 1차원 제곱 거리 변환 (Felzenszwalb & Huttenlocher) — f: 0(칠함) 또는 큰 값. 무한대 대신 유한값(1e20)을 써서 계산이 깨지지 않게 */
function edt1d(f, n, d, v, z) {
  const sep = (q, p) => ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p)
  let k = 0
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s = sep(q, v[k])
    while (s <= z[k]) { k--; s = sep(q, v[k]) }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) ** 2 + f[v[k]]
  }
}

/** 마스크를 원으로 g px 넓힌다 (거리² ≤ g²). 새 배열 */
export function dilateMask(mask, w, h, g) {
  if (g <= 0) return mask.slice()
  const INF = 1e20
  const grid = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) grid[i] = mask[i] ? 0 : INF
  const n = Math.max(w, h)
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x]
  }
  const out = new Uint8Array(w * h)
  const g2 = g * g
  for (let i = 0; i < w * h; i++) out[i] = grid[i] <= g2 ? 1 : 0
  return out
}

/**
 * 획들 → rect 범위의 마스크 (1 = 칠함), g px 넓힘 포함.
 * 넓힘이 rect 밖의 칠한 픽셀에서도 들어오도록 사방 g만큼 더 그린 뒤 넓히고 잘라낸다.
 */
export function rasterizeStrokes(strokes, rect, grow = 0) {
  const g = Math.max(0, Math.ceil(grow))
  const big = { x: rect.x - g, y: rect.y - g, w: rect.w + 2 * g, h: rect.h + 2 * g }
  let m = new Uint8Array(big.w * big.h)
  for (const s of strokes) stamp(m, big, s, s.mode === 'sub' ? 0 : 1)
  if (grow > 0) m = dilateMask(m, big.w, big.h, grow)
  if (g === 0) return m
  const out = new Uint8Array(rect.w * rect.h)
  for (let y = 0; y < rect.h; y++) out.set(m.subarray((y + g) * big.w + g, (y + g) * big.w + g + rect.w), y * rect.w)
  return out
}

/** 칠한 모양을 감싸는 사각형 (이미지 안). 칠한 곳이 없으면 null */
export function brushBBox(strokes, W, H) {
  const adds = strokes.filter(s => s.mode === 'add')
  if (adds.length === 0) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const s of adds) {
    const e = strokeExtent(s)
    x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y); x1 = Math.max(x1, e.x + e.w); y1 = Math.max(y1, e.y + e.h)
  }
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1)
  if (x1 <= x0 || y1 <= y0) return null
  const rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  const m = rasterizeStrokes(strokes, rect, 0)
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      if (!m[y * rect.w + x]) continue
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: rect.x + minX, y: rect.y + minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

/** 획 전체를 dx, dy만큼 옮긴 새 brush */
export function translateBrush(brush, dx, dy) {
  return {
    ...brush,
    strokes: brush.strokes.map(s => ({ ...s, pts: s.pts.map((v, i) => v + (i % 2 === 0 ? dx : dy)) })),
  }
}

/** 획 내용 요약 (계산 key용) — FNV-1a 32비트 두 개 = 16자리 16진수. 획이 하나라도 바뀌면 달라진다 */
export function brushHash(brush) {
  const str = JSON.stringify((brush?.strokes || []).map(s => [s.mode, s.size, s.pts]))
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ c, 0x01000193 + 0x9e3779b0) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

// ── 단색 ─────────────────────────────────────────────────────────────────────
/**
 * 붓 단색: 칠한 모양(pad만큼 넓힘) 바깥 RING px 띠의 채널별 중앙값으로 칠한 모양만 채운다 (studioFill 단색과 같은 규칙).
 * @param cropData { data, width, height } — crop 범위 픽셀 (앞 레이어 결과를 덮어쓴 상태, 직접 고친다)
 * @param crop     원본 좌표 잘라낸 범위,  area 메우는 범위(원본 좌표, 이 범위 밖은 칠할 곳이 없음)
 * @returns {{ ok:true, color } | { ok:false, reason }}
 */
export function solidFillBrush(cropData, crop, strokes, grow, W, H) {
  const mask = rasterizeStrokes(strokes, crop, grow)
  const cw = crop.w, ch = crop.h
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
  let n = 0
  const R = BRUSH_RING
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x
      if (mask[i]) continue
      const gx = crop.x + x, gy = crop.y + y
      if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue
      let near = false
      for (let yy = Math.max(0, y - R); yy <= Math.min(ch - 1, y + R) && !near; yy++) {
        for (let xx = Math.max(0, x - R); xx <= Math.min(cw - 1, x + R); xx++) if (mask[yy * cw + xx]) { near = true; break }
      }
      if (!near) continue
      const o = i * 4
      hist[0][cropData.data[o]]++; hist[1][cropData.data[o + 1]]++; hist[2][cropData.data[o + 2]]++
      n++
    }
  }
  if (n === 0) return { ok: false, reason: 'no_border' }
  const median = h => { let acc = 0; for (let v = 0; v < 256; v++) { acc += h[v]; if (acc * 2 >= n) return v } return 255 }
  const c = [median(hist[0]), median(hist[1]), median(hist[2])]
  for (let i = 0; i < cw * ch; i++) {
    if (!mask[i]) continue
    const o = i * 4
    cropData.data[o] = c[0]; cropData.data[o + 1] = c[1]; cropData.data[o + 2] = c[2]
  }
  return { ok: true, color: c }
}
