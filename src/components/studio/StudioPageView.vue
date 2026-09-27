<template>
  <div
    ref="rootEl" class="relative mx-auto" :style="{ width: `${doc.width * zoom}px`, height: `${total * zoom}px` }" data-page
    @pointerdown.self="onBlankDown" @contextmenu.self.prevent="onBlankContext"
    @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop"
  >
    <!-- 구간 이름 (페이지 왼쪽 바깥) -->
    <!-- 누르면 그 구간을 고른다 (8-1) -->
    <div
      v-for="(s, si) in doc.sections" :key="`l-${s.id}`"
      class="absolute text-right text-[11px] font-bold whitespace-nowrap cursor-pointer st-section-label"
      :class="selectedSectionIds.has(s.id) || selectedSectionId === s.id ? 'st-accent-text' : 'st-muted'"
      :style="{ right: `calc(100% + 14px)`, top: `${rowOf(s.id).top * zoom + 4}px` }"
      :data-section-label="s.id" title="이 섹션 고르기"
      @pointerdown.stop="onLabelDown($event, s.id)" @contextmenu.prevent.stop="onLabelContext($event, s.id)"
    >{{ String(si + 1).padStart(2, '0') }} {{ sectionName(s) }}<span v-if="sectionBake(s)" class="block font-semibold st-muted" data-section-bake>{{ sectionBake(s) }}</span><span v-if="flags[s.id]" class="block st-danger-text" :data-section-flag="s.id">확인 필요<span class="block font-semibold">{{ flags[s.id] }}</span></span></div>

    <!-- 흰 페이지 -->
    <div class="absolute inset-0 st-page-paper" @pointerdown.self="onBlankDown" @contextmenu.self.prevent="onBlankContext">
      <section
        v-for="s in doc.sections" :key="s.id"
        class="absolute left-0 overflow-hidden st-section" :class="[dropSectionId === s.id ? 'st-drop-target' : '', selectedSectionId === s.id ? 'st-section-picked' : '']"
        :style="{ top: `${rowOf(s.id).top * zoom}px`, width: `${doc.width * zoom}px`, height: `${s.height * zoom}px`, background: s.bg, '--st-items-top': s.items.length + 1 }"
        :data-section-id="s.id"
        @pointerdown.self="onBlankDown" @contextmenu.self.prevent="onBlankContext"
      >
        <!-- 겹침 순서 = items 배열 순서 (뒤가 앞) — 요소마다 z-index = 배열 자리 + 1 (itemStyle). 구간이 쌓임 맥락이라 선택 테두리·손잡이는 늘 위 -->
        <template v-for="(it, ii) in s.items" :key="it.id">
          <div
            v-if="isValidImageItem(it)"
            class="absolute select-none"
            :class="[it.locked ? '' : 'cursor-move', it.hidden ? 'st-item-hidden' : '']"
            :style="itemStyle(it, ii)"
            :data-item-id="it.id" :data-image-id="it.imageId" :data-hidden="it.hidden ? '1' : null"
            @pointerdown="onItemDown($event, it)"
            @contextmenu.prevent.stop="onItemContext($event, it)"
            @dblclick="onItemDblClick(it)"
          >
            <!-- 숨긴 요소: 편집 화면에서는 흐린 점선 윤곽만 (다시 찾을 수 있게) -->
            <template v-if="!it.hidden">
              <!-- 원본 비교 중: 그 사진의 원본(지우기·필터 전)을 잠깐 보여 준다 (자리·회전·뒤집기는 그대로) -->
              <img
                v-if="compare && compare.imageId === it.imageId && compare.url" :src="compare.url" alt="" draggable="false" crossorigin="anonymous"
                class="block w-full h-full pointer-events-none st-item-img" :style="flipStyle(it)" data-compare-img
              />
              <template v-else-if="viewOf(it.imageId)?.url">
                <!-- AI 배경 (17-4): 사진 아래 — 같은 크기·자르기·뒤집기, 필터 없음 (필터는 제품 사진에만) -->
                <img
                  v-if="viewOf(it.imageId).bgUrl" :src="viewOf(it.imageId).bgUrl" alt="" draggable="false"
                  class="absolute inset-0 block w-full h-full pointer-events-none st-item-img" :style="flipStyle(it)" data-bg-under
                />
                <img
                  :src="viewOf(it.imageId).url" alt="" draggable="false"
                  class="relative block w-full h-full pointer-events-none st-item-img" :style="imgStyle(it)"
                  @load="onImgLoad(it.imageId, $event)" @error="onImgError(it.imageId)"
                />
              </template>
              <!-- 사진을 준비하는 중·실패·없는 사진: 그 자리 안에만 보인다 (떠 있는 막대 아님) -->
              <div
                v-else class="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center st-placeholder st-muted"
                :class="rowOfImage(it.imageId) && viewOf(it.imageId)?.status !== 'error' ? 'st-skeleton' : ''" data-item-state
              >
                <template v-if="!rowOfImage(it.imageId)">
                  <span class="text-[12px] font-bold">이 작업에 없는 사진이에요</span>
                </template>
                <template v-else-if="viewOf(it.imageId)?.status === 'error'">
                  <span class="text-[12px] font-bold break-keep">사진을 불러오지 못했어요</span>
                  <button type="button" class="st-btn" data-item-retry @pointerdown.stop @click.stop="$emit('retry-image', it.imageId)">
                    <RefreshCw class="w-3.5 h-3.5" :stroke-width="2" /> 다시 시도
                  </button>
                </template>
                <span v-else class="text-[12px] font-bold">사진 준비 중…</span>
              </div>
            </template>
          </div>
          <!-- 글자 요소 (10-1): 줄은 wrapLines로 한 줄씩. 고치는 중이면 그 자리에 입력 칸(textarea — 한글 조합이 깨지지 않게) -->
          <div
            v-else-if="isValidTextItem(it)"
            class="absolute select-none"
            :class="[it.locked || editId === it.id ? '' : 'cursor-move', it.hidden ? 'st-item-hidden' : '']"
            :style="itemStyle(it, ii)"
            :data-item-id="it.id" data-text-item :data-hidden="it.hidden ? '1' : null"
            @pointerdown="onItemDown($event, it)"
            @contextmenu.prevent.stop="onItemContext($event, it)"
            @dblclick="onItemDblClick(it)"
          >
            <textarea
              v-if="editId === it.id" :ref="setEditEl" v-model="editText"
              class="st-text-edit" :style="editStyle(it)" rows="1" spellcheck="false" data-text-edit
              @pointerdown.stop @dblclick.stop @contextmenu.stop @input="autoSize" @keydown="onEditKey" @blur="finishEdit"
            />
            <StudioTextView v-else-if="!it.hidden" :item="it" :lines="linesOf(it)" :scale="zoom" />
          </div>
          <!-- 도형·선 (11-1): studioShape의 path를 SVG로. 더블클릭은 아무것도 안 함 -->
          <div
            v-else-if="isValidShapeItem(it) || isValidLineItem(it)"
            class="absolute select-none"
            :class="[it.locked ? '' : 'cursor-move', it.hidden ? 'st-item-hidden' : '']"
            :style="itemStyle(it, ii)"
            :data-item-id="it.id" :data-element-item="it.type" :data-hidden="it.hidden ? '1' : null"
            @pointerdown="onItemDown($event, it)"
            @contextmenu.prevent.stop="onItemContext($event, it)"
          >
            <StudioShapeView v-if="!it.hidden" :item="it" :scale="zoom" />
          </div>
          <!-- 사이즈표 (11-2): studioTable의 paint spec을 SVG로. 칸 입력: 더블클릭(골라져 있으면 한 번 누르기) = 그 칸에 입력 칸 — 왼쪽 "표 편집" 칸과 같은 데이터 -->
          <div
            v-else-if="isValidTableItem(it)"
            class="absolute select-none"
            :class="[it.locked || cellEditId === it.id ? '' : 'cursor-move', it.hidden ? 'st-item-hidden' : '', selectedSet.has(it.id) && cellEditId !== it.id ? 'st-table-pick' : '']"
            :style="itemStyle(it, ii)"
            :data-item-id="it.id" data-table-item :data-hidden="it.hidden ? '1' : null"
            @pointerdown="onItemDown($event, it)"
            @contextmenu.prevent.stop="onItemContext($event, it)"
            @dblclick="onTableDblClick($event, it)"
            @pointerenter="hoverTableId = it.id" @pointerleave="hoverTableId = hoverTableId === it.id ? null : hoverTableId"
          >
            <StudioTableView v-if="!it.hidden" :item="it" :scale="zoom" />
            <input
              v-if="cellEditId === it.id && cellRect" :ref="setCellEl" v-model="cellText" type="text" class="st-cell-edit"
              :style="cellEditStyle(it)" :maxlength="TABLE_CELL_MAX" spellcheck="false" data-cell-edit
              @pointerdown.stop @dblclick.stop @contextmenu.stop @keydown="onCellKey" @blur="commitCell(null)"
            />
          </div>
        </template>
      </section>
    </div>

    <!-- 필터의 온도·선명도 (CSS에 없어서 SVG 필터, 사진마다 하나) -->
    <svg v-if="svgFilters.length" class="absolute" width="0" height="0" aria-hidden="true" style="pointer-events: none">
      <defs>
        <filter v-for="f in svgFilters" :id="f.id" :key="f.id" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" :values="f.matrix" result="warm" />
          <feConvolveMatrix v-if="f.kernel" in="warm" order="3" :kernelMatrix="f.kernel" preserveAlpha="true" edgeMode="duplicate" />
        </filter>
      </defs>
    </svg>

    <!-- 달라붙기 안내선 (구간 좌표 → 페이지) -->
    <div
      v-for="(g, gi) in guides" :key="`g-${gi}`" class="absolute pointer-events-none st-snap-guide" :style="guideStyle(g)" data-snap-guide
    />

    <!-- 선택 테두리 (구간에 잘리지 않게 페이지 위에 그린다). 한 개면 크기·회전 손잡이, 잠겼으면 자물쇠 -->
    <div
      v-for="f in frames" :key="`f-${f.id}`"
      class="absolute pointer-events-none st-select-frame" :class="frames.length > 1 ? 'is-multi' : ''"
      :style="f.style" data-select-frame
    >
      <span v-if="f.locked" class="st-frame-lock" title="잠겨 있어요" data-frame-lock><Lock class="w-3 h-3" :stroke-width="2.5" /></span>
      <template v-if="f.handles">
        <!-- 선(11-1)은 회전 손잡이 없음 — 끝 점으로 돌린다 -->
        <template v-if="f.rotate">
          <span class="st-rotate-stem" />
          <span
            class="st-rotate-handle" title="돌리기 (Shift: 15°씩)" data-rotate-handle
            @pointerdown.stop.prevent="onRotateDown($event, f.id)"
          ><RotateCw class="w-3 h-3" :stroke-width="2.5" /></span>
        </template>
        <span
          v-for="h in f.handleList" :key="h" class="st-resize-handle" :class="`is-${h}`" :data-resize-handle="h"
          :title="h === 'start' || h === 'end' ? '끝 점 끌기 (Shift: 15°씩)' : null"
          @pointerdown.stop.prevent="onResizeDown($event, f.id, h)"
        />
      </template>
    </div>

    <!-- 표 칸 입력 안내 — 표에 마우스를 올리거나 골랐을 때 표 위에 작게 (입력 중·끄는 중에는 없음) -->
    <div v-if="tableHint" class="absolute pointer-events-none st-table-hint" :style="tableHint.style" data-table-hint>칸을 눌러 치수를 입력하세요</div>
    <!-- 표 하나를 고르면 오른쪽 끝 [+ 열] · 아래 끝 [+ 줄] (돌린 표에는 없음 — 왼쪽 "표 편집" 칸의 행·열 추가를 쓴다) -->
    <template v-if="tableAdd">
      <button
        type="button" class="absolute st-table-add" :style="tableAdd.col" :disabled="tableAdd.colFull" title="오른쪽에 열 추가" data-table-add="col"
        @pointerdown.stop.prevent @click.stop="addTablePart('addCol')"
      >+ 열</button>
      <button
        type="button" class="absolute st-table-add" :style="tableAdd.row" :disabled="tableAdd.rowFull" title="아래에 줄 추가" data-table-add="row"
        @pointerdown.stop.prevent @click.stop="addTablePart('addRow')"
      >+ 줄</button>
    </template>

    <!-- 골라진 구간의 높이 손잡이 (8-1) — 아래쪽 가장자리. 끌면 높이만 바뀌고(요소는 그대로) 놓을 때 이력 한 번 -->
    <div
      v-if="sectionHandle" class="absolute st-section-handle" :style="sectionHandle.style"
      :title="`끌어서 높이 바꾸기 · 지금 ${sectionHandle.height}px`" data-section-height-handle
      @pointerdown.stop.prevent="onSectionHeightDown($event, sectionHandle.id)"
    ><span class="st-section-handle-grip" /><span v-if="sizingSection" class="st-section-handle-size">{{ sectionHandle.height }}px</span></div>

    <!-- 섹션 사이(맨 위·맨 아래 포함)에 마우스를 올리면 가로선 + [+ 여기에 섹션 추가] — 우클릭 "위에/아래에 섹션 추가"와 같은 명령 (편집기 sectionAdd) -->
    <div
      v-for="g in gapSlots" :key="`gap-${g.at}`" class="absolute st-gap-zone" :style="g.style" :data-section-gap="g.at"
      @pointerdown.self="onBlankDown" @contextmenu.self.prevent="onBlankContext"
    >
      <span class="st-gap-line" />
      <button
        type="button" class="st-gap-add" :style="g.btnStyle" title="이 자리에 빈 섹션 추가" :data-section-gap-add="g.at"
        @pointerdown.stop @click.stop="addSectionAt(g.at)"
      ><Plus class="w-3.5 h-3.5" :stroke-width="2.5" /> 여기에 섹션 추가</button>
    </div>

    <!-- 골라진 섹션 도구줄 — 페이지 오른쪽 바깥(섹션 위쪽, 스크롤하면 섹션 안에서 따라옴). 요소를 고르면 요소 도구줄이 대신 -->
    <div
      v-if="sectionBar" class="absolute st-sec-bar" :style="sectionBar.style" role="toolbar" aria-label="고른 섹션" data-section-toolbar
      @pointerdown.stop @dblclick.stop @contextmenu.stop.prevent
    >
      <button
        v-for="b in sectionBar.buttons" :key="b.key" type="button" class="st-sec-bar-btn" :class="b.danger ? 'is-danger' : ''"
        :disabled="b.disabled" :title="b.tip" :aria-label="b.tip" :data-section-bar="b.key" @click="$emit('command', b.cmd, b.args || {})"
      >
        <component :is="SECTION_ICONS[b.key]" class="w-4 h-4" :stroke-width="2" />
        <span>{{ b.label }}</span>
      </button>
    </div>

    <!-- 빈 곳 드래그 박스 -->
    <div v-if="marquee" class="absolute pointer-events-none st-marquee" :style="marquee" data-marquee />
  </div>
