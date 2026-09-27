/**
 * 캔버스 위 조작 (요소 도구줄·섹션 도구줄·섹션 사이 추가·미니뷰 끌기·[요소] 종류) — 순수 함수 (node 테스트: scripts/test-studio-canvas-ui.mjs)
 *
 * ★ 새 동작을 만들지 않는다. 버튼은 전부 편집기의 기존 runCommand 이름으로 보낸다 (되돌리기·자동 저장이 예전 길 그대로).
 *   요소 도구줄 = duplicate · lock/unlock · hide/show · order(forward/backward) · delete
 *   섹션 도구줄 = sectionMove(±1) · sectionDuplicate · sectionDelete
 *   섹션 사이 추가 = sectionAdd(위/아래 — 우클릭 메뉴·예전 [구간] 패널과 같은 명령)
 *   미니뷰 끌기 = reorderSections (예전 [순서 변경] 화면과 같은 함수·같은 이력 "섹션 순서 변경")
 * ★ 좌표: 도구줄 자리는 페이지 요소(data-page) 기준 화면 px. view = 지금 스크롤 칸에 보이는 영역(같은 기준).
 */
import { moveInOrder } from './studioPage.js'

// ── [요소] 탭 종류 ──
export const ELEMENT_TABS = [
  { key: 'shape', label: '도형' },   // 도형 + 선·화살표
  { key: 'badge', label: '배지' },
  { key: 'table', label: '사이즈표' },
]
/** 기억한 종류가 없거나 모르는 값이면 첫 종류 */
export function elementTabOf(key) {
  return ELEMENT_TABS.some(t => t.key === key) ? key : ELEMENT_TABS[0].key
}

// ── 요소 도구줄 ──
/**
 * 버튼 목록 (왼쪽부터). 잠김·숨김 상태에 따라 이름·명령이 바뀐다.
 * @param {{ anyLocked: boolean, allLocked: boolean, anyHidden: boolean }} s
 * @returns {{ key, label, tip, cmd, args?, disabled?, danger? }[]}  cmd = 편집기 runCommand 이름 (more = 팝오버 열기)
 */
export function itemBarButtons({ anyLocked, allLocked, anyHidden }) {
  return [
    { key: 'duplicate', label: '복제', tip: '똑같은 것 하나 더 만들기 (Ctrl+D)', cmd: 'duplicate' },
    anyLocked
      ? { key: 'lock', label: '잠금 풀기', tip: '잠금을 풀어 다시 움직일 수 있게', cmd: 'unlock', pressed: true }
      : { key: 'lock', label: '잠금', tip: '실수로 움직이지 않게 고정', cmd: 'lock' },
    anyHidden
      ? { key: 'hide', label: '보이기', tip: '숨긴 것을 다시 보이게 (내보내기에도 들어감)', cmd: 'show', pressed: true }
      : { key: 'hide', label: '숨기기', tip: '지우지 않고 잠깐 안 보이게 (내보내기에서도 빠짐)', cmd: 'hide' },
    { key: 'forward', label: '앞으로', tip: '다른 요소보다 위로', cmd: 'order', args: { where: 'forward' } },
    { key: 'backward', label: '뒤로', tip: '다른 요소보다 아래로', cmd: 'order', args: { where: 'backward' } },
    { key: 'delete', label: '삭제', tip: '삭제 (Delete)', cmd: 'delete', danger: true, disabled: allLocked },
    { key: 'more', label: '', tip: '위치·크기·회전·정렬 더 보기', cmd: 'more' },
  ]
}

/**
 * 떠 있는 막대 자리 — 대상 위쪽(공간이 없으면 아래쪽), 가로 가운데. 보이는 영역(view) 밖으로 나가지 않는다.
 * @param {{ box: {x,y,w,h}, bar: {w,h}, view: {x,y,w,h}, above?: number, below?: number, margin?: number }} o
 *   above = 대상 위쪽에서 비울 거리(회전 손잡이·표 안내 자리), below = 아래쪽에서 비울 거리(손잡이·[+ 줄])
 * @returns {{ left: number, top: number, side: 'above'|'below'|'inside' }} inside = 위아래 모두 모자람(아주 큰 요소) → 보이는 영역 위쪽
 */
