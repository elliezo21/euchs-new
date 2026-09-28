<template>
  <div data-mk-tags>
    <ul v-if="modelValue.length" class="flex flex-wrap gap-1.5 mb-2">
      <li v-for="(t, i) in modelValue" :key="`${i}:${t}`" class="tag-chip" :data-mk-tag="t">
        <input
          v-if="editing === i" ref="editInput" v-model="draft" class="tag-edit" :maxlength="maxLength" :style="{ width: `${Math.max(4, draft.length + 2)}ch` }"
          @keydown.enter.prevent="commitEdit" @keydown.esc.prevent.stop="editing = -1" @blur="commitEdit"
        />
        <button v-else type="button" class="tag-text" title="눌러서 고치기" @click="startEdit(i)">{{ t }}</button>
        <button type="button" class="tag-x" :aria-label="`${t} 빼기`" :data-mk-tag-remove="t" @click="remove(i)">×</button>
      </li>
    </ul>
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="input" class="st-input flex-1 min-w-[160px]" :maxlength="maxLength * 4" :disabled="modelValue.length >= max"
        :placeholder="modelValue.length >= max ? `${max}개를 모두 채웠어요` : '태그를 쓰고 Enter (쉼표로 여러 개)'" data-mk-tag-input
        @keydown.enter.prevent="add" @keydown="onKey" @blur="add"
      />
      <span class="text-[12px] st-muted" data-mk-tag-count>{{ modelValue.length }} / {{ max }}</span>
      <slot />
    </div>
    <ul v-if="removed.length" class="mt-1.5 text-[12px] st-muted space-y-0.5" data-mk-tag-removed>
      <li v-for="(r, i) in removed" :key="i">"{{ r.tag }}" 뺌 — {{ r.reason }}</li>
    </ul>
  </div>
</template>

<script setup>
// 검색태그 칩 — 추가·삭제·고치기. 정리 규칙(허용 글자·20자·중복·상표·20개)은 api/_coupangFields.js cleanSearchTags 하나
import { ref, nextTick } from 'vue'
import { cleanSearchTags, TAG_MAX, TAG_LEN } from '../../../api/_coupangFields.js'

const props = defineProps({ modelValue: { type: Array, default: () => [] }, brand: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const max = TAG_MAX
const maxLength = TAG_LEN
const input = ref('')
const removed = ref([])
const editing = ref(-1)
const draft = ref('')
const editInput = ref(null)

function apply(list) {
  const r = cleanSearchTags(list, { brand: props.brand })
  removed.value = r.removed
  emit('update:modelValue', r.tags)
}
function add() {
  const parts = input.value.split(',').map(s => s.trim()).filter(Boolean)
  input.value = ''
  if (parts.length) apply([...props.modelValue, ...parts])
}
function onKey(e) {
  if (e.key === ',') { e.preventDefault(); add() }
}
function remove(i) {
  removed.value = []
  emit('update:modelValue', props.modelValue.filter((_, k) => k !== i))
}
async function startEdit(i) {
  editing.value = i
  draft.value = props.modelValue[i]
  await nextTick()
  const el = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
  el?.focus()
}
function commitEdit() {
  const i = editing.value
  if (i < 0) return
  editing.value = -1
  const next = [...props.modelValue]
  if (draft.value.trim()) next[i] = draft.value.trim()
  else next.splice(i, 1)
  apply(next)
}
/** 밖에서 추천 태그를 더할 때 — 지금 목록 뒤에 붙이고 같은 규칙으로 정리 */
function addMany(list) { apply([...props.modelValue, ...list]) }
defineExpose({ addMany })
</script>

<style scoped>
.tag-chip { display: inline-flex; align-items: center; height: 28px; border-radius: 8px; background: var(--st-soft); border: 1px solid var(--st-line); overflow: hidden; }
.tag-text { padding: 0 4px 0 10px; font-size: 13px; font-weight: 700; color: var(--st-ink); }
.tag-edit { margin-left: 6px; padding: 0 4px; height: 22px; font-size: 13px; color: var(--st-ink); background: var(--st-surface); border: 1px solid var(--st-accent); border-radius: 5px; outline: none; }
.tag-x { width: 24px; height: 28px; font-size: 15px; line-height: 1; color: var(--st-muted); }
.tag-x:hover { color: var(--st-ink); }
</style>
