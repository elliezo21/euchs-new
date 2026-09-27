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
