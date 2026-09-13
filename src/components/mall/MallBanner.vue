<template>
  <!-- 배너 영역: 왼쪽 칸 / 오른쪽 칸 / BUYER QUICK HUB 3칸 고정 레이아웃 -->
  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">

    <!-- 왼쪽 칸 (col-span-4): left 슬롯 배너 롤링 or fallback -->
    <div class="md:col-span-4 rounded-3xl overflow-hidden relative"
      @mouseenter="pauseLeft" @mouseleave="resumeLeft">

      <template v-if="leftBanners.length > 0 && !isLoading">
        <div class="relative h-full min-h-[180px]">
          <transition-group name="banner-fade" tag="div" class="relative w-full h-full">
            <div
              v-for="(banner, idx) in leftBanners" :key="banner.id"
              v-show="leftIndex === idx"
              class="absolute inset-0 flex flex-col justify-between p-5 sm:p-6 text-white"
              :style="banner.image_url
                ? `background: url('${banner.image_url}') center/cover no-repeat;`
                : 'background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);'"
            >
              <div v-if="banner.image_url" class="absolute inset-0 bg-gradient-to-br from-black/60 to-black/30 pointer-events-none"></div>
              <div v-else class="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
              <div class="space-y-2 relative z-10">
                <span v-if="banner.label" class="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-black border border-indigo-400/40 uppercase inline-block">
                  {{ banner.label }}
                </span>
                <h3 v-if="banner.heading" class="text-lg sm:text-xl font-black text-white leading-tight">
                  <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">{{ banner.heading }}</span>
                </h3>
                <p v-if="banner.description" class="text-xs text-slate-300 leading-relaxed line-clamp-2">{{ banner.description }}</p>
              </div>
              <div class="pt-4 relative z-10">
                <component
                  :is="isExternal(banner.button_url || banner.link_url) ? 'a' : 'router-link'"
                  v-if="banner.button_text || banner.button_url"
                  :to="!isExternal(banner.button_url || banner.link_url) ? (banner.button_url || banner.link_url) : undefined"
                  :href="isExternal(banner.button_url || banner.link_url) ? (banner.button_url || banner.link_url) : undefined"
                  :target="isExternal(banner.button_url || banner.link_url) ? '_blank' : undefined"
                  class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/30 text-center"
                >
                  <span>{{ banner.button_text || '자세히 보기' }}</span>
                  <i class="fas fa-arrow-right text-[10px]"></i>
                </component>
              </div>
            </div>
          </transition-group>
          <div v-if="leftBanners.length > 1" class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            <button v-for="(_, i) in leftBanners" :key="i" @click.stop="leftIndex = i"
              :class="['w-2 h-2 rounded-full transition-all duration-300 cursor-pointer', leftIndex === i ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80']">
            </button>
          </div>
        </div>
      </template>

      <div v-else-if="isLoading" class="h-full min-h-[180px] bg-gradient-to-br from-slate-800 to-indigo-950 animate-pulse rounded-3xl"></div>

      <!-- Fallback: OEM 다크 카드 -->
      <div v-else class="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group h-full min-h-[180px]">
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
    </div>

    <!-- 오른쪽 칸 (col-span-5): right 슬롯 배너 롤링 + 칩 버튼 항상 유지 -->
    <div class="md:col-span-5 rounded-3xl overflow-hidden relative"
      @mouseenter="pauseRight" @mouseleave="resumeRight">

      <template v-if="rightBanners.length > 0 && !isLoading">
        <div class="relative h-full min-h-[180px]">
          <transition-group name="banner-fade" tag="div" class="relative w-full h-full">
            <div
              v-for="(banner, idx) in rightBanners" :key="banner.id"
              v-show="rightIndex === idx"
              class="absolute inset-0 flex flex-col justify-between p-5 sm:p-6 text-white"
              :style="banner.image_url
                ? `background: url('${banner.image_url}') center/cover no-repeat;`
                : 'background: linear-gradient(90deg, #f43f5e 0%, #f97316 60%, #f59e0b 100%);'"
            >
              <div v-if="banner.image_url" class="absolute inset-0 bg-gradient-to-br from-rose-500/70 to-amber-500/50 pointer-events-none"></div>
              <div class="space-y-2 relative z-10">
                <div v-if="banner.label" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black">
                  <i class="fas fa-star text-yellow-300"></i>
                  <span>{{ banner.label }}</span>
                </div>
                <h3 v-if="banner.heading" class="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">{{ banner.heading }}</h3>
                <p v-if="banner.description" class="text-xs text-white/80 leading-relaxed line-clamp-2">{{ banner.description }}</p>
              </div>
              <!-- 칩 버튼 항상 유지 -->
              <div class="pt-4 flex flex-wrap items-center gap-1.5 relative z-10">
                <button v-for="chip in promoChips" :key="chip" type="button" @click="$emit('search', chip)"
                  class="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-rose-600 text-xs font-bold backdrop-blur-md transition shadow-sm">
                  {{ chip }} →
                </button>
              </div>
            </div>
          </transition-group>
          <div v-if="rightBanners.length > 1" class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            <button v-for="(_, i) in rightBanners" :key="i" @click.stop="rightIndex = i"
              :class="['w-2 h-2 rounded-full transition-all duration-300 cursor-pointer', rightIndex === i ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80']">
            </button>
          </div>
        </div>
      </template>

      <div v-else-if="isLoading" class="h-full min-h-[180px] bg-gradient-to-r from-rose-400 to-amber-400 animate-pulse rounded-3xl"></div>

      <!-- Fallback: 주황 프로모 카드 -->
      <div v-else class="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[180px]">
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
          <button v-for="chip in promoChips" :key="chip" type="button" @click="$emit('search', chip)"
            class="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-rose-600 text-xs font-bold backdrop-blur-md transition shadow-sm">
            {{ chip }} →
          </button>
        </div>
      </div>
    </div>

    <!-- BUYER QUICK HUB (col-span-3): 항상 고정, DB 배너와 무관 -->
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

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../lib/supabase'

