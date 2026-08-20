<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Banner -->
    <div class="relative bg-slate-900 py-12 sm:py-20 text-white overflow-hidden">
      <!-- Background pattern & gradient -->
      <div class="absolute inset-0 opacity-25 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -left-20 -top-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs sm:text-sm font-bold tracking-wide mb-4">
            <i class="fas fa-crown text-yellow-400"></i>
            <span>EUC 현지 직영 1:1 맞춤 시장조사 & 투어</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            세계 최대의 도매시장<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-amber-300">
              중국 이우(푸텐)시장 투어
            </span>
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            공항 픽업부터 전담 무역 통역 가이드, 호텔 예약 안내, 현지 샘플 사입 및 귀국 후 수입 통관까지!<br class="hidden sm:inline">
            15년 업력의 이유씨컴퍼니가 성공적인 비즈니스를 완벽하게 서포트합니다.
          </p>

          <!-- Breadcrumb & Anchor Button -->
          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a 
              href="#apply-form" 
              class="px-6 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm sm:text-base"
            >
              <i class="fas fa-calendar-check"></i>
              <span>이우시장 투어 신청하기</span>
              <i class="fas fa-arrow-down text-xs"></i>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400">
              <router-link to="/" class="hover:text-white flex items-center gap-1">
                <i class="fas fa-home"></i> 홈
              </router-link>
              <span>&gt;</span>
              <span class="text-blue-400 font-semibold">이우시장투어</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Container (2-Column Layout) -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left Main Content Column (68% - 8 cols) -->
        <div class="lg:col-span-8 space-y-12">
          
          <!-- Section 1: 왜 이우(푸텐) 시장인가요? -->
          <section class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg">
                <i class="fas fa-fire text-amber-300"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-blue-600 uppercase tracking-wider">Why Yiwu Market?</span>
                <h2 class="text-xl sm:text-2xl font-black text-gray-900">왜 이우(푸텐) 시장을 가야 할까요?</h2>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Card 1 -->
              <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition">
                <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-lg mb-3">
                  <i class="fas fa-city"></i>
                </div>
                <h3 class="text-base font-bold text-gray-900">여의도 2.5배 규모</h3>
                <p class="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  총 면적 550만㎡, 7만 5천 개 이상의 점포와 210만여 종의 전 세계 최대 소상품 클러스터
                </p>
              </div>

              <!-- Card 2 -->
              <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition">
                <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-lg mb-3">
                  <i class="fas fa-box-open"></i>
                </div>
                <h3 class="text-base font-bold text-gray-900">소량 주문 & 샘플 사입 가능</h3>
                <p class="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  공장 직영 점포에서 박스 단위 소량 사입 및 샘플 즉시 확보 가능 (MOQ 부담 최소화)
                </p>
              </div>

              <!-- Card 3 -->
              <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg mb-3">
                  <i class="fas fa-handshake"></i>
                </div>
                <h3 class="text-base font-bold text-gray-900">1:1 전담 전문 통역 가이드</h3>
                <p class="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  단순 언어 통역을 넘어 단가 네고, 공장 확인, 결제 및 계약까지 무역 전문 인력 동행
                </p>
              </div>

              <!-- Card 4 -->
              <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition">
                <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-lg mb-3">
                  <i class="fas fa-truck-ramp-box"></i>
                </div>
                <h3 class="text-base font-bold text-gray-900">EUC 현지 지사 원스톱 물류</h3>
                <p class="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  사입한 상품을 EUC 이우 현지 창고로 집하 후 검품, 원산지 표기, 특송 통관까지 일괄 처리
                </p>
              </div>
            </div>
          </section>

          <!-- Section 2: 푸텐시장 구역별 가이드 (1기~5기) -->
          <section class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <div class="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg">
                  <i class="fas fa-map-location-dot"></i>
                </div>
                <div>
                  <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">District Guide</span>
                  <h2 class="text-xl sm:text-2xl font-black text-gray-900">이우 푸텐시장 1기~5기 구역별 안내</h2>
                </div>
              </div>
              <span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                영업시간: 09:00 ~ 17:00 (연중무휴)
              </span>
            </div>

            <!-- Districts Accordion / Cards -->
            <div class="space-y-3">
              
              <!-- 1기 -->
              <div class="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white hover:border-blue-400 transition">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2.5">
                    <span class="px-2.5 py-1 bg-blue-600 text-white text-xs font-black rounded-lg">1기 (1区)</span>
                    <h3 class="text-base font-bold text-gray-900">완구, 조화, 공예품, 액세서리</h3>
                  </div>
                  <span class="text-xs text-blue-600 font-semibold">약 10,000개 점포</span>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <strong>주요 취급:</strong> 어린이 완구, 봉제인형, 드론/RC카, 조화 및 화훼, 크리스탈/도자기 공예품, 인테리어 액자, 쥬얼리 액세서리 부자재
                </p>
              </div>

              <!-- 2기 -->
              <div class="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white hover:border-blue-400 transition">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2.5">
                    <span class="px-2.5 py-1 bg-sky-600 text-white text-xs font-black rounded-lg">2기 (2区)</span>
                    <h3 class="text-base font-bold text-gray-900">가방, 캐리어, 시계, 하드웨어, 주방/가전</h3>
                  </div>
                  <span class="text-xs text-sky-600 font-semibold">약 9,000개 점포</span>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <strong>주요 취급:</strong> 여행용 캐리어, 백팩/핸드백, 손목시계/벽시계, 공구 및 철물 하드웨어, 전기전자 소형가전, 텀블러/주방용품
                </p>
              </div>

              <!-- 3기 -->
              <div class="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white hover:border-blue-400 transition">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2.5">
                    <span class="px-2.5 py-1 bg-teal-600 text-white text-xs font-black rounded-lg">3기 (3区)</span>
                    <h3 class="text-base font-bold text-gray-900">문구, 사무용품, 안경, 스포츠/피트니스, 지퍼</h3>
                  </div>
                  <span class="text-xs text-teal-600 font-semibold">약 7,000개 점포</span>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <strong>주요 취급:</strong> 필기구, 팬시 문구류, 화방용품, 선글라스/안경테, 헬스/요가/스포츠용품, 지퍼 및 의류 단추 부자재
                </p>
              </div>

              <!-- 4기 -->
              <div class="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white hover:border-blue-400 transition">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2.5">
                    <span class="px-2.5 py-1 bg-emerald-600 text-white text-xs font-black rounded-lg">4기 (4区)</span>
                    <h3 class="text-base font-bold text-gray-900">양말, 모자, 장갑, 언더웨어, 벨트, 일상잡화</h3>
                  </div>
                  <span class="text-xs text-emerald-600 font-semibold">약 16,000개 점포</span>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <strong>주요 취급:</strong> 양말/스타킹, 패션 모자, 스카프, 넥타이, 속옷 및 이지웨어, 타월/수건, 벨트, 가발, 신발 부자재
                </p>
              </div>

              <!-- 5기 -->
              <div class="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white hover:border-blue-400 transition">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2.5">
                    <span class="px-2.5 py-1 bg-purple-600 text-white text-xs font-black rounded-lg">5기 (5区)</span>
                    <h3 class="text-base font-bold text-gray-900">수입상품관, 침구류, 커튼/원단, 자동차용품</h3>
                  </div>
                  <span class="text-xs text-purple-600 font-semibold">약 8,000개 점포</span>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <strong>주요 취급:</strong> 수입 식품/화장품관, 침구 세트, 패브릭 커튼, 인테리어 원단, 차량용 인테리어 및 악세서리
                </p>
              </div>

            </div>
          </section>

          <!-- Section 3: 추천 3박 4일 투어 일정 가이드 -->
          <section class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg">
                <i class="fas fa-route"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Tour Schedule</span>
                <h2 class="text-xl sm:text-2xl font-black text-gray-900">추천 3박 4일 이우 시장조사 표준 일정</h2>
              </div>
            </div>

            <div class="space-y-4">
              <!-- Day 1 -->
              <div class="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div class="w-16 sm:w-20 shrink-0 text-center">
                  <span class="inline-block px-2.5 py-1 bg-slate-900 text-white font-black text-xs rounded-lg">DAY 1</span>
                  <span class="block text-[11px] text-gray-500 mt-1">입국 & 체크인</span>
                </div>
                <div class="text-xs sm:text-sm text-gray-700 space-y-1">
                  <p class="font-bold text-gray-900">항저우 / 상하이 공항 도착 및 이우 호텔 픽업</p>
                  <p class="text-gray-600">
                    전용 차량으로 이우 호텔 이동 및 체크인, 이유씨컴퍼니 담당 매니저와 사전 미팅 (타깃 아이템 및 동선 최종 조율)
                  </p>
                </div>
              </div>

              <!-- Day 2 -->
              <div class="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div class="w-16 sm:w-20 shrink-0 text-center">
                  <span class="inline-block px-2.5 py-1 bg-blue-600 text-white font-black text-xs rounded-lg">DAY 2</span>
                  <span class="block text-[11px] text-gray-500 mt-1">푸텐시장 집중</span>
                </div>
                <div class="text-xs sm:text-sm text-gray-700 space-y-1">
                  <p class="font-bold text-gray-900">푸텐시장 1~3기 집중 사입 & 단가 네고</p>
                  <p class="text-gray-600">
                    전문 무역 가이드와 함께 관심 구역 점포 방문, MOQ 및 포장 규격 확인, 샘플 구매 및 현장 사진/카탈로그 수집
                  </p>
                </div>
              </div>

              <!-- Day 3 -->
              <div class="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div class="w-16 sm:w-20 shrink-0 text-center">
                  <span class="inline-block px-2.5 py-1 bg-blue-600 text-white font-black text-xs rounded-lg">DAY 3</span>
                  <span class="block text-[11px] text-gray-500 mt-1">4~5기 & 지사 미팅</span>
                </div>
                <div class="text-xs sm:text-sm text-gray-700 space-y-1">
                  <p class="font-bold text-gray-900">푸텐시장 4~5기 조사 & 이유씨 지사 발주 미팅</p>
                  <p class="text-gray-600">
                    전문 스트리트 시장 추가 조사 후 EUC 중국 지사 방문, 수집된 샘플 검토 및 정식 발주 계약/통관 스케줄 확정
                  </p>
                </div>
              </div>

              <!-- Day 4 -->
              <div class="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div class="w-16 sm:w-20 shrink-0 text-center">
                  <span class="inline-block px-2.5 py-1 bg-slate-900 text-white font-black text-xs rounded-lg">DAY 4</span>
                  <span class="block text-[11px] text-gray-500 mt-1">공항 샌딩</span>
                </div>
                <div class="text-xs sm:text-sm text-gray-700 space-y-1">
                  <p class="font-bold text-gray-900">호텔 체크아웃 및 공항 샌딩 (귀국)</p>
                  <p class="text-gray-600">
                    전용 차량으로 공항 샌딩, 귀국 후 EUC 한국 본부와 실시간 발주 생산/출고 현황 공유
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 4: 트립닷컴(Trip.com) 항공권 & 호텔 예약 바로가기 배너 -->
          <section class="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-800/60">
            <div class="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div class="relative z-10 space-y-6">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl">
                    <i class="fas fa-plane-departure"></i>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-blue-300 uppercase tracking-widest">Partner Booking</span>
                    <h2 class="text-xl sm:text-2xl font-black">항공권 & 이우 추천 호텔 예약 안내</h2>
                  </div>
                </div>
                <a 
                  href="https://kr.trip.com/flights/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-xs px-3 py-1 rounded-full bg-blue-800/80 hover:bg-blue-700 text-blue-200 border border-blue-700 transition flex items-center gap-1.5"
                >
                  <span>트립닷컴(Trip.com) 제휴 바로가기</span>
                  <i class="fas fa-external-link-alt text-[10px]"></i>
                </a>
              </div>

              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                중국 출장 시 가장 편리한 <strong>항저우 소산 공항(HGH)</strong> 또는 <strong>상하이 푸동 공항(PVG)</strong> 항공권과 푸텐시장 인근 추천 비즈니스 호텔을 직접 간편하게 예약하실 수 있습니다.
              </p>

              <!-- Hotel Cards Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Hotel 1 -->
                <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition flex flex-col justify-between">
                  <div>
                    <span class="text-[10px] text-amber-300 font-bold">인기 비즈니스 호텔</span>
                    <h4 class="text-sm font-bold text-white mt-1">이우 햄튼 바이 힐튼</h4>
                    <p class="text-[11px] text-slate-300 mt-0.5">Hampton by Hilton Yiwu</p>
                    <p class="text-xs text-slate-400 mt-2 leading-relaxed">푸텐시장 인근 가성비 & 비즈니스 호텔</p>
                  </div>
                  <a 
                    href="https://www.trip.com/w/460kyooRuV2?Allianceid=10012962&SID=328288213&trip_sub1=이우햄튼바이힐튼&trip_sub3=D19208723" 
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-4 block w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-center text-xs font-bold rounded-lg transition shadow"
                  >
                    호텔 최저가 예약 &rarr;
                  </a>
                </div>

                <!-- Hotel 2 -->
                <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition flex flex-col justify-between">
                  <div>
                    <span class="text-[10px] text-amber-300 font-bold">5성급 럭셔리 호텔</span>
                    <h4 class="text-sm font-bold text-white mt-1">이우 샹그릴라 호텔</h4>
                    <p class="text-[11px] text-slate-300 mt-0.5">Shangri-La Yiwu</p>
                    <p class="text-xs text-slate-400 mt-2 leading-relaxed">이우 중심가 위치, 최고급 5성급 비즈니스 호텔</p>
                  </div>
                  <a 
                    href="https://www.trip.com/w/psFuMFkRuV2?Allianceid=10012962&SID=328288213&trip_sub1=이우샹그릴라&trip_sub3=D19208716" 
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-4 block w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-center text-xs font-bold rounded-lg transition shadow"
                  >
                    호텔 최저가 예약 &rarr;
                  </a>
                </div>

                <!-- Flight Booking Card -->
                <div class="bg-gradient-to-br from-amber-500/20 to-yellow-600/20 backdrop-blur-md rounded-2xl p-4 border border-amber-400/30 hover:bg-amber-500/25 transition flex flex-col justify-between">
                  <div>
                    <span class="text-[10px] text-amber-300 font-bold">항공권 특가</span>
                    <h4 class="text-sm font-bold text-white mt-1">중국 항공권 실시간 예매</h4>
                    <p class="text-[11px] text-amber-200 mt-1">인천 ↔ 항저우 / 상하이</p>
                    <p class="text-xs text-slate-300 mt-2">대한항공, 아시아나, 중국동방항공 등</p>
                  </div>
                  <a 
                    href="https://kr.trip.com/flights/" 
                    target="_blank"
                    class="mt-4 block w-full py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 text-center text-xs font-black rounded-lg transition shadow"
                  >
                    트립닷컴 항공권 찾기 &rarr;
                  </a>
                </div>
              </div>

              <div class="text-[11px] text-slate-400 flex items-center gap-2">
                <i class="fas fa-info-circle text-blue-400"></i>
                <span>※ 호텔 예약 대행을 원하실 경우, 우측 신청서의 [호텔 예약 지원]을 체크해 주시면 현지 제휴 단가로 예약 지원해 드립니다.</span>
              </div>
            </div>
          </section>

        </div>

        <!-- Right Sticky Application Form Column (32% - 4 cols) -->
        <div id="apply-form" class="lg:col-span-4 lg:sticky lg:top-24 scroll-mt-24">
          <div class="bg-white rounded-3xl p-6 sm:p-7 border-2 border-blue-600/20 shadow-2xl space-y-6">
            
            <!-- Form Header -->
            <div class="border-b border-gray-100 pb-4">
              <div class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-[11px] font-black rounded-full mb-2">
                ESTIMATE & APPLY
              </div>
              <h3 class="text-xl font-black text-gray-900 tracking-tight">
                투어 신청 및 실시간 견적
              </h3>
              <p class="text-xs text-gray-500 mt-1">
                원하시는 서비스를 선택하시면 예상 비용이 자동 계산됩니다.
              </p>
            </div>

            <!-- Form Body -->
            <form @submit.prevent="submitTourApplication" class="space-y-5">
              
              <!-- 1. 신청자 기본 정보 -->
              <div class="space-y-3">
                <label class="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                  신청자 정보 <span class="text-red-500">*</span>
                </label>
                <div>
                  <input 
                    v-model="form.name" 
                    type="text" 
                    required 
                    placeholder="성함 / 회사명 (예: 홍길동)"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition"
                  />
                </div>
                <div>
                  <input 
                    v-model="form.phone" 
                    type="tel" 
                    required 
                    placeholder="연락처 (예: 010-1234-5678)"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition"
                  />
                </div>
                <div>
                  <input 
                    v-model="form.targetItem" 
                    type="text" 
                    placeholder="조사 희망 품목 (예: 생활잡화, 판촉물, 완구)"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition"
                  />
                </div>
              </div>

              <!-- 2. 공항 픽업 서비스 옵션 (Checkbox Toggle) -->
              <div class="border border-gray-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <label class="flex items-center justify-between cursor-pointer">
                  <span class="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900">
                    <i class="fas fa-car-side text-blue-600"></i>
                    <span>공항 픽업 / 샌딩 서비스</span>
                  </span>
                  <input 
                    v-model="form.usePickup" 
                    type="checkbox" 
                    class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <!-- Detailed Pickup Options when checked -->
                <div v-if="form.usePickup" class="pt-2 border-t border-gray-200 space-y-3 text-xs">
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">공항 선택</label>
                    <select 
                      v-model="form.pickupAirport"
                      class="w-full p-2 rounded-lg border border-gray-300 bg-white text-xs font-medium focus:border-blue-600 outline-none"
                    >
                      <option value="hangzhou">항저우 소산 공항 (HGH) - 편도 99,000원</option>
                      <option value="shanghai">상하이 푸동 공항 (PVG) - 편도 180,000원</option>
                      <option value="yiwu">이우 공항 / 고속철역 - 편도 40,000원</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">차량 규격 선택</label>
                    <select 
                      v-model="form.vehicleType"
                      class="w-full p-2 rounded-lg border border-gray-300 bg-white text-xs font-medium focus:border-blue-600 outline-none"
                    >
                      <option value="sedan">5인승 비즈니스 세단 (기본)</option>
                      <option value="van">7인승 럭셔리 밴 (단체/짐 다량 +30,000원)</option>
                    </select>
                  </div>

                  <div class="grid grid-cols-2 gap-2 pt-1">
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input v-model="form.pickupArrival" type="checkbox" class="w-3.5 h-3.5 rounded text-blue-600" />
                      <span class="text-[11px] font-medium text-gray-700">도착 픽업 (공항→호텔)</span>
                    </label>
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input v-model="form.pickupDeparture" type="checkbox" class="w-3.5 h-3.5 rounded text-blue-600" />
                      <span class="text-[11px] font-medium text-gray-700">복귀 샌딩 (호텔→공항)</span>
                    </label>
                  </div>

                  <!-- Date Inputs (2 Columns: Arrival & Return) -->
                  <div class="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label class="block text-[11px] font-semibold text-gray-600 mb-1">
                        도착 날짜 <span v-if="form.pickupArrival" class="text-blue-600">*</span>
                      </label>
                      <input 
                        v-model="form.arrivalDate" 
                        type="date" 
                        @click="openDatePicker($event)"
                        @focus="openDatePicker($event)"
                        :disabled="!form.pickupArrival"
                        class="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-xs font-medium focus:border-blue-600 outline-none cursor-pointer hover:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-gray-600 mb-1">
                        복귀 날짜 <span v-if="form.pickupDeparture" class="text-blue-600">*</span>
                      </label>
                      <input 
                        v-model="form.returnDate" 
                        type="date" 
                        @click="openDatePicker($event)"
                        @focus="openDatePicker($event)"
                        :disabled="!form.pickupDeparture"
                        class="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-xs font-medium focus:border-blue-600 outline-none cursor-pointer hover:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. 통역 / 가이드 서비스 옵션 (Checkbox Toggle) -->
              <div class="border border-gray-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <label class="flex items-center justify-between cursor-pointer">
                  <span class="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900">
                    <i class="fas fa-user-tie text-blue-600"></i>
                    <span>1:1 무역 전담 통역 가이드</span>
                  </span>
                  <input 
                    v-model="form.useGuide" 
                    type="checkbox" 
                    class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <!-- Detailed Guide Options when checked -->
                <div v-if="form.useGuide" class="pt-2 border-t border-gray-200 space-y-3 text-xs">
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">
                      통역 기간 (1일당 150,000원)
                    </label>
                    <select 
                      v-model="form.guideDays"
                      class="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-xs font-medium focus:border-blue-600 outline-none cursor-pointer"
                    >
                      <option :value="1">1일 (당일 시장조사) - 150,000원</option>
                      <option :value="2">2일 (표준 코스) - 300,000원</option>
                      <option :value="3">3일 (심층 조사 & 미팅) - 450,000원</option>
                      <option :value="4">4일 (전 구역 정밀 조사) - 600,000원</option>
                      <option value="custom">5일 이상 (사전 협의 - 별도 안내)</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">통역 전문 분야</label>
                    <select 
                      v-model="form.guideCategory"
                      class="w-full p-2 rounded-lg border border-gray-300 bg-white text-xs font-medium focus:border-blue-600 outline-none"
                    >
                      <option value="general">생활잡화 / 주방 / 판촉물</option>
                      <option value="fashion">패션의류 / 원단 / 액세서리</option>
                      <option value="digital">전자제품 / IT기기 / 소형가전</option>
                      <option value="toy">완구 / 조화 / 인테리어 공예품</option>
                      <option value="industrial">산업재 / 공구 / 금형 사출</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 4. 기타 무료 및 부가 옵션 -->
              <div class="space-y-2 text-xs">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.supportHotel" type="checkbox" class="w-3.5 h-3.5 rounded text-blue-600" />
                  <span class="text-gray-700">이우 현지 호텔 예약 대행 지원 (무료)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.supportFactory" type="checkbox" class="w-3.5 h-3.5 rounded text-blue-600" />
                  <span class="text-gray-700">공장 방문 미팅 및 공장 수배 필요</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.support1688" type="checkbox" class="w-3.5 h-3.5 rounded text-blue-600" />
                  <span class="text-gray-700">사전 1688 온라인 비교 데이터 요청</span>
                </label>
              </div>

              <!-- 5. 실시간 예상 견적 합계 박스 -->
              <div class="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 sm:p-5 rounded-2xl space-y-3">
                <div class="flex items-center justify-between text-xs text-slate-300">
                  <span>선택 옵션 소계</span>
                  <span>{{ calculatedDetails }}</span>
                </div>
                <div class="border-t border-white/20 pt-2 flex items-baseline justify-between">
                  <span class="text-xs sm:text-sm font-bold text-amber-300">총 예상 견적</span>
                  <div class="text-right">
                    <span class="text-2xl sm:text-3xl font-black text-yellow-400">
                      {{ totalCost.toLocaleString() }}
                    </span>
                    <span class="text-sm font-bold ml-1">원</span>
                  </div>
                </div>
                <p class="text-[10px] text-slate-400 leading-tight">
                  ※ 현지 사정에 따른 유류비/톨게이트비 포함 기준이며, 최종 확정 견적은 접수 후 매니저가 유선으로 상세 안내해 드립니다.
                </p>
              </div>

              <!-- 6. 제출 버튼 -->
              <button 
                type="submit"
                :disabled="isSubmitting"
                class="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
              >
                <i v-if="isSubmitting" class="fas fa-spinner animate-spin"></i>
                <i v-else class="fas fa-paper-plane"></i>
                <span>{{ isSubmitting ? '접수 처리 중...' : '투어 및 시장조사 신청하기' }}</span>
              </button>

              <!-- Quick Inquire Helper -->
              <div class="text-center pt-1">
                <a 
                  href="http://pf.kakao.com/_xmQWsK/chat" 
                  target="_blank"
                  class="text-xs text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 font-medium"
                >
                  <i class="fas fa-comment text-yellow-500"></i>
                  <span>신청 전 카카오톡으로 실시간 빠른 상담하기 &rarr;</span>
                </a>
              </div>

            </form>

          </div>
        </div>

      </div>
    </div>

    <!-- Application Success Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="showSuccessModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm select-none"
      >
        <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl border border-gray-100 relative overflow-hidden">
          
          <!-- Toast Notification inside modal -->
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div 
              v-if="showToast" 
              class="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-full shadow-lg border border-slate-700 flex items-center gap-2"
            >
              <i class="fas fa-circle-check text-emerald-400"></i>
              <span>{{ toastMessage }}</span>
            </div>
          </transition>

          <!-- Top Icon -->
          <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            <i class="fas fa-check-circle"></i>
          </div>

          <!-- Header -->
          <div>
            <span class="text-xs font-bold text-blue-600 tracking-wider uppercase">Application Completed</span>
            <h3 class="text-xl sm:text-2xl font-black text-gray-900 mt-1">시장조사 투어 신청 완료!</h3>
            <p class="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
              <strong>{{ form.name }}</strong> 님의 시장조사 투어 신청서가 정상적으로 접수되었습니다.<br />
              담당 무역 전문 매니저가 <strong>{{ form.phone }}</strong> 번호로 신속히 연락드릴 예정입니다.
            </p>
          </div>

          <!-- Structured Summary Card with Copy Action -->
          <div class="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 text-left space-y-2 relative group">
            <div class="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
              <span class="flex items-center gap-1.5 text-blue-600">
                <i class="fas fa-file-invoice"></i>
                <span>신청 상세 내역</span>
              </span>
              <button 
                type="button"
                @click="copyApplicationDetails"
                class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1 transition shadow-sm"
              >
                <i :class="isCopied ? 'fas fa-check text-emerald-500' : 'fas fa-copy text-slate-500'"></i>
                <span>{{ isCopied ? '복사됨!' : '내역 복사' }}</span>
              </button>
            </div>

            <div class="text-xs text-slate-700 space-y-1.5 font-medium leading-relaxed">
              <div class="flex justify-between">
                <span class="text-slate-500">고객명:</span>
                <span class="font-bold text-slate-900">{{ form.name }}님</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">연락처:</span>
                <span class="font-bold text-slate-900">{{ form.phone }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">총 예상 견적:</span>
                <span class="font-black text-blue-600">{{ totalCost.toLocaleString() }}원</span>
              </div>
              <div class="flex justify-between items-start">
                <span class="text-slate-500 shrink-0">공항 픽업:</span>
                <span class="text-right text-slate-900 font-semibold">{{ pickupSummaryText }}</span>
              </div>
              <div class="flex justify-between items-start">
                <span class="text-slate-500 shrink-0">통역 기간:</span>
                <span class="text-right text-slate-900 font-semibold">{{ guideSummaryText }}</span>
              </div>
              <div v-if="form.targetItem" class="flex justify-between items-start">
                <span class="text-slate-500 shrink-0">희망 품목:</span>
                <span class="text-right text-slate-900">{{ form.targetItem }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2.5 pt-1">
            <!-- 1. Kakao Confirm Button -->
            <button 
              type="button"
              @click="handleKakaoConfirm" 
              class="w-full py-3.5 px-4 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-md hover:shadow-lg shadow-amber-400/20"
            >
              <i class="fas fa-comment text-amber-950 text-base"></i>
              <span>카카오톡으로 신청 확인 & 1:1 상담하기</span>
            </button>

            <!-- 2. Channel Talk Button -->
            <button 
              type="button"
              @click="handleChannelTalkConfirm"
              class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-md hover:shadow-lg shadow-blue-500/20"
            >
              <i class="fas fa-headset text-sm"></i>
              <span>채널톡 실시간 상담창 열기</span>
            </button>

            <!-- 3. Close Button -->
            <button 
              type="button"
              @click="closeModal"
              class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              확인 및 닫기
            </button>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const isCopied = ref(false)
const showToast = ref(false)
const toastMessage = ref('')

const form = ref({
  name: '',
  phone: '',
  targetItem: '',
  usePickup: true,
  pickupAirport: 'hangzhou', // hangzhou, shanghai, yiwu
  vehicleType: 'sedan', // sedan, van
  pickupArrival: true,
  pickupDeparture: true,
  arrivalDate: '',
  returnDate: '',
  useGuide: true,
  guideDays: 2,
  guideCategory: 'general',
  supportHotel: true,
  supportFactory: false,
  support1688: true
})

// DatePicker click helper to open native calendar picker anywhere in the input box
const openDatePicker = (event) => {
  if (event && event.target && typeof event.target.showPicker === 'function') {
    try {
      event.target.showPicker()
    } catch (e) {
      // ignore
    }
  }
}

// Airport pricing map
const airportPriceMap = {
  hangzhou: 99000,
  shanghai: 180000,
  yiwu: 40000
}

// Vehicle extra price
const vehicleExtraMap = {
  sedan: 0,
  van: 30000
}

// Daily guide fee
const GUIDE_DAILY_FEE = 150000

const totalCost = computed(() => {
  let cost = 0

  // 1. Pickup cost
  if (form.value.usePickup) {
    const baseAirportRate = airportPriceMap[form.value.pickupAirport] || 99000
    const vehicleExtra = vehicleExtraMap[form.value.vehicleType] || 0
    const tripCost = baseAirportRate + vehicleExtra

    let tripsCount = 0
    if (form.value.pickupArrival) tripsCount += 1
    if (form.value.pickupDeparture) tripsCount += 1

    cost += tripCost * tripsCount
  }

  // 2. Guide cost (5일 이상 사전 협의 시 추가금 0원 처리)
  if (form.value.useGuide) {
    if (form.value.guideDays !== 'custom' && Number(form.value.guideDays) < 5) {
      const days = parseInt(form.value.guideDays, 10) || 1
      cost += days * GUIDE_DAILY_FEE
    } else {
      cost += 0
    }
  }

  return cost
})

const calculatedDetails = computed(() => {
  const parts = []
  if (form.value.usePickup) {
    let trips = 0
    if (form.value.pickupArrival) trips++
    if (form.value.pickupDeparture) trips++
    parts.push(`픽업 ${trips}회`)
  }
  if (form.value.useGuide) {
    if (form.value.guideDays === 'custom' || Number(form.value.guideDays) >= 5) {
      parts.push('통역: 사전 협의(별도 안내)')
    } else {
      parts.push(`통역 ${form.value.guideDays}일`)
    }
  }
  return parts.length > 0 ? parts.join(' + ') : '기본 상담'
})

// Airport & Guide text helpers
const pickupSummaryText = computed(() => {
  if (!form.value.usePickup) return '미선택'
  const airportMap = {
    hangzhou: '항저우 공항',
    shanghai: '상하이 푸동',
    yiwu: '이우 공항/역'
  }
  const vehicle = form.value.vehicleType === 'van' ? '7인승 밴' : '5인승 세단'
  const trips = []
  if (form.value.pickupArrival) trips.push(`도착(${form.value.arrivalDate || '미정'})`)
  if (form.value.pickupDeparture) trips.push(`샌딩(${form.value.returnDate || '미정'})`)
  return `${airportMap[form.value.pickupAirport] || form.value.pickupAirport} (${vehicle} / ${trips.join(', ')})`
})

const guideSummaryText = computed(() => {
  if (!form.value.useGuide) return '미선택'
  const catMap = {
    general: '생활잡화/주방/판촉',
    fashion: '패션의류/원단/액세서리',
    digital: '전자/IT기기/가전',
    toy: '완구/공예품',
    industrial: '산업재/금형사출'
  }
  const category = catMap[form.value.guideCategory] || form.value.guideCategory
  if (form.value.guideDays === 'custom' || Number(form.value.guideDays) >= 5) {
    return `5일 이상 (사전 협의 - ${category})`
  }
  return `${form.value.guideDays}일 (${category})`
})

// Structured application message for clipboard & messaging
const generatedApplicationMessage = computed(() => {
  const nowStr = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `[이유씨컴퍼니 시장조사 투어 신청 내역]
- 고객명: ${form.value.name || '고객'}님
- 연락처: ${form.value.phone || '-'}
- 희망 품목: ${form.value.targetItem || '소상품/생활잡화'}
- 총 예상 견적: ${totalCost.value.toLocaleString()}원
- 공항 픽업: ${pickupSummaryText.value}
- 통역 기간: ${guideSummaryText.value}
- 호텔 예약 지원: ${form.value.supportHotel ? '무료 대행 요청' : '미요청'}
- 신청 일시: ${nowStr}
* 신청이 정상 접수되어 무역 전담 매니저가 신속히 연락드릴 예정입니다.`
})

const triggerToast = (msg) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 4000)
}

