<template>
  <div class="absolute inset-0 flex flex-col st-bg" style="z-index: 20" data-refine-screen>
    <!-- 상단: [취소] · 되돌리기 · 다시 · "경계 다듬기" · [원본 보기] · [적용] -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-1 st-topbar st-border-b">
      <button type="button" class="st-btn st-btn-ghost" :disabled="saving" data-refine-cancel @click="cancel"><X class="w-4 h-4" :stroke-width="2" /> 취소</button>
      <span class="st-refine-sep" />
      <button type="button" class="st-icon-btn" :disabled="!canUndo" :title="canUndo ? UNDO_TIP : '되돌릴 붓질이 없어요'" data-refine-undo @click="undo">
        <Undo2 class="w-[18px] h-[18px]" :stroke-width="2" />
      </button>
      <button type="button" class="st-icon-btn" :disabled="!canRedo" :title="canRedo ? REDO_TIP : '다시 할 붓질이 없어요'" data-refine-redo @click="redo">
        <Redo2 class="w-[18px] h-[18px]" :stroke-width="2" />
      </button>
      <div class="ml-2 leading-tight min-w-0">
        <div class="text-[15px] font-extrabold st-ink">경계 다듬기</div>
        <div class="text-[11px] st-muted truncate">{{ imageLabel }}</div>
      </div>
      <div class="ml-auto flex items-center gap-1.5">
        <button
          type="button" class="st-btn st-btn-ghost" :class="showOriginal ? 'is-pressed' : ''" :disabled="status !== 'ready'" data-refine-original
          title="누르고 있는 동안 원본을 보여줘요"
          @pointerdown="startOriginal" @pointerup="stopOriginal" @pointercancel="stopOriginal" @lostpointercapture="stopOriginal"
        >
          <Eye class="w-4 h-4" :stroke-width="2" /> 원본 보기 <span class="text-[11px] font-semibold st-muted">누르고 있기</span>
        </button>
        <button type="button" class="st-btn st-btn-primary" :disabled="status !== 'ready' || saving" data-refine-apply @click="apply">
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" :stroke-width="2" />
          <Check v-else class="w-4 h-4" :stroke-width="2.5" />
          {{ saving ? '적용 중…' : '적용' }}
        </button>
      </div>
    </header>

    <div class="flex-1 min-h-0 flex">
      <!-- 왼쪽 조작: 붓(살리기/지우기) → 붓 크기 → 지운 곳 보기 → AI 결과로 되돌리기 → 안내 -->
      <aside class="w-[300px] shrink-0 flex flex-col st-surface st-border-r" data-refine-panel>
        <div class="flex-1 overflow-y-auto p-4 flex flex-col">
          <h3 class="st-h-card">경계 다듬기</h3>
          <p class="mt-1 st-desc-sm break-keep">AI가 지운 경계를 붓으로 고쳐요. 외부 AI를 다시 쓰지 않아요.</p>

          <div class="mt-4 st-label">붓</div>
          <div class="mt-2 st-seg w-full" role="radiogroup" aria-label="붓">
            <button
              v-for="m in MODE_BUTTONS" :key="m.key" type="button" role="radio" :aria-checked="mode === m.key"
              class="st-seg-item flex-1 inline-flex items-center justify-center gap-1" :class="mode === m.key ? 'is-active' : ''"
              :title="m.tip" :data-refine-mode="m.key" @click="mode = m.key"
            >
              <component :is="m.icon" class="w-4 h-4" :stroke-width="2" /> {{ m.label }}
            </button>
          </div>
          <p class="mt-2 st-desc-sm break-keep" data-refine-mode-desc>{{ mode === 'keep' ? '지워진 제품 부분(흰 로고·얇은 끈 등)을 칠해서 되살려요' : '남은 배경(그림자·옆 물건 등)을 칠해서 지워요' }}</p>

          <div class="mt-5 flex items-center">
            <span class="st-label">붓 크기</span>
            <span class="ml-auto text-[13px] font-bold st-ink" data-refine-size>{{ size }} px</span>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="w-1 h-1 rounded-full shrink-0" style="background: var(--st-muted)" />
            <input
              type="range" :min="BRUSH_UI_MIN" :max="BRUSH_UI_MAX" step="1" class="flex-1 st-range" :value="size" aria-label="붓 크기"
              data-refine-size-range @input="e => setSize(Number(e.target.value))"
            />
            <span class="w-3 h-3 rounded-full shrink-0" style="background: var(--st-muted)" />
          </div>
          <p class="mt-1 st-desc-sm break-keep">[ ] 키로 줄이고 키워요. 붓 가장자리는 부드럽게 칠해져요</p>

          <div class="mt-5 st-label">지운 곳 보기</div>
          <div class="mt-2 st-seg w-full" role="radiogroup" aria-label="지운 곳 보기">
            <button
              v-for="v in VIEW_BUTTONS" :key="v.key" type="button" role="radio" :aria-checked="view === v.key"
              class="st-seg-item flex-1" :class="view === v.key ? 'is-active' : ''" :data-refine-view="v.key" @click="view = v.key"
            >{{ v.label }}</button>
          </div>
          <p class="mt-1 st-desc-sm break-keep">{{ view === 'ghost' ? '지운 곳은 원본이 흐리게 보여요' : '지운 곳은 체크무늬로 보여요' }}</p>

          <button
            type="button" class="st-btn st-btn-block mt-5" :disabled="status !== 'ready' || isAi || saving" data-refine-ai
            @click="resetToAi"
          ><RotateCcw class="w-3.5 h-3.5" :stroke-width="2" /> AI 결과로 되돌리기</button>
          <p class="mt-1 st-desc-sm break-keep">손으로 고친 것을 모두 되돌리고 AI가 지운 모습으로 돌아가요. Ctrl+Z로 취소할 수 있어요</p>

          <p v-if="saveError" class="mt-4 text-[12px] font-bold st-danger-text break-keep" data-refine-error>{{ saveError }}</p>

          <span class="flex-1" />
          <div class="mt-5 p-3 rounded-[12px] st-card flex gap-2">
            <Info class="w-4 h-4 shrink-0 mt-0.5 st-muted" :stroke-width="2" />
            <div class="space-y-2">
              <p class="text-[12px] font-bold st-ink break-keep">[적용]을 누르면 사진에 들어가고 저장돼요. [취소]·Esc는 아무것도 바꾸지 않아요</p>
              <p class="st-desc-sm break-keep">K 살리기 · E 지우기 · X 서로 바꾸기</p>
              <p class="st-desc-sm break-keep">스페이스를 누른 채 끌면 화면이 움직이고, Ctrl+휠로 확대해요.</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- 가운데: 사진 (체크무늬 + 흐린 원본 + 남은 부분) -->
      <section
        ref="area" class="flex-1 min-w-0 relative st-canvas-bg overflow-hidden select-none" :class="cursorClass" data-refine-area
        @wheel.prevent="onWheel"
      >
        <canvas
          ref="viewEl" class="absolute inset-0 block" data-refine-canvas
          @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @pointerleave="onLeave"
        />
        <p v-if="status === 'loading'" class="absolute inset-0 flex items-center justify-center st-desc pointer-events-none">사진을 불러오는 중…</p>
        <div v-else-if="status === 'error'" class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" data-refine-load-error>
          <p class="text-[14px] font-bold st-danger-text break-keep">사진이나 배경 마스크를 불러오지 못했어요</p>
          <p class="st-desc-sm break-keep">{{ loadError }}</p>
          <button type="button" class="st-btn" @click="load"><RefreshCw class="w-3.5 h-3.5" :stroke-width="2" /> 다시 시도</button>
        </div>
        <div v-if="showOriginal" class="absolute top-3 left-3 st-badge st-badge-scrim" style="z-index: 2" data-refine-original-badge>원본</div>
        <!-- 확대/축소 -->
        <div v-if="status === 'ready'" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 rounded-[12px] st-surface st-shadow-float" style="z-index: 2">
          <button type="button" class="st-icon-btn" title="축소" @click="zoomBy(1 / 1.25)"><ZoomOut class="w-4 h-4" :stroke-width="2" /></button>
          <span class="w-12 text-center text-[12px] font-bold st-ink-2" data-refine-zoom>{{ zoomPct }}%</span>
          <button type="button" class="st-icon-btn" title="확대" @click="zoomBy(1.25)"><ZoomIn class="w-4 h-4" :stroke-width="2" /></button>
          <button type="button" class="st-icon-btn" title="화면 맞춤" @click="fit"><Maximize class="w-4 h-4" :stroke-width="2" /></button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
