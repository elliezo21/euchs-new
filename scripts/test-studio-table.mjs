// 사이즈표·강조 배지 테스트 (11-2단계) — node scripts/test-studio-table.mjs
import {
  normalizeTableItem, patchTableItem, editTableItem, setTableCell, addTableRow, removeTableRow, addTableCol, removeTableCol,
  cleanCells, cleanCellText, fitCellText, tablePaintSpec, tableHeight, tableRowHeight, tableMinWidth, tableFontOf, isValidTableItem,
  TABLE_TEMPLATES, tableFieldsOf, tableTemplateByKey, tableLabel, TABLE_CELL_MAX, TABLE_MIN_COL_W,
} from '../src/lib/studioTable.js'
import { BADGE_PRESETS, badgePresetByKey, badgeTextParts } from '../src/lib/studioBadge.js'
import {
  readPage, addElementItem, setItemRect, setTableProps, editTable, resizeTableItem, duplicateItems, findItem, isDrawableItem,
  addItemGroup, buildGroupItems, groupMemberIds, emptyPage, addSection, addTextItem, moveItems,
} from '../src/lib/studioPage.js'
import { isValidTextItem } from '../src/lib/studioText.js'
import { isValidShapeItem } from '../src/lib/studioShape.js'
import { isFontKey } from '../src/lib/studioFonts.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
// 가짜 글자 폭: 글자 하나 = 크기의 절반 (굵기·글꼴 무관)
const measure = (s, font) => [...s].length * font.fontSize * 0.5
const tbl = (extra = {}) => normalizeTableItem({ id: 't1', type: 'table', x: 10, y: 20, w: 400, h: 1, rotation: 0, cells: [['사이즈', '가슴'], ['S', '-'], ['M', '-']], ...extra })

// ── 1. 기본값·정리 ──
{
  const t = tbl()
  eq('기본값 (제목 줄·글꼴·크기·색·선·정렬)', [t.headerRow, t.fontFamily, t.fontSize, t.color, t.borderWidth, t.align], [true, 'noto-sans-kr', 18, '#333333', 1, 'center'])
  eq('행 높이 = round(18 × 2.2)', tableRowHeight(t), 40)
  eq('h 자동 = 3행 × 40', t.h, 120)
  eq('그릴 수 있는 표', [isValidTableItem(t), isDrawableItem(t), isValidTableItem({ ...t, cells: [['a'], ['b', 'c']] })], [true, true, false])
  const bad = tbl({ fontSize: 500, borderWidth: 9, color: 'red', headerBg: '#ABCDEF', align: 'justify', headerRow: 'yes', fontFamily: 'comic' })
  eq('잘못된 값 → 범위·기본값', [bad.fontSize, bad.borderWidth, bad.color, bad.headerBg, bad.align, bad.headerRow, bad.fontFamily], [80, 6, '#333333', '#abcdef', 'center', true, 'noto-sans-kr'])
  eq('짧은 행은 빈칸으로 채움', cleanCells([['a', 'b', 'c'], ['d']]), [['a', 'b', 'c'], ['d', '', '']])
  eq('행 20개·열 10개까지', (() => { const c = cleanCells(Array.from({ length: 25 }, () => Array.from({ length: 12 }, () => 'x'))); return [c.length, c[0].length] })(), [20, 10])
  eq('칸 = 한 줄·30자·숫자는 글자로', [cleanCellText('a\nb\tc'), [...cleanCellText('가'.repeat(40))].length, cleanCellText(95), cleanCellText(null)], ['a b c', TABLE_CELL_MAX, '95', ''])
  eq('cells가 없으면 2×2 빈 표', tbl({ cells: 'x' }).cells, [['', ''], ['', '']])
  eq('폭은 최소 열 수 × 24', tbl({ w: 10 }).w, 2 * TABLE_MIN_COL_W)
  eq('공통 칸 그대로 (groupId)', tbl({ groupId: 'g_1' }).groupId, 'g_1')
}

// ── 2. 모양 바꾸기 ──
{
  const t = tbl()
  eq('같은 값이면 입력 그대로', patchTableItem(t, { fontSize: 18, align: 'center' }) === t, true)
  eq('잘못된 값은 무시', patchTableItem(t, { color: 'blue', borderWidth: 'x' }) === t, true)
  const big = patchTableItem(t, { fontSize: 30 })
  eq('글자 크기 30 → 행 66, h = 3 × 66', [tableRowHeight(big), big.h], [66, 198])
  eq('색·정렬·제목 줄 끔', (() => { const n = patchTableItem(t, { color: '#FF0000', align: 'left', headerRow: false }); return [n.color, n.align, n.headerRow] })(), ['#ff0000', 'left', false])
}

