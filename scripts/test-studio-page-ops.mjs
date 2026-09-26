// 페이지 요소 공통 조작 테스트 (6-1단계) — node scripts/test-studio-page-ops.mjs
import {
  readPage, normalizeItem, normAngle, itemBounds, moveItems, resizeRect, setItemRect, setRotation, rotateBy, flipItems,
  setOpacity, setLocked, setHidden, alignItems, reorderItems, removeItems, copyItems, pasteItems, duplicateItems,
  sectionItemIds, itemsInBox, snapMove, findItem, ITEM_MIN_SIZE, PASTE_OFFSET,
  itemStyleOf, setItemStyle, replaceItemImage, itemIdsOfImage, insertImageNear, dropImageAt,
  groupItems, ungroupItems, groupMemberIds, expandToGroups, anyGrouped, groupCheck, cleanGroups, reorderItemTo, duplicateSection,
} from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const base = { rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }
const img = (id, imageId, x, y, w, h, extra = {}) => ({ id, type: 'image', imageId, x, y, w, h, ...base, ...extra })
const P = {
  v: 1, width: 780, gap: 0, parked: [],
  sections: [
    { id: 's1', height: 400, bg: '#ffffff', items: [img('a', 'A', 0, 0, 100, 100), img('b', 'B', 200, 50, 100, 50), img('L', 'LL', 300, 300, 50, 50, { locked: true })] },
    { id: 's2', height: 300, bg: '#ffffff', items: [img('c', 'C', 10, 10, 80, 80)] },
  ],
}
const snapshot = JSON.stringify(P)
const it = (p, id) => findItem(p, id)?.item
const rect = (p, id) => { const x = it(p, id); return x && [x.x, x.y, x.w, x.h] }
const order = (p, sid) => p.sections.find(s => s.id === sid).items.map(x => x.id)
const r2 = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 100) / 100]))

// ── 1. 예전 페이지 호환 ──
{
  const old = { v: 1, width: 780, gap: 0, parked: [], sections: [{ id: 's', height: 100, bg: '#fff', items: [{ id: 'i', type: 'image', imageId: 'x', x: 0, y: 0, w: 10, h: 10, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }] }] }
  eq('예전 페이지(회전 칸 없음) → rotation 0으로 읽음', readPage(old, 'p').page.sections[0].items[0].rotation, 0)
  eq('원본 문서는 바꾸지 않음', 'rotation' in old.sections[0].items[0], false)
  eq('잘못된 값은 기본값 (투명도 "x" → 1, locked 없음 → false)', (({ opacity, locked, hidden }) => ({ opacity, locked, hidden }))(normalizeItem({ id: 'i', opacity: 'x' })), { opacity: 1, locked: false, hidden: false })
  eq('있는 값은 그대로', normalizeItem({ id: 'i', rotation: 30, opacity: 0.5, flipX: true }).rotation, 30)
}

// ── 2. 각도·차지하는 네모 ──
{
  eq('각도 270 → -90', normAngle(270), -90)
  eq('각도 -180 → 180', normAngle(-180), 180)
  eq('각도 360 → 0', normAngle(360), 0)
  eq('각도 -0.004 → 0 (-0 아님)', Object.is(normAngle(-0.004), 0), true)
  eq('90° 돌린 100×50 → 차지하는 네모 50×100', r2(itemBounds({ x: 0, y: 0, w: 100, h: 50, rotation: 90 })), { x: 25, y: -25, w: 50, h: 100 })
}

// ── 3. 이동 ──
{
  const p = moveItems(P, ['a', 'L'], 10, 5)
  eq('이동: a (10,5)', rect(p, 'a'), [10, 5, 100, 100])
  eq('잠긴 요소는 안 움직임', rect(p, 'L'), [300, 300, 50, 50])
  eq('구간 밖으로 사라지지 않게 (최소 40px 남김)', rect(moveItems(P, ['a'], -500, 0), 'a'), [-60, 0, 100, 100])
  eq('잠긴 것만 고르면 문서 그대로', moveItems(P, ['L'], 5, 5) === P, true)
  eq('0 이동 → 문서 그대로', moveItems(P, ['a'], 0, 0) === P, true)
  const full = { ...P, sections: [{ id: 'f', height: 780, bg: '#fff', items: [img('F', 'FF', 0, 0, 780, 780)] }] }
  let q = full
  for (let i = 0; i < 3; i++) q = moveItems(q, ['F'], 10, 0) // Shift+→ 세 번
  eq('페이지 폭 꽉 찬 요소도 방향키로 옮겨짐 (막지 않음)', rect(q, 'F'), [30, 0, 780, 780])
  eq('…끝까지 가도 최소 40px은 구간 안에 남음 (드래그와 같은 규칙)', rect(moveItems(full, ['F'], 5000, 0), 'F'), [740, 0, 780, 780])
}

