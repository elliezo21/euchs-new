<template>
  <div class="space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 & 상단 메트릭/액션 영역 -->
    <!-- ======================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-xs font-black tracking-wide border border-amber-500/20">
            SOURCING DB
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            내 소싱 상품 보관함 (사입 후보 DB)
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          1688 소싱몰에서 찜하거나 수집한 상품을 관리하고, 스마트스토어/쿠팡 등록용 마진 계산 및 원클릭 발주 견적을 신청합니다.
        </p>
      </div>

      <!-- 상단 액션 버튼 그룹 -->
      <div class="flex flex-wrap items-center gap-2">
        <router-link
          to="/mall"
          class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <Plus class="w-4 h-4" />
          <span>1688 상품 추가 소싱하기</span>
        </router-link>

        <button
          type="button"
          @click="exportSourcingExcel"
          :disabled="sourcingItems.length === 0"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>소싱 DB 엑셀 다운로드</span>
        </button>

        <button
          type="button"
          @click="orderSelectedItems"
          :disabled="selectedItemIds.length === 0"
          class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <ShoppingCart class="w-4 h-4 text-amber-400" />
          <span>선택 품목 일괄 발주 ({{ selectedItemIds.length }})</span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 통계 요약 카드 4종 -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. 보관함 품목수 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-gray-500">보관 품목수</span>
          <div class="text-2xl font-extrabold text-gray-900 font-mono">
            {{ sourcingItems.length }} <span class="text-xs font-normal text-gray-500">개</span>
          </div>
          <p class="text-[11px] text-gray-400">사입 후보 스크랩 DB</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Boxes class="w-5 h-5" />
        </div>
      </div>

      <!-- 2. 평균 예상 마진율 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-emerald-700">평균 마진율 (예상)</span>
          <div class="text-2xl font-extrabold text-emerald-600 font-mono">
            42.8%
          </div>
          <p class="text-[11px] text-emerald-600/70">네이버/쿠팡 판매 기준</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <TrendingUp class="w-5 h-5" />
        </div>
      </div>

      <!-- 3. 실시간 적용 환율 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-blue-700">적용 기준 환율</span>
          <div class="text-2xl font-extrabold text-blue-600 font-mono">
            ₩226.19
          </div>
          <p class="text-[11px] text-blue-600/70">1 RMB (위안화)</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Coins class="w-5 h-5" />
        </div>
      </div>

      <!-- 4. 즉시 발주 가능 -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold text-purple-700">즉시 발주 가능</span>
          <div class="text-2xl font-extrabold text-purple-600 font-mono">
            {{ sourcingItems.length }} <span class="text-xs font-normal text-gray-500">건</span>
          </div>
          <p class="text-[11px] text-purple-600/70">1688 재고 연동 완료</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <CheckCircle2 class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 검색 및 마진 설정 툴바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="상품명, 1688 상품 ID, 카테고리 검색"
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap text-xs">
        <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-600">
          <span class="font-bold">목표 마진율:</span>
          <select v-model="targetMarginRate" class="bg-transparent font-bold text-amber-600 outline-none cursor-pointer">
            <option :value="0.30">30% (박리다매)</option>
            <option :value="0.40">40% (추천 기본)</option>
            <option :value="0.50">50% (고마진)</option>
            <option :value="0.60">60% (프리미엄)</option>
          </select>
        </div>

        <select
          v-model="sortBy"
          class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
        >
          <option value="latest">최근 담은순</option>
          <option value="priceLow">1688 단가 낮은순</option>
          <option value="priceHigh">1688 단가 높은순</option>
          <option value="profitHigh">예상 순이익 높은순</option>
        </select>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 소싱 상품 목록 데이터 테이블 -->
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
              <th class="py-3.5 px-4">1688 상품 정보</th>
              <th class="py-3.5 px-4 text-center">최소발주(MOQ) / 규격</th>
              <th class="py-3.5 px-4 text-right">1688 공장가 (CNY/KRW)</th>
              <th class="py-3.5 px-4 text-right">추천 판매가 (예상마진)</th>
              <th class="py-3.5 px-4 text-right">개당 예상 순익</th>
              <th class="py-3.5 px-4 text-center">소싱 관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="hover:bg-slate-50/80 transition group"
            >
              <!-- 체크박스 -->
              <td class="py-3.5 px-4 text-center">
                <input
                  type="checkbox"
                  v-model="selectedItemIds"
                  :value="item.id"
                  class="rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </td>

              <!-- 1688 상품 정보 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3 min-w-[280px]">
                  <img
                    :src="item.imageUrl || item.thumbnail || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'"
                    :alt="item.titleKo || item.productName"
                    class="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0"
                    @error="handleImgError"
                  />
                  <div class="space-y-0.5 flex-1 min-w-0">
                    <div class="font-bold text-gray-900 line-clamp-1 group-hover:text-amber-600 transition">
                      {{ item.titleKo || item.productName || item.titleZh }}
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                      <span>ID: {{ item.itemId || item.id || '71234567' }}</span>
                      <a
                        v-if="item.productUrl || item.detailUrl"
                        :href="item.productUrl || item.detailUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-amber-600 hover:underline flex items-center gap-0.5"
                        @click.stop
                      >
                        <span>1688 원본</span>
                        <ExternalLink class="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </td>

              <!-- MOQ / 규격 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="text-gray-900 font-bold font-mono">
                  MOQ {{ item.minOrder || item.quantity || 10 }}개
                </div>
                <div class="text-[11px] text-gray-500 truncate max-w-[120px] mx-auto">
                  {{ item.sku || item.selectedOption || '기본 색상/규격' }}
                </div>
              </td>

              <!-- 1688 공장 단가 (CNY / KRW) -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                <div class="text-xs font-bold text-gray-900">
                  ¥{{ Number(item.priceCny || item.price || 15).toFixed(2) }}
                </div>
                <div class="text-[11px] text-gray-400">
                  약 ₩{{ formatNumber(Math.round((Number(item.priceCny || item.price || 15)) * 226.19)) }}원
                </div>
              </td>

              <!-- 추천 판매가 (마진율 적용) -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                <div class="text-xs font-bold text-emerald-600">
                  ₩{{ formatNumber(calculateRetailPrice(item)) }}원
                </div>
                <div class="text-[10px] text-emerald-700/70 font-semibold">
                  (마진 {{ (targetMarginRate * 100).toFixed(0) }}% 기준)
                </div>
              </td>

              <!-- 개당 예상 순이익 -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-blue-600">
                +₩{{ formatNumber(calculateNetProfit(item)) }}원
              </td>

              <!-- 액션 버튼 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    @click="requestDirectQuote(item)"
                    class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition active:scale-95 flex items-center gap-1 shadow-xs"
                    title="해당 상품 즉시 수입 견적 신청"
                  >
                    <Send class="w-3 h-3" />
                    <span>즉시 견적신청</span>
                  </button>

                  <button
                    type="button"
                    @click="removeItem(item.id)"
                    class="p-1.5 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition"
                    title="보관함에서 삭제"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="filteredItems.length === 0">
              <td colspan="7" class="py-16 text-center text-gray-400 text-xs">
                <Boxes class="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p class="font-medium">보관함에 등록된 사입 후보 상품이 없습니다.</p>
                <router-link
                  to="/mall"
                  class="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-xs"
                >
                  <Plus class="w-4 h-4" />
                  <span>1688 소싱몰에서 상품 스크랩하기</span>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Boxes,
  TrendingUp,
  Coins,
  CheckCircle2,
  Search,
  Plus,
  FileSpreadsheet,
  ShoppingCart,
  ExternalLink,
  Send,
  Trash2
} from 'lucide-vue-next';
import { exportQuoteExcel } from '@/utils/excelExport';

