/**
 * 광고 픽셀 (틱톡 ttq · 메타 fbq) — 2026-09-28
 *
 * 목적: 틱톡·메타 광고를 "웹사이트 전환"으로 돌리려고 카톡 상담·전화 링크 클릭을 표준 이벤트 Contact로 보낸다.
 *
 * 환경변수 (VITE_ = 빌드할 때 코드에 박힌다 → Vercel에 값을 넣은 뒤 반드시 재배포해야 적용)
 *   VITE_TIKTOK_PIXEL_ID   비어 있으면 틱톡 픽셀을 불러오지 않는다
 *   VITE_META_PIXEL_ID     비어 있으면 메타 픽셀을 불러오지 않는다
 *
 * 제외 경로: /admin 이하(/admin/login 포함), /dashboard 이하 — 불러오기·페이지뷰·이벤트 모두 안 함.
 *   가입 고객이 대시보드에서 누르는 카톡은 광고 성과가 아니라서, 섞이면 광고가 엉뚱한 사람을 학습한다.
 *   (경로는 src/router/index.js의 '/admin', '/admin/login', '/dashboard' 라우트와 같다)
 *   제외 경로로 처음 들어오면 불러오지 않고, 나중에 일반 화면으로 옮겨 가면 그때 불러온다.
 *   ★ 한계(틱톡): 틱톡 픽셀은 SPA 주소 변경마다 Pageview를 스스로 보낸다(실측 — 공식 안내
 *     https://ads.tiktok.com/resources/help/article/about-single-page-application-pageview-measurement-for-tiktok-pixel).
 *     일반 화면에서 불러온 뒤 앱 안에서 /admin·/dashboard로 옮겨 가면 틱톡 Pageview는 막지 못한다(끄는 설정은 개발자 문서에서 확인 못 함).
 *     Contact(카톡·전화)는 제외 경로에서 보내지 않는다. 메타는 applyPathRules(동의 API로 전송 일시 중지)로 막는다.
 *
 * 개인정보: 이벤트 값에는 content_name('kakao' | 'phone')만 넣는다. 이름·전화번호·이메일·주소·주문번호는 넣지 않는다.
 *   (전화 링크의 번호도 보내지 않는다)
 *
 * GA4(G-W12HTQ2JLY)는 index.html의 gtag.js가 불러온다. 여기서는 window.gtag가 있을 때만 이벤트를 보탠다.
 *
 * 문서
 *   메타 기본 코드: https://developers.facebook.com/docs/meta-pixel/get-started
 *   메타 표준 이벤트 Contact: https://developers.facebook.com/docs/meta-pixel/reference
 *   틱톡 픽셀 시작: https://ads.tiktok.com/help/article/get-started-pixel
 *   틱톡 표준 이벤트 Contact: https://ads.tiktok.com/help/article/standard-events-parameters
 */

const TIKTOK_ID = String(import.meta.env.VITE_TIKTOK_PIXEL_ID || '').trim()
const META_ID = String(import.meta.env.VITE_META_PIXEL_ID || '').trim()

const TIKTOK_SDK = 'https://analytics.tiktok.com/i18n/pixel/events.js'
const META_SDK = 'https://connect.facebook.net/en_US/fbevents.js'

const DEDUPE_MS = 1000
const lastSent = new Map() // `${kind}|${href}` → 보낸 시각

let tiktokOn = false
let metaOn = false

/** /admin·/dashboard 이하면 true */
export function isExcludedPath(path) {
  const p = String(path || '')
  return p === '/admin' || p.startsWith('/admin/') || p === '/dashboard' || p.startsWith('/dashboard/')
}

/** 스크립트를 받지 못하면(광고 차단·네트워크) 경고 한 줄만 — 사이트 동작에는 영향 없음 */
function warnOnLoadError(srcPrefix, name) {
  const el = document.querySelector(`script[src^="${srcPrefix}"]`)
  if (el) el.addEventListener('error', () => console.warn(`[adPixels] ${name} 스크립트를 불러오지 못했어요 (광고 차단·네트워크) — 이벤트는 보내지 않아요`), { once: true })
}