export function floatBarPosition({ box, bar, view, above = 48, below = 16, margin = 8 }) {
  const upTop = box.y - above - bar.h
  const downTop = box.y + box.h + below
  let side = 'above'
  let top = upTop
  if (upTop < view.y + margin) {
    // 위가 모자라면 아래. 아래도 화면 밖이면(아주 큰 요소) 보이는 영역 위쪽 안에 붙인다
    if (downTop + bar.h <= view.y + view.h - margin) { side = 'below'; top = downTop }
    else { side = 'inside'; top = view.y + margin }
  }
  const minL = view.x + margin, maxL = view.x + view.w - margin - bar.w
  const left = Math.max(minL, Math.min(maxL, box.x + box.w / 2 - bar.w / 2))
  return { left: Math.round(maxL < minL ? minL : left), top: Math.round(top), side }
}

/** 여러 상자를 감싸는 상자 (여러 개·그룹을 골랐을 때 도구줄 자리) */
export function unionBox(list) {
  if (!list.length) return null
  const x0 = Math.min(...list.map(b => b.x)), y0 = Math.min(...list.map(b => b.y))
  const x1 = Math.max(...list.map(b => b.x + b.w)), y1 = Math.max(...list.map(b => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

// ── 섹션 도구줄 ──
/** @param {{ index: number, count: number, full: boolean }} s  @returns 버튼 목록 (cmd = runCommand 이름) */
export function sectionBarButtons({ index, count, full }) {
  return [
    { key: 'up', label: '위로', tip: '이 섹션을 한 칸 위로', cmd: 'sectionMove', args: { by: -1 }, disabled: index <= 0 },
    { key: 'down', label: '아래로', tip: '이 섹션을 한 칸 아래로', cmd: 'sectionMove', args: { by: 1 }, disabled: index >= count - 1 },
    { key: 'duplicate', label: '복제', tip: '똑같은 섹션 하나 더 만들기 (바로 아래에)', cmd: 'sectionDuplicate', disabled: full },
    { key: 'delete', label: '삭제', tip: '섹션 삭제 (사진은 [사진] 목록에 남아요 · Ctrl+Z로 되돌리기)', cmd: 'sectionDelete', danger: true },
  ]
}

// ── 섹션 사이 추가 ──
/**
 * 섹션 사이(맨 위·맨 아래 포함) 자리 — at = 새 섹션이 들어갈 번호(0 = 맨 위), y = 페이지 좌표(사이 간격이면 그 가운데)
 * @param {{ rows: {id, top, height}[], total: number }} layout studioPage.layoutSections 결과
 */
export function sectionGapSlots(layout) {
  const rows = layout.rows
  if (!rows.length) return []
  const out = [{ at: 0, y: 0 }]
  for (let i = 1; i < rows.length; i++) {
    const prevEnd = rows[i - 1].top + rows[i - 1].height
    out.push({ at: i, y: (prevEnd + rows[i].top) / 2 })
  }
  out.push({ at: rows.length, y: layout.total })
  return out
}
/**
 * at 자리에 넣는 기존 명령 인자 — 우클릭 "위에/아래에 섹션 추가"와 같은 sectionAdd
 * @returns {{ where: 'above'|'below'|'end', sectionId: string|null } | null}
 */
export function sectionAddArgs(sectionIds, at) {
  if (!Number.isInteger(at) || at < 0 || at > sectionIds.length) return null
  if (sectionIds.length === 0) return { where: 'end', sectionId: null }
  if (at === 0) return { where: 'above', sectionId: sectionIds[0] }
  return { where: 'below', sectionId: sectionIds[at - 1] }
}

// ── 미니뷰 끌어서 순서 바꾸기 ──
/**
 * 끄는 중 놓일 자리 (카드 사이 번호 0~n) — 카드 가운데보다 위면 그 카드 앞
 * @param {{ top: number, height: number }[]} cards 위에서부터
 */
export function insertIndexFromY(cards, y) {
  for (let i = 0; i < cards.length; i++) if (y < cards[i].top + cards[i].height / 2) return i
  return cards.length
}
/** 끈 섹션을 insertIndex(카드 사이 번호)에 놓은 뒤의 순서. 제자리면 입력 그대로 */
export function orderAfterDrop(ids, draggedId, insertIndex) {
  const from = ids.indexOf(draggedId)
  if (from < 0 || !Number.isInteger(insertIndex)) return ids
  const to = insertIndex > from ? insertIndex - 1 : insertIndex
  return moveInOrder(ids, draggedId, to)
}

// ── 안내 한 줄 "섹션 사이에 마우스를 올리면…" — 사용가이드 "다시 보지 않기"와 같은 방식(studioGuide GUIDE_KEYS, localStorage '1') ──
export const SECTION_ADD_HINT = '섹션 사이에 마우스를 올리면 그 자리에 추가할 수 있어요'
