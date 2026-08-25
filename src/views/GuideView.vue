<template>
  <div class="bg-white">
    <!-- Sub Header Hero Banner -->
    <div class="relative bg-slate-900 py-14 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <span class="text-xs sm:text-sm font-bold tracking-widest text-blue-400 uppercase mb-2 inline-block">
          Shipping & Pricing Guide
        </span>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
          EUC 안내 및 배송 요금표
        </h1>
        <p class="mt-3 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
          투명한 계측과 합리적인 운임 체계로 안전하고 신속한 한-중 물류를 보장합니다.
        </p>

        <!-- Breadcrumb -->
        <div class="mt-6 flex justify-center items-center gap-2 text-xs text-slate-400">
          <router-link to="/" class="hover:text-white flex items-center gap-1">
            <i class="fas fa-home"></i> 홈
          </router-link>
          <span>&gt;</span>
          <span class="text-blue-400 font-semibold">EUC 안내</span>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      
      <!-- Top Notice Cards -->
      <div class="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-6 sm:p-8 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <i class="fas fa-circle-info"></i>
          </div>
          <h2 class="text-lg font-bold text-blue-950">출고 및 발송 필수 안내사항</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-gray-700 pt-2">
          <div class="flex items-start gap-2">
            <i class="fas fa-clock text-blue-500 mt-0.5"></i>
            <span><strong>출고 마감시간:</strong> 매일 오후 <strong>15:30</strong>분까지 발송 확정 건에 한해 당일 출고 처리</span>
          </div>
          <div class="flex items-start gap-2">
            <i class="fas fa-id-card text-blue-500 mt-0.5"></i>
            <span><strong>제출 필수항목:</strong> 개인통관고유부호(사업자통관시 사업자정보), 수령주소, 성함, 연락처</span>
          </div>
          <div class="flex items-start gap-2">
            <i class="fas fa-ban text-red-500 mt-0.5"></i>
            <span><strong>통관 금지품목:</strong> 인화성 물질, 모조품, 동식물 등 (채널 문의 시 상세 안내)</span>
          </div>
          <div class="flex items-start gap-2">
            <i class="fas fa-globe text-blue-500 mt-0.5"></i>
            <span><strong>특수 배송:</strong> EMS, DHL, UPS, FEDEX 및 미국 Amazon-FBA / 일본 배송 요금 별도 문의</span>
          </div>
        </div>
      </div>

      <!-- Table 1: 1일 특송 배송요금표 -->
      <section id="express" class="scroll-mt-24 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-3 border-b-2 border-red-500">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 bg-red-500 text-white text-xs font-black rounded">EXPRESS</span>
            <h3 class="text-xl sm:text-2xl font-black text-gray-900">1일 특송 배송요금표 (항공 특송)</h3>
          </div>
          <span class="text-xs text-red-600 font-bold flex items-center gap-1">
            <i class="fas fa-bolt"></i> 샘플 발송 및 긴급 납품에 가장 적합한 방식
          </span>
        </div>

        <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table class="w-full text-center text-xs sm:text-sm">
            <thead class="bg-slate-900 text-white font-bold">
              <tr>
                <th class="py-3 px-4 w-1/4">구분</th>
                <th class="py-3 px-4 w-1/4">측정기준</th>
                <th class="py-3 px-4 w-1/4">단가 (CNY)</th>
                <th class="py-3 px-4 w-1/4">비고</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">기본료</td>
                <td class="py-3.5 px-4">1 KG</td>
                <td class="py-3.5 px-4 font-black text-red-600 text-base">CNY 70위안</td>
                <td class="py-3.5 px-4 text-gray-500">1KG 미만 시 1KG 적용</td>
              </tr>
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">추가측정</td>
                <td class="py-3.5 px-4">1 KG당 추가</td>
                <td class="py-3.5 px-4 font-bold text-gray-800">CNY 40위안</td>
                <td class="py-3.5 px-4 text-gray-500">1KG 미만 시 1KG 적용</td>
              </tr>
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">기타지역</td>
                <td class="py-3.5 px-4">서울 외 기타 지역</td>
                <td class="py-3.5 px-4 font-bold text-gray-800">CNY 20위안</td>
                <td class="py-3.5 px-4 text-gray-500">건당 추가 요금</td>
              </tr>
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">B/L 발행</td>
                <td class="py-3.5 px-4">발송일 익일 발행</td>
                <td class="py-3.5 px-4 font-bold text-emerald-600">무료 지원</td>
                <td class="py-3.5 px-4 text-gray-500">실시간 화물 추적</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Calculation Info Box -->
        <div class="bg-slate-50 p-5 rounded-xl border border-gray-200 text-xs sm:text-sm space-y-2 text-gray-700">
          <p class="font-bold text-slate-900 flex items-center gap-2">
            <i class="fas fa-calculator text-blue-500"></i>
            <span>부피 / 무게 측정 공식: (가로 &times; 세로 &times; 높이 cm) &divide; 5,000 (부피무게와 실제무게 중 큰 값 적용)</span>
          </p>
          <p class="flex items-center gap-2 text-slate-700">
            <i class="fas fa-truck text-blue-500"></i>
            <span><strong>소요 기일:</strong> 서울 기준 1일 도착 / 기타 지역 +1일 소요</span>
          </p>
          <div class="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
            <div>💡 <strong>예시 1:</strong> 서울 기준 800g 파우치 샘플 = <strong>70위안</strong> / 1일 도착</div>
            <div>💡 <strong>예시 2:</strong> 인천 기준 1,800g 파우치 샘플 = 70 + 40 + 20 = <strong>130위안</strong> / 2일 도착</div>
          </div>
        </div>
      </section>

      <!-- Table 2: 전자상 해운택배 배송요금표 -->
      <section id="sea" class="scroll-mt-24 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-3 border-b-2 border-blue-600">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded">OCEAN</span>
            <h3 class="text-xl sm:text-2xl font-black text-gray-900">전자상 해운택배 배송요금표 (해운 특송)</h3>
          </div>
          <span class="text-xs text-blue-600 font-bold flex items-center gap-1">
            <i class="fas fa-ship"></i> 해외 직구 배송 (전자제품 통관 가능)에 가장 적합한 방식
          </span>
        </div>

        <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table class="w-full text-center text-xs sm:text-sm">
            <thead class="bg-slate-900 text-white font-bold">
              <tr>
                <th class="py-3 px-4 w-1/4">구분</th>
                <th class="py-3 px-4 w-1/4">측정기준</th>
                <th class="py-3 px-4 w-1/4">단가 (CNY)</th>
                <th class="py-3 px-4 w-1/4">비고</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">기본료</td>
                <td class="py-3.5 px-4">1 KG</td>
                <td class="py-3.5 px-4 font-black text-blue-600 text-base">CNY 28위안</td>
                <td class="py-3.5 px-4 text-gray-500">1KG 미만 시 1KG 적용</td>
              </tr>
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">추가측정</td>
                <td class="py-3.5 px-4">1 KG당 추가</td>
                <td class="py-3.5 px-4 font-bold text-gray-800">CNY 8위안</td>
                <td class="py-3.5 px-4 text-gray-500">1KG 미만 시 1KG 적용</td>
              </tr>
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-4 font-bold text-gray-900">B/L 발행</td>
                <td class="py-3.5 px-4">발송일 익일 CJ대한통운 송장 발행</td>
                <td class="py-3.5 px-4 font-bold text-emerald-600">무료 지원</td>
                <td class="py-3.5 px-4 text-gray-500">국내 연계 직배송</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Calculation Info Box -->
        <div class="bg-slate-50 p-5 rounded-xl border border-gray-200 text-xs sm:text-sm space-y-2 text-gray-700">
          <p class="font-bold text-slate-900 flex items-center gap-2">
            <i class="fas fa-calculator text-blue-500"></i>
            <span>부피 / 무게 측정 공식: (가로 &times; 세로 &times; 높이 cm) &divide; 6,000 (부피무게와 실제무게 중 큰 값 적용)</span>
          </p>
          <p class="flex items-center gap-2 text-slate-700">
            <i class="fas fa-ship text-blue-500"></i>
            <span><strong>소요 기일:</strong> 출항 후 7 ~ 10일 도착</span>
          </p>
          <div class="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
            <div>💡 <strong>예시 1:</strong> 800g 파우치 샘플 = <strong>28위안</strong> / 7~10일 도착</div>
            <div>💡 <strong>예시 2:</strong> 1,800g 제품 = 28 + 10(추가) = <strong>38위안</strong> / 7~10일 도착</div>
          </div>
        </div>
      </section>

      <!-- Section 3: Caution & Customs Rule -->
      <section id="forwarding" class="scroll-mt-24 bg-amber-50/80 border border-amber-200 rounded-2xl p-6 sm:p-8">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
            <i class="fas fa-triangle-exclamation text-sm"></i>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-amber-950">
            관세청 통관 규정 및 주의사항 안내
          </h3>
        </div>
        <p class="text-xs sm:text-sm text-amber-900 leading-relaxed">
          관세 규정에 따라 모든 개인 자가사용 택배 발송은 <strong>동일 품목 수량 5개 이내, 총 신고 금액 미화 150달러 이내</strong>(미국발 200달러)가 원칙입니다. 수량 및 금액 초과 시 일반 수입 통관 대상으로 분류될 수 있으며, 이 경우 관세사 수수료 및 관·부가세가 부과될 수 있으니 대량 수입 시에는 사전에 EUC 무역대행팀과 상의해 주시기 바랍니다.
        </p>
      </section>

      <!-- Section 4: CS Box -->
      <section id="cs" class="scroll-mt-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
        <div class="max-w-3xl mx-auto text-center space-y-6">
          <span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            24H CUSTOMER SERVICE
          </span>
          <h3 class="text-2xl sm:text-3xl font-black">
            궁금한 점은 언제든지 문의주세요
          </h3>
          <p class="text-xs sm:text-sm text-slate-300">
            중국 시장조사, 공장 발굴, OEM 제작, 통관 및 특송 운임까지 전문 매니저가 실시간으로 상담해 드립니다.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs sm:text-sm">
            <div class="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
              <i class="fas fa-phone-alt text-blue-400 text-xl mb-2"></i>
              <p class="text-slate-400 text-[11px]">한국 직통전화</p>
              <p class="font-bold text-white mt-1">010-9373-1214</p>
            </div>

            <div class="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
              <i class="fas fa-mobile-screen-button text-blue-400 text-xl mb-2"></i>
              <p class="text-slate-400 text-[11px]">중국 현지폰</p>
              <p class="font-bold text-white mt-1">195-2407-7350</p>
            </div>

            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank" 
              rel="noopener noreferrer"
              class="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center transition block"
              title="카카오톡 공식 채널 바로가기"
            >
              <i class="fas fa-comment text-yellow-400 text-xl mb-2"></i>
              <p class="text-slate-400 text-[11px]">카카오톡 공식채널</p>
              <p class="font-bold text-yellow-300 mt-1">이유씨컴퍼니</p>
            </a>

            <div class="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
              <i class="fab fa-weixin text-green-400 text-xl mb-2"></i>
              <p class="text-slate-400 text-[11px]">위챗(WeChat) ID</p>
              <p class="font-bold text-green-300 mt-1">euchskorea</p>
            </div>
          </div>

          <div class="pt-4 flex flex-col items-center gap-3">
            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank"
              class="px-8 py-3.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition flex items-center gap-2"
            >
              <i class="fas fa-comment"></i>
              <span>카카오톡 1:1 상담창 바로 열기</span>
            </a>
            <p class="text-xs text-slate-400 pt-1">
              이메일 문의: 
              <a href="mailto:lcceuchs@gmail.com" class="text-slate-300 hover:text-white underline font-semibold">lcceuchs@gmail.com</a>
              <span class="mx-1.5 text-slate-500">/</span>
              <a href="mailto:contact@euchs.co.kr" class="text-slate-300 hover:text-white underline font-semibold">contact@euchs.co.kr</a>
            </p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
