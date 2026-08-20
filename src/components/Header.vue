<template>
  <header class="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm transition-all duration-200">
    <!-- Top Utility Bar for Desktop -->
    <div class="hidden lg:block bg-slate-900 text-slate-300 text-xs py-2">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div class="flex items-center gap-6">
          <span class="flex items-center gap-1.5 text-slate-300">
            <i class="fas fa-phone text-blue-400"></i>
            <span>상담문의: <strong>010-9373-1214</strong> / <strong>010-6703-6750</strong></span>
          </span>
          <span class="flex items-center gap-1.5 text-slate-300">
            <i class="fab fa-weixin text-green-400"></i>
            <span>위챗: <strong>china775852</strong></span>
          </span>
          <span class="flex items-center gap-1.5 text-slate-300">
            <i class="fas fa-comment text-yellow-400"></i>
            <span>카톡: <strong>ericcho0710</strong></span>
          </span>
        </div>
        <div class="flex items-center gap-4">
          <a href="https://www.youtube.com/@euccompany" target="_blank" class="flex items-center gap-1 text-red-400 hover:text-red-300 transition">
            <i class="fab fa-youtube text-sm"></i>
            <span>이유씨유튜브</span>
          </a>
          <span class="text-slate-600">|</span>

          <!-- Desktop Login / User Profile Area -->
          <div v-if="!isLoggedIn" class="flex items-center gap-3">
            <button 
              type="button"
              @click="openLoginModal('login')" 
              class="hover:text-white transition flex items-center gap-1.5 text-slate-300 font-medium text-xs active:scale-95"
            >
              <i class="fa fa-power-off text-slate-400"></i>
              <span>로그인</span>
            </button>
            <span class="text-slate-700">·</span>
            <button 
              type="button"
              @click="openLoginModal('signup')" 
              class="hover:text-white transition flex items-center gap-1.5 text-slate-300 font-medium text-xs active:scale-95"
            >
              <i class="fa fa-user text-slate-400"></i>
              <span>회원가입</span>
            </button>
          </div>

          <div v-else class="relative" ref="userDropdownRef">
            <button 
              type="button"
              @click="isUserMenuOpen = !isUserMenuOpen" 
              class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            >
              <img 
                v-if="userAvatarUrl" 
                :src="userAvatarUrl" 
                :alt="userDisplayName" 
                class="w-5 h-5 rounded-full object-cover border border-blue-400"
              />
              <div 
                v-else 
                class="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center"
              >
                {{ userDisplayName.charAt(0) }}
              </div>
              <span class="font-bold text-white max-w-[120px] truncate text-xs">{{ userDisplayName }}님</span>
              <i class="fas fa-chevron-down text-[9px] text-slate-400 transition" :class="{ 'rotate-180': isUserMenuOpen }"></i>
            </button>

            <!-- User Dropdown Menu -->
            <div 
              v-if="isUserMenuOpen" 
              class="absolute right-0 mt-1.5 w-48 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 text-xs"
            >
              <div class="px-3 py-2 border-b border-gray-100">
                <p class="font-bold text-gray-900 truncate">{{ userDisplayName }}</p>
                <p class="text-[11px] text-gray-500 truncate mt-0.5">{{ userEmail }}</p>
              </div>
              <button 
                type="button"
                @click="handleSignOut" 
                class="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2 transition"
              >
                <i class="fas fa-sign-out-alt"></i>
                <span>로그아웃</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Main Navigation Bar -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-20">
        <!-- Logo -->
        <router-link to="/" class="flex-shrink-0 flex items-center">
          <img 
            src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/logo.png" 
            alt="이유씨컴퍼니 로고" 
            class="h-10 sm:h-12 w-auto object-contain hover:opacity-95 transition"
          />
        </router-link>

        <!-- Desktop Navigation Menu -->
        <nav class="hidden lg:flex items-center space-x-1 xl:space-x-4">
          <!-- Dropdown 1: 회사소개 -->
          <div class="relative group">
            <router-link 
              to="/company" 
              class="px-3 py-2 text-[15px] font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition"
            >
              회사소개
              <i class="fas fa-chevron-down text-[10px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute left-0 mt-0 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/company#ceo" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">인사말</router-link>
              <router-link to="/company#history" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">연혁 및 비전</router-link>
              <router-link to="/company#overview" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">회사개요</router-link>
              <router-link to="/company#business" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">사업영역</router-link>
              <router-link to="/company#photo" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">EUC 포토</router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <router-link to="/company#partner" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">협력사 소개</router-link>
            </div>
          </div>

          <!-- Menu 2: 이우시장투어 (독립 메인 메뉴) -->
          <router-link 
            to="/guide/market-tour" 
            class="px-3 py-2 text-[15px] font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition"
          >
            <span>이우시장투어</span>
          </router-link>

          <!-- Dropdown 3: 상품조사 -->
          <div class="relative group">
            <router-link 
              to="/market" 
              class="px-3 py-2 text-[15px] font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition"
            >
              상품조사
              <i class="fas fa-chevron-down text-[10px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute left-0 mt-0 w-60 bg-white rounded-lg shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/market#yiwu" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">이우 시장소개 (푸텐시장)</router-link>
              <router-link to="/market#guangzhou" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">광저우 시장소개 (의류/패션)</router-link>
              <router-link to="/market#shenzhen" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">심천 시장소개 (화창베이 전자)</router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <a href="/#products" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">추천상품 1688 갤러리</a>
              <a href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">1:1 맞춤 상품조사 의뢰</a>
            </div>
          </div>

          <!-- Dropdown 4: 무역대행 신청 (CTA Button) -->
          <div class="relative group">
            <router-link 
              to="/services/trade-agent" 
              class="px-3.5 py-1.5 rounded-xl font-bold text-[14px] text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
            >
              <span>무역대행 신청</span>
              <i class="fas fa-chevron-right text-[10px] opacity-90 group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>
            <div class="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/services/trade-agent#apply-form" class="block px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50">✍️ 무역대행 맞춤 견적 신청</router-link>
              <router-link to="/services/trade-agent" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">무역대행(OEM/ODM) 안내</router-link>
              <a href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">1:1 실시간 무역 상담</a>
            </div>
          </div>

          <!-- Dropdown 5: 구매대행 신청 (CTA Button) -->
          <div class="relative group">
            <router-link 
              to="/services/purchasing-agent" 
              class="px-3.5 py-1.5 rounded-xl font-bold text-[14px] text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
            >
              <span>구매대행 신청</span>
              <i class="fas fa-chevron-right text-[10px] opacity-90 group-hover:translate-x-0.5 transition-transform"></i>
            </router-link>
            <div class="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/services/purchasing-agent#apply-form" class="block px-4 py-2 text-sm font-bold text-amber-600 hover:bg-amber-50">📝 구매대행 주문서 신청</router-link>
              <router-link to="/services/purchasing-agent" class="block px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600">중국 구매대행 안내</router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <router-link to="/services/rocket-growth" class="block px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">🚀 쿠팡 로켓그로스 대행</router-link>
              <router-link to="/services/3pl-fulfillment" class="block px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50">📦 3PL 풀필먼트 배송</router-link>
            </div>
          </div>

          <!-- Dropdown 6: EUC 안내 -->
          <div class="relative group">
            <router-link 
              to="/guide" 
              class="px-3 py-2 text-[15px] font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition"
            >
              EUC 안내
              <i class="fas fa-chevron-down text-[10px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute left-0 mt-0 w-60 bg-white rounded-lg shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/tools/calculator" class="block px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50">
                🧮 무역/물류비·관부가세 계산기
              </router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <router-link to="/guide#express" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">택배 배송 요금표 안내</router-link>
              <router-link to="/guide#sea" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">전자상 해운물류 안내</router-link>
              <router-link to="/guide#forwarding" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">포워딩 & 수수료 안내</router-link>
              <router-link to="/guide#refund" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">반품 및 교환 안내</router-link>
            </div>
          </div>

          <!-- Dropdown 7: 고객센터 -->
          <div class="relative group">
            <router-link 
              to="/community/notice" 
              class="px-3 py-2 text-[15px] font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 transition"
            >
              고객센터
              <i class="fas fa-chevron-down text-[10px] text-gray-400 group-hover:text-blue-600 transition"></i>
            </router-link>
            <div class="absolute right-0 mt-0 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <router-link to="/community/notice" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">공지사항</router-link>
              <router-link to="/community/faq" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">자주하는 질문 (FAQ)</router-link>
              <a href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">1:1 실시간 문의</a>
            </div>
          </div>
        </nav>

        <!-- Right Quick Action / Mobile Hamburger -->
        <div class="flex items-center gap-3">
          <a 
            href="tel:010-9373-1214" 
            class="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition"
          >
            <i class="fas fa-phone-alt"></i>
            <span>전화상담</span>
          </a>

          <!-- Mobile Call button -->
          <a 
            href="tel:010-9373-1214" 
            class="lg:hidden p-2 text-blue-600 hover:text-blue-700 transition"
            aria-label="전화걸기"
          >
            <i class="fas fa-phone text-xl"></i>
          </a>

          <!-- Mobile Hamburger Toggle -->
          <button 
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="lg:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 focus:outline-none"
            aria-label="메뉴 열기"
          >
            <i :class="isMobileMenuOpen ? 'fas fa-times text-2xl' : 'fas fa-bars text-2xl'"></i>
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

          <div v-else class="flex items-center gap-2">
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
            <button 
              @click="handleSignOut" 
              class="text-xs text-red-500 hover:text-red-700 font-semibold ml-1.5 px-2 py-0.5 rounded bg-red-50 border border-red-200 transition"
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
              <router-link @click="isMobileMenuOpen = false" to="/company#partner" class="block py-1 hover:text-blue-600">협력사 소개</router-link>
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
              <a @click="isMobileMenuOpen = false" href="/#products" class="block py-1 hover:text-blue-600">추천상품 리스트</a>
              <a @click="isMobileMenuOpen = false" href="http://pf.kakao.com/_xmQWsK/chat" target="_blank" class="block py-1 hover:text-blue-600">상품조사 의뢰</a>
            </div>
          </div>

          <!-- Item 4: 무역대행 신청 & 구매대행 신청 (Dual Mobile CTA Buttons) -->
          <div class="py-2 grid grid-cols-2 gap-2 border-y border-gray-100 my-1">
            <router-link 
              @click="isMobileMenuOpen = false" 
              to="/services/trade-agent#apply-form" 
              class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 transition"
            >
              <span>무역대행 신청</span>
              <i class="fas fa-chevron-right text-[9px]"></i>
            </router-link>
            <router-link 
              @click="isMobileMenuOpen = false" 
              to="/services/purchasing-agent#apply-form" 
              class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-orange-500/20 active:scale-95 transition"
            >
              <span>구매대행 신청</span>
              <i class="fas fa-chevron-right text-[9px]"></i>
            </router-link>
          </div>

          <!-- Item 5: 주요 서비스 세부 안내 (아코디언) -->
          <div>
            <button 
              @click="toggleMobileSubmenu('agency')" 
              class="w-full flex justify-between items-center py-2.5 text-base font-semibold text-gray-800 hover:text-blue-600"
            >
              <span>서비스 세부 안내 (무역/구매)</span>
              <i :class="mobileSubmenu === 'agency' ? 'fas fa-chevron-up text-xs text-blue-600' : 'fas fa-chevron-down text-xs text-gray-400'"></i>
            </button>
            <div v-show="mobileSubmenu === 'agency'" class="pl-4 pb-2 space-y-1.5 text-sm text-gray-600">
              <router-link @click="isMobileMenuOpen = false" to="/services/trade-agent" class="block py-1 hover:text-blue-600">무역대행 (OEM/ODM) 안내</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/services/purchasing-agent" class="block py-1 hover:text-blue-600">중국 구매대행 안내</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/services/rocket-growth" class="block py-1 text-red-600 font-semibold">🚀 쿠팡 로켓그로스 입고 대행</router-link>
              <router-link @click="isMobileMenuOpen = false" to="/services/3pl-fulfillment" class="block py-1 text-purple-600 font-semibold">📦 3PL 풀필먼트 배송대행</router-link>
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
}

// 외부 클릭 감지하여 유저 드롭다운 닫기
const handleDocumentClick = (e) => {
  if (userDropdownRef.value && !userDropdownRef.value.contains(e.target)) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  initAuth()
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>
