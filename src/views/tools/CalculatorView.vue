<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-12 sm:py-16 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold tracking-wide">
              <i class="fas fa-calculator text-blue-400"></i>
              <span>REAL-TIME IMPORT CALCULATOR</span>
            </span>

            <!-- Official Company Settings Badge -->
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              <i class="fas fa-certificate text-amber-400"></i>
              <span>이유씨 공식 환율: 1 RMB = {{ customExchangeRate }}원 {{ exchangeRateModeBadgeText }} | 수수료: {{ agencyFeePercent }}%</span>
            </span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            중국 무역·물류비 &<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              관부가세 실시간 원스톱 계산기
            </span>
          </h1>

          <p class="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            중국 위안화(RMB) 제품 금액과 화물 규격(CBM/kg)을 입력하시면, 당사 공식 적용 환율을 반영한 순수 제품가, 국제 운임, 관세 및 부가세, 구매대행 수수료와 수입 부대비용까지 원스톱으로 즉시 산출해 드립니다.
          </p>

          <div class="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <router-link to="/" class="hover:text-white flex items-center gap-1">
              <i class="fas fa-home"></i> 홈
            </router-link>
            <span>&gt;</span>
            <span class="text-slate-300">EUC 안내</span>
            <span>&gt;</span>
            <span class="text-blue-400 font-semibold">무역/물류비·관부가세 계산기</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      
      <!-- Exchange Rate & Policy Status Bar -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0 font-black">
            ¥
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-gray-500 uppercase">이유씨컴퍼니 공식 적용 환율</span>
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                <i class="fas fa-check-circle text-[8px] text-blue-600"></i> 당사 고시 기준
              </span>
            </div>
            <div class="flex items-baseline gap-2 mt-0.5">
              <span class="text-2xl font-black text-gray-900">
                1 RMB = {{ customExchangeRate }} KRW
              </span>
              <span class="text-xs text-gray-400">
                (실시간 참고치: {{ liveMarketRate > 0 ? liveMarketRate + '원' : '조회중' }})
              </span>
            </div>
          </div>
        </div>

        <!-- Custom Rate Adjustment & Refresh -->
        <div class="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-gray-200 text-xs">
          <span class="font-bold text-gray-700">적용 환율 변경:</span>
          <div class="flex items-center gap-1">
            <input 
              v-model.number="customExchangeRate" 
              type="number" 
              step="0.1" 
              class="w-20 p-1.5 bg-white border border-gray-300 rounded-lg text-center font-black text-blue-600 outline-none focus:border-blue-500"
            />
            <span class="text-gray-500 font-bold">원</span>
          </div>
          <button 
            @click="reloadSettingsAndRates" 
            class="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
            title="공식 설정 환율 새로고침"
          >
            <i class="fas fa-sync-alt" :class="{ 'animate-spin': isFetchingRate }"></i>
          </button>
        </div>

      </div>

      <!-- 2-Column Calculator Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- ==================================================== -->
        <!-- LEFT COLUMN: Calculator Input Form (7 cols) -->
        <!-- ==================================================== -->
        <div class="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6">
          
          <div class="border-b border-gray-100 pb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-gray-900 flex items-center gap-2">
              <i class="fas fa-sliders text-blue-600"></i>
              <span>화물 및 수입 정보 입력</span>
            </h2>
            <button 
              @click="resetInputs"
              class="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <i class="fas fa-rotate-left"></i> 초기화
            </button>
          </div>

          <div class="space-y-6">
            
            <!-- 1. 총 제품 금액 (RMB) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  <span>총 제품 금액 (위안화 RMB/¥)</span>
                </label>
                <span class="text-xs font-black text-blue-600">
                  ≈ {{ calculatedProductKrw.toLocaleString() }}원
                </span>
              </div>

              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">¥</span>
                <input 
                  v-model.number="inputPriceRmb" 
                  type="number" 
                  min="0"
                  step="10"
                  class="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-blue-600/30 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-base font-black text-gray-900 outline-none transition"
                  placeholder="예: 10000"
                />
              </div>

              <!-- Quick RMB Add Buttons -->
              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                <button 
                  v-for="amt in [500, 1000, 5000, 10000, 50000]" 
                  :key="amt"
                  @click="inputPriceRmb += amt"
                  class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-[11px] font-bold text-gray-700 hover:text-blue-600 border border-gray-200 transition"
                >
                  +{{ amt.toLocaleString() }}¥
                </button>
                <button 
                  @click="inputPriceRmb = 0" 
                  class="px-2 py-1 rounded-lg bg-red-50 text-[11px] font-bold text-red-600 hover:bg-red-100 transition"
                >
                  비우기
                </button>
              </div>
            </div>

            <!-- 2. 운송 방식 선택 -->
            <div class="space-y-2 pt-2 border-t border-gray-100">
              <label class="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                <span>운송 방식 선택 (Shipping Type)</span>
              </label>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <label 
                  class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs"
                  :class="shippingMode === 'sea_lcl' 
                    ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
                >
                  <input v-model="shippingMode" type="radio" value="sea_lcl" class="text-blue-600" />
                  <div>
                    <span class="block">해운 LCL</span>
                    <span class="text-[10px] text-gray-400 font-normal">CBM당 {{ seaCbmRate.toLocaleString() }}원</span>
                  </div>
                </label>

                <label 
                  class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs"
                  :class="shippingMode === 'sea_express' 
                    ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
                >
                  <input v-model="shippingMode" type="radio" value="sea_express" class="text-blue-600" />
                  <div>
                    <span class="block">해운 특송</span>
                    <span class="text-[10px] text-gray-400 font-normal">소포장 / 5~7일</span>
                  </div>
                </label>

                <label 
                  class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs"
                  :class="shippingMode === 'air_express' 
                    ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
                >
                  <input v-model="shippingMode" type="radio" value="air_express" class="text-blue-600" />
                  <div>
                    <span class="block">항공 특송</span>
                    <span class="text-[10px] text-gray-400 font-normal">긴급 / 1~2일</span>
                  </div>
                </label>

                <label 
                  class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs"
                  :class="shippingMode === 'other_customs' 
                    ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
                >
                  <input v-model="shippingMode" type="radio" value="other_customs" class="text-blue-600" />
                  <div>
                    <span class="block">기타통관</span>
                    <span class="text-[10px] text-amber-600 font-bold">1:1 맞춤 견적</span>
                  </div>
                </label>
              </div>

              <!-- Other Customs Info Banner -->
              <div v-if="shippingMode === 'other_customs'" class="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 mt-2.5 animate-fadeIn">
                <i class="fas fa-circle-info text-amber-600 text-base shrink-0 mt-0.5"></i>
                <div class="space-y-0.5">
                  <strong class="font-bold block text-amber-950">기타/특수 통관 안내</strong>
                  <p class="text-[11px] text-amber-800 leading-relaxed">
                    특수/기타 통관 품목은 전담 매니저의 1:1 상담 후 맞춤 견적이 산출됩니다.
                  </p>
                </div>
              </div>
            </div>

            <!-- 3. 포장 부피 (CBM) & 중량 (kg) 입력 -->
            <div class="space-y-3 pt-2 border-t border-gray-100">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                  <span>포장 부피 (CBM) & 총 중량 (kg)</span>
                </label>

                <!-- CBM Mode Toggle -->
                <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
                  <button 
                    @click="cbmInputMode = 'box'"
                    class="px-2 py-0.5 rounded font-bold transition"
                    :class="cbmInputMode === 'box' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'"
                  >
                    박스 규격 계산
                  </button>
                  <button 
                    @click="cbmInputMode = 'direct'"
                    class="px-2 py-0.5 rounded font-bold transition"
                    :class="cbmInputMode === 'direct' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'"
                  >
                    CBM 직접 입력
                  </button>
                </div>
              </div>

              <!-- Box Dimension Calculation Mode -->
              <div v-if="cbmInputMode === 'box'" class="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">가로 (cm)</label>
                    <input 
                      v-model.number="boxWidth" 
                      type="number" 
                      min="1" 
                      class="w-full p-2 bg-white border border-gray-300 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">세로 (cm)</label>
                    <input 
                      v-model.number="boxLength" 
                      type="number" 
                      min="1" 
                      class="w-full p-2 bg-white border border-gray-300 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">높이 (cm)</label>
                    <input 
                      v-model.number="boxHeight" 
                      type="number" 
                      min="1" 
                      class="w-full p-2 bg-white border border-gray-300 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1">박스 수량 (BOX)</label>
                    <input 
                      v-model.number="boxCount" 
                      type="number" 
                      min="1" 
                      class="w-full p-2 bg-white border border-gray-300 rounded-lg text-center font-bold text-blue-600"
                    />
                  </div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                  <span>💡 계산된 총 CBM: <strong class="text-blue-600">{{ calculatedCbm.toFixed(3) }} CBM</strong></span>
                  <span class="text-gray-400">※ 1 CBM = 1m × 1m × 1m (약 라면상자 10~12개)</span>
                </div>
              </div>

              <!-- Direct CBM Mode -->
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-gray-700 mb-1">총 부피 (CBM)</label>
                  <input 
                    v-model.number="directCbm" 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    class="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs"
                    placeholder="예: 1.5"
                  />
                </div>
              </div>

              <!-- Weight (kg) Input -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label class="block text-xs font-bold text-gray-700 mb-1">화물 총 중량 (kg)</label>
                  <input 
                    v-model.number="inputWeightKg" 
                    type="number" 
                    min="1" 
                    step="1"
                    class="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-xs"
                    placeholder="예: 150"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 mb-1">운임 청구 부피/중량 기준 (R.T)</label>
                  <div class="p-2.5 bg-slate-100 border border-gray-200 rounded-xl text-xs font-black text-gray-800">
                    {{ chargedWeightDesc }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. 품목 관세율 및 한중 FTA C/O 선택 -->
            <div class="space-y-3 pt-2 border-t border-gray-100">
              <label class="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
                <span>품목 관세율 & 한-중 FTA 원산지증명서</span>
              </label>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button 
                  v-for="tariff in tariffPresets" 
                  :key="tariff.rate"
                  @click="customTariffRate = tariff.rate"
                  class="p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5"
                  :class="customTariffRate === tariff.rate 
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
                >
                  <span class="text-sm font-black">{{ tariff.rate }}%</span>
                  <span class="text-[10px] text-gray-400">{{ tariff.label }}</span>
                </button>
              </div>

              <!-- 한중 FTA 원산지증명서 (C/O) 체크박스 -->
              <div class="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <label class="flex items-center justify-between cursor-pointer">
                  <span class="flex items-center gap-2 text-xs font-black text-amber-900">
                    <i class="fas fa-stamp text-amber-600"></i>
                    <span>한-중 FTA 원산지증명서(C/O) 발급 대행 (관세 0% 또는 대폭 감면)</span>
                  </span>
                  <input 
                    v-model="useFtaCo" 
                    type="checkbox" 
                    class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </label>
                <p class="text-[11px] text-amber-800 leading-relaxed">
                  ※ 체크 시 관세율 0%가 우선 적용되며, 현지 발급 대행 수수료({{ ftaCoFee.toLocaleString() }}원)가 부대비용에 합산됩니다. (고액 수입 시 수십~수백만원 관세 절감)
                </p>
              </div>
            </div>

          </div>

        </div>

        <!-- ==================================================== -->
        <!-- RIGHT COLUMN: Real-Time Calculation Results (5 cols) -->
        <!-- ==================================================== -->
        <div class="lg:col-span-5 space-y-6 sticky top-24">
          
          <!-- Result Summary Box -->
          <div class="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 border border-blue-800/40">
            
            <div class="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 class="text-base font-black text-blue-300 flex items-center gap-2">
                <i class="fas fa-receipt text-blue-400"></i>
                <span>실시간 수입 견적 산출 명세서</span>
              </h3>
              <span class="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold rounded-full">
                실시간 연산
              </span>
            </div>

            <!-- Detailed Cost Breakdown List -->
            <div class="space-y-3 text-xs">
              
              <!-- 1. 제품 대금 -->
              <div class="flex items-center justify-between">
                <span class="text-slate-300">1) 순수 제품 대금 (¥ {{ inputPriceRmb.toLocaleString() }})</span>
                <span class="font-bold text-white">{{ calculatedProductKrw.toLocaleString() }}원</span>
              </div>

              <!-- 2. 구매대행 수수료 (설정율 반영) -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <span class="text-slate-300">2) 구매대행 수수료</span>
                  <span class="text-[10px] text-amber-300 font-bold">({{ agencyFeePercent }}%)</span>
                </div>
                <span class="font-bold text-amber-300">{{ calculatedAgencyFeeKrw.toLocaleString() }}원</span>
              </div>

              <!-- 3. 국제 운임 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <span class="text-slate-300">3) 국제 운송료 ({{ shippingModeName }})</span>
                  <span v-if="shippingMode !== 'other_customs'" class="text-[10px] text-slate-400">({{ finalCbm.toFixed(2) }} CBM / {{ inputWeightKg }}kg)</span>
                </div>
                <span v-if="shippingMode === 'other_customs'" class="font-bold text-amber-300 text-xs">별도 협의 (1:1 맞춤)</span>
                <span v-else class="font-bold text-sky-300">{{ calculatedFreightKrw.toLocaleString() }}원</span>
              </div>

              <!-- 4. 과세가격 (CIF) -->
              <div class="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-[11px]">
                <span class="text-slate-400">과세가격 (CIF = 물품대금 + 운임 + 보험료)</span>
                <span class="font-bold text-slate-200">{{ cifValue.toLocaleString() }}원</span>
              </div>

              <!-- 5. 예상 관세 -->
              <div class="flex items-center justify-between">
                <span class="text-slate-300">
                  4) 예상 관세 
                  <span v-if="useFtaCo" class="text-amber-300 text-[10px] font-bold">(한중 FTA 0% 감면)</span>
                  <span v-else class="text-slate-400 text-[10px]">({{ effectiveTariffRate }}%)</span>
                </span>
                <span class="font-bold" :class="useFtaCo ? 'text-amber-300' : 'text-white'">
                  {{ calculatedTariffKrw.toLocaleString() }}원
                </span>
              </div>

              <!-- 6. 부가가치세 (VAT 10%) -->
              <div class="flex items-center justify-between">
                <span class="text-slate-300">5) 수입 부가가치세 (VAT 10%)</span>
                <span class="font-bold text-white">{{ calculatedVatKrw.toLocaleString() }}원</span>
              </div>

              <!-- 7. 통관 및 부대비용 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <span class="text-slate-300">6) 통관 수수료 & 부대비용</span>
                  <span class="text-[10px] text-slate-400">(관세사{{ useFtaCo ? ' + FTA C/O' : '' }})</span>
                </div>
                <span class="font-bold text-white">{{ incidentalCosts.toLocaleString() }}원</span>
              </div>

            </div>

            <!-- Grand Total Highlight -->
            <div class="border-t border-white/20 pt-5 space-y-1">
              <div class="flex items-baseline justify-between">
                <span class="text-sm sm:text-base font-black text-amber-300">총 예상 수입 견적 합계</span>
                <div class="text-right">
                  <template v-if="shippingMode === 'other_customs'">
                    <span class="text-xl sm:text-2xl font-black text-yellow-400">
                      상담 후 확정
                    </span>
                    <span class="text-[11px] text-slate-300 block">
                      (기본 제품가+수수료 기준 {{ (calculatedProductKrw + calculatedAgencyFeeKrw).toLocaleString() }}원 + α)
                    </span>
                  </template>
                  <template v-else>
                    <span class="text-2xl sm:text-3xl font-black text-yellow-400">
                      {{ grandTotalImportCost.toLocaleString() }}
                    </span>
                    <span class="text-sm font-bold text-white ml-1">원</span>
                  </template>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 text-right">
                ※ 국내 착불 화물비(경동/대신택배)는 부피/도착지에 따라 수령 시 별도 정산
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="pt-2 space-y-2">
              <button 
                @click="openApplyModal"
                class="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 transform active:scale-98"
              >
                <i class="fas fa-paper-plane"></i>
                <span>이 견적으로 실시간 운임/수입 신청하기</span>
                <i class="fas fa-arrow-right text-xs"></i>
              </button>

              <div class="grid grid-cols-2 gap-2">
                <button 
                  @click="copyEstimateSummary"
                  class="py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition flex items-center justify-center gap-1"
                >
                  <i class="fas fa-copy"></i>
                  <span>{{ isCopied ? '복사 완료!' : '견적 요약 복사' }}</span>
                </button>

                <a 
                  href="http://pf.kakao.com/_xmQWsK/chat" 
                  target="_blank"
                  class="py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                >
                  <i class="fas fa-comment"></i>
                  <span>카톡 1:1 상담</span>
                </a>
              </div>
            </div>

          </div>

          <!-- Help Tips Card -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-2.5 text-xs text-gray-600">
            <h4 class="font-bold text-gray-900 flex items-center gap-1.5">
              <i class="fas fa-lightbulb text-amber-500"></i>
              <span>무역 견적 산출 팁</span>
            </h4>
            <ul class="space-y-1 text-[11px] list-disc list-inside leading-relaxed text-gray-500">
              <li><strong>공식 적용 환율</strong>: 관리자 환경설정에 등록된 고시 환율이 우선 적용됩니다.</li>
              <li><strong>구매대행 수수료</strong>: 순수 제품가의 {{ agencyFeePercent }}%가 책정됩니다 (최소 수수료 1만원).</li>
              <li><strong>CBM(입방미터)</strong>: 화물의 가로(m) × 세로(m) × 높이(m)를 곱한 부피 단위입니다.</li>
              <li><strong>원산지증명서(C/O)</strong>: 중국산 제품 수입 시 한-중 FTA 협정세율을 적용받아 관세를 0%로 면제받을 수 있습니다.</li>
            </ul>
          </div>

        </div>

      </div>

    </div>

    <!-- ==================================================== -->
    <!-- Estimate Application Modal (Online Submission) -->
    <!-- ==================================================== -->
    <div v-if="showApplyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" @click.self="showApplyModal = false">
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-gray-900 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <span class="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">ESTIMATE APPLY</span>
            <h3 class="text-lg font-black text-gray-900 mt-1">실시간 무역·운임 견적 신청</h3>
          </div>
          <button @click="showApplyModal = false" class="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
            <i class="fas fa-times text-base"></i>
          </button>
        </div>

        <!-- Calculated Summary Brief Card -->
        <div class="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl space-y-2 text-xs">
          <div class="flex items-center justify-between pb-1.5 border-b border-white/10 text-amber-300 font-bold">
            <span>{{ shippingModeName }} 운송 견적</span>
            <span class="font-mono text-white">{{ finalCbm.toFixed(2) }} CBM / {{ inputWeightKg }}kg</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
            <div>제품가: ₩{{ calculatedProductKrw.toLocaleString() }} (¥{{ inputPriceRmb.toLocaleString() }})</div>
            <div>국제운임: ₩{{ calculatedFreightKrw.toLocaleString() }}</div>
            <div>예상관세: ₩{{ calculatedTariffKrw.toLocaleString() }}</div>
            <div>통관/부대: ₩{{ incidentalCosts.toLocaleString() }}</div>
          </div>
          <div class="border-t border-white/10 pt-2 flex items-baseline justify-between text-yellow-400 font-black text-sm">
            <span>총 예상 견적 합계</span>
            <span class="text-base sm:text-lg font-mono">{{ grandTotalImportCost.toLocaleString() }}원</span>
          </div>
        </div>

        <!-- Input Form -->
        <form @submit.prevent="submitEstimateApplication" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">성함 / 상호명 <span class="text-red-500">*</span></label>
            <input 
              v-model="applyForm.name" 
              type="text" 
              required 
              placeholder="예: 홍길동 / (주)이유씨커머스"
              class="w-full p-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">연락처 <span class="text-red-500">*</span></label>
            <input 
              v-model="applyForm.phone" 
              type="tel" 
              required 
              placeholder="예: 010-1234-5678"
              class="w-full p-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">이메일 (견적서 수신용)</label>
            <input 
              v-model="applyForm.email" 
              type="email" 
              placeholder="예: contact@domain.com"
              class="w-full p-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
            />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">품목명 및 문의사항 / 수령 지역</label>
            <textarea 
              v-model="applyForm.memo" 
              rows="2"
              placeholder="희망 품목명이나 국내 도착지, 특별 요청사항 등을 입력해 주세요."
              class="w-full p-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            ></textarea>
          </div>

          <div class="pt-2">
            <button 
              type="submit" 
              :disabled="isSubmittingApply"
              class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
            >
              <i v-if="isSubmittingApply" class="fas fa-spinner animate-spin"></i>
              <i v-else class="fas fa-check-circle"></i>
              <span>{{ isSubmittingApply ? '견적 접수 처리 중...' : '견적서 접수 및 전담 매니저 배정' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- Application Success Modal -->
    <!-- ==================================================== -->
    <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl text-gray-900">
        <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3 class="text-xl font-black text-gray-900">운임 및 수입 견적이 접수되었습니다!</h3>
        <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
          <strong>{{ applyForm.name }}</strong> 님의 산출 견적이 정상 접수되었습니다.<br />
          <strong>{{ applyForm.phone }}</strong> 번호로 무역 전담 매니저가 신속히 상세 안내를 드립니다.
        </p>

        <div class="p-3.5 bg-slate-50 rounded-2xl border border-gray-100 text-xs text-left space-y-1 text-gray-700 font-medium">
          <div><strong>운송 방식:</strong> {{ shippingModeName }} ({{ finalCbm.toFixed(2) }} CBM / {{ inputWeightKg }}kg)</div>
          <div><strong>총 예상 견적:</strong> <span class="text-blue-600 font-black">{{ grandTotalImportCost.toLocaleString() }}원</span></div>
        </div>

        <div class="space-y-2 pt-2">
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow"
          >
            <i class="fas fa-comment"></i> 카카오톡으로 실시간 빠른 확인
          </a>
          <button 
            @click="showSuccessModal = false" 
            class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
          >
            확인 및 창 닫기
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSiteSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { currentUser, userDisplayName } from '@/lib/auth'

const router = useRouter()

const showApplyModal = ref(false)
const showSuccessModal = ref(false)
const isSubmittingApply = ref(false)

const applyForm = ref({
  name: '',
  phone: '',
  email: '',
  memo: ''
})

const openApplyModal = () => {
  if (currentUser.value) {
    if (userDisplayName.value && !applyForm.value.name) applyForm.value.name = userDisplayName.value
    if (currentUser.value.email && !applyForm.value.email) applyForm.value.email = currentUser.value.email
    if (currentUser.value.user_metadata?.phone && !applyForm.value.phone) applyForm.value.phone = currentUser.value.user_metadata.phone
  }
  showApplyModal.value = true
}

const submitEstimateApplication = async () => {
  isSubmittingApply.value = true
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('applications').insert([
        {
          service_type: 'calculator',
          service_name: '무역/운임 실시간 견적',
          customer_name: applyForm.value.name,
          phone: applyForm.value.phone,
          email: applyForm.value.email || currentUser.value?.email || '',
          user_id: currentUser.value?.id || null,
          status: '접수대기',
          total_amount: grandTotalImportCost.value,
          memo: applyForm.value.memo ? `[고객문의] ${applyForm.value.memo}` : '',
          details: {
            shippingMode: shippingMode.value,
            shippingModeName: shippingModeName.value,
            cbm: Number(finalCbm.value.toFixed(3)),
            weightKg: Number(inputWeightKg.value),
            boxWidth: Number(boxWidth.value),
            boxLength: Number(boxLength.value),
            boxHeight: Number(boxHeight.value),
            boxCount: Number(boxCount.value),
            boxDimensions: cbmInputMode.value === 'box' 
              ? `${boxWidth.value}×${boxLength.value}×${boxHeight.value}cm (${boxCount.value}박스)` 
              : `직접입력 ${finalCbm.value.toFixed(2)} CBM`,
            cbmInputMode: cbmInputMode.value,
            productPriceRmb: Number(inputPriceRmb.value),
            productPriceKrw: calculatedProductKrw.value,
            exchangeRate: Number(customExchangeRate.value),
            agencyFeeKrw: calculatedAgencyFeeKrw.value,
            freightCostKrw: calculatedFreightKrw.value,
            cifValueKrw: cifValue.value,
            tariffRate: effectiveTariffRate.value,
            tariffKrw: calculatedTariffKrw.value,
            vatKrw: calculatedVatKrw.value,
            customsFeeKrw: incidentalCosts.value,
            useFtaCo: useFtaCo.value,
            grandTotalKrw: grandTotalImportCost.value
          }
        }
      ])
      if (error) throw error
    }

    // Sync channel talk if available
    if (typeof window !== 'undefined' && window.ChannelIO) {
      try {
        window.ChannelIO('updateUser', {
          profile: {
            name: applyForm.value.name,
            mobileNumber: applyForm.value.phone,
            LAST_CALCULATOR_ESTIMATE: `${grandTotalImportCost.value.toLocaleString()}원`,
            CALCULATOR_FREIGHT_MODE: shippingModeName.value,
            CALCULATOR_CBM: `${finalCbm.value.toFixed(2)} CBM`
          }
        })
        window.ChannelIO('track', 'Calculator_Estimate_Apply', {
          name: applyForm.value.name,
          phone: applyForm.value.phone,
          totalAmount: grandTotalImportCost.value,
          shippingMode: shippingModeName.value,
          cbm: finalCbm.value.toFixed(2)
        })
      } catch (e) {
        console.warn('ChannelIO tracking error:', e)
      }
    }

    showApplyModal.value = false
    showSuccessModal.value = true
  } catch (err) {
    console.error('Supabase calculator estimate insert error:', err)
    alert(`견적서 접수 중 오류가 발생했습니다: ${err.message || '잠시 후 다시 시도해 주세요.'}`)
  } finally {
    isSubmittingApply.value = false
  }
}

