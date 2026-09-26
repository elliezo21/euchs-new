<template>
  <div
    ref="rootEl" class="relative mx-auto" :style="{ width: `${doc.width * zoom}px`, height: `${total * zoom}px` }" data-page
    @pointerdown.self="onBlankDown" @contextmenu.self.prevent="onBlankContext"
    @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop"
  >
    <!-- 구간 이름 (페이지 왼쪽 바깥) -->
    <!-- 누르면 그 구간을 고른다 (8-1) -->
    <div
      v-for="(s, si) in doc.sections" :key="`l-${s.id}`"
      class="absolute text-right text-[11px] font-bold whitespace-nowrap cursor-pointer st-section-label"
      :class="selectedSectionIds.has(s.id) || selectedSectionId === s.id ? 'st-accent-text' : 'st-muted'"
      :style="{ right: `calc(100% + 14px)`, top: `${rowOf(s.id).top * zoom + 4}px` }"
      :data-section-label="s.id" title="이 구간 고르기"
      @pointerdown.stop="onLabelDown($event, s.id)" @contextmenu.prevent.stop="onLabelContext($event, s.id)"
    >{{ String(si + 1).padStart(2, '0') }} {{ sectionName(s) }}<span v-if="sectionBake(s)" class="block font-semibold st-muted" data-section-bake>{{ sectionBake(s) }}</span></div>

    <!-- 흰 페이지 -->
    <div class="absolute inset-0 st-page-paper" @pointerdown.self="onBlankDown" @contextmenu.self.prevent="onBlankContext">
      <section
        v-for="s in doc.sections" :key="s.id"
        class="absolute left-0 overflow-hidden" :class="[dropSectionId === s.id ? 'st-drop-target' : '', selectedSectionId === s.id ? 'st-section-picked' : '']"
        :style="{ top: `${rowOf(s.id).top * zoom}px`, width: `${doc.width * zoom}px`, height: `${s.height * zoom}px`, background: s.bg }"
        :data-section-id="s.id"
        @pointerdown.self="onBlankDown" @contextmenu.self.prevent="onBlankContext"
      >
        <template v-for="it in s.items" :key="it.id">
          <div
            v-if="isValidImageItem(it)"
            class="absolute select-none"
            :class="[it.locked ? '' : 'cursor-move', it.hidden ? 'st-item-hidden' : '']"
            :style="itemStyle(it)"
            :data-item-id="it.id" :data-image-id="it.imageId" :data-hidden="it.hidden ? '1' : null"
            @pointerdown="onItemDown($event, it)"
            @contextmenu.prevent.stop="onItemContext($event, it)"
            @dblclick="$emit('open-erase', it.imageId)"
          >
            <!-- 숨긴 요소: 편집 화면에서는 흐린 점선 윤곽만 (다시 찾을 수 있게) -->
            <template v-if="!it.hidden">
              <!-- 원본 비교 중: 그 사진의 원본(지우기·필터 전)을 잠깐 보여 준다 (자리·회전·뒤집기는 그대로) -->
              <img
                v-if="compare && compare.imageId === it.imageId && compare.url" :src="compare.url" alt="" draggable="false" crossorigin="anonymous"
                class="block w-full h-full pointer-events-none st-item-img" :style="flipStyle(it)" data-compare-img
              />
              <img
                v-else-if="viewOf(it.imageId)?.url" :src="viewOf(it.imageId).url" alt="" draggable="false"
                class="block w-full h-full pointer-events-none st-item-img" :style="imgStyle(it)"
                @load="onImgLoad(it.imageId, $event)" @error="onImgError(it.imageId)"
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
            </template>
          </div>
        </template>
      </section>
    </div>

    <!-- 필터의 온도·선명도 (CSS에 없어서 SVG 필터, 사진마다 하나) -->
    <svg v-if="svgFilters.length" class="absolute" width="0" height="0" aria-hidden="true" style="pointer-events: none">
      <defs>
        <filter v-for="f in svgFilters" :id="f.id" :key="f.id" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" :values="f.matrix" result="warm" />
          <feConvolveMatrix v-if="f.kernel" in="warm" order="3" :kernelMatrix="f.kernel" preserveAlpha="true" edgeMode="duplicate" />
        </filter>
      </defs>
    </svg>

    <!-- 달라붙기 안내선 (구간 좌표 → 페이지) -->
    <div
      v-for="(g, gi) in guides" :key="`g-${gi}`" class="absolute pointer-events-none st-snap-guide" :style="guideStyle(g)" data-snap-guide
    />

    <!-- 선택 테두리 (구간에 잘리지 않게 페이지 위에 그린다). 한 개면 크기·회전 손잡이, 잠겼으면 자물쇠 -->
    <div
      v-for="f in frames" :key="`f-${f.id}`"
      class="absolute pointer-events-none st-select-frame" :class="frames.length > 1 ? 'is-multi' : ''"
      :style="f.style" data-select-frame
    >
      <span v-if="f.locked" class="st-frame-lock" title="잠겨 있어요" data-frame-lock><Lock class="w-3 h-3" :stroke-width="2.5" /></span>
      <template v-if="f.handles">
        <span class="st-rotate-stem" />
        <span
          class="st-rotate-handle" title="돌리기 (Shift: 15°씩)" data-rotate-handle
          @pointerdown.stop.prevent="onRotateDown($event, f.id)"
        ><RotateCw class="w-3 h-3" :stroke-width="2.5" /></span>
        <span
          v-for="h in HANDLES" :key="h" class="st-resize-handle" :class="`is-${h}`" :data-resize-handle="h"
          @pointerdown.stop.prevent="onResizeDown($event, f.id, h)"
        />
      </template>
    </div>

    <!-- 골라진 구간의 높이 손잡이 (8-1) — 아래쪽 가장자리. 끌면 높이만 바뀌고(요소는 그대로) 놓을 때 이력 한 번 -->
    <div
      v-if="sectionHandle" class="absolute st-section-handle" :style="sectionHandle.style"
      :title="`끌어서 높이 바꾸기 · 지금 ${sectionHandle.height}px`" data-section-height-handle
      @pointerdown.stop.prevent="onSectionHeightDown($event, sectionHandle.id)"
    ><span class="st-section-handle-grip" /><span v-if="sizingSection" class="st-section-handle-size">{{ sectionHandle.height }}px</span></div>

    <!-- 빈 곳 드래그 박스 -->
    <div v-if="marquee" class="absolute pointer-events-none st-marquee" :style="marquee" data-marquee />
  </div>
