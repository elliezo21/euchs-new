<template>
  <div class="studio-root st-dark relative h-screen flex flex-col overflow-hidden" data-studio-editor>
    <!-- 상단바: ← · 로고 · 되돌리기 다시 · 작업명 · 저장 상태 · "직접 만들기 · 반자동" · [원클릭 AI 자동 제작] · 이력 · 미리보기 · 내보내기 -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-2 st-topbar st-border-b" data-topbar>
      <router-link :to="{ name: 'studio-projects' }" class="st-icon-btn" title="내 작업으로" data-back>
        <ArrowLeft class="w-5 h-5" :stroke-width="2" />
      </router-link>
      <span class="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center st-logo-mark text-[13px] font-extrabold shrink-0">E</span>
      <!-- 편집기 되돌리기·다시: 페이지 동작과 사진 필터·조정을 한 순서로 (지우기 화면의 되돌리기는 그 사진의 지우기 이력 — 따로, 결정 8) -->
      <button type="button" class="st-icon-btn" :disabled="!editorCanUndo" :title="editorCanUndo ? '되돌리기' : '되돌릴 동작이 없어요'" data-action="undo" @click="undoAny"><Undo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn" :disabled="!editorCanRedo" :title="editorCanRedo ? '다시' : '다시 할 동작이 없어요'" data-action="redo" @click="redoAny"><Redo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
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
        <button type="button" class="st-btn st-btn-ghost" :class="step === 3 ? 'st-step-hint' : ''" data-top-preview @click="showToast('곧 추가될 기능이에요.')"><Eye class="w-4 h-4" :stroke-width="2" /> 미리보기</button>
        <button type="button" class="st-btn st-btn-primary" :class="step === 3 ? 'st-step-hint' : ''" data-top-export @click="showToast('곧 추가될 기능이에요.')"><Download class="w-4 h-4" :stroke-width="2" /> 내보내기</button>
      </div>
    </header>

    <!-- 진행 단계 표시줄 (6-3): ① 사진 다듬기 → ② 페이지 꾸미기 → ③ 내보내기. 안내일 뿐, 아무 단계나 누를 수 있다 -->
    <StudioStepBar v-if="project && isWide && !loading" :step="step" @go="goStep" />

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
        <!-- 고른 요소가 있으면 위쪽에 공통 조작 칸 (6-1) + 사진 한 장이면 사진 묶음 (6-2) -->
        <div v-if="isWide && page && selectedItemIds.length" class="shrink-0 max-h-[65%] overflow-y-auto" data-selection-panels>
          <StudioTransformPanel :page="page" :selected-ids="selectedItemIds" @command="runCommand" />
          <StudioImageItemPanel
            v-if="selectedPhotoItem"
            :item="selectedPhotoItem" :look="session.lookOf(selectedPhotoItem.imageId)" :thumb-url="views[selectedPhotoItem.imageId]?.url || null"
            @replace="replaceOpen = true" @remove-from-page="runCommand('removeFromPage')" @compare="onCompare"
            @reset-look="resetLookOpen = true" @look="onLook" @style="onItemStyle"
          />
          <!-- 글자 속성 (10-1): 고른 것 중 글자 요소가 있으면 — 바꾸면 글자 요소에만 -->
          <StudioTextItemPanel
            v-if="selectedHasText" :page="page" :selected-ids="selectedItemIds" :can-paste-style="canPasteStyle"
            @text="onTextProps" @style-copy="runCommand('styleCopy')" @style-paste="runCommand('stylePaste')"
          />
          <!-- 도형·선 속성 (11-1): 고른 것 중 도형·선이 있으면 — 바꾸면 그 종류에만 -->
          <StudioShapeItemPanel v-if="selectedHasElement" :page="page" :selected-ids="selectedItemIds" @shape="onShapeProps" @line="onLineProps" />
        </div>
        <div class="flex-1 min-h-0 flex flex-col">
          <StudioPhotoPanel
            v-if="activeTool === 'photo' || !isWide"
            :key="project.id" ref="photoPanel"
            :images="images" :views="views" :selected-image-id="selectedImageId" :fill-count="fillCount" :order-error="orderError"
            :bake-state="bakeQueue.state" :placed-ids="placedIds"
            @select="selectFromPanel" @open-erase="openErase" @add="addOpen = true" @retry-image="retryView" @retry-bake="requestBake"
            @visible="onListVisible" @shown="onListShown" @set-included="onSetIncluded" @insert="onInsertImage"
          />
          <!-- [구간] 패널 (8-1): 골라진 구간 다루기 + 페이지 전체 구간 간격 -->
          <StudioSectionPanel
            v-else-if="activeTool === 'section' && page"
            ref="sectionPanel" :page="page" :section-id="selectedSectionId" :section-label="selectedSectionLabel"
            @command="runCommand"
          />
          <!-- [텍스트] 패널 (10-1): 제목·부제목·본문 넣기 -->
          <StudioTextPanel v-else-if="activeTool === 'text'" :disabled="!page" @insert="insertText" @style="onStylePreset" />
          <!-- [요소] 패널 (11-1): 도형·선·화살표 넣기 -->
          <StudioElementPanel v-else-if="activeTool === 'element'" :disabled="!page" @insert="insertElement" />
          <div v-else class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center" data-panel-soon>
            <span class="st-icon-box"><component :is="railItem(activeTool).icon" class="w-5 h-5" :stroke-width="2" /></span>
            <div class="text-[14px] font-bold st-ink">{{ railItem(activeTool).label }}</div>
            <p class="st-desc break-keep">{{ railItem(activeTool).soon }}</p>
          </div>
        </div>
      </aside>

      <!-- 가운데: 긴 한 장 페이지 (4단계, DOM — 구간이 위에서 아래로 쌓인다) -->
      <section v-if="isWide" class="flex-1 min-w-0 relative st-canvas-bg st-dotgrid" data-canvas-area>
        <div ref="pageScroll" class="absolute inset-0 overflow-auto" data-page-scroll @pointerdown.self="clearSelection">
          <p v-if="pageSession.readError.value" class="p-6 text-[13px] font-bold st-danger-text break-keep" data-page-error>{{ pageSession.readError.value }}</p>
          <div v-else-if="page && page.sections.length" class="pt-8 pb-24" :style="{ paddingLeft: `${PAGE_GUTTER}px`, paddingRight: `${PAGE_GUTTER}px` }" @pointerdown.self="clearSelection">
            <StudioPageView
              ref="pageView"
              :page="page" :zoom="zoom" :images-by-id="imagesById" :views="views" :selected-ids="selectedItemIds" :bake-state="bakeQueue.state"
              :looks="session.lookMap" :compare="compare" :selected-section-id="selectedSectionId" :text-edit="textEdit"
              @edit-text="startTextEdit" @text-commit="onTextCommit"
              @select="onPageSelect" @change="onPageChange" @context="openContextMenu" @select-section="pickSection"
              @open-erase="openErase" @retry-image="retryView"
              @visible="onPageVisible" @shown="onPageShown" @drop-image="onDropImage"
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
        <!-- 미니뷰 (8-2): 구간 작은 그림 — 누르면 그 구간으로 가서 고름. 보는 중(점선)·골라짐(실선) -->
        <StudioMiniMap
          v-if="rightTab === 'mini' && page"
          :page="page" :views="views" :looks="session.lookMap" :labels="sectionLabels"
          :active-section-id="inViewSectionId" :selected-section-id="selectedSectionId"
          @pick="onMiniPick"
        />
        <!-- 레이어 (9단계): 고른 요소의 구간 → 골라진 구간 → 보는 중 구간의 요소 목록 -->
        <StudioLayerPanel
          v-else-if="rightTab === 'layers' && page"
          :page="page" :section-id="layerSectionId" :section-label="layerSectionId ? sectionLabels[layerSectionId] ?? '' : ''"
          :selected-ids="selectedItemIds" :views="views" :images-by-id="imagesById"
          @select="onLayerSelect" @command="runCommand"
        />
        <div v-else class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col items-center justify-center text-center gap-2" data-right-soon>
          <p class="st-desc break-keep">{{ rightTab === 'mini' ? '페이지가 준비되면 구간 미리보기가 보여요.' : '페이지가 준비되면 레이어 목록이 보여요.' }}</p>
        </div>
        <div class="p-3 space-y-2 st-border-t">
          <button
            type="button" class="st-btn st-btn-block" :disabled="!page || page.sections.length < 2"
            :title="page && page.sections.length < 2 ? '구간이 2개 이상일 때 순서를 바꿀 수 있어요' : '구간 순서를 한눈에 보고 바꿔요'"
            data-reorder @click="reorderOpen = true"
          ><ArrowUpDown class="w-4 h-4" :stroke-width="2" /> 순서 변경</button>
          <button type="button" class="st-btn st-btn-block" data-gap @click="openGapField"><MoveVertical class="w-4 h-4" :stroke-width="2" /> 구간 간격</button>
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

    <!-- [순서 변경] 화면 (8-2): [완료] = 한 번에 적용(이력 1개), [취소]·Esc·바깥 = 그대로 닫기 -->
    <StudioReorderModal
      v-if="page" :open="reorderOpen" :page="page" :views="views" :looks="session.lookMap" :names="sectionNames"
      @apply="onReorderApply" @close="reorderOpen = false"
    />

    <!-- 우클릭 메뉴 (6-1) -->
    <StudioContextMenu :open="ctx.open" :x="ctx.x" :y="ctx.y" :items="ctx.items" @select="onContextSelect" @close="ctx.open = false" />

    <div v-if="toast" class="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-[10px] st-card st-shadow-float text-[13px] font-bold st-ink break-keep" style="z-index: 30" data-toast>{{ toast }}</div>

    <!-- 사진 추가 -->
    <StudioModal :open="addOpen" wide title="내 사진 올리기" @close="addOpen = false">
      <StudioUploadPanel v-if="project" :project-id="project.id" :used-count="usedCount" @finished="onAddFinished" />
      <template #actions>
        <button type="button" class="st-btn" @click="addOpen = false">닫기</button>
      </template>
    </StudioModal>

    <!-- 사진 바꾸기 (6-2): 이 작업의 다른 사진 고르기 — 자리·크기·회전은 그대로 -->
    <StudioModal :open="replaceOpen" wide title="어떤 사진으로 바꿀까요?" @close="replaceOpen = false">
      <p class="st-desc mb-3 break-keep">자리·크기·회전·꾸미기는 그대로 두고 사진만 바뀌어요.</p>
      <div class="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto" data-replace-grid>
        <button
          v-for="img in doneImages" :key="img.id" type="button" class="st-replace-cell" :class="img.id === selectedPhotoItem?.imageId ? 'is-current' : ''"
          :disabled="img.id === selectedPhotoItem?.imageId" :data-replace-pick="img.id" @click="pickReplace(img.id)"
        >
          <img v-if="views[img.id]?.url" :src="views[img.id].url" alt="" draggable="false" />
          <span v-else class="absolute inset-0 st-skeleton" />
          <span v-if="img.included === false" class="st-replace-tag">안 쓸 사진</span>
          <span v-if="img.id === selectedPhotoItem?.imageId" class="st-replace-tag">지금 사진</span>
        </button>
      </div>
      <template #actions>
        <button type="button" class="st-btn" @click="replaceOpen = false">닫기</button>
      </template>
    </StudioModal>

    <!-- 안 쓸 사진으로 옮길 때 페이지에 놓인 경우 (6-2) -->
    <StudioModal :open="!!includeAsk" title="페이지에 놓인 사진이에요" @close="includeAsk = null">
      안 쓸 사진으로 옮기면서 페이지에서도 뺄까요? 빼도 사진은 [안 쓸 사진]에 그대로 있어요.
      <template #actions>
        <button type="button" class="st-btn" @click="includeAsk = null">취소</button>
        <button type="button" class="st-btn" data-include-list-only @click="confirmInclude(false)">목록에서만 옮기기</button>
        <button type="button" class="st-btn st-btn-primary" data-include-and-page @click="confirmInclude(true)">페이지에서도 빼기</button>
      </template>
    </StudioModal>

    <!-- 필터·조정 초기화 확인 (6-2) — 지우기는 그대로 -->
    <StudioModal :open="resetLookOpen" title="필터·조정을 처음으로 돌릴까요?" @close="resetLookOpen = false">
      이 사진의 필터와 밝기·대비 같은 조정이 처음으로 돌아가요. 지운 곳은 그대로 남아요.
      <template #actions>
        <button type="button" class="st-btn" @click="resetLookOpen = false">취소</button>
        <button type="button" class="st-btn st-btn-primary" data-confirm-reset-look @click="confirmResetLook">처음으로</button>
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
import { ref, shallowRef, reactive, computed, watch, nextTick, onMounted, onUnmounted, provide } from 'vue'
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
import StudioTransformPanel from '@/components/studio/StudioTransformPanel.vue'
import StudioContextMenu from '@/components/studio/StudioContextMenu.vue'
import StudioImageItemPanel from '@/components/studio/StudioImageItemPanel.vue'
import StudioStepBar from '@/components/studio/StudioStepBar.vue'
import StudioSectionPanel from '@/components/studio/StudioSectionPanel.vue'
import StudioMiniMap from '@/components/studio/StudioMiniMap.vue'
import StudioReorderModal from '@/components/studio/StudioReorderModal.vue'
import StudioLayerPanel from '@/components/studio/StudioLayerPanel.vue'
import StudioTextPanel from '@/components/studio/StudioTextPanel.vue'
import StudioTextItemPanel from '@/components/studio/StudioTextItemPanel.vue'
import StudioElementPanel from '@/components/studio/StudioElementPanel.vue'
import StudioShapeItemPanel from '@/components/studio/StudioShapeItemPanel.vue'
import { createTextMeasure, ensureStudioFonts, onFontsChanged, fontsReadyNow, loadFontsFor } from '@/lib/studioFonts'
import {
  isValidTextItem, normalizeTextItem, patchTextItem, textStyleOf, TEXT_INSERT_KINDS, stylePresetByKey, presetPatch, textStyleValues,
} from '@/lib/studioText'
import { readStep, writeStep, stepInfo, STEP_DEFAULT } from '@/lib/studioSteps'
import { SOURCE_MINE } from '@/lib/studioPhotoTabs'
import {
  loadMyProject, listEditorImages, signViewUrls, sortStudioImages, sortBySortOrder, hasSortOrderOverlap, setImageIncluded,
  renumberSortOrders, projectDisplayTitle, KIND_LABEL, SIGNED_URL_TTL,
} from '@/lib/studioProjects'
import { createImageCache, createSignedUrlPool } from '@/lib/studioImageCache'
import { useEraseSession } from '@/composables/useEraseSession'
import { useBakeQueue } from '@/composables/useBakeQueue'
import { fillCounts } from '@/lib/studioEdit'
import { usableFinalVersion, sameLayers } from '@/lib/studioFinal'
import { usePageSession } from '@/composables/usePageSession'
import { createViewImageStore, finalPathOf } from '@/lib/studioViewImage'
import {
  firstItemOfImage, findItem, fitZoom, PAGE_WIDTH, PAGE_WIDTH_LABEL, ZOOM_PRESETS, PASTE_OFFSET,
  moveItems, setItemRect, setRotation, rotateBy, flipItems, setOpacity, setLocked, setHidden, alignItems, reorderItems,
  removeItems, copyItems, pasteItems, duplicateItems, sectionItemIds, isValidImageItem,
  setItemStyle, replaceItemImage, itemIdsOfImage, pageImageIds, insertImageNear, dropImageAt,
  addSection, removeSection, moveSection, setSectionHeight, setGap, duplicateSection, setSectionBg, SECTION_MAX, reorderSections,
  groupItems, ungroupItems, groupCheck, anyGrouped, reorderItemTo,
  addTextItem, setTextProps, setTextContent, addElementItem, setShapeProps, setLineProps,
} from '@/lib/studioPage'
import { isValidShapeItem, isValidLineItem, elementKindByKey } from '@/lib/studioShape'
import { LABELS } from '@/lib/studioHistory'
import { unsavedReasons, guardBeforeUnload, eraseCloseMode, savedTitle } from '@/lib/studioSaveGuard'

