<template>
  <div class="studio-root st-dark relative h-screen flex flex-col overflow-hidden" data-studio-editor>
    <!-- 상단바: ← · 로고 · 되돌리기 다시 · 작업명 · 저장 상태 · "직접 만들기 · 반자동" · [원클릭 AI 자동 제작] · 이력 · 미리보기 · 작업 저장 · 다운로드 -->
    <header class="h-14 shrink-0 px-3 flex items-center gap-2 st-topbar st-border-b" data-topbar>
      <router-link :to="{ name: 'studio-projects' }" class="st-icon-btn" title="내 작업으로" data-back>
        <ArrowLeft class="w-5 h-5" :stroke-width="2" />
      </router-link>
      <span class="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center st-logo-mark text-[13px] font-extrabold shrink-0">E</span>
      <!-- 편집기 되돌리기·다시: 페이지 동작과 사진 필터·조정을 한 순서로 (지우기 화면의 되돌리기는 그 사진의 지우기 이력 — 따로, 결정 8) -->
      <button type="button" class="st-icon-btn" :disabled="!editorCanUndo" :title="editorCanUndo ? '되돌리기' : '되돌릴 동작이 없어요'" data-action="undo" @click="undoAny"><Undo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
      <button type="button" class="st-icon-btn" :disabled="!editorCanRedo" :title="editorCanRedo ? '다시' : '다시 할 동작이 없어요'" data-action="redo" @click="redoAny"><Redo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
      <div class="min-w-0 ml-1 leading-tight" data-title-block>
        <!-- 작업 이름 (16단계): 누르면 입력칸 — Enter·칸 밖 = 저장, Esc = 취소, 빈 이름은 저장 안 함. 옆 ⋯ = 이름 바꾸기·복사본 만들기 -->
        <div class="flex items-center gap-0.5 min-w-0">
          <input
            v-if="titleEdit.open" ref="titleInput" v-model="titleEdit.value" type="text" maxlength="100"
            class="st-title-input" aria-label="작업 이름" data-title-input
            @keydown.enter.prevent="commitTitle" @keydown.esc.prevent="cancelTitle" @blur="commitTitle"
          />
          <button
            v-else type="button" class="st-title-btn truncate" :disabled="!project" title="눌러서 이름 바꾸기" data-title
            @click="openTitleEdit"
          >{{ project ? projectDisplayTitle(project) : '' }}</button>
          <div v-if="project" class="relative shrink-0">
            <button type="button" class="st-icon-btn st-title-more" title="작업 메뉴" :aria-expanded="titleMenuOpen" data-title-menu @click="titleMenuOpen = !titleMenuOpen">
              <MoreHorizontal class="w-4 h-4" :stroke-width="2" />
            </button>
            <template v-if="titleMenuOpen">
              <div class="fixed inset-0" style="z-index: 40" @click="titleMenuOpen = false" />
              <div class="absolute left-0 top-[calc(100%+4px)] w-44 st-card st-shadow-float py-1" style="z-index: 41" data-title-menu-list>
                <button type="button" class="st-menu-row" data-menu-rename @click="openTitleEdit"><Pencil class="w-4 h-4" :stroke-width="2" /> 이름 바꾸기</button>
                <button type="button" class="st-menu-row" :disabled="copyNotice?.status === 'working'" data-menu-copy @click="copyThisProject"><Copy class="w-4 h-4" :stroke-width="2" /> 복사본 만들기</button>
              </div>
            </template>
          </div>
        </div>
        <template v-if="project">
          <button v-if="topSaveStatus === 'error'" type="button" class="text-[11px] font-bold st-danger-text underline" :title="topSaveDetail" data-save-status="error" @click="retryAllSaves">저장하지 못했어요 · 다시 시도</button>
          <button v-else-if="topSaveStatus === 'conflict'" type="button" class="text-[11px] font-bold st-danger-text underline" data-save-status="conflict" @click="reopenAnyConflict">저장 안 됨 · 다른 창과 충돌</button>
          <span v-else-if="topSaveStatus === 'pending' || topSaveStatus === 'saving'" class="text-[11px] st-muted" data-save-status="saving">저장 중…</span>
          <span v-else class="text-[11px] st-success-text" :title="savedTitle(topLastSavedAt)" data-save-status="saved">● 저장됨</span>
        </template>
      </div>
      <span class="st-badge ml-2 shrink-0" data-mode-chip><Hand class="w-3 h-3 mr-1" :stroke-width="2" /> 직접 만들기 · 반자동</span>

      <div class="ml-auto flex items-center gap-1.5">
        <!-- 원클릭 (원클릭 1단계): 페이지가 비어 있으면 바로, 있으면 "복사본에서 새로 만들어요" 확인 뒤 복사본에서 (원본은 그대로) -->
        <button type="button" class="st-btn st-btn-ai st-ai-cta" :disabled="autoBuild.state.open || eraseOpen" :data-one-click-loading="loading || !project ? '1' : null" data-one-click data-guide="one-click" @click="onOneClick">
          <Sparkles class="w-[18px] h-[18px] shrink-0" :stroke-width="2" />
          <span class="text-left leading-tight"><span class="block text-[14px] font-extrabold">원클릭 AI 자동 제작</span><span class="block text-[11px] font-semibold opacity-80">{{ loading || !project ? '불러오는 중…' : '완전 자동 · 사진만 있으면 끝까지' }}</span></span>
        </button>
        <span class="w-px h-6 mx-1" style="background: var(--st-line)" />
        <!-- 작업 이력 (14단계): 이 창의 페이지 이력 목록 — 누르면 그 상태로 복원(새 이력 한 칸 "이력 복원", Ctrl+Z로 취소). 사진 edit는 그대로 -->
        <div class="relative">
          <button
            type="button" class="st-btn st-btn-ghost" :class="pageHistoryOpen ? 'is-pressed' : ''" :aria-expanded="pageHistoryOpen" :disabled="!page || eraseOpen"
            data-top-history @click="pageHistoryOpen = !pageHistoryOpen"
          ><History class="w-4 h-4" :stroke-width="2" /> 이력</button>
          <template v-if="pageHistoryOpen && page">
            <div class="fixed inset-0" style="z-index: 40" @click="pageHistoryOpen = false" />
            <div class="absolute right-0 top-[calc(100%+6px)] w-[300px] st-card st-shadow-float p-1.5" style="z-index: 41" data-page-history>
              <p class="px-2.5 pt-1.5 pb-1 text-[12px] font-bold st-ink-2 break-keep">누르면 그 동작을 한 뒤의 페이지로 돌아가요</p>
              <ol class="max-h-[320px] overflow-y-auto">
                <li v-for="s in pageHistoryRows" :key="s.i">
                  <button
                    type="button" class="st-menu-row w-full" :class="s.current ? 'st-accent-text font-extrabold' : ''" :disabled="s.current"
                    :style="s.current ? { opacity: 1, cursor: 'default' } : null"
                    :data-history-step="s.i" @click="restoreHistory(s.i)"
                  >
                    <span class="truncate">{{ s.label }}</span>
                    <span v-if="s.current" class="st-badge st-badge-accent ml-1 shrink-0">지금</span>
                    <span class="ml-auto pl-2 text-[12px] st-muted tabular-nums shrink-0">{{ formatClock(s.at) }}</span>
                  </button>
                </li>
              </ol>
              <p class="mt-1 px-2.5 pt-1.5 pb-1 text-[12px] st-muted break-keep st-border-t">이력은 이 창을 닫으면 사라져요. 사진의 지우기·필터·자르기는 사진에 따로 저장돼 그대로 남아요.</p>
            </div>
          </template>
        </div>
        <button type="button" class="st-btn st-btn-ghost" :class="step === 3 ? 'st-step-hint' : ''" :disabled="!page || !page.sections.length || eraseOpen" data-top-preview data-guide="preview" @click="openPreview"><Eye class="w-4 h-4" :stroke-width="2" /> 미리보기</button>
        <button type="button" class="st-btn" :disabled="!page || !page.sections.length || eraseOpen || !project" data-top-save @click="openSave"><Save class="w-4 h-4" :stroke-width="2" /> 작업 저장</button>
        <button type="button" class="st-btn st-btn-primary" :class="step === 3 ? 'st-step-hint' : ''" :disabled="!page || !page.sections.length || eraseOpen" data-top-export data-guide="export" @click="openExport"><Download class="w-4 h-4" :stroke-width="2" /> 다운로드</button>
      </div>
    </header>

    <!-- 진행 단계 표시줄 (6-3): ① 사진 다듬기 → ② 페이지 꾸미기 → ③ 내보내기. 안내일 뿐, 아무 단계나 누를 수 있다 -->
    <StudioStepBar v-if="project && isWide && !loading" :step="step" data-guide="step-bar" @go="goStep" />

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

      <!-- 왼쪽 아이콘 막대 (72px): 템플릿 · 사진 · 텍스트 · 요소 · 섹션 · 배경합성 · (맨 아래) 가이드 — 저장값은 기능이 생길 때까지 숨김(RAIL hidden) -->
      <nav v-if="isWide" class="w-[72px] shrink-0 flex flex-col items-center gap-1 py-2 st-topbar st-border-r" data-rail>
        <button
          v-for="t in RAIL_SHOWN" :key="t.key" type="button"
          class="st-rail-item" :class="activeTool === t.key ? 'is-active' : ''"
          :aria-pressed="activeTool === t.key" :data-rail="t.key" :data-guide="`rail-${t.key}`"
          @click="onRail(t.key)"
        >
          <component :is="t.icon" class="w-5 h-5" :stroke-width="2" />
          <span>{{ t.label }}</span>
        </button>
        <span class="flex-1" />
        <!-- [가이드] (14단계): 사용가이드 다시 보기 · 단축키 표 -->
        <div class="relative">
          <button type="button" class="st-rail-item" :class="guideMenuOpen ? 'is-active' : ''" :aria-expanded="guideMenuOpen" data-rail="guide" data-guide="guide-button" @click="guideMenuOpen = !guideMenuOpen">
            <CircleHelp class="w-5 h-5" :stroke-width="2" /><span>가이드</span>
          </button>
          <template v-if="guideMenuOpen">
            <div class="fixed inset-0" style="z-index: 40" @click="guideMenuOpen = false" />
            <div class="absolute left-[calc(100%+6px)] bottom-0 w-48 st-card st-shadow-float py-1" style="z-index: 41" data-guide-menu>
              <button type="button" class="st-menu-row" data-guide-replay @click="guideMenuOpen = false; openGuide('editor')"><CircleHelp class="w-4 h-4" :stroke-width="2" /> 사용가이드 보기</button>
              <button type="button" class="st-menu-row" data-open-shortcuts @click="guideMenuOpen = false; shortcutsOpen = true"><Keyboard class="w-4 h-4" :stroke-width="2" /> 단축키 보기 <span class="ml-auto text-[11px] st-muted">?</span></button>
            </div>
          </template>
        </div>
      </nav>

      <!-- 재료 패널 (300px): 고른 메뉴의 넣을 것·할 일만 — 고른 요소의 설정은 작업판 위 가로 도구줄(StudioSelectBar). [X] = 닫기(작업판이 넓어짐), 아이콘을 누르면 다시 열림 -->
      <aside v-if="!isWide || leftOpen" class="flex flex-col st-surface" :class="isWide ? 'w-[300px] shrink-0 st-border-r' : 'flex-1 min-h-0'" data-material-panel>
        <div v-if="isWide" class="shrink-0 h-10 pl-4 pr-1.5 flex items-center st-border-b" data-material-head>
          <span class="text-[12px] font-extrabold st-ink-2">{{ railItem(activeTool).label }}</span>
          <button type="button" class="st-icon-btn ml-auto" title="패널 닫기 (작업판을 넓게) · 왼쪽 아이콘을 누르면 다시 열려요" data-material-close @click="leftOpen = false"><X class="w-4 h-4" :stroke-width="2" /></button>
        </div>
        <!-- 원클릭 글자 초안 섹션을 고르면 한 줄 (review-1) -->
        <p v-if="isWide && selectedInDraft && !showStart" class="shrink-0 px-4 py-2 text-[12px] font-bold break-keep st-border-b" style="color: var(--st-ai)" data-draft-hint>AI 초안은 확인 후 사용해 주세요 · 1688 상품 정보로 만든 글자라 눌러서 고칠 수 있어요</p>
        <!-- 위: 그 탭의 넣을 것·할 일 (고른 요소가 있어도 밀려 내려가지 않는다) / 아래: 고른 요소의 설정 (사진·글자·도형·표).
             위치·크기·잠금·숨기기·복제·삭제·앞뒤·정렬은 캔버스 요소 도구줄과 [⋯] 팝오버로 옮겼다 (예전 "고른 요소" 칸) -->
        <div class="flex-1 min-h-0 flex flex-col" data-tool-area>
          <StudioPhotoPanel
            v-if="activeTool === 'photo' || !isWide"
            :key="project.id" ref="photoPanel"
            :images="images" :views="views" :selected-image-id="selectedImageId" :fill-count="fillCount" :order-error="orderError"
            :bake-state="bakeQueue.state" :placed-ids="showStart ? null : placedIds" :shape-mark-of="shapeMarkOf" :auto-mark-of="autoMarkOf"
            @select="selectFromPanel" @open-erase="openErase" @add="addOpen = true" @retry-image="retryView" @retry-bake="requestBake"
            @visible="onListVisible" @shown="onListShown" @set-included="onSetIncluded" @insert="onInsertImage"
            @auto-revert="onAutoRevert" @auto-remove="onAutoRemove"
          />
          <!-- [섹션] 패널 (8-1 → 한 화면): 섹션 목록 · 고른 섹션 높이·배경색 · 섹션 사이 간격 -->
          <StudioSectionPanel
            v-else-if="activeTool === 'section' && page"
            ref="sectionPanel" :page="page" :section-id="selectedSectionId" :section-label="selectedSectionLabel" :labels="sectionLabels"
            @command="runCommand" @pick="onMiniPick"
          />
          <!-- [텍스트] 패널 (10-1): 제목·부제목·본문 넣기 -->
          <StudioTextPanel v-else-if="activeTool === 'text'" :disabled="!page" @insert="insertText" @style="onStylePreset" />
          <!-- [요소] 패널 (11-1): 맨 위 종류 [도형][배지][사이즈표] — 마지막 종류는 이 편집기 안에서 기억 -->
          <StudioElementPanel v-else-if="activeTool === 'element'" v-model:tab="elementTab" :disabled="!page" @insert="insertElement" @insert-badge="insertBadge" @insert-table="insertTable" @insert-asset="insertAsset" />
          <!-- [템플릿] 패널 (15단계): 템플릿 카드 — 누르면 확인 뒤 페이지를 그 틀로 (이력 한 칸, 사진 edit는 그대로) -->
          <StudioTemplatePanel v-else-if="activeTool === 'template'" :disabled="!page" @apply="askTemplate" />
          <!-- [배경합성] 패널 (17-1): 고른 사진의 배경 지우기(서버 외부 AI) · 원래 배경/투명 · 배경 원래대로 -->
          <StudioBgPanel
            v-else-if="activeTool === 'bg'"
            :row="bgRow" :thumb-url="bgRow ? views[bgRow.id]?.url || null : null" :bg="bgRow ? session.bgOf(bgRow.id) : null"
            :target-label="bgTarget.label" :target-source="bgTarget.source"
            :status="bgStatus" :busy="!!(bgRow && bgBusy[bgRow.id])" :local-miss="!!(bgRow && bgLocalMiss[bgRow.id])" :error="bgError" :section-bg="bgSectionColor" :section-bg-where="bgSectionChoice?.where || ''" :section-bg-reason="bgSectionChoice?.reason || ''"
            :thumb-under="bgRow ? views[bgRow.id]?.bgUrl || null : null"
            :gen-status="bgGenStatus" :gen-busy="!!(bgRow && bgGenBusy[bgRow.id])" :gen-error="bgGenError"
            @remove="onBgRemove" @remove-ai="onBgRemoveAi" @mode="onBgMode" @color="onBgColor" @reset="onBgReset" @retry-status="loadBgStatus" @refine="openRefine"
            @generate="onBgGenerate" @library="onBgLibrary" @retry-gen-status="loadBgGenStatus"
          />
          <div v-else class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center" data-panel-soon>
            <span class="st-icon-box"><component :is="railItem(activeTool).icon" class="w-5 h-5" :stroke-width="2" /></span>
            <div class="text-[14px] font-bold st-ink">{{ railItem(activeTool).label }}</div>
            <p class="st-desc break-keep">{{ railItem(activeTool).soon }}</p>
          </div>
        </div>
      </aside>

      <!-- 가운데: 긴 한 장 페이지 (4단계, DOM — 구간이 위에서 아래로 쌓인다) -->
      <section v-if="isWide" class="flex-1 min-w-0 relative st-canvas-bg st-dotgrid" data-canvas-area data-guide="page" @wheel="onCanvasWheel">
        <!-- 스페이스+끌기 화면 이동 (14단계): 스페이스를 누르고 있는 동안 페이지 위를 덮어 요소가 잡히지 않게 하고, 끌면 스크롤만 옮긴다 -->
        <div
          v-if="spaceHeld" class="absolute inset-0" :style="{ zIndex: 4, cursor: panning ? 'grabbing' : 'grab' }" data-pan-layer
          @pointerdown="onPanDown" @pointermove="onPanMove" @pointerup="onPanUp" @pointercancel="onPanUp" @lostpointercapture="onPanUp"
        />
        <!-- 시작 화면 ⓪ (16단계): 페이지가 비어 있는 작업(DB page = null)일 때만 가운데를 덮는다. 왼쪽 사진 목록은 그대로 쓸 수 있다 -->
        <StudioStartScreen
          v-if="showStart" :usable-count="usableImagesNow().length"
          @blank="startBlank" @template="askTemplate" @oneclick="onOneClick"
        />
        <!-- 작업판 맨 위 가로 도구줄 (고정 — 페이지를 가리지 않게 스크롤 칸은 이 아래부터). 요소를 고르면 그 종류에 맞는 버튼, 안 고르면 안내 한 줄 -->
        <div v-if="page && !showStart" class="absolute inset-x-0 top-0 h-12" style="z-index: 8" data-select-strip>
          <StudioSelectBar
            v-if="selectBarOn"
            :page="page" :selected-ids="selectedItemIds" :photo-item="selectedPhotoItem"
            :look="selectedPhotoItem ? session.lookOf(selectedPhotoItem.imageId) : null" :thumb-url="selectedPhotoItem ? views[selectedPhotoItem.imageId]?.url || null : null"
            :thumb-under="selectedPhotoItem ? thumbUnderStyle(views[selectedPhotoItem.imageId]) : null"
            :shape-text="selectedPhotoItem ? shapeMarkOf(selectedPhotoItem.imageId) : ''" :auto-mark="selectedPhotoItem ? autoMarkOf(selectedPhotoItem.imageId) : null"
            :photo-info="photoBarInfo" :fill-count="photoBarImage ? selectedFillCount : 0"
            :can-paste-style="canPasteStyle" :sample="!!selectedSampleItem"
            @command="runCommand" @replace="replaceOpen = true" @crop="openCrop(selectedPhotoItem.imageId)" @erase="openErase(selectedPhotoItem.imageId)"
            @clear-all="clearAllOpen = true"
            @compare="onCompare" @auto-revert="onAutoRevert(selectedPhotoItem.imageId)" @look="onLook" @style="onItemStyle" @reset-look="resetLookOpen = true"
            @text="onTextProps" @style-copy="runCommand('styleCopy')" @style-paste="runCommand('stylePaste')"
            @shape="onShapeProps" @line="onLineProps" @table-props="onTableProps" @table-edit="onTableEdit"
          />
          <div v-else class="h-full flex items-center px-4 text-[12px] font-bold st-muted st-sel-empty" data-select-strip-hint>요소를 누르면 여기에 크기·회전·색 같은 편집 도구가 나와요</div>
        </div>
        <div ref="pageScroll" class="absolute inset-x-0 bottom-0 overflow-auto" :class="page && !showStart ? 'top-12' : 'top-0'" data-page-scroll @pointerdown.self="clearSelection">
          <p v-if="pageSession.readError.value" class="p-6 text-[13px] font-bold st-danger-text break-keep" data-page-error>{{ pageSession.readError.value }}</p>
          <div v-else-if="page && page.sections.length" class="pb-24" :class="pageTopPad" :style="{ paddingLeft: `${PAGE_GUTTER}px`, paddingRight: `${PAGE_GUTTER}px` }" @pointerdown.self="clearSelection">
            <StudioPageView
              ref="pageView"
              :page="page" :zoom="zoom" :images-by-id="imagesById" :views="views" :selected-ids="selectedItemIds" :bake-state="bakeQueue.state" :flags="sectionFlags"
              :looks="session.lookMap" :compare="compare" :selected-section-id="selectedSectionId" :text-edit="textEdit" :cell-edit="cellEdit"
              :canvas-tools="!showStart && !eraseOpen"
              @command="runCommand" @add-section="onAddSectionAt"
              @edit-text="startTextEdit" @text-commit="onTextCommit"
              @edit-cell="startCellEdit" @cell-commit="onCellCommit" @cell-cancel="cellEdit = null" @table-op="onTableEdit"
              @select="onPageSelect" @change="onPageChange" @context="openContextMenu" @select-section="pickSection"
              @open-erase="openErase" @retry-image="retryView"
              @visible="onPageVisible" @shown="onPageShown" @drop-image="onDropImage"
            />
          </div>
          <div v-else-if="page" class="absolute inset-0 flex items-center justify-center st-desc break-keep" data-page-empty>
            사진이 준비되면 여기에 상세페이지가 만들어져요
          </div>
        </div>
        <!-- 캔버스 위 왼쪽 위 안내 묶음: 원클릭 안내 띠 + 섹션 사이 추가 안내 한 줄 -->
        <div v-if="noticeVisible || sectionHintVisible" class="absolute left-3 top-[60px] flex flex-col gap-2" style="z-index: 6; width: min(640px, calc(100% - 256px))">
        <!-- 섹션 사이 추가 안내 (처음 열었을 때 한 줄 — 닫으면 다시 안 보임, 가이드 "다시 보지 않기"와 같은 저장 방식) -->
        <div v-if="sectionHintVisible" class="self-start flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-[12px] st-card st-shadow-float text-[13px] break-keep" data-section-add-hint>
          <Plus class="w-4 h-4 shrink-0 st-accent-text" :stroke-width="2.5" />
          <span class="font-bold st-ink">{{ SECTION_ADD_HINT }}</span>
          <button type="button" class="st-icon-btn shrink-0" title="닫기 (다시 안 보여요)" data-section-add-hint-close @click="closeSectionHint"><X class="w-4 h-4" :stroke-width="2" /></button>
        </div>
        <!-- 원클릭 안내 띠 (review-1): 완료 팝업 대신 — 만든 페이지를 바로 보여 주고 위에 한 줄. 닫을 수 있다 -->
        <div v-if="noticeVisible" data-auto-notice>
          <div class="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-[12px] st-card st-shadow-float text-[13px] break-keep">
            <Sparkles class="w-4 h-4 shrink-0" :stroke-width="2" style="color: var(--st-ai)" />
            <span class="font-bold st-ink min-w-0" data-auto-notice-text>
              상세페이지를 자동으로 만들었어요 · 사진 {{ noticePlaced }}장<template v-if="autoProblems.length"> · 확인하면 좋은 사진 {{ autoProblems.length }}장</template>
            </span>
            <button v-if="autoProblems.length" type="button" class="st-btn h-8 ml-auto shrink-0" :class="autoNotice.listOpen ? 'is-pressed' : ''" data-auto-notice-list @click="autoNotice.listOpen = !autoNotice.listOpen">확인할 사진 보기</button>
            <button type="button" class="st-icon-btn shrink-0" :class="autoProblems.length ? '' : 'ml-auto'" title="닫기" data-auto-notice-close @click="closeNotice"><X class="w-4 h-4" :stroke-width="2" /></button>
          </div>
          <p v-if="page.auto?.note" class="mt-1 px-3 text-[12px] font-bold break-keep" style="color: var(--st-ai)" data-auto-draft-note>{{ page.auto.note }}</p>
          <ol v-if="autoNotice.listOpen && autoProblems.length" class="mt-1.5 p-1.5 st-card st-shadow-float rounded-[12px] max-h-[300px] overflow-y-auto" data-auto-problem-list>
            <li v-for="p in autoProblems" :key="p.id">
              <button type="button" class="st-menu-row w-full" :data-auto-problem-row="p.id" @click="goProblem(p.id)">
                <span class="w-9 h-9 rounded-[6px] overflow-hidden shrink-0 st-placeholder"><img v-if="views[p.id]?.url" :src="views[p.id].url" alt="" class="w-full h-full object-cover" /></span>
                <span class="min-w-0 text-left">
                  <span class="block text-[12px] font-bold st-ink truncate">{{ imagesById.get(p.id) ? imageLabel(imagesById.get(p.id)) : p.id }}</span>
                  <span class="block text-[11px] st-danger-text truncate">확인 필요 · {{ p.problemText }}<template v-if="!placedIds?.includes(p.id)"> · 목록에만 있어요</template></span>
                </span>
              </button>
            </li>
          </ol>
        </div>
        </div>
        <!-- 작업판 왼쪽 아래 되돌리기·다시 (맨 위 버튼과 같은 함수) -->
        <div v-if="page && !showStart" class="absolute left-4 bottom-4 flex items-center gap-0.5 p-1 rounded-[12px] st-card st-shadow-float" style="z-index: 5" data-canvas-undo>
          <button type="button" class="st-icon-btn" :disabled="!editorCanUndo" :title="editorCanUndo ? '되돌리기 (Ctrl+Z)' : '되돌릴 동작이 없어요'" data-canvas-action="undo" @click="undoAny"><Undo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
          <button type="button" class="st-icon-btn" :disabled="!editorCanRedo" :title="editorCanRedo ? '다시 (Ctrl+Shift+Z · Ctrl+Y)' : '다시 할 동작이 없어요'" data-canvas-action="redo" @click="redoAny"><Redo2 class="w-[18px] h-[18px]" :stroke-width="2" /></button>
        </div>
        <!-- 아래 막대: 확대 · 폭 (시안 ①) -->
        <div v-if="page" class="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-2 px-2 py-1.5 rounded-[12px] st-card st-shadow-float" style="z-index: 5" data-zoom-bar>
          <div class="st-seg">
            <button
              v-for="z in ZOOM_PRESETS" :key="z" type="button" class="st-seg-item" :class="zoomMode === z ? 'is-active' : ''"
              :data-zoom="z" @click="zoomMode = z"
            >{{ Math.round(z * 100) }}%</button>
            <button type="button" class="st-seg-item" :class="zoomMode === 'fit' ? 'is-active' : ''" data-zoom="fit" @click="zoomMode = 'fit'">맞춤<span v-if="zoomMode === 'fit'" class="ml-1 opacity-70">{{ Math.round(zoom * 100) }}%</span></button>
            <!-- 14단계: Ctrl+휠로 버튼 사이 배율이 되면 그 값을 보여 준다 -->
            <span v-if="zoomMode !== 'fit' && !ZOOM_PRESETS.includes(zoomMode)" class="st-seg-item is-active" data-zoom-custom>{{ zoomPercent(zoom) }}%</span>
          </div>
          <span class="w-px h-5" style="background: var(--st-line-strong)" />
          <span class="text-[12px] font-bold st-ink-2 pr-1 whitespace-nowrap" data-page-width>폭 {{ page.width }}px · {{ PAGE_WIDTH_LABEL }}</span>
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
          v-if="rightTab === 'mini' && page && !showStart"
          :page="page" :views="views" :looks="session.lookMap" :labels="sectionLabels" :flags="sectionFlags"
          :active-section-id="inViewSectionId" :selected-section-id="selectedSectionId"
          @pick="onMiniPick" @reorder="onMiniReorder" @add-at="onAddSectionAt"
        />
        <!-- 레이어 (9단계): 고른 요소의 구간 → 골라진 구간 → 보는 중 구간의 요소 목록 -->
        <StudioLayerPanel
          v-else-if="rightTab === 'layers' && page && !showStart"
          :page="page" :section-id="layerSectionId" :section-label="layerSectionId ? sectionLabels[layerSectionId] ?? '' : ''"
          :selected-ids="selectedItemIds" :views="views" :images-by-id="imagesById"
          @select="onLayerSelect" @command="runCommand"
        />
        <div v-else class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col items-center justify-center text-center gap-2" data-right-soon>
          <!-- 검수 2묶음: 시작 화면이 떠 있는 동안은 가려진(저장 전) 기본 배치를 보이지 않는다 -->
          <p class="st-desc break-keep">{{ showStart ? '시작 방법을 고르면 여기에 페이지가 보여요.' : rightTab === 'mini' ? '페이지가 준비되면 섹션 미리보기가 보여요.' : '페이지가 준비되면 레이어 목록이 보여요.' }}</p>
        </div>
        <div class="p-3 space-y-2 st-border-t">
          <!-- 예전 [순서 변경] 창 대신: 미니뷰 그림을 끌어서 순서를 바꾼다 (같은 reorderSections·같은 이력) -->
          <p v-if="rightTab === 'mini' && !showStart" class="flex items-start gap-1.5 text-[12px] font-bold st-ink-2 break-keep" data-reorder-hint data-guide="reorder">
            <ArrowUpDown class="w-4 h-4 shrink-0 mt-px" :stroke-width="2" /> 끌어서 순서를 바꿀 수 있어요 · 그림 사이 [+] = 섹션 추가
          </p>
          <button type="button" class="st-btn st-btn-block" :disabled="showStart" title="페이지 전체의 섹션과 섹션 사이 간격 (왼쪽 [섹션]에서)" data-gap @click="openGapField"><MoveVertical class="w-4 h-4" :stroke-width="2" /> 섹션 사이 간격</button>
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
      :keys-enabled="!anyModalOpen && !guide.open"
      @close="onEraseClosed"
      @toast="showToast"
    />

    <!-- 사용가이드 (14단계): 편집기·지우기 화면 가이드 하나. "다시 보지 않기" = 가이드 창 안 체크 칸 (SpotlightGuide footer 칸 — 저장은 예전 그대로 studioGuide) -->
    <SpotlightGuide
      v-model:open="guide.open" :steps="guide.steps" :badge="guide.kind === 'erase' ? ERASE_GUIDE_BADGE : EDITOR_GUIDE_BADGE"
      @finish="onGuideFinish"
    >
      <template #footer>
        <label class="flex items-center gap-2 cursor-pointer select-none text-[12px] font-bold text-slate-600" title="다음에 열 때 자동으로 띄우지 않아요. [가이드]로 언제든 다시 볼 수 있어요." data-guide-hide-check>
          <input type="checkbox" class="w-4 h-4 accent-orange-500" :checked="guide.hide" data-guide-hide @change="setGuideHidden($event.target.checked)" />
          다시 보지 않기
        </label>
      </template>
    </SpotlightGuide>
    <!-- 단축키 표 (14단계): [가이드] 메뉴 · ? 키 -->
    <StudioShortcutsModal :open="shortcutsOpen" @close="shortcutsOpen = false" />

    <!-- 자르기 창 (12-1): 사진 한 장 — [완료] = 사진에 저장(이력 1개) + 꽉 찬 구간 높이 맞춤, [취소]·Esc = 그대로 -->
    <StudioCropScreen
      v-if="cropRow && isWide" :key="cropRow.id" :image="cropRow" :image-label="imageLabel(cropRow)" :shape="session.shapeOf(cropRow.id)"
      :load-source="loadCropSource" @done="onCropDone" @cancel="cropImageId = null"
    />

    <!-- 경계 다듬기 화면 (17-3): 붓 살리기/지우기로 배경 마스크를 고침 — [적용] = 다듬은 마스크 저장 + 사진 이력 1개, [취소]·Esc = 그대로 -->
    <StudioBgRefineScreen
      v-if="refineRow && refineBg && isWide" :key="refineRow.id" :image="refineRow" :image-label="imageLabel(refineRow)" :bg="refineBg"
      :load-source="loadRefineSource" :load-mask="loadRefineMask" :save="saveRefine" @close="closeRefine"
    />

    <!-- 미리보기 (13-2): PC·모바일 — 그림은 다운로드 엔진 결과 그대로. [이미지로 받기] = 아래 [다운로드] 창을 위에 연다 -->
    <StudioPreview
      v-if="page" :open="previewOpen" :page="page" :labels="sectionLabels" :pending-by-section="exportPendingBySection"
      :render="exportRender" :keys-blocked="exportOpen || !!exportCompareId || !!sampleAsk"
      @close="previewOpen = false" @export="openExport"
    />
    <!-- [다운로드] 창 (13-1): 구간별 여러 장·한 장, JPG·PNG, 1·2배 — 브라우저 캔버스로 그려 바로 내려받는다 (내 상품에도 보관)
         [작업 저장] = 같은 창을 save-only로 — 받지 않고 내 상품에 저장만. 끝나면 [판매처로 보내기]·[내 작업으로 가기]·[계속 편집] -->
    <StudioExportModal
      v-if="page" :open="exportOpen" :page="page" :project-id="project?.id || ''" :title="project ? projectDisplayTitle(project) : ''" :labels="sectionLabels"
      :pending-by-section="exportPendingBySection" :render="exportRender" :dev-compare="DEV_EXPORT_COMPARE" :save-only="exportSaveOnly"
      @close="exportOpen = false" @compare="openExportCompare" @home="goHomeAfterSave" @send="sendAfterSave"
    />
    <!-- [작업 저장] 뒤 [판매처로 보내기] — 내 작업 화면과 같은 보내기 창 -->
    <StudioSendModal :open="sendOpen" :prepare="sendPrepare" @close="sendOpen = false" />
    <p v-if="sendNote" class="fixed left-1/2 -translate-x-1/2 bottom-6 px-3 py-2 rounded-[10px] st-card st-shadow-float text-[13px] font-bold st-danger-text" style="z-index: 60" role="status" data-save-send-note>{{ sendNote }}</p>
    <!-- 개발용 비교 보기 (개발 서버에서만 — 빌드에는 들어가지 않는다) -->
    <component
      :is="StudioExportCompare" v-if="StudioExportCompare && exportCompareId && page"
      :page="page" :section-id="exportCompareId" :label="sectionLabels[exportCompareId] ?? ''"
      :images-by-id="imagesById" :views="views" :looks="session.lookMap" :render="exportRender"
      @close="exportCompareId = null"
    />

    <!-- 우클릭 메뉴 (6-1) -->
    <StudioContextMenu :open="ctx.open" :x="ctx.x" :y="ctx.y" :items="ctx.items" @select="onContextSelect" @close="ctx.open = false" />

    <div v-if="toast" class="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-[10px] st-card st-shadow-float text-[13px] font-bold st-ink break-keep" style="z-index: 30" data-toast>{{ toast }}</div>
    <!-- 작업 복사본 (16단계): 만드는 중 → "복사본을 만들었어요 [열기]" (닫을 때까지 남는다) -->
    <div v-if="copyNotice" class="absolute top-16 right-4 flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-[10px] st-card st-shadow-float text-[13px] font-bold st-ink break-keep" style="z-index: 31" :data-copy-notice="copyNotice.status">
      <template v-if="copyNotice.status === 'working'">복사본을 만드는 중이에요…</template>
      <template v-else>
        <span>복사본을 만들었어요</span>
        <button type="button" class="st-btn st-btn-primary h-8" data-copy-open @click="openCopy">열기</button>
        <button type="button" class="st-icon-btn" title="닫기" data-copy-close @click="copyNotice = null"><X class="w-4 h-4" :stroke-width="2" /></button>
      </template>
    </div>

    <!-- 원클릭 AI 자동 제작 (원클릭 1단계): 진행 화면 (편집기 전체를 덮는다 — 도는 동안 편집기 조작·단축키 쉼) -->
    <StudioAutoBuildScreen v-if="autoBuild.state.open" :state="autoBuild.state" @stop="autoBuild.stop()" @close="autoBuild.close()" />
    <!-- 원클릭: 이미 페이지가 있는 작업 — 원본은 그대로 두고 복사본에서 -->
    <StudioModal :open="autoCopyAsk" title="지금 작업은 그대로 두고, 복사본에서 새로 만들어요" @close="autoCopyAsk = false">
      이 작업의 페이지와 사진은 바뀌지 않아요. 복사본을 만든 뒤 그 복사본에서 원클릭으로 새 페이지를 만들고 열어 드려요.
      <template #actions>
        <button type="button" class="st-btn" @click="autoCopyAsk = false">취소</button>
        <button type="button" class="st-btn st-btn-ai" data-confirm-auto-copy @click="confirmAutoCopy"><Sparkles class="w-4 h-4" :stroke-width="2" /> 복사본에서 만들기</button>
      </template>
    </StudioModal>

    <!-- 사진 추가 -->
    <StudioModal :open="addOpen" wide title="내 사진 올리기" @close="addOpen = false">
      <StudioUploadPanel v-if="project" :project-id="project.id" :used-count="usedCount" @finished="onAddFinished" />
      <template #actions>
        <button type="button" class="st-btn" @click="addOpen = false">닫기</button>
      </template>
    </StudioModal>

    <!-- 예시 사진이 남아 있어요 (studioSamples) — [다운로드]·[작업 저장] 전에 -->
    <StudioModal :open="!!sampleAsk" :title="sampleAsk ? `예시 사진이 ${sampleAsk.n}장 남아 있어요` : ''" @close="sampleAsk = null">
      <span class="break-keep" data-sample-ask>예시 사진은 틀을 보여 주는 사진이에요. 판매 페이지에는 내 사진으로 바꿔서 올려 주세요.</span>
      <template #actions>
        <button type="button" class="st-btn" data-sample-ask-continue @click="sampleAskContinue">그대로 계속</button>
        <button type="button" class="st-btn st-btn-primary" data-sample-ask-show @click="sampleAskShow">예시 사진 보기</button>
      </template>
    </StudioModal>

    <!-- 사진 바꾸기 (6-2): 이 작업의 다른 사진 고르기 — 자리·크기·회전은 그대로 -->
    <StudioModal :open="replaceOpen" wide :title="selectedSampleItem ? '예시 사진 자리에 어떤 사진을 넣을까요?' : '어떤 사진으로 바꿀까요?'" @close="replaceOpen = false">
      <p class="st-desc mb-3 break-keep">자리·크기·회전·꾸미기는 그대로 두고 사진만 바뀌어요.</p>
      <p v-if="!doneImages.length" class="st-desc mb-3 break-keep" data-replace-empty>왼쪽 [사진]에서 사진을 올리면 여기서 고를 수 있어요.</p>
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

    <!-- 템플릿 교체 확인 (15단계) — 페이지에 내용이 있을 때만. 사진의 지우기·필터·자르기는 사진에 있어 그대로 -->
    <StudioModal :open="!!templateAsk" title="지금 페이지를 이 템플릿으로 바꿀까요?" @close="templateAsk = null">
      되돌리기로 되돌릴 수 있어요. 지운 사진·필터·자르기는 그대로 남아요.
      <template #actions>
        <button type="button" class="st-btn" @click="templateAsk = null">취소</button>
        <button type="button" class="st-btn st-btn-primary" data-confirm-template @click="confirmTemplate">바꾸기</button>
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
      <!-- 검수 2묶음: 무엇이 지워지고 무엇이 남는지 분명하게 (clearAllFills = 지우기(type fill)만 — 덮기·자르기·필터·배경은 그대로) -->
      <span data-clear-all-text>붓·네모로 지운 곳(AI 지우기·단색) {{ selectedFillCount }}곳을 모두 없애요.
        <template v-if="selectedFillCounts.cover">덮기 {{ selectedFillCounts.cover }}곳은 그대로 남아요.</template>
        자르기·필터·배경은 바뀌지 않아요. 되돌리기(Ctrl+Z)로 되돌릴 수 있어요.</span>
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
import { ref, shallowRef, reactive, computed, watch, nextTick, onMounted, onUnmounted, provide, defineAsyncComponent } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  ArrowLeft, Undo2, Redo2, Eye, Download, Save, History, Sparkles, Hand, CircleHelp,
  LayoutTemplate, Rows3, Image as ImageIcon, Type, Shapes, Blend, Bookmark, PanelRightOpen, PanelRightClose, ArrowUpDown, MoveVertical,
  MoreHorizontal, Pencil, Copy, X, Keyboard, Plus,
} from 'lucide-vue-next'
import { sectionAddArgs, elementTabOf, SECTION_ADD_HINT } from '@/lib/studioCanvasUi'
import StudioAutoBuildScreen from '@/components/studio/StudioAutoBuildScreen.vue'
import { useAutoBuild } from '@/composables/useAutoBuild'
import { AI_MISSING_NOTE } from '@/lib/studioPreview'
import { fetchProductFacts } from '@/lib/studioFactsApi'
import {
  reviewMark, buildDrafts, autoTemplate, oneClickTarget, AUTO_TEMPLATE_KEY, draftSectionIds, withDraftMark, isDraftSection, problemList,
  isAutoPage, readNoticeClosed, writeNoticeClosed,
} from '@/lib/studioAutoBuild'
import SpotlightGuide from '@/components/common/SpotlightGuide.vue'
import StudioShortcutsModal from '@/components/studio/StudioShortcutsModal.vue'
import { EDITOR_GUIDE_STEPS, ERASE_GUIDE_STEPS, EDITOR_GUIDE_BADGE, ERASE_GUIDE_BADGE } from '@/data/studioEditorGuide'
import { readGuideHidden, writeGuideHidden, shouldAutoStart, visibleSteps, readGuideShown, writeGuideShown } from '@/lib/studioGuide'
import { wheelZoom, zoomAnchor, scrollFix, panScroll, zoomPercent, blocksBrowserSelectAll } from '@/lib/studioViewNav'
import StudioStartScreen from '@/components/studio/StudioStartScreen.vue'
import StudioTemplatePanel from '@/components/studio/StudioTemplatePanel.vue'
import StudioBgPanel from '@/components/studio/StudioBgPanel.vue'
import { bgFromServer, bgMark, normalizeBgColor, withRefined, aiFromServer, libFromEntry, BG_DEFAULT_COLOR, sectionBgChoice } from '@/lib/studioBg'
import { fetchBgStatus, requestBgRemove, uploadBgRefined, uploadBgLocalMask, fetchBgGenStatus, requestBgGenerate } from '@/lib/studioBgApi'
import { buildLocalMaskPng } from '@/lib/studioBgLocal'
import { refineKey } from '@/lib/studioBgRefine'
import { templateByKey, templateFontList, buildTemplatePage } from '@/lib/studioTemplates'
import { templateSamples } from '@/lib/studioTemplateThumbs'
import { isSampleItem, sampleItemsOf } from '@/lib/studioSamples'
import { shouldShowStart } from '@/lib/studioStart'
import { copyProject } from '@/lib/studioProjectCopy'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioEraseScreen from '@/components/studio/StudioEraseScreen.vue'
import StudioPhotoPanel from '@/components/studio/StudioPhotoPanel.vue'
import StudioPageView from '@/components/studio/StudioPageView.vue'
import StudioContextMenu from '@/components/studio/StudioContextMenu.vue'
import StudioSelectBar from '@/components/studio/StudioSelectBar.vue'
import StudioStepBar from '@/components/studio/StudioStepBar.vue'
import StudioSectionPanel from '@/components/studio/StudioSectionPanel.vue'
import StudioMiniMap from '@/components/studio/StudioMiniMap.vue'
import StudioExportModal from '@/components/studio/StudioExportModal.vue'
import StudioSendModal from '@/components/studio/StudioSendModal.vue'
import { sendToMarketplace } from '@/lib/studioMarketplace'
import StudioPreview from '@/components/studio/StudioPreview.vue'
import StudioCropScreen from '@/components/studio/StudioCropScreen.vue'
import StudioBgRefineScreen from '@/components/studio/StudioBgRefineScreen.vue'
import { renderSection, renderPage, canvasToBlob } from '@/lib/studioExport'
import { loadWithResign } from '@/lib/studioImageCache'
import { geometryOf, drawGeometry, shapeMark, readShape } from '@/lib/studioCrop'
import StudioLayerPanel from '@/components/studio/StudioLayerPanel.vue'
import StudioTextPanel from '@/components/studio/StudioTextPanel.vue'
import StudioElementPanel from '@/components/studio/StudioElementPanel.vue'
import { groupPresetByKey, presetTextParts } from '@/lib/studioDecor'
import { assetFieldsOf, isAssetPath } from '@/lib/studioAsset'
import { loadAssetImage } from '@/lib/studioAssetLoad'
import { isValidTableItem, tableTemplateByKey, tableFieldsOf, hasTableCell, cleanCellText, tableRows, tableCols } from '@/lib/studioTable'
import { createTextMeasure, ensureStudioFonts, onFontsChanged, fontsReadyNow, loadFontsFor } from '@/lib/studioFonts'
import {
  isValidTextItem, normalizeTextItem, patchTextItem, textStyleOf, TEXT_INSERT_KINDS, stylePresetByKey, presetPatch, textStyleValues,
} from '@/lib/studioText'
import { readStep, writeStep, stepInfo, STEP_DEFAULT } from '@/lib/studioSteps'
import { SOURCE_MINE } from '@/lib/studioPhotoTabs'
import {
  loadMyProject, listEditorImages, signViewUrls, sortStudioImages, sortBySortOrder, hasSortOrderOverlap, setImageIncluded,
  renumberSortOrders, projectDisplayTitle, KIND_LABEL, SIGNED_URL_TTL, renameProject,
} from '@/lib/studioProjects'
import { createImageCache, createSignedUrlPool } from '@/lib/studioImageCache'
import { useEraseSession } from '@/composables/useEraseSession'
import { useBakeQueue } from '@/composables/useBakeQueue'
import { fillCounts, pixelLayersOf, hasClearLayer } from '@/lib/studioEdit'
import { usableFinalVersion, sameLayers } from '@/lib/studioFinal'
import { usePageSession } from '@/composables/usePageSession'
import { createViewImageStore, finalPathOf, composeErased, applyBackground, thumbUnderStyle } from '@/lib/studioViewImage'
import {
  firstItemOfImage, findItem, fitZoom, PAGE_WIDTH, PAGE_WIDTH_LABEL, ZOOM_PRESETS, PASTE_OFFSET,
  moveItems, setItemRect, setRotation, rotateBy, flipItems, setOpacity, setLocked, setHidden, alignItems, reorderItems,
  removeItems, copyItems, pasteItems, duplicateItems, sectionItemIds, isValidImageItem,
  setItemStyle, replaceItemImage, replaceSampleWithImage, itemIdsOfImage, pageImageIds, insertImageNear, dropImageAt,
  addSection, removeSection, moveSection, setSectionHeight, setGap, duplicateSection, setSectionBg, SECTION_MAX, reorderSections,
  groupItems, ungroupItems, groupCheck, anyGrouped, reorderItemTo, groupMemberIds,
  addTextItem, setTextProps, setTextContent, addElementItem, setShapeProps, setLineProps,
  addItemGroup, setTableProps, editTable, fitSectionsToImage, scaleItemsFrom, setSectionBgImage,
} from '@/lib/studioPage'
import { isValidShapeItem, isValidLineItem, elementKindByKey } from '@/lib/studioShape'
import { LABELS, restorePoint, list as listHistory } from '@/lib/studioHistory'
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
const RAIL = [ // 순서: 템플릿 → 사진 → 텍스트 → 요소 → 섹션 → 배경합성 → 저장값 (가이드는 맨 아래 따로)
  { key: 'template', label: '템플릿', icon: LayoutTemplate, soon: '' }, // 15단계: StudioTemplatePanel
  { key: 'photo', label: '사진', icon: ImageIcon, soon: '' },
  { key: 'text', label: '텍스트', icon: Type, soon: '' }, // 10-1: StudioTextPanel
  { key: 'element', label: '요소', icon: Shapes, soon: '' }, // 11-1: StudioElementPanel
  { key: 'section', label: '섹션', icon: Rows3, soon: '페이지가 준비되면 여기서 섹션을 다룰 수 있어요.' }, // 8-1: 페이지가 있으면 StudioSectionPanel
  { key: 'bg', label: '배경합성', icon: Blend, soon: '' }, // 17-1: StudioBgPanel
  { key: 'saved', label: '저장값', icon: Bookmark, soon: '', hidden: true }, // 아직 없는 기능 — 막대에 보이지 않는다(생기면 hidden을 뗀다)
]
const RAIL_SHOWN = RAIL.filter(r => !r.hidden) // 아직 없는 기능(hidden)은 막대에 그리지 않는다
const railItem = key => RAIL_SHOWN.find(r => r.key === key) || RAIL[1] // 모르는 값·숨긴 도구 = [사진]

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
const usableImagesNow = () => images.value.filter(i => i.ingest_status === 'done' && i.included === true)
// 검수 2묶음: 기본 배치·[빈 페이지에서 시작]도 자른 사진은 자른 비율로 (템플릿·[페이지에 넣기]와 같게 — 15단계 검수 후보 1)
const pageSession = usePageSession({ usableImages: () => usableImagesNow().map(i => sizedRow(i.id)).filter(Boolean), showToast })
const page = pageSession.page

