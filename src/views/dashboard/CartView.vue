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
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. 보관 품목수 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-gray-500">장바구니 담긴 품목</span>
          <div class="text-2xl font-extrabold text-gray-900 font-mono">
            {{ cartItems.length }} <span class="text-xs font-normal text-gray-500">종</span>
          </div>
          <p class="text-[11px] text-gray-400">총 {{ totalItemsQuantity }}개 대기중</p>
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
          <p class="text-[11px] text-amber-600/70">{{ selectedTotalQuantity }}개 선택됨</p>
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
            ₩226.19
          </div>
          <p class="text-[11px] text-blue-600/70">1 RMB (위안화)</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Coins class="w-5 h-5" />
        </div>
      </div>

      <!-- 4. 선택 품목 예상 공급가 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-emerald-700">선택 품목 공급가 합계</span>
          <div class="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
            ₩{{ formatNumber(selectedTotalKrw) }}
          </div>
          <p class="text-[11px] text-emerald-600/70">약 ¥ {{ selectedTotalCny.toFixed(2) }} 위안</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Calculator class="w-5 h-5" />
        </div>
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

    <!-- ======================================================== -->
    <!-- 3. 장바구니 품목 테이블 (CNINSIDER 표준 포맷) -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
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
              <th class="py-3.5 px-4">상품 정보</th>
              <th class="py-3.5 px-4 text-center">옵션 / 규격 (SKU)</th>
              <th class="py-3.5 px-4 text-center w-36">발주 수량</th>
              <th class="py-3.5 px-4 text-right">1688 공급 단가</th>
              <th class="py-3.5 px-4 text-right">품목 합계 금액 (KRW)</th>
              <th class="py-3.5 px-4 text-center w-20">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="hover:bg-slate-50/80 transition group"
            >
              <!-- 1. 체크박스 -->
              <td class="py-3.5 px-4 text-center">
                <input
                  type="checkbox"
                  v-model="selectedItemIds"
                  :value="item.id"
                  class="rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </td>

              <!-- 2. 상품 정보 (외부 링크 전면 제거 + 옵션 변경 버튼 배치) -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3 min-w-[280px]">
                  <img
                    :src="item.imageUrl || item.thumbnail || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
                    :alt="item.titleKo || item.productName"
                    class="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0"
                    @error="handleImgError"
                  />
                  <div class="space-y-1 flex-1 min-w-0">
                    <div class="font-bold text-gray-900 line-clamp-2 leading-snug">
                      {{ item.titleKo || item.productName || item.titleZh }}
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] text-gray-400 font-mono">
                        상품 ID: <b class="text-gray-600">{{ item.itemId || item.id }}</b>
                      </span>
                      <button
                        type="button"
                        @click="openOptionModal(item)"
                        :disabled="isOptionFetching && editingCartItemId === item.id"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition active:scale-95 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        title="색상·사이즈 옵션 변경 또는 다중 옵션 추가"
                      >
                        <Loader2
                          v-if="isOptionFetching && editingCartItemId === item.id"
                          class="w-3 h-3 text-amber-600 animate-spin"
                        />
                        <Settings2 v-else class="w-3 h-3 text-amber-600" />
                        <span>{{ isOptionFetching && editingCartItemId === item.id ? '조회중...' : '옵션 변경/추가' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 3. 옵션 / 규격 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="space-y-1">
                  <span class="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-gray-800 font-medium text-[11px] max-w-[150px] truncate">
                    {{ getItemSkuText(item) }}
                  </span>
                  <div>
                    <button
                      type="button"
                      @click="openOptionModal(item)"
                      class="text-[10px] text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer"
                    >
                      옵션 수정 &gt;
                    </button>
                  </div>
                </div>
              </td>

              <!-- 4. 발주 수량 조절 Stepper (+/-) -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <button
                    type="button"
                    @click="decreaseQty(item)"
                    class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition font-bold cursor-pointer"
                    title="수량 감소"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    :max="(typeof item.stock === 'number' && !isNaN(item.stock)) ? item.stock : undefined"
                    :value="item.quantity || 1"
                    @input="onQtyInput(item, $event)"
                    @change="onQtyInput(item, $event)"
                    class="w-14 h-8 text-center text-xs font-mono font-bold text-gray-900 border-x border-gray-200 outline-none focus:bg-amber-50/50"
                  />
                  <button
                    type="button"
                    @click="increaseQty(item)"
                    class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition font-bold cursor-pointer"
                    title="수량 증가"
                  >
                    +
                  </button>
                </div>
              </td>

              <!-- 5. 1688 공급 단가 (CNY / KRW) -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                <div class="text-xs font-bold text-gray-900">
                  ¥{{ getItemUnitPriceCny(item).toFixed(2) }}
                </div>
                <div class="text-[11px] text-gray-400">
                  약 ₩{{ formatNumber(Math.round(getItemUnitPriceCny(item) * 226.19)) }}원
                </div>
              </td>

              <!-- 6. 품목 합계 금액 (KRW / CNY) -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                <div class="text-sm font-bold text-amber-600">
                  ₩{{ formatNumber(getItemSubtotalKrw(item)) }}원
                </div>
                <div class="text-[11px] text-gray-400">
                  (¥ {{ getItemSubtotalCny(item).toFixed(2) }} 위안)
                </div>
              </td>

              <!-- 7. 개별 삭제 버튼 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <button
                  type="button"
                  @click="removeItem(item.id)"
                  class="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition font-bold text-[11px] flex items-center gap-1 mx-auto active:scale-95 cursor-pointer"
                  title="장바구니에서 삭제"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="filteredItems.length === 0">
              <td colspan="7" class="py-20 text-center text-gray-400 text-xs">
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
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
              <p class="text-[11px] text-gray-500 mt-0.5">1688 실시간 재고 기준 · 색상 선택 → 사이즈별 수량 설정</p>
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
            <p class="text-[11px] text-gray-500 font-mono mt-0.5">
              기본 단가: <b>¥{{ getItemUnitPriceCny(editingItem).toFixed(2) }}</b>
              (약 ₩{{ formatNumber(Math.round(getItemUnitPriceCny(editingItem) * 226.19)) }}원)
            </p>
          </div>
        </div>

        <!-- 1단계: 색상 칩 선택 -->
        <div v-if="modalColors.length > 1" class="space-y-2">
          <div class="flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span class="font-bold text-gray-800 text-[11px]">① 색상 선택</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in modalColors"
              :key="c.color"
              type="button"
              @click="modalSelectedColor = c.color"
              :disabled="c.isSoldOut"
              class="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition active:scale-95"
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
              <span class="font-bold text-gray-800 text-[11px]">
                {{ modalColors.length > 1 ? '② 사이즈별 발주 수량' : '발주 수량 설정' }}
              </span>
            </div>
            <span class="text-[11px] text-gray-400">수량 0 = 미선택</span>
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
                  <span v-if="row.isCurrent" class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black">현재</span>
                  <span
                    v-if="row.stock !== Infinity && row.stock === 0"
                    class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold"
                  >품절</span>
                  <span
                    v-else-if="row.stock !== Infinity"
                    class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold"
                  >재고 {{ row.stock }}개</span>
                </div>
                <div class="text-[11px] text-gray-400 font-mono mt-0.5">
                  ¥{{ row.priceCny.toFixed(2) }} (₩{{ formatNumber(Math.round(row.priceCny * 226.19)) }}원)
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
                  ₩{{ formatNumber(Math.round((row.quantity || 0) * row.priceCny * 226.19)) }}
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
      @close="isOrderConfigModalOpen = false"
      @submitted="handleOrderSubmitted"
    />


    <!-- ======================================================== -->
    <!-- 5. 하단 고정 종합 액션 바 (Sticky Bottom Action Bar) -->
    <!-- ======================================================== -->
    <div class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl p-3 sm:p-4 transition">
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

        <!-- 우측: 통계 집계 & 메인 주문 버튼 -->
        <div class="flex flex-wrap items-center justify-end gap-4 sm:gap-6">
          <div class="text-right">
            <div class="text-[11px] text-gray-500 font-medium">
              선택 품목: <b class="text-gray-900">{{ selectedItems.length }}종</b> (총 <b class="text-gray-900">{{ selectedTotalQuantity }}개</b>)
            </div>
            <div class="text-base sm:text-lg font-black text-amber-600 font-mono">
              합계 ₩{{ formatNumber(selectedTotalKrw) }}원
              <span class="text-xs text-gray-400 font-normal ml-1">(¥{{ selectedTotalCny.toFixed(2) }})</span>
            </div>
          </div>

          <button
            type="button"
            @click="openOrderModal"
            :disabled="selectedItemIds.length === 0"
            class="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-sm shadow-md transition flex items-center gap-2 active:scale-95 cursor-pointer"
            :class="{ 'animate-pulse': selectedItemIds.length > 0 }"
          >
            <Send class="w-4 h-4" />
            <span>선택 상품 바로주문 (발주신청)</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetch1688ProductById, ZH_KO_COLOR_MAP } from '@/services/api1688';
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
  Loader2
} from 'lucide-vue-next';
import { exportQuoteExcel } from '@/utils/excelExport';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredOrders, saveStoredOrders, saveNewOrder } from '@/utils/orderStorage';
import { currentUser, getCartStorageKey, isLoggedIn } from '@/lib/auth';
import { sendOrderStatusAlimtalk } from '@/services/notificationService';
import OrderConfigModal from '@/components/dashboard/OrderConfigModal.vue';

