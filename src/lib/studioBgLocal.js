/**
 * 흰 배경·단색 배경 지우기 (브라우저 안에서 — 외부 AI·돈 없음). node 테스트: scripts/test-studio-bg-local.mjs
 *
 * ★ 흐름: 사진 테두리 픽셀로 배경색을 정함(borderColor) → 테두리의 대부분이 그 색이면 "단색 배경"
 *   → 테두리에서부터 그 색과 비슷한 곳만 이어서 채움(flood fill, 허용 오차) → 가장자리 1~2px 부드럽게 → 회색 마스크(흰 = 제품).
 * ★ 결과는 [AI로 정밀하게 지우기](서버 bg_remove)와 똑같은 모양으로 저장한다: 원본 크기 8비트 회색 PNG
 *   {uid}/{projectId}/bg/{imageId}/mask_{key16}.png, edit.bg.mask = { path, key, model: 'local', w, h }.
 *   그래서 투명·단색·라이브러리·AI 배경·경계 다듬기·미리보기·다운로드·복사본이 모두 그대로 쓴다 (studioBg.applyMaskToRgba — 알파만 곱함).
 * ★ 단색이 아니라고 판정되면 아무것도 저장하지 않는다 — 화면이 [AI로 정밀하게 지우기]를 따로 보여 주고, 누를 때만 돈이 드는 요청.
 * ★ 제품 안쪽에 갇힌 배경(손잡이 구멍 등)은 테두리와 이어지지 않아 지우지 않는다 — 필요하면 [경계 다듬기]로.
 */

export const LOCAL_BG_MODEL = 'local'
export const BORDER_TOL = 24       // 테두리 픽셀이 배경색과 "같다"고 볼 차이 (R·G·B 중 가장 큰 차이)
export const BORDER_SHARE = 0.9    // 테두리의 이만큼 이상이 배경색이면 단색 배경
export const FILL_TOL = 30         // 채우기 허용 오차 (R·G·B 중 가장 큰 차이) — JPG 잡티는 지우고 옅은 그림자·흰 제품은 남기는 정도
export const FEATHER_PX = 1        // 가장자리 부드럽게 (상자 흐림 반지름 1px을 두 번 → 1~2px)
export const MIN_BG_SHARE = 0.02   // 지운 곳이 이보다 적으면 배경이 없다고 봄
export const MAX_BG_SHARE = 0.98   // 지운 곳이 이보다 많으면 제품을 못 찾았다고 봄
const CLEAR_ALPHA = 16             // 이미 투명한 픽셀(PNG)은 배경으로 친다

/** 두 색의 차이 = R·G·B 중 가장 큰 차이 */
function diff(d, i, c) {
  const a = Math.abs(d[i] - c[0]), b = Math.abs(d[i + 1] - c[1]), e = Math.abs(d[i + 2] - c[2])
  return a > b ? (a > e ? a : e) : (b > e ? b : e)
}

/** 테두리 픽셀 번호 (바깥 한 줄 — 겹치는 모서리는 한 번씩) */
function borderIndexes(W, H) {
  const out = []
  for (let x = 0; x < W; x++) { out.push(x); if (H > 1) out.push((H - 1) * W + x) }
  for (let y = 1; y < H - 1; y++) { out.push(y * W); if (W > 1) out.push(y * W + W - 1) }
  return out
}

/**
 * 테두리 배경색 판정 — 테두리 픽셀(투명 제외)의 채널별 가운데값을 배경색으로, 그 색과 BORDER_TOL 안인 비율(share).
 * @param {Uint8ClampedArray|Uint8Array} rgba 사진 픽셀 (W×H×4)
 * @returns {{ solid: boolean, color: number[]|null, share: number, clear: boolean }}
 *   clear = 테두리 대부분이 이미 투명 (투명 PNG — 배경색 대신 투명을 지움)
 */
export function analyzeBorder(rgba, W, H, { tol = BORDER_TOL, share: need = BORDER_SHARE } = {}) {
  const idx = borderIndexes(W, H)
  if (!idx.length) return { solid: false, color: null, share: 0, clear: false }
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
  let opaque = 0
  for (const p of idx) {
    const i = p * 4
    if (rgba[i + 3] < CLEAR_ALPHA) continue
    opaque++
    hist[0][rgba[i]]++; hist[1][rgba[i + 1]]++; hist[2][rgba[i + 2]]++
  }
  const clearShare = 1 - opaque / idx.length
  if (clearShare >= need) return { solid: true, color: null, share: clearShare, clear: true }
  if (!opaque) return { solid: false, color: null, share: 0, clear: false }
  const median = h => { let n = 0; for (let v = 0; v < 256; v++) { n += h[v]; if (n * 2 >= opaque) return v } return 255 }
  const color = [median(hist[0]), median(hist[1]), median(hist[2])]
  let same = 0
  for (const p of idx) {
    const i = p * 4
    if (rgba[i + 3] < CLEAR_ALPHA || diff(rgba, i, color) <= tol) same++ // 투명한 테두리도 배경으로 친다
  }
  const share = same / idx.length
  return { solid: share >= need, color, share, clear: false }
}

