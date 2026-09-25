import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CompanyView from '../views/CompanyView.vue'
import MarketView from '../views/MarketView.vue'
import GuideView from '../views/GuideView.vue'
import MarketTourView from '../views/MarketTourView.vue'
import RocketGrowthView from '../views/services/RocketGrowthView.vue'
import PurchasingAgentView from '../views/services/PurchasingAgentView.vue'
import TradeAgentView from '../views/services/TradeAgentView.vue'
import FulfillmentView from '../views/services/FulfillmentView.vue'
import NoticeView from '../views/community/NoticeView.vue'
import FaqView from '../views/community/FaqView.vue'
import AdminLoginView from '../views/admin/AdminLoginView.vue'

import CalculatorView from '../views/tools/CalculatorView.vue'
import Lab1688View from '../views/Lab1688View.vue'
import MallView from '../views/MallView.vue'
import DashboardView from '../views/DashboardView.vue'
import CartView from '../views/dashboard/CartView.vue'
import SourcingProductsView from '../views/dashboard/SourcingProductsView.vue'
import OrderManageView from '../views/dashboard/OrderManageView.vue'
import WarehouseView from '../views/dashboard/WarehouseView.vue'
import CustomsLogisticsView from '../views/dashboard/CustomsLogisticsView.vue'
import AccountSettingsView from '../views/dashboard/AccountSettingsView.vue'
import FavoriteStoresView from '../views/dashboard/FavoriteStoresView.vue'
import TaxInvoiceManageView from '../views/dashboard/TaxInvoiceManageView.vue'
import BuyerCancelledView from '../views/dashboard/BuyerCancelledView.vue'
import NaverCallbackView from '../views/auth/NaverCallbackView.vue'
import { currentUser, checkUserRole, userRole, verifyUserSession } from '../lib/auth'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AUTH_REDIRECT_KEY, isSafeRedirectPath, isStudioProtectedPath } from '../lib/authRedirect'

// 스튜디오(/studio) 노출 스위치 — off(기본) / admin / all
// 빌드 시점에 값이 고정된다(재배포해야 바뀜). off면 라우트를 등록하지 않아 /studio는 catch-all로 / 에 간다.
const STUDIO_MODE = import.meta.env.VITE_STUDIO_ENABLED || 'off'

// 대문(/studio)은 누구나 본다(소개·새 소식). 나머지 화면은 로그인(admin 모드면 관리자까지) 필요.
// 가드는 to.matched를 보므로 대문을 뺀 자식마다 같은 meta를 단다.
const STUDIO_PROTECTED = STUDIO_MODE === 'admin'
  ? { requiresAdmin: true, requiresAuth: true }
  : { requiresAuth: true }

