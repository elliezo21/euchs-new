<template>
  <div class="relative h-screen flex flex-col overflow-hidden">
    <!-- 편집기 상단 바 -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-2 st-surface st-border-b">
      <router-link :to="{ name: 'studio-projects' }" class="st-icon-btn" title="내 작업으로">
        <ArrowLeft class="w-5 h-5" :stroke-width="2" />
      </router-link>
      <div class="min-w-0 flex items-baseline gap-2">
        <span class="text-[15px] font-extrabold st-ink truncate">{{ project ? projectDisplayTitle(project) : '' }}</span>
        <template v-if="project">
          <button v-if="saveStatus === 'error'" type="button" class="text-[12px] font-bold st-danger-text shrink-0 underline" :title="saveDetail" data-save-status="error" @click="retrySave">저장 실패 — 다시 시도</button>
          <button v-else-if="saveStatus === 'conflict'" type="button" class="text-[12px] font-bold st-danger-text shrink-0 underline" data-save-status="conflict" @click="reopenConflict">저장 안 됨 — 다른 창과 충돌</button>
          <span v-else-if="saveStatus === 'pending' || saveStatus === 'saving'" class="text-[12px] st-muted shrink-0" data-save-status="saving">저장 중…</span>
          <span v-else class="text-[12px] st-muted shrink-0" data-save-status="saved">저장됨</span>
        </template>
      </div>
      <div class="ml-auto flex items-center gap-1">
        <!-- 반응형 숨김은 감싸는 요소에 둔다 (st-* 클래스의 display가 Tailwind hidden보다 우선이라) -->
        <span v-if="project" class="md:hidden"><button type="button" class="st-icon-btn" title="사진 추가" @click="addOpen = true"><ImagePlus class="w-[18px] h-[18px]" :stroke-width="2" /></button></span>
        <!-- 고른 사진의 지우기 되돌리기·다시 (지우기 화면과 같은 이력). 페이지 되돌리기는 4단계에서 따로 생긴다 -->
        <button type="button" class="st-icon-btn" :disabled="!canUndoNow" :title="canUndoNow ? '되돌리기' : '되돌릴 동작이 없어요'" @click="undoEdit"><Undo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
        <button type="button" class="st-icon-btn" :disabled="!canRedoNow" :title="canRedoNow ? '다시' : '다시 할 동작이 없어요'" @click="redoEdit"><Redo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
        <span class="hidden sm:inline-flex"><button type="button" class="st-btn" disabled title="준비 중이에요"><Eye class="w-4 h-4" :stroke-width="2" /> 미리보기</button></span>
        <button type="button" class="st-btn st-btn-primary" disabled title="준비 중이에요"><Download class="w-4 h-4" :stroke-width="2" /> 내보내기</button>
      </div>
    </header>

    <p v-if="loading" class="p-6 st-desc">불러오는 중…</p>
    <p v-else-if="errorMsg" class="p-6 text-[14px] font-bold st-danger-text">{{ errorMsg }}</p>
    <div v-else-if="!project" class="p-10 text-center st-body">
      프로젝트를 찾을 수 없어요. 삭제됐거나 다른 계정의 프로젝트일 수 있어요.
      <router-link :to="{ name: 'studio-projects' }" class="ml-1 st-link">내 작업으로</router-link>
    </div>

    <div v-else class="flex-1 min-h-0 flex" :class="isWide ? '' : 'flex-col'">
      <!-- 1024px 미만: 편집 없음 -->
      <div v-if="!isWide" class="px-4 py-3 st-accent-soft-bg">
        <p class="text-[13px] font-bold st-accent-text break-keep">편집은 PC에서 할 수 있어요</p>
        <p class="st-desc-sm break-keep">화면 폭이 1024px 이상인 컴퓨터에서 열면 사진을 지우고 편집할 수 있어요.</p>
      </div>

      <!-- 도구 줄 -->
      <nav v-if="isWide" class="w-[72px] shrink-0 flex flex-col items-center gap-1 py-3 st-surface st-border-r">
        <button
          v-for="t in TOOLS" :key="t.label" type="button"
          class="w-[60px] py-2 rounded-[10px] flex flex-col items-center gap-1 text-[11px] font-bold"
          :class="t.active ? 'st-accent-soft-bg st-accent-text' : 'st-muted opacity-50 cursor-not-allowed'"
          :disabled="!t.active"
          :title="t.active ? t.label : `${t.label} (준비 중)`"
        >
          <component :is="t.icon" class="w-5 h-5" :stroke-width="2" />
          {{ t.label }}
        </button>
      </nav>

      <!-- 왼쪽 패널: 사진 목록 -->
      <aside class="flex flex-col st-surface" :class="isWide ? 'w-[264px] shrink-0 st-border-r' : 'flex-1 min-h-0'">
        <div class="px-4 pt-4 pb-3 space-y-3 st-border-b">
          <div class="flex items-center">
            <span class="st-h-card">사진 {{ images.length }}</span>
            <button type="button" class="st-btn ml-auto" @click="addOpen = true"><ImagePlus class="w-4 h-4" :stroke-width="2" /> 사진 추가</button>
          </div>
          <!-- included(사용/빼둔 사진)는 다음 단계에서 연결 — 지금은 자리만 -->
          <div class="flex gap-1.5">
            <button type="button" class="st-chip is-active" disabled title="다음 단계에서 연결돼요">사용 –</button>
            <button type="button" class="st-chip" disabled title="다음 단계에서 연결돼요">빼둔 사진 –</button>
          </div>
          <p v-if="orderError" class="text-[11px] font-bold st-danger-text break-keep">{{ orderError }}</p>
        </div>
        <ol ref="listEl" class="flex-1 overflow-y-auto p-2 space-y-0.5">
          <li v-for="(img, idx) in images" :key="img.id">
            <button
              type="button"
              class="w-full flex items-center gap-2.5 p-2 rounded-[10px] text-left"
              :class="[
                img.ingest_status !== 'done' ? 'opacity-50 cursor-default' : isWide && img.id === selectedImageId ? 'st-accent-soft-bg' : isWide ? 'st-hover-soft' : '',
              ]"
              :style="{ border: `2px solid ${isWide && img.id === selectedImageId ? 'var(--st-accent)' : 'transparent'}` }"
              :disabled="img.ingest_status !== 'done' || !isWide"
              :data-image-id="img.id"
              @click="selectImage(img.id)"
              @dblclick="openErase(img.id)"
            >
              <span class="w-5 text-right text-[11px] font-bold st-muted shrink-0">{{ idx + 1 }}</span>
              <div class="w-14 h-14 rounded-[8px] overflow-hidden shrink-0 st-placeholder">
                <img v-if="viewUrls.get(img.original_path)" :src="viewUrls.get(img.original_path)" alt="" loading="lazy" class="w-full h-full object-cover" />
                <ImageIcon v-else class="w-4 h-4" :stroke-width="2" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[12px] font-bold st-ink-2">{{ KIND_LABEL[img.kind] }}</div>
                <div v-if="img.kind === 'upload' && img.upload_name" class="text-[12px] st-muted truncate">{{ img.upload_name }}</div>
                <div v-if="img.ingest_status !== 'done'" class="text-[11px] font-bold break-keep" :class="img.ingest_status === 'failed' ? 'st-danger-text' : 'st-muted'">{{ statusText(img) }}</div>
                <div v-else-if="fillCount(img.id) > 0" class="text-[11px] font-bold st-accent-text" data-fill-count>지우기 {{ fillCount(img.id) }}곳</div>
                <div v-else class="text-[11px] st-muted">원본</div>
              </div>
            </button>
          </li>
        </ol>
        <p v-if="images.length === 0" class="px-4 pb-4 st-desc">아직 사진이 없어요. "사진 추가"로 올려보세요.</p>
      </aside>

      <!-- 가운데: 고른 사진 미리보기 (보기 전용 — 지우기는 [지우기] 화면에서) -->
      <section v-if="isWide" class="flex-1 min-w-0 relative st-canvas-bg" data-canvas-area>
        <StudioCanvas
          v-if="selectedImage && !eraseOpen"
          :image="selectedImage"
          :layers="selectedLayers"
          :load-image="loadCanvasImage"
          :interactive="false"
          :keys-enabled="false"
          :ai-engine="aiEngine"
          :ai-state="aiState"
          data-preview-canvas
        />
        <div v-else-if="!selectedImage" class="absolute inset-0 flex items-center justify-center st-desc">
          {{ doneImages.length ? '왼쪽에서 사진을 고르세요' : '완료된 사진이 아직 없어요' }}
        </div>
      </section>

      <!-- 오른쪽 패널: 사진 정보 + [지우기] -->
      <aside v-if="isWide" class="w-[300px] shrink-0 flex flex-col st-surface st-border-l">
        <div class="flex-1 overflow-y-auto p-5">
          <template v-if="!selectedImage">
            <p class="st-desc break-keep">사진을 고르면 [지우기]로 필요 없는 부분을 지울 수 있어요.</p>
          </template>
          <template v-else>
            <h3 class="st-h-card">사진 정보</h3>
            <dl class="mt-3 space-y-2 text-[13px]">
              <div class="flex"><dt class="st-muted w-20 shrink-0">종류</dt><dd class="st-ink-2 font-bold">{{ KIND_LABEL[selectedImage.kind] }}</dd></div>
              <div class="flex"><dt class="st-muted w-20 shrink-0">원본 크기</dt><dd class="st-ink-2 font-bold">{{ selectedImage.width }}×{{ selectedImage.height }}px</dd></div>
              <div class="flex"><dt class="st-muted w-20 shrink-0">파일 크기</dt><dd class="st-ink-2 font-bold">{{ formatBytes(selectedImage.bytes) }}</dd></div>
              <div class="flex"><dt class="st-muted w-20 shrink-0">지우기</dt><dd class="st-ink-2 font-bold">{{ selectedFillCount > 0 ? `${selectedFillCount}곳` : '없음' }}</dd></div>
            </dl>
            <button type="button" class="st-btn st-btn-primary st-btn-lg st-btn-block mt-5" data-open-erase @click="openErase(selectedImage.id)">
              <Eraser class="w-4 h-4" :stroke-width="2" /> 지우기
            </button>
            <p class="mt-2 st-desc-sm break-keep">지울 곳을 칠하거나(붓) 네모로 감싼 뒤 [AI로 지우기] 또는 [단색]을 누르세요</p>
          </template>
        </div>

        <div v-if="selectedImage" class="p-4 st-border-t">
          <button
            type="button" class="st-btn st-btn-block st-danger-text"
            :disabled="selectedFillCount === 0" data-clear-all
            @click="clearAllOpen = true"
          ><Trash2 class="w-4 h-4" :stroke-width="2" /> 이 사진의 지우기 모두 삭제</button>
        </div>
      </aside>
    </div>

    <!-- 지우기 화면 (편집기 위에 겹쳐 연다 — 세션·저장·AI 엔진은 편집기 것을 그대로 쓴다) -->
    <StudioEraseScreen
      v-if="eraseOpen && selectedImage && isWide"
      ref="eraseScreen"
      :session="session"
      :image="selectedImage"
      :load-image="loadCanvasImage"
      :keys-enabled="!anyModalOpen"
      @close="eraseOpen = false"
      @toast="showToast"
    />

    <div v-if="toast" class="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-[10px] st-surface st-shadow-float text-[13px] font-bold st-ink break-keep" style="z-index: 30" data-toast>{{ toast }}</div>

    <!-- 사진 추가 -->
    <StudioModal :open="addOpen" wide title="사진 추가" @close="addOpen = false">
      <StudioUploadPanel v-if="project" :project-id="project.id" :used-count="usedCount" @finished="onAddFinished" />
      <template #actions>
        <button type="button" class="st-btn" @click="addOpen = false">닫기</button>
      </template>
    </StudioModal>

    <!-- 모두 삭제 확인 -->
    <StudioModal :open="clearAllOpen" title="이 사진의 지우기를 모두 삭제할까요?" @close="clearAllOpen = false">
      지우기 {{ selectedFillCount }}곳이 모두 없어지고 원본 그대로 돌아가요.
      <template #actions>
        <button type="button" class="st-btn" @click="clearAllOpen = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" data-confirm-clear @click="confirmClearAll">모두 삭제</button>
      </template>
    </StudioModal>

    <!-- 저장 충돌 -->
    <StudioModal :open="!!conflictId" title="다른 창에서 이 사진을 수정했어요" @close="closeConflict">
      최신 내용을 불러올까요? 불러오면 이 창에서 저장되지 않은 변경은 없어져요.
      <p v-if="conflictError" class="mt-2 text-[13px] font-bold st-danger-text">{{ conflictError }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="closeConflict">취소</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="conflictLoading" data-conflict-reload @click="reloadConflicted">불러오기</button>
      </template>
    </StudioModal>

    <!-- 저장 안 된 채 떠나기 -->
    <StudioModal :open="leaveOpen" title="저장되지 않은 변경이 있어요" @close="leaveOpen = false">
      지금 나가면 마지막 변경이 저장되지 않아요.
      <p v-if="saveDetail" class="mt-2 text-[13px] st-danger-text break-keep">{{ saveDetail }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="leaveOpen = false">머무르기</button>
        <button type="button" class="st-btn st-btn-danger" @click="leaveAnyway">그래도 나가기</button>
      </template>
    </StudioModal>
  </div>
</template>

<script setup>
// 편집기 — 사진 목록과 고른 사진 미리보기. 지우기는 [지우기]를 눌러 여는 지우기 화면(StudioEraseScreen)에서 한다 (2단계 개편).
// 원본 파일은 바꾸지 않는다. 지우기 상태·자동 저장·이력·AI 엔진은 지우기 세션(useEraseSession) 하나가 편집기 화면 동안 들고 있다.
// 긴 페이지·속성 패널·템플릿(3단계~)과 덮기·글자·내보내기는 다음 단계 — 버튼은 비활성 그대로.
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent, h } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  ArrowLeft, Undo2, Redo2, Eye, Download, Image as ImageIcon, ImagePlus, Type, LayoutTemplate, Layers, Bookmark,
  Trash2, Eraser,
} from 'lucide-vue-next'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioEraseScreen from '@/components/studio/StudioEraseScreen.vue'
import {
  loadMyProject, listEditorImages, signViewUrls, sortStudioImages, sortBySortOrder, hasSortOrderOverlap,
  renumberSortOrders, projectDisplayTitle, KIND_LABEL,
} from '@/lib/studioProjects'
import { studioErrorMessage } from '@/lib/studioApi'
import { createImageCache } from '@/lib/studioImageCache'
import { useEraseSession } from '@/composables/useEraseSession'

