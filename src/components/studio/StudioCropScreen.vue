<template>
  <div class="absolute inset-0 flex flex-col st-bg" style="z-index: 20" data-crop-screen>
    <!-- 상단: [취소] · "자르기" · 사진 이름 · [자르기]/[띠 잘라내기] · [완료] -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-2 st-topbar st-border-b">
      <button type="button" class="st-btn st-btn-ghost" data-crop-cancel @click="$emit('cancel')"><X class="w-4 h-4" :stroke-width="2" /> 취소</button>
      <div class="ml-1 leading-tight min-w-0">
        <div class="text-[15px] font-extrabold st-ink">자르기</div>
        <div class="text-[11px] st-muted truncate">{{ imageLabel }}</div>
      </div>
      <div class="mx-auto flex items-center gap-1 p-1 rounded-[10px] st-card" data-crop-tabs>
        <button type="button" class="st-tab" :class="tab === 'crop' ? 'is-active' : ''" data-crop-tab="crop" @click="tab = 'crop'"><Crop class="w-4 h-4" :stroke-width="2" /> 자르기</button>
        <button type="button" class="st-tab" :class="tab === 'cuts' ? 'is-active' : ''" data-crop-tab="cuts" @click="tab = 'cuts'"><ScissorsLineDashed class="w-4 h-4" :stroke-width="2" /> 띠 잘라내기</button>
      </div>
      <button type="button" class="st-btn st-btn-primary" :disabled="status !== 'ready'" data-crop-done @click="done"><Check class="w-4 h-4" :stroke-width="2.5" /> 완료</button>
    </header>

    <div class="flex-1 min-h-0 flex">
      <!-- 가운데: 사진(원본 전체) + 자르기 네모 / 띠 -->
      <section ref="area" class="flex-1 min-w-0 overflow-auto st-canvas-bg" data-crop-area>
        <p v-if="status === 'loading'" class="p-6 st-desc">사진을 불러오는 중…</p>
        <div v-else-if="status === 'error'" class="p-6 space-y-2" data-crop-error>
          <p class="text-[13px] font-bold st-danger-text break-keep">사진을 불러오지 못했어요. {{ errorText }}</p>
          <button type="button" class="st-btn" @click="load"><RefreshCw class="w-3.5 h-3.5" :stroke-width="2" /> 다시 시도</button>
        </div>
        <div v-else class="p-6 flex justify-center">
          <div
            ref="stage" class="relative select-none shrink-0" :style="{ width: `${dispW}px`, height: `${dispH}px`, cursor: tab === 'cuts' ? 'row-resize' : 'default' }"
            data-crop-stage @pointerdown="onStageDown"
          >
            <canvas ref="photo" class="absolute inset-0 block" :style="{ width: `${dispW}px`, height: `${dispH}px` }" />
            <!-- 잘라낸 띠 (줄무늬) -->
            <div
              v-for="(c, i) in cuts" :key="`c${i}`" class="absolute left-0 w-full st-cut pointer-events-none"
              :style="{ top: `${c.y * k}px`, height: `${c.h * k}px` }" data-crop-cut
            />
            <!-- 고르는 중인 띠 -->
            <div v-if="band" class="absolute left-0 w-full st-band pointer-events-none" :style="{ top: `${band.y * k}px`, height: `${band.h * k}px` }" data-crop-band />
            <!-- 자르기 네모 (자르기 탭: 바깥 어둡게 + 손잡이 / 띠 탭: 점선만) -->
            <div
              class="absolute" :class="tab === 'crop' ? 'st-crop-rect' : 'st-crop-ghost pointer-events-none'"
              :style="{ left: `${rect.x * k}px`, top: `${rect.y * k}px`, width: `${rect.w * k}px`, height: `${rect.h * k}px` }"
              data-crop-rect @pointerdown.stop="onRectDown($event, 'move')"
            >
              <template v-if="tab === 'crop'">
                <span
                  v-for="h in HANDLES" :key="h" class="st-crop-handle" :class="`is-${h}`" :data-crop-handle="h"
                  @pointerdown.stop="onRectDown($event, h)"
                />
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- 오른쪽: 조작 + 결과 미리보기 -->
      <aside class="w-[300px] shrink-0 flex flex-col st-surface st-border-l overflow-y-auto" data-crop-side>
        <div v-if="tab === 'crop'" class="p-4 space-y-3" data-crop-panel="crop">
          <p class="st-desc-sm break-keep">사진 위 네모의 모서리·변을 끌어 남길 곳을 정하세요. 안쪽을 끌면 옮겨져요.</p>
          <div>
            <div class="st-xlabel mb-1">비율</div>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="r in CROP_RATIOS" :key="r.key" type="button" class="st-chip" :class="ratioKey === r.key ? 'is-active' : ''"
                :data-crop-ratio="r.key" @click="setRatio(r.key)"
              >{{ r.label }}</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="f in RECT_FIELDS" :key="f" class="st-field">
              <span class="st-xlabel">{{ f }}</span>
              <span class="st-field-box">
                <input type="number" step="1" :value="rect[f]" :data-crop-num="f" @change="onNum(f, $event)" @keydown.enter="$event.target.blur()" />
                <span class="st-unit">px</span>
              </span>
            </label>
          </div>
          <button type="button" class="st-btn st-btn-block" :disabled="isFull" data-crop-clear @click="clearCrop"><RotateCcw class="w-3.5 h-3.5" :stroke-width="2" /> 자르기 없애기</button>
        </div>

        <div v-else class="p-4 space-y-3" data-crop-panel="cuts">
          <p class="st-desc-sm break-keep">사진 위에서 위아래로 끌어 뺄 가로 띠를 고르세요. 중간의 안내·광고 줄을 빼고 위아래를 붙여요.</p>
          <div v-if="band" class="p-2 rounded-[8px] st-card space-y-2" data-crop-band-info>
            <div class="text-[12px] font-bold st-ink-2">고른 띠 · {{ band.y }} ~ {{ band.y + band.h }}px ({{ band.h }}px)</div>
            <button type="button" class="st-btn st-btn-primary st-btn-block" :disabled="band.h < SHAPE_MIN" data-crop-add-cut @click="addCut">이 띠 빼기</button>
            <p v-if="band.h < SHAPE_MIN" class="text-[11px] st-muted">{{ SHAPE_MIN }}px 이상 골라 주세요</p>
            <p v-if="cutWarning" class="text-[11px] font-bold st-danger-text break-keep" data-crop-cut-warning>{{ cutWarning }}</p>
          </div>
          <div>
            <div class="st-xlabel mb-1">뺀 띠 {{ cuts.length }}개</div>
            <p v-if="!cuts.length" class="st-desc-sm">아직 뺀 띠가 없어요</p>
            <ul class="space-y-1" data-crop-cut-list>
              <li v-for="(c, i) in cuts" :key="`${c.y}-${c.h}`" class="flex items-center gap-2 text-[12px] st-ink-2">
                <span class="flex-1 tabular-nums">{{ c.y }} ~ {{ c.y + c.h }}px</span>
                <button type="button" class="st-link-btn" :data-crop-restore="i" @click="restoreCut(i)">되살리기</button>
              </li>
            </ul>
          </div>
        </div>

        <!-- 결과 미리보기 (띠를 뺀 뒤 → 자른 모습, 필터 전) -->
        <div class="px-4 pb-4 space-y-2 st-border-t pt-3">
          <div class="flex items-center">
            <span class="st-xlabel">결과</span>
            <span class="ml-auto text-[11px] st-muted tabular-nums" data-crop-result-size>{{ geo.width }} × {{ geo.height }}px</span>
          </div>
          <p v-if="geo.cropIgnored" class="text-[11px] font-bold st-danger-text break-keep" data-crop-ignored>자르기 영역이 모두 뺀 띠 안이에요. 자르기 네모를 옮겨 주세요.</p>
          <canvas ref="result" class="block w-full rounded-[6px]" style="background: #ffffff" data-crop-result />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
