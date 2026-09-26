<template>
  <Teleport to="body">
    <!-- StudioModal과 같은 어두운 틀(st-modal-overlay·st-modal) — 구간 카드가 많아 더 넓게 쓰고, Esc도 여기서 받는다 -->
    <div
      v-if="open" class="studio-root st-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" :class="dark ? 'st-dark' : ''"
      data-reorder-modal @click.self="cancel"
    >
      <div class="st-modal w-full max-w-5xl flex flex-col" style="max-height: 88vh" role="dialog" aria-modal="true" aria-labelledby="st-reorder-title">
        <h3 id="st-reorder-title" class="st-modal-title">구간 순서 바꾸기</h3>
        <p class="mt-1 st-desc break-keep">카드를 끌어다 놓거나, 카드를 고른 뒤 ←·→ 키나 카드 아래 버튼으로 옮기세요. [완료]를 누르면 한 번에 바뀌어요.</p>

        <ol class="mt-4 flex-1 min-h-0 overflow-y-auto grid grid-cols-5 gap-3 p-1" data-reorder-grid>
          <li
            v-for="(id, i) in order" :key="id" :ref="el => setCardEl(id, el)"
            class="st-reorder-card" :class="[dragId === id ? 'is-dragging' : '', dropMark(id)]"
            tabindex="0" draggable="true" :data-reorder-card="id" :aria-label="`${i + 1}번째 · ${names[id]}`"
            @dragstart="onDragStart($event, id)" @dragend="onDragEnd" @dragover="onDragOver($event, id)" @drop="onDrop($event, id)"
            @keydown="onCardKey($event, id)"
          >
            <div class="st-reorder-thumb">
              <StudioSectionThumb :section="sectionOf(id)" :page-width="page.width" :views="views" :looks="looks" :width="150" :max-height="150" />
            </div>
            <div class="mt-2 flex items-center gap-1.5 min-w-0">
              <span class="st-reorder-no">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="text-[12px] font-bold st-ink-2 truncate">{{ names[id] }}</span>
            </div>
            <div class="mt-1 flex items-center gap-1">
              <span v-if="startIndex[id] !== i" class="text-[11px] st-muted" data-reorder-moved>원래 {{ String(startIndex[id] + 1).padStart(2, '0') }}</span>
              <span class="flex-1" />
              <button type="button" class="st-icon-btn st-reorder-move" :disabled="i === 0" title="앞으로 (위로)" :data-reorder-prev="id" @click="move(id, i - 1)">
                <ChevronLeft class="w-3.5 h-3.5" :stroke-width="2.5" />
              </button>
              <button type="button" class="st-icon-btn st-reorder-move" :disabled="i === order.length - 1" title="뒤로 (아래로)" :data-reorder-next="id" @click="move(id, i + 1)">
                <ChevronRight class="w-3.5 h-3.5" :stroke-width="2.5" />
              </button>
            </div>
          </li>
        </ol>

        <div class="mt-5 flex flex-wrap items-center justify-end gap-2">
          <span v-if="changed" class="mr-auto text-[12px] font-bold st-accent-text" data-reorder-changed>순서가 바뀌었어요 · [완료]를 누르면 적용돼요</span>
          <button type="button" class="st-btn" data-reorder-cancel @click="cancel">취소</button>
          <button type="button" class="st-btn st-btn-primary" data-reorder-done @click="done">완료</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// [순서 변경] 화면 (8-2) — 구간을 카드로 펼치고 끌어다 놓기·←/→ 키·버튼으로 순서를 바꾼다. 여는 동안은 이 창 안의 순서만 바뀌고,
// [완료] = apply(순서 id 배열) → 편집기가 reorderSections로 한 번에 적용(이력 1개 "구간 순서 변경"·페이지 저장). [취소]·Esc·바깥 누르기 = 아무것도 안 바꾸고 닫기.
// 편집기 단축키는 anyModalOpen으로 막힌다. 사진은 새로 받지 않는다(views만).
import { ref, computed, watch, nextTick, inject, onBeforeUnmount } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import StudioSectionThumb from '@/components/studio/StudioSectionThumb.vue'
import { moveInOrder } from '@/lib/studioPage'

const props = defineProps({
  open: { type: Boolean, default: false },
  page: { type: Object, required: true },
  views: { type: Object, required: true },
  looks: { type: Object, default: () => ({}) },
  names: { type: Object, required: true }, // section id → "대표 사진" (번호 없이 — 번호는 새 순서로 붙인다)
})
const emit = defineEmits(['apply', 'close'])
const dark = inject('studioDark', false)

