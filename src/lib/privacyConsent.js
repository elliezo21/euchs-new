/**
 * [필수] 개인정보 수집·이용 동의 — 이메일 가입 창(LoginModal)에서 체크해야 가입 버튼이 켜진다.
 * 가입 트리거가 서버 시각으로 기록한다 (profiles.privacy_agreed_at·privacy_version — docs/sql/2026-09-28-account-withdrawal.sql).
 *
 * 로그인 뒤에 띄우던 동의 창은 없앴다 (2026-09-28) — 어떤 회원에게도, 어떤 화면에서도 뜨지 않는다.
 * 테스트: scripts/test-privacy-consent.mjs
 */

// 동의한 처리방침 판 (= /privacy 시행일). 처리방침을 바꾸면 이 값도 바꾼다
export const PRIVACY_VERSION = '2026-09-28'
