<template>
  <div class="px-4 pt-3 pb-4 space-y-3 st-border-b" data-image-item-panel>
    <div class="text-[13px] font-extrabold st-ink">사진</div>

    <!-- 사진 자체: 바꾸기 · 페이지에서 빼기 · 원본 비교(누르고 있기) -->
    <div class="grid grid-cols-2 gap-1.5">
      <button type="button" class="st-btn st-pbtn" data-photo-replace @click="$emit('replace')"><Replace class="w-3.5 h-3.5" :stroke-width="2" /> 사진 바꾸기</button>
      <button type="button" class="st-btn st-pbtn" :disabled="item.locked" :title="item.locked ? '잠긴 요소예요' : ''" data-photo-remove @click="$emit('remove-from-page')"><ImageMinus class="w-3.5 h-3.5" :stroke-width="2" /> 페이지에서 빼기</button>
      <button
        type="button" class="st-btn st-pbtn col-span-2 select-none" :class="comparing ? 'is-pressed' : ''" data-photo-compare
        title="누르고 있는 동안 페이지에 원본이 보여요"
        @pointerdown.prevent="startCompare" @pointerup="endCompare" @pointerleave="endCompare" @pointercancel="endCompare"
        @keydown.space.prevent="startCompare" @keyup.space.prevent="endCompare"
      ><Columns2 class="w-3.5 h-3.5" :stroke-width="2" /> {{ comparing ? '원본을 보는 중' : '원본 비교 (누르고 있기)' }}</button>
    </div>

    <!-- 필터 -->
    <div>
      <div class="st-desc-sm mb-1.5">필터</div>
      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="f in LOOK_FILTERS" :key="f.id" type="button" class="st-filter" :class="look.filter === f.id ? 'is-active' : ''"
          :data-filter="f.id" :aria-pressed="look.filter === f.id" @click="setFilter(f.id)"
        >
          <span class="st-filter-thumb">
            <img v-if="thumbUrl" :src="thumbUrl" alt="" draggable="false" :style="{ filter: previewCss(f.id) }" />
          </span>
          <span class="st-filter-name">{{ f.label }}</span>
        </button>
      </div>
    </div>

    <!-- 직접 조정 -->
    <div class="space-y-1.5">
      <div class="flex items-center">
        <span class="st-desc-sm">조정</span>
        <button type="button" class="ml-auto st-link-muted text-[11px]" :disabled="isDefault" data-look-reset @click="$emit('reset-look')">필터·조정 초기화</button>
      </div>
      <label v-for="k in ADJUST_KEYS" :key="k" class="st-slider-row" :data-adjust="k">
        <span class="st-slider-label">{{ ADJUST_LABELS[k] }}</span>
        <input
          type="range" :min="ADJUST_MIN" :max="ADJUST_MAX" step="1" class="st-range flex-1" :value="look[k]"
          @input="setAdjust(k, $event)" @dblclick="setAdjust(k, { target: { value: 0 } })"
        />
        <span class="st-slider-value">{{ look[k] > 0 ? `+${look[k]}` : look[k] }}</span>
      </label>
    </div>

    <!-- 꾸미기 (이 자리의 요소에만) -->
    <div class="space-y-1.5">
      <div class="st-desc-sm">꾸미기 <span class="st-muted">(이 자리에만)</span></div>
      <label class="st-slider-row" data-style="borderWidth">
        <span class="st-slider-label">테두리</span>
        <input type="range" min="0" max="40" step="1" class="st-range flex-1" :value="style.borderWidth" @input="setStyle('borderWidth', $event)" />
        <input type="color" class="st-color" :value="style.borderColor" title="테두리 색" data-style="borderColor" @input="setColor($event)" />
      </label>
      <label class="st-slider-row" data-style="radius">
        <span class="st-slider-label">모서리</span>
        <input type="range" min="0" max="200" step="1" class="st-range flex-1" :value="style.radius" @input="setStyle('radius', $event)" />
        <span class="st-slider-value">{{ style.radius }}</span>
      </label>
      <label class="st-slider-row" data-style="shadow">
        <span class="st-slider-label">그림자</span>
        <input type="range" min="0" max="100" step="1" class="st-range flex-1" :value="style.shadow" @input="setStyle('shadow', $event)" />
        <span class="st-slider-value">{{ style.shadow }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
// 사진 요소 패널 (6-2단계) — 페이지에서 사진 한 장을 고르면 공통 조작 칸 아래에 나온다.
//   사진 바꾸기 · 페이지에서 빼기 · 원본 비교 → 편집기가 처리 (페이지 이력)
//   필터·조정 → 사진 데이터(studio_images.edit.look, 사진 이력). 꾸미기(테두리·모서리·그림자) → 페이지 요소(페이지 이력)
// 슬라이더를 끄는 동안은 merge: true로 보내 이력을 한 단계로 합친다.
import { computed, ref, onBeforeUnmount } from 'vue'
import { Replace, ImageMinus, Columns2 } from 'lucide-vue-next'
import { LOOK_FILTERS, ADJUST_KEYS, ADJUST_LABELS, ADJUST_MIN, ADJUST_MAX, isDefaultLook, lookCss, normalizeLook } from '@/lib/studioLook'
import { itemStyleOf } from '@/lib/studioPage'

const props = defineProps({
  item: { type: Object, required: true },    // 페이지 사진 요소
  look: { type: Object, required: true },    // 이 사진의 필터·조정 (normalizeLook 모양)
  thumbUrl: { type: String, default: null }, // 필터 미리보기용 작은 사진
})
// replace / remove-from-page / compare(true|false) / reset-look / look(next, { merge }) / style(patch, { merge })
const emit = defineEmits(['replace', 'remove-from-page', 'compare', 'reset-look', 'look', 'style'])

const style = computed(() => itemStyleOf(props.item))
const isDefault = computed(() => isDefaultLook(props.look))
const previewCss = id => lookCss({ ...props.look, filter: id }) || 'none' // 필터 칸 미리보기 (온도·선명도는 CSS만으로 대략)

function setFilter(id) { emit('look', { ...props.look, filter: id }, { merge: false }) }
function setAdjust(k, e) { emit('look', normalizeLook({ ...props.look, [k]: Number(e.target.value) }), { merge: true, key: k }) }
function setStyle(k, e) { emit('style', { [k]: Number(e.target.value) }, { merge: true, key: k }) }
function setColor(e) { emit('style', { borderColor: e.target.value }, { merge: true, key: 'borderColor' }) }

// 원본 비교: 누르고 있는 동안만
const comparing = ref(false)
function startCompare() { if (!comparing.value) { comparing.value = true; emit('compare', true) } }
function endCompare() { if (comparing.value) { comparing.value = false; emit('compare', false) } }
onBeforeUnmount(endCompare)
</script>

<style scoped>
.st-pbtn { height: 32px; padding: 0 8px; font-size: 12px; gap: 4px; justify-content: center; }
.st-pbtn.is-pressed { border-color: var(--st-accent); background: var(--st-accent-soft); color: var(--st-ink); }
.st-filter { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 3px; border-radius: 10px; border: 1.5px solid transparent; background: transparent; cursor: pointer; }
.st-filter:hover { background: var(--st-card-hover); }
.st-filter.is-active { border-color: var(--st-accent); }
.st-filter-thumb { width: 100%; aspect-ratio: 1; border-radius: 7px; overflow: hidden; background: var(--st-card); }
.st-filter-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.st-filter-name { font-size: 11px; font-weight: 700; color: var(--st-ink-2); white-space: nowrap; }
.st-slider-row { display: flex; align-items: center; gap: 8px; }
.st-slider-label { width: 40px; flex: none; font-size: 12px; font-weight: 600; color: var(--st-ink-2); }
.st-slider-value { width: 30px; flex: none; text-align: right; font-size: 11px; font-weight: 600; color: var(--st-muted); font-variant-numeric: tabular-nums; }
.st-range { accent-color: var(--st-accent); min-width: 0; }
.st-color { width: 30px; height: 22px; flex: none; padding: 0; border: 1px solid var(--st-line-strong); border-radius: 6px; background: var(--st-card); cursor: pointer; }
</style>
