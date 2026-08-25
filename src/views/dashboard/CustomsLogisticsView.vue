<template>
  <div class="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 space-y-6">

    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black tracking-wide">
            Uni-Pass &amp; Domestic Logistics
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            세관 수입통관 &amp; 국내 배송 통합 관리
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          관세청 유니패스(Uni-Pass) 통관 현황, 한·중 FTA C/O 적용 내역 및 국내 화물·로켓그로스 배송을 실시간 추적합니다.
        </p>
      </div>

      <!-- 상단 액션 버튼 -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          @click="openFtaModal"
          class="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs shadow-xs transition flex items-center gap-2 active:scale-95"
        >
          <FileCheck class="w-4 h-4 text-indigo-600" />
          <span>한·중 FTA C/O 신청</span>
        </button>
        <a
          href="https://unipass.customs.go.kr/csp/index.do"
          target="_blank"
          rel="noopener noreferrer"
          class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-95"
        >
          <ExternalLink class="w-4 h-4 text-indigo-400" />
          <span>관세청 유니패스 바로가기</span>
        </a>
      </div>
    </div>

    <!-- 공통 8단계 프로세스 스텝 바 -->
    <OrderProcessStepper currentSection="customs" />

    <!-- ======================================================== -->
    <!-- 2. 4대 핵심 지표 요약 카드 -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between hover:border-blue-300 transition select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">해상 운송중 (선적)</span>
          <div class="text-lg font-bold text-gray-900 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.shipping }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
          <Ship class="w-3.5 h-3.5" />
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between hover:border-orange-300 transition select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">세관 수입통관 (7단계)</span>
          <div class="text-lg font-bold text-orange-600 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.customs }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-700 flex items-center justify-center shrink-0">
          <ShieldAlert class="w-3.5 h-3.5" />
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between hover:border-indigo-300 transition select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">한·중 FTA C/O 적용</span>
          <div class="text-lg font-bold text-indigo-600 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.fta }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0">
          <Award class="w-3.5 h-3.5" />
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between hover:border-emerald-300 transition select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">국내 배송 / 완료 (8단계)</span>
          <div class="text-lg font-bold text-emerald-600 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.delivered }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
          <Truck class="w-3.5 h-3.5" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 필터 바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-bold text-gray-900">실시간 통관 &amp; 배송 트래킹</h2>
        <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-mono font-bold">{{ filteredLogistics.length }}건</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="B/L번호, 주문번호, 송장번호 검색"
            class="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56"
          />
        </div>
        <select
          v-model="statusFilter"
          class="px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none cursor-pointer"
        >
          <option value="all">전체 상태</option>
          <option value="sailing">해상 운송중</option>
          <option value="customs">세관 수입통관</option>
          <option value="cleared">통관 수리완료</option>
          <option value="delivery">국내 배송중</option>
          <option value="delivered">배송 완료</option>
        </select>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. [7단계] 세관 수입통관 카드 섹션 -->
    <!-- ======================================================== -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <div class="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs">7</div>
        <h2 class="text-sm font-extrabold text-gray-900">세관 수입통관 현황</h2>
        <span class="text-xs text-gray-400 font-mono">· 관세청 유니패스 연동</span>
      </div>

      <div v-if="step7Items.length === 0" class="bg-white border border-dashed border-gray-300 rounded-2xl py-10 text-center text-gray-400">
        <ShieldAlert class="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p class="text-sm font-bold text-gray-500">현재 통관 진행 중인 화물이 없습니다.</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="item in step7Items"
          :key="item.id"
          class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition-shadow"
        >
          <!-- 카드 헤더 -->
          <div class="px-5 py-3.5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                :class="getCustomsBadgeClass(item.customsStep)"
              >
                <span class="w-1.5 h-1.5 rounded-full animate-pulse" :class="getCustomsDotClass(item.customsStep)"></span>
                {{ item.customsStepName }}
              </div>
              <!-- FTA C/O 뱃지 -->
              <span
                v-if="item.ftaStatus === 'approved'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 cursor-help"
                title="한·중 FTA 협정세율 적용 — 기본관세 0% 감면 (C/O 원산지증명서 발급완료)"
              >
                <Award class="w-3 h-3" />
                FTA C/O 0%
              </span>
              <span
                v-else-if="item.ftaStatus === 'applying'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200"
              >
                <Clock class="w-3 h-3" />
                C/O 심사중
              </span>
            </div>
            <button
              type="button"
              @click="openDetailModal(item)"
              class="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 hover:underline"
            >
              통관 타임라인 <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="p-5 space-y-4 text-xs">
            <!-- B/L 번호 & 주문번호 -->
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">H B/L No.</span>
                  <span class="font-mono font-bold text-indigo-700 text-sm">{{ item.hblNo }}</span>
                  <button
                    @click="copyText(item.hblNo)"
                    class="p-0.5 text-gray-400 hover:text-indigo-600 transition rounded"
                    title="B/L 번호 복사"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
                <div class="text-[11px] text-gray-500 font-mono">주문번호: {{ item.orderNo }}</div>
                <div v-if="item.cargoMgtNo" class="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                  화물관리번호: <span class="font-bold text-gray-700">{{ item.cargoMgtNo }}</span>
                </div>
                <div v-if="item.declarationNo" class="text-[11px] text-gray-500 font-mono">
                  수입신고번호: <span class="font-medium text-gray-700">{{ item.declarationNo }}</span>
                </div>
              </div>
              <!-- 유니패스 조회 버튼 -->
              <a
                :href="`https://unipass.customs.go.kr/csp/index.do`"
                target="_blank"
                rel="noopener noreferrer"
                class="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-900 text-white transition text-center"
                title="관세청 유니패스에서 화물진행정보 조회"
              >
                <ExternalLink class="w-3.5 h-3.5 text-indigo-400" />
                <span class="text-[10px] font-bold leading-none">유니패스<br/>조회</span>
              </a>
            </div>

            <!-- 상품명 -->
            <div class="font-bold text-gray-900 line-clamp-1 text-sm">{{ item.productName }}</div>

            <!-- 제원 그리드 -->
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-slate-50 rounded-xl p-2.5 text-center">
                <div class="text-[10px] text-gray-400 mb-0.5">수량</div>
                <div class="font-bold text-gray-900 font-mono">{{ item.quantity.toLocaleString() }}<span class="text-[10px] text-gray-400">개</span></div>
              </div>
              <div class="bg-slate-50 rounded-xl p-2.5 text-center">
                <div class="text-[10px] text-gray-400 mb-0.5">중량</div>
                <div class="font-bold text-gray-900 font-mono">{{ item.weightKg }}<span class="text-[10px] text-gray-400">kg</span></div>
              </div>
              <div class="bg-slate-50 rounded-xl p-2.5 text-center">
                <div class="text-[10px] text-gray-400 mb-0.5">부피</div>
                <div class="font-bold text-teal-700 font-mono">{{ item.cbm }}<span class="text-[10px] text-teal-500">CBM</span></div>
              </div>
            </div>

            <!-- 선박/항구 정보 -->
            <div class="flex items-center gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <Ship class="w-4 h-4 text-blue-600 shrink-0" />
              <div class="min-w-0">
                <div class="font-bold text-gray-800">{{ item.vesselName }}</div>
                <div class="text-[11px] text-gray-500">
                  {{ item.departurePort }} ➔ {{ item.arrivalPort }}
                  <span class="font-mono text-blue-600 ml-1">입항: {{ item.arrivalDate }}</span>
                </div>
              </div>
            </div>

            <!-- FTA 관세 감면 안내 -->
            <div
              v-if="item.ftaStatus === 'approved'"
              class="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-start gap-2"
            >
              <ShieldCheck class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div class="space-y-0.5">
                <div class="font-bold text-indigo-800">한·중 FTA 협정관세 0% 적용 확정</div>
                <p class="text-[11px] text-indigo-700">
                  원산지증명서(C/O) 발급 완료 — 기본관세율 8% → FTA 협정세율 <b class="text-indigo-900">0%</b> 감면 적용.
                  관세 절감액: <b class="text-indigo-900">₩{{ (item.estimatedDutySaving || 0).toLocaleString() }}원 절감</b>
                </p>
              </div>
            </div>

            <!-- 1:1 카카오톡 문의 -->
            <div class="flex items-center justify-between pt-1 border-t border-gray-100">
              <span class="text-[11px] text-gray-400">통관 관련 문의가 있으신가요?</span>
              <a
                :href="getKakaoUrl(item)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEE500] hover:bg-yellow-400 text-[#3A1D1D] font-bold text-[11px] transition active:scale-95"
              >
                <MessageCircle class="w-3.5 h-3.5" />
                <span>1:1 카카오톡 상담</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. [8단계] 국내 배송 / 로켓그로스 직송 카드 섹션 -->
    <!-- ======================================================== -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <div class="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-xs">8</div>
        <h2 class="text-sm font-extrabold text-gray-900">국내 배송 &amp; 로켓그로스 입고 현황</h2>
        <span class="text-xs text-gray-400 font-mono">· 화물·택배·FC 밀크런 통합</span>
      </div>

      <div v-if="step8Items.length === 0" class="bg-white border border-dashed border-gray-300 rounded-2xl py-10 text-center text-gray-400">
        <Truck class="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p class="text-sm font-bold text-gray-500">현재 국내 배송 중인 화물이 없습니다.</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="item in step8Items"
          :key="item.id"
          class="bg-white border rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition-shadow"
          :class="item.customsStep === 'delivered' ? 'border-emerald-300' : 'border-gray-200'"
        >
          <!-- 카드 헤더 -->
          <div
            class="px-5 py-3.5 border-b flex items-center justify-between"
            :class="item.customsStep === 'delivered'
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100'
              : 'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-100'"
          >
            <div class="flex items-center gap-2">
              <!-- 배송 유형 뱃지 -->
              <span
                v-if="item.deliveryType === 'rocket'"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black"
              >
                🚀 로켓그로스 FC 직송
              </span>
              <span
                v-else-if="item.deliveryType === 'cargo'"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700 text-white text-[10px] font-black"
              >
                🚛 화물 운송
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-600 text-white text-[10px] font-black"
              >
                📦 일반 택배
              </span>

              <!-- 완료 태그 -->
              <span
                v-if="item.customsStep === 'delivered'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300"
              >
                <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                배송 완료
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                :class="getCustomsBadgeClass(item.customsStep)"
              >
                <span class="w-1.5 h-1.5 rounded-full animate-pulse" :class="getCustomsDotClass(item.customsStep)"></span>
                {{ item.customsStepName }}
              </span>
            </div>

            <!-- FTA 뱃지 -->
            <span
              v-if="item.ftaStatus === 'approved'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 cursor-help"
              title="한·중 FTA 협정관세 0% 적용 완료"
            >
              <Award class="w-3 h-3" />
              FTA 0%
            </span>
          </div>

          <div class="p-5 space-y-4 text-xs">
            <!-- 상품명 & 주문번호 -->
            <div class="space-y-1">
              <div class="font-bold text-gray-900 text-sm line-clamp-1">{{ item.productName }}</div>
              <div class="text-[11px] text-gray-500 font-mono">{{ item.orderNo }}</div>
            </div>

            <!-- ① 화물/택배형 -->
            <template v-if="item.deliveryType !== 'rocket'">
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Truck class="w-4 h-4 text-slate-600 shrink-0" />
                    <span class="font-bold text-gray-900">{{ item.courierCompany }}</span>
                  </div>
                  <a
                    v-if="item.trackingNo && item.trackingUrl"
                    :href="item.trackingUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition active:scale-95"
                  >
                    <ExternalLink class="w-3 h-3" />
                    배송 추적
                  </a>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-gray-400">운송장 번호:</span>
                  <span class="font-mono font-bold text-indigo-700">{{ item.trackingNo || '배정 전' }}</span>
                  <button
                    v-if="item.trackingNo"
                    @click="copyText(item.trackingNo)"
                    class="p-0.5 text-gray-400 hover:text-indigo-600 transition"
                    title="운송장 번호 복사"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
                <div v-if="item.deliveryEta" class="text-[11px] text-gray-600">
                  배송 예정일: <span class="font-bold text-gray-800">{{ item.deliveryEta }}</span>
                </div>
              </div>
            </template>

            <!-- ② 로켓그로스 FC 밀크런/직송형 -->
            <template v-else>
              <div class="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                <div class="flex items-center gap-2 font-bold text-rose-800">
                  <span class="text-base">🏭</span>
                  <span>쿠팡 FC 센터 직송 배차 정보</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px]">
                  <div class="bg-white rounded-lg p-2 border border-rose-100">
                    <div class="text-gray-400 mb-0.5">지정 FC 센터</div>
                    <div class="font-bold text-gray-900">{{ item.rocketFcCenter || '미정' }}</div>
                  </div>
                  <div class="bg-white rounded-lg p-2 border border-rose-100">
                    <div class="text-gray-400 mb-0.5">입고 예정일시</div>
                    <div class="font-bold text-rose-700">{{ item.rocketInboundDate || '일정 협의중' }}</div>
                  </div>
                  <div class="bg-white rounded-lg p-2 border border-rose-100">
                    <div class="text-gray-400 mb-0.5">배차 차량번호</div>
                    <div class="font-bold text-gray-900 font-mono">{{ item.rocketTruckNo || '-' }}</div>
                  </div>
                  <div class="bg-white rounded-lg p-2 border border-rose-100">
                    <div class="text-gray-400 mb-0.5">기사 연락처</div>
                    <a
                      v-if="item.rocketDriverPhone"
                      :href="`tel:${item.rocketDriverPhone}`"
                      class="font-bold text-indigo-600 hover:underline font-mono"
                    >
                      {{ item.rocketDriverPhone }}
                    </a>
                    <span v-else class="text-gray-400">-</span>
                  </div>
                </div>
                <div v-if="item.rocketSkuCount" class="text-[11px] text-rose-700 bg-white rounded-lg p-2 border border-rose-100">
                  입고 SKU: <span class="font-bold">{{ item.rocketSkuCount }}종</span>
                  · 총 수량: <span class="font-bold">{{ item.quantity.toLocaleString() }}개</span>
                  <span v-if="item.barcodeLabelFilename" class="ml-2 text-indigo-600">
                    · 바코드 라벨: {{ item.barcodeLabelFilename }}
                  </span>
                </div>
              </div>
            </template>

            <!-- 1:1 카카오톡 문의 -->
            <div class="flex items-center justify-between pt-1 border-t border-gray-100">
              <span class="text-[11px] text-gray-400">배송 관련 문의는 카카오톡으로</span>
              <a
                :href="getKakaoUrl(item)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEE500] hover:bg-yellow-400 text-[#3A1D1D] font-bold text-[11px] transition active:scale-95"
              >
                <MessageCircle class="w-3.5 h-3.5" />
                <span>1:1 카카오톡 상담</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 6. 전체 B/L 목록 테이블 (검색/필터 결과) -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-900">전체 B/L 통관 &amp; 배송 목록</h3>
        <span class="text-[11px] text-gray-400">{{ filteredLogistics.length }}건 표시 중</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-100 border-b border-slate-200 text-slate-900 font-bold uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4 font-bold text-slate-900">B/L · 화물번호</th>
              <th class="py-3 px-4 font-bold text-slate-900">품목 및 규격</th>
              <th class="py-3 px-4 font-bold text-slate-900">선박 / 항구</th>
              <th class="py-3 px-4 font-bold text-slate-900">유니패스 통관 단계</th>
              <th class="py-3 px-4 font-bold text-slate-900">FTA C/O</th>
              <th class="py-3 px-4 font-bold text-slate-900">국내 운송장</th>
              <th class="py-3 px-4 text-center font-bold text-slate-900">액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="item in filteredLogistics" :key="item.id" class="hover:bg-slate-50/80 transition">
              <!-- B/L & 주문번호 -->
              <td class="py-3.5 px-4">
                <div class="font-mono font-bold text-indigo-600 flex items-center gap-1">
                  {{ item.hblNo }}
                  <button @click="copyText(item.hblNo)" class="text-gray-400 hover:text-gray-600" title="복사">
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
                <div class="text-[11px] text-gray-500 font-mono mt-0.5">{{ item.orderNo }}</div>
                <div v-if="item.cargoMgtNo" class="text-[10px] text-gray-400 font-mono">화물관리: {{ item.cargoMgtNo }}</div>
              </td>
              <!-- 품목 -->
              <td class="py-3.5 px-4">
                <div class="font-bold text-gray-900 line-clamp-1 max-w-[180px]">{{ item.productName }}</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ item.quantity.toLocaleString() }}개 · {{ item.weightKg }}kg · {{ item.cbm }}CBM</div>
              </td>
              <!-- 선박/항구 -->
              <td class="py-3.5 px-4">
                <div class="font-medium text-gray-800">{{ item.vesselName }}</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ item.departurePort }} ➔ {{ item.arrivalPort }}</div>
                <div class="text-[10px] text-blue-600 font-mono mt-0.5">{{ item.arrivalDate }}</div>
              </td>
              <!-- 통관단계 + 유니패스 링크 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-1.5">
                  <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" :class="getCustomsBadgeClass(item.customsStep)">
                    <span class="w-1.5 h-1.5 rounded-full" :class="getCustomsDotClass(item.customsStep)"></span>
                    {{ item.customsStepName }}
                  </div>
                  <a
                    href="https://unipass.customs.go.kr/csp/index.do"
                    target="_blank"
                    class="text-slate-500 hover:text-indigo-700 transition"
                    title="유니패스 화물진행정보 조회"
                  >
                    <ExternalLink class="w-3 h-3" />
                  </a>
                </div>
                <div class="text-[10px] text-gray-400 mt-1 font-mono">{{ item.declarationNo || '-' }}</div>
              </td>
              <!-- FTA C/O -->
              <td class="py-3.5 px-4">
                <span v-if="item.ftaStatus === 'approved'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  <CheckCircle2 class="w-3 h-3" /> 적용완료 0%
                </span>
                <span v-else-if="item.ftaStatus === 'applying'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                  <Clock class="w-3 h-3" /> 심사중
                </span>
                <span v-else class="text-[10px] text-gray-400">미신청</span>
              </td>
              <!-- 운송장 -->
              <td class="py-3.5 px-4">
                <template v-if="item.deliveryType === 'rocket'">
                  <div class="text-[10px] font-bold text-rose-600">🚀 FC 직송</div>
                  <div class="text-[10px] text-gray-500 mt-0.5">{{ item.rocketFcCenter || '-' }}</div>
                </template>
                <template v-else-if="item.trackingNo">
                  <div class="font-bold text-gray-800 text-[11px]">{{ item.courierCompany }}</div>
                  <a :href="item.trackingUrl" target="_blank" class="text-[11px] text-indigo-600 hover:underline font-mono flex items-center gap-1 mt-0.5">
                    {{ item.trackingNo }} <ExternalLink class="w-3 h-3" />
                  </a>
                </template>
                <span v-else class="text-[10px] text-gray-400">세관 반출 대기</span>
              </td>
              <!-- 액션 -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="openDetailModal(item)"
                    class="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 font-bold text-[11px] transition"
                  >
                    상세보기
                  </button>
                  <a
                    :href="getKakaoUrl(item)"
                    target="_blank"
                    class="px-2 py-1.5 rounded-lg bg-[#FEE500] hover:bg-yellow-400 text-[#3A1D1D] font-bold text-[11px] transition flex items-center gap-1"
                    title="카카오톡 1:1 상담"
                  >
                    <MessageCircle class="w-3 h-3" />
                  </a>
                </div>
              </td>
            </tr>
            <tr v-if="filteredLogistics.length === 0">
              <td colspan="7" class="py-14 text-center text-gray-400">
                <Search class="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p class="font-bold text-gray-500">검색 결과가 없습니다.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 모달 A: 한·중 FTA C/O 신청 -->
    <!-- ======================================================== -->
    <div v-if="showFtaModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Award class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900">한·중 FTA 원산지증명서(C/O) 신청</h3>
              <p class="text-xs text-gray-500">협정관세 적용으로 수입 관세를 대폭 절감합니다.</p>
            </div>
          </div>
          <button @click="showFtaModal = false" class="text-gray-400 hover:text-gray-600 p-1">
            <X class="w-5 h-5" />
          </button>
        </div>
        <form @submit.prevent="submitFtaApplication" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">대상 발주번호</label>
            <select v-model="ftaForm.orderNo" required class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium">
              <option value="" disabled>발주 건을 선택하세요</option>
              <option v-for="ord in allLogisticsList" :key="ord.orderNo" :value="ord.orderNo">
                {{ ord.orderNo }} ({{ ord.productName.slice(0, 22) }}...)
              </option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">HS CODE (6~10자리)</label>
              <input type="text" v-model="ftaForm.hsCode" placeholder="예: 6204.42.0000" required class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">예상 FTA 관세율</label>
              <input type="text" value="8.0% → 0.0% (관세 면제)" readonly class="w-full px-3.5 py-2 rounded-xl bg-gray-50 text-indigo-700 font-bold border border-gray-200" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-1">중국 현지 제조사 영문 상호</label>
            <input type="text" v-model="ftaForm.manufacturer" placeholder="예: YIWU JINHAO TRADE CO., LTD." required class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div class="p-3 bg-indigo-50 rounded-xl text-indigo-800 text-[11px] space-y-1">
            <div class="font-bold flex items-center gap-1">
              <ShieldCheck class="w-3.5 h-3.5" />
              EUCHS 관세사 C/O 원스톱 발급 대행
            </div>
            <p class="text-indigo-700">중국 세관(CCPIT) 전자 C/O 발급 후 한국 관세청 유니패스에 전자통보(CO-PASS)됩니다.</p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" @click="showFtaModal = false" class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition">취소</button>
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm">C/O 발급 신청하기</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 모달 B: 통관 상세 타임라인 -->
    <!-- ======================================================== -->
    <div v-if="selectedDetail" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold font-mono">H B/L: {{ selectedDetail.hblNo }}</span>
              <span v-if="selectedDetail.cargoMgtNo" class="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono">화물관리번호: {{ selectedDetail.cargoMgtNo }}</span>
            </div>
            <h3 class="text-base font-bold text-gray-900 line-clamp-1">{{ selectedDetail.productName }}</h3>
          </div>
          <button @click="selectedDetail = null" class="text-gray-400 hover:text-gray-600 p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 통관 타임라인 -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-gray-700">관세청 유니패스 실시간 통관 진행 타임라인</h4>
          <div class="relative border-l-2 border-indigo-200 ml-4 space-y-4 py-1 text-xs">
            <div v-for="(step, idx) in clearanceSteps" :key="step.key" class="relative pl-6">
              <div
                class="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center"
                :class="idx <= getStepIndex(selectedDetail.customsStep) ? 'border-indigo-600' : 'border-gray-300'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="idx <= getStepIndex(selectedDetail.customsStep) ? 'bg-indigo-600' : 'bg-gray-300'"></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="font-bold" :class="idx <= getStepIndex(selectedDetail.customsStep) ? 'text-gray-900' : 'text-gray-400'">{{ step.label }}</span>
                <span class="text-[10px] font-mono text-gray-400">{{ idx <= getStepIndex(selectedDetail.customsStep) ? step.date : '-' }}</span>
              </div>
              <p class="text-[11px] text-gray-500 mt-0.5">{{ step.desc }}</p>
            </div>
          </div>
        </div>

        <!-- FTA C/O 감면 안내 -->
        <div v-if="selectedDetail.ftaStatus === 'approved'" class="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200 text-xs space-y-1">
          <div class="font-bold text-indigo-800 flex items-center gap-1">
            <Award class="w-3.5 h-3.5" /> 한·중 FTA 협정관세 0% 적용 확정
          </div>
          <p class="text-indigo-700">원산지증명서(C/O) 발급 완료. 기본관세율 8% → FTA 협정세율 <b>0%</b> 감면. 절감액: <b>₩{{ (selectedDetail.estimatedDutySaving || 0).toLocaleString() }}원</b></p>
        </div>

        <!-- 화물 제원 -->
        <div class="p-4 bg-gray-50 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span class="text-gray-400 text-[10px]">선적항 / 입항지</span>
            <div class="font-bold text-gray-800">{{ selectedDetail.departurePort }} ➔ {{ selectedDetail.arrivalPort }}</div>
          </div>
          <div>
            <span class="text-gray-400 text-[10px]">선박명</span>
            <div class="font-bold text-gray-800">{{ selectedDetail.vesselName }}</div>
          </div>
          <div>
            <span class="text-gray-400 text-[10px]">중량 / 부피</span>
            <div class="font-bold text-gray-800">{{ selectedDetail.weightKg }}kg / {{ selectedDetail.cbm }} CBM</div>
          </div>
          <div>
            <span class="text-gray-400 text-[10px]">국내 운송사</span>
            <div class="font-bold text-indigo-600">{{ selectedDetail.courierCompany || '세관통관중' }}</div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-gray-100">
          <a
            :href="getKakaoUrl(selectedDetail)"
            target="_blank"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEE500] hover:bg-yellow-400 text-[#3A1D1D] font-bold text-xs transition"
          >
            <MessageCircle class="w-4 h-4" />
            1:1 카카오톡 문의 ({{ selectedDetail.orderNo }})
          </a>
          <div class="flex items-center gap-2">
            <a
              href="https://unipass.customs.go.kr/csp/index.do"
              target="_blank"
              rel="noopener noreferrer"
              class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <ExternalLink class="w-3.5 h-3.5 text-indigo-400" />
              유니패스 화물조회
            </a>
            <button @click="selectedDetail = null" class="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition">닫기</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 복사 완료 토스트 -->
    <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="copyToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl">
        ✅ 클립보드에 복사되었습니다
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Ship, Truck, ShieldAlert, Award, Search, ExternalLink, Copy,
  CheckCircle2, Clock, FileCheck, ShieldCheck, X, ChevronRight,
  MessageCircle
} from 'lucide-vue-next'
import OrderProcessStepper from '@/components/dashboard/OrderProcessStepper.vue'
import { getStoredOrders } from '@/utils/orderStorage'

