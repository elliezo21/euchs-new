<template>
  <section class="py-14 sm:py-20 bg-slate-100 border-t border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- 3-Column Community Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        <!-- Column 1: Exchange Rate Widget (4 cols) -->
        <div class="lg:col-span-4 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div>
            <!-- Header -->
            <div class="text-center">
              <div class="inline-block px-3 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2">
                Real-time Rate
              </div>
              <h3 class="text-2xl font-black tracking-widest mb-1">환 율 안 내</h3>
              <p class="text-xs text-blue-100 leading-tight">
                국제시장 평균환율(미드트레이드) 기준 실시간 변동 금액<br>(중국 CNY 1위안)
              </p>
              <div class="my-5 border-t border-white/30 w-4/5 mx-auto"></div>

              <!-- Rates display -->
              <div class="space-y-4">
                <!-- 1. 국제고시환율 -->
                <div class="bg-black/15 backdrop-blur-sm rounded-xl p-3.5 flex items-center justify-between border border-white/15">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">🇨🇳</span>
                    <span class="text-sm font-semibold">국제고시환율</span>
                  </div>
                  <span class="text-xl font-extrabold text-yellow-300">
                    {{ liveRate ? `${liveRate}원` : '조회 중...' }}
                  </span>
                </div>

                <!-- 2. 이유씨 적용 환율 (모드별 동적 반영) -->
                <div class="bg-black/25 backdrop-blur-sm rounded-xl p-3.5 flex items-center justify-between border border-white/20 shadow-inner">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">💱</span>
                    <div class="text-left">
                      <span class="text-sm font-semibold block">이유씨환율</span>
                      <span class="text-[10px] text-blue-200 block">{{ rateModeDesc }}</span>
                    </div>
                  </div>
                  <span class="text-2xl font-black text-white">
                    {{ customRate }}원
                  </span>
                </div>
              </div>
            </div>

            <!-- Calculator Link Button -->
            <div class="mt-4">
              <router-link 
                to="/tools/calculator" 
                class="w-full py-2.5 px-4 bg-white/20 hover:bg-white text-white hover:text-blue-900 font-bold rounded-xl border border-white/30 text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <i class="fas fa-calculator"></i>
                <span>실시간 무역/관부가세 계산기 &rarr;</span>
              </router-link>
            </div>

            <!-- Bottom refresh note -->
            <div class="mt-4 pt-3 border-t border-white/20 text-center text-[11px] text-blue-100 flex items-center justify-center gap-1.5">
              <i class="fas fa-arrows-rotate text-xs animate-spin-slow"></i>
              <span>10분마다 실시간 환율 자동 동기화</span>
            </div>
          </div>
        </div>

        <!-- Column 2: Notice List (4 cols) -->
        <div class="lg:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <div class="flex items-center gap-2">
                <i class="fas fa-bullhorn text-blue-600"></i>
                <h4 class="font-bold text-gray-900 text-sm">공지사항 & 주요안내</h4>
              </div>
              <router-link to="/community/notice" class="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
                더보기 <i class="fas fa-plus text-[10px]"></i>
              </router-link>
            </div>

            <ul class="space-y-3.5 text-xs">
              <li 
                v-for="(notice, index) in notices" 
                :key="index"
                @click="openNotice(notice)"
                class="group cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition"
              >
                <div class="flex items-center justify-between text-gray-400 text-[11px] mb-1">
                  <span class="px-1.5 py-0.5 bg-blue-50 text-blue-600 font-semibold rounded text-[10px]">
                    공지
                  </span>
                  <span>{{ notice.date }}</span>
                </div>
                <h5 class="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition truncate">
                  {{ notice.title }}
                </h5>
                <p class="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                  {{ notice.desc }}
                </p>
              </li>
            </ul>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-100 text-center">
            <router-link 
              to="/community/notice" 
              class="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
            >
              공지사항 전체보기 <i class="fas fa-arrow-right text-[10px]"></i>
            </router-link>
          </div>
        </div>

        <!-- Column 3: Quick Service Grid (4 cols) -->
        <div class="lg:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <div class="flex items-center gap-2">
                <i class="fas fa-bolt text-amber-500"></i>
                <h4 class="font-bold text-gray-900 text-sm">빠른 서비스 바로가기</h4>
              </div>
            </div>

            <!-- 6 Quick Service Grid Icons -->
            <div class="grid grid-cols-3 gap-3">
              <router-link 
                to="/company" 
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 transition mb-2">
                  <i class="fas fa-building text-sm"></i>
                </div>
                <span class="text-[11px] font-semibold">회사소개</span>
              </router-link>

              <a 
                href="http://pf.kakao.com/_xmQWsK/chat" 
                target="_blank"
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-yellow-50 text-gray-700 hover:text-amber-700 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-yellow-500 group-hover:scale-110 transition mb-2">
                  <i class="fas fa-comments text-sm"></i>
                </div>
                <span class="text-[11px] font-semibold">1:1 문의</span>
              </a>

              <router-link 
                to="/community/faq" 
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition mb-2">
                  <i class="fas fa-circle-question text-sm"></i>
                </div>
                <span class="text-[11px] font-semibold">자주묻는질문</span>
              </router-link>

              <router-link 
                to="/services/purchasing-agent" 
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-teal-600 group-hover:scale-110 transition mb-2">
                  <i class="fas fa-cart-shopping text-sm"></i>
                </div>
                <span class="text-[11px] font-semibold">구매대행</span>
              </router-link>

              <router-link 
                to="/services/trade-agent" 
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 group-hover:scale-110 transition mb-2">
                  <i class="fas fa-ship text-sm"></i>
                </div>
                <span class="text-[11px] font-semibold">무역대행</span>
              </router-link>

              <router-link 
                to="/guide/market-tour" 
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-purple-600 group-hover:scale-110 transition mb-2">
                  <i class="fas fa-magnifying-glass-location text-sm"></i>
                </div>
                <span class="text-[11px] font-semibold">시장투어/조사</span>
              </router-link>
            </div>

            <div class="mt-4 bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 text-center">
              <p class="text-xs text-blue-900 font-semibold">고객센터 실시간 유선 상담</p>
              <p class="text-sm font-black text-blue-600 mt-0.5">010-9373-1214</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchSiteSettings } from '@/lib/settings'

