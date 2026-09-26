// 도형·선 요소 테스트 (11-1단계) — node scripts/test-studio-shape.mjs
import {
  normalizeShapeItem, normalizeLineItem, patchShapeItem, patchLineItem, shapePath, shapePaintSpec, linePaintSpec, lineHitHeight,
  lineEnds, moveLineEnd, elementLabel, ELEMENT_KINDS, SHAPE_DEFAULTS, LINE_MIN_LENGTH, LINE_HIT_MIN, isValidShapeItem, isValidLineItem,
} from '../src/lib/studioShape.js'
import {
  readPage, addElementItem, setShapeProps, setLineProps, setLineEnd, setItemRect, moveItems, duplicateItems, removeItems, findItem, isDrawableItem,
} from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol
const box = (extra = {}) => ({ id: 's', type: 'shape', x: 0, y: 0, w: 100, h: 50, rotation: 0, ...extra })

// ── 1. 도형 기본값·잘못된 값 ──
{
  const n = normalizeShapeItem(box())
  eq('도형 기본값', [n.shape, n.fill, n.fillOpacity, n.strokeWidth, n.strokeColor, n.radius], ['rect', '#111111', 1, 0, '#000000', 0])
  const bad = normalizeShapeItem(box({ shape: 'hexagon', fill: 'red', fillOpacity: 3, strokeWidth: 99, strokeColor: '#ABCDEF', radius: -5 }))
  eq('잘못된 값 → 기본값·범위 안', [bad.shape, bad.fill, bad.fillOpacity, bad.strokeWidth, bad.strokeColor, bad.radius], ['rect', '#111111', 1, 40, '#abcdef', 0])
  eq('채우기 "" = 없음 그대로', normalizeShapeItem(box({ fill: '' })).fill, '')
  eq('공통 칸은 그대로', normalizeShapeItem(box({ rotation: 30, groupId: 'g_1' })).groupId, 'g_1')
  eq('patch: 같은 값이면 입력 그대로', (() => { const a = normalizeShapeItem(box()); return patchShapeItem(a, { shape: 'rect' }) === a })(), true)
  eq('patch: 잘못된 값은 무시', (() => { const a = normalizeShapeItem(box()); return patchShapeItem(a, { shape: 'x', fill: 'blue' }) === a })(), true)
  eq('그릴 수 있는 도형', [isValidShapeItem(box()), isValidShapeItem({ ...box(), w: 0 }), isDrawableItem(box())], [true, false, true])
}

// ── 2. 도형 path ──
{
  eq('네모 path', shapePath({ shape: 'rect', w: 100, h: 50 }), 'M0 0H100V50H0Z')
  eq('네모 안으로 2 줄임', shapePath({ shape: 'rect', w: 100, h: 50 }, 2), 'M2 2H98V48H2Z')
  eq('둥근 네모 (반지름 10)', shapePath({ shape: 'rect', w: 100, h: 50, radius: 10 }),
    'M10 0H90A10 10 0 0 1 100 10V40A10 10 0 0 1 90 50H10A10 10 0 0 1 0 40V10A10 10 0 0 1 10 0Z')
  eq('모서리는 짧은 변 절반까지', shapePath({ shape: 'rect', w: 100, h: 50, radius: 400 }).startsWith('M25 0H75A25 25'), true)
  eq('원 path (가로로 긴 타원)', shapePath({ shape: 'ellipse', w: 100, h: 50 }), 'M0 25A50 25 0 1 0 100 25A50 25 0 1 0 0 25Z')
  eq('세모 path', shapePath({ shape: 'triangle', w: 100, h: 50 }), 'M50 0L100 50L0 50Z')
  const star = shapePath({ shape: 'star', w: 100, h: 100 })
  const pts = [...star.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])])
  eq('별: 꼭짓점 10개, 네모에 꽉 참 (0~100)', [pts.length, Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1]))], [10, 0, 100, 0, 100])
  const starWide = [...shapePath({ shape: 'star', w: 200, h: 100 }).matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m => Number(m[1]))
  eq('별도 늘리면 그대로 늘어남 (폭 200)', Math.max(...starWide), 200)
}

