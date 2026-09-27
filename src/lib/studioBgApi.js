/**
 * 배경 지우기 (17-1) 서버 호출 — 외부 AI(fal)는 서버(api/studio-upload.js)만 부른다. 키는 브라우저에 없다.
 *   bg_status: 쓸 수 있는지 (자격·키·사용 기록 테이블) — 화면은 이 결과로 버튼을 잠근다 (자격 판단은 서버만)
 *   bg_remove: 원본의 마스크를 만들어 저장하고 경로를 돌려준다 (돈이 나가는 곳 — [배경 지우기]를 누를 때만 부른다)
 */
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
