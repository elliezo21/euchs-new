// 붓 지우기 순수 함수 테스트 — node scripts/test-studio-brush.mjs
// 마스크 그리기·넓히기·감싸는 사각형·단순화·key(hash)·모양 검사·단색·옮기기
import {
  rasterizeStrokes, dilateMask, brushBBox, simplifyStroke, brushHash, isValidBrushLayer, isValidStroke,
  translateBrush, solidFillBrush, brushPointCount, BRUSH_MAX_POINTS,
} from '../src/lib/studioBrush.js'
import { fillPlan, fillArea, cropRect, ownKey, fillOnCrop, aiGrow } from '../src/lib/studioFillPlan.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const count = m => m.reduce((a, v) => a + v, 0)
const S = (mode, size, pts) => ({ mode, size, pts })
const B = (strokes, extra = {}) => ({ id: 'f_brush1', type: 'fill', shape: 'brush', x: 0, y: 0, w: 1, h: 1, method: 'ai', pad: 4, brush: { strokes }, ...extra })

// ── 1. 마스크 그리기 ──
{
  // 점 하나, 크기 5 (반지름 2.5): 거리² ≤ 6.25 → 21픽셀 (정수 격자 원)
  const m = rasterizeStrokes([S('add', 5, [10, 10])], { x: 0, y: 0, w: 20, h: 20 })
  eq('점 하나(크기 5) 픽셀 수', count(m), 21)
  eq('점 중심 칠함, 3칸 밖 안 칠함', [m[10 * 20 + 10], m[10 * 20 + 13]], [1, 0])
  // 가로 선분 (0..20, y=10) 크기 4 → 거리 ≤ 2: 세로 5줄 × 가로 21 + 양끝 반원
  const line = rasterizeStrokes([S('add', 4, [0, 10, 20, 10])], { x: 0, y: 0, w: 30, h: 20 })
  eq('선분 가운데 세로 두께 5', [...Array(20).keys()].filter(y => line[y * 30 + 10]).length, 5)
  // 덜어내기: 가운데를 지우면 가운데만 빔
  const sub = rasterizeStrokes([S('add', 4, [0, 10, 20, 10]), S('sub', 3, [10, 10])], { x: 0, y: 0, w: 30, h: 20 })
  eq('덜어내기 → 가운데 빔, 양 끝은 그대로', [sub[10 * 30 + 10], sub[10 * 30 + 2], sub[10 * 30 + 18]], [0, 1, 1])
  eq('순서: 덜어낸 뒤 다시 칠하면 채움', rasterizeStrokes([S('sub', 3, [10, 10]), S('add', 3, [10, 10])], { x: 0, y: 0, w: 20, h: 20 })[10 * 20 + 10], 1)
  // rect 좌표계: 같은 획을 다른 창으로 봐도 같은 픽셀
  const a = rasterizeStrokes([S('add', 9, [40, 40, 60, 45])], { x: 30, y: 30, w: 40, h: 30 })
  const b = rasterizeStrokes([S('add', 9, [40, 40, 60, 45])], { x: 0, y: 0, w: 100, h: 100 })
  let same = true
  for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) if (a[y * 40 + x] !== b[(y + 30) * 100 + x + 30]) same = false
  eq('창 위치와 무관하게 같은 픽셀', same, true)
}

// ── 2. 넓히기 (원, 유클리드) ──
{
  const w = 41, h = 41
  const one = new Uint8Array(w * h); one[20 * w + 20] = 1
  const d = dilateMask(one, w, h, 5)
  // 거리² ≤ 25 인 격자점 수 = 81
  eq('점 하나 5px 넓힘 = 원(81픽셀)', count(d), 81)
  eq('대각선 (3,4)=5 포함, (4,4) 제외', [d[(20 + 3) * w + 24], d[(20 + 4) * w + 24]], [1, 0])
  eq('넓힘 0 = 그대로', count(dilateMask(one, w, h, 0)), 1)
  eq('빈 마스크 넓혀도 빔', count(dilateMask(new Uint8Array(w * h), w, h, 5)), 0)
  // rasterize의 넓힘 = 그린 뒤 dilate 와 같음, 창 밖 칠한 픽셀도 반영
  const g1 = rasterizeStrokes([S('add', 4, [5, 5])], { x: 8, y: 0, w: 10, h: 10 }, 6)
  eq('창 밖에서 칠한 모양이 넓힘으로 들어옴', g1[5 * 10 + 0], 1)
}

// ── 3. 감싸는 사각형 ──
{
  eq('bbox 점 하나', brushBBox([S('add', 5, [10, 10])], 100, 100), { x: 8, y: 8, w: 5, h: 5 })
  eq('bbox 이미지 끝에서 자름', brushBBox([S('add', 10, [0, 0])], 100, 100), { x: 0, y: 0, w: 6, h: 6 })
  // 덜어내기 원(반지름 6)의 바로 바깥 (30,8)은 거리 6.32라 남는다 → 오른쪽 끝 x=30
  eq('bbox 덜어내면 줄어듦', brushBBox([S('add', 4, [0, 10, 40, 10]), S('sub', 12, [36, 10, 50, 10])], 100, 100), { x: 0, y: 8, w: 31, h: 5 })
  eq('bbox 모두 덜어내면 null', brushBBox([S('add', 4, [10, 10]), S('sub', 10, [10, 10])], 100, 100), null)
  eq('bbox 칠하기 없으면 null', brushBBox([S('sub', 4, [10, 10])], 100, 100), null)
}

