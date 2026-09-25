/**
 * 로그인 후 복귀 주소(sessionStorage 'euchs_auth_redirect') 검사 — 순수 함수
 * 기존 복귀 장치(router 가드가 저장 → App.vue handleLoginSuccess가 이동)를 그대로 쓰고, 값이 안전한지만 본다.
 *
 * ★ 내부 경로만 허용: "/"로 시작하고 "//"나 "/\"로 시작하지 않는 것.
 *   "//evil.com", "/\evil.com"은 브라우저가 다른 사이트 주소로 해석하므로 막는다. "https://…" 등 절대 주소도 막는다.
 */
export const AUTH_REDIRECT_KEY = 'euchs_auth_redirect'

export function isSafeRedirectPath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 2048) return false
  if (p[0] !== '/') return false
  if (p[1] === '/' || p[1] === '\\') return false
  if (/[\u0000-\u001f]/.test(p)) return false // 줄바꿈·탭 등 제어 문자
  return true
}

/** 스튜디오 보호 화면(대문 /studio 제외)인지 */
export function isStudioProtectedPath(p) {
  return typeof p === 'string' && p.startsWith('/studio/')
}
