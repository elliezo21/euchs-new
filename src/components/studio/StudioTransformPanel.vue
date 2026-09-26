<template>
  <div class="px-4 pt-4 pb-3 space-y-3 st-border-b" data-transform-panel>
    <div class="flex items-center gap-2">
      <span class="text-[13px] font-extrabold st-ink">{{ items.length === 1 ? '고른 요소' : `고른 요소 ${items.length}개` }}</span>
      <span v-if="anyLocked" class="st-badge" data-locked-badge><Lock class="w-3 h-3 mr-1" :stroke-width="2" /> 잠김</span>
      <span v-if="anyHidden" class="st-badge" data-hidden-badge><EyeOff class="w-3 h-3 mr-1" :stroke-width="2" /> 숨김</span>
    </div>

    <!-- 숫자 입력 (2줄 × 3칸): 한 개면 X·Y·가로·세로·각도·투명도, 여러 개면 공통 칸(각도·투명도)만.
         값이 서로 다르면 빈칸 + 흐린 "—". Enter·칸 벗어나기 = 반영 -->
    <div class="grid grid-cols-3 gap-x-2 gap-y-2">
      <template v-if="single">
        <label v-for="f in RECT_FIELDS" :key="f.key" class="st-xfield" :data-num="f.key">
          <span class="st-xfield-label">{{ f.label }}</span>
          <span class="st-xfield-box">
            <input
              type="number" step="1" inputmode="numeric" :value="single[f.key]" :disabled="single.locked"
              @change="onRect(f.key, $event)" @keydown.enter="$event.target.blur()"
            />
            <span class="st-xfield-unit">px</span>
          </span>
        </label>
      </template>
      <label class="st-xfield" data-num="rotation">
        <span class="st-xfield-label">각도</span>
        <span class="st-xfield-box">
          <input
            type="number" step="1" inputmode="decimal" :value="common('rotation')" :disabled="allLocked" placeholder="—"
            @change="onRotation($event)" @keydown.enter="$event.target.blur()"
          />
          <span class="st-xfield-unit">°</span>
        </span>
      </label>
      <label class="st-xfield" data-num="opacity">
        <span class="st-xfield-label">투명도</span>
        <span class="st-xfield-box">
          <input
            type="number" min="0" max="100" step="1" inputmode="numeric" :value="opacityPct" placeholder="—"
            @change="onOpacityNum($event)" @keydown.enter="$event.target.blur()"
          />
          <span class="st-xfield-unit">%</span>
        </span>
      </label>
    </div>
    <input
      type="range" min="0" max="100" step="1" class="w-full st-range" :value="opacityPct === '' ? 100 : opacityPct"
      title="투명도" data-opacity-range @input="cmd('opacity', { v: Number($event.target.value) / 100, merge: true })"
    />

    <!-- 돌리기·뒤집기·순서 -->
    <div class="flex flex-wrap gap-1">
      <button type="button" class="st-icon-btn st-tool" :disabled="allLocked" title="90° 돌리기" data-cmd="rotate90" @click="cmd('rotate90')"><RotateCw class="w-4 h-4" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn st-tool" :disabled="allLocked" title="좌우 뒤집기" data-cmd="flipX" @click="cmd('flipX')"><FlipHorizontal2 class="w-4 h-4" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn st-tool" :disabled="allLocked" title="상하 뒤집기" data-cmd="flipY" @click="cmd('flipY')"><FlipVertical2 class="w-4 h-4" :stroke-width="2" /></button>
      <span class="st-tool-sep" />
      <button type="button" class="st-icon-btn st-tool" title="맨 앞으로" data-cmd="order-front" @click="cmd('order', { where: 'front' })"><BringToFront class="w-4 h-4" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn st-tool" title="앞으로" data-cmd="order-forward" @click="cmd('order', { where: 'forward' })"><ChevronUp class="w-4 h-4" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn st-tool" title="뒤로" data-cmd="order-backward" @click="cmd('order', { where: 'backward' })"><ChevronDown class="w-4 h-4" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn st-tool" title="맨 뒤로" data-cmd="order-back" @click="cmd('order', { where: 'back' })"><SendToBack class="w-4 h-4" :stroke-width="2" /></button>
    </div>

    <!-- 정렬: 한 개 = 구간 기준, 여러 개 = 고른 것들 기준 -->
    <div>
      <div class="st-desc-sm mb-1">{{ items.length === 1 ? '정렬 (구간 기준)' : '정렬 (고른 요소끼리)' }}</div>
      <div class="flex flex-wrap gap-1">
        <button v-for="a in ALIGNS" :key="a.where" type="button" class="st-icon-btn st-tool" :disabled="allLocked" :title="a.label" :data-cmd="`align-${a.where}`" @click="cmd('align', { where: a.where })">
          <component :is="a.icon" class="w-4 h-4" :stroke-width="2" />
        </button>
      </div>
    </div>

    <!-- 잠금·숨기기·복제·삭제 -->
    <div class="flex flex-wrap gap-1">
      <button type="button" class="st-btn st-tool-btn" :data-cmd="anyLocked ? 'unlock' : 'lock'" @click="cmd(anyLocked ? 'unlock' : 'lock')">
        <component :is="anyLocked ? LockOpen : Lock" class="w-3.5 h-3.5" :stroke-width="2" /> {{ anyLocked ? '잠금 풀기' : '잠그기' }}
      </button>
      <button type="button" class="st-btn st-tool-btn" :data-cmd="anyHidden ? 'show' : 'hide'" @click="cmd(anyHidden ? 'show' : 'hide')">
        <component :is="anyHidden ? Eye : EyeOff" class="w-3.5 h-3.5" :stroke-width="2" /> {{ anyHidden ? '보이기' : '숨기기' }}
      </button>
      <button type="button" class="st-btn st-tool-btn" title="Ctrl+D" data-cmd="duplicate" @click="cmd('duplicate')"><CopyPlus class="w-3.5 h-3.5" :stroke-width="2" /> 복제</button>
      <button type="button" class="st-btn st-tool-btn st-danger-text" :disabled="allLocked" title="Delete" data-cmd="delete" @click="cmd('delete')"><Trash2 class="w-3.5 h-3.5" :stroke-width="2" /> 삭제</button>
    </div>
  </div>
