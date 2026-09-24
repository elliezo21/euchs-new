<!-- 임시 검증용. Phase 1-6 편집기 완성 후 삭제 예정 -->
<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 class="text-lg font-black text-slate-900">가리기 검증 랩 <span class="text-xs font-bold text-amber-600 align-middle">임시</span></h2>
      <p class="mt-1 text-sm text-slate-500">
        이미지를 고르고 중국어 영역을 마우스로 끌어 지정하면, 같은 영역을 A·B·C 세 방식으로 채운 결과를 나란히 비교합니다.
        AI·외부 호출 없이 브라우저 안에서만 계산합니다.
      </p>
      <p v-if="errorMsg" class="mt-2 text-sm font-bold text-red-600">{{ errorMsg }}</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
      <!-- ① 이미지 고르기 -->
      <aside class="bg-white rounded-2xl border border-slate-200 p-3 lg:max-h-[calc(100vh-180px)] overflow-y-auto">
        <div class="text-xs font-bold text-slate-500 mb-2">
          수집된 이미지 {{ images.length }}장
          <span v-if="listLoading" class="text-slate-400">· 불러오는 중</span>
        </div>
        <div class="grid grid-cols-3 lg:grid-cols-2 gap-2">
          <button
            v-for="img in images"
            :key="img.id"
            type="button"
            class="relative aspect-square rounded-lg overflow-hidden border-2 bg-slate-100"
            :class="selected?.id === img.id ? 'border-red-500' : 'border-transparent hover:border-slate-300'"
            :data-image-id="img.id"
            @click="selectImage(img)"
          >
            <img v-if="thumbUrls[img.id]" :src="thumbUrls[img.id]" loading="lazy" class="w-full h-full object-cover" alt="" />
            <span class="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] px-1 truncate">
              {{ img.kind === 'desc' ? '상세' : '갤러리' }} {{ img.sort_order + 1 }} · {{ img.width }}×{{ img.height }}
            </span>
          </button>
        </div>
      </aside>

      <section class="space-y-4 min-w-0">
        <div v-if="!selected" class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
          왼쪽에서 이미지를 고르세요.
        </div>

        <template v-else>
          <!-- 도구막대 -->
          <div class="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div class="flex items-center gap-1">
              <span class="text-xs font-bold text-slate-500 mr-1">보기</span>
              <button v-for="z in ZOOMS" :key="z.key" type="button" class="px-2 py-1 rounded-md border text-xs font-bold"
                :class="zoom === z.key ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'"
                @click="zoom = z.key">{{ z.label }}</button>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-xs font-bold text-slate-500 mr-1">큰 화면</span>
              <button v-for="m in VIEW_MODES" :key="m.key" type="button" class="px-2 py-1 rounded-md border text-xs font-bold"
                :class="viewMode === m.key ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'"
                @click="viewMode = m.key">{{ m.label }}</button>
            </div>
            <label class="flex items-center gap-1 text-xs font-bold text-slate-600">
              테두리 샘플
              <select v-model.number="opts.ring" class="border border-slate-200 rounded px-1 py-0.5">
                <option :value="1">1px</option>
                <option :value="2">2px</option>
              </select>
            </label>
            <label class="flex items-center gap-1 text-xs font-bold text-slate-600">
              <input v-model="opts.featherOn" type="checkbox" /> 가장자리 섞기
              <select v-model.number="opts.feather" :disabled="!opts.featherOn" class="border border-slate-200 rounded px-1 py-0.5">
                <option :value="1">1px</option>
                <option :value="2">2px</option>
                <option :value="3">3px</option>
              </select>
            </label>
            <label class="flex items-center gap-1 text-xs font-bold text-slate-600">
              C 복제 방향
              <select v-model="opts.axis" class="border border-slate-200 rounded px-1 py-0.5">
                <option value="auto">자동(넓으면 위·아래)</option>
                <option value="v">위·아래</option>
                <option value="h">좌·우</option>
              </select>
            </label>
            <span class="text-xs" :class="canvasClean ? 'text-emerald-600' : 'text-red-600'">
              {{ canvasClean ? '캔버스 정상(픽셀 읽기 가능)' : '캔버스 읽기 불가' }}
            </span>
          </div>

          <!-- ② 영역 지정 -->
          <div class="bg-white rounded-2xl border border-slate-200 p-3">
            <div class="flex flex-wrap items-center gap-2 mb-2 text-xs">
              <span class="font-bold text-slate-500">영역 {{ rects.length }}개</span>
              <button type="button" class="px-2 py-1 rounded-md border border-slate-200 font-bold text-slate-600 disabled:opacity-40"
                :disabled="rects.length === 0" @click="undoRect">마지막 영역 되돌리기</button>
              <button
                v-for="(r, idx) in rects" :key="r.id" type="button"
                class="px-2 py-1 rounded-md border font-bold"
                :class="r.id === selectedRectId ? 'border-red-500 text-red-600' : 'border-slate-200 text-slate-600'"
                @click="selectedRectId = r.id"
              >
                #{{ idx + 1 }} {{ r.w }}×{{ r.h }}
                <span class="ml-1 text-slate-400 hover:text-red-600" title="이 영역 지우기" @click.stop="removeRect(r.id)">✕</span>
              </button>
              <span class="text-slate-400">이미지 위를 끌어서 영역 추가 · 영역을 클릭하면 선택</span>
            </div>
            <div ref="mainWrap" class="overflow-auto max-h-[70vh] bg-slate-100 rounded-lg">
              <div class="relative" :style="{ width: displayW + 'px', height: displayH + 'px' }">
                <canvas ref="mainCanvas" class="absolute inset-0 w-full h-full" />
                <canvas
                  ref="overlayCanvas"
                  class="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  @pointerdown="onPointerDown"
                  @pointermove="onPointerMove"
                  @pointerup="onPointerUp"
                  @pointercancel="onPointerUp"
                />
              </div>
            </div>
          </div>

          <!-- ③ 세 방식 나란히 비교 -->
          <div class="bg-white rounded-2xl border border-slate-200 p-3">
            <div class="flex flex-wrap items-center gap-2 mb-2 text-xs">
              <span class="font-bold text-slate-700">확대 비교</span>
              <span class="text-slate-400">{{ selectedRect ? `선택 영역 #${selectedRectIndex + 1} 주변` : '영역을 지정하세요' }}</span>
              <span class="ml-3 font-bold text-slate-500">배율</span>
              <button v-for="z in CROP_ZOOMS" :key="z" type="button" class="px-2 py-1 rounded-md border font-bold"
                :class="cropZoom === z ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'"
                @click="cropZoom = z">{{ z * 100 }}%</button>
            </div>
            <div v-if="selectedRect" class="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div v-for="m in VIEW_MODES" :key="m.key" class="min-w-0">
                <div class="text-xs font-bold mb-1" :class="m.key === 'orig' ? 'text-slate-500' : 'text-slate-800'">
                  {{ m.label }}
                  <span v-if="fillFailures[m.key]" class="text-red-600">· 채우기 실패: {{ fillFailures[m.key] }}</span>
                </div>
                <div class="overflow-auto max-h-[420px] bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:16px_16px] rounded border border-slate-200">
                  <canvas :ref="el => { if (el) cropEls[m.key] = el }" class="block" style="image-rendering: pixelated" />
                </div>
              </div>
            </div>
          </div>

          <!-- ⑤ 글자 얹기 + ④ 내려받기 -->
          <div class="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-end gap-4 text-xs">
            <label class="flex flex-col gap-1 font-bold text-slate-600">
              선택 영역에 얹을 한글 한 줄
              <input
                v-model="selectedRectText" :disabled="!selectedRect" type="text" placeholder="예: 대용량 수납"
                class="w-56 border border-slate-200 rounded px-2 py-1 font-normal disabled:bg-slate-50"
              />
            </label>
            <label class="flex flex-col gap-1 font-bold text-slate-600">
              크기(px)
              <input v-model.number="textStyle.size" type="number" min="8" max="300" class="w-20 border border-slate-200 rounded px-2 py-1 font-normal" />
            </label>
            <label class="flex flex-col gap-1 font-bold text-slate-600">
              색
              <input v-model="textStyle.color" type="color" class="w-12 h-7 border border-slate-200 rounded" />
            </label>
            <label class="flex flex-col gap-1 font-bold text-slate-600">
              굵기
              <select v-model.number="textStyle.weight" class="border border-slate-200 rounded px-2 py-1 font-normal">
                <option :value="400">보통</option>
                <option :value="700">굵게</option>
                <option :value="900">아주 굵게</option>
              </select>
            </label>
            <div class="flex items-center gap-2 ml-auto">
              <span class="font-bold text-slate-500">PNG 내려받기</span>
              <button v-for="m in METHODS" :key="m.key" type="button"
                class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold disabled:opacity-40"
                :disabled="rects.length === 0 || !canvasClean" @click="download(m.key)">{{ m.label }}</button>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
