// AI 지우기 실패 처리 · 개발 서버 캐시 분리 — node scripts/test-studio-ai-failure.mjs
// studioAiFailure(실패 종류·문구·결과 채우기) · studioHistory(discardCurrent·mapSteps) · 코드 연결(세션·캔버스·엔진·vite 설정)
import fs from 'node:fs'
import {
  AI_FAIL_TEXT, engineDown, aiFailKind, canRetryAi, aiLayerFailText, needsAiResult, fillAiInEdit,
} from '../src/lib/studioAiFailure.js'
import { createHistory, push, undo, redo, canRedo, discardCurrent, mapSteps, amendCurrent, LABELS } from '../src/lib/studioHistory.js'
import { fillPlan } from '../src/lib/studioFillPlan.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const W = 1000, H = 800
const F = (id, x, extra = {}) => ({ id, type: 'fill', x, y: 100, w: 80, h: 60, pad: 4, method: 'ai', ...extra })
const E = (...ls) => ({ v: 2, layers: ls })
const keyOf = (layers, id) => fillPlan(layers, W, H).find(p => p.id === id)?.key
const AI = { key: '0123456789abcdef', model: 'lama_fp32@1faef530', engine: 'webgpu', patch: { path: 'p.png', x: 0, y: 0, w: 1, h: 1 } }

// ── 1. 실패 종류·문구 ──
{
  eq('엔진 오류·못 씀 = 쓸 수 없음, 준비 중·준비됨은 아님',
    ['error', 'unsupported', 'downloading', 'ready', 'idle'].map(engineDown), [true, true, false, false, false])
  eq('종류: 못 씀 > 시간 초과 > 엔진 오류 > 계산 실패', [
    aiFailKind({ engineStatus: 'unsupported', code: 'timeout' }),
    aiFailKind({ engineStatus: 'error', code: 'timeout' }),
    aiFailKind({ engineStatus: 'error' }),
    aiFailKind({ engineStatus: 'ready' }),
    aiFailKind(),
  ], ['unsupported', 'timeout', 'engine', 'compute', 'compute'])
  eq('[다시 시도]는 브라우저가 못 쓸 때만 없음', ['engine', 'timeout', 'compute', 'unsupported'].map(canRetryAi), [true, true, true, false])
  eq('워커 로드 실패 문구 = 할 일이 보이게', AI_FAIL_TEXT.engine, 'AI를 불러오지 못했어요. [다시 시도]를 눌러 주세요.')
  const all = [...Object.values(AI_FAIL_TEXT), ...['engine', 'timeout', 'compute', 'unsupported'].flatMap(k => [aiLayerFailText(k, 1), aiLayerFailText(k, 3)])]
  eq('고객 문구에 개발 용어·원문·사정 설명 없음', all.filter(t => /워커|worker|알 수 없음|오류:|서버|관리자|준비하고|곧 /i.test(t)), [])
  eq('영역 여러 곳이면 개수', [aiLayerFailText('compute', 1).includes('곳이 있어요.'), aiLayerFailText('compute', 3).includes('(3곳)')], [true, true])
}

// ── 2. 자동 계산 대상 ──
{
  eq('결과 없는 AI 레이어만', [
    needsAiResult(F('a', 10)),
    needsAiResult(F('a', 10, { ai: AI })),
    needsAiResult(F('a', 10, { method: 'solid' })),
    needsAiResult({ id: 'c', type: 'cover', x: 1, y: 1, w: 5, h: 5, sx: 20, sy: 20, feather: 8 }),
    needsAiResult(null),
  ], [true, false, false, false, false])
}

// ── 3. 실패한 적용 되돌리기 (discardCurrent) ──
{
  let h = createHistory(E(), LABELS.init, 1)
  h = push(h, E(F('s', 400, { method: 'solid' })), LABELS.method, 2)
  const before = h
  h = push(h, E(F('s', 400, { method: 'solid' }), F('a', 10)), LABELS.aiErase, 3)
  const r = discardCurrent(h)
  eq('AI 지우기 칸을 없앰 → 앞 칸 값·위치', [r.edit.layers.map(l => l.id), r.history.index, r.history.steps.length], [['s'], 1, 2])
  eq('다시 하기로 되살아나지 않음', canRedo(r.history), false)
  eq('앞 칸은 원래 객체 그대로 (같은 단계)', r.history.steps[1] === before.steps[1], true)
  eq('현재가 맨 끝이 아니면(되돌린 상태) 안 함', discardCurrent(undo(h).history), null)
  eq('첫 단계만 있으면 안 함', discardCurrent(createHistory(E())), null)
  // 되돌림 뒤 새 동작은 평소처럼
  const h2 = push(r.history, E(F('s', 400, { method: 'solid' }), F('b', 600)), LABELS.aiErase, 4)
  eq('되돌린 뒤 다시 적용 → 새 칸', [h2.index, h2.steps.length, h2.steps[2].label], [2, 3, LABELS.aiErase])
}

