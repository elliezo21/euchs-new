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
    <!-- 강조 배지 (11-2): 도형 + 글자를 한 그룹으로 넣는다. 견본 = 넣었을 때 모양 그대로 (buildGroupItems) -->
    <div class="px-4 pt-4 pb-4 space-y-3 st-border-t" data-badge-group>
      <div class="text-[13px] font-extrabold st-ink">강조 배지</div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="b in badges" :key="b.key" type="button" class="st-el-card" :title="b.label" :data-badge-add="b.key"
          :disabled="disabled" @click="$emit('insert-badge', b.key)"
        >
          <span class="st-el-sample is-tall">
            <span class="relative block" :style="b.box">
              <span v-for="(it, i) in b.items" :key="i" class="absolute" :style="partStyle(it, b.scale)">
                <StudioTextView v-if="isValidTextItem(it)" :item="it" :lines="linesOf(it)" :scale="b.scale" />
                <StudioShapeView v-else :item="it" :scale="b.scale" />
              </span>
            </span>
          </span>
          <span class="st-el-name">{{ b.label }}</span>
        </button>
      </div>
      <p class="st-desc-sm break-keep">배지는 한 그룹으로 들어가요. 글자를 두 번 누르면 그 글자만 고칠 수 있어요.</p>
    </div>
    <!-- 사이즈표 (11-2): 기본 틀 3개. 칸 글자는 캔버스에서 칸을 눌러 바로(표 칸 입력) 또는 왼쪽 "표 편집"에서 -->
    <div class="px-4 pt-4 pb-4 space-y-3 st-border-t" data-table-group>
      <div class="text-[13px] font-extrabold st-ink">사이즈표</div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="t in tables" :key="t.key" type="button" class="st-el-card" :title="`${t.label} 사이즈표`" :data-table-add="t.key"
          :disabled="disabled" @click="$emit('insert-table', t.key)"
        >
          <span class="st-el-sample"><span class="relative block" :style="t.box"><StudioTableView :item="t.item" :scale="t.scale" /></span></span>
          <span class="st-el-name">{{ t.label }}</span>
        </button>
      </div>
      <p class="st-desc-sm break-keep">숫자 칸은 "-"로 비워 두었어요. 표를 고르면 왼쪽에서 칸을 채울 수 있어요.</p>
    </div>
  </div>
</template>

<script setup>
// 왼쪽 [요소] 패널 (11-1) — 도형 5개·선 3개 견본(실제 그리기 StudioShapeView). 누르면 insert(종류)만 보낸다 — 넣기·고르기는 편집기가 한다.
// 11-2: 강조 배지 8개(insert-badge — 견본은 넣을 때와 같은 buildGroupItems) · 사이즈표 기본 틀 3개(insert-table — 견본은 StudioTableView)
import { computed, inject } from 'vue'
import { ELEMENT_KINDS, normalizeShapeItem, normalizeLineItem } from '@/lib/studioShape'
import { BADGE_PRESETS } from '@/lib/studioBadge'
import { TABLE_TEMPLATES, tableFieldsOf, normalizeTableItem } from '@/lib/studioTable'
import { buildGroupItems, textLinesOf } from '@/lib/studioPage'
import { isValidTextItem } from '@/lib/studioText'
import StudioShapeView from '@/components/studio/StudioShapeView.vue'
import StudioTextView from '@/components/studio/StudioTextView.vue'
import StudioTableView from '@/components/studio/StudioTableView.vue'

defineProps({
  disabled: { type: Boolean, default: false }, // 페이지가 없을 때
})
defineEmits(['insert', 'insert-badge', 'insert-table'])

// 글자 폭 재기 (편집기 provide — 페이지와 같은 측정). 글꼴을 받으면 epoch가 바뀌어 견본 글자 줄도 다시
const textLayout = inject('studioTextLayout')
function linesOf(it) {
  textLayout.epoch.value
  return textLinesOf(it, textLayout.measure)
}

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

// 배지 견본 — 칸(폭 약 120 · 높이 64) 안에 들어가게 줄인다
const badges = computed(() => {
  textLayout.epoch.value // 글꼴을 받으면 글자 높이도 다시
  return BADGE_PRESETS.map(b => {
    const scale = Math.min(110 / b.w, 58 / b.h)
    return { key: b.key, label: b.label, scale, items: buildGroupItems(b, b.parts, textLayout.measure), box: { width: `${b.w * scale}px`, height: `${b.h * scale}px` } }
  })
})
function partStyle(it, scale) {
  return {
    left: `${it.x * scale}px`, top: `${it.y * scale}px`, width: `${it.w * scale}px`, height: `${it.h * scale}px`,
    transform: it.rotation ? `rotate(${it.rotation}deg)` : null,
  }
}
// 사이즈표 견본 — 칸 폭에 맞춰 줄인다 (글자는 작아도 넣었을 때와 같은 표)
const tables = TABLE_TEMPLATES.map(t => {
  const item = normalizeTableItem({ id: `sample-${t.key}`, x: 0, y: 0, h: 1, ...tableFieldsOf(t) })
  const scale = Math.min(70 / item.w, 46 / item.h)
  return { key: t.key, label: t.label, item, scale, box: { width: `${item.w * scale}px`, height: `${item.h * scale}px` } }
})
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
.st-el-sample.is-tall { height: 70px; }
.st-el-name { font-size: 11px; font-weight: 700; color: var(--st-ink-2); white-space: nowrap; }
</style>
