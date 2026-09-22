<template>
  <div class="space-y-6 pb-28">
    <!-- 재고 초과 안내 토스트 -->
    <Transition name="fade">
      <div
        v-if="stockLimitToast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 bg-gray-900 text-white text-sm font-bold rounded-2xl shadow-xl flex items-center gap-2 whitespace-nowrap pointer-events-none"
      >
        <span>⚠️</span>
        <span>{{ stockLimitToast }}</span>
      </div>
    </Transition>

    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 & 통계 요약 카드 4종 -->
    <!-- ======================================================== -->
    <div class="pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-xs font-black tracking-wide border border-amber-500/20">
            MY CART & SOURCING
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            장바구니 (발주 대기 품목)
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          1688 소싱몰에서 담은 상품의 옵션과 수량을 확인하고, 선택한 품목을 즉시 발주합니다.
        </p>
      </div>
    </div>

    <!-- 통계 요약 카드 4종 -->
    <div class="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr] gap-4">
      <!-- 1. 보관 품목수 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-gray-500">장바구니 담긴 품목</span>
          <div class="text-2xl font-extrabold text-gray-900 font-mono">
            {{ cartItems.length }} <span class="text-xs font-normal text-gray-500">종</span>
          </div>
          <p class="text-xs text-gray-400">총 {{ totalItemsQuantity }}개 대기중</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <ShoppingCart class="w-5 h-5" />
        </div>
      </div>

      <!-- 2. 선택된 품목수 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-amber-700">선택된 발주 품목</span>
          <div class="text-2xl font-extrabold text-amber-600 font-mono">
            {{ selectedItems.length }} <span class="text-xs font-normal text-gray-500">종</span>
          </div>
          <p class="text-xs text-amber-600/70">{{ selectedTotalQuantity }}개 선택됨</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <CheckSquare class="w-5 h-5" />
        </div>
      </div>

      <!-- 3. 실시간 적용 환율 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-blue-700">실시간 기준 환율</span>
          <div class="text-2xl font-extrabold text-blue-600 font-mono">
            ₩{{ exchangeRate.toFixed(2) }}
          </div>
          <p class="text-xs text-blue-600/70">1 RMB (위안화)</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Coins class="w-5 h-5" />
        </div>
      </div>

      <!-- 4. 선택 품목 예상 공급가 & 예상 총액 (넓은 카드) -->
      <div class="col-span-2 lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[140px]">

        <!-- 상단: 공급가 합계 (작게) -->
        <div>
          <div class="text-[12px] font-bold text-emerald-700 mb-0.5">선택 품목 공급가 합계</div>
          <div class="flex items-baseline gap-2">
            <span class="text-[26px] font-extrabold text-emerald-600 font-mono leading-none">₩{{ formatNumber(selectedTotalKrw) }}</span>
            <span class="text-[13px] text-emerald-500/80 font-mono">¥{{ selectedTotalCny.toFixed(2) }}</span>
          </div>
        </div>

        <!-- 선택된 품목이 있을 때만: 구분선 + 브레이크다운 + 총액 -->
        <div v-if="selectedItems.length > 0" class="mt-3 pt-2 border-t border-gray-100 space-y-1.5">

          <!-- 택배 한 줄 -->
          <div class="flex items-center gap-1.5 text-[12px] font-mono text-gray-500">
            <span class="text-gray-400">+</span>
            <span>택배</span>
            <b class="text-gray-800">₩{{ formatNumber(selectedEstimatedCost.chinaFreightKrw) }}</b>
            <span class="text-gray-400 text-[12px]">(¥{{ selectedEstimatedCost.chinaFreightRmb?.toFixed(2) }})</span>
            <span v-if="freightCalcState === 'loading'"
              class="px-1 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-600">계산중</span>
            <span v-else-if="selectedEstimatedCost.chinaFreightOrigin === '1688_seller'"
              class="px-1 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700">묶음실비</span>
            <span v-else-if="selectedEstimatedCost.chinaFreightOrigin === '1688_exact'"
              class="px-1 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-500">항목합산</span>
            <span v-else-if="selectedEstimatedCost.chinaFreightOrigin === 'estimated'"
              class="px-1 py-0.5 rounded text-[10px] font-black bg-gray-100 text-gray-400">추정치</span>
          </div>

          <!-- 수수료 한 줄 -->
          <div class="flex items-center gap-1.5 text-[12px] font-mono text-gray-500">
            <span class="text-gray-400">+</span>
            <span>수수료</span>
            <b class="text-gray-800">₩{{ formatNumber(selectedEstimatedCost.agencyFeeKrw) }}</b>
            <span class="text-gray-400 text-[12px]">(¥{{ selectedEstimatedCost.agencyFeeCny?.toFixed(2) }})</span>
          </div>

          <!-- 예상 총액 — 제일 크게 강조 -->
          <div class="pt-2 mt-1 border-t border-amber-100">
            <div class="text-[12px] font-bold text-amber-600 mb-0.5">예상 총액 <span class="text-gray-400 font-normal">(견적서 확정)</span></div>
            <div class="text-[16px] font-black text-amber-600 font-mono leading-none">
              ₩{{ formatNumber(selectedEstimatedCost.chargeableKrw) }}
            </div>
          </div>

          <!-- 추정치 포함 안내 — 실제 운임을 못 받았는데 총액에는 추정치가 들어간 상태 -->
          <div
            v-if="isFreightEstimated"
            class="mt-2 text-[11px] leading-snug text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5"
          >
            ⚠️ 1688에서 실제 운임을 받지 못해 위 택배비는 <b>수량 기반 추정치</b>입니다.
            실제 운임은 관리자 견적 단계에서 확정되며, 최종 견적서 금액은 달라질 수 있습니다.
          </div>

          <!-- 구간 단가 미확인 안내 -->
          <div
            v-if="hasTierUnknownSelected"
            class="mt-2 text-[11px] leading-snug text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5"
          >
            ⚠️ 수량별 구간 단가를 확인할 수 없는 품목이 있습니다.
            해당 품목의 <b>'옵션 변경/추가'</b>를 한 번 눌러 다시 선택하면 최신 단가로 맞춰집니다.
          </div>
        </div>

        <!-- 선택 없을 때 빈 상태 -->
        <div v-else class="mt-2 text-[12px] text-gray-400">품목을 선택하면 예상 총액이 표시됩니다</div>

      </div>
    </div>


    <!-- ======================================================== -->
    <!-- 2. 검색 및 컨트롤 툴바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="상품명, 옵션(SKU) 검색"
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs">
        <router-link
          to="/mall"
          class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95 animate-pulse shrink-0"
        >
          <Plus class="w-4 h-4 text-amber-400" />
          <span>1688 상품 추가 담기</span>
        </router-link>

        <button
          type="button"
          @click="openBulkExcel"
          class="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95 shrink-0"
          title="엑셀로 여러 상품을 한 번에 담습니다"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>엑셀 대량발주</span>
        </button>

        <button
          type="button"
          @click="exportCartExcel"
          :disabled="cartItems.length === 0"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>장바구니 엑셀 다운로드</span>
        </button>

        <button
          type="button"
          @click="deleteSelected"
          :disabled="selectedItemIds.length === 0"
          class="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-rose-50 text-gray-600 hover:text-rose-600 font-bold transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600 flex items-center gap-1.5 shrink-0"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>선택 품목 삭제</span>
        </button>

        <select
          v-model="sortBy"
          class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer shrink-0"
        >
          <option value="latest">최근 담은순</option>
          <option value="priceHigh">금액 높은순</option>
          <option value="priceLow">금액 낮은순</option>
          <option value="qtyHigh">수량 많은순</option>
        </select>
      </div>
    </div>

    <!-- 1688 최신 단가 반영 안내 (닫기 가능) — 내부 조회 수치는 노출하지 않는다 -->
    <div
      v-if="priceSyncChangedCount > 0 && !priceSyncNoticeClosed"
      class="flex items-center justify-between gap-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5"
    >
      <span>1688 최신 가격으로 {{ priceSyncChangedCount }}개 품목의 단가가 조정되었습니다.</span>
      <button
        type="button"
        @click="priceSyncNoticeClosed = true"
        class="shrink-0 text-amber-700 hover:text-amber-900 font-black px-1.5 leading-none"
        title="안내 닫기"
      >✕</button>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 장바구니 품목 — 판매자별 그룹 카드 -->
    <!-- ======================================================== -->

    <!-- 빈 상태 -->
    <div v-if="filteredItems.length === 0" class="bg-white border border-gray-200 rounded-2xl shadow-xs py-20 text-center text-gray-400 text-xs">
      <ShoppingCart class="w-12 h-12 mx-auto text-gray-300 mb-3" />
      <p class="text-sm font-bold text-gray-700">장바구니에 담긴 1688 소싱 품목이 없습니다.</p>
      <p class="text-xs text-gray-400 mt-1">1688 소싱몰에서 원하는 상품을 찾아 장바구니에 담아보세요.</p>
      <router-link
        to="/mall"
        class="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-sm active:scale-95"
      >
        <Plus class="w-4 h-4" />
        <span>1688 상품 소싱하러 가기</span>
      </router-link>
    </div>

    <!-- 판매자 그룹 카드 루프 -->
    <div
      v-for="group in sellerGroups"
      :key="group.groupKey"
      class="bg-white rounded-2xl p-5 mb-8 shadow-sm"
    >
      <!-- ── 카드 헤더 ── -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2.5">
          <input
            type="checkbox"
            :checked="isGroupSelected(group)"
            @change="toggleGroupSelect(group, $event)"
            class="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
          />
          <span class="text-sm font-black text-slate-800">🏬 {{ group.displayName }}</span>
          <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">{{ group.items.length }}개 품목</span>
        </div>
        <div class="text-right font-mono">
          <div class="text-xs text-gray-400">상품 소계</div>
          <div class="text-sm font-bold text-amber-600">₩{{ formatNumber(getGroupSubtotalKrw(group)) }}</div>
        </div>
      </div>

      <!-- ── 카드 바디: 품목 행 ── -->
      <div class="divide-y divide-slate-100">
        <div
          v-for="item in group.items"
          :key="item.id"
          class="py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <!-- 상품 정보 -->
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <img
              :src="item.imageUrl || item.thumbnail || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
              :alt="item.titleKo || item.productName"
              class="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0"
              @error="handleImgError"
            />
            <div class="space-y-1 flex-1 min-w-0">
              <div
                class="font-bold text-gray-900 text-xs line-clamp-2 leading-snug cursor-pointer hover:text-amber-700 hover:underline underline-offset-2 transition"
                @click="openProductDetail(item)"
                title="상세보기"
              >
                {{ item.titleKo || item.productName || item.titleZh }}
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-gray-400 font-mono">ID: <b class="text-gray-600">{{ item.itemId || item.id }}</b></span>
                <button
                  type="button"
                  @click="openOptionModal(item)"
                  :disabled="isOptionFetching && editingCartItemId === item.id"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition active:scale-95 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Loader2 v-if="isOptionFetching && editingCartItemId === item.id" class="w-3 h-3 animate-spin" />
                  <Settings2 v-else class="w-3 h-3" />
                  <span>{{ isOptionFetching && editingCartItemId === item.id ? '조회중...' : '옵션 변경/추가' }}</span>
                </button>
                <a
                  v-if="item.productUrl"
                  :href="item.productUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold transition active:scale-95 shadow-2xs"
                  title="1688 원본 상품 페이지 새 창 열기"
                  @click.stop
                >
                  <ExternalLink class="w-3 h-3" /><span>1688 원본 링크 ↗</span>
                </a>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-gray-700 font-medium text-xs max-w-[200px] truncate">
                  {{ getItemSkuText(item) }}
                </span>
                <!-- 1688에서 이 옵션이 사라진 경우 — 표시만, 단가는 담을 당시 값 그대로 둔다 -->
                <span
                  v-if="isSpecMissing(item)"
                  class="inline-block px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200 font-bold text-xs"
                  title="1688 상품에서 이 옵션이 더 이상 조회되지 않습니다. '옵션 변경/추가'로 현재 판매 중인 옵션을 다시 선택해 주세요."
                >옵션 확인 필요</span>
                <!-- 1688에서 상품 자체가 조회되지 않는 경우 — 표시만, 행은 그대로 둔다 -->
                <span
                  v-if="item.unavailableAt"
                  class="inline-block px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200 font-bold text-xs"
                  title="1688에서 이 상품이 더 이상 조회되지 않습니다(판매 종료 추정). 담을 당시 단가가 그대로 표시되며, 발주 전 담당 매니저에게 확인해 주세요."
                >1688 판매 종료 · 확인 불가</span>
              </div>
            </div>
          </div>

          <!-- 우측: 수량 + 단가 + 합계 + 삭제 -->
          <div class="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div class="flex flex-col items-center gap-0.5">
              <div class="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <button type="button" @click="decreaseQty(item)"
                  class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition font-bold cursor-pointer">-</button>
                <input
                  type="number"
                  min="1"
                  :max="(typeof item.stock === 'number' && !isNaN(item.stock)) ? item.stock : undefined"
                  :value="item.quantity"
                  @input="onQtyInput(item, $event)"
                  @change="onQtyInput(item, $event)"
                  class="w-14 h-8 text-center text-xs font-mono font-bold text-gray-900 border-x border-gray-200 outline-none focus:bg-amber-50/50"
                />
                <button type="button" @click="increaseQty(item)"
                  class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition font-bold cursor-pointer">+</button>
              </div>
              <!-- 수량 0인 행(예전 담기 경로에서 품절 옵션이 저장된 경우) — 발주도 차단된다 -->
              <div
                v-if="!hasValidQuantity(item)"
                class="text-xs font-bold text-red-600 whitespace-nowrap"
                title="수량이 0인 행입니다. 품절 옵션이 담겼을 수 있습니다. 수량을 다시 입력하거나 삭제해 주세요."
              >수량 확인 필요</div>
            </div>
            <div class="text-right font-mono w-24 shrink-0">
              <template v-if="hasValidPrice(item)">
                <div class="text-xs font-bold text-gray-900">¥{{ getItemUnitPriceCny(item).toFixed(2) }}</div>
                <div class="text-xs text-gray-400">₩{{ formatNumber(Math.round(getItemUnitPriceCny(item) * exchangeRate)) }}</div>
                <div
                  v-if="isTierUnknown(item)"
                  class="text-xs font-bold text-amber-600 whitespace-nowrap mt-0.5"
                  title="수량별 구간 단가 정보가 없어 담을 당시 단가를 그대로 쓰고 있습니다. '옵션 변경/추가'를 눌러 다시 선택하면 1688에서 최신 구간을 받아옵니다."
                >단가 확인 필요</div>
              </template>
              <div v-else class="text-xs font-bold text-red-600 whitespace-nowrap">가격 확인 필요</div>
            </div>
            <div class="text-right font-mono w-24 shrink-0">
              <template v-if="hasValidPrice(item)">
                <div class="text-sm font-bold text-amber-600">₩{{ formatNumber(getItemSubtotalKrw(item)) }}</div>
                <div class="text-xs text-gray-400">¥{{ getItemSubtotalCny(item).toFixed(2) }}</div>
              </template>
              <div v-else class="text-xs font-bold text-red-600">—</div>
            </div>
            <button
              type="button"
              @click="removeItem(item.id)"
              class="text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer active:scale-95 shrink-0"
              title="장바구니에서 삭제"
            >✕</button>
          </div>
        </div>
      </div>

      <!-- ── 카드 푸터 (관리자 주문 상세모달과 공용 컴포넌트) ── -->
      <SellerGroupTotalRow
        :subtotal-krw="getGroupSubtotalKrw(group)"
        :freight-rmb="sellerFreightMap[group.groupKey] ?? null"
        :exchange-rate="exchangeRate"
        :state="freightCalcState"
        unavailable-reason="1688에서 이 판매자의 실제 운임을 받지 못했습니다. 하단 예상 총액에는 수량 기반 추정치가 들어갑니다 — 실제 운임은 관리자 견적 단계에서 확정됩니다."
      />
    </div>





    <!-- ======================================================== -->
    <!-- 4. 옵션 변경/추가 소형 팝업 (색상 → 사이즈 2단계 선택) -->
    <!-- ======================================================== -->
    <div
      v-if="isOptionModalOpen && editingItem"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      @click.self="closeOptionModal"
    >
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs text-gray-700">
        <!-- 헤더 -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Settings2 class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900">상품 옵션 변경 및 색상/사이즈 선택</h3>
              <p class="text-xs text-gray-500 mt-0.5">1688 실시간 재고 기준 · 색상 선택 → 사이즈별 수량 설정</p>
            </div>
          </div>
          <button @click="closeOptionModal" class="text-gray-400 hover:text-gray-900 p-1.5 rounded-xl hover:bg-gray-100 transition">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 상품 미니 카드 -->
        <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-gray-200">
          <img
            :src="editingItem.imageUrl || editingItem.thumbnail"
            :alt="editingItem.titleKo"
            class="w-12 h-12 rounded-xl object-cover bg-white border border-gray-200 shrink-0"
            @error="handleImgError"
          />
          <div class="flex-1 min-w-0">
            <p class="font-bold text-gray-900 truncate">{{ editingItem.titleKo || editingItem.productName }}</p>
            <p class="text-xs text-gray-500 font-mono mt-0.5">
              기본 단가: <b>¥{{ getItemUnitPriceCny(editingItem).toFixed(2) }}</b>
              (약 ₩{{ formatNumber(Math.round(getItemUnitPriceCny(editingItem) * exchangeRate)) }}원)
            </p>
          </div>
        </div>

        <!-- 1단계: 색상 칩 선택 -->
        <div v-if="modalColors.length > 1" class="space-y-2">
          <div class="flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span class="font-bold text-gray-800 text-xs">① 색상 선택</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in modalColors"
              :key="c.color"
              type="button"
              @click="modalSelectedColor = c.color"
              :disabled="c.isSoldOut"
              class="px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95"
              :class="modalSelectedColor === c.color
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : c.isSoldOut
                  ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400 hover:bg-amber-50'"
            >
              {{ c.colorKo || c.color }}
              <span v-if="c.isSoldOut" class="ml-1 text-gray-400">(품절)</span>
            </button>
          </div>
        </div>

        <!-- 2단계: 선택된 색상의 사이즈별 stepper -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span class="font-bold text-gray-800 text-xs">
                {{ modalColors.length > 1 ? '② 사이즈별 발주 수량' : '발주 수량 설정' }}
              </span>
            </div>
            <span class="text-xs text-gray-400">수량 0 = 미선택</span>
          </div>

          <div class="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
            <div
              v-for="row in modalFilteredRows"
              :key="row.id"
              class="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              :class="{
                'bg-amber-50/40': row.quantity > 0,
                'opacity-40': row.stock !== Infinity && row.stock === 0,
              }"
            >
              <!-- 사이즈 + 재고 정보 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- 색상이 1개뿐이면 색상명 표시, 여러 색상이면 사이즈만 -->
                  <span class="font-bold text-gray-900 text-xs">
                    <template v-if="modalColors.length === 1">{{ row.colorKo || row.color }}</template>
                    <template v-if="row.size">{{ row.size }}</template>
                    <template v-if="modalColors.length === 1 && !row.size">기본 옵션</template>
                  </span>
                  <span v-if="row.isCurrent" class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-black">현재</span>
                  <span
                    v-if="row.stock !== Infinity && row.stock === 0"
                    class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[11px] font-bold"
                  >품절</span>
                  <span
                    v-else-if="row.stock !== Infinity"
                    class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[11px] font-bold"
                  >재고 {{ row.stock }}개</span>
                </div>
                <div class="text-xs text-gray-400 font-mono mt-0.5">
                  ¥{{ row.priceCny.toFixed(2) }} (₩{{ formatNumber(Math.round(row.priceCny * exchangeRate)) }}원)
                </div>
              </div>

              <!-- Stepper -->
              <div class="flex items-center gap-2 shrink-0">
                <div class="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <button
                    type="button"
                    @click="decreaseSkuQty(row)"
                    :disabled="row.stock !== Infinity && row.stock === 0"
                    class="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold disabled:opacity-30"
                  >-</button>
                  <input
                    type="number"
                    min="0"
                    :max="row.stock === Infinity ? undefined : row.stock"
                    :value="row.quantity"
                    :disabled="row.stock !== Infinity && row.stock === 0"
                    @change="clampSkuQty(row, $event.target.value); $event.target.value = row.quantity"
                    class="w-12 h-7 text-center text-xs font-mono font-bold text-gray-900 border-x border-gray-200 outline-none disabled:opacity-30"
                  />
                  <button
                    type="button"
                    @click="increaseSkuQty(row)"
                    :disabled="row.stock !== Infinity && row.stock === 0"
                    class="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold disabled:opacity-30"
                  >+</button>
                </div>
                <div class="w-20 text-right font-mono font-bold text-amber-600 text-xs">
                  ₩{{ formatNumber(Math.round((row.quantity || 0) * row.priceCny * exchangeRate)) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 전체 선택 합계 요약 -->
        <div class="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span class="text-gray-500 font-medium">설정된 총 발주 수량</span>
            <div class="font-bold text-gray-900 font-mono text-sm">총 {{ modalTotalQuantity }}개 ({{ modalSelectedSkuCount }}개 옵션)</div>
          </div>
          <div class="text-right">
            <span class="text-gray-500 font-medium">예상 합계 금액</span>
            <div class="text-base font-black text-amber-600 font-mono">₩{{ formatNumber(modalTotalKrw) }}원</div>
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            @click="closeOptionModal"
            class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition"
          >취소</button>
          <button
            type="button"
            @click="applyOptionChanges"
            :disabled="modalTotalQuantity === 0"
            class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black transition shadow-sm active:scale-95 cursor-pointer"
          >장바구니에 옵션 적용하기</button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4-2. 1688 수입 발주서 작성 & 통관/배송/VAS 설정 모달 (공통 컴포넌트) -->
    <!-- ======================================================== -->
    <OrderConfigModal
      :isOpen="isOrderConfigModalOpen"
      :items="selectedItems"
      :exchangeRate="exchangeRate"
      :sellerFreightRmb="sellerFreightRmb"
      :sellerFreightMap="sellerFreightMap"
      @close="isOrderConfigModalOpen = false"
      @submitted="handleOrderSubmitted"
    />

    <!-- ======================================================== -->
    <!-- 4-3. 상품 상세보기 모달 (MallView와 동일 컴포넌트 재사용) -->
    <!-- ======================================================== -->
    <ProductDetailModal
      :product="selectedDetailProduct"
      :exchange-rate="exchangeRate"
      @close="selectedDetailProduct = null"
      @change-product="selectedDetailProduct = $event"
      @added-to-cart="handleDetailModalAdded"
    />

    <!-- ======================================================== -->
    <!-- 4-4. 엑셀 대량발주 모달 (버튼을 눌렀을 때만 로드) -->
    <!-- ======================================================== -->
    <BulkExcelUploadModal
      v-if="isBulkExcelOpen"
      @close="isBulkExcelOpen = false"
      @added="handleBulkAdded"
    />


    <!-- ======================================================== -->
    <!-- 5. 하단 고정 종합 액션 바 (Sticky Bottom Action Bar) -->
    <!-- ======================================================== -->
    <div class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl py-4 px-5 transition">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- 좌측: 전체선택 및 일괄삭제 -->
        <div class="flex items-center gap-3 text-xs">
          <label class="inline-flex items-center gap-2 cursor-pointer select-none font-bold text-gray-700">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              class="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <span>전체선택 ({{ selectedItemIds.length }}/{{ filteredItems.length }})</span>
          </label>

          <span class="text-gray-300">|</span>

          <button
            type="button"
            @click="deleteSelected"
            :disabled="selectedItemIds.length === 0"
            class="text-gray-500 hover:text-rose-600 font-bold transition disabled:opacity-40 disabled:hover:text-gray-500 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>선택삭제</span>
          </button>
        </div>

        <!-- 우측: [3줄 텍스트] [예상총액] [버튼] 가로 배치 -->
        <div class="flex items-center justify-end gap-4">

          <!-- 3줄 텍스트 블록 -->
          <div class="text-right space-y-0.5 font-mono">

            <!-- 줄1: 선택 품목 수 -->
            <div class="text-[12px] text-gray-500 font-medium">
              선택 품목: <b class="text-gray-800">{{ selectedItems.length }}종</b>
              (총 <b class="text-gray-800">{{ selectedTotalQuantity }}개</b>)
            </div>

            <!-- 줄2: 상품대금 -->
            <div class="text-[14px] font-bold text-gray-800">
              상품대금 ₩{{ formatNumber(selectedTotalKrw) }}원
              <span class="text-xs text-gray-400 font-normal">(¥{{ selectedTotalCny.toFixed(2) }})</span>
            </div>

            <!-- 줄3: 택배 + 수수료 -->
            <div v-if="selectedItems.length > 0" class="text-[12px] text-gray-500">
              + 택배 <b class="text-gray-700">₩{{ formatNumber(selectedEstimatedCost.chinaFreightKrw) }}</b>
              <span class="text-gray-400">(¥{{ selectedEstimatedCost.chinaFreightRmb?.toFixed(2) }})</span>
              <span v-if="freightCalcState === 'loading'"
                class="ml-0.5 px-1 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-600">계산중</span>
              <span v-else-if="selectedEstimatedCost.chinaFreightOrigin === '1688_seller'"
                class="ml-0.5 px-1 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700">묶음실비</span>
              <span v-else-if="selectedEstimatedCost.chinaFreightOrigin === '1688_exact'"
                class="ml-0.5 px-1 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-500">항목합산</span>
              <span v-else-if="selectedEstimatedCost.chinaFreightOrigin === 'estimated'"
                class="ml-0.5 px-1 py-0.5 rounded text-[10px] font-black bg-gray-100 text-gray-500">추정치</span>
              + 수수료 <b class="text-gray-700">₩{{ formatNumber(selectedEstimatedCost.agencyFeeKrw) }}</b>
              <span class="text-gray-400">(¥{{ (selectedEstimatedCost.agencyFeeKrw / selectedEstimatedCost.exchangeRate).toFixed(2) }})</span>
            </div>
          </div>

          <!-- 예상 총액 (3줄 블록 오른쪽) -->
          <div v-if="selectedItems.length > 0" class="text-right font-mono shrink-0">
            <div class="text-xs font-bold text-amber-700">= 예상 총액</div>
            <div class="text-[20px] font-black text-amber-600 leading-tight">
              ₩{{ formatNumber(selectedEstimatedCost.chargeableKrw) }}원
            </div>
            <div class="text-[11px] text-gray-400">(견적서에서 확정)</div>
          </div>

          <!-- 발주 버튼 -->
          <button
            type="button"
            @click="openOrderModal"
            :disabled="selectedItemIds.length === 0"
            class="shrink-0 px-7 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-[15px] shadow-md transition flex items-center gap-2 active:scale-95 cursor-pointer whitespace-nowrap"
            :class="{ 'animate-pulse': selectedItemIds.length > 0 }"
          >
            <Send class="w-5 h-5" />
            <span>선택 상품 바로주문 (발주신청)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ConfirmSaveModal: 개별 품목 삭제 -->
    <ConfirmSaveModal
      v-model="confirmRemoveItem"
      title="해당 품목을 장바구니에서 삭제할까요?"
      variant="red"
      icon="warn"
      confirmText="삭제"
      @confirm="executeRemoveItem"
    />

    <!-- ConfirmSaveModal: 선택 품목 전체 삭제 -->
    <ConfirmSaveModal
      v-model="confirmDeleteSelected"
      :title="`선택한 ${selectedItemIds.length}개 품목을 장바구니에서 삭제할까요?`"
      variant="red"
      icon="warn"
      confirmText="삭제"
      @confirm="executeDeleteSelected"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { fetch1688ProductById, fetch1688FreightEstimateBatch, ZH_KO_COLOR_MAP } from '@/services/api1688';
import {
  ShoppingCart,
  CheckSquare,
  Coins,
  Calculator,
  Search,
  Plus,
  FileSpreadsheet,
  Trash2,
  Send,
  Settings2,
  Layers,
  X,
  FileText,
  Truck,
  Building2,
  User,
  ShieldCheck,
  PackageCheck,
  Sparkles,
  Loader2,
  ExternalLink
} from 'lucide-vue-next';
import { exportQuoteExcel } from '@/utils/excelExport';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredOrders, saveStoredOrders, saveNewOrder } from '@/utils/orderStorage';
import { currentUser, getCartStorageKey, isLoggedIn } from '@/lib/auth';
import { fetchSiteSettings, currentSettings } from '@/lib/settings';
import OrderConfigModal from '@/components/dashboard/OrderConfigModal.vue';
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue';
import ProductDetailModal from '@/components/ProductDetailModal.vue';
// 엑셀 대량발주 모달 — 버튼을 눌렀을 때만 내려받는다(xlsx·확인 표가 들어 있어 무겁다)
const BulkExcelUploadModal = defineAsyncComponent(() =>
  import('@/components/dashboard/BulkExcelUploadModal.vue')
);
import SellerGroupTotalRow from '@/components/shared/SellerGroupTotalRow.vue';
import { krwFromCny, calcCartTotal, calcCartEstimatedCost, resolveItemQty, normalizeQty } from '@/utils/orderCostCalculator';
import { getSellerGroupKey, getSellerDisplayName } from '@/utils/sellerGrouping';
import { sumQty, resolveMoq, offerGroupKey } from '@/utils/moq';
import { resolveTierUnitPrice, resolveGroupPricing, isSkuPricedSkus, buildCargoParamList } from '@/utils/priceTier';
import { resolveSkuImageUrl } from '@/utils/cartWriter';
// 장바구니 단가 재검증 전용 조회 — 엑셀 대량발주가 쓰는 서버 창구(/api/bulk-item-detail)를 그대로 쓴다.
// 새 경로를 만들지 않는 이유: 서버 product_cache(6시간)를 앞단에 두고 있어 1688 실호출이 가장 적다.
import { fetchProductsForBulk } from '@/services/bulkFetch';

const router = useRouter();
const exchangeRate = computed(() => Number(currentSettings.value?.exchange_rate) || 200.0);

const searchQuery = ref('');
const sortBy = ref('latest');
const selectedItemIds = ref([]);
const cartItems = ref([]);
const confirmRemoveItem = ref(false);
const pendingRemoveItemId = ref(null);
const confirmDeleteSelected = ref(false);

// 재고 초과 안내 토스트
const stockLimitToast = ref('');
let stockLimitToastTimer = null;
function showStockToast(msg) {
  stockLimitToast.value = msg;
  if (stockLimitToastTimer) clearTimeout(stockLimitToastTimer);
  stockLimitToastTimer = setTimeout(() => { stockLimitToast.value = ''; }, 3000);
}

// 옵션 변경 소형 팝업 상태
const isOptionModalOpen = ref(false);   // 팝업 표시 여부
const editingItem = ref(null);          // 팝업을 연 장바구니 행 (기본 정보 표시용)
const editingCartItemId = ref(null);    // 교체 대상 장바구니 행 id (handleEditModalCartAdded에서 사용)
const isOptionFetching = ref(false);    // 1688 API 조회 중
const modalSkuList = ref([]);           // 팝업에 표시할 SKU 행 목록 (color/size/stock/quantity)
const modalSelectedColor = ref('');     // 팝업 내 선택된 색상 (사이즈 필터링용)

// 발주 설정 모달 상태
const isOrderConfigModalOpen = ref(false);

// ── 엑셀 대량발주 모달 ──────────────────────────────────────
const isBulkExcelOpen = ref(false);
function openBulkExcel() { isBulkExcelOpen.value = true; }

/**
 * 엑셀로 담은 뒤 — 장바구니를 다시 읽고, 새로 생긴 줄만 체크한다.
 * ★ 기존에 고객이 체크를 푼 줄은 건드리지 않는다 (새 id만 추가).
 */
function handleBulkAdded(addedIds) {
  loadCartItems();
  if (!Array.isArray(addedIds) || addedIds.length === 0) return;
  // ★ 새로고침 후 "실제로 존재하는" id만 추가한다.
  //   기존 행에 수량이 병합된 경우 새 행이 생기지 않으므로 그 id는 장바구니에 없다.
  //   그대로 넣으면 "전체선택 (14/13)"처럼 개수가 실제 행 수를 넘는다.
  const liveIds = new Set(cartItems.value.map(it => it.id));
  const realNewIds = addedIds.filter(id => liveIds.has(id));
  if (realNewIds.length > 0) {
    selectedItemIds.value = [...new Set([...selectedItemIds.value, ...realNewIds])];
  }
}

// 상품 상세보기 모달 상태 (ProductDetailModal 재사용 — MallView.openProductModal 패턴)
const selectedDetailProduct = ref(null);

// 장바구니 행 클릭 시 상세보기 모달 오픈
// ★ 주의: 장바구니 행의 item.id는 ProductDetailModal이 fetch1688ProductById에 사용하는
//   1688 실제 상품 번호가 아니라 SKU 행 구분용 합성 키(`${itemId}_${color}_${size}_...`)임.
//   실제 1688 offer id는 itemId/num_iid에 보존되어 있으므로 id로 재매핑해서 넘긴다.
function openProductDetail(item) {
  if (!item) return;
  // 이 모달에서 새로 담은 줄을 자동 체크하기 위해 "열기 직전" 행 목록을 기억해 둔다.
  // (담기 시 ProductDetailModal이 euchs:cart-updated를 쏘면 loadCartItems가 먼저 돌아
  //  cartItems가 이미 갱신되므로, 담긴 뒤에 비교하면 새 줄을 구분할 수 없다)
  detailModalPrevIds = new Set(cartItems.value.map(it => it.id));
  selectedDetailProduct.value = {
    ...item,
    id: item.itemId || item.num_iid || item.id,
    price: item.priceCny ?? item.price,
  };
}

// openProductDetail이 기록해 두는 "모달 열기 직전" 장바구니 행 id
let detailModalPrevIds = new Set();

/**
 * 상세모달에서 장바구니에 담았을 때 — 새로 생긴 줄만 체크한다.
 * ★ 기존에 고객이 체크를 푼 줄은 건드리지 않는다 (새 id만 추가).
 *   담기 자체는 ProductDetailModal이 공용 코드(cartWriter)로 이미 끝냈고,
 *   loadCartItems도 euchs:cart-updated로 이미 돌아간 상태다. 여기서는 선택만 맞춘다.
 */
function handleDetailModalAdded() {
  const newIds = cartItems.value.map(it => it.id).filter(id => !detailModalPrevIds.has(id));
  if (newIds.length > 0) {
    const merged = new Set([...selectedItemIds.value, ...newIds]);
    selectedItemIds.value = [...merged];
  }
  detailModalPrevIds = new Set(cartItems.value.map(it => it.id));
}

// ─── seller 그룹 배치 운임 계산 ────────────────────────────────────────────────
// sellerFreightRmb: 배치 호출 성공 시 저장되는 전체 운임(CNY 합계). null=미계산/실패.
// sellerFreightMap: groupKey → 그룹별 개별 운임(CNY). 카드 푸터 표시용.
// freightCalcState: 'idle' | 'loading' | 'done' | 'error'
const sellerFreightRmb = ref(null);
const sellerFreightMap = ref({});
// 옵션 변경 팝업이 방금 받은 1688 응답의 가격 출처 판정 (SKU별 가격 상품 여부)
const optionModalIsSkuPriced = ref(false);
// 옵션 변경 팝업이 방금 받은 1688 응답의 수량 구간 테이블
const optionModalPriceTiers = ref([]);
const freightCalcState = ref('idle'); // 'idle' | 'loading' | 'done' | 'error'

/**
 * filteredItems를 sellerId 기준으로 그룹핑한 배열.
 * 등장 순서(seq)를 기록하여 getSellerDisplayName에서 "판매자 1, 2, ..."로 표시.
 */
const sellerGroups = computed(() => {
  const groupMap = new Map();
  let seq = 1;
  for (const item of filteredItems.value) {
    const key = getSellerGroupKey(item);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        displayName: getSellerDisplayName(item, seq++),
        items: [],
      });
    }
    groupMap.get(key).items.push(item);
  }
  return Array.from(groupMap.values());
});

