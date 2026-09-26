// 덮기(12-2) 테스트 — node scripts/test-studio-cover.mjs
// 1) 레이어 모양·정리·가져올 곳 자동 자리  2) 픽셀 복사 + 가장자리 섞기  3) 옛 데이터(지우기만) 호환
// 4) 지우기·덮기가 섞인 순서 = 전체 이미지 순차 계산 (픽셀 단위 동일)  5) 가져올 곳이 사진 끝·밖일 때
import {
  isValidCoverLayer, normalizeCover, autoSource, coverAlpha, blendCover, coverArea, coverSourceArea, coverReadRects,
  COVER_FEATHER_DEFAULT, COVER_FEATHER_MAX,
} from '../src/lib/studioCover.js'
import { fillPlan, fillArea, cropRect, fillOnCrop, coverCrops, coverOnCrops, influenceRect, ownKey, effectiveKey } from '../src/lib/studioFillPlan.js'
import { applyFill } from '../src/lib/studioFill.js'
import { stampEraseVersion } from '../src/lib/studioFinal.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(50)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const F = (id, x, y, w, h, extra = {}) => ({ id, type: 'fill', x, y, w, h, method: 'coons', pad: 4, ...extra })
const C = (id, x, y, w, h, sx, sy, feather = 0) => ({ id, type: 'cover', x, y, w, h, sx, sy, feather })

// ── 1. 모양·정리·자동 자리 ──
eq('기본 가장자리 8px', COVER_FEATHER_DEFAULT, 8)
eq('덮기 레이어 모양 OK', isValidCoverLayer(C('c1', 10, 10, 50, 20, 80, 10, 8)), true)
eq('지우기 레이어는 덮기 아님', isValidCoverLayer(F('f1', 10, 10, 50, 20)), false)
eq('type 없는 레이어는 덮기 아님 (보존만)', isValidCoverLayer({ id: 'x', x: 1, y: 1, w: 5, h: 5, sx: 0, sy: 0, feather: 0 }), false)
eq('feather 범위 밖이면 아님', isValidCoverLayer(C('c1', 10, 10, 50, 20, 80, 10, COVER_FEATHER_MAX + 1)), false)
eq('소수 좌표면 아님', isValidCoverLayer(C('c1', 10.5, 10, 50, 20, 80, 10, 8)), false)
{
  const { layer, changed } = normalizeCover(C('c1', 10, 10, 50, 20, 380, -5, 60), 400, 300)
  eq('가져올 곳이 사진 밖 → 안으로 (크기 그대로)', [layer.sx, layer.sy, layer.w, layer.h], [350, 0, 50, 20])
  eq('feather 최대로', layer.feather, COVER_FEATHER_MAX)
  eq('정리하면 changed', changed, true)
  eq('정리된 값은 유효', isValidCoverLayer(layer), true)
  eq('이미 정리된 값은 그대로', normalizeCover(layer, 400, 300).changed, false)
  const big = normalizeCover(C('c2', -20, 250, 500, 100, 0, 0, 8), 400, 300).layer
  eq('덮을 곳이 사진보다 크면 사진 안으로', [big.x, big.y, big.w, big.h], [0, 200, 400, 100])
  eq('소수 → 정수', normalizeCover(C('c3', 10.4, 10.6, 50.2, 19.7, 80.5, 10.2, 7.6), 400, 300).layer,
    { id: 'c3', type: 'cover', x: 10, y: 11, w: 50, h: 20, sx: 81, sy: 10, feather: 8 })
}
eq('자동 자리: 오른쪽 (간격 feather+4)', autoSource({ x: 10, y: 10, w: 50, h: 20 }, 8, 400, 300), { sx: 72, sy: 10 })
eq('자동 자리: 오른쪽 끝이면 왼쪽', autoSource({ x: 340, y: 10, w: 50, h: 20 }, 8, 400, 300), { sx: 278, sy: 10 })
eq('자동 자리: 좌우 모두 안 되면 아래', autoSource({ x: 100, y: 10, w: 250, h: 20 }, 8, 400, 300), { sx: 100, sy: 42 })
eq('자동 자리: 아래도 안 되면 위', autoSource({ x: 100, y: 270, w: 250, h: 20 }, 8, 400, 300), { sx: 100, sy: 238 })
{
  const s = autoSource({ x: 10, y: 10, w: 380, h: 280 }, 8, 400, 300)
  eq('자동 자리: 어디도 다 안 들어가면 사진 안 (덜 겹치는 곳)', s.sx >= 0 && s.sy >= 0 && s.sx + 380 <= 400 && s.sy + 280 <= 300, true)
}

