/**
 * 편집기 ↔ AI 결과 조각 PNG (Storage studio 버킷) — 1-6b-3b
 *
 * ★ AI(LaMa) 결과는 기기(WebGPU/WASM·GPU 종류)마다 조금씩 달라, 결과 조각을 PNG로 저장해 두고 다시 열 때 그대로 쓴다.
 *   경로: {uid}/{projectId}/patches/{imageId}/{layerId}_{key}.png — 서버(api/studio-upload patch_prepare)가 만든다.
 * ★ 저장: canvas → PNG → patch_prepare(1회용 토큰) → uploadToSignedUrl → patch_confirm(서버가 PNG·크기 검사).
 *   이미 있는 경로(exists)면 업로드는 건너뛰고 confirm만 한다(확인 안 된 채 남은 파일일 수 있으므로).
 * ★ 불러오기: 서명 URL + crossOrigin='anonymous' (studioImageCache와 같은 방식) → 캔버스로 그려 픽셀까지 꺼낸다
 *   (뒤 레이어 계산 때 이 조각을 덮어써야 하므로).
 */
import { supabase } from '@/lib/supabase'
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'
import { signViewUrl } from '@/lib/studioProjects'
import { loadElement } from '@/lib/studioImageCache'

const MODEL_SHA256 = import.meta.env.VITE_STUDIO_AI_MODEL_SHA256
/** 결과 key·ai.model에 들어가는 모델 이름 — 모델 파일이 바뀌면 key가 달라져 다시 계산된다. 설정이 없으면 null */
export const AI_MODEL_ID = /^[0-9a-f]{64}$/i.test(String(MODEL_SHA256 || '')) ? `lama_fp32@${MODEL_SHA256.slice(0, 8).toLowerCase()}` : null
export const PATCH_MAX_BYTES = 20 * 1024 * 1024 // 버킷 file_size_limit 20971520·서버 api/studio-upload.js와 같은 값

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG로 바꾸지 못했어요'))), 'image/png')
  })
}

function apiError(r) {
  const err = new Error(studioErrorMessage('upload', r.code))
  err.code = r.code
  return err
}

/**
 * 결과 조각 저장. 실패는 throw (호출한 쪽이 사유를 화면에 보인다).
 * @returns {Promise<string>} 저장된 경로
 */
export async function uploadAiPatch({ projectId, imageId, layerId, key, canvas }) {
  const blob = await canvasToPng(canvas)
  if (blob.size > PATCH_MAX_BYTES) {
    const err = new Error(studioErrorMessage('upload', 'patch_too_large'))
    err.code = 'patch_too_large'
    throw err
  }
  const prep = await callStudioApi('studio-upload', {
    action: 'patch_prepare', projectId, imageId, layerId, key, width: canvas.width, height: canvas.height, size: blob.size,
  })
  if (!prep.ok) throw apiError(prep)
  const { path, token, exists } = prep.data
  if (!exists) {
    const { error } = await supabase.storage.from('studio').uploadToSignedUrl(path, token, blob, { contentType: 'image/png' })
    if (error) {
      console.error('[studioAiPatch] 조각 업로드 실패:', path, error.message)
      const err = new Error(studioErrorMessage('upload', 'upload_failed'))
      err.code = 'upload_failed'
      throw err
    }
  }
  const conf = await callStudioApi('studio-upload', { action: 'patch_confirm', projectId, imageId, path })
  if (!conf.ok) throw apiError(conf)
  return path
}

/**
 * 저장된 조각 불러오기 → { canvas, data:{data,width,height} }. 크기가 기대와 다르면 throw.
 * @param {{ path, w, h }} patch  레이어의 ai.patch
 */
export async function loadAiPatch(patch) {
  const { url } = await signViewUrl(patch.path)
  const el = await loadElement(url)
  if (el.naturalWidth !== patch.w || el.naturalHeight !== patch.h) {
    throw new Error(`저장된 결과 크기가 달라요 (${el.naturalWidth}×${el.naturalHeight}, 기대 ${patch.w}×${patch.h})`)
  }
  const c = document.createElement('canvas')
  c.width = patch.w
  c.height = patch.h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(el, 0, 0)
  const id = ctx.getImageData(0, 0, patch.w, patch.h) // 오염 시 SecurityError — 호출한 쪽에서 사유를 보여준다
  return { canvas: c, data: { data: id.data, width: patch.w, height: patch.h } }
}
