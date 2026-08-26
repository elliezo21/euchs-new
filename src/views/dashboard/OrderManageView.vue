<template>
  <div class="space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 & 통계 요약 카드 4종 -->
    <!-- ======================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-xs font-black tracking-wide border border-amber-500/20">
            EUCHS B2B ERP
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            1688 수입 발주 및 주문 통합 관리
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          1688 장바구니/소싱몰을 통해 신청된 전체 발주 내역을 실시간으로 추적·관리합니다.
        </p>
      </div>

      <!-- 상단 메인 액션 버튼 그룹 -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          @click="exportSelectedQuotes"
          :disabled="selectedOrderIds.length === 0"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>선택 품목 견적 엑셀 다운로드 ({{ selectedOrderIds.length }})</span>
        </button>

        <!-- 대량 엑셀 양식 다운로드 (투어 타깃) -->
        <button
          type="button"
          data-tour="bulk-excel-btn"
          @click="openBulkExcelModal"
          class="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <span>📥</span>
          <span>대량 EXCEL 등록</span>
        </button>

        <button
          type="button"
          @click="refreshData"
          class="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
          title="목록 새로고침"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshing }" />
          <span>새로고침</span>
        </button>
      </div>
    </div>

    <!-- 공통 10단계 풀프로세스 스텝 바 (발주관리 포커스) - 투어 타깃 -->
    <div data-tour="order-tracker">
      <OrderProcessStepper :counts="stepperCounts" currentSection="orders" />
    </div>

    <!-- 통계 요약 카드 5종 (1~4단계 + 전체, 클릭 시 탭 필터링 연동) -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <!-- 1. 전체 발주 -->
      <div
        @click="selectTab('all')"
        class="bg-white border rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition select-none"
        :class="selectedTab === 'all' ? 'border-2 border-slate-900 bg-slate-50 ring-1 ring-slate-900/10' : 'border-gray-200 hover:border-gray-300'"
      >
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">전체 발주</span>
          <div class="text-lg font-bold text-gray-900 font-mono tracking-tight mt-0.5">
            {{ statCounts.total }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
          <Layers class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 2. 견적 대기/심사 -->
      <div
        @click="selectTab('quote_pending')"
        class="bg-white border rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition select-none"
        :class="selectedTab === 'quote_pending' ? 'border-2 border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20' : 'border-gray-200 hover:border-amber-200'"
      >
        <div class="min-w-0">
          <span class="text-xs font-semibold text-amber-700 block truncate">1. 견적 대기</span>
          <div class="text-lg font-bold text-amber-600 font-mono tracking-tight mt-0.5">
            {{ statCounts.quotePending }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
          <Clock class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 3. 결제 대기 -->
      <div
        @click="selectTab('quote_confirmed')"
        class="bg-white border rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition select-none"
        :class="selectedTab === 'quote_confirmed' ? 'border-2 border-orange-500 bg-orange-50/50 ring-1 ring-orange-500/20' : 'border-gray-200 hover:border-orange-200'"
      >
        <div class="min-w-0">
          <span class="text-xs font-semibold text-orange-700 block truncate">2. 결제 대기</span>
          <div class="text-lg font-bold text-orange-600 font-mono tracking-tight mt-0.5">
            {{ statCounts.quoteConfirmed }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-700 flex items-center justify-center shrink-0">
          <Calculator class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- ★ 3. 결제 확인 (신규) -->
      <div
        @click="selectTab('payment_verified')"
        class="bg-white border rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition select-none"
        :class="selectedTab === 'payment_verified' ? 'border-2 border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20' : 'border-gray-200 hover:border-emerald-200'"
      >
        <div class="min-w-0">
          <span class="text-xs font-semibold text-emerald-700 block truncate">3. 결제 확인</span>
          <div class="text-lg font-bold text-emerald-600 font-mono tracking-tight mt-0.5">
            {{ statCounts.paymentVerified }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 4. 1688 구매 진행중 -->
      <div
        @click="selectTab('purchasing')"
        class="bg-white border rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition select-none"
        :class="selectedTab === 'purchasing' ? 'border-2 border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20' : 'border-gray-200 hover:border-blue-200'"
      >
        <div class="min-w-0">
          <span class="text-xs font-semibold text-blue-700 block truncate">4. 1688 구매 진행중</span>
          <div class="text-lg font-bold text-blue-600 font-mono tracking-tight mt-0.5">
            {{ statCounts.purchasing }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
          <Package class="w-3.5 h-3.5" />
        </div>
      </div>
    </div>


    <!-- ======================================================== -->
    <!-- 3. 검색 및 정렬 컨트롤 바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <!-- 검색 인풋 -->
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="주문번호, 1688 상품명, 공급사, 옵션(SKU) 검색"
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
        />
      </div>

      <!-- 우측 기간 및 정렬 필터 -->
      <div class="flex items-center gap-2 flex-wrap text-xs">
        <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-600 font-medium">
          <Calendar class="w-3.5 h-3.5 text-gray-400" />
          <select v-model="dateFilter" class="bg-transparent outline-none cursor-pointer font-bold text-gray-700">
            <option value="all">전체 기간</option>
            <option value="today">오늘</option>
            <option value="week">최근 7일</option>
            <option value="month">최근 30일</option>
          </select>
        </div>

        <select
          v-model="sortBy"
          class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
        >
          <option value="latest">최신 주문순</option>
          <option value="oldest">오래된 순</option>
          <option value="priceHigh">견적 금액 높은순</option>
          <option value="priceLow">견적 금액 낮은순</option>
        </select>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 주문 목록 데이터 테이블 (PC 뷰) -->
    <!-- ======================================================== -->
    <div class="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs divide-y divide-slate-200">
          <thead class="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
            <tr>
              <th class="py-3.5 px-4 w-12 text-center font-bold text-slate-900">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </th>
              <th class="py-3.5 px-4 font-bold text-slate-900">주문번호 / 일시</th>
              <th class="py-3.5 px-4 font-bold text-slate-900">1688 대표 상품 정보</th>
              <th class="py-3.5 px-4 text-center font-bold text-slate-900">선택 옵션 / 수량</th>
              <th class="py-3.5 px-4 text-right font-bold text-slate-900">공급단가 & 총 견적금액 (DDP)</th>
              <th class="py-3.5 px-4 text-center font-bold text-slate-900">진행 상태</th>
              <th class="py-3.5 px-4 text-center font-bold text-slate-900">관리 액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="hover:bg-slate-50 transition group"
            >
              <!-- 체크박스 -->
              <td class="py-3.5 px-4 text-center">
                <input
                  type="checkbox"
                  v-model="selectedOrderIds"
                  :value="order.id"
                  class="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </td>

              <!-- 주문번호 & 일자 -->
              <td class="py-3.5 px-4 whitespace-nowrap font-mono">
                <div class="font-bold text-slate-900 hover:text-amber-600 cursor-pointer" @click="openOrderDetail(order)">
                  {{ order.orderNumber }}
                </div>
                <div class="text-[11.5px] text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                  <Clock class="w-3 h-3 text-slate-500" />
                  <span>{{ order.createdAt }}</span>
                </div>
              </td>

              <!-- 1688 상품 정보 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3 min-w-[260px]">
                  <img
                    :src="getItemThumbnail(order)"
                    :alt="getItemTitle(order)"
                    class="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                    @error="handleImgError"
                  />
                  <div class="space-y-0.5 flex-1 min-w-0">
                    <div
                      class="font-extrabold text-slate-950 hover:text-amber-600 line-clamp-1 cursor-pointer transition"
                      @click="openOrderDetail(order)"
                      :title="getItemTitle(order)"
                    >
                      {{ getItemTitle(order) }}
                    </div>
                    <div class="text-[11.5px] text-slate-700 font-mono font-semibold">
                      <span>품목 <b class="text-slate-950 font-bold">{{ getItemsCount(order) }}</b>건</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 옵션 / 총 수량 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="text-gray-700 font-medium truncate max-w-[130px] mx-auto">
                  {{ order.items?.[0]?.sku || order.items?.[0]?.selectedOption || '기본 옵션' }}
                </div>
                <div class="text-xs font-bold text-gray-900 font-mono mt-0.5">
                  총 {{ getOrderTotalQuantity(order) }}개
                </div>
              </td>

              <!-- 공급단가 및 총 견적 금액 (DDP) -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                <div class="text-sm font-bold text-gray-900">
                  ₩{{ formatNumber(getOrderCostSummary(order).totalDdpKrw) }}원
                </div>
                <div class="text-[11px] text-gray-400">
                  (단가 ¥{{ getOrderCostSummary(order).avgPriceCny.toFixed(2) }} / 합계 ¥{{ getOrderCostSummary(order).itemTotalCny.toFixed(2) }})
                </div>
              </td>

              <!-- 진행 상태 뱃지 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  :class="getOrderStatusBadgeClass(order.status)"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{{ getOrderStatusLabel(order.status) }}</span>
                </span>
              </td>

              <!-- 관리 액션 (단일화된 견적 확인 및 결제 버튼) -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5 flex-wrap">
                  <!-- 5. 입고 & 정밀검수 상태: [💳 2차 결제] 버튼 -->
                  <button
                    v-if="order.status === 'inspection_done' || order.status === 'warehouse_in'"
                    type="button"
                    @click="openSecondPaymentModal(order)"
                    class="px-3.5 py-1.5 rounded-xl font-bold text-[11px] bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title="현지 실측 검수 확인 및 2차 결제"
                  >
                    <CreditCard class="w-3.5 h-3.5" />
                    <span>💳 2차 결제</span>
                  </button>

                  <!-- 2. 견적 완료 (결제대기) 상태: [견적 확인 및 결제] -->
                  <button
                    v-else-if="order.status === 'quote_confirmed'"
                    type="button"
                    @click="openOrderDetail(order)"
                    class="px-3 py-1.5 rounded-xl font-bold text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse transition active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="견적 확인 및 즉시 결제"
                  >
                    <CreditCard class="w-3.5 h-3.5" />
                    <span>견적 확인 및 결제</span>
                  </button>

                  <!-- 기타 상태: [견적/주문 상세] -->
                  <button
                    v-else
                    type="button"
                    @click="openOrderDetail(order)"
                    class="px-3 py-1.5 rounded-xl font-bold text-[11px] bg-slate-900 hover:bg-slate-800 text-white transition active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="견적 및 주문 상세 확인"
                  >
                    <ClipboardCheck class="w-3.5 h-3.5 text-amber-400" />
                    <span>견적/주문 상세</span>
                  </button>

                  <!-- ★ 1~4단계 상태 전환 버튼 -->
                  <button
                    v-if="canAdvanceStage(order)"
                    type="button"
                    @click="advanceOrderStage(order)"
                    :title="getAdvanceLabel(order)"
                    class="px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                    :class="getAdvanceColor(order)"
                  >
                    <span>{{ getAdvanceLabel(order) }}</span>
                  </button>

                  <!-- ★ 동적 카카오톡 1:1 상담 -->
                  <a
                    :href="getKakaoUrl(order)"
                    target="_blank"
                    rel="noopener noreferrer"
                    :title="getKakaoTitle(order)"
                    class="px-2 py-1.5 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/30 text-amber-900 border border-yellow-300 font-bold text-[11px] transition active:scale-95 flex items-center gap-1"
                  >
                    <MessageCircle class="w-3 h-3" />
                    <span>1:1 문의</span>
                  </a>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="filteredOrders.length === 0">
              <td colspan="7" class="py-16 text-center text-gray-400 text-xs">
                <Package class="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p class="font-medium">선택한 조건의 발주/주문 내역이 없습니다.</p>
                <router-link
                  to="/mall"
                  class="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-xs"
                >
                  1688 소싱몰에서 상품 담기
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. 모바일 카드형 뷰 (Mobile View) -->
    <!-- ======================================================== -->
    <div class="md:hidden space-y-3">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono font-bold text-gray-900 text-xs">{{ order.orderNumber }}</span>
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-bold"
            :class="getOrderStatusBadgeClass(order.status)"
          >
            {{ getOrderStatusLabel(order.status) }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <img
            :src="getItemThumbnail(order)"
            :alt="getItemTitle(order)"
            class="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0"
            @error="handleImgError"
          />
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-gray-900 text-xs truncate">{{ getItemTitle(order) }}</h4>
            <p class="text-[11px] text-gray-500 font-mono mt-0.5">
              옵션: {{ order.items?.[0]?.sku || '기본' }} · 수량: <b>{{ getOrderTotalQuantity(order) }}개</b>
            </p>
            <p class="text-xs font-bold text-amber-600 font-mono mt-0.5">
              ₩{{ formatNumber(getOrderCostSummary(order).totalDdpKrw) }}원
            </p>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <span class="text-[11px] text-gray-400 font-mono">{{ order.createdAt }}</span>
          <div class="flex items-center gap-1.5">
            <!-- 5. 입고 & 정밀검수 상태 -->
            <button
              v-if="order.status === 'inspection_done' || order.status === 'warehouse_in'"
              type="button"
              @click="openSecondPaymentModal(order)"
              class="px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CreditCard class="w-3.5 h-3.5" />
              <span>💳 2차 결제</span>
            </button>

            <!-- 2. 결제 대기 상태 -->
            <button
              v-else-if="order.status === 'quote_confirmed'"
              type="button"
              @click="openOrderDetail(order)"
              class="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 font-black flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard class="w-3.5 h-3.5" />
              <span>견적 확인 및 결제</span>
            </button>

            <!-- 기타 상태 -->
            <button
              v-else
              type="button"
              @click="openOrderDetail(order)"
              class="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-900 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardCheck class="w-3.5 h-3.5 text-amber-400" />
              <span>견적/주문 상세</span>
            </button>
            <a
              href="http://pf.kakao.com/_xmQWsK/chat"
              target="_blank"
              rel="noopener noreferrer"
              class="p-2 rounded-xl bg-yellow-400/20 text-amber-900 border border-yellow-300 text-xs font-bold"
              title="1:1 문의"
            >
              <MessageCircle class="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 6. 주문 상세 및 견적 명세서 팝업 모달 (대형 2단 ERP 레이아웃) -->
    <!-- ======================================================== -->
    <div
      v-if="isDetailModalOpen && activeOrder"
      class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
      @click.self="closeDetailModal"
    >
      <div class="bg-white rounded-3xl max-w-5xl lg:max-w-6xl w-full flex flex-col shadow-2xl relative border border-gray-200 overflow-hidden font-sans my-auto max-h-[92vh]">
        
        <!-- A. 모달 헤더 (Sticky Top) -->
        <div class="px-6 sm:px-8 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50/95 backdrop-blur-md shrink-0 z-10">
          <div class="flex items-center gap-3">
            <span
              class="px-3 py-1 rounded-full text-xs font-black tracking-wider flex items-center gap-1.5 shadow-2xs"
              :class="getOrderStatusBadgeClass(activeOrder.status)"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{{ getOrderStatusLabel(activeOrder.status) }}</span>
            </span>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-black text-gray-800 bg-white px-2 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                  {{ activeOrder.orderNumber }}
                </span>
                <span class="text-xs text-gray-400 font-mono hidden sm:inline">접수일시: {{ activeOrder.createdAt }}</span>
              </div>
              <h3 class="text-base sm:text-lg font-black text-gray-900 leading-none">
                1688 수입 발주서 & DDP 견적 정산서
              </h3>
            </div>
          </div>
          <button
            type="button"
            @click="closeDetailModal"
            class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center text-sm transition focus:outline-none cursor-pointer"
            title="모달 닫기"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- B. 모달 본문 (CNINSIDER Reference Standard Layout: Top-to-Bottom + 2-Column bottom) -->
        <div class="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar text-xs text-gray-700 bg-slate-50/40">
          
          <!-- 5. 입고 & 정밀검수 상태일 때 2차 결제 바로가기 강조 배너 -->
          <div
            v-if="activeOrder.status === 'inspection_done' || activeOrder.status === 'warehouse_in'"
            class="p-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0">
                <CreditCard class="w-5 h-5" />
              </div>
              <div>
                <div class="font-extrabold text-sm text-white">현지 창고 실측 계근 및 검수가 완료되었습니다!</div>
                <div class="text-xs text-teal-100 mt-0.5">2차 결제(국제해운운임+세관+작업비: ₩133,000)를 진행해 주세요. (바코드 라벨 첨부는 선택 사항)</div>
              </div>
            </div>
            <button
              type="button"
              @click="openSecondPaymentModal(activeOrder); closeDetailModal()"
              class="px-5 py-2.5 rounded-xl bg-white text-teal-950 font-black text-xs shadow-md hover:bg-teal-50 transition active:scale-95 shrink-0 cursor-pointer"
            >
              💳 2차 결제 열기 ➔
            </button>
          </div>

          <!-- ======================================================== -->
          <!-- ① 상단: [1. 기본 발주 & 통관/배송 설정] -->
          <!-- ======================================================== -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                <Truck class="w-4.5 h-4.5 text-blue-600" />
                <span>1. 기본 발주 & 수입 통관/배송 설정</span>
              </h4>
              <span
                class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                :class="isOrderEditable ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-300'"
              >
                {{ isOrderEditable ? '수정 가능 (견적 심사 대기)' : '설정 확정 완료 (Readonly)' }}
              </span>
            </div>

            <!-- 1-A. 편집 모드 (isOrderEditable) : 인터랙티브 토글 버튼 -->
            <div v-if="isOrderEditable" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 통관방식 선택 토글 -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-gray-700">
                  통관 방식 선택
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    @click="setCustomsClearanceType('business')"
                    class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    :class="(activeOrder.customsClearanceType || activeOrder.buyerInfo?.customsType || 'business') === 'business'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
                  >
                    <i class="fas fa-building text-[11px]"></i>
                    <span>사업자 통관 (기본)</span>
                  </button>
                  <button
                    type="button"
                    @click="setCustomsClearanceType('personal')"
                    class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    :class="(activeOrder.customsClearanceType || activeOrder.buyerInfo?.customsType) === 'personal'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
                  >
                    <i class="fas fa-user text-[11px]"></i>
                    <span>개인 통관 (자가소비)</span>
                  </button>
                </div>
              </div>

              <!-- 배송방식 선택 토글 -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-gray-700">
                  국내 배송 방식 선택
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    @click="setShippingMethod('general')"
                    class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    :class="(activeOrder.shippingMethod || activeOrder.buyerInfo?.shippingMethod || 'general') === 'general'
                      ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
                  >
                    <i class="fas fa-truck text-[11px]"></i>
                    <span>일반 수입배송 (직배송)</span>
                  </button>
                  <button
                    type="button"
                    @click="setShippingMethod('coupang_rocket')"
                    class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    :class="(activeOrder.shippingMethod || activeOrder.buyerInfo?.shippingMethod) === 'coupang_rocket'
                      ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
                  >
                    <i class="fas fa-rocket text-[11px]"></i>
                    <span>쿠팡 로켓그로스 입고</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 1-B. 조회 전용 모드 (isOrderReadonly) : 확정된 상태 배지 고정 노출 -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-gray-400 block font-bold">확정된 통관 방식</span>
                  <span class="font-bold text-xs text-blue-700 mt-0.5 flex items-center gap-1.5">
                    <i :class="(activeOrder.customsClearanceType || activeOrder.buyerInfo?.customsType) === 'personal' ? 'fas fa-user' : 'fas fa-building'"></i>
                    <span>{{ (activeOrder.customsClearanceType || activeOrder.buyerInfo?.customsType) === 'personal' ? '개인 통관 (자가소비용 안심 통관)' : '사업자 통관 (세금계산서/매입자료 100% 발행)' }}</span>
                  </span>
                </div>
                <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">확정</span>
              </div>

              <div class="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-gray-400 block font-bold">확정된 국내 배송 방식</span>
                  <span class="font-bold text-xs text-amber-700 mt-0.5 flex items-center gap-1.5">
                    <i :class="(activeOrder.shippingMethod || activeOrder.buyerInfo?.shippingMethod) === 'coupang_rocket' ? 'fas fa-rocket' : 'fas fa-truck'"></i>
                    <span>{{ (activeOrder.shippingMethod || activeOrder.buyerInfo?.shippingMethod) === 'coupang_rocket' ? '쿠팡 로켓그로스 입고 (밀크런 센터 직송)' : '일반 수입배송 (지정 사업장/창고 직배송)' }}</span>
                  </span>
                </div>
                <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">확정</span>
              </div>
            </div>

            <!-- 바이어 및 수령지 정보 카드 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
              <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
                <span class="text-gray-400 block text-[10px]">바이어 상호 / 성명</span>
                <span class="font-bold text-gray-900 truncate block mt-0.5 text-xs">
                  {{ activeOrder.buyerInfo?.companyName || activeOrder.customer_name || '이유씨 바이어' }}
                </span>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
                <span class="text-gray-400 block text-[10px]">연락처 (휴대폰)</span>
                <span class="font-bold text-gray-900 font-mono block mt-0.5 text-xs">
                  {{ activeOrder.buyerInfo?.phone || '010-9373-1214' }}
                </span>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
                <span class="text-gray-400 block text-[10px]">통관고유부호 (PCCC)</span>
                <span class="font-mono font-bold text-blue-700 block mt-0.5 text-xs">
                  {{ activeOrder.buyerInfo?.customsCode || 'P240012345678' }}
                </span>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
                <div class="flex items-center justify-between">
                  <span class="text-gray-400 text-[10px]">수령 주소지</span>
                  <button
                    v-if="isOrderEditable"
                    type="button"
                    @click="isEditingAddress ? saveAddress() : startEditAddress()"
                    class="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    {{ isEditingAddress ? '[저장]' : '[주소 변경]' }}
                  </button>
                  <span v-else class="text-[10px] text-slate-400">고정 주소</span>
                </div>
                <div v-if="isEditingAddress && isOrderEditable" class="mt-1">
                  <input
                    type="text"
                    v-model="editAddressInput"
                    @keyup.enter="saveAddress"
                    class="w-full px-2 py-1 bg-white border border-blue-500 rounded text-xs font-medium text-gray-900 focus:outline-none"
                    placeholder="변경할 주소 입력 후 엔터"
                  />
                </div>
                <span v-else class="font-medium text-gray-800 truncate block mt-0.5 text-xs" :title="activeOrder.buyerInfo?.address">
                  {{ activeOrder.buyerInfo?.address || '서울특별시 강남구 테헤란로 123' }}
                </span>
              </div>
            </div>
          </div>

          <!-- ======================================================== -->
          <!-- ② 중단: [2. 현지 창고 부가서비스 선택 (VAS)] -->
          <!-- ======================================================== -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3.5">
            <div class="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>2. 현지 창고 부가서비스 신청 (VAS: Value-Added Services)</span>
              </h4>
              <span
                class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                :class="isOrderEditable ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-300'"
              >
                {{ isOrderEditable ? '선택 시 현지 물류센터 즉시 지시' : '신청 내역 조회 (Readonly)' }}
              </span>
            </div>

            <!-- 2-A. 편집 모드 (isOrderEditable) : 인터랙티브 체크박스 카드 그리드 -->
            <div v-if="isOrderEditable" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <label
                v-for="vas in VAS_OPTIONS"
                :key="vas.id"
                class="flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer select-none relative"
                :class="isVasSelected(vas.id)
                  ? 'bg-amber-50/70 border-amber-400 text-slate-900 shadow-xs ring-1 ring-amber-400/30'
                  : 'bg-slate-50/60 border-gray-200 hover:border-gray-300 text-gray-700'"
              >
                <input
                  type="checkbox"
                  :checked="isVasSelected(vas.id)"
                  @change="toggleVasService(vas.id)"
                  class="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                />
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex items-center justify-between gap-1.5">
                    <span class="font-bold text-xs leading-snug" :class="isVasSelected(vas.id) ? 'text-amber-950' : 'text-gray-900'">
                      {{ vas.name }}
                    </span>
                  </div>
                  <p class="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                    {{ vas.desc }}
                  </p>
                  <div class="pt-0.5">
                    <span class="text-[10px] font-mono font-bold" :class="vas.badgeClass || 'text-slate-600'">
                      {{ vas.feeLabel }}
                    </span>
                  </div>
                </div>
              </label>
            </div>

            <!-- 2-B. 조회 전용 모드 (isOrderReadonly) : 신청된 배지 목록 노출 + 안내문구 -->
            <div v-else class="space-y-3">
              <div class="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                <i class="fas fa-info-circle text-amber-600 shrink-0"></i>
                <span>※ 이미 견적이 확정/진행 중인 주문으로, 부가서비스 변경은 1:1 담당 매니저에게 문의해 주세요.</span>
              </div>

              <!-- 신청된 부가서비스가 있을 때 -->
              <div v-if="getBuyerSelectedVas().length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="vas in getBuyerSelectedVas()"
                  :key="vas.id"
                  class="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 flex items-start gap-3 shadow-2xs"
                >
                  <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-xs">
                    <i class="fas fa-check text-[10px]"></i>
                  </div>
                  <div class="space-y-0.5 min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-1.5">
                      <span class="font-bold text-xs text-emerald-950 block leading-snug">
                        {{ vas.name }}
                      </span>
                    </div>
                    <span class="text-[10px] font-mono font-bold text-emerald-700">
                      {{ vas.feeLabel }} · 현장 작업 지시됨
                    </span>
                  </div>
                </div>
              </div>

              <!-- 신청된 부가서비스가 없을 때 -->
              <div v-else class="p-4 rounded-2xl bg-slate-50 border border-gray-200 text-center text-gray-500 font-medium text-xs">
                <i class="fas fa-shield-check text-slate-400 mr-1.5"></i>
                <span>신청된 현지 부가서비스 없음 (기본 외관 검수 및 표준 포장으로 진행됩니다)</span>
              </div>
            </div>
          </div>

          <!-- ======================================================== -->
          <!-- ② 1688 소싱 상세 정보 + 1차 결제 확인 상태 -->
          <!-- ======================================================== -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm">
                <ExternalLink class="w-4 h-4 text-rose-500" />
                <span>2. 1688 소싱 상품 정보 &amp; 1차 결제 확인</span>
              </h4>
              <!-- 1차 결제 상태 뱃지 -->
              <span
                class="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5"
                :class="['payment_verified', 'purchasing', 'warehouse_in', 'inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping', 'delivered'].includes(normalizeOrderStatus(activeOrder.status))
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : normalizeOrderStatus(activeOrder.status) === 'quote_confirmed'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>{{ ['payment_verified', 'purchasing', 'warehouse_in', 'inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping', 'delivered'].includes(normalizeOrderStatus(activeOrder.status))
                  ? '✅ 1차 결제 확인 완료'
                  : normalizeOrderStatus(activeOrder.status) === 'quote_confirmed'
                    ? '💳 결제 대기중'
                    : '📋 견적 심사중' }}</span>
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 좌: 1688 상품 링크 및 소싱 요약 -->
              <div class="space-y-3">
                <div
                  v-for="(item, idx) in activeOrder.items || []"
                  :key="idx"
                  class="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2"
                >
                  <div class="flex items-center gap-3">
                    <img
                      :src="item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&auto=format&fit=crop&q=60'"
                      class="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                      @error="handleImgError"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-bold text-gray-900 text-xs line-clamp-1">{{ item.productName || item.titleKo || '1688 소싱 상품' }}</p>
                      <p v-if="item.titleZh" class="text-[10px] text-gray-400 font-mono truncate">{{ item.titleZh }}</p>
                      <p class="text-[11px] text-gray-500 mt-0.5 font-mono">SKU: {{ item.sku || '기본 옵션' }}</p>
                    </div>
                  </div>
                  <!-- 단가/환율/마진 요약 행 -->
                  <div class="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div class="bg-white rounded-lg p-2 border border-gray-200">
                      <div class="text-gray-400 font-medium">1688 단가</div>
                      <div class="font-bold text-gray-900 font-mono">¥{{ Number(item.priceCny || 0).toFixed(2) }}</div>
                    </div>
                    <div class="bg-white rounded-lg p-2 border border-gray-200">
                      <div class="text-gray-400 font-medium">적용 환율</div>
                      <div class="font-bold text-blue-700 font-mono">₩226.19</div>
                    </div>
                    <div class="bg-white rounded-lg p-2 border border-gray-200">
                      <div class="text-gray-400 font-medium">원화 환산</div>
                      <div class="font-bold text-amber-700 font-mono">₩{{ formatNumber(Math.round(Number(item.priceCny || 0) * 226.19)) }}</div>
                    </div>
                  </div>
                  <!-- 1688 원본 링크 -->
                  <a
                    v-if="item.productUrl"
                    :href="item.productUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 font-bold transition truncate"
                  >
                    <ExternalLink class="w-3 h-3 shrink-0" />
                    <span class="truncate">1688 원본 상품 링크 (내부 확인용)</span>
                  </a>
                </div>
              </div>

              <!-- 우: 1차 결제 확인 정보 패널 -->
              <div class="space-y-3">
                <!-- 결제 완료 상태 -->
                <div
                  v-if="['payment_verified', 'purchasing', 'warehouse_in', 'inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping', 'delivered'].includes(normalizeOrderStatus(activeOrder.status))"
                  class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5"
                >
                  <div class="flex items-center gap-2 font-bold text-emerald-800 text-xs">
                    <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                    <span>1차 상품대금 결제 확인 완료</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="bg-white rounded-lg p-2.5 border border-emerald-200">
                      <div class="text-gray-400 font-medium mb-0.5">입금자명</div>
                      <div class="font-bold text-gray-900">{{ activeOrder.buyerInfo?.buyerName || activeOrder.buyerInfo?.companyName || '이유씨글로벌' }}</div>
                    </div>
                    <div class="bg-white rounded-lg p-2.5 border border-emerald-200">
                      <div class="text-gray-400 font-medium mb-0.5">결제 방식</div>
                      <div class="font-bold text-emerald-700">예치금 즉시 차감</div>
                    </div>
                    <div class="bg-white rounded-lg p-2.5 border border-emerald-200 col-span-2">
                      <div class="text-gray-400 font-medium mb-0.5">1차 결제 금액</div>
                      <div class="font-bold text-gray-900 font-mono text-sm">₩{{ formatNumber(getOrderPaymentStages(activeOrder).firstPaymentKrw) }}원</div>
                    </div>
                  </div>
                </div>

                <!-- 결제 대기 / 견적 심사중 상태 -->
                <div v-else class="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2.5">
                  <div class="flex items-center gap-2 font-bold text-orange-800 text-xs">
                    <AlertCircle class="w-4 h-4 text-orange-500" />
                    <span>{{ normalizeOrderStatus(activeOrder.status) === 'quote_confirmed' ? '1차 결제 대기중' : '견적 검토 및 승인 대기' }}</span>
                  </div>
                  <p class="text-[11px] text-orange-700 leading-relaxed">
                    {{ normalizeOrderStatus(activeOrder.status) === 'quote_confirmed'
                      ? `견적이 확정되었습니다. 1차 결제 (₩${formatNumber(getOrderPaymentStages(activeOrder).firstPaymentKrw)}원)를 진행해 주세요. 결제 확인 즉시 1688 공장 발주가 시작됩니다.`
                      : '소싱 담당자가 1688에서 상품을 확인하고 정확한 견적을 산출 중입니다. 견적 완료 후 카카오톡으로 알림을 드립니다.' }}
                  </p>
                </div>

                <!-- 단계별 상태 전환 액션 버튼 (1~4단계) -->
                <div v-if="canAdvanceStage(activeOrder)" class="pt-1">
                  <button
                    type="button"
                    @click="advanceOrderStage(activeOrder); closeDetailModal()"
                    class="w-full py-2.5 rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    :class="getAdvanceColor(activeOrder)"
                  >
                    <span>{{ getAdvanceLabel(activeOrder) }}</span>
                  </button>
                  <p class="text-[10px] text-gray-400 text-center mt-1.5">클릭 시 다음 단계로 즉시 전환됩니다 (OrderProcessStepper 실시간 반영)</p>
                </div>

                <!-- 1688 수입 단가 마진 요약 -->
                <div class="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
                  <p class="text-[11px] font-bold text-amber-400">📊 수입 단가 마진 요약 (개당 도착원가 기준)</p>
                  <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span class="text-slate-400">1688 발주가:</span>
                      <span class="text-white font-bold ml-1">¥{{ getOrderCostSummary(activeOrder).avgPriceCny.toFixed(2) }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400">개당 DDP:</span>
                      <span class="text-amber-400 font-bold ml-1">₩{{ formatNumber(getOrderCostSummary(activeOrder).unitDdpKrw) }}</span>
                    </div>
                    <div class="col-span-2 pt-1 border-t border-slate-700">
                      <span class="text-slate-400">총 발주 수량:</span>
                      <span class="text-white font-bold ml-1">{{ getOrderTotalQuantity(activeOrder) }}개</span>
                      <span class="text-slate-400 ml-3">총 DDP:</span>
                      <span class="text-amber-300 font-bold ml-1">₩{{ formatNumber(getOrderCostSummary(activeOrder).totalDdpKrw) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ======================================================== -->
          <!-- ③ 하단: [3. 발주 품목 명세 (Left) & DDP 1·2차 분리 견적 계산서 (Right)] -->
          <!-- ======================================================== -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <!-- Left: 발주 품목 명세 (7 cols) -->
            <div class="lg:col-span-7 space-y-4">
              <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3.5">
                <div class="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm">
                    <Package class="w-4.5 h-4.5 text-amber-500" />
                    <span>3. 발주 신청 품목 명세 (총 {{ getGroupedOrderItems(activeOrder.items).length }}개 상품)</span>
                  </h4>
                  <span class="text-xs font-bold text-amber-700 font-mono">
                    총 수량: {{ getOrderTotalQuantity(activeOrder) }}개
                  </span>
                </div>

                <div class="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  <div
                    v-for="(prod, pIdx) in getGroupedOrderItems(activeOrder.items)"
                    :key="prod.groupKey || pIdx"
                    class="p-4 bg-slate-50/80 border border-gray-200 rounded-2xl space-y-3"
                  >
                    <!-- Group Header: Product Info -->
                    <div class="flex items-start gap-3 border-b border-gray-200/80 pb-3">
                      <img
                        :src="prod.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
                        :alt="prod.productName"
                        class="w-13 h-13 rounded-xl object-cover bg-white border border-gray-200 shrink-0"
                        @error="handleImgError"
                      />
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-gray-900 text-xs sm:text-sm line-clamp-1 leading-snug">
                          {{ prod.productName || prod.titleKo }}
                        </p>
                        <p v-if="prod.titleZh" class="text-[10px] text-gray-400 font-mono truncate" :title="prod.titleZh">
                          {{ prod.titleZh }}
                        </p>
                        <div class="flex items-center gap-2 text-[11px] text-amber-700 font-mono mt-1">
                          <span>옵션 <b>{{ prod.skus.length }}종</b></span>
                          <span>·</span>
                          <span>합계 <b>{{ prod.totalQty }}개</b></span>
                          <span>·</span>
                          <span class="font-bold text-gray-900">₩{{ formatNumber(prod.totalPriceKrw) }}원</span>
                        </div>
                      </div>
                    </div>

                    <!-- Group Sub-items: Option / SKU List -->
                    <div class="space-y-1.5 divide-y divide-gray-100">
                      <div
                        v-for="(sku, sIdx) in prod.skus"
                        :key="sku.skuId || sIdx"
                        class="flex items-center justify-between gap-2 pt-2 first:pt-0 text-xs"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                          <span class="font-medium text-gray-800 truncate">
                            {{ sku.optionKo }}
                          </span>
                          <span v-if="sku.optionZh" class="text-[10px] text-gray-400 font-mono truncate">
                            ({{ sku.optionZh }})
                          </span>
                        </div>
                        <div class="flex items-center gap-3 shrink-0 font-mono">
                          <span class="text-gray-500 text-[11px]">
                            {{ sku.quantity }}개 × ¥{{ Number(sku.priceCny).toFixed(2) }}
                          </span>
                          <span class="font-bold text-gray-900">
                            ₩{{ formatNumber(sku.totalKrw) }}원
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: DDP 도착원가 견적서 & 1·2차 분리 결제 안내 (5 cols) -->
            <div class="lg:col-span-5 space-y-4">
              <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm">
                    <Calculator class="w-4.5 h-4.5 text-emerald-600" />
                    <span>DDP 공식 견적 & 단계별 정산</span>
                  </h4>
                  <span class="text-[10px] text-gray-400 font-mono">
                    환율: ₩226.19/CNY
                  </span>
                </div>

                <!-- 1. 원가 상세 세부 항목 -->
                <div class="space-y-2 text-xs">
                  <div class="flex items-center justify-between py-1 border-b border-gray-100">
                    <span class="text-gray-600">1. 순수 1688 제품 대금 (¥{{ getOrderCostSummary(activeOrder).itemTotalCny.toFixed(2) }})</span>
                    <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).itemTotalKrw) }}원</span>
                  </div>
                  <div class="flex items-center justify-between py-1 border-b border-gray-100">
                    <span class="text-gray-600">2. 수입 구매대행 & 기본 수수료 (8%)</span>
                    <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).agencyFeeKrw) }}원</span>
                  </div>
                  <div class="flex items-center justify-between py-1 border-b border-gray-100">
                    <span class="text-gray-600">3. 국제 해운 물류비 (예상 {{ getOrderCostSummary(activeOrder).cbm }} CBM)</span>
                    <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).shippingFeeKrw) }}원</span>
                  </div>
                  <div class="flex items-center justify-between py-1 border-b border-gray-100">
                    <span class="text-gray-600">4. 예상 수입 관세 (한-중 FTA 협정세율)</span>
                    <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).tariffKrw) }}원</span>
                  </div>
                  <div class="flex items-center justify-between py-1 border-b border-gray-100">
                    <span class="text-gray-600">5. 수입 부가가치세 (VAT 10% 매입세액공제)</span>
                    <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).vatKrw) }}원</span>
                  </div>
                </div>

                <!-- 2. CNINSIDER 표준: 1차 결제 vs 2차 결제 분리 안내 박스 -->
                <div class="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div class="font-bold text-blue-950 flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <span class="flex items-center gap-1.5">
                      <i class="fas fa-coins text-blue-600"></i>
                      <span>단계별 분리 정산 안내</span>
                    </span>
                    <span class="text-[10px] text-blue-700 font-mono">B2B 표준</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-700"><b>1차 결제</b> (상품대금 + 기본수수료):</span>
                    <span class="font-mono font-black text-blue-800 text-sm">
                      ₩{{ formatNumber(getOrderPaymentStages(activeOrder).firstPaymentKrw) }}원
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-700"><b>2차 결제</b> (국제물류비 + 관부가세):</span>
                    <span class="font-mono font-bold text-slate-700">
                      ₩{{ formatNumber(getOrderPaymentStages(activeOrder).secondPaymentKrw) }}원
                    </span>
                  </div>
                  <p class="text-[10px] text-blue-600/90 leading-tight">
                    ※ 1차 결제 완료 시 1688 공장 발주가 즉시 진행되며, 2차 비용은 국내 입항 시 정산됩니다.
                  </p>
                </div>

                <!-- 3. 최종 DDP 총 견적 금액 강조 카드 -->
                <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg space-y-2">
                  <div class="flex items-center justify-between text-xs text-slate-300">
                    <span class="font-bold text-amber-400">최종 예상 총 견적금액 (DDP)</span>
                    <span class="text-[10px] text-slate-400 font-mono">세금·운임 일체 포함</span>
                  </div>
                  <div class="flex items-baseline justify-between pt-1">
                    <span class="text-xs text-slate-400">총 결제 예정액:</span>
                    <div class="text-right">
                      <div class="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                        ₩{{ formatNumber(getOrderCostSummary(activeOrder).totalDdpKrw) }}원
                      </div>
                      <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                        (¥ {{ getOrderCostSummary(activeOrder).itemTotalCny.toFixed(2) }} 위안 환산)
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center justify-between pt-3 border-t border-slate-700/80 text-[11px] text-slate-300 font-mono">
                    <span>개당 도착원가 환산:</span>
                    <span class="font-bold text-white">약 ₩{{ formatNumber(getOrderCostSummary(activeOrder).unitDdpKrw) }}원 / 개</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

        <!-- C. 모달 고정 푸터 액션 바 -->
        <div class="px-6 py-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 z-10 shadow-lg">
          <!-- 좌측: 카카오톡 전담 매니저 상담 -->
          <a
            :href="getKakaoUrl(activeOrder)"
            target="_blank"
            rel="noopener noreferrer"
            :title="getKakaoTitle(activeOrder)"
            class="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
          >
            <MessageCircle class="w-4 h-4" />
            <span>1:1 담당 매니저 상담 ({{ activeOrder.orderNumber }})</span>
          </a>

          <!-- 우측 액션 버튼 그룹 -->
          <div class="flex flex-wrap items-center justify-end gap-2.5">
            <!-- 결제 대기 / 견적 완료 상태일 때 즉시 결제하기 메인 버튼 노출 -->
            <button
              v-if="activeOrder.status === 'quote_confirmed' || activeOrder.status === 'quote_pending'"
              type="button"
              @click="executeInstantPayment(activeOrder)"
              :disabled="isPaying"
              class="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50 animate-pulse"
            >
              <CreditCard class="w-4 h-4" />
              <span>💳 예치금/카드 즉시 결제하기 (₩{{ formatNumber(getOrderCostSummary(activeOrder).totalDdpKrw) }}원)</span>
            </button>

            <button
              type="button"
              @click="exportSingleQuote(activeOrder)"
              class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <FileSpreadsheet class="w-4 h-4" />
              <span>견적서 엑셀 다운로드</span>
            </button>

            <button
              type="button"
              @click="closeDetailModal"
              class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition active:scale-95"
            >
              닫기
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 7. 2차 결제 & 바코드 라벨 업로드 전용 모달 (Step 6 검수완료 전용) -->
    <!-- ======================================================== -->
    <div
      v-if="isSecondPaymentModalOpen && selectedSecondPaymentOrder"
      class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
      @click.self="closeSecondPaymentModal"
    >
      <div class="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto">
        <!-- 1. 모달 상단 헤더 -->
        <div class="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-lg">
              <Package class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300 text-[10px] font-black tracking-wide border border-teal-500/40">
                  STEP 5. 현지 입고 & 정밀검수 완료
                </span>
                <span class="font-mono text-xs text-slate-300">
                  {{ selectedSecondPaymentOrder.orderNumber }}
                </span>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-white mt-0.5">
                현지 실측 검수 확인 & 2차 정산 결제 (선적 지시)
              </h3>
            </div>
          </div>
          <button
            type="button"
            @click="closeSecondPaymentModal"
            class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 2. 모달 바디 스크롤 영역 -->
        <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs bg-slate-50/50">
          
          <!-- ① 현지 창고 실측 계근 및 실사 검수 확인 -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-teal-600" />
                <h4 class="font-bold text-sm text-gray-900">1. 중국 이우 물류센터 정밀 계근 & 실사 검수 보고서</h4>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                검수 합격 (100% 양호)
              </span>
            </div>

            <!-- 실측 수치 4종 그리드 -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">실측 총 중량 (Weight)</div>
                <div class="text-base font-extrabold text-gray-900 font-mono mt-0.5">
                  {{ selectedSecondPaymentOrder.measuredData?.weightKg || 42.5 }} kg
                </div>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">실측 총 체적 (Volume)</div>
                <div class="text-base font-extrabold text-teal-700 font-mono mt-0.5">
                  {{ selectedSecondPaymentOrder.measuredData?.cbm || 0.352 }} CBM
                </div>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">포장 카톤 & 수량</div>
                <div class="text-base font-extrabold text-gray-900 font-mono mt-0.5">
                  {{ selectedSecondPaymentOrder.measuredData?.cartons || 12 }} CTN (120 PCS)
                </div>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">불량 검출 건수</div>
                <div class="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                  0건 (불량률 0.0%)
                </div>
              </div>
            </div>

            <!-- 현지 실사 검수 사진 3장 미리보기 갤러리 -->
            <div>
              <div class="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                <span>📸 현지 실사 검수 촬영 사진 (3장)</span>
                <span class="text-[11px] text-gray-400 font-normal">클릭 시 원본 확대</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  v-for="(photo, idx) in (selectedSecondPaymentOrder.inspectionPhotos || defaultInspectionPhotos)"
                  :key="idx"
                  class="group relative rounded-xl overflow-hidden border border-gray-200 bg-black aspect-[4/3] cursor-pointer shadow-xs"
                  @click="openPhotoPreview(photo.url)"
                >
                  <img
                    :src="photo.url"
                    :alt="photo.caption"
                    class="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90 group-hover:opacity-100"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                    <span class="text-[11px] font-bold line-clamp-1">{{ photo.caption }}</span>
                  </div>
                  <div class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition">
                    <ZoomIn class="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ② 🏷️ 바코드 라벨 파일 업로드 영역 (쿠팡 로켓그로스 / 자체 바코드 - 선택사항) -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <FileText class="w-4 h-4 text-orange-600" />
                <h4 class="font-bold text-sm text-gray-900">2. 🏷️ 마켓/쿠팡 바코드 라벨 파일 업로드</h4>
              </div>
              <span class="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                [선택] 쿠팡 로켓그로스 / 마켓 바코드 부착 시에만 첨부
              </span>
            </div>

            <!-- 신청 부가서비스 안내 뱃지 -->
            <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-start gap-2.5">
              <Info class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div class="space-y-1">
                <div class="font-bold text-gray-800">
                  신청 부가서비스:
                  <span class="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 text-[11px]">
                    원산지 표시(MADE IN CHINA)
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-200/60 text-orange-900 text-[11px]">
                    쿠팡 로켓그로스 바코드 부착
                  </span>
                </div>
                <p class="text-[11px] text-gray-600 leading-relaxed">
                  자사몰 및 일반 셀러는 바코드 등록 없이 즉시 결제 및 선적 지시가 가능합니다. 쿠팡 윙 또는 마켓 바코드 부착이 필요한 경우에만 라벨 파일(PDF/ZIP/이미지)을 업로드해 주세요.
                </p>
              </div>
            </div>

            <!-- 파일 업로드 드롭존 -->
            <input
              type="file"
              ref="barcodeFileInputRef"
              @change="handleBarcodeFileUpload"
              accept=".pdf,.png,.jpg,.jpeg,.zip"
              class="hidden"
            />

            <!-- 아직 업로드 전일 때 -->
            <div
              v-if="!uploadedBarcodeFile"
              @dragover.prevent
              @drop.prevent="handleDropBarcodeFile"
              @click="triggerBarcodeFileInput"
              class="border-2 border-dashed border-gray-300 hover:border-amber-500 bg-gray-50/60 hover:bg-amber-50/20 rounded-2xl p-6 text-center cursor-pointer transition space-y-2.5 group"
            >
              <div class="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:text-amber-500 group-hover:border-amber-300 flex items-center justify-center mx-auto transition shadow-xs">
                <UploadCloud class="w-6 h-6" />
              </div>
              <div>
                <p class="font-bold text-gray-800 text-xs sm:text-sm">
                  클릭하여 바코드 라벨 파일을 선택하거나, 여기로 드래그하세요
                </p>
                <p class="text-[11px] text-gray-400 mt-0.5">
                  지원 형식: PDF, ZIP, JPG, PNG (최대 50MB) · 쿠팡 SKU 라벨 권장
                </p>
              </div>
              <div class="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl bg-slate-900 group-hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition"
                >
                  📁 파일 선택하기
                </button>
                <button
                  type="button"
                  @click.stop="setSampleBarcodeFile"
                  class="px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition"
                >
                  샘플 라벨 첨부
                </button>
              </div>
            </div>

            <!-- 업로드 완료 상태 카드 -->
            <div
              v-else
              class="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-900 truncate">{{ uploadedBarcodeFile.name }}</span>
                    <span class="px-2 py-0.2 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-black shrink-0">
                      업로드 완료
                    </span>
                  </div>
                  <div class="text-[11px] text-gray-500 font-mono mt-0.5">
                    파일 크기: {{ uploadedBarcodeFile.size }} · 등록일시: {{ uploadedBarcodeFile.uploadedAt }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  @click="triggerBarcodeFileInput"
                  class="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-[11px] transition cursor-pointer"
                >
                  파일 교체
                </button>
                <button
                  type="button"
                  @click="removeBarcodeFile"
                  class="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                  title="삭제"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- ③ 2차 정산 견적서 (국제 배송 및 세관/작업비) -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <Calculator class="w-4 h-4 text-indigo-600" />
                <h4 class="font-bold text-sm text-gray-900">3. 2차 정산 내역서 (국제 해운 운임 + 수입 통관 + 부가작업비)</h4>
              </div>
              <span class="font-mono text-xs text-gray-400">실측 계근 0.352 CBM 기준</span>
            </div>

            <!-- 정산 테이블 -->
            <div class="border border-gray-200 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs divide-y divide-gray-100">
                <thead class="bg-slate-50 text-gray-600 font-bold">
                  <tr>
                    <th class="py-2.5 px-4">정산 항목명</th>
                    <th class="py-2.5 px-4 text-center">산출 근거 / 수량</th>
                    <th class="py-2.5 px-4 text-right">정산 금액 (KRW)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td class="py-2.5 px-4 font-medium text-gray-800">
                      🛳️ 한-중 LCL 해운 국제 운임 (이우 ➔ 인천/평택항)
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono text-gray-500">실측 0.352 CBM (최소 0.5CBM 구간)</td>
                    <td class="py-2.5 px-4 text-right font-mono font-bold text-gray-900">₩85,000</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-4 font-medium text-gray-800">
                      📑 세관 수입통관 수수료 및 관·부가세 예상액
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono text-gray-500">B2B 표준 통관 대행</td>
                    <td class="py-2.5 px-4 text-right font-mono font-bold text-gray-900">₩42,000</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-4 font-medium text-gray-800">
                      🏷️ 현지 부가작업비 (쿠팡 로켓그로스 바코드 라벨 부착)
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono text-gray-500">120 PCS x ₩50</td>
                    <td class="py-2.5 px-4 text-right font-mono font-bold text-gray-900">₩6,000</td>
                  </tr>
                  <tr class="bg-slate-50 font-bold">
                    <td colspan="2" class="py-3 px-4 text-right text-gray-700">최종 2차 결제 합계 (선적 청구액):</td>
                    <td class="py-3 px-4 text-right text-base text-rose-600 font-extrabold font-mono">
                      ₩133,000원
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 보유 예치금 결제 안내 -->
            <div class="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <CreditCard class="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span class="text-[11px] text-slate-400">보유 예치금 잔액: <b>₩15,420,000</b></span>
                  <div class="text-xs font-bold text-white">결제 후 잔액: ₩15,287,000 (예치금 충분)</div>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                즉시 차감 결제 가능
              </span>
            </div>
          </div>

        </div>

        <!-- 3. 모달 하단 푸터 버튼 -->
        <div class="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            @click="closeSecondPaymentModal"
            class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            @click="handleConfirmSecondPayment"
            :disabled="isProcessingPayment"
            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw v-if="isProcessingPayment" class="w-4 h-4 animate-spin" />
            <CreditCard v-else class="w-4 h-4" />
            <span>💳 예치금 즉시 결제 및 선적 지시 (₩133,000)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 8. 검수 사진 확대 팝업 라이트박스 -->
    <!-- ======================================================== -->
    <div
      v-if="previewPhotoUrl"
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      @click="previewPhotoUrl = null"
    >
      <div class="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
        <img :src="previewPhotoUrl" class="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
        <button
          @click="previewPhotoUrl = null"
          class="absolute top-3 right-3 p-2.5 rounded-full bg-black/70 text-white hover:bg-black transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>


  </div>

  <!-- ======================================================== -->
  <!-- 대량 EXCEL 등록 모달 -->
  <!-- ======================================================== -->
  <Transition name="modal-fade">
    <div v-if="isBulkExcelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      @click.self="closeBulkExcelModal">
      <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <!-- 헤더 -->
        <div class="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-black text-orange-600 uppercase tracking-widest">BULK ORDER UPLOAD</div>
            <h3 class="font-black text-gray-900 text-sm mt-0.5">📤 대량 EXCEL 발주 등록</h3>
          </div>
          <button @click="closeBulkExcelModal" class="p-1.5 rounded-lg hover:bg-orange-100 text-gray-500 transition cursor-pointer text-lg leading-none">✕</button>
        </div>

        <!-- 본문 -->
        <div class="p-6 space-y-5">
          <!-- 표준 양식 다운로드 -->
          <div class="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div>
              <div class="text-xs font-black text-blue-800 mb-0.5">📥 EUCHS 표준 엑셀 양식</div>
              <div class="text-[11px] text-blue-600">헤더·샘플 2행이 포함된 양식을 내려받아 작성하세요.</div>
            </div>
            <button
              type="button"
              @click="handleDownloadTemplate"
              class="shrink-0 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer active:scale-95"
            >표준 양식 다운로드</button>
          </div>

          <!-- 파일 업로드 -->
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-2">📂 엑셀 파일 업로드 (.xlsx / .xls / .csv)</label>
            <div
              class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center transition"
              :class="bulkDragOver ? 'border-orange-400 bg-orange-50' : 'hover:border-gray-400'"
              @dragover.prevent="bulkDragOver = true"
              @dragleave="bulkDragOver = false"
              @drop.prevent="onBulkFileDrop"
            >
              <div v-if="!bulkParsedItems.length" class="space-y-2">
                <div class="text-3xl">📂</div>
                <p class="text-sm font-bold text-gray-500">파일을 여기에 끌어다 놓거나</p>
                <label class="cursor-pointer">
                  <span class="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition inline-block">파일 선택</span>
                  <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onBulkFileSelect" />
                </label>
              </div>
              <div v-else class="text-left space-y-1">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-black text-emerald-700">✅ {{ bulkParsedItems.length }}개 상품 파싱 완료</span>
                  <button type="button" @click="bulkParsedItems = []" class="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">다시 선택</button>
                </div>
                <!-- 파싱 결과 프리뷰 -->
                <div class="max-h-40 overflow-y-auto space-y-1">
                  <div v-for="(item, i) in bulkParsedItems" :key="i"
                    class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs"
                  >
                    <input type="checkbox"
                      :checked="bulkSelectedIdxs.includes(i)"
                      @change="toggleBulkItem(i)"
                      class="w-3.5 h-3.5 accent-orange-500 cursor-pointer"
                    />
                    <span class="font-bold text-gray-800 truncate flex-1">{{ item.productName }}</span>
                    <span class="text-gray-400 shrink-0">{{ item.quantity }}개</span>
                    <span class="text-orange-600 shrink-0 font-mono text-[10px]">{{ item.sku || '-' }}</span>
                  </div>
                </div>
                <!-- 카테고리 일괄 설정 -->
                <div v-if="bulkSelectedIdxs.length > 0" class="pt-2">
                  <button
                    type="button"
                    @click="openCategoryBatchModal"
                    class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold text-xs transition cursor-pointer"
                  >
                    <span>📂</span>
                    <span>선택 {{ bulkSelectedIdxs.length }}개 카테고리 일괄 설정</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 카테고리 필터 드롭다운 (파싱 후 노출) -->
          <div v-if="bulkParsedItems.length > 0" class="flex items-center gap-3">
            <label class="text-xs font-bold text-gray-700 shrink-0">카테고리 필터:</label>
            <select v-model="bulkCategoryFilter"
              class="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white"
            >
              <option value="">전체</option>
              <option v-for="cat in bulkCategories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
            <span class="text-xs text-gray-400 shrink-0">{{ filteredBulkItems.length }}개</span>
          </div>
        </div>

        <!-- 푸터 -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button @click="closeBulkExcelModal" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">취소</button>
          <button
            @click="submitBulkExcel"
            :disabled="!bulkParsedItems.length"
            class="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs transition cursor-pointer shadow-sm"
          >📤 {{ filteredBulkItems.length }}개 발주 목록에 추가</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ======================================================== -->
  <!-- 카테고리 일괄 설정 모달 -->
  <!-- ======================================================== -->
  <Transition name="modal-fade">
    <div v-if="isCategoryBatchModalOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      @click.self="isCategoryBatchModalOpen = false">
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <h3 class="font-black text-gray-900 text-sm">📂 카테고리 일괄 설정</h3>
          <button @click="isCategoryBatchModalOpen = false" class="p-1.5 rounded-lg hover:bg-purple-100 text-gray-500 transition cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div class="p-6 space-y-4 text-xs">
          <p class="text-gray-500">선택된 <strong class="text-gray-900">{{ bulkSelectedIdxs.length }}개</strong> 상품에 카테고리를 일괄 지정합니다.</p>
          <div>
            <label class="block font-bold text-gray-700 mb-1">카테고리 선택 또는 직접 입력</label>
            <input
              v-model="batchCategoryInput"
              type="text"
              placeholder="예: 생활용품, 가전, 의류/패션"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-xs"
              list="batch-cat-list"
            />
            <datalist id="batch-cat-list">
              <option v-for="cat in PRESET_CATEGORIES" :key="cat" :value="cat" />
            </datalist>
          </div>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button @click="isCategoryBatchModalOpen = false" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">취소</button>
          <button
            @click="applyBatchCategory"
            :disabled="!batchCategoryInput.trim()"
            class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs transition cursor-pointer"
          >✅ 적용</button>
        </div>
      </div>
    </div>
  </Transition>

</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Search,
  FileSpreadsheet,
  Download,
  Eye,
  X,
  ExternalLink,
  Package,
  Calendar,
  Clock,
  Truck,
  Calculator,
  RefreshCw,
  Layers,
  MessageCircle,
  FileText,
  CreditCard,
  ClipboardCheck,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ZoomIn,
  Info,
  ShieldCheck
} from 'lucide-vue-next';
import { exportQuoteExcel } from '@/utils/excelExport';
import { downloadBulkOrderTemplate, parseOrderExcel } from '@/utils/excelHandler';
import { calculateImportCost, formatCurrency } from '@/utils/costCalculator';
import {
  PIPELINE_STATUSES,
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusBadgeClass
} from '@/lib/orderPipeline';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredOrders, saveStoredOrders, calculatePipelineCounts, updateOrderStatus, fetchOrdersFromSupabase } from '@/utils/orderStorage';
import OrderProcessStepper from '@/components/dashboard/OrderProcessStepper.vue';

