// 원클릭 AI 자동 제작 1단계 테스트 — node scripts/test-studio-autobuild.mjs
// 선별 규칙 · 글자 많음 판정 · 지우기 조각(합치기·나누기) · 진행기(실패 계속·상한·멈추기 부분 결과) · [원본으로]·[빼기]와 되돌리기 ·
// 배치 결과 page 모양(readPage 통과) · 글자 초안(사실만·과장 표현 뺌) · 복사본 판단·입력 불변 · 긴 사진 OCR 조각
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import {
  hanCount, isChineseLine, textStats, isTextHeavy, mergeRects, splitRect, planAutoLayers, splitLayer, autoFillId,
  readAuto, withAuto, hasAutoLayers, withoutAutoLayers, reviewMark, orderCandidates, isTooSmall, dHashFromGray, hashDistance,
  runAutoPipeline, AutoStop, summarize, summarizeTitle, buildDrafts, optionCells, autoTemplate, buildAutoPage, oneClickTarget,
  TEXT_HEAVY_RATIO, TEXT_HEAVY_HAN, PIECE_MAX, AUTO_PAD, AUTO_MAX_LAYERS, PROCESS_MAX, MIN_SIDE, AUTO_VERSION,
  AutoFatal, leftoverLines, problemList, TITLE_DROP, AUTO_GAP, draftSectionIds, withDraftMark, isDraftSection,
  nextEta, etaNote, ETA_CALCULATING, ETA_PREPARING,
} from '../src/lib/studioAutoBuild.js'
import { ocrModelBase, ocrFileList, OCR_FILES } from '../src/lib/studioAi/ocrModels.js'
import { summarizeNotes, AI_MISSING_NOTE } from '../src/lib/studioPreview.js'
import { tileRanges, placeTileLines, parseDict } from '../src/lib/studioAi/ocrPaddle.js'
import { aiK } from '../src/lib/studioAi/aiGeometry.js'
import { fillArea, fillPlan } from '../src/lib/studioFillPlan.js'
import { readPage, isValidImageItem, removeItems, itemIdsOfImage } from '../src/lib/studioPage.js'
import { STUDIO_TEMPLATES, templateByKey, templateProblems } from '../src/lib/studioTemplates.js'
import { createHistory, push, undo, current } from '../src/lib/studioHistory.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const line = (x0, y0, x1, y1, text = '收纳保鲜', score = 0.95) => ({ box: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], text, score })
const measure = (s, font) => [...s].length * font.fontSize * 0.5

// ── 1. 한자 판정 (랩 규칙) ──
eq('한자 수: 한자만 센다(영문·숫자·전각 구두점 제외)', hanCount('收纳ABC12，！'), 2)
eq('한자 1자 이상 = 지울 줄 / 영문만 = 남김', [isChineseLine({ text: 'MUJI' }), isChineseLine({ text: 'C通' })], [false, true])

// ── 2. 글자 양·글자 많음 ──
{
  const W = 800, H = 800
  const few = [line(100, 100, 300, 140), line(100, 600, 250, 640, 'ABC')]
  const st = textStats(few, W, H)
  eq('글자 양: 한자 줄 1·한자 4·면적 비율(영문 줄 제외)', [st.lines, st.han, st.ratio > 0.01 && st.ratio < 0.02], [1, 4, true])
  eq('글자 적음 → 글자 많음 아님', isTextHeavy(st), false)
  const big = [line(0, 0, 800, 200, '大字'), line(0, 200, 800, 400, '大字')] // 넓이 50%
  eq(`면적 ${TEXT_HEAVY_RATIO} 이상 → 글자 많음`, isTextHeavy(textStats(big, W, H)), true)
  const many = Array.from({ length: 10 }, (_, i) => line(10, i * 40, 60, i * 40 + 20, '一二三四五六七八九十')) // 한자 100자, 면적 작음
  const ms = textStats(many, W, H)
  eq(`한자 ${TEXT_HEAVY_HAN}자 이상 → 글자 많음 (면적 작아도)`, [ms.han, ms.ratio < TEXT_HEAVY_RATIO, isTextHeavy(ms)], [100, true, true])
  eq('겹친 줄은 넓이를 한 번만', textStats([line(0, 0, 400, 400), line(0, 0, 400, 400)], W, H).ratio, 0.25)
}