// ----------------------------------------------------
// Settings & Rates State
// ----------------------------------------------------
const exchangeRateMode = ref('manual')
const customExchangeRate = ref(195.0)
const rateMargin = ref(1.5)
const agencyFeePercent = ref(8.0)
const seaCbmRate = ref(98000)
const customsClearanceFee = ref(33000)
const ftaCoFee = ref(33000)

const liveMarketRate = ref(195.0)
const isFetchingRate = ref(false)
const isCopied = ref(false)

// 모드 설명 텍스트
const exchangeRateModeBadgeText = computed(() => {
  if (exchangeRateMode.value === 'auto_margin') {
    return `(실시간 + ${rateMargin.value}원 마진)`
  }
  return `(공식 고정 환율)`
})

// 설정값 및 실시간 환율 로드
const reloadSettingsAndRates = async () => {
  isFetchingRate.value = true
  try {
    // 1. 실시간 시장 환율 참고치 로드
    let fetchedLiveRate = 195.0
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/CNY')
      if (res.ok) {
        const data = await res.json()
        if (data?.rates?.KRW) {
          fetchedLiveRate = Number(data.rates.KRW.toFixed(2))
          liveMarketRate.value = fetchedLiveRate
        }
      }
    } catch (e) {
      console.warn('Live rate API fetch fallback:', e)
    }

    // 2. Supabase site_settings에서 관리자 설정값 불러오기
    const settings = await fetchSiteSettings()
    if (settings) {
      exchangeRateMode.value = settings.exchange_rate_mode || 'manual'
      rateMargin.value = Number(settings.rate_margin) || 1.5
      agencyFeePercent.value = Number(settings.agency_fee_rate) || DEFAULT_SETTINGS.agency_fee_rate
      seaCbmRate.value = Number(settings.sea_cbm_rate) || DEFAULT_SETTINGS.sea_cbm_rate
      customsClearanceFee.value = Number(settings.customs_clearance_fee) || DEFAULT_SETTINGS.customs_clearance_fee
      ftaCoFee.value = Number(settings.fta_co_fee) || DEFAULT_SETTINGS.fta_co_fee

      // 모드별 환율 자동 계산 및 적용
      if (exchangeRateMode.value === 'auto_margin') {
        // 실시간 환율 + 관리자 마진
        const calculatedRate = Number((fetchedLiveRate + rateMargin.value).toFixed(1))
        customExchangeRate.value = calculatedRate
      } else {
        // 수동 고정 환율
        customExchangeRate.value = Number(settings.exchange_rate) || DEFAULT_SETTINGS.exchange_rate
      }
    }
  } catch (err) {
    console.warn('Reload settings error:', err)
  } finally {
    isFetchingRate.value = false
  }
}