</template>

<script setup>
// 고른 요소의 공통 조작 패널 (6-1단계) — 왼쪽 재료 패널 위쪽. 사진·글자·도형 모두 같은 칸.
// 누르면 command(name, args)만 보낸다 — 실제 바꾸기는 편집기의 runCommand 하나가 한다 (단축키·우클릭 메뉴와 같은 길).
import { computed, nextTick } from 'vue'
import {
  RotateCw, FlipHorizontal2, FlipVertical2, BringToFront, SendToBack, ChevronUp, ChevronDown, Lock, LockOpen, Eye, EyeOff, CopyPlus, Trash2,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
} from 'lucide-vue-next'
import { findItem } from '@/lib/studioPage'

const props = defineProps({
  page: { type: Object, required: true },
  selectedIds: { type: Array, required: true },
})
const emit = defineEmits(['command'])
const cmd = (name, args = {}) => emit('command', name, args)

const RECT_FIELDS = [{ key: 'x', label: 'X' }, { key: 'y', label: 'Y' }, { key: 'w', label: '가로' }, { key: 'h', label: '세로' }]
const ALIGNS = [
  { where: 'left', label: '왼쪽 맞춤', icon: AlignStartVertical },
  { where: 'hcenter', label: '가로 가운데', icon: AlignCenterVertical },
  { where: 'right', label: '오른쪽 맞춤', icon: AlignEndVertical },
  { where: 'top', label: '위쪽 맞춤', icon: AlignStartHorizontal },
  { where: 'vcenter', label: '세로 가운데', icon: AlignCenterHorizontal },
  { where: 'bottom', label: '아래쪽 맞춤', icon: AlignEndHorizontal },
]

const items = computed(() => props.selectedIds.map(id => findItem(props.page, id)?.item).filter(Boolean))
const single = computed(() => (items.value.length === 1 ? items.value[0] : null))
const anyLocked = computed(() => items.value.some(it => it.locked))
const allLocked = computed(() => items.value.length > 0 && items.value.every(it => it.locked))
const anyHidden = computed(() => items.value.some(it => it.hidden))
/** 모두 같은 값이면 그 값, 다르면 '' (빈칸) */
function common(key) {
  const vals = [...new Set(items.value.map(it => it[key] ?? 0))]
  return vals.length === 1 ? vals[0] : ''
}
const opacityPct = computed(() => { const o = common('opacity'); return o === '' ? '' : Math.round(o * 100) })

function num(e) {
  const v = Number(e.target.value)
  return e.target.value === '' || !Number.isFinite(v) ? null : v
}
// 반영 뒤 칸에 실제 값을 다시 쓴다 (최소 크기·잠금 등으로 값이 그대로면 화면이 다시 그려지지 않아 입력한 글자가 남으므로)
function resync(el, read) { nextTick(() => { el.value = read() }) }
function onRect(key, e) {
  const v = num(e)
  if (v !== null) cmd('rect', { [key]: v })
  resync(e.target, () => single.value?.[key] ?? '')
}
function onRotation(e) {
  const v = num(e)
  if (v !== null) cmd('rotation', { deg: v })
  resync(e.target, () => common('rotation'))
}
function onOpacityNum(e) {
  const v = num(e)
  if (v !== null) cmd('opacity', { v: Math.min(100, Math.max(0, v)) / 100 })
  resync(e.target, () => opacityPct.value)
}
</script>

<style scoped>
/* 숫자 칸 — 이름은 st-xfield (전역 .studio-root .st-num = 시작 화면 번호 동그라미 24px과 겹치지 않게) */
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
  -moz-appearance: textfield; appearance: textfield; /* 위아래 화살표 숨김 (Firefox) */
}
.st-xfield-box input::-webkit-outer-spin-button,
.st-xfield-box input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } /* 위아래 화살표 숨김 (크롬·사파리) */
.st-xfield-box input::placeholder { color: var(--st-muted); opacity: 0.7; }
.st-xfield-box input:disabled { opacity: 0.45; }
.st-xfield-unit { flex: none; margin-left: 2px; font-size: 11px; font-weight: 600; color: var(--st-muted); }
.st-range { accent-color: var(--st-accent); }
.st-tool { width: 32px; height: 32px; }
.st-tool-sep { width: 1px; height: 20px; margin: 6px 2px; background: var(--st-line-strong); }
.st-tool-btn { height: 30px; padding: 0 10px; font-size: 12px; gap: 4px; }
</style>
