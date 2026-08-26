<template>
  <div class="space-y-6 pb-28">
    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 & 통계 요약 카드 4종 -->
    <!-- ======================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
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

      <!-- 상단 액션 버튼 그룹 -->
      <div class="flex flex-wrap items-center gap-2">
        <router-link
          to="/mall"
          class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <Plus class="w-4 h-4 text-amber-400" />
          <span>1688 상품 추가 담기</span>
        </router-link>

        <button
          type="button"
          @click="exportCartExcel"
          :disabled="cartItems.length === 0"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>장바구니 엑셀 다운로드</span>
        </button>
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

      <div class="flex items-center gap-2 text-xs">
        <button
          type="button"
          @click="deleteSelected"
          :disabled="selectedItemIds.length === 0"
          class="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-rose-50 text-gray-600 hover:text-rose-600 font-bold transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600 flex items-center gap-1.5"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>선택 품목 삭제</span>
        </button>

        <select
          v-model="sortBy"
          class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
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
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition active:scale-95 shadow-2xs"
                        title="색상·사이즈 옵션 변경 또는 다중 옵션 추가"
                      >
                        <Settings2 class="w-3 h-3 text-amber-600" />
                        <span>옵션 변경/추가</span>
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
                    :value="item.quantity || 1"
                    @input="onQtyInput(item, $event)"
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
    <!-- 4. 옵션 변경/추가 모달 (Option Edit & Multi-SKU Sourcing) -->
    <!-- ======================================================== -->
    <div
      v-if="isOptionModalOpen && editingItem"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      @click.self="closeOptionModal"
    >
      <div class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-xs text-gray-700">
        <!-- 모달 헤더 -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Settings2 class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900">
                상품 옵션 변경 및 다중 SKU 추가
              </h3>
              <p class="text-[11px] text-gray-500 mt-0.5">
                사입할 색상, 사이즈, 규격별 수량을 설정하여 장바구니에 반영합니다.
              </p>
            </div>
          </div>
          <button @click="closeOptionModal" class="text-gray-400 hover:text-gray-900 p-1.5 rounded-xl hover:bg-gray-100 transition">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 상품 기본 정보 미니 카드 -->
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
              기본 단가: <b>¥{{ getItemUnitPriceCny(editingItem).toFixed(2) }}</b> (약 ₩{{ formatNumber(Math.round(getItemUnitPriceCny(editingItem) * 226.19)) }}원)
            </p>
          </div>
        </div>

        <!-- SKU 옵션 목록 및 수량 조절 리스트 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-gray-900 flex items-center gap-1.5">
              <Layers class="w-4 h-4 text-amber-500" />
              <span>1688 규격별 발주 수량 설정</span>
            </h4>
            <span class="text-[11px] text-gray-400">최소 1개 이상 수량 입력 시 반영</span>
          </div>

          <div class="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
            <div
              v-for="sku in modalSkuList"
              :key="sku.id"
              class="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              :class="{ 'bg-amber-50/40': sku.quantity > 0 }"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-gray-900 text-xs">{{ sku.name }}</span>
                  <span
                    v-if="sku.isCurrent"
                    class="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-black"
                  >
                    현재 선택중
                  </span>
                </div>
                <div class="text-[11px] text-gray-400 font-mono mt-0.5">
                  단가: ¥{{ sku.priceCny.toFixed(2) }} (₩{{ formatNumber(Math.round(sku.priceCny * 226.19)) }}원) · 재고: {{ sku.stock }}개
                </div>
              </div>

              <!-- Stepper -->
              <div class="flex items-center gap-3 shrink-0">
                <div class="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <button
                    type="button"
                    @click="sku.quantity = Math.max(0, sku.quantity - 1)"
                    class="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    v-model.number="sku.quantity"
                    class="w-12 h-7 text-center text-xs font-mono font-bold text-gray-900 border-x border-gray-200 outline-none"
                  />
                  <button
                    type="button"
                    @click="sku.quantity = (sku.quantity || 0) + 1"
                    class="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold"
                  >
                    +
                  </button>
                </div>

                <div class="w-20 text-right font-mono font-bold text-amber-600 text-xs">
                  ₩{{ formatNumber(Math.round((sku.quantity || 0) * sku.priceCny * 226.19)) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 모달 요약 및 액션 버튼 -->
        <div class="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span class="text-gray-500 font-medium">설정된 총 발주 수량</span>
            <div class="font-bold text-gray-900 font-mono text-sm">
              총 {{ modalTotalQuantity }}개 ({{ modalSelectedSkuCount }}개 옵션)
            </div>
          </div>
          <div class="text-right">
            <span class="text-gray-500 font-medium">예상 합계 금액</span>
            <div class="text-base font-black text-amber-600 font-mono">
              ₩{{ formatNumber(modalTotalKrw) }}원
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            @click="closeOptionModal"
            class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button
            type="button"
            @click="applyOptionChanges"
            :disabled="modalTotalQuantity === 0"
            class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black transition shadow-sm active:scale-95 cursor-pointer"
          >
            장바구니에 옵션 적용하기
          </button>
        </div>
      </div>
    </div>

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
            @click="submitSelectedOrder"
            :disabled="selectedItemIds.length === 0"
            class="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-sm shadow-md transition flex items-center gap-2 active:scale-95 cursor-pointer"
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
  X
} from 'lucide-vue-next';
import { exportQuoteExcel } from '@/utils/excelExport';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredOrders, saveStoredOrders, saveNewOrder } from '@/utils/orderStorage';
import { currentUser, getCartStorageKey, isLoggedIn } from '@/lib/auth';

