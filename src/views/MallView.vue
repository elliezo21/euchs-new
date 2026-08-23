<template>
  <div class="min-h-screen bg-gray-50 text-slate-800 font-sans selection:bg-rose-500 selection:text-white relative">
    
    <!-- Toast Notification -->
    <transition enter-active-class="transform ease-out duration-300 transition" enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2" enter-to-class="translate-y-0 opacity-100 sm:translate-x-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="toastMessage" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700">
        <i class="fas fa-check-circle text-rose-400 text-lg"></i>
        <span class="text-sm font-semibold">{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- ======================================================== -->
    <!-- 1. MALL TOP PROMO & EXCHANGE RATE TICKER (Slim) -->
    <!-- ======================================================== -->
    <div class="bg-slate-900 text-white text-xs py-1.5 px-4 border-b border-slate-800">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
        
        <div class="flex items-center gap-3 flex-wrap">
          <span class="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-400/30 text-[10px]">
            <i class="fas fa-bolt text-rose-400"></i> 1688 직연동
          </span>
          
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-slate-400">공식 고시 환율:</span>
            <span class="font-black text-amber-300 font-mono">1 RMB = {{ customExchangeRate }} KRW</span>
            <span class="text-[10px] text-slate-500">(국제 {{ liveMarketRate > 0 ? liveMarketRate.toFixed(2) : '206.19' }}원)</span>
          </div>
        </div>

        <div class="flex items-center gap-3 text-slate-300 text-xs">
          <router-link to="/tools/calculator" class="hover:text-amber-300 flex items-center gap-1 transition">
            <i class="fas fa-calculator text-amber-400 text-xs"></i> 관부가세 계산기
          </router-link>
          <span class="text-slate-600">|</span>
          <router-link to="/dashboard" class="hover:text-rose-300 flex items-center gap-1 font-bold transition">
            <i class="fas fa-user-tie text-rose-400 text-xs"></i> B2B ERP 마이페이지
          </router-link>
        </div>

      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. MALL SEARCH & BRAND HEADER (Slim) -->
    <!-- ======================================================== -->
    <header class="bg-white border-b border-gray-200 py-2.5 sm:py-3 shadow-xs sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          
          <!-- Mall Logo -->
          <router-link to="/mall" class="flex items-center gap-2.5 shrink-0">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-rose-500/20">
              1688
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-lg sm:text-xl font-black text-gray-900 tracking-tight">EUCHS × 1688</span>
                <span class="px-1.5 py-0.2 rounded bg-rose-100 text-rose-600 text-[10px] font-black uppercase">
                  실시간 소싱몰
                </span>
              </div>
              <p class="text-[10px] text-gray-500 font-medium">1688 도매가 그대로 한글 실시간 소싱</p>
            </div>
          </router-link>

          <!-- Main Search Bar -->
          <form @submit.prevent="executeSearch(1)" class="w-full max-w-2xl">
            <div class="flex items-stretch rounded-xl border-2 border-rose-500 p-0.5 bg-white shadow-xs focus-within:ring-2 focus-within:ring-rose-100 transition-all">
              
              <div class="relative flex-1 flex items-center">
                <div class="pl-3 text-gray-400">
                  <i class="fas fa-search text-gray-400 text-xs"></i>
                </div>
                <input
                  v-model="queryInput"
                  type="text"
                  placeholder="1688 상품명 한글 입력 또는 1688 상품 링크(URL)를 붙여넣으세요"
                  class="w-full px-2.5 py-1.5 text-xs sm:text-sm font-normal text-gray-800 placeholder:text-gray-400/80 placeholder:font-light bg-transparent outline-none"
                  :disabled="isLoading"
                />
                <button 
                  v-if="queryInput" 
                  type="button" 
                  @click="queryInput = ''" 
                  class="pr-2.5 text-gray-400 hover:text-gray-600"
                >
                  <i class="fas fa-times-circle text-xs"></i>
                </button>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                :disabled="isLoading || !queryInput.trim()"
                class="px-5 sm:px-6 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <i class="fas fa-spinner fa-spin text-xs" v-if="isLoading"></i>
                <i class="fas fa-search text-xs" v-else></i>
                <span>1688 검색</span>
              </button>

            </div>

            <!-- Quick Popular Tags -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1.5 text-[11px]">
              <span class="text-gray-400 font-semibold flex items-center gap-1">
                <i class="fas fa-tags text-rose-500 text-[10px]"></i> 인기:
              </span>
              <button
                v-for="kw in popularKeywords"
                :key="kw"
                type="button"
                @click="queryInput = kw; executeSearch(1)"
                class="px-1.5 py-0.2 rounded bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 transition font-medium"
              >
                {{ kw }}
              </button>
            </div>
          </form>

          <!-- Right Quick Cart Button -->
          <router-link
            to="/dashboard"
            class="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 transition group shrink-0"
          >
            <div class="w-8 h-8 rounded-lg bg-white text-rose-600 shadow-xs flex items-center justify-center text-sm group-hover:scale-105 transition border border-gray-100">
              <i class="fas fa-shopping-bag"></i>
            </div>
            <div class="text-left">
              <div class="text-[10px] text-gray-500 font-medium">발주 대기 보관함</div>
              <div class="text-xs font-black text-gray-900 group-hover:text-rose-600 font-mono">
                {{ savedCount }}건 보관중
              </div>
            </div>
          </router-link>

        </div>

      </div>
    </header>

    <!-- ======================================================== -->
    <!-- 3. MAIN SOURCING MALL FULL WIDTH CONTENT -->
    <!-- ======================================================== -->
    <main class="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      <!-- Top 3-Card Promotion Banners (Wide Layout) -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        
        <!-- Banner 1: ODM / OEM 맞춤제작 전용관 (4 cols) -->
        <div class="md:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div class="space-y-2 relative z-10">
            <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-black border border-indigo-400/40 uppercase">
              B2B CUSTOM MADE
            </span>
            <h3 class="text-lg sm:text-xl font-black text-white leading-tight">
              1688 공장 직거래<br />
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                OEM / ODM 제작관
              </span>
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">
              로고 인쇄, 커스텀 패키지, 금형 사출 제작까지 15년 전담 무역 MD가 1:1로 밀착 대행합니다.
            </p>
          </div>

          <div class="pt-4 relative z-10">
            <router-link
              to="/services/trade-agent#apply-form"
              class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/30 text-center"
            >
              <span>맞춤 제작 상담 신청</span>
              <i class="fas fa-arrow-right text-[10px]"></i>
            </router-link>
          </div>
        </div>

        <!-- Banner 2: 메인 1688 프로모션 배너 (5 cols) -->
        <div class="md:col-span-5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div class="space-y-2 relative z-10">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black">
              <i class="fas fa-star text-yellow-300"></i>
              <span>2026 베스트 소싱 기획전</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              중국 최고 검증 공장의<br />
              트렌드 신상품 특가전
            </h3>
            <p class="text-xs text-white/90 leading-relaxed line-clamp-2">
              실시간 판매량 1위 아이템부터 마진율 높은 틈새 상품까지, AI 실시간 번역으로 간편하게 발주하세요.
            </p>
          </div>

          <div class="pt-4 flex flex-wrap items-center gap-1.5 relative z-10">
            <button
              v-for="chip in promoChips"
              :key="chip"
              type="button"
              @click="queryInput = chip; executeSearch(1)"
              class="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-rose-600 text-xs font-bold backdrop-blur-md transition shadow-sm"
            >
              {{ chip }} &rarr;
            </button>
          </div>
        </div>

        <!-- Banner 3: 바이어 퀵 박스 & 통관 공지 (3 cols) -->
        <div class="md:col-span-3 bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-3">
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold text-gray-500 uppercase">BUYER QUICK HUB</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200/80 space-y-1">
              <div class="text-[11px] text-gray-500">예치금 지갑 잔액</div>
              <div class="text-base font-black text-emerald-600 font-mono">
                ₩ {{ formatKrw(depositBalanceKrw) }}
              </div>
              <div class="text-[10px] text-gray-400 font-mono">
                (약 ¥ {{ formatRmb(depositBalanceKrw / customExchangeRate) }})
              </div>
            </div>

            <div class="space-y-1 text-xs">
              <div class="font-bold text-gray-700 flex items-center gap-1">
                <i class="fas fa-bullhorn text-rose-500"></i> 실시간 소싱 공지
              </div>
              <p class="text-[11px] text-gray-500 leading-snug line-clamp-2">
                [공지] 1688 상품 주문 시 직영 물류센터 24시간 검수 후 안전 출고됩니다.
              </p>
            </div>
          </div>

          <div>
            <router-link
              to="/dashboard"
              class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center shadow-sm"
            >
              <i class="fas fa-truck-loading text-amber-400"></i>
              <span>발주 & 배송 관리 ERP</span>
            </router-link>
          </div>
        </div>

      </div>

      <!-- Category Tabs (Horizontal Scrollable) -->
      <div class="bg-white rounded-2xl p-2 border border-gray-200 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          @click="selectCategory(cat)"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0',
            selectedCategoryId === cat.id 
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          ]"
        >
          <i :class="cat.icon"></i>
          <span>{{ cat.name }}</span>
        </button>
      </div>

      <!-- Progress Indicator (During Search) -->
      <div v-if="isLoading" class="bg-white rounded-2xl p-4 sm:p-5 border border-rose-200 shadow-sm space-y-3">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-rose-500/30">
              <i class="fas fa-sync fa-spin"></i>
            </div>
            <div>
              <div class="text-sm font-bold text-gray-900">
                {{ currentProgress.message || '1688 실시간 상품 및 AI 번역 연동 중...' }}
              </div>
              <div class="text-xs text-rose-600 mt-0.5">
                Step {{ currentProgress.step }}/3: 
                <span v-if="currentProgress.step === 1">AI 한글 ➔ 중국어 키워드 번역</span>
                <span v-else-if="currentProgress.step === 2">1688 DataHub 실시간 상품 DB 검색</span>
                <span v-else>수신 상품명 AI 한국어 일괄 번역</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 text-xs font-bold">
            <span :class="['px-2.5 py-1 rounded-lg transition-all', currentProgress.step >= 1 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-400']">1. 키워드번역</span>
            <i class="fas fa-chevron-right text-[10px] text-gray-300"></i>
            <span :class="['px-2.5 py-1 rounded-lg transition-all', currentProgress.step >= 2 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-400']">2. 1688검색</span>
            <i class="fas fa-chevron-right text-[10px] text-gray-300"></i>
            <span :class="['px-2.5 py-1 rounded-lg transition-all', currentProgress.step >= 3 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-400']">3. 한국어매핑</span>
          </div>
        </div>
      </div>

      <!-- Clean Search Results Header Bar (No Item Count, Clean Single Tag) -->
      <div v-if="hasSearched && !isLoading" class="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="flex items-center gap-2 text-xs sm:text-sm">
          <span class="text-gray-500 font-medium">검색어:</span>
          <span class="px-3.5 py-1 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200">
            {{ lastQueryKo }}
          </span>
        </div>

        <!-- Sort Filter -->
        <div class="flex items-center gap-2 text-xs sm:text-sm self-end sm:self-auto">
          <label class="text-gray-500 font-medium">정렬:</label>
          <select
            v-model="sortOrder"
            @change="executeSearch(1)"
            class="bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-gray-800 font-semibold focus:outline-none focus:border-rose-500"
          >
            <option value="default">기본 랭킹순</option>
            <option value="salesDesc">누적 판매량 높은순</option>
            <option value="priceAsc">가격 낮은순</option>
            <option value="priceDesc">가격 높은순</option>
          </select>
        </div>
      </div>

      <!-- Loading Skeleton Cards -->
      <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-5">
        <div
          v-for="i in 10"
          :key="i"
          class="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm animate-pulse space-y-3"
        >
          <div class="aspect-square bg-gray-200 rounded-xl"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          <div class="h-6 bg-gray-200 rounded w-1/3 pt-2"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="hasSearched && items.length === 0" class="bg-white rounded-3xl p-10 sm:p-12 text-center border border-gray-200 space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center text-2xl">
          <i class="fas fa-search"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-black text-gray-800">검색된 1688 상품이 없습니다</h3>
          <p class="text-xs text-gray-500 max-w-sm mx-auto">
            다른 키워드로 검색해 보세요. (예: 텀블러, 실내화, 셔츠, 숄더백)
          </p>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 3-1. PRODUCT CARDS GRID (CN인사이더 스타일 완벽 동기화) -->
      <!-- ======================================================== -->
      <div v-else-if="items.length > 0 && !isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
        <div
          v-for="item in items"
          :key="item.id"
          @click="openProductModal(item)"
          class="group bg-white rounded-xl border border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
        >
          <!-- Thumbnail Image -->
          <div class="relative aspect-square bg-gray-100 overflow-hidden">
            <img
              :src="item.imageUrl"
              :alt="item.titleKo || item.titleZh"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              @error="handleImageError"
            />
            
            <!-- 1688 Orange Badge Top Left -->
            <div class="absolute top-2 left-2">
              <span class="px-2 py-0.5 rounded bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black shadow-sm tracking-wide">
                1688
              </span>
            </div>

            <div v-if="item.minOrder && item.minOrder > 1" class="absolute top-2 right-2">
              <span class="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                MOQ {{ item.minOrder }}
              </span>
            </div>
          </div>

          <!-- Product Details (CN인사이더 카드 3열 구조) -->
          <div class="p-3 flex-grow flex flex-col justify-between space-y-2">
            <!-- 1열: 한국어 번역 상품명 (깔끔한 2줄 말줄임, Pretendard 폰트) -->
            <div>
              <h3 
                class="text-[13px] font-medium text-gray-800 leading-[18px] line-clamp-2 h-[36px] group-hover:text-orange-600 transition" 
                :title="item.titleKo || item.titleZh"
              >
                {{ item.titleKo || item.titleZh }}
              </h3>
            </div>

            <div class="space-y-1 pt-1 border-t border-gray-100">
              <!-- 2열: 굵은 붉은색 위안화 가격 + 옅은 회색 원화 환산가 -->
              <div class="flex items-baseline gap-1 font-mono">
                <span class="text-red-600 font-bold text-base sm:text-lg tracking-tight">
                  ¥{{ item.priceFormatted }}
                </span>
                <span class="text-gray-400 text-xs font-medium">
                  | ₩{{ formatKrw(item.price * customExchangeRate) }}
                </span>
              </div>

              <!-- 3열: 메타 정보 (재구매율, 총판매량) -->
              <div class="flex items-center justify-between text-[11px] text-gray-400">
                <span>재구매율: <b class="text-gray-600 font-normal">{{ item.repurchaseRate || '91%' }}</b></span>
                <span>총판매량: <b class="text-gray-600 font-normal">{{ item.sales || '0' }}건</b></span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Load More Products Button -->
      <div v-if="items.length > 0 && !isLoading" class="pt-4 sm:pt-6 pb-8 sm:pb-10 flex justify-center">
        <button
          type="button"
          :disabled="isLoadingMore"
          @click="loadMoreProducts"
          class="px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl bg-white hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-400 text-rose-600 font-black text-xs sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2"
        >
          <i class="fas fa-spinner fa-spin" v-if="isLoadingMore"></i>
          <i class="fas fa-plus-circle" v-else></i>
          <span>1688 상품 더보기 (다음 페이지)</span>
        </button>
      </div>

    </main>

    <!-- ======================================================== -->
    <!-- 5. PRODUCT DETAIL & ORDER MODAL (Component) -->
    <!-- ======================================================== -->
    <ProductDetailModal
      :product="selectedModalProduct"
      :exchange-rate="customExchangeRate"
      @close="selectedModalProduct = null"
      @added-to-cart="handleModalCartAdded"
      @change-product="selectedModalProduct = $event"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { search1688WithTranslation, fetch1688ProductById } from '../services/api1688'
