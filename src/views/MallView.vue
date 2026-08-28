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
                            <p class="text-[10px] text-gray-400">1688 공식 소싱 카테고리</p>
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
                              @click.stop="handleSubCategoryClick(subItem, activeMegaCat)"
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
                  @input="handleSearchInputDebounced"
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
          <!-- 3. 우측 발주 대기 보관함 (장바구니) — 로그인 시만 노출 -->
          <router-link
            v-if="isLoggedIn"
            to="/dashboard"
            class="hidden md:flex items-center gap-2.5 px-3.5 h-11 rounded-xl bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 transition group shrink-0"
            title="발주대기 보관함 바로가기"
          >
            <div class="w-7 h-7 rounded-lg bg-white text-rose-600 shadow-xs flex items-center justify-center text-xs group-hover:scale-105 transition border border-gray-100">
              <i class="fas fa-shopping-bag"></i>
            </div>
            <div class="text-left leading-none">
              <div class="text-[9px] text-gray-500 font-medium">발주 대기</div>
              <div class="text-xs font-black text-gray-900 group-hover:text-rose-600 font-mono mt-0.5">
                {{ savedCount }}건
              </div>
            </div>
          </router-link>

        </div>

        <!-- 4. 서브 바: 퀵 카테고리 탭 (모바일 좌측 시작 스크롤 & PC 중앙 정렬) -->
        <div class="mt-2 pt-2 border-t border-gray-100 flex items-center justify-start sm:justify-center text-xs w-full">
          <!-- 퀵 카테고리 탭 -->
          <div class="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 px-3 sm:px-0 w-full scroll-smooth">
            <button
              v-for="qt in quickTabs"
              :key="qt.id"
              type="button"
              @click.stop="selectQuickTab(qt)"
              :class="[
                'shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all touch-manipulation select-none cursor-pointer',
                selectedCategoryId === qt.id
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              ]"
            >
              <span>{{ qt.emoji }}</span>
              <span>{{ qt.label }}</span>
            </button>
          </div>
        </div>

      </div>
    </header>

    <!-- ======================================================== -->
    <!-- 2. 2-COLUMN LAYOUT: LNB SIDEBAR + RIGHT MAIN CONTENT     -->
    <!-- ======================================================== -->
    <div class="flex gap-0 min-h-screen w-full max-w-[1720px] mx-auto px-2 lg:px-4 py-3 sm:py-4 items-start">

      <!-- ====================================================== -->
      <!-- LEFT: LNB SIDEBAR (고정 PC 전용)                        -->
      <!-- ====================================================== -->
      <aside class="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col gap-3 sticky top-28 self-start mr-4">

        <!-- Profile Mini Card -->
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                    <span class="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-black shrink-0">
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
                  <div class="text-[10px] text-gray-400">B2B 수입대행 ERP 서비스</div>
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
              <span class="px-1.5 py-0.2 text-[10px] rounded bg-amber-500 text-slate-950 font-black">ERP</span>
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
                    class="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black font-mono shadow-xs"
                  >
                    {{ savedCount }}
                  </span>
                </router-link>
                <!-- 📋 상품리스트 / 카테고리 -->
                <router-link
                  to="/dashboard/sourcing-products"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/sourcing-products' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <div class="flex items-center gap-1.5">
                    <span>📋</span>
                    <span>상품리스트 / 카테고리</span>
                  </div>
                  <span class="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black">주요</span>
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
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=quote"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && (route.query.tab === 'quote' || route.query.tab === 'quote_pending') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>견적 요청/대기</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=purchasing"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && route.query.tab === 'purchasing' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>1688 구매 진행중</span>
                </router-link>
              </div>
            </div>

            <!-- 4. EUC 창고 (단일 메뉴) -->
            <div class="pt-1">
              <router-link
                to="/dashboard/warehouse"
                class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left"
                :class="route.path.startsWith('/dashboard/warehouse') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500 shadow-xs' : 'text-gray-700 hover:bg-gray-100 font-medium'"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-warehouse text-base" :class="route.path.startsWith('/dashboard/warehouse') ? 'text-amber-500' : 'text-gray-400'"></i>
                  <span>이우 물류센터 입고/검수</span>
                </div>
                <span class="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">100%</span>
              </router-link>
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
                <span class="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">새소식</span>
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
                <span class="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">가이드</span>
              </router-link>
            </div>

          </nav>
        </div>

        <!-- 💡 사용가이드 버튼 -->
        <button
          type="button"
          @click="$emit('open-onboarding'); window.dispatchEvent(new Event('euchs:open-onboarding'))"
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition cursor-pointer mb-3"
        >
          <span>💡</span>
          <span>사용가이드 다시 보기</span>
        </button>

        <!-- 하단 카카오 상담 CTA -->
        <div class="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs">
          <div class="flex items-center gap-2 text-orange-400 font-bold">
            <i class="fas fa-comment-dots text-sm"></i>
            <span>1:1 전담 카카오톡 상담</span>
          </div>
          <p class="text-slate-300 text-[11px] leading-relaxed">
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
              to="/services/trade-agent"
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

            <div 
              class="space-y-1 text-xs p-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50/70 border border-gray-200/70 transition cursor-pointer group select-none"
              @click="openNoticeModal(latestMallNotice)"
              title="클릭하여 공지사항 상세 보기"
            >
              <div class="font-bold text-gray-800 flex items-center justify-between gap-1">
                <span class="flex items-center gap-1.5 text-[11px] text-rose-600 font-black">
                  <i class="fas fa-bullhorn"></i> 실시간 소싱 공지
                </span>
                <span v-if="latestMallNotice?.badge" class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                  {{ latestMallNotice.badge }}
                </span>
              </div>
              <p class="text-[11px] font-bold text-gray-800 group-hover:text-rose-600 leading-snug line-clamp-2 transition">
                {{ latestMallNotice?.title || '[공지] 1688 상품 주문 시 직영 물류센터 24시간 검수 후 안전 출고됩니다.' }}
              </p>
              <span class="text-[10px] text-gray-400 font-mono block">
                {{ formatDate(latestMallNotice?.created_at || latestMallNotice?.createdAt) }}
              </span>
            </div>
          </div>

          <div>
            <router-link
              to="/dashboard"
              class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center shadow-sm"
            >
              <i class="fas fa-truck-loading text-amber-400"></i>
              <span>발주 & 배송관리 마이페이지</span>
            </router-link>
          </div>
        </div>

      </div>




      <!-- ============================================================ -->
      <!-- HOME: CN인사이더 스타일 다단 섹션 (검색어 없을 때 = 홈 뷰)  -->
      <!-- ============================================================ -->
      <template v-if="!hasSearched && !isLoading && !isImageSearchMode">

        <!-- 섹션 스켈레톤 (첫 API 호출 중) -->
        <div v-if="isHomeSectionsLoading" class="space-y-8">
          <div v-for="sk in 4" :key="sk" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

        <!-- 4개 테마 섹션 블록 -->
        <div v-else-if="homeSections.length > 0" class="space-y-6 sm:space-y-8">
          <section
            v-for="section in homeSections"
            :key="section.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <!-- 섹션 헤더 -->
            <div class="px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/80">
              <div class="flex items-start gap-3 min-w-0">
                <div class="min-w-0">
                  <h2 class="text-sm sm:text-base font-black text-gray-900 leading-tight">{{ section.title }}</h2>
                  <p class="text-[11px] text-gray-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>{{ section.subtitle }}</span>
                    <span class="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-600 shrink-0">
                      {{ section.keyword }}
                    </span>
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

            <!-- 상품 카드 그리드 (4열 반응형) -->
            <div class="p-3 sm:p-4">
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
                      <span class="px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black shadow-sm tracking-wide">
                        1688
                      </span>
                    </div>
                    <!-- MOQ 뱃지 -->
                    <div v-if="item.minOrder && item.minOrder > 1" class="absolute top-2 right-2">
                      <span class="px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                        MOQ {{ item.minOrder }}
                      </span>
                    </div>
                    <!-- 구매대행 신청 호버 오버레이 -->
                    <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent py-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span class="text-white text-[10px] font-bold flex items-center gap-1">
                        <i class="fas fa-shopping-cart text-amber-400 text-[9px]"></i>
                        구매대행 신청
                      </span>
                    </div>
                  </div>

                  <!-- 카드 정보 -->
                  <div class="p-2.5 sm:p-3 space-y-1.5">
                    <h3
                      class="text-[11px] sm:text-[12px] font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-orange-600 transition"
                      :title="item.titleKo || item.title || item.titleZh"
                    >
                      {{ item.titleKo || item.title || item.titleZh }}
                    </h3>
                    <div class="pt-1.5 border-t border-gray-100">
                      <div class="flex items-baseline gap-1 font-mono">
                        <span class="text-red-600 font-bold text-sm tracking-tight">
                          ¥{{ item.priceFormatted || item.price }}
                        </span>
                        <span class="text-gray-400 text-[10px] font-medium">
                          ₩{{ formatKrw((item.price || 0) * customExchangeRate) }}
                        </span>
                      </div>
                      <div class="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>판매 <b class="text-gray-600 font-medium">{{ item.sales || '0' }}건</b></span>
                        <span class="text-emerald-600 font-semibold">재구매 {{ item.repurchaseRate || '90%' }}</span>
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
            <option value="sales_desc">누적 판매량 높은순</option>
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

      </main><!-- /right main content -->

    </div><!-- /2-column flex wrapper -->

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
              <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black tracking-wide">
                B2B 수입대행 회원 전용
              </span>
              <h3 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight pt-0.5">
                B2B 회원 전용 서비스
              </h3>
              <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                1688 실시간 도매 단가 및 상품 상세 정보는 회원 전용 서비스입니다.<br />
                로그인이나 회원가입 후 편리하게 이용해 보세요.
              </p>
            </div>

            <!-- 3. 하단 버튼 액션 그룹 -->
            <div class="space-y-2.5 pt-1">
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
            </div>

            <!-- 4. 하단 부가 혜택 안내 -->
            <div class="pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-medium flex items-center justify-center gap-3">
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
import { search1688WithTranslation, fetch1688ProductById, search1688ByImageUrl } from '../services/api1688'
import { getMockSearchResults } from '../services/mock1688Data'
import { fetchSiteSettings } from '../lib/settings'
import {
  isLoggedIn,
  currentUser,
  openLoginModal,
  isUserBusinessVerified,
  isBusinessVerified,
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
import { userBalance, loadBalance } from '../lib/balanceStore'
import { supabase } from '../lib/supabase'

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

const lastQueryKo = ref('')
const lastQueryZh = ref('')
const items = ref([])

// ============================================================
// 🏠 CN인사이더 스타일 홈 섹션 – 날짜 기반 로테이션 + Daily Cache
// ============================================================

/** 섹션별 키워드 풀: 오늘 Day-of-Year 인덱스로 매일 순환 */
const HOME_SECTION_POOLS = {
  md:      ['316 진공 보온 텀블러', '대용량 스포츠 보틀 1000ml', '여성 린넨 셔츠', '비건레더 숄더백', '플리츠 롱 원피스'],
  fashion: ['여성 린넨 원피스', '데일리 오버핏 티셔츠', '비건레더 숄더백', '초경량 메쉬 스니커즈', '린넨 반팔 셔츠', '플리츠 스커트'],
  living:  ['316 스테인리스 텀블러', '대용량 스트로우 보온병', '포터블 보온수통', '이중진공 텀블러 900ml', '스포츠 보틀'],
  sports:  ['초경량 쿠셔닝 런닝화', '방수 옥스포드 캔버스 보스턴백', '천연 소가죽 자동 버클 벨트', 'UV400 편광 선글라스'],
}

const getTodayKeyword = (pool) => {
  const now = new Date()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return pool[dayOfYear % pool.length]
}

const getTodayCacheKey = () =>
  `euchs_home_daily_sections_${new Date().toISOString().slice(0, 10)}`

const homeSections = ref([])
const isHomeSectionsLoading = ref(false)

/**
 * 홈 섹션 데이터 로더 (Daily Cache Engine)
 * - 오늘 날짜 캐시 존재 시 → 즉시 렌더 (API 0건)
 * - 캐시 없음 → 이전 날짜 캐시 삭제 → 섹션당 1회 API (총 4회)
 * - 429 / 네트워크 오류 시 getMockSearchResults() 자동 대체
 */
const loadHomeSections = async () => {
  if (hasSearched.value || isHomeSectionsLoading.value) return

  const cacheKey = getTodayCacheKey()

  // 1. 오늘 날짜 캐시 있으면 즉시 사용 (API 0건)
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        homeSections.value = parsed
        return
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

  // 3. 4개 섹션 API 병렬 호출 (총 최대 4회)
  isHomeSectionsLoading.value = true

  const sectionDefs = [
    {
      id:       'md',
      title:    '🔥 오늘의 MD 추천 베스트',
      subtitle: '매일 업데이트되는 소싱 MD 엄선 추천 상품',
      keyword:  getTodayKeyword(HOME_SECTION_POOLS.md),
      color:    'from-rose-500 to-orange-500',
    },
    {
      id:       'fashion',
      title:    '👗 트렌드 패션 기획전',
      subtitle: '오늘의 패션 핫아이템 모음',
      keyword:  getTodayKeyword(HOME_SECTION_POOLS.fashion),
      color:    'from-violet-500 to-purple-600',
    },
    {
      id:       'living',
      title:    '🏠 생활 & 주방 아이디어 잡화',
      subtitle: '집을 더 편리하게 만드는 베스트 잡화',
      keyword:  getTodayKeyword(HOME_SECTION_POOLS.living),
      color:    'from-emerald-500 to-teal-600',
    },
    {
      id:       'sports',
      title:    '⛺ 스포츠/레저 & 캠핑 테마관',
      subtitle: '아웃도어 & 홈트 인기 상품 모음',
      keyword:  getTodayKeyword(HOME_SECTION_POOLS.sports),
      color:    'from-blue-500 to-indigo-600',
    },
  ]

  const results = await Promise.all(
    sectionDefs.map(async (sec) => {
      try {
        const res = await search1688WithTranslation(sec.keyword, 1, { sort: 'default' })
        let items = (res.items || []).slice(0, 8)
        if (items.length === 0) {
          const mock = getMockSearchResults(sec.keyword)
          items = (mock.items || []).slice(0, 8)
        }
        return { ...sec, items }
      } catch (e) {
        // 429 / 오류 → mock fallback
        try {
          const mock = getMockSearchResults(sec.keyword)
          return { ...sec, items: (mock.items || []).slice(0, 8) }
        } catch (me) {
          return { ...sec, items: [] }
        }
      }
    })
  )

  homeSections.value = results
  isHomeSectionsLoading.value = false

  // 오늘 날짜 캐시로 저장
  try {
    localStorage.setItem(cacheKey, JSON.stringify(results))
  } catch (e) {}
}

/**
 * 홈 섹션 [더보기 >] 클릭 → 해당 키워드로 실시간 검색 전환
 */
const searchBySection = (section) => {
  queryInput.value = section.keyword
  executeSearch(1)
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
    keyword: '인테리어 문구',
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
  { id: 'interior', emoji: '🛋️', label: '홈인테리어', keyword: '인테리어 문구' },
  { id: 'digital', emoji: '📱', label: '디지털/가전', keyword: '디지털 가전' },
  { id: 'camping', emoji: '⛺', label: '스포츠/레저', keyword: '캠핑 레저' },
  { id: 'pet', emoji: '🐶', label: '펫/유아', keyword: '반려동물 강아지' },
  { id: 'beauty', emoji: '💄', label: '뷰티', keyword: '뷰티 화장품' }
]

// ── 메가메뉴 상태 ─────────────────────────────────────────
const selectedCategoryId = ref('fashion')
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
  executeSearch(1)
}

