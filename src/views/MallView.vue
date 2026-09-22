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
    <!-- 1. MALL 2-TIER STICKY SEARCH & CATEGORY BAR              -->
    <!-- ======================================================== -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 py-2.5 sm:py-3 transition-all duration-200">
      <div class="max-w-[1720px] mx-auto px-2 sm:px-6 lg:px-8">
        
        <!-- 메인 한 줄 바: [카테고리] + [1688 와이드 검색창] + [보관함] -->
        <div class="flex items-center justify-center gap-1.5 sm:gap-4 relative" ref="categoryNavRef" id="mall-category-bar" @mouseleave="handleMegaMenuLeave">
          
          <!-- 1. [☰ 카테고리 ▾] 주황색 버튼 (오르간 메가메뉴) -->
          <div class="relative shrink-0">
            <button
              type="button"
              data-tour="category-btn"
              @click.stop="toggleMegaMenu"
              @mouseenter="openMegaMenuOnHover"
              class="h-10 sm:h-11 px-2.5 sm:px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/25 transition-all flex items-center gap-1 sm:gap-1.5 touch-manipulation select-none whitespace-nowrap cursor-pointer shrink-0"
            >
              <i class="fas fa-bars text-xs sm:text-sm"></i>
              <span>카테고리</span>
              <i
                class="fas fa-chevron-down text-[9px] sm:text-[10px] transition-transform duration-200"
                :class="isMegaMenuOpen ? 'rotate-180' : ''"
              ></i>
            </button>

            <!-- ── 2단 오르간(Organ) 메가메뉴 드롭다운 패널 ── -->
            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-if="isMegaMenuOpen"
                class="absolute left-0 top-full mt-2 w-[320px] sm:w-[540px] md:w-[720px] lg:w-[860px] xl:w-[960px] bg-white rounded-2xl shadow-2xl border border-gray-200/90 z-50 overflow-hidden"
                style="max-height: 70vh;"
                @mouseenter="clearMegaMenuTimer"
                @mouseleave="handleMegaMenuLeave"
              >
                <div class="flex" style="min-height: 320px; max-height: 70vh;">

                  <!-- 1단: 좌측 대분류 목록 (세로 리스트) -->
                  <div class="shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto" style="width: 200px;">
                    <div class="py-2">
                      <button
                        v-for="cat in categories"
                        :key="cat.id"
                        type="button"
                        @mouseenter="handleMegaCatHover(cat)"
                        @click.stop="handleMegaCatClick(cat)"
                        :class="[
                          'w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition-all touch-manipulation select-none',
                          activeMegaCat?.id === cat.id
                            ? 'bg-orange-50 text-orange-600 font-bold border-l-4 border-orange-500 pl-3'
                            : 'text-gray-700 hover:bg-white hover:text-orange-500 border-l-4 border-transparent'
                        ]"
                      >
                        <span class="text-base leading-none shrink-0">{{ cat.emoji }}</span>
                        <span class="text-xs leading-tight">{{ cat.name }}</span>
                        <i class="fas fa-chevron-right text-[9px] ml-auto opacity-40"></i>
                      </button>
                    </div>
                  </div>

                  <!-- 2단: 우측 소분류 패널 -->
                  <div class="flex-1 overflow-y-auto p-5">
                    <template v-if="activeMegaCat">
                      <!-- 패널 헤더 -->
                      <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <div class="flex items-center gap-2">
                          <span class="text-xl">{{ activeMegaCat.emoji }}</span>
                          <div>
                            <h4 class="text-sm font-black text-gray-900">{{ activeMegaCat.name }}</h4>
                            <p class="text-[11px] text-gray-400">1688 공식 소싱 카테고리</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          @click.stop="selectCategory(activeMegaCat)"
                          class="flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600 hover:underline transition touch-manipulation"
                        >
                          <span>전체 검색</span>
                          <i class="fas fa-arrow-right text-[9px]"></i>
                        </button>
                      </div>

                      <!-- 중분류 그룹 & 소분류 태그 그리드 -->
                      <div class="space-y-4">
                        <div
                          v-for="(group, gIdx) in activeMegaCat.groups"
                          :key="gIdx"
                        >
                          <!-- 중분류 제목 -->
                          <div class="flex items-center gap-2 mb-2">
                            <span class="w-1 h-4 bg-orange-500 rounded-full shrink-0"></span>
                            <span class="text-xs font-black text-gray-800">{{ group.title }}</span>
                          </div>
                          <!-- 소분류 칩 태그 -->
                          <div class="flex flex-wrap gap-1.5">
                            <button
                              v-for="(subItem, sIdx) in group.items"
                              :key="sIdx"
                              type="button"
                              @click.stop="handleSubCategoryClick(subItem, activeMegaCat, group.title)"
                              class="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-orange-500 hover:text-white text-gray-700 font-medium text-xs border border-gray-200 hover:border-orange-500 transition shadow-xs hover:shadow-md active:scale-95 cursor-pointer touch-manipulation whitespace-nowrap"
                            >
                              {{ subItem }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </template>

                    <!-- 카테고리 미선택 기본 상태 -->
                    <div v-else class="h-full flex items-center justify-center text-gray-400 text-sm">
                      <div class="text-center space-y-2">
                        <i class="fas fa-hand-pointer text-3xl text-orange-200"></i>
                        <p>좌측 카테고리를 선택하세요</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </transition>
          </div>

          <!-- 2. 1688 한글/URL 와이드 검색 입력창 + [📷 사진] + [🔍 1688 검색] -->
          <form data-tour="search-bar" @submit.prevent="executeSearch(1)" class="flex-1 min-w-0 max-w-[680px]">
            <!-- 이미지 검색 결과 모드 미리보기 뱃지 -->
            <div v-if="isImageSearchMode" class="flex items-center gap-2 mb-1.5">
              <div class="flex items-center gap-2 pl-2 pr-1 py-1 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-medium">
                <img
                  v-if="imageSearchPreviewUrl"
                  :src="imageSearchPreviewUrl"
                  alt="사진 검색 미리보기"
                  class="w-6 h-6 rounded object-cover border border-orange-200"
                />
                <i v-else class="fas fa-image text-orange-400"></i>
                <span v-if="isImageUploading">
                  <i class="fas fa-spinner fa-spin mr-1"></i>이미지 검색 중...
                </span>
                <span v-else>📷 사진 유사 상품 검색 결과</span>
                <button
                  type="button"
                  @click="resetImageSearch"
                  class="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-orange-200 hover:bg-orange-400 text-orange-700 hover:text-white transition text-xs"
                  title="이미지 검색 취소"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <!-- 검색 입력창 & 단독 버튼 묶음 -->
            <div class="flex-1 min-w-0 flex items-center gap-1 sm:gap-2">
              <div class="relative flex-1 min-w-0 flex items-center">
                <i class="fas fa-search text-orange-400 text-xs sm:text-sm absolute left-2.5 sm:left-3.5 pointer-events-none"></i>
                <input
                  v-model="queryInput"
                  @keydown.enter.prevent="executeSearch(1)"
                  type="text"
                  placeholder="사진검색, 1688 한글 상품명/링크(URL)"
                  class="flex-1 min-w-0 w-full h-10 sm:h-11 pl-8 sm:pl-10 pr-7 sm:pr-8 rounded-xl border-2 border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition bg-white shadow-xs"
                  :disabled="isLoading"
                />
                <button
                  v-if="queryInput"
                  type="button"
                  @click="queryInput = ''"
                  class="absolute right-2 sm:right-2.5 text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
                >
                  <i class="fas fa-times-circle text-xs"></i>
                </button>
              </div>

              <!-- 📷 사진 검색 버튼 -->
              <button
                type="button"
                @click="openImageSearchModal"
                :disabled="isLoading && !isImageSearchMode"
                class="shrink-0 h-10 sm:h-11 px-2 sm:px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 text-xs sm:text-sm cursor-pointer shadow-xs disabled:opacity-50"
                title="1688 사진/이미지로 검색"
              >
                <i class="fas fa-spinner fa-spin text-xs" v-if="isImageUploading"></i>
                <i class="fas fa-camera text-xs sm:text-sm" v-else></i>
                <span class="hidden sm:inline">사진</span>
              </button>

              <!-- 🔍 1688 검색 버튼 -->
              <button
                type="submit"
                :disabled="isLoading || !queryInput.trim()"
                class="shrink-0 h-10 sm:h-11 px-2.5 sm:px-5 bg-rose-400 hover:bg-rose-500 active:bg-rose-600 text-white font-bold rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 shadow-xs transition active:scale-95 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                <i class="fas fa-spinner fa-spin text-xs" v-if="isLoading && !isImageUploading"></i>
                <i class="fas fa-search text-xs" v-else></i>
                <span><span class="hidden sm:inline">1688 </span>검색</span>
              </button>
            </div>
          </form>

          <!-- 📷 이미지 검색 전용 모달 -->
          <ImageSearchModal
            v-model="isImageModalOpen"
            @search-start="onImageSearchStart"
            @search-done="onImageSearchDone"
            @search-error="onImageSearchError"
          />

        </div>

        <!-- 4. 서브 바: 퀵 카테고리 탭 + 마이페이지 버튼 -->
        <!--
          PC(sm+): sm:justify-center → 탭+버튼 그룹 정중앙 정렬
          [좌] 탭 목록: overflow-x-auto 가로 스크롤, 탭 내용만큼 너비
          [우] 버튼: shrink-0, 항상 노출
               모바일: "주문발주" (짧게) + 테두리/음영으로 배경과 경계
               PC(sm+): "마이페이지"
        -->
        <div class="mt-2 pt-2 border-t border-gray-100 flex items-center w-full sm:justify-center">

          <!-- [좌] 퀵 카테고리 탭 (가로 스크롤) -->
          <!-- 모바일: text-[11px] px-2로 축소하여 공간 확보 / PC: text-xs px-3 원본 유지 -->
          <div class="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-2 sm:px-0 min-w-0 scroll-smooth">
            <button
              v-for="qt in quickTabs"
              :key="qt.id"
              type="button"
              @click.stop="selectQuickTab(qt)"
              :class="[
                'shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all touch-manipulation select-none cursor-pointer',
                selectedCategoryId === qt.id
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              ]"
            >
              <span>{{ qt.emoji }}</span>
              <span>{{ qt.label }}</span>
            </button>
          </div>

          <!-- [우] 마이페이지 버튼 -->
          <!-- shrink-0: 탭 스크롤에도 항상 노출 -->
          <!-- amber(노란색 계열) 배경 + ring-pulse 애니메이션으로 카테고리 탭과 확실히 구분 -->
          <!-- 모바일: 아이콘 + "주문발주" / PC(sm+): 아이콘 + "마이페이지" -->
          <router-link
            to="/dashboard"
            class="mall-mypage-btn shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 ml-1.5 sm:ml-2 text-[11px] sm:text-xs font-bold whitespace-nowrap touch-manipulation select-none cursor-pointer text-amber-900 bg-amber-400 hover:bg-amber-500 rounded-lg border border-amber-300 transition-colors mr-1 sm:mr-0"
            title="마이페이지"
            aria-label="마이페이지"
          >
            <i class="fas fa-user text-[10px] sm:text-xs"></i>
            <span class="sm:hidden">주문발주</span>
            <span class="hidden sm:inline">마이페이지</span>
          </router-link>

        </div>

      </div>
    </header>

    <!-- ======================================================== -->
    <!-- 2. 2-COLUMN LAYOUT: LNB SIDEBAR + RIGHT MAIN CONTENT     -->
    <!-- ======================================================== -->
    <div class="flex gap-0 min-h-screen w-full max-w-[1720px] mx-auto px-2 lg:px-4 py-3 sm:py-4 items-start">

      <!-- ====================================================== -->
      <!-- LEFT: LNB SIDEBAR (고정 PC 전용 - 독립 스크롤 적용) -->
      <!-- ====================================================== -->
      <aside 
        class="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col gap-3 sticky top-[7.5rem] self-start mr-4 max-h-[calc(100vh-8.5rem)] overflow-y-auto overscroll-contain pr-1.5 custom-sidebar-scroll"
        style="position: sticky; top: 7.5rem;"
      >

        <!-- Profile Mini Card -->
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden shrink-0">
          <div class="p-4 bg-slate-50/80 border-b border-slate-200">
            <!-- 로그인 상태 -->
            <div v-if="isLoggedIn" class="flex items-center gap-3">
              <img
                v-if="userAvatarUrl"
                :src="userAvatarUrl"
                :alt="displayBuyerName"
                class="w-10 h-10 rounded-2xl object-cover border border-orange-200 shadow-sm shrink-0"
              />
              <div
                v-else
                class="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-black flex items-center justify-center text-base shadow-sm shrink-0"
              >
                {{ (displayBuyerName || 'E').charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-bold text-gray-900 text-sm truncate">{{ displayBuyerName }}</span>
                    <span class="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[11px] font-black shrink-0">
                      {{ isBusinessVerified ? 'VIP' : '회원' }}
                    </span>
                  </div>
                  <button
                    type="button"
                    @click="handleMallSignOut"
                    class="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                    title="로그아웃"
                  >
                    <i class="fas fa-sign-out-alt text-xs"></i>
                  </button>
                </div>
                <p class="text-xs text-gray-500 font-mono truncate">{{ displayBuyerEmail }}</p>
              </div>
            </div>

            <!-- 비로그인 상태 -->
            <div v-else class="space-y-2.5">
              <div class="flex items-center gap-2.5 text-gray-500">
                <div class="w-10 h-10 rounded-2xl bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold shrink-0">
                  <i class="fas fa-user-lock"></i>
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-gray-800 text-xs">로그인이 필요합니다</div>
                  <div class="text-[11px] text-gray-400">B2B 수입대행 ERP 서비스</div>
                </div>
              </div>
              <button
                type="button"
                @click="openLoginModal('login')"
                class="w-full py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i class="fas fa-sign-in-alt text-[10px]"></i>
                <span>로그인하기</span>
              </button>
            </div>

            <!-- 전담 매니저 표시 -->
            <div v-if="isLoggedIn" class="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between text-xs">
              <span class="text-gray-500 font-medium">전담 매니저</span>
              <span class="font-bold text-gray-800 flex items-center gap-1">
                <i class="fas fa-headset text-orange-500"></i> 이유씨 1:1 배정
              </span>
            </div>
          </div>

          <!-- 예치금 잔액 카드 -->
          <div v-if="isLoggedIn" class="px-4 py-3 flex items-center justify-between text-xs border-b border-slate-100">
            <span class="text-gray-500 font-medium">예치금 잔액</span>
            <router-link to="/dashboard/account?tab=deposit" class="font-black text-emerald-600 font-mono hover:underline">
              ₩ {{ formatKrw(depositBalanceKrw) }}
            </router-link>
          </div>

          <!-- LNB Navigation Tree -->
          <nav class="p-3 space-y-1 text-xs">

            <!-- 1. 메인 (대시보드) - 단일 클릭 -->
            <router-link
              to="/dashboard"
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left"
              :class="route.path === '/dashboard' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500 shadow-xs' : 'text-gray-700 hover:bg-gray-100 font-medium'"
            >
              <div class="flex items-center gap-2.5">
                <i class="fas fa-chart-pie text-base" :class="route.path === '/dashboard' ? 'text-amber-500' : 'text-gray-400'"></i>
                <span>메인 (대시보드)</span>
              </div>
              <span class="px-1.5 py-0.2 text-[11px] rounded bg-amber-500 text-slate-950 font-black">ERP</span>
            </router-link>

            <!-- 2. 상품관리 (아코디언) -->
            <div class="space-y-0.5 pt-1">
              <button
                type="button"
                @click="toggleMenu('products')"
                class="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition text-left"
                :class="route.path.startsWith('/mall') || route.path.startsWith('/dashboard/cart') || route.path.startsWith('/dashboard/sourcing-products') || route.path.startsWith('/dashboard/categories') || route.path.startsWith('/dashboard/labels') || route.path.startsWith('/dashboard/stores') ? 'text-amber-600' : ''"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-boxes-stacked text-sm" :class="route.path.startsWith('/mall') || route.path.startsWith('/dashboard/cart') || route.path.startsWith('/dashboard/sourcing-products') || route.path.startsWith('/dashboard/categories') || route.path.startsWith('/dashboard/labels') || route.path.startsWith('/dashboard/stores') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span>상품관리</span>
                </div>
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-200" :class="expandedMenus.products ? 'rotate-180 text-amber-500' : 'text-gray-400'"></i>
              </button>

              <!-- Submenu Items (2종 통합) -->
              <div v-show="expandedMenus.products" class="pl-7 pr-1 py-1 space-y-0.5 transition-all">
                <!-- 📋 내상품리스트 -->
                <router-link
                  to="/dashboard/sourcing-products"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/sourcing-products' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <div class="flex items-center gap-1.5">
                    <span>📋</span>
                    <span>내상품리스트</span>
                  </div>
                  <span class="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black">주요</span>
                </router-link>
                <!-- 🛒 장바구니 -->
                <router-link
                  to="/dashboard/cart"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/cart' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <div class="flex items-center gap-1.5">
                    <span>🛒</span>
                    <span>장바구니</span>
                  </div>
                  <span
                    v-if="isLoggedIn && savedCount > 0"
                    class="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black font-mono shadow-xs"
                  >
                    {{ savedCount }}
                  </span>
                </router-link>
              </div>
            </div>

            <!-- 3. 발주관리 (아코디언) -->
            <div class="space-y-0.5 pt-1">
              <button
                type="button"
                @click="toggleMenu('orders')"
                class="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition text-left"
                :class="route.path.startsWith('/dashboard/orders') ? 'text-amber-600' : ''"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-clipboard-list text-sm" :class="route.path.startsWith('/dashboard/orders') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span>발주관리</span>
                </div>
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-200" :class="expandedMenus.orders ? 'rotate-180 text-amber-500' : 'text-gray-400'"></i>
              </button>

              <!-- Submenu Items -->
              <div v-show="expandedMenus.orders" class="pl-7 pr-1 py-1 space-y-0.5 transition-all">
                <router-link
                  to="/dashboard/orders"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && (!route.query.tab || route.query.tab === 'all') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>내 주문 (주문/발주 통합 관리)</span>
                  <span class="font-mono text-blue-600 text-xs font-bold">({{ orderStats.inProgress }})</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=quote"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && (route.query.tab === 'quote' || route.query.tab === 'quote_pending') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>견적 요청/대기</span>
                  <span class="font-mono text-amber-600 text-xs font-bold">({{ quotePendingCount }})</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=payment"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && (route.query.tab === 'payment' || route.query.tab === 'quote_confirmed') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>결제대기</span>
                  <span class="font-mono text-orange-600 text-xs font-bold">({{ paymentPendingCount }})</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=payment_verified"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && (route.query.tab === 'payment_verified' || route.query.tab === 'verified') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>결제확인</span>
                  <span class="font-mono text-emerald-600 text-xs font-bold">({{ paymentVerifiedCount }})</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=purchasing"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && route.query.tab === 'purchasing' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>1688 구매 진행중</span>
                  <span class="font-mono text-blue-600 text-xs font-bold">({{ purchasingCount }})</span>
                </router-link>
                <router-link
                  to="/dashboard/cancelled"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/cancelled' ? 'bg-rose-500/10 text-rose-600 font-bold border-r-2 border-rose-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>취소·반품 내역</span>
                  <span v-if="orderStats.cancelled > 0" class="font-mono text-rose-500 text-xs font-bold">({{ orderStats.cancelled }})</span>
                </router-link>
              </div>

            </div>

            <!-- 4. EUC 창고 (아코디언) -->
            <div class="space-y-0.5 pt-1">
              <div
                class="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-50 transition text-left cursor-pointer group"
                :class="route.path.startsWith('/dashboard/warehouse') ? 'text-amber-600 font-bold' : 'font-medium'"
              >
                <!-- 대분류 클릭 시 /dashboard/warehouse 기본 페이지로 이동 -->
                <router-link
                  to="/dashboard/warehouse"
                  class="flex items-center gap-2.5 flex-1 min-w-0"
                  @click.stop
                >
                  <i class="fas fa-warehouse text-sm" :class="route.path.startsWith('/dashboard/warehouse') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span class="truncate">이우 물류센터 입고/검수</span>
                </router-link>
                <!-- 아코디언 펼침/접힘 토글 버튼 -->
                <button
                  type="button"
                  @click="toggleMenu('warehouse')"
                  class="p-1 -mr-1 rounded-md hover:bg-gray-200/60 text-gray-400 transition"
                  title="하위 메뉴 토글"
                >
                  <i class="fas fa-chevron-down text-[10px] transition-transform duration-200" :class="expandedMenus.warehouse ? 'rotate-180 text-amber-500' : 'text-gray-400'"></i>
                </button>
              </div>

              <!-- Submenu Items: 4개 탭 연동 -->
              <div v-show="expandedMenus.warehouse" class="pl-7 pr-1 py-1 space-y-0.5 transition-all">
                <router-link
                  to="/dashboard/warehouse?tab=pending_inbound"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/warehouse' && route.query.tab === 'pending_inbound' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>배송중</span>
                  <span class="font-mono text-amber-600 text-xs font-bold">({{ warehouseTabCounts.pending_inbound }})</span>
                </router-link>
                <router-link
                  to="/dashboard/warehouse?tab=arrival_done"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/warehouse' && route.query.tab === 'arrival_done' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>현지입고완료</span>
                  <span class="font-mono text-blue-600 text-xs font-bold">({{ warehouseTabCounts.arrival_done }})</span>
                </router-link>
                <router-link
                  to="/dashboard/warehouse?tab=inbound_weighed"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/warehouse' && (route.query.tab === 'inbound_weighed' || route.query.tab === 'inspection') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>실측&검수완료</span>
                  <span class="font-mono text-teal-600 text-xs font-bold">({{ warehouseTabCounts.inbound_weighed }})</span>
                </router-link>
                <router-link
                  to="/dashboard/warehouse?tab=ready_to_ship"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/warehouse' && (route.query.tab === 'ready_to_ship' || route.query.tab === 'shipping_ready') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>한국행 선적대기</span>
                  <span class="font-mono text-purple-600 text-xs font-bold">({{ warehouseTabCounts.ready_to_ship }})</span>
                </router-link>
              </div>
            </div>

            <!-- 5. 수입 통관 & 국내배송 (아코디언) -->
            <div class="space-y-0.5 pt-1">
              <button
                type="button"
                @click="toggleMenu('shipping')"
                class="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition text-left"
                :class="route.path.startsWith('/dashboard/logistics') ? 'text-amber-600' : ''"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-ship text-sm" :class="route.path.startsWith('/dashboard/logistics') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span>수입 통관 & 국내배송</span>
                </div>
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-200" :class="expandedMenus.shipping ? 'rotate-180 text-amber-500' : 'text-gray-400'"></i>
              </button>

              <!-- Submenu Items -->
              <div v-show="expandedMenus.shipping" class="pl-7 pr-1 py-1 space-y-0.5 transition-all">
                <router-link
                  to="/dashboard/logistics"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/logistics' && !route.query.tab ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>세관 통관 조회 / C/O</span>
                  <i class="fas fa-link text-[9px] text-gray-400"></i>
                </router-link>
                <router-link
                  to="/dashboard/logistics?tab=shipping"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/logistics' && route.query.tab === 'shipping' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>국내 화물 운송장 추적</span>
                </router-link>
              </div>
            </div>

            <!-- 6. 계정센터 (아코디언) -->
            <div class="space-y-0.5 pt-1">
              <button
                type="button"
                @click="toggleMenu('account')"
                class="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition text-left"
                :class="route.path.startsWith('/dashboard/account') ? 'text-amber-600' : ''"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-id-card text-sm" :class="route.path.startsWith('/dashboard/account') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span>계정센터</span>
                </div>
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-200" :class="expandedMenus.account ? 'rotate-180 text-amber-500' : 'text-gray-400'"></i>
              </button>

              <!-- Submenu Items -->
              <div v-show="expandedMenus.account" class="pl-7 pr-1 py-1 space-y-0.5 transition-all">
                <router-link
                  to="/dashboard/account?tab=address"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/account' && (!route.query.tab || route.query.tab === 'address') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>기본/추가 수령 주소지</span>
                </router-link>
                <router-link
                  to="/dashboard/account?tab=pccc"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/account' && route.query.tab === 'pccc' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>사업자 / 통관부호 관리</span>
                </router-link>
                <router-link
                  to="/dashboard/account?tab=deposit"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/account' && route.query.tab === 'deposit' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>예치금 충전 / 환불 관리</span>
                </router-link>
              </div>
            </div>

            <!-- 7. 공지사항 -->
            <div class="pt-1">
              <router-link
                to="/community/notice"
                class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left"
                :class="route.path.startsWith('/community/notice') || route.path.startsWith('/notice') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500 shadow-xs' : 'text-gray-700 hover:bg-gray-100 font-medium'"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-bullhorn text-sm" :class="route.path.startsWith('/community/notice') || route.path.startsWith('/notice') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span>공지사항</span>
                </div>
                <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">새소식</span>
              </router-link>
            </div>

            <!-- 8. 사이트 이용가이드 -->
            <div class="pt-0.5">
              <router-link
                to="/support/guide"
                class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left"
                :class="route.path.startsWith('/support/guide') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500 shadow-xs' : 'text-gray-700 hover:bg-gray-100 font-medium'"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-book-open text-sm" :class="route.path.startsWith('/support/guide') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span>사이트 이용가이드</span>
                </div>
                <span class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">가이드</span>
              </router-link>
            </div>

          </nav>
        </div>

        <!-- 💡 사용가이드 버튼 -->
        <button
          type="button"
          @click="$emit('open-onboarding'); window.dispatchEvent(new Event('euchs:open-onboarding'))"
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition cursor-pointer mb-3 shrink-0"
        >
          <span>💡</span>
          <span>사용가이드 다시 보기</span>
        </button>

        <!-- 하단 카카오 상담 CTA -->
        <div class="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs shrink-0">
          <div class="flex items-center gap-2 text-orange-400 font-bold">
            <i class="fas fa-comment-dots text-sm"></i>
            <span>1:1 전담 카카오톡 상담</span>
          </div>
          <p class="text-slate-300 text-xs leading-relaxed">
            대량 발주, 특수 검수, 맞춤 OEM 제작 문의는 전담 매니저에게 실시간 문의하세요.
          </p>
          <a
            href="http://pf.kakao.com/_xmQWsK/chat"
            target="_blank"
            class="block w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-center rounded-xl transition text-xs"
          >
            카카오톡 상담하기
          </a>
        </div>

      </aside>

      <!-- ====================================================== -->
      <!-- RIGHT: MAIN SOURCING MALL CONTENT                       -->
      <!-- ====================================================== -->
      <main class="flex-1 min-w-0 space-y-4 sm:space-y-6">


      <!-- ============================================================ -->
      <!-- 배너 롤링 섹션 (DB 기반 동적 배너, fallback: 기존 3-카드)    -->
      <!-- ============================================================ -->
      <MallBanner
        :deposit-balance="depositBalanceKrw"
        :exchange-rate="customExchangeRate"
        :latest-notice="latestMallNotice"
        @search="(keyword) => { queryInput = keyword; executeSearch(1) }"
        @open-notice="openNoticeModal"
      />

      <!-- ============================================================ -->
      <!-- 카테고리 이미지 카드 그리드 (전체 대분류 9개)                -->
      <!-- ============================================================ -->
      <MallCategoryGrid
        :display-categories="categoryCardsForGrid"
        @select="(cat) => selectCategory(cat, 'quick')"
      />

      <!-- ============================================================ -->
      <!-- HOME: CN인사이더 스타일 다단 섹션 (검색어 없을 때 = 홈 뷰)  -->
      <!-- ============================================================ -->
      <template v-if="!hasSearched && !isLoading && !isImageSearchMode">

        <!-- 최근 본 상품 섹션 (로그인 사용자 전용) -->
        <MallRecentlyViewed
          ref="recentlyViewedRef"
          @open="openProductModal"
        />

        <!-- 섹션 스켈레톤 (첫 API 호출 중) -->
        <div v-if="isHomeSectionsLoading" class="space-y-8">
          <div v-for="sk in 6" :key="sk" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div class="space-y-2">
                <div class="h-5 w-52 bg-gray-200 rounded-lg animate-pulse"></div>
                <div class="h-3 w-64 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div class="h-8 w-20 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div v-for="j in 8" :key="j" class="bg-gray-50 rounded-xl border border-gray-100 p-3 animate-pulse space-y-2">
                  <div class="aspect-square bg-gray-200 rounded-xl"></div>
                  <div class="h-3.5 bg-gray-200 rounded w-3/4"></div>
                  <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6개 테마 섹션 블록 (CN인사이더 스타일: 섹션 테마 배너 + 상품그리드, 좌/우 번갈아 배치) -->
        <div v-else-if="homeSections.length > 0" class="space-y-6 sm:space-y-8">
          <section
            v-for="(section, sIdx) in homeSections"
            :key="section.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <!-- 섹션 헤더 -->
            <div class="px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/80">
              <div class="flex items-start gap-3 min-w-0">
                <div class="min-w-0">
                  <h2 class="text-sm sm:text-base font-black text-gray-900 leading-tight">{{ section.title }}</h2>
                  <p class="text-xs text-gray-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>{{ section.subtitle }}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="searchBySection(section)"
                class="shrink-0 flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap ml-3"
              >
                더보기 <i class="fas fa-chevron-right text-[9px]"></i>
              </button>
            </div>

            <!-- 섹션 테마 배너(왼/오 번갈아) + 상품 카드 그리드 -->
            <div class="p-3 sm:p-4">
              <div
                class="flex flex-col gap-3 sm:gap-4"
                :class="sIdx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'"
              >
                <!-- 섹션 테마 배너 (관리자가 banners.section_key로 직접 편집, 미등록 시 미노출) -->
                <div
                  v-if="sectionBanners[section.id]"
                  class="aspect-video lg:aspect-[4/9] lg:w-[280px] xl:w-[320px] self-start shrink-0 rounded-2xl overflow-hidden relative flex flex-col justify-between p-5 text-white"
                  :style="sectionBanners[section.id].image_url
                    ? `background: url('${sectionBanners[section.id].image_url}') center/cover no-repeat;`
                    : `background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);`"
                >
                  <div class="space-y-2 relative z-10">
                    <span v-if="sectionBanners[section.id].label" class="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase inline-block">
                      {{ sectionBanners[section.id].label }}
                    </span>
                    <h4 v-if="sectionBanners[section.id].heading" class="text-base sm:text-lg font-black leading-tight">
                      {{ sectionBanners[section.id].heading }}
                    </h4>
                    <p v-if="sectionBanners[section.id].description" class="text-xs text-white/80 leading-relaxed line-clamp-3">
                      {{ sectionBanners[section.id].description }}
                    </p>
                  </div>
                  <div class="pt-4 relative z-10">
                    <component
                      :is="isSectionBannerExternal(sectionBanners[section.id]) ? 'a' : 'router-link'"
                      v-if="sectionBanners[section.id].button_text || sectionBanners[section.id].button_url || sectionBanners[section.id].link_url"
                      :to="!isSectionBannerExternal(sectionBanners[section.id]) ? (sectionBanners[section.id].button_url || sectionBanners[section.id].link_url) : undefined"
                      :href="isSectionBannerExternal(sectionBanners[section.id]) ? (sectionBanners[section.id].button_url || sectionBanners[section.id].link_url) : undefined"
                      :target="isSectionBannerExternal(sectionBanners[section.id]) ? '_blank' : undefined"
                      class="w-full py-2.5 px-4 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                    >
                      <span>{{ sectionBanners[section.id].button_text || '자세히 보기' }}</span>
                      <i class="fas fa-arrow-right text-[10px]"></i>
                    </component>
                  </div>
                </div>

                <!-- 상품 카드 그리드 (4열 반응형, 배너 미등록 시 전체 너비) -->
                <div class="flex-1 min-w-0">
                  <div
                    v-if="section.items && section.items.length > 0"
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3"
                  >
                    <div
                      v-for="item in section.items"
                      :key="item.id"
                      @click="openProductModal(item)"
                      class="group bg-white rounded-xl border border-gray-200 hover:border-orange-400 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
                    >
                      <!-- 썸네일 -->
                      <div class="relative aspect-square bg-gray-100 overflow-hidden">
                        <img
                          :src="item.imageUrl || item.pic_url || item.img || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'"
                          :alt="item.titleKo || item.title || item.titleZh"
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          referrerpolicy="no-referrer"
                          @error="handleImageError"
                        />
                        <!-- 1688 오렌지 뱃지 -->
                        <div class="absolute top-2 left-2">
                          <span class="px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black shadow-sm tracking-wide">
                            1688
                          </span>
                        </div>
                        <!-- MOQ 뱃지 -->
                        <div v-if="item.minOrder && item.minOrder > 1" class="absolute top-2 right-2">
                          <span class="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                            MOQ {{ item.minOrder }}
                          </span>
                        </div>
                        <!-- 구매대행 신청 호버 오버레이 -->
                        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent py-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span class="text-white text-[11px] font-bold flex items-center gap-1">
                            <i class="fas fa-shopping-cart text-amber-400 text-[9px]"></i>
                            구매대행 신청
                          </span>
                        </div>
                      </div>

                      <!-- 카드 정보 -->
                      <div class="p-2.5 sm:p-3 space-y-1.5">
                        <h3
                          class="text-xs sm:text-[12px] font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-orange-600 transition"
                          :title="item.titleKo || item.title || item.titleZh"
                        >
                          {{ item.titleKo || item.title || item.titleZh }}
                        </h3>
                        <div class="pt-1.5 border-t border-gray-100">
                          <div class="flex items-baseline gap-1 font-mono">
                            <span class="text-red-600 font-bold text-sm tracking-tight">
                              ¥{{ item.priceFormatted || item.price }}
                            </span>
                            <span class="text-gray-400 text-[11px] font-medium">
                              ₩{{ formatKrw((item.price || 0) * customExchangeRate) }}
                            </span>
                          </div>
                          <div class="flex items-center justify-between text-[11px] text-gray-400 mt-0.5">
                            <span>판매 <b class="text-gray-600 font-medium">{{ item.sales || '0' }}건</b></span>
                            <span v-if="item.repurchaseRate" class="text-emerald-600 font-semibold">재구매 {{ item.repurchaseRate }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 섹션 상품 없음 (fallback) -->
                  <div v-else class="py-8 text-center text-sm text-gray-400">
                    <i class="fas fa-box-open text-2xl text-gray-300 block mb-2"></i>
                    잠시 후 다시 시도해 주세요.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- 홈 섹션 자체가 비어있는 경우 (최초 로드 전) -->
        <div v-else class="py-16 text-center text-gray-400 text-sm space-y-3">
          <i class="fas fa-store text-4xl text-gray-200 block"></i>
          <p class="font-medium">상품을 불러오는 중입니다...</p>
        </div>
      </template>


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
            class="bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-gray-800 font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="default">기본 랭킹순</option>
            <option value="sales_desc">최근 30일 판매량순</option>
            <option value="price_asc">가격 낮은순</option>
            <option value="price_desc">가격 높은순</option>
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
      <div v-else-if="hasSearched && sortedProducts.length === 0" class="bg-white rounded-3xl p-10 sm:p-12 text-center border border-gray-200 space-y-4">
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
      <div v-else-if="sortedProducts.length > 0 && !isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
        <div
          v-for="item in sortedProducts"
          :key="item.id"
          @click="openProductModal(item)"
          class="group bg-white rounded-xl border border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
        >
          <!-- Thumbnail Image -->
          <div class="relative aspect-square bg-gray-100 overflow-hidden">
            <img
              :src="item.imageUrl || item.pic_url || item.img || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'"
              :alt="item.titleKo || item.title || item.titleZh"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="handleImageError"
            />
            
            <!-- 1688 Orange Badge Top Left -->
            <div class="absolute top-2 left-2">
              <span class="px-2 py-0.5 rounded bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black shadow-sm tracking-wide">
                1688
              </span>
            </div>

            <div v-if="item.minOrder && item.minOrder > 1" class="absolute top-2 right-2">
              <span class="px-1.5 py-0.5 rounded bg-black/60 text-white text-[11px] font-bold">
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
                :title="item.titleKo || item.title || item.titleZh"
              >
                {{ item.titleKo || item.title || item.titleZh }}
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

              <!-- 3열: 메타 정보 (재구매율 있을 때만, 최근 30일 판매량) -->
              <div class="flex items-center justify-between text-xs text-gray-400">
                <span v-if="item.repurchaseRate">재구매율: <b class="text-gray-600 font-normal">{{ item.repurchaseRate }}</b></span>
                <span v-else></span>
                <span>최근 30일 판매량: <b class="text-gray-600 font-normal">{{ item.sales || '0' }}건</b></span>
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

      </main><!-- /right main content -->

    </div><!-- /2-column flex wrapper -->

    <!-- ======================================================== -->
    <!-- 5. PRODUCT DETAIL & ORDER MODAL (Component) -->
    <!-- ======================================================== -->
    <!-- 로그아웃 확인 모달 -->
    <ConfirmSaveModal
      v-model="isSignOutConfirmOpen"
      title="로그아웃하시겠습니까?"
      variant="red"
      icon="warn"
      confirmText="로그아웃"
      @confirm="executeMallSignOut"
    />

    <ProductDetailModal
      :product="selectedModalProduct"
      :exchange-rate="customExchangeRate"
      :auto-category-name="autoSaveCategoryName"
      @close="selectedModalProduct = null"
      @added-to-cart="handleModalCartAdded"
      @change-product="selectedModalProduct = $event"
    />

    <!-- ======================================================== -->
    <!-- B2B 비회원 전용 상품 열람 안내 모달 (Auth Guard Modal) -->
    <!-- ======================================================== -->
    <teleport to="body">
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isB2BAuthGuardOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
          @click.self="closeB2BGuard"
          @keydown.esc="closeB2BGuard"
        >
          <div
            class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 text-center text-slate-800 animate-fade-in space-y-5"
            role="dialog"
            aria-modal="true"
          >
            <!-- 닫기 버튼 (X) -->
            <button
              type="button"
              @click="closeB2BGuard"
              class="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition cursor-pointer"
              aria-label="닫기"
            >
              <i class="fas fa-times text-sm"></i>
            </button>

            <!-- 1. 자물쇠 아이콘 -->
            <div class="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto text-2xl shadow-inner">
              🔒
            </div>

            <!-- 2. 모달 타이틀 & 안내 문구 -->
            <div class="space-y-2">
              <template v-if="b2bGuardType === 'unverified'">
                <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-black tracking-wide">
                  사업자 인증 필요
                </span>
                <h3 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight pt-0.5">
                  사업자 인증이 필요합니다
                </h3>
                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                  1688 실시간 도매 단가 및 상품 상세 정보는<br />
                  <strong>사업자 인증 완료 회원</strong>만 열람할 수 있습니다.<br />
                  계정 설정에서 사업자 정보를 등록해 주세요.
                </p>
              </template>
              <template v-else>
                <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-black tracking-wide">
                  B2B 수입대행 회원 전용
                </span>
                <h3 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight pt-0.5">
                  B2B 회원 전용 서비스
                </h3>
                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                  1688 실시간 도매 단가 및 상품 상세 정보는 회원 전용 서비스입니다.<br />
                  로그인이나 회원가입 후 편리하게 이용해 보세요.
                </p>
              </template>
            </div>

            <!-- 3. 하단 버튼 액션 그룹 -->
            <div class="space-y-2.5 pt-1">
              <template v-if="b2bGuardType === 'unverified'">
                <button
                  type="button"
                  @click="goToAccountSettings"
                  class="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i class="fas fa-building text-xs"></i>
                  <span>🏢 사업자 정보 등록하러 가기</span>
                </button>
                <button
                  type="button"
                  @click="closeB2BGuard"
                  class="w-full py-2.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs sm:text-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>닫기</span>
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  @click="handleGuardAction('login')"
                  class="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i class="fas fa-key text-xs"></i>
                  <span>🔑 로그인하러 가기</span>
                </button>

                <button
                  type="button"
                  @click="handleGuardAction('signup')"
                  class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i class="fas fa-bolt text-xs text-slate-900"></i>
                  <span>⚡ 3초 간편 회원가입</span>
                </button>
              </template>
            </div>


            <!-- 4. 하단 부가 혜택 안내 -->
            <div class="pt-3 border-t border-gray-100 text-xs text-gray-400 font-medium flex items-center justify-center gap-3">
              <span>✓ 실시간 DDP 견적</span>
              <span>✓ 한-중 FTA C/O 대행</span>
              <span>✓ 이우 현지 정밀 검수</span>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- 공지사항 상세 모달 -->
    <teleport to="body">
      <transition name="fade">
        <div
          v-if="selectedNotice"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          @click.self="selectedNotice = null"
        >
          <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 text-slate-900 animate-fade-in select-none">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-600 border border-rose-200">
                  {{ selectedNotice.badge || selectedNotice.category_name || '공지' }}
                </span>
                <span class="text-xs text-gray-400 font-mono">{{ formatDate(selectedNotice.created_at || selectedNotice.createdAt) }}</span>
              </div>
              <button @click="selectedNotice = null" class="text-gray-400 hover:text-gray-600 p-1 text-base font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <h3 class="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {{ selectedNotice.title }}
            </h3>
            <div class="text-xs sm:text-sm text-slate-600 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line py-2">
              {{ selectedNotice.content || selectedNotice.summary }}
            </div>
            <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
              <router-link to="/community/notice" class="text-xs text-blue-600 hover:underline font-bold">
                공지사항 전체보기 &gt;
              </router-link>
              <button @click="selectedNotice = null" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm">
                확인 완료
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { search1688WithTranslation, fetch1688ProductById, search1688ByImageUrl, translateItemsBatch } from '../services/api1688'
import { fetchSubCategoryKeywordMap, subCategoryKey } from '@/lib/mallCategories'
import { getMockSearchResults } from '../services/mock1688Data'
import { extractOfferId } from '../utils/offerId'
import { fetchSiteSettings } from '../lib/settings'

import {
  isLoggedIn,
  currentUser,
  currentUserProfile,
  openLoginModal,
  isUserBusinessVerified,
  isBusinessVerified,
  verificationStatus,
  handleNaverCallback,
  signOut,
  userDisplayName,
  userAvatarUrl,
  userEmail,
  getUserBusinessInfo,
  getCartStorageKey
} from '../lib/auth'
import ProductDetailModal from '../components/ProductDetailModal.vue'
import ImageSearchModal from '../components/mall/ImageSearchModal.vue'
import MallBanner from '../components/mall/MallBanner.vue'
import MallCategoryGrid from '../components/mall/MallCategoryGrid.vue'
import MallRecentlyViewed from '../components/mall/MallRecentlyViewed.vue'
import ConfirmSaveModal from '../components/common/ConfirmSaveModal.vue'
import { userBalance, loadBalance } from '../lib/balanceStore'
import { supabase } from '../lib/supabase'
import { normalizeOrderStatus, getOrderStatsByUser } from '../lib/orderPipeline'
import { fetchOrdersFromSupabase, getWarehouseTabCounts } from '../utils/orderStorage'

const route = useRoute()
const router = useRouter()

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

// ----------------------------------------------------
// 발주관리 사이드바 뱃지용 주문 데이터 — getOrderStatsByUser로 중앙화
// ----------------------------------------------------
const submittedOrders = ref([])

const orderStats = computed(() => getOrderStatsByUser(submittedOrders.value))

// 기존 템플릿 참조 이름 유지
const quotePendingCount     = computed(() => orderStats.value.byStage.quote_pending)
const paymentPendingCount   = computed(() => orderStats.value.byStage.quote_confirmed)
const paymentVerifiedCount  = computed(() => orderStats.value.byStage.payment_verified)
const purchasingCount       = computed(() => orderStats.value.byStage.purchasing)
const warehouseTabCounts    = computed(() => getWarehouseTabCounts(submittedOrders.value))


const lastQueryKo = ref('')
const lastQueryZh = ref('')
// 현재 결과가 메가메뉴 소분류로 들어온 것이면 그 소분류의 확정 중국어 키워드.
// 그 외 경로(검색창·퀵탭·배너·홈 섹션)에서는 executeSearch가 ''로 덮어쓴다.
const activeCategoryKeywordZh = ref('')
const items = ref([])

// ============================================================
// 🏠 CN인사이더 스타일 홈 섹션 – 날짜 기반 로테이션 + Daily Cache
// ============================================================

/**
 * 섹션별 키워드 풀: 오늘 Day-of-Year 인덱스로 매일 순환
 * md 제외 5개 풀은 좌측 사이드바 메가메뉴 categories[] 배열의 실제 소분류 태그를 그대로 재사용함
 * (categories[].id: fashion / living / camping / digital / beauty 그룹의 items 참조)
 * → 섹션 라벨과 실제 노출 상품이 정확히 일치하도록 보장, 신규 카테고리 임의 추측 없음
 */
// ⚠️ DB(section_keyword_pools 테이블)가 비어있거나 로드 실패했을 때만 쓰는 비상 폴백값.
// 정상 상태에서는 아래 값이 아니라 관리자 페이지(/admin/banners → "섹션 키워드 풀" 탭)에서
// 관리하는 section_keyword_pools 테이블 데이터가 우선 사용됨 (getTodaySectionPick 참고)
const HOME_SECTION_POOLS = {
  md:      ['베스트 인기상품', '신상품 인기템', '온라인 셀러 인기 아이템'],
  fashion: ['원피스', '블라우스 셔츠', '니트 가디건', '슬랙스 바지', '자켓 코트', '맨투맨 후드'],
  living:  ['텀블러 물병', '식기 접시', '밀폐용기', '욕실용품 청소도구', '수납 정리함', '우산 양산'],
  sports:  ['캠핑의자 캠핑테이블', '캠핑랜턴 캠핑매트', '텐트 타프', '헬스 요가용품', '골프용품', '자전거용품'],
  digital: ['블루투스 이어폰', '핸드폰 케이스', '충전기 케이블', '보조배터리', '차량용 거치대', '블랙박스 액세서리'],
  beauty:  ['스킨 로션', '마스크팩', '선크림', '립스틱 메이크업', '고데기 헤어드라이어', '네일용품'],
}

// 날짜를 숫자로 변환해 풀 개수로 나눈 나머지 — 순수 계산식, 크론/스케줄러 없음.
// 날짜가 바뀌면(자정) 이 값이 자동으로 바뀌어 다음 인덱스의 키워드가 선택됨.
const getTodayIndex = (len) => {
  const now = new Date()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return dayOfYear % len
}

const getTodayKeyword = (pool) => pool[getTodayIndex(pool.length)]

// ============================================================
// 🗂️ 섹션 키워드 풀 (관리자 편집, DB: section_keyword_pools)
// banners.section_key(고정 노출 배너)와는 별개 — 이건 "키워드+배너이미지 세트"를
// 날짜 인덱스로 로테이션하는 풀. 세트에 배너이미지가 있으면 섹션 배너 영역의
// image_url을 그 날의 것으로 덮어씀(라벨/설명/버튼 등 텍스트는 banners.section_key 값 유지).
// ============================================================
const sectionKeywordPools = ref({}) // { md: [{id,keyword,banner_image_url,sort_order}, ...], ... }

async function loadSectionKeywordPools() {
  try {
    const { data, error } = await supabase
      .from('section_keyword_pools')
      .select('*')
      .eq('is_active', true)
      .order('section_key', { ascending: true })
      .order('sort_order', { ascending: true })
    if (error || !Array.isArray(data)) return
    const grouped = {}
    for (const row of data) {
      if (!grouped[row.section_key]) grouped[row.section_key] = []
      grouped[row.section_key].push(row)
    }
    sectionKeywordPools.value = grouped
  } catch (e) {
    console.warn('[Mall] 섹션 키워드 풀 로드 실패 — 하드코딩 폴백 사용:', e)
  }
}

/**
 * 섹션의 "오늘의 선택" 결정 — DB 풀 우선, 비어있으면 하드코딩 HOME_SECTION_POOLS 폴백
 * @returns {{ keyword: string, bannerImageUrl: string, fromDb: boolean }}
 */
function getTodaySectionPick(sectionId) {
  const dbPool = sectionKeywordPools.value[sectionId]
  if (Array.isArray(dbPool) && dbPool.length > 0) {
    const idx = getTodayIndex(dbPool.length)
    const picked = dbPool[idx]
    return { keyword: picked.keyword, bannerImageUrl: picked.banner_image_url || '', fromDb: true }
  }
  const fallbackPool = HOME_SECTION_POOLS[sectionId] || []
  return { keyword: getTodayKeyword(fallbackPool), bannerImageUrl: '', fromDb: false }
}

// v3: 하드코딩 배열 → section_keyword_pools DB 풀 방식 전환에 따른 캐시 버전업
// (v2까지의 캐시된 결과는 어느 소스로 뽑혔는지 알 수 없으므로 폐기하고 재조회)
const HOME_SECTIONS_CACHE_VERSION = 'v3'

const getTodayCacheKey = () =>
  `euchs_home_daily_sections_${HOME_SECTIONS_CACHE_VERSION}_${new Date().toISOString().slice(0, 10)}`

const homeSections = ref([])
const isHomeSectionsLoading = ref(false)
// 모달 열고 닫을 때 popstate → route.query watcher 재실행으로 loadHomeSections()가
// 다시 불려도, 이미 한 번 로드된 홈 화면을 스켈레톤으로 리셋하지 않기 위한 1회성 가드.
// 컴포넌트 인스턴스 스코프의 일반 ref라 새로고침(F5) 시에는 자동으로 false로 리셋됨.
const hasLoadedHomeSections = ref(false)

const SESSION_CACHE_KEY = `euchs_home_md_best_cache_${HOME_SECTIONS_CACHE_VERSION}`
const SESSION_CACHE_DATE_KEY = `euchs_home_md_best_cache_date_${HOME_SECTIONS_CACHE_VERSION}`

// ============================================================
// 🌐 서버 공용 캐시 (home_section_cache 테이블, api/home-section-cache.js 경유) — 1차 방어선
// sessionStorage/localStorage(2차 방어선, 같은 브라우저 재방문용)보다 먼저 확인.
// 하루 중 특정 섹션을 "최초로" 요청한 방문자만 1688 API를 호출하고 결과를 이 테이블에
// 저장 → 같은 날 다른 모든 방문자는 이 값을 그대로 재사용(API 호출 0회로 수렴).
// home_section_cache는 RLS로 공개 접근이 완전히 막혀 있어(anon 정책 없음), 브라우저는
// 이 테이블에 직접 접근할 수 없고 반드시 서버리스 프록시(api/home-section-cache.js,
// service_role key 사용)를 거쳐야 한다 — 1688-search.js가 OneBound를 중계하는 구조와 동일.
// section_keyword_pools(오늘의 키워드 선택 로직)와는 무관 — 이미 선택된 키워드로
// 검색한 "결과"만 저장한다.
// ============================================================
const SECTION_CACHE_API = '/api/home-section-cache'

/**
 * 오늘 날짜로 이미 저장된 섹션들의 payload를 한 번의 요청으로 조회
 * @param {string[]} sectionIds
 * @param {string} today - YYYY-MM-DD
 * @returns {Promise<Map<string, Array>>} section_key → items 배열
 */
async function loadServerSectionCache(sectionIds, today) {
  const map = new Map()
  try {
    const qs = new URLSearchParams({ sections: sectionIds.join(','), date: today }).toString()
    const res = await fetch(`${SECTION_CACHE_API}?${qs}`, { signal: AbortSignal.timeout(8000) })
    const json = await res.json().catch(() => null)
    if (!json?.success || !json.data) {
      console.warn('[Mall] 서버 섹션 캐시 조회 실패:', json?.message || `HTTP ${res.status}`)
      return map
    }
    for (const [sectionKey, items] of Object.entries(json.data)) {
      if (Array.isArray(items) && items.length > 0) map.set(sectionKey, items)
    }
  } catch (e) {
    console.warn('[Mall] 서버 섹션 캐시 조회 예외:', e.message)
  }
  return map
}

/**
 * 신규로 1688에서 가져온 섹션 결과를 서버 공용 캐시에 저장 (같은 날 다른 방문자가 재사용)
 * section_key+cached_date 유니크 제약 기준 upsert — 동시에 여러 방문자가 "오늘 첫 방문"으로
 * 캐시 미스 판정을 받아도 중복 행 없이 마지막 저장값으로 수렴함 (그 순간의 중복 API 호출
 * 자체를 완벽히 막지는 못하지만, 이후 방문자부터는 확실히 API 호출 없이 재사용됨)
 */
async function saveServerSectionCache(sectionKey, today, items) {
  if (!Array.isArray(items) || items.length === 0) {
    console.warn(`[Mall][ServerCache] saveServerSectionCache 호출됐지만 items 없음: section=${sectionKey}`)
    return
  }
  console.log(`[Mall][ServerCache] POST 시작: section=${sectionKey} date=${today} items=${items.length}`)
  try {
    const res = await fetch(SECTION_CACHE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionKey, cachedDate: today, payload: items }),
      signal: AbortSignal.timeout(8000),
    })
    const json = await res.json().catch(() => null)
    if (!json?.success) console.warn('[Mall][ServerCache] 저장 실패:', sectionKey, 'HTTP', res.status, json?.message)
    else console.log(`[Mall][ServerCache] 저장 성공: section=${sectionKey}`)
  } catch (e) {
    console.warn('[Mall][ServerCache] 저장 예외:', sectionKey, e.message)
  }
}