const router = useRouter();

const searchQuery = ref('');
const sortBy = ref('latest');
const selectedItemIds = ref([]);
const cartItems = ref([]);

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
        cartItems.value = parsed.map((it, idx) => {
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
            titleKo: it.titleKo || it.productName || it.titleZh || '1688 소싱 품목',
            titleZh: it.titleZh || '',
            imageUrl: it.imageUrl || it.thumbnail,
            priceCny: Number(it.priceCny || it.price || 15),
            // ── 수량: 저장된 quantity만 정확히 읽기 (minOrder 폴백 절대 금지 — 뻥튀기 방지) ──
            quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
            // ── 옵션 독립 필드 (SKU별 1:1 바인딩, 절대 덮어씌우지 않음) ──
            color: colorStr,
            size: sizeStr,
            optionName: resolvedOption,
            sku: resolvedOption,
            // ── 재고 상한 필드 보존 (수량 조절 시 클램핑에 사용) ──
            stock: (typeof it.stock === 'number' && !isNaN(it.stock))
              ? it.stock
              : (it.stock !== undefined && it.stock !== null && it.stock !== '' && !isNaN(Number(it.stock)) ? Number(it.stock) : undefined),
            // 원본 데이터 보존
            skus: it.skus || [],
            detailUrl: it.detailUrl || '',
            company: it.company || '1688 공급처',
          };
        });
        if (selectedItemIds.value.length === 0) {
          selectedItemIds.value = cartItems.value.map(it => it.id);
        }
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

