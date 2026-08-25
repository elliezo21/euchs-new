<template>
  <div class="space-y-5 select-none">

    <!-- ======================================================== -->
    <!-- 1. 최상단 시스템 공지 롤링/슬림 배너 (스마트스토어 센터 형태) -->
    <!-- ======================================================== -->
    <div class="bg-amber-50/80 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-xs">
      <div class="flex items-center gap-2 overflow-hidden">
        <span class="px-1.5 py-0.5 rounded bg-amber-500 text-white font-black text-[10px] shrink-0">시스템</span>
        <p class="truncate font-medium text-[11px] sm:text-xs">
          8/29(토) EUCHS 클라우드 DB 및 1688 API 연동망 정기 점검에 따른 일부 기능 이용 제한 안내 (02:00 ~ 06:00)
        </p>
        <span class="text-amber-700/60 text-[11px] font-mono hidden md:inline shrink-0">2026.08.25.</span>
      </div>
      <button
        type="button"
        @click="isNoticeExpanded = !isNoticeExpanded"
        class="text-amber-700 hover:text-amber-900 font-bold text-[11px] flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
      >
        <span>{{ isNoticeExpanded ? '접기 ▲' : '펼치기 ▼' }}</span>
      </button>
    </div>

    <!-- 공지 확장 시 상세 내용 -->
    <div v-if="isNoticeExpanded" class="p-4 bg-white border border-amber-200 rounded-xl text-xs text-slate-700 space-y-2 shadow-xs animate-fade-in">
      <p class="font-bold text-slate-900">📢 2026 하반기 정기 서버 점검 및 중국 세관 EDI 연계 점검</p>
      <p class="text-slate-600 leading-relaxed">
        - 점검 일시: 2026년 8월 29일(토) 02:00 ~ 06:00 (약 4시간)<br />
        - 점검 영향: 1688 자동 소싱 및 관세청 유니패스 실시간 통관 조회 일시 중단<br />
        - 고객 주문 접수는 정상 유지되며 점검 완료 후 순차 자동 반영됩니다.
      </p>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 메인 1열: [발주관리] 와이드 카드 & 우측 서브 위젯 -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- 좌측 2열: 발주·배송 진행 현황 (5단계 프로세스 플로우) -->
      <div class="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 class="text-sm font-black text-slate-900">발주·배송 진행 현황</h3>
            <span class="text-[11px] text-slate-400 font-mono">(실시간 주문 파이프라인)</span>
          </div>

          <div class="flex items-center gap-3">
            <router-link
              to="/admin/orders"
              class="text-blue-600 hover:text-blue-700 hover:underline font-bold text-xs flex items-center gap-0.5"
            >
              <span>주문관리 바로가기</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </router-link>

            <span class="text-slate-300">|</span>

            <button
              type="button"
              @click="reloadStats"
              class="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 font-mono cursor-pointer"
              title="실시간 통계 새로고침"
            >
              <span>{{ lastUpdatedTime }}</span>
              <RefreshCw class="w-3 h-3" :class="isRefreshing ? 'animate-spin' : ''" />
            </button>
          </div>
        </div>

        <!-- 5단계 플로우 박스 (스마트스토어 센터 가로 프로세스) -->
        <div class="grid grid-cols-5 gap-2 text-center py-1">
          <!-- 1. 견적/결제대기 -->
          <router-link
            to="/admin/orders?status=quote_pending"
            class="group p-3 rounded-xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 transition"
          >
            <div class="text-[11px] font-bold text-slate-500 group-hover:text-amber-600 mb-1">견적/결제대기</div>
            <div class="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-amber-600">
              {{ pipelineCounts.newOrder }}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">1~2단계</div>
          </router-link>

          <!-- 2. 1688 구매진행 -->
          <router-link
            to="/admin/orders?status=purchasing"
            class="group p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 transition"
          >
            <div class="text-[11px] font-bold text-slate-500 group-hover:text-blue-600 mb-1">1688 구매진행</div>
            <div class="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-blue-600">
              {{ pipelineCounts.preparing }}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">3~4단계</div>
          </router-link>

          <!-- 3. 창고/선적/통관 -->
          <router-link
            to="/admin/orders?status=warehouse_inspection"
            class="group p-3 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-100 hover:border-teal-200 transition"
          >
            <div class="text-[11px] font-bold text-slate-500 group-hover:text-teal-600 mb-1">창고/선적/통관</div>
            <div class="text-xl sm:text-2xl font-black font-mono text-teal-600">
              {{ pipelineCounts.shipping }}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">5~7단계</div>
          </router-link>

          <!-- 4. 국내택배 인계 -->
          <router-link
            to="/admin/orders?status=domestic_delivered"
            class="group p-3 rounded-xl bg-slate-50 hover:bg-sky-50/50 border border-slate-100 hover:border-sky-200 transition"
          >
            <div class="text-[11px] font-bold text-slate-500 group-hover:text-sky-600 mb-1">국내택배 인계</div>
            <div class="text-xl sm:text-2xl font-black font-mono text-slate-900 group-hover:text-sky-600">
              {{ pipelineCounts.delivered }}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">8단계</div>
          </router-link>

          <!-- 5. 수취 완료 -->
          <router-link
            to="/admin/orders?status=domestic_delivered"
            class="group p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 transition"
          >
            <div class="text-[11px] font-bold text-slate-500 group-hover:text-emerald-600 mb-1">수취 완료</div>
            <div class="text-xl sm:text-2xl font-black font-mono text-emerald-600">
              {{ pipelineCounts.confirmed }}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">배송완료</div>
          </router-link>
        </div>
      </div>

      <!-- 우측 1열: 이우 시장투어 / 신청 현황 위젯 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 class="text-sm font-black text-slate-900">이우 시장투어 조사단</h3>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">모집중</span>
          </div>
          <p class="text-xs text-slate-500 leading-relaxed">
            중국 이우 푸톈시장 1~5구 현지 바이어 동행 소싱 투어 신청 접수 현황입니다.
          </p>
        </div>

        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-[11px] text-slate-400 font-bold">2026년 9월 43기 조사단</div>
            <div class="text-lg font-black text-slate-900 mt-0.5 font-mono">
              7 / 12명 <span class="text-xs text-slate-500 font-normal">(잔여 5석)</span>
            </div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg">
            ✈️
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <router-link
            to="/guide/market-tour"
            target="_blank"
            class="w-full text-center py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs"
          >
            투어 신청 안내 페이지 열기 ↗
          </router-link>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 메인 2열: 4분할 업무 현황 카드 그리드 (화이트 박스 & 컬러 뱃지) -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. 검수관리 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <span>⛔ 검수관리 (이우 WMS)</span>
            </span>
            <router-link to="/admin/warehouse" class="text-[11px] text-blue-600 hover:underline font-bold">이동 ➔</router-link>
          </div>
          <div class="mt-3 space-y-2 text-xs">
            <div class="flex justify-between items-center text-slate-600">
              <span>입고 & 검수전</span>
              <span class="font-bold font-mono text-slate-900">{{ warehouseCounts.pending }}건</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>정밀검수 진행중</span>
              <span class="font-bold font-mono text-orange-600">{{ warehouseCounts.inspecting }}건</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>실측·계근 완료</span>
              <span class="font-bold font-mono text-emerald-600">{{ warehouseCounts.weighed }}건</span>
            </div>
          </div>
        </div>
        <div class="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>불량 발생률</span>
          <span class="text-emerald-600 font-bold">0.4% (양호)</span>
        </div>
      </div>

      <!-- 2. 통관관리 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <span>❗ 세관 통관 관리</span>
            </span>
            <router-link to="/admin/orders" class="text-[11px] text-blue-600 hover:underline font-bold">이동 ➔</router-link>
          </div>
          <div class="mt-3 space-y-2 text-xs">
            <div class="flex justify-between items-center text-slate-600">
              <span>통관 진행중 (유니패스)</span>
              <span class="font-bold font-mono text-slate-900">{{ customsCounts.inProgress }}건</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>관·부가세 결제확인</span>
              <span class="font-bold font-mono text-blue-600">{{ customsCounts.taxPending }}건</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>통관 승인 / 반출</span>
              <span class="font-bold font-mono text-emerald-600">{{ customsCounts.cleared }}건</span>
            </div>
          </div>
        </div>
        <div class="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>평균 소요일</span>
          <span class="text-slate-700 font-bold">평택항 1.8일</span>
        </div>
      </div>

      <!-- 3. OEM&ODM 무역대행 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <span>🏬 OEM·ODM 무역대행</span>
            </span>
            <span class="text-[10px] text-slate-400 font-mono">B2B 생산</span>
          </div>
          <div class="mt-3 space-y-2 text-xs">
            <div class="flex justify-between items-center text-slate-600">
              <span>신규 의뢰 문의</span>
              <span class="font-bold font-mono text-slate-900">3건</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>공장 견적 협의중</span>
              <span class="font-bold font-mono text-blue-600">11건</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>샘플 제작 & 승인</span>
              <span class="font-bold font-mono text-purple-600">2건</span>
            </div>
          </div>
        </div>
        <div class="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>당월 계약 체결</span>
          <span class="text-blue-600 font-bold">4건 (₩8,400만)</span>
        </div>
      </div>

      <!-- 4. 방문자 통계 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <span>💬 플랫폼 방문자 통계</span>
            </span>
            <span class="text-[10px] text-emerald-600 font-bold font-mono">● LIVE</span>
          </div>
          <div class="mt-3 space-y-2 text-xs">
            <div class="flex justify-between items-center text-slate-600">
              <span>오늘 방문자</span>
              <span class="font-bold font-mono text-slate-900">142명</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>이번 달 누적 바이어</span>
              <span class="font-bold font-mono text-blue-600">3,890명</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
              <span>전체 누적 조회수</span>
              <span class="font-bold font-mono text-slate-900">28,450회</span>
            </div>
          </div>
        </div>
        <div class="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>전주 대비 증가</span>
          <span class="text-emerald-600 font-bold">+18.4% ▲</span>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 메인 3열: [문의·리뷰 현황] 카드 탭 바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
          <h3 class="text-sm font-black text-slate-900">고객 문의 & 지원 현황</h3>
        </div>

        <!-- 탭 바 -->
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            v-for="tab in inquiryTabs"
            :key="tab.key"
            @click="activeInquiryTab = tab.key"
            class="px-3 py-1 rounded-lg font-bold transition cursor-pointer"
            :class="activeInquiryTab === tab.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
          >
            {{ tab.label }} <span class="font-mono" :class="tab.count > 0 ? 'text-blue-600 font-black' : 'text-slate-400'">({{ tab.count }})</span>
          </button>
        </div>
      </div>

      <!-- 탭 내용 영역 -->
      <div class="py-6 text-center text-slate-400 space-y-2">
        <div class="text-3xl">💬</div>
        <p class="font-bold text-xs text-slate-700">현재 미답변된 {{ getTabName(activeInquiryTab) }}이 없습니다.</p>
        <p class="text-[11px] text-slate-400">새로운 고객 문의나 톡톡 상담 접수 시 실시간 알림이 발송됩니다.</p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RefreshCw, ChevronRight } from 'lucide-vue-next';
