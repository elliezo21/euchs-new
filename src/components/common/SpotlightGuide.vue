<template>
  <!-- 화면 요소를 하나씩 비추며 설명하는 사용가이드 (OnboardingTour 카드 스타일) — v-model:open, emits: finish({ completed }) -->
  <Teleport to="body">
    <Transition name="sg-fade">
      <div v-if="open && current" class="fixed inset-0 z-[130] pointer-events-none">
        <!-- 스포트라이트: 대상만 밝게, 나머지는 반투명하게 어둡게 (클릭은 통과) -->
        <div v-if="rect" class="sg-spot absolute rounded-2xl ring-2 ring-sky-400/90"
          :style="{ top: `${rect.top - PAD}px`, left: `${rect.left - PAD}px`, width: `${rect.width + PAD * 2}px`, height: `${rect.height + PAD * 2}px` }" />

        <!-- 안내 카드 -->
        <div ref="cardRef" role="dialog" :aria-label="current.title"
          class="pointer-events-auto absolute w-[340px] max-w-[calc(100vw-24px)] transition-[top,left] duration-300 ease-out"
          :style="{ top: `${cardPos.top}px`, left: `${cardPos.left}px` }">
          <span v-if="rect" class="absolute w-3.5 h-3.5 rotate-45 bg-white/85 border-white/70"
            :class="cardPos.side === 'below' ? '-top-[7px] border-l border-t' : '-bottom-[7px] border-r border-b'"
            :style="{ left: `${cardPos.arrowLeft}px` }" />
          <div class="relative rounded-2xl overflow-hidden bg-white/85 backdrop-blur-xl backdrop-saturate-150 border border-white/70 ring-1 ring-slate-900/5 shadow-[0_24px_60px_-16px_rgba(15,23,42,0.55)] text-slate-800">
            <div class="h-1 w-full bg-slate-900/5 flex">
              <div v-for="(_, i) in steps" :key="i" class="h-full flex-1 transition-all duration-300"
                :class="i <= index ? 'bg-orange-500' : 'bg-transparent'" />
            </div>
            <div class="px-4 pt-3.5 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20">
                  <span>💡</span><span>{{ badge }}</span>
                </span>
                <span class="text-[11px] font-bold text-slate-400">STEP {{ index + 1 }} / {{ steps.length }}</span>
              </div>
              <button type="button" @click="close(false)" aria-label="가이드 닫기"
                class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-900/5 transition text-sm">✕</button>
            </div>
            <div class="px-4 pt-2.5 pb-4 space-y-2">
              <h3 class="text-[15px] font-black text-slate-900 leading-snug break-keep">{{ current.title }}</h3>
              <p class="text-[13px] text-slate-600 leading-relaxed break-keep">{{ current.desc }}</p>
              <div v-if="current.tip" class="rounded-xl bg-amber-50/80 ring-1 ring-amber-200/70 px-3 py-2 flex items-start gap-2 text-[12px] text-amber-900 leading-relaxed break-keep">
                <span class="shrink-0">✨</span>
                <span><b class="font-bold text-amber-950 mr-1">포인트:</b>{{ current.tip }}</span>
              </div>
            </div>
            <div class="px-4 py-3 bg-slate-50/70 border-t border-slate-900/5 flex items-center gap-2">
              <button type="button" @click="close(false)"
                class="px-3 py-2 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-600 font-bold text-xs transition">건너뛰기</button>
              <button v-if="index > 0" type="button" @click="go(index - 1)"
                class="px-3 py-2 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-700 font-bold text-xs transition">이전</button>
              <button type="button" @click="index < steps.length - 1 ? go(index + 1) : close(true)"
                class="flex-1 py-2 px-3 rounded-xl text-white font-black text-xs shadow-md transition"
                :class="index < steps.length - 1 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'">
                {{ index < steps.length - 1 ? '다음 단계 →' : '✅ 확인했어요' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  /** 보이기 여부 (v-model:open) */
  open: { type: Boolean, default: false },
  /** [{ target: data-guide 값, title, desc, tip? }] — 화면에 실제로 있는 대상만 넘길 것 */
  steps: { type: Array, required: true },
  badge: { type: String, default: '사용가이드' },
  /** 열릴 때 시작할 단계 번호(0부터) */
  startIndex: { type: Number, default: 0 },
})
const emit = defineEmits(['update:open', 'finish'])

