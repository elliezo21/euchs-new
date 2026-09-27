/**
 * 사용가이드 (14단계) — "다시 보지 않기"·자동 시작 판단. 순수 함수 (node 테스트: scripts/test-studio-guide.mjs)
 *
 * ★ "다시 보지 않기"는 브라우저에만 기억한다 (localStorage). DB에 칸을 새로 만들지 않는다
 *   (studio_settings에 가이드 칸이 없음 — 14단계 보고서). 편집기 가이드와 지우기 화면 가이드는 따로 기억한다.
 *   값 '1' = 다시 보지 않기. 없음 = 자동으로 띄움. 읽을 수 없으면(사생활 보호 창 등) 띄운다 — 가이드가 안 뜨는 것보다 뜨는 쪽이 안전.
 * ★ 자동 시작 = 다시 보지 않기가 아니고 · 이 화면을 연 뒤 아직 안 띄웠고 · 준비가 끝났고 · 가로막는 것(시작 화면·창)이 없을 때.
 */
// sectionAdd = 편집기 캔버스 위 안내 한 줄 "섹션 사이에 마우스를 올리면…" — 닫으면 다시 안 띄움 (가이드 "다시 보지 않기"와 같은 방식)
export const GUIDE_KEYS = { editor: 'studio-guide-hide:editor', erase: 'studio-guide-hide:erase', sectionAdd: 'studio-guide-hide:section-add' }

export function guideKey(kind) {
  return GUIDE_KEYS[kind] ?? null
}

/** @param {Storage|null} storage  @returns {boolean} 다시 보지 않기로 했는지 */
export function readGuideHidden(storage, kind) {
  const key = guideKey(kind)
  if (!storage || !key) return false
  try {
    return storage.getItem(key) === '1'
  } catch (e) {
    console.warn('[studioGuide] 다시 보지 않기 값을 읽지 못함 (가이드를 띄움):', e.message)
    return false
  }
}

/** @returns {boolean} 기억했으면 true (못 쓰는 환경이면 false — 이번 창에서만 적용) */
export function writeGuideHidden(storage, kind, hidden) {
  const key = guideKey(kind)
  if (!storage || !key) return false
  try {
    if (hidden) storage.setItem(key, '1')
    else storage.removeItem(key)
    return true
  } catch (e) {
    console.warn('[studioGuide] 다시 보지 않기 값을 저장하지 못함:', e.message)
    return false
  }
}

/**
 * 자동으로 띄울지 — 모두 true/false 값으로 받는다 (truthy 값을 믿지 않음)
 * @param {{ hidden: boolean, shown: boolean, ready: boolean, blocked: boolean }} s
 *   hidden = 다시 보지 않기 · shown = 이번에 이미 띄움 · ready = 화면 준비 끝 · blocked = 시작 화면·창·다른 가이드가 떠 있음
 */
export function shouldAutoStart({ hidden, shown, ready, blocked }) {
  return hidden === false && shown === false && ready === true && blocked === false
}

/** 화면에 실제로 있는 대상만 (SpotlightGuide는 넘겨받은 단계를 그대로 보여 주므로) */
export function visibleSteps(steps, exists) {
  return steps.filter(s => exists(s.target))
}

// ── 이 탭에서 이미 자동으로 띄웠는지 (검수 2묶음) ──
// 지우기 가이드는 같은 탭(창)에서 한 번 봤으면 "다시 보지 않기"를 안 눌렀어도 다시 자동으로 띄우지 않는다.
// 편집기 컴포넌트 안에만 기억하면 목록으로 나갔다 다시 들어올 때 잊어서 또 떴다 → sessionStorage(탭이 닫히면 사라짐)에 기억.
// 편집기 가이드는 예전 그대로(편집기를 열 때마다 — 빈도는 해성 결정 대기) — 이 기록을 쓰는 종류만 SESSION_ONCE에 둔다.
export const SESSION_ONCE = new Set(['erase'])
const SHOWN_PREFIX = 'studio-guide-shown:'

/** @param {Storage|null} storage sessionStorage  @returns {boolean} 이 탭에서 이미 자동으로 띄움 */
export function readGuideShown(storage, kind) {
  if (!storage || !SESSION_ONCE.has(kind)) return false
  try {
    return storage.getItem(SHOWN_PREFIX + kind) === '1'
  } catch (e) {
    console.warn('[studioGuide] 이 탭에서 띄웠는지 읽지 못함 (창 안에서만 기억):', e.message)
    return false
  }
}
/** @returns {boolean} 기억했으면 true */
export function writeGuideShown(storage, kind) {
  if (!storage || !SESSION_ONCE.has(kind)) return false
  try {
    storage.setItem(SHOWN_PREFIX + kind, '1')
    return true
  } catch (e) {
    console.warn('[studioGuide] 이 탭에서 띄운 것을 기억하지 못함 (창 안에서만 기억):', e.message)
    return false
  }
}
