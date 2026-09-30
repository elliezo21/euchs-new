<template>
  <div class="studio-root min-h-screen md:flex">
    <!-- ============================================================ -->
    <!-- 모바일 상단 바 (md 미만): 로고 + 햄버거                          -->
    <!-- ============================================================ -->
    <header v-if="!isFullScreen" class="md:hidden sticky top-0 z-30 h-14 px-4 flex items-center gap-3 st-surface st-border-b">
      <router-link :to="{ name: 'studio-landing' }" class="flex items-center gap-2" @click="drawerOpen = false">
        <span class="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center st-logo-mark">
          <Sparkles class="w-4 h-4" :stroke-width="2" />
        </span>
        <span class="text-[15px] font-extrabold st-ink">EUCHS Studio</span>
        <span v-if="STUDIO_BETA" class="st-badge st-badge-accent" data-beta-badge>{{ BETA_BADGE }}</span>
      </router-link>
      <button type="button" class="st-icon-btn ml-auto" aria-label="메뉴 열기" @click="drawerOpen = true">
        <Menu class="w-5 h-5" :stroke-width="2" />
      </button>
    </header>

    <!-- 모바일 드로어 뒤 어둡게 -->
    <div v-if="drawerOpen && !isFullScreen" class="md:hidden fixed inset-0 z-40 st-drawer-scrim" @click="drawerOpen = false" />

    <!-- ============================================================ -->
    <!-- 사이드바 (md 이상 고정 / md 미만 드로어)                          -->
    <!-- ============================================================ -->
    <aside
      v-if="!isFullScreen"
      class="st-surface st-border-r flex flex-col w-[248px] shrink-0 px-4 py-5
             fixed inset-y-0 left-0 z-50 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0"
      :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center">
        <router-link :to="{ name: 'studio-landing' }" class="flex items-center gap-2.5" @click="drawerOpen = false">
          <span class="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center st-logo-mark">
            <Sparkles class="w-4 h-4" :stroke-width="2" />
          </span>
          <span class="leading-tight">
            <span class="block text-[15px] font-extrabold st-ink">EUCHS Studio <span v-if="STUDIO_BETA" class="st-badge st-badge-accent align-middle" data-beta-badge>{{ BETA_BADGE }}</span></span>
            <span class="block text-[11px] st-muted">상세페이지 제작</span>
          </span>
        </router-link>
        <!-- 반응형 숨김은 감싸는 요소에 둔다 (st-* 클래스의 display가 Tailwind hidden보다 우선이라) -->
        <span class="ml-auto md:hidden">
          <button type="button" class="st-icon-btn" aria-label="메뉴 닫기" @click="drawerOpen = false">
            <X class="w-5 h-5" :stroke-width="2" />
          </button>
        </span>
      </div>

      <!-- [새로 만들기] = 작업 시작 — 관문(studioGate): 로그인 전 → 로그인 창 · 주문 없음 → 잠금 창 · 있음 → 내 작업 #start -->
      <button type="button" class="st-btn st-btn-primary st-btn-lg st-btn-block mt-6" data-studio-nav-new @click="startNew">
        <Plus class="w-4 h-4" :stroke-width="2.5" /> 새로 만들기
      </button>

      <nav class="mt-5 flex flex-col gap-0.5">
        <router-link
          v-for="item in menuItems"
          :key="item.label"
          :to="{ name: item.name }"
          class="st-nav-item"
          :class="{ 'is-active': isActive(item) }"
          @click="drawerOpen = false"
        >
          <component :is="item.icon" class="w-[18px] h-[18px]" :stroke-width="2" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="flex-1" />

      <!-- 이유씨 고객 혜택 -->
      <div class="st-border rounded-[12px] p-3.5">
        <div class="text-[13px] font-extrabold st-ink">이유씨 고객 혜택</div>
        <p class="mt-1 text-[12px] leading-relaxed st-ink-2">스튜디오는 이유씨컴퍼니 고객에게 무료예요. 만든 상품은 바로 이유씨로 주문할 수 있어요.</p>
        <p v-if="STUDIO_BETA" class="mt-1 text-[12px] leading-relaxed st-ink-2" data-beta-note>{{ BETA_NOTE }}</p>
        <router-link to="/mall" class="mt-2 inline-block text-[12px] st-link">이유씨몰로 가기 →</router-link>
      </div>

      <!-- 설정 (계정 영역 위) — 남은 탭(저장값·용어집)에 아직 쓸 기능이 없어 메뉴에서만 숨긴다 (2026-09-30). 주소 /studio/settings…와 이동 규칙은 그대로.
           탭이 생기면 SHOW_SETTINGS_NAV를 true로 -->
      <router-link
        v-if="SHOW_SETTINGS_NAV"
        :to="{ name: 'studio-settings' }"
        class="st-nav-item mt-3"
        :class="{ 'is-active': isSettings }"
        data-studio-nav-settings
        @click="drawerOpen = false"
      >
        <Settings class="w-[18px] h-[18px]" :stroke-width="2" />
        <span>설정</span>
      </router-link>

      <!-- 계정 -->
      <div class="mt-3 pt-3 st-border-t relative" ref="accountMenuRef">
        <template v-if="currentUser">
          <button type="button" class="w-full flex items-center gap-2.5 rounded-[10px] p-1.5 st-hover-soft" @click="accountOpen = !accountOpen">
            <span class="st-avatar">{{ initial }}</span>
            <span class="min-w-0 flex-1 text-left text-[13px] font-semibold st-ink-2 truncate">{{ currentUser.email }}</span>
            <ChevronDown class="w-4 h-4 st-muted transition-transform" :class="accountOpen ? 'rotate-180' : ''" :stroke-width="2" />
          </button>
          <div v-if="accountOpen" class="absolute bottom-full left-0 right-0 mb-2 st-card st-shadow-float py-1">
            <router-link :to="{ name: 'studio-usage' }" class="flex items-center gap-2 px-3 py-2 text-[14px] font-semibold st-ink-2 st-hover-soft" @click="closeMenus">
              <Gauge class="w-4 h-4" :stroke-width="2" /> 사용량
            </router-link>
            <router-link to="/" class="flex items-center gap-2 px-3 py-2 text-[14px] font-semibold st-ink-2 st-hover-soft" @click="closeMenus">
              <ExternalLink class="w-4 h-4" :stroke-width="2" /> 이유씨컴퍼니 메인으로
            </router-link>
            <button type="button" class="w-full flex items-center gap-2 px-3 py-2 text-[14px] font-semibold st-danger-text st-hover-soft" @click="handleLogout">
              <LogOut class="w-4 h-4" :stroke-width="2" /> 로그아웃
            </button>
          </div>
        </template>
        <button v-else type="button" class="st-btn st-btn-block" @click="openLogin">로그인</button>
      </div>
    </aside>

    <!-- ============================================================ -->
    <!-- 본문                                                          -->
    <!-- ============================================================ -->
    <main class="flex-1 min-w-0">
      <router-view />
    </main>

    <!-- 스튜디오 전체 공개(all): 로그인했지만 주문 고객이 아닐 때 (라우터 가드 3-2 · 작업 시작 관문 studioGate → studioNoAccessOpen) -->
    <StudioModal :open="studioNoAccessOpen" :title="STUDIO_NO_ACCESS_TITLE" @close="studioNoAccessOpen = false">
      <span data-studio-no-access>이유씨 몰에서 결제까지 마친 주문이 1건 이상 있으면 바로 작업을 시작할 수 있어요.</span>
      <template #actions>
        <button type="button" class="st-btn" @click="studioNoAccessOpen = false">닫기</button>
        <button type="button" class="st-btn st-btn-primary" data-studio-no-access-mall @click="goMall">이유씨 몰에서 사입하기</button>
      </template>
    </StudioModal>

    <!-- 기존 alert() 문구를 그대로 화면 안 모달로 -->
    <StudioModal :open="logoutModal" title="로그아웃" @close="logoutModal = false">
      정상적으로 로그아웃되었습니다.
      <template #actions>
        <button type="button" class="st-btn st-btn-primary" @click="logoutModal = false">확인</button>
      </template>
    </StudioModal>
  </div>
