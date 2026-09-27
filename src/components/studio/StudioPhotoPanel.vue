<template>
  <div class="flex flex-col h-full" data-photo-panel>
    <div class="px-4 pt-4 pb-3 space-y-3 st-border-b">
      <div class="flex items-center">
        <span class="st-h-card">사진 <span class="st-muted font-bold">{{ images.length }}장</span></span>
        <button type="button" class="st-btn ml-auto" data-add-photo data-guide="photo-add" @click="$emit('add')"><ImagePlus class="w-4 h-4" :stroke-width="2" /> 내 사진 올리기</button>
      </div>
      <!-- 출처 탭 (7단계): 1688 사진 = 이 작업의 1688 상품에서 가져온 것(결정 6) / 내 사진 = 직접 올린 것. studio_images.kind로 나눈다 -->
      <div class="st-seg" role="tablist" aria-label="사진 출처">
        <button
          v-for="s in SOURCE_TABS" :key="s.key" type="button" role="tab" class="st-seg-item flex-1"
          :class="source === s.key ? 'is-active' : ''" :aria-selected="source === s.key" :data-source-tab="s.key"
          @click="pickSource(s.key)"
        >{{ s.label }} {{ counts[s.key] }}</button>
      </div>
      <!-- 사용 / 안 쓸 사진 (studio_images.included, 6-2). 안 쓸 사진은 지우지 않고 여기에 모인다. 개수는 지금 출처 탭 기준 -->
      <div class="flex gap-1.5">
        <button type="button" class="st-chip" :class="tab === 'used' ? 'is-active' : ''" data-tab-used @click="tab = 'used'">사용 {{ counts.used }}</button>
        <button type="button" class="st-chip" :class="tab === 'unused' ? 'is-active' : ''" data-tab-unused @click="tab = 'unused'">안 쓸 사진 {{ counts.unused }}</button>
      </div>
      <p v-if="orderError" class="text-[11px] font-bold st-danger-text break-keep">{{ orderError }}</p>
    </div>
    <p v-if="images.length && counts[source] === 0" class="px-4 py-6 st-desc break-keep text-center" data-source-empty>
      {{ source === SOURCE_MINE ? '직접 올린 사진이 없어요. [내 사진 올리기]로 올려 보세요.' : '1688에서 가져온 사진이 없어요.' }}
    </p>
    <p v-else-if="images.length && shownImages.length === 0" class="px-4 py-6 st-desc break-keep text-center" data-tab-empty>
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
                class="w-full h-full object-cover" :style="thumbUnderStyle(views[img.id])"
                @load="onThumbLoad(img.id, $event)" @error="onThumbError(img.id)"
              />
              <span v-else class="absolute inset-0 st-skeleton" data-thumb-loading />
            </template>
            <ImageIcon v-else class="w-4 h-4" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[12px] font-bold st-ink-2">{{ KIND_LABEL[img.kind] }}</div>
            <div v-if="img.kind === 'upload' && img.upload_name" class="text-[12px] st-muted truncate">{{ img.upload_name }}</div>
            <div v-if="img.ingest_status !== 'done'" class="text-[11px] font-bold break-keep" :class="img.ingest_status === 'failed' ? 'st-danger-text' : 'st-muted'">{{ statusText(img) }}</div>
            <!-- 사진 픽셀을 고친 것(완성 사진에 들어감) 한 줄: 지움 · 덮기(12-2) · 다시 지우기 — 자르기·띠는 아래 따로 -->
            <div v-else-if="pixelMarks(img.id).length" class="text-[11px] font-bold">
              <template v-for="(m, i) in pixelMarks(img.id)" :key="m.key">
                <span v-if="i > 0" class="st-muted"> · </span>
                <span :class="m.cls" :data-fill-count="m.key === 'done' ? '' : undefined" :data-cover-count="m.key === 'cover' ? '' : undefined" :data-redo-count="m.key === 'redo' ? '' : undefined">{{ m.text }}</span>
              </template>
            </div>
            <div v-else class="text-[11px] st-muted">원본</div>
            <!-- 자르기·띠 (12-1) -->
            <div v-if="img.ingest_status === 'done' && shapeMarkOf(img.id)" class="text-[11px] font-bold st-accent-text" data-shape-mark>{{ shapeMarkOf(img.id) }}</div>
            <!-- 지운 사진 굽기 (5단계) — 화면을 막지 않고 여기에만 알린다 -->
            <div v-if="bakeOf(img.id) && isBaking(bakeOf(img.id))" class="text-[11px] st-muted" data-bake-state="baking">적용 중…</div>
            <div v-else-if="bakeOf(img.id)?.status === 'failed'" class="text-[11px] break-keep" data-bake-state="failed">
              <span class="font-bold st-danger-text" :title="bakeOf(img.id).message">적용하지 못했어요</span>
              · <span role="button" tabindex="0" class="font-bold st-accent-text underline cursor-pointer" data-bake-retry
                @click.stop="$emit('retry-bake', img.id)" @keydown.enter.stop="$emit('retry-bake', img.id)">다시 시도</span>
              <span class="block st-muted">지운 내용은 저장돼 있어요</span>
            </div>
            <div v-else-if="bakeOf(img.id)?.status === 'blocked'" class="text-[11px] st-muted break-keep" data-bake-state="blocked">{{ bakeOf(img.id).message }}</div>
            <!-- 원클릭 검수 표시 (원클릭 1단계): 검수 필요(자동 처리 실패 — 사유는 마우스를 올리면) · 글자 많음 · 자동으로 다듬음 -->
            <div v-if="img.ingest_status === 'done' && autoMark(img.id)" class="mt-0.5 flex flex-wrap gap-1" :data-auto-mark="img.id">
              <span v-if="autoMark(img.id).review" class="st-badge st-badge-danger" :title="autoMark(img.id).reason" data-auto-review-badge>검수 필요</span>
              <span v-if="autoMark(img.id).textHeavy" class="st-badge st-badge-danger" title="글자가 많아 지워도 비어 보이기 쉬워요. 빼기나 다른 사진으로 바꾸기를 권해요" data-auto-heavy-badge>글자 많음</span>
              <span v-if="autoMark(img.id).canRevert" class="st-badge" data-auto-erased-badge>자동으로 다듬음</span>
            </div>
            <!-- 페이지에 있음/없음 (6-3) -->
            <div v-if="canInsert(img)" class="mt-0.5 text-[11px]" :class="isPlaced(img.id) ? 'st-ink-2' : 'st-muted'" :data-placed="isPlaced(img.id) ? '1' : '0'">
              {{ isPlaced(img.id) ? '페이지에 있음' : '페이지에 없음' }}
            </div>
            <!-- 줄 버튼: [지우기](7단계 — 더블클릭과 같음, 페이지에 없는·안 쓸 사진도) + [페이지에 넣기](6-3 — 지금 보이는 구간이 비었으면 거기, 아니면 그 아래 새 구간. 이미 있으면 한 번 더)
                 원클릭 표시가 있는 사진: [직접 고치기](= [지우기]와 같은 화면) · [원본으로](자동으로 지운 것만 빼기) · [빼기](페이지에서 빼기) — 모두 Ctrl+Z로 되돌림 -->
            <div v-if="img.ingest_status === 'done'" class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                role="button" tabindex="0" class="st-row-link" :data-erase-image="img.id"
                :title="autoMark(img.id) ? '이 사진을 지우기 화면에서 직접 고쳐요' : '이 사진의 지울 곳을 칠해서 지워요'"
                @click.stop="$emit('open-erase', img.id)" @keydown.enter.stop.prevent="$emit('open-erase', img.id)" @dblclick.stop
              ><Eraser class="w-3 h-3" :stroke-width="2.5" />{{ autoMark(img.id) ? '직접 고치기' : '지우기' }}</span>
              <span
                v-if="autoMark(img.id)?.canRevert" role="button" tabindex="0" class="st-row-link" :data-auto-revert-image="img.id" title="자동으로 지운 곳을 원래대로 돌려요"
                @click.stop="$emit('auto-revert', img.id)" @keydown.enter.stop.prevent="$emit('auto-revert', img.id)" @dblclick.stop
              ><Undo2 class="w-3 h-3" :stroke-width="2.5" />원본으로</span>
              <span
                v-if="autoMark(img.id) && isPlaced(img.id)" role="button" tabindex="0" class="st-row-link" :data-auto-remove-image="img.id" title="이 사진을 페이지에서 빼요 (목록에는 남아요)"
                @click.stop="$emit('auto-remove', img.id)" @keydown.enter.stop.prevent="$emit('auto-remove', img.id)" @dblclick.stop
              ><X class="w-3 h-3" :stroke-width="2.5" />빼기</span>
              <span
                v-if="canInsert(img)" role="button" tabindex="0" class="st-row-link" :data-insert-image="img.id"
                :title="isPlaced(img.id) ? '이 사진을 페이지에 한 번 더 넣어요' : '지금 보고 있는 자리에 이 사진을 넣어요 (끌어다 놓아도 돼요)'"
                @click.stop="$emit('insert', img.id)" @keydown.enter.stop.prevent="$emit('insert', img.id)" @dblclick.stop
              ><SquarePlus class="w-3 h-3" :stroke-width="2.5" />{{ isPlaced(img.id) ? '한 번 더 넣기' : '페이지에 넣기' }}</span>
            </div>
          </div>
        </button>
      </li>
    </ol>
    <p v-if="images.length === 0" class="px-4 pb-4 st-desc">아직 사진이 없어요. [내 사진 올리기]로 올려 보세요.</p>
  </div>
