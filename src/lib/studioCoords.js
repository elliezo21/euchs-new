/**
 * 스튜디오 편집기 좌표 — 순수 함수 (DOM·Fabric 의존 없음, node 테스트: scripts/test-studio-coords.mjs)
 *
 * 좌표계는 둘뿐이다.
 *   - 원본 좌표(image): 원본 이미지 픽셀. Fabric 객체의 left/top/width/height도 이 좌표계다.
 *   - 화면 좌표(screen): 캔버스 요소 왼쪽 위 기준 CSS px.
 * 둘 사이는 뷰포트 변환 vpt = [zoom, 0, 0, zoom, tx, ty] 하나로만 오간다 (회전·기울기 없음).
 *   screen = image * zoom + t,   image = (screen - t) / zoom
 */

export const ZOOM_MIN = 0.05
export const ZOOM_MAX = 4
export const MIN_RECT = 4       // 영역 최소 크기(원본 px)
export const VIEW_MARGIN = 40   // 화면 맞춤 여백(화면 px)
export const CLICK_SLOP = 4     // 이보다 적게 끌면 드래그가 아니라 클릭(화면 px)

export function clampZoom(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

export function screenToImage(p, vpt) {
  return { x: (p.x - vpt[4]) / vpt[0], y: (p.y - vpt[5]) / vpt[3] }
}

export function imageToScreen(p, vpt) {
  return { x: p.x * vpt[0] + vpt[4], y: p.y * vpt[3] + vpt[5] }
}

/** 원본 좌표 사각형 → 화면 좌표 사각형 (떠 있는 도구줄 위치용) */
export function rectToScreen(r, vpt) {
  const a = imageToScreen({ x: r.x, y: r.y }, vpt)
  return { x: a.x, y: a.y, w: r.w * vpt[0], h: r.h * vpt[3] }
}

/**
 * 사각형을 저장 가능한 모양으로: 네 변을 각각 반올림 → 방향 정리(역방향 드래그) → 이미지 안으로 clamp → 최소 크기 보정.
 * 최소 크기 보정은 이미지 안에서만 늘린다 (끝에 붙어 있으면 반대쪽으로). 이미지 자체가 min보다 작으면 이미지 크기.
 * @returns {{x,y,w,h}} 정수
 */
export function normalizeRect(r, W, H, min = MIN_RECT) {
  let x0 = Math.round(r.x), x1 = Math.round(r.x + r.w)
  let y0 = Math.round(r.y), y1 = Math.round(r.y + r.h)
  if (x1 < x0) [x0, x1] = [x1, x0]
  if (y1 < y0) [y0, y1] = [y1, y0]
  ;[x0, x1] = fitSpan(x0, x1, W, min)
  ;[y0, y1] = fitSpan(y0, y1, H, min)
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

function fitSpan(a, b, size, min) {
  a = Math.max(0, Math.min(size, a))
  b = Math.max(0, Math.min(size, b))
  const need = Math.min(min, size)
  if (b - a < need) {
    b = Math.min(size, a + need)
    a = Math.max(0, b - need)
  }
  return [a, b]
}

/** 드래그 시작·끝(원본 좌표) → 영역 */
export function rectFromDrag(p0, p1, W, H, min = MIN_RECT) {
  return normalizeRect({ x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y }, W, H, min)
}

/** 화면에서 거의 안 움직였으면 클릭으로 본다 */
export function isClick(s0, s1, slop = CLICK_SLOP) {
  return Math.abs(s1.x - s0.x) < slop && Math.abs(s1.y - s0.y) < slop
}

/** [선택] 도구에서 누른 뒤 뗄 때까지 이보다 적게 움직이면 "선택만" (화면 px) — 좌표를 바꾸지 않는다 */
export const SELECT_SLOP = 3

/** 누른 곳 → 뗀 곳(화면 좌표)이 SELECT_SLOP 미만이면 선택만 한 것 */
export function isSelectOnly(s0, s1, slop = SELECT_SLOP) {
  return Math.hypot(s1.x - s0.x, s1.y - s0.y) < slop
}

/**
 * 저장 직전 범위 맞춤: 0 ≤ x, x+w ≤ W (세로도 같음). 크기가 이미지보다 크면 이미지 크기로 줄인다.
 * @returns {{ rect: {x,y,w,h}, changed: boolean }}
 */
export function clampRectToImage(r, W, H) {
  const w = Math.max(1, Math.min(r.w, W)), h = Math.max(1, Math.min(r.h, H))
  const x = Math.max(0, Math.min(W - w, r.x)), y = Math.max(0, Math.min(H - h, r.y))
  const rect = { x, y, w, h }
  return { rect, changed: x !== r.x || y !== r.y || w !== r.w || h !== r.h }
}

/** 이동 중인 영역이 이미지 밖으로 나가지 않게 (크기는 그대로) */
export function clampRectPosition(r, W, H) {
  return {
    ...r,
    x: Math.max(0, Math.min(W - r.w, r.x)),
    y: Math.max(0, Math.min(H - r.h, r.y)),
  }
}

/** 사각형을 사방 pad만큼 넓혀 이미지 안으로 자른다 (정수 입력 가정) */
export function expandRect(r, pad, W, H) {
  const x0 = Math.max(0, r.x - pad), y0 = Math.max(0, r.y - pad)
  const x1 = Math.min(W, r.x + r.w + pad), y1 = Math.min(H, r.y + r.h + pad)
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** 세로로 긴 상세 이미지로 보는 기준 (높이/너비). 이보다 길면 너비 맞춤 + 위쪽부터 */
export const LONG_RATIO = 2.2

/**
 * 화면 맞춤: 좌우(짧은 이미지는 상하도) 여백 margin, 100%보다 키우지 않는다.
 * 긴 이미지(높이/너비 > LONG_RATIO)는 너비에만 맞추고 위쪽 여백 margin에서 시작한다 (휠로 아래로 스크롤).
 * @returns vpt
 */
export function fitView(W, H, cw, ch, margin = VIEW_MARGIN) {
  const zw = (cw - margin * 2) / W
  const zh = (ch - margin * 2) / H
  const long = H / W > LONG_RATIO
  const z = clampZoom(Math.min(1, long ? zw : Math.min(zw, zh)))
  // 세로가 화면보다 길면 clampPan은 현재 위치를 범위 안으로만 자르므로, 시작 위치를 위쪽 여백으로 준다
  return clampPan([z, 0, 0, z, 0, margin], W, H, cw, ch, margin, long ? 'start' : 'center')
}

/**
 * 이동 범위 제한: 이미지가 화면보다 작으면 가운데(또는 start면 위쪽 여백), 크면 이미지 끝이 여백 margin 안쪽으로 들어오지 않게.
 * @param {'center'|'start'} smallAlignY  세로가 화면보다 작을 때 정렬
 */
export function clampPan(vpt, W, H, cw, ch, margin = VIEW_MARGIN, smallAlignY = 'center') {
  const z = vpt[0]
  const tx = clampAxis(vpt[4], W * z, cw, margin, 'center')
  const ty = clampAxis(vpt[5], H * z, ch, margin, smallAlignY)
  return [z, 0, 0, z, tx, ty]
}

function clampAxis(t, size, view, margin, smallAlign) {
  if (size <= view - margin * 2) return smallAlign === 'start' ? margin : (view - size) / 2
  return Math.min(margin, Math.max(view - margin - size, t))
}

/** 화면 점 p를 고정한 채 배율을 바꾼다 (Ctrl+휠, 버튼) */
export function zoomAt(vpt, p, nextZoom) {
  const z = clampZoom(nextZoom)
  const img = screenToImage(p, vpt)
  return [z, 0, 0, z, p.x - img.x * z, p.y - img.y * z]
}
