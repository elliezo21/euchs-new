<template>
  <div class="max-w-6xl mx-auto space-y-6 select-none pb-20">

    <!-- 1. 상단 헤더 배너 & 액션 -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-base">
            💰
          </div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900">예치금 & 정산 관리</h2>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          바이어 무통장 입금 충전 승인, 1차 상품대금 및 2차 운임·통관 정산 내역을 통합 관리합니다.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-center">
        <button
          type="button"
          @click="showManualModal = true"
          class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
        >
          <span>+ 예치금 수동 조정 (관리자 권한)</span>
        </button>
      </div>
    </div>

    <!-- 2. 상단 4대 정산 KPI 현황 카드 (스마트스토어 센터 화이트 카드) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- KPI 1: 총 보관 예치금 잔액 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">총 보관 예치금 잔액</span>
          <span class="p-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs">💵</span>
        </div>
        <div class="text-2xl font-black font-mono text-slate-900">
          ₩{{ fmtN(currentTotalBalance) }}
        </div>
        <p class="text-[11px] text-slate-400 font-medium">전체 바이어 보관 예치금 실시간 합계</p>
      </div>

      <!-- KPI 2: 무통장 충전 승인 대기 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">무통장 충전 승인 대기</span>
          <span class="p-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs">⏳</span>
        </div>
        <div class="flex items-baseline gap-2">
          <div class="text-2xl font-black font-mono text-amber-600">
            {{ pendingRequests.length }}<span class="text-sm font-normal text-slate-500">건</span>
          </div>
          <span class="text-xs font-mono font-bold text-slate-500">(₩{{ fmtN(pendingTotalAmount) }})</span>
        </div>
        <p class="text-[11px] text-amber-600/80 font-medium">입금 확인 후 즉시 승인 처리 요망</p>
      </div>

      <!-- KPI 3: 1차 상품대금 결제액 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">1차 상품대금 결제액</span>
          <span class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs">📦</span>
        </div>
        <div class="text-2xl font-black font-mono text-slate-900">
          ₩{{ fmtN(firstPaymentSum) }}
        </div>
        <p class="text-[11px] text-slate-400 font-medium">당월 1688 수입 상품대금 누적</p>
      </div>

      <!-- KPI 4: 2차 운임/통관 정산액 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-600">2차 운임·통관 정산액</span>
          <span class="p-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs">🚢</span>
        </div>
        <div class="text-2xl font-black font-mono text-slate-900">
          ₩{{ fmtN(secondPaymentSum) }}
        </div>
        <p class="text-[11px] text-slate-400 font-medium">해운 LCL 운임 및 세관 통관비 누적</p>
      </div>
    </div>

    <!-- 3. 공식 입금 계좌 안내 바 -->
    <div class="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5">
        <span class="text-base">🏦</span>
        <div>
          <span class="font-bold text-blue-950">공식 지정 무통장 입금 계좌:</span>
          <span class="font-bold text-blue-900 ml-1.5">기업은행</span>
          <span class="font-mono font-black text-blue-950 ml-1">190-134321-01-016</span>
          <span class="text-blue-800 ml-1">(예금주: 이유씨컴퍼니(조해성))</span>
        </div>
      </div>
      <button
        type="button"
        @click="copyAccount"
        class="px-3 py-1 rounded-lg bg-white border border-blue-300 text-blue-800 hover:bg-blue-100/50 font-bold transition flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer shadow-2xs"
      >
        <span>📋 계좌번호 복사</span>
      </button>
    </div>

    <!-- 4. 2단 서브 탭 바 -->
    <div class="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/80 text-xs sm:text-sm font-bold">
      <!-- 탭 1: 무통장 충전 신청 관리 -->
      <button
        type="button"
        @click="activeSubTab = 'requests'"
        class="flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        :class="activeSubTab === 'requests'
          ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-900/5 font-black'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'"
      >
        <span>⏳ 무통장 충전 신청 관리 (승인 대기)</span>
        <span
          class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
          :class="pendingRequests.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-300/60 text-slate-600'"
        >
          {{ pendingRequests.length }}건
        </span>
      </button>

      <!-- 탭 2: 전체 예치금 변동 & 정산 로그 -->
      <button
        type="button"
        @click="activeSubTab = 'logs'"
        class="flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        :class="activeSubTab === 'logs'
          ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-900/5 font-black'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'"
      >
        <span>📊 전체 예치금 변동 & 정산 트랜잭션 로그</span>
        <span
          class="px-1.5 py-0.2 rounded text-[10px] font-mono"
          :class="activeSubTab === 'logs' ? 'bg-blue-100 text-blue-700' : 'bg-slate-300/60 text-slate-600'"
        >
          {{ transactionLogs.length }}건
        </span>
      </button>
    </div>

    <!-- ======================================================== -->
    <!-- [TAB 1] 무통장 충전 신청 관리 (승인 대기) -->
    <!-- ======================================================== -->
    <div v-show="activeSubTab === 'requests'" class="space-y-4">
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h3 class="font-black text-slate-900 text-sm">무통장 충전 신청 목록</h3>
            <span class="text-xs font-mono text-slate-400">({{ depositRequests.length }}건)</span>
          </div>

          <!-- 상태 필터 -->
          <div class="flex items-center gap-1.5 text-xs">
            <button
              v-for="st in ['all', 'pending', 'approved', 'rejected']"
              :key="st"
              type="button"
              @click="reqFilter = st"
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              :class="reqFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              {{ getReqFilterLabel(st) }}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
              <tr>
                <th class="py-3 px-4 w-36">신청번호 / 일시</th>
                <th class="py-3 px-4 min-w-[160px]">바이어 상호 (아이디)</th>
                <th class="py-3 px-4">입금자명</th>
                <th class="py-3 px-4 text-right">충전 요청액</th>
                <th class="py-3 px-4">입금 계좌</th>
                <th class="py-3 px-4 text-center">처리 상태</th>
                <th class="py-3 px-4 text-center w-36">관리 액션</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="req in filteredDepositRequests"
                :key="req.id"
                class="hover:bg-slate-50/80 transition"
                :class="req.status === 'pending' ? 'bg-amber-50/20' : ''"
              >
                <!-- 신청번호 / 일시 -->
                <td class="py-3.5 px-4 font-mono">
                  <div class="font-bold text-slate-900">{{ req.id }}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">{{ formatDate(req.createdAt) }}</div>
                </td>

                <!-- 바이어 상호 (아이디) -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-900 text-xs">{{ req.buyerName }}</div>
                  <div class="text-[10px] text-slate-400 font-mono">{{ req.buyerEmail }}</div>
                </td>

                <!-- 입금자명 -->
                <td class="py-3.5 px-4">
                  <span class="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {{ req.depositorName }}
                  </span>
                </td>

                <!-- 충전 요청액 -->
                <td class="py-3.5 px-4 text-right font-mono">
                  <span class="text-sm font-black text-blue-600">₩{{ fmtN(req.amount) }}</span>
                </td>

                <!-- 입금 계좌 -->
                <td class="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                  <div>기업은행 190-134321-01-016</div>
                  <div class="text-[10px] text-slate-400">이유씨컴퍼니(조해성)</div>
                </td>

                <!-- 상태 -->
                <td class="py-3.5 px-4 text-center">
                  <span
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold inline-block"
                    :class="getStatusBadgeClass(req.status)"
                  >
                    {{ getStatusLabel(req.status) }}
                  </span>
                </td>

                <!-- 관리 액션 -->
                <td class="py-3.5 px-4 text-center">
                  <div v-if="req.status === 'pending'" class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      @click="approveDeposit(req)"
                      class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
                    >
                      ✓ 입금 승인
                    </button>
                    <button
                      type="button"
                      @click="rejectDeposit(req)"
                      class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs transition cursor-pointer"
                    >
                      ✕ 반려
                    </button>
                  </div>
                  <div v-else class="text-[11px] text-slate-400 font-mono">
                    {{ req.status === 'approved' ? '승인 완료' : '반려됨' }}
                  </div>
                </td>
              </tr>

              <tr v-if="filteredDepositRequests.length === 0">
                <td colspan="7" class="py-12 text-center text-slate-400 space-y-1">
                  <div class="text-2xl">📭</div>
                  <p class="font-bold text-xs text-slate-600">해당 상태의 무통장 충전 신청 내역이 없습니다.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- [TAB 2] 전체 예치금 변동 & 정산 트랜잭션 로그 -->
    <!-- ======================================================== -->
    <div v-show="activeSubTab === 'logs'" class="space-y-4">
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 class="font-black text-slate-900 text-sm">전체 예치금 정산 트랜잭션 이력</h3>
            <span class="text-xs font-mono text-slate-400">({{ filteredTransactionLogs.length }}건)</span>
          </div>

          <!-- 검색 및 구분 필터 -->
          <div class="flex items-center gap-2 flex-wrap">
            <select
              v-model="logTypeFilter"
              class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="all">전체 거래 구분</option>
              <option value="deposit">예치금 충전 (+)</option>
              <option value="order_payment">1차 상품대금 (-)</option>
              <option value="shipping_payment">2차 운임·통관 (-)</option>
              <option value="manual_add">관리자 수동지급 (+)</option>
              <option value="manual_sub">관리자 수동차감 (-)</option>
            </select>

            <input
              type="text"
              v-model="logSearchQuery"
              placeholder="바이어명, 주문/거래번호 검색..."
              class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 outline-none w-48"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
              <tr>
                <th class="py-3 px-4 w-32 font-mono">거래일시</th>
                <th class="py-3 px-4 w-44 font-mono">거래/주문번호</th>
                <th class="py-3 px-4 min-w-[160px]">바이어 정보</th>
                <th class="py-3 px-4">거래 구분</th>
                <th class="py-3 px-4 text-right">변동 금액</th>
                <th class="py-3 px-4 text-right font-mono">거래 후 잔액</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="log in filteredTransactionLogs"
                :key="log.id"
                class="hover:bg-slate-50/80 transition"
              >
                <!-- 거래일시 -->
                <td class="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                  {{ formatDate(log.createdAt) }}
                </td>

                <!-- 거래/주문번호 -->
                <td class="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                  {{ log.refNo || log.id }}
                </td>

                <!-- 바이어 정보 -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-900 text-xs">{{ log.buyerName }}</div>
                  <div class="text-[10px] text-slate-400 font-mono">{{ log.buyerEmail }}</div>
                </td>

                <!-- 거래 구분 -->
                <td class="py-3.5 px-4">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold"
                    :class="getLogTypeBadge(log.type)"
                  >
                    {{ log.title }}
                  </span>
                </td>

                <!-- 변동 금액 -->
                <td
                  class="py-3.5 px-4 text-right font-mono font-black text-sm"
                  :class="log.amount >= 0 ? 'text-blue-600' : 'text-rose-600'"
                >
                  {{ log.amount >= 0 ? '+' : '' }}₩{{ fmtN(log.amount) }}
                </td>

                <!-- 거래 후 잔액 -->
                <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                  ₩{{ fmtN(log.balanceAfter) }}
                </td>
              </tr>

              <tr v-if="filteredTransactionLogs.length === 0">
                <td colspan="6" class="py-12 text-center text-slate-400 space-y-1">
                  <div class="text-2xl">📋</div>
                  <p class="font-bold text-xs text-slate-600">거래 정산 내역이 없습니다.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. 바이어 예치금 수동 조정 모달 (관리자 권한) -->
    <!-- ======================================================== -->
    <div
      v-if="showManualModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>⚙️ 예치금 수동 조정 (관리자)</span>
          </h3>
          <button @click="showManualModal = false" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleManualAdjust" class="space-y-4 text-xs">
          <!-- 바이어 선택 -->
          <div class="space-y-1">
            <label class="block font-bold text-slate-700">대상 바이어</label>
            <select
              v-model="manualForm.buyerName"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="이유씨글로벌">이유씨글로벌 (buyer@euchs.com)</option>
              <option value="(주)케이커머스">(주)케이커머스 (kcommerce@naver.com)</option>
              <option value="탑글로벌무역">탑글로벌무역 (topglobal@gmail.com)</option>
            </select>
          </div>

          <!-- 지급 / 차감 선택 -->
          <div class="space-y-1">
            <label class="block font-bold text-slate-700">조정 유형</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="manualForm.action = 'add'"
                class="py-2.5 px-3 rounded-xl border text-center font-bold transition cursor-pointer"
                :class="manualForm.action === 'add' ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
              >
                ➕ 예치금 지급 (가산)
              </button>
              <button
                type="button"
                @click="manualForm.action = 'sub'"
                class="py-2.5 px-3 rounded-xl border text-center font-bold transition cursor-pointer"
                :class="manualForm.action === 'sub' ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
              >
                ➖ 예치금 차감
              </button>
            </div>
          </div>

          <!-- 금액 입력 -->
          <div class="space-y-1">
            <label class="block font-bold text-slate-700">조정 금액 (원)</label>
            <div class="relative">
              <input
                type="number"
                step="10000"
                v-model.number="manualForm.amount"
                required
                min="10000"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span class="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">원</span>
            </div>
          </div>

          <!-- 사유 입력 -->
          <div class="space-y-1">
            <label class="block font-bold text-slate-700">조정 사유 (바이어 내역에 표기됨)</label>
            <input
              type="text"
              v-model="manualForm.reason"
              required
              placeholder="예: VIP 프로모션 포인트 지급, 오배송 보전 환불 등"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              @click="showManualModal = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition active:scale-95 cursor-pointer shadow-sm"
            >
              ✓ 예치금 조정 적용하기
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 토스트 알림창 -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2.5 bg-emerald-600 text-white"
      >
        <span>✅</span>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { userBalance, setBalance, applyBalanceTransaction } from '@/lib/balanceStore'