// ----------------------------------------------------
// Calculator Inputs State
// ----------------------------------------------------
const inputPriceRmb = ref(10000)
const shippingMode = ref('sea_lcl') // 'sea_lcl', 'sea_express', 'air_express'
const cbmInputMode = ref('box') // 'box', 'direct'

// Box Dimension Mode
const boxWidth = ref(50)
const boxLength = ref(50)
const boxHeight = ref(40)
const boxCount = ref(10)

// Direct CBM Mode
const directCbm = ref(1.0)

// Weight (kg)
const inputWeightKg = ref(150)

// Tariff & FTA
const customTariffRate = ref(8)
const useFtaCo = ref(false)

const tariffPresets = [
  { rate: 8, label: '기본 공산품' },
  { rate: 0, label: '무관세/IT기기' },
  { rate: 13, label: '의류/패션잡화' },
  { rate: 5, label: '특수소재/기타' }
]

// ----------------------------------------------------
// Calculated Values
// ----------------------------------------------------

// 1. CBM 계산
const calculatedCbm = computed(() => {
  if (cbmInputMode.value === 'direct') {
    return Number(directCbm.value) || 0.01
  }
  const w = Number(boxWidth.value) || 0
  const l = Number(boxLength.value) || 0
  const h = Number(boxHeight.value) || 0
  const count = Number(boxCount.value) || 1
  return (w * l * h * count) / 1000000
})

