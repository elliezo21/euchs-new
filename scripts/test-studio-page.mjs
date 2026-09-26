// 페이지 문서 테스트 — node scripts/test-studio-page.mjs
import {
  emptyPage, buildInitialPage, pageProblems, readPage, checkPageSize, pageBytes, layoutSections, findItem, pageImageIds,
  firstItemOfImage, addSection, removeSection, moveSection, setSectionHeight, setGap, addItem, removeItem, moveItem,
  reorderItem, parkItem, unparkImage, newImageItem, clampItemPosition, fitZoom, duplicateSection, setSectionBg, reorderSections, moveInOrder,
  PAGE_VERSION, PAGE_WIDTH, PAGE_MAX_BYTES, SECTION_BG, SECTION_MAX, SECTION_H_MIN, SECTION_H_MAX, GAP_MAX,
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
    { type: 'image', imageId: 'a', x: 0, y: 0, w: 780, h: 780, rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false })
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

// ── 5-1. 구간 다루기 경계값 (8-1) ──
{
  const p = buildInitialPage(IMGS)
  const [s0, s1, s2] = p.sections.map(s => s.id)
  // 추가
  eq('추가: 높이 기본 400·흰 배경·빈 구간', (({ height, bg, items }) => ({ height, bg, items }))(addSection(p, { at: 0 }).sections[0]), { height: 400, bg: SECTION_BG, items: [] })
  eq('추가: 높이 최소 20 / 최대 20000 경계', [addSection(p, { height: SECTION_H_MIN }) !== p, addSection(p, { height: SECTION_H_MAX }) !== p, addSection(p, { height: SECTION_H_MIN - 1 }) === p, addSection(p, { height: SECTION_H_MAX + 1 }) === p], [true, true, true, true])
  eq('추가: 위치가 범위 밖이면 끝으로 맞춤', [addSection(p, { at: -5 }).sections[0].items, addSection(p, { at: 99 }).sections[3].items], [[], []])
  const full = { ...p, sections: Array.from({ length: SECTION_MAX }, (_, i) => ({ id: `z${i}`, height: 20, bg: '#ffffff', items: [] })) }
  eq(`추가: ${SECTION_MAX}개면 그대로`, addSection(full) === full, true)
  // 삭제
  eq('삭제: 없는 구간 → 그대로', removeSection(p, 'nope') === p, true)
  eq('삭제: 마지막 하나도 지울 수 있음(사진은 parked)', (() => { let q = removeSection(p, s0); q = removeSection(q, s1); q = removeSection(q, s2); return [q.sections.length, q.parked] })(), [0, ['a', 'b', 'c']])
  // 순서
  eq('위로: 맨 위는 그대로', moveSection(p, s0, -1) === p, true)
  eq('아래로: 맨 아래는 그대로', moveSection(p, s2, 3) === p, true)
  eq('아래로 한 칸', moveSection(p, s0, 1).sections.map(s => s.id), [s1, s0, s2])
  eq('없는 구간·정수 아님 → 그대로', [moveSection(p, 'nope', 1) === p, moveSection(p, s0, 1.5) === p], [true, true])
  // 높이
  eq('높이: 20·20000 경계', [setSectionHeight(p, s0, 20).sections[0].height, setSectionHeight(p, s0, 20000).sections[0].height], [20, 20000])
  eq('높이: 범위 밖·소수·같은 값 → 그대로', [setSectionHeight(p, s0, 19) === p, setSectionHeight(p, s0, 20001) === p, setSectionHeight(p, s0, 300.5) === p, setSectionHeight(p, s0, 780) === p], [true, true, true, true])
  eq('높이: 요소는 그대로 (넘치는 곳은 잘려 보임)', setSectionHeight(p, s0, 100).sections[0].items[0].h, 780)
  // 간격
  eq('간격: 0·400 경계', [setGap(setGap(p, 5), 0).gap, setGap(p, GAP_MAX).gap], [0, 400])
  eq('간격: 범위 밖·소수·같은 값 → 그대로', [setGap(p, -1) === p, setGap(p, 401) === p, setGap(p, 2.5) === p, setGap(p, 0) === p], [true, true, true, true])
  // 복제
  const d = duplicateSection(p, s0)
  const copy = d.page.sections[1]
  eq('복제: 바로 아래, 새 id', [d.page.sections.length, copy.id === d.sectionId, copy.id !== s0, d.page.sections[2].id], [4, true, true, s1])
  eq('복제: 높이·배경·요소 모양 같고 요소 id는 새로', [copy.height, copy.bg, copy.items[0].imageId, copy.items[0].id !== p.sections[0].items[0].id], [780, SECTION_BG, 'a', true])
  eq('복제: 검사 통과(id 중복 없음)', pageProblems(d.page), [])
  const lockedP = { ...p, sections: [{ ...p.sections[0], items: [{ ...p.sections[0].items[0], locked: true }] }, ...p.sections.slice(1)] }
  const dl = duplicateSection(lockedP, s0).page
  eq('복제: 잠긴 요소는 잠금 풀림, 원본은 그대로', [dl.sections[1].items[0].locked, dl.sections[0].items[0].locked], [false, true])
  eq('복제: 없는 구간 → 그대로', duplicateSection(p, 'nope').page === p, true)
  eq(`복제: ${SECTION_MAX}개면 그대로`, (r => [r.page === full, r.sectionId])(duplicateSection(full, 'z0')), [true, null])
  eq('복제: 입력 문서는 안 바뀜', p.sections.length, 3)
  // 배경색
  eq('배경색: #rrggbb → 소문자로', setSectionBg(p, s0, '#1A2B3C').sections[0].bg, '#1a2b3c')
  eq('배경색: 다른 구간은 같은 객체', setSectionBg(p, s0, '#000000').sections[1] === p.sections[1], true)
  eq('배경색: 같은 값·짧은 색·이름·없는 구간 → 그대로', [setSectionBg(p, s0, '#FFFFFF') === p, setSectionBg(p, s0, '#fff') === p, setSectionBg(p, s0, 'red') === p, setSectionBg(p, 'nope', '#000000') === p], [true, true, true, true])
}

