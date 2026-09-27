<template>
  <StudioModal :open="open" wide title="단축키" @close="$emit('close')">
    <div class="max-h-[62vh] overflow-y-auto pr-1 space-y-5" data-shortcuts>
      <section v-for="g in groups" :key="g.title">
        <h4 class="text-[13px] font-extrabold st-ink">{{ g.title }}</h4>
        <table class="mt-2 w-full st-sc-table">
          <tbody>
            <tr v-for="[k, what] in g.rows" :key="k" data-shortcut-row>
              <td class="st-sc-key"><kbd v-for="(part, i) in k.split(' · ')" :key="i" class="st-kbd">{{ part }}</kbd></td>
              <td class="st-sc-what break-keep">{{ what }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <p class="st-desc-sm break-keep">글자를 고치는 중이거나 입력칸에 쓰는 중에는 단축키가 쉬어요.</p>
    </div>
    <template #actions>
      <button type="button" class="st-btn st-btn-primary" data-shortcuts-close @click="$emit('close')">닫기</button>
    </template>
  </StudioModal>
</template>

<script setup>
// 단축키 표 (14단계) — 편집기 [가이드] 메뉴 · ? 키로 연다. Esc·[닫기]·바깥 = 닫기.
// 표 내용은 src/data/studioEditorGuide.js SHORTCUT_GROUPS (실제 코드에 있는 키만). Mac이면 Ctrl을 Cmd로 보여 준다.
import { computed, watch, onBeforeUnmount } from 'vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import { SHORTCUT_GROUPS } from '@/data/studioEditorGuide'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '')
const groups = computed(() => SHORTCUT_GROUPS.map(g => ({
  title: g.title,
  rows: g.rows.map(([k, what]) => [IS_MAC ? k.replace(/Ctrl/g, 'Cmd').replace(/Alt/g, 'Option') : k, what]),
})))

// Esc = 닫기 (편집기 단축키보다 먼저 — 창이 열린 동안 편집기 단축키는 쉰다)
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); emit('close') }
}
watch(() => props.open, v => {
  if (v) window.addEventListener('keydown', onKey, true)
  else window.removeEventListener('keydown', onKey, true)
}, { immediate: true })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.st-sc-table { border-collapse: collapse; }
.st-sc-table tr + tr td { border-top: 1px solid var(--st-line); }
.st-sc-key { width: 46%; padding: 7px 10px 7px 0; vertical-align: top; }
.st-sc-what { padding: 7px 0; font-size: 13px; color: var(--st-ink-2); }
.st-kbd {
  display: inline-block; margin: 0 4px 4px 0; padding: 2px 7px; border-radius: 6px; font-size: 12px; font-weight: 700; font-family: inherit;
  color: var(--st-ink); background: var(--st-card); border: 1px solid var(--st-line-strong, var(--st-line));
}
</style>
