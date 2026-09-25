/**
 * 로그인 후 복귀 주소(sessionStorage 'euchs_auth_redirect') 검사 — 순수 함수
 * 기존 복귀 장치(router 가드가 저장 → App.vue가 로그인 뒤 이동)를 그대로 쓰고, 값이 안전한지·어디로 갈지만 정한다.
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

/** 대시보드(/dashboard, /dashboard/*, 쿼리·해시 포함)인지 */
export function isDashboardPath(p) {
  return typeof p === 'string' && /^\/dashboard(?:[/?#]|$)/.test(p)
}

/**
 * 로그인 뒤 우선 복귀할 저장 주소인지 — 가드가 저장하는 보호 화면(/dashboard*, /studio/*)만, 안전한 내부 경로만
 */
export function isPostLoginTarget(p) {
  return isSafeRedirectPath(p) && (isDashboardPath(p) || isStudioProtectedPath(p))
}

/**
 * 로그인 창이 닫힐 때 저장된 복귀 주소를 버릴지 — 사용자가 직접 닫은 경우(X·바깥 클릭·Esc)만 버린다.
 * - 'user_dismiss'  : 로그인을 포기함 → 버림 (남겨 두면 나중 로그인에서 엉뚱한 곳으로 튄다)
 * - 'login_success' : 로그인 성공으로 자동 닫힘 → 유지 (App.vue가 그 주소로 이동)
 * - 'oauth_redirect': 구글·카카오로 떠남 → 유지 (돌아온 뒤 App.vue checkOAuthReturnUrl이 사용)
 *   ※ 현재 OAuth 버튼은 창을 닫지 않고 바로 페이지를 떠난다. 그래도 사유를 명시해 두어 나중에 닫기를 넣어도 지워지지 않게 한다.
 */
export function dropsRedirectOnClose(reason) {
  return reason === 'user_dismiss'
}

/**
 * 이메일 등 모달 로그인 성공 뒤 갈 곳. null이면 이동하지 않는다.
 * - 저장된 보호 화면 주소가 있으면 지금 어느 화면에 있든 그곳 (이미 그 화면이면 null)
 * - 없으면 예전 규칙: 홈(/)·/login에서 로그인 → /mall, 그 밖의 화면 → 그대로 머묾
 */
export function loginSuccessDest(saved, currentPath, currentFullPath) {
  if (isPostLoginTarget(saved)) return saved === currentFullPath ? null : saved
  if (currentPath === '/' || currentPath === '/login') return '/mall'
  return null
}

/**
 * 구글·카카오 OAuth에서 홈(/)으로 돌아온 뒤 갈 곳.
 * - 저장된 보호 화면 주소가 있으면 그곳 (가드가 / 로 보낸 뒤 로그인을 눌렀으면 returnUrl은 "/"라서 목적지를 잃는다)
 * - 없으면 예전 규칙: 로그인 버튼을 누른 화면(returnUrl), 홈이었으면 /mall
 */
export function oauthReturnDest(saved, returnUrl) {
  if (isPostLoginTarget(saved)) return saved
  return (returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/?')) ? returnUrl : '/mall'
}
