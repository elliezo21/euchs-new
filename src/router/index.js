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
import { currentUser, userRole, checkUserRole, isAuthLoading } from '../lib/auth'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
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

// Navigation Guard: 관리자 및 직원 권한 검증
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAdmin) {
    // 1. Supabase 설정 확인
    if (!isSupabaseConfigured()) {
      next()
      return
    }

    // 2. 현재 로그인된 유저 세션 확인
    let user = currentUser.value
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      user = session?.user || null
      currentUser.value = user
    }

    if (!user) {
      next({
        path: '/admin/login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 3. 권한(Role) 확인
    const role = await checkUserRole(user)
    if (['super_admin', 'staff', 'admin'].includes(role)) {
      next()
    } else {
      alert('관리자 또는 직원 권한(Admin/Staff)이 부여되지 않은 계정입니다.')
      next({
        path: '/admin/login',
        query: { redirect: to.fullPath }
      })
    }
  } else {
    next()
  }
})

export default router

