<template>
  <div class="space-y-6">

    <!-- Page Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
          <span>🗂 취소·반품 내역</span>
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">취소·환불 및 주문서반려 처리된 내 주문을 조회합니다.</p>
      </div>
      <button
        @click="loadOrders"
        type="button"
        :disabled="isLoading"
        class="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
      >
        {{ isLoading ? '불러오는 중…' : '🔄 새로고침' }}
      </button>
    </div>

    <!-- 요약 카드 3개 -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4">

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
        <div class="text-xs text-slate-500 mt-1 truncate">취소 처리 후 환불 대기중</div>
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
        <div class="text-xs text-slate-500 mt-1 truncate">환불 처리 완료된 건</div>
      </button>

      <!-- 카드 3: 주문서반려 -->
      <button
        @click="activeTab = 'rejected'"
        type="button"
        class="rounded-2xl border-2 p-4 sm:p-5 text-left transition cursor-pointer"
        :class="activeTab === 'rejected'
          ? 'border-orange-500 bg-orange-50/80 shadow-md shadow-orange-100'
          : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/30'"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-2xl">🚫</span>
          <span
            class="text-xs font-bold px-2 py-0.5 rounded-full"
            :class="activeTab === 'rejected' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'"
          >주문서반려</span>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-900">
          {{ rejectedOrders.length }}<span class="text-sm sm:text-base font-bold text-slate-400 ml-1">건</span>
        </div>
        <div class="text-xs text-slate-500 mt-1 truncate">견적대기 단계 반려(폐기)</div>
      </button>
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
                <th class="px-4 py-3 text-left font-bold text-slate-600 hidden md:table-cell">상품</th>
                <th class="px-4 py-3 text-right font-bold text-slate-600">금액</th>
                <th class="px-4 py-3 text-center font-bold text-slate-600">상태</th>
                <th class="px-4 py-3 text-center font-bold text-slate-600">처리일시</th>
                <th v-if="activeTab !== 'rejected'" class="px-4 py-3 text-center font-bold text-slate-600">환불상태</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="currentTabOrders.length === 0">
                <td :colspan="activeTab !== 'rejected' ? 6 : 5" class="px-4 py-10 text-center text-slate-400">
                  해당 내역이 없습니다.
                </td>
              </tr>
              <tr
                v-for="order in currentTabOrders"
                :key="order.id || order.orderNumber"
                class="hover:bg-blue-50/40 transition cursor-pointer"
                :title="`클릭하면 [${order.orderNumber}] 주문 상세로 이동합니다`"
                @click="goToOrder(order)"
              >
                <td class="px-4 py-3 font-mono font-bold text-slate-800">{{ order.orderNumber }}</td>
                <td class="px-4 py-3 text-slate-600 hidden md:table-cell max-w-[200px] truncate">
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
                <!-- 환불상태 — rejected 탭엔 없음 -->
                <td v-if="activeTab !== 'rejected'" class="px-4 py-3 text-center">
                  <span v-if="order.refundCompleted" class="inline-flex flex-col items-center gap-0.5 text-emerald-600 font-bold text-[10px]">
                    ✅ 환불완료
                    <span class="text-slate-400 font-mono text-[9px]">{{ formatDate(order.refundCompletedAt) }}</span>
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-amber-600 font-bold text-[10px]">
                    ⏳ 환불 처리중
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchOrdersFromSupabase } from '@/utils/orderStorage'
import { normalizeOrderStatus, getOrderStatsByUser } from '@/lib/orderPipeline'
import { calcOrderCost } from '@/utils/orderCostCalculator'
import { currentSettings, fetchSiteSettings } from '@/lib/settings'

const router = useRouter()

const orders = ref([])
const isLoading = ref(true)
const activeTab = ref('refund_pending')

async function loadOrders() {
  isLoading.value = true
  try {
    fetchSiteSettings()
    // fetchOrdersFromSupabase()는 바이어 모드에서 user_id eq 필터를 자동 적용하므로
    // RLS + 코드 레벨 이중 보호로 본인 주문만 반환됨
    const result = await fetchOrdersFromSupabase()
    orders.value = Array.isArray(result) ? result : []
  } catch (e) {
    console.error('[BuyerCancelledView] loadOrders error:', e)
    orders.value = []
  } finally {
    isLoading.value = false
  }
}

// getOrderStatsByUser로 cancelled/rejected 분류
const orderStats = computed(() => getOrderStatsByUser(orders.value))

const cancelledOrders = computed(() =>
  orderStats.value._cancelled.filter(o => normalizeOrderStatus(o.status) === 'cancelled')
)
const rejectedOrders = computed(() =>
  orderStats.value._cancelled.filter(o => normalizeOrderStatus(o.status) === 'rejected')
)
const refundPendingOrders = computed(() =>
  cancelledOrders.value.filter(o => !o.refundCompleted)
)
const refundDoneOrders = computed(() =>
  cancelledOrders.value.filter(o => o.refundCompleted === true)
)

const tabs = computed(() => [
  { key: 'refund_pending', label: '환불대기',   count: refundPendingOrders.value.length },
  { key: 'refund_done',    label: '환불완료',   count: refundDoneOrders.value.length },
  { key: 'rejected',       label: '주문서반려', count: rejectedOrders.value.length },
])

const currentTabOrders = computed(() => {
  if (activeTab.value === 'refund_pending') return refundPendingOrders.value
  if (activeTab.value === 'refund_done')    return refundDoneOrders.value
  if (activeTab.value === 'rejected')       return rejectedOrders.value
  return []
})

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

/**
 * 취소내역 행 클릭 시 원본 주문 상세로 이동 (A 기능)
 * OrderManageView가 route.query.orderNumber를 감지해 자동 오픈
 */
function goToOrder(order) {
  const orderNumber = order.orderNumber || order.id
  if (!orderNumber) return
  router.push({
    path: '/dashboard/orders',
    query: { orderNumber },
  })
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
</style>
