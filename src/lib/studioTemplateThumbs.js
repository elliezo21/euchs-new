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
 */
import { renderPage, canvasToBlob } from './studioExport.js'
import { templateByKey, templatePreviewPage, templatePageHeight, templateFontList, templateSlotTypes, assignTemplateSamples, PREVIEW_PHOTO } from './studioTemplates.js'
import { createTextMeasure, loadFontsFor } from './studioFonts.js'
import { loadAssetImage, loadAssetManifest } from './studioAssetLoad.js'
import { pickSamples, sampleCategoryOf } from './studioSamples.js'

export const THUMB_WIDTH = 560           // 그림 폭 (px) — 카드·미리보기 칸이 줄여서 보여 준다
export const COVER_RATIO = 4 / 3         // 표지 = 3:4 칸 (첫 구간 전체를 줄여 넣는다 — 템플릿 첫 구간은 780×1040 = 3:4)
const PLACEHOLDER_BG = '#e8eaee'
const PLACEHOLDER_INK = '#c6ccd5'

const measure = createTextMeasure()
const cache = new Map() // key → Promise<{ full, cover, width, height, sections }>
const done = new Map()  // key → 다 그린 그림
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
    // 표지 = 첫 구간 전체를 3:4 칸에 줄여 넣는다 (윗부분만 자르지 않음 — 첫 구간이 3:4보다 길면 줄이고, 짧으면 위아래를 구간 배경색으로)
    const first = page.sections[0]
    const secH = Math.min(canvas.height, Math.round(first.height * scale))
    const coverH = Math.round(canvas.width * COVER_RATIO)
    const cover = deps.createCanvas(canvas.width, coverH)
    const g = cover.getContext('2d')
    g.fillStyle = typeof first.bg === 'string' ? first.bg : '#ffffff'
    g.fillRect(0, 0, canvas.width, coverH)
    const k = Math.min(1, coverH / secH)
    const dw = Math.round(canvas.width * k), dh = Math.round(secH * k)
    g.drawImage(canvas, 0, 0, canvas.width, secH, Math.round((canvas.width - dw) / 2), Math.round((coverH - dh) / 2), dw, dh)
    const [full, coverUrl] = await Promise.all([toUrl(canvas), toUrl(cover)])
    cover.width = 0
    cover.height = 0
    return { full, cover: coverUrl, width: canvas.width, height: canvas.height, sections: page.sections.length, pageHeight: templatePageHeight(page) }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

/**
 * 템플릿 그림 (캐시). @returns {Promise<{ full, cover, width, height, sections, pageHeight }>} full·cover = blob 주소
 * 실패하면 reject — 부르는 쪽이 자리표시 + [다시 시도]를 그린다
 */
export function templateThumb(key) {
  if (cache.has(key)) return cache.get(key)
  const p = queue.then(() => draw(key))
  queue = p.catch(() => {}) // 앞 것이 실패해도 다음 것은 그린다
  const out = p.then(v => { done.set(key, v); return v }, e => {
    cache.delete(key)
    console.error('[studioTemplateThumbs] 템플릿 그림을 만들지 못함:', key, e)
    throw e
  })
  cache.set(key, out)
  return out
}

/** 이미 그려 둔 그림 (없으면 null) — 화면이 다시 열릴 때 기다리지 않고 바로 쓰려고 */
export function templateThumbNow(key) { return done.get(key) ?? null }
