/**
 * 사진 속 글자 찾기(OCR) — PaddleOCR PP-OCRv5 mobile 검출 + 인식 (원클릭 1단계)
 *
 * 실측 랩 euchs-lab/ocr-2026-09-25/lib/paddle.js를 그대로 옮겼다 (전·후처리 = RapidOCR 3.9.2 파이썬 파이프라인).
 *   42장 실측: 정답 네모 덮음 87.3%, 브라우저판 = 파이썬 기준판과 같은 줄 (랩 README "P5").
 * OpenCV 없이 순수 JS로 옮기며 달라진 점(기준판과 차이 원인):
 *  - findContours(RETR_LIST) → 8연결 덩어리(외곽만). 구멍(안쪽 윤곽)은 따로 상자를 만들지 않음
 *  - pyclipper 둥근 오프셋 → 최소 사각형을 사방 d만큼 넓힘(둥근 모서리의 최소 외접 사각형과 같음)
 *  - warpPerspective(INTER_CUBIC, 고정소수점) → 실수 bicubic(a=-0.75)
 *  - cv2.resize(INTER_LINEAR, 고정소수점) → 실수 bilinear(같은 좌표 규칙)
 * 설정값(RapidOCR config.yaml 기본값 — 파라미터 임의 변경 없음): Det limit_side_len 736 / limit_type min / mean·std 0.5 / thresh 0.3
 *  / box_thresh 0.5 / unclip_ratio 1.6 / use_dilation true / score_mode fast, Rec 48×320 / batch 6, Global text_score 0.5,
 *  min_side_len 30 / max_side_len 2000, use_vertical_padding(min_height 30, width_height_ratio 8), 방향 분류(cls) 끔(랩과 같음).
 *
 * ★ 랩에 없던 것 하나: 아주 긴 사진(1688 상세 사진은 세로가 가로의 몇 배)은 max_side_len 2000 때문에 통째로 줄이면 글자가 뭉개진다
 *   → tileRanges로 짧은 변 × 2 길이 조각으로 나눠 조각마다 같은 파이프라인을 돌리고, 조각마다 "자기 몫"(겹침 절반씩 나눈 범위)에
 *   가운데가 있는 줄만 남긴다(중복 없음). 짧은 사진(비율 2.2 이하)은 예전 그대로 한 번.
 *
 * DOM·네트워크 없음 — ort(onnxruntime-web)와 세션은 부르는 쪽(ocrWorker.js)이 넘긴다. 순수 부분은 node 테스트(test-studio-autobuild.mjs).
 */

export const CFG = {
  det: { limitSide: 736, limitType: 'min', thresh: 0.3, boxThresh: 0.5, maxCandidates: 1000, unclipRatio: 1.6, dilation: true },
  rec: { h: 48, w: 320, batch: 6 },
  textScore: 0.5, minSide: 30, maxSide: 2000, minHeight: 30, whRatio: 8,
}

const pyRound = x => { const f = Math.floor(x), d = x - f; if (d === 0.5) return f % 2 === 0 ? f : f + 1; return Math.round(x) }

