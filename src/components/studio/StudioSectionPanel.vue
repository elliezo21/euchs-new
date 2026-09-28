<template>
  <div class="flex flex-col h-full min-h-0" data-section-panel>
    <!-- 위: 섹션 목록 (번호 + 이름) — 누르면 그 섹션으로 가서 고른다. 목록 아래 [+ 맨 아래에 섹션 추가] -->
    <div class="shrink-0 px-4 pt-4 pb-2 flex items-center gap-2">
      <span class="text-[13px] font-extrabold st-ink">섹션</span>
      <span class="st-muted text-[11px] font-bold">{{ page.sections.length }}개</span>
    </div>
    <ol class="flex-1 min-h-0 overflow-y-auto px-2" data-section-list>
      <li v-for="(s, i) in page.sections" :key="s.id">
        <button
          type="button" class="st-sec-row" :class="s.id === sectionId ? 'is-current' : ''" :data-section-row="s.id"
          :title="`${labels[s.id] ?? ''} — 눌러서 이 섹션으로`" @click="$emit('pick', s.id)"
        >
          <span class="st-sec-swatch" :style="{ background: s.bg }" />
          <span class="truncate">{{ labels[s.id] ?? String(i + 1).padStart(2, '0') }}</span>
          <span class="ml-auto shrink-0 text-[11px] st-muted tabular-nums">{{ s.height }}px</span>
        </button>
      </li>
      <li v-if="page.sections.length === 0" class="px-2 py-3 st-desc break-keep">아직 섹션이 없어요.</li>
    </ol>
    <div class="shrink-0 px-4 pt-2 pb-3">
      <button type="button" class="st-btn st-sec-btn w-full" :disabled="full" data-sec-cmd="add-end" @click="cmd('sectionAdd', { where: 'end' })">
        <Plus class="w-3.5 h-3.5" :stroke-width="2" /> 맨 아래에 섹션 추가
      </button>
      <p v-if="full" class="mt-1 st-desc-sm break-keep">섹션은 {{ SECTION_MAX }}개까지 만들 수 있어요.</p>
      <p v-else class="mt-1 st-desc-sm break-keep">섹션 사이에 마우스를 올리면 그 자리에 추가할 수 있어요. 옮기기·복제·삭제는 섹션을 누르면 오른쪽에 나오는 막대에서 해요.</p>
    </div>

    <!-- 아래: 고른 섹션의 높이·배경색 (고른 섹션이 없어도 자리는 그대로 — 화면이 바뀌지 않게) -->
    <div class="shrink-0 px-4 pt-3 pb-3 space-y-3 st-border-t st-sec-detail" data-section-detail>
      <template v-if="section">
        <div class="text-[12px] font-extrabold st-ink truncate" data-section-title>{{ sectionLabel }}</div>
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
        <!-- 배경 이미지 (에셋 이미지 — [요소] → [이미지]의 "섹션 배경" 그림으로 넣는다). 있을 때만 -->
        <div v-if="bgImage" class="flex items-center gap-2" data-sec-bg-image>
          <img :src="assetUrl(bgImage.asset)" alt="" draggable="false" loading="lazy" class="st-sec-bgimg" />
          <span class="st-xfield-label">배경 이미지</span>
          <button type="button" class="st-btn st-sec-btn ml-auto" data-sec-cmd="bg-image-remove" @click="cmd('sectionBgImage', { asset: null })">배경 이미지 빼기</button>
        </div>
      </template>
      <p v-else class="st-desc break-keep" data-section-empty>섹션을 누르면 높이와 배경색을 바꿀 수 있어요</p>
    </div>

    <!-- 맨 아래: 페이지 전체 섹션 사이 간격 -->
    <div class="shrink-0 px-4 pt-3 pb-4 st-border-t">
      <label class="st-xfield" data-num="gap">
        <span class="st-xfield-label">섹션 사이 간격 · 페이지 전체 (0~{{ GAP_MAX }})</span>
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
// 왼쪽 [섹션] 패널 (8-1 → 한 화면으로) — 위: 섹션 목록(누르면 그 섹션으로 가서 고름) + [맨 아래에 섹션 추가] /
// 가운데: 고른 섹션의 높이·배경색 / 맨 아래: 페이지 전체 섹션 사이 간격. 고르기 전·후 자리가 같다.
// 위에/아래에 추가·복제·위로·아래로·삭제는 캔버스 섹션 도구줄·섹션 사이 [+]·우클릭으로 (같은 runCommand).
// 누르면 command(name, args)·pick(id)만 보낸다 — 실제 바꾸기는 편집기의 runCommand 하나가 한다 (이력·페이지 저장).
import { ref, computed, nextTick } from 'vue'
import { Plus, PaintBucket } from 'lucide-vue-next'
import { SECTION_MAX, SECTION_H_MIN, SECTION_H_MAX, GAP_MAX } from '@/lib/studioPage'
import { sectionBgImageOf, assetUrl } from '@/lib/studioAsset'

const props = defineProps({
  page: { type: Object, required: true },
  sectionId: { type: String, default: null },    // 골라진 섹션 (없으면 안내)
  sectionLabel: { type: String, default: '' },   // "03 상세 이미지" (페이지 왼쪽 섹션 이름과 같은 글자)
  labels: { type: Object, default: () => ({}) }, // section id → "03 상세 이미지"
})
const emit = defineEmits(['command', 'pick'])
const cmd = (name, args = {}) => emit('command', name, args)

// 빠른 배경색 칸 — 흰색·연회색·검정
const QUICK_COLORS = [{ value: '#ffffff', label: '흰색' }, { value: '#f1f2f4', label: '연회색' }, { value: '#000000', label: '검정' }]

const sectionIndex = computed(() => (props.sectionId ? props.page.sections.findIndex(s => s.id === props.sectionId) : -1))
const section = computed(() => (sectionIndex.value >= 0 ? props.page.sections[sectionIndex.value] : null))
const full = computed(() => props.page.sections.length >= SECTION_MAX)
const bgImage = computed(() => sectionBgImageOf(section.value))
// <input type="color">는 #rrggbb만 받는다 — 예전 섹션의 다른 모양 값(#fff 등)이면 흰색에서 시작
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
/** 오른쪽 아래 [섹션 사이 간격] 버튼 → 이 칸으로 */
function focusGap() {
  gapInput.value?.focus()
  gapInput.value?.select()
}
defineExpose({ focusGap })
</script>

<style scoped>
.st-sec-btn { height: 30px; padding: 0 10px; font-size: 12px; gap: 4px; justify-content: center; }
.st-sec-row {
  width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 8px; border: 0; border-radius: 8px; cursor: pointer; text-align: left;
  background: transparent; font-size: 12px; font-weight: 700; color: var(--st-ink-2);
}
.st-sec-row:hover { background: var(--st-card-hover); color: var(--st-ink); }
.st-sec-row.is-current { background: var(--st-accent-soft); color: var(--st-accent); }
.st-sec-bgimg { width: 40px; height: 28px; border-radius: 6px; object-fit: cover; border: 1px solid var(--st-line-strong); flex: none; }
.st-sec-swatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--st-line-strong); flex: none; }
/* 고른 섹션 칸 — 고르기 전·후 높이가 크게 달라지지 않게 */
.st-sec-detail { min-height: 150px; }
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