/** 그룹 내 모든 품목이 selectedItemIds에 포함돼있는지 확인 */
function isGroupSelected(group) {
  return group.items.length > 0 && group.items.every(it => selectedItemIds.value.includes(it.id));
}

/** 그룹 체크박스 토글: 그룹 전체 추가 or 제거 */
function toggleGroupSelect(group, event) {
  const ids = group.items.map(it => it.id);
  if (event.target.checked) {
    const newIds = [...selectedItemIds.value];
    for (const id of ids) {
      if (!newIds.includes(id)) newIds.push(id);
    }
    selectedItemIds.value = newIds;
  } else {
    selectedItemIds.value = selectedItemIds.value.filter(id => !ids.includes(id));
  }
}

/** 그룹 상품 소계(KRW) — 표시 전용 */
function getGroupSubtotalKrw(group) {
  return group.items.reduce((acc, it) => acc + getItemSubtotalKrw(it), 0);
}

// ※ 그룹 합계(상품소계 + 판매자 배송비)는 SellerGroupTotalRow 공용 컴포넌트가 계산·표시한다.
//   (관리자 주문 상세모달과 같은 반올림을 쓰기 위해 한 곳으로 모음)



/**
 * 선택된 품목을 sellerId 기준으로 그룹핑하여 fetch1688FreightEstimateBatch를 그룹별 1회 호출.
 * 모든 그룹 성공 시 → sellerFreightRmb 확정 (calcCartEstimatedCost 2순위로 반영).
 * 일부 실패 시 → sellerFreightRmb = null (기존 item.freight 단순합산 또는 추정치 폴백).
 */