// 배경 경계 다듬기 화면 (17-3) — AI가 지운 결과(마스크)를 붓 두 가지로 고친다. 자르기 창처럼 사진 한 장 전용 전체 화면.
//   [살리기](K) = 지워진 제품을 되살림 / [지우기](E) = 남은 배경을 지움 / X = 서로 바꾸기 / [ ] = 붓 크기 / Ctrl+Z·Ctrl+Shift+Z·Ctrl+Y
//   스페이스+끌기 = 화면 이동, Ctrl+휠 = 마우스 중심 확대, 휠·Shift+휠 = 위아래·좌우 이동 (지우기 화면과 같은 조작)
// ★ 지우기 화면(StudioCanvas — Fabric, 지우기 레이어·AI 계산과 묶임)은 고치지 않는다. 좌표·맞춤·확대 계산만 studioCoords를 같이 쓴다.
// ★ 붓질은 이 화면 안에서만 되돌린다 (동작 목록 ops — studioBgRefine.replayOps). 편집기 이력·저장은 [적용]할 때 한 번 ("배경 다듬기").
// ★ 보기: 체크무늬 위에 원본을 흐리게(또는 안 보이게) 깔고, 그 위에 남은 부분(원본 × 마스크 — studioBg.applyMaskToRgba와 같은 식)을 그린다.
// ★ [적용]: 연 때와 같으면 그냥 닫기 / AI 마스크와 같으면 save(null) = 다듬기 없앰 / 아니면 PNG(회색 값 R=G=B, 원본 크기) + 내용 key → save(...)
//   저장 실패는 이 화면에 문구로 남기고 닫지 않는다 (고친 것을 잃지 않게). [취소]·Esc는 아무것도 저장하지 않는다.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { X, Undo2, Redo2, Eye, Check, Loader2, RotateCcw, Info, RefreshCw, ZoomIn, ZoomOut, Maximize, Brush, Eraser } from 'lucide-vue-next'
import { BRUSH_UI_MIN, BRUSH_UI_MAX } from '@/composables/useEraseSession'
import { screenToImage, fitView, clampPan, zoomAt } from '@/lib/studioCoords'
import {
  stampSegment, applyCoverage, clearRect, unionRect, targetOf, replayOps, sameMask, maskFromRgba, maskToRgba, refineKey,
} from '@/lib/studioBgRefine'

