<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row">

    <!-- ============================================================ -->
    <!-- 1. LEFT DARK NAVY LNB SIDEBAR (스마트스토어 센터 형태) -->
    <!-- ============================================================ -->
    <aside
      v-if="!isWarehouseScan"
      class="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none z-30 transition-all duration-200"
    >
      <!-- Brand Logo / Admin Title -->
      <div class="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
        <router-link to="/admin" class="flex items-center gap-3 group" title="관리자 종합 메인 대시보드로 이동">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            AD
          </div>
          <div>
            <div class="font-black text-white text-sm tracking-tight leading-tight">EUCHS ADMIN</div>
            <div class="text-[10px] text-slate-400 font-mono">B2B 수입대행 ERP</div>
          </div>
        </router-link>

        <!-- Mobile Menu Toggle Button -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="메뉴 열기"
        >
          <Menu v-if="!isMobileMenuOpen" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
      </div>

      <!-- Admin Manager Profile Card (스마트스토어 센터 아바타) -->
      <div class="p-4 border-b border-slate-800/80 bg-slate-900/50">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm overflow-hidden">
              <span class="text-xs">👑</span>
            </div>
            <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-white text-xs truncate">이유씨 관리자</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">Master</span>
            </div>
            <div class="text-[11px] text-slate-400 truncate mt-0.5 font-mono">통합 운영 매니저</div>
          </div>
        </div>
      </div>

      <!-- Navigation Menu Tree -->
      <nav
        :class="isMobileMenuOpen ? 'block' : 'hidden md:block'"
        class="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-sidebar-scroll"
      >
        <div class="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Overview
        </div>

        <!-- 0. 메인 대시보드 -->
        <router-link
          to="/admin"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition group"
          :class="isActiveRoute('/admin')
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
        >
          <LayoutDashboard class="w-4 h-4 text-slate-400 group-hover:text-white" :class="isActiveRoute('/admin') ? 'text-white' : ''" />
          <span class="flex-1">메인 대시보드</span>
        </router-link>

        <div class="pt-3 px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Operations
        </div>

        <!-- 1. 주문·발주 관리 (아코디언 서브메뉴) -->
        <div>
          <!-- 부모 메뉴 버튼 -->
          <button
            @click="isOrdersMenuOpen = !isOrdersMenuOpen"
            class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition group"
            :class="isOrdersGroupActive
              ? 'bg-blue-600/20 text-blue-300'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
          >
            <ClipboardList class="w-4 h-4 shrink-0" :class="isOrdersGroupActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-white'" />
            <span class="flex-1 text-left">주문·발주 관리</span>
            <span
              v-if="pendingOrdersCount > 0 && !isOrdersMenuOpen"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-amber-500 text-white"
            >
              신규 {{ pendingOrdersCount }}
            </span>
            <ChevronDown
              class="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
              :class="isOrdersMenuOpen ? 'rotate-180 text-blue-300' : 'text-slate-500'"
            />
          </button>

          <!-- 서브메뉴 (펼침/접힘) -->
          <div v-show="isOrdersMenuOpen" class="mt-1 ml-4 pl-3 border-l border-slate-700/60 space-y-0.5">
            <!-- 1-1. 주문·발주 파이프라인 -->
            <router-link
              to="/admin/orders"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition"
              :class="isActiveRoute('/admin/orders')
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
            >
              <span class="w-1 h-1 rounded-full shrink-0" :class="isActiveRoute('/admin/orders') ? 'bg-white' : 'bg-slate-600'"></span>
              <span class="flex-1">주문·발주 파이프라인</span>
              <span
                v-if="pendingOrdersCount > 0"
                class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white"
              >
                {{ pendingOrdersCount }}
              </span>
            </router-link>

            <!-- 1-2. 취소·반품·교환 현황 -->
            <router-link
              to="/admin/orders/cancelled"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition"
              :class="isActiveRoute('/admin/orders/cancelled')
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
            >
              <span class="w-1 h-1 rounded-full shrink-0" :class="isActiveRoute('/admin/orders/cancelled') ? 'bg-white' : 'bg-slate-600'"></span>
              <span class="flex-1">취소·반품·교환 현황</span>
            </router-link>
          </div>
        </div>

        <!-- 이우 창고 입고 스캔 -->
        <router-link
          to="/admin/warehouse-scan"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition group"
          :class="isActiveRoute('/admin/warehouse-scan')
            ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
        >
          <i class="fas fa-barcode w-4 text-center text-slate-400 group-hover:text-white" :class="isActiveRoute('/admin/warehouse-scan') ? 'text-white' : ''"></i>
          <span class="flex-1">이우 창고 입고 스캔</span>
          <span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-500/20 text-teal-300 border border-teal-400/30">WMS</span>
        </router-link>

        <div class="pt-3 px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Management & Settings
        </div>

        <!-- 3. 예치금 & 정산 관리 -->
        <router-link
          to="/admin/settlement"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition group"
          :class="isActiveRoute('/admin/settlement')
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
        >
          <Wallet class="w-4 h-4 text-slate-400 group-hover:text-white" :class="isActiveRoute('/admin/settlement') ? 'text-white' : ''" />
          <span class="flex-1">예치금 & 정산 관리</span>
        </router-link>

        <!-- 4. 회원 / 바이어 관리 -->
        <router-link
          to="/admin/members"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition group"
          :class="isActiveRoute('/admin/members')
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
        >
          <Users class="w-4 h-4 text-slate-400 group-hover:text-white" :class="isActiveRoute('/admin/members') ? 'text-white' : ''" />
          <span class="flex-1">회원 / 바이어 관리</span>
        </router-link>

        <!-- 5. 공지 & 소식 설정 -->
        <router-link
          to="/admin/notices"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition group"
          :class="isActiveRoute('/admin/notices')
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
        >
          <Bell class="w-4 h-4 text-slate-400 group-hover:text-white" :class="isActiveRoute('/admin/notices') ? 'text-white' : ''" />
          <span class="flex-1">공지 & 소식 설정</span>
        </router-link>

        <!-- 6. 시스템 환경 설정 (환율/수수료) -->
        <router-link
          to="/admin/settings"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition group"
          :class="isActiveRoute('/admin/settings')
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
        >
          <Settings class="w-4 h-4 text-slate-400 group-hover:text-white" :class="isActiveRoute('/admin/settings') ? 'text-white' : ''" />
          <span class="flex-1">시스템 환경 설정</span>
        </router-link>
      </nav>

      <!-- Sidebar Bottom System Info -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/60 hidden md:block">
        <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>EUCHS Core</span>
          <span class="text-emerald-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>
    </aside>

    <!-- ============================================================ -->
    <!-- 2. RIGHT MAIN CONTAINER -->
    <!-- ============================================================ -->
    <div class="flex-1 flex flex-col min-w-0 bg-slate-50">

      <!-- TOP WHITE GNB HEADER -->
      <header v-if="!isWarehouseScan" class="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <!-- Left: Page Title & Breadcrumb -->
        <div class="flex items-center gap-3 min-w-0">
          <h1 class="text-sm sm:text-base font-black text-slate-900 truncate">
            {{ currentRouteTitle }}
          </h1>
          <span class="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <ChevronRight class="w-3.5 h-3.5" />
            <span>스마트 발주 & 창고 관리 콘솔</span>
          </span>
        </div>

        <!-- Right: Action Buttons (고객 사이트 바로가기, 로그아웃) -->
        <div class="flex items-center gap-2.5 shrink-0">
          <!-- Refresh Button -->
          <button
            type="button"
            @click="triggerGlobalRefresh"
            class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="데이터 새로고침"
          >
            <RefreshCw class="w-4 h-4" :class="isRefreshing ? 'animate-spin' : ''" />
          </button>

          <!-- Customer View Link -->
          <router-link
            to="/dashboard/orders"
            target="_blank"
            class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink class="w-3.5 h-3.5 text-slate-500" />
            <span class="hidden sm:inline">고객 사이트 바로가기</span>
            <span class="sm:hidden">고객화면</span>
          </router-link>

          <!-- Admin Logout -->
          <button
            type="button"
            @click="handleLogout"
            class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut class="w-3.5 h-3.5 text-rose-500" />
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      <!-- Main Body Container -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <router-view />
      </main>

    </div>

    <!-- ============================================================ -->
    <!-- 이우 창고 입고 스캔 플로팅 버튼                                -->
    <!-- QuickMenu.vue 카카오 버튼 패턴 참고 (동일 w-11/w-12 원형 스타일) -->
    <!-- /admin/warehouse-scan 페이지에서는 숨김 (중복 불필요)           -->
    <!-- ============================================================ -->
    <router-link
      v-if="!route.path.includes('/admin/warehouse-scan')"
      to="/admin/warehouse-scan"
      class="fixed right-3.5 sm:right-5 bottom-20 sm:bottom-24 z-40
             w-11 h-11 sm:w-12 sm:h-12 rounded-full
             bg-teal-600 hover:bg-teal-700 active:scale-95
             text-white shadow-lg hover:shadow-xl
             flex items-center justify-center
             transition-all duration-200
             border border-teal-500/40 hover:-translate-y-0.5"
      title="이우 창고 입고 스캔"
      aria-label="이우 창고 입고 스캔"
    >
      <i class="fas fa-barcode text-lg"></i>
    </router-link>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  Users,
  Bell,
  Settings,
  LogOut,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  RefreshCw
} from 'lucide-vue-next'
import { signOut } from '@/lib/auth'
import { getStoredOrders, fetchOrdersFromSupabase } from '@/utils/orderStorage'
import { normalizeOrderStatus } from '@/lib/orderPipeline'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()

