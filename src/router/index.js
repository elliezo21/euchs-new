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
import AdminView from '../views/admin/AdminViewNew.vue'
import AdminLoginView from '../views/admin/AdminLoginView.vue'
import AdminWarehouseView from '../views/admin/AdminWarehouseView.vue'
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
import NaverCallbackView from '../views/auth/NaverCallbackView.vue'
import { currentUser, checkUserRole } from '../lib/auth'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
      {
        path: 'categories',
        name: 'dashboard-categories',
        component: SourcingProductsView,
      },
      {
        path: 'labels',
        name: 'dashboard-labels',
        component: SourcingProductsView,
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
    ],
  },
  {
    path: '/lab/1688-search',
    name: 'lab-1688-search',
    component: Lab1688View,
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
        path: 'warehouse',
        name: 'admin-warehouse',
        component: () => import('../views/admin/AdminWarehouseView.vue'),
        meta: { requiresAdmin: true, title: '이우 창고 & 검수 WMS | EUCHS Admin', isAdmin: true }
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
        path: ':pathMatch(.*)*',
        redirect: '/admin'
      }
    ]
  },
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
    // 1. localStorage 관리자 토큰 및 유저 캐시 확인 (새로고침 즉시 통과 보장)
    try {
      const adminToken = localStorage.getItem('euchs_admin_token')
      const authUserRaw = localStorage.getItem('euchs_auth_user')
      if (adminToken === 'admin_authenticated' && authUserRaw) {
        const authUser = JSON.parse(authUserRaw)
        if (authUser?.role === 'admin' || authUser?.role === 'super_admin' || authUser?.role === 'staff' || authUser?.isAdmin) {
          if (!currentUser.value) currentUser.value = authUser
          return true
        }
      }
    } catch (e) {}

    // 2. currentUser 메모리 상태 확인
    if (currentUser.value) {
      const role = await checkUserRole(currentUser.value)
      if (['super_admin', 'staff', 'admin'].includes(role)) {
        return true
      }
    }

    // 3. Supabase Auth 세션 조회
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          currentUser.value = session.user
          const role = await checkUserRole(session.user)
          if (['super_admin', 'staff', 'admin'].includes(role)) {
            return true
          }
        }
      } catch (err) {
        console.warn('Session retrieval in guard notice:', err)
      }
    }

    return false
  }

  const isAdminAuthenticated = await checkAdminAuth()

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

  if (isDashboardRoute) {
    // 현재 로그인 세션 확인: 메모리 → localStorage 캐시 순
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
      } catch (e) {}
    }

    if (!isUserLoggedIn && isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          currentUser.value = session.user
          isUserLoggedIn = true
        }
      } catch (e) {}
    }

    if (!isUserLoggedIn) {
      // 목적지 경로를 sessionStorage에 저장 (로그인 후 복귀용)
      sessionStorage.setItem('euchs_auth_redirect', to.fullPath)

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