// ── 이미지(BGR uint8, HWC) ─────────────────────────────
export function toBGR(imageData) {
  const { width: w, height: h, data } = imageData, out = new Uint8Array(w * h * 3)
  for (let i = 0, j = 0; i < w * h; i++, j += 4) { out[i * 3] = data[j + 2]; out[i * 3 + 1] = data[j + 1]; out[i * 3 + 2] = data[j] }
  return { w, h, d: out }
}
// cv2.resize INTER_LINEAR 좌표 규칙: sx = (dx+0.5)*scale-0.5, 가장자리 고정
function resize(img, nw, nh) {
  const { w, h, d } = img, out = new Uint8Array(nw * nh * 3), sx = w / nw, sy = h / nh
  const xs0 = new Int32Array(nw), xs1 = new Int32Array(nw), xf = new Float32Array(nw)
  for (let x = 0; x < nw; x++) {
    let f = (x + 0.5) * sx - 0.5, i = Math.floor(f); f -= i
    if (i < 0) { i = 0; f = 0 }
    if (i >= w - 1) { i = w - 1; f = 0 }
    xs0[x] = i; xs1[x] = Math.min(i + 1, w - 1); xf[x] = f
  }
  for (let y = 0; y < nh; y++) {
    let f = (y + 0.5) * sy - 0.5, j = Math.floor(f); f -= j
    if (j < 0) { j = 0; f = 0 }
    if (j >= h - 1) { j = h - 1; f = 0 }
    const j1 = Math.min(j + 1, h - 1), r0 = j * w, r1 = j1 * w
    for (let x = 0; x < nw; x++) {
      const a = xf[x], o = (y * nw + x) * 3
      for (let c = 0; c < 3; c++) {
        const t = d[(r0 + xs0[x]) * 3 + c] * (1 - a) + d[(r0 + xs1[x]) * 3 + c] * a
        const b = d[(r1 + xs0[x]) * 3 + c] * (1 - a) + d[(r1 + xs1[x]) * 3 + c] * a
        out[o + c] = Math.round(t * (1 - f) + b * f)
      }
    }
  }
  return { w: nw, h: nh, d: out }
}

// ── 전체 전처리: resize_image_within_bounds + apply_vertical_padding ──
function reduceTo32(img, ratio) {
  const rh = pyRound(Math.trunc(img.h * ratio) / 32) * 32, rw = pyRound(Math.trunc(img.w * ratio) / 32) * 32
  return { img: resize(img, rw, rh), rH: img.h / rh, rW: img.w / rw }
}
function preprocessImg(img) {
  let rH = 1, rW = 1
  if (Math.max(img.h, img.w) > CFG.maxSide) { const r = reduceTo32(img, CFG.maxSide / Math.max(img.h, img.w)); img = r.img; rH = r.rH; rW = r.rW }
  if (Math.min(img.h, img.w) < CFG.minSide) { const r = reduceTo32(img, CFG.minSide / Math.min(img.h, img.w)); img = r.img; rH = r.rH; rW = r.rW }
  let top = 0
  if (img.h <= CFG.minHeight || img.w / img.h > CFG.whRatio) {
    const newH = Math.max(Math.trunc(img.w / CFG.whRatio), CFG.minHeight) * 2
    top = Math.trunc(Math.abs(newH - img.h) / 2)
    const d = new Uint8Array(img.w * (img.h + 2 * top) * 3); d.set(img.d, top * img.w * 3)
    img = { w: img.w, h: img.h + 2 * top, d }
  }
  return { img, rH, rW, top }
}

// ── 검출 ───────────────────────────────────────────────
function detInput(img) {
  const { h, w } = img, L = CFG.det.limitSide
  let ratio = 1
  if (CFG.det.limitType === 'max') { if (Math.max(h, w) > L) ratio = L / Math.max(h, w) }
  else if (Math.min(h, w) < L) ratio = h < w ? L / h : L / w
  const rh = pyRound(Math.trunc(h * ratio) / 32) * 32, rw = pyRound(Math.trunc(w * ratio) / 32) * 32
  const r = resize(img, rw, rh), N = rw * rh, t = new Float32Array(3 * N)
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) t[c * N + i] = (r.d[i * 3 + c] / 255 - 0.5) / 0.5
  return { t, rw, rh }
}

