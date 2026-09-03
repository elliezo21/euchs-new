<template>
  <div class="min-h-screen bg-slate-50 font-sans flex flex-col">


    <!-- ======================================================== -->
    <!-- MAIN WORKSPACE (사이드바 + 메인 본문 2단 분할) -->
    <!-- ======================================================== -->
    <div class="flex-1 flex flex-col md:flex-row">
      
      <!-- ======================================================== -->
      <!-- 1. LEFT SIDEBAR (CN인사이더 B2B 아코디언 LNB 메뉴바) -->
      <!-- ======================================================== -->
      <aside class="w-full md:w-64 bg-white border-r border-gray-200 shrink-0 flex flex-col justify-between select-none">
        
        <!-- Top Section: Profile & LNB Tree -->
        <div>
          <!-- Profile Mini Card (클릭 시 계정센터 이동) -->
          <div class="p-4 sm:p-5 border-b border-gray-200 bg-slate-50/70">
              <!-- 1. 로그인 상태 -->
              <div v-if="isLoggedIn" class="space-y-2.5">
                <router-link 
                  to="/dashboard/account?tab=security"
                  class="flex items-center gap-3 p-2 -m-2 rounded-2xl hover:bg-amber-50/70 hover:border-amber-200 transition cursor-pointer group"
                  title="내 계정 정보 & 보안 관리 바로가기"
                >
                  <img 
                    v-if="userAvatarUrl" 
                    :src="userAvatarUrl" 
                    :alt="displayBuyerName" 
                    class="w-10 h-10 rounded-2xl object-cover border border-orange-200 shadow-sm shrink-0 group-hover:scale-105 transition"
                  />
                  <div 
                    v-else
                    class="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-black flex items-center justify-center text-base shadow-sm shrink-0 group-hover:scale-105 transition"
                  >
                    {{ (displayBuyerName || 'E').charAt(0) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="font-bold text-gray-900 text-sm truncate group-hover:text-amber-600 transition">{{ displayBuyerName }}</span>
                        <span class="px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 text-[10px] font-black shrink-0">
                          {{ isBusinessVerified ? 'VIP' : '회원' }}
                        </span>
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 font-mono truncate">{{ displayBuyerEmail }}</p>
                  </div>
                </router-link>

                <div class="flex items-center justify-between pt-2 border-t border-gray-200/80 text-xs">
                  <router-link
                    to="/dashboard/account?tab=security"
                    class="text-gray-500 hover:text-amber-600 font-medium flex items-center gap-1 cursor-pointer transition text-[11px]"
                  >
                    <i class="fas fa-user-cog text-slate-400"></i>
                    <span>계정정보 관리 &gt;</span>
                  </router-link>
                  <button
                    type="button"
                    @click="handleDashboardSignOut"
                    class="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer flex items-center gap-1 text-[11px]"
                    title="로그아웃"
                  >
                    <i class="fas fa-sign-out-alt text-xs"></i>
                    <span>로그아웃</span>
                  </button>
                </div>

                <div class="mt-2.5 pt-2 border-t border-gray-200/80 flex items-center justify-between text-xs">
                  <span class="text-gray-500 font-medium">전담 매니저</span>
                  <span class="font-bold text-gray-800 flex items-center gap-1">
                    <i class="fas fa-headset text-orange-500"></i> 이유씨 1:1 배정
                  </span>
                </div>
              </div>

              <!-- 2. 비로그인 상태: 로그인이 필요합니다 안내 및 로그인 버튼 -->
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
                  class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i class="fas fa-sign-in-alt text-[10px]"></i>
                  <span>로그인하기</span>
                </button>
              </div>
            </div>

          <!-- LNB Accordion Navigation Menu Tree -->
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

              <!-- Submenu Items (CN인사이더 스타일 5종) -->
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
                    v-if="savedItems.length > 0"
                    class="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black font-mono shadow-xs"
                  >
                    {{ savedItems.length }}
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
                  <span class="font-mono text-blue-600 text-[11px] font-bold">({{ submittedOrders.length }})</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=quote"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && (route.query.tab === 'quote' || route.query.tab === 'quote_pending') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>견적 요청/대기</span>
                  <span class="font-mono text-amber-600 text-[11px] font-bold">({{ quotePendingCount }})</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=payment"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && (route.query.tab === 'payment' || route.query.tab === 'quote_confirmed') ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>결제대기</span>
                  <span class="font-mono text-orange-600 text-[11px] font-bold">({{ paymentPendingCount }})</span>
                </router-link>
                <router-link
                  to="/dashboard/orders?tab=purchasing"
                  class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition"
                  :class="route.path === '/dashboard/orders' && route.query.tab === 'purchasing' ? 'bg-amber-500/10 text-amber-600 font-bold border-r-2 border-amber-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'"
                >
                  <span>1688 구매 진행중</span>
                  <span class="font-mono text-blue-600 text-[11px] font-bold">({{ purchasingCount }})</span>
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

        <!-- Bottom Quick Help Box -->
        <div class="p-4 m-3 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
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
            class="block w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-center rounded-xl transition"
          >
            카카오톡 상담하기
          </a>
        </div>

        <!-- Sidebar Footer: User Status & Logout -->
        <div class="p-3 border-t border-gray-200 bg-slate-50 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full shrink-0" :class="isLoggedIn ? 'bg-emerald-500' : 'bg-gray-400'"></span>
            <span class="font-bold text-gray-700 truncate text-[11px]">
              {{ isLoggedIn ? displayBuyerName : '로그인 필요' }}
            </span>
          </div>
          <button
            v-if="isLoggedIn"
            type="button"
            @click="handleDashboardSignOut"
            class="px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer text-[11px] shrink-0"
            title="로그아웃"
          >
            <i class="fas fa-sign-out-alt text-xs"></i>
            <span>로그아웃</span>
          </button>
          <button
            v-else
            type="button"
            @click="openLoginModal('login')"
            class="px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer text-[11px] shrink-0"
          >
            <i class="fas fa-sign-in-alt text-xs"></i>
            <span>로그인</span>
          </button>
        </div>

      </aside>

      <!-- ======================================================== -->
      <!-- 2. RIGHT MAIN CONTENT AREA -->
      <!-- ======================================================== -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        
        <!-- Nested Router View for /dashboard/orders, /dashboard/warehouse -->
        <router-view v-if="route.path !== '/dashboard'" />

        <!-- Default Main Dashboard Overview -->
        <template v-else>
          <!-- Top Title Bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-black">
                {{ currentMenuLabel }}
              </span>
              <h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                B2B 수입대행 통합 대시보드
              </h1>
            </div>
            <p class="text-xs text-slate-700 font-bold mt-1">
              1688 실시간 상품 소싱부터 발주, 현지 창고 검수, 세관 통관까지 원스톱으로 관리합니다.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="savedItems.length > 0"
              type="button"
              @click="openOrderModal"
              class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 animate-pulse"
            >
              <i class="fas fa-paper-plane"></i>
              <span>보관함 견적/발주 신청 ({{ savedItems.length }}건)</span>
            </button>

            <button
              type="button"
              @click="downloadEstimateExcel"
              :disabled="savedItems.length === 0 && submittedOrders.length === 0"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <i class="fas fa-file-excel"></i>
              <span>전체 견적 엑셀 다운로드</span>
            </button>
            
            <router-link
              to="/mall"
              class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
            >
              <i class="fas fa-plus text-amber-400"></i>
              <span>1688 상품 소싱하기</span>
            </router-link>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- A. TOP METRIC CARDS (3대 프로필 & 예치금/외화 카드) -->
        <!-- ======================================================== -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <!-- Card 1: User Profile & Rank Card -->
          <div class="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between shadow-none hover:border-gray-300 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">바이어 계정 현황</span>
              <span class="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-user-check"></i>
              </span>
            </div>
            <div v-if="isLoggedIn" class="mt-3 space-y-1">
              <div class="text-lg font-black text-slate-900 truncate">
                {{ displayCompanyName }}
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <span class="px-1.5 py-0.2 rounded bg-slate-100 text-slate-900 font-bold text-[11px]">
                  {{ isBusinessVerified ? 'VIP 바이어' : '일반 회원' }}
                </span>
                <span>수수료율: <b class="text-orange-600 font-extrabold">{{ agencyFeeRate }}%</b></span>
              </div>
            </div>
            <div v-else class="mt-3 space-y-1">
              <div class="text-base font-bold text-slate-800">
                로그인이 필요합니다
              </div>
              <button
                type="button"
                @click="openLoginModal('login')"
                class="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>⚡ 1초 간편 로그인하기</span>
                <i class="fas fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>

          <!-- Card 2: KRW Deposit Balance Card -->
          <div class="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between shadow-none hover:border-gray-300 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">한화 (KRW) 예치금 잔액</span>
              <span class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-won-sign"></i>
              </span>
            </div>
            <div class="mt-3">
              <div class="flex items-baseline space-x-1 font-sans">
                <span class="text-sm font-bold text-slate-900">₩</span>
                <span class="text-2xl font-black tracking-tight text-slate-950">{{ formatKrw(userBalance) }}</span>
              </div>
              <div class="text-xs font-bold text-slate-700 mt-1">
                환산 약 ¥ {{ (userBalance / customExchangeRate).toFixed(2) }} 위안
              </div>
            </div>
          </div>

          <!-- Card 3: Foreign Currency Card (CNY / USD) -->
          <div class="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between shadow-none hover:border-gray-300 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">외화 잔액 (CNY / USD)</span>
              <span class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-coins"></i>
              </span>
            </div>
            <div class="mt-3 space-y-1">
              <div class="flex items-baseline space-x-1 font-sans">
                <span class="text-sm font-bold text-rose-600">¥</span>
                <span class="text-xl font-black tracking-tight text-slate-950 font-mono">0.00</span>
                <span class="text-xs text-slate-600 font-bold ml-1">위안</span>
              </div>
              <div class="text-xs font-bold text-slate-700 font-mono">
                USD: $0.00 달러
              </div>
            </div>
          </div>

        </div>

        <!-- ======================================================== -->
        <!-- 2-COLUMN SPLIT: Central Main + Right Side Panel -->
        <!-- ======================================================== -->
        <div class="flex flex-col lg:flex-row gap-6 items-start">
          
          <!-- LEFT-CENTER: Main Stages & Table (flex-1) -->
          <div class="flex-1 min-w-0 w-full space-y-6">
            
            <!-- B. ORDER PROCESS STEPPER (공통 10단계 풀프로세스 스텝 바) -->
            <OrderProcessStepper currentSection="dashboard" />

            <!-- C. RECENT ORDERS & WAITING ITEMS COMPREHENSIVE TABLE -->
            <div class="bg-white border border-gray-200 rounded-xl shadow-none space-y-4 p-5">
              
              <!-- 한·중 FTA C/O 및 수입통관 설정 바 -->
              <div class="bg-orange-50/80 border border-orange-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    v-model="orderOptions.requestCo"
                    class="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 accent-orange-600"
                  />
                  <span class="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                    <i class="fas fa-file-shield text-orange-600 text-sm"></i>
                    <span>한·중 FTA C/O(원산지증명서) 발급 신청</span>
                    <span class="px-1.5 py-0.2 bg-orange-100 text-orange-900 rounded text-[10px] font-black border border-orange-300">
                      관세 감면용 필수 서류
                    </span>
                  </span>
                </label>
                <div class="text-[11.5px] text-slate-700 font-bold flex items-center gap-1">
                  <i class="fas fa-circle-info text-orange-600 text-xs"></i>
                  <span>발급 시 품목별 한-중 FTA 협정 관세(관세 인하 또는 0%)가 적용됩니다.</span>
                </div>
              </div>

              <!-- Table Search & Filter Bar -->
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
                    <i class="fas fa-table-list text-orange-600"></i>
                    <span>발주 대기 & 최근 주문 목록</span>
                  </h2>
                  <span class="text-xs font-bold text-slate-700">({{ displayItemsList.length }}건)</span>
                </div>

                <!-- Search & Filter Controls -->
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    v-model="selectedStatusFilter"
                    class="px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="all">전체 상태 보기</option>
                    <option value="cart">발주대기 보관함</option>
                    <option value="submitted">접수완료 (구매진행)</option>
                    <option value="견적대기">견적대기</option>
                    <option value="구매진행">구매진행</option>
                  </select>

                  <div class="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      v-model="tableSearchQuery"
                      placeholder="상품명, 1688 ID, 발주번호 검색"
                      class="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500"
                    />
                    <i class="fas fa-search absolute left-2.5 top-3 text-slate-500 text-xs"></i>
                  </div>
                </div>
              </div>

              <!-- Table View -->
              <div class="overflow-x-auto border border-slate-200 rounded-lg">
                <table class="w-full text-left text-xs divide-y divide-slate-200">
                  <thead class="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-4 font-bold text-slate-900">구분 / 번호</th>
                      <th class="py-3 px-4 font-bold text-slate-900">상품 정보</th>
                      <th class="py-3 px-4 text-center font-bold text-slate-900">옵션 / 규격</th>
                      <th class="py-3 px-4 text-center font-bold text-slate-900">수량</th>
                      <th class="py-3 px-4 text-right font-bold text-slate-900">사입 공급가 (KRW / CNY)</th>
                      <th class="py-3 px-4 text-center font-bold text-slate-900">상태</th>
                      <th class="py-3 px-4 text-center font-bold text-slate-900">관리</th>
                    </tr>
                  </thead>

                  <tbody class="divide-y divide-slate-100 bg-white">
                    
                    <!-- Empty State -->
                    <tr v-if="displayItemsList.length === 0">
                      <td colspan="7" class="py-14 text-center text-slate-500">
                        <div class="flex flex-col items-center gap-2.5 max-w-sm mx-auto">
                          <div class="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-xl shadow-xs">
                            <i class="fas fa-inbox"></i>
                          </div>
                          <span class="font-bold text-slate-800 text-sm">현재 진행 중인 발주 및 주문 내역이 없습니다.</span>
                          <p class="text-xs text-slate-400">1688 소싱몰에서 상품을 찾고 장바구니에서 간편하게 발주를 신청해 보세요.</p>
                          <router-link
                            to="/mall"
                            class="mt-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 active:scale-95 transition shadow-sm flex items-center gap-1.5"
                          >
                            <i class="fas fa-store text-xs"></i>
                            <span>1688 소싱몰 바로가기</span>
                          </router-link>
                        </div>
                      </td>
                    </tr>

                    <!-- Items List Row -->
                    <tr
                      v-for="(row, rIdx) in displayItemsList"
                      :key="row.id || rIdx"
                      class="hover:bg-slate-50 transition"
                    >
                      <!-- 1. 구분 / 번호 -->
                      <td class="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                        <span
                          class="px-2 py-0.5 rounded text-[10px] font-black"
                          :class="row.type === 'cart' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-blue-100 text-blue-800 border border-blue-300'"
                        >
                          {{ row.type === 'cart' ? '보관함' : '주문접수' }}
                        </span>
                        <div class="text-[11.5px] text-slate-800 font-bold mt-1">
                          {{ row.orderNumber || row.orderId || row.id || `ITEM-${rIdx + 1}` }}
                        </div>
                      </td>

                      <!-- 2. 상품 정보 (Thumbnail + Name) -->
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-3 min-w-[240px]">
                          <img
                            :src="row.imageUrl"
                            :alt="row.titleKo"
                            class="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                            @error="handleImageError"
                          />
                          <div class="space-y-0.5 flex-1 min-w-0">
                            <a
                              :href="row.detailUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="font-extrabold text-slate-950 hover:text-orange-600 line-clamp-2 leading-snug transition"
                              :title="row.titleKo || row.titleZh"
                            >
                              {{ row.titleKo || row.titleZh }}
                            </a>
                            <div class="text-[11.5px] text-slate-700 font-mono font-semibold">
                              1688 ID: <b class="text-slate-950 font-bold">{{ row.itemId || row.id }}</b>
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- 3. 옵션 / 규격 -->
                      <td class="py-3 px-4 text-center text-slate-800 font-semibold whitespace-nowrap">
                        <span v-if="row.skus && row.skus.length" class="bg-slate-100 px-2 py-1 rounded text-[11px] font-bold text-slate-800">
                          {{ row.skus[0].color }} / {{ row.skus[0].size }}
                          <span v-if="row.skus.length > 1" class="text-orange-600 font-black ml-0.5">
                            외 {{ row.skus.length - 1 }}종
                          </span>
                        </span>
                        <span v-else class="text-slate-500 font-medium">기본 옵션</span>
                      </td>

                      <!-- 4. 수량 -->
                      <td class="py-3 px-4 text-center font-black text-slate-950 font-mono text-sm whitespace-nowrap">
                        {{ getItemQuantity(row) }}개
                      </td>

                      <!-- 5. 사입 공급가 -->
                      <td class="py-3 px-4 text-right whitespace-nowrap">
                        <div class="flex items-baseline justify-end space-x-1 font-sans">
                          <span class="text-xs font-bold text-slate-800">₩</span>
                          <span class="font-black text-slate-950 text-sm">{{ formatKrw(getItemTotalKrw(row)) }}</span>
                        </div>
                        <div class="text-[11.5px] font-bold text-rose-600 font-mono">
                          ¥ {{ getItemTotalRmb(row).toFixed(2) }}
                        </div>
                      </td>

                      <!-- 6. 상태 -->
                      <td class="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          class="px-2.5 py-1 rounded-full text-[11px] font-black"
                          :class="row.type === 'cart' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'"
                        >
                          {{ row.status || (row.type === 'cart' ? '견적대기' : '구매진행') }}
                        </span>
                      </td>

                      <!-- 7. 관리 -->
                      <td class="py-3 px-4 text-center whitespace-nowrap space-x-1">
                        <button
                          v-if="row.type === 'cart'"
                          type="button"
                          @click="removeCartItemById(row.id)"
                          class="px-2.5 py-1 rounded border border-slate-300 hover:border-red-500 text-slate-700 hover:text-red-600 text-xs font-bold transition cursor-pointer"
                        >
                          삭제
                        </button>
                        <button
                          type="button"
                          @click="downloadRowEstimate(row)"
                          class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                          title="단건 견적서 다운로드"
                        >
                          견적서
                        </button>
                      </td>

                    </tr>

                  </tbody>
                </table>
              </div>

            </div>

          </div>

          <!-- RIGHT SIDE PANEL (CN인사이더 스타일: 가이드 & FAQ & 안내) -->
          <div class="w-full lg:w-72 xl:w-80 flex flex-col space-y-4 shrink-0">
            
            <!-- Panel 1: 시스템 이용가이드 (튜토리얼 카드) -->
            <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-none">
              <div class="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                <h4 class="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <i class="fas fa-book-open text-orange-500 text-xs mr-1"></i>
                  <span>시스템 이용가이드</span>
                </h4>
                <router-link to="/support/guide" class="text-[11px] text-slate-500 font-semibold hover:text-slate-800">더보기 &gt;</router-link>
              </div>
              <ul class="space-y-2 text-xs text-slate-800 font-bold">
                <li v-for="item in guideItems" :key="item.id">
                  <router-link
                    :to="'/support/guide/' + item.id"
                    class="hover:text-orange-600 cursor-pointer truncate transition flex items-center gap-1.5 block"
                  >
                    <span class="text-slate-400 shrink-0">•</span>
                    <span class="truncate">{{ item.title }}</span>
                  </router-link>
                </li>
              </ul>
            </div>

            <!-- Panel 2: 자주 묻는 질문 (FAQ 카드) -->
            <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-none">
              <div class="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                <h4 class="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <i class="fas fa-circle-question text-blue-600 text-xs mr-1"></i>
                  <span>자주 묻는 질문 (FAQ)</span>
                </h4>
                <router-link to="/support/guide?tab=faq" class="text-[11px] text-slate-500 font-semibold hover:text-slate-800">더보기 &gt;</router-link>
              </div>
              <ul class="space-y-2 text-xs text-slate-800 font-bold">
                <li v-for="faq in faqItems" :key="faq.id">
                  <router-link
                    :to="'/support/guide/' + faq.id"
                    class="hover:text-blue-600 hover:underline cursor-pointer transition flex items-center justify-between group"
                  >
                    <span class="truncate">• {{ faq.title }}</span>
                    <i class="fas fa-chevron-right text-[9px] text-slate-400 group-hover:text-blue-600 shrink-0 ml-1 transition"></i>
                  </router-link>
                </li>
              </ul>
            </div>

            <!-- Panel 3: 중국 현지 물류센터 직통 안내 -->
            <div class="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-xl p-4 space-y-2.5 text-xs shadow-sm border border-slate-800">
              <div class="font-extrabold flex items-center gap-1.5 text-amber-400 text-xs">
                <i class="fas fa-building-flag"></i>
                <span>🏢 EUCHS 중국 직영 물류센터 안내</span>
              </div>
              <div class="space-y-2 text-[11.5px] text-slate-200">
                <div class="flex items-center justify-between">
                  <span class="text-slate-300 font-semibold">이우(Yiwu) 전용 물류센터:</span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px] border border-emerald-500/40">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    정상 가동중
                  </span>
                </div>
                <div class="flex items-center justify-between pt-1.5 border-t border-slate-800 text-slate-200">
                  <span class="text-slate-400 font-medium">한국행 해운 선적:</span>
                  <span class="text-amber-300 font-bold">매주 4~5회 직항 출항 (정기 선적)</span>
                </div>
                <div class="pt-1.5 border-t border-slate-800 text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                  <i class="fas fa-check-circle text-emerald-400 text-[10px] shrink-0"></i>
                  <span>1688 공장 직입고 / CBM 실측 계근 / 100% 정밀 검수</span>
                </div>
              </div>
            </div>

          </div>

        </div>
        </template>

      </main>

    </div>

    <!-- 발주 설정 모달 (장바구니와 동일한 공통 컴포넌트) -->
    <OrderConfigModal
      :isOpen="isOrderModalOpen"
      :items="savedItems"
      @close="isOrderModalOpen = false"
      @submitted="handleDashboardOrderSubmitted"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchSiteSettings } from '../lib/settings'
