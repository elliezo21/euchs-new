<template>
  <div ref="rootEl" class="relative h-full flex items-center gap-1 px-2 st-sel-bar" role="toolbar" aria-label="고른 요소 편집" data-select-bar @pointerdown.stop>
    <!-- 왼쪽 묶음: 그 요소에 맞는 모양 바꾸기 -->
    <div ref="leftEl" class="flex items-center gap-0.5 min-w-0 overflow-x-auto st-sel-scroll" :data-compact="compact ? String(compact) : null" data-select-bar-left>
      <template v-for="(b, i) in bar.left" :key="b.key">
        <span v-if="i > 0 && b.group && b.group !== bar.left[i - 1].group" class="st-sel-sep" />
        <button
          type="button" class="st-sel-btn" :class="[pop === b.pop && b.type === 'pop' ? 'is-open' : '', b.pressed || (b.type === 'hold' && holding) ? 'is-pressed' : '']"
          :disabled="b.disabled" :title="b.tip" :aria-label="b.tip" :aria-expanded="b.type === 'pop' ? pop === b.pop : null" :data-sel-btn="b.key"
          @click="b.type !== 'hold' && onButton(b, $event)"
          @pointerdown="b.type === 'hold' && startHold()" @pointerup="b.type === 'hold' && endHold()" @pointerleave="b.type === 'hold' && endHold()" @pointercancel="b.type === 'hold' && endHold()"
        >
          <component :is="ICONS[b.key]" class="w-4 h-4 shrink-0" :stroke-width="2" />
          <span v-if="compact < 2">{{ b.label }}</span>
          <span v-if="b.key === 'crop' && shapeText && compact < 2" class="st-sel-note" data-sel-shape>{{ shapeText }}</span>
        </button>
      </template>
      <span v-if="autoMark?.problem" class="st-badge st-badge-danger shrink-0 ml-1" :title="autoMark.reason" data-sel-auto-problem>확인 필요 · {{ autoMark.problemText }}</span>
    </div>
    <span class="flex-1" />
    <!-- 오른쪽 묶음: 복제 · 잠금 · 숨기기 · (그룹) · 삭제 -->
    <div class="flex items-center gap-0.5 shrink-0 pl-2 st-sel-right" data-select-bar-right>
      <button
        v-for="b in bar.right" :key="b.key" type="button" class="st-sel-btn" :class="[b.danger ? 'is-danger' : '', b.pressed ? 'is-pressed' : '']"
        :disabled="b.disabled" :title="b.tip" :aria-label="b.tip" :data-sel-btn="b.key" @click="$emit('command', b.cmd, {})"
      >
        <component :is="rightIcon(b)" class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span v-if="compact < 1">{{ b.label }}</span>
      </button>
    </div>

    <!-- 펼침 칸 (도구줄 바로 아래) — 슬라이더 하나 또는 넓은 설정(필터·글꼴 목록 등). 바깥 누르기·Esc·고른 것이 바뀌면 닫힘 -->
    <div
      v-if="pop" class="absolute st-card st-shadow-float st-sel-pop" :class="WIDE.has(pop) ? 'is-wide' : ''" :style="{ left: `${popLeft}px` }"
      :data-sel-pop="pop" @keydown.esc.stop.prevent="pop = null"
    >
      <!-- 크기 % (비율 유지) — 연 때의 크기 = 100% -->
      <div v-if="pop === 'size'" class="p-3 space-y-2">
        <div class="flex items-center"><span class="st-pop-title">크기</span><span class="ml-auto st-pop-value" data-sel-value="size">{{ sizePct }}%</span></div>
        <input type="range" :min="SIZE_PCT[0]" :max="SIZE_PCT[1]" step="1" class="w-full st-range" :value="sizePct" aria-label="크기 (%)" data-sel-range="size" @input="onSize" />
        <p class="st-desc-sm break-keep">연 때의 크기가 100%예요. 비율은 그대로예요.</p>
      </div>
      <!-- 회전 -->
      <div v-else-if="pop === 'rotate'" class="p-3 space-y-2">
        <div class="flex items-center"><span class="st-pop-title">회전</span><span class="ml-auto st-pop-value" data-sel-value="rotate">{{ rotation }}°</span></div>
        <input type="range" :min="ROTATE_DEG[0]" :max="ROTATE_DEG[1]" step="1" class="w-full st-range" :value="rotation" aria-label="회전 (°)" data-sel-range="rotate" @input="onRotate" @dblclick="$emit('command', 'rotation', { deg: 0 })" />
        <div class="flex gap-1">
          <button type="button" class="st-chip-btn" title="90° 돌리기" data-sel-cmd="rotate90" @click="$emit('command', 'rotate90', {})"><RotateCw class="w-3.5 h-3.5" :stroke-width="2" /> 90°</button>
          <button type="button" class="st-chip-btn" title="좌우 뒤집기" data-sel-cmd="flipX" @click="$emit('command', 'flipX', {})"><FlipHorizontal2 class="w-3.5 h-3.5" :stroke-width="2" /> 좌우</button>
          <button type="button" class="st-chip-btn" title="상하 뒤집기" data-sel-cmd="flipY" @click="$emit('command', 'flipY', {})"><FlipVertical2 class="w-3.5 h-3.5" :stroke-width="2" /> 상하</button>
        </div>
      </div>
      <!-- 불투명도 (100% = 다 보임) -->
      <div v-else-if="pop === 'opacity'" class="p-3 space-y-2">
        <div class="flex items-center"><span class="st-pop-title">불투명도</span><span class="ml-auto st-pop-value" data-sel-value="opacity">{{ opacityPct }}%</span></div>
        <input type="range" min="0" max="100" step="1" class="w-full st-range" :value="opacityPct" aria-label="불투명도 (%)" data-sel-range="opacity" @input="$emit('command', 'opacity', { v: Number($event.target.value) / 100, merge: true })" />
        <p class="st-desc-sm">100% = 다 보임 · 0% = 안 보임</p>
      </div>
      <!-- 앞뒤 순서 -->
      <div v-else-if="pop === 'order'" class="p-2 grid grid-cols-2 gap-1">
        <button v-for="o in ORDERS" :key="o.where" type="button" class="st-chip-btn" :title="o.tip" :data-sel-cmd="`order-${o.where}`" @click="$emit('command', 'order', { where: o.where })">
          <component :is="o.icon" class="w-3.5 h-3.5" :stroke-width="2" /> {{ o.label }}
        </button>
      </div>
      <!-- 정렬 (한 개 = 섹션 기준, 여러 개 = 고른 것끼리) -->
      <div v-else-if="pop === 'align'" class="p-2 space-y-1.5">
        <div class="st-desc-sm px-1">{{ selectedIds.length === 1 ? '정렬 (섹션 기준)' : '정렬 (고른 요소끼리)' }}</div>
        <div class="grid grid-cols-3 gap-1">
          <button v-for="a in ALIGNS" :key="a.where" type="button" class="st-chip-btn" :title="a.label" :data-sel-cmd="`align-${a.where}`" @click="$emit('command', 'align', { where: a.where })">
            <component :is="a.icon" class="w-3.5 h-3.5" :stroke-width="2" /> {{ a.short }}
          </button>
        </div>
      </div>
      <!-- 사진: 필터·조정 / 꾸미기 — 예전 왼쪽 사진 칸 그대로 (part) -->
      <StudioImageItemPanel
        v-else-if="(pop === 'look' || pop === 'deco') && photoItem" :part="pop" :item="photoItem" :look="look" :thumb-url="thumbUrl" :thumb-under="thumbUnder"
        @look="(n, o) => $emit('look', n, o)" @style="(p, o) => $emit('style', p, o)" @reset-look="$emit('reset-look')"
      />
      <!-- 글자 — 예전 왼쪽 글자 칸 그대로 (part) -->
      <StudioTextItemPanel
        v-else-if="TEXT_PARTS[pop]" :part="TEXT_PARTS[pop]" :page="page" :selected-ids="selectedIds" :can-paste-style="canPasteStyle"
        @text="(p, o) => $emit('text', p, o)" @style-copy="$emit('style-copy')" @style-paste="$emit('style-paste')"
      />
      <!-- 도형·선 — 예전 왼쪽 도형 칸 그대로 (part) -->
      <StudioShapeItemPanel
        v-else-if="SHAPE_PARTS[pop]" :part="SHAPE_PARTS[pop]" :page="page" :selected-ids="selectedIds"
        @shape="(p, o) => $emit('shape', p, o)" @line="(p, o) => $emit('line', p, o)"
      />
      <!-- 표 — 예전 왼쪽 [표 편집] 칸 그대로 (행·열 빼기·글꼴·크기·정렬·색·테두리·칸 목록) -->
      <StudioTableItemPanel
        v-else-if="pop === 'table'" :page="page" :selected-ids="selectedIds"
        @props="(p, o) => $emit('table-props', p, o)" @edit="e => $emit('table-edit', e)"
      />
    </div>
  </div>
