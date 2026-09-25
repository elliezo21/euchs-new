<template>
  <div ref="wrap" class="absolute inset-0 overflow-hidden select-none" :class="wrapCursor ? `is-${wrapCursor}` : ''">
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

    <!-- 위쪽 가운데: 도구 막대 + 안내 띠 + 계산 실패 안내 -->
    <div class="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" style="z-index: 4; max-width: calc(100% - 24px)">
      <!-- 1-6b-2의 "덮기"는 이 막대의 "글자 지우기" 오른쪽에 같은 모양으로 붙는다 -->
      <div class="st-toolbar pointer-events-auto" role="toolbar" aria-label="편집 도구">
        <button
          v-for="t in TOOL_BUTTONS" :key="t.key" type="button"
          class="st-tool" :class="tool === t.key ? 'is-active' : ''"
          :aria-pressed="tool === t.key" :aria-label="t.tip" :data-tool="t.key"
          @click="setTool(t.key)"
        >
          <component :is="t.icon" class="w-4 h-4" :stroke-width="2" />
          <span>{{ t.label }}</span>
          <span class="st-tip" role="tooltip">{{ t.tip }}</span>
        </button>
      </div>
      <div v-if="hintVisible" class="st-hint pointer-events-auto" data-fill-hint>
        <span class="break-keep"><b>글자 지우기</b>를 누르고 중국어 위를 드래그하세요</span>
        <button type="button" class="st-hint-close" aria-label="안내 닫기" @click="dismissHint"><X class="w-4 h-4" :stroke-width="2" /></button>
      </div>
      <!-- 계산 실패 안내 (조용히 넘기지 않는다) -->
      <div v-if="computeError" class="pointer-events-auto px-3 py-2 rounded-[10px] st-surface st-shadow-float text-[12px] font-bold st-danger-text break-keep">
        {{ computeError }}
      </div>
    </div>

    <!-- 선택 영역 위 떠 있는 도구줄 -->
    <div
      v-if="floatPos && selectedLayer"
      class="absolute flex items-center gap-1 p-1 st-float-bar"
      :style="{ left: floatPos.left + 'px', top: floatPos.top + 'px' }"
      @pointerdown.stop
    >
      <button
        v-for="m in METHOD_OPTIONS" :key="m.key" type="button" class="st-float-item"
        :class="selectedLayer.method === m.key ? 'is-active' : ''"
        @click="$emit('method', selectedLayer.id, m.key)"
      >{{ m.label }}</button>
      <span class="st-float-sep" />
      <button type="button" class="st-float-item" title="삭제 (Delete)" @click="$emit('remove', selectedLayer.id)">
        <Trash2 class="w-4 h-4" :stroke-width="2" />
      </button>
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Canvas, FabricImage, Rect } from 'fabric'
import { MousePointer2, Eraser, ZoomIn, ZoomOut, Maximize, Trash2, X } from 'lucide-vue-next'
import {
  screenToImage, rectToScreen, rectFromDrag, normalizeRect, clampRectPosition, isClick,
  fitView, clampPan, zoomAt, expandRect, MIN_RECT,
} from '@/lib/studioCoords'
import { computeFillPatch } from '@/lib/studioFillPatch'
import { fillPlan, ownKey } from '@/lib/studioFillPlan'
import { isValidFillLayer } from '@/lib/studioEdit'

const props = defineProps({
  image: { type: Object, default: null },        // { id, original_path, width, height }
  layers: { type: Array, default: () => [] },     // 이 사진의 전체 레이어 (fill만 그린다)
  selectedId: { type: String, default: null },
  loadImage: { type: Function, required: true },  // row → Promise<HTMLImageElement>
  keysEnabled: { type: Boolean, default: true },  // 모달이 떠 있으면 false
})
const emit = defineEmits(['add', 'change', 'select', 'remove', 'method'])

const METHOD_OPTIONS = [{ key: 'coons', label: '자연스럽게' }, { key: 'solid', label: '단색' }]
const TOOL_BUTTONS = [
  { key: 'select', label: '선택', icon: MousePointer2, tip: '선택 (V) — 영역을 옮기거나 크기를 바꿔요' },
  { key: 'draw', label: '글자 지우기', icon: Eraser, tip: '글자 지우기 (E) — 중국어 위를 드래그하세요' },
]
const HINT_KEY = 'euchs-studio-fill-hint-dismissed'

