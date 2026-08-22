<template>
  <section id="services" class="py-16 sm:py-24 bg-[#0b0f19] text-white border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Section Title Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-400 uppercase mb-2">EUC Service</h2>
        <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          멋진일을 좋은 사람과 함께하는 EUC
        </p>
        <div class="mt-4 w-12 h-1 bg-blue-500 mx-auto rounded-full"></div>
      </div>

      <!-- 4 Cards Unified Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          v-for="card in serviceCards"
          :key="card.id"
          :class="['group relative rounded-3xl overflow-hidden shadow-xl shadow-black/60 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1.5 flex flex-col justify-between border border-slate-700/80 p-6 min-h-[380px] bg-[#141e33]', card.hoverBorder, card.hoverShadow]"
        >
          <!-- Background Media Layer -->
          <video 
            v-if="card.mediaUrl && isVideoMedia(card.mediaUrl)" 
            :src="card.mediaUrl" 
            autoplay 
            loop 
            muted 
            playsinline 
            webkit-playsinline 
            x5-playsinline
            preload="auto"
            class="absolute inset-0 w-full h-full object-cover z-0"
          ></video>
          <img 
            v-else-if="card.mediaUrl" 
            :src="card.mediaUrl" 
            :alt="card.title" 
            class="absolute inset-0 w-full h-full object-cover z-0" 
            loading="eager"
          />
          <div v-else class="absolute inset-0 bg-[#141e33] z-0"></div>

          <!-- Dark Overlay (z-10) -->
          <div class="absolute inset-0 bg-black/60 z-10 pointer-events-none"></div>

          <!-- Content Layer (z-20) -->
          <div class="relative z-20 space-y-3">
            <div class="flex items-center justify-between">
              <span :class="['inline-block px-2.5 py-1 text-white text-[11px] font-black rounded-full border shadow-sm backdrop-blur-sm', card.badgeColor]">
                {{ card.badge }}
              </span>
              <div :class="['w-10 h-10 rounded-xl border flex items-center justify-center text-lg shadow-sm', card.iconColor]">
                <i :class="card.icon"></i>
              </div>
            </div>
            <h3 :class="['text-lg font-black text-white leading-snug transition', card.hoverText]">
              {{ card.title }}
            </h3>
            <p class="text-xs text-slate-200 leading-relaxed font-medium">
              {{ card.desc }}
            </p>
          </div>

          <!-- Bottom Action Link (z-20) -->
          <div class="relative z-20 pt-4 border-t border-white/15 mt-5">
            <router-link 
              :to="card.link" 
              :class="['flex items-center justify-between text-xs font-bold transition group-hover:translate-x-1', card.hoverText]"
            >
              <span class="group-hover:text-white transition">{{ card.linkText }}</span>
              <span :class="['w-6 h-6 rounded-full border flex items-center justify-center text-xs text-white transition', card.arrowBg]">&rarr;</span>
            </router-link>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { currentSettings, fetchSiteSettings, isVideoMedia } from '../lib/settings'

const serviceMediaRocket = computed(() => currentSettings.value?.service_media?.card1 || currentSettings.value?.service_card_media_rocket || '')
const serviceMediaPurchasing = computed(() => currentSettings.value?.service_media?.card2 || currentSettings.value?.service_card_media_purchasing || '')
const serviceMediaTrade = computed(() => currentSettings.value?.service_media?.card3 || currentSettings.value?.service_card_media_trade || '')
const serviceMediaTour = computed(() => currentSettings.value?.service_media?.card4 || currentSettings.value?.service_card_media_tour || '')

const serviceCards = computed(() => [
  {
    id: 'rocket',
    title: '쿠팡 로켓그로스 & 밀크런',
    badge: '쿠팡 입고 대행',
    badgeColor: 'bg-red-500/80 border-red-300/40',
    icon: 'fas fa-rocket',
    iconColor: 'bg-red-500/20 border-red-400/40 text-red-400',
    hoverBorder: 'hover:border-red-500/80',
    hoverShadow: 'hover:shadow-red-500/20',
    hoverText: 'group-hover:text-red-300',
    arrowBg: 'bg-red-500/30 border-red-400/50 group-hover:bg-red-500',
    desc: '중국 생산지에서 쿠팡 물류창고 입고 규격에 맞춘 바코드 부착 및 직납 서비스',
    link: '/services/rocket-growth',
    linkText: '상담 문의하기',
    mediaUrl: serviceMediaRocket.value
  },
  {
    id: 'purchasing',
    title: '1688 / 타오바오 구매대행',
    badge: '1688 구매대행',
    badgeColor: 'bg-blue-600/80 border-blue-300/40',
    icon: 'fas fa-cart-shopping',
    iconColor: 'bg-blue-500/20 border-blue-400/40 text-blue-400',
    hoverBorder: 'hover:border-blue-400/80',
    hoverShadow: 'hover:shadow-blue-500/20',
    hoverText: 'group-hover:text-blue-300',
    arrowBg: 'bg-blue-500/30 border-blue-400/50 group-hover:bg-blue-600',
    desc: '중국에서 구매하기 어려운 상품을 현지 최저가로 안전하게 구매 및 검품 출고 대행',
    link: '/services/purchasing-agent',
    linkText: '구매대행 신청하기',
    mediaUrl: serviceMediaPurchasing.value
  },
  {
    id: 'trade',
    title: '무역대행 & 맞춤제조',
    badge: 'OEM / ODM',
    badgeColor: 'bg-emerald-600/80 border-emerald-300/40',
    icon: 'fas fa-industry',
    iconColor: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400',
    hoverBorder: 'hover:border-emerald-400/80',
    hoverShadow: 'hover:shadow-emerald-500/20',
    hoverText: 'group-hover:text-emerald-300',
    arrowBg: 'bg-emerald-500/30 border-emerald-400/50 group-hover:bg-emerald-600',
    desc: '중국 공장 발굴, 단가 네고, 금형 제작 및 시장조사까지 원스톱 무역업무 대행',
    link: '/services/trade-agent',
    linkText: '무역대행 문의하기',
    mediaUrl: serviceMediaTrade.value
  },
  {
    id: 'tour',
    title: '중국 이우 시장조사 투어',
    badge: '시장투어 풀패키지',
    badgeColor: 'bg-amber-500/80 border-amber-300/40',
    icon: 'fas fa-plane-departure',
    iconColor: 'bg-amber-500/20 border-amber-400/40 text-amber-400',
    hoverBorder: 'hover:border-amber-400/80',
    hoverShadow: 'hover:shadow-amber-500/20',
    hoverText: 'group-hover:text-amber-300',
    arrowBg: 'bg-amber-500/30 border-amber-400/50 group-hover:bg-amber-500',
    desc: '세계 최대 도매시장 푸텐시장 구역별 전문 가이드, 통역, 픽업 및 발주 연계',
    link: '/guide/market-tour',
    linkText: '투어 일정 & 견적',
    mediaUrl: serviceMediaTour.value
  }
])

const handleSettingsSync = (e) => {
  if (e?.detail) {
    currentSettings.value = { ...currentSettings.value, ...e.detail }
  }
}

onMounted(async () => {
  await fetchSiteSettings()
  if (typeof window !== 'undefined') {
    window.addEventListener('euchs-settings-updated', handleSettingsSync)
  }

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('euchs-settings-updated', handleSettingsSync)
    }
  })
})
</script>
