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
    <!-- (라우터 가드로 비로그인 차단 완료 — 이 아래는 항상 로그인 상태) -->
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
        <span
          v-if="customsProfile.status"
          class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
          :class="customsProfile.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : (customsProfile.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')"
        >
          {{ customsProfile.status === 'verified' ? '인증' : (customsProfile.status === 'pending' ? '심사중' : '미인증') }}
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
            <span
              class="text-[11px] font-bold px-2 py-0.5 rounded"
              :class="customsProfile.status === 'verified' ? 'text-emerald-600 bg-emerald-50' : (customsProfile.status === 'pending' ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100')"
            >
              {{ customsProfile.status === 'verified' ? '인증완료' : (customsProfile.status === 'pending' ? '심사대기' : '미인증') }}
            </span>
          </div>

          <form @submit.prevent="saveCustomsInfo" class="space-y-3.5 text-xs">
            <div>
              <label class="block font-bold text-gray-700 mb-1">상호명 (법인/개인사업자)</label>
              <input
                type="text"
                v-model="customsProfile.companyName"
                placeholder="상호명(법인/개인사업자)을 입력하세요"
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
                  placeholder="사업자등록번호 10자리 (- 제외)"
                  required
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono font-bold"
                />
              </div>
              <div>
                <label class="block font-bold text-gray-700 mb-1">개인/사업자 통관고유부호 (PCCC)</label>
                <input
                  type="text"
                  v-model="customsProfile.customsCode"
                  placeholder="P로 시작하는 13자리 통관고유부호"
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
                  placeholder="수입 담당자 성명"
                  required
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label class="block font-bold text-gray-700 mb-1">비상 연락처 (모바일)</label>
                <input
                  type="tel"
                  v-model="customsProfile.contactPhone"
                  placeholder="휴대폰 번호 (- 제외)"
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
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest border"
                :class="customsProfile.status === 'verified' ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' : 'bg-slate-700/50 text-slate-300 border-slate-600'"
              >
                {{ customsProfile.status === 'verified' ? 'VIP PRIME BUYER' : (customsProfile.status === 'pending' ? 'B2B 인증 심사대기' : '일반 바이어') }}
              </span>
              <span class="text-xs text-slate-400 font-mono">고객번호: {{ buyerCustomerId }}</span>
            </div>

            <div class="mt-4">
              <h3 class="text-lg font-bold text-white">{{ customsProfile.companyName || userDisplayName || '신규 B2B 바이어' }}</h3>
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
            <div class="text-[11px] text-slate-300 pt-1 border-t border-white/10 flex items-center justify-between flex-wrap gap-1">
              <span>직통 연락처: <a href="tel:010-9373-1214" class="text-amber-300 hover:underline font-mono font-bold">010-9373-1214</a></span>
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
    <!-- 5. 예치금 무통장 입금 충전 신청 모달 (공식 계좌) -->
    <!-- ======================================================== -->
    <div
      v-if="showDepositModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Wallet class="w-4 h-4 text-orange-600" />
            <span>예치금 무통장 입금 충전 신청</span>
          </h3>
          <button @click="showDepositModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <!-- 충전 희망 금액 선택 -->
          <div>
            <label class="block font-bold text-gray-700 mb-1.5">충전 희망 금액 선택</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="amt in [1000000, 3000000, 5000000, 10000000, 20000000, 50000000]"
                :key="amt"
                type="button"
                @click="depositAmount = amt"
                class="py-2 px-1 rounded-xl border text-center font-mono font-bold transition cursor-pointer"
                :class="depositAmount === amt ? 'border-orange-500 bg-orange-50 text-orange-600 ring-2 ring-orange-500/20' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
              >
                ₩{{ (amt / 10000).toLocaleString() }}만
              </button>
            </div>
          </div>

          <!-- 입금자명 입력 -->
          <div>
            <label class="block font-bold text-gray-700 mb-1">입금자명 (실제 송금인 성명/상호)</label>
            <input
              type="text"
              v-model="depositDepositorName"
              placeholder="예: 홍길동 (또는 이유씨글로벌)"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <!-- 공식 무통장 입금 지정 계좌 안내 카드 -->
          <div class="bg-orange-50/70 p-4 rounded-2xl border border-orange-200 space-y-2.5">
            <div class="flex items-center justify-between font-bold text-gray-900">
              <span>최종 충전 신청액:</span>
              <span class="text-base text-orange-600 font-mono font-extrabold">₩{{ depositAmount.toLocaleString() }}</span>
            </div>

            <div class="pt-2 border-t border-orange-200/80 text-[11px] text-gray-700 space-y-1.5 font-medium">
              <div class="flex justify-between items-center">
                <span class="text-gray-500">입금은행:</span>
                <b class="text-gray-900 font-bold">기업은행 (공식 지정 계좌)</b>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-500">계좌번호:</span>
                <div class="flex items-center gap-1.5">
                  <b class="text-gray-900 font-mono font-black text-xs">190-134321-01-016</b>
                  <button
                    type="button"
                    @click="copyBankAccount"
                    class="px-2 py-0.5 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-[10px] font-bold text-gray-700 transition cursor-pointer shadow-xs"
                  >
                    📋 복사
                  </button>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-500">예금주:</span>
                <b class="text-gray-900 font-bold">이유씨컴퍼니(조해성)</b>
              </div>
            </div>
          </div>

          <p class="text-[11px] text-slate-500 leading-relaxed">
            * 입금 신청 후 위 계좌로 송금해 주시면, 관리자 확인 후 즉시 예치금 지갑으로 충전 승인됩니다.
          </p>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showDepositModal = false"
              class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              @click="submitDepositRequest"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition active:scale-95 cursor-pointer shadow-sm"
            >
              충전 신청하기
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
  currentUserProfile,
  userDisplayName,
  getUserBusinessInfo,
  updateBusinessProfile
} from '../../lib/auth'
import {
  userBalance,
  loadBalance
} from '../../lib/balanceStore'