const props = defineProps({
  image: { type: Object, required: true },         // 사진 행 (width·height = 원본 크기)
  imageLabel: { type: String, default: '' },
  bg: { type: Object, required: true },            // 지금 edit.bg (mask 있음) — { mask, mode, color?, refined? }
  loadSource: { type: Function, required: true },  // () → Promise<{ source, width, height }> 지운 사진(원본 크기)
  loadMask: { type: Function, required: true },    // (path) → Promise<HTMLImageElement> 마스크 PNG
  save: { type: Function, required: true },        // (null | { blob, key, width, height }) → Promise — 실패는 throw(message = 고객 문구)
})
const emit = defineEmits(['close'])

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '')
const MOD = IS_MAC ? 'Cmd' : 'Ctrl'
const UNDO_TIP = `되돌리기 (${MOD}+Z)`
const REDO_TIP = `다시 (${MOD}+Shift+Z${IS_MAC ? '' : ' 또는 Ctrl+Y'})`
const MODE_BUTTONS = [
  { key: 'keep', label: '살리기', icon: Brush, tip: '살리기 (K) — 지워진 제품 부분을 칠해서 되살려요' },
  { key: 'erase', label: '지우기', icon: Eraser, tip: '지우기 (E) — 남은 배경을 칠해서 지워요' },
]
const VIEW_BUTTONS = [
  { key: 'ghost', label: '흐린 원본' },
  { key: 'checker', label: '체크무늬' },
]
const GHOST_ALPHA = 0.28 // 지운 곳에 원본을 흐리게 보이는 정도

const status = ref('loading') // loading | ready | error
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const mode = ref('keep')
const view = ref('ghost')
const size = ref(40)
const showOriginal = ref(false)
const zoomPct = ref(100)
const spaceHeld = ref(false)
const panning = ref(false)
const area = ref(null)
const viewEl = ref(null)
const opsLen = ref(0)     // 화면 반응용 (ops.length)
const redoLen = ref(0)
const isAi = ref(false)   // 지금 마스크 = AI 마스크 (되돌리기 버튼 잠금)

