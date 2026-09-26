// 시작 화면 ⓪(16단계) 판단 테스트 — node scripts/test-studio-start.mjs
// 띄우는 때 = DB page가 null인 작업만 (usePageSession: readPage → null이면 isDefault). 한 번이라도 저장된 page는 절대 안 띄움
import { shouldShowStart, canStartBlank } from '../src/lib/studioStart.js'
import { readPage, buildInitialPage } from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(50)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
// usePageSession.syncFromServer와 같은 판단: 문제 없이 읽었는데 문서가 없으면 isDefault
function sessionState(raw) {
  const { page, problems } = readPage(raw, 'p')
  return { isDefault: !problems.length && !page, readError: problems.length ? problems[0] : '' }
}
const show = (raw, extra = {}) => shouldShowStart({ hasProject: true, ...sessionState(raw), chosen: false, ...extra })

eq('page null → 띄움', show(null), true)
eq('page undefined → 띄움', show(undefined), true)
eq('구간 있는 page → 안 띄움 (기존 작업 보호)', show(buildInitialPage([{ id: 'a', width: 800, height: 600 }])), false)
eq('구간 0개로 저장된 page → 안 띄움 (사용자가 비운 것)', show({ v: 1, width: 780, gap: 0, parked: [], sections: [] }), false)
eq('모양이 어긋난 page → 안 띄움 (덮어쓰지 않게)', show({ v: 1 }), false)
eq('v가 다른 page → 안 띄움', show({ v: 9, width: 780, gap: 0, parked: [], sections: [] }), false)
eq('시작을 고른 뒤 → 안 띄움', show(null, { chosen: true }), false)
eq('작업을 아직 못 불러옴 → 안 띄움', show(null, { hasProject: false }), false)
eq('isDefault가 true일 때만 (truthy 값 아님)', shouldShowStart({ hasProject: true, isDefault: 1, readError: '', chosen: false }), false)
eq('[빈 페이지에서 시작]: 사진 1장 이상', [canStartBlank(0), canStartBlank(1), canStartBlank(27)], [false, true, true])
eq('[빈 페이지에서 시작]: 숫자가 아니면 막음', [canStartBlank(undefined), canStartBlank(NaN), canStartBlank(1.5)], [false, false, false])
// 빈 페이지에서 시작 = 기본 배치 규칙 그대로 (사진 1장 → 구간 1개, 폭 780 꽉 차게)
{
  const p = buildInitialPage([{ id: 'a', width: 800, height: 600 }, { id: 'b', width: 400, height: 800 }])
  eq('기본 배치: 사진 순서대로 구간', p.sections.map(s => [s.items[0].imageId, s.height]), [['a', 585], ['b', 1560]])
  eq('기본 배치로 만든 page는 저장 뒤 시작 화면 안 띄움', show(p), false)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
