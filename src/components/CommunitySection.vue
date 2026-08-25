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
                v-for="(notice, index) in displayNotices" 
                :key="notice.id || index"
                @click="openNotice(notice)"
                class="group cursor-pointer p-2.5 rounded-xl hover:bg-blue-50/60 transition border border-transparent hover:border-blue-100"
              >
                <div class="flex items-center justify-between text-gray-400 text-[11px] mb-1">
                  <div class="flex items-center gap-1.5">
                    <span 
                      v-if="notice.is_pinned"
                      class="px-1.5 py-0.5 bg-rose-50 text-rose-600 font-bold rounded text-[10px] border border-rose-200 flex items-center gap-0.5"
                    >
                      <span>📌 필독</span>
                    </span>
                    <span class="px-1.5 py-0.5 bg-blue-50 text-blue-600 font-semibold rounded text-[10px] border border-blue-100">
                      {{ notice.badge || getCategoryLabel(notice.category) }}
                    </span>
                  </div>
                  <span class="font-mono text-gray-400">{{ formatDate(notice.created_at || notice.date) }}</span>
                </div>
                <h5 class="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition truncate">
                  {{ notice.title }}
                </h5>
                <p class="text-[11px] text-gray-500 line-clamp-1 mt-0.5 font-normal">
                  {{ notice.summary || notice.content || notice.desc }}
                </p>
              </li>
            </ul>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-100 text-center">
            <router-link 
              to="/community/notice" 
              class="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
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
                to="/services/rocket-growth" 
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-red-50 text-gray-700 hover:text-red-600 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-red-500 group-hover:scale-110 transition mb-2">
                  <i class="fas fa-rocket text-sm"></i>
                </div>
                <span class="text-[11px] font-semibold">로켓그로스</span>
              </router-link>

              <router-link 
                to="/services/purchasing-agent" 
                class="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition text-center group border border-gray-100"
              >
                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 transition mb-2">
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

    <!-- 공지 상세 모달 -->
    <div v-if="selectedNotice" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="selectedNotice = null">
      <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl relative text-gray-900 text-xs">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold rounded">
              {{ selectedNotice.badge || getCategoryLabel(selectedNotice.category) }}
            </span>
            <span class="text-gray-400 font-mono text-[11px]">{{ formatDate(selectedNotice.created_at || selectedNotice.date) }}</span>
          </div>
          <button @click="selectedNotice = null" class="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <i class="fas fa-times text-base"></i>
          </button>
        </div>
        
        <div>
          <h3 class="text-base font-black text-gray-900 leading-snug">
            {{ selectedNotice.title }}
          </h3>
          <p v-if="selectedNotice.summary" class="text-xs font-semibold text-blue-600 mt-1">
            {{ selectedNotice.summary }}
          </p>
        </div>

        <div v-if="selectedNotice.thumbnail_url" class="rounded-xl overflow-hidden border border-gray-100">
          <img :src="selectedNotice.thumbnail_url" class="w-full h-44 object-cover" />
        </div>

        <p class="text-gray-700 whitespace-pre-line leading-relaxed text-xs">
          {{ selectedNotice.content || selectedNotice.summary || selectedNotice.desc }}
        </p>

        <div class="flex justify-end pt-3 border-t border-gray-100">
          <button @click="selectedNotice = null" class="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer">
            닫기
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchSiteSettings } from '@/lib/settings'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const NOTICES_STORAGE_KEY = 'euchs_admin_notices'