import { fetchSiteSettings } from '../lib/settings'
import ProductDetailModal from '../components/ProductDetailModal.vue'

const route = useRoute()

// ----------------------------------------------------
// State & Navigation
// ----------------------------------------------------
const queryInput = ref('')
const sortOrder = ref('default')
const currentPage = ref(1)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const hasSearched = ref(false)
const errorMessage = ref('')
const toastMessage = ref('')

const lastQueryKo = ref('')
const lastQueryZh = ref('')
const items = ref([])

const currentProgress = ref({
  step: 1,
  message: ''
})

const selectedModalProduct = ref(null)

const customExchangeRate = ref(226.19)
const liveMarketRate = ref(206.19)
const agencyFeeRate = ref(8.0)
const depositBalanceKrw = ref(15420000)

const popularKeywords = [
  '블라우스',
  '실내화',
  '셔츠',
  '숄더백',
  '텀블러',
  '캠핑의자',
  '보조배터리',
  '스마트워치스트랩'
]

const categories = [
  { id: 'all', name: '전체 상품', keyword: '여성 원피스', icon: 'fas fa-th-large' },
  { id: 'women', name: '여성의류', keyword: '여성 린넨 블라우스', icon: 'fas fa-female' },
  { id: 'acc', name: '패션잡화/가방', keyword: '여성 숄더백', icon: 'fas fa-shopping-bag' },
  { id: 'living', name: '생활/주방용품', keyword: '스테인리스 텀블러', icon: 'fas fa-coffee' },
  { id: 'digital', name: '디지털/가전', keyword: '대용량 보조배터리', icon: 'fas fa-mobile-alt' },
  { id: 'camping', name: '캠핑/레저', keyword: '캠핑 접이식 의자', icon: 'fas fa-campground' },
  { id: 'beauty', name: '뷰티/반려동물', keyword: '고양이 스크래쳐', icon: 'fas fa-paw' },
  { id: 'interior', name: '인테리어/문구', keyword: '데스크 오거나이저', icon: 'fas fa-home' }
]

