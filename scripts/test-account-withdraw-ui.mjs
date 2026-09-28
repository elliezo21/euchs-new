// 회원 탈퇴 화면 문구·상태 단위 테스트 — node scripts/test-account-withdraw-ui.mjs
import fs from 'fs'
import { CONFIRM_WORD, blockerHelp, checkState, withdrawState, errorMessage } from '../src/lib/accountWithdrawUi.js'
import { CONFIRM_WORD as SERVER_CONFIRM, evaluateWithdrawal } from '../api/_accountWithdraw.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}

eq('확인 문구 = 서버 확인 문구', CONFIRM_WORD, SERVER_CONFIRM)

// 서버가 낼 수 있는 모든 막는 이유에 해결 방법이 있다
{
  const all = evaluateWithdrawal({
    isStaff: true,
    orders: [{ order_number: 'A', status: 'purchasing' }, { order_number: 'B', status: 'cancelled' }],
    profile: { balance: 1000, held_balance: 0 },
    withdrawRequests: [{ status: 'pending' }],
    depositRequests: [{ status: 'pending' }],
  })
  eq('서버 막는 이유 6종', all.blockers.map(b => b.code), ['staff_account', 'order_in_progress', 'refund_pending', 'balance_left', 'withdraw_pending', 'deposit_pending'])
  eq('모든 막는 이유에 해결 방법 문구', all.blockers.filter(b => !blockerHelp(b.code)?.help).map(b => b.code), [])
  eq('판정 응답 → blocked', checkState({ status: 200, body: { ok: false, blockers: all.blockers } }).state, 'blocked')
}
eq('모르는 이유 = 해결 방법 없음(서버 문구 + 고객센터만)', blockerHelp('new_code'), null)
eq('이동 버튼: 주문 목록', blockerHelp('order_in_progress').action, { type: 'route', to: '/dashboard/orders', label: '주문 목록 보기' })
eq('이동 버튼: 예치금 탭', blockerHelp('balance_left').action.tab, 'deposit')

// 이동 경로가 실제 라우터에 있다
{
  const router = fs.readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8')
  for (const code of ['order_in_progress', 'refund_pending']) {
    const to = blockerHelp(code).action.to.replace('/dashboard/', '')
    eq(`라우터에 ${to} 있음`, new RegExp(`path: '${to}'`).test(router), true)
  }
  const view = fs.readFileSync(new URL('../src/views/dashboard/AccountSettingsView.vue', import.meta.url), 'utf8')
  eq('계정 설정에 deposit 탭 있음', view.includes("activeTab === 'deposit'"), true)
}

// 판정 응답
eq('가능', checkState({ status: 200, body: { ok: true, blockers: [] } }), { state: 'ok', blockers: [], message: '' })
eq('ok인데 blockers가 있으면 이상 → error', checkState({ status: 200, body: { ok: true, blockers: [{ code: 'x' }] } }).state, 'error')
eq('ok:false인데 blockers가 비었으면 이상 → error', checkState({ status: 200, body: { ok: false, blockers: [] } }).state, 'error')
eq('401 → 다시 로그인 안내', checkState({ status: 401, body: { ok: false, code: 'unauthorized' } }).message, '로그인이 끝났어요. 다시 로그인한 뒤 시도해 주세요.')
eq('500 서버 문구 그대로', checkState({ status: 500, body: { ok: false, code: 'internal', message: '처리 중 오류가 발생했습니다.' } }).message, '처리 중 오류가 발생했습니다.')
eq('응답 없음 → 기본 문구', checkState(null).state, 'error')
eq('기본 문구에 고객센터 번호', errorMessage(null).includes('010-9373-1214'), true)

// 실행 응답
eq('성공', withdrawState({ status: 200, body: { ok: true } }).state, 'done')
eq('그 사이 막힘(409) → blocked', withdrawState({ status: 409, body: { ok: false, code: 'blocked', blockers: [{ code: 'balance_left', message: 'm', count: 1 }] } }).state, 'blocked')
eq('SQL 없음(503) → 서버 문구', withdrawState({ status: 503, body: { ok: false, code: 'withdraw_sql_missing', message: '탈퇴 기능을 준비하고 있어요.' } }).message, '탈퇴 기능을 준비하고 있어요.')
eq('확인 문구 틀림(400) → error', withdrawState({ status: 400, body: { ok: false, code: 'confirm_required', message: 'x' } }).state, 'error')
eq('200인데 ok 아님 → error', withdrawState({ status: 200, body: { ok: false } }).state, 'error')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