import { getStoredOrders } from '@/utils/orderStorage';
import { normalizeOrderStatus } from '@/lib/orderPipeline';
import { loadStoredInbounds } from '@/lib/warehouseStore';

const isNoticeExpanded = ref(false);
const isRefreshing = ref(false);
const lastUpdatedTime = ref('방금 전');
const activeInquiryTab = ref('talk');

const orders = ref([]);
const inbounds = ref([]);

const pipelineCounts = computed(() => {
  const c = { newOrder: 0, preparing: 0, shipping: 0, delivered: 0, confirmed: 0 };
  orders.value.forEach(o => {
    const s = normalizeOrderStatus(o.status);
    if (s === 'quote_pending' || s === 'quote_confirmed') c.newOrder++;
    else if (s === 'payment_verified' || s === 'purchasing') c.preparing++;
    else if (s === 'warehouse_in' || s === 'inspection_done' || s === 'shipping_ready' || s === 'customs_clearance') c.shipping++;
    else if (s === 'domestic_shipping' || s === 'delivered') c.delivered++;
    else if (s === 'completed') c.confirmed++;
  });
  return c;
});

const warehouseCounts = computed(() => {
  const c = { pending: 0, inspecting: 0, weighed: 0 };
  inbounds.value.forEach(i => {
    if (i.inspectionStatus === 'pending_inbound') c.pending++;
    else if (i.inspectionStatus === 'inspecting') c.inspecting++;
    else if (i.inspectionStatus === 'inbound_weighed' || i.inspectionStatus === 'passed') c.weighed++;
  });
  return c;
});