const wrap = ref(null)
const host = ref(null)
const tool = ref('select')
const loadState = ref('idle') // idle | loading | ready | error
const loadError = ref('')
const computeError = ref('')
const zoomPct = ref(100)
const floatPos = ref(null)
const spaceHeld = ref(false)
const panning = ref(false)

const selectedLayer = computed(() => props.layers.find(l => l.id === props.selectedId && isValidFillLayer(l)) || null)
const wrapCursor = computed(() => (panning.value ? 'grabbing' : spaceHeld.value ? 'grab' : ''))
const fillCount = computed(() => props.layers.filter(isValidFillLayer).length)

// 안내 띠: 사진을 열었을 때 영역이 0개면 보인다. 영역을 만들면 사라지고, 닫으면(×) 다시 보이지 않는다
const hintDismissed = ref(readHintDismissed())
const hintForImage = ref(false)
const hintVisible = computed(() => loadState.value === 'ready' && hintForImage.value && !hintDismissed.value)
watch(fillCount, n => { if (n > 0) hintForImage.value = false })

function readHintDismissed() {
  try {
    return localStorage.getItem(HINT_KEY) === '1'
  } catch (e) {
    console.warn('[StudioCanvas] 안내 닫힘 여부를 읽지 못함 — 안내를 보여줌:', e)
    return false
  }
}
function dismissHint() {
  hintDismissed.value = true
  try {
    localStorage.setItem(HINT_KEY, '1')
  } catch (e) {
    console.warn('[StudioCanvas] 안내 닫힘 여부를 저장하지 못함 — 이번 화면에서만 닫힘:', e)
  }
}

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
let plan = new Map()             // layer id → { deps, key } (sync 때마다 새로)
let computeTimer = null
let draw = null                  // { s0, p0, preview }
let pan = null                   // { x, y }
let resizeObs = null

