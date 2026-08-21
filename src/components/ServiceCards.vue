<template>
  <section id="services" class="py-16 sm:py-24 bg-[#0b0f19] text-white border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Section Title Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-400 uppercase mb-2">EUC Service</h2>
        <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          멋진일을 좋은 사람과 함께하는 EUC
        </p>
        <div class="mt-4 w-12 h-1 bg-blue-500 mx-auto rounded-full"></div>
      </div>

      <!-- 4 Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        
        <!-- Card 1: 쿠팡 배송대행 / 로켓배송 -->
        <div class="group relative rounded-3xl overflow-hidden shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-red-500/20 transition-all duration-500 transform hover:-translate-y-1.5 flex flex-col justify-between border border-slate-700/80 hover:border-red-500/80 p-6 min-h-[380px]">
          <!-- Dynamic Moving Background -->
          <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
            <img 
              src="https://media1.giphy.com/media/l0HlTy9x8FZo0XO1i/giphy.gif" 
              alt="쿠팡 로켓 배송 입고 대행"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-black/65 group-hover:bg-black/55 transition-colors duration-500"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-[#070b14]/95 via-black/60 to-black/35"></div>
          </div>

          <div class="relative z-10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="inline-block px-2.5 py-1 bg-red-500/80 text-white text-[11px] font-black rounded-full border border-red-300/40 backdrop-blur-sm shadow-sm">
                쿠팡 입고 대행
              </span>
              <div class="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/40 text-red-400 flex items-center justify-center text-lg shadow-sm">
                <i class="fas fa-rocket"></i>
              </div>
            </div>
            <h3 class="text-lg font-black text-white leading-snug group-hover:text-red-300 transition">
              쿠팡 로켓그로스 & 밀크런
            </h3>
            <p class="text-xs text-slate-200 leading-relaxed font-medium">
              중국 생산지에서 쿠팡 물류창고 입고 규격에 맞춘 바코드 부착 및 직납 서비스
            </p>
          </div>

          <div class="relative z-10 pt-4 border-t border-white/15 mt-5">
            <router-link 
              to="/services/rocket-growth" 
              class="flex items-center justify-between text-xs font-bold text-red-300 group-hover:text-white transition group-hover:translate-x-1"
            >
              <span>상담 문의하기</span>
              <span class="w-6 h-6 rounded-full bg-red-500/30 border border-red-400/50 flex items-center justify-center text-xs text-white group-hover:bg-red-500 transition">&rarr;</span>
            </router-link>
          </div>
        </div>

        <!-- Card 2: 구매대행이란? -->
        <div class="group relative rounded-3xl overflow-hidden shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:-translate-y-1.5 flex flex-col justify-between border border-slate-700/80 hover:border-blue-400/80 p-6 min-h-[380px]">
          <!-- Dynamic Moving Background -->
          <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
            <img 
              src="https://media1.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif" 
              alt="구매대행 안내"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-black/65 group-hover:bg-black/55 transition-colors duration-500"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-[#070b14]/95 via-black/60 to-black/35"></div>
          </div>

          <div class="relative z-10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="inline-block px-2.5 py-1 bg-blue-600/80 text-white text-[11px] font-black rounded-full border border-blue-300/40 backdrop-blur-sm shadow-sm">
                1688 구매대행
              </span>
              <div class="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center text-lg shadow-sm">
                <i class="fas fa-cart-shopping"></i>
              </div>
            </div>
            <h3 class="text-lg font-black text-white leading-snug group-hover:text-blue-300 transition">
              1688 / 타오바오 구매대행
            </h3>
            <p class="text-xs text-slate-200 leading-relaxed font-medium">
              중국에서 구매하기 어려운 상품을 현지 최저가로 안전하게 구매 및 검품 출고 대행
            </p>
          </div>

          <div class="relative z-10 pt-4 border-t border-white/15 mt-5">
            <router-link 
              to="/services/purchasing-agent" 
              class="flex items-center justify-between text-xs font-bold text-blue-300 group-hover:text-white transition group-hover:translate-x-1"
            >
              <span>구매대행 신청하기</span>
              <span class="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-xs text-white group-hover:bg-blue-600 transition">&rarr;</span>
            </router-link>
          </div>
        </div>

        <!-- Card 3: 무역대행이란? -->
        <div class="group relative rounded-3xl overflow-hidden shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 transform hover:-translate-y-1.5 flex flex-col justify-between border border-slate-700/80 hover:border-emerald-400/80 p-6 min-h-[380px]">
          <!-- Dynamic Moving Background -->
          <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
            <img 
              src="https://media1.giphy.com/media/26BRzozg4TCBXv6QU/giphy.gif" 
              alt="무역대행 안내"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-black/65 group-hover:bg-black/55 transition-colors duration-500"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-[#070b14]/95 via-black/60 to-black/35"></div>
          </div>

          <div class="relative z-10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="inline-block px-2.5 py-1 bg-emerald-600/80 text-white text-[11px] font-black rounded-full border border-emerald-300/40 backdrop-blur-sm shadow-sm">
                OEM / ODM
              </span>
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center text-lg shadow-sm">
                <i class="fas fa-industry"></i>
              </div>
            </div>
            <h3 class="text-lg font-black text-white leading-snug group-hover:text-emerald-300 transition">
              무역대행 & 맞춤제조
            </h3>
            <p class="text-xs text-slate-200 leading-relaxed font-medium">
              중국 공장 발굴, 단가 네고, 금형 제작 및 시장조사까지 원스톱 무역업무 대행
            </p>
          </div>

          <div class="relative z-10 pt-4 border-t border-white/15 mt-5">
            <router-link 
              to="/services/trade-agent" 
              class="flex items-center justify-between text-xs font-bold text-emerald-300 group-hover:text-white transition group-hover:translate-x-1"
            >
              <span>무역대행 문의하기</span>
              <span class="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-xs text-white group-hover:bg-emerald-600 transition">&rarr;</span>
            </router-link>
          </div>
        </div>

        <!-- Card 4: 이우 시장조사 투어 -->
        <div class="group relative rounded-3xl overflow-hidden shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 transform hover:-translate-y-1.5 flex flex-col justify-between border border-slate-700/80 hover:border-amber-400/80 p-6 min-h-[380px]">
          <!-- Dynamic Moving Background -->
          <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
            <img 
              src="https://media1.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif" 
              alt="이우 시장조사 투어"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-black/65 group-hover:bg-black/55 transition-colors duration-500"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-[#070b14]/95 via-black/60 to-black/35"></div>
          </div>

          <div class="relative z-10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="inline-block px-2.5 py-1 bg-amber-500/80 text-white text-[11px] font-black rounded-full border border-amber-300/40 backdrop-blur-sm shadow-sm">
                시장투어 풀패키지
              </span>
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center text-lg shadow-sm">
                <i class="fas fa-plane-departure"></i>
              </div>
            </div>
            <h3 class="text-lg font-black text-white leading-snug group-hover:text-amber-300 transition">
              중국 이우 시장조사 투어
            </h3>
            <p class="text-xs text-slate-200 leading-relaxed font-medium">
              세계 최대 도매시장 푸텐시장 구역별 전문 가이드, 통역, 픽업 및 발주 연계
            </p>
          </div>

          <div class="relative z-10 pt-4 border-t border-white/15 mt-5">
            <router-link 
              to="/guide/market-tour" 
              class="flex items-center justify-between text-xs font-bold text-amber-300 group-hover:text-white transition group-hover:translate-x-1"
            >
              <span>투어 일정 & 견적</span>
              <span class="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-400/50 flex items-center justify-center text-xs text-white group-hover:bg-amber-500 transition">&rarr;</span>
            </router-link>
          </div>
        </div>

      </div>

    </div>
  </section>
</template>></i> 안전한 창고 보관 & 재고 관리</li>
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