const isMobileMenuOpen = ref(false)
const isRefreshing = ref(false)
const pendingOrdersCount = ref(0)
// 주문·발주 관리 서브메뉴 펼침 상태 — /admin/orders/* 경로 진입 시 자동 펼침
const isOrdersMenuOpen = ref(false)

// 창고 스캔 전용: 사이드바 + 상단 헤더 숨김 (이 페이지에만 적용)
const isWarehouseScan = computed(() => route.name === 'admin-warehouse-scan')


const currentRouteTitle = computed(() => {
  if (route.path === '/admin/orders/cancelled') return '취소·반품·교환 현황'
  if (route.path.includes('/admin/orders')) return '주문·발주 관리'
  if (route.path.includes('/admin/settlement')) return '예치금 & 정산 관리'
  if (route.path.includes('/admin/members')) return '회원 / 바이어 관리'
  if (route.path.includes('/admin/settings')) return '시스템 환경 설정'
  if (route.path.includes('/admin/notices')) return '공지 & 소식 설정'
  if (route.path.includes('/admin/warehouse-scan')) return '이우 창고 입고 스캔'
  return '스마트 종합 대시보드'
})

const isActiveRoute = (path) => {
  if (path === '/admin') {
    return route.path === '/admin' || route.path === '/admin/'
  }
  // exact match 우선, 그 다음 하위경로 포함 (단, /admin/orders는 /admin/orders/cancelled를 포함하지 않음)
  return route.path === path
}