const finalCbm = computed(() => {
  return Math.max(calculatedCbm.value, 0.01)
})

// 부피 중량 (Volumetric Weight kg)
const volumetricWeightKg = computed(() => {
  return finalCbm.value * 167
})

const chargedWeightDesc = computed(() => {
  if (shippingMode.value === 'sea_lcl') {
    return `${finalCbm.value.toFixed(2)} CBM (해운 부피 기준)`
  } else {
    const maxW = Math.max(inputWeightKg.value, volumetricWeightKg.value)
    return `${maxW.toFixed(1)} kg (실중량/부피중량 中 최대)`
  }
})

// 2. 순수 제품 금액 (KRW)
const calculatedProductKrw = computed(() => {
  const rmb = Number(inputPriceRmb.value) || 0
  const rate = Number(customExchangeRate.value) || 195.0
  return Math.round(rmb * rate)
})

// 3. 구매대행 수수료 (KRW) (기본 8%, 최소 10,000원)
const calculatedAgencyFeeKrw = computed(() => {
  const product = calculatedProductKrw.value
  if (product <= 0) return 0
  const fee = Math.round(product * (Number(agencyFeePercent.value) / 100))
  return Math.max(fee, 10000)
})

// 4. 국제 운송료 (KRW)
const calculatedFreightKrw = computed(() => {
  if (shippingMode.value === 'other_customs') {
    return 0
  } else if (shippingMode.value === 'sea_lcl') {
    // 해운 LCL: 기본 CBM당 요율 (설정값 반영)
    const cbm = Math.max(finalCbm.value, 1.0)
    return Math.round(cbm * (Number(seaCbmRate.value) || 98000))
  } else if (shippingMode.value === 'sea_express') {
    // 전자상 해운특송: 기본 1kg 5,000원 + 0.5kg당 800원
    const kg = Math.max(inputWeightKg.value, 1)
    return Math.round(5000 + (Math.ceil((kg - 1) / 0.5) * 800))
  } else {
    // 항공 특송: kg당 약 6,500원
    const chargeableKg = Math.max(inputWeightKg.value, volumetricWeightKg.value, 1)
    return Math.round(chargeableKg * 6500)
  }
})

