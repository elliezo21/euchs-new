<template>
  <div class="studio-root st-dark relative h-screen flex flex-col overflow-hidden" data-studio-editor>
    <!-- 상단바: ← · 로고 · 되돌리기 다시 · 작업명 · 저장 상태 · "직접 만들기 · 반자동" · [원클릭 AI 자동 제작] · 이력 · 미리보기 · 내보내기 -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-2 st-topbar st-border-b" data-topbar>
      <router-link :to="{ name: 'studio-projects' }" class="st-icon-btn" title="내 작업으로" data-back>
        <ArrowLeft class="w-5 h-5" :stroke-width="2" />
      </router-link>
      <span class="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center st-logo-mark text-[13px] font-extrabold shrink-0">E</span>
      <!-- 3단계: 고른 사진의 지우기 되돌리기·다시. 4단계에서 페이지용으로 바뀐다 -->
      <button type="button" class="st-icon-btn" :disabled="!canUndoNow" :title="canUndoNow ? '되돌리기' : '되돌릴 동작이 없어요'" data-action="undo" @click="undoEdit"><Undo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn" :disabled="!canRedoNow" :title="canRedoNow ? '다시' : '다시 할 동작이 없어요'" data-action="redo" @click="redoEdit"><Redo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
      <div class="min-w-0 ml-1 leading-tight" data-title-block>
        <div class="text-[14px] font-extrabold st-ink truncate">{{ project ? projectDisplayTitle(project) : '' }}</div>
        <template v-if="project">
          <button v-if="saveStatus === 'error'" type="button" class="text-[11px] font-bold st-danger-text underline" :title="saveDetail" data-save-status="error" @click="retrySave">저장하지 못했어요 · 다시 시도</button>
          <button v-else-if="saveStatus === 'conflict'" type="button" class="text-[11px] font-bold st-danger-text underline" data-save-status="conflict" @click="reopenConflict">저장 안 됨 · 다른 창과 충돌</button>
          <span v-else-if="saveStatus === 'pending' || saveStatus === 'saving'" class="text-[11px] st-muted" data-save-status="saving">저장 중…</span>
          <span v-else class="text-[11px] st-success-text" data-save-status="saved">● 저장됨</span>
        </template>
      </div>
      <span class="st-badge ml-2 shrink-0" data-mode-chip><Hand class="w-3 h-3 mr-1" :stroke-width="2" /> 직접 만들기 · 반자동</span>

      <div class="ml-auto flex items-center gap-1.5">
        <button type="button" class="st-btn st-btn-ai st-ai-cta" data-one-click @click="showToast('곧 추가될 기능이에요. 지금은 직접 만들기로 편집할 수 있어요.')">
          <Sparkles class="w-[18px] h-[18px] shrink-0" :stroke-width="2" />
          <span class="text-left leading-tight"><span class="block text-[14px] font-extrabold">원클릭 AI 자동 제작</span><span class="block text-[11px] font-semibold opacity-80">완전 자동 · 사진만 있으면 끝까지</span></span>
        </button>
        <span class="w-px h-6 mx-1" style="background: var(--st-line)" />
        <button type="button" class="st-btn st-btn-ghost" data-top-history @click="showToast('곧 추가될 기능이에요.')"><History class="w-4 h-4" :stroke-width="2" /> 이력</button>
        <button type="button" class="st-btn st-btn-ghost" data-top-preview @click="showToast('곧 추가될 기능이에요.')"><Eye class="w-4 h-4" :stroke-width="2" /> 미리보기</button>
        <button type="button" class="st-btn st-btn-primary" data-top-export @click="showToast('곧 추가될 기능이에요.')"><Download class="w-4 h-4" :stroke-width="2" /> 내보내기</button>
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

      <!-- 왼쪽 아이콘 막대 (72px): 템플릿 · 구간 · 사진 · 텍스트 · 요소 · 배경합성 · 저장값 · (맨 아래) 가이드 -->
      <nav v-if="isWide" class="w-[72px] shrink-0 flex flex-col items-center gap-1 py-2 st-topbar st-border-r" data-rail>
        <button
          v-for="t in RAIL" :key="t.key" type="button"
          class="st-rail-item" :class="activeTool === t.key ? 'is-active' : ''"
          :aria-pressed="activeTool === t.key" :data-rail="t.key"
          @click="activeTool = t.key"
        >
          <component :is="t.icon" class="w-5 h-5" :stroke-width="2" />
          <span>{{ t.label }}</span>
        </button>
        <span class="flex-1" />
        <button type="button" class="st-rail-item" data-rail="guide" @click="showToast('곧 추가될 기능이에요.')">
          <CircleHelp class="w-5 h-5" :stroke-width="2" /><span>가이드</span>
        </button>
      </nav>

      <!-- 재료 패널 (300px): 고른 메뉴의 재료. 사진을 누르면 사진 속성 패널(6단계) -->
      <aside class="flex flex-col st-surface" :class="isWide ? 'w-[300px] shrink-0 st-border-r' : 'flex-1 min-h-0'" data-material-panel>
        <StudioPhotoPanel
          v-if="activeTool === 'photo' || !isWide"
          :images="images" :view-urls="viewUrls" :selected-image-id="selectedImageId" :fill-count="fillCount" :order-error="orderError"
          @select="selectImage" @open-erase="openErase" @add="addOpen = true" @retry-url="resignViewUrl"
        />
        <div v-else class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center" data-panel-soon>
          <span class="st-icon-box"><component :is="railItem(activeTool).icon" class="w-5 h-5" :stroke-width="2" /></span>
          <div class="text-[14px] font-bold st-ink">{{ railItem(activeTool).label }}</div>
          <p class="st-desc break-keep">{{ railItem(activeTool).soon }}</p>
        </div>
      </aside>

      <!-- 가운데: 고른 사진 미리보기 (4단계에서 긴 페이지로 바뀐다) -->
      <section v-if="isWide" class="flex-1 min-w-0 relative st-canvas-bg st-dotgrid" data-canvas-area>
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
        <!-- 사진 정보 + [지우기] (6단계에서 왼쪽 사진 속성 패널로 옮긴다) -->
        <div v-if="selectedImage && !eraseOpen" class="absolute right-3 top-3 w-[220px] st-card p-3" style="z-index: 5" data-image-info>
          <div class="text-[12px] font-bold st-ink-2 truncate">{{ KIND_LABEL[selectedImage.kind] }}<span v-if="selectedImage.kind === 'upload' && selectedImage.upload_name"> · {{ selectedImage.upload_name }}</span></div>
          <div class="text-[11px] st-muted">{{ selectedImage.width }}×{{ selectedImage.height }}px · {{ formatBytes(selectedImage.bytes) }} · 지움 {{ selectedFillCount }}</div>
          <button type="button" class="st-btn st-btn-primary st-btn-block mt-2" data-open-erase @click="openErase(selectedImage.id)"><Eraser class="w-4 h-4" :stroke-width="2" /> 지우기</button>
          <button type="button" class="st-btn st-btn-ghost st-btn-block mt-1 st-danger-text text-[12px]" :disabled="selectedFillCount === 0" data-clear-all @click="clearAllOpen = true"><Trash2 class="w-3.5 h-3.5" :stroke-width="2" /> 이 사진의 지우기 모두 삭제</button>
        </div>
        <button
          v-if="!rightOpen" type="button" class="st-icon-btn absolute right-2 bottom-3 st-surface st-shadow-float" style="z-index: 5" title="오른쪽 패널 열기" data-right-open
          @click="rightOpen = true"
        ><PanelRightOpen class="w-4 h-4" :stroke-width="2" /></button>
      </section>

      <!-- 오른쪽 (212px): [미니뷰 | 레이어] — 8·9단계에서 채운다. 1280px 미만에서는 접을 수 있다 -->
      <aside v-if="isWide && rightOpen" class="w-[212px] shrink-0 flex flex-col st-surface st-border-l" data-right-panel>
        <div class="p-3 flex items-center gap-1">
          <div class="st-seg flex-1">
            <button type="button" class="st-seg-item flex-1" :class="rightTab === 'mini' ? 'is-active' : ''" data-right-tab="mini" @click="rightTab = 'mini'">미니뷰</button>
            <button type="button" class="st-seg-item flex-1" :class="rightTab === 'layers' ? 'is-active' : ''" data-right-tab="layers" @click="rightTab = 'layers'">레이어</button>
          </div>
          <button v-if="!wideRight" type="button" class="st-icon-btn shrink-0" title="패널 접기" data-right-close @click="rightOpen = false"><PanelRightClose class="w-4 h-4" :stroke-width="2" /></button>
        </div>
        <div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col items-center justify-center text-center gap-2" data-right-soon>
          <p class="st-desc break-keep">{{ rightTab === 'mini' ? '구간 미리보기는 곧 추가될 기능이에요.' : '레이어 목록은 곧 추가될 기능이에요.' }}</p>
        </div>
        <div class="p-3 space-y-2 st-border-t">
          <button type="button" class="st-btn st-btn-block" data-reorder @click="showToast('곧 추가될 기능이에요.')"><ArrowUpDown class="w-4 h-4" :stroke-width="2" /> 순서 변경</button>
          <button type="button" class="st-btn st-btn-block" data-gap @click="showToast('곧 추가될 기능이에요.')"><MoveVertical class="w-4 h-4" :stroke-width="2" /> 구간 간격</button>
        </div>
      </aside>
    </div>

    <!-- 지우기 화면 (편집기 위에 겹쳐 연다 — 세션·저장·AI 엔진은 편집기 것을 그대로 쓴다) -->
    <StudioEraseScreen
      v-if="eraseOpen && selectedImage && isWide"
      ref="eraseScreen"
      :session="session"
      :image="selectedImage"
      :image-label="imageLabel(selectedImage)"
      :load-image="loadCanvasImage"
      :keys-enabled="!anyModalOpen"
      @close="eraseOpen = false"
      @toast="showToast"
    />

    <div v-if="toast" class="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-[10px] st-card st-shadow-float text-[13px] font-bold st-ink break-keep" style="z-index: 30" data-toast>{{ toast }}</div>

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
// 편집기 (3단계: 어두운 화면 + 전체 틀) — 상단바 / 아이콘 막대 / 재료 패널 / 가운데 / 오른쪽 [미니뷰|레이어].
// 지우기는 [지우기]로 여는 지우기 화면(StudioEraseScreen)에서 한다. 지우기 상태·자동 저장·이력·AI 엔진은 useEraseSession 하나가 든다.
// 어두운 색은 이 화면 바깥 요소의 `studio-root st-dark`(studio-tokens.css) 안에서만 — 몰·관리자에는 영향 없음.
// 가운데 긴 페이지(4단계), 사진 속성 패널(6단계), [사진] 패널 완성(7단계), 구간·미니뷰(8단계), 레이어(9단계)는 다음 단계.
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent, provide, h } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  ArrowLeft, Undo2, Redo2, Eye, Download, History, Sparkles, Hand, CircleHelp, Trash2, Eraser,
  LayoutTemplate, Rows3, Image as ImageIcon, Type, Shapes, Blend, Bookmark, PanelRightOpen, PanelRightClose, ArrowUpDown, MoveVertical,
} from 'lucide-vue-next'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioEraseScreen from '@/components/studio/StudioEraseScreen.vue'
import StudioPhotoPanel from '@/components/studio/StudioPhotoPanel.vue'
import {
  loadMyProject, listEditorImages, signViewUrls, signViewUrl, sortStudioImages, sortBySortOrder, hasSortOrderOverlap,
  renumberSortOrders, projectDisplayTitle, KIND_LABEL, SIGNED_URL_TTL,
} from '@/lib/studioProjects'
import { createImageCache } from '@/lib/studioImageCache'
import { useEraseSession } from '@/composables/useEraseSession'