import { exportQuoteExcel } from '../utils/excelExport'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { GUIDE_ITEMS, FAQ_ITEMS } from '../data/guideData.js'
import {
  PIPELINE_STATUSES,
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusShortLabel,
  getOrderStatusBadgeClass
} from '../lib/orderPipeline'
import { getStoredOrders, fetchOrdersFromSupabase } from '../utils/orderStorage'
import OrderProcessStepper from '../components/dashboard/OrderProcessStepper.vue'
import OrderConfigModal from '../components/dashboard/OrderConfigModal.vue'
import {
  currentUser,
  userDisplayName,
  userAvatarUrl,
  userEmail,
  isLoggedIn,
  getUserBusinessInfo,
  isUserBusinessVerified,
  isBusinessVerified,
  signOut,
  openLoginModal,
  getCartStorageKey
} from '../lib/auth'
import {
  userBalance,
  loadBalance,
  formatBalance
} from '../lib/balanceStore'

const router = useRouter()
const route = useRoute()

// 대시보드 이용가이드 위젯 (상위 5건)
const guideItems = GUIDE_ITEMS.slice(0, 5)

// 대시보드 FAQ 위젯 (5대 항목)
const faqItems = FAQ_ITEMS && FAQ_ITEMS.length > 0 ? FAQ_ITEMS : GUIDE_ITEMS.filter(item => item.category === 'faq')

