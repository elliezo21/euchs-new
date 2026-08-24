<template>
  <div class="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
    <!-- 1. 상단 타이틀 & 헤더 바 -->
    <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
          <i class="fas fa-route"></i>
        </div>
        <div>
          <h3 class="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <span>EUCHS 1688 수입 풀프로세스 트래커</span>
            <span class="text-[11px] font-medium text-slate-400 hidden md:inline">· 3대 핵심 파트 8단계 진행 로드맵</span>
          </h3>
        </div>
      </div>

      <!-- 상단 전체 주문 현황 요약 -->
      <div class="flex items-center gap-2 text-xs">
        <span class="text-slate-500 font-medium">전체 진행 화물:</span>
        <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold font-mono">
          총 {{ totalActiveCount }}건
        </span>
      </div>
    </div>

    <!-- 2. 3대 파트 일체형 프로그레스 트래커 바 -->
    <div class="p-4 sm:p-5">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        <!-- ======================================================== -->
        <!-- [파트 1] 발주 & 1차 결제 (1~4단계, lg:col-span-6) -->
        <!-- ======================================================== -->
        <div
          class="lg:col-span-6 rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between"
          :class="[
            currentSection === 'orders'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
              : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
          ]"
        >
          <!-- 파트 헤더 -->
          <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/60">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="currentSection === 'orders' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'"
              ></span>
              <h4 class="text-xs sm:text-sm font-black tracking-tight" :class="currentSection === 'orders' ? 'text-indigo-950' : 'text-slate-800'">
                PART 1. 발주 & 1차 결제
              </h4>
              <span class="text-xs font-bold text-slate-400 font-mono">(1~4단계)</span>
            </div>
            <button
              type="button"
              @click="router.push('/dashboard/orders')"
              class="text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
              :class="currentSection === 'orders' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'"
            >
              발주관리 바로가기 ›
            </button>
          </div>

          <!-- 4개 스텝 가로 연결 노드 (연결선 최소화 & 폰트 확대) -->
          <div class="flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar py-1">
            <template v-for="(step, idx) in part1Steps" :key="step.key">
              <!-- Step Node -->
              <div
                @click="handleStepClick(step)"
                class="flex flex-col items-center flex-1 text-center cursor-pointer group px-1 py-1.5 rounded-xl transition hover:bg-white/90 select-none"
              >
                <div class="flex items-center gap-1 mb-1">
                  <span
                    class="w-7 h-7 rounded-full text-sm font-black flex items-center justify-center font-mono transition shadow-2xs"
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
                </div>
                <div class="text-sm font-bold text-slate-800 whitespace-nowrap group-hover:text-indigo-600 transition tracking-tight">
                  {{ step.label }}
                </div>
                <div
                  class="text-sm font-black font-mono mt-0.5"
                  :class="getStepCount(step) > 0 ? 'text-indigo-600' : 'text-slate-400'"
                >
                  {{ getStepCount(step) }}<span class="text-[11px] font-bold text-slate-400 ml-0.5">건</span>
                </div>
              </div>

              <!-- 초소형 연결선 (가로 낭비 제거) -->
              <div v-if="idx < part1Steps.length - 1" class="w-3 h-0.5 bg-slate-300 mx-0.5 mb-5 shrink-0 rounded-full"></div>
            </template>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- [파트 2] 이우 물류센터 입고 & 검수 (5~6단계, lg:col-span-3) -->
        <!-- ======================================================== -->
        <div
          class="lg:col-span-3 rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between"
          :class="[
            currentSection === 'warehouse'
              ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/10 shadow-xs'
              : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
          ]"
        >
          <!-- 파트 헤더 -->
          <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/60">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="currentSection === 'warehouse' ? 'bg-teal-600 animate-pulse' : 'bg-slate-400'"
              ></span>
              <h4 class="text-xs sm:text-sm font-black tracking-tight" :class="currentSection === 'warehouse' ? 'text-teal-950' : 'text-slate-800'">
                PART 2. 이우 창고 & 검수
              </h4>
              <span class="text-xs font-bold text-slate-400 font-mono">(5~6단계)</span>
            </div>
            <button
              type="button"
              @click="router.push('/dashboard/warehouse')"
              class="text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
              :class="currentSection === 'warehouse' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'"
            >
              이우창고 ›
            </button>
          </div>

          <!-- 2개 스텝 가로 연결 노드 (연결선 최소화 & 폰트 확대) -->
          <div class="flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar py-1">
            <template v-for="(step, idx) in part2Steps" :key="step.key">
              <!-- Step Node -->
              <div
                @click="handleStepClick(step)"
                class="flex flex-col items-center flex-1 text-center cursor-pointer group px-1 py-1.5 rounded-xl transition hover:bg-white/90 select-none"
              >
                <div class="flex items-center gap-1 mb-1">
                  <span
                    class="w-7 h-7 rounded-full text-sm font-black flex items-center justify-center font-mono transition shadow-2xs"
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
                </div>
                <div class="text-sm font-bold text-slate-800 whitespace-nowrap group-hover:text-teal-600 transition tracking-tight">
                  {{ step.label }}
                </div>
                <div
                  class="text-sm font-black font-mono mt-0.5"
                  :class="getStepCount(step) > 0 ? 'text-teal-600' : 'text-slate-400'"
                >
                  {{ getStepCount(step) }}<span class="text-[11px] font-bold text-slate-400 ml-0.5">건</span>
                </div>
              </div>

              <!-- 초소형 연결선 (가로 낭비 제거) -->
              <div v-if="idx < part2Steps.length - 1" class="w-3 h-0.5 bg-slate-300 mx-0.5 mb-5 shrink-0 rounded-full"></div>
            </template>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- [파트 3] 세관 통관 & 국내배송 (7~8단계, lg:col-span-3) -->
        <!-- ======================================================== -->
        <div
          class="lg:col-span-3 rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between"
          :class="[
            currentSection === 'customs'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
              : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
          ]"
        >
          <!-- 파트 헤더 -->
          <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/60">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="currentSection === 'customs' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'"
              ></span>
              <h4 class="text-xs sm:text-sm font-black tracking-tight" :class="currentSection === 'customs' ? 'text-indigo-950' : 'text-slate-800'">
                PART 3. 통관 & 국내배송
              </h4>
              <span class="text-xs font-bold text-slate-400 font-mono">(7~8단계)</span>
            </div>
            <button
              type="button"
              @click="router.push('/dashboard/logistics')"
              class="text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
              :class="currentSection === 'customs' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'"
            >
              통관·배송 ›
            </button>
          </div>

          <!-- 2개 스텝 가로 연결 노드 (연결선 최소화 & 폰트 확대) -->
          <div class="flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar py-1">
            <template v-for="(step, idx) in part3Steps" :key="step.key">
              <!-- Step Node -->
              <div
                @click="handleStepClick(step)"
                class="flex flex-col items-center flex-1 text-center cursor-pointer group px-1 py-1.5 rounded-xl transition hover:bg-white/90 select-none"
              >
                <div class="flex items-center gap-1 mb-1">
                  <span
                    class="w-7 h-7 rounded-full text-sm font-black flex items-center justify-center font-mono transition shadow-2xs"
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
                </div>
                <div class="text-sm font-bold text-slate-800 whitespace-nowrap group-hover:text-indigo-600 transition tracking-tight">
                  {{ step.label }}
                </div>
                <div
                  class="text-sm font-black font-mono mt-0.5"
                  :class="getStepCount(step) > 0 ? 'text-indigo-600' : 'text-slate-400'"
                >
                  {{ getStepCount(step) }}<span class="text-[11px] font-bold text-slate-400 ml-0.5">건</span>
                </div>
              </div>

              <!-- 초소형 연결선 (가로 낭비 제거) -->
              <div v-if="idx < part3Steps.length - 1" class="w-3 h-0.5 bg-slate-300 mx-0.5 mb-5 shrink-0 rounded-full"></div>
            </template>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  }
})

