<template>
  <div class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
    <!-- 1. 상단 섹션 인디케이터 헤더 -->
    <div class="px-5 py-3 border-b border-gray-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-2xs">
          <i class="fas fa-route"></i>
        </div>
        <div>
          <h3 class="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
            <span>EUCHS 1688 수입 풀프로세스 10단계 로드맵</span>
            <span class="text-[11px] font-normal text-gray-400 hidden sm:inline">(클릭 시 해당 단계로 이동)</span>
          </h3>
        </div>
      </div>

      <!-- 3대 대구간 요약 배지 -->
      <div class="flex items-center gap-1.5 text-[11px] font-bold">
        <span
          class="px-2.5 py-1 rounded-lg transition"
          :class="currentSection === 'orders' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600'"
        >
          1~4단계: 발주 & 1차 결제
        </span>
        <span class="text-gray-300">›</span>
        <span
          class="px-2.5 py-1 rounded-lg transition"
          :class="currentSection === 'warehouse' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600'"
        >
          5~7단계: 이우 창고 & 검수/2차 결제
        </span>
        <span class="text-gray-300">›</span>
        <span
          class="px-2.5 py-1 rounded-lg transition"
          :class="currentSection === 'customs' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600'"
        >
          8~10단계: 통관 & 국내 배송
        </span>
      </div>
    </div>

    <!-- 2. 가로형 10단계 파이프라인 스텝 바 (스크롤 지원) -->
    <div class="p-3 sm:p-4 overflow-x-auto custom-scrollbar">
      <div class="flex items-center min-w-[980px] gap-1.5">
        <template v-for="(step, idx) in steps" :key="step.key">
          <!-- Step Card -->
          <div
            @click="handleStepClick(step)"
            class="flex-1 min-w-[90px] p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-center relative group"
            :class="[
              isStepInCurrentSection(step)
                ? 'border-amber-400 bg-amber-50/40 shadow-2xs hover:bg-amber-50/70 hover:border-amber-500'
                : 'border-gray-200/80 bg-white hover:border-gray-300 hover:bg-slate-50/80',
              getStepCount(step.key) > 0 ? 'ring-1 ring-amber-400/30' : ''
            ]"
          >
            <!-- 단계 번호 & 배지 -->
            <div class="flex items-center justify-between gap-1 mb-1">
              <span
                class="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center font-mono shrink-0 transition"
                :class="isStepInCurrentSection(step) ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'"
              >
                {{ step.code }}
              </span>

              <!-- 건수 뱃지 -->
              <span
                class="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold"
                :class="getStepCount(step.key) > 0
                  ? 'bg-rose-500 text-white animate-pulse shadow-2xs'
                  : 'bg-gray-100 text-gray-400'"
              >
                {{ getStepCount(step.key) }}건
              </span>
            </div>

            <!-- 스텝 명칭 -->
            <div
              class="font-extrabold text-[11px] truncate tracking-tight"
              :class="isStepInCurrentSection(step) ? 'text-gray-950 font-black' : 'text-gray-700'"
            >
              {{ step.shortLabel }}
            </div>

            <!-- 스텝 부가설명 -->
            <div class="text-[9.5px] text-gray-400 truncate mt-0.5 font-medium">
              {{ step.desc }}
            </div>

            <!-- 활성 섹션 인디케이터 밑줄 바 -->
            <div
              v-if="isStepInCurrentSection(step)"
              class="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-amber-500"
            ></div>
          </div>

          <!-- Connector Arrow (마지막 단계 제외) -->
          <div v-if="idx < steps.length - 1" class="text-gray-300 text-xs shrink-0 px-0.5 select-none">
            <i class="fas fa-chevron-right text-[9px] text-gray-300"></i>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { PIPELINE_STATUSES, normalizeOrderStatus } from '../../lib/orderPipeline'

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

// 10단계 풀프로세스 상세 정의
const steps = [
  {
    code: 1,
    key: 'quote_pending',
    label: '1. 견적대기',
    shortLabel: '1. 견적대기',
    desc: '견적 요청/보관함',
    section: 'orders',
    route: '/dashboard/orders?tab=quote_pending'
  },
  {
    code: 2,
    key: 'quote_confirmed',
    label: '2. 결제대기',
    shortLabel: '2. 결제대기',
    desc: '1차 결제 대기',
    section: 'orders',
    route: '/dashboard/orders?tab=quote_confirmed'
  },
  {
    code: 3,
    key: 'payment_verified',
    label: '3. 결제확인',
    shortLabel: '3. 결제확인',
    desc: '입금/결제 확인',
    section: 'orders',
    route: '/dashboard/orders?tab=payment_verified'
  },
  {
    code: 4,
    key: 'purchasing',
    label: '4. 1688 구매진행',
    shortLabel: '4. 구매진행',
    desc: '1688 공장발주',
    section: 'orders',
    route: '/dashboard/orders?tab=purchasing'
  },
  {
    code: 5,
    key: 'warehouse_in',
    label: '5. 이우창고 입고',
    shortLabel: '5. 창고입고',
    desc: '이우 물류센터 계근',
    section: 'warehouse',
    route: '/dashboard/warehouse'
  },
  {
    code: 6,
    key: 'inspection_done',
    label: '6. 실측/검수완료',
    shortLabel: '6. 검수완료',
    desc: '2차결제/바코드',
    section: 'warehouse',
    route: '/dashboard/orders'
  },
  {
    code: 7,
    key: 'shipping_ready',
    label: '7. 선적대기',
    shortLabel: '7. 선적대기',
    desc: '한국행 컨테이너',
    section: 'warehouse',
    route: '/dashboard/warehouse'
  },
  {
    code: 8,
    key: 'customs_clearance',
    label: '8. 세관 수입통관',
    shortLabel: '8. 수입통관',
    desc: '세관 통관/관부가세',
    section: 'customs',
    route: '/dashboard/logistics'
  },
  {
    code: 9,
    key: 'domestic_shipping',
    label: '9. 국내배송',
    shortLabel: '9. 국내배송',
    desc: '국내 택배/화물',
    section: 'customs',
    route: '/dashboard/logistics?tab=shipping'
  },
  {
    code: 10,
    key: 'delivered',
    label: '10. 배송완료',
    shortLabel: '10. 배송완료',
    desc: '바이어 수령완료',
    section: 'customs',
    route: '/dashboard/orders?tab=delivered'
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

const getStepCount = (stepKey) => {
  if (props.counts && typeof props.counts[stepKey] === 'number') {
    return props.counts[stepKey]
  }
  return internalCounts.value[stepKey] || 0
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