// ── 3. 지우기 조각 ──
{
  const W = 1200, H = 1600, k = aiK(W, H)
  const stacked = mergeRects([{ x: 100, y: 100, w: 600, h: 40 }, { x: 100, y: 150, w: 600, h: 40 }], k, W, H)
  eq('붙은 두 줄(문단) → 한 조각', stacked, [{ x: 100, y: 100, w: 600, h: 90 }])
  const lshape = mergeRects([{ x: 100, y: 100, w: 800, h: 40 }, { x: 100, y: 150, w: 40, h: 600 }], k, W, H)
  eq('ㄱ자로 닿은 줄 → 합치면 사진을 많이 지움 → 따로', lshape.length, 2)
  const far = mergeRects([{ x: 100, y: 100, w: 200, h: 40 }, { x: 100, y: 900, w: 200, h: 40 }], k, W, H)
  eq('멀리 떨어진 줄 → 따로', far.length, 2)
  const pieces = splitRect({ x: 0, y: 0, w: 3000, h: 100 }, k)
  eq('긴 조각 → 나눔 · 빈틈없이 덮음 · 메우는 범위 ≤ PIECE_MAX', [pieces.length, pieces.reduce((s, p) => s + p.w, 0), pieces.every(p => p.w + 2 * k <= PIECE_MAX)], [Math.ceil(3000 / (PIECE_MAX - 2 * k)), 3000, true])
  const plan = planAutoLayers([line(100, 100, 700, 140), line(100, 150, 700, 190), line(100, 900, 300, 940, 'SALE')], W, H)
  const l0 = plan.layers[0]
  eq('레이어: 한자 줄만 · 1개(문단 합침)', plan.layers.length, 1)
  eq('레이어 모양 = 편집기 AI 지우기와 같음 (type·method·pad·auto·id 규칙)', [l0.type, l0.method, l0.pad, l0.auto, /^f_[a-z0-9]{6}$/.test(l0.id), 'ai' in l0], ['fill', 'ai', 4, true, true, false])
  eq('메우는 범위 = 줄 네모 + 사방 k (랩 base 규칙)', fillArea(l0, W, H), { x: 100 - k, y: 100 - k, w: 600 + 2 * k, h: 90 + 2 * k })
  const edit = fs.readFileSync(new URL('../src/lib/studioEdit.js', import.meta.url), 'utf8')
  eq('AUTO_PAD = studioEdit.PAD_DEFAULT', Number(/export const PAD_DEFAULT = (\d+)/.exec(edit)[1]), AUTO_PAD)
  const tooMany = planAutoLayers(Array.from({ length: AUTO_MAX_LAYERS + 1 }, (_, i) => line(20 + (i % 7) * 150, 20 + Math.floor(i / 7) * 150, 60 + (i % 7) * 150, 30 + Math.floor(i / 7) * 150, '字')), 2000, 2000)
  eq(`조각이 ${AUTO_MAX_LAYERS}개 넘음 → 지우지 않음(글자 많음)`, [tooMany.tooMany, tooMany.layers.length], [true, 0])
  const halves = splitLayer({ ...l0, ai: { key: 'x' } })
  eq('저장 때 너무 큼 → 긴 쪽 반씩 · ai 뗌 · 새 id', [halves.length, halves[0].w + halves[1].w, halves[0].h, halves.some(h => 'ai' in h), halves[0].id !== l0.id], [2, 600, 90, false, true])
  eq('id 모양', /^f_[a-z0-9]{6}$/.test(autoFillId()), true)
}

// ── 4. 선별 규칙 ──
{
  const r = (id, kind, extra = {}) => ({ id, kind, ingest_status: 'done', included: true, width: 800, height: 800, ...extra })
  const rows = [r('d1', 'desc'), r('g1', 'gallery'), r('u1', 'upload'), r('g2', 'gallery'), r('d2', 'desc'), r('x', 'desc', { included: false }), r('p', 'desc', { ingest_status: 'pending' })]
  eq('순서: 대표(갤러리 첫 장) → 내 사진 → 상세 → 나머지 갤러리 · 안 쓸·준비 안 된 사진 뺌', orderCandidates(rows).map(x => x.id), ['g1', 'u1', 'd1', 'd2', 'g2'])
  eq(`너무 작음: 짧은 변 < ${MIN_SIDE}`, [isTooSmall({ width: 1000, height: 299 }), isTooSmall({ width: 300, height: 300 }), isTooSmall({ width: null, height: 10 })], [true, false, true])
  const g = Array.from({ length: 72 }, (_, i) => (i * 37) % 256)
  const g2 = g.map((v, i) => (i === 5 ? v + 1 : v))
  const h1 = dHashFromGray(g), h2 = dHashFromGray(g2), h3 = dHashFromGray(g.map(v => 255 - v))
  eq('dHash: 16자리 · 거의 같은 사진 거리 작음 · 반전 사진 거리 큼', [h1.length, hashDistance(h1, h2) <= 5, hashDistance(h1, h3) > 20], [16, true, true])
}

