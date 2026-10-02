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

/**
 * 편집기 위쪽 상품 이름용 1688 제목 한글 (2026-10-02 ②-1) — 서버 title_ko(번역 캐시만). 없으면 ''
 * 표시용이다 — 못 받으면 console.error 뒤 '' (이름은 "이름 없는 상품"으로 보이고 편집은 그대로)
 * @returns {Promise<string>}
 */
export async function fetchProjectTitleKo(projectId) {
  const r = await callStudioApi('studio-upload', { action: 'title_ko', projectId })
  if (!r.ok) {
    console.error('[studioFactsApi] 상품 이름(한글) 읽기 실패 — "이름 없는 상품"으로 표시:', projectId, r.code)
    return ''
  }
  return typeof r.data?.titleKo === 'string' ? r.data.titleKo : ''
}
