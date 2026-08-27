<template>
  <!-- EUCHS 사용가이드 모달 (PC / 모바일 공통 반응형 플로팅 카드) -->
  <Teleport to="body">
    <Transition name="onboard-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 sm:p-6"
        aria-modal="true"
        role="dialog"
        @click.self="skip"
      >
        <!-- 모달 카드 -->
        <div
          class="w-full max-w-[92vw] sm:max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative text-slate-800 animate-in fade-in zoom-in-95 duration-200"
          @click.stop
        >
          <!-- 상단 다단계 진행 바 -->
          <div class="h-1.5 w-full bg-slate-100 flex">
            <div
              v-for="(_, i) in steps"
              :key="i"
              class="h-full flex-1 transition-all duration-300"
              :class="i <= currentStep ? 'bg-orange-500' : 'bg-transparent'"
            ></div>
          </div>

          <!-- 상단 헤더 영역 -->
          <div class="flex items-center justify-between px-5 pt-5 sm:px-6 sm:pt-6">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-black bg-orange-50 text-orange-600 border border-orange-200/70">
                <span>💡</span>
                <span>사용가이드</span>
              </span>
              <span class="text-[11px] font-bold text-slate-400">
                STEP {{ currentStep + 1 }} / {{ steps.length }}
              </span>
            </div>
            <button
              type="button"
              @click="skip"
              class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-sm cursor-pointer"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <!-- 스텝 본문 내용 -->
          <div class="p-5 sm:p-6 space-y-4">
            <!-- 아이콘 & 타이틀 -->
            <div class="flex items-start gap-3.5">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-xs"
                :class="steps[currentStep].iconBgClass"
              >
                {{ steps[currentStep].icon }}
              </div>
              <div class="space-y-0.5">
                <div class="text-[10px] font-black text-orange-500 uppercase tracking-wider">
                  {{ steps[currentStep].category }}
                </div>
                <h3 class="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {{ steps[currentStep].title }}
                </h3>
              </div>
            </div>

            <!-- 설명 텍스트 -->
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
              {{ steps[currentStep].desc }}
            </p>

            <!-- 포인트 팁 박스 -->
            <div class="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 flex items-start gap-2.5 text-[11px] sm:text-xs text-amber-900 leading-relaxed break-keep">
              <span class="text-sm shrink-0">✨</span>
              <div>
                <span class="font-bold text-amber-950 mr-1">포인트:</span>
                <span>{{ steps[currentStep].tip }}</span>
              </div>
            </div>
          </div>

          <!-- 하단 네비게이션 버튼 -->
          <div class="px-5 pb-5 sm:px-6 sm:pb-6 pt-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              @click="skip"
              class="px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs sm:text-sm transition shrink-0 cursor-pointer"
            >
              건너뛰기
            </button>

            <button
              v-if="currentStep > 0"
              type="button"
              @click="prev"
              class="px-3 sm:px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition shrink-0 cursor-pointer"
            >
              이전
            </button>

            <button
              type="button"
              @click="next"
              class="flex-1 py-2.5 px-4 rounded-xl text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
              :class="currentStep === steps.length - 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'"
            >
              <span>{{ currentStep === steps.length - 1 ? '✅ 시작하기' : '다음 단계' }}</span>
              <span v-if="currentStep < steps.length - 1">→</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  modelValue: { type: Boolean, default: null },
})
const emit = defineEmits(['update:modelValue', 'complete'])

const route = useRoute()