</template>

<script setup>
// 가운데 긴 페이지 (4단계, 방식 C — DOM. Fabric은 지우기 화면에서만).
// 구간 = div(구간 밖은 잘림), 요소 = 절대 위치 div(사진은 화면용 작은 사진, studioViewImage). 요소 위에는 선택 테두리·손잡이만 (떠 있는 막대 없음, 결정 9).
// 6-1 공통 조작: 누르기 = 선택, Shift+누르기 = 추가·빼기, 빈 곳 끌기 = 박스 선택, 끌기 = 이동(달라붙기, Alt = 끔),
//   모서리 손잡이 = 비율 유지 크기(Shift = 자유), 변 손잡이 = 한 방향, 회전 손잡이(Shift = 15°), 우클릭 = 메뉴(편집기가 띄움).
//   조작 중에는 미리보기 문서(draft)로 그리고, 손을 뗄 때 한 번 change를 보낸다 (저장·이력 한 단계). Esc = 조작 취소.
// 페이지 계산은 전부 studioPage.js 순수 함수 (moveItems·resizeRect·setItemRect·setRotation·snapMove·itemsInBox).
// 8-1 구간: 구간 이름·요소 없는 구간의 빈 곳 누르기 = 구간 고르기(select-section), 골라진 구간은 테두리 + 아래쪽 높이 손잡이(setSectionHeight).
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import { RefreshCw, Lock, RotateCw } from 'lucide-vue-next'
import {
  layoutSections, isValidImageItem, findItem, moveItems, resizeRect, setItemRect, setRotation, snapMove, itemsInBox, itemStyleOf,
  DRAG_IMAGE_TYPE, setSectionHeight, SECTION_H_MIN, SECTION_H_MAX,
} from '@/lib/studioPage'
import { lookCss, needsSvgFilter, svgFilterParams } from '@/lib/studioLook'
import { LABELS } from '@/lib/studioHistory'
import { KIND_LABEL } from '@/lib/studioProjects'
import { afterPaint } from '@/lib/studioImageCache'