// ── 픽셀 상태 (반응형 아님 — 크다) ──
let W = 0, H = 0
let aiMask = null       // AI 마스크 (고치지 않는다)
let startMask = null    // 열 때 마스크 (다듬은 것이 있으면 그것)
let mask = null         // 지금 마스크
let base = null         // 획을 시작할 때 마스크
let cov = null          // 지금 획의 덮는 정도
let srcCanvas = null    // 원본(지운 사진) W×H
let cutCanvas = null    // 남은 부분 W×H (원본 × 마스크)
let cutCtx = null
let cutImg = null       // ImageData
let srcAlpha = null     // 원본 알파 (한 번 읽어 둔다)
let checker = null      // 체크무늬 패턴 캔버스
let ops = []            // 이 화면의 동작 목록 { type:'stroke', stroke } | { type:'ai' }
let redoOps = []
let stroke = null       // 칠하는 중 { mode, size, pts, rect }
let pan = null          // { x, y, t4, t5 }
let cursor = null       // 붓 동그라미 위치 (화면 px)
let vpt = [1, 0, 0, 1, 0, 0]
let dpr = 1
let raf = 0
let resizeObs = null

const canUndo = computed(() => status.value === 'ready' && !saving.value && opsLen.value > 0)
const canRedo = computed(() => status.value === 'ready' && !saving.value && redoLen.value > 0)
const cursorClass = computed(() => (panning.value ? 'is-grabbing' : spaceHeld.value ? 'is-grab' : status.value === 'ready' ? 'is-brush' : ''))

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
function freeCanvas(c) { if (c) { c.width = 0; c.height = 0 } }

/** 마스크 PNG → 바이트 (w×h, 첫 채널). 크기가 다르면 맞춰 읽는다 (studioBg.maskedCanvas와 같은 규칙) */
async function readMask(path, w, h) {
  const img = await props.loadMask(path)
  if (img.naturalWidth !== w || img.naturalHeight !== h) console.warn('[StudioBgRefine] 마스크 크기가 기대와 다름 — 맞춰 읽음:', path, img.naturalWidth, img.naturalHeight, w, h)
  const c = makeCanvas(w, h)
  const g = c.getContext('2d', { willReadFrequently: true })
  g.imageSmoothingEnabled = true
  g.drawImage(img, 0, 0, w, h)
  const out = maskFromRgba(g.getImageData(0, 0, w, h).data)
  freeCanvas(c)
  return out
}

async function load() {
  status.value = 'loading'
  loadError.value = ''
  try {
    const m = props.bg.mask
    W = m.w
    H = m.h
    const [src, ai, refined] = await Promise.all([
      props.loadSource(),
      readMask(m.path, W, H),
      props.bg.refined ? readMask(props.bg.refined.path, W, H) : Promise.resolve(null),
    ])
    aiMask = ai
    startMask = refined || ai
    mask = startMask.slice()
    base = new Uint8Array(W * H)
    cov = new Uint8Array(W * H)
    freeCanvas(srcCanvas); freeCanvas(cutCanvas)
    srcCanvas = makeCanvas(W, H)
    const sg = srcCanvas.getContext('2d', { willReadFrequently: true })
    sg.imageSmoothingEnabled = true
    sg.imageSmoothingQuality = 'high'
    sg.drawImage(src.source, 0, 0, W, H) // 지운 사진 = 원본 크기 (마스크와 같은 크기가 기본)
    const px = sg.getImageData(0, 0, W, H) // 오염이면 SecurityError — 아래 catch가 사유를 보여 준다
    srcAlpha = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) srcAlpha[i] = px.data[i * 4 + 3]
    cutCanvas = makeCanvas(W, H)
    cutCtx = cutCanvas.getContext('2d', { willReadFrequently: true })
    cutImg = px // 색(R·G·B)은 원본 그대로, 알파만 마스크로 바꾼다
    ops = []; redoOps = []
    opsLen.value = 0; redoLen.value = 0
    refreshCut({ x: 0, y: 0, w: W, h: H })
    isAi.value = sameMask(mask, aiMask)
    status.value = 'ready'
    // 사진 크기에 맞는 기본 붓: 긴 변의 1/40, 8~120px (지우기 화면과 같은 규칙)
    size.value = Math.min(120, Math.max(8, Math.round(Math.max(W, H) / 40)))
    resize()
    fit()
  } catch (e) {
    console.error('[StudioBgRefine] 불러오기 실패:', props.image.id, e)
    loadError.value = e?.message || String(e)
    status.value = 'error'
  }
}