const studioRoute = {
  path: '/studio',
  component: () => import('../layouts/StudioLayout.vue'),
  children: [
    {
      path: '',
      name: 'studio-landing',
      component: () => import('../views/studio/StudioLandingView.vue'),
      meta: { title: '스튜디오' }
    },
    {
      path: 'projects',
      name: 'studio-projects',
      component: () => import('../views/studio/StudioHomeView.vue'),
      meta: { ...STUDIO_PROTECTED, title: '내 작업' }
    },
    {
      path: 'new',
      name: 'studio-new',
      component: () => import('../views/studio/StudioNewView.vue'),
      meta: { ...STUDIO_PROTECTED, title: '새로 만들기' }
    },
    {
      path: 'p/:projectId',
      name: 'studio-editor',
      component: () => import('../views/studio/StudioEditorView.vue'),
      meta: { ...STUDIO_PROTECTED, title: '상세페이지 편집' }
    },
    {
      path: 'assets',
      name: 'studio-assets',
      component: () => import('../views/studio/StudioAssetsView.vue'),
      meta: { ...STUDIO_PROTECTED, title: '저장값 관리' }
    },
    {
      path: 'glossary',
      name: 'studio-glossary',
      component: () => import('../views/studio/StudioGlossaryView.vue'),
      meta: { ...STUDIO_PROTECTED, title: '용어집' }
    },
    {
      path: 'usage',
      name: 'studio-usage',
      component: () => import('../views/studio/StudioUsageView.vue'),
      meta: { ...STUDIO_PROTECTED, title: '사용량' }
    },
    {
      // 임시 검증용 (가리기 알고리즘 비교). 레이아웃 메뉴에 없음 — 주소로만 진입. Phase 1-6 편집기 완성 후 삭제 예정
      path: 'lab',
      name: 'studio-lab',
      component: () => import('../views/studio/StudioLabView.vue'),
      meta: { ...STUDIO_PROTECTED, title: '가리기 검증 랩' }
    }
  ]
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/mall',
    name: 'mall',
    component: MallView,
  },
  {
    path: '/dashboard',
    component: DashboardView,
    children: [
      {
        path: '',
        name: 'dashboard',
      },
      {
        path: 'cart',
        name: 'dashboard-cart',
        component: CartView,
      },
      {
        path: 'sourcing-products',
        name: 'dashboard-sourcing-products',
        component: SourcingProductsView,
      },
      // 구 경로 호환: 같은 화면을 세 경로로 띄우지 않고 내상품리스트로 통일
      {
        path: 'categories',
        redirect: '/dashboard/sourcing-products',
      },
      {
        path: 'labels',
        redirect: '/dashboard/sourcing-products',
      },
      {
        path: 'orders',
        name: 'dashboard-orders',
        component: OrderManageView,
      },
      {
        path: 'warehouse',
        name: 'dashboard-warehouse',
        component: WarehouseView,
      },
      {
        path: 'logistics',
        name: 'dashboard-logistics',
        component: CustomsLogisticsView,
      },
      {
        path: 'customs',
        name: 'dashboard-customs',
        component: CustomsLogisticsView,
      },
      {
        path: 'account',
        name: 'dashboard-account',
        component: AccountSettingsView,
      },
      {
        path: 'stores',
        name: 'dashboard-stores',
        component: FavoriteStoresView,
      },
      {
        path: 'tax-invoice',
        name: 'dashboard-tax-invoice',
        component: TaxInvoiceManageView,
      },
      {
        path: 'cancelled',
        name: 'dashboard-cancelled',
        component: BuyerCancelledView,
      },
    ],
  },
  {
    path: '/lab/1688-search',
    name: 'lab-1688-search',
    component: Lab1688View,
    meta: { requiresAdmin: true },
  },
  {
    path: '/lab/1688',
    redirect: '/dashboard'
  },
  {
    path: '/mypage',
    redirect: '/dashboard/orders'
  },
  {
    path: '/my-page',
    redirect: '/dashboard/orders'
  },
  {
    path: '/auth/callback/naver',
    name: 'naver-callback',
    component: NaverCallbackView,
  },
  {
    path: '/company',
    name: 'company',
    component: CompanyView,
  },
  {
    path: '/market',
    name: 'market',
    component: MarketView,
  },
  {
    path: '/quote',
    name: 'quote',
    component: MarketView,
  },
  {
    path: '/apply',
    name: 'apply',
    component: TradeAgentView,
  },
  {
    path: '/guide',
    name: 'guide',
    component: GuideView,
  },
  {
    path: '/support/guide',
    name: 'support-guide',
    component: () => import('../views/support/GuideView.vue'),
  },
  {
    path: '/support/faq',
    redirect: '/support/guide?tab=faq'
  },
  {
    path: '/support/guide/:id',
    name: 'support-guide-detail',
    component: () => import('../views/support/GuideDetailView.vue'),
  },
  {
    path: '/guide/market-tour',
    name: 'market-tour',
    component: MarketTourView,
  },
  {
    path: '/guide/market_tour_apply',
    redirect: '/guide/market-tour'
  },
  {
    path: '/services/rocket-growth',
    name: 'rocket-growth',
    component: RocketGrowthView,
  },
  {
    path: '/services/purchasing-agent',
    name: 'purchasing-agent',
    component: PurchasingAgentView,
  },
  {
    path: '/services/trade-agent',
    name: 'trade-agent',
    component: TradeAgentView,
  },
  {
    path: '/services/3pl-fulfillment',
    name: '3pl-fulfillment',
    component: FulfillmentView,
  },
  {
    path: '/community/notice',
    name: 'notice',
    component: NoticeView,
  },
  {
    path: '/community/faq',
    name: 'faq',
    component: FaqView,
  },
  {
    path: '/tools/calculator',
    name: 'calculator',
    component: CalculatorView,
  },
  {
    path: '/login',
    name: 'login',
    component: AdminLoginView,
  },
  {
    path: '/reset-password',
    redirect: '/'
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginView,
  },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAdmin: true, isAdmin: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('../views/admin/AdminDashboardView.vue'),
        meta: { requiresAdmin: true, title: '스마트 종합 대시보드 | EUCHS Admin', isAdmin: true }
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('../views/admin/AdminOrderManageView.vue'),
        meta: { requiresAdmin: true, title: '주문·발주 관리 | EUCHS Admin', isAdmin: true }
      },
      {
        path: 'orders/cancelled',
        name: 'admin-cancelled',
        component: () => import('../views/admin/AdminCancelledView.vue'),
        meta: { requiresAdmin: true, title: '취소·반품·교환 현황 | EUCHS Admin', isAdmin: true }
      },
      {
        path: 'settlement',
        name: 'admin-settlement',
        component: () => import('../views/admin/AdminSettlementView.vue'),
        meta: { requiresAdmin: true, title: '예치금 & 정산 관리 | EUCHS Admin', isAdmin: true }
      },
      {
        path: 'members',
        name: 'admin-members',
        component: () => import('../views/admin/AdminMembersView.vue'),
        meta: { requiresAdmin: true, title: '회원 / 바이어 관리 | EUCHS Admin', isAdmin: true }
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: () => import('../views/admin/AdminSettingsView.vue'),
        meta: { requiresAdmin: true, title: '시스템 환경 설정 | EUCHS Admin', isAdmin: true }
      },
      {
        path: 'notices',
        name: 'admin-notices',
        component: () => import('../views/admin/AdminNoticesView.vue'),
        meta: { requiresAdmin: true, title: '공지사항 & 일정 관리 | EUCHS Admin', isAdmin: true }
      },
      {
        // /admin/banners는 /admin/settings 내 "메인 동영상 & 미디어 관리" 탭으로 통합됨
        path: 'banners',
        redirect: '/admin/settings'
      },
      {
        path: 'warehouse-scan',
        name: 'admin-warehouse-scan',
        component: () => import('../views/admin/AdminWarehouseScanView.vue'),
        meta: { requiresAdmin: true, title: '이우 창고 입고 스캔 | EUCHS Admin', isAdmin: true }
      },
      {
        path: ':pathMatch(.*)*',
        redirect: '/admin'
      }
    ]
  },
  ...(STUDIO_MODE === 'admin' || STUDIO_MODE === 'all' ? [studioRoute] : []),
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ el: to.hash, behavior: 'smooth' })
        }, 150)
      })
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// Navigation Guard: 관리자 및 직원 권한 철저 검증 (Route Protection)
router.beforeEach(async (to, from, next) => {
  const isAdminRoute = to.matched.some(record => record.meta?.requiresAdmin) ||
                       to.path === '/admin' ||
                       to.path.startsWith('/admin/')
  const isAdminLoginPage = to.path === '/admin/login'
  const isGeneralLoginPage = to.path === '/login'

  // 관리자 세션 유효성 판별 헬퍼 (로컬 토큰 + 세션 + 화이트리스트 통합)
  const checkAdminAuth = async () => {
    // ★ 0단계: Supabase SDK 내부 세션 초기화 대기 (cold load 시 RLS 보장)
    // 새 탭에서 /admin을 직접 열면 SDK가 localStorage의 sb-*-auth-token을
    // 읽어 내부 세션을 확정하기 전에 이 가드가 실행될 수 있음.
    // getSession()은 SDK의 initializePromise를 await한 뒤 캐시된 세션을
    // 반환하므로 네트워크 호출 없이 ~0ms. 이 호출이 없으면 이후 DB 쿼리에서
    // auth.uid()가 null이 되어 RLS가 0건을 반환함.
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.getSession()
      } catch (e) {
        console.error('[guard] 관리자 판별 전 getSession 실패:', e?.message || e)
      }
    }

    // 1. localStorage 관리자 토큰 및 유저 캐시 확인 (새로고침 즉시 통과 보장)
    try {
      const adminToken = localStorage.getItem('euchs_admin_token')
      const authUserRaw = localStorage.getItem('euchs_auth_user')
      if (adminToken === 'admin_authenticated' && authUserRaw) {
        const authUser = JSON.parse(authUserRaw)
        const role = String(authUser?.role || '').toLowerCase().trim()
        const userEmail = String(authUser?.email || '').toLowerCase().trim()
        if (['super_admin', 'admin', 'staff', 'master'].includes(role) ||
            authUser?.isAdmin ||
            userEmail === 'elliezo21@gmail.com' ||
            userEmail === 'lcceuchs@gmail.com') {
          if (!currentUser.value) currentUser.value = authUser
          return true
        }
      }
    } catch (e) {
      console.error('[guard] 관리자 토큰/유저 캐시 파싱 실패:', e?.message || e)
    }

    // 2. currentUser 메모리 상태 확인
    if (currentUser.value) {
      const userEmail = String(currentUser.value.email || '').toLowerCase().trim()
      if (userEmail === 'elliezo21@gmail.com' || userEmail === 'lcceuchs@gmail.com') {
        return true
      }
      const role = await checkUserRole(currentUser.value)
      const roleLower = String(role || '').toLowerCase().trim()
      if (['super_admin', 'staff', 'admin', 'master'].includes(roleLower)) {
        return true
      }
    }

    // 3. Supabase Auth 세션 조회
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          currentUser.value = session.user
          const userEmail = String(session.user.email || '').toLowerCase().trim()
          if (userEmail === 'elliezo21@gmail.com' || userEmail === 'lcceuchs@gmail.com') {
            userRole.value = 'super_admin'
            return true
          }
          const role = await checkUserRole(session.user)
          const roleLower = String(role || '').toLowerCase().trim()
          if (['super_admin', 'staff', 'admin', 'master'].includes(roleLower)) {
            return true
          }
        }
      } catch (err) {
        console.warn('Session retrieval in guard notice:', err)
      }
    }

    return false
  }

  let isAdminAuthenticated = false
  try {
    isAdminAuthenticated = await checkAdminAuth()
  } catch (authGuardErr) {
    console.warn('Admin guard check notice:', authGuardErr)
    // 에러 발생 시에도 토큰이 있으면 통과
    isAdminAuthenticated = localStorage.getItem('euchs_admin_token') === 'admin_authenticated'
  }

  // 1. /login?redirect=/admin 으로 들어온 경우 -> /admin/login 으로 교정
  if (isGeneralLoginPage && typeof to.query?.redirect === 'string' && to.query.redirect.startsWith('/admin')) {
    if (isAdminAuthenticated) {
      next('/admin')
    } else {
      next('/admin/login')
    }
    return
  }

  // 2. 관리자 로그인 페이지(/admin/login) 접속 시
  if (isAdminLoginPage) {
    if (isAdminAuthenticated) {
      next('/admin')
      return
    }
    next()
    return
  }

  // 3. 일반 로그인 페이지(/login) 접속 시
  if (isGeneralLoginPage) {
    if (isAdminAuthenticated) {
      next('/admin')
      return
    }
    next()
    return
  }

  // 일반 회원 로그인 세션 확인 (3-1 스튜디오·5 대시보드 가드 공용)
  // 실제 Supabase 세션을 먼저 본다(getSession이 SDK 초기화·토큰 갱신을 기다림). 화면용 캐시(euchs_auth_user)만
  // 남은 채 세션이 끝났으면 verifyUserSession이 캐시를 정리하고, 여기서는 로그아웃으로 처리한다.
  // 관리자·데모·네트워크 오류('unknown')는 예전 순서(메모리 → localStorage 캐시 → Supabase 세션) 그대로.
  const resolveUserLoggedIn = async () => {
    const check = await verifyUserSession()
    if (check.status === 'active') {
      if (currentUser.value?.id !== check.session.user.id) currentUser.value = check.session.user
      return true
    }
    if (check.status === 'gone') return false

    let isUserLoggedIn = Boolean(currentUser.value)

    if (!isUserLoggedIn) {
      try {
        const authUserRaw = localStorage.getItem('euchs_auth_user')
        if (authUserRaw) {
          const authUser = JSON.parse(authUserRaw)
          if (authUser?.id && authUser?.email) {
            currentUser.value = authUser
            isUserLoggedIn = true
          }
        }
      } catch (e) {
        console.error('[guard] euchs_auth_user 파싱 실패:', e?.message || e)
      }
    }

    if (!isUserLoggedIn && isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          currentUser.value = session.user
          isUserLoggedIn = true
        }
      } catch (e) {
        console.error('[guard] 대시보드 가드 getSession 실패:', e?.message || e)
      }
    }
    return isUserLoggedIn
  }

  // 3-1. 스튜디오 보호 화면 (/studio/*, 대문 /studio 제외) — 로그인 전이면 목적지를 기억하고 로그인 모달
  //      admin 모드여도 먼저 일반 로그인 → 로그인 뒤 App.vue가 목적지로 보내고, 그때 4번이 관리자 여부를 다시 본다
  //      (전에는 admin 모드에서 바로 /admin/login으로 가서 로그인 후 /admin에 떨어졌다)
  if (isStudioProtectedPath(to.path) && to.matched.some(r => r.meta?.requiresAuth) && !(await resolveUserLoggedIn())) {
    if (isSafeRedirectPath(to.fullPath)) sessionStorage.setItem(AUTH_REDIRECT_KEY, to.fullPath)
    window.dispatchEvent(new CustomEvent('euchs-open-login-modal', {
      detail: { message: '로그인이 필요한 서비스입니다. 로그인 후 이용해 주세요.' }
    }))
    // 스튜디오 안에서 눌렀으면 그 화면에 머물고, 주소로 바로 들어왔으면 스튜디오 대문으로
    if (from.name && from.path !== to.path && from.path.startsWith('/studio')) next(false)
    else next({ name: 'studio-landing' })
    return
  }

  // 4. 관리자 보호 경로 (/admin 및 /admin/*) 접근
  if (isAdminRoute) {
    if (isAdminAuthenticated) {
      // 관리자 권한 확인 완료 -> 어떤 간섭 없이 100% 진입 허용
      next()
    } else {
      // 비로그인 상태 -> 일반 로그인이 아닌 관리자 전용 로그인 화면(/admin/login)으로 직행
      next('/admin/login')
    }
    return
  }

  // 5. /dashboard 하위 마이페이지 보호 (일반 회원 인증 가드)
  const isDashboardRoute = to.path === '/dashboard' || to.path.startsWith('/dashboard/')
  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth)

  if (isDashboardRoute || requiresAuth) {
    // 현재 로그인 세션 확인 (3-1과 같은 헬퍼)
    const isUserLoggedIn = await resolveUserLoggedIn()

    if (!isUserLoggedIn) {
      // 목적지 경로를 sessionStorage에 저장 (로그인 후 복귀용)
      if (isSafeRedirectPath(to.fullPath)) sessionStorage.setItem(AUTH_REDIRECT_KEY, to.fullPath)

      // 로그인 모달 호출 이벤트 발행 (App.vue 또는 Header.vue에서 수신)
      window.dispatchEvent(new CustomEvent('euchs-open-login-modal', {
        detail: { message: '로그인이 필요한 서비스입니다. 로그인 후 이용해 주세요.' }
      }))

      // 이전 페이지가 있으면 머무르고, 없으면 메인으로
      if (from.path && from.path !== to.path && from.name) {
        next(false)
      } else {
        next('/')
      }
      return
    }
  }

  // 일반 공개 라우트 통과
  next()
})

