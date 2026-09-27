<template>
  <div ref="wrap" class="absolute inset-0 overflow-hidden select-none" :class="wrapCursor ? `is-${wrapCursor}` : ''">
    <!-- 사진 자리 체크무늬 — 삭제(투명)한 곳에서 비친다 (Fabric 캔버스 바탕은 투명). 화면 이동·확대를 따라간다 -->
    <div v-if="imageBox" class="absolute pointer-events-none st-erase-checker" :style="imageBox" data-erase-checker />
    <!-- Fabric 캔버스는 스크립트에서 만들어 여기에 붙인다 (Vue가 Fabric이 옮긴 요소를 건드리지 않게) -->
    <div ref="host" class="absolute inset-0" />

    <!-- 불러오는 중 / 실패 -->
    <div v-if="loadState === 'loading'" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span class="st-desc">사진 불러오는 중…</span>
    </div>
    <div v-else-if="loadState === 'error'" class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p class="text-[14px] font-bold st-danger-text">사진을 불러오지 못했어요</p>
      <p class="st-desc-sm break-keep">{{ loadError }}</p>
      <button type="button" class="st-btn" @click="showImage">다시 시도</button>
    </div>

    <!-- 위쪽 가운데: 계산·AI 상태 안내 (조용히 넘기지 않는다). 도구·실행 버튼은 지우기 화면 왼쪽 패널에 있다 -->
    <div class="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" style="z-index: 4; max-width: calc(100% - 24px)">
      <div v-if="computeError" class="pointer-events-auto px-3 py-2 rounded-[10px] st-surface st-shadow-float text-[12px] font-bold st-danger-text break-keep" data-compute-error>
        {{ computeError }}
      </div>
      <div v-if="aiNotice" class="pointer-events-auto px-3 py-2 rounded-[10px] st-surface st-shadow-float text-[12px] font-bold break-keep" :class="aiNotice.danger ? 'st-danger-text' : 'st-accent-text'" data-ai-notice>
        {{ aiNotice.text }}
      </div>
      <div v-if="aiLoadFailure" class="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-[10px] st-surface st-shadow-float text-[12px] font-bold st-danger-text break-keep" data-ai-load-failed>
        <span>결과를 불러오지 못했어요 ({{ aiLoadFailure.message }})</span>
        <button v-if="interactive" type="button" class="st-btn" data-ai-recompute @click="$emit('execute', aiLoadFailure.layerId, 'ai')">다시 계산</button>
      </div>
    </div>

    <!-- 확대/축소 (아래 가운데) -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 rounded-[12px] st-surface st-shadow-float">
      <button type="button" class="st-icon-btn" title="축소" :disabled="loadState !== 'ready'" @click="zoomBy(1 / 1.25)"><ZoomOut class="w-4 h-4" :stroke-width="2" /></button>
      <span class="w-12 text-center text-[12px] font-bold st-ink-2" data-zoom>{{ zoomPct }}%</span>
      <button type="button" class="st-icon-btn" title="확대" :disabled="loadState !== 'ready'" @click="zoomBy(1.25)"><ZoomIn class="w-4 h-4" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn" title="화면 맞춤" :disabled="loadState !== 'ready'" @click="fit"><Maximize class="w-4 h-4" :stroke-width="2" /></button>
    </div>
  </div>
</template>

<script setup>
// 편집 캔버스 (Fabric.js v6) — 편집기 화면에서만 비동기로 불러온다 (fabric이 메인 번들에 들어가지 않게).
//
// ★ 좌표 원칙: Fabric 객체의 left/top/width/height = 원본 이미지 픽셀. 원본 이미지는 (0,0)에 배율 1로 둔다.
//   확대·이동은 viewportTransform으로만 한다. 그래서 영역 좌표가 곧 저장 좌표다 (변환은 studioCoords.js 순수 함수만).
// ★ 캔버스 크기 = 가운데 영역 크기. 원본 크기 캔버스를 만들지 않는다 (16384px 캔버스는 iOS·저사양에서 깨짐).
// ★ 지우기 결과는 영역 주변만 잘라 계산한 조각(studioFillPatch)을 영역 위치에 얹어 보여준다.
//   계산 순서는 studioFillPlan.js 규칙(그린 순서대로, 연결된 앞 레이어 결과를 반영)을 따른다.
//   영역을 옮기거나 크기를 바꾸는 동안은 계산하지 않고(점선 테두리만), 손을 뗀 뒤 계산한다.
// ★ 실행 전 영역(초안, props.draft) — 네모 또는 붓. 편집기 화면에만 있고 저장·이력 없음, 한 개만.
//   [AI로 지우기]/[단색](지우기 화면 왼쪽 패널)을 누르면 편집기가 레이어로 추가한다 (emit 'execute').
// ★ 도구 (포토샵 이름): [사각형 선택](marquee — 빈 곳을 끌면 새 선택, 선택 안을 끌면 옮기기, 모서리 = 크기, 빈 곳 누르기 = 선택 해제)
//   [브러시](기본) [주변으로 덮기](cover) — 부모가 props.tool로 정한다. 옛 값 'select'·'rect'는 사각형 선택으로 읽는다.
//   단축키(studioEraseKeys: M·B·E·S·[·]·Delete·Shift+Delete·Enter·Esc·Ctrl+D)는 emit('key-action')으로 부모에게 넘긴다.
//   브러시는 칠한 획을 편집기에 넘기고(emit 'brush-stroke'), 편집기가 초안에 합친다.
// ★ 삭제(method 'clear'): 결과 조각을 덮어 그리지 않고 비운 곳을 뚫는다(FabricImage destination-out — studioFillPatch clearMask).
//   뚫린 곳은 캔버스가 투명이라 아래 체크무늬(사진 자리 div)가 보인다.
// ★ 사진 위에는 칠한 자국·영역 테두리·붓 동그라미만 그린다 (떠 있는 막대 없음 — 2026-09-25 결정 9).
//   글자 걸침 판정은 emit('bleed')로 알리고, [조금 넓히기]는 부모가 widenSelected()를 부른다.
// ★ interactive=false: 보기 전용(편집기 미리보기) — 선택·그리기 없음. showOriginal=true: 원본만 보인다([원본 보기]).
// ★ 덮기(12-2, studioCover): [덮기] 도구로 덮을 곳을 네모로 고르면(emit 'draft-cover') 편집기가 가져올 곳을 옆에 붙인 초안을 만든다.
//   고른 덮기(초안·레이어)에는 가져올 곳 점선 네모(SourceRect)가 생기고, 끌면 덮을 곳에 바로 미리 보인다(previewCover — 같은 계산 함수).
//   놓으면 emit('cover-source'). 덮기 초안도 계산 목록 맨 뒤에 넣어 결과 조각을 보인다(저장된 레이어의 계산 key는 그대로).
//   [원본 보기]는 원본 말고 모두 숨기므로 덮기 전 원본이 보인다.
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Canvas, FabricImage, Rect } from 'fabric'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-vue-next'
import {
  screenToImage, rectFromDrag, normalizeRect, clampRectPosition, isClick, isSelectOnly,
  fitView, clampPan, zoomAt, expandRect, MIN_RECT,
} from '@/lib/studioCoords'
import { computeFillPatch } from '@/lib/studioFillPatch'
import {
  fillPlan, ownKey, fillArea, cropRect, pastePrior, aiPatchKey, aiGrow, effectiveKey, aiEraseSet, growOf as fillGrowOf,
} from '@/lib/studioFillPlan'
import { simplifyStroke, rasterizeStrokes, strokeExtent } from '@/lib/studioBrush'
import { widenSides } from '@/lib/studioBleed'
import { isValidFillLayer, isValidPixelLayer } from '@/lib/studioEdit'
import { eraseKeyAction } from '@/lib/studioEraseKeys'
import { AI_MODEL_ID, uploadAiPatch, loadAiPatch } from '@/lib/studioAiPatch'
import { nextRetryDelay, isRetryableSaveError, AI_SAVE_RETRY_DELAYS } from '@/lib/studioSaveGuard'

const props = defineProps({
  image: { type: Object, default: null },        // { id, original_path, width, height }
  layers: { type: Array, default: () => [] },     // 이 사진의 전체 레이어 (fill·cover만 그린다)
  selectedId: { type: String, default: null },
  loadImage: { type: Function, required: true },  // row → Promise<HTMLImageElement>
  keysEnabled: { type: Boolean, default: true },  // 모달이 떠 있으면 false
  tool: { type: String, default: 'brush' },        // 'marquee' | 'brush' | 'cover' (옛 'select'·'rect' = 'marquee') — 부모(지우기 화면)가 정한다
  hasSelection: { type: Boolean, default: false },  // 선택 영역(초안)이 있음 — Delete·Enter 단축키 판단
  interactive: { type: Boolean, default: true },  // false = 보기 전용 (선택·그리기·단축키 없음)
  showOriginal: { type: Boolean, default: false }, // true = 원본만 보인다 (결과 조각·영역 숨김)
  aiEngine: { type: Object, default: null },        // studioAi/aiEngine createAiEngine() — 편집기가 만들고 정리한다
  aiState: { type: Object, default: () => ({ status: 'idle', reason: '', progress: null }) }, // 엔진 상태(반응형)
  eraseRequest: { type: Object, default: null },     // AI 계산 요청: { layerId, n, batch } (n이 바뀔 때마다 한 번) — 편집기가 보낸다
  draft: { type: Object, default: null },            // 실행 전 영역 (네모 {id,type,x,y,w,h,pad} 또는 붓 {…, shape:'brush', brush}) — method 없음 / 덮기 초안 {type:'cover', …}
  brushSize: { type: Number, default: 40 },          // 붓 크기 (원본 픽셀)
  brushMode: { type: String, default: 'add' },       // 'add' 칠하기 | 'sub' 덜어내기
})
// change(id, rect, kind): kind 'move' | 'resize' — 이력 라벨용 (초안이면 편집기가 초안만 고친다)
// execute(id, method): [AI로 지우기]/[단색] — 초안이면 레이어로 추가, 레이어면 그 방식으로 다시 실행
// draft-rect(rect): 네모 도구로 그림 → 초안 (이전 초안은 편집기가 버린다)
// brush-stroke({ mode, size, pts }): 붓 한 획 (단순화된 정수 원본 좌표) → 편집기가 붓 초안에 합친다
// ai({ imageId, layerId, planKey, W, H, ai, batch }): AI 결과 조각을 저장했음 — 편집기가 그 레이어에 ai 필드를 붙인다.
//   batch: 실행 한 번의 번호 (같이 지운 앞 AI가 있으면 여러 결과가 같은 번호로 온다 → 이력 한 단계)
// ai-states({ [layerId]: 'done'|'needs'|'busy'|'loading'|'failed' }): AI 레이어 상태 — 왼쪽 패널용
// ai-unsaved({ count, pending, autoRetrying, saving, message }): 계산은 됐지만 결과 조각이 아직 저장되지 않은 AI 결과
//   (count = 저장 실패 → [다시 저장] 카드, pending = 올리는 중·자동 재시도 대기) — 지우기 화면이 카드·나가기 확인을 보인다.
//   부모가 retryAiSave()를 부르면 메모리의 결과로 업로드만 다시 한다 (AI 재계산 없음)
// tool(key): 예전 단축키 창구 (지금은 key-action) — 부모가 props.tool을 바꾼다
// key-action({ action, tool?, mode?, delta? }): 지우기 화면 단축키 (studioEraseKeys.eraseKeyAction) — 부모가 왼쪽 패널과 같은 함수를 부른다
// deselect(): 사각형 선택으로 빈 곳을 누름 (포토샵 — 선택 바깥 누르기 = 선택 해제)
// viewport({ vpt, cw, ch }): 화면 이동·확대가 바뀜 — 부모가 작업 바 자리를 맞춘다
// bleed(sides[]): 선택한 네모가 글자에 걸친 변 (없으면 []) — 부모가 안내와 [조금 넓히기]를 보여준다
// draft-cover(rect): [덮기] 도구로 덮을 곳을 그림 → 편집기가 가져올 곳을 붙인 덮기 초안을 만든다
// cover-source(id, { sx, sy }): 가져올 곳을 끌어 놓음 (정수, 사진 안)
const emit = defineEmits(['change', 'select', 'remove', 'execute', 'draft-rect', 'brush-stroke', 'ai', 'ai-states', 'ai-unsaved', 'tool', 'bleed', 'draft-cover', 'cover-source', 'key-action', 'deselect', 'viewport'])

