<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-12 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-25 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs sm:text-sm font-bold tracking-wide mb-4">
            <i class="fas fa-shopping-cart text-blue-400"></i>
            <span>1688 · 타오바오 · 도매시장 공식 사입 파트너</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            중국 구매대행 신청 &<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              실시간 원화 견적 계산기
            </span>
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            1688, 타오바오 상품 링크와 위안화 단가를 입력하시면 당일 고시 환율과 대행 수수료가 반영된 총 예상 사입 비용을 실시간으로 계산해 드립니다.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a 
              href="#apply-form" 
              class="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm sm:text-base"
            >
              <i class="fas fa-calculator"></i>
              <span>견적 계산 및 주문서 작성</span>
              <i class="fas fa-arrow-down text-xs"></i>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400">
              <router-link to="/" class="hover:text-white flex items-center gap-1">
                <i class="fas fa-home"></i> 홈
              </router-link>
              <span>&gt;</span>
              <span class="text-slate-300">주요 서비스</span>
              <span>&gt;</span>
              <span class="text-blue-400 font-semibold">구매대행 신청</span>
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

      <!-- Advanced Purchasing Form & Realtime Estimate -->
      <section id="apply-form" class="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-10 border-2 border-blue-600/20 shadow-2xl space-y-8">
        
        <!-- Form Header -->
        <div class="border-b border-gray-100 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-black rounded-full mb-2">
              <i class="fas fa-calculator"></i>
              <span>PURCHASE ORDER & ESTIMATE</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-gray-900">
              구매대행 주문서 작성 및 실시간 견적
            </h2>
            <p class="text-xs sm:text-sm text-gray-500 mt-1">
              상품 URL과 위안화(¥) 단가를 입력하시면 예상 한화 금액과 대행 수수료가 자동 계산됩니다. (현재 적용 환율: 1 CNY = {{ exchangeRate }} KRW)
            </p>
          </div>

          <div class="flex items-center gap-2 text-xs bg-slate-100 px-3.5 py-2 rounded-xl border border-gray-200">
            <span class="font-bold text-gray-700">적용 환율:</span>
            <input 
              v-model.number="exchangeRate" 
              type="number" 
              step="0.1" 
              class="w-16 p-1 bg-white border border-gray-300 rounded text-center font-bold text-blue-600"
            />
            <span class="text-gray-500">원</span>
          </div>
        </div>

        <form @submit.prevent="submitPurchasingForm" class="space-y-8">
          
          <!-- 1. 다중 품목 입력 테이블 -->
          <div class="space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>구매 상품 리스트 입력</span>
              </h3>
              <button 
                type="button" 
                @click="addProductRow"
                class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow"
              >
                <i class="fas fa-plus text-[10px]"></i>
                <span>상품 추가 (+행)</span>
              </button>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto border border-gray-200 rounded-2xl">
              <table class="w-full text-left text-xs text-gray-700">
                <thead class="bg-slate-100 text-gray-800 font-bold uppercase text-[11px] border-b border-gray-200">
                  <tr>
                    <th class="py-3 px-3 w-10 text-center">No</th>
                    <th class="py-3 px-3 min-w-[200px]">1688 / 타오바오 상품 URL *</th>
                    <th class="py-3 px-3 min-w-[150px]">옵션 (색상/사이즈 등) *</th>
                    <th class="py-3 px-3 min-w-[90px]">단가 (¥) *</th>
                    <th class="py-3 px-3 min-w-[80px]">수량 (EA) *</th>
                    <th class="py-3 px-3 min-w-[110px] text-right">예상 금액 (₩)</th>
                    <th class="py-3 px-2 w-12 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="(item, idx) in form.items" :key="idx" class="hover:bg-slate-50 transition">
                    <td class="py-2.5 px-3 text-center text-gray-400 font-bold">{{ idx + 1 }}</td>
                    <td class="py-2 px-3">
                      <input 
                        v-model="item.url" 
                        type="url" 
                        required 
                        placeholder="https://detail.1688.com/offer/..."
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-600"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input 
                        v-model="item.option" 
                        type="text" 
                        required 
                        placeholder="예: 블랙 / XL"
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-600"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input 
                        v-model.number="item.priceCny" 
                        type="number" 
                        step="0.01" 
                        min="0.1" 
                        required 
                        placeholder="¥ 25.5"
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-600 text-right font-medium"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input 
                        v-model.number="item.qty" 
                        type="number" 
                        min="1" 
                        required 
                        placeholder="100"
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-blue-600 text-right font-medium"
                      />
                    </td>
                    <td class="py-2 px-3 text-right font-bold text-gray-900">
                      {{ Math.round((item.priceCny || 0) * (item.qty || 0) * exchangeRate).toLocaleString() }}원
                    </td>
                    <td class="py-2 px-2 text-center">
                      <button 
                        type="button" 
                        @click="removeProductRow(idx)"
                        :disabled="form.items.length <= 1"
                        class="text-gray-400 hover:text-red-600 disabled:opacity-30 transition p-1"
                      >
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 2. 실시간 견적 요약 카드 -->
          <div class="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
            <h4 class="text-sm font-bold text-blue-300 flex items-center gap-2">
              <i class="fas fa-receipt"></i>
              <span>실시간 예상 견적 요약</span>
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10 text-xs">
              <div class="bg-white/5 p-3 rounded-xl border border-white/10">
                <span class="text-slate-400 block mb-1">총 상품 금액 (CNY)</span>
                <span class="text-xl font-bold text-white">¥ {{ totalCny.toFixed(2) }}</span>
              </div>

              <div class="bg-white/5 p-3 rounded-xl border border-white/10">
                <span class="text-slate-400 block mb-1">상품 원화 환산 (KRW)</span>
                <span class="text-xl font-bold text-sky-300">{{ totalKrw.toLocaleString() }}원</span>
              </div>

              <div class="bg-white/5 p-3 rounded-xl border border-white/10">
                <span class="text-slate-400 block mb-1">구매대행 수수료 ({{ feeRate }}%)</span>
                <span class="text-xl font-bold text-amber-300">{{ agencyFee.toLocaleString() }}원</span>
              </div>
            </div>

            <div class="border-t border-white/20 pt-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span class="text-base sm:text-lg font-black text-amber-300">총 1차 예상 결제 금액</span>
                <p class="text-[11px] text-slate-400">※ 국제 배송비 및 관부가세는 물품 한국 입고 시 별도 정산</p>
              </div>
              <div class="text-right">
                <span class="text-2xl sm:text-4xl font-black text-yellow-400">
                  {{ grandTotal.toLocaleString() }}
                </span>
                <span class="text-sm font-bold ml-1">원</span>
              </div>
            </div>
          </div>

          <!-- 2. 부가서비스 신청 (옵션) -->
          <div class="space-y-4 pt-6 border-t border-gray-100">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <span>현지 창고 부가서비스 신청 (선택)</span>
              </h3>
              <span class="text-xs text-blue-600 font-semibold flex items-center gap-1">
                <i class="fas fa-shield-halved"></i> 통관 리스크 최소화 및 안전 배송 보장
              </span>
            </div>

            <!-- Additional Services Card Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              <!-- Option 1: 기본 정밀검수 -->
              <label 
                class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none"
                :class="form.additionalServices.precision_inspection 
                  ? 'bg-blue-50/70 border-blue-500 text-blue-950 ring-2 ring-blue-500/15 shadow-sm' 
                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100/80'"
              >
                <input 
                  type="checkbox" 
                  v-model="form.additionalServices.precision_inspection"
                  class="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <i class="fas fa-microscope text-blue-500"></i>
                    <span>기본 정밀검수</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-blue-200/60 text-blue-800 font-bold">추천</span>
                  </div>
                  <p class="text-[11px] text-gray-500 leading-tight">
                    수량 일치 여부, 색상/사이즈 옵션 확인 및 외관 불량/오염 1차 검품
                  </p>
                </div>
              </label>

              <!-- Option 2: 원산지 표기 작업 -->
              <label 
                class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none"
                :class="form.additionalServices.origin_labeling 
                  ? 'bg-amber-50/70 border-amber-500 text-amber-950 ring-2 ring-amber-500/15 shadow-sm' 
                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100/80'"
              >
                <input 
                  type="checkbox" 
                  v-model="form.additionalServices.origin_labeling"
                  class="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
                />
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <i class="fas fa-stamp text-amber-500"></i>
                    <span>원산지 표기 작업</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 font-bold">필수권장</span>
                  </div>
                  <p class="text-[11px] text-gray-500 leading-tight">
                    MADE IN CHINA 봉제라벨 봉제 / 스티커 부착 / 불멸잉크 도장 작업 (통관 필수)
                  </p>
                </div>
              </label>

              <!-- Option 3: 포장 보강 / 재포장 -->
              <label 
                class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none"
                :class="form.additionalServices.packaging_reinforcement 
                  ? 'bg-purple-50/70 border-purple-500 text-purple-950 ring-2 ring-purple-500/15 shadow-sm' 
                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100/80'"
              >
                <input 
                  type="checkbox" 
                  v-model="form.additionalServices.packaging_reinforcement"
                  class="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer"
                />
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <i class="fas fa-box-open text-purple-500"></i>
                    <span>포장 보강 / 재포장</span>
                  </div>
                  <p class="text-[11px] text-gray-500 leading-tight">
                    에어캡 완충재 랩핑, 마대 포장, 파손 방지 코너 모서리 보호대 보강
                  </p>
                </div>
              </label>

              <!-- Option 4: 검품 사진 촬영 서비스 -->
              <label 
                class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none"
                :class="form.additionalServices.photo_inspection 
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/15 shadow-sm' 
                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100/80'"
              >
                <input 
                  type="checkbox" 
                  v-model="form.additionalServices.photo_inspection"
                  class="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                />
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <i class="fas fa-camera text-emerald-500"></i>
                    <span>검품 사진 촬영 서비스</span>
                  </div>
                  <p class="text-[11px] text-gray-500 leading-tight">
                    현지 창고 입고 시 실물 고화질 검품 사진 촬영 및 카카오톡/이메일 전송
                  </p>
                </div>
              </label>

              <!-- Option 5: 개별 바코드 부착 작업 -->
              <label 
                class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none"
                :class="form.additionalServices.barcode_attachment 
                  ? 'bg-rose-50/70 border-rose-500 text-rose-950 ring-2 ring-rose-500/15 shadow-sm' 
                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100/80'"
              >
                <input 
                  type="checkbox" 
                  v-model="form.additionalServices.barcode_attachment"
                  class="mt-1 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                />
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <i class="fas fa-barcode text-rose-500"></i>
                    <span>개별 바코드 부착 작업</span>
                  </div>
                  <p class="text-[11px] text-gray-500 leading-tight">
                    쿠팡 로켓그로스 / 스마트스토어 전용 상품 바코드(SKU/바코드 스티커) 개별 부착
                  </p>
                </div>
              </label>

              <!-- Option 6: 기타 요청사항 직접 입력 카드 -->
              <div class="p-4 rounded-2xl border border-gray-200 bg-slate-50/70 space-y-2">
                <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-800">
                  <i class="fas fa-pen-to-square text-indigo-500"></i>
                  <span>기타 부가서비스 직접 입력</span>
                </div>
                <input 
                  v-model="form.additionalServices.custom_request"
                  type="text" 
                  placeholder="예: 50개 단위 소분 박스 포장, 행거 작업 등"
                  class="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 text-xs outline-none bg-white"
                />
              </div>

            </div>
          </div>

          <!-- 3. 통관 및 배송지 정보 -->
          <div class="space-y-4 pt-6 border-t border-gray-100">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <span>통관 및 배송지 정보 입력</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">수취인 성함 / 상호명 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.receiverName" 
                  type="text" 
                  required 
                  placeholder="예: 홍길동"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">연락처 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.phone" 
                  type="tel" 
                  required 
                  placeholder="예: 010-1234-5678"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">개인통관고유부호 / 사업자번호 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.customsCode" 
                  type="text" 
                  required 
                  placeholder="예: P123456789012"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">배송 방식 선택</label>
                <select 
                  v-model="form.shippingType" 
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none cursor-pointer"
                >
                  <option value="sea">전자상 해운택배 (가장 경제적)</option>
                  <option value="air">1일 항공특송 (긴급 샘플)</option>
                  <option value="lcl">사업자 LCL 해운 컨테이너</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">수령지 기본 주소 및 상세 주소 <span class="text-red-500">*</span></label>
              <input 
                v-model="form.address" 
                type="text" 
                required 
                placeholder="예: 서울시 강남구 테헤란로 123, EUC빌딩 4층"
                class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm outline-none transition"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">요청 및 특이사항</label>
              <textarea 
                v-model="form.memo" 
                rows="2" 
                placeholder="추가 전달사항 및 배송 시 유의사항 등을 적어주세요."
                class="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs outline-none"
              ></textarea>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
            >
              <i v-if="isSubmitting" class="fas fa-spinner animate-spin"></i>
              <i v-else class="fas fa-paper-plane"></i>
              <span>{{ isSubmitting ? '주문서 접수 중...' : '구매대행 주문서 신청하기' }}</span>
            </button>
          </div>

        </form>

      </section>

    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl text-gray-900">
        <div class="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mx-auto">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3 class="text-xl font-bold">구매대행 주문서가 접수되었습니다!</h3>
        <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
          <strong>{{ form.receiverName }}</strong> 님의 주문서가 정상 접수되었습니다.<br />
          중국 현지 판매자 실재고 확인 후 <strong>{{ form.phone }}</strong> 번호로 최종 정산서를 발송해 드립니다.
        </p>
        <div class="bg-slate-50 p-3.5 rounded-xl text-xs text-left space-y-1.5 border border-gray-100">
          <p><strong>신청 품목:</strong> {{ form.items.length }}종</p>
          <p><strong>총 예상 금액:</strong> {{ grandTotal.toLocaleString() }}원</p>
          <p><strong>배송지:</strong> {{ form.address }}</p>
          <div class="pt-1 border-t border-gray-200/60">
            <span class="font-bold text-gray-700 block mb-0.5">선택 부가서비스:</span>
            <div class="flex flex-wrap gap-1">
              <span v-if="form.additionalServices.precision_inspection" class="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">기본 정밀검수</span>
              <span v-if="form.additionalServices.origin_labeling" class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">원산지 표기</span>
              <span v-if="form.additionalServices.packaging_reinforcement" class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">포장 보강</span>
              <span v-if="form.additionalServices.photo_inspection" class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">검품 사진</span>
              <span v-if="form.additionalServices.barcode_attachment" class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">바코드 부착</span>
              <span v-if="form.additionalServices.custom_request" class="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">기타요청: {{ form.additionalServices.custom_request }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 pt-2">
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
          >
            <i class="fas fa-comment"></i> 카카오톡으로 신청 확인
          </a>
          <button @click="showModal = false" class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition">
            닫기
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fetchSiteSettings } from '@/lib/settings'
import { currentUser } from '@/lib/auth'

