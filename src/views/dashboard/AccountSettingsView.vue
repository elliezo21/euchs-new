<template>
  <div class="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-black tracking-wide">
            MY ACCOUNT & WALLET
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            계정 정보 & 국내 수령처 관리
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          B2B 수입 통관 필수 정보(사업자등록번호, 통관부호), 배송 주소록 및 예치금 지갑을 관리합니다.
        </p>
      </div>

      <!-- 상단 예치금 잔액 요약 배너 -->
      <div class="flex items-center gap-3 bg-white p-2.5 pr-4 rounded-2xl border border-gray-200 shadow-xs">
        <div class="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
          <Wallet class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[11px] text-gray-400 font-medium">나의 예치금 잔액</span>
          <div class="text-base font-extrabold text-gray-900 font-mono">
            ₩{{ walletBalance.toLocaleString() }}
          </div>
        </div>
        <button
          type="button"
          @click="showDepositModal = true"
          class="ml-2 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition active:scale-95 shadow-xs"
        >
          충전하기
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 상단 2열 그리드: 바이어 기본 정보 & 통관 고유부호 설정 -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 2-1. 통관 & 세무 필수 정보 폼 -->
      <div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-5 h-5 text-indigo-600" />
            <h2 class="text-sm font-bold text-gray-900">수입 통관 & 세무 증빙 정보</h2>
          </div>
          <span class="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">인증완료</span>
        </div>

        <form @submit.prevent="saveCustomsInfo" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">상호명 (법인/개인사업자)</label>
            <input
              type="text"
              v-model="customsProfile.companyName"
              placeholder="(주)글로벌 커머스"
              required
              class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">사업자등록번호</label>
              <input
                type="text"
                v-model="customsProfile.bizNumber"
                placeholder="123-45-67890"
                required
                class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">개인/사업자 통관고유부호 (PCCC)</label>
              <input
                type="text"
                v-model="customsProfile.customsCode"
                placeholder="P123456789012"
                required
                class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono font-bold text-indigo-600 uppercase"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">수입 담당자 성명</label>
              <input
                type="text"
                v-model="customsProfile.contactName"
                placeholder="홍길동"
                required
                class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">비상 연락처 (모바일)</label>
              <input
                type="tel"
                v-model="customsProfile.contactPhone"
                placeholder="010-1234-5678"
                required
                class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
              />
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end">
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition text-xs shadow-xs"
            >
              통관 정보 저장
            </button>
          </div>
        </form>
      </div>

      <!-- 2-2. 전담 1:1 수입 MD & 바이어 등급 카드 -->
      <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black tracking-widest border border-amber-400/30">
              VIP PRIME BUYER
            </span>
            <span class="text-xs text-slate-400 font-mono">고객번호: EUCHS-VIP-8821</span>
          </div>

          <div class="mt-4">
            <h3 class="text-lg font-bold text-white">{{ customsProfile.companyName || '글로벌 커머스' }}</h3>
            <p class="text-xs text-slate-300 mt-1">대행 수수료 우대 8.0% 적용 | 전담 창고 우선 계근 혜택</p>
          </div>
        </div>

        <!-- 1:1 전담 MD 안내 -->
        <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                MD
              </div>
              <div>
                <div class="font-bold text-white">이유씨 전담 수입 MD팀 (박팀장)</div>
                <div class="text-[10px] text-slate-300">1688 공장 네고 및 특수 검수 담당</div>
              </div>
            </div>
            <a
              href="https://pf.kakao.com"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[11px] transition"
            >
              1:1 카톡 문의
            </a>
          </div>
          <div class="text-[11px] text-slate-300 pt-1 border-t border-white/10 flex items-center justify-between">
            <span>직통 유선전화: 070-8821-1688</span>
            <span>업무시간: 평일 09:00 ~ 18:00</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 국내 배송지 주소록 관리 (CRUD) -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div>
          <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MapPin class="w-4 h-4 text-orange-500" />
            <span>국내 화물 / 택배 수령 배송 주소록</span>
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">통관 완료 후 물품을 수령할 기본 및 추가 배송지를 관리합니다.</p>
        </div>

        <button
          type="button"
          @click="openAddressModal()"
          class="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition flex items-center gap-1.5"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>신규 배송지 추가</span>
        </button>
      </div>

      <!-- 주소 목록 그리드 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="addr in addressList"
          :key="addr.id"
          class="p-4 rounded-2xl border transition relative"
          :class="addr.isDefault ? 'border-orange-500 bg-orange-50/20' : 'border-gray-200 bg-white hover:border-gray-300'"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-gray-900">{{ addr.title }}</span>
              <span
                v-if="addr.isDefault"
                class="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[9px] font-bold"
              >
                기본 배송지
              </span>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="openAddressModal(addr)"
                class="text-gray-400 hover:text-gray-700 p-1 text-xs"
                title="수정"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button
                v-if="!addr.isDefault"
                @click="deleteAddress(addr.id)"
                class="text-gray-400 hover:text-rose-600 p-1 text-xs"
                title="삭제"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div class="text-xs text-gray-600 space-y-1">
            <div class="font-medium text-gray-800">{{ addr.recipient }} ({{ addr.phone }})</div>
            <div class="text-[11px] text-gray-500 leading-relaxed font-mono">
              [{{ addr.zipCode }}] {{ addr.address }} {{ addr.detailAddress }}
            </div>
            <div class="text-[10px] text-slate-400 mt-1">배송 메모: {{ addr.memo || '문 앞 전달' }}</div>
          </div>

          <div v-if="!addr.isDefault" class="mt-3 pt-2 border-t border-gray-100">
            <button
              @click="setDefaultAddress(addr.id)"
              class="text-[11px] font-bold text-orange-600 hover:underline"
            >
              기본 배송지로 지정
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 예치금 입출금 내역서 및 거래 내역 테이블 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Receipt class="w-4 h-4 text-emerald-600" />
            <span>예치금 충전 & 정산 거래 내역서</span>
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">발주 결제, 해운 운임 정산 및 예치금 충전 이력입니다.</p>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <button
            type="button"
            @click="walletFilter = 'all'"
            class="px-2.5 py-1 rounded-lg font-bold transition"
            :class="walletFilter === 'all' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'"
          >
            전체
          </button>
          <button
            type="button"
            @click="walletFilter = 'in'"
            class="px-2.5 py-1 rounded-lg font-bold transition"
            :class="walletFilter === 'in' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'"
          >
            충전(+)
          </button>
          <button
            type="button"
            @click="walletFilter = 'out'"
            class="px-2.5 py-1 rounded-lg font-bold transition"
            :class="walletFilter === 'out' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'"
          >
            출금/정산(-)
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase">
            <tr>
              <th class="py-2.5 px-4">거래일시</th>
              <th class="py-2.5 px-4">거래 항목 및 주문번호</th>
              <th class="py-2.5 px-4">구분</th>
              <th class="py-2.5 px-4 text-right">변동 금액</th>
              <th class="py-2.5 px-4 text-right">거래 후 잔액</th>
              <th class="py-2.5 px-4 text-center">증빙/영수증</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="t in filteredTransactions" :key="t.id" class="hover:bg-gray-50">
              <td class="py-3 px-4 font-mono text-gray-500">{{ t.date }}</td>
              <td class="py-3 px-4">
                <div class="font-bold text-gray-900">{{ t.title }}</div>
                <div class="text-[10px] text-gray-400 font-mono">{{ t.orderNo || '-' }}</div>
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="t.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                >
                  {{ t.type === 'in' ? '예치금 충전' : '발주 결제' }}
                </span>
              </td>
              <td
                class="py-3 px-4 text-right font-mono font-bold"
                :class="t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'"
              >
                {{ t.type === 'in' ? '+' : '-' }}₩{{ t.amount.toLocaleString() }}
              </td>
              <td class="py-3 px-4 text-right font-mono font-bold text-gray-800">
                ₩{{ t.balanceAfter.toLocaleString() }}
              </td>
              <td class="py-3 px-4 text-center">
                <button
                  @click="downloadReceipt(t)"
                  class="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] transition"
                >
                  전자영수증
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. 신규/수정 배송지 추가 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="showAddressModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900">
            {{ editingAddressId ? '배송지 정보 수정' : '신규 국내 수령처 등록' }}
          </h3>
          <button @click="showAddressModal = false" class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="saveAddress" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">배송지 별칭</label>
            <input
              type="text"
              v-model="addressForm.title"
              placeholder="예: 본사 창고 / 2물류센터"
              required
              class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-gray-700 mb-1">수령인 성명</label>
              <input
                type="text"
                v-model="addressForm.recipient"
                placeholder="홍길동"
                required
                class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">연락처</label>
              <input
                type="tel"
                v-model="addressForm.phone"
                placeholder="010-1234-5678"
                required
                class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">우편번호</label>
            <input
              type="text"
              v-model="addressForm.zipCode"
              placeholder="06234"
              required
              class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">기본 주소</label>
            <input
              type="text"
              v-model="addressForm.address"
              placeholder="서울특별시 강남구 테헤란로 123"
              required
              class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">상세 주소</label>
            <input
              type="text"
              v-model="addressForm.detailAddress"
              placeholder="B동 302호"
              class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">배송 요청사항</label>
            <input
              type="text"
              v-model="addressForm.memo"
              placeholder="경비실 위탁 / 도착 전 전화"
              class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showAddressModal = false"
              class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 6. 예치금 충전 신청 가상계좌 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="showDepositModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Wallet class="w-4 h-4 text-orange-600" />
            <span>예치금 지갑 충전 신청</span>
          </h3>
          <button @click="showDepositModal = false" class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">충전 신청 금액 (₩)</label>
            <input
              type="number"
              v-model="depositAmount"
              step="100000"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div class="p-3.5 bg-gray-50 rounded-2xl space-y-2 border border-gray-200">
            <div class="text-[11px] font-bold text-gray-600">입금 전용 가상계좌 정보</div>
            <div class="flex items-center justify-between font-mono">
              <span class="text-gray-500">입금은행:</span>
              <span class="font-bold text-gray-900">하나은행</span>
            </div>
            <div class="flex items-center justify-between font-mono">
              <span class="text-gray-500">계좌번호:</span>
              <span class="font-bold text-indigo-600">584-910023-88204</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">예금주:</span>
              <span class="font-bold text-gray-900">(주)이유씨컴퍼니</span>
            </div>
          </div>

          <p class="text-[11px] text-gray-400">
            입금 확인 후 10분 이내에 예치금 지갑 잔액으로 자동 반영됩니다.
          </p>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showDepositModal = false"
              class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold"
            >
              닫기
            </button>
            <button
              type="button"
              @click="confirmDeposit"
              class="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              충전 신청 접수
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Wallet,
  ShieldCheck,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Receipt,
  X
} from 'lucide-vue-next'