// 주문 메뉴 그룹 active 여부 (파이프라인 + 취소현황 모두 포함)
const isOrdersGroupActive = computed(() => route.path.startsWith('/admin/orders'))

const updatePendingBadge = async () => {
  // 즉시: 로컬 캐시로 빠른 선표시 (normalize 적용)
  try {
    const cached = getStoredOrders();
    pendingOrdersCount.value = cached.filter(o => {
      const s = normalizeOrderStatus(o.status);
      return s === 'quote_pending' || s === 'quote_confirmed' || s === 'payment_pending';
    }).length;
  } catch (e) {
    pendingOrdersCount.value = 0;
  }
  // DB에서 정확한 값으로 교체 (백그라운드)
  try {
    const dbOrders = await fetchOrdersFromSupabase({ isAdmin: true });
    if (Array.isArray(dbOrders)) {
      pendingOrdersCount.value = dbOrders.filter(o => {
        const s = normalizeOrderStatus(o.status);
        return s === 'quote_pending' || s === 'quote_confirmed' || s === 'payment_pending';
      }).length;
    }
  } catch (e) {
    // 네트워크 실패 시 로컬 캐시 값 유지
  }
}

const triggerGlobalRefresh = () => {
  isRefreshing.value = true
  window.dispatchEvent(new CustomEvent('euchs-order-status-update'))
  window.dispatchEvent(new CustomEvent('euchs-warehouse-update'))
  window.dispatchEvent(new Event('storage'))
  setTimeout(() => {
    isRefreshing.value = false
  }, 600)
}

const handleLogout = async () => {
  if (confirm('관리자 세션을 종료하고 로그아웃하시겠습니까?')) {
    try {
      await signOut()
    } catch (e) {
      console.warn('Logout error:', e)
    }
    router.replace('/admin/login')
  }
}

const openFeatureNotice = (featureName) => {
  alert(`[${featureName}] 기능은 다음 패치에 추가 연동될 예정입니다.\n현재는 [주문·발주 관리] 및 [이우 창고 & 검수 WMS]를 이용하실 수 있습니다.`)
}

onMounted(async () => {
  // ★ Supabase SDK 세션 복원 대기 (이중 방어)
  if (isSupabaseConfigured()) {
    try { await supabase.auth.getSession() } catch (e) {}
  }
  updatePendingBadge()
  window.addEventListener('euchs-order-status-update', updatePendingBadge)
  window.addEventListener('storage', updatePendingBadge)
  // 현재 경로가 /admin/orders/* 이면 서브메뉴 자동 펼침
  if (route.path.startsWith('/admin/orders')) isOrdersMenuOpen.value = true
})

onUnmounted(() => {
  window.removeEventListener('euchs-order-status-update', updatePendingBadge)
  window.removeEventListener('storage', updatePendingBadge)
})
</script>

<style scoped>
.custom-sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}
.custom-sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-sidebar-scroll::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 4px;
}
</style>
