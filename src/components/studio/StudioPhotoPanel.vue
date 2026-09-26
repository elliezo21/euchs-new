<template>
  <div class="flex flex-col h-full" data-photo-panel>
    <div class="px-4 pt-4 pb-3 space-y-3 st-border-b">
      <div class="flex items-center">
        <span class="st-h-card">사진 <span class="st-muted font-bold">{{ images.length }}장</span></span>
        <button type="button" class="st-btn ml-auto" data-add-photo @click="$emit('add')"><ImagePlus class="w-4 h-4" :stroke-width="2" /> 사진 추가</button>
      </div>
      <!-- included(사용/빼둔 사진)는 7단계에서 연결 — 지금은 자리만 -->
      <div class="flex gap-1.5">
        <button type="button" class="st-chip is-active" disabled title="다음 단계에서 연결돼요">사용 –</button>
        <button type="button" class="st-chip" disabled title="다음 단계에서 연결돼요">안 쓸 사진 –</button>
      </div>
      <p v-if="orderError" class="text-[11px] font-bold st-danger-text break-keep">{{ orderError }}</p>
    </div>
    <ol ref="listEl" class="flex-1 overflow-y-auto p-2 space-y-0.5">
      <li v-for="(img, idx) in images" :key="img.id">
        <button
          type="button"
          class="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left"
          :class="[img.ingest_status !== 'done' ? 'opacity-50 cursor-default' : img.id === selectedImageId ? 'st-accent-soft-bg' : 'st-hover-soft']"
          :style="{ border: `2px solid ${img.id === selectedImageId ? 'var(--st-accent)' : 'transparent'}` }"
          :disabled="img.ingest_status !== 'done'"
          :data-image-id="img.id"
          @click="$emit('select', img.id)"
          @dblclick="$emit('open-erase', img.id)"
        >
          <span class="w-5 text-right text-[11px] font-bold st-muted shrink-0">{{ idx + 1 }}</span>
          <div class="w-14 h-14 rounded-[8px] overflow-hidden shrink-0 st-placeholder relative" :data-thumb-state="thumbState(img)">
            <!-- 썸네일 = 페이지용 작은 사진(지운 결과·적용된 사진 포함, 원본을 따로 받지 않는다). 받는 중이면 흐린 자리표시,
                 못 받았으면 숨기지 않고 [다시 시도]를 보인다 -->
            <template v-if="img.ingest_status === 'done' && img.original_path">
              <button
                v-if="thumbState(img) === 'error'" type="button"
                class="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold leading-tight st-danger-text text-center px-0.5 break-keep"
                title="사진을 불러오지 못했어요 · 다시 시도" data-thumb-retry
                @click.stop="retry(img.id)"
              ><RefreshCw class="w-3 h-3" :stroke-width="2.5" />다시 시도</button>
              <img
                v-else-if="thumbState(img) === 'ready'" :src="views[img.id].url" alt=""
                class="w-full h-full object-cover" @error="onThumbError(img.id)"
              />
              <span v-else class="absolute inset-0 st-skeleton" data-thumb-loading />
            </template>
            <ImageIcon v-else class="w-4 h-4" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[12px] font-bold st-ink-2">{{ KIND_LABEL[img.kind] }}</div>
            <div v-if="img.kind === 'upload' && img.upload_name" class="text-[12px] st-muted truncate">{{ img.upload_name }}</div>
            <div v-if="img.ingest_status !== 'done'" class="text-[11px] font-bold break-keep" :class="img.ingest_status === 'failed' ? 'st-danger-text' : 'st-muted'">{{ statusText(img) }}</div>
            <div v-else-if="fillCount(img.id).done > 0 || fillCount(img.id).redo > 0" class="text-[11px] font-bold">
              <span v-if="fillCount(img.id).done > 0" class="st-accent-text" data-fill-count>지움 {{ fillCount(img.id).done }}</span>
              <span v-if="fillCount(img.id).done > 0 && fillCount(img.id).redo > 0" class="st-muted"> · </span>
              <span v-if="fillCount(img.id).redo > 0" class="st-ink-2" data-redo-count>다시 지우기 {{ fillCount(img.id).redo }}</span>
            </div>
            <div v-else class="text-[11px] st-muted">원본</div>
            <!-- 지운 사진 굽기 (5단계) — 화면을 막지 않고 여기에만 알린다 -->
            <div v-if="bakeOf(img.id) && isBaking(bakeOf(img.id))" class="text-[11px] st-muted" data-bake-state="baking">적용 중…</div>
            <div v-else-if="bakeOf(img.id)?.status === 'failed'" class="text-[11px] break-keep" data-bake-state="failed">
              <span class="font-bold st-danger-text" :title="bakeOf(img.id).message">적용하지 못했어요</span>
              · <span role="button" tabindex="0" class="font-bold st-accent-text underline cursor-pointer" data-bake-retry
                @click.stop="$emit('retry-bake', img.id)" @keydown.enter.stop="$emit('retry-bake', img.id)">다시 시도</span>
              <span class="block st-muted">지운 내용은 저장돼 있어요</span>
            </div>
            <div v-else-if="bakeOf(img.id)?.status === 'blocked'" class="text-[11px] st-muted break-keep" data-bake-state="blocked">{{ bakeOf(img.id).message }}</div>
          </div>
        </button>
      </li>
    </ol>
    <p v-if="images.length === 0" class="px-4 pb-4 st-desc">아직 사진이 없어요. "사진 추가"로 올려보세요.</p>
  </div>
