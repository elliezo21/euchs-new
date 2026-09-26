<template>
  <div class="studio-root st-dark relative h-screen flex flex-col overflow-hidden" data-studio-editor>
    <!-- 상단바: ← · 로고 · 되돌리기 다시 · 작업명 · 저장 상태 · "직접 만들기 · 반자동" · [원클릭 AI 자동 제작] · 이력 · 미리보기 · 내보내기 -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-2 st-topbar st-border-b" data-topbar>
      <router-link :to="{ name: 'studio-projects' }" class="st-icon-btn" title="내 작업으로" data-back>
        <ArrowLeft class="w-5 h-5" :stroke-width="2" />
      </router-link>
      <span class="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center st-logo-mark text-[13px] font-extrabold shrink-0">E</span>
      <!-- 페이지 되돌리기·다시 (지우기 화면의 되돌리기는 그 사진의 지우기 이력 — 따로, 결정 8) -->
      <button type="button" class="st-icon-btn" :disabled="!pageCanUndo" :title="pageCanUndo ? '되돌리기' : '되돌릴 동작이 없어요'" data-action="undo" @click="pageSession.undo()"><Undo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn" :disabled="!pageCanRedo" :title="pageCanRedo ? '다시' : '다시 할 동작이 없어요'" data-action="redo" @click="pageSession.redo()"><Redo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
      <div class="min-w-0 ml-1 leading-tight" data-title-block>
        <div class="text-[14px] font-extrabold st-ink truncate">{{ project ? projectDisplayTitle(project) : '' }}</div>
        <template v-if="project">
          <button v-if="topSaveStatus === 'error'" type="button" class="text-[11px] font-bold st-danger-text underline" :title="topSaveDetail" data-save-status="error" @click="retryAllSaves">저장하지 못했어요 · 다시 시도</button>
          <button v-else-if="topSaveStatus === 'conflict'" type="button" class="text-[11px] font-bold st-danger-text underline" data-save-status="conflict" @click="reopenAnyConflict">저장 안 됨 · 다른 창과 충돌</button>
          <span v-else-if="topSaveStatus === 'pending' || topSaveStatus === 'saving'" class="text-[11px] st-muted" data-save-status="saving">저장 중…</span>
          <span v-else class="text-[11px] st-success-text" :title="savedTitle(topLastSavedAt)" data-save-status="saved">● 저장됨</span>
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
          :bake-state="bakeQueue.state" :erased-thumb="erasedThumb"
          @select="selectFromPanel" @open-erase="openErase" @add="addOpen = true" @retry-url="resignViewUrl" @retry-bake="requestBake"
        />
        <div v-else class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center" data-panel-soon>
          <span class="st-icon-box"><component :is="railItem(activeTool).icon" class="w-5 h-5" :stroke-width="2" /></span>
          <div class="text-[14px] font-bold st-ink">{{ railItem(activeTool).label }}</div>
          <p class="st-desc break-keep">{{ railItem(activeTool).soon }}</p>
        </div>
      </aside>

      <!-- 가운데: 긴 한 장 페이지 (4단계, DOM — 구간이 위에서 아래로 쌓인다) -->
      <section v-if="isWide" class="flex-1 min-w-0 relative st-canvas-bg st-dotgrid" data-canvas-area>
        <div ref="pageScroll" class="absolute inset-0 overflow-auto" data-page-scroll @pointerdown.self="selectedItemId = null">
          <p v-if="pageSession.readError.value" class="p-6 text-[13px] font-bold st-danger-text break-keep" data-page-error>{{ pageSession.readError.value }}</p>
          <div v-else-if="page && page.sections.length" class="pt-8 pb-24" :style="{ paddingLeft: `${PAGE_GUTTER}px`, paddingRight: `${PAGE_GUTTER}px` }" @pointerdown.self="selectedItemId = null">
            <StudioPageView
              ref="pageView"
              :page="page" :zoom="zoom" :images-by-id="imagesById" :views="views" :selected-item-id="selectedItemId" :bake-state="bakeQueue.state"
              @select="onPageSelect" @clear-selection="selectedItemId = null" @move="onPageMove"
              @open-erase="openErase" @retry-image="retryView"
            />
          </div>
          <div v-else-if="page" class="absolute inset-0 flex items-center justify-center st-desc break-keep" data-page-empty>
            사진이 준비되면 여기에 상세페이지가 만들어져요
          </div>
        </div>
        <!-- 아래 막대: 확대 · 폭 (시안 ①) -->
        <div v-if="page" class="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-2 px-2 py-1.5 rounded-[12px] st-card st-shadow-float" style="z-index: 5" data-zoom-bar>
          <div class="st-seg">
            <button
              v-for="z in ZOOM_PRESETS" :key="z" type="button" class="st-seg-item" :class="zoomMode === z ? 'is-active' : ''"
              :data-zoom="z" @click="zoomMode = z"
            >{{ Math.round(z * 100) }}%</button>
            <button type="button" class="st-seg-item" :class="zoomMode === 'fit' ? 'is-active' : ''" data-zoom="fit" @click="zoomMode = 'fit'">맞춤<span v-if="zoomMode === 'fit'" class="ml-1 opacity-70">{{ Math.round(zoom * 100) }}%</span></button>
          </div>
          <span class="w-px h-5" style="background: var(--st-line-strong)" />
          <span class="text-[12px] font-bold st-ink-2 pr-1 whitespace-nowrap" data-page-width>폭 {{ page.width }}px · {{ PAGE_WIDTH_LABEL }}</span>
        </div>
        <!-- 사진 정보 + [지우기] (3단계 임시 카드 — 페이지에서 누른 사진 기준. 6단계에서 왼쪽 사진 속성 패널로 옮긴다) -->
        <div v-if="selectedImage && !eraseOpen" class="absolute right-3 top-3 w-[220px] st-card p-3" style="z-index: 5" data-image-info>
          <div class="text-[12px] font-bold st-ink-2 truncate">{{ KIND_LABEL[selectedImage.kind] }}<span v-if="selectedImage.kind === 'upload' && selectedImage.upload_name"> · {{ selectedImage.upload_name }}</span></div>
          <div class="text-[11px] st-muted">{{ selectedImage.width }}×{{ selectedImage.height }}px · {{ formatBytes(selectedImage.bytes) }} · 지움 {{ selectedFillCounts.done }}<span v-if="selectedFillCounts.redo"> · 다시 지우기 {{ selectedFillCounts.redo }}</span></div>
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
      @close="onEraseClosed"
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

    <!-- 페이지 저장 충돌 (page_version) -->
    <StudioModal :open="pageSession.conflict.value" title="다른 창에서 이 작업이 바뀌었어요" @close="pageSession.conflict.value = false">
      최신 내용을 불러올까요? 불러오면 이 창에서 저장되지 않은 페이지 변경은 없어져요.
      <p v-if="pageSession.conflictError.value" class="mt-2 text-[13px] font-bold st-danger-text">{{ pageSession.conflictError.value }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="pageSession.conflict.value = false">취소</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="pageSession.conflictLoading.value" data-page-conflict-reload @click="reloadPageConflict">불러오기</button>
      </template>
    </StudioModal>

    <!-- 저장 안 된 채 떠나기 -->
    <StudioModal :open="leaveOpen" title="저장되지 않은 변경이 있어요" @close="leaveOpen = false">
      지금 나가면 마지막 변경이 저장되지 않아요.
      <p v-if="topSaveDetail" class="mt-2 text-[13px] st-danger-text break-keep">{{ topSaveDetail }}</p>
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
// 4단계: 가운데 = 긴 한 장 페이지(StudioPageView, DOM). 페이지 문서·이력·자동 저장은 usePageSession, 화면용 작은 사진은 studioViewImage.
//   상단 되돌리기·다시·Ctrl+Z = 페이지 이력. 지우기 화면이 열려 있으면 Ctrl+Z = 그 사진의 지우기 이력 (서로 섞이지 않는다)
// 사진 속성 패널(6단계), [사진] 패널 완성(7단계), 구간·미니뷰(8단계), 레이어(9단계)는 다음 단계.
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted, provide } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  ArrowLeft, Undo2, Redo2, Eye, Download, History, Sparkles, Hand, CircleHelp, Trash2, Eraser,
  LayoutTemplate, Rows3, Image as ImageIcon, Type, Shapes, Blend, Bookmark, PanelRightOpen, PanelRightClose, ArrowUpDown, MoveVertical,
} from 'lucide-vue-next'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioEraseScreen from '@/components/studio/StudioEraseScreen.vue'
import StudioPhotoPanel from '@/components/studio/StudioPhotoPanel.vue'
import StudioPageView from '@/components/studio/StudioPageView.vue'
import {
  loadMyProject, listEditorImages, signViewUrls, signViewUrl, sortStudioImages, sortBySortOrder, hasSortOrderOverlap,
  renumberSortOrders, projectDisplayTitle, KIND_LABEL, SIGNED_URL_TTL,
} from '@/lib/studioProjects'
import { createImageCache } from '@/lib/studioImageCache'
import { useEraseSession } from '@/composables/useEraseSession'
import { useBakeQueue } from '@/composables/useBakeQueue'
import { fillCounts } from '@/lib/studioEdit'
import { usePageSession } from '@/composables/usePageSession'
import { createViewImageStore } from '@/lib/studioViewImage'
import { moveItem, firstItemOfImage, findItem, pageImageIds, fitZoom, PAGE_WIDTH, PAGE_WIDTH_LABEL, ZOOM_PRESETS } from '@/lib/studioPage'
import { LABELS } from '@/lib/studioHistory'
import { unsavedReasons, guardBeforeUnload, eraseCloseMode, savedTitle } from '@/lib/studioSaveGuard'

