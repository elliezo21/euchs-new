// 배경 경계 다듬기(17-3) 테스트 — node scripts/test-studio-bg-refine.mjs
// 1) 붓 계산(살리기·지우기·부드러운 가장자리·칠하는 중 = 다시 쌓기)  2) 되돌리기 목록 다시 쌓기·[AI 결과로 되돌리기]  3) 내용 key
// 4) edit.bg.refined 읽기·쓰기 — 저장 모양 · 예전 데이터 호환 · 마스크 고르기(다듬은 것 우선, 한 곳) · 표시  5) 복사본 경로
import {
  REFINE_SOFTNESS, brushAlpha, stampSegment, applyCoverage, paintStroke, replayOps, sameMask, maskFromRgba, maskToRgba, refineKey,
  targetOf, segmentOf, segmentCount, clearRect, unionRect, isValidRefineStroke,
} from '../src/lib/studioBgRefine.js'
import { readBg, withBg, withRefined, bgMaskSource, bgViewKey, bgMark, bgActive, applyMaskToRgba } from '../src/lib/studioBg.js'
import { rewriteEdit, newBgPath, buildCopyPlan } from '../api/_studioCopy.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(56)} ${JSON.stringify(got)?.slice(0, 160)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const quiet = fn => { const e = console.error, w = console.warn; console.error = console.warn = () => {}; try { return fn() } finally { console.error = e; console.warn = w } }

// ── 1. 붓 ──
eq('부드럽기 고정값 0.3', REFINE_SOFTNESS, 0.3)
eq('목표: 살리기 255 · 지우기 0', [targetOf('keep'), targetOf('erase')], [255, 0])
{
  const r = 10 // soft = 3 → 안쪽 7까지 1
  eq('가장자리: 안쪽 1 · 반지름 밖 0', [brushAlpha(0, r), brushAlpha(7, r), brushAlpha(10, r), brushAlpha(12, r)], [1, 1, 0, 0])
  const mid = brushAlpha(8.5, r)
  eq('가장자리 가운데는 0과 1 사이 (부드럽게)', mid > 0.3 && mid < 0.7, true)
  eq('작은 붓도 가장자리 최소 1px (반지름 1 → 가운데 1 · 끝 0)', [brushAlpha(0, 1), brushAlpha(1, 1)], [1, 0])
}
{
  const W = 40, H = 20
  const mask = new Uint8Array(W * H) // 모두 지워진 상태(0)
  const rect = paintStroke(mask, W, H, { mode: 'keep', size: 8, pts: [10, 10] })
  eq('살리기 점 하나 → 가운데 255', mask[10 * W + 10], 255)
  eq('살리기 → 먼 곳은 그대로 0', [mask[0], mask[10 * W + 30]], [0, 0])
  eq('바뀐 범위 = 붓 둘레 네모', rect, { x: 6, y: 6, w: 8, h: 8 })
  const edge = mask[10 * W + 13] // 가운데서 3.5px — 가장자리 안(부드러움 구간)
  eq('가장자리 값은 0~255 사이', edge > 0 && edge < 255, true)
  paintStroke(mask, W, H, { mode: 'erase', size: 8, pts: [10, 10] })
  eq('같은 자리 지우기 → 가운데 0', mask[10 * W + 10], 0)
  const all = new Uint8Array(W * H).fill(255)
  paintStroke(all, W, H, { mode: 'erase', size: 6, pts: [2, 10, 38, 10] })
  eq('지우기 선 → 선 위 0 · 선 밖 255', [all[10 * W + 20], all[10 * W + 2], all[0], all[19 * W + 20]], [0, 0, 255, 255])
  eq('사진 밖 획 → 아무것도 안 바뀜', paintStroke(new Uint8Array(W * H), W, H, { mode: 'keep', size: 4, pts: [-50, -50] }), null)
  eq('모양이 틀린 획은 칠하지 않음', quiet(() => paintStroke(new Uint8Array(W * H), W, H, { mode: 'paint', size: 4, pts: [1, 1] })), null)
  eq('획 검사', [isValidRefineStroke({ mode: 'keep', size: 3, pts: [1, 2] }), isValidRefineStroke({ mode: 'keep', size: 3, pts: [1] }), isValidRefineStroke({ mode: 'erase', size: 0, pts: [1, 2] })], [true, false, false])
}
{
  // 한 획 안에서 같은 자리를 여러 번 지나가도 두 번 칠해지지 않는다 (가장 큰 값만)
  const W = 30, H = 10
  const a = new Uint8Array(W * H).fill(100)
  paintStroke(a, W, H, { mode: 'keep', size: 10, pts: [15, 5, 16, 5] })
  const b = new Uint8Array(W * H).fill(100)
  paintStroke(b, W, H, { mode: 'keep', size: 10, pts: [15, 5, 16, 5, 15, 5, 16, 5, 15, 5] })
  eq('같은 자리 왕복 = 한 번 지나간 것과 바이트까지 같음', sameMask(a, b), true)
  eq('가장자리 값은 목표에 덜 간 값 (한 번만 섞임)', a[5 * W + 20] > 100 && a[5 * W + 20] < 255, true)
}
{
  // 칠하는 중(점마다 조금씩, 획 시작 값 base 고정) = 끝난 뒤 다시 쌓기(paintStroke) — 바이트까지 같아야 화면·되돌리기가 어긋나지 않는다
  const W = 64, H = 48
  const start = new Uint8Array(W * H)
  for (let i = 0; i < start.length; i++) start[i] = (i * 37) % 256
  const stroke = { mode: 'erase', size: 11, pts: [3.5, 4.25, 20, 12, 21.5, 30, 50.75, 40, 60, 2] }
  const live = start.slice()
  const base = start.slice()
  const cov = new Uint8Array(W * H)
  let rect = null
  const firstDot = stampSegment(cov, W, H, stroke.pts[0], stroke.pts[1], stroke.pts[0], stroke.pts[1], stroke.size / 2)
  applyCoverage(live, base, cov, W, targetOf(stroke.mode), firstDot)
  rect = unionRect(rect, firstDot)
  for (let i = 0; i < segmentCount(stroke.pts); i++) {
    const [x0, y0, x1, y1] = segmentOf(stroke.pts, i)
    const r = stampSegment(cov, W, H, x0, y0, x1, y1, stroke.size / 2)
    applyCoverage(live, base, cov, W, targetOf(stroke.mode), r)
    rect = unionRect(rect, r)
  }
  clearRect(cov, W, rect)
  const replay = start.slice()
  paintStroke(replay, W, H, stroke)
  eq('칠하는 중 결과 = 다시 쌓은 결과 (바이트까지)', sameMask(live, replay), true)
  eq('작업 칸은 다 쓰고 0으로 돌아감', cov.every(v => v === 0), true)
}