// ── 시작 화면 ⓪ (16단계) — DB page가 비어 있는 작업만 (studioStart.shouldShowStart). [빈 페이지에서 시작] = 기본 배치를 바로 저장 ──
const startChosen = ref(false) // 이 창에서 시작을 골랐음 — 저장이 끝나기 전에도 바로 닫는다 (작업을 바꾸거나 로그아웃하면 비운다)
const showStart = computed(() => shouldShowStart({
  hasProject: !!project.value, isDefault: pageSession.isDefault.value, readError: pageSession.readError.value, chosen: startChosen.value,
}))
function startBlank() {
  if (!pageSession.startFromDefault()) {
    console.error('[StudioEditor] 시작 화면: 기본 배치로 시작하지 못함 (페이지가 비어 있지 않거나 저장 충돌 중)')
    showToast('지금은 시작할 수 없어요. 새로고침한 뒤 다시 해 주세요.')
    return
  }
  startChosen.value = true
}

// ── 템플릿 (15단계) — 왼쪽 [템플릿] 패널·시작 화면 [템플릿으로 시작]. 페이지 문서만 새로 만든다(studioTemplates.buildTemplatePage) ──
// 사진 편집 결과(studio_images.edit)는 사진에 있어 건드리지 않는다. 교체 = 페이지 이력 한 칸("템플릿 적용") → Ctrl+Z 한 번에 원래 페이지
const templateAsk = ref(null) // 확인을 기다리는 템플릿 key
// ── 14단계 화면 상태 (위에서 선언 — 아래 computed·watch가 읽는다) ──
const guideMenuOpen = ref(false)   // 왼쪽 맨 아래 [가이드] 메뉴
const shortcutsOpen = ref(false)   // 단축키 표
const pageHistoryOpen = ref(false) // 상단 [이력] 목록
const guide = reactive({ open: false, kind: 'editor', steps: [], hide: false }) // 떠 있는 사용가이드 (편집기 / 지우기 화면)
const spaceHeld = ref(false)       // 스페이스를 누르고 있음 → 끌면 화면 이동
const panning = ref(false)
// 템플릿에 넣을 사진 = 기본 배치와 같은 쓸 사진(준비 끝 + 안 쓸 사진 아님, 목록 순서), 자른 사진은 자른 비율로(sizedRow — 12-1)
const templateImages = computed(() => usableImagesNow().map(i => sizedRow(i.id)).filter(Boolean))
function askTemplate(key) {
  if (!templateByKey(key)) { console.error('[StudioEditor] 모르는 템플릿:', key); return }
  if (!page.value || eraseOpen.value) return
  pageView.value?.finishEdit()
  // 아직 저장한 적 없는 기본 배치(시작 화면)·빈 페이지는 묻지 않는다
  if (pageSession.isDefault.value || page.value.sections.length === 0) { applyTemplate(key); return }
  templateAsk.value = key
}
function confirmTemplate() {
  const key = templateAsk.value
  templateAsk.value = null
  if (key) applyTemplate(key)
}
async function applyTemplate(key) {
  const tpl = templateByKey(key)
  const pid = project.value?.id
  if (!tpl || !pid) return
  await whenFontsReady(templateFontList(tpl)) // 글자 높이를 재야 해서 글꼴 조각을 먼저 받는다
  const samples = await templateSamples(tpl) // 사진이 모자란 자리 = 예시 사진 (갤러리 그림과 같은 사진)
  if (!page.value || eraseOpen.value || project.value?.id !== pid) return
  const r = buildTemplatePage(tpl, templateImages.value, textMeasure, PAGE_WIDTH, { samples })
  if (!r) { showToast('템플릿을 적용하지 못했어요. 잠시 후 다시 해 주세요.'); return }
  if (pageSession.isDefault.value) {
    // 시작 화면(저장 전 기본 배치) — [빈 페이지에서 시작]과 같은 길로 바로 저장하고 시작 화면을 닫는다
    if (!pageSession.startFromDoc(r.page, LABELS.templateApply)) {
      console.error('[StudioEditor] 템플릿으로 시작하지 못함 (페이지가 비어 있지 않거나 저장 충돌 중):', key)
      showToast('지금은 시작할 수 없어요. 새로고침한 뒤 다시 해 주세요.')
      return
    }
    startChosen.value = true
  } else if (!applyPage(r.page, LABELS.templateApply)) {
    return
  }
  clearSelection()
  nextTick(() => { if (pageScroll.value) pageScroll.value.scrollTop = 0 })
  const notes = [`사진 ${r.placed}장이 자리에 들어갔어요`]
  if (r.extra) notes.push(`남은 사진 ${r.extra}장은 아래에 이어 붙였어요`)
  if (r.samples) notes.push(`남은 자리 ${r.samples}곳은 예시 사진이에요 — 내 사진으로 바꿔 주세요`)
  if (r.emptySlots) notes.push(`사진이 모자란 자리 ${r.emptySlots}곳은 뺐어요`)
  showToast(`'${tpl.label}' 템플릿을 적용했어요 · ${notes.join(' · ')}`)
}