// ----------------------------------------------------
// Auth & Buyer Profile Single Source of Truth
// ----------------------------------------------------
const handleDashboardSignOut = async () => {
  if (!confirm('정말 로그아웃하시겠습니까?')) return
  await signOut()
  alert('정상적으로 로그아웃되었습니다.')
  router.push('/mall')
}
const displayBuyerName = computed(() => {
  if (isLoggedIn.value) {
    return userDisplayName.value || '회원'
  }
  return ''
})

const displayBuyerEmail = computed(() => {
  if (isLoggedIn.value) {
    return userEmail.value || ''
  }
  return ''
})

const displayCompanyName = computed(() => {
  if (!isLoggedIn.value) return ''
  const biz = getUserBusinessInfo(currentUser.value)
  if (biz?.company_name) return biz.company_name
  if (userDisplayName.value) {
    return `${userDisplayName.value} 바이어`
  }
  return '바이어 회원'
})

// ----------------------------------------------------
// State: GNB & LNB Accordion Tree
// ----------------------------------------------------
const activeMenuId = ref('dashboard_main')

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

const selectMenu = (menuId, filter = null) => {
  activeMenuId.value = menuId
  if (filter) {
    selectedStatusFilter.value = filter
  }
}

const menuLabels = {
  dashboard_main: '메인 (대시보드)',
  products_sourcing: '내 소싱 상품 목록',
  products_bulk: '구매한 상점모음',
  orders_quote: '견적 요청/대기',
  orders_payment: '결제 대기/완료',
  orders_purchase: '1688 공장 구매진행',
  orders_all: '전체 주문 통합내역',
  warehouse_inbound: '이우 물류센터 입고/검수',
  warehouse_outbound: '한국행 출고/선적 요청',
  shipping_unipass: '통관 진행 (Uni-Pass)',
  shipping_tracking: '국내 택배/화물 배송추적',
  shipping_tax: '수입신고필증/세금계산서',
  account_address: '기본/추가 수령 주소지',
  account_customs_code: '사업자/통관고유부호(PCCC)',
  account_deposit: '예치금 충전/환불 관리'
}