const saveCartToStorage = () => {
  // ── 사용자 격리 키 (euchs_cart_{userId}) 로만 저장 ──
  const cartKey = getCartStorageKey();
  localStorage.setItem(cartKey, JSON.stringify(cartItems.value));
  // 뱃지 구독자들에게 최신 카운트 즉시 알림
  window.dispatchEvent(new CustomEvent('euchs:cart-updated', { detail: { count: cartItems.value.length } }));
  window.dispatchEvent(new Event('storage'));
};

// ---------------------------------------------------------
// 단가 및 합계 계산 헬퍼
// ---------------------------------------------------------
function getItemUnitPriceCny(item) {
  return Number(item.priceCny || item.price || 15);
}

function getItemSubtotalCny(item) {
  return getItemUnitPriceCny(item) * (Number(item.quantity) || 1);
}

function getItemSubtotalKrw(item) {
  return Math.round(getItemSubtotalCny(item) * 226.19);
}

function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR');
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60';
}

// ---------------------------------------------------------
// 수량 조절 Stepper
// ---------------------------------------------------------
function increaseQty(item) {
  const rawStock = item.stock;
  const stock = (typeof rawStock === 'number' && !isNaN(rawStock))
    ? rawStock
    : (rawStock !== undefined && rawStock !== null && rawStock !== '' && !isNaN(Number(rawStock)) ? Number(rawStock) : Infinity);
  
  const current = Number(item.quantity) || 1;
  const next = current + 1;
  if (stock !== Infinity && next > stock) {
    showStockToast(`재고는 최대 ${stock}개까지만 담을 수 있습니다.`);
    item.quantity = stock;
    saveCartToStorage();
    return;
  }
  item.quantity = next;
  saveCartToStorage();
}