const props = defineProps({
  page: { type: Object, required: true },
  zoom: { type: Number, required: true },
  imagesById: { type: Map, required: true },     // image id → studio_images 행
  views: { type: Object, required: true },       // image id → { status, url, error } (studioViewImage)
  selectedIds: { type: Array, default: () => [] }, // 고른 요소 id
  looks: { type: Object, default: () => ({}) },    // image id → 필터·조정 (6-2, studioLook) — 화면에서만 CSS로
  compare: { type: Object, default: null },        // { imageId, url } 원본 비교 중 (6-2)
  bakeState: { type: Object, default: () => ({}) }, // image id → { status } (useBakeQueue) — 구간 이름 옆에 "적용 중" (사진 위에는 올리지 않는다)
  selectedSectionId: { type: String, default: null }, // 골라진 구간 (8-1) — 테두리 + 아래쪽 높이 손잡이
})
// select({ ids, source: 'page' }) 고른 요소 / change({ page, label }) 조작 끝(손을 뗄 때 한 번) / context({ x, y, itemId|null }) 우클릭
// open-erase(imageId) / retry-image(imageId) / visible(imageIds) / shown({ id, ok })
// drop-image({ imageId, sectionId|null, x, y }) 목록 사진을 끌어다 놓음 (6-3, x·y = 그 구간 좌표)
// select-section(sectionId) 구간 이름·요소 없는 구간의 빈 곳을 누름 (8-1). 높이 손잡이는 놓을 때 change({ page, label: 구간 높이 })
const emit = defineEmits(['select', 'change', 'context', 'open-erase', 'retry-image', 'visible', 'shown', 'drop-image', 'select-section'])

const DRAG_THRESHOLD = 3 // 화면 px — 이보다 적게 움직이면 누르기(선택)로 본다
const SNAP_PX = 6        // 화면 px — 이만큼 가까우면 달라붙는다
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const draft = shallowRef(null)   // 조작 중 미리보기 문서
const guides = ref([])           // 달라붙기 안내선
const doc = computed(() => draft.value || props.page)
const layout = computed(() => layoutSections(doc.value))
const rowMap = computed(() => new Map(layout.value.rows.map(r => [r.id, r])))
const total = computed(() => layout.value.total)
const rowOf = id => rowMap.value.get(id) || { top: 0, height: 0 }
const rowOfImage = id => props.imagesById.get(id) || null
const viewOf = id => props.views[id] || null
const selectedSet = computed(() => new Set(props.selectedIds))

function onImgLoad(id, e) { afterPaint(e.target).then(() => emit('shown', { id, ok: true })) }
function onImgError(id) {
  console.error('[StudioPageView] 페이지 사진을 그리지 못함:', id, props.views[id]?.url)
  emit('shown', { id, ok: false })
}

/** 그 구간 사진의 적용 상태 문구 (구간 이름 아래, 페이지 바깥) */
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

function itemStyle(it) {
  const z = props.zoom
  const rot = it.rotation ? `rotate(${it.rotation}deg)` : null
  const out = { left: `${it.x * z}px`, top: `${it.y * z}px`, width: `${it.w * z}px`, height: `${it.h * z}px`, opacity: it.hidden ? null : (it.opacity ?? 1), transform: rot }
  if (it.hidden) return out
  // 꾸미기 (6-2): 테두리(안쪽으로)·모서리·그림자 — 페이지 좌표 값에 배율을 곱한다
  const st = itemStyleOf(it)
  if (st.borderWidth) out.border = `${st.borderWidth * z}px solid ${st.borderColor}`
  if (st.radius) { out.borderRadius = `${st.radius * z}px`; out.overflow = 'hidden' }
  if (st.shadow) out.boxShadow = `0 ${(st.shadow * 0.12 * z).toFixed(1)}px ${(st.shadow * 0.4 * z).toFixed(1)}px rgba(0, 0, 0, ${(st.shadow / 100 * 0.45).toFixed(3)})`
  return out
}
function flipStyle(it) {
  const sx = it.flipX ? -1 : 1, sy = it.flipY ? -1 : 1
  return sx === 1 && sy === 1 ? null : { transform: `scale(${sx}, ${sy})` }
}
const svgIdOf = imageId => `st-lk-${imageId}`
/** 사진 모습: 뒤집기 + 필터·조정 (사진 파일은 그대로, 화면에서만) */
function imgStyle(it) {
  const f = lookCss(props.looks[it.imageId], svgIdOf(it.imageId))
  const flip = flipStyle(it)
  return f ? { ...(flip || {}), filter: f } : flip
}
/** 온도·선명도가 있는 사진의 SVG 필터 (페이지에 놓인 사진만) */
const svgFilters = computed(() => {
  const out = []
  const seen = new Set()
  for (const s of doc.value.sections) for (const it of s.items) {
    if (!isValidImageItem(it) || seen.has(it.imageId)) continue
    seen.add(it.imageId)
    const look = props.looks[it.imageId]
    if (!look || !needsSvgFilter(look)) continue
    out.push({ id: svgIdOf(it.imageId), ...svgFilterParams(look) })
  }
  return out
})

