/**
 * 배경 지우기 (17-1) — edit.bg 읽기·쓰기 + 마스크 합성 (순수 함수 + 캔버스 한 개, node 테스트: scripts/test-studio-bg.mjs)
 *
 * ★ 저장 위치: studio_images.edit.bg (지우기 layers·필터 look·자르기 crop/cuts와 나란히 — layers에 넣지 않는다)
 *     edit.bg = {
 *       mask: { path, key, model, w, h },   서버(api/studio-upload.js bg_remove)가 만든 8비트 회색 PNG. 원본 크기, 흰 = 제품
 *       mode: 'transparent' | 'none' | 'color',  transparent = 배경을 투명하게(구간 배경색이 보임) / none = 원래 배경(마스크는 두고 안 씀)
 *                                                 color = 단색 배경(17-2 — AI 없음·무료)
 *       color?: '#rrggbb',                  단색 색 (mode가 color일 때 쓴다. 다른 모드로 바꿔도 남겨 두어 [단색]으로 돌아오면 그 색)
 *       refined?: { path, key, w, h },      손으로 다듬은 마스크(17-3 [경계 다듬기] — 브라우저에서 만든 회색 PNG, AI 마스크와 같은 w·h)
 *                                           경로 {uid}/{projectId}/bg/{imageId}/refined_{key16}.png, key = 내용 해시(studioBgRefine.refineKey)
 *       ai?: { path, key, w, h, preset, model }, AI 배경 이미지(17-4 — 서버 bg_generate가 저장한 결과 그대로, key = 내용 해시)
 *                                           경로 {uid}/{projectId}/bg/{imageId}/ai_{key16}.{png|jpg|webp}. mode 'ai'일 때 사진 자리 아래에 깐다.
 *                                           다른 모드로 바꿔도 남겨 두어 [AI 배경]으로 돌아오면 다시 쓴다(돈 안 듦 — 단색 색 기억과 같은 방식)
 *       lib?: { asset, w, h, label? },      라이브러리 배경(에셋 이미지 — studioAsset.js, public/studio-assets의 정적 파일 경로). mode 'library'일 때 사진 자리 아래에 깐다.
 *                                           AI 배경과 같은 길(사진 밑 그림)이지만 외부 AI·서버·사용 기록·한도가 없다(무료). 파일을 복사하지 않는다(복사본도 같은 경로).
 *                                           다른 모드로 바꿔도 남겨 두어 [라이브러리]로 돌아오면 그 그림
 *     }
 * ★ AI 배경(17-4)도 사진 파일에 넣지 않는다: 제품 = 우리 원본 + 마스크(bgMaskSource)로 만든 투명 사진(단색·투명과 똑같음),
 *   AI 이미지는 사진과 같은 자르기·띠를 거쳐 "사진 자리 아래"에 깐다 (화면 = 사진 밑 <img>, 내보내기 = drawPhoto가 사진 전에).
 *   AI 결과 안의 제품 모습은 보이지 않는다(우리 제품이 위를 덮음) — 필터는 제품에만.
 * ★ 합성에 쓸 마스크는 bgMaskSource 한 곳에서만 고른다: refined가 있으면 그것, 없으면 AI 마스크(mask).
 *   AI 마스크(mask)는 절대 바꾸지 않는다 — [AI 결과로 되돌리기]·같은 원본 재사용(서버 key)에 필요하다.
 *   예전 데이터(refined 없음)는 지금까지와 똑같이 AI 마스크를 쓴다.
 * ★ 단색(17-2)은 사진 파일에 색을 넣지 않는다 — 화면 작은 사진은 투명 그대로 두고, 그리는 쪽이 사진 자리 아래에 색을 깐다
 *   (화면: 사진 요소 상자 배경 / 내보내기: 사진 자리를 색으로 채운 뒤 사진). 필터·조정은 사진(img·사진 캔버스)에만 걸리므로
 *   색은 고른 그대로 보이고 필터는 제품(마스크 안)에만 먹는다. 사진은 자리를 꽉 채우므로(cover) "사진 아래 색" = "투명 자리의 색".
 *   없음(bg 칸 없음) = 배경을 지운 적 없음 또는 [배경 원래대로]. 마스크 파일은 원본 사진에서 한 번 만든다(돈은 그때만) —
 *   투명·원래 배경 전환·미리보기·내보내기·복사본은 저장된 마스크만 쓴다.
 * ★ 적용 순서 (화면 작은 사진·내보내기·미리보기 공통 — studioViewImage.applyBackground 하나):
 *   원본 → 지우기·덮기(완성 JPG 또는 원본 + 조각) → 마스크(알파만 곱함) → 띠 → 자르기 → 필터 → 꾸미기
 * ★ 제품 픽셀 불변: 색(R·G·B)은 절대 바꾸지 않고 알파만 곱한다 (applyMaskToRgba). 마스크 255인 곳은 원본 그대로.
 * ★ 완성 JPG(final)에는 넣지 않는다. layers가 그대로면 erase_v도 그대로(studioFinal.stampEraseVersion은 layers만 본다).
 */