/**
 * 이미 수신된 1688 응답에서 상품 배열을 안전하게 추출하는 다계층 파서
 * 추가 API 호출 없이 클라이언트 메모리의 raw data에서 직접 추출
 */
const extract1688Items = (res) => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.items)) return res.items
  if (res.items && Array.isArray(res.items.item)) return res.items.item
  if (res.data && Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.items?.item)) return res.data.items.item
  if (res.data && Array.isArray(res.data.items)) return res.data.items
  if (res.raw && Array.isArray(res.raw.items?.item)) return res.raw.items.item
  if (res.raw && Array.isArray(res.raw.items)) return res.raw.items
  if (res.raw && Array.isArray(res.raw)) return res.raw
  if (Array.isArray(res.result?.resultList)) return res.result.resultList
  if (Array.isArray(res.resultList)) return res.resultList
  if (Array.isArray(res.item)) return res.item
  if (res.items && typeof res.items === 'object') return Object.values(res.items)
  return []
}

/**
 * 홈 섹션 데이터 로더 (SessionStorage 24h 캐시 + Daily Cache Engine)
 * - sessionStorage 캐시(당일) 있으면 → 즉시 렌더 (API 0회)
 * - localStorage 날짜 캐시 있으면 → 즉시 렌더 (API 0회)
 * - 캐시 없음 → 섹션당 1회 API (총 4회) 후 sessionStorage + localStorage에 이중 저장
 * - 오염된 캐시(한자 포함 titleKo) 감지 시 캐시 무시 → API 재호출 후 재번역
 */

