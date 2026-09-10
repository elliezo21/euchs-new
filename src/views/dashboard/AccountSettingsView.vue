<template>
  <div class="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 space-y-6">

    <!-- ======================================================== -->
    <!-- [AUTH LOADING] 인증 완료 전 스켈레톤 (FOUC 방지)         -->
    <!-- isAuthLoading이 true인 동안만 표시 — 실제 데이터 없이    -->
    <!-- 틀린 기본값(미인증/0건/일반바이어)을 보여주지 않음       -->
    <!-- ======================================================== -->
    <div v-if="isAuthLoading" class="animate-pulse space-y-6">
      <!-- 헤더 스켈레톤 -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div class="space-y-2">
          <div class="h-5 w-40 bg-gray-200 rounded-full"></div>
          <div class="h-4 w-72 bg-gray-100 rounded-full"></div>
        </div>
        <div class="h-12 w-48 bg-gray-200 rounded-2xl"></div>
      </div>
      <!-- 탭 스켈레톤 -->
      <div class="flex gap-2 pb-1">
        <div class="h-9 w-32 bg-gray-200 rounded-2xl"></div>
        <div class="h-9 w-36 bg-gray-100 rounded-2xl"></div>
        <div class="h-9 w-36 bg-gray-100 rounded-2xl"></div>
        <div class="h-9 w-32 bg-gray-100 rounded-2xl"></div>
      </div>
      <!-- 본문 스켈레톤 -->
      <div class="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
        <div class="h-5 w-48 bg-gray-200 rounded-full"></div>
        <div class="h-4 w-full bg-gray-100 rounded-full"></div>
        <div class="h-4 w-3/4 bg-gray-100 rounded-full"></div>
        <div class="h-4 w-1/2 bg-gray-100 rounded-full"></div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="h-10 bg-gray-100 rounded-xl"></div>
          <div class="h-10 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- [실제 UI] 인증 완료 후에만 렌더링                        -->
    <!-- ======================================================== -->
    <template v-else>

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

      <button
        type="button"
        @click="switchTab('security')"
        class="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        :class="activeTab === 'security' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
      >
        <KeyRound class="w-4 h-4" :class="activeTab === 'security' ? 'text-blue-400' : 'text-gray-400'" />
        <span>계정 보안 / 회원 탈퇴</span>
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
            <!-- 3단계 인증 배지: DB profiles.is_business_verified 단일 기준 -->
            <span
              v-if="verificationStatus === 'verified'"
              class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1"
            >
              <ShieldCheck class="w-3.5 h-3.5" />
              <span>VIP 바이어 (인증 완료)</span>
            </span>
            <span
              v-else-if="verificationStatus === 'pending'"
              class="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1"
            >
              <span>심사 중</span>
            </span>
            <span
              v-else
              class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold flex items-center gap-1"
            >
              <span>미인증</span>
            </span>
          </div>

          <!-- 기본 계정 정보 (읽기 전용: 성명, 이메일) -->
          <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-1 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <span class="text-[11px] text-gray-500 block font-medium">회원 성명</span>
                <span class="font-bold text-gray-900 block truncate">{{ currentUser?.name || currentUser?.user_metadata?.full_name || userDisplayName || '바이어' }}</span>
              </div>
              <div>
                <span class="text-[11px] text-gray-500 block font-medium">아이디 (이메일)</span>
                <span class="font-bold text-gray-900 font-mono block truncate">{{ currentUser?.email || userEmail || '-' }}</span>
              </div>
            </div>
            <p class="text-[10px] text-gray-400 pt-0.5">※ 회원 성명과 이메일은 가입 시 등록된 고유 계정 정보입니다.</p>
          </div>

          <form @submit.prevent="confirmSaveCustoms = true" class="space-y-3.5 text-xs">
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
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
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

            <div>
              <label class="block font-bold text-gray-700 mb-1">사업장 소재지 (주소)</label>
              <input
                type="text"
                v-model="customsProfile.address"
                placeholder="서울특별시 강남구 테헤란로 123 4층"
                class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
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

      <!-- 잔액 3단 표시 카드 -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- 보유 잔액 -->
        <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-1">
          <p class="text-[11px] text-gray-500 font-medium">보유 잔액</p>
          <p class="text-xl font-black font-mono text-gray-900">₩{{ walletBalance.toLocaleString() }}</p>
          <p class="text-[10px] text-gray-400">전체 예치금 잔액</p>
        </div>
        <!-- 출금 신청 중(동결) -->
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-1">
          <p class="text-[11px] text-amber-700 font-medium">출금 신청 중(동결)</p>
          <p class="text-xl font-black font-mono text-amber-700">₩{{ heldBalance.toLocaleString() }}</p>
          <p class="text-[10px] text-amber-600/80">관리자 처리 완료 시 차감</p>
        </div>
        <!-- 사용 가능 잔액 -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-1">
          <p class="text-[11px] text-emerald-700 font-medium">사용 가능 잔액</p>
          <p class="text-xl font-black font-mono text-emerald-700">₩{{ availableBalance.toLocaleString() }}</p>
          <p class="text-[10px] text-emerald-600/80">주문 결제 가능 금액</p>
        </div>
      </div>

      <!-- 액션 버튼 행 -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="showDepositModal = true"
          class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Wallet class="w-3.5 h-3.5" />
          충전하기
        </button>
        <button
          type="button"
          @click="openWithdrawModal"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <ArrowUpFromLine class="w-3.5 h-3.5" />
          출금 신청
        </button>
      </div>

      <!-- 거래 내역 카드 -->
      <div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Receipt class="w-4 h-4 text-emerald-600" />
              <span>예치금 전체 거래 내역</span>
            </h2>
            <p class="text-xs text-gray-500 mt-0.5">충전·결제·환불·출금 전체 이력입니다.</p>
          </div>

          <div class="flex items-center gap-1.5 text-xs flex-wrap">
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
              @click="walletFilter = 'deposit'"
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              :class="walletFilter === 'deposit' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'"
            >
              충전(+)
            </button>
            <button
              type="button"
              @click="walletFilter = 'order_payment'"
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              :class="walletFilter === 'order_payment' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'"
            >
              결제(-)
            </button>
            <button
              type="button"
              @click="walletFilter = 'refund'"
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              :class="walletFilter === 'refund' ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'"
            >
              환불(+)
            </button>
            <button
              type="button"
              @click="walletFilter = 'withdrawal'"
              class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              :class="walletFilter === 'withdrawal' ? 'bg-orange-600 text-white' : 'text-orange-600 hover:bg-orange-50'"
            >
              출금(-)
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase">
              <tr>
                <th class="py-2.5 px-4">거래일시</th>
                <th class="py-2.5 px-4">거래 항목</th>
                <th class="py-2.5 px-4">구분</th>
                <th class="py-2.5 px-4 text-right">변동 금액</th>
                <th class="py-2.5 px-4 text-right">거래 후 잔액</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="isTransactionsLoading">
                <td colspan="5" class="py-8 text-center text-gray-400 text-xs">
                  <span class="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2 align-middle"></span>
                  거래 내역을 불러오는 중...
                </td>
              </tr>
              <tr v-else-if="filteredTransactions.length === 0">
                <td colspan="5" class="py-10 text-center space-y-1">
                  <div class="text-2xl">📋</div>
                  <p class="text-xs text-gray-500 font-medium">거래 내역이 없습니다.</p>
                </td>
              </tr>
              <tr v-for="t in filteredTransactions" :key="t.id" class="hover:bg-gray-50">
                <td class="py-3 px-4 font-mono text-gray-500 text-[11px]">{{ t.date }}</td>
                <td class="py-3 px-4">
                  <div class="font-bold text-gray-900">{{ t.title }}</div>
                  <div v-if="t.orderNo" class="text-[10px] text-gray-400 font-mono">{{ t.orderNo }}</div>
                </td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="getTxTypeBadge(t.rawType)">
                    {{ getTxTypeLabel(t.rawType) }}
                  </span>
                </td>
                <td
                  class="py-3 px-4 text-right font-mono font-bold"
                  :class="t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                >
                  {{ t.amount >= 0 ? '+' : '' }}₩{{ Math.abs(t.amount).toLocaleString() }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold text-gray-800">
                  ₩{{ Number(t.balanceAfter || 0).toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- [TAB 4] 계정 보안 및 비밀번호 변경 / 회원 탈퇴 -->
    <!-- ======================================================== -->
    <div v-if="activeTab === 'security'" class="space-y-6 animate-fade-in">
      <!-- 1. 비밀번호 변경 카드 -->
      <div class="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h2 class="text-base font-bold text-gray-900 flex items-center gap-2">
              <KeyRound class="w-5 h-5 text-indigo-600" />
              <span>로그인 비밀번호 변경</span>
            </h2>
            <p class="text-xs text-gray-500 mt-1">
              계정의 보안을 위해 영문, 숫자를 조합하여 6자 이상의 새 비밀번호를 설정해 주세요.
            </p>
          </div>
          <span v-if="userEmail" class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
            {{ userEmail }}
          </span>
        </div>

        <form @submit.prevent="handleChangePassword" class="space-y-4 max-w-lg">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1.5">새 비밀번호 (6자 이상) *</label>
            <div class="relative">
              <input
                v-model="passwordForm.newPassword"
                :type="showSecurityPassword ? 'text' : 'password'"
                required
                minlength="6"
                placeholder="새로운 비밀번호를 입력하세요"
                class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10"
              />
              <button
                type="button"
                @click="showSecurityPassword = !showSecurityPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
              >
                <i :class="showSecurityPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1.5">새 비밀번호 확인 *</label>
            <div class="relative">
              <input
                v-model="passwordForm.confirmPassword"
                :type="showSecurityPassword ? 'text' : 'password'"
                required
                minlength="6"
                placeholder="새로운 비밀번호를 다시 입력하세요"
                class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-10"
              />
            </div>
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="isPasswordChanging"
              class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <i v-if="isPasswordChanging" class="fas fa-spinner animate-spin"></i>
              <span>비밀번호 변경 저장</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 2. 회원 탈퇴 (Danger Zone) 카드 -->
      <div class="bg-red-50/40 border border-red-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div class="flex items-center gap-2 text-red-700 font-bold text-base">
          <AlertTriangle class="w-5 h-5 text-red-600" />
          <span>회원 탈퇴 (계정 삭제)</span>
        </div>
        
        <p class="text-xs text-red-800 leading-relaxed max-w-2xl">
          회원 탈퇴 시 등록된 사업자 정보, 배송 주소록 및 미사용 예치금 잔액 환불이 제한될 수 있으며, 진행 중인 수입 대행 발주 및 통관 내역 조회가 영구히 중단됩니다.
        </p>

        <div class="pt-2">
          <button
            type="button"
            @click="handleAccountWithdrawal"
            :disabled="isWithdrawing"
            class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <i v-if="isWithdrawing" class="fas fa-spinner animate-spin"></i>
            <span>회원 탈퇴 신청하기</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 신규/수정 배송지 추가 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="showAddressModal"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
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

        <form @submit.prevent="confirmSaveAddress = true" class="space-y-3 text-xs">
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
      class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
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
              @click.prevent="submitDepositRequest"
              :disabled="isSubmittingDeposit"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span v-if="isSubmittingDeposit" class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ isSubmittingDeposit ? '신청 처리 중...' : '충전 신청하기' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- ======================================================== -->
    <!-- 출금 신청 모달                                            -->
    <!-- ======================================================== -->
    <div
      v-if="showWithdrawModal"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpFromLine class="w-4 h-4 text-slate-700" />
            <span>예치금 출금 신청</span>
          </h3>
          <button @click="showWithdrawModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 가용 잔액 안내 -->
        <div class="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-emerald-700 font-medium">출금 가능 잔액</span>
            <span class="text-emerald-800 font-black font-mono">₩{{ availableBalance.toLocaleString() }}</span>
          </div>
          <p class="text-[10px] text-emerald-600/80 mt-0.5">보유 잔액(₩{{ walletBalance.toLocaleString() }}) - 동결(₩{{ heldBalance.toLocaleString() }})</p>
        </div>

        <div class="space-y-3 text-xs">
          <!-- 출금 금액 -->
          <div class="space-y-1">
            <label class="block font-bold text-gray-700">출금 금액 (원)</label>
            <div class="relative">
              <input
                type="number"
                v-model.number="withdrawForm.amount"
                :min="MIN_WITHDRAWAL_AMOUNT"
                :max="availableBalance"
                step="10000"
                placeholder="출금하실 금액을 입력하세요"
                class="w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold text-gray-900 bg-white outline-none focus:ring-2 transition"
                :class="withdrawAmountError
                  ? 'border-rose-400 focus:ring-rose-500/20'
                  : 'border-gray-200 focus:ring-slate-500/20'"
              />
              <span class="absolute right-3.5 top-2.5 text-xs text-gray-400 font-bold">원</span>
            </div>
            <!-- 이중 검증 에러 메시지 -->
            <p v-if="withdrawAmountError" class="text-rose-600 text-[11px] font-medium">{{ withdrawAmountError }}</p>
            <p v-else class="text-[10px] text-gray-400">최소 {{ MIN_WITHDRAWAL_AMOUNT.toLocaleString() }}원 이상</p>
          </div>

          <!-- 은행명 -->
          <div class="space-y-1">
            <label class="block font-bold text-gray-700">은행명</label>
            <input
              type="text"
              v-model="withdrawForm.bankName"
              placeholder="예: 기업은행, 국민은행, 카카오뱅크"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          <!-- 계좌번호 -->
          <div class="space-y-1">
            <label class="block font-bold text-gray-700">계좌번호</label>
            <input
              type="text"
              v-model="withdrawForm.accountNumber"
              placeholder="예: 123-456789-01-234"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono text-gray-900 outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          <!-- 예금주 -->
          <div class="space-y-1">
            <label class="block font-bold text-gray-700">예금주</label>
            <input
              type="text"
              v-model="withdrawForm.accountHolder"
              placeholder="예: 홍길동 (또는 이유씨글로벌)"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          <p class="text-[11px] text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-3">
            * 출금 신청 즉시 해당 금액이 동결됩니다. 관리자가 계좌이체 후 완료처리 시 잔액에서 실제 차감됩니다. 반려 시 동결이 해제됩니다.
          </p>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              @click="showWithdrawModal = false"
              class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              @click="submitWithdrawRequest"
              :disabled="isSubmittingWithdraw || !!withdrawAmountError || !withdrawForm.amount || !withdrawForm.bankName || !withdrawForm.accountNumber || !withdrawForm.accountHolder"
              class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span v-if="isSubmittingWithdraw" class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ isSubmittingWithdraw ? '신청 중...' : '출금 신청하기' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 출금 결과 알림 팝업 (완료/반려)                          -->
    <!-- ======================================================== -->
    <div
      v-if="withdrawNotification"
      class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-center">
        <div class="text-3xl">
          {{ withdrawNotification.status === 'completed' ? '✅' : '❌' }}
        </div>
        <div>
          <h3 class="text-base font-black text-gray-900">
            {{ withdrawNotification.status === 'completed' ? '출금 완료' : '출금 반려' }}
          </h3>
          <p class="text-sm text-gray-600 mt-2 leading-relaxed">{{ withdrawNotification.message }}</p>
          <p v-if="withdrawNotification.adminNote" class="text-xs text-rose-600 mt-2 font-medium bg-rose-50 rounded-xl p-2">
            반려 사유: {{ withdrawNotification.adminNote }}
          </p>
        </div>
        <button
          type="button"
          @click="confirmWithdrawNotification"
          class="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer hover:bg-slate-800 transition"
        >
          확인
        </button>
      </div>
    </div>

    <!-- 토스트 알림 -->
    <Transition name="toast">
      <div
        v-if="accountToast.show"
        class="fixed bottom-6 right-6 z-[130] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2.5"
        :class="accountToast.variant === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'"
      >
        <span>{{ accountToast.variant === 'error' ? '❌' : '✅' }}</span>
        <span>{{ accountToast.message }}</span>
      </div>
    </Transition>

    <!-- ConfirmSaveModal: 주소 삭제 -->
    <ConfirmSaveModal
      v-model="confirmDeleteAddress"
      title="해당 주소지를 삭제할까요?"
      description="삭제 후에는 복구할 수 없습니다."
      variant="red"
      icon="warn"
      confirmText="삭제"
      @confirm="executeDeleteAddress"
    />

    <!-- ConfirmSaveModal: 회원 탈퇴 1차 확인 -->
    <ConfirmSaveModal
      v-model="confirmWithdrawal1"
      title="🚨 정말 회원 탈퇴를 진행하시겠습니까?"
      description="탈퇴 시 사업자 정보 및 배송 주소록이 삭제되고, 미사용 예치금 환불이 제한될 수 있습니다."
      variant="red"
      icon="warn"
      confirmText="계속"
      @confirm="handleWithdrawalStep2"
    />

    <!-- ConfirmSaveModal: 회원 탈퇴 2차 최종 확인 -->
    <ConfirmSaveModal
      v-model="confirmWithdrawal2"
      title="최종 확인: 계정을 영구히 삭제하고 탈퇴하시겠습니까?"
      description="이 작업은 되돌릴 수 없습니다."
      variant="red"
      icon="warn"
      confirmText="탈퇴"
      @confirm="executeWithdrawal"
    />

    <!-- ConfirmSaveModal: 통관 정보 저장 -->
    <ConfirmSaveModal
      v-model="confirmSaveCustoms"
      title="통관 정보를 저장할까요?"
      description="사업자등록번호, PCCC 등 수입통관에 사용됩니다."
      variant="save"
      confirmText="저장"
      @confirm="saveCustomsInfo"
    />

    <!-- ConfirmSaveModal: 배송지 저장 -->
    <ConfirmSaveModal
      v-model="confirmSaveAddress"
      title="배송지를 저장할까요?"
      variant="orange"
      confirmText="저장"
      @confirm="saveAddress"
    />

    </template>
    <!-- /v-else: 인증 완료 후 실제 UI 끝 -->

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Wallet,
  ShieldCheck,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Receipt,
  X,
  KeyRound,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  ArrowUpFromLine
} from 'lucide-vue-next'
import {
  currentUser,
  currentUserProfile,
  userDisplayName,
  userEmail,
  getUserBusinessInfo,
  updateBusinessProfile,
  validateBusinessInfo,
  updateUserPassword,
  withdrawAccount,
  isBusinessVerified,
  verificationStatus,
  fetchUserProfile,
  isAuthLoading
} from '../../lib/auth'
import { supabase, isSupabaseConfigured, isValidUUID } from '../../lib/supabase'
import {
  userBalance,
  heldBalance,
  loadBalance,
} from '../../lib/balanceStore'
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue'

const route = useRoute()
const router = useRouter()

// ============================================================
// 출금 신청 관련 상수 — 변경 시 이 한 곳만 수정
// ============================================================
const MIN_WITHDRAWAL_AMOUNT = 10000

// ============================================================
// PHASE 1: 모든 ref / computed 선언
// ============================================================

const activeTab = ref(route.query.tab || 'address')
const walletBalance = userBalance
const walletFilter = ref('all')
// ConfirmSaveModal 상태
const confirmSaveCustoms = ref(false)
const confirmSaveAddress = ref(false)
const confirmDeleteAddress = ref(false)
const pendingDeleteAddressId = ref(null)
const confirmWithdrawal1 = ref(false)
const confirmWithdrawal2 = ref(false)
const showAddressModal = ref(false)
const showDepositModal = ref(false)
// 출금 신청 모달 상태
const showWithdrawModal = ref(false)
const isSubmittingWithdraw = ref(false)
const withdrawForm = ref({
  amount: 0,
  bankName: '',
  accountNumber: '',
  accountHolder: ''
})
// 출금 결과 알림 팝업
const withdrawNotification = ref(null) // { status, message, adminNote, requestId }
// 토스트 알림
const accountToast = ref({ show: false, message: '', variant: 'success' })
let accountToastTimer = null
// Realtime 채널
let withdrawRealtimeChannel = null

const editingAddressId = ref(null)
const depositAmount = ref(1000000)
const depositDepositorName = ref('')
const isSubmittingDeposit = ref(false)
const isTransactionsLoading = ref(false)
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
  address: '',
  bizCertUrl: '',
  status: 'unverified'
})
const transactions = ref([])
const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})
const showSecurityPassword = ref(false)
const isPasswordChanging = ref(false)
const isWithdrawing = ref(false)