</template>

<script setup>
// [사진] 재료 패널 (3단계: 편집기 왼쪽에 있던 사진 목록을 옮김)
// 6-3: 줄마다 "페이지에 있음/없음" + [페이지에 넣기]·[한 번 더 넣기], 줄을 페이지로 끌어다 놓아도 넣어진다
// 7단계: 출처 탭 [1688 사진]/[내 사진], [내 사진 올리기](모달·StudioUploadPanel은 편집기 것 재사용), 줄마다 [지우기]
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { Image as ImageIcon, ImagePlus, RefreshCw, Archive, ArchiveRestore, SquarePlus, Eraser, Undo2, X } from 'lucide-vue-next'
import { KIND_LABEL } from '@/lib/studioProjects'
import { SOURCE_1688, SOURCE_MINE, defaultSource, filterImages, tabCounts, tabOf } from '@/lib/studioPhotoTabs'
import { DRAG_IMAGE_TYPE } from '@/lib/studioPage'
import { studioErrorMessage } from '@/lib/studioApi'
import { afterPaint } from '@/lib/studioImageCache'
import { thumbUnderStyle } from '@/lib/studioViewImage'

const props = defineProps({
  images: { type: Array, default: () => [] },
  views: { type: Object, default: () => ({}) },       // image id → { status: 'loading'|'ready'|'error', url } (studioViewImage — 페이지와 같은 작은 사진)
  selectedImageId: { type: String, default: null },
  fillCount: { type: Function, required: true },     // image id → { done: 결과 있는 지우기 수, redo: 결과 없이 남은 AI 수, cover: 덮기 수 }
  orderError: { type: String, default: '' },
  bakeState: { type: Object, default: () => ({}) },              // image id → { status, message } (useBakeQueue)
  placedIds: { type: Array, default: null },                      // 페이지에 놓인 사진 id (6-3, studioPage.pageImageIds). null = 페이지 없음(넣기 숨김)
  shapeMarkOf: { type: Function, default: () => '' },             // image id → "잘림 · 띠 2" (12-1, 없으면 '')
  autoMarkOf: { type: Function, default: () => null },            // image id → studioAutoBuild.reviewMark 결과 (원클릭 1단계, 없으면 null)
})
const autoMark = id => props.autoMarkOf(id)
// retry-image(id): 썸네일 다시 만들기 / visible(ids): 목록에서 지금 보이는 사진 (먼저 받게)
// shown({ id, ok }): 썸네일 <img>가 실제로 화면에 그려짐(ok) 또는 못 그림 — 편집기가 AI 엔진 켜는 시점을 정한다
// set-included(id, included): 안 쓸 사진으로 옮기기(false) / 다시 쓰기(true) — 저장·페이지 안내는 편집기가 한다
// insert(id): 페이지에 넣기 (6-3) — 어디에 넣을지는 편집기가 정한다(지금 보이는 구간). 끌어다 놓기는 페이지가 받는다(DRAG_IMAGE_TYPE)
// auto-revert(id)·auto-remove(id): 원클릭 검수 [원본으로]·[빼기] (원클릭 1단계 — 편집기가 사진 이력·페이지 이력으로 한다)
const emit = defineEmits(['select', 'open-erase', 'add', 'retry-image', 'retry-bake', 'visible', 'shown', 'set-included', 'insert', 'auto-revert', 'auto-remove'])

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

