/**
 * 에셋 이미지 받기 (브라우저에서만) — 목록(manifest.json)과 그림 파일. 규칙·검사는 studioAsset.js.
 *
 * ★ 같은 사이트의 정적 파일이라 로그인·서명 주소가 없다. 받은 것은 이 탭 안에서 다시 받지 않는다(실패한 것은 다음에 다시 시도).
 */
import { ASSET_MANIFEST_URL, readAssetManifest, assetUrl } from './studioAsset.js'

let manifestPromise = null
/** 목록 — { categories, items, problems }. 실패하면 throw (다음에 부르면 다시 받는다) */
export function loadAssetManifest() {
  if (manifestPromise) return manifestPromise
  manifestPromise = (async () => {
    const res = await fetch(ASSET_MANIFEST_URL, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`이미지 목록을 받지 못함 (${res.status})`)
    const out = readAssetManifest(await res.json())
    if (out.problems.length) console.error('[studioAssetLoad] 이미지 목록에 쓸 수 없는 항목이 있음:', out.problems)
    return out
  })().catch(e => {
    manifestPromise = null
    throw e
  })
  return manifestPromise
}

const images = new Map() // 경로 → Promise<{ source, width, height }>
/** 그림 한 장 (내보내기·미리보기 엔진의 deps.getAsset) — 크기는 그림 파일의 것 */
export function loadAssetImage(path) {
  const url = assetUrl(path)
  if (!url) return Promise.reject(new Error(`에셋 경로가 이상함: ${path}`))
  if (images.has(path)) return images.get(path)
  const p = new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight })
      else reject(new Error(`에셋 이미지 크기를 알 수 없음: ${path}`))
    }
    img.onerror = () => reject(new Error(`에셋 이미지를 받지 못함: ${path}`))
    img.src = url
  }).catch(e => {
    images.delete(path)
    throw e
  })
  images.set(path, p)
  return p
}
