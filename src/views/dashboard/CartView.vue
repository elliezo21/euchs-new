<template>
  <div class="space-y-6 pb-24">
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
              <th class="py-3.5 px-4 text-center">옵션 / 규격</th>
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

              <!-- 2. 상품 정보 (외부 링크 전면 제거, 깔끔한 썸네일 + 제목) -->
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
                    <div class="text-[11px] text-gray-400 font-mono">
                      상품 고유코드: <b class="text-gray-600">{{ item.itemId || item.id }}</b>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 3. 옵션 / 규격 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <span class="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-gray-800 font-medium text-[11px] max-w-[150px] truncate">
                  {{ item.sku || item.selectedOption || (item.skus?.[0]?.color ? `${item.skus[0].color} / ${item.skus[0].size}` : '기본 옵션') }}
                </span>
              </td>

              <!-- 4. 발주 수량 조절 Stepper (+/-) -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <button
                    type="button"
                    @click="decreaseQty(item)"
                    class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition font-bold"
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
                    class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition font-bold"
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
                  class="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition font-bold text-[11px] flex items-center gap-1 mx-auto active:scale-95"
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
                <p class="text-sm font-bold text-gray-700">장바구니에 담긴 상품이 없습니다.</p>
                <p class="text-xs text-gray-400 mt-1">1688 소싱몰에서 원하는 상품을 찾아 장바구니에 담아보세요.</p>
                <router-link
                  to="/mall"
                  class="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-sm active:scale-95"
                >
                  <Plus class="w-4 h-4" />
                  <span>1688 소싱몰 바로가기</span>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 하단 고정 종합 액션 바 (Sticky Bottom Action Bar) -->
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
            class="text-gray-500 hover:text-rose-600 font-bold transition disabled:opacity-40 disabled:hover:text-gray-500 flex items-center gap-1"
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
  Send
} from 'lucide-vue-next';
import { exportQuoteExcel } from '@/utils/excelExport';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const router = useRouter();

const searchQuery = ref('');
const sortBy = ref('latest');
const selectedItemIds = ref([]);
const cartItems = ref([]);

// 기본 샘플 장바구니 데이터셋 (로컬 스토리지에 데이터가 없을 때 폴백)
const defaultSampleCart = [
  {
    id: 'cart-001',
    itemId: '7234910238',
    titleKo: '2026 초경량 미니 무선 에어건 120,000RPM 차량/키보드 청소용',
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=160&auto=format&fit=crop&q=80',
    priceCny: 32.5,
    quantity: 50,
    sku: '매트 블랙 풀세트'
  },
  {
    id: 'cart-002',
    itemId: '6948201948',
    titleKo: '실리콘 접이식 휴대용 텀블러 보온보냉 550ml 캠핑용',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=160&auto=format&fit=crop&q=80',
    priceCny: 9.8,
    quantity: 100,
    sku: '밀크베이지 / 카라비너 포함'
  },
  {
    id: 'cart-003',
    itemId: '7102938472',
    titleKo: '자석 부착형 3색 변환 LED 무선 센서등 침실/드레스룸용 40cm',
    imageUrl: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=160&auto=format&fit=crop&q=80',
    priceCny: 7.2,
    quantity: 200,
    sku: '40cm 실버 / 3색 변환'
  }
];

// ---------------------------------------------------------
// 데이터 로드 & 스토리지 동기화
// ---------------------------------------------------------
const loadCartItems = () => {
  try {
    const raw = localStorage.getItem('euchs_erp_saved_items');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cartItems.value = parsed.map((it, idx) => ({
          id: it.id || `cart-${idx}-${Date.now()}`,
          itemId: it.itemId || it.id || '1688-item',
          titleKo: it.titleKo || it.productName || it.titleZh || '1688 소싱 품목',
          titleZh: it.titleZh || '',
          imageUrl: it.imageUrl || it.thumbnail,
          priceCny: Number(it.priceCny || it.price || 15),
          quantity: Math.max(1, Number(it.quantity || it.minOrder || 10)),
          sku: it.sku || it.selectedOption || (it.skus?.[0]?.color ? `${it.skus[0].color} / ${it.skus[0].size}` : '기본 옵션')
        }));
        // 초기 로드 시 전체 선택 기본값
        if (selectedItemIds.value.length === 0) {
          selectedItemIds.value = cartItems.value.map(it => it.id);
        }
        return;
      }
    }
    cartItems.value = [...defaultSampleCart];
    if (selectedItemIds.value.length === 0) {
      selectedItemIds.value = cartItems.value.map(it => it.id);
    }
  } catch (e) {
    console.warn('Load cart items error:', e);
  }
};

const saveCartToStorage = () => {
  localStorage.setItem('euchs_erp_saved_items', JSON.stringify(cartItems.value));
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

  const newOrder = {
    id: `ord-${Date.now()}`,
    orderNumber,
    createdAt: new Date().toLocaleString('ko-KR'),
    status: 'quote_pending',
    buyerInfo: {
      companyName: '이유씨 글로벌 바이어',
      buyerName: '이유씨 바이어',
      phone: '010-9373-1214',
      email: 'buyer@euchs.com',
      customsCode: 'P240012345678',
      address: '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층',
      memo: '한·중 FTA C/O 신청 | 정밀검수 신청'
    },
    items: targetItems.map(it => ({
      productName: it.titleKo,
      imageUrl: it.imageUrl,
      sku: it.sku,
      quantity: it.quantity || 1,
      priceCny: it.priceCny
    }))
  };

  // 1. Supabase insert
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('applications').insert([{
        service_type: 'purchasing',
        service_name: '1688 구매대행',
        customer_name: newOrder.buyerInfo.buyerName,
        company_name: newOrder.buyerInfo.companyName,
        phone: newOrder.buyerInfo.phone,
        email: newOrder.buyerInfo.email,
        status: 'quote_pending',
        details: {
          orderId: orderNumber,
          items: newOrder.items,
          customsCode: newOrder.buyerInfo.customsCode
        }
      }]);
    } catch (e) {
      console.warn('Supabase order submit error:', e);
    }
  }

  // 2. LocalStorage order list update
  try {
    const raw = localStorage.getItem('euchs_erp_submitted_orders');
    const orders = raw ? JSON.parse(raw) : [];
    orders.unshift(newOrder);
    localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(orders));

    // 선택된 품목 장바구니에서 제거
    cartItems.value = cartItems.value.filter(it => !selectedItemIds.value.includes(it.id));
    selectedItemIds.value = [];
    saveCartToStorage();
  } catch (e) {
    console.warn('LocalStorage order submit error:', e);
  }

  // 3. 글로벌 이벤트 통지
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('euchs-order-status-update', {
    detail: { appId: newOrder.id, status: 'quote_pending' }
  }));

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
  loadCartItems();
  window.addEventListener('storage', loadCartItems);
});
</script>