const customsCounts = computed(() => {
  const c = { inProgress: 0, taxPending: 0, cleared: 0 };
  orders.value.forEach(o => {
    const s = normalizeOrderStatus(o.status);
    if (s === 'customs_clearance') c.inProgress++;
    else if (s === 'domestic_shipping') c.taxPending++;
    else if (s === 'delivered' || s === 'completed') c.cleared++;
  });
  return c;
});

const inquiryTabs = ref([
  { key: 'talk', label: '톡톡 문의', count: 0 },
  { key: 'order', label: '주문 고객 문의', count: 0 },
  { key: 'qna', label: '상품 Q&A', count: 0 },
  { key: 'cs', label: '고객센터', count: 0 },
]);

function getTabName(key) {
  const map = { talk: '톡톡 문의', order: '주문 문의', qna: '상품 Q&A', cs: '고객센터 문의' };
  return map[key] || '문의';
}

function reloadStats() {
  isRefreshing.value = true;
  orders.value = getStoredOrders();
  inbounds.value = loadStoredInbounds();
  const now = new Date();
  lastUpdatedTime.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  setTimeout(() => {
    isRefreshing.value = false;
  }, 400);
}

onMounted(() => {
  reloadStats();
  window.addEventListener('euchs-order-status-update', reloadStats);
  window.addEventListener('euchs-warehouse-update', reloadStats);
  window.addEventListener('storage', reloadStats);
});

onUnmounted(() => {
  window.removeEventListener('euchs-order-status-update', reloadStats);
  window.removeEventListener('euchs-warehouse-update', reloadStats);
  window.removeEventListener('storage', reloadStats);
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