const shippingModeName = computed(() => {
  switch (shippingMode.value) {
    case 'sea_lcl': return '해운 LCL'
    case 'sea_express': return '해운 특송'
    case 'air_express': return '항공 특송'
    case 'other_customs': return '기타통관'
    default: return '국제운송'
  }
})

// 5. 과세가격 (CIF = 물품대금 + 국제운임 + 기본보험료 0.2%)
const cifValue = computed(() => {
  const product = calculatedProductKrw.value
  const freight = calculatedFreightKrw.value
  const insurance = Math.round(product * 0.002) // 기본 적하보험 0.2%
  return product + freight + insurance
})

// 6. 유효 관세율
const effectiveTariffRate = computed(() => {
  if (useFtaCo.value) return 0
  return Number(customTariffRate.value) || 0
})

// 7. 예상 관세 (KRW)
const calculatedTariffKrw = computed(() => {
  return Math.round(cifValue.value * (effectiveTariffRate.value / 100))
})

// 8. 부가가치세 (VAT 10% = (CIF + 관세) × 10%)
const calculatedVatKrw = computed(() => {
  return Math.round((cifValue.value + calculatedTariffKrw.value) * 0.1)
})

// 9. 통관 수수료 및 부대비용 (설정값 반영)
const incidentalCosts = computed(() => {
  let cost = Number(customsClearanceFee.value) || 33000
  if (useFtaCo.value) {
    cost += Number(ftaCoFee.value) || 33000
  }
  return cost
})

