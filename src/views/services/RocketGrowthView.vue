<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-14 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-25 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 text-xs sm:text-sm font-bold tracking-wide mb-4">
            <i class="fas fa-rocket text-red-400"></i>
            <span>쿠팡 로켓그로스 & 밀크런 공식 규격 입고 대행</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            쿠팡 로켓그로스 입고 대행<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-yellow-300">
              바코드 라벨링 · 파레트 · 밀크런 직납
            </span>
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            중국 생산지에서 쿠팡 물류센터(CFS/FC) 규격에 완벽히 맞춘 상품 바코드 부착, 박스 라벨링, 파레트 래핑, 전수 검품 후 밀크런 배차 입고까지 원스톱으로 처리합니다.
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
              <span>1:1 로켓그로스 입고 상담</span>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400 sm:ml-2">
              <router-link to="/" class="hover:text-white flex items-center gap-1">
                <i class="fas fa-home"></i> 홈
              </router-link>
              <span>&gt;</span>
              <span class="text-slate-300">주요 서비스</span>
              <span>&gt;</span>
              <span class="text-red-400 font-semibold">쿠팡 로켓그로스</span>
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
          <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-barcode"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">정밀 바코드 & 한글 라벨 부착</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            쿠팡 물류센터 필수 바코드(SKU 바코드, EAN-13), 박스 부착 라벨 및 KC 인증/수입원 표기 라벨을 중국 현지에서 오차 없이 부착합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-pallet"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">쿠팡 규격 파레트 래핑 적재</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            쿠팡 표준 1100×1100 파레트 적재 높이 및 스트레치 필름 5회 이상 래핑 규격을 준수하여 입고 거부 및 반송 위험을 100% 차단합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-truck-ramp-box"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">신속 통관 후 밀크런 트럭 직납</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            인천/평택 세관 당일 통관 후 쿠팡 밀크런 트럭 인계 또는 직납 전용 화물차량을 배차하여 지정된 FC 센터로 정확히 입고합니다.
          </p>
        </div>
      </section>

      <!-- 4-Step Process Section -->
      <section class="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="text-xs font-bold text-red-600 uppercase tracking-widest">Process</span>
          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 mt-1">로켓그로스 입고 대행 절차</h2>
          <p class="text-xs sm:text-sm text-gray-500 mt-2">중국 현지 공장 생산지부터 쿠팡 센터 입고 완료까지의 4단계</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">01</span>
            <span class="inline-block px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded mb-2">STEP 1</span>
            <h4 class="text-base font-bold text-gray-900">현지 창고 입고 & 검품</h4>
            <p class="text-xs text-gray-600 mt-1.5">중국 공장 제품을 이우 직영 창고로 집하하여 파손 및 수량 1차 전수 검수</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">02</span>
            <span class="inline-block px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded mb-2">STEP 2</span>
            <h4 class="text-base font-bold text-gray-900">바코드 · 라벨링 가공</h4>
            <p class="text-xs text-gray-600 mt-1.5">화주가 전달한 쿠팡 바코드 및 박스 라벨 출력 부착, 세트 포장 작업</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">03</span>
            <span class="inline-block px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded mb-2">STEP 3</span>
            <h4 class="text-base font-bold text-gray-900">해운 선적 & 사업자 통관</h4>
            <p class="text-xs text-gray-600 mt-1.5">EUC 전용 컨테이너 선적, 인천 세관 도착 즉시 빠른 사업자 수입 통관</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">04</span>
            <span class="inline-block px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded mb-2">STEP 4</span>
            <h4 class="text-base font-bold text-gray-900">밀크런/직납 센터 입고</h4>
            <p class="text-xs text-gray-600 mt-1.5">쿠팡 밀크런 트럭 인계 또는 전용 차량 직납 배차로 최종 입고 승인 확인</p>
          </div>
        </div>
      </section>

      <!-- Checklist Section -->
      <section class="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="px-3 py-1 bg-red-500/30 text-red-300 text-xs font-bold rounded-full border border-red-400/30">
            COUPANG LOGISTICS CHECKLIST
          </span>
          <h2 class="text-2xl sm:text-3xl font-black">
            쿠팡 물류센터 입고 거부 방지 체크리스트
          </h2>
          <p class="text-xs sm:text-sm text-slate-300">
            까다로운 쿠팡의 검수 기준을 100% 충족하도록 현지 창고에서 철저히 점검합니다.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-red-400 font-bold text-sm flex items-center gap-2">
              <i class="fas fa-check-circle"></i>
              <span>바코드 인쇄 가독성 100% 검증</span>
            </div>
            <p class="text-slate-300 leading-relaxed">
              바코드 번짐, 훼손 방지를 위한 감열/유포지 라벨 사용 및 스캐너 실측 테스트 후 출고합니다.
            </p>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-amber-400 font-bold text-sm flex items-center gap-2">
              <i class="fas fa-check-circle"></i>
              <span>박스 라벨 & 부착 위치 준수</span>
            </div>
            <p class="text-slate-300 leading-relaxed">
              쿠팡 박스 라벨을 박스 정면 우측 상단 등 가이드라인 규격 위치에 정확히 부착합니다.
            </p>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-emerald-400 font-bold text-sm flex items-center gap-2">
              <i class="fas fa-check-circle"></i>
              <span>파레트 래핑 및 전복 방지</span>
            </div>
            <p class="text-slate-300 leading-relaxed">
              지정 파레트(1100×1100) 규격 및 코너 엣지 보호대 보강으로 흔들림 없는 완벽한 고정을 보장합니다.
            </p>
          </div>
        </div>
      </section>

      <!-- Bottom Wide Call To Action Banner -->
      <section class="bg-gradient-to-r from-red-600 via-amber-600 to-orange-500 text-white rounded-3xl p-8 sm:p-14 shadow-2xl text-center space-y-6">
        <div class="max-w-2xl mx-auto space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black">
            <i class="fas fa-rocket text-yellow-300"></i>
            <span>쿠팡 로켓그로스 사입 & 가공 원스톱</span>
          </span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            1688 상품 소싱부터 쿠팡 센터 직납까지<br />
            이유씨컴퍼니가 가장 확실하게 대행합니다!
          </h2>
          <p class="text-xs sm:text-sm text-white/90 leading-relaxed">
            1688 소싱몰에서 상품을 고르고, 로켓그로스 입고 옵션을 선택하시면 현지 라벨링부터 파레트 입고까지 일사천리로 진행됩니다.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
          <router-link
            to="/mall"
            class="px-8 py-4 bg-white hover:bg-slate-100 text-red-600 font-black text-sm sm:text-base rounded-2xl shadow-xl transition active:scale-95 flex items-center gap-2"
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
// RocketGrowthView: 쿠팡 로켓그로스 서비스 소개 및 1688 소싱몰 연동 가이드
</script>