const route = useRoute();
const router = useRouter();

// ---------------------------------------------------------
// 상태 탭 정의
// ---------------------------------------------------------
const filterTabs = [
  { id: 'all', label: '전체 (All)' },
  { id: 'quote_pending', label: '1. 견적대기' },
  { id: 'quote_confirmed', label: '2. 결제대기' },
  { id: 'payment_verified', label: '3. 결제확인' },
  { id: 'purchasing', label: '4. 구매진행' },
  { id: 'inspection_done', label: '5. 입고 & 정밀검수 (2차결제)' },
  { id: 'shipping_ready', label: '6. 선적대기' },
  { id: 'customs_clearance', label: '7. 세관통관' },
  { id: 'delivered', label: '8. 배송완료' },
];

const selectedTab = ref('all');
const searchQuery = ref('');
const dateFilter = ref('all');
const sortBy = ref('latest');
const selectedOrderIds = ref([]);
const isRefreshing = ref(false);

// 모달 상태
const isDetailModalOpen = ref(false);
const activeOrder = ref(null);

// ---------------------------------------------------------
// 기본 바이어 정보
// ---------------------------------------------------------
const defaultBuyerInfo = {
  companyName: '이유씨글로벌파트너스',
  buyerName: '김이유',
  phone: '010-9373-1214',
  email: 'buyer@euchs.com',
  customsCode: 'P240012345678',
  address: '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층',
  memo: '안전 통관 및 파손 방지 완충 에어캡 추가 포장 요청'
};

