<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
    
    <!-- Toast Notification -->
    <transition enter-active-class="transform ease-out duration-300 transition" enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2" enter-to-class="translate-y-0 opacity-100 sm:translate-x-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="toastMessage" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700">
        <i class="fas fa-check-circle text-emerald-400 text-lg"></i>
        <span class="text-sm font-semibold">{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Top ERP Mini Navigation Bar (White Theme) -->
    <header class="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div class="flex items-center gap-4">
        <!-- Mobile Sidebar Toggle -->
        <button 
          @click="isMobileMenuOpen = !isMobileMenuOpen" 
          class="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 transition"
        >
          <i class="fas fa-bars text-base"></i>
        </button>

        <!-- Brand Title -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
            E
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base font-black tracking-wider text-slate-900">EUCHS ERP</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                B2B 수입대행
              </span>
            </div>
            <p class="text-[11px] text-slate-500 font-medium hidden sm:block">공식 환율 동기화 1688 실시간 발주 포털</p>
          </div>
        </div>
      </div>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-3">
        <!-- Exchange Rate Quick Badge -->
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-slate-500 font-medium">당사 적용 환율:</span>
          <span class="font-black text-indigo-700 font-mono">1 RMB = {{ customExchangeRate }} KRW</span>
        </div>

        <!-- 1688 Mall Direct Link -->
        <router-link 
          to="/mall"
          class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition"
        >
          <i class="fas fa-store text-rose-500"></i>
          <span>1688 소싱몰</span>
        </router-link>

        <!-- Calculator Link Button -->
        <router-link 
          to="/tools/calculator"
          class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition"
        >
          <i class="fas fa-calculator text-indigo-500"></i>
          <span>관부가세 계산기</span>
        </router-link>

        <!-- Back to Main Home Website Link -->
        <router-link 
          to="/"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition"
          title="이유씨컴퍼니 공식 홈페이지로 이동"
        >
          <i class="fas fa-home text-slate-500"></i>
          <span class="hidden sm:inline">홈페이지</span>
        </router-link>

        <!-- User Profile Badge -->
        <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div class="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
            VIP
          </div>
          <div class="hidden sm:block text-left">
            <div class="text-xs font-bold text-slate-900">{{ buyerProfile.name }}</div>
            <div class="text-[10px] text-amber-600 font-semibold">{{ buyerProfile.grade }} (수수료 {{ agencyFeeRate }}%)</div>
          </div>
        </div>
      </div>
    </header>

    <div class="flex-grow flex relative">
      
      <!-- ======================================================== -->
      <!-- 1. LEFT SIDEBAR (White & Soft Gray Theme) -->
      <!-- ======================================================== -->
      <aside 
        :class="[
          'fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        ]"
      >
        <!-- Top Menu Items -->
        <div class="p-4 space-y-6 overflow-y-auto">
          
          <!-- Buyer Info Card -->
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500 text-lg border border-slate-200">
                <i class="fas fa-building"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-slate-900 truncate">{{ buyerProfile.companyName }}</div>
                <div class="text-[11px] text-slate-500">사업자: {{ buyerProfile.bizNumber }}</div>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span class="text-slate-500">전담 MD:</span>
              <span class="text-indigo-600 font-bold flex items-center gap-1">
                <i class="fas fa-headset text-[10px]"></i> 이유씨 이민호 실장
              </span>
            </div>
          </div>

          <!-- Navigation Links -->
          <div class="space-y-1">
            <div class="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">ERP Navigation</div>
            
            <button
              v-for="item in navItems"
              :key="item.id"
              type="button"
              @click="switchTab(item.id)"
              :class="[
                'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all group text-left',
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              ]"
            >
              <div class="flex items-center gap-3">
                <i :class="[item.icon, 'text-base w-5 text-center', activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600']"></i>
                <span>{{ item.name }}</span>
              </div>
              <span 
                v-if="item.badgeCount !== undefined" 
                :class="[
                  'px-2 py-0.5 rounded-full text-xs font-black font-mono',
                  activeTab === item.id ? 'bg-white text-indigo-700' : 'bg-slate-100 text-indigo-600'
                ]"
              >
                {{ item.badgeCount }}
              </span>
            </button>
          </div>

        </div>

        <!-- Sidebar Bottom: System Status -->
        <div class="p-4 border-t border-slate-200 bg-slate-50 text-xs space-y-2">
          <div class="flex items-center justify-between text-slate-500">
            <span>1688 DataHub:</span>
            <span class="text-emerald-600 font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> 정상 연결
            </span>
          </div>
          <div class="flex items-center justify-between text-slate-500">
            <span>AI 실시간 자동 번역:</span>
            <span class="text-emerald-600 font-bold">Active (KO ↔ ZH)</span>
          </div>
          <div class="flex items-center justify-between text-slate-500">
            <span>적용 통화:</span>
            <span class="text-indigo-700 font-black">KRW(₩) / RMB(¥)</span>
          </div>
        </div>
      </aside>

      <!-- Mobile Backdrop -->
      <div 
        v-if="isMobileMenuOpen" 
        @click="isMobileMenuOpen = false" 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
      ></div>

      <!-- ======================================================== -->
      <!-- 2. MAIN CONTENT AREA (White Theme) -->
      <!-- ======================================================== -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">

        <!-- ====================================================== -->
        <!-- 2-1. TOP SECTION: WALLET & EXCHANGE RATE CARDS -->
        <!-- ====================================================== -->
        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <!-- Card 1: Official Exchange Rate Card -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  <i class="fas fa-coins text-indigo-600"></i> EUCHS 공식 환율 시스템
                </span>
                <button 
                  @click="reloadSettingsAndRates" 
                  :disabled="isFetchingRate"
                  class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
                  title="환율 새로고침"
                >
                  <i class="fas fa-sync-alt" :class="{ 'animate-spin': isFetchingRate }"></i>
                </button>
              </div>

              <!-- Main Exchange Rate Display -->
              <div class="mt-4">
                <div class="text-xs text-slate-500 font-medium">최종 적용 환율 (1 RMB 기준)</div>
                <div class="text-2xl sm:text-3xl font-black text-indigo-600 font-mono tracking-tight mt-1">
                  1 RMB = {{ customExchangeRate }}원
                </div>
              </div>
            </div>

            <!-- Sub Details & Calculator Action -->
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div class="space-y-0.5 text-slate-500">
                <div>국제 고시 기준: <span class="text-slate-800 font-mono font-bold">{{ liveMarketRate > 0 ? liveMarketRate.toFixed(2) + '원' : '206.19원' }}</span></div>
                <div>대행 수수료: <span class="text-indigo-600 font-bold">{{ agencyFeeRate }}%</span> <span class="text-[10px] text-slate-400">(최소 1만 원)</span></div>
              </div>

              <router-link 
                to="/tools/calculator" 
                class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition text-center"
              >
                <i class="fas fa-calculator"></i> 관부가세 계산기
              </router-link>
            </div>
          </div>

          <!-- Card 2: B2B Deposit Wallet -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <i class="fas fa-wallet text-emerald-600"></i> B2B 예치금 지갑
                </span>
                <span class="text-xs text-slate-400">실시간 차감 연동</span>
              </div>

              <!-- Balance Display (KRW & RMB) -->
              <div class="mt-4 space-y-1">
                <div class="text-xs text-slate-500 font-medium">원화(KRW) 보유 잔액</div>
                <div class="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                  ₩ {{ formatKrw(depositWallet.krwBalance) }}
                </div>
                <div class="text-xs font-bold text-slate-600 font-mono flex items-center gap-1">
                  <span>위안화 환산 잔액:</span>
                  <span class="text-amber-600 font-black">¥ {{ formatRmb(depositWallet.krwBalance / customExchangeRate) }}</span>
                </div>
              </div>
            </div>

            <!-- Wallet Action Buttons -->
            <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button 
                @click="openDepositModal"
                class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
              >
                <i class="fas fa-plus-circle"></i> 예치금 충전
              </button>
              <button 
                @click="showToast('출금 신청은 담당 전담 MD에게 문의하시면 1영업일 내 처리됩니다.')"
                class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                출금 신청
              </button>
            </div>
          </div>

          <!-- Card 3: Quick Purchase Order Status Summary -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                  <i class="fas fa-shipping-fast text-purple-600"></i> 실시간 수입 진행 현황
                </span>
                <span class="text-xs text-purple-600 font-bold font-mono">총 {{ activeOrderCount }}건 진행중</span>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-3 text-center">
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div class="text-[11px] text-slate-500 font-medium">발주 대기 보관함</div>
                  <div class="text-xl font-black text-indigo-600 font-mono mt-0.5">{{ savedItems.length }}개</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div class="text-[11px] text-slate-500 font-medium">이번 달 수입 결제액</div>
                  <div class="text-lg font-black text-amber-600 font-mono mt-0.5">₩ {{ formatKrw(monthlyImportKrw) }}</div>
                </div>
              </div>
            </div>

            <!-- Quick Action -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-500">빠른 보관함 발주:</span>
              <button 
                @click="switchTab('saved')"
                class="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                보관 상품 바로가기 ({{ savedItems.length }}건) <i class="fas fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>

        </section>

        <!-- ====================================================== -->
        <!-- 2-2. 8-STEP REALTIME ORDER PIPELINE CARDS -->
        <!-- ====================================================== -->
        <section class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                <i class="fas fa-stream text-indigo-600"></i>
                <span>실시간 수입대행 8단계 발주 파이프라인</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">견적 요청부터 국내 최종 배송까지 전 과정을 실시간 트래킹합니다.</p>
            </div>
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>현재 선택 필터:</span>
              <span class="text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                {{ currentPipelineFilter ? currentPipelineFilter.name : '전체 단계 보기' }}
              </span>
              <button 
                v-if="currentPipelineFilter" 
                @click="currentPipelineFilter = null"
                class="text-slate-500 hover:text-slate-800 text-xs underline ml-1"
              >
                초기화
              </button>
            </div>
          </div>

          <!-- 8-Step Interactive Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div 
              v-for="(step, index) in pipelineSteps" 
              :key="step.id"
              @click="togglePipelineFilter(step)"
              :class="[
                'p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-center relative overflow-hidden group',
                currentPipelineFilter?.id === step.id 
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/30 shadow-md' 
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
              ]"
            >
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                  {{ index + 1 }}
                </span>
                <i :class="[step.icon, 'text-xs text-slate-400 group-hover:text-indigo-600 transition']"></i>
              </div>

              <div class="text-xs font-bold text-slate-700 mt-2">
                {{ step.name }}
              </div>

              <div class="mt-2 text-lg font-black font-mono" :class="step.count > 0 ? 'text-indigo-600' : 'text-slate-400'">
                {{ step.count }} <span class="text-[11px] font-normal text-slate-400">건</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ====================================================== -->
        <!-- 2-3. SEARCH & SAVED ITEMS GRID TABS -->
        <!-- ====================================================== -->
        <section class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          
          <!-- Tab Headers & Quick Search Bar -->
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            
            <!-- Tab Buttons -->
            <div class="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start">
              <button
                type="button"
                @click="viewMode = 'search'"
                :class="[
                  'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2',
                  viewMode === 'search' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                    : 'text-slate-600 hover:text-slate-900'
                ]"
              >
                <i class="fas fa-search"></i>
                <span>1688 실시간 검색 결과</span>
                <span v-if="searchResults.length > 0" class="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold">
                  {{ searchResults.length }}
                </span>
              </button>

              <button
                type="button"
                @click="viewMode = 'saved'"
                :class="[
                  'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2',
                  viewMode === 'saved' 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
                    : 'text-slate-600 hover:text-slate-900'
                ]"
              >
                <i class="fas fa-shopping-bag"></i>
                <span>내 보관 상품 (발주 대기 리스트)</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold font-mono">
                  {{ savedItems.length }}
                </span>
              </button>
            </div>

            <!-- Fast Search Form -->
            <form @submit.prevent="executeSearch(1)" class="flex items-center gap-2 flex-1 max-w-xl">
              <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fas fa-search text-xs"></i>
                </div>
                <input
                  v-model="queryInput"
                  type="text"
                  placeholder="한글로 상품명 검색 (예: 린넨 원피스, 텀블러, 캠핑의자)"
                  class="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  :disabled="isLoadingSearch"
                />
                <button 
                  v-if="queryInput" 
                  type="button" 
                  @click="queryInput = ''" 
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <i class="fas fa-times-circle text-xs"></i>
                </button>
              </div>

              <button
                type="submit"
                :disabled="isLoadingSearch || !queryInput.trim()"
                class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/20"
              >
                <i class="fas fa-spinner fa-spin" v-if="isLoadingSearch"></i>
                <i class="fas fa-bolt text-yellow-300" v-else></i>
                <span>검색</span>
              </button>
            </form>

          </div>

          <!-- ==================================================== -->
          <!-- CASE A: 1688 SEARCH RESULTS TAB -->
          <!-- ==================================================== -->
          <div v-if="viewMode === 'search'" class="space-y-6">
            
            <div v-if="hasSearched && !isLoadingSearch" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="text-slate-500 font-medium">검색어:</span>
                <span class="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                  "{{ lastQueryKo }}"
                </span>
                <i class="fas fa-arrow-right text-[10px] text-slate-400"></i>
                <span class="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200 font-mono">
                  중국어: "{{ lastQueryZh }}"
                </span>
                <span class="text-slate-500 ml-1">(조회 <b>{{ searchResults.length }}</b>건)</span>
              </div>

              <!-- Sort Filter -->
              <div class="flex items-center gap-2 text-xs">
                <label class="text-slate-500 font-medium">정렬:</label>
                <select 
                  v-model="sortOrder" 
                  @change="executeSearch(1)"
                  class="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="default">기본 랭킹순</option>
                  <option value="salesDesc">누적 판매량순</option>
                  <option value="priceAsc">가격 낮은순</option>
                  <option value="priceDesc">가격 높은순</option>
                </select>
              </div>
            </div>

            <!-- Search Results Product Grid -->
            <div v-if="searchResults.length > 0 && !isLoadingSearch" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              <div 
                v-for="item in searchResults" 
                :key="item.id"
                class="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-lg"
              >
                <!-- Thumbnail -->
                <div class="relative aspect-square bg-slate-100 overflow-hidden">
                  <img 
                    :src="item.imageUrl" 
                    :alt="item.titleKo || item.titleZh"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    @error="handleImageError"
                  />
                  
                  <div class="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    <span class="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[10px] font-bold">
                      최소 {{ item.minOrder }}개부터
                    </span>
                  </div>

                  <div v-if="item.sales && item.sales !== '0'" class="absolute top-2.5 right-2.5">
                    <span class="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black shadow-sm">
                      {{ item.sales }} 구매
                    </span>
                  </div>

                  <a 
                    :href="item.detailUrl" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                  >
                    <i class="fas fa-external-link-alt"></i> 1688 원문 보기
                  </a>
                </div>

                <!-- Content Area -->
                <div class="p-4 flex-grow flex flex-col justify-between space-y-3">
                  <div class="space-y-1">
                    <h3 class="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition" :title="item.titleKo || item.titleZh">
                      {{ item.titleKo || item.titleZh }}
                    </h3>
                    <p class="text-[10px] text-slate-400 font-mono line-clamp-1" :title="item.titleZh">
                      <span class="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-sans mr-0.5">원문</span>
                      {{ item.titleZh }}
                    </p>
                  </div>

                  <!-- Price -->
                  <div class="pt-2 border-t border-slate-100 space-y-1">
                    <div class="flex items-baseline justify-between">
                      <div>
                        <span class="text-xs font-bold text-rose-600">¥</span>
                        <span class="text-xl font-black text-rose-600 font-mono ml-0.5">{{ item.priceFormatted }}</span>
                        <span class="text-[10px] text-slate-400 ml-1">위안</span>
                      </div>
                      <div class="text-right">
                        <div class="text-xs font-bold text-slate-900 font-mono">
                          ₩ {{ formatKrw(item.price * customExchangeRate) }}
                        </div>
                        <div class="text-[10px] text-slate-400">
                          (환율 {{ customExchangeRate }}원)
                        </div>
                      </div>
                    </div>

                    <div v-if="item.company" class="text-[10px] text-slate-400 truncate pt-0.5">
                      <i class="fas fa-store text-slate-400 mr-1"></i>{{ item.company }}
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="pt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="addToSavedItems(item)"
                      :disabled="isItemSaved(item.id)"
                      :class="[
                        'px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition',
                        isItemSaved(item.id) 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      ]"
                    >
                      <i :class="isItemSaved(item.id) ? 'fas fa-check' : 'fas fa-plus'"></i>
                      <span>{{ isItemSaved(item.id) ? '보관됨' : '보관함 담기' }}</span>
                    </button>

                    <router-link
                      :to="{ path: '/tools/calculator', query: { price: item.price, qty: item.minOrder } }"
                      class="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition text-center"
                    >
                      <i class="fas fa-calculator text-[10px] text-indigo-600"></i>
                      <span>관부가세</span>
                    </router-link>
                  </div>

                </div>
              </div>
            </div>

            <!-- Initial Empty Search Guide -->
            <div v-if="!hasSearched && !isLoadingSearch" class="bg-slate-50 rounded-2xl p-10 text-center border border-slate-200 space-y-4">
              <div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl">
                <i class="fas fa-search-plus"></i>
              </div>
              <div class="max-w-md mx-auto space-y-1">
                <h3 class="text-base font-bold text-slate-900">1688 실시간 도매 상품 검색</h3>
                <p class="text-xs text-slate-500">
                  한글로 키워드를 입력하시면 AI 실시간 번역을 거쳐 중국 1688 원문 상품을 실시간 조회합니다.
                </p>
              </div>
              <!-- Recommended Tags -->
              <div class="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                <button
                  v-for="kw in sampleKeywords"
                  :key="kw"
                  type="button"
                  @click="queryInput = kw; executeSearch(1)"
                  class="px-3 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-medium border border-slate-200 transition"
                >
                  # {{ kw }}
                </button>
              </div>
            </div>

          </div>

          <!-- ==================================================== -->
          <!-- CASE B: SAVED ITEMS (PURCHASE ORDER READY GRID) -->
          <!-- ==================================================== -->
          <div v-if="viewMode === 'saved'" class="space-y-6">
            
            <!-- Saved Top Control Bar -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected" 
                    @change="toggleSelectAll" 
                    class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>전체 선택 ({{ selectedItemIds.length }}/{{ savedItems.length }})</span>
                </label>

                <button
                  type="button"
                  v-if="selectedItemIds.length > 0"
                  @click="removeSelectedItems"
                  class="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition"
                >
                  <i class="fas fa-trash-alt"></i> 선택 삭제
                </button>
              </div>

              <!-- Total Summary & Create Order Button -->
              <div class="flex flex-wrap items-center gap-3">
                <div class="text-right text-xs">
                  <div class="text-slate-500">
                    선택 품목 총액: 
                    <span class="text-rose-600 font-bold font-mono">¥ {{ formatRmb(selectedTotalRmb) }}</span>
                  </div>
                  <div class="text-sm font-black text-indigo-700 font-mono">
                    ₩ {{ formatKrw(selectedTotalKrw) }}
                  </div>
                </div>

                <button
                  type="button"
                  :disabled="selectedItemIds.length === 0"
                  @click="openOrderModal"
                  class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-purple-600/20 transition active:scale-95"
                >
                  <i class="fas fa-file-invoice-dollar"></i>
                  <span>견적 / 발주서 생성 ({{ selectedItemIds.length }}건)</span>
                </button>
              </div>

            </div>

            <!-- Saved Empty State -->
            <div v-if="savedItems.length === 0" class="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200 space-y-4">
              <div class="w-16 h-16 mx-auto rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl">
                <i class="fas fa-box-open"></i>
              </div>
              <div class="space-y-1">
                <h3 class="text-base font-bold text-slate-900">보관된 발주 대기 상품이 없습니다</h3>
                <p class="text-xs text-slate-500 max-w-sm mx-auto">
                  [1688 검색 결과] 탭 또는 1688 소싱몰에서 원하는 상품을 찾아 <b class="text-indigo-600">'보관함 담기'</b>를 클릭하시면 즉시 발주 리스트에 추가됩니다.
                </p>
              </div>
              <button 
                type="button" 
                @click="viewMode = 'search'" 
                class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
              >
                1688 상품 검색하러 가기
              </button>
            </div>

            <!-- Saved Items Table -->
            <div v-else class="space-y-3">
              <div 
                v-for="item in savedItems" 
                :key="item.id"
                :class="[
                  'bg-white rounded-2xl p-4 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4',
                  selectedItemIds.includes(item.id) ? 'border-indigo-400 bg-indigo-50/20 shadow-sm' : 'border-slate-200'
                ]"
              >
                <!-- Left: Checkbox + Thumbnail + Product Title -->
                <div class="flex items-center gap-3.5 flex-1 min-w-0">
                  <input 
                    type="checkbox" 
                    :value="item.id" 
                    v-model="selectedItemIds"
                    class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                  />

                  <img 
                    :src="item.imageUrl" 
                    :alt="item.titleKo"
                    class="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                    @error="handleImageError"
                  />

                  <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-indigo-700 font-bold">
                        MOQ {{ item.minOrder }}개
                      </span>
                      <a :href="item.detailUrl" target="_blank" class="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1">
                        1688 원문 <i class="fas fa-external-link-alt text-[8px]"></i>
                      </a>
                    </div>

                    <h4 class="text-xs sm:text-sm font-bold text-slate-900 truncate" :title="item.titleKo">
                      {{ item.titleKo }}
                    </h4>
                    <p class="text-[10px] text-slate-400 font-mono truncate" :title="item.titleZh">
                      {{ item.titleZh }}
                    </p>

                    <div class="flex flex-wrap items-center gap-1.5 pt-1">
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium">
                        옵션: {{ item.selectedOption || '기본 표준 규격' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Right: Price, Quantity Adjuster, Total Calculation -->
                <div class="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  
                  <div class="text-right">
                    <div class="text-xs font-bold text-rose-600 font-mono">¥ {{ item.priceFormatted }}</div>
                    <div class="text-[11px] text-slate-500 font-mono">₩ {{ formatKrw(item.price * customExchangeRate) }}</div>
                  </div>

                  <div class="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
                    <button 
                      type="button" 
                      @click="adjustItemQty(item, -1)" 
                      class="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs shadow-sm"
                    >
                      <i class="fas fa-minus"></i>
                    </button>
                    <input 
                      type="number" 
                      v-model.number="item.orderQty" 
                      :min="item.minOrder"
                      class="w-14 bg-transparent text-center font-bold text-xs sm:text-sm text-slate-900 outline-none font-mono"
                    />
                    <button 
                      type="button" 
                      @click="adjustItemQty(item, 1)" 
                      class="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs shadow-sm"
                    >
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>

                  <div class="text-right min-w-[90px]">
                    <div class="text-xs font-black text-rose-600 font-mono">
                      ¥ {{ formatRmb(item.price * item.orderQty) }}
                    </div>
                    <div class="text-sm font-black text-indigo-700 font-mono">
                      ₩ {{ formatKrw(item.price * item.orderQty * customExchangeRate) }}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    @click="removeSavedItem(item.id)" 
                    class="text-slate-400 hover:text-rose-600 p-2 transition"
                    title="보관함에서 삭제"
                  >
                    <i class="fas fa-trash-alt text-xs"></i>
                  </button>

                </div>

              </div>
            </div>

          </div>

        </section>

      </main>
    </div>

    <!-- ======================================================== -->
    <!-- 3. B2B PURCHASE ORDER MODAL -->
    <!-- ======================================================== -->
    <div v-if="showOrderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 shadow-2xl relative border border-slate-200">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                B2B OFFICIAL ORDER
              </span>
              <h3 class="text-lg font-black text-slate-900">수입 견적 및 발주서 생성</h3>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">선택하신 {{ selectedOrderItems.length }}개 품목에 대한 공식 발주서를 접수합니다.</p>
          </div>
          <button @click="showOrderModal = false" class="text-slate-400 hover:text-slate-600 text-lg p-1">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Selected Items Summary Table -->
        <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
          <div 
            v-for="item in selectedOrderItems" 
            :key="item.id"
            class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
          >
            <div class="flex items-center gap-2.5 truncate">
              <img :src="item.imageUrl" class="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0" />
              <div class="truncate">
                <div class="font-bold text-slate-900 truncate">{{ item.titleKo }}</div>
                <div class="text-[10px] text-slate-500 font-mono">{{ item.orderQty }}개 × ¥{{ item.priceFormatted }}</div>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-bold text-rose-600 font-mono">¥ {{ formatRmb(item.price * item.orderQty) }}</div>
              <div class="font-bold text-indigo-700 font-mono">₩ {{ formatKrw(item.price * item.orderQty * customExchangeRate) }}</div>
            </div>
          </div>
        </div>

        <!-- Order Form Fields -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">수령인 / 상호명 <span class="text-rose-500">*</span></label>
            <input 
              v-model="orderForm.recipientName" 
              type="text" 
              placeholder="예: 이유씨컴퍼니 홍길동"
              class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>
          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">연락처 <span class="text-rose-500">*</span></label>
            <input 
              v-model="orderForm.phone" 
              type="text" 
              placeholder="010-0000-0000"
              class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>
          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">개인통관고유부호 / 사업자번호 <span class="text-rose-500">*</span></label>
            <input 
              v-model="orderForm.customsCode" 
              type="text" 
              placeholder="P로 시작하는 13자리 또는 사업자번호"
              class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>
          <div class="space-y-1.5">
            <label class="font-bold text-slate-700">수령 배송지 주소 <span class="text-rose-500">*</span></label>
            <input 
              v-model="orderForm.address" 
              type="text" 
              placeholder="상세 주소를 입력하세요"
              class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <!-- Total Calculation Box -->
        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div class="flex justify-between text-slate-500">
            <span>총 상품 대금 (위안화):</span>
            <span class="font-mono text-rose-600 font-bold">¥ {{ formatRmb(selectedTotalRmb) }}</span>
          </div>
          <div class="flex justify-between text-slate-500">
            <span>적용 환율:</span>
            <span class="font-mono text-slate-800 font-bold">1 RMB = {{ customExchangeRate }}원</span>
          </div>
          <div class="flex justify-between text-slate-500">
            <span>순수 제품 원화 금액:</span>
            <span class="font-mono text-slate-800 font-bold">₩ {{ formatKrw(selectedTotalKrw) }}</span>
          </div>
          <div class="flex justify-between text-slate-500">
            <span>구매대행 수수료 ({{ agencyFeeRate }}%):</span>
            <span class="font-mono text-indigo-600 font-bold">₩ {{ formatKrw(Math.max(10000, selectedTotalKrw * (agencyFeeRate / 100))) }}</span>
          </div>
          <div class="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span class="font-bold text-slate-900 text-sm">총 발주 예상 금액:</span>
            <span class="text-lg sm:text-xl font-black text-indigo-700 font-mono">
              ₩ {{ formatKrw(selectedTotalKrw + Math.max(10000, selectedTotalKrw * (agencyFeeRate / 100))) }}
            </span>
          </div>
        </div>

        <!-- Submit Buttons -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button 
            @click="showOrderModal = false" 
            class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            취소
          </button>
          <button 
            @click="submitPurchaseOrder" 
            :disabled="isSubmittingOrder"
            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
          >
            <i class="fas fa-spinner fa-spin" v-if="isSubmittingOrder"></i>
            <i class="fas fa-paper-plane" v-else></i>
            <span>공식 발주서 제출하기</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. DEPOSIT WALLET RECHARGE MODAL -->
    <!-- ======================================================== -->
    <div v-if="showDepositModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <i class="fas fa-wallet text-emerald-600"></i> B2B 예치금 즉시 충전
          </h3>
          <button @click="showDepositModal = false" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-slate-700">충전 희망 금액 (원화 KRW)</label>
            <input 
              v-model.number="depositAmountInput" 
              type="number" 
              step="100000"
              class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-emerald-600 font-mono outline-none focus:border-emerald-500"
            />
          </div>

          <div class="grid grid-cols-4 gap-2">
            <button 
              v-for="amt in [1000000, 3000000, 5000000, 10000000]" 
              :key="amt"
              type="button"
              @click="depositAmountInput = amt"
              class="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
            >
              +{{ (amt / 10000).toLocaleString() }}만
            </button>
          </div>

          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-500 space-y-1">
            <div class="flex justify-between">
              <span>위안화 환산 충전액:</span>
              <span class="text-amber-600 font-mono font-black">¥ {{ formatRmb(depositAmountInput / customExchangeRate) }}</span>
            </div>
            <div class="flex justify-between">
              <span>가상계좌 입금은행:</span>
              <span class="text-slate-900 font-bold">기업은행 010-8255-0818 (이유씨)</span>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="showDepositModal = false" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
            취소
          </button>
          <button @click="confirmDeposit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30">
            충전 신청
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { search1688WithTranslation } from '@/services/api1688'
import { fetchSiteSettings } from '@/lib/settings'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { currentUser, userDisplayName } from '@/lib/auth'

// ----------------------------------------------------
// UI Navigation & Layout States
// ----------------------------------------------------
const activeTab = ref('dashboard')
const viewMode = ref('search')
const isMobileMenuOpen = ref(false)
const toastMessage = ref('')

const showToast = (msg) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

const navItems = [
  { id: 'dashboard', name: '메인 대시보드', icon: 'fas fa-chart-pie' },
  { id: 'search', name: '1688 상품 검색', icon: 'fas fa-search' },
  { id: 'saved', name: '내 보관 상품 (발주대기)', icon: 'fas fa-box-archive' },
  { id: 'orders', name: '발주 & 배송 관리', icon: 'fas fa-truck-loading' },
  { id: 'wallet', name: '예치금 지갑', icon: 'fas fa-wallet' },
  { id: 'support', name: '고객센터 & 1:1 MD', icon: 'fas fa-headset' }
]

const switchTab = (tabId) => {
  activeTab.value = tabId
  isMobileMenuOpen.value = false
  if (tabId === 'search') {
    viewMode.value = 'search'
  } else if (tabId === 'saved') {
    viewMode.value = 'saved'
  }
}

// ----------------------------------------------------
// Buyer Profile & Deposit Wallet State (KRW & RMB only)
// ----------------------------------------------------
const buyerProfile = ref({
  name: '홍길동 바이어',
  companyName: '(주)글로벌 커머스',
  bizNumber: '123-45-67890',
  grade: 'VIP PRIME BUYER'
})

const depositWallet = ref({
  krwBalance: 15420000
})

const monthlyImportKrw = ref(42800000)

// ----------------------------------------------------
// EUCHS Exchange Rate & Settings Synchronization
// ----------------------------------------------------
const customExchangeRate = ref(226.19)
const liveMarketRate = ref(206.19)
const agencyFeeRate = ref(8.0)
const isFetchingRate = ref(false)

const reloadSettingsAndRates = async () => {
  isFetchingRate.value = true
  try {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/CNY')
      if (res.ok) {
        const data = await res.json()
        if (data?.rates?.KRW) {
          liveMarketRate.value = Number(data.rates.KRW.toFixed(2))
        }
      }
    } catch (e) {
      console.warn('[LabERP] Live rate fetch fallback:', e)
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
    console.error('[LabERP] Settings fetch error:', err)
  } finally {
    isFetchingRate.value = false
  }
}

// ----------------------------------------------------
// 8-Step Realtime Order Pipeline
// ----------------------------------------------------
const pipelineSteps = ref([
  { id: 'quote', name: '견적대기', count: 3, icon: 'fas fa-file-invoice' },
  { id: 'confirm', name: '고객확인', count: 1, icon: 'fas fa-user-check' },
  { id: 'paid', name: '결제완료', count: 4, icon: 'fas fa-credit-card' },
  { id: 'purchasing', name: '구매진행', count: 2, icon: 'fas fa-shopping-cart' },
  { id: 'stocked', name: '현지입고', count: 5, icon: 'fas fa-warehouse' },
  { id: 'inspected', name: '검수완료', count: 3, icon: 'fas fa-clipboard-check' },
  { id: 'shipping', name: '국제배송', count: 6, icon: 'fas fa-plane-departure' },
  { id: 'completed', name: '통관/완료', count: 18, icon: 'fas fa-box-check' }
])

const currentPipelineFilter = ref(null)

const togglePipelineFilter = (step) => {
  if (currentPipelineFilter.value?.id === step.id) {
    currentPipelineFilter.value = null
  } else {
    currentPipelineFilter.value = step
    showToast(`[${step.name}] 단계 필터링이 적용되었습니다.`)
  }
}

const activeOrderCount = computed(() => {
  return pipelineSteps.value.reduce((sum, s) => sum + s.count, 0)
})

// ----------------------------------------------------
// 1688 Search & DeepL Translation Pipeline
// ----------------------------------------------------
const queryInput = ref('')
const sortOrder = ref('default')
const isLoadingSearch = ref(false)
const hasSearched = ref(false)
const lastQueryKo = ref('')
const lastQueryZh = ref('')
const searchResults = ref([])

const currentProgress = ref({
  step: 1,
  message: ''
})

const sampleKeywords = [
  '여성 여름 린넨 원피스',
  '스테인리스 진공 텀블러',
  '캠핑용 경량 접이식 의자',
  '대용량 고속 보조배터리',
  '스마트워치 마그네틱 스트랩',
  '실리콘 에어프라이어 용기'
]

const executeSearch = async (page = 1) => {
  const query = queryInput.value.trim()
  if (!query) return

  isLoadingSearch.value = true
  viewMode.value = 'search'
  currentProgress.value = {
    step: 1,
    message: `한글 키워드 번역 준비: "${query}"`
  }

  try {
    const result = await search1688WithTranslation(
      query,
      page,
      { sort: sortOrder.value },
      (p) => { currentProgress.value = p }
    )

    searchResults.value = result.items || []
    lastQueryKo.value = result.queryKo || query
    lastQueryZh.value = result.queryZh || ''
    hasSearched.value = true
  } catch (err) {
    console.warn('[LabERP] 1688 Search notice:', err)
  } finally {
    isLoadingSearch.value = false
  }
}

// ----------------------------------------------------
// Saved Items (Cart / Purchase Order Ready Grid)
// ----------------------------------------------------
const savedItems = ref([])
const selectedItemIds = ref([])

const loadSavedItems = () => {
  try {
    const cached = localStorage.getItem('euchs_erp_saved_items')
    if (cached) {
      savedItems.value = JSON.parse(cached)
    } else {
      savedItems.value = [
        {
          id: 'demo_item_1',
          titleKo: '크로스보더 304 스테인리스 보온병 이중 진공 물병 500ml',
          titleZh: '跨境304不锈钢保温杯双层真空手提水壶500ml',
          price: 18.5,
          priceFormatted: '18.50',
          minOrder: 2,
          orderQty: 50,
          imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=60',
          detailUrl: 'https://detail.1688.com/offer/909340143804.html',
          selectedOption: '매트 블랙 / 500ml'
        },
        {
          id: 'demo_item_2',
          titleKo: '여성용 루즈핏 프렌치 린넨 반팔 셔츠 원피스',
          titleZh: '法式复古亚麻短袖衬衫连衣裙宽松休闲女装',
          price: 45.0,
          priceFormatted: '45.00',
          minOrder: 1,
          orderQty: 20,
          imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&auto=format&fit=crop&q=60',
          detailUrl: 'https://detail.1688.com/offer/993182393604.html',
          selectedOption: '내추럴 베이지 / M'
        }
      ]
    }
  } catch (e) {
    savedItems.value = []
  }
  selectedItemIds.value = savedItems.value.map(i => i.id)
}

const saveItemsToStorage = () => {
  try {
    localStorage.setItem('euchs_erp_saved_items', JSON.stringify(savedItems.value))
  } catch (e) {}
}

const isItemSaved = (itemId) => {
  return savedItems.value.some(i => i.id === itemId)
}

const addToSavedItems = (item) => {
  if (isItemSaved(item.id)) {
    showToast('이미 보관함에 담긴 상품입니다.')
    return
  }

  const newItem = {
    ...item,
    orderQty: item.minOrder || 1,
    selectedOption: '표준 옵션'
  }

  savedItems.value.unshift(newItem)
  selectedItemIds.value.push(newItem.id)
  saveItemsToStorage()
  showToast(`[${(item.titleKo || item.titleZh).slice(0, 15)}...] 보관함에 담겼습니다.`)
}

const removeSavedItem = (itemId) => {
  savedItems.value = savedItems.value.filter(i => i.id !== itemId)
  selectedItemIds.value = selectedItemIds.value.filter(id => id !== itemId)
  saveItemsToStorage()
  showToast('선택한 상품이 보관함에서 삭제되었습니다.')
}

const removeSelectedItems = () => {
  savedItems.value = savedItems.value.filter(i => !selectedItemIds.value.includes(i.id))
  selectedItemIds.value = []
  saveItemsToStorage()
  showToast('선택 항목들이 삭제되었습니다.')
}

const adjustItemQty = (item, delta) => {
  const newQty = (item.orderQty || item.minOrder || 1) + delta
  if (newQty >= (item.minOrder || 1)) {
    item.orderQty = newQty
    saveItemsToStorage()
  } else {
    showToast(`최소 주문 수량(MOQ: ${item.minOrder || 1}개) 미만으로 설정할 수 없습니다.`)
  }
}

// ----------------------------------------------------
// Selection & Calculation Computeds
// ----------------------------------------------------
const isAllSelected = computed(() => {
  return savedItems.value.length > 0 && selectedItemIds.value.length === savedItems.value.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItemIds.value = []
  } else {
    selectedItemIds.value = savedItems.value.map(i => i.id)
  }
}

const selectedOrderItems = computed(() => {
  return savedItems.value.filter(i => selectedItemIds.value.includes(i.id))
})

const selectedTotalRmb = computed(() => {
  return selectedOrderItems.value.reduce((sum, item) => {
    return sum + (item.price * (item.orderQty || 1))
  }, 0)
})

const selectedTotalKrw = computed(() => {
  return Math.round(selectedTotalRmb.value * customExchangeRate.value)
})

// ----------------------------------------------------
// Order Modal & Application Submission
// ----------------------------------------------------
const showOrderModal = ref(false)
const isSubmittingOrder = ref(false)

const orderForm = ref({
  recipientName: '',
  phone: '',
  customsCode: '',
  address: ''
})

const openOrderModal = () => {
  if (currentUser.value) {
    orderForm.value.recipientName = userDisplayName.value || buyerProfile.value.name
    orderForm.value.phone = currentUser.value.user_metadata?.phone || '010-1234-5678'
    orderForm.value.customsCode = currentUser.value.user_metadata?.pccc || 'P123456789012'
  }
  showOrderModal.value = true
}

const submitPurchaseOrder = async () => {
  if (!orderForm.value.recipientName || !orderForm.value.phone || !orderForm.value.address) {
    alert('수령인, 연락처, 배송지 주소를 모두 입력해 주세요.')
    return
  }

  isSubmittingOrder.value = true
  try {
    const feeKrw = Math.max(10000, Math.round(selectedTotalKrw.value * (agencyFeeRate.value / 100)))
    const grandTotal = selectedTotalKrw.value + feeKrw

    if (isSupabaseConfigured()) {
      await supabase.from('applications').insert([
        {
          service_type: '1688_b2b_order',
          service_name: `1688 B2B 수입 발주 (${selectedOrderItems.value.length}개 품목)`,
          customer_name: orderForm.value.recipientName,
          phone: orderForm.value.phone,
          email: currentUser.value?.email || 'buyer@euchs.co.kr',
          user_id: currentUser.value?.id || null,
          status: '견적대기',
          total_amount: grandTotal,
          memo: `[통관고유부호] ${orderForm.value.customsCode} | [배송지] ${orderForm.value.address}`,
          details: {
            exchangeRate: customExchangeRate.value,
            totalRmb: selectedTotalRmb.value,
            totalKrw: selectedTotalKrw.value,
            agencyFeeRate: agencyFeeRate.value,
            agencyFeeKrw: feeKrw,
            items: selectedOrderItems.value.map(i => ({
              id: i.id,
              titleKo: i.titleKo,
              titleZh: i.titleZh,
              priceRmb: i.price,
              qty: i.orderQty,
              subtotalRmb: i.price * i.orderQty,
              subtotalKrw: Math.round(i.price * i.orderQty * customExchangeRate.value),
              detailUrl: i.detailUrl,
              imageUrl: i.imageUrl
            }))
          }
        }
      ])
    }

    const quoteStep = pipelineSteps.value.find(s => s.id === 'quote')
    if (quoteStep) quoteStep.count += 1

    savedItems.value = savedItems.value.filter(i => !selectedItemIds.value.includes(i.id))
    selectedItemIds.value = []
    saveItemsToStorage()

    showOrderModal.value = false
    showToast('공식 수입 견적 및 발주서가 성공적으로 접수되었습니다!')
  } catch (err) {
    console.error('[LabERP] Order submit error:', err)
    showToast('발주서 접수 중 오류가 발생했습니다.')
  } finally {
    isSubmittingOrder.value = false
  }
}

// ----------------------------------------------------
// Deposit Wallet Recharge Modal
// ----------------------------------------------------
const showDepositModal = ref(false)
const depositAmountInput = ref(3000000)

const openDepositModal = () => {
  depositAmountInput.value = 3000000
  showDepositModal.value = true
}

const confirmDeposit = () => {
  depositWallet.value.krwBalance += depositAmountInput.value
  showDepositModal.value = false
  showToast(`₩ ${formatKrw(depositAmountInput.value)}원 충전 신청이 완료되었습니다.`)
}

// ----------------------------------------------------
// Formatters & Fallback Helpers
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

onMounted(() => {
  reloadSettingsAndRates()
  loadSavedItems()
})
</script>