const route = useRoute()

// ----------------------------------------------------------------
// 필터 & 모달 상태
// ----------------------------------------------------------------
const searchQuery = ref('')
const statusFilter = ref('all')
const showFtaModal = ref(false)
const selectedDetail = ref(null)
const copyToast = ref(false)
let _copyTimer = null

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'shipping') statusFilter.value = 'delivery'
  else if (newTab === 'customs') statusFilter.value = 'customs'
  else statusFilter.value = 'all'
}, { immediate: true })

const ftaForm = ref({
  orderNo: '',
  hsCode: '6204.42.0000',
  manufacturer: 'YIWU JINHAO TRADE CO., LTD.'
})

// ----------------------------------------------------------------
// 카카오톡 1:1 상담 URL 동적 생성
// KAKAO CHANNEL: http://pf.kakao.com/_xmQWsK/chat
// ----------------------------------------------------------------
const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_xmQWsK/chat'

function getKakaoUrl(item) {
  if (!item) return KAKAO_CHANNEL_URL
  const productShort = (item.productName || '').slice(0, 30)
  const orderNo = item.orderNo || ''
  // 카카오톡 채널은 extras 파라미터로 자동 메시지 지원
  const message = encodeURIComponent(`[${orderNo}] ${productShort} 통관·배송 문의드립니다.`)
  return `${KAKAO_CHANNEL_URL}`
  // 참고: 카카오 채널 직접 파라미터 전달은 채널 설정 필요. 현재는 단순 채널 연결.
}

