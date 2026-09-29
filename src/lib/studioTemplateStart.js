/**
 * 템플릿 갤러리 [이 템플릿으로 시작] — 고른 템플릿을 이 탭에 기억해 두었다가, 다음에 새로 만든 작업의 시작 화면에서 그 템플릿으로 시작한다.
 *
 * ★ 새 작업은 사진이 있어야 만들어진다 (1688 가져오기 studio-product · 내 사진 올리기 studio-upload prepare — 빈 작업을 만드는 길이 없다).
 *   그래서 갤러리는 작업을 직접 만들지 않고 [새로 만들기] 화면으로 보낸다. 사진을 불러와 편집기가 열리면
 *   시작 화면(page = null)일 때 기억한 템플릿을 적용한다(편집기 applyTemplate — [템플릿] 패널과 같은 길).
 * ★ 기억한 뒤에 만든 작업에만 쓴다 (created_at ≥ 고른 시각 - 여유). 예전 작업을 열었을 때 모르게 바뀌지 않게.
 *   30분이 지나면 잊는다. 한 번 쓰거나(적용) [취소]하면 지운다.
 * 저장소는 sessionStorage (이 탭만 — 보는 사람 화면 상태라 계정에 남기지 않는다). 부르는 쪽이 storage를 넘긴다 (node 테스트).
 */
export const PENDING_TEMPLATE_KEY = 'studio-pending-template'
export const PENDING_TTL_MS = 30 * 60 * 1000
const CLOCK_SLACK_MS = 60 * 1000 // 서버 시각(created_at)과 브라우저 시각 차이 여유

export function savePendingTemplate(storage, key, now = Date.now()) {
  if (!storage) return false
  try {
    storage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify({ key, at: now }))
    return true
  } catch (e) {
    console.error('[studioTemplateStart] 고른 템플릿을 기억하지 못함:', e.message)
    return false
  }
}

/** @returns {{ key, at } | null} 기억한 템플릿 (지난 것·이상한 값은 null) */
export function readPendingTemplate(storage, now = Date.now()) {
  if (!storage) return null
  let v = null
  try {
    v = JSON.parse(storage.getItem(PENDING_TEMPLATE_KEY) || 'null')
  } catch (e) {
    console.error('[studioTemplateStart] 기억한 템플릿을 읽지 못함:', e.message)
    return null
  }
  if (!v || typeof v.key !== 'string' || !Number.isFinite(v.at)) return null
  if (now - v.at > PENDING_TTL_MS || v.at - now > CLOCK_SLACK_MS) return null
  return { key: v.key, at: v.at }
}

export function clearPendingTemplate(storage) {
  if (!storage) return
  try {
    storage.removeItem(PENDING_TEMPLATE_KEY)
  } catch (e) {
    console.error('[studioTemplateStart] 기억한 템플릿을 지우지 못함:', e.message)
  }
}

/** 이 작업에 기억한 템플릿을 쓸지 — 고른 뒤에 만든 작업만 */
export function pendingFitsProject(pending, projectCreatedAt) {
  if (!pending) return false
  const t = new Date(projectCreatedAt).getTime()
  return Number.isFinite(t) && t >= pending.at - CLOCK_SLACK_MS
}
