// 편집기 페이지 Ctrl+휠 확대·스페이스 이동 계산 테스트(14단계) — node scripts/test-studio-view-nav.mjs
import { VIEW_ZOOM_MIN, VIEW_ZOOM_MAX, clampViewZoom, wheelZoom, zoomAnchor, scrollFix, panScroll, zoomPercent } from '../src/lib/studioViewNav.js'
import { fitZoom, ZOOM_PRESETS } from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(52)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t

// ── 1. 범위 = 확대 막대와 같은 범위 ──
eq('최솟값 = fitZoom 최솟값 (20%)', VIEW_ZOOM_MIN, fitZoom(1, 780, 0))
eq('최댓값 = 가장 큰 버튼 (100%)', VIEW_ZOOM_MAX, Math.max(...ZOOM_PRESETS))
eq('fitZoom 최댓값도 100%', fitZoom(100000, 780, 0), VIEW_ZOOM_MAX)
eq('범위 밖 → 끝으로', [clampViewZoom(0.01), clampViewZoom(5), clampViewZoom(0.6)], [0.2, 1, 0.6])
eq('숫자가 아니면 null', [clampViewZoom(NaN), clampViewZoom(undefined)], [null, null])

// ── 2. 휠 ──
eq('아래로 굴림(deltaY > 0) = 축소', wheelZoom(0.8, 100) < 0.8, true)
eq('위로 굴림(deltaY < 0) = 확대', wheelZoom(0.5, -100) > 0.5, true)
eq('휠 배율 = 0.998^deltaY (지우기 화면과 같음)', near(wheelZoom(0.5, -100), 0.5 * Math.pow(0.998, -100)), true)
eq('100%에서 더 확대 → 100% 그대로', wheelZoom(1, -500), 1)
eq('20%에서 더 축소 → 20% 그대로', wheelZoom(0.2, 800), 0.2)
eq('많이 굴려도 범위 안', [wheelZoom(0.5, -100000), wheelZoom(0.5, 100000)], [1, 0.2])
eq('줄 단위(deltaMode 1) = 16px', near(wheelZoom(0.5, -3, 1), wheelZoom(0.5, -48, 0)), true)
eq('쪽 단위(deltaMode 2) = 한 쪽 높이', near(wheelZoom(0.5, 1, 2, 600), wheelZoom(0.5, 600, 0)), true)
eq('작은 굴림(트랙패드)도 조금씩 바뀜 (반올림 안 함)', wheelZoom(0.5, -2) > 0.5 && wheelZoom(0.5, -2) < 0.51, true)
eq('deltaY가 숫자가 아니면 배율 그대로', wheelZoom(0.7, NaN), 0.7)

// ── 3. 마우스 중심 ──
// 페이지 네모가 화면 (100, 50)에 있고 배율 0.5 — 마우스 (300, 250) 아래 페이지 점 = (400, 400)
{
  const a = zoomAnchor({ left: 100, top: 50 }, 300, 250, 0.5)
  eq('마우스 아래 페이지 점', a, { u: 400, v: 400 })
  // 배율 1로 키운 뒤 가운데 정렬 때문에 네모가 (60, 50)으로 움직였다고 하면 — 그 점은 화면 (460, 450)
  const fix = scrollFix(a, { left: 60, top: 50 }, 300, 250, 1)
  eq('확대 뒤 스크롤을 옮길 양', fix, { dx: 160, dy: 200 })
  // 스크롤을 그만큼 옮기면 네모가 (-100, -150)이 되고 그 점이 다시 마우스 아래
  const after = { left: 60 - fix.dx, top: 50 - fix.dy }
  eq('옮긴 뒤 그 점이 마우스 아래 (300, 250)', [after.left + a.u * 1, after.top + a.v * 1], [300, 250])
  eq('배율이 같으면 옮길 양 0', scrollFix(zoomAnchor({ left: 10, top: 20 }, 50, 60, 0.75), { left: 10, top: 20 }, 50, 60, 0.75), { dx: 0, dy: 0 })
  // 축소
  const b = zoomAnchor({ left: 0, top: -1000 }, 500, 400, 1)
  const fb = scrollFix(b, { left: 0, top: -1000 }, 500, 400, 0.5)
  eq('축소: 위쪽으로 스크롤 (dy < 0)', [b, fb], [{ u: 500, v: 1400 }, { dx: -250, dy: -700 }])
}

// ── 4. 스페이스 이동 ──
eq('오른쪽 아래로 끌면 스크롤은 왼쪽 위로', panScroll({ left: 300, top: 900 }, 40, 25), { left: 260, top: 875 })
eq('움직이지 않으면 그대로', panScroll({ left: 5, top: 6 }, 0, 0), { left: 5, top: 6 })
eq('표시 %', [zoomPercent(0.5), zoomPercent(0.756), zoomPercent(1)], [50, 76, 100])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