// ─── 4단계 스텝 정의 ───────────────────────────────────
const steps = [
  {
    targetSelector: '[data-tour="search-bar"]',
    icon: '🔍',
    iconBgClass: 'bg-blue-100 text-blue-600',
    category: 'STEP 1 · 실시간 검색',
    title: '1688 상품 한글/URL 실시간 검색',
    desc: '중국어 상품명을 몰라도 한글 키워드 또는 1688 상품 링크를 넣고 검색하세요. 실시간 도매 원가 환율 계산과 직수입 최저가를 즉시 비교할 수 있습니다.',
    tip: '1688 상품 링크(URL)를 복사해서 검색창에 넣으면 상세 옵션과 현지 도매가가 즉시 로드됩니다.',
  },
  {
    targetSelector: '[data-tour="category-btn"]',
    icon: '☰',
    iconBgClass: 'bg-amber-100 text-amber-600',
    category: 'STEP 2 · 카테고리 탐색',
    title: '수만 가지 공장 직거래 카테고리',
    desc: '패션의류, 잡화, 디지털, 인테리어 등 1688 현지 공장의 방대한 품목군을 둘러보세요. 카테고리별 실시간 도매 단가와 MOQ를 확인하실 수 있습니다.',
    tip: '좌측 사이드바 및 카테고리 메뉴에서 원하는 분야를 원클릭으로 탐색 가능합니다.',
  },
  {
    targetSelector: '[data-tour="bulk-excel-btn"]',
    icon: '📥',
    iconBgClass: 'bg-emerald-100 text-emerald-600',
    category: 'STEP 3 · 대량 엑셀 발주',
    title: '대량 엑셀 등록 & 일괄 견적',
    desc: '대량 발주용 표준 엑셀 서식을 다운로드하여 수십 개 이상의 상품을 한 번에 등록하세요. 카테고리별 맞춤 견적 산출과 일괄 발주가 지원됩니다.',
    tip: '대시보드 > 발주 관리 화면에서 표준 엑셀 양식을 다운로드받아 간편하게 업로드할 수 있습니다.',
  },
  {
    targetSelector: '[data-tour="order-tracker"]',
    icon: '🚢',
    iconBgClass: 'bg-indigo-100 text-indigo-600',
    category: 'STEP 4 · 풀프로세스 추적',
    title: '수입 전과정 원스톱 트래킹',
    desc: '발주 신청부터 현지 물류센터 입고, 정밀 검수, 세관 통관, 국내 택배/화물 배송까지 8단계 수입 파이프라인을 실시간으로 투명하게 확인하세요.',
    tip: '주요 상태 변경 시 카카오톡 알림톡으로 진행 내역이 자동 발송됩니다.',
  },
]

// ─── State ──────────────────────────────────────────
const isOpen = ref(false)
const currentStep = ref(0)

// 허용된 라우트인지 검사 (/mall or /dashboard)
const isAllowedRoute = computed(() => {
  if (!route || !route.path) return false
  const p = route.path
  if (p.startsWith('/admin') || p === '/login' || p === '/admin/login') return false
  return p.startsWith('/mall') || p.startsWith('/dashboard')
})

// 타깃 요소로 부드럽게 스크롤 이동
async function scrollToTarget() {
  await nextTick()
  const selector = steps[currentStep.value]?.targetSelector
  if (selector) {
    const el = document.querySelector(selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}

// ─── 제어 함수 ──────────────────────────────────────
function open() {
  if (!isAllowedRoute.value) return
  currentStep.value = 0
  isOpen.value = true
  scrollToTarget()
}

function prev() {
  if (currentStep.value > 0) {
    currentStep.value--
    scrollToTarget()
  }
}

function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    scrollToTarget()
  } else {
    complete()
  }
}

function skip() {
  isOpen.value = false
  localStorage.setItem('euchs_guide_viewed', 'true')
  localStorage.setItem('euchs_onboarding_completed', '1')
  emit('update:modelValue', false)
}

function complete() {
  isOpen.value = false
  localStorage.setItem('euchs_guide_viewed', 'true')
  localStorage.setItem('euchs_onboarding_completed', '1')
  emit('complete')
  emit('update:modelValue', false)
}

// ─── 외부 v-model 동기화 ────────────────────────────
watch(() => props.modelValue, (val) => {
  if (val === true && !isOpen.value) open()
  if (val === false && isOpen.value) skip()
})

// 비허용 라우트로 이동 시 가이드 닫기
watch(() => route?.path, () => {
  if (!isAllowedRoute.value && isOpen.value) {
    isOpen.value = false
  }
})

// ─── 마운트 시 자동 노출 체크 ─────────────────────────
onMounted(() => {
  const viewed = localStorage.getItem('euchs_guide_viewed') || localStorage.getItem('euchs_onboarding_completed')
  if (!viewed && isAllowedRoute.value) {
    setTimeout(() => {
      if (isAllowedRoute.value && !isOpen.value) {
        const stillNotViewed = localStorage.getItem('euchs_guide_viewed') || localStorage.getItem('euchs_onboarding_completed')
        if (!stillNotViewed) open()
      }
    }, 800)
  }
  window.addEventListener('euchs:open-onboarding', open)
})

onUnmounted(() => {
  window.removeEventListener('euchs:open-onboarding', open)
})

defineExpose({ open, skip, next, prev })
</script>

<style scoped>
.onboard-fade-enter-active,
.onboard-fade-leave-active {
  transition: opacity 0.2s ease;
}
.onboard-fade-enter-from,
.onboard-fade-leave-to {
  opacity: 0;
}
</style>