// ── 영역 사각형: 테두리를 화면 기준 px로 직접 그린다 (배율과 무관) ──
//   선택됨: 그린 네모 실선 2px + 실제 메우는 범위(pad만큼 넓힌 사각형) 옅은 점선 1px
//   계산 중·그리는 중: 점선/실선 2px, 마우스 올림: 옅은 실선, 그 밖: 테두리 없음 (결과만 보이게)
class RegionRect extends Rect {
  _render(ctx) {
    const c = this.canvas
    const z = c ? c.getZoom() : 1
    const selected = !!c && c.getActiveObject() === this
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
    if (selected && this.pad > 0 && W) {
      const a = expandRect({ x: this.left, y: this.top, w: sw, h: sh }, this.pad, W, H)
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
  r.pad = l.pad ?? 0
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
  canvas.requestRenderAll()
  updateFloat()
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

// ── 도구 ──
function setTool(t) {
  tool.value = t
  if (!canvas) return
  cancelDraw()
  canvas.skipTargetFind = t === 'draw'
  canvas.defaultCursor = t === 'draw' ? 'crosshair' : 'default' // 글자 지우기 = 십자 커서
  canvas.setCursor(canvas.defaultCursor) // 마우스를 움직이기 전에도 바로 바뀌게
  canvas.requestRenderAll()
}

function cancelDraw() {
  if (draw?.preview) canvas.remove(draw.preview)
  draw = null
}

function onMouseDown(opt) {
  if (tool.value !== 'draw' || loadState.value !== 'ready' || opt.e.button !== 0) return
  const s0 = { x: opt.viewportPoint.x, y: opt.viewportPoint.y }
  const p0 = screenToImage(s0, vpt)
  const preview = makeRegion({ id: '_draft', x: 0, y: 0, w: 1, h: 1 }, false)
  preview.visible = false
  canvas.add(preview)
  draw = { s0, p0, preview }
}

function onMouseMove(opt) {
  if (!draw) return
  const s1 = opt.viewportPoint
  if (isClick(draw.s0, s1)) { draw.preview.visible = false; canvas.requestRenderAll(); return }
  const r = rectFromDrag(draw.p0, screenToImage(s1, vpt), W, H)
  draw.preview.set({ left: r.x, top: r.y, width: r.w, height: r.h, visible: true })
  canvas.requestRenderAll()
}

function onMouseUp(opt) {
  if (draw) {
    const s1 = opt.viewportPoint
    const click = isClick(draw.s0, s1)
    const r = click ? null : rectFromDrag(draw.p0, screenToImage(s1, vpt), W, H)
    cancelDraw()
    canvas.requestRenderAll()
    if (r) emit('add', r) // 그리기 도구 유지 — 계속 그릴 수 있다
    return
  }
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
  updateFloat()
}
function onSelectionCleared() {
  if (props.selectedId !== null) emit('select', null)
  floatPos.value = null
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
  beginTransform(o)
  const c = clampRectPosition({ x: o.left, y: o.top, w: o.width * o.scaleX, h: o.height * o.scaleY }, W, H)
  o.set({ left: c.x, top: c.y })
  updateFloat()
}

function onScaling(opt) {
  const o = opt.target
  beginTransform(o)
  if (o.width * o.scaleX < MIN_RECT) o.set({ scaleX: MIN_RECT / o.width })
  if (o.height * o.scaleY < MIN_RECT) o.set({ scaleY: MIN_RECT / o.height })
  updateFloat()
}

function onModified(opt) {
  const o = opt.target
  if (!o?.layerId) return
  const r = normalizeRect({ x: o.left, y: o.top, w: o.width * o.scaleX, h: o.height * o.scaleY }, W, H)
  o.set({ left: r.x, top: r.y, width: r.w, height: r.h, scaleX: 1, scaleY: 1 })
  o.setCoords()
  transforming.delete(o.layerId)
  const cur = props.layers.find(l => l.id === o.layerId)
  if (cur && (cur.x !== r.x || cur.y !== r.y || cur.w !== r.w || cur.h !== r.h)) emit('change', o.layerId, r)
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

function updateFloat() {
  const o = canvas?.getActiveObject()
  if (!o?.layerId || loadState.value !== 'ready') { floatPos.value = null; return }
  const s = rectToScreen({ x: o.left, y: o.top, w: o.width * o.scaleX, h: o.height * o.scaleY }, vpt)
  const { cw } = viewSize()
  const barW = 220, barH = 40
  let top = s.y - barH - 10
  if (top < 8) top = s.y + s.h + 10
  const left = Math.max(8, Math.min(cw - barW - 8, s.x + s.w / 2 - barW / 2))
  const next = { left: Math.round(left), top: Math.round(top) }
  if (!floatPos.value || floatPos.value.left !== next.left || floatPos.value.top !== next.top) floatPos.value = next
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
  const fills = props.layers.filter(isValidFillLayer)
  const alive = new Set(fills.map(l => l.id))
  for (const [id, r] of regions) if (!alive.has(id)) { canvas.remove(r); regions.delete(id) }
  for (const [id, p] of patches) if (!alive.has(id)) { canvas.remove(p); patches.delete(id) }

  // 계산 계획: 그린 순서 + 연결된 앞 레이어 (키에 앞 레이어 값이 들어가 앞이 바뀌면 뒤도 다시 계산)
  plan = new Map(fillPlan(fills, W, H).map(p => [p.id, p]))
  const cache = currentPatchCache()
  for (const l of fills) {
    let r = regions.get(l.id)
    if (!r) {
      r = makeRegion(l)
      regions.set(l.id, r)
      canvas.add(r)
    } else if (!transforming.has(l.id)) {
      r.set({ left: l.x, top: l.y, width: l.w, height: l.h, scaleX: 1, scaleY: 1 })
      r.setCoords()
    }
    r.pad = l.pad
    if (transforming.has(l.id)) continue
    const key = plan.get(l.id).key
    const p = patches.get(l.id)
    if (p && p.patchKey === key) { p.visible = true; r.busy = false; continue }
    const hit = cache.get(key)
    if (hit) { placePatch(l, key, hit); r.busy = false; continue }
    // 자기 값이 바뀌었으면 옛 결과를 숨기고, 앞 레이어만 바뀌었으면 새 결과가 나올 때까지 옛 결과를 둔다 (깜빡임 방지)
    if (p) p.visible = p.ownKey === ownKey(l)
    r.busy = true
  }
  restack(fills)
  // 선택 상태 맞추기
  const want = props.selectedId ? regions.get(props.selectedId) : null
  const active = canvas.getActiveObject()
  if (want && active !== want) canvas.setActiveObject(want)
  else if (!want && active) canvas.discardActiveObject()
  canvas.requestRenderAll()
  updateFloat()
  scheduleCompute()
}

function placePatch(l, key, res) {
  const id = l.id
  let p = patches.get(id)
  if (!p) {
    p = new FabricImage(res.canvas, {
      left: res.area.x, top: res.area.y, originX: 'left', originY: 'top',
      selectable: false, evented: false, objectCaching: false,
    })
    patches.set(id, p)
    canvas.add(p)
  } else {
    p.setElement(res.canvas)
    p.set({ left: res.area.x, top: res.area.y, scaleX: 1, scaleY: 1 })
  }
  p.patchKey = key
  p.ownKey = ownKey(l)
  p.res = res // 뒤 레이어 계산 때 덮어쓸 픽셀
  p.visible = true
}

/** 지금 계산할 수 있는 다음 레이어 — 배열 순서로, 앞 연결 레이어가 모두 최신인 것 */
function nextPending() {
  const fresh = id => { const p = patches.get(id); return !!p && p.patchKey === plan.get(id)?.key }
  for (const l of props.layers) {
    if (!isValidFillLayer(l)) continue
    const e = plan.get(l.id)
    if (!e || transforming.has(l.id) || fresh(l.id) || failedKeys.has(e.key)) continue
    if (e.deps.some(d => transforming.has(d) || !fresh(d))) continue
    return { l, e }
  }
  return null
}

// 순서: 원본 → 결과 조각(레이어 순) → 영역 테두리(레이어 순) → 그리기 미리보기
function restack(fills) {
  const order = [baseObj]
  for (const l of fills) { const p = patches.get(l.id); if (p) order.push(p) }
  for (const l of fills) { const r = regions.get(l.id); if (r) order.push(r) }
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
  const { l, e } = next
  const r = regions.get(l.id)
  let res
  try {
    // 연결된 앞 레이어 결과를 덮어쓴 뒤 계산 (studioFillPlan 규칙)
    res = computeFillPatch(imgEl, l, e.deps.map(d => patches.get(d).res))
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
    currentPatchCache().set(e.key, res)
    placePatch(l, e.key, res)
    if (r) r.busy = false
    restack(props.layers.filter(isValidFillLayer))
  } else {
    failedKeys.add(e.key) // 같은 값으로는 다시 시도하지 않는다 (영역을 바꾸면 새 키로 다시 계산)
  }
  canvas.requestRenderAll()
  scheduleCompute()
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
  floatPos.value = null
  computeError.value = ''
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
    if (row.width && row.height && (row.width !== W || row.height !== H)) {
      console.warn('[StudioCanvas] DB 크기와 실제 크기가 다름 — 실제 픽셀 기준으로 편집:', row.id, row.width, row.height, W, H)
    }
    baseObj = new FabricImage(el, {
      left: 0, top: 0, originX: 'left', originY: 'top',
      selectable: false, evented: false, objectCaching: false,
    })
    canvas.add(baseObj)
    hintForImage.value = fillCount.value === 0
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
  if (!props.keysEnabled || isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.code === 'Space') {
    e.preventDefault()
    spaceHeld.value = true
    return
  }
  const k = e.key.toLowerCase()
  if (k === 'v') { setTool('select'); e.preventDefault() }
  else if (k === 'e') { setTool('draw'); e.preventDefault() }
  else if (e.key === 'Escape') {
    cancelDraw()
    canvas?.discardActiveObject()
    canvas?.requestRenderAll()
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && props.selectedId) {
    e.preventDefault()
    emit('remove', props.selectedId)
  }
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

  const w = wrap.value
  w.addEventListener('wheel', onWheel, { passive: false })
  w.addEventListener('pointerdown', onPanDown, true)
  w.addEventListener('pointermove', onPanMove)
  w.addEventListener('pointerup', onPanUp)
  w.addEventListener('pointercancel', onPanUp)
  w.addEventListener('mousedown', onMiddleMouseDown, true)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  resizeObs = new ResizeObserver(() => {
    const s = viewSize()
    if (!canvas || !s.cw || !s.ch) return
    canvas.setDimensions({ width: s.cw, height: s.ch })
    if (W) applyVpt(vpt)
    updateFloat()
  })
  resizeObs.observe(w)
  showImage()
})

onBeforeUnmount(() => {
  showSeq++
  resizeObs?.disconnect()
  const w = wrap.value
  w?.removeEventListener('wheel', onWheel)
  w?.removeEventListener('pointerdown', onPanDown, true)
  w?.removeEventListener('pointermove', onPanMove)
  w?.removeEventListener('pointerup', onPanUp)
  w?.removeEventListener('pointercancel', onPanUp)
  w?.removeEventListener('mousedown', onMiddleMouseDown, true)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
  clearTimeout(computeTimer)
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

// 편집기가 좌표 검증(브라우저 자동화)에 쓸 수 있도록 현재 뷰포트를 읽는 창구만 연다
defineExpose({ getViewport: () => [...vpt], getImageSize: () => ({ W, H }) })
</script>

<style scoped>
/* 스페이스 이동 중 커서 — Fabric이 캔버스 요소에 인라인으로 커서를 쓰므로 !important로 덮는다 */
.is-grab :deep(canvas) { cursor: grab !important; }
.is-grabbing :deep(canvas) { cursor: grabbing !important; }
/* 위쪽 도구 막대 — 흰 바탕, 둥글기 10, 옅은 그림자, 높이 44 (색은 토큰만) */
.st-toolbar {
  display: flex; align-items: center; gap: 2px; height: 44px; padding: 4px;
  background: var(--st-surface); border-radius: var(--st-radius-md); box-shadow: var(--st-shadow-float);
}
.st-tool {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 12px; border-radius: var(--st-radius-sm); border: 0; cursor: pointer; white-space: nowrap;
  font-size: 13px; font-weight: 700; color: var(--st-ink-2); background: transparent;
}
.st-tool:hover:not(.is-active) { background: var(--st-soft); }
.st-tool.is-active { background: var(--st-accent); color: var(--st-on-accent); }
.st-tip {
  display: none; position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%);
  padding: 6px 10px; border-radius: var(--st-radius-sm); background: var(--st-ink); color: var(--st-surface);
  font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none; z-index: 10;
}
.st-tool:hover .st-tip, .st-tool:focus-visible .st-tip { display: block; }
/* 안내 띠 — 강조색 옅은 바탕 */
.st-hint {
  display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 12px;
  border-radius: var(--st-radius-md);
  /* 옅은 강조색이 캔버스 위에서도 비치지 않게 흰 바탕 위에 겹친다 */
  background: linear-gradient(var(--st-accent-soft), var(--st-accent-soft)), var(--st-surface);
  box-shadow: var(--st-shadow-float);
  font-size: 13px; color: var(--st-accent);
}
.st-hint b { font-weight: 800; }
.st-hint-close {
  display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px;
  border-radius: 6px; border: 0; background: transparent; color: var(--st-accent); cursor: pointer;
}
.st-hint-close:hover { background: var(--st-accent-soft); }
/* 떠 있는 도구줄 — 검정 바탕, 둥글기 10 (색은 토큰만) */
.st-float-bar { background: var(--st-ink); border-radius: var(--st-radius-md); box-shadow: var(--st-shadow-float); z-index: 5; }
.st-float-item {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  height: 32px; min-width: 32px; padding: 0 10px; border-radius: var(--st-radius-sm);
  font-size: 13px; font-weight: 700; color: var(--st-surface); opacity: 0.72; background: transparent; border: 0; cursor: pointer; white-space: nowrap;
}
.st-float-item:hover { opacity: 1; }
.st-float-item.is-active { opacity: 1; background: color-mix(in srgb, var(--st-surface) 18%, transparent); }
.st-float-sep { width: 1px; height: 20px; background: color-mix(in srgb, var(--st-surface) 25%, transparent); }
</style>