const wrap = ref(null)
const host = ref(null)
// 지금 도구: 보기 전용이면 'view' (선택·그리기 없음). 옛 [선택]·[네모]는 합쳐서 사각형 선택
const tool = computed(() => (props.interactive ? (props.tool === 'select' || props.tool === 'rect' ? 'marquee' : props.tool) : 'view'))
const vptRef = ref(null)       // 화면 이동·확대 (체크무늬 자리)
const imageSize = ref(null)    // { W, H } 사진 원본 크기
const imageBox = computed(() => {
  const v = vptRef.value, sz = imageSize.value
  if (!v || !sz || loadState.value !== 'ready') return null
  return { left: `${v[4]}px`, top: `${v[5]}px`, width: `${sz.W * v[0]}px`, height: `${sz.H * v[3]}px` }
})
const loadState = ref('idle') // idle | loading | ready | error
const loadError = ref('')
const computeError = ref('')
const zoomPct = ref(100)
const spaceHeld = ref(false)
const panning = ref(false)

const bleedById = ref({})     // layer id → 글자에 걸친 변 목록 (최신 계산 결과 기준)

// 선택: 저장된 레이어 또는 실행 전 영역(초안)
const selectedIsDraft = computed(() => !!props.draft && props.draft.id === props.selectedId)
const selectedLayer = computed(() => (selectedIsDraft.value ? props.draft
  : props.layers.find(l => l.id === props.selectedId && isValidPixelLayer(l)) || null))
// 걸침 안내는 AI·붓·덮기·초안에서는 끈다 (AI는 테두리 띠를 읽어 메우는 방식이 아님, 붓은 사각형 테두리가 없음, 덮기는 복사)
const selectedBleed = computed(() => {
  const l = selectedLayer.value
  if (!l || selectedIsDraft.value || l.method === 'ai' || l.method === 'clear' || l.shape === 'brush' || l.type === 'cover') return []
  return bleedById.value[l.id] || []
})
watch(selectedBleed, (s, prev) => { if (!prev || s.join() !== prev.join()) emit('bleed', [...s]) }, { immediate: true })

// ── AI 지우기 상태 ──
// AI는 [지우기]를 눌러야 계산한다 (자동 계산·자동 재계산 없음). 저장된 결과(ai.key가 지금 계산 key와 같음)만 자동으로 불러온다.
const aiActive = ref(false)        // 엔진이 지금 한 건을 계산하는 중
const aiRequestCount = ref(0)      // [지우기]를 눌러 기다리거나 계산 중인 AI 레이어 수
const aiStates = ref({})           // layer id → 'done'|'needs'|'busy'|'loading'|'failed'
const aiLoadFailure = ref(null)    // { layerId, planKey, message } — 저장된 PNG 받기 실패 (몰래 재계산하지 않는다)
// 결과는 보이지만 저장 실패 — layer id → { imageRow, layerId, planKey, key, W, H, batch, area, canvas, engine, message }
// 결과 픽셀(canvas)을 들고 있다가 [다시 저장]에서 그대로 올린다. 레이어가 바뀌거나 지워지면(sync) 뺀다
const aiSaveFailed = new Map()
const aiSaveWaiting = new Map()  // layer id → { job, timer } 자동 다시 저장 대기 (studioSaveGuard 2초 → 5초 → 10초)
const aiUploading = new Map()    // layer id → 몇 번째 다시 시도인지 (0 = 처음 저장) — 올리는 중
let aiRetrying = false
const aiNotice = computed(() => {
  const s = props.aiState || {}
  const p = s.progress
  if (s.status === 'downloading' && p?.phase === 'download' && p.total) {
    const pct = Math.floor((p.loaded / p.total) * 100)
    return { text: `AI 지우기를 처음 쓰실 때 한 번만 약 200MB를 받습니다. 다음부터는 바로 됩니다. (${pct}%)` }
  }
  if (aiRequestCount.value === 0 && !aiActive.value) return null
  if (s.status === 'error' || s.status === 'unsupported') return { text: `AI 지우기를 쓸 수 없어요: ${s.reason || s.status}`, danger: true }
  return { text: s.status === 'ready' || aiActive.value ? 'AI가 채우는 중…' : 'AI 준비 중…' }
})
const aiReady = () => props.aiState?.status === 'ready' && !!props.aiEngine

function setBleed(id, sides) {
  const cur = bleedById.value[id]
  if (cur && cur.join() === sides.join()) return
  bleedById.value = { ...bleedById.value, [id]: sides }
}

// [조금 넓히기]: 걸친 변만 WIDEN_PX 넓힌다 → 이력에 "크기 조절"
function widenSelected() {
  const l = selectedLayer.value
  const sides = selectedBleed.value
  if (!l || sides.length === 0 || !W) return
  emit('change', l.id, widenSides(l, sides, W, H), 'resize')
}
const wrapCursor = computed(() => (panning.value ? 'grabbing' : spaceHeld.value ? 'grab' : ''))

let canvas = null
let baseObj = null
let imgEl = null
let W = 0, H = 0
let vpt = [1, 0, 0, 1, 0, 0]
let showSeq = 0
let colors = { accent: '', surface: '' }
const regions = new Map()        // layer id → RegionRect
const patches = new Map()        // layer id → FabricImage (지우기 결과 조각)
const transforming = new Set()   // 옮기는·크기 바꾸는 중인 layer id
const patchCaches = new Map()    // image id → Map(plan key → { canvas, area, data }) — 최근 사진 5장
const failedKeys = new Set()     // 계산에 실패한 plan key (같은 값으로 무한 재시도하지 않게)
let byId = new Map()             // layer id → 레이어 (sync 때마다 새로)
let eff = new Map()              // layer id → 화면 계산 key (coons·단색: 안 지운 앞 AI 목록 포함 — effectiveKey)
let aiRunning = false            // AI는 한 번에 1건 (엔진 워커 하나 — 계산·불러오기 모두)
const aiRequested = new Map()    // AI plan key → [지우기] 누름 번호(batch). 계산이 끝나거나 버려지면 뺀다
const aiChecked = new Set()      // `${plan key}|${ai.key}` — 저장된 결과가 지금 key와 다름을 확인함 (→ [다시 지우기])
const aiUnsaved = new Map()      // layer id → 결과 key: 계산했지만 레이어에 ai가 아직 안 붙은 결과 (저장 중·저장 실패)
let aiBatchSeq = 0
let plan = new Map()             // layer id → { deps, key } (sync 때마다 새로)
let computeTimer = null
let draw = null                  // { s0, p0, preview }
let pan = null                   // { x, y }
let press = null                 // [선택] 도구로 영역을 누른 순간: { id, s0(화면), orig{left,top,width,height} }
let aborting = false             // 남은 드래그를 저장 없이 끝내는 중 (object:modified를 무시)
let replacing = false            // sync가 영역 객체를 새로 만드는 중 (selection:cleared를 편집기에 알리지 않음)
let resizeObs = null
let paint = null                 // 붓으로 칠하는 중: { mode, size, raw:[x,y,…] (원본 좌표, 소수) }
let liveObj = null               // 칠하는 중 미리보기 (BrushRegion)
let cursorObj = null             // 붓 크기 원 (BrushCursor)
let planList = []                // 계산 목록: 지우기·덮기 레이어(배열 순서) + 덮기 초안(맨 뒤) — sync 때마다 새로
let sourceObj = null             // 고른 덮기의 가져올 곳 (SourceRect)
let previewRaf = 0               // 가져올 곳을 끄는 동안 미리보기 (한 프레임에 한 번)

// ── 영역 사각형: 테두리를 화면 기준 px로 직접 그린다 (배율과 무관) ──
//   선택됨: 그린 네모 실선 2px + 실제 메우는 범위(grow만큼 넓힌 사각형 — AI는 max(pad,k)) 옅은 점선 1px
//   계산 중·그리는 중: 점선/실선 2px, 마우스 올림: 옅은 실선, 그 밖: 테두리 없음 (결과만 보이게)
class RegionRect extends Rect {
  _render(ctx) {
    const c = this.canvas
    const z = c ? c.getZoom() : 1
    const act = c ? c.getActiveObject() : null
    // 덮기의 가져올 곳을 끄는 중이면 그 덮을 곳도 고른 것처럼 그린다
    const selected = !!act && (act === this || (act.isSource && act.layerId === this.layerId))
    const strong = this.isDraft || selected || this.busy
    if (!strong && !this.hovered) return
    const sw = this.width * this.scaleX, sh = this.height * this.scaleY
    ctx.save()
    ctx.scale(1 / this.scaleX, 1 / this.scaleY) // 객체 배율을 풀어 원본 px 단위로 (원점 = 영역 가운데)
    ctx.strokeStyle = colors.accent
    const lw = (strong ? 2 : 1.5) / z
    ctx.lineWidth = lw
    ctx.globalAlpha = strong ? 1 : 0.5
    ctx.setLineDash(this.busy && !this.isDraft ? [6 / z, 4 / z] : [])
    // 테두리를 영역 바깥쪽에 그려 결과 픽셀을 가리지 않는다
    ctx.strokeRect(-sw / 2 - lw / 2, -sh / 2 - lw / 2, sw + lw, sh + lw)
    if (selected && this.grow > 0 && W) {
      const a = expandRect({ x: this.left, y: this.top, w: sw, h: sh }, this.grow, W, H)
      const cx = this.left + sw / 2, cy = this.top + sh / 2
      const t = 1 / z
      ctx.lineWidth = t
      ctx.globalAlpha = 0.6
      ctx.setLineDash([4 / z, 3 / z])
      ctx.strokeRect(a.x - cx - t / 2, a.y - cy - t / 2, a.w + t, a.h + t)
    }
    ctx.restore()
  }
}

