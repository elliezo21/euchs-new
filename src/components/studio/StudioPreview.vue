<template>
  <!-- 미리보기 (13-2) — 전체 화면. 그림은 13-1 내보내기 엔진 결과 그대로(= 받게 될 이미지). [내보내기] 창(z 50)은 이 위에 뜬다 -->
  <Teleport to="body">
    <div v-if="open" class="studio-root st-dark fixed inset-0 flex flex-col st-bg" style="z-index: 45" role="dialog" aria-modal="true" aria-label="미리보기" data-preview>
      <div class="h-14 shrink-0 px-4 flex items-center gap-3 st-topbar st-border-b">
        <Eye class="w-5 h-5 st-ink-2" :stroke-width="2" />
        <span class="text-[14px] font-extrabold st-ink">미리보기</span>
        <span class="text-[12px] st-muted break-keep">받게 될 이미지 그대로 보여 드려요</span>
        <div class="mx-auto flex items-center gap-1 p-1 rounded-[10px] st-card" data-preview-devices>
          <button
            v-for="d in DEVICES" :key="d.key" type="button" class="st-dev-btn" :class="device === d.key ? 'is-active' : ''"
            :aria-pressed="device === d.key" :data-preview-device="d.key" @click="setDevice(d.key)"
          >
            <component :is="d.key === 'pc' ? Monitor : Smartphone" class="w-4 h-4" :stroke-width="2" /> {{ d.label }}
          </button>
        </div>
        <button type="button" class="st-btn st-btn-primary" data-preview-export @click="$emit('export')"><Download class="w-4 h-4" :stroke-width="2" /> 이미지로 받기</button>
        <button type="button" class="st-btn" title="닫기 (Esc)" data-preview-close @click="$emit('close')"><X class="w-4 h-4" :stroke-width="2" /> 닫기</button>
      </div>

      <!-- 적용 중인 사진 (13-1과 같은 안내) · 그림 알림 -->
      <div v-if="pendingCount || noteLines.length" class="shrink-0 px-4 py-2 space-y-1 st-border-b st-surface" data-preview-notice>
        <p v-if="pendingCount" class="text-[12px] font-bold st-ai-soft break-keep" data-preview-pending>
          지운 결과를 사진에 적용하는 중인 사진이 {{ pendingCount }}장 있어요. 다 적용되면 그 구간을 다시 그려요.
        </p>
        <p v-for="(n, i) in noteLines" :key="i" class="text-[12px] st-ai-soft break-keep" data-preview-note>{{ n }}</p>
      </div>

      <div class="flex-1 min-h-0 flex justify-center" :class="device === 'mobile' ? 'items-center py-6' : ''">
        <!-- 모바일: 우리 식의 단순한 둥근 틀 안에서만 스크롤 -->
        <div :class="device === 'mobile' ? 'st-phone' : 'w-full h-full flex'" data-preview-frame>
          <div
            ref="scroller" class="overflow-y-auto" :class="device === 'mobile' ? 'st-phone-screen' : 'w-full h-full'"
            data-preview-scroll @scroll.passive="schedule"
          >
            <div
              class="relative mx-auto st-preview-paper" :class="device === 'pc' ? 'my-8' : ''"
              :style="{ width: `${deviceWidth}px`, height: `${layout.height}px` }" data-preview-page
            >
              <div
                v-for="r in layout.rows" :key="`${device}-${r.id}`" class="absolute left-0 w-full"
                :style="{ top: `${r.top}px`, height: `${r.height}px` }" :data-preview-section="r.id"
              >
                <img
                  v-if="resultOf(r.id)?.status === 'ready'" :src="resultOf(r.id).url" alt="" draggable="false"
                  class="block w-full h-full" data-preview-img
                />
                <div
                  v-else-if="resultOf(r.id)?.status === 'error'"
                  class="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center st-placeholder" data-preview-error
                >
                  <span class="text-[12px] font-bold st-danger-text break-keep">{{ labels[r.id] ?? '' }} 구간을 그리지 못했어요</span>
                  <span class="text-[11px] st-muted break-keep">{{ resultOf(r.id).error }}</span>
                  <button type="button" class="st-btn" :data-preview-retry="r.id" @click="retry(r.id)"><RefreshCw class="w-3.5 h-3.5" :stroke-width="2" /> 다시 시도</button>
                </div>
                <!-- 그리는 중 (review-1): 새로고침 직후처럼 사진을 받는 동안 빈 회색칸만 보이지 않게 글자로 알린다 -->
                <div v-else class="w-full h-full st-skeleton flex items-center justify-center" data-preview-loading>
                  <span class="text-[12px] font-bold st-muted" style="max-height: 100%">사진 불러오는 중…</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// 미리보기 (13-2): [PC](780px 그대로) / [모바일](360px로 줄여 둥근 틀 안에). 구간을 위에서 아래로 이어서(사이 = gap, 흰색 — 13-1 한 장과 같은 규칙).