// ── 2. 되돌리기 목록 ──
{
  const W = 20, H = 20
  const ai = new Uint8Array(W * H); for (let y = 5; y < 15; y++) ai.fill(255, y * W + 5, y * W + 15)
  const aiCopy = ai.slice()
  const s1 = { type: 'stroke', stroke: { mode: 'keep', size: 4, pts: [2, 2] } }
  const s2 = { type: 'stroke', stroke: { mode: 'erase', size: 4, pts: [10, 10] } }
  const m1 = replayOps(ai, ai, [s1], W, H)
  const m12 = replayOps(ai, ai, [s1, s2], W, H)
  eq('다시 쌓기: 획 1개 → 살린 곳 255', m1[2 * W + 2], 255)
  eq('다시 쌓기: 획 2개 → 지운 곳 0', m12[10 * W + 10], 0)
  eq('되돌리기(마지막 빼기) = 획 1개 결과', sameMask(replayOps(ai, ai, [s1, s2].slice(0, 1), W, H), m1), true)
  const withAi = replayOps(ai, ai, [s1, s2, { type: 'ai' }], W, H)
  eq('[AI 결과로 되돌리기] → AI 마스크와 바이트까지 같음', sameMask(withAi, ai), true)
  const afterAi = replayOps(ai, ai, [s1, { type: 'ai' }, s2], W, H)
  eq('AI로 되돌린 뒤 붓질 = AI에서 그 붓질만', sameMask(afterAi, replayOps(ai, ai, [s2], W, H)), true)
  const refinedStart = m1
  eq('다듬은 것에서 시작 + [AI 결과로] → AI 마스크', sameMask(replayOps(refinedStart, ai, [{ type: 'ai' }], W, H), ai), true)
  eq('AI 마스크 배열은 절대 안 바뀜', sameMask(ai, aiCopy), true)
  eq('빈 목록 = 시작 마스크', sameMask(replayOps(m12, ai, [], W, H), m12), true)
}
{
  const m = new Uint8Array([0, 7, 128, 255])
  const rgba = maskToRgba(m)
  eq('마스크 → RGBA (R=G=B, A=255)', Array.from(rgba), [0, 0, 0, 255, 7, 7, 7, 255, 128, 128, 128, 255, 255, 255, 255, 255])
  eq('RGBA → 마스크 (첫 채널) 왕복', Array.from(maskFromRgba(rgba)), [0, 7, 128, 255])
  // 다듬은 마스크 PNG(R=G=B)도 applyMaskToRgba가 첫 바이트를 쓰므로 AI 회색 마스크와 똑같이 합성된다
  const px = new Uint8ClampedArray([10, 20, 30, 255, 10, 20, 30, 255, 10, 20, 30, 255, 10, 20, 30, 255])
  applyMaskToRgba(px, rgba, 4)
  eq('합성: 알파만 바뀌고 색 그대로', Array.from(px), [10, 20, 30, 0, 10, 20, 30, 7, 10, 20, 30, 128, 10, 20, 30, 255])
}