</template>

<script setup>
// [사진] 재료 패널 (3단계: 편집기 왼쪽에 있던 사진 목록을 옮김. 업로드 버튼·탭·끌어다 놓기는 7단계)
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { Image as ImageIcon, ImagePlus, RefreshCw } from 'lucide-vue-next'
import { KIND_LABEL } from '@/lib/studioProjects'
import { studioErrorMessage } from '@/lib/studioApi'

const props = defineProps({
  images: { type: Array, default: () => [] },
  views: { type: Object, default: () => ({}) },       // image id → { status: 'loading'|'ready'|'error', url } (studioViewImage — 페이지와 같은 작은 사진)
  selectedImageId: { type: String, default: null },
  fillCount: { type: Function, required: true },     // image id → { done: 결과 있는 지우기 수, redo: 결과 없이 남은 AI 수 }
  orderError: { type: String, default: '' },
  bakeState: { type: Object, default: () => ({}) },              // image id → { status, message } (useBakeQueue)
})
// retry-image(id): 썸네일 다시 만들기 / visible(ids): 목록에서 지금 보이는 사진 (먼저 받게)
const emit = defineEmits(['select', 'open-erase', 'add', 'retry-image', 'retry-bake', 'visible'])
const bakeOf = id => props.bakeState[id] || null
const isBaking = s => s.status === 'queued' || s.status === 'baking' || s.status === 'waiting'

const listEl = ref(null)
const failed = ref(new Set()) // <img>가 작은 사진을 못 그린 사진 id (드묾 — 메모리 주소라서)

/** 'ready' | 'loading' | 'error' — 만드는 중이어도 이전 결과가 있으면 그것을 보여준다 */
function thumbState(img) {
  if (failed.value.has(img.id)) return 'error'
  const v = props.views[img.id]
  if (v?.url) return 'ready'
  return v?.status === 'error' ? 'error' : 'loading'
}

function statusText(img) {
  if (img.ingest_status === 'done') return '완료'
  if (img.ingest_status === 'pending') return img.kind === 'upload' ? '올리는 중이거나 멈춤' : '가져오지 않음'
  const code = String(img.ingest_error || '')
  return img.kind === 'upload' ? `실패 · ${studioErrorMessage('upload', code)}` : `실패 · ${code || '원인 미기록'}`
}

function onThumbError(id) {
  console.error('[StudioPhotoPanel] 썸네일을 그리지 못함:', id, props.views[id]?.url)
  failed.value = new Set([...failed.value, id])
}
function retry(id) {
  const next = new Set(failed.value); next.delete(id); failed.value = next
  emit('retry-image', id) // 편집기가 작은 사진을 다시 만든다 (서명 URL이 오래됐으면 새로 받는다)
}

watch(() => props.selectedImageId, id => {
  if (id) nextTick(() => listEl.value?.querySelector(`[data-image-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }))
})

// 지금 보이는 줄 → 편집기에 알려 그 사진부터 받게 한다
const shown = new Set()
let io = null
let mo = null
function observeRows() {
  if (!io || !listEl.value) return
  for (const el of listEl.value.querySelectorAll('[data-image-id]')) io.observe(el) // 이미 보는 요소는 그대로
}
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !listEl.value) return
  io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const id = e.target.dataset.imageId
      if (e.isIntersecting) shown.add(id)
      else shown.delete(id)
    }
    const order = props.images.map(i => i.id).filter(id => shown.has(id))
    emit('visible', order)
  }, { root: listEl.value, rootMargin: '200px 0px' })
  observeRows()
  mo = new MutationObserver(observeRows) // 사진이 늘거나 순서가 바뀌면 새 줄도 본다
  mo.observe(listEl.value, { childList: true })
})
onBeforeUnmount(() => { io?.disconnect(); mo?.disconnect() })
</script>