// ── 템플릿 갤러리 [이 템플릿으로 시작] — 서버가 사진 없이 만든 빈 작업(project_blank)을 ?template=<key>로 연다.
// 시작 화면(페이지 없음)이면 그 템플릿을 바로 적용한다 — [템플릿] 패널과 같은 길(askTemplate → 확인 없이 startFromDoc), 사진 자리 = 예시 사진.
// 이 길에서만 "사진 0장이면 막음"(studioStart.canStartBlank)을 보지 않는다. 주소의 template은 한 번 쓰고 뗀다 (새로고침에 다시 적용하지 않게)
function startTemplateFromRoute() {
  const key = typeof route.query.template === 'string' ? route.query.template : ''
  if (!key || !project.value) return
  const { template: _t, ...rest } = route.query
  router.replace({ query: rest })
  if (!showStart.value) return // 이미 페이지가 있는 작업 — 바꾸지 않는다
  if (!templateByKey(key)) { console.error('[StudioEditor] 주소의 템플릿을 모름 — 시작 화면 그대로:', key); return }
  askTemplate(key)
}

// ── 작업 이름 바꾸기 (16단계) — 목록 화면과 같은 저장 함수(renameProject, title 칸만 — page·page_version과 부딪치지 않는다) ──
const titleEdit = reactive({ open: false, value: '' })
const titleInput = ref(null)
const titleMenuOpen = ref(false)
function openTitleEdit() {
  titleMenuOpen.value = false
  if (!project.value) return
  titleEdit.value = projectDisplayTitle(project.value)
  titleEdit.open = true
  nextTick(() => { titleInput.value?.focus(); titleInput.value?.select() })
}
function cancelTitle() { titleEdit.open = false }
async function commitTitle() {
  if (!titleEdit.open) return // Enter 뒤 입력칸이 사라지며 오는 blur는 한 번만
  titleEdit.open = false
  const p = project.value
  const next = titleEdit.value.trim()
  if (!p || !next || next === projectDisplayTitle(p)) return // 빈 이름·그대로면 저장하지 않는다
  const prev = p.title
  p.title = next
  try {
    await renameProject(p.id, next)
  } catch (e) {
    console.error('[StudioEditor] 이름 바꾸기 실패:', e)
    if (project.value?.id === p.id) p.title = prev
    showToast(e.message || '이름을 바꾸지 못했어요. 잠시 후 다시 해 주세요.')
  }
}