// ── 4. 크기 조절 ──
{
  const R = { x: 0, y: 0, w: 100, h: 100 }
  eq('오른쪽 아래 손잡이 (+20,+10)', resizeRect(R, 0, 'se', 20, 10), { x: 0, y: 0, w: 120, h: 110 })
  eq('비율 유지 → 120×120', resizeRect(R, 0, 'se', 20, 10, { keepRatio: true }), { x: 0, y: 0, w: 120, h: 120 })
  eq('왼쪽 위 손잡이 (+10,+10) → 오른쪽 아래 고정', resizeRect(R, 0, 'nw', 10, 10), { x: 10, y: 10, w: 90, h: 90 })
  eq('오른쪽 변 손잡이 → 세로 그대로', resizeRect(R, 0, 'e', 30, 40), { x: 0, y: 0, w: 130, h: 100 })
  eq('90° 돌린 요소 오른쪽 변을 아래로 20 → 길이 +20, 반대쪽 고정', resizeRect({ x: 0, y: 0, w: 100, h: 50 }, 90, 'e', 0, 20), { x: -10, y: 10, w: 120, h: 50 })
  eq(`최소 크기 ${ITEM_MIN_SIZE}`, resizeRect(R, 0, 'se', -200, 0), { x: 0, y: 0, w: 10, h: 100 })
  eq('비율 유지 + 최소', resizeRect({ x: 0, y: 0, w: 100, h: 50 }, 0, 'se', -99, 0, { keepRatio: true }), { x: 0, y: 0, w: 20, h: 10 })
  eq('숫자 입력: 가로 5 → 최소 10', rect(setItemRect(P, 'a', { w: 5 }), 'a'), [0, 0, 10, 100])
  eq('숫자 입력: x·y·가로·세로', rect(setItemRect(P, 'b', { x: 11.4, y: 22.6, w: 150, h: 60 }), 'b'), [11, 23, 150, 60])
  eq('잠긴 요소 크기 안 바뀜', setItemRect(P, 'L', { w: 200 }) === P, true)
}

// ── 5. 회전·뒤집기·투명도·잠금·숨기기 ──
{
  eq('각도 정하기 400 → 40', it(setRotation(P, ['a'], 400), 'a').rotation, 40)
  eq('90° 돌리기 두 번 → 180', it(rotateBy(rotateBy(P, ['a'], 90), ['a'], 90), 'a').rotation, 180)
  eq('잠긴 요소는 안 돌아감', rotateBy(P, ['L'], 90) === P, true)
  const f = flipItems(P, ['a', 'b'], 'x')
  eq('좌우 뒤집기', [it(f, 'a').flipX, it(f, 'b').flipX, it(f, 'a').flipY], [true, true, false])
  eq('한 번 더 → 원래대로', it(flipItems(f, ['a'], 'x'), 'a').flipX, false)
  eq('상하 뒤집기', it(flipItems(P, ['a'], 'y'), 'a').flipY, true)
  eq('투명도 1.7 → 1 (그대로라 문서 같음)', setOpacity(P, ['a'], 1.7) === P, true)
  eq('투명도 0.456 → 0.46', it(setOpacity(P, ['a'], 0.456), 'a').opacity, 0.46)
  eq('잠긴 요소도 투명도는 바뀜', it(setOpacity(P, ['L'], 0.5), 'L').opacity, 0.5)
  eq('잠금 풀기', it(setLocked(P, ['L'], false), 'L').locked, false)
  eq('숨기기', it(setHidden(P, ['a'], true), 'a').hidden, true)
}

// ── 6. 정렬 ──
{
  eq('한 개 오른쪽 정렬 = 구간 오른쪽', rect(alignItems(P, ['a'], 'right'), 'a'), [680, 0, 100, 100])
  eq('한 개 세로 가운데 = 구간 가운데', rect(alignItems(P, ['a'], 'vcenter'), 'a'), [0, 150, 100, 100])
  const t = alignItems(P, ['a', 'b'], 'top')
  eq('여러 개 위쪽 = 묶음 위쪽', [rect(t, 'a')[1], rect(t, 'b')[1]], [0, 0])
  const h = alignItems(P, ['a', 'b'], 'hcenter')
  eq('여러 개 가로 가운데 = 묶음 가운데(150)', [rect(h, 'a')[0], rect(h, 'b')[0]], [100, 100])
  eq('잠긴 요소는 안 움직임', alignItems(P, ['L'], 'left') === P, true)
  const g = alignItems(P, ['a', 'c'], 'right')
  eq('구간이 다르면 구간마다 따로 (한 개씩 = 구간 기준)', [rect(g, 'a')[0], rect(g, 'c')[0]], [680, 700])
}