// 임시 검증용. Phase 1-6 편집기 완성 후 삭제 예정
// 가리기(채우기) 알고리즘 3종(src/lib/studioFill.js)을 실제 1688 상세 이미지에 적용해 사람이 눈으로 판정하는 화면.
// 저장·프로젝트 관리·되돌리기 기록·단축키는 만들지 않는다(Phase 1-6). 결과는 PNG 내려받기만.
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { applyFill, clampRect } from '../../lib/studioFill'

const SIGNED_URL_TTL = 600 // 10분
const METHODS = [
  { key: 'solid', label: 'A. 단색' },
  { key: 'bilinear', label: 'B. 가장자리 보간' },
  { key: 'mirror', label: 'C. 주변 복제' },
]
const VIEW_MODES = [{ key: 'orig', label: '원본' }, ...METHODS]
const ZOOMS = [{ key: 'fit', label: '화면맞춤' }, { key: 1, label: '100%' }, { key: 2, label: '200%' }]
const CROP_ZOOMS = [1, 2, 4]
const FONT_FAMILY = 'Pretendard, "Noto Sans KR", sans-serif' // index.html에서 이미 로드

// ── 상태 ──
const images = ref([])
const thumbUrls = reactive({})
const listLoading = ref(false)
const errorMsg = ref('')
const selected = ref(null)
const canvasClean = ref(false)
const imgW = ref(0)
const imgH = ref(0)
const rects = ref([])            // { id, x, y, w, h, text }
const selectedRectId = ref(null)
const opts = reactive({ ring: 2, featherOn: false, feather: 2, axis: 'auto' })
const textStyle = reactive({ size: 40, color: '#222222', weight: 700 })
const viewMode = ref('orig')
const zoom = ref('fit')
const cropZoom = ref(2)
const fillFailures = reactive({})
const wrapWidth = ref(0)