const currentMenuLabel = computed(() => {
  return menuLabels[activeMenuId.value] || '대시보드 메인'
})

// ----------------------------------------------------
// Dashboard Data State
// ----------------------------------------------------
const selectedStatusFilter = ref('all')
const tableSearchQuery = ref('')

const savedItems = ref([])
const submittedOrders = ref([])

const orderOptions = ref({
  requestCo: true, // 한·중 FTA C/O(원산지증명서) 발급 신청 기본 선택
  requestInspection: true
})

const customExchangeRate = ref(226.19)
const agencyFeeRate = ref(8.0)

const buyerForm = ref({
  companyName: '',
  managerName: '',
  phone: '',
  email: '',
  customsCode: ''
})

const syncBuyerForm = () => {
  const biz = getUserBusinessInfo(currentUser.value) || {}
  const name = userDisplayName.value || biz.name || ''
  const email = userEmail.value || ''
  const phone = biz.phone || currentUser.value?.user_metadata?.phone || ''
  const companyName = biz.company_name || (isLoggedIn.value ? (name ? `${name} 바이어` : 'B2B 바이어') : '')
  const customsCode = biz.pccc || ''

  buyerForm.value = {
    companyName,
    managerName: name,
    phone,
    email,
    customsCode
  }
}

watch(currentUser, () => {
  syncBuyerForm()
  loadBalance()
  loadDashboardData()  // 계정 전환/로그아웃 시 장바구니 즉시 재로드
})