</template>

<script setup>
// 작업판 맨 위 가로 도구줄 — 요소를 고르면 보인다 (안 고르면 편집기가 숨김). 예전 "요소 위 떠 있는 도구줄"(461c653)과
// 왼쪽 "고른 요소 설정" 칸(사진·글자·도형·표)을 합쳤다. 버튼 목록은 studioCanvasUi.selectBarButtons (종류별).
// 모든 바꾸기는 편집기로 보낸다 — command(name, args) = runCommand, 그 밖은 예전 칸과 같은 이벤트(look·style·text·shape·line·table-props·table-edit…)
// → 되돌리기·자동 저장은 예전 길 그대로. 넓은 설정은 예전 칸 컴포넌트를 part로 잘라 펼침 칸에 넣었다 (기능·저장 방식 같음).
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  Maximize2, RotateCw, RotateCcw, Blend, Layers, AlignCenter, Replace, Crop, SlidersHorizontal, Frame, Eraser, Columns2, Undo2,
  Type, ALargeSmall, Palette, Bold, AlignLeft, Sparkles, Shapes, PaintBucket, BoxSelect, Minus, Rows3, Columns3, Heading, Table2,
  CopyPlus, Lock, LockOpen, EyeOff, Eye, Group, Ungroup, Trash2, FlipHorizontal2, FlipVertical2,
  BringToFront, SendToBack, ChevronUp, ChevronDown,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
} from 'lucide-vue-next'
import StudioImageItemPanel from '@/components/studio/StudioImageItemPanel.vue'
import StudioTextItemPanel from '@/components/studio/StudioTextItemPanel.vue'
import StudioShapeItemPanel from '@/components/studio/StudioShapeItemPanel.vue'
import StudioTableItemPanel from '@/components/studio/StudioTableItemPanel.vue'
import { selectBarButtons, sizeFactor, SIZE_PCT, ROTATE_DEG } from '@/lib/studioCanvasUi'
import { findItem, groupCheck, anyGrouped, isValidImageItem, normAngle } from '@/lib/studioPage'
import { isValidTextItem } from '@/lib/studioText'
import { isValidShapeItem, isValidLineItem } from '@/lib/studioShape'
import { isValidTableItem } from '@/lib/studioTable'

