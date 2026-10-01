<template>
  <div class="space-y-3" data-mk-ss-guide>
    <div class="flex items-center gap-2 flex-wrap">
      <span v-for="(s, i) in SMARTSTORE_STEPS" :key="i" class="st-badge cursor-pointer" :class="i === index ? 'st-badge-accent' : ''" :data-mk-ss-step="i" @click="go(i)">{{ i + 1 }}</span>
      <span class="ml-auto text-[12px] st-muted">{{ index + 1 }} / {{ SMARTSTORE_STEPS.length }}</span>
    </div>

    <template v-if="step.imgs.length">
      <div class="st-surface st-border rounded-[12px] overflow-hidden">
        <button type="button" class="block w-full cursor-zoom-in" title="크게 보기" data-mk-ss-zoom-open @click="zoomOpen = true">
          <img :src="img" :alt="step.text" class="block w-full" loading="lazy" decoding="async" data-mk-ss-guide-img />
        </button>
      </div>
      <div class="-mt-1 flex items-center gap-2 text-[12px] st-muted">
        <span>이미지를 누르면 크게 볼 수 있습니다.</span>
        <span v-if="step.imgs.length > 1" class="ml-auto flex items-center gap-1">
          <button v-for="(p, j) in step.imgs" :key="p" type="button" class="st-badge" :class="j === shot ? 'st-badge-accent' : ''" :data-mk-ss-shot="j" @click="shot = j">화면 {{ j + 1 }}</button>
        </span>
      </div>
    </template>

    <div>
      <h4 class="st-h-card break-keep" data-mk-ss-step-text>
        {{ index + 1 }}.
        <template v-for="(part, k) in parts" :key="k"><strong v-if="part.strong" class="st-danger-text">{{ part.text }}</strong><template v-else>{{ part.text }}</template></template>
      </h4>
      <a v-if="step.link" :href="SMARTSTORE_API_CENTER_URL" target="_blank" rel="noopener noreferrer" class="st-btn mt-2 inline-flex" data-mk-ss-center-link>커머스API센터 열기 <ExternalLink class="w-3.5 h-3.5" :stroke-width="2" /></a>
      <p v-if="step.warn" class="mt-2 text-[13px] font-bold st-danger-text break-keep" data-mk-ss-guide-warn>{{ step.warn }}</p>
      <p v-if="step.note" class="mt-1 st-desc break-keep">{{ step.note }}</p>
      <ul v-if="step.copies" class="mt-3 space-y-1.5">
        <li v-for="c in step.copies" :key="c.label" class="flex items-center gap-2 text-[13px]">
          <span class="st-muted w-[40px] shrink-0">{{ c.label }}</span>
          <code class="st-input-bare font-mono font-bold st-ink break-all">{{ c.value }}</code>
          <button type="button" class="st-btn ml-auto shrink-0" :data-mk-ss-copy="c.label" @click="copy(c.value, c.label)">{{ copied === c.label ? '복사됨' : '복사' }}</button>
        </li>
      </ul>
    </div>

    <div class="flex justify-end gap-2">
      <button type="button" class="st-btn" :disabled="index === 0" @click="go(index - 1)">이전</button>
      <button type="button" class="st-btn" :disabled="index === SMARTSTORE_STEPS.length - 1" data-mk-ss-guide-next @click="go(index + 1)">다음</button>
    </div>
  </div>

  <!-- 캡처 크게 보기 — 연결 창 위에 (닫기 버튼·바깥 누르기·Esc). body로 옮기므로 .studio-root를 직접 단다 -->
  <Teleport to="body">
    <div v-if="zoomOpen && img" class="studio-root st-modal-overlay fixed inset-0 z-[60] flex flex-col p-3 sm:p-6" role="dialog" aria-modal="true" :aria-label="step.text" data-mk-ss-zoom @click.self="zoomOpen = false">
      <div class="flex items-center gap-2 mb-2 shrink-0">
        <span class="st-badge st-badge-accent">{{ index + 1 }} / {{ SMARTSTORE_STEPS.length }}</span>
        <button type="button" class="st-btn ml-auto" data-mk-ss-zoom-close @click="zoomOpen = false"><X class="w-4 h-4" :stroke-width="2" /> 닫기</button>
      </div>
      <div class="flex-1 min-h-0 overflow-auto rounded-[12px] st-surface" @click.self="zoomOpen = false">
        <img :src="img" :alt="step.text" class="block max-w-none w-full min-w-[960px]" decoding="async" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// 스마트스토어 연결 창의 단계 안내 (2026-10-01) — 쿠팡 가이드(StudioMarketplaceGuide)와 같은 형식: 단계별 캡처 + 한 줄.
// 단계·캡처·복사 값은 studioMarketGuides.SMARTSTORE_STEPS 한 곳. 연결 창(StudioSmartstoreCard)이 열릴 때마다 새로 그려져 1단계부터.
import { ref, computed, watch, onUnmounted } from 'vue'
import { X, ExternalLink } from 'lucide-vue-next'
import { SMARTSTORE_STEPS, SMARTSTORE_API_CENTER_URL } from '@/lib/studioMarketGuides'

const index = ref(0)
const shot = ref(0)
const zoomOpen = ref(false)
const step = computed(() => SMARTSTORE_STEPS[index.value])
const img = computed(() => step.value.imgs[shot.value] || '')
// 한 줄에서 strong 부분만 굵게
const parts = computed(() => {
  const { text, strong } = step.value
  const at = strong ? text.indexOf(strong) : -1
  if (at < 0) return [{ text }]
  return [{ text: text.slice(0, at) }, { text: strong, strong: true }, { text: text.slice(at + strong.length) }].filter(p => p.text)
})
function go(i) {
  if (i < 0 || i >= SMARTSTORE_STEPS.length) return
  index.value = i
  shot.value = 0
}

const copied = ref('')
async function copy(value, label) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = label
    setTimeout(() => { if (copied.value === label) copied.value = '' }, 1500)
  } catch (e) {
    console.error('[StudioSmartstoreGuide] 복사 실패:', e)
  }
}

// Esc — 크게 보기만 닫는다 (연결 창은 그대로)
function onKey(e) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  zoomOpen.value = false
}
watch(zoomOpen, v => {
  if (v) window.addEventListener('keydown', onKey, true)
  else window.removeEventListener('keydown', onKey, true)
})
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>
