<template>
  <div class="space-y-3">
    <!-- 드롭 영역 -->
    <div
      v-if="showDropzone"
      class="st-dropzone p-6 text-center"
      :class="{ 'is-drag': dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <Upload class="w-7 h-7 mx-auto st-muted" :stroke-width="2" />
      <p class="mt-2 text-[14px] font-bold st-ink">
        사진을 끌어다 놓거나 <b>폴더째</b> 놓으세요 · 프로젝트당 최대 {{ STUDIO_MAX_IMAGES }}장 · 장당 20MB · JPG·PNG·WebP
      </p>
      <p class="mt-1 st-desc-sm">상품이 크게, 가운데에 나온 사진일수록 편집 결과가 좋아요</p>
      <button type="button" class="st-btn mt-4" :disabled="up.busy.value" @click="openPicker">사진 고르기</button>
    </div>
    <input ref="fileInput" type="file" multiple accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPick" />

    <p v-if="up.skippedCount.value > 0" class="st-desc font-bold">
      이미지 아닌 파일 {{ up.skippedCount.value }}개는 건너뛰었어요.
    </p>
    <p v-if="up.fatalMessage.value" class="text-[14px] font-bold st-danger-text">{{ up.fatalMessage.value }}</p>

    <!-- 파일 목록 -->
    <ul v-if="up.items.value.length" class="st-card st-divide overflow-hidden">
      <li v-for="it in up.items.value" :key="it.key" class="flex items-center gap-3 px-3 py-2">
        <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0 st-placeholder">
          <img v-if="thumbs[it.key]" :src="thumbs[it.key]" alt="" class="w-full h-full object-cover" />
          <ImageIcon v-else class="w-4 h-4" :stroke-width="2" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[14px] font-semibold st-ink">{{ it.name }}</div>
          <div v-if="it.reason" class="text-[12px] st-danger-text break-keep">{{ it.reason }}</div>
          <div v-else-if="it.status === 'done' && it.width" class="st-desc-sm">{{ it.width }}×{{ it.height }}</div>
        </div>
        <span class="shrink-0 st-desc-sm">{{ formatSize(it.size) }}</span>
        <span class="st-badge shrink-0" :class="STATUS_CLASS[it.status]">{{ STATUS_LABEL[it.status] }}</span>
        <button
          v-if="!up.busy.value && (it.status === 'rejected' || it.status === 'waiting')"
          type="button"
          class="st-icon-btn shrink-0"
          title="목록에서 빼기"
          @click="up.removeItem(it.key)"
        ><X class="w-4 h-4" :stroke-width="2" /></button>
      </li>
    </ul>

    <div v-if="up.items.value.length" class="flex flex-wrap items-center gap-2">
      <span class="st-desc">
        완료 {{ up.counts.value.done }} · 실패 {{ up.counts.value.failed }} · 제외 {{ up.counts.value.rejected }}
        <template v-if="up.counts.value.active"> · 진행 {{ up.counts.value.active }}</template>
      </span>
      <div class="ml-auto flex gap-2">
        <button v-if="up.counts.value.failed > 0" type="button" class="st-btn" :disabled="up.busy.value" @click="retry">
          실패한 것만 다시 시도
        </button>
        <button type="button" class="st-btn st-btn-primary" :disabled="up.busy.value || waitingCount === 0" @click="begin">
          {{ up.busy.value ? '올리는 중…' : `${waitingCount}장 올리기` }}
        </button>
      </div>
    </div>

    <!-- 업로드 도중 화면 이동 경고 -->
    <StudioModal :open="leaveModal" title="업로드 중이에요" @close="cancelLeave">
      지금 나가면 아직 올라가지 않은 사진은 올라가지 않아요. 그래도 나갈까요?
      <template #actions>
        <button type="button" class="st-btn" @click="cancelLeave">계속 올리기</button>
        <button type="button" class="st-btn st-btn-danger" @click="confirmLeave">나가기</button>
      </template>
    </StudioModal>
  </div>
</template>

<script setup>
// 스튜디오 사진 업로드 패널 — 진입 화면·내 작업(새 프로젝트)과 편집기("사진 추가")가 같이 쓴다
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Upload, X, Image as ImageIcon } from 'lucide-vue-next'
import { useStudioUpload, ALLOWED_TYPES } from '@/composables/useStudioUpload'
import { STUDIO_MAX_IMAGES } from '@/lib/studioApi'
import StudioModal from './StudioModal.vue'

const props = defineProps({
  projectId: { type: String, default: null }, // 없으면 새 프로젝트를 만든다
  title: { type: String, default: '' },
  usedCount: { type: Number, default: 0 },   // 이 프로젝트에서 이미 한도를 쓴 장수 (done + 직접 올린 pending)
  showDropzone: { type: Boolean, default: true },
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
  rejected: 'st-badge-danger', waiting: '', uploading: 'st-badge-accent', confirming: 'st-badge-accent',
  done: 'st-success-text', failed: 'st-badge-danger',
}

const waitingCount = computed(() => up.items.value.filter(it => it.status === 'waiting').length)

// ── 파일 미리보기 (URL.createObjectURL) — 목록에서 빠지거나 화면을 떠날 때 반드시 revoke ──
const thumbs = reactive({})
watch(() => up.items.value.map(it => it.key), keys => {
  const alive = new Set(keys)
  for (const k of Object.keys(thumbs)) {
    if (!alive.has(Number(k))) {
      URL.revokeObjectURL(thumbs[k])
      delete thumbs[k]
    }
  }
  for (const it of up.items.value) {
    if (!thumbs[it.key] && ALLOWED_TYPES.includes(it.type) && it.file) thumbs[it.key] = URL.createObjectURL(it.file)
  }
})
onUnmounted(() => {
  for (const k of Object.keys(thumbs)) URL.revokeObjectURL(thumbs[k])
})

function formatSize(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

function openPicker() {
  fileInput.value?.click()
}

function onPick(e) {
  up.addFiles(e.target.files)
  e.target.value = '' // 같은 파일을 다시 고를 수 있게
}

/**
 * 드롭 처리 — 밖(카드 드롭 영역)에서도 부른다.
 * ★ dataTransfer는 drop 이벤트 안에서만 읽을 수 있으므로 이벤트 핸들러에서 곧바로 불러야 한다.
 */
async function addDrop(dataTransfer) {
  try {
    await up.addDrop(dataTransfer)
  } catch (err) {
    console.error('[StudioUploadPanel] 드롭한 파일을 읽지 못했습니다:', err)
    up.fatalMessage.value = '끌어다 놓은 파일을 읽지 못했어요. "사진 고르기"로 다시 선택해 주세요.'
  }
}

function onDrop(e) {
  dragOver.value = false
  addDrop(e.dataTransfer)
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

defineExpose({ up, addDrop, openPicker })
</script>
