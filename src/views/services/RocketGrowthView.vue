<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-12 sm:py-20 text-white overflow-hidden">
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
            <a 
              href="#apply-form" 
              class="px-6 py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black rounded-xl shadow-lg shadow-red-600/30 hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm sm:text-base"
            >
              <i class="fas fa-file-invoice"></i>
              <span>로켓그로스 입고 신청서 작성</span>
              <i class="fas fa-arrow-down text-xs"></i>
            </a>

            <div class="flex items-center gap-2 text-xs text-slate-400">
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

      <!-- 4-Step Process -->
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

      <!-- Advanced Rocket-Growth Application Form -->
      <section id="apply-form" class="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-10 border-2 border-red-500/20 shadow-2xl space-y-8">
        
        <!-- Form Title Header -->
        <div class="border-b border-gray-100 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full mb-2">
              <i class="fas fa-clipboard-check"></i>
              <span>ROCKET-GROWTH ORDER FORM</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-gray-900">
              쿠팡 로켓그로스 정밀 입고 대행 신청서
            </h2>
            <p class="text-xs sm:text-sm text-gray-500 mt-1">
              입고 품목과 가공 작업 요청사항을 입력해 주시면 전담 매니저가 라벨 규격 검토 후 견적을 안내합니다.
            </p>
          </div>
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <i class="fas fa-comment"></i>
            <span>카톡 실시간 라벨 검토 문의</span>
          </a>
        </div>

        <form @submit.prevent="submitRocketGrowthForm" class="space-y-8">
          
          <!-- 1. 기본 화주 정보 -->
          <div class="space-y-4">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <span>화주 기본 정보</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">화주명 / 상호명 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.companyName" 
                  type="text" 
                  required 
                  placeholder="예: 주식회사 알파 / 홍길동"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">연락처 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.phone" 
                  type="tel" 
                  required 
                  placeholder="예: 010-1234-5678"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">개인/사업자 통관부호 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.customsCode" 
                  type="text" 
                  required 
                  placeholder="예: P123456789012 또는 사업자등록번호"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">입고 희망일 <span class="text-red-500">*</span></label>
                <input 
                  v-model="form.targetDate" 
                  type="date" 
                  required
                  @click="openDatePicker($event)"
                  @focus="openDatePicker($event)"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs sm:text-sm outline-none cursor-pointer transition"
                />
              </div>
            </div>
          </div>

          <!-- 2. 입고 방식 및 쿠팡 FC 센터 선택 -->
          <div class="space-y-4 pt-4 border-t border-gray-100">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <span>입고 방식 및 쿠팡 물류센터(FC) 지정</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- 입고 방식 -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">입고 방식 선택 <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-2 gap-3">
                  <label class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition" :class="form.deliveryMethod === 'milkrun' ? 'border-red-600 bg-red-50/50 text-red-900 font-bold' : 'border-gray-200 text-gray-700'">
                    <input type="radio" value="milkrun" v-model="form.deliveryMethod" class="text-red-600" />
                    <span class="text-xs sm:text-sm">밀크런 입고 (트럭 연계)</span>
                  </label>
                  <label class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition" :class="form.deliveryMethod === 'courier' ? 'border-red-600 bg-red-50/50 text-red-900 font-bold' : 'border-gray-200 text-gray-700'">
                    <input type="radio" value="courier" v-model="form.deliveryMethod" class="text-red-600" />
                    <span class="text-xs sm:text-sm">택배 / 화물 직납</span>
                  </label>
                </div>
              </div>

              <!-- 쿠팡 센터 -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">입고 지정 쿠팡 물류센터(FC) <span class="text-red-500">*</span></label>
                <select 
                  v-model="form.coupangFC" 
                  required
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs sm:text-sm outline-none cursor-pointer"
                >
                  <option value="안성1센터">안성1센터 (경기 안성시)</option>
                  <option value="안성4센터">안성4센터 (경기 안성시)</option>
                  <option value="안성5센터">안성5센터 (경기 안성시)</option>
                  <option value="인천4센터">인천4센터 (인천 서구)</option>
                  <option value="인천14센터">인천14센터 (인천 중구)</option>
                  <option value="고양1센터">고양1센터 (경기 고양시)</option>
                  <option value="덕평센터">덕평센터 (경기 이천시)</option>
                  <option value="용인센터">용인센터 (경기 처인구)</option>
                  <option value="대구FC">대구 메가FC (대구 달성군)</option>
                  <option value="김천FC">김천FC (경북 김천시)</option>
                  <option value="칠곡FC">칠곡FC (경북 칠곡군)</option>
                  <option value="창원1센터">창원1센터 (경남 창원시)</option>
                  <option value="광주FC">광주FC (광주 평동)</option>
                  <option value="other">기타 센터 (직접 기재)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 3. 다중 품목 입력 테이블 (행 추가/삭제) -->
          <div class="space-y-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                <span>입고 대상 품목 리스트</span>
              </h3>
              <button 
                type="button" 
                @click="addProductRow"
                class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow"
              >
                <i class="fas fa-plus text-[10px]"></i>
                <span>품목 추가 (+행)</span>
              </button>
            </div>

            <!-- Responsive Table -->
            <div class="overflow-x-auto border border-gray-200 rounded-2xl">
              <table class="w-full text-left text-xs text-gray-700">
                <thead class="bg-slate-100 text-gray-800 font-bold uppercase text-[11px] border-b border-gray-200">
                  <tr>
                    <th class="py-3 px-3 w-10 text-center">No</th>
                    <th class="py-3 px-3 min-w-[140px]">SKU / 바코드 번호 *</th>
                    <th class="py-3 px-3 min-w-[180px]">상품명 및 옵션(색상/사이즈) *</th>
                    <th class="py-3 px-3 min-w-[100px]">입고 수량 (EA) *</th>
                    <th class="py-3 px-3 min-w-[110px]">박스당 수량 (EA)</th>
                    <th class="py-3 px-3 min-w-[90px]">총 박스 (BOX)</th>
                    <th class="py-3 px-2 w-12 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="(item, idx) in form.items" :key="idx" class="hover:bg-slate-50 transition">
                    <td class="py-2.5 px-3 text-center text-gray-400 font-bold">{{ idx + 1 }}</td>
                    <td class="py-2 px-3">
                      <input 
                        v-model="item.sku" 
                        type="text" 
                        required 
                        placeholder="예: 880912345678"
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-red-600"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input 
                        v-model="item.name" 
                        type="text" 
                        required 
                        placeholder="예: 실리콘 조리도구 5종 세트 (블랙)"
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-red-600"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input 
                        v-model.number="item.qty" 
                        type="number" 
                        min="1" 
                        required 
                        placeholder="예: 500"
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-red-600 text-right"
                      />
                    </td>
                    <td class="py-2 px-3">
                      <input 
                        v-model.number="item.qtyPerBox" 
                        type="number" 
                        min="1" 
                        placeholder="예: 50"
                        class="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-red-600 text-right"
                      />
                    </td>
                    <td class="py-2 px-3 text-center font-bold text-gray-900">
                      {{ calculateTotalBoxes(item) }} 박스
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

            <!-- Table Summary -->
            <div class="flex items-center justify-between text-xs bg-slate-100 p-3.5 rounded-xl text-gray-800 font-bold">
              <span>총 품목 수: {{ form.items.length }}종</span>
              <div class="flex items-center gap-4">
                <span>총 수량: {{ totalQuantity.toLocaleString() }} EA</span>
                <span class="text-red-600">총 박스: {{ grandTotalBoxes.toLocaleString() }} BOX</span>
              </div>
            </div>
          </div>

          <!-- 4. 현지 작업 요청 사항 (다중 체크박스) -->
          <div class="space-y-4 pt-4 border-t border-gray-100">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">4</span>
              <span>현지 창고 가공 / 작업 요청 (다중 선택)</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label class="flex items-start gap-2.5 p-3.5 rounded-2xl border border-gray-200 bg-slate-50 hover:bg-red-50/40 cursor-pointer transition">
                <input v-model="form.services.barcode" type="checkbox" class="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                <div class="text-xs">
                  <span class="font-bold text-gray-900 block">쿠팡 상품 바코드 부착</span>
                  <span class="text-gray-500 text-[11px]">개별 상품에 SKU 바코드 인쇄 및 정밀 부착</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3.5 rounded-2xl border border-gray-200 bg-slate-50 hover:bg-red-50/40 cursor-pointer transition">
                <input v-model="form.services.kclabel" type="checkbox" class="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                <div class="text-xs">
                  <span class="font-bold text-gray-900 block">KC인증 / 한글표시사항 라벨</span>
                  <span class="text-gray-500 text-[11px]">수입식품/공산품 법정 한글 표시사항 라벨링</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3.5 rounded-2xl border border-gray-200 bg-slate-50 hover:bg-red-50/40 cursor-pointer transition">
                <input v-model="form.services.pallet" type="checkbox" class="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                <div class="text-xs">
                  <span class="font-bold text-gray-900 block">파레트 적재 & 랩핑</span>
                  <span class="text-gray-500 text-[11px]">1100×1100 파레트 규격 적재 및 스트레치 필름 랩핑</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3.5 rounded-2xl border border-gray-200 bg-slate-50 hover:bg-red-50/40 cursor-pointer transition">
                <input v-model="form.services.repack" type="checkbox" class="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                <div class="text-xs">
                  <span class="font-bold text-gray-900 block">세트 OPP / 에어캡 완충 포장</span>
                  <span class="text-gray-500 text-[11px]">파손 위험 상품 에어캡 보강 및 묶음 OPP 포장</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3.5 rounded-2xl border border-gray-200 bg-slate-50 hover:bg-red-50/40 cursor-pointer transition">
                <input v-model="form.services.inspection" type="checkbox" class="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                <div class="text-xs">
                  <span class="font-bold text-gray-900 block">정밀 전수 검품 (불량 선별)</span>
                  <span class="text-gray-500 text-[11px]">외관 스크래치, 마감 불량, 작동 검사 진행</span>
                </div>
              </label>
            </div>
          </div>

          <!-- 5. 파일 첨부 및 추가 메모 -->
          <div class="space-y-4 pt-4 border-t border-gray-100">
            <h3 class="text-sm font-black text-gray-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">5</span>
              <span>라벨 파일 첨부 및 추가 요청 사항</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">
                  쿠팡 바코드 / 라벨 파일 첨부 (PDF, ZIP, 이미지)
                </label>
                <input 
                  type="file" 
                  multiple 
                  @change="handleFileUpload"
                  class="w-full p-2.5 border border-dashed border-gray-300 rounded-xl bg-slate-50 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
                <p class="text-[11px] text-gray-400 mt-1">※ 파일이 여러 개인 경우 ZIP 압축 후 업로드해 주셔도 됩니다.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">추가 요청 사항</label>
                <textarea 
                  v-model="form.memo" 
                  rows="3" 
                  placeholder="쿠팡 입고 승인 일정, 특이 박스 규격, 출고 긴급도 등을 자유롭게 적어주세요."
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-100 text-xs outline-none"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="w-full py-4 bg-gradient-to-r from-red-600 via-amber-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
            >
              <i v-if="isSubmitting" class="fas fa-spinner animate-spin"></i>
              <i v-else class="fas fa-paper-plane"></i>
              <span>{{ isSubmitting ? '신청서 전송 중...' : '쿠팡 로켓그로스 입고 대행 신청하기' }}</span>
            </button>
          </div>

        </form>

      </section>

    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl text-gray-900">
        <div class="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3 class="text-xl font-bold">로켓그로스 신청서가 접수되었습니다!</h3>
        <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">
          <strong>{{ form.companyName }}</strong> 님의 쿠팡 입고 대행 의뢰가 정상 접수되었습니다.<br />
          입고 희망일(<strong>{{ form.targetDate }}</strong>) 및 <strong>{{ form.coupangFC }}</strong> 기준으로 담당 매니저가 <strong>{{ form.phone }}</strong> 번호로 즉시 안내해 드리겠습니다.
        </p>
        <div class="bg-slate-50 p-3 rounded-xl text-xs text-left space-y-1 border border-gray-100">
          <p><strong>총 품목:</strong> {{ form.items.length }}종 ({{ totalQuantity.toLocaleString() }} EA)</p>
          <p><strong>입고 방식:</strong> {{ form.deliveryMethod === 'milkrun' ? '밀크런 트럭 연계' : '택배/화물 직납' }}</p>
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
import { ref, computed } from 'vue'