// ── 2. 픽셀 복사 + 가장자리 섞기 ──
function makeImage(w, h, seed = 1) {
  const data = new Uint8ClampedArray(w * h * 4)
  let s = seed
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4
    data[o] = (x * 255 / w) | 0; data[o + 1] = (y * 255 / h) | 0; data[o + 2] = 128 + ((rnd() * 40) | 0); data[o + 3] = 255
  }
  for (let i = 0; i < 30; i++) { // 검은 "글자" 막대
    const bx = (rnd() * (w - 60)) | 0, by = (rnd() * (h - 20)) | 0
    for (let y = by; y < by + 14; y++) for (let x = bx; x < bx + 50; x++) { const o = (y * w + x) * 4; data[o] = data[o + 1] = data[o + 2] = 10 }
  }
  return { data, width: w, height: h }
}
const clone = img => ({ data: new Uint8ClampedArray(img.data), width: img.width, height: img.height })
function cropOf(img, r) {
  const out = new Uint8ClampedArray(r.w * r.h * 4)
  for (let y = 0; y < r.h; y++) out.set(img.data.subarray(((r.y + y) * img.width + r.x) * 4, ((r.y + y) * img.width + r.x + r.w) * 4), y * r.w * 4)
  return { data: out, width: r.w, height: r.h }
}
const px = (img, x, y) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)]
const at = (res, x, y) => [...res.data.data.subarray(((y - res.area.y) * res.area.w + (x - res.area.x)) * 4, ((y - res.area.y) * res.area.w + (x - res.area.x)) * 4 + 4)]
function blendOn(img, l) {
  const W = img.width, H = img.height
  return blendCover(cropOf(img, coverSourceArea(l, W, H)), cropOf(img, coverArea(l, W, H)), l, W, H)
}
{
  const img = makeImage(400, 300)
  const l = C('c', 50, 60, 40, 20, 200, 100, 0)
  const r = blendOn(img, l)
  eq('feather 0: 결과 범위 = 덮을 곳 그대로', r.area, { x: 50, y: 60, w: 40, h: 20 })
  let same = 0
  for (let y = 0; y < 20; y++) for (let x = 0; x < 40; x++) if (JSON.stringify(at(r, 50 + x, 60 + y)) === JSON.stringify(px(img, 200 + x, 100 + y))) same++
  eq('feather 0: 덮을 곳 = 가져올 곳 픽셀 그대로 (800개)', same, 800)
  eq('크기가 다른 조각은 거절', blendCover(cropOf(img, { x: 0, y: 0, w: 5, h: 5 }), cropOf(img, coverArea(l, 400, 300)), l, 400, 300), { ok: false, reason: 'crop_size_mismatch' })
}
{
  const img = makeImage(400, 300, 3)
  const l = C('c', 100, 100, 40, 20, 220, 150, 8)
  const r = blendOn(img, l)
  eq('feather 8: 결과 범위 = 덮을 곳 + 사방 8', r.area, { x: 92, y: 92, w: 56, h: 36 })
  eq('feather 8: 네모 안(왼쪽 위 칸) = 가져온 픽셀', at(r, 100, 100), px(img, 220, 150))
  eq('feather 8: 네모 안(오른쪽 아래 칸) = 가져온 픽셀', at(r, 139, 119), px(img, 259, 169))
  // 바깥 띠 맨 끝(8칸 떨어짐)은 원래 픽셀에 가깝고, 네모에 가까울수록 가져온 픽셀에 가깝다
  const a = [0, 1, 3, 5, 7].map(d => coverAlpha(99 - d, 110, l))
  eq('섞는 정도: 네모에서 멀어질수록 줄어듦', a.every((v, i) => i === 0 || v < a[i - 1]), true)
  eq('섞는 정도: 네모 안 1', coverAlpha(120, 110, l), 1)
  eq('섞는 정도: 모서리 대각선 끝은 0 (둥근 모서리)', coverAlpha(92, 92, l), 0)
  eq('섞는 정도: feather 0이면 바깥 0', coverAlpha(99, 110, { ...l, feather: 0 }), 0)
  const edge = at(r, 92, 110), orig = px(img, 92, 110)
  eq('바깥 띠 끝 = 원래 픽셀과 거의 같음 (채널 차 ≤ 2)', edge.every((v, i) => Math.abs(v - orig[i]) <= 2), true)
}

