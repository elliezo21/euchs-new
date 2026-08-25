<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-12 sm:py-16 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs sm:text-sm font-bold tracking-wide mb-3">
            <i class="fas fa-bullhorn text-blue-400"></i>
            <span>EUC COMPANY NOTICE & NEWS</span>
          </div>

          <h1 class="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            공지사항 & 주요 소식
          </h1>

          <p class="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            중국 현지 세관 통관 정책, 춘절/국경절 연휴 일정 및 EUC 서비스 업데이트 소식을 신속하게 전달해 드립니다.
          </p>

          <div class="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <router-link to="/" class="hover:text-white flex items-center gap-1">
              <i class="fas fa-home"></i> 홈
            </router-link>
            <span>&gt;</span>
            <span class="text-slate-300">고객센터</span>
            <span>&gt;</span>
            <span class="text-blue-400 font-semibold">공지사항</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      
      <!-- Category Filter Tabs & Search Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <!-- Tabs -->
        <div class="flex flex-wrap items-center gap-2">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            @click="activeCategory = cat.id"
            class="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200"
            :class="activeCategory === cat.id 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'"
          >
            {{ cat.name }} ({{ getCategoryCount(cat.id) }})
          </button>
        </div>

        <!-- Search Input & Refresh -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <div class="relative w-full sm:w-72">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="공지사항 검색어 입력..."
              class="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-gray-300 text-xs sm:text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          </div>
          <button 
            @click="fetchNotices" 
            class="p-2 rounded-xl bg-white border border-gray-200 hover:bg-slate-50 text-gray-600 hover:text-blue-600 transition"
            title="새로고침"
          >
            <i class="fas fa-sync-alt text-xs" :class="{ 'animate-spin': isLoading }"></i>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-20">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-600 mb-3"></i>
        <p class="text-xs text-gray-500">공지사항을 불러오는 중입니다...</p>
      </div>

      <!-- Notice Cards Grid (3 Columns) -->
      <div v-else-if="filteredNotices.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <div 
          v-for="item in filteredNotices" 
          :key="item.id"
          class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
        >
          <div>
            <!-- Card Image -->
            <div class="relative h-48 w-full bg-slate-100 overflow-hidden cursor-pointer" @click="openNoticeDetail(item)">
              <img 
                :src="item.thumbnail_url || item.image || defaultImage" 
                :alt="item.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div class="absolute top-3 left-3 flex items-center gap-1.5">
                <span 
                  class="px-2.5 py-1 text-[11px] font-black rounded-lg text-white shadow-sm"
                  :class="getBadgeClass(item.badge)"
                >
                  {{ item.badge }}
                </span>
                <span v-if="item.is_pinned || item.is_important || item.isImportant" class="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded flex items-center gap-1 shadow-sm animate-pulse">
                  <i class="fas fa-fire"></i> 중요
                </span>
              </div>
            </div>

            <!-- Card Content -->
            <div class="p-6 space-y-3">
              <div class="flex items-center justify-between text-xs text-gray-400">
                <span class="flex items-center gap-1">
                  <i class="far fa-calendar-alt"></i> {{ formatDate(item.date || item.created_at) }}
                </span>
                <span class="flex items-center gap-1">
                  <i class="far fa-eye"></i> {{ item.views || 0 }}
                </span>
              </div>

              <h3 
                @click="openNoticeDetail(item)"
                class="text-base font-bold text-gray-900 group-hover:text-blue-600 transition line-clamp-2 cursor-pointer leading-snug"
              >
                {{ item.title }}
              </h3>

              <p class="text-xs text-gray-600 leading-relaxed line-clamp-3">
                {{ item.summary }}
              </p>
            </div>
          </div>

          <!-- Card Footer Action -->
          <div class="px-6 pb-5 pt-2 border-t border-gray-50 flex items-center justify-between">
            <span class="text-xs text-blue-600 font-semibold group-hover:underline flex items-center gap-1 cursor-pointer" @click="openNoticeDetail(item)">
              자세히 보기 <i class="fas fa-arrow-right text-[10px]"></i>
            </span>
            <span class="text-[11px] text-gray-400">{{ item.categoryName || item.category_name }}</span>
          </div>
        </div>
      </div>

      <!-- No Result Fallback -->
      <div v-else class="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
        <p class="text-sm font-bold text-gray-700">검색 조건에 맞는 공지사항이 없습니다.</p>
        <p class="text-xs text-gray-400 mt-1">다른 검색어를 입력하시거나 카테고리를 변경해 보세요.</p>
      </div>

    </div>

    <!-- Notice Detail Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="selectedNotice" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="selectedNotice = null"
      >
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative text-gray-900">
          
          <!-- Close Button -->
          <button 
            @click="selectedNotice = null" 
            class="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 text-lg"
          >
            <i class="fas fa-times"></i>
          </button>

          <!-- Modal Header -->
          <div class="border-b border-gray-100 pb-4 space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 text-xs font-black rounded-lg text-white" :class="getBadgeClass(selectedNotice.badge)">
                {{ selectedNotice.badge }}
              </span>
              <span class="text-xs text-gray-400">
                {{ formatDate(selectedNotice.date || selectedNotice.created_at) }} · 조회수 {{ selectedNotice.views || 0 }}
              </span>
            </div>
            <h2 class="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
              {{ selectedNotice.title }}
            </h2>
          </div>

          <!-- Modal Body -->
          <div class="space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            <img 
              v-if="selectedNotice.image" 
              :src="selectedNotice.image" 
              :alt="selectedNotice.title" 
              class="w-full max-h-72 object-cover rounded-2xl border border-gray-100 mb-4"
            />
            <p>{{ selectedNotice.content }}</p>
          </div>

          <!-- Modal Footer -->
          <div class="border-t border-gray-100 pt-4 flex items-center justify-between">
            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank"
              class="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <i class="fas fa-comment"></i>
              <span>관련 사항 1:1 상담 문의</span>
            </a>

            <button 
              @click="selectedNotice = null" 
              class="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition"
            >
              목록으로 닫기
            </button>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const activeCategory = ref('all')
