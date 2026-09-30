/**
 * 템플릿 그림 (템플릿 갤러리·편집기 [템플릿] 패널 카드 표지 + 미리보기 칸) — 브라우저에서만
 *
 * ★ 그리는 함수는 새로 만들지 않는다: 템플릿 → 페이지 문서(studioTemplates.templatePreviewPage — 적용과 같은 buildTemplatePage)
 *   → 내보내기·미리보기와 같은 엔진(studioExport.renderPage)으로 한 장. 그래서 적용한 페이지를 내보낸 그림과 같다.
 *   사진 자리는 그 카테고리의 예시 사진(studioSamples — 자리마다 어울리는 종류)으로 채운다 = 사진 없이 적용했을 때와 같은 모양.
 *   예시 사진 목록(manifest)을 못 받으면 정사각 회색 자리표시(가운데 산 그림)로 그린다.
 * ★ 캐시: 템플릿 key마다 한 번만 그리고(이 탭 안), 그 결과(JPG blob 주소)를 다시 쓴다. 실패한 것은 캐시에서 빼서 다음에 다시 그린다.
 *   여러 장을 동시에 부르면 하나씩 차례로 그린다 (화면이 버벅이지 않게).
 * ★ 글꼴: 템플릿 글자의 글꼴 조각을 먼저 받은 뒤에 글자 높이를 재고 그린다 (편집기 적용·내보내기와 같은 순서).
 * ★ 카드 표지(templateCover)와 미리보기 전체 그림(templateThumb)은 따로 그린다 — 목록을 열 때 템플릿 전체·원본 사진을 받지 않게.
 *   표지 = 첫 구간만, 폭 COVER_WIDTH, 에셋·예시 사진은 목록용 작은 그림(manifest thumb — 표지 크기에 모자라면 원본), 첫 구간 글꼴만.
 *   전체 그림 = 예전 그대로 모든 구간·원본 그림 (미리보기 칸을 열 때만). 편집기 적용은 이 파일의 그림을 쓰지 않는다(원본 그대로).
 */
import { renderPage, renderSection, canvasToBlob } from './studioExport.js'
import { templateByKey, templatePreviewPage, templatePageHeight, templateFontList, templateSlots, templateSlotTypes, assignTemplateSamples, PREVIEW_PHOTO } from './studioTemplates.js'
import { createTextMeasure, loadFontsFor } from './studioFonts.js'
import { loadAssetImage, loadAssetManifest } from './studioAssetLoad.js'
import { pickSamples, sampleCategoryOf } from './studioSamples.js'
import { sectionBgImageOf } from './studioAsset.js'

export const THUMB_WIDTH = 560           // 미리보기 전체 그림 폭 (px) — 미리보기 칸이 줄여서 보여 준다
export const COVER_WIDTH = 400           // 카드 표지 폭 (px) — 예시 사진 목록용 그림(긴 변 400)과 같은 폭
export const COVER_RATIO = 4 / 3         // 표지 = 3:4 칸 (첫 구간 전체를 줄여 넣는다 — 템플릿 첫 구간은 780×1040 = 3:4)
const PLACEHOLDER_BG = '#e8eaee'
const PLACEHOLDER_INK = '#c6ccd5'

const measure = createTextMeasure()
const coverMeasure = createTextMeasure() // 표지는 첫 구간 글꼴만 받으므로 전체 그림과 측정 캐시를 나눈다
const cache = new Map() // key → Promise<{ full, width, height, sections, pageHeight }>
const done = new Map()  // key → 다 그린 그림
const coverCache = new Map() // key → Promise<{ cover }>
const coverDone = new Map()
let queue = Promise.resolve()

let placeholder = null
/** 사진 자리 그림 (한 장을 모든 자리가 같이 쓴다) — 정사각, 가운데에 해와 산 */
function placeholderImage() {
  if (placeholder) return placeholder
  const { width: w, height: h } = PREVIEW_PHOTO
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.fillStyle = PLACEHOLDER_BG
  g.fillRect(0, 0, w, h)
  g.fillStyle = PLACEHOLDER_INK
  const u = w / 780
  g.beginPath()
  g.arc(w / 2 + 60 * u, h / 2 - 50 * u, 26 * u, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.moveTo(w / 2 - 130 * u, h / 2 + 80 * u)
  g.lineTo(w / 2 - 40 * u, h / 2 - 20 * u)
  g.lineTo(w / 2 + 20 * u, h / 2 + 40 * u)
  g.lineTo(w / 2 + 60 * u, h / 2 + 5 * u)
  g.lineTo(w / 2 + 130 * u, h / 2 + 80 * u)
  g.closePath()
  g.fill()
  placeholder = { source: c, width: w, height: h, notes: [] }
  return placeholder
}

const deps = {
  createCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c },
  Path2D: typeof window !== 'undefined' ? window.Path2D : undefined,
  getImage: async () => placeholderImage(), // 템플릿 그림에는 사진 자리(slot-n)만 있다
  getAsset: loadAssetImage,
  lookOf: () => null, // 필터·조정 없음
  measure,
  async prepareFonts(list) {
    try {
      return await loadFontsFor(list)
    } catch (e) {
      console.error('[studioTemplateThumbs] 글꼴 준비 실패:', e)
      return false
    }
  },
}