const selectedCategoryId = ref('all')

const selectCategory = (cat) => {
  selectedCategoryId.value = cat.id
  queryInput.value = cat.keyword
  executeSearch(1)
}

// ----------------------------------------------------
// Toast Helper
// ----------------------------------------------------
const showToast = (msg) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

// ----------------------------------------------------
// Saved Cart Management
// ----------------------------------------------------
const savedCount = ref(0)

const updateSavedCount = () => {
  try {
    const cached = localStorage.getItem('euchs_erp_saved_items')
    if (cached) {
      const parsed = JSON.parse(cached)
      savedCount.value = Array.isArray(parsed) ? parsed.length : 0
    } else {
      savedCount.value = 0
    }
  } catch (e) {
    savedCount.value = 0
  }
}

const openProductModal = (item) => {
  selectedModalProduct.value = item
}

const handleModalCartAdded = (savedItem) => {
  updateSavedCount()
  showToast(`[${(savedItem.titleKo || savedItem.titleZh).slice(0, 18)}...] 보관함에 담겼습니다.`)
}

// ----------------------------------------------------
// 1688 Direct OfferId Modal Opener
// ----------------------------------------------------
const openDetailModalById = async (offerId) => {
  isLoading.value = true
  errorMessage.value = ''
  currentProgress.value = {
    step: 2,
    message: `1688 상품(ID: ${offerId}) 상세 정보 조회 중...`
  }

  try {
    const product = await fetch1688ProductById(offerId)
    selectedModalProduct.value = product
  } catch (err) {
    console.warn('[Mall1688] Direct detail open fallback:', err)
  } finally {
    isLoading.value = false
  }
}

