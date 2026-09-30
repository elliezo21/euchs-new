/**
 * 스튜디오 작업 시작 관문 (2026-09-30) — 누구나 구경하고, 작업을 시작하는 순간에만 막는다.
 *   [템플릿으로 시작] · 판매처 [연결하기] · [보내기] 처럼 주소 이동이 아닌 동작이 부른다.
 *   (새로 만들기·내 작업·1688 가져오기·편집기 열기는 주소 이동이라 라우터 가드 3-1·3-2가 같은 일을 한다)
 *
 * - 로그인 전  → 하려던 동작의 주소(resumePath, 스튜디오 안)를 복귀 주소로 저장하고 스튜디오 안에서 로그인 창.
 *                로그인하면 App.vue(이메일)·auth.js oauthRedirectTarget(구글·카카오)이 그 주소로 보내고, 화면이 주소를 보고 이어서 한다.
 * - 주문 이력 없음 → 안내 창(studioNoAccessOpen — StudioLayout)
 * - 주문 이력 있음 → 바로 진행 (true)
 * 판정은 새로 만들지 않고 studioAccess.checkStudioAccess(서버 action 'access' → _studioBg.isBgEligible) 그대로. 서버 API도 같은 관문이라 화면을 건너뛰어도 막힌다.
 */
import { currentUser, openLoginModal } from '@/lib/auth'
import { AUTH_REDIRECT_KEY, isStudioProtectedPath, isSafeRedirectPath } from '@/lib/authRedirect'
import { checkStudioAccess, studioNoAccessOpen } from '@/lib/studioAccess'

const STUDIO_MODE = import.meta.env.VITE_STUDIO_ENABLED || 'off'

function askLogin(resumePath) {
  if (isSafeRedirectPath(resumePath) && isStudioProtectedPath(resumePath)) sessionStorage.setItem(AUTH_REDIRECT_KEY, resumePath)
  else sessionStorage.removeItem(AUTH_REDIRECT_KEY) // 예전 목적지가 남아 엉뚱한 곳으로 가지 않게
  openLoginModal('login')
}

/**
 * @param {string} resumePath 로그인 뒤 이어서 할 주소 (예: '/studio/templates?start=basic')
 * @returns {Promise<boolean>} true = 지금 진행
 */
export async function studioGate(resumePath) {
  if (!currentUser.value?.id) { askLogin(resumePath); return false }
  if (STUDIO_MODE !== 'all') return true // admin 모드: 스튜디오 화면 자체가 관리자만 (라우터 가드)
  const access = await checkStudioAccess(currentUser.value.id)
  if (access === 'ok') return true
  if (access === 'not_customer') { studioNoAccessOpen.value = true; return false }
  if (access === 'login') { askLogin(resumePath); return false } // 화면 캐시만 남고 세션이 끝난 경우
  // 확인 자체가 실패 — 라우터 가드와 같게 진행하고(서버 API가 자격을 다시 확인한다) 원인을 남긴다
  console.error('[studioGate] 스튜디오 자격 확인 실패 — 진행하고 서버 API가 다시 확인합니다:', resumePath)
  return true
}
