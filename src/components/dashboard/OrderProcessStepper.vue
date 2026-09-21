<template>
  <div class="bg-white border border-[#e5e3df] rounded-[18px] px-[30px] py-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
    <!-- 1. 헤더 -->
    <div class="flex items-start sm:items-center justify-between gap-4 flex-wrap">
      <div>
        <h3 class="text-[16px] font-extrabold text-slate-900">EUCHS 1688 수입 풀프로세스 트래커</h3>
        <p class="text-xs text-slate-400 mt-[3px]">3대 핵심 파트 8단계 진행 로드맵</p>
      </div>
      <div class="text-xs text-slate-500">
        전체 진행률 대기 <span class="font-bold text-blue-600">{{ totalActiveCount }}건</span>
      </div>
    </div>

    <!-- 2. 3열 파트 그리드 -->
    <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#e5e3df] mt-6">

      <!-- ======================================================== -->
      <!-- [파트 1] 발주 & 1차 결제 (1~4단계) -->
      <!-- ======================================================== -->
      <div class="md:px-[22px] pt-6 md:pt-0 first:pt-0">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-[0.04em]">PART 1. 발주 & 1차 결제</h4>
          <button
            type="button"
            @click="router.push('/dashboard/orders')"
            class="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition cursor-pointer shrink-0"
          >
            바로가기 ›
          </button>
        </div>
        <div>
          <div
            v-for="step in part1Steps"
            :key="step.key"
            @click="handleStepClick(step)"
            class="flex items-center gap-3 py-[9px] cursor-pointer group"
          >
            <span
              class="w-7 h-7 rounded-full text-xs font-black flex items-center justify-center font-mono transition shrink-0"
              :class="[
                getStepCount(step) > 0
                  ? 'bg-indigo-600 text-white'
                  : currentSection === 'orders'
                    ? 'bg-indigo-200 text-indigo-900'
                    : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
              ]"
            >
              {{ step.code }}
            </span>
            <span class="flex-1 text-[13.5px] font-semibold text-slate-800 group-hover:text-indigo-600 transition">
              {{ stripLabelPrefix(step.label) }}
            </span>
            <span
              class="text-xs font-black font-mono"
              :class="getStepCount(step) > 0 ? 'text-indigo-600' : 'text-slate-400'"
            >
              {{ getStepCount(step) }}<span class="text-xs font-bold text-slate-400 ml-0.5">건</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- [파트 2] 이우 물류센터 입고 & 검수 (5~6단계) -->
      <!-- ======================================================== -->
      <div class="md:px-[22px] pt-6 md:pt-0">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-[0.04em]">PART 2. 이우 창고 & 검수</h4>
          <button
            type="button"
            @click="router.push('/dashboard/warehouse')"
            class="text-[11px] font-bold text-teal-500 hover:text-teal-700 transition cursor-pointer shrink-0"
          >
            바로가기 ›
          </button>
        </div>
        <div>
          <div
            v-for="step in part2Steps"
            :key="step.key"
            @click="handleStepClick(step)"
            class="flex items-center gap-3 py-[9px] cursor-pointer group"
          >
            <span
              class="w-7 h-7 rounded-full text-xs font-black flex items-center justify-center font-mono transition shrink-0"
              :class="[
                getStepCount(step) > 0
                  ? 'bg-teal-600 text-white'
                  : currentSection === 'warehouse'
                    ? 'bg-teal-200 text-teal-900'
                    : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
              ]"
            >
              {{ step.code }}
            </span>
            <span class="flex-1 text-[13.5px] font-semibold text-slate-800 group-hover:text-teal-600 transition">
              {{ stripLabelPrefix(step.label) }}
            </span>
            <span
              class="text-xs font-black font-mono"
              :class="getStepCount(step) > 0 ? 'text-teal-600' : 'text-slate-400'"
            >
              {{ getStepCount(step) }}<span class="text-xs font-bold text-slate-400 ml-0.5">건</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- [파트 3] 세관 통관 & 국내배송 (7~8단계) -->
      <!-- ======================================================== -->
      <div class="md:px-[22px] pt-6 md:pt-0">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-[0.04em]">PART 3. 통관 & 국내배송</h4>
          <button
            type="button"
            @click="router.push('/dashboard/logistics')"
            class="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition cursor-pointer shrink-0"
          >
            바로가기 ›
          </button>
        </div>
        <div>
          <div
            v-for="step in part3Steps"
            :key="step.key"
            @click="handleStepClick(step)"
            class="flex items-center gap-3 py-[9px] cursor-pointer group"
          >
            <span
              class="w-7 h-7 rounded-full text-xs font-black flex items-center justify-center font-mono transition shrink-0"
              :class="[
                getStepCount(step) > 0
                  ? 'bg-indigo-600 text-white'
                  : currentSection === 'customs'
                    ? 'bg-indigo-200 text-indigo-900'
                    : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
              ]"
            >
              {{ step.code }}
            </span>
            <span class="flex-1 text-[13.5px] font-semibold text-slate-800 group-hover:text-indigo-600 transition">
              {{ stripLabelPrefix(step.label) }}
            </span>
            <span
              class="text-xs font-black font-mono"
              :class="getStepCount(step) > 0 ? 'text-indigo-600' : 'text-slate-400'"
            >
              {{ getStepCount(step) }}<span class="text-xs font-bold text-slate-400 ml-0.5">건</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { normalizeOrderStatus } from '../../lib/orderPipeline'
