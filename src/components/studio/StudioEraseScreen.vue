<template>
  <div class="absolute inset-0 flex flex-col st-bg" style="z-index: 20" data-erase-screen>
    <!-- 상단: [페이지로] · 되돌리기 · 다시 · "지우기" · [원본 보기] · [이력] · [완료] -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-1 st-topbar st-border-b">
      <button type="button" class="st-btn st-btn-ghost" data-erase-back @click="requestClose">
        <ArrowLeft class="w-4 h-4" :stroke-width="2" /> 페이지로
      </button>
      <span class="st-erase-sep" />
      <button type="button" class="st-icon-btn" :disabled="!canUndoNow" :title="canUndoNow ? UNDO_TIP : '되돌릴 동작이 없어요'" data-action="undo" @click="undoEdit">
        <Undo2 class="w-[18px] h-[18px]" :stroke-width="2" />
      </button>
      <button type="button" class="st-icon-btn" :disabled="!canRedoNow" :title="canRedoNow ? REDO_TIP : '다시 할 동작이 없어요'" data-action="redo" @click="redoEdit">
        <Redo2 class="w-[18px] h-[18px]" :stroke-width="2" />
      </button>
      <div class="ml-2 leading-tight min-w-0">
        <div class="text-[15px] font-extrabold st-ink">지우기</div>
        <div class="text-[11px] st-muted truncate">
          <span v-if="imageLabel">{{ imageLabel }}</span>
          <!-- 저장 상태 (편집기 상단바와 같은 값) -->
          <button v-if="saveStatus === 'error'" type="button" class="ml-1 font-bold st-danger-text underline" :title="saveDetail" data-save-status="error" @click="retrySave">· 저장하지 못했어요 · 다시 시도</button>
          <button v-else-if="saveStatus === 'conflict'" type="button" class="ml-1 font-bold st-danger-text underline" data-save-status="conflict" @click="reopenConflict">· 저장 안 됨 · 다른 창과 충돌</button>
          <span v-else-if="saveStatus === 'pending' || saveStatus === 'saving'" class="ml-1" data-save-status="saving">· 저장 중…</span>
          <span v-else class="ml-1 st-success-text" :title="savedTitle(lastSavedAt)" data-save-status="saved">· 저장됨</span>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <button
          type="button" class="st-btn st-btn-ghost" :class="showOriginal ? 'is-pressed' : ''" data-show-original
          title="누르고 있는 동안 원본을 보여줘요"
          @pointerdown="startOriginal" @pointerup="stopOriginal" @pointercancel="stopOriginal" @lostpointercapture="stopOriginal"
          @keydown.space.prevent="showOriginal = true" @keyup.space.prevent="showOriginal = false"
        >
          <Eye class="w-4 h-4" :stroke-width="2" /> 원본 보기 <span class="text-[11px] font-semibold st-muted">누르고 있기</span>
        </button>
        <div class="relative">
          <button type="button" class="st-btn st-btn-ghost" :class="historyOpen ? 'is-pressed' : ''" :aria-expanded="historyOpen" data-action="history" @click="historyOpen = !historyOpen">
            <History class="w-4 h-4" :stroke-width="2" /> 이력
          </button>
          <div v-if="historyOpen" class="st-history absolute right-0 top-[calc(100%+6px)]" style="z-index: 10" data-history-panel>
            <ol class="st-history-list">
              <li v-for="s in historySteps" :key="s.i">
                <button type="button" class="st-history-item" :class="s.current ? 'is-current' : ''" :data-step="s.i" @click="jumpEdit(s.i)">
                  <span class="truncate">{{ s.label }}</span>
                  <span class="st-history-time">{{ formatTime(s.at) }}</span>
                </button>
              </li>
            </ol>
            <p class="st-history-note break-keep">이력은 이 창을 닫으면 사라져요. 작업한 내용은 자동으로 저장돼 있어요.</p>
          </div>
        </div>
        <button type="button" class="st-btn st-btn-primary" data-erase-done data-guide="erase-done" @click="requestClose"><Check class="w-4 h-4" :stroke-width="2.5" /> 완료</button>
      </div>
    </header>

    <div class="flex-1 min-h-0 flex">
      <!-- 왼쪽 조작 패널: 도구 → 붓 크기 → 칠하기/덜어내기 → [AI로 지우기][단색] → 칠한 곳 초기화 → 가장자리 여유 → 안내 -->
      <aside class="w-[312px] shrink-0 flex flex-col st-surface st-border-r" data-erase-panel>
        <div class="flex-1 overflow-y-auto p-4 flex flex-col">
          <h3 class="st-h-card">지우기</h3>

          <!-- 1. 도구 -->
          <div class="mt-4 st-label">도구</div>
          <div class="mt-2 st-seg w-full" role="toolbar" aria-label="지우기 도구" data-guide="erase-tools">
            <button
              v-for="t in TOOL_BUTTONS" :key="t.key" type="button"
              class="st-seg-item st-tool-item flex-1 inline-flex items-center justify-center gap-1" :class="canvasTool === t.key ? 'is-active' : ''"
              :aria-pressed="canvasTool === t.key" :title="t.tip" :data-tool="t.key"
              @click="setTool(t.key)"
            >
              <component :is="t.icon" class="w-4 h-4" :stroke-width="2" /> {{ t.label }}
            </button>
          </div>

          <!-- 덮기 (12-2): [덮기] 도구이거나 덮기를 골랐을 때 — 덮을 곳 네모 → 가져올 곳 옮기기 → 가장자리 → [적용] -->
          <template v-if="coverMode">
            <div class="mt-5 st-label">덮기</div>
            <ol class="mt-2 space-y-1.5" data-cover-steps>
              <li class="st-cover-step" :class="!selectedCover ? 'is-now' : 'is-done'">① 덮을 곳(글자·로고)을 네모로 감싸세요</li>
              <li class="st-cover-step" :class="selectedCover ? 'is-now' : ''">② 점선 네모(가져올 곳)를 비슷한 무늬 위로 끌어 옮기세요. 덮을 곳에 바로 보여요</li>
            </ol>
            <div v-if="selectedCover && selectedIsDraft" class="mt-3 flex gap-2">
              <button type="button" class="st-btn st-btn-lg st-btn-primary flex-[1.6]" data-cover-apply @click="applyCover(selectedCover.id)">
                <Check class="w-4 h-4" :stroke-width="2.5" /> 적용
              </button>
              <button type="button" class="st-btn st-btn-lg flex-1" data-cover-cancel @click="discardDraft">취소</button>
            </div>
            <button
              v-else-if="selectedCover" type="button" class="st-btn st-btn-ghost st-btn-block mt-3 text-[12px]" data-cover-remove
              @click="removeFill(selectedCover.id)"
            ><RotateCcw class="w-3.5 h-3.5" :stroke-width="2" /> 선택한 덮기 삭제 (Delete)</button>
            <p v-if="selectedCover && selectedIsDraft" class="mt-2 text-[12px] font-bold st-accent-text break-keep" data-cover-draft-hint>[적용]을 누르면 사진에 들어가고 저장돼요</p>
            <p v-else-if="selectedCover" class="mt-2 st-desc-sm break-keep" data-cover-layer-hint>적용한 덮기예요. 네모나 가져올 곳을 옮기면 바로 바뀌어요</p>
            <!-- AI 결과 저장 상태 — 덮기 화면에서도 보인다 (지우기 쪽 카드와 같은 동작) -->
            <div v-if="aiSaveState.count > 0" class="mt-3 st-erase-unsaved" data-ai-unsaved>
              <p class="text-[13px] font-bold st-ink break-keep">AI 결과를 아직 저장하지 못했어요. [다시 저장]을 눌러 주세요.<span v-if="aiSaveState.count > 1" class="st-muted"> ({{ aiSaveState.count }}개)</span></p>
              <button type="button" class="st-btn st-btn-primary st-btn-block mt-2" :disabled="aiSaveState.saving" data-ai-save-retry @click="retryAiSave">
                {{ aiSaveState.saving ? '저장 중…' : '다시 저장' }}
              </button>
              <p v-if="aiSaveState.message" class="mt-2 st-desc-sm break-keep" data-ai-unsaved-reason>{{ aiSaveState.message }}</p>
            </div>
            <div v-else-if="aiSaveState.autoRetrying > 0" class="mt-3 st-erase-unsaved" data-ai-autoretry>
              <p class="text-[13px] font-bold st-ink break-keep">AI 결과를 저장하는 중이에요…</p>
            </div>

            <div class="mt-5 flex items-center">
              <span class="st-label">가장자리 부드럽게</span>
              <span class="ml-auto text-[13px] font-bold st-ink" data-cover-feather-value>{{ selectedCover ? selectedCover.feather : COVER_FEATHER_DEFAULT }} px</span>
            </div>
            <input
              type="range" :min="COVER_FEATHER_MIN" :max="COVER_FEATHER_MAX" step="1" class="mt-2 w-full st-range"
              :value="selectedCover ? selectedCover.feather : COVER_FEATHER_DEFAULT" :disabled="!selectedCover" aria-label="가장자리 부드럽게"
              data-cover-feather
              @input="e => selectedCover && setCoverFeather(selectedCover.id, Number(e.target.value))"
              @change="recordCoverFeather"
            />
            <p class="mt-1 st-desc-sm break-keep">덮은 네모 바깥으로 이만큼 원래 사진과 자연스럽게 섞어요. 0이면 경계가 또렷해요</p>
          </template>

          <!-- 2. 붓 크기 · 3. 칠하기/덜어내기 -->
          <template v-else>
          <div class="mt-5" data-brush-controls>
            <div class="flex items-center">
              <span class="st-label">붓 크기</span>
              <span class="ml-auto text-[13px] font-bold st-ink" data-brush-size>{{ brushSize }} px</span>
            </div>
            <div class="mt-2 flex items-center gap-2">
              <span class="w-1 h-1 rounded-full shrink-0" style="background: var(--st-muted)" />
              <input
                type="range" :min="BRUSH_UI_MIN" :max="BRUSH_UI_MAX" step="1" class="flex-1 st-range"
                :value="brushSize" aria-label="붓 크기" @input="e => setBrushSize(Number(e.target.value))"
              />
              <span class="w-3 h-3 rounded-full shrink-0" style="background: var(--st-muted)" />
            </div>
            <div class="mt-3 st-seg w-full">
              <button
                v-for="[k, label] in BRUSH_MODES" :key="k" type="button"
                class="st-seg-item flex-1" :class="brushMode === k ? 'is-active' : ''" :data-brush-mode="k"
                @click="setBrushMode(k)"
              >{{ label }}</button>
            </div>
          </div>

          <!-- 4. [AI로 지우기] [단색] — 누르면 바로 실행 -->
          <div class="mt-5 st-label">지우기 · 누르면 바로 실행</div>
          <div class="mt-2 flex gap-2" data-guide="erase-run">
            <button
              type="button" class="st-btn st-btn-lg st-btn-primary flex-[1.6]"
              :disabled="!selectedFill || selectedAiState === 'busy'" data-method="ai"
              @click="selectedFill && executeFill(selectedFill.id, 'ai')"
            >
              <Sparkles class="w-4 h-4" :stroke-width="2" />
              {{ selectedAiState === 'busy' ? 'AI가 채우는 중…' : selectedAiState === 'loading' ? '불러오는 중…' : 'AI로 지우기' }}
            </button>
            <button
              type="button" class="st-btn st-btn-lg flex-1"
              :class="selectedFill && !selectedIsDraft && selectedFill.method === 'solid' ? 'is-pressed' : ''"
              :disabled="!selectedFill || selectedAiState === 'busy'" data-method="solid"
              @click="selectedFill && executeFill(selectedFill.id, 'solid')"
            >단색</button>
          </div>
          <!-- 5. 칠한 곳 초기화 (실행 전) / 선택한 영역 삭제 (실행된 영역) -->
          <button
            type="button" class="st-btn st-btn-ghost st-btn-block mt-1 text-[12px]"
            :disabled="!selectedFill"
            :data-erase-reset="selectedIsDraft || !selectedFill ? 'draft' : 'layer'"
            @click="selectedFill && removeFill(selectedFill.id)"
          ><RotateCcw class="w-3.5 h-3.5" :stroke-width="2" /> {{ selectedFill && !selectedIsDraft ? '선택한 영역 삭제 (Delete)' : '칠한 곳 초기화' }}</button>

          <!-- AI 결과 저장 실패 — 결과는 메모리에 있다. [다시 저장] = 업로드만 다시 (AI 재계산 없음) -->
          <div v-if="aiSaveState.count > 0" class="mt-3 st-erase-unsaved" data-ai-unsaved>
            <p class="text-[13px] font-bold st-ink break-keep">AI 결과를 아직 저장하지 못했어요. [다시 저장]을 눌러 주세요.<span v-if="aiSaveState.count > 1" class="st-muted"> ({{ aiSaveState.count }}개)</span></p>
            <button type="button" class="st-btn st-btn-primary st-btn-block mt-2" :disabled="aiSaveState.saving" data-ai-save-retry @click="retryAiSave">
              {{ aiSaveState.saving ? '저장 중…' : '다시 저장' }}
            </button>
            <p v-if="aiSaveState.message" class="mt-2 st-desc-sm break-keep" data-ai-unsaved-reason>{{ aiSaveState.message }}</p>
          </div>
          <!-- 자동 다시 저장 중 (2초 → 5초 → 10초, 3번 다 실패하면 위 카드) -->
          <div v-else-if="aiSaveState.autoRetrying > 0" class="mt-3 st-erase-unsaved" data-ai-autoretry>
            <p class="text-[13px] font-bold st-ink break-keep">AI 결과를 저장하는 중이에요…</p>
          </div>

          <p v-if="!selectedFill" class="mt-2 st-desc-sm break-keep" data-panel-empty-hint>먼저 사진에서 지울 곳을 칠하거나 네모로 감싸세요.</p>
          <p v-else-if="selectedIsDraft" class="mt-2 text-[12px] font-bold st-accent-text break-keep" data-panel-draft-hint>
            {{ selectedFill.shape === 'brush' ? '다 칠한 뒤 [AI로 지우기] 또는 [단색]을 누르세요' : '크기를 맞춘 뒤 [AI로 지우기] 또는 [단색]을 누르세요' }}
          </p>
          <p v-if="selectedFill && !selectedIsDraft && selectedFill.method === 'coons'" class="mt-2 st-desc-sm break-keep" data-coons-notice>
            예전 방식(자연스럽게)으로 지운 영역이에요. 위 버튼을 누르면 그 방식으로 다시 지워요.
          </p>
          <p v-if="selectedFill && !selectedIsDraft && selectedFill.method === 'ai' && (selectedAiState === 'needs' || selectedAiState === 'failed')" class="mt-2 st-desc-sm break-keep" data-ai-stale>
            영역이 바뀌어 결과가 맞지 않아요. [AI로 지우기]를 누르면 다시 지워요.
          </p>
          <!-- 글자 걸침 안내 — 자동으로 넓히지 않고 안내만 -->
          <div v-if="selectedFill && bleedSides.length" class="mt-3 st-erase-bleed" data-bleed-notice>
            <p class="break-keep">네모 테두리가 지울 부분에 걸쳐 있어요. 모두 덮도록 조금 더 크게 그려 주세요.</p>
            <button type="button" class="st-btn mt-2" data-widen @click="canvasRef?.widenSelected()">조금 넓히기</button>
          </div>

          <!-- 6. 가장자리 여유 -->
          <div class="mt-5 flex items-center">
            <span class="st-label">가장자리 여유</span>
            <span class="ml-auto text-[13px] font-bold st-ink" data-pad-value>{{ selectedFill ? selectedFill.pad : PAD_DEFAULT }} px</span>
          </div>
          <input
            type="range" :min="PAD_MIN" :max="PAD_MAX" step="1" class="mt-2 w-full st-range"
            :value="selectedFill ? selectedFill.pad : PAD_DEFAULT" :disabled="!selectedFill" aria-label="가장자리 여유"
            @input="e => selectedFill && setPad(selectedFill.id, Number(e.target.value))"
            @change="recordPad"
          />
          <p class="mt-1 st-desc-sm break-keep" data-pad-desc>칠한 곳보다 이만큼 더 넓게 지워요. 그림자·테두리까지 깨끗해져요</p>
          <p v-if="selectedFill && selectedFill.method === 'ai' && selectedAiMinGrow" class="mt-0.5 st-desc-sm break-keep" data-ai-min-grow>AI는 이 사진에서 최소 {{ selectedAiMinGrow }}px 넓게 메워요.</p>
          </template>

          <!-- 적용한 순서 (12-2) — 지우기·덮기가 위에서부터 차례로 적용된다. 누르면 그 영역을 고른다 -->
          <div v-if="appliedRows.length" class="mt-5" data-applied-list>
            <div class="flex items-center">
              <span class="st-label">적용한 순서</span>
              <span class="ml-auto text-[11px] st-muted">위에서부터 차례로 적용돼요</span>
            </div>
            <ol class="mt-2 st-applied">
              <li v-for="row in appliedRows" :key="row.id">
                <button
                  type="button" class="st-applied-row" :class="row.id === selectedLayerId ? 'is-current' : ''"
                  :data-applied-kind="row.kind" @click="selectLayer(row.id)"
                >
                  <span class="st-applied-no">{{ row.no }}</span>
                  <component :is="row.kind === 'cover' ? Stamp : Eraser" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
                  <span class="truncate">{{ row.label }}</span>
                </button>
              </li>
            </ol>
          </div>

          <span class="flex-1" />
          <!-- 7. 안내 -->
          <div class="mt-5 p-3 rounded-[12px] st-card flex gap-2">
            <Info class="w-4 h-4 shrink-0 mt-0.5 st-muted" :stroke-width="2" />
            <div class="space-y-2">
              <p class="text-[12px] font-bold st-ink break-keep" data-erase-guide>지울 곳을 칠하거나(붓) 네모로 감싼 뒤 [AI로 지우기] 또는 [단색]을 누르세요</p>
              <p class="st-desc-sm break-keep" data-ai-guide>AI 지우기는 한 번에 완벽하지 않을 수 있어요. 사람·옷·복잡한 무늬 위는 결과가 부자연스러울 수 있어요</p>
              <p class="st-desc-sm break-keep" data-cover-guide>사람·옷 위는 [덮기]가 더 깔끔해요</p>
              <p class="st-desc-sm break-keep">스페이스를 누른 채 끌면 화면이 움직이고, Ctrl+휠로 확대해요.</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- 가운데: 사진 (칠한 자국·영역 테두리·붓 동그라미만) -->
      <section class="flex-1 min-w-0 relative st-canvas-bg st-dotgrid" data-canvas-area>
        <StudioCanvas
          ref="canvasRef"
          :image="image"
          :layers="selectedLayers"
          :selected-id="selectedLayerId"
          :load-image="loadImage"
          :keys-enabled="keysEnabled"
          :tool="canvasTool"
          :show-original="showOriginal"
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
          @select="selectLayer"
          @remove="removeFill"
          @ai="applyAiResult"
          @ai-states="setAiStates"
          @ai-unsaved="setAiSaveState"
          @tool="setTool"
          @bleed="s => (bleedSides = s)"
          @draft-cover="setCoverDraft"
          @cover-source="moveCoverSource"
        />
        <!-- 위쪽 가운데 안내 칩: 칠한 곳(실행 전)이 있을 때 / 덮기 미리보기 중일 때 -->
        <div v-if="canvasDraft && !showOriginal" class="absolute top-3 left-1/2 -translate-x-1/2 st-badge st-badge-white st-shadow-float px-3 h-7" style="z-index: 5" data-draft-legend>
          <span class="w-2 h-2 rounded-full mr-1.5" style="background: var(--st-accent)" />
          {{ canvasDraft.type === 'cover' ? '덮기 미리 보기 · [적용]을 누르면 저장돼요' : '파란 곳 = 칠한 곳 · 아직 저장 안 됨' }}
        </div>
        <div v-if="showOriginal" class="absolute top-3 left-3 st-badge st-badge-scrim" style="z-index: 5" data-original-badge>원본</div>
        <!-- 12-1: 자르기·띠가 있는 사진 — 지우기는 원본 좌표라 원본 전체를 보여 준다 (자른 모습은 페이지·미리보기에서) -->
        <div v-if="shapeNote && !showOriginal" class="absolute bottom-3 left-3 st-badge st-badge-scrim" style="z-index: 5" data-erase-shape-note>{{ shapeNote }}</div>
      </section>
    </div>
  </div>
