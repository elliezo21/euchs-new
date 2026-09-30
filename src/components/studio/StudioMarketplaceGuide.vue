<template>
  <StudioModal :open="open" title="쿠팡 연결 방법" wide @close="$emit('close')">
    <div class="space-y-4" data-mk-guide>
      <div class="flex items-center gap-2 flex-wrap">
        <span v-for="(s, i) in STEPS" :key="i" class="st-badge cursor-pointer" :class="i === index ? 'st-badge-accent' : ''" @click="index = i">{{ i + 1 }}</span>
        <span class="ml-auto text-[12px] st-muted">{{ index + 1 }} / {{ STEPS.length }}</span>
      </div>

      <div class="st-surface st-border rounded-[12px] overflow-hidden">
        <button v-if="step.img" type="button" class="block w-full cursor-zoom-in" title="크게 보기" data-mk-guide-zoom-open @click="zoomOpen = true">
          <img :src="step.img" :alt="step.title" class="block w-full" loading="lazy" decoding="async" data-mk-guide-img />
        </button>
        <div v-else class="h-[220px] st-placeholder text-[13px]">캡처 이미지 자리</div>
      </div>
      <p v-if="step.img" class="-mt-2 text-[12px] st-muted">이미지를 누르면 크게 볼 수 있습니다.</p>

      <div>
        <h4 class="st-h-card">{{ index + 1 }}. {{ step.title }}</h4>
        <p class="mt-1 st-desc break-keep">{{ step.desc }}</p>
        <p v-if="step.warn" class="mt-2 text-[13px] font-bold st-danger-text break-keep" data-mk-guide-warn>{{ step.warn }}</p>
        <ul v-if="step.copies" class="mt-3 space-y-1.5">
          <li v-for="c in step.copies" :key="c.label" class="flex items-center gap-2 text-[13px]">
            <span class="st-muted w-[64px] shrink-0">{{ c.label }}</span>
            <code class="st-input-bare font-mono font-bold st-ink">{{ c.value }}</code>
            <button type="button" class="st-btn ml-auto shrink-0" :data-mk-copy="c.label" @click="copy(c.value, c.label)">{{ copied === c.label ? '복사됨' : '복사' }}</button>
          </li>
        </ul>
      </div>
    </div>
    <template #actions>
      <button type="button" class="st-btn" :disabled="index === 0" @click="index--">이전</button>
      <button v-if="index < STEPS.length - 1" type="button" class="st-btn st-btn-primary" data-mk-guide-next @click="index++">다음</button>
      <button v-else type="button" class="st-btn st-btn-primary" @click="$emit('close')">닫기</button>
    </template>
  </StudioModal>

  <!-- 캡처 크게 보기 — 가이드 창 위에 (닫기 버튼·바깥 누르기·Esc). body로 옮기므로 .studio-root를 직접 단다 -->
  <Teleport to="body">
    <div v-if="open && zoomOpen && step.img" class="studio-root st-modal-overlay fixed inset-0 z-[60] flex flex-col p-3 sm:p-6" role="dialog" aria-modal="true" :aria-label="step.title" data-mk-guide-zoom @click.self="zoomOpen = false">
      <div class="flex items-center gap-2 mb-2 shrink-0">
        <span class="st-badge st-badge-accent">{{ index + 1 }} / {{ STEPS.length }}</span>
        <button type="button" class="st-btn ml-auto" data-mk-guide-zoom-close @click="zoomOpen = false"><X class="w-4 h-4" :stroke-width="2" /> 닫기</button>
      </div>
      <div class="flex-1 min-h-0 overflow-auto rounded-[12px] st-surface" @click.self="zoomOpen = false">
        <img :src="step.img" :alt="step.title" class="block max-w-none w-full min-w-[960px]" decoding="async" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// [연결 방법 보기] — Wing에서 OPEN API 키를 발급하는 순서. 캡처 = public/studio-guide/coupang/01~05.png (개인정보 가림 처리된 것, docs/guide-assets/coupang 원본)
// Wing은 외부 화면이라 SpotlightGuide(화면 요소 비추기) 대신 단계형 창으로 보여 준다.
import { ref, computed, watch, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'

const props = defineProps({ open: { type: Boolean, default: false }, relayIp: { type: String, default: '3.39.196.112' } })
const emit = defineEmits(['close'])
const zoomOpen = ref(false)

const STEPS = computed(() => [
  { img: '/studio-guide/coupang/01.png', title: 'Wing 로그인 → 판매자정보 → 추가판매정보', desc: '쿠팡 Wing에 로그인한 뒤 [판매자정보 → 추가판매정보]로 가서 [API Key 발급 받기]를 누르세요.' },
  { img: '/studio-guide/coupang/02.png', title: '키 사용 목적: OPEN API', desc: '키 사용 목적에서 "OPEN API"를 고르세요.' },
  { img: '/studio-guide/coupang/03.png', title: '약관 2개 모두 체크 → [약관 동의 및 Key 발급받기]', desc: '약관 두 개를 모두 체크한 뒤 [약관 동의 및 Key 발급받기]를 누르세요.' },
  {
    img: '/studio-guide/coupang/04.png', title: '업체 입력 방식: 자체개발(직접입력)', desc: '"자체개발"을 고르고 업체명·URL·IP를 아래 값 그대로 넣으세요.',
    warn: 'IP를 입력한 뒤 반드시 [추가] 버튼을 누르세요. 입력만 하고 넘어가면 IP가 등록되지 않습니다.',
    copies: [{ label: '업체명', value: 'EUCHS' }, { label: 'URL', value: 'euchs.co.kr' }, { label: 'IP', value: props.relayIp }],
  },
  {
    img: '/studio-guide/coupang/05.png', title: 'IP [추가] → [확인] → 키 복사', desc: 'IP를 [추가]하면 [확인] 버튼이 활성화됩니다. 확인을 누른 뒤 보이는 업체코드·Access Key·Secret Key를 복사해 이 화면의 연결 칸에 붙여넣으세요.',
    warn: 'IP 입력 후 반드시 [추가] 버튼을 눌러야 [확인]이 활성화됩니다. 키 유효기간은 180일 — 만료 14일 전부터 Wing에서 재발급할 수 있고, 재발급하면 여기서 [키 교체]로 새 키를 넣으세요. (IP 등록은 반영까지 최대 30분)',
  },
])
const index = ref(0)
const step = computed(() => STEPS.value[index.value])
const copied = ref('')
async function copy(value, label) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = label
    setTimeout(() => { if (copied.value === label) copied.value = '' }, 1500)
  } catch (e) {
    console.error('[StudioMarketplaceGuide] 복사 실패:', e)
  }
}
// Esc — 크게 보기가 열려 있으면 그것만, 아니면 가이드 창을 닫는다.
// (StudioModal에는 Esc가 없다. 예전에는 Esc로 창이 안 닫혀, 그다음 첫 클릭이 어두운 배경에 걸려 "창 닫기"로 쓰이고 버튼은 안 눌렸다)
function onKey(e) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  if (zoomOpen.value) zoomOpen.value = false
  else emit('close')
}
watch(() => props.open, v => {
  if (v) {
    index.value = 0
    zoomOpen.value = false
    window.addEventListener('keydown', onKey)
  } else {
    zoomOpen.value = false
    window.removeEventListener('keydown', onKey)
  }
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
