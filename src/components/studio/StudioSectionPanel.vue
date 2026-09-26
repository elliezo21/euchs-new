<template>
  <div class="flex flex-col h-full overflow-y-auto" data-section-panel>
    <!-- 골라진 구간 -->
    <div class="px-4 pt-4 pb-4 space-y-3 st-border-b">
      <template v-if="section">
        <div class="flex items-center gap-2">
          <span class="text-[13px] font-extrabold st-ink" data-section-title>{{ sectionLabel }}</span>
          <span class="st-muted text-[11px] font-bold ml-auto">{{ sectionIndex + 1 }} / {{ page.sections.length }}</span>
        </div>

        <!-- 추가·복제 -->
        <div class="grid grid-cols-2 gap-1.5">
          <button type="button" class="st-btn st-sec-btn" :disabled="full" data-sec-cmd="add-above" @click="cmd('sectionAdd', { where: 'above' })">
            <BetweenHorizontalStart class="w-3.5 h-3.5" :stroke-width="2" /> 위에 추가
          </button>
          <button type="button" class="st-btn st-sec-btn" :disabled="full" data-sec-cmd="add-below" @click="cmd('sectionAdd', { where: 'below' })">
            <BetweenHorizontalEnd class="w-3.5 h-3.5" :stroke-width="2" /> 아래에 추가
          </button>
          <button type="button" class="st-btn st-sec-btn" :disabled="full" data-sec-cmd="duplicate" @click="cmd('sectionDuplicate')">
            <CopyPlus class="w-3.5 h-3.5" :stroke-width="2" /> 복제
          </button>
          <div class="flex gap-1.5">
            <button type="button" class="st-btn st-sec-btn flex-1" :disabled="sectionIndex === 0" title="위로" data-sec-cmd="up" @click="cmd('sectionMove', { by: -1 })">
              <ChevronUp class="w-3.5 h-3.5" :stroke-width="2" /> 위로
            </button>
            <button type="button" class="st-btn st-sec-btn flex-1" :disabled="sectionIndex === page.sections.length - 1" title="아래로" data-sec-cmd="down" @click="cmd('sectionMove', { by: 1 })">
              <ChevronDown class="w-3.5 h-3.5" :stroke-width="2" /> 아래로
            </button>
          </div>
        </div>
        <p v-if="full" class="st-desc-sm break-keep">구간은 {{ SECTION_MAX }}개까지 만들 수 있어요.</p>

        <!-- 높이 (6-1 숫자 칸과 같은 방식: Enter·칸 벗어나기 = 반영) -->
        <label class="st-xfield" data-num="section-height">
          <span class="st-xfield-label">높이 ({{ SECTION_H_MIN }}~{{ SECTION_H_MAX }})</span>
          <span class="st-xfield-box">
            <input
              type="number" step="1" inputmode="numeric" :min="SECTION_H_MIN" :max="SECTION_H_MAX" :value="section.height"
              @change="onHeight" @keydown.enter="$event.target.blur()"
            />
            <span class="st-xfield-unit">px</span>
          </span>
        </label>

        <!-- 배경색 -->
        <div>
          <div class="st-xfield-label mb-1">배경색</div>
          <div class="flex items-center gap-1.5">
            <button
              v-for="c in QUICK_COLORS" :key="c.value" type="button" class="st-swatch" :class="section.bg === c.value ? 'is-active' : ''"
              :style="{ background: c.value }" :title="c.label" :data-sec-bg="c.value" @click="cmd('sectionBg', { color: c.value })"
            />
            <label class="st-swatch st-swatch-pick" title="색 고르기" data-sec-bg-pick>
              <PaintBucket class="w-3.5 h-3.5" :stroke-width="2" />
              <input type="color" :value="colorValue" class="sr-only" @input="cmd('sectionBg', { color: $event.target.value, merge: true })" />
            </label>
            <span class="ml-1 text-[11px] font-bold st-muted uppercase">{{ section.bg }}</span>
          </div>
        </div>

        <button type="button" class="st-btn st-sec-btn st-danger-text w-full" data-sec-cmd="delete" @click="cmd('sectionDelete')">
          <Trash2 class="w-3.5 h-3.5" :stroke-width="2" /> 구간 삭제
        </button>
      </template>

      <template v-else>
        <div class="text-[13px] font-extrabold st-ink">구간</div>
        <p class="st-desc break-keep" data-section-empty>페이지에서 구간 이름이나 빈 곳을 눌러 고르세요</p>
        <button type="button" class="st-btn st-sec-btn w-full" :disabled="full" data-sec-cmd="add-end" @click="cmd('sectionAdd', { where: 'end' })">
          <Plus class="w-3.5 h-3.5" :stroke-width="2" /> 맨 아래에 구간 추가
        </button>
      </template>
    </div>

    <!-- 페이지 전체: 구간 간격 -->
    <div class="px-4 pt-3 pb-4 space-y-2">
      <div class="text-[12px] font-extrabold st-ink-2">페이지 전체 · 구간 {{ page.sections.length }}개</div>
      <label class="st-xfield" data-num="gap">
        <span class="st-xfield-label">구간 간격 (0~{{ GAP_MAX }})</span>
        <span class="st-xfield-box">
          <input
            ref="gapInput" type="number" step="1" inputmode="numeric" min="0" :max="GAP_MAX" :value="page.gap"
            @change="onGap" @keydown.enter="$event.target.blur()"
          />
          <span class="st-xfield-unit">px</span>
        </span>
      </label>
    </div>
  </div>
