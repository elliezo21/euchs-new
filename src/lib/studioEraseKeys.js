/**
 * 지우기 화면 단축키 — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-erase-tools.mjs). 이름·키는 포토샵과 같게.
 *
 *   M 사각형 선택 · B 브러시(칠하기) · E 브러시 덜어내기 · S 주변으로 덮기 · [ / ] 브러시 크기 -10 / +10
 *   Delete·Backspace 삭제(선택 영역을 투명하게) · Shift+Delete·Enter AI로 지우기 · Esc·Ctrl+D 선택 해제
 *   되돌리기(Ctrl+Z)·다시(Ctrl+Shift+Z·Ctrl+Y)는 편집기가 이미 받는다 (지우기 화면이 열려 있으면 이 사진의 이력) — 여기서는 다루지 않는다.
 * ★ 입력 칸(input·textarea·select·편집 가능)에 커서가 있으면 아무것도 하지 않는다 (typing = true).
 */

export const BRUSH_STEP = 10
export const TOOL_KEYS = { m: 'marquee', b: 'brush', s: 'cover' }

/** 누른 칸이 입력 칸인지 */
export function isTypingTarget(t) {
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || !!t.isContentEditable)
}

/**
 * 키 → 할 일. null = 이 화면이 다루지 않는 키.
 * @param {{ key: string, code?: string, shiftKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean }} e
 * @param {{ typing?: boolean, hasSelection?: boolean, onButton?: boolean }} ctx hasSelection = 선택 영역(초안)이 있음, onButton = 버튼에 포커스
 * @returns {{ action: string, tool?: string, mode?: string, delta?: number } | null}
 *   action: 'tool' | 'brushMode' | 'brushSize' | 'delete' | 'ai' | 'deselect'
 */
export function eraseKeyAction(e, { typing = false, hasSelection = false, onButton = false } = {}) {
  if (typing || e.altKey) return null
  if (onButton && (e.key === 'Enter' || e.key === ' ')) return null // 버튼 위 Enter는 그 버튼 몫 (두 번 실행되지 않게)
  const mod = !!(e.ctrlKey || e.metaKey)
  const k = String(e.key || '').toLowerCase()
  if (mod) return !e.shiftKey && (e.code === 'KeyD' || k === 'd') ? { action: 'deselect' } : null // Ctrl·Cmd+D
  if (e.key === 'Escape') return { action: 'deselect' }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (!hasSelection) return null
    return e.shiftKey && e.key === 'Delete' ? { action: 'ai' } : { action: 'delete' }
  }
  if (e.key === 'Enter') return hasSelection && !e.shiftKey ? { action: 'ai' } : null
  if (e.key === '[' || e.code === 'BracketLeft') return { action: 'brushSize', delta: -BRUSH_STEP }
  if (e.key === ']' || e.code === 'BracketRight') return { action: 'brushSize', delta: BRUSH_STEP }
  if (e.shiftKey) return null
  // 한글 입력 상태에서도 같은 자리의 키로 (e.code)
  const byCode = { KeyM: 'm', KeyB: 'b', KeyS: 's', KeyE: 'e' }[e.code]
  const letter = byCode || k
  if (letter === 'e') return { action: 'brushMode', mode: 'sub' }
  if (TOOL_KEYS[letter]) return { action: 'tool', tool: TOOL_KEYS[letter], ...(letter === 'b' ? { mode: 'add' } : {}) }
  return null
}

/** 브러시 크기 한 단계 (min~max 안) */
export function stepBrush(size, delta, min, max) {
  return Math.min(max, Math.max(min, Math.round(size + delta)))
}

/**
 * 작업 바 자리 (화면 px) — 선택 영역 바로 아래 가운데, 아래가 모자라면 위. 화면 밖으로 나가지 않게, 아래 확대/축소 바(bottomReserve)와 겹치지 않게.
 * @param {{ x, y, w, h }} sel 선택 영역의 화면 네모  @param {{ w, h }} view 캔버스 칸 크기  @param {{ w, h }} bar 작업 바 크기
 * @returns {{ left: number, top: number }}
 */
export function workBarPosition(sel, view, bar, { gap = 10, margin = 8, bottomReserve = 64 } = {}) {
  const maxTop = view.h - bottomReserve - bar.h - margin
  let top = sel.y + sel.h + gap
  if (top > maxTop) top = sel.y - gap - bar.h // 아래 자리 없음 → 위
  top = Math.max(margin, Math.min(maxTop, top))
  let left = sel.x + sel.w / 2 - bar.w / 2
  left = Math.max(margin, Math.min(view.w - bar.w - margin, left))
  return { left: Math.round(left), top: Math.round(top) }
}