</template>

<script setup>
import '@/styles/studio-tokens.css'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Home, FolderOpen, LayoutTemplate, Plus, Sparkles, Menu, X,
  ChevronDown, Gauge, ExternalLink, LogOut, Settings, Store,
} from 'lucide-vue-next'
import { currentUser, signOut, openLoginModal } from '@/lib/auth'
import StudioModal from '@/components/studio/StudioModal.vue'
import { STUDIO_BETA, BETA_BADGE, BETA_NOTE } from '@/lib/studioBeta'
import { studioNoAccessOpen, STUDIO_NO_ACCESS_TITLE } from '@/lib/studioAccess'
import { studioGate } from '@/lib/studioGate'

const route = useRoute()
const router = useRouter()

// 고르기·편집기는 전체 화면 (사이드바 숨김). 랜딩(/studio)도 자기 상단 바를 쓰는 전체 화면
const FULL_SCREEN = new Set(['studio-new', 'studio-editor', 'studio-landing'])
const isFullScreen = computed(() => FULL_SCREEN.has(route.name))

const menuItems = [
  { name: 'studio-landing', label: '스튜디오 소개', icon: Home },
  { name: 'studio-projects', label: '내 작업', icon: FolderOpen, also: ['studio-editor', 'studio-new'] },
  { name: 'studio-templates', label: '템플릿', icon: LayoutTemplate },
  // 판매처 — 만든 상품을 보내는 곳 (보내기·보낸 상품·기본 설정·연결 탭). 탭 어디에 있어도 켜짐
  { name: 'studio-channels', label: '판매처', icon: Store, prefix: 'studio-channels' },
]
// 한 번 맞춰 두는 것(저장값·용어집)은 아래쪽 [설정] 하나로 — 메인 메뉴는 매일 쓰는 작업만
const isActive = item => route.name === item.name || (item.also || []).includes(route.name) || (!!item.prefix && String(route.name || '').startsWith(item.prefix))
const isSettings = computed(() => String(route.name || '').startsWith('studio-settings'))
const SHOW_SETTINGS_NAV = false // [설정] 메뉴 — 남은 탭에 아직 쓸 기능이 없어 숨김 (주소는 그대로 열린다)

