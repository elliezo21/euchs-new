import { isPostLoginTarget } from './authRedirect.js'

/**
 * 화면용 로그인 캐시(euchs_auth_user·currentUser)를 비울지 판정 — 순수 함수
 *
 * 배경: 헤더·대시보드는 currentUser(=euchs_auth_user 캐시)만 보고 로그인으로 판단한다.
 *   Supabase 세션(sb-…-auth-token)이 끝났는데 캐시만 남으면 "eric님"으로 보이지만 RLS가 0행을 돌려줘
 *   예치금 0원·주문 0건이 뜬다. 세션 조회가 끝난 뒤(getSession 대기) 세션이 없을 때만 캐시를 비운다.
 *
 * getSession(auth-js 2.112) 결과별 판단:
 *   - access token이 살아 있음 → session 반환 (네트워크 없음)                        → 유지
 *   - access token 만료 → refresh token으로 갱신 성공 → session 반환, error null        → 유지
 *   - 갱신이 네트워크 오류(AuthRetryableFetchError) → session null + error, 토큰은 저장소에 남음 → 유지(다음에 다시 시도)
 *   - refresh token이 거절됨(만료·폐기) → SDK가 토큰 삭제, session null + error      → 비움
 *   - 저장소에 토큰 자체가 없음 → session null, error null                               → 비움
 *
 * 관리자(euchs_admin_token)·데모 세션은 기존 동작을 바꾸지 않으므로 항상 유지.
 */
export function shouldClearStaleLocalUser({ hasSession, errorRetryable, hasCachedUser, isAdminToken, isDemo }) {
  if (!hasCachedUser) return false   // 비울 캐시가 없음
  if (isAdminToken || isDemo) return false
  if (hasSession) return false
  if (errorRetryable) return false   // 네트워크 문제 — 세션이 끝났다고 확정할 수 없음
  return true
}

/**
 * 캐시를 정리한 뒤 로그인 창을 띄울지 — 보호 화면(/dashboard*, /studio/*)에 있을 때만.
 * 공개 화면(/, /mall 등)은 헤더가 "로그인"으로 바뀌는 것으로 충분하다.
 * (다른 탭에서 로그아웃하면 이 탭에도 SIGNED_OUT이 와서 정리되는데, 공개 화면까지 창을 띄우면 성가시다)
 */
export function shouldPromptLoginAfterClear(currentFullPath) {
  return isPostLoginTarget(currentFullPath)
}