// ── 작업 복사본 (16단계) — 서버가 만든다(studioProjectCopy). 서버에 저장된 내용을 복사하므로 먼저 저장을 끝낸다. 확인 없이 바로 ──
const copyNotice = ref(null) // { status: 'working' } | { status: 'done', projectId }
async function copyThisProject() {
  titleMenuOpen.value = false
  const p = project.value
  if (!p || copyNotice.value?.status === 'working') return
  copyNotice.value = { status: 'working' }
  try {
    const [okEdit, okPage] = await Promise.all([session.flush(), pageSession.flush()])
    if (!okEdit || !okPage) {
      copyNotice.value = null
      showToast('저장이 끝나지 않아 복사하지 않았어요. 저장된 뒤 다시 눌러 주세요.')
      return
    }
    const r = await copyProject(p.id)
    if (project.value?.id !== p.id) { copyNotice.value = null; return } // 그 사이 다른 작업으로 옮김
    copyNotice.value = { status: 'done', projectId: r.projectId }
  } catch (e) {
    console.error('[StudioEditor] 복사본 만들기 실패:', e)
    copyNotice.value = null
    showToast(e.message)
  }
}
function openCopy() {
  const id = copyNotice.value?.projectId
  copyNotice.value = null
  if (id) router.push({ name: 'studio-editor', params: { projectId: id } })
}

// ── 원클릭 AI 자동 제작 (원클릭 1단계) — 사진 고르기 → 글자 찾기·자동 지우기 → 템플릿 배치 → 글자 초안 → 이 편집기에서 검수 ──
// 결과는 수동 편집과 같은 저장 형식(사진 edit.layers + page)이라 검수·편집은 이 편집기 그대로. 돈이 드는 외부 AI는 부르지 않는다.
// 페이지가 있는 작업은 원본을 절대 덮지 않는다 — 서버 복사본(16단계 project_copy)을 만들고 그 편집기(?oneclick=1)에서 돈다.
const autoBuild = useAutoBuild({
  images, session,
  loadImage: row => imageCache.get(row),
  startAi: () => startAi('원클릭'),
  loadFacts: async () => {
    const pid = project.value?.id
    if (!pid) return null
    const r = await fetchProductFacts(pid)
    autoFactsInfo = r
    return r.facts
  },
})
let autoFactsInfo = null // 마지막 product_facts 응답 (글자 초안 안내 문구용)
const autoCopyAsk = ref(false)
let oneClickPending = false // 불러오는 중에 눌렀음 — 다 불러오면 시작 (review-1)
// 안내 띠 (review-1 — 완료 팝업 대신): 원클릭이 끝나면 페이지 위에 한 줄. 이 창에서만(닫으면 끝), "확인 필요" 표시는 사진에 저장돼 남는다
// 검수 2묶음(해성 결정 2): 원클릭 페이지(page.auto — 저장돼 있음)면 닫기 전까지 새로고침 뒤에도 보인다. 한 번 닫으면 그 작업에서는 다시 안 띄움
// (닫음 = 작업별 localStorage — studioAutoBuild.readNoticeClosed 주석). 사진 수는 지금 페이지 기준으로 센다
const autoNotice = reactive({ listOpen: false, closedTick: 0 })
function noticeStorage() {
  try { return window.localStorage } catch (e) { console.warn('[StudioEditor] 브라우저 저장소를 쓸 수 없어 안내 띠 닫음을 이 창에서만 기억함:', e.message); return null }
}
const noticeClosedHere = ref(new Set()) // 저장소를 못 쓸 때 이 창에서라도 닫힌 채로
const noticeVisible = computed(() => {
  autoNotice.closedTick // 닫으면 다시 계산
  const pid = project.value?.id
  return !!pid && isAutoPage(page.value) && !autoBuild.state.open && !showStart.value
    && !noticeClosedHere.value.has(pid) && !readNoticeClosed(noticeStorage(), pid)
})
const noticePlaced = computed(() => (page.value ? pageImageIds(page.value).length : 0))
function closeNotice() {
  const pid = project.value?.id
  if (!pid) return
  autoNotice.listOpen = false
  noticeClosedHere.value = new Set([...noticeClosedHere.value, pid])
  writeNoticeClosed(noticeStorage(), pid, true)
  autoNotice.closedTick++
}
// 검수 2묶음: 왼쪽 위 "고른 요소" 칸은 요소를 다루는 패널(사진·텍스트·요소)에서만 — [템플릿]·[구간]·[배경합성]·[저장값]을 열면
// 그 패널이 "고른 요소" 아래로 밀려 안 보이던 문제 (선택은 그대로 — [사진] 등으로 돌아오면 다시 보인다)
// 고른 요소의 설정 = 작업판 맨 위 가로 도구줄 (StudioSelectBar — 예전 왼쪽 아래 "고른 요소 설정" 칸과 요소 위 떠 있는 도구줄을 합침).
// 글자·표 칸을 입력하는 중·지우기 화면·시작 화면에서는 숨김 (입력이 끝나면 다시)
const selectBarOn = computed(() => isWide.value && !!page.value && selectedItemIds.value.length > 0 && !showStart.value && !eraseOpen.value && !textEdit.value && !cellEdit.value)
// 왼쪽 재료 패널 열기/닫기 — [X] = 닫기(작업판이 넓어짐), 아이콘을 누르면 그 탭으로 다시 연다
const leftOpen = ref(true)
function onRail(key) {
  // 사용가이드는 클릭이 뒤로 통과해서, 떠 있는 채로 메뉴를 누르면 가이드가 계속 남아 있었다 — 메뉴를 누르면 닫은 것으로 친다
  if (guide.open) onGuideFinish()
  activeTool.value = key
  leftOpen.value = true
}
/** 사진 하나의 원클릭 표시 — 목록 줄·왼쪽 사진 패널·구간 이름 (studioAutoBuild.reviewMark) */
function autoMarkOf(id) { return reviewMark(session.autoOf(id), session.layerMap[id]) }
/** 확인하면 좋은 사진 (대표 사진이 맨 앞) — 안내 띠 숫자·목록 */
const autoProblems = computed(() => problemList(images.value, autoMarkOf))
/** 구간 id → "글자 남음" 같은 확인할 종류 — 페이지 구간 이름 아래·미니뷰에 "확인 필요"로 (사진 위에는 올리지 않는다) */
const sectionFlags = computed(() => {
  const out = {}
  for (const s of page.value?.sections || []) {
    const texts = [...new Set(s.items.filter(isValidImageItem).map(it => autoMarkOf(it.imageId)?.problemText).filter(Boolean))]
    if (texts.length) out[s.id] = texts.join(' · ') // 화면은 "확인 필요" + 이 종류 (페이지 = 두 줄, 미니뷰 = 배지·마우스)
  }
  return out
})
/** 고른 것이 글자 초안 구간 안이면 "AI 초안은 확인 후 사용해 주세요" 한 줄 */
const selectedInDraft = computed(() => {
  const p = page.value
  if (!p?.auto) return false
  if (isDraftSection(p, selectedSectionId.value)) return true
  return selectedItemIds.value.some(id => isDraftSection(p, findItem(p, id)?.section?.id))
})
/** [확인할 사진 보기] 한 줄 — 그 사진을 고르고(목록 탭도 그 사진으로) 페이지에 있으면 거기로 */
function goProblem(id) {
  autoNotice.listOpen = false
  activeTool.value = 'photo'
  selectFromPanel(id)
}
function onOneClick() {
  if (!isWide.value || autoBuild.state.open || eraseOpen.value) return
  if (loading.value || !project.value) {
    // 불러오는 중 — 조용히 무시하지 않고 알린 뒤, 다 불러오면 시작 (review-1)
    oneClickPending = true
    showToast('사진을 불러오는 중이에요. 다 불러오면 바로 원클릭을 시작할게요.')
    return
  }
  if (pageSession.readError.value) { showToast('페이지 내용을 읽지 못해 지금은 원클릭을 쓸 수 없어요. 새로고침해 주세요.'); return }
  if (usableImagesNow().length === 0) { showToast('먼저 왼쪽 [사진]에서 사진을 올려 주세요.'); return }
  const target = oneClickTarget({ isDefault: pageSession.isDefault.value, sectionCount: page.value?.sections.length ?? 0 })
  if (target === 'copy') { autoCopyAsk.value = true; return }
  runOneClick()
}
/** 복사본 만들기 → 복사본 편집기로 (?oneclick=1 — 불러오기가 끝나면 거기서 돈다). 원본은 저장만 끝내고 읽기만 한다 */
async function confirmAutoCopy() {
  autoCopyAsk.value = false
  const p = project.value
  if (!p || copyNotice.value?.status === 'working') return
  copyNotice.value = { status: 'working' }
  try {
    const [okEdit, okPage] = await Promise.all([session.flush(), pageSession.flush()])
    if (!okEdit || !okPage) {
      copyNotice.value = null
      showToast('저장이 끝나지 않아 복사본을 만들지 않았어요. 저장된 뒤 다시 눌러 주세요.')
      return
    }
    const r = await copyProject(p.id)
    copyNotice.value = null
    if (project.value?.id !== p.id) return
    router.push({ name: 'studio-editor', params: { projectId: r.projectId }, query: { oneclick: '1' } })
  } catch (e) {
    console.error('[StudioEditor] 원클릭용 복사본 만들기 실패:', e)
    copyNotice.value = null
    showToast(e.message)
  }
}
/** 불러오기 끝 — 주소에 oneclick=1이 있으면(방금 만든 복사본) 주소에서 떼고 원클릭을, 불러오는 중에 눌렀으면 그것을 */
function runOneClickFromRoute() {
  if (!project.value) return
  if (route.query.oneclick === '1') {
    oneClickPending = false
    const { oneclick: _o, ...rest } = route.query
    router.replace({ query: rest })
    if (isWide.value) runOneClick()
    return
  }
  if (oneClickPending) {
    oneClickPending = false
    onOneClick()
  }
}
async function runOneClick() {
  const pid = project.value?.id
  if (!pid) return
  autoFactsInfo = null
  autoNotice.listOpen = false
  clearSelection()
  await autoBuild.run(finishOneClick)
  if (project.value?.id !== pid) return
  if (!autoBuild.state.error) autoBuild.close()
}
/** 글자 초안을 못 만들었을 때 안내 띠 둘째 줄 (page.auto.note로 저장 — 새로고침 뒤에도) */
function draftNoteOf(facts, drafts) {
  if (!facts) return autoFactsInfo?.reason === 'no_offer' ? '글자는 템플릿 기본 문구예요 — 눌러서 상품 설명을 적어 주세요.' : '1688 상품 정보를 읽지 못해 글자는 템플릿 기본 문구예요 — 눌러서 적어 주세요.'
  if (!drafts.title && !drafts.body) return '한국어 상품 정보가 아직 없어 글자는 템플릿 기본 문구예요 — 눌러서 적어 주세요.'
  return ''
}
/** 사진 처리가 끝나면(또는 멈추면) — 처리된 사진으로 페이지를 만들어 저장하고, 팝업 없이 페이지 + 위쪽 안내 띠 */
async function finishOneClick({ results, facts }) {
  const pid = project.value?.id
  const drafts = buildDrafts(facts)
  const photos = results.filter(r => r.placed).map(r => sizedRow(r.id)).filter(Boolean)
  if (photos.length) {
    const tpl = autoTemplate(templateByKey(AUTO_TEMPLATE_KEY), photos.length, drafts)
    await whenFontsReady(templateFontList(tpl)) // 글자 높이를 재야 해서 글꼴 조각을 먼저 받는다 (템플릿 적용과 같음)
    if (project.value?.id !== pid) return
    const r = buildTemplatePage(tpl, photos, textMeasure)
    let ok = false
    if (!r) console.error('[StudioEditor] 원클릭 페이지를 만들지 못함 (템플릿 모양 오류)')
    else {
      const doc = withDraftMark(r.page, draftSectionIds(r.page, drafts), draftNoteOf(facts, drafts)) // 원클릭 페이지·초안 구간·초안 안내 (page.auto)
      if (pageSession.isDefault.value) {
        ok = pageSession.startFromDoc(doc, LABELS.autoBuild)
        if (ok) startChosen.value = true
      } else ok = applyPage(doc, LABELS.autoBuild)
    }
    if (!ok) showToast('페이지를 만들지 못했어요. 사진은 다듬어 둔 그대로 목록에 있어요. [템플릿]으로 다시 만들어 주세요.')
    nextTick(() => { if (pageScroll.value) pageScroll.value.scrollTop = 0 })
  }
  await Promise.all([session.flush(), pageSession.flush()])
  for (const x of results) if (x.status === 'erased') requestBake(x.id) // 완성 사진은 뒤에서 한 장씩 (지우기 화면을 닫을 때와 같은 길)
  // 새 원클릭 페이지 → 안내 띠를 다시 보인다 (전에 닫았어도 — 새로 만든 페이지라서)
  if (photos.length && pid) {
    noticeClosedHere.value = new Set([...noticeClosedHere.value].filter(x => x !== pid))
    writeNoticeClosed(noticeStorage(), pid, false)
    autoNotice.listOpen = false
    autoNotice.closedTick++
  }
  if (!photos.length) showToast('페이지에 넣을 사진이 없어 페이지는 그대로예요. [사진] 목록을 확인해 주세요.')
}
/** [원본으로] — 원클릭이 지운 레이어만 뺀다 (사진 이력 한 칸 → 편집기 Ctrl+Z로 되돌림) */
function onAutoRevert(id) {
  if (eraseOpen.value) return
  if (session.revertAuto(id)) {
    noteAction({ imageId: id })
    showToast('자동으로 다듬은 곳을 원본으로 돌렸어요 · Ctrl+Z로 되돌리기')
  }
}
/** [빼기] — 페이지에서 빼기 (페이지 이력 "페이지에서 빼기" 한 칸 → Ctrl+Z). 사진은 목록에 그대로 */
function onAutoRemove(id) {
  if (!page.value || eraseOpen.value) return
  const ids = itemIdsOfImage(page.value, id)
  if (!ids.length) return
  const next = removeItems(page.value, ids)
  if (applyPage(next, LABELS.elRemovePhoto)) {
    pruneSelection()
    showToast(ids.some(i => findItem(next, i)) ? '잠긴 자리는 빼지 않았어요.' : '페이지에서 뺐어요 · 사진은 목록에 그대로 있어요 · Ctrl+Z로 되돌리기')
  }
}
const pageCanUndo = computed(() => pageSession.canUndoNow.value && !eraseOpen.value)
const pageCanRedo = computed(() => pageSession.canRedoNow.value && !eraseOpen.value)
const selectedItemIds = ref([])  // 페이지에서 고른 요소 (6-1: 여러 개)
const textEdit = ref(null)       // { id, selectAll } 고치는 중인 글자 요소 (10-1) — 그동안 편집기 단축키는 쉰다
const cellEdit = ref(null)       // { id, r, c } 캔버스에서 입력 중인 표 칸 (표 칸 입력) — 그동안 편집기 단축키는 쉰다
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
  const ce = cellEdit.value // 입력 중이던 표·칸이 없어짐(되돌리기·줄 삭제·충돌 불러오기 등)
  if (ce && !(p && hasTableCell(findItem(p, ce.id)?.item, ce.r, ce.c))) cellEdit.value = null
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
    out[s.id] = row ? KIND_LABEL[row.kind] ?? '사진' : '섹션'
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

