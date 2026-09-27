/**
 * 배경 지우기 외부 공급자 (17-1) — 공급자 코드는 이 파일 하나에 모은다.
 * 나중에 BiRefNet(MIT)을 자체 서버로 옮기면 BG_MODELS에 항목을 더하고 removeBackground의 요청 부분만 바꾼다.
 *
 * 지금 공급자: fal.ai (해성 결정 2026-09-27)
 *   STUDIO_BG_MODEL = 'birefnet-v2'(기본, fal-ai/birefnet/v2, 계산 1초당 $0.0008) | 'bria-rmbg2'(fal-ai/bria/background/remove, 장당 $0.018)
 *   FAL_KEY         = fal API 키 (fal 공식 문서·SDK의 환경변수 이름). 서버 전용 — VITE_ 금지. 없으면 기능 "준비 중"
 *
 * 요청 방식 (fal 공식 문서 기준, 2026-09-27 확인)
 *   POST https://fal.run/{endpoint}  (동기 요청 — 큐 없이 결과를 바로 받음)
 *   Authorization: Key {FAL_KEY}
 *   X-Fal-Store-IO: 0      ← 모든 요청에. fal이 요청·결과 내용(payload)을 보관하지 않게 (Data Retention 문서)
 *   본문 { image_url, sync_mode: true }
 *     image_url = 우리 Storage의 짧은 서명 주소 (사진을 fal CDN에 올리지 않는다 — CDN에 올린 파일은 X-Fal-Store-IO: 0이어도 남는다고 문서가 경고)
 *     sync_mode = 두 모델 모두 입력 칸에 있음 — true면 결과를 data URI로 돌려준다(결과 파일을 fal CDN에 두지 않음)
 *   응답 { image: { url, width, height, content_type } } — 투명 배경 PNG. 우리는 알파(마스크)만 쓴다
 *   다른 입력 칸(model·operating_resolution·refine_foreground·output_mask 등)은 보내지 않는다 = fal 기본값
 *   (CLAUDE.md: 근거 없이 파라미터를 더하지 않는다. 기본값은 BiRefNet v2 = "General Use (Light)", 1024x1024)
 * ★ 키는 로그에 찍지 않는다. 응답 본문도 길게 찍지 않는다 (data URI).
 */

export const FAL_RUN_BASE = 'https://fal.run'
export const DEFAULT_BG_MODEL = 'birefnet-v2'
export const BG_TIMEOUT_MS = 40000 // studio-upload.js maxDuration 60초 안 (서명·저장 시간을 남긴다)

export const BG_MODELS = {
  'birefnet-v2': {
    provider: 'fal',
    endpoint: 'fal-ai/birefnet/v2',
    // 계산 1초당 $0.0008 — 걸린 시간(대기·전송 포함)으로 셈하므로 실제보다 조금 크게 잡힌다 (추정값)
    costUsd: ms => Math.round((ms / 1000) * 0.0008 * 100000) / 100000,
  },
  'bria-rmbg2': {
    provider: 'fal',
    endpoint: 'fal-ai/bria/background/remove',
    costUsd: () => 0.018,
  },
}

/** 요청 시점에 읽는다 (로컬 dev 프록시는 process.env를 요청마다 주입한다) */
export function bgProviderConfig(env = process.env) {
  let modelKey = String(env.STUDIO_BG_MODEL || '').trim() || DEFAULT_BG_MODEL
  if (!BG_MODELS[modelKey]) {
    console.warn(`[studio-bg] STUDIO_BG_MODEL 값이 알 수 없는 모델 — 기본값 ${DEFAULT_BG_MODEL} 사용`)
    modelKey = DEFAULT_BG_MODEL
  }
  const falKey = String(env.FAL_KEY || '').trim()
  return { modelKey, model: BG_MODELS[modelKey], falKey, ready: !!falKey }
}

