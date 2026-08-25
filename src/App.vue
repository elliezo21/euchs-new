<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-800">
    <Header v-if="!isStandaloneRoute" />
    <main class="flex-grow">
      <router-view />
    </main>
    <QuickMenu v-if="!isStandaloneRoute" />
    <Footer v-if="!isStandaloneRoute" />
    <LoginModal />
    <!-- 스포트라이트 온보딩 투어 (최상위, 전역 마운트) -->
    <OnboardingTour />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import QuickMenu from './components/QuickMenu.vue'
import LoginModal from './components/LoginModal.vue'
import OnboardingTour from './components/common/OnboardingTour.vue'
import { trackVisitor } from './lib/analytics'
import { openLoginModal } from './lib/auth'

const route = useRoute()
const router = useRouter()

const isStandaloneRoute = computed(() => {
  const p = route.path
  return (
    p.startsWith('/admin') || 
    p === '/login' || 
    p === '/admin/login' ||
    p.startsWith('/dashboard') ||
    p.startsWith('/mypage') ||
    p.startsWith('/my-page') ||
    p.startsWith('/lab')
  )
})

// 라우터 가드가 발행하는 로그인 모달 호출 이벤트 수신
const handleOpenLoginModal = () => {
  openLoginModal('login')
}

// 로그인 성공 후 저장된 목적지로 자동 리다이렉트
const handleLoginSuccess = () => {
  const redirectPath = sessionStorage.getItem('euchs_auth_redirect')
  if (redirectPath && redirectPath !== route.path) {
    sessionStorage.removeItem('euchs_auth_redirect')
    router.push(redirectPath)
  }
}

onMounted(() => {
  trackVisitor(route.path)
  window.addEventListener('euchs-open-login-modal', handleOpenLoginModal)
  window.addEventListener('euchs:login_success', handleLoginSuccess)
})

onUnmounted(() => {
  window.removeEventListener('euchs-open-login-modal', handleOpenLoginModal)
  window.removeEventListener('euchs:login_success', handleLoginSuccess)
})

watch(() => route.path, (newPath) => {
  trackVisitor(newPath)
})
</script>