// ── [내보내기] 창 (13-1) — 상태만 여기 (그리기·사진 준비는 아래 "내보내기" 묶음). 개발용 비교 보기는 개발 서버에서만 ──
const exportOpen = ref(false)
const exportSaveOnly = ref(false) // true = [작업 저장] (받지 않고 내 상품에 저장만)
const exportCompareId = ref(null) // 비교 보기 중인 구간 id (개발용)
const previewOpen = ref(false)    // 13-2 미리보기 (PC·모바일)
const cropImageId = ref(null)     // 12-1 자르기 창을 연 사진 id
const refineImageId = ref(null)   // 17-3 경계 다듬기 화면을 연 사진 id
const refineBg = ref(null)        // 그 화면을 열 때의 edit.bg (화면이 열린 동안 바뀌지 않게 복사본)

// ── 섹션 순서 (8-2 → 미니뷰 끌기) — 예전 [순서 변경] 창과 같은 reorderSections·같은 이력 한 칸 "섹션 순서 변경" ──
function onMiniReorder(ids) {
  if (!page.value || eraseOpen.value) return
  if (applyPage(reorderSections(page.value, ids), LABELS.secReorder)) showToast('섹션 순서를 바꿨어요 · Ctrl+Z로 되돌리기')
}
/** 섹션 사이 [+ 여기에 섹션 추가]·미니뷰 [+] — at = 새 섹션 번호. 우클릭 "위에/아래에 섹션 추가"와 같은 sectionAdd (추가 뒤 그 섹션을 고르고 보이게) */
function onAddSectionAt(at) {
  const p = page.value
  if (!p || eraseOpen.value || showStart.value) return
  const args = sectionAddArgs(p.sections.map(s => s.id), at)
  if (!args) { console.error('[StudioEditor] 섹션을 넣을 자리가 잘못됨:', at); return }
  runCommand('sectionAdd', args)
}
// ── [요소] 탭 종류 — 이 편집기 안에서만 기억 (패널은 탭을 열 때마다 새로 만들어진다) ──
const elementTab = ref(elementTabOf(null))
// ── 캔버스 위 안내 한 줄 "섹션 사이에 마우스를 올리면…" — 닫으면 다시 안 보임 (studioGuide GUIDE_KEYS.sectionAdd, localStorage) ──
const sectionHintClosed = ref(readGuideHidden(guideStorage(), 'sectionAdd'))
// 첫 진입 안내는 한 번에 하나: 사용가이드가 떠 있거나 바로 뒤에 자동으로 뜰 참이면(guideAutoReady) 기다렸다가, 닫거나 끝낸 뒤에 이 한 줄
const sectionHintVisible = computed(() => !sectionHintClosed.value && isWide.value && !!page.value?.sections.length
  && !showStart.value && !eraseOpen.value && !autoBuild.state.open && !pageSession.readError.value
  && !guide.open && guideAutoReady.value !== 'editor')
function closeSectionHint() {
  sectionHintClosed.value = true
  writeGuideHidden(guideStorage(), 'sectionAdd', true)
}
const pageTopPad = computed(() => (noticeVisible.value && sectionHintVisible.value ? 'pt-36' : noticeVisible.value ? 'pt-24' : sectionHintVisible.value ? 'pt-16' : 'pt-8'))
/** 오른쪽 아래 [섹션 사이 간격] → [섹션] 패널을 열고 간격 칸으로 */
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
const LOCK_BLOCKED = new Set(['scale', 'rotate90', 'rotation', 'flipX', 'flipY', 'align', 'rect', 'delete', 'removeFromPage', 'cut', 'nudge'])
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
  templateAsk.value = null  // 15 템플릿 교체 확인창
  pageHistoryOpen.value = false // 14 [이력] 목록 · 단축키 표 · 가이드 메뉴·가이드
  shortcutsOpen.value = false
  guideMenuOpen.value = false
  guide.open = false
  textEdit.value = null     // 10-1 글자 고치기
  cellEdit.value = null     // 표 칸 입력
  exportOpen.value = false  // 13-1 [다운로드]·[작업 저장] 창
  sendOpen.value = false
  sendPrepare.value = null
  exportCompareId.value = null
  previewOpen.value = false // 13-2 미리보기
  cropImageId.value = null  // 12-1 자르기 창
  refineImageId.value = null // 17-3 경계 다듬기 화면
  refineBg.value = null
  autoNotice.listOpen = false // 원클릭 안내 띠 목록·복사본 확인 (review-1 — 띠 자체는 page.auto + 닫음 기억으로 보임)
  autoCopyAsk.value = false
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
// 예시 사진 하나를 골랐을 때 (studioSamples) — 도구줄 [내 사진으로 바꾸기] → 사진 바꾸기 창
const selectedSampleItem = computed(() => {
  if (selectedItemIds.value.length !== 1 || !page.value) return null
  const it = findItem(page.value, selectedItemIds.value[0])?.item
  return isSampleItem(it) ? it : null
})
// 맨 위 도구줄의 사진 정보([지우기] 툴팁)·[지우기 모두 되돌리기] — 예전 작업판 오른쪽 위 사진 정보 카드를 대신한다.
// 모두 되돌리기(confirmClearAll)는 selectedImageId 기준이라, 고른 사진 요소와 같은 사진일 때만 값을 준다
const photoBarImage = computed(() => (selectedImage.value && selectedPhotoItem.value && selectedImage.value.id === selectedPhotoItem.value.imageId ? selectedImage.value : null))
const photoBarInfo = computed(() => {
  const img = photoBarImage.value
  if (!img) return ''
  const c = selectedFillCounts.value
  const name = img.kind === 'upload' && img.upload_name ? ` · ${img.upload_name}` : ''
  return `${KIND_LABEL[img.kind] || '사진'}${name} · ${img.width}×${img.height}px · ${formatBytes(img.bytes)} · 지움 ${c.done}${c.cover ? ` · 덮기 ${c.cover}` : ''}${c.redo ? ` · 다시 지우기 ${c.redo}` : ''}`
})
const replaceOpen = ref(false)
const resetLookOpen = ref(false)
const includeAsk = ref(null) // { id } 안 쓸 사진으로 옮길 사진이 페이지에 놓여 있을 때
const compare = ref(null)    // { imageId, url } 원본 비교 중
let compareSeq = 0

function pickReplace(imageId) {
  const sample = selectedSampleItem.value
  const it = selectedPhotoItem.value
  replaceOpen.value = false
  if (!page.value) return
  if (sample) {
    // 예시 사진 자리 → 내 사진 (자리·크기·꾸미기 그대로 사진 요소로). 이력 "사진 바꾸기"
    const img = sizedRow(imageId)
    if (!img || img.ingest_status !== 'done') return
    if (applyPage(replaceSampleWithImage(page.value, sample.id, imageId), LABELS.elReplace)) selectImage(imageId)
    return
  }
  if (!it) return
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
    showToast('이 사진은 지금 페이지에 넣을 수 없어요. 섹션을 정리한 뒤 다시 해 주세요.')
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
  const img = sizedRow(imageId) // 12-1: 자른 사진은 자른 비율로
  if (!page.value || !img || eraseOpen.value) return
  applyInsert(insertImageNear(page.value, img, pageView.value?.sectionInView() || null))
}
/** 목록 사진을 페이지에 끌어다 놓음 — 놓은 구간의 놓은 자리 (studioPage.dropImageAt) */
function onDropImage({ imageId, sectionId, x, y }) {
  const img = sizedRow(imageId) // 12-1: 자른 사진은 자른 비율로
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
  if (!target) { showToast('섹션을 더 만들 수 없어 글자를 넣지 못했어요.'); return }
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
  const members = groupMemberIds(page.value, id) // 11-2: 그룹(배지 등) 안의 글자 — 끝나면 그룹 전체를 다시 고른다
  if (text.trim() === '') {
    applyPage(removeItems(page.value, [id]), LABELS.textEdit)
    reselectGroup(id, members.filter(m => m !== id))
    return
  }
  await whenFontsReady([{ style: textStyleOf(f.item), text }])
  if (page.value) applyPage(setTextContent(page.value, id, text, textMeasure), LABELS.textEdit)
  reselectGroup(id, members)
}
/**
 * 그룹 안 글자를 고친 뒤 그룹 전체 고르기 (11-2) — 그 사이 다른 것을 골랐으면(다른 요소·빈 곳을 눌러 끝냄) 그대로 둔다.
 * 아직 그룹으로 남은 구성원이 2개 이상일 때만 (글자를 비워 지워서 그룹이 풀렸으면 그대로)
 */
