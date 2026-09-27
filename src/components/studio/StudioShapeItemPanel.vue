<template>
  <div class="px-4 pt-3 pb-4 space-y-4" :class="part === 'all' ? 'st-border-b' : ''" data-shape-item-panel :data-part="part">
    <!-- 도형 -->
    <div v-if="shapes.length && part !== 'line'" class="space-y-3" data-shape-props>
      <div v-if="part === 'all'" class="flex items-center gap-2">
        <span class="text-[13px] font-extrabold st-ink">도형</span>
        <span v-if="shapes.length > 1" class="st-muted text-[11px] font-bold">도형 {{ shapes.length }}개에 함께 적용</span>
        <span v-else-if="shapes.length < all.length" class="st-muted text-[11px] font-bold">도형에만 적용</span>
      </div>
      <div v-if="show('kind')">
        <div class="st-xfield-label mb-1">모양</div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="s in SHAPES" :key="s" type="button" class="st-chip" :class="common(shapes, 'shape') === s ? 'is-active' : ''"
            :data-shape-kind="s" @click="emitShape({ shape: s })"
          >{{ SHAPE_LABELS[s] }}</button>
        </div>
      </div>
      <ColorRow v-if="show('fill')" label="채우기 색" :items="shapes" field="fill" :colors="FILL_COLORS" @pick="(v, m) => emitShape({ fill: v }, m)" />
      <NumRow v-for="f in shapeNums.filter(x => show(x.part))" :key="f.key" :f="f" :items="shapes" @set="(v, m) => emitShape({ [f.key]: v }, m)" />
      <ColorRow v-if="show('stroke')" label="테두리 색" :items="shapes" field="strokeColor" :colors="STROKE_COLORS" @pick="(v, m) => emitShape({ strokeColor: v }, m)" />
    </div>

    <!-- 선 -->
    <div v-if="lines.length && (part === 'all' || part === 'line')" class="space-y-3" data-line-props>
      <div class="flex items-center gap-2">
        <span class="text-[13px] font-extrabold st-ink">선</span>
        <span v-if="lines.length > 1" class="st-muted text-[11px] font-bold">선 {{ lines.length }}개에 함께 적용</span>
        <span v-else-if="lines.length < all.length" class="st-muted text-[11px] font-bold">선에만 적용</span>
      </div>
      <NumRow :f="LINE_WIDTH" :items="lines" @set="(v, m) => emitLine({ strokeWidth: v }, m)" />
      <ColorRow label="색" :items="lines" field="color" :colors="STROKE_COLORS" @pick="(v, m) => emitLine({ color: v }, m)" />
      <div v-for="row in LINE_CHIPS" :key="row.key">
        <div class="st-xfield-label mb-1">{{ row.label }}</div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="o in row.options" :key="o.value" type="button" class="st-chip" :class="common(lines, row.key) === o.value ? 'is-active' : ''"
            :data-line-opt="`${row.key}:${o.value}`" @click="emitLine({ [row.key]: o.value })"
          >{{ o.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 도형·선 속성 칸 (11-1) — 공통 조작 칸(StudioTransformPanel) 아래. 여러 개면 공통 값만(다르면 빈칸 "—"),
// 바꾸면 그 종류에만(도형 칸은 도형에, 선 칸은 선에). shape·line(patch, { merge, key })만 보낸다 — 편집기 runCommand로 이력·저장.
// 숫자 칸 = Enter·벗어나기 반영, 슬라이더·색 고르기 = 끄는 동안 이력 1개 (6-1·10-1과 같은 방식)
import { computed, nextTick, h, defineComponent } from 'vue'
import { Palette, Ban } from 'lucide-vue-next'
import { findItem } from '@/lib/studioPage'
import { isValidShapeItem, isValidLineItem, SHAPES, SHAPE_LABELS, SHAPE_LIMITS, LINE_LIMITS } from '@/lib/studioShape'

const props = defineProps({
  page: { type: Object, required: true },
  selectedIds: { type: Array, required: true },
  part: { type: String, default: 'all' }, // 도구줄 펼침 칸: kind(모양) · fill(채우기) · stroke(테두리·모서리) · line(선 전부) / all
})
const emit = defineEmits(['shape', 'line'])
const show = k => props.part === 'all' || props.part === k

const FILL_COLORS = [
  { value: '', label: '없음' }, { value: '#111111', label: '검정' }, { value: '#ffffff', label: '흰색' },
  { value: '#e53935', label: '빨강' }, { value: '#ffe14d', label: '노랑' }, { value: '#2f6fed', label: '파랑' },
]
const STROKE_COLORS = [{ value: '#111111', label: '검정' }, { value: '#ffffff', label: '흰색' }, { value: '#e53935', label: '빨강' }]
const LINE_WIDTH = { key: 'strokeWidth', label: '두께', unit: 'px', scale: 1, min: LINE_LIMITS.strokeWidth[0], max: LINE_LIMITS.strokeWidth[1], rangeMax: 40 }
const LINE_CHIPS = [
  { key: 'dash', label: '선 모양', options: [{ value: 'solid', label: '실선' }, { value: 'dashed', label: '점선' }, { value: 'dotted', label: '점' }] },
  { key: 'startCap', label: '시작 끝', options: [{ value: 'none', label: '없음' }, { value: 'arrow', label: '화살표' }, { value: 'dot', label: '점' }] },
  { key: 'endCap', label: '끝 모양', options: [{ value: 'none', label: '없음' }, { value: 'arrow', label: '화살표' }, { value: 'dot', label: '점' }] },
]

const all = computed(() => props.selectedIds.map(id => findItem(props.page, id)?.item).filter(Boolean))
const shapes = computed(() => all.value.filter(isValidShapeItem))
const lines = computed(() => all.value.filter(isValidLineItem))
// 모서리 둥글기는 고른 도형이 모두 네모일 때만
const shapeNums = computed(() => [
  { key: 'fillOpacity', label: '채우기 진하기', unit: '%', scale: 100, min: 0, max: 100, rangeMax: 100, part: 'fill' },
  { key: 'strokeWidth', label: '테두리 두께', unit: 'px', scale: 1, min: SHAPE_LIMITS.strokeWidth[0], max: SHAPE_LIMITS.strokeWidth[1], rangeMax: 40, part: 'stroke' },
  ...(shapes.value.every(s => s.shape === 'rect') ? [{ key: 'radius', label: '모서리 둥글기', unit: 'px', scale: 1, min: 0, max: SHAPE_LIMITS.radius[1], rangeMax: 200, part: 'stroke' }] : []),
])

/** 모두 같은 값이면 그 값, 다르면 '' (빈칸) — 채우기 없음('')과 섞임은 ColorRow가 따로 본다 */
function common(items, key) {
  const vals = [...new Set(items.map(it => it[key]))]
  return vals.length === 1 ? vals[0] : ''
}
const opts = merge => (merge ? { merge: true, key: merge } : {})
function emitShape(patch, merge) { emit('shape', patch, opts(merge)) }
function emitLine(patch, merge) { emit('line', patch, opts(merge)) }

// 숫자 칸 + 슬라이더 한 줄 (이 파일 안에서만 쓰는 작은 컴포넌트) — set(값, mergeKey|undefined)
// 반영 뒤 칸에 실제 값을 다시 쓴다(범위 밖 값은 잘리므로 — 6-1 방식). 다시 쓸 때는 반영된 뒤의 props를 읽는다
const NumRow = defineComponent({
  props: { f: { type: Object, required: true }, items: { type: Array, required: true } },
  emits: ['set'],
  setup(p, { emit: e }) {
    const shownOf = () => {
      const vals = [...new Set(p.items.map(it => it[p.f.key]))]
      return vals.length === 1 ? Math.round(vals[0] * p.f.scale * 100) / 100 : ''
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
                if (ev.target.value !== '' && Number.isFinite(v)) e('set', v / p.f.scale)
                nextTick(() => { ev.target.value = shownOf() })
              },
              onKeydown: ev => { if (ev.key === 'Enter') ev.target.blur() },
            }),
            h('span', { class: 'st-xfield-unit' }, p.f.unit),
          ]),
        ]),
        h('input', {
          type: 'range', min: p.f.min, max: p.f.rangeMax, step: 1, class: 'w-full st-range mb-1.5', value: shown === '' ? p.f.min : shown,
          title: p.f.label, 'data-range': p.f.key, onInput: ev => e('set', Number(ev.target.value) / p.f.scale, p.f.key),
        }),
      ])
    }
  },
})