provide('studioDark', true) // Teleport로 body에 붙는 모달도 어둡게 (StudioModal)
// Fabric(StudioCanvas)은 지우기 화면(StudioEraseScreen)이 열릴 때만 받는다. 페이지는 DOM (방식 C)

const PAGE_GUTTER = 110 // 페이지 양옆 여백 (왼쪽에 구간 이름이 들어간다)

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
  selectedImage, selectedFillCount, selectedFillCounts,
  saveStatus, saveDetail, conflictId, conflictError, conflictLoading,
  fillCount, undoEdit, redoEdit, retrySave, reopenConflict, reloadConflicted,
} = session

const doneImages = computed(() => images.value.filter(i => i.ingest_status === 'done'))
const imagesById = computed(() => new Map(images.value.map(i => [i.id, i])))

// ── 페이지 (4단계) ──
// 기본 배치에 넣을 사진: 가져오기·올리기가 끝났고(done) 안 쓸 사진으로 빼지 않은 것(included), 지금 목록 순서
const pageSession = usePageSession({
  usableImages: () => images.value.filter(i => i.ingest_status === 'done' && i.included === true),
  showToast,
})
const page = pageSession.page
const pageCanUndo = computed(() => pageSession.canUndoNow.value && !eraseOpen.value)
const pageCanRedo = computed(() => pageSession.canRedoNow.value && !eraseOpen.value)
const selectedItemId = ref(null)
const pageView = ref(null)
const pageScroll = ref(null)

