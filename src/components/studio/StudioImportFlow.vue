<template>
  <!-- 같은 상품의 기존 작업 -->
  <StudioModal :open="existingModal.open" title="이 상품으로 만든 작업이 있어요" @close="existingModal.open = false">
    <p>
      {{ existingModal.list.length }}개가 있어요. 가장 최근:
      <b class="st-ink">{{ existingModal.list[0] ? projectDisplayTitle(existingModal.list[0]) : '' }}</b>
      <span class="st-muted">({{ existingModal.list[0] ? formatDate(existingModal.list[0].created_at) : '' }})</span>
    </p>
    <template #actions>
      <button type="button" class="st-btn" @click="existingModal.open = false">취소</button>
      <button type="button" class="st-btn" @click="openEditor(existingModal.list[0].id)">기존 작업 열기</button>
      <button type="button" class="st-btn st-btn-primary" @click="createFromExisting">새로 만들기</button>
    </template>
  </StudioModal>

  <!-- 1688 가져오기 진행 -->
  <StudioModal :open="imp.open" :title="imp.title" @close="closeImport">
    <template v-if="imp.phase === 'product'">
      <p>1688에서 상품 정보를 불러오는 중이에요…</p>
    </template>
    <template v-else-if="imp.phase === 'ingest' || imp.phase === 'done'">
      <div class="st-progress"><div :style="{ width: progressPct + '%' }" /></div>
      <p class="mt-2">
        {{ imp.done + imp.failed }} / {{ imp.total }}장
        <span v-if="imp.failed" class="st-danger-text font-bold"> · 실패 {{ imp.failed }}장</span>
      </p>
      <p v-if="imp.capped" class="mt-1 text-[12px] font-bold st-ink-2">사진이 {{ imp.available }}장이라 {{ MAX_IMPORT }}장까지만 가져왔어요.</p>
      <p v-if="imp.ingestError" class="mt-1 text-[12px] font-bold st-danger-text">{{ imp.ingestError }}</p>
    </template>
    <template v-else-if="imp.phase === 'error'">
      <p class="font-bold st-danger-text">{{ imp.error }}</p>
    </template>
    <template #actions>
      <button v-if="imp.phase === 'error'" type="button" class="st-btn" @click="closeImport">닫기</button>
      <button v-if="imp.phase === 'done'" type="button" class="st-btn st-btn-primary" @click="openEditor(imp.projectId)">편집기 열기</button>
    </template>
  </StudioModal>

  <!-- 가져오는 도중 화면 이동 경고 -->
  <StudioModal :open="leaveModal" title="가져오는 중이에요" @close="leaveModal = false">
    지금 나가면 남은 사진은 가져오지 않아요. 그래도 나갈까요?
    <template #actions>
      <button type="button" class="st-btn" @click="leaveModal = false">계속하기</button>
      <button type="button" class="st-btn st-btn-danger" @click="confirmLeave">나가기</button>
    </template>
  </StudioModal>
</template>

<script setup>
// 1688 상품 가져오기 흐름 — 고르기 화면과 내 작업(주소 입력)이 같이 쓴다.
// (1-6a StudioNewView에 있던 로직을 그대로 옮김: 기존 작업 확인 → studio-product → studio-ingest 6장씩 → 편집기)
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { callStudioApi, studioErrorMessage, STUDIO_MAX_IMAGES } from '@/lib/studioApi'
import { findProjectsByOffer, projectDisplayTitle } from '@/lib/studioProjects'
import StudioModal from './StudioModal.vue'

const MAX_IMPORT = STUDIO_MAX_IMAGES // 1688 가져오기 최대 장수 = 프로젝트 한도
const INGEST_BATCH = 6

const router = useRouter()
const existingModal = reactive({ open: false, list: [], offerId: null })
const imp = reactive({
  open: false, phase: 'idle', title: '', total: 0, done: 0, failed: 0, available: 0,
  capped: false, projectId: null, error: '', ingestError: '',
})
const importing = computed(() => imp.phase === 'product' || imp.phase === 'ingest')
const progressPct = computed(() => (imp.total ? Math.round(((imp.done + imp.failed) / imp.total) * 100) : 0))

