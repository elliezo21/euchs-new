/**
 * 내보내기 그리기 엔진 (13-1단계) — 페이지 문서를 캔버스로 그린다 (브라우저 안에서만, 서버 없음).
 * node 테스트: scripts/test-studio-export.mjs (가짜 캔버스로 그리기 순서·크기·한계·파일 이름·필터 픽셀 계산)
 *
 * ★ 화면(StudioPageView)과 같은 결과가 목표 — 그리기 규칙은 요소 종류마다 한 곳에서 가져온다:
 *   글자 = studioText.textPaintSpec + wrapLines(textLinesOf) · 도형·선 = studioShape.shapePaintSpec·linePaintSpec(같은 SVG path → Path2D) ·
 *   표 = studioTable.tablePaintSpec · 사진 꾸미기 = studioPage.itemStyleOf · 필터·조정 = studioLook.lookValues·svgFilterParams
 * ★ 이 파일은 DOM을 직접 만들지 않는다 — 캔버스·Path2D·사진·글꼴은 deps로 받는다 (편집기 = 브라우저 것, 테스트 = 가짜):
 *   deps = {
 *     createCanvas(w, h) → 캔버스 (getContext('2d'), toBlob)
 *     Path2D            → SVG path 문자열을 받는 Path2D 생성자
 *     getImage(imageId) → Promise<{ source, width, height, notes?: string[], bgColor?: string|null }>  사진 (완성 JPG 또는 원본 + 지우기 조각, 원본 크기)
 *                         bgColor = 단색 배경(17-2) — 사진 자리를 이 색으로 먼저 채운 뒤 사진(필터 적용)을 그린다 → 필터는 사진에만, 색은 그대로
 *                         bgSource = AI 배경(17-4) — 사진과 같은 크기의 아래 그림. 사진과 같은 자리·뒤집기로 먼저 그린 뒤 사진(필터 적용)
 *     lookOf(imageId)   → look (필터·조정 — 화면과 같은 값)
 *     measure(str, font)→ 글자 폭 (글자 요소 줄바꿈·표 칸 자르기와 같은 측정 — studioFonts.createTextMeasure)
 *     prepareFonts(list)→ Promise<boolean>  [{ style, text }] 글꼴 조각 받기 (studioFonts.loadFontsFor)
 *   }
 * ★ 좌표: 캔버스 = 페이지 px × scale. 구간 하나 = 폭 page.width × scale, 높이 구간 height × scale. 구간 밖으로 나간 부분은 잘린다(구간 캔버스 밖).
 *   요소는 items 배열 순서(뒤가 앞), 숨긴 요소는 그리지 않는다. 회전 = 요소 네모 가운데 기준, 투명도 = 요소 전체를 한 장으로 그린 뒤 한 번에(화면 opacity와 같음).
 * ★ 한 장으로 길게: 고른 구간을 위에서부터 이어 붙이고 구간 사이는 page.gap × scale만큼 흰색 (화면의 간격은 편집기 바탕이 비쳐 보이는 빈틈 — 이미지에서는 흰색).
 */
import { isValidImageItem, isDrawableItem, itemStyleOf, textLinesOf } from './studioPage.js'
import { isValidTextItem, textPaintSpec, textStyleOf, lineWidth } from './studioText.js'
import { isValidShapeItem, isValidLineItem, shapePaintSpec, linePaintSpec } from './studioShape.js'
import { isValidTableItem, tablePaintSpec, tableFontOf } from './studioTable.js'
import { lookValues, isDefaultLook } from './studioLook.js'
import { fontSpec } from './studioFonts.js'

// ── 형식·크기·한계 ──
export const EXPORT_FORMATS = {
  jpg: { mime: 'image/jpeg', ext: 'jpg', quality: 0.92, label: 'JPG' },
  png: { mime: 'image/png', ext: 'png', quality: undefined, label: 'PNG' },
}
export const EXPORT_SCALES = [1, 2]
export const EXPORT_MODES = ['sections', 'long'] // 구간별 여러 장(기본, 결정 5) / 한 장으로 길게
export const GAP_COLOR = '#ffffff'
/**
 * 캔버스 한계 (데스크톱 크롬 기준 — 편집은 PC에서만): 한 변 32,767px, 넓이 268,435,456px(16,384²).
 * 파이어폭스·사파리(데스크톱)는 이보다 넓거나 같다. JPG 형식 자체의 한계(한 변 65,535px)보다 좁다
 */
