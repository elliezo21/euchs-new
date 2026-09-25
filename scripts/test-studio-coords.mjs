// 스튜디오 편집기 좌표 변환 테스트 — node scripts/test-studio-coords.mjs
// 화면 좌표(CSS px) ↔ 원본 좌표 변환, 반올림, clamp, 최소 크기 보정, 화면 맞춤, 이동 제한을 기대값과 비교한다.
import {
  screenToImage, imageToScreen, rectFromDrag, normalizeRect, clampRectPosition, expandRect,
  fitView, clampPan, zoomAt, clampZoom, isClick,
} from '../src/lib/studioCoords.js'

let pass = 0, fail = 0
const rows = []
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  rows.push([ok ? 'PASS' : 'FAIL', name, JSON.stringify(got), ok ? '' : `기대 ${JSON.stringify(want)}`])
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps
const vpt = (z, tx = 0, ty = 0) => [z, 0, 0, z, tx, ty]
// 화면에서 드래그한 두 점 → 저장될 영역 (편집기와 같은 경로: screenToImage → rectFromDrag)
const dragToRect = (v, s0, s1, W, H) => rectFromDrag(screenToImage(s0, v), screenToImage(s1, v), W, H)

// ── 배율별 왕복 ──
for (const z of [0.05, 0.33, 1, 2.5]) {
  const v = vpt(z, 37, -120)
  const img = { x: 512, y: 1340 }
  const s = imageToScreen(img, v)
  const back = screenToImage(s, v)
  eq(`왕복 ${z * 100}%`, near(back.x, 512, 1e-9) && near(back.y, 1340, 1e-9), true)
}

// ── 배율 5% / 33% / 100% / 250%, 이동 적용 ──
// 1240×1920 이미지, 원본 (100,200)~(480,296) 영역을 화면에서 드래그한 경우
{
  const W = 1240, H = 1920
  for (const [z, tx, ty] of [[0.05, 300, 40], [0.33, 40, 40], [1, -200, -900], [2.5, -1000, -3000]]) {
    const v = vpt(z, tx, ty)
    const s0 = imageToScreen({ x: 100, y: 200 }, v)
    const s1 = imageToScreen({ x: 480, y: 296 }, v)
    eq(`배율 ${z * 100}% 이동(${tx},${ty})`, dragToRect(v, s0, s1, W, H), { x: 100, y: 200, w: 380, h: 96 })
  }
  // 33%에서 화면 1px 단위로 끝나는 드래그 → 원본으로 반올림 (1/0.33 = 3.03px 단위)
  const v = vpt(0.33, 40, 40)
  eq('33% 반올림', dragToRect(v, { x: 140, y: 140 }, { x: 240, y: 173 }, W, H),
    { x: 303, y: 303, w: 303, h: 100 })
}

// ── 역방향 드래그 (오른쪽 아래 → 왼쪽 위) ──
{
  const v = vpt(1, 0, 0)
  eq('역방향 드래그', dragToRect(v, { x: 480, y: 296 }, { x: 100, y: 200 }, 1240, 1920), { x: 100, y: 200, w: 380, h: 96 })
  eq('한 축만 역방향', dragToRect(v, { x: 480, y: 200 }, { x: 100, y: 296 }, 1240, 1920), { x: 100, y: 200, w: 380, h: 96 })
}

// ── 이미지 경계 밖 드래그 → clamp ──
{
  const W = 1240, H = 1920
  const v = vpt(0.5, 100, 50) // 이미지는 화면 (100,50)~(720,1010)
  eq('왼쪽 위 밖에서 시작', dragToRect(v, { x: 20, y: 0 }, { x: 150, y: 100 }, W, H), { x: 0, y: 0, w: 100, h: 100 })
  eq('오른쪽 아래 밖으로', dragToRect(v, { x: 620, y: 910 }, { x: 900, y: 1200 }, W, H), { x: 1040, y: 1720, w: 200, h: 200 })
  eq('완전히 밖(오른쪽) → 가장자리 최소 폭', dragToRect(v, { x: 800, y: 100 }, { x: 900, y: 200 }, W, H), { x: 1236, y: 100, w: 4, h: 200 })
}

