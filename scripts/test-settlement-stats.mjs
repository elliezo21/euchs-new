// 관리자 정산 기간 합계 단위 테스트 — node scripts/test-settlement-stats.mjs
import fs from 'fs'
import {
  ADMIN_ROLES, FIRST_PAYMENT_PREFIX, SECOND_PAYMENT_PREFIX,
  kstMonthStart, kstDateString, periodRange, recentMonths,
  classifyTransaction, adminIdSet, summarize
} from '../src/lib/settlementStats.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}
const iso = ms => new Date(ms).toISOString()

// ── 1. KST 달력 ──
// 2026-09-29 12:00 KST = 03:00 UTC
const NOW = Date.UTC(2026, 8, 29, 3, 0)
eq('9월 1일 0시 KST = 8월 31일 15시 UTC', iso(kstMonthStart(2026, 8)), '2026-08-31T15:00:00.000Z')
eq('이번 달', (({ start, end }) => [iso(start), iso(end)])(periodRange('this_month', NOW)), ['2026-08-31T15:00:00.000Z', '2026-09-30T15:00:00.000Z'])
eq('지난 달', (({ start, end }) => [iso(start), iso(end)])(periodRange('last_month', NOW)), ['2026-07-31T15:00:00.000Z', '2026-08-31T15:00:00.000Z'])
eq('1월의 지난 달 = 전년 12월', kstDateString(periodRange('last_month', Date.UTC(2027, 0, 10, 3)).start), '2026-12-01')
eq('UTC로는 8월 31일 16시여도 KST로는 9월 1일', kstDateString(Date.UTC(2026, 7, 31, 16)), '2026-09-01')
eq('직접 기간 — 끝 날짜 포함', (({ start, end }) => [iso(start), iso(end)])(periodRange('custom', NOW, { from: '2026-09-10', to: '2026-09-12' })), ['2026-09-09T15:00:00.000Z', '2026-09-12T15:00:00.000Z'])
eq('직접 기간 — 하루짜리', periodRange('custom', NOW, { from: '2026-09-10', to: '2026-09-10' }) !== null, true)
eq('직접 기간 — 끝이 시작보다 빠르면 null', periodRange('custom', NOW, { from: '2026-09-12', to: '2026-09-10' }), null)
eq('직접 기간 — 비어 있으면 null', periodRange('custom', NOW, { from: '', to: '2026-09-10' }), null)
eq('직접 기간 — 없는 날짜면 null', periodRange('custom', NOW, { from: '2026-02-30', to: '2026-03-01' }), null)
eq('모르는 기간 종류 = null', periodRange('year', NOW), null)
eq('최근 6개월 — 최신 먼저, 해 넘김', recentMonths(Date.UTC(2027, 1, 5, 3), 6).map(m => m.key), ['2027-02', '2027-01', '2026-12', '2026-11', '2026-10', '2026-09'])
{
  const ms = recentMonths(NOW, 6)
  eq('최근 6개월 — 달끼리 빈틈 없이 이어짐', ms.slice(1).every((m, i) => m.end === ms[i].start), true)
}

// ── 2. 분류 ──
eq('1차 결제', classifyTransaction({ type: 'order_payment', description: `${FIRST_PAYMENT_PREFIX} (EUC-1) | 1차` }), 'first')
eq('2차 결제', classifyTransaction({ type: 'order_payment', description: `${SECOND_PAYMENT_PREFIX} (EUC-1)` }), 'second')
eq('결제인데 머리말이 다르면 분류 안 됨', classifyTransaction({ type: 'order_payment', description: '기타 결제' }), 'unclassified')
eq('설명 없는 결제 = 분류 안 됨', classifyTransaction({ type: 'order_payment', description: null }), 'unclassified')
eq('환불', classifyTransaction({ type: 'refund' }), 'refund')
eq('수동 지급', classifyTransaction({ type: 'manual_add' }), 'manual')
eq('수동 차감', classifyTransaction({ type: 'manual_sub' }), 'manual')
eq('입금 거래는 합계에 안 씀(deposit_requests로 셈)', classifyTransaction({ type: 'deposit' }), null)
eq('출금 거래는 합계에 안 씀(withdraw_requests로 셈)', classifyTransaction({ type: 'withdrawal' }), null)

// DB 함수가 쓰는 머리말이 코드와 같은지 — 기존 로그 원문 기준(2026-09-29 실측)
eq('1차 머리말', FIRST_PAYMENT_PREFIX, '1688 1차 상품대금 결제')
eq('2차 머리말', SECOND_PAYMENT_PREFIX, '2차 운임·부가서비스 결제')

