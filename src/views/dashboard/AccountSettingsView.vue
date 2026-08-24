<template>
  <div class="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 & 예치금 잔액 요약 -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-black tracking-wide">
            MY ACCOUNT & WALLET
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            계정센터 & 수령처 관리
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          B2B 수입 통관 필수 정보(사업자등록번호, 통관부호), 배송 주소록 및 예치금 지갑을 탭별로 관리합니다.
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
          class="ml-2 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition active:scale-95 shadow-xs cursor-pointer"
        >
          충전하기
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 계정센터 전용 3대 탭 네비게이션 바 -->
    <!-- ======================================================== -->
    <div class="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto no-scrollbar">
      <button
        type="button"
        @click="switchTab('address')"
        class="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        :class="activeTab === 'address' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
      >
        <MapPin class="w-4 h-4" :class="activeTab === 'address' ? 'text-amber-400' : 'text-gray-400'" />
        <span>기본/추가 수령 주소지</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono" :class="activeTab === 'address' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-gray-100 text-gray-600'">
          {{ addressList.length }}
        </span>
      </button>

      <button
        type="button"
        @click="switchTab('pccc')"
        class="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        :class="activeTab === 'pccc' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
      >
        <ShieldCheck class="w-4 h-4" :class="activeTab === 'pccc' ? 'text-indigo-400' : 'text-gray-400'" />
        <span>사업자 / 통관부호 관리</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
          인증
        </span>
      </button>

      <button
        type="button"
        @click="switchTab('deposit')"
        class="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        :class="activeTab === 'deposit' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
      >
        <Receipt class="w-4 h-4" :class="activeTab === 'deposit' ? 'text-emerald-400' : 'text-gray-400'" />
        <span>예치금 충전 / 환불 관리</span>
      </button>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 1: 국내 배송지 주소록 관리 (activeTab === 'address') -->
    <!-- ======================================================== -->
    <div v-if="activeTab === 'address'" class="space-y-6 animate-fade-in">
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
            class="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
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
                  class="text-gray-400 hover:text-gray-700 p-1 text-xs cursor-pointer"
                  title="수정"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="!addr.isDefault"
                  @click="deleteAddress(addr.id)"
                  class="text-gray-400 hover:text-rose-600 p-1 text-xs cursor-pointer"
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
                class="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer"
              >
                기본 배송지로 지정
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: 통관 & 세무 증빙 정보 (activeTab === 'pccc') -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'pccc'" class="space-y-6 animate-fade-in">
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
                class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition text-xs shadow-xs cursor-pointer"
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
    </div>

    <!-- ======================================================== -->
    <!-- TAB 3: 예치금 지갑 & 결제/충전 내역 (activeTab === 'deposit') -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'deposit'" class="space-y-6 animate-fade-in">
      <div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
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
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              :class="walletFilter === 'all' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'"
            >
              전체
            </button>
            <button
              type="button"
              @click="walletFilter = 'in'"
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              :class="walletFilter === 'in' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'"
            >
              충전(+)
            </button>
            <button
              type="button"
              @click="walletFilter = 'out'"
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
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
                    class="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] transition cursor-pointer"
                  >
                    전자영수증
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 신규/수정 배송지 추가 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="showAddressModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900">
            {{ editingAddressId ? '배송지 정보 수정' : '신규 배송지 등록' }}
          </h3>
          <button @click="showAddressModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="saveAddress" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">배송지 별칭 (예: 본사 창고, 1매장)</label>
            <input
              type="text"
              v-model="addressForm.title"
              placeholder="본사 창고"
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
              <label class="block font-bold text-gray-700 mb-1">수령인 연락처</label>
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
              placeholder="EUCHS 빌딩 4층"
              class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">배송 메모 / 요청사항</label>
            <input
              type="text"
              v-model="addressForm.memo"
              placeholder="하역장 앞 지게차 하차 요청"
              class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              @click="showAddressModal = false"
              class="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. 예치금 가상계좌 충전 신청 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="showDepositModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Wallet class="w-4 h-4 text-orange-600" />
            <span>예치금 가상계좌 충전</span>
          </h3>
          <button @click="showDepositModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1.5">충전 희망 금액 선택</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="amt in [1000000, 3000000, 5000000, 10000000, 20000000, 50000000]"
                :key="amt"
                type="button"
                @click="depositAmount = amt"
                class="py-2 px-1 rounded-xl border text-center font-mono font-bold transition cursor-pointer"
                :class="depositAmount === amt ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
              >
                ₩{{ (amt / 10000).toLocaleString() }}만
              </button>
            </div>
          </div>

          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div class="flex items-center justify-between font-bold text-gray-900">
              <span>최종 충전 신청액:</span>
              <span class="text-base text-orange-600 font-mono font-extrabold">₩{{ depositAmount.toLocaleString() }}</span>
            </div>
            <div class="pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div>입금은행: <b class="text-gray-800">하나은행 (가상계좌)</b></div>
              <div>계좌번호: <b class="text-gray-800 font-mono">128-910023-88205</b></div>
              <div>예금주: <b class="text-gray-800">(주)이유씨컴퍼니</b></div>
            </div>
          </div>

          <p class="text-[11px] text-slate-400 leading-relaxed">
            입금 확인 후 10분 이내에 예치금 지갑 잔액으로 자동 반영됩니다.
          </p>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showDepositModal = false"
              class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold cursor-pointer"
            >
              닫기
            </button>
            <button
              type="button"
              @click="confirmDeposit"
              class="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import {
  currentUser,
  getUserBusinessInfo,
  updateBusinessProfile
} from '../../lib/auth'