</template>

<script setup>
// 가운데 긴 페이지 (4단계, 방식 C — DOM. Fabric은 지우기 화면에서만).
// 구간 = div(구간 밖은 잘림), 요소 = 절대 위치 div(사진은 화면용 작은 사진, studioViewImage). 요소 위에는 선택 테두리·손잡이만 (떠 있는 막대 없음, 결정 9).
// 6-1 공통 조작: 누르기 = 선택, Shift+누르기 = 추가·빼기, 빈 곳 끌기 = 박스 선택, 끌기 = 이동(달라붙기, Alt = 끔),
//   모서리 손잡이 = 비율 유지 크기(Shift = 자유), 변 손잡이 = 한 방향, 회전 손잡이(Shift = 15°), 우클릭 = 메뉴(편집기가 띄움).
//   조작 중에는 미리보기 문서(draft)로 그리고, 손을 뗄 때 한 번 change를 보낸다 (저장·이력 한 단계). Esc = 조작 취소.
// 페이지 계산은 전부 studioPage.js 순수 함수 (moveItems·resizeRect·setItemRect·setRotation·snapMove·itemsInBox).
// 8-1 구간: 구간 이름·요소 없는 구간의 빈 곳 누르기 = 구간 고르기(select-section), 골라진 구간은 테두리 + 아래쪽 높이 손잡이(setSectionHeight).
// 10-1 글자: 글자 요소는 wrapLines 줄로 그린다(StudioTextView). 손잡이 = 좌우(폭만 — 줄바꿈 다시) + 모서리(글자 크기·폭 함께), 위아래 없음.
//   더블클릭 = 고치기 시작(edit-text — 사진은 예전처럼 지우기 화면). 고치는 중에는 그 자리에 textarea, Esc·바깥 누르기 = 끝(text-commit).
//   그룹(배지 11-2 등) 안의 글자도 더블클릭 = 그 글자만 고치기 (누르기는 그룹 단위 그대로 — 편집기가 끝나면 그룹 전체를 다시 고른다).
// 11-2 겹침 순서: 요소 z-index = 구간 items 배열 자리 + 1, 구간 = 쌓임 맥락(isolation). 사이즈표 = StudioTableView, 손잡이 좌우·모서리(폭만).
import { ref, shallowRef, computed, watch, nextTick, inject, onMounted, onBeforeUnmount } from 'vue'
import { RefreshCw, Lock, RotateCw, Plus, ArrowUp, ArrowDown, CopyPlus, Trash2 } from 'lucide-vue-next'
import {
  layoutSections, isValidImageItem, findItem, moveItems, resizeRect, setItemRect, setRotation, snapMove, itemsInBox, itemStyleOf,
  DRAG_IMAGE_TYPE, setSectionHeight, SECTION_H_MIN, SECTION_H_MAX, groupMemberIds, expandToGroups,
  isDrawableItem, resizeTextItem, textLinesOf, setLineEnd, resizeTableItem, SECTION_MAX,
} from '@/lib/studioPage'
import { sectionBarButtons, sectionGapSlots, blankPressTarget } from '@/lib/studioCanvasUi'
import { isValidTextItem, textPaintSpec } from '@/lib/studioText'
import { cssFamilyOf } from '@/lib/studioFonts'
import StudioTextView from '@/components/studio/StudioTextView.vue'
import StudioShapeView from '@/components/studio/StudioShapeView.vue'
import StudioTableView from '@/components/studio/StudioTableView.vue'
import { isValidShapeItem, isValidLineItem } from '@/lib/studioShape'
import {
  isValidTableItem, tableCellAt, tableCellRect, nextTableCell, hasTableCell, tableFontOf, tableRows, tableCols,
  TABLE_CELL_MAX, TABLE_PAD_RATIO, TABLE_LIMITS,
} from '@/lib/studioTable'
import { lookCss, needsSvgFilter, svgFilterParams } from '@/lib/studioLook'
import { LABELS } from '@/lib/studioHistory'
import { KIND_LABEL } from '@/lib/studioProjects'
import { afterPaint } from '@/lib/studioImageCache'
import { scrollPlan } from '@/lib/studioViewNav'

