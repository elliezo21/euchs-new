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
        component: CartView,
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
    path: '/guide',
    name: 'guide',
    component: GuideView,
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
      return { el: to.hash, behavior: 'smooth' }
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
  const isLoginPage = to.path === '/login' || to.path === '/admin/login'

  // 1. 로그인 페이지 접속 시: 이미 관리자로 로그인되어 있으면 /admin 메인 대시보드로 이동
  if (isLoginPage) {
    let user = currentUser.value
    if (!user && isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user || null
        if (user) currentUser.value = user
      } catch (err) {
        console.warn('Session retrieval notice:', err)
      }
    }
    if (user) {
      const role = await checkUserRole(user)
      if (['super_admin', 'staff', 'admin'].includes(role)) {
        next('/admin')
        return
      }
    }
    next()
    return
  }

  // 2. 관리자 경로 접근 보호 (/admin 및 하위 경로 전체)
  if (isAdminRoute) {
    // 2-1. Supabase 세션 사용자 조회
    let user = currentUser.value
    if (!user && isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user || null
        if (user) currentUser.value = user
      } catch (err) {
        console.error('Session retrieval error in guard:', err)
      }
    }

    // 2-2. 비로그인 상태인 경우 즉시 /login 으로 리다이렉트
    if (!user) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 2-3. Supabase DB Role 검증 (admin / super_admin / staff)
    try {
      const role = await checkUserRole(user)
      if (['super_admin', 'staff', 'admin'].includes(role)) {
        next()
      } else {
        alert('관리자 또는 직원 권한(Admin/Staff)이 부여되지 않은 계정입니다.')
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
      }
    } catch (err) {
      console.error('Role verification exception:', err)
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    }
    return
  }

  // 일반 공개 라우트 통과
  next()
})

// 타이틀 & 파비콘 동적 분기 (관리자 vs 사용자)
const USER_FAVICON = 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/favicon-9b27655ca4c28b6f3b75803b9cb7d64a.ico'
const ADMIN_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-family='monospace' font-weight='bold' font-size='13' fill='%23fff'%3EAD%3C/text%3E%3C/svg%3E"

router.afterEach((to) => {
  const isAdminLogin = to.path === '/admin/login' || 
    (to.path === '/login' && typeof to.query?.redirect === 'string' && to.query.redirect.startsWith('/admin'))
  const isAdminPath = to.path === '/admin' || to.path.startsWith('/admin/') || isAdminLogin

  if (isAdminPath) {
    if (isAdminLogin) {
      document.title = 'EUC 관리자 로그인 | EUCHS Admin'
    } else {
      document.title = to.meta?.title || 'EUC 관리자 솔루션 | EUCHS Admin Console'
    }
    const favicon = document.querySelector("link[rel='icon']")
    if (favicon) favicon.href = ADMIN_FAVICON
  } else {
    document.title = '이유씨컴퍼니 (EUCHS) - 중국 무역 & 수입대행'
    const favicon = document.querySelector("link[rel='icon']")
    if (favicon) favicon.href = USER_FAVICON
  }
})

export default router

