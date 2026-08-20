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
import CalculatorView from '../views/tools/CalculatorView.vue'
import NaverCallbackView from '../views/auth/NaverCallbackView.vue'
import MyPageView from '../views/MyPageView.vue'
import { currentUser, checkUserRole } from '../lib/auth'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/mypage',
    name: 'mypage',
    component: MyPageView,
  },
  {
    path: '/my-page',
    redirect: '/mypage'
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
    name: 'admin',
    component: AdminView,
    meta: { requiresAdmin: true }
  },
  {
    path: '/admin/:pathMatch(.*)*',
    name: 'admin-all',
    component: AdminView,
    meta: { requiresAdmin: true }
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

  // 1. 로그인 페이지 접속 시: 이미 관리자로 로그인되어 있으면 /admin으로 이동
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

export default router