const props = defineProps({
  page: { type: Object, required: true },
  zoom: { type: Number, required: true },
  imagesById: { type: Map, required: true },     // image id → studio_images 행
  views: { type: Object, required: true },       // image id → { status, url, error } (studioViewImage)
  selectedIds: { type: Array, default: () => [] }, // 고른 요소 id
  looks: { type: Object, default: () => ({}) },    // image id → 필터·조정 (6-2, studioLook) — 화면에서만 CSS로
  compare: { type: Object, default: null },        // { imageId, url } 원본 비교 중 (6-2)
  bakeState: { type: Object, default: () => ({}) }, // image id → { status } (useBakeQueue) — 구간 이름 옆에 "적용 중" (사진 위에는 올리지 않는다)
  selectedSectionId: { type: String, default: null }, // 골라진 구간 (8-1) — 테두리 + 아래쪽 높이 손잡이
  textEdit: { type: Object, default: null },           // { id, selectAll } 고치는 중인 글자 요소 (10-1)
  flags: { type: Object, default: () => ({}) },        // 구간 id → "글자 남음" (원클릭 review-1 — 구간 이름 아래 "확인 필요" 두 줄, 사진 위에는 올리지 않음)
  cellEdit: { type: Object, default: null },           // { id, r, c } 입력 중인 표 칸 (표 칸 입력)
  canvasTools: { type: Boolean, default: true },       // 캔버스 도구줄·섹션 사이 추가를 보일지 (시작 화면·지우기 화면 동안 false)
})
// select({ ids, source: 'page' }) 고른 요소 / change({ page, label }) 조작 끝(손을 뗄 때 한 번) / context({ x, y, itemId|null }) 우클릭
// open-erase(imageId) / retry-image(imageId) / visible(imageIds) / shown({ id, ok })
// drop-image({ imageId, sectionId|null, x, y }) 목록 사진을 끌어다 놓음 (6-3, x·y = 그 구간 좌표)
// select-section(sectionId) 구간 이름·요소 없는 구간의 빈 곳을 누름 (8-1). 높이 손잡이는 놓을 때 change({ page, label: 구간 높이 })
// edit-text(itemId) 글자 요소 더블클릭 = 고치기 시작 / text-commit({ id, text }) 고치기 끝 (10-1)
// 표 칸 입력: edit-cell({ id, r, c }) 입력 시작 / cell-commit({ id, r, c, text, next }) 반영하고 next 칸으로(null = 끝) / cell-cancel() Esc = 반영 없이 끝
//   table-op({ id, op }) [+ 열]·[+ 줄] (op = studioTable.editTableItem). context에 칸이면 cell: { r, c } (편집기가 "이 줄·이 열 삭제")
// 캔버스 도구줄: command(name, args) = 편집기 runCommand 이름 그대로 (요소 도구줄·[⋯] 팝오버·섹션 도구줄) /
//   add-section(at) = 섹션 사이 [+ 여기에 섹션 추가] (at = 새 섹션 번호, 0 = 맨 위)
const emit = defineEmits([
  'select', 'change', 'context', 'open-erase', 'retry-image', 'visible', 'shown', 'drop-image', 'select-section', 'edit-text', 'text-commit',
  'edit-cell', 'cell-commit', 'cell-cancel', 'table-op', 'command', 'add-section',
])

const DRAG_THRESHOLD = 3 // 화면 px — 이보다 적게 움직이면 누르기(선택)로 본다
const SNAP_PX = 6        // 화면 px — 이만큼 가까우면 달라붙는다
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const TEXT_HANDLES = ['nw', 'ne', 'e', 'se', 'sw', 'w'] // 글자: 위아래 손잡이 없음 (높이는 글자에 맞춰 자동)
const LINE_HANDLES = ['start', 'end'] // 선(11-1): 양 끝 점만 — 끌면 반대쪽 끝은 제자리(setLineEnd)

// 글자 폭 재기·글꼴 준비 (편집기가 provide — 미니뷰·순서 변경 그림과 같은 측정). epoch가 바뀌면(글꼴을 새로 받음) 줄을 다시 계산
const textLayout = inject('studioTextLayout')
function linesOf(it) {
  textLayout.epoch.value // 글꼴을 받으면 다시 그린다
  return textLinesOf(it, textLayout.measure)
}

// ── 글자 고치기 (10-1) — 상태는 여기 위에 모아 둔다 (아래 immediate watch가 쓴다) ──
const editText = ref('')
let editEl = null
let editDone = true // 이번 고치기를 이미 끝냈는지 (Esc 뒤 blur 등 두 번 끝내지 않게)
const editId = computed(() => props.textEdit?.id ?? null)
function setEditEl(el) { editEl = el }
function autoSize() {
  if (!editEl) return
  editEl.style.height = 'auto'
  editEl.style.height = `${editEl.scrollHeight}px`
}
watch(() => props.textEdit, te => {
  if (!te) { editDone = true; return }
  const f = findItem(props.page, te.id)
  if (!f || !isValidTextItem(f.item)) { editDone = true; return }
  editText.value = f.item.text
  editDone = false
  nextTick(() => {
    if (!editEl) return
    autoSize()
    editEl.focus({ preventScroll: true })
    if (te.selectAll) editEl.select()
    else editEl.setSelectionRange(editEl.value.length, editEl.value.length)
  })
}, { immediate: true })
/** 고치기 끝 — Esc·바깥 누르기(blur)·다른 요소 누르기. 한 번만 알린다 */
function finishEdit() {
  if (editDone || !props.textEdit) return
  editDone = true
  emit('text-commit', { id: props.textEdit.id, text: editText.value })
}
function onEditKey(e) {
  // Enter = 줄바꿈 (textarea 기본). Esc = 끝내기 — 한글 조합 중이면 조합 쪽에 맡긴다
  if (e.key === 'Escape' && !e.isComposing) {
    e.preventDefault()
    e.stopPropagation()
    finishEdit()
  }
}
function editStyle(it) {
  const z = props.zoom
  return {
    fontFamily: cssFamilyOf(it.fontFamily), fontWeight: it.fontWeight, fontSize: `${it.fontSize * z}px`,
    lineHeight: `${it.fontSize * it.lineHeight * z}px`, letterSpacing: `${it.letterSpacing}em`, color: it.color, textAlign: it.align,
    width: `${it.w * z}px`, minHeight: `${it.h * z}px`,
    // 10-2: 고치는 동안에도 흰 글자 등이 보이게 테두리·배경을 비슷하게 (그림자는 생략 — 끝내면 StudioTextView가 정확히 그린다)
    WebkitTextStroke: it.strokeWidth > 0 ? `${it.strokeWidth * z}px ${it.strokeColor}` : null,
    background: textPaintSpec(it).bg?.color ?? null,
  }
}
function onItemDblClick(it) {
  if (isValidImageItem(it)) emit('open-erase', it.imageId)
  else if (isValidTextItem(it)) emit('edit-text', it.id)
}

