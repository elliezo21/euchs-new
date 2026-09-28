<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-800">
    <Header v-if="!isStandaloneRoute" />
    <main class="flex-grow">
      <router-view />
    </main>
    <QuickMenu v-if="!isStandaloneRoute" />
    <Footer v-if="!isStandaloneRoute" />
    <AuthModal />
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
import AuthModal from './components/AuthModal.vue'
import OnboardingTour from './components/common/OnboardingTour.vue'
import { trackVisitor } from './lib/analytics'
import { openLoginModal } from './lib/auth'
import { AUTH_REDIRECT_KEY, isPostLoginTarget, loginSuccessDest, oauthReturnDest } from './lib/authRedirect'

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
    p.startsWith('/mypage') ||
    p.startsWith('/my-page') ||
    p.startsWith('/lab') ||
    p.startsWith('/studio')
  )
})

// 라우터 가드가 발행하는 로그인 모달 호출 이벤트 수신
const handleOpenLoginModal = () => {
  openLoginModal('login')
}

// 가드가 저장한 복귀 주소를 꺼내고 즉시 지운다 (한 번 쓰면 끝 — 남겨 두면 나중 로그인에서 엉뚱한 곳으로 튄다)
const takeSavedRedirect = () => {
  const saved = sessionStorage.getItem(AUTH_REDIRECT_KEY)
  sessionStorage.removeItem(AUTH_REDIRECT_KEY)
  if (saved && !isPostLoginTarget(saved)) {
    console.warn('[auth-redirect] 보호 화면 내부 경로가 아닌 복귀 주소를 무시:', saved)
  }
  return saved
}

// 로그인 성공 후 이동 (이메일 로그인 등 모달에서 로그인한 경우)
// - 가드가 저장한 보호 화면(/dashboard*, /studio/*)이 있으면 지금 어느 화면에 있든 그곳으로
// - 없으면 예전 그대로: 홈(/)·/login → /mall, 그 밖의 실제 서비스 페이지 → 머묾
const handleLoginSuccess = () => {
  const dest = loginSuccessDest(takeSavedRedirect(), route.path, route.fullPath)
  if (dest) router.push(dest)
}

// Supabase OAuth 콜백 후 / 에 착지한 경우 원래 페이지로 복귀
// (구글/카카오 OAuth가 Supabase Site URL로 기본 복귀할 때 방어)
const checkOAuthReturnUrl = () => {
  const returnUrl = localStorage.getItem('euchs_oauth_return_url')
  if (!returnUrl) return

  // returnUrl이 있고 현재 경로가 / 또는 /login이면 → 저장된 보호 화면, 없으면 returnUrl로 이동
  const currentPath = route.path
  if (currentPath === '/' || currentPath === '/login') {
    localStorage.removeItem('euchs_oauth_return_url')
    router.replace(oauthReturnDest(takeSavedRedirect(), returnUrl))
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
