<template>
  <div class="space-y-6">

    <!-- Page Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
          <span>🗂 취소·반품·교환 현황</span>
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">주문서반려(폐기)·취소·환불 처리된 주문을 조회하고 환불완료를 기록합니다.</p>
      </div>
    </div>

    <!-- 요약 카드 4개 (환불대기 / 환불완료 / 반품완료 / 교환진행중) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      <!-- 카드 1: 환불대기 -->
      <button
        @click="activeTab = 'refund_pending'"
        type="button"
        class="rounded-2xl border-2 p-4 sm:p-5 text-left transition cursor-pointer"
        :class="activeTab === 'refund_pending'
          ? 'border-amber-500 bg-amber-50/80 shadow-md shadow-amber-100'
          : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-2xl">⏳</span>
          <span
            class="text-xs font-bold px-2 py-0.5 rounded-full"
            :class="activeTab === 'refund_pending' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'"
          >환불대기</span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-900">
          {{ refundPendingOrders.length }}<span class="text-sm sm:text-base font-bold text-slate-400 ml-1">건</span>
        </div>
        <div class="text-xs text-slate-500 mt-1 truncate">수동 환불 확인 필요</div>
      </button>

      <!-- 카드 2: 환불완료 -->
      <button
        @click="activeTab = 'refund_done'"
        type="button"
        class="rounded-2xl border-2 p-4 sm:p-5 text-left transition cursor-pointer"
        :class="activeTab === 'refund_done'
          ? 'border-emerald-500 bg-emerald-50/80 shadow-md shadow-emerald-100'
          : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-2xl">✅</span>
          <span
            class="text-xs font-bold px-2 py-0.5 rounded-full"
            :class="activeTab === 'refund_done' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'"
          >환불완료</span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-900">
          {{ refundDoneOrders.length }}<span class="text-sm sm:text-base font-bold text-slate-400 ml-1">건</span>
        </div>
        <div class="text-xs text-slate-500 mt-1 truncate">환불 처리 완료 건</div>
      </button>

      <!-- 카드 3: 반품완료 (0건 고정 — 미구현) -->
      <div
        class="rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-5 cursor-not-allowed opacity-60"
        title="반품 기능은 추후 별도 프로젝트에서 구현 예정입니다"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-2xl">↩️</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">반품완료</span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-400">0<span class="text-sm sm:text-base font-bold text-slate-300 ml-1">건</span></div>
        <div class="text-xs text-slate-400 mt-1 truncate">반품 기능 준비 중</div>
      </div>

      <!-- 카드 4: 교환진행중 (0건 고정 — 미구현) -->
      <div
        class="rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-5 cursor-not-allowed opacity-60"
        title="교환 기능은 추후 별도 프로젝트에서 구현 예정입니다"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-2xl">🔄</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">교환진행중</span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-400">0<span class="text-sm sm:text-base font-bold text-slate-300 ml-1">건</span></div>
        <div class="text-xs text-slate-400 mt-1 truncate">교환 기능 준비 중</div>
      </div>
    </div>

    <!-- 목록 영역 -->
    <div v-if="isLoading" class="flex items-center justify-center py-16 text-slate-400 text-sm">
      <span class="animate-spin mr-2">⏳</span> 불러오는 중…
    </div>

    <template v-else>
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">

        <!-- 탭 헤더 -->
        <div class="flex border-b border-slate-200 bg-slate-50">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="flex-1 px-4 py-3 text-xs font-bold transition border-b-2"
            :class="activeTab === tab.key
              ? (tab.key === 'refund_pending' ? 'border-amber-500 text-amber-700 bg-white' : tab.key === 'refund_done' ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-orange-500 text-orange-700 bg-white')
              : 'border-transparent text-slate-500 hover:text-slate-700'"
          >
            {{ tab.label }}
            <span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black"
              :class="activeTab === tab.key
                ? (tab.key === 'refund_pending' ? 'bg-amber-500 text-white' : tab.key === 'refund_done' ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white')
                : 'bg-slate-200 text-slate-600'"
            >{{ tab.count }}</span>
          </button>
        </div>

        <!-- 목록 테이블 -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-3 text-left font-bold text-slate-600">주문번호</th>
                <th class="px-4 py-3 text-left font-bold text-slate-600">바이어</th>
                <th class="px-4 py-3 text-left font-bold text-slate-600 hidden md:table-cell">상품</th>
                <th class="px-4 py-3 text-right font-bold text-slate-600">금액</th>
                <th class="px-4 py-3 text-center font-bold text-slate-600">상태</th>
                <th class="px-4 py-3 text-center font-bold text-slate-600">처리일시</th>
                <th v-if="activeTab === 'refund_pending'" class="px-4 py-3 text-right font-bold text-amber-700">환불예정금액</th>
                <th v-if="activeTab !== 'rejected'" class="px-4 py-3 text-center font-bold text-slate-600">환불완료</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="currentTabOrders.length === 0">
                <td :colspan="activeTab === 'refund_pending' ? 8 : activeTab !== 'rejected' ? 7 : 6" class="px-4 py-10 text-center text-slate-400">
                  해당 내역이 없습니다.
                </td>
              </tr>
              <tr
                v-for="order in currentTabOrders"
                :key="order.id || order.orderNumber"
                class="hover:bg-slate-50/60 transition"
              >
                <td class="px-4 py-3 font-mono font-bold text-slate-800">{{ order.orderNumber }}</td>
                <td class="px-4 py-3 text-slate-700">
                  {{ order.buyerInfo?.companyName || order.buyerInfo?.buyerName || order.buyerName || '-' }}
                </td>
                <td class="px-4 py-3 text-slate-600 hidden md:table-cell max-w-[160px] truncate">
                  {{ order.items?.[0]?.productName || '-' }}
                  <span v-if="order.items?.length > 1" class="text-slate-400"> 외 {{ order.items.length - 1 }}종</span>
                </td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">
                  ₩{{ fmtN(getOrderAmount(order)) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    :class="order.status === 'rejected'
                      ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-rose-100 text-rose-700 border-rose-200'"
                  >
                    {{ order.status === 'rejected' ? '주문서반려(폐기)' : '취소·환불' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center text-slate-500 font-mono">
                  {{ formatDate(order.updatedAt || order.createdAt) }}
                </td>
                <!-- 환불예정금액 — 환불대기 탭에만 표시 -->
                <td v-if="activeTab === 'refund_pending'" class="px-4 py-3 text-right">
                  <span class="font-mono font-bold text-amber-700 text-[11px]">
                    ₩{{ fmtN(getRefundAmount(order)) }}
                  </span>
                </td>
                <!-- 환불완료 버튼 — rejected 탭엔 없음 -->
                <td v-if="activeTab !== 'rejected'" class="px-4 py-3 text-center">
                  <button
                    v-if="!order.refundCompleted"
                    @click="markRefundDone(order)"
                    :disabled="markingIds.has(order.id || order.orderNumber)"
                    class="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-600 text-[10px] font-bold hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <template v-if="markingIds.has(order.id || order.orderNumber)">처리중…</template>
                    <template v-else>
                      환불완료 처리
                      <span v-if="activeTab === 'refund_pending'" class="ml-0.5 text-emerald-700">(₩{{ fmtN(getRefundAmount(order)) }})</span>
                    </template>
                  </button>
                  <span v-else class="inline-flex flex-col items-center gap-0.5 text-emerald-600 font-bold text-[10px]">
                    ✅ 환불완료
                    <span class="text-slate-400 font-mono text-[9px]">{{ formatDate(order.refundCompletedAt) }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 토스트 -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2.5"
        :class="toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'"
      >
        <span>{{ toast.type === 'success' ? '✅' : '❌' }}</span>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase'
import { fetchOrdersFromSupabase } from '@/utils/orderStorage'
import { normalizeOrderStatus } from '@/lib/orderPipeline'
import { calcOrderCost } from '@/utils/orderCostCalculator'
import { currentSettings, fetchSiteSettings } from '@/lib/settings'

const orders = ref([])
const isLoading = ref(true)
const activeTab = ref('refund_pending')
const markingIds = ref(new Set())
const toast = ref({ show: false, message: '', type: 'success' })
let toastTimer = null

async function loadOrders() {
  isLoading.value = true
  try {
    fetchSiteSettings()
    const result = await fetchOrdersFromSupabase({ isAdmin: true })
    orders.value = Array.isArray(result) ? result : []
  } catch (e) {
    console.error('[AdminCancelledView] loadOrders error:', e)
  } finally {
    isLoading.value = false
  }
}

const cancelledOrders = computed(() =>
  orders.value.filter(o => normalizeOrderStatus(o.status) === 'cancelled')
)
const rejectedOrders = computed(() =>
  orders.value.filter(o => normalizeOrderStatus(o.status) === 'rejected')
)
const refundPendingOrders = computed(() =>
  cancelledOrders.value.filter(o => !o.refundCompleted)
)
const refundDoneOrders = computed(() =>
  cancelledOrders.value.filter(o => o.refundCompleted === true)
)

const tabs = computed(() => [
  { key: 'refund_pending', label: '환불대기', count: refundPendingOrders.value.length },
  { key: 'refund_done',    label: '환불완료', count: refundDoneOrders.value.length },
  { key: 'rejected',       label: '주문서반려(폐기)', count: rejectedOrders.value.length },
])

const currentTabOrders = computed(() => {
  if (activeTab.value === 'refund_pending') return refundPendingOrders.value
  if (activeTab.value === 'refund_done')    return refundDoneOrders.value
  if (activeTab.value === 'rejected')       return rejectedOrders.value
  return []
})

/**
 * 표시용 주문 금액 (전체 금액 — 헤더 "금액" 컬럼용)
 */
function getOrderAmount(order) {
  if (!order) return 0
  const direct = Number(order.totalPriceKrw || order.total_price_krw || order.firstPayment?.firstPaymentKrw || 0)
  if (direct > 0) return direct
  try {
    const cost = calcOrderCost(order, {
      exchange_rate: currentSettings.value?.exchange_rate,
      agency_fee_rate: currentSettings.value?.agency_fee_rate,
      sea_cbm_rate: currentSettings.value?.sea_cbm_rate,
    })
    return cost.chargeableKrw || cost.itemTotalKrw || 0
  } catch (e) {
    return 0
  }
}

/**
 * 환불 기준 금액 — first_payment.firstPaymentKrw (결제확인 시점 확정 금액) 우선
 * 없으면 totalPriceKrw, total_price_krw 순으로 폴백
 */
function getRefundAmount(order) {
  if (!order) return 0
  return Number(
    order.firstPayment?.firstPaymentKrw ||
    order.totalPriceKrw ||
    order.total_price_krw ||
    0
  )
}

/**
 * 환불완료 처리 — process_refund RPC 원자적 처리
 *
 * 이중 환불 3중 방지:
 *   레이어 1(UI)   : refundCompleted=true 이면 버튼 비표시
 *   레이어 2(함수) : 진입 직전 refundCompleted 재확인
 *   레이어 3(DB)   : RPC 내부 FOR UPDATE + WHERE refund_completed=false
 */
async function markRefundDone(order) {
  const orderId   = order.id
  const orderNum  = order.orderNumber

  // ── 레이어 2: 함수 가드 ────────────────────────────────────────────────
  if (order.refundCompleted) {
    showToast('이미 환불 처리된 주문입니다.', 'error')
    return
  }

  // ── 환불 기준 금액 확인 ───────────────────────────────────────────────
  const refundAmount = getRefundAmount(order)
  if (!refundAmount || refundAmount <= 0) {
    showToast(
      `[${orderNum}] 환불 기준 금액을 확인할 수 없습니다. ` +
      '(first_payment.firstPaymentKrw 및 totalPriceKrw 모두 없음) — 수동 처리 필요',
      'error'
    )
    return
  }

  // ── 바이어 식별자 확인 ────────────────────────────────────────────────
  const buyerUserId = (order.user_id && isValidUUID(order.user_id)) ? order.user_id : null
  const buyerEmail  = (
    order.buyerInfo?.email ||
    order.buyer_email ||
    order.buyerEmail ||
    ''
  ).trim() || null

  if (!buyerUserId && !buyerEmail) {
    showToast(
      `[${orderNum}] 바이어 식별 정보(user_id/email)가 없어 예치금 환불 불가 — 수동 처리 필요`,
      'error'
    )
    return
  }

  if (!isSupabaseConfigured()) {
    showToast('Supabase 미연결 상태입니다.', 'error')
    return
  }

  // ── RPC 호출 ──────────────────────────────────────────────────────────
  const markKey = orderId || orderNum
  markingIds.value = new Set([...markingIds.value, markKey])

  try {
    const { data, error } = await supabase.rpc('process_refund', {
      p_order_id:     orderId     || '',
      p_order_number: orderNum    || '',
      p_user_id:      buyerUserId || null,
      p_user_email:   buyerEmail  || null,
      p_amount:       refundAmount,
    })

    if (error) throw error

    // RPC가 성공 HTTP 200이어도 success:false를 반환하면 에러로 처리 (Silent Failure 방지)
    if (!data || data.success !== true) {
      throw new Error(`RPC 응답 이상 — success 필드 없음 (data: ${JSON.stringify(data)})`)
    }

    // RPC 반환값에서 새 잔액 추출
    const newBalance = data?.new_balance ?? null

    // ── 로컬 상태 즉시 반영 ───────────────────────────────────────────
    const target = orders.value.find(o => o.id === orderId || o.orderNumber === orderNum)
    if (target) {
      target.refundCompleted   = true
      target.refundCompletedAt = new Date().toISOString()
    }

    const balanceMsg = newBalance !== null
      ? ` → 고객 잔액 ₩${fmtN(newBalance)}원`
      : ''
    showToast(
      `[${orderNum}] ₩${fmtN(refundAmount)}원 환불 완료${balanceMsg}`,
      'success'
    )
  } catch (e) {
    console.error('[markRefundDone] RPC 실패:', e)
    // RPC 에러 메시지를 그대로 표시 (이중환불·프로필없음·주문없음 구분 가능)
    showToast(`환불 처리 실패: ${e.message || e}`, 'error')
  } finally {
    const newSet = new Set(markingIds.value)
    newSet.delete(markKey)
    markingIds.value = newSet
  }
}

function fmtN(n) {
  return Math.round(Number(n) || 0).toLocaleString('ko-KR')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => { toast.value.show = false }, 4000)
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px); }
</style>