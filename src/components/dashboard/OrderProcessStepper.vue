<template>
  <div class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
    <!-- 1. 상단 섹션 인디케이터 헤더 (고시인성 헤더) -->
    <div class="px-5 py-3 border-b border-gray-100 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          <i class="fas fa-route"></i>
        </div>
        <div>
          <h3 class="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
            <span>EUCHS 1688 수입 풀프로세스 8단계 로드맵</span>
            <span class="text-[11px] font-normal text-gray-400 hidden sm:inline">(클릭 시 해당 단계 관리 화면으로 즉시 이동)</span>
          </h3>
        </div>
      </div>

      <!-- 3대 대구간 요약 배지 -->
      <div class="flex items-center gap-1.5 text-xs font-extrabold">
        <span
          class="px-2.5 py-1 rounded-lg transition border"
          :class="currentSection === 'orders'
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-white text-gray-600 border-gray-200'"
        >
          1~4: 발주 & 1차 결제
        </span>
        <span class="text-gray-300">›</span>
        <span
          class="px-2.5 py-1 rounded-lg transition border"
          :class="currentSection === 'warehouse'
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-white text-gray-600 border-gray-200'"
        >
          5~6: 이우 창고 & 실측검수
        </span>
        <span class="text-gray-300">›</span>
        <span
          class="px-2.5 py-1 rounded-lg transition border"
          :class="currentSection === 'customs'
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-white text-gray-600 border-gray-200'"
        >
          7~8: 통관 & 국내 배송
        </span>
      </div>
    </div>

    <!-- 2. 가로형 8단계 파이프라인 스텝 바 (고대비 / 고시인성 UI) -->
    <div class="p-3 sm:p-4 overflow-x-auto custom-scrollbar">
      <div class="flex items-center min-w-[860px] gap-2">
        <template v-for="(step, idx) in steps" :key="step.key">
          <!-- Step Card -->
          <div
            @click="handleStepClick(step)"
            class="flex-1 min-w-[95px] p-3 rounded-xl border transition-all duration-200 cursor-pointer text-center relative select-none group"
            :class="[
              isStepInCurrentSection(step)
                ? 'border-2 border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/10 hover:bg-indigo-50/70'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-slate-50/70',
            ]"
          >
            <!-- 스텝 번호 뱃지 & 상단 라벨 -->
            <div class="flex items-center justify-center gap-1.5 mb-1.5">
              <span
                class="w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center font-mono shrink-0 transition"
                :class="isStepInCurrentSection(step)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'"
              >
                {{ step.code }}
              </span>
              <span
                class="font-black text-xs truncate tracking-tight text-gray-900"
              >
                {{ step.label }}
              </span>
            </div>

            <!-- 주문 건수 숫자 (고대비 / 크고 굵은 폰트) -->
            <div class="mt-1">
              <div
                class="text-lg font-black font-mono tracking-tight"
                :class="getStepCount(step) > 0
                  ? 'text-indigo-600'
                  : 'text-gray-400'"
              >
                {{ getStepCount(step) }}<span class="text-xs font-bold text-gray-500 ml-0.5">건</span>
              </div>
            </div>

            <!-- 활성 섹션 하단 인디케이터 바 -->
            <div
              v-if="isStepInCurrentSection(step)"
              class="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-indigo-600"
            ></div>
          </div>

          <!-- 연결 화살표 (마지막 단계 제외) -->
          <div v-if="idx < steps.length - 1" class="text-gray-300 shrink-0 px-0.5 select-none">
            <i class="fas fa-chevron-right text-[11px] text-gray-400 font-bold"></i>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { normalizeOrderStatus } from '../../lib/orderPipeline'

const props = defineProps({
  currentSection: {
    type: String,
    default: 'dashboard', // 'dashboard' | 'orders' | 'warehouse' | 'customs'
    validator: (val) => ['dashboard', 'orders', 'warehouse', 'customs'].includes(val)
  },
  counts: {
    type: Object,
    default: null
  }
})

const router = useRouter()