// ── 붓 영역: 칠한 모양을 화면용으로 그린다 (반투명 색 = 실행 전·결과가 안 맞음, 외곽선 = 선택·마우스 올림) ──
//   화면 표시는 canvas 벡터로 그린다(빠름). 저장·계산에 쓰는 마스크는 studioBrush.rasterizeStrokes(기기와 무관)로 따로 만든다.
//   bx,by = 획 좌표의 기준(레이어 x,y). 옮기는 동안은 객체 위치만 바뀌고 그림은 그대로 따라간다.
const BRUSH_VIEW_MAX = 1536 // 화면용 그림 한 변 최대 px (큰 영역은 줄여 그린다)
class BrushRegion extends Rect {
  setBrush(strokes, bx, by, w, h) {
    this.strokes = strokes
    this.bx = bx; this.by = by; this.bw = w; this.bh = h
    this._mask = null
    this._outline = null
  }
  maskCanvas() {
    if (this._mask) return this._mask
    const w = this.bw, h = this.bh
    const s = Math.min(1, BRUSH_VIEW_MAX / Math.max(w, h))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s))
    const g = c.getContext('2d')
    g.lineCap = 'round'; g.lineJoin = 'round'
    for (const st of this.strokes || []) {
      g.globalCompositeOperation = st.mode === 'sub' ? 'destination-out' : 'source-over'
      g.strokeStyle = g.fillStyle = colors.accent
      g.lineWidth = st.size * s
      const p = st.pts
      if (p.length === 2) {
        g.beginPath(); g.arc((p[0] - this.bx) * s, (p[1] - this.by) * s, (st.size / 2) * s, 0, Math.PI * 2); g.fill()
      } else {
        g.beginPath(); g.moveTo((p[0] - this.bx) * s, (p[1] - this.by) * s)
        for (let i = 2; i < p.length; i += 2) g.lineTo((p[i] - this.bx) * s, (p[i + 1] - this.by) * s)
        g.stroke()
      }
    }
    this._mask = { canvas: c, s }
    return this._mask
  }
  /** 외곽선: 모양을 8방향으로 t px 밀어 그린 뒤 모양 자리를 지운다 (화면 2px 두께) */
  outlineCanvas(z) {
    const m = this.maskCanvas()
    const t = Math.max(1, Math.round((2 / z) * m.s))
    if (this._outline && this._outline.t === t) return this._outline
    const c = document.createElement('canvas')
    c.width = m.canvas.width + 2 * t; c.height = m.canvas.height + 2 * t
    const g = c.getContext('2d')
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) g.drawImage(m.canvas, t + dx * t, t + dy * t)
    g.globalCompositeOperation = 'destination-out'
    g.drawImage(m.canvas, t, t)
    this._outline = { canvas: c, t, s: m.s }
    return this._outline
  }
  _render(ctx) {
    const c = this.canvas
    const z = c ? c.getZoom() : 1
    const selected = !!c && c.getActiveObject() === this
    const w = this.bw, h = this.bh
    if (!this.tint && !selected && !this.hovered) return
    ctx.save()
    ctx.scale(1 / this.scaleX, 1 / this.scaleY)
    if (this.tint) {
      ctx.globalAlpha = 0.45
      ctx.drawImage(this.maskCanvas().canvas, -w / 2, -h / 2, w, h)
    }
    if (selected || this.hovered) {
      const o = this.outlineCanvas(z)
      const pad = o.t / o.s
      ctx.globalAlpha = selected ? 1 : 0.6
      ctx.drawImage(o.canvas, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad)
    }
    ctx.restore()
  }
}

function makeBrushRegion(l, { draft = false, live = false } = {}) {
  const r = new BrushRegion({
    left: l.x, top: l.y, width: l.w, height: l.h,
    originX: 'left', originY: 'top',
    fill: 'transparent', strokeWidth: 0, objectCaching: false,
    selectable: !live, evented: !live,
    hasBorders: false, hasControls: false, lockRotation: true, lockScalingX: true, lockScalingY: true,
    lockSkewingX: true, lockSkewingY: true, padding: 0,
    // 실행 전 붓 영역은 옮기지 않는다 (덜어내기·다시 칠하기로 고친다). 실행된 붓 영역은 통째로 옮길 수 있다
    lockMovementX: draft || live, lockMovementY: draft || live,
    hoverCursor: draft ? 'default' : 'move',
  })
  r.layerId = l.id
  r.kind = 'brush'
  r.setBrush(l.brush.strokes, l.x, l.y, l.w, l.h)
  r.tint = true
  r.busy = true
  r.hovered = false
  return r
}

// ── 덮기의 가져올 곳: 점선 네모(화면 2px) + "가져올 곳" 글자 + 덮을 곳 가운데로 잇는 옅은 점선. 끌어 옮기기만 (크기는 덮을 곳과 같음) ──
class SourceRect extends Rect {
  _render(ctx) {
    const c = this.canvas
    const z = c ? c.getZoom() : 1
    const sw = this.width * this.scaleX, sh = this.height * this.scaleY
    ctx.save()
    ctx.scale(1 / this.scaleX, 1 / this.scaleY)
    const lw = 2 / z
    if (this.dst) { // 가운데끼리 잇는 선 (원점 = 이 네모 가운데)
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1 / z
      ctx.setLineDash([4 / z, 4 / z])
      ctx.strokeStyle = colors.accent
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(this.dst.x + this.dst.w / 2 - (this.left + sw / 2), this.dst.y + this.dst.h / 2 - (this.top + sh / 2))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.lineWidth = lw * 2
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(255,255,255,0.85)' // 밝은 바탕·어두운 바탕 모두 보이게 흰 선 위에 강조색 점선
    ctx.strokeRect(-sw / 2 - lw / 2, -sh / 2 - lw / 2, sw + lw, sh + lw)
    ctx.lineWidth = lw
    ctx.setLineDash([6 / z, 4 / z])
    ctx.strokeStyle = colors.accent
    ctx.strokeRect(-sw / 2 - lw / 2, -sh / 2 - lw / 2, sw + lw, sh + lw)
    const fs = 12 / z
    ctx.font = `700 ${fs}px sans-serif`
    const label = '가져올 곳'
    const tw = ctx.measureText(label).width
    const bx = -sw / 2 - lw, by = -sh / 2 - lw - fs - 8 / z
    ctx.fillStyle = colors.accent
    ctx.fillRect(bx, by, tw + 12 / z, fs + 6 / z)
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'top'
    ctx.fillText(label, bx + 6 / z, by + 3 / z)
    ctx.restore()
  }
}

function makeSource() {
  const s = new SourceRect({
    left: 0, top: 0, width: 1, height: 1, originX: 'left', originY: 'top',
    fill: 'transparent', strokeWidth: 0, objectCaching: false,
    selectable: true, evented: true, hasBorders: false, hasControls: false,
    lockRotation: true, lockScalingX: true, lockScalingY: true, lockSkewingX: true, lockSkewingY: true, padding: 0,
    hoverCursor: 'move',
  })
  s.isSource = true
  s.kind = 'source'
  return s
}

/** 지금 고른 덮기 (초안 또는 레이어) — 가져올 곳을 보여 줄 대상 */
function currentCover() {
  const id = props.selectedId
  if (!id || !props.interactive) return null
  if (props.draft?.id === id) return props.draft.type === 'cover' ? props.draft : null
  return props.layers.find(l => l.id === id && l.type === 'cover' && isValidPixelLayer(l)) || null
}

/** 가져올 곳 객체를 고른 덮기에 맞춘다 (없으면 걷는다). 끄는 중이면 자리는 건드리지 않는다 */
function syncSource() {
  const cov = currentCover()
  if (!cov || !W) {
    if (sourceObj) { canvas.remove(sourceObj); sourceObj = null }
    return
  }
  if (!sourceObj) { sourceObj = makeSource(); canvas.add(sourceObj) }
  const dragging = canvas._currentTransform?.target === sourceObj
  sourceObj.layerId = cov.id
  sourceObj.dst = { x: cov.x, y: cov.y, w: cov.w, h: cov.h }
  if (!dragging) {
    sourceObj.set({ left: cov.sx, top: cov.sy, width: cov.w, height: cov.h, scaleX: 1, scaleY: 1 })
    sourceObj.setCoords()
  }
}

/** [덮기] 도구에서는 지금 고른 덮기의 네모·가져올 곳만 잡힌다 (다른 영역을 누르면 새로 그리기) */
function applyEvented() {
  const coverTool = tool.value === 'cover'
  const cur = coverTool ? currentCover()?.id : null
  for (const [id, r] of regions) {
    const on = !coverTool || id === cur
    r.evented = on
    r.selectable = on
  }
}

/** 가져올 곳을 끄는 동안: 그 자리로 덮기를 다시 계산해 덮을 곳에 바로 보인다 (저장·이력 없음 — 놓으면 편집기가 저장) */
function schedulePreview() {
  if (previewRaf) return
  previewRaf = requestAnimationFrame(() => { previewRaf = 0; previewCover() })
}
function previewCover() {
  if (!canvas || !imgEl || !sourceObj) return
  const base = byId.get(sourceObj.layerId)
  if (!base || base.type !== 'cover') return
  const l = { ...base, sx: Math.round(sourceObj.left), sy: Math.round(sourceObj.top) }
  const e = fillPlan(planList.map(x => (x.id === l.id ? l : x)), W, H).find(p => p.id === l.id)
  if (!e) return
  // 앞 결과는 지금 화면의 조각 그대로 (안 지운 앞 AI는 원본 그대로 — 계산과 같은 규칙)
  const prior = e.deps.filter(d => byId.get(d)?.method !== 'ai' || aiDone(byId.get(d))).map(d => patches.get(d)?.res)
  if (prior.some(p => !p)) return // 앞 결과가 아직 계산 중 — 놓으면 계산한다
  let res
  try {
    res = computeFillPatch(imgEl, l, prior)
  } catch (err) {
    console.error('[StudioCanvas] 덮기 미리보기 계산 실패:', l.id, err)
    computeError.value = `덮기 미리보기를 만들지 못했어요: ${err.message || err}`
    return
  }
  if (!res.ok) { console.error('[StudioCanvas] 덮기 미리보기 계산 실패:', l.id, res.reason); return }
  placePatch(l, `preview|${ownKey(l)}`, res) // 놓으면 sync가 진짜 key로 다시 계산한다 (key가 달라서)
  restack(planList)
  canvas.requestRenderAll()
}

// 붓 크기 원 (원본 좌표, 테두리는 화면 1.5px)
class BrushCursor extends Rect {
  _render(ctx) {
    const z = this.canvas ? this.canvas.getZoom() : 1
    const r = this.width / 2
    ctx.save()
    ctx.lineWidth = 3 / z; ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 1.5 / z; ctx.strokeStyle = colors.accent
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }
}

function updateCursor(p) {
  if (!canvas) return
  if (tool.value !== 'brush' || !p || loadState.value !== 'ready') {
    if (cursorObj) { cursorObj.visible = false; canvas.requestRenderAll() }
    return
  }
  const d = props.brushSize
  if (!cursorObj) {
    cursorObj = new BrushCursor({ originX: 'center', originY: 'center', fill: 'transparent', strokeWidth: 0, selectable: false, evented: false, objectCaching: false })
    canvas.add(cursorObj)
  }
  cursorObj.set({ left: p.x, top: p.y, width: d, height: d, visible: true })
  canvas.bringObjectToFront(cursorObj)
  canvas.requestRenderAll()
}

/** 점선(실제 메우는 범위)의 넓힘 폭 — AI는 max(pad, k), 그 밖은 pad. 그리는 중 미리보기는 0 */
function growOf(l) {
  if (!W) return 0
  if (l.type === 'cover') return Number.isInteger(l.feather) ? l.feather : 0 // 덮기: 섞는 띠까지
  if (!Number.isInteger(l.pad)) return 0
  return l.method === 'ai' ? aiGrow(l, W, H) : l.pad
}

function makeRegion(l, interactive = true) {
  const r = new RegionRect({
    left: l.x, top: l.y, width: l.w, height: l.h,
    originX: 'left', originY: 'top',
    fill: 'transparent', strokeWidth: 0, objectCaching: false,
    selectable: interactive, evented: interactive,
    hasBorders: false, lockRotation: true, lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true,
    cornerSize: 8, touchCornerSize: 20, transparentCorners: false, cornerStyle: 'rect',
    cornerColor: colors.surface, cornerStrokeColor: colors.accent, padding: 0,
    hoverCursor: 'move',
  })
  r.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: false })
  r.layerId = l.id
  r.kind = 'rect'
  r.grow = growOf(l)
  r.busy = true
  r.hovered = false
  r.isDraft = !interactive
  return r
}