// 자르기 창 (12-1) — 사진 한 장 전용 전체 화면(지우기 화면과 같은 틀·어두운 화면). 사진은 원본 전체(지운 결과 포함, 자르기·띠 전)를 그대로 보여 준다.
//   [자르기] 탭: 네모(원본 px) — 모서리·변 손잡이, 안쪽 끌어 옮기기, 비율(자유·1:1·4:3·3:4·16:9·원본 비율), 숫자 칸, [자르기 없애기]
//   [띠 잘라내기] 탭: 위아래로 끌어 띠 고르기 → [이 띠 빼기](여러 개, 겹치면 합침) · 띠마다 [되살리기]. 뺀 띠는 줄무늬
//   오른쪽 아래 = 결과 미리보기 (studioCrop.geometryOf·drawGeometry — 페이지·내보내기와 같은 함수)
// [완료] = done({ crop, cuts }) (정리한 값 — 저장·이력·구간 높이는 편집기가), [취소]·Esc = cancel (아무것도 안 바꿈)
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { X, Check, Crop, ScissorsLineDashed, RotateCcw, RefreshCw } from 'lucide-vue-next'
import { CROP_RATIOS, SHAPE_MIN, normalizeCrop, normalizeCuts, geometryOf, drawGeometry, geometryHeightAt, fitRatio, dragCrop } from '@/lib/studioCrop'