async function calcSellerBatchFreight() {
  const items = selectedItems.value;
  if (items.length === 0) {
    sellerFreightRmb.value = null;
    freightCalcState.value = 'idle';
    return;
  }

  freightCalcState.value = 'loading';
  sellerFreightRmb.value = null;

  try {
    // ── getSellerGroupKey 기준 그룹핑 (AdminOrderManageView.executeStartPurchasing과 동일 기준) ──
    const groupMap = new Map();
    for (const item of items) {
      const key = getSellerGroupKey(item);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(item);
    }
    const groups = Array.from(groupMap.entries()).map(([key, its]) => ({ groupKey: key, items: its }));

    console.group('[CartView] calcSellerBatchFreight — seller 그룹별 배치 운임 조회');
    console.log('그룹 수:', groups.length, '| 그룹:', groups.map(g => `${g.groupKey}(${g.items.length}종)`));

    // ── 그룹별 배치 호출 ──
    const results = await Promise.all(
      groups.map(async (g) => {
        // ★ 같은 offerId+specId는 수량을 합쳐 1건으로 보낸다.
        //   장바구니 행 병합 키가 번역된 표시 문자열(color/size)이라 같은 SKU가
        //   번역 차이로 별도 행이 되는 경우가 있다("M[5~8근 권장]" vs "M[建议5-8斤]").
        //   중복 specId를 그대로 보내면 createOrder.preview가 빈 결과를 반환한다.
        // ★ 수량 0(품절 옵션이 담겼던 행 등)은 운임 배치 요청에서 뺀다.
        //   priceTier.buildCargoParamList는 공용·수정 금지 파일이고 내부에서
        //   Math.max(1, ...)로 수량을 1개까지 올리므로, 걸러내지 않으면 0개인 행이
        //   1개로 운임에 반영된다. 판정은 buildCargoParamList가 쓰는 것과 같은
        //   resolveItemQty 기준으로 맞춘다.
        const freightItems = g.items.filter(it => resolveItemQty(it) > 0);
        const excludedZeroQty = g.items.length - freightItems.length;
        if (excludedZeroQty > 0) {
          console.warn(
            `  ↳ ${g.groupKey}: 수량 0인 행 ${excludedZeroQty}건을 운임 조회에서 제외합니다.`,
            g.items.filter(it => resolveItemQty(it) <= 0).map(i => ({ id: i.id, opt: i.optionName }))
          );
        }
        const { cargoList, mergedCount } = buildCargoParamList(freightItems, resolveItemQty);
        if (mergedCount > 0) {
          console.warn(
            `  ↳ ${g.groupKey}: 같은 SKU가 ${mergedCount}건 중복 저장돼 있어 수량을 합쳐 조회합니다 ` +
            `(장바구니 행 병합 키가 번역 문자열이라 생기는 현상)`, g.items.map(i => ({ specId: i.specId, opt: i.optionName }))
          );
        }
        // specId 없는 행 — 발주 시 400이 나는 행이므로 원인을 남긴다
        const noSpec = g.items.filter(it => !String(it.specId || '').trim());
        if (noSpec.length > 0) {
          console.error(
            `  ↳ ${g.groupKey}: specId 없는 행 ${noSpec.length}건 — 운임 조회에서 제외됩니다.`,
            noSpec.map(i => ({ id: i.id, num_iid: i.num_iid, opt: i.optionName }))
          );
        }
        if (cargoList.length === 0) {
          console.error(`  ↳ ${g.groupKey}: 유효한 specId가 하나도 없어 운임 조회 불가 → null`);
          return { groupKey: g.groupKey, freight: null };
        }
        const freight = await fetch1688FreightEstimateBatch(cargoList);
        console.log(`  ↳ ${g.groupKey}(${cargoList.length}종): ¥${freight}`);
        return { groupKey: g.groupKey, freight };
      })
    );

    console.log('배치 결과:', results);
    console.groupEnd();

    // ── sellerFreightMap 업데이트: 각 그룹의 freight 저장 ──
    const newMap = {};
    for (const r of results) {
      if (r.freight !== null && r.freight !== undefined) {
        newMap[r.groupKey] = Number(r.freight);
      }
    }
    sellerFreightMap.value = newMap;

    const allKnown = results.every(r => r.freight !== null && r.freight !== undefined);
    if (allKnown) {
      sellerFreightRmb.value = Number(results.reduce((s, r) => s + Number(r.freight), 0).toFixed(2));
      freightCalcState.value = 'done';
      console.log('[CartView] sellerFreightRmb 확정:', sellerFreightRmb.value, '¥');
    } else {
      // 일부 실패 → null 유지(폴백으로 흐름)
      sellerFreightRmb.value = null;
      freightCalcState.value = 'error';
      console.warn('[CartView] 배치 운임 일부 실패 → item.freight 폴백 또는 추정치 사용');
    }
  } catch (e) {
    console.error('[CartView] calcSellerBatchFreight 오류:', e);
    sellerFreightRmb.value = null;
    sellerFreightMap.value = {};
    freightCalcState.value = 'error';
  }
}