const router = useRouter();

const searchQuery = ref('');
const sortBy = ref('latest');
const targetMarginRate = ref(0.40);
const selectedItemIds = ref([]);

// 기본 샘플 소싱 상품 DB (로컬 스토리지에 없을 경우 표시)
const defaultSourcingItems = [
  {
    id: 'src-001',
    itemId: '7234910238',
    titleKo: '2026 초경량 미니 무선 에어건 120,000RPM 차량/키보드 청소용',
    titleZh: '大功率无线车载吸尘器手持除尘枪',
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=160&auto=format&fit=crop&q=80',
    priceCny: 32.5,
    minOrder: 10,
    sku: '매트 블랙 풀세트',
    productUrl: 'https://detail.1688.com'
  },
  {
    id: 'src-002',
    itemId: '6948201948',
    titleKo: '실리콘 접이식 휴대용 텀블러 보온보냉 550ml 캠핑용',
    titleZh: '食品级硅胶折叠咖啡水杯',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=160&auto=format&fit=crop&q=80',
    priceCny: 9.8,
    minOrder: 50,
    sku: '밀크베이지 / 카라비너 포함',
    productUrl: 'https://detail.1688.com'
  },
  {
    id: 'src-003',
    itemId: '7102938472',
    titleKo: '자석 부착형 3색 변환 LED 무선 센서등 침실/드레스룸용 40cm',
    titleZh: '超薄磁吸人体感应夜灯LED衣柜灯',
    imageUrl: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=160&auto=format&fit=crop&q=80',
    priceCny: 7.2,
    minOrder: 100,
    sku: '40cm 실버 / 주광·주백·전구색',
    productUrl: 'https://detail.1688.com'
  },
  {
    id: 'src-004',
    itemId: '6839201928',
    titleKo: '인체공학 저반발 메모리폼 목베개 여행/차량용 수면쿠션',
    titleZh: '慢回弹记忆棉护颈U型枕旅行便携',
    imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=160&auto=format&fit=crop&q=80',
    priceCny: 14.5,
    minOrder: 30,
    sku: '다크 네이비 / 파우치 포함',
    productUrl: 'https://detail.1688.com'
  },
  {
    id: 'src-005',
    itemId: '7392018273',
    titleKo: '감성 우드 코스터 & 티코스터 세트 (너도밤나무 원목)',
    titleZh: '日式实木榉木隔热杯垫茶托套装',
    imageUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=160&auto=format&fit=crop&q=80',
    priceCny: 4.5,
    minOrder: 100,
    sku: '원형 6P 세트 + 거치대',
    productUrl: 'https://detail.1688.com'
  }
];

