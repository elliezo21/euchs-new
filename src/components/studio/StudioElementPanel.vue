<template>
  <div class="flex flex-col h-full min-h-0" data-element-panel>
    <!-- 종류 버튼 (맨 위 고정): 누르면 그 종류만 아래 목록에 — 목록은 그 안에서만 스크롤. 마지막 종류는 편집기가 기억한다 -->
    <div class="shrink-0 px-4 pt-4 pb-3 space-y-2 st-border-b">
      <div class="st-seg w-full" role="tablist" aria-label="요소 종류" data-element-tabs>
        <button
          v-for="t in ELEMENT_TABS" :key="t.key" type="button" role="tab" class="st-seg-item flex-1"
          :class="current === t.key ? 'is-active' : ''" :aria-selected="current === t.key" :data-element-tab="t.key"
          @click="$emit('update:tab', t.key)"
        >{{ t.label }}</button>
      </div>
      <p class="st-desc-sm break-keep">누르면 지금 보고 있는 섹션 가운데에 들어가요.</p>
      <p v-if="disabled" class="st-desc-sm break-keep">페이지가 준비되면 넣을 수 있어요.</p>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto" data-element-list>
    <template v-if="current === 'shape'">
    <div class="px-4 pt-4 pb-4 space-y-3">
      <div class="text-[13px] font-extrabold st-ink">도형</div>
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
      <p class="st-desc-sm break-keep">선은 양 끝 점을 끌어 길이와 방향을 바꿔요. Shift를 누르고 끌면 15°씩 맞춰져요.</p>
    </div>
    </template>
    <!-- 강조 배지 (11-2): 도형 + 글자를 한 그룹으로 넣는다. 견본 = 넣었을 때 모양 그대로 (buildGroupItems) -->
    <div v-else-if="current === 'badge'" class="px-4 pt-4 pb-4 space-y-3" data-badge-group>
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
    <!-- 꾸밈 요소 (에셋 채우기): 체크·번호·말풍선·구분선·화살표 — 배지와 같은 묶음 넣기(insert-badge), 견본 = 넣었을 때 모양 그대로 -->
    <template v-else-if="current === 'decor'">
      <div v-for="(g, gi) in decorGroups" :key="g.key" class="px-4 pt-4 pb-4 space-y-3" :class="gi ? 'st-border-t' : ''" :data-decor-group="g.key">
        <div class="text-[13px] font-extrabold st-ink">{{ g.label }}</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="b in g.items" :key="b.key" type="button" class="st-el-card" :title="b.label" :data-decor-add="b.key"
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
      </div>
      <p class="px-4 pb-4 st-desc-sm break-keep">색과 글자는 넣은 뒤 바꿀 수 있어요. 번호는 글자를 두 번 눌러 고쳐 쓰세요.</p>
    </template>
    <!-- 표 (11-2 사이즈표 + 에셋 채우기 비교표·스펙표). 칸 글자는 캔버스에서 칸을 눌러 바로(표 칸 입력) 또는 왼쪽 "표 편집"에서 -->
    <div v-else data-table-group>
      <div v-for="(g, gi) in tableGroups" :key="g.key" class="px-4 pt-4 pb-4 space-y-3" :class="gi ? 'st-border-t' : ''" :data-table-kind="g.key">
        <div class="text-[13px] font-extrabold st-ink">{{ g.label }}</div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="t in g.items" :key="t.key" type="button" class="st-el-card" :title="t.label" :data-table-add="t.key"
            :disabled="disabled" @click="$emit('insert-table', t.key)"
          >
            <span class="st-el-sample"><span class="relative block" :style="t.box"><StudioTableView :item="t.item" :scale="t.scale" /></span></span>
            <span class="st-el-name">{{ t.label }}</span>
          </button>
        </div>
      </div>
      <p class="px-4 pb-4 st-desc-sm break-keep">숫자 칸은 "-"로 비워 두었어요. 넣은 뒤 캔버스에서 칸을 눌러 바로 입력하세요.</p>
    </div>
    </div>
  </div>
</template>

