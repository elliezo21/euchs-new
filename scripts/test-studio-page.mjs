// 페이지 문서 테스트 — node scripts/test-studio-page.mjs
import {
  emptyPage, buildInitialPage, pageProblems, readPage, checkPageSize, pageBytes, layoutSections, findItem, pageImageIds,
  firstItemOfImage, addSection, removeSection, moveSection, setSectionHeight, setGap, addItem, removeItem, moveItem,
  reorderItem, parkItem, unparkImage, newImageItem, clampItemPosition, fitZoom,
  PAGE_VERSION, PAGE_WIDTH, PAGE_MAX_BYTES, SECTION_BG,
} from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const quiet = fn => { const e = console.error; console.error = () => {}; try { return fn() } finally { console.error = e } }

const IMGS = [
  { id: 'a', width: 1920, height: 1920 },
  { id: 'b', width: 800, height: 1200 },
  { id: 'c', width: 1000, height: 333 },
]

// ── 1. 빈 문서·기본 배치 ──
{
  eq('빈 문서', emptyPage(), { v: 1, width: 780, gap: 0, sections: [], parked: [] })
  eq('빈 문서 검사 통과', pageProblems(emptyPage()), [])
  const p = buildInitialPage(IMGS)
  eq('기본 배치: 사진 1장 = 구간 1개', p.sections.length, 3)
  eq('구간 높이 = 780 × 세로/가로', p.sections.map(s => s.height), [780, 1170, 260])
  eq('사진이 구간을 꽉 채움', p.sections.map(s => { const it = s.items[0]; return [it.x, it.y, it.w, it.h] }), [[0, 0, 780, 780], [0, 0, 780, 1170], [0, 0, 780, 260]])
  eq('순서 = 목록 순서', pageImageIds(p), ['a', 'b', 'c'])
  eq('아이템 기본값', (({ id, ...r }) => r)(p.sections[0].items[0]),
    { type: 'image', imageId: 'a', x: 0, y: 0, w: 780, h: 780, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false })
  eq('구간 배경 기본 흰색', p.sections.every(s => s.bg === SECTION_BG), true)
  eq('기본 배치 검사 통과', pageProblems(p), [])
  eq('주소는 저장하지 않음 (imageId만)', JSON.stringify(p).includes('http'), false)
  const q = quiet(() => buildInitialPage([{ id: 'x', width: null, height: 10 }, IMGS[0]]))
  eq('크기 모르는 사진은 뺌', pageImageIds(q), ['a'])
  const ly = layoutSections({ ...p, gap: 10 })
  eq('구간 위치 (gap 포함)', [ly.rows.map(r => r.top), ly.total], [[0, 790, 1970], 2230])
}

// ── 2. 검사: 'v' 없는 문서 거부 ──
{
  const p = buildInitialPage(IMGS)
  const { v, ...noV } = p
  eq("'v' 없는 문서 거부", pageProblems(noV), ['v 없음'])
  eq("'v' 없는 문서 readPage → null", quiet(() => readPage(noV, 'p1')).page, null)
  eq('v가 다름', pageProblems({ ...p, v: 2 }), ['v가 1이 아님: 2'])
  eq('배열 거부', pageProblems([]), ['page가 객체가 아님'])
  eq('null은 빈 페이지 (문제 아님)', readPage(null, 'p1'), { page: null, problems: [] })
  const r = readPage(p, 'p1')
  eq('정상 문서 readPage = 복사본', [r.problems, r.page !== p, JSON.stringify(r.page) === JSON.stringify(p)], [[], true, true])
  eq('구간 높이 이상', pageProblems({ ...p, sections: [{ ...p.sections[0], height: 0 }] }), [`구간 0: height가 양의 정수가 아님 0`])
  eq('아이템 id 중복', pageProblems({ ...p, sections: [p.sections[0], { ...p.sections[1], items: p.sections[0].items }] }), [`구간 1: 아이템 id 중복 ${p.sections[0].items[0].id}`])
}

// ── 3. 크기 제한 ──
{
  const p = buildInitialPage(IMGS)
  const s = checkPageSize(p)
  eq('작은 문서 저장 가능', [s.ok, s.bytes === pageBytes(p), s.max], [true, true, PAGE_MAX_BYTES])
  const big = { ...p, sections: [{ ...p.sections[0], bg: 'x'.repeat(PAGE_MAX_BYTES) }] }
  eq('1,000,000바이트 넘으면 저장 막음', checkPageSize(big).ok, false)
  const k = { ...p, sections: [{ ...p.sections[0], bg: '가'.repeat(340000) }] } // 한글 3바이트
  eq('바이트는 UTF-8 기준', checkPageSize(k).ok, false)
  // DB 실측 (2026-09-25): select octet_length('{"v":1,"a":[1,2,{"x":"가"}],"bb":{}}'::jsonb::text) → 45
  eq('DB와 같은 기준 (jsonb 글자 공백 포함)', pageBytes({ v: 1, a: [1, 2, { x: '가' }], bb: {} }), 45)
}