// ---------------------------------------------------------
// 초기 기본 주문 데이터셋
// ---------------------------------------------------------
const defaultMockOrders = [
  {
    id: 'ord-101',
    orderNumber: 'EUC-20260824-001',
    createdAt: '2026-08-24 09:30',
    status: 'quote_pending',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '미니멀 무소음 탁상용 USB 충전식 선풍기 2000mAh',
        productUrl: 'https://detail.1688.com/offer/7123456789.html',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
        sku: '화이트 / 3단 풍속',
        quantity: 200,
        priceCny: 18.5,
        cbm: 0.35,
      }
    ]
  },
  {
    id: 'ord-102',
    orderNumber: 'EUC-20260823-014',
    createdAt: '2026-08-23 15:45',
    status: 'quote_confirmed',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '고급 스테인리스 진공 보온 텀블러 500ml',
        productUrl: 'https://detail.1688.com/offer/6987654321.html',
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=160&auto=format&fit=crop&q=80',
        sku: '매트 블랙 / 보온 12h',
        quantity: 500,
        priceCny: 12.0,
        cbm: 0.65,
      }
    ]
  },
  {
    id: 'ord-103',
    orderNumber: 'EUC-20260822-008',
    createdAt: '2026-08-22 11:20',
    status: 'purchasing',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '초경량 접이식 캠핑 체어 알루미늄 프레임',
        productUrl: 'https://detail.1688.com/offer/7345612345.html',
        imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=160&auto=format&fit=crop&q=80',
        sku: '카키 베이지 / 대형',
        quantity: 120,
        priceCny: 35.0,
        cbm: 0.85,
      }
    ]
  },
  {
    id: 'ord-v01',
    orderNumber: 'EUC-20260824-V01',
    createdAt: '2026-08-24 10:15',
    status: 'inspection_done',
    buyerInfo: { ...defaultBuyerInfo },
    measuredData: {
      weightKg: 42.5,
      cbm: 0.352,
      cartons: 12,
      totalPcs: 120,
      defectCount: 0,
      inspectionDate: '2026-08-24 11:20'
    },
    inspectionPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80',
        caption: '1. 완제품 전수 실물 검수 (120 PCS 정상)'
      },
      {
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
        caption: '2. 정밀 계근 및 CBM 체적 실측 (42.5kg / 0.352CBM)'
      },
      {
        url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&auto=format&fit=crop&q=80',
        caption: '3. 수출용 5중 카톤 포장 및 밴딩 마감 (12 CTN)'
      }
    ],
    vasServices: [
      { name: '원산지 라벨 부착 (MADE IN CHINA)', price: 0, status: '준비완료' },
      { name: '쿠팡 로켓그로스 바코드 부착', price: 6000, status: '라벨 대기' }
    ],
    secondPayment: {
      shippingFeeKrw: 85000,
      customsFeeKrw: 42000,
      vasFeeKrw: 6000,
      totalSecondPaymentKrw: 133000
    },
    barcodeFile: null,
    items: [
      {
        productName: '[테스트 샘플] 초경량 접이식 캠핑 체어 120개 (12 CTN)',
        productUrl: 'https://detail.1688.com/offer/7345612345.html',
        imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=160&auto=format&fit=crop&q=80',
        sku: '카키 베이지 / 120 PCS (12 CTN)',
        quantity: 120,
        priceCny: 35.0,
        cbm: 0.352,
      }
    ]
  },
  {
    id: 'ord-104',
    orderNumber: 'EUC-20260821-003',
    createdAt: '2026-08-21 14:10',
    status: 'warehouse_in',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '초음파 세척기 안경/귀금속 다용도 450ml',
        productUrl: 'https://detail.1688.com/offer/7456123890.html',
        imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=160&auto=format&fit=crop&q=80',
        sku: '모던 그레이 / 40kHz',
        quantity: 80,
        priceCny: 42.0,
        cbm: 0.45,
      }
    ]
  },
  {
    id: 'ord-105',
    orderNumber: 'EUC-20260819-012',
    createdAt: '2026-08-19 16:30',
    status: 'shipping_ready',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '무선 LED 센서 바 감성 무드등 자석 부착형',
        productUrl: 'https://detail.1688.com/offer/7234567891.html',
        imageUrl: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=160&auto=format&fit=crop&q=80',
        sku: '웜 화이트 40cm',
        quantity: 300,
        priceCny: 8.5,
        cbm: 0.28,
      }
    ]
  },
  {
    id: 'ord-106',
    orderNumber: 'EUC-20260817-005',
    createdAt: '2026-08-17 10:45',
    status: 'customs_clearance',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '대용량 멀티 포켓 방수 백팩 30L',
        productUrl: 'https://detail.1688.com/offer/7012345678.html',
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=160&auto=format&fit=crop&q=80',
        sku: '차콜 블랙 / 노트북 수납',
        quantity: 150,
        priceCny: 28.0,
        cbm: 0.72,
      }
    ]
  },
  {
    id: 'ord-107',
    orderNumber: 'EUC-20260815-001',
    createdAt: '2026-08-15 09:00',
    status: 'delivered',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '친환경 실리콘 접이식 휴대용 조리도구 5종 세트',
        productUrl: 'https://detail.1688.com/offer/7112233445.html',
        imageUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=160&auto=format&fit=crop&q=80',
        sku: '올리브 그린',
        quantity: 250,
        priceCny: 16.2,
        cbm: 0.38,
      }
    ]
  }
];

