/**
 * 작업 복사본 (16단계) — 서버가 만든다: 브라우저는 작업·사진 행을 새로 넣을 수 없고(INSERT 권한 없음)
 * 원본 사진·AI 결과 조각 폴더(orig/·patches/)에 쓸 수 없다 → api/studio-upload.js project_copy.
 * 서버에 저장된 내용 기준으로 복사하므로, 편집기에서는 저장이 끝난 뒤 부른다.
 */
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

/** @returns {Promise<{ projectId: string, title: string, images: number, files: number, missing: number }>} */
export async function copyProject(projectId) {
  const r = await callStudioApi('studio-upload', { action: 'project_copy', projectId })
  if (!r.ok) {
    console.error('[studioProjectCopy] 복사본 만들기 실패:', projectId, r.code)
    throw new Error(studioErrorMessage('copy', r.code))
  }
  return r.data
}