// 색 한 줄 — 빠른 색 칸 + 색 고르기 (pick(값, mergeKey|undefined))
const ColorRow = (p, { emit: e }) => {
  const vals = [...new Set(p.items.map(it => it[p.field]))]
  const cur = vals.length === 1 ? vals[0] : null // null = 서로 다름
  const text = cur === null ? '—' : cur === '' ? '없음' : cur
  return h('div', null, [
    h('div', { class: 'st-xfield-label mb-1' }, p.label),
    h('div', { class: 'flex items-center gap-1.5' }, [
      ...p.colors.map(c => h('button', {
        type: 'button', title: c.label, 'data-color': `${p.field}:${c.value || 'none'}`,
        class: ['st-swatch', cur === c.value ? 'is-active' : '', c.value === '' ? 'st-swatch-none' : ''],
        style: c.value ? { background: c.value } : null, onClick: () => e('pick', c.value),
      }, c.value === '' ? [h(Ban, { class: 'w-3.5 h-3.5', 'stroke-width': 2 })] : [])),
      h('label', { class: 'st-swatch st-swatch-pick', title: '색 고르기' }, [
        h(Palette, { class: 'w-3.5 h-3.5', 'stroke-width': 2 }),
        h('input', { type: 'color', class: 'sr-only', value: cur && cur.startsWith('#') ? cur : '#111111', onInput: ev => e('pick', ev.target.value, p.field) }),
      ]),
      h('span', { class: 'ml-1 text-[11px] font-bold st-muted uppercase' }, text),
    ]),
  ])
}
ColorRow.props = ['label', 'items', 'field', 'colors']
ColorRow.emits = ['pick']
</script>

<style scoped>
/* 숫자 칸·색 칸 — StudioTextItemPanel과 같은 모양 (scoped라 같은 값을 여기에도 둔다. 작은 컴포넌트가 만든 요소에도 걸리게 :deep) */
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
.st-chip.is-active { border-color: var(--st-accent); color: var(--st-accent); background: var(--st-accent-soft); }
:deep(.st-swatch) {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--st-line-strong); cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
:deep(.st-swatch.is-active) { box-shadow: 0 0 0 2px var(--st-accent); }
:deep(.st-swatch-pick) { background: var(--st-card); color: var(--st-ink-2); position: relative; }
:deep(.st-swatch-pick:focus-within) { border-color: var(--st-accent); }
:deep(.st-swatch-none) { background: var(--st-card); color: var(--st-muted); }
</style>
