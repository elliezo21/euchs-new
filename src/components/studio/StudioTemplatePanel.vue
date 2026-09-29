<template>
  <div class="flex flex-col h-full overflow-y-auto" data-template-panel>
    <div class="px-4 pt-4 pb-4 space-y-3">
      <div v-if="!embedded" class="text-[13px] font-extrabold st-ink">템플릿</div>
      <p class="st-desc-sm break-keep">{{ hint }}</p>
      <!-- 에셋 채우기: 카테고리 고르기 (고른 카테고리의 템플릿만 그린다) -->
      <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="템플릿 카테고리" data-template-categories>
        <button
          v-for="c in TEMPLATE_CATEGORIES" :key="c.key" type="button" role="tab" class="st-tpl-chip" :class="category === c.key ? 'is-active' : ''"
          :aria-selected="category === c.key" :data-template-category="c.key" @click="category = c.key"
        >{{ c.label }}</button>
      </div>
      <div :class="embedded ? 'grid grid-cols-3 gap-3' : 'space-y-2'">
        <button
          v-for="c in cards" :key="c.key" type="button" class="st-tpl-card" :class="embedded ? 'is-tall' : ''"
          :title="c.label" :data-template-apply="c.key" :disabled="disabled" @click="$emit('apply', c.key)"
        >
          <!-- 미리보기: 템플릿을 적용했을 때의 페이지를 구간 작은 그림(StudioSectionThumb)으로 세로로 쌓는다. 사진 자리 = 준비된 사진(작은 사진이 있으면) 또는 흐린 자리표시 -->
          <span class="st-tpl-strip" :style="{ width: `${c.stripW}px`, height: `${stripH}px` }" data-template-preview>
            <span class="flex flex-col" :style="{ gap: `${c.gap}px` }">
              <StudioSectionThumb
                v-for="s in c.page.sections" :key="s.id" :section="s" :page-width="c.page.width" :views="views" :width="c.stripW"
              />
            </span>
          </span>
          <span class="min-w-0 flex-1 text-left">
            <span class="block text-[13px] font-extrabold st-ink">{{ c.label }}</span>
            <span class="block mt-1 st-desc-sm break-keep">{{ c.desc }}</span>
            <span class="block mt-1.5 text-[11px] font-bold st-ink-2">사진 자리 {{ c.slots }}개</span>
          </span>
        </button>
      </div>
      <p v-if="disabled" class="st-desc-sm break-keep">페이지가 준비되면 고를 수 있어요.</p>
    </div>
    <!-- 내 템플릿: 저장 자리(DB)는 해성 결정 뒤 — 기능이 생길 때까지 칸을 보이지 않는다 (15단계 보고서) -->
  </div>
</template>

<script setup>
// 왼쪽 [템플릿] 패널 (15단계) — 템플릿 카드(미리보기 그림 + 이름). 누르면 apply(key)만 보낸다 — 확인창·적용·저장은 편집기가 한다.
// 시작 화면(16단계)의 [템플릿으로 시작]도 이 목록을 embedded(가로 카드 3개)로 쓴다.
// 미리보기는 새 그리기 엔진 없이 미니뷰·순서 변경과 같은 StudioSectionThumb (사진은 새로 받지 않음 — 편집기의 화면용 작은 사진만).
import { computed, inject, ref } from 'vue'
import StudioSectionThumb from '@/components/studio/StudioSectionThumb.vue'
import { TEMPLATE_CATEGORIES, templatesOf, templatePreviewPage, templatePageHeight, templateSlots } from '@/lib/studioTemplates'

const props = defineProps({
  images: { type: Array, default: () => [] },  // 쓸 사진 (준비 끝 + 안 쓸 사진 아님, 목록 순서, 자른 크기) — 미리보기 자리에 넣어 본다
  views: { type: Object, default: () => ({}) }, // image id → { url } (편집기의 화면용 작은 사진)
  disabled: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },  // 시작 화면 안에서 (제목·내 템플릿 칸 없이, 카드 가로 3개)
})
defineEmits(['apply'])

const textLayout = inject('studioTextLayout')
const category = ref(TEMPLATE_CATEGORIES[0].key) // 패널을 열 때마다 '기본'부터
const stripH = computed(() => (props.embedded ? 260 : 150)) // 미리보기 그림 높이 (화면 px)
const stripMaxW = computed(() => (props.embedded ? 150 : 64))

const hint = computed(() => (props.embedded
  ? '틀을 고르면 준비된 사진이 순서대로 자리에 들어가요. 글자는 눌러서 바로 고칠 수 있어요.'
  : '누르면 지금 페이지가 이 틀로 바뀌어요. 준비된 사진이 순서대로 자리에 들어가고, 지운 사진·필터·자르기는 그대로예요.'))

const cards = computed(() => {
  textLayout.epoch.value // 글꼴을 받으면 글자 높이·줄도 다시
  return templatesOf(category.value).map(tpl => {
    const page = templatePreviewPage(tpl, props.images, textLayout.measure)
    const total = templatePageHeight(page)
    const scale = Math.min(stripMaxW.value / page.width, stripH.value / Math.max(1, total))
    return {
      key: tpl.key, label: tpl.label, desc: tpl.desc, slots: templateSlots(tpl).length, page,
      stripW: Math.max(1, Math.round(page.width * scale)), gap: page.gap * scale,
    }
  })
})
</script>

<style scoped>
.st-tpl-card {
  display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); text-align: left;
}
.st-tpl-chip {
  height: 28px; padding: 0 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2);
}
.st-tpl-chip.is-active { border-color: var(--st-accent); color: var(--st-accent); background: var(--st-accent-soft); }
.st-tpl-card.is-tall { flex-direction: column; align-items: stretch; }
.st-tpl-card:hover:not(:disabled) { border-color: var(--st-accent); }
.st-tpl-card:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
.st-tpl-card:disabled { opacity: 0.45; cursor: default; }
/* 미리보기 바탕은 밝게 (작업물 색 그대로 — 어두운 화면 위 흰 페이지처럼), 길면 아래를 자른다 */
.st-tpl-strip {
  flex-shrink: 0; display: block; overflow: hidden; border-radius: 6px; background: #f4f5f7; align-self: center;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .06);
}
</style>
