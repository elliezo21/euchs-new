/**
 * AI 지우기(LaMa) Web Worker — onnxruntime-web 1.30.0 (WebGPU 빌드)
 *
 * 전처리·추론·합성은 실측 랩 run_a.html과 같은 순서:
 *   1) 조각(cw×ch)을 drawImage로 512×512까지 늘림(비율 무시, 기본 보간) → RGB 0~1, 채널 분리 [1,3,512,512]
 *   2) 조각 크기 마스크(메우는 범위 = 흰색)를 보간 없이 512×512로 늘림 → R>127이면 1 [1,1,512,512]
 *   3) session.run({ image, mask }) → output [1,3,512,512], 값은 0~255 (Uint8ClampedArray에 그대로 넣음)
 *   4) 512 결과를 drawImage로 조각 크기로 되돌리고, 조각 크기 마스크 R>127 픽셀의 RGB만 바꿈 (알파·바깥은 원본)
 *
 * 세션: prefer 'webgpu'면 ['webgpu']만으로 먼저 만들고, 실패하면 사유를 기록한 뒤 ['wasm']으로 만든다.
 *       (['webgpu','wasm']을 한 번에 주면 ORT가 console.warn만 남기고 조용히 WASM으로 넘어가 실제 장치를 알 수 없다)
 *
 * 메시지
 *   ← { type:'prepare', manifestUrl, sha256, prefer:'webgpu'|'wasm' }
 *   → { type:'progress', phase, loaded?, total? } … { type:'ready', info } | { type:'error', reason }
 *   ← { type:'inpaint', id, crop:{ data, width, height }, areas:[{x,y,w,h}] }   (areas는 조각 좌표)
 *   → { type:'result', id, area:{x,y,w,h}, data, width, height, ms:{ pre, infer, post } } | { type:'error', id, reason }
 */
import * as ort from 'onnxruntime-web/webgpu'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'
import { loadModel } from './modelCache.js'

const S = 512
const N = S * S
let session = null

ort.env.wasm.wasmPaths = { wasm: wasmUrl }
// SharedArrayBuffer는 crossOriginIsolated일 때만 쓸 수 있다. 아니면 1스레드 (euchs.co.kr은 COOP/COEP 없음 → 1스레드)
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 4) : 1

const post = (m, transfer) => self.postMessage(m, transfer || [])
const errText = e => `${e?.name && e.name !== 'Error' ? e.name + ': ' : ''}${e?.message || e}`

async function createSession(bytes, prefer) {
  let webgpuError = null
  if (prefer === 'webgpu') {
    if (!navigator.gpu) {
      webgpuError = 'navigator.gpu 없음(WebGPU 미지원 브라우저/워커)'
    } else {
      try {
        const s = await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu'] })
        return { session: s, engine: 'webgpu', webgpuError: null }
      } catch (e) {
        webgpuError = errText(e)
      }
    }
    console.error('[studio-ai] WebGPU 세션 실패 → WASM으로 만듭니다:', webgpuError)
  }
  const s = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] })
  return { session: s, engine: 'wasm', webgpuError }
}

async function prepare({ manifestUrl, sha256, prefer }) {
  if (typeof OffscreenCanvas === 'undefined') throw Object.assign(new Error('OffscreenCanvas 미지원'), { unsupported: true })
  if (!crypto?.subtle) throw Object.assign(new Error('crypto.subtle 미지원(보안 연결 필요)'), { unsupported: true })
  const model = await loadModel({ manifestUrl, sha256, onProgress: p => post({ type: 'progress', ...p }) })
  post({ type: 'progress', phase: 'session' })
  const t = performance.now()
  const r = await createSession(model.bytes, prefer)
  session = r.session
  return {
    engine: r.engine,
    webgpuError: r.webgpuError,
    modelSource: model.source,
    modelMs: Math.round(model.ms),
    modelBytes: model.bytes.length,
    cacheNote: model.cacheNote,
    sessionMs: Math.round(performance.now() - t),
    threads: ort.env.wasm.numThreads,
    crossOriginIsolated: !!self.crossOriginIsolated,
    inputNames: session.inputNames,
    outputNames: session.outputNames,
  }
}

function ctx2d(c) {
  return c.getContext('2d', { willReadFrequently: true })
}

