<!-- 임시 검증용 (AI 지우기 엔진 1-6b-3a). 메뉴 없음 — /studio/ai-lab 주소로만 진입, 관리자 전용.
     시험 파일(원본·랩 기준 결과·cases.json)은 저장소에 없다. 시험할 때만 public/_ai-lab/에 복사해 쓴다. -->
<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h2 class="text-lg font-black text-slate-900">AI 지우기 엔진 시험 <span class="text-xs font-bold text-amber-600 align-middle">임시 · 관리자</span></h2>
      <p class="text-sm text-slate-500">
        실측 랩 10장을 같은 네모(pad=0)로 지우고, 랩 기준 결과(A_webgpu)와 메우는 범위 안 픽셀을 비교합니다.
        차이 = RGB 평균 절대차, 16↑ = 세 채널 중 최대 차이가 16 이상인 픽셀 비율.
      </p>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold disabled:opacity-40" :disabled="busy" data-testid="run-webgpu" @click="runAll('webgpu')">WebGPU로 실행</button>
        <button type="button" class="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold disabled:opacity-40" :disabled="busy" data-testid="run-wasm" @click="runAll('wasm')">WASM으로 실행(강제)</button>
        <button type="button" class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-bold disabled:opacity-40" :disabled="busy" data-testid="clear-cache" @click="clearCache">모델 캐시 지우기</button>
      </div>
      <dl class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
        <dt class="text-slate-500">crossOriginIsolated</dt><dd class="font-mono" data-testid="coi">{{ coi }}</dd>
        <dt class="text-slate-500">요청 / 실제 장치</dt><dd class="font-mono" data-testid="engine">{{ prefer || '-' }} / {{ info?.engine || '-' }}</dd>
        <dt class="text-slate-500">WASM 스레드</dt><dd class="font-mono">{{ info?.threads ?? '-' }}</dd>
        <dt class="text-slate-500">상태</dt><dd class="font-mono" data-testid="status">{{ status }}</dd>
        <dt class="text-slate-500">모델 준비</dt>
        <dd class="font-mono" data-testid="model">{{ info ? `${info.modelSource === 'cache' ? '캐시에서' : '첫 받기'} ${(info.modelMs / 1000).toFixed(2)}s` : '-' }}</dd>
        <dt class="text-slate-500">세션 만들기</dt><dd class="font-mono">{{ info ? (info.sessionMs / 1000).toFixed(2) + 's' : '-' }}</dd>
        <dt class="text-slate-500">진행</dt><dd class="font-mono col-span-3">{{ progressText }}</dd>
      </dl>
      <p v-if="info?.webgpuError" class="text-sm font-bold text-amber-700">WebGPU 실패 → WASM: {{ info.webgpuError }}</p>
      <p v-if="info?.cacheNote" class="text-sm font-bold text-amber-700">캐시: {{ info.cacheNote }}</p>
      <p v-if="errorMsg" class="text-sm font-bold text-red-600" data-testid="error">{{ errorMsg }}</p>
    </div>

    <div v-if="rows.length" class="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
      <table class="text-sm w-full" data-testid="table">
        <thead>
          <tr class="text-left text-slate-500">
            <th class="py-1 pr-4">이미지</th><th class="pr-4">조각</th><th class="pr-4">추론(s)</th><th class="pr-4">전체(s)</th>
            <th class="pr-4">평균 절대차</th><th class="pr-4">16↑ 비율</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-t border-slate-100 font-mono">
            <td class="py-1 pr-4">{{ r.id }}</td>
            <td class="pr-4">{{ r.cropSize }}</td>
            <td class="pr-4">{{ r.infer ?? '-' }}</td>
            <td class="pr-4">{{ r.total ?? '-' }}</td>
            <td class="pr-4">{{ r.mad ?? '-' }}</td>
            <td class="pr-4">{{ r.over16 ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-for="r in rows" :key="'img-' + r.id" class="bg-white rounded-2xl border border-slate-200 p-4" :data-case="r.id">
      <div class="text-sm font-bold text-slate-700 mb-2">{{ r.id }} <span class="font-normal text-slate-400">— 잘라낸 범위만 표시 (원본 / 랩 기준 / 새 결과)</span></div>
      <p v-if="r.error" class="text-sm font-bold text-red-600">{{ r.error }}</p>
      <div class="grid grid-cols-3 gap-2">
        <img v-for="k in ['src', 'ref', 'out']" :key="k" :src="r.urls[k]" class="w-full bg-slate-100 rounded" alt="" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { createAiEngine } from '../../lib/studioAi/aiEngine'
import { aiPlan } from '../../lib/studioAi/aiGeometry'
import { clearModelCache } from '../../lib/studioAi/modelCache'

const LAB = '/_ai-lab/'
const coi = typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false
const busy = ref(false)
const status = ref('idle')
const prefer = ref(null)
const info = ref(null)
const progress = ref(null)
const errorMsg = ref('')
const rows = ref([])
let engine = null
let objectUrls = []

const progressText = computed(() => {
  const p = progress.value
  if (!p) return '-'
  if (p.phase === 'download') return `받는 중 ${(p.loaded / 2 ** 20).toFixed(1)} / ${(p.total / 2 ** 20).toFixed(1)}MB (${Math.floor((p.loaded / p.total) * 100)}%)`
  return p.phase
})

const loadImg = src => new Promise((resolve, reject) => {
  const i = new Image()
  i.onload = () => resolve(i)
  i.onerror = () => reject(new Error(`이미지 불러오기 실패: ${src}`))
  i.src = src
})

function imageData(img) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth; c.height = img.naturalHeight
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  return g.getImageData(0, 0, c.width, c.height)
}

function cropOf(full, r) {
  const out = new ImageData(r.w, r.h)
  for (let y = 0; y < r.h; y++) {
    const so = ((r.y + y) * full.width + r.x) * 4
    out.data.set(full.data.subarray(so, so + r.w * 4), y * r.w * 4)
  }
  return out
}

async function toUrl(imgData) {
  const c = new OffscreenCanvas(imgData.width, imgData.height)
  c.getContext('2d').putImageData(imgData, 0, 0)
  const u = URL.createObjectURL(await c.convertToBlob({ type: 'image/png' }))
  objectUrls.push(u)
  return u
}

/** 메우는 범위(합친 마스크) 안 픽셀만 비교 */
function compare(a, b, areas, W) {
  const seen = new Uint8Array(a.width * a.height)
  let sum = 0, n = 0, over = 0
  for (const r of areas) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const p = y * W + x
        if (seen[p]) continue
        seen[p] = 1
        const i = p * 4
        const d0 = Math.abs(a.data[i] - b.data[i]), d1 = Math.abs(a.data[i + 1] - b.data[i + 1]), d2 = Math.abs(a.data[i + 2] - b.data[i + 2])
        sum += d0 + d1 + d2; n++
        if (Math.max(d0, d1, d2) >= 16) over++
      }
    }
  }
  return { mad: +(sum / (3 * n)).toFixed(2), over16: +((over / n) * 100).toFixed(2) + '%' }
}

