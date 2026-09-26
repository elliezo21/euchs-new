<template>
  <div class="flex flex-col h-full" data-photo-panel>
    <div class="px-4 pt-4 pb-3 space-y-3 st-border-b">
      <div class="flex items-center">
        <span class="st-h-card">사진 <span class="st-muted font-bold">{{ images.length }}장</span></span>
        <button type="button" class="st-btn ml-auto" data-add-photo @click="$emit('add')"><ImagePlus class="w-4 h-4" :stroke-width="2" /> 사진 추가</button>
      </div>
      <!-- 사용 / 안 쓸 사진 (studio_images.included, 6-2). 안 쓸 사진은 지우지 않고 여기에 모인다 -->
      <div class="flex gap-1.5">
        <button type="button" class="st-chip" :class="tab === 'used' ? 'is-active' : ''" data-tab-used @click="tab = 'used'">사용 {{ usedCount }}</button>
        <button type="button" class="st-chip" :class="tab === 'unused' ? 'is-active' : ''" data-tab-unused @click="tab = 'unused'">안 쓸 사진 {{ unusedCount }}</button>
      </div>
      <p v-if="orderError" class="text-[11px] font-bold st-danger-text break-keep">{{ orderError }}</p>
    </div>
    <p v-if="images.length && shownImages.length === 0" class="px-4 py-6 st-desc break-keep text-center" data-tab-empty>
      {{ tab === 'unused' ? '안 쓸 사진이 없어요. 목록에서 사진 오른쪽 버튼으로 옮길 수 있어요.' : '쓰는 사진이 없어요. [안 쓸 사진]에서 다시 쓰기를 눌러 보세요.' }}
    </p>
    <ol ref="listEl" class="flex-1 overflow-y-auto p-2 space-y-0.5">
      <li
        v-for="img in shownImages" :key="img.id" class="relative group"
        :draggable="canInsert(img) ? 'true' : 'false'" :data-drag-image="canInsert(img) ? img.id : null"
        @dragstart="onDragStart($event, img)"
      >
        <!-- 안 쓸 사진으로 옮기기 / 다시 쓰기 (줄 오른쪽 위) -->
        <button
          v-if="img.ingest_status === 'done'" type="button" class="st-icon-btn st-include-btn"
          :title="img.included === false ? '다시 쓰기' : '안 쓸 사진으로 옮기기'" :data-include-toggle="img.id"
          @click.stop="$emit('set-included', img.id, img.included === false)"
        ><component :is="img.included === false ? ArchiveRestore : Archive" class="w-3.5 h-3.5" :stroke-width="2" /></button>
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
          <span class="w-5 text-right text-[11px] font-bold st-muted shrink-0">{{ images.indexOf(img) + 1 }}</span>
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
                class="w-full h-full object-cover" @load="onThumbLoad(img.id, $event)" @error="onThumbError(img.id)"
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
            <!-- 페이지에 있음/없음 + 페이지에 넣기 (6-3) — 지금 보이는 구간이 비었으면 거기, 아니면 그 아래 새 구간. 이미 있으면 한 번 더 -->
            <div v-if="canInsert(img)" class="mt-0.5 flex items-center gap-1.5 text-[11px]" :data-placed="isPlaced(img.id) ? '1' : '0'">
              <span :class="isPlaced(img.id) ? 'st-ink-2' : 'st-muted'">{{ isPlaced(img.id) ? '페이지에 있음' : '페이지에 없음' }}</span>
              <span
                role="button" tabindex="0" class="st-insert-link" :data-insert-image="img.id"
                :title="isPlaced(img.id) ? '이 사진을 페이지에 한 번 더 넣어요' : '지금 보고 있는 자리에 이 사진을 넣어요 (끌어다 놓아도 돼요)'"
                @click.stop="$emit('insert', img.id)" @keydown.enter.stop.prevent="$emit('insert', img.id)" @dblclick.stop
              ><SquarePlus class="w-3 h-3" :stroke-width="2.5" />{{ isPlaced(img.id) ? '한 번 더 넣기' : '페이지에 넣기' }}</span>
            </div>
          </div>
        </button>
      </li>
    </ol>
    <p v-if="images.length === 0" class="px-4 pb-4 st-desc">아직 사진이 없어요. "사진 추가"로 올려보세요.</p>
  </div>
</template>

<script setup>
// [사진] 재료 패널 (3단계: 편집기 왼쪽에 있던 사진 목록을 옮김. 업로드 버튼·탭은 7단계)
// 6-3: 줄마다 "페이지에 있음/없음" + [페이지에 넣기]·[한 번 더 넣기], 줄을 페이지로 끌어다 놓아도 넣어진다
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { Image as ImageIcon, ImagePlus, RefreshCw, Archive, ArchiveRestore, SquarePlus } from 'lucide-vue-next'
import { KIND_LABEL } from '@/lib/studioProjects'
import { DRAG_IMAGE_TYPE } from '@/lib/studioPage'
import { studioErrorMessage } from '@/lib/studioApi'
import { afterPaint } from '@/lib/studioImageCache'