// 10. 총 예상 수입 견적 합계 (제품가 + 구매대행수수료 + 국제운임 + 관세 + 부가세 + 부대비용)
const grandTotalImportCost = computed(() => {
  return calculatedProductKrw.value +
    calculatedAgencyFeeKrw.value +
    calculatedFreightKrw.value +
    calculatedTariffKrw.value +
    calculatedVatKrw.value +
    incidentalCosts.value
})

// ----------------------------------------------------
// Actions & Navigation
// ----------------------------------------------------
const resetInputs = () => {
  inputPriceRmb.value = 10000
  shippingMode.value = 'sea_lcl'
  cbmInputMode.value = 'box'
  boxWidth.value = 50
  boxLength.value = 50
  boxHeight.value = 40
  boxCount.value = 10
  directCbm.value = 1.0
  inputWeightKg.value = 150
  customTariffRate.value = 8
  useFtaCo.value = false
}

// 해당 견적을 들고 구매대행 신청 페이지로 이동
const goToApplyWithEstimate = () => {
  router.push({
    path: '/services/purchasing-agent',
    hash: '#apply-form',
    state: {
      fromCalculator: true,
      priceRmb: inputPriceRmb.value,
      totalKrw: calculatedProductKrw.value,
      agencyFee: calculatedAgencyFeeKrw.value,
      cbm: finalCbm.value.toFixed(2),
      weightKg: inputWeightKg.value,
      shippingMode: shippingMode.value,
      estimatedTotal: grandTotalImportCost.value
    }
  })
}

