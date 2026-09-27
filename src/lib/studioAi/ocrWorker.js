/**
 * 사진 속 글자 찾기(OCR) Web Worker — onnxruntime-web 1.30.0 (LaMa 워커 aiWorker.js와 같은 빌드·같은 wasm 파일)
 *
 * 모델: public/studio-ocr/ (PP-OCRv5 mobile 검출 4.8MB + 인식 16.6MB + 사전, 출처·라이선스 NOTICE.txt)
 *   받은 파일마다 sha256을 아래 고정값과 대조한다 — 다르면 쓰지 않고 오류(삼키지 않음).
 *   Cache Storage 'euchs-studio-ocr-models'에 보관 (LaMa 캐시 'euchs-studio-ai-models'와 따로 — LaMa 보관이 옛 버전을 지울 때 서로 지우지 않게).
 * 세션: prefer 'webgpu'면 ['webgpu']로 먼저, 실패하면 사유를 남기고 ['wasm'] (aiWorker와 같은 이유 — 한 번에 주면 ORT가 조용히 넘어간다).
 *   실측(랩 42장, euchs.co.kr 조건 = 1스레드): WebGPU 장당 가운데값 0.34초 / WASM 1.74초.
 *
 * 메시지
 *   ← { type:'prepare', prefer } → { type:'progress', phase, loaded?, total? } … { type:'ready', info } | { type:'error', reason }
 *   ← { type:'ocr', id, image:{ data, width, height } }  (RGBA — 긴 사진은 여기서 조각으로 나눠 돈다: ocrPaddle.tileRanges)
 *   → { type:'result', id, lines, tiles, ms } | { type:'error', id, reason }
 */
import * as ort from 'onnxruntime-web/webgpu'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'
import { runPaddle, parseDict, tileRanges, placeTileLines } from './ocrPaddle.js'

export const OCR_FILES = [
  { key: 'det', path: '/studio-ocr/ch_PP-OCRv5_det_mobile.onnx', size: 4819576, sha256: '4d97c44a20d30a81aad087d6a396b08f786c4635742afc391f6621f5c6ae78ae' },
  { key: 'rec', path: '/studio-ocr/ch_PP-OCRv5_rec_mobile.onnx', size: 16631306, sha256: '5825fc7ebf84ae7a412be049820b4d86d77620f204a041697b0494669b1742c5' },
  { key: 'dict', path: '/studio-ocr/ppocrv5_dict.txt', size: 74012, sha256: 'd1979e9f794c464c0d2e0b70a7fe14dd978e9dc644c0e71f14158cdf8342af1b' },
]
const CACHE_NAME = 'euchs-studio-ocr-models'

ort.env.wasm.wasmPaths = { wasm: wasmUrl }
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 4) : 1

let P = null
let engine = null
const post = (m, transfer) => self.postMessage(m, transfer || [])
const errText = e => `${e?.name && e.name !== 'Error' ? e.name + ': ' : ''}${e?.message || e}`

async function sha256Hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function openCache() {
  if (typeof caches === 'undefined') return null
  try { return await caches.open(CACHE_NAME) } catch (e) {
    console.error('[studio-ocr] Cache Storage 열기 실패 — 매번 새로 받습니다:', errText(e))
    return null
  }
}