// ── 5. 진행기 (가짜 부품) ──
const hashOf = id => createHash('sha256').update(id).digest('hex').slice(0, 16)
const fakeRow = (id, kind = 'desc', extra = {}) => ({ id, project_id: 'p1', kind, ingest_status: 'done', included: true, width: 800, height: 800, ...extra })
function fakeDeps(rows, spec, extra = {}) {
  const commits = []
  let t = 0
  return {
    commits,
    deps: {
      rows,
      userLayersOf: row => spec[row.id]?.userLayers || [],
      loadPixels: async row => {
        if (spec[row.id]?.loadFail) throw new Error('사진을 불러오지 못했어요 (가짜)')
        return { imageData: { id: row.id }, hash: spec[row.id]?.hash || hashOf(row.id) }
      },
      ocr: async img => ({ lines: spec[img.id]?.lines || [] }),
      erase: async (row, layers, ctx) => {
        if (spec[row.id]?.eraseFail) throw new Error('AI 지우기 실패 (가짜)')
        if (spec[row.id]?.stopInErase || ctx.shouldStop()) throw new AutoStop()
        return layers.map(l => ({ ...l, ai: { key: '0123456789abcdef', model: 'm', engine: 'wasm', patch: { path: 'p', ...l } } }))
      },
      commit: (row, r) => commits.push({ id: row.id, ...r }),
      now: () => (t += 1000),
      ...extra,
    },
  }
}
{
  const rows = [fakeRow('g1', 'gallery'), fakeRow('d1'), fakeRow('d2'), fakeRow('d3'), fakeRow('d4'), fakeRow('s1', 'desc', { width: 200 }), fakeRow('dup'), fakeRow('k1'), fakeRow('k2')]
  const spec = {
    d1: { lines: [line(100, 100, 400, 140)] },
    d2: { lines: [line(0, 0, 800, 300, '大字'), line(0, 300, 800, 500, '大字')] },
    d3: { loadFail: true },
    d4: { lines: [line(100, 100, 400, 140)], eraseFail: true },
    dup: { hash: hashOf('d1') },
    k1: { userLayers: [{ id: 'f_user01', type: 'fill', x: 90, y: 90, w: 320, h: 60, pad: 4, method: 'solid' }], lines: [line(100, 100, 400, 140)] },
    k2: { userLayers: [{ id: 'f_user02', type: 'fill', x: 90, y: 90, w: 320, h: 60, pad: 4, method: 'solid' }], lines: [line(100, 100, 400, 140), line(100, 600, 400, 640)] },
  }
  const { deps, commits } = fakeDeps(rows, spec)
  const out = await runAutoPipeline(deps)
  const st = Object.fromEntries(out.results.map(r => [r.id, r.status]))
  eq('사진별 결과 (손댄 사진: 다 지웠으면 kept, 남았으면 textLeft)', st, { g1: 'clean', d1: 'erased', d2: 'textHeavy', d3: 'failed', d4: 'failed', s1: 'small', dup: 'dup', k1: 'kept', k2: 'textLeft' })
  eq('실패해도 계속 · 실패 사유를 남김', out.results.filter(r => r.status === 'failed').map(r => r.reason), ['사진을 불러오지 못했어요 (가짜)', 'AI 지우기 실패 (가짜)'])
  eq('페이지에 넣을 사진(placed) = 작음·겹침·글자 많음 뺌 (review-1), 실패·글자 남음은 넣고 표시', out.results.filter(r => r.placed).map(r => r.id), ['g1', 'd1', 'd3', 'd4', 'k1', 'k2'])
  eq('사진에 반영(commit): 처리한 사진 (손댄 사진은 표시만 — 레이어 안 건드림)', [commits.map(c => c.id), commits.filter(c => c.id[0] === 'k').map(c => [c.layers, c.auto.status, c.auto.px, c.auto.left ?? null])], [['g1', 'd1', 'd2', 'd3', 'd4', 'k1', 'k2'], [[null, 'clean', 1, null], [null, 'textLeft', 1, 1]]])
  const c1 = commits.find(c => c.id === 'd1')
  eq('지운 사진: ai가 붙은 auto 레이어 + 표시 erased', [c1.layers.length, c1.layers[0].auto, !!c1.layers[0].ai, c1.auto.status, c1.auto.v], [1, true, true, 'erased', AUTO_VERSION])
  eq('글자 많음·실패 사진은 레이어 없이 표시만', ['d2', 'd3'].map(id => [commits.find(c => c.id === id).layers, commits.find(c => c.id === id).auto.status]), [[null, 'textHeavy'], [null, 'failed']])
  eq('요약 수', summarize(out.results), { erased: 1, clean: 1, textHeavy: 1, failed: 2, kept: 1, textLeft: 1, small: 1, dup: 1, overLimit: 0, stopped: 0, placed: 6 })
  eq('글자 많음은 페이지 밖(placed false)', out.results.find(r => r.id === 'd2').placed, false)
}
{
  const rows = Array.from({ length: PROCESS_MAX + 3 }, (_, i) => fakeRow(`r${i}`, 'desc'))
  const spec = {}
  const { deps } = fakeDeps(rows, spec)
  const out = await runAutoPipeline(deps)
  eq(`처리 상한 ${PROCESS_MAX}장 · 나머지는 목록에만(overLimit)`, [out.results.filter(r => r.placed).length, out.results.filter(r => r.status === 'overLimit').length], [PROCESS_MAX, 3])
}
{
  // [멈추기] — 2장 끝난 뒤 멈춤: 끝낸 2장은 그대로, 나머지는 'stopped'(원본·페이지 밖)
  const rows = [fakeRow('a', 'gallery'), fakeRow('b'), fakeRow('c'), fakeRow('d')]
  const spec = { a: {}, b: { lines: [line(100, 100, 400, 140)] }, c: {}, d: {} }
  let stop = false
  const progress = []
  const { deps, commits } = fakeDeps(rows, spec, {
    shouldStop: () => stop,
    onProgress: p => { progress.push(p); if (p.stage === 'done' && p.done === 2) stop = true },
  })
  const out = await runAutoPipeline(deps)
  eq('멈추기: 끝낸 사진 결과는 남고 나머지는 stopped', out.results.map(r => [r.id, r.status, r.placed]), [['a', 'clean', true], ['b', 'erased', true], ['c', 'stopped', false], ['d', 'stopped', false]])
  eq('멈추기: stopped 표시 · 반영은 끝낸 2장만', [out.stopped, commits.map(c => c.id)], [true, ['a', 'b']])
  eq('진행: 남은 시간 = 평균 × 남은 장수', progress.find(p => p.stage === 'done' && p.done === 1).etaMs, progress.find(p => p.stage === 'done' && p.done === 1).avgMs * 3)
}
{
  // 남은 시간: AI 준비(LaMa 모델 받기)를 기다린 시간은 사진 처리 시간에서 뺀다
  const rows = [fakeRow('a', 'gallery'), fakeRow('b'), fakeRow('c'), fakeRow('d')]
  const spec = { a: { lines: [line(100, 100, 400, 140)] }, b: {}, c: {}, d: {} }
  const progress = []
  let t = 0
  const { deps } = fakeDeps(rows, spec, {
    now: () => t,
    loadPixels: async row => { t += 1000; return { imageData: { id: row.id }, hash: hashOf(row.id) } },
    erase: async (row, layers, ctx) => { t += 90000; ctx.addPrepMs(90000); return layers.map(l => ({ ...l, ai: { key: 'k', model: 'm', engine: 'wasm', patch: { path: 'p', ...l } } })) },
    onProgress: p => progress.push(p),
  })
  await runAutoPipeline(deps)
  const d1 = progress.find(p => p.stage === 'done' && p.done === 1)
  eq('남은 시간: 첫 사진의 AI 준비 90초는 평균에 안 들어감', [d1.avgMs, d1.samples], [1000, 1])
  const d2 = progress.find(p => p.stage === 'done' && p.done === 2)
  eq('남은 시간: 준비 시간 제외 평균 × 남은 장수', [d2.avgMs, d2.etaMs, d2.samples], [1000, 2000, 2])
}
{
  eq('표시: 처리 0·1장 → 숫자 대신 계산 중', [nextEta(null, { etaMs: null, samples: 0 }), nextEta(null, { etaMs: 600000, samples: 1 })],
    [{ min: null, text: ETA_CALCULATING }, { min: null, text: ETA_CALCULATING }])
  eq('표시: 2장부터 숫자 · 1분 미만 = "1분 안에 끝나요"', nextEta(null, { etaMs: 59000, samples: 2 }), { min: 0, text: '1분 안에 끝나요' })
  eq('표시: 반올림 (1분 29초 → 약 1분, 2분 30초 → 약 3분)', [nextEta(null, { etaMs: 89000, samples: 2 }).text, nextEta(null, { etaMs: 150000, samples: 3 }).text], ['약 1분 남았어요', '약 3분 남았어요'])
  const a = nextEta(null, { etaMs: 180000, samples: 2 })
  const b = nextEta(a.min, { etaMs: 420000, samples: 3 })
  const c = nextEta(b.min, { etaMs: 60000, samples: 4 })
  const d = nextEta(c.min, { etaMs: 30000, samples: 5 })
  const e = nextEta(d.min, { etaMs: 300000, samples: 6 })
  eq('표시: 한 번 보인 값보다 늘지 않음 (3 → 7이 와도 3 → 1 → 1분 안 → 늘지 않음)', [a.text, b.text, c.text, d.text, e.text], ['약 3분 남았어요', '약 3분 남았어요', '약 1분 남았어요', '1분 안에 끝나요', '1분 안에 끝나요'])
  eq('표시: 숫자를 보인 뒤 값이 비면 보인 값 그대로', nextEta(2, { etaMs: null, samples: 3 }).text, '약 2분 남았어요')
  eq('표시: AI 준비 중 → 지금 하는 일, 아니면 계산 결과', [etaNote({ preparing: true, text: '약 3분 남았어요' }), etaNote({ preparing: false, text: '약 3분 남았어요' }), etaNote({ preparing: false, text: '' })], [ETA_PREPARING, '약 3분 남았어요', ETA_CALCULATING])
}
{
  // 지우는 도중 멈춤 → 그 사진은 반영하지 않음(부분 레이어를 남기지 않음)
  const rows = [fakeRow('a', 'gallery'), fakeRow('b')]
  const { deps, commits } = fakeDeps(rows, { a: { lines: [line(1, 1, 200, 40)] }, b: { lines: [line(1, 1, 200, 40)], stopInErase: true } })
  const out = await runAutoPipeline(deps)
  eq('지우는 중 멈춤 → 그 사진 stopped · 반영 없음', [out.results.map(r => r.status), commits.map(c => c.id)], [['erased', 'stopped'], ['a']])
}