provide('studioDark', true) // Teleport로 body에 붙는 모달도 어둡게 (StudioModal)
// 글자 폭 재기 (10-1) — 페이지·미니뷰·순서 변경 그림이 같은 측정(캔버스 measureText)으로 줄을 나눈다. 글꼴을 새로 받으면 캐시를 비우고 epoch를 올려 다시 그린다
const textMeasure = createTextMeasure()
const fontEpoch = ref(0)
provide('studioTextLayout', { measure: textMeasure, epoch: fontEpoch })
let offFontsChanged = null
// Fabric(StudioCanvas)은 지우기 화면(StudioEraseScreen)이 열릴 때만 받는다. 페이지는 DOM (방식 C)

const PAGE_GUTTER = 110 // 페이지 양옆 여백 (왼쪽에 구간 이름이 들어간다)

// 아이콘 막대. 3단계에서 동작하는 것은 [사진]. [구간]은 8단계, [텍스트]는 10-1단계(StudioTextPanel), [요소]는 11-1단계(StudioElementPanel), 나머지는 그 뒤
const RAIL = [
  { key: 'template', label: '템플릿', icon: LayoutTemplate, soon: '어울리는 템플릿 고르기는 곧 추가될 기능이에요.' },
  { key: 'section', label: '구간', icon: Rows3, soon: '페이지가 준비되면 여기서 구간을 다룰 수 있어요.' }, // 8-1: 페이지가 있으면 StudioSectionPanel
  { key: 'photo', label: '사진', icon: ImageIcon, soon: '' },
  { key: 'text', label: '텍스트', icon: Type, soon: '글자 넣기는 곧 추가될 기능이에요.' },
  { key: 'element', label: '요소', icon: Shapes, soon: '도형·아이콘 넣기는 곧 추가될 기능이에요.' },
  { key: 'bg', label: '배경합성', icon: Blend, soon: '배경 바꾸기는 곧 추가될 기능이에요.' },
  { key: 'saved', label: '저장값', icon: Bookmark, soon: '인트로·배송안내 같은 저장값 넣기는 곧 추가될 기능이에요.' },
]
const railItem = key => RAIL.find(r => r.key === key) || RAIL[2]

// ── 진행 단계 표시줄 (6-3) — 지금 단계는 브라우저에만 기억 (작업별 localStorage, studioSteps). 처음 열면 ① ──
const step = ref(STEP_DEFAULT)
function stepStorage() {
  try { return window.localStorage } catch (e) { console.warn('[StudioEditor] 브라우저 저장소를 쓸 수 없어 단계를 기억하지 않음:', e.message); return null }
}
/** 그 단계로 — 그 단계 작업 쪽으로 왼쪽 패널을 바꿔 준다 (①·② 사진 — ②는 8단계에서 구간으로, studioSteps. ③은 상단 미리보기·내보내기를 표시) */
function goStep(n) {
  const info = stepInfo(n)
  step.value = info.no
  writeStep(stepStorage(), project.value?.id, info.no)
  if (info.panel && isWide.value) activeTool.value = info.panel
}

const route = useRoute()
const router = useRouter()
const project = ref(null)
const images = ref([])
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
// 작업을 열 때마다 그 작업에서 기억한 단계로 (패널은 바꾸지 않는다 — 처음 화면은 예전처럼 [사진])
watch(() => project.value?.id, id => { step.value = readStep(stepStorage(), id) })
let loadSeq = 0
let leaveTarget = null
let leaveBypass = false
let toastTimer = null
let viewUrlTimer = null

// 서명 URL 모음 하나를 목록 썸네일·페이지 작은 사진·지우기 화면이 같이 쓴다 (같은 주소 → 원본을 두 번 받지 않음)
const urlPool = createSignedUrlPool()
const imageCache = createImageCache({ limit: 5, pool: urlPool })

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
const selectedItemIds = ref([])  // 페이지에서 고른 요소 (6-1: 여러 개)
const textEdit = ref(null)       // { id, selectAll } 고치는 중인 글자 요소 (10-1) — 그동안 편집기 단축키는 쉰다
let selectionSource = 'list'     // 'page' = 페이지에서 고름(방향키 = 옮기기) / 'list' = 목록에서 고름(방향키 = 사진 바꾸기)
const pageView = ref(null)
const pageScroll = ref(null)
const photoPanel = ref(null) // [사진] 목록 (7단계: 올린 뒤 [내 사진] 탭으로 — showTab)

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
  pruneSelection()
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