const orders = ref([...defaultMockOrders]);

const loadOrdersData = async () => {
  isRefreshing.value = true;
  try {
    orders.value = getStoredOrders();
    const dbOrders = await fetchOrdersFromSupabase();
    if (Array.isArray(dbOrders) && dbOrders.length > 0) {
      orders.value = dbOrders;
    }
  } catch (e) {
    console.warn('loadOrdersData DB notice:', e);
  } finally {
    isRefreshing.value = false;
  }
};

const refreshData = async () => {
  await loadOrdersData();
};

// ---------------------------------------------------------
// 통계 요약 (4대 KPI - 1~4단계 발주/사입 관리 대상)
// ---------------------------------------------------------
const ORDER_STAGE_STATUSES = ['quote_pending', 'quote_confirmed', 'payment_verified', 'purchasing'];

const statCounts = computed(() => {
  const stageOrders = orders.value.filter(o => ORDER_STAGE_STATUSES.includes(normalizeOrderStatus(o.status)));
  const quotePending = stageOrders.filter(o => normalizeOrderStatus(o.status) === 'quote_pending').length;
  const quoteConfirmed = stageOrders.filter(o => normalizeOrderStatus(o.status) === 'quote_confirmed').length;
  const paymentVerified = stageOrders.filter(o => normalizeOrderStatus(o.status) === 'payment_verified').length;
  const purchasing = stageOrders.filter(o => normalizeOrderStatus(o.status) === 'purchasing').length;
  return {
    total: stageOrders.length,
    quotePending,
    quoteConfirmed,
    paymentVerified,
    purchasing
  };
});

