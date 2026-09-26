<template>
  <div class="px-4 pt-3 pb-4 space-y-3 st-border-b" data-text-item-panel>
    <div class="flex items-center gap-2">
      <span class="text-[13px] font-extrabold st-ink">글자</span>
      <span v-if="items.length > 1" class="st-muted text-[11px] font-bold">글자 요소 {{ items.length }}개에 함께 적용</span>
      <span v-if="mixedWithOthers" class="st-muted text-[11px] font-bold">글자 요소에만 적용</span>
      <!-- 스타일 복사·붙여넣기 (10-2, 글자끼리) -->
      <span class="ml-auto flex gap-1 shrink-0">
        <button type="button" class="st-mini-btn" :disabled="items.length !== 1" :title="items.length === 1 ? '이 글자 모양 복사 (Ctrl+Alt+C)' : '글자 하나를 골랐을 때 복사할 수 있어요'" data-style-copy @click="$emit('style-copy')">
          <Copy class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
        <button type="button" class="st-mini-btn" :disabled="!canPasteStyle" :title="canPasteStyle ? '복사한 글자 모양 붙여넣기 (Ctrl+Alt+V)' : '먼저 글자 모양을 복사해 주세요'" data-style-paste @click="$emit('style-paste')">
          <ClipboardPaste class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
      </span>
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

    <!-- 꾸미기 (10-2): 접이식 3묶음. 스위치를 끄면 값 0/없음, 켜면 기본값으로 켜고 펼친다. 줄바꿈·높이는 바뀌지 않는다 -->
    <div v-for="g in DECO_GROUPS" :key="g.key" class="st-deco" :data-deco="g.key">
      <div class="st-deco-head">
        <button type="button" class="st-deco-title" :aria-expanded="openGroups.has(g.key)" :data-deco-open="g.key" @click="toggleOpen(g.key)">
          <component :is="openGroups.has(g.key) ? ChevronDown : ChevronRight" class="w-3.5 h-3.5" :stroke-width="2.5" />
          {{ g.label }}
          <span v-if="decoOn(g.key)" class="st-deco-badge">켜짐</span>
        </button>
        <button
          type="button" role="switch" class="st-switch" :class="decoOn(g.key) ? 'is-on' : ''" :aria-checked="decoOn(g.key)"
          :title="decoOn(g.key) ? `${g.label} 끄기` : `${g.label} 켜기`" :data-deco-switch="g.key" @click="setDeco(g.key, !decoOn(g.key))"
        ><span /></button>
      </div>
      <div v-if="openGroups.has(g.key)" class="space-y-2 pt-2">
        <!-- 색 -->
        <div>
          <div class="st-xfield-label mb-1">색</div>
          <div class="flex items-center gap-1.5">
            <button
              v-for="c in g.colors" :key="c.value" type="button" class="st-swatch" :class="[common(g.colorKey) === c.value ? 'is-active' : '', c.value === '' ? 'st-swatch-none' : '']"
              :style="c.value ? { background: c.value } : null" :title="c.label" :data-deco-color="`${g.key}:${c.value || 'none'}`"
              @click="emitText({ [g.colorKey]: c.value })"
            ><Ban v-if="c.value === ''" class="w-3.5 h-3.5" :stroke-width="2" /></button>
            <label class="st-swatch st-swatch-pick" title="색 고르기">
              <Palette class="w-3.5 h-3.5" :stroke-width="2" />
              <input type="color" :value="pickerValue(g.colorKey)" class="sr-only" @input="emitText({ [g.colorKey]: $event.target.value }, g.colorKey)" />
            </label>
            <span class="ml-1 text-[11px] font-bold st-muted uppercase">{{ colorText(g.colorKey) }}</span>
          </div>
        </div>
        <!-- 숫자 칸 + 슬라이더 (6-1 방식: 칸 = Enter·벗어나기 반영, 슬라이더 = 끄는 동안 이력 1개) -->
        <div v-for="f in g.nums" :key="f.key" class="grid grid-cols-[88px_1fr] items-end gap-2">
          <label class="st-xfield" :data-num="f.key">
            <span class="st-xfield-label">{{ f.label }}</span>
            <span class="st-xfield-box">
              <input
                type="number" :step="f.step" inputmode="numeric" :min="f.min" :max="f.max" :value="numVal(f)" placeholder="—"
                @change="onDecoNum(f, $event)" @keydown.enter="$event.target.blur()"
              />
              <span class="st-xfield-unit">{{ f.unit }}</span>
            </span>
          </label>
          <input
            type="range" :min="f.min" :max="f.max" :step="f.step" class="w-full st-range mb-1.5" :value="numVal(f) === '' ? f.min : numVal(f)"
            :title="f.label" :data-range="f.key" @input="emitText({ [f.key]: Number($event.target.value) / f.scale }, f.key)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 글자 속성 칸 (10-1) — 글자 요소를 골랐을 때 공통 조작 칸(StudioTransformPanel) 아래. 여러 개면 공통 값만(다르면 빈칸 "—"),
// 바꾸면 고른 글자 요소 전부에 (사진이 섞여 있으면 글자에만). text(patch, { merge, key })만 보낸다 — 편집기가 runCommand로 이력·저장.
// 10-2: 아래에 접이식 꾸미기 3묶음(테두리·그림자·글자 배경), 위쪽에 스타일 복사·붙여넣기 버튼(style-copy·style-paste — 편집기 runCommand).
import { ref, computed, nextTick } from 'vue'
import { ChevronDown, ChevronRight, Palette, AlignLeft, AlignCenter, AlignRight, Copy, ClipboardPaste, Ban } from 'lucide-vue-next'
import { findItem } from '@/lib/studioPage'
import { isValidTextItem, TEXT_LIMITS, TEXT_DEFAULTS } from '@/lib/studioText'
import { STUDIO_FONTS, WEIGHT_LABELS, fontByKey, cssFamilyOf } from '@/lib/studioFonts'

