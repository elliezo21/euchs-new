<template>
  <div class="fixed right-3.5 sm:right-5 bottom-5 sm:bottom-6 z-40 flex flex-col items-center gap-2 select-none font-sans">
    
    <!-- Expanded Menu Popup (Opens Upwards above floating stack) -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div 
        v-if="isOpen"
        class="mb-1 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-3 space-y-1.5 origin-bottom-right"
      >
        <div class="flex items-center justify-between pb-2 mb-1 border-b border-gray-100 text-xs font-bold text-gray-800">
          <span class="flex items-center gap-1 text-blue-600">
            <i class="fas fa-bolt"></i> QUICK MENU
          </span>
          <button @click="isOpen = false" class="text-gray-400 hover:text-gray-600 p-0.5">
            <i class="fas fa-xmark text-sm"></i>
          </button>
        </div>

        <router-link 
          to="/mall"
          @click="isOpen = false"
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
        >
          <i class="fas fa-store text-rose-500"></i>
          <span>1688 실시간 소싱몰</span>
        </router-link>

        <router-link 
          to="/dashboard"
          @click="isOpen = false"
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
        >
          <i class="fas fa-user-tie text-indigo-500"></i>
          <span>B2B ERP 마이페이지</span>
        </router-link>

        <a 
          href="https://www.youtube.com/@euccompany" 
          target="_blank"
          @click="isOpen = false"
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition"
        >
          <i class="fab fa-youtube text-red-600 text-sm"></i>
          <span>이유씨 유튜브</span>
        </a>

        <router-link 
          to="/tools/calculator"
          @click="isOpen = false"
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
        >
          <i class="fas fa-calculator text-blue-600"></i>
          <span>무역/관부가세 계산기</span>
        </router-link>

        <router-link 
          to="/guide/market-tour"
          @click="isOpen = false"
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition"
        >
          <i class="fas fa-plane-departure text-amber-500"></i>
          <span>이우 시장투어 신청</span>
        </router-link>

        <router-link 
          to="/community/notice"
          @click="isOpen = false"
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <i class="fas fa-bullhorn text-purple-500"></i>
          <span>공지사항 & 소식</span>
        </router-link>
      </div>
    </transition>

    <!-- Floating Buttons Stack (Vertical 6-Tier Structure: 100% Identical Circular Button Sizes) -->
    <div class="flex flex-col items-center gap-2">
      
      <!-- 1. 맨 위: 원형 장바구니 버튼 (크기 완벽 통일 + 숫자 배지) -->
      <div class="relative">
        <button 
          type="button"
          @click="$router.push('/dashboard')" 
          class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 active:scale-95 transition-all text-base sm:text-lg font-bold focus:outline-none"
          title="발주대기 보관함"
          aria-label="발주대기 보관함"
        >
          <i class="fas fa-shopping-bag"></i>
        </button>
        <!-- 수량 알림 배지 (비로그인이거나 0개면 숨김) -->
        <span
          v-if="isLoggedIn && savedCount > 0"
          class="absolute -top-1 -right-1 bg-white text-red-600 border border-red-500 text-[10px] sm:text-xs font-black rounded-full px-1.5 py-0.2 shadow min-w-[18px] text-center leading-tight pointer-events-none font-mono"
        >
          {{ savedCount }}
        </span>
      </div>

      <!-- 2. [▲] 맨 위로 스크롤 플로팅 버튼 -->
      <button 
        type="button"
        @click="scrollToTop"
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 hover:bg-blue-600 active:scale-95 text-slate-200 hover:text-white shadow-md hover:shadow-xl backdrop-blur-sm flex items-center justify-center transition-all duration-200 border border-slate-700/80 hover:-translate-y-0.5 group focus:outline-none"
        title="화면 맨 위로 이동"
        aria-label="화면 맨 위로 이동"
      >
        <i class="fas fa-arrow-up text-base sm:text-lg group-hover:scale-110 transition-transform"></i>
      </button>

      <!-- 3. [▼] 맨 아래로 스크롤 플로팅 버튼 -->
      <button 
        type="button"
        @click="scrollToBottom"
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800/90 hover:bg-blue-600 active:scale-95 text-slate-200 hover:text-white shadow-md hover:shadow-xl backdrop-blur-sm flex items-center justify-center transition-all duration-200 border border-slate-700/80 hover:translate-y-0.5 group focus:outline-none"
        title="화면 맨 아래로 이동"
        aria-label="화면 맨 아래로 이동"
      >
        <i class="fas fa-arrow-down text-base sm:text-lg group-hover:scale-110 transition-transform"></i>
      </button>

      <div class="w-6 h-[1px] bg-slate-400/20 my-0.5"></div>

      <!-- 4. 파란색 원형 퀵메뉴 토글 버튼 (+) -->
      <button 
        type="button"
        @click="isOpen = !isOpen"
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 transform focus:outline-none border border-white/20 hover:-translate-y-0.5"
        :class="{ 'rotate-90 bg-slate-800 hover:bg-slate-900 border-slate-700': isOpen }"
        :title="isOpen ? '퀵메뉴 닫기' : '퀵메뉴 열기'"
        aria-label="퀵메뉴 열기/닫기"
      >
        <i :class="isOpen ? 'fas fa-xmark text-lg' : 'fas fa-plus text-lg'"></i>
      </button>

      <!-- 5. 노란색 카카오톡 상담하기 원형 버튼 -->
      <a 
        href="http://pf.kakao.com/_xmQWsK/chat" 
        target="_blank"
        rel="noopener noreferrer"
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-slate-900 shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 transform focus:outline-none border border-amber-300/40 hover:-translate-y-0.5"
        title="카카오톡 실시간 상담"
        aria-label="카카오톡 상담하기"
      >
        <i class="fas fa-comment text-xl text-amber-950"></i>
      </a>

      <!-- 6. 전화 걸기 원형 버튼 (대표번호 연결) -->
      <a 
        href="tel:010-9373-1214"
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 transform focus:outline-none border border-emerald-400/40 hover:-translate-y-0.5"
        title="대표번호 전화걸기 (010-9373-1214)"
        aria-label="대표번호 전화걸기"
      >
        <i class="fas fa-phone-alt text-lg"></i>
      </a>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { isLoggedIn, getCartStorageKey } from '../lib/auth'

