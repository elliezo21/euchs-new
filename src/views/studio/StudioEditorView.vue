<template>
  <div class="h-screen flex flex-col overflow-hidden">
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
        <!-- 캔버스 도구 막대의 [되돌리기][다시]와 같은 동작 -->
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
        <p class="st-desc-sm break-keep">화면 폭이 1024px 이상인 컴퓨터에서 열면 사진의 중국어를 지울 수 있어요.</p>
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
          <!-- included(사용/빼둔 사진)는 1-6b-2에서 연결 — 지금은 자리만 -->
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

      <!-- 가운데: 캔버스 -->
      <section v-if="isWide" class="flex-1 min-w-0 relative st-canvas-bg" data-canvas-area>
        <StudioCanvas
          v-if="selectedImage"
          :image="selectedImage"
          :layers="selectedLayers"
          :selected-id="selectedLayerId"
          :load-image="loadCanvasImage"
          :keys-enabled="!anyModalOpen"
          :can-undo="canUndoNow"
          :can-redo="canRedoNow"
          :history-steps="historySteps"
          :ai-engine="aiEngine"
          :ai-state="aiState"
          :erase-request="eraseRequest"
          :draft="canvasDraft"
          :brush-size="brushSize"
          :brush-mode="brushMode"
          @draft-rect="setDraftRect"
          @brush-stroke="addBrushStroke"
          @execute="executeFill"
          @change="changeFill"
          @select="id => (selectedLayerId = id)"
          @remove="removeFill"
          @undo="undoEdit"
          @redo="redoEdit"
          @jump="jumpEdit"
          @ai="applyAiResult"
          @ai-states="s => (aiLayerStates = s)"
          @tool="t => (canvasTool = t)"
        />
        <div v-else class="absolute inset-0 flex items-center justify-center st-desc">
          {{ doneImages.length ? '왼쪽에서 사진을 고르세요' : '완료된 사진이 아직 없어요' }}
        </div>
        <div v-if="toast" class="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-[10px] st-surface st-shadow-float text-[13px] font-bold st-ink break-keep" style="z-index: 6">{{ toast }}</div>
      </section>

      <!-- 오른쪽 패널 -->
      <aside v-if="isWide" class="w-[300px] shrink-0 flex flex-col st-surface st-border-l">
        <div class="flex-1 overflow-y-auto p-5">
          <template v-if="!selectedImage">
            <p class="st-desc">사진을 선택하면 여기서 중국어를 지울 수 있어요.</p>
          </template>

          <!-- 영역 선택 (실행 전 영역 포함) -->
          <template v-else-if="selectedFill">
            <h3 class="st-h-card">글자 지우기</h3>
            <p v-if="selectedIsDraft" class="mt-2 text-[13px] font-bold st-accent-text break-keep" data-panel-draft-hint>
              {{ selectedFill.shape === 'brush' ? '다 칠한 뒤 [AI로 지우기] 또는 [단색]을 누르세요' : '크기를 맞춘 뒤 [AI로 지우기] 또는 [단색]을 누르세요' }}
            </p>
            <div class="mt-4 st-label">지우는 방식 <span class="st-desc-sm">(누르면 바로 지워요)</span></div>
            <div class="mt-2 space-y-2">
              <!-- 방식 카드 = 실행 버튼. 지금 적용된 방식은 선택 표시 (실행 전 영역·예전 '자연스럽게'는 표시 없음) -->
              <button
                v-for="m in METHOD_CARDS" :key="m.key" type="button"
                class="st-card w-full p-3 text-left"
                :class="!selectedIsDraft && selectedFill.method === m.key ? 'is-selected' : 'st-card-hover'"
                :disabled="selectedAiState === 'busy'"
                :data-method="m.key"
                @click="executeFill(selectedFill.id, m.key)"
              >
                <div class="flex items-center gap-2">
                  <span class="text-[14px] font-bold st-ink">{{ m.label }}</span>
                  <span v-if="m.recommended" class="st-badge st-badge-accent">추천</span>
                  <span v-if="m.key === 'ai' && selectedAiState === 'busy'" class="ml-auto st-desc-sm">AI가 채우는 중…</span>
                  <span v-else-if="m.key === 'ai' && selectedAiState === 'loading'" class="ml-auto st-desc-sm">불러오는 중…</span>
                </div>
                <div class="mt-0.5 st-desc-sm break-keep">{{ m.desc }}</div>
              </button>
            </div>
            <p v-if="!selectedIsDraft && selectedFill.method === 'coons'" class="mt-2 st-desc-sm break-keep" data-coons-notice>
              예전 방식(자연스럽게)으로 지운 영역이에요. 위 방식을 누르면 그 방식으로 다시 지워요.
            </p>
            <p v-if="!selectedIsDraft && selectedFill.method === 'ai' && (selectedAiState === 'needs' || selectedAiState === 'failed')" class="mt-2 st-desc-sm break-keep" data-ai-stale>
              영역이 바뀌어 결과가 맞지 않아요. [AI로 지우기]를 누르면 다시 지워요.
            </p>

            <!-- 붓 (실행 전 붓 영역): 크기·칠하기/덜어내기·초기화 -->
            <template v-if="selectedIsDraft && selectedFill.shape === 'brush'">
              <div class="mt-5"><BrushControls /></div>
              <button type="button" class="st-btn st-btn-block mt-3" data-panel-brush-reset @click="removeFill(selectedFill.id)">초기화 (칠한 것 지우기)</button>
            </template>
            <p v-if="selectedFill.method === 'ai' || selectedIsDraft" class="mt-3 st-desc-sm break-keep" data-ai-guide>
              AI 지우기는 한 번에 완벽하지 않을 수 있어요. 마음에 안 들면 네모를 조금 넓게 다시 그리거나 [되돌리기] 하세요.
              옷·사람·무늬 위 글자는 곧 나올 [덮기]가 더 깔끔해요.
            </p>

            <div class="mt-5 flex items-center">
              <span class="st-label">가장자리 여유</span>
              <span class="ml-auto text-[13px] font-bold st-ink" data-pad-value>{{ selectedFill.pad }}px</span>
            </div>
            <input
              type="range" :min="PAD_MIN" :max="PAD_MAX" step="1" class="mt-2 w-full st-range"
              :value="selectedFill.pad" aria-label="가장자리 여유"
              @input="e => setPad(selectedFill.id, Number(e.target.value))"
              @change="recordPad"
            />
            <p class="mt-1 st-desc-sm break-keep">글자보다 조금 넉넉하게, 선에서 떨어지게 그리면 더 깨끗해요.</p>
            <p class="mt-0.5 st-desc-sm break-keep">{{ selectedFill.shape === 'brush' ? '칠한 모양보다 이만큼 더 넓게 메워요.' : '그린 네모보다 이만큼 더 넓게 메워요 (점선).' }}</p>
            <p v-if="selectedFill.method === 'ai' && selectedAiMinGrow" class="mt-0.5 st-desc-sm break-keep" data-ai-min-grow>AI는 이 사진에서 최소 {{ selectedAiMinGrow }}px 넓게 메워요.</p>

            <div class="mt-5 p-3 rounded-[10px] st-soft-bg">
              <div class="flex items-center gap-1.5 text-[13px] font-bold st-ink"><Info class="w-4 h-4" :stroke-width="2" /> 사진 위 글자는 덮기를 쓰세요</div>
              <p class="mt-1 st-desc-sm break-keep">사람·물건 위에 있는 글자는 지우면 자국이 남아요. 덮기는 곧 나와요.</p>
            </div>
          </template>

          <!-- 사진 정보 -->
          <template v-else>
            <h3 class="st-h-card">사진 정보</h3>
            <dl class="mt-3 space-y-2 text-[13px]">
              <div class="flex"><dt class="st-muted w-20 shrink-0">종류</dt><dd class="st-ink-2 font-bold">{{ KIND_LABEL[selectedImage.kind] }}</dd></div>
              <div class="flex"><dt class="st-muted w-20 shrink-0">원본 크기</dt><dd class="st-ink-2 font-bold">{{ selectedImage.width }}×{{ selectedImage.height }}px</dd></div>
              <div class="flex"><dt class="st-muted w-20 shrink-0">파일 크기</dt><dd class="st-ink-2 font-bold">{{ formatBytes(selectedImage.bytes) }}</dd></div>
            </dl>
            <!-- 붓 도구일 때: 크기·칠하기/덜어내기 -->
            <div v-if="canvasTool === 'brush'" class="mt-5" data-brush-panel>
              <h3 class="st-h-card">붓</h3>
              <div class="mt-3"><BrushControls /></div>
            </div>
            <div class="mt-5 p-3 rounded-[10px] st-accent-soft-bg">
              <p class="text-[13px] font-bold st-accent-text break-keep">위쪽 [붓]으로 중국어 위를 칠하거나 [네모]로 감싸세요.</p>
              <p class="mt-1 st-desc-sm break-keep">스페이스를 누른 채 끌면 화면이 움직이고, Ctrl+휠로 확대해요.</p>
            </div>
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
        <button type="button" class="st-btn st-btn-danger" data-confirm-clear @click="clearAllFills">모두 삭제</button>
      </template>
    </StudioModal>

    <!-- 저장 충돌 -->
    <StudioModal :open="!!conflictId" title="다른 창에서 이 사진을 수정했어요" @close="conflictId = null">
      최신 내용을 불러올까요? 불러오면 이 창에서 저장되지 않은 변경은 없어져요.
      <p v-if="conflictError" class="mt-2 text-[13px] font-bold st-danger-text">{{ conflictError }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="conflictId = null">취소</button>
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
// 편집기 (1-6b-1) — 사진 한 장을 캔버스로 크게 보고, 중국어 위에 지우기 영역을 그려 주변 픽셀로 메운다.
// 원본 파일은 바꾸지 않는다. 편집 내용은 studio_images.edit(원본 픽셀 좌표)에 자동 저장하고, 열 때마다 원본에서 다시 계산한다.
// 되돌리기·다시·간단 이력(1-6b-2a)은 사진별 스냅샷(studioHistory.js), 저장은 기존 자동 저장 경로 그대로.
// 덮기·순서 바꾸기·원본 비교(1-6b-2), 글자(1-7), 내보내기(1-9)는 다음 단계 — 버튼은 비활성 그대로.
// AI 지우기(1-6b-3b): 새 영역 기본값 'ai'. 영역을 정한 뒤 [지우기]를 눌러야 계산한다 (자동 계산·자동 재계산 없음).
//   엔진(LaMa 워커)은 편집기에 들어오면 바로 준비를 시작하고 떠나면 정리한다.
//   AI 결과는 PNG로 저장되고(studioAiPatch), 도착하면 그 레이어에 ai 필드를 붙인다 — 이력 "AI 지우기" 한 단계.
import { ref, shallowRef, reactive, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent, h } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  ArrowLeft, Undo2, Redo2, Eye, Download, Image as ImageIcon, ImagePlus, Type, LayoutTemplate, Layers, Bookmark,
  Trash2, Info,
} from 'lucide-vue-next'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import {
  loadMyProject, listEditorImages, signViewUrls, sortStudioImages, sortBySortOrder, hasSortOrderOverlap,
  renumberSortOrders, projectDisplayTitle, KIND_LABEL,
} from '@/lib/studioProjects'
import { studioErrorMessage } from '@/lib/studioApi'
import {
  readLayers, buildEdit, fillLayersOf, isValidFillLayer, newFillId, createEditSaver, fetchImageEdit,
  MAX_LAYERS, PAD_MIN, PAD_MAX, PAD_DEFAULT,
} from '@/lib/studioEdit'
import { createImageCache } from '@/lib/studioImageCache'
import {
  createHistory, push as pushHistory, undo as undoHistory, redo as redoHistory, jumpTo as jumpHistory,
  clear as clearHistory, canUndo, canRedo, list as listHistory, current as currentStep, amendCurrent as amendHistory, LABELS,
} from '@/lib/studioHistory'
import { clampRectToImage } from '@/lib/studioCoords'
import {
  brushBBox, translateBrush, brushPointCount, BRUSH_SIZE_MIN, BRUSH_MAX_STROKES, BRUSH_MAX_POINTS,
} from '@/lib/studioBrush'
import { fillPlan } from '@/lib/studioFillPlan'
import { aiK } from '@/lib/studioAi/aiGeometry'
import { createAiEngine } from '@/lib/studioAi/aiEngine'

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
// '자연스럽게'(coons)는 해성 판정 "못 씀"으로 뺐다 (1-6b-3b). 저장된 coons 레이어는 그대로 그리고 [AI로 바꾸기]를 보여준다
const METHOD_CARDS = [
  { key: 'ai', label: 'AI로 지우기', desc: 'AI가 주변을 보고 자연스럽게 채워요', recommended: true },
  { key: 'solid', label: '단색', desc: '한 가지 색으로 채워요' },
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
const layerMap = reactive({})          // image id → 레이어 배열 (화면의 현재 값)
const histories = reactive({})         // image id → studioHistory (세션 동안만, 사진을 바꿔도 유지)
const selectedImageId = ref(null)
const selectedLayerId = ref(null)
const saveStatus = ref('saved')
const saveDetail = ref('')
const conflictId = ref(null)
const conflictError = ref('')
const conflictLoading = ref(false)
const clearAllOpen = ref(false)
const leaveOpen = ref(false)
const toast = ref('')
const isWide = ref(true)
const listEl = ref(null)
let loadSeq = 0
let leaveTarget = null
let leaveBypass = false
let toastTimer = null

const imageCache = createImageCache({ limit: 5 })
let saver = makeSaver()

// AI 지우기 엔진 — 편집기 화면 동안 하나. 준비(모델 받기·세션 약 15초)를 미리 시작한다
const aiEngine = shallowRef(null)
const aiState = reactive({ status: 'idle', reason: '', progress: null })

function startAiEngine() {
  if (aiEngine.value) return
  const eng = createAiEngine({
    prefer: 'webgpu',
    onStatus: s => { aiState.status = s.status; aiState.reason = s.reason || '' },
  })
  aiEngine.value = eng
  eng.prepare(p => { aiState.progress = p }).then(info => {
    if (info) console.info(`[StudioEditor] AI 엔진 준비: ${info.engine}, 모델 ${info.modelSource} ${info.modelMs}ms, 세션 ${info.sessionMs}ms`)
  })
}

function stopAiEngine() {
  aiEngine.value?.dispose()
  aiEngine.value = null
  aiState.status = 'idle'
  aiState.reason = ''
  aiState.progress = null
}

function makeSaver() {
  return createEditSaver({
    onStatus(status, detail) {
      saveStatus.value = status
      saveDetail.value = detail?.error || ''
    },
    onSaved(id, version, edit) {
      const row = rowOf(id)
      if (row) { row.edit = edit; row.edit_version = version }
    },
    onConflict(id) {
      conflictError.value = ''
      conflictId.value = id
    },
  })
}

const doneImages = computed(() => images.value.filter(i => i.ingest_status === 'done'))
// 장수 한도에 드는 수 — 서버 prepare와 같은 방식: done + 직접 올린 pending (1688의 가져오지 않은 pending은 세지 않음)
const usedCount = computed(() => images.value.filter(i =>
  i.ingest_status === 'done' || (i.kind === 'upload' && i.ingest_status === 'pending')).length)
const selectedImage = computed(() => images.value.find(i => i.id === selectedImageId.value && i.ingest_status === 'done') || null)
const selectedLayers = computed(() => (selectedImageId.value && layerMap[selectedImageId.value]) || [])
// 선택한 영역: 실행 전 영역(초안)이면 그것, 아니면 저장된 레이어
const selectedFill = computed(() => (canvasDraft.value && canvasDraft.value.id === selectedLayerId.value ? canvasDraft.value
  : selectedLayers.value.find(l => l.id === selectedLayerId.value && isValidFillLayer(l)) || null))
const selectedFillCount = computed(() => fillLayersOf(selectedLayers.value).length)
const anyModalOpen = computed(() => addOpen.value || clearAllOpen.value || !!conflictId.value || leaveOpen.value)
const selectedHistory = computed(() => (selectedImage.value && histories[selectedImage.value.id]) || null)
const canUndoNow = computed(() => canUndo(selectedHistory.value))
const canRedoNow = computed(() => canRedo(selectedHistory.value))
const historySteps = computed(() => listHistory(selectedHistory.value))
// AI 최소 넓힘 폭 k (원본 크기 기준, aiGeometry 규칙)
const selectedAiMinGrow = computed(() => {
  const r = selectedImage.value
  return r && Number.isInteger(r.width) && Number.isInteger(r.height) ? aiK(r.width, r.height) : null
})

function rowOf(id) { return images.value.find(i => i.id === id) }
function fillCount(id) { return fillLayersOf(layerMap[id] || []).length }

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

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
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
    for (const row of ordered) {
      // 이 창에서 저장 안 된 변경이 있는 사진은 화면 값을 지킨다 (사진 추가 후 다시 불러올 때)
      if (layerMap[row.id] && saver.stateOf(row.id) !== 'saved') continue
      layerMap[row.id] = readLayers(row.edit, row.id)
      saver.reset(row.id, row.edit_version)
      // 이력: 처음이면 서버 값이 첫 단계. 이미 있는데 서버 값이 이력의 현재와 다르면(다른 창에서 고침) 서버 값으로 새로 시작
      const h = histories[row.id]
      const serverEdit = buildEdit(row.edit, layerMap[row.id])
      if (!h) histories[row.id] = createHistory(serverEdit)
      else if (JSON.stringify(currentStep(h).edit.layers) !== JSON.stringify(serverEdit.layers)) histories[row.id] = clearHistory(h, serverEdit)
    }
    if (!selectedImage.value) {
      selectedImageId.value = doneImages.value[0]?.id || null
      selectedLayerId.value = null
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
  await saver.flush()
  load()
}

// ── 사진 고르기 ──
function selectImage(id) {
  if (id === selectedImageId.value) return
  const prev = selectedImageId.value
  if (prev) saver.flush(prev) // 즉시 저장 (결과는 상단 바 상태로 보인다)
  draft.value = null // 실행 전 영역은 사진을 바꾸면 사라진다
  selectedImageId.value = id
  selectedLayerId.value = null
  nextTick(() => listEl.value?.querySelector(`[data-image-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }))
}

function stepImage(dir) {
  const list = doneImages.value
  if (list.length === 0) return
  const i = list.findIndex(x => x.id === selectedImageId.value)
  const next = list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i + dir)))]
  if (next) selectImage(next.id)
}

function loadCanvasImage(row) {
  return imageCache.get(row)
}

// ── 레이어 바꾸기 (화면 값 → 자동 저장 [+ 이력]) ──
/** 저장 직전 범위 맞춤 — 이미지 밖 좌표는 안으로 맞추고 이전·이후 값을 남긴다 (원본 크기는 DB width/height) */
function clampFills(imageId, layers) {
  const row = rowOf(imageId)
  const W = row?.width, H = row?.height
  if (!Number.isInteger(W) || !Number.isInteger(H) || W < 1 || H < 1) {
    console.error('[StudioEditor] 원본 크기를 몰라 범위 맞춤을 건너뜀:', imageId, W, H)
    return layers
  }
  return layers.map(l => {
    // 붓은 x,y,w,h가 획에서 계산한 값(brushBBox, 이미 이미지 안)이라 사각형만 따로 맞추면 획과 어긋난다
    if (!isValidFillLayer(l) || l.shape === 'brush') return l
    const { rect, changed } = clampRectToImage(l, W, H)
    if (!changed) return l
    console.warn('[StudioEditor] 저장 직전 이미지 밖 좌표를 범위 안으로 맞춤:', l.id,
      { x: l.x, y: l.y, w: l.w, h: l.h }, '→', rect, `(원본 ${W}×${H})`)
    return { ...l, ...rect }
  })
}

/** @param {string|null} label 이력 라벨 (null이면 이력에 남기지 않음 — 여백 슬라이더를 끄는 도중 등) */
function setLayers(imageId, next, label) {
  const layers = clampFills(imageId, next)
  layerMap[imageId] = layers
  const row = rowOf(imageId)
  const edit = buildEdit(row?.edit, layers)
  saver.change(imageId, edit)
  if (label) recordHistory(imageId, edit, label)
}

function recordHistory(imageId, edit, label) {
  const h = histories[imageId]
  if (!h) {
    console.error('[StudioEditor] 이력이 없는 사진 — 지금 값으로 새로 시작:', imageId)
    histories[imageId] = createHistory(edit)
    return
  }
  histories[imageId] = pushHistory(h, edit, label) // 값이 같으면 그대로 돌려준다
}

// ── 실행 전 영역(초안) ──
// 네모·붓 모두 [AI로 지우기]/[단색]을 누르기 전에는 edit에 넣지 않는다 (저장·이력 없음, 화면에만, 한 개만).
// 사진을 바꾸거나 편집기를 떠나거나 새로고침하면 사라진다. 새 초안을 만들면 이전 초안은 버린다.
const draft = ref(null) // { imageId, layer: { id, type:'fill', x,y,w,h, pad, shape?, brush? } } — method 없음
const canvasDraft = computed(() => (draft.value && draft.value.imageId === selectedImageId.value ? draft.value.layer : null))
const selectedIsDraft = computed(() => !!canvasDraft.value && canvasDraft.value.id === selectedLayerId.value)

function setDraftRect(rect) {
  const id = selectedImageId.value
  if (!id) return
  const layer = { id: newFillId(), type: 'fill', x: rect.x, y: rect.y, w: rect.w, h: rect.h, pad: PAD_DEFAULT }
  draft.value = { imageId: id, layer }
  selectedLayerId.value = layer.id
}

// ── 붓 ──
const canvasTool = ref('brush')
const brushSize = ref(40)       // 원본 픽셀
const brushMode = ref('add')    // 'add' 칠하기 | 'sub' 덜어내기
let brushSizeTouched = false
const BRUSH_UI_MIN = BRUSH_SIZE_MIN, BRUSH_UI_MAX = 300
function setBrushSize(v) {
  if (!Number.isInteger(v) || v < BRUSH_UI_MIN || v > BRUSH_UI_MAX) return
  brushSize.value = v
  brushSizeTouched = true
}
// 사진을 바꾸면 (직접 바꾸지 않았다면) 사진 크기에 맞는 기본 붓 크기: 긴 변의 1/40, 8~120px (1920px → 48px)
watch(() => selectedImage.value?.id, () => {
  const r = selectedImage.value
  if (!r || brushSizeTouched || !Number.isInteger(r.width) || !Number.isInteger(r.height)) return
  brushSize.value = Math.min(120, Math.max(8, Math.round(Math.max(r.width, r.height) / 40)))
}, { immediate: true })

/** 붓 한 획 → 붓 초안에 합친다 (초안이 네모거나 없으면 새 붓 초안). 덜어내기는 붓 초안이 있을 때만 */
function addBrushStroke(stroke) {
  const id = selectedImageId.value
  const row = rowOf(id)
  if (!id || !row) return
  const cur = canvasDraft.value?.shape === 'brush' ? canvasDraft.value : null
  if (!cur && stroke.mode === 'sub') return // 덜어낼 칠한 곳이 없음
  const strokes = [...(cur ? cur.brush.strokes : []), stroke]
  if (strokes.length > BRUSH_MAX_STROKES || brushPointCount({ strokes }) > BRUSH_MAX_POINTS) {
    showToast('한 영역에 칠할 수 있는 양을 넘었어요. 지금 칠한 곳을 먼저 [AI로 지우기]나 [단색]으로 지운 뒤 이어서 칠해 주세요.')
    return
  }
  const bb = brushBBox(strokes, row.width, row.height)
  if (!bb) { // 모두 덜어냄 → 초안 없음
    draft.value = null
    if (cur && selectedLayerId.value === cur.id) selectedLayerId.value = null
    return
  }
  const layer = { id: cur ? cur.id : newFillId(), type: 'fill', shape: 'brush', ...bb, pad: cur ? cur.pad : PAD_DEFAULT, brush: { strokes } }
  draft.value = { imageId: id, layer }
  selectedLayerId.value = layer.id
}

function updateFill(layerId, patch, label) {
  const id = selectedImageId.value
  if (!id) return
  if (canvasDraft.value?.id === layerId) { // 초안: 화면 값만 (저장·이력 없음)
    draft.value = { imageId: id, layer: { ...canvasDraft.value, ...patch } }
    return
  }
  const cur = layerMap[id] || []
  if (!cur.some(l => l.id === layerId)) return
  setLayers(id, cur.map(l => (l.id === layerId ? { ...l, ...patch } : l)), label)
}

// kind: 캔버스가 알려준 동작 — 'move'(이동) | 'resize'(크기 조절, [조금 넓히기] 포함). 붓은 옮기기만 (획을 통째로)
function changeFill(layerId, rect, kind) {
  const id = selectedImageId.value
  const l = (layerMap[id] || []).find(x => x.id === layerId)
  if (l?.shape === 'brush') {
    const row = rowOf(id)
    const brush = translateBrush(l.brush, rect.x - l.x, rect.y - l.y)
    const bb = brushBBox(brush.strokes, row.width, row.height)
    if (!bb) { console.error('[StudioEditor] 붓 영역을 옮긴 뒤 칠한 곳이 이미지 밖으로 나감 — 옮기지 않음:', layerId); return }
    updateFill(layerId, { ...bb, brush }, LABELS.move)
    return
  }
  updateFill(layerId, { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, kind === 'move' ? LABELS.move : LABELS.resize)
}

/**
 * [AI로 지우기]/[단색] — 누르면 바로 실행 (떠 있는 막대·오른쪽 카드 공통)
 *   초안: 그 방식으로 레이어를 추가 (AI: 이력 "AI 지우기", 단색: "채우기 방식 변경") → 자동 저장
 *   레이어: 방식이 다르면 바꾸고(ai 결과 정보는 뗌) 다시 실행. AI는 결과가 안 맞을 때만 다시 계산 (자동 재계산 없음)
 *   AI의 이력 한 단계 = 누른 순간 edit가 바뀌면 그때 단계를 만들고, 결과가 오면 그 단계에 합친다(applyAiResult)
 */
let aiBatchSeq = 0
function executeFill(layerId, method) {
  const id = selectedImageId.value
  if (!id || (method !== 'ai' && method !== 'solid')) return
  const cur = layerMap[id] || []
  const batch = `e${++aiBatchSeq}`
  let pushedIndex = null
  if (canvasDraft.value?.id === layerId) {
    if (cur.length >= MAX_LAYERS) { showToast(`한 사진에 영역은 ${MAX_LAYERS}개까지예요`); return }
    const layer = { ...canvasDraft.value, method }
    draft.value = null
    setLayers(id, [...cur, layer], method === 'ai' ? LABELS.aiErase : LABELS.method)
    pushedIndex = histories[id]?.index ?? null
  } else {
    const l = cur.find(x => x.id === layerId)
    if (!l) return
    if (l.method !== method) {
      // 다른 방식으로 바꾸면 ai 결과 정보는 뗀다 (되돌리기로 AI에 돌아가면 이력의 ai가 그대로 돌아온다)
      setLayers(id, cur.map(x => {
        if (x.id !== layerId) return x
        const { ai, ...rest } = x
        return { ...rest, method }
      }), method === 'ai' ? LABELS.aiErase : LABELS.method)
      pushedIndex = histories[id]?.index ?? null
    } else if (method === 'solid') {
      return // 단색은 값이 바뀌면 캔버스가 바로 다시 칠한다 — 할 일 없음
    }
  }
  selectedLayerId.value = layerId
  if (method === 'ai') {
    aiHistoryBatch[id] = { batch, index: pushedIndex }
    eraseRequest.value = { layerId, n: ++eraseSeq, batch }
  }
}

/**
 * 캔버스가 AI 결과 PNG를 저장했을 때 — 그 레이어의 계산 key가 여전히 planKey일 때만 ai를 붙인다. 이력은 실행 한 번 = "AI 지우기" 한 단계:
 *   실행 때 단계를 이미 만들었고(초안 추가·방식 변경) 그 단계가 아직 현재면 → 그 단계에 합친다
 *   실행 때 edit가 안 바뀌었으면(결과가 안 맞던 AI 레이어 다시 실행) → 첫 결과가 단계를 만들고, 같은 실행의 다음 결과는 합친다
 *   (같이 지운 앞 AI가 있으면 결과가 같은 batch로 여러 번 온다)
 */
const aiHistoryBatch = {} // image id → { batch, index } 마지막 "AI 지우기" 단계 (index null = 아직 단계 없음)
function applyAiResult({ imageId, layerId, planKey, W, H, ai, batch }) {
  const cur = layerMap[imageId] || []
  const entry = fillPlan(fillLayersOf(cur), W, H).find(p => p.id === layerId)
  if (!entry || entry.key !== planKey) {
    console.info('[StudioEditor] AI 결과가 도착했지만 그 사이 영역이 바뀌어 붙이지 않음:', imageId, layerId)
    return
  }
  const next = cur.map(l => (l.id === layerId ? { ...l, ai } : l))
  const h = histories[imageId]
  const last = aiHistoryBatch[imageId]
  if (h && last && last.batch === batch && last.index !== null && last.index === h.index) {
    setLayers(imageId, next, null)
    histories[imageId] = amendHistory(h, buildEdit(rowOf(imageId)?.edit, layerMap[imageId]))
    return
  }
  setLayers(imageId, next, LABELS.aiErase)
  aiHistoryBatch[imageId] = { batch, index: histories[imageId]?.index ?? null }
}

// AI 실행 요청 → 캔버스 (캔버스가 같이 지울 앞 AI를 정하고 계산한다)
const aiLayerStates = ref({})       // 캔버스가 알려주는 AI 레이어 상태 (선택한 사진)
const eraseRequest = ref(null)      // { layerId, n, batch }
let eraseSeq = 0
const selectedAiState = computed(() => (!selectedIsDraft.value && selectedFill.value?.method === 'ai' ? aiLayerStates.value[selectedFill.value.id] || null : null))

// 붓 크기·칠하기/덜어내기 (오른쪽 패널 두 곳에서 쓰는 작은 조각)
const BrushControls = {
  setup() {
    return () => h('div', { 'data-brush-controls': '' }, [
      h('div', { class: 'flex items-center' }, [
        h('span', { class: 'st-label' }, '붓 크기'),
        h('span', { class: 'ml-auto text-[13px] font-bold st-ink', 'data-brush-size': '' }, `${brushSize.value}px`),
      ]),
      h('input', {
        type: 'range', min: BRUSH_UI_MIN, max: BRUSH_UI_MAX, step: 1, class: 'mt-2 w-full', style: 'accent-color: var(--st-accent)',
        value: brushSize.value, 'aria-label': '붓 크기', onInput: e => setBrushSize(Number(e.target.value)),
      }),
      h('p', { class: 'mt-1 st-desc-sm break-keep' }, '원본 사진 픽셀 기준이에요 (확대해도 같은 굵기로 칠해요).'),
      h('div', { class: 'mt-3 flex gap-1.5' }, [['add', '칠하기'], ['sub', '덜어내기']].map(([k, label]) =>
        h('button', {
          type: 'button', class: ['st-chip', brushMode.value === k ? 'is-active' : ''], 'data-brush-mode': k,
          onClick: () => { brushMode.value = k },
        }, label))),
    ])
  },
}
// 여백 슬라이더: 끄는 동안(input)은 화면·저장만, 손을 뗄 때(change) 이력 1번
function setPad(layerId, pad) {
  if (!Number.isInteger(pad) || pad < PAD_MIN || pad > PAD_MAX) return
  updateFill(layerId, { pad }, null)
}
function recordPad() {
  const id = selectedImageId.value
  if (!id) return
  recordHistory(id, buildEdit(rowOf(id)?.edit, layerMap[id] || []), LABELS.pad)
}

function removeFill(layerId) {
  const id = selectedImageId.value
  if (!id) return
  if (canvasDraft.value?.id === layerId) { // 초안 삭제·붓 [초기화] — 저장·이력 없음
    draft.value = null
    if (selectedLayerId.value === layerId) selectedLayerId.value = null
    return
  }
  setLayers(id, (layerMap[id] || []).filter(l => l.id !== layerId), LABELS.remove)
  if (selectedLayerId.value === layerId) selectedLayerId.value = null
}

function clearAllFills() {
  const id = selectedImageId.value
  clearAllOpen.value = false
  if (!id) return
  draft.value = null
  // 지우기(fill)만 없앤다 — 다음 단계의 다른 레이어는 보존
  setLayers(id, (layerMap[id] || []).filter(l => l.type !== 'fill'), LABELS.remove)
  selectedLayerId.value = null
}

// ── 되돌리기 · 다시 · 이력 이동 ──
// 그 시점 edit를 화면 값으로 두고, 저장은 기존 자동 저장(edit_version 잠금) 그대로 탄다. 캔버스는 layers 변경을 보고 다시 계산한다
function applyHistory(res) {
  const id = selectedImage.value?.id
  if (!res || !id) return
  histories[id] = res.history
  layerMap[id] = readLayers(res.edit, id)
  saver.change(id, buildEdit(res.edit, layerMap[id]))
  if (selectedLayerId.value && !layerMap[id].some(l => l.id === selectedLayerId.value)) selectedLayerId.value = null
}
function undoEdit() { if (canUndoNow.value) applyHistory(undoHistory(selectedHistory.value)) }
function redoEdit() { if (canRedoNow.value) applyHistory(redoHistory(selectedHistory.value)) }
function jumpEdit(i) { if (selectedHistory.value) applyHistory(jumpHistory(selectedHistory.value, i)) }

// ── 저장 상태 ──
function retrySave() { saver.retry() }

function reopenConflict() {
  // 가장 나쁜 상태가 충돌인 사진을 다시 연다
  const id = images.value.find(i => saver.stateOf(i.id) === 'conflict')?.id
  if (id) { conflictError.value = ''; conflictId.value = id }
}

async function reloadConflicted() {
  const id = conflictId.value
  if (!id) return
  conflictLoading.value = true
  conflictError.value = ''
  try {
    const fresh = await fetchImageEdit(id)
    const row = rowOf(id)
    if (row) { row.edit = fresh.edit; row.edit_version = fresh.edit_version; row.updated_at = fresh.updated_at }
    layerMap[id] = readLayers(fresh.edit, id)
    saver.reset(id, fresh.edit_version)
    // 서버 최신본을 불러오면 그 사진의 이력은 비우고 불러온 상태를 첫 단계로
    histories[id] = createHistory(buildEdit(fresh.edit, layerMap[id]), LABELS.reload)
    if (id === selectedImageId.value && !layerMap[id].some(l => l.id === selectedLayerId.value)) selectedLayerId.value = null
    conflictId.value = null
  } catch (e) {
    console.error('[StudioEditor] 충돌 후 불러오기 실패:', e)
    conflictError.value = e.message || String(e)
  } finally {
    conflictLoading.value = false
  }
}

// ── 떠나기 ──
async function guardLeave(to) {
  if (leaveBypass) return true
  if (!saver.hasUnsaved()) return true
  const ok = await saver.flush()
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
  if (!saver.hasUnsaved()) return
  saver.flush() // 남은 저장을 시도는 하되, 끝을 기다릴 수 없으므로 브라우저 경고를 띄운다
  e.preventDefault()
  e.returnValue = ''
}

// ── 키보드: ↑/↓ 이전·다음 사진, Ctrl(Cmd)+Z 되돌리기, Ctrl(Cmd)+Shift+Z·Ctrl+Y 다시 ──
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
  if (e.key === 'ArrowUp') { e.preventDefault(); stepImage(-1) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); stepImage(1) }
}

// ── 화면 폭 ──
const wideQuery = window.matchMedia('(min-width: 1024px)')
function onWideChange() {
  isWide.value = wideQuery.matches
  // 편집은 1024px 이상에서만 — 좁은 화면에서는 모델(약 200MB)을 받지 않는다
  if (isWide.value) startAiEngine()
}

watch(() => route.params.projectId, (id, old) => {
  if (!id || id === old) return
  project.value = null
  selectedImageId.value = null
  selectedLayerId.value = null
  load()
})

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·사진·서명 URL·편집 상태를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    saver.dispose()
    saver = makeSaver()
    imageCache.clear()
    project.value = null
    images.value = []
    viewUrls.value = new Map()
    for (const k of Object.keys(layerMap)) delete layerMap[k]
    for (const k of Object.keys(histories)) delete histories[k]
    draft.value = null
    selectedImageId.value = null
    selectedLayerId.value = null
    saveStatus.value = 'saved'
    saveDetail.value = ''
    addOpen.value = false
    clearAllOpen.value = false
    conflictId.value = null
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
  saver.dispose()
  imageCache.clear()
  stopAiEngine()
})
</script>

<style scoped>
.st-range { accent-color: var(--st-accent); }
</style>