const props = defineProps({
  page: { type: Object, required: true },
  selectedIds: { type: Array, required: true },
  photoItem: { type: Object, default: null },    // 사진 요소 하나만 골랐을 때 그 요소
  look: { type: Object, default: null },         // 그 사진의 필터·조정
  thumbUrl: { type: String, default: null },
  thumbUnder: { type: Object, default: null },
  shapeText: { type: String, default: '' },      // "잘림 · 띠 2"
  autoMark: { type: Object, default: null },     // 원클릭 확인 표시
  photoInfo: { type: String, default: '' },      // [지우기] 툴팁 둘째 줄 "대표 사진 · 547×547px · 120KB · 지움 2"
  fillCount: { type: Number, default: 0 },       // 그 사진의 지우기 레이어 수 — 0이면 [지우기 모두 되돌리기] 숨김
  canPasteStyle: { type: Boolean, default: false },
  sample: { type: Boolean, default: false },     // 예시 사진 하나를 골랐음 (studioSamples) → [내 사진으로 바꾸기]
})
// command(name, args) · replace · crop · erase · clear-all · compare(bool) · auto-revert · look · style · reset-look · text · style-copy · style-paste · shape · line · table-props · table-edit
const emit = defineEmits([
  'command', 'replace', 'crop', 'erase', 'clear-all', 'compare', 'auto-revert', 'look', 'style', 'reset-look',
  'text', 'style-copy', 'style-paste', 'shape', 'line', 'table-props', 'table-edit',
])

const items = computed(() => props.selectedIds.map(id => findItem(props.page, id)?.item).filter(Boolean))
const kinds = computed(() => new Set(items.value.map(it => (isValidImageItem(it) ? 'image' : isValidTextItem(it) ? 'text' : isValidShapeItem(it) ? 'shape' : isValidLineItem(it) ? 'line' : isValidTableItem(it) ? 'table' : 'other'))))
const tables = computed(() => items.value.filter(isValidTableItem))
const bar = computed(() => selectBarButtons({
  kinds: kinds.value, photo: !!props.photoItem, sample: props.sample, autoMark: props.autoMark, photoInfo: props.photoInfo, fillCount: props.fillCount,
  anyLocked: items.value.some(it => it.locked), allLocked: items.value.length > 0 && items.value.every(it => it.locked),
  anyHidden: items.value.some(it => it.hidden),
  canGroup: items.value.length >= 2 && groupCheck(props.page, props.selectedIds) !== 'same', canUngroup: anyGrouped(props.page, props.selectedIds),
  headerRow: tables.value.length ? tables.value.every(t => t.headerRow) : null, tableCount: tables.value.length,
}))