const draft = shallowRef(null)   // 조작 중 미리보기 문서
const guides = ref([])           // 달라붙기 안내선
const doc = computed(() => draft.value || props.page)
const layout = computed(() => layoutSections(doc.value))
const rowMap = computed(() => new Map(layout.value.rows.map(r => [r.id, r])))
const total = computed(() => layout.value.total)
const rowOf = id => rowMap.value.get(id) || { top: 0, height: 0 }
const rowOfImage = id => props.imagesById.get(id) || null
const viewOf = id => props.views[id] || null
const selectedSet = computed(() => new Set(props.selectedIds))

function onImgLoad(id, e) { afterPaint(e.target).then(() => emit('shown', { id, ok: true })) }
function onImgError(id) {
  console.error('[StudioPageView] 페이지 사진을 그리지 못함:', id, props.views[id]?.url)
  emit('shown', { id, ok: false })
}

/** 그 구간 사진의 적용 상태 문구 (구간 이름 아래, 페이지 바깥) */
function sectionBake(s) {
  const st = s.items.filter(isValidImageItem).map(it => props.bakeState[it.imageId]?.status).find(Boolean)
  if (st === 'queued' || st === 'baking' || st === 'waiting') return '적용 중…'
  if (st === 'failed') return '적용하지 못했어요'
  return ''
}
function sectionName(s) {
  const first = s.items.find(isValidImageItem)
  const row = first && rowOfImage(first.imageId)
  return row ? KIND_LABEL[row.kind] || '사진' : '섹션'
}

/** 요소 자리·모양. index = 구간 items 배열 자리 → z-index (겹침 순서를 DOM·브라우저 쌓기 규칙에 맡기지 않고 배열 순서로 못 박는다 — 11-2) */
function itemStyle(it, index) {
  const z = props.zoom
  const rot = it.rotation ? `rotate(${it.rotation}deg)` : null
  const out = {
    left: `${it.x * z}px`, top: `${it.y * z}px`, width: `${it.w * z}px`, height: `${it.h * z}px`, opacity: it.hidden ? null : (it.opacity ?? 1), transform: rot,
    zIndex: index + 1,
  }
  // 꾸미기(6-2 테두리·모서리·그림자)는 사진 요소에만 — 도형(11-1)의 radius 칸이 이름이 같아 사진 꾸미기로 읽히지 않게
  if (it.hidden || !isValidImageItem(it)) return out
  // 꾸미기 (6-2): 테두리(안쪽으로)·모서리·그림자 — 페이지 좌표 값에 배율을 곱한다
  const st = itemStyleOf(it)
  if (st.borderWidth) out.border = `${st.borderWidth * z}px solid ${st.borderColor}`
  if (st.radius) { out.borderRadius = `${st.radius * z}px`; out.overflow = 'hidden' }
  if (st.shadow) out.boxShadow = `0 ${(st.shadow * 0.12 * z).toFixed(1)}px ${(st.shadow * 0.4 * z).toFixed(1)}px rgba(0, 0, 0, ${(st.shadow / 100 * 0.45).toFixed(3)})`
  // 단색 배경 (17-2): 사진(투명한 자리) 아래 색 — 상자 배경이라 사진의 필터(img filter)가 안 먹는다. 테두리 안쪽만 (내보내기 drawPhoto와 같게)
  const v = viewOf(it.imageId)
  if (v?.url && v.bgColor) { out.background = v.bgColor; out.backgroundClip = 'padding-box' }
  return out
}
function flipStyle(it) {
  const sx = it.flipX ? -1 : 1, sy = it.flipY ? -1 : 1
  return sx === 1 && sy === 1 ? null : { transform: `scale(${sx}, ${sy})` }
}
const svgIdOf = imageId => `st-lk-${imageId}`
/** 사진 모습: 뒤집기 + 필터·조정 (사진 파일은 그대로, 화면에서만) */
function imgStyle(it) {
  const f = lookCss(props.looks[it.imageId], svgIdOf(it.imageId))
  const flip = flipStyle(it)
  return f ? { ...(flip || {}), filter: f } : flip
}
/** 온도·선명도가 있는 사진의 SVG 필터 (페이지에 놓인 사진만) */
const svgFilters = computed(() => {
  const out = []
  const seen = new Set()
  for (const s of doc.value.sections) for (const it of s.items) {
    if (!isValidImageItem(it) || seen.has(it.imageId)) continue
    seen.add(it.imageId)
    const look = props.looks[it.imageId]
    if (!look || !needsSvgFilter(look)) continue
    out.push({ id: svgIdOf(it.imageId), ...svgFilterParams(look) })
  }
  return out
})

const selectedSectionIds = computed(() => {
  const out = new Set()
  for (const id of props.selectedIds) { const f = findItem(doc.value, id); if (f) out.add(f.section.id) }
  return out
})
/** 고른 요소마다 테두리 (페이지 좌표, 요소처럼 돌림). 한 개이고 잠기지 않았으면 손잡이 */
const frames = computed(() => {
  const z = props.zoom
  const out = []
  for (const id of props.selectedIds) {
    const f = findItem(doc.value, id)
    if (!f || !isDrawableItem(f.item) || id === editId.value) continue // 고치는 중인 글자는 입력 칸이 테두리를 대신한다
    const it = f.item
    const top = rowOf(f.section.id).top
    out.push({
      id, locked: !!it.locked, handles: false,
      handleList: isValidTextItem(it) || isValidTableItem(it) ? TEXT_HANDLES : isValidLineItem(it) ? LINE_HANDLES : HANDLES, rotate: !isValidLineItem(it),
      style: { left: `${it.x * z}px`, top: `${(top + it.y) * z}px`, width: `${it.w * z}px`, height: `${it.h * z}px`, transform: it.rotation ? `rotate(${it.rotation}deg)` : null },
    })
  }
  if (out.length === 1 && !out[0].locked && out[0].id !== cellEditId.value) out[0].handles = true // 칸 입력 중인 표는 크기·회전 손잡이 없음
  return out
})
/** 골라진 구간의 높이 손잡이 자리 (페이지 좌표 → 화면) */
const sectionHandle = computed(() => {
  const id = props.selectedSectionId
  const s = id ? doc.value.sections.find(x => x.id === id) : null
  if (!s) return null
  const z = props.zoom
  const bottom = (rowOf(id).top + s.height) * z
  return { id, height: s.height, style: { left: `${(doc.value.width * z) / 2 - 28}px`, top: `${bottom - 6}px`, width: '56px', height: '12px' } }
})
function guideStyle(g) {
  const z = props.zoom
  const r = rowOf(g.sectionId)
  return g.axis === 'x'
    ? { left: `${g.pos * z}px`, top: `${r.top * z}px`, width: '1px', height: `${r.height * z}px` }
    : { left: '0px', top: `${(r.top + g.pos) * z}px`, width: `${doc.value.width * z}px`, height: '1px' }
}