// 상단 8단계 풀프로세스 트래커 실시간 집계 (전역 동기화)
const stepperCounts = computed(() => {
  return calculatePipelineCounts(orders.value);
});

// ---------------------------------------------------------
// 안전한 원가 계산 헬퍼 (getOrderCostSummary)
// ---------------------------------------------------------
function getOrderCostSummary(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return {
      totalDdpKrw: 0,
      itemTotalCny: 0,
      itemTotalKrw: 0,
      avgPriceCny: 0,
      cbm: 0.1,
      shippingFeeKrw: 0,
      tariffKrw: 0,
      vatKrw: 0,
      agencyFeeKrw: 0,
      unitDdpKrw: 0
    };
  }

  let totalCny = 0;
  let totalQty = 0;
  let totalCbm = 0;

  order.items.forEach((it) => {
    const q = Number(it.quantity) || 1;
    const p = Number(it.priceCny || it.price || it.unitPriceCny) || 0;
    totalQty += q;
    totalCny += p * q;
    totalCbm += Number(it.cbm) || (0.002 * q);
  });

  const avgPriceCny = totalQty > 0 ? totalCny / totalQty : 0;
  const calc = calculateImportCost({
    productPriceCny: avgPriceCny,
    quantity: totalQty,
    exchangeRate: 226.19,
    cbm: Math.max(0.05, Number(totalCbm.toFixed(3))),
    shippingRatePerCbm: 85000,
    tariffRate: 0.08,
    vatRate: 0.10,
    agencyFeeRate: 0.08,
  });

  return {
    ...calc.summary,
    avgPriceCny: Number(avgPriceCny.toFixed(2)),
    itemTotalCny: Number(totalCny.toFixed(2))
  };
}