export const CANVAS_LIMITS = { maxSide: 32767, maxArea: 268435456 }

/** 이 크기의 캔버스를 만들 수 있는지 */
export function canvasFits(w, h, limits = CANVAS_LIMITS) {
  return Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= limits.maxSide && h <= limits.maxSide && w * h <= limits.maxArea
}

/** 구간 하나의 캔버스 크기 */
export function sectionPixelSize(page, section, scale) {
  return { width: Math.round(page.width * scale), height: Math.round(section.height * scale) }
}

/** 한 장으로 길게 — 고른 구간(페이지 순서)의 높이 합 + 사이 간격 (페이지 px). 구간 위치 tops도 */
export function stackLayout(page, sections) {
  let y = 0
  const tops = sections.map((s, i) => {
    if (i > 0) y += page.gap
    const t = y
    y += s.height
    return t
  })
  return { tops, height: y }
}

/**
 * 내보낼 파일 목록 — 구간 번호는 페이지 안의 자리(01부터, 빼 둔 구간이 있어도 그대로)
 * @param {{ mode: 'sections'|'long', scale: number, sectionIds: string[] }} opts
 * @returns {{ files: { no: number|null, sectionIds: string[], width: number, height: number, fits: boolean }[], tooLarge: object[] }}
 */
export function exportPlan(page, { mode, scale, sectionIds }) {
  const want = new Set(sectionIds)
  const chosen = page.sections.map((s, i) => ({ s, no: i + 1 })).filter(x => want.has(x.s.id))
  const W = Math.round(page.width * scale)
  let files
  if (mode === 'long') {
    if (chosen.length === 0) files = []
    else {
      const { height } = stackLayout(page, chosen.map(x => x.s))
      const H = Math.round(height * scale)
      files = [{ no: null, sectionIds: chosen.map(x => x.s.id), width: W, height: H, fits: canvasFits(W, H) }]
    }
  } else {
    files = chosen.map(({ s, no }) => {
      const { width, height } = sectionPixelSize(page, s, scale)
      return { no, sectionIds: [s.id], width, height, fits: canvasFits(width, height) }
    })
  }
  return { files, tooLarge: files.filter(f => !f.fits) }
}

// ── 파일 이름 ──
const BAD_FILE_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g
export const FILE_BASE_MAX = 60
/** 작업 이름 → 파일 이름에 쓸 수 있는 이름 (못 쓰는 글자는 _ , 앞뒤 공백·점 뺌, 60자, 비면 "상세페이지") */
export function fileBaseName(title) {
  const s = String(title ?? '').replace(BAD_FILE_CHARS, '_').replace(/\s+/g, ' ').trim().replace(/^[.\s]+|[.\s]+$/g, '')
  const cut = [...s].slice(0, FILE_BASE_MAX).join('').trim()
  return cut === '' ? '상세페이지' : cut
}
/** 파일 이름 — 구간별: 작업이름_01.jpg (페이지 안 구간 번호 두 자리), 한 장: 작업이름_전체.jpg */
export function exportFileName(base, file, ext) {
  return file.no === null ? `${base}_전체.${ext}` : `${base}_${String(file.no).padStart(2, '0')}.${ext}`
}

// ── 그릴 것 ──
/** 구간에서 그릴 요소 — items 배열 순서(뒤가 앞), 숨긴 요소·모르는 종류는 뺀다 */
export function sectionDrawList(section) {
  return section.items.filter(it => isDrawableItem(it) && !it.hidden)
}
/** 이 구간들에 필요한 사진 id (중복 없이, 그리는 순서) */
export function imageIdsOf(sections) {
  const out = []
  for (const s of sections) for (const it of sectionDrawList(s)) if (isValidImageItem(it) && !out.includes(it.imageId)) out.push(it.imageId)
  return out
}
/** 이 구간들의 글자·표 글꼴 (prepareFonts에 넘김 — [{ style, text }]) */
export function fontNeedsOf(sections) {
  const out = []
  for (const s of sections) {
    for (const it of sectionDrawList(s)) {
      if (isValidTextItem(it)) out.push({ style: textStyleOf(it), text: it.text })
      else if (isValidTableItem(it)) {
        const text = it.cells.flat().join('')
        out.push({ style: tableFontOf(it, true), text }, { style: tableFontOf(it, false), text })
      }
    }
  }
  return out
}