// 견적 요약 텍스트 클립보드 복사
const copyEstimateSummary = () => {
  const text = `[EUC 중국 무역·물류비 & 관부가세 예상 견적서]
- 제품 대금: ¥ ${inputPriceRmb.value.toLocaleString()} (${calculatedProductKrw.value.toLocaleString()}원)
- 공식 적용 환율: 1 RMB = ${customExchangeRate.value} KRW
- 구매대행 수수료: ${calculatedAgencyFeeKrw.value.toLocaleString()}원 (${agencyFeePercent.value}%)
- 화물 규격: ${finalCbm.value.toFixed(2)} CBM / ${inputWeightKg.value} kg (${shippingModeName.value})
- 국제 운송료: ${calculatedFreightKrw.value.toLocaleString()}원
- 과세가격(CIF): ${cifValue.value.toLocaleString()}원
- 예상 관세: ${calculatedTariffKrw.value.toLocaleString()}원 (${useFtaCo.value ? '한중 FTA 0%' : effectiveTariffRate.value + '%'})
- 부가가치세(VAT): ${calculatedVatKrw.value.toLocaleString()}원
- 통관 및 부대비용: ${incidentalCosts.value.toLocaleString()}원
-----------------------------------------
★ 총 예상 수입 견적 합계: ${grandTotalImportCost.value.toLocaleString()}원
(이유씨컴퍼니 실시간 계산기 기준)`

  navigator.clipboard.writeText(text)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

onMounted(() => {
  reloadSettingsAndRates()
})
</script>