// ---------------------------------------------------------
// 동일 1688 상품 기준 그룹핑 헬퍼 (Order Grouping & Sanitizer)
// ---------------------------------------------------------
function formatSkuText(it) {
  if (!it) return '기본 옵션';
  if (Array.isArray(it.skus) && it.skus.length > 0) {
    return it.skus.map(s => {
      const color = s.color && s.color !== 'undefined' ? s.color : '';
      const size = s.size && s.size !== 'undefined' ? s.size : '';
      const optParts = [color, size].filter(Boolean).join(' / ');
      const qtyText = s.quantity ? ` (${s.quantity}개)` : '';
      return (optParts || '기본 규격') + qtyText;
    }).join(', ');
  }

  let str = it.sku || it.option || it.selectedOption || '';
  if (typeof str === 'string') {
    str = str.replace(/\/\s*undefined/g, '')
             .replace(/undefined\s*\//g, '')
             .replace(/undefined/g, '')
             .trim();
    return str || '기본 규격';
  }
  return '기본 규격';
}

function getGroupedOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  const groupsMap = new Map();

  rawItems.forEach((it, originalIdx) => {
    const prodId = it.itemId || (it.id && !String(it.id).includes('_') ? it.id : null) || '';
    const prodUrl = it.productUrl || it.url || it.detailUrl || it.link || '';
    const prodName = it.productName || it.titleKo || it.name || it.titleZh || `상품-${originalIdx + 1}`;
    
    const groupKey = prodId ? `id_${prodId}` : (prodUrl ? `url_${prodUrl}` : `name_${prodName}`);

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        groupKey,
        itemId: prodId,
        productName: it.productName || it.titleKo || it.name || '1688 소싱 상품',
        titleKo: it.titleKo || it.productName || it.name || '',
        titleZh: it.titleZh || '',
        imageUrl: it.imageUrl || it.image || it.thumbnail || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60',
        productUrl: prodUrl || (prodId ? `https://detail.1688.com/offer/${prodId}.html` : 'https://www.1688.com'),
        company: it.company || '1688 공급처',
        skus: [],
        totalQty: 0,
        totalPriceCny: 0,
        totalPriceKrw: 0
      });
    }

    const group = groupsMap.get(groupKey);

    if (Array.isArray(it.skus) && it.skus.length > 0) {
      it.skus.forEach((skuObj, skuIdx) => {
        const qty = Number(skuObj.quantity || skuObj.qty || 1);
        const price = Number(it.priceCny || it.price || it.unitPrice || 0);
        const color = skuObj.color && skuObj.color !== 'undefined' ? skuObj.color : '';
        const size = skuObj.size && skuObj.size !== 'undefined' ? skuObj.size : '';
        const optText = [color, size].filter(Boolean).join(' / ') || '기본 규격';
        
        const colorZh = skuObj.colorZh && skuObj.colorZh !== 'undefined' ? skuObj.colorZh : '';
        const sizeZh = skuObj.sizeZh && skuObj.sizeZh !== 'undefined' ? skuObj.sizeZh : '';
        const optZhText = [colorZh, sizeZh].filter(Boolean).join(' / ');

        group.skus.push({
          skuId: `${groupKey}_${skuIdx}_${Date.now()}`,
          optionKo: optText,
          optionZh: optZhText,
          color,
          size,
          quantity: qty,
          priceCny: price,
          totalCny: Number((qty * price).toFixed(2)),
          totalKrw: Math.round(qty * price * 226.19)
        });

        group.totalQty += qty;
        group.totalPriceCny += qty * price;
        group.totalPriceKrw += Math.round(qty * price * 226.19);
      });
    } else {
      const qty = Number(it.quantity || it.qty || 1);
      const price = Number(it.priceCny || it.price || it.unitPrice || 0);
      const optText = formatSkuText(it);

      group.skus.push({
        skuId: `${groupKey}_${originalIdx}`,
        optionKo: optText,
        optionZh: it.optionZh || it.skuZh || '',
        quantity: qty,
        priceCny: price,
        totalCny: Number((qty * price).toFixed(2)),
        totalKrw: Math.round(qty * price * 226.19)
      });

      group.totalQty += qty;
      group.totalPriceCny += qty * price;
      group.totalPriceKrw += Math.round(qty * price * 226.19);
    }
  });

  return Array.from(groupsMap.values());
}

// ---------------------------------------------------------
// 현지 창고 부가서비스 (VAS: Value-Added Services)
// ---------------------------------------------------------
const VAS_OPTIONS = [
  {
    id: 'inspection_precision',
    name: '정밀 검수 (전수 불량/파손 정밀 검사 & 실사 사진 전송)',
    desc: '입고 시 100% 전수 개봉하여 오염, 스크래치, 파손 여부를 정밀 검사하고 고화질 실사 사진을 전송합니다.',
    feeLabel: '무료 기본제공',
    badgeClass: 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold'
  },
  {
    id: 'origin_label',
    name: '원산지 표시(MADE IN CHINA) 라벨 부착 / 봉제 작업',
    desc: '국내 세관 통관 필수 요건인 원산지 표기 스티커 부착 또는 의류/패브릭 봉제 라벨 작업을 현지에서 완벽 처리합니다.',
    feeLabel: '개당 약 ₩60~100',
    badgeClass: 'text-blue-600 font-bold'
  },
  {
    id: 'barcode_label',
    name: '바코드 / 쿠팡 로켓그로스 바코드(바코드 라벨링) 부착',
    desc: '스마트스토어, 쿠팡 로켓그로스 입고용 상품 바코드(EAN/UPC) 및 박스 라벨을 인쇄하여 부착합니다.',
    feeLabel: '개당 약 ₩50~100',
    badgeClass: 'text-indigo-600 font-bold'
  },
  {
    id: 'opp_repack',
    name: 'OPP 재포장 / 세트 합포장 작업',
    desc: '손상된 비닐 교체, 상품별 개별 OPP 포장, 또는 2개 이상의 단품을 1개 세트로 묶는 번들 합포장 작업.',
    feeLabel: '개당 약 ₩100~200',
    badgeClass: 'text-amber-600 font-bold'
  },
  {
    id: 'fta_co',
    name: '한-중 FTA 원산지증명서(C/O) 발급 신청',
    desc: '수입 관세를 최대 0~5%까지 절감할 수 있는 상공회의소 공식 한-중 FTA 협정세율 C/O를 현지에서 발급합니다.',
    feeLabel: '관세 절감 필수',
    badgeClass: 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold'
  },
  {
    id: 'pallet_wood',
    name: '목재 파렛트 / 에어캡 특수 완충 포장',
    desc: '도자기, 유리, 가전 등 파손 위험이 높은 화물의 해상 운송 중 파손을 방지하기 위한 목재 훈증 파렛트 및 완충 보강.',
    feeLabel: '파손 위험 상품',
    badgeClass: 'text-slate-600 font-bold'
  }
];

function isVasSelected(vasId) {
  if (!activeOrder.value) return false;
  const list = activeOrder.value.vas_services || activeOrder.value.vasServices || activeOrder.value.details?.vas_services || [];
  return Array.isArray(list) && list.includes(vasId);
}