/** 모든 fal 요청 머리 — X-Fal-Store-IO: 0 은 빠지지 않는다 */
export function falHeaders(falKey) {
  return {
    'Authorization': `Key ${falKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Fal-Store-IO': '0',
  }
}

export class BgProviderError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code // 'bg_timeout' | 'bg_failed'
  }
}

/** data:image/png;base64,… → Buffer (base64만) */
function fromDataUri(uri) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(uri)
  if (!m || !m[2]) throw new BgProviderError('bg_failed', '결과 data URI 형식이 예상과 다름')
  return Buffer.from(m[3], 'base64')
}

/**
 * 배경을 지운 PNG(바이트)를 받아 온다. 실패·시간 초과는 BgProviderError (code: bg_failed | bg_timeout).
 * @param {{ falKey: string, modelKey: string, imageUrl: string, timeoutMs?: number, fetchImpl?: typeof fetch }} o
 * @returns {Promise<{ buf: Buffer, via: 'data'|'url', ms: number, costUsd: number, endpoint: string }>}
 */
export async function removeBackground({ falKey, modelKey, imageUrl, timeoutMs = BG_TIMEOUT_MS, fetchImpl = fetch }) {
  const model = BG_MODELS[modelKey]
  if (!model) throw new BgProviderError('bg_failed', `알 수 없는 모델: ${modelKey}`)
  if (!falKey) throw new BgProviderError('bg_failed', 'FAL_KEY 없음')
  const t0 = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let r
    try {
      r = await fetchImpl(`${FAL_RUN_BASE}/${model.endpoint}`, {
        method: 'POST',
        headers: falHeaders(falKey),
        body: JSON.stringify({ image_url: imageUrl, sync_mode: true }),
        signal: controller.signal,
      })
    } catch (e) {
      if (e?.name === 'AbortError') throw new BgProviderError('bg_timeout', `fal 응답 시간 초과 (${timeoutMs}ms)`)
      throw new BgProviderError('bg_failed', `fal 요청 실패: ${e?.message || e}`)
    }
    const text = await r.text()
    if (!r.ok) {
      const errType = r.headers?.get?.('x-fal-error-type') || ''
      throw new BgProviderError(r.status === 504 ? 'bg_timeout' : 'bg_failed', `fal ${r.status} ${errType}: ${text.slice(0, 300)}`)
    }
    let body
    try { body = JSON.parse(text) } catch { throw new BgProviderError('bg_failed', `fal 응답이 JSON이 아님: ${text.slice(0, 120)}`) }
    const url = body?.image?.url
    if (typeof url !== 'string' || !url) throw new BgProviderError('bg_failed', 'fal 응답에 image.url 없음')
    let buf, via
    if (url.startsWith('data:')) {
      buf = fromDataUri(url)
      via = 'data'
    } else if (url.startsWith('https://')) {
      // sync_mode가 무시된 경우 — 결과 주소를 받자마자 가져와 우리 Storage에만 둔다 (fal 쪽 결과 파일 삭제는 이번 범위 밖)
      console.warn('[studio-bg] fal이 data URI 대신 결과 주소를 돌려줌 — 바로 받아 옴')
      let d
      try {
        d = await fetchImpl(url, { signal: controller.signal })
      } catch (e) {
        if (e?.name === 'AbortError') throw new BgProviderError('bg_timeout', '결과 받기 시간 초과')
        throw new BgProviderError('bg_failed', `결과 받기 실패: ${e?.message || e}`)
      }
      if (!d.ok) throw new BgProviderError('bg_failed', `결과 받기 ${d.status}`)
      buf = Buffer.from(await d.arrayBuffer())
      via = 'url'
    } else {
      throw new BgProviderError('bg_failed', '결과 주소 형식이 예상과 다름')
    }
    const ms = Date.now() - t0
    return { buf, via, ms, costUsd: model.costUsd(ms), endpoint: model.endpoint }
  } finally {
    clearTimeout(timer)
  }
}