// 상단 저장 상태 = 사진 지우기 저장과 페이지 저장 중 더 나쁜 것
const SAVE_RANK = { saved: 0, pending: 1, saving: 2, error: 3, conflict: 4 }
const pageWorse = computed(() => SAVE_RANK[pageSession.saveStatus.value] > SAVE_RANK[saveStatus.value])
const topSaveStatus = computed(() => (pageWorse.value ? pageSession.saveStatus.value : saveStatus.value))
const topSaveDetail = computed(() => (pageWorse.value ? pageSession.saveDetail.value : saveDetail.value) || pageSession.saveDetail.value || saveDetail.value)
// 마지막 저장 시각 = 사진 지우기 저장과 페이지 저장 중 늦은 것 (상단 "저장됨"에 마우스를 올리면 보인다)
const topLastSavedAt = computed(() => {
  const t = [session.lastSavedAt.value, pageSession.lastSavedAt.value].filter(Number.isFinite)
  return t.length ? Math.max(...t) : null
})
function retryAllSaves() { retrySave(); pageSession.retrySave() }
function reopenAnyConflict() {
  if (pageSession.saveStatus.value === 'conflict') pageSession.conflict.value = true
  else reopenConflict()
}
async function reloadPageConflict() {
  await pageSession.reloadConflicted()
  if (selectedItemId.value && page.value && !findItem(page.value, selectedItemId.value)) selectedItemId.value = null
}