// ── 3. 옛 데이터(지우기만) 호환 ──
{
  // 계산 key 모양이 예전과 같다 (AI 결과 조각 key = sha256(계산 key|모델) — 바뀌면 저장된 AI 결과를 못 쓴다)
  const ls = [F('a', 100, 100, 200, 50), F('b', 250, 120, 200, 50, { method: 'solid', pad: 2 }), F('c', 420, 140, 200, 50, { method: 'ai' })]
  const keys = fillPlan(ls, 1240, 1920).map(p => p.key)
  eq('지우기만: 계산 key 예전 모양 그대로', keys, [
    'a|100,100,200,50|coons|4',
    'a|100,100,200,50|coons|4 > b|250,120,200,50|solid|2',
    'a|100,100,200,50|coons|4 > b|250,120,200,50|solid|2 > c|420,140,200,50|ai|4',
  ])
  // 연결 판정이 예전 규칙(영향 범위끼리 겹침)과 같은지 — 무작위 배치 300개
  let s = 11
  const rnd = n => ((s = (s * 1103515245 + 12345) & 0x7fffffff) % n)
  let diff = 0
  for (let t = 0; t < 300; t++) {
    const n = 2 + rnd(8)
    const list = Array.from({ length: n }, (_, i) => F(`f${i}`, rnd(700), rnd(700), 10 + rnd(120), 10 + rnd(60), { method: ['coons', 'solid', 'ai'][rnd(3)], pad: rnd(13) }))
    const inf = list.map(l => influenceRect(l, 800, 800))
    const ov = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
    const oldDeps = list.map((_, k) => list.slice(0, k).filter((_, j) => ov(inf[j], inf[k])).map(l => l.id))
    const newDeps = fillPlan(list, 800, 800).map(p => p.deps)
    if (JSON.stringify(oldDeps) !== JSON.stringify(newDeps)) diff++
  }
  eq('지우기만: 연결 판정 = 예전 규칙 (무작위 300개)', diff, 0)
  // 저장: 덮기를 넣거나 바꾸면 erase_v가 올라가 완성 사진을 새로 만든다. 필터만 바뀌면 그대로
  const base = { v: 2, layers: [F('a', 1, 1, 10, 10)], erase_v: 3 }
  eq('덮기 추가 → erase_v = 이번 버전', stampEraseVersion({ v: 2, layers: [...base.layers, C('c', 20, 20, 10, 10, 40, 20, 8)] }, base, 5).erase_v, 6)
  const withCover = { v: 2, layers: [...base.layers, C('c', 20, 20, 10, 10, 40, 20, 8)], erase_v: 6 }
  eq('덮기 가져올 곳 옮김 → erase_v 올라감', stampEraseVersion({ v: 2, layers: [base.layers[0], C('c', 20, 20, 10, 10, 41, 20, 8)] }, withCover, 6).erase_v, 7)
  eq('덮기 그대로 + 필터만 → erase_v 그대로', stampEraseVersion({ v: 2, layers: withCover.layers, look: { filter: 'warm' } }, withCover, 6).erase_v, 6)
  eq('덮기 삭제 → erase_v 올라감', stampEraseVersion({ v: 2, layers: base.layers }, withCover, 7).erase_v, 8)
  // 모르는 type·type 없는 레이어는 계산에 넣지 않는다 (편집기가 pixelLayersOf로 거른다 — 덮기·지우기 판정 함수 기준)
  eq('type 없는 레이어는 지우기로 계산하지 않음 (보존만)', isValidCoverLayer({ id: 'old', x: 0, y: 0, w: 5, h: 5, method: 'solid', pad: 0 }), false)
}

