/**
 * 배경 지우기 (17-1) — edit.bg 읽기·쓰기 + 마스크 합성 (순수 함수 + 캔버스 한 개, node 테스트: scripts/test-studio-bg.mjs)
 *
 * ★ 저장 위치: studio_images.edit.bg (지우기 layers·필터 look·자르기 crop/cuts와 나란히 — layers에 넣지 않는다)
 *     edit.bg = {
 *       mask: { path, key, model, w, h },   서버(api/studio-upload.js bg_remove)가 만든 8비트 회색 PNG. 원본 크기, 흰 = 제품
 *       mode: 'transparent' | 'none',       transparent = 배경을 투명하게(구간 배경색이 보임) / none = 원래 배경(마스크는 두고 안 씀)
 *     }
 *   없음(bg 칸 없음) = 배경을 지운 적 없음 또는 [배경 원래대로]. 마스크 파일은 원본 사진에서 한 번 만든다(돈은 그때만) —
 *   투명·원래 배경 전환·미리보기·내보내기·복사본은 저장된 마스크만 쓴다.
 * ★ 적용 순서 (화면 작은 사진·내보내기·미리보기 공통 — studioViewImage.applyBackground 하나):
 *   원본 → 지우기·덮기(완성 JPG 또는 원본 + 조각) → 마스크(알파만 곱함) → 띠 → 자르기 → 필터 → 꾸미기
 * ★ 제품 픽셀 불변: 색(R·G·B)은 절대 바꾸지 않고 알파만 곱한다 (applyMaskToRgba). 마스크 255인 곳은 원본 그대로.
 * ★ 완성 JPG(final)에는 넣지 않는다. layers가 그대로면 erase_v도 그대로(studioFinal.stampEraseVersion은 layers만 본다).
 */

export const BG_MODES = ['transparent', 'none']
const MASK_PATH_RE = /^[^/]+\/[^/]+\/bg\/[^/]+\/mask_[0-9a-f]{16}\.png$/

/** edit → bg (모양이 틀리면 null — 그리지 않고, 저장값은 그대로 둔다) */
export function readBg(edit) {
  const b = edit && typeof edit === 'object' ? edit.bg : null
  if (!b || typeof b !== 'object') return null
  const m = b.mask
  if (!m || typeof m.path !== 'string' || !MASK_PATH_RE.test(m.path) || !Number.isInteger(m.w) || !Number.isInteger(m.h) || m.w < 1 || m.h < 1) {
    console.error('[studioBg] edit.bg 모양이 이상함 — 배경 지우기를 쓰지 않음:', b)
    return null
  }
  return {
    mask: { path: m.path, key: String(m.key || ''), model: String(m.model || ''), w: m.w, h: m.h },
    mode: BG_MODES.includes(b.mode) ? b.mode : 'transparent',
  }
}

/** edit에 bg를 넣은 새 edit — 다른 칸은 그대로. null이면 bg 칸을 뺀다 */
export function withBg(edit, bg) {
  const base = edit && typeof edit === 'object' && !Array.isArray(edit) ? edit : {}
  const { bg: _old, ...rest } = base
  if (!bg) return rest
  return { ...rest, bg: { mask: { ...bg.mask }, mode: bg.mode } }
}

/** 서버 bg_remove 응답 → 저장할 bg (투명으로 시작) */
export function bgFromServer(r) {
  return { mask: { path: r.path, key: r.key, model: r.model, w: r.width, h: r.height }, mode: 'transparent' }
}

/** 지금 합성에 마스크를 쓰는지 */
export function bgActive(bg) {
  return !!bg?.mask && bg.mode === 'transparent'
}

/** 화면 작은 사진 key 조각 (바뀌면 다시 만든다) */
export function bgViewKey(bg) {
  return bgActive(bg) ? `|bg:${bg.mask.path}` : ''
}

/** 목록·사진 정보 카드 표시 */
export function bgMark(bg) {
  return bgActive(bg) ? '배경 지움' : ''
}

/**
 * 알파만 곱한다 — rgba(사진, RGBA)의 A = A × 마스크 / 255. R·G·B는 손대지 않는다.
 * @param {Uint8ClampedArray|Uint8Array} rgba 사진 픽셀 (고친다)
 * @param {Uint8ClampedArray|Uint8Array} mask 마스크 픽셀 — 한 픽셀에 stride 바이트, 첫 바이트(R 또는 회색) 사용
 */
export function applyMaskToRgba(rgba, mask, stride = 4) {
  const n = rgba.length >> 2
  if (mask.length < n * stride) throw new Error('마스크 크기가 사진과 달라요')
  for (let i = 0; i < n; i++) {
    const m = mask[i * stride]
    if (m === 255) continue
    const a = i * 4 + 3
    rgba[a] = m === 0 ? 0 : Math.round((rgba[a] * m) / 255)
  }
}

/**
 * 원본 크기 사진(source) + 마스크 이미지 → 배경이 투명한 새 캔버스 (W×H). 마스크 크기가 다르면 사진 크기로 늘려 쓴다.
 * @param {(w:number,h:number)=>HTMLCanvasElement} createCanvas
 */
export function maskedCanvas(source, W, H, maskImg, createCanvas) {
  const c = createCanvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0, W, H)
  const px = ctx.getImageData(0, 0, W, H)
  const mc = createCanvas(W, H)
  const mctx = mc.getContext('2d', { willReadFrequently: true })
  mctx.imageSmoothingEnabled = true
  mctx.drawImage(maskImg, 0, 0, W, H)
  const md = mctx.getImageData(0, 0, W, H)
  applyMaskToRgba(px.data, md.data, 4)
  ctx.putImageData(px, 0, 0)
  mc.width = 0
  mc.height = 0
  return c
}
