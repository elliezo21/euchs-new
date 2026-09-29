/**
 * 배경 지우기 (17-1) 서버 호출 — 외부 AI(fal)는 서버(api/studio-upload.js)만 부른다. 키는 브라우저에 없다.
 *   bg_status: 쓸 수 있는지 (자격·키·사용 기록 테이블) — 화면은 이 결과로 버튼을 잠근다 (자격 판단은 서버만)
 *   bg_remove: 원본의 마스크를 만들어 저장하고 경로를 돌려준다 (돈이 나가는 곳 — [배경 지우기]를 누를 때만 부른다)
 *   bg_refine_prepare·confirm (17-3): 손으로 다듬은 마스크 PNG 저장 — 외부 AI를 부르지 않는다 (돈 없음)
 *   bg_local_prepare·confirm (2026-09-29): 흰 배경·단색 배경을 브라우저에서 지운 마스크 PNG 저장 — [배경 지우기] 기본 동작 (돈 없음)
 *   bg_remove는 [AI로 정밀하게 지우기]를 누를 때만
 */
import { supabase } from '@/lib/supabase'
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'
import { LOCAL_BG_MODEL } from '@/lib/studioBgLocal'

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
  const path = await uploadBrowserMask('bg_refine', '다듬은 마스크', { projectId, imageId, key, blob, width, height })
  return { path, key, w: width, h: height }
}

/**
 * 흰 배경·단색 배경 지우기 결과 저장 (브라우저에서 만든 마스크 — studioBgLocal, 외부 AI·돈 없음). 다듬기와 같은 2단계:
 *   bg_local_prepare → uploadToSignedUrl → bg_local_confirm. 경로는 AI 마스크와 같은 규칙(mask_{key}.png)
 * @returns {Promise<{ path, key, model: 'local', width, height }>} bg_remove 응답과 같은 모양 (studioBg.bgFromServer에 그대로)
 */
export async function uploadBgLocalMask({ projectId, imageId, key, blob, width, height }) {
  const path = await uploadBrowserMask('bg_local', '배경 지운 마스크', { projectId, imageId, key, blob, width, height })
  return { path, key, model: LOCAL_BG_MODEL, width, height }
}

/** 브라우저가 만든 마스크 PNG 올리기 (prepare → 업로드 → confirm). 실패는 throw (message = 고객 문구, code). @returns {Promise<string>} 저장 경로 */
async function uploadBrowserMask(actionPrefix, what, { projectId, imageId, key, blob, width, height }) {
  const fail = (code, detail) => {
    console.error(`[studioBgApi] ${what} 저장 실패:`, imageId, code, detail || '')
    const e = new Error(studioErrorMessage('bg', code))
    e.code = code
    return e
  }
  const prep = await callStudioApi('studio-upload', { action: `${actionPrefix}_prepare`, projectId, imageId, key, width, height, size: blob.size })
  if (!prep.ok) throw fail(prep.code)
  const { path, token, exists } = prep.data
  if (!exists) {
    const { error } = await supabase.storage.from('studio').uploadToSignedUrl(path, token, blob, { contentType: 'image/png' })
    if (error) throw fail('upload_failed', error.message)
  }
  const conf = await callStudioApi('studio-upload', { action: `${actionPrefix}_confirm`, projectId, imageId, path })
  if (!conf.ok) throw fail(conf.code)
  return path
}

/**
 * AI 배경 (17-4) 상태 — 쓸 수 있는지 + 오늘 남은 무료 횟수 (서버 값). 관리자·스태프는 left = null(1인 횟수 없음)
 * @returns {Promise<{ ready, reason, staff?, left?, perDay?, globalLeft?, message? }>}
 */
export async function fetchBgGenStatus() {
  const r = await callStudioApi('studio-upload', { action: 'bg_gen_status' })
  if (!r.ok) {
    console.error('[studioBgApi] AI 배경 상태 확인 실패:', r.code)
    return { ready: false, reason: 'error', message: studioErrorMessage('bg', r.code) }
  }
  return r.data
}

/**
 * AI 배경 만들기 (돈이 나가는 곳 — [만들기]를 누를 때만). 실패는 throw (message = 고객 문구, code) — 실패는 횟수에서 빠지지 않는다
 * @returns {Promise<{ path, key, w, h, preset, model, left }>}
 */
export async function requestBgGenerate(projectId, imageId, preset) {
  const r = await callStudioApi('studio-upload', { action: 'bg_generate', projectId, imageId, preset })
  if (!r.ok) {
    console.error('[studioBgApi] AI 배경 만들기 실패:', imageId, preset, r.code)
    const e = new Error(studioErrorMessage('bg', r.code))
    e.code = r.code
    throw e
  }
  return r.data
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