import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase'

const activeSubTab = ref('requests') // 'requests' | 'logs'
const reqFilter = ref('all')
const logTypeFilter = ref('all')
const logSearchQuery = ref('')
const showManualModal = ref(false)

const toast = ref({ show: false, message: '' })
let toastTimer = null

function showToast(msg) {
  clearTimeout(toastTimer)
  toast.value = { show: true, message: msg }
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

function fmtN(val) {
  return Math.round(Number(val) || 0).toLocaleString('ko-KR')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function copyAccount() {
  navigator.clipboard.writeText('190-134321-01-016')
  showToast('기업은행 190-134321-01-016 계좌번호가 복사되었습니다.')
}

// ----------------------------------------------------
// 1. 무통장 충전 신청 데이터 관리
// ----------------------------------------------------
const DEFAULT_REQUESTS = [
  {
    id: 'DEP-20260825-001',
    createdAt: '2026-08-25T11:20:00.000Z',
    buyerName: '이유씨글로벌',
    buyerEmail: 'buyer@euchs.com',
    depositorName: '이유씨글로벌',
    amount: 5000000,
    bankName: '기업은행',
    accountNumber: '190-134321-01-016',
    status: 'pending' // 'pending' | 'approved' | 'rejected'
  },
  {
    id: 'DEP-20260825-002',
    createdAt: '2026-08-25T09:40:00.000Z',
    buyerName: '(주)케이커머스',
    buyerEmail: 'kcommerce@naver.com',
    depositorName: '김케이 대표',
    amount: 3000000,
    bankName: '기업은행',
    accountNumber: '190-134321-01-016',
    status: 'pending'
  },
  {
    id: 'DEP-20260824-001',
    createdAt: '2026-08-24T14:30:00.000Z',
    buyerName: '탑글로벌무역',
    buyerEmail: 'topglobal@gmail.com',
    depositorName: '탑글로벌',
    amount: 10000000,
    bankName: '기업은행',
    accountNumber: '190-134321-01-016',
    status: 'approved'
  }
]

const depositRequests = ref([])

const pendingRequests = computed(() => {
  return depositRequests.value.filter(r => r.status === 'pending')
})

const pendingTotalAmount = computed(() => {
  return pendingRequests.value.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
})

const filteredDepositRequests = computed(() => {
  if (reqFilter.value === 'all') return depositRequests.value
  return depositRequests.value.filter(r => r.status === reqFilter.value)
})

function getReqFilterLabel(st) {
  const map = { all: '전체', pending: '승인 대기', approved: '승인 완료', rejected: '반려됨' }
  return map[st] || st
}

function getStatusLabel(status) {
  const map = { pending: '⏳ 승인 대기', approved: '✅ 승인 완료', rejected: '✕ 반려됨' }
  return map[status] || status
}

function getStatusBadgeClass(status) {
  const map = {
    pending: 'bg-amber-100 text-amber-800 border border-amber-300',
    approved: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    rejected: 'bg-rose-100 text-rose-800 border border-rose-300'
  }
  return map[status] || 'bg-slate-100 text-slate-700'
}

// ----------------------------------------------------
// 2. 전체 예치금 변동 & 정산 로그
// ----------------------------------------------------
const DEFAULT_LOGS = [
  {
    id: 'tx-1',
    createdAt: '2026-08-25T11:20:00.000Z',
    refNo: 'DEP-20260824-001',
    buyerName: '탑글로벌무역',
    buyerEmail: 'topglobal@gmail.com',
    title: '예치금 무통장 입금 충전',
    type: 'deposit',
    amount: 10000000,
    balanceAfter: 25420000
  },
  {
    id: 'tx-2',
    createdAt: '2026-08-24T16:00:00.000Z',
    refNo: 'ORD-20260824-1688',
    buyerName: '이유씨글로벌',
    buyerEmail: 'buyer@euchs.com',
    title: '1688 1차 상품대금 결제',
    type: 'order_payment',
    amount: -3200000,
    balanceAfter: 15420000
  },
  {
    id: 'tx-3',
    createdAt: '2026-08-23T10:15:00.000Z',
    refNo: 'ORD-20260820-0922',
    buyerName: '이유씨글로벌',
    buyerEmail: 'buyer@euchs.com',
    title: '인천항 LCL 2차 운임·통관 정산',
    type: 'shipping_payment',
    amount: -890000,
    balanceAfter: 18620000
  }
]

const transactionLogs = ref([])

const currentTotalBalance = computed(() => {
  return userBalance.value || 0
})

const firstPaymentSum = ref(41200000)
const secondPaymentSum = ref(6840000)

const filteredTransactionLogs = computed(() => {
  let list = [...transactionLogs.value]

  if (logTypeFilter.value !== 'all') {
    list = list.filter(l => l.type === logTypeFilter.value)
  }

  if (logSearchQuery.value.trim()) {
    const q = logSearchQuery.value.toLowerCase()
    list = list.filter(l =>
      (l.buyerName || '').toLowerCase().includes(q) ||
      (l.buyerEmail || '').toLowerCase().includes(q) ||
      (l.refNo || '').toLowerCase().includes(q) ||
      (l.title || '').toLowerCase().includes(q)
    )
  }

  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

function getLogTypeBadge(type) {
  const map = {
    deposit: 'bg-blue-100 text-blue-800 border border-blue-200',
    order_payment: 'bg-rose-100 text-rose-800 border border-rose-200',
    shipping_payment: 'bg-purple-100 text-purple-800 border border-purple-200',
    manual_add: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    manual_sub: 'bg-orange-100 text-orange-800 border border-orange-200'
  }
  return map[type] || 'bg-slate-100 text-slate-700'
}

function normalizeDepositRequest(r) {
  if (!r) return null
  const createdAt = r.createdAt || r.created_at || new Date().toISOString()
  const id = String(r.id || r.dbId || (r.created_at ? 'dep_' + new Date(r.created_at).getTime() : 'dep_' + Date.now()))
  const buyerName = r.buyerName || r.buyer_name || '바이어 회원'
  const buyerEmail = r.buyerEmail || r.buyer_email || ''
  const depositorName = r.depositorName || r.depositor_name || buyerName || '입금자'
  const amount = Number(r.amount || 0)
  const status = r.status || 'pending'
  const approvedAt = r.approvedAt || r.approved_at || null
  const rejectReason = r.rejectReason || r.reject_reason || null
  const userId = r.userId || r.user_id || null

  return {
    id,
    dbId: r.dbId || (isValidUUID(id) ? id : null),
    userId,
    user_id: userId,
    createdAt,
    created_at: createdAt,
    buyerName,
    buyer_name: buyerName,
    buyerEmail,
    buyer_email: buyerEmail,
    depositorName,
    depositor_name: depositorName,
    amount,
    bankName: r.bankName || r.bank_name || '기업은행',
    bank_name: r.bank_name || r.bankName || '기업은행',
    accountNumber: r.accountNumber || r.account_number || '190-134321-01-016',
    account_number: r.account_number || r.accountNumber || '190-134321-01-016',
    status,
    approvedAt,
    approved_at: approvedAt,
    rejectReason,
    reject_reason: rejectReason
  }
}

// ----------------------------------------------------
// 3. 충전 승인 & 반려 액션
// ----------------------------------------------------
async function approveDeposit(req) {
  if (!confirm(`[${req.buyerName || req.depositorName}] 님의 ₩${fmtN(req.amount)}원 무통장 입금을 승인하시겠습니까?\n승인 시 바이어 예치금 잔액으로 즉시 충전됩니다.`)) {
    return
  }

  const approvedAt = new Date().toISOString()
  req.status = 'approved'
  req.approvedAt = approvedAt
  req.approved_at = approvedAt

  // 1. 바이어 예치금 잔액 가산 & Supabase profiles/transactions 동기화
  await applyBalanceTransaction(Number(req.amount), {
    type: 'deposit',
    title: '예치금 무통장 입금 충전 (승인)',
    description: `입금 승인 (신청번호: ${req.id})`,
    orderId: req.id,
    userId: req.userId || req.user_id,
    buyerEmail: req.buyerEmail || req.buyer_email
  })

  // 2. Supabase deposit_requests 테이블 업데이트
  if (isSupabaseConfigured()) {
    try {
      if (isValidUUID(req.id)) {
        await supabase
          .from('deposit_requests')
          .update({ status: 'approved', approved_at: approvedAt })
          .eq('id', req.id)
      } else {
        const { error: updErr } = await supabase
          .from('deposit_requests')
          .update({ status: 'approved', approved_at: approvedAt })
          .eq('id', req.id)
        if (updErr && req.user_id) {
          await supabase
            .from('deposit_requests')
            .update({ status: 'approved', approved_at: approvedAt })
            .eq('user_id', req.user_id)
            .eq('status', 'pending')
        }
      }
    } catch (e) {
      console.warn('[approveDeposit] Supabase update notice:', e)
    }
  }

  saveState()
  window.dispatchEvent(new CustomEvent('euchs-balance-update'))
  showToast(`[${req.buyerName || req.depositorName}] 님의 ₩${fmtN(req.amount)}원 충전이 승인되었습니다.`)
}

async function rejectDeposit(req) {
  const reason = prompt('반려 사유를 입력하세요:', '입금자명 불일치 또는 입금 미확인')
  if (reason === null) return

  req.status = 'rejected'
  req.rejectReason = reason
  req.reject_reason = reason

  // Supabase deposit_requests 테이블 업데이트
  if (isSupabaseConfigured()) {
    try {
      if (isValidUUID(req.id)) {
        await supabase
          .from('deposit_requests')
          .update({ status: 'rejected', reject_reason: reason })
          .eq('id', req.id)
      } else {
        await supabase
          .from('deposit_requests')
          .update({ status: 'rejected', reject_reason: reason })
          .eq('id', req.id)
      }
    } catch (e) {
      console.warn('[rejectDeposit] Supabase update notice:', e)
    }
  }

  saveState()
  window.dispatchEvent(new CustomEvent('euchs-balance-update'))
  showToast('충전 신청이 반려 처리되었습니다.')
}

// ----------------------------------------------------
// 4. 수동 조정 모달 핸들러
// ----------------------------------------------------
const manualForm = ref({
  buyerName: '이유씨글로벌',
  action: 'add', // 'add' | 'sub'
  amount: 100000,
  reason: '관리자 수동 지급'
})

async function handleManualAdjust() {
  const isAdd = manualForm.value.action === 'add'
  const delta = isAdd ? Number(manualForm.value.amount) : -Number(manualForm.value.amount)

  await applyBalanceTransaction(delta, {
    type: isAdd ? 'manual_add' : 'manual_sub',
    title: isAdd ? `관리자 수동 지급: ${manualForm.value.reason}` : `관리자 수동 차감: ${manualForm.value.reason}`,
    description: manualForm.value.reason
  })

  saveState()
  showManualModal.value = false
  showToast(`예치금이 성공적으로 ${isAdd ? '지급' : '차감'}되었습니다. (변동 후: ₩${fmtN(userBalance.value)})`)
}

// ----------------------------------------------------
// 로컬 스토리지 로드 & 저장 및 Supabase 실시간 동기화
// ----------------------------------------------------
async function loadState() {
  // 1. Supabase deposit_requests 직통 조회 (최우선 정규 데이터 소스)
  let dbList = []
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && Array.isArray(data)) {
        dbList = data  // data.length === 0도 유효 — 빈 배열이면 신청 없음
      }
    } catch (err) {
      console.warn('[AdminSettlement] Supabase fetch error, fallbacking:', err)
    }
  }

  // 2. 로컬 스토리지 데이터 로드 (DB 오프라인 폴백)
  let localRequests = []
  try {
    const rawReq = localStorage.getItem('euchs_deposit_requests')
    if (rawReq) {
      const parsed = JSON.parse(rawReq)
      if (Array.isArray(parsed)) localRequests = parsed
    }
  } catch (e) {}

  // 3. 데이터 소스 결정
  //    - DB 데이터가 있으면 DB 우선 + 로컬 병합 (로컬에만 있는 신청 건 보완)
  //    - DB/로컬 모두 빈 경우에만 더미 DEFAULT_REQUESTS 표시
  const mergedMap = new Map()

  if (dbList.length === 0 && localRequests.length === 0) {
    // 완전 빈 상태 → 더미 데이터 폴백
    DEFAULT_REQUESTS.forEach(r => {
      const norm = normalizeDepositRequest(r)
      if (norm) mergedMap.set(String(norm.id), norm)
    })
  } else {
    // 로컬 먼저 맵핑 (낮은 우선순위)
    localRequests.forEach(r => {
      const norm = normalizeDepositRequest(r)
      if (norm) mergedMap.set(String(norm.id), norm)
    })
    // DB 데이터로 최신 상태 덮어쓰기 (높은 우선순위)
    dbList.forEach(r => {
      const norm = normalizeDepositRequest(r)
      if (norm) mergedMap.set(String(norm.id), norm)
    })
  }

  depositRequests.value = Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))

  // 4. 로컬 캐시 갱신 (DB 데이터가 있을 때만 덮어씀)
  if (dbList.length > 0 || localRequests.length > 0) {
    localStorage.setItem('euchs_deposit_requests', JSON.stringify(depositRequests.value))
  }

  // 5. 트랜잭션 로그 로드
  try {
    const rawLogs = localStorage.getItem('euchs_settlement_logs')
    if (rawLogs) {
      transactionLogs.value = JSON.parse(rawLogs)
    } else {
      transactionLogs.value = JSON.parse(JSON.stringify(DEFAULT_LOGS))
    }
  } catch (e) {
    transactionLogs.value = JSON.parse(JSON.stringify(DEFAULT_LOGS))
  }
}

function saveState() {
  localStorage.setItem('euchs_deposit_requests', JSON.stringify(depositRequests.value))
  localStorage.setItem('euchs_settlement_logs', JSON.stringify(transactionLogs.value))
  window.dispatchEvent(new CustomEvent('euchs-settlement-update', { detail: { requests: depositRequests.value, logs: transactionLogs.value } }))
  window.dispatchEvent(new Event('storage'))
}

let realtimeChannel = null

onMounted(() => {
  loadState()
  window.addEventListener('euchs-deposit-request', (e) => {
    if (e.detail) {
      const norm = normalizeDepositRequest(e.detail)
      if (norm) {
        depositRequests.value.unshift(norm)
        saveState()
      }
    }
  })
  window.addEventListener('euchs-balance-update', loadState)
  window.addEventListener('storage', loadState)

  if (isSupabaseConfigured()) {
    try {
      realtimeChannel = supabase
        .channel('public:deposit_requests_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_requests' }, () => {
          loadState()
        })
        .subscribe()
    } catch (e) {}
  }
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
