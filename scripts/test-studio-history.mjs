// 편집 이력·클릭 판정·범위 맞춤·글자 걸침 판정 테스트 — node scripts/test-studio-history.mjs
import {
  createHistory, push, undo, redo, canUndo, canRedo, jumpTo, list, clear, current, HISTORY_LIMIT, LABELS,
} from '../src/lib/studioHistory.js'
import { isSelectOnly, clampRectToImage } from '../src/lib/studioCoords.js'
import { detectBleed, bleedSidesFromScores, widenSides, highPassDeviation } from '../src/lib/studioBleed.js'
import { cropRect } from '../src/lib/studioFillPlan.js'
import { isSafeRedirectPath, isStudioProtectedPath } from '../src/lib/authRedirect.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const E = (...ls) => ({ v: 2, layers: ls })
const F = (id, x = 10) => ({ id, type: 'fill', x, y: 10, w: 20, h: 20, method: 'coons', pad: 4 })
const ids = e => e.layers.map(l => l.id)

// ── 1. push / undo / redo / jumpTo ──
{
  let h = createHistory(E(), LABELS.init, 1)
  h = push(h, E(F('a')), LABELS.add, 2)
  h = push(h, E(F('a'), F('b')), LABELS.add, 3)
  h = push(h, E(F('a'), F('b'), F('c')), LABELS.add, 4)
  eq('3번 추가 후 단계 수·위치', [h.steps.length, h.index], [4, 3])
  let r = undo(h); h = r.history
  eq('되돌리기 1', ids(r.edit), ['a', 'b'])
  r = undo(h); h = r.history; r = undo(h); h = r.history
  eq('되돌리기 3번 → 비어 있음', ids(r.edit), [])
  eq('처음에서 더 되돌리기 불가', [canUndo(h), undo(h)], [false, null])
  r = redo(h); h = r.history; r = redo(h); h = r.history; r = redo(h); h = r.history
  eq('다시 3번 → 복구', ids(r.edit), ['a', 'b', 'c'])
  eq('끝에서 다시 불가', [canRedo(h), redo(h)], [false, null])
  r = jumpTo(h, 1)
  eq('이력에서 중간 단계로', [ids(r.edit), r.history.index], [['a'], 1])
  eq('중간 이동 후에도 다시 가능', canRedo(r.history), true)
  eq('목록 모양', list(r.history).map(s => [s.label, s.current]),
    [[LABELS.init, false], [LABELS.add, true], [LABELS.add, false], [LABELS.add, false]])
  eq('범위 밖 jumpTo', [jumpTo(h, -1), jumpTo(h, 99), jumpTo(h, 1.5)], [null, null, null])
  // 돌려받은 edit를 고쳐도 이력은 안 바뀜 (깊은 복사)
  r.edit.layers[0].x = 999
  eq('깊은 복사', current(r.history).edit.layers[0].x, 10)
}

// ── 2. 새 동작 후 다시 스택 비움 / 같은 값은 기록 안 함 ──
{
  let h = createHistory(E())
  h = push(h, E(F('a')), LABELS.add)
  h = push(h, E(F('a'), F('b')), LABELS.add)
  h = undo(h).history
  h = push(h, E(F('a', 50)), LABELS.move)
  eq('새 동작 후 다시 불가', canRedo(h), false)
  eq('새 동작 후 목록', h.steps.map(s => s.label), [LABELS.init, LABELS.add, LABELS.move])
  const same = push(h, E(F('a', 50)), LABELS.move)
  eq('값이 같으면 기록 안 함', same === h, true)
}

// ── 3. 50단계 한도 ──
{
  let h = createHistory(E(), LABELS.init)
  for (let i = 1; i <= 70; i++) h = push(h, E(F('a', i)), LABELS.move)
  eq('70번 기록 → 50단계만', [h.steps.length, h.index], [HISTORY_LIMIT, HISTORY_LIMIT - 1])
  eq('가장 오래된 것부터 버림 (첫 단계 x)', h.steps[0].edit.layers[0].x, 21)
  let n = 0; while (canUndo(h)) { h = undo(h).history; n++ }
  eq('되돌리기 가능 횟수', n, HISTORY_LIMIT - 1)
}

