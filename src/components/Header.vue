<template>
  <header class="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-xs transition-all duration-200">
    <!-- Top Utility Bar for Desktop (Slim & Centered max-w-7xl) -->
    <div class="hidden lg:block bg-slate-950 border-b border-slate-800/80 text-slate-300 text-xs">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-1.5 text-xs">
        <!-- 좌측: 실시간 고시 환율 및 간이관세 계산기 바로가기 -->
        <div class="flex items-center gap-3">
          <span class="text-amber-300 font-semibold flex items-center gap-1.5 text-[11px]">
            <i class="fas fa-bolt text-amber-400 text-[10px]"></i>
            <span>실시간 고시 환율:</span>
            <span class="font-mono text-white font-bold">1위안 (CNY) = {{ customExchangeRate }}원 (KRW)</span>
            <span class="text-slate-400 font-normal text-[10px] ml-0.5">(국제 {{ liveMarketRate > 0 ? liveMarketRate.toFixed(2) : '206.19' }}원)</span>
          </span>
          <router-link to="/tools/calculator" class="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]">
            <i class="fas fa-calculator text-amber-400 text-[10px]"></i>
            <span>간이관세 계산기</span>
          </router-link>
        </div>

        <!-- 우측: 유튜브 & 사용자 계정/로그아웃 -->
        <div class="flex items-center gap-3.5 text-[11px]">
          <a href="https://www.youtube.com/@euccompany" target="_blank" class="flex items-center gap-1 text-slate-300 hover:text-red-400 transition">
            <i class="fab fa-youtube text-red-500 text-xs"></i>
            <span>이유씨유튜브</span>
          </a>
          <span class="text-slate-700">|</span>

          <!-- Desktop Login / User Profile Area -->
          <div v-if="!isLoggedIn" class="flex items-center gap-2.5">
            <button 
              type="button"
              @click="openLoginModal('login')" 
              class="hover:text-white transition flex items-center gap-1 text-slate-300 font-medium active:scale-95"
            >
              <i class="fa fa-power-off text-slate-400 text-[10px]"></i>
              <span>로그인</span>
            </button>
            <span class="text-slate-700">·</span>
            <button 
              type="button"
              @click="openLoginModal('signup')" 
              class="hover:text-white transition flex items-center gap-1 text-slate-300 font-medium active:scale-95"
            >
              <i class="fa fa-user text-slate-400 text-[10px]"></i>
              <span>회원가입</span>
            </button>
          </div>

          <div v-else class="flex items-center gap-2">
            <div class="relative" ref="userDropdownRef">
              <button 
                type="button"
                @click="isUserMenuOpen = !isUserMenuOpen" 
                class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition cursor-pointer"
              >
                <img 
                  v-if="userAvatarUrl" 
                  :src="userAvatarUrl" 
                  :alt="userDisplayName" 
                  class="w-4 h-4 rounded-full object-cover border border-blue-400"
                />
                <div 
                  v-else 
                  class="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center"
                >
                  {{ (userDisplayName || 'U').charAt(0) }}
                </div>
                <span class="font-bold text-white max-w-[110px] truncate text-[11px]">{{ userDisplayName }}님</span>
                <i class="fas fa-chevron-down text-[8px] text-slate-400 transition" :class="{ 'rotate-180': isUserMenuOpen }"></i>
              </button>

              <!-- User Dropdown Menu -->
              <div 
                v-if="isUserMenuOpen" 
                class="absolute right-0 mt-1 w-48 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 text-xs"
              >
                <div class="px-3.5 py-2 border-b border-gray-100 bg-slate-50/50">
                  <p class="font-black text-gray-900 truncate">{{ userDisplayName }}</p>
                  <p class="text-[10px] text-gray-500 truncate mt-0.5 font-mono">{{ userEmail }}</p>
                </div>

                <div class="py-1">
                  <!-- 1. B2B 통합 대시보드 -->
                  <router-link 
                    to="/dashboard" 
                    @click="isUserMenuOpen = false" 
                    class="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold flex items-center gap-2 transition"
                  >
                    <i class="fas fa-chart-pie text-blue-500 text-xs"></i>
                    <span>B2B 통합 대시보드</span>
                  </router-link>

                  <!-- 2. 발주 & 결제 관리 -->
                  <router-link 
                    to="/dashboard/orders" 
                    @click="isUserMenuOpen = false" 
                    class="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold flex items-center gap-2 transition"
                  >
                    <i class="fas fa-shopping-cart text-amber-500 text-xs"></i>
                    <span>발주 & 결제 관리</span>
                  </router-link>

                  <!-- 3. 창고 & 배송 현황 -->
                  <router-link 
                    to="/dashboard/warehouse" 
                    @click="isUserMenuOpen = false" 
                    class="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold flex items-center gap-2 transition"
                  >
                    <i class="fas fa-boxes-stacked text-teal-500 text-xs"></i>
                    <span>창고 & 배송 현황</span>
                  </router-link>

                  <!-- 4. 계정센터 & 지갑 관리 -->
                  <router-link 
                    to="/dashboard/account" 
                    @click="isUserMenuOpen = false" 
                    class="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold flex items-center gap-2 transition"
                  >
                    <i class="fas fa-wallet text-indigo-500 text-xs"></i>
                    <span>계정센터 & 지갑 관리</span>
                  </router-link>
                </div>

                <div class="border-t border-gray-100 pt-1">
                  <!-- 5. 로그아웃 -->
                  <button 
                    type="button"
                    @click="handleSignOut" 
                    class="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <i class="fas fa-sign-out-alt text-xs"></i>
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Direct Logout Button -->
            <button
              type="button"
              @click="handleSignOut"
              class="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
              title="로그아웃"
            >
              <i class="fas fa-sign-out-alt text-[10px]"></i>
              <span>(로그아웃)</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Main Navigation Bar (Slim) -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-14 sm:h-15">
        <!-- Logo -->
        <router-link to="/" class="flex-shrink-0 flex items-center">
          <img 
            src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/logo.png" 
            alt="이유씨컴퍼니 로고" 
            class="h-8 sm:h-9 w-auto object-contain hover:opacity-95 transition"
          />
        </router-link>

        <!-- Desktop Navigation Menu -->
        <nav class="hidden lg:flex items-center space-x-1 xl:space-x-2.5 text-xs sm:text-[13px]">
          <!-- Dropdown 1: 회사소개 -->
          <div class="relative group">
            <router-link 
              to="/company" 
              class="px-2.5 py-1.5 font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition rounded-lg hover:bg-gray-50"
            >
              회사소개
              <i class="fas fa-chevron-down text-[9px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute left-0 mt-0 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/company#ceo" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">인사말</router-link>
              <router-link to="/company#history" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">연혁 및 비전</router-link>
              <router-link to="/company#overview" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">회사개요</router-link>
              <router-link to="/company#business" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">사업영역</router-link>
            </div>
          </div>

          <!-- Menu 2: 이우시장투어 (독립 메인 메뉴) -->
          <router-link 
            to="/guide/market-tour" 
            class="px-2.5 py-1.5 font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition rounded-lg hover:bg-gray-50"
          >
            <span>이우시장투어</span>
          </router-link>


          <!-- Dropdown 3: 상품조사 -->
          <div class="relative group">
            <router-link 
              to="/quote" 
              class="px-2.5 py-1.5 font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition rounded-lg hover:bg-gray-50"
            >
              상품조사
              <i class="fas fa-chevron-down text-[9px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute left-0 mt-0 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/quote" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">이우 시장소개 (푸텐시장)</router-link>
              <router-link to="/quote#guangzhou" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">광저우 시장소개 (의류/패션)</router-link>
              <router-link to="/quote#shenzhen" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">심천 시장소개 (화창베이 전자)</router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <a href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">1:1 맞춤 상품조사 의뢰</a>
            </div>
          </div>

          <!-- 메뉴 4: 무역대행 신청 (파란색 알약 CTA 버튼) -->
          <div class="relative group">
            <router-link 
              to="/apply" 
              class="px-3 py-1.5 rounded-full font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow active:scale-95 transition-all duration-200 flex items-center gap-1"
            >
              <span>무역대행 신청</span>
              <i class="fas fa-chevron-right text-[9px] opacity-90"></i>
            </router-link>
            <div class="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/apply" class="block px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50">✍️ 무역대행 맞춤 서비스</router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <a href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">💬 1:1 실시간 무역 상담</a>
            </div>
          </div>

          <!-- 메뉴 5: 1688 소싱몰 (주황색 알약 CTA 버튼) -->

          <div class="relative group">
            <router-link 
              to="/mall" 
              class="px-3 py-1.5 rounded-full font-bold text-xs text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm hover:shadow active:scale-95 transition-all duration-200 flex items-center gap-1.5"
            >
              <i class="fas fa-store text-[11px] text-white"></i>
              <span>1688 소싱몰</span>
              <i class="fas fa-chevron-right text-[9px] opacity-90"></i>
            </router-link>
            <div class="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/mall" class="block px-3.5 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50">🛍️ 1688 실시간 상품 소싱몰</router-link>
              <router-link to="/services/purchasing-agent" class="block px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">📝 1688 구매대행 이용안내</router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <router-link to="/services/rocket-growth" class="block px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">🚀 쿠팡 로켓그로스 대행</router-link>
              <router-link to="/services/3pl-fulfillment" class="block px-3.5 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-50">📦 3PL 풀필먼트 배송</router-link>
            </div>
          </div>

          <!-- 메뉴 6: EUC 안내 (드롭다운) -->
          <div class="relative group">
            <router-link 
              to="/guide" 
              class="px-2.5 py-1.5 font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition rounded-lg hover:bg-gray-50"
            >
              EUC 안내
              <i class="fas fa-chevron-down text-[9px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute left-0 mt-0 w-52 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/support/guide" class="block px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50">
                📖 사이트 이용가이드
              </router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <router-link to="/guide#express" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">✈️ 항공특송 운임표</router-link>
              <router-link to="/guide#ocean" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">🚢 해운특송 운임표</router-link>
              <router-link to="/guide#fee" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">포워딩 &amp; 수수료</router-link>
              <router-link to="/guide#return" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">반품/교환안내</router-link>
            </div>
          </div>

          <!-- 메뉴 7: 고객센터 (드롭다운) -->
          <div class="relative group">
            <router-link 
              to="/community/notice" 
              class="px-2.5 py-1.5 font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition rounded-lg hover:bg-gray-50"
            >
              고객센터
              <i class="fas fa-chevron-down text-[9px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute right-0 mt-0 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/community/notice" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">공지사항</router-link>
              <a href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block px-3.5 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600">1:1 카카오톡 상담</a>
            </div>
          </div>
        </nav>


        <!-- Right Quick Action / Mobile Hamburger -->
        <div class="flex items-center gap-2 sm:gap-2.5">
          <!-- Mobile Saved Items Cart Widget -->
          <router-link 
            to="/dashboard"
            class="lg:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition text-xs shrink-0 whitespace-nowrap"
            title="발주대기 보관함"
          >
            <div class="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
              <i class="fas fa-shopping-bag text-xs"></i>
            </div>
            <div class="flex flex-col text-left leading-none">
              <span class="text-[9px] text-gray-500 font-medium">발주대기</span>
              <span class="text-[11px] font-black text-rose-600 font-mono mt-0.5">
                {{ savedCount }}건 보관중
              </span>
            </div>
          </router-link>

          <!-- Mobile Hamburger Toggle -->
          <button 
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-blue-600 focus:outline-none transition"
            aria-label="메뉴 열기"
          >
            <i :class="isMobileMenuOpen ? 'fas fa-times text-xl' : 'fas fa-bars text-xl'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Drawer Menu -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div v-if="isMobileMenuOpen" class="lg:hidden bg-white border-b border-gray-200 shadow-2xl px-4 pt-3 pb-6 space-y-2 max-h-[80vh] overflow-y-auto">
        <!-- Mobile Utility Bar -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 text-sm">
          <!-- Mobile Login State -->
          <div v-if="!isLoggedIn" class="flex items-center gap-2">
            <button 
              type="button"
              @click="handleOpenLoginModal('login')" 
              class="text-gray-700 hover:text-blue-600 flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 border border-gray-200 transition"
            >
              <i class="fa fa-power-off text-slate-500"></i>
              <span>로그인</span>
            </button>
            <button 
              type="button"
              @click="handleOpenLoginModal('signup')" 
              class="text-gray-700 hover:text-blue-600 flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 border border-gray-200 transition"
            >
              <i class="fa fa-user text-slate-500"></i>
              <span>회원가입</span>
            </button>
          </div>

          <div v-else class="flex items-center gap-1.5 flex-wrap">
            <img 
              v-if="userAvatarUrl" 
              :src="userAvatarUrl" 
              :alt="userDisplayName" 
              class="w-6 h-6 rounded-full object-cover border border-blue-400"
            />
            <div 
              v-else 
              class="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center"
            >
              {{ userDisplayName.charAt(0) }}
            </div>
            <span class="text-xs font-bold text-gray-800">{{ userDisplayName }}님</span>
            <router-link 
              to="/dashboard" 
              @click="isMobileMenuOpen = false" 
              class="text-xs text-blue-600 font-bold ml-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 transition flex items-center gap-1"
            >
              <i class="fas fa-chart-pie text-xs"></i>
              <span>대시보드</span>
            </router-link>
            <button 
              @click="handleSignOut" 
              class="text-xs text-rose-500 hover:text-rose-700 font-semibold px-2 py-0.5 rounded bg-rose-50 border border-rose-200 transition cursor-pointer"
            >
              로그아웃
            </button>
          </div>

          <a href="https://www.youtube.com/@euccompany" target="_blank" class="text-xs text-red-600 font-medium flex items-center gap-1">
            <i class="fab fa-youtube"></i> 유튜브채널
          </a>
        </div>

        <!-- Mobile Accordion Menu Items -->
        <div class="space-y-1 pt-2">
          <!-- Item 1: 회사소개 -->
          <div>
            <button 
              @click="toggleMobileSubmenu('company')" 
              class="w-full flex justify-between items-center py-2.5 text-base font-semibold text-gray-800 hover:text-blue-600"
            >
              <span>회사소개</span>
              <i :class="mobileSubmenu === 'company' ? 'fas fa-chevron-up text-xs text-blue-600' : 'fas fa-chevron-down text-xs text-gray-400'"></i>
            </button>
            <div v-show="mobileSubmenu === 'company'" class="pl-4 pb-2 space-y-1.5 text-sm text-gray-600">
              <router-link @click="isMobileMenuOpen = false" to="/company#ceo" class="block py-1 hover:text-blue-600">인사말</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/company#history" class="block py-1 hover:text-blue-600">연혁 및 비전</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/company#overview" class="block py-1 hover:text-blue-600">회사개요</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/company#business" class="block py-1 hover:text-blue-600">사업영역</router-link>
            </div>
          </div>


          <!-- Item 2: 이우시장투어 (독립 메인 메뉴) -->
          <div>
            <router-link 
              @click="isMobileMenuOpen = false" 
              to="/guide/market-tour" 
              class="w-full flex items-center py-2.5 text-base font-semibold text-gray-800 hover:text-blue-600"
            >
              <span>이우시장투어</span>
            </router-link>
          </div>

          <!-- Item 3: 상품조사 -->
          <div>
            <button 
              @click="toggleMobileSubmenu('products')" 
              class="w-full flex justify-between items-center py-2.5 text-base font-semibold text-gray-800 hover:text-blue-600"
            >
              <span>상품조사</span>
              <i :class="mobileSubmenu === 'products' ? 'fas fa-chevron-up text-xs text-blue-600' : 'fas fa-chevron-down text-xs text-gray-400'"></i>
            </button>
            <div v-show="mobileSubmenu === 'products'" class="pl-4 pb-2 space-y-1.5 text-sm text-gray-600">
              <router-link @click="isMobileMenuOpen = false" to="/market#yiwu" class="block py-1 hover:text-blue-600">이우 시장소개 (푸텐시장)</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/market#guangzhou" class="block py-1 hover:text-blue-600">광저우 시장소개 (의류/패션)</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/market#shenzhen" class="block py-1 hover:text-blue-600">심천 시장소개 (화창베이 전자)</router-link>
              <a @click="isMobileMenuOpen = false" href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block py-1 hover:text-blue-600">1:1 맞춤 상품조사 의뢰</a>
            </div>
          </div>

          <!-- Item 4: 무역대행 신청 & 1688 소싱몰 (Dual Mobile CTA Buttons) -->
          <div class="py-2 grid grid-cols-2 gap-2 border-y border-gray-100 my-1">
            <router-link 
              @click="isMobileMenuOpen = false" 
              to="/services/trade-agent" 
              class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 transition"
            >
              <span>무역대행 안내</span>
              <i class="fas fa-chevron-right text-[9px]"></i>
            </router-link>
            <router-link 
              @click="isMobileMenuOpen = false" 
              to="/mall" 
              class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-rose-500/20 active:scale-95 transition"
            >
              <i class="fas fa-store text-[10px]"></i>
              <span>1688 소싱몰</span>
              <i class="fas fa-chevron-right text-[9px]"></i>
            </router-link>
          </div>

          <!-- Item 5: 주요 서비스 세부 안내 (아코디언) -->
          <div>
            <button 
              @click="toggleMobileSubmenu('agency')" 
              class="w-full flex justify-between items-center py-2.5 text-base font-semibold text-gray-800 hover:text-blue-600"
            >
              <span>서비스 안내 & 1:1 상담</span>
              <i :class="mobileSubmenu === 'agency' ? 'fas fa-chevron-up text-xs text-blue-600' : 'fas fa-chevron-down text-xs text-gray-400'"></i>
            </button>
            <div v-show="mobileSubmenu === 'agency'" class="pl-4 pb-2 space-y-1.5 text-sm text-gray-600">
              <router-link @click="isMobileMenuOpen = false" to="/services/trade-agent" class="block py-1 font-bold text-blue-600">✍️ 무역대행 맞춤 서비스 안내</router-link>
              <a @click="isMobileMenuOpen = false" href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block py-1 hover:text-blue-600">💬 1:1 실시간 무역 상담</a>
              <div class="border-t border-gray-100 my-1"></div>
              <router-link @click="isMobileMenuOpen = false" to="/services/purchasing-agent" class="block py-1 font-bold text-amber-600">📝 1688 구매대행 이용안내</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/services/rocket-growth" class="block py-1 text-red-600 font-semibold">🚀 쿠팡 로켓그로스 대행</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/services/3pl-fulfillment" class="block py-1 text-purple-600 font-semibold">📦 3PL 풀필먼트 배송</router-link>
            </div>
          </div>

          <!-- Item 5: EUC 안내 & 요금표 -->
          <div>
            <button 
              @click="toggleMobileSubmenu('guide')" 
              class="w-full flex justify-between items-center py-2.5 text-base font-semibold text-gray-800 hover:text-blue-600"
            >
              <span>EUC 안내 (요금표)</span>
              <i :class="mobileSubmenu === 'guide' ? 'fas fa-chevron-up text-xs text-blue-600' : 'fas fa-chevron-down text-xs text-gray-400'"></i>
            </button>
            <div v-show="mobileSubmenu === 'guide'" class="pl-4 pb-2 space-y-1.5 text-sm text-gray-600">
              <router-link @click="isMobileMenuOpen = false" to="/tools/calculator" class="block py-1 font-bold text-blue-600">🧮 무역/물류비·관부가세 계산기</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/guide#express" class="block py-1 hover:text-blue-600">택배 배송 요금표 안내</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/guide#sea" class="block py-1 hover:text-blue-600">전자상 해운물류 안내</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/guide#forwarding" class="block py-1 hover:text-blue-600">포워딩 & 수수료 안내</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/guide#refund" class="block py-1 hover:text-blue-600">반품 및 교환 안내</router-link>
            </div>
          </div>

          <!-- Item 6: 고객센터 -->
          <div>
            <button 
              @click="toggleMobileSubmenu('cs')" 
              class="w-full flex justify-between items-center py-2.5 text-base font-semibold text-gray-800 hover:text-blue-600"
            >
              <span>고객센터 & 커뮤니티</span>
              <i :class="mobileSubmenu === 'cs' ? 'fas fa-chevron-up text-xs text-blue-600' : 'fas fa-chevron-down text-xs text-gray-400'"></i>
            </button>
            <div v-show="mobileSubmenu === 'cs'" class="pl-4 pb-2 space-y-1.5 text-sm text-gray-600">
              <router-link @click="isMobileMenuOpen = false" to="/community/notice" class="block py-1 hover:text-blue-600">공지사항 & 소식</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/community/faq" class="block py-1 hover:text-blue-600">자주하는 질문 (FAQ)</router-link>
              <a @click="isMobileMenuOpen = false" href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block py-1 hover:text-blue-600">1:1 실시간 상담</a>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { fetchSiteSettings } from '../lib/settings'