{
  // 모델을 받지 못함 등 AutoFatal → 사진 실패로 삼키지 않고 원클릭 전체를 멈춘다 (review-1)
  const rows = [fakeRow('a', 'gallery'), fakeRow('b')]
  const { deps, commits } = fakeDeps(rows, {}, { ocr: async () => { throw new AutoFatal('글자 찾기 모델을 받지 못해 멈췄어요') } })
  let err = null
  try { await runAutoPipeline(deps) } catch (e) { err = e }
  eq('AutoFatal → 진행기가 그대로 던짐 · 반영 없음', [err?.name, err?.message, commits.length], ['AutoFatal', '글자 찾기 모델을 받지 못해 멈췄어요', 0])
}

// ── 6. 표시·[원본으로]·[빼기]와 되돌리기 ──
{
  const auto = { v: AUTO_VERSION, status: 'failed', reason: '실패', lines: 0, han: 0, ratio: 0, at: 'x' }
  const edit = withAuto({ v: 2, layers: [], look: { a: 1 } }, auto)
  eq('표시 읽기·쓰기 (다른 칸 그대로)', [readAuto(edit).status, edit.look.a, readAuto(withAuto(edit, null)), readAuto({ auto: { v: 9, status: 'erased' } })], ['failed', 1, null, null])
  const autoL = { id: 'f_aaaaaa', type: 'fill', x: 1, y: 1, w: 5, h: 5, pad: 4, method: 'ai', auto: true }
  const userL = { id: 'f_bbbbbb', type: 'fill', x: 20, y: 1, w: 5, h: 5, pad: 4, method: 'solid' }
  eq('확인 필요(지우기 실패) → 직접 고치면(레이어 수가 바뀜) 풀림', [reviewMark(auto, []).problem, reviewMark(auto, []).problemText, reviewMark(auto, [userL]) === null], ['failed', '지우기 실패', true])
  eq('확인 필요(글자 많음)', reviewMark({ ...auto, status: 'textHeavy' }, []).problemText, '글자 많음')
  eq('확인 필요(글자 남음) → 레이어를 더하면 풀림', [reviewMark({ ...auto, status: 'textLeft', px: 1, left: 2 }, [userL]).problemText, reviewMark({ ...auto, status: 'textLeft', px: 1, left: 2 }, [userL]).reason, reviewMark({ ...auto, status: 'textLeft', px: 1 }, [userL, { ...userL, id: 'f_cccccc' }])], ['글자 남음', '지우지 않은 곳에 글자 2줄이 남아 있어요', null])
  eq('잘 지운 사진 → 표시 없음(problem null), [원본으로]만 가능', [reviewMark({ ...auto, status: 'erased' }, [autoL]).problem, reviewMark({ ...auto, status: 'erased' }, [autoL]).canRevert], [null, true])
  eq('글자 없음·손댄 사진 다 지움 → null', [reviewMark({ ...auto, status: 'clean' }, []), reviewMark({ ...auto, status: 'clean', px: 1 }, [userL])], [null, null])
  const W = 800, H = 800
  eq('글자 남음 계산: 지운 범위 안 줄은 남음 아님, 밖은 남음', leftoverLines([line(100, 100, 400, 140), line(100, 600, 400, 640, 'SALE'), line(100, 700, 400, 740)], [{ id: 'f_x', type: 'fill', x: 90, y: 90, w: 320, h: 60, pad: 4, method: 'solid' }], W, H).map(l => l.box[0][1]), [700])
  eq('안내 띠 목록: 대표 사진이 맨 앞', problemList([{ id: 'd', kind: 'desc', ingest_status: 'done' }, { id: 'g', kind: 'gallery', ingest_status: 'done' }, { id: 'x', kind: 'desc', ingest_status: 'done' }], id => (id === 'x' ? null : { problem: 'textLeft', problemText: '글자 남음', reason: '' })).map(p => p.id), ['g', 'd'])
  eq('표시 없음 → null', reviewMark(null, [autoL]), null)
  const layers = [autoL, userL]
  const reverted = withoutAutoLayers(layers)
  eq('[원본으로] = auto 레이어만 뺌 (고객 것 그대로)', reverted.map(l => l.id), ['f_bbbbbb'])
  eq('뺄 게 없으면 입력 그대로(=== 이력 안 쌓임)', withoutAutoLayers(reverted) === reverted, true)
  let h = createHistory({ v: 2, layers })
  h = push(h, { v: 2, layers: reverted }, '원본으로')
  const u = undo(h)
  eq('[원본으로] → Ctrl+Z → 자동 지운 레이어가 돌아옴', [current(h).label, u.edit.layers.map(l => l.id), hasAutoLayers(u.edit.layers)], ['원본으로', ['f_aaaaaa', 'f_bbbbbb'], true])
  // [빼기] — 페이지에서 빼기(removeItems) → 페이지 이력 → Ctrl+Z
  const photos = [{ id: 'i1', width: 800, height: 800 }, { id: 'i2', width: 800, height: 600 }]
  const page = buildAutoPage(photos, null, measure).page
  const next = removeItems(page, itemIdsOfImage(page, 'i2'))
  let ph = createHistory(page)
  ph = push(ph, next, '페이지에서 빼기')
  eq('[빼기] → 페이지에서 빠지고 목록(parked)에 남음 → Ctrl+Z로 돌아옴', [itemIdsOfImage(next, 'i2').length, next.parked.includes('i2'), itemIdsOfImage(undo(ph).edit, 'i2').length], [0, true, 1])
}