// ── 4. 단순화 ──
{
  // 1px 간격으로 모은 직선 200점 → 양 끝 2점 (직선)
  const pts = []; for (let x = 0; x <= 200; x++) pts.push(x, 50)
  const s = simplifyStroke(pts, 20)
  eq('직선 201점 → 2점', s, [0, 50, 200, 50])
  eq('직선 단순화해도 마스크 같음', count(rasterizeStrokes([S('add', 20, s)], { x: -20, y: 20, w: 250, h: 60 })),
    count(rasterizeStrokes([S('add', 20, pts)], { x: -20, y: 20, w: 250, h: 60 })))
  // 원을 따라 그린 곡선(반지름 100, 721점)·손떨림 물결(281점) — 가장자리가 최대 몇 px 움직이나
  // (픽셀 차이 %는 가는 붓일수록 가장자리 비중이 커서 의미가 없다 → 달라진 픽셀에서 같은 값 픽셀까지의 최대 거리로 잰다)
  const circle = []; for (let i = 0; i <= 720; i++) { const a = i / 720 * Math.PI * 2; circle.push(150 + 100 * Math.cos(a), 150 + 100 * Math.sin(a)) }
  const wave = []; for (let x = 0; x <= 280; x++) wave.push(10 + x, 150 + 6 * Math.sin(x / 9))
  const R = { x: -40, y: -40, w: 400, h: 400 }
  const maxShift = (a, b) => {
    let m = 0
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue
      const x = i % R.w, y = (i / R.w) | 0
      let best = 99
      for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) {
        const X = x + xx, Y = y + yy
        if (X >= 0 && Y >= 0 && X < R.w && Y < R.h && a[Y * R.w + X] === b[i]) best = Math.min(best, Math.hypot(xx, yy))
      }
      m = Math.max(m, best)
    }
    return m
  }
  for (const size of [10, 30, 60]) {
    for (const [name, pts] of [['원', circle], ['물결', wave]]) {
      const sp = simplifyStroke(pts, size)
      const shift = maxShift(rasterizeStrokes([S('add', size, pts.map(Math.round))], R), rasterizeStrokes([S('add', size, sp)], R))
      eq(`${name} 크기${size}: ${pts.length / 2}→${sp.length / 2}점, 가장자리 ${shift.toFixed(2)}px ≤ max(1.5, 크기×4%)`,
        sp.length / 2 <= pts.length / 2 / 5 && shift <= Math.max(1.5, size * 0.04), true)
    }
  }
  eq('점 하나 그대로', simplifyStroke([12.4, 7.6], 10), [12, 8])
  eq('정수로 반올림', simplifyStroke([0.4, 0.6, 30.5, 0.2], 10).every(Number.isInteger), true)
}

// ── 5. 계산 key (획이 바뀌면 바뀜) ──
{
  const st = [S('add', 20, [10, 10, 50, 10])]
  const h0 = brushHash({ strokes: st })
  eq('hash 16자리', /^[0-9a-f]{16}$/.test(h0), true)
  eq('같은 획 → 같은 hash', brushHash({ strokes: [S('add', 20, [10, 10, 50, 10])] }), h0)
  eq('점 하나 다름 → 다름', brushHash({ strokes: [S('add', 20, [10, 10, 51, 10])] }) !== h0, true)
  eq('크기 다름 → 다름', brushHash({ strokes: [S('add', 21, [10, 10, 50, 10])] }) !== h0, true)
  eq('덜어내기 추가 → 다름', brushHash({ strokes: [...st, S('sub', 5, [20, 10])] }) !== h0, true)
  const l1 = B(st, { x: 0, y: 0, w: 61, h: 21 })
  const k1 = fillPlan([l1], 800, 800)[0].key
  eq('붓 계산 key에 획 hash 포함', k1.includes(h0), true)
  eq('획 바뀌면 계산 key 바뀜', fillPlan([B([S('add', 20, [10, 10, 52, 10])], { x: 0, y: 0, w: 63, h: 21 })], 800, 800)[0].key !== k1, true)
  eq('네모 ownKey는 예전과 같음', ownKey({ id: 'f_a', x: 1, y: 2, w: 3, h: 4, method: 'ai', pad: 4 }), 'f_a|1,2,3,4|ai|4')
}