const props = defineProps({
  page: { type: Object, required: true },
  selectedIds: { type: Array, required: true },
  canPasteStyle: { type: Boolean, default: false }, // 복사한 글자 모양이 있고 글자를 골랐을 때
})
const emit = defineEmits(['text', 'style-copy', 'style-paste'])

// ── 꾸미기 묶음 (10-2) — 켜기 = 이 값으로(색은 그대로 둔다), 끄기 = 0/없음 ──
const num = (key, label, unit, { scale = 1, step = 1 } = {}) => ({
  key, label, unit, scale, step, min: TEXT_LIMITS[key][0] * scale, max: TEXT_LIMITS[key][1] * scale,
})
const DECO_GROUPS = [
  {
    key: 'stroke', label: '테두리', colorKey: 'strokeColor',
    on: { strokeWidth: 2 }, off: { strokeWidth: 0 },
    colors: [{ value: '#000000', label: '검정' }, { value: '#ffffff', label: '흰색' }, { value: '#e53935', label: '빨강' }],
    nums: [num('strokeWidth', '두께', 'px')],
  },
  {
    key: 'shadow', label: '그림자', colorKey: 'shadowColor',
    on: { shadowY: 4, shadowBlur: 8, shadowOpacity: 0.35 }, off: { shadowX: 0, shadowY: 0, shadowBlur: 0, shadowOpacity: 0 },
    colors: [{ value: '#000000', label: '검정' }, { value: '#ffffff', label: '흰색' }, { value: '#1f3a68', label: '남색' }],
    nums: [num('shadowX', '가로', 'px'), num('shadowY', '세로', 'px'), num('shadowBlur', '흐림', 'px'), num('shadowOpacity', '진하기', '%', { scale: 100 })],
  },
  {
    key: 'bg', label: '글자 배경', colorKey: 'bgColor',
    on: { bgColor: '#ffe14d', bgOpacity: 1, bgPadding: 10, bgRadius: 6 }, off: { bgColor: '', bgOpacity: TEXT_DEFAULTS.bgOpacity, bgPadding: 0, bgRadius: 0 },
    colors: [{ value: '', label: '없음' }, { value: '#ffe14d', label: '노랑' }, { value: '#ffffff', label: '흰색' }, { value: '#111111', label: '검정' }, { value: '#e53935', label: '빨강' }],
    nums: [num('bgOpacity', '진하기', '%', { scale: 100 }), num('bgPadding', '여백', 'px'), num('bgRadius', '모서리', 'px')],
  },
]
const DECO_ON = {
  stroke: it => it.strokeWidth > 0,
  shadow: it => it.shadowOpacity > 0 && !!(it.shadowX || it.shadowY || it.shadowBlur),
  bg: it => it.bgColor !== '' && it.bgOpacity > 0,
}
const openGroups = ref(new Set())
function toggleOpen(key) {
  const next = new Set(openGroups.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  openGroups.value = next
}
/** 고른 글자 중 하나라도 켜져 있으면 켜짐 (스위치를 누르면 전부 끔) */
function decoOn(key) { return items.value.some(DECO_ON[key]) }
function setDeco(key, on) {
  const g = DECO_GROUPS.find(x => x.key === key)
  emitText(on ? g.on : g.off)
  if (on && !openGroups.value.has(key)) toggleOpen(key)
}
function numVal(f) {
  const v = common(f.key)
  return v === '' ? '' : Math.round(v * f.scale * 100) / 100
}
function onDecoNum(f, e) {
  const v = Number(e.target.value)
  if (e.target.value !== '' && Number.isFinite(v)) emitText({ [f.key]: v / f.scale })
  nextTick(() => { e.target.value = numVal(f) })
}
/** <input type="color">는 #rrggbb만 받는다 — 여러 값이거나 배경 없음('')이면 검정에서 시작 */
function pickerValue(key) {
  const v = common(key)
  return typeof v === 'string' && v.startsWith('#') ? v : '#000000'
}
function colorText(key) {
  const v = common(key)
  if (key === 'bgColor' && v === '' && items.value.length) return items.value.every(it => it.bgColor === '') ? '없음' : '—'
  return v === '' ? '—' : v
}

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
/* 10-2 꾸미기 묶음 */
.st-mini-btn {
  width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2);
}
.st-mini-btn:hover:not(:disabled) { border-color: var(--st-accent); color: var(--st-ink); }
.st-mini-btn:disabled { opacity: 0.4; cursor: default; }
.st-deco { border-top: 1px solid var(--st-line); padding-top: 8px; }
.st-deco-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.st-deco-title {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 0; border: 0; background: transparent; cursor: pointer;
  font-size: 12px; font-weight: 800; color: var(--st-ink-2);
}
.st-deco-title:hover { color: var(--st-ink); }
.st-deco-badge { margin-left: 4px; padding: 0 6px; border-radius: 6px; font-size: 10px; font-weight: 700; background: var(--st-accent-soft); color: var(--st-accent); }
.st-switch {
  position: relative; width: 32px; height: 18px; border-radius: 999px; border: 0; cursor: pointer; padding: 0;
  background: var(--st-line-strong); transition: background 0.15s;
}
.st-switch > span {
  position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; border-radius: 999px; background: var(--st-ink); transition: transform 0.15s;
}
.st-switch.is-on { background: var(--st-accent); }
.st-switch.is-on > span { transform: translateX(14px); }
.st-swatch-none { background: var(--st-card); color: var(--st-muted); }
</style>