// 확대: 50·75·100% 또는 맞춤(가운데 폭에 맞춰, 최대 100%)
const zoomMode = ref('fit')
const areaWidth = ref(0)
const zoom = computed(() => (zoomMode.value === 'fit' ? fitZoom(areaWidth.value, page.value?.width || PAGE_WIDTH, PAGE_GUTTER) : zoomMode.value))
let areaObserver = null
watch(pageScroll, el => {
  areaObserver?.disconnect()
  areaObserver = null
  if (!el) return
  areaObserver = new ResizeObserver(entries => { areaWidth.value = entries[0].contentRect.width })
  areaObserver.observe(el)
})

function onPageSelect({ itemId, imageId }) {
  selectedItemId.value = itemId
  if (imageId !== selectedImageId.value && doneImages.value.some(i => i.id === imageId)) selectImage(imageId)
}
function onPageMove({ itemId, x, y }) {
  if (!page.value) return
  pageSession.apply(moveItem(page.value, itemId, x, y), LABELS.itemMove)
}
// 목록·↑↓로 사진을 바꾸면 페이지의 그 사진(첫 자리)에 테두리
watch(selectedImageId, id => {
  const cur = selectedItemId.value && page.value ? findItem(page.value, selectedItemId.value) : null
  if (cur && cur.item.imageId === id) return
  selectedItemId.value = id && page.value ? firstItemOfImage(page.value, id) : null
})
function selectFromPanel(id) {
  selectImage(id)
  const itemId = page.value ? firstItemOfImage(page.value, id) : null
  if (itemId) nextTick(() => pageView.value?.scrollToItem(itemId))
}

// 화면용 작은 사진 — 페이지에 있는 사진을 지운 결과로 그려 줄여 둔다. 지우기 화면이 열려 있는 동안은 멈췄다가 닫으면 다시 맞춘다
const views = reactive({}) // image id → { status, url, error, problems }
const viewStore = createViewImageStore({
  pageWidth: PAGE_WIDTH,
  dpr: window.devicePixelRatio || 1,
  onUpdate(id, entry) { views[id] = { ...entry } },
})
// 구운 사진(final JPG)이 최신이면 그 버전 — 지우기가 저장된 상태이고 final_rendered_version = edit_version일 때만 (아니면 실시간 합성)
function finalVersionOf(row) {
  const v = row.edit_version
  return Number.isInteger(v) && row.final_rendered_version === v && session.isSaved(row.id) && !bakeQueue.state[row.id] ? v : null
}
const viewWants = computed(() => {
  if (!page.value || eraseOpen.value || !isWide.value) return []
  return pageImageIds(page.value)
    .map(id => imagesById.value.get(id))
    .filter(r => r && r.ingest_status === 'done')
    .map(row => ({ row, layers: session.layerMap[row.id] || [], finalVersion: finalVersionOf(row) }))
})
watch(viewWants, list => { for (const w of list) viewStore.want(w.row, w.layers, { finalVersion: w.finalVersion }) }, { immediate: true })
function retryView(imageId) {
  const row = imagesById.value.get(imageId)
  if (row) viewStore.retry(row, session.layerMap[imageId] || [], { finalVersion: finalVersionOf(row) })
}
// [사진] 목록 썸네일: 페이지용으로 만든 사진(지운 결과 또는 구운 사진)이 있으면 그것, 없으면 원본 썸네일
function erasedThumb(id) {
  const v = views[id]
  return v && v.status === 'ready' && v.url ? v.url : null
}