// ── 3. 관리자 제외 ──
eq('관리자 역할 목록 = 정산 화면 잔액 KPI와 같음', ADMIN_ROLES, ['super_admin', 'admin', 'staff', 'master'])
{
  const src = fs.readFileSync(new URL('../src/views/admin/AdminSettlementView.vue', import.meta.url), 'utf8')
  const m = /const ADMIN_ROLES = (\[[^\]]*\])/.exec(src)
  eq('AdminSettlementView 잔액 KPI의 ADMIN_ROLES와 같음', m && new Function(`return ${m[1]}`)(), ADMIN_ROLES)
  eq('정산 화면에 박힌 큰 숫자 ref 없음', /ref\(\d{5,}\)/.test(src), false)
  eq('가짜 신청·로그 상수 없음', /const DEFAULT_(REQUESTS|LOGS)\b/.test(src), false)
}
const admins = adminIdSet([{ id: 'A', role: 'super_admin' }, { id: 'S', role: 'staff' }, { id: 'U', role: 'user' }, { id: 'N', role: null }])
eq('관리자 id 집합', [...admins].sort(), ['A', 'S'])

// ── 4. 합계 ──
const r = periodRange('this_month', NOW)
const inside = iso(Date.UTC(2026, 8, 10))
const outside = iso(Date.UTC(2026, 7, 31, 14, 59)) // 8월 31일 23:59 KST — 지난 달
const tx = [
  { user_id: 'U', type: 'order_payment', amount: -100000, description: `${FIRST_PAYMENT_PREFIX} (A)`, created_at: inside },
  { user_id: 'U', type: 'order_payment', amount: '-50000', description: `${FIRST_PAYMENT_PREFIX} (B)`, created_at: inside },
  { user_id: 'U', type: 'order_payment', amount: -30000, description: `${SECOND_PAYMENT_PREFIX} (A)`, created_at: inside },
  { user_id: 'U', type: 'order_payment', amount: -7000, description: '알 수 없는 결제', created_at: inside },
  { user_id: 'U', type: 'refund', amount: 20000, created_at: inside },
  { user_id: 'U', type: 'manual_add', amount: 5000, created_at: inside },
  { user_id: 'U', type: 'manual_sub', amount: -8000, created_at: inside },
  { user_id: 'U', type: 'deposit', amount: 999999, created_at: inside },
  { user_id: 'A', type: 'order_payment', amount: -1000000, description: `${FIRST_PAYMENT_PREFIX} (관리자)`, created_at: inside },
  { user_id: 'U', type: 'order_payment', amount: -400000, description: `${FIRST_PAYMENT_PREFIX} (지난달)`, created_at: outside },
  { user_id: 'U', type: 'order_payment', amount: 'abc', description: `${FIRST_PAYMENT_PREFIX} (숫자 아님)`, created_at: inside },
]
const deposits = [
  { user_id: 'U', status: 'approved', amount: 1000000, approved_at: inside },
  { user_id: 'A', status: 'approved', amount: 5000000, approved_at: inside },
  { user_id: 'U', status: 'rejected', amount: 777, approved_at: inside },
  { user_id: 'U', status: 'approved', amount: 3000000, approved_at: outside },
  { user_id: 'U', status: 'approved', amount: 1, approved_at: null },
]
const withdrawals = [
  { user_id: 'U', status: 'completed', amount: 40000, processed_at: inside },
  { user_id: 'U', status: 'rejected', amount: 10000, processed_at: inside },
]
const s = summarize({ transactions: tx, deposits, withdrawals, adminIds: admins, ...r })
eq('1차 = 이번 달 고객 1차 결제 합(양수)', s.first, { amount: 150000, count: 2 })
eq('2차', s.second, { amount: 30000, count: 1 })
eq('분류 안 됨은 따로', s.unclassified, { amount: 7000, count: 1 })
eq('환불', s.refund, { amount: 20000, count: 1 })
eq('수동 조정 순액 = 지급 − 차감', s.manual, { amount: -3000, count: 2 })
eq('입금 = 승인 건만·관리자 제외·기간 안', s.deposit, { amount: 1000000, count: 1 })
eq('출금 = 완료 건만', s.withdrawal, { amount: 40000, count: 1 })
{
  const last = summarize({ transactions: tx, deposits, withdrawals, adminIds: admins, ...periodRange('last_month', NOW) })
  eq('지난 달 경계(8/31 23:59 KST)는 지난 달에', [last.first.amount, last.deposit.amount], [400000, 3000000])
}
const empty = summarize({ transactions: [], deposits: [], withdrawals: [], adminIds: new Set(), ...r })
eq('데이터 없으면 전부 0', Object.values(empty).map(b => b.amount), [0, 0, 0, 0, 0, 0, 0])

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
