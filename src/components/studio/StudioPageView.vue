<template>
  <div ref="rootEl" class="relative mx-auto" :style="{ width: `${page.width * zoom}px`, height: `${total * zoom}px` }" data-page @pointerdown.self="$emit('clear-selection')">
    <!-- 구간 이름 (페이지 왼쪽 바깥) -->
    <div
      v-for="(s, si) in page.sections" :key="`l-${s.id}`"
      class="absolute text-right text-[11px] font-bold whitespace-nowrap"
      :class="s.id === selectedSectionId ? 'st-accent-text' : 'st-muted'"
      :style="{ right: `calc(100% + 14px)`, top: `${rowOf(s.id).top * zoom + 4}px` }"
      data-section-label
    >{{ String(si + 1).padStart(2, '0') }} {{ sectionName(s) }}<span v-if="sectionBake(s)" class="block font-semibold st-muted" data-section-bake>{{ sectionBake(s) }}</span></div>

    <!-- 흰 페이지 -->
    <div class="absolute inset-0 st-page-paper" @pointerdown.self="$emit('clear-selection')">
      <section
        v-for="s in page.sections" :key="s.id"
        class="absolute left-0 overflow-hidden"
        :style="{ top: `${rowOf(s.id).top * zoom}px`, width: `${page.width * zoom}px`, height: `${s.height * zoom}px`, background: s.bg }"
        :data-section-id="s.id"
        @pointerdown.self="$emit('clear-selection')"
      >
        <template v-for="it in s.items" :key="it.id">
          <div
            v-if="isValidImageItem(it) && !it.hidden"
            class="absolute select-none"
            :class="it.locked ? '' : 'cursor-move'"
            :style="itemStyle(s, it)"
            :data-item-id="it.id" :data-image-id="it.imageId"
            @pointerdown="onItemDown($event, s, it)"
            @dblclick="$emit('open-erase', it.imageId)"
          >
            <img
              v-if="viewOf(it.imageId)?.url" :src="viewOf(it.imageId).url" alt="" draggable="false"
              class="block w-full h-full pointer-events-none" :style="flipStyle(it)"
            />
            <!-- 사진을 준비하는 중·실패·없는 사진: 그 자리 안에만 보인다 (떠 있는 막대 아님) -->
            <div
              v-else class="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center st-placeholder st-muted"
              :class="rowOfImage(it.imageId) && viewOf(it.imageId)?.status !== 'error' ? 'st-skeleton' : ''" data-item-state
            >
              <template v-if="!rowOfImage(it.imageId)">
                <span class="text-[12px] font-bold">이 작업에 없는 사진이에요</span>
              </template>
              <template v-else-if="viewOf(it.imageId)?.status === 'error'">
                <span class="text-[12px] font-bold break-keep">사진을 불러오지 못했어요</span>
                <button type="button" class="st-btn" data-item-retry @pointerdown.stop @click.stop="$emit('retry-image', it.imageId)">
                  <RefreshCw class="w-3.5 h-3.5" :stroke-width="2" /> 다시 시도
                </button>
              </template>
              <span v-else class="text-[12px] font-bold">사진 준비 중…</span>
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- 선택 테두리 (구간에 잘리지 않게 페이지 위에 그린다. 누르기는 통과) -->
    <div
      v-if="selectedFrame" class="absolute pointer-events-none st-select-frame"
      :style="selectedFrame" data-select-frame
    />
  </div>
</template>

<script setup>
// 가운데 긴 페이지 (4단계, 방식 C — DOM. Fabric은 지우기 화면에서만).
// 구간 = div(구간 밖은 잘림), 사진 = 절대 위치 img(화면용 작은 사진, studioViewImage). 사진 위에는 선택 테두리만.
// 조작: 누르기 = 선택, 끌기 = 그 구간 안에서 옮기기(손을 뗄 때 한 번 저장), 두 번 누르기 = 지우기 화면. Esc = 끌기 취소.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { layoutSections, isValidImageItem, clampItemPosition, findItem } from '@/lib/studioPage'
import { KIND_LABEL } from '@/lib/studioProjects'

const props = defineProps({
  page: { type: Object, required: true },
  zoom: { type: Number, required: true },
  imagesById: { type: Map, required: true },     // image id → studio_images 행
  views: { type: Object, required: true },       // image id → { status, url, error } (studioViewImage)
  selectedItemId: { type: String, default: null },
  bakeState: { type: Object, default: () => ({}) }, // image id → { status } (useBakeQueue) — 구간 이름 옆에 "적용 중" (사진 위에는 올리지 않는다)
})
// select({ itemId, imageId }) / clear-selection / move({ itemId, x, y }) 손을 뗄 때 한 번 / open-erase(imageId) / retry-image(imageId)
// visible(imageIds): 지금 화면에 보이는 사진 (위에서부터 — 편집기가 그 사진부터 받는다)
const emit = defineEmits(['select', 'clear-selection', 'move', 'open-erase', 'retry-image', 'visible'])

const DRAG_THRESHOLD = 3 // 화면 px — 이보다 적게 움직이면 누르기(선택)로 본다

const layout = computed(() => layoutSections(props.page))
const rowMap = computed(() => new Map(layout.value.rows.map(r => [r.id, r])))
const total = computed(() => layout.value.total)
const rowOf = id => rowMap.value.get(id) || { top: 0, height: 0 }
const rowOfImage = id => props.imagesById.get(id) || null
const viewOf = id => props.views[id] || null

/** 그 구간 사진의 굽기 상태 문구 (구간 이름 아래, 페이지 바깥) */
function sectionBake(s) {
  const st = s.items.filter(isValidImageItem).map(it => props.bakeState[it.imageId]?.status).find(Boolean)
  if (st === 'queued' || st === 'baking' || st === 'waiting') return '적용 중…'
  if (st === 'failed') return '적용하지 못했어요'
  return ''
}