// ── 뷰포트 ──
function viewSize() {
  const el = wrap.value
  return { cw: el?.clientWidth || 0, ch: el?.clientHeight || 0 }
}

function applyVpt(next) {
  const { cw, ch } = viewSize()
  vpt = W ? clampPan(next, W, H, cw, ch) : next
  setVpt()
}

function fit() {
  if (!W) return
  const { cw, ch } = viewSize()
  vpt = fitView(W, H, cw, ch)
  setVpt()
}

function setVpt() {
  canvas.setViewportTransform(vpt)
  zoomPct.value = Math.round(vpt[0] * 100)
  vptRef.value = [...vpt]
  const { cw, ch } = viewSize()
  emit('viewport', { vpt: [...vpt], cw, ch })
  canvas.requestRenderAll()
}

function zoomBy(f) {
  const { cw, ch } = viewSize()
  applyVpt(zoomAt(vpt, { x: cw / 2, y: ch / 2 }, vpt[0] * f))
}

function localPoint(e) {
  const b = wrap.value.getBoundingClientRect()
  return { x: e.clientX - b.left, y: e.clientY - b.top }
}

function onWheel(e) {
  if (!canvas || loadState.value !== 'ready') return
  e.preventDefault()
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewSize().ch : 1
  if (e.ctrlKey || e.metaKey) {
    applyVpt(zoomAt(vpt, localPoint(e), vpt[0] * Math.pow(0.998, e.deltaY * unit)))
    return
  }
  const dx = (e.shiftKey ? e.deltaY : e.deltaX) * unit
  const dy = (e.shiftKey ? 0 : e.deltaY) * unit
  applyVpt([vpt[0], 0, 0, vpt[3], vpt[4] - dx, vpt[5] - dy])
}

// 이동: 스페이스 + 드래그, 또는 가운데 버튼 드래그. Fabric보다 먼저(capture) 가로채 영역 선택·그리기가 시작되지 않게 한다
function onPanDown(e) {
  if (!canvas || loadState.value !== 'ready') return
  if (!(e.button === 1 || (e.button === 0 && spaceHeld.value))) return
  e.preventDefault()
  e.stopPropagation()
  pan = { x: e.clientX, y: e.clientY }
  panning.value = true
  wrap.value.setPointerCapture(e.pointerId)
}
function onPanMove(e) {
  if (!pan) return
  const dx = e.clientX - pan.x, dy = e.clientY - pan.y
  pan = { x: e.clientX, y: e.clientY }
  applyVpt([vpt[0], 0, 0, vpt[3], vpt[4] + dx, vpt[5] + dy])
}
function onPanUp() {
  pan = null
  panning.value = false
}
function onMiddleMouseDown(e) {
  if (e.button === 1) e.preventDefault() // 가운데 버튼 자동 스크롤 막기
}

// ── 도구 (props.tool → 캔버스 설정) ──
function applyTool(t) {
  if (!canvas) return
  // 진행 중이던 그리기·드래그 상태를 전부 초기화
  cancelDraw()
  abortTransform('도구 전환', false)
  const drawing = t === 'brush'
  // [사각형 선택]·[주변으로 덮기]는 빈 곳을 끌면 새로 그리고, 선택·고른 덮기는 잡아 옮긴다 (applyEvented)
  canvas.skipTargetFind = drawing || t === 'view' // 보기 전용은 영역을 고를 수 없다
  if (t === 'view') canvas.discardActiveObject()
  // 사각형 선택·덮기 = 십자 커서, 브러시 = 커서 숨기고 크기 원
  canvas.defaultCursor = t === 'marquee' || t === 'cover' ? 'crosshair' : t === 'brush' ? 'none' : 'default'
  canvas.setCursor(canvas.defaultCursor) // 마우스를 움직이기 전에도 바로 바뀌게
  if (t !== 'brush') updateCursor(null)
  applyEvented()
  canvas.requestRenderAll()
}

function cancelDraw() {
  if (draw?.preview) canvas.remove(draw.preview)
  draw = null
  if (liveObj) { canvas?.remove(liveObj); liveObj = null }
  paint = null
}

// ── 붓으로 칠하기 ──
function clampPoint(p) {
  return { x: Math.min(W - 1, Math.max(0, p.x)), y: Math.min(H - 1, Math.max(0, p.y)) }
}

/** 칠하는 중 미리보기: 지금 초안의 획 + 칠하는 획 (덜어내기도 그대로 보인다) */
function renderLive() {
  const d = props.draft?.shape === 'brush' ? props.draft : null
  const cur = { mode: paint.mode, size: paint.size, pts: paint.raw.map(Math.round) }
  const strokes = [...(d ? d.brush.strokes : []), cur]
  const ext = [cur, ...(d ? d.brush.strokes : [])].filter(s => s.mode === 'add' || s === cur).map(strokeExtent)
  const x0 = Math.max(0, Math.min(...ext.map(e => e.x))), y0 = Math.max(0, Math.min(...ext.map(e => e.y)))
  const x1 = Math.min(W, Math.max(...ext.map(e => e.x + e.w))), y1 = Math.min(H, Math.max(...ext.map(e => e.y + e.h)))
  const box = { id: '_live', x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), brush: { strokes } }
  if (!liveObj) {
    liveObj = makeBrushRegion(box, { live: true })
    canvas.add(liveObj)
  } else {
    liveObj.set({ left: box.x, top: box.y, width: box.w, height: box.h })
    liveObj.setBrush(strokes, box.x, box.y, box.w, box.h)
  }
  // 칠하는 동안은 초안 그림을 숨기고 미리보기 하나만 (겹쳐 진해지지 않게)
  const dr = d && regions.get(d.id)
  if (dr) dr.visible = false
  canvas.bringObjectToFront(liveObj)
  if (cursorObj) canvas.bringObjectToFront(cursorObj)
  canvas.requestRenderAll()
}

function endPaint() {
  const p = paint
  paint = null
  if (!p) return
  const pts = simplifyStroke(p.raw, p.size)
  if (pts.length >= 2) emit('brush-stroke', { mode: p.mode, size: p.size, pts })
  // 편집기가 초안을 바꾸면 sync가 새 초안을 그린다. 그 다음에 미리보기를 걷는다 (깜빡임 방지)
  setTimeout(() => {
    if (paint) return
    if (liveObj) { canvas?.remove(liveObj); liveObj = null }
    const d = props.draft
    const dr = d && regions.get(d.id)
    if (dr) dr.visible = true
    canvas?.requestRenderAll()
  }, 0)
}

/**
 * Fabric에 남아 있는 드래그(_currentTransform)를 저장 없이 끝내고 영역을 저장값 위치로 되돌린다.
 * Fabric 6.9.1 endCurrentTransform()은 드래그가 없을 때 부르면 오류가 나고, 끝낼 때 object:modified를 보내므로
 * 드래그가 있을 때만 부르고 aborting 동안의 object:modified는 저장하지 않는다.
 * @param {boolean} unexpected  뗌 신호를 못 받아 남은 경우 true (console.warn), 사용자가 Esc·도구 전환한 경우 false
 */
function abortTransform(reason, unexpected) {
  press = null
  if (!canvas || !canvas._currentTransform) return false
  const id = canvas._currentTransform.target?.layerId
  if (unexpected) console.warn('[StudioCanvas] 남아 있던 드래그를 저장 없이 취소:', reason, id)
  aborting = true
  try {
    canvas.endCurrentTransform()
  } finally {
    aborting = false
  }
  transforming.clear()
  sync() // 영역 위치·크기를 props.layers(저장값) 그대로 되돌린다
  return true
}

// 뗌 신호 대비: Fabric 6.9.1은 기본값(enablePointerEvents: false)이라 pointer가 아니라 mouse·touch 이벤트를 쓴다.
// 누르면 document에 mouseup(터치는 touchend)을 걸어 드래그를 끝낸다. 버블링 순서상 document 다음이 window이므로,
// window에서 받았을 때도 드래그가 남아 있으면 Fabric이 그 뗌을 처리하지 못한 것(예: button≠0인 뗌은 Fabric이 무시하고
// document 리스너만 떼어 버려, 이후 마우스를 움직이면 영역이 포인터를 따라다닌다) → 저장 없이 끝낸다.
// ※ window pointerup은 mouseup보다 먼저 오므로 쓰면 안 된다 (정상 드래그까지 취소됨 — 2026-09-25 재현 페이지에서 확인)
function onWindowPointerEnd(e) {
  if (canvas?._currentTransform) abortTransform(`${e.type}(button=${e.button ?? '-'})이 Fabric에 전달되지 않음`, true)
  if (paint) endPaint() // 캔버스 밖에서 손을 뗌 — 칠한 데까지 한 획으로
}
function onPointerLeave() { updateCursor(null) }