</template>

<script setup>
// 지우기 화면 (2단계 개편, 3단계 어두운 화면) — 사진 한 장을 크게 열어 붓·네모로 지울 곳을 정하고 [AI로 지우기]/[단색]으로 지운다.
// 상태·동작은 전부 편집기의 지우기 세션(useEraseSession)에 있다. 이 화면은 배치만 맡는다:
//   상단 [페이지로] · 되돌리기 · 다시 · "지우기" · [원본 보기(누르고 있기)] · [이력] · [완료]
//   왼쪽 도구 → 붓 크기 → 칠하기/덜어내기 → [AI로 지우기][단색] → 초기화 → 가장자리 여유 → 안내
// 사진 위에는 칠한 자국·영역 테두리·붓 동그라미만 둔다 (떠 있는 막대 없음 — 결정 9).
// [완료]/[페이지로]: 이 사진을 바로 저장하고 실행 전 영역(초안)은 버린 뒤 닫는다 (5단계에서 [완료] 때 사진 굽기를 붙인다).
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent, h } from 'vue'
import { readShape, shapeMark } from '@/lib/studioCrop'
import { ArrowLeft, Undo2, Redo2, Eye, History, Info, MousePointer2, Brush, Square, Sparkles, RotateCcw, Check, Stamp, Eraser } from 'lucide-vue-next'
import {
  BRUSH_UI_MIN, BRUSH_UI_MAX, PAD_MIN, PAD_MAX, COVER_FEATHER_MIN, COVER_FEATHER_MAX, COVER_FEATHER_DEFAULT,
} from '@/composables/useEraseSession'
import { PAD_DEFAULT, isValidPixelLayer } from '@/lib/studioEdit'
import { toolForLayer } from '@/lib/studioCover'
import { savedTitle } from '@/lib/studioSaveGuard'