const buyerCustomerId = computed(() => {
  if (!currentUser.value) return 'EUCHS-GUEST'
  const rawId = String(currentUser.value.id || '')
  const cleanSuffix = rawId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'B2B'
  return `EUCHS-${cleanSuffix}`
})

// 가용 잔액 (보유 - 동결)
const availableBalance = computed(() =>
  Math.max(0, (userBalance.value || 0) - (heldBalance.value || 0))
)

// 출금 금액 이중 검증 에러메시지 (최소금액 AND 가용잔액 초과 동시 검사)
const withdrawAmountError = computed(() => {
  const amt = Number(withdrawForm.value.amount || 0)
  if (!amt) return ''
  if (amt < MIN_WITHDRAWAL_AMOUNT) {
    return `최소 출금 금액은 ${MIN_WITHDRAWAL_AMOUNT.toLocaleString()}원 이상입니다.`
  }
  if (amt > availableBalance.value) {
    return `출금 가능 잔액(₩${availableBalance.value.toLocaleString()})을 초과합니다.`
  }
  return ''
})

// 거래 타입별 필터 (deposit/order_payment/refund/withdrawal/all)
const filteredTransactions = computed(() => {
  if (walletFilter.value === 'all') return transactions.value
  return transactions.value.filter(t => t.rawType === walletFilter.value)
})