/** 내보내기 실패 — 어느 구간(번호)·사진인지 (창이 원인과 [다시 시도]를 보여 준다) */
export class ExportError extends Error {
  constructor(message, { sectionId = null, imageId = null, kind = 'draw' } = {}) {
    super(message)
    this.name = 'ExportError'
    this.sectionId = sectionId
    this.imageId = imageId
    this.kind = kind // 'image' | 'font' | 'draw' | 'tooLarge' | 'encode'
  }
}

// ── 기하 (순수) ──
const rad = deg => (deg * Math.PI) / 180
/** 요소 기준 벡터 → 캔버스 벡터 (뒤집기 → 회전 → 배율). 캔버스 그림자 오프셋은 변환을 따르지 않아 직접 계산한다 */
export function deviceVec(vx, vy, { rotation = 0, flipX = false, flipY = false }, scale) {
  const x = (flipX ? -vx : vx), y = (flipY ? -vy : vy)
  const t = rad(rotation), c = Math.cos(t), s = Math.sin(t)
  return { x: (x * c - y * s) * scale, y: (x * s + y * c) * scale }
}
/** object-fit: cover — 사진(iw×ih)에서 잘라 쓸 부분 (자리 cw×ch를 비율 유지로 꽉 채움, 가운데 기준) */
export function coverSource(iw, ih, cw, ch) {
  const k = Math.max(cw / iw, ch / ih)
  const sw = cw / k, sh = ch / k
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh }
}
/**
 * 사진 요소 꾸미기 (6-2, 화면 StudioPageView.itemStyle과 같은 값): 테두리는 안쪽(box-sizing: border-box), 모서리, 그림자(box-shadow)
 * @returns {{ bw, color, radius, innerRadius, content: {x,y,w,h}, shadow: { oy, blur, color }|null }} 요소 기준 페이지 px
 */
export function photoDecor(it) {
  const st = itemStyleOf(it)
  const bw = Math.min(st.borderWidth, it.w / 2, it.h / 2)
  const radius = Math.min(st.radius, it.w / 2, it.h / 2)
  return {
    bw, color: st.borderColor, radius, innerRadius: Math.max(0, radius - bw),
    content: { x: bw, y: bw, w: Math.max(0, it.w - bw * 2), h: Math.max(0, it.h - bw * 2) },
    // 화면: 0 {s×0.12}px {s×0.4}px rgba(0,0,0,s/100×0.45) — 흐림 = CSS blur radius (표준편차 = 절반 = 캔버스 shadowBlur와 같은 뜻)
    shadow: st.shadow ? { oy: st.shadow * 0.12, blur: st.shadow * 0.4, color: `rgba(0, 0, 0, ${(st.shadow / 100 * 0.45).toFixed(3)})` } : null,
  }
}

/**
 * 글자 한 줄의 자리 (요소 기준) — 화면 CSS와 같은 규칙:
 *   가로: 줄 폭 = 글자 폭 + 자간 × 글자 수(마지막 글자 뒤 포함 — CSS letter-spacing). 정렬 left = 0, center = (w - 줄 폭)/2, right = w - 줄 폭.
 *         줄이 요소보다 넓으면 왼쪽부터(CSS: 넘치는 줄은 시작 쪽 정렬)
 *   세로: 줄 높이 lh = fontSize × lineHeight 안에서 반쪽 행간 — 기준선 = 줄 위 + (lh - (ascent + descent)) / 2 + ascent
 * @param {{ ascent: number, descent: number }} metrics 글꼴의 ascent·descent (캔버스 fontBoundingBoxAscent·Descent = CSS 줄 높이 계산과 같은 값)
 */
export function textLineLayout(it, lines, measure, metrics) {
  const style = textStyleOf(it)
  const lh = it.fontSize * it.lineHeight
  return lines.map((text, i) => {
    const w = lineWidth(text, style, measure)
    let x = it.align === 'center' ? (it.w - w) / 2 : it.align === 'right' ? it.w - w : 0
    if (w > it.w) x = 0
    const asc = Math.round(metrics.ascent), desc = Math.round(metrics.descent) // 크롬 줄 배치는 글꼴 ascent·descent를 정수로 반올림해 쓴다
    const baseline = i * lh + (lh - (asc + desc)) / 2 + asc
    return { text, x, baseline, width: w }
  })
}