function decreaseQty(item) {
  if ((Number(item.quantity) || 1) > 1) {
    item.quantity = (Number(item.quantity) || 1) - 1;
    saveCartToStorage();
  }
}

function onQtyInput(item, e) {
  const val = parseInt(e.target.value, 10);
  if (!isNaN(val) && val >= 1) {
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
    saveCartToStorage();
  } else if (isNaN(val) || val < 1) {
    // 빈 값이거나 0 이하 입력 시 기본값 1로 복구
    item.quantity = 1;
    e.target.value = 1;
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
    const basePrice = Number(full.price || item.priceCny || 15);

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

      modalSkuList.value = skus.map((sk, idx) => {
        const colorZh = String(sk.color || '기본 단품').trim();
        const colorKo = translateColorName(colorZh);
        const size    = String(sk.size || '').trim();
        const stock   = parseStock(sk.stock);
        const price   = Number(sk.price || sk.priceCny || basePrice);

        // 현재 색상 판별: 중문→한글 번역 양쪽으로 비교
        const colorMatch = colorZh === currentColorZh || colorKo === currentColorKo;
        const sizeMatch  = !currentSize || size === currentSize || !size;
        const isCurrent  = colorMatch && sizeMatch;

        return {
          id: `sku-${idx}-${Date.now()}`,
          color: colorZh,
          colorKo,
          size,
          stock,
          priceCny: price,
          quantity: isCurrent ? (Number(item.quantity) || 1) : 0,
          isCurrent,
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
const modalTotalKrw = computed(() => Math.round(modalTotalCny.value * 226.19));
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
  const cartKey = getCartStorageKey();

  try {
    const stored = JSON.parse(localStorage.getItem(cartKey) || '[]');

    // 각 선택된 SKU를 독립 행으로 추가 (color+size 조합 정확히 보존)
    const newRows = validSkus.map((sku, i) => {
      const optLabel = [sku.colorKo || sku.color, sku.size].filter(Boolean).join(' / ');
      return {
        ...JSON.parse(JSON.stringify(baseItem)),
        id: `cart-sku-${Date.now()}-${i}`,
        color: sku.color,
        size: sku.size,
        optionName: optLabel,
        sku: optLabel,
        quantity: sku.quantity,
        priceCny: sku.priceCny,
        stock: sku.stock === Infinity ? undefined : sku.stock,
        skus: [{ color: sku.color, size: sku.size, quantity: sku.quantity }],
        createdAt: new Date().toISOString(),
      };
    });

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
  return cartItems.value.reduce((acc, cur) => acc + (Number(cur.quantity) || 1), 0);
});

const selectedItems = computed(() => {
  return cartItems.value.filter(it => selectedItemIds.value.includes(it.id));
});

const selectedTotalQuantity = computed(() => {
  return selectedItems.value.reduce((acc, cur) => acc + (Number(cur.quantity) || 1), 0);
});

const selectedTotalCny = computed(() => {
  return selectedItems.value.reduce((acc, cur) => acc + getItemSubtotalCny(cur), 0);
});

const selectedTotalKrw = computed(() => {
  return Math.round(selectedTotalCny.value * 226.19);
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

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedItemIds.value = filteredItems.value.map(it => it.id);
  } else {
    selectedItemIds.value = [];
  }
}

// ---------------------------------------------------------
// 삭제 액션
// ---------------------------------------------------------
function removeItem(id) {
  if (confirm('해당 품목을 장바구니에서 삭제하시겠습니까?')) {
    cartItems.value = cartItems.value.filter(it => it.id !== id);
    selectedItemIds.value = selectedItemIds.value.filter(itemId => itemId !== id);
    saveCartToStorage();
  }
}

function deleteSelected() {
  if (selectedItemIds.value.length === 0) return;
  if (confirm(`선택한 ${selectedItemIds.value.length}개 품목을 장바구니에서 삭제하시겠습니까?`)) {
    cartItems.value = cartItems.value.filter(it => !selectedItemIds.value.includes(it.id));
    selectedItemIds.value = [];
    saveCartToStorage();
  }
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
      226.19,
      0.08
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

  loadCartItems();
  window.addEventListener('storage', loadCartItems);
  window.addEventListener('euchs:cart-updated', loadCartItems);
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