const copyApplicationDetails = async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(generatedApplicationMessage.value)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = generatedApplicationMessage.value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    isCopied.value = true
    triggerToast('신청 내역이 클립보드에 복사되었습니다.')
    setTimeout(() => {
      isCopied.value = false
    }, 3000)
  } catch (err) {
    console.warn('Clipboard copy fallback:', err)
  }
}

const handleKakaoConfirm = async () => {
  await copyApplicationDetails()
  triggerToast('신청 내역이 복사되었습니다. 채팅창에 붙여넣어 문의해 주세요.')
  setTimeout(() => {
    window.open('http://pf.kakao.com/_xmQWsK/chat', '_blank')
  }, 350)
}

const handleChannelTalkConfirm = () => {
  if (typeof window !== 'undefined' && window.ChannelIO) {
    try {
      window.ChannelIO('showMessenger')
      triggerToast('채널톡 상담창이 연결되었습니다.')
    } catch (e) {
      console.warn('ChannelIO error:', e)
      handleKakaoConfirm()
    }
  } else {
    handleKakaoConfirm()
  }
}

// Channel.io user sync & event tracking
const syncWithChannelTalk = () => {
  if (typeof window !== 'undefined' && window.ChannelIO) {
    try {
      window.ChannelIO('updateUser', {
        profile: {
          name: form.value.name,
          mobileNumber: form.value.phone,
          CUSTOMER_NAME: form.value.name,
          PHONE: form.value.phone,
          LAST_TOUR_APPLICATION: new Date().toISOString(),
          ESTIMATED_TOUR_COST: `${totalCost.value.toLocaleString()}원`,
          TOUR_PICKUP: pickupSummaryText.value,
          TOUR_GUIDE_DAYS: guideSummaryText.value
        }
      })
      window.ChannelIO('track', 'Tour_Application', {
        customerName: form.value.name,
        phone: form.value.phone,
        totalCost: totalCost.value,
        pickup: pickupSummaryText.value,
        guide: guideSummaryText.value,
        appliedAt: new Date().toISOString()
      })
    } catch (e) {
      console.warn('ChannelIO sync error:', e)
    }
  }
}

