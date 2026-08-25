<template>
  <div class="space-y-5">

    <!-- ===================================================== -->
    <!-- 페이지 헤더 -->
    <!-- ===================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">PRODUCT LIST</span>
          <h1 class="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">📋 상품리스트</h1>
        </div>
        <p class="text-xs text-gray-500">1688 소싱 상품을 등록·분류·관리합니다. 총 <strong class="text-gray-900 font-mono">{{ items.length }}</strong>개</p>
      </div>

      <!-- 상단 액션 버튼 그룹 -->
      <div class="flex flex-wrap items-center gap-2">

        <!-- 전체선택 체크박스 -->
        <label class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition select-none">
          <input type="checkbox"
            :checked="selectedIds.length === items.length && items.length > 0"
            @change="toggleSelectAll"
            class="w-3.5 h-3.5 accent-orange-500"
          />
          전체선택
        </label>

        <!-- ★ 상품등록 ▾ 드롭다운 -->
        <div class="relative" ref="registerDropRef">
          <button
            type="button"
            @click="isRegisterDropOpen = !isRegisterDropOpen"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-sm transition cursor-pointer active:scale-95"
          >
            <span>상품등록</span>
            <span class="text-[10px]">▾</span>
          </button>
          <!-- 드롭다운 패널 -->
          <Transition name="dropdown-fade">
            <div
              v-if="isRegisterDropOpen"
              class="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <button type="button" @click="openUrlModal" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition cursor-pointer">
                <span>🔗</span><span>간편 URL 등록</span>
              </button>
              <button type="button" @click="openBulkExcelModal" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition cursor-pointer border-y border-orange-100">
                <span>📊</span><span>대량 EXCEL 등록</span>
              </button>
              <button type="button" @click="isRegisterDropOpen = false" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer">
                <span>🏪</span><span>오프라인 등록</span>
              </button>
              <button type="button" @click="isRegisterDropOpen = false" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer">
                <span>📦</span><span>세트상품 등록</span>
              </button>
              <button type="button" @click="isRegisterDropOpen = false" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer">
                <span>🏷️</span><span>식검스티커 업로드</span>
              </button>
            </div>
          </Transition>
        </div>

        <!-- 상품다운로드 ▾ -->
        <button
          type="button"
          :disabled="selectedIds.length === 0"
          @click="downloadSelected"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer disabled:opacity-40 active:scale-95"
        >
          <span>📥</span><span>상품다운로드</span><span class="text-[10px]">▾</span>
        </button>

        <!-- 카테고리 설정 -->
        <button
          type="button"
          :disabled="selectedIds.length === 0"
          @click="openCategoryBatchModal"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-purple-50 hover:border-purple-200 text-gray-700 hover:text-purple-700 font-bold text-xs transition cursor-pointer disabled:opacity-40 active:scale-95"
        >
          <span>📂</span><span>카테고리 설정</span>
        </button>

        <!-- 삭제 -->
        <button
          type="button"
          :disabled="selectedIds.length === 0"
          @click="deleteSelected"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs transition cursor-pointer disabled:opacity-40 active:scale-95"
        >
          <span>🗑️</span><span>삭제</span>
        </button>
      </div>
    </div>

    <!-- 필터 바 -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-xs">
        <span class="text-gray-400 text-xs">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="상품명 검색..."
          class="w-40 text-xs outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>
      <select v-model="categoryFilter" class="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20">
        <option value="">전체 카테고리</option>
        <option v-for="cat in allCategories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <span class="text-xs text-gray-400 ml-auto">{{ filteredItems.length }}개 표시</span>
    </div>

    <!-- 상품 테이블 -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div v-if="filteredItems.length === 0" class="py-20 text-center">
        <div class="text-5xl mb-4">📦</div>
        <p class="text-sm font-bold text-gray-400 mb-2">등록된 상품이 없습니다</p>
        <p class="text-xs text-gray-400">상단의 [상품등록 ▾] 버튼을 눌러 상품을 추가하세요.</p>
        <button
          type="button"
          @click="openBulkExcelModal"
          class="mt-5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition cursor-pointer shadow-sm"
        >📊 대량 EXCEL 등록</button>
      </div>
      <table v-else class="w-full text-xs">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="py-2.5 px-3 text-center w-8">
              <input type="checkbox"
                :checked="selectedIds.length === filteredItems.length && filteredItems.length > 0"
                @change="toggleSelectAll"
                class="w-3.5 h-3.5 accent-orange-500 cursor-pointer"
              />
            </th>
            <th class="py-2.5 px-3 text-left font-bold text-gray-600">상품명</th>
            <th class="py-2.5 px-3 text-left font-bold text-gray-600 hidden sm:table-cell">카테고리</th>
            <th class="py-2.5 px-3 text-center font-bold text-gray-600">수량</th>
            <th class="py-2.5 px-3 text-center font-bold text-gray-600 hidden md:table-cell">단가(¥)</th>
            <th class="py-2.5 px-3 text-center font-bold text-gray-600">상태</th>
            <th class="py-2.5 px-3 text-center font-bold text-gray-600">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-orange-50/30 transition">
            <td class="py-2.5 px-3 text-center">
              <input type="checkbox"
                :checked="selectedIds.includes(item.id)"
                @change="toggleSelect(item.id)"
                class="w-3.5 h-3.5 accent-orange-500 cursor-pointer"
              />
            </td>
            <td class="py-2.5 px-3">
              <div class="flex items-center gap-2.5">
                <img v-if="item.imageUrl" :src="item.imageUrl" class="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                <div v-else class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 text-lg">📦</div>
                <div class="min-w-0">
                  <div class="font-bold text-gray-900 truncate max-w-[200px]">{{ item.productName || item.name }}</div>
                  <div class="text-gray-400 truncate max-w-[200px] text-[11px]">{{ item.sku || item.selectedOption || '옵션 미선택' }}</div>
                </div>
              </div>
            </td>
            <td class="py-2.5 px-3 hidden sm:table-cell">
              <span v-if="item.category" class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[11px]">{{ item.category }}</span>
              <span v-else class="text-gray-300">-</span>
            </td>
            <td class="py-2.5 px-3 text-center font-mono font-bold text-gray-800">{{ item.quantity || 1 }}</td>
            <td class="py-2.5 px-3 text-center font-mono text-gray-700 hidden md:table-cell">
              {{ item.priceCny ? '¥' + Number(item.priceCny).toFixed(2) : '-' }}
            </td>
            <td class="py-2.5 px-3 text-center">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">대기</span>
            </td>
            <td class="py-2.5 px-3 text-center">
              <button type="button" @click="removeItem(item.id)" class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition cursor-pointer" title="삭제">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===================================================== -->
    <!-- CN인사이더 스타일 EXCEL 상품추가 모달 -->
    <!-- ===================================================== -->
    <Transition name="modal-fade">
      <div v-if="isBulkExcelModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="closeBulkExcelModal">
        <div class="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden">

          <!-- 모달 헤더 -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="font-extrabold text-gray-900 text-base">EXCEL 상품추가</h3>
            <button @click="closeBulkExcelModal" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer text-xl leading-none">✕</button>
          </div>

          <!-- 모달 본문 -->
          <div class="p-6 space-y-5">
            <!-- 상품정보 다운로드 섹션 -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-extrabold text-gray-800 mb-0.5">상품정보</div>
                  <div class="text-[11px] text-gray-500">표준 양식을 내려받아 상품 정보를 작성하세요.</div>
                </div>
                <button
                  type="button"
                  @click="handleDownloadTemplate"
                  class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <span>📥</span>
                  <span>EXCEL 양식 다운로드</span>
                </button>
              </div>
            </div>

            <!-- 파일 업로드 드래그앤드롭 영역 -->
            <div>
              <div
                class="border-2 border-dashed rounded-xl transition-all"
                :class="bulkDragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400 bg-white'"
                @dragover.prevent="bulkDragOver = true"
                @dragleave="bulkDragOver = false"
                @drop.prevent="onBulkFileDrop"
                style="min-height: 160px; display: flex; align-items: center; justify-content: center;"
              >
                <!-- 파일 미선택 상태 -->
                <div v-if="!bulkParsedItems.length" class="text-center space-y-3 p-8">
                  <div class="text-4xl">📂</div>
                  <p class="text-sm font-bold text-gray-500">파일을 여기로 끌어오거나,</p>
                  <label class="cursor-pointer inline-block">
                    <span class="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition border border-gray-200">업로드</span>
                    <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onBulkFileSelect" />
                  </label>
                  <p class="text-[11px] text-gray-400">업로드 파일은 최대 20M 초과할 수 없습니다.</p>
                </div>
                <!-- 파싱 완료 상태 -->
                <div v-else class="w-full p-5">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-extrabold text-emerald-700">✅ {{ bulkParsedItems.length }}개 상품 파싱 완료</span>
                    <button type="button" @click="bulkParsedItems = []" class="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">다시 선택</button>
                  </div>
                  <div class="max-h-36 overflow-y-auto space-y-1">
                    <div v-for="(item, i) in bulkParsedItems" :key="i"
                      class="flex items-center gap-2 p-2 bg-white rounded-lg text-xs border border-gray-100"
                    >
                      <span class="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-black text-[10px] flex items-center justify-center shrink-0">{{ i+1 }}</span>
                      <span class="font-bold text-gray-800 truncate flex-1">{{ item.productName }}</span>
                      <span class="text-gray-400 shrink-0">{{ item.quantity }}개</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 모달 푸터 -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button @click="closeBulkExcelModal" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">취소</button>
            <button
              @click="submitBulkExcel"
              :disabled="!bulkParsedItems.length"
              class="px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs transition cursor-pointer shadow-sm"
            >📤 {{ bulkParsedItems.length }}개 상품 등록</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===================================================== -->
    <!-- 카테고리 일괄 설정 모달 -->
    <!-- ===================================================== -->
    <Transition name="modal-fade">
      <div v-if="isCategoryBatchModalOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="isCategoryBatchModalOpen = false">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <h3 class="font-extrabold text-gray-900 text-sm">📂 카테고리 일괄 설정</h3>
            <button @click="isCategoryBatchModalOpen = false" class="p-1.5 rounded-lg hover:bg-purple-100 text-gray-500 transition cursor-pointer text-xl leading-none">✕</button>
          </div>
          <div class="p-6 space-y-4 text-xs">
            <p class="text-gray-500">선택된 <strong class="text-gray-900">{{ selectedIds.length }}개</strong> 상품에 카테고리를 일괄 지정합니다.</p>
            <div>
              <label class="block font-bold text-gray-700 mb-1">카테고리 입력</label>
              <input
                v-model="batchCategoryInput"
                type="text"
                placeholder="예: 생활용품, 가전, 의류/패션"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-xs"
                list="spv-cat-list"
              />
              <datalist id="spv-cat-list">
                <option v-for="cat in PRESET_CATEGORIES" :key="cat" :value="cat" />
              </datalist>
            </div>
          </div>
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button @click="isCategoryBatchModalOpen = false" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">취소</button>
            <button
              @click="applyBatchCategory"
              :disabled="!batchCategoryInput.trim()"
              class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs transition cursor-pointer"
            >✅ 적용</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 간편 URL 등록 모달 -->
    <Transition name="modal-fade">
      <div v-if="isUrlModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="isUrlModalOpen = false">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="font-extrabold text-gray-900 text-sm">🔗 간편 URL 등록</h3>
            <button @click="isUrlModalOpen = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer text-xl leading-none">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1.5">1688 상품 URL</label>
              <input
                v-model="urlInput"
                type="url"
                placeholder="https://detail.1688.com/offer/..."
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">수량</label>
                <input v-model.number="urlQty" type="number" min="1" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">카테고리</label>
                <input v-model="urlCategory" type="text" placeholder="(선택)" list="spv-cat-list" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
              </div>
            </div>
          </div>
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button @click="isUrlModalOpen = false" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">취소</button>
            <button @click="submitUrlItem" :disabled="!urlInput.trim()" class="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs transition cursor-pointer">등록</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { downloadBulkOrderTemplate, parseOrderExcel } from '@/utils/excelHandler';