// ----------------------------------------------------
// Load Data from LocalStorage & Supabase
// ----------------------------------------------------
const loadDashboardData = async () => {
  try {
    // 1. 보관함 품목 — 사용자 격리 키로만 안전하게 읽기 (과거 더미 잔여물 원천 차단)
    if (!isLoggedIn.value) {
      savedItems.value = []
    } else {
      // 레거시 더미 키 잔여물 영구 파기
      localStorage.removeItem('euchs_erp_saved_items')
      localStorage.removeItem('euchs_1688_saved_items')

      const cartKey = getCartStorageKey()
      const userCart = localStorage.getItem(cartKey)
      if (userCart) {
        const parsed = JSON.parse(userCart)
        savedItems.value = Array.isArray(parsed) ? parsed : []
      } else {
        savedItems.value = []
      }
    }

    // 2. 전역 일원화된 실제 주문 데이터 조회 (더미 완전 정제)
    // 로컬 캐시를 먼저 반영해 즉각적인 렌더링을 보장하고,
    // Supabase 조회 완료 후 DB 데이터로 덮어써 정확한 건수를 표시한다.
    submittedOrders.value = getStoredOrders()
    try {
      const dbOrders = await fetchOrdersFromSupabase()
      if (Array.isArray(dbOrders) && dbOrders.length > 0) {
        submittedOrders.value = dbOrders
      }
    } catch (dbErr) {
      console.warn('[loadDashboardData] Supabase fetch notice:', dbErr)
      // 실패 시 로컬 캐시를 그대로 유지 (이미 위에서 할당됨)
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  }
}

// ----------------------------------------------------
// Pipeline Count Helper & Badges
// ----------------------------------------------------
const quotePendingCount = computed(() => {
  return submittedOrders.value.filter(o => normalizeOrderStatus(o.status) === 'quote_pending').length
})

const purchasingCount = computed(() => {
  return submittedOrders.value.filter(o => normalizeOrderStatus(o.status) === 'purchasing').length
})

const paymentPendingCount = computed(() => {
  return submittedOrders.value.filter(o => normalizeOrderStatus(o.status) === 'quote_confirmed').length
})

const getPipelineCount = (statusKey) => {
  if (statusKey === 'quote_pending') {
    const cartCount = savedItems.value.length
    const orderCount = submittedOrders.value.filter(o => normalizeOrderStatus(o.status) === 'quote_pending').length
    return cartCount + orderCount
  }
  return submittedOrders.value.filter(o => normalizeOrderStatus(o.status) === statusKey).length
}

// ----------------------------------------------------
// Calculations
// ----------------------------------------------------
const getItemQuantity = (item) => {
  if (Array.isArray(item.skus) && item.skus.length > 0) {
    return item.skus.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
  }
  return Number(item.quantity || item.orderQty || item.minOrder || 1)
}

const getItemTotalRmb = (item) => {
  const qty = getItemQuantity(item)
  const unitPrice = Number(item.price) || 0
  return Number((qty * unitPrice).toFixed(2))
}

const getItemTotalKrw = (item) => {
  return Math.round(getItemTotalRmb(item) * customExchangeRate.value)
}

const totalOrderStepCount = computed(() => {
  return savedItems.value.length + submittedOrders.value.length
})

const formatKrw = (val) => {
  return Math.round(val || 0).toLocaleString('ko-KR')
}

// ----------------------------------------------------
// Filtered Table Items List
// ----------------------------------------------------
const displayItemsList = computed(() => {
  const list = []

  // 1. 보관함 항목 매핑
  savedItems.value.forEach(it => {
    list.push({
      ...it,
      type: 'cart',
      status: 'quote_pending'
    })
  })

  // 2. 접수된 주문서 항목 매핑
  submittedOrders.value.forEach(ord => {
    if (Array.isArray(ord.items)) {
      ord.items.forEach(it => {
        list.push({
          ...it,
          orderId: ord.orderId,
          type: 'submitted',
          status: normalizeOrderStatus(ord.status) || 'purchasing'
        })
      })
    }
  })

  // 필터링 적용
  return list.filter(row => {
    // 상태 필터
    if (selectedStatusFilter.value === 'cart' && row.type !== 'cart') return false
    if (selectedStatusFilter.value === 'submitted' && row.type !== 'submitted') return false
    if (selectedStatusFilter.value !== 'all' && selectedStatusFilter.value !== 'cart' && selectedStatusFilter.value !== 'submitted') {
      if (normalizeOrderStatus(row.status) !== selectedStatusFilter.value) return false
    }

    // 텍스트 검색 필터
    if (tableSearchQuery.value.trim()) {
      const q = tableSearchQuery.value.trim().toLowerCase()
      const title = (row.titleKo || row.titleZh || '').toLowerCase()
      const id = String(row.itemId || row.id || '').toLowerCase()
      const ordId = String(row.orderId || '').toLowerCase()
      return title.includes(q) || id.includes(q) || ordId.includes(q)
    }

    return true
  })
})

// ----------------------------------------------------
// Actions: 발주 설정 모달 및 보관함 관리
// ----------------------------------------------------
const isOrderModalOpen = ref(false)

const openOrderModal = () => {
  if (savedItems.value.length === 0) {
    alert('보관함에 담긴 상품이 없습니다. 1688 상품을 먼저 소싱해 주세요.')
    router.push('/mall')
    return
  }
  isOrderModalOpen.value = true
}

const handleDashboardOrderSubmitted = () => {
  loadDashboardData()
}

const removeCartItemById = (id) => {
  if (confirm('해당 품목을 보관함에서 삭제하시겠습니까?')) {
    savedItems.value = savedItems.value.filter(it => it.id !== id)
    localStorage.setItem('euchs_erp_saved_items', JSON.stringify(savedItems.value))
    window.dispatchEvent(new Event('storage'))
  }
}

const handleImageError = (e) => {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80'
}

// ----------------------------------------------------
// Excel Download
// ----------------------------------------------------
const downloadEstimateExcel = () => {
  const targetItems = displayItemsList.value
  if (targetItems.length === 0) {
    alert('견적서로 출력할 상품 또는 발주 대기 항목이 없습니다.')
    return
  }

  try {
    const fileName = exportQuoteExcel(
      targetItems,
      {
        companyName: buyerForm.value.companyName,
        buyerName: buyerForm.value.managerName,
        phone: buyerForm.value.contactPhone,
        email: buyerForm.value.email,
        customsCode: buyerForm.value.customsCode,
        memo: `한·중 FTA C/O: ${orderOptions.value.requestCo ? '신청' : '미신청'} | 정밀검수: 신청`
      },
      customExchangeRate.value,
      agencyFeeRate.value / 100
    )
    alert(`공식 견적서 파일(${fileName})이 정상적으로 다운로드되었습니다.`)
  } catch (err) {
    console.error('견적서 엑셀 다운로드 오류:', err)
    alert(`견적서 엑셀 다운로드 중 오류가 발생했습니다: ${err.message}`)
  }
}

const downloadRowEstimate = (row) => {
  try {
    exportQuoteExcel(
      [row],
      {
        companyName: buyerForm.value.companyName,
        buyerName: buyerForm.value.managerName
      },
      customExchangeRate.value,
      agencyFeeRate.value / 100
    )
  } catch (err) {
    console.error('단건 견적 엑셀 다운로드 오류:', err)
  }
}

// ----------------------------------------------------
// Lifecycle
// ----------------------------------------------------
onMounted(async () => {
  syncBuyerForm()
  loadBalance()
  await loadDashboardData()

  try {
    const settings = await fetchSiteSettings()
    if (settings) {
      agencyFeeRate.value = Number(settings.agency_fee_rate) || 8.0
      customExchangeRate.value = Number(settings.exchange_rate) || 226.19
    }
  } catch (e) {
    console.warn('Dashboard settings load error:', e)
  }

  window.addEventListener('storage', loadDashboardData)
  window.addEventListener('euchs-order-status-update', loadDashboardData)
  window.addEventListener('euchs-warehouse-update', loadDashboardData)
})
</script>
