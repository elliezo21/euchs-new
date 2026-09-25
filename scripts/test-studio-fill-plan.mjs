// 지우기 계산 순서 테스트 — node scripts/test-studio-fill-plan.mjs
// 1) 레이어 목록 → 연결 그룹·계산 순서·캐시 키  2) 조각 계산 = 전체 이미지 순차 계산 (픽셀 단위 동일)  3) 최악 경우 시간
import { fillPlan, connectedGroups, cropRect, fillArea, fillOnCrop, influenceRect, aiPatchKey, effectiveKey, aiEraseSet } from '../src/lib/studioFillPlan.js'
import { applyFill } from '../src/lib/studioFill.js'
import { createHash } from 'node:crypto'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const L = (id, x, y, w, h, extra = {}) => ({ id, type: 'fill', x, y, w, h, method: 'coons', pad: 4, ...extra })
const W = 1240, H = 1920
const plan = ls => fillPlan(ls, W, H).map(p => ({ id: p.id, deps: p.deps, chain: p.chain }))

// ── 1. 연결 판정 ──
// 영향 범위 = 영역 + pad 4 + 샘플 2 → 사방 6px. 두 영역 사이 간격이 12px 미만이면 연결
eq('떨어진 2개 (간격 40px)', plan([L('a', 100, 100, 200, 50), L('b', 100, 190, 200, 50)]),
  [{ id: 'a', deps: [], chain: [] }, { id: 'b', deps: [], chain: [] }])
eq('떨어진 2개 경계 (간격 12px = 연결 안 됨)', plan([L('a', 100, 100, 200, 50), L('b', 100, 162, 200, 50)])[1].deps, [])
eq('붙은 2개 (간격 11px = 연결)', plan([L('a', 100, 100, 200, 50), L('b', 100, 161, 200, 50)])[1].deps, ['a'])
eq('붙은 2개 (두 줄 글자, 딱 붙음)', plan([L('a', 100, 100, 400, 60), L('b', 100, 160, 400, 60)]),
  [{ id: 'a', deps: [], chain: [] }, { id: 'b', deps: ['a'], chain: ['a'] }])
{
  // c는 a와만 직접 겹치지 않고 b를 통해 이어짐 → deps는 b만, chain은 a·b
  const ls = [L('a', 100, 100, 200, 50), L('b', 250, 120, 200, 50), L('c', 420, 140, 200, 50)]
  eq('겹친 3개 계산 계획', plan(ls), [
    { id: 'a', deps: [], chain: [] },
    { id: 'b', deps: ['a'], chain: ['a'] },
    { id: 'c', deps: ['b'], chain: ['a', 'b'] },
  ])
  eq('겹친 3개 연결 그룹', connectedGroups(ls, W, H), [['a', 'b', 'c']])
  const all3 = [L('a', 100, 100, 200, 50), L('b', 150, 110, 200, 50), L('c', 200, 120, 200, 50)]
  eq('서로 다 겹친 3개', plan(all3)[2], { id: 'c', deps: ['a', 'b'], chain: ['a', 'b'] })
}
eq('두 그룹', connectedGroups([L('a', 0, 0, 50, 50), L('b', 900, 900, 50, 50), L('c', 40, 40, 50, 50), L('d', 940, 940, 20, 20)], W, H),
  [['a', 'c'], ['b', 'd']])
{
  // 앞 레이어 이동 → 뒤 레이어 키가 바뀌는지 (다시 계산 대상)
  const base = [L('a', 100, 100, 200, 50), L('b', 250, 120, 200, 50), L('c', 420, 140, 200, 50), L('far', 900, 1500, 100, 40)]
  const k0 = fillPlan(base, W, H).map(p => p.key)
  const moved = base.map(l => (l.id === 'a' ? { ...l, x: 104 } : l))
  const k1 = fillPlan(moved, W, H).map(p => p.key)
  eq('앞 레이어(a) 이동 → 다시 계산 대상', base.filter((l, i) => k0[i] !== k1[i]).map(l => l.id), ['a', 'b', 'c'])
  const movedFar = base.map(l => (l.id === 'far' ? { ...l, y: 1510 } : l))
  const k2 = fillPlan(movedFar, W, H).map(p => p.key)
  eq('떨어진 레이어 이동 → 그것만', base.filter((l, i) => k0[i] !== k2[i]).map(l => l.id), ['far'])
  const methodC = base.map(l => (l.id === 'c' ? { ...l, method: 'solid' } : l))
  const k3 = fillPlan(methodC, W, H).map(p => p.key)
  eq('맨 뒤 레이어 방식 변경 → 그것만', base.filter((l, i) => k0[i] !== k3[i]).map(l => l.id), ['c'])
  const padA = base.map(l => (l.id === 'a' ? { ...l, pad: 8 } : l))
  const k4 = fillPlan(padA, W, H).map(p => p.key)
  eq('앞 레이어 여유 변경 → 연결된 뒤도', base.filter((l, i) => k0[i] !== k4[i]).map(l => l.id), ['a', 'b', 'c'])
  // 연결이 끊기도록 멀리 옮기면 b의 키에서 a가 빠진다
  const apart = base.map(l => (l.id === 'a' ? { ...l, x: 100, y: 600 } : l))
  eq('앞 레이어를 멀리 옮기면 연결 해제', fillPlan(apart, W, H)[1].chain, [])
}

