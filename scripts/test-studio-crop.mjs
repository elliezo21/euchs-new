// 자르기·띠 잘라내기 테스트 (12-1단계) — node scripts/test-studio-crop.mjs
import {
  normalizeCrop, normalizeCuts, readShape, withShape, geometryOf, drawGeometry, geometryHeightAt, fitRatio, dragCrop, shapeMark, isPlainShape,
  SHAPE_MIN, CUTS_MAX,
} from '../src/lib/studioCrop.js'
import { fitSectionsToImage, imageSection } from '../src/lib/studioPage.js'
import { withLook } from '../src/lib/studioLook.js'
import { stampEraseVersion } from '../src/lib/studioFinal.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

// ── 1. 자르기 정리 ──
eq('자르기: 그대로', normalizeCrop({ x: 10, y: 20, w: 300, h: 400 }, 800, 1000), { x: 10, y: 20, w: 300, h: 400 })
eq('자르기: 사진 밖은 안으로, 정수', normalizeCrop({ x: -5.4, y: 900.6, w: 2000, h: 500 }, 800, 1000), { x: 0, y: 901, w: 800, h: 99 })
eq('자르기: 최소 20', normalizeCrop({ x: 10, y: 10, w: 3, h: 5 }, 800, 1000), { x: 10, y: 10, w: 20, h: 20 })
eq('자르기: 오른쪽 끝에서도 최소 20 (x를 안으로)', normalizeCrop({ x: 795, y: 0, w: 10, h: 100 }, 800, 1000), { x: 780, y: 0, w: 20, h: 100 })
eq('자르기: 사진 전체 = 없음', normalizeCrop({ x: 0, y: 0, w: 800, h: 1000 }, 800, 1000), null)
eq('자르기: 잘못된 값 = 없음', [normalizeCrop(null, 800, 1000), normalizeCrop({ x: 'a', y: 0, w: 1, h: 1 }, 800, 1000), normalizeCrop({ x: 0, y: 0, w: 0, h: 10 }, 800, 1000), normalizeCrop({ x: 0, y: 0, w: 10, h: 10 }, 10, 10)], [null, null, null, null])

// ── 2. 띠 정리 ──
eq('띠: y 순서로', normalizeCuts([{ y: 500, h: 50 }, { y: 100, h: 40 }], 1000), [{ y: 100, h: 40 }, { y: 500, h: 50 }])
eq('띠: 겹치거나 붙은 띠는 합침', normalizeCuts([{ y: 100, h: 50 }, { y: 140, h: 60 }, { y: 200, h: 30 }], 1000), [{ y: 100, h: 130 }])
eq('띠: 사진 밖은 잘라냄', normalizeCuts([{ y: -30, h: 80 }, { y: 980, h: 100 }], 1000), [{ y: 0, h: 50 }, { y: 980, h: 20 }])
eq('띠: 20보다 얇은 띠는 뺌', normalizeCuts([{ y: 100, h: 10 }, { y: 300, h: 25 }], 1000), [{ y: 300, h: 25 }])
eq('띠: 잘못된 값은 뺌', normalizeCuts([{ y: 'x', h: 30 }, null, { y: 10, h: -5 }, { y: 50, h: 30 }], 1000), [{ y: 50, h: 30 }])
eq('띠: 남는 높이가 20보다 작으면 띠 없음', normalizeCuts([{ y: 0, h: 990 }], 1000), [])
eq('띠: 남는 높이 딱 20은 됨', normalizeCuts([{ y: 0, h: 980 }], 1000), [{ y: 0, h: 980 }])
eq('띠: 최대 50개', normalizeCuts(Array.from({ length: 60 }, (_, i) => ({ y: i * 100, h: 30 })), 100000).length, CUTS_MAX)
eq('띠: 배열 아님 = 없음', normalizeCuts('x', 1000), [])