// ── Dynamic chunk load failure auto-recovery ────────────────────────────
// Vercel 재배포 후 구형 청크 해시 불일치로 발생하는 "Failed to fetch
// dynamically imported module" 에러를 감지해 자동으로 페이지를 재로드합니다.
// 무한 루프 방지: sessionStorage 플래그가 있으면 두 번째 재로드를 막습니다.
router.onError((error, to) => {
  const isChunkLoadFailed =
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.message?.includes('Unable to preload CSS for') ||
    error?.name === 'ChunkLoadError'

  if (isChunkLoadFailed) {
    const targetPath = to?.fullPath || window.location.pathname
    console.warn('[Router] Chunk load failed. Auto reloading to fetch latest build chunks:', targetPath)

    const reloadKey = `euchs_chunk_reload_${targetPath}`
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1')
      // 기존 청크 캐시 무효화를 위해 하드 리로드
      window.location.href = targetPath
    } else {
      // 두 번 이상 실패하면 플래그를 제거하고 루트로 이동 (무한 루프 안전망)
      sessionStorage.removeItem(reloadKey)
      console.warn('[Router] Chunk reload retry failed. Navigating to home.')
      window.location.href = '/'
    }
  }
})

// 타이틀 & 파비콘 동적 분기 (관리자 vs 사용자)
const USER_FAVICON_URL = 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/favicon-9b27655ca4c28b6f3b75803b9cb7d64a.ico'
const ADMIN_FAVICON_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%231E293B"/><text x="50%" y="54%" font-family="sans-serif" font-weight="900" font-size="13" fill="%23FFFFFF" text-anchor="middle" dominant-baseline="middle">AD</text></svg>'