const selectedSectionIds = computed(() => {
  const out = new Set()
  for (const id of props.selectedIds) { const f = findItem(doc.value, id); if (f) out.add(f.section.id) }
  return out
})
/** 고른 요소마다 테두리 (페이지 좌표, 요소처럼 돌림). 한 개이고 잠기지 않았으면 손잡이 */
const frames = computed(() => {
  const z = props.zoom
  const out = []
  for (const id of props.selectedIds) {
    const f = findItem(doc.value, id)
    if (!f || !isValidImageItem(f.item)) continue
    const it = f.item
    const top = rowOf(f.section.id).top
    out.push({
      id, locked: !!it.locked, handles: false,
      style: { left: `${it.x * z}px`, top: `${(top + it.y) * z}px`, width: `${it.w * z}px`, height: `${it.h * z}px`, transform: it.rotation ? `rotate(${it.rotation}deg)` : null },
    })
  }
  if (out.length === 1 && !out[0].locked) out[0].handles = true
  return out
})
/** 골라진 구간의 높이 손잡이 자리 (페이지 좌표 → 화면) */
const sectionHandle = computed(() => {
  const id = props.selectedSectionId
  const s = id ? doc.value.sections.find(x => x.id === id) : null
  if (!s) return null
  const z = props.zoom
  const bottom = (rowOf(id).top + s.height) * z
  return { id, height: s.height, style: { left: `${(doc.value.width * z) / 2 - 28}px`, top: `${bottom - 6}px`, width: '56px', height: '12px' } }
})
function guideStyle(g) {
  const z = props.zoom
  const r = rowOf(g.sectionId)
  return g.axis === 'x'
    ? { left: `${g.pos * z}px`, top: `${r.top * z}px`, width: '1px', height: `${r.height * z}px` }
    : { left: '0px', top: `${(r.top + g.pos) * z}px`, width: `${doc.value.width * z}px`, height: '1px' }
}

// ── 조작 (누르기 → 끌기 → 떼기) ──
let act = null // { kind, startX, startY, startPage, ids, id, handle, cx, cy, moved, shift, pointerId, prevIds }
const marquee = ref(null)

function pagePoint(e) {
  const r = rootEl.value.getBoundingClientRect()
  return { x: (e.clientX - r.left) / props.zoom, y: (e.clientY - r.top) / props.zoom }
}
function begin(e, a) {
  act = { ...a, startX: e.clientX, startY: e.clientY, startPage: props.page, moved: false, pointerId: e.pointerId }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('keydown', onKey, true)
}
function end() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', cancel)
  window.removeEventListener('keydown', onKey, true)
  act = null
  draft.value = null
  guides.value = []
  marquee.value = null
  sizingSection.value = false
}
function cancel() { end() }
function onKey(e) { if (e.key === 'Escape' && act) { e.preventDefault(); e.stopPropagation(); end() } }

function selectIds(ids) { emit('select', { ids, source: 'page' }) }