const props = defineProps({
  image: { type: Object, required: true },        // 사진 행 (width·height = 원본 크기)
  imageLabel: { type: String, default: '' },
  shape: { type: Object, required: true },        // 지금 자르기·띠 { crop, cuts } (세션 화면 값)
  loadSource: { type: Function, required: true }, // () → Promise<{ source, width, height }> 지운 사진(원본 크기, 자르기·띠 전)
})
const emit = defineEmits(['done', 'cancel'])

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const RECT_FIELDS = ['x', 'y', 'w', 'h']
const PREVIEW_W = 268

const tab = ref('crop')
const status = ref('loading')
const errorText = ref('')
const area = ref(null)
const stage = ref(null)
const photo = ref(null)
const result = ref(null)
const W = ref(props.image.width)
const H = ref(props.image.height)
const dispW = ref(0)
const k = computed(() => (W.value ? dispW.value / W.value : 1))
const dispH = computed(() => Math.round(H.value * k.value))
let source = null

// 지금 값 — rect는 늘 네모(자르기 없음 = 사진 전체), cuts는 정리한 띠
const startCrop = normalizeCrop(props.shape.crop, W.value, H.value)
const rect = ref(startCrop ?? { x: 0, y: 0, w: W.value, h: H.value })
const cuts = ref(normalizeCuts(props.shape.cuts, H.value))
const ratioKey = ref('free')
const band = ref(null) // 고르는 중인 띠 { y, h }
const isFull = computed(() => normalizeCrop(rect.value, W.value, H.value) === null)
const geo = computed(() => geometryOf(W.value, H.value, { crop: rect.value, cuts: cuts.value }))
const ratioValue = computed(() => {
  const r = CROP_RATIOS.find(x => x.key === ratioKey.value)?.ratio ?? null
  return r === 'orig' ? W.value / H.value : r
})