const submitTourApplication = async () => {
  isSubmitting.value = true

  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('applications').insert([
        {
          service_type: 'market_tour',
          service_name: '이우 시장투어',
          customer_name: form.value.name,
          phone: form.value.phone,
          status: '접수대기',
          total_amount: totalCost.value,
          memo: form.value.targetItem ? `희망품목: ${form.value.targetItem}` : '',
          details: {
            targetItem: form.value.targetItem,
            arrivalDate: form.value.arrivalDate,
            returnDate: form.value.returnDate,
            usePickup: form.value.usePickup,
            pickupAirport: form.value.pickupAirport,
            vehicleType: form.value.vehicleType,
            pickupArrival: form.value.pickupArrival,
            pickupDeparture: form.value.pickupDeparture,
            useGuide: form.value.useGuide,
            guideDays: form.value.guideDays,
            guideCategory: form.value.guideCategory,
            supportHotel: form.value.supportHotel,
            supportFactory: form.value.supportFactory,
            support1688: form.value.support1688,
            pickupSummaryText: pickupSummaryText.value,
            guideSummaryText: guideSummaryText.value,
            calculatedDetails: calculatedDetails.value,
            fullApplicationMessage: generatedApplicationMessage.value
          }
        }
      ])

      if (error) {
        throw error
      }
    }

    // Sync Channel Talk
    syncWithChannelTalk()
    showSuccessModal.value = true
  } catch (err) {
    console.error('Supabase tour insert error:', err)
    alert(`투어 신청서 접수 중 오류가 발생했습니다: ${err.message || '잠시 후 다시 시도해 주세요.'}`)
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  showSuccessModal.value = false
}
</script>