const isSubmitting = ref(false)
const showModal = ref(false)

const exchangeRate = ref(195) // 기본 고시환율
const feeRate = ref(8) // 구매대행 수수료율 8%

const form = ref({
  receiverName: '',
  phone: '',
  customsCode: '',
  shippingType: 'sea',
  address: '',
  memo: '',
  items: [
    { url: '', option: '', priceCny: 15, qty: 50 }
  ],
  additionalServices: {
    precision_inspection: true, // 기본 정밀검수
    origin_labeling: true, // 원산지 표기 작업
    packaging_reinforcement: false, // 포장 보강
    photo_inspection: false, // 검품 사진 촬영
    barcode_attachment: false, // 개별 바코드 부착
    custom_request: '' // 기타 요청사항
  }
})

const addProductRow = () => {
  form.value.items.push({
    url: '',
    option: '',
    priceCny: 10,
    qty: 50
  })
}

const removeProductRow = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

// Calculations
const totalCny = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + ((Number(item.priceCny) || 0) * (Number(item.qty) || 0))
  }, 0)
})

const totalKrw = computed(() => {
  return Math.round(totalCny.value * (Number(exchangeRate.value) || 195))
})

const agencyFee = computed(() => {
  // 최소 수수료 10,000원 보장 또는 설정된 수수료율
  const calc = Math.round(totalKrw.value * (Number(feeRate.value) / 100))
  return totalKrw.value > 0 ? Math.max(calc, 10000) : 0
})