// ── 표 칸 입력 — 글자 고치기(10-1)와 같은 방식: 편집기가 cellEdit를 쥐고, 여기서는 그 칸 자리에 입력 칸만 올린다 ──
// 반영은 cell-commit 한 번 = 이력 1개 "칸 글자"(편집기 runCommand('tableEdit') — 왼쪽 "표 편집" 칸과 같은 길이라 둘 다 바로 보인다).
// Enter = 반영 + 아래 칸 · Tab / Shift+Tab = 반영 + 오른쪽 / 왼쪽 칸 · Esc = 반영 없이 끝 · 바깥 누르기 = 반영하고 끝.
// 입력 중에는 그 표를 끌거나 크기를 바꾸지 않는다 (손잡이 숨김, 표를 누르면 다른 칸으로 옮겨 가기만).
const cellText = ref('')
let cellEl = null
let cellDone = true // 이번 칸을 이미 반영·취소했는지 (Enter 뒤 blur 등 두 번 보내지 않게)
const cellEditId = computed(() => props.cellEdit?.id ?? null)
const hoverTableId = ref(null)
function setCellEl(el) { cellEl = el }
const cellItem = computed(() => {
  const ce = props.cellEdit
  const it = ce ? findItem(props.page, ce.id)?.item : null
  return it && hasTableCell(it, ce.r, ce.c) ? it : null
})
const cellRect = computed(() => (cellItem.value ? tableCellRect(cellItem.value, props.cellEdit.r, props.cellEdit.c) : null))
watch(() => (props.cellEdit ? `${props.cellEdit.id}:${props.cellEdit.r}:${props.cellEdit.c}` : ''), key => {
  if (!key || !cellItem.value) { cellDone = true; return }
  cellText.value = cellItem.value.cells[props.cellEdit.r][props.cellEdit.c]
  cellDone = false
  nextTick(() => { if (cellEl) { cellEl.focus({ preventScroll: true }); cellEl.select() } }) // 전부 골라 둔다 — 치면 "-"가 바로 바뀐다
}, { immediate: true })
function cellEditStyle(it) {
  const z = props.zoom, r = cellRect.value
  const header = it.headerRow && props.cellEdit.r === 0
  const font = tableFontOf(it, header)
  const pad = it.fontSize * TABLE_PAD_RATIO * z
  return {
    left: `${r.x * z}px`, top: `${r.y * z}px`, width: `${r.w * z}px`, height: `${r.h * z}px`, padding: `0 ${pad}px`,
    fontFamily: cssFamilyOf(font.fontFamily), fontWeight: font.fontWeight, fontSize: `${font.fontSize * z}px`, textAlign: it.align,
    color: header ? it.headerColor : it.color, background: header ? it.headerBg : it.cellBg,
  }
}
/** 이 칸 반영 — dir = 'down' | 'next' | 'prev' (다음 칸으로) | null (끝). 한 번만 */
function commitCell(dir) {
  if (cellDone || !props.cellEdit) return
  cellDone = true
  const { id, r, c } = props.cellEdit
  const it = cellItem.value
  emit('cell-commit', { id, r, c, text: cellText.value, next: dir && it ? nextTableCell(it, r, c, dir) : null })
}
function cancelCell() {
  if (cellDone || !props.cellEdit) return
  cellDone = true
  emit('cell-cancel')
}
function onCellKey(e) {
  // 한글 조합 중 Enter·Esc는 조합을 끝내는 데 쓰인다 — 조합이 끝난 뒤 오는 키로 처리 (Tab은 칸 밖으로 나가지 않게만 막는다)
  if (e.isComposing || e.keyCode === 229) { if (e.key === 'Tab') e.preventDefault(); return }
  if (e.key === 'Enter') { e.preventDefault(); commitCell('down') }
  else if (e.key === 'Tab') { e.preventDefault(); commitCell(e.shiftKey ? 'prev' : 'next') }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelCell() }
}
/** 화면 좌표 → 그 표의 칸 (돌린 표는 요소 가운데 기준으로 되돌려 잰다) */
function cellFromEvent(e, it) {
  const el = rootEl.value?.querySelector(`[data-item-id="${it.id}"]`)
  const b = el?.getBoundingClientRect()
  if (!b) return null
  const z = props.zoom, rad = -(it.rotation || 0) * Math.PI / 180
  const vx = e.clientX - (b.left + b.width / 2), vy = e.clientY - (b.top + b.height / 2)
  const lx = (vx * Math.cos(rad) - vy * Math.sin(rad)) / z + it.w / 2
  const ly = (vx * Math.sin(rad) + vy * Math.cos(rad)) / z + it.h / 2
  return tableCellAt(it, lx, ly)
}
function startCell(e, it) {
  if (it.hidden) return false
  const cell = cellFromEvent(e, it)
  if (!cell) return false
  const ce = props.cellEdit
  if (ce && ce.id === it.id && ce.r === cell.r && ce.c === cell.c) return true // 이미 그 칸
  emit('edit-cell', { id: it.id, ...cell })
  return true
}
function onTableDblClick(e, it) { startCell(e, it) }
/** 입력 중인 칸을 반영하고 끝 (다른 요소·빈 곳·구간 이름을 누를 때 — pointerdown을 막아 blur가 안 오는 곳) */
function finishCell() { commitCell(null) }

// 안내·[+ 열]·[+ 줄] 자리 (페이지 좌표 → 화면). 돌린 표·끄는 중에는 없음
function tableBox(id) {
  const f = findItem(doc.value, id)
  if (!f || !isValidTableItem(f.item) || f.item.hidden || f.item.rotation) return null
  return { it: f.item, top: rowOf(f.section.id).top }
}
const soleTableId = computed(() => (props.selectedIds.length === 1 && isValidTableItem(findItem(props.page, props.selectedIds[0])?.item) ? props.selectedIds[0] : null))
const tableHint = computed(() => {
  if (draft.value || marquee.value) return null
  const id = soleTableId.value || hoverTableId.value
  if (!id || id === cellEditId.value) return null
  const b = tableBox(id)
  if (!b) return null
  const z = props.zoom
  return { style: { left: `${b.it.x * z}px`, top: `${(b.top + b.it.y) * z - 30}px` } }
})
const tableAdd = computed(() => {
  const id = soleTableId.value
  if (!id || draft.value) return null
  const b = tableBox(id)
  if (!b) return null
  const z = props.zoom, it = b.it
  const x = it.x * z, y = (b.top + it.y) * z, w = it.w * z, h = it.h * z
  return {
    id,
    col: { left: `${x + w + 16}px`, top: `${y + h / 2 - 14}px` },
    row: { left: `${x + w / 2 - 28}px`, top: `${y + h + 12}px` },
    colFull: tableCols(it) >= TABLE_LIMITS.cols[1], rowFull: tableRows(it) >= TABLE_LIMITS.rows[1],
  }
})
function addTablePart(kind) {
  const id = tableAdd.value?.id
  if (!id) return
  finishCell() // 입력 중이던 칸 먼저
  emit('table-op', { id, op: { kind } })
}

// ── 캔버스 도구줄·섹션 사이 추가 (studioCanvasUi) — 새 동작 없이 편집기 runCommand로 보낸다 ──
// view = 스크롤 칸에 지금 보이는 영역 (이 페이지 요소 기준 화면 px). 아래 확대 막대(약 64px) 자리는 뺀다 — 도구줄이 그 밑에 숨지 않게
const ZOOM_BAR_SPACE = 64
const view = ref({ x: 0, y: 0, w: 0, h: 0 })
let viewRaf = 0
let scrollEl = null
let viewRo = null
function measureView() {
  cancelAnimationFrame(viewRaf)
  viewRaf = requestAnimationFrame(() => {
    const root = rootEl.value
    if (!root || !scrollEl) return
    const r = root.getBoundingClientRect(), v = scrollEl.getBoundingClientRect()
    view.value = { x: v.left - r.left, y: v.top - r.top, w: scrollEl.clientWidth, h: Math.max(80, scrollEl.clientHeight - ZOOM_BAR_SPACE) }
  })
}
watch(() => [props.zoom, total.value, doc.value.width], () => nextTick(measureView))
const SECTION_ICONS = { up: ArrowUp, down: ArrowDown, duplicate: CopyPlus, delete: Trash2 }
const SECTION_BAR_H = 4 * 50 + 8 // 버튼 4개 세로 (대략 — 짧은 섹션에서도 섹션 위쪽에 붙는다)
/** 골라진 섹션(요소를 고르지 않았을 때)의 도구줄 — 페이지 오른쪽 바깥, 섹션 위쪽. 스크롤하면 섹션 안에서 따라 내려온다 */
const sectionBar = computed(() => {
  if (!props.canvasTools || props.selectedIds.length || !props.selectedSectionId || (draft.value && !sizingSection.value)) return null
  const i = doc.value.sections.findIndex(s => s.id === props.selectedSectionId)
  if (i < 0) return null
  const s = doc.value.sections[i]
  const z = props.zoom
  const secTop = rowOf(s.id).top * z, secBot = (rowOf(s.id).top + s.height) * z
  const top = Math.max(secTop, Math.min(secBot - SECTION_BAR_H, view.value.y + 8))
  return {
    style: { left: `${doc.value.width * z + 12}px`, top: `${top}px` },
    buttons: sectionBarButtons({ index: i, count: doc.value.sections.length, full: doc.value.sections.length >= SECTION_MAX }),
  }
})
/** 섹션 사이 자리 (끄는 중·박스 선택 중에는 없음). 골라진 섹션 아래쪽은 높이 손잡이와 겹치지 않게 버튼을 옆으로 */
const gapSlots = computed(() => {
  if (!props.canvasTools || draft.value || marquee.value || doc.value.sections.length >= SECTION_MAX) return []
  const z = props.zoom
  const sel = props.selectedSectionId ? doc.value.sections.findIndex(s => s.id === props.selectedSectionId) : -1
  return sectionGapSlots(layout.value).map(g => ({
    at: g.at,
    style: { left: '0px', top: `${g.y * z - 5}px`, width: `${doc.value.width * z}px`, height: '10px' },
    btnStyle: sel >= 0 && g.at === sel + 1 ? { marginLeft: '150px' } : null,
  }))
})
function addSectionAt(at) {
  finishEdit()
  finishCell()
  emit('add-section', at)
}