const selectCategory = (cat) => {
  if (megaMenuTimer) clearTimeout(megaMenuTimer)
  if (categoryHoverTimer) clearTimeout(categoryHoverTimer)
  isMegaMenuOpen.value = false
  hoveredCategory.value = null
  selectedCategoryId.value = cat.id
  queryInput.value = cat.keyword || cat.name
  executeSearch(1)
}

const handleSubCategoryClick = (subKeyword, parentCat) => {
  if (megaMenuTimer) clearTimeout(megaMenuTimer)
  if (categoryHoverTimer) clearTimeout(categoryHoverTimer)
  isMegaMenuOpen.value = false
  hoveredCategory.value = null
  selectedCategoryId.value = parentCat.id
  queryInput.value = subKeyword
  executeSearch(1)
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
  shipping: true,
  account: true
})

watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/dashboard/cart') || newPath.startsWith('/dashboard/sourcing-products') || newPath.startsWith('/mall') || newPath.startsWith('/dashboard/stores')) {
    expandedMenus.value.products = true
  } else if (newPath.startsWith('/dashboard/orders')) {
    expandedMenus.value.orders = true
  } else if (newPath.startsWith('/dashboard/logistics')) {
    expandedMenus.value.shipping = true
  } else if (newPath.startsWith('/dashboard/account')) {
    expandedMenus.value.account = true
  }
}, { immediate: true })