router.afterEach((to) => {
  // 1. 관리자 전용 경로 판단
  const isAdminRoute = to.path.startsWith('/admin') || 
                       to.path === '/admin' || 
                       to.query?.redirect === '/admin' ||
                       (typeof to.query?.redirect === 'string' && to.query.redirect.startsWith('/admin'))

  // 2. 파비콘 엘리먼트 취득 (없으면 자동 생성)
  let faviconLink = document.querySelector("link[rel~='icon']")
  if (!faviconLink) {
    faviconLink = document.createElement('link')
    faviconLink.rel = 'icon'
    document.head.appendChild(faviconLink)
  }

  // 3. 경로에 따른 타이틀 및 파비콘 분기
  if (isAdminRoute) {
    // 관리자 모드: 무채색 AD 뱃지 파비콘 + 공식 관리자 타이틀
    if (to.path === '/admin/login') {
      document.title = 'EUC 관리자 로그인 | EUCHS Admin'
    } else {
      document.title = to.meta?.title || 'EUC 관리자 솔루션 | EUCHS Admin Console'
    }
    faviconLink.href = ADMIN_FAVICON_SVG
  } else {
    // 일반 사용자 모드: 오리지널 로고/타이틀 복원
    document.title = to.meta?.title || '이유씨컴퍼니 (EUCHS) - 중국 무역 & 수입대행 전문 파트너'
    faviconLink.href = USER_FAVICON_URL
  }
})

export default router