// ----------------------------------------------------
// 1688 Search & AI Execution (with URL/OfferId Detection)
// ----------------------------------------------------
const executeSearch = async (page = 1, overrideKeyword = null) => {
  const rawInput = (overrideKeyword !== null ? overrideKeyword : queryInput.value).trim()
  if (!rawInput) return

  // 1688 URL 패턴 체크 (예: detail.1688.com/offer/804895839729.html, offerId=804895839729 등)
  const urlMatch = rawInput.match(/offer\/(\d+)\.html/) || rawInput.match(/[?&]offerId=(\d+)/) || rawInput.match(/[?&]itemId=(\d+)/)
  // 순수 9~16자리 숫자(상품 ID) 체크
  const isNumericId = /^\d{9,16}$/.test(rawInput)

  const offerId = urlMatch ? urlMatch[1] : (isNumericId ? rawInput : null)

  if (offerId && page === 1) {
    // [분기 A] 1688 URL 또는 상품 ID인 경우 -> 상세 정보 API 단건 호출 후 모달 즉시 오픈
    await openDetailModalById(offerId)
    return
  }

  // [분기 B] 일반 검색어인 경우 -> 한-중 번역 및 1688 소싱 목록 검색 진행
  isLoading.value = true
  errorMessage.value = ''
  currentPage.value = page
  currentProgress.value = {
    step: 1,
    message: `한글 키워드 분석 중: "${rawInput}"`
  }

  try {
    const result = await search1688WithTranslation(
      rawInput,
      page,
      { sort: sortOrder.value },
      (p) => { currentProgress.value = p }
    )

    items.value = result.items || []
    lastQueryKo.value = result.queryKo || rawInput
    lastQueryZh.value = result.queryZh || ''
    hasSearched.value = true
  } catch (err) {
    console.warn('[Mall1688] Search notice:', err)
  } finally {
    isLoading.value = false
  }
}

