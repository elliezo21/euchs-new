/**
 * 편집 캔버스용 원본 이미지 캐시 — 최근 N장(기본 5)의 HTMLImageElement를 메모리에 둔다.
 *
 * ★ crossOrigin='anonymous'로 받아야 캔버스가 오염되지 않는다 (getImageData 가능 — 1-5 실측).
 *   편집기에서 원본을 받는 곳(목록 썸네일·페이지 작은 사진·지우기 화면)은 모두 crossOrigin으로 받고, 서명 URL은
 *   createSignedUrlPool 하나를 같이 쓴다 → 같은 주소라 브라우저가 한 번 받은 파일을 다시 받지 않는다.
 *   (목록 썸네일은 원본을 <img>로 직접 받지 않고 페이지용 작은 사진을 쓴다 — CORS 없는 캐시 응답이 섞일 일이 없다)
 * ★ 서명 URL은 10분 만료. 발급 9분이 지난 주소는 새로 받는다. 받기 실패(403 등)면 한 번 새로 서명해 다시 받고,
 *   그래도 실패하면 throw — 화면이 "사진을 불러오지 못했어요 [다시 시도]"를 보여준다.
 */
import { signViewUrl } from '@/lib/studioProjects'

const URL_FRESH_MS = 9 * 60 * 1000

/**
 * 서명 URL 모음 — 편집기 하나에 하나. 열 때 한 번에 묶어 받은 주소(signViewUrls)를 넣어 두고 같이 쓴다.
 *   seed(map, issuedAt): 묶어 받은 주소 넣기 (path → url)
 *   url(path, { force }): 9분 안에 받은 주소가 있으면 그것, 없거나 force면 그 한 장만 새로 받는다
 */
export function createSignedUrlPool() {
  const urls = new Map() // path → { url, issuedAt }
  function seed(map, issuedAt = Date.now()) {
    for (const [path, url] of map) urls.set(path, { url, issuedAt })
  }
  async function url(path, { force = false } = {}) {
    const u = urls.get(path)
    if (!force && u && Date.now() - u.issuedAt < URL_FRESH_MS) return u.url
    const fresh = await signViewUrl(path)
    urls.set(path, fresh)
    return fresh.url
  }
  function clear() { urls.clear() }
  return { seed, url, clear }
}

/** 서명 URL로 받고, 실패하면 새로 서명해 한 번 더 (만료·권한 문제는 새 주소로 풀린다) */
export async function loadWithResign(pool, path) {
  try {
    return await loadElement(await pool.url(path))
  } catch (first) {
    console.warn('[studioImageCache] 첫 로드 실패 — 새로 서명해 한 번 더:', path, first.message)
    return loadElement(await pool.url(path, { force: true }))
  }
}

/** crossOrigin='anonymous'로 이미지 받기 (AI 결과 조각 PNG도 같은 방식 — studioAiPatch) */
export function loadElement(url) {
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

/** @param {{ limit?: number, onEvict?: Function, pool?: ReturnType<typeof createSignedUrlPool> }} opts pool: 편집기의 서명 URL 모음 (없으면 따로 만든다) */
export function createImageCache({ limit = 5, onEvict, pool = createSignedUrlPool() } = {}) {
  const imgs = new Map()  // image id → Promise<HTMLImageElement> (삽입 순서 = 최근 사용 순)

  function fetchImage(row) {
    return loadWithResign(pool, row.original_path)
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
    pool.clear()
  }

  return { get, clear }
}
