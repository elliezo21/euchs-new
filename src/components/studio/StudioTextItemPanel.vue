<template>
  <div class="px-4 pt-3 pb-4 space-y-3 st-border-b" data-text-item-panel>
    <div class="flex items-center gap-2">
      <span class="text-[13px] font-extrabold st-ink">글자</span>
      <span v-if="items.length > 1" class="st-muted text-[11px] font-bold">글자 요소 {{ items.length }}개에 함께 적용</span>
      <span v-if="mixedWithOthers" class="st-muted text-[11px] font-bold">글자 요소에만 적용</span>
    </div>

    <!-- 글꼴: 이름을 그 글꼴로 보여 준다 -->
    <div>
      <div class="st-xfield-label mb-1">글꼴</div>
      <button
        type="button" class="st-font-current" :style="currentFont ? { fontFamily: cssFamilyOf(currentFont.key) } : null"
        :aria-expanded="fontOpen" data-font-toggle @click="fontOpen = !fontOpen"
      >
        <span class="truncate">{{ currentFont ? currentFont.label : '여러 글꼴' }}</span>
        <ChevronDown class="w-4 h-4 shrink-0 st-muted" :stroke-width="2" />
      </button>
      <div v-if="fontOpen" class="st-font-list" data-font-list>
        <button
          v-for="f in STUDIO_FONTS" :key="f.key" type="button" class="st-font-opt" :class="currentFont?.key === f.key ? 'is-active' : ''"
          :style="{ fontFamily: cssFamilyOf(f.key) }" :data-font="f.key" @click="pickFont(f.key)"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- 크기 · 굵기 -->
    <div class="grid grid-cols-2 gap-2">
      <label class="st-xfield" data-num="fontSize">
        <span class="st-xfield-label">크기 ({{ LIM.fontSize[0] }}~{{ LIM.fontSize[1] }})</span>
        <span class="st-xfield-box">
          <input
            type="number" step="1" inputmode="numeric" :min="LIM.fontSize[0]" :max="LIM.fontSize[1]" :value="common('fontSize')" placeholder="—"
            @change="onNum('fontSize', $event, 1)" @keydown.enter="$event.target.blur()"
          />
          <span class="st-xfield-unit">px</span>
        </span>
      </label>
      <div class="st-xfield">
        <span class="st-xfield-label">굵기</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="w in weights" :key="w" type="button" class="st-chip" :class="common('fontWeight') === w ? 'is-active' : ''"
            :style="{ fontWeight: w }" :title="WEIGHT_LABELS[w] || String(w)" :data-weight="w" @click="emitText({ fontWeight: w })"
          >{{ WEIGHT_LABELS[w] || w }}</button>
        </div>
      </div>
    </div>
    <input
      type="range" :min="LIM.fontSize[0]" max="200" step="1" class="w-full st-range" :value="common('fontSize') === '' ? 40 : common('fontSize')"
      title="글자 크기" data-range="fontSize" @input="emitText({ fontSize: Number($event.target.value) }, 'fontSize')"
    />

    <!-- 색 -->
    <div>
      <div class="st-xfield-label mb-1">색</div>
      <div class="flex items-center gap-1.5">
        <button
          v-for="c in QUICK_COLORS" :key="c.value" type="button" class="st-swatch" :class="common('color') === c.value ? 'is-active' : ''"
          :style="{ background: c.value }" :title="c.label" :data-text-color="c.value" @click="emitText({ color: c.value })"
        />
        <label class="st-swatch st-swatch-pick" title="색 고르기" data-text-color-pick>
          <Palette class="w-3.5 h-3.5" :stroke-width="2" />
          <input type="color" :value="colorValue" class="sr-only" @input="emitText({ color: $event.target.value }, 'color')" />
        </label>
        <span class="ml-1 text-[11px] font-bold st-muted uppercase">{{ common('color') || '—' }}</span>
      </div>
    </div>

    <!-- 정렬 -->
    <div>
      <div class="st-xfield-label mb-1">정렬</div>
      <div class="flex gap-1">
        <button
          v-for="a in ALIGNS" :key="a.value" type="button" class="st-icon-btn st-tool" :class="common('align') === a.value ? 'is-active' : ''"
          :title="a.label" :data-text-align="a.value" @click="emitText({ align: a.value })"
        ><component :is="a.icon" class="w-4 h-4" :stroke-width="2" /></button>
      </div>
    </div>

    <!-- 줄간격 · 자간 (6-1 숫자 칸 방식: Enter·칸 벗어나기 = 반영, 슬라이더는 끄는 동안 이력 1개) -->
    <div class="grid grid-cols-2 gap-2">
      <label class="st-xfield" data-num="lineHeight">
        <span class="st-xfield-label">줄간격 (배)</span>
        <span class="st-xfield-box">
          <input
            type="number" step="0.1" inputmode="decimal" :min="LIM.lineHeight[0]" :max="LIM.lineHeight[1]" :value="common('lineHeight')" placeholder="—"
            @change="onNum('lineHeight', $event, 1)" @keydown.enter="$event.target.blur()"
          />
        </span>
      </label>
      <label class="st-xfield" data-num="letterSpacing">
        <span class="st-xfield-label">자간 (%)</span>
        <span class="st-xfield-box">
          <input
            type="number" step="1" inputmode="numeric" :min="LIM.letterSpacing[0] * 100" :max="LIM.letterSpacing[1] * 100" :value="spacingPct" placeholder="—"
            @change="onNum('letterSpacing', $event, 0.01)" @keydown.enter="$event.target.blur()"
          />
          <span class="st-xfield-unit">%</span>
        </span>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <input
        type="range" :min="LIM.lineHeight[0]" :max="LIM.lineHeight[1]" step="0.05" class="w-full st-range" :value="common('lineHeight') === '' ? 1.3 : common('lineHeight')"
        title="줄간격" data-range="lineHeight" @input="emitText({ lineHeight: Number($event.target.value) }, 'lineHeight')"
      />
      <input
        type="range" :min="LIM.letterSpacing[0] * 100" :max="LIM.letterSpacing[1] * 100" step="1" class="w-full st-range" :value="spacingPct === '' ? 0 : spacingPct"
        title="자간" data-range="letterSpacing" @input="emitText({ letterSpacing: Number($event.target.value) / 100 }, 'letterSpacing')"
      />
    </div>
  </div>
