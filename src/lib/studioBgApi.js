/**
 * 배경 지우기 (17-1) 서버 호출 — 외부 AI(fal)는 서버(api/studio-upload.js)만 부른다. 키는 브라우저에 없다.
 *   bg_status: 쓸 수 있는지 (자격·키·사용 기록 테이블) — 화면은 이 결과로 버튼을 잠근다 (자격 판단은 서버만)
 *   bg_remove: 원본의 마스크를 만들어 저장하고 경로를 돌려준다 (돈이 나가는 곳 — [배경 지우기]를 누를 때만 부른다)
 *   bg_refine_prepare·confirm (17-3): 손으로 다듬은 마스크 PNG 저장 — 외부 AI를 부르지 않는다 (돈 없음)
 */
import { supabase } from '@/lib/supabase'
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

/** @returns {Promise<{ ready: boolean, reason: null|'not_eligible'|'no_key'|'no_table'|'error', model?: string }>} */
export async function fetchBgStatus() {
  const r = await callStudioApi('studio-upload', { action: 'bg_status' })
  if (!r.ok) {
    console.error('[studioBgApi] 배경 지우기 상태 확인 실패:', r.code)
    return { ready: false, reason: 'error', message: studioErrorMessage('bg', r.code) }
  }
  return r.data
}

/**
 * 다듬은 마스크 PNG 저장 (17-3 [경계 다듬기] — 브라우저에서 만든 파일, 외부 AI·돈 없음). AI 조각 저장(studioAiPatch)과 같은 2단계:
 *   bg_refine_prepare(1회용 토큰, 경로는 서버가 만든다) → uploadToSignedUrl → bg_refine_confirm(서버가 PNG·크기 검사)
 *   같은 내용(같은 key)이 이미 있으면(exists) 업로드는 건너뛰고 confirm만 한다.
 * @returns {Promise<{ path, key, w, h }>} edit.bg.refined에 넣을 값. 실패는 throw (message = 고객 문구, code)
 */
export async function uploadBgRefined({ projectId, imageId, key, blob, width, height }) {
  const fail = (code, detail) => {
    console.error('[studioBgApi] 다듬은 마스크 저장 실패:', imageId, code, detail || '')
    const e = new Error(studioErrorMessage('bg', code))
    e.code = code
    return e
  }
  const prep = await callStudioApi('studio-upload', { action: 'bg_refine_prepare', projectId, imageId, key, width, height, size: blob.size })
  if (!prep.ok) throw fail(prep.code)
  const { path, token, exists } = prep.data
  if (!exists) {
    const { error } = await supabase.storage.from('studio').uploadToSignedUrl(path, token, blob, { contentType: 'image/png' })
    if (error) throw fail('upload_failed', error.message)
  }
  const conf = await callStudioApi('studio-upload', { action: 'bg_refine_confirm', projectId, imageId, path })
  if (!conf.ok) throw fail(conf.code)
  return { path, key, w: width, h: height }
}

/** @returns {Promise<{ path, key, model, width, height, reused }>} 실패는 throw (message = 고객 문구, code) */
export async function requestBgRemove(projectId, imageId) {
  const r = await callStudioApi('studio-upload', { action: 'bg_remove', projectId, imageId })
  if (!r.ok) {
    console.error('[studioBgApi] 배경 지우기 실패:', imageId, r.code)
    const e = new Error(studioErrorMessage('bg', r.code))
    e.code = r.code
    throw e
  }
  return r.data
}
