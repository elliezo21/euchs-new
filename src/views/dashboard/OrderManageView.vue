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

    <!-- 통계 요약 카드 4종 (클릭 시 탭 필터링 연동) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. 전체 발주 -->
      <div
        @click="selectTab('all')"
        class="bg-white border rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md select-none"
        :class="selectedTab === 'all' ? 'border-2 border-slate-900 bg-slate-50/70 ring-2 ring-slate-900/10' : 'border-gray-200 hover:border-gray-300'"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-gray-500">전체 발주</span>
          <div class="text-2xl font-extrabold text-gray-900 font-mono">
            {{ orders.length }} <span class="text-xs font-normal text-gray-500">건</span>
          </div>
          <p class="text-[11px] text-gray-400">누적 발주 의뢰</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Layers class="w-5 h-5" />
        </div>
      </div>

      <!-- 2. 견적 대기/심사 -->
      <div
        @click="selectTab('quote_pending')"
        class="bg-white border rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md select-none"
        :class="selectedTab === 'quote_pending' ? 'border-2 border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20' : 'border-gray-200 hover:border-amber-200'"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-amber-700">견적 대기/심사</span>
          <div class="text-2xl font-extrabold text-amber-600 font-mono">
            {{ statCounts.quotePending }} <span class="text-xs font-normal text-gray-500">건</span>
          </div>
          <p class="text-[11px] text-amber-600/70">관세/운임 산출중</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Clock class="w-5 h-5" />
        </div>
      </div>

      <!-- 3. 결제 대기 -->
      <div
        @click="selectTab('quote_confirmed')"
        class="bg-white border rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md select-none"
        :class="selectedTab === 'quote_confirmed' ? 'border-2 border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20' : 'border-gray-200 hover:border-orange-200'"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-orange-700">결제 대기</span>
          <div class="text-2xl font-extrabold text-orange-600 font-mono">
            {{ statCounts.quoteConfirmed }} <span class="text-xs font-normal text-gray-500">건</span>
          </div>
          <p class="text-[11px] text-orange-600/70">견적 확정/입금대기</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
          <Calculator class="w-5 h-5" />
        </div>
      </div>

      <!-- 4. 1688 구매 진행중 -->
      <div
        @click="selectTab('purchasing')"
        class="bg-white border rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md select-none"
        :class="selectedTab === 'purchasing' ? 'border-2 border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-blue-200'"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-blue-700">1688 구매 진행중</span>
          <div class="text-2xl font-extrabold text-blue-600 font-mono">
            {{ statCounts.purchasing }} <span class="text-xs font-normal text-gray-500">건</span>
          </div>
          <p class="text-[11px] text-blue-600/70">현지 공장 주문완료</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Package class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 상태 필터 탭 바 (반응형 가로 스크롤 & 카운트) -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl p-2 shadow-xs">
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          v-for="tab in filterTabs"
          :key="tab.id"
          type="button"
          @click="selectedTab = tab.id"
          class="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition select-none"
          :class="selectedTab === tab.id
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          <span>{{ tab.label }}</span>
          <span
            class="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black"
            :class="selectedTab === tab.id
              ? 'bg-white/20 text-white'
              : 'bg-gray-100 text-gray-600'"
          >
            {{ getFilterTabCount(tab.id) }}
          </span>
        </button>
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
    <div class="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs divide-y divide-gray-100">
          <thead class="bg-slate-50 text-gray-600 font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </th>
              <th class="py-3.5 px-4">주문번호 / 일시</th>
              <th class="py-3.5 px-4">1688 대표 상품 정보</th>
              <th class="py-3.5 px-4 text-center">선택 옵션 / 수량</th>
              <th class="py-3.5 px-4 text-right">공급단가 & 총 견적금액 (DDP)</th>
              <th class="py-3.5 px-4 text-center">진행 상태</th>
              <th class="py-3.5 px-4 text-center">관리 액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="hover:bg-slate-50/80 transition group"
            >
              <!-- 체크박스 -->
              <td class="py-3.5 px-4 text-center">
                <input
                  type="checkbox"
                  v-model="selectedOrderIds"
                  :value="order.id"
                  class="rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </td>

              <!-- 주문번호 & 일자 -->
              <td class="py-3.5 px-4 whitespace-nowrap font-mono">
                <div class="font-bold text-gray-900 hover:text-amber-600 cursor-pointer" @click="openOrderDetail(order)">
                  {{ order.orderNumber }}
                </div>
                <div class="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  <span>{{ order.createdAt }}</span>
                </div>
              </td>

              <!-- 1688 상품 정보 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3 min-w-[260px]">
                  <img
                    :src="getItemThumbnail(order)"
                    :alt="getItemTitle(order)"
                    class="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                    @error="handleImgError"
                  />
                  <div class="space-y-0.5 flex-1 min-w-0">
                    <div
                      class="font-bold text-gray-900 hover:text-amber-600 line-clamp-1 cursor-pointer transition"
                      @click="openOrderDetail(order)"
                      :title="getItemTitle(order)"
                    >
                      {{ getItemTitle(order) }}
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                      <span>품목 <b>{{ getItemsCount(order) }}</b>건</span>
                      <a
                        v-if="order.items?.[0]?.productUrl"
                        :href="order.items[0].productUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-amber-600 hover:underline flex items-center gap-0.5"
                        @click.stop
                      >
                        <span>1688 바로가기</span>
                        <ExternalLink class="w-2.5 h-2.5" />
                      </a>
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
                <div class="flex items-center justify-center gap-1.5">
                  <!-- 6. 검수완료 상태: [2차 결제 & 바코드 등록] 강조 버튼 -->
                  <button
                    v-if="order.status === 'inspection_done'"
                    type="button"
                    @click="openSecondPaymentModal(order)"
                    class="px-3.5 py-1.5 rounded-xl font-black text-[11px] bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md transition active:scale-95 flex items-center gap-1.5 animate-pulse cursor-pointer"
                    title="현지 실측 검수 확인 및 2차 결제 / 바코드 업로드"
                  >
                    <Package class="w-3.5 h-3.5" />
                    <span>📦 2차 결제 & 바코드 등록</span>
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

                  <a
                    href="http://pf.kakao.com/_xmQWsK/chat"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-2 py-1.5 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/30 text-amber-900 border border-yellow-300 font-bold text-[11px] transition active:scale-95 flex items-center gap-1"
                    title="1:1 카카오톡 상담 문의"
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
            <!-- 6. 검수완료 상태 -->
            <button
              v-if="order.status === 'inspection_done'"
              type="button"
              @click="openSecondPaymentModal(order)"
              class="px-3 py-1.5 rounded-xl font-black text-xs bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Package class="w-3.5 h-3.5" />
              <span>📦 2차 결제 & 바코드 등록</span>
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
          
          <!-- 검수완료 상태일 때 2차 결제 바로가기 강조 배너 -->
          <div
            v-if="activeOrder.status === 'inspection_done'"
            class="p-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0">
                <Package class="w-5 h-5" />
              </div>
              <div>
                <div class="font-extrabold text-sm text-white">현지 창고 실측 계근 및 검수가 완료되었습니다!</div>
                <div class="text-xs text-teal-100 mt-0.5">바코드 라벨 파일 업로드 및 2차 결제(국제해운운임+세관+작업비: ₩133,000)를 진행해 주세요.</div>
              </div>
            </div>
            <button
              type="button"
              @click="openSecondPaymentModal(activeOrder); closeDetailModal()"
              class="px-5 py-2.5 rounded-xl bg-white text-teal-950 font-black text-xs shadow-md hover:bg-teal-50 transition active:scale-95 shrink-0 cursor-pointer"
            >
              📦 2차 결제 & 바코드 등록 열기 ➔
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
            href="http://pf.kakao.com/_xmQWsK/chat"
            target="_blank"
            rel="noopener noreferrer"
            class="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
          >
            <MessageCircle class="w-4 h-4" />
            <span>1:1 담당 매니저 상담</span>
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
                  STEP 6. 현지 실측 검수완료
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
                  class="group relative rounded-xl overflow-hidden border border-gray-200 bg-black aspect-4/3 cursor-pointer shadow-xs"
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

          <!-- ② 🏷️ 바코드 라벨 파일 업로드 영역 (쿠팡 로켓그로스 / 자체 바코드) -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <FileText class="w-4 h-4 text-orange-600" />
                <h4 class="font-bold text-sm text-gray-900">2. 🏷️ 마켓/쿠팡 바코드 라벨 파일 업로드</h4>
              </div>
              <span class="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-black">
                선적 필수 제출
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
                  쿠팡 윙 또는 마켓에서 다운로드받은 상품 바코드 라벨(PDF/ZIP/이미지)을 업로드해 주세요. 현지 창고에서 출력 후 제품별로 정밀 부착합니다.
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
              @click="$refs.barcodeFileInputRef.click()"
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
                  @click="$refs.barcodeFileInputRef.click()"
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
import { calculateImportCost, formatCurrency } from '@/utils/costCalculator';
import {
  PIPELINE_STATUSES,
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusBadgeClass
} from '@/lib/orderPipeline';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const route = useRoute();
const router = useRouter();

