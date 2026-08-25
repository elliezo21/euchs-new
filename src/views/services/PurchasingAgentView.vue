<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-14 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-25 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs sm:text-sm font-bold tracking-wide mb-4">
            <i class="fas fa-shopping-cart text-blue-400"></i>
            <span>1688 · 타오바오 · 도매시장 공식 사입 파트너</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            중국 1688 구매대행 &<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              실시간 AI 도매 소싱
            </span>
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            복잡한 중국어 검색과 결제 걱정 없이, 1688 도매가 그대로 한글 검색부터 현지 창고 정밀 검수, 세관 통관까지 이유씨컴퍼니가 원스톱으로 대행합니다.
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
              rel="noopener noreferrer"
              class="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <i class="fas fa-comment text-yellow-400"></i>
              <span>1:1 실시간 무역 상담</span>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400 sm:ml-2">
              <router-link to="/" class="hover:text-white flex items-center gap-1">
                <i class="fas fa-home"></i> 홈
              </router-link>
              <span>&gt;</span>
              <span class="text-slate-300">주요 서비스</span>
              <span>&gt;</span>
              <span class="text-blue-400 font-semibold">1688 구매대행</span>
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
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-credit-card"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">실시간 결제 & 알리페이 대행</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            1688, 타오바오, VVIC 등 중국 전 사이트의 결제를 당일 실시간 고시환율 기준으로 안전하게 대행합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-magnifying-glass-chart"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">현지 창고 정밀 1차 검품</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            이우 직영 창고에 입고되는 즉시 수량, 옵션(색상/사이즈), 파손 및 오배송 여부를 사진과 함께 확인합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-boxes-packing"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">합포장 & 특송 통관 출고</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            여러 판매자에게 주문한 상품을 하나로 합포장 및 완충 보강하여 물류비를 극대화하여 절감해 드립니다.
          </p>
        </div>
      </section>

      <!-- 4-Step Process Section -->
      <section class="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Process</span>
          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 mt-1">1688 수입대행 이용 프로세스</h2>
          <p class="text-xs sm:text-sm text-gray-500 mt-2">1688 소싱몰에서 상품을 담고 결제하면 현지 검수부터 국내 문 앞 도착까지 한 번에 완료됩니다.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">01</span>
            <span class="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-2">STEP 1</span>
            <h4 class="text-base font-bold text-gray-900">1688 상품 소싱 & 장바구니</h4>
            <p class="text-xs text-gray-600 mt-1.5">1688 소싱몰에서 한글로 검색하고 원하는 옵션을 장바구니에 담아 바로 발주 신청합니다.</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">02</span>
            <span class="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-2">STEP 2</span>
            <h4 class="text-base font-bold text-gray-900">현지 발주 & 1차 결제</h4>
            <p class="text-xs text-gray-600 mt-1.5">이유씨 전담 MD가 중국 1688 공장과 재고를 최종 확인하고 알리페이 결제를 진행합니다.</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">03</span>
            <span class="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-2">STEP 3</span>
            <h4 class="text-base font-bold text-gray-900">이우 창고 입고 & 정밀검수</h4>
            <p class="text-xs text-gray-600 mt-1.5">직영 물류센터 입고 후 수량/옵션 100% 실물 검품 및 원산지(MADE IN CHINA) 작업을 진행합니다.</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">04</span>
            <span class="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-2">STEP 4</span>
            <h4 class="text-base font-bold text-gray-900">해운 특송 선적 & 국내 배송</h4>
            <p class="text-xs text-gray-600 mt-1.5">인천/평택 세관 정식 통관 후 CJ대한통운 또는 경동화물로 고객 지정 배송지로 안전하게 직배송됩니다.</p>
          </div>
        </div>
      </section>

      <!-- Comparison / Trust Points -->
      <section class="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="px-3 py-1 bg-blue-500/30 text-blue-300 text-xs font-bold rounded-full border border-blue-400/30">
            WHY EUCHS COMPANY
          </span>
          <h2 class="text-2xl sm:text-3xl font-black">
            이유씨컴퍼니 1688 수입대행이 특별한 이유
          </h2>
          <p class="text-xs sm:text-sm text-slate-300">
            불투명한 수수료와 지연 없이, 모든 과정을 실시간 ERP 대시보드로 투명하게 확인하실 수 있습니다.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-amber-400 text-xl font-bold flex items-center gap-2">
              <i class="fas fa-coins"></i>
              <span>투명한 고시 환율</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              환율 장난 없이 실시간 은행 고시 환율을 기준으로 정확하게 산출하며 모든 견적서가 투명하게 공개됩니다.
            </p>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-emerald-400 text-xl font-bold flex items-center gap-2">
              <i class="fas fa-warehouse"></i>
              <span>이우 직영 물류센터</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              외주 대행이 아닌 중국 이우 현지 직영 창고 운영으로 오배송 및 불량을 한국 선적 전에 100% 걸러냅니다.
            </p>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-sky-400 text-xl font-bold flex items-center gap-2">
              <i class="fas fa-desktop"></i>
              <span>원스톱 ERP 시스템</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              1688 소싱부터 관세청 유니패스 세관 통관 조회, 국내 송장 추적까지 전 과정을 대시보드에서 실시간 조회합니다.
            </p>
          </div>
        </div>
      </section>

      <!-- Bottom Wide Call To Action Banner -->
      <section class="bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white rounded-3xl p-8 sm:p-14 shadow-2xl text-center space-y-6">
        <div class="max-w-2xl mx-auto space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black">
            <i class="fas fa-bolt text-yellow-300"></i>
            <span>지금 바로 1688 도매 사입을 시작하세요</span>
          </span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            1688 실시간 소싱몰에서<br />
            원하는 상품을 한글로 편하게 찾아보세요!
          </h2>
          <p class="text-xs sm:text-sm text-white/90 leading-relaxed">
            AI 실시간 번역과 최저가 공장 연결로 대한민국 최저가 소싱을 경험하실 수 있습니다.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
          <router-link
            to="/mall"
            class="px-8 py-4 bg-white hover:bg-slate-100 text-rose-600 font-black text-sm sm:text-base rounded-2xl shadow-xl transition active:scale-95 flex items-center gap-2"
          >
            <i class="fas fa-shopping-cart text-lg"></i>
            <span>1688 소싱몰에서 바로 상품 담기 ➔</span>
          </router-link>

          <a
            href="http://pf.kakao.com/_xmQWsK/chat"
            target="_blank"
            rel="noopener noreferrer"
            class="px-8 py-4 bg-slate-950/80 hover:bg-slate-950 text-white font-bold text-sm sm:text-base rounded-2xl border border-white/20 transition active:scale-95 flex items-center gap-2"
          >
            <i class="fas fa-comment text-yellow-400 text-lg"></i>
            <span>전담 MD와 1:1 카카오톡 실시간 상담</span>
          </a>
        </div>
      </section>

    </div>

  </div>
</template>

<script setup>
// PurchasingAgentView: 1688 구매대행 서비스 안내 및 1688 소싱몰 연동 가이드
</script>
