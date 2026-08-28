<template>
  <LoginModal />

  <!-- ======================================================== -->
  <!-- B2B 비회원 전용 안내 모달 (Auth Guard Modal) -->
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
        v-if="isGuardOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
        @click.self="closeGuardModal"
        @keydown.esc="closeGuardModal"
      >
        <div
          class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 text-center text-slate-800 animate-fade-in space-y-5"
          role="dialog"
          aria-modal="true"
        >
          <!-- 닫기 버튼 (X) -->
          <button
            type="button"
            @click="closeGuardModal"
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
            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xs mx-auto whitespace-pre-line">
              {{ guardMessage }}
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
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import LoginModal from './LoginModal.vue'
import { openLoginModal } from '../lib/auth'

const isGuardOpen = ref(false)
const DEFAULT_MESSAGE = '1688 실시간 도매 단가 및 상품 상세 정보는 회원 전용 서비스입니다.\n로그인이나 회원가입 후 편리하게 이용해 보세요.'
const guardMessage = ref(DEFAULT_MESSAGE)

const closeGuardModal = () => {
  isGuardOpen.value = false
}

const handleGuardAction = (mode = 'login') => {
  isGuardOpen.value = false
  openLoginModal(mode)
}

const handleOpenGuardEvent = (e) => {
  if (e.detail?.message) {
    guardMessage.value = e.detail.message
  } else if (e.detail?.reason === 'cart') {
    guardMessage.value = '장바구니 확인 및 수입 발주 신청은 회원 전용 서비스입니다.\n로그인이나 회원가입 후 편리하게 이용해 보세요.'
  } else {
    guardMessage.value = DEFAULT_MESSAGE
  }
  isGuardOpen.value = true
}

onMounted(() => {
  window.addEventListener('euchs:open-auth-guard', handleOpenGuardEvent)
})

onUnmounted(() => {
  window.removeEventListener('euchs:open-auth-guard', handleOpenGuardEvent)
})
</script>
