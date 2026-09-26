/**
 * 진행 단계 표시줄 (6-3) — 순수 함수 (node 테스트: scripts/test-studio-steps.mjs)
 *   ① 사진 다듬기 → ② 페이지 꾸미기 → ③ 내보내기. 잠금이 아니라 안내 — 아무 단계로나 옮겨 갈 수 있다.
 * ★ 지금 단계는 브라우저에만 기억한다 (작업별 localStorage 키 studio-step:{projectId}). 없거나 읽을 수 없으면 ①.
 * ★ 문구는 쉬운 존댓말. 템플릿·글자가 생기면 ② 안내에 문구를 더한다. 내보내기가 생기면 ③의 soon을 뗀다.
 */

export const STUDIO_STEPS = [
  { no: 1, label: '사진 다듬기', panel: 'photo', guide: '지울 글자가 있는 사진을 골라 [지우기]를 누르세요. 필터로 색도 맞출 수 있어요.' },
  // ②의 panel: 8단계 전에는 [구간] 패널이 "곧 추가" 안내뿐이라 사진 목록([페이지에 넣기])을 둔다.
  // 8단계에서 [구간] 패널이 생기면 'section'으로 돌린다 (6-3 보완, 2026-09-26)
  { no: 2, label: '페이지 꾸미기', panel: 'photo', guide: '사진 순서와 자리를 정하세요. 필요 없는 사진은 페이지에서 빼세요.' },
  // 13-1 내보내기·13-2 미리보기가 생겨 soon을 뗐다 (2026-09-26)
  { no: 3, label: '내보내기', panel: null, guide: '[미리보기]로 받을 모습을 확인하고 [내보내기]로 이미지를 받아 판매처에 올리세요.' },
]
export const STEP_DEFAULT = 1

export function isStep(n) {
  return STUDIO_STEPS.some(s => s.no === n)
}

export function stepInfo(n) {
  return STUDIO_STEPS.find(s => s.no === n) || STUDIO_STEPS[0]
}

export function stepKey(projectId) {
  return `studio-step:${projectId}`
}

/** @param {Storage|null} storage  @returns {number} 기억한 단계 (없거나 이상하면 ①) */
export function readStep(storage, projectId) {
  if (!storage || !projectId) return STEP_DEFAULT
  try {
    const n = Number(storage.getItem(stepKey(projectId)))
    return isStep(n) ? n : STEP_DEFAULT
  } catch (e) {
    console.warn('[studioSteps] 단계 기억을 읽지 못함 (①로 시작):', e.message)
    return STEP_DEFAULT
  }
}

/** @returns {boolean} 기억했으면 true (사생활 보호 창 등에서 못 쓰면 false — 화면은 그대로 동작) */
export function writeStep(storage, projectId, n) {
  if (!storage || !projectId || !isStep(n)) return false
  try {
    storage.setItem(stepKey(projectId), String(n))
    return true
  } catch (e) {
    console.warn('[studioSteps] 단계 기억을 저장하지 못함:', e.message)
    return false
  }
}