function convexHull(pts) { // pts: [[x,y],...] 단조 사슬
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = [], up = []
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p) }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p) }
  up.pop(); lo.pop(); return lo.concat(up)
}
// cv2.minAreaRect + boxPoints 대응: 네 꼭짓점과 짧은 변
function minAreaRect(hull) {
  if (hull.length === 1) return { pts: [hull[0], hull[0], hull[0], hull[0]], w: 0, h: 0 }
  let best = null
  for (let i = 0; i < hull.length; i++) {
    const p = hull[i], q = hull[(i + 1) % hull.length]
    let ux = q[0] - p[0], uy = q[1] - p[1]; const n = Math.hypot(ux, uy); if (n === 0) continue
    ux /= n; uy /= n; const vx = -uy, vy = ux
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity
    for (const r of hull) { const a = r[0] * ux + r[1] * uy, b = r[0] * vx + r[1] * vy; if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b }
    const area = (a1 - a0) * (b1 - b0)
    if (!best || area < best.area) best = { area, ux, uy, vx, vy, a0, a1, b0, b1 }
  }
  const { ux, uy, vx, vy, a0, a1, b0, b1 } = best
  const P = (a, b) => [a * ux + b * vx, a * uy + b * vy]
  return { pts: [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)], w: a1 - a0, h: b1 - b0 }
}
function miniBox(pts) { // get_mini_boxes 꼭짓점 순서
  const p = pts.map((x, i) => [x, i]).sort((a, b) => a[0][0] - b[0][0] || a[1] - b[1]).map(x => x[0])
  let i1, i2, i3, i4
  if (p[1][1] > p[0][1]) { i1 = 0; i4 = 1 } else { i1 = 1; i4 = 0 }
  if (p[3][1] > p[2][1]) { i2 = 2; i3 = 3 } else { i2 = 3; i3 = 2 }
  return [p[i1], p[i2], p[i3], p[i4]]
}
function inPoly(x, y, poly) { // 경계 포함(fillPoly와 비슷하게)
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    const cross = (xj - xi) * (y - yi) - (yj - yi) * (x - xi)
    if (Math.abs(cross) < 1e-6 && x >= Math.min(xi, xj) - 1e-6 && x <= Math.max(xi, xj) + 1e-6 && y >= Math.min(yi, yj) - 1e-6 && y <= Math.max(yi, yj) + 1e-6) return true
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function boxScoreFast(pred, W, H, box) {
  const xs = box.map(p => p[0]), ys = box.map(p => p[1])
  const cl = (v, m) => Math.min(Math.max(v, 0), m)
  const xmin = cl(Math.floor(Math.min(...xs)), W - 1), xmax = cl(Math.ceil(Math.max(...xs)), W - 1)
  const ymin = cl(Math.floor(Math.min(...ys)), H - 1), ymax = cl(Math.ceil(Math.max(...ys)), H - 1)
  const poly = box.map(p => [Math.trunc(p[0] - xmin), Math.trunc(p[1] - ymin)])
  let s = 0, n = 0
  for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) if (inPoly(x - xmin, y - ymin, poly)) { s += pred[y * W + x]; n++ }
  return n ? s / n : 0
}
function orderClockwise(pts) {
  const xs = pts.map((p, i) => [p, i]).sort((a, b) => a[0][0] - b[0][0] || a[1] - b[1]).map(x => x[0])
  const L = [xs[0], xs[1]].sort((a, b) => a[1] - b[1]), R = [xs[2], xs[3]].sort((a, b) => a[1] - b[1])
  return [L[0], R[0], R[1], L[1]]
}