function reselectGroup(editedId, members) {
  const sel = selectedItemIds.value
  const untouched = sel.length === 1 && sel[0] === editedId
  if (!untouched || members.length < 2 || !page.value) return
  const alive = groupMemberIds(page.value, members[0])
  if (alive.length < 2) return
  selectedItemIds.value = alive
  selectionSource = 'page'
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
  if (!target) { showToast('섹션을 더 만들 수 없어 넣지 못했어요.'); return }
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
// ── 강조 배지·사이즈표 (11-2) — 배지 = 도형 + 글자 그룹(studioBadge 프리셋, addItemGroup), 사이즈표 = type 'table'(studioTable) ──
/** [요소] 패널 배지 견본 누름 — 글꼴 조각을 받은 뒤(글자 높이를 재야 해서) 골라진/보는 중 구간 가운데에 한 그룹으로 넣고 그룹 전체를 고른다 */
async function insertBadge(key) {
  // 에셋 채우기: 꾸밈 요소(studioDecor — 체크·번호·말풍선·구분선·화살표)도 같은 묶음 넣기. 이력 이름만 다르다
  const found = groupPresetByKey(key)
  if (!found) { console.error('[StudioEditor] 모르는 배지·꾸밈 요소:', key); return }
  const preset = found.preset
  if (!page.value || eraseOpen.value) return
  await whenFontsReady(presetTextParts(preset).map(p => {
    const n = normalizeTextItem({ type: 'text', ...p })
    return { style: textStyleOf(n), text: n.text }
  }))
  if (!page.value || eraseOpen.value) return
  const target = insertTarget(page.value)
  if (!target) { showToast('섹션을 더 만들 수 없어 넣지 못했어요.'); return }
  const r = addItemGroup(target.page, target.sid, preset, preset.parts, textMeasure)
  if (!r.ids.length) {
    console.error('[StudioEditor] 배지를 넣지 못함:', key, target.sid)
    showToast('넣지 못했어요. 잠시 후 다시 해 주세요.')
    return
  }
  if (!applyPage(r.page, found.kind === 'decor' ? LABELS.decorInsert : LABELS.badgeInsert)) return
  selectedItemIds.value = r.ids
  selectionSource = 'page'
  nextTick(() => pageView.value?.scrollToItem(r.ids[0]))
}
/** [요소] 패널 사이즈표 기본 틀 누름 — 골라진/보는 중 구간 가운데에 넣고 고르기 (칸은 왼쪽 "표 편집"에서) */
function insertTable(key) {
  const tpl = tableTemplateByKey(key)
  if (!tpl) { console.error('[StudioEditor] 모르는 사이즈표 틀:', key); return }
  if (!page.value || eraseOpen.value) return
  const target = insertTarget(page.value)
  if (!target) { showToast('섹션을 더 만들 수 없어 넣지 못했어요.'); return }
  const r = addElementItem(target.page, target.sid, tableFieldsOf(tpl))
  if (!r.itemId) {
    console.error('[StudioEditor] 사이즈표를 넣지 못함:', key, target.sid)
    showToast('넣지 못했어요. 잠시 후 다시 해 주세요.')
    return
  }
  if (!applyPage(r.page, LABELS.tableInsert)) return
  selectedItemIds.value = [r.itemId]
  selectionSource = 'page'
  nextTick(() => pageView.value?.scrollToItem(r.itemId))
}
/**
 * [요소] → [이미지] 견본 누름 (에셋 이미지 — 고객 사진이 아닌 우리 그림).
 * 요소용(use 'item') = 골라진/보는 중 섹션 가운데에 넣고 고르기, 배경용(use 'bg') = 그 섹션의 배경 이미지로 (배경색은 그대로 남는다)
 */
function insertAsset(entry) {
  if (!entry || !isAssetPath(entry.file)) { console.error('[StudioEditor] 모르는 에셋 이미지:', entry); return }
  if (!page.value || eraseOpen.value) return
  const target = insertTarget(page.value)
  if (!target) { showToast('섹션을 더 만들 수 없어 넣지 못했어요.'); return }
  if (entry.use === 'bg') {
    const next = setSectionBgImage(target.page, target.sid, entry.file)
    if (next === target.page) { showToast('이미 이 섹션의 배경이에요.'); return }
    if (!applyPage(next, LABELS.secBgImage)) return
    selectedSectionId.value = target.sid
    showToast('섹션 배경으로 넣었어요 · 빼려면 [섹션]에서 [배경 이미지 빼기]')
    return
  }
  const r = addElementItem(target.page, target.sid, assetFieldsOf(entry))
  if (!r.itemId) {
    console.error('[StudioEditor] 에셋 이미지를 넣지 못함:', entry.id, target.sid)
    showToast('넣지 못했어요. 잠시 후 다시 해 주세요.')
    return
  }
  if (!applyPage(r.page, LABELS.assetInsert)) return
  selectedItemIds.value = [r.itemId]
  selectionSource = 'page'
  nextTick(() => pageView.value?.scrollToItem(r.itemId))
}
const selectedHasTable = computed(() => !!page.value && selectedItemIds.value.some(id => isValidTableItem(findItem(page.value, id)?.item)))
const TABLE_LABEL_OF = {
  headerRow: LABELS.tableHeader, fontFamily: LABELS.tableFont, fontSize: LABELS.tableSize, align: LABELS.tableAlign,
  color: LABELS.tableColor, headerBg: LABELS.tableColor, headerColor: LABELS.tableColor, cellBg: LABELS.tableColor,
  borderColor: LABELS.tableBorder, borderWidth: LABELS.tableBorder,
}
const TABLE_EDIT_LABEL_OF = {
  cell: LABELS.tableCell, addRow: LABELS.tableRowAdd, removeRow: LABELS.tableRowRemove, addCol: LABELS.tableColAdd, removeCol: LABELS.tableColRemove,
  removeRowAt: LABELS.tableRowRemove, removeColAt: LABELS.tableColRemove, // 캔버스 칸 우클릭 "이 줄·이 열 삭제"
}
/** 표 편집 칸 → runCommand (다른 조작과 같은 길) */
function onTableProps(patch, { merge, key } = {}) { runCommand('tableProps', { patch, merge, key }) }
function onTableEdit({ id, op }) { runCommand('tableEdit', { id, op }) }
// ── 캔버스에서 표 칸 바로 입력 — 글자 고치기(10-1)와 같은 방식. 반영은 왼쪽 "표 편집" 칸과 같은 runCommand('tableEdit') (이력·저장 같음) ──
/** 칸 입력 시작 — 표 더블클릭, 골라진 표 한 번 누르기 */
function startCellEdit({ id, r, c }) {
  const it = page.value ? findItem(page.value, id)?.item : null
  if (!hasTableCell(it, r, c) || eraseOpen.value) return
  textEdit.value = null
  if (selectedItemIds.value.length !== 1 || selectedItemIds.value[0] !== id) { selectedItemIds.value = [id]; selectionSource = 'page' }
  cellEdit.value = { id, r, c }
}
/** 칸 반영(Enter·Tab·바깥 누르기) — 바뀐 칸만 이력 1개 "표 칸 고치기", 그다음 next 칸으로(null = 끝) */
function onCellCommit({ id, r, c, text, next }) {
  cellEdit.value = null
  const it = page.value ? findItem(page.value, id)?.item : null
  if (!hasTableCell(it, r, c)) return
  if (cleanCellText(text) !== it.cells[r][c]) runCommand('tableEdit', { id, op: { kind: 'cell', r, c, text } })
  const after = page.value ? findItem(page.value, id)?.item : null
  if (next && hasTableCell(after, next.r, next.c)) cellEdit.value = { id, r: next.r, c: next.c }
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
    case 'rotation': applyPage(setRotation(p, ids, args.deg), LABELS.elRotate, args.merge ? { mergeKey: 'rotation' } : undefined); break
    // 가로 도구줄 [크기] 슬라이더 — 연 때의 문서(args.base)에서 factor배 (비율 유지, 끄는 동안 이력 한 칸 "크기 조절")
    case 'scale': applyPage(scaleItemsFrom(args.base, ids, args.factor, textMeasure), LABELS.elResize, { mergeKey: 'scale' }); break
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
    // ── 11-2 사이즈표 — 모양은 고른 표 모두에(setTableProps), 칸·행·열은 그 표 하나에(editTable, args.id — 칸을 고친 뒤 선택이 바뀌어도 그 표) ──
    case 'tableProps': {
      const label = TABLE_LABEL_OF[Object.keys(args.patch)[0]]
      if (!label) { console.error('[StudioEditor] 표 속성 라벨 없음 — 적용 안 함:', args.patch); break }
      applyPage(setTableProps(p, ids, args.patch), label, args.merge ? { mergeKey: `table-${args.key}` } : undefined)
      break
    }
    case 'tableEdit': {
      const label = TABLE_EDIT_LABEL_OF[args.op?.kind]
      if (!label) { console.error('[StudioEditor] 모르는 표 편집:', args.op); break }
      applyPage(editTable(p, args.id, args.op), label)
      break
    }
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
    case 'sectionBgImage': { // 에셋 이미지: 섹션 배경 이미지 넣기·빼기 (asset = 경로 | null)
      applyPage(setSectionBgImage(p, args.sectionId ?? selectedSectionId.value, args.asset), LABELS.secBgImage)
      break
    }
    case 'sectionDelete': { // 확인창 없이 — removeSection이 사진을 parked로 옮기므로 사진은 잃지 않는다. Ctrl+Z로 되돌림
      const sid = args.sectionId ?? selectedSectionId.value
      if (applyPage(removeSection(p, sid), LABELS.secDelete)) {
        selectedSectionId.value = null
        showToast('섹션을 지웠어요. 사진은 [사진] 목록에 그대로 있어요 · Ctrl+Z로 되돌리기')
      }
      break
    }
    case 'gap': applyPage(setGap(p, args.v), LABELS.secGap); break
    // ── 그룹 (9단계) — 묶기는 같은 구간의 2개 이상만. 풀기는 고른 요소가 속한 그룹을 통째로 ──
    case 'group': {
      const c = groupCheck(p, ids)
      if (c === 'mixed') { showToast('같은 섹션 안의 요소만 묶을 수 있어요'); break }
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
const ctx = reactive({ open: false, x: 0, y: 0, items: [], sectionId: null, tableCell: null })
function openContextMenu({ x, y, itemId, sectionId, cell }) {
  if (eraseOpen.value) return
  const p = page.value
  const hasClip = !!clipboard?.length
  if (!itemId) {
    // 구간 빈 곳·구간 이름 우클릭 = 그 구간을 고르고 구간 메뉴도 함께 (8-1)
    if (sectionId) pickSection(sectionId)
    const noSec = !sectionId, full = p.sections.length >= SECTION_MAX
    ctx.items = [
      { key: 'paste', label: '붙여넣기', keys: 'Ctrl+V', disabled: !hasClip },
      { key: 'selectAll', label: '이 섹션 전체 선택', keys: 'Ctrl+A' },
      { sep: true },
      { key: 'sec-add-above', label: '위에 섹션 추가', disabled: noSec || full },
      { key: 'sec-add-below', label: '아래에 섹션 추가', disabled: noSec || full },
      { key: 'sec-duplicate', label: '섹션 복제', disabled: noSec || full },
      { sep: true },
      { key: 'sec-delete', label: '섹션 삭제', danger: true, disabled: noSec },
    ]
    ctx.sectionId = sectionId
    ctx.tableCell = null
  } else {
    const items = selectedItemIds.value.map(id => findItem(p, id)?.item).filter(Boolean)
    const anyLocked = items.some(it => it.locked), allLocked = items.length > 0 && items.every(it => it.locked)
    const anyHidden = items.some(it => it.hidden)
    // 표 칸 우클릭 (표 하나만 골랐을 때) = 맨 위에 "이 줄 삭제"·"이 열 삭제" — 그 칸의 줄·열 (1줄·1열은 남는다)
    const tbl = cell && selectedItemIds.value.length === 1 && selectedItemIds.value[0] === itemId ? findItem(p, itemId)?.item : null
    ctx.tableCell = tbl && hasTableCell(tbl, cell.r, cell.c) ? { id: itemId, r: cell.r, c: cell.c } : null
    const tableMenu = ctx.tableCell ? [
      { key: 'table-rowAt', label: `이 줄 삭제 (${cell.r + 1}번째 줄)`, danger: true, disabled: tableRows(tbl) <= 1 },
      { key: 'table-colAt', label: `이 열 삭제 (${cell.c + 1}번째 열)`, danger: true, disabled: tableCols(tbl) <= 1 },
      { sep: true },
    ] : []
    ctx.items = [
      ...tableMenu,
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
  if (key === 'table-rowAt' || key === 'table-colAt') {
    const tc = ctx.tableCell
    if (tc) onTableEdit({ id: tc.id, op: key === 'table-rowAt' ? { kind: 'removeRowAt', r: tc.r } : { kind: 'removeColAt', c: tc.c } })
  } else if (key.startsWith('order-')) runCommand('order', { where: key.slice(6) })
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
    .map(row => ({ row, layers: session.layerMap[row.id] || [], finalVersion: finalVersionOf(row), shape: session.shapeOf(row.id), bg: session.bgOf(row.id) })) // 12-1 자르기·띠, 17-1 배경
})
watch(viewWants, list => {
  for (const w of list) viewStore.want(w.row, w.layers, { finalVersion: w.finalVersion, shape: w.shape, bg: w.bg })
  prioritizeVisible()
}, { immediate: true })
function retryView(imageId) {
  const row = imagesById.value.get(imageId)
  if (row) viewStore.retry(row, session.layerMap[imageId] || [], { finalVersion: finalVersionOf(row), shape: session.shapeOf(imageId), bg: session.bgOf(imageId) })
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
 *   지우기 저장이 안 끝남(실패·충돌 — 상단 저장 상태가 알린다) / 지우기가 없음(원본이 그대로 최종) /
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
  // 삭제(투명)가 있으면 완성 JPG를 만들지 않는다 — JPG는 투명을 못 담는다. 화면·내보내기·미리보기는 원본 + 지운 결과를 그때그때 합친다(투명 유지)
  if (hasClearLayer(layers)) { bakeQueue.clear(id); return }
  if (counts.redo > 0) { bakeQueue.markBlocked(id); return }
  if (counts.done === 0 && counts.cover === 0) { bakeQueue.clear(id); return } // 12-2: 덮기만 있어도 굽는다
  if (usableFinalVersion(row) !== null) { bakeQueue.clear(id); return }
  bakeQueue.request(row, layers, row.edit_version)
}
// ── 내보내기 (13-1) — 그리기는 studioExport 엔진, 사진·글꼴은 화면과 같은 것을 넘긴다 ──
// 사진 = 화면 작은 사진과 같은 규칙의 원본 크기: 완성 JPG를 쓸 수 있으면 그것(finalVersionOf — 화면과 같은 판단), 아니면 원본 + 지금 지우기 조각(composeErased)
/** 지운 사진(원본 크기, 자르기·띠 전) — 내보내기와 자르기 창(12-1)이 같이 쓴다 */
async function erasedSourceOf(imageId) {
  const row = imagesById.value.get(imageId)
  if (!row) throw new Error('이 작업에 없는 사진이에요')
  if (row.ingest_status !== 'done' || !row.original_path) throw new Error('아직 준비되지 않은 사진이에요')
  const f = finalVersionOf(row)
  if (f !== null) {
    const el = await loadWithResign(urlPool, finalPathOf(row, f))
    return { source: el, width: el.naturalWidth, height: el.naturalHeight, notes: [] }
  }
  const el = await loadWithResign(urlPool, row.original_path)
  const r = await composeErased(el, pixelLayersOf(session.layerMap[imageId] || []))
  const notes = [...r.problems]
  if (r.aiMissing.length || r.aiStale.length) notes.push(AI_MISSING_NOTE) // 미리보기·내보내기가 사진 수로 한 줄에 묶는다 (studioPreview.summarizeNotes)
  return { source: r.canvas || el, width: el.naturalWidth, height: el.naturalHeight, notes }
}
/**
 * 내보낼 사진 = 지운 사진 → 배경 마스크(17-1, 투명일 때 — 화면 작은 사진과 같은 applyBackground) → 띠 잘라내기 → 자르기
 * (12-1, studioCrop.geometryOf — 화면 작은 사진과 같은 함수). 필터·꾸미기는 엔진이. 투명한 곳은 엔진이 먼저 칠한 구간 배경색이 보인다
 */
async function exportImageOf(imageId) {
  const erased = await erasedSourceOf(imageId)
  const masked = await applyBackground(urlPool, erased.source, erased.width, erased.height, session.bgOf(imageId))
  // 17-2 단색: 사진은 투명 그대로, 색(masked.color)은 엔진 drawPhoto가 사진 자리 아래에 칠한다 (필터는 사진에만)
  // 17-4 AI 배경: masked.under(원본 크기)를 사진과 같은 띠·자르기로 → bgSource (엔진 drawPhoto가 사진 아래에 그린다, 필터 없음)
  const src = masked.canvas
    ? { source: masked.canvas, width: erased.width, height: erased.height, notes: [...erased.notes, ...masked.problems], bgColor: masked.color, bgSource: masked.under }
    : { ...erased, notes: [...erased.notes, ...masked.problems] }
  const geo = geometryOf(src.width, src.height, session.shapeOf(imageId))
  if (geo.identity) return src
  const notes = geo.cropIgnored ? [...src.notes, '자르기 영역이 모두 잘라낸 띠 안이라 자르기를 쓰지 않았어요'] : src.notes
  const cut = source => {
    const c = document.createElement('canvas')
    c.width = geo.width
    c.height = geo.height
    drawGeometry(c.getContext('2d'), source, geo, 0, 0, geo.width, geo.height)
    return c
  }
  return { source: cut(src.source), width: geo.width, height: geo.height, notes, bgColor: src.bgColor ?? null, bgSource: src.bgSource ? cut(src.bgSource) : null }
}
const exportDeps = {
  createCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c },
  Path2D: window.Path2D,
  getImage: exportImageOf,
  getAsset: loadAssetImage, // 에셋 이미지 (같은 사이트의 정적 파일 — 캔버스가 오염되지 않는다)
  lookOf: id => session.lookMap[id], // 화면(StudioPageView looks)과 같은 값
  measure: textMeasure,
  async prepareFonts(list) {
    try {
      return await loadFontsFor(list)
    } catch (e) {
      console.error('[StudioEditor] 내보내기 글꼴 준비 실패:', e)
      return false // 엔진이 "글꼴을 불러오지 못했어요" + [다시 시도]로 알린다
    }
  },
}
/** [내보내기] 창이 부른다 — 파일 하나(구간 하나 또는 한 장으로 길게) → { blob, notes } */
async function exportRender(file, { format, scale, onStep }) {
  if (!page.value) throw new Error('페이지가 없어요')
  const out = file.sectionIds.length === 1 && file.no !== null
    ? await renderSection(page.value, file.sectionIds[0], exportDeps, { scale })
    : await renderPage(page.value, file.sectionIds, exportDeps, { scale, onStep })
  try {
    return { blob: await canvasToBlob(out.canvas, format), notes: out.notes }
  } finally {
    out.canvas.width = 0 // 큰 캔버스 메모리를 바로 돌려준다
    out.canvas.height = 0
  }
}
/** 구간 id → 적용 중(완성 사진 만드는 중)인 사진 수 — 창이 먼저 묻는다 */
const exportPendingBySection = computed(() => {
  const out = {}
  for (const s of page.value?.sections || []) {
    const ids = new Set(s.items.filter(it => isValidImageItem(it) && !it.hidden).map(it => it.imageId))
    const n = [...ids].filter(id => ['queued', 'baking', 'waiting'].includes(bakeQueue.state[id]?.status)).length
    if (n) out[s.id] = n
  }
  return out
})
// ── 예시 사진이 남아 있으면 먼저 묻는다 (studioSamples) — [다운로드]·[작업 저장](→ [판매처로 보내기]는 저장 뒤에만) 전에.
// 예시 사진이 모르게 판매 페이지에 나가지 않게. [예시 사진 보기] = 첫 예시 사진을 골라 그 섹션으로, [그대로 계속] = 원래 하려던 것
const sampleAsk = ref(null) // { n, go }
function guardSamples(go) {
  const n = page.value ? sampleItemsOf(page.value).length : 0
  if (!n) { go(); return }
  sampleAsk.value = { n, go }
}
function sampleAskContinue() {
  const a = sampleAsk.value
  sampleAsk.value = null
  a?.go()
}
function sampleAskShow() {
  sampleAsk.value = null
  const first = page.value ? sampleItemsOf(page.value)[0] : null
  if (!first) return
  previewOpen.value = false // 미리보기에서 [이미지로 받기]를 눌렀던 경우 — 페이지로 돌아간다
  onPageSelect({ ids: [first.item.id] })
  nextTick(() => pageView.value?.scrollToSection(first.sectionId))
}
function openExport() {
  if (!page.value || eraseOpen.value) return
  pageView.value?.finishEdit() // 글자를 고치는 중이면 먼저 끝낸다 (고친 글자가 들어가게)
  guardSamples(() => {
    clearSelection()
    exportSaveOnly.value = false
    exportOpen.value = true
  })
}
/** 상단 [작업 저장] — 받지 않고 결과물을 만들어 내 상품에 저장만 (같은 작업을 다시 저장하면 그 카드를 바꾼다) */
function openSave() {
  if (!page.value || !page.value.sections.length || eraseOpen.value || !project.value) return
  pageView.value?.finishEdit()
  guardSamples(() => {
    clearSelection()
    exportSaveOnly.value = true
    exportOpen.value = true
  })
}
function goHomeAfterSave() {
  exportOpen.value = false
  router.push({ name: 'studio-projects' })
}
// [작업 저장] 뒤 [판매처로 보내기] — 진입은 내 작업 화면과 같은 sendToMarketplace 한 곳
const sendOpen = ref(false)
const sendPrepare = ref(null)
const sendNote = ref('')
let sendNoteTimer = null
async function sendAfterSave(exportId) {
  exportOpen.value = false
  sendNote.value = ''
  try {
    const r = await sendToMarketplace(exportId)
    sendPrepare.value = r.prepare
    sendOpen.value = true
  } catch (e) {
    console.error('[StudioEditor] 판매처로 보내기 준비 실패:', exportId, e.code, e)
    sendNote.value = e.message
    clearTimeout(sendNoteTimer)
    sendNoteTimer = setTimeout(() => { sendNote.value = '' }, 5000)
  }
}
/** 상단 [미리보기] (13-2) — 받게 될 이미지 그대로 PC·모바일로 */
function openPreview() {
  if (!page.value || !page.value.sections.length || eraseOpen.value) return
  pageView.value?.finishEdit() // 글자를 고치는 중이면 먼저 끝낸다 (고친 글자가 보이게)
  clearSelection()
  previewOpen.value = true
}
// ── 자르기·띠 잘라내기 (12-1) — 사진 데이터(edit.crop·edit.cuts)에 저장, 사진 이력. 완성 JPG에는 넣지 않는다 ──
const cropRow = computed(() => (cropImageId.value ? imagesById.value.get(cropImageId.value) ?? null : null))
/** 목록·사진 칸 표시 "잘림 · 띠 2" (정리한 값 기준, 없으면 '') */
function shapeMarkOf(imageId) {
  const row = imagesById.value.get(imageId)
  if (!row) return ''
  // 17-1: "배경 지움"도 같은 표시 줄에 (목록 줄·사진 정보 카드)
  return [shapeMark(readShape(session.shapeOf(imageId), row.width, row.height)), bgMark(session.bgOf(imageId))].filter(Boolean).join(' · ')
}

// ── 배경 지우기 (17-1) — 외부 AI는 서버만 부른다. 결과 마스크는 사진 데이터(edit.bg)에 저장, 사진 이력 ──
const bgStatus = reactive({ loading: false, loaded: false, ready: false, reason: null, message: '' })
const bgBusy = reactive({})   // image id → true (처리 중 — 같은 사진을 또 누르지 못하게)
const bgError = ref('')
let bgStatusSeq = 0
// 고른 사진 = 페이지(캔버스)에서 고른 사진 요소가 먼저, 없으면 [사진] 목록에서 고른 사진 (review-1: 규칙 그대로 + 패널 맨 위에 대상 표시)
const bgRow = computed(() => {
  const id = selectedPhotoItem.value?.imageId ?? selectedImageId.value
  const row = id ? imagesById.value.get(id) : null
  return row && row.ingest_status === 'done' ? row : null
})
/** 배경합성 패널 맨 위 "지금 대상 사진" — 어디서 골랐는지 + 어느 구간인지 ("03 상세 이미지 · 04 상세 이미지 · 790 × 1108") */
const bgTarget = computed(() => {
  const row = bgRow.value
  if (!row) return { label: '', source: 'page' }
  const it = selectedPhotoItem.value
  const p = page.value
  const sec = p ? (it ? findItem(p, it.id)?.section : p.sections.find(s => s.items.some(x => x.imageId === row.id))) : null
  const where = sec ? `${sectionLabels.value[sec.id] ?? ''} 섹션` : '페이지에 없는 사진'
  return { label: `${where} · ${imageLabel(row)}`, source: it ? 'page' : 'list' }
})
async function loadBgStatus() {
  const seq = ++bgStatusSeq
  bgStatus.loading = true
  const s = await fetchBgStatus()
  if (seq !== bgStatusSeq) return
  Object.assign(bgStatus, { loading: false, loaded: true, ready: !!s.ready, reason: s.reason ?? null, message: s.message || '' })
}
watch(activeTool, t => {
  if (t !== 'bg') return
  if (!bgStatus.loaded && !bgStatus.loading) loadBgStatus()
  if (!bgGenStatus.loading) loadBgGenStatus() // 17-4: 남은 횟수는 패널을 열 때마다 서버 값으로
})
watch(() => bgRow.value?.id, () => { bgError.value = ''; bgGenError.value = '' })
function setBgNoted(id, bg, label) {
  const before = session.histories[id]?.index
  if (session.setBg(id, bg, label) && session.histories[id]?.index !== before) noteAction({ imageId: id })
}
/**
 * [배경 지우기] 기본 동작 — 흰 배경·단색 배경을 브라우저에서 지운다 (studioBgLocal, 외부 AI·돈 없음).
 * 지우기·덮기가 적용된 사진(erasedSourceOf)으로 판정 → 마스크 PNG 저장(bg_local) → edit.bg.mask (AI 결과와 같은 모양, model 'local').
 * 단색이 아니면 아무것도 저장하지 않고 bgLocalMiss에 표시 → 패널이 [AI로 정밀하게 지우기]를 보여 준다(누를 때만 유료).
 */
const bgLocalMiss = reactive({}) // image id → true (단색 배경이 아니라서 무료로 못 지움)
async function onBgRemove() {
  const row = bgRow.value
  const pid = project.value?.id
  if (!row || !pid || bgBusy[row.id]) return
  bgBusy[row.id] = true
  bgError.value = ''
  delete bgLocalMiss[row.id]
  try {
    const src = await erasedSourceOf(row.id)
    await new Promise(r => setTimeout(r, 0)) // "배경 지우는 중…"이 먼저 그려지게 (계산은 한 번에 끝난다)
    const built = await buildLocalMaskPng(src.source, row.width, row.height)
    if (project.value?.id !== pid || !imagesById.value.has(row.id)) return // 그 사이 다른 작업·로그아웃
    if (!built.ok) {
      console.info('[StudioEditor] 단색 배경이 아니라 무료로 지우지 않음:', row.id, built.reason)
      bgLocalMiss[row.id] = true
      return
    }
    const key = await refineKey(built.mask, built.width, built.height)
    const saved = await uploadBgLocalMask({ projectId: pid, imageId: row.id, key, blob: built.blob, width: built.width, height: built.height })
    if (project.value?.id !== pid || !imagesById.value.has(row.id)) return
    setBgNoted(row.id, bgFromServer(saved), LABELS.bgRemove)
  } catch (e) {
    if (project.value?.id !== pid) return
    console.error('[StudioEditor] 배경 지우기(무료) 실패:', row.id, e)
    const msg = e.code ? e.message : '배경을 지우지 못했어요. 잠시 후 다시 시도해 주세요.'
    if (bgRow.value?.id === row.id) bgError.value = msg
    else showToast(msg)
  } finally {
    delete bgBusy[row.id]
  }
}
/**
 * [AI로 정밀하게 지우기] — 외부 AI(서버 bg_remove, 돈이 드는 곳)는 이 버튼을 누를 때만.
 * 이미 지운 결과가 있으면(무료 결과를 AI로 바꿈) 모드·단색·라이브러리·AI 배경은 그대로 두고 마스크만 바꾼다 — 다듬은 마스크는 예전 마스크 기준이라 뺀다.
 */
async function onBgRemoveAi() {
  const row = bgRow.value
  const pid = project.value?.id
  if (!row || !pid || bgBusy[row.id] || !bgStatus.ready) return
  bgBusy[row.id] = true
  bgError.value = ''
  const seq = bgStatusSeq
  try {
    const r = await requestBgRemove(pid, row.id)
    if (project.value?.id !== pid || !imagesById.value.has(row.id)) return // 그 사이 다른 작업·로그아웃
    delete bgLocalMiss[row.id]
    const next = bgFromServer(r)
    const cur = session.bgOf(row.id)
    setBgNoted(row.id, cur ? { ...withRefined(cur, null), mask: next.mask } : next, LABELS.bgRemove)
  } catch (e) {
    if (project.value?.id !== pid) return
    if (bgRow.value?.id === row.id) bgError.value = e.message
    else showToast(e.message)
    if ((e.code === 'bg_not_eligible' || e.code === 'bg_not_ready') && seq === bgStatusSeq) loadBgStatus() // 서버가 바뀐 상태를 알려 줌
  } finally {
    delete bgBusy[row.id]
  }
}
function onBgMode(mode) {
  const row = bgRow.value
  const cur = row ? session.bgOf(row.id) : null
  if (!cur || cur.mode === mode) return
  // 17-2 단색: 전에 고른 색이 있으면 그 색, 없으면 흰색 (AI 없음 — 자격 검사 없이 마스크만 있으면)
  if (mode === 'color') { setBgNoted(row.id, { ...cur, mode, color: cur.color || BG_DEFAULT_COLOR }, LABELS.bgColor); return }
  // 17-4 AI 배경: 전에 만든 그림(bg.ai)을 다시 쓴다 — 돈 안 듦 (없으면 [AI 배경 만들기]로)
  if (mode === 'ai') { if (cur.ai) setBgNoted(row.id, { ...cur, mode }, LABELS.bgAi); return }
  // 라이브러리 배경: 전에 고른 그림(bg.lib)을 다시 쓴다 (없으면 아래 [라이브러리 배경]에서 고른다)
  if (mode === 'library') { if (cur.lib) setBgNoted(row.id, { ...cur, mode }, LABELS.bgLibrary); return }
  setBgNoted(row.id, { ...cur, mode }, mode === 'transparent' ? LABELS.bgTransparent : LABELS.bgOriginal)
}
/**
 * 라이브러리 배경 — [배경합성] 패널에서 고른 에셋 이미지(연출 배경·배경)를 이 사진의 배경으로.
 * 외부 AI·서버를 부르지 않는다(무료 — AI 배경 횟수·한도를 쓰지 않음, 자격 검사 없음). 배경을 지운(마스크가 있는) 사진에만. 사진 이력 "라이브러리 배경"
 */
function onBgLibrary(entry) {
  const row = bgRow.value
  const cur = row ? session.bgOf(row.id) : null
  const lib = libFromEntry(entry)
  if (!lib) { console.error('[StudioEditor] 라이브러리 배경으로 쓸 수 없는 그림:', entry); return }
  if (!cur) { showToast('먼저 [배경 지우기]를 해 주세요'); return }
  setBgNoted(row.id, { ...cur, mode: 'library', lib }, LABELS.bgLibrary)
}
// ── AI 배경 (17-4) — 외부 AI는 서버만 부른다. 결과 그림은 사진 데이터(edit.bg.ai)에 저장, 사진 이력 "AI 배경" ──
const bgGenStatus = reactive({ loading: false, ready: false, reason: null, staff: false, left: null, perDay: 3, globalLeft: 0, message: '' })
const bgGenBusy = reactive({})  // image id → true (만드는 중 — 같은 사진을 또 누르지 못하게)
const bgGenError = ref('')
let bgGenSeq = 0
async function loadBgGenStatus() {
  const seq = ++bgGenSeq
  bgGenStatus.loading = true
  const s = await fetchBgGenStatus()
  if (seq !== bgGenSeq) return
  Object.assign(bgGenStatus, {
    loading: false, ready: !!s.ready, reason: s.reason ?? null, staff: !!s.staff, left: s.left ?? null,
    perDay: s.perDay ?? bgGenStatus.perDay, globalLeft: s.globalLeft ?? 0, message: s.message || '',
  })
}
async function onBgGenerate(preset) {
  const row = bgRow.value
  const pid = project.value?.id
  if (!row || !pid || bgGenBusy[row.id] || !bgGenStatus.ready || !session.bgOf(row.id)) return
  bgGenBusy[row.id] = true
  bgGenError.value = ''
  const seq = bgGenSeq
  try {
    const r = await requestBgGenerate(pid, row.id, preset)
    if (project.value?.id !== pid || !imagesById.value.has(row.id)) return // 그 사이 다른 작업·로그아웃
    const cur = session.bgOf(row.id)
    if (!cur) { showToast('배경 정보가 바뀌어 AI 배경을 넣지 못했어요. 다시 눌러 주세요.'); return }
    setBgNoted(row.id, { ...cur, mode: 'ai', ai: aiFromServer(r) }, LABELS.bgAi)
    if (seq === bgGenSeq && r.left !== null && r.left !== undefined) bgGenStatus.left = r.left
    showToast('AI 배경을 만들었어요 · Ctrl+Z로 되돌려도 다시 쓸 수 있어요')
  } catch (e) {
    if (project.value?.id !== pid) return
    if (bgRow.value?.id === row.id) bgGenError.value = e.message
    else showToast(e.message)
  } finally {
    delete bgGenBusy[row.id]
    if (project.value?.id === pid) loadBgGenStatus() // 남은 횟수·한도는 서버 값으로 다시
  }
}
// 이 사진이 놓인 구간의 배경색 — 페이지에서 고른 사진 요소의 구간, 목록에서 골랐으면 그 사진이 처음 놓인 구간 (없으면 null)
// [구간 배경색과 같게] 기준 (검수 2묶음, studioBg.sectionBgChoice): 사진이 놓인 구간 → 골라진 구간 → 보고 있는 구간 → 페이지 기본(흰색)
const bgSectionChoice = computed(() => {
  const row = bgRow.value
  if (!row || !page.value) return null
  const found = selectedPhotoItem.value?.imageId === row.id ? findItem(page.value, selectedPhotoItem.value.id) : null
  const photoSec = found?.section || page.value.sections.find(sec => sec.items.some(it => isValidImageItem(it) && it.imageId === row.id))
  const c = sectionBgChoice(page.value, { photoSectionId: photoSec?.id ?? null, selectedSectionId: selectedSectionId.value, inViewSectionId: inViewSectionId.value })
  const where = c.source === 'page' ? '페이지 기본 배경(흰색)' : `${sectionLabels.value[c.sectionId] ?? ''} 섹션${c.source === 'photo' ? '' : c.source === 'selected' ? ' · 골라진 섹션' : ' · 보고 있는 섹션'}`
  return { ...c, where }
})
const bgSectionColor = computed(() => bgSectionChoice.value?.color ?? null)
/** 단색 색 바꾸기 — commit false(색 고르기 칸을 끄는 중) = 화면·저장만, true = 이력 한 칸 "배경 단색" */
let bgColorDragging = false
function onBgColor(color, { commit }) {
  const row = bgRow.value
  const cur = row ? session.bgOf(row.id) : null
  const c = normalizeBgColor(color)
  if (!cur || cur.mode !== 'color' || !c) return
  if (!commit) {
    if (session.setBg(row.id, { ...cur, color: c }, null)) bgColorDragging = true
    return
  }
  if (bgColorDragging) {
    bgColorDragging = false
    session.setBg(row.id, { ...cur, color: c }, null)
    const before = session.histories[row.id]?.index
    session.recordBg(row.id, LABELS.bgColor)
    if (session.histories[row.id]?.index !== before) noteAction({ imageId: row.id })
    return
  }
  setBgNoted(row.id, { ...cur, color: c }, LABELS.bgColor)
}
function onBgReset() {
  const row = bgRow.value
  if (row && session.bgOf(row.id)) setBgNoted(row.id, null, LABELS.bgReset)
}
// ── 경계 다듬기 (17-3) — 붓으로 고친 마스크를 브라우저에서 만들어 저장 (외부 AI·돈 없음). AI 마스크(bg.mask)는 그대로 둔다 ──
const refineRow = computed(() => (refineImageId.value ? imagesById.value.get(refineImageId.value) ?? null : null))
function openRefine() {
  const row = bgRow.value
  const bg = row ? session.bgOf(row.id) : null
  if (!row || !bg || eraseOpen.value) return
  pageView.value?.finishEdit()
  refineBg.value = JSON.parse(JSON.stringify(bg))
  refineImageId.value = row.id
}
function closeRefine() {
  refineImageId.value = null
  refineBg.value = null
}
function loadRefineSource() { return erasedSourceOf(refineImageId.value) }
function loadRefineMask(path) { return loadWithResign(urlPool, path) }
/**
 * 다듬기 화면 [적용] — result null = AI 결과 그대로(다듬기 없앰), 아니면 PNG를 올린 뒤 edit.bg.refined에 넣는다.
 * 사진 이력 한 칸 "배경 다듬기" + 기존 자동 저장(edit_version 잠금). 올리기 실패는 throw → 화면이 문구를 보이고 닫지 않는다.
 */
async function saveRefine(result) {
  const id = refineImageId.value
  const pid = project.value?.id
  if (!id || !pid || !session.bgOf(id)) throw new Error('이 사진의 배경 정보를 찾지 못했어요. 창을 닫고 다시 열어 주세요.')
  let refined = null
  if (result) {
    refined = await uploadBgRefined({ projectId: pid, imageId: id, key: result.key, blob: result.blob, width: result.width, height: result.height })
    if (project.value?.id !== pid || refineImageId.value !== id) return // 그 사이 다른 작업·로그아웃 — 넣지 않는다
  }
  const cur = session.bgOf(id)
  if (!cur) throw new Error('이 사진의 배경 정보를 찾지 못했어요. 창을 닫고 다시 열어 주세요.')
  setBgNoted(id, withRefined(cur, refined), LABELS.bgRefine)
  showToast(refined ? '배경 경계를 다듬었어요 · Ctrl+Z로 되돌리기' : 'AI 결과로 되돌렸어요 · Ctrl+Z로 되돌리기')
}
/** 이 사진의 결과 크기 (자르기·띠를 적용한 뒤) — 페이지에 넣을 때 비율 */
function sizedRow(imageId) {
  const row = imagesById.value.get(imageId)
  if (!row || !Number.isInteger(row.width) || !Number.isInteger(row.height)) return row
  const geo = geometryOf(row.width, row.height, session.shapeOf(imageId))
  return geo.identity ? row : { ...row, width: geo.width, height: geo.height }
}
function openCrop(imageId) {
  const row = imagesById.value.get(imageId)
  if (!row || row.ingest_status !== 'done' || eraseOpen.value) return
  pageView.value?.finishEdit()
  cropImageId.value = imageId
}
function loadCropSource() { return erasedSourceOf(cropImageId.value) }
/**
 * [완료] — 사진 이력 1개("자르기"/"띠 잘라내기"/둘 다) + 저장(edit_version 잠금, 지우기·필터와 같은 저장기).
 * 그 뒤 "사진 1장이 폭에 꽉 찬 구간"은 새 비율로 구간·요소 높이를 맞춘다(페이지 이력 1개 "구간 높이 맞춤" — studioPage.fitSectionsToImage).
 * 그 밖의 자리는 자리 비율 그대로, 채우기(cover)로 다시 그린다
 */
function onCropDone(shape) {
  const id = cropImageId.value
  cropImageId.value = null
  const row = id ? imagesById.value.get(id) : null
  if (!row) return
  const before = readShape(session.shapeOf(id), row.width, row.height)
  const cropChanged = JSON.stringify(before.crop) !== JSON.stringify(shape.crop)
  const cutsChanged = JSON.stringify(before.cuts) !== JSON.stringify(shape.cuts)
  const label = cropChanged && cutsChanged ? LABELS.cropCuts : cutsChanged ? LABELS.cuts : LABELS.crop
  const hBefore = session.histories[id]?.index
  if (!session.setShape(id, shape, label)) return
  if (session.histories[id]?.index !== hBefore) noteAction({ imageId: id })
  const geo = geometryOf(row.width, row.height, session.shapeOf(id))
  if (page.value) applyPage(fitSectionsToImage(page.value, id, geo.width, geo.height), LABELS.cropFit)
  showToast(`${label} 적용했어요 · 이 사진을 쓰는 모든 자리에 보여요`)
}
// 개발용 비교 보기 — 개발 서버에서만 (빌드에서는 import.meta.env.DEV = false라 코드째 빠진다)
const DEV_EXPORT_COMPARE = import.meta.env.DEV
const StudioExportCompare = import.meta.env.DEV ? defineAsyncComponent(() => import('@/components/studio/StudioExportCompare.vue')) : null
function openExportCompare(sectionId) {
  if (!DEV_EXPORT_COMPARE) return
  exportOpen.value = false
  exportCompareId.value = sectionId
}
if (import.meta.env.DEV) window.__studioExportCompare = openExportCompare // 확인 스크립트용 (구간 id를 넘긴다)

function clearViews() {
  viewStore.clear()
  for (const k of Object.keys(views)) delete views[k]
}
// 장수 한도에 드는 수 — 서버 prepare와 같은 방식: done + 직접 올린 pending (1688의 가져오지 않은 pending은 세지 않음)
const usedCount = computed(() => images.value.filter(i =>
  i.ingest_status === 'done' || (i.kind === 'upload' && i.ingest_status === 'pending')).length)
const anyModalOpen = computed(() => addOpen.value || clearAllOpen.value || !!conflictId.value || leaveOpen.value || pageSession.conflict.value
  || replaceOpen.value || resetLookOpen.value || !!includeAsk.value
  || exportOpen.value || sendOpen.value || !!exportCompareId.value // 13-1: 받는 동안·보내기 창이 열린 동안 편집기 단축키가 페이지에 적용되지 않게
  || previewOpen.value // 13-2: 미리보기가 열린 동안도
  || !!cropImageId.value // 12-1: 자르기 창이 열린 동안도
  || !!refineImageId.value // 17-3: 경계 다듬기 화면이 열린 동안도 (붓 단축키 K·E·X·[·]·Ctrl+Z는 그 화면이 받는다)
  || !!templateAsk.value // 15: 템플릿 교체 확인창
  || !!sampleAsk.value // 예시 사진이 남아 있어요 확인창
  || autoBuild.state.open || autoCopyAsk.value // 원클릭: 진행 화면·복사본 확인
  || shortcutsOpen.value) // 14: 단축키 표

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
    runOneClickFromRoute() // 원클릭 1단계: 방금 만든 복사본(?oneclick=1)이면 여기서 원클릭
    startTemplateFromRoute() // 템플릿 갤러리 [이 템플릿으로 시작]으로 만든 빈 작업(?template=)이면 그 템플릿으로
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
  const id = selectedImageId.value
  const before = id ? session.histories[id]?.index : null
  session.clearAllFills()
  // 검수 2묶음: 편집기 되돌리기 순서에 넣는다 (사진 이력 한 칸 — 확인창 안내 "Ctrl+Z로 되돌릴 수 있어요")
  if (id && session.histories[id]?.index !== before) noteAction({ imageId: id })
}

function closeConflict() { conflictId.value = null }

// ── 떠나기 ──
const eraseScreen = ref(null)
async function guardLeave(to) {
  if (leaveBypass) return true
  // 원클릭이 도는 중에는 떠나지 않는다 — 사진을 다듬어 저장하는 중이라 [멈추기]로 끝낸 뒤 나가게 안내
  if (autoBuild.state.open && autoBuild.state.phase !== 'done' && !autoBuild.state.error) {
    showToast('원클릭이 만드는 중이에요. [멈추기]를 누르면 여기까지 된 것으로 페이지를 만들어요.')
    return false
  }
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
    aiBusy: (eraseOpen.value && Object.values(session.aiLayerStates.value).includes('busy'))
      || (autoBuild.state.open && autoBuild.state.phase !== 'done' && !autoBuild.state.error), // 원클릭 1단계: 도는 중

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

// ── 작업 이력 복원 (14단계) — 상단 [이력] = 이 창의 페이지 이력(usePageSession.history, 세션 동안만). 서버 이력은 없다 ──
// 누르면 그 단계의 페이지를 새 동작 "이력 복원"으로 적용 → 페이지 이력 한 칸 + 기존 page_version 조건 저장 → Ctrl+Z로 취소.
// 사진 편집 결과(studio_images.edit — 지우기·필터·자르기)는 사진 이력이라 건드리지 않는다.
const pageHistoryRows = computed(() => listHistory(pageSession.history.value).slice().reverse()) // 새 것부터
function formatClock(at) {
  const d = new Date(at)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
function restoreHistory(i) {
  if (!page.value || eraseOpen.value) return
  const doc = restorePoint(pageSession.history.value, i)
  if (!doc) return
  pageView.value?.finishEdit()
  if (!applyPage(doc, LABELS.historyRestore)) return
  pruneSelection()
  showToast('그때 페이지로 돌려놓았어요 · 되돌리기(Ctrl+Z)로 취소할 수 있어요')
}

// ── 사용가이드 (14단계) — SpotlightGuide 하나로 편집기 가이드와 지우기 화면 가이드를 띄운다 (문구 src/data/studioEditorGuide.js) ──
// "다시 보지 않기" = 브라우저 localStorage (studioGuide — 편집기·지우기 따로). 자동으로는 이 탭에서 가이드마다 한 번만(sessionStorage — 띄울 때·닫을 때 기록).
const guideAutoShown = { editor: false, erase: false }
let guideTimer = null
function guideStorage() {
  try { return window.localStorage } catch (e) { console.warn('[StudioEditor] 브라우저 저장소를 쓸 수 없어 "다시 보지 않기"를 기억하지 않음:', e.message); return null }
}
/** 가이드 열기 — 화면에 실제로 있는 대상만 넘긴다. @returns {boolean} 열었으면 true */
function guideSessionStorage() {
  try { return window.sessionStorage } catch (e) { console.warn('[StudioEditor] 탭 저장소를 쓸 수 없어 가이드를 이 화면 안에서만 기억함:', e.message); return null }
}
function openGuide(kind) {
  if (kind === 'editor' && isWide.value && activeTool.value !== 'photo') activeTool.value = 'photo' // [내 사진 올리기]를 짚으려면 [사진] 패널
  shortcutsOpen.value = false
  pageHistoryOpen.value = false
  guide.open = false
  nextTick(() => {
    const steps = visibleSteps(kind === 'erase' ? ERASE_GUIDE_STEPS : EDITOR_GUIDE_STEPS, t => !!document.querySelector(`[data-guide="${t}"]`))
    if (!steps.length) { console.error('[StudioEditor] 가이드 대상이 화면에 없어 띄우지 않음:', kind); return }
    guide.kind = kind
    guide.steps = steps
    guide.hide = readGuideHidden(guideStorage(), kind)
    guide.open = true
  })
  return true
}
function setGuideHidden(v) {
  guide.hide = !!v
  writeGuideHidden(guideStorage(), guide.kind, guide.hide)
}
/** 가이드를 닫음 (끝까지·건너뛰기·X·Esc·왼쪽 메뉴) — 이 탭에서는 그 가이드를 다시 자동으로 띄우지 않는다 (studioGuide.SESSION_ONCE) */
function onGuideFinish() {
  guide.open = false
  guideAutoShown[guide.kind] = true
  writeGuideShown(guideSessionStorage(), guide.kind)
}
// 자동 시작 판단 — 편집기: 작업·페이지가 준비되고 시작 화면(16단계)·지우기 화면·창이 없을 때 / 지우기: 지우기 화면이 열렸을 때
const guideAutoKind = computed(() => {
  if (!isWide.value || guide.open || anyModalOpen.value || shortcutsOpen.value) return null
  if (eraseOpen.value) return 'erase'
  return 'editor'
})
const guideAutoReady = computed(() => {
  const kind = guideAutoKind.value
  if (!kind) return null
  const ready = kind === 'erase' ? !!selectedImage.value : !!project.value && !loading.value && !!page.value
  const blocked = kind === 'editor' && (showStart.value || !!pageSession.readError.value)
  const shown = guideAutoShown[kind] || readGuideShown(guideSessionStorage(), kind) // 검수 2묶음: 지우기 가이드는 이 탭에서 한 번
  return shouldAutoStart({ hidden: readGuideHidden(guideStorage(), kind), shown, ready, blocked }) ? kind : null
})
watch(guideAutoReady, kind => {
  clearTimeout(guideTimer)
  if (!kind) return
  // 화면이 자리 잡은 뒤에 (지우기 화면은 편집 도구를 받는 동안 조금 늦게 그려진다)
  guideTimer = setTimeout(() => {
    if (guideAutoReady.value !== kind) return
    guideAutoShown[kind] = true
    writeGuideShown(guideSessionStorage(), kind)
    openGuide(kind)
  }, kind === 'erase' ? 900 : 600)
}, { immediate: true })
// 지우기 화면이 열리거나 닫히면 다른 쪽 가이드는 대상이 사라지므로 닫는다
watch(eraseOpen, () => { if (guide.open) guide.open = false })

// ── Ctrl+휠 확대 · 스페이스+끌기 화면 이동 (14단계, 편집기 가운데 페이지 — 계산은 studioViewNav) ──
function onCanvasWheel(e) {
  const sc = pageScroll.value
  if (!sc) return
  if (!(e.ctrlKey || e.metaKey)) {
    // 이동 막이 덮은 동안에도 휠 스크롤은 그대로
    if (e.target?.closest?.('[data-pan-layer]')) { e.preventDefault(); sc.scrollBy(e.deltaX, e.deltaY) }
    return
  }
  e.preventDefault() // 브라우저 전체 확대가 되지 않게
  const el = sc.querySelector('[data-page]')
  if (!el || !page.value || eraseOpen.value) return
  const z0 = zoom.value
  const z1 = wheelZoom(z0, e.deltaY, e.deltaMode, sc.clientHeight)
  if (z1 === null || Math.abs(z1 - z0) < 1e-4) return
  const anchor = zoomAnchor(el.getBoundingClientRect(), e.clientX, e.clientY, z0)
  const { clientX, clientY } = e
  zoomMode.value = z1
  nextTick(() => {
    const fix = scrollFix(anchor, el.getBoundingClientRect(), clientX, clientY, z1)
    sc.scrollLeft += fix.dx
    sc.scrollTop += fix.dy
  })
}
let panFrom = null
function onPanDown(e) {
  if (e.button !== 0 && e.button !== 1) return
  e.preventDefault()
  panFrom = { x: e.clientX, y: e.clientY }
  panning.value = true
  e.currentTarget.setPointerCapture?.(e.pointerId)
}
function onPanMove(e) {
  const sc = pageScroll.value
  if (!panFrom || !sc) return
  const next = panScroll({ left: sc.scrollLeft, top: sc.scrollTop }, e.clientX - panFrom.x, e.clientY - panFrom.y)
  panFrom = { x: e.clientX, y: e.clientY }
  sc.scrollLeft = next.left
  sc.scrollTop = next.top
}
function onPanUp() { panFrom = null; panning.value = false }
function onKeyUp(e) {
  if (e.code === 'Space' && spaceHeld.value) { e.preventDefault(); spaceHeld.value = false; onPanUp() }
}
function onWindowBlur() { spaceHeld.value = false; onPanUp() }

// ── 키보드: Ctrl(Cmd)+Z 되돌리기, Ctrl(Cmd)+Shift+Z·Ctrl+Y 다시 ──
// 되돌리기 대상: 지우기 화면이 열려 있으면 그 사진의 지우기 이력, 아니면 페이지 이력 (입력칸에서는 브라우저 기본 동작)
// 6-1 페이지 요소 (지우기 화면·모달·우클릭 메뉴·입력칸에서는 동작 안 함):
//   Ctrl+A 보이는 구간 전체 선택 · Ctrl+C/V/X 복사·붙여넣기·잘라내기 · Ctrl+D 복제 · Delete/Backspace 삭제 · Esc 선택 해제
//   Ctrl+G 그룹 묶기 · Ctrl+Shift+G 그룹 풀기 (9단계) · Ctrl+Alt+C / Ctrl+Alt+V 글자 스타일 복사·붙여넣기 (10-2)
//   방향키 = 페이지에서 고른 요소 1px(Shift 10px) 옮기기. 목록에서 고른 상태면 ↑/↓ = 이전·다음 사진(예전 그대로)
// 14단계: 사용가이드가 떠 있으면 편집기 키는 모두 쉰다(가이드가 Esc·←/→를 쓴다) · ? = 단축키 표 · 스페이스 누르고 있기 = 화면 이동 · Esc = [이력] 목록 닫기
function onKeyDown(e) {
  // 검수 2묶음: 시작 화면·가이드·창이 떠 있어도 입력칸 밖 Ctrl+A가 뒤 페이지 글자 전체를 고르지 않게 (편집기 동작은 아래에서 따로)
  if (blocksBrowserSelectAll(e)) e.preventDefault()
  if (guide.open) return
  if (!isWide.value || anyModalOpen.value || ctx.open || textEdit.value || cellEdit.value) return // 10-1: 글자·표 칸을 고치는 동안은 쉰다
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  if (e.key === 'Escape' && (pageHistoryOpen.value || guideMenuOpen.value)) { e.preventDefault(); pageHistoryOpen.value = false; guideMenuOpen.value = false; return }
  // ? = Shift+/ (자판에 따라 e.key가 '/'로 올 때가 있어 키 자리(Slash)+Shift도 받는다)
  if ((e.key === '?' || (e.code === 'Slash' && e.shiftKey)) && !e.ctrlKey && !e.metaKey && !e.altKey && !eraseOpen.value) { e.preventDefault(); shortcutsOpen.value = true; return }
  // defaultPrevented = [원본 비교] 버튼처럼 스페이스를 직접 쓰는 곳 (6-2) — 그쪽에 맡긴다
  if (e.code === 'Space' && !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.altKey && !eraseOpen.value && !showStart.value && page.value) {
    e.preventDefault() // 페이지가 스크롤되거나 눌린 버튼이 다시 눌리지 않게
    if (!spaceHeld.value && !pageView.value?.isBusy()) spaceHeld.value = true
    return
  }
  if (showStart.value && !eraseOpen.value) return // 16단계: 시작 화면이 가린 (저장 전) 기본 배치를 단축키로 고치지 않게
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
  startChosen.value = false // 16단계: 시작 화면·이름 칸·작업 메뉴는 작업마다 새로
  titleEdit.open = false
  titleMenuOpen.value = false
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
    // 17-1 배경 지우기 상태 — 다음 계정은 서버에 다시 묻는다
    bgStatusSeq++
    Object.assign(bgStatus, { loading: false, loaded: false, ready: false, reason: null, message: '' })
    for (const k of Object.keys(bgBusy)) delete bgBusy[k]
    for (const k of Object.keys(bgLocalMiss)) delete bgLocalMiss[k]
    bgError.value = ''
    // 17-4 AI 배경 상태
    bgGenSeq++
    Object.assign(bgGenStatus, { loading: false, ready: false, reason: null, staff: false, left: null, globalLeft: 0, message: '' })
    for (const k of Object.keys(bgGenBusy)) delete bgGenBusy[k]
    bgGenError.value = ''
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
    startChosen.value = false // 16단계
    titleEdit.open = false
    titleMenuOpen.value = false
    copyNotice.value = null
    autoBuild.dispose() // 원클릭 1단계: 도는 중이면 멈추고(다음 계정에 쓰지 않게) 화면을 닫는다
    autoBuild.close()
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
  window.addEventListener('keyup', onKeyUp)       // 14: 스페이스를 떼면 화면 이동 끝
  window.addEventListener('blur', onWindowBlur)
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
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
  clearTimeout(guideTimer)
  document.removeEventListener('visibilitychange', onVisible)
  clearInterval(viewUrlTimer)
  clearTimeout(toastTimer)
  clearTimeout(aiFallbackTimer)
  autoBuild.dispose()
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
/* 작업 이름 (16단계) — 누르면 고칠 수 있다는 것만 보이게: 마우스를 올리면 옅은 바탕 */
.st-title-btn {
  max-width: 320px; height: 24px; padding: 0 6px; margin-left: -6px; border: 0; border-radius: var(--st-radius-sm);
  background: transparent; cursor: text; text-align: left; font-size: 14px; font-weight: 800; color: var(--st-ink);
}
.st-title-btn:hover:not(:disabled) { background: var(--st-card-hover); }
.st-title-input {
  width: 320px; height: 26px; padding: 0 6px; margin-left: -6px; border-radius: var(--st-radius-sm);
  border: 1px solid var(--st-accent); background: var(--st-card); color: var(--st-ink); font-size: 14px; font-weight: 800; outline: none;
}
.st-title-more { width: 26px; height: 26px; }
.st-menu-row {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 0; background: transparent; cursor: pointer;
  text-align: left; font-size: 13px; font-weight: 700; color: var(--st-ink-2);
}
.st-menu-row:hover:not(:disabled) { background: var(--st-card-hover); color: var(--st-ink); }
.st-menu-row:disabled { opacity: .5; cursor: default; }
</style>