const PAD = 6      // 스포트라이트 여백(px)
const GAP = 14     // 대상과 카드 사이(px)
const MARGIN = 12  // 화면 가장자리 여백(px)

const index = ref(0)
const rect = ref(null)
const cardRef = ref(null)
const cardPos = ref({ top: 0, left: 0, side: 'below', arrowLeft: 24 })
const current = computed(() => props.steps[index.value] || null)

function targetEl(step) {
  return step ? document.querySelector(`[data-guide="${step.target}"]`) : null
}

/** 대상 위치를 재고 카드 위치를 정한다 (아래 공간이 넉넉하면 아래, 아니면 위) */
async function place() {
  const el = targetEl(current.value)
  if (!el) {
    rect.value = null
    console.error('[SpotlightGuide] 안내 대상을 찾지 못했습니다:', current.value?.target)
    cardPos.value = { top: Math.max(MARGIN, window.innerHeight / 2 - 140), left: Math.max(MARGIN, window.innerWidth / 2 - 170), side: 'below', arrowLeft: 24 }
    return
  }
  const r = el.getBoundingClientRect()
  rect.value = { top: r.top, left: r.left, width: r.width, height: r.height }
  await nextTick()
  const cw = cardRef.value?.offsetWidth || 340
  const ch = cardRef.value?.offsetHeight || 280
  const vw = window.innerWidth
  const vh = window.innerHeight
  const spaceBelow = vh - (r.bottom + PAD)
  const spaceAbove = r.top - PAD
  const side = (spaceBelow >= ch + GAP + MARGIN || spaceBelow >= spaceAbove) ? 'below' : 'above'
  let top = side === 'below' ? r.bottom + PAD + GAP : r.top - PAD - GAP - ch
  top = Math.min(Math.max(top, MARGIN), vh - ch - MARGIN)
  let left = r.left + r.width / 2 - cw / 2
  left = Math.min(Math.max(left, MARGIN), vw - cw - MARGIN)
  const arrowLeft = Math.min(Math.max(r.left + r.width / 2 - left - 7, 18), cw - 32)
  cardPos.value = { top, left, side, arrowLeft }
}

let settleTimer = null
function go(i) {
  index.value = i
  const el = targetEl(current.value)
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  place()
  clearTimeout(settleTimer)
  settleTimer = setTimeout(place, 380) // 부드러운 스크롤이 끝난 뒤 다시 잰다
}

function close(completed) {
  emit('update:open', false)
  emit('finish', { completed })
}

let raf = 0
function onViewportChange() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(place)
}
function onKey(e) {
  if (e.key === 'Escape') close(false)
  else if (e.key === 'ArrowRight' && index.value < props.steps.length - 1) go(index.value + 1)
  else if (e.key === 'ArrowLeft' && index.value > 0) go(index.value - 1)
}
function attach() {
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('keydown', onKey)
}
function detach() {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('keydown', onKey)
  cancelAnimationFrame(raf)
  clearTimeout(settleTimer)
}

watch(() => props.open, async (v) => {
  if (v) {
    await nextTick()
    attach()
    go(Math.min(Math.max(props.startIndex, 0), props.steps.length - 1))
  } else {
    detach()
    rect.value = null
  }
}, { immediate: true })

onBeforeUnmount(detach)
</script>

<style scoped>
.sg-spot {
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.42);
  transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease;
}
.sg-fade-enter-active, .sg-fade-leave-active { transition: opacity 0.2s ease; }
.sg-fade-enter-from, .sg-fade-leave-to { opacity: 0; }
</style>