const sourcingItems = ref([...defaultSourcingItems]);

// ---------------------------------------------------------
// 데이터 로드
// ---------------------------------------------------------
const loadSourcingItems = () => {
  try {
    const raw = localStorage.getItem('euchs_erp_saved_items');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sourcingItems.value = parsed.map((it, idx) => ({
          id: it.id || `src-cached-${idx}`,
          itemId: it.itemId || it.id || '1688-offer',
          titleKo: it.titleKo || it.productName || it.titleZh || '1688 소싱 품목',
          titleZh: it.titleZh || '',
          imageUrl: it.imageUrl || it.thumbnail,
          priceCny: Number(it.priceCny || it.price || 20),
          minOrder: Number(it.minOrder || it.quantity || 10),
          sku: it.sku || it.selectedOption || '기본',
          productUrl: it.productUrl || 'https://detail.1688.com'
        }));
        return;
      }
    }
    sourcingItems.value = [...defaultSourcingItems];
  } catch (e) {
    console.warn('Load sourcing items error:', e);
  }
};

// ---------------------------------------------------------
// 마진 및 추천 판매가 계산
// ---------------------------------------------------------
function calculateCostKrw(item) {
  const cny = Number(item.priceCny || item.price || 15);
  // 공장가(226.19) + 관세(8%) + 부가세(10%) + 물류비/수수료(약 15%) => 약 1.4배
  const estimatedImportCost = cny * 226.19 * 1.35;
  return Math.round(estimatedImportCost);
}

function calculateRetailPrice(item) {
  const cost = calculateCostKrw(item);
  const retail = cost / (1 - targetMarginRate.value);
  return Math.round(retail / 100) * 100;
}

function calculateNetProfit(item) {
  return calculateRetailPrice(item) - calculateCostKrw(item);
}