/** 남은 부분 캔버스를 범위만 다시 — 알파 = 원본 알파 × 마스크 / 255 (applyMaskToRgba와 같은 식) */
function refreshCut(rect) {
  const d = cutImg.data
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x, i = y * W + rect.x; x < rect.x + rect.w; x++, i++) {
      const m = mask[i], a = srcAlpha[i]
      d[i * 4 + 3] = m === 255 ? a : m === 0 ? 0 : Math.round((a * m) / 255)
    }
  }
  cutCtx.putImageData(cutImg, 0, 0, rect.x, rect.y, rect.w, rect.h)
}

// ── 그리기 ──
function requestDraw() {
  if (raf) return
  raf = requestAnimationFrame(() => { raf = 0; draw() })
}
function checkerPattern(ctx) {
  if (!checker) {
    checker = makeCanvas(16, 16)
    const g = checker.getContext('2d')
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 16)
    g.fillStyle = '#d9dbe0'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8)
  }
  return ctx.createPattern(checker, 'repeat')
}
function draw() {
  const c = viewEl.value
  if (!c) return
  const ctx = c.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, c.width, c.height)
  if (status.value !== 'ready') return
  const [z, , , , tx, ty] = vpt
  // 사진 자리 = 체크무늬 (화면 기준 고정 크기)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = checkerPattern(ctx)
  ctx.fillRect(tx, ty, W * z, H * z)
  // 사진 (원본 px → 화면)
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * tx, dpr * ty)
  ctx.imageSmoothingEnabled = z < 2
  ctx.imageSmoothingQuality = 'high'
  if (showOriginal.value) {
    ctx.drawImage(srcCanvas, 0, 0)
  } else {
    if (view.value === 'ghost') { ctx.globalAlpha = GHOST_ALPHA; ctx.drawImage(srcCanvas, 0, 0); ctx.globalAlpha = 1 }
    ctx.drawImage(cutCanvas, 0, 0)
  }
  // 붓 동그라미 (화면 px, 흰 선 위 강조색 — 밝은·어두운 사진 모두 보이게)
  if (cursor && !spaceHeld.value && !showOriginal.value) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const r = Math.max(1, (size.value / 2) * z)
    ctx.beginPath(); ctx.arc(cursor.x, cursor.y, r, 0, Math.PI * 2)
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke()
    ctx.lineWidth = 1.5; ctx.strokeStyle = mode.value === 'keep' ? '#ffffff' : accentColor(); ctx.stroke()
  }
}
let accent = ''
function accentColor() {
  if (!accent) accent = getComputedStyle(area.value || document.documentElement).getPropertyValue('--st-accent').trim() || '#3d7bff'
  return accent
}

// ── 화면 크기·확대 ──
function resize() {
  const a = area.value, c = viewEl.value
  if (!a || !c) return
  dpr = Math.min(2, window.devicePixelRatio || 1)
  c.width = Math.max(1, Math.round(a.clientWidth * dpr))
  c.height = Math.max(1, Math.round(a.clientHeight * dpr))
  c.style.width = `${a.clientWidth}px`
  c.style.height = `${a.clientHeight}px`
  if (status.value === 'ready') setVpt(vpt)
  requestDraw()
}
function setVpt(v) {
  const a = area.value
  vpt = clampPan(v, W, H, a.clientWidth, a.clientHeight)
  zoomPct.value = Math.round(vpt[0] * 100)
  requestDraw()
}
function fit() {
  const a = area.value
  if (!a || status.value !== 'ready') return
  setVpt(fitView(W, H, a.clientWidth, a.clientHeight))
}
function zoomBy(k) {
  const a = area.value
  if (!a) return
  setVpt(zoomAt(vpt, { x: a.clientWidth / 2, y: a.clientHeight / 2 }, vpt[0] * k))
}
function onWheel(e) {
  if (status.value !== 'ready') return
  if (e.ctrlKey || e.metaKey) {
    const r = area.value.getBoundingClientRect()
    setVpt(zoomAt(vpt, { x: e.clientX - r.left, y: e.clientY - r.top }, vpt[0] * Math.exp(-e.deltaY * 0.0015)))
    return
  }
  const dx = e.shiftKey ? e.deltaY : e.deltaX
  const dy = e.shiftKey ? 0 : e.deltaY
  setVpt([vpt[0], 0, 0, vpt[3], vpt[4] - dx, vpt[5] - dy])
}