function onItemDown(e, it) {
  if (e.button !== 0) return
  e.stopPropagation()
  e.preventDefault() // 글자 선택·이미지 끌기 막기
  const sel = props.selectedIds
  if (e.shiftKey) { // 추가·빼기 (끌지 않음)
    selectIds(sel.includes(it.id) ? sel.filter(x => x !== it.id) : [...sel, it.id])
    return
  }
  const ids = sel.includes(it.id) ? sel : [it.id]
  // 이미 골라져 있어도(목록에서 고른 사진이 페이지에도 골라져 있는 경우) 다시 알린다 — 편집기가 "페이지에서 고름"으로 바꿔야
  // 방향키가 요소 옮기기가 된다 (안 보내면 목록 기준 그대로라 ←/→는 아무 일 없고 ↑/↓는 사진 바꾸기가 됨)
  selectIds(ids)
  const movable = ids.filter(id => { const f = findItem(props.page, id); return f && !f.item.locked })
  if (movable.length) begin(e, { kind: 'move', ids: movable })
}
function onResizeDown(e, id, handle) {
  if (e.button !== 0) return
  begin(e, { kind: 'resize', id, handle })
}
function onRotateDown(e, id) {
  if (e.button !== 0) return
  const el = rootEl.value.querySelector(`[data-item-id="${id}"]`)
  const r = el?.getBoundingClientRect()
  if (!r) return
  begin(e, { kind: 'rotate', id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 })
}
function onBlankDown(e) {
  if (e.button !== 0) return
  const p = pagePoint(e)
  begin(e, { kind: 'box', x0: p.x, y0: p.y, shift: e.shiftKey, prevIds: props.selectedIds, sectionId: sectionAt(e) })
}

// ── 구간 고르기·높이 (8-1) ──
const sizingSection = ref(false) // 높이 손잡이를 끄는 중 (손잡이에 지금 높이 표시)
function onLabelDown(e, sectionId) {
  if (e.button !== 0) return
  emit('select-section', sectionId)
}
function onLabelContext(e, sectionId) {
  emit('context', { x: e.clientX, y: e.clientY, itemId: null, sectionId })
}
function onSectionHeightDown(e, sectionId) {
  if (e.button !== 0) return
  const s = props.page.sections.find(x => x.id === sectionId)
  if (!s) return
  begin(e, { kind: 'sectionHeight', id: sectionId, h0: s.height })
  sizingSection.value = true
}

function onMove(e) {
  if (!act || e.pointerId !== act.pointerId) return
  const sdx = e.clientX - act.startX, sdy = e.clientY - act.startY
  if (!act.moved && Math.hypot(sdx, sdy) < DRAG_THRESHOLD) return
  act.moved = true
  const z = props.zoom
  const P = act.startPage
  if (act.kind === 'move') {
    const s = e.altKey ? { dx: sdx / z, dy: sdy / z, guides: [] } : snapMove(P, act.ids, sdx / z, sdy / z, SNAP_PX / z)
    draft.value = moveItems(P, act.ids, s.dx, s.dy)
    guides.value = s.guides
  } else if (act.kind === 'resize') {
    const f = findItem(P, act.id)
    if (!f) return
    const corner = act.handle.length === 2
    const r = resizeRect(f.item, f.item.rotation || 0, act.handle, sdx / z, sdy / z, { keepRatio: corner && !e.shiftKey })
    draft.value = setItemRect(P, act.id, r)
  } else if (act.kind === 'rotate') {
    let deg = Math.atan2(e.clientY - act.cy, e.clientX - act.cx) * 180 / Math.PI + 90
    if (e.shiftKey) deg = Math.round(deg / 15) * 15
    draft.value = setRotation(P, [act.id], deg)
  } else if (act.kind === 'sectionHeight') {
    const h = Math.max(SECTION_H_MIN, Math.min(SECTION_H_MAX, Math.round(act.h0 + sdy / z)))
    draft.value = setSectionHeight(P, act.id, h)
  } else if (act.kind === 'box') {
    const p = pagePoint(e)
    const x = Math.min(act.x0, p.x), y = Math.min(act.y0, p.y), w = Math.abs(p.x - act.x0), h = Math.abs(p.y - act.y0)
    marquee.value = { left: `${x * z}px`, top: `${y * z}px`, width: `${w * z}px`, height: `${h * z}px` }
    act.box = { x, y, w, h }
  }
}

function onUp(e) {
  if (!act || e.pointerId !== act.pointerId) return
  const a = act
  const next = draft.value
  if (a.kind === 'box') {
    if (!a.moved) {
      // 요소가 없는 구간의 빈 곳을 누름 = 그 구간 고르기 (8-1). 그 밖의 빈 곳 누르기 = 선택 해제
      const s = a.sectionId ? props.page.sections.find(x => x.id === a.sectionId) : null
      if (!a.shift && s && s.items.length === 0) emit('select-section', s.id)
      else if (!a.shift) selectIds([])
    } else {
      const hit = itemsInBox(props.page, a.box)
      selectIds(a.shift ? [...new Set([...a.prevIds, ...hit])] : hit)
    }
  } else if (a.moved && next && next !== a.startPage) {
    const LABEL_OF = { move: LABELS.elMove, resize: LABELS.elResize, rotate: LABELS.elRotate, sectionHeight: LABELS.secHeight }
    const label = LABEL_OF[a.kind]
    emit('change', { page: next, label })
  }
  end()
}