function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR');
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60';
}

// ---------------------------------------------------------
// 필터링 및 정렬
// ---------------------------------------------------------
const filteredItems = computed(() => {
  let list = [...sourcingItems.value];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(it =>
      (it.titleKo || '').toLowerCase().includes(q) ||
      (it.titleZh || '').toLowerCase().includes(q) ||
      String(it.itemId || '').toLowerCase().includes(q)
    );
  }

  if (sortBy.value === 'priceLow') {
    list.sort((a, b) => Number(a.priceCny || 0) - Number(b.priceCny || 0));
  } else if (sortBy.value === 'priceHigh') {
    list.sort((a, b) => Number(b.priceCny || 0) - Number(a.priceCny || 0));
  } else if (sortBy.value === 'profitHigh') {
    list.sort((a, b) => calculateNetProfit(b) - calculateNetProfit(a));
  }

  return list;
});

// ---------------------------------------------------------
// 체크박스 선택
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
// 액션
// ---------------------------------------------------------
function requestDirectQuote(item) {
  if (confirm(`'${item.titleKo}' 상품을 바로 수입 견적 요청 목록으로 접수하시겠습니까?`)) {
    const existingOrders = JSON.parse(localStorage.getItem('euchs_erp_submitted_orders') || '[]');
    const newOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `EUC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random()*900)}`,
      createdAt: new Date().toLocaleString('ko-KR'),
      status: 'quote_pending',
      items: [
        {
          productName: item.titleKo,
          productUrl: item.productUrl,
          imageUrl: item.imageUrl,
          sku: item.sku,
          quantity: item.minOrder || 10,
          priceCny: item.priceCny
        }
      ]
    };
    existingOrders.unshift(newOrder);
    localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(existingOrders));
    window.dispatchEvent(new Event('storage'));
    alert('수입 견적 요청이 성공적으로 접수되었습니다. 주문/발주 관리 화면으로 이동합니다.');
    router.push('/dashboard/orders?tab=quote');
  }
}

function orderSelectedItems() {
  const selected = sourcingItems.value.filter(it => selectedItemIds.value.includes(it.id));
  if (selected.length === 0) return;

  if (confirm(`선택한 ${selected.length}개 품목을 일괄 발주 견적 신청하시겠습니까?`)) {
    const existingOrders = JSON.parse(localStorage.getItem('euchs_erp_submitted_orders') || '[]');
    const newOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `EUC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random()*900)}`,
      createdAt: new Date().toLocaleString('ko-KR'),
      status: 'quote_pending',
      items: selected.map(it => ({
        productName: it.titleKo,
        productUrl: it.productUrl,
        imageUrl: it.imageUrl,
        sku: it.sku,
        quantity: it.minOrder || 10,
        priceCny: it.priceCny
      }))
    };
    existingOrders.unshift(newOrder);
    localStorage.setItem('euchs_erp_submitted_orders', JSON.stringify(existingOrders));
    window.dispatchEvent(new Event('storage'));
    alert(`선택된 ${selected.length}개 품목의 견적 신청이 완료되었습니다.`);
    router.push('/dashboard/orders?tab=quote');
  }
}

function removeItem(id) {
  if (confirm('해당 상품을 소싱 보관함에서 삭제하시겠습니까?')) {
    sourcingItems.value = sourcingItems.value.filter(it => it.id !== id);
    localStorage.setItem('euchs_erp_saved_items', JSON.stringify(sourcingItems.value));
    window.dispatchEvent(new Event('storage'));
  }
}

function exportSourcingExcel() {
  try {
    const fileName = exportQuoteExcel(
      sourcingItems.value,
      { companyName: '내 소싱 보관함 상품 DB' },
      226.19,
      0.08
    );
    alert(`소싱 상품 DB 엑셀 파일(${fileName})이 다운로드되었습니다.`);
  } catch (e) {
    console.error('Excel export error:', e);
  }
}

onMounted(() => {
  loadSourcingItems();
  window.addEventListener('storage', loadSourcingItems);
});
</script>