// ── 7. 글자 초안 (1688 사실만) ──
{
  eq('제목 요약: 괄호·연도·과장 표현 뺌 · 26자 안에서 띄어쓰기로 자름',
    summarizeTitle('【정품】2024년 신상 인기 대박 3단 슬라이드 계란 보관함 냉장고 정리함 주방 수납 박스 대용량'), '3단 슬라이드 계란 보관함 냉장고 정리함 주방')
  eq('중국어가 섞이면 쓰지 않음', summarizeTitle('계란 收纳 보관함'), null)
  eq('도매 단어 뺌: 후드티 예시 (review-1)', summarizeTitle('버전 재고 24ss 수출용 스트리트 브랜드 CH'), '24ss 스트리트 브랜드 CH')
  eq('도매 단어 뺌: 도매·공장·대리발송·크로스보더', summarizeTitle('도매 공장 머리띠 여성 대리발송 크로스보더 헤어밴드'), '머리띠 여성 헤어밴드')
  eq('다 빼면 너무 짧음 → 도매 단어는 남김 (상품명이 비지 않게)', summarizeTitle('재고 도매 CH'), '재고 도매 CH')
  eq('단어 속 글자는 안 건드림 (토막 단위)', summarizeTitle('버전업 무역풍 가방'), '버전업 무역풍 가방')
  eq('규칙 목록 한 곳: 번역·중국어 모두', [TITLE_DROP.trade.includes('수출용'), TITLE_DROP.trade.includes('现货'), TITLE_DROP.hype.includes('인기')], [true, true, true])
  const facts = {
    title: { zh: '三层滑动鸡蛋收纳盒', ko: '3단 슬라이드 계란 보관함 최고 인기' },
    attrs: [{ name: { zh: '材质', ko: '재질' }, value: { zh: 'PP', ko: 'PP' } }, { name: { zh: '品牌', ko: '브랜드' }, value: { zh: '无', ko: '없음' } }],
    options: [
      { name: { zh: '颜色', ko: '색상' }, values: [{ zh: '白色', ko: '화이트' }, { zh: '灰色', ko: '그레이' }] },
      { name: { zh: '尺码', ko: null }, values: [{ zh: 'S', ko: 'S' }] },
    ],
  }
  const d = buildDrafts(facts)
  eq('초안: 제목 요약 · 소재 줄 · 옵션 줄 (브랜드처럼 소재 아닌 속성은 안 씀)', [d.title, d.body], ['3단 슬라이드 계란 보관함', '재질: PP\n색상: 화이트 · 그레이'])
  eq('한국어 없는 옵션은 빼고 수를 셈', [d.options.map(o => o.name), d.missing], [['색상'], 1])
  eq('사실이 없으면 초안 없음(템플릿 문구 그대로)', buildDrafts(null), { title: null, body: null, options: [], missing: 0 })
  const cells = optionCells([{ name: '색상', values: Array.from({ length: 12 }, (_, i) => `컬러${i + 1}번`) }])
  eq('옵션표: 제목 줄 + 값이 길면 다음 줄로 · 칸 30자 안', [cells[0], cells[1][0], cells[2][0], cells.every(r => r.every(c => c.length <= 30))], [['옵션', '고를 수 있는 것'], '색상', '', true])
}