// ── 4. 모르는 type 보존 ──
{
  const cover = { id: 'c_1', type: 'cover', x: 1, y: 2, w: 3, h: 4, color: '#fff' }
  const text = { id: 't_1', type: 'text', text: '안녕', x: 5, y: 6 }
  let h = createHistory({ v: 2, layers: [cover], extra: { keep: 1 } })
  h = push(h, { v: 2, layers: [cover, F('a'), text], extra: { keep: 1 } }, LABELS.add)
  h = push(h, { v: 2, layers: [cover, text], extra: { keep: 1 } }, LABELS.remove)
  const back = undo(h)
  eq('되돌려도 cover·text 보존', back.edit.layers.map(l => l.type), ['cover', 'fill', 'text'])
  eq('cover 값 그대로', back.edit.layers[0], cover)
  eq('edit의 다른 키도 보존', back.edit.extra, { keep: 1 })
  const c = clear(h, { v: 2, layers: [text] })
  eq('충돌 후 불러오기 = 첫 단계만', [c.steps.length, c.index, c.steps[0].label, canUndo(c)], [1, 0, LABELS.reload, false])
}

// ── 5. 3px 클릭 판정 ──
{
  const s = { x: 100, y: 100 }
  eq('안 움직임 = 선택만', isSelectOnly(s, { x: 100, y: 100 }), true)
  eq('2px = 선택만', isSelectOnly(s, { x: 102, y: 100 }), true)
  eq('대각선 2.1px = 선택만', isSelectOnly(s, { x: 101.5, y: 101.5 }), true)
  eq('3px = 이동', isSelectOnly(s, { x: 103, y: 100 }), false)
  eq('대각선 2.2+2.2 (3.1px) = 이동', isSelectOnly(s, { x: 102.2, y: 102.2 }), false)
}

// ── 6. 범위 맞춤 ──
{
  eq('안쪽이면 그대로', clampRectToImage({ x: 10, y: 20, w: 30, h: 40 }, 100, 100), { rect: { x: 10, y: 20, w: 30, h: 40 }, changed: false })
  eq('오른쪽 넘침', clampRectToImage({ x: 1502, y: 853, w: 780, h: 80 }, 1920, 1920).rect, { x: 1140, y: 853, w: 780, h: 80 })
  eq('왼쪽 위 음수', clampRectToImage({ x: -5, y: -1, w: 30, h: 40 }, 100, 100), { rect: { x: 0, y: 0, w: 30, h: 40 }, changed: true })
  eq('아래 넘침', clampRectToImage({ x: 0, y: 1900, w: 10, h: 40 }, 1240, 1920).rect, { x: 0, y: 1880, w: 10, h: 40 })
  eq('이미지보다 큼', clampRectToImage({ x: 10, y: 10, w: 200, h: 50 }, 100, 100).rect, { x: 0, y: 10, w: 100, h: 50 })
}