async function load() {
  status.value = 'loading'
  errorText.value = ''
  try {
    const s = await props.loadSource()
    source = s
    W.value = s.width
    H.value = s.height
    status.value = 'ready'
    await nextTick()
    layout()
  } catch (e) {
    console.error('[StudioCropScreen] 사진을 불러오지 못함:', props.image.id, e)
    errorText.value = e?.message || String(e)
    status.value = 'error'
  }
}
/** 사진을 가운데 영역 폭에 맞춰(최대 900px, 원본보다 크게는 안 함) 그린다. 긴 사진은 세로로 스크롤 */
function layout() {
  if (!source || !area.value) return
  const avail = Math.max(200, area.value.clientWidth - 48)
  dispW.value = Math.round(Math.min(900, avail, W.value))
  nextTick(() => {
    const c = photo.value
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(dispW.value * dpr)
    c.height = Math.round(dispH.value * dpr)
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source.source, 0, 0, c.width, c.height)
    drawResult()
  })
}
/** 결과 미리보기 — 페이지·내보내기와 같은 drawGeometry */
function drawResult() {
  const c = result.value
  if (!c || !source) return
  const g = geo.value
  const tw = Math.min(PREVIEW_W, g.width)
  const th = geometryHeightAt(g, tw)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  c.width = Math.round(tw * dpr)
  c.height = Math.round(th * dpr)
  c.style.height = `${(th * c.clientWidth) / tw || th}px`
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  drawGeometry(ctx, source.source, g, 0, 0, c.width, c.height)
}
let frame = 0
watch(geo, () => {
  if (frame) return
  frame = requestAnimationFrame(() => { frame = 0; drawResult() })
})

// ── 자르기 네모 끌기 ──
let drag = null // { kind: 'rect'|'band', handle, x0, y0, start, pointerId }
function pointOf(e) {
  const r = stage.value.getBoundingClientRect()
  return { x: (e.clientX - r.left) / k.value, y: (e.clientY - r.top) / k.value }
}
function onRectDown(e, handle) {
  if (tab.value !== 'crop' || e.button !== 0) return
  e.preventDefault()
  const p = pointOf(e)
  drag = { kind: 'rect', handle, x0: p.x, y0: p.y, start: { ...rect.value }, pointerId: e.pointerId }
  listen()
}
function onStageDown(e) {
  if (e.button !== 0 || status.value !== 'ready') return
  e.preventDefault()
  const p = pointOf(e)
  if (tab.value === 'cuts') {
    const y = Math.max(0, Math.min(H.value, Math.round(p.y)))
    band.value = { y, h: 0 }
    cutWarning.value = ''
    drag = { kind: 'band', y0: y, pointerId: e.pointerId }
    listen()
  }
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return
  const p = pointOf(e)
  if (drag.kind === 'rect') {
    rect.value = dragCrop(drag.start, drag.handle, p.x - drag.x0, p.y - drag.y0, drag.handle === 'move' ? null : ratioValue.value, W.value, H.value)
  } else {
    const y = Math.max(0, Math.min(H.value, Math.round(p.y)))
    band.value = { y: Math.min(y, drag.y0), h: Math.abs(y - drag.y0) }
  }
}
function onUp(e) {
  if (!drag || e.pointerId !== drag.pointerId) return
  drag = null
  unlisten()
}
function listen() {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}
function unlisten() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
}

function setRatio(key) {
  ratioKey.value = key
  if (ratioValue.value) rect.value = fitRatio(rect.value, ratioValue.value, W.value, H.value)
}
/** 숫자 칸 — 원본 px. 사진 안·최소 크기로 맞추고 칸에 실제 값을 다시 쓴다 */
function onNum(f, e) {
  const v = Number(e.target.value)
  if (e.target.value !== '' && Number.isFinite(v)) {
    const next = { ...rect.value, [f]: v }
    rect.value = normalizeCrop(next, W.value, H.value) ?? { x: 0, y: 0, w: W.value, h: H.value }
  }
  nextTick(() => { e.target.value = rect.value[f] })
}
function clearCrop() {
  rect.value = { x: 0, y: 0, w: W.value, h: H.value }
  ratioKey.value = 'free'
}