// Fabric은 이 컴포넌트와 함께만 받는다
const StudioCanvas = defineAsyncComponent({
  loader: () => import('@/components/studio/StudioCanvas.vue'),
  errorComponent: {
    render: () => h('div', { class: 'absolute inset-0 flex items-center justify-center p-6 text-center text-[14px] font-bold st-danger-text' },
      '편집 도구를 불러오지 못했어요. 새로고침해 주세요.'),
  },
  onError(err, retry, fail) {
    console.error('[StudioEraseScreen] 편집 도구(Fabric) 로드 실패:', err)
    fail()
  },
})

const props = defineProps({
  session: { type: Object, required: true },     // useEraseSession() 결과 — 편집기가 만든다
  image: { type: Object, required: true },       // 지우는 사진 행 (ingest_status 'done')
  imageLabel: { type: String, default: '' },     // 부제: "02 대표 사진 · 1920 × 1920"
  loadImage: { type: Function, required: true }, // row → Promise<HTMLImageElement>
  keysEnabled: { type: Boolean, default: true }, // 모달이 떠 있으면 false
})
const emit = defineEmits(['close', 'toast'])

const {
  selectedLayers, selectedLayerId, selectedFill, selectedIsDraft, selectedAiState, selectedAiMinGrow,
  canvasDraft, canUndoNow, canRedoNow, historySteps, canvasTool, brushSize, brushMode,
  aiEngine, aiState, aiLayerStates, aiSaveState, eraseRequest, saveStatus, saveDetail, lastSavedAt, resetScreenState,
  setDraftRect, discardDraft, setBrushSize, addBrushStroke, changeFill, executeFill, applyAiResult,
  setPad, recordPad, removeFill, undoEdit, redoEdit, jumpEdit, retrySave, reopenConflict, flush,
  selectedCover, setCoverDraft, moveCoverSource, setCoverFeather, recordCoverFeather, applyCover,
} = props.session