// ── 페이지 요소 고르기 (6-1) ──
function onPageSelect({ ids }) {
  selectedItemIds.value = ids
  selectedSectionId.value = null // 요소를 고르거나 빈 곳을 누르면 구간 고르기는 풀린다 (8-1)
  selectionSource = 'page'
  // 사진 요소 한 개를 고르면 목록·사진 정보 카드도 그 사진으로
  const one = ids.length === 1 && page.value ? findItem(page.value, ids[0])?.item : null
  if (one && isValidImageItem(one) && one.imageId !== selectedImageId.value && doneImages.value.some(i => i.id === one.imageId)) selectImage(one.imageId)
}
function clearSelection() { selectedItemIds.value = []; selectedSectionId.value = null }
/** 없어진 요소·구간(되돌리기·충돌 불러오기 등)은 선택에서 뺀다 */
function pruneSelection() {
  const p = page.value
  const keep = p ? selectedItemIds.value.filter(id => findItem(p, id)) : []
  if (keep.length !== selectedItemIds.value.length) selectedItemIds.value = keep
  if (selectedSectionId.value && !p?.sections.some(s => s.id === selectedSectionId.value)) selectedSectionId.value = null
  if (textEdit.value && !(p && findItem(p, textEdit.value.id))) textEdit.value = null // 고치던 글자가 없어짐(충돌 불러오기 등)
}

// ── 구간 고르기 (8-1) — 구간 이름·요소 없는 구간의 빈 곳·우클릭으로 고른다. 요소를 고르면 풀리고, Esc·페이지 바깥 누르기로도 풀린다.
// 왼쪽 아이콘은 바꾸지 않는다 (손님이 보던 패널 유지 — [구간] 패널이 열려 있으면 그 구간 정보가 보인다)
const selectedSectionId = ref(null)
const sectionPanel = ref(null)
watch(selectedItemIds, ids => { if (ids.length) selectedSectionId.value = null })
function pickSection(sectionId, scroll = false) {
  if (!page.value?.sections.some(s => s.id === sectionId)) return
  selectedItemIds.value = []
  selectedSectionId.value = sectionId
  if (scroll) nextTick(() => pageView.value?.scrollToSection(sectionId))
}
// 구간 이름 — 페이지 왼쪽 구간 이름과 같은 규칙(StudioPageView sectionName): 첫 사진 요소의 종류, 사진이 없으면 "구간"
// sectionNames = id → "대표 사진" (순서 변경 화면은 번호를 새 순서로 붙인다) / sectionLabels = id → "03 대표 사진" ([구간] 패널·미니뷰)
const sectionNames = computed(() => {
  const out = {}
  for (const s of page.value?.sections || []) {
    const first = s.items.find(isValidImageItem)
    const row = first ? imagesById.value.get(first.imageId) : null
    out[s.id] = row ? KIND_LABEL[row.kind] ?? '사진' : '구간'
  }
  return out
})
const sectionLabels = computed(() => {
  const out = {}
  for (const [i, s] of (page.value?.sections || []).entries()) out[s.id] = `${String(i + 1).padStart(2, '0')} ${sectionNames.value[s.id]}`
  return out
})
const selectedSectionLabel = computed(() => (selectedSectionId.value ? sectionLabels.value[selectedSectionId.value] ?? '' : ''))

// ── 미니뷰 (8-2) — 지금 화면에 가장 많이 보이는 구간을 따라간다 (페이지 스크롤·문서·배율이 바뀔 때, 한 프레임에 한 번) ──
const inViewSectionId = ref(null)
let inViewRaf = 0
function updateInView() {
  cancelAnimationFrame(inViewRaf)
  inViewRaf = requestAnimationFrame(() => { inViewSectionId.value = pageView.value?.sectionInView() ?? null })
}
watch(pageScroll, (el, old) => {
  old?.removeEventListener('scroll', updateInView)
  el?.addEventListener('scroll', updateInView, { passive: true })
  updateInView()
})
watch([page, zoom], () => nextTick(updateInView)) // 구간을 더하거나 옮기거나 배율을 바꾸면 다시 잰다
/** 미니뷰에서 누름 — 페이지를 그 구간(위쪽)으로 스크롤하고 그 구간을 고른다 (8-1 구간 고르기와 같은 상태) */
function onMiniPick(sectionId) {
  pickSection(sectionId)
  nextTick(() => pageView.value?.scrollToSection(sectionId, 'start'))
}

// ── 레이어 탭 (9단계) — 보여 줄 구간: 고른 요소가 있으면 그 구간, 아니면 골라진 구간, 아니면 지금 보는 중 구간 ──
const layerSectionId = computed(() => {
  const p = page.value
  if (!p) return null
  const first = selectedItemIds.value.length ? findItem(p, selectedItemIds.value[0]) : null
  if (first) return first.section.id
  if (selectedSectionId.value) return selectedSectionId.value
  return inViewSectionId.value
})
/** 레이어 줄 누르기 — 그 요소만(그룹 구성원 줄도 하나만), Shift = 더하기·빼기. 페이지에서 고른 것과 같은 상태(방향키 = 옮기기) */
function onLayerSelect({ ids, shift }) {
  const cur = selectedItemIds.value
  let next = ids
  if (shift) {
    const allIn = ids.every(id => cur.includes(id))
    next = allIn ? cur.filter(id => !ids.includes(id)) : [...new Set([...cur, ...ids])]
  }
  onPageSelect({ ids: next })
  if (next.length) nextTick(() => pageView.value?.scrollToItem(next[0]))
}

// ── [순서 변경] 화면 (8-2) ──
const reorderOpen = ref(false)
function onReorderApply(ids) {
  reorderOpen.value = false
  if (page.value && applyPage(reorderSections(page.value, ids), LABELS.secReorder)) showToast('구간 순서를 바꿨어요 · Ctrl+Z로 되돌리기')
}
/** 오른쪽 아래 [구간 간격] → [구간] 패널을 열고 간격 칸으로 */
function openGapField() {
  activeTool.value = 'section'
  nextTick(() => sectionPanel.value?.focusGap())
}
watch(page, pruneSelection)
/** 페이지에서 끌어 옮기기·크기·회전을 끝냄 (손을 뗄 때 한 번) */
function onPageChange({ page: next, label }) {
  applyPage(next, label)
}
// 목록·↑↓로 사진을 바꾸면 페이지의 그 사진(첫 자리)에 테두리
watch(selectedImageId, id => {
  const cur = selectedItemIds.value.length === 1 && page.value ? findItem(page.value, selectedItemIds.value[0]) : null
  if (cur && cur.item.imageId === id) return
  const itemId = id && page.value ? firstItemOfImage(page.value, id) : null
  selectedItemIds.value = itemId ? [itemId] : []
  selectionSource = 'list'
})

// ── 공통 조작 명령 (6-1) — 패널 버튼·단축키·우클릭 메뉴가 모두 이 하나로 온다 ──
let clipboard = null // 편집기 안 클립보드 (copyItems 결과) — 다른 구간에도 붙여넣을 수 있다
let pasteCount = 0   // 같은 것을 여러 번 붙여넣으면 조금씩 더 옆으로
const LOCK_BLOCKED = new Set(['rotate90', 'rotation', 'flipX', 'flipY', 'align', 'rect', 'delete', 'removeFromPage', 'cut', 'nudge'])
function applyPage(next, label, opts) {
  if (!next || next === page.value) return false
  const before = pageSession.history.value?.index
  const ok = pageSession.apply(next, label, opts)
  if (ok && pageSession.history.value?.index !== before) noteAction('page') // 합쳐진 동작(방향키 등)은 새로 쌓지 않는다
  return ok
}

// ── 편집기 되돌리기 순서 (6-2) — 페이지 동작(페이지 이력)과 사진 필터·조정(그 사진의 이력)을 누른 순서대로 되돌린다 ──
// 지우기 화면이 열려 있으면 Ctrl+Z는 예전처럼 그 사진의 지우기 이력만 (결정 8)
const actionLog = []  // 'page' | { imageId }
const redoLog = []
const logTick = ref(0) // 버튼 활성 다시 계산용
/** 로그아웃·다른 작업 — 되돌리기 순서·사진 패널 창을 비운다 */
function resetEditorLog() {
  actionLog.length = 0
  redoLog.length = 0
  logTick.value++
  compare.value = null
  replaceOpen.value = false
  resetLookOpen.value = false
  includeAsk.value = null
  reorderOpen.value = false // 8-2 [순서 변경] 화면
  textEdit.value = null     // 10-1 글자 고치기
}
function noteAction(entry) {
  actionLog.push(entry)
  if (actionLog.length > 200) actionLog.shift()
  redoLog.length = 0
  logTick.value++
}
const editorCanUndo = computed(() => { logTick.value; return !eraseOpen.value && (actionLog.length > 0 || pageSession.canUndoNow.value) })
const editorCanRedo = computed(() => { logTick.value; return !eraseOpen.value && (redoLog.length > 0 || pageSession.canRedoNow.value) })
function undoAny() {
  if (eraseOpen.value) return
  const e = actionLog.pop()
  if (!e || e === 'page') pageSession.undo()
  else session.undoImage(e.imageId)
  if (e) redoLog.push(e)
  logTick.value++
}
function redoAny() {
  if (eraseOpen.value) return
  const e = redoLog.pop()
  if (!e || e === 'page') pageSession.redo()
  else session.redoImage(e.imageId)
  if (e) actionLog.push(e)
  logTick.value++
}

// ── 사진 패널 (6-2) ──
const selectedPhotoItem = computed(() => {
  if (selectedItemIds.value.length !== 1 || !page.value) return null
  const it = findItem(page.value, selectedItemIds.value[0])?.item
  return it && isValidImageItem(it) && imagesById.value.has(it.imageId) ? it : null
})
const replaceOpen = ref(false)
const resetLookOpen = ref(false)
const includeAsk = ref(null) // { id } 안 쓸 사진으로 옮길 사진이 페이지에 놓여 있을 때
const compare = ref(null)    // { imageId, url } 원본 비교 중
let compareSeq = 0