const ICONS = {
  size: Maximize2, rotate: RotateCw, opacity: Blend, order: Layers, align: AlignCenter,
  replace: Replace, sampleReplace: Replace, crop: Crop, look: SlidersHorizontal, deco: Frame, erase: Eraser, clearAll: RotateCcw, compare: Columns2, autoRevert: Undo2,
  font: Type, fontSize: ALargeSmall, textColor: Palette, weight: Bold, textAlign: AlignLeft, textMore: Sparkles,
  shapeKind: Shapes, fill: PaintBucket, stroke: BoxSelect, line: Minus,
  addRow: Rows3, addCol: Columns3, header: Heading, tableMore: Table2,
}
function rightIcon(b) {
  if (b.key === 'lock') return b.cmd === 'unlock' ? LockOpen : Lock
  if (b.key === 'hide') return b.cmd === 'show' ? Eye : EyeOff
  if (b.key === 'group') return b.cmd === 'ungroup' ? Ungroup : Group
  return b.key === 'duplicate' ? CopyPlus : Trash2
}
const TEXT_PARTS = { font: 'font', textSize: 'size', textColor: 'color', weight: 'weight', textAlign: 'align', textMore: 'more' }
const SHAPE_PARTS = { shapeKind: 'kind', fill: 'fill', stroke: 'stroke', line: 'line' }
const WIDE = new Set(['look', 'deco', 'table', 'textMore', 'font'])
const ORDERS = [
  { where: 'front', label: '맨 앞으로', tip: '모든 요소보다 위로', icon: BringToFront },
  { where: 'forward', label: '앞으로', tip: '다른 요소보다 위로', icon: ChevronUp },
  { where: 'backward', label: '뒤로', tip: '다른 요소보다 아래로', icon: ChevronDown },
  { where: 'back', label: '맨 뒤로', tip: '모든 요소보다 아래로', icon: SendToBack },
]
const ALIGNS = [
  { where: 'left', label: '왼쪽 맞춤', short: '왼쪽', icon: AlignStartVertical },
  { where: 'hcenter', label: '가로 가운데', short: '가운데', icon: AlignCenterVertical },
  { where: 'right', label: '오른쪽 맞춤', short: '오른쪽', icon: AlignEndVertical },
  { where: 'top', label: '위쪽 맞춤', short: '위', icon: AlignStartHorizontal },
  { where: 'vcenter', label: '세로 가운데', short: '가운데', icon: AlignCenterHorizontal },
  { where: 'bottom', label: '아래쪽 맞춤', short: '아래', icon: AlignEndHorizontal },
]

// ── 펼침 칸 ──
const rootEl = ref(null)
const pop = ref(null)
const popLeft = ref(0)
let sizeBase = null // [크기]를 연 때의 문서 (그 크기 = 100%)
const sizePct = ref(100)
function onButton(b, e) {
  if (b.type === 'pop') {
    if (pop.value === b.pop) { pop.value = null; return }
    pop.value = b.pop
    if (b.pop === 'size') { sizeBase = props.page; sizePct.value = 100 }
    const root = rootEl.value?.getBoundingClientRect(), r = e.currentTarget.getBoundingClientRect()
    const w = WIDE.has(b.pop) ? 320 : 250
    popLeft.value = root ? Math.max(4, Math.min(root.width - w - 4, r.left - root.left)) : 0
    return
  }
  pop.value = null
  if (b.key === 'replace' || b.key === 'sampleReplace') emit('replace')
  else if (b.key === 'crop') emit('crop')
  else if (b.key === 'erase') emit('erase')
  else if (b.key === 'clearAll') emit('clear-all')
  else if (b.key === 'autoRevert') emit('auto-revert')
  else if (b.key === 'addRow' || b.key === 'addCol') { if (tables.value.length === 1) emit('table-edit', { id: tables.value[0].id, op: { kind: b.key } }) }
  else if (b.key === 'header') emit('table-props', { headerRow: !(bar.value.left.find(x => x.key === 'header')?.pressed) }, {})
}
function onSize(e) {
  sizePct.value = Number(e.target.value)
  if (sizeBase) emit('command', 'scale', { base: sizeBase, factor: sizeFactor(sizePct.value) })
}
const rotation = computed(() => {
  const vals = [...new Set(items.value.map(it => normAngle(it.rotation || 0)))]
  return vals.length === 1 ? Math.round(vals[0]) : 0
})
function onRotate(e) { emit('command', 'rotation', { deg: Number(e.target.value), merge: true }) }
const opacityPct = computed(() => {
  const vals = [...new Set(items.value.map(it => it.opacity ?? 1))]
  return vals.length === 1 ? Math.round(vals[0] * 100) : 100
})

