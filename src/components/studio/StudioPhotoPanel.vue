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
          <div class="w-14 h-14 rounded-[8px] overflow-hidden shrink-0 st-placeholder relative">
            <!-- 썸네일 주소는 서명 URL(10분). 못 받았거나 만료돼 실패하면 숨기지 않고 [다시 시도]를 보인다 -->
            <template v-if="img.ingest_status === 'done' && img.original_path">
              <button
                v-if="failed.has(img.original_path)" type="button"
                class="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold leading-tight st-danger-text text-center px-0.5 break-keep"
                title="사진을 불러오지 못했어요 · 다시 시도" data-thumb-retry
                @click.stop="retry(img.original_path)"
              ><RefreshCw class="w-3 h-3" :stroke-width="2.5" />다시 시도</button>
              <img
                v-else-if="viewUrls.get(img.original_path)" :src="viewUrls.get(img.original_path)" alt="" loading="lazy"
                class="w-full h-full object-cover" @error="onThumbError(img.original_path)"
              />
              <ImageIcon v-else class="w-4 h-4" :stroke-width="2" />
            </template>
            <ImageIcon v-else class="w-4 h-4" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[12px] font-bold st-ink-2">{{ KIND_LABEL[img.kind] }}</div>
            <div v-if="img.kind === 'upload' && img.upload_name" class="text-[12px] st-muted truncate">{{ img.upload_name }}</div>
            <div v-if="img.ingest_status !== 'done'" class="text-[11px] font-bold break-keep" :class="img.ingest_status === 'failed' ? 'st-danger-text' : 'st-muted'">{{ statusText(img) }}</div>
            <div v-else-if="fillCount(img.id) > 0" class="text-[11px] font-bold st-accent-text" data-fill-count>지움 {{ fillCount(img.id) }}</div>
            <div v-else class="text-[11px] st-muted">원본</div>
          </div>
        </button>
      </li>
    </ol>
    <p v-if="images.length === 0" class="px-4 pb-4 st-desc">아직 사진이 없어요. "사진 추가"로 올려보세요.</p>
  </div>
</template>

<script setup>
// [사진] 재료 패널 (3단계: 편집기 왼쪽에 있던 사진 목록을 옮김. 업로드 버튼·탭·끌어다 놓기는 7단계)
import { ref, nextTick, watch } from 'vue'
import { Image as ImageIcon, ImagePlus, RefreshCw } from 'lucide-vue-next'
import { KIND_LABEL } from '@/lib/studioProjects'
import { studioErrorMessage } from '@/lib/studioApi'

const props = defineProps({
  images: { type: Array, default: () => [] },
  viewUrls: { type: Map, default: () => new Map() }, // original_path → 서명 URL
  selectedImageId: { type: String, default: null },
  fillCount: { type: Function, required: true },     // image id → 지우기 레이어 수
  orderError: { type: String, default: '' },
})
const emit = defineEmits(['select', 'open-erase', 'add', 'retry-url'])

const listEl = ref(null)
const failed = ref(new Set())

function statusText(img) {
  if (img.ingest_status === 'done') return '완료'
  if (img.ingest_status === 'pending') return img.kind === 'upload' ? '올리는 중이거나 멈춤' : '가져오지 않음'
  const code = String(img.ingest_error || '')
  return img.kind === 'upload' ? `실패 · ${studioErrorMessage('upload', code)}` : `실패 · ${code || '원인 미기록'}`
}

function onThumbError(path) {
  console.error('[StudioPhotoPanel] 썸네일을 불러오지 못함 (서명 URL 만료·권한·네트워크):', path)
  failed.value = new Set([...failed.value, path])
}
function retry(path) {
  const next = new Set(failed.value); next.delete(path); failed.value = next
  emit('retry-url', path) // 편집기가 새 서명 URL을 받아 viewUrls를 바꾼다
}
// 새 서명 URL이 오면 실패 표시를 걷는다 (다시 실패하면 @error가 다시 표시)
watch(() => props.viewUrls, () => { if (failed.value.size) failed.value = new Set() })

watch(() => props.selectedImageId, id => {
  if (id) nextTick(() => listEl.value?.querySelector(`[data-image-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }))
})
</script>