// ── 필터·조정 픽셀 계산 (순수 — 화면 CSS filter·SVG 필터와 같은 식, sRGB 값 그대로 · 단계마다 0~255로 자름) ──
// 화면 순서(lookCss): url(#svg: 온도 feColorMatrix → 선명 feConvolveMatrix) → brightness → contrast → saturate → grayscale → sepia → blur
const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v)
/** 색 행렬 3×3 (행 = 출력 R·G·B) + 더하기 (0~255 단위) 목록 — CSS Filter Effects 명세의 식 */
export function lookColorSteps(v) {
  const steps = []
  const b = 1 + v.brightness / 100, c = 1 + v.contrast / 100, s = 1 + v.saturation / 100
  if (v.brightness) steps.push({ m: [b, 0, 0, 0, b, 0, 0, 0, b], add: 0 })
  if (v.contrast) steps.push({ m: [c, 0, 0, 0, c, 0, 0, 0, c], add: (0.5 - 0.5 * c) * 255 })
  if (v.saturation) {
    steps.push({ m: [
      0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ], add: 0 })
  }
  if (v.gray) {
    const a = 1 - v.gray / 100
    steps.push({ m: [
      0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a,
      0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a,
      0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a,
    ], add: 0 })
  }
  if (v.sepia) {
    const a = 1 - v.sepia / 100
    steps.push({ m: [
      0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a,
      0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a,
      0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a,
    ], add: 0 })
  }
  return steps
}
function applyColorStep(d, { m, add }) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], bl = d[i + 2]
    d[i] = clamp255(m[0] * r + m[1] * g + m[2] * bl + add)
    d[i + 1] = clamp255(m[3] * r + m[4] * g + m[5] * bl + add)
    d[i + 2] = clamp255(m[6] * r + m[7] * g + m[8] * bl + add)
  }
}
/** 3×3 선명 커널 (feConvolveMatrix order 3, edgeMode duplicate, preserveAlpha — 합이 1이라 나누기 없음) */
function applySharpen(d, w, h, a) {
  const src = new Float32Array(d.length)
  for (let i = 0; i < d.length; i++) src[i] = d[i]
  const ctr = 1 + 4 * a
  for (let y = 0; y < h; y++) {
    const yu = y > 0 ? y - 1 : 0, yd = y < h - 1 ? y + 1 : h - 1
    for (let x = 0; x < w; x++) {
      const xl = x > 0 ? x - 1 : 0, xr = x < w - 1 ? x + 1 : w - 1
      const i = (y * w + x) * 4
      const u = (yu * w + x) * 4, dn = (yd * w + x) * 4, l = (y * w + xl) * 4, r = (y * w + xr) * 4
      for (let k = 0; k < 3; k++) d[i + k] = clamp255(ctr * src[i + k] - a * (src[u + k] + src[dn + k] + src[l + k] + src[r + k]))
    }
  }
}
/** 가우스 흐림 근사 — 상자 흐림 3번 (표준편차 sigma px, 가장자리 = 끝 픽셀 반복) */
export function boxSizesForGauss(sigma, n = 3) {
  const wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1)
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--
  const wu = wl + 2
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4))
  return Array.from({ length: n }, (_, i) => (i < m ? wl : wu))
}
function boxBlurPass(src, dst, w, h, r, horizontal) {
  const len = horizontal ? w : h, lines = horizontal ? h : w
  const idx = (line, p) => (horizontal ? (line * w + p) * 4 : (p * w + line) * 4)
  const n = 2 * r + 1
  for (let line = 0; line < lines; line++) {
    for (let k = 0; k < 4; k++) {
      let acc = 0
      for (let p = -r; p <= r; p++) acc += src[idx(line, Math.min(len - 1, Math.max(0, p))) + k]
      for (let p = 0; p < len; p++) {
        dst[idx(line, p) + k] = acc / n
        acc += src[idx(line, Math.min(len - 1, p + r + 1)) + k] - src[idx(line, Math.max(0, p - r)) + k]
      }
    }
  }
}
function applyBlur(d, w, h, sigma) {
  if (!(sigma > 0.2)) return
  let a = new Float32Array(d.length), b = new Float32Array(d.length)
  for (let i = 0; i < d.length; i++) a[i] = d[i]
  for (const size of boxSizesForGauss(sigma)) {
    const r = (size - 1) / 2
    if (r < 1) continue
    boxBlurPass(a, b, w, h, r, true)
    boxBlurPass(b, a, w, h, r, false)
  }
  for (let i = 0; i < d.length; i++) d[i] = clamp255(Math.round(a[i]))
}
/**
 * 필터·조정을 픽셀에 적용 (RGBA 배열을 바로 고친다). pxPerPagePx = 이 그림의 1페이지 px당 캔버스 px (흐림 반지름 환산)
 *   온도: 빨강 × (1 + t)·파랑 × (1 - t), t = 온도/100 × 0.12 (svgFilterParams와 같은 식)
 *   선명도 +: 3×3 커널 a = 선명도/100 × 0.6 — 화면은 화면 픽셀, 여기는 내보내는 픽셀 기준
 *   선명도 -: 흐림 표준편차 = |선명도|/100 × 1.2 페이지 px (화면은 화면 px라 배율에 따라 조금 다르다)
 */