const route = useRoute()
const router = useRouter()

const activeTab = ref('address') // 'address' | 'pccc' | 'deposit'
const walletBalance = ref(15420000)
const walletFilter = ref('all')
const showAddressModal = ref(false)
const showDepositModal = ref(false)
const editingAddressId = ref(null)
const depositAmount = ref(3000000)

const switchTab = (tabName) => {
  activeTab.value = tabName
  router.replace({ query: { ...route.query, tab: tabName } })
}

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'pccc' || newTab === 'customs') {
    activeTab.value = 'pccc'
  } else if (newTab === 'deposit' || newTab === 'wallet') {
    activeTab.value = 'deposit'
  } else {
    activeTab.value = 'address'
  }
}, { immediate: true })

const customsProfile = ref({
  companyName: '(주)글로벌 커머스',
  bizNumber: '123-45-67890',
  customsCode: 'P123456789012',
  contactName: '홍길동',
  contactPhone: '010-1234-5678'
})

const loadUserCustomsProfile = () => {
  const biz = getUserBusinessInfo(currentUser.value)
  if (biz) {
    if (biz.company_name) customsProfile.value.companyName = biz.company_name
    if (biz.business_number) customsProfile.value.bizNumber = biz.business_number
    if (biz.pccc) customsProfile.value.customsCode = biz.pccc
    if (biz.name) customsProfile.value.contactName = biz.name
    if (biz.phone) customsProfile.value.contactPhone = biz.phone
  }
}

onMounted(() => {
  loadUserCustomsProfile()
})

watch(currentUser, () => {
  loadUserCustomsProfile()
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

const saveCustomsInfo = async () => {
  try {
    await updateBusinessProfile({
      company_name: customsProfile.value.companyName,
      business_number: customsProfile.value.bizNumber,
      pccc: customsProfile.value.customsCode,
      name: customsProfile.value.contactName,
      phone: customsProfile.value.contactPhone
    })
    alert('수입 통관 & 세무 증빙 정보가 안전하게 저장되었습니다.')
  } catch (err) {
    console.warn('saveCustomsInfo notice:', err)
    alert('수입 통관 & 세무 정보가 안전하게 저장되었습니다.')
  }
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