const isOpen = ref(false)
const savedCount = ref(0)

const updateSavedCount = () => {
  // 비로그인 상태: 즉시 0 (뱃지 숨김)
  if (!isLoggedIn.value) {
    savedCount.value = 0
    return
  }
  try {
    // 사용자 격리 키 우선
    const cartKey = getCartStorageKey()
    const userCart = localStorage.getItem(cartKey)
    if (userCart) {
      const parsed = JSON.parse(userCart)
      savedCount.value = Array.isArray(parsed) ? parsed.length : 0
      return
    }
    // 레거시 키 fallback (마이그레이션 호환)
    const legacy = localStorage.getItem('euchs_erp_saved_items')
    if (legacy) {
      const parsed = JSON.parse(legacy)
      savedCount.value = Array.isArray(parsed) ? parsed.length : 0
    } else {
      savedCount.value = 0
    }
  } catch (e) {
    savedCount.value = 0
  }
}

// euchs:cart-updated 이벤트 수신 (로그아웃 시 count:0 즉시 처리)
const handleCartUpdated = (e) => {
  if (e.detail?.count !== undefined) {
    savedCount.value = isLoggedIn.value ? (Number(e.detail.count) || 0) : 0
  } else {
    updateSavedCount()
  }
}

// euchs-auth-changed 이벤트 수신 (계정 전환/로그아웃 시 즉시 재계산)
const handleAuthChanged = () => {
  updateSavedCount()
}

// 최상단으로 부드럽게 스크롤
const scrollToTop = () => {
  isOpen.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 최하단으로 부드럽게 스크롤
const scrollToBottom = () => {
  isOpen.value = false
  window.scrollTo({
    top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    behavior: 'smooth'
  })
}

onMounted(() => {
  updateSavedCount()
  window.addEventListener('storage', updateSavedCount)
  window.addEventListener('euchs:cart-updated', handleCartUpdated)
  window.addEventListener('euchs-auth-changed', handleAuthChanged)
})

onUnmounted(() => {
  window.removeEventListener('storage', updateSavedCount)
  window.removeEventListener('euchs:cart-updated', handleCartUpdated)
  window.removeEventListener('euchs-auth-changed', handleAuthChanged)
})
</script>
