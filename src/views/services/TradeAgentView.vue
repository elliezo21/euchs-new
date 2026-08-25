<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-14 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-25 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs sm:text-sm font-bold tracking-wide mb-4">
            <i class="fas fa-industry text-emerald-400"></i>
            <span>OEM · ODM 주문생산 & 전문 무역 대행</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            중국 무역대행 & 공장 소싱<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
              1차 직영 공장 발굴부터 금형/양산까지
            </span>
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            중국 1차 제조 공장 다이렉트 소싱, 금형 사출, 로고 인쇄, 패키지 커스텀, 무역 수출입 계약 및 세관 통관까지 15년 무역 전문가가 A to Z 책임집니다.
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
              <span>1:1 맞춤 제작 상담</span>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400 sm:ml-2">
              <router-link to="/" class="hover:text-white flex items-center gap-1">
                <i class="fas fa-home"></i> 홈
              </router-link>
              <span>&gt;</span>
              <span class="text-slate-300">주요 서비스</span>
              <span>&gt;</span>
              <span class="text-emerald-400 font-semibold">무역대행 OEM/ODM</span>
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
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-building-circle-check"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">1차 직영 공장 발굴 & 단가 네고</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            중간 도매상을 거치지 않고 현지 1차 생산업체와의 직접 미팅 및 최저 단가 협상을 이끌어냅니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-compass-drafting"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">금형 설계 & 시제품 샘플링</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            3D 도면 검토, 사출 금형 개발, 시제품 제작 후 고객 승인을 거쳐 완벽한 품질의 양산을 진행합니다.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4 font-bold">
            <i class="fas fa-file-invoice"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">수출입 통관 & 인증 원스톱</h3>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
            KC 인증 자문, 관세 감면(한-중 FTA 원산지증명서 발급), B/L 및 선적 서류 일체를 전담 처리합니다.
          </p>
        </div>
      </section>

      <!-- 4-Step Process Section -->
      <section class="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8">
        <div class="text-center max-w-2xl mx-auto">
          <span class="text-xs font-bold text-emerald-600 uppercase tracking-widest">Process</span>
          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 mt-1">무역대행 OEM/ODM 제작 절차</h2>
          <p class="text-xs sm:text-sm text-gray-500 mt-2">상담부터 공장 실사, 양산 및 국내 납품까지의 체계적인 프로세스</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">01</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 1</span>
            <h4 class="text-base font-bold text-gray-900">상담 및 공장 소싱</h4>
            <p class="text-xs text-gray-600 mt-1.5">제품 사양서(스펙/도면) 접수 후 최적의 중국 1차 공장 수배 및 단가 비교</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">02</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 2</span>
            <h4 class="text-base font-bold text-gray-900">샘플 제작 & 검증</h4>
            <p class="text-xs text-gray-600 mt-1.5">사제품 샘플 제작, 인쇄/재질/색상 확인 후 고객 피드백 반영 및 최종 승인</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">03</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 3</span>
            <h4 class="text-base font-bold text-gray-900">본 계약 & 양산 검수</h4>
            <p class="text-xs text-gray-600 mt-1.5">무역 계약 체결 후 본 생산 착수, 공장 중간 실사 및 현지 창고 완제품 검품</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
            <span class="text-3xl font-black text-slate-200 absolute right-4 top-3">04</span>
            <span class="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mb-2">STEP 4</span>
            <h4 class="text-base font-bold text-gray-900">통관 & 국내 직납</h4>
            <p class="text-xs text-gray-600 mt-1.5">한-중 FTA 원산지 증명 발행, 세관 정식 수입통관 후 고객 지정 창고 배송</p>
          </div>
        </div>
      </section>

      <!-- Trust Points Section -->
      <section class="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="px-3 py-1 bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full border border-emerald-400/30">
            OEM/ODM CORE VALUES
          </span>
          <h2 class="text-2xl sm:text-3xl font-black">
            이유씨컴퍼니 맞춤 제작의 3대 안전장치
          </h2>
          <p class="text-xs sm:text-sm text-slate-300">
            금형 소유권부터 불량 방지까지 바이어의 권리를 100% 안전하게 보호합니다.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-emerald-400 font-bold text-sm flex items-center gap-2">
              <i class="fas fa-shield-alt"></i>
              <span>금형 소유권 & 독점권 보장</span>
            </div>
            <p class="text-slate-300 leading-relaxed">
              제작된 사출/압출 금형은 계약서상 화주 소유로 귀속되며 제3자 무단 도용 생산을 법적으로 원천 차단합니다.
            </p>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-teal-400 font-bold text-sm flex items-center gap-2">
              <i class="fas fa-check-double"></i>
              <span>생산 중간 실사 & 2단계 검품</span>
            </div>
            <p class="text-slate-300 leading-relaxed">
              양산 중간 공장 방문 실사 및 출하 전 이우 창고 입고 2단계 정밀 검수를 통해 불량 리스크를 제거합니다.
            </p>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <div class="text-cyan-400 font-bold text-sm flex items-center gap-2">
              <i class="fas fa-file-contract"></i>
              <span>정식 무역 계약 & 안전 결제</span>
            </div>
            <p class="text-slate-300 leading-relaxed">
              국내 법인간 정식 세금계산서 발행 및 중국 현지 법인 명의의 무역 계약 체결로 대금 사고 걱정이 없습니다.
            </p>
          </div>
        </div>
      </section>

      <!-- Bottom Wide Call To Action Banner -->
      <section class="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-3xl p-8 sm:p-14 shadow-2xl text-center space-y-6">
        <div class="max-w-2xl mx-auto space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black">
            <i class="fas fa-industry text-yellow-300"></i>
            <span>나만의 브랜드 상품 제작 & 공장 직거래</span>
          </span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            1688 소싱몰에서 제품을 둘러보시거나<br />
            원하는 제작 사양을 전담 MD에게 상담하세요!
          </h2>
          <p class="text-xs sm:text-sm text-white/90 leading-relaxed">
            로고 인쇄부터 패키지 디자인, 신규 금형 사출까지 15년 무역 전문가가 친절히 상담해 드립니다.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
          <router-link
            to="/mall"
            class="px-8 py-4 bg-white hover:bg-slate-100 text-emerald-700 font-black text-sm sm:text-base rounded-2xl shadow-xl transition active:scale-95 flex items-center gap-2"
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
// TradeAgentView: 중국 무역대행 OEM/ODM 서비스 소개 및 1688 소싱몰 연동 가이드
</script>