// ── 8. 배치 결과 page 모양 ──
{
  const photos = Array.from({ length: 7 }, (_, i) => ({ id: `img${i}`, width: 800, height: 600 + i * 100 }))
  const drafts = buildDrafts({
    title: { zh: 't', ko: '계란 보관함' },
    attrs: [{ name: { zh: '材质', ko: '소재' }, value: { zh: 'PP', ko: 'PP' } }],
    options: [{ name: { zh: '颜色', ko: '색상' }, values: [{ zh: '白', ko: '화이트' }] }],
  })
  const tplBefore = JSON.stringify(STUDIO_TEMPLATES)
  const photosBefore = JSON.stringify(photos)
  const r = buildAutoPage(photos, drafts, measure)
  const page = r.page
  const back = readPage(JSON.parse(JSON.stringify(page)), 'auto')
  eq('page가 readPage를 그대로 통과', [back.problems, JSON.stringify(back.page) === JSON.stringify(page)], [[], true])
  const imgs = page.sections.flatMap(s => s.items.filter(isValidImageItem).map(it => it.imageId))
  eq('사진 7장 모두 처리 순서대로', imgs, photos.map(p => p.id))
  const kinds = page.sections.map(s => (s.items.some(isValidImageItem) ? 'photo' : s.items.some(i => i.type === 'table') ? 'options' : 'text'))
  eq('구간 순서: 대표 → 소개 → 사진들 → 구매 전 안내(맨 아래) — 옵션이 있어도 표는 자동으로 안 넣음', kinds, ['photo', 'text', 'photo', 'photo', 'photo', 'photo', 'photo', 'photo', 'text'])
  const texts = page.sections[1].items.filter(i => i.type === 'text').map(i => i.text)
  eq('소개 구간: 제목 = 상품명 초안, 본문 = 사실 줄', texts, ['계란 보관함', '소재: PP\n색상: 화이트'])
  eq('원클릭 페이지에 표(옵션표·사이즈표) 0개', page.sections.flatMap(s => s.items).filter(i => i.type === 'table').length, 0)
  eq('템플릿 데이터·입력 사진 불변 (복제 없이 불러 씀)', [JSON.stringify(STUDIO_TEMPLATES) === tplBefore, JSON.stringify(photos) === photosBefore], [true, true])
  eq('원클릭 템플릿도 템플릿 검사 통과', templateProblems(autoTemplate(templateByKey('basic'), 7, drafts)), [])
  const none = buildAutoPage(photos.slice(0, 2), null, measure).page
  eq('초안 없음·사진 2장 → 템플릿 문구 그대로 · 빈 사진 자리 구간 뺌 · 옵션표 없음', [none.sections.length, none.sections[1].items.find(i => i.type === 'text').text, none.sections.some(s => s.items.some(i => i.type === 'table'))], [4, '상품 이름을 적어 주세요', false])
}