function onMouseDown(opt) {
  if ((tool.value === 'marquee' || tool.value === 'cover') && opt.e.button === 0 && opt.target?.layerId) {
    // 3px 판정용: 누른 화면 위치와 누르기 전 위치·크기
    const t = opt.target
    press = { id: t.layerId, s0: { x: opt.viewportPoint.x, y: opt.viewportPoint.y }, orig: { left: t.left, top: t.top, width: t.width * t.scaleX, height: t.height * t.scaleY } }
    return
  }
  if (loadState.value !== 'ready' || opt.e.button !== 0) return
  if (tool.value === 'brush') {
    const p = clampPoint(screenToImage({ x: opt.viewportPoint.x, y: opt.viewportPoint.y }, vpt))
    paint = { mode: props.brushMode === 'sub' ? 'sub' : 'add', size: props.brushSize, raw: [p.x, p.y] }
    renderLive()
    return
  }
  if (tool.value !== 'marquee' && tool.value !== 'cover') return
  const s0 = { x: opt.viewportPoint.x, y: opt.viewportPoint.y }
  const p0 = screenToImage(s0, vpt)
  const preview = makeRegion({ id: '_draft', x: 0, y: 0, w: 1, h: 1 }, false)
  preview.visible = false
  canvas.add(preview)
  draw = { s0, p0, preview }
}

function onMouseMove(opt) {
  if (tool.value === 'brush') {
    const p = screenToImage({ x: opt.viewportPoint.x, y: opt.viewportPoint.y }, vpt)
    updateCursor(p)
    if (!paint) return
    const q = clampPoint(p)
    const lx = paint.raw[paint.raw.length - 2], ly = paint.raw[paint.raw.length - 1]
    if (Math.hypot(q.x - lx, q.y - ly) < 1) return // 1px보다 가까운 이벤트는 모으지 않는다 (저장 전 단순화는 endPaint)
    paint.raw.push(q.x, q.y)
    renderLive()
    return
  }
  if (!draw) return
  const s1 = opt.viewportPoint
  if (isClick(draw.s0, s1)) { draw.preview.visible = false; canvas.requestRenderAll(); return }
  const r = rectFromDrag(draw.p0, screenToImage(s1, vpt), W, H)
  draw.preview.set({ left: r.x, top: r.y, width: r.w, height: r.h, visible: true })
  canvas.requestRenderAll()
}

function onMouseUp(opt) {
  if (paint) { endPaint(); return }
  if (draw) {
    const s1 = opt.viewportPoint
    const click = isClick(draw.s0, s1)
    const r = click ? null : rectFromDrag(draw.p0, screenToImage(s1, vpt), W, H)
    cancelDraw()
    canvas.requestRenderAll()
    // 실행 전 네모(초안) — 도구 유지, 새로 그리면 이전 초안은 편집기가 버린다. [덮기]는 덮을 곳 (가져올 곳은 편집기가 붙인다)
    if (r) emit(tool.value === 'cover' ? 'draft-cover' : 'draft-rect', r)
    else if (tool.value === 'marquee') emit('deselect') // 포토샵: 선택 바깥 빈 곳을 누르면 선택 해제
    return
  }
  press = null
  // 옮기다 제자리에 놓아 object:modified가 안 온 경우에도 점선을 풀고 결과를 다시 보여준다
  if (transforming.size) {
    transforming.clear()
    sync()
  }
}

// ── 선택·변형 ──
function onSelection(opt) {
  const t = opt.selected?.[0] || canvas.getActiveObject()
  const id = t?.layerId || null
  if (id !== props.selectedId) emit('select', id)
}
function onSelectionCleared() {
  if (replacing) return
  // 붓·네모로 칠하는 중에 사진을 누르면 Fabric이 선택을 푼다. 실행 전 영역(초안)은 그대로 고른 채로 둔다
  // (한도를 넘어 획이 거절되면 다시 고를 기회가 없어 [AI로 지우기]/[단색]이 꺼지던 문제)
  if ((tool.value === 'brush' || tool.value === 'marquee' || tool.value === 'cover') && props.draft && props.selectedId === props.draft.id) return
  if (props.selectedId !== null) emit('select', null)
}

function beginTransform(obj) {
  if (!obj?.layerId) return
  if (!transforming.has(obj.layerId)) {
    transforming.add(obj.layerId)
    obj.busy = true
    const p = patches.get(obj.layerId)
    if (p) p.visible = false
  }
}

function onMoving(opt) {
  const o = opt.target
  if (o?.isSource) { // 가져올 곳: 사진 밖으로 못 나가게, 덮을 곳에 바로 미리보기
    const c = clampRectPosition({ x: o.left, y: o.top, w: o.width, h: o.height }, W, H)
    o.set({ left: c.x, top: c.y })
    schedulePreview()
    return
  }
  beginTransform(o)
  const c = clampRectPosition({ x: o.left, y: o.top, w: o.width * o.scaleX, h: o.height * o.scaleY }, W, H)
  o.set({ left: c.x, top: c.y })
}

function onScaling(opt) {
  const o = opt.target
  beginTransform(o)
  if (o.width * o.scaleX < MIN_RECT) o.set({ scaleX: MIN_RECT / o.width })
  if (o.height * o.scaleY < MIN_RECT) o.set({ scaleY: MIN_RECT / o.height })
}

function onModified(opt) {
  const o = opt.target
  if (!o?.layerId) return
  if (aborting) { transforming.delete(o.layerId); return } // 취소 중 — abortTransform이 저장값으로 되돌린다
  // 3px 판정: 누른 곳에서 거의 안 움직였으면 "선택만" — 화면 위 위치·크기도 누르기 전 값으로 되돌리고 저장·이력 없음
  const p = press
  press = null
  if (o.isSource) {
    if (previewRaf) { cancelAnimationFrame(previewRaf); previewRaf = 0 }
    const cov = currentCover()
    const sx = Math.round(o.left), sy = Math.round(o.top)
    const selectOnly = p && p.id === o.layerId && opt.e && isSelectOnly(p.s0, localPoint(opt.e))
    if (!selectOnly && cov && cov.id === o.layerId && (cov.sx !== sx || cov.sy !== sy)) {
      o.set({ left: sx, top: sy })
      o.setCoords()
      emit('cover-source', o.layerId, { sx, sy })
      return
    }
    // 제자리 — 저장값 자리로 되돌리고(끄는 중 표시가 아직 남아 있어 syncSource가 자리를 건드리지 않으므로 여기서), 미리보기 대신 계산 결과
    if (cov) { o.set({ left: cov.sx, top: cov.sy }); o.setCoords() }
    sync()
    return
  }
  if (p && p.id === o.layerId && opt.e && isSelectOnly(p.s0, localPoint(opt.e))) {
    o.set({ left: p.orig.left, top: p.orig.top, width: p.orig.width, height: p.orig.height, scaleX: 1, scaleY: 1 })
    o.setCoords()
    transforming.delete(o.layerId)
    sync()
    return
  }
  const kind = opt.action === 'drag' ? 'move' : 'resize'
  const r = normalizeRect({ x: o.left, y: o.top, w: o.width * o.scaleX, h: o.height * o.scaleY }, W, H)
  o.set({ left: r.x, top: r.y, width: r.w, height: r.h, scaleX: 1, scaleY: 1 })
  o.setCoords()
  transforming.delete(o.layerId)
  const cur = props.draft?.id === o.layerId ? props.draft : props.layers.find(l => l.id === o.layerId)
  if (cur && (cur.x !== r.x || cur.y !== r.y || cur.w !== r.w || cur.h !== r.h)) emit('change', o.layerId, r, o.kind === 'brush' ? 'move' : kind)
  sync()
}

// 선택 안 된 영역은 테두리 없이 결과만 — 마우스를 올렸을 때만 옅은 테두리
function onHover(on) {
  return (opt) => {
    const t = opt.target
    if (!t?.layerId || t.hovered === on) return
    t.hovered = on
    canvas.requestRenderAll()
  }
}

// ── 레이어 → 캔버스 객체 동기화 ──
function currentPatchCache() {
  const id = props.image?.id
  if (!id) return new Map()
  let m = patchCaches.get(id)
  if (!m) {
    m = new Map()
    patchCaches.set(id, m)
    while (patchCaches.size > 5) patchCaches.delete(patchCaches.keys().next().value)
  }
  return m
}