let assigned = null // { samples, map } — 목록(manifest)이 같으면 한 번만 나눈다
/**
 * 이 템플릿 자리마다 예시 사진 (자리 순서) — 목록을 못 받으면 null (회색 자리표시로 그린다).
 * 갤러리 전체를 한 번에 나눈 결과(studioTemplates.assignTemplateSamples — 카드끼리 대표 사진이 겹치지 않음)에서 꺼낸다.
 * 목록에 없는 템플릿(내 템플릿 등)은 그 카테고리 사진을 차례로 (pickSamples).
 * 편집기 적용(applyTemplate)도 같은 함수로 남은 자리를 채운다 = 갤러리 그림과 같은 사진.
 */
export async function templateSamples(tpl) {
  try {
    const m = await loadAssetManifest()
    if (!m.samples?.length) return null
    if (assigned?.samples !== m.samples) assigned = { samples: m.samples, map: assignTemplateSamples(m.samples) }
    return assigned.map.get(tpl.key) ?? pickSamples(templateSlotTypes(tpl), m.samples, sampleCategoryOf(tpl, m.samples))
  } catch (e) {
    console.error('[studioTemplateThumbs] 예시 사진 목록을 받지 못함 — 회색 자리로 그림:', e)
    return null
  }
}

function toUrl(canvas) {
  return canvasToBlob(canvas, 'jpg').then(b => URL.createObjectURL(b))
}