// 좁은 작업판: 버튼이 한 줄에 다 안 들어가면 차례로 줄인다 — 1 = 오른쪽 묶음(복제·잠금·숨기기·삭제)만 아이콘, 2 = 모두 아이콘
// (이름은 툴팁에 그대로). 그래도 넘치면 왼쪽 묶음만 가로로 밀어 본다
const leftEl = ref(null)
const compact = ref(0)
let ro = null
const overflows = () => { const el = leftEl.value; return !!el && el.scrollWidth > el.clientWidth + 1 }
function fit() {
  compact.value = 0
  nextTick(() => {
    if (!overflows()) return
    compact.value = 1
    nextTick(() => { if (overflows()) compact.value = 2 })
  })
}
watch(() => bar.value.left.map(b => b.key).join(',') + bar.value.right.map(b => b.label).join(','), fit)

// 원본 비교 — 누르고 있는 동안만
const holding = ref(false)
function startHold() { if (!holding.value) { holding.value = true; emit('compare', true) } }
function endHold() { if (holding.value) { holding.value = false; emit('compare', false) } }

watch(() => props.selectedIds.join(','), () => { pop.value = null; sizeBase = null; endHold() })
// 표 하나일 때만 행·열 추가 (여러 개면 [표 모양]에서 모양만)
watch(() => bar.value.left.map(b => b.pop).join(','), keys => { if (pop.value && !keys.split(',').includes(pop.value)) pop.value = null })
function onDocDown(e) { if (pop.value && !rootEl.value?.contains(e.target)) pop.value = null }
function onKey(e) { if (pop.value && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pop.value = null } }
onMounted(() => {
  document.addEventListener('pointerdown', onDocDown, true); window.addEventListener('keydown', onKey, true)
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) { ro = new ResizeObserver(fit); ro.observe(rootEl.value) }
  fit()
})
onBeforeUnmount(() => { ro?.disconnect(); endHold(); document.removeEventListener('pointerdown', onDocDown, true); window.removeEventListener('keydown', onKey, true) })
defineExpose({ isOpen: () => !!pop.value })
</script>

<style scoped>
.st-sel-bar { background: var(--st-bar); border-bottom: 1px solid var(--st-line-strong); }
.st-sel-scroll { scrollbar-width: thin; }
.st-sel-btn {
  display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 7px; border: 0; border-radius: 8px; cursor: pointer; flex: none;
  background: transparent; color: var(--st-ink-2); font-size: 12px; font-weight: 700; white-space: nowrap;
}
.st-sel-btn:hover:not(:disabled) { background: var(--st-card-hover); color: var(--st-ink); }
.st-sel-btn.is-open, .st-sel-btn.is-pressed { background: var(--st-accent-soft); color: var(--st-accent); }
.st-sel-btn.is-danger:hover:not(:disabled) { color: var(--st-danger); }
.st-sel-btn:disabled { opacity: 0.4; cursor: default; }
.st-sel-sep { width: 1px; height: 20px; margin: 0 4px; background: var(--st-line-strong); flex: none; }
.st-sel-right { border-left: 1px solid var(--st-line-strong); }
.st-sel-note { font-size: 10px; color: var(--st-accent); }
.st-sel-pop { top: calc(100% + 4px); z-index: 20; width: 250px; max-height: min(70vh, 560px); overflow-y: auto; }
.st-sel-pop.is-wide { width: 320px; }
.st-pop-title { font-size: 12px; font-weight: 800; color: var(--st-ink); }
.st-pop-value { font-size: 12px; font-weight: 700; color: var(--st-ink-2); font-variant-numeric: tabular-nums; }
.st-range { accent-color: var(--st-accent); }
.st-chip-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 30px; padding: 0 8px; border-radius: 8px; cursor: pointer;
  font-size: 12px; font-weight: 700; border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2); flex: 1 1 auto;
}
.st-chip-btn:hover { border-color: var(--st-accent); color: var(--st-ink); }
</style>
