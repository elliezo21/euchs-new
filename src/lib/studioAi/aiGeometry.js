/**
 * AI 지우기(LaMa) 범위 계산 — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-ai-geometry.mjs)
 *
 * 실측 랩(euchs-lab/ai-erase-2026-09-25/prep.py)과 같은 규칙:
 *   k      = max(6, round(20 × max(W,H) / 1920))            — 네모를 넓히는 폭 (그림자·테두리까지)
 *   메우는 범위 = 네모를 사방 max(pad, k) px 넓혀 이미지 안으로 자름
 *   여백    = max(64, round(160 × max(W,H) / 1920))
 *   잘라내는 범위 = 메우는 범위들을 모두 감싸는 사각형을 사방 여백만큼 넓혀 자름
 * 네모가 여러 개여도 잘라낸 조각 하나 + 합친 마스크로 한 번에 추론한다 (랩과 같음).
 *
 * 반올림: 랩은 Python round(.5는 짝수 쪽), 여기는 Math.round(.5는 올림).
 * 20·max/1920 또는 160·max/1920이 정확히 .5가 되는 크기에서만 1px 다를 수 있다 (10장 실측 케이스엔 없음).
 */
import { expandRect } from '../studioCoords.js'

export function aiK(W, H) {
  return Math.max(6, Math.round((20 * Math.max(W, H)) / 1920))
}

export function aiMargin(W, H) {
  return Math.max(64, Math.round((160 * Math.max(W, H)) / 1920))
}

/** 여러 사각형을 감싸는 사각형 */
export function unionRect(rects) {
  const x0 = Math.min(...rects.map(r => r.x)), y0 = Math.min(...rects.map(r => r.y))
  const x1 = Math.max(...rects.map(r => r.x + r.w)), y1 = Math.max(...rects.map(r => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * 네모들(원본 좌표 {x,y,w,h}) → AI 지우기 계획
 * @param rects  지울 네모 배열 (1개 이상)
 * @param pad    사용자가 정한 넓힘 폭 (없으면 0). 실제 넓힘 = max(pad, k)
 * @returns {{ k, margin, grow, fillAreas, crop, fillAreasInCrop }}
 *   fillAreas: 메우는 범위(원본 좌표), crop: 잘라내는 범위(원본 좌표), fillAreasInCrop: 메우는 범위(조각 좌표)
 */
export function aiPlan(rects, pad, W, H) {
  if (!Array.isArray(rects) || rects.length === 0) throw new Error('aiPlan: 네모가 없습니다')
  const k = aiK(W, H)
  const margin = aiMargin(W, H)
  const grow = Math.max(pad || 0, k)
  const fillAreas = rects.map(r => expandRect(r, grow, W, H))
  const crop = expandRect(unionRect(fillAreas), margin, W, H)
  const fillAreasInCrop = fillAreas.map(a => ({ x: a.x - crop.x, y: a.y - crop.y, w: a.w, h: a.h }))
  return { k, margin, grow, fillAreas, crop, fillAreasInCrop }
}