// ── 4. 지우기·덮기가 섞인 순서 = 전체 이미지 순차 계산 ──
// 기준: 전체 이미지에 배열 순서대로 하나씩 적용 (지우기 = applyFill, 덮기 = 그 순간 사진에서 복사·섞기 — 따로 쓴 계산)
function refAlpha(x, y, l) {
  const cx = x + 0.5, cy = y + 0.5
  const dx = Math.max(l.x - cx, 0, cx - (l.x + l.w)), dy = Math.max(l.y - cy, 0, cy - (l.y + l.h))
  if (dx === 0 && dy === 0) return 1
  if (l.feather <= 0) return 0
  const t = Math.max(0, Math.min(1, 1 - Math.hypot(dx, dy) / l.feather))
  return t * t * (3 - 2 * t)
}
function coverFull(img, l) {
  const W = img.width, H = img.height, snap = clone(img)
  const x0 = Math.max(0, l.x - l.feather), y0 = Math.max(0, l.y - l.feather)
  const x1 = Math.min(W, l.x + l.w + l.feather), y1 = Math.min(H, l.y + l.h + l.feather)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const a = refAlpha(x, y, l)
    const qx = Math.max(0, Math.min(W - 1, x + l.sx - l.x)), qy = Math.max(0, Math.min(H - 1, y + l.sy - l.y))
    const o = (y * W + x) * 4, q = (qy * W + qx) * 4
    for (let c = 0; c < 4; c++) img.data[o + c] = a === 0 ? snap.data[o + c] : a === 1 ? snap.data[q + c] : Math.round(snap.data[o + c] + (snap.data[q + c] - snap.data[o + c]) * a)
  }
}
function sequentialFull(img, ls) {
  const out = clone(img)
  for (const l of ls) {
    if (l.type === 'cover') coverFull(out, l)
    else applyFill(out, fillArea(l, img.width, img.height), l.method === 'coons' ? 'bilinear' : 'solid', { ring: 2, feather: 0 })
  }
  return out
}
// 편집기·완성 사진과 같은 길: 계획(fillPlan) → 조각마다 연결된 앞 결과만 덮어쓰고 계산 → 원본 위에 조각을 순서대로
function viaPatches(img, ls) {
  const W = img.width, H = img.height
  const p = fillPlan(ls, W, H)
  const done = new Map()
  for (let k = 0; k < ls.length; k++) {
    const l = ls[k]
    const prior = p[k].deps.map(id => done.get(id))
    let r
    if (l.type === 'cover') {
      const { src, dst } = coverCrops(l, W, H)
      r = coverOnCrops(cropOf(img, src), cropOf(img, dst), l, W, H, prior)
    } else {
      const crop = cropRect(l, W, H)
      r = fillOnCrop(cropOf(img, crop), crop, l, W, H, prior)
    }
    if (!r.ok) throw new Error(r.reason)
    done.set(l.id, r)
  }
  const out = clone(img)
  for (const l of ls) {
    const r = done.get(l.id)
    for (let y = 0; y < r.area.h; y++) out.data.set(r.data.data.subarray(y * r.area.w * 4, (y + 1) * r.area.w * 4), ((r.area.y + y) * W + r.area.x) * 4)
  }
  return out
}
const diffCount = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++; return n }
{
  const img = makeImage(400, 300, 5)
  const cases = {
    '지우기 → 덮기(가져올 곳이 지운 곳) → 지우기': [F('a', 200, 100, 60, 30), C('c', 60, 100, 60, 30, 200, 100, 6), F('b', 60, 128, 60, 20, { method: 'solid' })],
    '덮기 → 덮은 곳에 걸친 지우기': [C('c', 100, 50, 80, 30, 250, 50, 8), F('a', 170, 60, 40, 30)],
    '덮기 두 개 이어서 (두 번째가 첫 결과를 가져옴)': [C('c1', 50, 200, 50, 30, 150, 200, 4), C('c2', 300, 200, 50, 30, 50, 200, 4)],
    '가져올 곳이 자기 덮을 곳과 겹침': [C('c', 100, 150, 60, 40, 130, 160, 5)],
    '사진 끝의 덮기 + 옆 지우기': [C('c', 0, 0, 40, 20, 50, 0, 10), F('a', 30, 0, 40, 20, { method: 'solid', pad: 0 })],
    '떨어진 덮기·지우기 섞음': [F('a', 10, 10, 40, 20), C('c', 300, 250, 50, 30, 200, 250, 8), F('b', 320, 20, 40, 20, { method: 'solid' }), C('d', 10, 250, 30, 20, 60, 250, 0)],
  }
  for (const [name, ls] of Object.entries(cases)) {
    eq(`조각=전체 순차 (${name})`, diffCount(viaPatches(img, ls), sequentialFull(img, ls)), 0)
  }
  // 순서를 바꾸면 결과가 달라진다 (쌓인 순서대로 적용된다는 뜻)
  const ls = cases['지우기 → 덮기(가져올 곳이 지운 곳) → 지우기']
  eq('순서를 바꾸면 결과 다름 (지우기↔덮기)', diffCount(sequentialFull(img, ls), sequentialFull(img, [ls[1], ls[0], ls[2]])) > 0, true)
  // 계획: 덮기는 가져올 곳에 걸친 앞 레이어에 연결된다, 뒤 지우기는 덮은 곳에 연결된다
  const p = fillPlan(ls, 400, 300)
  eq('계획: 덮기 ← 가져올 곳의 지우기, 뒤 지우기 ← 덮기', [p[1].deps, p[2].deps], [['a'], ['c']])
  eq('계획: 덮기의 계산 key에 앞 지우기 포함', p[1].key, `${ownKey(ls[0])} > ${ownKey(ls[1])}`)
  eq('덮기 계산 key 모양', ownKey(ls[1]), 'c|60,100,60,30|cover|200,100|6')
  // 덮기는 AI가 아니라 단색처럼: 안 지운 앞 AI가 있으면 화면 key에 표시 → 그 AI를 지우면 다시 계산
  const withAi = [F('ai1', 200, 100, 60, 30, { method: 'ai' }), C('c', 60, 100, 60, 30, 200, 100, 6)]
  const pa = fillPlan(withAi, 400, 300), byId = new Map(withAi.map(l => [l.id, l]))
  eq('앞 AI 안 지움 → 덮기 화면 key에 표시', effectiveKey(pa[1], byId, () => false), `${pa[1].key} ~ai-missing:ai1`)
  // 덮기 초안을 맨 뒤에 붙여도 앞 레이어의 계산 key는 그대로 (AI 결과 key가 안 바뀜)
  const before = fillPlan(withAi.slice(0, 1), 400, 300).map(e => e.key)
  eq('맨 뒤 덮기 초안이 앞 key를 바꾸지 않음', fillPlan(withAi, 400, 300).slice(0, 1).map(e => e.key), before)
}