const mainWrap = ref(null)
const mainCanvas = ref(null)
const overlayCanvas = ref(null)
const cropEls = {}

let baseData = null                 // 원본 ImageData
const sources = {}                  // 'orig' | method → HTMLCanvasElement (원본 해상도)
let rectSeq = 0
let loadSeq = 0
let renderSeq = 0
let drag = null                     // { x0, y0, x1, y1 } 이미지 좌표

const scale = computed(() => {
  if (zoom.value === 'fit') return imgW.value && wrapWidth.value ? Math.min(1, (wrapWidth.value - 2) / imgW.value) : 1
  return zoom.value
})
const displayW = computed(() => Math.round(imgW.value * scale.value))
const displayH = computed(() => Math.round(imgH.value * scale.value))
const selectedRectIndex = computed(() => rects.value.findIndex(r => r.id === selectedRectId.value))
const selectedRect = computed(() => rects.value[selectedRectIndex.value] || null)
const selectedRectText = computed({
  get: () => selectedRect.value?.text || '',
  set: v => { if (selectedRect.value) selectedRect.value.text = v },
})

// ── ① 목록 ──
async function loadImages() {
  listLoading.value = true
  errorMsg.value = ''
  try {
    // RLS: 본인 행(관리자는 전체)만 보인다
    const { data, error } = await supabase
      .from('studio_images')
      .select('id, project_id, kind, sort_order, original_path, width, height, mime')
      .eq('ingest_status', 'done')
      .not('original_path', 'is', null)
      .order('project_id')
      .order('kind')
      .order('sort_order')
    if (error) throw error
    images.value = data || []
    if (images.value.length === 0) return
    const { data: signed, error: sErr } = await supabase.storage
      .from('studio')
      .createSignedUrls(images.value.map(i => i.original_path), SIGNED_URL_TTL)
    if (sErr) throw sErr
    const byPath = new Map(images.value.map(i => [i.original_path, i.id]))
    for (const s of signed || []) {
      if (s.error || !s.signedUrl) { console.error('[studio-lab] 썸네일 서명 실패:', s.path, s.error); continue }
      thumbUrls[byPath.get(s.path)] = s.signedUrl
    }
  } catch (e) {
    console.error('[studio-lab] 이미지 목록 조회 실패:', e)
    errorMsg.value = `이미지 목록을 불러오지 못했습니다: ${e.message || e}`
  } finally {
    listLoading.value = false
  }
}

