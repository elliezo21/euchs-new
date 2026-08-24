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

    <!-- 통계 요약 카드 4종 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. 전체 발주 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
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
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
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
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
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
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
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
                  <button
                    type="button"
                    @click="openOrderDetail(order)"
                    class="px-3 py-1.5 rounded-xl font-bold text-[11px] transition active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    :class="order.status === 'quote_confirmed' ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse' : 'bg-slate-900 hover:bg-slate-800 text-white'"
                    :title="order.status === 'quote_confirmed' ? '견적 확인 및 즉시 결제' : '견적 및 주문 상세 확인'"
                  >
                    <CreditCard v-if="order.status === 'quote_confirmed'" class="w-3.5 h-3.5" />
                    <ClipboardCheck v-else class="w-3.5 h-3.5 text-amber-400" />
                    <span>{{ order.status === 'quote_confirmed' ? '견적 확인 및 결제' : '견적/주문 상세' }}</span>
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
            <button
              type="button"
              @click="openOrderDetail(order)"
              class="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5"
              :class="order.status === 'quote_confirmed' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-white'"
            >
              <CreditCard v-if="order.status === 'quote_confirmed'" class="w-3.5 h-3.5" />
              <ClipboardCheck v-else class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ order.status === 'quote_confirmed' ? '견적 확인 및 결제' : '견적/주문 상세' }}</span>
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
    <!-- 6. 주문 상세 및 견적 명세서 팝업 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="isDetailModalOpen && activeOrder"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      @click.self="closeDetailModal"
    >
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-xs text-gray-700">
        <!-- 모달 헤더 -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-black" :class="getOrderStatusBadgeClass(activeOrder.status)">
                {{ getOrderStatusLabel(activeOrder.status) }}
              </span>
              <span class="font-mono text-xs text-gray-500 font-bold">{{ activeOrder.orderNumber }}</span>
            </div>
            <h3 class="text-base font-bold text-gray-900 mt-1">
              1688 수입 발주 상세 견적 명세서
            </h3>
          </div>
          <button @click="closeDetailModal" class="text-gray-400 hover:text-gray-900 p-1.5 rounded-xl hover:bg-gray-100 transition">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 1. 품목 목록 -->
        <div class="space-y-2.5">
          <h4 class="font-bold text-gray-900 flex items-center gap-1.5">
            <Package class="w-4 h-4 text-amber-500" />
            <span>발주 신청 품목 내역 (총 {{ getItemsCount(activeOrder) }}건)</span>
          </h4>
          <div class="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-slate-50/50">
            <div
              v-for="(it, idx) in activeOrder.items"
              :key="idx"
              class="p-3.5 flex items-center gap-3 bg-white"
            >
              <img
                :src="it.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
                :alt="it.productName"
                class="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                @error="handleImgError"
              />
              <div class="flex-1 min-w-0">
                <p class="font-bold text-gray-900 truncate">{{ it.productName || it.titleKo || it.titleZh }}</p>
                <p class="text-[11px] text-gray-500 font-mono mt-0.5">
                  옵션: {{ it.sku || it.selectedOption || '기본 규격' }} · 수량: <b>{{ it.quantity || 1 }}개</b> · 단가: <b>¥{{ Number(it.priceCny || it.price || 0).toFixed(2) }}</b>
                </p>
              </div>
              <div class="text-right font-mono font-bold text-gray-900">
                ₩{{ formatNumber(Math.round((Number(it.priceCny || it.price || 0) * 226.19) * (it.quantity || 1))) }}원
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 공식 수입 도착원가 (DDP) 상세 원가 계산표 -->
        <div class="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2.5">
          <h4 class="font-bold text-gray-900 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <Calculator class="w-4 h-4 text-amber-500" />
              <span>수입 원가 상세 계산서 (DDP 기준)</span>
            </span>
            <span class="text-[11px] text-gray-400 font-normal font-mono">적용환율 ₩226.19 / 위안</span>
          </h4>

          <div class="space-y-1.5 text-[11px]">
            <div class="flex justify-between py-1 border-b border-gray-200/60">
              <span class="text-gray-600">1. 순수 1688 제품 대금 (¥{{ getOrderCostSummary(activeOrder).itemTotalCny.toFixed(2) }})</span>
              <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).itemTotalKrw) }}원</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-200/60">
              <span class="text-gray-600">2. 해운 물류비 (예상 {{ getOrderCostSummary(activeOrder).cbm }} CBM)</span>
              <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).shippingFeeKrw) }}원</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-200/60">
              <span class="text-gray-600">3. 예상 수입 관세 (8% 기준)</span>
              <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).tariffKrw) }}원</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-200/60">
              <span class="text-gray-600">4. 수입 부가가치세 (VAT 10%)</span>
              <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).vatKrw) }}원</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-200/60">
              <span class="text-gray-600">5. 수입 대행 수수료 (8%)</span>
              <span class="font-mono font-bold text-gray-900">₩{{ formatNumber(getOrderCostSummary(activeOrder).agencyFeeKrw) }}원</span>
            </div>
            <div class="flex justify-between pt-2 text-sm font-extrabold text-amber-600">
              <span>최종 예상 총 견적금액 (DDP)</span>
              <span class="font-mono text-base">₩{{ formatNumber(getOrderCostSummary(activeOrder).totalDdpKrw) }}원</span>
            </div>
            <div class="text-right text-[10px] text-gray-400 font-mono">
              개당 도착원가 환산: 약 ₩{{ formatNumber(getOrderCostSummary(activeOrder).unitDdpKrw) }}원 / 개
            </div>
          </div>
        </div>

        <!-- 3. 바이어 배송 및 통관 정보 -->
        <div class="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-1.5 text-[11px]">
          <h4 class="font-bold text-gray-900">수령자 및 배송지 정보</h4>
          <p class="text-gray-600">
            상호/성명: <b class="text-gray-900">{{ activeOrder.buyerInfo?.companyName || activeOrder.customer_name || '이유씨 바이어' }}</b> ·
            연락처: <b class="text-gray-900 font-mono">{{ activeOrder.buyerInfo?.phone || '-' }}</b>
          </p>
          <p class="text-gray-600">
            통관고유부호: <b class="text-gray-900 font-mono">{{ activeOrder.buyerInfo?.customsCode || 'P240012345678' }}</b>
          </p>
          <p class="text-gray-600 truncate">
            배송지: {{ activeOrder.buyerInfo?.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩' }}
          </p>
        </div>

        <!-- 모달 푸터 버튼 -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-200">
          <a
            href="http://pf.kakao.com/_xmQWsK/chat"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3.5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <MessageCircle class="w-4 h-4" />
            <span>1:1 전담 매니저 상담</span>
          </a>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <!-- 결제 대기 / 견적 완료 상태일 때 즉시 결제하기 메인 버튼 노출 -->
            <button
              v-if="activeOrder.status === 'quote_confirmed' || activeOrder.status === 'quote_pending'"
              type="button"
              @click="executeInstantPayment(activeOrder)"
              :disabled="isPaying"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50 animate-pulse"
            >
              <CreditCard class="w-4 h-4" />
              <span>💳 예치금/카드 즉시 결제하기 (₩{{ formatNumber(getOrderCostSummary(activeOrder).totalDdpKrw) }}원)</span>
            </button>

            <button
              type="button"
              @click="exportSingleQuote(activeOrder)"
              class="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <FileSpreadsheet class="w-4 h-4" />
              <span>견적서 엑셀 다운로드</span>
            </button>

            <button
              type="button"
              @click="closeDetailModal"
              class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition"
            >
              닫기
            </button>
          </div>
        </div>
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
  ClipboardCheck
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
          list = parsed.map(o => ({
            id: o.id || `ord-${o.orderId}`,
            orderNumber: o.orderNumber || o.orderId || `EUC-${o.id}`,
            createdAt: o.createdAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
            status: normalizeOrderStatus(o.status),
            buyerInfo: o.buyerInfo || { ...defaultBuyerInfo },
            items: o.items || [{ productName: '1688 소싱 품목', quantity: 100, priceCny: 20 }]
          }));
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
// Lifecycle
// ---------------------------------------------------------
onMounted(async () => {
  await loadOrdersData();
  window.addEventListener('euchs-order-status-update', loadOrdersData);
  window.addEventListener('storage', loadOrdersData);
});
</script>
