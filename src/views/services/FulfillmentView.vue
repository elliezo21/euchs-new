<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-12 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-25 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs sm:text-sm font-bold tracking-wide mb-4">
            <i class="fas fa-boxes-packing text-purple-400"></i>
            <span>스마트스토어 · 쿠팡 · 크로스보더 이커머스 전용</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            중국 현지 3PL 풀필먼트<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300">
              보관부터 개별 소비자 직배송까지
            </span>
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            중국 이우 직영 물류센터에서 안전하게 보관하고, 셀러님의 쇼핑몰 주문서(엑셀/API)와 연동하여 국내 최종 소비자에게 바로 송장을 부착하여 발송해 드립니다.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <router-link 
              to="/mall" 
              class="px-6 py-3.5 bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 hover:from-rose-700 hover:to-orange-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm sm:text-base active:scale-95"
            >
              <i class="fas fa-store"></i>
              <span>1688 소싱몰 바로가기</span>
              <i class="fas fa-arrow-right text-xs"></i>
            </router-link>

            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank"
              class="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-xl shadow-lg shadow-purple-600/30 hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm sm:text-base"
            >
              <i class="fas fa-comment"></i>
              <span>3PL 사전 제휴 상담 문의 (카카오톡)</span>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400">
              <router-link to="/" class="hover:text-white flex items-center gap-1">
                <i class="fas fa-home"></i> 홈
              </router-link>
              <span>&gt;</span>
              <span class="text-slate-300">주요 서비스</span>
              <span>&gt;</span>
              <span class="text-purple-400 font-semibold">3PL 풀필먼트</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      
      <!-- Key Features 3 Cards -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-warehouse"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">안전한 창고 보관 & 재고 관리</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            중국 현지 창고 보관료를 획기적으로 절감하고, 실시간 입출고 및 재고 현황을 체계적으로 공유합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-file-excel"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">주문서 당일 출고 & 송장 발행</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            매일 주문 마감 건까지 당일 소분 포장 후 CJ대한통운 등 국내 택배 송장을 즉시 연동 발행합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-box-open"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">에어캡 완충 & 맞춤 합포장</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            파손 위험 상품을 위한 에어캡, 박스 덧댐 포장 및 사은품 동봉 등 셀러 맞춤형 패키징을 제공합니다.
          </p>
        </div>
      </section>

      <!-- 4-Step Process -->
      <section class="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="text-xs font-bold text-purple-600 uppercase tracking-widest">Process</span>
          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 mt-1">3PL 배송대행 프로세스</h2>
          <p class="text-xs sm:text-sm text-gray-500 mt-2">창고 입고부터 고객 직발송까지 자동화된 풀필먼트</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">01</span>
            <span class="inline-block px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded mb-2">STEP 1</span>
            <h4 class="text-base font-bold text-gray-900">현지 재고 입고</h4>
            <p class="text-xs text-gray-600 mt-1.5">공장 생산품 또는 1688 사입품을 EUC 이우 현지 창고로 입고 및 로케이션 적재</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">02</span>
            <span class="inline-block px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded mb-2">STEP 2</span>
            <h4 class="text-base font-bold text-gray-900">주문서 접수</h4>
            <p class="text-xs text-gray-600 mt-1.5">스마트스토어/쿠팡 등 쇼핑몰 판매 주문서(수취인, 통관번호) 일괄 접수</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">03</span>
            <span class="inline-block px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded mb-2">STEP 3</span>
            <h4 class="text-base font-bold text-gray-900">피킹 · 포장 · 송장</h4>
            <p class="text-xs text-gray-600 mt-1.5">주문별 상품 피킹, 검수 후 에어캡 완충 포장 및 국내 택배 송장 부착</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">04</span>
            <span class="inline-block px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded mb-2">STEP 4</span>
            <h4 class="text-base font-bold text-gray-900">해운 직발송 & 배송</h4>
            <p class="text-xs text-gray-600 mt-1.5">선적 당일 출항 후 7~10일 내 세관 통관 및 소비자 문 앞 직배송 완료</p>
          </div>
        </div>
      </section>

      <!-- Coming Soon Notice Card & Kakao Consultation CTA -->
      <section class="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-8 sm:p-14 shadow-2xl border border-purple-800/50 text-center relative overflow-hidden">
        <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-2xl mx-auto space-y-6 relative z-10">
          
          <div class="w-16 h-16 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
            <i class="fas fa-clock"></i>
          </div>

          <div class="space-y-2">
            <span class="px-3.5 py-1 bg-amber-400 text-slate-950 text-xs font-black rounded-full uppercase tracking-wider">
              SERVICE PREPARATION (COMING SOON)
            </span>
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black">
              현재 3PL 자동화 풀필먼트 시스템<br />
              <span class="text-purple-300">고도화 준비 중입니다.</span>
            </h2>
          </div>

          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            더욱 편리한 API 연동 주문서 접수 및 실시간 재고 관리 시스템을 구축하고 있습니다.<br class="hidden sm:inline" />
            3PL 풀필먼트 사전 계약 및 단가 협의를 희망하시는 화주분들께서는 유선 또는 카카오톡 1:1 상담으로 문의해 주시면 친절히 안내해 드리겠습니다.
          </p>

          <!-- Contact & CTA Buttons -->
          <div class="pt-4 flex flex-wrap items-center justify-center gap-4">
            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank"
              class="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2 transform active:scale-98"
            >
              <i class="fas fa-comment text-lg"></i>
              <span>카카오톡으로 사전 제휴 문의하기</span>
            </a>

            <a 
              href="tel:010-9373-1214" 
              class="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base rounded-2xl border border-white/20 transition-all flex items-center gap-2"
            >
              <i class="fas fa-phone-alt"></i>
              <span>유선 상담 (010-9373-1214)</span>
            </a>
          </div>

          <p class="text-[11px] text-slate-400 pt-2">
            ※ 오픈 시 알림 및 특가 혜택을 원하시는 대표님께서는 카카오톡 채널을 추가해 주세요.
          </p>
        </div>
      </section>

    </div>

  </div>
</template>

<script setup>
// 3PL Service Preparation View
</script>