function dbPost(pred, W, H, destW, destH) {
  const { thresh, boxThresh, maxCandidates, unclipRatio, dilation } = CFG.det
  const N = W * H, seg = new Uint8Array(N)
  for (let i = 0; i < N; i++) seg[i] = pred[i] > thresh ? 1 : 0
  let bm = seg
  if (dilation) { // 2×2 커널, 기준점 (1,1): dst(x,y) = max(src(x-1..x, y-1..y))
    bm = new Uint8Array(N)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x
      bm[i] = seg[i] | (x > 0 ? seg[i - 1] : 0) | (y > 0 ? seg[i - W] : 0) | (x > 0 && y > 0 ? seg[i - W - 1] : 0)
    }
  }
  // 8연결 덩어리 → 행별 좌우 끝 점만 모아 볼록 껍질
  const lab = new Int32Array(N), stack = new Int32Array(N)
  const comps = []
  for (let s = 0; s < N; s++) {
    if (!bm[s] || lab[s]) continue
    const id = comps.length + 1, rows = new Map()
    let sp = 0; stack[sp++] = s; lab[s] = id
    while (sp) {
      const i = stack[--sp], x = i % W, y = (i - x) / W
      const r = rows.get(y); if (!r) rows.set(y, [x, x]); else { if (x < r[0]) r[0] = x; if (x > r[1]) r[1] = x }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const j = ny * W + nx; if (bm[j] && !lab[j]) { lab[j] = id; stack[sp++] = j }
      }
    }
    const pts = []; for (const [y, [a, b]] of rows) { pts.push([a, y]); if (b !== a) pts.push([b, y]) }
    comps.push(pts)
  }
  const boxes = [], scores = []
  for (const pts of comps.slice(0, maxCandidates)) {
    const r = minAreaRect(convexHull(pts))
    if (Math.min(r.w, r.h) < 3) continue
    const box = miniBox(r.pts)
    const score = boxScoreFast(pred, W, H, box)
    if (boxThresh > score) continue
    // unclip: 거리 d = 넓이×비율/둘레 만큼 사방으로
    const area = r.w * r.h, per = 2 * (r.w + r.h), d = area * unclipRatio / per
    const c = [(r.pts[0][0] + r.pts[2][0]) / 2, (r.pts[0][1] + r.pts[2][1]) / 2]
    const ex = [r.pts[1][0] - r.pts[0][0], r.pts[1][1] - r.pts[0][1]], ey = [r.pts[3][0] - r.pts[0][0], r.pts[3][1] - r.pts[0][1]]
    const nx = Math.hypot(...ex) || 1, ny = Math.hypot(...ey) || 1
    const hx = r.w / 2 + d, hy = r.h / 2 + d, u = [ex[0] / nx, ex[1] / nx], v = [ey[0] / ny, ey[1] / ny]
    const big = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c[0] + a * hx * u[0] + b * hy * v[0], c[1] + a * hx * u[1] + b * hy * v[1]])
    if (Math.min(r.w, r.h) + 2 * d < 3 + 2) continue
    const b2 = miniBox(big).map(([x, y]) => [Math.min(Math.max(pyRound(x / W * destW), 0), destW), Math.min(Math.max(pyRound(y / H * destH), 0), destH)])
    boxes.push(b2); scores.push(score)
  }
  // filter_det_res
  const out = []
  boxes.forEach((b, i) => {
    const o = orderClockwise(b).map(([x, y]) => [Math.trunc(Math.min(Math.max(x, 0), destW - 1)), Math.trunc(Math.min(Math.max(y, 0), destH - 1))])
    const rw = Math.trunc(Math.hypot(o[0][0] - o[1][0], o[0][1] - o[1][1])), rh = Math.trunc(Math.hypot(o[0][0] - o[3][0], o[0][1] - o[3][1]))
    if (rw <= 3 || rh <= 3) return
    out.push({ box: o, score: scores[i] })
  })
  return out
}
function sortedBoxes(items) {
  const ys = items.map((it, i) => [it, i]).sort((a, b) => a[0].box[0][1] - b[0].box[0][1] || a[1] - b[1]).map(x => x[0])
  let line = 0; const withLine = ys.map((it, i) => { if (i > 0 && it.box[0][1] - ys[i - 1].box[0][1] >= 10) line++; return { it, line, i } })
  withLine.sort((a, b) => a.line - b.line || a.it.box[0][0] - b.it.box[0][0] || a.i - b.i)
  return withLine.map(x => x.it)
}