// ── 9. 복사본 판단 ──
eq('페이지 없음(시작 화면) → 이 작업에서', oneClickTarget({ isDefault: true, sectionCount: 5 }), 'here')
eq('구간 0개 페이지 → 이 작업에서', oneClickTarget({ isDefault: false, sectionCount: 0 }), 'here')
eq('페이지 있음 → 복사본에서 (원본은 덮지 않음)', oneClickTarget({ isDefault: false, sectionCount: 3 }), 'copy')

// ── 10. OCR 긴 사진 조각 ──
{
  eq('보통 사진은 한 번', tileRanges(800, 1600).axis, null)
  const { axis, tiles } = tileRanges(790, 6000)
  const covered = tiles.every((t, i) => i === 0 || tiles[i - 1].ownEnd === t.ownStart)
  eq('긴 사진 → 세로 조각 · 자기 몫이 빈틈·겹침 없이 전체 · 조각 길이 = 짧은 변 × 2', [axis, tiles[0].ownStart, tiles.at(-1).ownEnd, covered, tiles.every(t => t.end - t.start === 1580)], ['y', 0, 6000, true, true])
  const t0 = tiles[0], t1 = tiles[1]
  const inOverlap = t1.start + 20 // 두 조각 모두에 보이는 줄 (조각 좌표)
  const lineA = { box: [[10, inOverlap - t0.start], [300, inOverlap - t0.start], [300, inOverlap - t0.start + 30], [10, inOverlap - t0.start + 30]], text: '字', score: 1 }
  const lineB = { box: [[10, 20], [300, 20], [300, 50], [10, 50]], text: '字', score: 1 }
  const got = [...placeTileLines([lineA], axis, t0), ...placeTileLines([lineB], axis, t1)]
  eq('겹친 곳의 줄은 한 번만 · 전체 좌표로', [got.length, got[0].box[0][1]], [1, inOverlap])
  eq('사전: 앞 blank, 끝 공백', parseDict('一\r\n二\n'), ['blank', '一', '二', ' '])
}

