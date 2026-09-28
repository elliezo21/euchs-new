/**
 * [필수] 개인정보 수집·이용 동의 — 동의 기록(profiles.privacy_agreed_at)이 없는 회원에게 로그인 뒤 한 번 받는다.
 *
 * - 이메일 가입: 가입 창(LoginModal)에서 체크 → 가입 트리거가 서버 시각으로 기록(docs/sql/2026-09-28-account-withdrawal.sql)
 * - 간편 로그인(구글·카카오·네이버) 첫 가입, 이 기능 전에 가입한 회원: 기록이 없으므로 로그인 뒤 PrivacyConsentGate가 한 번 띄운다
 *   → 동의 = /api/privacy-consent(서버 시각·service_role), 동의 안 함 = 로그아웃
 * - 관리자·스태프는 받지 않는다.
 * 테스트: scripts/test-privacy-consent.mjs
 */

// 동의한 처리방침 판 (= /privacy 시행일). 처리방침을 바꾸면 이 값과 api/_privacyConsent.js 값을 같이 바꾼다(테스트가 대조)
export const PRIVACY_VERSION = '2026-09-28'

// 동의 창을 띄우지 않는 화면 — 처리방침을 읽으러 간 새 탭을 가리면 안 된다
const OPEN_PATHS = ['/privacy']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 동의 창을 띄울지.
 * profile은 이 사용자의 profiles 행이 실제로 읽힌 뒤에만 판단한다(아직 못 읽었으면 띄우지 않음 — 읽히면 다시 계산됨).
 * @param {{ user:any, profile:any, isStaff:boolean, authLoading:boolean, path:string }} s
 */
export function needsPrivacyConsent({ user, profile, isStaff, authLoading, path }) {
  if (authLoading || !user || isStaff) return false
  if (!UUID_RE.test(String(user.id || ''))) return false // Supabase 계정이 아니면 서버에 기록할 곳이 없다
  if (OPEN_PATHS.includes(path)) return false
  if (!profile || profile.id !== user.id) return false
  return !profile.privacy_agreed_at
}