// ── 3. 도형 그리기 값 (테두리는 안쪽) ──
{
  const s = shapePaintSpec(normalizeShapeItem(box({ strokeWidth: 10, strokeColor: '#ff0000', fillOpacity: 0.5 })))
  eq('테두리 10 → path를 5 안으로 (바깥 가장자리 = 요소 네모)', s.d, 'M5 5H95V45H5Z')
  eq('테두리 값 (네모 = miter)', s.stroke, { width: 10, color: '#ff0000', join: 'miter' })
  eq('채우기 = 색 + 진하기', s.fill, 'rgba(17, 17, 17, 0.5)')
  eq('세모·별 테두리 = round (꼭짓점이 밖으로 안 튀어나감)', shapePaintSpec(normalizeShapeItem(box({ shape: 'star', strokeWidth: 4 }))).stroke.join, 'round')
  eq('채우기 없음·진하기 0 → null', [shapePaintSpec(normalizeShapeItem(box({ fill: '' }))).fill, shapePaintSpec(normalizeShapeItem(box({ fillOpacity: 0 }))).fill], [null, null])
  eq('테두리 0 → null', shapePaintSpec(normalizeShapeItem(box())).stroke, null)
  eq('테두리가 요소보다 두꺼우면 짧은 변 절반까지', shapePaintSpec(normalizeShapeItem(box({ w: 20, h: 10, strokeWidth: 40 }))).stroke.width, 5)
  eq('둥근 네모 + 테두리: 안쪽 path 반지름 = 반지름 - 두께 절반', shapePaintSpec(normalizeShapeItem(box({ radius: 20, strokeWidth: 8 }))).d.startsWith('M20 4H80A16 16'), true)
}

// ── 4. 선 ──
const line = (extra = {}) => normalizeLineItem({ id: 'l', type: 'line', x: 100, y: 100, w: 200, h: LINE_HIT_MIN, rotation: 0, ...extra })
{
  const l = line()
  eq('선 기본값', [l.strokeWidth, l.color, l.dash, l.startCap, l.endCap], [4, '#111111', 'solid', 'none', 'none'])
  const bad = line({ strokeWidth: 0, color: 'x', dash: 'wavy', startCap: 'heart', endCap: 'arrow' })
  eq('잘못된 값 → 기본값·범위 (굵기 최소 1)', [bad.strokeWidth, bad.color, bad.dash, bad.startCap, bad.endCap], [1, '#111111', 'solid', 'none', 'arrow'])
  eq('누르는 영역 h 최소값', l.h, LINE_HIT_MIN)
  const thick = patchLineItem(l, { strokeWidth: 30 })
  eq('굵게 하면 h가 늘고 가운데 제자리', [thick.h > l.h, thick.y + thick.h / 2], [true, l.y + l.h / 2])
  const arrow = patchLineItem(l, { endCap: 'arrow' })
  eq('화살표를 켜면 h가 화살표를 담음', arrow.h >= 2 * (4 * 1.6 + 5), true)
  eq('h는 짝수', [l.h, thick.h, arrow.h].every(h => h % 2 === 0), true)
  eq('그릴 수 있는 선', [isValidLineItem(l), isDrawableItem(l)], [true, true])

  const ps = linePaintSpec(l)
  eq('실선: 끝 모양 없음 → 0~w 가운데 줄', ps.line, { d: `M0 ${l.h / 2}H200`, width: 4, color: '#111111', dash: null, cap: 'butt' })
  const pa = linePaintSpec(arrow)
  eq('화살표: 선을 화살표 길이 0.8만큼 줄이고 세모 하나', [pa.line.d, pa.caps.length, pa.caps[0].d.startsWith(`M200 ${arrow.h / 2}L180`)], [`M0 ${arrow.h / 2}H184`, 1, true])
  eq('점선 모양', linePaintSpec(line({ dash: 'dashed' })).line.dash, [12, 8])
  eq('점 모양 = 거의 0 길이 + 둥근 끝', (({ dash, cap }) => [dash, cap])(linePaintSpec(line({ dash: 'dotted' })).line), [[0.01, 8], 'round'])
  eq('양 끝 점 모양 = 원 2개', linePaintSpec(line({ startCap: 'dot', endCap: 'dot' })).caps.length, 2)
  eq('이름', [elementLabel(l), elementLabel(arrow), elementLabel(normalizeShapeItem(box({ shape: 'star' })))], ['선', '화살표', '도형 · 별'])
}

