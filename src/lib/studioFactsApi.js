/**
 * 원클릭 글자 초안용 1688 상품 사실 (원클릭 1단계) — 서버 api/studio-upload.js product_facts
 * 서버는 저장된 상품 정보 + 번역 캐시만 읽는다(외부 호출·과금 없음). 한국어가 없는 사실은 ko: null로 온다.
 */
import { callStudioApi, studioErrorMessage } from '@/lib/studioApi'

/** @returns {Promise<{ facts: object|null, reason: string|null, texts: number, translated: number }>} */
export async function fetchProductFacts(projectId) {
  const r = await callStudioApi('studio-upload', { action: 'product_facts', projectId })
  if (!r.ok) {
    console.error('[studioFactsApi] 상품 정보 읽기 실패:', projectId, r.code)
    throw new Error(studioErrorMessage('upload', r.code))
  }
  return r.data
}