// ── 5. 가져올 곳이 사진 끝·밖 ──
{
  const img = makeImage(200, 100, 9)
  // 가져올 곳이 사진 밖으로 나가게 요청 → 정리하면 안으로
  const l = normalizeCover(C('c', 20, 20, 40, 20, 190, 95, 8), 200, 100).layer
  eq('밖으로 나간 가져올 곳 → 사진 안 (오른쪽 아래 끝)', [l.sx, l.sy], [160, 80])
  const r = blendOn(img, l)
  eq('끝에 붙은 가져올 곳: 계산 됨', r.ok, true)
  eq('끝에 붙은 가져올 곳: 읽는 범위는 사진 안', coverSourceArea(l, 200, 100), { x: 152, y: 72, w: 48, h: 28 })
  eq('끝에 붙은 가져올 곳: 조각 = 전체 순차 (가장자리 반복)', diffCount(viaPatches(img, [l]), sequentialFull(img, [l])), 0)
  // 섞는 띠가 사진 밖이면 사진 가장자리 픽셀을 반복해 읽는다 — 덮을 곳 바로 오른쪽 칸(가져올 곳 x=200 → 199)
  const ringX = l.x + l.w // 60 → 가져올 x = 200 (밖) → 199
  const a = coverAlpha(ringX, 30, l)
  const d = px(img, ringX, 30), s = px(img, 199, 30 + l.sy - l.y)
  eq('밖 띠 = 가장자리 픽셀과 섞음', at(r, ringX, 30), d.map((v, i) => Math.round(v + (s[i] - v) * a)))
  // 덮을 곳이 사진 모서리 — 결과 범위가 사진 밖으로 나가지 않음
  const corner = normalizeCover(C('k', 0, 0, 30, 20, 100, 50, 10), 200, 100).layer
  eq('모서리 덮기: 결과 범위 사진 안', coverArea(corner, 200, 100), { x: 0, y: 0, w: 40, h: 30 })
  eq('모서리 덮기: 읽는 범위 두 개', coverReadRects(corner, 200, 100), [{ x: 90, y: 40, w: 50, h: 40 }, { x: 0, y: 0, w: 40, h: 30 }])
  eq('모서리 덮기: 조각 = 전체 순차', diffCount(viaPatches(img, [corner]), sequentialFull(img, [corner])), 0)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