</template>

<script setup>
// 글자 속성 칸 (10-1) — 글자 요소를 골랐을 때 공통 조작 칸(StudioTransformPanel) 아래. 여러 개면 공통 값만(다르면 빈칸 "—"),
// 바꾸면 고른 글자 요소 전부에 (사진이 섞여 있으면 글자에만). text(patch, { merge, key })만 보낸다 — 편집기가 runCommand로 이력·저장.
import { ref, computed, nextTick } from 'vue'
import { ChevronDown, Palette, AlignLeft, AlignCenter, AlignRight } from 'lucide-vue-next'
import { findItem } from '@/lib/studioPage'
import { isValidTextItem, TEXT_LIMITS } from '@/lib/studioText'
import { STUDIO_FONTS, WEIGHT_LABELS, fontByKey, cssFamilyOf } from '@/lib/studioFonts'

const props = defineProps({
  page: { type: Object, required: true },
  selectedIds: { type: Array, required: true },
})
const emit = defineEmits(['text'])

const LIM = TEXT_LIMITS
const QUICK_COLORS = [{ value: '#ffffff', label: '흰색' }, { value: '#111111', label: '검정' }, { value: '#e53935', label: '빨강' }]
const ALIGNS = [
  { value: 'left', label: '왼쪽 정렬', icon: AlignLeft },
  { value: 'center', label: '가운데 정렬', icon: AlignCenter },
  { value: 'right', label: '오른쪽 정렬', icon: AlignRight },
]

const fontOpen = ref(false)
const all = computed(() => props.selectedIds.map(id => findItem(props.page, id)?.item).filter(Boolean))
const items = computed(() => all.value.filter(isValidTextItem))
const mixedWithOthers = computed(() => items.value.length > 0 && items.value.length < all.value.length)