import { isAssetPath } from './studioAsset.js'

export const BG_MODES = ['transparent', 'none', 'color', 'ai', 'library']
export const BG_DEFAULT_COLOR = '#ffffff'
// 단색 견본 (17-2) — 상품 사진에 흔한 밝은 바탕 + 검정
export const BG_COLOR_SWATCHES = [
  { value: '#ffffff', label: '흰색' },
  { value: '#f1f2f4', label: '연회색' },
  { value: '#f3ebe0', label: '따뜻한 베이지' },
  { value: '#f9e4e8', label: '연분홍' },
  { value: '#e3eff9', label: '연하늘' },
  { value: '#111111', label: '검정' },
]
const MASK_PATH_RE = /^[^/]+\/[^/]+\/bg\/[^/]+\/mask_[0-9a-f]{16}\.png$/
const REFINED_PATH_RE = /^[^/]+\/[^/]+\/bg\/[^/]+\/refined_[0-9a-f]{16}\.png$/
const AI_PATH_RE = /^[^/]+\/[^/]+\/bg\/[^/]+\/ai_[0-9a-f]{16}\.(png|jpg|webp)$/
const KEY_RE = /^[0-9a-f]{16}$/
const HEX_RE = /^#[0-9a-f]{6}$/i

/** '#rrggbb'(소문자)이면 그 값, 아니면 null */
export function normalizeBgColor(v) {
  return typeof v === 'string' && HEX_RE.test(v.trim()) ? v.trim().toLowerCase() : null
}

/** edit → bg (모양이 틀리면 null — 그리지 않고, 저장값은 그대로 둔다) */
export function readBg(edit) {
  const b = edit && typeof edit === 'object' ? edit.bg : null
  if (!b || typeof b !== 'object') return null
  const m = b.mask
  if (!m || typeof m.path !== 'string' || !MASK_PATH_RE.test(m.path) || !Number.isInteger(m.w) || !Number.isInteger(m.h) || m.w < 1 || m.h < 1) {
    console.error('[studioBg] edit.bg 모양이 이상함 — 배경 지우기를 쓰지 않음:', b)
    return null
  }
  const mode = BG_MODES.includes(b.mode) ? b.mode : 'transparent'
  const out = { mask: { path: m.path, key: String(m.key || ''), model: String(m.model || ''), w: m.w, h: m.h }, mode }
  if (b.color !== undefined || mode === 'color') {
    const c = normalizeBgColor(b.color)
    if (!c) console.warn('[studioBg] 단색 배경 색 값이 이상함 — 흰색으로 읽음:', b.color)
    out.color = c || BG_DEFAULT_COLOR
  }
  if (b.refined !== undefined && b.refined !== null) {
    const r = readRefined(b.refined, out.mask)
    if (r) out.refined = r
    else console.error('[studioBg] 다듬은 마스크(edit.bg.refined) 모양이 이상함 — 다듬기 없이 AI 마스크로 읽음:', b.refined)
  }
  if (b.ai !== undefined && b.ai !== null) {
    const a = readAi(b.ai, out.mask)
    if (a) out.ai = a
    else console.error('[studioBg] AI 배경(edit.bg.ai) 모양이 이상함 — AI 배경 없이 읽음:', b.ai)
  }
  if (b.lib !== undefined && b.lib !== null) {
    const l = readLib(b.lib)
    if (l) out.lib = l
    else console.error('[studioBg] 라이브러리 배경(edit.bg.lib) 모양이 이상함 — 라이브러리 배경 없이 읽음:', b.lib)
  }
  if (out.mode === 'ai' && !out.ai) {
    console.error('[studioBg] 모드가 AI 배경인데 AI 배경 정보가 없음 — 투명으로 읽음:', b)
    out.mode = 'transparent'
  }
  if (out.mode === 'library' && !out.lib) {
    console.error('[studioBg] 모드가 라이브러리 배경인데 그림 정보가 없음 — 투명으로 읽음:', b)
    out.mode = 'transparent'
  }
  return out
}

/** 라이브러리 배경 정보 — 에셋 경로 규칙·크기(양의 정수)가 맞을 때만, 아니면 null */
function readLib(l) {
  if (!l || typeof l !== 'object' || !isAssetPath(l.asset)) return null
  if (!Number.isInteger(l.w) || !Number.isInteger(l.h) || l.w < 1 || l.h < 1) return null
  const label = typeof l.label === 'string' ? [...l.label.trim()].slice(0, 40).join('') : ''
  return label ? { asset: l.asset, w: l.w, h: l.h, label } : { asset: l.asset, w: l.w, h: l.h }
}
/** 목록 항목(manifest) → bg.lib */
export function libFromEntry(entry) {
  return readLib({ asset: entry?.file, w: entry?.w, h: entry?.h, label: entry?.label })
}

