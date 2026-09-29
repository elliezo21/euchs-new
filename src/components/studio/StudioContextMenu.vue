<template>
  <div
    v-if="open" ref="menuEl" class="fixed st-ctx-menu" :style="pos" role="menu" data-context-menu
    @contextmenu.prevent @pointerdown.stop
  >
    <template v-for="(m, i) in items" :key="m.key || `sep-${i}`">
      <div v-if="m.sep" class="st-ctx-sep" />
      <div v-else-if="m.title" class="st-ctx-title" data-ctx-title>{{ m.title }}</div>
      <button
        v-else type="button" role="menuitem" class="st-ctx-item" :class="[m.danger ? 'st-danger-text' : '', m.thumb ? 'has-thumb' : '', m.active ? 'is-active' : '']" :disabled="m.disabled"
        :data-ctx="m.key" @click="choose(m)"
      >
        <!-- 겹친 요소 목록 줄: 레이어 목록과 같은 작은 그림 -->
        <StudioLayerThumb v-if="m.thumb" :item="m.thumb" :views="views" :dim="!!m.thumb.hidden" />
        <span class="flex-1 min-w-0 truncate text-left">{{ m.label }}</span>
        <span v-if="m.keys" class="st-ctx-keys">{{ m.keys }}</span>
      </button>
    </template>
  </div>
</template>

<script setup>
// 우클릭 메뉴 (6-1단계) — 편집기가 항목을 정하고, 고르면 select(key). 바깥 누르기·Esc·스크롤·창 크기 바꾸기 = 닫기.
// 항목을 바꿔 다시 열면(겹친 요소 목록) 크기를 다시 재서 화면 안에 둔다
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import StudioLayerThumb from '@/components/studio/StudioLayerThumb.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  // [{ key, label, keys?, disabled?, danger?, thumb?(페이지 요소 — 작은 그림), active? } | { sep: true } | { title }]
  items: { type: Array, default: () => [] },
  views: { type: Object, default: () => ({}) }, // 사진 요소 작은 그림 (편집기의 화면용 작은 사진)
})
const emit = defineEmits(['select', 'close'])
const menuEl = ref(null)
const size = ref({ w: 0, h: 0 })

// 화면 밖으로 나가지 않게
const pos = computed(() => ({
  left: `${Math.max(4, Math.min(props.x, window.innerWidth - size.value.w - 4))}px`,
  top: `${Math.max(4, Math.min(props.y, window.innerHeight - size.value.h - 4))}px`,
}))

function choose(m) {
  if (m.disabled) return
  emit('select', m.key)
  if (!m.keep) emit('close') // keep = 메뉴가 항목을 바꿔 그대로 열려 있음 (겹친 요소 목록으로)
}
function close() { emit('close') }
function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() } }
function listen(on) {
  const f = on ? 'addEventListener' : 'removeEventListener'
  window[f]('pointerdown', close)
  window[f]('keydown', onKey, true)
  window[f]('resize', close)
  window[f]('blur', close)
  window[f]('scroll', close, true)
}
watch([() => props.open, () => props.items], async ([open]) => {
  listen(false)
  if (!open) return
  await nextTick()
  const r = menuEl.value?.getBoundingClientRect()
  size.value = { w: r?.width || 0, h: r?.height || 0 }
  listen(true)
})
onBeforeUnmount(() => listen(false))
</script>

<style scoped>
.st-ctx-menu {
  z-index: 40; min-width: 200px; padding: 6px; border-radius: 12px;
  background: var(--st-panel); border: 1px solid var(--st-line-strong); box-shadow: var(--st-shadow-float);
}
.st-ctx-item {
  width: 100%; display: flex; align-items: center; gap: 12px; height: 30px; padding: 0 10px; border-radius: 8px;
  font-size: 13px; font-weight: 600; color: var(--st-ink); background: transparent; border: 0; cursor: pointer;
}
.st-ctx-item:hover:not(:disabled) { background: var(--st-card-hover); }
.st-ctx-item:disabled { opacity: 0.4; cursor: default; }
.st-ctx-item.has-thumb { height: 38px; gap: 8px; padding-left: 6px; max-width: 280px; }
.st-ctx-item.is-active { background: var(--st-accent-soft); }
.st-ctx-title { padding: 4px 10px 6px; font-size: 11px; font-weight: 700; color: var(--st-muted); }
.st-ctx-keys { font-size: 11px; color: var(--st-muted); }
.st-ctx-sep { height: 1px; margin: 5px 4px; background: var(--st-line); }
</style>