// Fabric은 이 컴포넌트와 함께만 받는다 (1024px 미만에서는 받지도 않는다)
const StudioCanvas = defineAsyncComponent({
  loader: () => import('@/components/studio/StudioCanvas.vue'),
  errorComponent: {
    render: () => h('div', { class: 'absolute inset-0 flex items-center justify-center p-6 text-center text-[14px] font-bold st-danger-text' },
      '편집 도구를 불러오지 못했어요. 새로고침해 주세요.'),
  },
  onError(err, retry, fail) {
    console.error('[StudioEditor] 편집 도구(Fabric) 로드 실패:', err)
    fail()
  },
})

const TOOLS = [
  { label: '사진', icon: ImageIcon, active: true },
  { label: '글자', icon: Type },
  { label: '템플릿', icon: LayoutTemplate },
  { label: '배경합성', icon: Layers },
  { label: '저장값', icon: Bookmark },
]

const route = useRoute()
const router = useRouter()
const project = ref(null)
const images = ref([])
const viewUrls = ref(new Map())
const loading = ref(false)
const errorMsg = ref('')
const orderError = ref('')
const addOpen = ref(false)
const selectedImageId = ref(null)
const clearAllOpen = ref(false)
const leaveOpen = ref(false)
const eraseOpen = ref(false)
const toast = ref('')
const isWide = ref(true)
const listEl = ref(null)
let loadSeq = 0
let leaveTarget = null
let leaveBypass = false
let toastTimer = null