// ── 잘라내기: get_rotate_crop_image (투시 변환 + bicubic, 가장자리 복제) ──
function solveH(src, dst) { // dst 좌표 → src 좌표 변환 H (8원 연립)
  const A = [], b = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = dst[i], [u, v] = src[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v)
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    ;[A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]]
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c] }
  }
  return b.map((v, i) => v / A[i][i]).concat(1)
}
const cub = t => { const a = -0.75, x = Math.abs(t); return x <= 1 ? ((a + 2) * x - (a + 3)) * x * x + 1 : x < 2 ? ((a * x - 5 * a) * x + 8 * a) * x - 4 * a : 0 }
function cropRotate(img, pts) {
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const cw = Math.trunc(Math.max(d(pts[0], pts[1]), d(pts[2], pts[3]))), ch = Math.trunc(Math.max(d(pts[0], pts[3]), d(pts[1], pts[2])))
  const H = solveH(pts, [[0, 0], [cw, 0], [cw, ch], [0, ch]])
  const out = new Uint8Array(cw * ch * 3), { w, h } = img
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const z = H[6] * x + H[7] * y + H[8], sx = (H[0] * x + H[1] * y + H[2]) / z, sy = (H[3] * x + H[4] * y + H[5]) / z
    const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy
    const wx = [cub(1 + fx), cub(fx), cub(1 - fx), cub(2 - fx)], wy = [cub(1 + fy), cub(fy), cub(1 - fy), cub(2 - fy)]
    for (let c = 0; c < 3; c++) {
      let s = 0
      for (let j = 0; j < 4; j++) {
        const yy = Math.min(Math.max(iy - 1 + j, 0), h - 1); let rs = 0
        for (let i = 0; i < 4; i++) { const xx = Math.min(Math.max(ix - 1 + i, 0), w - 1); rs += img.d[(yy * w + xx) * 3 + c] * wx[i] }
        s += rs * wy[j]
      }
      out[(y * cw + x) * 3 + c] = Math.min(255, Math.max(0, Math.round(s)))
    }
  }
  let r = { w: cw, h: ch, d: out }
  if (ch / cw >= 1.5) { // np.rot90 (반시계 90°)
    const o2 = new Uint8Array(out.length), nw = ch, nh = cw
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) for (let c = 0; c < 3; c++) o2[(y * nw + x) * 3 + c] = out[(x * cw + (cw - 1 - y)) * 3 + c]
    r = { w: nw, h: nh, d: o2 }
  }
  return r
}

// ── 인식 ───────────────────────────────────────────────
async function recognize(ort, sess, crops, chars) {
  const { h: IH, w: IW, batch } = CFG.rec
  const ratios = crops.map(c => c.w / c.h), idx = ratios.map((r, i) => i).sort((a, b) => ratios[a] - ratios[b] || a - b)
  const res = new Array(crops.length)
  for (let b0 = 0; b0 < crops.length; b0 += batch) {
    const ids = idx.slice(b0, b0 + batch)
    let maxR = IW / IH; for (const i of ids) maxR = Math.max(maxR, ratios[i])
    const W = Math.trunc(IH * maxR), n = ids.length, t = new Float32Array(n * 3 * IH * W)
    ids.forEach((ci, k) => {
      const c = crops[ci], rw = Math.ceil(IH * ratios[ci]) > W ? W : Math.ceil(IH * ratios[ci])
      const r = resize(c, rw, IH), base = k * 3 * IH * W
      for (let y = 0; y < IH; y++) for (let x = 0; x < rw; x++) for (let ch = 0; ch < 3; ch++) t[base + ch * IH * W + y * W + x] = (r.d[(y * rw + x) * 3 + ch] / 255 - 0.5) / 0.5
    })
    const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', t, [n, 3, IH, W]) })
    const o = out[sess.outputNames[0]], [, T, C] = o.dims, p = o.data
    ids.forEach((ci, k) => {
      let prev = -1, txt = '', confs = []
      for (let s = 0; s < T; s++) {
        let bi = 0, bv = -Infinity; const off = (k * T + s) * C
        for (let c = 0; c < C; c++) if (p[off + c] > bv) { bv = p[off + c]; bi = c }
        if (bi !== 0 && bi !== prev) { txt += chars[bi]; confs.push(bv) }
        prev = bi
      }
      res[ci] = { text: txt, score: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0 }
    })
    o.dispose?.()
  }
  return res
}

// ── 공개 API ───────────────────────────────────────────

/** 사전 글자 목록: 줄 단위(끝 \r 제거), 앞에 blank, 끝에 공백 (CTCLabelDecode.get_character — 랩 loadPaddle과 같음) */
export function parseDict(dictTxt) {
  const lines = String(dictTxt).split('\n').map(l => l.replace(/\r$/, ''))
  if (lines[lines.length - 1] === '') lines.pop()
  return ['blank', ...lines, ' ']
}