// 덮기 패널을 보일 때: [덮기] 도구이거나 덮기(초안·레이어)를 골랐을 때 (12-2)
const coverMode = computed(() => canvasTool.value === 'cover' || !!selectedCover.value)
const METHOD_LABEL = { ai: 'AI', solid: '단색', coons: '예전 방식' }
// 적용한 순서 — 이 사진의 지우기·덮기 레이어 (배열 순서 = 적용 순서)
const appliedRows = computed(() => selectedLayers.value.filter(isValidPixelLayer).map((l, i) => ({
  id: l.id,
  no: i + 1,
  kind: l.type === 'cover' ? 'cover' : 'fill',
  label: l.type === 'cover' ? '덮기' : `지우기 · ${METHOD_LABEL[l.method]}${l.shape === 'brush' ? ' · 붓' : ''}`,
})))

// 12-1 자르기·띠 안내 (예: "잘림 · 띠 2 — 지우기는 원본 전체에서 해요")
const shapeNote = computed(() => {
  const m = shapeMark(readShape(props.session.shapeOf(props.image.id), props.image.width, props.image.height))
  return m ? `${m} — 지우기는 원본 전체에서 해요. 자른 모습은 페이지에서 보여요` : ''
})

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '')
const MOD = IS_MAC ? 'Cmd' : 'Ctrl'
const UNDO_TIP = `되돌리기 (${MOD}+Z)`
const REDO_TIP = `다시 (${MOD}+Shift+Z${IS_MAC ? '' : ' 또는 Ctrl+Y'})`
const TOOL_BUTTONS = [
  { key: 'select', label: '선택', icon: MousePointer2, tip: '선택 (V) — 영역을 옮기거나 크기를 바꿔요' },
  { key: 'brush', label: '붓', icon: Brush, tip: '붓 (B) — 지울 곳을 칠하세요' },
  { key: 'rect', label: '네모', icon: Square, tip: '네모 (R) — 지울 곳을 네모로 감싸세요' },
  { key: 'cover', label: '덮기', icon: Stamp, tip: '덮기 (C) — 사진의 다른 부분을 가져와 글자·로고 위를 덮어요' },
]
const BRUSH_MODES = [['add', '칠하기'], ['sub', '덜어내기']]
// '자연스럽게'(coons)는 해성 판정 "못 씀"으로 뺐다 (1-6b-3b). 저장된 coons 레이어는 그대로 그리고 위 버튼으로 다시 지울 수 있다