// 한자 포함 여부 판별 (번역 실패 감지용)
const HAS_CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/

/**
 * 섹션 배열에 오염된 캐시(번역 실패 → 한자 남은) 항목이 있는지 검사
 * @param {Array} sections
 * @returns {boolean} true = 오염됨
 */
const isCacheCorrupted = (sections) => {
  if (!Array.isArray(sections)) return true
  for (const sec of sections) {
    if (!sec.items || sec.items.length === 0) continue
    for (const item of sec.items) {
      const ko = item.titleKo || item.title || ''
      if (HAS_CJK_RE.test(ko)) return true // 한자 남아있으면 오염
    }
  }
  return false
}

/**
 * 섹션 내 미번역 항목(titleKo === titleZh 또는 한자 포함)을 백그라운드 재번역
 * translateItemsBatch()가 items 배열을 직접 변경 → Vue 반응성으로 카드 자동 갱신
 */
const retranslateCorruptedSections = (sections) => {
  const untranslated = []
  sections.forEach(sec => {
    if (!sec.items) return
    sec.items.forEach(item => {
      const ko = item.titleKo || item.title || ''
      if (HAS_CJK_RE.test(ko) || ko === item.titleZh) {
        untranslated.push(item)
      }
    })
  })
  if (untranslated.length === 0) return
  console.log(`[Mall] 오염된 캐시 재번역 백그라운드 시작: ${untranslated.length}건`)
  translateItemsBatch(untranslated).then(() => {
    // translateItemsBatch가 item.titleKo / item.title을 직접 변경하므로
    // Vue 반응성이 자동으로 카드 제목을 갱신함
    // 번역 완료 후 정상 캐시로 덮어쓰기
    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = getTodayCacheKey()
    const currentSections = homeSections.value
    if (!isCacheCorrupted(currentSections)) {
      try {
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(currentSections))
        sessionStorage.setItem(SESSION_CACHE_DATE_KEY, today)
        localStorage.setItem(cacheKey, JSON.stringify(currentSections))
        console.log('[Mall] 재번역 완료 — 정상 캐시로 갱신 완료')
      } catch (e) {}
    }
  }).catch(err => {
    console.warn('[Mall] 백그라운드 재번역 실패 (원문 유지):', err.message)
  })
}

