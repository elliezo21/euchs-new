/**
 * AI 지우기(LaMa) 엔진 — 워커(aiWorker.js)를 감싼 API
 *
 *   const eng = createAiEngine({ prefer: 'webgpu' })   // 'wasm'이면 WebGPU를 시도하지 않음(시험용)
 *   await eng.prepare(p => …)                           // 모델 받기/캐시 → 세션. 실패해도 throw 대신 status 'error'
 *   const r = await eng.inpaint({ cropImageData, crop, fillAreasInCrop })
 *     → { area, data: { data, width, height } }   (studioFillPlan.fillOnCrop 반환과 같은 모양)
 *       area는 메우는 범위들을 감싸는 사각형. crop(원본 좌표 {x,y})을 주면 원본 좌표, 안 주면 조각 좌표.
 *       그 사각형 안에서도 메우는 범위 밖 픽셀은 원본 그대로다.
 *   eng.status  'idle' | 'downloading' | 'ready' | 'unsupported' | 'error'
 *   eng.engine  'webgpu' | 'wasm' | null     eng.reason  오류 사유     eng.info  준비 결과(시간·캐시·스레드 등)
 *   eng.dispose()  워커 종료(메모리 반환)
 *
 * 모델 주소·sha256은 VITE_STUDIO_AI_MODEL_URL(manifest.json), VITE_STUDIO_AI_MODEL_SHA256 (공개값, 시크릿 아님).
 */

const MODEL_URL = import.meta.env.VITE_STUDIO_AI_MODEL_URL
const MODEL_SHA256 = import.meta.env.VITE_STUDIO_AI_MODEL_SHA256

export function createAiEngine({ prefer = 'webgpu', onStatus = () => {} } = {}) {
  let worker = null
  let seq = 0
  const pending = new Map()
  const st = { status: 'idle', engine: null, reason: null, info: null }

  function set(patch) {
    Object.assign(st, patch)
    onStatus({ ...st })
  }
  function fail(reason, status = 'error') {
    console.error('[studio-ai] 엔진 오류:', reason)
    set({ status, reason })
  }

  function prepare(onProgress = () => {}) {
    if (st.status === 'ready') return Promise.resolve(st.info)
    if (!MODEL_URL || !MODEL_SHA256) {
      fail(`모델 설정 없음: ${!MODEL_URL ? 'VITE_STUDIO_AI_MODEL_URL ' : ''}${!MODEL_SHA256 ? 'VITE_STUDIO_AI_MODEL_SHA256' : ''}`.trim())
      return Promise.resolve(null)
    }
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      fail('이 브라우저는 Web Worker/WebAssembly를 지원하지 않습니다', 'unsupported')
      return Promise.resolve(null)
    }
    set({ status: 'downloading', reason: null })
    worker = new Worker(new URL('./aiWorker.js', import.meta.url), { type: 'module' })
    return new Promise(resolve => {
      worker.onerror = e => {
        fail(`워커 오류: ${e.message || '알 수 없음'}`)
        for (const p of pending.values()) p.reject(new Error(st.reason))
        pending.clear()
        resolve(null)
      }
      worker.onmessage = ({ data: m }) => {
        if (m.type === 'progress') onProgress(m)
        else if (m.type === 'ready') { set({ status: 'ready', engine: m.info.engine, info: m.info }); resolve(m.info) }
        else if (m.type === 'error' && m.id == null) { fail(m.reason, m.unsupported ? 'unsupported' : 'error'); resolve(null) }
        else if (m.type === 'result' || m.type === 'error') {
          const p = pending.get(m.id)
          if (!p) return
          pending.delete(m.id)
          if (m.type === 'error') p.reject(new Error(m.reason))
          else p.resolve(m)
        }
      }
      worker.postMessage({ type: 'prepare', manifestUrl: MODEL_URL, sha256: MODEL_SHA256, prefer })
    })
  }

  /**
   * @param {{ cropImageData: {data,width,height}, crop?: {x,y}, fillAreasInCrop: {x,y,w,h}[] }} args
   */
  async function inpaint({ cropImageData, crop, fillAreasInCrop }) {
    if (st.status !== 'ready') throw new Error(`엔진 준비 안 됨 (status=${st.status}${st.reason ? ', ' + st.reason : ''})`)
    const id = ++seq
    const copy = new Uint8ClampedArray(cropImageData.data) // 호출자 데이터는 그대로 두고 복사본을 넘긴다
    const m = await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      worker.postMessage({
        type: 'inpaint', id,
        crop: { data: copy, width: cropImageData.width, height: cropImageData.height },
        areas: fillAreasInCrop,
      }, [copy.buffer])
    })
    const ox = crop ? crop.x : 0, oy = crop ? crop.y : 0
    return {
      area: { x: m.area.x + ox, y: m.area.y + oy, w: m.area.w, h: m.area.h },
      data: { data: m.data, width: m.width, height: m.height },
      ms: m.ms,
    }
  }

  function dispose() {
    worker?.terminate()
    worker = null
    for (const p of pending.values()) p.reject(new Error('엔진 종료됨'))
    pending.clear()
    set({ status: 'idle', engine: null, info: null, reason: null })
  }

  return {
    prepare, inpaint, dispose,
    get status() { return st.status },
    get engine() { return st.engine },
    get reason() { return st.reason },
    get info() { return st.info },
  }
}
