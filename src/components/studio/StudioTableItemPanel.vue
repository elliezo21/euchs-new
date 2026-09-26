<template>
  <div class="px-4 pt-3 pb-4 space-y-4 st-border-b" data-table-item-panel>
    <div class="flex items-center gap-2">
      <span class="text-[13px] font-extrabold st-ink">표 편집</span>
      <span v-if="tables.length > 1" class="st-muted text-[11px] font-bold">표 {{ tables.length }}개에 함께 적용</span>
      <span v-else-if="tables.length < all.length" class="st-muted text-[11px] font-bold">표에만 적용</span>
    </div>

    <!-- 칸 격자 (표 하나일 때) — 일반 input이라 한글 입력이 그대로. 칸을 벗어나거나 Enter = 반영 (칸 하나 = 이력 1개) -->
    <div v-if="one" class="space-y-2" data-table-grid>
      <div class="grid gap-0.5" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }">
        <template v-for="(row, r) in one.cells" :key="r">
          <input
            v-for="(cell, c) in row" :key="`${r}-${c}`" type="text" class="st-cell-input" :class="one.headerRow && r === 0 ? 'is-header' : ''"
            :value="cell" :maxlength="TABLE_CELL_MAX" spellcheck="false" :data-table-cell="`${r}-${c}`" :title="`${r + 1}행 ${c + 1}열`"
            @focus="onCellFocus(r, c, $event)" @change="commitCell(r, c, $event.target)" @keydown.enter.prevent="$event.target.blur()"
          />
        </template>
      </div>
      <div class="flex items-center gap-1 flex-wrap">
        <span class="text-[11px] font-bold st-muted mr-1" data-table-size>{{ rows }}행 × {{ cols }}열</span>
        <button type="button" class="st-chip" :disabled="rows >= TABLE_LIMITS.rows[1]" data-table-op="addRow" @click="edit('addRow')">행 추가</button>
        <button type="button" class="st-chip" :disabled="rows <= TABLE_LIMITS.rows[0]" data-table-op="removeRow" @click="edit('removeRow')">행 빼기</button>
        <button type="button" class="st-chip" :disabled="cols >= TABLE_LIMITS.cols[1]" data-table-op="addCol" @click="edit('addCol')">열 추가</button>
        <button type="button" class="st-chip" :disabled="cols <= TABLE_LIMITS.cols[0]" data-table-op="removeCol" @click="edit('removeCol')">열 빼기</button>
      </div>
      <p class="st-desc-sm break-keep">행은 맨 아래, 열은 맨 오른쪽에 더하고 빼요. 칸마다 {{ TABLE_CELL_MAX }}자까지, 넘치면 "…"로 보여요.</p>
    </div>

    <label class="flex items-center gap-2 text-[12px] font-bold st-ink-2 cursor-pointer" data-table-header>
      <input type="checkbox" class="st-check" :checked="common('headerRow') === true" @change="emitProps({ headerRow: $event.target.checked })" />
      첫 줄을 제목 줄로
    </label>

    <div>
      <div class="st-xfield-label mb-1">글꼴</div>
      <select class="st-select" :value="common('fontFamily')" data-table-font @change="emitProps({ fontFamily: $event.target.value })">
        <option v-if="common('fontFamily') === ''" value="" disabled>—</option>
        <option v-for="f in STUDIO_FONTS" :key="f.key" :value="f.key">{{ f.label }}</option>
      </select>
    </div>
    <NumRow :f="SIZE" :items="tables" @set="(v, m) => emitProps({ fontSize: v }, m)" />
    <div>
      <div class="st-xfield-label mb-1">정렬</div>
      <div class="flex gap-1">
        <button
          v-for="a in ALIGNS" :key="a.value" type="button" class="st-chip" :class="common('align') === a.value ? 'is-active' : ''"
          :data-table-align="a.value" @click="emitProps({ align: a.value })"
        >{{ a.label }}</button>
      </div>
    </div>
    <ColorRow v-for="c in COLOR_ROWS" :key="c.field" :label="c.label" :items="tables" :field="c.field" :colors="c.colors" @pick="(v, m) => emitProps({ [c.field]: v }, m)" />
    <NumRow :f="BORDER" :items="tables" @set="(v, m) => emitProps({ borderWidth: v }, m)" />
  </div>