// 그림 = render(file, { format: 'png', scale }) → 13-1 내보내기 엔진(renderSection) 결과 PNG. 숨긴 요소 없음·자리·모양이 받을 이미지와 같다.
// 화면에 보이는 구간부터 한 번에 하나씩 그린다(studioPreview.previewOrder — 멀리 있는 구간은 스크롤하면 그때). 그리는 중 = 흐린 자리표시, 실패 = 원인 + [다시 시도].
// 적용 중(완성 사진 만드는 중)인 사진은 위에 안내, 다 적용되면 그 구간을 다시 그린다. Esc·[닫기] = 편집기로. [이미지로 받기] = export (편집기가 [내보내기] 창을 연다)
import { ref, shallowReactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Eye, Monitor, Smartphone, Download, X, RefreshCw } from 'lucide-vue-next'
import { PREVIEW_DEVICES, previewDisplayScale, previewRenderScale, previewRows, previewOrder, summarizeNotes } from '@/lib/studioPreview'

const props = defineProps({
  open: { type: Boolean, default: false },
  page: { type: Object, required: true },
  labels: { type: Object, default: () => ({}) },           // 구간 id → "03 대표 사진"
  pendingBySection: { type: Object, default: () => ({}) }, // 구간 id → 적용 중인 사진 수
  render: { type: Function, required: true },              // (file, { format, scale }) → Promise<{ blob, notes }>
  keysBlocked: { type: Boolean, default: false },          // 위에 다른 창([내보내기])이 떠 있으면 Esc를 그 창에 맡긴다
})
const emit = defineEmits(['close', 'export'])

const DEVICES = [PREVIEW_DEVICES.pc, PREVIEW_DEVICES.mobile]
const device = ref('pc')
const scroller = ref(null)
const results = shallowReactive(new Map()) // `${배율}|${구간 id}` → { status: 'loading'|'ready'|'error', url, error, notes }
let running = false
let gen = 0 // 닫으면 올린다 — 그 전에 시작한 그리기 결과는 버린다
let frame = 0

const deviceWidth = computed(() => PREVIEW_DEVICES[device.value].width)
const displayScale = computed(() => previewDisplayScale(props.page.width, device.value))
const renderScale = computed(() => previewRenderScale(props.page.width, device.value, window.devicePixelRatio || 1))
const layout = computed(() => previewRows(props.page, displayScale.value))
const pendingCount = computed(() => Object.values(props.pendingBySection).reduce((n, v) => n + v, 0))
const notes = computed(() => {
  const out = []
  for (const [k, r] of results) if (k.startsWith(`${renderScale.value}|`) && r.notes?.length) out.push(...r.notes)
  return out
})
// 같은 알림은 한 줄로 (review-1 — 사진마다 줄줄이 뜨지 않게)
const noteLines = computed(() => summarizeNotes(notes.value, props.labels))