// ── 7. 순서 ──
{
  eq('맨 앞', order(reorderItems(P, ['a'], 'front'), 's1'), ['b', 'L', 'a'])
  eq('맨 뒤', order(reorderItems(P, ['L'], 'back'), 's1'), ['L', 'a', 'b'])
  eq('한 칸 앞', order(reorderItems(P, ['a'], 'forward'), 's1'), ['b', 'a', 'L'])
  eq('한 칸 뒤', order(reorderItems(P, ['L'], 'backward'), 's1'), ['a', 'L', 'b'])
  eq('이미 맨 앞 → 문서 그대로', reorderItems(P, ['L'], 'forward') === P, true)
  eq('여러 개 맨 앞 (서로 순서 유지)', order(reorderItems(P, ['a', 'b'], 'front'), 's1'), ['L', 'a', 'b'])
}

// ── 8. 삭제·복사·붙여넣기·잘라내기·복제 ──
{
  const d = removeItems(P, ['a', 'L'])
  eq('삭제: 잠긴 것은 남음', order(d, 's1'), ['b', 'L'])
  eq('지운 사진은 parked로 (사진을 잃지 않음)', d.parked, ['A'])
  eq('잠긴 것만 → 문서 그대로', removeItems(P, ['L']) === P, true)
  const clip = copyItems(P, ['a', 'L'])
  eq('복사: 페이지 순서·구간 기억', clip.map(c => [c.sectionId, c.item.id]), [['s1', 'a'], ['s1', 'L']])
  const ps = pasteItems(P, 's2', clip)
  eq('다른 구간에 붙여넣기: 2개 생김', [order(ps.page, 's2').length, ps.ids.length], [3, 2])
  const n1 = it(ps.page, ps.ids[0])
  eq(`붙여넣은 것: 새 id · 옆으로 ${PASTE_OFFSET} · 같은 사진`, [n1.id !== 'a', n1.x, n1.y, n1.imageId], [true, 20, 20, 'A'])
  eq('잠긴 것을 붙여넣으면 잠금 풀림', it(ps.page, ps.ids[1]).locked, false)
  eq('없는 구간 → 그대로', pasteItems(P, 'nope', clip).page === P, true)
  const cut = removeItems(P, ['a'])
  const back = pasteItems(cut, 's1', copyItems(P, ['a']), 0)
  eq('잘라낸 사진을 다시 붙이면 parked에서 빠짐', back.page.parked, [])
  const du = duplicateItems(P, ['b'])
  eq('복제: 원본 바로 앞(위)', order(du.page, 's1').length === 4 && order(du.page, 's1')[2] === du.ids[0], true)
  eq('복제 위치', rect(du.page, du.ids[0]), [220, 70, 100, 50])
}

// ── 9. 선택 도우미·달라붙기 ──
{
  eq('구간 전체 선택', sectionItemIds(P, 's1'), ['a', 'b', 'L'])
  eq('드래그 박스 (0,0)-(150,150) → a', itemsInBox(P, { x: 0, y: 0, w: 150, h: 150 }), ['a'])
  eq('거꾸로 끈 박스도 됨', itemsInBox(P, { x: 150, y: 150, w: -150, h: -150 }), ['a'])
  eq('둘째 구간 (위에서 400 아래)', itemsInBox(P, { x: 0, y: 405, w: 50, h: 50 }), ['c'])
  const s = snapMove(P, ['a'], 3, 0, 6)
  eq('구간 왼쪽 가장자리에 붙음 (dx 3 → 0)', [s.dx, s.dy, s.guides.map(g => `${g.axis}${g.pos}`)], [0, 0, ['x0', 'y0']])
  eq('가까운 곳 없으면 그대로', snapMove(P, ['a'], 30, 17, 6), { dx: 30, dy: 17, guides: [] })
  const e = snapMove(P, ['a'], 97, 60, 6)
  eq('다른 요소 가장자리에 붙음 (a 오른쪽 197 → b 왼쪽 200)', [e.dx, e.guides.find(g => g.axis === 'x')?.pos], [100, 200])
  eq('구간이 다르면 달라붙지 않음', snapMove(P, ['a', 'c'], 3, 0, 6).guides, [])
}