</template>

<script setup>
// 사이즈표 속성 칸 "표 편집" (11-2) — 공통 조작 칸(StudioTransformPanel) 아래. 표를 하나 고르면 칸 격자 + 행·열 버튼, 여러 개면 모양만(공통 값).
// 보내는 것: props(patch, { merge, key }) = 고른 표 모두의 모양 / edit({ id, op }) = 그 표 하나의 칸·행·열 (op = studioTable.editTableItem).
// 칸 글자는 칸을 벗어나거나 Enter일 때 한 번 반영 = 이력 1개. 칸을 고친 채로 다른 곳을 눌러 이 칸이 사라져도(표 선택 해제) 사라지기 전에 반영한다.
// 숫자 칸 = Enter·벗어나기 반영, 슬라이더·색 고르기 = 끄는 동안 이력 1개 (11-1 도형 칸과 같은 방식)
import { computed, watch, nextTick, h, defineComponent, onBeforeUnmount } from 'vue'
import { Palette } from 'lucide-vue-next'
import { findItem } from '@/lib/studioPage'
import { isValidTableItem, TABLE_LIMITS, TABLE_CELL_MAX, cleanCellText } from '@/lib/studioTable'
import { STUDIO_FONTS } from '@/lib/studioFonts'

const props = defineProps({
  page: { type: Object, required: true },
  selectedIds: { type: Array, required: true },
})
const emit = defineEmits(['props', 'edit'])

const SIZE = { key: 'fontSize', label: '글자 크기', unit: 'px', min: TABLE_LIMITS.fontSize[0], max: TABLE_LIMITS.fontSize[1], rangeMax: 48 }
const BORDER = { key: 'borderWidth', label: '테두리 두께', unit: 'px', min: TABLE_LIMITS.borderWidth[0], max: TABLE_LIMITS.borderWidth[1], rangeMax: 6 }
const ALIGNS = [{ value: 'left', label: '왼쪽' }, { value: 'center', label: '가운데' }, { value: 'right', label: '오른쪽' }]
const INK = [{ value: '#111111', label: '검정' }, { value: '#333333', label: '진한 회색' }, { value: '#ffffff', label: '흰색' }]
const PALE = [{ value: '#ffffff', label: '흰색' }, { value: '#f1f3f6', label: '연한 회색' }, { value: '#111111', label: '검정' }]
const COLOR_ROWS = [
  { field: 'color', label: '글자 색', colors: INK },
  { field: 'headerBg', label: '제목 줄 바탕', colors: PALE },
  { field: 'headerColor', label: '제목 줄 글자', colors: INK },
  { field: 'cellBg', label: '칸 바탕', colors: PALE },
  { field: 'borderColor', label: '테두리 색', colors: [{ value: '#d5d9e0', label: '연한 회색' }, { value: '#111111', label: '검정' }, { value: '#ffffff', label: '흰색' }] },
]

const all = computed(() => props.selectedIds.map(id => findItem(props.page, id)?.item).filter(Boolean))
const tables = computed(() => all.value.filter(isValidTableItem))
const one = computed(() => (tables.value.length === 1 ? tables.value[0] : null))
const rows = computed(() => one.value?.cells.length ?? 0)
const cols = computed(() => one.value?.cells[0].length ?? 0)

/** 고른 표가 모두 같은 값이면 그 값, 다르면 '' */
function common(key) {
  const vals = [...new Set(tables.value.map(it => it[key]))]
  return vals.length === 1 ? vals[0] : ''
}
function emitProps(patch, merge) { emit('props', patch, merge ? { merge: true, key: merge } : {}) }
function edit(kind) { if (one.value) emit('edit', { id: one.value.id, op: { kind } }) }