// ── 6. 모양 검사 ──
{
  const ok = B([S('add', 20, [10, 10, 50, 10])])
  eq('정상 붓 레이어', isValidBrushLayer(ok), true)
  eq('단색 붓 정상', isValidBrushLayer({ ...ok, method: 'solid' }), true)
  eq('coons 붓은 거절', isValidBrushLayer({ ...ok, method: 'coons' }), false)
  eq('shape 다름 거절', isValidBrushLayer({ ...ok, shape: 'rect' }), false)
  eq('획 없음 거절', isValidBrushLayer(B([])), false)
  eq('덜어내기만 거절', isValidBrushLayer(B([S('sub', 5, [1, 1])])), false)
  eq('점 홀수 거절', isValidStroke(S('add', 5, [1, 2, 3])), false)
  eq('소수 좌표 거절', isValidStroke(S('add', 5, [1.5, 2])), false)
  eq('크기 1 거절(최소 2)', isValidStroke(S('add', 1, [1, 2])), false)
  eq('mode 이상 거절', isValidStroke(S('erase', 5, [1, 2])), false)
  const many = B([S('add', 5, Array.from({ length: (BRUSH_MAX_POINTS + 1) * 2 }, (_, i) => i))])
  eq(`점 ${BRUSH_MAX_POINTS + 1}개 거절`, [brushPointCount(many.brush), isValidBrushLayer(many)], [BRUSH_MAX_POINTS + 1, false])
}

// ── 7. 범위 (AI k·단색 pad) ──
{
  const st = [S('add', 20, [100, 100, 300, 100])]
  const bb = brushBBox(st, 800, 800)
  const ai = B(st, { ...bb, method: 'ai', pad: 4 })
  eq('AI 붓 메우는 범위 = bbox + max(pad,k)', fillArea(ai, 800, 800), { x: bb.x - 8, y: bb.y - 8, w: bb.w + 16, h: bb.h + 16 })
  eq('AI 붓 잘라내는 범위 = 메우는 범위 + 여백', cropRect(ai, 800, 800).x, Math.max(0, bb.x - 8 - 67))
  const so = { ...ai, method: 'solid', pad: 3 }
  eq('단색 붓 메우는 범위 = bbox + pad', fillArea(so, 800, 800), { x: bb.x - 3, y: bb.y - 3, w: bb.w + 6, h: bb.h + 6 })
  // AI 마스크: 원 넓힘 k=8 → 모든 칠한 곳 + 8px, 메우는 범위 밖으로 안 나감
  const area = fillArea(ai, 800, 800)
  const m = rasterizeStrokes(st, area, aiGrow(ai, 800, 800))
  eq('AI 마스크 = 선분 두께 20+2×8 → 세로 37줄', [...Array(area.h).keys()].filter(y => m[y * area.w + Math.floor(area.w / 2)]).length, 37)
}

// ── 8. 단색 (칠한 모양 바깥 띠 중앙값, 모양 그대로) ──
{
  const W = 60, H = 40
  const img = { data: new Uint8ClampedArray(W * H * 4), width: W, height: H }
  for (let i = 0; i < W * H; i++) { img.data[i * 4] = 200; img.data[i * 4 + 1] = 100; img.data[i * 4 + 2] = 50; img.data[i * 4 + 3] = 255 }
  // 검은 "글자" (x 20..40, y 18..22)
  for (let y = 18; y <= 22; y++) for (let x = 20; x <= 40; x++) { const o = (y * W + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 0 }
  const st = [S('add', 10, [22, 20, 38, 20])]
  const bb = brushBBox(st, W, H)
  const l = B(st, { ...bb, method: 'solid', pad: 1 })
  const crop = cropRect(l, W, H)
  const cd = { data: new Uint8ClampedArray(crop.w * crop.h * 4), width: crop.w, height: crop.h }
  for (let y = 0; y < crop.h; y++) cd.data.set(img.data.subarray(((crop.y + y) * W + crop.x) * 4, ((crop.y + y) * W + crop.x + crop.w) * 4), y * crop.w * 4)
  const r = fillOnCrop(cd, crop, l, W, H)
  eq('단색 붓 성공 + 영역', [r.ok, r.area], [true, fillArea(l, W, H)])
  const at = (x, y) => { const o = ((y - r.area.y) * r.area.w + (x - r.area.x)) * 4; return [r.data.data[o], r.data.data[o + 1], r.data.data[o + 2]] }
  eq('칠한 곳 = 바깥 띠 중앙값(배경색)', at(30, 20), [200, 100, 50])
  eq('메우는 범위 안이지만 칠하지 않은 모서리는 원본', at(r.area.x, r.area.y), [200, 100, 50])
  // 모양 그대로: 원래 검은 글자 중 붓 밖(x=20 끝, 반지름 5 밖)인 곳은 남는다 — pad 1 넓힘으로도 닿지 않는 위치
  const bare = solidFillBrush({ data: new Uint8ClampedArray(cd.data), width: cd.width, height: cd.height }, crop, st, 0, W, H)
  eq('solidFillBrush 직접 호출', bare.ok, true)
}

// ── 9. 옮기기 ──
{
  const st = [S('add', 10, [10, 10, 20, 10]), S('sub', 4, [15, 10])]
  const t = translateBrush({ strokes: st }, 5, -3)
  eq('획 전체 이동', t.strokes.map(s => s.pts), [[15, 7, 25, 7], [20, 7]])
  eq('크기·mode 그대로', t.strokes.map(s => [s.mode, s.size]), [['add', 10], ['sub', 4]])
  eq('원본은 안 바뀜', st[0].pts, [10, 10, 20, 10])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