// ============================================================
// PHASE 2: 함수 정의
// ============================================================

const switchTab = (tabName) => {
  activeTab.value = tabName
  router.replace({ query: { ...route.query, tab: tabName } })
}

const copyBankAccount = () => {
  navigator.clipboard.writeText('190-134321-01-016')
  alert('기업은행 190-134321-01-016 계좌번호가 클립보드에 복사되었습니다.')
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

const loadCustomsProfile = () => {
  const biz = getUserBusinessInfo(currentUser.value) || {}
  const p = currentUserProfile.value || {}
  
  customsProfile.value = {
    companyName: p.company_name || biz.company_name || '',
    bizNumber: p.business_number || biz.business_number || '',
    customsCode: p.pccc || biz.pccc || '',
    contactName: p.representative_name || p.name || biz.name || currentUser.value?.user_metadata?.full_name || currentUser.value?.user_metadata?.name || '',
    contactPhone: p.phone || biz.phone || currentUser.value?.phone || '',
    address: p.address || biz.address || currentUser.value?.user_metadata?.address || '',
    bizCertUrl: p.biz_cert_url || '',
    // 인증 상태: profiles DB 기준 단일화 (user_metadata.business_number 기준 폐기)
    status: p.is_business_verified ? 'verified' : (p.verification_status || 'unverified')
  }

  if (!depositDepositorName.value) {
    depositDepositorName.value = customsProfile.value.companyName || customsProfile.value.contactName || userDisplayName.value || ''
  }
}

// 거래 타입별 라벨
function getTxTypeLabel(rawType) {
  const map = {
    deposit: '예치금 충전',
    order_payment: '발주 결제',
    shipping_payment: '운임·통관 결제',
    refund: '환불',
    withdrawal: '예치금 출금',
    manual_add: '관리자 지급',
    manual_sub: '관리자 차감'
  }
  return map[rawType] || rawType || '기타'
}

// 거래 타입별 배지 색상
function getTxTypeBadge(rawType) {
  const map = {
    deposit:          'bg-blue-100 text-blue-800 border border-blue-200',
    order_payment:    'bg-rose-100 text-rose-800 border border-rose-200',
    shipping_payment: 'bg-purple-100 text-purple-800 border border-purple-200',
    refund:           'bg-emerald-100 text-emerald-800 border border-emerald-200',
    withdrawal:       'bg-orange-100 text-orange-800 border border-orange-200',
    manual_add:       'bg-teal-100 text-teal-800 border border-teal-200',
    manual_sub:       'bg-gray-100 text-gray-800 border border-gray-200'
  }
  return map[rawType] || 'bg-slate-100 text-slate-700'
}

// 토스트 표시 헬퍼
function showAccountToast(message, variant = 'success') {
  clearTimeout(accountToastTimer)
  accountToast.value = { show: true, message, variant }
  accountToastTimer = setTimeout(() => {
    accountToast.value.show = false
  }, 4000)
}

// transactions 테이블 + localStorage deposit_requests를 합쳐서 최신순 표시
const loadTransactions = async () => {
  isTransactionsLoading.value = true
  const user = currentUser.value
  let dbRows = []

  // 1. Supabase transactions 테이블 조회
  if (isSupabaseConfigured() && user) {
    try {
      const isUUID = user.id && isValidUUID(user.id)
      const userMail = user.email ? String(user.email).trim().toLowerCase() : ''

      let q = supabase
        .from('transactions')
        .select('id, created_at, type, amount, balance_after, order_no, description')
        .order('created_at', { ascending: false })
        .limit(200)

      if (isUUID) {
        q = q.eq('user_id', user.id)
      } else if (userMail) {
        q = q.eq('user_email', userMail)
      }

      const { data, error } = await q
      if (!error && Array.isArray(data)) {
        dbRows = data.map(r => ({
          id: r.id,
          date: r.created_at ? new Date(r.created_at).toLocaleString('ko-KR') : '-',
          title: r.description || getTxTypeLabel(r.type),
          orderNo: r.order_no || null,
          rawType: r.type,
          amount: Number(r.amount || 0),
          balanceAfter: Number(r.balance_after || 0),
          createdAt: r.created_at
        }))
      }
    } catch (e) {
      console.warn('[loadTransactions] Supabase 조회 오류:', e)
    }
  }

  // 2. localStorage euchs_deposit_requests (승인된 충전내역 — DB 없는 환경 폴백 병합)
  try {
    const raw = localStorage.getItem('euchs_deposit_requests')
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        const localRows = list
          .filter(t => t.status === 'approved') // 승인 완료된 것만
          .map(t => ({
            id: 'local_' + (t.id || t.createdAt),
            date: t.createdAt ? new Date(t.createdAt).toLocaleString('ko-KR') : '-',
            title: `예치금 무통장 입금 충전 (${t.depositorName || t.depositor_name || '입금자'})`,
            orderNo: t.id || null,
            rawType: 'deposit',
            amount: Number(t.amount || 0),
            balanceAfter: Number(t.amount || 0),
            createdAt: t.createdAt || t.created_at || new Date().toISOString()
          }))
        // DB에 없는 로컬 항목만 추가 (중복 방지)
        const dbIds = new Set(dbRows.map(r => String(r.id)))
        for (const row of localRows) {
          if (!dbIds.has(String(row.id))) dbRows.push(row)
        }
      }
    }
  } catch (e) {}

  // 3. 최신순 정렬
  dbRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  transactions.value = dbRows
  isTransactionsLoading.value = false
}

