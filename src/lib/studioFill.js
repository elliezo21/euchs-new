/**
 * 스튜디오 가리기(채우기) 알고리즘 — 순수 함수, AI·외부 호출 없음. 같은 입력이면 결과가 항상 같다.
 * ImageData(RGBA)의 지정 사각형 안을 주변 픽셀로 메운다. 사각형 바깥 픽셀은 절대 바꾸지 않는다.
 *
 *   A. solid    — 바깥 테두리 ring px의 채널별 중앙값 단색
 *   B. bilinear — 네 변 색을 Coons 패치(양선형 혼합 경계 보간)로 채움
 *   C. mirror   — 위·아래(또는 좌·우) 띠를 거울처럼 접어 복사, 가운데는 교차 페이드
 *
 * 공통 옵션: ring(테두리 샘플 두께 1~2), feather(안쪽 가장자리를 원본과 섞는 폭 0~3px)
 * Phase 1-5 검증 랩(StudioLabView)에서 먼저 쓰고, Phase 1-6 편집기에서 재사용한다.
 */

export const FILL_METHODS = ['solid', 'bilinear', 'mirror']

/** 사각형을 정수로 맞추고 이미지 안으로 자른다. 넓이가 0이면 null */
export function clampRect(r, W, H) {
  const x0 = Math.max(0, Math.floor(Math.min(r.x, r.x + r.w)))
  const y0 = Math.max(0, Math.floor(Math.min(r.y, r.y + r.h)))
  const x1 = Math.min(W, Math.ceil(Math.max(r.x, r.x + r.w)))
  const y1 = Math.min(H, Math.ceil(Math.max(r.y, r.y + r.h)))
  if (x1 - x0 < 1 || y1 - y0 < 1) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

// ── 공통 ────────────────────────────────────────────────────────────────────
/** 사각형 바깥 ring 두께 띠의 네 변 평균색 배열. 이미지 밖이면 그 변은 null */
function sampleEdges(img, r, ring) {
  const { data, width: W, height: H } = img
  const avgRow = (rows, len, pick) => {
    if (rows.length === 0) return null
    const out = new Float32Array(len * 3)
    for (let i = 0; i < len; i++) {
      let R = 0, G = 0, B = 0
      for (const row of rows) {
        const o = pick(row, i)
        R += data[o]; G += data[o + 1]; B += data[o + 2]
      }
      out[i * 3] = R / rows.length; out[i * 3 + 1] = G / rows.length; out[i * 3 + 2] = B / rows.length
    }
    return out
  }
  const range = (from, dir) => {
    const out = []
    for (let k = 1; k <= ring; k++) out.push(from + dir * k)
    return out
  }
  const topRows = range(r.y, -1).filter(y => y >= 0)
  const botRows = range(r.y + r.h - 1, 1).filter(y => y < H)
  const leftCols = range(r.x, -1).filter(x => x >= 0)
  const rightCols = range(r.x + r.w - 1, 1).filter(x => x < W)
  return {
    top: avgRow(topRows, r.w, (y, i) => (y * W + r.x + i) * 4),
    bottom: avgRow(botRows, r.w, (y, i) => (y * W + r.x + i) * 4),
    left: avgRow(leftCols, r.h, (x, i) => ((r.y + i) * W + x) * 4),
    right: avgRow(rightCols, r.h, (x, i) => ((r.y + i) * W + x) * 4),
  }
}

/** 변 색 배열의 잡음(JPEG 노이즈, 경계에 걸친 글자 조각)을 1차원 박스 블러로 누른다 */
function smoothEdge(edge, radius) {
  if (!edge || radius < 1) return edge
  const n = edge.length / 3
  const out = new Float32Array(edge.length)
  for (let i = 0; i < n; i++) {
    let R = 0, G = 0, B = 0, c = 0
    for (let k = Math.max(0, i - radius); k <= Math.min(n - 1, i + radius); k++) {
      R += edge[k * 3]; G += edge[k * 3 + 1]; B += edge[k * 3 + 2]; c++
    }
    out[i * 3] = R / c; out[i * 3 + 1] = G / c; out[i * 3 + 2] = B / c
  }
  return out
}

/**
 * 계산한 채움(fill: w*h*3 Float32)을 이미지에 쓴다.
 * feather > 0이면 안쪽 가장자리 feather px 구간에서 원본과 선형으로 섞는다 (가장자리 픽셀일수록 원본 비중이 크다).
 */
function composite(img, r, fill, feather) {
  const { data, width: W } = img
  for (let j = 0; j < r.h; j++) {
    for (let i = 0; i < r.w; i++) {
      const d = Math.min(i, j, r.w - 1 - i, r.h - 1 - j)
      const a = feather > 0 ? Math.min(1, (d + 1) / (feather + 1)) : 1
      const o = ((r.y + j) * W + r.x + i) * 4
      const f = (j * r.w + i) * 3
      data[o] = data[o] * (1 - a) + fill[f] * a
      data[o + 1] = data[o + 1] * (1 - a) + fill[f + 1] * a
      data[o + 2] = data[o + 2] * (1 - a) + fill[f + 2] * a
      // 알파는 건드리지 않는다
    }
  }
}

// ── A. 단색(중앙값) ─────────────────────────────────────────────────────────
function fillSolid(img, r, { ring, feather }) {
  const { data, width: W, height: H } = img
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
  let n = 0
  for (let y = r.y - ring; y < r.y + r.h + ring; y++) {
    if (y < 0 || y >= H) continue
    for (let x = r.x - ring; x < r.x + r.w + ring; x++) {
      if (x < 0 || x >= W) continue
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) continue // 사각형 안은 제외
      const o = (y * W + x) * 4
      hist[0][data[o]]++; hist[1][data[o + 1]]++; hist[2][data[o + 2]]++
      n++
    }
  }
  if (n === 0) return { ok: false, reason: 'no_border' }
  const median = h => {
    let acc = 0
    for (let v = 0; v < 256; v++) { acc += h[v]; if (acc * 2 >= n) return v }
    return 255
  }
  const c = [median(hist[0]), median(hist[1]), median(hist[2])]
  const fill = new Float32Array(r.w * r.h * 3)
  for (let k = 0; k < r.w * r.h; k++) { fill[k * 3] = c[0]; fill[k * 3 + 1] = c[1]; fill[k * 3 + 2] = c[2] }
  composite(img, r, fill, feather)
  return { ok: true, color: c }
}