import {
  currentUser,
  isLoggedIn,
  userDisplayName,
  userAvatarUrl,
  userEmail,
  openLoginModal,
  signOut,
  initAuth
} from '../lib/auth'

const isMobileMenuOpen = ref(false)
const mobileSubmenu = ref(null)
const isUserMenuOpen = ref(false)
const userDropdownRef = ref(null)
const savedCount = ref(0)

// Exchange rate state
const customExchangeRate = ref(226.19)
const liveMarketRate = ref(206.19)

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
      if (settings.exchange_rate_mode === 'auto_margin') {
        const margin = Number(settings.rate_margin) || 1.5
        customExchangeRate.value = Number((liveMarketRate.value + margin).toFixed(2))
      } else {
        customExchangeRate.value = Number(settings.exchange_rate) || 226.19
      }
    }
  } catch (err) {
    console.warn('[Header] Rates fetch error:', err)
  }
}

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

const toggleMobileSubmenu = (menu) => {
  if (mobileSubmenu.value === menu) {
    mobileSubmenu.value = null
  } else {
    mobileSubmenu.value = menu
  }
}

const handleOpenLoginModal = (mode = 'login') => {
  isMobileMenuOpen.value = false
  openLoginModal(mode)
}

const handleSignOut = async () => {
  isUserMenuOpen.value = false
  await signOut()
  alert('정상적으로 로그아웃되었습니다.')
}

// 외부 클릭 감지하여 유저 드롭다운 닫기
const handleDocumentClick = (e) => {
  if (userDropdownRef.value && !userDropdownRef.value.contains(e.target)) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  initAuth()
  updateSavedCount()
  loadRates()
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('storage', updateSavedCount)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('storage', updateSavedCount)
})
</script>