const route = useRoute()

const walletBalance = ref(15420000)
const walletFilter = ref('all')
const showAddressModal = ref(false)
const showDepositModal = ref(false)
const editingAddressId = ref(null)
const depositAmount = ref(3000000)

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'deposit') {
    showDepositModal.value = true
  }
}, { immediate: true })

const customsProfile = ref({
  companyName: '(주)글로벌 커머스',
  bizNumber: '123-45-67890',
  customsCode: 'P123456789012',
  contactName: '홍길동',
  contactPhone: '010-1234-5678'
})

const addressList = ref([
  {
    id: 1,
    title: '본사 물류창고',
    recipient: '홍길동 (물류팀)',
    phone: '010-1234-5678',
    zipCode: '10023',
    address: '경기도 김포시 고촌읍 아라육로 123',
    detailAddress: 'EUCHS 로지스틱스 2동 101호',
    memo: '화물 하역장 직접 입고',
    isDefault: true
  },
  {
    id: 2,
    title: '서울 제1영업소',
    recipient: '김영수 차장',
    phone: '010-9876-5432',
    zipCode: '06234',
    address: '서울특별시 강남구 테헤란로 456',
    detailAddress: '메트로빌딩 8층',
    memo: '경비실 보관 요망',
    isDefault: false
  }
])