provide('studioDark', true) // Teleport로 body에 붙는 모달도 어둡게 (StudioModal)

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

// 아이콘 막대. 3단계에서 동작하는 것은 [사진]. [구간]은 8단계, 나머지는 10단계 이후
const RAIL = [
  { key: 'template', label: '템플릿', icon: LayoutTemplate, soon: '어울리는 템플릿 고르기는 곧 추가될 기능이에요.' },
  { key: 'section', label: '구간', icon: Rows3, soon: '구간 추가·정리는 곧 추가될 기능이에요.' },
  { key: 'photo', label: '사진', icon: ImageIcon, soon: '' },
  { key: 'text', label: '텍스트', icon: Type, soon: '글자 넣기는 곧 추가될 기능이에요.' },
  { key: 'element', label: '요소', icon: Shapes, soon: '도형·아이콘 넣기는 곧 추가될 기능이에요.' },
  { key: 'bg', label: '배경합성', icon: Blend, soon: '배경 바꾸기는 곧 추가될 기능이에요.' },
  { key: 'saved', label: '저장값', icon: Bookmark, soon: '인트로·배송안내 같은 저장값 넣기는 곧 추가될 기능이에요.' },
]
const railItem = key => RAIL.find(r => r.key === key) || RAIL[2]

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
const activeTool = ref('photo')
const rightTab = ref('mini')
const toast = ref('')
const isWide = ref(true)
const wideRight = ref(true)   // 1280px 이상: 오른쪽 패널 항상 열림
const rightOpen = ref(true)
let loadSeq = 0
let leaveTarget = null
let leaveBypass = false
let toastTimer = null
let viewUrlTimer = null

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