// ── 5. 선 끝 점 ──
{
  const l = line() // (100,112) → (300,112)
  const e0 = lineEnds(l)
  eq('끝 점 좌표 (0°)', [e0.start, e0.end], [{ x: 100, y: 112 }, { x: 300, y: 112 }])
  const r = moveLineEnd(l, 'end', 300, 312)
  const e1 = lineEnds({ ...l, ...r })
  eq('끝 점을 옮기면 시작 점 제자리(1px 안)', near(e1.start.x, 100) && near(e1.start.y, 112), true)
  eq('…끝 점은 놓은 곳, 각도 45°', [near(e1.end.x, 300) && near(e1.end.y, 312), r.rotation], [true, 45])
  const s = moveLineEnd(l, 'start', 0, 112)
  const e2 = lineEnds({ ...l, ...s })
  eq('시작 점을 옮기면 끝 점 제자리, 길이 300', [near(e2.end.x, 300) && near(e2.end.y, 112), s.w, s.rotation], [true, 300, 0])
  const sn = moveLineEnd(l, 'end', 400, 190, { snap: true }) // 약 14.6° → 15°
  eq('Shift = 15° 단위', sn.rotation, 15)
  const sn2 = moveLineEnd(l, 'end', 300, 400, { snap: true }) // 약 55° → 60°
  eq('…55° → 60°', sn2.rotation, 60)
  const short = moveLineEnd(l, 'end', 105, 112)
  eq('최소 길이', short.w, LINE_MIN_LENGTH)
  const e3 = lineEnds({ ...l, ...short })
  eq('…최소 길이여도 시작 점 제자리', near(e3.start.x, 100) && near(e3.start.y, 112), true)
  const back = moveLineEnd(l, 'end', 0, 112)
  eq('끝 점을 시작 점 뒤로 넘기면 180°', back.rotation, 180)
  // 돌린 선의 끝 점
  const rot = { ...l, rotation: 90 }
  const e4 = lineEnds(rot)
  eq('90° 돌린 선의 끝 점 (가운데 200,112 기준 위아래)', [near(e4.start.x, 200) && near(e4.start.y, 12), near(e4.end.x, 200) && near(e4.end.y, 212)], [true, true])
  const r4 = moveLineEnd(rot, 'start', 200, -88)
  const e5 = lineEnds({ ...rot, ...r4 })
  eq('돌린 선의 시작 점 끌기 → 끝 점 제자리, 길이 300', [near(e5.end.x, 200) && near(e5.end.y, 212), r4.w, r4.rotation], [true, 300, 90])
}