/** AI 배경 정보 — 경로 규칙·key·크기(양의 정수)·같은 사진 폴더가 맞을 때만, 아니면 null */
function readAi(a, mask) {
  if (!a || typeof a !== 'object' || typeof a.path !== 'string' || !AI_PATH_RE.test(a.path)) return null
  if (!KEY_RE.test(String(a.key || '')) || !Number.isInteger(a.w) || !Number.isInteger(a.h) || a.w < 1 || a.h < 1) return null
  if (folderOf(a.path) !== folderOf(mask.path)) return null
  return { path: a.path, key: a.key, w: a.w, h: a.h, preset: String(a.preset || ''), model: String(a.model || '') }
}

/** 다듬은 마스크 정보 — 경로 규칙·key·크기(= AI 마스크 w·h)·같은 사진 폴더가 맞을 때만, 아니면 null */
function readRefined(r, mask) {
  if (!r || typeof r !== 'object' || typeof r.path !== 'string' || !REFINED_PATH_RE.test(r.path)) return null
  if (!KEY_RE.test(String(r.key || '')) || r.w !== mask.w || r.h !== mask.h) return null
  if (folderOf(r.path) !== folderOf(mask.path)) return null
  return { path: r.path, key: r.key, w: r.w, h: r.h }
}
function folderOf(path) { return path.slice(0, path.lastIndexOf('/')) }

/** edit에 bg를 넣은 새 edit — 다른 칸은 그대로. null이면 bg 칸을 뺀다 */
export function withBg(edit, bg) {
  const base = edit && typeof edit === 'object' && !Array.isArray(edit) ? edit : {}
  const { bg: _old, ...rest } = base
  if (!bg) return rest
  const out = { mask: { ...bg.mask }, mode: bg.mode }
  const c = normalizeBgColor(bg.color)
  if (c) out.color = c
  if (bg.refined) out.refined = { ...bg.refined }
  if (bg.ai) out.ai = { ...bg.ai }
  if (bg.lib) out.lib = { ...bg.lib }
  return { ...rest, bg: out }
}

/** 다듬은 마스크를 바꾼 새 bg (null = 다듬기 없앰 → AI 마스크) — 다른 칸은 그대로 */
export function withRefined(bg, refined) {
  const { refined: _old, ...rest } = bg
  return refined ? { ...rest, refined: { path: refined.path, key: refined.key, w: refined.w, h: refined.h } } : rest
}

/**
 * 합성에 쓸 마스크 — 다듬은 것이 있으면 그것, 없으면 AI 마스크. 화면 작은 사진·미니뷰·미리보기·내보내기가 모두 이 함수로 고른다
 * (studioViewImage.applyBackground · bgViewKey). 없거나 쓰지 않는 모드면 null.
 * @returns {{ path, w, h, refined: boolean }|null}
 */
export function bgMaskSource(bg) {
  if (!bg?.mask) return null
  return bg.refined
    ? { path: bg.refined.path, w: bg.refined.w, h: bg.refined.h, refined: true }
    : { path: bg.mask.path, w: bg.mask.w, h: bg.mask.h, refined: false }
}

/** 단색 배경 색 (mode가 color일 때만, 아니면 null) — 그리는 쪽이 사진 자리 아래에 깐다 */
export function bgPaintColor(bg) {
  return bg?.mask && bg.mode === 'color' ? normalizeBgColor(bg.color) || BG_DEFAULT_COLOR : null
}

/**
 * 사진 자리 아래에 깔 AI 배경 (mode가 ai일 때만, 아니면 null) — 그리는 쪽이 사진과 같은 자르기·띠를 거쳐 사진 밑에 둔다
 * @returns {{ path, w, h }|null}
 */
export function bgAiUnder(bg) {
  return bg?.mask && bg.mode === 'ai' && bg.ai ? { path: bg.ai.path, w: bg.ai.w, h: bg.ai.h } : null
}

/**
 * 사진 자리 아래에 깔 라이브러리 배경 (mode가 library일 때만, 아니면 null)
 * @returns {{ asset, w, h }|null}
 */
export function bgLibUnder(bg) {
  return bg?.mask && bg.mode === 'library' && bg.lib ? { asset: bg.lib.asset, w: bg.lib.w, h: bg.lib.h } : null
}