const liveRate = ref(null)
const customRate = ref('195.00')
const rateMode = ref('manual')
const rateMargin = ref(1.5)

const rateModeDesc = computed(() => {
  if (rateMode.value === 'auto_margin' || rateMode.value === 'auto') {
    return `(실시간 + ${rateMargin.value}원 마진)`
  }
  return `(공식 고정 환율)`
})

const notices = [
  {
    date: '2024.04',
    title: '2024년 중국노동절 휴무일정 안내해드립니다.',
    desc: '중국 현지 세관 및 물류 배송사 휴무에 따른 출고 마감 일정'
  },
  {
    date: '2024.04',
    title: '이유씨컴퍼니 중국출장 시장조사 정기출발 합니다.',
    desc: '이우 및 광저우 도매시장 동행 및 맞춤 사입 조사 일정'
  },
  {
    date: '2024.04',
    title: '2024년 봄 이유씨컴퍼니 운임관세통관료 할인이벤트',
    desc: '신규 사업자 회원 대상 특송 운임 및 통관 지원 프로모션'
  }
]

const fetchExchangeRate = async () => {
  let liveNum = 195.0
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY')
    if (!res.ok) throw new Error('환율 API 호출 실패')
    const data = await res.json()
    if (data && data.rates && data.rates.KRW) {
      liveNum = Number(data.rates.KRW.toFixed(2))
      liveRate.value = liveNum.toFixed(2)
    }
  } catch (err) {
    console.error('환율 조회 에러:', err)
    liveRate.value = '195.50' // fallback
    liveNum = 195.5
  }

  // 관리자 설정 환율 불러오기 및 모드별 분기 적용
  try {
    const settings = await fetchSiteSettings()
    if (settings) {
      rateMode.value = settings.exchange_rate_mode || 'manual'
      rateMargin.value = Number(settings.rate_margin) || 1.5

      if (rateMode.value === 'auto_margin' || rateMode.value === 'auto') {
        // 실시간 + 마진
        const calculated = Number((liveNum + rateMargin.value).toFixed(2))
        customRate.value = calculated.toFixed(2)
      } else {
        // 수동 고정 환율
        const fixed = Number(settings.exchange_rate) || 195.0
        customRate.value = fixed.toFixed(2)
      }
    }
  } catch (e) {
    console.warn('CommunitySection settings fetch fallback:', e)
  }
}

const openNotice = (notice) => {
  alert(`[공지사항] ${notice.title}\n\n상세 내용 및 추가 문의는 고객센터 및 카카오톡으로 안내해 드립니다.`)
}

// 탭 활성화 시 즉시 최신 설정 동기화
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchExchangeRate()
  }
}

onMounted(() => {
  fetchExchangeRate()
  const intervalId = setInterval(fetchExchangeRate, 10 * 60 * 1000)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', fetchExchangeRate)

  onUnmounted(() => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', fetchExchangeRate)
  })
})
</script>