const loadHomeSections = async () => {
  if (hasSearched.value || isHomeSectionsLoading.value || hasLoadedHomeSections.value) return

  // 상품 캐시 히트/미스와 무관하게 항상 최신 키워드풀 반영 (배너이미지 오버라이드 포함)
  await loadSectionKeywordPools()
  applySectionPoolBannerOverrides()

  const cacheKey = getTodayCacheKey()
  const today = new Date().toISOString().slice(0, 10)

  // 0. sessionStorage 24시간 캐시 우선 확인 (탭 이동/새로고침 API 완전 차단)
  try {
    const cachedDate = sessionStorage.getItem(SESSION_CACHE_DATE_KEY)
    const cachedRaw = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (cachedDate === today && cachedRaw) {
      const parsed = JSON.parse(cachedRaw)
      const hasRealItems = Array.isArray(parsed) && parsed.some(sec => sec.items && sec.items.length > 0)
      if (hasRealItems) {
        if (isCacheCorrupted(parsed)) {
          // 오염된 캐시: 화면에 먼저 원문 표시 후 백그라운드 재번역
          console.warn('[Mall] sessionStorage 캐시 오염 감지(한자 포함) — 백그라운드 재번역 시작')
          homeSections.value = parsed
          sessionStorage.removeItem(SESSION_CACHE_KEY)
          sessionStorage.removeItem(SESSION_CACHE_DATE_KEY)
          localStorage.removeItem(cacheKey)
          retranslateCorruptedSections(homeSections.value)
        } else {
          homeSections.value = parsed
        }
        hasLoadedHomeSections.value = true
        return
      }
    }
  } catch (e) {}

  // 1. 오늘 날짜 localStorage 캐시 확인 (실제 상품이 있는 경우에만)
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      const hasRealProducts = Array.isArray(parsed) && parsed.length > 0 &&
        parsed.some(sec => sec.items && sec.items.length > 0 &&
          sec.items[0]?.imageUrl && !sec.items[0].imageUrl.includes('images.unsplash.com'))
      if (hasRealProducts) {
        if (isCacheCorrupted(parsed)) {
          // 오염된 캐시: 화면에 먼저 원문 표시 후 백그라운드 재번역
          console.warn('[Mall] localStorage 캐시 오염 감지(한자 포함) — 백그라운드 재번역 시작')
          homeSections.value = parsed
          localStorage.removeItem(cacheKey)
          retranslateCorruptedSections(homeSections.value)
          hasLoadedHomeSections.value = true
          return
        }
        homeSections.value = parsed
        try {
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(parsed))
          sessionStorage.setItem(SESSION_CACHE_DATE_KEY, today)
        } catch (e) {}
        hasLoadedHomeSections.value = true
        return
      } else {
        localStorage.removeItem(cacheKey)
      }
    }
  } catch (e) {}

  // 2. 이전 날짜 캐시 일괄 삭제
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('euchs_home_daily_sections_') && key !== cacheKey) {
        localStorage.removeItem(key)
      }
    })
  } catch (e) {}

  // 3. 6개 섹션 API 병렬 호출 (키워드풀은 함수 시작 시 이미 로드됨)
  isHomeSectionsLoading.value = true

  const sectionDefs = [
    {
      id:       'md',
      title:    '🔥 오늘의 MD 추천 베스트',
      subtitle: '매일 업데이트되는 소싱 MD 엄선 추천 상품',
      keyword:  getTodaySectionPick('md').keyword,
      color:    'from-rose-500 to-orange-500',
    },
    {
      id:       'fashion',
      title:    '👗 트렌드 패션 기획전',
      subtitle: '오늘의 패션 핫아이템 모음',
      keyword:  getTodaySectionPick('fashion').keyword,
      color:    'from-violet-500 to-purple-600',
    },
    {
      id:       'living',
      title:    '🏠 생활 & 주방 아이디어 잡화',
      subtitle: '집을 더 편리하게 만드는 베스트 잡화',
      keyword:  getTodaySectionPick('living').keyword,
      color:    'from-emerald-500 to-teal-600',
    },
    {
      id:       'sports',
      title:    '⛺ 스포츠/레저 & 캠핑 테마관',
      subtitle: '아웃도어 & 홈트 인기 상품 모음',
      keyword:  getTodaySectionPick('sports').keyword,
      color:    'from-blue-500 to-indigo-600',
    },
    {
      id:       'digital',
      title:    '📱 디지털/가전 잇템',
      subtitle: '이어폰부터 차량용품까지 인기 디지털 아이템',
      keyword:  getTodaySectionPick('digital').keyword,
      color:    'from-slate-500 to-slate-700',
    },
    {
      id:       'beauty',
      title:    '💄 뷰티 & 화장품 셀렉트',
      subtitle: '스킨케어부터 뷰티기기까지 인기 뷰티템',
      keyword:  getTodaySectionPick('beauty').keyword,
      color:    'from-pink-500 to-rose-500',
    },
  ]

  // 3-1. 서버 공용 캐시(home_section_cache) 조회 — 오늘 다른 방문자가 이미 채워둔 섹션은
  // 1688 API 호출 없이 그대로 재사용
  const serverCacheMap = await loadServerSectionCache(sectionDefs.map(s => s.id), today)

  const results = await Promise.all(
    sectionDefs.map(async (sec) => {
      // 서버 캐시 HIT: API 호출 없이 즉시 사용
      const serverCachedItems = serverCacheMap.get(sec.id)
      if (Array.isArray(serverCachedItems) && serverCachedItems.length > 0) {
        return { ...sec, items: serverCachedItems }
      }

      try {
        // 섹션은 아래 slice(0,8)로 8건만 표시한다. filter 탈락분 여유 2건을 더해
        // 10건만 번역하게 해 나머지(응답 20건 중 10건)의 불필요한 번역을 막는다.
        const res = await search1688WithTranslation(sec.keyword, 1, { sort: 'default', maxItems: 10 })

        // extract1688Items로 다계층 파싱 (이미 수신된 raw data에서 안전 추출)
        let extracted = extract1688Items(res)

        // search1688WithTranslation이 정상 반환한 경우 items가 직접 존재
        if (Array.isArray(res.items) && res.items.length > 0) {
          extracted = res.items
        }

        // 상품 필드 안전 매핑 (Uncaught TypeError 방지)
        const safeItems = extracted.slice(0, 8).map((item, idx) => {
          const raw = item.raw || item
          return {
            id: item.id || item.itemId || raw.num_iid || `item-${idx}`,
            itemId: item.itemId || item.id || '',
            titleKo: item.titleKo || item.title || item.titleZh || raw.title || raw.subject || '1688 도매 상품',
            titleZh: item.titleZh || item.title || raw.title || '',
            title: item.title || item.titleKo || item.titleZh || raw.title || '1688 도매 상품',
            imageUrl: item.imageUrl || item.pic_url || item.img || raw.pic_url || raw.picUrl || raw.image || '',
            price: item.price || item.priceNum || item.priceCny || parseFloat(String(raw.price || '0').replace(/[^0-9.]/g, '')) || 0,
            priceNum: item.priceNum || item.price || 0,
            priceFormatted: item.priceFormatted || String(item.price || 0),
            priceCny: item.priceCny || item.price || 0,
            minOrder: item.minOrder || item.moq || parseInt(raw.min_num || '1', 10) || 1,
            sales: item.sales || parseInt(raw.sold_count || raw.volume || '0', 10) || 0,
            repurchaseRate: item.repurchaseRate || raw.rePurchaseRate || '',
            detailUrl: item.detailUrl || item.itemUrl || '',
            company: item.company || raw.nick || raw.shop_name || '1688 공급사',
          }
        }).filter(item => item.id && (item.titleKo || item.title))

        // 서버 공용 캐시에 저장 — 번역 완료 여부(isCacheCorrupted)는 검증하지 않음.
        // ⚠️ 2026-09-18 조사 결과: 운영 서버는 VITE_TRANSLATION_ENABLED가 꺼진 상태로 빌드되어
        // 있어(api1688.js:932 주석, 관리자 대시보드 "번역 일시 중지 중" 배지 참고) titleKo가
        // 항상 중국어 원문 그대로임 → isCacheCorrupted가 실질적으로 항상 true를 반환해
        // 캐시 저장이 영구적으로 스킵되는 문제가 있었음. 캐시 여부와 무관하게 화면에 보이는
        // titleKo 값(번역 상태)은 동일하므로, 번역 완료 검증 없이 있는 그대로 저장해 호출량
        // 절감 목적을 달성함 (브라우저 localStorage/sessionStorage 저장 조건은 원래 로직 그대로
        // 별도 유지 — 이 서버 캐시 저장 조건만 변경).
        if (safeItems.length > 0) {
          console.log(`[Mall][ServerCache] 저장 조건 충족 → saveServerSectionCache 호출: section=${sec.id}`)
          saveServerSectionCache(sec.id, today, safeItems)
        } else {
          console.warn(`[Mall][ServerCache] 저장 스킵(빈 결과): section=${sec.id}`)
        }

        return { ...sec, items: safeItems }
      } catch (e) {
        console.warn(`[Mall] Section "${sec.id}" load error:`, e.message)
        return { ...sec, items: [] }
      }
    })
  )

  homeSections.value = results
  hasLoadedHomeSections.value = true
  isHomeSectionsLoading.value = false

  // 번역 성공 검증 후 캐시 저장 — 한자 남은 항목이 하나라도 있으면 저장 안 함
  // (이전 버그: 번역 실패 상태도 그대로 캐시에 저장 → 이후 진입 시 중국어 노출 반복)
  const hasRealItems = results.some(sec => sec.items && sec.items.length > 0)
  if (hasRealItems && !isCacheCorrupted(results)) {
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(results))
      sessionStorage.setItem(SESSION_CACHE_DATE_KEY, today)
    } catch (e) {}
    try {
      localStorage.setItem(cacheKey, JSON.stringify(results))
    } catch (e) {}
    console.log('[Mall] 번역 성공 검증 완료 — 홈 섹션 캐시 저장')
  } else if (hasRealItems) {
    // 일부 미번역 항목 존재: 화면에는 표시하되 캐시에는 저장하지 않음
    // 미번역 항목 백그라운드 재시도
    console.warn('[Mall] 일부 번역 실패(한자 잔존) — 캐시 저장 보류, 백그라운드 재번역 시작')
    retranslateCorruptedSections(results)
  }
}

