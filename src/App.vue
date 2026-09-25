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
import { AUTH_REDIRECT_KEY, isSafeRedirectPath, isStudioProtectedPath } from './lib/authRedirect'

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

// 로그인 성공 후 저장된 목적지로 자동 리다이렉트
// /mall, /dashboard 등 실제 페이지에 이미 있는 경우 이동하지 않음
const handleLoginSuccess = () => {
  const currentPath = route.path

  // ⓪ 스튜디오: 가드가 보호 화면(/studio/*) 목적지를 저장하고 스튜디오 안에 머물게 한 경우 → 그 목적지로
  //    (①은 /studio를 "실제 서비스 페이지"로 보고 목적지를 버리므로 먼저 본다)
  const saved = sessionStorage.getItem(AUTH_REDIRECT_KEY)
  if (currentPath.startsWith('/studio') && isStudioProtectedPath(saved)) {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY)
    if (!isSafeRedirectPath(saved)) {
      console.warn('[auth-redirect] 내부 경로가 아닌 복귀 주소를 무시:', saved)
      return
    }
    if (saved !== route.fullPath) router.push(saved)
    return
  }

  // ① 현재 페이지가 홈(/)이 아닌 실제 서비스 페이지 → 이동 없이 그대로 머뭄
  if (currentPath && currentPath !== '/' && currentPath !== '/login') {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY)
    return
  }

  // ② /login이나 / 에서 로그인 성공 → 저장된 목적지가 있으면 이동 (내부 경로만)
  const redirectPath = saved
  sessionStorage.removeItem(AUTH_REDIRECT_KEY)
  if (redirectPath && !isSafeRedirectPath(redirectPath)) {
    console.warn('[auth-redirect] 내부 경로가 아닌 복귀 주소를 무시:', redirectPath)
  } else if (redirectPath && redirectPath !== currentPath) {
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
    let dest = (returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/?')) ? returnUrl : '/mall'
    // 스튜디오 대문에서 로그인을 시작했고 가드가 저장한 스튜디오 목적지가 있으면 그곳으로 (같은 탭 sessionStorage)
    const saved = sessionStorage.getItem(AUTH_REDIRECT_KEY)
    if (returnUrl.startsWith('/studio') && isStudioProtectedPath(saved)) {
      sessionStorage.removeItem(AUTH_REDIRECT_KEY)
      if (isSafeRedirectPath(saved)) dest = saved
      else console.warn('[auth-redirect] 내부 경로가 아닌 복귀 주소를 무시:', saved)
    }
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
