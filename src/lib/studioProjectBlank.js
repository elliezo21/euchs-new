/**
 * 사진 없이 빈 작업 만들기 — 템플릿 갤러리 [이 템플릿으로 시작] 전용 (서버 api/studio-upload.js project_blank).
 * 만든 작업은 편집기 ?template=<key>로 연다 → 시작 화면 대신 그 템플릿을 바로 적용(사진 자리 = 예시 사진). 사진은 나중에 올린다.
 * 다른 길(시작 화면 [빈 페이지에서 시작]·[템플릿으로 시작])의 "사진 0장이면 막음" 규칙은 그대로다.
 */
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

/** @returns {Promise<{ projectId: string }>} 실패하면 고객 문구로 throw */
export async function createBlankProject(title) {
  const r = await callStudioApi('studio-upload', { action: 'project_blank', title })
  if (!r.ok) {
    console.error('[studioProjectBlank] 빈 작업 만들기 실패:', r.code)
    throw new Error(studioErrorMessage('upload', r.code))
  }
  return r.data
}