// ── 10. 사진 꾸미기·바꾸기 (6-2) ──
{
  eq('예전 요소(꾸미기 칸 없음) → 없음으로 읽음', itemStyleOf(it(P, 'a')), { borderWidth: 0, borderColor: '#ffffff', radius: 0, shadow: 0 })
  const s = setItemStyle(P, ['a'], { borderWidth: 3, borderColor: '#FF0000', radius: 999, shadow: 40 })
  eq('테두리·모서리(최대 400으로 자름)·그림자', itemStyleOf(it(s, 'a')), { borderWidth: 3, borderColor: '#ff0000', radius: 400, shadow: 40 })
  eq('잘못된 색은 무시', setItemStyle(P, ['a'], { borderColor: 'red' }) === P, true)
  const back = setItemStyle(s, ['a'], { borderWidth: 0, radius: 0, shadow: 0, borderColor: '#ffffff' })
  eq('기본값으로 되돌리면 칸이 빠짐 (예전 모양)', ['borderWidth', 'radius', 'shadow', 'borderColor'].some(k => k in it(back, 'a')), false)
  eq('잠긴 요소도 꾸미기는 바뀜', itemStyleOf(it(setItemStyle(P, ['L'], { shadow: 10 }), 'L')).shadow, 10)
  const r = replaceItemImage(P, 'a', 'Z')
  eq('사진 바꾸기: 사진만 바뀌고 자리·크기 그대로', [it(r, 'a').imageId, rect(r, 'a')], ['Z', [0, 0, 100, 100]])
  eq('빠진 사진은 parked로', r.parked, ['A'])
  eq('parked에 있던 사진으로 바꾸면 parked에서 빠짐', replaceItemImage({ ...P, parked: ['Z'] }, 'a', 'Z').parked, ['A'])
  eq('같은 사진 → 문서 그대로', replaceItemImage(P, 'a', 'A') === P, true)
  eq('이 사진의 요소들', itemIdsOfImage(duplicateItems(P, ['a']).page, 'A').length, 2)
}

// ── 목록에서 페이지로 넣기 (6-3) ──
{
  const N = { id: 'N', width: 1000, height: 500 }   // 780 폭 → 높이 390
  const E = { ...P, parked: ['N'], sections: [...P.sections, { id: 's3', height: 900, bg: '#ffffff', items: [] }] }
  // 보이는 구간이 비어 있음 → 그 구간에 폭에 맞춰, 구간 높이 = 사진 비율
  const r1 = insertImageNear(E, N, 's3')
  const s3 = r1.page.sections.find(s => s.id === 's3')
  eq('빈 구간에 넣기 → 그 구간에 폭에 맞춰', [s3.height, rect(r1.page, r1.itemId), it(r1.page, r1.itemId).imageId], [390, [0, 0, 780, 390], 'N'])
  eq('…구간 수 그대로, parked에서 빠짐', [r1.page.sections.length, r1.page.parked], [3, []])
  // 보이는 구간에 사진이 있음 → 바로 아래 새 구간
  const r2_ = insertImageNear(E, N, 's1')
  eq('사진 있는 구간 → 바로 아래 새 구간', r2_.page.sections.map(s => s.id === 's1' || s.id === 's2' || s.id === 's3' ? s.id : 'new'), ['s1', 'new', 's2', 's3'])
  eq('…새 구간 = 폭에 꽉, 비율 유지', [r2_.page.sections[1].height, rect(r2_.page, r2_.itemId)], [390, [0, 0, 780, 390]])
  eq('구간을 모르면 맨 아래', insertImageNear(P, N, null).page.sections.at(-1).items[0].imageId, 'N')
  eq('이미 페이지에 있는 사진도 한 번 더', itemIdsOfImage(insertImageNear(P, { id: 'A', width: 100, height: 100 }, 's2').page, 'A').length, 2)
  eq('크기를 모르는 사진 → 그대로', insertImageNear(P, { id: 'Z' }, 's1').page === P, true)

  // 끌어다 놓기: 놓은 구간의 놓은 자리(가운데)에, 폭의 절반·비율 유지
  const d = dropImageAt(P, N, 's2', 400, 150)
  eq('놓은 자리 가운데에 폭 절반(390×195)', rect(d.page, d.itemId), [205, 53, 390, 195])
  eq('…그 구간 맨 앞(배열 끝)', order(d.page, 's2').at(-1), d.itemId)
  const edge = dropImageAt(P, N, 's2', 770, 5)
  eq('구간 가장자리에 놓아도 최소 40px은 구간 안', rect(edge.page, edge.itemId).slice(0, 2), [575, -92])
  const de = dropImageAt(E, N, 's3', 10, 10)
  eq('빈 구간에 놓으면 폭에 맞춰 채움', rect(de.page, de.itemId), [0, 0, 780, 390])
  eq('구간 밖에 놓으면 맨 아래 새 구간', dropImageAt(P, N, null, 0, 0).page.sections.length, 3)
  eq('입력 문서는 바뀌지 않음 (넣기)', JSON.stringify(E.sections[2].items), '[]')
}