// ── 지운 사진 굽기 (5단계) — 지우기 화면이 닫힐 때 그 사진을 원본 크기 JPG로 굽는다. 화면은 막지 않는다 ──
const bakeQueue = useBakeQueue({
  onBaked(id, version) {
    const row = images.value.find(i => i.id === id)
    if (row) row.final_rendered_version = version // 페이지·썸네일이 구운 사진으로 바뀐다 (viewWants)
  },
})
/**
 * 굽기 요청 (지우기 화면 닫힘·[다시 시도]). 굽지 않는 경우:
 *   지우기 저장이 안 끝남(실패·충돌 — 상단 저장 상태가 알린다) / 지우기가 없음(원본이 곧 최종) /
 *   결과 없는 AI 레이어가 있음("다시 지우기를 마치면 적용돼요") / 이미 최신(final_rendered_version = edit_version)
 */
async function requestBake(id) {
  const row = images.value.find(i => i.id === id && i.ingest_status === 'done')
  if (!row) return
  const saved = await session.flush(id) // 굽는 버전 = 저장이 끝난 edit_version
  if (!saved || !session.isSaved(id)) {
    console.warn('[StudioEditor] 지우기 저장이 끝나지 않아 굽지 않음 (저장 후 다시 [완료] 또는 [다시 시도]):', id)
    return
  }
  const layers = session.layerMap[id] || []
  const counts = fillCounts(layers)
  if (counts.redo > 0) { bakeQueue.markBlocked(id); return }
  if (counts.done === 0) { bakeQueue.clear(id); return }
  if (row.final_rendered_version === row.edit_version) { bakeQueue.clear(id); return }
  bakeQueue.request(row, layers, row.edit_version)
}
function clearViews() {
  viewStore.clear()
  for (const k of Object.keys(views)) delete views[k]
}
// 장수 한도에 드는 수 — 서버 prepare와 같은 방식: done + 직접 올린 pending (1688의 가져오지 않은 pending은 세지 않음)
const usedCount = computed(() => images.value.filter(i =>
  i.ingest_status === 'done' || (i.kind === 'upload' && i.ingest_status === 'pending')).length)
const anyModalOpen = computed(() => addOpen.value || clearAllOpen.value || !!conflictId.value || leaveOpen.value || pageSession.conflict.value)

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
    if (p) pageSession.syncFromServer(p)
    if (!selectedImage.value) {
      selectedImageId.value = doneImages.value[0]?.id || null
      session.selectedLayerId.value = null
    }
    // 기본 배치를 새로 만들었으면(아직 안 바꾼 페이지 + 사진 추가) 아이템 id가 바뀐다 → 고른 사진의 자리로 다시 잡는다
    if (selectedItemId.value && !(page.value && findItem(page.value, selectedItemId.value))) {
      selectedItemId.value = page.value && selectedImageId.value ? firstItemOfImage(page.value, selectedImageId.value) : null
    }
    syncEraseFromRoute() // ?erase=<사진 id>로 새로고침·진입했으면 그 사진의 지우기 화면을 연다
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