// ============================================================
// 무통장 입금 충전 신청 제출
// — 이 시점에 customsProfile, depositDepositorName, depositAmount 모두 선언 완료
// ============================================================
const submitDepositRequest = async () => {
  const amount = Number(depositAmount.value || 0)
  if (!amount || amount <= 0) {
    alert('충전하실 금액을 0원 이상 선택하거나 입력해 주세요.')
    return
  }

  const rawDepositor = (depositDepositorName.value || '').trim() || customsProfile.value?.companyName || customsProfile.value?.contactName || currentUser.value?.name || currentUser.value?.user_metadata?.name || userDisplayName.value || ''
  if (!rawDepositor) {
    alert('실제 입금하실 입금자명을 입력해 주세요.')
    return
  }

  isSubmittingDeposit.value = true

  try {
    // UUID 정규식 검증: 정확한 36자리 UUID가 아니면 무조건 null 할당 (Postgres 400 원천 차단)
    const isUUID = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    const targetUserId = isUUID(currentUser.value?.id) ? currentUser.value.id : null

    // UUID 포맷 ID 생성 (deposit_requests.id가 TEXT PK이거나 UUID PK일 때 모두 완벽 대응)
    const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    const buyerName = currentUser.value?.name || currentUser.value?.user_metadata?.name || customsProfile.value?.companyName || userDisplayName.value || '바이어'
    const buyerEmail = currentUser.value?.email || ''
    const nowIso = new Date().toISOString()

    const req = {
      id: generatedId,
      dbId: generatedId,
      createdAt: nowIso,
      created_at: nowIso,
      user_id: targetUserId,
      userId: targetUserId,
      buyerName,
      buyer_name: buyerName,
      buyerEmail,
      buyer_email: buyerEmail,
      depositorName: rawDepositor,
      depositor_name: rawDepositor,
      amount,
      bankName: '기업은행',
      bank_name: '기업은행',
      accountNumber: '190-134321-01-016',
      account_number: '190-134321-01-016',
      accountHolder: '이유씨컴퍼니(조해성)',
      account_holder: '이유씨컴퍼니(조해성)',
      status: 'pending'
    }

    // 1. Supabase DB INSERT (Primary) — non-UUID일 경우 user_id는 null로 처리되어 400 에러 원천 방어
    if (isSupabaseConfigured()) {
      try {
        const depositPayload = {
          id: generatedId,
          user_id: targetUserId,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          depositor_name: rawDepositor,
          amount: Number(amount || 0),
          bank_name: '기업은행',
          account_number: '190-134321-01-016',
          account_holder: '이유씨컴퍼니(조해성)',
          status: 'pending',
          created_at: nowIso
        }

        const { data, error } = await supabase
          .from('deposit_requests')
          .insert([depositPayload])
          .select()

        if (!error && data && data.length > 0) {
          req.id = data[0].id || req.id
          req.dbId = data[0].id
        } else if (error) {
          console.warn('[DepositRequest] Supabase insert with ID notice, retrying without explicit id:', error.message)
          const { id: _, ...payloadWithoutId } = depositPayload
          const { data: retryData, error: retryError } = await supabase
            .from('deposit_requests')
            .insert([payloadWithoutId])
            .select()

          if (retryError) {
            console.error('[DepositRequest] Supabase INSERT error:', retryError)
            alert('서버 등록 중 오류가 발생했습니다: ' + (retryError.message || retryError.details || ''))
            return
          }
          if (retryData && retryData.length > 0) {
            req.id = retryData[0].id || req.id
            req.dbId = retryData[0].id
          }
        }
      } catch (err) {
        console.warn('[AccountSettingsView] Supabase deposit_requests insert warning:', err)
      }
    }

    // 2. 로컬 스토리지 즉시 캐시 저장 (Fallback & 빠른 UI 렌더링)
    try {
      const raw = localStorage.getItem('euchs_deposit_requests')
      const list = raw ? JSON.parse(raw) : []
      list.unshift(req)
      localStorage.setItem('euchs_deposit_requests', JSON.stringify(list))
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('euchs-deposit-request', { detail: req }))
    window.dispatchEvent(new CustomEvent('euchs-balance-update'))
    window.dispatchEvent(new Event('storage'))

    alert(`무통장 입금 충전 신청이 정상 접수되었습니다.\n\n- 신청금액: ₩${amount.toLocaleString()}원\n- 입금계좌: 기업은행 190-134321-01-016 (이유씨컴퍼니(조해성))\n- 입금자명: ${rawDepositor}\n\n입금 확인 후 관리자가 승인하면 예치금 잔액에 즉시 반영됩니다.`)
    showDepositModal.value = false
    loadTransactions()
  } catch (globalErr) {
    console.error('[DepositRequest] Unexpected error:', globalErr)
    alert('신청 처리 중 예기치 못한 오류가 발생했습니다: ' + (globalErr.message || globalErr))
  } finally {
    isSubmittingDeposit.value = false
  }
}