// ── 3. edit 읽고 쓰기 ──
{
  const edit = { v: 2, layers: [{ id: 'f_1', type: 'fill' }], look: { filter: 'mono' }, erase_v: 3 }
  const w = withShape(edit, { crop: { x: 1, y: 2, w: 30, h: 40 }, cuts: [{ y: 100, h: 30 }] })
  eq('withShape: 다른 칸은 그대로', [w.v, w.layers, w.look, w.erase_v], [2, [{ id: 'f_1', type: 'fill' }], { filter: 'mono' }, 3])
  eq('withShape: crop·cuts 들어감', [w.crop, w.cuts], [{ x: 1, y: 2, w: 30, h: 40 }, [{ y: 100, h: 30 }]])
  eq('withShape: 없음이면 칸을 뺌', 'crop' in withShape(w, { crop: null, cuts: [] }) || 'cuts' in withShape(w, { crop: null, cuts: [] }), false)
  eq('readShape: 정리된 값', readShape({ crop: { x: 0, y: 0, w: 800, h: 1000 }, cuts: [{ y: 10, h: 5 }] }, 800, 1000), { crop: null, cuts: [] })
  eq('필터를 바꿔도 자르기는 그대로 (withLook)', withLook(w, { filter: 'vivid' }).crop, { x: 1, y: 2, w: 30, h: 40 })
  eq('자르기만 바꾸면 erase_v 그대로 (완성 JPG 유효)', stampEraseVersion(withShape(edit, { crop: { x: 5, y: 5, w: 50, h: 50 }, cuts: [] }), edit, 7).erase_v, 3)
  eq('목록 표시', [shapeMark({ crop: {}, cuts: [] }), shapeMark({ crop: null, cuts: [1, 2] }), shapeMark({ crop: {}, cuts: [1] }), shapeMark({ crop: null, cuts: [] })], ['잘림', '띠 2', '잘림 · 띠 1', ''])
  eq('isPlainShape', [isPlainShape({ crop: null, cuts: [] }), isPlainShape({ crop: {}, cuts: [] })], [true, false])
}

// ── 4. 결과 모양 geometryOf ──
{
  const g0 = geometryOf(800, 1000, {})
  eq('없음 = 원본 그대로 한 조각', [g0.identity, g0.width, g0.height, g0.x, g0.pieces], [true, 800, 1000, 0, [{ sy: 0, h: 1000, dy: 0 }]])
  const g1 = geometryOf(800, 1000, { crop: { x: 100, y: 200, w: 400, h: 300 } })
  eq('자르기만', [g1.identity, g1.x, g1.width, g1.height, g1.pieces], [false, 100, 400, 300, [{ sy: 200, h: 300, dy: 0 }]])
  const g2 = geometryOf(800, 1000, { cuts: [{ y: 100, h: 50 }, { y: 600, h: 100 }] })
  eq('띠만: 세 조각을 이어 붙임', [g2.width, g2.height, g2.pieces], [800, 850, [{ sy: 0, h: 100, dy: 0 }, { sy: 150, h: 450, dy: 100 }, { sy: 700, h: 300, dy: 550 }]])
  const g3 = geometryOf(800, 1000, { crop: { x: 0, y: 120, w: 800, h: 600 }, cuts: [{ y: 100, h: 50 }, { y: 600, h: 100 }] })
  // 자르기 120~720, 띠 100~150(앞 30이 겹침)·600~700 → 150~600(450) + 700~720(20) = 470
  eq('띠 + 자르기 (띠가 자르기 경계에 걸침)', [g3.height, g3.pieces], [470, [{ sy: 150, h: 450, dy: 0 }, { sy: 700, h: 20, dy: 450 }]])
  const g4 = geometryOf(800, 1000, { crop: { x: 0, y: 200, w: 800, h: 100 }, cuts: [{ y: 150, h: 200 }] })
  eq('자르기가 모두 띠 안 = 자르기 무시하고 알림', [g4.cropIgnored, g4.crop, g4.height], [true, null, 800])
  const g5 = geometryOf(800, 1000, { crop: { x: 0, y: 0, w: 800, h: 90 }, cuts: [{ y: 700, h: 100 }] })
  eq('띠가 자르기 밖이면 영향 없음', [g5.height, g5.pieces.length], [90, 1])
  const g6 = geometryOf(800, 1000, { cuts: [{ y: 0, h: 100 }, { y: 900, h: 100 }] })
  eq('맨 위·맨 아래 띠', [g6.height, g6.pieces], [800, [{ sy: 100, h: 800, dy: 0 }]])
  eq('결과 높이 (목표 폭)', [geometryHeightAt(g2, 400), geometryHeightAt(g1, 200)], [425, 150])
}