// ── 지우기 화면 ↔ 주소 (?erase=<사진 id>) ──
// 열 때 history 항목을 하나 쌓는다(router.push) → 크롬 ← = 지우기 화면만 닫고 편집기에 남는다.
// [완료]/[페이지로]로 닫으면 쌓은 항목을 걷어낸다 (onEraseClosed). 되돌리기(Ctrl+Z)와는 상관없다.
let eraseByHistory = false // 크롬 ← 로 닫는 중 (라우터 가드 안) — onEraseClosed가 주소를 다시 건드리지 않게
function queryWithoutErase(q) {
  const { erase, ...rest } = q
  return rest
}
function canErase(id) {
  return isWide.value && images.value.some(i => i.id === id && i.ingest_status === 'done')
}
function openErase(id) {
  if (!canErase(id)) return
  if (route.query.erase === id) { selectImage(id); eraseOpen.value = true; return }
  router.push({ query: { ...route.query, erase: id } }) // 주소가 바뀌면 syncEraseFromRoute가 연다
}
/** 주소의 erase에 맞춰 지우기 화면을 열거나 닫는다. 없는 사진·이 작업 사진이 아니면 주소에서 빼고 편집기만 (안내 없이) */
function syncEraseFromRoute() {
  const id = typeof route.query.erase === 'string' ? route.query.erase : null
  if (!id) { eraseOpen.value = false; return }
  if (!project.value) return // 불러오기 전 — load()가 사진 목록을 채운 뒤 다시 부른다
  if (!canErase(id)) {
    console.info('[StudioEditor] 주소의 지우기 사진을 열 수 없어 편집기만 엽니다:', id)
    eraseOpen.value = false
    router.replace({ query: queryWithoutErase(route.query) })
    return
  }
  selectImage(id)
  eraseOpen.value = true
}
watch(() => route.query.erase, syncEraseFromRoute)

/**
 * 지우기 화면이 닫혔을 때 — [완료]/[페이지로]면 열 때 쌓은 history 항목을 걷어낸다.
 *   바로 앞 항목이 이 편집기(지우기 없음)면 router.back() → 그 뒤 크롬 ←는 편집기 이전 화면으로 간다(지우기가 다시 열리지 않음).
 *   주소로 바로 들어와 앞 항목이 없거나 다른 화면이면 router.replace로 주소에서 erase만 뺀다 (back 하면 편집기를 떠나므로).
 */
function onEraseClosed() {
  const closedId = selectedImageId.value
  eraseOpen.value = false
  if (closedId) requestBake(closedId) // [완료]·[페이지로]·크롬 ← 모두 — 바뀐 것이 없으면(이미 최신) 굽지 않는다
  if (eraseByHistory || !route.query.erase) return
  const editorPath = router.resolve({ query: queryWithoutErase(route.query) }).fullPath
  if (eraseCloseMode(window.history.state?.back ?? null, editorPath) === 'back') router.back()
  else router.replace({ query: queryWithoutErase(route.query) })
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
  // 지우기 화면이 열린 채 편집기 밖으로 가려 하면(주소로 바로 들어와 앞 항목이 다른 화면일 때 크롬 ← 등) 지우기 화면만 닫는다.
  // [완료]와 같은 확인을 거친다 — AI가 채우는 중·저장 못 한 AI 결과가 있으면 한 번 알리고, 5초 안에 다시 누르면 닫는다
  if (eraseOpen.value) {
    eraseByHistory = true
    let closed
    try { closed = !eraseScreen.value || eraseScreen.value.requestClose() } finally { eraseByHistory = false }
    if (closed) {
      eraseOpen.value = false
      // 이동은 취소했으므로 주소에 남은 erase만 뺀다 (취소된 크롬 ←를 라우터가 되돌린 뒤)
      setTimeout(() => { if (route.query.erase && !eraseOpen.value) router.replace({ query: queryWithoutErase(route.query) }) }, 0)
    }
    return false
  }
  if (!session.hasUnsaved() && !pageSession.hasUnsaved()) return true
  const [okEdit, okPage] = await Promise.all([session.flush(), pageSession.flush()])
  if (okEdit && okPage) return true
  leaveTarget = to
  leaveOpen.value = true
  return false
}
onBeforeRouteLeave(guardLeave)
onBeforeRouteUpdate(async (to, from) => {
  if (to.params.projectId !== from.params.projectId) return guardLeave(to)
  // 크롬 ← 로 ?erase가 빠짐 = 지우기 화면만 닫기. [완료]와 같은 확인 — 막으면(false) 라우터가 주소를 되돌린다
  if (from.query.erase && !to.query.erase && eraseOpen.value && eraseScreen.value) {
    eraseByHistory = true
    try { return eraseScreen.value.requestClose() } finally { eraseByHistory = false }
  }
  return true
})