const saveCustomsInfo = async () => {
  // 1. 형식 검증 실행
  const validation = validateBusinessInfo(customsProfile.value)

  try {
    // 2. 저장은 검증 여부와 무관하게 항상 실행 (임시저장 허용)
    await updateBusinessProfile({
      company_name: customsProfile.value.companyName,
      business_number: customsProfile.value.bizNumber,
      pccc: customsProfile.value.customsCode,
      name: customsProfile.value.contactName,
      phone: customsProfile.value.contactPhone,
      address: customsProfile.value.address
    })
  } catch (err) {
    // Fail-Fast: 저장 자체 실패 시 에러 표시, 성공 토스트 금지
    console.error('[saveCustomsInfo] 저장 실패:', err)
    alert('저장 중 오류가 발생했습니다: ' + (err.message || err))
    return
  }

  // 3. 검증 실패: 저장은 됐지만 자동승인 안 됨 — 에러 항목 명시
  if (!validation.valid) {
    alert(
      '통관 정보가 저장되었습니다. (심사 대기 유지)\n\n' +
      '아래 항목을 수정하면 즉시 인증완료로 전환됩니다:\n' +
      validation.errors.map(e => '• ' + e).join('\n')
    )
    loadCustomsProfile()
    return
  }

  // 4. 검증 통과: 자동 인증완료 처리 (관리자 approveMember와 동일한 DB 페이로드)
  const user = currentUser.value
  if (isSupabaseConfigured() && user) {
    try {
      const approvePayload = {
        is_business_verified: true,
        verification_status: 'verified',
        tier: 'business',
        updated_at: new Date().toISOString()
      }
      let dbResult = null
      if (user.id && isValidUUID(user.id)) {
        const { data, error } = await supabase.from('profiles').update(approvePayload).eq('id', user.id).select('id')
        if (error) throw error
        dbResult = data
      } else if (user.email) {
        const { data, error } = await supabase.from('profiles').update(approvePayload).eq('email', String(user.email).trim().toLowerCase()).select('id')
        if (error) throw error
        dbResult = data
      }

      // Fail-Fast: 0 rows affected
      if (!dbResult || dbResult.length === 0) {
        throw new Error('인증 상태 업데이트 실패: 해당 프로필을 찾을 수 없습니다. (0 rows affected)')
      }

      // 인메모리 갱신
      if (currentUserProfile.value) {
        currentUserProfile.value.is_business_verified = true
        currentUserProfile.value.verification_status = 'verified'
        currentUserProfile.value.tier = 'business'
      }
      // localStorage 관리자 목록도 동기화
      try {
        const rawMembers = localStorage.getItem('euchs_admin_members')
        if (rawMembers) {
          const members = JSON.parse(rawMembers)
          const idx = members.findIndex(m => m.id === user.id || m.email === user.email)
          if (idx >= 0) {
            members[idx].verificationStatus = 'verified'
            members[idx].tier = 'business'
            localStorage.setItem('euchs_admin_members', JSON.stringify(members))
            window.dispatchEvent(new CustomEvent('euchs-member-update', { detail: members }))
          }
        }
      } catch (e) {}

      alert('✅ 통관 정보가 저장되고 사업자 인증이 완료되었습니다!\n이제 모든 서비스를 이용하실 수 있습니다.')
    } catch (approveErr) {
      // 저장은 성공했으나 자동승인 DB 업데이트 실패
      console.error('[saveCustomsInfo] 자동 승인 DB 업데이트 실패:', approveErr)
      alert('정보가 저장되었지만 자동 인증 처리 중 오류가 발생했습니다.\n관리자에게 문의해주세요.\n오류: ' + (approveErr.message || approveErr))
    }
  } else {
    // Supabase 미설정 환경 (로컬 fallback)
    alert('통관 & 세무 증빙 정보가 저장되었습니다.')
  }

  loadCustomsProfile()
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
  pendingDeleteAddressId.value = id
  confirmDeleteAddress.value = true
}

