/**
 * 홈 스튜디오 알림 칸·모바일 하단 고정 바 공용 값 (2026-09-29)
 *
 * - 카톡 상담 주소는 이 하나 (https — 사이트 전체 링크를 이 주소로 맞춤)
 * - [스튜디오 둘러보기] 클릭 → GA4 이벤트 studio_cta_click { location } (window.gtag가 있을 때만 — index.html의 gtag.js)
 * - [1688 소싱몰 가기] 클릭(홈 스튜디오 칸) → GA4 이벤트 mall_cta_click { location }
 * - 카톡 버튼 클릭은 여기서 따로 보내지 않는다: <a href="...pf.kakao.com...">이면 adPixels.onDocumentClickCapture가
 *   GA kakao_click + 틱톡·메타 Contact를 이미 보낸다 (두 번 세지 않게)
 * - 하단 고정 바를 숨기는 경로도 여기 한 곳 (App.vue가 QuickMenu 올리기·바 표시에 같이 쓴다)
 */
export const KAKAO_CHAT_URL = 'https://pf.kakao.com/_xmQWsK/chat'
export const STUDIO_PATH = '/studio'

export const MALL_PATH = '/mall'

function sendGa(name, location) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, { location })
  }
}
/** [스튜디오 둘러보기] @param {'home_band'|'sticky'} location */
export function trackStudioCta(location) { sendGa('studio_cta_click', location) }
/** [1688 소싱몰 가기] (홈 스튜디오 칸) @param {'home_band'} location */
export function trackMallCta(location) { sendGa('mall_cta_click', location) }

// 하단 고정 바를 숨기는 경로 — 관리자·대시보드·마이페이지·스튜디오·로그인 (그 아래 경로 포함)
const STICKY_HIDDEN = ['/admin', '/dashboard', '/mypage', '/my-page', '/studio', '/login']

/** 모바일 하단 고정 바를 이 경로에서 보일지 */
export function showStickyCta(path) {
  const p = String(path || '')
  return !STICKY_HIDDEN.some(h => p === h || p.startsWith(`${h}/`))
}