// ── B. 가장자리 보간(Coons 패치) ────────────────────────────────────────────
function fillBilinear(img, r, { ring, feather }) {
  const e = sampleEdges(img, r, ring)
  const T0 = smoothEdge(e.top, 2), B0 = smoothEdge(e.bottom, 2)
  const L0 = smoothEdge(e.left, 2), R0 = smoothEdge(e.right, 2)
  const hasV = !!(T0 || B0), hasH = !!(L0 || R0)
  if (!hasV && !hasH) return { ok: false, reason: 'no_border' }
  // 이미지 끝에 붙어 한 변이 없으면 맞은편 변으로 대신한다
  const T = T0 || B0, B = B0 || T0, L = L0 || R0, R = R0 || L0
  const fill = new Float32Array(r.w * r.h * 3)
  // 모서리 값: 만나는 두 변 끝값의 평균 (두 변을 따로 샘플링하므로 정확히 같지 않다)
  const corners = [0, 1, 2].map(c => hasV && hasH ? {
    c00: (T[c] + L[c]) / 2,
    c10: (T[(r.w - 1) * 3 + c] + R[c]) / 2,
    c01: (B[c] + L[(r.h - 1) * 3 + c]) / 2,
    c11: (B[(r.w - 1) * 3 + c] + R[(r.h - 1) * 3 + c]) / 2,
  } : null)
  for (let j = 0; j < r.h; j++) {
    const v = (j + 1) / (r.h + 1)
    for (let i = 0; i < r.w; i++) {
      const u = (i + 1) / (r.w + 1)
      const f = (j * r.w + i) * 3
      for (let c = 0; c < 3; c++) {
        let val
        if (hasV && hasH) {
          const { c00, c10, c01, c11 } = corners[c]
          val = (1 - v) * T[i * 3 + c] + v * B[i * 3 + c] + (1 - u) * L[j * 3 + c] + u * R[j * 3 + c]
            - ((1 - u) * (1 - v) * c00 + u * (1 - v) * c10 + (1 - u) * v * c01 + u * v * c11)
        } else if (hasV) {
          val = (1 - v) * T[i * 3 + c] + v * B[i * 3 + c]
        } else {
          val = (1 - u) * L[j * 3 + c] + u * R[j * 3 + c]
        }
        fill[f + c] = Math.max(0, Math.min(255, val))
      }
    }
  }
  composite(img, r, fill, feather)
  return { ok: true }
}