function sync() {
  if (!canvas || !baseObj) return
  const fills = props.layers.filter(isValidPixelLayer) // 지우기 + 덮기 (배열 순서)
  const draft = props.draft && props.draft.id && !fills.some(l => l.id === props.draft.id) ? props.draft : null
  // 덮기 초안은 계산 목록 맨 뒤에 넣어 결과(미리보기)를 보인다 — 맨 뒤라 저장된 레이어의 계산 key는 그대로
  planList = draft?.type === 'cover' ? [...fills, draft] : fills
  const alive = new Set(fills.map(l => l.id))
  if (draft) alive.add(draft.id)
  for (const [id, r] of regions) if (!alive.has(id)) { canvas.remove(r); regions.delete(id) }
  for (const [id, p] of patches) if (!planList.some(l => l.id === id)) { canvas.remove(p); patches.delete(id) }
  // 모양이 바뀐 영역(초안 네모 ↔ 붓, 초안 → 실행된 레이어)은 객체를 새로 만든다
  for (const l of [...fills, ...(draft ? [draft] : [])]) {
    const r = regions.get(l.id)
    const kind = l.shape === 'brush' ? 'brush' : 'rect'
    const isDraft = l === draft
    if (r && (r.kind !== kind || !!r.pendingDraft !== isDraft)) {
      // 같은 영역의 객체만 바꾸는 것이므로 Fabric의 "선택 해제"를 편집기에 알리지 않는다
      // (초안 → [AI로 지우기]/[단색] 직후 선택이 풀려 왼쪽 패널이 비던 문제. 아래 선택 맞추기가 새 객체를 다시 고른다)
      replacing = true
      try { canvas.remove(r) } finally { replacing = false }
      regions.delete(l.id)
    }
  }

  // 계산 계획: 그린 순서 + 연결된 앞 레이어 (키에 앞 레이어 값이 들어가 앞이 바뀌면 뒤도 다시 계산)
  plan = new Map(fillPlan(planList, W, H).map(p => [p.id, p]))
  byId = new Map(planList.map(l => [l.id, l]))
  const planKeys = new Set([...plan.values()].map(p => p.key))
  // 받기 실패 안내는 그 레이어 값이 바뀌면(옮김·삭제·되돌리기) 내린다
  if (aiLoadFailure.value && plan.get(aiLoadFailure.value.layerId)?.key !== aiLoadFailure.value.planKey) aiLoadFailure.value = null
  // 값이 바뀌어 더는 없는 key의 [지우기] 요청은 버린다 (옮기면 다시 [다시 지우기]를 눌러야 한다)
  for (const k of [...aiRequested.keys()]) if (!planKeys.has(k)) aiRequested.delete(k)
  // 레이어에 ai가 붙었거나(저장 완료) 값이 바뀐 결과는 "저장 안 됨" 목록에서 뺀다
  for (const [id, k] of [...aiUnsaved]) {
    const l = byId.get(id), p = patches.get(id)
    if (!l || l.ai?.key === k || !p || p.patchKey !== plan.get(id)?.key) aiUnsaved.delete(id)
  }
  // 저장 실패 결과: 레이어가 지워졌거나 값이 바뀌었거나(되돌리기·옮기기) 이미 저장된 결과면 더는 저장할 것이 아니다
  let failedChanged = false
  for (const [id, j] of [...aiSaveFailed]) {
    const l = byId.get(id)
    if (!l || l.method !== 'ai' || plan.get(id)?.key !== j.planKey || l.ai?.key === j.key) { aiSaveFailed.delete(id); failedChanged = true }
  }
  for (const [id, w] of [...aiSaveWaiting]) {
    const l = byId.get(id)
    if (!l || l.method !== 'ai' || plan.get(id)?.key !== w.job.planKey || l.ai?.key === w.job.key) { clearTimeout(w.timer); aiSaveWaiting.delete(id); failedChanged = true }
  }
  if (failedChanged) emitSaveState()
  const cache = currentPatchCache()
  for (const l of [...fills, ...(draft ? [draft] : [])]) {
    const brush = l.shape === 'brush'
    let r = regions.get(l.id)
    if (!r) {
      r = brush ? makeBrushRegion(l, { draft: l === draft }) : makeRegion(l)
      r.pendingDraft = l === draft
      regions.set(l.id, r)
      canvas.add(r)
    } else if (!transforming.has(l.id)) {
      r.set({ left: l.x, top: l.y, width: l.w, height: l.h, scaleX: 1, scaleY: 1 })
      r.setCoords()
      if (brush && (r.strokes !== l.brush.strokes || r.bx !== l.x || r.by !== l.y || r.bw !== l.w || r.bh !== l.h)) {
        r.setBrush(l.brush.strokes, l.x, l.y, l.w, l.h)
      }
    }
    if (!brush) r.grow = growOf(l)
    if (l === draft) { r.busy = true; r.tint = true } // 실행 전: 점선(네모) / 반투명 색(붓)
  }
  // 1) AI: 결과가 지금 값과 맞을 때만 보인다 (계산은 [지우기]로만). 맞지 않으면 옛 결과를 숨기고 점선만
  for (const l of fills) {
    if (l.method !== 'ai' || transforming.has(l.id)) continue
    const r = regions.get(l.id)
    const key = plan.get(l.id).key
    const p = patches.get(l.id)
    setBleed(l.id, [])
    if (aiDone(l)) { p.visible = true; r.busy = false; continue }
    const hit = cache.get(key)
    if (hit?.aiKey && l.ai?.key === hit.aiKey) { placePatch(l, key, hit); r.busy = false; continue }
    if (p) p.visible = false
    r.busy = true
  }
  // 2) coons·단색·덮기: 화면 계산 key = 계산 key + 안 지운 앞 AI 목록 (앞 AI를 지우면 다시 계산)
  eff = new Map()
  for (const l of planList) {
    if (l.method === 'ai') continue
    const key = effectiveKey(plan.get(l.id), byId, id => aiDone(byId.get(id)))
    eff.set(l.id, key)
    if (transforming.has(l.id)) continue
    const r = regions.get(l.id)
    const p = patches.get(l.id)
    if (p && p.patchKey === key) { p.visible = true; r.busy = false; continue }
    const hit = cache.get(key)
    if (hit) { placePatch(l, key, hit); r.busy = false; continue }
    // 자기 값이 바뀌었으면 옛 결과를 숨기고, 앞 레이어만 바뀌었으면 새 결과가 나올 때까지 옛 결과를 둔다 (깜빡임 방지)
    if (p) p.visible = p.ownKey === ownKey(l)
    setBleed(l.id, []) // 걸침 판정은 새 결과가 나오면 다시
    r.busy = true
  }
  // 붓: 결과가 안 맞으면(실행 전과 같이) 칠한 모양을 반투명 색으로
  for (const l of fills) { const r = regions.get(l.id); if (r?.kind === 'brush') r.tint = r.busy }
  syncSource()
  applyEvented()
  restack(planList, draft)
  // 선택 상태 맞추기 (고른 덮기의 가져올 곳을 잡고 있으면 그대로 — 그것도 같은 덮기를 고른 것)
  const want = props.interactive && props.selectedId ? regions.get(props.selectedId) : null
  const active = canvas.getActiveObject()
  const holdingSource = !!active?.isSource && active === sourceObj && active.layerId === props.selectedId
  if (want && active !== want && !holdingSource) canvas.setActiveObject(want)
  else if (!want && active) canvas.discardActiveObject()
  canvas.requestRenderAll()
  refreshAiStates()
  scheduleCompute()
}

/** AI 레이어의 결과가 지금 화면에 맞게 있는가 — 계산 key가 같고, 결과 key가 레이어의 ai.key(또는 저장 중인 결과)와 같을 때 */
function aiDone(l) {
  if (!l || l.method !== 'ai') return false
  const p = patches.get(l.id)
  if (!p || !p.aiKey || p.patchKey !== plan.get(l.id)?.key) return false
  return l.ai?.key === p.aiKey || aiUnsaved.get(l.id) === p.aiKey
}

/** AI 레이어 상태 (떠 있는 막대·오른쪽 패널 버튼용) */
function aiStateOf(l) {
  const key = plan.get(l.id)?.key
  if (!key) return 'needs'
  if (aiDone(l)) return 'done'
  if (aiRequested.has(key)) return 'busy'
  if (aiLoadFailure.value?.layerId === l.id) return 'failed'
  if (l.ai && !aiChecked.has(`${key}|${l.ai.key}`) && !failedKeys.has(key)) return 'loading'
  return 'needs'
}

function refreshAiStates() {
  const next = {}
  for (const l of props.layers) if (isValidFillLayer(l) && l.method === 'ai') next[l.id] = aiStateOf(l)
  aiRequestCount.value = aiRequested.size
  if (JSON.stringify(next) === JSON.stringify(aiStates.value)) return
  aiStates.value = next
  emit('ai-states', next)
}

/**
 * [AI로 지우기] 실행: 이 AI 레이어 + 앞에 연결된 안 지운 AI를 계산 요청 (실행 한 번 = batch 하나 = 이력 한 단계).
 * 편집기가 레이어를 추가·방식 변경한 직후 부르므로 먼저 sync로 계획을 새로 만든다.
 */
function requestErase(layerId, batchFromEditor) {
  sync()
  const l = byId.get(layerId)
  const e = plan.get(layerId)
  if (!l || l.method !== 'ai' || !e || transforming.has(layerId)) {
    console.error('[StudioCanvas] AI 실행 요청을 처리할 수 없음 (레이어 없음·AI 아님·옮기는 중):', layerId, l?.method)
    return
  }
  const batch = batchFromEditor ?? `c${++aiBatchSeq}`
  for (const id of aiEraseSet(e, byId, x => aiDone(byId.get(x)))) {
    const k = plan.get(id).key
    failedKeys.delete(k)
    aiRequested.set(k, batch)
  }
  if (aiLoadFailure.value?.layerId === layerId) aiLoadFailure.value = null
  computeError.value = ''
  refreshAiStates()
  scheduleCompute()
}

function placePatch(l, key, res) {
  const id = l.id
  let p = patches.get(id)
  // 삭제(투명): 조각 대신 뚫을 모양을 destination-out으로 — 아래(원본·앞 조각)를 비운다. 뒤 레이어는 그 위에 다시 그려진다
  const el = res.clearMask || res.canvas
  const gco = res.clearMask ? 'destination-out' : 'source-over'
  if (!p) {
    p = new FabricImage(el, {
      left: res.area.x, top: res.area.y, originX: 'left', originY: 'top',
      selectable: false, evented: false, objectCaching: false, globalCompositeOperation: gco,
    })
    patches.set(id, p)
    canvas.add(p)
  } else {
    p.setElement(el)
    p.set({ left: res.area.x, top: res.area.y, scaleX: 1, scaleY: 1, globalCompositeOperation: gco })
  }
  p.patchKey = key
  p.ownKey = ownKey(l)
  p.aiKey = res.aiKey || null // AI 결과 key (coons·단색은 없음)
  p.res = res // 뒤 레이어 계산 때 덮어쓸 픽셀
  p.visible = true
  setBleed(id, res.bleed?.sides || [])
}

/**
 * 지금 할 수 있는 다음 일 — 배열 순서로
 *   mode 'fill'    coons·단색 계산. 앞 연결 coons·단색이 최신이어야 한다. 안 지운 앞 AI는 없는 것으로 본다(effectiveKey)
 *   mode 'load'    AI: 레이어에 ai가 있고 아직 확인 안 함 → 결과 key를 계산해 같으면 저장된 PNG를 받는다
 *   mode 'compute' AI: [지우기]를 누른 것만. 엔진 준비 + 앞 연결 레이어 모두 최신(앞 AI도 지워짐)이어야 한다
 */
function nextPending() {
  const freshFill = id => { const p = patches.get(id); return !!p && p.patchKey === eff.get(id) }
  const done = id => { const x = byId.get(id); return x?.method === 'ai' ? aiDone(x) : freshFill(id) }
  for (const l of planList) { // 지우기·덮기 + 덮기 초안 (배열 순서)
    const e = plan.get(l.id)
    if (!e || transforming.has(l.id)) continue
    if (l.method === 'ai') {
      if (aiRunning || aiDone(l) || failedKeys.has(e.key)) continue
      if (aiRequested.has(e.key)) {
        if (!aiReady()) continue // 준비되면 watch가 다시 부른다
        if (e.deps.some(d => transforming.has(d) || !done(d))) continue
        if (e.chain.some(id => byId.get(id)?.method === 'ai' && !aiDone(byId.get(id)))) continue
        return { l, e, mode: 'compute' }
      }
      if (l.ai && !aiChecked.has(`${e.key}|${l.ai.key}`)) return { l, e, mode: 'load' }
      continue
    }
    const key = eff.get(l.id)
    if (freshFill(l.id) || failedKeys.has(key)) continue
    if (e.deps.some(d => transforming.has(d) || (byId.get(d)?.method !== 'ai' && !freshFill(d)))) continue
    return { l, e, mode: 'fill' }
  }
  return null
}

// 순서: 원본 → 결과 조각(레이어 순) → 영역 테두리(레이어 순) → 실행 전 영역 → 가져올 곳 → 칠하는 중 미리보기 → 붓 크기 원
function restack(fills, draft = props.draft) {
  const order = [baseObj]
  for (const l of fills) { const p = patches.get(l.id); if (p) order.push(p) }
  for (const l of fills) { const r = regions.get(l.id); if (r) order.push(r) }
  const dr = draft && regions.get(draft.id)
  if (dr && !order.includes(dr)) order.push(dr)
  if (sourceObj) order.push(sourceObj)
  if (liveObj) order.push(liveObj)
  if (cursorObj) order.push(cursorObj)
  order.forEach((o, i) => { if (canvas._objects[i] !== o) canvas.moveObjectTo(o, i) })
}