// ── 붓 ──
function localPoint(e) {
  const r = viewEl.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
const round2 = v => Math.round(v * 100) / 100
function imagePoint(s) {
  const p = screenToImage(s, vpt)
  return { x: round2(p.x), y: round2(p.y) }
}
function onDown(e) {
  if (status.value !== 'ready' || saving.value || e.button !== 0) return
  e.preventDefault()
  viewEl.value.setPointerCapture?.(e.pointerId)
  const s = localPoint(e)
  if (spaceHeld.value) {
    pan = { x: s.x, y: s.y, t4: vpt[4], t5: vpt[5], id: e.pointerId }
    panning.value = true
    return
  }
  const p = imagePoint(s)
  base.set(mask)
  stroke = { mode: mode.value, size: size.value, pts: [p.x, p.y], rect: null, id: e.pointerId }
  paintSegment(p.x, p.y, p.x, p.y)
}
function paintSegment(x0, y0, x1, y1) {
  const rect = stampSegment(cov, W, H, x0, y0, x1, y1, stroke.size / 2)
  if (!rect) return
  applyCoverage(mask, base, cov, W, targetOf(stroke.mode), rect)
  refreshCut(rect)
  stroke.rect = unionRect(stroke.rect, rect)
  requestDraw()
}
function onMove(e) {
  const s = localPoint(e)
  cursor = s
  if (pan && e.pointerId === pan.id) {
    setVpt([vpt[0], 0, 0, vpt[3], pan.t4 + (s.x - pan.x), pan.t5 + (s.y - pan.y)])
    return
  }
  if (stroke && e.pointerId === stroke.id) {
    const p = imagePoint(s)
    const n = stroke.pts.length
    const lx = stroke.pts[n - 2], ly = stroke.pts[n - 1]
    // 너무 촘촘한 점은 넣지 않는다 (원본 px로 붓 반지름의 1/8, 최소 0.5px) — 넣은 점만 칠하므로 다시 쌓아도 같다
    if (Math.hypot(p.x - lx, p.y - ly) < Math.max(0.5, stroke.size / 16)) { requestDraw(); return }
    stroke.pts.push(p.x, p.y)
    paintSegment(lx, ly, p.x, p.y)
    return
  }
  requestDraw()
}
function onUp(e) {
  if (pan && e.pointerId === pan.id) { pan = null; panning.value = false; return }
  if (!stroke || e.pointerId !== stroke.id) return
  const done = stroke
  stroke = null
  if (done.rect) clearRect(cov, W, done.rect)
  ops.push({ type: 'stroke', stroke: { mode: done.mode, size: done.size, pts: done.pts } })
  redoOps = []
  opsLen.value = ops.length
  redoLen.value = 0
  isAi.value = sameMask(mask, aiMask)
}
function onLeave() { cursor = null; requestDraw() }

// ── 되돌리기 · AI 결과로 ──
function rebuild() {
  mask = replayOps(startMask, aiMask, ops, W, H)
  refreshCut({ x: 0, y: 0, w: W, h: H })
  opsLen.value = ops.length
  redoLen.value = redoOps.length
  isAi.value = sameMask(mask, aiMask)
  requestDraw()
}
function undo() { if (canUndo.value && !stroke) { redoOps.push(ops.pop()); rebuild() } }
function redo() { if (canRedo.value && !stroke) { ops.push(redoOps.pop()); rebuild() } }
function resetToAi() {
  if (status.value !== 'ready' || stroke || sameMask(mask, aiMask)) return
  ops.push({ type: 'ai' })
  redoOps = []
  mask.set(aiMask)
  refreshCut({ x: 0, y: 0, w: W, h: H })
  opsLen.value = ops.length
  redoLen.value = 0
  isAi.value = true
  requestDraw()
}

function setSize(v) {
  if (!Number.isFinite(v)) return
  size.value = Math.min(BRUSH_UI_MAX, Math.max(BRUSH_UI_MIN, Math.round(v)))
  requestDraw()
}
function stepSize(dir) {
  const step = Math.max(1, Math.round(size.value * 0.15))
  setSize(size.value + dir * step)
}

// [원본 보기] — 누르고 있는 동안만
function startOriginal(e) {
  if (e.button !== 0) return
  e.currentTarget.setPointerCapture?.(e.pointerId)
  showOriginal.value = true
  requestDraw()
}
function stopOriginal() { showOriginal.value = false; requestDraw() }

// ── 적용 · 취소 ──
function toPngBlob() {
  const c = makeCanvas(W, H)
  c.getContext('2d').putImageData(new ImageData(maskToRgba(mask), W, H), 0, 0)
  return new Promise((resolve, reject) => {
    c.toBlob(b => { freeCanvas(c); b ? resolve(b) : reject(new Error('다듬은 결과를 PNG로 만들지 못했어요')) }, 'image/png')
  })
}
async function apply() {
  if (status.value !== 'ready' || saving.value || stroke) return
  saveError.value = ''
  if (sameMask(mask, startMask)) { emit('close'); return } // 바뀐 것 없음 — 이력·저장 없이 닫기
  saving.value = true
  try {
    if (sameMask(mask, aiMask)) {
      await props.save(null) // AI 결과 그대로 → 다듬기 없앰 (AI 마스크 파일은 그대로)
    } else {
      const [blob, key] = await Promise.all([toPngBlob(), refineKey(mask, W, H)])
      await props.save({ blob, key, width: W, height: H })
    }
    emit('close')
  } catch (e) {
    console.error('[StudioBgRefine] 적용 실패:', props.image.id, e)
    saveError.value = e?.message || '적용하지 못했어요. 다시 눌러 주세요.'
  } finally {
    saving.value = false
  }
}
function cancel() { if (!saving.value) emit('close') }

// ── 키 (편집기 단축키보다 먼저 받는다 — 이 화면이 열린 동안 편집기 키는 쉰다) ──
function isTyping(e) {
  const t = e.target
  return t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'range') || t.isContentEditable)
}
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); return }
  if (isTyping(e)) return
  const mod = e.ctrlKey || e.metaKey
  const k = e.key.toLowerCase()
  let handled = true
  if (mod && k === 'z' && !e.shiftKey) undo()
  else if (mod && ((k === 'z' && e.shiftKey) || k === 'y')) redo()
  else if (mod) handled = false
  else if (e.key === ' ') { if (!spaceHeld.value) { spaceHeld.value = true; requestDraw() } }
  else if (k === 'k') mode.value = 'keep'
  else if (k === 'e') mode.value = 'erase'
  else if (k === 'x') mode.value = mode.value === 'keep' ? 'erase' : 'keep'
  else if (e.key === '[') stepSize(-1)
  else if (e.key === ']') stepSize(1)
  else handled = false
  if (handled) { e.preventDefault(); e.stopPropagation(); requestDraw() }
}
function onKeyUp(e) {
  if (e.key === ' ') { spaceHeld.value = false; e.preventDefault(); e.stopPropagation(); requestDraw() }
}
function onBlur() { spaceHeld.value = false; showOriginal.value = false; requestDraw() }