function sectionName(s) {
  const first = s.items.find(isValidImageItem)
  const row = first && rowOfImage(first.imageId)
  return row ? KIND_LABEL[row.kind] || '사진' : '구간'
}

// ── 끌어 옮기기 (화면 값만 바꾸고, 손을 떼면 부모에 한 번 알린다) ──
const drag = ref(null) // { itemId, sectionId, startX, startY, x0, y0, x, y, moved, pointerId, el }

function posOf(it) {
  return drag.value && drag.value.itemId === it.id && drag.value.moved ? { x: drag.value.x, y: drag.value.y } : { x: it.x, y: it.y }
}

function itemStyle(s, it) {
  const p = posOf(it)
  const z = props.zoom
  return { left: `${p.x * z}px`, top: `${p.y * z}px`, width: `${it.w * z}px`, height: `${it.h * z}px`, opacity: it.opacity ?? 1 }
}
function flipStyle(it) {
  const sx = it.flipX ? -1 : 1, sy = it.flipY ? -1 : 1
  return sx === 1 && sy === 1 ? null : { transform: `scale(${sx}, ${sy})` }
}

const selectedSectionId = computed(() => (props.selectedItemId ? findItem(props.page, props.selectedItemId)?.section.id || null : null))
const selectedFrame = computed(() => {
  const f = props.selectedItemId ? findItem(props.page, props.selectedItemId) : null
  if (!f || !isValidImageItem(f.item) || f.item.hidden) return null
  const p = posOf(f.item)
  const z = props.zoom
  const top = rowOf(f.section.id).top
  return { left: `${p.x * z}px`, top: `${(top + p.y) * z}px`, width: `${f.item.w * z}px`, height: `${f.item.h * z}px` }
})

function onItemDown(e, s, it) {
  if (e.button !== 0) return
  e.stopPropagation()
  emit('select', { itemId: it.id, imageId: it.imageId })
  if (it.locked) return
  e.preventDefault() // 글자 선택·이미지 끌기 막기
  const el = e.currentTarget
  el.setPointerCapture?.(e.pointerId)
  drag.value = { itemId: it.id, sectionId: s.id, startX: e.clientX, startY: e.clientY, x0: it.x, y0: it.y, x: it.x, y: it.y, moved: false, pointerId: e.pointerId, el }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
}

function onMove(e) {
  const d = drag.value
  if (!d || e.pointerId !== d.pointerId) return
  const dx = e.clientX - d.startX, dy = e.clientY - d.startY
  if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
  const f = findItem(props.page, d.itemId)
  if (!f) { endDrag(); return }
  const p = clampItemPosition(f.item, f.section, props.page.width, d.x0 + dx / props.zoom, d.y0 + dy / props.zoom)
  drag.value = { ...d, x: p.x, y: p.y, moved: true }
}

function onUp(e) {
  const d = drag.value
  if (!d || e.pointerId !== d.pointerId) return
  endDrag()
  if (d.moved && (d.x !== d.x0 || d.y !== d.y0)) emit('move', { itemId: d.itemId, x: d.x, y: d.y })
}
function onCancel() { endDrag() }
function onKey(e) { if (e.key === 'Escape' && drag.value) { e.preventDefault(); endDrag() } }

function endDrag() {
  const d = drag.value
  if (d?.el) {
    d.el.removeEventListener('pointermove', onMove)
    d.el.removeEventListener('pointerup', onUp)
    d.el.removeEventListener('pointercancel', onCancel)
    if (d.el.hasPointerCapture?.(d.pointerId)) d.el.releasePointerCapture(d.pointerId)
  }
  window.removeEventListener('keydown', onKey)
  drag.value = null
}

/** 이 아이템이 보이게 스크롤 (사진 목록에서 골랐을 때) */
function scrollToItem(itemId) {
  const f = findItem(props.page, itemId)
  if (!f) return
  const root = document.querySelector(`[data-item-id="${itemId}"]`)
  root?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

// ── 보이는 사진 알리기 (스크롤 상자에 가려진 것은 안 보이는 것으로 친다 — IntersectionObserver 기본 root) ──
const rootEl = ref(null)
const shown = new Map() // item 요소 → { imageId, top }
let io = null
let mo = null
function observeItems() {
  if (!io || !rootEl.value) return
  for (const el of shown.keys()) if (!el.isConnected) { shown.delete(el); io.unobserve(el) } // 없어진 요소
  for (const el of rootEl.value.querySelectorAll('[data-item-id]')) io.observe(el)
}
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !rootEl.value) return
  io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && e.target.isConnected) shown.set(e.target, { imageId: e.target.dataset.imageId, top: e.boundingClientRect.top })
      else shown.delete(e.target)
    }
    const ids = [...shown.values()].sort((a, b) => a.top - b.top).map(v => v.imageId)
    emit('visible', [...new Set(ids)])
  }, { rootMargin: '300px 0px' })
  observeItems()
  mo = new MutationObserver(observeItems) // 구간·사진이 바뀌면 새 요소도 본다
  mo.observe(rootEl.value, { childList: true, subtree: true })
})
onBeforeUnmount(() => { endDrag(); io?.disconnect(); mo?.disconnect() })
defineExpose({ scrollToItem })
</script>

<style scoped>
/* 페이지 바탕색은 구간 bg(문서 값)가 칠한다. 여기서는 그림자만 */
.st-page-paper { box-shadow: var(--st-shadow-page); }
.st-select-frame { box-shadow: 0 0 0 2px var(--st-accent); border-radius: 1px; }
</style>