function pickReplace(imageId) {
  const it = selectedPhotoItem.value
  replaceOpen.value = false
  if (!it || !page.value) return
  if (applyPage(replaceItemImage(page.value, it.id, imageId), LABELS.elReplace)) selectImage(imageId)
}
/** 필터·조정 → 사진 데이터(edit.look). 슬라이더를 끄는 동안(merge)은 이력 한 단계 */
function onLook(next, { merge, key } = {}) {
  const it = selectedPhotoItem.value
  if (!it) return
  const id = it.imageId
  const before = session.histories[id]?.index
  const label = merge ? LABELS.lookAdjust : LABELS.lookFilter
  if (session.setLook(id, next, label, merge ? { mergeKey: `adj-${key}` } : undefined) && session.histories[id]?.index !== before) noteAction({ imageId: id })
}
function confirmResetLook() {
  resetLookOpen.value = false
  const id = selectedPhotoItem.value?.imageId
  if (!id) return
  const before = session.histories[id]?.index
  if (session.setLook(id, null, LABELS.lookReset) && session.histories[id]?.index !== before) noteAction({ imageId: id })
}
/** 꾸미기(테두리·모서리·그림자) → 페이지 요소 */
function onItemStyle(patch, { merge, key } = {}) {
  const it = selectedPhotoItem.value
  if (!it || !page.value) return
  applyPage(setItemStyle(page.value, [it.id], patch), LABELS.elStyle, merge ? { mergeKey: `style-${key}` } : undefined)
}
/** 원본 비교 — 누르고 있는 동안 원본(지우기·필터 전). 원본은 공유 서명 주소로 받는다 (지우기 화면과 같은 주소 → 캐시) */
async function onCompare(on) {
  const seq = ++compareSeq
  if (!on) { compare.value = null; return }
  const row = selectedPhotoItem.value && imagesById.value.get(selectedPhotoItem.value.imageId)
  if (!row?.original_path) return
  try {
    const url = await urlPool.url(row.original_path)
    if (seq === compareSeq) compare.value = { imageId: row.id, url }
  } catch (e) {
    console.error('[StudioEditor] 원본 비교용 주소를 받지 못함:', row.id, e)
    showToast('원본을 불러오지 못했어요. 잠시 후 다시 해 주세요.')
  }
}

// ── 안 쓸 사진 (6-2) — studio_images.included. 되돌리기 대신 [다시 쓰기] ──
function onSetIncluded(id, included) {
  if (!included && page.value && itemIdsOfImage(page.value, id).length) { includeAsk.value = { id }; return }
  applyIncluded(id, included, false)
}
function confirmInclude(alsoPage) {
  const id = includeAsk.value?.id
  includeAsk.value = null
  if (id) applyIncluded(id, false, alsoPage)
}
async function applyIncluded(id, included, alsoPage) {
  const row = images.value.find(i => i.id === id)
  if (!row) return
  const prev = row.included
  row.included = included // 먼저 화면에 (실패하면 되돌리고 알린다)
  try {
    await setImageIncluded(id, included)
  } catch (e) {
    row.included = prev
    console.error('[StudioEditor] 안 쓸 사진 표시 저장 실패:', id, e)
    showToast(included ? '다시 쓰기로 옮기지 못했어요. 잠시 후 다시 해 주세요.' : '안 쓸 사진으로 옮기지 못했어요. 잠시 후 다시 해 주세요.')
    return
  }
  if (alsoPage && page.value) applyPage(removeItems(page.value, itemIdsOfImage(page.value, id)), LABELS.elRemovePhoto)
  showToast(included ? '다시 쓰는 사진으로 옮겼어요.' : '안 쓸 사진으로 옮겼어요. [안 쓸 사진]에서 다시 쓸 수 있어요.')
}
// ── 목록에서 페이지로 넣기 (6-3) — 페이지 저장·되돌리기에 남는다 (applyPage). 넣은 사진을 고르고 보이게 스크롤 ──
const placedIds = computed(() => (page.value ? pageImageIds(page.value) : null))
function applyInsert(r) {
  if (!r.itemId) {
    console.error('[StudioEditor] 페이지에 넣지 못함 (크기를 모르는 사진이거나 구간이 가득 참)')
    showToast('이 사진은 지금 페이지에 넣을 수 없어요. 구간을 정리한 뒤 다시 해 주세요.')
    return
  }
  if (!applyPage(r.page, LABELS.elInsertPhoto)) return
  const it = findItem(r.page, r.itemId)?.item
  selectedItemIds.value = [r.itemId]
  selectionSource = 'page'
  if (it && it.imageId !== selectedImageId.value) selectImage(it.imageId)
  nextTick(() => pageView.value?.scrollToItem(r.itemId))
}
/** [페이지에 넣기] — 지금 보이는 구간이 비었으면 거기, 아니면 그 아래 새 구간 (studioPage.insertImageNear) */
function onInsertImage(imageId) {
  const img = imagesById.value.get(imageId)
  if (!page.value || !img || eraseOpen.value) return
  applyInsert(insertImageNear(page.value, img, pageView.value?.sectionInView() || null))
}
/** 목록 사진을 페이지에 끌어다 놓음 — 놓은 구간의 놓은 자리 (studioPage.dropImageAt) */
function onDropImage({ imageId, sectionId, x, y }) {
  const img = imagesById.value.get(imageId)
  if (!page.value || !img || img.ingest_status !== 'done' || eraseOpen.value) return
  applyInsert(dropImageAt(page.value, img, sectionId, x, y))
}
// ── 글자 (10-1) — 넣기·고치기·속성. 글꼴 조각을 받은 뒤에 재서 높이를 정한다 (받기 전 폭으로 줄바꿈을 확정하지 않는다) ──
const selectedHasText = computed(() => !!page.value && selectedItemIds.value.some(id => isValidTextItem(findItem(page.value, id)?.item)))
/** 이 글자들을 그릴 글꼴이 준비될 때까지 (이미 준비됐으면 바로). 못 받으면 알리고 대체 글꼴 폭으로 진행 */
async function whenFontsReady(list) {
  if (fontsReadyNow(list)) return
  let ok = false
  try {
    ok = await loadFontsFor(list)
  } catch (e) {
    console.error('[StudioEditor] 글꼴을 불러오지 못함:', e)
  }
  if (!ok) showToast('글꼴을 불러오지 못해 비슷한 글꼴로 보여요. 인터넷 연결을 확인해 주세요.')
  textMeasure.clear()
  fontEpoch.value++
}
/**
 * 새 요소를 넣을 구간 — 골라진 구간 → 보는 중 구간. 구간이 없는 페이지면 구간을 하나 만든 문서와 그 구간 (넣기와 같은 이력 한 단계).
 * 글자(10-1)·도형·선(11-1) 넣기가 같이 쓴다. @returns {{ page, sid } | null} null = 구간을 더 만들 수 없음
 */
function insertTarget(p) {
  const sid = [selectedSectionId.value, pageView.value?.sectionInView()].find(id => id && p.sections.some(s => s.id === id))
  if (sid) return { page: p, sid }
  const withSec = addSection(p, { at: p.sections.length })
  if (withSec === p) return null
  return { page: withSec, sid: withSec.sections[withSec.sections.length - 1].id }
}
/** [제목 넣기]·[부제목 넣기]·[본문 넣기] — 골라진 구간(없으면 보는 중 구간) 가운데에 넣고 바로 고르기 + 고치기 */
function insertText(kind) {
  const fields = TEXT_INSERT_KINDS[kind]
  if (fields) insertTextFields(fields, kind)
}
/** 새 글자 넣기 (넣기 버튼·스타일 프리셋 공통) — fields = 글자 칸 + w */
async function insertTextFields(fields, kind) {
  if (!page.value || eraseOpen.value) return
  await whenFontsReady([{ style: textStyleOf(normalizeTextItem({ type: 'text', ...fields })), text: fields.text }])
  if (!page.value || eraseOpen.value) return
  const target = insertTarget(page.value)
  if (!target) { showToast('구간을 더 만들 수 없어 글자를 넣지 못했어요.'); return }
  const { page: p, sid } = target
  const r = addTextItem(p, sid, fields, textMeasure)
  if (!r.itemId) {
    console.error('[StudioEditor] 글자를 넣지 못함:', kind, sid)
    showToast('글자를 넣지 못했어요. 잠시 후 다시 해 주세요.')
    return
  }
  if (!applyPage(r.page, LABELS.textInsert)) return
  selectedItemIds.value = [r.itemId]
  selectionSource = 'page'
  textEdit.value = { id: r.itemId, selectAll: true }
  nextTick(() => pageView.value?.scrollToItem(r.itemId))
}
/** 고치기 시작 — 글자 요소 더블클릭·골라서 Enter */
function startTextEdit(id) {
  const it = page.value ? findItem(page.value, id)?.item : null
  if (!it || !isValidTextItem(it) || eraseOpen.value) return
  if (it.locked) { showToast('잠긴 요소예요. 잠금을 풀면 고칠 수 있어요.'); return }
  selectedItemIds.value = [id]
  selectionSource = 'page'
  textEdit.value = { id, selectAll: false }
}
/** 고치기 끝 (Esc·바깥 누르기) — 한 번 = 이력 1개 "글자 고치기". 비었으면 그 요소를 지운다 */
async function onTextCommit({ id, text }) {
  textEdit.value = null
  const f = page.value ? findItem(page.value, id) : null
  if (!f || !isValidTextItem(f.item)) return
  if (text.trim() === '') {
    applyPage(removeItems(page.value, [id]), LABELS.textEdit)
    return
  }
  await whenFontsReady([{ style: textStyleOf(f.item), text }])
  if (page.value) applyPage(setTextContent(page.value, id, text, textMeasure), LABELS.textEdit)
}
const TEXT_LABEL_OF = {
  fontFamily: LABELS.textFont, fontSize: LABELS.textSize, fontWeight: LABELS.textWeight, color: LABELS.textColor,
  align: LABELS.textAlign, lineHeight: LABELS.textLineHeight, letterSpacing: LABELS.textLetterSpacing,
  // 10-2 꾸미기 — 묶음마다 한 라벨
  strokeWidth: LABELS.textStroke, strokeColor: LABELS.textStroke,
  shadowX: LABELS.textShadow, shadowY: LABELS.textShadow, shadowBlur: LABELS.textShadow, shadowColor: LABELS.textShadow, shadowOpacity: LABELS.textShadow,
  bgColor: LABELS.textBg, bgOpacity: LABELS.textBg, bgPadding: LABELS.textBg, bgRadius: LABELS.textBg,
}
/** 글자 속성 칸 → runCommand (다른 조작과 같은 길) */
function onTextProps(patch, { merge, key } = {}) {
  runCommand('textProps', { patch, merge, key })
}
/**
 * 고른 것 중 글자 요소에만 속성 적용. 새 글꼴·굵기면 받은 뒤에 잰다. 슬라이더를 끄는 동안(merge)은 이력 한 단계.
 * label을 주면 그 라벨(스타일 적용·붙여넣기), 없으면 patch 첫 칸의 라벨
 */
