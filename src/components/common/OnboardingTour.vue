 <template>
  <!-- 스포트라이트 온보딩 코치마크 - z-index 9999로 최상위 -->
  <Teleport to="body">
    <Transition name="onboard-fade">
      <div v-if="isOpen" style="position:fixed;inset:0;z-index:9999;" aria-modal="true" role="dialog">

        <!-- 딤 오버레이 (클릭 시 스킵) -->
        <div
          style="position:fixed;inset:0;cursor:pointer;"
          @click="skip"
        ></div>

        <!-- 스포트라이트 링 (타깃 요소 하이라이트) -->
        <div
          v-if="spotlightReady"
          :style="spotlightStyle"
        ></div>

        <!-- 말풍선 툴팁 카드 -->
        <div
          v-if="spotlightReady"
          :style="cardStyle"
          style="background:#fff;border-radius:20px;padding:20px;box-shadow:0 24px 48px -8px rgba(0,0,0,0.28),0 0 0 1px rgba(0,0,0,0.06);position:fixed;z-index:10001;"
        >
          <!-- 진행 도트 -->
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
            <div
              v-for="(_, i) in steps"
              :key="i"
              :style="i === currentStep
                ? 'width:20px;height:8px;border-radius:4px;background:#f97316;transition:all 0.3s;'
                : 'width:8px;height:8px;border-radius:50%;background:#e5e7eb;transition:all 0.3s;'"
            ></div>
            <span style="margin-left:auto;font-size:10px;font-weight:700;color:#9ca3af;font-family:monospace;">
              {{ currentStep + 1 }} / {{ steps.length }}
            </span>
          </div>

          <!-- 아이콘 + 타이틀 -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div
              style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;"
              :style="{ background: steps[currentStep].iconBgColor }"
            >{{ steps[currentStep].icon }}</div>
            <div>
              <div style="font-size:10px;font-weight:900;color:#f97316;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px;">
                STEP {{ currentStep + 1 }}
              </div>
              <h3 style="font-size:14px;font-weight:800;color:#111827;line-height:1.3;margin:0;">
                {{ steps[currentStep].title }}
              </h3>
            </div>
          </div>

          <!-- 설명 -->
          <p style="font-size:12px;color:#4b5563;line-height:1.7;margin-bottom:16px;">
            {{ steps[currentStep].desc }}
          </p>

          <!-- 버튼 -->
          <div style="display:flex;gap:8px;">
            <button
              type="button"
              @click="skip"
              style="flex:1;padding:8px;border-radius:12px;border:1px solid #e5e7eb;color:#6b7280;font-size:12px;font-weight:700;cursor:pointer;background:#fff;transition:background 0.15s;"
              @mouseenter="e => e.target.style.background='#f9fafb'"
              @mouseleave="e => e.target.style.background='#fff'"
            >건너뛰기</button>
            <button
              type="button"
              @click="next"
              :style="currentStep === steps.length - 1
                ? 'flex:2;padding:8px;border-radius:12px;border:none;background:#10b981;color:#fff;font-size:12px;font-weight:800;cursor:pointer;transition:background 0.15s;'
                : 'flex:2;padding:8px;border-radius:12px;border:none;background:#f97316;color:#fff;font-size:12px;font-weight:800;cursor:pointer;transition:background 0.15s;'"
            >{{ currentStep === steps.length - 1 ? '✅ 시작하기!' : '다음 →' }}</button>
          </div>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({ modelValue: { type: Boolean, default: null } })
const emit = defineEmits(['update:modelValue', 'complete'])

// ─── 4단계 스텝 정의 ───────────────────────────────────
const steps = [
  {
    targetSelector: '[data-tour="search-bar"]',
    icon: '🔍',
    iconBgColor: '#dbeafe',
    title: '1688 상품 한글/URL 검색',
    desc: '1688 상품명(한글)이나 중국 1688 상품 링크를 넣고 검색하여 실시간 도매가를 확인하세요. 직수입 최저가를 즉시 비교할 수 있습니다.',
  },
  {
    targetSelector: '[data-tour="category-btn"]',
    icon: '☰',
    iconBgColor: '#ffedd5',
    title: '모든 카테고리 탐색',
    desc: '주황색 [☰ 모든 카테고리] 버튼을 눌러 수만 가지 1688 공장 직거래 품목을 둘러보세요. 품목별 도매단가를 실시간으로 조회할 수 있습니다.',
  },
  {
    targetSelector: '[data-tour="bulk-excel-btn"]',
    icon: '📥',
    iconBgColor: '#d1fae5',
    title: '대량 엑셀 등록 & 카테고리 관리',
    desc: '대량 발주 엑셀 서식을 받아 수십 개 상품을 한 번에 등록하고 카테고리별로 묶어 관리하세요. 표준 양식을 다운로드하여 바로 작성할 수 있습니다.',
  },
  {
    targetSelector: '[data-tour="order-tracker"]',
    icon: '🚢',
    iconBgColor: '#ede9fe',
    title: '수입 풀프로세스 원스톱 트래커',
    desc: '발주 신청부터 현지 창고 실측 검수, 세관 통관 및 국내 배송까지 원스톱으로 추적됩니다. 8단계 파이프라인을 실시간 모니터링하세요.',
  },
]