const router = useRouter();

const searchQuery = ref('');
const sortBy = ref('latest');
const selectedItemIds = ref([]);
const cartItems = ref([]);

// 옵션 모달 상태
const isOptionModalOpen = ref(false);
const editingItem = ref(null);
const modalSkuList = ref([]);

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
  item.quantity = (Number(item.quantity) || 1) + 1;
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
    item.quantity = val;
    saveCartToStorage();
  }
}

// ---------------------------------------------------------
// 옵션 변경/추가 모달 로직
// ---------------------------------------------------------
function openOptionModal(item) {
  editingItem.value = item;

  // 상품별 가상 SKU 리스트 생성 (기존 SKU 및 변형 옵션 제공)
  const currentSku = item.sku || '기본 옵션';
  const basePrice = Number(item.priceCny || 15);
  const currentQty = Number(item.quantity || 10);

  // 기본 프리셋 SKU 후보군 생성
  const presets = [
    { name: currentSku, isCurrent: true, priceCny: basePrice, stock: 9999, quantity: currentQty },
    { name: getAlternateSkuName(currentSku, 1), isCurrent: false, priceCny: Number((basePrice * 1.05).toFixed(2)), stock: 8500, quantity: 0 },
    { name: getAlternateSkuName(currentSku, 2), isCurrent: false, priceCny: Number((basePrice * 1.1).toFixed(2)), stock: 5200, quantity: 0 },
    { name: getAlternateSkuName(currentSku, 3), isCurrent: false, priceCny: Number(basePrice.toFixed(2)), stock: 6800, quantity: 0 },
  ];

  modalSkuList.value = presets.map((s, idx) => ({
    id: `sku-${idx}-${Date.now()}`,
    ...s
  }));

  isOptionModalOpen.value = true;
}

function getAlternateSkuName(current, index) {
  if (current.includes('블랙')) {
    const list = ['화이트 / 고급 풀세트', '밀리터리 카키 / 기본형', '스페이스 그레이 / 대용량'];
    return list[index - 1] || '화이트 옵션';
  } else if (current.includes('베이지')) {
    const list = ['매트 블랙 / 카라비너 포함', '딥 올리브 / 스트랩 포함', '크림 화이트 / 단품'];
    return list[index - 1] || '블랙 옵션';
  } else if (current.includes('실버')) {
    const list = ['20cm 슬림 / 주광색 (화이트)', '60cm 롱바 / 전구색 (웜화이트)', '40cm 블랙 / 3색 변환센서'];
    return list[index - 1] || '골드 옵션';
  }
  const defaultAlternates = [
    '블랙 / 최고급형',
    '화이트 / 기본형',
    '딥 그레이 / 풀패키지'
  ];
  return defaultAlternates[index - 1] || '추가 규격';
}

function closeOptionModal() {
  isOptionModalOpen.value = false;
  editingItem.value = null;
  modalSkuList.value = [];
}

const modalTotalQuantity = computed(() => {
  return modalSkuList.value.reduce((acc, cur) => acc + (Number(cur.quantity) || 0), 0);
});

const modalSelectedSkuCount = computed(() => {
  return modalSkuList.value.filter(s => (s.quantity || 0) > 0).length;
});