function resetEditor() {
  rects.value = []
  selectedRectId.value = null
  baseData = null
  for (const k of Object.keys(sources)) delete sources[k]
  for (const k of Object.keys(fillFailures)) delete fillFailures[k]
  canvasClean.value = false
  imgW.value = 0
  imgH.value = 0
  viewMode.value = 'orig'
}

async function selectImage(img) {
  const seq = ++loadSeq
  resetEditor()
  selected.value = img
  errorMsg.value = ''
  try {
    // 썸네일 URL이 만료됐을 수 있으므로 고를 때마다 새로 서명한다
    const { data, error } = await supabase.storage.from('studio').createSignedUrl(img.original_path, SIGNED_URL_TTL)
    if (error) throw error
    const el = new Image()
    el.crossOrigin = 'anonymous' // src보다 먼저. 없으면 캔버스가 오염돼 getImageData/toBlob이 막힌다
    el.src = data.signedUrl
    await el.decode()
    if (seq !== loadSeq) return

    const c = document.createElement('canvas')
    c.width = el.naturalWidth
    c.height = el.naturalHeight
    c.getContext('2d').drawImage(el, 0, 0)
    try {
      baseData = c.getContext('2d').getImageData(0, 0, c.width, c.height)
      canvasClean.value = true
    } catch (e) {
      console.error('[studio-lab] 캔버스 오염 — crossOrigin/CORS 확인 필요:', e)
      errorMsg.value = '캔버스가 오염되어 픽셀을 읽을 수 없습니다 (CORS).'
      return
    }
    sources.orig = c
    imgW.value = c.width
    imgH.value = c.height
    await nextTick()
    measureWrap()
    await renderAll()
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[studio-lab] 이미지 불러오기 실패:', e)
    errorMsg.value = `이미지를 불러오지 못했습니다: ${e.message || e}`
  }
}

// ── ③ 채우기 계산 ──
function fillOpts() {
  return { ring: opts.ring, feather: opts.featherOn ? opts.feather : 0, axis: opts.axis }
}

function fontString() {
  return `${textStyle.weight} ${textStyle.size}px ${FONT_FAMILY}`
}

function drawTexts(ctx) {
  ctx.save()
  ctx.font = fontString()
  ctx.fillStyle = textStyle.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const r of rects.value) {
    if (!r.text) continue
    ctx.fillText(r.text, r.x + r.w / 2, r.y + r.h / 2)
  }
  ctx.restore()
}

async function renderAll() {
  if (!baseData) return
  const seq = ++renderSeq
  const texts = rects.value.map(r => r.text).filter(Boolean).join('')
  if (texts) {
    try {
      await document.fonts.load(fontString(), texts)
    } catch (e) {
      console.warn('[studio-lab] 폰트 로드 실패 — 대체 글꼴로 그립니다:', e)
    }
  }
  if (seq !== renderSeq || !baseData) return
  const W = baseData.width, H = baseData.height
  for (const m of METHODS) {
    const out = new ImageData(new Uint8ClampedArray(baseData.data), W, H)
    const fails = []
    rects.value.forEach((r, idx) => {
      const res = applyFill(out, r, m.key, fillOpts())
      if (!res.ok) fails.push(`#${idx + 1} ${res.reason}`)
    })
    fillFailures[m.key] = fails.join(', ')
    let c = sources[m.key]
    if (!c) { c = document.createElement('canvas'); sources[m.key] = c }
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')
    ctx.putImageData(out, 0, 0)
    drawTexts(ctx)
  }
  drawMain()
  drawOverlay()
  drawCrops()
}

// ── 그리기 ──
function drawMain() {
  const c = mainCanvas.value
  const src = sources[viewMode.value]
  if (!c || !src) return
  c.width = imgW.value
  c.height = imgH.value
  c.getContext('2d').drawImage(src, 0, 0)
}

function drawOverlay() {
  const c = overlayCanvas.value
  if (!c) return
  c.width = imgW.value
  c.height = imgH.value
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  const lw = Math.max(1, 2 / scale.value)
  ctx.lineWidth = lw
  ctx.font = `bold ${Math.round(14 / scale.value)}px sans-serif`
  rects.value.forEach((r, idx) => {
    const sel = r.id === selectedRectId.value
    ctx.strokeStyle = sel ? '#ef4444' : '#3b82f6'
    ctx.setLineDash(sel ? [] : [6 / scale.value, 4 / scale.value])
    ctx.strokeRect(r.x - lw / 2, r.y - lw / 2, r.w + lw, r.h + lw)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fillText(`#${idx + 1}`, r.x, Math.max(12 / scale.value, r.y - 4 / scale.value))
  })
  if (drag) {
    ctx.setLineDash([])
    ctx.strokeStyle = '#f59e0b'
    const d = normRect(drag)
    ctx.strokeRect(d.x, d.y, d.w, d.h)
  }
}