const canvasRef = ref(null)
const showOriginal = ref(false)
const historyOpen = ref(false)
const bleedSides = ref([])
function setAiSaveState(s) { aiSaveState.value = s } // 캔버스가 알려주는 AI 결과 저장 상태 (세션에 둔다 — 편집기 나가기 보호가 본다)

function retryAiSave() {
  canvasRef.value?.retryAiSave().then(ok => { if (ok) emit('toast', 'AI 결과를 저장했어요.') })
}

function formatTime(at) {
  const d = new Date(at)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 세션의 ref는 구조 분해로 받았으므로 템플릿에서 대입하지 않고 여기서 .value로 바꾼다
function setTool(t) { if (t === 'select' || t === 'brush' || t === 'rect' || t === 'cover') canvasTool.value = t }
// 레이어를 고르면(적용한 순서 목록·캔버스) 그 종류에 맞는 도구로 — 덮기 = [덮기], 지우기 = [선택] (검수 2묶음, studioCover.toolForLayer)
function selectLayer(id) {
  selectedLayerId.value = id
  const next = toolForLayer(selectedLayers.value.find(l => l.id === id) || null, canvasTool.value)
  if (next !== canvasTool.value) canvasTool.value = next
}
function setAiStates(s) { aiLayerStates.value = s }

// 칠하기/덜어내기를 고르면 붓 도구로 바꾼다 (다른 도구에서는 쓸 곳이 없으므로)
function setBrushMode(k) {
  brushMode.value = k
  canvasTool.value = 'brush'
}

// [원본 보기] — 누르고 있는 동안만
function startOriginal(e) {
  if (e.button !== 0) return
  e.currentTarget.setPointerCapture?.(e.pointerId)
  showOriginal.value = true
}
function stopOriginal() { showOriginal.value = false }

// [완료]/[페이지로]/브라우저 뒤로 — AI가 채우는 중이거나 저장 못 한 AI 결과가 있으면 한 번 알려준다
// (나가면 그 결과는 버려진다). 5초 안에 다시 누르면 닫는다. 닫았으면 true
let busyWarnAt = 0
function requestClose() {
  const failed = aiSaveState.value.count > 0
  const pending = aiSaveState.value.pending > 0
  const busy = Object.values(aiLayerStates.value).includes('busy')
  if ((failed || pending || busy) && Date.now() - busyWarnAt > 5000) {
    busyWarnAt = Date.now()
    emit('toast', failed
      ? '저장하지 못한 AI 결과가 있어요. 지금 나가면 이 결과는 사라져요. 그래도 나가려면 한 번 더 누르세요.'
      : pending
        ? 'AI 결과를 저장하는 중이에요. 지금 나가면 이 결과는 사라질 수 있어요. 그래도 나가려면 한 번 더 누르세요.'
        : 'AI가 채우는 중이에요. 지금 나가면 이번 결과는 저장되지 않아요. 그래도 나가려면 한 번 더 누르세요.')
    return false
  }
  close()
  return true
}
function close() {
  showOriginal.value = false
  historyOpen.value = false
  flush(props.image.id) // 즉시 저장 (결과는 상단 바 저장 상태로 보인다)
  discardDraft()        // 실행 전 영역은 화면을 떠나면 버린다
  emit('close')
}

function onKeyDown(e) {
  if (e.key === 'Escape' && historyOpen.value) historyOpen.value = false
}
function onBlur() { showOriginal.value = false }

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('blur', onBlur)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('blur', onBlur)
  resetScreenState() // 캔버스가 알려준 AI 상태(채우는 중·저장 못 함)를 비운다 — 닫은 뒤 편집기 나가기 경고에 남지 않게
})