// ── 5-2. 구간 순서 한 번에 (8-2 [순서 변경]) ──
{
  const p = buildInitialPage(IMGS)
  const [s0, s1, s2] = p.sections.map(s => s.id)
  const r = reorderSections(p, [s2, s0, s1])
  eq('새 순서대로', r.sections.map(s => s.id), [s2, s0, s1])
  eq('구간 객체는 그대로(내용 안 바뀜)', r.sections[0] === p.sections[2], true)
  eq('같은 순서 → 그대로', reorderSections(p, [s0, s1, s2]) === p, true)
  eq('빠진 id → 그대로', reorderSections(p, [s2, s0]) === p, true)
  eq('남는(모르는) id → 그대로', reorderSections(p, [s2, s0, s1, 'x']) === p, true)
  eq('모르는 id로 바꿔치기 → 그대로', reorderSections(p, [s2, s0, 'x']) === p, true)
  eq('중복 → 그대로', reorderSections(p, [s0, s0, s1]) === p, true)
  eq('배열 아님 → 그대로', reorderSections(p, null) === p, true)
  eq('빈 페이지 + 빈 배열 → 그대로', (e => reorderSections(e, []) === e)(emptyPage()), true)
  eq('입력 문서는 안 바뀜', p.sections.map(s => s.id), [s0, s1, s2])
  // 순서 목록 안에서 옮기기
  const L = ['a', 'b', 'c', 'd']
  eq('옮기기: 맨 앞으로', moveInOrder(L, 'c', 0), ['c', 'a', 'b', 'd'])
  eq('옮기기: 뒤로', moveInOrder(L, 'a', 2), ['b', 'c', 'a', 'd'])
  eq('옮기기: 범위 밖은 끝으로', [moveInOrder(L, 'b', 99), moveInOrder(L, 'c', -3)], [['a', 'c', 'd', 'b'], ['c', 'a', 'b', 'd']])
  eq('옮기기: 같은 자리·없는 id·정수 아님 → 그대로', [moveInOrder(L, 'b', 1) === L, moveInOrder(L, 'x', 0) === L, moveInOrder(L, 'a', 1.5) === L], [true, true, true])
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
