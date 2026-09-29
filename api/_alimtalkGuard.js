/**
 * 알림톡 발송 전 검사 — api/send-alimtalk.js가 씀 (순수 함수, 테스트: node scripts/test-alimtalk-guard.mjs)
 */

// 한국 휴대폰 번호(숫자만): 010은 11자리, 옛 번호 011·016·017·018·019는 10~11자리.
// 이 형식이 아니면 솔라피를 부르지 않는다(실패해도 과금되는 호출을 막기 위함).
export const KR_MOBILE_RE = /^(010\d{8}|01[16789]\d{7,8})$/

export function isKoreanMobile(digits) {
  return KR_MOBILE_RE.test(String(digits || ''))
}

/**
 * 발송 제외 회원 — 서버 환경변수 ALIMTALK_EXCLUDE_USER_IDS(쉼표 구분 user_id)를 읽은 값.
 * 실제 값은 코드에 적지 않는다.
 */
export function parseExcludeIds(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  )
}

/** 로그용: 끝 4자리만 남긴다 */
export function maskPhone(digits) {
  const s = String(digits || '')
  return s.length > 4 ? `${'*'.repeat(s.length - 4)}${s.slice(-4)}` : '****'
}

/**
 * 발송해도 되는지 판정. 솔라피 호출 전에 부른다.
 * @returns {{ ok: true } | { ok: false, status: 'skipped_excluded_user' | 'skipped_invalid_phone' }}
 */
export function alimtalkSkipReason({ userId, digits, excludeIds }) {
  const uid = String(userId || '').trim()
  if (uid && excludeIds.has(uid)) return { ok: false, status: 'skipped_excluded_user' }
  if (!isKoreanMobile(digits)) return { ok: false, status: 'skipped_invalid_phone' }
  return { ok: true }
}