defineExpose({ close, requestClose })
</script>

<style scoped>
.st-topbar { background: var(--st-bar, var(--st-surface)); }
.st-dotgrid { background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px); background-size: 22px 22px; }
.st-range { accent-color: var(--st-accent); }
.st-erase-sep { width: 1px; height: 22px; margin: 0 4px; background: var(--st-line); }
.st-btn.is-pressed { background: var(--st-card-hover, var(--st-soft)); border-color: var(--st-accent); }
/* 간단 이력 */
.st-history {
  width: 280px; padding: 6px; border-radius: var(--st-radius-md);
  background: var(--st-card, var(--st-surface)); box-shadow: var(--st-shadow-float);
}
.st-history-list { max-height: 280px; overflow-y: auto; }
.st-history-item {
  display: flex; align-items: center; gap: 8px; width: 100%; height: 32px; padding: 0 10px;
  border: 0; border-radius: var(--st-radius-sm); background: transparent; cursor: pointer;
  font-size: 13px; font-weight: 600; color: var(--st-ink-2); text-align: left;
}
.st-history-item:hover:not(.is-current) { background: var(--st-card-hover, var(--st-soft)); }
.st-history-item.is-current { background: var(--st-accent-soft); color: var(--st-accent); font-weight: 800; }
.st-history-time { margin-left: auto; font-size: 12px; font-weight: 600; color: var(--st-muted); font-variant-numeric: tabular-nums; }
.st-history-note { margin-top: 6px; padding: 6px 10px 4px; border-top: 1px solid var(--st-line); font-size: 12px; color: var(--st-muted); }
/* 글자 걸침 안내 */
.st-erase-bleed {
  padding: 10px 12px; border-radius: var(--st-radius-md); background: var(--st-danger-soft);
  border-left: 3px solid var(--st-danger); font-size: 12px; font-weight: 700; color: var(--st-ink);
}
.st-erase-bleed .st-btn { height: 30px; padding: 0 10px; font-size: 12px; }
/* 도구 4개(12-2 [덮기] 추가)가 패널 폭 안에 들어가게 좌우 여백만 줄인다 */
.st-seg-item.st-tool-item { padding: 0 6px; min-width: 0; }
/* 덮기 단계 안내 (12-2) — 지금 할 단계만 진하게 */
.st-cover-step { font-size: 12px; font-weight: 600; color: var(--st-muted); line-height: 1.45; word-break: keep-all; }
.st-cover-step.is-now { color: var(--st-ink); font-weight: 800; }
.st-cover-step.is-done { color: var(--st-ink-2); }
/* 적용한 순서 목록 */
.st-applied { max-height: 196px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.st-applied-row {
  display: flex; align-items: center; gap: 8px; width: 100%; height: 30px; padding: 0 8px;
  border: 0; border-radius: var(--st-radius-sm); background: transparent; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--st-ink-2); text-align: left;
}
.st-applied-row:hover:not(.is-current) { background: var(--st-card-hover, var(--st-soft)); }
.st-applied-row.is-current { background: var(--st-accent-soft); color: var(--st-accent); font-weight: 800; }
.st-applied-no { width: 18px; font-size: 11px; font-weight: 700; color: var(--st-muted); font-variant-numeric: tabular-nums; }
/* 저장 못 한 AI 결과 카드 — 눈에 띄게(강조색 테두리), 경고색은 쓰지 않는다 */
.st-erase-unsaved {
  padding: 12px; border-radius: var(--st-radius-md); background: var(--st-accent-soft);
  border: 1px solid var(--st-accent);
}
</style>
