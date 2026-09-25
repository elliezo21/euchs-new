// 스튜디오 AI 지우기 범위 테스트 — node scripts/test-studio-ai-geometry.mjs
// 실측 랩(prep.py → prep/index.json)이 10장에 대해 계산한 k·여백·넓힌 네모·잘라내기 범위와 aiPlan(pad=0)이 같은지 본다.
// 기대값은 랩 prep/index.json을 그대로 옮겨 적은 것 (boxes/crop은 [x0,y0,x1,y1]).
import { aiK, aiMargin, aiPlan, unionRect } from '../src/lib/studioAi/aiGeometry.js'

let pass = 0, fail = 0
const rows = []
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  rows.push([ok ? 'PASS' : 'FAIL', name, JSON.stringify(got), ok ? '' : `기대 ${JSON.stringify(want)}`])
}
const toXYXY = r => [r.x, r.y, r.x + r.w, r.y + r.h]

const LAB = [
  { id: 'egg_g0', W: 1920, H: 1920, k: 20, margin: 160, rects: [[20, 1752, 850, 140]], boxes: [[0, 1732, 890, 1912]], crop: [0, 1572, 1050, 1920] },
  { id: 'shoe_g3', W: 800, H: 800, k: 8, margin: 67, rects: [[462, 408, 296, 166]], boxes: [[454, 400, 766, 582]], crop: [387, 333, 800, 649] },
  { id: 'tow_d0', W: 790, H: 249, k: 8, margin: 66, rects: [[55, 48, 685, 152]], boxes: [[47, 40, 748, 208]], crop: [0, 0, 790, 249] },
  { id: 'egg_g2', W: 1920, H: 1920, k: 20, margin: 160, rects: [[820, 50, 1030, 180], [295, 240, 1555, 190]], boxes: [[800, 30, 1870, 250], [275, 220, 1870, 450]], crop: [115, 0, 1920, 610] },
  { id: 'tow_g1', W: 800, H: 800, k: 8, margin: 67, rects: [[668, 38, 74, 550]], boxes: [[660, 30, 750, 596]], crop: [593, 0, 800, 663] },
  { id: 'tow_g0', W: 800, H: 800, k: 8, margin: 67, rects: [[255, 60, 290, 40], [45, 118, 712, 80], [160, 205, 490, 50]], boxes: [[247, 52, 553, 108], [37, 110, 765, 206], [152, 197, 658, 263]], crop: [0, 0, 800, 330] },
  { id: 'pin_g2', W: 592, H: 592, k: 6, margin: 64, rects: [[210, 183, 176, 32], [226, 454, 120, 30]], boxes: [[204, 177, 392, 221], [220, 448, 352, 490]], crop: [140, 113, 456, 554] },
  { id: 'pin_g0', W: 726, H: 726, k: 8, margin: 64, rects: [[525, 118, 200, 215]], boxes: [[517, 110, 726, 341]], crop: [453, 46, 726, 405] },
  { id: 'hood_g0', W: 800, H: 800, k: 8, margin: 67, rects: [[212, 672, 506, 56]], boxes: [[204, 664, 726, 736]], crop: [137, 597, 793, 800] },
  { id: 'tow_g2', W: 800, H: 800, k: 8, margin: 67, rects: [[15, 165, 770, 125]], boxes: [[7, 157, 793, 298]], crop: [0, 90, 800, 365] },
]

for (const c of LAB) {
  const rects = c.rects.map(([x, y, w, h]) => ({ x, y, w, h }))
  const p = aiPlan(rects, 0, c.W, c.H)
  eq(`${c.id} k`, aiK(c.W, c.H), c.k)
  eq(`${c.id} 여백`, aiMargin(c.W, c.H), c.margin)
  eq(`${c.id} 메우는 범위`, p.fillAreas.map(toXYXY), c.boxes)
  eq(`${c.id} 잘라내는 범위`, toXYXY(p.crop), c.crop)
  // 조각 좌표 = 원본 좌표 − 조각 시작점, 모두 조각 안
  eq(`${c.id} 조각 좌표`, p.fillAreasInCrop.every((a, i) =>
    a.x === p.fillAreas[i].x - p.crop.x && a.y === p.fillAreas[i].y - p.crop.y &&
    a.x >= 0 && a.y >= 0 && a.x + a.w <= p.crop.w && a.y + a.h <= p.crop.h), true)
}

// pad가 k보다 크면 pad로 넓힌다 (800×800 → k=8, pad=12)
{
  const p = aiPlan([{ x: 100, y: 100, w: 50, h: 20 }], 12, 800, 800)
  eq('pad>k → pad 사용', { grow: p.grow, area: p.fillAreas[0] }, { grow: 12, area: { x: 88, y: 88, w: 74, h: 44 } })
  const q = aiPlan([{ x: 100, y: 100, w: 50, h: 20 }], 3, 800, 800)
  eq('pad<k → k 사용', q.grow, 8)
}
// 가장자리에서 이미지 안으로 잘림
{
  const p = aiPlan([{ x: 0, y: 0, w: 10, h: 10 }], 0, 300, 200)
  eq('가장자리 자름', { area: p.fillAreas[0], crop: p.crop }, { area: { x: 0, y: 0, w: 16, h: 16 }, crop: { x: 0, y: 0, w: 80, h: 80 } })
}
eq('unionRect', unionRect([{ x: 5, y: 10, w: 10, h: 5 }, { x: 0, y: 20, w: 3, h: 3 }]), { x: 0, y: 10, w: 15, h: 13 })
{
  let threw = false
  try { aiPlan([], 0, 100, 100) } catch { threw = true }
  eq('빈 네모 → 오류', threw, true)
}

for (const r of rows) console.log(r.filter(Boolean).join('  '))
console.log(`\n${pass} PASS / ${fail} FAIL`)
process.exit(fail ? 1 : 0)
