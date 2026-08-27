<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-800">
    <Header v-if="!isStandaloneRoute" />
    <main class="flex-grow">
      <router-view />
    </main>
    <QuickMenu v-if="!isStandaloneRoute" />
    <Footer v-if="!isStandaloneRoute" />
    <LoginModal />
    <!-- 온보딩 사용가이드 모달 (/mall 또는 /dashboard 에서만 렌더링) -->
    <OnboardingTour v-if="isOnboardingAllowed" />
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

const isOnboardingAllowed = computed(() => {
  const p = route.path
  if (!p || p.startsWith('/admin') || p === '/login' || p === '/admin/login') return false
  return p.startsWith('/mall') || p.startsWith('/dashboard')
})

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
// /mall, /dashboard 등 실제 페이지에 이미 있는 경우 이동하지 않음
const handleLoginSuccess = () => {
  const currentPath = route.path

  // ① 현재 페이지가 홈(/)이 아닌 실제 서비스 페이지 → 이동 없이 그대로 머뭄
  if (currentPath && currentPath !== '/' && currentPath !== '/login') {
    sessionStorage.removeItem('euchs_auth_redirect')
    return
  }

  // ② /login이나 / 에서 로그인 성공 → 저장된 목적지가 있으면 이동
  const redirectPath = sessionStorage.getItem('euchs_auth_redirect')
  sessionStorage.removeItem('euchs_auth_redirect')
  if (redirectPath && redirectPath !== currentPath) {
    router.push(redirectPath)
    return
  }

  // ③ 목적지도 없으면 기본값 /mall 로 이동 (홈에서 로그인한 경우)
  if (currentPath === '/' || currentPath === '/login') {
    router.push('/mall')
  }
}

// Supabase OAuth 콜백 후 / 에 착지한 경우 원래 페이지로 복귀
// (구글/카카오 OAuth가 Supabase Site URL로 기본 복귀할 때 방어)
const checkOAuthReturnUrl = () => {
  const returnUrl = localStorage.getItem('euchs_oauth_return_url')
  if (!returnUrl) return

  // returnUrl이 있고 현재 경로가 / 또는 /login이면 → returnUrl로 이동
  const currentPath = route.path
  if (currentPath === '/' || currentPath === '/login') {
    localStorage.removeItem('euchs_oauth_return_url')
    const dest = (returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/?')) ? returnUrl : '/mall'
    router.replace(dest)
  } else {
    // 이미 적절한 페이지에 있으면 returnUrl 폐기
    localStorage.removeItem('euchs_oauth_return_url')
  }
}

onMounted(() => {
  trackVisitor(route.path)
  window.addEventListener('euchs-open-login-modal', handleOpenLoginModal)
  window.addEventListener('euchs:login_success', handleLoginSuccess)

  // OAuth 콜백 후 복귀 처리 (홈에 착지했을 때)
  checkOAuthReturnUrl()
})

onUnmounted(() => {
  window.removeEventListener('euchs-open-login-modal', handleOpenLoginModal)
  window.removeEventListener('euchs:login_success', handleLoginSuccess)
})

watch(() => route.path, (newPath) => {
  trackVisitor(newPath)
})
</script>
