/**
 * 원클릭 AI 자동 제작 — 편집기 안에서 도는 진행기 (원클릭 1단계). 순서·규칙은 studioAutoBuild.runAutoPipeline(순수, 테스트됨),
 * 여기는 브라우저 부품만 이어 준다: 원본 픽셀 읽기 · 글자 찾기 엔진(ocrEngine, 워커) · AI 지우기(편집기 LaMa 엔진 그대로) · 결과 조각 저장.
 *
 * ★ AI 지우기 계산은 지우기 화면(StudioCanvas runAi)과 같은 순서·같은 함수다 — 결과 레이어가 편집기에서 그대로 열리고,
 *   작은 사진·내보내기·완성 JPG가 같은 key로 저장된 조각을 쓴다:
 *   fillPlan(pixelLayersOf(레이어)) → cropRect 조각 + 연결된 앞 레이어 결과 덮어쓰기(pastePrior) → inpaint(메우는 범위 = fillArea)
 *   → PNG → uploadAiPatch(key = aiPatchKey(계산 key, AI_MODEL_ID)) → ai: { key, model, engine, patch }
 * ★ 저장 실패: 너무 큼(patch_too_large)이면 그 조각을 반으로 나눠 다시(studioAutoBuild.splitLayer, 두 번까지),
 *   그 밖의 실패는 2초 뒤 한 번 더 — 그래도 안 되면 그 사진은 원본으로 두고 사유를 남긴다(runAutoPipeline이 'failed').
 * ★ 돈이 드는 외부 호출 없음 (OCR·LaMa는 브라우저, 상품 사실은 저장된 정보 + 번역 캐시만).
 */
import { reactive } from 'vue'
import { createOcrEngine } from '@/lib/studioAi/ocrEngine'
import { AI_MODEL_ID, uploadAiPatch } from '@/lib/studioAiPatch'
import { fillPlan, fillArea, cropRect, pastePrior, aiPatchKey } from '@/lib/studioFillPlan'
import { pixelLayersOf } from '@/lib/studioEdit'
import { runAutoPipeline, dHashFromGray, splitLayer, summarize, AutoStop, SPLIT_DEPTH_MAX, PROCESS_MAX, AutoFatal, nextEta } from '@/lib/studioAutoBuild'

const AI_WAIT_MS = 5 * 60 * 1000 // LaMa 첫 준비(모델 약 200MB + 세션)가 느린 PC에서 걸리는 시간을 넉넉히
const RETRY_MS = 2000
const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * @param {{
 *   images: import('vue').Ref<object[]>, session: object,
 *   loadImage: (row) => Promise<HTMLImageElement>,  원본 (편집기 imageCache — 지우기 화면과 같은 서명 주소)
 *   startAi: () => void,                               편집기 LaMa 엔진 켜기 (이미 켜져 있으면 아무것도 안 함)
 *   loadFacts: () => Promise<object|null>,             1688 상품 사실 (실패는 null + 사유는 부르는 쪽 로그)
 * }} opts
 */