function scheduleCompute() {
  if (computeTimer || !imgEl || !nextPending()) return
  // 한 틱 미뤄 점선 테두리가 먼저 보이게 한 뒤, 한 번에 하나씩 계산
  computeTimer = setTimeout(runCompute, 0)
}

function runCompute() {
  computeTimer = null
  if (!imgEl || !canvas) return
  const next = nextPending()
  if (!next) return
  const { l, e, mode } = next
  if (mode !== 'fill') {
    runAi(l, e, mode)
    scheduleCompute() // AI가 도는 동안 다른 레이어는 계속 계산
    return
  }
  const key = eff.get(l.id)
  const r = regions.get(l.id)
  let res
  try {
    // 연결된 앞 레이어 결과를 덮어쓴 뒤 계산 (studioFillPlan 규칙). 안 지운 앞 AI는 건너뛴다 (원본 그대로)
    const prior = e.deps.filter(d => byId.get(d)?.method !== 'ai' || aiDone(byId.get(d))).map(d => patches.get(d).res)
    res = computeFillPatch(imgEl, l, prior)
  } catch (err) {
    // 대개 캔버스 오염(SecurityError). 사유를 화면에 남긴다
    console.error('[StudioCanvas] 지우기 계산 실패:', l.id, err)
    computeError.value = `지우기 계산에 실패했어요: ${err.message || err}`
    res = null
  }
  if (res && !res.ok) {
    console.error('[StudioCanvas] 지우기 계산 실패:', l.id, res.reason)
    computeError.value = `지우기 계산에 실패했어요 (${res.reason})`
  }
  if (res?.ok) {
    currentPatchCache().set(key, res)
    placePatch(l, key, res)
    if (r) {
      r.busy = false
      if (r.kind === 'brush') r.tint = false // 결과가 나왔으니 칠한 모양(반투명 색)을 걷는다 (sync와 같은 규칙: tint = busy)
    }
    restack(planList)
  } else {
    failedKeys.add(key) // 같은 값으로는 다시 시도하지 않는다 (영역을 바꾸면 새 키로 다시 계산)
  }
  canvas.requestRenderAll()
  scheduleCompute()
}

function sameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

/**
 * AI 레이어 한 건 (비동기, 한 번에 1건). 시작할 때의 plan key를 기억하고, 끝났을 때 그 레이어의 key가 그대로일 때만 반영한다
 * (도중에 옮기거나 지우거나 사진을 바꾸면 버린다 — 자동으로 다시 하지 않는다).
 *   load    ai.key == 지금 결과 key → 저장된 PNG를 받아 쓴다. 다르면 [다시 지우기] 상태로 둔다.
 *           받기 실패면 "[다시 계산]" 안내 — 몰래 재계산하지 않는다
 *   compute [지우기]를 누른 것: 잘라낸 조각 + 연결된 앞 레이어 결과 덮어쓰기(pastePrior) → inpaint → 화면 반영
 *           → PNG 저장 → emit('ai') (편집기가 ai를 붙이고 이력 "AI 지우기")
 */
