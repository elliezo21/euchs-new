<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">

    <!-- ============================================================ -->
    <!-- 1. TOP BAR (스튜디오 전용 — 기존 Header/QuickMenu/Footer 대신) -->
    <!-- ============================================================ -->
    <header class="bg-brand-navy text-slate-200 sticky top-0 z-30 border-b border-slate-800 select-none">
      <div class="h-14 px-4 sm:px-6 flex items-center gap-4">
        <!-- Brand Logo -->
        <router-link to="/studio" class="flex items-center gap-2.5 shrink-0 group" title="스튜디오 프로젝트 목록으로 이동">
          <div class="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center font-black text-white text-sm group-hover:scale-105 transition-transform">
            ST
          </div>
          <div class="leading-tight">
            <div class="font-black text-white text-sm tracking-tight">EUCHS STUDIO</div>
            <div class="text-[11px] text-slate-400 hidden sm:block">상세페이지 제작</div>
          </div>
        </router-link>

        <!-- Navigation (md 이상: 상단바 안) -->
        <nav class="hidden md:flex items-center gap-1 flex-1 min-w-0">
          <router-link
            v-for="item in menuItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition"
            :class="isActiveRoute(item)
              ? 'bg-brand-blue text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
        <div class="flex-1 md:hidden"></div>

        <!-- 사용량 자리 (Phase 1-3에서 채움 — 지금은 비워 둔다) -->
        <div class="hidden sm:flex items-center shrink-0" data-studio-usage-slot></div>

        <!-- Account Menu -->
        <div class="relative shrink-0" ref="accountMenuRef">
          <button
            type="button"
            @click="isAccountMenuOpen = !isAccountMenuOpen"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-bold text-slate-200 hover:bg-slate-800/80 transition"
            aria-label="계정 메뉴"
          >
            <UserCircle class="w-5 h-5" />
            <span class="hidden sm:inline max-w-[160px] truncate">{{ accountLabel }}</span>
            <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="isAccountMenuOpen ? 'rotate-180' : ''" />
          </button>
          <div
            v-if="isAccountMenuOpen"
            class="absolute right-0 mt-2 w-52 bg-white text-slate-700 rounded-xl border border-slate-200 shadow-lg py-1.5 z-40"
          >
            <router-link
              to="/"
              class="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold hover:bg-slate-50"
              @click="isAccountMenuOpen = false"
            >
              <ExternalLink class="w-4 h-4 text-slate-400" />
              <span>이유씨컴퍼니 메인으로</span>
            </router-link>
            <button
              type="button"
              @click="handleLogout"
              class="w-full flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut class="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation (md 미만: 상단바 아래 가로 스크롤 줄) -->
      <nav class="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition"
          :class="isActiveRoute(item)
            ? 'bg-brand-blue text-white'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'"
        >
          <component :is="item.icon" class="w-3.5 h-3.5" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </header>

    <!-- ============================================================ -->
    <!-- 2. MAIN BODY -->
    <!-- ============================================================ -->
    <main class="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
      <router-view />
    </main>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FolderOpen,
  Bookmark,
  BookA,
  Gauge,
  UserCircle,
  ChevronDown,
  ExternalLink,
  LogOut
} from 'lucide-vue-next'
import { currentUser, signOut } from '@/lib/auth'

const route = useRoute()
const router = useRouter()

const isAccountMenuOpen = ref(false)
const accountMenuRef = ref(null)

const menuItems = [
  { to: '/studio', label: '프로젝트', icon: FolderOpen, exact: false },
  { to: '/studio/assets', label: '저장값', icon: Bookmark, exact: true },
  { to: '/studio/glossary', label: '용어집', icon: BookA, exact: true },
  { to: '/studio/usage', label: '사용량', icon: Gauge, exact: true }
]

// '프로젝트'는 목록(/studio)과 편집기(/studio/p/:id) 둘 다에서 켜진다
const isActiveRoute = (item) => {
  if (item.to === '/studio') {
    return route.path === '/studio' || route.path === '/studio/' || route.path.startsWith('/studio/p/')
  }
  return route.path === item.to
}

const accountLabel = computed(() => currentUser.value?.email || '계정')

const handleLogout = async () => {
  isAccountMenuOpen.value = false
  // Header.vue handleSignOut과 같은 흐름: 보호 화면에 머문 채 로그아웃하면
  // 라우터 가드가 돌 기회가 없으므로 로그아웃 후 직접 이동시킨다.
  await signOut()
  alert('정상적으로 로그아웃되었습니다.')
  router.push('/')
}

const closeAccountMenuOnOutside = (e) => {
  if (accountMenuRef.value && !accountMenuRef.value.contains(e.target)) {
    isAccountMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeAccountMenuOnOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAccountMenuOnOutside)
})
</script>