// ── 2. 조각 계산 = 전체 이미지 순차 계산 ──
function makeImage(w, h, seed = 1) {
  const data = new Uint8ClampedArray(w * h * 4)
  let s = seed
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4
    data[o] = (x * 255 / w) | 0; data[o + 1] = (y * 255 / h) | 0; data[o + 2] = 128 + ((rnd() * 40) | 0); data[o + 3] = 255
  }
  // 검은 "글자" 막대 여러 개
  for (let i = 0; i < 40; i++) {
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
function sequentialFull(img, ls) {
  const out = clone(img)
  for (const l of ls) applyFill(out, fillArea(l, img.width, img.height), l.method === 'coons' ? 'bilinear' : 'solid', { ring: 2, feather: 0 })
  return out
}
function viaPatches(img, ls, useDeps = true) {
  const Wd = img.width, Hd = img.height
  const p = fillPlan(ls, Wd, Hd)
  const done = new Map()
  for (let k = 0; k < ls.length; k++) {
    const crop = cropRect(ls[k], Wd, Hd)
    const prior = useDeps ? p[k].deps.map(id => done.get(id)) : []
    const r = fillOnCrop(cropOf(img, crop), crop, ls[k], Wd, Hd, prior)
    if (!r.ok) throw new Error(r.reason)
    done.set(ls[k].id, r)
  }
  // 화면처럼: 원본 위에 조각을 배열 순서대로 얹는다
  const out = clone(img)
  for (const l of ls) {
    const r = done.get(l.id)
    for (let y = 0; y < r.area.h; y++) out.data.set(r.data.data.subarray(y * r.area.w * 4, (y + 1) * r.area.w * 4), ((r.area.y + y) * Wd + r.area.x) * 4)
  }
  return out
}
const diffCount = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++; return n }
{
  const img = makeImage(400, 300)
  const cases = {
    '두 줄 붙음': [L('a', 50, 50, 200, 30), L('b', 50, 80, 200, 30)],
    '겹친 3개 + 떨어진 1개': [L('a', 40, 150, 120, 40), L('b', 130, 160, 120, 40, { method: 'solid' }), L('c', 220, 170, 100, 40), L('d', 300, 20, 60, 30)],
    '이미지 끝에 붙음': [L('a', 0, 0, 80, 30), L('b', 0, 28, 80, 30, { pad: 0 }), L('c', 380, 270, 20, 30)],
    '큰 영역 위 작은 영역': [L('a', 100, 100, 200, 120), L('b', 150, 140, 40, 20, { pad: 12 })],
  }
  for (const [name, ls] of Object.entries(cases)) {
    eq(`조각=전체 순차 (${name}) 다른 채널 수`, diffCount(viaPatches(img, ls), sequentialFull(img, ls)), 0)
  }
  // 예전 방식(각자 원본에서)은 붙은 두 줄에서 결과가 달라진다 = 이번에 고친 얼룩
  eq('예전 방식은 두 줄 붙음에서 다름', diffCount(viaPatches(img, cases['두 줄 붙음'], false), sequentialFull(img, cases['두 줄 붙음'])) > 0, true)
}