const grandTotal = computed(() => {
  return totalKrw.value + agencyFee.value
})

// 선택된 부가서비스 요약 텍스트 생성
const getSelectedServicesSummary = () => {
  const list = []
  if (form.value.additionalServices.precision_inspection) list.push('기본 정밀검수')
  if (form.value.additionalServices.origin_labeling) list.push('원산지 표기(MADE IN CHINA)')
  if (form.value.additionalServices.packaging_reinforcement) list.push('포장 보강/재포장')
  if (form.value.additionalServices.photo_inspection) list.push('검품 사진 촬영 서비스')
  if (form.value.additionalServices.barcode_attachment) list.push('개별 바코드 부착 작업')
  if (form.value.additionalServices.custom_request?.trim()) {
    list.push(`기타요청: ${form.value.additionalServices.custom_request.trim()}`)
  }
  return list.length > 0 ? list.join(', ') : '선택 없음'
}

onMounted(async () => {
  // 관리자 설정값 불러오기
  try {
    const settings = await fetchSiteSettings()
    if (settings) {
      if (settings.exchange_rate) exchangeRate.value = Number(settings.exchange_rate)
      if (settings.agency_fee_rate) feeRate.value = Number(settings.agency_fee_rate)
    }
  } catch (e) {
    console.warn('Load settings in PurchasingView fallback:', e)
  }

  // 로그인된 사용자가 있는 경우 기본 이름 자동 입력
  if (currentUser.value) {
    if (!form.value.receiverName) {
      form.value.receiverName = currentUser.value.user_metadata?.full_name || currentUser.value.user_metadata?.name || ''
    }
  }

  // 계산기에서 넘어온 데이터 처리
  if (history.state && history.state.fromCalculator) {
    const st = history.state
    if (st.priceRmb) {
      form.value.items = [
        {
          url: '',
          option: `계산기 산출 품목 (${st.cbm || '1.0'} CBM / ${st.weightKg || '100'}kg)`,
          priceCny: Number(st.priceRmb),
          qty: 1
        }
      ]
      form.value.memo = `[실시간 무역 계산기 견적 연동]\n- 예상 총 수입 견적: 약 ${(Number(st.estimatedTotal) || 0).toLocaleString()}원\n- 운송 방식: ${st.shippingMode || '해운 LCL'}`
    }
  }
})

