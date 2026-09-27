/**
 * 캔버스 위 조작 (요소 도구줄·섹션 도구줄·섹션 사이 추가·미니뷰 끌기·[요소] 종류) — 순수 함수 (node 테스트: scripts/test-studio-canvas-ui.mjs)
 *
 * ★ 새 동작을 만들지 않는다. 버튼은 전부 편집기의 기존 runCommand 이름으로 보낸다 (되돌리기·자동 저장이 예전 길 그대로).
 *   가로 도구줄 = scale · rotation · opacity · order · align · rotate90/flip · duplicate · lock/unlock · hide/show · group/ungroup · delete/removeFromPage
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

// ── (예전) 요소 위 떠 있는 도구줄 — 화면에서는 안 씀. StudioItemToolbar.vue가 남아 있는 동안만 (지우기는 해성 확인 대기) ──
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

// ── 작업판 위 가로 도구줄 (고른 요소의 설정 — 예전 왼쪽 "고른 요소 설정" 칸과 떠 있는 도구줄을 합침) ──
// 버튼 종류: pop = 누르면 도구줄 아래로 펼침 칸(pop 이름) / cmd = 편집기 runCommand(cmd, args) / emit = 편집기 동작(사진 바꾸기·자르기 등) / hold = 누르고 있는 동안
export const SIZE_PCT = [5, 500]      // [크기] 슬라이더 (%, 비율 유지)
export const ROTATE_DEG = [-180, 180] // [회전] 슬라이더 (°)
/**
 * @param {{ kinds: Set<string>, photo: boolean, autoMark: object|null, anyLocked, allLocked, anyHidden, canGroup, canUngroup, headerRow: boolean|null, tableCount: number }} s
 *   kinds = 고른 요소 종류('image'|'text'|'shape'|'line'|'table'), photo = 사진 요소 하나만 골랐음
 * @returns {{ left: object[], right: object[] }}
 */