async function applyTextProps(ids, { patch, merge, key, label: fixedLabel }) {
  const p = page.value
  const targets = ids.filter(id => isValidTextItem(findItem(p, id)?.item))
  const label = fixedLabel ?? TEXT_LABEL_OF[Object.keys(patch)[0]]
  if (!label) console.error('[StudioEditor] 글자 속성 라벨 없음 — 적용 안 함:', patch)
  if (!targets.length || !label) return
  await whenFontsReady(targets.map(id => {
    const it = patchTextItem(findItem(p, id).item, patch)
    return { style: textStyleOf(it), text: it.text }
  }))
  if (page.value) applyPage(setTextProps(page.value, targets, patch, textMeasure), label, merge ? { mergeKey: `text-${key}` } : undefined)
}

// ── 스타일 프리셋·스타일 복사 (10-2, 글자끼리) — 복사한 모양은 편집기 메모리에만 (저장·다른 작업으로 안 넘김, 로그아웃 때 비움) ──
const styleClip = shallowRef(null) // textStyleValues 결과
const selectedTextIds = computed(() => (page.value ? selectedItemIds.value.filter(id => isValidTextItem(findItem(page.value, id)?.item)) : []))
const canPasteStyle = computed(() => !!styleClip.value && selectedTextIds.value.length > 0)
/** 프리셋 누름 — 글자를 골라 뒀으면 그 글자들에(글·자리·폭 그대로, 이력 1개 "스타일 적용"), 아니면 그 모양으로 새 글자 */
function onStylePreset(key) {
  const preset = stylePresetByKey(key)
  if (!preset) { console.error('[StudioEditor] 모르는 스타일 프리셋:', key); return }
  if (selectedTextIds.value.length) runCommand('stylePreset', { key })
  else insertTextFields({ ...TEXT_INSERT_KINDS.subtitle, ...presetPatch(preset), text: preset.sample, fontSize: preset.size }, `style:${key}`)
}
// ── 도형·선 (11-1) — [요소] 패널 넣기 + 속성 칸. 모양·그리기 규칙은 studioShape.js ──
const selectedHasElement = computed(() => !!page.value && selectedItemIds.value.some(id => {
  const it = findItem(page.value, id)?.item
  return isValidShapeItem(it) || isValidLineItem(it)
}))
/** [요소] 패널 견본 누름 — 골라진 구간(없으면 보는 중 구간) 가운데에 넣고 바로 고르기 */
function insertElement(key) {
  const kind = elementKindByKey(key)
  if (!kind) { console.error('[StudioEditor] 모르는 요소 종류:', key); return }
  if (!page.value || eraseOpen.value) return
  const target = insertTarget(page.value)
  if (!target) { showToast('구간을 더 만들 수 없어 넣지 못했어요.'); return }
  const r = addElementItem(target.page, target.sid, kind.fields)
  if (!r.itemId) {
    console.error('[StudioEditor] 요소를 넣지 못함:', key, target.sid)
    showToast('넣지 못했어요. 잠시 후 다시 해 주세요.')
    return
  }
  if (!applyPage(r.page, kind.fields.type === 'line' ? LABELS.elInsertLine : LABELS.elInsertShape)) return
  selectedItemIds.value = [r.itemId]
  selectionSource = 'page'
  nextTick(() => pageView.value?.scrollToItem(r.itemId))
}
const SHAPE_LABEL_OF = { shape: LABELS.shapeKind, fill: LABELS.shapeFill, fillOpacity: LABELS.shapeFill, strokeWidth: LABELS.shapeStroke, strokeColor: LABELS.shapeStroke, radius: LABELS.shapeRadius }
const LINE_LABEL_OF = { strokeWidth: LABELS.lineWidth, color: LABELS.lineColor, dash: LABELS.lineDash, startCap: LABELS.lineCap, endCap: LABELS.lineCap }
/** 도형·선 속성 칸 → runCommand (다른 조작과 같은 길) */
function onShapeProps(patch, { merge, key } = {}) { runCommand('shapeProps', { patch, merge, key }) }
function onLineProps(patch, { merge, key } = {}) { runCommand('lineProps', { patch, merge, key }) }
function copyTextStyle() {
  const it = selectedTextIds.value.length === 1 ? findItem(page.value, selectedTextIds.value[0]).item : null
  if (!it) { showToast('글자 하나를 골라야 모양을 복사할 수 있어요.'); return }
  styleClip.value = textStyleValues(it)
  showToast('글자 모양을 복사했어요 · 다른 글자를 고르고 Ctrl+Alt+V')
}
function sectionOfItem(id) { return page.value ? findItem(page.value, id)?.section.id || null : null }
function runCommand(name, args = {}) {
  const p = page.value
  if (!p || eraseOpen.value) return
  const ids = selectedItemIds.value
  if (LOCK_BLOCKED.has(name) && ids.length && ids.every(id => findItem(p, id)?.item.locked)) {
    showToast('잠긴 요소예요. 잠금을 풀면 바꿀 수 있어요.')
    return
  }
  switch (name) {
    case 'nudge': applyPage(moveItems(p, ids, args.dx, args.dy), LABELS.elMove, { mergeKey: 'nudge' }); break
    case 'rotate90': applyPage(rotateBy(p, ids, 90), LABELS.elRotate); break
    case 'rotation': applyPage(setRotation(p, ids, args.deg), LABELS.elRotate); break
    case 'flipX': applyPage(flipItems(p, ids, 'x'), LABELS.elFlip); break
    case 'flipY': applyPage(flipItems(p, ids, 'y'), LABELS.elFlip); break
    case 'align': applyPage(alignItems(p, ids, args.where), LABELS.elAlign); break
    case 'order': applyPage(reorderItems(p, ids, args.where), LABELS.elOrder); break
    case 'opacity': applyPage(setOpacity(p, ids, args.v), LABELS.elOpacity, args.merge ? { mergeKey: 'opacity' } : undefined); break
    case 'rect': if (ids.length === 1) applyPage(setItemRect(p, ids[0], args, textMeasure), LABELS.elNumber); break // 글자는 세로 자동 (10-1)
    case 'textProps': applyTextProps(ids, args); break // 10-1 글자 속성 (글꼴을 받은 뒤 반영 — 비동기)
    // ── 10-2 스타일 (글자끼리) — 프리셋 적용·스타일 복사·붙여넣기. 붙인 뒤 줄바꿈·높이 다시 (setTextProps) ──
    case 'stylePreset': {
      const preset = stylePresetByKey(args.key)
      if (preset) applyTextProps(ids, { patch: presetPatch(preset), label: LABELS.textStylePreset })
      break
    }
    case 'styleCopy': copyTextStyle(); break
    // ── 11-1 도형·선 속성 — 그 종류에만 (setShapeProps·setLineProps). 슬라이더·색 고르기를 끄는 동안(merge)은 이력 한 단계 ──
    case 'shapeProps':
      applyPage(setShapeProps(p, ids, args.patch), SHAPE_LABEL_OF[Object.keys(args.patch)[0]], args.merge ? { mergeKey: `shape-${args.key}` } : undefined)
      break
    case 'lineProps':
      applyPage(setLineProps(p, ids, args.patch), LINE_LABEL_OF[Object.keys(args.patch)[0]], args.merge ? { mergeKey: `line-${args.key}` } : undefined)
      break
    case 'stylePaste':
      if (!styleClip.value) { showToast('먼저 글자 모양을 복사해 주세요 (Ctrl+Alt+C).'); break }
      if (!selectedTextIds.value.length) { showToast('모양을 붙일 글자를 골라 주세요.'); break }
      applyTextProps(ids, { patch: styleClip.value, label: LABELS.textStylePaste })
      break
    case 'lock': applyPage(setLocked(p, ids, true), LABELS.elLock); break
    case 'unlock': applyPage(setLocked(p, ids, false), LABELS.elUnlock); break
    case 'hide': applyPage(setHidden(p, ids, true), LABELS.elHide); break
    case 'show': applyPage(setHidden(p, ids, false), LABELS.elShow); break
    case 'duplicate': {
      const r = duplicateItems(p, ids)
      if (applyPage(r.page, LABELS.elDuplicate)) { selectedItemIds.value = r.ids; selectionSource = 'page' }
      break
    }
    case 'delete':
    case 'removeFromPage': { // 페이지에서 빼기 = 삭제와 같은 동작 (사진은 목록·parked에 남는다)
      const next = removeItems(p, ids)
      if (applyPage(next, name === 'delete' ? LABELS.elDelete : LABELS.elRemovePhoto) && ids.some(id => findItem(next, id))) showToast('잠긴 요소는 지우지 않았어요.')
      break
    }
    case 'copy':
      if (!ids.length) return
      clipboard = copyItems(p, ids)
      pasteCount = 0
      break
    case 'cut': {
      const removable = ids.filter(id => !findItem(p, id)?.item.locked)
      if (!removable.length) return
      clipboard = copyItems(p, removable)
      pasteCount = 0
      applyPage(removeItems(p, removable), LABELS.elCut)
      break
    }
    case 'paste': {
      if (!clipboard?.length) return
      const target = args.sectionId || (ids.length ? sectionOfItem(ids[0]) : null) || pageView.value?.sectionInView() || p.sections[0]?.id
      pasteCount++
      const r = pasteItems(p, target, clipboard, PASTE_OFFSET * pasteCount)
      if (applyPage(r.page, LABELS.elPaste)) { selectedItemIds.value = r.ids; selectionSource = 'page' }
      break
    }
    case 'selectAll': {
      const sid = pageView.value?.sectionInView()
      if (sid) { selectedItemIds.value = sectionItemIds(p, sid); selectionSource = 'page' }
      break
    }
    // ── 구간 (8-1) — 대상 = args.sectionId(우클릭 메뉴) 아니면 골라진 구간. 모두 페이지 이력·저장을 탄다 ──
    case 'sectionAdd': {
      const sid = args.sectionId ?? selectedSectionId.value
      const i = sid ? p.sections.findIndex(s => s.id === sid) : -1
      const at = args.where === 'end' || i < 0 ? p.sections.length : args.where === 'above' ? i : i + 1
      const next = addSection(p, { at })
      if (applyPage(next, LABELS.secAdd)) pickSection(next.sections[at].id, true)
      break
    }
    case 'sectionDuplicate': {
      const r = duplicateSection(p, args.sectionId ?? selectedSectionId.value)
      if (r.sectionId && applyPage(r.page, LABELS.secDuplicate)) pickSection(r.sectionId, true)
      break
    }
    case 'sectionMove': {
      const sid = selectedSectionId.value
      const i = sid ? p.sections.findIndex(s => s.id === sid) : -1
      if (i >= 0 && applyPage(moveSection(p, sid, i + args.by), LABELS.secMove)) nextTick(() => pageView.value?.scrollToSection(sid))
      break
    }
    case 'sectionHeight': applyPage(setSectionHeight(p, selectedSectionId.value, args.h), LABELS.secHeight); break
    case 'sectionBg': {
      const sid = selectedSectionId.value
      applyPage(setSectionBg(p, sid, args.color), LABELS.secBg, args.merge ? { mergeKey: `secBg-${sid}` } : undefined)
      break
    }
    case 'sectionDelete': { // 확인창 없이 — removeSection이 사진을 parked로 옮기므로 사진은 잃지 않는다. Ctrl+Z로 되돌림
      const sid = args.sectionId ?? selectedSectionId.value
      if (applyPage(removeSection(p, sid), LABELS.secDelete)) {
        selectedSectionId.value = null
        showToast('구간을 지웠어요. 사진은 [사진] 목록에 그대로 있어요 · Ctrl+Z로 되돌리기')
      }
      break
    }
    case 'gap': applyPage(setGap(p, args.v), LABELS.secGap); break
    // ── 그룹 (9단계) — 묶기는 같은 구간의 2개 이상만. 풀기는 고른 요소가 속한 그룹을 통째로 ──
    case 'group': {
      const c = groupCheck(p, ids)
      if (c === 'mixed') { showToast('같은 구간 안의 요소만 묶을 수 있어요'); break }
      applyPage(groupItems(p, ids), LABELS.grpGroup)
      break
    }
    case 'ungroup': applyPage(ungroupItems(p, ids), LABELS.grpUngroup); break
    // ── 레이어 탭 (9단계) — 줄의 눈·자물쇠(그룹 줄은 구성원 전체), 줄 끌기로 앞뒤 순서 ──
    case 'layerHidden': applyPage(setHidden(p, args.ids, args.hidden), args.hidden ? LABELS.elHide : LABELS.elShow); break
    case 'layerLocked': applyPage(setLocked(p, args.ids, args.locked), args.locked ? LABELS.elLock : LABELS.elUnlock); break
    case 'layerMove': applyPage(reorderItemTo(p, args.ids, args.toIndex), LABELS.elOrder); break
    default:
      console.error('[StudioEditor] 모르는 조작:', name)
  }
}