function getItemSkuText(item) {
  if (!item) return '기본 옵션';
  if (item.sku && typeof item.sku === 'string') {
    const cleaned = item.sku.replace(/\/\s*undefined/g, '').replace(/undefined\s*\//g, '').replace(/undefined/g, '').trim();
    if (cleaned) return cleaned;
  }
  if (item.selectedOption) return item.selectedOption;
  if (item.skus?.[0]) {
    const parts = [item.skus[0].color, item.skus[0].size].filter(p => p && p !== 'undefined');
    return parts.length ? parts.join(' / ') : '기본 옵션';
  }
  return '기본 옵션';
}

// ---------------------------------------------------------
// 데이터 로드 & 스토리지 동기화
// ---------------------------------------------------------
/**
 * skus 스냅샷이 행 수량과 어긋난 구 데이터를 바로잡는다.
 *
 * ★ 왜 필요한가: orderCostCalculator.resolveItemQty는 "skus 합계 > 0이면 그 값 우선" 규칙이다.
 *   cartWriter.mergeAndSaveCart가 병합 시 스냅샷을 안 고치던 시절에 저장된 행은
 *   quantity 260 / 스냅샷 60 처럼 어긋나 있고, 그러면 수수료·예상총액·운임·발주금액이
 *   병합 전 수량으로 계산된다. 화면에 보이는 quantity가 고객이 의도한 값이므로 거기에 맞춘다.
 *   (병합 로직 자체는 cartWriter에서 고쳤고, 이건 이미 저장된 행을 위한 자가 교정이다)
 *
 * 스냅샷이 1개일 때만 손댄다 — 장바구니 행은 SKU 1개 단위이고, syncSkuQty도 [0]만 다룬다.
 */
function healSkuSnapshot(it) {
  const skus = Array.isArray(it?.skus) ? it.skus : [];
  if (skus.length !== 1) return skus;

  const rowQty = parseInt(it?.quantity, 10);
  if (!Number.isFinite(rowQty) || rowQty < 1) return skus;   // 수량 자체가 무효면 건드리지 않는다

  const snapQty = Number(skus[0]?.quantity);
  if (snapQty === rowQty) return skus;

  console.warn(
    '[CartView] skus 스냅샷 수량이 행 수량과 달라 행 수량으로 맞춥니다 — ' +
    '이 값이 어긋나면 수수료·예상총액·운임이 잘못 계산됩니다.',
    { itemId: it?.itemId, num_iid: it?.num_iid, option: it?.optionName || it?.sku, rowQty, snapQty }
  );
  return [{ ...skus[0], quantity: rowQty }];
}

/**
 * 이미 저장돼 있는 "같은 SKU 중복 행"을 1행으로 합친다 (로드 시 자가 교정).
 *
 * ★ 왜 필요한가 (2026-09-22 실측):
 *   cartWriter.mergeAndSaveCart의 동일 판정이 옵션 "표시 이름"(color+size) 기준이던 시절,
 *   같은 SKU라도 번역 여부에 따라 별개 행으로 쌓였다.
 *     예) offer 804924697306 / specId 8fd3ed62…b67a
 *         → "红色小圈皮筋250g左右"(상세모달, 중국어) + "빨간색 작은 고리 고무줄 약 250g"(엑셀, 한국어)
 *   병합 로직 자체는 cartWriter에서 specId 우선으로 고쳤고, 이건 이미 저장된 행을 위한 교정이다.
 *
 * 규칙
 *   · 같은 offerId(num_iid) + 같은 specId 행이 2개 이상 → 먼저 담긴 행을 남기고 수량 합산
 *   · specId가 없는 행은 합치지 않는다 (SKU를 특정할 수 없으므로 이름으로 추측하지 않음)
 *   · 재고 상한 클램핑·skus 스냅샷 동기화는 mergeAndSaveCart와 같은 규칙
 *
 * @param {Array} rawRows - localStorage에서 읽은 원본 행 배열
 * @returns {{ rows: Array, merges: Array<{keptId:string, droppedId:string}> }}
 */
function dedupeRowsBySpecId(rawRows) {
  const out = [];
  const idxByKey = new Map();
  const merges = [];

  for (const r of rawRows) {
    const offerId = String(r?.num_iid || r?.itemId || '').trim();
    const specId = String(r?.specId || '').trim();
    if (!offerId || !specId) { out.push(r); continue; }

    const key = `${offerId}|${specId}`;
    const at = idxByKey.get(key);
    if (at === undefined) {
      idxByKey.set(key, out.length);
      out.push(r);
      continue;
    }

    // ── 먼저 담긴 행(keep)에 합친다 ──
    const keep = out[at];
    const mergedQty = (Number(keep.quantity) || 0) + (Number(r.quantity) || 0);
    const stock = typeof keep.stock === 'number' ? keep.stock
      : typeof r.stock === 'number' ? r.stock
        : Infinity;
    keep.quantity = stock === Infinity ? mergedQty : Math.min(stock, mergedQty);
    // skus 스냅샷도 같이 맞춘다 — 안 맞추면 resolveItemQty가 합산 전 수량을 우선해
    // 수수료·예상총액·운임이 과소 계산된다 (healSkuSnapshot과 같은 이유).
    if (Array.isArray(keep.skus) && keep.skus.length === 1) {
      keep.skus[0].quantity = keep.quantity;
    }
    merges.push({ keptId: keep.id, droppedId: r.id });
    console.log(
      `[CartView] 중복 행 병합: ${keep.titleKo || offerId} [${keep.optionName || keep.sku || ''}] ` +
      `+ [${r.optionName || r.sku || ''}] → 수량 ${keep.quantity}개 (specId ${specId})`
    );
  }

  return { rows: out, merges };
}

const loadCartItems = () => {
  // 비로그인 시 즉시 빈 배열 반환
  if (!isLoggedIn.value) {
    cartItems.value = [];
    selectedItemIds.value = [];
    return;
  }
  try {
    // ── 사용자 격리 키 (euchs_cart_{userId}) 로만 읽기 — 레거시 키 절대 참조 금지 ──
    const cartKey = getCartStorageKey();
    const raw = localStorage.getItem(cartKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 같은 SKU(offerId+specId) 중복 행 자가 교정 — skus 스냅샷 교정과 같은 자리에서 처리
        const { rows: deduped, merges } = dedupeRowsBySpecId(parsed);
        cartItems.value = deduped.map((it, idx) => {
          // ── 옵션 텍스트: color+size → optionName → sku 순으로 독립 추출 ──
          const colorStr = String(it.color || '').trim()
          const sizeStr = String(it.size || '').trim()
          const optionParts = [colorStr, sizeStr].filter(p => p && p !== '-' && p !== 'undefined')
          const resolvedOption = it.optionName ||
            (optionParts.length ? optionParts.join(' / ') : null) ||
            getItemSkuText(it)

          return {
            id: it.id || `cart-${idx}-${Date.now()}`,
            itemId: it.itemId || it.id || '1688-item',
            num_iid: it.num_iid || it.itemId || '',
            specId: it.specId || '',
            // ── 최소 주문 수량 — CartView 수량 하한으로 사용 (없으면 1) ──
            minOrder: Math.max(1, parseInt(it.minOrder || it.min_num || '1', 10) || 1),
            // ── 옵션 보유 여부 (담기 시점 기록) — 발주 가드에서 사용 ──
            //    구 장바구니 행에는 없으므로 undefined 그대로 보존한다 (기본값 채우기 금지)
            hasOptions: it.hasOptions,
            titleKo: it.titleKo || it.productName || it.titleZh || '1688 소싱 품목',
            titleZh: it.titleZh || '',
            imageUrl: it.imageUrl || it.thumbnail,
            // ── 단가: 저장값만 읽는다. 없으면 null (임의 숫자로 채우지 않음) ──
            //    기존 `|| 15` 폴백은 단가 0/누락을 ¥15로 조용히 바꿔 잘못된 금액을
            //    정상처럼 보이게 만들었다. null이면 아래 hasValidPrice가 false가 되어
            //    화면에 '가격 확인 필요'로 표시되고 견적신청이 차단된다.
            priceCny: parseUnitPriceCny(it.priceCny ?? it.price, it),
            // ── 가격 출처 스냅샷 (담을 때 기록) — 수량 변경 시 구간 단가 재계산용 ──
            isSkuPriced: it.isSkuPriced === true,
            priceTiers: Array.isArray(it.priceTiers) ? it.priceTiers : [],
            // ── 수량: 저장된 quantity만 정확히 읽기 (minOrder 폴백 절대 금지 — 뻥튀기 방지) ──
            //    ★ Math.max(1, ...) 제거: 수량 0인 행(품절 옵션이 재고 클램핑으로 0이 된 행 등)을
            //      조용히 1로 되살려 "담긴 적 없는 수량"을 정상처럼 보이게 만들었다.
            //      저장된 값을 그대로 읽고, 1 미만이면 아래 hasValidQuantity가 false가 되어
            //      화면에 '수량 확인 필요'로 표시되고 견적신청이 차단된다.
            //      (단가 누락을 parseUnitPriceCny로 처리하는 방식과 동일한 패턴)
            quantity: parseCartQuantity(it.quantity, it),
            // ── 옵션 독립 필드 (SKU별 1:1 바인딩, 절대 덮어씌우지 않음) ──
            color: colorStr,
            size: sizeStr,
            optionName: resolvedOption,
            sku: resolvedOption,
            // ── 재고 상한 필드 보존 (수량 조절 시 클램핑에 사용) ──
            stock: (typeof it.stock === 'number' && !isNaN(it.stock))
              ? it.stock
              : (it.stock !== undefined && it.stock !== null && it.stock !== '' && !isNaN(Number(it.stock)) ? Number(it.stock) : undefined),
            // 원본 데이터 보존 + skus 스냅샷 자가 교정
            //   병합 시 스냅샷을 안 맞추던 시절(~2026-09-22)에 저장된 행은
            //   quantity와 skus[0].quantity가 어긋나 있고, resolveItemQty가 스냅샷을
            //   우선하므로 수수료·예상총액·운임이 과소 계산된다.
            //   화면에 보이는 수량(quantity)이 고객이 의도한 값이므로 그쪽에 맞춘다.
            skus: healSkuSnapshot(it),
            detailUrl: it.detailUrl || '',
            productUrl: it.productUrl || it.detailUrl || '',
            company: it.company || '1688 공급처',
            // ── seller 정보 보존 ──
            sellerId: it.sellerId || it.memberId || it.shopId || '',
            sellerName: it.sellerName || it.company || '1688 공급처',
            // ── 중국 현지 운임 보존 (null=API 미제공, 0=包邮) ──
            // undefined/누락이면 null로 정규화하여 orderCostCalculator의 추정 폴백을 정확히 트리거
            freight: (it.freight !== undefined && it.freight !== null) ? Number(it.freight) : null,
            // ── 1688 최신 단가 재검증 시각 (없으면 아직 한 번도 검증 안 된 구 행) ──
            //    이 map에 없는 필드는 다음 저장 때 사라지므로 반드시 여기서 보존해야 한다.
            priceSyncedAt: it.priceSyncedAt || null,
            // ── 1688에서 상품을 찾을 수 없음이 확정된 시각 (판매 종료) ──
            //    기록되면 재검증 대상에서 빠지고 화면에 '판매 종료 · 확인 불가'로 표시된다.
            unavailableAt: it.unavailableAt || null,
            // ── 일시적 조회 실패 시각 — 재시도 간격 판정용 (표시하지 않음) ──
            priceCheckFailedAt: it.priceCheckFailedAt || null,
          };
        });
        // ★ 병합으로 사라진 행이 선택돼 있었으면 남은 행으로 선택을 옮긴다.
        //   (아래 유령 id 제거보다 먼저 — 안 그러면 고객이 체크해 둔 품목이 발주에서 조용히 빠진다)
        if (merges.length > 0 && selectedItemIds.value.length > 0) {
          for (const m of merges) {
            if (selectedItemIds.value.includes(m.droppedId) && !selectedItemIds.value.includes(m.keptId)) {
              selectedItemIds.value.push(m.keptId);
            }
          }
        }
        if (selectedItemIds.value.length === 0) {
          selectedItemIds.value = cartItems.value.map(it => it.id);
        } else {
          // ★ 유령 id 제거 — 삭제되거나 병합으로 사라진 id가 선택 목록에 남으면
          //   "전체선택 (14/13)"처럼 개수가 실제 행 수를 넘는다.
          const liveIds = new Set(cartItems.value.map(it => it.id));
          const cleaned = selectedItemIds.value.filter(id => liveIds.has(id));
          if (cleaned.length !== selectedItemIds.value.length) {
            selectedItemIds.value = cleaned;
          }
        }
        // 합쳐진 행이 있으면 즉시 저장 — 저장하지 않으면 새로고침할 때마다 다시 합친다.
        // (저장 → euchs:cart-updated → loadCartItems 재진입 시에는 중복이 없어 저장이 반복되지 않는다)
        if (merges.length > 0) {
          console.log(`[CartView] 중복 행 ${merges.length}건을 합쳐 저장합니다.`);
          saveCartToStorage();
        }
        // 가격 재검증 + 구 행 가격정보 백필 — 비동기, 화면은 먼저 뜬다.
        runCartHealTasks();
        // ※ sellerFreightRmb/freightCalcState는 여기서 리셋하지 않음.
        // watch(selectedItems)가 품목/수량 실제 변경을 감지해서 재계산하며,
        // loadCartItems가 호출될 때마다 리셋하면 storage 이벤트 루프로
        // 무한 재계산이 발생함 (2026-09-15 버그 수정).
        return;
      }
    }
    // 격리 키에 데이터 없으면 무조건 빈 배열 (레거시 키 절대 보지 않음)
    cartItems.value = [];
    selectedItemIds.value = [];
  } catch (e) {
    console.warn('Load cart items error:', e);
    cartItems.value = [];
    selectedItemIds.value = [];
  }
};

// ── 인스턴스 수명 플래그 ────────────────────────────────────────────────────
// 언마운트된 인스턴스의 비동기 작업(단가 재검증·백필)이 뒤늦게 끝나
// "자기가 들고 있던 옛 배열"을 저장해 버리는 것을 막는다.
let isInstanceActive = true;

// 내가 방금 저장해서 발사한 euchs:cart-updated는 다시 읽지 않는다.
// (읽어봐야 방금 쓴 값이고, 재진입하면 중복 병합·heal 작업이 한 번 더 돈다)
// CustomEvent 디스패치는 동기 실행이라 플래그를 즉시 내려도 안전하다.
let isSelfSaving = false;

function onCartUpdatedEvent() {
  if (isSelfSaving) return;
  loadCartItems();
}

const saveCartToStorage = () => {
  // ── 저장 직전 수량 구간 단가 동기화 ──
  //   수량 증감·행 삭제·옵션 변경 등 장바구니를 바꾸는 모든 경로가 이 함수를 거치므로
  //   여기 한 곳에서만 재계산하면 경로별 누락이 생기지 않는다.
  syncTierPrices();
  // ── 사용자 격리 키 (euchs_cart_{userId}) 로만 저장 ──
  const cartKey = getCartStorageKey();
  localStorage.setItem(cartKey, JSON.stringify(cartItems.value));
  // 뱃지 구독자들에게 최신 카운트 즉시 알림 (커스텀 이벤트만 — native storage는 dispatch 안 함)
  // ※ window.dispatchEvent(new Event('storage'))를 제거함:
  //    native storage 이벤트는 "다른 탭"에서만 발화해야 하는 것이 브라우저 설계.
  //    같은 탭에서 수동 dispatch하면 CartView의 loadCartItems가 재호출되어
  //    sellerFreightRmb 재계산 루프를 유발함 (2026-09-15 버그 수정).
  isSelfSaving = true;
  window.dispatchEvent(new CustomEvent('euchs:cart-updated', { detail: { count: cartItems.value.length } }));
  isSelfSaving = false;
};

// ---------------------------------------------------------
// 단가 및 합계 계산 헬퍼
// 반올림 정책: CNY 합계 → krwFromCny 1번. 품목별 소계는 표시 전용.
// ---------------------------------------------------------
/**
 * 저장된 단가를 숫자로 파싱. 유효하지 않으면 null + 원인 로그.
 * ★ 임의 기본값(과거 ¥15)으로 채우지 않는다 — 잘못된 금액이 정상처럼 보이게 만들기 때문.
 */
function parseUnitPriceCny(raw, item) {
  const p = Number(raw);
  if (Number.isFinite(p) && p > 0) return p;
  console.error(
    '[CartView] 장바구니 행에 유효한 단가(priceCny)가 없습니다 — 가격 확인 필요로 표시하고 발주를 차단합니다.',
    { itemId: item?.itemId, num_iid: item?.num_iid, option: item?.optionName || item?.sku, raw }
  );
  return null;
}

/**
 * 저장된 수량을 숫자로 파싱. 유효하지 않으면 0 + 원인 로그.
 * ★ 임의 기본값(과거 Math.max(1, ...))으로 올리지 않는다 — 담긴 적 없는 수량이
 *   정상처럼 보이게 만들기 때문. 0으로 두면 hasValidQuantity가 false가 되어
 *   화면에 '수량 확인 필요'로 표시되고 견적신청이 차단된다.
 *   (null이 아니라 0을 쓰는 이유: 소계·합계 계산이 전부 산술이라 null이 섞이면
 *    NaN이 화면 곳곳으로 퍼진다. 0은 산술적으로 안전하면서 판정에서 걸린다)
 */
function parseCartQuantity(raw, item) {
  const q = parseInt(raw, 10);
  if (Number.isFinite(q) && q >= 1) return q;
  console.error(
    '[CartView] 장바구니 행에 유효한 수량(quantity)이 없습니다 — 수량 확인 필요로 표시하고 발주를 차단합니다.',
    { itemId: item?.itemId, num_iid: item?.num_iid, option: item?.optionName || item?.sku, raw }
  );
  return 0;
}