/**
 * 틱톡 기본 코드 — 틱톡 이벤트 관리자(Events Manager)가 주는 기본 코드 그대로 (ttq.load(ID) + 첫 ttq.page()).
 * ※ 틱톡은 공개 문서에 코드를 글자로 싣지 않고 이벤트 관리자에서만 준다. 해성이 받은 코드와 이 부분이 다르면 이 함수 안만 바꾼다.
 */
function loadTiktok(id) {
  /* eslint-disable */
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
    ttq.load(id);
    ttq.page();
  }(window, document, 'ttq');
  /* eslint-enable */
  warnOnLoadError(TIKTOK_SDK, '틱톡 픽셀')
}

/** 메타 기본 코드 — 공식 문서(get-started) 그대로 (fbq('init', ID) + 첫 PageView). noscript 이미지는 SPA라 뺀다 */
function loadMeta(id) {
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', id);
  fbq('track', 'PageView');
  /* eslint-enable */
  warnOnLoadError(META_SDK, '메타 픽셀')
}

/**
 * 앱 시작·라우트 이동마다 부른다. 아직 안 불러왔고 지금 경로가 제외가 아니면 불러온다(첫 페이지뷰 포함).
 * @returns {boolean} 이번에 새로 불러왔으면 true (그 경우 같은 이동에서 trackPageView를 또 부르지 않는다)
 */
export function initAdPixels(path) {
  if (isExcludedPath(path)) return false
  let loaded = false
  if (TIKTOK_ID && !tiktokOn) {
    loadTiktok(TIKTOK_ID)
    tiktokOn = true
    loaded = true
  }
  if (META_ID && !metaOn) {
    loadMeta(META_ID)
    metaOn = true
    loaded = true
  }
  return loaded
}

/**
 * 메타 전송 멈춤·다시 켜기 — 라우트 이동 직전(beforeEach)과 이동 뒤(afterEach)에 부른다.
 * 메타는 주소 변경(pushState)마다 PageView를 스스로 보낸다(실측). disablePushState로 끄면 두 번째 PageView부터 무시돼서(실측) 쓰지 않고,
 * 제외 경로에 있는 동안만 공식 동의 API로 "전송 일시 중지"한다. https://developers.facebook.com/docs/meta-pixel/implementation/gdpr
 */
let metaPaused = false
export function applyPathRules(path) {
  if (!metaOn) return
  const pause = isExcludedPath(path)
  if (pause === metaPaused) return
  window.fbq('consent', pause ? 'revoke' : 'grant')
  metaPaused = pause
}

/** 라우트 이동 뒤 페이지뷰 (SPA는 새로고침이 없어서 직접 보낸다 — 두 SDK가 스스로 보낸 것과 겹치면 SDK가 한 번만 보낸다, 실측) */
export function trackPageView(path) {
  if (isExcludedPath(path)) return
  if (tiktokOn) window.ttq.page()
  if (metaOn) window.fbq('track', 'PageView')
}

function sendContact(kind, href, gaEvent) {
  if (isExcludedPath(window.location.pathname)) return
  const key = `${kind}|${href}`
  const now = Date.now()
  const prev = lastSent.get(key)
  if (prev !== undefined && now - prev < DEDUPE_MS) return
  lastSent.set(key, now)
  if (tiktokOn) window.ttq.track('Contact', { content_name: kind })
  if (metaOn) window.fbq('track', 'Contact', { content_name: kind })
  if (typeof window.gtag === 'function') window.gtag('event', gaEvent)
}

/** 카톡 상담 링크 클릭 — href는 중복 판정에만 쓰고 보내지 않는다 */
export function trackKakaoClick(href) {
  sendContact('kakao', href, 'kakao_click')
}