import { getStoredOrders, saveStoredOrders } from '@/utils/orderStorage';

// ─── 프리셋 카테고리 ──────────────────────────────────────
const PRESET_CATEGORIES = [
  '가전/생활용품', '의류/패션', '주방/식기', '뷰티/헬스',
  '완구/스포츠', '사무/문구', '식품/음료', '자동차용품', '기타',
];

// ─── 상품 목록 State ──────────────────────────────────────
const items = ref([]);
const selectedIds = ref([]);
const searchQuery = ref('');
const categoryFilter = ref('');

// ─── 필터링 ───────────────────────────────────────────────
const allCategories = computed(() => {
  const cats = items.value.map(i => i.category).filter(Boolean);
  return [...new Set(cats)];
});
const filteredItems = computed(() => {
  let list = items.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(i => (i.productName || i.name || '').toLowerCase().includes(q));
  }
  if (categoryFilter.value) list = list.filter(i => i.category === categoryFilter.value);
  return list;
});

// ─── 선택 관리 ────────────────────────────────────────────
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}
function toggleSelectAll() {
  if (selectedIds.value.length === filteredItems.value.length) selectedIds.value = [];
  else selectedIds.value = filteredItems.value.map(i => i.id);
}

// ─── 상품 삭제 ────────────────────────────────────────────
function removeItem(id) {
  items.value = items.value.filter(i => i.id !== id);
  selectedIds.value = selectedIds.value.filter(sid => sid !== id);
  persistItems();
}
function deleteSelected() {
  if (!selectedIds.value.length) return;
  if (!confirm(`선택한 ${selectedIds.value.length}개 상품을 삭제하시겠습니까?`)) return;
  items.value = items.value.filter(i => !selectedIds.value.includes(i.id));
  selectedIds.value = [];
  persistItems();
}