export function selectBarButtons(s) {
  const k = s.kinds
  const left = [
    { key: 'size', label: '크기', tip: '크기 (비율 유지)', type: 'pop', pop: 'size' },
    { key: 'rotate', label: '회전', tip: '회전 · 90° 돌리기 · 뒤집기', type: 'pop', pop: 'rotate', disabled: s.allLocked },
    { key: 'opacity', label: '불투명도', tip: '불투명도 (100% = 다 보임)', type: 'pop', pop: 'opacity' },
    { key: 'order', label: '앞뒤 순서', tip: '다른 요소보다 위로 / 아래로', type: 'pop', pop: 'order' },
    { key: 'align', label: '정렬', tip: '정렬 (한 개 = 섹션 기준, 여러 개 = 고른 요소끼리)', type: 'pop', pop: 'align', disabled: s.allLocked },
  ]
  if (s.photo) {
    const fix = !!s.autoMark?.problem
    left.push(
      { key: 'replace', label: '사진 바꾸기', tip: '자리·크기는 그대로 두고 사진만 바꾸기', type: 'emit', group: 'photo' },
      { key: 'crop', label: '자르기', tip: '남길 곳을 자르거나 중간 띠를 빼요 (이 사진을 쓰는 모든 자리에)', type: 'emit', group: 'photo' },
      { key: 'look', label: '필터', tip: '필터 · 밝기·대비 같은 조정 (이 사진을 쓰는 모든 자리에)', type: 'pop', pop: 'look', group: 'photo' },
      { key: 'deco', label: '꾸미기', tip: '테두리 · 모서리 · 그림자 (이 자리에만)', type: 'pop', pop: 'deco', group: 'photo' },
      { key: 'erase', label: fix ? '직접 고치기' : '지우기', tip: fix ? '이 사진을 지우기 화면에서 직접 고쳐요' : '지우기 화면 열기 (사진을 두 번 눌러도 돼요)', type: 'emit', group: 'photo' },
      { key: 'compare', label: '원본 비교', tip: '누르고 있는 동안 페이지에 원본이 보여요', type: 'hold', group: 'photo' },
    )
    if (s.autoMark?.canRevert) left.push({ key: 'autoRevert', label: '원본으로', tip: '자동으로 지운 곳을 원래대로', type: 'emit', group: 'photo' })
  }
  if (k.has('text')) {
    left.push(
      { key: 'font', label: '글꼴', tip: '글꼴 바꾸기', type: 'pop', pop: 'font', group: 'text' },
      { key: 'fontSize', label: '글자 크기', tip: '글자 크기', type: 'pop', pop: 'textSize', group: 'text' },
      { key: 'textColor', label: '색', tip: '글자 색', type: 'pop', pop: 'textColor', group: 'text' },
      { key: 'weight', label: '굵기', tip: '글자 굵기', type: 'pop', pop: 'weight', group: 'text' },
      { key: 'textAlign', label: '글자 정렬', tip: '글자를 왼쪽·가운데·오른쪽으로', type: 'pop', pop: 'textAlign', group: 'text' },
      { key: 'textMore', label: '글자 꾸미기', tip: '줄간격·자간 · 테두리·그림자·글자 배경 · 모양 복사/붙여넣기', type: 'pop', pop: 'textMore', group: 'text' },
    )
  }
  if (k.has('shape')) {
    left.push(
      { key: 'shapeKind', label: '모양', tip: '네모·원·세모·별로 바꾸기', type: 'pop', pop: 'shapeKind', group: 'shape' },
      { key: 'fill', label: '색', tip: '채우기 색 · 진하기', type: 'pop', pop: 'fill', group: 'shape' },
      { key: 'stroke', label: '테두리', tip: '테두리 두께 · 색 · 모서리 둥글기', type: 'pop', pop: 'stroke', group: 'shape' },
    )
  }
  if (k.has('line')) left.push({ key: 'line', label: '선 모양', tip: '두께 · 색 · 실선/점선 · 끝 모양(화살표)', type: 'pop', pop: 'line', group: 'line' })
  if (k.has('table')) {
    left.push(
      { key: 'addRow', label: '행 추가', tip: s.tableCount === 1 ? '맨 아래에 줄 추가' : '표 하나를 골랐을 때 줄을 더할 수 있어요', type: 'emit', group: 'table', disabled: s.tableCount !== 1 },
      { key: 'addCol', label: '열 추가', tip: s.tableCount === 1 ? '맨 오른쪽에 열 추가' : '표 하나를 골랐을 때 열을 더할 수 있어요', type: 'emit', group: 'table', disabled: s.tableCount !== 1 },
      { key: 'header', label: '첫 줄 제목', tip: '첫 줄을 제목 줄로', type: 'emit', group: 'table', pressed: s.headerRow === true },
      { key: 'tableMore', label: '표 모양', tip: '행·열 빼기 · 글꼴·크기·정렬 · 색 · 테두리 · 칸 목록', type: 'pop', pop: 'table', group: 'table' },
    )
  }
  const right = [
    { key: 'duplicate', label: '복제', tip: '똑같은 것 하나 더 만들기 (Ctrl+D)', type: 'cmd', cmd: 'duplicate' },
    s.anyLocked
      ? { key: 'lock', label: '잠금 풀기', tip: '잠금을 풀어 다시 움직일 수 있게', type: 'cmd', cmd: 'unlock', pressed: true }
      : { key: 'lock', label: '잠금', tip: '실수로 움직이지 않게 고정', type: 'cmd', cmd: 'lock' },
    s.anyHidden
      ? { key: 'hide', label: '보이기', tip: '숨긴 것을 다시 보이게 (내보내기에도 들어감)', type: 'cmd', cmd: 'show', pressed: true }
      : { key: 'hide', label: '숨기기', tip: '지우지 않고 잠깐 안 보이게 (내보내기에서도 빠짐)', type: 'cmd', cmd: 'hide' },
  ]
  if (s.canUngroup) right.push({ key: 'group', label: '그룹 풀기', tip: '묶은 것을 하나씩 따로 (Ctrl+Shift+G)', type: 'cmd', cmd: 'ungroup' })
  else if (s.canGroup) right.push({ key: 'group', label: '그룹', tip: '여러 요소를 하나로 묶어 함께 옮기기 (Ctrl+G · 같은 섹션 안의 요소만)', type: 'cmd', cmd: 'group' })
  // 사진 하나 = 예전 [페이지에서 빼기]와 같은 명령(removeFromPage — 사진은 목록에 남음, 이력 "페이지에서 빼기")
  right.push({ key: 'delete', label: '삭제', tip: '삭제 (Delete)', type: 'cmd', cmd: s.photo ? 'removeFromPage' : 'delete', danger: true, disabled: s.allLocked })
  return { left, right }
}
/** 슬라이더 % → 배율 (범위 밖은 잘라 냄) */
export function sizeFactor(pct) {
  const v = Math.min(SIZE_PCT[1], Math.max(SIZE_PCT[0], Number(pct)))
  return Number.isFinite(v) ? v / 100 : 1
}

/**
 * 페이지 빈 곳을 누르고(끌지 않고) 뗐을 때 — 섹션 안이면 그 섹션 고르기(요소가 있는 섹션도), 섹션 사이 간격이면 선택 해제.
 * Shift를 누른 채면 아무것도 안 바꿈(여러 개 고르기 중)
 * @returns {{ kind: 'section', sectionId } | { kind: 'clear' } | { kind: 'none' }}
 */
export function blankPressTarget({ shift, sectionId, sectionIds }) {
  if (shift) return { kind: 'none' }
  if (sectionId && sectionIds.includes(sectionId)) return { kind: 'section', sectionId }
  return { kind: 'clear' }
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