export function applyLookPixels(d, w, h, look, pxPerPagePx = 1) {
  const v = lookValues(look)
  if (v.warmth) {
    const t = v.warmth / 100 * 0.12
    applyColorStep(d, { m: [1 + t, 0, 0, 0, 1, 0, 0, 0, 1 - t], add: 0 })
  }
  if (v.sharpness > 0) applySharpen(d, w, h, v.sharpness / 100 * 0.6)
  for (const step of lookColorSteps(v)) applyColorStep(d, step)
  if (v.sharpness < 0) applyBlur(d, w, h, -v.sharpness / 100 * 1.2 * pxPerPagePx)
}

// ── 캔버스 그리기 ──
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  if (rr) ctx.arcTo(x + w, y, x + w, y + rr, rr); else ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h - rr)
  if (rr) ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr); else ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + rr, y + h)
  if (rr) ctx.arcTo(x, y + h, x, y + h - rr, rr); else ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + rr)
  if (rr) ctx.arcTo(x, y, x + rr, y, rr); else ctx.lineTo(x, y)
  ctx.closePath()
}

/** 요소 기준 좌표로 옮긴다 (가운데 회전). flip = 뒤집기도 (사진은 사진만 뒤집어서 false) */
function toItem(ctx, it, flip) {
  ctx.translate(it.x + it.w / 2, it.y + it.h / 2)
  if (it.rotation) ctx.rotate(rad(it.rotation))
  if (flip && (it.flipX || it.flipY)) ctx.scale(it.flipX ? -1 : 1, it.flipY ? -1 : 1)
  ctx.translate(-it.w / 2, -it.h / 2)
}