const toggleMenu = (key) => {
  expandedMenus.value[key] = !expandedMenus.value[key]
}

const handleMallSignOut = async () => {
  if (!confirm('로그아웃하시겠습니까?')) return
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
  if (isLoggedIn.value) {
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
  }
}

// ----------------------------------------------------
// 상품 상세 모달 오픈 (비로그인 시 B2B 안내 모달, 로그인 회원 전체 개방)
// ----------------------------------------------------
const openProductModal = (item) => {
  // 1. 비로그인 상태 차단 -> B2B 회원 전용 안내 모달 오픈
  if (!isLoggedIn.value) {
    pendingProductToOpen.value = item
    pendingOfferIdToOpen.value = null
    openB2BGuard('guest')
    return
  }

  // 2. 로그인된 모든 회원 -> 즉시 상세 모달 정상 오픈
  pendingProductToOpen.value = null
  pendingOfferIdToOpen.value = null
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
  // 1. 비로그인 상태 차단 -> B2B 회원 전용 안내 모달 오픈
  if (!isLoggedIn.value) {
    pendingOfferIdToOpen.value = offerId
    pendingProductToOpen.value = null
    openB2BGuard('guest')
    return
  }

  // 2. 로그인된 모든 회원 -> 1688 상세 정보 조회 후 모달 오픈
  pendingOfferIdToOpen.value = null
  pendingProductToOpen.value = null
  isLoading.value = true
  errorMessage.value = ''

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
// 1688 Search & AI Execution (with 500ms Debounce & Quota Defense)
// ----------------------------------------------------
let searchDebounceTimer = null

const executeSearch = async (page = 1, overrideKeyword = null) => {
  clearTimeout(searchDebounceTimer)

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

  // 30초 전체 타임아웃 래핑 (DeepL/RapidAPI 무한 대기 방지)
  const searchTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Search timeout after 30s')), 30000)
  )

  try {
    const result = await Promise.race([
      search1688WithTranslation(rawInput, page, { sort: sortOrder.value }),
      searchTimeout
    ])

    items.value = result.items || []
    lastQueryKo.value = result.queryKo || rawInput
    lastQueryZh.value = result.queryZh || ''
    hasSearched.value = true
  } catch (err) {
    console.warn('[Mall1688] Search notice:', err.message || err)
    // 에러 시에도 hasSearched를 true로 설정해 빈 결과 UI 노출 (무한 스켈레톤 방지)
    items.value = []
    hasSearched.value = true
  } finally {
    isLoading.value = false
  }
}