// ── 그룹 (9단계) ──
{
  const gOf = (p, id) => it(p, id)?.groupId
  eq('묶기: 같은 구간 2개 → 같은 새 groupId', (q => [!!gOf(q, 'a'), gOf(q, 'a') === gOf(q, 'b'), gOf(q, 'a').startsWith('g_')])(groupItems(P, ['a', 'b'])), [true, true, true])
  eq('묶기: 1개만 → 그대로', groupItems(P, ['a']) === P, true)
  eq('묶기: 다른 구간이 섞이면 그대로 + mixed', [groupItems(P, ['a', 'c']) === P, groupCheck(P, ['a', 'c'])], [true, 'mixed'])
  eq('묶기: 없는 id만 → few', groupCheck(P, ['x', 'y']), 'few')
  const g1 = groupItems(P, ['a', 'b'])
  eq('묶기: 이미 그대로 한 그룹 → same·그대로', [groupCheck(g1, ['a', 'b']), groupItems(g1, ['b', 'a']) === g1], ['same', true])
  // 구성원은 가장 앞 구성원 자리로 모임: s1 = [a, b, L] → a·L 묶기 → [b, a, L]
  eq('묶기: 구성원이 가장 앞 자리로 모임(순서 유지)', order(groupItems(P, ['a', 'L']), 's1'), ['b', 'a', 'L'])
  // 기존 그룹 합치기: (a,b) 그룹 + L → 새 그룹 하나
  const g2 = groupItems(g1, ['a', 'b', 'L'])
  eq('묶기: 기존 그룹 합치기 → 셋이 새 groupId 하나', [gOf(g2, 'a') === gOf(g2, 'L'), gOf(g2, 'b') === gOf(g2, 'L'), gOf(g2, 'a') !== gOf(g1, 'a')], [true, true, true])
  // 기존 그룹의 일부만 다른 것과 묶으면 옛 그룹은 풀림: (a,b) 에서 b + L 묶기 → a는 그룹 없음
  const g3 = groupItems(g1, ['b', 'L'])
  eq('묶기: 옛 그룹 일부만 → 남은 구성원은 풀림', [gOf(g3, 'a'), gOf(g3, 'b') === gOf(g3, 'L')], [undefined, true])
  eq('구성원 목록 / 그룹 아님 / 없는 요소', [groupMemberIds(g1, 'b'), groupMemberIds(g1, 'L'), groupMemberIds(g1, 'x')], [['a', 'b'], ['L'], []])
  eq('그룹 단위로 넓히기 (페이지 순서)', expandToGroups(g1, ['b', 'c']), ['a', 'b', 'c'])
  eq('풀기: 하나만 골라도 그룹 통째로', (q => [gOf(q, 'a'), gOf(q, 'b')])(ungroupItems(g1, ['b'])), [undefined, undefined])
  eq('풀기: 그룹 없음 → 그대로', ungroupItems(P, ['a']) === P, true)
  eq('풀 수 있는지', [anyGrouped(g1, ['a']), anyGrouped(g1, ['L'])], [true, false])
  // 복제
  const d = duplicateItems(g1, ['a', 'b'])
  eq('복제: 그룹 통째로 → 복사본끼리 새 groupId', [gOf(d.page, d.ids[0]) === gOf(d.page, d.ids[1]), gOf(d.page, d.ids[0]) !== gOf(g1, 'a'), gOf(d.page, 'a') === gOf(g1, 'a')], [true, true, true])
  const d1 = duplicateItems(g1, ['a'])
  eq('복제: 일부만 → 복사본은 그룹 없음, 원본 그룹 그대로', [gOf(d1.page, d1.ids[0]), groupMemberIds(d1.page, 'a')], [undefined, ['a', 'b']])
  // 복사·붙여넣기
  const clipWhole = copyItems(g1, ['a', 'b']), clipPart = copyItems(g1, ['a'])
  eq('복사: 통째로면 groupId 남김, 일부면 뗌', [!!clipWhole[0].item.groupId, 'groupId' in clipPart[0].item], [true, false])
  const pw = pasteItems(g1, 's2', clipWhole)
  eq('붙여넣기: 새 groupId 공유(원본과 다름)', [gOf(pw.page, pw.ids[0]) === gOf(pw.page, pw.ids[1]), gOf(pw.page, pw.ids[0]) !== gOf(g1, 'a')], [true, true])
  const pw2 = pasteItems(pw.page, 's2', clipWhole)
  eq('두 번 붙여넣기: 서로 다른 그룹', gOf(pw2.page, pw2.ids[0]) !== gOf(pw.page, pw.ids[0]), true)
  // 삭제 뒤 1개만 남으면 풀림
  const r1 = removeItems(g1, ['b'])
  eq('삭제: 1개만 남은 그룹은 풀림', gOf(r1, 'a'), undefined)
  const g4 = groupItems(P, ['a', 'b', 'L'])
  eq('삭제: 2개 남으면 그룹 유지', (q => gOf(q, 'a') === gOf(q, 'L'))(removeItems(g4, ['b'])), true)
  // 구간 복제: 복사본 그룹은 새 groupId (원본과 섞이지 않음)
  const ds = duplicateSection(g1, 's1')
  const copyItemsOfSec = ds.page.sections[1].items
  eq('구간 복제: 복사한 구간의 그룹은 새 groupId, 원본 그룹 유지', [copyItemsOfSec[0].groupId === copyItemsOfSec[1].groupId, copyItemsOfSec[0].groupId !== gOf(g1, 'a'), groupMemberIds(ds.page, 'a')], [true, true, ['a', 'b']])
  // 정리 규칙 + readPage
  const broken = { ...P, sections: [
    { ...P.sections[0], items: [{ ...P.sections[0].items[0], groupId: 'g_one' }, { ...P.sections[0].items[1], groupId: 'g_x' }, P.sections[0].items[2]] },
    { ...P.sections[1], items: [{ ...P.sections[1].items[0], groupId: 'g_x' }] },
  ] }
  const cleaned = cleanGroups(broken)
  eq('정리: 1개만인 그룹·구간을 넘는 그룹 → 풀림', [gOf(cleaned, 'a'), gOf(cleaned, 'b'), gOf(cleaned, 'c')], [undefined, undefined, undefined])
  eq('정리: 바뀔 것 없으면 그대로', cleanGroups(g1) === g1, true)
  eq('readPage도 정리해서 읽음', (r => [r.problems, gOf(r.page, 'a'), gOf(r.page, 'c')])(readPage(broken, 'p')), [[], undefined, undefined])
  eq('readPage: 정상 그룹은 그대로', gOf(readPage(g1, 'p').page, 'a') === gOf(g1, 'a'), true)
  eq('문자열 아닌 groupId → 정리에서 뗌', (q => 'groupId' in it(q, 'a'))(cleanGroups({ ...P, sections: [{ ...P.sections[0], items: [{ ...P.sections[0].items[0], groupId: 5 }, ...P.sections[0].items.slice(1)] }, P.sections[1]] })), false)
  // 레이어 끌기: reorderItemTo
  eq('자리 옮기기: b를 맨 뒤(0)', order(reorderItemTo(P, ['b'], 0), 's1'), ['b', 'a', 'L'])
  eq('자리 옮기기: a를 맨 앞(나머지 길이)', order(reorderItemTo(P, ['a'], 2), 's1'), ['b', 'L', 'a'])
  eq('자리 옮기기: 덩어리(그룹)째', order(reorderItemTo(g1, ['a', 'b'], 1), 's1'), ['L', 'a', 'b'])
  eq('자리 옮기기: 같은 순서·구간 섞임·정수 아님 → 그대로', [reorderItemTo(P, ['a'], 0) === P, reorderItemTo(P, ['a', 'c'], 0) === P, reorderItemTo(P, ['a'], 0.5) === P], [true, true, true])
  eq('자리 옮기기: 범위 밖은 끝으로', order(reorderItemTo(P, ['a'], 99), 's1'), ['b', 'L', 'a'])
}

eq('입력 문서는 바뀌지 않음', JSON.stringify(P) === snapshot, true)
console.log(`\n${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