/** 전화 링크 클릭 — 번호는 보내지 않는다 */
export function trackPhoneClick(href) {
  sendContact('phone', href, 'phone_click')
}

/** document 캡처 단계 클릭 1개 — 가장 가까운 <a>의 href로 판정 (기존 링크는 고치지 않는다) */
export function onDocumentClickCapture(e) {
  const a = e.target instanceof Element ? e.target.closest('a[href]') : null
  if (!a) return
  const href = a.getAttribute('href') || ''
  if (href.includes('pf.kakao.com')) trackKakaoClick(href)
  else if (href.toLowerCase().startsWith('tel:')) trackPhoneClick(href)
}

// 15초 이상 보고(다른 탭에 있는 시간 제외) + 내릴 수 있는 거리의 절반 이상 스크롤한 방문자에게
// 한 방문(탭)에 한 번만 신호 전송: 틱톡 ViewContent / GA engaged_15s / 메타 ViewContent(켜져 있을 때)
// 관리자 제외 = 위 isExcludedPath (Contact와 같은 경로 규칙). main.js에서 앱 시작 때 한 번만 부른다.
export function startEngagedTracking() {
  if (typeof window === 'undefined') return
  const KEY = 'euchs_engaged_sent'
  try { if (sessionStorage.getItem(KEY)) return } catch (e) { console.warn('[adPixels] sessionStorage 읽기 실패 — engaged 중복 방지 없이 진행', e) }

  let timeOk = false
  let scrollOk = false
  let sent = false

  // 스크롤할 게 거의 없는 짧은 페이지는 스크롤 조건 통과 — 보낼 때 그 순간 기준으로만 본다.
  // (scrollOk로 고정하면 앱이 그려지기 전 빈 화면(main.js에서 시작할 때)도 짧은 페이지로 잡혀 스크롤 조건이 꺼진다)
  const isShortPage = () => document.documentElement.scrollHeight - window.innerHeight <= 50

  const send = () => {
    if (sent || !timeOk || !(scrollOk || isShortPage())) return
    if (isExcludedPath(window.location.pathname)) return // 관리자 화면에 있을 때는 보내지 않음(일반 화면으로 옮기면 그때 보냄)
    sent = true
    try { sessionStorage.setItem(KEY, '1') } catch (e) { console.warn('[adPixels] sessionStorage 쓰기 실패 — 이 탭에서는 새로고침하면 다시 보낼 수 있음', e) }
    try { window.ttq && window.ttq.track('ViewContent', { content_name: 'engaged_15s' }) } catch (e) { console.warn('[adPixels] 틱톡 engaged_15s 전송 실패', e) }
    try { window.gtag && window.gtag('event', 'engaged_15s') } catch (e) { console.warn('[adPixels] GA engaged_15s 전송 실패', e) }
    try { window.fbq && window.fbq('track', 'ViewContent', { content_name: 'engaged_15s' }) } catch (e) { console.warn('[adPixels] 메타 engaged_15s 전송 실패', e) }
    window.removeEventListener('scroll', onScroll)
    clearInterval(tick)
  }

  const onScroll = () => {
    if (scrollOk) return
    const doc = document.documentElement
    const scrollable = doc.scrollHeight - window.innerHeight
    if (scrollable <= 50) return // 짧은 페이지는 send()의 isShortPage에서 판정
    if (window.scrollY / scrollable >= 0.5) { scrollOk = true; send() }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // 화면을 실제로 보고 있는 시간만 셈 (다른 탭에 가 있으면 멈춤)
  let visibleMs = 0
  let last = Date.now()
  const tick = setInterval(() => {
    const now = Date.now()
    if (document.visibilityState === 'visible') visibleMs += now - last
    last = now
    if (visibleMs >= 15000) timeOk = true
    // 짧은 페이지로 이동한 경우도 잡도록 매 초 스크롤 조건을 다시 확인
    onScroll()
    send()
  }, 1000)
}
