<template>
  <div class="min-h-full bg-slate-50 font-sans">

    <!-- ========================================================= -->
    <!-- 구역 A. 상단 헤더 & 세무 안내 배너                           -->
    <!-- ========================================================= -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div class="px-4 sm:px-6 lg:px-8 py-4">
        <!-- 타이틀 행 -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div class="flex items-center gap-2.5 mb-1">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <i class="fas fa-file-invoice text-white text-sm"></i>
              </div>
              <h1 class="text-xl font-extrabold text-gray-900 tracking-tight">세금계산서 관리 센터</h1>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed ml-10.5">
              수입대행 수수료 전자세금계산서 및 세관 수입세금계산서 발행 내역을 조회하고 관리합니다.
            </p>
          </div>
          <!-- 카카오 상담 버튼 -->
          <a
            href="http://pf.kakao.com/_xmQWsK/chat"
            target="_blank"
            class="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-extrabold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <i class="fas fa-comment-dots"></i>
            <span>세금계산서 발행 1:1 문의</span>
          </a>
        </div>

        <!-- 탭 필터 -->
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="activeTab = tab.id"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer"
            :class="activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            <i :class="tab.icon" class="text-[11px]"></i>
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.count !== null"
              class="px-1.5 py-0.5 rounded-full text-[9px] font-black"
              :class="activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-gray-300 text-gray-700'"
            >{{ tab.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- 메인 콘텐츠                                                 -->
    <!-- ========================================================= -->
    <div class="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      <!-- 세무 안내 배너 (Blue + Amber 이중 Alert) -->
      <div class="space-y-3">
        <!-- Blue: 수수료 계산서 안내 -->
        <div class="flex gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200">
          <div class="shrink-0 w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <i class="fas fa-info-circle text-blue-600 text-sm"></i>
          </div>
          <div class="text-xs text-blue-800 leading-relaxed">
            <p class="font-extrabold text-blue-700 mb-1">💡 [세무 표준 안내] 전자세금계산서 발행 기준</p>
            <p>
              사업자 회원의 경우 <strong class="text-blue-900">[순수 구매대행 수수료(8%) 및 국내 부가서비스 용역비]</strong>에 대해
              <strong class="text-blue-900">매월 10일</strong> 국세청 전자세금계산서가 발행됩니다.
            </p>
          </div>
        </div>
        <!-- Amber: 수입세금계산서 구분 안내 -->
        <div class="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div class="shrink-0 w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <i class="fas fa-exclamation-triangle text-amber-600 text-sm"></i>
          </div>
          <div class="text-xs text-amber-800 leading-relaxed">
            <p class="font-extrabold text-amber-700 mb-1">※ 1688 상품대금 & 세관 수입세금계산서 구분 안내</p>
            <p>
              1688 <strong>상품대금은 해외 현지 결제비용</strong>이며, 통관 관·부가세는 인천세관에서
              <strong>사업자 명의로 '수입세금계산서'가 직접 교부</strong>됩니다.
              세관 발급분은 홈택스에서 직접 조회 가능하며, 본 센터에서는 참고 안내만 제공합니다.
            </p>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- 구역 B. 사업자 발행 정보 카드 (2분할)                     -->
      <!-- ======================================================= -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- 좌측: 등록 사업자 정보 -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <i class="fas fa-building text-blue-500 text-base"></i>
              <h2 class="text-sm font-extrabold text-gray-900">등록 사업자 정보</h2>
            </div>
            <button
              type="button"
              @click="requestChangeInfo"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 hover:border-blue-400 text-blue-600 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <i class="fas fa-edit text-[10px]"></i>
              <span>발행 정보 변경 신청</span>
            </button>
          </div>
          <div v-if="bizInfo" class="space-y-2.5">
            <div class="flex items-center gap-2 text-xs">
              <span class="w-28 shrink-0 text-gray-400 font-medium">상호명</span>
              <span class="font-bold text-gray-900">{{ bizInfo.company_name || '–' }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-28 shrink-0 text-gray-400 font-medium">대표자</span>
              <span class="font-bold text-gray-900">{{ bizInfo.name || '–' }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-28 shrink-0 text-gray-400 font-medium">사업자등록번호</span>
              <span class="font-bold text-gray-900 font-mono">{{ formatBizNum(bizInfo.business_number) }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-28 shrink-0 text-gray-400 font-medium">통관고유부호(PCCC)</span>
              <span class="font-bold text-gray-900 font-mono">{{ bizInfo.pccc || '–' }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-28 shrink-0 text-gray-400 font-medium">계산서 수신 이메일</span>
              <span class="font-bold text-gray-900">{{ userEmail || '–' }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-28 shrink-0 text-gray-400 font-medium">연락처</span>
              <span class="font-bold text-gray-900">{{ bizInfo.phone || '–' }}</span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center py-6 gap-3 text-center">
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <i class="fas fa-building text-gray-300 text-xl"></i>
            </div>
            <p class="text-xs text-gray-400 leading-relaxed">
              등록된 사업자 정보가 없습니다.<br/>
              <strong>계정센터 → 사업자/통관부호 관리</strong>에서 등록해 주세요.
            </p>
            <router-link
              to="/dashboard/account?tab=pccc"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95"
            >
              <i class="fas fa-arrow-right text-[10px]"></i>
              <span>사업자 정보 등록하기</span>
            </router-link>
          </div>
        </div>

        <!-- 우측: 당월 발행 요약 KPI -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4">
            <i class="fas fa-chart-bar text-indigo-500 text-base"></i>
            <h2 class="text-sm font-extrabold text-gray-900">당월 세금계산서 발행 요약</h2>
            <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 ml-auto">
              {{ currentMonthLabel }}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <p class="text-[10px] text-blue-600 font-medium mb-1">수수료 공급가액</p>
              <p class="text-base font-black text-blue-700">{{ formatKrw(monthlySupplyAmount) }}</p>
              <p class="text-[9px] text-blue-500 mt-0.5">대행 수수료 8% 기준</p>
            </div>
            <div class="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
              <p class="text-[10px] text-amber-700 font-medium mb-1">부가세 (10%)</p>
              <p class="text-base font-black text-amber-700">{{ formatKrw(monthlyTax) }}</p>
              <p class="text-[9px] text-amber-500 mt-0.5">VAT</p>
            </div>
            <div class="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p class="text-[10px] text-emerald-700 font-medium mb-1">계산서 합계</p>
              <p class="text-base font-black text-emerald-700">{{ formatKrw(monthlyTotal) }}</p>
              <p class="text-[9px] text-emerald-500 mt-0.5">공급가 + 세액</p>
            </div>
          </div>
          <div class="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <i class="fas fa-calendar-check text-slate-500 text-sm"></i>
            <div class="text-xs">
              <span class="text-slate-600">발행 예정일: </span>
              <span class="font-extrabold text-slate-900">{{ nextIssueDate }}</span>
              <span class="ml-2 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">익월 10일</span>
            </div>
          </div>
          <p v-if="monthlySupplyAmount === 0" class="text-xs text-gray-400 text-center mt-3">
            이번 달 발행 대상 건 없음
          </p>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- 구역 C. 세금계산서 발행 내역 테이블                        -->
      <!-- ======================================================= -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <!-- 테이블 상단 툴바: 기간/검색 필터 -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div class="flex items-center gap-2 flex-1">
            <div class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs">
              <i class="fas fa-calendar text-gray-400 text-[11px]"></i>
              <select v-model="filterYear" class="bg-transparent outline-none text-gray-700 font-medium cursor-pointer">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}년</option>
              </select>
            </div>
            <div class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs">
              <select v-model="filterMonth" class="bg-transparent outline-none text-gray-700 font-medium cursor-pointer">
                <option value="">전체 월</option>
                <option v-for="m in 12" :key="m" :value="m">{{ m }}월</option>
              </select>
            </div>
          </div>
          <div class="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs min-w-[200px]">
            <i class="fas fa-search text-gray-400 text-[11px]"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="주문번호 검색..."
              class="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
          <div class="text-xs text-gray-400 shrink-0">
            총 <span class="font-bold text-gray-700">{{ filteredInvoices.length }}</span>건
          </div>
        </div>

        <!-- 세금계산서 내역 탭: 세관 수입세금계산서 안내 -->
        <div v-if="activeTab === 'customs'" class="p-6">
          <div class="flex flex-col items-center gap-5 text-center py-6">
            <div class="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <i class="fas fa-ship text-amber-500 text-2xl"></i>
            </div>
            <div>
              <p class="text-sm font-extrabold text-gray-800 mb-2">세관 수입세금계산서 안내</p>
              <div class="text-xs text-gray-500 leading-relaxed max-w-md space-y-2">
                <p>수입신고 통관 시 인천세관에서 <strong>사업자 명의로 수입세금계산서가 직접 발급</strong>됩니다.</p>
                <p>홈택스(hometax.go.kr) 로그인 후 <strong>[세금계산서] → [수입세금계산서 조회]</strong>에서 직접 확인하실 수 있습니다.</p>
                <p class="text-amber-700 font-semibold">※ 세관 발급 계산서는 EUCHS 시스템에서 발급·수정되지 않습니다.</p>
              </div>
            </div>
            <div class="flex gap-3">
              <a
                href="https://www.hometax.go.kr"
                target="_blank"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95"
              >
                <i class="fas fa-external-link-alt text-[10px]"></i>
                <span>홈택스 바로가기</span>
              </a>
              <a
                href="http://pf.kakao.com/_xmQWsK/chat"
                target="_blank"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-bold transition active:scale-95"
              >
                <i class="fas fa-comment-dots text-[10px]"></i>
                <span>통관 세금 문의</span>
              </a>
            </div>
          </div>
        </div>

        <!-- 일반 탭: 발행 내역 테이블 -->
        <div v-else>
          <!-- Empty State -->
          <div v-if="filteredInvoices.length === 0" class="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <i class="fas fa-file-invoice text-gray-300 text-3xl"></i>
            </div>
            <div>
              <p class="text-sm font-extrabold text-gray-700 mb-1">발행 내역이 없습니다</p>
              <p class="text-xs text-gray-400 leading-relaxed">
                {{ activeTab === 'issued' ? '발행 완료된 세금계산서가 없습니다.' :
                   activeTab === 'pending' ? '발행 예정 건이 없습니다.' :
                   '해당 기간의 세금계산서 발행 내역이 없습니다.' }}
              </p>
            </div>
          </div>

          <!-- 테이블 (데이터 있을 때) -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="px-4 py-3 text-left text-gray-500 font-bold w-12">NO</th>
                  <th class="px-4 py-3 text-left text-gray-500 font-bold whitespace-nowrap">귀속년월 (발행일)</th>
                  <th class="px-4 py-3 text-left text-gray-500 font-bold whitespace-nowrap">관련 주문번호</th>
                  <th class="px-4 py-3 text-right text-gray-500 font-bold whitespace-nowrap">공급가액</th>
                  <th class="px-4 py-3 text-right text-gray-500 font-bold whitespace-nowrap">부가세 (10%)</th>
                  <th class="px-4 py-3 text-right text-gray-500 font-bold whitespace-nowrap">합계 금액</th>
                  <th class="px-4 py-3 text-center text-gray-500 font-bold whitespace-nowrap">국세청 전송 상태</th>
                  <th class="px-4 py-3 text-center text-gray-500 font-bold whitespace-nowrap">증빙 관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="(inv, idx) in filteredInvoices"
                  :key="inv.id"
                  class="hover:bg-gray-50/60 transition"
                >
                  <td class="px-4 py-3.5 text-gray-400 font-mono">{{ idx + 1 }}</td>
                  <td class="px-4 py-3.5">
                    <p class="font-bold text-gray-900">{{ inv.periodLabel }}</p>
                    <p class="text-gray-400 mt-0.5">{{ inv.issueDate }}</p>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="font-mono text-blue-700 font-bold">{{ inv.orderNumber }}</p>
                    <p v-if="inv.orderCount > 1" class="text-gray-400 mt-0.5">{{ inv.orderCount }}건 통합</p>
                  </td>
                  <td class="px-4 py-3.5 text-right font-mono font-bold text-gray-800">
                    {{ formatKrwTable(inv.supplyAmount) }}
                  </td>
                  <td class="px-4 py-3.5 text-right font-mono text-gray-600">
                    {{ formatKrwTable(inv.taxAmount) }}
                  </td>
                  <td class="px-4 py-3.5 text-right font-mono font-extrabold text-gray-900">
                    {{ formatKrwTable(inv.totalAmount) }}
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                      :class="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200': inv.status === 'issued',
                        'bg-amber-50 text-amber-700 border border-amber-200': inv.status === 'pending',
                        'bg-red-50 text-red-700 border border-red-200': inv.status === 'error',
                      }"
                    >
                      <i :class="{
                        'fas fa-check-circle': inv.status === 'issued',
                        'fas fa-clock': inv.status === 'pending',
                        'fas fa-exclamation-circle': inv.status === 'error',
                      }" class="text-[9px]"></i>
                      {{ inv.statusLabel }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <button
                      v-if="inv.status === 'issued'"
                      type="button"
                      @click="downloadStatement(inv)"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 text-[10px] font-bold transition active:scale-95 cursor-pointer"
                    >
                      <i class="fas fa-file-pdf text-[9px]"></i>
                      <span>명세서</span>
                    </button>
                    <span v-else class="text-gray-300 text-[10px]">–</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- 구역 D. 하단 빠른 액션 & 안내                              -->
      <!-- ======================================================= -->
      <div class="bg-slate-900 text-white rounded-2xl p-5">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-orange-400 font-bold text-sm mb-1">
              <i class="fas fa-comment-dots"></i>
              <span>세금계산서 발행 관련 1:1 전담 문의</span>
            </div>
            <p class="text-slate-300 text-xs leading-relaxed">
              계산서 수정·재발행·사업자 변경·세무 서류 문의는 전담 매니저에게 카카오톡으로 즉시 연락 가능합니다.
            </p>
          </div>
          <div class="flex flex-col gap-2 shrink-0">
            <a
              href="http://pf.kakao.com/_xmQWsK/chat"
              target="_blank"
              class="flex items-center justify-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs rounded-xl transition active:scale-95"
            >
              <i class="fas fa-comment-dots"></i>
              <span>💬 카카오톡 세무 문의</span>
            </a>
            <router-link
              to="/dashboard/account?tab=pccc"
              class="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition active:scale-95"
            >
              <i class="fas fa-building text-[10px]"></i>
              <span>사업자 정보 관리</span>
            </router-link>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { currentUserBizInfo, userEmail } from '../../lib/auth'
import { getStoredOrders } from '../../utils/orderStorage'

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const router      = useRouter()
const activeTab   = ref('all')
const filterYear  = ref(new Date().getFullYear())
const filterMonth = ref('')
const searchQuery = ref('')

// SSOT: currentUserBizInfo는 auth.js에서 직접 바인딩 (반응형 computed)
// currentUser 변경 시 자동 재평가 — 별도 ref 불필요
const bizInfo = currentUserBizInfo

const invoices  = ref([])


// ─────────────────────────────────────────────
// 탭 정의
// ─────────────────────────────────────────────
const tabs = computed(() => [
  { id: 'all',     label: '전체 내역',           icon: 'fas fa-list',         count: invoices.value.length },
  { id: 'issued',  label: '발행 완료',            icon: 'fas fa-check-circle', count: invoices.value.filter(i => i.status === 'issued').length },
  { id: 'pending', label: '발행 예정',            icon: 'fas fa-clock',        count: invoices.value.filter(i => i.status === 'pending').length },
  { id: 'customs', label: '세관 수입세금계산서 안내', icon: 'fas fa-ship',         count: null },
])

// ─────────────────────────────────────────────
// 연도 선택 옵션
// ─────────────────────────────────────────────
const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  return [current - 1, current]
})

// ─────────────────────────────────────────────
// 날짜 헬퍼
// ─────────────────────────────────────────────
const currentMonthLabel = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
})

const nextIssueDate = computed(() => {
  const d = new Date()
  const y = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()
  const m = (d.getMonth() + 2).toString().padStart(2, '0')
  return `${y}.${m}.10`
})

// ─────────────────────────────────────────────
// 주문에서 월별 세금계산서 그룹핑
// ─────────────────────────────────────────────
function buildInvoicesFromOrders(orders) {
  const monthMap = new Map()

  orders.forEach(order => {
    const paidStatuses = ['payment_verified', 'purchasing', 'warehouse_in', 'inspection_done',
                          'shipping_ready', 'customs_clearance', 'domestic_shipping', 'delivered', 'completed']
    if (!paidStatuses.includes(order.status)) return

    const dateStr  = order.createdAt || order.created_at || ''
    const d        = dateStr ? new Date(dateStr) : new Date()
    const key      = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const totalKrw = Number(order.totalPriceKrw || order.total_price_krw || 0)
    // 대행 수수료 8% 기준 공급가액
    const fee = Math.round(totalKrw * 0.08)

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        id:          `INV-${key}`,
        year:        d.getFullYear(),
        month:       d.getMonth() + 1,
        periodLabel: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
        issueDate:   `${d.getFullYear()}.${String(d.getMonth() + 2 > 12 ? 1 : d.getMonth() + 2).padStart(2, '0')}.10`,
        orderNumber: order.orderNumber || order.id,
        orderCount:  0,
        supplyAmount: 0,
        taxAmount:   0,
        totalAmount: 0,
        status:      'issued',
        statusLabel: '발행완료 [국세청승인]',
      })
    }

    const entry = monthMap.get(key)
    entry.orderCount++
    entry.supplyAmount  += fee
    entry.taxAmount     += Math.round(fee * 0.1)
    entry.totalAmount   += fee + Math.round(fee * 0.1)
    if (entry.orderCount > 1) entry.orderNumber = `${key} 통합`
  })

  // 당월은 발행 예정으로
  const now = new Date()
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (monthMap.has(currentKey)) {
    const curr = monthMap.get(currentKey)
    curr.status      = 'pending'
    curr.statusLabel = `익월 10일 발행대기`
  }

  return Array.from(monthMap.values()).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
}