/**
 * 홈 섹션 [더보기 >] 클릭 → 해당 키워드로 실시간 검색 전환
 */
const searchBySection = (section) => {
  queryInput.value = section.keyword
  executeSearch(1)
}

// ============================================================
// 🖼️ 홈 섹션별 배너 (banners.section_key, 관리자 CMS 편집)
// CN인사이더 스타일: 섹션마다 배너 이미지 + 상품그리드, section_key당 1건(display_order 최솟값)
// ============================================================
const sectionBanners = ref({})

async function loadSectionBanners() {
  try {
    const now = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .not('section_key', 'is', null)
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('display_order', { ascending: true })
    if (error || !Array.isArray(data)) return
    const map = {}
    for (const b of data) {
      // section_key당 display_order가 가장 낮은 1건만 채택 (이미 order asc 정렬됨)
      if (!map[b.section_key]) map[b.section_key] = b
    }
    sectionBanners.value = map
  } catch (e) {
    console.warn('[Mall] 섹션 배너 로드 실패:', e)
  }
}

function isSectionBannerExternal(banner) {
  const url = banner?.button_url || banner?.link_url
  return url ? url.startsWith('http://') || url.startsWith('https://') : false
}

// section_keyword_pools에서 오늘 선택된 세트에 banner_image_url이 있으면
// 섹션 배너 영역의 image_url만 덮어씀 (label/heading/description/버튼 등 텍스트는
// banners.section_key 행 값을 그대로 유지 — 관리자가 그쪽에서 편집한 문구를 보존)
function applySectionPoolBannerOverrides() {
  const SECTION_IDS = ['md', 'fashion', 'living', 'sports', 'digital', 'beauty']
  const next = { ...sectionBanners.value }
  let changed = false
  for (const id of SECTION_IDS) {
    const pick = getTodaySectionPick(id)
    if (pick.bannerImageUrl) {
      next[id] = { ...(next[id] || {}), image_url: pick.bannerImageUrl }
      changed = true
    }
  }
  if (changed) sectionBanners.value = next
}

// ----------------------------------------------------
// 🔢 안전한 숫자 추출 & 실시간 상품 정렬 파이프라인
// ----------------------------------------------------
const parseNum = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (!val) return 0
  const s = String(val).trim()
  // '2.8만', '10.5만' 등 만 단위 파싱
  if (s.includes('만') || /[0-9.]+\s*만/.test(s)) {
    const manMatch = s.match(/([0-9.]+)\s*만/)
    if (manMatch) {
      return (parseFloat(manMatch[1]) || 0) * 10000
    }
  }
  // 중국어 万(w) 단위
  if (/[0-9.]+\s*[wW万]/.test(s)) {
    const wMatch = s.match(/([0-9.]+)\s*[wW万]/)
    if (wMatch) {
      return (parseFloat(wMatch[1]) || 0) * 10000
    }
  }
  // k 단위
  if (/[0-9.]+\s*[kK]/.test(s)) {
    const kMatch = s.match(/([0-9.]+)\s*[kK]/)
    if (kMatch) {
      return (parseFloat(kMatch[1]) || 0) * 1000
    }
  }
  const cleaned = s.replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

const getItemSales = (item) => {
  if (!item) return 0
  const val = item.sales || item.salesCount || item.orderCount || item.bookedCount || item.monthBookedCount || item.monthSold || item.quantity || 0
  return parseNum(val)
}

const getItemPrice = (item) => {
  if (!item) return 0
  const val = item.price ?? item.priceCny ?? item.priceKrw ?? item.priceFormatted ?? 0
  return parseNum(val)
}

const sortedProducts = computed(() => {
  if (!items.value || !Array.isArray(items.value)) return []
  const list = [...items.value]
  const sort = sortOrder.value

  if (sort === 'sales_desc' || sort === 'salesDesc') {
    return list.sort((a, b) => getItemSales(b) - getItemSales(a))
  } else if (sort === 'price_asc' || sort === 'priceAsc') {
    return list.sort((a, b) => getItemPrice(a) - getItemPrice(b))
  } else if (sort === 'price_desc' || sort === 'priceDesc') {
    return list.sort((a, b) => getItemPrice(b) - getItemPrice(a))
  }
  return list
})

// 이미지 검색 상태
const isImageModalOpen = ref(false)         // 이미지 검색 모달 열림/닫힘
const isImageSearchMode = ref(false)        // 이미지 검색 모드 활성 여부 (결과 표시 중)
const imageSearchPreviewUrl = ref('')       // 선택된 이미지 미리보기 URL (뱃지용)
const isImageUploading = ref(false)         // 이미지 검색 진행 중 스피너