const imageCache = createImageCache({ limit: 5 })

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
}

const session = useEraseSession({ images, selectedImageId, showToast })
const {
  selectedImage, selectedLayers, selectedFillCount, canUndoNow, canRedoNow,
  saveStatus, saveDetail, conflictId, conflictError, conflictLoading, aiEngine, aiState,
  fillCount, undoEdit, redoEdit, retrySave, reopenConflict, reloadConflicted,
} = session

const doneImages = computed(() => images.value.filter(i => i.ingest_status === 'done'))
// 장수 한도에 드는 수 — 서버 prepare와 같은 방식: done + 직접 올린 pending (1688의 가져오지 않은 pending은 세지 않음)
const usedCount = computed(() => images.value.filter(i =>
  i.ingest_status === 'done' || (i.kind === 'upload' && i.ingest_status === 'pending')).length)
const anyModalOpen = computed(() => addOpen.value || clearAllOpen.value || !!conflictId.value || leaveOpen.value)

function statusText(img) {
  if (img.ingest_status === 'done') return '완료'
  if (img.ingest_status === 'pending') return img.kind === 'upload' ? '올리는 중이거나 멈춤' : '가져오지 않음'
  const code = String(img.ingest_error || '')
  return img.kind === 'upload' ? `실패 · ${studioErrorMessage('upload', code)}` : `실패 · ${code || '원인 미기록'}`
}