// 출처 탭 [1688 사진]/[내 사진] (7단계) × [사용]/[안 쓸 사진] (6-2, included = false면 안 쓸 사진) — 두 필터가 함께 걸린다 (studioPhotoTabs).
// 번호는 전체 목록 순서 그대로. 처음 탭 = 1688 사진이 있으면 [1688 사진], 없으면 [내 사진] (작업마다 기억하지 않음 — 편집기가 작업마다 이 패널을 새로 만든다)
const SOURCE_TABS = [{ key: SOURCE_1688, label: '1688 사진' }, { key: SOURCE_MINE, label: '내 사진' }]
const source = ref(defaultSource(props.images))
let sourceChosen = props.images.length > 0 // 사진이 오기 전에 열렸으면 사진이 처음 왔을 때 고른다
watch(() => props.images.length, n => {
  if (sourceChosen || n === 0) return
  source.value = defaultSource(props.images)
  sourceChosen = true
})
function pickSource(key) { source.value = key; sourceChosen = true }
const tab = ref('used')
const shownImages = computed(() => filterImages(props.images, source.value, tab.value))
const counts = computed(() => tabCounts(props.images, source.value))
/** 편집기가 부른다 — 그 탭으로 (내 사진을 올린 뒤 [내 사진]·[사용]) */
function showTab(nextSource, usage) {
  pickSource(nextSource)
  tab.value = usage
}
defineExpose({ showTab })
/** 사진 픽셀을 고친 표시 — 지움 N · 덮기 N(12-2) · 다시 지우기 N (없는 것은 뺀다) */
function pixelMarks(id) {
  const c = props.fillCount(id)
  const out = []
  if (c.done > 0) out.push({ key: 'done', text: `지움 ${c.done}`, cls: 'st-accent-text' })
  if (c.cover > 0) out.push({ key: 'cover', text: `덮기 ${c.cover}`, cls: 'st-accent-text' })
  if (c.redo > 0) out.push({ key: 'redo', text: `다시 지우기 ${c.redo}`, cls: 'st-ink-2' })
  return out
}
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

// 고른 사진(페이지에서 고름·↑↓)이 지금 탭에 없으면 그 사진의 탭으로 바꿔 목록에서 보이게 한다 (7단계)
watch(() => props.selectedImageId, id => {
  if (!id) return
  const img = props.images.find(i => i.id === id)
  const t = img ? tabOf(img) : null
  if (t && (t.source !== source.value || t.usage !== tab.value)) showTab(t.source, t.usage)
  nextTick(() => listEl.value?.querySelector(`[data-image-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }))
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
/* 줄 안의 작은 글자 버튼 — [지우기](7단계)·[페이지에 넣기](6-3) */
.st-row-link {
  display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 6px; cursor: pointer; font-weight: 700;
  color: var(--st-accent); border: 1px solid var(--st-line-strong); background: var(--st-card);
}
.st-row-link:hover, .st-row-link:focus-visible { border-color: var(--st-accent); }
li[draggable="true"] { cursor: grab; }
</style>