const selectedModalProduct = ref(null)

// 딥링크(/mall?offerId=...) 1회 소비 가드.
// 모달 닫기(history.back) → popstate → vue-router가 동일 URL로도 pop 내비게이션을 1회
// 수행 → route.query watcher 재발화 → URL에 남은 offerId로 모달이 다시 열리는 무한 루프를 차단.
// URL은 그대로 두므로 주소 복사/재공유 가능하고,
// 컴포넌트 스코프 ref라 새로고침(F5) 시 자동 리셋되어 F5 재오픈 동작은 유지된다.
const consumedOfferId = ref('')

const customExchangeRate = ref(226.19)
const liveMarketRate = ref(206.19)
const agencyFeeRate = ref(8.0)
const depositBalanceKrw = userBalance

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

// 🐛 Bug fix: promoChips was referenced in template but never defined
const promoChips = ['텀블러', '블라우스', '셔츠', '숄더백', '실내화']

const categories = [
  {
    id: 'fashion',
    name: '패션의류/이너웨어',
    emoji: '👗',
    keyword: '여성의류',
    icon: 'fas fa-tshirt',
    groups: [
      {
        title: '여성의류',
        items: ['원피스', '블라우스/셔츠', '티셔츠', '니트/가디건', '슬랙스/바지', '스커트', '자켓/코트', '트레이닝/홈웨어']
      },
      {
        title: '남성의류',
        items: ['티셔츠', '셔츠', '슬랙스/청바지', '자켓/아우터', '맨투맨/후드', '정장/세트']
      },
      {
        title: '이너웨어/잠옷',
        items: ['잠옷/홈웨어', '여성속옷/브라', '남성속옷', '양말/스타킹']
      }
    ]
  },
  {
    id: 'shoes_acc',
    name: '신발/가방/패션잡화',
    emoji: '👠',
    keyword: '패션잡화 가방',
    icon: 'fas fa-shopping-bag',
    groups: [
      {
        title: '여성슈즈',
        items: ['슬리퍼', '단화/플랫', '펌프스/힐', '스니커즈/운동화', '샌들', '부츠/앵클부츠']
      },
      {
        title: '가방',
        items: ['토트백', '숄더백', '크로스백', '백팩', '캔버스백', '지갑/파우치', '에코백']
      },
      {
        title: '패션잡화',
        items: ['모자/버킷햇', '벨트', '선글라스', '스카프/머플러', '헤어악세사리', '주얼리/귀걸이', '시계']
      }
    ]
  },
  {
    id: 'living',
    name: '생활/주방용품',
    emoji: '🏠',
    keyword: '생활용품',
    icon: 'fas fa-utensils',
    groups: [
      {
        title: '주방용품',
        items: ['텀블러/물병', '식기/접시', '조리도구', '밀폐용기', '컵/머그', '도마/칼', '냄비/팬']
      },
      {
        title: '욕실/청소',
        items: ['욕실용품', '청소도구', '타월/수건', '수납걸이', '세탁용품']
      },
      {
        title: '생활잡화',
        items: ['우산/양산', '실내화', '방향제', '보관함/수납', '행거/옷걸이']
      }
    ]
  },
  {
    id: 'interior',
    name: '홈인테리어/문구',
    emoji: '🛋️',
    keyword: '인테리어 소품',
    icon: 'fas fa-couch',
    groups: [
      {
        title: '홈데코',
        items: ['조명/무드등', '벽시계', '화병/오브제', '패브릭/쿠션', '디퓨저/방향', '캔들', '액자']
      },
      {
        title: '문구/오피스',
        items: ['다이어리/노트', '필기구', '데스크정리', '스티커', '포장용품', '파일/바인더']
      }
    ]
  },
  {
    id: 'digital',
    name: '디지털/가전/차량',
    emoji: '📱',
    keyword: '디지털 가전',
    icon: 'fas fa-mobile-alt',
    groups: [
      {
        title: '디지털/음향',
        items: ['블루투스 이어폰', '핸드폰 케이스', '충전기/케이블', '보조배터리', '스마트워치 스트랩', '소형가전']
      },
      {
        title: '차량용품',
        items: ['차량용 거치대', '차량 방향제', '수납포켓', '세차용품', '블랙박스 액세서리']
      }
    ]
  },
  {
    id: 'camping',
    name: '스포츠/레저/캠핑',
    emoji: '⛺',
    keyword: '캠핑 레저',
    icon: 'fas fa-campground',
    groups: [
      {
        title: '캠핑용품',
        items: ['캠핑의자', '캠핑테이블', '조명/랜턴', '캠핑매트', '텐트/타프', '캠핑식기']
      },
      {
        title: '운동/피트니스',
        items: ['헬스/요가용품', '운동기구', '골프용품', '자전거용품', '수영용품']
      }
    ]
  },
  {
    id: 'pet',
    name: '펫(반려동물) 용품',
    emoji: '🐶',
    keyword: '반려동물 강아지',
    icon: 'fas fa-paw',
    groups: [
      {
        title: '반려동물 의류/악세서리',
        items: ['강아지옷', '고양이 옷', '리드줄/하네스', '넥카라', '강아지 신발']
      },
      {
        title: '반려동물 용품',
        items: ['반려동물 방석', '식기/급수기', '반려동물 장난감', '켄넬/이동장', '목욕/그루밍']
      }
    ]
  },
  {
    id: 'baby',
    name: '유아동/완구/취미',
    emoji: '👶',
    keyword: '유아 완구',
    icon: 'fas fa-baby',
    groups: [
      {
        title: '유아동용품',
        items: ['유아의류', '유아식기', '안전용품', '욕조/목욕용품', '이유식용품']
      },
      {
        title: '완구/취미',
        items: ['유아장난감', '블록/레고형', 'RC/드론', '퍼즐', '피규어/수집품']
      }
    ]
  },
  {
    id: 'beauty',
    name: '뷰티/미용/화장품',
    emoji: '💄',
    keyword: '뷰티 화장품',
    icon: 'fas fa-spa',
    groups: [
      {
        title: '스킨케어/메이크업',
        items: ['스킨/로션', '마스크팩', '선크림', '립스틱', 'BB/CC크림', '아이섀도우']
      },
      {
        title: '미용/뷰티기기',
        items: ['고데기/헤어드라이어', '미용 롤러', '네일용품', '뷰러/브러쉬', '족욕기']
      }
    ]
  },
  {
    id: 'tools',
    name: '공구/산업/포장재',
    emoji: '🔧',
    keyword: '공구 포장재',
    icon: 'fas fa-tools',
    groups: [
      {
        title: '공구/DIY',
        items: ['드릴/전동공구', '수공구', 'DIY부자재', '측정공구', '사다리/작업대']
      },
      {
        title: '포장/물류용품',
        items: ['박스/종이봉투', '포장테이프', '뽁뽁이/완충재', '라벨/스티커', '폴리백']
      }
    ]
  }
]

// 퀵 카테고리 탭 (상단 빠른 바로가기)
const quickTabs = [
  { id: 'best', emoji: '🔥', label: '실시간 베스트', keyword: '베스트 인기상품' },
  { id: 'fashion', emoji: '👗', label: '패션의류', keyword: '여성의류' },
  { id: 'shoes_acc', emoji: '👠', label: '신발/잡화', keyword: '패션잡화 가방' },
  { id: 'living', emoji: '🏠', label: '생활주방', keyword: '생활용품' },
  { id: 'interior', emoji: '🛋️', label: '홈인테리어', keyword: '인테리어 소품' },
  { id: 'digital', emoji: '📱', label: '디지털/가전', keyword: '디지털 가전' },
  { id: 'camping', emoji: '⛺', label: '스포츠/레저', keyword: '캠핑 레저' },
  { id: 'pet', emoji: '🐶', label: '펫/유아', keyword: '반려동물 강아지' },
  { id: 'beauty', emoji: '💄', label: '뷰티', keyword: '뷰티 화장품' }
]

// 카테고리 이미지 카드 그리드용 데이터
// quickTabs 9개 대분류에 대표 이미지 URL 매핑 (추후 관리자 편집 가능)
const CATEGORY_IMAGES = {
  best:     'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
  fashion:  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&auto=format&fit=crop&q=80',
  shoes_acc:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  living:   'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&auto=format&fit=crop&q=80',
  interior: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&auto=format&fit=crop&q=80',
  digital:  'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&auto=format&fit=crop&q=80',
  camping:  'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=600&auto=format&fit=crop&q=80',
  pet:      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80',
  beauty:   'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=80',
}

const CATEGORY_SHORT_NAMES = {
  best: '베스트', fashion: '패션의류', shoes_acc: '신발/잡화',
  living: '생활주방', interior: '홈인테리어', digital: '디지털/가전',
  camping: '스포츠/레저', pet: '펫/유아', beauty: '뷰티'
}

const categoryCardsForGrid = computed(() =>
  quickTabs.map(tab => ({
    ...tab,
    imageUrl: CATEGORY_IMAGES[tab.id] || '',
    shortName: CATEGORY_SHORT_NAMES[tab.id] || tab.label
  }))
)

// 최근 본 상품 컴포넌트 ref
const recentlyViewedRef = ref(null)

// ── 찜(내상품리스트) 카테고리 자동 지정용 매핑 ──────────────────────────
// 몰 카테고리 id → Supabase categories(level=1).name_ko
// 메가메뉴(대분류/소분류)는 DB 대분류와 1:1로 대응된다.
const MEGA_CAT_TO_MAJOR = {
  fashion:   '패션의류/이너웨어',
  shoes_acc: '신발/가방/패션잡화',
  living:    '생활/주방용품',
  interior:  '홈인테리어/문구',
  digital:   '디지털/가전/차량',
  camping:   '스포츠/레저/캠핑',
  pet:       '펫(반려동물) 용품',
  baby:      '유아동/완구/취미',
  beauty:    '뷰티/미용/화장품',
  tools:     '공구/산업/포장재',
}
// 상단 네비(퀵탭) / 카테고리 이미지 카드 → DB 대분류
// best(실시간 베스트)는 카테고리가 아니고, pet(펫/유아)은 반려동물+유아동이
// 섞여 있어 판단 불가이므로 둘 다 매핑하지 않는다(= 미분류).
const QUICK_TAB_TO_MAJOR = {
  fashion:   '패션의류/이너웨어',
  shoes_acc: '신발/가방/패션잡화',
  living:    '생활/주방용품',
  interior:  '홈인테리어/문구',
  digital:   '디지털/가전/차량',
  camping:   '스포츠/레저/캠핑',
  beauty:    '뷰티/미용/화장품',
}

// 현재 검색 결과가 어떤 대분류 경로로 들어온 것인지 (키워드/URL/사진 검색은 빈 값)
const entryCategoryName = ref('')

// ProductDetailModal에 넘길 자동 카테고리 이름.
// 홈(추천 섹션·최근 본 상품)과 사진 검색 결과에서는 항상 미분류로 저장한다.
const autoSaveCategoryName = computed(() => {
  if (!hasSearched.value || isImageSearchMode.value) return ''
  return entryCategoryName.value || ''
})

// ── 메가메뉴 상태 ─────────────────────────────────────────
// 초기값 null = 아무 탭도 선택 표시하지 않음 (탭/카테고리를 누를 때만 대입됨)
const selectedCategoryId = ref(null)
const isMegaMenuOpen = ref(false)
const activeMegaCat = ref(categories[0]) // 기본값: 패션의류
const categoryNavRef = ref(null)
let megaMenuTimer = null

// 레거시 호환 (기존 코드에서 참조하는 변수)
const hoveredCategory = ref(null)
let categoryHoverTimer = null

const toggleMegaMenu = () => {
  isMegaMenuOpen.value = !isMegaMenuOpen.value
  if (isMegaMenuOpen.value && !activeMegaCat.value) {
    activeMegaCat.value = categories[0]
  }
}

const openMegaMenuOnHover = () => {
  // PC 마우스 호버 시에만 자동 열기 (터치 디바이스 제외)
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    if (megaMenuTimer) clearTimeout(megaMenuTimer)
    isMegaMenuOpen.value = true
    if (!activeMegaCat.value) activeMegaCat.value = categories[0]
  }
}

const clearMegaMenuTimer = () => {
  if (megaMenuTimer) clearTimeout(megaMenuTimer)
}

const handleMegaMenuLeave = () => {
  // 터치 디바이스에서는 mouseleave 무시
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) {
    return
  }
  if (megaMenuTimer) clearTimeout(megaMenuTimer)
  megaMenuTimer = setTimeout(() => {
    isMegaMenuOpen.value = false
  }, 250)
}

const handleMegaCatHover = (cat) => {
  // 터치 디바이스에서는 mouseenter 무시
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) {
    return
  }
  if (megaMenuTimer) clearTimeout(megaMenuTimer)
  activeMegaCat.value = cat
}

const handleMegaCatClick = (cat) => {
  activeMegaCat.value = cat
}

const selectQuickTab = (qt) => {
  isMegaMenuOpen.value = false
  selectedCategoryId.value = qt.id
  queryInput.value = qt.keyword
  executeSearch(1, null, QUICK_TAB_TO_MAJOR[qt.id] || '')
}

// source: 'mega'  = 카테고리 드롭다운의 대분류 '전체 검색'
//         'quick' = 몰 메인 카테고리 이미지 카드(퀵탭과 동일 id 체계)
const selectCategory = (cat, source = 'mega') => {
  if (megaMenuTimer) clearTimeout(megaMenuTimer)
  if (categoryHoverTimer) clearTimeout(categoryHoverTimer)
  isMegaMenuOpen.value = false
  hoveredCategory.value = null
  selectedCategoryId.value = cat.id
  queryInput.value = cat.keyword || cat.name
  const majorName = source === 'quick'
    ? (QUICK_TAB_TO_MAJOR[cat.id] || '')
    : (MEGA_CAT_TO_MAJOR[cat.id] || '')
  executeSearch(1, null, majorName)
}

// ── 소분류 → 중국어 키워드 맵 (Supabase categories.keyword_zh, level 3) ─────────
// 세션 내 1회 조회. 메가메뉴를 열기 전에 미리 받아두어 클릭 시 대기가 없도록 한다.
const subCatKeywordMap = ref(new Map())

const preloadSubCategoryKeywords = async () => {
  try {
    subCatKeywordMap.value = await fetchSubCategoryKeywordMap()
  } catch (err) {
    // 맵이 비면 아래 폴백(한글 조합 키워드 → 파파고)으로 검색은 계속 동작한다.
    console.error('[MallView] 소분류 키워드 맵 로드 실패:', err.message)
  }
}