async function inpaint({ crop, areas }) {
  if (!session) throw new Error('세션 없음 — prepare 먼저')
  const cw = crop.width, ch = crop.height
  if (!Array.isArray(areas) || areas.length === 0) throw new Error('메우는 범위 없음')
  const t0 = performance.now()

  // 조각 / 조각 크기 마스크
  const src = new OffscreenCanvas(cw, ch)
  ctx2d(src).putImageData(new ImageData(new Uint8ClampedArray(crop.data), cw, ch), 0, 0)
  const mc = new OffscreenCanvas(cw, ch), mg = ctx2d(mc)
  mg.fillStyle = '#000'
  mg.fillRect(0, 0, cw, ch)
  mg.fillStyle = '#fff'
  for (const a of areas) mg.fillRect(a.x, a.y, a.w, a.h)

  // 512 입력
  const cv = new OffscreenCanvas(S, S), g = ctx2d(cv)
  g.drawImage(src, 0, 0, cw, ch, 0, 0, S, S)
  const id = g.getImageData(0, 0, S, S).data
  g.clearRect(0, 0, S, S)
  g.imageSmoothingEnabled = false
  g.drawImage(mc, 0, 0, cw, ch, 0, 0, S, S)
  const md = g.getImageData(0, 0, S, S).data
  const img = new Float32Array(3 * N), mask = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    img[i] = id[i * 4] / 255; img[N + i] = id[i * 4 + 1] / 255; img[2 * N + i] = id[i * 4 + 2] / 255
    mask[i] = md[i * 4] > 127 ? 1 : 0
  }
  const t1 = performance.now()

  const out = await session.run({
    image: new ort.Tensor('float32', img, [1, 3, S, S]),
    mask: new ort.Tensor('float32', mask, [1, 1, S, S]),
  })
  const t2 = performance.now()
  if (!out.output) throw new Error(`모델 출력 'output' 없음 (출력: ${Object.keys(out).join(',')})`)
  const o = out.output.data
  const res = new ImageData(S, S)
  for (let i = 0; i < N; i++) {
    res.data[i * 4] = o[i]; res.data[i * 4 + 1] = o[N + i]; res.data[i * 4 + 2] = o[2 * N + i]; res.data[i * 4 + 3] = 255
  }
  out.output.dispose?.()

  // 조각 크기로 되돌려, 마스크 픽셀만 합성 → 메우는 범위들을 감싸는 사각형만 돌려준다
  const rc = new OffscreenCanvas(S, S); rc.getContext('2d').putImageData(res, 0, 0)
  const back = new OffscreenCanvas(cw, ch), bg = ctx2d(back)
  bg.drawImage(rc, 0, 0, S, S, 0, 0, cw, ch)
  const bd = bg.getImageData(0, 0, cw, ch).data
  const mm = mg.getImageData(0, 0, cw, ch).data
  const x0 = Math.min(...areas.map(a => a.x)), y0 = Math.min(...areas.map(a => a.y))
  const x1 = Math.max(...areas.map(a => a.x + a.w)), y1 = Math.max(...areas.map(a => a.y + a.h))
  const aw = x1 - x0, ah = y1 - y0
  const data = new Uint8ClampedArray(aw * ah * 4)
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const si = ((y0 + y) * cw + (x0 + x)) * 4, di = (y * aw + x) * 4
      const from = mm[si] > 127 ? bd : crop.data
      data[di] = from[si]; data[di + 1] = from[si + 1]; data[di + 2] = from[si + 2]; data[di + 3] = crop.data[si + 3]
    }
  }
  const t3 = performance.now()
  return { area: { x: x0, y: y0, w: aw, h: ah }, data, width: aw, height: ah, ms: { pre: t1 - t0, infer: t2 - t1, post: t3 - t2 } }
}

self.onmessage = async ({ data: m }) => {
  if (m.type === 'prepare') {
    try {
      post({ type: 'ready', info: await prepare(m) })
    } catch (e) {
      console.error('[studio-ai] 준비 실패:', e)
      post({ type: 'error', reason: errText(e), unsupported: !!e?.unsupported })
    }
  } else if (m.type === 'inpaint') {
    try {
      const r = await inpaint(m)
      post({ type: 'result', id: m.id, ...r }, [r.data.buffer])
    } catch (e) {
      console.error('[studio-ai] 지우기 실패:', e)
      post({ type: 'error', id: m.id, reason: errText(e) })
    }
  }
}
