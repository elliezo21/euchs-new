<template>
  <div
    v-if="open" ref="menuEl" class="fixed st-ctx-menu" :style="pos" role="menu" data-context-menu
    @contextmenu.prevent @pointerdown.stop
  >
    <template v-for="(m, i) in items" :key="m.key || `sep-${i}`">
      <div v-if="m.sep" class="st-ctx-sep" />
      <button
        v-else type="button" role="menuitem" class="st-ctx-item" :class="m.danger ? 'st-danger-text' : ''" :disabled="m.disabled"
        :data-ctx="m.key" @click="choose(m)"
      >
        <span class="flex-1 text-left">{{ m.label }}</span>
        <span v-if="m.keys" class="st-ctx-keys">{{ m.keys }}</span>
      </button>
    </template>
  </div>
</template>

<script setup>
// 우클릭 메뉴 (6-1단계) — 편집기가 항목을 정하고, 고르면 select(key). 바깥 누르기·Esc·스크롤·창 크기 바꾸기 = 닫기.
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  items: { type: Array, default: () => [] }, // [{ key, label, keys?, disabled?, danger? } | { sep: true }]
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
  emit('close')
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
watch(() => props.open, async open => {
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
.st-ctx-keys { font-size: 11px; color: var(--st-muted); }
.st-ctx-sep { height: 1px; margin: 5px 4px; background: var(--st-line); }
</style>
