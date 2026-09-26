/**
 * 시작 화면 ⓪ (16단계) — 띄울지 판단하는 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-start.mjs)
 *
 * ★ 띄우는 때 = DB의 page가 비어 있는(null) 작업을 열었을 때만 — usePageSession.isDefault
 *   (page가 null이면 편집기는 기본 배치 buildInitialPage를 "보여주기만" 하고 저장하지 않는다 — 4단계 규칙).
 *   page가 한 번이라도 저장된 작업(구간이 0개인 문서 포함)은 절대 띄우지 않는다 — 기존 작업 보호.
 *   page 모양이 어긋나 읽지 못한 작업(readError)도 띄우지 않는다 (시작하면 그 page를 덮어쓰게 되므로).
 * ★ [직접 만들기] → [빈 페이지에서 시작] = 기본 배치를 그대로 저장 (usePageSession.startFromDefault — 새 배치 규칙을 만들지 않는다).
 *   저장이 끝나면 isDefault가 풀린다. 그 전에도 화면은 바로 닫는다(chosen).
 */

/**
 * @param {{ hasProject: boolean, isDefault: boolean, readError: string, chosen: boolean }} s
 * @returns {boolean}
 */
export function shouldShowStart({ hasProject, isDefault, readError, chosen }) {
  return !!hasProject && isDefault === true && !readError && !chosen
}

/** [빈 페이지에서 시작]을 누를 수 있는가 — 넣을 사진이 1장 이상 (없으면 빈 문서가 저장돼 나중에 올린 사진이 자동으로 들어가지 않는다) */
export function canStartBlank(usableCount) {
  return Number.isInteger(usableCount) && usableCount > 0
}