function formatDate(s) {
  return s ? new Date(s).toLocaleDateString('ko-KR') : ''
}

/** 찜·주문 상품으로 시작 — 같은 상품의 내 작업이 있으면 먼저 묻는다 */
async function pick(offerId) {
  if (importing.value) return
  try {
    const list = await findProjectsByOffer(offerId)
    if (list.length > 0) {
      existingModal.list = list
      existingModal.offerId = offerId
      existingModal.open = true
      return
    }
  } catch (e) {
    console.error('[StudioImportFlow] 기존 작업 확인 실패:', e)
    imp.open = true
    imp.phase = 'error'
    imp.title = '가져오기 실패'
    imp.error = e.message
    return
  }
  runImport({ offerId: String(offerId) })
}

function createFromExisting() {
  existingModal.open = false
  runImport({ offerId: String(existingModal.offerId) })
}

/** 1688 주소로 시작 — 주소 파싱은 서버(studio-product)가 한다 */
function importUrl(url) {
  if (importing.value) return
  runImport({ url })
}

async function runImport(target) {
  Object.assign(imp, {
    open: true, phase: 'product', title: '1688 상품 가져오기', total: 0, done: 0, failed: 0, available: 0,
    capped: false, projectId: null, error: '', ingestError: '',
  })
  const p = await callStudioApi('studio-product', target)
  if (!p.ok) {
    imp.phase = 'error'
    imp.title = '가져오기 실패'
    imp.error = studioErrorMessage('product', p.code)
    return
  }
  imp.projectId = p.data.projectId

  // 가져오는 순서: 대표 사진(gallery) → 상세(desc), 각각 sortOrder 순 (DB sort_order는 바꾸지 않는다)
  const bySort = (a, b) => a.sortOrder - b.sortOrder
  const ordered = [...(p.data.gallery || [])].sort(bySort).concat([...(p.data.images || [])].sort(bySort))
  imp.available = ordered.length
  imp.capped = ordered.length > MAX_IMPORT
  const ids = ordered.slice(0, MAX_IMPORT).map(i => i.id)
  imp.total = ids.length
  imp.phase = 'ingest'

  for (let i = 0; i < ids.length; i += INGEST_BATCH) {
    const chunk = ids.slice(i, i + INGEST_BATCH)
    const r = await callStudioApi('studio-ingest', { projectId: imp.projectId, imageIds: chunk })
    if (!r.ok) {
      imp.failed += chunk.length
      imp.ingestError = studioErrorMessage('ingest', r.code)
      continue
    }
    for (const id of chunk) {
      if (r.data.results?.[id]?.status === 'done') imp.done++
      else imp.failed++
    }
  }
  imp.phase = 'done'
  imp.title = '가져오기 완료'
  // 모두 잘 끝났으면 바로 편집기로, 실패·장수 제한이 있으면 안내를 보여주고 버튼으로 이동
  if (!imp.capped && imp.failed === 0 && ids.length > 0) openEditor(imp.projectId)
}

function closeImport() {
  if (importing.value) return
  imp.open = false
}

function openEditor(projectId) {
  existingModal.open = false
  imp.open = false
  router.push({ name: 'studio-editor', params: { projectId } })
}

// ── 가져오는 도중 이탈 ──
const leaveModal = ref(false)
let pendingLeave = null
let allowLeave = false
onBeforeRouteLeave(to => {
  if (!importing.value || allowLeave) return true
  pendingLeave = to
  leaveModal.value = true
  return false
})
function confirmLeave() {
  leaveModal.value = false
  allowLeave = true
  if (pendingLeave) router.push(pendingLeave)
}
const onBeforeUnload = e => {
  if (!importing.value) return
  e.preventDefault()
  e.returnValue = ''
}

/** 로그아웃 시 열린 창을 닫는다 (부모 화면의 euchs-auth-changed 구독에서 부른다) */
function reset() {
  existingModal.open = false
}

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))

defineExpose({ pick, importUrl, importing, reset })
</script>
