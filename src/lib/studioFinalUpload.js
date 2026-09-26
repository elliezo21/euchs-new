/**
 * 구운 사진(final JPG) 저장 — AI 결과 조각(studioAiPatch.uploadAiPatch)과 같은 2단계:
 *   final_prepare(1회용 토큰, 경로는 서버가 만든다) → uploadToSignedUrl → final_confirm(서버가 JPEG·크기·가로세로 검사 후
 *   studio_images.final_rendered_version 기록 — edit_version이 아직 그 버전일 때만)
 * 이미 같은 버전 파일이 있으면(exists) 업로드는 건너뛰고 confirm만 한다 (확인 안 된 채 남은 파일일 수 있으므로).
 * 실패는 throw — err.code는 서버·studioApi 코드 그대로 (자동 재시도 여부는 studioSaveGuard.nextRetryDelay가 정한다)
 */
import { supabase } from '@/lib/supabase'
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

function apiError(r) {
  const err = new Error(studioErrorMessage('upload', r.code))
  err.code = r.code
  return err
}

/**
 * @param {{ projectId, imageId, version: number, blob: Blob, width: number, height: number }} args
 * @returns {Promise<{ path: string, recorded: boolean }>} recorded=false: 올렸지만 그 사이 지우기가 바뀌어 최신으로 기록되지 않음
 */
export async function uploadFinal({ projectId, imageId, version, blob, width, height }) {
  const prep = await callStudioApi('studio-upload', { action: 'final_prepare', projectId, imageId, version, width, height, size: blob.size })
  if (!prep.ok) throw apiError(prep)
  const { path, token, exists } = prep.data
  if (!exists) {
    const { error } = await supabase.storage.from('studio').uploadToSignedUrl(path, token, blob, { contentType: 'image/jpeg' })
    if (error) {
      console.error('[studioFinalUpload] 구운 사진 업로드 실패:', path, error.message)
      const err = new Error(studioErrorMessage('upload', 'upload_failed'))
      err.code = 'upload_failed'
      throw err
    }
  }
  const conf = await callStudioApi('studio-upload', { action: 'final_confirm', projectId, imageId, version, path })
  if (!conf.ok) throw apiError(conf)
  return { path, recorded: conf.data.recorded === true }
}