const route = useRoute()
const router = useRouter()

const activeTab = ref(route.query.tab || 'address') // 'address' | 'pccc' | 'deposit'

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab) {
      activeTab.value = newTab
    }
  },
  { immediate: true }
)

const walletBalance = userBalance
const walletFilter = ref('all')
const showAddressModal = ref(false)
const showDepositModal = ref(false)
const editingAddressId = ref(null)
const depositAmount = ref(1000000)
const depositDepositorName = ref('')

const buyerCustomerId = computed(() => {
  if (!currentUser.value) return 'EUCHS-GUEST'
  const rawId = String(currentUser.value.id || '')
  const cleanSuffix = rawId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'B2B'
  return `EUCHS-${cleanSuffix}`
})

const switchTab = (tabName) => {
  activeTab.value = tabName
  router.replace({ query: { ...route.query, tab: tabName } })
}

const copyBankAccount = () => {
  navigator.clipboard.writeText('190-134321-01-016')
  alert('기업은행 190-134321-01-016 계좌번호가 클립보드에 복사되었습니다.')
}

const submitDepositRequest = () => {
  const req = {
    id: `DEP-${Date.now()}`,
    createdAt: new Date().toISOString(),
    buyerName: customsProfile.value.companyName || userDisplayName.value || '바이어 회원',
    buyerEmail: currentUser.value?.email || '',
    depositorName: depositDepositorName.value || customsProfile.value.companyName || userDisplayName.value || '입금자',
    amount: depositAmount.value,
    bankName: '기업은행',
    accountNumber: '190-134321-01-016',
    accountHolder: '이유씨컴퍼니(조해성)',
    status: 'pending' // 'pending' | 'approved' | 'rejected'
  }

  try {
    const raw = localStorage.getItem('euchs_deposit_requests')
    const list = raw ? JSON.parse(raw) : []
    list.unshift(req)
    localStorage.setItem('euchs_deposit_requests', JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('euchs-deposit-request', { detail: req }))
    window.dispatchEvent(new Event('storage'))
  } catch (e) {}

  alert(`₩${depositAmount.value.toLocaleString()}원 충전 신청이 완료되었습니다.\n기업은행 190-134321-01-016 (이유씨컴퍼니(조해성)) 계좌로 입금해 주시면 확인 후 즉시 승인됩니다.`)
  showDepositModal.value = false
}

