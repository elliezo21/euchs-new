/**
 * 편집 이력 (되돌리기·다시) — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-history.mjs)
 *
 * ★ 한 단계 = 그 시점 edit 객체 전체의 깊은 복사본 + 라벨 + 시각. 레이어가 최대 60개라 스냅샷으로 충분하다.
 *   모르는 type 레이어(다음 단계의 cover·text 등)도 edit 전체를 복사하므로 그대로 보존된다.
 * ★ 이미지마다 이력을 따로 둔다 (편집기가 imageId → history로 관리). 세션 동안만 유지되고 저장하지 않는다.
 *   범용 스냅샷이라 페이지 문서(studio_projects.page)의 이력에도 쓴다 — 페이지 이력은 사진 이력과 따로 하나 (usePageSession).
 * ★ history = { steps: [{ edit, label, at }], index } — index가 현재 위치. steps[0..index]가 되돌리기 대상,
 *   steps[index+1..]가 다시 대상. 모든 함수는 새 객체를 돌려주고 입력을 바꾸지 않는다.
 */

export const HISTORY_LIMIT = 50 // 목록에 남는 최대 단계 수 (처음 상태 포함). 넘으면 가장 오래된 것부터 버린다

export const LABELS = {
  init: '처음 상태',
  add: '영역 추가',
  move: '영역 이동',
  resize: '크기 조절',
  remove: '영역 삭제',
  pad: '여백 변경',
  method: '채우기 방식 변경',
  aiErase: 'AI 지우기',
  reload: '최신 내용 불러옴',
  // 페이지 문서 이력 (4단계 — 사진 지우기 이력과 따로 둔다, 결정 8)
  pageInit: '처음 배치',
  itemMove: '사진 이동',
  // 페이지 요소 공통 조작 (6-1단계)
  elMove: '이동',
  elResize: '크기 바꾸기',
  elRotate: '회전',
  elFlip: '뒤집기',
  elAlign: '정렬',
  elOrder: '순서 바꾸기',
  elOpacity: '투명도',
  elDuplicate: '복제',
  elPaste: '붙여넣기',
  elCut: '잘라내기',
  elDelete: '삭제',
  elLock: '잠금',
  elUnlock: '잠금 해제',
  elHide: '숨기기',
  elShow: '보이기',
  elNumber: '위치·크기 입력',
  // 사진 패널 (6-2) — 페이지 이력: 바꾸기·빼기·꾸미기 / 사진 이력: 필터·조정
  elReplace: '사진 바꾸기',
  elRemovePhoto: '페이지에서 빼기',
  elInsertPhoto: '페이지에 넣기',
  secAdd: '구간 추가',
  secDelete: '구간 삭제',
  secDuplicate: '구간 복제',
  secMove: '구간 순서',
  secHeight: '구간 높이',
  secBg: '구간 배경색',
  secGap: '구간 간격',
  secReorder: '구간 순서 변경',
  grpGroup: '그룹 묶기',
  grpUngroup: '그룹 풀기',
  elStyle: '꾸미기',
  // 글자 (10-1)
  textInsert: '글자 넣기',
  textEdit: '글자 고치기',
  textFont: '글꼴',
  textSize: '글자 크기',
  textWeight: '굵기',
  textColor: '글자 색',
  textAlign: '글자 정렬',
  textLineHeight: '줄간격',
  textLetterSpacing: '자간',
  // 글자 꾸미기·스타일 (10-2)
  textStroke: '글자 테두리',
  textShadow: '글자 그림자',
  textBg: '글자 배경',
  textStylePreset: '스타일 적용',
  textStylePaste: '스타일 붙여넣기',
  // 도형·선 (11-1)
  elInsertShape: '도형 넣기',
  elInsertLine: '선 넣기',
  shapeKind: '도형 모양',
  shapeFill: '채우기',
  shapeStroke: '도형 테두리',
  shapeRadius: '모서리 둥글기',
  lineWidth: '선 굵기',
  lineColor: '선 색',
  lineDash: '선 모양',
  lineCap: '선 끝 모양',
  // 강조 배지·사이즈표 (11-2)
  badgeInsert: '배지 넣기',
  tableInsert: '사이즈표 넣기',
  tableCell: '표 칸 고치기',
  tableRowAdd: '행 추가',
  tableRowRemove: '행 빼기',
  tableColAdd: '열 추가',
  tableColRemove: '열 빼기',
  tableHeader: '제목 줄',
  tableFont: '표 글꼴',
  tableSize: '표 글자 크기',
  tableAlign: '표 정렬',
  tableColor: '표 색',
  tableBorder: '표 테두리',
  // 자르기·띠 잘라내기 (12-1) — 사진 이력 / 구간 높이 맞춤은 페이지 이력
  crop: '자르기',
  cuts: '띠 잘라내기',
  cropCuts: '자르기·띠 잘라내기',
  cropFit: '구간 높이 맞춤',
  // 덮기 (12-2) — 사진 이력 (지우기와 같은 layers)
  cover: '덮기',
  coverSource: '가져올 곳 옮기기',
  coverFeather: '덮기 가장자리',
  // 배경 지우기 (17-1) — 사진 이력
  bgRemove: '배경 지우기',
  bgTransparent: '배경 투명',
  bgOriginal: '원래 배경',
  bgReset: '배경 원래대로',
  lookFilter: '필터',
  lookAdjust: '조정',
  lookReset: '필터·조정 초기화',
  // 템플릿 (15단계) — 페이지 이력 한 칸 (사진 edit는 그대로)
  templateApply: '템플릿 적용',
  // 작업 이력 복원 (14단계) — 상단 [이력]에서 고른 단계를 새 단계로 (페이지 이력만, 사진 edit는 그대로)
  historyRestore: '이력 복원',
}

