/**
 * 편집기 가운데 페이지 보기 — Ctrl+휠 확대·축소, 스페이스+끌기 화면 이동 (14단계). 순수 함수 (node 테스트: scripts/test-studio-view-nav.mjs)
 *
 * ★ 페이지는 DOM(방식 C)이라 지우기 화면(Fabric 뷰포트 — studioCoords.zoomAt)과 구조가 다르다.
 *   규칙은 지우기 화면과 같게 둔다: 휠 한 칸 배율 = 0.998^(deltaY), 마우스 아래 점이 제자리에 있게.
 * ★ 배율 범위 = 아래 확대 막대와 같은 범위: [맞춤]이 내려가는 가장 작은 값(fitZoom 20%) ~ 가장 큰 버튼(100%).
 * ★ 마우스 중심 확대: 바꾸기 전 페이지 네모(화면 좌표)에서 마우스 아래 페이지 점(u, v)을 잡고(zoomAnchor),
 *   바꾼 뒤 새 네모에서 그 점이 다시 마우스 아래 오도록 스크롤을 옮긴다(scrollFix). 가운데 정렬·여백이 바뀌어도 DOM 네모로 재니 맞는다.
 */
export const VIEW_ZOOM_MIN = 0.2 // studioPage.fitZoom의 최솟값과 같다
export const VIEW_ZOOM_MAX = 1   // 확대 막대 가장 큰 버튼(100%)
const WHEEL_BASE = 0.998         // 지우기 화면(StudioCanvas onWheel)과 같은 휠 배율

/** 배율을 범위 안으로 (숫자가 아니면 null) */
export function clampViewZoom(z) {
  if (!Number.isFinite(z)) return null
  return Math.min(VIEW_ZOOM_MAX, Math.max(VIEW_ZOOM_MIN, z))
}

/**
 * 휠 한 번 뒤 배율 — deltaY > 0(아래로 굴림) = 축소. deltaMode 1(줄)·2(쪽)도 px로 바꿔 계산
 * @param {number} pageHeight deltaMode 2일 때 한 쪽의 px
 */
export function wheelZoom(z, deltaY, deltaMode = 0, pageHeight = 800) {
  if (!Number.isFinite(z) || !Number.isFinite(deltaY)) return clampViewZoom(z)
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1
  return clampViewZoom(z * Math.pow(WHEEL_BASE, deltaY * unit))
}

/** 마우스 아래의 페이지 점 (페이지 px) — rect = 바꾸기 전 페이지 네모(getBoundingClientRect), z = 바꾸기 전 배율 */
export function zoomAnchor(rect, clientX, clientY, z) {
  return { u: (clientX - rect.left) / z, v: (clientY - rect.top) / z }
}

/**
 * 배율을 바꾼 뒤 스크롤을 얼마나 더 옮길지 — 새 네모에서 anchor 점이 (clientX, clientY)에 오게.
 * @returns {{ dx, dy }} scrollLeft·scrollTop에 더할 값
 */
export function scrollFix(anchor, newRect, clientX, clientY, z) {
  return { dx: newRect.left + anchor.u * z - clientX, dy: newRect.top + anchor.v * z - clientY }
}

/** 스페이스+끌기 — 마우스가 (dx, dy) 움직이면 화면이 같이 따라오게 스크롤을 반대로 */
export function panScroll(scroll, dx, dy) {
  return { left: scroll.left - dx, top: scroll.top - dy }
}

/** 확대 막대 표시 (정수 %) */
export function zoomPercent(z) {
  return Math.round(z * 100)
}

/** 글자를 치는 곳인지 (입력칸·글자 칸·편집 가능한 요소) — 키 모양만 보는 순수 함수 */
export function isTypingTarget(t) {
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || !!t.isContentEditable)
}
/**
 * 브라우저 "전체 선택"(Ctrl/Cmd+A)을 막을지 (검수 2묶음) — 편집기 화면에서는 입력칸 밖 Ctrl+A가 브라우저 기본 동작(페이지 글자 전체 선택)을
 * 하지 않게 한다. 시작 화면·가이드·창이 떠 있을 때 뒤 페이지 글자가 통째로 파랗게 골라지던 문제. 편집기 동작(보이는 구간 요소 고르기)은 따로 한다
 */
export function blocksBrowserSelectAll(e) {
  return !!e && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === 'KeyA' && !isTypingTarget(e.target)
}

// ── 페이지 칸 안에서만 스크롤 (검수 2묶음) ──
// scrollIntoView는 바깥 칸(사이트 틀·overflow hidden)까지 움직일 수 있고, 멀리 부드럽게 날아가면 사진이 줄줄이 지나가
// "새로고침된 것처럼" 보였다(17-1 크롬 확인 — 미니뷰 누르기). 페이지 스크롤 칸의 scrollTop만 바꾸고, 멀면 바로 옮긴다.
export const SCROLL_SMOOTH_MAX = 2 // 화면 높이의 이 배수보다 멀면 부드럽게 말고 바로
export const SCROLL_MARGIN = 16

/**
 * @param {{ elTop: number, elHeight: number, scrollTop: number, viewHeight: number, block: 'start'|'nearest', margin?: number }} a
 *   elTop = 스크롤 칸 내용 맨 위에서 요소 위까지(px), viewHeight = 스크롤 칸 보이는 높이
 * @returns {{ top: number, behavior: 'smooth'|'auto' } | null}  null = 이미 보임(nearest) — 움직이지 않음
 */
export function scrollPlan({ elTop, elHeight, scrollTop, viewHeight, block = 'nearest', margin = SCROLL_MARGIN }) {
  let top
  if (block === 'start') top = elTop - margin
  else if (elTop >= scrollTop && elTop + elHeight <= scrollTop + viewHeight) return null
  else if (elTop < scrollTop || elHeight > viewHeight) top = elTop - margin
  else top = elTop + elHeight - viewHeight + margin
  top = Math.max(0, Math.round(top))
  if (top === Math.round(scrollTop)) return null
  return { top, behavior: Math.abs(top - scrollTop) > viewHeight * SCROLL_SMOOTH_MAX ? 'auto' : 'smooth' }
}