// ── 4. 결과 채우기 (자동 계산·실패 뒤 다시 시도 — 이력 칸 없이 같은 모양인 단계마다) ──
{
  const a = F('a', 10)
  const planKey = keyOf([a], 'a')
  let h = createHistory(E(), LABELS.init, 1)
  h = push(h, E(a), LABELS.aiErase, 2)                                  // 결과 없이 저장된 AI
  h = push(h, E(a, F('s', 400, { method: 'solid' })), LABELS.method, 3) // 그 뒤 단색 (연결 안 됨 → a의 key 그대로)
  h = push(h, E({ ...a, x: 300 }, F('s', 400, { method: 'solid' })), LABELS.move, 4) // a를 옮김 → key 다름
  h = undo(h).history // 옮기기 전으로 (지금 = 단색 칸)
  const filled = mapSteps(h, e => fillAiInEdit(e, { layerId: 'a', planKey, ai: AI }, keyOf))
  eq('같은 모양 단계만 결과가 채워짐', filled.steps.map(s => s.edit.layers.find(l => l.id === 'a')?.ai?.key || null), [null, AI.key, AI.key, null])
  eq('단계 수·위치·라벨 그대로 (이력 칸 없음)', [filled.steps.length, filled.index, filled.steps.map(s => s.label)], [h.steps.length, h.index, h.steps.map(s => s.label)])
  eq('바뀌지 않은 단계는 같은 객체', [filled.steps[0] === h.steps[0], filled.steps[3] === h.steps[3]], [true, true])
  eq('채운 뒤 되돌려도 결과 있음 → 다시 계산 안 함', needsAiResult(undo(filled).edit.layers.find(l => l.id === 'a')), false)
  eq('다시 하기(옮긴 칸)는 결과 없음 그대로 — 예전 규칙', needsAiResult(redo(filled).edit.layers.find(l => l.id === 'a')), true)
  eq('채울 것이 없으면 같은 이력', mapSteps(filled, e => fillAiInEdit(e, { layerId: 'a', planKey, ai: AI }, keyOf)) === filled, true)
  eq('이미 결과가 있으면 덮지 않음', fillAiInEdit(E({ ...a, ai: { ...AI, key: 'ffffffffffffffff' } }), { layerId: 'a', planKey, ai: AI }, keyOf).layers[0].ai.key, 'ffffffffffffffff')
  eq('amendCurrent와 함께 써도 단계 수 그대로', amendCurrent(filled, E()).steps.length, 4)
}

// ── 5. 코드 연결 ──
{
  const session = read('src/composables/useEraseSession.js')
  const canvas = read('src/components/studio/StudioCanvas.vue')
  const screen = read('src/components/studio/StudioEraseScreen.vue')
  const engine = read('src/lib/studioAi/aiEngine.js')
  const vite = read('vite.config.js')
  const dev = read('scripts/dev-studio.mjs')
  const ef = session.slice(session.indexOf('function executeFill'), session.indexOf('function handleAiFailure'))
  eq('(a) 엔진 오류면 레이어·이력 전에 멈춤', ef.indexOf('engineDown(aiState.status)') > 0 && ef.indexOf('engineDown(aiState.status)') < ef.indexOf('setLayers('), true)
  eq('(b) 실패 = 방금 만든 칸이 현재일 때만 discardCurrent + 선택 복구',
    ['discardCurrent(h)', 'h.steps[h.index] === a.step', 'setDraftSilently(imageId, a.sel)'].every(s => session.includes(s)), true)
  eq('(c) [다시 시도] = 엔진 다시 준비 뒤 같은 영역으로', /function retryAiFailure[\s\S]*restartAiEngine\(\)[\s\S]*executeFill\(n\.target, 'ai'\)/.test(session), true)
  eq('(d) 결과 채우기는 이력 칸 없이 mapSteps', /had && !had\.ai[\s\S]*setLayers\(imageId, next, null\)[\s\S]*mapSteps/.test(session), true)
  eq('(d) 캔버스가 결과 없는 AI를 자동 요청 (보기 전용 제외)', /props\.interactive\) \{[\s\S]*needsAiResult\(l\)[\s\S]*aiRequested\.set\(k, auto\)/.test(canvas), true)
  eq('(e) 실패 = 요청을 비움 (채우는 중 멈춤 없음)', /function failAi[\s\S]*aiRequested\.delete\(planKey\)/.test(canvas), true)
  eq('엔진이 오류가 되면 기다리던 요청을 실패로', canvas.includes("else if (engineDown(s) && canvas) { failRequestsIfEngineDown()"), true)
  eq('실패 안내는 선택 영역 안내(top 12·높이 28) 아래', canvas.includes('top-[52px]') && !canvas.includes('absolute top-3 left-1/2'), true)
  eq('예전 원문 노출 문구 없음', canvas.includes('AI 지우기를 쓸 수 없어요: '), false)
  eq('화면이 새 이벤트를 세션에 연결', ['@ai-failed="handleAiFailure"', '@ai-restart="restartAiEngine"', '@ai-retry="retryAiFailure"', '@remove-failed="removeFills"', ':ai-failure="aiFailure"'].every(s => screen.includes(s)), true)
  eq('엔진: 계산 시간 한도 + messageerror + 원문 기록', ["code: 'timeout'", 'onmessageerror', "console.error('[studio-ai] 워커 오류 이벤트:'"].every(s => engine.includes(s)), true)
  eq('vite: 전용 캐시·onnx 미리 번들은 serve + dev:studio에서만',
    vite.includes("const studioDev = command === 'serve' && !!process.env.STUDIO_DEV_CACHE_DIR") && /studioDev \? \{\s*cacheDir: process\.env\.STUDIO_DEV_CACHE_DIR,\s*optimizeDeps: \{ include: \['onnxruntime-web\/webgpu'\] \},/.test(vite), true)
  eq('dev:studio가 전용 캐시 폴더를 넘김', dev.includes("const STUDIO_CACHE_DIR = 'node_modules/.vite-studio'") && dev.includes('STUDIO_DEV_CACHE_DIR: STUDIO_CACHE_DIR'), true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
