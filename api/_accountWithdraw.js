/**
 * 회원 탈퇴 — 판정(순수 함수)과 경로 도우미. 흐름은 api/account-withdraw.js.
 * 파일명이 _로 시작하므로 Vercel 라우트로 노출되지 않는다.
 *
 * 탈퇴를 막는 경우 (evaluateWithdrawal):
 *   staff_account     관리자·스태프 계정 — 권한 정리가 먼저라 화면 탈퇴를 막는다
 *   order_in_progress 결제 대기(quote_confirmed) ~ 국내 배송 중(domestic_shipping)인 주문
 *                     상태 값은 src/lib/orderPipeline.js STATUS_ALIAS_MAP과 같다(test-account-withdraw.mjs가 대조).
 *                     표에 없는 상태 값은 진행 중으로 본다(모르는 값으로 기록이 지워지지 않게 — 원인 로그는 호출부)
 *   refund_pending    취소됐지만 환불 완료 표시가 없는 주문 (orderPipeline getOrderSummary의 refund_pending과 같은 기준.
 *                     결제 없이 취소된 주문은 관리자가 [환불 없이 종결]로 닫는다)
 *   balance_left      예치금 잔액 또는 출금 대기 금액이 남음
 *   withdraw_pending  예치금 출금 요청 처리 중
 *   deposit_pending   예치금 충전(입금 확인) 요청 처리 중
 * 견적 대기(quote_pending)·배송 완료(delivered)·반려(rejected)·환불 끝난 취소 주문은 막지 않는다.
 */

// 결제 대기 ~ 배송 중 (정규화한 값 기준)
export const IN_PROGRESS = new Set([
  'quote_confirmed', 'payment_verified', 'purchasing', 'warehouse_in', 'arrival_done',
  'inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping',
])
export const NOT_BLOCKING = new Set(['quote_pending', 'delivered', 'rejected', 'cancelled'])

// src/lib/orderPipeline.js STATUS_ALIAS_MAP과 같은 표 (서버는 src를 불러오지 않는다 — 테스트가 두 표를 대조)
export const STATUS_ALIAS = {
  pending: 'quote_pending', quote_request: 'quote_pending', quote_pending: 'quote_pending',
  consulting: 'quote_confirmed', pending_payment: 'quote_confirmed', quoted: 'quote_confirmed', quote_confirmed: 'quote_confirmed',
  payment_verified: 'payment_verified', paid: 'payment_verified', first_payment_done: 'payment_verified',
  purchasing: 'purchasing', purchasing_agent: 'purchasing',
  in_warehouse: 'warehouse_in', warehouse_in: 'warehouse_in', inbound_weighed: 'warehouse_in',
  arrival_checking: 'warehouse_in', arrival_done: 'arrival_done',
  inspection_done: 'inspection_done', inspecting: 'inspection_done', inspected: 'inspection_done', passed: 'inspection_done', defect_found: 'inspection_done',
  shipping_ready: 'shipping_ready', ready_to_ship: 'shipping_ready',
  customs: 'customs_clearance', customs_clearance: 'customs_clearance',
  domestic_delivery: 'domestic_shipping', domestic_shipping: 'domestic_shipping',
  completed: 'delivered', delivered: 'delivered',
  cancelled: 'cancelled', rejected: 'rejected',
  step_1: 'quote_pending', step_2: 'quote_confirmed', step_3: 'payment_verified', step_4: 'purchasing',
  step_5: 'warehouse_in', step_6: 'shipping_ready', step_7: 'customs_clearance', step_8: 'domestic_shipping',
}

/** orderPipeline.normalizeOrderStatus와 같음 (빈 값 = 견적 대기) */
export function normalizeStatus(status) {
  if (!status) return 'quote_pending'
  return STATUS_ALIAS[status] || status
}

const MESSAGES = {
  staff_account: '관리자·스태프 계정은 여기서 탈퇴할 수 없어요. 권한 정리 후 대표에게 요청해 주세요.',
  order_in_progress: '진행 중인 주문이 있어요. 배송이 끝난 뒤 탈퇴할 수 있어요.',
  refund_pending: '환불 처리 중인 주문이 있어요. 환불이 끝난 뒤 탈퇴할 수 있어요.',
  balance_left: '예치금이 남아 있어요. 먼저 예치금을 출금해 주세요.',
  withdraw_pending: '예치금 출금 요청을 처리하고 있어요. 처리가 끝난 뒤 탈퇴할 수 있어요.',
  deposit_pending: '예치금 충전 요청을 확인하고 있어요. 처리가 끝난 뒤 탈퇴할 수 있어요.',
}

/**
 * @param {{ isStaff:boolean, orders:{order_number?:string,status?:string,refund_completed?:boolean}[],
 *           profile:{balance?:number|string,held_balance?:number|string}|null,
 *           withdrawRequests:{status?:string}[], depositRequests:{status?:string}[] }} input
 * @returns {{ ok:boolean, blockers:{ code:string, message:string, count:number, orders?:string[] }[], unknownStatuses:string[] }}
 */
export function evaluateWithdrawal({ isStaff, orders = [], profile = null, withdrawRequests = [], depositRequests = [] }) {
  const blockers = []
  const unknownStatuses = []
  if (isStaff) blockers.push({ code: 'staff_account', message: MESSAGES.staff_account, count: 1 })

  const inProgress = []
  const refundPending = []
  for (const o of orders) {
    const s = normalizeStatus(o?.status)
    if (IN_PROGRESS.has(s)) inProgress.push(o)
    else if (s === 'cancelled') { if (o?.refund_completed !== true) refundPending.push(o) }
    else if (!NOT_BLOCKING.has(s)) { inProgress.push(o); unknownStatuses.push(String(o?.status)) }
  }
  const nums = list => list.map(o => o?.order_number).filter(Boolean).slice(0, 10)
  if (inProgress.length) blockers.push({ code: 'order_in_progress', message: MESSAGES.order_in_progress, count: inProgress.length, orders: nums(inProgress) })
  if (refundPending.length) blockers.push({ code: 'refund_pending', message: MESSAGES.refund_pending, count: refundPending.length, orders: nums(refundPending) })

  const balance = Number(profile?.balance ?? 0)
  const held = Number(profile?.held_balance ?? 0)
  if (!(balance === 0 && held === 0)) blockers.push({ code: 'balance_left', message: MESSAGES.balance_left, count: 1 })

  const wp = withdrawRequests.filter(r => r?.status === 'pending').length
  if (wp) blockers.push({ code: 'withdraw_pending', message: MESSAGES.withdraw_pending, count: wp })
  const dp = depositRequests.filter(r => r?.status === 'pending').length
  if (dp) blockers.push({ code: 'deposit_pending', message: MESSAGES.deposit_pending, count: dp })

  return { ok: blockers.length === 0, blockers, unknownStatuses }
}

/** 탈퇴 확인 문구 — 화면에서 사용자가 그대로 입력해야 진행 */
export const CONFIRM_WORD = '탈퇴합니다'

/** Storage 목록 응답에서 파일(id 있음)과 폴더(id 없음)를 나눈다 */
export function splitListing(prefix, rows) {
  const files = []
  const folders = []
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r.name !== 'string' || !r.name) continue
    const full = `${prefix}/${r.name}`
    if (r.id) files.push(full)
    else folders.push(full)
  }
  return { files, folders }
}