</template>

<script setup>
// 왼쪽 [구간] 패널 (8-1) — 골라진 구간의 추가·복제·순서·높이·배경색·삭제 + 페이지 전체 구간 간격.
// 누르면 command(name, args)만 보낸다 — 실제 바꾸기는 편집기의 runCommand 하나가 한다 (우클릭 메뉴와 같은 길, 이력·페이지 저장).
import { ref, computed, nextTick } from 'vue'
import { BetweenHorizontalStart, BetweenHorizontalEnd, CopyPlus, ChevronUp, ChevronDown, Trash2, Plus, PaintBucket } from 'lucide-vue-next'
import { SECTION_MAX, SECTION_H_MIN, SECTION_H_MAX, GAP_MAX } from '@/lib/studioPage'

const props = defineProps({
  page: { type: Object, required: true },
  sectionId: { type: String, default: null },    // 골라진 구간 (없으면 안내 + 맨 아래에 추가)
  sectionLabel: { type: String, default: '' },   // "03 상세 이미지" (페이지 왼쪽 구간 이름과 같은 글자)
})
const emit = defineEmits(['command'])
const cmd = (name, args = {}) => emit('command', name, args)

// 빠른 배경색 칸 — 흰색·연회색·검정
const QUICK_COLORS = [{ value: '#ffffff', label: '흰색' }, { value: '#f1f2f4', label: '연회색' }, { value: '#000000', label: '검정' }]

const sectionIndex = computed(() => (props.sectionId ? props.page.sections.findIndex(s => s.id === props.sectionId) : -1))
const section = computed(() => (sectionIndex.value >= 0 ? props.page.sections[sectionIndex.value] : null))
const full = computed(() => props.page.sections.length >= SECTION_MAX)
// <input type="color">는 #rrggbb만 받는다 — 예전 구간의 다른 모양 값(#fff 등)이면 흰색에서 시작
const colorValue = computed(() => (/^#[0-9a-f]{6}$/i.test(section.value?.bg || '') ? section.value.bg : '#ffffff'))

function intIn(e, lo, hi) {
  const v = Number(e.target.value)
  return e.target.value === '' || !Number.isFinite(v) ? null : Math.min(hi, Math.max(lo, Math.round(v)))
}
// 반영 뒤 칸에 실제 값을 다시 쓴다 (값이 그대로면 화면이 다시 그려지지 않아 입력한 글자가 남으므로 — 6-1과 같은 방식)
function resync(el, read) { nextTick(() => { el.value = read() }) }
function onHeight(e) {
  const v = intIn(e, SECTION_H_MIN, SECTION_H_MAX)
  if (v !== null) cmd('sectionHeight', { h: v })
  resync(e.target, () => section.value?.height ?? '')
}
function onGap(e) {
  const v = intIn(e, 0, GAP_MAX)
  if (v !== null) cmd('gap', { v })
  resync(e.target, () => props.page.gap)
}

const gapInput = ref(null)
/** 오른쪽 아래 [구간 간격] 버튼 → 이 칸으로 */
function focusGap() {
  gapInput.value?.focus()
  gapInput.value?.select()
}
defineExpose({ focusGap })
</script>

<style scoped>
.st-sec-btn { height: 30px; padding: 0 10px; font-size: 12px; gap: 4px; justify-content: center; }
/* 숫자 칸 — StudioTransformPanel(6-1)과 같은 모양 (그쪽 스타일은 scoped라 같은 값을 여기에도 둔다) */
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
.st-xfield-unit { flex: none; margin-left: 2px; font-size: 11px; font-weight: 600; color: var(--st-muted); }
.st-swatch {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--st-line-strong); cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.st-swatch.is-active { box-shadow: 0 0 0 2px var(--st-accent); }
.st-swatch-pick { background: var(--st-card); color: var(--st-ink-2); position: relative; }
.st-swatch-pick:focus-within { border-color: var(--st-accent); }
</style>