/** 이 행이 금액 계산 가능한 단가를 갖고 있는지 */
function hasValidPrice(item) {
  const p = Number(item?.priceCny);
  return Number.isFinite(p) && p > 0;
}

/** 이 행이 발주 가능한 수량을 갖고 있는지 (1개 이상) */
function hasValidQuantity(item) {
  const q = Number(item?.quantity);
  return Number.isFinite(q) && q >= 1;
}

/**
 * 금액·합계 계산에 쓸 수량. 유효하지 않으면 0.
 * ★ `Number(item.quantity) || 1` 폴백을 쓰지 않는다 — 수량 0인 행이 1개로 계산되어
 *   행 금액·판매자 소계·상품대금에 담긴 적 없는 금액이 섞여 들어갔다. (CLAUDE.md 3-9)
 *   수량이 1 이상이면 반환값이 기존 `|| 1` 식과 완전히 동일하므로 정상 행의 금액은 변하지 않는다.
 */
function cartRowQty(item) {
  return normalizeQty(item?.quantity);
}

/** 단가 미확인 행이 선택돼 있는지 — 견적신청 차단 판정용 */
const hasPriceMissingSelected = computed(() =>
  selectedItems.value.some(it => !hasValidPrice(it))
);

function getItemUnitPriceCny(item) {
  return hasValidPrice(item) ? Number(item.priceCny) : 0;
}

function getItemSubtotalCny(item) {
  return getItemUnitPriceCny(item) * cartRowQty(item);
}

/** 품목별 소계(원화) — 정렬/개별 표시 전용. 합계는 반드시 selectedTotalKrw (CNY합산→1번환산) 사용 */
function getItemSubtotalKrw(item) {
  return krwFromCny(getItemSubtotalCny(item), exchangeRate.value);
}

function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR');
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60';
}

/**
 * 수량 구간 단가 재계산 — 같은 1688 상품(num_iid)의 옵션 합계 수량 기준.
 *
 * · 판정 기준은 MOQ와 동일(offerGroupKey + sumQty). 1688의 수량 구간도 MOQ와 마찬가지로
 *   offer 단위(混批 포함)이므로 옵션별이 아니라 합계로 판정해야 한다.
 * · SKU별 가격 상품(isSkuPriced=true)은 재계산하지 않고 각 줄의 SKU 가격을 유지한다.
 * · priceTiers가 저장되지 않은 구 장바구니 행은 재계산 대상이 아니다(담을 때 기록되기 시작함).
 *   1688 원본을 다시 부르지 않는다 — 일 500회 호출 제한 때문.
 */