// ── 칸 글자 ── 고치는 중인 칸(표 id·행·열·입력 칸)을 기억해 두고, 이 칸이 사라질 때 아직 반영 안 된 글자를 보낸다
let focused = null // { id, r, c, el } — 칸을 누른 때의 표 id (그 사이 다른 표를 골라도 원래 표에 반영)
function onCellFocus(r, c, e) { focused = { id: one.value?.id, r, c, el: e.target } }
/** 그 표의 그 칸에 입력 칸 글자를 반영 (같으면 안 보냄) */
function sendCell(id, r, c, value) {
  const it = id ? findItem(props.page, id)?.item : null
  if (!it || !isValidTableItem(it) || it.cells[r]?.[c] === undefined) return
  const next = cleanCellText(value)
  if (it.cells[r][c] !== next) emit('edit', { id, op: { kind: 'cell', r, c, text: next } })
}
function commitCell(r, c, el) {
  const id = focused && focused.el === el ? focused.id : one.value?.id
  focused = null
  sendCell(id, r, c, el.value)
  nextTick(() => { if (one.value?.cells[r]?.[c] !== undefined) el.value = one.value.cells[r][c] }) // 잘린 값(줄바꿈·글자 수)을 칸에 다시
}
/** 고치던 칸이 반영되지 않은 채 격자가 바뀌거나(다른 표를 고름) 사라질 때 — 먼저 반영 */
function flushFocused() {
  const f = focused
  focused = null
  if (f?.el) sendCell(f.id, f.r, f.c, f.el.value)
}
watch(() => one.value?.id, (nid, oid) => { if (focused && focused.id === oid) flushFocused() })
onBeforeUnmount(flushFocused)

// 숫자 칸 + 슬라이더 한 줄 — set(값, mergeKey|undefined). 반영 뒤 칸에 실제 값을 다시 쓴다(범위 밖 값은 잘리므로)
const NumRow = defineComponent({
  props: { f: { type: Object, required: true }, items: { type: Array, required: true } },
  emits: ['set'],
  setup(p, { emit: e }) {
    const shownOf = () => {
      const vals = [...new Set(p.items.map(it => it[p.f.key]))]
      return vals.length === 1 ? vals[0] : ''
    }
    return () => {
      const shown = shownOf()
      return h('div', { class: 'grid grid-cols-[96px_1fr] items-end gap-2', 'data-num': p.f.key }, [
        h('label', { class: 'st-xfield' }, [
          h('span', { class: 'st-xfield-label' }, p.f.label),
          h('span', { class: 'st-xfield-box' }, [
            h('input', {
              type: 'number', step: 1, min: p.f.min, max: p.f.max, value: shown, placeholder: '—',
              onChange: ev => {
                const v = Number(ev.target.value)
                if (ev.target.value !== '' && Number.isFinite(v)) e('set', v)
                nextTick(() => { ev.target.value = shownOf() })
              },
              onKeydown: ev => { if (ev.key === 'Enter') ev.target.blur() },
            }),
            h('span', { class: 'st-xfield-unit' }, p.f.unit),
          ]),
        ]),
        h('input', {
          type: 'range', min: p.f.min, max: p.f.rangeMax, step: 1, class: 'w-full st-range mb-1.5', value: shown === '' ? p.f.min : shown,
          title: p.f.label, 'data-range': p.f.key, onInput: ev => e('set', Number(ev.target.value), p.f.key),
        }),
      ])
    }
  },
})