// ─── 엑셀 다운로드 (선택 상품) ───────────────────────────
function downloadSelected() {
  alert('선택된 상품 엑셀 다운로드 기능은 추후 지원 예정입니다.');
}

// ─── 데이터 영속성 (localStorage) ───────────────────────
function persistItems() {
  try { localStorage.setItem('euchs_sourcing_products', JSON.stringify(items.value)); } catch {}
}
function loadItems() {
  try {
    const raw = localStorage.getItem('euchs_sourcing_products');
    if (raw) items.value = JSON.parse(raw);
  } catch {}
}

// ─── 등록 드롭다운 ────────────────────────────────────────
const isRegisterDropOpen = ref(false);
const registerDropRef = ref(null);
function closeDropOnOutside(e) {
  if (registerDropRef.value && !registerDropRef.value.contains(e.target)) isRegisterDropOpen.value = false;
}

// ─── EXCEL 상품추가 모달 ──────────────────────────────────
const isBulkExcelModalOpen = ref(false);
const bulkParsedItems = ref([]);
const bulkDragOver = ref(false);

function openBulkExcelModal() {
  isRegisterDropOpen.value = false;
  bulkParsedItems.value = [];
  isBulkExcelModalOpen.value = true;
}
function closeBulkExcelModal() { isBulkExcelModalOpen.value = false; }