function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '알 수 없음'
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`
  return `${Math.round(n / 1024)}KB`
}
/** 지우기 화면 부제: "02 대표 사진 · 1920 × 1920" */
function imageLabel(img) {
  const i = images.value.findIndex(x => x.id === img.id)
  const no = i >= 0 ? String(i + 1).padStart(2, '0') + ' ' : ''
  return `${no}${KIND_LABEL[img.kind] || ''} · ${img.width} × ${img.height}`
}

// ── 썸네일 서명 URL(10분) — 만료 전에 새로 받는다 (열어 둔 채 시간이 지나 lazy 로드되는 썸네일이 빈 네모가 되지 않게) ──
const VIEW_URL_REFRESH_MS = (SIGNED_URL_TTL - 60) * 1000
let viewUrlsIssuedAt = 0
async function refreshViewUrls() {
  const paths = images.value.filter(i => i.ingest_status === 'done' && i.original_path).map(i => i.original_path)
  if (paths.length === 0) return
  try {
    const urls = await signViewUrls(paths)
    viewUrls.value = urls
    viewUrlsIssuedAt = Date.now()
  } catch (e) {
    console.error('[StudioEditor] 썸네일 주소 갱신 실패:', e)
  }
}
async function resignViewUrl(path) {
  try {
    const { url } = await signViewUrl(path)
    const next = new Map(viewUrls.value); next.set(path, url); viewUrls.value = next
  } catch (e) {
    console.error('[StudioEditor] 썸네일 주소 다시 받기 실패:', path, e)
    showToast('사진 주소를 다시 받지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
}
function onVisible() {
  if (document.visibilityState === 'visible' && viewUrlsIssuedAt && Date.now() - viewUrlsIssuedAt > VIEW_URL_REFRESH_MS) refreshViewUrls()
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
    viewUrlsIssuedAt = Date.now()
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
const rightQuery = window.matchMedia('(min-width: 1280px)')
function onWideChange() {
  isWide.value = wideQuery.matches
  // 편집은 1024px 이상에서만 — 좁은 화면에서는 모델(약 200MB)을 받지 않는다
  if (isWide.value) session.startAiEngine()
  else eraseOpen.value = false
}
function onRightChange() {
  wideRight.value = rightQuery.matches
  rightOpen.value = rightQuery.matches // 1280px 미만이면 접고 시작 (가운데가 사라지지 않게)
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
  onRightChange()
  wideQuery.addEventListener('change', onWideChange)
  rightQuery.addEventListener('change', onRightChange)
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('visibilitychange', onVisible)
  viewUrlTimer = setInterval(refreshViewUrls, VIEW_URL_REFRESH_MS)
  load()
})

onUnmounted(() => {
  wideQuery.removeEventListener('change', onWideChange)
  rightQuery.removeEventListener('change', onRightChange)
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('visibilitychange', onVisible)
  clearInterval(viewUrlTimer)
  clearTimeout(toastTimer)
  session.dispose()
  imageCache.clear()
})
</script>

<style scoped>
.st-topbar { background: var(--st-bar, var(--st-surface)); }
/* 작업 바탕의 옅은 점 무늬 (시안) */
.st-dotgrid { background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px); background-size: 22px 22px; }
.st-rail-item {
  width: 60px; padding: 8px 0; border-radius: 10px; border: 0; background: transparent; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700; color: var(--st-ink-2);
}
.st-rail-item:hover { background: var(--st-card); color: var(--st-ink); }
.st-rail-item.is-active { background: var(--st-accent-soft); color: var(--st-accent); }
.st-ai-cta { height: 44px; padding: 0 16px 0 12px; gap: 8px; border-radius: 12px; box-shadow: 0 0 0 3px color-mix(in srgb, var(--st-ai) 22%, transparent); }
</style>