// ── 3. 칸·행·열 ──
{
  const t = tbl()
  eq('칸 하나 고치기', setTableCell(t, 1, 1, '92').cells[1], ['S', '92'])
  eq('같은 글자면 입력 그대로', setTableCell(t, 1, 0, 'S') === t, true)
  eq('없는 칸이면 입력 그대로', setTableCell(t, 9, 0, 'x') === t, true)
  const r4 = addTableRow(t)
  eq('행 추가 → 맨 아래 빈 행, h 다시', [r4.cells.length, r4.cells[3], r4.h], [4, ['', ''], 160])
  eq('행 빼기 → 맨 아래', removeTableRow(t).cells, [['사이즈', '가슴'], ['S', '-']])
  eq('1행은 남는다', (() => { let x = tbl({ cells: [['a']] }); return removeTableRow(x) === x })(), true)
  eq('20행이면 더 안 됨', (() => { const x = tbl({ cells: Array.from({ length: 20 }, () => ['a']) }); return addTableRow(x) === x })(), true)
  const c3 = addTableCol(t)
  eq('열 추가 → 맨 오른쪽 빈 열', c3.cells.map(r => r[2]), ['', '', ''])
  eq('열 추가로 최소 폭보다 좁으면 넓힘', addTableCol(tbl({ w: 48 })).w, 3 * TABLE_MIN_COL_W)
  eq('열 빼기 → 맨 오른쪽', removeTableCol(t).cells, [['사이즈'], ['S'], ['M']])
  eq('10열이면 더 안 됨', (() => { const x = tbl({ w: 600, cells: [Array.from({ length: 10 }, () => 'a')] }); return addTableCol(x) === x })(), true)
  eq('editTableItem: 모르는 편집 = 그대로', editTableItem(t, { kind: 'zap' }) === t, true)
  eq('editTableItem: cell', editTableItem(t, { kind: 'cell', r: 0, c: 1, text: '가슴둘레' }).cells[0][1], '가슴둘레')
}

// ── 4. 칸 글자 자르기 ──
{
  const f = { fontFamily: 'noto-sans-kr', fontSize: 20, fontWeight: 400, letterSpacing: 0 } // 글자 하나 = 10px
  eq('들어가면 그대로', fitCellText('가나다', f, 30, measure), '가나다')
  eq('넘치면 뒤를 잘라 …', fitCellText('가나다라마', f, 40, measure), '가나다…')
  eq('자른 뒤 공백은 뺌', fitCellText('ab cdef', f, 40, measure), 'ab…')
  eq('…만 들어가면 …', fitCellText('가나다', f, 12, measure), '…')
  eq('…도 안 들어가면 빈칸', fitCellText('가나다', f, 5, measure), '')
  eq('빈칸은 빈칸', fitCellText('', f, 100, measure), '')
}

// ── 5. 그리기 값 (화면 SVG = 캔버스) ──
{
  const t = tbl({ w: 400 })
  const s = tablePaintSpec(t, measure)
  eq('크기', [s.w, s.h], [400, 120])
  eq('행 바탕 3개 — 제목 줄만 제목 색', s.fills.map(f => f.color), ['#f1f3f6', '#ffffff', '#ffffff'])
  eq('선 = 세로 3 + 가로 4', s.lines.length, 7)
  eq('바깥 선은 안쪽으로 (0 · 199.5 · 399)', s.lines.slice(0, 3).map(l => l.x), [0, 199.5, 399])
  eq('맨 아래 가로선도 안쪽 (y = 119)', s.lines[6].y, 119)
  eq('글자 가운데 정렬 = 칸 가운데, 행 가운데', [s.texts[0].x, s.texts[0].y, s.texts[0].anchor], [100, 20, 'middle'])
  eq('제목 줄 굵게·제목 글자 색 / 나머지 보통', [s.texts[0].font.fontWeight, s.texts[0].color, s.texts[2].font.fontWeight, s.texts[2].color], [700, '#111111', 400, '#333333'])
  eq('굵기는 그 폰트가 가진 값 (도현 = 400)', tableFontOf({ fontFamily: 'do-hyeon', fontSize: 18 }, true).fontWeight, 400)
  const l = tablePaintSpec(tbl({ align: 'left' }), measure)
  eq('왼쪽 정렬 = 칸 왼쪽 + 여백(9) + 선 절반', [l.texts[0].x, l.texts[0].anchor], [9.5, 'start'])
  const r = tablePaintSpec(tbl({ align: 'right' }), measure)
  eq('오른쪽 정렬 = 칸 오른쪽 - 여백 - 선 절반', [r.texts[0].x, r.texts[0].anchor], [190.5, 'end'])
  eq('선 0 = 선 없음', tablePaintSpec(tbl({ borderWidth: 0 }), measure).lines.length, 0)
  eq('빈칸은 글자 없음', tablePaintSpec(tbl({ cells: [['a', ''], ['', 'b']] }), measure).texts.map(x => x.text), ['a', 'b'])
  const narrow = tablePaintSpec(tbl({ w: 60, cells: [['가나다라마바사', 'x']] }), measure) // 칸 30 - 여백 18 - 선 1 = 11px
  eq('좁은 칸 → 자름', narrow.texts[0].text, '…')
}

