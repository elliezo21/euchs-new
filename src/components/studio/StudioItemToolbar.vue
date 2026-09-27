<template>
  <div
    ref="barEl" class="absolute st-float-bar" :style="{ left: `${pos.left}px`, top: `${pos.top}px` }" role="toolbar" aria-label="고른 요소"
    :data-item-toolbar="pos.side" @pointerdown.stop @dblclick.stop @contextmenu.stop.prevent
  >
    <template v-for="b in buttons" :key="b.key">
      <span v-if="b.key === 'more'" class="st-float-sep" />
      <button
        type="button" class="st-float-btn" :class="[b.danger ? 'is-danger' : '', b.pressed || (b.key === 'more' && moreOpen) ? 'is-pressed' : '']"
        :disabled="b.disabled" :title="b.tip" :aria-label="b.tip" :aria-expanded="b.key === 'more' ? moreOpen : null"
        :data-item-bar="b.key" @click="onButton(b)"
      >
        <component :is="iconOf(b)" class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span v-if="b.label" class="st-float-label">{{ b.label }}</span>
      </button>
    </template>

    <!-- [⋯] 팝오버: 위치·크기(X·Y·가로·세로·각도·투명도) · 회전·뒤집기·겹침 순서 · 정렬(섹션 기준) · 그룹 — 예전 왼쪽 "고른 요소" 칸 그대로 -->
    <div
      v-if="moreOpen" ref="popEl" class="st-float-pop st-card st-shadow-float" :style="popStyle" data-item-popover
      @pointerdown.stop @keydown.esc.stop.prevent="moreOpen = false"
    >
      <div class="flex items-center justify-between pl-3 pr-1 pt-1">
        <span class="text-[11px] font-bold st-muted">고른 요소 더 보기</span>
        <button type="button" class="st-icon-btn" title="닫기 (Esc)" data-item-popover-close @click="moreOpen = false"><X class="w-4 h-4" :stroke-width="2" /></button>
      </div>
      <StudioTransformPanel :page="page" :selected-ids="selectedIds" @command="(n, a) => $emit('command', n, a)" />
    </div>
  </div>
</template>

<script setup>
// 캔버스 요소 도구줄 — 요소를 고르면 위쪽(공간이 없으면 아래쪽)에 [복제][잠금][숨기기][앞으로][뒤로][삭제][⋯].
// 버튼은 command(name, args)만 보낸다 — 편집기의 runCommand 하나가 한다 (왼쪽 패널·우클릭·단축키와 같은 길 → 되돌리기·자동 저장 그대로).
// 자리 계산은 studioCanvasUi.floatBarPosition (페이지 요소 기준 화면 px — StudioPageView가 box·view를 준다).
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { CopyPlus, Lock, LockOpen, EyeOff, Eye, ArrowUpToLine, ArrowDownToLine, Trash2, MoreHorizontal, X } from 'lucide-vue-next'
import StudioTransformPanel from '@/components/studio/StudioTransformPanel.vue'
import { itemBarButtons, floatBarPosition } from '@/lib/studioCanvasUi'
import { findItem } from '@/lib/studioPage'

const props = defineProps({
  page: { type: Object, required: true },
  selectedIds: { type: Array, required: true },
  box: { type: Object, required: true },   // 고른 요소를 감싸는 상자 (페이지 요소 기준 화면 px)
  view: { type: Object, required: true },  // 스크롤 칸에 보이는 영역 (같은 기준)
  above: { type: Number, default: 48 },    // 위쪽에서 비울 거리 (회전 손잡이·표 안내)
  below: { type: Number, default: 16 },    // 아래쪽에서 비울 거리 (손잡이·[+ 줄])
})
const emit = defineEmits(['command'])

const items = computed(() => props.selectedIds.map(id => findItem(props.page, id)?.item).filter(Boolean))
const buttons = computed(() => itemBarButtons({
  anyLocked: items.value.some(it => it.locked),
  allLocked: items.value.length > 0 && items.value.every(it => it.locked),
  anyHidden: items.value.some(it => it.hidden),
}))
const ICONS = { duplicate: CopyPlus, forward: ArrowUpToLine, backward: ArrowDownToLine, delete: Trash2, more: MoreHorizontal }
/** 잠금·숨기기는 지금 상태에 맞는 그림 (잠김 = 열린 자물쇠 "잠금 풀기", 숨김 = 눈 "보이기") */
function iconOf(b) {
  if (b.key === 'lock') return b.cmd === 'unlock' ? LockOpen : Lock
  if (b.key === 'hide') return b.cmd === 'show' ? Eye : EyeOff
  return ICONS[b.key]
}