// ---------------------------------------------------------
// 상태 탭 정의
// ---------------------------------------------------------
const filterTabs = [
  { id: 'all', label: '전체 (All)' },
  { id: 'quote_pending', label: '견적 요청/대기' },
  { id: 'quote_confirmed', label: '결제 대기' },
  { id: 'purchasing', label: '1688 구매진행' },
  { id: 'in_transit', label: '현지 입고/배송중' },
  { id: 'delivered', label: '완료/정산' },
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

// ---------------------------------------------------------
// 라우터 쿼리 탭 동기화
// ---------------------------------------------------------
watch(() => route.query.tab, (newTab) => {
  if (!newTab || newTab === 'all') {
    selectedTab.value = 'all';
  } else if (newTab === 'quote' || newTab === 'quote_pending') {
    selectedTab.value = 'quote_pending';
  } else if (newTab === 'purchasing') {
    selectedTab.value = 'purchasing';
  } else if (newTab === 'warehouse' || newTab === 'warehouse_in' || newTab === 'in_transit') {
    selectedTab.value = 'in_transit';
  } else {
    selectedTab.value = normalizeOrderStatus(newTab);
  }
}, { immediate: true });

// ---------------------------------------------------------
// 데이터 로드 (Supabase + LocalStorage)
// ---------------------------------------------------------
const loadOrdersData = async () => {
  isRefreshing.value = true;
  try {
    let list = [...defaultMockOrders];

    // 1. LocalStorage 체크
    const cachedOrders = localStorage.getItem('euchs_erp_submitted_orders');
    if (cachedOrders) {
      try {
        const parsed = JSON.parse(cachedOrders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map();
          defaultMockOrders.forEach(m => map.set(m.id, { ...m }));
          parsed.forEach(o => {
            const id = o.id || `ord-${o.orderId}`;
            const existing = map.get(id);
            map.set(id, {
              ...(existing || {}),
              ...o,
              id,
              orderNumber: o.orderNumber || o.orderId || `EUC-${o.id}`,
              status: normalizeOrderStatus(o.status),
              buyerInfo: o.buyerInfo || existing?.buyerInfo || { ...defaultBuyerInfo },
              items: o.items || existing?.items || [{ productName: '1688 소싱 품목', quantity: 100, priceCny: 20 }]
            });
          });
          list = Array.from(map.values());
        }
      } catch (e) {
        console.warn('LocalStorage parse error:', e);
      }
    }

    // 2. Supabase 체크
    if (isSupabaseConfigured()) {
      try {
        const { data: dbApps } = await supabase
          .from('applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (Array.isArray(dbApps) && dbApps.length > 0) {
          dbApps.forEach(app => {
            const normalizedStatus = normalizeOrderStatus(app.status);
            const exists = list.find(o => String(o.id) === String(app.id) || o.orderNumber === app.details?.orderId);
            if (exists) {
              exists.status = normalizedStatus;
              if (app.details?.items) exists.items = app.details.items;
            } else if (app.details?.items || app.service_type === 'purchasing') {
              list.unshift({
                id: String(app.id),
                orderNumber: app.details?.orderId || `EUC-APP-${app.id}`,
                createdAt: app.created_at ? new Date(app.created_at).toLocaleString('ko-KR') : '2026-08-24 10:00',
                status: normalizedStatus,
                customer_name: app.customer_name,
                buyerInfo: {
                  companyName: app.company_name || app.customer_name,
                  buyerName: app.customer_name,
                  phone: app.phone,
                  email: app.email,
                  customsCode: app.details?.customsCode || 'P240012345678',
                  address: app.details?.address || '서울특별시 강남구'
                },
                items: app.details?.items || [
                  {
                    productName: app.details?.productName || app.memo || '1688 소싱 품목',
                    quantity: app.details?.quantity || 100,
                    priceCny: 25.0,
                    sku: app.details?.option || '기본 규격',
                    imageUrl: app.details?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80'
                  }
                ]
              });
            }
          });
        }
      } catch (e) {
        console.warn('Supabase fetch error:', e);
      }
    }

    orders.value = list;
  } finally {
    isRefreshing.value = false;
  }
};

const refreshData = async () => {
  await loadOrdersData();
};

// ---------------------------------------------------------
// 통계 요약 (4대 KPI)
// ---------------------------------------------------------
const statCounts = computed(() => {
  const quotePending = orders.value.filter(o => normalizeOrderStatus(o.status) === 'quote_pending').length;
  const quoteConfirmed = orders.value.filter(o => normalizeOrderStatus(o.status) === 'quote_confirmed').length;
  const purchasing = orders.value.filter(o => normalizeOrderStatus(o.status) === 'purchasing').length;
  return {
    quotePending,
    quoteConfirmed,
    purchasing
  };
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
    feeLabel: '개당 약 ₩50~100',
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

// ---------------------------------------------------------
// 필터링 및 정렬 (Computed)
// ---------------------------------------------------------
const filteredOrders = computed(() => {
  let list = [...orders.value];

  // 1. 탭 필터링
  if (selectedTab.value !== 'all') {
    if (selectedTab.value === 'in_transit') {
      const transitKeys = ['warehouse_in', 'inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping'];
      list = list.filter(ord => transitKeys.includes(normalizeOrderStatus(ord.status)));
    } else {
      list = list.filter(ord => normalizeOrderStatus(ord.status) === selectedTab.value);
    }
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
  if (tabId === 'in_transit') {
    const transitKeys = ['warehouse_in', 'inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping'];
    return orders.value.filter(ord => transitKeys.includes(normalizeOrderStatus(ord.status))).length;
  }
  return orders.value.filter((ord) => normalizeOrderStatus(ord.status) === tabId).length;
}

function selectTab(tabId) {
  selectedTab.value = tabId;
  let tabQuery = '';
  if (tabId === 'quote_pending') tabQuery = 'quote';
  else if (tabId === 'quote_confirmed') tabQuery = 'payment';
  else if (tabId === 'purchasing') tabQuery = 'purchasing';

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
  } else if (newTab === 'purchasing') {
    selectedTab.value = 'purchasing';
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
  if (!uploadedBarcodeFile.value) {
    alert('바코드 라벨 파일을 먼저 업로드해 주세요.');
    return;
  }

  isProcessingPayment.value = true;
  setTimeout(async () => {
    isProcessingPayment.value = false;
    if (selectedSecondPaymentOrder.value) {
      const order = selectedSecondPaymentOrder.value;
      order.status = 'shipping_ready';
      order.barcodeFile = uploadedBarcodeFile.value;

      // Update in orders list
      const idx = orders.value.findIndex(o => o.id === order.id);
      if (idx !== -1) {
        orders.value[idx].status = 'shipping_ready';
        orders.value[idx].barcodeFile = uploadedBarcodeFile.value;
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
                barcodeFile: uploadedBarcodeFile.value
              }
            })
            .eq('id', order.id);
        } catch (e) {
          console.warn('Supabase update warning:', e);
        }
      }

      // Sync with localStorage
      try {
        localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(orders.value));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('euchs-order-status-update', {
        detail: { appId: order.id, status: 'shipping_ready' }
      }));

      const fee = order.secondPayment?.totalSecondPaymentKrw || 133000;
      alert(`✅ 2차 결제(₩${formatNumber(fee)}원)가 성공적으로 완료되었습니다!\n주문 상태가 [7. 한국행 선적/출고대기]로 변경되었으며, 중국 이우 창고에 [바코드 부착 및 정기선박 선적 지시]가 즉시 전달되었습니다.`);
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
</script>