<script setup>
// 왼쪽 [요소] 패널 (11-1) — 도형 5개·선 3개 견본(실제 그리기 StudioShapeView). 누르면 insert(종류)만 보낸다 — 넣기·고르기는 편집기가 한다.
// 11-2: 강조 배지 8개(insert-badge — 견본은 넣을 때와 같은 buildGroupItems) · 사이즈표 기본 틀 3개(insert-table — 견본은 StudioTableView)
// 에셋 채우기: 도형 12개·배지 18개·꾸밈 요소(studioDecor)·표 11개(사이즈표 7 + 비교표·스펙표 4)
// 맨 위 종류 버튼 [도형]·[배지]·[꾸밈]·[표] — 한 종류만 보이고 목록 칸 안에서 스크롤 (에셋 모양은 그대로)
import { computed, inject } from 'vue'
import { ELEMENT_KINDS, normalizeShapeItem, normalizeLineItem } from '@/lib/studioShape'
import { BADGE_PRESETS } from '@/lib/studioBadge'
import { DECOR_PRESETS, DECOR_KINDS } from '@/lib/studioDecor'
import { TABLE_TEMPLATES, TABLE_GROUPS, tableGroupOf, tableFieldsOf, normalizeTableItem } from '@/lib/studioTable'
import { buildGroupItems, textLinesOf } from '@/lib/studioPage'
import { isValidTextItem } from '@/lib/studioText'
import { ELEMENT_TABS, elementTabOf } from '@/lib/studioCanvasUi'
import StudioShapeView from '@/components/studio/StudioShapeView.vue'
import StudioTextView from '@/components/studio/StudioTextView.vue'
import StudioTableView from '@/components/studio/StudioTableView.vue'

const props = defineProps({
  disabled: { type: Boolean, default: false }, // 페이지가 없을 때
  tab: { type: String, default: '' },           // 지금 종류 (편집기가 기억 — 이 패널은 [요소]를 열 때마다 새로 만들어진다)
})
defineEmits(['insert', 'insert-badge', 'insert-table', 'update:tab'])
const current = computed(() => elementTabOf(props.tab))

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
function groupSample(b) {
  const scale = Math.min(110 / b.w, 58 / b.h, 1)
  return { key: b.key, kind: b.kind, label: b.label, scale, items: buildGroupItems(b, b.parts, textLayout.measure), box: { width: `${b.w * scale}px`, height: `${b.h * scale}px` } }
}
const badges = computed(() => {
  textLayout.epoch.value // 글꼴을 받으면 글자 높이도 다시
  return BADGE_PRESETS.map(groupSample)
})
// 꾸밈 요소 견본 — 묶음(체크·번호 / 말풍선 / 구분선 / 화살표)별로
const decorGroups = computed(() => {
  textLayout.epoch.value
  const all = DECOR_PRESETS.map(groupSample)
  return DECOR_KINDS.map(k => ({ ...k, items: all.filter(d => d.kind === k.key) })).filter(g => g.items.length)
})
function partStyle(it, scale) {
  return {
    left: `${it.x * scale}px`, top: `${it.y * scale}px`, width: `${it.w * scale}px`, height: `${it.h * scale}px`,
    transform: it.rotation ? `rotate(${it.rotation}deg)` : null, // 뒤집기는 StudioShapeView·StudioTextView가 스스로 그린다
  }
}
// 사이즈표 견본 — 칸 폭에 맞춰 줄인다 (글자는 작아도 넣었을 때와 같은 표)
const tables = TABLE_TEMPLATES.map(t => {
  const item = normalizeTableItem({ id: `sample-${t.key}`, x: 0, y: 0, h: 1, ...tableFieldsOf(t) })
  const scale = Math.min(70 / item.w, 46 / item.h)
  return { key: t.key, group: tableGroupOf(t), label: t.label, item, scale, box: { width: `${item.w * scale}px`, height: `${item.h * scale}px` } }
})
const tableGroups = TABLE_GROUPS.map(g => ({ ...g, items: tables.filter(t => t.group === g.key) }))
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