const modalTotalCny = computed(() => {
  return modalSkuList.value.reduce((acc, cur) => acc + ((cur.quantity || 0) * cur.priceCny), 0);
});

const modalTotalKrw = computed(() => {
  return Math.round(modalTotalCny.value * 226.19);
});

function applyOptionChanges() {
  if (!editingItem.value) return;

  const validSkus = modalSkuList.value.filter(s => (s.quantity || 0) > 0);
  if (validSkus.length === 0) {
    alert('최소 1개 이상의 옵션 수량을 입력해 주세요.');
    return;
  }

  // 1. 첫 번째 선택된 옵션으로 현재 행 업데이트
  const firstSku = validSkus[0];
  editingItem.value.sku = firstSku.name;
  editingItem.value.quantity = firstSku.quantity;
  editingItem.value.priceCny = firstSku.priceCny;

  // 2. 추가 선택된 다중 옵션이 있는 경우 새로운 장바구니 행으로 분할 추가
  if (validSkus.length > 1) {
    for (let i = 1; i < validSkus.length; i++) {
      const extraSku = validSkus[i];
      const newRow = {
        ...JSON.parse(JSON.stringify(editingItem.value)),
        id: `cart-sku-${Date.now()}-${i}`,
        sku: extraSku.name,
        quantity: extraSku.quantity,
        priceCny: extraSku.priceCny
      };
      cartItems.value.push(newRow);
      selectedItemIds.value.push(newRow.id);
    }
  }

  saveCartToStorage();
  closeOptionModal();
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
// 주문 발주 신청 (Order Submission)
// ---------------------------------------------------------
async function submitSelectedOrder() {
  const targetItems = selectedItems.value;
  if (targetItems.length === 0) {
    alert('발주 신청할 상품을 먼저 선택해 주세요.');
    return;
  }

  const dateCompact = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `EUC-${dateCompact}-${randomSuffix}`;

  // 로그인된 사용자 정보 활용 (fallback: 기본 바이어 정보)
  const user = currentUser.value;
  const buyerInfo = {
    companyName: user?.companyName || user?.company_name || '이유씨 글로벌 바이어',
    buyerName: user?.name || user?.displayName || '이유씨 바이어',
    phone: user?.phone || '010-9373-1214',
    email: user?.email || 'buyer@euchs.com',
    customsCode: user?.customsCode || user?.pccc || 'P240012345678',
    address: user?.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층',
    memo: '한·중 FTA C/O 신청 | 정밀검수 신청'
  };

  const newOrder = {
    id: `ord-${Date.now()}`,
    orderNumber,
    inboundNo: `INB-YW-${dateCompact}-${randomSuffix}`,
    createdAt: new Date().toLocaleString('ko-KR'),
    status: 'quote_pending',
    buyerInfo,
    items: targetItems.map(it => ({
      productName: it.titleKo || it.productName,
      imageUrl: it.imageUrl,
      sku: it.sku,
      quantity: it.quantity || 1,
      priceCny: it.priceCny,
      cbm: 0
    })),
    totalPriceKrw: targetItems.reduce((sum, it) => sum + getItemSubtotalKrw(it), 0),
    totalPriceRmb: targetItems.reduce((sum, it) => sum + ((it.quantity || 1) * it.priceCny), 0)
  };

  // 1. Supabase orders 테이블 및 전역 orderStorage에 동기화 저장
  try {
    await saveNewOrder(newOrder);
  } catch (e) {
    console.warn('saveNewOrder error:', e);
  }

  // 2. applications 테이블 호환 백업 insert
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('applications').insert([{
        service_type: 'purchasing',
        service_name: '1688 구매대행',
        customer_name: buyerInfo.buyerName,
        phone: buyerInfo.phone,
        email: buyerInfo.email,
        status: 'quote_pending',
        details: {
          orderId: orderNumber,
          items: newOrder.items,
          customsCode: buyerInfo.customsCode
        }
      }]);
    } catch (e) {}
  }

  // 3. 선택된 품목 장바구니에서 제거
  cartItems.value = cartItems.value.filter(it => !selectedItemIds.value.includes(it.id));
  selectedItemIds.value = [];
  saveCartToStorage();

  alert(`선택된 ${targetItems.length}개 품목의 발주 신청이 정상 접수되었습니다!\n(발주번호: ${orderNumber})\n주문/발주 통합 관리 화면으로 이동합니다.`);
  router.push('/dashboard/orders?tab=quote');
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