const props = defineProps({
  depositBalance: { type: Number, default: 0 }
})
const emit = defineEmits(['search'])

const promoChips = ['텀블러', '블라우스', '셔츠', '숄더백', '실내화']

const allBanners  = ref([])
const isLoading   = ref(true)

const leftBanners  = computed(() => allBanners.value.filter(b => b.slot === 'left'))
const rightBanners = computed(() => allBanners.value.filter(b => b.slot === 'right'))

const leftIndex  = ref(0)
const rightIndex = ref(0)
let leftTimer  = null
let rightTimer = null

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
    if (!error && Array.isArray(data)) allBanners.value = data
  } catch (e) {
    console.warn('[MallBanner] 배너 로드 실패:', e)
  } finally {
    isLoading.value = false
    setTimeout(() => {
      if (leftBanners.value.length  > 1) startLeftRolling()
      if (rightBanners.value.length > 1) startRightRolling()
    }, 0)
  }
}

function startLeftRolling()  { stopLeftRolling();  leftTimer  = setInterval(() => { leftIndex.value  = (leftIndex.value  + 1) % leftBanners.value.length  }, 5000) }
function stopLeftRolling()   { if (leftTimer)  { clearInterval(leftTimer);  leftTimer  = null } }
function pauseLeft()         { stopLeftRolling() }
function resumeLeft()        { if (leftBanners.value.length  > 1) startLeftRolling() }

function startRightRolling() { stopRightRolling(); rightTimer = setInterval(() => { rightIndex.value = (rightIndex.value + 1) % rightBanners.value.length }, 5000) }
function stopRightRolling()  { if (rightTimer) { clearInterval(rightTimer); rightTimer = null } }
function pauseRight()        { stopRightRolling() }
function resumeRight()       { if (rightBanners.value.length > 1) startRightRolling() }

function isExternal(url) { return url ? url.startsWith('http://') || url.startsWith('https://') : false }

function formatKrw(v) {
  if (!v || isNaN(v)) return '0'
  return Math.floor(Number(v)).toLocaleString('ko-KR')
}

onMounted(loadBanners)
onUnmounted(() => { stopLeftRolling(); stopRightRolling() })
</script>

<style scoped>
.banner-fade-enter-active, .banner-fade-leave-active { transition: opacity 0.5s ease; }
.banner-fade-enter-from, .banner-fade-leave-to { opacity: 0; }
</style>