// ── 띠 ──
const cutWarning = ref('')
function addCut() {
  if (!band.value || band.value.h < SHAPE_MIN) return
  const next = normalizeCuts([...cuts.value, band.value], H.value)
  if (next.length === 0) { // 띠를 빼면 사진이 거의 남지 않음 (normalizeCuts가 모두 없음으로 봄)
    cutWarning.value = `이 띠까지 빼면 사진이 ${SHAPE_MIN}px도 남지 않아요. 띠를 조금 줄여 주세요.`
    return
  }
  cutWarning.value = ''
  cuts.value = next
  band.value = null
}
function restoreCut(i) { cuts.value = cuts.value.filter((_, j) => j !== i) }

function done() {
  emit('done', { crop: normalizeCrop(rect.value, W.value, H.value), cuts: normalizeCuts(cuts.value, H.value) })
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); emit('cancel') }
}
function onResize() { if (status.value === 'ready') layout() }
onMounted(() => {
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('resize', onResize)
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  window.removeEventListener('resize', onResize)
  unlisten()
  if (frame) cancelAnimationFrame(frame)
})
</script>

<style scoped>
.st-tab {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
  color: var(--st-ink-2); background: transparent; border: 0;
}
.st-tab.is-active { background: var(--st-accent); color: var(--st-on-accent); }
.st-border-l { border-left: 1px solid var(--st-line); }
.st-xlabel { font-size: 11px; font-weight: 700; color: var(--st-muted); }
.st-chip {
  height: 28px; padding: 0 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2);
}
.st-chip.is-active { border-color: var(--st-accent); color: var(--st-accent); background: var(--st-accent-soft); }
.st-field { display: flex; flex-direction: column; gap: 4px; }
.st-field-box { display: flex; align-items: center; height: 28px; padding: 0 6px 0 8px; border-radius: 8px; border: 1px solid var(--st-line-strong); background: var(--st-card); }
.st-field-box:focus-within { border-color: var(--st-accent); }
.st-field-box input { flex: 1; min-width: 0; width: 100%; border: 0; outline: none; background: transparent; font-size: 13px; font-weight: 600; color: var(--st-ink); }
.st-unit { font-size: 11px; color: var(--st-muted); }
.st-link-btn { font-size: 11px; font-weight: 700; color: var(--st-accent); background: transparent; border: 0; cursor: pointer; }
/* 자르기 네모: 바깥을 어둡게(사진 칸이 잘라 줌) + 파란 테두리 */
.st-crop-rect { box-shadow: 0 0 0 2px var(--st-accent), 0 0 0 9999px var(--st-scrim); cursor: move; }
.st-crop-ghost { outline: 1.5px dashed var(--st-accent); }
[data-crop-stage] { overflow: hidden; }
.st-crop-handle {
  position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 3px;
  background: var(--st-ink); border: 2px solid var(--st-accent);
}
.st-crop-handle.is-nw { left: 0; top: 0; cursor: nwse-resize; }
.st-crop-handle.is-n { left: 50%; top: 0; cursor: ns-resize; }
.st-crop-handle.is-ne { left: 100%; top: 0; cursor: nesw-resize; }
.st-crop-handle.is-e { left: 100%; top: 50%; cursor: ew-resize; }
.st-crop-handle.is-se { left: 100%; top: 100%; cursor: nwse-resize; }
.st-crop-handle.is-s { left: 50%; top: 100%; cursor: ns-resize; }
.st-crop-handle.is-sw { left: 0; top: 100%; cursor: nesw-resize; }
.st-crop-handle.is-w { left: 0; top: 50%; cursor: ew-resize; }
/* 뺀 띠 = 줄무늬 (사진 위에 표시만) */
.st-cut { background: repeating-linear-gradient(45deg, rgba(229, 72, 77, 0.55) 0 8px, rgba(0, 0, 0, 0.45) 8px 16px); box-shadow: inset 0 0 0 1px rgba(229, 72, 77, 0.9); }
.st-band { background: var(--st-accent-soft); box-shadow: inset 0 0 0 2px var(--st-accent); }
</style>
