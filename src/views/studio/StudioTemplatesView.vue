<template>
  <div class="px-4 sm:px-12 py-9 max-w-[1560px]" data-template-gallery>
    <h1 class="st-h-page">템플릿</h1>
    <p class="mt-2 text-[15px] st-ink-2 break-keep">마음에 드는 틀을 골라 바로 시작해요. 사진은 순서대로 자리에 들어가고, 글자는 눌러서 고칠 수 있어요.</p>

    <!-- 카테고리 칩 -->
    <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="카테고리" data-gallery-categories>
      <button
        v-for="c in CATEGORY_CHIPS" :key="c.key" type="button" role="tab" class="st-chip" :class="category === c.key ? 'is-active' : ''"
        :aria-selected="category === c.key" :data-gallery-category="c.key" @click="category = c.key"
      >{{ c.label }}</button>
    </div>

    <!-- 분위기 · 색 거르기 -->
    <div class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div class="flex flex-wrap items-center gap-1.5" data-gallery-moods>
        <span class="mr-1 text-[13px] font-bold st-muted">분위기</span>
        <button
          v-for="m in MOOD_CHIPS" :key="m.key" type="button" class="st-gal-pill" :class="mood === m.key ? 'is-active' : ''"
          :aria-pressed="mood === m.key" :data-gallery-mood="m.key" @click="mood = m.key"
        >{{ m.label }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-1.5" data-gallery-colors>
        <span class="mr-1 text-[13px] font-bold st-muted">색</span>
        <button type="button" class="st-gal-pill" :class="color === 'all' ? 'is-active' : ''" :aria-pressed="color === 'all'" data-gallery-color="all" @click="color = 'all'">전체</button>
        <button
          v-for="c in TEMPLATE_COLORS" :key="c.key" type="button" class="st-gal-pill" :class="color === c.key ? 'is-active' : ''"
          :aria-pressed="color === c.key" :title="c.label" :data-gallery-color="c.key" @click="color = c.key"
        ><span class="st-gal-dot" :style="{ background: c.swatch }" />{{ c.label }}</button>
      </div>
    </div>

    <!-- 탭 · 개수 -->
    <div class="mt-6 flex items-center gap-3">
      <div class="st-seg" role="tablist" aria-label="템플릿 목록">
        <button
          v-for="t in TABS" :key="t.key" type="button" role="tab" class="st-seg-item" :class="tab === t.key ? 'is-active' : ''"
          :aria-selected="tab === t.key" :data-template-tab="t.key" @click="tab = t.key"
        >{{ t.label }}</button>
      </div>
      <span class="text-[13px] font-bold st-ink-2 tabular-nums" data-template-count>{{ list.length }}개</span>
      <span v-if="favError" class="text-[13px] font-bold st-danger-text" role="alert">{{ favError }}</span>
    </div>

    <!-- 큰 썸네일 격자 -->
    <div v-if="list.length" class="st-gal-grid mt-5" data-template-list>
      <StudioTemplateCard
        v-for="t in list" :key="t.key" :tpl="t" large :favorite="favorites.keys.has(t.key)" :fav-ready="favorites.ready === true"
        :fav-busy="favorites.busy.has(t.key)" @open="previewKey = $event" @fav="onFav"
      />
    </div>
    <div v-else class="mt-5 st-card py-14 text-center" data-template-empty>
      <p class="st-desc break-keep">{{ tab === 'fav' && !filtered ? '하트를 누른 템플릿이 여기에 모여요.' : '조건에 맞는 템플릿이 없어요.' }}</p>
      <button v-if="filtered" type="button" class="st-btn mt-3" @click="clearFilters">거르기 풀기</button>
    </div>

    <StudioTemplatePreview
      :tpl-key="previewKey" action-label="이 템플릿으로 시작" :foot-note="FOOT"
      @close="previewKey = ''" @use="startWith"
    />
  </div>
</template>

<script setup>
// 스튜디오 [템플릿] 갤러리 — 큰 썸네일 격자, 카테고리 칩, 분위기·색 거르기, 섹션 수, 하트(내 보관함 — 계정에 저장).
// 카드를 누르면 편집기와 같은 미리보기 칸 → [이 템플릿으로 시작]: 고른 템플릿을 이 탭에 기억하고(studioTemplateStart) [새로 만들기]로.
//   새 작업은 사진이 있어야 만들어져서(1688 가져오기·내 사진 올리기), 사진을 불러와 편집기가 열리면 시작 화면에서 그 템플릿이 들어간다.
// 로그아웃 구독(CLAUDE.md 2-9): 하트 목록은 studioTemplateFavorites가 비우고, 이 화면은 열린 미리보기를 닫는다.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StudioTemplateCard from '@/components/studio/StudioTemplateCard.vue'
import StudioTemplatePreview from '@/components/studio/StudioTemplatePreview.vue'
import { TEMPLATE_CATEGORIES, TEMPLATE_MOODS, TEMPLATE_COLORS, filterTemplates } from '@/lib/studioTemplates'
import { favorites, loadFavorites, toggleFavorite } from '@/lib/studioTemplateFavorites'
import { savePendingTemplate } from '@/lib/studioTemplateStart'

const router = useRouter()
const TABS = [{ key: 'all', label: '전체 템플릿' }, { key: 'fav', label: '내 보관함' }]
const CATEGORY_CHIPS = [{ key: 'all', label: '전체' }, ...TEMPLATE_CATEGORIES]
const MOOD_CHIPS = [{ key: 'all', label: '전체' }, ...TEMPLATE_MOODS]
const FOOT = '[이 템플릿으로 시작]을 누르고 사진을 불러오면, 사진이 순서대로 자리에 들어간 페이지로 시작해요.'

const tab = ref('all')
const category = ref('all')
const mood = ref('all')
const color = ref('all')
const previewKey = ref('')
const favError = ref('')
let favErrorTimer = null

const filtered = computed(() => category.value !== 'all' || mood.value !== 'all' || color.value !== 'all')
const list = computed(() => filterTemplates({
  category: category.value, mood: mood.value, color: color.value, keys: tab.value === 'fav' ? favorites.keys : null,
}))
function clearFilters() { category.value = 'all'; mood.value = 'all'; color.value = 'all' }

async function onFav(key) {
  try {
    await toggleFavorite(key)
  } catch (e) {
    favError.value = e.message
    clearTimeout(favErrorTimer)
    favErrorTimer = setTimeout(() => { favError.value = '' }, 3000)
  }
}

function startWith(key) {
  let store = null
  try { store = window.sessionStorage } catch (e) { console.error('[StudioTemplates] 탭 저장소를 쓸 수 없음:', e.message) }
  if (!savePendingTemplate(store, key)) {
    favError.value = '잠시 후 다시 시도해 주세요.'
    return
  }
  previewKey.value = ''
  router.push({ name: 'studio-projects', hash: '#start' })
}

const onStudioAuthChanged = (e) => { if (!e.detail?.user) previewKey.value = '' }
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  loadFavorites()
})
onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  clearTimeout(favErrorTimer)
})
</script>

<style scoped>
/* 데스크톱 4~5열 · 태블릿 3 · 폰 2 */
.st-gal-grid { display: grid; gap: 28px 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 768px) { .st-gal-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1100px) { .st-gal-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 1440px) { .st-gal-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
.st-gal-pill {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 8px; cursor: pointer;
  font-size: 13px; font-weight: 700; border: 1px solid var(--st-line-strong); background: var(--st-surface); color: var(--st-ink-2); white-space: nowrap;
}
.st-gal-pill.is-active { border-color: var(--st-accent); color: var(--st-accent); background: var(--st-accent-soft); }
.st-gal-pill:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
.st-gal-dot { width: 10px; height: 10px; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .12); }
</style>
