/**
 * 지운 사진 굽기 (5단계) — "원본 + 지우기 결과"를 원본 크기 JPG(품질 95)로 만들어 Storage final/에 저장한다.
 *
 * ★ 합성은 studioViewImage.composeErased 하나만 쓴다 (페이지 화면용 사진과 같은 함수 — 크기만 다르다).
 *   composeErased는 지우기 화면(StudioCanvas)과 같은 계산 함수(fillPlan·computeFillPatch·aiPatchKey·loadAiPatch)를 같은 순서로 부른다.
 *   12-2 덮기도 같은 layers 배열 안에 있어 쌓인 순서대로 함께 구워진다 (pixelLayersOf).
 * ★ 결과 없는 AI 레이어(aiMissing: 결과 조각 없음 / aiStale: 영역이 바뀌어 맞지 않음)가 있으면 굽지 않는다 — 그 자리가 원본으로 구워지므로.
 * ★ 투명한 원본(PNG·WebP 올리기 가능)은 흰 바탕 위에 굽는다 (JPG는 투명이 없어 그대로 두면 검게 된다).
 * ★ 품질·크기를 몰래 낮추지 않는다: 20MB(버킷 한도)를 넘으면 final_too_large로 실패한다.
 * ★ 원본이 브라우저 캔버스 한도(16384px·1677만 픽셀 — iOS Safari 기준, 올리기 검사와 같은 값)를 넘으면 굽지 않는다.
 */
import { signViewUrl } from '@/lib/studioProjects'
import { loadElement } from '@/lib/studioImageCache'
import { composeErased } from '@/lib/studioViewImage'
import { pixelLayersOf } from '@/lib/studioEdit'
import { uploadFinal } from '@/lib/studioFinalUpload'
import { studioErrorMessage } from '@/lib/studioApi'

export const FINAL_TYPE = 'image/jpeg'
export const FINAL_QUALITY = 0.95                 // 해성 결정 (2026-09-25 결정 4)
export const FINAL_MAX_BYTES = 20 * 1024 * 1024   // 버킷 file_size_limit 20971520 · 서버 api/studio-upload.js와 같은 값
export const FINAL_BACKGROUND = '#ffffff'
export const CANVAS_MAX_SIDE = 16384              // api/studio-upload.js MAX_SIDE와 같은 값
export const CANVAS_MAX_PIXELS = 16777216         // api/studio-upload.js MAX_PIXELS와 같은 값

function codedError(code, message) {
  const e = new Error(message || studioErrorMessage('upload', code))
  e.code = code
  return e
}

function toJpeg(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, FINAL_TYPE, FINAL_QUALITY))
}

/**
 * 계산 부분 (네트워크 없음): 원본 요소 + 레이어 → 원본 크기 JPG
 * @returns {Promise<{ blob, width, height } | { blocked: 'ai', aiMissing, aiStale } | { skipped: 'no_fills' }>}
 */
export async function renderFinalBlob(imgEl, layers) {
  const W = imgEl.naturalWidth, H = imgEl.naturalHeight
  if (W > CANVAS_MAX_SIDE || H > CANVAS_MAX_SIDE || W * H > CANVAS_MAX_PIXELS) {
    console.error('[studioBake] 브라우저 캔버스 한도를 넘는 사진 — 굽지 않음:', W, H)
    throw codedError('final_canvas_too_big')
  }
  const { canvas, problems, aiMissing, aiStale } = await composeErased(imgEl, pixelLayersOf(layers || []), { background: FINAL_BACKGROUND })
  if (aiMissing.length || aiStale.length) return { blocked: 'ai', aiMissing, aiStale }
  if (problems.length) throw codedError('final_compose', `지운 결과를 합치지 못했어요 (${problems[0]}). [다시 시도]를 눌러 주세요.`)
  if (!canvas) return { skipped: 'no_fills' }
  const blob = await toJpeg(canvas)
  canvas.width = 0; canvas.height = 0 // 원본 크기 캔버스 메모리를 바로 돌려준다
  if (!blob) throw codedError('final_encode_failed')
  if (blob.size > FINAL_MAX_BYTES) {
    console.error('[studioBake] 구운 사진이 20MB를 넘음 — 품질을 낮추지 않고 멈춤:', W, H, blob.size)
    throw codedError('final_too_large')
  }
  return { blob, width: W, height: H }
}

/**
 * 사진 한 장 굽기 → 저장
 * @param {object} row studio_images 행 (id, project_id, original_path)
 * @param {object[]} layers 그 버전의 레이어 (저장이 끝난 edit)
 * @param {number} version 그 edit_version — 서버가 이 값이 지금 값일 때만 받고, 최신으로 기록한다
 * @param {{ isCurrent?: () => boolean }} opts 더 새 요청이 오면 false → 중간에 그만둔다 (옛 결과가 최신을 덮지 않게)
 * @returns {Promise<{ path, recorded, bytes, width, height } | { superseded: true } | { blocked } | { skipped }>}
 */
export async function bakeImage(row, layers, version, { isCurrent = () => true } = {}) {
  const { url } = await signViewUrl(row.original_path)
  const imgEl = await loadElement(url)
  if (!isCurrent()) return { superseded: true }
  const out = await renderFinalBlob(imgEl, layers)
  if (out.blocked || out.skipped) return out
  if (!isCurrent()) return { superseded: true }
  const r = await uploadFinal({ projectId: row.project_id, imageId: row.id, version, blob: out.blob, width: out.width, height: out.height })
  return { ...r, bytes: out.blob.size, width: out.width, height: out.height }
}
