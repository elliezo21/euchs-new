<template>
  <div class="min-h-screen bg-slate-50">

    <!-- HERO HEADER -->
    <section class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 px-4">
      <div class="max-w-5xl mx-auto text-center space-y-5">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold border border-orange-500/30">
          <i class="fas fa-book-open text-[10px]"></i> HOW-TO 사이트 이용안내
        </span>
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
          EUCHS B2B ERP 통합 이용가이드
        </h1>
        <p class="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          수령주소 설정부터 통관, 원산지, 쿠팡 로켓그로스까지 — 실무 바이어를 위한 단계별 이용안내입니다.
        </p>

        <!-- 검색창 -->
        <div class="max-w-xl mx-auto relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="가이드 검색 (예: 수령주소, FTA, 바코드)"
            class="w-full px-5 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-slate-400 text-sm outline-none focus:border-orange-400 focus:bg-white/15 transition"
          />
          <i class="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        </div>
      </div>
    </section>

    <!-- CATEGORY TAB BAR -->
    <div class="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div class="max-w-6xl xl:max-w-7xl mx-auto px-4 flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
        <button
          v-for="cat in GUIDE_CATEGORIES"
          :key="cat.key"
          type="button"
          @click="selectCategoryTab(cat.key)"
          class="shrink-0 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="activeCategory === cat.key
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="max-w-6xl xl:max-w-7xl mx-auto px-4 py-10 sm:py-12">

      <!-- 결과 헤더 -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900">
            {{ activeCategory === 'all' ? '전체 가이드' : GUIDE_CATEGORIES.find(c => c.key === activeCategory)?.label }}
          </h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 font-mono">총 {{ filteredGuides.length }}건의 가이드</p>
        </div>
        <router-link to="/community/faq" class="text-xs sm:text-sm text-blue-600 hover:underline font-bold flex items-center gap-1.5">
          <i class="fas fa-circle-question text-xs"></i> FAQ 바로가기
        </router-link>
      </div>

      <!-- 빈 상태 -->
      <div v-if="filteredGuides.length === 0" class="text-center py-24 text-slate-400 space-y-3">
        <div class="text-5xl">🔍</div>
        <p class="font-bold text-slate-600 text-base">검색 결과가 없습니다.</p>
        <p class="text-xs sm:text-sm">다른 키워드로 검색하거나 카테고리를 변경해 보세요.</p>
        <button type="button" @click="searchQuery=''; activeCategory='all'" class="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800 transition">
          전체 가이드 보기
        </button>
      </div>

      <!-- GUIDE CARD GRID (3-Column Spacious Grid) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link
          v-for="guide in filteredGuides"
          :key="guide.id"
          :to="'/support/guide/' + guide.id"
          class="group bg-white rounded-2xl border p-6 sm:p-7 flex flex-col justify-between space-y-5 transition duration-200 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer"
          :class="CATEGORY_COLOR_MAP[guide.color]?.border || 'border-slate-200'"
        >
          <!-- 카드 상단 -->
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-black font-mono px-2.5 py-0.5 rounded-full border"
                :class="[CATEGORY_COLOR_MAP[guide.color]?.bg, CATEGORY_COLOR_MAP[guide.color]?.text, CATEGORY_COLOR_MAP[guide.color]?.border]"
              >
                NO.{{ guide.no }}
              </span>
              <span
                class="text-xs font-bold px-2.5 py-0.5 rounded-full"
                :class="[CATEGORY_COLOR_MAP[guide.color]?.bg, CATEGORY_COLOR_MAP[guide.color]?.text]"
              >
                {{ guide.categoryLabel }}
              </span>
            </div>

            <!-- 메인 타이틀 -->
            <h3 class="text-base sm:text-lg lg:text-xl font-black text-slate-900 leading-snug group-hover:text-blue-600 transition tracking-tight line-clamp-2">
              {{ guide.title }}
            </h3>

            <!-- 요약 -->
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">{{ guide.summary }}</p>
          </div>

          <!-- 해시태그 & 읽기 -->
          <div class="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 items-center">
            <span
              v-for="tag in guide.tags"
              :key="tag"
              class="text-xs font-mono px-2 py-0.5 rounded-md font-medium"
              :class="[CATEGORY_COLOR_MAP[guide.color]?.bg, CATEGORY_COLOR_MAP[guide.color]?.text]"
            >
              {{ tag }}
            </span>
            <span class="ml-auto text-xs text-slate-400 group-hover:text-blue-600 font-bold flex items-center gap-1 transition">
              읽기 <i class="fas fa-arrow-right text-[10px]"></i>
            </span>
          </div>
        </router-link>
      </div>

      <!-- 하단 CTA -->
      <div class="mt-14 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p class="font-black text-base sm:text-lg">원하는 가이드를 찾지 못하셨나요?</p>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">1:1 전담 매니저에게 카카오톡으로 실시간 문의하세요.</p>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <a
            href="http://pf.kakao.com/_xmQWsK/chat"
            target="_blank"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-sm transition active:scale-95 shadow-md"
          >
            <i class="fas fa-comment-dots"></i>
            카톡 1:1 문의
          </a>
          <router-link
            to="/mall"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition active:scale-95 shadow-md"
          >
            <i class="fas fa-store"></i>
            소싱몰 바로가기
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GUIDE_CATEGORIES, GUIDE_ITEMS, CATEGORY_COLOR_MAP } from '@/data/guideData.js'

const route = useRoute()
const router = useRouter()

const searchQuery = ref('')
const activeCategory = ref('all')

const selectCategoryTab = (catKey) => {
  activeCategory.value = catKey
  if (catKey === 'all') {
    router.replace({ path: '/support/guide' }).catch(() => {})
  } else {
    router.replace({ path: '/support/guide', query: { tab: catKey } }).catch(() => {})
  }
}

// URL 쿼리 파라미터로 탭 초기화 & 감지
onMounted(() => {
  if (route.query.tab) {
    activeCategory.value = String(route.query.tab)
  }
})

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab) {
      activeCategory.value = String(newTab)
    } else {
      activeCategory.value = 'all'
    }
  },
  { immediate: true }
)

const filteredGuides = computed(() => {
  let items = GUIDE_ITEMS
  if (activeCategory.value !== 'all') {
    items = items.filter(g => g.category === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q)) ||
      g.categoryLabel.toLowerCase().includes(q)
    )
  }
  return items
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.line-clamp-3 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
</style>