const order = ref([])      // 이 창 안의 순서 (section id)
const startIndex = ref({}) // 열 때의 자리 (카드에 "원래 03")
const changed = computed(() => order.value.some((id, i) => startIndex.value[id] !== i))
const sectionOf = id => props.page.sections.find(s => s.id === id)

watch(() => props.open, isOpen => {
  if (isOpen) {
    order.value = props.page.sections.map(s => s.id)
    startIndex.value = Object.fromEntries(order.value.map((id, i) => [id, i]))
    window.addEventListener('keydown', onWindowKey, true)
  } else {
    window.removeEventListener('keydown', onWindowKey, true)
    onDragEnd()
  }
}, { immediate: true })
onBeforeUnmount(() => window.removeEventListener('keydown', onWindowKey, true))

// 창이 열린 동안 페이지 문서가 바뀌면(다른 창 저장 충돌 불러오기 등) 순서가 어긋나므로 지금 문서로 다시 시작
watch(() => props.page.sections.map(s => s.id).join('|'), () => {
  if (!props.open) return
  console.warn('[StudioReorderModal] 창을 연 동안 페이지 구간이 바뀌어 순서를 처음부터 다시 보여 줌')
  order.value = props.page.sections.map(s => s.id)
  startIndex.value = Object.fromEntries(order.value.map((id, i) => [id, i]))
})

function onWindowKey(e) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  cancel()
}
function cancel() { emit('close') }
function done() { emit('apply', [...order.value]) }

// ── 옮기기 (버튼·키보드) ──
const cardEls = new Map()
function setCardEl(id, el) { if (el) cardEls.set(id, el); else cardEls.delete(id) }
function move(id, toIndex) {
  const next = moveInOrder(order.value, id, toIndex)
  if (next === order.value) return
  order.value = next
  nextTick(() => cardEls.get(id)?.focus()) // 옮긴 카드에 계속 머문다 (키보드로 이어서 옮길 수 있게)
}
function onCardKey(e, id) {
  const i = order.value.indexOf(id)
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(id, i - 1) }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(id, i + 1) }
}

// ── 끌어다 놓기 ──
const dragId = ref(null)
const dropAt = ref(null) // { id, after } — 이 카드 앞(after=false)·뒤(true)에 놓임
function onDragStart(e, id) {
  dragId.value = id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', id) // 파이어폭스는 값이 있어야 끌기가 시작된다
}
function onDragEnd() { dragId.value = null; dropAt.value = null }
function onDragOver(e, id) {
  if (!dragId.value) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const r = e.currentTarget.getBoundingClientRect()
  dropAt.value = { id, after: e.clientX > r.left + r.width / 2 }
}
function onDrop(e, id) {
  if (!dragId.value) return
  e.preventDefault()
  const from = order.value.indexOf(dragId.value)
  let to = order.value.indexOf(id) + (dropAt.value?.id === id && dropAt.value.after ? 1 : 0)
  if (from < to) to -= 1 // 빼낸 뒤의 자리
  const moved = dragId.value
  onDragEnd()
  move(moved, to)
}
function dropMark(id) {
  if (!dropAt.value || dropAt.value.id !== id || dragId.value === id) return ''
  return dropAt.value.after ? 'drop-after' : 'drop-before'
}
</script>

<style scoped>
.st-reorder-card {
  position: relative; padding: 8px; border-radius: 12px; background: var(--st-card); border: 1px solid var(--st-line-strong);
  cursor: grab; outline: none;
}
.st-reorder-card:focus-visible { box-shadow: 0 0 0 2px var(--st-accent); }
.st-reorder-card.is-dragging { opacity: 0.4; }
.st-reorder-card.drop-before::before, .st-reorder-card.drop-after::after {
  content: ''; position: absolute; top: 6px; bottom: 6px; width: 3px; border-radius: 3px; background: var(--st-accent);
}
.st-reorder-card.drop-before::before { left: -8px; }
.st-reorder-card.drop-after::after { right: -8px; }
.st-reorder-thumb { height: 150px; display: flex; align-items: center; justify-content: center; border-radius: 8px; overflow: hidden; background: var(--st-panel); }
.st-reorder-no {
  flex: none; min-width: 26px; height: 20px; padding: 0 6px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: var(--st-on-accent); background: var(--st-accent);
}
.st-reorder-move { width: 26px; height: 26px; }
</style>