// ── 우클릭 ──
function onItemContext(e, it) {
  if (!props.selectedIds.includes(it.id)) selectIds([it.id])
  emit('context', { x: e.clientX, y: e.clientY, itemId: it.id })
}
function onBlankContext(e) {
  emit('context', { x: e.clientX, y: e.clientY, itemId: null, sectionId: sectionAt(e) })
}
/** 누른 자리의 구간 id (붙여넣을 곳) */
function sectionAt(e) {
  const p = pagePoint(e)
  const r = layout.value.rows.find(row => p.y >= row.top && p.y < row.top + row.height)
  return r ? r.id : null
}

// ── 목록에서 끌어다 놓기 (6-3) — 목록 줄의 dataTransfer(DRAG_IMAGE_TYPE = 사진 id). 넣기는 편집기가 한다(dropImageAt) ──
const dropSectionId = ref(null) // 끄는 동안 놓일 구간 (테두리만)
const isImageDrag = e => !!e.dataTransfer && [...(e.dataTransfer.types || [])].includes(DRAG_IMAGE_TYPE)
function onDragOver(e) {
  if (!isImageDrag(e)) return
  e.preventDefault() // 놓을 수 있다고 알린다
  e.dataTransfer.dropEffect = 'copy'
  dropSectionId.value = sectionAt(e)
}
function onDragLeave(e) {
  if (!rootEl.value?.contains(e.relatedTarget)) dropSectionId.value = null
}
function onDrop(e) {
  if (!isImageDrag(e)) return
  e.preventDefault()
  dropSectionId.value = null
  const imageId = e.dataTransfer.getData(DRAG_IMAGE_TYPE)
  if (!imageId) return
  const p = pagePoint(e)
  const sectionId = sectionAt(e)
  const top = sectionId ? rowOf(sectionId).top : 0
  emit('drop-image', { imageId, sectionId, x: p.x, y: p.y - top }) // x·y = 그 구간 좌표 (놓은 자리 = 사진 가운데)
}

/** 이 아이템이 보이게 스크롤 (사진 목록에서 골랐을 때) */
function scrollToItem(itemId) {
  const root = rootEl.value?.querySelector(`[data-item-id="${itemId}"]`)
  root?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

// ── 보이는 사진 알리기 (스크롤 상자에 가려진 것은 안 보이는 것으로 친다 — IntersectionObserver 기본 root) ──
// 숨긴 요소는 사진을 그리지 않으므로 빼고 알린다 (AI 엔진 켜는 시점이 숨긴 요소를 기다리지 않게)
const rootEl = ref(null)
const shownEls = new Map() // item 요소 → { imageId, top }
let io = null
let mo = null
function reportVisible() {
  const ids = [...shownEls.entries()].filter(([el]) => !el.dataset.hidden).sort((a, b) => a[1].top - b[1].top).map(([, v]) => v.imageId)
  emit('visible', [...new Set(ids)])
}
function observeItems() {
  if (!io || !rootEl.value) return
  for (const el of shownEls.keys()) if (!el.isConnected) { shownEls.delete(el); io.unobserve(el) } // 없어진 요소
  for (const el of rootEl.value.querySelectorAll('[data-item-id]')) io.observe(el)
}
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !rootEl.value) return
  io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && e.target.isConnected) shownEls.set(e.target, { imageId: e.target.dataset.imageId, top: e.boundingClientRect.top })
      else shownEls.delete(e.target)
    }
    reportVisible()
  }, { rootMargin: '300px 0px' })
  observeItems()
  mo = new MutationObserver(observeItems) // 구간·요소가 바뀌면 새 요소도 본다
  mo.observe(rootEl.value, { childList: true, subtree: true })
})
onBeforeUnmount(() => { end(); io?.disconnect(); mo?.disconnect() })