// ── 조작 (누르기 → 끌기 → 떼기) ──
let act = null // { kind, startX, startY, startPage, ids, id, handle, cx, cy, moved, shift, pointerId, prevIds }
const marquee = ref(null)

function pagePoint(e) {
  const r = rootEl.value.getBoundingClientRect()
  return { x: (e.clientX - r.left) / props.zoom, y: (e.clientY - r.top) / props.zoom }
}
function begin(e, a) {
  act = { ...a, startX: e.clientX, startY: e.clientY, startPage: props.page, moved: false, pointerId: e.pointerId }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('keydown', onKey, true)
}
function end() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', cancel)
  window.removeEventListener('keydown', onKey, true)
  act = null
  draft.value = null
  guides.value = []
  marquee.value = null
  sizingSection.value = false
}
function cancel() { end() }
function onKey(e) { if (e.key === 'Escape' && act) { e.preventDefault(); e.stopPropagation(); end() } }

function selectIds(ids) { emit('select', { ids, source: 'page' }) }

function onItemDown(e, it) {
  if (e.button !== 0) return
  e.stopPropagation()
  e.preventDefault() // 글자 선택·이미지 끌기 막기
  // 9단계: 그룹 요소를 누르면 그 그룹 전체 (그룹 안 하나만은 레이어 탭에서 고른다)
  const members = groupMemberIds(props.page, it.id)
  // 10-1: 글자를 고치는 중에 다른 요소를 누르면 — 고치기를 끝내고 고르기만 한다(끌기는 시작하지 않음).
  // 끝낸 글자는 편집기가 바로 반영하지만 props.page는 다음 그리기 때 바뀌므로, 여기서 옛 문서로 끌기를 시작하면 고친 글자를 덮어쓴다
  if (props.textEdit) {
    const editing = props.textEdit.id
    finishEdit()
    if (editing !== it.id) selectIds(members)
    return
  }
  // 표 칸 입력 중: 같은 표를 누르면 그 칸으로 옮겨 가기(끌기 없음), 다른 요소를 누르면 반영하고 고르기만 (글자 고치기와 같은 이유)
  if (props.cellEdit) {
    const editing = props.cellEdit.id
    finishCell()
    if (editing === it.id && !e.shiftKey && isValidTableItem(it)) startCell(e, it)
    else selectIds(members)
    return
  }
  const sel = props.selectedIds
  if (e.shiftKey) { // 추가·빼기 (끌지 않음) — 그룹 단위
    const allIn = members.every(m => sel.includes(m))
    selectIds(allIn ? sel.filter(x => !members.includes(x)) : [...new Set([...sel, ...members])])
    return
  }
  const ids = sel.includes(it.id) ? sel : members
  // 표 하나가 이미 골라져 있으면: 끌면 옮기기, 끌지 않고 떼면 그 칸 입력 (떼는 자리 onUp — cellClick)
  const cellClick = isValidTableItem(it) && sel.length === 1 && sel[0] === it.id && !it.hidden
  // 이미 골라져 있어도(목록에서 고른 사진이 페이지에도 골라져 있는 경우) 다시 알린다 — 편집기가 "페이지에서 고름"으로 바꿔야
  // 방향키가 요소 옮기기가 된다 (안 보내면 목록 기준 그대로라 ←/→는 아무 일 없고 ↑/↓는 사진 바꾸기가 됨)
  selectIds(ids)
  const movable = ids.filter(id => { const f = findItem(props.page, id); return f && !f.item.locked })
  if (movable.length) begin(e, { kind: 'move', ids: movable, cellClick: cellClick ? { it, x: e.clientX, y: e.clientY } : null })
  else if (cellClick) startCell(e, it) // 잠긴 표 — 옮기지는 못해도 칸 글자는 고칠 수 있다 (왼쪽 칸과 같게)
}
function onResizeDown(e, id, handle) {
  if (e.button !== 0) return
  begin(e, { kind: 'resize', id, handle })
}
function onRotateDown(e, id) {
  if (e.button !== 0) return
  const el = rootEl.value.querySelector(`[data-item-id="${id}"]`)
  const r = el?.getBoundingClientRect()
  if (!r) return
  begin(e, { kind: 'rotate', id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 })
}
function onBlankDown(e) {
  if (e.button !== 0) return
  if (props.textEdit) { finishEdit(); selectIds([]); return } // 10-1: 바깥 누르기 = 고치기 끝 (박스 선택은 시작하지 않음 — onItemDown과 같은 이유)
  if (props.cellEdit) { finishCell(); return } // 표 칸 입력: 바깥 누르기 = 반영하고 끝 (표는 골라진 채 — [+ 줄]·다른 칸을 바로 쓸 수 있게)
  const p = pagePoint(e)
  begin(e, { kind: 'box', x0: p.x, y0: p.y, shift: e.shiftKey, prevIds: props.selectedIds, sectionId: sectionAt(e) })
}

// ── 구간 고르기·높이 (8-1) ──
const sizingSection = ref(false) // 높이 손잡이를 끄는 중 (손잡이에 지금 높이 표시)
function onLabelDown(e, sectionId) {
  if (e.button !== 0) return
  finishEdit()
  finishCell()
  emit('select-section', sectionId)
}
function onLabelContext(e, sectionId) {
  emit('context', { x: e.clientX, y: e.clientY, itemId: null, sectionId })
}
function onSectionHeightDown(e, sectionId) {
  if (e.button !== 0) return
  const s = props.page.sections.find(x => x.id === sectionId)
  if (!s) return
  begin(e, { kind: 'sectionHeight', id: sectionId, h0: s.height })
  sizingSection.value = true
}

function onMove(e) {
  if (!act || e.pointerId !== act.pointerId) return
  const sdx = e.clientX - act.startX, sdy = e.clientY - act.startY
  if (!act.moved && Math.hypot(sdx, sdy) < DRAG_THRESHOLD) return
  act.moved = true
  const z = props.zoom
  const P = act.startPage
  if (act.kind === 'move') {
    const s = e.altKey ? { dx: sdx / z, dy: sdy / z, guides: [] } : snapMove(P, act.ids, sdx / z, sdy / z, SNAP_PX / z)
    draft.value = moveItems(P, act.ids, s.dx, s.dy)
    guides.value = s.guides
  } else if (act.kind === 'resize') {
    const f = findItem(P, act.id)
    if (!f) return
    if (isValidTextItem(f.item)) { // 10-1: 좌우 = 폭만(줄바꿈 다시), 모서리 = 글자 크기·폭 함께 (Shift 자유 크기 없음)
      draft.value = resizeTextItem(P, act.id, act.handle, sdx / z, sdy / z, textLayout.measure)
      return
    }
    if (isValidTableItem(f.item)) { // 11-2: 사이즈표 — 좌우·모서리 모두 폭만 (높이는 행 수 × 행 높이로 자동)
      draft.value = resizeTableItem(P, act.id, act.handle, sdx / z, sdy / z)
      return
    }
    if (isValidLineItem(f.item)) { // 11-1: 선 끝 점 — 누른 자리(구간 좌표)로, Shift = 15° 단위
      const p = pagePoint(e)
      draft.value = setLineEnd(P, act.id, act.handle, p.x, p.y - rowOf(f.section.id).top, { snap: e.shiftKey })
      return
    }
    const corner = act.handle.length === 2
    // 사진·그 밖: 모서리 = 비율 유지(Shift = 자유). 도형(11-1): 모서리 = 자유(Shift = 비율 유지)
    const keepRatio = corner && (isValidShapeItem(f.item) ? e.shiftKey : !e.shiftKey)
    const r = resizeRect(f.item, f.item.rotation || 0, act.handle, sdx / z, sdy / z, { keepRatio })
    draft.value = setItemRect(P, act.id, r)
  } else if (act.kind === 'rotate') {
    let deg = Math.atan2(e.clientY - act.cy, e.clientX - act.cx) * 180 / Math.PI + 90
    if (e.shiftKey) deg = Math.round(deg / 15) * 15
    draft.value = setRotation(P, [act.id], deg)
  } else if (act.kind === 'sectionHeight') {
    const h = Math.max(SECTION_H_MIN, Math.min(SECTION_H_MAX, Math.round(act.h0 + sdy / z)))
    draft.value = setSectionHeight(P, act.id, h)
  } else if (act.kind === 'box') {
    const p = pagePoint(e)
    const x = Math.min(act.x0, p.x), y = Math.min(act.y0, p.y), w = Math.abs(p.x - act.x0), h = Math.abs(p.y - act.y0)
    marquee.value = { left: `${x * z}px`, top: `${y * z}px`, width: `${w * z}px`, height: `${h * z}px` }
    act.box = { x, y, w, h }
  }
}