const drawerOpen = ref(false)
const accountOpen = ref(false)
const accountMenuRef = ref(null)
const logoutModal = ref(false)
const initial = computed(() => (currentUser.value?.email || '?').charAt(0).toUpperCase())

watch(() => route.fullPath, () => { drawerOpen.value = false })

function closeMenus() {
  accountOpen.value = false
  drawerOpen.value = false
}

function goMall() {
  studioNoAccessOpen.value = false
  router.push('/mall')
}

// 로그인하고 돌아오면 내 작업(?start=new)이 관문을 한 번 더 거쳐 이어서 연다 (StudioHomeView)
async function startNew() {
  drawerOpen.value = false
  if (await studioGate('/studio/projects?start=new#start')) router.push({ name: 'studio-projects', hash: '#start' })
}

function openLogin() {
  drawerOpen.value = false
  openLoginModal('login')
}

const handleLogout = async () => {
  closeMenus()
  // 보호 화면에 머문 채 로그아웃하면 라우터 가드가 돌 기회가 없으므로 직접 대문으로 보낸다
  await signOut()
  router.push({ name: 'studio-landing' })
  logoutModal.value = true
}

const closeAccountMenuOnOutside = (e) => {
  if (accountMenuRef.value && !accountMenuRef.value.contains(e.target)) accountOpen.value = false
}

onMounted(() => document.addEventListener('click', closeAccountMenuOnOutside))
onUnmounted(() => document.removeEventListener('click', closeAccountMenuOnOutside))
</script>
