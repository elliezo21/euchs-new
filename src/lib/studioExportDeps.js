/**
 * 상세 이미지 그리기 재료 (2026-10-02 — 편집기 StudioEditorView에서 옮김)
 *   편집기([다운로드]·미리보기·자르기 창)와 편집기 밖(뒤에서 만들기·보내기 직전 만들기 — studioProductImages.js)이 같은 함수로 그린다.
 *   사진 상태(지우기 레이어·필터·자르기·배경)는 부르는 쪽이 넘긴다 — 편집기 = 세션 값, 편집기 밖 = DB edit를 읽은 값.
 *
 * 사진 = 화면 작은 사진과 같은 규칙의 원본 크기: 완성 JPG를 쓸 수 있으면 그것(finalVersionOf), 아니면 원본 + 지우기 조각(composeErased)
 *   → 배경 마스크(17-1, applyBackground) → 띠 잘라내기 → 자르기(12-1, geometryOf). 필터·꾸미기는 엔진(studioExport)이.
 */
import { renderSection, renderPage, renderSlice, canvasToBlob, canvasToBlobUnder } from '@/lib/studioExport'
import { loadWithResign } from '@/lib/studioImageCache'
import { geometryOf, drawGeometry } from '@/lib/studioCrop'
import { loadAssetImage } from '@/lib/studioAssetLoad'
import { loadFontsFor } from '@/lib/studioFonts'
import { pixelLayersOf } from '@/lib/studioEdit'
import { finalPathOf, composeErased, applyBackground } from '@/lib/studioViewImage'
import { AI_MISSING_NOTE } from '@/lib/studioPreview'

/**
 * @param {{
 *   rowOf: (id) => object|undefined,          studio_images 행
 *   layersOf: (id) => object[],               지우기·덮기 레이어
 *   lookOf: (id) => object,                   필터·조정
 *   shapeOf: (id) => object,                  자르기·띠
 *   bgOf: (id) => object|null,                배경
 *   finalVersionOf: (row) => number|null,     완성 JPG를 쓸 수 있으면 그 버전
 *   urlPool, measure, where: string           where = 콘솔 이름
 * }} o
 */
export function createExportDeps({ rowOf, layersOf, lookOf, shapeOf, bgOf, finalVersionOf, urlPool, measure, where = 'studioExportDeps' }) {
  /** 지운 사진(원본 크기, 자르기·띠 전) — 내보내기와 자르기 창(12-1)·경계 다듬기·흰 배경 지우기가 같이 쓴다 */
  async function erasedSourceOf(imageId) {
    const row = rowOf(imageId)
    if (!row) throw new Error('이 작업에 없는 사진이에요')
    if (row.ingest_status !== 'done' || !row.original_path) throw new Error('아직 준비되지 않은 사진이에요')
    const f = finalVersionOf(row)
    if (f !== null) {
      const el = await loadWithResign(urlPool, finalPathOf(row, f))
      return { source: el, width: el.naturalWidth, height: el.naturalHeight, notes: [] }
    }
    const el = await loadWithResign(urlPool, row.original_path)
    const r = await composeErased(el, pixelLayersOf(layersOf(imageId) || []))
    const notes = [...r.problems]
    if (r.aiMissing.length || r.aiStale.length) notes.push(AI_MISSING_NOTE) // 미리보기·내보내기가 사진 수로 한 줄에 묶는다 (studioPreview.summarizeNotes)
    return { source: r.canvas || el, width: el.naturalWidth, height: el.naturalHeight, notes }
  }

  /**
   * 내보낼 사진 = 지운 사진 → 배경 마스크(17-1, 투명일 때 — 화면 작은 사진과 같은 applyBackground) → 띠 잘라내기 → 자르기
   * (12-1, studioCrop.geometryOf — 화면 작은 사진과 같은 함수). 필터·꾸미기는 엔진이. 투명한 곳은 엔진이 먼저 칠한 구간 배경색이 보인다
   */
  async function exportImageOf(imageId) {
    const erased = await erasedSourceOf(imageId)
    const masked = await applyBackground(urlPool, erased.source, erased.width, erased.height, bgOf(imageId))
    // 17-2 단색: 사진은 투명 그대로, 색(masked.color)은 엔진 drawPhoto가 사진 자리 아래에 칠한다 (필터는 사진에만)
    // 17-4 AI 배경: masked.under(원본 크기)를 사진과 같은 띠·자르기로 → bgSource (엔진 drawPhoto가 사진 아래에 그린다, 필터 없음)
    const src = masked.canvas
      ? { source: masked.canvas, width: erased.width, height: erased.height, notes: [...erased.notes, ...masked.problems], bgColor: masked.color, bgSource: masked.under }
      : { ...erased, notes: [...erased.notes, ...masked.problems] }
    const geo = geometryOf(src.width, src.height, shapeOf(imageId))
    if (geo.identity) return src
    const notes = geo.cropIgnored ? [...src.notes, '자르기 영역이 모두 잘라낸 띠 안이라 자르기를 쓰지 않았어요'] : src.notes
    const cut = source => {
      const c = document.createElement('canvas')
      c.width = geo.width
      c.height = geo.height
      drawGeometry(c.getContext('2d'), source, geo, 0, 0, geo.width, geo.height)
      return c
    }
    return { source: cut(src.source), width: geo.width, height: geo.height, notes, bgColor: src.bgColor ?? null, bgSource: src.bgSource ? cut(src.bgSource) : null }
  }

  const deps = {
    createCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c },
    Path2D: window.Path2D,
    getImage: exportImageOf,
    getAsset: loadAssetImage, // 에셋 이미지 (같은 사이트의 정적 파일 — 캔버스가 오염되지 않는다)
    lookOf,
    measure,
    async prepareFonts(list) {
      try {
        return await loadFontsFor(list)
      } catch (e) {
        console.error(`[${where}] 내보내기 글꼴 준비 실패:`, e)
        return false // 엔진이 "글꼴을 불러오지 못했어요" + [다시 시도]로 알린다
      }
    },
  }
  return { deps, erasedSourceOf, exportImageOf }
}

/**
 * 파일 하나(나눈 한 장 · 한 장으로 길게 · 섹션 하나) → { blob, notes }
 * @param cache 여러 장으로 나눌 때 다음 장에 걸친 섹션 그림 ({ entry:null } — 같은 페이지·배율일 때만 다시 씀)
 */
export async function renderExportFile(page, file, deps, { format, scale, onStep, cache }) {
  if (!page) throw new Error('페이지가 없어요')
  const out = file.range
    ? await renderSlice(page, file, deps, { scale, onStep, cache })
    : file.sectionIds.length === 1 && file.no !== null
      ? await renderSection(page, file.sectionIds[0], deps, { scale })
      : await renderPage(page, file.sectionIds, deps, { scale, onStep })
  try {
    // 나눈 한 장(JPG)은 3MB 이하로 (품질을 낮춰 다시 — studioExport.canvasToBlobUnder). 한 장으로 길게·미리보기는 예전 그대로
    const blob = file.range ? (await canvasToBlobUnder(out.canvas, format)).blob : await canvasToBlob(out.canvas, format)
    return { blob, notes: out.notes }
  } finally {
    out.canvas.width = 0 // 큰 캔버스 메모리를 바로 돌려준다
    out.canvas.height = 0
  }
}
