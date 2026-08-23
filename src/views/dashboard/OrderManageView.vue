<template>
  <div class="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 & 상단 메트릭/액션 영역 -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-black tracking-wide">
            EUCHS B2B ERP
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            주문 / 발주 통합 관리
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          1688 소싱 품목의 실시간 견적, 현지 구매, 검수 창고 입고 및 통관·배송 상태를 관리합니다.
        </p>
      </div>

      <!-- 상단 액션 버튼 그룹 -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          @click="openUploadModal"
          class="px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-xs transition flex items-center gap-2 active:scale-95"
        >
          <UploadCloud class="w-4 h-4 text-orange-500" />
          <span>1688 엑셀 대량 등록</span>
        </button>

        <button
          type="button"
          @click="handleExportAllQuotes"
          :disabled="filteredOrders.length === 0"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-95"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>공식 견적서 XLSX 다운로드</span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 상태 필터링 탭 바 (반응형 가로 스크롤 & 카운트 배지) -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl p-2 shadow-xs">
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          v-for="tab in statusTabs"
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
            {{ getTabCount(tab.id) }}
          </span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 검색 및 필터 컨트롤 바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <!-- 검색 인풋 -->
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="주문번호, 1688 상품명, 옵션(SKU), 수령인 검색"
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
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
    <!-- 4. 주문/발주 리스트 (PC 테이블 뷰) -->
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
                  class="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              </th>
              <th class="py-3.5 px-4">주문번호 / 일자</th>
              <th class="py-3.5 px-4">1688 대표 상품 정보</th>
              <th class="py-3.5 px-4 text-center">옵션 / 수량</th>
              <th class="py-3.5 px-4 text-right">총 견적 금액 (DDP)</th>
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
                  class="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              </td>

              <!-- 주문번호 & 일자 -->
              <td class="py-3.5 px-4 whitespace-nowrap font-mono">
                <div class="font-bold text-gray-900 hover:text-orange-600 cursor-pointer" @click="openOrderDetail(order)">
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
                    :src="order.items[0]?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
                    :alt="order.items[0]?.productName"
                    class="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                    @error="handleImgError"
                  />
                  <div class="space-y-0.5 flex-1 min-w-0">
                    <div
                      class="font-bold text-gray-900 hover:text-orange-600 line-clamp-1 cursor-pointer transition"
                      @click="openOrderDetail(order)"
                    >
                      {{ order.items[0]?.productName }}
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                      <span>품목 <b>{{ order.items.length }}</b>건</span>
                      <a
                        v-if="order.items[0]?.productUrl"
                        :href="order.items[0]?.productUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-orange-600 hover:underline flex items-center gap-0.5"
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
                  {{ order.items[0]?.sku || '기본 옵션' }}
                </div>
                <div class="text-xs font-bold text-gray-900 font-mono mt-0.5">
                  총 {{ getOrderTotalQuantity(order) }}개
                </div>
              </td>

              <!-- 총 견적 금액 (DDP) -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900 font-mono">
                  {{ formatCurrency(order.costSummary.totalDdpKrw, 'KRW') }}
                </div>
                <div class="text-[11px] text-gray-400 font-mono">
                  (¥ {{ order.costSummary.itemTotalCny.toFixed(2) }} 위안)
                </div>
              </td>

              <!-- 진행 상태 뱃지 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  :class="getStatusBadgeClass(order.status)"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>

              <!-- 액션 버튼 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    @click="openOrderDetail(order)"
                    class="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                    title="상세보기"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    @click="handleExportSingleQuote(order)"
                    class="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="견적서 다운로드"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- 데이터 없음 -->
            <tr v-if="filteredOrders.length === 0">
              <td colspan="7" class="py-16 text-center text-gray-400">
                <div class="flex flex-col items-center justify-center gap-2">
                  <Package class="w-10 h-10 text-gray-300 stroke-[1.5]" />
                  <p class="font-bold text-gray-600 text-sm">해당 조건에 부합하는 주문 내역이 없습니다.</p>
                  <p class="text-xs text-gray-400">새로운 1688 엑셀 발주서를 등록해보세요.</p>
                  <button
                    type="button"
                    @click="openUploadModal"
                    class="mt-2 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition"
                  >
                    1688 엑셀 업로드하기
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4-2. 모바일 전용 카드 뷰 -->
    <!-- ======================================================== -->
    <div class="md:hidden space-y-3">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3"
      >
        <!-- 카드 상단: 번호 & 상태 -->
        <div class="flex items-center justify-between pb-2.5 border-b border-gray-100">
          <div class="font-mono font-bold text-xs text-gray-900">
            {{ order.orderNumber }}
          </div>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
            :class="getStatusBadgeClass(order.status)"
          >
            {{ getStatusLabel(order.status) }}
          </span>
        </div>

        <!-- 상품 요약 정보 -->
        <div class="flex items-start gap-3">
          <img
            :src="order.items[0]?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
            :alt="order.items[0]?.productName"
            class="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0"
            @error="handleImgError"
          />
          <div class="flex-1 min-w-0 space-y-1">
            <h4 class="font-bold text-xs text-gray-900 line-clamp-2">
              {{ order.items[0]?.productName }}
            </h4>
            <div class="text-[11px] text-gray-500 font-medium">
              {{ order.items[0]?.sku }} · 총 {{ getOrderTotalQuantity(order) }}개
            </div>
            <div class="text-xs font-bold text-orange-600 font-mono">
              {{ formatCurrency(order.costSummary.totalDdpKrw, 'KRW') }}
            </div>
          </div>
        </div>

        <!-- 카드 하단 액션 버튼 -->
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
          <button
            type="button"
            @click="openOrderDetail(order)"
            class="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition flex items-center justify-center gap-1.5"
          >
            <Eye class="w-3.5 h-3.5" />
            <span>상세보기</span>
          </button>
          <button
            type="button"
            @click="handleExportSingleQuote(order)"
            class="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition flex items-center justify-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            <span>견적서</span>
          </button>
        </div>
      </div>

      <div v-if="filteredOrders.length === 0" class="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
        <Package class="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p class="font-bold text-xs text-gray-600">조회된 주문 내역이 없습니다.</p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. 주문 상세 내역 슬라이드오버 Drawer -->
    <!-- ======================================================== -->
    <div v-if="isDetailDrawerOpen" class="fixed inset-0 z-50 overflow-hidden">
      <!-- 배경 오버레이 -->
      <div
        class="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        @click="closeOrderDetail"
      ></div>

      <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div class="w-screen max-w-2xl bg-white shadow-2xl flex flex-col justify-between">
          <!-- Drawer Header -->
          <div class="p-5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
            <div>
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded-full text-[11px] font-bold"
                  :class="getStatusBadgeClass(activeOrder?.status)"
                >
                  {{ getStatusLabel(activeOrder?.status) }}
                </span>
                <h3 class="text-base font-bold text-gray-900 font-mono">
                  {{ activeOrder?.orderNumber }}
                </h3>
              </div>
              <p class="text-xs text-gray-500 mt-1">주문일시: {{ activeOrder?.createdAt }}</p>
            </div>
            <button
              type="button"
              @click="closeOrderDetail"
              class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Drawer Body (Scrollable) -->
          <div class="p-6 overflow-y-auto space-y-6 text-xs text-gray-700 flex-1">
            <!-- 1. 소싱 품목 목록 -->
            <div class="space-y-3">
              <h4 class="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Package class="w-4 h-4 text-orange-500" />
                <span>1688 발주 상품 목록 ({{ activeOrder?.items.length }}건)</span>
              </h4>

              <div class="space-y-2">
                <div
                  v-for="(item, idx) in activeOrder?.items"
                  :key="idx"
                  class="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex items-start gap-3"
                >
                  <img
                    :src="item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
                    class="w-14 h-14 rounded-lg object-cover border border-gray-200 bg-white shrink-0"
                    @error="handleImgError"
                  />
                  <div class="flex-1 min-w-0 space-y-1">
                    <div class="font-bold text-gray-900 text-xs line-clamp-2">
                      {{ item.productName }}
                    </div>
                    <div class="text-[11px] text-gray-500">
                      옵션(SKU): <span class="font-semibold text-gray-700">{{ item.sku }}</span>
                    </div>
                    <div class="flex items-center justify-between pt-1">
                      <span class="font-mono text-gray-600">
                        단가: ¥{{ item.priceCny }} × {{ item.quantity }}개
                      </span>
                      <span class="font-mono font-bold text-gray-900">
                        소계: ¥{{ (item.priceCny * item.quantity).toFixed(2) }}
                      </span>
                    </div>
                    <div v-if="item.productUrl" class="pt-1">
                      <a
                        :href="item.productUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-orange-600 hover:underline inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <span>1688 원본 상품 링크 열기</span>
                        <ExternalLink class="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. 수입 도착원가(DDP) 상세 내역 (costCalculator 연동) -->
            <div class="space-y-3">
              <h4 class="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Calculator class="w-4 h-4 text-blue-500" />
                <span>예상 수입 도착원가 (DDP Breakdown)</span>
              </h4>

              <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-2.5 font-mono">
                <div class="flex justify-between">
                  <span class="text-gray-600">상품대금 합계 (CNY)</span>
                  <span class="font-bold text-gray-900">¥ {{ activeOrder?.costSummary.itemTotalCny.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">적용 환율</span>
                  <span class="text-gray-900">{{ activeOrder?.costSummary.exchangeRate }} 원/위안</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">상품대금 원화 (KRW)</span>
                  <span class="font-bold text-gray-900">{{ formatCurrency(activeOrder?.costSummary.itemTotalKrw) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">해운 운임 (예상 {{ activeOrder?.costSummary.cbm }} CBM)</span>
                  <span class="text-gray-900">{{ formatCurrency(activeOrder?.costSummary.shippingFeeKrw) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">수입 관세 (8%)</span>
                  <span class="text-gray-900">{{ formatCurrency(activeOrder?.costSummary.tariffKrw) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">수입 부가세 (10%)</span>
                  <span class="text-gray-900">{{ formatCurrency(activeOrder?.costSummary.vatKrw) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">EUC 수입 대행 수수료 (5%)</span>
                  <span class="text-gray-900">{{ formatCurrency(activeOrder?.costSummary.agencyFeeKrw) }}</span>
                </div>
                <div class="border-t border-blue-200 pt-2.5 flex justify-between items-baseline text-sm">
                  <span class="font-bold text-gray-900">최종 총 도착원가 (DDP)</span>
                  <span class="font-black text-orange-600 text-base">{{ formatCurrency(activeOrder?.costSummary.totalDdpKrw) }}</span>
                </div>
                <div class="text-right text-[11px] text-gray-500">
                  개당 도착원가: {{ formatCurrency(activeOrder?.costSummary.unitDdpKrw) }} / 개
                </div>
              </div>
            </div>

            <!-- 3. 수령인 및 통관 정보 -->
            <div class="space-y-3">
              <h4 class="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Truck class="w-4 h-4 text-emerald-500" />
                <span>배송지 및 수입 통관 정보</span>
              </h4>

              <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <span class="text-gray-500 text-[11px]">업체/수령인</span>
                    <p class="font-bold text-gray-900">{{ activeOrder?.buyerInfo.companyName || activeOrder?.buyerInfo.buyerName }}</p>
                  </div>
                  <div>
                    <span class="text-gray-500 text-[11px]">연락처</span>
                    <p class="font-mono text-gray-900">{{ activeOrder?.buyerInfo.phone }}</p>
                  </div>
                </div>
                <div>
                  <span class="text-gray-500 text-[11px]">개인/사업자 통관고유부호</span>
                  <p class="font-mono font-bold text-blue-600">{{ activeOrder?.buyerInfo.customsCode }}</p>
                </div>
                <div>
                  <span class="text-gray-500 text-[11px]">국내 수령지 주소</span>
                  <p class="text-gray-800">{{ activeOrder?.buyerInfo.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Drawer Footer -->
          <div class="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              @click="handleExportSingleQuote(activeOrder)"
              class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
            >
              <FileSpreadsheet class="w-4 h-4" />
              <span>견적서 엑셀 다운로드</span>
            </button>
            <button
              type="button"
              @click="closeOrderDetail"
              class="px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 6. 1688 엑셀 대량 등록 모달 (parseOrderExcel 연동) -->
    <!-- ======================================================== -->
    <div v-if="isUploadModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" @click="closeUploadModal"></div>

      <div class="relative bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-gray-100 max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <UploadCloud class="w-4 h-4" />
            </div>
            <div>
              <h3 class="font-bold text-base text-gray-900">1688 엑셀 파일 대량 발주 등록</h3>
              <p class="text-xs text-gray-500">1688 상품 링크, 수량, 옵션이 포함된 엑셀(.xlsx)을 업로드하세요.</p>
            </div>
          </div>
          <button type="button" @click="closeUploadModal" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 파일 드래그 앤 드롭 영역 -->
        <div
          class="border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-orange-50/30"
          @click="triggerFileInput"
          @dragover.prevent
          @drop.prevent="handleFileDrop"
        >
          <input
            type="file"
            ref="fileInputRef"
            accept=".xlsx, .xls, .csv"
            class="hidden"
            @change="handleFileChange"
          />
          <FileSpreadsheet class="w-10 h-10 mx-auto text-orange-500 mb-2" />
          <p class="text-xs font-bold text-gray-800">클릭하거나 엑셀 파일을 여기로 드래그하세요</p>
          <p class="text-[11px] text-gray-400 mt-1">지원 포맷: .xlsx, .xls (최대 10MB)</p>
        </div>

        <!-- 파싱 상태 및 미리보기 -->
        <div v-if="isParsing" class="py-8 text-center text-xs text-gray-500 space-y-2">
          <div class="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="font-medium">엑셀 데이터를 정규화 파싱 중입니다...</p>
        </div>

        <div v-else-if="parsedPreviewItems.length > 0" class="flex-1 min-h-0 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-gray-800">추출된 상품 목록 ({{ parsedPreviewItems.length }}건)</span>
            <span class="text-emerald-600 font-medium">파싱 성공</span>
          </div>

          <div class="max-h-48 overflow-y-auto border border-gray-200 rounded-xl text-xs divide-y divide-gray-100">
            <div
              v-for="(item, idx) in parsedPreviewItems"
              :key="idx"
              class="p-2.5 flex items-center justify-between hover:bg-gray-50"
            >
              <div class="flex-1 min-w-0 pr-3">
                <p class="font-bold text-gray-900 truncate">{{ item.productName }}</p>
                <p class="text-[11px] text-gray-400 truncate">{{ item.productUrl }} | 옵션: {{ item.sku }}</p>
              </div>
              <div class="text-right font-mono whitespace-nowrap">
                <span class="font-bold text-gray-900">{{ item.quantity }}개</span>
                <span class="text-gray-500 text-[11px] ml-1.5">(¥{{ item.priceCny }})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 모달 액션 버튼 -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            @click="closeUploadModal"
            class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button
            type="button"
            @click="submitBulkOrder"
            :disabled="parsedPreviewItems.length === 0"
            class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold transition shadow-xs"
          >
            발주 목록에 {{ parsedPreviewItems.length }}건 추가하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  Search,
  UploadCloud,
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
} from 'lucide-vue-next';
import { exportQuoteToExcel, parseOrderExcel } from '@/utils/excelHandler';
import { calculateImportCost, formatCurrency } from '@/utils/costCalculator';
import {
  PIPELINE_STATUSES,
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusShortLabel,
  getOrderStatusBadgeClass
} from '@/lib/orderPipeline';

// ---------------------------------------------------------
// 상태 관리 (Tabs & Filters)
// ---------------------------------------------------------
const statusTabs = [
  { id: 'all', label: '전체' },
  { id: 'quote_pending', label: '1. 견적대기' },
  { id: 'quote_confirmed', label: '2. 결제대기' },
  { id: 'payment_verified', label: '3. 결제확인' },
  { id: 'purchasing', label: '4. 구매진행' },
  { id: 'warehouse_in', label: '5. 창고입고' },
  { id: 'inspection_done', label: '6. 검수완료' },
  { id: 'shipping_ready', label: '7. 선적대기' },
  { id: 'customs_clearance', label: '8. 수입통관' },
  { id: 'domestic_shipping', label: '9. 국내배송' },
  { id: 'delivered', label: '10. 배송완료' },
];

const selectedTab = ref('all');
const searchQuery = ref('');
const dateFilter = ref('all');
const sortBy = ref('latest');
const selectedOrderIds = ref([]);

// 모달 & 슬라이드오버 상태
const isDetailDrawerOpen = ref(false);
const activeOrder = ref(null);
const isUploadModalOpen = ref(false);
const isParsing = ref(false);
const parsedPreviewItems = ref([]);
const fileInputRef = ref(null);

// ---------------------------------------------------------
// 기본 바이어 정보 (기본값 설정)
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
// 주문/발주 목데이터 초기화 (8대 상태별 현실적 데이터셋)
// ---------------------------------------------------------
const orders = ref([
  {
    id: 'ord-101',
    orderNumber: 'EUC-20260824-001',
    createdAt: '2026-08-24 09:30',
    status: 'quote_request',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '미니멀 무소음 탁상용 USB 충전식 선풍기 2000mAh',
        productUrl: 'https://detail.1688.com/offer/7123456789.html',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
        sku: '화이트 / 3단 조절',
        quantity: 200,
        priceCny: 18.5,
        cbm: 0.35,
      }
    ],
    costSummary: null,
  },
  {
    id: 'ord-102',
    orderNumber: 'EUC-20260823-014',
    createdAt: '2026-08-23 15:45',
    status: 'pending_payment',
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
    ],
    costSummary: null,
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
    ],
    costSummary: null,
  },
  {
    id: 'ord-104',
    orderNumber: 'EUC-20260821-003',
    createdAt: '2026-08-21 14:10',
    status: 'in_warehouse',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '자석 부착형 무선 센서 LED 계단등 간접조명',
        productUrl: 'https://detail.1688.com/offer/7567891234.html',
        imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=160&auto=format&fit=crop&q=80',
        sku: '웜화이트 3000K / 40cm',
        quantity: 300,
        priceCny: 8.9,
        cbm: 0.25,
      }
    ],
    costSummary: null,
  },
  {
    id: 'ord-105',
    orderNumber: 'EUC-20260820-022',
    createdAt: '2026-08-20 18:00',
    status: 'customs',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '차량용 맥세이프 고속 무선충전 송풍구 거치대 15W',
        productUrl: 'https://detail.1688.com/offer/7788991122.html',
        imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=160&auto=format&fit=crop&q=80',
        sku: '스페이스 그레이',
        quantity: 400,
        priceCny: 22.5,
        cbm: 0.45,
      }
    ],
    costSummary: null,
  },
  {
    id: 'ord-106',
    orderNumber: 'EUC-20260819-005',
    createdAt: '2026-08-19 10:15',
    status: 'domestic_delivery',
    buyerInfo: { ...defaultBuyerInfo },
    items: [
      {
        productName: '인체공학 메모리폼 경추 목베개 숙면 베개',
        productUrl: 'https://detail.1688.com/offer/7998877665.html',
        imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=160&auto=format&fit=crop&q=80',
        sku: '그레이 쿨링커버 포함',
        quantity: 150,
        priceCny: 28.0,
        cbm: 0.95,
      }
    ],
    costSummary: null,
  },
  {
    id: 'ord-107',
    orderNumber: 'EUC-20260815-001',
    createdAt: '2026-08-15 09:00',
    status: 'completed',
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
    ],
    costSummary: null,
  },
]);

// ---------------------------------------------------------
// 도착 원가 실시간 동기화 계산 함수
// ---------------------------------------------------------
function refreshCostSummaries() {
  orders.value.forEach((order) => {
    let totalCny = 0;
    let totalQty = 0;
    let totalCbm = 0;

    order.items.forEach((item) => {
      totalQty += item.quantity || 1;
      totalCny += (item.priceCny || 0) * (item.quantity || 1);
      totalCbm += item.cbm || 0.05;
    });

    const avgPriceCny = totalQty > 0 ? totalCny / totalQty : 0;
    const calcResult = calculateImportCost({
      productPriceCny: avgPriceCny,
      quantity: totalQty,
      exchangeRate: 195,
      cbm: Math.max(0.1, Number(totalCbm.toFixed(3))),
      shippingRatePerCbm: 85000,
      tariffRate: 0.08,
      vatRate: 0.10,
      agencyFeeRate: 0.05,
    });

    order.costSummary = calcResult.summary;
  });
}

onMounted(() => {
  refreshCostSummaries();
});

const filteredOrders = computed(() => {
  let list = [...orders.value];

  // 1. 탭 필터링
  if (selectedTab.value !== 'all') {
    list = list.filter((ord) => normalizeOrderStatus(ord.status) === selectedTab.value);
  }

  // 2. 검색어 필터링
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((ord) => {
      const matchOrderNo = ord.orderNumber.toLowerCase().includes(q);
      const matchBuyer = ord.buyerInfo?.companyName?.toLowerCase().includes(q) ||
                         ord.buyerInfo?.buyerName?.toLowerCase().includes(q);
      const matchItem = ord.items.some((it) =>
        it.productName?.toLowerCase().includes(q) ||
        it.sku?.toLowerCase().includes(q)
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
    list.sort((a, b) => (b.costSummary?.totalDdpKrw || 0) - (a.costSummary?.totalDdpKrw || 0));
  } else if (sortBy.value === 'priceLow') {
    list.sort((a, b) => (a.costSummary?.totalDdpKrw || 0) - (b.costSummary?.totalDdpKrw || 0));
  }

  return list;
});

function getTabCount(tabId) {
  if (tabId === 'all') return orders.value.length;
  return orders.value.filter((ord) => normalizeOrderStatus(ord.status) === tabId).length;
}

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

function getOrderTotalQuantity(order) {
  return order.items.reduce((acc, cur) => acc + (Number(cur.quantity) || 1), 0);
}

// ---------------------------------------------------------
// 상태별 레이블 및 뱃지 스타일 헬퍼
// ---------------------------------------------------------
function getStatusLabel(status) {
  return getOrderStatusShortLabel(status) || getOrderStatusLabel(status) || status;
}

function getStatusBadgeClass(status) {
  return getOrderStatusBadgeClass(status);
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60';
}

// ---------------------------------------------------------
// 상세 슬라이드오버 Drawer 동작
// ---------------------------------------------------------
function openOrderDetail(order) {
  activeOrder.value = order;
  isDetailDrawerOpen.value = true;
}

function closeOrderDetail() {
  isDetailDrawerOpen.value = false;
  activeOrder.value = null;
}

// ---------------------------------------------------------
// 엑셀 내보내기 연동 (exportQuoteToExcel)
// ---------------------------------------------------------
function handleExportSingleQuote(order) {
  if (!order) return;
  const quoteItems = order.items.map((it) => ({
    name: it.productName,
    url: it.productUrl,
    sku: it.sku,
    quantity: it.quantity,
    priceCny: it.priceCny,
    cbm: it.cbm || 0.05,
    remark: order.buyerInfo?.memo || '',
  }));

  exportQuoteToExcel(quoteItems, order.buyerInfo);
}

function handleExportAllQuotes() {
  const targetOrders = selectedOrderIds.value.length > 0
    ? orders.value.filter((o) => selectedOrderIds.value.includes(o.id))
    : filteredOrders.value;

  if (targetOrders.length === 0) return;

  const combinedItems = [];
  targetOrders.forEach((o) => {
    o.items.forEach((it) => {
      combinedItems.push({
        name: `[${o.orderNumber}] ${it.productName}`,
        url: it.productUrl,
        sku: it.sku,
        quantity: it.quantity,
        priceCny: it.priceCny,
        cbm: it.cbm || 0.05,
        remark: o.orderNumber,
      });
    });
  });

  exportQuoteToExcel(combinedItems, defaultBuyerInfo);
}

// ---------------------------------------------------------
// 엑셀 파서 및 대량 등록 모달 (parseOrderExcel)
// ---------------------------------------------------------
function openUploadModal() {
  parsedPreviewItems.value = [];
  isParsing.value = false;
  isUploadModalOpen.value = true;
}

function closeUploadModal() {
  isUploadModalOpen.value = false;
  parsedPreviewItems.value = [];
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  await processExcelFile(file);
}

async function handleFileDrop(event) {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  await processExcelFile(file);
}

async function processExcelFile(file) {
  isParsing.value = true;
  try {
    const parsedData = await parseOrderExcel(file);
    if (!parsedData || parsedData.length === 0) {
      alert('엑셀 파일에서 유효한 상품 데이터를 찾지 못했습니다. 서식을 확인해주세요.');
      return;
    }
    parsedPreviewItems.value = parsedData;
  } catch (err) {
    alert(err.message || '엑셀 파일 파싱 중 오류가 발생했습니다.');
  } finally {
    isParsing.value = false;
  }
}

function submitBulkOrder() {
  if (parsedPreviewItems.value.length === 0) return;

  const newOrderNumber = `EUC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(orders.value.length + 1).padStart(3, '0')}`;
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

  const newOrder = {
    id: `ord-${Date.now()}`,
    orderNumber: newOrderNumber,
    createdAt: nowStr,
    status: 'quote_request',
    buyerInfo: { ...defaultBuyerInfo },
    items: parsedPreviewItems.value.map((item) => ({
      productName: item.productName,
      productUrl: item.productUrl,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
      sku: item.sku || '기본 옵션',
      quantity: item.quantity || 1,
      priceCny: item.priceCny || 0,
      cbm: item.cbm || 0.1,
    })),
    costSummary: null,
  };

  orders.value.unshift(newOrder);
  refreshCostSummaries();
  closeUploadModal();
  selectedTab.value = 'quote_request';
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