const addressForm = ref({
  title: '',
  recipient: '',
  phone: '',
  zipCode: '',
  address: '',
  detailAddress: '',
  memo: ''
})

const transactions = ref([
  {
    id: 1,
    date: '2026-08-24 11:30',
    title: '1688 수입 발주 건 결제 승인',
    orderNo: 'ORD-20260824-001',
    type: 'out',
    amount: 2480000,
    balanceAfter: 15420000
  },
  {
    id: 2,
    date: '2026-08-23 15:20',
    title: '예치금 가상계좌 무통장 입금',
    orderNo: '',
    type: 'in',
    amount: 5000000,
    balanceAfter: 17900000
  },
  {
    id: 3,
    date: '2026-08-21 09:40',
    title: '인천세관 수입 관부가세 및 해운운임 정산',
    orderNo: 'ORD-20260820-008',
    type: 'out',
    amount: 890000,
    balanceAfter: 12900000
  }
])

const filteredTransactions = computed(() => {
  if (walletFilter.value === 'all') return transactions.value
  return transactions.value.filter(t => t.type === walletFilter.value)
})

const saveCustomsInfo = () => {
  alert('수입 통관 & 세무 정보가 안전하게 저장되었습니다.')
}

const openAddressModal = (addr = null) => {
  if (addr) {
    editingAddressId.value = addr.id
    addressForm.value = { ...addr }
  } else {
    editingAddressId.value = null
    addressForm.value = {
      title: '',
      recipient: '',
      phone: '',
      zipCode: '',
      address: '',
      detailAddress: '',
      memo: ''
    }
  }
  showAddressModal.value = true
}

const saveAddress = () => {
  if (editingAddressId.value) {
    const idx = addressList.value.findIndex(a => a.id === editingAddressId.value)
    if (idx !== -1) {
      addressList.value[idx] = {
        ...addressList.value[idx],
        ...addressForm.value
      }
    }
  } else {
    addressList.value.push({
      id: Date.now(),
      ...addressForm.value,
      isDefault: addressList.value.length === 0
    })
  }
  showAddressModal.value = false
}

const deleteAddress = (id) => {
  if (confirm('해당 주소지를 삭제하시겠습니까?')) {
    addressList.value = addressList.value.filter(a => a.id !== id)
  }
}

const setDefaultAddress = (id) => {
  addressList.value.forEach(a => {
    a.isDefault = a.id === id
  })
}

const confirmDeposit = () => {
  alert(`₩${depositAmount.value.toLocaleString()} 예치금 충전 신청이 완료되었습니다. 가상계좌로 입금해 주세요.`)
  showDepositModal.value = false
}

const downloadReceipt = (t) => {
  alert(`[거래번호: ${t.id}] 전자영수증이 발급되었습니다. (정산금액: ₩${t.amount.toLocaleString()})`)
}
</script>