// ─────────────────────────────────────────────
// 필터 적용
// ─────────────────────────────────────────────
const filteredInvoices = computed(() => {
  let list = invoices.value

  if (activeTab.value === 'issued')  list = list.filter(i => i.status === 'issued')
  if (activeTab.value === 'pending') list = list.filter(i => i.status === 'pending')

  if (filterYear.value) list = list.filter(i => i.year === Number(filterYear.value))
  if (filterMonth.value) list = list.filter(i => i.month === Number(filterMonth.value))
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(i => i.orderNumber.toLowerCase().includes(q))
  }
  return list
})

// ─────────────────────────────────────────────
// 당월 KPI 합산
// ─────────────────────────────────────────────
const monthlySupplyAmount = computed(() => {
  const now = new Date()
  const cur = invoices.value.find(i => i.year === now.getFullYear() && i.month === now.getMonth() + 1)
  return cur?.supplyAmount ?? 0
})
const monthlyTax   = computed(() => Math.round(monthlySupplyAmount.value * 0.1))
const monthlyTotal = computed(() => monthlySupplyAmount.value + monthlyTax.value)

// ─────────────────────────────────────────────
// 포맷 유틸
// ─────────────────────────────────────────────
function formatKrw(amount) {
  if (!amount || amount === 0) return '₩0'
  return `₩${amount.toLocaleString()}`
}

function formatKrwTable(amount) {
  if (!amount || amount === 0) return '–'
  return `₩${amount.toLocaleString()}`
}

function formatBizNum(num) {
  if (!num) return '–'
  const n = String(num).replace(/[^0-9]/g, '')
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}`
  return num
}

// ─────────────────────────────────────────────
// 액션 핸들러
// ─────────────────────────────────────────────
function requestChangeInfo() {
  router.push('/dashboard/account?tab=pccc')
}

function downloadStatement(inv) {
  alert(`[명세서 다운로드]\n귀속월: ${inv.periodLabel}\n공급가액: ${formatKrw(inv.supplyAmount)}\n부가세: ${formatKrw(inv.taxAmount)}\n\n※ 실제 PDF 다운로드는 담당자 확인 후 이메일로 발송됩니다.`)
}

// ─────────────────────────────────────────────
// 초기화
// ─────────────────────────────────────────────
onMounted(() => {
  try {
    // bizInfo는 currentUserBizInfo computed로 자동 반응 (별도 초기화 불필요)
    const orders  = getStoredOrders()
    invoices.value = buildInvoicesFromOrders(orders)
  } catch (e) {
    console.error('[TaxInvoiceManageView] init error:', e)
  }
})
</script>