// ── 우클릭 메뉴 (6-1) ──
const ctx = reactive({ open: false, x: 0, y: 0, items: [], sectionId: null })
function openContextMenu({ x, y, itemId, sectionId }) {
  if (eraseOpen.value) return
  const p = page.value
  const hasClip = !!clipboard?.length
  if (!itemId) {
    // 구간 빈 곳·구간 이름 우클릭 = 그 구간을 고르고 구간 메뉴도 함께 (8-1)
    if (sectionId) pickSection(sectionId)
    const noSec = !sectionId, full = p.sections.length >= SECTION_MAX
    ctx.items = [
      { key: 'paste', label: '붙여넣기', keys: 'Ctrl+V', disabled: !hasClip },
      { key: 'selectAll', label: '이 구간 전체 선택', keys: 'Ctrl+A' },
      { sep: true },
      { key: 'sec-add-above', label: '위에 구간 추가', disabled: noSec || full },
      { key: 'sec-add-below', label: '아래에 구간 추가', disabled: noSec || full },
      { key: 'sec-duplicate', label: '구간 복제', disabled: noSec || full },
      { sep: true },
      { key: 'sec-delete', label: '구간 삭제', danger: true, disabled: noSec },
    ]
    ctx.sectionId = sectionId
  } else {
    const items = selectedItemIds.value.map(id => findItem(p, id)?.item).filter(Boolean)
    const anyLocked = items.some(it => it.locked), allLocked = items.length > 0 && items.every(it => it.locked)
    const anyHidden = items.some(it => it.hidden)
    ctx.items = [
      { key: 'duplicate', label: '복제', keys: 'Ctrl+D' },
      { key: 'copy', label: '복사', keys: 'Ctrl+C' },
      { key: 'paste', label: '붙여넣기', keys: 'Ctrl+V', disabled: !hasClip },
      { key: 'cut', label: '잘라내기', keys: 'Ctrl+X', disabled: allLocked },
      { sep: true },
      // 10-2 스타일 복사·붙여넣기 (글자끼리)
      { key: 'styleCopy', label: '스타일 복사', keys: 'Ctrl+Alt+C', disabled: selectedTextIds.value.length !== 1 },
      { key: 'stylePaste', label: '스타일 붙여넣기', keys: 'Ctrl+Alt+V', disabled: !canPasteStyle.value },
      { sep: true },
      { key: 'group', label: '그룹으로 묶기', keys: 'Ctrl+G', disabled: groupCheck(p, selectedItemIds.value) !== 'ok' },
      { key: 'ungroup', label: '그룹 풀기', keys: 'Ctrl+Shift+G', disabled: !anyGrouped(p, selectedItemIds.value) },
      { sep: true },
      { key: 'order-front', label: '맨 앞으로' },
      { key: 'order-forward', label: '앞으로' },
      { key: 'order-backward', label: '뒤로' },
      { key: 'order-back', label: '맨 뒤로' },
      { sep: true },
      { key: 'rotate90', label: '90° 돌리기', disabled: allLocked },
      { key: 'flipX', label: '좌우 뒤집기', disabled: allLocked },
      { key: 'flipY', label: '상하 뒤집기', disabled: allLocked },
      { sep: true },
      { key: anyLocked ? 'unlock' : 'lock', label: anyLocked ? '잠금 풀기' : '잠그기' },
      { key: anyHidden ? 'show' : 'hide', label: anyHidden ? '보이기' : '숨기기' },
      { sep: true },
      { key: 'delete', label: '삭제', keys: 'Delete', danger: true, disabled: allLocked },
    ]
    ctx.sectionId = null
  }
  Object.assign(ctx, { open: true, x, y })
}
const SECTION_MENU = {
  'sec-add-above': ['sectionAdd', { where: 'above' }], 'sec-add-below': ['sectionAdd', { where: 'below' }],
  'sec-duplicate': ['sectionDuplicate', {}], 'sec-delete': ['sectionDelete', {}],
}
function onContextSelect(key) {
  if (key.startsWith('order-')) runCommand('order', { where: key.slice(6) })
  else if (SECTION_MENU[key]) runCommand(SECTION_MENU[key][0], { ...SECTION_MENU[key][1], sectionId: ctx.sectionId })
  else if (key === 'paste') runCommand('paste', { sectionId: ctx.sectionId })
  else runCommand(key)
}
function selectFromPanel(id) {
  selectImage(id)
  const itemId = page.value ? firstItemOfImage(page.value, id) : null
  if (itemId) nextTick(() => pageView.value?.scrollToItem(itemId))
}

// 화면용 작은 사진 — 사진을 지운 결과로 그려 줄여 둔다. 페이지와 [사진] 목록 썸네일이 같이 쓴다 (원본은 사진마다 한 번만 받는다).
// 지우기 화면이 열려 있는 동안은 멈췄다가 닫으면 다시 맞춘다
const views = reactive({}) // image id → { status, url, error, problems }
const viewStore = createViewImageStore({
  pageWidth: PAGE_WIDTH,
  dpr: window.devicePixelRatio || 1,
  pool: urlPool,
  onUpdate(id, entry) { views[id] = { ...entry }; notePerf(); if (entry.status === 'error') maybeStartAi() }, // 실패도 "끝남"
})
// 화면에 보이는 사진부터 받는다 (페이지 → 목록 순)
let listVisible = []
let pageVisible = []
function prioritizeVisible() {
  viewStore.prioritize([...new Set([...pageVisible, ...listVisible])])
}
let listReported = false // 목록·페이지가 "지금 보이는 사진"을 한 번이라도 알려 왔는지 (모르면 기다린다)
let pageReported = false
function onListVisible(ids) { listVisible = ids; listReported = true; prioritizeVisible(); maybeStartAi() }
function onPageVisible(ids) { pageVisible = ids; pageReported = true; prioritizeVisible(); maybeStartAi() }