onMounted(() => {
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('keyup', onKeyUp, true)
  window.addEventListener('blur', onBlur)
  resizeObs = new ResizeObserver(() => resize())
  if (area.value) resizeObs.observe(area.value)
  resize()
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  window.removeEventListener('keyup', onKeyUp, true)
  window.removeEventListener('blur', onBlur)
  resizeObs?.disconnect()
  if (raf) cancelAnimationFrame(raf)
  freeCanvas(srcCanvas); freeCanvas(cutCanvas); freeCanvas(checker)
  srcCanvas = cutCanvas = checker = null
  aiMask = startMask = mask = base = cov = srcAlpha = cutImg = null
})

/** 확인 스크립트용: 지금 마스크 바이트 복사본 (화면 동작에는 쓰지 않는다) */
function debugMask() { return mask ? mask.slice() : null }
</script>

<style scoped>
.st-topbar { background: var(--st-bar, var(--st-surface)); }
.st-range { accent-color: var(--st-accent); }
.st-refine-sep { width: 1px; height: 22px; margin: 0 4px; background: var(--st-line); }
.st-btn.is-pressed { background: var(--st-card-hover, var(--st-soft)); border-color: var(--st-accent); }
.st-border-r { border-right: 1px solid var(--st-line); }
.is-brush canvas { cursor: none; }
.is-grab canvas { cursor: grab; }
.is-grabbing canvas { cursor: grabbing; }
</style>