const executeDeleteAddress = () => {
  const id = pendingDeleteAddressId.value
  if (!id) return
  addressList.value = addressList.value.filter(a => a.id !== id)
  saveAddressesToStorage()
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


const handleChangePassword = async () => {
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 6) {
    alert('새 비밀번호는 최소 6자 이상이어야 합니다.')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.')
    return
  }

  isPasswordChanging.value = true
  try {
    await updateUserPassword(passwordForm.value.newPassword)
    alert('✅ 비밀번호가 성공적으로 변경되었습니다.')
    passwordForm.value = { newPassword: '', confirmPassword: '' }
  } catch (err) {
    console.error('Password change error:', err)
    alert(`비밀번호 변경 실패: ${err.message || '잠시 후 다시 시도해 주세요.'}`)
  } finally {
    isPasswordChanging.value = false
  }
}

const handleAccountWithdrawal = async () => {
  confirmWithdrawal1.value = true
}

const handleWithdrawalStep2 = () => {
  // 1차 확인 후 2차 최종 확인 모달
  confirmWithdrawal2.value = true
}

const executeWithdrawal = async () => {
  isWithdrawing.value = true
  try {
    await withdrawAccount()
    alert('회원 탈퇴가 정상적으로 처리되었습니다.\n그동안 이유씨컴퍼니를 이용해 주셔서 감사합니다.')
    router.push('/')
  } catch (err) {
    console.error('Withdrawal error:', err)
    alert(`탈퇴 처리 중 오류가 발생했습니다: ${err.message || '관리자에게 문의해 주세요.'}`)
  } finally {
    isWithdrawing.value = false
  }
}