// ── 최소 크기 보정 ──
{
  eq('1px 영역 → 4px', normalizeRect({ x: 10, y: 10, w: 1, h: 1 }, 100, 100), { x: 10, y: 10, w: 4, h: 4 })
  eq('오른쪽 끝 1px → 안쪽으로 4px', normalizeRect({ x: 99, y: 50, w: 1, h: 10 }, 100, 100), { x: 96, y: 50, w: 4, h: 10 })
  eq('소수 좌표 반올림', normalizeRect({ x: 10.4, y: 10.6, w: 20.2, h: 30.3 }, 100, 100), { x: 10, y: 11, w: 21, h: 30 })
  eq('이미지가 4px보다 작음', normalizeRect({ x: 0, y: 0, w: 1, h: 1 }, 3, 2), { x: 0, y: 0, w: 3, h: 2 })
}

// ── 790×20000 긴 이미지 아래쪽 ──
{
  const W = 790, H = 20000, cw = 900, ch = 800
  const v0 = fitView(W, H, cw, ch)
  eq('긴 이미지 화면 맞춤 = 너비 맞춤 100% 상한, 위쪽 여백 40', v0, [1, 0, 0, 1, 55, 40])
  // 휠로 끝까지 내리면 이미지 아래 끝이 화면 아래 여백 40에 닿는다
  const bottom = clampPan([1, 0, 0, 1, 55, -1e9], W, H, cw, ch)
  eq('긴 이미지 끝까지 스크롤', bottom, [1, 0, 0, 1, 55, ch - 40 - H])
  // 그 상태에서 화면 (155, 660)~(455, 700) 드래그 → 원본 y = 660 - ty = 660 + 19240
  const ty = bottom[5]
  eq('긴 이미지 아래쪽 영역', dragToRect(bottom, { x: 155, y: 660 }, { x: 455, y: 700 }, W, H),
    { x: 100, y: 19900, w: 300, h: 40 })
  eq('긴 이미지 아래쪽 영역 y값', 660 - ty, 19900)
  // 33%로 줄여도 아래쪽 좌표가 맞는지
  const v33 = clampPan(zoomAt(bottom, { x: 450, y: 400 }, 0.33), W, H, cw, ch)
  const s0 = imageToScreen({ x: 100, y: 19900 }, v33), s1 = imageToScreen({ x: 400, y: 19940 }, v33)
  eq('긴 이미지 33% 아래쪽', dragToRect(v33, s0, s1, W, H), { x: 100, y: 19900, w: 300, h: 40 })
  // 화면 740~790 = 원본 19980~20030 → 바닥 20000에서 잘린다
  eq('긴 이미지 바닥을 넘는 드래그', dragToRect(bottom, { x: 155, y: 740 }, { x: 455, y: 790 }, W, H),
    { x: 100, y: 19980, w: 300, h: 20 })
}

// ── 화면 맞춤 ──
{
  // 2600×2600을 1000×800에 → 높이 기준 (800-80)/2600
  const v = fitView(2600, 2600, 1000, 800)
  eq('정사각 큰 이미지 맞춤 배율', near(v[0], 720 / 2600), true)
  eq('정사각 큰 이미지 가운데', [near(v[4], (1000 - 2600 * v[0]) / 2), near(v[5], 40)], [true, true])
  const small = fitView(400, 300, 1000, 800)
  eq('작은 이미지는 100% 가운데', small, [1, 0, 0, 1, 300, 250])
}

// ── 배율 범위·점 고정 확대 ──
{
  eq('배율 하한 5%', clampZoom(0.01), 0.05)
  eq('배율 상한 400%', clampZoom(9), 4)
  const v = vpt(0.5, 10, 20)
  const p = { x: 300, y: 200 }
  const before = screenToImage(p, v)
  const after = screenToImage(p, zoomAt(v, p, 2))
  eq('확대해도 마우스 아래 점 고정', near(before.x, after.x) && near(before.y, after.y), true)
}

// ── 이동·넓히기·클릭 ──
{
  eq('영역 이동 clamp', clampRectPosition({ x: -5, y: 1900, w: 100, h: 50 }, 1240, 1920), { x: 0, y: 1870, w: 100, h: 50 })
  eq('pad 넓히기', expandRect({ x: 10, y: 10, w: 20, h: 20 }, 4, 100, 100), { x: 6, y: 6, w: 28, h: 28 })
  eq('pad 넓히기 경계', expandRect({ x: 1, y: 90, w: 20, h: 10 }, 4, 100, 100), { x: 0, y: 86, w: 25, h: 14 })
  eq('클릭 판정', [isClick({ x: 0, y: 0 }, { x: 3, y: 3 }), isClick({ x: 0, y: 0 }, { x: 4, y: 0 })], [true, false])
}

const w = [4, 40, 50]
for (const r of rows) console.log(`${r[0].padEnd(w[0])}  ${r[1].padEnd(w[1])}  ${r[2]}  ${r[3]}`)
console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