// ── 6. 페이지 조작 ──
const P = { v: 1, width: 780, gap: 0, parked: [], sections: [{ id: 's1', height: 400, bg: '#ffffff', items: [] }] }
{
  const r = addElementItem(P, 's1', ELEMENT_KINDS.find(k => k.key === 'star').fields)
  const it = findItem(r.page, r.itemId).item
  eq('도형 넣기 → 구간 가운데, 기본값', [it.type, it.shape, it.x, it.y, it.w, it.h, it.fill], ['shape', 'star', 280, 95, 220, 210, '#111111'])
  const rl = addElementItem(P, 's1', ELEMENT_KINDS.find(k => k.key === 'arrow').fields)
  const l = findItem(rl.page, rl.itemId).item
  eq('화살표 넣기 → 가운데, h 자동, 끝 = 화살표', [l.type, l.x, l.w, l.endCap, l.y + l.h / 2], ['line', 230, 320, 'arrow', 200])
  eq('모르는 종류·없는 구간은 안 넣음', [addElementItem(P, 's1', { type: 'x' }).itemId, addElementItem(P, 'x', { type: 'shape' }).itemId], [null, null])
  eq('ELEMENT_KINDS 8개 (도형 5 · 선 3)', [ELEMENT_KINDS.filter(k => k.fields.type === 'shape').length, ELEMENT_KINDS.filter(k => k.fields.type === 'line').length], [5, 3])

  const both = { ...r.page, sections: [{ ...r.page.sections[0], items: [it, l] }] }
  const p2 = setShapeProps(both, [it.id, l.id], { fill: '#ff0000', strokeWidth: 3 })
  eq('도형 속성은 도형에만', [findItem(p2, it.id).item.fill, findItem(p2, l.id).item.fill], ['#ff0000', undefined])
  const p3 = setLineProps(both, [it.id, l.id], { strokeWidth: 10, dash: 'dotted' })
  eq('선 속성은 선에만', [findItem(p3, l.id).item.strokeWidth, findItem(p3, l.id).item.dash, findItem(p3, it.id).item.dash], [10, 'dotted', undefined])
  eq('같은 값이면 문서 그대로', setShapeProps(both, [it.id], { shape: 'star' }) === both, true)

  const p4 = setLineEnd(both, l.id, 'end', 550, 300, { snap: true })
  const l4 = findItem(p4, l.id).item
  const s0 = lineEnds(l), s4 = lineEnds(l4)
  eq('선 끝 점 끌기 → 시작 점 제자리', near(s4.start.x, s0.start.x) && near(s4.start.y, s0.start.y), true)
  eq('…15° 단위', l4.rotation % 15, 0)
  const lockedPage = { ...both, sections: [{ ...both.sections[0], items: [it, { ...l, locked: true }] }] }
  eq('잠긴 선은 끝 점이 안 움직임 (문서 그대로)', setLineEnd(lockedPage, l.id, 'end', 0, 0) === lockedPage, true)

  eq('숫자 칸: 선의 세로는 자동(입력 무시)', findItem(setItemRect(both, l.id, { h: 300 }), l.id).item.h, l.h)
  eq('숫자 칸: 도형은 가로·세로 그대로', (({ w, h }) => [w, h])(findItem(setItemRect(both, it.id, { w: 100, h: 60 }), it.id).item), [100, 60])
  eq('공통 조작: 옮기기', findItem(moveItems(both, [it.id, l.id], 10, 0), l.id).item.x, l.x + 10)
  const d = duplicateItems(both, [it.id])
  eq('복제 → 도형 칸 그대로', findItem(d.page, d.ids[0]).item.shape, 'star')
  eq('삭제 → parked에 안 들어감', removeItems(both, [it.id, l.id]).parked, [])

  const raw = { ...P, sections: [{ ...P.sections[0], items: [{ id: 'z', type: 'shape', x: 0, y: 0, w: 10, h: 10, shape: 'blob' }, { id: 'y', type: 'line', x: 0, y: 0, w: 100, h: 2, strokeWidth: 'x' }] }] }
  const rp = readPage(raw, 'p').page.sections[0].items
  eq('readPage → 도형 칸 기본값 + 공통 칸', [rp[0].shape, rp[0].fill, rp[0].rotation], ['rect', '#111111', 0])
  eq('readPage → 선 굵기 기본값, h 자동', [rp[1].strokeWidth, rp[1].h], [4, LINE_HIT_MIN])
  eq('원본은 그대로', raw.sections[0].items[0].shape, 'blob')
  eq('도형 기본값 모양 (문서)', Object.keys(SHAPE_DEFAULTS), ['shape', 'fill', 'fillOpacity', 'strokeWidth', 'strokeColor', 'radius'])
}

console.log(`\n${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