function toggleVasService(vasId) {
  if (!activeOrder.value) return;
  let list = activeOrder.value.vas_services || activeOrder.value.vasServices || activeOrder.value.details?.vas_services || [];
  if (!Array.isArray(list)) list = [];

  if (list.includes(vasId)) {
    list = list.filter(id => id !== vasId);
  } else {
    list.push(vasId);
  }

  activeOrder.value.vas_services = [...list];
  activeOrder.value.vasServices = [...list];
  if (activeOrder.value.details) {
    activeOrder.value.details.vas_services = [...list];
  }

  // Update order in orders list and localStorage
  const target = orders.value.find(o => o.id === activeOrder.value.id || o.orderNumber === activeOrder.value.orderNumber);
  if (target) {
    target.vas_services = [...list];
    target.vasServices = [...list];
    if (target.details) target.details.vas_services = [...list];
  }

  try {
    const raw = localStorage.getItem('euchs_erp_submitted_orders');
    if (raw) {
      let stored = JSON.parse(raw);
      if (Array.isArray(stored)) {
        const sTarget = stored.find(o => o.id === activeOrder.value.id || o.orderNumber === activeOrder.value.orderNumber);
        if (sTarget) {
          sTarget.vas_services = [...list];
          sTarget.vasServices = [...list];
          if (sTarget.details) sTarget.details.vas_services = [...list];
          localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(stored));
          window.dispatchEvent(new Event('storage'));
        }
      }
    }
  } catch (e) {
    console.error('Failed to sync VAS services:', e);
  }
}

// ---------------------------------------------------------
// 발주서 수정 가능(isOrderEditable) vs 조회 전용(isOrderReadonly) 분기
// ---------------------------------------------------------
const isOrderEditable = computed(() => {
  if (!activeOrder.value) return false;
  const status = normalizeOrderStatus(activeOrder.value.status);
  return status === 'quote_pending';
});

const isOrderReadonly = computed(() => !isOrderEditable.value);

const getBuyerSelectedVas = () => {
  if (!activeOrder.value) return [];
  const list = activeOrder.value.vas_services || activeOrder.value.vasServices || activeOrder.value.details?.vas_services || [];
  if (!Array.isArray(list) || list.length === 0) return [];
  return VAS_OPTIONS.filter(vas => list.includes(vas.id));
};

// ---------------------------------------------------------
// CNINSIDER 발주/통관 설정 & 주소지 변경 & 분리정산 헬퍼
// ---------------------------------------------------------
const isEditingAddress = ref(false);
const editAddressInput = ref('');

const setCustomsClearanceType = (type) => {
  if (!activeOrder.value) return;
  activeOrder.value.customsClearanceType = type;
  if (!activeOrder.value.buyerInfo) activeOrder.value.buyerInfo = {};
  activeOrder.value.buyerInfo.customsType = type;
  syncActiveOrderToStorage();
};

const setShippingMethod = (method) => {
  if (!activeOrder.value) return;
  activeOrder.value.shippingMethod = method;
  if (!activeOrder.value.buyerInfo) activeOrder.value.buyerInfo = {};
  activeOrder.value.buyerInfo.shippingMethod = method;
  syncActiveOrderToStorage();
};

const startEditAddress = () => {
  editAddressInput.value = activeOrder.value?.buyerInfo?.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층 물류센터';
  isEditingAddress.value = true;
};

const saveAddress = () => {
  if (activeOrder.value) {
    if (!activeOrder.value.buyerInfo) activeOrder.value.buyerInfo = {};
    activeOrder.value.buyerInfo.address = editAddressInput.value.trim() || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층 물류센터';
    syncActiveOrderToStorage();
  }
  isEditingAddress.value = false;
};

const syncActiveOrderToStorage = () => {
  if (!activeOrder.value) return;
  const target = orders.value.find(o => o.id === activeOrder.value.id || o.orderNumber === activeOrder.value.orderNumber);
  if (target) {
    Object.assign(target, activeOrder.value);
  }
  try {
    const raw = localStorage.getItem('euchs_erp_submitted_orders');
    if (raw) {
      let stored = JSON.parse(raw);
      if (Array.isArray(stored)) {
        const sTarget = stored.find(o => o.id === activeOrder.value.id || o.orderNumber === activeOrder.value.orderNumber);
        if (sTarget) {
          Object.assign(sTarget, activeOrder.value);
          localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(stored));
          window.dispatchEvent(new Event('storage'));
        }
      }
    }
  } catch (e) {
    console.error('Failed to sync order to storage:', e);
  }
};

function getOrderPaymentStages(order) {
  const summary = getOrderCostSummary(order);
  const firstPaymentKrw = Math.round((summary.itemTotalKrw || 0) + (summary.agencyFeeKrw || 0));
  const secondPaymentKrw = Math.round((summary.shippingFeeKrw || 0) + (summary.tariffKrw || 0) + (summary.vatKrw || 0));
  return {
    firstPaymentKrw,
    secondPaymentKrw,
    totalDdpKrw: summary.totalDdpKrw
  };
}

const filteredOrders = computed(() => {
  // 1~4단계(발주/사입 진행) 주문만 발주관리 테이블 목록에 노출 (5~8단계는 창고/통관 전용 페이지로 격리)
  let list = orders.value.filter(ord => ORDER_STAGE_STATUSES.includes(normalizeOrderStatus(ord.status)));

  // 1. 탭 필터링
  if (selectedTab.value !== 'all') {
    list = list.filter(ord => normalizeOrderStatus(ord.status) === selectedTab.value);
  }

  // 2. 검색어 필터링
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((ord) => {
      const matchOrderNo = (ord.orderNumber || '').toLowerCase().includes(q);
      const matchBuyer = (ord.buyerInfo?.companyName || ord.customer_name || '').toLowerCase().includes(q);
      const matchItem = Array.isArray(ord.items) && ord.items.some((it) =>
        (it.productName || it.titleKo || it.titleZh || '').toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q)
      );
      return matchOrderNo || matchBuyer || matchItem;
    });
  }

  // 3. 정렬
  if (sortBy.value === 'latest') {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy.value === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy.value === 'priceHigh') {
    list.sort((a, b) => getOrderCostSummary(b).totalDdpKrw - getOrderCostSummary(a).totalDdpKrw);
  } else if (sortBy.value === 'priceLow') {
    list.sort((a, b) => getOrderCostSummary(a).totalDdpKrw - getOrderCostSummary(b).totalDdpKrw);
  }

  return list;
});

function getFilterTabCount(tabId) {
  if (tabId === 'all') return orders.value.length;
  if (tabId === 'inspection_done' || tabId === 'warehouse_inspection' || tabId === 'warehouse_in') {
    const step5Keys = ['inspection_done', 'warehouse_in', 'inspecting', 'step_5', 'warehouse_inspection'];
    return orders.value.filter(ord => step5Keys.includes(normalizeOrderStatus(ord.status))).length;
  }
  if (tabId === 'delivered' || tabId === 'domestic_delivered') {
    const step8Keys = ['domestic_shipping', 'delivered', 'completed'];
    return orders.value.filter(ord => step8Keys.includes(normalizeOrderStatus(ord.status))).length;
  }
  if (tabId === 'in_transit') {
    const transitKeys = ['warehouse_in', 'inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping'];
    return orders.value.filter(ord => transitKeys.includes(normalizeOrderStatus(ord.status))).length;
  }
  return orders.value.filter((ord) => normalizeOrderStatus(ord.status) === tabId).length;
}

function selectTab(tabId) {
  selectedTab.value = tabId;
  let tabQuery = '';
  if (tabId === 'quote_pending') tabQuery = 'quote_pending';
  else if (tabId === 'quote_confirmed') tabQuery = 'quote_confirmed';
  else if (tabId === 'payment_verified') tabQuery = 'payment_verified';
  else if (tabId === 'purchasing') tabQuery = 'purchasing';
  else if (tabId === 'inspection_done') tabQuery = 'inspection_done';
  else if (tabId === 'shipping_ready') tabQuery = 'shipping_ready';
  else if (tabId === 'customs_clearance') tabQuery = 'customs_clearance';
  else if (tabId === 'delivered') tabQuery = 'delivered';

  if (tabQuery) {
    router.replace({ query: { ...route.query, tab: tabQuery } });
  } else {
    const { tab, ...rest } = route.query;
    router.replace({ query: rest });
  }
}

watch(() => route.query.tab, (newTab) => {
  if (!newTab || newTab === 'all') {
    selectedTab.value = 'all';
  } else if (newTab === 'quote' || newTab === 'quote_pending') {
    selectedTab.value = 'quote_pending';
  } else if (newTab === 'payment' || newTab === 'quote_confirmed') {
    selectedTab.value = 'quote_confirmed';
  } else if (newTab === 'payment_verified' || newTab === 'verified') {
    selectedTab.value = 'payment_verified';
  } else if (newTab === 'purchasing') {
    selectedTab.value = 'purchasing';
  } else if (newTab === 'inspection_done' || newTab === 'warehouse_inspection' || newTab === 'warehouse_in' || newTab === 'step_5' || newTab === 'warehouse') {
    selectedTab.value = 'inspection_done';
  } else if (newTab === 'shipping_ready' || newTab === 'ready_to_ship' || newTab === 'step_6') {
    selectedTab.value = 'shipping_ready';
  } else if (newTab === 'customs' || newTab === 'customs_clearance' || newTab === 'step_7') {
    selectedTab.value = 'customs_clearance';
  } else if (newTab === 'delivered' || newTab === 'domestic_shipping' || newTab === 'step_8' || newTab === 'shipping') {
    selectedTab.value = 'delivered';
  } else {
    selectedTab.value = normalizeOrderStatus(newTab);
  }
}, { immediate: true });

// ---------------------------------------------------------
// 체크박스 선택 로직
// ---------------------------------------------------------
const isAllSelected = computed(() => {
  return (
    filteredOrders.value.length > 0 &&
    selectedOrderIds.value.length === filteredOrders.value.length
  );
});

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedOrderIds.value = filteredOrders.value.map((o) => o.id);
  } else {
    selectedOrderIds.value = [];
  }
}

// ---------------------------------------------------------
// 아이템 헬퍼
// ---------------------------------------------------------
function getItemThumbnail(order) {
  return order.items?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60';
}

function getItemTitle(order) {
  return order.items?.[0]?.productName || order.items?.[0]?.titleKo || order.items?.[0]?.titleZh || '1688 수입 발주 품목';
}

function getItemsCount(order) {
  return Array.isArray(order.items) ? order.items.length : 1;
}

function getOrderTotalQuantity(order) {
  if (!Array.isArray(order.items)) return 1;
  return order.items.reduce((acc, cur) => acc + (Number(cur.quantity) || 1), 0);
}

function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR');
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60';
}

// ---------------------------------------------------------
// 카카오톡 1:1 상담 링크 (주문번호 + 상품명 동적 연동)
// ---------------------------------------------------------
const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_xmQWsK/chat';

function getKakaoUrl(order) {
  // 카카오톡 채널 링크 — 단순 연결 (채널 채팅창이 열리면 사용자가 주문번호 메시지 입력)
  return KAKAO_CHANNEL_URL;
}

function getKakaoTitle(order) {
  const no = order?.orderNumber || '';
  const name = (order?.items?.[0]?.productName || '').slice(0, 20);
  return `주문 ${no} (${name}) 1:1 상담`;
}

// ---------------------------------------------------------
// 1~4단계 순차 상태 전환 액션
// ---------------------------------------------------------
const STATUS_ADVANCE_MAP = {
  quote_pending: 'quote_confirmed',     // 1 → 2 (견적완료/결제대기)
  quote_confirmed: 'payment_verified',  // 2 → 3 (결제확인)
  payment_verified: 'purchasing',       // 3 → 4 (1688 구매진행)
};

const ADVANCE_LABEL_MAP = {
  quote_pending: '✅ 견적 확정 (결제대기로 전환)',
  quote_confirmed: '💳 결제확인 처리',
  payment_verified: '🛒 1688 구매 진행 시작',
};

const ADVANCE_COLOR_MAP = {
  quote_pending: 'bg-amber-500 hover:bg-amber-400 text-slate-900',
  quote_confirmed: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  payment_verified: 'bg-blue-600 hover:bg-blue-700 text-white',
};

function canAdvanceStage(order) {
  const status = normalizeOrderStatus(order?.status);
  return status in STATUS_ADVANCE_MAP;
}

function getAdvanceLabel(order) {
  const status = normalizeOrderStatus(order?.status);
  return ADVANCE_LABEL_MAP[status] || '';
}

function getAdvanceColor(order) {
  const status = normalizeOrderStatus(order?.status);
  return ADVANCE_COLOR_MAP[status] || 'bg-slate-900 text-white';
}

