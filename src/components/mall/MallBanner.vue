<template>
  <!-- 롤링 배너 섹션 -->
  <div class="relative w-full overflow-hidden rounded-3xl shadow-sm" style="min-height: 180px;"
    @mouseenter="pauseRolling" @mouseleave="resumeRolling">

    <!-- 배너 없을 때 Fallback (기존 3-카드) -->
    <template v-if="banners.length === 0 && !isLoading">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        <!-- Banner 1: ODM / OEM 맞춤제작 전용관 -->
        <div class="md:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
          <div class="space-y-2 relative z-10">
            <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-black border border-indigo-400/40 uppercase">B2B CUSTOM MADE</span>
            <h3 class="text-lg sm:text-xl font-black text-white leading-tight">
              1688 공장 직거래<br />
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">OEM / ODM 제작관</span>
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">로고 인쇄, 커스텀 패키지, 금형 사출 제작까지 15년 전담 무역 MD가 1:1로 밀착 대행합니다.</p>
          </div>
          <div class="pt-4 relative z-10">
            <router-link to="/services/trade-agent" class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/30 text-center">
              <span>맞춤 제작 상담 신청</span>
              <i class="fas fa-arrow-right text-[10px]"></i>
            </router-link>
          </div>
        </div>

        <!-- Banner 2: 메인 1688 프로모션 배너 -->
        <div class="md:col-span-5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div class="space-y-2 relative z-10">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black">
              <i class="fas fa-star text-yellow-300"></i>
              <span>2026 베스트 소싱 기획전</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              중국 최고 검증 공장의<br />트렌드 신상품 특가전
            </h3>
          </div>
          <div class="pt-4 flex flex-wrap items-center gap-1.5 relative z-10">
            <button v-for="chip in fallbackChips" :key="chip" type="button" @click="$emit('search', chip)"
              class="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-rose-600 text-xs font-bold backdrop-blur-md transition shadow-sm">
              {{ chip }} &rarr;
            </button>
          </div>
        </div>

        <!-- Banner 3: 바이어 퀵 박스 -->
        <div class="md:col-span-3 bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-3">
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold text-gray-500 uppercase">BUYER QUICK HUB</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200/80 space-y-1">
              <div class="text-[11px] text-gray-500">예치금 지갑 잔액</div>
              <div class="text-base font-black text-emerald-600 font-mono">₩ {{ formatKrw(depositBalance) }}</div>
            </div>
          </div>
          <div>
            <router-link to="/dashboard" class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center shadow-sm">
              <i class="fas fa-truck-loading text-amber-400"></i>
              <span>발주 &amp; 배송관리 마이페이지</span>
            </router-link>
          </div>
        </div>
      </div>
    </template>

    <!-- 스켈레톤 로딩 -->
    <div v-else-if="isLoading" class="h-44 bg-gray-200 animate-pulse rounded-3xl"></div>

    <!-- 롤링 배너 (DB 데이터 있을 때) -->
    <template v-else>
      <div class="relative h-48 sm:h-56 md:h-64 w-full overflow-hidden rounded-3xl">
        <!-- 배너 슬라이드 -->
        <transition-group name="banner-fade" tag="div" class="relative w-full h-full">
          <a
            v-for="(banner, idx) in banners"
            :key="banner.id"
            v-show="currentIndex === idx"
            :href="banner.link_url || '#'"
            :target="banner.link_type === 'external' ? '_blank' : '_self'"
            :rel="banner.link_type === 'external' ? 'noopener noreferrer' : undefined"
            @click.prevent="handleBannerClick(banner)"
            class="absolute inset-0 w-full h-full block cursor-pointer"
          >
            <img
              :src="banner.image_url"
              :alt="banner.title || '배너'"
              class="w-full h-full object-cover"
              loading="lazy"
              @error="handleImgError"
            />
            <!-- 오버레이 그라데이션 -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
            <!-- 자막 -->
            <div v-if="banner.subtitle" class="absolute bottom-4 left-5 right-12 z-10">
              <p class="text-white text-sm sm:text-base font-bold drop-shadow-md line-clamp-2">{{ banner.subtitle }}</p>
            </div>
          </a>
        </transition-group>

        <!-- 이전/다음 화살표 -->
        <button v-if="banners.length > 1" @click.stop="prev"
          class="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition text-sm">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button v-if="banners.length > 1" @click.stop="next"
          class="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition text-sm">
          <i class="fas fa-chevron-right"></i>
        </button>

        <!-- 인디케이터 도트 -->
        <div v-if="banners.length > 1" class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          <button
            v-for="(_, idx) in banners"
            :key="idx"
            @click.stop="goTo(idx)"
            :class="['w-2 h-2 rounded-full transition-all duration-300', currentIndex === idx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80']"
          ></button>
        </div>

        <!-- 배너 카운터 -->
        <div class="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full bg-black/30 text-white text-[10px] font-bold backdrop-blur-sm">
          {{ currentIndex + 1 }} / {{ banners.length }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'

const props = defineProps({
  depositBalance: { type: Number, default: 0 }
})
const emit = defineEmits(['search'])
const router = useRouter()

const banners = ref([])
const isLoading = ref(true)
const currentIndex = ref(0)
const fallbackChips = ['텀블러', '블라우스', '셔츠', '숄더백', '실내화']

let rollingTimer = null

// 배너 로드
async function loadBanners() {
  isLoading.value = true
  try {
    const now = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('display_order', { ascending: true })

    if (!error && Array.isArray(data) && data.length > 0) {
      banners.value = data
    }
  } catch (e) {
    console.warn('[MallBanner] 배너 로드 실패:', e)
  } finally {
    isLoading.value = false
    if (banners.value.length > 1) startRolling()
  }
}

function startRolling() {
  stopRolling()
  rollingTimer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % banners.value.length
  }, 5000)
}

function stopRolling() {
  if (rollingTimer) { clearInterval(rollingTimer); rollingTimer = null }
}

function pauseRolling() { stopRolling() }
function resumeRolling() { if (banners.value.length > 1) startRolling() }
function next() { currentIndex.value = (currentIndex.value + 1) % banners.value.length }
function prev() { currentIndex.value = (currentIndex.value - 1 + banners.value.length) % banners.value.length }
function goTo(idx) { currentIndex.value = idx }

function handleBannerClick(banner) {
  if (!banner.link_url) return
  if (banner.link_type === 'external') {
    window.open(banner.link_url, '_blank', 'noopener,noreferrer')
  } else {
    router.push(banner.link_url)
  }
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80'
}

function formatKrw(v) {
  if (!v || isNaN(v)) return '0'
  return Math.floor(Number(v)).toLocaleString('ko-KR')
}

onMounted(loadBanners)
onUnmounted(stopRolling)
</script>

<style scoped>
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity 0.5s ease;
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
}
</style>