// ── 3. 최악 경우: 60개 전부 연결 (2600×2600) ──
{
  const img = makeImage(2600, 2600, 7)
  const ls = Array.from({ length: 60 }, (_, i) => L(`f${i}`, 100 + (i % 10) * 230, 200 + Math.floor(i / 10) * 70, 240, 76))
  eq('60개 한 그룹', connectedGroups(ls, 2600, 2600).length, 1)
  const t0 = performance.now()
  const out = viaPatches(img, ls)
  const t1 = performance.now()
  eq('60개 조각=전체 순차', diffCount(out, sequentialFull(img, ls)), 0)
  console.log(`      60개 연결 전부 계산(node, 잘라내기 제외): ${(t1 - t0).toFixed(0)}ms, 1개 평균 ${((t1 - t0) / 60).toFixed(1)}ms`)
  const t2 = performance.now()
  const p = fillPlan(ls, 2600, 2600)
  console.log(`      계산 계획 만들기: ${(performance.now() - t2).toFixed(1)}ms, 맨 뒤 레이어 chain ${p[59].chain.length}개`)
}

// ── 4. AI 분기 (1-6b-3b) ──
{
  // 800×800: k = 8, 여백 67 (aiGeometry 규칙). pad 4 < k → 8로 넓힘, pad 12 > k → 12
  const a = L('a', 100, 100, 200, 40, { method: 'ai' })
  eq('AI 메우는 범위 (pad<k → k)', fillArea(a, 800, 800), { x: 92, y: 92, w: 216, h: 56 })
  eq('AI 메우는 범위 (pad>k → pad)', fillArea({ ...a, pad: 12 }, 800, 800), { x: 88, y: 88, w: 224, h: 64 })
  eq('AI 잘라내는 범위 (+여백 67)', cropRect(a, 800, 800), { x: 25, y: 25, w: 350, h: 190 })
  eq('AI 이미지 끝에서 자름', cropRect(L('e', 0, 0, 50, 20, { method: 'ai' }), 800, 800), { x: 0, y: 0, w: 125, h: 95 })
  eq('AI 영향 범위 = 메우는 범위 + 2', influenceRect(a, 800, 800), { x: 90, y: 90, w: 220, h: 60 })
  // 1920×1920: k = 20, 여백 160 — 랩 egg_g0 네모와 같은 값 (test-studio-ai-geometry와 교차 확인)
  const egg = { id: 'f_egg000', type: 'fill', x: 20, y: 1752, w: 850, h: 140, method: 'ai', pad: 0 }
  const ea = fillArea(egg, 1920, 1920), ec = cropRect(egg, 1920, 1920)
  eq('AI 랩 egg_g0 메우는 범위', [ea.x, ea.y, ea.x + ea.w, ea.y + ea.h], [0, 1732, 890, 1912])
  eq('AI 랩 egg_g0 잘라내는 범위', [ec.x, ec.y, ec.x + ec.w, ec.y + ec.h], [0, 1572, 1050, 1920])
  // coons·solid는 그대로 (pad만, 잘라내기는 +4)
  eq('coons 범위 그대로', [fillArea(L('c', 100, 100, 200, 40), 800, 800), cropRect(L('c', 100, 100, 200, 40), 800, 800)],
    [{ x: 96, y: 96, w: 208, h: 48 }, { x: 92, y: 92, w: 216, h: 56 }])
  eq('solid 범위 그대로', fillArea(L('s', 100, 100, 200, 40, { method: 'solid' }), 800, 800), { x: 96, y: 96, w: 208, h: 48 })
  // AI 연결 판정은 넓어진 범위 기준: coons라면 안 붙는 간격(14px)도 AI면 붙는다 (8+2)*2=20 > 14
  eq('AI 연결 (간격 14px)', fillPlan([L('a', 100, 100, 200, 40, { method: 'ai' }), L('b', 100, 154, 200, 40, { method: 'ai' })], 800, 800)[1].deps, ['a'])
  eq('coons는 같은 간격에서 연결 안 됨', fillPlan([L('a', 100, 100, 200, 40), L('b', 100, 154, 200, 40)], 800, 800)[1].deps, [])
  // fillOnCrop은 AI를 계산하지 않는다 (엔진이 한다)
  const crop = cropRect(a, 800, 800)
  eq('fillOnCrop은 ai 거절', fillOnCrop({ data: new Uint8ClampedArray(crop.w * crop.h * 4), width: crop.w, height: crop.h }, crop, a, 800, 800), { ok: false, reason: 'unknown_method:ai' })
  // 방식이 바뀌면 key가 달라진다 (coons → ai 바꾸면 다시 계산)
  const kc = fillPlan([L('a', 100, 100, 200, 40)], 800, 800)[0].key
  const ka = fillPlan([a], 800, 800)[0].key
  eq('coons→ai 계산 key 다름', kc !== ka, true)
}
// ── 4-2. [지우기]로만 계산하는 AI — 안 지운 앞 AI가 있을 때 (effectiveKey·aiEraseSet) ──
{
  // 두 줄 붙은 제목: a(AI) → b(단색, a에 연결) → c(AI, b에 연결) / d(단색, 떨어짐)
  const ls = [
    L('a', 100, 100, 400, 40, { method: 'ai' }),
    L('b', 100, 150, 400, 40, { method: 'solid' }),
    L('c', 100, 200, 400, 40, { method: 'ai' }),
    L('d', 100, 900, 100, 40, { method: 'solid' }),
  ]
  const p = fillPlan(ls, 800, 1000)
  const byId = new Map(ls.map(l => [l.id, l]))
  const E = id => p.find(x => x.id === id)
  const none = () => false, all = () => true
  eq('연결 확인 (b←a, c←b, chain c=[a,b])', [E('b').deps, E('c').chain], [['a'], ['a', 'b']])
  eq('앞 AI 안 지움 → 단색 key에 표시', effectiveKey(E('b'), byId, none), `${E('b').key} ~ai-missing:a`)
  eq('앞 AI 지움 → 단색 key = 계산 key', effectiveKey(E('b'), byId, all), E('b').key)
  eq('앞 AI를 지우면 단색 key가 바뀜 (다시 계산)', effectiveKey(E('b'), byId, none) !== effectiveKey(E('b'), byId, all), true)
  eq('떨어진 단색은 영향 없음', effectiveKey(E('d'), byId, none), E('d').key)
  eq('AI 자신은 계산 key 그대로', [effectiveKey(E('a'), byId, none), effectiveKey(E('c'), byId, none)], [E('a').key, E('c').key])
  eq('c의 [지우기] → 안 지운 앞 AI a도 같이', aiEraseSet(E('c'), byId, none), ['a', 'c'])
  eq('a를 이미 지웠으면 c만', aiEraseSet(E('c'), byId, id => id === 'a'), ['c'])
  eq('a의 [지우기] → a만 (뒤는 건드리지 않음)', aiEraseSet(E('a'), byId, none), ['a'])
  // coons만 있는 사진은 key가 예전과 같다 (기존 캐시·동작 그대로)
  const cs = [L('x', 100, 100, 200, 40), L('y', 100, 150, 200, 40)]
  const cp = fillPlan(cs, 800, 800), cById = new Map(cs.map(l => [l.id, l]))
  eq('coons만: 화면 key = 계산 key', cp.map(e => effectiveKey(e, cById, none)), cp.map(e => e.key))
}

// ── 5. AI 결과 key = sha256(계산 key + '|' + 모델) 앞 16자 ──
{
  const planKey = 'f_abc123|100,100,200,40|ai|4'
  const model = 'lama_fp32@1faef530'
  const want = createHash('sha256').update(`${planKey}|${model}`).digest('hex').slice(0, 16)
  const got = await aiPatchKey(planKey, model)
  eq('aiPatchKey = node sha256 앞 16자', got, want)
  eq('aiPatchKey 형식', /^[0-9a-f]{16}$/.test(got), true)
  eq('모델이 바뀌면 key 다름', (await aiPatchKey(planKey, 'lama_fp32@00000000')) !== got, true)
  eq('앞 레이어가 바뀌면(계산 key) 다름', (await aiPatchKey('f_x|0,0,1,1|coons|4 > ' + planKey, model)) !== got, true)
  let threw = false
  try { await aiPatchKey(planKey, null) } catch { threw = true }
  eq('모델 없으면 오류', threw, true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