const searchQuery = ref('')
const selectedNotice = ref(null)
const isLoading = ref(false)
const notices = ref([])

const defaultImage = 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/main_bnr_img1.jpg'

const categories = [
  { id: 'all', name: '전체' },
  { id: 'schedule', name: '업무일정' },
  { id: 'logistics', name: '통관·물류' },
  { id: 'event', name: '이벤트' }
]

const NOTICES_STORAGE_KEY = 'euchs_admin_notices'

const DEFAULT_NOTICES = [
  {
    id: 'notice-1',
    category: 'schedule',
    category_name: '업무일정',
    badge: '긴급점검',
    is_pinned: true,
    is_important: true,
    title: 'EUCHS 차세대 B2B 수입대행 ERP 시스템 정기 데이터베이스 점검 안내',
    summary: '실시간 1688 API 주문 및 화물 트래킹 연동 안정화를 위한 서버 점검',
    thumbnail_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    content: '안녕하세요, 이유씨컴퍼니입니다.\n\n보다 안정적인 1688 실시간 상품 연동 및 화물 위치 추적 서비스를 제공하기 위해 정기 서버 및 데이터베이스 최적화 작업을 진행합니다.\n\n- 작업 일시: 2026년 8월 26일 (수) 새벽 02:00 ~ 04:00 (약 2시간)\n- 영향 범위: 작업 시간 중 일시적인 주문서 작성 지연이 발생할 수 있습니다.\n\n바이어 여러분의 너른 양해 부탁드립니다.',
    created_at: '2026-08-25T09:00:00.000Z',
    views: 320
  },
  {
    id: 'notice-2',
    category: 'event',
    category_name: '이벤트',
    badge: '모집중',
    is_pinned: false,
    is_important: false,
    title: '제43기 중국 이우(푸텐) 도매시장 사입 조사단 참가 바이어 모집',
    summary: '전담 통역 및 1:1 공장 섭외 포함 4박 5일 풀패키지 투어',
    thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    content: '중국 이우 푸텐시장 1~5구 전 구역을 전담 매니저와 함께 동행하는 43기 이우 시장조사 투어 접수가 시작되었습니다.\n\n- 일정: 2026년 9월 16일 ~ 9월 20일 (4박 5일)\n- 모집 인원: 선착순 12명 (잔여 5석)\n- 혜택: 전담 통역, 픽업, 호텔, 공장 섭외 풀패키지 지원',
    created_at: '2026-08-23T14:30:00.000Z',
    views: 890
  },
  {
    id: 'notice-3',
    category: 'logistics',
    category_name: '통관·물류',
    badge: '통관',
    is_pinned: false,
    is_important: false,
    title: '한-중 FTA 원산지증명서(C/O) 발급 및 관세 감면 실무 가이드',
    summary: '정식 수입신고 시 FTA 협정관세 0~4% 감면 적용 절차 안내',
    thumbnail_url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
    content: '중국 수입 시 한-중 FTA 협정관세를 적용받기 위한 원산지증명서(C/O) 발급 절차 및 서류 안내입니다.\n\n당사 창고에서 출고 전 발급 대행을 원스톱으로 지원해 드립니다.',
    created_at: '2026-08-20T09:15:00.000Z',
    views: 1450
  }
]

const fetchNotices = async () => {
  // 1. localStorage euchs_admin_notices 우선 로드
  try {
    const raw = localStorage.getItem(NOTICES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        notices.value = parsed
      }
    } else {
      notices.value = JSON.parse(JSON.stringify(DEFAULT_NOTICES))
    }
  } catch (e) {
    notices.value = JSON.parse(JSON.stringify(DEFAULT_NOTICES))
  }

  // 2. Supabase DB 비동기 fetch
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .neq('category', 'system_config')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        notices.value = data
        try {
          localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(data))
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Supabase fetch notices fallback:', err)
    }
  }
}

const handleNoticeUpdate = (e) => {
  if (e?.detail && Array.isArray(e.detail)) {
    notices.value = e.detail
  } else {
    fetchNotices()
  }
}

onMounted(() => {
  fetchNotices()
  window.addEventListener('euchs-notice-update', handleNoticeUpdate)
  window.addEventListener('storage', fetchNotices)
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

const getBadgeClass = (badge) => {
  switch (badge) {
    case '공지': return 'bg-red-500'
    case '안내': return 'bg-blue-600'
    case '물류': return 'bg-purple-600'
    case '이벤트': return 'bg-amber-500'
    default: return 'bg-slate-700'
  }
}

const getCategoryCount = (catId) => {
  if (catId === 'all') return notices.value.length
  return notices.value.filter(n => n.category === catId).length
}

const filteredNotices = computed(() => {
  return notices.value.filter(item => {
    const matchCategory = activeCategory.value === 'all' || item.category === activeCategory.value
    const matchQuery = !searchQuery.value || 
      (item.title && item.title.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.value.toLowerCase()))
    return matchCategory && matchQuery
  })
})

const openNoticeDetail = (item) => {
  selectedNotice.value = item
}
</script>
