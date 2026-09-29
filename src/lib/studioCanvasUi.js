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
  { key: 'decor', label: '꾸밈' },    // 에셋 채우기: 체크·번호·말풍선·구분선·화살표 (studioDecor)
  { key: 'table', label: '표' },      // 사이즈표 + 비교표·스펙표
  { key: 'asset', label: '이미지' },  // 에셋 이미지 (우리 그림 — public/studio-assets, studioAsset)
]
/** 기억한 종류가 없거나 모르는 값이면 첫 종류 */
export function elementTabOf(key) {
  return ELEMENT_TABS.some(t => t.key === key) ? key : ELEMENT_TABS[0].key
}

// ── 작업판 위 가로 도구줄 (고른 요소의 설정 — 예전 왼쪽 "고른 요소 설정" 칸과 떠 있는 도구줄을 합침) ──
// 버튼 종류: pop = 누르면 도구줄 아래로 펼침 칸(pop 이름) / cmd = 편집기 runCommand(cmd, args) / emit = 편집기 동작(사진 바꾸기·자르기 등) / hold = 누르고 있는 동안
export const SIZE_PCT = [5, 500]      // [크기] 슬라이더 (%, 비율 유지)
export const ROTATE_DEG = [-180, 180] // [회전] 슬라이더 (°)
/**
 * @param {{ kinds: Set<string>, photo: boolean, autoMark: object|null, photoInfo?: string, fillCount?: number, anyLocked, allLocked, anyHidden, canGroup, canUngroup, headerRow: boolean|null, tableCount: number }} s
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
      { key: 'erase', label: fix ? '직접 고치기' : '지우기', tip: (fix ? '이 사진을 지우기 화면에서 직접 고쳐요' : '지우기 화면 열기 (사진을 두 번 눌러도 돼요)') + (s.photoInfo ? `\n${s.photoInfo}` : ''), type: 'emit', group: 'photo' },
    )
    // 예전 사진 정보 카드의 [이 사진의 지우기 모두 삭제] — 지운 적이 있을 때만. 누르면 편집기가 확인창을 연다
    if (s.fillCount > 0) left.push({ key: 'clearAll', label: '지우기 모두 되돌리기', tip: `붓·네모로 지운 곳 ${s.fillCount}곳을 모두 없애요 (확인 후)`, type: 'emit', group: 'photo' })
    left.push(
      { key: 'compare', label: '원본 비교', tip: '누르고 있는 동안 페이지에 원본이 보여요', type: 'hold', group: 'photo' },
    )
    if (s.autoMark?.canRevert) left.push({ key: 'autoRevert', label: '원본으로', tip: '자동으로 지운 곳을 원래대로', type: 'emit', group: 'photo' })
  }
  // 예시 사진 (studioSamples) — 자리·크기 그대로 내 사진으로 (편집기 사진 바꾸기 창)
  if (s.sample) left.push({ key: 'sampleReplace', label: '내 사진으로 바꾸기', tip: '예시 사진 자리에 내 사진을 넣어요 (자리·크기·꾸미기 그대로)', type: 'emit', group: 'photo' })
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
      ? { key: 'hide', label: '보이기', tip: '숨긴 것을 다시 보이게 (받는 이미지에도 들어감)', type: 'cmd', cmd: 'show', pressed: true }
      : { key: 'hide', label: '숨기기', tip: '지우지 않고 잠깐 안 보이게 (받는 이미지에서도 빠짐)', type: 'cmd', cmd: 'hide' },
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

// ── 오른쪽 칸 위(미니뷰)·아래(레이어) 나누기 — def = 처음 위 높이, minTop·minBottom = 위·아래 최소 높이 (px) ──
export const RIGHT_SPLIT = { def: 220, minTop: 96, minBottom: 140 }
/**
 * 위 칸 높이 — avail = 위·경계·아래를 합친 상자 높이 (모르면 0 → 위 최소 높이만 지킨다). 숫자가 아니면 처음 높이
 */
export function clampRightSplit(h, avail) {
  const top = Number.isFinite(h) ? h : RIGHT_SPLIT.def
  const max = avail > 0 ? Math.max(RIGHT_SPLIT.minTop, avail - RIGHT_SPLIT.minBottom) : Infinity
  return Math.round(Math.min(max, Math.max(RIGHT_SPLIT.minTop, top)))
}