function advanceOrderStage(order) {
  if (!order) return;
  const currentStatus = normalizeOrderStatus(order.status);
  const nextStatus = STATUS_ADVANCE_MAP[currentStatus];
  if (!nextStatus) return;

  const label = ADVANCE_LABEL_MAP[currentStatus];
  if (!confirm(`[${order.orderNumber}]\n${label} 처리하시겠습니까?`)) return;

  // 로컬 상태 업데이트
  order.status = nextStatus;

  // orders 배열 및 localStorage 동기화
  const target = orders.value.find(o => o.id === order.id || o.orderNumber === order.orderNumber);
  if (target) target.status = nextStatus;

  try {
    updateOrderStatus(order.id || order.orderNumber, nextStatus, {
      statusAdvancedAt: new Date().toISOString()
    });
  } catch (e) {
    // updateOrderStatus fallback: localStorage 직접 업데이트
    try {
      const raw = localStorage.getItem('euchs_erp_submitted_orders');
      if (raw) {
        const stored = JSON.parse(raw);
        const t = stored.find(o => o.id === order.id || o.orderNumber === order.orderNumber);
        if (t) {
          t.status = nextStatus;
          localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(stored));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orderId: order.id, status: nextStatus } }));
        }
      }
    } catch (e2) { console.warn('advanceOrderStage localStorage fallback error:', e2); }
  }

  // 토스트 알림
  alert(`✅ 상태가 [${getOrderStatusLabel(nextStatus)}]으로 전환되었습니다.`);
}

const isPaying = ref(false);

async function executeInstantPayment(order) {
  if (!order) return;
  const cost = getOrderCostSummary(order);
  const totalWon = formatNumber(cost.totalDdpKrw);

  if (!confirm(`총 결제 예정 금액 [ ₩${totalWon}원 ]을 예치금/카드로 즉시 결제 승인하시겠습니까?`)) {
    return;
  }

  isPaying.value = true;
  try {
    // 1. 상태를 'purchasing' (4. 1688 공장 구매진행)으로 변경
    const nextStatus = 'purchasing';
    order.status = nextStatus;

    // 2. Supabase 업데이트
    if (isSupabaseConfigured() && order.id) {
      try {
        await supabase
          .from('applications')
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
      } catch (e) {
        console.warn('Supabase status update error:', e);
      }
    }

    // 3. LocalStorage 업데이트
    try {
      const raw = localStorage.getItem('euchs_erp_submitted_orders');
      if (raw) {
        const localOrders = JSON.parse(raw);
        const idx = localOrders.findIndex(o => o.id === order.id || o.orderNumber === order.orderNumber);
        if (idx !== -1) {
          localOrders[idx].status = nextStatus;
          localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(localOrders));
        }
      }
    } catch (e) {
      console.warn('LocalStorage status update error:', e);
    }

    // 4. 이벤트 통지
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('euchs-order-status-update', {
      detail: { appId: order.id, status: nextStatus }
    }));

    alert(`결제가 성공적으로 승인되었습니다!\n(발주번호: ${order.orderNumber})\n중국 현지 1688 공장 구매 진행(사입) 단계로 진입합니다.`);
    closeDetailModal();
  } catch (err) {
    console.error('Payment error:', err);
    alert('결제 처리 중 오류가 발생했습니다: ' + err.message);
  } finally {
    isPaying.value = false;
  }
}

function openOrderDetail(order, mode = 'detail') {
  activeOrder.value = order;
  isDetailModalOpen.value = true;
}

function closeDetailModal() {
  isDetailModalOpen.value = false;
  activeOrder.value = null;
}

// ---------------------------------------------------------
// 엑셀 내보내기 연동
// ---------------------------------------------------------
function exportSelectedQuotes() {
  const targetOrders = orders.value.filter(o => selectedOrderIds.value.includes(o.id));
  if (targetOrders.length === 0) {
    alert('엑셀로 다운로드할 주문을 먼저 선택해 주세요.');
    return;
  }

  const allItems = [];
  targetOrders.forEach(ord => {
    if (Array.isArray(ord.items)) {
      ord.items.forEach(it => {
        allItems.push({
          ...it,
          orderNo: ord.orderNumber,
          buyerName: ord.buyerInfo?.buyerName || ord.customer_name
        });
      });
    }
  });

  try {
    const fileName = exportQuoteExcel(
      allItems,
      targetOrders[0]?.buyerInfo || defaultBuyerInfo,
      226.19,
      0.08
    );
    alert(`선택된 ${targetOrders.length}건의 공식 견적서(${fileName})가 다운로드되었습니다.`);
  } catch (err) {
    console.error('Export error:', err);
    alert('견적서 엑셀 다운로드 중 오류가 발생했습니다.');
  }
}

function exportSingleQuote(order) {
  if (!order) return;
  try {
    const items = (order.items || []).map(it => ({
      ...it,
      orderNo: order.orderNumber,
      buyerName: order.buyerInfo?.buyerName || order.customer_name
    }));
    exportQuoteExcel(items, order.buyerInfo || defaultBuyerInfo, 226.19, 0.08);
  } catch (err) {
    console.error('Single quote export error:', err);
  }
}

// ---------------------------------------------------------
// 2차 결제 & 바코드 업로드 모달 상태 및 핸들러 (Step 6 검수완료)
// ---------------------------------------------------------
const isSecondPaymentModalOpen = ref(false);
const selectedSecondPaymentOrder = ref(null);
const uploadedBarcodeFile = ref(null);
const barcodeFileInputRef = ref(null);
const isProcessingPayment = ref(false);
const previewPhotoUrl = ref(null);

const defaultInspectionPhotos = [
  {
    url: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80',
    caption: '1. 완제품 전수 실물 검수 (120 PCS 정상)'
  },
  {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
    caption: '2. 정밀 계근 및 CBM 체적 실측 (42.5kg / 0.352CBM)'
  },
  {
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&auto=format&fit=crop&q=80',
    caption: '3. 수출용 5중 카톤 포장 및 밴딩 마감 (12 CTN)'
  }
];

function openSecondPaymentModal(order) {
  selectedSecondPaymentOrder.value = order;
  uploadedBarcodeFile.value = order.barcodeFile || null;
  isSecondPaymentModalOpen.value = true;
}

function closeSecondPaymentModal() {
  isSecondPaymentModalOpen.value = false;
  selectedSecondPaymentOrder.value = null;
  previewPhotoUrl.value = null;
}

function openPhotoPreview(url) {
  previewPhotoUrl.value = url;
}

function triggerBarcodeFileInput() {
  if (barcodeFileInputRef.value) {
    barcodeFileInputRef.value.click();
  }
}

function handleBarcodeFileUpload(event) {
  const file = event.target.files?.[0];
  if (file) {
    uploadedBarcodeFile.value = {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedAt: new Date().toLocaleTimeString('ko-KR')
    };
  }
}

function handleDropBarcodeFile(event) {
  const file = event.dataTransfer.files?.[0];
  if (file) {
    uploadedBarcodeFile.value = {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedAt: new Date().toLocaleTimeString('ko-KR')
    };
  }
}

function removeBarcodeFile() {
  uploadedBarcodeFile.value = null;
  if (barcodeFileInputRef.value) {
    barcodeFileInputRef.value.value = '';
  }
}

function setSampleBarcodeFile() {
  uploadedBarcodeFile.value = {
    name: '캠핑체어_쿠팡_SKU라벨_120PCS.pdf',
    size: '1.24 MB',
    uploadedAt: new Date().toLocaleTimeString('ko-KR')
  };
}

async function handleConfirmSecondPayment() {
  isProcessingPayment.value = true;
  setTimeout(async () => {
    isProcessingPayment.value = false;
    if (selectedSecondPaymentOrder.value) {
      const order = selectedSecondPaymentOrder.value;
      order.status = 'shipping_ready';
      order.barcodeFile = uploadedBarcodeFile.value || null;

      // Update in orders list
      const idx = orders.value.findIndex(o => o.id === order.id);
      if (idx !== -1) {
        orders.value[idx].status = 'shipping_ready';
        orders.value[idx].barcodeFile = uploadedBarcodeFile.value || null;
      }

      // Update in Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('applications')
            .update({
              status: 'shipping_ready',
              details: {
                ...(order.details || {}),
                status: 'shipping_ready',
                barcodeFile: uploadedBarcodeFile.value || null
              }
            })
            .eq('id', order.id);
        } catch (e) {
          console.warn('Supabase update warning:', e);
        }
      }

      // Sync with global order storage
      saveStoredOrders(orders.value);

      const fee = order.secondPayment?.totalSecondPaymentKrw || 133000;
      const barcodeNote = uploadedBarcodeFile.value ? '바코드 부착 및 ' : '';
      alert(`✅ 2차 결제(₩${formatNumber(fee)}원)가 성공적으로 완료되었습니다!\n주문 상태가 [6. 한국행 선적/출고대기]로 변경되었으며, 중국 이우 창고에 [${barcodeNote}정기선박 선적 지시]가 즉시 전달되었습니다.`);
      closeSecondPaymentModal();
    }
  }, 600);
}

// ---------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------
onMounted(async () => {
  await loadOrdersData();
  window.addEventListener('euchs-order-status-update', loadOrdersData);
  window.addEventListener('storage', loadOrdersData);
});

// =============================================================
// 대량 EXCEL 등록 모달 & 카테고리 일괄 설정
// =============================================================
const PRESET_CATEGORIES = [
  '가전/생활용품', '의류/패션', '주방/식기', '뷰티/헬스',
  '완구/스포츠', '사무/문구', '식품/음료', '자동차용품', '기타',
];

const isBulkExcelModalOpen   = ref(false);
const isCategoryBatchModalOpen = ref(false);
const bulkParsedItems  = ref([]);
const bulkSelectedIdxs = ref([]);
const bulkDragOver     = ref(false);
const bulkCategoryFilter = ref('');
const batchCategoryInput = ref('');

const bulkCategories = computed(() => {
  const cats = bulkParsedItems.value.map(i => i.category).filter(Boolean);
  return [...new Set(cats)];
});

const filteredBulkItems = computed(() => {
  if (!bulkCategoryFilter.value) return bulkParsedItems.value;
  return bulkParsedItems.value.filter(i => i.category === bulkCategoryFilter.value);
});

function openBulkExcelModal() {
  bulkParsedItems.value = [];
  bulkSelectedIdxs.value = [];
  bulkCategoryFilter.value = '';
  isBulkExcelModalOpen.value = true;
}
function closeBulkExcelModal() { isBulkExcelModalOpen.value = false; }

function handleDownloadTemplate() {
  try { downloadBulkOrderTemplate(); }
  catch (e) { alert('양식 다운로드 실패: ' + e.message); }
}

async function parseBulkFile(file) {
  try {
    const items = await parseOrderExcel(file);
    bulkParsedItems.value = items;
    bulkSelectedIdxs.value = items.map((_, i) => i);
  } catch (e) {
    alert('파일 파싱 실패: ' + e.message);
  }
}
function onBulkFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) parseBulkFile(file);
}
function onBulkFileDrop(e) {
  bulkDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) parseBulkFile(file);
}
function toggleBulkItem(i) {
  const idx = bulkSelectedIdxs.value.indexOf(i);
  if (idx >= 0) bulkSelectedIdxs.value.splice(idx, 1);
  else bulkSelectedIdxs.value.push(i);
}
function openCategoryBatchModal() {
  batchCategoryInput.value = '';
  isCategoryBatchModalOpen.value = true;
}
function applyBatchCategory() {
  const cat = batchCategoryInput.value.trim();
  if (!cat) return;
  bulkSelectedIdxs.value.forEach(i => {
    if (bulkParsedItems.value[i]) bulkParsedItems.value[i].category = cat;
  });
  isCategoryBatchModalOpen.value = false;
}
function submitBulkExcel() {
  const toAdd = filteredBulkItems.value.map(item => ({
    id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    orderNumber: `EUC-BULK-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toLocaleString('ko-KR'),
    status: 'quote_pending',
    buyerInfo: {},
    items: [{
      productName: item.productName || '1688 상품',
      productUrl:  item.productUrl  || '',
      sku:         item.sku         || '기본',
      quantity:    item.quantity    || 1,
      priceCny:    item.priceCny    || 0,
      category:    item.category    || '',
      remark:      item.remark      || '',
    }],
  }));
  if (toAdd.length === 0) { alert('추가할 상품이 없습니다.'); return; }
  const existing = getStoredOrders();
  saveStoredOrders([...toAdd, ...existing]);
  loadOrdersData();
  closeBulkExcelModal();
  alert(`✅ ${toAdd.length}개 상품이 발주 목록에 추가되었습니다.`);
}
</script>
