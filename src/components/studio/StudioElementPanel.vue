<template>
  <div class="flex flex-col h-full overflow-y-auto" data-element-panel>
    <div class="px-4 pt-4 pb-4 space-y-3">
      <div class="text-[13px] font-extrabold st-ink">도형</div>
      <p class="st-desc-sm break-keep">누르면 지금 보고 있는 구간 가운데에 들어가요.</p>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="k in shapeKinds" :key="k.key" type="button" class="st-el-card" :title="k.label" :data-element-add="k.key"
          :disabled="disabled" @click="$emit('insert', k.key)"
        >
          <span class="st-el-sample"><span class="relative block" :style="k.box"><StudioShapeView :item="k.item" :scale="k.scale" /></span></span>
          <span class="st-el-name">{{ k.label }}</span>
        </button>
      </div>
    </div>
    <div class="px-4 pt-4 pb-4 space-y-3 st-border-t">
      <div class="text-[13px] font-extrabold st-ink">선·화살표</div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="k in lineKinds" :key="k.key" type="button" class="st-el-card" :title="k.label" :data-element-add="k.key"
          :disabled="disabled" @click="$emit('insert', k.key)"
        >
          <span class="st-el-sample"><span class="relative block" :style="k.box"><StudioShapeView :item="k.item" :scale="k.scale" /></span></span>
          <span class="st-el-name">{{ k.label }}</span>
        </button>
      </div>
      <p v-if="disabled" class="st-desc-sm break-keep">페이지가 준비되면 넣을 수 있어요.</p>
      <p class="st-desc-sm break-keep">선은 양 끝 점을 끌어 길이와 방향을 바꿔요. Shift를 누르고 끌면 15°씩 맞춰져요.</p>
    </div>
  </div>
</template>

<script setup>
// 왼쪽 [요소] 패널 (11-1) — 도형 5개·선 3개 견본(실제 그리기 StudioShapeView). 누르면 insert(종류)만 보낸다 — 넣기·고르기는 편집기가 한다.
import { ELEMENT_KINDS, normalizeShapeItem, normalizeLineItem } from '@/lib/studioShape'
import StudioShapeView from '@/components/studio/StudioShapeView.vue'

defineProps({
  disabled: { type: Boolean, default: false }, // 페이지가 없을 때
})
defineEmits(['insert'])

const SAMPLE = 44 // 견본 한 변 (화면 px)
// 견본용 요소 — 도형은 넣을 때 크기를 견본 칸에 맞춰 줄이고, 선은 짧게(폭 90) 그린다
function sampleOf(k) {
  if (k.fields.type === 'shape') {
    const item = normalizeShapeItem({ id: `sample-${k.key}`, x: 0, y: 0, ...k.fields })
    const scale = SAMPLE / Math.max(item.w, item.h)
    return { key: k.key, label: k.label, item, scale, box: { width: `${item.w * scale}px`, height: `${item.h * scale}px` } }
  }
  const item = normalizeLineItem({ id: `sample-${k.key}`, x: 0, y: 0, h: 24, ...k.fields, w: 90 })
  const scale = 0.6
  return { key: k.key, label: k.label, item, scale, box: { width: `${item.w * scale}px`, height: `${item.h * scale}px` } }
}
const shapeKinds = ELEMENT_KINDS.filter(k => k.fields.type === 'shape').map(sampleOf)
const lineKinds = ELEMENT_KINDS.filter(k => k.fields.type === 'line').map(sampleOf)
</script>

<style scoped>
.st-el-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px 6px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card);
}
.st-el-card:hover:not(:disabled) { border-color: var(--st-accent); }
.st-el-card:disabled { opacity: 0.45; cursor: default; }
/* 견본 바탕은 밝게 (작업물 색 그대로 보이게 — 어두운 화면 위 흰 페이지처럼) */
.st-el-sample { width: 100%; height: 56px; border-radius: 7px; background: #f4f5f7; display: flex; align-items: center; justify-content: center; }
.st-el-name { font-size: 11px; font-weight: 700; color: var(--st-ink-2); white-space: nowrap; }
</style>
