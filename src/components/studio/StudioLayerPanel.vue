<template>
  <div class="flex-1 min-h-0 flex flex-col" data-layer-panel>
    <div class="px-3 pb-2 flex items-center gap-2">
      <span class="text-[12px] font-extrabold st-ink truncate" data-layer-title>{{ section ? sectionLabel : '구간 없음' }}</span>
      <span v-if="section" class="ml-auto shrink-0 text-[11px] font-bold st-muted">{{ section.items.length }}개</span>
    </div>
    <p v-if="!section" class="px-3 st-desc break-keep" data-layer-empty>페이지에 구간이 생기면 여기에 요소 목록이 보여요.</p>
    <p v-else-if="blocks.length === 0" class="px-3 st-desc break-keep" data-layer-empty>이 구간은 비어 있어요</p>

    <!-- 맨 위 = 가장 앞 (items 배열의 끝). 그룹은 한 줄 + 아래에 구성원 -->
    <ol v-else class="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-0.5" data-layer-list>
      <li
        v-for="b in blocks" :key="b.key" draggable="true"
        :class="dropMark(b.key)" :data-layer-block="b.key"
        @dragstart="onDragStart($event, b)" @dragend="onDragEnd" @dragover="onDragOver($event, b)" @drop="onDrop($event, b)"
      >
        <!-- 그룹 줄 -->
        <div
          v-if="b.kind === 'group'" class="st-layer-row" :class="isAllSelected(b.ids) ? 'is-selected' : ''"
          role="button" tabindex="0" :data-layer-group="b.key"
          @click="pick($event, b.ids)" @keydown.enter.prevent="pick($event, b.ids)"
        >
          <button type="button" class="st-layer-icon" :title="collapsed.has(b.key) ? '펼치기' : '접기'" :data-layer-toggle="b.key" @click.stop="toggle(b.key)">
            <component :is="collapsed.has(b.key) ? ChevronRight : ChevronDown" class="w-3.5 h-3.5" :stroke-width="2.5" />
          </button>
          <span class="st-layer-thumb st-layer-thumb-group"><Group class="w-3.5 h-3.5" :stroke-width="2" /></span>
          <span class="flex-1 min-w-0 truncate text-[12px] font-bold st-ink-2">그룹 · {{ b.ids.length }}개</span>
          <LayerButtons :hidden="allOf(b.members, 'hidden')" :locked="allOf(b.members, 'locked')" @hide="setHidden(b.ids, $event)" @lock="setLocked(b.ids, $event)" />
        </div>
        <!-- 요소 줄 (그룹이면 구성원 줄들 — 누르면 그 요소 하나만) -->
        <template v-if="b.kind === 'item' || !collapsed.has(b.key)">
          <div
            v-for="it in (b.kind === 'group' ? b.members : [b.item])" :key="it.id"
            class="st-layer-row" :class="[selectedSet.has(it.id) ? 'is-selected' : '', b.kind === 'group' ? 'is-member' : '', it.hidden ? 'is-hidden' : '']"
            role="button" tabindex="0" :data-layer-item="it.id"
            @click="pick($event, [it.id])" @keydown.enter.prevent="pick($event, [it.id])"
          >
            <span class="st-layer-thumb">
              <img v-if="imageUrl(it)" :src="imageUrl(it)" alt="" draggable="false" class="w-full h-full object-cover" :style="views[it.imageId]?.bgColor ? { background: views[it.imageId].bgColor } : null" />
              <ImageIcon v-else-if="isImage(it)" class="w-3.5 h-3.5" :stroke-width="2" />
              <Type v-else-if="isValidTextItem(it)" class="w-3.5 h-3.5" :stroke-width="2" />
              <Square v-else-if="isValidShapeItem(it)" class="w-3.5 h-3.5" :stroke-width="2" />
              <MoveRight v-else-if="isValidLineItem(it)" class="w-3.5 h-3.5" :stroke-width="2" />
              <Table2 v-else-if="isValidTableItem(it)" class="w-3.5 h-3.5" :stroke-width="2" />
              <Shapes v-else class="w-3.5 h-3.5" :stroke-width="2" />
            </span>
            <span class="flex-1 min-w-0 truncate text-[12px] font-bold st-ink-2">{{ nameOf(it) }}</span>
            <LayerButtons :hidden="!!it.hidden" :locked="!!it.locked" @hide="setHidden([it.id], $event)" @lock="setLocked([it.id], $event)" />
          </div>
        </template>
      </li>
    </ol>
    <p v-if="section && blocks.length > 1" class="px-3 pb-3 st-desc-sm break-keep">줄을 끌어 앞뒤 순서를 바꿀 수 있어요. 맨 위가 가장 앞이에요.</p>
  </div>