function leaveAnyway() {
  leaveOpen.value = false
  leaveBypass = true
  if (leaveTarget) router.push(leaveTarget).finally(() => { leaveBypass = false })
}

// ── 나가기 경고 (새로고침·탭 닫기·다른 사이트) — 저장 안 된 것이 있을 때만 브라우저 기본 창을 띄운다 ──
// 앱 안 이동(다른 화면·지우기 화면 닫기)은 라우터 가드의 우리 안내가 맡는다 — beforeunload는 문서를 떠날 때만 불려 둘이 겹치지 않는다
function unsavedNow() {
  const ai = session.aiSaveState.value
  return unsavedReasons({
    aiFailed: ai.count,
    aiPending: ai.pending,
    aiBusy: eraseOpen.value && Object.values(session.aiLayerStates.value).includes('busy'),
    editUnsaved: session.hasUnsaved(),
    pageUnsaved: pageSession.hasUnsaved(),
    draft: eraseOpen.value && !!session.canvasDraft.value,
    baking: bakeQueue.pendingCount.value,
  })
}
function onBeforeUnload(e) {
  const reasons = unsavedNow()
  // 남은 저장은 시도는 하되, 끝을 기다릴 수 없으므로 브라우저 경고를 띄운다
  if (reasons.includes('edit')) session.flush()
  if (reasons.includes('page')) pageSession.flush()
  guardBeforeUnload(e, reasons)
}

// ── 키보드: ↑/↓ 이전·다음 사진(목록에서만), Ctrl(Cmd)+Z 되돌리기, Ctrl(Cmd)+Shift+Z·Ctrl+Y 다시 ──
// 되돌리기 대상: 지우기 화면이 열려 있으면 그 사진의 지우기 이력, 아니면 페이지 이력 (입력칸에서는 브라우저 기본 동작)
function onKeyDown(e) {
  if (!isWide.value || anyModalOpen.value || e.altKey) return
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  if (e.ctrlKey || e.metaKey) {
    // e.code 기준: 한글 입력 상태에서도 같은 키로 동작
    const undo = eraseOpen.value ? undoEdit : pageSession.undo
    const redo = eraseOpen.value ? redoEdit : pageSession.redo
    if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); undo() }
    else if ((e.code === 'KeyZ' && e.shiftKey) || (e.code === 'KeyY' && !e.shiftKey)) { e.preventDefault(); redo() }
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
  else if (eraseOpen.value || route.query.erase) {
    eraseOpen.value = false
    router.replace({ query: queryWithoutErase(route.query) })
  }
}
function onRightChange() {
  wideRight.value = rightQuery.matches
  rightOpen.value = rightQuery.matches // 1280px 미만이면 접고 시작 (가운데가 사라지지 않게)
}

watch(() => route.params.projectId, (id, old) => {
  if (!id || id === old) return
  project.value = null
  selectedImageId.value = null
  selectedItemId.value = null
  session.selectedLayerId.value = null
  eraseOpen.value = false
  clearViews()
  bakeQueue.reset()
  load()
})

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·사진·서명 URL·편집 상태를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    eraseOpen.value = false
    session.resetAll()
    pageSession.resetAll()
    bakeQueue.reset()
    clearViews()
    selectedItemId.value = null
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
  pageSession.dispose()
  bakeQueue.dispose()
  clearViews()
  areaObserver?.disconnect()
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