// ----------------------------------------------------------------
// Mock 데이터 (7단계 통관 + 8단계 배송)
// orderStorage의 실제 orders와 병합하여 사용
// ----------------------------------------------------------------
const MOCK_LOGISTICS = [
  // ── 7단계: 세관 수입통관 진행 중 ──
  {
    id: 'log-001',
    hblNo: 'EUCHS260825-V01',
    cargoMgtNo: 'INCHEON2026-08-25-09182',
    orderNo: 'EUC-20260824-V01',
    productName: '[테스트 샘플] 초경량 접이식 캠핑 체어 알루미늄 프레임 (120 PCS)',
    quantity: 120,
    weightKg: 42.5,
    cbm: 0.352,
    departurePort: '위해(Weihai)항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-25',
    vesselName: 'NEW GOLDEN BRIDGE VII',
    customsStep: 'customs',
    customsStepName: '세관 심사진행중',
    declarationNo: '12345-26-100512U',
    ftaStatus: 'approved',
    estimatedDutySaving: 42000,
    deliveryType: 'cargo',
    courierCompany: '경동택배(화물)',
    trackingNo: '',
    trackingUrl: '',
    stage: 7
  },
  {
    id: 'log-002',
    hblNo: 'EUCHS260823-002',
    cargoMgtNo: 'PYEONGTAEK2026-08-23-04512',
    orderNo: 'EUC-20260823-014',
    productName: '304 스테인리스 이중 진공 보온 텀블러 500ml (500개)',
    quantity: 500,
    weightKg: 135.0,
    cbm: 0.648,
    departurePort: '위해(Weihai)항',
    arrivalPort: '평택(Pyeongtaek)항',
    arrivalDate: '2026-08-23',
    vesselName: 'GRAND PEACE',
    customsStep: 'customs',
    customsStepName: '수입신고 심사중',
    declarationNo: '12345-26-100341U',
    ftaStatus: 'applying',
    estimatedDutySaving: 0,
    deliveryType: 'parcel',
    courierCompany: 'CJ대한통운',
    trackingNo: '',
    trackingUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking',
    stage: 7
  },
  {
    id: 'log-003',
    hblNo: 'EUCHS260820-003',
    cargoMgtNo: '',
    orderNo: 'EUC-20260820-022',
    productName: '차량용 맥세이프 고속 무선충전 거치대 15W (400개)',
    quantity: 400,
    weightKg: 88.0,
    cbm: 0.52,
    departurePort: '이우 ➔ 위해항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-27 (예정)',
    vesselName: 'ORIENTAL PEARL VIII',
    customsStep: 'sailing',
    customsStepName: '해상 적재 운송중',
    declarationNo: '',
    ftaStatus: 'none',
    estimatedDutySaving: 0,
    deliveryType: 'parcel',
    courierCompany: '',
    trackingNo: '',
    trackingUrl: '',
    stage: 7
  },
  // ── 8단계: 국내 배송 / 완료 ──
  {
    id: 'log-004',
    hblNo: 'EUCHS260817-004',
    cargoMgtNo: 'INCHEON2026-08-17-00291',
    orderNo: 'EUC-20260817-005',
    productName: '대용량 멀티 포켓 방수 백팩 30L (150개)',
    quantity: 150,
    weightKg: 105.0,
    cbm: 0.72,
    departurePort: '위해(Weihai)항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-17',
    vesselName: 'NEW GOLDEN BRIDGE V',
    customsStep: 'delivery',
    customsStepName: '국내 배송중',
    declarationNo: '12345-26-099812U',
    ftaStatus: 'approved',
    estimatedDutySaving: 67200,
    deliveryType: 'cargo',
    courierCompany: '경동택배(화물)',
    trackingNo: '882019481920',
    trackingUrl: 'https://kdexp.com/main.do',
    deliveryEta: '2026-08-26 오전 중',
    stage: 8
  },
  {
    id: 'log-005',
    hblNo: 'EUCHS260815-005',
    cargoMgtNo: 'INCHEON2026-08-15-00084',
    orderNo: 'EUC-20260815-002',
    productName: '알루미늄 3단 접이식 노트북 거치대 스탠드 (250개) — 🚀 쿠팡 FC 직송',
    quantity: 250,
    weightKg: 87.5,
    cbm: 0.35,
    departurePort: '위해(Weihai)항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-15',
    vesselName: 'COSCO YINGKOU',
    customsStep: 'delivery',
    customsStepName: 'FC 직송 배차중',
    declarationNo: '12345-26-098220U',
    ftaStatus: 'approved',
    estimatedDutySaving: 31500,
    deliveryType: 'rocket',
    courierCompany: '쿠팡 로켓그로스 밀크런',
    trackingNo: '',
    trackingUrl: '',
    rocketFcCenter: '쿠팡 군포 FC (경기도 군포시)',
    rocketInboundDate: '2026-08-26 오전 10:00',
    rocketTruckNo: '경기 12가 3456',
    rocketDriverPhone: '010-9988-1234',
    rocketSkuCount: 3,
    barcodeLabelFilename: '노트북거치대_쿠팡SKU라벨_250PCS.pdf',
    deliveryEta: '2026-08-26',
    stage: 8
  },
  {
    id: 'log-006',
    hblNo: 'EUCHS260810-006',
    cargoMgtNo: 'PYEONGTAEK2026-08-10-00712',
    orderNo: 'EUC-20260810-009',
    productName: '무선 LED 센서등 감성 무드등 자석부착형 (300개)',
    quantity: 300,
    weightKg: 72.0,
    cbm: 0.28,
    departurePort: '위해(Weihai)항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-10',
    vesselName: 'EAST WIND 21',
    customsStep: 'delivered',
    customsStepName: '배송 완료',
    declarationNo: '12345-26-096502U',
    ftaStatus: 'approved',
    estimatedDutySaving: 14400,
    deliveryType: 'parcel',
    courierCompany: 'CJ대한통운',
    trackingNo: '682910000391',
    trackingUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking',
    deliveryEta: '2026-08-15 완료',
    stage: 8
  }
]