</template>

<script setup>
// 오른쪽 [레이어] 탭 (9단계) — 한 구간의 요소 목록. 맨 위 = 가장 앞(items 배열의 끝). 그룹은 한 줄(펼치기·접기) + 구성원 줄.
// 줄 누르기 = 그 요소만(그룹 구성원 줄도 하나만), Shift = 더하기·빼기, 그룹 줄 = 그룹 전체 → select({ ids, shift })
// 눈·자물쇠 = 숨기기·잠금(그룹 줄은 구성원 전체), 줄 끌기 = 앞뒤 순서(그룹은 통째로) → command(name, args) — 편집기 runCommand(이력·페이지 저장)
// 사진 그림은 편집기의 화면용 작은 사진(views)만 쓴다.
import { ref, computed, h } from 'vue'
import { ChevronDown, ChevronRight, Group, Shapes, Type, Square, MoveRight, Table2, Image as ImageIcon, Eye, EyeOff, Lock, LockOpen } from 'lucide-vue-next'
import { isValidShapeItem, isValidLineItem, elementLabel } from '@/lib/studioShape'
import { isValidTableItem, tableLabel } from '@/lib/studioTable'
import { isValidImageItem } from '@/lib/studioPage'
import { isValidTextItem, textLabel } from '@/lib/studioText'
import { KIND_LABEL } from '@/lib/studioProjects'

const props = defineProps({
  page: { type: Object, required: true },
  sectionId: { type: String, default: null },       // 보여 줄 구간 (편집기가 정한다: 고른 요소의 구간 → 골라진 구간 → 보는 중 구간)
  sectionLabel: { type: String, default: '' },      // "03 상세 이미지"
  selectedIds: { type: Array, default: () => [] },  // 페이지에서 고른 요소
  views: { type: Object, required: true },
  imagesById: { type: Map, required: true },
})
const emit = defineEmits(['select', 'command'])

// 눈·자물쇠 버튼 (줄마다 같은 모양 — 이 파일 안에서만 쓰는 작은 컴포넌트)
const LayerButtons = (p, { emit: e }) => h('span', { class: 'flex items-center shrink-0' }, [
  h('button', {
    type: 'button', class: ['st-layer-icon', p.hidden ? 'is-on' : ''], title: p.hidden ? '보이기' : '숨기기', 'data-layer-hide': '',
    onClick: ev => { ev.stopPropagation(); e('hide', !p.hidden) },
  }, [h(p.hidden ? EyeOff : Eye, { class: 'w-3.5 h-3.5', 'stroke-width': 2 })]),
  h('button', {
    type: 'button', class: ['st-layer-icon', p.locked ? 'is-on' : ''], title: p.locked ? '잠금 풀기' : '잠그기', 'data-layer-lock': '',
    onClick: ev => { ev.stopPropagation(); e('lock', !p.locked) },
  }, [h(p.locked ? Lock : LockOpen, { class: 'w-3.5 h-3.5', 'stroke-width': 2 })]),
])
LayerButtons.props = ['hidden', 'locked']
LayerButtons.emits = ['hide', 'lock']

const collapsed = ref(new Set()) // 접은 그룹 (groupId)
const dragKey = ref(null)
const dropAt = ref(null) // { key, above }

const section = computed(() => (props.sectionId ? props.page.sections.find(s => s.id === props.sectionId) ?? null : null))
const selectedSet = computed(() => new Set(props.selectedIds))
/** 줄 덩어리 — 맨 앞부터. 그룹은 가장 앞 구성원 자리에 한 번만 (구성원도 앞부터) */
const blocks = computed(() => {
  const s = section.value
  if (!s) return []
  const out = []
  const seen = new Set()
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i]
    if (!it || typeof it.id !== 'string') continue
    if (typeof it.groupId === 'string' && it.groupId !== '') {
      if (seen.has(it.groupId)) continue
      seen.add(it.groupId)
      const members = s.items.filter(x => x?.groupId === it.groupId).reverse()
      out.push({ kind: 'group', key: it.groupId, ids: members.map(m => m.id), members })
    } else {
      out.push({ kind: 'item', key: it.id, ids: [it.id], item: it })
    }
  }
  return out
})