/** 화면에 가장 많이 보이는 구간 id (전체 선택 Ctrl+A·붙여넣기 기본 자리) */
function sectionInView() {
  const secs = rootEl.value ? [...rootEl.value.querySelectorAll('[data-section-id]')] : []
  const vh = window.innerHeight
  let best = null, bestH = 0
  for (const el of secs) {
    const r = el.getBoundingClientRect()
    const h = Math.min(r.bottom, vh) - Math.max(r.top, 0)
    if (h > bestH) { bestH = h; best = el.dataset.sectionId }
  }
  return best
}
/** 이 구간이 보이게 스크롤 (구간을 추가·복제·옮긴 뒤 — 8-1 'nearest', 미니뷰에서 누름 — 8-2 'start') */
function scrollToSection(sectionId, block = 'nearest') {
  rootEl.value?.querySelector(`[data-section-id="${sectionId}"]`)?.scrollIntoView({ block, behavior: 'smooth' })
}
defineExpose({ scrollToItem, scrollToSection, sectionInView, isBusy: () => !!act })
</script>

<style scoped>
/* 페이지 바탕색은 구간 bg(문서 값)가 칠한다. 여기서는 그림자만 */
.st-page-paper { box-shadow: var(--st-shadow-page); }
.st-select-frame { box-shadow: 0 0 0 2px var(--st-accent); border-radius: 1px; }
.st-select-frame.is-multi { box-shadow: 0 0 0 1px var(--st-accent); }
.st-item-hidden { outline: 1px dashed var(--st-muted); outline-offset: -1px; background: transparent; opacity: 0.6; }
/* 자리 비율과 사진 비율이 다를 때(사진 바꾸기·한쪽 손잡이) 찌그러뜨리지 않고 자리에 맞춰 채운다 — 내보내기(13단계)도 같은 규칙 */
.st-item-img { object-fit: cover; }
.st-snap-guide { background: var(--st-accent); z-index: 4; }
/* 골라진 구간 (8-1) — 안쪽 테두리만. 높이 손잡이는 아래쪽 가장자리 가운데 */
.st-section-picked::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 2px var(--st-accent); pointer-events: none; z-index: 3; }
.st-section-label:hover { color: var(--st-ink-2); }
.st-section-handle { z-index: 5; cursor: ns-resize; display: flex; align-items: center; justify-content: center; }
.st-section-handle-grip { width: 40px; height: 6px; border-radius: 999px; background: var(--st-accent); box-shadow: 0 0 0 2px var(--st-card); }
.st-section-handle-size {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%); padding: 1px 6px; border-radius: 6px; white-space: nowrap;
  font-size: 11px; font-weight: 700; color: var(--st-ink); background: var(--st-card); border: 1px solid var(--st-line-strong);
}
/* 목록 사진을 끌고 있을 때 놓일 구간 (6-3) — 테두리만, 사진 위를 칠하지 않는다 */
.st-drop-target::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 2px var(--st-accent); pointer-events: none; z-index: 3; }
.st-marquee { border: 1px dashed var(--st-accent); background: var(--st-accent-soft); z-index: 4; }
.st-resize-handle {
  position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; pointer-events: auto;
  background: var(--st-ink); border: 1.5px solid var(--st-accent); border-radius: 2px;
}
.st-resize-handle.is-nw { left: 0; top: 0; cursor: nwse-resize; }
.st-resize-handle.is-n { left: 50%; top: 0; cursor: ns-resize; }
.st-resize-handle.is-ne { left: 100%; top: 0; cursor: nesw-resize; }
.st-resize-handle.is-e { left: 100%; top: 50%; cursor: ew-resize; }
.st-resize-handle.is-se { left: 100%; top: 100%; cursor: nwse-resize; }
.st-resize-handle.is-s { left: 50%; top: 100%; cursor: ns-resize; }
.st-resize-handle.is-sw { left: 0; top: 100%; cursor: nesw-resize; }
.st-resize-handle.is-w { left: 0; top: 50%; cursor: ew-resize; }
.st-rotate-stem { position: absolute; left: 50%; top: -22px; width: 1px; height: 22px; background: var(--st-accent); }
.st-rotate-handle {
  position: absolute; left: 50%; top: -34px; width: 22px; height: 22px; margin-left: -11px; pointer-events: auto; cursor: grab;
  display: flex; align-items: center; justify-content: center; border-radius: 999px;
  background: var(--st-card); color: var(--st-ink); border: 1.5px solid var(--st-accent);
}
.st-frame-lock {
  position: absolute; right: -2px; top: -22px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; background: var(--st-card); color: var(--st-ink-2); border: 1px solid var(--st-line-strong);
}
</style>
