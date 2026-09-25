/**
 * 편집 캔버스용 원본 이미지 캐시 — 최근 N장(기본 5)의 HTMLImageElement를 메모리에 둔다.
 *
 * ★ crossOrigin='anonymous'로 받아야 캔버스가 오염되지 않는다 (getImageData 가능 — 1-5 실측).
 *   목록 썸네일(<img>, crossOrigin 없음)과 같은 주소를 쓰면 CORS 없는 캐시 응답이 섞일 수 있어, 캔버스용 서명 URL은 따로 받는다.
 * ★ 서명 URL은 10분 만료. 발급 9분이 지난 주소는 새로 받는다. 받기 실패(403 등)면 한 번 새로 서명해 다시 받고,
 *   그래도 실패하면 throw — 화면이 "사진을 불러오지 못했어요 [다시 시도]"를 보여준다.
 */
import { signViewUrl } from '@/lib/studioProjects'

const URL_FRESH_MS = 9 * 60 * 1000

function loadElement(url) {
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = 'anonymous' // src보다 먼저
    el.decoding = 'async'
    el.onload = () => {
      el.decode().then(() => resolve(el), () => resolve(el)) // decode 실패는 onload가 이미 성공했으므로 그대로 쓴다
    }
    el.onerror = () => reject(new Error('사진 파일을 받지 못했어요 (주소 만료·권한·네트워크)'))
    el.src = url
  })
}

export function createImageCache({ limit = 5, onEvict } = {}) {
  const urls = new Map()  // original_path → { url, issuedAt }
  const imgs = new Map()  // image id → Promise<HTMLImageElement> (삽입 순서 = 최근 사용 순)

  async function urlFor(path, force) {
    const u = urls.get(path)
    if (!force && u && Date.now() - u.issuedAt < URL_FRESH_MS) return u.url
    const fresh = await signViewUrl(path)
    urls.set(path, fresh)
    return fresh.url
  }

  async function fetchImage(row) {
    try {
      return await loadElement(await urlFor(row.original_path, false))
    } catch (first) {
      console.warn('[studioImageCache] 첫 로드 실패 — 새로 서명해 한 번 더:', row.id, first.message)
      return loadElement(await urlFor(row.original_path, true))
    }
  }

  /** @param {{ id, original_path }} row */
  function get(row) {
    const hit = imgs.get(row.id)
    if (hit) {
      imgs.delete(row.id)
      imgs.set(row.id, hit)
      return hit
    }
    const p = fetchImage(row)
    imgs.set(row.id, p)
    // 실패한 로드는 캐시에 남기지 않는다 (다음 "다시 시도"에서 새로 받게). 에러 자체는 호출한 쪽이 await해서 보여준다
    p.then(null, (e) => {
      console.error('[studioImageCache] 사진 로드 실패:', row.id, e.message)
      if (imgs.get(row.id) === p) imgs.delete(row.id)
    })
    while (imgs.size > limit) {
      const oldest = imgs.keys().next().value
      imgs.delete(oldest)
      onEvict?.(oldest)
    }
    return p
  }

  function clear() {
    for (const id of imgs.keys()) onEvict?.(id)
    imgs.clear()
    urls.clear()
  }

  return { get, clear }
}