const handleSubCategoryClick = async (subKeyword, parentCat, groupTitle = '') => {
  if (megaMenuTimer) clearTimeout(megaMenuTimer)
  if (categoryHoverTimer) clearTimeout(categoryHoverTimer)
  isMegaMenuOpen.value = false
  hoveredCategory.value = null
  selectedCategoryId.value = parentCat.id

  // ── 1. DB의 확정 중국어 키워드 조회 ─────────────────────────────────────
  // 여성의류>티셔츠=女士T恤 / 남성의류>티셔츠=男士T恤 처럼 성별이 분리되어 있어
  // 번역을 거치지 않고 그대로 검색하면 결과가 고정되고 성별 혼입이 사라진다.
  // (cid_1688 은 OneBound가 cat 파라미터를 무시하는 것이 실측되어 사용하지 않는다 —
  //  근거는 src/lib/mallCategories.js 주석 참조)
  if (subCatKeywordMap.value.size === 0) await preloadSubCategoryKeywords()
  const keywordZh = subCatKeywordMap.value.get(subCategoryKey(groupTitle, subKeyword)) || ''

  // ── 2. 화면에 표시할 한글 키워드 ────────────────────────────────────────
  // 성별 구분 대분류일 때만 "여성"/"남성" 접두어를 붙인다.
  // keywordZh를 못 찾았을 때는 이 한글이 그대로 파파고 번역 경로로 들어간다(기존 동작).
  let combinedKeyword = subKeyword
  if (groupTitle === '여성의류') {
    combinedKeyword = `여성 ${subKeyword}`
  } else if (groupTitle === '남성의류') {
    combinedKeyword = `남성 ${subKeyword}`
  }
  // ↑ 다른 그룹은 subKeyword 그대로 — 접두어 없음

  if (!keywordZh) {
    console.warn(`[MallView] keyword_zh 미발견: "${subCategoryKey(groupTitle, subKeyword)}" → 한글 "${combinedKeyword}"로 번역 검색합니다.`)
  }

  queryInput.value = combinedKeyword
  // 소분류로 들어온 목록도 해당 대분류로 자동 지정
  executeSearch(1, null, MEGA_CAT_TO_MAJOR[parentCat.id] || '', keywordZh)
}

const handleClickOutside = (e) => {
  if (categoryNavRef.value && !categoryNavRef.value.contains(e.target)) {
    isMegaMenuOpen.value = false
    hoveredCategory.value = null
  }
}

// 레거시 함수 (기존 코드 호환)
const handleCategoryHover = (cat) => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) return
  if (categoryHoverTimer) clearTimeout(categoryHoverTimer)
  hoveredCategory.value = cat
}
const clearHoverTimer = () => { if (categoryHoverTimer) clearTimeout(categoryHoverTimer) }
const handleCategoryLeave = () => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) return
  if (categoryHoverTimer) clearTimeout(categoryHoverTimer)
  categoryHoverTimer = setTimeout(() => { hoveredCategory.value = null }, 250)
}
const handleCategoryClick = (cat) => {
  if (cat.groups && cat.groups.length > 0) {
    hoveredCategory.value = hoveredCategory.value?.id === cat.id ? null : cat
  } else {
    selectCategory(cat)
  }
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
  // 비로그인 상태: 즉시 0 리셋
  if (!isLoggedIn.value) {
    savedCount.value = 0
    return
  }
  try {
    // 사용자 격리 키 (euchs_cart_{userId}) 로만 읽기 — 레거시 키 fallback 영구 제거
    const cartKey = getCartStorageKey()
    const userCart = localStorage.getItem(cartKey)
    if (userCart) {
      const parsed = JSON.parse(userCart)
      savedCount.value = Array.isArray(parsed) ? parsed.length : 0
    } else {
      // 격리 키에 데이터 없으면 무조건 0 (레거시 키 절대 참조하지 않음)
      savedCount.value = 0
    }
  } catch (e) {
    savedCount.value = 0
  }
}

// ----------------------------------------------------
// LNB Sidebar: Profile & Accordion Menu State
// ----------------------------------------------------
const getLocalSavedUser = () => {
  try {
    const raw = localStorage.getItem('euchs_auth_user')
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

const displayBuyerName = computed(() => {
  if (isLoggedIn.value) {
    return userDisplayName.value || '회원'
  }
  const local = getLocalSavedUser()
  if (local) {
    return local.user_metadata?.full_name || local.user_metadata?.name || local.name || local.email?.split('@')[0] || '회원'
  }
  return ''
})

const displayBuyerEmail = computed(() => {
  if (isLoggedIn.value) {
    return userEmail.value || ''
  }
  const local = getLocalSavedUser()
  return local?.email || ''
})

const displayCompanyName = computed(() => {
  if (!isLoggedIn.value) {
    const local = getLocalSavedUser()
    if (!local) return ''
  }
  const user = currentUser.value || getLocalSavedUser()
  const biz = getUserBusinessInfo(user)
  if (biz?.company_name) return biz.company_name
  const name = userDisplayName.value || user?.name || user?.user_metadata?.full_name
  if (name) return `${name} 바이어`
  return '바이어 회원'
})

const expandedMenus = ref({
  products: true,
  orders: true,
  warehouse: true,
  shipping: true,
  account: true
})

watch(() => route.path, (newPath) => {
  // 특정 하위 페이지 직접 접근 시에만 해당 메뉴 오픈 (/mall 첫 진입 시는 전부 접힘 유지)
  if (newPath.startsWith('/dashboard/cart') || newPath.startsWith('/dashboard/sourcing-products') || newPath.startsWith('/dashboard/stores')) {
    expandedMenus.value.products = true
  } else if (newPath.startsWith('/dashboard/orders')) {
    expandedMenus.value.orders = true
  } else if (newPath.startsWith('/dashboard/warehouse')) {
    expandedMenus.value.warehouse = true
  } else if (newPath.startsWith('/dashboard/logistics')) {
    expandedMenus.value.shipping = true
  } else if (newPath.startsWith('/dashboard/account')) {
    expandedMenus.value.account = true
  }
})

const toggleMenu = (key) => {
  expandedMenus.value[key] = !expandedMenus.value[key]
}

// 로그아웃 확인: window.confirm 대신 프로젝트 공통 ConfirmSaveModal 사용
const isSignOutConfirmOpen = ref(false)

const handleMallSignOut = () => {
  isSignOutConfirmOpen.value = true
}

const executeMallSignOut = async () => {
  await signOut()
  router.push('/mall')
}

// ----------------------------------------------------
// B2B Auth Guard State & Handlers (화면 중앙 커스텀 모달)
// ----------------------------------------------------
const isB2BAuthGuardOpen = ref(false)
const b2bGuardType = ref('guest') // 'guest' | 'unverified'
const pendingProductToOpen = ref(null)
const pendingOfferIdToOpen = ref(null)

const openB2BGuard = (type = 'guest') => {
  b2bGuardType.value = type
  isB2BAuthGuardOpen.value = true
}

const handleOpenAuthGuardEvent = (e) => {
  openB2BGuard('guest')
}

const closeB2BGuard = () => {
  isB2BAuthGuardOpen.value = false
}

const handleGuardAction = (mode) => {
  isB2BAuthGuardOpen.value = false
  openLoginModal(mode)
}

const goToAccountSettings = () => {
  closeB2BGuard()
  router.push('/dashboard/account?tab=pccc')
}

// 로그인 또는 인증 완료 시 방금 누른 상품 상세 모달 자동 오픈
const checkAndResumePendingProduct = async () => {
  if (isLoggedIn.value && isBusinessVerified.value) {
    closeB2BGuard()
    if (pendingProductToOpen.value) {
      const p = pendingProductToOpen.value
      pendingProductToOpen.value = null
      selectedModalProduct.value = p
    } else if (pendingOfferIdToOpen.value) {
      const id = pendingOfferIdToOpen.value
      pendingOfferIdToOpen.value = null
      await openDetailModalById(id)
    }
  } else if (isLoggedIn.value && !isBusinessVerified.value) {
    // 로그인했지만 미인증 → 가드 타입만 전환
    b2bGuardType.value = 'unverified'
  }
}

// ----------------------------------------------------
// 상품 상세 모달 오픈 (비로그인 → guest 모달, 미인증 로그인 → 인증 안내 모달, 인증 완료 → 정상 오픈)
// ----------------------------------------------------
const openProductModal = (item) => {
  // 1. 비로그인 상태 차단 → B2B 비회원 안내 모달
  if (!isLoggedIn.value) {
    pendingProductToOpen.value = item
    pendingOfferIdToOpen.value = null
    openB2BGuard('guest')
    return
  }

  // 2. 로그인했으나 미인증 → 사업자 인증 안내 모달
  if (!isBusinessVerified.value) {
    pendingProductToOpen.value = item
    pendingOfferIdToOpen.value = null
    openB2BGuard('unverified')
    return
  }

  // 3. 인증 완료 회원 → 즉시 상세 모달 정상 오픈
  pendingProductToOpen.value = null
  pendingOfferIdToOpen.value = null
  selectedModalProduct.value = item
  recordRecentlyViewed(item)
}

// ── 최근 본 상품 기록 공통 헬퍼 ─────────────────────────────────
// openProductModal / openDetailModalById 양쪽에서 호출
// ★ Fix: adminSignIn 경로에서 euchs_admin_token이 잔류하면 initAuth가
//   Supabase getSession()을 건너뜀 → auth.uid()=null → RLS 42501 발생.
//   insert 전 실제 Supabase Auth 세션을 확인해 JWT가 없으면 스킵.
async function recordRecentlyViewed(item) {
  if (!currentUser.value?.id || !item) return
  const itemId = String(item.id || item.num_iid || item.offerId || '')
  if (!itemId) return

  // Supabase Auth 세션 확인 — 세션(JWT)이 없으면 auth.uid()=null → RLS 거부
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // 관리자 토큰 경로 또는 세션 만료: RLS INSERT 불가 → 조용히 스킵
      console.warn('[RecentlyViewed] Supabase Auth 세션 없음 — insert 스킵 (관리자 토큰 경로 또는 세션 만료)')
      return
    }
  } catch (e) {
    console.error('[RecentlyViewed] getSession 실패:', e?.message || e)
    return
  }

  const snapshot = {
    id: itemId,
    titleKo: item.titleKo || '',
    title: item.titleZh || item.title || '',
    price: item.price || item.priceMin || '',
    priceFormatted: item.priceFormatted || item.price || '',
    imageUrl: item.imageUrl || item.pic_url || item.img || ''
  }
  supabase.from('recently_viewed').upsert(
    { user_id: currentUser.value.id, item_id: itemId, item_data: snapshot, viewed_at: new Date().toISOString() },
    { onConflict: 'user_id,item_id' }
  ).then(() => {
    recentlyViewedRef.value?.reload()
  }).catch((err) => {
    console.error('[RecentlyViewed] upsert 실패:', err?.message || err)
  })
}

const handleModalCartAdded = (savedItem) => {
  updateSavedCount()
  showToast(`[${(savedItem.titleKo || savedItem.titleZh).slice(0, 18)}...] 보관함에 담겼습니다.`)
}

// ----------------------------------------------------
// 1688 Direct OfferId Modal Opener
// ----------------------------------------------------
const openDetailModalById = async (offerId) => {
  // 1. 비로그인 상태 차단 → B2B 비회원 안내 모달
  if (!isLoggedIn.value) {
    pendingOfferIdToOpen.value = offerId
    pendingProductToOpen.value = null
    openB2BGuard('guest')
    return
  }

  // 2. 로그인했으나 미인증 → 사업자 인증 안내 모달
  if (!isBusinessVerified.value) {
    pendingOfferIdToOpen.value = offerId
    pendingProductToOpen.value = null
    openB2BGuard('unverified')
    return
  }

  // 3. 인증 완료 → 1688 상세 정보 조회 후 모달 오픈
  pendingOfferIdToOpen.value = null
  pendingProductToOpen.value = null
  isLoading.value = true
  errorMessage.value = ''

  try {
    const product = await fetch1688ProductById(offerId)
    selectedModalProduct.value = product
    recordRecentlyViewed(product)  // ← recently_viewed 기록 추가
  } catch (err) {
    console.warn('[Mall1688] Direct detail open fallback:', err)
  } finally {
    isLoading.value = false
  }
}

