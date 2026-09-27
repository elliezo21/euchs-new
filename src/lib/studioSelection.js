/**
 * 지우기 화면 선택 영역 되돌리기 — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-erase-tools.mjs)
 *
 * ★ 선택 영역(사각형 선택·브러시로 칠한 곳 = 초안 draft)은 사진 편집 내용(edit)이 아니라 저장·사진 이력에 들어가지 않는다.
 *   대신 이 선택 이력에 바뀔 때마다 한 칸씩 쌓는다: 브러시 한 획 · 사각형 한 번 · 옮기기/크기 한 번 · 선택 해제.
 * ★ 사진 이력(studioHistory, 적용 단위 — 삭제·AI로 지우기·단색·주변으로 덮기)과 한 줄로 섞어 되돌리는 규칙:
 *   선택 칸마다 그때의 사진 이력 위치(hIndex)를 적어 둔다. 되돌리기 = 맨 위 선택 칸이 지금 사진 이력 위치에서 생긴 것이면 그 선택을,
 *   아니면 사진 이력을 한 칸 (그사이 적용이 있었다는 뜻). 다시 하기도 같은 규칙 → 누른 순서 그대로 되감긴다.
 * ★ 적용하면 선택이 사라진다(초안 → 레이어). 적용을 되돌리면 그때 선택을 다시 살린다(appliedFrom — 포토샵처럼 선택이 남아 있는 느낌).
 */

export const SEL_HISTORY_MAX = 200

export function createSelHistory() {
  return { past: [], future: [] }
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)))

/** 선택이 바뀜 (before → after) — 같으면 그대로. 새 칸을 쌓으면 다시 하기 칸은 버린다 */
export function pushSel(h, hIndex, before, after) {
  if (same(before, after)) return h
  return { past: [...h.past, { hIndex, before: clone(before), after: clone(after) }].slice(-SEL_HISTORY_MAX), future: [] }
}

/** 사진 이력에 새 칸이 생김 — 선택 다시 하기 칸은 버린다 (갈래가 바뀜) */
export function dropSelFuture(h) {
  return h.future.length ? { past: h.past, future: [] } : h
}

/**
 * 되돌리기 계획 — { kind: 'sel', draft, next } (선택을 draft로) | { kind: 'hist' } (사진 이력 한 칸) | null (할 것 없음)
 * @param {number} hIndex 지금 사진 이력 위치  @param {boolean} canUndoHist 사진 이력을 되돌릴 수 있는지
 */
export function undoPlan(h, hIndex, canUndoHist) {
  const top = h.past[h.past.length - 1]
  if (top && top.hIndex === hIndex) return { kind: 'sel', draft: clone(top.before), next: { past: h.past.slice(0, -1), future: [...h.future, top] } }
  return canUndoHist ? { kind: 'hist' } : null
}

/** 다시 하기 계획 — undoPlan과 같은 모양 */
export function redoPlan(h, hIndex, canRedoHist) {
  const top = h.future[h.future.length - 1]
  if (top && top.hIndex === hIndex) return { kind: 'sel', draft: clone(top.after), next: { past: [...h.past, top], future: h.future.slice(0, -1) } }
  return canRedoHist ? { kind: 'hist' } : null
}
