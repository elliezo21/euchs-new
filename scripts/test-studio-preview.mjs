// 미리보기 테스트 (13-2단계) — node scripts/test-studio-preview.mjs
import { previewDisplayScale, previewRenderScale, previewRows, previewOrder, PREVIEW_DEVICES, PREVIEW_NEAR_PX } from '../src/lib/studioPreview.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

eq('기기 폭: PC 780 · 모바일 360', [PREVIEW_DEVICES.pc.width, PREVIEW_DEVICES.mobile.width], [780, 360])
eq('보이는 배율: PC 1 · 모바일 360/780', [previewDisplayScale(780, 'pc'), previewDisplayScale(780, 'mobile')], [1, 0.462])
eq('그리는 배율: 기기 배율 1', [previewRenderScale(780, 'pc', 1), previewRenderScale(780, 'mobile', 1)], [1, 0.462])
eq('그리는 배율: 기기 배율 2', [previewRenderScale(780, 'pc', 2), previewRenderScale(780, 'mobile', 2)], [2, 0.923])
eq('그리는 배율: 기기 배율 3이어도 2배까지, 0.5는 1로', [previewRenderScale(780, 'pc', 3), previewRenderScale(780, 'pc', 0.5), previewRenderScale(780, 'pc', NaN)], [2, 1, 1])

const page = { v: 1, width: 780, gap: 20, parked: [], sections: [
  { id: 'a', height: 1000, bg: '#fff', items: [] }, { id: 'b', height: 500, bg: '#fff', items: [] },
  { id: 'c', height: 800, bg: '#fff', items: [] }, { id: 'd', height: 3000, bg: '#fff', items: [] }, { id: 'e', height: 400, bg: '#fff', items: [] },
] }
const pc = previewRows(page, 1)
eq('PC 자리: 사이 간격 포함', pc.rows.map(r => [r.id, r.no, r.top, r.height]), [['a', 1, 0, 1000], ['b', 2, 1020, 500], ['c', 3, 1540, 800], ['d', 4, 2360, 3000], ['e', 5, 5380, 400]])
eq('PC 전체 높이', pc.height, 5780)
const m = previewRows(page, previewDisplayScale(780, 'mobile'))
eq('모바일 자리: 간격도 같은 배율', [m.rows[1].top, m.rows[1].height, m.height], [471.24, 231, 2670.36])

eq('처음 열면 첫 화면 구간 먼저, 그다음 가까운 구간 (b 120px·c 640px 아래)', previewOrder(pc.rows, 0, 900), ['a', 'b', 'c'])
eq('보이는 구간 여러 개 = 위 → 아래', previewOrder(pc.rows, 900, 900), ['a', 'b', 'c', 'd'])
eq('멀리 있는 구간은 아직 안 그림', previewOrder(pc.rows, 0, 900).includes('e'), false)
eq('스크롤하면 그 자리 구간부터', previewOrder(pc.rows, 5000, 600)[0], 'd')
eq('가까운 순 (위·아래)', previewOrder(pc.rows, 2400, 500, 700), ['d', 'c'])
eq('가까운 거리 기본값', PREVIEW_NEAR_PX, 800)
eq('구간 없음 = 빈 목록', previewOrder([], 0, 900), [])

console.log(`\n${pass} PASS / ${fail} FAIL`)
if (fail) process.exit(1)