// ── AI 엔진 켜기 — 첫 화면 사진(보이는 목록 썸네일 + 페이지 사진)이 실제로 화면에 그려진 뒤에 켠다 ──
// 엔진 세션 만들기(16~26초)가 그래픽카드를 차지해 그동안 사진이 멈춘다(크롬 실측). 지우기 화면을 먼저 열면 그때 바로 켠다.
// "그려짐" = <img> 불러오기 → 해독 → 다음 두 프레임 (StudioPhotoPanel·StudioPageView의 shown). 작은 사진 파일이 만들어진 것
// (views status 'ready')만으로는 부족하다 — 그 직후 엔진을 켜면 그래픽카드를 뺏겨 사진이 몇 초 뒤에야 보였다(크롬 실측 2026-09-26).
// 못 그린 사진(작은 사진 실패·<img> 오류)도 "끝남"으로 친다. 두 번 켜지지 않는다 (startAiEngine이 이미 있으면 그냥 돌아감).
// 엔진이 켜지는 동안 남은(화면 밖) 사진 처리는 멈추지 않는다 — 첫 화면은 이미 끝났고, 멈추면 화면 밖 사진이 그만큼 더 늦어질 뿐이다.
const shownList = new Map() // image id → true(그려짐) | false(못 그림)
const shownPage = new Map()
function onListShown({ id, ok }) { recordShown(shownList, id, ok) }
function onPageShown({ id, ok }) { recordShown(shownPage, id, ok) }
function recordShown(map, id, ok) {
  if (!map.has(id)) map.set(id, ok)
  noteHeroShown(id, ok)
  maybeStartAi()
}
/** 첫 화면이 끝났으면 { ok, fail } (장수), 아직이면 null */
function firstScreenDone() {
  if (!project.value) return null
  const rows = doneImages.value
  if (rows.length === 0) return { ok: 0, fail: 0 }
  const ids = new Set(rows.map(r => r.id))
  const listOn = activeTool.value === 'photo' // 목록이 화면에 있을 때만 (다른 메뉴면 목록이 없다)
  const pageOn = !!page.value?.sections?.length && !pageSession.readError.value
  if ((listOn && !listReported) || (pageOn && !pageReported)) return null
  const states = []
  const collect = (visible, map) => {
    for (const id of visible) {
      if (!ids.has(id)) continue
      states.push(views[id]?.status === 'error' ? false : map.has(id) ? map.get(id) : null)
    }
  }
  if (listOn) collect(listVisible, shownList)
  if (pageOn) collect(pageVisible, shownPage)
  if (states.includes(null)) return null
  return { ok: states.filter(s => s === true).length, fail: states.filter(s => s === false).length }
}
// 안전장치: 첫 화면이 20초 안에 끝나지 않으면 20초에 켠다 (채팅 Claude 결정 2026-09-26).
// 사진 하나가 끝없이 안 뜨는 경우(네트워크 멈춤 등)에도 AI 지우기를 쓸 수 있어야 한다. 크롬 실측에서 27장 작업 첫 화면이 약 7초라 넉넉한 값.
const AI_FALLBACK_MS = 20000
let aiFallbackTimer = null
let firstScreenLogged = false
function armAiFallback() {
  clearTimeout(aiFallbackTimer)
  aiFallbackTimer = setTimeout(() => startAi('20초안전장치'), AI_FALLBACK_MS)
}
function startAi(reason) {
  if (!isWide.value || session.aiEngine.value) return
  clearTimeout(aiFallbackTimer)
  timing('aiStart', `AI 엔진 시작 ${now()} (이유: ${reason})`, { aiStartReason: reason })
  session.startAiEngine()
}
function maybeStartAi() {
  const done = firstScreenDone()
  if (done && !firstScreenLogged) {
    firstScreenLogged = true
    timing('firstScreen', `첫화면 사진 표시 완료 ${now()} (성공 ${done.ok}장 · 실패 ${done.fail}장)`)
  }
  if (eraseOpen.value) startAi('지우기화면')
  else if (done) startAi('첫화면완료')
}
watch(eraseOpen, open => { if (open) maybeStartAi() })

// ── 시간 기록 (개발 서버에서만 — 채팅 Claude가 크롬 콘솔·window.__studioTiming으로 읽는다). 시간 = performance.now() ms ──
const DEV_TIMING = import.meta.env.DEV
const now = () => Math.round(performance.now())
function timing(key, text, extra = {}) {
  if (!DEV_TIMING) return
  console.log(`[studio-timing] ${text}`)
  window.__studioTiming = { ...(window.__studioTiming || {}), [key]: now(), ...extra }
}
function noteHeroShown(id, ok) {
  const hero = doneImages.value[0]
  if (!DEV_TIMING || !hero || hero.id !== id || window.__studioTiming?.heroShown != null) return
  timing('heroShown', `대표사진(1번) 표시 ${now()} (${hero.width}×${hero.height}${ok ? '' : ', 못 그림'})`)
}
watch(() => session.aiState.status, s => {
  if (s !== 'ready') return
  const from = session.aiEngine.value?.info?.modelSource || '알 수 없음'
  timing('aiReady', `AI 엔진 준비 ${now()} (모델 ${from})`, { aiModelFrom: from })
})
// 여는 속도 기록 — 콘솔에 한 줄 (작업을 열 때마다 한 번)
const perf = { t0: 0, listAt: 0, firstAt: 0, logged: false }
function notePerf() {
  if (!perf.t0 || perf.logged) return
  const rows = doneImages.value
  if (!perf.firstAt && rows.some(r => views[r.id]?.url)) perf.firstAt = performance.now()
  if (rows.length === 0 || rows.some(r => !views[r.id] || views[r.id].status === 'loading')) return
  perf.logged = true
  const ms = t => Math.round(t - perf.t0)
  const errors = rows.filter(r => views[r.id].status === 'error').length
  console.info(`[StudioEditor] 사진 ${rows.length}장 준비: 목록 ${ms(perf.listAt)}ms · 첫 사진 ${ms(perf.firstAt)}ms · 전부 ${ms(performance.now())}ms${errors ? ` · 못 받음 ${errors}장` : ''}`)
}
// 완성 사진(final JPG)을 쓸 수 있으면 그 버전 (아니면 실시간 합성) — 저장된 행 기준으로 그 뒤 지우기가 안 바뀌었고
// (studioFinal.usableFinalVersion — 필터·조정만 바뀐 저장은 무효로 만들지 않는다), 화면의 지우기도 저장본과 같을 때만.
// 필터·조정은 그 위에 화면에서 적용한다 (StudioPageView)
function finalVersionOf(row) {
  const f = usableFinalVersion(row)
  return f !== null && sameLayers(session.layerMap[row.id], row.edit?.layers) && !bakeQueue.state[row.id] ? f : null
}
// 받을 사진 = 목록의 준비된(done) 사진 전부, 목록 순서 (페이지 기본 배치도 같은 순서 — 페이지에 없는 사진도 목록 썸네일에 쓴다)
const viewWants = computed(() => {
  if (eraseOpen.value) return []
  return doneImages.value
    .filter(r => r.original_path)
    .map(row => ({ row, layers: session.layerMap[row.id] || [], finalVersion: finalVersionOf(row) }))
})
watch(viewWants, list => {
  for (const w of list) viewStore.want(w.row, w.layers, { finalVersion: w.finalVersion })
  prioritizeVisible()
}, { immediate: true })
function retryView(imageId) {
  const row = imagesById.value.get(imageId)
  if (row) viewStore.retry(row, session.layerMap[imageId] || [], { finalVersion: finalVersionOf(row) })
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
 *   결과 없는 AI 레이어가 있음("다시 지우기를 마치면 적용돼요") / 이미 최신(그 뒤 지우기가 안 바뀜 — usableFinalVersion)
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
  if (usableFinalVersion(row) !== null) { bakeQueue.clear(id); return }
  bakeQueue.request(row, layers, row.edit_version)
}
function clearViews() {
  viewStore.clear()
  for (const k of Object.keys(views)) delete views[k]
}
// 장수 한도에 드는 수 — 서버 prepare와 같은 방식: done + 직접 올린 pending (1688의 가져오지 않은 pending은 세지 않음)
const usedCount = computed(() => images.value.filter(i =>
  i.ingest_status === 'done' || (i.kind === 'upload' && i.ingest_status === 'pending')).length)
const anyModalOpen = computed(() => addOpen.value || clearAllOpen.value || !!conflictId.value || leaveOpen.value || pageSession.conflict.value
  || replaceOpen.value || resetLookOpen.value || !!includeAsk.value || reorderOpen.value)

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