// ── 5. 그리기 (가짜 ctx) ──
{
  const calls = []
  const ctx = { drawImage: (...a) => calls.push(a.slice(1)) }
  const g = geometryOf(800, 1000, { cuts: [{ y: 100, h: 50 }, { y: 600, h: 100 }] })
  drawGeometry(ctx, 'SRC', g, 0, 0, 400, 425)
  eq('조각마다 drawImage — 경계는 정수로 이어짐', calls, [[0, 0, 800, 100, 0, 0, 400, 50], [0, 150, 800, 450, 0, 50, 400, 225], [0, 700, 800, 300, 0, 275, 400, 150]])
  calls.length = 0
  drawGeometry(ctx, 'SRC', geometryOf(800, 1000, { cuts: [{ y: 333, h: 33 }] }), 10, 20, 100, 121)
  eq('어중간한 배율도 틈 없음 (앞 조각 끝 = 뒤 조각 시작)', calls[0][5] + calls[0][7] === calls[1][5], true)
}

// ── 6. 자르기 창 네모 조작 ──
{
  eq('비율 1:1 = 지금 네모 안 가장 큰 정사각, 가운데', fitRatio({ x: 0, y: 0, w: 800, h: 400 }, 1, 800, 1000), { x: 200, y: 0, w: 400, h: 400 })
  eq('비율 16:9', fitRatio({ x: 0, y: 0, w: 800, h: 1000 }, 16 / 9, 800, 1000), { x: 0, y: 275, w: 800, h: 450 })
  eq('비율 없음 = 그대로', fitRatio({ x: 1, y: 2, w: 3, h: 4 }, null, 800, 1000), { x: 1, y: 2, w: 3, h: 4 })
  const r = { x: 100, y: 100, w: 200, h: 200 }
  eq('옮기기 (사진 안까지만)', [dragCrop(r, 'move', 50, -500, null, 800, 1000)], [{ x: 150, y: 0, w: 200, h: 200 }])
  eq('오른쪽 아래 모서리', dragCrop(r, 'se', 50, 30, null, 800, 1000), { x: 100, y: 100, w: 250, h: 230 })
  eq('왼쪽 변: 오른쪽 제자리', dragCrop(r, 'w', -60, 0, null, 800, 1000), { x: 40, y: 100, w: 260, h: 200 })
  eq('최소 20', dragCrop(r, 'e', -500, 0, null, 800, 1000).w, SHAPE_MIN)
  eq('사진 밖으로 안 나감', dragCrop(r, 'se', 5000, 5000, null, 800, 1000), { x: 100, y: 100, w: 700, h: 900 })
  eq('비율 1:1 모서리 = 가로 기준', dragCrop(r, 'se', 100, 0, 1, 800, 1000), { x: 100, y: 100, w: 300, h: 300 })
  eq('비율 1:1 위 변 = 세로 기준, 가로 가운데', dragCrop(r, 'n', 0, -40, 1, 800, 1000), { x: 80, y: 60, w: 240, h: 240 })
  eq('비율 유지 중 사진 밖이면 함께 줄임', dragCrop({ x: 600, y: 100, w: 100, h: 100 }, 'se', 500, 0, 1, 800, 1000), { x: 600, y: 100, w: 200, h: 200 })
}

// ── 7. 꽉 찬 구간 높이 맞춤 ──
{
  const sec = imageSection({ id: 'img-1', width: 800, height: 1000 }, 780)
  const other = { id: 'x', type: 'text', text: 'a', x: 10, y: 10, w: 100, h: 30 }
  const page = { v: 1, width: 780, gap: 0, parked: [], sections: [
    { ...sec, items: [...sec.items, other] },
    { id: 's2', height: 500, bg: '#fff', items: [{ ...sec.items[0], id: 'i2', w: 390, h: 500 }] },
    { id: 's3', height: 900, bg: '#fff', items: [{ ...sec.items[0], id: 'i3', h: 900, rotation: 10 }] },
  ] }
  const next = fitSectionsToImage(page, 'img-1', 800, 500) // 자른 뒤 800×500 → 780×488
  eq('꽉 찬 구간: 구간·요소 높이를 새 비율로', [next.sections[0].height, next.sections[0].items[0].h], [488, 488])
  eq('같은 구간의 다른 요소는 그대로', next.sections[0].items[1], other)
  eq('폭이 반인 자리 = 그대로 (cover로 다시 그림)', next.sections[1], page.sections[1])
  eq('돌린 요소 = 그대로', next.sections[2], page.sections[2])
  eq('이미 맞으면 문서 그대로', fitSectionsToImage(next, 'img-1', 800, 500) === next, true)
  eq('다른 사진이면 그대로', fitSectionsToImage(page, 'img-9', 800, 500) === page, true)
  eq('잘못된 크기면 그대로', fitSectionsToImage(page, 'img-1', 0, 500) === page, true)
}

console.log(`\n${pass} PASS / ${fail} FAIL`)
if (fail) process.exit(1)
