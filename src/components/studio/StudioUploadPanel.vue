<template>
  <div class="space-y-3">
    <!-- 드롭 영역 -->
    <div
      class="rounded-2xl border-2 border-dashed p-6 text-center transition"
      :class="dragOver ? 'border-brand-blue bg-blue-50' : 'border-slate-300 bg-white'"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <p class="text-sm font-bold text-slate-700">
        사진을 끌어다 놓거나 <b>폴더째</b> 놓으세요 · 프로젝트당 최대 {{ STUDIO_MAX_IMAGES }}장 · 장당 20MB · JPG·PNG·WebP
      </p>
      <p class="mt-1 text-xs text-slate-400">상품이 크게, 가운데에 나온 사진일수록 편집 결과가 좋아요</p>
      <button
        type="button"
        class="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40"
        :disabled="up.busy.value"
        @click="fileInput?.click()"
      >사진 고르기</button>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="onPick"
      />
    </div>

    <p v-if="up.skippedCount.value > 0" class="text-xs font-bold text-slate-500">
      이미지 아닌 파일 {{ up.skippedCount.value }}개는 건너뛰었어요.
    </p>
    <p v-if="up.fatalMessage.value" class="text-sm font-bold text-rose-600">{{ up.fatalMessage.value }}</p>

    <!-- 파일 목록 -->
    <ul v-if="up.items.value.length" class="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200">
      <li v-for="it in up.items.value" :key="it.key" class="flex items-start gap-3 px-4 py-2.5 text-sm">
        <span class="shrink-0 mt-0.5 w-20 text-xs font-bold" :class="STATUS_CLASS[it.status]">{{ STATUS_LABEL[it.status] }}</span>
        <div class="min-w-0 flex-1">
          <div class="truncate text-slate-700">{{ it.name }}</div>
          <div v-if="it.reason" class="text-xs text-rose-600 break-keep">{{ it.reason }}</div>
          <div v-else-if="it.status === 'done' && it.width" class="text-xs text-slate-400">{{ it.width }}×{{ it.height }}</div>
        </div>
        <span class="shrink-0 text-xs text-slate-400">{{ formatSize(it.size) }}</span>
        <button
          v-if="!up.busy.value && (it.status === 'rejected' || it.status === 'waiting')"
          type="button"
          class="shrink-0 text-xs text-slate-400 hover:text-rose-600"
          title="목록에서 빼기"
          @click="up.removeItem(it.key)"
        >✕</button>
      </li>
    </ul>

    <div v-if="up.items.value.length" class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-slate-500">
        완료 {{ up.counts.value.done }} · 실패 {{ up.counts.value.failed }} · 제외 {{ up.counts.value.rejected }}
        <template v-if="up.counts.value.active"> · 진행 {{ up.counts.value.active }}</template>
      </span>
      <div class="ml-auto flex gap-2">
        <button
          v-if="up.counts.value.failed > 0"
          type="button"
          class="px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 disabled:opacity-40"
          :disabled="up.busy.value"
          @click="retry"
        >실패한 것만 다시 시도</button>
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-black disabled:opacity-40"
          :disabled="up.busy.value || waitingCount === 0"
          @click="begin"
        >{{ up.busy.value ? '올리는 중…' : `${waitingCount}장 올리기` }}</button>
      </div>
    </div>

    <!-- 업로드 도중 화면 이동 경고 -->
    <StudioModal :open="leaveModal" title="업로드 중이에요" @close="cancelLeave">
      지금 나가면 아직 올라가지 않은 사진은 올라가지 않아요. 그래도 나갈까요?
      <template #actions>
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold" @click="cancelLeave">계속 올리기</button>
        <button type="button" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold" @click="confirmLeave">나가기</button>
      </template>
    </StudioModal>
  </div>
</template>

<script setup>
// 스튜디오 사진 업로드 패널 — 진입 화면(새 프로젝트)과 편집기("사진 추가")가 같이 쓴다
import { ref, computed } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useStudioUpload } from '@/composables/useStudioUpload'
import { STUDIO_MAX_IMAGES } from '@/lib/studioApi'
import StudioModal from './StudioModal.vue'

const props = defineProps({
  projectId: { type: String, default: null }, // 없으면 새 프로젝트를 만든다
  title: { type: String, default: '' },
  usedCount: { type: Number, default: 0 },   // 이 프로젝트에서 이미 한도를 쓴 장수 (done + 직접 올린 pending)
})
const emit = defineEmits(['finished'])

const up = useStudioUpload({ getUsed: () => props.usedCount })
const router = useRouter()
const fileInput = ref(null)
const dragOver = ref(false)

const STATUS_LABEL = {
  rejected: '제외', waiting: '대기', uploading: '올리는 중', confirming: '확인 중', done: '완료', failed: '실패',
}
const STATUS_CLASS = {
  rejected: 'text-slate-400', waiting: 'text-slate-500', uploading: 'text-brand-blue', confirming: 'text-brand-blue',
  done: 'text-emerald-600', failed: 'text-rose-600',
}

const waitingCount = computed(() => up.items.value.filter(it => it.status === 'waiting').length)

function formatSize(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

function onPick(e) {
  up.addFiles(e.target.files)
  e.target.value = '' // 같은 파일을 다시 고를 수 있게
}

async function onDrop(e) {
  dragOver.value = false
  try {
    await up.addDrop(e.dataTransfer)
  } catch (err) {
    console.error('[StudioUploadPanel] 드롭한 파일을 읽지 못했습니다:', err)
    up.fatalMessage.value = '끌어다 놓은 파일을 읽지 못했어요. "사진 고르기"로 다시 선택해 주세요.'
  }
}

async function begin() {
  const pid = await up.start({ projectId: props.projectId, title: props.title })
  emit('finished', { projectId: pid, done: up.counts.value.done, failed: up.counts.value.failed })
}

async function retry() {
  const pid = await up.retryFailed({ projectId: props.projectId || up.projectId.value, title: props.title })
  emit('finished', { projectId: pid, done: up.counts.value.done, failed: up.counts.value.failed })
}

// ── 업로드 도중 화면 이동 → 화면 안 모달로 확인 ──
const leaveModal = ref(false)
let pendingLeave = null
let allowLeave = false
onBeforeRouteLeave(to => {
  if (!up.busy.value || allowLeave) return true
  pendingLeave = to
  leaveModal.value = true
  return false
})
function cancelLeave() {
  leaveModal.value = false
  pendingLeave = null
}
function confirmLeave() {
  leaveModal.value = false
  allowLeave = true
  if (pendingLeave) router.push(pendingLeave)
}

defineExpose({ up })
</script>