const router = useRouter()

// [파트 1] 발주 & 1차 결제 (1~4단계)
const part1Steps = [
  {
    code: 1,
    key: 'quote_pending',
    keys: ['quote_pending'],
    label: '1. 견적대기',
    section: 'orders',
    route: '/dashboard/orders'
  },
  {
    code: 2,
    key: 'quote_confirmed',
    keys: ['quote_confirmed'],
    label: '2. 결제대기',
    section: 'orders',
    route: '/dashboard/orders'
  },
  {
    code: 3,
    key: 'payment_verified',
    keys: ['payment_verified'],
    label: '3. 결제확인',
    section: 'orders',
    route: '/dashboard/orders'
  },
  {
    code: 4,
    key: 'purchasing',
    keys: ['purchasing'],
    label: '4. 1688 구매진행',
    section: 'orders',
    route: '/dashboard/orders'
  }
]

// [파트 2] 이우 물류센터 입고 & 검수 (5~6단계)
const part2Steps = [
  {
    code: 5,
    key: 'warehouse_inspection',
    keys: ['warehouse_in', 'inspection_done', 'warehouse_inspection', 'step_5', 'inspecting'],
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
  internalCounts.value = calculatePipelineCounts()
}

const getStepCount = (step) => {
  if (props.counts) {
    let customSum = 0
    let hasCustomKey = false

    // 1. 단일 키 매칭
    if (typeof props.counts[step.key] === 'number') {
      customSum += props.counts[step.key]
      hasCustomKey = true
    }

    // 2. 복합 키 매칭
    if (Array.isArray(step.keys)) {
      step.keys.forEach(k => {
        if (k !== step.key && typeof props.counts[k] === 'number') {
          customSum += props.counts[k]
          hasCustomKey = true
        }
      })
    }

    if (hasCustomKey) return customSum
  }

  let total = 0
  step.keys.forEach(k => {
    total += (internalCounts.value[k] || 0)
  })
  if (total === 0 && internalCounts.value[step.key]) {
    total = internalCounts.value[step.key]
  }
  return total
}

const handleStepClick = (step) => {
  const code = typeof step === 'number' ? step : (step?.code || 1)
  // 1~4단계: 발주 관리 페이지로 이동
  if (code >= 1 && code <= 4) {
    router.push('/dashboard/orders')
  }
  // 5~6단계: 이우 물류센터 입고/검수 페이지로 즉시 이동
  else if (code === 5 || code === 6) {
    router.push('/dashboard/warehouse')
  }
  // 7~8단계: 수입통관 & 국내배송 페이지로 즉시 이동
  else if (code === 7 || code === 8) {
    router.push('/dashboard/customs')
  } else if (step?.route) {
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
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