// ----------------------------------------------------
// 1688 Search & AI Execution
// ----------------------------------------------------
// categoryName: 카테고리/네비를 눌러 들어온 검색일 때만 대분류 이름이 넘어온다.
// 검색창·배너·섹션 더보기 등 그 외 경로는 기본값('')으로 미분류 처리된다.
// keywordZh: 메가메뉴 소분류 클릭에서만 넘어오는 확정 중국어 키워드(번역 생략용).
//   ⚠ 인자로만 받고 내부 상태에 남겨두지 않는다 — 호출마다 activeCategoryKeywordZh를
//     반드시 덮어써서, 이전 카테고리 키워드가 다음 검색에 따라붙지 않게 한다.
const executeSearch = async (page = 1, overrideKeyword = null, categoryName = '', keywordZh = '') => {
  const rawInput = (overrideKeyword !== null ? overrideKeyword : queryInput.value).trim()
  if (!rawInput) return

  entryCategoryName.value = categoryName || ''
  // 카테고리 경로가 아니면 ''로 초기화된다(더보기 페이징이 이 값을 그대로 재사용한다).
  activeCategoryKeywordZh.value = String(keywordZh || '').trim()

  // 1688 URL 패턴 체크 (예: detail.1688.com/offer/804895839729.html, offerId=804895839729 등)
  // 판정은 utils/offerId.js의 공용 함수 — HomeView.handleMain1688Search와 동일 기준.
  const offerId = extractOfferId(rawInput)

  if (offerId && page === 1) {
    // [분기 A] 1688 URL 또는 상품 ID인 경우 -> 상세 정보 API 단건 호출 후 모달 즉시 오픈
    await openDetailModalById(offerId)
    return
  }

  // [분기 B] 일반 검색어인 경우 → 한-중 번역 및 1688 소싱 목록 검색 진행
  isLoading.value = true
  errorMessage.value = ''
  currentPage.value = page

  // 30초 전체 타임아웃 래핑 (OneBound API 무한 대기 방지)
  const searchTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Search timeout after 30s')), 30000)
  )

  try {
    const result = await Promise.race([
      search1688WithTranslation(
        rawInput,
        page,
        {
          sort: sortOrder.value,
          ...(activeCategoryKeywordZh.value ? { keywordZh: activeCategoryKeywordZh.value } : {})
        }
      ),
      searchTimeout
    ])

    // extract1688Items로 다계층 파싱 — search1688WithTranslation이 이미 정규화된 items를 반환하지만
    // 만약 비어있으면 rawResponse/result 자체에서 다시 한번 추출 시도
    let parsedItems = (result.items && result.items.length > 0)
      ? result.items
      : extract1688Items(result.rawResponse || result)

    // 필드 안전 매핑 — 카드 렌더에 필요한 최소 필드 보장
    if (parsedItems.length > 0 && !parsedItems[0].imageUrl && !parsedItems[0].titleKo) {
      parsedItems = parsedItems.map((item, idx) => {
        const raw = item.raw || item
        return {
          id: item.id || raw.num_iid || raw.item_id || raw.id || `item-${idx}`,
          itemId: item.itemId || raw.num_iid || '',
          titleKo: item.titleKo || item.title || raw.title || raw.name || raw.subject || '1688 도매 상품',
          titleZh: item.titleZh || raw.title || '',
          title: item.title || item.titleKo || raw.title || '1688 도매 상품',
          imageUrl: item.imageUrl || raw.pic_url || raw.pic || raw.img || raw.image || '',
          price: item.price || item.priceNum || parseFloat(String(raw.price || raw.promotion_price || '0').replace(/[^0-9.]/g, '')) || 0,
          priceNum: item.priceNum || item.price || 0,
          priceFormatted: item.priceFormatted || String(item.price || 0),
          minOrder: item.minOrder || item.moq || parseInt(raw.min_num || '1', 10) || 1,
          sales: item.sales || parseInt(raw.sold_count || raw.salesCount || raw.volume || '0', 10) || 0,
          repurchaseRate: item.repurchaseRate || '',
          detailUrl: item.detailUrl || item.itemUrl || '',
          company: item.company || raw.nick || raw.shop_name || '1688 공급사',
        }
      }).filter(item => item.id && (item.titleKo || item.title))
    }

    console.log(`[Mall1688] Search complete: ${parsedItems.length}개 상품 바인딩`)
    items.value = parsedItems
    lastQueryKo.value = result.queryKo || rawInput
    lastQueryZh.value = result.queryZh || ''
    hasSearched.value = true

    // ── 백그라운드 번역 폴백 ─────────────────────────────────────────────
    // search1688WithTranslation 내부에서 번역이 실패/타임아웃된 경우,
    // 화면에는 이미 titleZh(중국어 원문)로 카드가 표시되어 있음.
    // 미번역 항목(titleKo === titleZh)을 백그라운드에서 재시도해 제목만 교체.
    const stillUntranslated = parsedItems.filter(it => !it.titleKo || it.titleKo === it.titleZh)
    if (stillUntranslated.length > 0) {
      console.log(`[Mall1688] 백그라운드 번역 재시도: ${stillUntranslated.length}건`)
      translateItemsBatch(stillUntranslated).catch(err => {
        console.warn('[Mall1688] 백그라운드 번역 실패 (원문 유지):', err.message)
      })
      // translateItemsBatch는 items 배열 객체를 직접 변경 → Vue 반응성으로 카드 제목 자동 갱신
    }
    // ─────────────────────────────────────────────────────────────────────

  } catch (err) {
    console.warn('[Mall1688] Search notice:', err.message || err)
    // 에러 시에도 hasSearched를 true로 설정해 빈 결과 UI 노출 (무한 스켈레톤 방지)
    items.value = []
    hasSearched.value = true
  } finally {
    isLoading.value = false
  }
}

// ----------------------------------------------------
// 📷 이미지(사진) 검색 파이프라인 (모달 방식)
// ----------------------------------------------------

/** 카메라 아이콘 클릭 → 이미지 검색 모달 열기 */
const openImageSearchModal = () => {
  if (!isLoggedIn.value) {
    showToast('사진 검색은 로그인 후 이용 가능합니다.')
    openLoginModal()
    return
  }
  isImageModalOpen.value = true
}

/** ImageSearchModal의 search-done 이벤트 수신 → 결과를 items에 렌더링 */
const onImageSearchDone = ({ items: resultItems, totalResults, previewUrl }) => {
  if (imageSearchPreviewUrl.value) {
    // 이전 ObjectURL 해제 (모달에서 넘어온 previewUrl은 모달이 관리)
  }
  imageSearchPreviewUrl.value = previewUrl || ''
  isImageSearchMode.value = true
  isImageUploading.value = false
  isLoading.value = false
  queryInput.value = ''
  items.value = resultItems || []
  hasSearched.value = true

  if (!resultItems || resultItems.length === 0) {
    showToast('유사한 상품을 찾지 못했습니다.')
  }
}

/** ImageSearchModal의 search-start 이벤트 수신 → 로딩 상태 진입 */
const onImageSearchStart = () => {
  isImageUploading.value = true
  isLoading.value = true
  hasSearched.value = false
  items.value = []
  queryInput.value = ''
}

/** ImageSearchModal의 search-error 이벤트 수신 */
const onImageSearchError = (err) => {
  isImageUploading.value = false
  isLoading.value = false
  hasSearched.value = true
  items.value = []
  showToast('이미지 검색에 실패했습니다. 다른 이미지로 시도해 보세요.')
  console.warn('[MallView] ImageSearch error:', err)
}

/** 이미지 검색 모드 취소 → 텍스트 검색 리셋 */
const resetImageSearch = () => {
  imageSearchPreviewUrl.value = ''
  isImageSearchMode.value = false
  items.value = []
  hasSearched.value = false
}


const loadMoreProducts = async () => {
  // 1. 비로그인 상태 차단 -> 로그인 모달 유도
  if (!isLoggedIn.value) {
    showToast('추가 상품 조회는 회원 전용 서비스입니다. 로그인해 주세요.')
    openLoginModal('login')
    return
  }

  // 2. 로그인된 모든 회원이 다음 페이지 호출 가능
  const query = lastQueryKo.value || queryInput.value.trim()
  if (!query) return

  isLoadingMore.value = true
  const nextPage = currentPage.value + 1

  try {
    const result = await search1688WithTranslation(
      query,
      nextPage,
      {
        sort: sortOrder.value,
        // 소분류 결과의 2페이지 이후도 1페이지와 같은 중국어 키워드로 이어받는다.
        // (없으면 같은 한글이 파파고에서 다르게 번역되어 다른 카테고리가 섞일 수 있다.)
        ...(activeCategoryKeywordZh.value ? { keywordZh: activeCategoryKeywordZh.value } : {})
      }
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
    const settings = await fetchSiteSettings()
    if (settings) {
      agencyFeeRate.value = Number(settings.agency_fee_rate) || 8.0
      // 국제 고시환율: DB live_market_rate 직접 사용
      if (settings.live_market_rate != null && !isNaN(Number(settings.live_market_rate))) {
        liveMarketRate.value = Number(settings.live_market_rate)
      }
      // 공식 결제환율: DB exchange_rate 직접 사용
      customExchangeRate.value = settings.exchange_rate != null ? Number(settings.exchange_rate) : null
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
  e.target.onerror = null
  e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=60'
}

// ----------------------------------------------------
// Real-time Notice State (Single Source of Truth: euchs_admin_notices)
// ----------------------------------------------------
const mallNotices = ref([])
const selectedNotice = ref(null)

const latestMallNotice = computed(() => {
  if (!mallNotices.value || mallNotices.value.length === 0) return null
  const pinned = mallNotices.value.find(n => n.is_pinned || n.is_important)
  if (pinned) return pinned
  return mallNotices.value[0]
})

const openNoticeModal = (item) => {
  if (item) {
    selectedNotice.value = item
  }
}

const loadMallNotices = () => {
  try {
    const raw = localStorage.getItem('euchs_admin_notices') || localStorage.getItem('euchs_notices')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        mallNotices.value = parsed.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1
          if (!a.is_pinned && b.is_pinned) return 1
          return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
        })
        return
      }
    }
  } catch (e) {
    console.warn('MallView load notices error:', e)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ----------------------------------------------------
// Lifecycle & Route Query Watcher
// ----------------------------------------------------

/**
 * safeLoadBalance — 컴포넌트 스코프 최상위 선언
 * onMounted / onUnmounted 양쪽에서 동일 참조로 addEventListener / removeEventListener가
 * 정상 쌍을 이루도록 onMounted 클로저 바깥에 위치시킴.
 * (이전: onMounted 내부 const → onUnmounted에서 ReferenceError 발생)
 */
const safeLoadBalance = () => {
  try {
    loadBalance().catch(err => console.debug('[MallView] safeLoadBalance notice:', err))
  } catch (err) {
    console.debug('[MallView] safeLoadBalance notice:', err)
  }
}
const handleIncomingQuery = async () => {
  const rawOfferId = route.query.offerId
  const offerId = typeof rawOfferId === 'string' ? rawOfferId.trim() : ''

  if (offerId) {
    // 이번 진입에서 이미 연 offerId면 재오픈하지 않는다 (popstate 루프 차단).
    if (consumedOfferId.value === offerId) return
    // await 이전에 먼저 기록해 동시 재진입도 막는다.
    consumedOfferId.value = offerId
    await openDetailModalById(offerId)
    return
  }

  // URL에서 offerId가 사라진 경우 → 다음 딥링크를 위해 소비 기록 해제
  consumedOfferId.value = ''

  const q = route.query.q
  if (q && typeof q === 'string' && q.trim()) {
    queryInput.value = q.trim()
    executeSearch(1)
  } else {
    // 검색어 없음 → 홈 섹션 자동 로드 (Daily Cache 엔진)
    loadHomeSections()
  }
}

onMounted(async () => {
  // ── 네이버 OAuth 콜백 처리 (/mall?code=...&state=...) ──────────────────
  const naverCode = route.query.code
  const naverState = route.query.state
  if (naverCode && naverState) {
    try {
      const result = await handleNaverCallback(String(naverCode), String(naverState))
      const dest = result?.returnUrl
      if (dest && dest !== '/mall' && dest !== '/' && !dest.startsWith('/?')) {
        router.replace(dest)
        return
      } else {
        router.replace({ path: '/mall', query: {} })
      }
    } catch (e) {
      console.warn('[MallView] Naver callback error:', e)
      router.replace({ path: '/mall', query: {} })
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  await loadRates()
  safeLoadBalance()
  loadMallNotices()
  updateSavedCount()
  // 메가메뉴 소분류 클릭 시 대기 없이 중국어 키워드를 쓰도록 미리 받아둔다(세션 1회).
  preloadSubCategoryKeywords()
  // loadHomeSections()도 내부에서 applySectionPoolBannerOverrides()를 호출하지만,
  // 이 프로미스가 그보다 늦게 끝나면 sectionBanners.value 전체 교체로 오버라이드가
  // 덮어써질 수 있어 완료 후 한 번 더 재적용한다 (idempotent, 순서 무관하게 항상 최종 반영)
  loadSectionBanners().then(() => applySectionPoolBannerOverrides())
  handleIncomingQuery()
  fetchOrdersFromSupabase().then(dbOrders => {
    if (Array.isArray(dbOrders)) submittedOrders.value = dbOrders
  }).catch(e => {
    submittedOrders.value = []
    console.warn('[MallView] 주문 뱃지 fetch 실패:', e)
  })

  window.addEventListener('euchs:business_verified', checkAndResumePendingProduct)
  window.addEventListener('euchs:login_success', checkAndResumePendingProduct)
  window.addEventListener('euchs:open-auth-guard', handleOpenAuthGuardEvent)
  window.addEventListener('euchs-auth-changed', onAuthChanged)
  window.addEventListener('euchs:cart-updated', updateSavedCount)
  window.addEventListener('euchs:cart_updated', updateSavedCount)
  window.addEventListener('storage', updateSavedCount)
  window.addEventListener('euchs-notice-update', loadMallNotices)
  window.addEventListener('storage', loadMallNotices)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('touchstart', handleClickOutside, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('euchs:business_verified', checkAndResumePendingProduct)
  window.removeEventListener('euchs:login_success', checkAndResumePendingProduct)
  window.removeEventListener('euchs:open-auth-guard', handleOpenAuthGuardEvent)
  window.removeEventListener('euchs-auth-changed', onAuthChanged)
  window.removeEventListener('euchs:cart-updated', updateSavedCount)
  window.removeEventListener('euchs:cart_updated', updateSavedCount)
  window.removeEventListener('storage', updateSavedCount)
  window.removeEventListener('euchs-notice-update', loadMallNotices)
  window.removeEventListener('storage', loadMallNotices)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('touchstart', handleClickOutside)
})

// ----------------------------------------------------
// Auth 상태 변경 핸들러 — 로그아웃 시 화면 데이터 즉시 초기화
// ----------------------------------------------------
const onAuthChanged = (e) => {
  if (!e.detail?.user) {
    // 로그아웃: 주문 카운트 즉시 비우기 → orderStats computed 자동 0으로 반영
    submittedOrders.value = []
  } else {
    // 로그인 또는 계정 전환: 해당 계정 데이터 재로드
    safeLoadBalance()
    checkAndResumePendingProduct()
    updateSavedCount()
    fetchOrdersFromSupabase().then(dbOrders => {
      if (Array.isArray(dbOrders)) submittedOrders.value = dbOrders
    }).catch(() => { submittedOrders.value = [] })
  }
}

watch(
  () => isLoggedIn.value,
  () => {
    updateSavedCount()
  },
  { immediate: true }
)

watch(currentUser, () => {
  checkAndResumePendingProduct()
  updateSavedCount()  // 계정 전환 시 장바구니 수량 즉시 재계산
})


watch(() => route.query, () => {
  handleIncomingQuery()
}, { deep: true })
</script>

<style scoped>
.custom-sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 transparent;
}
.custom-sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-sidebar-scroll::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 9999px;
}
.custom-sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

/* ── 주문발주/마이페이지 버튼 ring-pulse 애니메이션 ─────────────────────
   box-shadow로 amber ring이 바깥으로 번졌다가 사라지는 은은한 반복
   2.5s 주기 / ease-out으로 급격하지 않게 / 콘텐츠 레이아웃에 영향 없음 */
@keyframes mallMypagePulse {
  0% {
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 0 rgba(251, 191, 36, 0.55);
  }
  65% {
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 6px rgba(251, 191, 36, 0);
  }
  100% {
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 0 rgba(251, 191, 36, 0);
  }
}
.mall-mypage-btn {
  animation: mallMypagePulse 2.5s ease-out infinite;
}
</style>