// ── 6. 기본 틀 ──
{
  eq('기본 틀 3개 (상의·하의·신발)', TABLE_TEMPLATES.map(t => t.label), ['상의', '하의', '신발'])
  const top = normalizeTableItem({ id: 'x', x: 0, y: 0, h: 1, ...tableFieldsOf(tableTemplateByKey('top')) })
  eq('상의 = 5행 × 5열, 제목 줄', [top.cells.length, top.cells[0].length, top.cells[0][0], top.cells[1][0], top.cells[1][1]], [5, 5, '사이즈', 'S', '-'])
  eq('하의 제목 줄', tableTemplateByKey('bottom').cells[0], ['사이즈', '허리', '엉덩이', '허벅지', '총장'])
  eq('신발 제목 줄', tableTemplateByKey('shoes').cells[0], ['사이즈(mm)', '발볼'])
  eq('틀을 꺼내도 원본은 그대로 (복사)', (() => { const f = tableFieldsOf(tableTemplateByKey('top')); f.cells[0][0] = 'X'; return tableTemplateByKey('top').cells[0][0] })(), '사이즈')
  eq('레이어 이름', tableLabel(), '사이즈표')
}

// ── 7. 페이지 조작 ──
const pageWith = items => ({ v: 1, width: 780, gap: 0, parked: [], sections: [{ id: 's1', height: 800, bg: '#ffffff', items }] })
{
  const p0 = addSection(emptyPage(), { height: 800 })
  const sid = p0.sections[0].id
  const r = addElementItem(p0, sid, tableFieldsOf(tableTemplateByKey('top')))
  const it = findItem(r.page, r.itemId).item
  eq('넣기: 가운데, h 자동 (5 × 40)', [it.type, it.w, it.h, it.x, it.y], ['table', 600, 200, 90, 300])
  const t = tbl()
  const p = pageWith([t])
  const rect = findItem(setItemRect(p, 't1', { x: 0, y: 0, w: 20, h: 999 }), 't1').item
  eq('숫자 칸: 폭은 최소 폭 이상, 세로는 자동', [rect.w, rect.h], [48, 120])
  const e = findItem(resizeTableItem(p, 't1', 'e', 50, 80), 't1').item
  eq('오른쪽 손잡이: 폭만 (왼쪽 제자리)', [e.x, e.y, e.w, e.h], [10, 20, 450, 120])
  const w = findItem(resizeTableItem(p, 't1', 'w', 50, 0), 't1').item
  eq('왼쪽 손잡이: 오른쪽 제자리', [w.x, w.w, w.x + w.w], [60, 350, 410])
  const se = findItem(resizeTableItem(p, 't1', 'se', 30, 200), 't1').item
  eq('모서리 손잡이도 폭만', [se.w, se.h, se.y], [430, 120, 20])
  eq('위아래 손잡이는 없음', resizeTableItem(p, 't1', 'n', 0, 50) === p, true)
  eq('최소 폭', findItem(resizeTableItem(p, 't1', 'e', -1000, 0), 't1').item.w, 48)
  eq('잠긴 표는 손잡이 무시', resizeTableItem(pageWith([{ ...t, locked: true }]), 't1', 'e', 50, 0).sections[0].items[0].w, 400)
  const txt = { id: 'x1', type: 'text', text: 'a', x: 0, y: 0, w: 100, h: 30, rotation: 0 }
  const both = setTableProps(pageWith([t, txt]), ['t1', 'x1'], { fontSize: 30, color: '#ff0000' })
  eq('표 속성은 표에만 (글자 그대로)', [findItem(both, 't1').item.h, findItem(both, 't1').item.color, findItem(both, 'x1').item.color], [198, '#ff0000', undefined])
  eq('표 속성: 위쪽 제자리', findItem(both, 't1').item.y, 20)
  const ed = editTable(p, 't1', { kind: 'addRow' })
  eq('편집: 행 추가 → h 다시 (위쪽 제자리)', [findItem(ed, 't1').item.h, findItem(ed, 't1').item.y], [160, 20])
  eq('편집: 잠긴 표도 칸 글자는 고침', findItem(editTable(pageWith([{ ...t, locked: true }]), 't1', { kind: 'cell', r: 1, c: 1, text: '90' }), 't1').item.cells[1][1], '90')
  eq('편집: 없는 편집이면 문서 그대로', editTable(p, 't1', { kind: 'zap' }) === p, true)
  const dup = duplicateItems(p, ['t1'])
  eq('복제: 칸까지 복사', findItem(dup.page, dup.ids[0]).item.cells, t.cells)
  eq('이동은 다른 요소와 같음', findItem(moveItems(p, ['t1'], 5, 5), 't1').item.x, 15)
  const rp = readPage(pageWith([{ id: 't9', type: 'table', x: 0, y: 0, w: 300, h: 5, cells: [['a', 'b'], ['c']], fontSize: 'x' }]), 'p')
  const t9 = rp.page.sections[0].items[0]
  eq('readPage: 표 칸 정리 (모양·h·기본값)', [t9.cells, t9.fontSize, t9.h, t9.rotation], [[['a', 'b'], ['c', '']], 18, 80, 0])
}

