<template>
  <div ref="listEl" class="relative flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2" data-minimap>
    <p v-if="page.sections.length === 0" class="st-desc break-keep text-center pt-6">구간이 생기면 여기에 작은 그림으로 보여요.</p>
    <button
      v-for="(s, i) in page.sections" :key="s.id" type="button"
      class="st-mini-card block w-full text-left"
      :class="[s.id === selectedSectionId ? 'is-picked' : '', s.id === activeSectionId ? 'is-inview' : '']"
      :data-minimap-section="s.id" :data-inview="s.id === activeSectionId ? '1' : null" :data-picked="s.id === selectedSectionId ? '1' : null"
      :title="`${labels[s.id]} — 눌러서 이 구간으로`"
      @click="$emit('pick', s.id)"
    >
      <span class="st-mini-frame block">
        <StudioSectionThumb
          :section="s" :page-width="page.width" :views="views" :looks="looks" :width="thumbWidth"
          :draw-images="shown.has(s.id)"
        />
      </span>
      <span class="flex items-center gap-1 mt-1 text-[11px] font-bold" :class="s.id === selectedSectionId || s.id === activeSectionId ? 'st-ink' : 'st-muted'">
        <span class="truncate">{{ labels[s.id] }}</span>
        <span v-if="s.id === activeSectionId" class="ml-auto shrink-0 st-mini-tag" data-inview-tag>보는 중</span>
      </span>
      <span class="sr-only">{{ i + 1 }}번째 구간</span>
    </button>
  </div>
</template>

<script setup>
// 오른쪽 미니뷰 (8-2) — 구간마다 작은 그림(폭 = 패널 폭, 높이 = 비율대로), 위 → 아래.
// 누르면 pick(sectionId) → 편집기가 페이지를 그 구간으로 스크롤하고 구간을 고른다(8-1 구간 고르기와 같은 상태).
// 표시: 지금 화면에 가장 많이 보이는 구간 = 점선 테두리 + "보는 중" / 골라진 구간 = 파란 실선 테두리 (둘은 다르게).
// 가볍게: 목록 화면 밖(위아래 여유 300px)의 그림은 사진을 그리지 않고 자리표시만. 사진은 새로 받지 않는다(views만).
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import StudioSectionThumb from '@/components/studio/StudioSectionThumb.vue'

const props = defineProps({
  page: { type: Object, required: true },
  views: { type: Object, required: true },
  looks: { type: Object, default: () => ({}) },
  labels: { type: Object, required: true },            // section id → "01 대표 사진" (페이지 왼쪽 구간 이름과 같은 글자)
  activeSectionId: { type: String, default: null },     // 지금 화면에 가장 많이 보이는 구간
  selectedSectionId: { type: String, default: null },   // 골라진 구간 (8-1)
})
defineEmits(['pick'])

const listEl = ref(null)
const thumbWidth = ref(180)
const shown = ref(new Set()) // 목록 화면 안(여유 포함)에 있는 구간 id
let ro = null
let io = null
let mo = null

function observeCards() {
  if (!io || !listEl.value) return
  for (const el of listEl.value.querySelectorAll('[data-minimap-section]')) io.observe(el)
}
onMounted(() => {
  const el = listEl.value
  if (!el) return
  ro = new ResizeObserver(() => {
    const cs = getComputedStyle(el)
    const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4 // 테두리 2px × 2
    if (inner > 20) thumbWidth.value = Math.floor(inner)
  })
  ro.observe(el)
  if (typeof IntersectionObserver === 'undefined') {
    console.warn('[StudioMiniMap] IntersectionObserver 없음 — 모든 그림에 사진을 그림')
    shown.value = new Set(props.page.sections.map(s => s.id))
    return
  }
  io = new IntersectionObserver(entries => {
    const next = new Set(shown.value)
    for (const e of entries) {
      const id = e.target.dataset.minimapSection
      if (e.isIntersecting) next.add(id)
      else next.delete(id)
    }
    shown.value = next
  }, { root: el, rootMargin: '300px 0px' })
  observeCards()
  mo = new MutationObserver(observeCards) // 구간이 늘면 새 카드도 본다
  mo.observe(el, { childList: true })
})
onBeforeUnmount(() => { ro?.disconnect(); io?.disconnect(); mo?.disconnect() })

// 페이지를 스크롤해 "보는 중" 구간이 바뀌면 미니뷰도 그 카드가 보이게 (목록 안에서만 — 페이지는 건드리지 않는다)
watch(() => props.activeSectionId, id => {
  if (!id) return
  nextTick(() => {
    const box = listEl.value
    const card = box?.querySelector(`[data-minimap-section="${id}"]`)
    if (!box || !card) return
    const top = card.offsetTop // 목록 상자(relative) 기준
    if (top < box.scrollTop) box.scrollTop = top - 8
    else if (top + card.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + card.offsetHeight - box.clientHeight + 8
  })
})
</script>

<style scoped>
.st-mini-card { padding: 0; background: transparent; border: 0; cursor: pointer; }
.st-mini-frame { border: 2px solid transparent; border-radius: 6px; overflow: hidden; }
.st-mini-card:hover .st-mini-frame { border-color: var(--st-line-strong); }
.st-mini-card.is-inview .st-mini-frame { border: 2px dashed var(--st-accent-ring); }
.st-mini-card.is-picked .st-mini-frame { border: 2px solid var(--st-accent); }
.st-mini-card:focus-visible .st-mini-frame { outline: 2px solid var(--st-accent); outline-offset: 2px; }
.st-mini-tag { padding: 0 6px; border-radius: 999px; font-size: 10px; color: var(--st-ink-2); border: 1px solid var(--st-line-strong); }
</style>
