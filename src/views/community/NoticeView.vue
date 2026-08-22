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

// 기본 폴백 데이터 (DB가 비어있거나 초기화 전일 때 표시)
const fallbackNotices = [
  {
    id: 1,
    category: 'schedule',
    category_name: '업무일정',
    badge: '공지',
    is_important: true,
    title: '2026년 중국 춘절/국경절 연휴에 따른 물류 및 통관 일정 안내',
    created_at: '2026-08-15',
    views: 1420,
    image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/main_bnr_img1.jpg',
    summary: '중국 최대 명절인 춘절 및 국경절 연휴 기간 동안 중국 현지 지사 및 이우/광저우 물류센터 운영 일정과 선적 마감일을 공지해 드립니다.',
    content: `안녕하세요, 이유씨컴퍼니(EUC)입니다.

2026년 중국 주요 명절 연휴에 따른 한-중 물류센터 및 세관 통관 일정을 안내해 드립니다.

1. 중국 이우 물류센터 휴무 일정
- 연휴 기간 동안 현지 택배사 및 공장 가동이 순차적으로 중단됩니다.
- 연휴 시작 전 안전한 출고를 위해 마감일 최소 3일 전까지 주문서를 접수해 주시기 바랍니다.

2. 항공/해운 특송 선적 마감
- 1차 해운 마감: 연휴 시작 5일 전 18:00
- 항공 특송 마감: 연휴 시작 3일 전 14:00

3. 한국 고객센터 정상 운영
- 연휴 기간 중에도 카카오톡 1:1 상담 및 온라인 견적 문의는 정상 접수됩니다.

대표님들의 원활한 재고 관리를 위해 사전 일정 확인을 부탁드립니다.`
  },
  {
    id: 2,
    category: 'logistics',
    category_name: '통관·물류',
    badge: '안내',
    is_important: false,
    title: '1688 / 타오바오 구매대행 수수료 개편 및 빠른 당일 결제 서비스 도입',
    created_at: '2026-08-10',
    views: 980,
    image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/m_bnr_img3.jpg',
    summary: '셀러님들의 사입 마진을 극대화하기 위해 구매대행 수수료 체계를 개편하고, 알리페이 실시간 결제 승인 시스템을 도입했습니다.',
    content: `안녕하세요, 이유씨컴퍼니입니다.

이유씨컴퍼니를 이용해 주시는 고객님들께 더 큰 혜택을 드리고자 구매대행 시스템을 대폭 개편하였습니다.

■ 주요 변경 사항
1. 구매대행 기본 수수료: 업계 최저 수준 5% 적용 (대량 사입 시 추가 할인)
2. 당일 실시간 결제: 결제 요청 접수 후 30분 이내 중국 판매자에게 다이렉트 알리페이 송금
3. 현지 창고 무료 보관 기간: 기존 15일에서 최대 30일로 연장

보다 빠르고 안전한 사입 파트너가 되겠습니다. 감사합니다.`
  },
  {
    id: 3,
    category: 'logistics',
    category_name: '통관·물류',
    badge: '물류',
    is_important: true,
    title: '해운/항공 특송 검품 절차 및 쿠팡 로켓그로스 입고 가이드 업데이트',
    created_at: '2026-08-01',
    views: 1890,
    image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/coupangbn2.png',
    summary: '쿠팡 로켓그로스 최신 파레트 적재 규격 및 바코드 검수 기준을 반영한 현지 가공 프로세스가 업데이트되었습니다.',
    content: `안녕하세요, EUC 물류 운영팀입니다.

쿠팡 물류센터(CFS/FC)의 입고 검수 기준이 강화됨에 따라, 현지 가공 단계에서 적용되는 업데이트 규정을 안내드립니다.

1. 바코드 인쇄 해상도 300DPI 이상 및 반사 방지 라벨지 기본 적용
2. 파레트 적재 시 스트레치 필름 5회 이상 랩핑 및 코너 프로텍터 적용
3. 혼적 박스의 경우 쿠팡 전용 혼적 라벨(Mixed SKU) 부착 의무화

EUC를 통해 입고 대행을 진행하시면 모든 규격 오차 없이 반송 걱정 없이 안전하게 입고됩니다.`
  },
  {
    id: 4,
    category: 'event',
    category_name: '이벤트',
    badge: '이벤트',
    is_important: false,
    title: '이우 푸텐시장 가이드 투어 신청 시 공항 픽업 할인 프로모션',
    created_at: '2026-07-25',
    views: 2150,
    image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/main_bnr_img2.jpg',
    summary: '중국 최대의 소상품 도매시장 이우 푸텐시장 투어를 신청하시는 고객님께 항저우/상하이 공항 픽업 할인 혜택을 드립니다.',
    content: `안녕하세요, 이유씨컴퍼니 투어 사업부입니다.

중국 비즈니스 출장을 준비하시는 셀러 및 무역 대표님들을 위해 특별 할인 프로모션을 진행합니다.

■ 프로모션 내용
- 대상: 이우 푸텐시장 2일 이상 가이드 투어 신청 고객
- 혜택: 항저우 소산 공항 픽업 20% 할인 + 현지 1688 사전 시장조사 데이터 무료 제공
- 기간: 상시 진행 (매월 선착순 20팀 한정)

지금 바로 [이우 시장투어 신청] 메뉴에서 견적을 확인하고 신청해 보세요!`
  }
]

const fetchNotices = async () => {
  isLoading.value = true
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .neq('category', 'system_config')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        notices.value = data
        return
      }
    }
    // Supabase 미설정 또는 빈 테이블일 때 기본 데이터 유지
    notices.value = fallbackNotices
  } catch (err) {
    console.warn('Supabase fetch notices fallback:', err)
    notices.value = fallbackNotices
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchNotices()
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