function drawPhoto(ctx, it, img, env) {
  const dec = photoDecor(it)
  const W = it.w, H = it.h
  ctx.save()
  toItem(ctx, it, false)
  // 그림자: 요소 네모 바깥에만 (box-shadow는 요소 안쪽에 칠하지 않는다) — 바깥 영역으로 자르고 네모를 칠하면 그림자만 남는다
  if (dec.shadow) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(-W * 4 - dec.shadow.blur * 4, -H * 4 - dec.shadow.blur * 4, W * 9 + dec.shadow.blur * 8, H * 9 + dec.shadow.blur * 8)
    roundRectPath(ctx, 0, 0, W, H, dec.radius)
    ctx.clip('evenodd')
    const off = deviceVec(0, dec.shadow.oy, { rotation: it.rotation }, env.scale)
    ctx.shadowColor = dec.shadow.color
    ctx.shadowBlur = dec.shadow.blur * env.scale
    ctx.shadowOffsetX = off.x
    ctx.shadowOffsetY = off.y
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    roundRectPath(ctx, 0, 0, W, H, dec.radius)
    ctx.fill()
    ctx.restore()
  }
  // 테두리 (안쪽으로 bw — 바깥 둥근 네모에서 안쪽 둥근 네모를 뺀 고리)
  if (dec.bw > 0) {
    ctx.save()
    ctx.beginPath()
    roundRectPath(ctx, 0, 0, W, H, dec.radius)
    roundRectPath(ctx, dec.bw, dec.bw, dec.content.w, dec.content.h, dec.innerRadius)
    ctx.fillStyle = dec.color
    ctx.fill('evenodd')
    ctx.restore()
  }
  // 사진: 안쪽 네모(모서리 = 바깥 반지름 - 테두리)로 자르고, 자리에 맞춰 채움(cover) + 뒤집기 + 필터·조정
  const c = dec.content
  if (c.w > 0 && c.h > 0) {
    ctx.save()
    ctx.beginPath()
    roundRectPath(ctx, c.x, c.y, c.w, c.h, dec.innerRadius)
    ctx.clip()
    // 단색 배경 (17-2): 사진 자리(테두리 안쪽)를 색으로 먼저 — 필터를 거치지 않는다 (화면 = 사진 상자 배경, padding-box)
    if (img.bgColor) { ctx.fillStyle = img.bgColor; ctx.fillRect(c.x, c.y, c.w, c.h) }
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2)
    if (it.flipX || it.flipY) ctx.scale(it.flipX ? -1 : 1, it.flipY ? -1 : 1)
    const src = coverSource(img.width, img.height, c.w, c.h)
    // AI 배경 (17-4): 사진과 같은 크기·자르기의 아래 그림을 같은 자리(cover·뒤집기)에 먼저 — 필터를 거치지 않는다 (화면 = 사진 밑 <img>)
    if (img.bgSource) ctx.drawImage(img.bgSource, src.sx, src.sy, src.sw, src.sh, -c.w / 2, -c.h / 2, c.w, c.h)
    const look = env.deps.lookOf(it.imageId)
    if (isDefaultLook(look)) {
      ctx.drawImage(img.source, src.sx, src.sy, src.sw, src.sh, -c.w / 2, -c.h / 2, c.w, c.h)
    } else {
      // 필터는 내보내는 크기로 잘라 그린 뒤 픽셀에 적용 (화면도 자리 크기로 그려진 사진에 필터가 걸린다)
      const pw = Math.max(1, Math.round(c.w * env.scale)), ph = Math.max(1, Math.round(c.h * env.scale))
      const tmp = env.deps.createCanvas(pw, ph)
      const t = tmp.getContext('2d')
      t.imageSmoothingEnabled = true
      t.imageSmoothingQuality = 'high'
      t.drawImage(img.source, src.sx, src.sy, src.sw, src.sh, 0, 0, pw, ph)
      const data = t.getImageData(0, 0, pw, ph)
      applyLookPixels(data.data, pw, ph, look, env.scale)
      t.putImageData(data, 0, 0)
      ctx.drawImage(tmp, -c.w / 2, -c.h / 2, c.w, c.h)
      tmp.width = 0
      tmp.height = 0
    }
    ctx.restore()
  }
  ctx.restore()
}