/** 장바구니 행을 같은 1688 상품(num_iid)끼리 묶는다 — MOQ 판정과 같은 기준 */
function groupRowsByOffer(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = offerGroupKey(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return groups;
}

/**
 * 그룹별 가격 출처 판정 결과 — 화면 표시(단가 확인 필요)와 재계산이 같은 값을 본다.
 * { [offerGroupKey]: { skuPriced, tiers } }
 */
const offerPricingMap = computed(() => {
  const out = {};
  for (const [key, rows] of groupRowsByOffer(cartItems.value)) {
    out[key] = resolveGroupPricing(rows);
  }
  return out;
});

// ── 구 장바구니 행 가격정보 백필 상태 ──────────────────────────────────────
// num_iid → 'loading' | 'done' | 'failed'
// 이번 수정 이전에 담긴 행은 priceTiers/isSkuPriced가 없다. 경고부터 띄우면
// 기존 고객 장바구니 전체에 경고가 뜨므로, 먼저 상품 상세를 조회해 채운다.
const tierBackfillState = ref({});

/**
 * 이 행의 구간 단가를 신뢰할 수 없는 상태인지.
 * ★ 백필을 "시도해서 실패했을 때"만 true. 아직 조회 전/조회 중이면 경고하지 않는다.
 */
function isTierUnknown(item) {
  const p = offerPricingMap.value[offerGroupKey(item)];
  if (!p) return false;
  if (p.skuPriced || p.tiers !== null) return false;
  const numIid = String(item?.num_iid || item?.itemId || '').trim();
  return tierBackfillState.value[numIid] === 'failed';
}

/**
 * priceTiers/isSkuPriced가 없는 구 장바구니 행에 가격 출처 정보를 채운다.
 *
 * · 상품(num_iid) 단위로 1회만 조회한다 — 같은 상품이 여러 줄이어도 호출 1회.
 * · fetch1688ProductById는 메모리 + sessionStorage 2계층 캐시(TTL 30분)를 이미 쓰므로
 *   상세모달/옵션팝업에서 최근 본 상품은 API 호출이 0회다.
 * · 판정 분기는 ProductDetailModal.displayedPriceTiers와 동일하게 맞춘다.
 * · 실패한 상품만 'failed'로 표시해 화면에 '단가 확인 필요'가 뜬다.
 */
async function backfillMissingPriceTiers() {
  // 정보가 없는 그룹만 수집 (상품 단위 중복 제거)
  const targets = new Map();
  for (const [key, rows] of groupRowsByOffer(cartItems.value)) {
    const { skuPriced, tiers } = resolveGroupPricing(rows);
    if (skuPriced || tiers !== null) continue;
    const numIid = String(rows[0]?.num_iid || rows[0]?.itemId || '').trim();
    if (!numIid) continue;
    // 이미 조회했거나 진행 중이면 재시도하지 않는다 (storage 이벤트로 반복 호출되므로)
    if (tierBackfillState.value[numIid]) continue;
    targets.set(numIid, rows);
  }
  if (targets.size === 0) return;

  console.log(`[CartView] 구 장바구니 행 가격정보 백필 시작 — 상품 ${targets.size}종 (캐시 우선, 같은 상품은 1회만 조회)`);
  targets.forEach((_, numIid) => { tierBackfillState.value[numIid] = 'loading'; });

  await Promise.all([...targets].map(async ([numIid, rows]) => {
    try {
      const full = await fetch1688ProductById(numIid);
      if (!full) {
        tierBackfillState.value[numIid] = 'failed';
        console.error(`[CartView] 백필 실패 — 상품 상세를 불러오지 못했습니다: ${numIid}`);
        return;
      }

      // 1) SKU별 가격 상품 → 구간을 쓰지 않는다
      if (isSkuPricedSkus(full.skus)) {
        rows.forEach(r => { r.isSkuPriced = true; r.priceTiers = []; });
        tierBackfillState.value[numIid] = 'done';
        console.log(`[CartView] 백필: ${numIid} → SKU별 가격 상품 (구간 재계산 대상 아님)`);
        return;
      }

      // 2) 1688 수량 구간 테이블
      const tiers = (Array.isArray(full.priceTiers) ? full.priceTiers : [])
        .map(t => ({ minQuantity: Number(t.minQty ?? t.minQuantity ?? 1) || 1, price: Number(t.price) || 0 }))
        .filter(t => t.price > 0);

      if (tiers.length > 0) {
        rows.forEach(r => { r.isSkuPriced = false; r.priceTiers = tiers; });
        tierBackfillState.value[numIid] = 'done';
        console.log(`[CartView] 백필: ${numIid} → 수량 구간 ${tiers.length}개${tiers.length === 1 ? ' (고정가 — 경고 없음)' : ''}`);
        return;
      }

      // 3) 구간 정보가 없는 단일가 상품 → 대표가 1구간으로 확정
      //    (ProductDetailModal.displayedPriceTiers의 마지막 분기와 동일)
      const basePrice = Number(full.price);
      if (Number.isFinite(basePrice) && basePrice > 0) {
        const single = [{ minQuantity: resolveMoq(full.minOrder), price: basePrice }];
        rows.forEach(r => { r.isSkuPriced = false; r.priceTiers = single; });
        tierBackfillState.value[numIid] = 'done';
        console.log(`[CartView] 백필: ${numIid} → 구간 없는 단일가 ¥${basePrice} (경고 없음)`);
        return;
      }

      tierBackfillState.value[numIid] = 'failed';
      console.error(`[CartView] 백필 실패 — 구간·대표가 모두 없음: ${numIid}`, full);
    } catch (err) {
      tierBackfillState.value[numIid] = 'failed';
      console.error(`[CartView] 백필 실패 — 조회 오류: ${numIid}`, err);
    }
  }));

  const done = Object.values(tierBackfillState.value).filter(v => v === 'done').length;
  const failed = Object.values(tierBackfillState.value).filter(v => v === 'failed').length;
  console.log(`[CartView] 백필 완료 — 성공 ${done}종 / 실패 ${failed}종 → 구간 단가 재계산 및 저장`);

  // 채워진 정보로 즉시 재계산 후 저장 (saveCartToStorage가 syncTierPrices를 호출)
  // ★ 화면을 떠난 뒤 조회가 끝났다면 저장하지 않는다 — 이 인스턴스가 들고 있는
  //   옛 배열로 현재 장바구니를 덮어쓰게 된다.
  if (!isInstanceActive) {
    console.warn('[CartView] 백필 결과 저장 생략 — 이미 화면을 떠난 상태입니다(옛 배열 덮어쓰기 방지).');
    return;
  }
  saveCartToStorage();
}

// ── 장바구니 단가 1회 재검증 ────────────────────────────────────────────────
// 2026-09-21 가격 버그(180221c) 이전에 담긴 행은 단가가 틀린 채 남아 있다.
// (실측: offer 804924697306 — 1688 원본 7.4/7.4/14.8 인데 세 행 모두 14.8로 저장)
// 화면·DB끼리만 맞추면 알 수 없는 값이므로 1688 원본과 한 번 대조한다.
/** 단가가 조정된 행 수 — 0이면 안내를 띄우지 않는다 */
const priceSyncChangedCount = ref(0);
const priceSyncNoticeClosed = ref(false);
/** 1688에서 옵션(specId)이 사라진 행 id — 표시 전용(발주 차단 아님) */
const missingSpecRowIds = ref([]);

// 세션당 1회만 실행. 실패한 상품은 priceSyncedAt을 남기지 않으므로 다음 로드(F5) 때 다시 시도한다.
let priceRevalidateStarted = false;
let priceRevalidatePromise = null;

function revalidateCartPricesOnce() {
  if (!priceRevalidateStarted) {
    priceRevalidateStarted = true;
    priceRevalidatePromise = revalidateCartPrices();
  }
  return priceRevalidatePromise || Promise.resolve();
}

/**
 * 로드 뒤 비동기 보정 — 순서를 고정한다(재검증 → 백필).
 *
 * ★ 순서가 중요한 이유: 재검증이 받아온 상품은 api1688.js의 상품 캐시(30분)에 그대로 들어간다.
 *   그래서 백필이 같은 상품을 다시 부르지 않는다. 반대로 두면 같은 상품을
 *   /api/bulk-item-detail과 /api/1688-item-detail 두 경로로 각각 조회해
 *   1688 일일 호출 한도를 두 배로 쓴다.
 */
let healTasksRunning = false;

async function runCartHealTasks() {
  // 같은 로드 흐름에서 겹쳐 돌지 않게 한다 (로드는 여러 번 불릴 수 있다).
  // 엑셀 담기·옵션 변경 뒤 재로드에서는 이 플래그가 이미 풀려 있어 정상적으로 다시 돈다.
  if (healTasksRunning) return;
  healTasksRunning = true;
  try {
    await revalidateCartPricesOnce();
  } catch (e) {
    // 삼키지 않고 원인을 남긴다 — 재검증이 실패해도 백필은 계속해야 한다.
    console.error('[CartView] 단가 재검증 중 오류:', e);
  } finally {
    healTasksRunning = false;
  }
  if (!isInstanceActive) return;
  backfillMissingPriceTiers();
}

/**
 * 장바구니 행의 단가를 1688 원본과 한 번 대조해 맞춘다.
 *
 * · 대상: priceSyncedAt이 없는 행 (즉 이번 수정 이전에 담긴 행 전부, 1회만)
 * · 조회: 엑셀 대량발주와 같은 창구(fetchProductsForBulk → /api/bulk-item-detail).
 *   서버 캐시(6시간) 적중분은 1688 실호출이 아니며, 번역도 캐시만 본다(파파고 신규 호출 0).
 * · 단가 계산식은 새로 만들지 않는다 — 신규 행을 만들 때와 같은 함수·같은 식
 *   (isSkuPricedSkus + resolveTierUnitPrice, BulkExcelUploadModal.recompute와 동일)
 * · 조회 실패/한도 초과 → 아무 값도 바꾸지 않고 priceSyncedAt도 남기지 않는다(다음 로드 때 재시도).
 */
/**
 * 재검증 실패 코드 분류 — "확정 상품 없음"과 "일시적 오류"를 가른다.
 *
 * 근거 (코드 실물):
 *   · not_found : api/bulk-item-detail.js isRealProduct() 탈락분.
 *     없는 상품을 조회하면 OneBound가 error_code 2000(item-not-found)과 함께
 *     스텁 item을 내려보내는 것을 걸러낸 코드다(같은 파일 108~118행 주석).
 *     → 1688에 상품이 없음(판매 종료)으로 확정 취급.
 *   · 4013     : api/1688-item-detail.js 25·39·136행 — 接口已到期(OneBound 세션 만료·조회 불가).
 *     게다가 136행은 "응답 자체가 없을 때"(타임아웃·네트워크)의 기본값으로도 4013을 쓴다.
 *     상품 상태와 무관한 계정/통신 문제이므로 일시적으로 본다.
 *   · 그 외(limit / network / fetch_failed / parse_failed / no_result / unknown / 기타 숫자 코드)
 *     → 판단이 애매하면 전부 일시적 쪽으로 (확정 표시는 되돌리기 어려우므로 보수적으로).
 */
function isConfirmedNotFound(failure) {
  return failure?.status === 'error' && failure?.code === 'not_found';
}

// 일시 실패 상품 재시도 간격 — 서버 error 캐시(30분)보다 충분히 길게 잡아
// 같은 실패를 로드마다 다시 묻지 않는다.
const PRICE_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** 일시 실패 기록이 아직 유효한지(=재시도하지 않을 기간인지) */
function isRecheckSuppressed(row) {
  const t = Date.parse(row?.priceCheckFailedAt || '');
  return Number.isFinite(t) && (Date.now() - t) < PRICE_RECHECK_INTERVAL_MS;
}

async function revalidateCartPrices() {
  const pending = cartItems.value.filter(it => {
    if (it.priceSyncedAt) return false;
    // 1688에서 사라진 것이 확정된 상품 — 더 묻지 않는다
    if (it.unavailableAt) return false;
    // 일시 실패 후 재시도 간격이 아직 안 지난 행
    if (isRecheckSuppressed(it)) return false;
    return true;
  });
  if (pending.length === 0) return;

  // specId가 없으면 어느 SKU인지 특정할 수 없다 — 이름으로 추측하지 않고 건너뛴다.
  const targets = pending.filter(it =>
    String(it.specId || '').trim() && String(it.num_iid || '').trim()
  );
  if (targets.length < pending.length) {
    console.warn(
      `[CartView] 단가 재검증 제외 ${pending.length - targets.length}줄 — specId 또는 상품ID가 없어 SKU를 특정할 수 없습니다. ` +
      `해당 행은 '옵션 변경/추가'로 옵션을 다시 고르면 채워집니다.`
    );
  }
  if (targets.length === 0) return;

  const offerIds = [...new Set(targets.map(it => String(it.num_iid).trim()))];
  console.log(`[CartView] 장바구니 단가 재검증 시작 — 상품 ${offerIds.length}종 / ${targets.length}줄 (서버 캐시 우선)`);

  const res = await fetchProductsForBulk(offerIds);
  if (!res.ok) {
    console.warn(
      `[CartView] 단가 재검증 중단(${res.reason}) — 아무 값도 바꾸지 않았습니다. 다음 로드 때 다시 시도합니다.`
    );
    return;
  }
  const syncedAt = new Date().toISOString();
  const missing = [];
  let changed = 0;
  let synced = 0;
  let stamped = 0;   // unavailableAt / priceCheckFailedAt를 기록한 행 수

  // ── 조회 실패 상품 처리 — 확정(판매 종료)과 일시적 오류를 갈라 기록 ──
  for (const [id, f] of Object.entries(res.failures || {})) {
    const rowsOfOffer = cartItems.value.filter(r => String(r.num_iid || '').trim() === id);
    if (isConfirmedNotFound(f)) {
      console.warn(
        `[CartView] 1688에서 상품을 찾을 수 없습니다 — ${id}. ` +
        `단가는 그대로 두고 '판매 종료 · 확인 불가'로 표시합니다(재검증 대상에서 제외).`
      );
      for (const r of rowsOfOffer) {
        if (r.unavailableAt) continue;
        r.unavailableAt = syncedAt;
        stamped++;
      }
    } else {
      console.warn(
        `[CartView] 단가 재검증 일시 실패 — ${id} (${f.status}${f.code ? '/' + f.code : ''}). ` +
        `값은 그대로 두고 일정 시간 뒤 다시 시도합니다.`
      );
      for (const r of rowsOfOffer) {
        r.priceCheckFailedAt = syncedAt;
        stamped++;
      }
    }
  }

  for (const offerId of offerIds) {
    const product = res.products?.[offerId];
    if (!product) continue;   // 실패분 — 위에서 이미 경고했고 값은 건드리지 않는다

    const skus = Array.isArray(product.skus) ? product.skus : [];
    // ── 신규 행 생성과 완전히 같은 판정·같은 식 ──
    const skuPriced = isSkuPricedSkus(skus);
    const tiers = (Array.isArray(product.priceTiers) ? product.priceTiers : [])
      .map(t => ({ minQuantity: Number(t.minQty ?? t.minQuantity ?? 1) || 1, price: Number(t.price) || 0 }))
      .filter(t => t.price > 0);
    // 구간 단가는 같은 상품 합계 수량 기준 (syncTierPrices·엑셀 확인표와 같은 규칙)
    const offerRows = cartItems.value.filter(r => String(r.num_iid || '').trim() === offerId);
    const tierPrice = skuPriced ? null : resolveTierUnitPrice(tiers, sumQty(offerRows));

    for (const row of offerRows) {
      if (row.priceSyncedAt) continue;
      const specId = String(row.specId || '').trim();
      if (!specId) continue;

      const sku = skus.find(s => String(s.specId || '').trim() === specId);
      if (!sku) {
        // 판매자가 옵션을 지운 경우 — 가격은 건드리지 않고 표시만 한다(priceSyncedAt 기록 안 함).
        missing.push(row.id);
        console.warn(
          `[CartView] 1688에서 사라진 옵션 — 단가를 건드리지 않고 '옵션 확인 필요'로 표시합니다.`,
          { offerId, specId, option: row.optionName || row.sku, priceCny: row.priceCny }
        );
        continue;
      }

      const skuPrice = Number(sku.price) || 0;
      const unit = skuPriced ? skuPrice : (tierPrice ?? skuPrice);
      if (!(unit > 0)) {
        console.error(
          `[CartView] 재검증 단가가 0이거나 숫자가 아닙니다 — 임의 값으로 채우지 않고 기존 값을 그대로 둡니다.`,
          { offerId, specId, option: row.optionName || row.sku, skuPrice, tierPrice }
        );
        continue;
      }

      // ★ 가격 출처 스냅샷은 단가가 같아도 항상 최신으로 갱신한다.
      //   이 값이 틀린 채 남으면 저장할 때마다 syncTierPrices가 방금 맞춘 단가를 다시 틀리게 만든다
      //   (SKU별 가격 상품인데 isSkuPriced=false로 남아 구간 단가로 덮어쓰는 경우).
      row.isSkuPriced = skuPriced;
      row.priceTiers = skuPriced ? [] : tiers.map(t => ({ minQuantity: t.minQuantity, price: t.price }));

      const before = Number(row.priceCny);
      if (!(Math.abs(unit - before) <= 0.001)) {
        console.log(
          `[CartView] 1688 최신 단가로 조정: ${row.titleKo || offerId} [${row.optionName || ''}] ` +
          `${Number.isFinite(before) ? '¥' + before.toFixed(2) : '(단가 없음)'} → ¥${unit.toFixed(2)}`
        );
        row.priceCny = unit;
        row.price = unit;
        changed++;
      }
      row.priceSyncedAt = syncedAt;
      // 지난번 일시 실패 기록은 더 이상 의미가 없다
      if (row.priceCheckFailedAt) row.priceCheckFailedAt = null;
      synced++;
    }
  }

  missingSpecRowIds.value = missing;

  if (synced > 0 || missing.length > 0 || stamped > 0) {
    console.log(
      `[CartView] 단가 재검증 완료 — 확인 ${synced}줄 / 조정 ${changed}줄 / ` +
      `옵션 사라짐 ${missing.length}줄 / 조회 실패 표시 ${stamped}줄`
    );
  }
  if (changed > 0) {
    priceSyncChangedCount.value = changed;
    priceSyncNoticeClosed.value = false;
  }
  if (synced > 0 || stamped > 0) {
    // ★ 화면을 떠난 뒤 조회가 끝났다면 저장하지 않는다 (옛 배열 덮어쓰기 방지)
    if (!isInstanceActive) {
      console.warn('[CartView] 단가 재검증 결과 저장 생략 — 이미 화면을 떠난 상태입니다.');
      return;
    }
    saveCartToStorage();
  }
}

/** 이 행의 옵션이 1688에서 사라졌는지 — 표시 전용 */
function isSpecMissing(item) {
  return missingSpecRowIds.value.includes(item?.id);
}

/** 구간 단가 미확인 행이 선택돼 있는지 — 안내 배너용 */
const hasTierUnknownSelected = computed(() =>
  selectedItems.value.some(it => isTierUnknown(it))
);

/**
 * 하단 예상 총액의 택배비가 실측이 아닌 추정치인지 — 안내 배너용.
 * calcOrderCost의 chinaFreightOrigin이 유일한 판정 출처다(화면에서 따로 계산하지 않음).
 */
const isFreightEstimated = computed(() =>
  selectedItems.value.length > 0 &&
  selectedEstimatedCost.value?.chinaFreightOrigin === 'estimated'
);

/**
 * 수량 구간 단가 재계산 — 같은 1688 상품(num_iid)의 옵션 합계 수량 기준.
 *
 * ★ 그룹 단위로 계산한다. 행 단위로 하면 같은 상품인데도 담긴 시점에 따라
 *   priceTiers를 가진 행만 갱신되어 줄마다 단가가 달라진다(2026-09-21 실측 버그).
 *   구간 테이블은 offer 단위 값이므로 그룹 대표 테이블을 모든 행에 적용하고,
 *   테이블이 없던 행에는 전파 저장해 다음 계산부터 안정적으로 동작하게 한다.
 *
 * · 판정 기준은 MOQ와 동일(offerGroupKey + sumQty). 1688의 수량 구간도 MOQ와 마찬가지로
 *   offer 단위(混批 포함)이므로 옵션별이 아니라 합계로 판정해야 한다.
 * · SKU별 가격 상품은 재계산하지 않고 각 줄의 SKU 가격을 유지한다.
 * · 그룹 전체가 구간 정보를 모르면 조용히 넘어가지 않고 console.error로 남긴다
 *   (화면에는 isTierUnknown이 '단가 확인 필요'로 표시).
 */
function syncTierPrices() {
  for (const [key, rows] of groupRowsByOffer(cartItems.value)) {
    const { skuPriced, tiers } = resolveGroupPricing(rows);

    // SKU별 가격 상품 → 각 줄이 자기 SKU 가격 유지 (재계산 금지)
    if (skuPriced) continue;

    if (tiers === null) {
      console.error(
        `[CartView] 수량 구간 정보를 알 수 없어 단가를 재계산하지 못했습니다 — '단가 확인 필요'로 표시합니다. ` +
        `(${key}, ${rows.length}줄) 해당 상품의 '옵션 변경/추가'를 한 번 거치면 1688에서 구간을 다시 받아 채웁니다.`,
        rows.map(r => ({ id: r.id, option: r.optionName, priceCny: r.priceCny }))
      );
      continue;
    }

    // 구간이 1개뿐이면 수량에 따라 바뀌지 않는다 → 기존 단가 유지
    if (tiers.length <= 1) continue;

    const offerQty = sumQty(rows);
    const next = resolveTierUnitPrice(tiers, offerQty);
    if (next === null) continue;

    for (const r of rows) {
      // 구간 테이블 전파 — 담을 당시 저장되지 않았던 행도 다음부터는 스스로 판정 가능
      if (!Array.isArray(r.priceTiers) || r.priceTiers.length < tiers.length) {
        r.priceTiers = tiers.map(t => ({ minQuantity: t.minQuantity, price: t.price }));
      }
      if (Math.abs(next - Number(r.priceCny)) > 0.001) {
        console.log(
          `[CartView] 수량 구간 단가 재계산: ${r.titleKo || r.num_iid} [${r.optionName || ''}] ` +
          `합계 ${offerQty}개 → ¥${Number(r.priceCny).toFixed(2)} → ¥${next.toFixed(2)}`
        );
        r.priceCny = next;
        r.price = next;
      }
    }
  }
}

// 수량 변경 시 item.skus[0].quantity도 동기화하는 헬퍼
// (단일 SKU 행: skus.length===1 인 경우에만 — 다중 SKU 행은 옵션팝업으로만 편집)
function syncSkuQty(item) {
  if (Array.isArray(item.skus) && item.skus.length === 1) {
    item.skus[0].quantity = item.quantity;
  }
}

function increaseQty(item) {
  const rawStock = item.stock;
  const stock = (typeof rawStock === 'number' && !isNaN(rawStock))
    ? rawStock
    : (rawStock !== undefined && rawStock !== null && rawStock !== '' && !isNaN(Number(rawStock)) ? Number(rawStock) : Infinity);
  
  // 수량 0(품절 옵션이 담겼던 행 등)에서 +를 누르면 1이 되어야 한다.
  // 기존 `|| 1`은 0을 1로 읽어 next가 2로 건너뛰었다.
  const current = cartRowQty(item);
  const next = current + 1;
  if (stock !== Infinity && next > stock) {
    showStockToast(`재고는 최대 ${stock}개까지만 담을 수 있습니다.`);
    item.quantity = stock;
    syncSkuQty(item);
    saveCartToStorage();
    return;
  }
  item.quantity = next;
  syncSkuQty(item);
  saveCartToStorage();
}

function decreaseQty(item) {
  const mo = resolveMoq(item.minOrder);
  // MOQ 하한 규칙은 기존 그대로다. 수량 0 행은 아래 `current <= 1` 분기로 떨어져
  // "1개 미만으로는 줄일 수 없습니다" 안내를 받는다(기존 `|| 1`일 때와 동일한 결과).
  const current = cartRowQty(item);
  // 같은 1688 상품(num_iid)의 전체 행 합계가 MOQ 미만이 되면 차단 (행 개별 기준 아님)
  const key = offerGroupKey(item);
  const offerTotalAfter = sumQty(cartItems.value.filter(r => offerGroupKey(r) === key)) - 1;
  if (current > 1 && offerTotalAfter >= mo) {
    item.quantity = current - 1;
    syncSkuQty(item);
    saveCartToStorage();
  } else if (current <= 1) {
    // 이미 1개인 행 — MOQ와 무관하게 더 줄일 수 없는 상태다.
    // 합계가 MOQ를 충족하고 있어도 MOQ 토스트를 띄우면 원인을 오해하게 되므로 분리한다.
    showStockToast('1개 미만으로는 줄일 수 없습니다. 삭제하려면 ✕ 버튼을 눌러주세요.');
  } else if (mo > 1) {
    // 2개 이상이지만 줄이면 같은 상품 합계가 MOQ 미만이 되는 경우
    showStockToast(`이 상품의 최소 주문 수량은 ${mo}개입니다 (옵션 합계 기준).`);
  }
}

function onQtyInput(item, e) {
  const mo = resolveMoq(item.minOrder);
  const val = parseInt(e.target.value, 10);
  // 같은 상품 합계 기준으로 판정 — 이 행을 val로 바꿨을 때의 offer 합계
  const key = offerGroupKey(item);
  const othersQty = sumQty(cartItems.value.filter(r => offerGroupKey(r) === key && r.id !== item.id));
  if (!isNaN(val) && val >= 1 && (othersQty + val) >= mo) {
    const rawStock = item.stock;
    const stock = (typeof rawStock === 'number' && !isNaN(rawStock))
      ? rawStock
      : (rawStock !== undefined && rawStock !== null && rawStock !== '' && !isNaN(Number(rawStock)) ? Number(rawStock) : Infinity);
    
    if (stock !== Infinity && val > stock) {
      showStockToast(`재고는 최대 ${stock}개까지만 담을 수 있습니다.`);
      item.quantity = stock;
      e.target.value = stock;
    } else {
      item.quantity = val;
    }
    syncSkuQty(item);
    saveCartToStorage();
  } else {
    // 빈 값/0 이하이거나, 이 값으로 두면 같은 상품 합계가 MOQ 미만이 되는 경우 → 하한으로 복구
    const restored = Math.max(1, mo - othersQty);
    if (mo > 1) showStockToast(`이 상품의 최소 주문 수량은 ${mo}개입니다 (옵션 합계 기준).`);
    item.quantity = restored;
    e.target.value = restored;
    syncSkuQty(item);
    saveCartToStorage();
  }
}

// ---------------------------------------------------------
// 옵션 변경 소형 팝업 — fetch1688ProductById + 색상별 재고 표시
// ---------------------------------------------------------

// 색상명 번역 헬퍼 (ZH_KO_COLOR_MAP 우선, 없으면 원문 유지)
function translateColorName(zhName) {
  if (!zhName) return '';
  const mapped = ZH_KO_COLOR_MAP[zhName.trim()];
  if (mapped) return mapped;
  // 부분 매칭: 사전 키 중 zhName에 포함된 것 우선
  for (const [zh, ko] of Object.entries(ZH_KO_COLOR_MAP)) {
    if (zhName.includes(zh)) return zhName.replace(zh, ko);
  }
  return zhName;
}

// 재고 파싱 헬퍼 (string|number → number, 불명 → Infinity)
function parseStock(raw) {
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  if (raw !== undefined && raw !== null && raw !== '' && !isNaN(Number(raw))) return Number(raw);
  return Infinity;
}

// 팝업 내 클램핑+토스트 (modalSkuList 행에 사용)
function clampSkuQty(sku, newVal) {
  const stock = parseStock(sku.stock);
  const val = Math.max(0, parseInt(newVal, 10) || 0);
  if (stock !== Infinity && val > stock) {
    showStockToast(`재고는 최대 ${stock}개까지만 담을 수 있습니다.`);
    sku.quantity = stock;
  } else {
    sku.quantity = val;
  }
}

function increaseSkuQty(sku) {
  const stock = parseStock(sku.stock);
  const next = (sku.quantity || 0) + 1;
  if (stock !== Infinity && next > stock) {
    showStockToast(`재고는 최대 ${stock}개까지만 담을 수 있습니다.`);
    sku.quantity = stock;
  } else {
    sku.quantity = next;
  }
}

function decreaseSkuQty(sku) {
  sku.quantity = Math.max(0, (sku.quantity || 0) - 1);
}

// "옵션 변경/추가" 버튼 클릭: 1688 SKU 데이터 조회 → 소형 팝업 오픈 (색상×사이즈 조합)
async function openOptionModal(item) {
  if (isOptionFetching.value) return;

  editingItem.value = item;
  editingCartItemId.value = item.id;
  isOptionFetching.value = true;
  modalSkuList.value = [];
  modalSelectedColor.value = '';

  try {
    const productId = item.itemId || item.id;
    if (!productId || productId === '1688-item') {
      alert('이 상품의 1688 원본 ID를 찾을 수 없습니다. 상품을 다시 담아주세요.');
      return;
    }

    const full = await fetch1688ProductById(productId);
    if (!full) {
      alert('1688 상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const skus = Array.isArray(full.skus) && full.skus.length > 0 ? full.skus : [];
    // 방금 받은 1688 응답으로 가격 출처를 판정 — ProductDetailModal과 동일한 공용 기준
    optionModalIsSkuPriced.value = isSkuPricedSkus(skus);
    // ★ 구간 테이블도 이 응답에서 가져온다. 기존에는 baseItem(구 장바구니 행)의
    //   priceTiers를 물려받아, 구 행에서 시작하면 빈 배열이 그대로 복제됐다.
    //   이 팝업은 어차피 1688을 다시 부르므로 여기가 구간 정보를 채울 수 있는 지점이다.
    optionModalPriceTiers.value = Array.isArray(full.priceTiers)
      ? full.priceTiers.map(t => ({ minQuantity: t.minQty ?? t.minQuantity ?? 1, price: Number(t.price) || 0 }))
          .filter(t => t.price > 0)
      : [];
    console.log(`[CartView] 옵션 팝업 가격 출처: SKU별=${optionModalIsSkuPriced.value}, 구간 ${optionModalPriceTiers.value.length}개`);
    // 1688 상세의 대표가 → 없으면 장바구니에 저장된 단가. 둘 다 없으면 0(가격 확인 필요).
    // ※ 과거 `|| 15` 폴백 제거 — 단가 미상을 ¥15로 채워 잘못된 금액을 정상처럼 보이게 했음.
    const basePriceRaw = Number(full.price) > 0 ? Number(full.price) : Number(item.priceCny);
    const basePrice = Number.isFinite(basePriceRaw) && basePriceRaw > 0 ? basePriceRaw : 0;
    if (basePrice === 0) {
      console.error(
        '[CartView] 옵션 팝업: 1688 상세와 장바구니 양쪽 모두 단가가 없습니다 — 가격 확인 필요로 표시합니다.',
        { productId, fullPrice: full.price, itemPriceCny: item.priceCny }
      );
    }

    if (skus.length === 0) {
      // SKU 정보 없는 경우: 단일 행
      modalSkuList.value = [{
        id: `sku-0-${Date.now()}`,
        color: '',
        colorKo: item.titleKo || '기본 옵션',
        size: '',
        stock: Infinity,
        priceCny: basePrice,
        quantity: Number(item.quantity) || 1,
        isCurrent: true,
      }];
      modalSelectedColor.value = '';
    } else {
      // ── 색상×사이즈 조합을 각각 독립 행으로 구성 ──
      // isCurrent: 기존 장바구니 행의 color+size와 일치하는 조합 선표시
      const currentColorZh = String(item.color || '').trim();
      const currentColorKo = translateColorName(currentColorZh);
      const currentSize   = String(item.size || '').trim();
      // ★ 매칭 1순위는 specId(1688 spec_id, 32 hex) — 표시용 색상/사이즈 문자열은
      //   담은 시점과 팝업 여는 시점의 파파고 번역 결과가 달라질 수 있어 매칭 키로 쓸 수 없다.
      //   (api1688.js:1897-1919가 skuProps/skus의 color·size를 번역문으로 덮어씀)
      const currentSpecId = String(item.specId || '').trim();

      modalSkuList.value = skus.map((sk, idx) => {
        const colorZh = String(sk.color || '기본 단품').trim();
        const colorKo = translateColorName(colorZh);
        const size    = String(sk.size || '').trim();
        const specId  = String(sk.specId || '').trim();
        const stock   = parseStock(sk.stock);
        const price   = Number(sk.price || sk.priceCny || basePrice);

        let isCurrent;
        if (currentSpecId && specId) {
          // 양쪽 모두 specId를 가진 정상 경로 — 이 한 키로만 판정
          isCurrent = specId === currentSpecId;
        } else {
          // specId가 없는 구 장바구니 데이터 / spec_id 미제공 상품 전용 경로
          const colorMatch = colorZh === currentColorZh || colorKo === currentColorKo;
          const sizeMatch  = currentSize ? size === currentSize : !size;
          isCurrent = colorMatch && sizeMatch;
        }

        return {
          id: `sku-${idx}-${Date.now()}`,
          specId,
          color: colorZh,
          colorKo,
          size,
          stock,
          priceCny: price,
          quantity: isCurrent ? (Number(item.quantity) || 1) : 0,
          isCurrent,
          // 이 옵션의 이미지 — applyOptionChanges가 새 행에 넣는다.
          // 규칙은 ProductDetailModal 담기 경로와 같은 공용 함수(resolveSkuImageUrl)를 쓴다.
          // 색상 썸네일 출처는 방금 받은 응답의 skuProps[0].values (상세 모달 colorOptions와 동일 출처).
          imageUrl: resolveSkuImageUrl({
            skus,
            colorValues: full.skuProps?.[0]?.values || [],
            color: colorZh,
            size,
          }),
        };
      });

      // 초기 선택 색상: 현재 행의 색상(매칭 시) 또는 첫 번째 색상
      const currentEntry = modalSkuList.value.find(s => s.isCurrent);
      const firstColor   = modalSkuList.value[0]?.color || '';
      modalSelectedColor.value = currentEntry?.color || firstColor;
    }

    isOptionModalOpen.value = true;
  } catch (err) {
    console.error('[openOptionModal] fetch 실패:', err);
    alert('상품 정보 조회 중 오류가 발생했습니다.');
  } finally {
    isOptionFetching.value = false;
  }
}

function closeOptionModal() {
  isOptionModalOpen.value = false;
  editingItem.value = null;
  editingCartItemId.value = null;
  modalSkuList.value = [];
  modalSelectedColor.value = '';
}

// 팝업 내 색상 목록 (중복 제거, 순서 유지)
const modalColors = computed(() => {
  const seen = new Set();
  return modalSkuList.value.filter(s => {
    if (seen.has(s.color)) return false;
    seen.add(s.color);
    return true;
  }).map(s => ({
    color: s.color,
    colorKo: s.colorKo,
    // 해당 색상의 모든 사이즈가 품절이면 색상 자체를 품절로 표시
    isSoldOut: modalSkuList.value
      .filter(r => r.color === s.color)
      .every(r => r.stock !== Infinity && r.stock === 0),
  }));
});

// 선택된 색상의 사이즈 행 목록
const modalFilteredRows = computed(() => {
  if (!modalSelectedColor.value) return modalSkuList.value;
  return modalSkuList.value.filter(s => s.color === modalSelectedColor.value);
});

// 팝업 합계 computed
const modalTotalQuantity = computed(() =>
  modalSkuList.value.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0)
);
const modalTotalCny = computed(() =>
  modalSkuList.value.reduce((acc, s) => acc + ((Number(s.quantity) || 0) * s.priceCny), 0)
);
const modalTotalKrw = computed(() =>
  modalSkuList.value.reduce((acc, s) =>
    acc + krwFromCny((Number(s.quantity) || 0) * s.priceCny, exchangeRate.value), 0)  // 확정 공식
);
const modalSelectedSkuCount = computed(() =>
  modalSkuList.value.filter(s => (s.quantity || 0) > 0).length
);


// 팝업 "적용" 버튼: localStorage에 새 행 직접 저장 후 handleEditModalCartAdded로 기존 행 제거
function applyOptionChanges() {
  const validSkus = modalSkuList.value.filter(s => (s.quantity || 0) > 0);
  if (validSkus.length === 0) {
    alert('최소 1개 이상의 옵션 수량을 입력해 주세요.');
    return;
  }

  const baseItem = editingItem.value;

  // ── 최소 주문 수량(min_num) 검증 — 같은 1688 상품(num_iid) 합계 기준 ──
  // 이 팝업은 ProductDetailModal을 거치지 않고 localStorage에 직접 행을 쓰는 경로라
  // 담기 시점 가드가 적용되지 않는다. 여기서 막지 않으면 MOQ 미달 행이 장바구니에
  // 남고, 최종 차단은 openOrderModal 발주 가드까지 미뤄진다.
  // 편집 중인 기존 행(editingCartItemId)은 아래에서 교체·삭제되므로 합계에서 제외한다.
  const mo = resolveMoq(baseItem?.minOrder);
  const editKey = offerGroupKey(baseItem);
  const othersQty = sumQty(
    cartItems.value.filter(r => offerGroupKey(r) === editKey && r.id !== editingCartItemId.value)
  );
  const offerTotal = othersQty + sumQty(validSkus);
  if (offerTotal < mo) {
    showStockToast(`이 상품의 최소 주문 수량은 ${mo}개입니다 (옵션 합계 기준, 현재 ${offerTotal}개)`);
    return;
  }

  const cartKey = getCartStorageKey();

  // ★ 선택 상태 부분만 2026-09-22 사용자 허락으로 수정.
  //   기존 행이 체크돼 있었는지 먼저 기억해 둔다. handleEditModalCartAdded가
  //   기존 id를 selectedItemIds에서 빼고, loadCartItems는 "선택이 하나도 없을 때만"
  //   전체 자동 선택하므로(:1029), 새 행은 어디에서도 선택되지 않아 체크가 풀렸다.
  //   → 고객이 옵션만 바꿨는데 그 상품이 발주에서 조용히 빠지던 원인.
  const wasSelected = selectedItemIds.value.includes(editingCartItemId.value);
  let newRowIds = [];
  // 새 행의 SKU 키(offerId|specId) — 아래에서 "병합으로 id가 바뀐 경우"를 되찾는 데 쓴다.
  let newRowKeys = [];

  try {
    const stored = JSON.parse(localStorage.getItem(cartKey) || '[]');

    // 각 선택된 SKU를 독립 행으로 추가 (color+size 조합 정확히 보존)
    const newRows = validSkus.map((sku, i) => {
      const optLabel = [sku.colorKo || sku.color, sku.size].filter(Boolean).join(' / ');
      return {
        ...JSON.parse(JSON.stringify(baseItem)),
        id: `cart-sku-${Date.now()}-${i}`,
        // ★ baseItem 스프레드는 "변경 전" 옵션의 specId를 물고 온다.
        //   갱신하지 않으면 화면 옵션과 1688 발주용 specId가 어긋난다
        //   (api/1688-order-create.js가 specId만으로 실제 주문 SKU를 결정).
        specId: sku.specId || '',
        // ★ 이미지 부분만 2026-09-22 사용자 허락으로 수정.
        //   baseItem 스프레드는 "변경 전" 옵션의 사진을 물고 와, 옵션을 바꿔도
        //   장바구니 썸네일이 예전 옵션 사진으로 남았다. openOptionModal이
        //   방금 받은 응답으로 행마다 넣어둔 sku.imageUrl을 쓴다
        //   (규칙은 담기 경로와 같은 resolveSkuImageUrl 공용 함수).
        //   비어 있으면 기존 행 이미지를 그대로 유지한다.
        imageUrl: sku.imageUrl || baseItem.imageUrl,
        color: sku.color,
        size: sku.size,
        optionName: optLabel,
        sku: optLabel,
        quantity: sku.quantity,
        priceCny: sku.priceCny,
        price: sku.priceCny,
        // ── 가격 출처 스냅샷 갱신 ──
        //   이 팝업은 방금 1688 상세(full.skus)를 받아 각 행에 자기 SKU 가격을 넣었으므로
        //   그 응답으로 판정을 다시 기록한다. baseItem 스프레드로 물고 온 옛 값을 남기면
        //   SKU별 가격 상품인데 수량 구간으로 재계산되는(또는 그 반대) 불일치가 생긴다.
        isSkuPriced: optionModalIsSkuPriced.value,
        priceTiers: optionModalIsSkuPriced.value ? [] : optionModalPriceTiers.value,
        stock: sku.stock === Infinity ? undefined : sku.stock,
        skus: [{ color: sku.color, size: sku.size, quantity: sku.quantity }],
        createdAt: new Date().toISOString(),
      };
    });

    // ★ 선택 상태 부분만 2026-09-22 사용자 허락으로 수정 — 아래에서 새 행을 다시 체크하기 위해 id만 기록.
    newRowIds = newRows.map(r => r.id);
    newRowKeys = newRows
      .filter(r => String(r.specId || '').trim())
      .map(r => `${String(r.num_iid || '').trim()}|${String(r.specId).trim()}`);

    // 기존 행(oldId)은 handleEditModalCartAdded에서 제거하므로 여기서는 추가만
    const merged = [...stored, ...newRows];
    localStorage.setItem(cartKey, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('euchs:cart-updated', { detail: { count: merged.length } }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('[applyOptionChanges] 저장 실패:', e);
    alert('저장 중 오류가 발생했습니다.');
    return;
  }

  // 팝업 닫기 전에 편집 중인 cartItemId 유지 → handleEditModalCartAdded가 삭제
  const savedOldId = editingCartItemId.value;
  isOptionModalOpen.value = false;
  editingItem.value = null;
  modalSkuList.value = [];
  modalSelectedColor.value = '';
  // editingCartItemId는 handleEditModalCartAdded가 읽어야 하므로 그 호출 직전까지 유지
  editingCartItemId.value = savedOldId;
  handleEditModalCartAdded();

  // ★ 선택 상태 부분만 2026-09-22 사용자 허락으로 수정.
  //   반드시 handleEditModalCartAdded 이후에 실행한다 — 그 함수가 기존 id를 빼고
  //   loadCartItems로 cartItems를 새로 채운 뒤라야 새 행이 목록에 존재한다.
  //   기존 행이 체크돼 있지 않았다면 새 행도 체크하지 않는다(고객이 일부러 뺀 상품을 되살리지 않음).
  //   ★ 2026-09-22 추가: 바꾼 옵션이 장바구니에 이미 있던 SKU면 loadCartItems의
  //     중복 병합(dedupeRowsBySpecId)이 새 행을 기존 행에 합쳐 새 id가 사라진다.
  //     그때는 "합쳐진 뒤 남은 행"을 대신 체크해야 체크가 풀리지 않는다.
  if (wasSelected && newRowIds.length > 0) {
    const newIdSet = new Set(newRowIds);
    const newKeySet = new Set(newRowKeys);
    const liveIds = cartItems.value
      .filter(it =>
        newIdSet.has(it.id) ||
        (String(it.specId || '').trim() &&
          newKeySet.has(`${String(it.num_iid || '').trim()}|${String(it.specId).trim()}`))
      )
      .map(it => it.id);
    if (liveIds.length > 0) {
      selectedItemIds.value = [...new Set([...selectedItemIds.value, ...liveIds])];
    }
  }
}

// 기존 행 삭제 + localStorage 동기화 (localStorage 중복 부활 버그 수정 포함, 수정 금지)
function handleEditModalCartAdded() {
  const oldId = editingCartItemId.value;

  if (oldId) {
    // 1. 메모리에서 제거
    const idx = cartItems.value.findIndex(it => it.id === oldId);
    if (idx >= 0) {
      cartItems.value.splice(idx, 1);
      selectedItemIds.value = selectedItemIds.value.filter(sid => sid !== oldId);
    }

    // 2. localStorage에서도 제거
    try {
      const cartKey = getCartStorageKey();
      const stored = JSON.parse(localStorage.getItem(cartKey) || '[]');
      const filtered = stored.filter(it => it.id !== oldId);
      localStorage.setItem(cartKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[handleEditModalCartAdded] localStorage 기존 행 제거 실패:', e);
    }
  }

  editingCartItemId.value = null;

  // 3. localStorage 재로드 (새 행 반영)
  loadCartItems();
}


// ---------------------------------------------------------
// 필터링 및 집계 (Computed)
// ---------------------------------------------------------
const filteredItems = computed(() => {
  let list = [...cartItems.value];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(it =>
      (it.titleKo || '').toLowerCase().includes(q) ||
      (it.sku || '').toLowerCase().includes(q)
    );
  }

  if (sortBy.value === 'priceHigh') {
    list.sort((a, b) => getItemSubtotalKrw(b) - getItemSubtotalKrw(a));
  } else if (sortBy.value === 'priceLow') {
    list.sort((a, b) => getItemSubtotalKrw(a) - getItemSubtotalKrw(b));
  } else if (sortBy.value === 'qtyHigh') {
    list.sort((a, b) => (b.quantity || 1) - (a.quantity || 1));
  }

  return list;
});

const totalItemsQuantity = computed(() => {
  return cartItems.value.reduce((acc, cur) => acc + cartRowQty(cur), 0);
});

const selectedItems = computed(() => {
  return cartItems.value.filter(it => selectedItemIds.value.includes(it.id));
});

const selectedTotalQuantity = computed(() => {
  return selectedItems.value.reduce((acc, cur) => acc + cartRowQty(cur), 0);
});

const selectedTotalCny = computed(() => {
  return selectedItems.value.reduce((acc, cur) => acc + getItemSubtotalCny(cur), 0);
});

const selectedTotalKrw = computed(() => {
  // 품목별 krwFromCny 후 합산 (화면표시 일치 원칙 — getItemSubtotalKrw와 동일)
  return selectedItems.value.reduce((acc, cur) => acc + krwFromCny(getItemSubtotalCny(cur), exchangeRate.value), 0);
});

// 예상 총액 계산 (수수료, 현지택배비 포함 - calcCartEstimatedCost SSOT 재사용)
const selectedEstimatedCost = computed(() => {
  if (selectedItems.value.length === 0) {
    return {
      itemTotalKrw: 0,
      chinaFreightKrw: 0,
      chinaFreightOrigin: 'estimated',
      agencyFeeKrw: 0,
      chargeableKrw: 0
    };
  }
  // sellerFreightRmb가 있으면 2순위로 반영(진짜 묶음 계산값),
  // 없으면 item.freight 단순합산(3순위) 또는 수량추정(4순위)으로 폴백
  return calcCartEstimatedCost(
    selectedItems.value,
    {
      exchange_rate: exchangeRate.value,
      agency_fee_rate: currentSettings.value?.agency_fee_rate,
      sea_cbm_rate: currentSettings.value?.sea_cbm_rate
    },
    sellerFreightRmb.value  // null이면 무시됨
  );
});

// ---------------------------------------------------------
// 체크박스 선택 로직
// ---------------------------------------------------------
const isAllSelected = computed(() => {
  return (
    filteredItems.value.length > 0 &&
    selectedItemIds.value.length === filteredItems.value.length
  );
});

// ─── 자동 재계산 디바운스 ─────────────────────────────────────────────────────
// ※ selectedItems computed 선언(위) 이후에 위치해야 ReferenceError 없음
// 수량/품목/선택 변경 후 1초 내 추가 변경이 없으면 배치 호출 1회 실행
let freightDebounceTimer = null;

function triggerFreightDebounced() {
  if (freightDebounceTimer) clearTimeout(freightDebounceTimer);
  freightCalcState.value = 'loading'; // 즉시 loading 표시 (UX 즉각성)
  freightDebounceTimer = setTimeout(() => {
    calcSellerBatchFreight();
  }, 1000);
}

// 선택 아이템(id·quantity·specId)이 바뀔 때마다 자동 재계산
watch(
  () => selectedItems.value.map(it => `${it.id}:${it.quantity}:${it.specId}`).join(','),
  (newVal, oldVal) => {
    if (newVal === oldVal) return;
    if (selectedItems.value.length === 0) {
      sellerFreightRmb.value = null;
      freightCalcState.value = 'idle';
      return;
    }
    triggerFreightDebounced();
  }
);

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedItemIds.value = filteredItems.value.map(it => it.id);
  } else {
    selectedItemIds.value = [];
  }
  // 선택 변경 시 배치 운임 결과 리셋 (구 선택 기준 결과가 잔류하지 않도록)
  sellerFreightRmb.value = null;
  freightCalcState.value = 'idle';
}

// ---------------------------------------------------------
// 삭제 액션
// ---------------------------------------------------------
function removeItem(id) {
  pendingRemoveItemId.value = id;
  confirmRemoveItem.value = true;
}

function executeRemoveItem() {
  const id = pendingRemoveItemId.value;
  if (!id) return;
  cartItems.value = cartItems.value.filter(it => it.id !== id);
  selectedItemIds.value = selectedItemIds.value.filter(itemId => itemId !== id);
  saveCartToStorage();
}

function deleteSelected() {
  if (selectedItemIds.value.length === 0) return;
  confirmDeleteSelected.value = true;
}

function executeDeleteSelected() {
  cartItems.value = cartItems.value.filter(it => !selectedItemIds.value.includes(it.id));
  selectedItemIds.value = [];
  saveCartToStorage();
}

// ---------------------------------------------------------
// 발주 설정 모달 열기 & 제출 완료 핸들러
// ---------------------------------------------------------
function openOrderModal() {
  const targetItems = selectedItems.value;
  if (targetItems.length === 0) {
    alert('발주 신청할 상품을 먼저 선택해 주세요.');
    return;
  }

  // ── 옵션 미선택 품목 차단 ────────────────────────────────────────────────
  // specId 없는 품목은 1688 자동발주 API가 거부한다(api/1688-order-create.js).
  // 단, "옵션이 원래 없는 진짜 단품"까지 막으면 안 되므로 담기 시점에 기록해 둔
  // hasOptions로 구분한다.
  //   · hasOptions === true  + specId 없음 → color가 '기본 단품'일 때만 차단.
  //     옵션 표기는 정상이나 1688이 spec_id를 주지 않는 교차조합 상품
  //     (api1688.js:1753-1780)은 수동발주 경로를 유지해야 하므로 통과시킨다.
  //     (자동발주 단계에서 AdminOrderManageView가 수동발주 대상으로 분리)
  //   · hasOptions === false                → 통과 (진짜 단품)
  //   · hasOptions === undefined            → 구 장바구니 행. 플래그가 없던 시절 데이터라
  //     '기본 단품'(우리 코드가 만든 폴백 상수, 번역 영향 없음) 지문으로만 차단한다.
  //     ※ 과도기 처리 — 구 행이 모두 소진되면 이 분기는 제거 가능.
  const unspecified = targetItems.filter(it => {
    if (String(it.specId || '').trim()) return false;
    if (it.hasOptions === true) return String(it.color || '').trim() === '기본 단품';
    if (it.hasOptions === false) return false;
    return String(it.color || '').trim() === '기본 단품';
  });
  if (unspecified.length > 0) {
    const names = [...new Set(unspecified.map(it => it.titleKo || it.titleZh || '1688 상품'))];
    showStockToast(`옵션이 선택되지 않은 상품이 있습니다 — ${names.join(', ')}. 옵션 변경/추가로 옵션을 선택해 주세요`);
    return;
  }

  // ── 단가 미확인 품목 차단 ────────────────────────────────────────────────
  // priceCny가 없거나 0인 행은 견적 금액을 계산할 수 없다. 과거에는 ¥15로 조용히
  // 채워 잘못된 견적이 그대로 접수됐으므로, 여기서 막고 원인을 로그로 남긴다.
  const priceMissing = targetItems.filter(it => !hasValidPrice(it));
  if (priceMissing.length > 0) {
    const names = [...new Set(priceMissing.map(it => it.titleKo || it.titleZh || '1688 상품'))];
    console.error('[CartView] 단가 미확인 품목으로 발주 차단:', priceMissing);
    showStockToast(`단가를 확인할 수 없는 상품이 있습니다 — ${names.join(', ')}. 옵션 변경/추가로 다시 선택해 주세요`);
    return;
  }

  // ── 수량 미확인 품목 차단 (단가 미확인 차단과 동일한 방식) ──────────────
  // 수량 0인 행은 예전 담기 경로에서 품절 옵션이 재고 클램핑으로 0이 되어 저장된 것이다.
  // loadCartItems가 더 이상 1로 되살리지 않으므로 여기서 발주를 막는다.
  const quantityMissing = targetItems.filter(it => !hasValidQuantity(it));
  if (quantityMissing.length > 0) {
    const names = [...new Set(quantityMissing.map(it => it.titleKo || it.titleZh || '1688 상품'))];
    console.error('[CartView] 수량 미확인 품목으로 발주 차단:', quantityMissing);
    showStockToast(`수량을 확인할 수 없는 상품이 있습니다 — ${names.join(', ')}. 수량을 다시 입력하거나 삭제해 주세요`);
    return;
  }

  // ── 1688 최소 주문 수량(min_num) 최종 방어선 ─────────────────────────────
  // 담기 시점 가드(ProductDetailModal)만으로는 부족하다:
  //   ① 장바구니에서 일부 행만 체크해 발주하면 합계가 MOQ 미만일 수 있고
  //   ② 행을 삭제하거나 옵션 변경 팝업으로 수량을 낮춰 합계가 MOQ 미만으로 떨어질 수도 있다.
  // 실제로 1688에 발주되는 단위는 "체크된 행"이므로, 여기서 같은 상품(num_iid)끼리
  // 묶어 합계를 검증하지 않으면 결제 후 관리자 발주 시점에
  // BOOKED_LESS_THAN_LEAST_QUANTITY로 뒤늦게 터진다(2026-09-08 0f98d11 참조).
  const groups = new Map();
  for (const it of targetItems) {
    const key = offerGroupKey(it);
    if (!groups.has(key)) {
      groups.set(key, { name: it.titleKo || it.titleZh || '1688 상품', moq: 1, rows: [] });
    }
    const g = groups.get(key);
    g.rows.push(it);
    // 같은 상품이면 MOQ는 동일해야 하지만, 구 데이터 혼재 시 보수적으로 큰 값을 적용
    g.moq = Math.max(g.moq, resolveMoq(it.minOrder));
  }
  const violations = [];
  for (const g of groups.values()) {
    const total = sumQty(g.rows);
    if (total < g.moq) violations.push(`${g.name} (현재 ${total}개 / 최소 ${g.moq}개)`);
  }
  if (violations.length > 0) {
    showStockToast(`1688 최소 주문 수량 미달 상품이 있습니다 — ${violations.join(', ')}`);
    return;
  }

  isOrderConfigModalOpen.value = true;
}

function handleOrderSubmitted() {
  selectedItemIds.value = [];
  loadCartItems();
}



// ---------------------------------------------------------
// 엑셀 다운로드
// ---------------------------------------------------------
function exportCartExcel() {
  try {
    const fileName = exportQuoteExcel(
      cartItems.value,
      { companyName: '장바구니 발주 대기 품목' },
      exchangeRate.value,
      (Number(currentSettings.value?.agency_fee_rate) || 8.0) / 100
    );
    alert(`장바구니 견적서 엑셀 파일(${fileName})이 정상 다운로드되었습니다.`);
  } catch (e) {
    console.error('Excel export error:', e);
  }
}

onMounted(() => {
  // 레거시 공용 장바구니 키 영구 파기 (진입 시마다 확실히 제거)
  try {
    localStorage.removeItem('euchs_erp_saved_items');
    localStorage.removeItem('euchs_holding_items');
    localStorage.removeItem('euchs_cart_items');
  } catch (e) {}

  fetchSiteSettings();
  loadCartItems();
  // 마운트 직후 자동 배치 운임 계산 — 선택 아이템이 있으면 즉시 시작
  if (selectedItems.value.length > 0) {
    calcSellerBatchFreight();
  }
  // ※ 'storage' 네이티브 이벤트 리스너는 등록하지 않음 (2026-09-15 버그 수정).
  //    auth.js, DashboardView 등 다른 컴포넌트가 window.dispatchEvent(new Event('storage'))를
  //    발사할 때마다 loadCartItems가 재호출되어 sellerFreightRmb를 초기화하는 루프가 생김.
  //    장바구니 변경 알림은 'euchs:cart-updated' 커스텀 이벤트만으로 충분.
  //    (다른 탭에서 실제 localStorage 변경이 생기면 native storage 이벤트가 발화하지만
  //     그 케이스는 사용자가 같은 탭에서 장바구니를 직접 보고 있으므로 무시해도 무방)
  window.addEventListener('euchs:cart-updated', onCartUpdatedEvent);
});

// ★ 2026-09-22 추가 — 리스너 정리. 이게 없어서 한 번 진입할 때마다 리스너가 쌓였다.
//   화면을 떠난(언마운트된) 인스턴스가 계속 euchs:cart-updated를 받아
//   ① loadCartItems + heal 작업(중복 병합·단가 재검증)을 자기 몫으로 한 번 더 돌리고
//   ② 자기가 들고 있던 "예전 장바구니 배열"을 saveCartToStorage로 덮어써
//   방금 합쳐 둔 중복 행이 되살아났다(한 번 진입에 병합·재검증이 2회 실행된 원인).
onUnmounted(() => {
  isInstanceActive = false;
  window.removeEventListener('euchs:cart-updated', onCartUpdatedEvent);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