// ── 7. 글자 걸침 판정 (합성 픽셀) ──
function synth(W, H, bg, draw) {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) { data[i * 4] = bg[0]; data[i * 4 + 1] = bg[1]; data[i * 4 + 2] = bg[2]; data[i * 4 + 3] = 255 }
  const put = (x, y, c) => { const o = (y * W + x) * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2] }
  draw(put)
  return { data, width: W, height: H }
}
function detect(img, rect) {
  const l = { id: 't', type: 'fill', ...rect, method: 'coons', pad: 4 }
  const crop = cropRect(l, img.width, img.height)
  const cd = { data: new Uint8ClampedArray(crop.w * crop.h * 4), width: crop.w, height: crop.h }
  for (let y = 0; y < crop.h; y++) cd.data.set(img.data.subarray(((crop.y + y) * img.width + crop.x) * 4, ((crop.y + y) * img.width + crop.x + crop.w) * 4), y * crop.w * 4)
  return detectBleed(cd, crop, l, img.width, img.height).sides
}
{
  // 검은 바탕 + 노란 "글자" 획 (세로 막대 여러 개, x 100~400 / y 100~160)
  const band = synth(500, 260, [12, 12, 14], put => {
    for (let s = 0; s < 12; s++) for (let x = 100 + s * 26; x < 100 + s * 26 + 10; x++) for (let y = 100; y < 160; y++) put(x, y, [250, 230, 60])
  })
  eq('걸침: 위 변이 획을 가로지름', detect(band, { x: 90, y: 120, w: 330, h: 50 }), ['top'])
  eq('걸침: 위·아래 모두 가로지름', detect(band, { x: 90, y: 120, w: 330, h: 20 }), ['top', 'bottom'])
  eq('걸침: 오른쪽이 획을 가로지름', detect(band, { x: 90, y: 90, w: 213, h: 80 }), ['right'])
  eq('정상: 글자 다 덮음', detect(band, { x: 88, y: 88, w: 330, h: 84 }), [])
  // 흰 바탕 + 세로 그라데이션 (완만한 변화는 걸침 아님)
  const grad = synth(400, 300, [255, 255, 255], put => {
    for (let y = 0; y < 300; y++) for (let x = 0; x < 400; x++) { const v = 255 - Math.round(y * 0.4); put(x, y, [v, v - 10, v - 20]) }
    for (let x = 150; x < 250; x++) for (let y = 120; y < 150; y++) put(x, y, [40, 20, 20])
  })
  eq('정상: 그라데이션 위 글자 다 덮음', detect(grad, { x: 140, y: 110, w: 120, h: 50 }), [])
  eq('정상: 이미지 끝에 붙은 영역', detect(grad, { x: 0, y: 0, w: 60, h: 40 }), [])
  // 점수만으로 판정 규칙
  eq('네 변 모두 거칢(사진 위) = 걸침 아님', bleedSidesFromScores({ top: 20, right: 22, bottom: 18, left: 25 }), [])
  eq('한 변만 튐 = 걸침', bleedSidesFromScores({ top: 15.2, right: 0.2, bottom: 0.9, left: 2.2 }), ['top'])
  eq('튀지만 기준(8) 미만 = 걸침 아님', bleedSidesFromScores({ top: 6, right: 0.1, bottom: 0.1, left: 0.1 }), [])
  eq('완만한 선형 변화의 고역 편차 ≈ 0', highPassDeviation(Float32Array.from({ length: 200 }, (_, i) => i * 0.5)) < 0.6, true)
}

// ── 8. 조금 넓히기 ──
{
  eq('위만 6px', widenSides({ x: 50, y: 50, w: 100, h: 40 }, ['top'], 500, 500), { x: 50, y: 44, w: 100, h: 46 })
  eq('왼쪽·아래 6px', widenSides({ x: 50, y: 50, w: 100, h: 40 }, ['left', 'bottom'], 500, 500), { x: 44, y: 50, w: 106, h: 46 })
  eq('이미지 끝을 넘지 않음', widenSides({ x: 2, y: 490, w: 100, h: 8 }, ['left', 'bottom'], 500, 500), { x: 0, y: 490, w: 102, h: 10 })
}

// ── 9. 로그인 후 복귀 주소 (내부 경로만) ──
{
  const ok = ['/studio/p/6508c6a5-e6a7-4958-a8ea-76453ee984cf', '/studio/projects', '/dashboard/orders?tab=2', '/']
  const bad = ['//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', '', null, '/studio\n/x', 'javascript:alert(1)']
  eq('내부 경로 허용', ok.map(isSafeRedirectPath), ok.map(() => true))
  eq('외부·이상한 주소 거부', bad.map(isSafeRedirectPath), bad.map(() => false))
  eq('스튜디오 보호 화면 판정', ['/studio/p/x', '/studio/projects', '/studio', '/dashboard'].map(isStudioProtectedPath), [true, true, false, false])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