// ── C. 주변 복제(거울 접기) ─────────────────────────────────────────────────
/** 길이 len인 띠 안에서 k번째 반사 위치 (띠보다 멀면 왕복 반사) */
function pingPong(k, len) {
  const period = 2 * len
  const m = k % period
  return m < len ? m : period - 1 - m
}

const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

function fillMirror(img, r, { feather, axis = 'auto' }) {
  const { data, width: W, height: H } = img
  const ax = axis === 'auto' ? (r.w >= r.h ? 'v' : 'h') : axis
  // 'v': 위 띠(0..y-1)와 아래 띠(y+h..H-1)를 접어 온다. 'h': 왼쪽·오른쪽
  const len = ax === 'v' ? r.h : r.w
  const nearLen = ax === 'v' ? r.y : r.x                       // 위(왼) 띠 길이
  const farLen = ax === 'v' ? H - (r.y + r.h) : W - (r.x + r.w) // 아래(오른) 띠 길이
  if (nearLen === 0 && farLen === 0) return { ok: false, reason: 'no_border' }

  const fill = new Float32Array(r.w * r.h * 3)
  const fade = 0.3 // 가운데 교차 페이드 폭(사각형 길이 대비)
  for (let k = 0; k < len; k++) {
    // 가까운 쪽 경계에서 k만큼 떨어진 곳을 반사
    const nearSrc = nearLen > 0 ? (ax === 'v' ? r.y : r.x) - 1 - pingPong(k, nearLen) : -1
    const farSrc = farLen > 0 ? (ax === 'v' ? r.y + r.h : r.x + r.w) + pingPong(len - 1 - k, farLen) : -1
    let wFar
    if (nearLen === 0) wFar = 1
    else if (farLen === 0) wFar = 0
    else wFar = smoothstep(((k + 0.5) / len - (0.5 - fade / 2)) / fade)
    const wNear = 1 - wFar
    const cross = ax === 'v' ? r.w : r.h
    for (let t = 0; t < cross; t++) {
      const i = ax === 'v' ? t : k
      const j = ax === 'v' ? k : t
      const f = (j * r.w + i) * 3
      const oN = nearSrc >= 0 ? (ax === 'v' ? (nearSrc * W + r.x + t) : ((r.y + t) * W + nearSrc)) * 4 : -1
      const oF = farSrc >= 0 ? (ax === 'v' ? (farSrc * W + r.x + t) : ((r.y + t) * W + farSrc)) * 4 : -1
      for (let c = 0; c < 3; c++) {
        fill[f + c] = (oN >= 0 ? data[oN + c] * wNear : 0) + (oF >= 0 ? data[oF + c] * wFar : 0)
      }
    }
  }
  composite(img, r, fill, feather)
  return { ok: true, axis: ax }
}

/**
 * 사각형 하나를 채운다 (img를 직접 고친다).
 * @param {ImageData} img
 * @param {{x,y,w,h}} rect  이미지 좌표
 * @param {'solid'|'bilinear'|'mirror'} method
 * @param {{ ring?:number, feather?:number, axis?:'auto'|'v'|'h' }} opts
 * @returns {{ ok:boolean, reason?:string }}
 */
export function applyFill(img, rect, method, opts = {}) {
  const r = clampRect(rect, img.width, img.height)
  if (!r) return { ok: false, reason: 'empty_rect' }
  const o = { ring: opts.ring ?? 2, feather: opts.feather ?? 0, axis: opts.axis ?? 'auto' }
  if (method === 'solid') return fillSolid(img, r, o)
  if (method === 'bilinear') return fillBilinear(img, r, o)
  if (method === 'mirror') return fillMirror(img, r, o)
  return { ok: false, reason: 'unknown_method' }
}