const clone = v => JSON.parse(JSON.stringify(v))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function step(edit, label, at) {
  return { edit: clone(edit), label, at }
}

/** 새 이력 (edit가 첫 단계) */
export function createHistory(edit, label = LABELS.init, at = Date.now()) {
  return { steps: [step(edit, label, at)], index: 0 }
}

/** 이력을 비우고 edit를 첫 단계로 (충돌 후 서버 최신본 불러오기 등) */
export function clear(h, edit, label = LABELS.reload, at = Date.now()) {
  return createHistory(edit, label, at)
}

export function current(h) {
  return h.steps[h.index]
}

/**
 * 새 동작 기록. 현재 단계와 값이 같으면 기록하지 않는다. 다시 스택은 비운다.
 * @returns 새 history (기록 안 했으면 입력 그대로)
 */
export function push(h, edit, label, at = Date.now()) {
  if (same(current(h).edit, edit)) return h
  let steps = [...h.steps.slice(0, h.index + 1), step(edit, label, at)]
  if (steps.length > HISTORY_LIMIT) steps = steps.slice(steps.length - HISTORY_LIMIT)
  return { steps, index: steps.length - 1 }
}

export function canUndo(h) { return !!h && h.index > 0 }
export function canRedo(h) { return !!h && h.index < h.steps.length - 1 }

/**
 * [되돌리기]가 할 일 — 실행 전 영역(초안)이 있으면 초안부터 지운다 (미리캔버스 방식, 2026-09-25 결정 16).
 * 초안은 이력에 없으므로 이력은 그대로 두고, 다시 스택에도 넣지 않는다.
 * @returns {'draft'|'undo'|null}
 */
export function undoAction(h, hasDraft) {
  if (hasDraft) return 'draft'
  return canUndo(h) ? 'undo' : null
}

/** @returns {{ history, edit } | null} edit = 되돌아간 단계의 edit (깊은 복사본) */
export function undo(h) {
  if (!canUndo(h)) return null
  return jumpTo(h, h.index - 1)
}

export function redo(h) {
  if (!canRedo(h)) return null
  return jumpTo(h, h.index + 1)
}

/** 목록의 i번째 단계로 이동 (다시 스택은 그대로 둔다 — 목록에서 앞뒤로 오갈 수 있게) */
export function jumpTo(h, i) {
  if (!h || !Number.isInteger(i) || i < 0 || i >= h.steps.length) return null
  const history = { steps: h.steps, index: i }
  return { history, edit: clone(h.steps[i].edit) }
}

/**
 * 현재 단계의 edit만 바꾼다 (단계 수·라벨·시각·다시 스택 그대로).
 * [AI 지우기] 한 번에 여러 AI 결과가 차례로 도착할 때, 첫 결과는 push로 단계를 만들고 나머지는 이 함수로 같은 단계에 합친다.
 */
export function amendCurrent(h, edit) {
  if (!h) return h
  const steps = h.steps.map((s, i) => (i === h.index ? { ...s, edit: clone(edit) } : s))
  return { steps, index: h.index }
}

/**
 * 이력 복원 (14단계 편집기 상단 [이력]) — i번째 단계의 값(깊은 복사본). 이 값을 새 동작("이력 복원")으로 push하면
 * 복원도 되돌리기 한 칸이 되어 Ctrl+Z로 취소할 수 있다 (jumpTo는 칸을 옮기기만 해서 다시 스택이 남는 것과 다르다).
 * 지금 단계·없는 단계면 null (할 일 없음)
 */
export function restorePoint(h, i) {
  if (!h || !Number.isInteger(i) || i < 0 || i >= h.steps.length || i === h.index) return null
  return clone(h.steps[i].edit)
}

/** 화면 목록용: [{ i, label, at, current }] (오래된 것부터) */
export function list(h) {
  if (!h) return []
  return h.steps.map((s, i) => ({ i, label: s.label, at: s.at, current: i === h.index }))
}
