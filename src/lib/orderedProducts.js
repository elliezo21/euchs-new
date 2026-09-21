/**
 * EUCHS 내상품리스트 > "주문한 상품(재주문)" 데이터 계층
 *
 * 클라이언트 집계 방식(C안). DB 뷰·RPC·마이그레이션 없이 orders 테이블을
 * 본인 행만 읽어서 items JSONB 배열을 itemId 기준으로 묶는다.
 *
 * ── 보안 전제 ───────────────────────────────────────────────────
 *   orders RLS는 admin/staff에게 전체 주문 SELECT를 허용한다.
 *   따라서 .eq('user_id', uid)는 어떤 경우에도 생략하면 안 된다.
 *   (생략 시 관리자 계정 화면에 타 고객 주문이 섞인다)
 *
 * ── 세션 전제 ───────────────────────────────────────────────────
 *   savedProducts.hasSupabaseSession()으로 Supabase Auth 세션(JWT) 유무를
 *   판별해, 세션이 없으면 DB를 호출하지 않고 { blocked: true }를 반환한다.
 *
 *   ※ 2026-09-21 정정: 이 가드는 원래 "adminSignIn은 Supabase 세션을 만들지
 *     않는다"는 전제로 작성됐으나 사실과 다르다. adminSignIn은
 *     supabase.auth.signInWithPassword로 관리자 본인 세션을 만든다(auth.js).
 *     따라서 관리자 화면에서 이 탭은 blocked가 아니라 관리자 uid 기준
 *     본인 주문을 보여준다 — 정상 동작이다.
 *     가드는 세션 만료·스토리지 차단 등 "세션이 진짜 없는" 경우의 방어로 유지한다.
 *
 * ── 실패 처리 원칙 ──────────────────────────────────────────────
 *   조회 실패는 삼키지 않고 throw 한다. 호출부가 에러 UI를 띄운다.
 */
import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase'
import { currentUser } from '@/lib/auth'
import { hasSupabaseSession } from '@/lib/savedProducts'
import { normalizeOrderStatus, getOrderStatusItem } from '@/lib/orderPipeline'

/** 관리자 세션(Supabase JWT 없음) 안내 문구 — 화면에 그대로 노출된다. */
export const ADMIN_SESSION_MESSAGE =
  '관리자 계정에서는 고객 주문 상품을 표시하지 않습니다. 일반 회원 계정으로 로그인해 주세요.'

/**
 * 집계에서 제외할 상태 (normalizeOrderStatus 통과 후 기준).
 * orderPipeline.PIPELINE_STATUSES에서 code=0인 두 개가 전부다.
 */
const EXCLUDED_STATUSES = new Set(['cancelled', 'rejected'])

/**
 * "실제 진행된 주문"으로 인정하는 최소 파이프라인 code.
 * 3 = payment_verified(입금/결제 확인). 1(견적대기)·2(결제대기)는
 * 아직 결제 전이라 재주문 이력으로 보기 어려워 제외한다.
 */
const MIN_PROGRESS_CODE = 3

/** 1688 발주번호가 하나라도 기록된 주문인지 (items[].purchaseNo) */
function hasAnyPurchaseNo(items) {
  return items.some((it) => String(it?.purchaseNo || '').trim() !== '')
}

/**
 * 주문 행 하나가 "실제 진행된 주문"인지 판정.
 *
 * 블랙리스트(취소·반려) 우선 제외 → code >= 3 이면 포함 →
 * 그 외에는 purchaseNo가 찍힌 주문만 포함(상태 갱신이 누락된 주문 구제).
 */
export function isProgressedOrder(row) {
  const normalized = normalizeOrderStatus(row?.status)
  if (EXCLUDED_STATUSES.has(normalized)) return false

  const items = Array.isArray(row?.items) ? row.items : []
  const code = getOrderStatusItem(normalized).code || 0
  if (code >= MIN_PROGRESS_CODE) return true
  return hasAnyPurchaseNo(items)
}

/**
 * 본인 주문 이력을 itemId 기준으로 집계한다.
 *
 * @returns {Promise<{ blocked: boolean, items: Array<{
 *   rank: number,
 *   itemId: string,
 *   orderCount: number,
 *   lastOrderedAt: string,
 *   lastUnitPrice: number|null,
 *   lastUnitPriceVaries: boolean,
 *   imageUrl: string,
 *   title: string,
 *   productUrl: string
 * }> }>}
 * @throws {Error} Supabase 조회 실패 / 세션 불명 시
 */
export async function fetchOrderedProducts() {
  if (!isSupabaseConfigured()) {
    throw new Error('주문 조회를 사용할 수 없습니다 (Supabase 설정 없음).')
  }

  // 관리자 토큰 경로·세션 만료: DB를 호출하지 않고 차단 상태로 반환
  if (!(await hasSupabaseSession())) {
    return { blocked: true, items: [] }
  }

  const uid = currentUser.value?.id
  if (!uid || !isValidUUID(uid)) {
    throw new Error('로그인 세션을 확인할 수 없습니다. 다시 로그인한 후 시도해 주세요.')
  }

  // select('*') 금지 — 집계에 필요한 4개 컬럼만 읽는다.
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, created_at, items')
    .eq('user_id', uid)                                 // ★ RLS 보강: 절대 생략 금지
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[orderedProducts] orders 조회 실패:', error.code, error.message)
    throw new Error(`주문 이력 조회 실패: ${error.message}`)
  }

  const rows = Array.isArray(data) ? data : []
  // created_at 내림차순이므로 itemId를 처음 만나는 주문이 곧 "가장 최근 주문"이다.
  const agg = new Map()

  for (const row of rows) {
    if (!isProgressedOrder(row)) continue
    const items = Array.isArray(row.items) ? row.items : []

    // 한 주문 안에서 같은 itemId가 옵션별로 여러 줄일 수 있다 → 주문 단위로 1회만 센다.
    const seenInThisOrder = new Set()

    for (const it of items) {
      const itemId = String(it?.itemId || '').trim()
      if (!itemId) continue

      if (!agg.has(itemId)) {
        // 첫 등장 = 가장 최근 주문 → 대표값(단가/이미지/제목/주문일)을 여기서 확정한다.
        const sameIdRows = items.filter((r) => String(r?.itemId || '').trim() === itemId)
        const prices = sameIdRows
          .map((r) => Number(r?.priceCny))
          .filter((n) => Number.isFinite(n) && n > 0)
        const firstPrice = prices.length > 0 ? prices[0] : null

        agg.set(itemId, {
          itemId,
          orderCount: 0,
          lastOrderedAt: row.created_at || null,
          // 옵션별 단가가 다를 수 있어 "가장 최근 주문의 첫 번째 옵션 줄" 단가를 대표값으로 쓴다.
          lastUnitPrice: firstPrice,
          lastUnitPriceVaries: prices.length > 1 && new Set(prices).size > 1,
          imageUrl: String(it?.imageUrl || ''),
          title: String(it?.titleKo || ''),
          productUrl: String(it?.productUrl || ''),
        })
      }

      if (!seenInThisOrder.has(itemId)) {
        seenInThisOrder.add(itemId)
        agg.get(itemId).orderCount += 1
      }
    }
  }

  const list = Array.from(agg.values()).sort((a, b) => {
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount
    return new Date(b.lastOrderedAt || 0) - new Date(a.lastOrderedAt || 0)
  })

  list.forEach((entry, idx) => { entry.rank = idx + 1 })

  return { blocked: false, items: list }
}
