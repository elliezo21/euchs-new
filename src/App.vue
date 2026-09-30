<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-800">
    <Header v-if="!isStandaloneRoute" />
    <main class="flex-grow">
      <router-view />
    </main>
    <QuickMenu v-if="!isStandaloneRoute" :raised="stickyCtaVisible" />
    <Footer v-if="!isStandaloneRoute" />
    <!-- 모바일 하단 고정 바 [스튜디오 둘러보기]·[카톡 문의] (md 이상 숨김, 숨기는 경로는 homeCta.showStickyCta) -->
    <MobileStickyCta v-if="stickyCtaVisible" />
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
import MobileStickyCta from './components/MobileStickyCta.vue'
import { showStickyCta } from './lib/homeCta'
import AuthModal from './components/AuthModal.vue'
import OnboardingTour from './components/common/OnboardingTour.vue'
import { trackVisitor } from './lib/analytics'
import { openLoginModal } from './lib/auth'
import { AUTH_REDIRECT_KEY, isPostLoginTarget, loginSuccessDest, oauthReturnDest, landedInStudio } from './lib/authRedirect'

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

// 모바일 하단 고정 바 — 헤더·푸터가 있는 화면 중 관리자·대시보드·마이페이지·스튜디오·로그인이 아닐 때
const stickyCtaVisible = computed(() => !isStandaloneRoute.value && showStickyCta(route.path))

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

  // 스튜디오에서 시작한 로그인은 스튜디오 화면으로 바로 돌아온다(auth.js oauthRedirectTarget) — 착지한 화면이 목적지.
  // 저장값만 치우고 옮기지 않는다. (route.path는 첫 이동이 끝나기 전이라 '/'로 보이므로 실제 주소를 본다)
  if (landedInStudio(window.location.pathname)) {
    localStorage.removeItem('euchs_oauth_return_url')
    takeSavedRedirect()
    return
  }

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
