/**
 * 관리자 정산 화면(AdminSettlementView) 기간 합계 계산 — 순수 함수만.
 * 테스트: node scripts/test-settlement-stats.mjs
 *
 * 데이터 출처 (2026-09-29 DB 실측 기준)
 * - 1차·2차 결제, 환불, 수동 조정: transactions
 *   · 1차(process_first_payment)와 2차(process_second_payment)는 둘 다 type 'order_payment'로 기록되고
 *     description 앞부분만 다르다 → 아래 두 머리말로 나눈다. 둘 다 아니면 '분류 안 됨'으로 따로 센다.
 * - 입금(충전): deposit_requests status 'approved' (approved_at 기준)
 *   · transactions 'deposit'은 8월 말~9월 초 승인 3건이 빠져 있고 1건이 중복이라 쓰지 않는다.
 * - 출금: withdraw_requests status 'completed' (processed_at 기준)
 * - 관리자 계정(profiles.role) 거래는 고객 합계에서 뺀다 — 화면의 "총 보관 예치금 잔액"과 같은 목록.
 * - 기간은 한국 시간(KST) 달력 기준. 끝은 포함하지 않는다(start ≤ t < end).
 */

export const ADMIN_ROLES = ['super_admin', 'admin', 'staff', 'master']

// DB 함수가 쓰는 description 머리말 (process_first_payment / process_second_payment)
export const FIRST_PAYMENT_PREFIX = '1688 1차 상품대금 결제'
export const SECOND_PAYMENT_PREFIX = '2차 운임·부가서비스 결제'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** KST 달력 y년 m월(0~11) 1일 0시의 UTC ms. m이 범위를 넘으면 Date.UTC가 연도를 넘겨 준다. */
export function kstMonthStart(y, m) {
  return Date.UTC(y, m, 1) - KST_OFFSET_MS
}

/** UTC ms → KST 달력 { y, m(0~11), d } */
export function kstParts(ms) {
  const d = new Date(ms + KST_OFFSET_MS)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }
}

/** UTC ms → KST 'YYYY-MM-DD' */
export function kstDateString(ms) {
  const { y, m, d } = kstParts(ms)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDateInput(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''))
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3])
  const ms = Date.UTC(y, mo, d)
  const back = new Date(ms)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo || back.getUTCDate() !== d) return null
  return { y, mo, d }
}

/**
 * 기간 → { start, end } (UTC ms, end 미포함). 잘못된 직접 기간이면 null.
 * kind: 'this_month' | 'last_month' | 'custom'
 * custom: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } — 두 날짜 모두 포함
 */
export function periodRange(kind, nowMs, custom) {
  const { y, m } = kstParts(nowMs)
  if (kind === 'this_month') return { start: kstMonthStart(y, m), end: kstMonthStart(y, m + 1) }
  if (kind === 'last_month') return { start: kstMonthStart(y, m - 1), end: kstMonthStart(y, m) }
  if (kind === 'custom') {
    const f = parseDateInput(custom?.from)
    const t = parseDateInput(custom?.to)
    if (!f || !t) return null
    const start = Date.UTC(f.y, f.mo, f.d) - KST_OFFSET_MS
    const end = Date.UTC(t.y, t.mo, t.d + 1) - KST_OFFSET_MS
    if (end <= start) return null
    return { start, end }
  }
  return null
}

/** 최근 count개월(이번 달 포함, 최신 달 먼저) → [{ key: 'YYYY-MM', start, end }] */
export function recentMonths(nowMs, count = 6) {
  const { y, m } = kstParts(nowMs)
  const out = []
  for (let i = 0; i < count; i++) {
    const start = kstMonthStart(y, m - i)
    const p = kstParts(start)
    out.push({ key: `${p.y}-${String(p.m + 1).padStart(2, '0')}`, start, end: kstMonthStart(y, m - i + 1) })
  }
  return out
}

/** transactions 한 줄 → 합계 칸 이름. 합계에 넣지 않는 종류는 null. */
export function classifyTransaction(tx) {
  const type = tx?.type
  if (type === 'order_payment') {
    const desc = String(tx.description || '')
    if (desc.startsWith(FIRST_PAYMENT_PREFIX)) return 'first'
    if (desc.startsWith(SECOND_PAYMENT_PREFIX)) return 'second'
    return 'unclassified'
  }
  if (type === 'refund') return 'refund'
  if (type === 'manual_add' || type === 'manual_sub') return 'manual'
  return null
}

/** 관리자 계정 id 집합 (profiles: [{ id, role }]) */
export function adminIdSet(profiles) {
  return new Set((profiles || []).filter(p => ADMIN_ROLES.includes(p.role)).map(p => p.id))
}

function inRange(iso, start, end) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t >= start && t < end
}

function emptyBucket() {
  return { amount: 0, count: 0 }
}

/**
 * 기간 합계. 금액은 모두 양수(결제·출금은 나간 돈의 크기), 수동 조정만 부호 있는 순액.
 * @returns {{ first, second, unclassified, refund, manual, deposit, withdrawal }} 각 { amount, count }
 */
export function summarize({ transactions, deposits, withdrawals, adminIds, start, end }) {
  const out = {
    first: emptyBucket(), second: emptyBucket(), unclassified: emptyBucket(),
    refund: emptyBucket(), manual: emptyBucket(),
    deposit: emptyBucket(), withdrawal: emptyBucket(),
  }
  const isAdmin = uid => uid != null && adminIds.has(uid)

  for (const tx of transactions || []) {
    if (isAdmin(tx.user_id) || !inRange(tx.created_at, start, end)) continue
    const kind = classifyTransaction(tx)
    if (!kind) continue
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) continue
    // 결제는 음수로 기록된다 → 나간 금액의 크기로 합산
    out[kind].amount += (kind === 'refund' || kind === 'manual') ? amt : -amt
    out[kind].count += 1
  }
  for (const d of deposits || []) {
    if (d.status !== 'approved' || isAdmin(d.user_id) || !inRange(d.approved_at, start, end)) continue
    const amt = Number(d.amount)
    if (!Number.isFinite(amt)) continue
    out.deposit.amount += amt
    out.deposit.count += 1
  }
  for (const w of withdrawals || []) {
    if (w.status !== 'completed' || isAdmin(w.user_id) || !inRange(w.processed_at, start, end)) continue
    const amt = Number(w.amount)
    if (!Number.isFinite(amt)) continue
    out.withdrawal.amount += amt
    out.withdrawal.count += 1
  }
  return out
}