function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '알 수 없음'
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`
  return `${Math.round(n / 1024)}KB`
}

// ── 불러오기 + 순서 번호 겹침 정리 ──
async function load() {
  const seq = ++loadSeq
  const projectId = String(route.params.projectId || '')
  loading.value = !project.value || project.value.id !== projectId
  errorMsg.value = ''
  orderError.value = ''
  try {
    const p = await loadMyProject(projectId)
    let imgs = p ? await listEditorImages(p.id) : []
    let ordered
    let orderErr = ''
    if (hasSortOrderOverlap(imgs)) {
      // 예전 kind별 번호(gallery 0~, desc 0~ …) → 표시 순서대로 0부터 한 번만 다시 매긴다
      try {
        const n = await renumberSortOrders(imgs)
        ordered = sortStudioImages(imgs).map((r, i) => ({ ...r, sort_order: i }))
        console.info(`[StudioEditor] 사진 순서 번호 정리: ${n}건 변경`)
      } catch (e) {
        orderErr = `${e.message} — 지금 순서로 보여주고 다음에 다시 시도해요.`
        ordered = sortStudioImages(imgs)
      }
    } else {
      ordered = sortBySortOrder(imgs)
    }
    // 보기용 서명 URL(10분)은 열 때마다 한 번에 새로 발급
    const urls = await signViewUrls(ordered.filter(i => i.ingest_status === 'done' && i.original_path).map(i => i.original_path))
    if (seq !== loadSeq) return
    project.value = p
    images.value = ordered
    viewUrls.value = urls
    orderError.value = orderErr
    session.syncFromServer(ordered)
    if (!selectedImage.value) {
      selectedImageId.value = doneImages.value[0]?.id || null
      session.selectedLayerId.value = null
    }
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioEditor] 불러오기 실패:', e)
    errorMsg.value = e.message || String(e)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function onAddFinished() {
  await session.flush()
  load()
}

// ── 사진 고르기 ──
function selectImage(id) {
  if (id === selectedImageId.value) return
  session.leaveImage(selectedImageId.value) // 이전 사진 즉시 저장, 실행 전 영역·선택은 버린다
  selectedImageId.value = id
  nextTick(() => listEl.value?.querySelector(`[data-image-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }))
}

