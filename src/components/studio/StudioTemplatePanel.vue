<template>
  <div class="flex flex-col h-full min-h-0" data-template-panel>
    <!-- 위: 제목 · 탭 [전체 템플릿]/[내 보관함] · 개수 · 카테고리·분위기 거르기 -->
    <div class="shrink-0 px-4 pt-4 pb-3 space-y-2.5">
      <div v-if="!embedded" class="text-[13px] font-extrabold st-ink">템플릿</div>
      <div class="st-seg w-full" role="tablist" aria-label="템플릿 목록">
        <button
          v-for="t in TABS" :key="t.key" type="button" role="tab" class="st-seg-item flex-1" :class="tab === t.key ? 'is-active' : ''"
          :aria-selected="tab === t.key" :data-template-tab="t.key" @click="tab = t.key"
        >{{ t.label }}</button>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="shrink-0 text-[12px] font-bold st-ink-2 tabular-nums" data-template-count>{{ list.length }}개</span>
        <select v-model="category" class="st-tpl-select" aria-label="카테고리" data-template-filter="category">
          <option value="all">카테고리 전체</option>
          <option v-for="c in TEMPLATE_CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
        </select>
        <select v-model="mood" class="st-tpl-select" aria-label="분위기" data-template-filter="mood">
          <option value="all">분위기 전체</option>
          <option v-for="m in TEMPLATE_MOODS" :key="m.key" :value="m.key">{{ m.label }}</option>
        </select>
        <select v-model="sort" class="st-tpl-select" aria-label="정렬" data-template-filter="sort">
          <option v-for="s in TEMPLATE_SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
      </div>
      <p v-if="favError" class="text-[12px] font-bold st-danger-text" role="alert">{{ favError }}</p>
    </div>

    <!-- 카드 격자 (패널 2줄 · 시작 화면 4줄). 누르면 가운데 미리보기 칸 -->
    <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4" data-template-list>
      <div v-if="list.length" class="grid gap-x-3 gap-y-4" :class="embedded ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2'">
        <StudioTemplateCard
          v-for="t in list" :key="t.key" :tpl="t" :favorite="favorites.keys.has(t.key)" :fav-ready="favorites.ready === true"
          :fav-busy="favorites.busy.has(t.key)" @open="previewKey = $event" @fav="onFav"
        />
      </div>
      <div v-else class="py-10 text-center" data-template-empty>
        <p class="st-desc break-keep">{{ tab === 'fav' && !filtered ? '하트를 누른 템플릿이 여기에 모여요.' : '조건에 맞는 템플릿이 없어요.' }}</p>
        <button v-if="filtered" type="button" class="st-btn mt-3" @click="clearFilters">필터 초기화</button>
      </div>
    </div>

    <StudioTemplatePreview
      :tpl-key="previewKey" action-label="이 템플릿 쓰기" :disabled="disabled"
      :disabled-note="disabled ? '페이지가 준비되면 고를 수 있어요.' : ''" :foot-note="FOOT"
      @close="previewKey = ''" @use="use"
    />
  </div>
</template>

<script setup>
// 왼쪽 [템플릿] 패널 (15단계 → 템플릿 고르기 개편) — 탭 [전체 템플릿]/[내 보관함], 개수, 카테고리·분위기 거르기, 카드 2줄 격자.
// 카드를 누르면 가운데 미리보기 칸(StudioTemplatePreview) → [이 템플릿 쓰기]를 눌러야 apply(key) — 확인창·적용·저장·되돌리기는 편집기가 한다(askTemplate 그대로).
// 시작 화면(16단계)의 [템플릿으로 시작]도 이 목록을 embedded로 쓴다.
// 카드 표지 = 기본 템플릿은 미리 만든 그림(studioTemplateCovers), 미리보기 그림 = studioTemplateThumbs. 하트 = studioTemplateFavorites(계정에 저장).
// 정렬 = studioTemplateSort (추천순 기본 / 최신순).
import { computed, onMounted, ref } from 'vue'
import StudioTemplateCard from '@/components/studio/StudioTemplateCard.vue'
import StudioTemplatePreview from '@/components/studio/StudioTemplatePreview.vue'
import { TEMPLATE_CATEGORIES, TEMPLATE_MOODS, filterTemplates } from '@/lib/studioTemplates'
import { favorites, loadFavorites, toggleFavorite } from '@/lib/studioTemplateFavorites'
import { TEMPLATE_SORTS, DEFAULT_TEMPLATE_SORT, sortTemplates } from '@/lib/studioTemplateSort'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },  // 시작 화면 안에서 (제목 없이, 카드 4줄)
})
const emit = defineEmits(['apply'])

const TABS = [{ key: 'all', label: '전체 템플릿' }, { key: 'fav', label: '내 보관함' }]
const FOOT = '준비된 사진이 순서대로 자리에 들어가요. 지운 사진·필터·자르기는 그대로예요.'

const tab = ref('all')
const category = ref('all')
const mood = ref('all')
const sort = ref(DEFAULT_TEMPLATE_SORT) // 추천순(기본) / 최신순 — 거르기와 따로
const previewKey = ref('')
const favError = ref('')
let favErrorTimer = null

const filtered = computed(() => category.value !== 'all' || mood.value !== 'all')
const list = computed(() => sortTemplates(filterTemplates({
  category: category.value, mood: mood.value, keys: tab.value === 'fav' ? favorites.keys : null,
}), sort.value))

function clearFilters() { category.value = 'all'; mood.value = 'all' }

async function onFav(key) {
  try {
    await toggleFavorite(key)
  } catch (e) {
    favError.value = e.message
    clearTimeout(favErrorTimer)
    favErrorTimer = setTimeout(() => { favError.value = '' }, 3000)
  }
}

function use(key) {
  if (props.disabled) return
  previewKey.value = ''
  emit('apply', key)
}

onMounted(() => { loadFavorites() })
</script>

<style scoped>
.st-tpl-select {
  flex: 1 1 0; min-width: 0; height: 30px; padding: 0 6px; border-radius: 8px; font-size: 12px; font-weight: 700;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink-2); cursor: pointer;
}
.st-tpl-select:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 1px; }
</style>