// ============================================================
// 출금 신청 관련 함수
// ============================================================

/** 출금 신청 모달 열기 (폼 초기화) */
function openWithdrawModal() {
  withdrawForm.value = { amount: 0, bankName: '', accountNumber: '', accountHolder: '' }
  showWithdrawModal.value = true
}

/** 출금 신청 제출 → request_withdrawal RPC 호출 */
async function submitWithdrawRequest() {
  if (withdrawAmountError.value) return

  const user = currentUser.value
  if (!user) {
    showAccountToast('로그인이 필요합니다.', 'error')
    return
  }

  if (!isSupabaseConfigured()) {
    showAccountToast('Supabase 연결이 필요합니다.', 'error')
    return
  }

  const { amount, bankName, accountNumber, accountHolder } = withdrawForm.value
  if (!amount || !bankName || !accountNumber || !accountHolder) {
    showAccountToast('모든 항목을 입력해주세요.', 'error')
    return
  }

  isSubmittingWithdraw.value = true
  try {
    const isUUID = user.id && isValidUUID(user.id)
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_user_id:        isUUID ? user.id : null,
      p_user_email:     user.email || '',
      p_amount:         Number(amount),
      p_bank_name:      bankName.trim(),
      p_account_number: accountNumber.trim(),
      p_account_holder: accountHolder.trim()
    })

    if (error) throw error
    if (!data?.success) throw new Error('출금 신청 처리 실패')

    // 성공: 모달 닫기, 잔액 갱신, 토스트
    showWithdrawModal.value = false
    await loadBalance(true) // held_balance 포함 즉시 갱신
    showAccountToast('출금신청요청이 완료되었습니다.')
  } catch (err) {
    console.error('[submitWithdrawRequest] Error:', err)
    showAccountToast(err.message || '출금 신청 중 오류가 발생했습니다.', 'error')
  } finally {
    isSubmittingWithdraw.value = false
  }
}

/**
 * 출금 결과 알림 팝업 닫기 + customer_notified_at 기록
 * mark_withdraw_notified RPC를 호출 (SECURITY DEFINER — 본인 건 여부를 DB에서 검증)
 * 테이블에 고객 UPDATE RLS는 없음 — 이 함수가 유일한 업데이트 경로
 */