function stepImage(dir) {
  const list = doneImages.value
  if (list.length === 0) return
  const i = list.findIndex(x => x.id === selectedImageId.value)
  const next = list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i + dir)))]
  if (next) selectImage(next.id)
}

// ── 지우기 화면 ──
function openErase(id) {
  if (!isWide.value || !images.value.some(i => i.id === id && i.ingest_status === 'done')) return
  selectImage(id)
  eraseOpen.value = true
}

function loadCanvasImage(row) {
  return imageCache.get(row)
}

function confirmClearAll() {
  clearAllOpen.value = false
  session.clearAllFills()
}

function closeConflict() { conflictId.value = null }

// ── 떠나기 ──
const eraseScreen = ref(null)
async function guardLeave(to) {
  if (leaveBypass) return true
  // 지우기 화면이 열려 있으면 브라우저 [뒤로]는 지우기 화면만 닫는다 (페이지는 그대로)
  if (eraseOpen.value) {
    eraseScreen.value?.close()
    eraseOpen.value = false
    return false
  }
  if (!session.hasUnsaved()) return true
  const ok = await session.flush()
  if (ok) return true
  leaveTarget = to
  leaveOpen.value = true
  return false
}
onBeforeRouteLeave(guardLeave)
onBeforeRouteUpdate(async (to, from) => (to.params.projectId === from.params.projectId ? true : guardLeave(to)))