function onUp(e) {
  if (!act || e.pointerId !== act.pointerId) return
  const a = act
  const next = draft.value
  if (a.kind === 'box') {
    if (!a.moved) {
      // 섹션 안 빈 곳(요소가 없는 곳)을 누름 = 그 섹션 고르기 — 요소가 있는 섹션도 (studioCanvasUi.blankPressTarget). 섹션 사이 간격·페이지 밖 = 선택 해제
      const t = blankPressTarget({ shift: a.shift, sectionId: a.sectionId, sectionIds: props.page.sections.map(x => x.id) })
      if (t.kind === 'section') emit('select-section', t.sectionId)
      else if (t.kind === 'clear') selectIds([])
    } else {
      const hit = expandToGroups(props.page, itemsInBox(props.page, a.box)) // 9단계: 그룹 요소가 하나라도 걸리면 그룹 전체
      selectIds(a.shift ? [...new Set([...a.prevIds, ...hit])] : hit)
    }
  } else if (a.kind === 'move' && !a.moved && a.cellClick) {
    startCell({ clientX: a.cellClick.x, clientY: a.cellClick.y }, a.cellClick.it) // 골라진 표를 한 번 누름 = 그 칸 입력
  } else if (a.moved && next && next !== a.startPage) {
    const LABEL_OF = { move: LABELS.elMove, resize: LABELS.elResize, rotate: LABELS.elRotate, sectionHeight: LABELS.secHeight }
    const label = LABEL_OF[a.kind]
    emit('change', { page: next, label })
  }
  end()
}

// ── 우클릭 ──
function onItemContext(e, it) {
  finishCell()
  if (!props.selectedIds.includes(it.id)) selectIds(groupMemberIds(props.page, it.id)) // 9단계: 그룹이면 그룹 전체
  // 표 칸 우클릭 = 그 칸 자리도 함께 (편집기 메뉴 "이 줄 삭제"·"이 열 삭제")
  const cell = isValidTableItem(it) && !it.hidden ? cellFromEvent(e, it) : null
  emit('context', { x: e.clientX, y: e.clientY, itemId: it.id, cell })
}
function onBlankContext(e) {
  emit('context', { x: e.clientX, y: e.clientY, itemId: null, sectionId: sectionAt(e) })
}
/** 누른 자리의 구간 id (붙여넣을 곳) */
function sectionAt(e) {
  const p = pagePoint(e)
  const r = layout.value.rows.find(row => p.y >= row.top && p.y < row.top + row.height)
  return r ? r.id : null
}

// ── 목록에서 끌어다 놓기 (6-3) — 목록 줄의 dataTransfer(DRAG_IMAGE_TYPE = 사진 id). 넣기는 편집기가 한다(dropImageAt) ──
const dropSectionId = ref(null) // 끄는 동안 놓일 구간 (테두리만)
const isImageDrag = e => !!e.dataTransfer && [...(e.dataTransfer.types || [])].includes(DRAG_IMAGE_TYPE)
function onDragOver(e) {
  if (!isImageDrag(e)) return
  e.preventDefault() // 놓을 수 있다고 알린다
  e.dataTransfer.dropEffect = 'copy'
  dropSectionId.value = sectionAt(e)
}
function onDragLeave(e) {
  if (!rootEl.value?.contains(e.relatedTarget)) dropSectionId.value = null
}
function onDrop(e) {
  if (!isImageDrag(e)) return
  e.preventDefault()
  dropSectionId.value = null
  const imageId = e.dataTransfer.getData(DRAG_IMAGE_TYPE)
  if (!imageId) return
  const p = pagePoint(e)
  const sectionId = sectionAt(e)
  const top = sectionId ? rowOf(sectionId).top : 0
  emit('drop-image', { imageId, sectionId, x: p.x, y: p.y - top }) // x·y = 그 구간 좌표 (놓은 자리 = 사진 가운데)
}

/** 이 아이템이 보이게 스크롤 (사진 목록에서 골랐을 때) */
function scrollToItem(itemId) {
  scrollInPage(rootEl.value?.querySelector(`[data-item-id="${itemId}"]`), 'nearest')
}

// ── 보이는 사진 알리기 (스크롤 상자에 가려진 것은 안 보이는 것으로 친다 — IntersectionObserver 기본 root) ──
// 숨긴 요소는 사진을 그리지 않으므로 빼고 알린다 (AI 엔진 켜는 시점이 숨긴 요소를 기다리지 않게)
const rootEl = ref(null)
const shownEls = new Map() // item 요소 → { imageId, top }
let io = null
let mo = null
function reportVisible() {
  const ids = [...shownEls.entries()].filter(([el]) => !el.dataset.hidden).sort((a, b) => a[1].top - b[1].top).map(([, v]) => v.imageId)
  emit('visible', [...new Set(ids)])
}
function observeItems() {
  if (!io || !rootEl.value) return
  for (const el of shownEls.keys()) if (!el.isConnected) { shownEls.delete(el); io.unobserve(el) } // 없어진 요소
  for (const el of rootEl.value.querySelectorAll('[data-item-id][data-image-id]')) io.observe(el) // 사진 요소만 (글자에는 받을 사진이 없다)
}
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !rootEl.value) return
  io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && e.target.isConnected) shownEls.set(e.target, { imageId: e.target.dataset.imageId, top: e.boundingClientRect.top })
      else shownEls.delete(e.target)
    }
    reportVisible()
  }, { rootMargin: '300px 0px' })
  observeItems()
  mo = new MutationObserver(observeItems) // 구간·요소가 바뀌면 새 요소도 본다
  mo.observe(rootEl.value, { childList: true, subtree: true })
})
// 도구줄 자리를 잴 스크롤 칸 (편집기의 [data-page-scroll]) — 스크롤·크기가 바뀌면 보이는 영역을 다시 잰다
onMounted(() => {
  scrollEl = rootEl.value?.closest('[data-page-scroll]') || null
  if (!scrollEl) return
  scrollEl.addEventListener('scroll', measureView, { passive: true })
  if (typeof ResizeObserver !== 'undefined') { viewRo = new ResizeObserver(measureView); viewRo.observe(scrollEl) }
  measureView()
})
onBeforeUnmount(() => {
  end(); io?.disconnect(); mo?.disconnect()
  scrollEl?.removeEventListener('scroll', measureView)
  viewRo?.disconnect()
  cancelAnimationFrame(viewRaf)
})

/** 화면에 가장 많이 보이는 구간 id (전체 선택 Ctrl+A·붙여넣기 기본 자리) */
function sectionInView() {
  const secs = rootEl.value ? [...rootEl.value.querySelectorAll('[data-section-id]')] : []
  const vh = window.innerHeight
  let best = null, bestH = 0
  for (const el of secs) {
    const r = el.getBoundingClientRect()
    const h = Math.min(r.bottom, vh) - Math.max(r.top, 0)
    if (h > bestH) { bestH = h; best = el.dataset.sectionId }
  }
  return best
}
/** 이 구간이 보이게 스크롤 (구간을 추가·복제·옮긴 뒤 — 8-1 'nearest', 미니뷰에서 누름 — 8-2 'start') */
function scrollToSection(sectionId, block = 'nearest') {
  scrollInPage(rootEl.value?.querySelector(`[data-section-id="${sectionId}"]`), block)
}
/** 페이지 스크롤 칸(가장 가까운 [data-page-scroll])만 움직인다 — 바깥 칸은 그대로, 멀면 바로 (검수 2묶음, studioViewNav.scrollPlan) */
function scrollInPage(el, block) {
  const sc = rootEl.value?.closest('[data-page-scroll]')
  if (!el || !sc) return
  const r = el.getBoundingClientRect(), v = sc.getBoundingClientRect()
  const plan = scrollPlan({ elTop: r.top - v.top + sc.scrollTop, elHeight: r.height, scrollTop: sc.scrollTop, viewHeight: sc.clientHeight, block })
  if (plan) sc.scrollTo({ top: plan.top, behavior: plan.behavior })
}
defineExpose({ scrollToItem, scrollToSection, sectionInView, isBusy: () => !!act, finishEdit, finishCell })
</script>