// 막대 크기 (그려진 뒤 잰다 — 처음 한 번은 어림값)
const barEl = ref(null)
const barSize = ref({ w: 380, h: 38 })
let ro = null
onMounted(() => {
  if (!barEl.value || typeof ResizeObserver === 'undefined') return
  ro = new ResizeObserver(() => { if (barEl.value) barSize.value = { w: barEl.value.offsetWidth, h: barEl.value.offsetHeight } })
  ro.observe(barEl.value)
})
const pos = computed(() => floatBarPosition({ box: props.box, bar: barSize.value, view: props.view, above: props.above, below: props.below }))

function onButton(b) {
  if (b.cmd === 'more') { moreOpen.value = !moreOpen.value; return }
  emit('command', b.cmd, b.args || {})
}

// ── [⋯] 팝오버 — 화면(창) 안에 들어오게 고정 자리. 바깥 누르기·Esc·고른 것이 바뀌면 닫힘 ──
const moreOpen = ref(false)
const popEl = ref(null)
const popStyle = ref({})
const POP_W = 300
function placePop() {
  const b = barEl.value?.getBoundingClientRect()
  if (!b) return
  const vw = window.innerWidth, vh = window.innerHeight, m = 8
  const left = Math.max(m, Math.min(vw - POP_W - m, b.left + b.width - POP_W))
  const spaceBelow = vh - b.bottom - m, spaceAbove = b.top - m
  const below = spaceBelow >= 260 || spaceBelow >= spaceAbove
  const maxH = Math.max(160, (below ? spaceBelow : spaceAbove) - 6)
  popStyle.value = below
    ? { left: `${left}px`, top: `${b.bottom + 6}px`, maxHeight: `${maxH}px`, width: `${POP_W}px` }
    : { left: `${left}px`, bottom: `${vh - b.top + 6}px`, maxHeight: `${maxH}px`, width: `${POP_W}px` }
}
watch(moreOpen, open => { if (open) nextTick(placePop) })
watch(() => [pos.value.left, pos.value.top], () => { if (moreOpen.value) nextTick(placePop) })
watch(() => props.selectedIds.join(','), () => { moreOpen.value = false })
function onDocDown(e) {
  if (!moreOpen.value) return
  if (barEl.value?.contains(e.target)) return
  moreOpen.value = false
}
function onKey(e) {
  // 팝오버가 열려 있으면 Esc = 팝오버만 닫기 (편집기의 "선택 풀기"보다 먼저)
  if (moreOpen.value && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); moreOpen.value = false }
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocDown, true)
  window.addEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  document.removeEventListener('pointerdown', onDocDown, true)
  window.removeEventListener('keydown', onKey, true)
})
defineExpose({ isOpen: () => moreOpen.value })
</script>

<style scoped>
.st-float-bar {
  z-index: 7; display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 10px; white-space: nowrap;
  background: var(--st-bar); border: 1px solid var(--st-line-strong); box-shadow: var(--st-shadow-float);
}
.st-float-btn {
  display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 8px; border: 0; border-radius: 7px; cursor: pointer;
  background: transparent; color: var(--st-ink-2); font-size: 12px; font-weight: 700;
}
.st-float-btn:hover:not(:disabled) { background: var(--st-card-hover); color: var(--st-ink); }
.st-float-btn.is-pressed { background: var(--st-accent-soft); color: var(--st-accent); }
.st-float-btn.is-danger:hover:not(:disabled) { color: var(--st-danger, #ff6b6b); }
.st-float-btn:disabled { opacity: 0.4; cursor: default; }
.st-float-sep { width: 1px; height: 18px; margin: 0 2px; background: var(--st-line-strong); }
.st-float-pop { position: fixed; z-index: 45; overflow-y: auto; white-space: normal; }
</style>