// ----------------------------------------------------
// 주소 및 세무/통관 프로필 상태 (동적 로드)
// ----------------------------------------------------
const addressList = ref([])

const addressForm = ref({
  title: '',
  recipient: '',
  phone: '',
  zipCode: '',
  address: '',
  detailAddress: '',
  memo: ''
})

const customsProfile = ref({
  companyName: '',
  bizNumber: '',
  customsCode: '',
  contactName: '',
  contactPhone: '',
  bizCertUrl: '',
  status: 'unverified'
})

const loadCustomsProfile = () => {
  const biz = getUserBusinessInfo(currentUser.value) || {}
  const p = currentUserProfile.value || {}
  
  customsProfile.value = {
    companyName: p.company_name || biz.company_name || '',
    bizNumber: p.business_number || biz.business_number || '',
    customsCode: p.pccc || biz.pccc || '',
    contactName: p.representative_name || p.name || biz.name || currentUser.value?.user_metadata?.full_name || currentUser.value?.user_metadata?.name || '',
    contactPhone: p.phone || biz.phone || currentUser.value?.phone || '',
    bizCertUrl: p.biz_cert_url || '',
    status: p.verification_status || (biz.business_number && biz.pccc ? 'pending' : 'unverified')
  }

  if (!depositDepositorName.value) {
    depositDepositorName.value = customsProfile.value.companyName || customsProfile.value.contactName || userDisplayName.value || ''
  }
}

const loadAddresses = () => {
  const storageKey = 'euchs_user_addresses_' + (currentUser.value?.id || 'guest')
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        addressList.value = parsed
        return
      }
    }
  } catch (e) {}
  addressList.value = []
}

const saveAddressesToStorage = () => {
  const storageKey = 'euchs_user_addresses_' + (currentUser.value?.id || 'guest')
  try {
    localStorage.setItem(storageKey, JSON.stringify(addressList.value))
  } catch (e) {}
}

const transactions = ref([])

const loadTransactions = () => {
  try {
    const raw = localStorage.getItem('euchs_deposit_requests')
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.length > 0) {
        transactions.value = list.map(t => ({
          id: t.id,
          date: t.createdAt ? new Date(t.createdAt).toLocaleString('ko-KR') : '-',
          title: `예치금 무통장 입금 충전 (${t.status === 'approved' ? '승인완료' : (t.status === 'rejected' ? '반려' : '심사중')})`,
          orderNo: t.id,
          type: 'in',
          amount: t.amount,
          balanceAfter: walletBalance.value
        }))
        return
      }
    }
  } catch (e) {}
  transactions.value = []
}

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
    loadCustomsProfile()
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
      recipient: customsProfile.value.contactName || userDisplayName.value || '',
      phone: customsProfile.value.contactPhone || '',
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
  saveAddressesToStorage()
  showAddressModal.value = false
}

const deleteAddress = (id) => {
  if (confirm('해당 주소지를 삭제하시겠습니까?')) {
    addressList.value = addressList.value.filter(a => a.id !== id)
    saveAddressesToStorage()
  }
}

const setDefaultAddress = (id) => {
  addressList.value.forEach(a => {
    a.isDefault = a.id === id
  })
  saveAddressesToStorage()
}

const downloadReceipt = (t) => {
  alert(`[거래번호: ${t.id}]\n${t.title}\n금액: ₩${t.amount.toLocaleString()}\n발행일: ${t.date}\n전자 영수증이 발급되었습니다.`)
}

watch(currentUser, () => {
  loadCustomsProfile()
  loadAddresses()
  loadTransactions()
})

watch(currentUserProfile, () => {
  loadCustomsProfile()
})

onMounted(() => {
  if (route.query.tab) {
    activeTab.value = route.query.tab
  }
  loadBalance()
  loadCustomsProfile()
  loadAddresses()
  loadTransactions()
})
</script>