// 8대 명확한 수입 프로세스 단계 정의 (5/6단계 입고&정밀검수 통합)
const steps = [
  {
    code: 1,
    key: 'quote_pending',
    keys: ['quote_pending'],
    label: '1. 견적대기',
    section: 'orders',
    route: '/dashboard/orders?tab=quote_pending'
  },
  {
    code: 2,
    key: 'quote_confirmed',
    keys: ['quote_confirmed'],
    label: '2. 결제대기',
    section: 'orders',
    route: '/dashboard/orders?tab=quote_confirmed'
  },
  {
    code: 3,
    key: 'payment_verified',
    keys: ['payment_verified'],
    label: '3. 결제확인',
    section: 'orders',
    route: '/dashboard/orders?tab=payment_verified'
  },
  {
    code: 4,
    key: 'purchasing',
    keys: ['purchasing'],
    label: '4. 1688 구매진행',
    section: 'orders',
    route: '/dashboard/orders?tab=purchasing'
  },
  {
    code: 5,
    key: 'warehouse_inspection',
    keys: ['warehouse_in', 'inspection_done'],
    label: '5. 입고 & 정밀검수',
    section: 'warehouse',
    route: '/dashboard/warehouse'
  },
  {
    code: 6,
    key: 'shipping_ready',
    keys: ['shipping_ready'],
    label: '6. 선적대기',
    section: 'warehouse',
    route: '/dashboard/warehouse'
  },
  {
    code: 7,
    key: 'customs_clearance',
    keys: ['customs_clearance'],
    label: '7. 세관 수입통관',
    section: 'customs',
    route: '/dashboard/logistics'
  },
  {
    code: 8,
    key: 'domestic_delivered',
    keys: ['domestic_shipping', 'delivered'],
    label: '8. 국내배송 완료',
    section: 'customs',
    route: '/dashboard/logistics?tab=shipping'
  }
]

// 내부 자동 계산 카운트 상태
const internalCounts = ref({})

const isStepInCurrentSection = (step) => {
  if (props.currentSection === 'dashboard') return true
  return step.section === props.currentSection
}

const loadInternalCounts = () => {
  const countsMap = {
    quote_pending: 0,
    quote_confirmed: 0,
    payment_verified: 0,
    purchasing: 0,
    warehouse_in: 0,
    inspection_done: 0,
    shipping_ready: 0,
    customs_clearance: 0,
    domestic_shipping: 0,
    delivered: 0
  }

  // 1. 장바구니/보관함 수량 체크
  try {
    const saved = localStorage.getItem('euchs_1688_saved_items')
    if (saved) {
      const parsedSaved = JSON.parse(saved)
      if (Array.isArray(parsedSaved)) {
        countsMap.quote_pending += parsedSaved.length
      }
    }
  } catch (e) {}

  // 2. 제출된 주문 데이터 수량 체크
  try {
    const ordersJson = localStorage.getItem('euchs_erp_submitted_orders')
    if (ordersJson) {
      const parsedOrders = JSON.parse(ordersJson)
      if (Array.isArray(parsedOrders)) {
        parsedOrders.forEach(o => {
          const norm = normalizeOrderStatus(o.status)
          if (countsMap[norm] !== undefined) {
            countsMap[norm] += 1
          }
        })
      }
    } else {
      // 기본 샘플 카운트
      countsMap.quote_pending += 1
      countsMap.quote_confirmed += 1
      countsMap.purchasing += 1
      countsMap.inspection_done += 1
      countsMap.warehouse_in += 1
      countsMap.shipping_ready += 1
      countsMap.customs_clearance += 1
      countsMap.delivered += 1
    }
  } catch (e) {}

  internalCounts.value = countsMap
}

const getStepCount = (step) => {
  if (props.counts) {
    if (typeof props.counts[step.key] === 'number') {
      return props.counts[step.key]
    }
    let customSum = 0
    let hasCustomKey = false
    step.keys.forEach(k => {
      if (props.counts[k] !== undefined) {
        customSum += Number(props.counts[k]) || 0
        hasCustomKey = true
      }
    })
    if (hasCustomKey) return customSum
  }

  let total = 0
  step.keys.forEach(k => {
    total += (internalCounts.value[k] || 0)
  })
  return total
}

const handleStepClick = (step) => {
  if (step.route) {
    router.push(step.route)
  }
}

onMounted(() => {
  loadInternalCounts()
  window.addEventListener('euchs-order-status-update', loadInternalCounts)
  window.addEventListener('storage', loadInternalCounts)
})

onUnmounted(() => {
  window.removeEventListener('euchs-order-status-update', loadInternalCounts)
  window.removeEventListener('storage', loadInternalCounts)
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