export function useAutoBuild({ images, session, loadImage, startAi, loadFacts }) {
  const state = reactive(emptyState())
  let ocr = null
  let runSeq = 0

  function emptyState() {
    return {
      open: false, phase: 'idle', // idle | prepare | photos | layout | done
      prepare: { loaded: 0, total: 0, status: '' }, waitingAi: false,
      current: null, stage: '', layer: null, done: 0, total: 0, etaMs: null, etaMin: null, etaText: '', startedAt: 0,
      counts: summarize([]), stopRequested: false, error: '',
    }
  }

  function stop() { if (state.open && state.phase !== 'done') state.stopRequested = true }

  /** 원본 픽셀 + dHash (9×8 회색). 원본 크기가 DB와 다르면 지우기 계산이 어긋나므로 쓰지 않는다 */
  async function loadPixels(row, hold) {
    const img = await loadImage(row)
    if (img.naturalWidth !== row.width || img.naturalHeight !== row.height) {
      throw new Error(`원본 크기가 기록과 달라요 (${img.naturalWidth}×${img.naturalHeight}, 기록 ${row.width}×${row.height})`)
    }
    const c = document.createElement('canvas')
    c.width = row.width
    c.height = row.height
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0)
    const imageData = g.getImageData(0, 0, row.width, row.height) // 오염 시 SecurityError → 이 사진 'failed'
    const s = document.createElement('canvas')
    s.width = 9
    s.height = 8
    const sg = s.getContext('2d', { willReadFrequently: true })
    sg.imageSmoothingQuality = 'high'
    sg.drawImage(img, 0, 0, 9, 8)
    const d = sg.getImageData(0, 0, 9, 8).data
    const gray = Array.from({ length: 72 }, (_, i) => Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]))
    hold.img = img
    return { imageData, hash: dHashFromGray(gray) }
  }

  async function waitAi(shouldStop) {
    startAi()
    const t0 = Date.now()
    for (;;) {
      const s = session.aiState.status
      const eng = session.aiEngine.value
      if (s === 'ready' && eng) { state.waitingAi = false; return eng }
      if (s === 'error' || s === 'unsupported') {
        state.waitingAi = false
        throw new AutoFatal(`AI 지우기를 준비하지 못해 멈췄어요 (${session.aiState.reason || s})`)
      }
      if (shouldStop()) { state.waitingAi = false; throw new AutoStop() }
      if (Date.now() - t0 > AI_WAIT_MS) { state.waitingAi = false; throw new AutoFatal('AI 지우기 준비가 5분 넘게 걸려 멈췄어요. 인터넷 연결을 확인하고 다시 눌러 주세요.') }
      state.waitingAi = true
      await sleep(300)
    }
  }

  async function saveWithRetry(args) {
    try {
      return await uploadAiPatch(args)
    } catch (e) {
      if (e.code === 'patch_too_large') throw e
      console.error('[AutoBuild] 결과 조각 저장 실패 — 2초 뒤 한 번 더:', args.imageId, args.layerId, e)
      await sleep(RETRY_MS)
      return uploadAiPatch(args)
    }
  }

  /** 지우기 계산·저장 (지우기 화면 runAi와 같은 순서) → ai가 붙은 레이어 */
  async function eraseLayers(row, planned, img, { shouldStop, addPrepMs }) {
    if (!AI_MODEL_ID) throw new Error('AI 모델 설정이 없어 지우지 못했어요')
    const w0 = Date.now()
    const engine = await waitAi(shouldStop)
    addPrepMs?.(Date.now() - w0) // AI 준비를 기다린 시간은 남은 시간 평균에 넣지 않는다
    const W = row.width, H = row.height
    const list = planned.map(l => ({ ...l }))
    const depth = new Map() // layer id → 나눈 횟수
    const results = new Map() // layer id → { area, data } (뒤 레이어 계산 때 덮어쓸 조각)
    for (let i = 0; i < list.length; i++) {
      if (shouldStop()) throw new AutoStop()
      const l = list[i]
      state.layer = { i: i + 1, n: list.length }
      const e = fillPlan(pixelLayersOf(list), W, H).find(p => p.id === l.id)
      const crop = cropRect(l, W, H)
      const area = fillArea(l, W, H)
      const c = document.createElement('canvas')
      c.width = crop.w
      c.height = crop.h
      const cctx = c.getContext('2d', { willReadFrequently: true })
      cctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
      const cropData = cctx.getImageData(0, 0, crop.w, crop.h)
      pastePrior(cropData, crop, e.deps.map(d => results.get(d)))
      const out = await engine.inpaint({
        cropImageData: cropData, crop,
        fillAreasInCrop: [{ x: area.x - crop.x, y: area.y - crop.y, w: area.w, h: area.h }],
      })
      if (out.area.x !== area.x || out.area.y !== area.y || out.area.w !== area.w || out.area.h !== area.h) {
        throw new Error(`AI 결과 범위가 달라요 (${JSON.stringify(out.area)} / 기대 ${JSON.stringify(area)})`)
      }
      const pc = document.createElement('canvas')
      pc.width = area.w
      pc.height = area.h
      pc.getContext('2d').putImageData(new ImageData(out.data.data, area.w, area.h), 0, 0)
      const key = await aiPatchKey(e.key, AI_MODEL_ID)
      let path
      try {
        path = await saveWithRetry({ projectId: row.project_id, imageId: row.id, layerId: l.id, key, canvas: pc })
      } catch (err) {
        const d = depth.get(l.id) || 0
        const halves = err.code === 'patch_too_large' && d < SPLIT_DEPTH_MAX ? splitLayer(l) : null
        if (!halves) throw err
        console.warn('[AutoBuild] 결과 조각이 너무 커서 반으로 나눠 다시 지움:', row.id, l.id, `${l.w}×${l.h}`)
        for (const h of halves) depth.set(h.id, d + 1)
        list.splice(i, 1, ...halves)
        i--
        continue
      }
      results.set(l.id, { area, data: out.data })
      list[i] = { ...l, ai: { key, model: AI_MODEL_ID, engine: engine.engine, patch: { path, x: area.x, y: area.y, w: area.w, h: area.h } } }
      await sleep(0) // 탭이 멈추지 않게 한 틱 쉼
    }
    return list
  }

  /**
   * 원클릭 실행 — 사진 처리까지. 페이지 만들기는 부르는 쪽(편집기 — 글꼴·자른 크기·페이지 세션)이 finish로 한다.
   * @param {(r: { results, stopped, facts, factsNote }) => Promise<void>} finish
   */
  async function run(finish) {
    if (state.open) return
    const seq = ++runSeq
    Object.assign(state, emptyState(), { open: true, phase: 'prepare', startedAt: Date.now() })
    const shouldStop = () => state.stopRequested || seq !== runSeq
    const factsP = loadFacts().then(f => f, e => { console.error('[AutoBuild] 상품 정보를 읽지 못해 글자 초안 없이 만듦:', e); return null })
    startAi() // LaMa는 사진을 살피는 동안 준비된다 (첫 지우기에서 기다림)
    if (!ocr) {
      ocr = createOcrEngine({ prefer: 'webgpu', onStatus: s => { state.prepare.status = s.status } })
    }
    const info = await ocr.prepare(p => { if (p.phase === 'download') { state.prepare.loaded = p.loaded; state.prepare.total = p.total } })
    if (info) console.info(`[AutoBuild] 글자 찾기 준비: ${info.engine}${info.cached ? ' (캐시)' : ''}, 모델 ${info.modelMs}ms, 세션 ${info.sessionMs}ms`)
    else {
      // 모델을 못 받음 — 진행 화면에 이유를 보이고 멈춘다 (사진·페이지는 그대로, review-1)
      console.error('[AutoBuild] 글자 찾기를 준비하지 못해 멈춤:', ocr.reason)
      state.error = `글자 찾기 모델을 받지 못해 멈췄어요. 인터넷 연결을 확인하고 다시 눌러 주세요. (${ocr.reason || ocr.status})` // phase는 멈춘 단계 그대로 (화면이 그 단계를 실패로 보인다)
      ocr.dispose()
      ocr = null
      return null
    }
    state.phase = 'photos'
    const hold = {}
    let out
    try {
      out = await runAutoPipeline({
        rows: images.value,
        userLayersOf: row => pixelLayersOf(session.layerMap[row.id] || []),
        loadPixels: row => loadPixels(row, hold),
        ocr: async imageData => {
          if (ocr.status !== 'ready') throw new AutoFatal(`글자 찾기를 준비하지 못해 멈췄어요 (${ocr.reason || ocr.status})`)
          return ocr.detect(imageData)
        },
        erase: (row, layers, ctx) => eraseLayers(row, layers, hold.img, ctx),
        commit: (row, r) => {
          if (r.auto?.status === 'failed') console.error('[AutoBuild] 사진 처리 실패 — 원본으로 두고 검수 필요:', row.id, r.auto.reason)
          session.applyAuto(row.id, r)
        },
        onProgress: p => {
          state.current = p.current
          state.stage = p.stage
          state.done = p.done
          state.total = p.total
          state.etaMs = p.etaMs
          const eta = nextEta(state.etaMin, p)
          state.etaMin = eta.min
          state.etaText = eta.text
          state.counts = summarize(p.results)
          if (p.stage !== 'erase') state.layer = null
        },
        shouldStop,
      })
    } catch (e) {
      // 진행기 자체의 오류(사진 한 장의 실패가 아님) — 숨기지 않고 화면에 남긴다
      console.error('[AutoBuild] 원클릭 진행 오류:', e)
      state.error = e?.name === 'AutoFatal' ? `${e.message} 여기까지 다듬은 사진은 [사진] 목록에 그대로 있어요.` : (e.message || String(e))
      return null
    } finally {
      hold.img = null
    }
    if (seq !== runSeq) return null
    state.counts = summarize(out.results)
    state.phase = 'layout'
    const facts = await factsP
    await finish({ ...out, facts })
    state.phase = 'done'
    ocr?.dispose() // 글자 찾기 엔진은 원클릭 때만 — 메모리 반환 (다음 원클릭은 캐시에서 다시 켬)
    ocr = null
    return out
  }

  function close() { Object.assign(state, emptyState()) }

  function dispose() {
    runSeq++
    ocr?.dispose()
    ocr = null
  }

  return { state, run, stop, close, dispose, PROCESS_MAX }
}