import { calculatePipelineCounts } from '../../utils/orderStorage'

const props = defineProps({
  currentSection: {
    type: String,
    default: 'dashboard', // 'dashboard' | 'orders' | 'warehouse' | 'customs'
    validator: (val) => ['dashboard', 'orders', 'warehouse', 'customs'].includes(val)
  },
  counts: {
    type: Object,
    default: null
  },
  // 부모가 이미 fetch한 주문 배열을 전달하면 중복 DB 조회 없이 재사용
  orders: {
    type: Array,
    default: null
  }
})

const router = useRouter()

// 동그라미(dot)에 이미 단계 번호가 표시되므로, 라벨 텍스트의 중복된 "N. " 접두어만 제거
const stripLabelPrefix = (label) => (label || '').replace(/^\d+\.\s*/, '')

// [파트 1] 발주 & 1차 결제 (1~4단계)
const part1Steps = [
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
  }
]

// [파트 2] 이우 물류센터 입고 & 검수 (5~6단계)
const part2Steps = [
  {
    code: 5,
    key: 'warehouse_inspection',
    keys: ['warehouse_in', 'arrival_done', 'inspection_done', 'warehouse_inspection', 'step_5', 'inspecting'],
    label: '5. 입고 & 정밀검수',
    section: 'warehouse',
    route: '/dashboard/warehouse'
  },
  {
    code: 6,
    key: 'shipping_ready',
    keys: ['shipping_ready', 'ready_to_ship'],
    label: '6. 선적대기',
    section: 'warehouse',
    route: '/dashboard/warehouse'
  }
]

// [파트 3] 세관 통관 & 국내배송 (7~8단계)
const part3Steps = [
  {
    code: 7,
    key: 'customs_clearance',
    keys: ['customs_clearance', 'customs'],
    label: '7. 세관 수입통관',
    section: 'customs',
    route: '/dashboard/customs'
  },
  {
    code: 8,
    key: 'domestic_delivered',
    keys: ['domestic_shipping', 'delivered', 'completed', 'domestic_delivered'],
    label: '8. 국내배송 완료',
    section: 'customs',
    route: '/dashboard/customs'
  }
]

const allSteps = [...part1Steps, ...part2Steps, ...part3Steps]

// 내부 자동 계산 카운트 상태
const internalCounts = ref({})

const totalActiveCount = computed(() => {
  let sum = 0
  allSteps.forEach(st => {
    sum += getStepCount(st)
  })
  return sum
})

const loadInternalCounts = () => {
  // orders prop이 전달되면 재사용 (DB 중복 조회 방지)
  // 없으면 localStorage fallback (DashboardView, CustomsLogisticsView, WarehouseView)
  internalCounts.value = calculatePipelineCounts(Array.isArray(props.orders) ? props.orders : null)
}

const getStepCount = (step) => {
  if (props.counts) {
    // 집계키(step.key)가 counts에 있으면 단독 사용.
    // ⚠️ 이전 방식(집계키 + 개별키 모두 합산)은 이중합산 버그를 유발:
    //    예) warehouse_inspection(2) + warehouse_in(1) = 3 (실제: 2건)
    //        domestic_delivered(1) + domestic_shipping(1) = 2 (실제: 1건)
    if (typeof props.counts[step.key] === 'number') {
      return props.counts[step.key]
    }
    // 집계키가 없을 때만 개별키 합산 (step.key 자신 제외)
    let sum = 0
    step.keys.forEach(k => {
      if (k !== step.key && typeof props.counts[k] === 'number') {
        sum += props.counts[k]
      }
    })
    return sum
  }

  // internalCounts 경로 (orders prop 또는 localStorage fallback)
  // 집계키 우선 사용 — 개별키 합산과의 이중합산 방지
  if (typeof internalCounts.value[step.key] === 'number') {
    return internalCounts.value[step.key]
  }
  // 집계키가 없을 때만 개별키 합산 (step.key 자신 제외)
  let total = 0
  step.keys.forEach(k => {
    if (k !== step.key) {
      total += (internalCounts.value[k] || 0)
    }
  })
  return total
}


const handleStepClick = (step) => {
  // step 객체는 자신의 목적지(route)를 이미 알고 있으므로, 건수(0건 포함) 여부와 무관하게
  // 항상 해당 경로로 이동. 코드 범위 재매핑을 따로 두지 않아 route 값과 어긋날 여지를 없앤다.
  if (step?.route) {
    router.push(step.route)
    return
  }
  // step이 숫자 코드로만 전달되는 경우를 위한 폴백
  const code = typeof step === 'number' ? step : (step?.code || 1)
  if (code >= 1 && code <= 4) {
    router.push('/dashboard/orders')
  } else if (code === 5 || code === 6) {
    router.push('/dashboard/warehouse')
  } else if (code === 7 || code === 8) {
    router.push('/dashboard/customs')
  }
}

// orders prop 변경 시 카운트 자동 재계산 (부모 fetch 완료 후 반영)
watch(() => props.orders, () => {
  loadInternalCounts()
}, { deep: false })

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