// ── 4. 빼두기 후 다시 넣기 ──
{
  const p = buildInitialPage(IMGS)
  const itemB = p.sections[1].items[0].id
  const parked = parkItem(p, itemB)
  eq('빼두기: parked에 들어감', parked.parked, ['b'])
  eq('빼두기: 페이지에서 빠짐', pageImageIds(parked), ['a', 'c'])
  eq('빼두기: 구간은 남음', parked.sections.length, 3)
  eq('빼두기: 입력 문서는 그대로', [p.parked, pageImageIds(p)], [[], ['a', 'b', 'c']])
  const back = unparkImage(parked, IMGS[1])
  eq('다시 넣기: parked에서 빠짐', back.parked, [])
  eq('다시 넣기: 맨 아래 새 구간', [back.sections.length, pageImageIds(back)], [4, ['a', 'c', 'b']])
  eq('다시 넣기: 새 구간 높이', back.sections[3].height, 1170)
  const into = unparkImage(parked, IMGS[1], parked.sections[1].id)
  eq('다시 넣기: 고른 구간에', [into.sections.length, into.sections[1].items.map(it => it.imageId), into.parked], [3, ['b'], []])
  eq('parked에 없는 사진은 무시', unparkImage(p, IMGS[0]) === p, true)
  // 같은 사진을 두 번 넣었다가 하나만 빼면 parked에 넣지 않는다
  const twice = addItem(p, p.sections[0].id, newImageItem('b', 0, 0, 100, 100))
  eq('같은 사진이 남아 있으면 parked 아님', parkItem(twice, itemB).parked, [])
  eq('addItem은 parked에서 뺀다', addItem(parked, p.sections[0].id, newImageItem('b', 0, 0, 10, 10)).parked, [])
  eq('구간 삭제 → 사진은 parked로', removeSection(p, p.sections[0].id).parked, ['a'])
}

// ── 5. 구간 추가·삭제·이동·높이·간격 ──
{
  const p = buildInitialPage(IMGS)
  const a1 = addSection(p, { height: 300, at: 1 })
  eq('구간 추가 (위치 지정)', [a1.sections.length, a1.sections[1].height, a1.sections[1].items], [4, 300, []])
  eq('구간 추가 (맨 아래)', addSection(p).sections.length, 4)
  eq('구간 높이 범위 밖은 무시', addSection(p, { height: 5 }) === p, true)
  eq('구간 삭제', pageImageIds(removeSection(p, p.sections[1].id)), ['a', 'c'])
  eq('구간 이동', pageImageIds(moveSection(p, p.sections[0].id, 2)), ['b', 'c', 'a'])
  eq('같은 자리 이동은 그대로', moveSection(p, p.sections[0].id, 0) === p, true)
  eq('구간 높이 바꾸기', setSectionHeight(p, p.sections[0].id, 500).sections[0].height, 500)
  eq('구간 간격', setGap(p, 20).gap, 20)
}

// ── 6. 아이템 이동·순서·삭제 ──
{
  const p = buildInitialPage(IMGS)
  const it = p.sections[0].items[0]
  const m = moveItem(p, it.id, 30.4, -50.6)
  eq('이동 (정수로)', [findItem(m, it.id).item.x, findItem(m, it.id).item.y], [30, -51])
  eq('이동 뒤 다른 구간은 같은 객체', m.sections[1] === p.sections[1], true)
  const far = moveItem(p, it.id, 5000, 5000)
  eq('구간 밖으로 사라지지 않음 (40px 남김)', [findItem(far, it.id).item.x, findItem(far, it.id).item.y], [740, 740])
  eq('작은 사진은 구간 안 어디든', clampItemPosition({ w: 100, h: 100 }, { height: 400 }, 780, 680, 300), { x: 680, y: 300 })
  eq('같은 위치는 그대로', moveItem(p, it.id, 0, 0) === p, true)
  const locked = { ...p, sections: [{ ...p.sections[0], items: [{ ...it, locked: true }] }, ...p.sections.slice(1)] }
  eq('잠긴 아이템은 안 옮김', moveItem(locked, it.id, 10, 10) === locked, true)
  const two = addItem(p, p.sections[0].id, newImageItem('b', 0, 0, 100, 100))
  const second = two.sections[0].items[1].id
  eq('맨 뒤로', reorderItem(two, second, 'back').sections[0].items.map(x => x.imageId), ['b', 'a'])
  eq('맨 앞은 이미 맨 앞', reorderItem(two, second, 'front') === two, true)
  eq('아이템 삭제', removeItem(two, second).sections[0].items.length, 1)
  eq('첫 아이템 찾기', firstItemOfImage(p, 'c'), p.sections[2].items[0].id)
}

// ── 7. 배율 ──
{
  eq('맞춤: 넓은 화면은 100%', fitZoom(1400, 780, 96), 1)
  eq('맞춤: 좁으면 줄임', fitZoom(856, 780, 96), 0.85)
  eq('맞춤: 최소 20%', fitZoom(100, 780, 96), 0.2)
}

console.log(`\n${pass} 통과 / ${fail} 실패  (page v${PAGE_VERSION}, 폭 ${PAGE_WIDTH})`)
if (fail) process.exit(1)