const DEFAULT_NOTICES = [
  {
    id: 'notice-1',
    category: 'system',
    badge: '긴급점검',
    is_pinned: true,
    title: 'EUCHS 차세대 B2B 수입대행 ERP 시스템 정기 데이터베이스 점검 안내',
    summary: '실시간 1688 API 주문 및 화물 트래킹 연동 안정화를 위한 서버 점검',
    thumbnail_url: '',
    content: '안녕하세요, 이유씨컴퍼니입니다.\n\n보다 안정적인 1688 실시간 상품 연동 및 화물 위치 추적 서비스를 제공하기 위해 정기 서버 및 데이터베이스 최적화 작업을 진행합니다.\n\n- 작업 일시: 2026년 8월 26일 (수) 새벽 02:00 ~ 04:00 (약 2시간)\n- 영향 범위: 작업 시간 중 일시적인 주문서 작성 지연이 발생할 수 있습니다.\n\n바이어 여러분의 너른 양해 부탁드립니다.',
    created_at: '2026-08-25T09:00:00.000Z'
  },
  {
    id: 'notice-2',
    category: 'schedule',
    badge: '모집중',
    is_pinned: false,
    title: '제43기 중국 이우(푸텐) 도매시장 사입 조사단 참가 바이어 모집',
    summary: '전담 통역 및 1:1 공장 섭외 포함 4박 5일 풀패키지 투어',
    thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    content: '중국 이우 푸텐시장 1~5구 전 구역을 전담 매니저와 함께 동행하는 43기 이우 시장조사 투어 접수가 시작되었습니다.\n\n- 일정: 2026년 9월 16일 ~ 9월 20일 (4박 5일)\n- 모집 인원: 선착순 12명 (잔여 5석)\n- 혜택: 전담 통역, 픽업, 호텔, 공장 섭외 풀패키지 지원',
    created_at: '2026-08-23T14:30:00.000Z'
  },
  {
    id: 'notice-3',
    category: 'customs',
    badge: '통관',
    is_pinned: false,
    title: '한-중 FTA 원산지증명서(C/O) 발급 및 관세 감면 실무 가이드',
    summary: '정식 수입신고 시 FTA 협정관세 0~4% 감면 적용 절차 안내',
    thumbnail_url: '',
    content: '중국 수입 시 한-중 FTA 협정관세를 적용받기 위한 원산지증명서(C/O) 발급 절차 및 서류 안내입니다.\n\n당사 창고에서 출고 전 발급 대행을 원스톱으로 지원해 드립니다.',
    created_at: '2026-08-20T09:15:00.000Z'
  }
]

const liveRate = ref(null)
const customRate = ref('230')
const rateMode = ref('manual')
const rateMargin = ref(1.5)
const noticesList = ref([])
const selectedNotice = ref(null)

const displayNotices = computed(() => {
  let list = [...noticesList.value]
  // 1순위: Pinned(고정) 우선, 2순위: 최신순 정렬
  return list.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0)
  }).slice(0, 3)
})

const rateModeDesc = computed(() => {
  if (rateMode.value === 'auto_margin' || rateMode.value === 'auto') {
    return `(실시간 + ${rateMargin.value}원 마진)`
  }
  return `(공식 고정 환율)`
})

function getCategoryLabel(cat) {
  const map = {
    schedule: '업무일정',
    event: '이벤트',
    system: '시스템안내',
    customs: '세관통관',
    general: '일반공지'
  }
  return map[cat] || '공지'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

function loadNotices() {
  try {
    const raw = localStorage.getItem(NOTICES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        noticesList.value = parsed
        return
      }
    }
  } catch (e) {
    console.warn('Failed to load notices from storage:', e)
  }
  noticesList.value = JSON.parse(JSON.stringify(DEFAULT_NOTICES))
}

const fetchExchangeRate = async () => {
  let liveNum = 230.0
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY')
    if (!res.ok) throw new Error('환율 API 호출 실패')
    const data = await res.json()
    if (data && data.rates && data.rates.KRW) {
      liveNum = Number(data.rates.KRW.toFixed(2))
      liveRate.value = liveNum.toFixed(2)
    }
  } catch (err) {
    liveRate.value = '230.00'
    liveNum = 230.0
  }

  try {
    const settings = await fetchSiteSettings()
    if (settings) {
      rateMode.value = settings.exchange_rate_mode || 'manual'
      rateMargin.value = Number(settings.rate_margin) || 1.5

      if (rateMode.value === 'auto_margin' || rateMode.value === 'auto') {
        const calculated = Number((liveNum + rateMargin.value).toFixed(2))
        customRate.value = String(calculated)
      } else {
        const fixed = Number(settings.exchange_rate) || 230
        customRate.value = String(fixed)
      }
    }
  } catch (e) {
    console.warn('CommunitySection settings fetch fallback:', e)
  }
}

const fetchNoticesFromSupabase = async () => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        noticesList.value = data
        try {
          localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(data))
        } catch (e) {}
      }
    } catch (e) {}
  }
}

const openNotice = (notice) => {
  selectedNotice.value = notice
}

const handleNoticeUpdateEvent = (e) => {
  if (e?.detail && Array.isArray(e.detail)) {
    noticesList.value = e.detail
  } else {
    loadNotices()
  }
}

// 탭 활성화 시 즉시 최신 설정 동기화
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchExchangeRate()
    loadNotices()
    fetchNoticesFromSupabase()
  }
}

onMounted(() => {
  loadNotices()
  fetchNoticesFromSupabase()
  fetchExchangeRate()

  window.addEventListener('euchs-notice-update', handleNoticeUpdateEvent)
  window.addEventListener('storage', loadNotices)

  const intervalId = setInterval(() => {
    fetchExchangeRate()
    fetchNoticesFromSupabase()
  }, 10 * 60 * 1000)

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', fetchExchangeRate)

  onUnmounted(() => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', fetchExchangeRate)
  })
})
</script>