async function draw(key) {
  const tpl = templateByKey(key)
  if (!tpl) throw new Error(`모르는 템플릿: ${key}`)
  let fontsOk = false
  try {
    fontsOk = await loadFontsFor(templateFontList(tpl))
  } catch (e) {
    console.error('[studioTemplateThumbs] 글꼴 조각을 받지 못함:', key, e)
  }
  if (!fontsOk) measure.clear() // 대체 글꼴로 잰 값이 다음 템플릿에 남지 않게
  const samples = await templateSamples(tpl)
  const page = templatePreviewPage(tpl, [], measure, samples)
  if (!page || page.sections.length === 0) throw new Error(`템플릿 페이지를 만들지 못함: ${key}`)
  const scale = THUMB_WIDTH / page.width
  const { canvas } = await renderPage(page, page.sections.map(s => s.id), deps, { scale })
  try {
    const full = await toUrl(canvas)
    return { full, width: canvas.width, height: canvas.height, sections: page.sections.length, pageHeight: templatePageHeight(page) }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

/**
 * 표지용 문서 — 첫 구간만 남긴 템플릿으로 만든다 (아래 구간의 글꼴·사진을 받지 않게).
 * 예시 사진은 전체 템플릿의 자리 순서로 나눈 것을 그 자리 번호로 옮겨 준다 (갤러리 그림·적용과 같은 사진).
 * 첫 구간이 빠지는 템플릿(자리가 비어 구간째 빠짐)이면 전체 문서의 첫 구간 = 예전 표지와 같다.
 */
function coverPage(tpl, samples, m) {
  const one = { ...tpl, sections: tpl.sections.slice(0, 1) }
  const all = templateSlots(tpl)
  const oneSamples = samples ? templateSlots(one).map(n => samples[all.indexOf(n)] ?? null) : null
  const page = templatePreviewPage(one, [], m, oneSamples)
  if (page && page.sections.length > 0) return page
  return templatePreviewPage(tpl, [], m, samples)
}

/** manifest 경로 → { thumb, w, h } (에셋 + 예시 사진). 목록을 못 받으면 빈 표 (원본으로 그린다) */
async function thumbTable() {
  const out = new Map()
  try {
    const m = await loadAssetManifest()
    for (const e of [...(m.items || []), ...(m.samples || [])]) if (e.thumb) out.set(e.file, { thumb: e.thumb, w: e.w, h: e.h })
  } catch (e) {
    console.error('[studioTemplateThumbs] 이미지 목록을 받지 못함 — 표지를 원본 그림으로 그림:', e)
  }
  return out
}

/**
 * 이 구간에서 에셋 그림마다 필요한 배율 (원본 1px → 표지 몇 px). 같은 그림이 여러 번이면 가장 큰 값.
 * contain = 그림 전체가 자리 안, cover = 자리를 채우도록 (섹션 배경 이미지 = 섹션 전체를 cover).
 */
function assetNeeds(page, section, table, scale) {
  const need = new Map()
  const note = (path, w, h, fit) => {
    const t = table.get(path)
    if (!t || !(t.w > 0 && t.h > 0)) return
    const k = (fit === 'cover' ? Math.max : Math.min)((w * scale) / t.w, (h * scale) / t.h)
    need.set(path, Math.max(need.get(path) ?? 0, k))
  }
  const bg = sectionBgImageOf(section)
  if (bg) note(bg.asset, page.width, section.height, bg.fit)
  for (const it of section.items || []) if (it?.type === 'asset' && typeof it.asset === 'string') note(it.asset, it.w, it.h, it.fit)
  return need
}

/**
 * 표지 한 장 (캔버스) — 화면 카드(3c0e670 방식, 내 템플릿 등)와 기본 템플릿 표지 미리 만들기(scripts/build-studio-covers.mjs)가 같이 쓴다.
 * @returns {Promise<{ canvas, fontsOk: boolean }>} canvas = 폭 width × 3:4. 다 쓴 뒤 부르는 쪽이 비운다
 */
export async function drawCoverCanvas(tpl, width = COVER_WIDTH) {
  const key = tpl.key
  const first = { ...tpl, sections: tpl.sections.slice(0, 1) }
  let fontsOk = false
  try {
    fontsOk = await loadFontsFor(templateFontList(first))
  } catch (e) {
    console.error('[studioTemplateThumbs] 표지 글꼴 조각을 받지 못함:', key, e)
  }
  coverMeasure.clear() // 첫 구간 글꼴만 받았으니 표지마다 새로 잰다 (다른 표지의 대체 글꼴 값이 남지 않게)
  if (!fontsOk) console.warn('[studioTemplateThumbs] 표지를 대체 글꼴로 그림:', key)
  const samples = await templateSamples(tpl)
  const page = coverPage(tpl, samples, coverMeasure)
  if (!page || page.sections.length === 0) throw new Error(`템플릿 페이지를 만들지 못함: ${key}`)
  const scale = width / page.width
  const sec = page.sections[0]
  const table = await thumbTable()
  const need = assetNeeds(page, sec, table, scale)
  const coverDeps = {
    ...deps,
    measure: coverMeasure,
    // 목록용 작은 그림이 표지 크기에 충분하면 그것, 모자라면(큰 배경 등) 원본
    async getAsset(path) {
      const t = table.get(path)
      if (t && need.has(path)) {
        const small = await loadAssetImage(t.thumb)
        if (small.width / t.w >= need.get(path) * 0.95) return small
      }
      return loadAssetImage(path)
    },
  }
  const { canvas } = await renderSection(page, sec.id, coverDeps, { scale })
  try {
    // 표지 = 첫 구간 전체를 3:4 칸에 줄여 넣는다 (윗부분만 자르지 않음 — 첫 구간이 3:4보다 길면 줄이고, 짧으면 위아래를 구간 배경색으로)
    const secH = canvas.height
    const coverH = Math.round(canvas.width * COVER_RATIO)
    const cover = deps.createCanvas(canvas.width, coverH)
    const g = cover.getContext('2d')
    g.fillStyle = typeof sec.bg === 'string' ? sec.bg : '#ffffff'
    g.fillRect(0, 0, canvas.width, coverH)
    const k = Math.min(1, coverH / secH)
    const dw = Math.round(canvas.width * k), dh = Math.round(secH * k)
    g.drawImage(canvas, 0, 0, canvas.width, secH, Math.round((canvas.width - dw) / 2), Math.round((coverH - dh) / 2), dw, dh)
    return { canvas: cover, fontsOk }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

async function drawCover(key) {
  const tpl = templateByKey(key)
  if (!tpl) throw new Error(`모르는 템플릿: ${key}`)
  const { canvas } = await drawCoverCanvas(tpl, COVER_WIDTH)
  try {
    return { cover: await toUrl(canvas) }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

/** 한 번에 하나씩 그리고 key별로 캐시 (실패한 것은 캐시에서 빼서 다음에 다시) */
function queued(key, store, finished, fn, what) {
  if (store.has(key)) return store.get(key)
  const p = queue.then(() => fn(key))
  queue = p.catch(() => {}) // 앞 것이 실패해도 다음 것은 그린다
  const out = p.then(v => { finished.set(key, v); return v }, e => {
    store.delete(key)
    console.error(`[studioTemplateThumbs] ${what}을 만들지 못함:`, key, e)
    throw e
  })
  store.set(key, out)
  return out
}

/**
 * 미리보기 칸용 템플릿 전체 그림 (캐시). @returns {Promise<{ full, width, height, sections, pageHeight }>} full = blob 주소
 * 실패하면 reject — 부르는 쪽이 자리표시 + [다시 시도]를 그린다
 */
export function templateThumb(key) {
  if (cache.has(key)) return cache.get(key)
  return queued(key, cache, done, draw, '템플릿 그림')
}

/** 이미 그려 둔 그림 (없으면 null) — 화면이 다시 열릴 때 기다리지 않고 바로 쓰려고 */
export function templateThumbNow(key) { return done.get(key) ?? null }

/** 카드 표지 (첫 구간만·작은 그림, 캐시). @returns {Promise<{ cover }>} cover = blob 주소 */
export function templateCover(key) {
  return queued(key, coverCache, coverDone, drawCover, '템플릿 표지')
}

/** 이미 그려 둔 표지 (없으면 null) */
export function templateCoverNow(key) { return coverDone.get(key) ?? null }