const props = defineProps({
  images: { type: Array, default: () => [] },
  views: { type: Object, default: () => ({}) },       // image id → { status: 'loading'|'ready'|'error', url } (studioViewImage — 페이지와 같은 작은 사진)
  selectedImageId: { type: String, default: null },
  fillCount: { type: Function, required: true },     // image id → { done: 결과 있는 지우기 수, redo: 결과 없이 남은 AI 수 }
  orderError: { type: String, default: '' },
  bakeState: { type: Object, default: () => ({}) },              // image id → { status, message } (useBakeQueue)
  placedIds: { type: Array, default: null },                      // 페이지에 놓인 사진 id (6-3, studioPage.pageImageIds). null = 페이지 없음(넣기 숨김)
})
// retry-image(id): 썸네일 다시 만들기 / visible(ids): 목록에서 지금 보이는 사진 (먼저 받게)
// shown({ id, ok }): 썸네일 <img>가 실제로 화면에 그려짐(ok) 또는 못 그림 — 편집기가 AI 엔진 켜는 시점을 정한다
// set-included(id, included): 안 쓸 사진으로 옮기기(false) / 다시 쓰기(true) — 저장·페이지 안내는 편집기가 한다
// insert(id): 페이지에 넣기 (6-3) — 어디에 넣을지는 편집기가 정한다(지금 보이는 구간). 끌어다 놓기는 페이지가 받는다(DRAG_IMAGE_TYPE)
const emit = defineEmits(['select', 'open-erase', 'add', 'retry-image', 'retry-bake', 'visible', 'shown', 'set-included', 'insert'])

// ── 페이지에 넣기 (6-3) — 준비된(done) 사진만. 안 쓸 사진은 [다시 쓰기] 뒤에 넣는다 ──
const placedSet = computed(() => new Set(props.placedIds || []))
const isPlaced = id => placedSet.value.has(id)
const canInsert = img => props.placedIds !== null && img.ingest_status === 'done' && img.included !== false && !!img.width && !!img.height
function onDragStart(e, img) {
  if (!canInsert(img) || !e.dataTransfer) { e.preventDefault(); return }
  e.dataTransfer.setData(DRAG_IMAGE_TYPE, img.id)
  e.dataTransfer.effectAllowed = 'copy'
  const thumb = e.currentTarget.querySelector('[data-thumb-state] img')
  if (thumb) e.dataTransfer.setDragImage(thumb, 28, 28) // 끄는 동안 썸네일만 따라온다
}

// [사용] / [안 쓸 사진] 탭 (included = false면 안 쓸 사진). 번호는 전체 목록 순서 그대로
const tab = ref('used')
const shownImages = computed(() => props.images.filter(i => (tab.value === 'unused' ? i.included === false : i.included !== false)))
const usedCount = computed(() => props.images.filter(i => i.included !== false).length)
const unusedCount = computed(() => props.images.length - usedCount.value)
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
  emit('shown', { id, ok: false })
}
/** 불러오기 → 해독 → 다음 두 프레임(그려진 뒤)에 알린다 */
function onThumbLoad(id, e) {
  afterPaint(e.target).then(() => emit('shown', { id, ok: true }))
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
    const order = shownImages.value.map(i => i.id).filter(id => shown.has(id)) // 지금 탭에 보이는 줄만
    emit('visible', order)
  }, { root: listEl.value, rootMargin: '200px 0px' })
  observeRows()
  mo = new MutationObserver(observeRows) // 사진이 늘거나 순서가 바뀌면 새 줄도 본다
  mo.observe(listEl.value, { childList: true })
})
onBeforeUnmount(() => { io?.disconnect(); mo?.disconnect() })
</script>

<style scoped>
/* 줄 오른쪽 위 [안 쓸 사진으로]·[다시 쓰기] — 마우스를 올리거나 키보드로 갔을 때만 */
.st-include-btn { position: absolute; right: 6px; top: 6px; width: 26px; height: 26px; z-index: 1; opacity: 0; background: var(--st-card); }
.group:hover .st-include-btn, .st-include-btn:focus-visible { opacity: 1; }
/* 페이지에 넣기 (6-3) — 줄 안의 작은 글자 버튼 */
.st-insert-link {
  display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 6px; cursor: pointer; font-weight: 700;
  color: var(--st-accent); border: 1px solid var(--st-line-strong); background: var(--st-card);
}
.st-insert-link:hover, .st-insert-link:focus-visible { border-color: var(--st-accent); }
li[draggable="true"] { cursor: grab; }
</style>