// ── 3. 내용 key ──
{
  const a = new Uint8Array(100).fill(3)
  const k1 = await refineKey(a, 10, 10)
  eq('key = 16자 hex', /^[0-9a-f]{16}$/.test(k1), true)
  eq('같은 내용 = 같은 key', await refineKey(a.slice(), 10, 10), k1)
  const b = a.slice(); b[50] = 4
  eq('한 픽셀만 달라도 다른 key', (await refineKey(b, 10, 10)) !== k1, true)
  eq('가로·세로가 다르면 다른 key', (await refineKey(a, 20, 5)) !== k1, true)
}

// ── 4. edit.bg.refined ──
const U = 'uid-1', P = 'proj-1', I = 'img-1'
const MASK = { path: `${U}/${P}/bg/${I}/mask_0123456789abcdef.png`, key: '0123456789abcdef', model: 'birefnet-v2', w: 800, h: 600 }
const REF = { path: `${U}/${P}/bg/${I}/refined_fedcba9876543210.png`, key: 'fedcba9876543210', w: 800, h: 600 }
{
  // 예전 데이터 (17-1·17-2) — refined 없음
  const old = readBg({ bg: { mask: MASK, mode: 'transparent' } })
  eq('예전 데이터: refined 칸 없음', 'refined' in old, false)
  eq('예전 데이터: 마스크 = AI 마스크', bgMaskSource(old), { path: MASK.path, w: 800, h: 600, refined: false })
  eq('예전 데이터: 화면 key = AI 마스크 경로 (17-1과 같음)', bgViewKey(old), `|bg:${MASK.path}`)
  eq('예전 데이터: 표시 그대로', [bgMark(old), bgMark(readBg({ bg: { mask: MASK, mode: 'color', color: '#ffffff' } }))], ['배경 지움', '배경 단색'])
  eq('예전 데이터 저장 모양 그대로 (withBg)', withBg({ v: 2 }, old), { v: 2, bg: { mask: { ...MASK }, mode: 'transparent' } })
}
{
  const b = readBg({ bg: { mask: MASK, mode: 'transparent', refined: REF } })
  eq('다듬은 마스크 읽기', b.refined, REF)
  eq('마스크 고르기: 다듬은 것 우선', bgMaskSource(b), { path: REF.path, w: 800, h: 600, refined: true })
  eq('화면 key = 다듬은 마스크 경로 (다듬으면 다시 만든다)', bgViewKey(b), `|bg:${REF.path}`)
  eq('표시: 배경 지움 · 다듬음', bgMark(b), '배경 지움 · 다듬음')
  eq('단색 + 다듬음', bgMark(readBg({ bg: { mask: MASK, mode: 'color', color: '#f9e4e8', refined: REF } })), '배경 단색 · 다듬음')
  const none = readBg({ bg: { mask: MASK, mode: 'none', refined: REF } })
  eq('원래 배경: 다듬은 결과 안 씀 (합성 없음·표시 없음·key 없음)', [bgActive(none), bgMark(none), bgViewKey(none)], [false, '', ''])
  eq('확정 저장 모양 (withBg)', withBg({ v: 2, layers: [] }, b),
    { v: 2, layers: [], bg: { mask: { ...MASK }, mode: 'transparent', refined: { ...REF } } })
  eq('단색 저장 모양 (color + refined)', withBg({}, readBg({ bg: { mask: MASK, mode: 'color', color: '#F9E4E8', refined: REF } })).bg,
    { mask: { ...MASK }, mode: 'color', color: '#f9e4e8', refined: { ...REF } })
  eq('withRefined(null) → 다듬기 없앰, AI 마스크 그대로', withRefined(b, null), { mask: { path: MASK.path, key: MASK.key, model: MASK.model, w: 800, h: 600 }, mode: 'transparent' })
  eq('withRefined(새 값) → 바꿈, 나머지 그대로', withRefined(readBg({ bg: { mask: MASK, mode: 'color', color: '#111111' } }), { ...REF, extra: 1 }),
    { mask: { path: MASK.path, key: MASK.key, model: MASK.model, w: 800, h: 600 }, mode: 'color', color: '#111111', refined: REF })
  eq('다듬어도 AI 마스크 칸은 그대로', b.mask.path, MASK.path)
}
{
  const bad = (name, refined) => {
    const b = quiet(() => readBg({ bg: { mask: MASK, mode: 'transparent', refined } }))
    eq(`이상한 refined(${name}) → 빼고 AI 마스크`, [!!b, 'refined' in b, bgMaskSource(b).refined], [true, false, false])
  }
  bad('경로 규칙 다름', { ...REF, path: `${U}/${P}/bg/${I}/mask_fedcba9876543210.png` })
  bad('다른 사진 폴더', { ...REF, path: `${U}/${P}/bg/img-2/refined_fedcba9876543210.png` })
  bad('크기 다름', { ...REF, w: 400 })
  bad('key 형식', { ...REF, key: 'xyz' })
  bad('문자열', 'refined_fedcba9876543210.png')
  eq('refined: null 은 조용히 없음', 'refined' in readBg({ bg: { mask: MASK, mode: 'transparent', refined: null } }), false)
}