async function runAll(want) {
  busy.value = true
  errorMsg.value = ''
  rows.value = []
  objectUrls.forEach(u => URL.revokeObjectURL(u)); objectUrls = []
  engine?.dispose()
  prefer.value = want
  info.value = null
  engine = createAiEngine({ prefer: want, onStatus: s => { status.value = s.status } })
  const result = { prefer: want, crossOriginIsolated: coi, items: {} }
  try {
    const casesRes = await fetch(LAB + 'cases.json', { cache: 'no-store' })
    if (!casesRes.ok) throw new Error(`시험 파일 없음: ${LAB}cases.json (HTTP ${casesRes.status}) — public/_ai-lab/에 복사 필요`)
    const { cases } = await casesRes.json()

    const ready = await engine.prepare(p => { progress.value = p })
    if (!ready) throw new Error(`엔진 준비 실패: ${engine.reason}`)
    info.value = ready
    result.info = ready

    for (const c of cases) {
      const row = { id: c.id, cropSize: '', urls: {}, error: '' }
      rows.value.push(row)
      const r = rows.value[rows.value.length - 1]
      try {
        const [srcImg, refImg] = await Promise.all([loadImg(`${LAB}src/${c.id}.jpg`), loadImg(`${LAB}ref/${c.id}.png`)])
        const W = srcImg.naturalWidth, H = srcImg.naturalHeight
        const full = imageData(srcImg), refFull = imageData(refImg)
        const plan = aiPlan(c.rects.map(([x, y, w, h]) => ({ x, y, w, h })), 0, W, H)
        r.cropSize = `${plan.crop.w}×${plan.crop.h}`
        const t = performance.now()
        const out = await engine.inpaint({ cropImageData: cropOf(full, plan.crop), crop: plan.crop, fillAreasInCrop: plan.fillAreasInCrop })
        const total = (performance.now() - t) / 1000
        // 전체 이미지에 결과 붙이기
        const res = new ImageData(new Uint8ClampedArray(full.data), W, H)
        const a = out.area
        for (let y = 0; y < a.h; y++) res.data.set(out.data.data.subarray(y * a.w * 4, (y + 1) * a.w * 4), ((a.y + y) * W + a.x) * 4)
        const cmp = compare(res, refFull, plan.fillAreas, W)
        Object.assign(r, { infer: +(out.ms.infer / 1000).toFixed(2), total: +total.toFixed(2), ...cmp })
        r.urls = { src: await toUrl(cropOf(full, plan.crop)), ref: await toUrl(cropOf(refFull, plan.crop)), out: await toUrl(cropOf(res, plan.crop)) }
        result.items[c.id] = { crop: [plan.crop.w, plan.crop.h], infer: r.infer, total: r.total, mad: r.mad, over16: r.over16 }
      } catch (e) {
        console.error('[studio-ai-lab] 케이스 실패:', c.id, e)
        r.error = e.message
        result.items[c.id] = { error: e.message }
      }
    }
  } catch (e) {
    console.error('[studio-ai-lab] 실행 실패:', e)
    errorMsg.value = e.message
    result.error = e.message
  } finally {
    busy.value = false
    window.__aiLab = result
  }
}

async function clearCache() {
  engine?.dispose()
  engine = null
  info.value = null
  const ok = await clearModelCache()
  errorMsg.value = ok ? '' : '지울 모델 캐시가 없습니다'
  status.value = 'idle'
}

onUnmounted(() => {
  engine?.dispose()
  objectUrls.forEach(u => URL.revokeObjectURL(u))
})
</script>