// ----------------------------------------------------------------
// 데이터 로드: Mock + 실제 localStorage orders 병합
// ----------------------------------------------------------------
const allLogisticsList = ref([...MOCK_LOGISTICS])

function mergeFromOrderStorage() {
  try {
    const orders = getStoredOrders()
    const existingOrderNos = new Set(MOCK_LOGISTICS.map(m => m.orderNo))
    const customsOrders = orders.filter(o => {
      const s = o.status
      return (s === 'customs_clearance' || s === 'domestic_shipping' || s === 'delivered') &&
        !existingOrderNos.has(o.orderNumber)
    })
    const merged = [...MOCK_LOGISTICS]
    customsOrders.forEach(o => {
      const item = o.items?.[0] || {}
      const measured = o.measuredData || {}
      merged.push({
        id: `order-${o.id}`,
        hblNo: o.inboundNo || `EUCHS-${o.id}`,
        cargoMgtNo: '',
        orderNo: o.orderNumber,
        productName: item.productName || '1688 수입 품목',
        quantity: item.quantity || 0,
        weightKg: measured.weightKg || 0,
        cbm: measured.cbm || 0,
        departurePort: '위해(Weihai)항',
        arrivalPort: '인천(Incheon)항',
        arrivalDate: '-',
        vesselName: '-',
        customsStep: o.status === 'customs_clearance' ? 'customs' : o.status === 'domestic_shipping' ? 'delivery' : 'delivered',
        customsStepName: o.status === 'customs_clearance' ? '수입신고 진행중' : o.status === 'domestic_shipping' ? '국내 배송중' : '배송 완료',
        declarationNo: '',
        ftaStatus: 'none',
        estimatedDutySaving: 0,
        deliveryType: 'parcel',
        courierCompany: '',
        trackingNo: '',
        trackingUrl: '',
        stage: o.status === 'customs_clearance' ? 7 : 8
      })
    })
    allLogisticsList.value = merged
  } catch (e) {
    console.warn('[CustomsView] orderStorage 병합 실패:', e)
  }
}