function cropArea(r) {
  const margin = Math.max(24, Math.round(Math.max(r.w, r.h) * 0.4))
  return clampRect({ x: r.x - margin, y: r.y - margin, w: r.w + margin * 2, h: r.h + margin * 2 }, imgW.value, imgH.value)
}

function drawCrops() {
  const r = selectedRect.value
  if (!r) return
  const a = cropArea(r)
  if (!a) return
  for (const m of VIEW_MODES) {
    const c = cropEls[m.key]
    const src = sources[m.key]
    if (!c || !src) continue
    c.width = a.w * cropZoom.value
    c.height = a.h * cropZoom.value
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false // 확대했을 때 경계가 흐려져 가려지지 않게 픽셀 그대로
    ctx.drawImage(src, a.x, a.y, a.w, a.h, 0, 0, c.width, c.height)
  }
}

// ── ② 영역 지정 (마우스로 끌기) ──
function toImageXY(e) {
  const b = overlayCanvas.value.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(imgW.value, (e.clientX - b.left) * imgW.value / b.width)),
    y: Math.max(0, Math.min(imgH.value, (e.clientY - b.top) * imgH.value / b.height)),
  }
}

function normRect(d) {
  return {
    x: Math.round(Math.min(d.x0, d.x1)), y: Math.round(Math.min(d.y0, d.y1)),
    w: Math.round(Math.abs(d.x1 - d.x0)), h: Math.round(Math.abs(d.y1 - d.y0)),
  }
}

function onPointerDown(e) {
  if (!baseData) return
  overlayCanvas.value.setPointerCapture(e.pointerId)
  const p = toImageXY(e)
  drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
}

function onPointerMove(e) {
  if (!drag) return
  const p = toImageXY(e)
  drag.x1 = p.x
  drag.y1 = p.y
  drawOverlay()
}

function onPointerUp(e) {
  if (!drag) return
  const d = normRect(drag)
  drag = null
  if (d.w >= 3 && d.h >= 3) {
    const id = ++rectSeq
    rects.value.push({ id, ...d, text: '' })
    selectedRectId.value = id
  } else {
    // 거의 안 끌었으면 클릭 — 그 위치의 영역을 선택 (위에 그려진 것 우선)
    const p = toImageXY(e)
    const hit = [...rects.value].reverse().find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
    if (hit) selectedRectId.value = hit.id
    drawOverlay()
  }
}

function undoRect() {
  const last = rects.value.pop()
  if (last && last.id === selectedRectId.value) selectedRectId.value = rects.value.at(-1)?.id ?? null
}

function removeRect(id) {
  rects.value = rects.value.filter(r => r.id !== id)
  if (selectedRectId.value === id) selectedRectId.value = rects.value.at(-1)?.id ?? null
}

// ── ④ 내려받기 ──
function download(method) {
  const c = sources[method]
  if (!c) return
  c.toBlob(blob => {
    if (!blob) {
      console.error('[studio-lab] PNG 만들기 실패:', method)
      errorMsg.value = 'PNG를 만들지 못했습니다.'
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `studio-lab_${selected.value.id.slice(0, 8)}_${method}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, 'image/png')
}

// ── 반응 ──
let renderTimer = null
function scheduleRender() {
  clearTimeout(renderTimer)
  renderTimer = setTimeout(renderAll, 60)
}
watch(rects, scheduleRender, { deep: true })
watch(opts, scheduleRender, { deep: true })
watch(textStyle, scheduleRender, { deep: true })
watch(viewMode, drawMain)
watch(scale, () => nextTick(drawOverlay))
watch([selectedRectId, cropZoom], () => { drawOverlay(); nextTick(drawCrops) })

function measureWrap() {
  if (mainWrap.value) wrapWidth.value = mainWrap.value.clientWidth
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 이미지·서명 URL을 화면에서 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    renderSeq++
    resetEditor()
    selected.value = null
    images.value = []
    for (const k of Object.keys(thumbUrls)) delete thumbUrls[k]
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.addEventListener('resize', measureWrap)
  loadImages()
})

onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.removeEventListener('resize', measureWrap)
  clearTimeout(renderTimer)
})
</script>