const isSubmitting = ref(false)
const showModal = ref(false)

const form = ref({
  companyName: '',
  phone: '',
  customsCode: '',
  targetDate: '',
  deliveryMethod: 'milkrun',
  coupangFC: '안성4센터',
  items: [
    { sku: '', name: '', qty: 100, qtyPerBox: 20 }
  ],
  services: {
    barcode: true,
    kclabel: false,
    pallet: true,
    repack: false,
    inspection: true
  },
  memo: '',
  files: []
})

const openDatePicker = (event) => {
  if (event && event.target && typeof event.target.showPicker === 'function') {
    try {
      event.target.showPicker()
    } catch (e) {
      // ignore
    }
  }
}

const addProductRow = () => {
  form.value.items.push({
    sku: '',
    name: '',
    qty: 100,
    qtyPerBox: 20
  })
}

const removeProductRow = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

const calculateTotalBoxes = (item) => {
  if (!item.qty || !item.qtyPerBox) return 0
  return Math.ceil(item.qty / item.qtyPerBox)
}

const totalQuantity = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
})

const grandTotalBoxes = computed(() => {
  return form.value.items.reduce((sum, item) => sum + calculateTotalBoxes(item), 0)
})

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const handleFileUpload = (e) => {
  form.value.files = Array.from(e.target.files)
}

const submitRocketGrowthForm = async () => {
  isSubmitting.value = true

  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('applications').insert([
        {
          service_type: 'rocket_growth',
          service_name: '쿠팡 로켓그로스',
          customer_name: form.value.companyName,
          phone: form.value.phone,
          status: '접수대기',
          total_amount: 0,
          memo: form.value.memo || '',
          details: {
            customsCode: form.value.customsCode,
            targetDate: form.value.targetDate,
            shippingType: form.value.shippingType,
            targetFc: form.value.coupangFC || form.value.targetFc,
            items: form.value.items,
            totalQuantity: totalQuantity.value,
            grandTotalBoxes: grandTotalBoxes.value,
            services: form.value.services
          }
        }
      ])

      if (error) {
        throw error
      }
    }
    showModal.value = true
  } catch (err) {
    console.error('Supabase rocket growth insert error:', err)
    alert(`로켓그로스 신청서 접수 중 오류가 발생했습니다: ${err.message || '잠시 후 다시 시도해 주세요.'}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>
