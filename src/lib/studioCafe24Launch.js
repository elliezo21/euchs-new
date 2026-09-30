/**
 * 카페24 App URL 쿼리 원문 붙잡기 (2026-09-30 앱 방식)
 * 쇼핑몰 관리자에서 우리 앱 "EUCHS 스튜디오"를 열면 카페24가 /studio/channels/connect?…&timestamp=…&hmac=… 로 연다.
 * hmac은 "받은 쿼리 원문" 기준이라 글자 하나만 바뀌어도 틀린다 — vue-router는 첫 이동 때 주소를 자기 방식으로 다시 인코딩해 바꿔 쓰므로,
 * 라우터가 만들어지기 전(src/router/index.js가 이 파일을 먼저 불러온다)에 원문을 sessionStorage에 적어 둔다.
 * 로그인 전이면 로그인 뒤에 이어서 쓴다(카드가 takeCafe24Launch로 한 번 꺼내 쓰고 지운다). 원문에는 비밀 값이 없다(쇼핑몰 ID·시각·서명).
 */
const KEY = 'studio-cafe24-launch'
const PATHS = ['/studio/channels/connect', '/studio/channels/connect/']
const KEEP_MS = 30 * 60 * 1000 // 로그인에 걸리는 시간까지 — 서버가 timestamp를 따로 검사한다

/** 주소가 App URL 모양인지 (hmac·mall_id가 있음) */
export function isLaunchSearch(search) {
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  return q.has('hmac') && q.has('mall_id')
}

/** 지금 주소가 App URL이면 원문을 적어 둔다 (import 순간 한 번) */
export function captureCafe24Launch(loc = typeof window !== 'undefined' ? window.location : null, store = typeof sessionStorage !== 'undefined' ? sessionStorage : null) {
  if (!loc || !store || !PATHS.includes(loc.pathname) || !isLaunchSearch(loc.search)) return false
  try {
    store.setItem(KEY, JSON.stringify({ q: loc.search.replace(/^\?/, ''), at: Date.now() }))
    return true
  } catch (e) {
    console.error('[studioCafe24Launch] 카페24 앱 실행 주소를 적어 두지 못함:', e)
    return false
  }
}

/** 적어 둔 원문을 한 번 꺼낸다 (꺼내면 지움 · 30분 지났으면 null) */
export function takeCafe24Launch(store = typeof sessionStorage !== 'undefined' ? sessionStorage : null, now = Date.now()) {
  if (!store) return null
  let v = null
  try {
    v = JSON.parse(store.getItem(KEY) || 'null')
    store.removeItem(KEY)
  } catch (e) {
    console.error('[studioCafe24Launch] 적어 둔 카페24 앱 실행 주소를 읽지 못함:', e)
    return null
  }
  if (!v || typeof v.q !== 'string' || !(now - Number(v.at) < KEEP_MS)) return null
  return v.q
}
/** 꺼내지 않고 있는지만 */
export function hasCafe24Launch(store = typeof sessionStorage !== 'undefined' ? sessionStorage : null) {
  try { return !!store?.getItem(KEY) } catch (e) { console.error('[studioCafe24Launch] sessionStorage 읽기 실패:', e); return false }
}

captureCafe24Launch()