/**
 * AI 결과(iw×ih)를 사진 크기(W×H)에 맞출 때 쓸 원본 범위 — 가로세로 비율이 1% 안이면 전체를 늘려 맞추고(제품 자리 그대로),
 * 더 다르면 가운데 기준으로 잘라 채운다(찌그러뜨리지 않음). 화면·내보내기가 같은 함수를 쓴다 (studioViewImage.applyBackground)
 */
export function aiFitSource(iw, ih, W, H) {
  const ra = iw / ih, rb = W / H
  if (Math.abs(ra / rb - 1) <= 0.01) return { sx: 0, sy: 0, sw: iw, sh: ih }
  const k = Math.max(W / iw, H / ih)
  const sw = W / k, sh = H / k
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh }
}

/** 서버 bg_generate 응답 → bg.ai */
export function aiFromServer(r) {
  return { path: r.path, key: r.key, w: r.w, h: r.h, preset: String(r.preset || ''), model: String(r.model || '') }
}

/** 서버 bg_remove 응답 → 저장할 bg (투명으로 시작) */
export function bgFromServer(r) {
  return { mask: { path: r.path, key: r.key, model: r.model, w: r.width, h: r.height }, mode: 'transparent' }
}

/** 지금 합성에 마스크를 쓰는지 (투명·단색·AI 배경 — 사진은 투명하게 만들고 색·AI 배경은 그리는 쪽이 아래에 깐다) */
export function bgActive(bg) {
  return !!bg?.mask && (bg.mode === 'transparent' || bg.mode === 'color' || (bg.mode === 'ai' && !!bg.ai) || (bg.mode === 'library' && !!bg.lib))
}

/** 화면 작은 사진 key 조각 (바뀌면 다시 만든다) — 색은 사진 파일에 안 들어가므로 key에 없다 (색을 바꿔도 다시 안 만듦).
 *  17-3: 쓰는 마스크 경로(다듬은 것 또는 AI)가 key — 다듬으면 다시 만든다 */
export function bgViewKey(bg) {
  if (!bgActive(bg)) return ''
  const under = bgAiUnder(bg) // 17-4: AI 배경을 바꾸면 아래 그림을 다시 만든다
  const lib = bgLibUnder(bg) // 라이브러리 배경을 바꿔도 아래 그림을 다시 만든다
  return `|bg:${bgMaskSource(bg).path}${under ? `|ai:${under.path}` : ''}${lib ? `|lib:${lib.asset}` : ''}`
}

/** 목록·사진 정보 카드 표시 — 다듬은 마스크를 쓰면 "· 다듬음" (원래 배경일 때는 표시 없음 — 다듬은 결과가 안 보이므로) */
export function bgMark(bg) {
  if (!bgActive(bg)) return ''
  const base = bg.mode === 'color' ? '배경 단색' : bg.mode === 'ai' ? 'AI 배경' : bg.mode === 'library' ? '라이브러리 배경' : '배경 지움'
  return bg.refined ? `${base} · 다듬음` : base
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

export const PAGE_DEFAULT_BG = '#ffffff' // = studioPage.SECTION_BG (새 구간 기본 배경)
/**
 * [구간 배경색과 같게]의 기준 구간 (검수 2묶음 — 17-2 크롬 확인: 목록에서 고른 사진이 페이지에 없으면 잠겼다)
 * 고르는 순서: ① 그 사진이 놓인 구간(페이지에서 고른 자리가 먼저) ② 골라진 구간 ③ 지금 보고 있는 구간 ④ 페이지 기본 배경(흰색)
 * 기준 구간의 배경색이 '#rrggbb'가 아니면(옛 값) 잠그고 이유를 돌려준다 (다른 구간으로 몰래 바꾸지 않음)
 * @param {{ sections: object[] }|null} page
 * @param {{ photoSectionId?: string|null, selectedSectionId?: string|null, inViewSectionId?: string|null }} ids
 * @returns {{ color: string|null, source: 'photo'|'selected'|'inView'|'page', sectionId: string|null, reason: string }}
 */
export function sectionBgChoice(page, { photoSectionId = null, selectedSectionId = null, inViewSectionId = null } = {}) {
  const find = id => (id && page?.sections?.find(s => s.id === id)) || null
  const tries = [['photo', photoSectionId], ['selected', selectedSectionId], ['inView', inViewSectionId]]
  for (const [source, id] of tries) {
    const s = find(id)
    if (!s) continue
    const color = normalizeBgColor(s.bg)
    return color
      ? { color, source, sectionId: s.id, reason: '' }
      : { color: null, source, sectionId: s.id, reason: '이 섹션 배경색은 예전 형식이라 고를 수 없어요. [섹션]에서 배경색을 다시 골라 주세요.' }
  }
  return { color: PAGE_DEFAULT_BG, source: 'page', sectionId: null, reason: '' }
}