async function runAi(l, e, mode) {
  const seq = showSeq
  const planKey = e.key
  const imageRow = props.image
  const aiKeyAtStart = l.ai?.key
  const stale = () => seq !== showSeq || !canvas || plan.get(l.id)?.key !== planKey
  aiRunning = true
  if (mode === 'compute') aiActive.value = true
  try {
    if (!AI_MODEL_ID) throw new Error('AI 모델 설정(VITE_STUDIO_AI_MODEL_SHA256)이 없어요')
    const key = await aiPatchKey(planKey, AI_MODEL_ID)
    if (stale()) return
    const area = fillArea(l, W, H)

    if (mode === 'load') {
      if (byId.get(l.id)?.ai?.key !== aiKeyAtStart) return // 그 사이 ai가 바뀜 — 다음 차례에 다시 본다
      if (aiKeyAtStart !== key) { aiChecked.add(`${planKey}|${aiKeyAtStart}`); return } // 값이 바뀐 결과 → [다시 지우기]
      let loaded
      try {
        if (!sameRect(l.ai.patch, area)) throw new Error(`저장된 범위가 지금 범위와 달라요 (${JSON.stringify(l.ai.patch)})`)
        loaded = await loadAiPatch(l.ai.patch)
      } catch (err) {
        if (stale()) return
        console.error('[StudioCanvas] 저장된 AI 결과 받기 실패:', l.id, l.ai.patch.path, err)
        failedKeys.add(planKey)
        aiLoadFailure.value = { layerId: l.id, planKey, message: err.message || String(err) }
        return
      }
      if (stale()) return
      const res = { canvas: loaded.canvas, area, data: loaded.data, aiKey: key }
      currentPatchCache().set(planKey, res)
      placePatch(l, planKey, res)
      sync() // AI 결과가 생기면 연결된 뒤 coons·단색의 key가 바뀐다
      return
    }

    // compute — [지우기]를 누른 것만 온다 (nextPending이 엔진 준비·앞 레이어를 확인함)
    const batch = aiRequested.get(planKey)
    const crop = cropRect(l, W, H)
    const c = document.createElement('canvas')
    c.width = crop.w
    c.height = crop.h
    const cctx = c.getContext('2d', { willReadFrequently: true })
    cctx.drawImage(imgEl, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
    const cropData = cctx.getImageData(0, 0, crop.w, crop.h) // 오염 시 SecurityError → 아래 catch에서 사유 표시
    pastePrior(cropData, crop, e.deps.map(d => patches.get(d).res))
    const out = await props.aiEngine.inpaint({
      cropImageData: cropData, crop,
      fillAreasInCrop: [{ x: area.x - crop.x, y: area.y - crop.y, w: area.w, h: area.h }],
      // 붓: 칠한 모양을 사방 max(pad,k) 넓힌 마스크 (조각 좌표). 네모는 사각형 그대로
      maskInCrop: l.shape === 'brush' ? rasterizeStrokes(l.brush.strokes, crop, fillGrowOf(l, W, H)) : undefined,
    })
    if (stale()) return
    if (!sameRect(out.area, area)) throw new Error(`엔진 결과 범위가 달라요 (${JSON.stringify(out.area)} / 기대 ${JSON.stringify(area)})`)
    aiRequested.delete(planKey)
    const pc = document.createElement('canvas')
    pc.width = area.w
    pc.height = area.h
    pc.getContext('2d').putImageData(new ImageData(out.data.data, area.w, area.h), 0, 0)
    const res = { canvas: pc, area, data: out.data, aiKey: key }
    currentPatchCache().set(planKey, res)
    aiUnsaved.set(l.id, key) // ai가 붙기 전까지도 결과를 보이게
    placePatch(l, planKey, res)
    sync() // AI 결과가 생기면 연결된 뒤 coons·단색의 key가 바뀐다

    // 저장 — 실패하면 결과를 메모리에 두고 지우기 화면에 [다시 저장] 카드를 띄운다 (조용히 넘기지 않는다)
    await saveAiResult({ imageRow, layerId: l.id, planKey, key, W, H, batch, area, canvas: pc, engine: props.aiEngine.engine })
  } catch (err) {
    if (stale()) return
    console.error('[StudioCanvas] AI 지우기 실패:', l.id, err)
    computeError.value = `AI 지우기에 실패했어요: ${err.message || err}`
    failedKeys.add(planKey)
    aiRequested.delete(planKey)
  } finally {
    aiRunning = false
    aiActive.value = false
    if (canvas) {
      refreshAiStates()
      canvas.requestRenderAll()
      scheduleCompute()
    }
  }
}

/**
 * AI 결과 조각 저장 → 성공하면 emit('ai') (편집기가 레이어에 ai를 붙이고 이력 "AI 지우기").
 * 실패하면 studioSaveGuard 규칙대로: 다시 하면 될 실패는 2초 → 5초 → 10초 뒤 자동으로 다시 올리고(그동안 "저장하는 중이에요…"),
 * 3번 다 실패했거나 다시 해도 소용없는 실패(크기·개수 한도·권한 등)는 aiSaveFailed에 남겨 [다시 저장] 카드를 띄운다.
 * 처음 저장·자동 다시 저장·[다시 저장]이 모두 이 함수를 쓴다. 조각 픽셀은 계산 때 만든 canvas 그대로 (AI 재계산 없음)
 * @param {{ manual?: boolean }} opts manual = [다시 저장] 한 번 (실패하면 자동 재시도 없이 카드)
 */
async function saveAiResult(job, { manual = false } = {}) {
  const seq = showSeq
  const attempt = job.attempt || 0
  aiUploading.set(job.layerId, attempt)
  emitSaveState()
  try {
    const path = await uploadAiPatch({ projectId: job.imageRow.project_id, imageId: job.imageRow.id, layerId: job.layerId, key: job.key, canvas: job.canvas })
    if (seq === showSeq) aiSaveFailed.delete(job.layerId)
    // 사진이 바뀌었어도 저장은 됐으므로 편집기에 알린다 (편집기가 그 레이어의 계산 key가 그대로일 때만 붙인다 — 기존 동작)
    emit('ai', {
      imageId: job.imageRow.id, layerId: job.layerId, planKey: job.planKey, W: job.W, H: job.H, batch: job.batch,
      ai: { key: job.key, model: AI_MODEL_ID, engine: job.engine, patch: { path, x: job.area.x, y: job.area.y, w: job.area.w, h: job.area.h } },
    })
  } catch (err) {
    console.error(`[StudioCanvas] AI 결과 저장 실패 (${attempt + 1}번째, code=${err.code || '없음'}):`, job.layerId, err)
    if (seq !== showSeq) return
    const delay = manual ? null : nextRetryDelay(err.code, attempt)
    if (delay !== null) {
      aiSaveFailed.delete(job.layerId)
      const next = { ...job, attempt: attempt + 1 }
      const timer = setTimeout(() => { aiSaveWaiting.delete(job.layerId); saveAiResult(next) }, delay)
      aiSaveWaiting.set(job.layerId, { job: next, timer })
    } else {
      aiSaveFailed.set(job.layerId, { ...job, message: err.message || String(err), retryable: isRetryableSaveError(err.code) })
    }
  } finally {
    if (seq === showSeq) {
      aiUploading.delete(job.layerId)
      emitSaveState()
    }
  }
}

/** [다시 저장] — 저장 못 한 결과를 메모리의 픽셀 그대로 다시 올린다 (한 번씩). 모두 성공하면 true */
async function retryAiSave() {
  if (aiRetrying || aiSaveFailed.size === 0) return aiSaveFailed.size === 0
  aiRetrying = true
  emitSaveState()
  try {
    for (const job of [...aiSaveFailed.values()]) await saveAiResult(job, { manual: true })
  } finally {
    aiRetrying = false
    emitSaveState()
  }
  return aiSaveFailed.size === 0
}

/** 인터넷이 다시 연결되면 — 기다리던 자동 재시도는 바로, 네트워크류로 실패해 카드에 남은 결과도 한 번 바로 다시 올린다 */
function onOnline() {
  for (const [id, w] of [...aiSaveWaiting]) {
    clearTimeout(w.timer)
    aiSaveWaiting.delete(id)
    saveAiResult(w.job)
  }
  for (const [id, j] of [...aiSaveFailed]) {
    if (!j.retryable) continue
    aiSaveFailed.delete(id)
    saveAiResult({ ...j, attempt: AI_SAVE_RETRY_DELAYS.length }) // 이번에도 실패하면 바로 카드
  }
}

function clearSaveTimers() {
  for (const w of aiSaveWaiting.values()) clearTimeout(w.timer)
  aiSaveWaiting.clear()
}

// 지우기 화면에 알리는 저장 상태:
//   count 저장 못 한 결과([다시 저장] 카드) / pending 올리는 중 + 자동 재시도 대기 / autoRetrying 그중 자동 재시도 / saving [다시 저장] 누름
function emitSaveState() {
  const first = aiSaveFailed.values().next().value
  const retryingUploads = [...aiUploading.values()].filter(a => a > 0).length
  emit('ai-unsaved', {
    count: aiSaveFailed.size,
    pending: aiUploading.size + aiSaveWaiting.size,
    autoRetrying: aiSaveWaiting.size + retryingUploads,
    saving: aiRetrying,
    message: first?.message || '',
  })
}

// ── 사진 표시 ──
function clearObjects() {
  cancelDraw()
  plan = new Map()
  failedKeys.clear()
  clearTimeout(computeTimer)
  computeTimer = null
  transforming.clear()
  regions.clear()
  patches.clear()
  if (canvas) {
    canvas.discardActiveObject()
    canvas.clear()
  }
  baseObj = null
  imgEl = null
  W = 0; H = 0
  imageSize.value = null
  bleedById.value = {}
  press = null
  computeError.value = ''
  byId = new Map()
  eff = new Map()
  aiRequested.clear()
  aiChecked.clear()
  aiUnsaved.clear()
  aiSaveFailed.clear()
  clearSaveTimers()
  aiUploading.clear()
  emitSaveState()
  aiLoadFailure.value = null
  aiRequestCount.value = 0
  aiStates.value = {}
  emit('ai-states', {})
  liveObj = null   // canvas.clear()가 객체를 모두 걷었다
  cursorObj = null
  sourceObj = null
  planList = []
  if (previewRaf) { cancelAnimationFrame(previewRaf); previewRaf = 0 }
  paint = null
}

async function showImage() {
  const seq = ++showSeq
  clearObjects()
  const row = props.image
  if (!row || !canvas) { loadState.value = 'idle'; return }
  loadState.value = 'loading'
  loadError.value = ''
  try {
    const el = await props.loadImage(row)
    if (seq !== showSeq) return
    imgEl = el
    W = el.naturalWidth
    H = el.naturalHeight
    imageSize.value = { W, H }
    if (row.width && row.height && (row.width !== W || row.height !== H)) {
      console.warn('[StudioCanvas] DB 크기와 실제 크기가 다름 — 실제 픽셀 기준으로 편집:', row.id, row.width, row.height, W, H)
    }
    baseObj = new FabricImage(el, {
      left: 0, top: 0, originX: 'left', originY: 'top',
      selectable: false, evented: false, objectCaching: false,
    })
    canvas.add(baseObj)
    loadState.value = 'ready'
    fit()
    sync()
  } catch (e) {
    if (seq !== showSeq) return
    console.error('[StudioCanvas] 사진 표시 실패:', row.id, e)
    loadState.value = 'error'
    loadError.value = e.message || String(e)
  }
}

// ── 키보드 ──
function isTyping(e) {
  const t = e.target
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

function onKeyDown(e) {
  if (!props.keysEnabled || !props.interactive) return
  const typing = isTyping(e)
  if (e.code === 'Space' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    spaceHeld.value = true
    return
  }
  // 선택 영역이 없고 적용한 영역을 골라 둔 채 Delete = 그 적용을 빼기 (예전 그대로 — 왼쪽 패널 [적용한 것 빼기])
  if (!typing && !props.hasSelection && props.selectedId && (e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault()
    emit('remove', props.selectedId)
    return
  }
  const a = eraseKeyAction(e, { typing, hasSelection: props.hasSelection, onButton: !!e.target?.closest?.('button') })
  if (!a) return
  e.preventDefault()
  if (a.action === 'deselect') { // 진행 중이던 그리기·드래그 상태도 초기화
    cancelDraw()
    abortTransform('Esc', false)
    canvas?.requestRenderAll()
  }
  emit('key-action', a)
}
function onKeyUp(e) {
  if (e.code === 'Space') {
    if (!isTyping(e)) e.preventDefault()
    spaceHeld.value = false
  }
}
function onBlur() { spaceHeld.value = false }

// ── 수명 ──
onMounted(() => {
  const cs = getComputedStyle(wrap.value)
  colors = { accent: cs.getPropertyValue('--st-accent').trim(), surface: cs.getPropertyValue('--st-surface').trim() }
  const el = document.createElement('canvas')
  host.value.appendChild(el)
  const { cw, ch } = viewSize()
  canvas = new Canvas(el, {
    width: cw, height: ch,
    selection: false,              // 여러 개 끌어 선택 없음
    preserveObjectStacking: true,  // 선택해도 맨 위로 올리지 않는다 (레이어 순서 = 배열 순서)
    uniformScaling: false,         // 모서리로 가로·세로 따로
    stopContextMenu: true,
    fireMiddleClick: false,
    enableRetinaScaling: true,
  })
  canvas.on('mouse:down', onMouseDown)
  canvas.on('mouse:move', onMouseMove)
  canvas.on('mouse:up', onMouseUp)
  canvas.on('selection:created', onSelection)
  canvas.on('selection:updated', onSelection)
  canvas.on('selection:cleared', onSelectionCleared)
  canvas.on('object:moving', onMoving)
  canvas.on('object:scaling', onScaling)
  canvas.on('object:modified', onModified)
  canvas.on('mouse:over', onHover(true))
  canvas.on('mouse:out', onHover(false))
  // [원본 보기]: 그리기 직전에 원본 말고 모두 숨긴다 (계산이 끝나 결과 조각이 새로 붙어도 원본만 보이게)
  canvas.on('before:render', () => {
    if (!props.showOriginal) return
    for (const o of canvas._objects) if (o !== baseObj) o.visible = false
  })

  const w = wrap.value
  w.addEventListener('wheel', onWheel, { passive: false })
  w.addEventListener('pointerdown', onPanDown, true)
  w.addEventListener('pointermove', onPanMove)
  w.addEventListener('pointerleave', onPointerLeave)
  w.addEventListener('pointerup', onPanUp)
  w.addEventListener('pointercancel', onPanUp)
  w.addEventListener('mousedown', onMiddleMouseDown, true)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  window.addEventListener('online', onOnline)
  window.addEventListener('mouseup', onWindowPointerEnd)
  window.addEventListener('touchend', onWindowPointerEnd)
  window.addEventListener('touchcancel', onWindowPointerEnd)

  resizeObs = new ResizeObserver(() => {
    const s = viewSize()
    if (!canvas || !s.cw || !s.ch) return
    canvas.setDimensions({ width: s.cw, height: s.ch })
    if (W) applyVpt(vpt)
  })
  resizeObs.observe(w)
  applyTool(tool.value) // 지금 도구(기본 붓)의 커서·선택 설정을 캔버스에 적용
  showImage()
})

onBeforeUnmount(() => {
  showSeq++
  resizeObs?.disconnect()
  const w = wrap.value
  w?.removeEventListener('wheel', onWheel)
  w?.removeEventListener('pointerdown', onPanDown, true)
  w?.removeEventListener('pointermove', onPanMove)
  w?.removeEventListener('pointerleave', onPointerLeave)
  w?.removeEventListener('pointerup', onPanUp)
  w?.removeEventListener('pointercancel', onPanUp)
  w?.removeEventListener('mousedown', onMiddleMouseDown, true)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
  window.removeEventListener('online', onOnline)
  clearSaveTimers()
  window.removeEventListener('mouseup', onWindowPointerEnd)
  window.removeEventListener('touchend', onWindowPointerEnd)
  window.removeEventListener('touchcancel', onWindowPointerEnd)
  clearTimeout(computeTimer)
  if (previewRaf) { cancelAnimationFrame(previewRaf); previewRaf = 0 }
  const c = canvas
  canvas = null
  if (c) {
    c.dispose().then(null, (e) => console.error('[StudioCanvas] 캔버스 정리 실패:', e))
  }
  patchCaches.clear()
})

watch(() => props.image?.id, () => showImage())
watch(() => props.layers, () => sync(), { deep: true })
watch(() => props.selectedId, () => sync())
watch(tool, t => applyTool(t))
// [원본 보기]를 놓으면 영역을 다시 보이게 하고, 결과 조각은 sync가 지금 값대로 다시 정한다
watch(() => props.showOriginal, on => {
  if (!canvas) return
  if (on) { canvas.requestRenderAll(); return }
  for (const r of regions.values()) r.visible = true
  if (sourceObj) sourceObj.visible = true
  sync()
})
// 엔진이 준비되면 기다리던 AI 레이어를 계산한다
watch(() => props.aiState?.status, s => { if (s === 'ready') scheduleCompute() })
// 왼쪽 패널의 [AI로 지우기]
watch(() => props.eraseRequest?.n, () => { if (props.eraseRequest) requestErase(props.eraseRequest.layerId, props.eraseRequest.batch) })
watch(() => props.draft, () => sync(), { deep: true })
watch(() => props.brushSize, () => { if (cursorObj?.visible) updateCursor({ x: cursorObj.left, y: cursorObj.top }) })

// 편집기가 좌표 검증(브라우저 자동화)에 쓸 수 있도록 현재 뷰포트를 읽는 창구만 연다
// [조금 넓히기]는 지우기 화면 왼쪽 패널에서 부른다
defineExpose({ getViewport: () => [...vpt], getImageSize: () => ({ W, H }), widenSelected, retryAiSave })
</script>

<style scoped>
/* 스페이스 이동 중 커서 — Fabric이 캔버스 요소에 인라인으로 커서를 쓰므로 !important로 덮는다 */
.is-grab :deep(canvas) { cursor: grab !important; }
.is-grabbing :deep(canvas) { cursor: grabbing !important; }
/* 삭제(투명)한 곳에서 비치는 체크무늬 — 사진 자리만 */
.st-erase-checker {
  background-color: #ffffff;
  background-image: linear-gradient(45deg, #d9d9d9 25%, transparent 25%), linear-gradient(-45deg, #d9d9d9 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d9d9d9 75%), linear-gradient(-45deg, transparent 75%, #d9d9d9 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}
</style>
