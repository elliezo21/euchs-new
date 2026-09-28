// 회원 탈퇴 판정 단위 테스트 — node scripts/test-account-withdraw.mjs
import fs from 'fs'
import { evaluateWithdrawal, normalizeStatus, STATUS_ALIAS, IN_PROGRESS, NOT_BLOCKING, splitListing, CONFIRM_WORD } from '../api/_accountWithdraw.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}
const codes = r => r.blockers.map(b => b.code)
const clean = { isStaff: false, orders: [], profile: { balance: 0, held_balance: 0 }, withdrawRequests: [], depositRequests: [] }

// ── 1. 상태 표 = src/lib/orderPipeline.js STATUS_ALIAS_MAP ──
{
  const src = fs.readFileSync(new URL('../src/lib/orderPipeline.js', import.meta.url), 'utf8')
  const alias = new Function(`return ${/STATUS_ALIAS_MAP = (\{[\s\S]*?\n\});/.exec(src)[1]}`)()
  const statuses = new Function(`return ${/PIPELINE_STATUSES = (\[[\s\S]*?\n\]);/.exec(src)[1]}`)()
  eq('별칭 표가 orderPipeline과 같음', STATUS_ALIAS, alias)
  const keys = statuses.map(s => normalizeStatus(s.key)).sort()
  eq('파이프라인 상태(정규화)는 모두 진행 중 또는 막지 않음 둘 중 하나', keys.filter(k => !IN_PROGRESS.has(k) && !NOT_BLOCKING.has(k)), [])
  eq('결제 대기(2단계)~배송 중(8단계 국내 배송)이 진행 중', statuses.filter(s => s.code >= 2 && s.key !== 'delivered').map(s => normalizeStatus(s.key)).filter(k => !IN_PROGRESS.has(k)), [])
  eq('별칭 표의 모든 값(정규화)도 둘 중 하나', [...new Set(Object.values(alias))].filter(k => !IN_PROGRESS.has(k) && !NOT_BLOCKING.has(k)), [])
  eq('빈 상태 = 견적 대기', normalizeStatus(''), 'quote_pending')
}

// ── 2. 막지 않는 경우 ──
eq('아무것도 없으면 탈퇴 가능', evaluateWithdrawal(clean).ok, true)
eq('견적 대기·배송 완료·반려·환불 끝난 취소만 있으면 가능', evaluateWithdrawal({ ...clean, orders: [
  { order_number: 'A', status: 'quote_pending' }, { order_number: 'B', status: 'delivered' }, { order_number: 'C', status: 'completed' },
  { order_number: 'D', status: 'rejected' }, { order_number: 'E', status: 'cancelled', refund_completed: true }, { order_number: 'F', status: 'step_1' },
] }).ok, true)
eq('완료된 출금·충전 요청은 막지 않음', evaluateWithdrawal({ ...clean, withdrawRequests: [{ status: 'completed' }, { status: 'rejected' }], depositRequests: [{ status: 'approved' }] }).ok, true)
eq('예치금 문자열 "0"도 0', evaluateWithdrawal({ ...clean, profile: { balance: '0', held_balance: '0.00' } }).ok, true)
eq('회원 정보 행이 없으면 잔액 0으로 봄', evaluateWithdrawal({ ...clean, profile: null }).ok, true)

// ── 3. 막는 경우 ──
for (const s of ['quote_confirmed', 'pending_payment', 'payment_verified', 'purchasing', 'warehouse_in', 'arrival_checking', 'arrival_done', 'inspection_done', 'defect_found', 'shipping_ready', 'customs_clearance', 'domestic_shipping', 'step_8']) {
  eq(`진행 중 주문(${s}) → 막음`, codes(evaluateWithdrawal({ ...clean, orders: [{ order_number: 'X', status: s }] })), ['order_in_progress'])
}
eq('환불 대기(취소 + 환불 완료 표시 없음) → 막음', codes(evaluateWithdrawal({ ...clean, orders: [{ order_number: 'R', status: 'cancelled', refund_completed: false }] })), ['refund_pending'])
eq('환불 완료 칸이 비어 있어도 환불 대기', codes(evaluateWithdrawal({ ...clean, orders: [{ order_number: 'R', status: 'cancelled' }] })), ['refund_pending'])
{
  const r = evaluateWithdrawal({ ...clean, orders: [{ order_number: 'U1', status: 'weird_new_status' }] })
  eq('모르는 상태 값 → 진행 중으로 막음', codes(r), ['order_in_progress'])
  eq('모르는 상태 값을 알려 줌(로그용)', r.unknownStatuses, ['weird_new_status'])
}
eq('예치금 잔액 → 막음', codes(evaluateWithdrawal({ ...clean, profile: { balance: 1000, held_balance: 0 } })), ['balance_left'])
eq('출금 대기 금액 → 막음', codes(evaluateWithdrawal({ ...clean, profile: { balance: 0, held_balance: 500 } })), ['balance_left'])
eq('잔액이 숫자가 아니면 → 막음(모르면 지우지 않음)', codes(evaluateWithdrawal({ ...clean, profile: { balance: 'abc', held_balance: 0 } })), ['balance_left'])
eq('출금 요청 처리 중 → 막음', codes(evaluateWithdrawal({ ...clean, withdrawRequests: [{ status: 'pending' }] })), ['withdraw_pending'])
eq('충전 요청 처리 중 → 막음', codes(evaluateWithdrawal({ ...clean, depositRequests: [{ status: 'pending' }] })), ['deposit_pending'])
eq('관리자·스태프 → 막음', codes(evaluateWithdrawal({ ...clean, isStaff: true })), ['staff_account'])
{
  const r = evaluateWithdrawal({ isStaff: true, orders: [{ order_number: 'P1', status: 'purchasing' }, { order_number: 'P2', status: 'customs' }, { order_number: 'C1', status: 'cancelled' }],
    profile: { balance: 10, held_balance: 0 }, withdrawRequests: [{ status: 'pending' }], depositRequests: [{ status: 'pending' }] })
  eq('여러 이유를 모두 알려 줌', codes(r), ['staff_account', 'order_in_progress', 'refund_pending', 'balance_left', 'withdraw_pending', 'deposit_pending'])
  eq('진행 중 주문번호·개수', [r.blockers[1].count, r.blockers[1].orders], [2, ['P1', 'P2']])
  eq('모든 이유에 쉬운 안내 문구', r.blockers.every(b => typeof b.message === 'string' && b.message.length > 5), true)
}

// ── 4. Storage 목록 나누기 ──
eq('파일(id 있음)과 폴더(id 없음)', splitListing('u1', [{ name: 'p1', id: null }, { name: 'a.jpg', id: 'x' }, { name: '', id: 'y' }, null]), { files: ['u1/a.jpg'], folders: ['u1/p1'] })
eq('확인 문구', CONFIRM_WORD, '탈퇴합니다')

console.log(`\n${pass} 통과 · ${fail} 실패`)
process.exit(fail ? 1 : 0)