/** 모두 같은 값이면 그 값, 다르면 '' (빈칸) */
function common(key) {
  const vals = [...new Set(items.value.map(it => it[key]))]
  return vals.length === 1 ? vals[0] : ''
}
const currentFont = computed(() => (common('fontFamily') ? fontByKey(common('fontFamily')) : null))
// 굵기 버튼 = 고른 글자들의 글꼴이 모두 가진 굵기
const weights = computed(() => {
  const lists = [...new Set(items.value.map(it => it.fontFamily))].map(k => fontByKey(k)?.weights || [400])
  return lists.length ? lists.reduce((a, b) => a.filter(w => b.includes(w))) : []
})
const spacingPct = computed(() => { const v = common('letterSpacing'); return v === '' ? '' : Math.round(v * 100) })
const colorValue = computed(() => (common('color') || '#111111'))

/** @param {string} [mergeKey] 슬라이더·색 고르기를 끄는 동안 = 이력 한 단계 */
function emitText(patch, mergeKey) { emit('text', patch, mergeKey ? { merge: true, key: mergeKey } : {}) }
function pickFont(key) {
  fontOpen.value = false
  emitText({ fontFamily: key })
}
// 반영 뒤 칸에 실제 값을 다시 쓴다 (범위 밖 값은 잘리므로 — 6-1과 같은 방식)
function onNum(key, e, unit) {
  const v = Number(e.target.value)
  if (e.target.value !== '' && Number.isFinite(v)) emitText({ [key]: v * unit })
  nextTick(() => { e.target.value = key === 'letterSpacing' ? spacingPct.value : common(key) })
}
</script>

<style scoped>
/* 숫자 칸 — StudioTransformPanel(6-1)과 같은 모양 (scoped라 같은 값을 여기에도 둔다) */
.st-xfield { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.st-xfield-label { font-size: 11px; font-weight: 700; line-height: 14px; color: var(--st-muted); }
.st-xfield-box {
  display: flex; align-items: center; height: 28px; min-width: 0; padding: 0 6px 0 8px; border-radius: 8px;
  border: 1px solid var(--st-line-strong); background: var(--st-card);
}
.st-xfield-box:focus-within { border-color: var(--st-accent); }
.st-xfield-box input {
  flex: 1 1 auto; min-width: 0; width: 100%; height: 100%; padding: 0; border: 0; outline: none; background: transparent;
  font-size: 13px; font-weight: 600; color: var(--st-ink); font-variant-numeric: tabular-nums;
  -moz-appearance: textfield; appearance: textfield;
}
.st-xfield-box input::-webkit-outer-spin-button,
.st-xfield-box input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.st-xfield-box input::placeholder { color: var(--st-muted); opacity: 0.7; }
.st-xfield-unit { flex: none; margin-left: 2px; font-size: 11px; font-weight: 600; color: var(--st-muted); }
.st-range { accent-color: var(--st-accent); }
.st-tool { width: 32px; height: 32px; }
.st-tool.is-active { background: var(--st-accent-soft); color: var(--st-accent); }
.st-chip {
  height: 28px; padding: 0 8px; border-radius: 8px; font-size: 12px; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2);
}
.st-chip.is-active { border-color: var(--st-accent); color: var(--st-accent); background: var(--st-accent-soft); }
.st-swatch {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--st-line-strong); cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.st-swatch.is-active { box-shadow: 0 0 0 2px var(--st-accent); }
.st-swatch-pick { background: var(--st-card); color: var(--st-ink-2); position: relative; }
.st-swatch-pick:focus-within { border-color: var(--st-accent); }
.st-font-current {
  width: 100%; height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 10px;
  border-radius: 8px; border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink); font-size: 15px; cursor: pointer;
}
.st-font-current:hover { border-color: var(--st-accent); }
.st-font-list { margin-top: 4px; padding: 4px; border-radius: 10px; border: 1px solid var(--st-line-strong); background: var(--st-panel); }
.st-font-opt {
  width: 100%; height: 34px; padding: 0 10px; border-radius: 6px; border: 0; background: transparent; color: var(--st-ink);
  font-size: 16px; text-align: left; cursor: pointer;
}
.st-font-opt:hover { background: var(--st-card); }
.st-font-opt.is-active { background: var(--st-accent-soft); color: var(--st-accent); }
</style>
