<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
    <div class="max-w-6xl mx-auto space-y-8">
      
      <!-- Non-logged in State -->
      <div v-if="!isLoggedIn" class="bg-slate-950/80 rounded-3xl p-8 sm:p-12 border border-slate-800 text-center space-y-6 max-w-xl mx-auto shadow-2xl backdrop-blur-md">
        <div class="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-4xl mx-auto">
          <i class="fas fa-lock"></i>
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-black text-white">로그인이 필요합니다</h2>
          <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
            회원 로그인 후 신청하신 시장투어, 구매대행, 무역대행 맞춤 견적 및 처리 상태를 실시간으로 확인하실 수 있습니다.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button 
            type="button" 
            @click="openLoginModal('login')" 
            class="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            로그인하기
          </button>
          <button 
            type="button" 
            @click="openLoginModal('signup')" 
            class="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition active:scale-95"
          >
            무료 회원가입
          </button>
        </div>
      </div>

      <!-- Logged in State -->
      <div v-else class="space-y-8">
        
        <!-- 1. Profile Header Card -->
        <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 border border-blue-400/30 shrink-0">
              {{ userDisplayName ? userDisplayName.charAt(0) : 'U' }}
            </div>
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="text-xl sm:text-2xl font-black text-white">{{ userDisplayName }}님</h1>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  일반회원
                </span>
              </div>
              <p class="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                <span><i class="fas fa-envelope text-slate-500 mr-1"></i>{{ userEmail }}</span>
              </p>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div class="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-center min-w-[90px]">
              <span class="text-[10px] text-slate-400 font-semibold block">총 신청건수</span>
              <span class="text-lg font-black text-white">{{ myApplications.length }}건</span>
            </div>
            <div class="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-center min-w-[90px]">
              <span class="text-[10px] text-blue-400 font-semibold block">상담/진행중</span>
              <span class="text-lg font-black text-blue-400">{{ activeCount }}건</span>
            </div>
            <div class="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-center min-w-[90px]">
              <span class="text-[10px] text-emerald-400 font-semibold block">완료</span>
              <span class="text-lg font-black text-emerald-400">{{ completedCount }}건</span>
            </div>
          </div>
        </div>

        <!-- 2. Application List Section -->
        <div class="bg-slate-950/80 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          
          <!-- Section Header & Filter -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <h2 class="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <i class="fas fa-file-invoice-dollar text-blue-400"></i>
                <span>나의 신청 / 견적 내역</span>
              </h2>
              <p class="text-xs text-slate-400 mt-1">접수하신 서비스 내역과 실시간 처리 상태를 확인하실 수 있습니다.</p>
            </div>

            <!-- Refresh & Status Filter -->
            <div class="flex items-center gap-2">
              <select 
                v-model="selectedServiceFilter"
                class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white outline-none focus:border-blue-500"
              >
                <option value="all">전체 서비스 ({{ myApplications.length }})</option>
                <option value="calculator">무역/운임 실시간 견적</option>
                <option value="market_tour">이우 시장투어</option>
                <option value="purchasing">1688 구매대행</option>
                <option value="trade">OEM/ODM 무역대행</option>
                <option value="rocket_growth">쿠팡 로켓그로스</option>
              </select>

              <button 
                type="button" 
                @click="fetchMyApplications" 
                :disabled="isLoading"
                class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
                title="목록 새로고침"
              >
                <i class="fas fa-rotate" :class="{ 'animate-spin': isLoading }"></i>
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="py-16 text-center space-y-3 text-slate-400">
            <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-xs">신청 내역을 불러오는 중입니다...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredMyApplications.length === 0" class="py-16 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center text-2xl mx-auto">
              <i class="fas fa-inbox"></i>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-bold text-slate-300">신청하신 내역이 없습니다.</p>
              <p class="text-xs text-slate-500">필요하신 무역 서비스를 신청하시면 이곳에서 확인하실 수 있습니다.</p>
            </div>
            <div class="flex flex-wrap gap-2 justify-center pt-2">
              <router-link to="/guide/market-tour" class="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition">
                이우 시장투어 신청
              </router-link>
              <router-link to="/services/trade-agent" class="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition">
                무역대행 맞춤 견적
              </router-link>
              <router-link to="/services/purchasing-agent" class="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition">
                1688 구매대행 주문
              </router-link>
            </div>
          </div>

          <!-- Application Cards Grid -->
          <div v-else class="space-y-4">
            <div 
              v-for="app in filteredMyApplications" 
              :key="app.id"
              class="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition space-y-4 shadow-md"
            >
              <!-- Card Header -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <span 
                    class="px-2.5 py-1 rounded-lg text-xs font-bold"
                    :class="getServiceBadgeClass(app.service_type)"
                  >
                    {{ app.service_name || getServiceLabel(app.service_type) }}
                  </span>
                  <span class="text-xs text-slate-400 font-mono">
                    <i class="far fa-clock mr-1"></i>{{ formatDateTime(app.created_at) }}
                  </span>
                </div>

                <!-- Status Badge -->
                <div class="flex items-center gap-2">
                  <span 
                    class="px-3 py-1 rounded-full text-xs font-bold border"
                    :class="getStatusBadgeClass(app.status)"
                  >
                    {{ getStatusLabel(app.status) }}
                  </span>
                </div>
              </div>

              <!-- Card Content Summary -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span class="text-[11px] text-slate-500 block mb-1">총 예상 견적 금액</span>
                  <span class="text-base font-black text-yellow-400 font-mono">
                    {{ app.total_amount > 0 ? Number(app.total_amount).toLocaleString() + '원' : '별도 협의' }}
                  </span>
                </div>

                <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 sm:col-span-2 space-y-1">
                  <span class="text-[11px] text-slate-500 block">주요 선택 옵션 및 요청사항</span>
                  <p class="text-slate-300 font-medium line-clamp-2 leading-relaxed">
                    {{ getAppSummaryText(app) }}
                  </p>
                </div>
              </div>

              <!-- Card Action Buttons -->
              <div class="flex items-center justify-end gap-2 pt-1">
                <button 
                  type="button" 
                  @click="openDetailModal(app)" 
                  class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5"
                >
                  <i class="fas fa-eye text-blue-400"></i>
                  <span>상세 명세서 보기</span>
                </button>
                <button 
                  type="button" 
                  @click="downloadReceipt(app)" 
                  class="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 font-semibold text-xs border border-emerald-800/60 transition flex items-center gap-1.5"
                >
                  <i class="fas fa-file-csv"></i>
                  <span>견적서 다운로드</span>
                </button>
                <a 
                  href="http://pf.kakao.com/_xmQWsK/chat" 
                  target="_blank" 
                  class="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <i class="fas fa-comment text-amber-950"></i>
                  <span>1:1 상담 연결</span>
                </a>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>

    <!-- Application Detail Modal -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="selectedApp" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        @click.self="selectedApp = null"
      >
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">Application Details</span>
              <h3 class="text-lg font-black text-white mt-0.5">
                {{ selectedApp.service_name || getServiceLabel(selectedApp.service_type) }} 상세 견적서
              </h3>
            </div>
            <button 
              type="button" 
              @click="selectedApp = null" 
              class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Info Table -->
          <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs space-y-2.5">
            <div class="flex justify-between">
              <span class="text-slate-400">접수번호:</span>
              <span class="font-mono text-slate-200">#EUC-{{ selectedApp.id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">접수일시:</span>
              <span class="font-mono text-slate-200">{{ formatDateTime(selectedApp.created_at) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">현재 상태:</span>
              <span class="font-bold text-amber-400">{{ getStatusLabel(selectedApp.status) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">신청자명:</span>
              <span class="font-bold text-white">{{ selectedApp.customer_name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">연락처:</span>
              <span class="font-mono text-white">{{ selectedApp.phone }}</span>
            </div>
            <div class="flex justify-between border-t border-slate-800/80 pt-2 text-sm">
              <span class="text-slate-300 font-bold">총 예상 견적 금액:</span>
              <span class="font-black text-yellow-400 font-mono">
                {{ selectedApp.total_amount > 0 ? Number(selectedApp.total_amount).toLocaleString() + '원' : '별도 협의' }}
              </span>
            </div>
          </div>

          <!-- Specific Service Details -->
          <div v-if="selectedApp.details" class="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
            <div class="text-slate-400 font-bold pb-1 border-b border-slate-800 flex items-center gap-1.5">
              <i class="fas fa-list-check text-blue-400"></i>
              <span>선택 옵션 상세</span>
            </div>

            <!-- Market Tour Specific -->
            <template v-if="selectedApp.service_type === 'market_tour'">
              <div v-if="selectedApp.details.pickupSummaryText" class="flex justify-between">
                <span class="text-slate-400">공항 픽업:</span>
                <span class="text-slate-200">{{ selectedApp.details.pickupSummaryText }}</span>
              </div>
              <div v-if="selectedApp.details.guideSummaryText" class="flex justify-between">
                <span class="text-slate-400">통역 가이드:</span>
                <span class="text-slate-200">{{ selectedApp.details.guideSummaryText }}</span>
              </div>
              <div v-if="selectedApp.details.targetItem" class="flex justify-between">
                <span class="text-slate-400">희망 품목:</span>
                <span class="text-slate-200">{{ selectedApp.details.targetItem }}</span>
              </div>
            </template>

            <!-- Freight & Calculator Specific -->
            <template v-if="selectedApp.service_type === 'calculator' || selectedApp.details.freightCostKrw !== undefined">
              <div v-if="selectedApp.details.shippingModeName" class="flex justify-between">
                <span class="text-slate-400">운송 방식:</span>
                <span class="text-sky-300 font-bold">{{ selectedApp.details.shippingModeName }}</span>
              </div>
              <div v-if="selectedApp.details.cbm" class="flex justify-between">
                <span class="text-slate-400">화물 규격:</span>
                <span class="text-slate-200">{{ selectedApp.details.cbm }} CBM / {{ selectedApp.details.weightKg }} kg</span>
              </div>
              <div v-if="selectedApp.details.boxDimensions" class="flex justify-between">
                <span class="text-slate-400">포장 규격:</span>
                <span class="text-slate-200">{{ selectedApp.details.boxDimensions }}</span>
              </div>
              <div v-if="selectedApp.details.freightCostKrw" class="flex justify-between">
                <span class="text-slate-400">기본 국제 운임:</span>
                <span class="font-mono text-white">₩{{ Number(selectedApp.details.freightCostKrw).toLocaleString() }}</span>
              </div>
              <div v-if="selectedApp.details.tariffKrw" class="flex justify-between">
                <span class="text-slate-400">예상 관세:</span>
                <span class="font-mono text-white">₩{{ Number(selectedApp.details.tariffKrw).toLocaleString() }}</span>
              </div>
              <div v-if="selectedApp.details.vatKrw" class="flex justify-between">
                <span class="text-slate-400">수입 부가세(VAT):</span>
                <span class="font-mono text-white">₩{{ Number(selectedApp.details.vatKrw).toLocaleString() }}</span>
              </div>
              <div v-if="selectedApp.details.customsFeeKrw" class="flex justify-between">
                <span class="text-slate-400">통관 및 부대비용:</span>
                <span class="font-mono text-white">₩{{ Number(selectedApp.details.customsFeeKrw).toLocaleString() }}</span>
              </div>
            </template>

            <!-- Raw / full message -->
            <div v-if="selectedApp.details.fullApplicationMessage" class="pt-2 border-t border-slate-800/80">
              <span class="text-slate-400 block mb-1">신청서 전문:</span>
              <pre class="bg-slate-900 p-3 rounded-xl text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{{ selectedApp.details.fullApplicationMessage }}</pre>
            </div>
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <button 
              type="button"
              @click="downloadReceipt(selectedApp)" 
              class="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <i class="fas fa-file-csv"></i>
              <span>견적서(CSV) 다운로드</span>
            </button>
            <button 
              type="button" 
              @click="selectedApp = null" 
              class="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              닫기
            </button>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  currentUser,
  isLoggedIn,
  userDisplayName,
  userEmail,
  openLoginModal
} from '@/lib/auth'

const myApplications = ref([])
const isLoading = ref(false)
const selectedServiceFilter = ref('all')
const selectedApp = ref(null)

const activeCount = computed(() => {
  return myApplications.value.filter(a => a.status === 'pending' || a.status === 'consulting' || a.status === '접수대기' || a.status === '상담진행').length
})

const completedCount = computed(() => {
  return myApplications.value.filter(a => a.status === 'completed' || a.status === '처리완료').length
})

const filteredMyApplications = computed(() => {
  if (selectedServiceFilter.value === 'all') {
    return myApplications.value
  }
  return myApplications.value.filter(a => {
    if (selectedServiceFilter.value === 'calculator') return a.service_type === 'calculator' || a.service_type === 'logistics_estimate'
    if (selectedServiceFilter.value === 'market_tour') return a.service_type === 'market_tour'
    if (selectedServiceFilter.value === 'purchasing') return a.service_type === 'purchasing' || a.service_type === 'purchasing_agent'
    if (selectedServiceFilter.value === 'trade') return a.service_type === 'trade' || a.service_type === 'trade_agent'
    if (selectedServiceFilter.value === 'rocket_growth') return a.service_type === 'rocket_growth'
    return true
  })
})

const fetchMyApplications = async () => {
  if (!currentUser.value) return
  isLoading.value = true

  try {
    if (isSupabaseConfigured()) {
      const userPhone = currentUser.value.user_metadata?.phone || ''
      const email = currentUser.value.email || ''
      const uid = currentUser.value.id

      // Query by user_id OR email OR phone
      let query = supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (uid && email && userPhone) {
        query = query.or(`user_id.eq.${uid},email.eq.${email},phone.eq.${userPhone}`)
      } else if (uid && email) {
        query = query.or(`user_id.eq.${uid},email.eq.${email}`)
      } else if (uid) {
        query = query.eq('user_id', uid)
      } else if (email) {
        query = query.eq('email', email)
      }

      const { data, error } = await query

      if (error) {
        console.error('Fetch my applications error:', error)
      } else if (data) {
        myApplications.value = data
      }
    }
  } catch (err) {
    console.error('Fetch my applications exception:', err)
  } finally {
    isLoading.value = false
  }
}

const openDetailModal = (app) => {
  selectedApp.value = app
}

const getServiceLabel = (type) => {
  switch (type) {
    case 'market_tour': return '이우 시장투어'
    case 'rocket_growth': return '쿠팡 로켓그로스'
    case 'purchasing':
    case 'purchasing_agent': return '1688 구매대행'
    case 'trade':
    case 'trade_agent': return 'OEM/ODM 무역대행'
    case 'calculator':
    case 'logistics_estimate': return '무역/운임 실시간 견적'
    default: return '서비스 신청'
  }
}

const getServiceBadgeClass = (type) => {
  switch (type) {
    case 'market_tour': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    case 'rocket_growth': return 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    case 'purchasing':
    case 'purchasing_agent': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    case 'trade':
    case 'trade_agent': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    case 'calculator':
    case 'logistics_estimate': return 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
    default: return 'bg-slate-800 text-slate-300'
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 'pending':
    case '접수대기': return '접수 대기'
    case 'consulting':
    case '상담진행': return '상담 진행 중'
    case 'quoted':
    case '견적완료': return '견적 완료'
    case 'completed':
    case '처리완료': return '처리 완료'
    case 'cancelled':
    case '취소/보류': return '취소/보류'
    default: return status || '접수 대기'
  }
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending':
    case '접수대기': return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'consulting':
    case '상담진행': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'quoted':
    case '견적완료': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'completed':
    case '처리완료': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'cancelled':
    case '취소/보류': return 'bg-slate-800 text-slate-500 border-slate-700'
    default: return 'bg-slate-800 text-slate-400 border-slate-700'
  }
}

const getAppSummaryText = (app) => {
  if (app.details?.shippingModeName && app.details?.cbm) {
    return `[${app.details.shippingModeName}] ${app.details.cbm} CBM / ${app.details.weightKg || 0} kg (${app.details.boxDimensions || '규격직접입력'})`
  }
  if (app.details?.pickupSummaryText && app.details?.guideSummaryText) {
    return `[픽업] ${app.details.pickupSummaryText} / [통역] ${app.details.guideSummaryText}`
  }
  if (app.details?.fullApplicationMessage) {
    return app.details.fullApplicationMessage.split('\n').slice(0, 3).join(' ')
  }
  return app.memo || '상세 요청사항 없음'
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

// Download Receipt (UTF-8 BOM CSV)
const downloadReceipt = (app) => {
  if (!app) return

  const dateStr = formatDateTime(app.created_at)
  const serviceName = app.service_name || getServiceLabel(app.service_type)
  const customer = app.customer_name || '고객'
  const phone = app.phone || '-'
  const email = app.email || '-'
  const totalAmount = app.total_amount > 0 ? `${Number(app.total_amount).toLocaleString()}원` : '별도 안내'

  const lines = [
    '========================================================================',
    `[EUC COMPANY] ${serviceName} 견적 명세서 / 고객 확인서`,
    '========================================================================',
    `접수번호: #EUC-${app.id || 'N/A'}`,
    `접수일시: ${dateStr}`,
    `처리상태: ${getStatusLabel(app.status)}`,
    '------------------------------------------------------------------------',
    `[신청 고객 정보]`,
    `고객명: ${customer}`,
    `연락처: ${phone}`,
    `이메일: ${email}`,
    '------------------------------------------------------------------------',
    `[서비스 견적 세부 내역]`,
    `서비스 명칭: ${serviceName}`,
    `총 예상 견적 금액: ${totalAmount}`
  ]

  if (app.details) {
    if (app.details.pickupSummaryText) lines.push(`공항 픽업/샌딩: ${app.details.pickupSummaryText}`)
    if (app.details.guideSummaryText) lines.push(`통역 가이드: ${app.details.guideSummaryText}`)
    if (app.details.guideCost) lines.push(`통역 비용: ${Number(app.details.guideCost).toLocaleString()}원`)
    if (app.details.pickupCost) lines.push(`픽업 비용: ${Number(app.details.pickupCost).toLocaleString()}원`)
    if (app.details.supportHotel) lines.push(`호텔 예약 대행: 무료 지원`)
    if (app.details.support1688) lines.push(`1688 사전 비교 데이터: 무료 지원`)
    if (app.details.shippingModeName) lines.push(`운송 방식: ${app.details.shippingModeName}`)
    if (app.details.cbm) lines.push(`화물 부피(CBM) / 중량: ${app.details.cbm} CBM / ${app.details.weightKg || 0} kg`)
    if (app.details.boxDimensions) lines.push(`포장 규격: ${app.details.boxDimensions}`)
    if (app.details.freightCostKrw) lines.push(`기본 국제 운송료: ₩${Number(app.details.freightCostKrw).toLocaleString()}`)
    if (app.details.tariffKrw) lines.push(`예상 관세: ₩${Number(app.details.tariffKrw).toLocaleString()}`)
    if (app.details.vatKrw) lines.push(`수입 부가세: ₩${Number(app.details.vatKrw).toLocaleString()}`)
    if (app.details.customsFeeKrw) lines.push(`통관 및 부대비용: ₩${Number(app.details.customsFeeKrw).toLocaleString()}`)
    if (app.details.targetItem) lines.push(`조사 희망품목: ${app.details.targetItem}`)
    if (app.details.fullApplicationMessage) {
      lines.push('------------------------------------------------------------------------')
      lines.push('[신청서 전문]')
      lines.push(app.details.fullApplicationMessage)
    }
  }

  lines.push('========================================================================')
  lines.push('상담 및 고객센터: 010-9373-1214 / 카카오톡: ericcho0710')
  lines.push('========================================================================')

  const content = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `euchs_견적명세서_${serviceName}_${yyyymmdd}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  fetchMyApplications()
})
</script>