<style scoped>
/* 페이지 바탕색은 구간 bg(문서 값)가 칠한다. 여기서는 그림자만 */
.st-page-paper { box-shadow: var(--st-shadow-page); }
/* 선택 테두리·손잡이는 섹션 사이 추가 자리(z 4)보다 위 — 섹션 끝에 붙은 요소의 아래 손잡이도 잡히게 */
.st-select-frame { box-shadow: 0 0 0 2px var(--st-accent); border-radius: 1px; z-index: 6; }
/* 섹션 사이 추가 — 평소엔 안 보이고, 마우스를 올리면 가로선 + 버튼 */
.st-gap-zone { z-index: 4; display: flex; align-items: center; justify-content: center; }
.st-gap-line { position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; background: var(--st-accent); opacity: 0; pointer-events: none; }
.st-gap-add {
  position: relative; display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border-radius: 999px; cursor: pointer;
  font-size: 12px; font-weight: 800; white-space: nowrap; border: 0; background: var(--st-accent); color: var(--st-on-accent);
  box-shadow: var(--st-shadow-float); opacity: 0; pointer-events: none; transition: opacity .12s;
}
.st-gap-zone:hover .st-gap-line, .st-gap-zone:hover .st-gap-add { opacity: 1; }
.st-gap-zone:hover .st-gap-add, .st-gap-add:focus-visible { pointer-events: auto; opacity: 1; }
/* 골라진 섹션 도구줄 (페이지 오른쪽 바깥, 세로) */
.st-sec-bar {
  z-index: 7; display: flex; flex-direction: column; gap: 2px; padding: 3px; border-radius: 10px;
  background: var(--st-bar); border: 1px solid var(--st-line-strong); box-shadow: var(--st-shadow-float);
}
.st-sec-bar-btn {
  width: 50px; height: 46px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  border: 0; border-radius: 7px; cursor: pointer; background: transparent; color: var(--st-ink-2); font-size: 11px; font-weight: 700;
}
.st-sec-bar-btn:hover:not(:disabled) { background: var(--st-card-hover); color: var(--st-ink); }
.st-sec-bar-btn.is-danger:hover:not(:disabled) { color: var(--st-danger); }
.st-sec-bar-btn:disabled { opacity: 0.35; cursor: default; }
.st-select-frame.is-multi { box-shadow: 0 0 0 1px var(--st-accent); }
.st-item-hidden { outline: 1px dashed var(--st-muted); outline-offset: -1px; background: transparent; opacity: 0.6; }
/* 표 칸 입력 — 입력 칸은 그 칸 자리·글자 모양 그대로, 테두리 색으로 "입력 중" 표시 (표 디자인은 그대로) */
.st-cell-edit {
  position: absolute; box-sizing: border-box; margin: 0; border: 0; outline: none; z-index: 2;
  box-shadow: inset 0 0 0 2px var(--st-accent), 0 0 0 2px var(--st-accent-ring); border-radius: 1px;
  line-height: 1; cursor: text;
}
.st-table-pick { cursor: cell; }
.st-table-hint {
  z-index: 3; height: 24px; padding: 0 9px; border-radius: 6px; display: flex; align-items: center; white-space: nowrap;
  font-size: 12px; font-weight: 700; background: var(--st-accent); color: var(--st-on-accent); box-shadow: var(--st-shadow-float);
}
.st-table-add {
  z-index: 6; height: 28px; padding: 0 10px; border-radius: 8px; white-space: nowrap; cursor: pointer;
  font-size: 12px; font-weight: 800; background: var(--st-card); color: var(--st-ink); border: 1px solid var(--st-accent);
  box-shadow: var(--st-shadow-float);
}
.st-table-add:hover:not(:disabled) { background: var(--st-accent); color: var(--st-on-accent); }
.st-table-add:disabled { opacity: 0.4; cursor: default; }
/* 자리 비율과 사진 비율이 다를 때(사진 바꾸기·한쪽 손잡이) 찌그러뜨리지 않고 자리에 맞춰 채운다 — 내보내기(13단계)도 같은 규칙 */
.st-item-img { object-fit: cover; }
.st-snap-guide { background: var(--st-accent); z-index: 4; }
/* 글자 고치기 입력 칸 (10-1) — 글자와 같은 모양, 배경 없음. 고치는 동안은 브라우저 줄바꿈(끝내면 wrapLines 줄로 다시 그림) */
.st-text-edit {
  position: absolute; left: 0; top: 0; display: block; margin: 0; padding: 0; border: 0; outline: none; resize: none; overflow: hidden;
  user-select: text; background: transparent; white-space: pre-wrap; overflow-wrap: anywhere; box-shadow: 0 0 0 1.5px var(--st-accent); caret-color: var(--st-accent);
}
/* 구간 = 쌓임 맥락 (11-2): 요소 z-index(배열 자리 + 1)가 구간 밖으로 새지 않는다 → 선택 테두리·손잡이·안내선(구간 바깥 형제)은 늘 요소 위 */
.st-section { isolation: isolate; }
/* 골라진 구간 (8-1) — 안쪽 테두리만. 높이 손잡이는 아래쪽 가장자리 가운데. 요소들보다 위(--st-items-top = 요소 수 + 1) */
.st-section-picked::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 2px var(--st-accent); pointer-events: none; z-index: var(--st-items-top); }
.st-section-label:hover { color: var(--st-ink-2); }
.st-section-handle { z-index: 5; cursor: ns-resize; display: flex; align-items: center; justify-content: center; }
.st-section-handle-grip { width: 40px; height: 6px; border-radius: 999px; background: var(--st-accent); box-shadow: 0 0 0 2px var(--st-card); }
.st-section-handle-size {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%); padding: 1px 6px; border-radius: 6px; white-space: nowrap;
  font-size: 11px; font-weight: 700; color: var(--st-ink); background: var(--st-card); border: 1px solid var(--st-line-strong);
}
/* 목록 사진을 끌고 있을 때 놓일 구간 (6-3) — 테두리만, 사진 위를 칠하지 않는다 */
.st-drop-target::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 2px var(--st-accent); pointer-events: none; z-index: var(--st-items-top); }
.st-marquee { border: 1px dashed var(--st-accent); background: var(--st-accent-soft); z-index: 4; }
.st-resize-handle {
  position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; pointer-events: auto;
  background: var(--st-ink); border: 1.5px solid var(--st-accent); border-radius: 2px;
}
.st-resize-handle.is-nw { left: 0; top: 0; cursor: nwse-resize; }
.st-resize-handle.is-n { left: 50%; top: 0; cursor: ns-resize; }
.st-resize-handle.is-ne { left: 100%; top: 0; cursor: nesw-resize; }
.st-resize-handle.is-e { left: 100%; top: 50%; cursor: ew-resize; }
.st-resize-handle.is-se { left: 100%; top: 100%; cursor: nwse-resize; }
.st-resize-handle.is-s { left: 50%; top: 100%; cursor: ns-resize; }
.st-resize-handle.is-sw { left: 0; top: 100%; cursor: nesw-resize; }
.st-resize-handle.is-w { left: 0; top: 50%; cursor: ew-resize; }
/* 선 끝 점 (11-1) — 둥근 손잡이 */
.st-resize-handle.is-start, .st-resize-handle.is-end { top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 999px; cursor: grab; }
.st-resize-handle.is-start { left: 0; }
.st-resize-handle.is-end { left: 100%; }
.st-rotate-stem { position: absolute; left: 50%; top: -22px; width: 1px; height: 22px; background: var(--st-accent); }
.st-rotate-handle {
  position: absolute; left: 50%; top: -34px; width: 22px; height: 22px; margin-left: -11px; pointer-events: auto; cursor: grab;
  display: flex; align-items: center; justify-content: center; border-radius: 999px;
  background: var(--st-card); color: var(--st-ink); border: 1.5px solid var(--st-accent);
}
.st-frame-lock {
  position: absolute; right: -2px; top: -22px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; background: var(--st-card); color: var(--st-ink-2); border: 1px solid var(--st-line-strong);
}
</style>