/**
 * 테두리에서부터 배경(ok = 1인 픽셀)을 이어서 채운다 — 한 줄씩 넓히는 방식이라 큰 사진에서도 쌓는 칸이 적다.
 * @param {Uint8Array} ok 픽셀마다 1 = 배경색과 비슷함
 * @returns {Uint8Array} 1 = 지울 배경 (테두리와 이어진 곳만)
 */
export function floodFromBorder(ok, W, H) {
  const bg = new Uint8Array(W * H)
  let stack = new Int32Array(1024)
  let top = 0
  const push = p => {
    if (top === stack.length) { const s = new Int32Array(stack.length * 2); s.set(stack); stack = s }
    stack[top++] = p
  }
  for (const p of borderIndexes(W, H)) if (ok[p]) push(p)
  while (top > 0) {
    const p = stack[--top]
    if (bg[p] || !ok[p]) continue
    const y = (p / W) | 0, row = y * W
    let l = p - row, r = l
    while (l > 0 && ok[row + l - 1] && !bg[row + l - 1]) l--
    while (r < W - 1 && ok[row + r + 1] && !bg[row + r + 1]) r++
    for (let x = l; x <= r; x++) bg[row + x] = 1
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= H) continue
      const nrow = ny * W
      let inSpan = false
      for (let x = l; x <= r; x++) {
        const q = nrow + x
        if (ok[q] && !bg[q]) { if (!inSpan) { push(q); inSpan = true } } else inSpan = false
      }
    }
  }
  return bg
}

/** 상자 흐림 한 번 (가로 → 세로, 반지름 r) — 마스크 가장자리만 부드러워진다 (안쪽 255·바깥 0은 그대로) */
export function boxBlur(mask, W, H, r = 1) {
  const tmp = new Uint8Array(mask.length)
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < H; y++) {
    const row = y * W
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += mask[row + xx]; n++ } }
      tmp[row + x] = Math.round(s / n)
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) { s += tmp[yy * W + x]; n++ } }
      out[y * W + x] = Math.round(s / n)
    }
  }
  return out
}

/** 마스크에서 투명(0)인 비율 */
export function transparentRatio(mask) {
  if (!mask.length) return 0
  let z = 0
  for (let i = 0; i < mask.length; i++) if (mask[i] === 0) z++
  return z / mask.length
}

/**
 * 단색 배경 마스크 만들기 (순수 함수)
 * @returns {{ ok: true, mask: Uint8Array, color: number[]|null, bgShare: number }
 *         | { ok: false, reason: 'not_solid'|'no_background'|'no_product', share: number }}
 *   mask: 픽셀마다 0~255 (255 = 제품 그대로, 0 = 지움) — studioBg.applyMaskToRgba와 같은 뜻
 */
export function localBackgroundMask(rgba, W, H, { tol = FILL_TOL, feather = FEATHER_PX } = {}) {
  const n = W * H
  if (!Number.isInteger(W) || !Number.isInteger(H) || W < 3 || H < 3 || rgba.length < n * 4) {
    return { ok: false, reason: 'not_solid', share: 0 }
  }
  const border = analyzeBorder(rgba, W, H)
  if (!border.solid) return { ok: false, reason: 'not_solid', share: border.share }
  const ok = new Uint8Array(n)
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    ok[p] = rgba[i + 3] < CLEAR_ALPHA || (border.color && diff(rgba, i, border.color) <= tol) ? 1 : 0
  }
  const bg = floodFromBorder(ok, W, H)
  let cnt = 0
  for (let p = 0; p < n; p++) cnt += bg[p]
  const bgShare = cnt / n
  if (bgShare < MIN_BG_SHARE) return { ok: false, reason: 'no_background', share: border.share }
  if (bgShare > MAX_BG_SHARE) return { ok: false, reason: 'no_product', share: border.share }
  let mask = new Uint8Array(n)
  for (let p = 0; p < n; p++) mask[p] = bg[p] ? 0 : 255
  for (let k = 0; k < 2 && feather > 0; k++) mask = boxBlur(mask, W, H, feather)
  return { ok: true, mask, color: border.color, bgShare }
}

// ── 브라우저 부분 (node 테스트에서는 부르지 않는다) ──

/**
 * 사진(원본 크기 — 지우기·덮기가 적용된 사진) → 단색 배경 마스크 PNG
 * @param {CanvasImageSource} source
 * @returns {Promise<{ ok: true, blob: Blob, mask: Uint8Array, width, height } | { ok: false, reason }>}
 */
export async function buildLocalMaskPng(source, W, H) {
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  try {
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(source, 0, 0, W, H)
    const px = ctx.getImageData(0, 0, W, H)
    const r = localBackgroundMask(px.data, W, H)
    if (!r.ok) return { ok: false, reason: r.reason }
    const out = ctx.createImageData(W, H)
    for (let i = 0, j = 0; i < r.mask.length; i++, j += 4) {
      const v = r.mask[i]
      out.data[j] = v; out.data[j + 1] = v; out.data[j + 2] = v; out.data[j + 3] = 255
    }
    ctx.putImageData(out, 0, 0)
    const blob = await new Promise(resolve => c.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('배경 지운 결과를 PNG로 만들지 못했어요')
    return { ok: true, blob, mask: r.mask, width: W, height: H }
  } finally {
    c.width = 0; c.height = 0
  }
}