function leaveAnyway() {
  leaveOpen.value = false
  leaveBypass = true
  if (leaveTarget) router.push(leaveTarget).finally(() => { leaveBypass = false })
}

function onBeforeUnload(e) {
  if (!session.hasUnsaved()) return
  session.flush() // 남은 저장을 시도는 하되, 끝을 기다릴 수 없으므로 브라우저 경고를 띄운다
  e.preventDefault()
  e.returnValue = ''
}

// ── 키보드: ↑/↓ 이전·다음 사진(목록에서만), Ctrl(Cmd)+Z 되돌리기, Ctrl(Cmd)+Shift+Z·Ctrl+Y 다시 ──
function onKeyDown(e) {
  if (!isWide.value || anyModalOpen.value || e.altKey) return
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  if (e.ctrlKey || e.metaKey) {
    // e.code 기준: 한글 입력 상태에서도 같은 키로 동작
    if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); undoEdit() }
    else if ((e.code === 'KeyZ' && e.shiftKey) || (e.code === 'KeyY' && !e.shiftKey)) { e.preventDefault(); redoEdit() }
    return
  }
  if (eraseOpen.value) return // 지우기 화면에서는 사진을 바꾸지 않는다
  if (e.key === 'ArrowUp') { e.preventDefault(); stepImage(-1) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); stepImage(1) }
}

// ── 화면 폭 ──
const wideQuery = window.matchMedia('(min-width: 1024px)')
function onWideChange() {
  isWide.value = wideQuery.matches
  // 편집은 1024px 이상에서만 — 좁은 화면에서는 모델(약 200MB)을 받지 않는다
  if (isWide.value) session.startAiEngine()
  else eraseOpen.value = false
}

watch(() => route.params.projectId, (id, old) => {
  if (!id || id === old) return
  project.value = null
  selectedImageId.value = null
  session.selectedLayerId.value = null
  eraseOpen.value = false
  load()
})

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·사진·서명 URL·편집 상태를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    eraseOpen.value = false
    session.resetAll()
    imageCache.clear()
    project.value = null
    images.value = []
    viewUrls.value = new Map()
    selectedImageId.value = null
    addOpen.value = false
    clearAllOpen.value = false
    leaveOpen.value = false
  }
}

onMounted(() => {
  onWideChange()
  wideQuery.addEventListener('change', onWideChange)
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onKeyDown)
  load()
})

onUnmounted(() => {
  wideQuery.removeEventListener('change', onWideChange)
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeyDown)
  clearTimeout(toastTimer)
  session.dispose()
  imageCache.clear()
})
</script>
