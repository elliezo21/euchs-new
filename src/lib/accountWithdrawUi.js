/**
 * 회원 탈퇴 화면 문구·해결 방법 (판정 자체는 서버 api/_accountWithdraw.js evaluateWithdrawal).
 * 화면: src/components/dashboard/WithdrawAccountModal.vue / 테스트: scripts/test-account-withdraw-ui.mjs
 */

export const CONFIRM_WORD = '탈퇴합니다' // api/_accountWithdraw.js CONFIRM_WORD와 같아야 한다(테스트가 대조)
export const SUPPORT_PHONE = '010-9373-1214'
export const SUPPORT_KAKAO = 'https://pf.kakao.com/_xmQWsK/chat'

/**
 * 막는 이유별 해결 방법. action이 있으면 화면에 버튼으로 보인다.
 *   { type:'route', to } = 그 화면으로 이동 / { type:'tab', tab } = 계정 설정의 그 탭으로
 * 서버가 새 code를 보내면 help = null → 화면은 서버 message + 고객센터 안내만 보인다.
 */
const HELP = {
  staff_account: { help: '관리자·스태프 권한을 먼저 정리해야 해요. 대표에게 요청해 주세요.', action: null },
  order_in_progress: { help: '배송이 끝나면 탈퇴할 수 있어요. 주문을 취소하고 싶으면 고객센터로 알려 주세요.', action: { type: 'route', to: '/dashboard/orders', label: '주문 목록 보기' } },
  refund_pending: { help: '환불이 끝나면 탈퇴할 수 있어요. 환불 진행 상황은 고객센터에서 알려 드려요.', action: { type: 'route', to: '/dashboard/cancelled', label: '취소 주문 보기' } },
  balance_left: { help: '예치금을 모두 출금한 뒤 탈퇴할 수 있어요.', action: { type: 'tab', tab: 'deposit', label: '예치금 출금하러 가기' } },
  withdraw_pending: { help: '출금이 끝나면 탈퇴할 수 있어요. 급하면 고객센터로 알려 주세요.', action: { type: 'tab', tab: 'deposit', label: '출금 요청 보기' } },
  deposit_pending: { help: '충전 확인이 끝나면 탈퇴할 수 있어요. 급하면 고객센터로 알려 주세요.', action: { type: 'tab', tab: 'deposit', label: '충전 요청 보기' } },
}

/** @returns {{ help:string, action:object|null }|null} */
export function blockerHelp(code) {
  return HELP[code] || null
}

/**
 * 판정(check) 응답 → 화면 상태
 * @param {{ status:number, body:any }} res
 * @returns {{ state:'ok'|'blocked'|'error', blockers:any[], message:string }}
 */
export function checkState(res) {
  const body = res?.body
  if (res?.status === 200 && body && typeof body.ok === 'boolean') {
    const blockers = Array.isArray(body.blockers) ? body.blockers : []
    if (body.ok && blockers.length === 0) return { state: 'ok', blockers: [], message: '' }
    if (!body.ok && blockers.length > 0) return { state: 'blocked', blockers, message: '' }
  }
  return { state: 'error', blockers: [], message: errorMessage(res) }
}

/**
 * 실행(withdraw) 응답 → 화면 상태
 * @returns {{ state:'done'|'blocked'|'error', blockers:any[], message:string }}
 */
export function withdrawState(res) {
  const body = res?.body
  if (res?.status === 200 && body?.ok === true) return { state: 'done', blockers: [], message: '' }
  if (body?.code === 'blocked' && Array.isArray(body.blockers) && body.blockers.length) {
    return { state: 'blocked', blockers: body.blockers, message: '' }
  }
  return { state: 'error', blockers: [], message: errorMessage(res) }
}

/** 오류 응답 → 고객에게 보일 한 줄 (서버 message 우선, 없으면 상태별 기본 문구) */
export function errorMessage(res) {
  const body = res?.body
  if (res?.status === 401 || body?.code === 'unauthorized') return '로그인이 끝났어요. 다시 로그인한 뒤 시도해 주세요.'
  if (body && typeof body.message === 'string' && body.message) return body.message
  return `탈퇴 확인 중 문제가 생겼어요. 잠시 후 다시 시도하거나 고객센터(${SUPPORT_PHONE})로 알려 주세요.`
}
