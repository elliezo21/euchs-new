// 사용가이드(14단계) 테스트 — "다시 보지 않기"·자동 시작 판단·가이드 문구·단축키 표·이력 복원
// node scripts/test-studio-guide.mjs
import { GUIDE_KEYS, readGuideHidden, writeGuideHidden, shouldAutoStart, visibleSteps } from '../src/lib/studioGuide.js'
import { EDITOR_GUIDE_STEPS, ERASE_GUIDE_STEPS, SHORTCUT_GROUPS } from '../src/data/studioEditorGuide.js'
import { createHistory, push, undo, restorePoint, current, list, LABELS } from '../src/lib/studioHistory.js'
import { buildInitialPage, moveItems, readPage } from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(56)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
function memStorage() {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }
}
const brokenStorage = { getItem() { throw new Error('막힘') }, setItem() { throw new Error('막힘') }, removeItem() { throw new Error('막힘') } }

// ── 1. 다시 보지 않기 ──
{
  const s = memStorage()
  eq('처음엔 안 숨김 (편집기·지우기)', [readGuideHidden(s, 'editor'), readGuideHidden(s, 'erase')], [false, false])
  eq('편집기 체크 → 저장됨', writeGuideHidden(s, 'editor', true), true)
  eq('편집기만 숨김 (지우기와 따로)', [readGuideHidden(s, 'editor'), readGuideHidden(s, 'erase')], [true, false])
  eq('저장 키 이름', [...s._m.keys()], [GUIDE_KEYS.editor])
  writeGuideHidden(s, 'erase', true)
  writeGuideHidden(s, 'editor', false)
  eq('체크를 풀면 키를 지움 → 다시 자동', [readGuideHidden(s, 'editor'), readGuideHidden(s, 'erase'), s._m.has(GUIDE_KEYS.editor)], [false, true, false])
  const warn = console.warn; console.warn = () => {}
  eq('저장소를 못 쓰면 → 안 숨김(가이드가 뜸), 저장 실패 false', [readGuideHidden(brokenStorage, 'editor'), writeGuideHidden(brokenStorage, 'editor', true)], [false, false])
  console.warn = warn
  eq('저장소 없음·모르는 종류', [readGuideHidden(null, 'editor'), readGuideHidden(s, 'x'), writeGuideHidden(s, 'x', true)], [false, false, false])
  s.setItem(GUIDE_KEYS.editor, 'true')
  eq("'1'만 숨김으로 친다", readGuideHidden(s, 'editor'), false)
}

// ── 2. 자동 시작 판단 ──
const base = { hidden: false, shown: false, ready: true, blocked: false }
eq('처음·준비 끝·막는 것 없음 → 띄움', shouldAutoStart(base), true)
eq('다시 보지 않기 → 안 띄움', shouldAutoStart({ ...base, hidden: true }), false)
eq('이번에 이미 띄움 → 안 띄움', shouldAutoStart({ ...base, shown: true }), false)
eq('준비 전(불러오는 중) → 안 띄움', shouldAutoStart({ ...base, ready: false }), false)
eq('시작 화면이 떠 있음 → 안 띄움 (닫힌 뒤에)', shouldAutoStart({ ...base, blocked: true }), false)
eq('truthy 값은 믿지 않음', shouldAutoStart({ hidden: 0, shown: 0, ready: 1, blocked: 0 }), false)
eq('화면에 있는 대상만', visibleSteps(EDITOR_GUIDE_STEPS, t => t !== 'reorder').map(s => s.target).includes('reorder'), false)

// ── 3. 문구 ──
const all = [...EDITOR_GUIDE_STEPS, ...ERASE_GUIDE_STEPS]
eq('편집기 가이드 순서 = 진행 단계 순서', EDITOR_GUIDE_STEPS.map(s => s.target),
  ['step-bar', 'one-click', 'photo-add', 'page', 'rail-template', 'reorder', 'preview', 'export', 'guide-button'])
