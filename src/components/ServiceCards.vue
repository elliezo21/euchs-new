<template>
  <section id="services" class="py-16 sm:py-24 bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Section Title Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-600 uppercase mb-2">EUC Service</h2>
        <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
          멋진일을 좋은 사람과 함께하는 EUC
        </p>
        <div class="mt-4 w-12 h-1 bg-blue-600 mx-auto rounded-full"></div>
      </div>

      <!-- 4 Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        
        <!-- Card 1: 쿠팡 배송대행 / 로켓배송 -->
        <div class="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col border border-gray-100">
          <router-link to="/services/rocket-growth" class="relative h-60 w-full overflow-hidden bg-slate-100 block">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/coupangbn2.png" 
              alt="쿠팡 로켓 배송 입고 대행"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <span class="inline-block px-2.5 py-1 bg-red-500/90 text-white text-xs font-bold rounded mb-2 self-start">
                쿠팡 입고 대행
              </span>
              <h3 class="text-lg font-bold text-white leading-snug">쿠팡 로켓그로스 & 밀크런</h3>
              <p class="text-xs text-slate-200 mt-1 line-clamp-2">
                중국 생산지에서 쿠팡 물류창고 입고 규격에 맞춘 바코드 부착 및 직납 서비스
              </p>
            </div>
          </router-link>
          <div class="p-5 flex-grow flex flex-col justify-between bg-white">
            <ul class="text-xs text-gray-600 space-y-1.5 mb-4">
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 입고 라벨/바코드 부착</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 팰릿 패키징 규격 준수</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 검수 및 밀크런 직납 지원</li>
            </ul>
            <router-link 
              to="/services/rocket-growth" 
              class="block w-full text-center py-2.5 px-4 bg-gray-100 hover:bg-red-600 hover:text-white text-gray-800 text-xs font-semibold rounded-lg transition"
            >
              상담 문의하기 &rarr;
            </router-link>
          </div>
        </div>

        <!-- Card 2: 구매대행이란? -->
        <div class="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col border border-gray-100">
          <router-link to="/services/purchasing-agent" class="relative h-60 w-full overflow-hidden bg-slate-100 block">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/m_bnr_img3.jpg" 
              alt="구매대행 안내"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <span class="inline-block px-2.5 py-1 bg-blue-600/90 text-white text-xs font-bold rounded mb-2 self-start">
                구매대행
              </span>
              <h3 class="text-lg font-bold text-white leading-snug">구매대행이란?</h3>
              <p class="text-xs text-slate-200 mt-1 line-clamp-2">
                중국에서 구매하기 어려운 상품을 대신 구매하고 고객님께 배송해 드리는 서비스
              </p>
            </div>
          </router-link>
          <div class="p-5 flex-grow flex flex-col justify-between bg-white">
            <ul class="text-xs text-gray-600 space-y-1.5 mb-4">
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 1688 / 타오바오 결제 대행</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 현지 창고 도착 후 1차 검품</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 항공/해운 맞춤 특송 출고</li>
            </ul>
            <router-link 
              to="/services/purchasing-agent" 
              class="block w-full text-center py-2.5 px-4 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-800 text-xs font-semibold rounded-lg transition"
            >
              구매대행 신청하기 &rarr;
            </router-link>
          </div>
        </div>

        <!-- Card 3: 무역대행이란? -->
        <div class="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col border border-gray-100">
          <router-link to="/services/trade-agent" class="relative h-60 w-full overflow-hidden bg-slate-100 block">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/m_bnr_img2.jpg" 
              alt="무역대행 안내"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <span class="inline-block px-2.5 py-1 bg-emerald-600/90 text-white text-xs font-bold rounded mb-2 self-start">
                OEM / ODM
              </span>
              <h3 class="text-lg font-bold text-white leading-snug">무역대행이란?</h3>
              <p class="text-xs text-slate-200 mt-1 line-clamp-2">
                중국 공장 핸들링과 시장조사까지 원스탑 무역업무를 EUC에서 대행
              </p>
            </div>
          </router-link>
          <div class="p-5 flex-grow flex flex-col justify-between bg-white">
            <ul class="text-xs text-gray-600 space-y-1.5 mb-4">
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 현지 공장 발굴 & 단가 협상</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 샘플 제작 및 금형/양산 관리</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 포워딩 & 통관 서류 원스톱</li>
            </ul>
            <router-link 
              to="/services/trade-agent" 
              class="block w-full text-center py-2.5 px-4 bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-800 text-xs font-semibold rounded-lg transition"
            >
              무역대행 문의하기 &rarr;
            </router-link>
          </div>
        </div>

        <!-- Card 4: 3PL 풀필먼트 물류 -->
        <div class="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col border border-gray-100">
          <router-link to="/services/3pl-fulfillment" class="relative h-60 w-full overflow-hidden bg-slate-100 block">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/drbs20260702.png" 
              alt="3PL 물류배송대행"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <span class="inline-block px-2.5 py-1 bg-purple-600/90 text-white text-xs font-bold rounded mb-2 self-start">
                3PL 풀필먼트
              </span>
              <h3 class="text-lg font-bold text-white leading-snug">3PL 배송 대행 서비스</h3>
              <p class="text-xs text-slate-200 mt-1 line-clamp-2">
                중국 현지 물류창고 보관, 분류, 소분 포장, 송장 부착, 직발송 시스템
              </p>
            </div>
          </router-link>
          <div class="p-5 flex-grow flex flex-col justify-between bg-white">
            <ul class="text-xs text-gray-600 space-y-1.5 mb-4">
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 안전한 창고 보관 & 재고 관리</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 주문서 연동 개별 소비자 직발송</li>
              <li class="flex items-center gap-1.5"><i class="fas fa-check text-blue-500"></i> 합포장 & 에어캡 완충 포장</li>
            </ul>
            <router-link 
              to="/services/3pl-fulfillment"
              class="block w-full text-center py-2.5 px-4 bg-gray-100 hover:bg-purple-600 hover:text-white text-gray-800 text-xs font-semibold rounded-lg transition"
            >
              3PL 제휴 문의하기 &rarr;
            </router-link>
          </div>
        </div>

      </div>

    </div>
  </section>
</template>