// ── 사진 서명 URL(10분) — 열 때 한 번에 묶어 받고, 만료 전에 다시 묶어 받는다 (나중에 다시 그릴 때 사진마다 따로 받지 않게) ──
// 원본 + 쓸 수 있는 완성 사진(final JPG, usableFinalVersion)
const VIEW_URL_REFRESH_MS = (SIGNED_URL_TTL - 60) * 1000
let viewUrlsIssuedAt = 0
function viewPathsOf(rows) {
  const out = []
  for (const r of rows) {
    if (r.ingest_status !== 'done' || !r.original_path) continue
    out.push(r.original_path)
    const f = usableFinalVersion(r)
    if (f !== null) {
      try { out.push(finalPathOf(r, f)) } catch (e) { console.error('[StudioEditor] 적용 사진 경로를 만들 수 없음 (원본으로 그림):', r.id, e.message) }
    }
  }
  return out
}
async function refreshViewUrls() {
  const paths = viewPathsOf(images.value)
  if (paths.length === 0) return
  try {
    const issuedAt = Date.now()
    urlPool.seed(await signViewUrls(paths), issuedAt)
    viewUrlsIssuedAt = issuedAt
  } catch (e) {
    console.error('[StudioEditor] 사진 주소 갱신 실패 (다음 그릴 때 한 장씩 받음):', e)
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
  if (loading.value) {
    Object.assign(perf, { t0: performance.now(), listAt: 0, firstAt: 0, logged: false })
    // 새로 여는 작업 — 첫 화면 판단을 처음부터 (엔진이 이미 켜져 있으면 startAi가 아무것도 안 한다)
    shownList.clear(); shownPage.clear()
    listReported = false; pageReported = false; firstScreenLogged = false
    if (!session.aiEngine.value) armAiFallback()
  }
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
    // 보기용 서명 URL(10분)은 열 때마다 한 번에 묶어 새로 발급 (원본 + 최신 적용 사진)
    const issuedAt = Date.now()
    const urls = await signViewUrls(viewPathsOf(ordered))
    if (seq !== loadSeq) return
    urlPool.seed(urls, issuedAt)
    viewUrlsIssuedAt = issuedAt
    project.value = p
    images.value = ordered
    if (!perf.listAt) perf.listAt = performance.now()
    orderError.value = orderErr
    session.syncFromServer(ordered)
    if (p) pageSession.syncFromServer(p)
    if (!selectedImage.value) {
      selectedImageId.value = doneImages.value[0]?.id || null
      session.selectedLayerId.value = null
    }
    // 기본 배치를 새로 만들었으면(아직 안 바꾼 페이지 + 사진 추가) 아이템 id가 바뀐다 → 고른 사진의 자리로 다시 잡는다
    if (selectedItemIds.value.length && !(page.value && selectedItemIds.value.every(id => findItem(page.value, id)))) {
      const itemId = page.value && selectedImageId.value ? firstItemOfImage(page.value, selectedImageId.value) : null
      selectedItemIds.value = itemId ? [itemId] : []
    }
    syncEraseFromRoute() // ?erase=<사진 id>로 새로고침·진입했으면 그 사진의 지우기 화면을 연다
    maybeStartAi()       // 사진이 없는 작업 등 — 기다릴 사진이 없으면 바로
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioEditor] 불러오기 실패:', e)
    errorMsg.value = e.message || String(e)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

// [내 사진 올리기]가 끝남 — 1장 이상 올렸으면 목록을 [내 사진]·[사용]으로 (방금 올린 사진이 보이게, 7단계)
async function onAddFinished(result) {
  await session.flush()
  await load()
  if (result?.done > 0) photoPanel.value?.showTab(SOURCE_MINE, 'used')
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
      dropEraseAfterRestore()
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
/**
 * 이동을 취소한 뒤 주소에 남은 erase만 뺀다.
 * 취소된 크롬 ←는 라우터가 history.go로 되돌리고 그때 popstate가 한 번 더 온다 — 그보다 먼저 빼면 되돌리기와 엇갈려
 * 주소가 다시 ?erase=가 되고 지우기 화면이 다시 열린다(화면이 바쁠 때 실측). 그래서 그 popstate 뒤에 뺀다.
 * 앱 안 이동(링크)을 취소한 경우는 popstate가 없으므로 잠시 뒤(300ms)에 뺀다.
 */
function dropEraseAfterRestore() {
  let done = false
  let timer = null
  const run = () => {
    if (done) return
    done = true
    window.removeEventListener('popstate', onPop)
    clearTimeout(timer)
    if (route.query.erase && !eraseOpen.value) router.replace({ query: queryWithoutErase(route.query) })
  }
  const onPop = () => setTimeout(run, 0) // 라우터의 popstate 처리 뒤
  window.addEventListener('popstate', onPop)
  timer = setTimeout(run, 300)
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

// ── 키보드: Ctrl(Cmd)+Z 되돌리기, Ctrl(Cmd)+Shift+Z·Ctrl+Y 다시 ──
// 되돌리기 대상: 지우기 화면이 열려 있으면 그 사진의 지우기 이력, 아니면 페이지 이력 (입력칸에서는 브라우저 기본 동작)
// 6-1 페이지 요소 (지우기 화면·모달·우클릭 메뉴·입력칸에서는 동작 안 함):
//   Ctrl+A 보이는 구간 전체 선택 · Ctrl+C/V/X 복사·붙여넣기·잘라내기 · Ctrl+D 복제 · Delete/Backspace 삭제 · Esc 선택 해제
//   Ctrl+G 그룹 묶기 · Ctrl+Shift+G 그룹 풀기 (9단계) · Ctrl+Alt+C / Ctrl+Alt+V 글자 스타일 복사·붙여넣기 (10-2)
//   방향키 = 페이지에서 고른 요소 1px(Shift 10px) 옮기기. 목록에서 고른 상태면 ↑/↓ = 이전·다음 사진(예전 그대로)
// (사용가이드는 14단계 — 생기면 여기서 막는다)
function onKeyDown(e) {
  if (!isWide.value || anyModalOpen.value || ctx.open || textEdit.value) return // 10-1: 글자를 고치는 동안은 쉰다
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  if (pageView.value?.isBusy()) return // 끌고 있는 중
  // Alt 조합은 10-2 스타일 복사·붙여넣기(Ctrl+Alt+C / Ctrl+Alt+V, 글자끼리)만 — 그 밖의 Alt 조합은 예전처럼 아무것도 안 한다
  if (e.altKey) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !eraseOpen.value && page.value && (e.code === 'KeyC' || e.code === 'KeyV')) {
      e.preventDefault()
      runCommand(e.code === 'KeyC' ? 'styleCopy' : 'stylePaste')
    }
    return
  }
  const sel = selectedItemIds.value
  if (e.ctrlKey || e.metaKey) {
    // e.code 기준: 한글 입력 상태에서도 같은 키로 동작
    const undo = eraseOpen.value ? undoEdit : undoAny
    const redo = eraseOpen.value ? redoEdit : redoAny
    if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); undo() }
    else if ((e.code === 'KeyZ' && e.shiftKey) || (e.code === 'KeyY' && !e.shiftKey)) { e.preventDefault(); redo() }
    // 9단계: Ctrl+G 그룹 묶기 · Ctrl+Shift+G 그룹 풀기 (Shift를 쓰므로 아래 Shift 거르기보다 먼저)
    else if (e.code === 'KeyG' && !eraseOpen.value && page.value && sel.length) { e.preventDefault(); runCommand(e.shiftKey ? 'ungroup' : 'group') }
    else if (eraseOpen.value || e.shiftKey || !page.value) return
    else if (e.code === 'KeyA') { e.preventDefault(); runCommand('selectAll') }
    else if (e.code === 'KeyC' && sel.length) { e.preventDefault(); runCommand('copy') }
    else if (e.code === 'KeyX' && sel.length) { e.preventDefault(); runCommand('cut') }
    else if (e.code === 'KeyV' && clipboard?.length) { e.preventDefault(); runCommand('paste') }
    else if (e.code === 'KeyD' && sel.length) { e.preventDefault(); runCommand('duplicate') }
    return
  }
  if (eraseOpen.value) return // 지우기 화면에서는 사진을 바꾸지 않는다
  if (e.key === 'Escape' && (sel.length || selectedSectionId.value)) { e.preventDefault(); clearSelection(); return }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) { e.preventDefault(); runCommand('delete'); return }
  // 10-1: 글자 요소 하나를 페이지에서 골랐으면 Enter = 고치기 (버튼·레이어 줄 위의 Enter는 그 버튼 몫)
  if (e.key === 'Enter' && sel.length === 1 && selectionSource === 'page' && !t?.closest?.('button, [role="button"]')
    && page.value && isValidTextItem(findItem(page.value, sel[0])?.item)) {
    e.preventDefault()
    startTextEdit(sel[0])
    return
  }
  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  if (ARROWS[e.key] && sel.length && selectionSource === 'page') {
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    runCommand('nudge', { dx: ARROWS[e.key][0] * step, dy: ARROWS[e.key][1] * step })
    return
  }
  if (e.key === 'ArrowUp') { e.preventDefault(); stepImage(-1) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); stepImage(1) }
}

// ── 화면 폭 ──
const wideQuery = window.matchMedia('(min-width: 1024px)')
const rightQuery = window.matchMedia('(min-width: 1280px)')
function onWideChange() {
  isWide.value = wideQuery.matches
  // 편집은 1024px 이상에서만 — 좁은 화면에서는 모델(약 200MB)을 받지 않는다. 넓으면 첫 화면 사진 뒤에 켠다 (maybeStartAi)
  if (isWide.value) maybeStartAi()
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
  selectedItemIds.value = []
  session.selectedLayerId.value = null
  eraseOpen.value = false
  clearViews()
  bakeQueue.reset()
  resetEditorLog()
  load()
})

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·사진·서명 URL·편집 상태를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    clearTimeout(aiFallbackTimer)
    eraseOpen.value = false
    session.resetAll()
    pageSession.resetAll()
    bakeQueue.reset()
    clearViews()
    selectedItemIds.value = []
    clipboard = null
    styleClip.value = null // 10-2 복사한 글자 모양
    ctx.open = false
    resetEditorLog()
    imageCache.clear()
    project.value = null
    images.value = []
    urlPool.clear()
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
  // 10-1 글꼴: 편집기가 열릴 때만 스타일시트를 붙인다(사이트 전체 아님). 글꼴을 새로 받으면 측정 캐시를 비우고 줄을 다시 계산
  offFontsChanged = onFontsChanged(() => { textMeasure.clear(); fontEpoch.value++ })
  ensureStudioFonts().catch(e => console.error('[StudioEditor] 글꼴 스타일시트를 불러오지 못함 (글자는 비슷한 글꼴로 보임):', e))
  load()
})

onUnmounted(() => {
  cancelAnimationFrame(inViewRaf)
  offFontsChanged?.()
  pageScroll.value?.removeEventListener('scroll', updateInView)
  wideQuery.removeEventListener('change', onWideChange)
  rightQuery.removeEventListener('change', onRightChange)
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('visibilitychange', onVisible)
  clearInterval(viewUrlTimer)
  clearTimeout(toastTimer)
  clearTimeout(aiFallbackTimer)
  session.dispose()
  pageSession.dispose()
  bakeQueue.dispose()
  clearViews()
  areaObserver?.disconnect()
  imageCache.clear()
})
</script>

<style scoped>
/* 사진 바꾸기 고르기 칸 (6-2) */
/* 진행 단계 ③일 때 상단 미리보기·내보내기 자리를 알려 준다 (6-3) */
.st-step-hint { box-shadow: 0 0 0 2px var(--st-accent-ring); }
.st-replace-cell { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 2px solid transparent; background: var(--st-card); cursor: pointer; padding: 0; }
.st-replace-cell:hover:not(:disabled) { border-color: var(--st-accent); }
.st-replace-cell.is-current { border-color: var(--st-line-strong); opacity: 0.55; cursor: default; }
.st-replace-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
.st-replace-tag { position: absolute; left: 4px; bottom: 4px; padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; background: var(--st-panel); color: var(--st-ink-2); }
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