// ── 8. 강조 배지 (도형 + 글자 그룹) ──
{
  eq('배지 6~8개', BADGE_PRESETS.length >= 6 && BADGE_PRESETS.length <= 8, true)
  eq('키가 모두 다름', new Set(BADGE_PRESETS.map(b => b.key)).size, BADGE_PRESETS.length)
  eq('배지마다 도형 1개 + 글자 1~2개 (도형이 맨 뒤)', BADGE_PRESETS.every(b => {
    const shapes = b.parts.filter(p => p.type === 'shape').length, texts = b.parts.filter(p => p.type === 'text').length
    return shapes === 1 && texts >= 1 && texts <= 2 && b.parts[0].type === 'shape'
  }), true)
  eq('글꼴은 허용 목록만', BADGE_PRESETS.every(b => badgeTextParts(b).every(p => isFontKey(p.fontFamily))), true)
  for (const b of BADGE_PRESETS) {
    const items = buildGroupItems(b, b.parts, measure)
    const inside = items.every(it => it.x >= 0 && it.y >= 0 && it.x + it.w <= b.w && it.y + it.h <= b.h)
    const valid = items.every(it => isValidShapeItem(it) || isValidTextItem(it))
    eq(`배지 "${b.label}": 요소가 배지 네모 안·정상`, [items.length, inside, valid], [b.parts.length, true, true])
  }
  const b = badgePresetByKey('sale-star')
  const items = buildGroupItems(b, b.parts, measure)
  eq('글자 세로 가운데 = cy (30%: 100)', Math.round(items[1].y + items[1].h / 2), 100)
  eq('글자 가로 가운데', items[1].x + items[1].w / 2, b.w / 2)

  const p0 = addSection(emptyPage(), { height: 600 })
  const sid = p0.sections[0].id
  const withText = addTextItem(p0, sid, { text: '먼저 있던 글자', w: 300 }, measure).page
  const r = addItemGroup(withText, sid, b, b.parts, measure)
  const sec = r.page.sections[0]
  const added = r.ids.map(id => findItem(r.page, id).item)
  eq('배지 넣기: 요소 3개, 모두 같은 groupId', [r.ids.length, new Set(added.map(it => it.groupId)).size, typeof added[0].groupId], [3, 1, 'string'])
  eq('배지 넣기: 맨 앞(배열 끝)에, 도형이 글자보다 뒤', sec.items.slice(-3).map(it => it.type), ['shape', 'text', 'text'])
  eq('배지 넣기: 구간 가운데', [added[0].x, added[0].y], [290, 205])
  eq('배지 = 한 그룹 (구성원 누르면 전체)', groupMemberIds(r.page, r.ids[2]), r.ids)
  eq('배지 새 id', new Set([...r.ids, ...withText.sections[0].items.map(i => i.id)]).size, 4)
  const again = addItemGroup(r.page, sid, b, b.parts, measure)
  eq('두 번 넣으면 다른 그룹', findItem(again.page, again.ids[0]).item.groupId !== added[0].groupId, true)
  eq('readPage 뒤에도 그룹 그대로', groupMemberIds(readPage(JSON.parse(JSON.stringify(r.page)), 'p').page, r.ids[0]), r.ids)
  const one = addItemGroup(p0, sid, { w: 100, h: 50 }, [{ type: 'shape', shape: 'rect', x: 0, y: 0, w: 100, h: 50 }], measure)
  eq('요소 1개면 그룹 없음', 'groupId' in findItem(one.page, one.ids[0]).item, false)
  eq('없는 구간이면 그대로', addItemGroup(p0, 'nope', b, b.parts, measure).page === p0, true)
  const small = addSection(emptyPage(), { height: 100 })
  const rs = addItemGroup(small, small.sections[0].id, b, b.parts, measure)
  eq('배지가 구간보다 크면 가운데 (다른 넣기와 같은 규칙, y = (100-190)/2)', findItem(rs.page, rs.ids[0]).item.y, -45)
}

console.log(`\n${pass} PASS / ${fail} FAIL`)
if (fail) process.exit(1)