// ─── State ──────────────────────────────────────────
const isOpen       = ref(false)
const currentStep  = ref(0)
const targetRect   = ref(null)
const spotlightReady = ref(false)
const PAD = 12

// ─── 스포트라이트 스타일 ─────────────────────────────
const spotlightStyle = computed(() => {
  if (!targetRect.value) return {}
  const { top, left, width, height } = targetRect.value
  return {
    position: 'fixed',
    top:    `${top - PAD}px`,
    left:   `${left - PAD}px`,
    width:  `${width  + PAD * 2}px`,
    height: `${height + PAD * 2}px`,
    borderRadius: '14px',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
    border: '2.5px solid rgba(255,255,255,0.85)',
    pointerEvents: 'none',
    zIndex: 10000,
    transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
  }
})

// ─── 카드 위치 스타일 ────────────────────────────────
const cardStyle = computed(() => {
  if (!targetRect.value) return {}
  const { top, left, bottom, width } = targetRect.value
  const CARD_W = 300
  const vw = window.innerWidth
  const vh = window.innerHeight

  let cardTop = (bottom + PAD + 240 < vh) ? bottom + PAD + 8 : top - PAD - 250
  let cardLeft = left + width / 2 - CARD_W / 2
  if (cardLeft + CARD_W > vw - 16) cardLeft = vw - CARD_W - 16
  if (cardLeft < 16) cardLeft = 16
  cardTop = Math.max(8, cardTop)

  return {
    top:   `${cardTop}px`,
    left:  `${cardLeft}px`,
    width: `${CARD_W}px`,
    transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
  }
})

// ─── 타깃 요소 측정 ─────────────────────────────────
async function measureTarget() {
  spotlightReady.value = false
  await nextTick()
  const selector = steps[currentStep.value]?.targetSelector
  if (!selector) {
    targetRect.value = {
      top: window.innerHeight / 2 - 40,
      left: window.innerWidth / 2 - 20,
      width: 40, height: 40,
      bottom: window.innerHeight / 2 + 40,
    }
    spotlightReady.value = true
    return
  }
  const el = document.querySelector(selector)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await new Promise(r => setTimeout(r, 360))
    targetRect.value = el.getBoundingClientRect()
  } else {
    targetRect.value = {
      top: window.innerHeight / 2 - 40,
      left: window.innerWidth / 2 - 20,
      width: 40, height: 40,
      bottom: window.innerHeight / 2 + 40,
    }
  }
  spotlightReady.value = true
}

// ─── 제어 함수 ──────────────────────────────────────
function open() {
  currentStep.value = 0
  isOpen.value = true
  measureTarget()
}
function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    measureTarget()
  } else {
    complete()
  }
}
function skip() {
  isOpen.value = false
  localStorage.setItem('euchs_onboarding_completed', '1')
  emit('update:modelValue', false)
}
function complete() {
  isOpen.value = false
  localStorage.setItem('euchs_onboarding_completed', '1')
  emit('complete')
  emit('update:modelValue', false)
}

// ─── 외부 v-model 동기화 ────────────────────────────
watch(() => props.modelValue, (val) => {
  if (val === true && !isOpen.value) open()
  if (val === false && isOpen.value) skip()
})

// ─── 리사이즈 대응 & 마운트 ──────────────────────────
function onResize() { if (isOpen.value) measureTarget() }
onMounted(() => {
  window.addEventListener('resize', onResize)
  // 최초 1회 자동 실행 (800ms 딜레이)
  if (!localStorage.getItem('euchs_onboarding_completed')) {
    setTimeout(() => open(), 800)
  }
  // 외부 버튼에서 window 이벤트로 트리거 가능
  window.addEventListener('euchs:open-onboarding', open)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('euchs:open-onboarding', open)
})

defineExpose({ open, skip })
</script>

<style scoped>
.onboard-fade-enter-active,
.onboard-fade-leave-active { transition: opacity 0.25s ease; }
.onboard-fade-enter-from,
.onboard-fade-leave-to    { opacity: 0; }
</style>