/**
 * 사진 한 장(또는 조각) OCR — 랩 runPaddle 그대로.
 * @param P { det, rec, chars } (세션 두 개 + parseDict 결과)
 * @returns {{ lines: { box: [x,y][], text, score, det }[], nBoxes }}  box = 입력 이미지 좌표 네 꼭짓점
 */
export async function runPaddle(ort, P, imageData) {
  const ori = toBGR(imageData)
  const { img, rH, rW, top } = preprocessImg(ori)
  const { t: inp, rw, rh } = detInput(img)
  const dout = await P.det.run({ [P.det.inputNames[0]]: new ort.Tensor('float32', inp, [1, 3, rh, rw]) })
  const pt = dout[P.det.outputNames[0]]
  const items = sortedBoxes(dbPost(pt.data, rw, rh, img.w, img.h))
  pt.dispose?.()
  const crops = items.map(it => cropRotate(img, it.box))
  const rec = crops.length ? await recognize(ort, P.rec, crops, P.chars) : []
  const lines = []
  items.forEach((it, i) => {
    const r = rec[i]
    if (!r.text.trim() || r.score < CFG.textScore) return
    const box = it.box.map(([x, y]) => [Math.min(Math.max((x) * rW, 0), ori.w), Math.min(Math.max((y - top) * rH, 0), ori.h)])
    lines.push({ box, text: r.text, score: +r.score.toFixed(4), det: +it.score.toFixed(4) })
  })
  return { lines, nBoxes: items.length }
}

// ── 긴 사진 조각 (랩에 없던 것 — 위 머리말) ──
export const TILE_RATIO = 2.2   // 긴 변 ÷ 짧은 변이 이보다 크면 조각으로 나눈다
export const TILE_LEN = 2       // 조각 길이 = 짧은 변 × 2
export const TILE_OVERLAP = 0.25 // 조각끼리 겹침 = 짧은 변 × 0.25 (글자 줄 높이보다 넉넉히)

/**
 * 긴 쪽을 따라 자를 조각 범위 — 순수 함수.
 * @returns {{ axis: 'y'|'x'|null, tiles: { start, end, ownStart, ownEnd }[] }}
 *   start~end = 잘라 OCR에 넣을 범위, ownStart~ownEnd = 그 조각이 책임지는 범위(줄 가운데가 여기에 있으면 남김 — 조각끼리 겹치지 않고 전체를 덮는다)
 */
export function tileRanges(W, H) {
  const long = Math.max(W, H), short = Math.min(W, H)
  if (!(short > 0) || long / short <= TILE_RATIO) return { axis: null, tiles: [{ start: 0, end: long, ownStart: 0, ownEnd: long }] }
  const len = Math.round(short * TILE_LEN), ov = Math.round(short * TILE_OVERLAP), step = len - ov
  const tiles = []
  for (let s = 0; ; s += step) {
    const start = Math.min(s, long - len), end = start + len
    tiles.push({ start, end })
    if (end >= long) break
  }
  for (let i = 0; i < tiles.length; i++) {
    tiles[i].ownStart = i === 0 ? 0 : Math.round((tiles[i - 1].end + tiles[i].start) / 2)
    tiles[i].ownEnd = i === tiles.length - 1 ? long : Math.round((tiles[i].end + tiles[i + 1].start) / 2)
  }
  return { axis: H >= W ? 'y' : 'x', tiles }
}

/**
 * 조각 하나의 줄들 → 전체 좌표로 옮기고, 가운데가 자기 몫 밖인 줄은 뺀다 — 순수 함수
 * @param lines 조각 좌표의 줄 (runPaddle 결과)  @param axis 'y'|'x'|null  @param tile tileRanges 한 칸
 */
export function placeTileLines(lines, axis, tile) {
  if (!axis) return lines
  const out = []
  for (const l of lines) {
    const box = l.box.map(([x, y]) => (axis === 'y' ? [x, y + tile.start] : [x + tile.start, y]))
    const cs = box.map(p => (axis === 'y' ? p[1] : p[0]))
    const mid = (Math.min(...cs) + Math.max(...cs)) / 2
    if (mid < tile.ownStart || mid >= tile.ownEnd) continue
    out.push({ ...l, box })
  }
  return out
}