// ----------------------------------------------------
// Load More Products (Next Page)
// ----------------------------------------------------
const loadMoreProducts = async () => {
  const query = lastQueryKo.value || queryInput.value.trim()
  if (!query) return

  isLoadingMore.value = true
  const nextPage = currentPage.value + 1

  try {
    const result = await search1688WithTranslation(
      query,
      nextPage,
      { sort: sortOrder.value }
    )

    if (result.items && result.items.length > 0) {
      items.value.push(...result.items)
      currentPage.value = nextPage
    }
  } catch (err) {
    console.warn('Load more notice:', err)
  } finally {
    isLoadingMore.value = false
  }
}

// ----------------------------------------------------
// Rates & Settings Load
// ----------------------------------------------------
const loadRates = async () => {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY')
    if (res.ok) {
      const data = await res.json()
      if (data?.rates?.KRW) {
        liveMarketRate.value = Number(data.rates.KRW.toFixed(2))
      }
    }

    const settings = await fetchSiteSettings()
    if (settings) {
      agencyFeeRate.value = Number(settings.agency_fee_rate) || 8.0
      if (settings.exchange_rate_mode === 'auto_margin') {
        const margin = Number(settings.rate_margin) || 1.5
        customExchangeRate.value = Number((liveMarketRate.value + margin).toFixed(2))
      } else {
        customExchangeRate.value = Number(settings.exchange_rate) || 226.19
      }
    }
  } catch (err) {
    console.warn('Rates fetch error:', err)
  }
}

// ----------------------------------------------------
// Formatters
// ----------------------------------------------------
const formatKrw = (val) => {
  if (!val || isNaN(val)) return '0'
  return Math.round(val).toLocaleString('ko-KR')
}

const formatRmb = (val) => {
  if (!val || isNaN(val)) return '0.00'
  return Number(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const handleImageError = (e) => {
  e.target.src = 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&auto=format&fit=crop&q=60'
}

// ----------------------------------------------------
// Lifecycle & Route Query Watcher
// ----------------------------------------------------
const handleIncomingQuery = async () => {
  const offerId = route.query.offerId
  if (offerId && typeof offerId === 'string' && offerId.trim()) {
    await openDetailModalById(offerId.trim())
    return
  }

  const q = route.query.q
  if (q && typeof q === 'string' && q.trim()) {
    queryInput.value = q.trim()
    executeSearch(1)
  } else if (!hasSearched.value && items.value.length === 0) {
    queryInput.value = ''
    executeSearch(1, '여성 원피스')
  }
}

onMounted(async () => {
  await loadRates()
  updateSavedCount()
  handleIncomingQuery()
})

watch(() => route.query, () => {
  handleIncomingQuery()
}, { deep: true })
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