/** 한 줄 쓰기 — 자간이 있으면 캔버스 letterSpacing(되는 브라우저) 아니면 글자마다 (폭 = measure + 자간) */
function textRun(ctx, mode, text, x, y, style, measure) {
  const ls = style.letterSpacing * style.fontSize
  const draw = (s, px) => (mode === 'stroke' ? ctx.strokeText(s, px, y) : ctx.fillText(s, px, y))
  if (!ls) { draw(text, x); return }
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${ls}px`
    draw(text, x)
    ctx.letterSpacing = '0px'
    return
  }
  let px = x
  for (const ch of text) { draw(ch, px); px += measure(ch, style) + ls }
}

function drawTextBody(ctx, it, layout, spec, style, measure) {
  ctx.font = fontSpec(style)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  if (spec.stroke) {
    ctx.lineWidth = spec.stroke.width * 2
    ctx.strokeStyle = spec.stroke.color
    ctx.lineJoin = 'miter'
    for (const ln of layout) textRun(ctx, 'stroke', ln.text, ln.x, ln.baseline, style, measure)
  }
  ctx.fillStyle = spec.fill
  for (const ln of layout) textRun(ctx, 'fill', ln.text, ln.x, ln.baseline, style, measure)
}

function drawText(ctx, it, env) {
  const spec = textPaintSpec(it)
  const style = textStyleOf(it)
  const lines = textLinesOf(it, env.deps.measure)
  ctx.save()
  toItem(ctx, it, true)
  ctx.font = fontSpec(style)
  const m = ctx.measureText('가Ag')
  const layout = textLineLayout(it, lines, env.deps.measure, { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent })
  if (spec.bg) {
    ctx.fillStyle = spec.bg.color
    ctx.beginPath()
    roundRectPath(ctx, spec.bg.x, spec.bg.y, spec.bg.w, spec.bg.h, spec.bg.radius)
    ctx.fill()
  }
  if (!spec.shadow) {
    drawTextBody(ctx, it, layout, spec, style, env.deps.measure)
    ctx.restore()
    return
  }
  // 그림자 = 테두리 + 글자를 합친 모양 하나 (화면 drop-shadow): 따로 한 장에 그린 뒤 그림자를 켜고 한 번에 붙인다
  const t = ctx.getTransform()
  const layer = env.deps.createCanvas(env.width, env.height)
  const lc = layer.getContext('2d')
  lc.setTransform(t)
  drawTextBody(lc, it, layout, spec, style, env.deps.measure)
  const off = deviceVec(spec.shadow.x, spec.shadow.y, it, env.scale)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.shadowColor = spec.shadow.color
  ctx.shadowBlur = spec.shadow.blur * env.scale
  ctx.shadowOffsetX = off.x
  ctx.shadowOffsetY = off.y
  ctx.drawImage(layer, 0, 0)
  layer.width = 0
  layer.height = 0
  ctx.restore()
}

function drawShape(ctx, it, env) {
  ctx.save()
  toItem(ctx, it, true)
  if (isValidShapeItem(it)) {
    const s = shapePaintSpec(it)
    const p = new env.deps.Path2D(s.d)
    if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(p) }
    if (s.stroke) {
      ctx.lineWidth = s.stroke.width
      ctx.lineJoin = s.stroke.join
      ctx.miterLimit = 10
      ctx.strokeStyle = s.stroke.color
      ctx.stroke(p)
    }
  } else {
    const s = linePaintSpec(it)
    ctx.setLineDash(s.line.dash ?? [])
    ctx.lineCap = s.line.cap
    ctx.lineJoin = 'miter'
    ctx.lineWidth = s.line.width
    ctx.strokeStyle = s.line.color
    ctx.stroke(new env.deps.Path2D(s.line.d))
    ctx.setLineDash([])
    for (const cap of s.caps) { ctx.fillStyle = cap.color; ctx.fill(new env.deps.Path2D(cap.d)) }
  }
  ctx.restore()
}

const TABLE_ALIGN = { start: 'left', middle: 'center', end: 'right' }
function drawTable(ctx, it, env) {
  const s = tablePaintSpec(it, env.deps.measure)
  ctx.save()
  toItem(ctx, it, true)
  for (const f of s.fills) { ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.w, f.h) }
  for (const l of s.lines) { ctx.fillStyle = l.color; ctx.fillRect(l.x, l.y, l.w, l.h) }
  ctx.textBaseline = 'middle' // 화면 SVG dominant-baseline: central (글자 네모 가운데)
  for (const t of s.texts) {
    ctx.font = fontSpec(t.font)
    ctx.textAlign = TABLE_ALIGN[t.anchor]
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x, t.y)
  }
  ctx.restore()
}

function drawItemBody(ctx, it, env) {
  if (isValidImageItem(it)) drawPhoto(ctx, it, env.images.get(it.imageId), env)
  else if (isValidTextItem(it)) drawText(ctx, it, env)
  else if (isValidShapeItem(it) || isValidLineItem(it)) drawShape(ctx, it, env)
  else if (isValidTableItem(it)) drawTable(ctx, it, env)
}

/** 요소 하나 — 투명도가 1보다 작으면 요소 전체를 한 장에 그린 뒤 그 장을 투명도로 붙인다 (화면 opacity = 한 덩어리 투명) */
export function drawItem(ctx, it, env) {
  const op = Number.isFinite(it.opacity) ? it.opacity : 1
  if (op <= 0) return
  if (op >= 1) { drawItemBody(ctx, it, env); return }
  const layer = env.deps.createCanvas(env.width, env.height)
  const lc = layer.getContext('2d')
  lc.setTransform(ctx.getTransform())
  drawItemBody(lc, it, env)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = op
  ctx.drawImage(layer, 0, 0)
  ctx.restore()
  layer.width = 0
  layer.height = 0
}

/** 구간 하나를 ctx에 (이미 받은 사진 images: Map id → { source, width, height }) — 배경 → 요소(배열 순서) */
export function drawSection(ctx, page, section, env) {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0)
  ctx.fillStyle = section.bg
  ctx.fillRect(0, 0, page.width, section.height)
  for (const it of sectionDrawList(section)) drawItem(ctx, it, env)
}

/** 구간들에 필요한 사진·글꼴 준비 — 실패하면 어느 구간·사진인지 ExportError */
export async function prepareSections(sections, deps) {
  const images = new Map()
  const notes = []
  for (const s of sections) {
    for (const it of sectionDrawList(s)) {
      if (!isValidImageItem(it) || images.has(it.imageId)) continue
      let img
      try {
        img = await deps.getImage(it.imageId)
      } catch (e) {
        console.error('[studioExport] 사진을 받지 못함:', s.id, it.imageId, e)
        throw new ExportError(e?.message || '사진을 받지 못했어요', { sectionId: s.id, imageId: it.imageId, kind: 'image' })
      }
      images.set(it.imageId, img)
      for (const n of img.notes || []) notes.push({ sectionId: s.id, imageId: it.imageId, note: n })
    }
  }
  const fonts = fontNeedsOf(sections)
  if (fonts.length && !(await deps.prepareFonts(fonts))) {
    throw new ExportError('글꼴을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', { sectionId: sections[0]?.id ?? null, kind: 'font' })
  }
  return { images, notes }
}

/**
 * 구간 하나 → 캔버스 (폭 page.width × scale, 높이 구간 height × scale)
 * @returns {Promise<{ canvas, notes }>} notes = 사진 준비 중 알릴 것 (지우기 결과 일부를 못 그림 등 — 화면과 같은 상태)
 */
export async function renderSection(page, sectionId, deps, { scale = 1 } = {}) {
  const section = page.sections.find(s => s.id === sectionId)
  if (!section) throw new ExportError('없는 구간이에요', { sectionId })
  const { width, height } = sectionPixelSize(page, section, scale)
  if (!canvasFits(width, height)) throw new ExportError(`이미지가 너무 길어요 (${width}×${height}px)`, { sectionId, kind: 'tooLarge' })
  const { images, notes } = await prepareSections([section], deps)
  const canvas = deps.createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  drawSection(ctx, page, section, { deps, images, scale, width, height })
  return { canvas, notes }
}

/**
 * 고른 구간을 이어 붙인 한 장 (구간 사이 = gap × scale, 흰색). onStep(i, n, sectionId) = 몇 번째 구간 그리는 중
 * 캔버스 한계를 넘으면 ExportError(kind 'tooLarge') — 창이 "구간별로 받기"를 안내한다
 */
export async function renderPage(page, sectionIds, deps, { scale = 1, onStep } = {}) {
  const want = new Set(sectionIds)
  const sections = page.sections.filter(s => want.has(s.id))
  if (sections.length === 0) throw new ExportError('받을 구간을 골라 주세요', {})
  const { tops, height } = stackLayout(page, sections)
  const W = Math.round(page.width * scale), H = Math.round(height * scale)
  if (!canvasFits(W, H)) throw new ExportError(`한 장으로 만들기에는 너무 길어요 (${W}×${H}px)`, { kind: 'tooLarge' })
  const canvas = deps.createCanvas(W, H)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = GAP_COLOR
  ctx.fillRect(0, 0, W, H)
  const notes = []
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    onStep?.(i, sections.length, s.id)
    const r = await renderSection(page, s.id, deps, { scale })
    notes.push(...r.notes)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(r.canvas, 0, Math.round(tops[i] * scale))
    r.canvas.width = 0
    r.canvas.height = 0
  }
  return { canvas, notes }
}

/** 캔버스 → 파일 (toBlob이 비면 = 캔버스를 만들지 못함·오염) */
export function canvasToBlob(canvas, format) {
  const f = EXPORT_FORMATS[format]
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new ExportError('이미지 파일을 만들지 못했어요 (너무 크거나 브라우저 메모리가 부족해요)', { kind: 'encode' }))), f.mime, f.quality)
  })
}