const submitPurchasingForm = async () => {
  isSubmitting.value = true

  const servicesSummary = getSelectedServicesSummary()
  const fullMemo = form.value.memo 
    ? `[부가서비스 신청]\n${servicesSummary}\n\n[고객 요청사항]\n${form.value.memo}`
    : `[부가서비스 신청]\n${servicesSummary}`

  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('applications').insert([
        {
          service_type: 'purchasing',
          service_name: '구매대행',
          customer_name: form.value.receiverName,
          phone: form.value.phone,
          email: currentUser.value?.email || '',
          user_id: currentUser.value?.id || null,
          status: '접수대기',
          total_amount: grandTotal.value,
          memo: fullMemo,
          additional_services: form.value.additionalServices,
          details: {
            customsCode: form.value.customsCode,
            shippingType: form.value.shippingType,
            address: form.value.address,
            exchangeRate: exchangeRate.value,
            totalCny: totalCny.value,
            totalKrw: totalKrw.value,
            agencyFee: agencyFee.value,
            items: form.value.items,
            additionalServices: form.value.additionalServices,
            additionalServicesSummary: servicesSummary
          }
        }
      ])

      if (error) {
        throw error
      }
    }
    showModal.value = true
  } catch (err) {
    console.error('Supabase purchasing insert error:', err)
    alert(`구매대행 주문서 접수 중 오류가 발생했습니다: ${err.message || '잠시 후 다시 시도해 주세요.'}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>