eq('지우기 가이드 3단계', ERASE_GUIDE_STEPS.map(s => s.target), ['erase-tools', 'erase-run', 'erase-done'])
eq('지우기 가이드에 [덮기] 한 줄', ERASE_GUIDE_STEPS.some(s => /\[덮기\]/.test(s.desc + (s.tip || ''))), true)
eq('원클릭 = 곧 추가될 기능 · 지금은 직접 만들기', /곧 추가될 기능이에요/.test(EDITOR_GUIDE_STEPS[1].desc) && /직접 만들기/.test(EDITOR_GUIDE_STEPS[1].title), true)
eq('작업 순서 자유(지운 결과는 사진에 저장)', all.some(s => /사진에 저장/.test(s.tip || '') && /순서는 자유/.test(s.tip || '')), true)
eq('끌어다 놓기 안내', all.some(s => /끌어다 놓/.test(s.desc)), true)
eq('한 칸 1~2문장', all.every(s => (s.desc.match(/[.요]\s|[.요]$/g) || []).length <= 2), true)
eq('고객 문구에 "굽" 없음', all.some(s => /굽|구운/.test(s.title + s.desc + (s.tip || ''))), false)
eq('경쟁사 이름 없음', all.some(s => /미리캔버스|캔바|에디봇|망고보드/.test(s.title + s.desc + (s.tip || ''))), false)
eq('단축키 표: 묶음 3개·줄마다 [키, 하는 일]', SHORTCUT_GROUPS.length === 3 && SHORTCUT_GROUPS.every(g => g.rows.every(r => r.length === 2 && r[0] && r[1])), true)
eq('단축키 표에 새 키(Ctrl+휠·스페이스·?)', ['Ctrl+휠', '스페이스+끌기', '?'].every(k => SHORTCUT_GROUPS.some(g => g.rows.some(r => r[0] === k))), true)

// ── 4. 이력 복원 (페이지 이력만 — 사진 edit는 건드리지 않음) ──
{
  const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o) }
  const rows = deepFreeze([
    { id: 'a', width: 800, height: 600, edit: { v: 2, layers: [{ id: 'l1', type: 'fill', x: 1, y: 1, w: 5, h: 5 }], look: { filter: 'warm' } }, edit_version: 4 },
    { id: 'b', width: 600, height: 800, edit: { v: 2, layers: [] }, edit_version: 0 },
  ])
  const rowsBefore = JSON.stringify(rows)
  const p0 = buildInitialPage(rows)
  const itemA = p0.sections[0].items[0].id
  const p1 = moveItems(p0, [itemA], 0, 30)
  const p2 = moveItems(p1, [itemA], 0, 30)
  let h = createHistory(p0, LABELS.pageInit)
  h = push(h, p1, LABELS.elMove)
  h = push(h, p2, LABELS.elMove)
  const doc = restorePoint(h, 0)
  eq('0번(처음 배치)으로 복원 → 그 페이지 값', JSON.stringify(doc) === JSON.stringify(p0), true)
  eq('복원 값은 복사본 (이력을 바꾸지 않음)', doc !== h.steps[0].edit, true)
  const h2 = push(h, doc, LABELS.historyRestore)
  eq('복원 = 새 이력 한 칸 "이력 복원"', [h2.steps.length, current(h2).label], [4, '이력 복원'])
  eq('Ctrl+Z 한 번 → 복원 전 페이지', JSON.stringify(undo(h2).edit) === JSON.stringify(p2), true)
  eq('지금 단계·없는 단계는 null', [restorePoint(h, h.index), restorePoint(h, 9), restorePoint(h, -1), restorePoint(null, 0)], [null, null, null, null])
  eq('되돌린 뒤 뒤쪽 단계로도 복원 가능', JSON.stringify(restorePoint(undo(h).history, 2)) === JSON.stringify(p2), true)
  eq('복원한 페이지는 readPage 통과', readPage(doc, 'p').problems, [])
  eq('복원한 페이지에 사진 edit가 들어가지 않음', /"(edit|layers|look|edit_version)"/.test(JSON.stringify(doc)), false)
  eq('사진 행(edit·edit_version) 그대로', JSON.stringify(rows), rowsBefore)
  eq('이력 목록 라벨', list(h2).map(s => s.label), ['처음 배치', '이동', '이동', '이력 복원'])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
