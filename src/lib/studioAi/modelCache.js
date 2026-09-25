/**
 * AI 모델 받기 + 검증 + Cache Storage 보관 (워커·메인 어디서든 동작, DOM 없음)
 *
 * 모델은 Supabase 전체 업로드 상한(50MB) 때문에 45MB 조각으로 나뉘어 있다.
 *   URL(VITE_STUDIO_AI_MODEL_URL)은 manifest.json을 가리킨다:
 *   { model, sha256, size, parts: [{ path, size, sha256 }] }   (path는 manifest와 같은 폴더 기준)
 * 순서: manifest → 조각을 순서대로 받기(전체 진행률) → 조각별 크기·sha256 확인 → 이어 붙이기
 *       → 전체 sha256이 기대값(VITE_STUDIO_AI_MODEL_SHA256)과 같은지 확인 → Cache Storage에 합친 파일로 보관
 * 다음부터는 캐시에서 꺼내고, 꺼낸 것도 전체 sha256을 다시 확인한다(깨진 캐시는 지우고 새로 받는다).
 * 어떤 단계든 어긋나면 받은 것을 버리고 오류를 던진다 (삼키지 않음).
 */

const CACHE_NAME = 'euchs-studio-ai-models'
const CACHE_KEY_PREFIX = '/__studio-ai-model/'

export async function sha256Hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function cacheKeyUrl(sha) {
  return new URL(CACHE_KEY_PREFIX + 'lama-' + sha.slice(0, 12), self.location.origin).href
}

/** Cache Storage를 쓸 수 있으면 cache 객체, 아니면 사유 */
async function openCache() {
  if (typeof caches === 'undefined') return { cache: null, reason: 'Cache Storage 없음(caches 미지원 환경)' }
  try {
    return { cache: await caches.open(CACHE_NAME), reason: null }
  } catch (e) {
    return { cache: null, reason: `Cache Storage 열기 실패: ${e?.name || ''} ${e?.message || e}` }
  }
}

/** 조각 하나를 받으며 진행률 보고 */
async function fetchPart(url, expectSize, onBytes) {
  // 브라우저 HTTP 캐시에 200MB를 한 벌 더 쌓지 않도록 no-store (보관은 Cache Storage가 담당)
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`조각 받기 실패 HTTP ${res.status}: ${url}`)
  const out = new Uint8Array(expectSize)
  let off = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (off + value.length > expectSize) throw new Error(`조각 크기 초과: ${url} (기대 ${expectSize})`)
    out.set(value, off)
    off += value.length
    onBytes(value.length)
  }
  if (off !== expectSize) throw new Error(`조각 크기 불일치: ${url} 받은 ${off} / 기대 ${expectSize}`)
  return out
}

/**
 * 모델 바이트를 얻는다.
 * @param {{ manifestUrl: string, sha256: string, onProgress?: (p) => void }} opts
 *   onProgress({ phase: 'cache'|'manifest'|'download'|'verify'|'store', loaded?, total? })
 * @returns {Promise<{ bytes: Uint8Array, source: 'cache'|'network', ms: number, cacheNote: string|null }>}
 *   cacheNote: 캐시를 쓰지 못한 사유(없으면 null) — 화면에 그대로 표시
 */
export async function loadModel({ manifestUrl, sha256, onProgress = () => {} }) {
  const t0 = performance.now()
  const want = String(sha256 || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(want)) throw new Error('모델 sha256 값 형식이 잘못됨 (64자리 16진수 필요)')
  if (!manifestUrl) throw new Error('모델 manifest 주소가 없음')

  const { cache, reason } = await openCache()
  let cacheNote = reason
  if (reason) console.error('[studio-ai] 캐시 사용 불가 — 매번 새로 받습니다:', reason)
  const key = cacheKeyUrl(want)

  // 1) 캐시
  if (cache) {
    onProgress({ phase: 'cache' })
    const hit = await cache.match(key)
    if (hit) {
      const bytes = new Uint8Array(await hit.arrayBuffer())
      onProgress({ phase: 'verify' })
      const got = await sha256Hex(bytes)
      if (got === want) return { bytes, source: 'cache', ms: performance.now() - t0, cacheNote }
      console.error('[studio-ai] 캐시된 모델 sha256 불일치 — 지우고 새로 받습니다:', got)
      await cache.delete(key)
    }
  }

  // 2) manifest
  onProgress({ phase: 'manifest' })
  const mres = await fetch(manifestUrl, { cache: 'no-store' })
  if (!mres.ok) throw new Error(`manifest 받기 실패 HTTP ${mres.status}`)
  const manifest = await mres.json()
  if (String(manifest.sha256).toLowerCase() !== want) {
    throw new Error(`manifest의 sha256(${manifest.sha256})이 설정값과 다름`)
  }
  const parts = manifest.parts
  if (!Array.isArray(parts) || parts.length === 0) throw new Error('manifest에 조각 목록이 없음')
  const total = parts.reduce((s, p) => s + p.size, 0)
  if (total !== manifest.size) throw new Error(`조각 크기 합(${total})이 manifest size(${manifest.size})와 다름`)

  // 3) 조각 받기 + 조각별 확인 + 이어 붙이기
  const bytes = new Uint8Array(total)
  let loaded = 0, off = 0
  onProgress({ phase: 'download', loaded, total })
  for (const p of parts) {
    const url = new URL(p.path, manifestUrl).href
    const part = await fetchPart(url, p.size, n => { loaded += n; onProgress({ phase: 'download', loaded, total }) })
    const got = await sha256Hex(part)
    if (got !== String(p.sha256).toLowerCase()) throw new Error(`조각 sha256 불일치: ${p.path}`)
    bytes.set(part, off)
    off += part.length
  }

  // 4) 전체 확인
  onProgress({ phase: 'verify' })
  const full = await sha256Hex(bytes)
  if (full !== want) throw new Error(`모델 전체 sha256 불일치: ${full}`)

  // 5) 보관 (옛 버전 정리 후). 보관 실패는 모델 사용엔 지장 없으나 사유를 남긴다.
  if (cache) {
    onProgress({ phase: 'store' })
    try {
      for (const req of await cache.keys()) if (req.url !== key) await cache.delete(req)
      await cache.put(key, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(bytes.length) } }))
    } catch (e) {
      cacheNote = `캐시 보관 실패(다음에도 새로 받음): ${e?.name || ''} ${e?.message || e}`
      console.error('[studio-ai]', cacheNote)
    }
  }
  return { bytes, source: 'network', ms: performance.now() - t0, cacheNote }
}

/** 보관된 모델 캐시 삭제 (시험 화면의 "첫 받기" 측정용) */
export async function clearModelCache() {
  if (typeof caches === 'undefined') return false
  return caches.delete(CACHE_NAME)
}