onMounted(() => {
  mergeFromOrderStorage()
  window.addEventListener('euchs-order-status-update', mergeFromOrderStorage)
  window.addEventListener('storage', mergeFromOrderStorage)
})

onUnmounted(() => {
  window.removeEventListener('euchs-order-status-update', mergeFromOrderStorage)
  window.removeEventListener('storage', mergeFromOrderStorage)
})

// ----------------------------------------------------------------
// 필터링 Computed
// ----------------------------------------------------------------
const filteredLogistics = computed(() => {
  return allLogisticsList.value.filter(item => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchesSearch = !q ||
      item.hblNo.toLowerCase().includes(q) ||
      item.orderNo.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      (item.trackingNo || '').toLowerCase().includes(q) ||
      (item.cargoMgtNo || '').toLowerCase().includes(q)

    const matchesStatus = statusFilter.value === 'all' || item.customsStep === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

// 7단계 카드 목록 (sailing / customs)
const step7Items = computed(() =>
  filteredLogistics.value.filter(i => ['sailing', 'customs', 'cleared'].includes(i.customsStep))
)

// 8단계 카드 목록 (delivery / delivered)
const step8Items = computed(() =>
  filteredLogistics.value.filter(i => ['delivery', 'delivered'].includes(i.customsStep))
)

// 요약 카운트
const summaryCounts = computed(() => ({
  shipping: allLogisticsList.value.filter(i => i.customsStep === 'sailing').length,
  customs: allLogisticsList.value.filter(i => i.customsStep === 'customs' || i.customsStep === 'cleared').length,
  fta: allLogisticsList.value.filter(i => i.ftaStatus === 'approved').length,
  delivered: allLogisticsList.value.filter(i => i.customsStep === 'delivery' || i.customsStep === 'delivered').length
}))

// ----------------------------------------------------------------
// 유니패스 통관 타임라인
// ----------------------------------------------------------------
const clearanceSteps = [
  { key: 'sailing', label: '1. 입항 적하목록 제출 및 적재', date: '입항 전', desc: '중국 세관 반출 및 정기선 선적 완료' },
  { key: 'arrival', label: '2. 입항보고 및 하선신고', date: '입항 당일', desc: '인천/평택항 선박 입항 및 보세창고 이송' },
  { key: 'bonded', label: '3. 보세구역 반입완료', date: '입항 +1일', desc: '세관 지정 장치장 입고 및 계근' },
  { key: 'customs', label: '4. 수입신고서 접수 및 심사', date: '반입 당일', desc: '관세사 관부가세 고지 및 FTA 협정세율 심사' },
  { key: 'cleared', label: '5. 수입신고 수리 (통관완료)', date: '심사 완료 후', desc: '세관 통관 면허 발급 및 반출 승인' },
  { key: 'delivery', label: '6. 보세창고 반출 및 국내배송 출발', date: '통관 완료 후', desc: 'CJ대한통운 / 경동화물 인계 및 집하' }
]

const getStepIndex = (stepKey) => {
  const map = { sailing: 0, arrival: 1, bonded: 2, customs: 3, cleared: 4, delivery: 5, delivered: 5 }
  return map[stepKey] ?? 2
}

// ----------------------------------------------------------------
// 뱃지 스타일 헬퍼
// ----------------------------------------------------------------
const getCustomsBadgeClass = (step) => {
  switch (step) {
    case 'cleared':
    case 'delivery':
    case 'delivered': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'customs':   return 'bg-orange-50 text-orange-700 border border-orange-200'
    case 'sailing':   return 'bg-blue-50 text-blue-700 border border-blue-200'
    default:          return 'bg-gray-100 text-gray-700'
  }
}

const getCustomsDotClass = (step) => {
  switch (step) {
    case 'cleared':
    case 'delivery':
    case 'delivered': return 'bg-emerald-500'
    case 'customs':   return 'bg-orange-500'
    case 'sailing':   return 'bg-blue-500'
    default:          return 'bg-gray-400'
  }
}

// ----------------------------------------------------------------
// 클립보드 복사
// ----------------------------------------------------------------
function copyText(txt) {
  try {
    navigator.clipboard?.writeText(txt)
  } catch (e) { /* fallback */ }
  if (_copyTimer) clearTimeout(_copyTimer)
  copyToast.value = true
  _copyTimer = setTimeout(() => { copyToast.value = false }, 2000)
}

// ----------------------------------------------------------------
// 모달 핸들러
// ----------------------------------------------------------------
const openFtaModal = () => { showFtaModal.value = true }

const submitFtaApplication = () => {
  alert(`[${ftaForm.value.orderNo}] 한·중 FTA C/O 발급 신청이 정상 접수되었습니다.\n영업일 기준 24시간 내 심사 완료됩니다.`)
  showFtaModal.value = false
}

const openDetailModal = (item) => { selectedDetail.value = item }
</script>
