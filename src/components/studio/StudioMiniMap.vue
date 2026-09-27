<template>
  <div
    ref="listEl" class="relative flex-1 min-h-0 overflow-y-auto px-3 pb-3" data-minimap
    @dragover="onDragOver" @drop="onDrop" @dragleave="onDragLeave"
  >
    <p v-if="page.sections.length === 0" class="st-desc break-keep text-center pt-6">섹션이 생기면 여기에 작은 그림으로 보여요.</p>
    <!-- 끌어서 놓일 자리 (가로선) -->
    <div v-if="dropLine !== null" class="st-mini-drop" :style="{ top: `${dropLine}px` }" data-minimap-drop />
    <template v-for="(s, i) in page.sections" :key="s.id">
    <!-- 카드 사이(맨 위 포함)에 마우스를 올리면 [+] — 그 자리에 빈 섹션 (페이지의 [+ 여기에 섹션 추가]와 같은 명령) -->
    <div class="st-mini-gap" :data-minimap-gap="i">
      <button type="button" class="st-mini-add" :disabled="full" title="이 자리에 빈 섹션 추가" :data-minimap-add="i" @click="$emit('add-at', i)"><Plus class="w-3 h-3" :stroke-width="3" /></button>
    </div>
    <button
      type="button" draggable="true"
      class="st-mini-card block w-full text-left"
      :class="[s.id === selectedSectionId ? 'is-picked' : '', s.id === activeSectionId ? 'is-inview' : '', s.id === dragId ? 'is-dragging' : '']"
      :data-minimap-section="s.id" :data-inview="s.id === activeSectionId ? '1' : null" :data-picked="s.id === selectedSectionId ? '1' : null"
      :title="`${labels[s.id]} — 눌러서 이 섹션으로 · 끌어서 순서 바꾸기`"
      @click="$emit('pick', s.id)" @dragstart="onDragStart($event, s.id)" @dragend="onDragEnd"
    >
      <span class="st-mini-frame block">
        <StudioSectionThumb
          :section="s" :page-width="page.width" :views="views" :looks="looks" :width="thumbWidth"
          :draw-images="shown.has(s.id)"
        />
      </span>
      <span class="flex items-center gap-1 mt-1 text-[11px] font-bold" :class="s.id === selectedSectionId || s.id === activeSectionId ? 'st-ink' : 'st-muted'">
        <span class="truncate">{{ labels[s.id] }}</span>
        <span v-if="flags[s.id]" class="shrink-0 st-badge st-badge-danger" :data-minimap-flag="s.id" :title="`확인 필요 · ${flags[s.id]}`">확인 필요</span>
        <span v-if="s.id === activeSectionId" class="ml-auto shrink-0 st-mini-tag" data-inview-tag>보는 중</span>
      </span>
      <span class="sr-only">{{ i + 1 }}번째 섹션</span>
    </button>
    </template>
    <div v-if="page.sections.length" class="st-mini-gap" :data-minimap-gap="page.sections.length">
      <button type="button" class="st-mini-add" :disabled="full" title="맨 아래에 빈 섹션 추가" :data-minimap-add="page.sections.length" @click="$emit('add-at', page.sections.length)"><Plus class="w-3 h-3" :stroke-width="3" /></button>
    </div>
  </div>
</template>

<script setup>
// 오른쪽 미니뷰 (8-2) — 구간마다 작은 그림(폭 = 패널 폭, 높이 = 비율대로), 위 → 아래.
// 누르면 pick(sectionId) → 편집기가 페이지를 그 구간으로 스크롤하고 구간을 고른다(8-1 구간 고르기와 같은 상태).
// 표시: 지금 화면에 가장 많이 보이는 구간 = 점선 테두리 + "보는 중" / 골라진 구간 = 파란 실선 테두리 (둘은 다르게).
// 가볍게: 목록 화면 밖(위아래 여유 300px)의 그림은 사진을 그리지 않고 자리표시만. 사진은 새로 받지 않는다(views만).
// 끌어서 순서 바꾸기: 카드를 끌어 다른 카드 사이에 놓으면 reorder(새 id 순서) → 편집기가 reorderSections(예전 [순서 변경] 화면과 같은 함수·이력).
// 카드 사이 [+] = add-at(번호) → 편집기가 그 자리에 빈 섹션 (sectionAdd — 우클릭 "위에/아래에 섹션 추가"와 같은 명령).
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Plus } from 'lucide-vue-next'
import StudioSectionThumb from '@/components/studio/StudioSectionThumb.vue'
import { insertIndexFromY, orderAfterDrop } from '@/lib/studioCanvasUi'
import { SECTION_MAX } from '@/lib/studioPage'

