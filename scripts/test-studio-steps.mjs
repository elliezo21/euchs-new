// 진행 단계 표시줄 테스트 (6-3) — node scripts/test-studio-steps.mjs
import { STUDIO_STEPS, stepInfo, readStep, writeStep, stepKey } from '../src/lib/studioSteps.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(40)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
function memStorage() {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)) }, m }
}
const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }

eq('단계 순서·이름', STUDIO_STEPS.map(s => `${s.no} ${s.label}`), ['1 사진 다듬기', '2 페이지 꾸미기', '3 내보내기'])
eq('단계별 왼쪽 패널', STUDIO_STEPS.map(s => s.panel), ['photo', 'section', null])
eq('③은 곧 열려요', [stepInfo(3).soon, !!stepInfo(1).soon], [true, false])
eq('모르는 단계 → ①', stepInfo(9).no, 1)
eq('고객 문구에 "굽" 없음', STUDIO_STEPS.some(s => /굽|구운/.test(s.label + s.guide)), false)

const st = memStorage()
eq('처음 열면 ①', readStep(st, 'p1'), 1)
eq('기억 → 다시 읽기', [writeStep(st, 'p1', 2), readStep(st, 'p1')], [true, 2])
eq('작업마다 따로', readStep(st, 'p2'), 1)
eq('키 모양', stepKey('p1'), 'studio-step:p1')
eq('이상한 값 저장 안 함', [writeStep(st, 'p1', 7), readStep(st, 'p1')], [false, 2])
st.m.set(stepKey('p3'), 'abc')
eq('이상한 기억 → ①', readStep(st, 'p3'), 1)
eq('저장소를 못 쓰면 ①, 저장 false (화면은 그대로)', [readStep(broken, 'p1'), writeStep(broken, 'p1', 2)], [1, false])
eq('저장소 없음 → ①', readStep(null, 'p1'), 1)

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