// 500ms 디바운스 검색어 입력 핸들러
const handleSearchInputDebounced = () => {
  clearTimeout(searchDebounceTimer)
  const val = queryInput.value.trim()
  if (val.length >= 2) {
    searchDebounceTimer = setTimeout(() => {
      executeSearch(1)
    }, 500)
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
      // ✅ 원래 머물던 페이지로 복귀 (returnUrl이 /mall이거나 없으면 query만 정리)
      const dest = result?.returnUrl
      if (dest && dest !== '/mall' && dest !== '/' && !dest.startsWith('/?')) {
        router.replace(dest)
        return
      } else {
        // /mall 또는 없으면 쿼리 파라미터(code, state)만 정리
        router.replace({ path: '/mall', query: {} })
      }
    } catch (e) {
      console.warn('[MallView] Naver callback error:', e)
      router.replace({ path: '/mall', query: {} })
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  const safeLoadBalance = () => {
    try {
      loadBalance().catch(err => console.debug('[MallView] safeLoadBalance notice:', err))
    } catch (err) {
      console.debug('[MallView] safeLoadBalance notice:', err)
    }
  }

  await loadRates()
  safeLoadBalance()
  loadMallNotices()
  updateSavedCount()
  handleIncomingQuery()

  window.addEventListener('euchs:business_verified', checkAndResumePendingProduct)
  window.addEventListener('euchs:login_success', checkAndResumePendingProduct)
  window.addEventListener('euchs:open-auth-guard', handleOpenAuthGuardEvent)
  window.addEventListener('euchs-auth-changed', safeLoadBalance)
  window.addEventListener('euchs-auth-changed', checkAndResumePendingProduct)
  window.addEventListener('euchs-auth-changed', updateSavedCount)
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
  window.removeEventListener('euchs-auth-changed', safeLoadBalance)
  window.removeEventListener('euchs-auth-changed', checkAndResumePendingProduct)
  window.removeEventListener('euchs-auth-changed', updateSavedCount)
  window.removeEventListener('euchs:cart-updated', updateSavedCount)
  window.removeEventListener('euchs:cart_updated', updateSavedCount)
  window.removeEventListener('storage', updateSavedCount)
  window.removeEventListener('euchs-notice-update', loadMallNotices)
  window.removeEventListener('storage', loadMallNotices)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('touchstart', handleClickOutside)
})

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
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
</style>