/** 파일 하나: 캐시(sha 확인) → 없거나 깨졌으면 받기 → 크기·sha 확인 → 보관 */
async function loadFile(f, cache, onBytes) {
  const url = new URL(f.path, self.location.origin).href
  const key = new URL(`/__studio-ocr-model/${f.key}-${f.sha256.slice(0, 12)}`, self.location.origin).href
  if (cache) {
    const hit = await cache.match(key)
    if (hit) {
      const buf = new Uint8Array(await hit.arrayBuffer())
      if (await sha256Hex(buf) === f.sha256) { onBytes(f.size); return { buf, cached: true } }
      console.error('[studio-ocr] 캐시된 파일 sha256 불일치 — 지우고 새로 받습니다:', f.path)
      await cache.delete(key)
    }
  }
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`OCR 모델 받기 실패 HTTP ${res.status}: ${f.path}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.length !== f.size) throw new Error(`OCR 모델 크기 불일치: ${f.path} 받은 ${buf.length} / 기대 ${f.size}`)
  const got = await sha256Hex(buf)
  if (got !== f.sha256) throw new Error(`OCR 모델 sha256 불일치: ${f.path} (${got})`)
  onBytes(f.size)
  if (cache) {
    try {
      await cache.put(key, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } }))
    } catch (e) {
      console.error('[studio-ocr] 캐시 보관 실패(다음에도 새로 받음):', f.path, errText(e))
    }
  }
  return { buf, cached: false }
}

async function createSessions(det, rec, prefer) {
  let webgpuError = null
  if (prefer === 'webgpu') {
    if (!navigator.gpu) webgpuError = 'navigator.gpu 없음(WebGPU 미지원 브라우저/워커)'
    else {
      try {
        const opts = { executionProviders: ['webgpu'] }
        return { det: await ort.InferenceSession.create(det, opts), rec: await ort.InferenceSession.create(rec, opts), engine: 'webgpu', webgpuError: null }
      } catch (e) {
        webgpuError = errText(e)
      }
    }
    console.error('[studio-ocr] WebGPU 세션 실패 → WASM으로 만듭니다:', webgpuError)
  }
  const opts = { executionProviders: ['wasm'] }
  return { det: await ort.InferenceSession.create(det, opts), rec: await ort.InferenceSession.create(rec, opts), engine: 'wasm', webgpuError }
}

async function prepare({ prefer }) {
  if (!crypto?.subtle) throw Object.assign(new Error('crypto.subtle 미지원(보안 연결 필요)'), { unsupported: true })
  const t0 = performance.now()
  const cache = await openCache()
  const total = OCR_FILES.reduce((s, f) => s + f.size, 0)
  let loaded = 0
  const bufs = {}
  let cached = true
  for (const f of OCR_FILES) {
    const r = await loadFile(f, cache, n => { loaded += n; post({ type: 'progress', phase: 'download', loaded, total }) })
    bufs[f.key] = r.buf
    cached = cached && r.cached
  }
  const t1 = performance.now()
  post({ type: 'progress', phase: 'session' })
  const s = await createSessions(bufs.det, bufs.rec, prefer)
  P = { det: s.det, rec: s.rec, chars: parseDict(new TextDecoder().decode(bufs.dict)) }
  engine = s.engine
  return {
    engine, webgpuError: s.webgpuError, cached, modelMs: Math.round(t1 - t0), sessionMs: Math.round(performance.now() - t1),
    threads: ort.env.wasm.numThreads, crossOriginIsolated: !!self.crossOriginIsolated,
  }
}

/** RGBA 한 장에서 [start, end) 범위(긴 쪽)만 떼어 낸 ImageData 모양 */
function sliceImage(img, axis, start, end) {
  const { data, width: W, height: H } = img
  if (axis === 'y') return { data: data.subarray(start * W * 4, end * W * 4), width: W, height: end - start }
  const w = end - start, out = new Uint8ClampedArray(w * H * 4)
  for (let y = 0; y < H; y++) out.set(data.subarray((y * W + start) * 4, (y * W + end) * 4), y * w * 4)
  return { data: out, width: w, height: H }
}

async function ocr({ image }) {
  if (!P) throw new Error('OCR 세션 없음 — prepare 먼저')
  const t0 = performance.now()
  const { axis, tiles } = tileRanges(image.width, image.height)
  const lines = []
  for (const t of tiles) {
    const part = axis ? sliceImage(image, axis, t.start, t.end) : image
    const r = await runPaddle(ort, P, part)
    lines.push(...placeTileLines(r.lines, axis, t))
  }
  return { lines, tiles: tiles.length, ms: Math.round(performance.now() - t0) }
}

self.onmessage = async ({ data: m }) => {
  if (m.type === 'prepare') {
    try {
      post({ type: 'ready', info: await prepare(m) })
    } catch (e) {
      console.error('[studio-ocr] 준비 실패:', e)
      post({ type: 'error', reason: errText(e), unsupported: !!e?.unsupported })
    }
  } else if (m.type === 'ocr') {
    try {
      post({ type: 'result', id: m.id, ...(await ocr(m)) })
    } catch (e) {
      console.error('[studio-ocr] 글자 찾기 실패:', e)
      post({ type: 'error', id: m.id, reason: errText(e) })
    }
  }
}
