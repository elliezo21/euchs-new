/**
 * "네모가 글자에 걸침" 판정 — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-history.mjs)
 *
 * 증상: 네모 테두리가 글자를 가로지르면, 테두리 색을 읽는 샘플 띠(메우는 범위 바깥 RING px)에 글자 픽셀이 섞여
 *       메운 결과에 글자색 줄무늬가 생긴다 (달걀 대표 사진의 검은 띠 + 노란 글자에서 실측).
 * 판정: 네 변의 샘플 띠마다 "급한 밝기 변화"의 크기(고역 편차)를 잰다.
 *       완만한 그라데이션은 빼고(이동 평균과의 차이), 글자 획처럼 짧게 튀는 변화만 남긴다.
 *       한 변의 값이 BLEED_MIN 이상이고, 나머지 변들의 중앙값의 BLEED_RATIO배 이상이면 그 변은 "걸침".
 *       (사진 위처럼 네 변이 모두 거칠면 걸침으로 보지 않는다 — 그건 덮기로 처리할 경우)
 */
import { fillArea, RING } from './studioFillPlan.js'

// 기준값 근거 — 2026-09-25 실측 (달걀 프로젝트 1688 원본, pad 4):
//   대표 사진 d3c4114f 검은 띠 + 노란 글자 "自动补位 不磕碰"
//     글자를 가로지른 변: 15.2(해성 재현: 아래 변이 글자 끝을 스침) · 24.0(위) · 36.8(오른쪽) · 46.8(아래) · 58.9(왼쪽)
//     글자를 다 덮은 네모의 네 변: 0.2~0.3,  글자를 스치지 않은 나머지 변: 0.2~2.2
//   상세 8dc7ddaf 흰 바탕·분홍 그라데이션 제목: 0~0.1
//   상세 71071182 사진(냉장고) 위 제목: 0.5~3.5  (네 변이 다 비슷해 걸침 아님)
//   → 최소 8: 깨끗한 변 최대(3.5)의 2배 이상, 가장 약한 걸침(15.2)의 절반 쯤.
//     비율 4: 걸친 변은 나머지 변 중앙값의 17배 이상, 사진 위 변은 2배 이하였다.
export const BLEED_MIN = 8
export const BLEED_RATIO = 4
export const BLEED_SMOOTH = 8     // 이동 평균 반경(px) — 이보다 긴 변화는 그라데이션으로 본다
export const WIDEN_PX = 6         // [조금 넓히기] 한 번에 넓히는 폭
export const SIDES = ['top', 'right', 'bottom', 'left']

const lum = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]

/**
 * 메우는 범위 바로 바깥 RING px 띠의 밝기를 변마다 위치별로 (띠 두께 방향은 평균). 이미지 밖이면 null
 * @param cropData { data, width, height } — crop 범위 픽셀
 */
export function edgeBands(cropData, crop, area, W, H, ring = RING) {
  const { data, width: cw } = cropData
  const px = (x, y) => lum(data, ((y - crop.y) * cw + (x - crop.x)) * 4)
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H &&
    x >= crop.x && y >= crop.y && x < crop.x + crop.w && y < crop.y + crop.h
  // at(i, k): 변을 따라 i번째, 바깥으로 k(1..ring)번째 픽셀 좌표
  const band = (len, at) => {
    const out = new Float32Array(len)
    for (let i = 0; i < len; i++) {
      let s = 0, n = 0
      for (let k = 1; k <= ring; k++) {
        const p = at(i, k)
        if (inside(p.x, p.y)) { s += px(p.x, p.y); n++ }
      }
      if (n === 0) return null // 이미지 끝에 붙은 변
      out[i] = s / n
    }
    return out
  }
  const a = area
  return {
    top: band(a.w, (i, k) => ({ x: a.x + i, y: a.y - k })),
    bottom: band(a.w, (i, k) => ({ x: a.x + i, y: a.y + a.h - 1 + k })),
    left: band(a.h, (i, k) => ({ x: a.x - k, y: a.y + i })),
    right: band(a.h, (i, k) => ({ x: a.x + a.w - 1 + k, y: a.y + i })),
  }
}

/** 이동 평균과의 평균 절대 차이 — 완만한 그라데이션은 0에 가깝고, 글자 획처럼 튀는 변화만 커진다 */
export function highPassDeviation(arr, r = BLEED_SMOOTH) {
  if (!arr || arr.length === 0) return null
  const n = arr.length
  const pre = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + arr[i]
  let s = 0
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - r), hi = Math.min(n, i + r + 1)
    s += Math.abs(arr[i] - (pre[hi] - pre[lo]) / (hi - lo))
  }
  return s / n
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  if (s.length === 0) return 0
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** 점수(변 → 고역 편차, 이미지 밖 변은 null) → 걸친 변 목록 */
export function bleedSidesFromScores(scores) {
  const present = SIDES.filter(s => scores[s] != null)
  const out = []
  for (const s of present) {
    const others = present.filter(o => o !== s).map(o => scores[o])
    if (others.length === 0) continue
    const base = median(others)
    if (scores[s] >= BLEED_MIN && scores[s] >= BLEED_RATIO * Math.max(base, 1)) out.push(s)
  }
  return out
}

/**
 * @returns {{ sides: string[], scores: Record<string, number|null> }}
 */
export function detectBleed(cropData, crop, l, W, H) {
  const bands = edgeBands(cropData, crop, fillArea(l, W, H), W, H)
  const scores = {}
  for (const s of SIDES) scores[s] = bands[s] ? highPassDeviation(bands[s]) : null
  return { sides: bleedSidesFromScores(scores), scores }
}

/** 걸친 변만 px만큼 넓힌다 (이미지 밖으로는 안 나감) */
export function widenSides(l, sides, W, H, px = WIDEN_PX) {
  let x0 = l.x, y0 = l.y, x1 = l.x + l.w, y1 = l.y + l.h
  if (sides.includes('left')) x0 = Math.max(0, x0 - px)
  if (sides.includes('top')) y0 = Math.max(0, y0 - px)
  if (sides.includes('right')) x1 = Math.min(W, x1 + px)
  if (sides.includes('bottom')) y1 = Math.min(H, y1 + px)
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