const props = defineProps({
  page: { type: Object, required: true },
  views: { type: Object, required: true },
  looks: { type: Object, default: () => ({}) },
  labels: { type: Object, required: true },            // section id → "01 대표 사진" (페이지 왼쪽 구간 이름과 같은 글자)
  activeSectionId: { type: String, default: null },     // 지금 화면에 가장 많이 보이는 구간
  selectedSectionId: { type: String, default: null },   // 골라진 구간 (8-1)
  flags: { type: Object, default: () => ({}) },         // 구간 id → "확인 필요 · …" (원클릭 review-1)
})
const emit = defineEmits(['pick', 'reorder', 'add-at'])

const listEl = ref(null)
const full = computed(() => props.page.sections.length >= SECTION_MAX)

// ── 끌어서 순서 바꾸기 ──
const SECTION_DRAG_TYPE = 'application/x-euchs-studio-section'
const dragId = ref(null)
const dropIndex = ref(null) // 놓일 카드 사이 번호 (0 = 맨 위)
const dropLine = ref(null)  // 그 자리 가로선 (목록 상자 기준 px)
function cardBoxes() {
  const box = listEl.value
  if (!box) return []
  return [...box.querySelectorAll('[data-minimap-section]')].map(el => ({ el, top: el.offsetTop, height: el.offsetHeight }))
}
function onDragStart(e, id) {
  dragId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.setData(SECTION_DRAG_TYPE, id)
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onDragOver(e) {
  if (!dragId.value) return // 다른 끌기(목록 사진 등)는 받지 않는다
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  const box = listEl.value
  const y = e.clientY - box.getBoundingClientRect().top + box.scrollTop
  const cards = cardBoxes()
  const idx = insertIndexFromY(cards, y)
  dropIndex.value = idx
  dropLine.value = idx < cards.length ? cards[idx].top - 6 : (cards.at(-1) ? cards.at(-1).top + cards.at(-1).height + 4 : 0)
}
function onDragLeave(e) {
  if (!listEl.value?.contains(e.relatedTarget)) { dropIndex.value = null; dropLine.value = null }
}
function onDrop(e) {
  if (!dragId.value) return
  e.preventDefault()
  const ids = props.page.sections.map(s => s.id)
  const next = dropIndex.value === null ? ids : orderAfterDrop(ids, dragId.value, dropIndex.value)
  onDragEnd()
  if (next !== ids) emit('reorder', next)
}
function onDragEnd() { dragId.value = null; dropIndex.value = null; dropLine.value = null }
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
.st-mini-card.is-dragging { opacity: 0.4; }
/* 카드 사이 [+] — 마우스를 올린 자리만 */
.st-mini-gap { position: relative; height: 12px; display: flex; align-items: center; justify-content: center; }
.st-mini-add {
  width: 22px; height: 18px; border-radius: 999px; border: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  background: var(--st-accent); color: var(--st-on-accent); opacity: 0; transition: opacity .12s; z-index: 1;
}
.st-mini-gap:hover .st-mini-add, .st-mini-add:focus-visible { opacity: 1; }
.st-mini-add:disabled { display: none; }
.st-mini-drop { position: absolute; left: 12px; right: 12px; height: 3px; border-radius: 999px; background: var(--st-accent); pointer-events: none; z-index: 2; }
.st-mini-tag { padding: 0 6px; border-radius: 999px; font-size: 10px; color: var(--st-ink-2); border: 1px solid var(--st-line-strong); }
</style>