// ── 5. 복사본 ──
{
  const ids = { uid: U, fromProject: P, toProject: 'proj-2', fromImage: I, toImage: 'img-9' }
  eq('복사 경로: refined 이름 그대로 새 폴더', newBgPath(REF.path, ids), `${U}/proj-2/bg/img-9/refined_fedcba9876543210.png`)
  let threw = false
  try { newBgPath(`${U}/${P}/bg/${I}/other_fedcba9876543210.png`, ids) } catch (e) { threw = e.code === 'copy_bad_path' }
  eq('복사 경로: 규칙 밖 이름은 거부', threw, true)
  const { edit, files } = rewriteEdit({ v: 2, bg: { mask: MASK, mode: 'transparent', refined: REF } }, ids)
  eq('복사: AI 마스크·다듬은 마스크 둘 다 복사', files.map(f => [f.kind, f.to]), [
    ['bg', `${U}/proj-2/bg/img-9/mask_0123456789abcdef.png`],
    ['bg', `${U}/proj-2/bg/img-9/refined_fedcba9876543210.png`],
  ])
  eq('복사: edit 안 두 경로 모두 새 경로', [edit.bg.mask.path, edit.bg.refined.path], [files[0].to, files[1].to])
  eq('복사본 edit도 그대로 읽힘 (다듬은 것 우선)', bgMaskSource(readBg(edit)).path, files[1].to)
  const plan = buildCopyPlan({
    uid: U, project: { id: P, source_type: 'upload', desc_source: 'none', status: 'ready', expires_at: 'x', page: null },
    images: [{ id: I, original_path: `${U}/${P}/orig/${I}.jpg`, edit: { v: 2, bg: { mask: MASK, mode: 'color', color: '#ffffff', refined: REF } } }],
    newProjectId: 'proj-2', newImageId: () => 'img-9', hiddenAt: 'now',
  })
  eq('복사 계획: 원본 + 마스크 2개 (없어도 되는 파일)', plan.files.map(f => [f.kind, f.required]), [['orig', true], ['bg', false], ['bg', false]])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