function handleDownloadTemplate() {
  try { downloadBulkOrderTemplate(); }
  catch (e) { alert('양식 다운로드 실패: ' + e.message); }
}
async function parseBulkFile(file) {
  try {
    const parsed = await parseOrderExcel(file);
    bulkParsedItems.value = parsed;
  } catch (e) { alert('파싱 실패: ' + e.message); }
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
function submitBulkExcel() {
  if (!bulkParsedItems.value.length) return;
  const newItems = bulkParsedItems.value.map(item => ({
    id: `sp-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    productName: item.productName || '1688 상품',
    name: item.productName || '1688 상품',
    productUrl: item.productUrl || '',
    imageUrl: item.imageUrl || '',
    sku: item.sku || item.selectedOption || '기본',
    quantity: item.quantity || 1,
    priceCny: item.priceCny || 0,
    category: item.category || '',
    remark: item.remark || '',
  }));
  items.value = [...newItems, ...items.value];
  persistItems();
  closeBulkExcelModal();
  alert(`✅ ${newItems.length}개 상품이 상품리스트에 추가되었습니다.`);
}

// ─── 카테고리 일괄 설정 모달 ──────────────────────────────
const isCategoryBatchModalOpen = ref(false);
const batchCategoryInput = ref('');
function openCategoryBatchModal() {
  if (!selectedIds.value.length) { alert('카테고리를 설정할 상품을 먼저 선택하세요.'); return; }
  batchCategoryInput.value = '';
  isCategoryBatchModalOpen.value = true;
}
function applyBatchCategory() {
  const cat = batchCategoryInput.value.trim();
  if (!cat) return;
  items.value = items.value.map(item =>
    selectedIds.value.includes(item.id) ? { ...item, category: cat } : item
  );
  persistItems();
  isCategoryBatchModalOpen.value = false;
}

// ─── 간편 URL 등록 모달 ───────────────────────────────────
const isUrlModalOpen = ref(false);
const urlInput = ref('');
const urlQty = ref(1);
const urlCategory = ref('');
function openUrlModal() {
  isRegisterDropOpen.value = false;
  urlInput.value = ''; urlQty.value = 1; urlCategory.value = '';
  isUrlModalOpen.value = true;
}
function submitUrlItem() {
  if (!urlInput.value.trim()) return;
  const newItem = {
    id: `sp-url-${Date.now()}`,
    productName: '1688 URL 등록 상품',
    productUrl: urlInput.value.trim(),
    sku: '기본',
    quantity: urlQty.value || 1,
    priceCny: 0,
    category: urlCategory.value.trim(),
  };
  items.value = [newItem, ...items.value];
  persistItems();
  isUrlModalOpen.value = false;
}

// ─── 라이프사이클 ─────────────────────────────────────────
onMounted(() => {
  loadItems();
  document.addEventListener('click', closeDropOnOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', closeDropOnOutside);
});
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