const isImage = it => isValidImageItem(it)
const imageUrl = it => (isImage(it) ? props.views[it.imageId]?.url ?? null : null)
function nameOf(it) {
  if (isValidTextItem(it)) return textLabel(it) // 10-1: "글자 · 앞 10자"
  if (isValidShapeItem(it) || isValidLineItem(it)) return elementLabel(it) // 11-1: "도형 · 네모" / "선" / "화살표"
  if (isValidTableItem(it)) return tableLabel() // 11-2: "사이즈표"
  if (!isImage(it)) return '요소'
  const row = props.imagesById.get(it.imageId)
  return row ? KIND_LABEL[row.kind] ?? '사진' : '없는 사진'
}
const allOf = (items, key) => items.length > 0 && items.every(it => !!it[key])
const isAllSelected = ids => ids.length > 0 && ids.every(id => selectedSet.value.has(id))

function pick(e, ids) { emit('select', { ids, shift: !!e.shiftKey }) }
function toggle(key) {
  const next = new Set(collapsed.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  collapsed.value = next
}
function setHidden(ids, hidden) { emit('command', 'layerHidden', { ids, hidden }) }
function setLocked(ids, locked) { emit('command', 'layerLocked', { ids, locked }) }

// ── 끌어 앞뒤 순서 (덩어리 = 요소 하나 또는 그룹 전체) ──
function onDragStart(e, b) {
  dragKey.value = b.key
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', b.key) // 파이어폭스는 값이 있어야 끌기가 시작된다
}
function onDragEnd() { dragKey.value = null; dropAt.value = null }
function onDragOver(e, b) {
  if (!dragKey.value) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const r = e.currentTarget.getBoundingClientRect()
  dropAt.value = { key: b.key, above: e.clientY < r.top + r.height / 2 }
}
function onDrop(e, b) {
  if (!dragKey.value) return
  e.preventDefault()
  const drag = blocks.value.find(x => x.key === dragKey.value)
  const above = dropAt.value?.key === b.key && dropAt.value.above
  onDragEnd()
  if (!drag || drag.key === b.key || !section.value) return
  // 목록 위 = 배열 뒤쪽. 덩어리를 뺀 나머지 배열에서 대상 덩어리 바로 앞(목록 위)이면 대상의 가장 뒤 자리 + 1, 바로 뒤(목록 아래)면 가장 앞 자리
  const rest = section.value.items.filter(it => !drag.ids.includes(it?.id))
  const idx = rest.map((it, i) => (b.ids.includes(it?.id) ? i : -1)).filter(i => i >= 0)
  if (idx.length === 0) return
  emit('command', 'layerMove', { ids: drag.ids, toIndex: above ? Math.max(...idx) + 1 : Math.min(...idx) })
}
function dropMark(key) {
  if (!dropAt.value || dropAt.value.key !== key || dragKey.value === key) return ''
  return dropAt.value.above ? 'drop-above' : 'drop-below'
}
</script>

<style scoped>
.st-layer-row {
  display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 4px 0 6px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent;
}
.st-layer-row:hover { background: var(--st-card); }
.st-layer-row.is-selected { background: var(--st-accent-soft); border-color: var(--st-accent-ring); }
.st-layer-row.is-member { padding-left: 26px; }
.st-layer-row.is-hidden .st-layer-thumb { opacity: 0.4; }
.st-layer-row:focus-visible { outline: 2px solid var(--st-accent); outline-offset: -2px; }
.st-layer-thumb {
  flex: none; width: 28px; height: 28px; border-radius: 6px; overflow: hidden; display: inline-flex; align-items: center; justify-content: center;
  background: var(--st-card); color: var(--st-muted); border: 1px solid var(--st-line);
}
.st-layer-thumb-group { color: var(--st-ink-2); }
.st-layer-icon {
  flex: none; width: 24px; height: 24px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
  color: var(--st-muted); background: transparent; border: 0; cursor: pointer;
}
.st-layer-icon:hover { color: var(--st-ink); background: var(--st-card-hover); }
.st-layer-icon.is-on { color: var(--st-ink-2); }
li { position: relative; }
li.drop-above::before, li.drop-below::after {
  content: ''; position: absolute; left: 4px; right: 4px; height: 2px; border-radius: 2px; background: var(--st-accent);
}
li.drop-above::before { top: -1px; }
li.drop-below::after { bottom: -1px; }
</style>