// 색 한 줄 — 빠른 색 칸 + 색 고르기 (pick(값, mergeKey|undefined))
const ColorRow = (p, { emit: e }) => {
  const vals = [...new Set(p.items.map(it => it[p.field]))]
  const cur = vals.length === 1 ? vals[0] : null // null = 서로 다름
  return h('div', null, [
    h('div', { class: 'st-xfield-label mb-1' }, p.label),
    h('div', { class: 'flex items-center gap-1.5' }, [
      ...p.colors.map(c => h('button', {
        type: 'button', title: c.label, 'data-color': `${p.field}:${c.value}`,
        class: ['st-swatch', cur === c.value ? 'is-active' : ''], style: { background: c.value }, onClick: () => e('pick', c.value),
      })),
      h('label', { class: 'st-swatch st-swatch-pick', title: '색 고르기' }, [
        h(Palette, { class: 'w-3.5 h-3.5', 'stroke-width': 2 }),
        h('input', { type: 'color', class: 'sr-only', value: cur ?? '#111111', onInput: ev => e('pick', ev.target.value, p.field) }),
      ]),
      h('span', { class: 'ml-1 text-[11px] font-bold st-muted uppercase' }, cur ?? '—'),
    ]),
  ])
}
ColorRow.props = ['label', 'items', 'field', 'colors']
ColorRow.emits = ['pick']
</script>

<style scoped>
/* 숫자 칸·색 칸 — StudioShapeItemPanel과 같은 모양 (scoped라 같은 값을 여기에도 둔다. 작은 컴포넌트가 만든 요소에도 걸리게 :deep) */
:deep(.st-xfield) { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.st-xfield-label, :deep(.st-xfield-label) { font-size: 11px; font-weight: 700; line-height: 14px; color: var(--st-muted); }
:deep(.st-xfield-box) {
  display: flex; align-items: center; height: 28px; min-width: 0; padding: 0 6px 0 8px; border-radius: 8px;
  border: 1px solid var(--st-line-strong); background: var(--st-card);
}
:deep(.st-xfield-box:focus-within) { border-color: var(--st-accent); }
:deep(.st-xfield-box input) {
  flex: 1 1 auto; min-width: 0; width: 100%; height: 100%; padding: 0; border: 0; outline: none; background: transparent;
  font-size: 13px; font-weight: 600; color: var(--st-ink); font-variant-numeric: tabular-nums;
  -moz-appearance: textfield; appearance: textfield;
}
:deep(.st-xfield-box input::-webkit-outer-spin-button),
:deep(.st-xfield-box input::-webkit-inner-spin-button) { -webkit-appearance: none; margin: 0; }
:deep(.st-xfield-box input::placeholder) { color: var(--st-muted); opacity: 0.7; }
:deep(.st-xfield-unit) { flex: none; margin-left: 2px; font-size: 11px; font-weight: 600; color: var(--st-muted); }
:deep(.st-range) { accent-color: var(--st-accent); }
.st-chip {
  height: 28px; padding: 0 10px; border-radius: 8px; font-size: 12px; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2);
}
.st-chip:disabled { opacity: 0.4; cursor: default; }
.st-chip.is-active { border-color: var(--st-accent); color: var(--st-accent); background: var(--st-accent-soft); }
:deep(.st-swatch) {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--st-line-strong); cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
:deep(.st-swatch.is-active) { box-shadow: 0 0 0 2px var(--st-accent); }
:deep(.st-swatch-pick) { background: var(--st-card); color: var(--st-ink-2); position: relative; }
:deep(.st-swatch-pick:focus-within) { border-color: var(--st-accent); }
/* 칸 입력 — 작은 격자 (열 10개까지 들어가게 글자를 작게) */
.st-cell-input {
  min-width: 0; width: 100%; height: 26px; padding: 0 4px; border-radius: 4px; font-size: 11px; text-align: center;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink); outline: none;
}
.st-cell-input.is-header { font-weight: 800; background: var(--st-card-hover); }
.st-cell-input:focus { border-color: var(--st-accent); }
.st-select {
  width: 100%; height: 30px; padding: 0 8px; border-radius: 8px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink); outline: none;
}
.st-select:focus { border-color: var(--st-accent); }
.st-check { accent-color: var(--st-accent); width: 14px; height: 14px; }
</style>