async function confirmWithdrawNotification() {
  const notif = withdrawNotification.value
  const requestId = notif?.requestId || null
  // 팝업 즉시 닫기 (UX 우선)
  withdrawNotification.value = null

  if (requestId && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('mark_withdraw_notified', {
        p_request_id: requestId
      })

      if (error) {
        console.error('[confirmWithdrawNotification] RPC 오류:', error)
        showAccountToast('알림 확인 기록에 실패했습니다. 새로고침 시 알림이 다시 표시될 수 있습니다.', 'error')
        return
      }

      // data.already_notified: true면 이미 기록된 건 — 정상 (멱등)
      console.debug('[confirmWithdrawNotification] 완료:', data)
    } catch (e) {
      console.error('[confirmWithdrawNotification] 예외:', e)
    }
  }

  // 잔액 및 거래내역 갱신
  await loadBalance(true)
  await loadTransactions()
}

/**
 * 미확인 출금 결과 건 체크 — onMounted 시 실행
 * customer_notified_at이 null인 completed/rejected 건이 있으면 팝업 표시
 */
async function checkPendingWithdrawNotifications() {
  const user = currentUser.value
  if (!user || !isSupabaseConfigured()) return

  try {
    const isUUID = user.id && isValidUUID(user.id)
    let q = supabase
      .from('withdraw_requests')
      .select('id, status, amount, admin_note, customer_notified_at')
      .in('status', ['completed', 'rejected'])
      .is('customer_notified_at', null)
      .order('processed_at', { ascending: false })
      .limit(1)

    if (isUUID) q = q.eq('user_id', user.id)
    else q = q.eq('user_email', user.email || '')

    const { data, error } = await q
    if (!error && Array.isArray(data) && data.length > 0) {
      const req = data[0]
      withdrawNotification.value = {
        requestId: req.id,
        status: req.status,
        message: req.status === 'completed'
          ? '출금신청이 완료되었습니다. 신청하신 계좌를 확인해주세요.'
          : '출금신청이 반려되었습니다. 동결됐던 금액은 다시 사용 가능합니다.',
        adminNote: req.admin_note || null
      }
    }
  } catch (e) {
    console.warn('[checkPendingWithdrawNotifications]:', e)
  }
}

/** Supabase Realtime 구독 — withdraw_requests 변경 감지 */
function setupWithdrawRealtime() {
  if (!isSupabaseConfigured()) return

  const user = currentUser.value
  if (!user) return

  const channelName = `customer_withdraw_listener_${user.id || user.email || 'anon'}`
  if (withdrawRealtimeChannel) {
    supabase.removeChannel(withdrawRealtimeChannel)
    withdrawRealtimeChannel = null
  }

  withdrawRealtimeChannel = supabase
    .channel(channelName)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'withdraw_requests'
    }, async (payload) => {
      const updated = payload?.new
      if (!updated) return

      // 이 유저의 건인지 확인
      const isUUID = user.id && isValidUUID(user.id)
      const isMine = isUUID
        ? updated.user_id === user.id
        : updated.user_email === user.email

      if (!isMine) return

      // customer_notified_at이 이미 기록된 건은 무시 (재노출 방지)
      if (updated.customer_notified_at) return

      if (updated.status === 'completed' || updated.status === 'rejected') {
        withdrawNotification.value = {
          requestId: updated.id,
          status: updated.status,
          message: updated.status === 'completed'
            ? '출금신청이 완료되었습니다. 신청하신 계좌를 확인해주세요.'
            : '출금신청이 반려되었습니다. 동결됐던 금액은 다시 사용 가능합니다.',
          adminNote: updated.admin_note || null
        }
        // 잔액 즉시 갱신
        await loadBalance(true)
      }
    })
    .subscribe()
}

// ============================================================
// PHASE 3: watch / onMounted 등록
// ============================================================

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab) activeTab.value = newTab
  },
  { immediate: true }
)

watch(currentUser, async (newVal) => {
  if (newVal) {
    await fetchUserProfile(newVal)
  }
  loadCustomsProfile()
  loadAddresses()
  loadTransactions()
  setupWithdrawRealtime()
  checkPendingWithdrawNotifications()
})

watch(currentUserProfile, () => {
  loadCustomsProfile()
})

onMounted(async () => {
  if (route.query.tab) {
    activeTab.value = route.query.tab
  }
  if (currentUser.value) {
    await fetchUserProfile(currentUser.value)
  }
  loadBalance()
  loadCustomsProfile()
  loadAddresses()
  loadTransactions()
  // 출금 신청 Realtime 구독 + 미확인 알림 체크
  setupWithdrawRealtime()
  checkPendingWithdrawNotifications()
  window.addEventListener('euchs-auth-changed', onAccountAuthChanged)
})

onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onAccountAuthChanged)
  if (withdrawRealtimeChannel) {
    supabase.removeChannel(withdrawRealtimeChannel)
    withdrawRealtimeChannel = null
  }
  clearTimeout(accountToastTimer)
})

// ----------------------------------------------------
// Auth 상태 변경 핸들러 — 로그아웃 시 계정 정보 즉시 초기화
// ----------------------------------------------------
const onAccountAuthChanged = (e) => {
  if (!e.detail?.user) {
    // 로그아웃: 사업자 정보, 배송지 목록, 거래 내역 즉시 초기화
    customsProfile.value = {
      companyName: '',
      bizNumber: '',
      customsCode: '',
      contactName: '',
      contactPhone: '',
      bizCertUrl: '',
      status: 'unverified'
    }
    addressList.value = []
    transactions.value = []
    // 출금 채널 정리
    if (withdrawRealtimeChannel) {
      supabase.removeChannel(withdrawRealtimeChannel)
      withdrawRealtimeChannel = null
    }
    withdrawNotification.value = null
  } else {
    // 로그인 또는 계정 전환: 해당 계정 데이터 재로드
    loadCustomsProfile()
    loadAddresses()
    loadTransactions()
    loadBalance()
    setupWithdrawRealtime()
    checkPendingWithdrawNotifications()
  }
}
</script>
