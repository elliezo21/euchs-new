/**
 * 미리보기 (13-2단계) — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-preview.mjs)
 *
 * ★ 미리보기 그림은 13-1 내보내기 엔진(studioExport.renderSection)의 결과를 그대로 보여 준다 (= 받게 될 이미지와 같은 모습).
 *   여기서는 보이는 크기·자리와 "어느 구간부터 그릴지"만 정한다.
 * ★ 기기: PC = 페이지 폭 그대로(780px), 모바일 = 360px 폭으로 줄여 보여 준다 (판매처 모바일 상세페이지처럼 폭에 맞춤).
 *   구간은 위에서 아래로 이어 붙이고 사이는 page.gap × 배율 (13-1 "한 장으로 길게"와 같은 규칙 — 흰색).
 * ★ 그리는 배율 = 보이는 폭 × 기기 배율(1~2) ÷ 페이지 폭 — 흐리지 않게, 2배를 넘지 않게.
 */
import { stackLayout } from './studioExport.js'

export const PREVIEW_DEVICES = {
  pc: { key: 'pc', label: 'PC', width: 780 },
  mobile: { key: 'mobile', label: '모바일', width: 360 },
}
export const PREVIEW_NEAR_PX = 800 // 화면 밖이라도 이만큼 가까운 구간은 미리 그린다 (보이는 크기 px)

const round3 = v => Math.round(v * 1000) / 1000

/** 보이는 배율 (페이지 px → 미리보기 화면 px) */
export function previewDisplayScale(pageWidth, device) {
  return round3(PREVIEW_DEVICES[device].width / pageWidth)
}

/** renderSection에 넘길 배율 — 보이는 폭 × 기기 배율(1~2) ÷ 페이지 폭 */
export function previewRenderScale(pageWidth, device, dpr = 1) {
  const d = Math.min(2, Math.max(1, Number.isFinite(dpr) ? dpr : 1))
  return round3((PREVIEW_DEVICES[device].width * d) / pageWidth)
}

/**
 * 구간 자리 (미리보기 화면 px) — rows [{ id, no, top, height }] + 전체 높이. no = 페이지 안 구간 번호(1부터)
 */
export function previewRows(page, displayScale) {
  const { tops, height } = stackLayout(page, page.sections)
  return {
    rows: page.sections.map((s, i) => ({ id: s.id, no: i + 1, top: round3(tops[i] * displayScale), height: round3(s.height * displayScale) })),
    height: round3(height * displayScale),
  }
}

/**
 * 먼저 그릴 구간 — 화면에 보이는 구간(위 → 아래) 다음 가까운 구간(화면에서 가까운 순). 멀리 있는 구간은 넣지 않는다(스크롤하면 그때)
 * @param {number} scrollTop 스크롤 위치  @param {number} viewHeight 보이는 높이  @param {number} near 미리 그릴 거리
 * @returns {string[]} 구간 id
 */
export function previewOrder(rows, scrollTop, viewHeight, near = PREVIEW_NEAR_PX) {
  const top = scrollTop, bottom = scrollTop + viewHeight
  const visible = [], close = []
  for (const r of rows) {
    const rTop = r.top, rBottom = r.top + r.height
    if (rBottom > top && rTop < bottom) visible.push(r)
    else {
      const dist = rBottom <= top ? top - rBottom : rTop - bottom
      if (dist <= near) close.push({ r, dist })
    }
  }
  close.sort((a, b) => a.dist - b.dist)
  return [...visible.map(r => r.id), ...close.map(c => c.r.id)]
}

// ── 그림 알림 묶기 (review-1) — 미리보기·내보내기 창 위쪽 알림이 사진마다 줄줄이 뜨지 않게 ──
/** 지우기를 시작했지만(AI 지우기 레이어) 결과 조각이 없거나 맞지 않는 사진 — 편집기 erasedSourceOf가 이 글자로 알린다 */
export const AI_MISSING_NOTE = 'AI로 지우기 결과가 없는 곳은 원본 그대로 들어갔어요'
const LABEL_SHOW = 3
/**
 * notes [{ sectionId, imageId, note }] → 한 줄씩 (같은 글자는 한 줄로, 사진 수·구간 이름 몇 개)
 * 지우기를 안 한 사진은 애초에 알림이 없다 (AI 지우기 레이어가 있고 결과가 빠졌을 때만 AI_MISSING_NOTE)
 * @returns {string[]}
 */
export function summarizeNotes(notes, labels = {}) {
  const groups = new Map()
  for (const n of notes || []) {
    if (!n || typeof n.note !== 'string') continue
    if (!groups.has(n.note)) groups.set(n.note, { sections: [], images: new Set() })
    const g = groups.get(n.note)
    if (n.sectionId && !g.sections.includes(n.sectionId)) g.sections.push(n.sectionId)
    if (n.imageId) g.images.add(n.imageId)
  }
  const out = []
  for (const [note, g] of groups) {
    const names = g.sections.map(id => labels[id]).filter(Boolean)
    const shown = names.slice(0, LABEL_SHOW).join(', ') + (names.length > LABEL_SHOW ? ` 외 ${names.length - LABEL_SHOW}곳` : '')
    if (note === AI_MISSING_NOTE) {
      out.push(`AI로 지우기 결과가 없는 사진 ${Math.max(1, g.images.size)}장은 원본 그대로 들어갔어요${shown ? ` (${shown})` : ''} — 지우기 화면에서 [다시 지우기]를 눌러 주세요`)
    } else {
      out.push(names.length === 1 ? `${names[0]} · ${note}` : `${note}${shown ? ` (${shown})` : ''}`)
    }
  }
  return out
}