const keyOf = id => `${renderScale.value}|${id}`
function resultOf(id) { return results.get(keyOf(id)) || null }
function drop(id) {
  for (const [k, r] of [...results]) {
    if (k.endsWith(`|${id}`)) { if (r.url) URL.revokeObjectURL(r.url); results.delete(k) }
  }
}
function clearAll() {
  gen++
  running = false
  for (const r of results.values()) if (r.url) URL.revokeObjectURL(r.url)
  results.clear()
}

/** 스크롤·열기·기기 바꾸기 뒤 — 다음 그림 프레임에 그릴 순서를 다시 정하고 그리기 */
function schedule() {
  if (frame) return
  frame = requestAnimationFrame(() => { frame = 0; pump() })
}
async function pump() {
  if (running || !props.open || !scroller.value) return
  const el = scroller.value
  const next = previewOrder(layout.value.rows, el.scrollTop, el.clientHeight).find(id => !resultOf(id))
  if (!next) return
  running = true
  const g = gen
  const key = keyOf(next)
  const scale = renderScale.value
  results.set(key, { status: 'loading', url: null, error: '', notes: [] })
  const no = props.page.sections.findIndex(s => s.id === next) + 1
  try {
    const out = await props.render({ no, sectionIds: [next] }, { format: 'png', scale })
    if (g !== gen) return
    results.set(key, { status: 'ready', url: URL.createObjectURL(out.blob), error: '', notes: out.notes })
  } catch (e) {
    if (g !== gen) return
    console.error('[StudioPreview] 구간 그리기 실패:', next, e)
    results.set(key, { status: 'error', url: null, error: e?.message || String(e), notes: [] })
  } finally {
    if (g === gen) { running = false; schedule() }
  }
}
function retry(id) {
  const k = keyOf(id)
  const r = results.get(k)
  if (r?.url) URL.revokeObjectURL(r.url)
  results.delete(k)
  schedule()
}
function setDevice(key) {
  if (device.value === key) return
  device.value = key
  nextTick(() => { if (scroller.value) scroller.value.scrollTop = 0; schedule() })
}

// 열기·닫기 — 열면 PC부터, 닫으면 그림을 모두 버린다(메모리). 아래 onKey·schedule은 위에서 선언됨
watch(() => props.open, v => {
  if (v) {
    device.value = 'pc'
    nextTick(schedule)
    window.addEventListener('keydown', onKey, true)
  } else {
    window.removeEventListener('keydown', onKey, true)
    clearAll()
  }
})
// 적용이 끝난 구간은 다시 그린다 (완성 사진으로)
watch(() => props.pendingBySection, (now, before) => {
  if (!props.open || !before) return
  for (const id of Object.keys(before)) if (!now[id]) drop(id)
  schedule()
})
function onKey(e) {
  if (e.key !== 'Escape' || props.keysBlocked) return
  e.preventDefault()
  e.stopPropagation()
  emit('close')
}
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  if (frame) cancelAnimationFrame(frame)
  clearAll()
})
</script>

<style scoped>
.st-dev-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
  color: var(--st-ink-2); background: transparent; border: 0;
}
.st-dev-btn.is-active { background: var(--st-accent); color: var(--st-on-accent); }
/* 페이지 바탕 = 흰색 (구간 사이 간격도 흰색 — 13-1 한 장으로 길게와 같다) */
.st-preview-paper { background: #ffffff; box-shadow: var(--st-shadow-page); }
/* 모바일 틀: 단순한 둥근 네모 + 안쪽 화면 (특정 휴대폰 모양이 아님) */
.st-phone {
  padding: 14px 10px; border-radius: 34px; background: var(--st-bar); border: 1px solid var(--st-line-strong);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45); height: min(820px, 100%);
}
.st-phone-screen { width: 360px; height: 100%; border-radius: 20px; background: #ffffff; }
.st-ai-soft { color: var(--st-ai); }
</style>