// ── 11. 지우기 계획 key (편집기와 같은 계산) ──
{
  const W = 800, H = 800
  const { layers } = planAutoLayers([line(100, 100, 300, 140), line(100, 500, 300, 540)], W, H, (() => { let n = 0; return () => `f_aaaaa${n++}` })())
  const plan = fillPlan(layers, W, H)
  eq('계산 key = 편집기 ownKey 규칙 (auto 칸은 key에 안 들어감)', plan[0].key, 'f_aaaaa0|100,100,200,40|ai|4')
}

// ── 12. review-1: 여백 · 글자 초안 구간 · 모델 주소 · 알림 묶기 ──
{
  const photos = Array.from({ length: 3 }, (_, i) => ({ id: `img${i}`, width: 800, height: 700 }))
  const drafts = buildDrafts({ title: { zh: 't', ko: '머리띠' }, attrs: [], options: [{ name: { zh: '颜色', ko: '색상' }, values: [{ zh: '黑', ko: '블랙' }] }] })
  const page = buildAutoPage(photos, drafts, measure).page
  eq(`원클릭 페이지 구간 간격 = ${AUTO_GAP}px (기존 page.gap)`, page.gap, 30)
  eq('직접 만들기 템플릿 간격은 그대로 0', buildTemplateGap(), 0)
  const ids = draftSectionIds(page, drafts)
  const marked = withDraftMark(page, ids)
  eq('글자 초안 구간 = 소개 글 (1곳 — 옵션표는 자동으로 안 넣음)', ids.length, 1)
  eq('초안 표시(page.auto)도 readPage 그대로 통과', (() => { const r = readPage(JSON.parse(JSON.stringify(marked)), 'x'); return [r.problems, r.page.auto] })(), [[], { v: 1, drafts: ids }])
  eq('초안 구간 판단', [isDraftSection(marked, ids[0]), isDraftSection(marked, page.sections[0].id), isDraftSection(page, ids[0])], [true, false, false])
  eq('초안이 없어도 원클릭 페이지 표시는 남김 (검수 2묶음 — 안내 띠를 새로고침 뒤에도) · 안내 글 note', [withDraftMark(page, []).auto, withDraftMark(page, [], '적어 주세요').auto.note], [{ v: 1, drafts: [] }, '적어 주세요'])
  const base = ocrModelBase('https://abc.supabase.co/')
  eq('모델 주소 = Supabase Storage studio-models/ocr/ppocrv5-mobile/ (한 곳)', base, 'https://abc.supabase.co/storage/v1/object/public/studio-models/ocr/ppocrv5-mobile/')
  eq('모델 파일 3개 · 크기·sha 고정', ocrFileList(base).map(f => [f.key, f.url.endsWith(OCR_FILES.find(x => x.key === f.key).name), /^[0-9a-f]{64}$/.test(f.sha256), f.size > 0]), [['det', true, true, true], ['rec', true, true, true], ['dict', true, true, true]])
  eq('주소가 없으면 이유를 던짐(조용히 넘어가지 않음)', (() => { try { ocrModelBase(undefined); return 'no' } catch (e) { return /모델 주소/.test(e.message) } })(), true)
  const labels = { s1: '01 대표 사진', s2: '02 상세 이미지', s3: '03 상세 이미지', s4: '04 상세 이미지', s5: '05 상세 이미지' }
  const notes = ['s1', 's2', 's3', 's4', 's5'].map((s, i) => ({ sectionId: s, imageId: `i${i}`, note: AI_MISSING_NOTE }))
  eq('미리보기 알림: 같은 알림은 한 줄 (사진 수·구간 3개 + 외)', summarizeNotes(notes, labels), ['AI로 지우기 결과가 없는 사진 5장은 원본 그대로 들어갔어요 (01 대표 사진, 02 상세 이미지, 03 상세 이미지 외 2곳) — 지우기 화면에서 [다시 지우기]를 눌러 주세요'])
  eq('다른 알림 하나는 그대로', summarizeNotes([{ sectionId: 's2', imageId: 'x', note: '자르기를 쓰지 않았어요' }], labels), ['02 상세 이미지 · 자르기를 쓰지 않았어요'])
  eq('알림 없음 → 줄 없음', summarizeNotes([], labels), [])
}
function buildTemplateGap() { return templateByKey('basic').gap ?? 0 }

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
