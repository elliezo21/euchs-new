/**
 * 사진 속 글자 찾기(OCR) 엔진 — 워커(ocrWorker.js)를 감싼 API (LaMa aiEngine.js와 같은 모양)
 *
 *   const eng = createOcrEngine({ prefer: 'webgpu' })
 *   await eng.prepare(p => …)        // 모델 받기/캐시 → 세션. 실패해도 throw 대신 status 'error'·'unsupported' + reason
 *   const r = await eng.detect(imageData)   // → { lines: [{ box, text, score, det }], tiles, ms }  box = 원본 좌표 네 꼭짓점
 *   eng.status  'idle' | 'downloading' | 'ready' | 'unsupported' | 'error'     eng.engine 'webgpu'|'wasm'|null     eng.reason
 *   eng.dispose()
 * 원클릭(studioAutoBuild)에서만 쓴다 — 편집기를 열 때는 받지 않는다(원클릭을 누를 때 받는다, 약 21MB — 두 번째부터 캐시).
 * 모델 주소·sha256 = ocrModels.js 한 곳 (Supabase Storage studio-models).
 */
import { supabaseUrl } from '@/lib/supabase'
import { ocrFileList, ocrModelBase } from './ocrModels.js'
export function createOcrEngine({ prefer = 'webgpu', onStatus = () => {}, files = null } = {}) {
  let worker = null
  let seq = 0
  const pending = new Map()
  const st = { status: 'idle', engine: null, reason: null, info: null }
  let ready = null

  function set(patch) {
    Object.assign(st, patch)
    onStatus({ ...st })
  }
  function fail(reason, status = 'error') {
    console.error('[studio-ocr] 엔진 오류:', reason)
    set({ status, reason })
  }

  function prepare(onProgress = () => {}) {
    if (ready) return ready
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      fail('이 브라우저는 Web Worker/WebAssembly를 지원하지 않습니다', 'unsupported')
      return Promise.resolve(null)
    }
    set({ status: 'downloading', reason: null })
    worker = new Worker(new URL('./ocrWorker.js', import.meta.url), { type: 'module' })
    ready = new Promise(resolve => {
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
          else p.resolve({ lines: m.lines, tiles: m.tiles, ms: m.ms })
        }
      }
      let list = files
      try {
        list = list || ocrFileList(ocrModelBase(supabaseUrl))
      } catch (e) {
        fail(e.message)
        resolve(null)
        return
      }
      worker.postMessage({ type: 'prepare', prefer, files: list })
    })
    return ready
  }

  /** @param {{ data: Uint8ClampedArray, width, height }} imageData RGBA (복사본을 넘긴다 — 호출자 데이터는 그대로) */
  function detect(imageData) {
    if (st.status !== 'ready') return Promise.reject(new Error(`글자 찾기 엔진 준비 안 됨 (status=${st.status}${st.reason ? ', ' + st.reason : ''})`))
    const id = ++seq
    const copy = new Uint8ClampedArray(imageData.data)
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      worker.postMessage({ type: 'ocr', id, image: { data: copy, width: imageData.width, height: imageData.height } }, [copy.buffer])
    })
  }

  function dispose() {
    worker?.terminate()
    worker = null
    ready = null
    for (const p of pending.values()) p.reject(new Error('엔진 종료됨'))
    pending.clear()
    set({ status: 'idle', engine: null, info: null, reason: null })
  }

  return {
    prepare, detect, dispose,
    get status() { return st.status },
    get engine() { return st.engine },
    get reason() { return st.reason },
    get info() { return st.info },
  }
}
