<template>
  <div class="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 페이지 헤더 & 통관/물류 액션 영역 -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black tracking-wide">
            Uni-Pass & Global Customs
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            수입 통관 & 국내 배송 통합 관리
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          관세청 유니패스(Uni-Pass) 실시간 통관 진행 상태, 한·중 FTA 원산지증명서(C/O) 발급 내역 및 국내 화물 배송을 추적합니다.
        </p>
      </div>

      <!-- 상단 액션 버튼 -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          @click="openFtaModal"
          class="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs shadow-xs transition flex items-center gap-2 active:scale-95"
        >
          <FileCheck class="w-4 h-4 text-indigo-600" />
          <span>한·중 FTA C/O 신청</span>
        </button>

        <a
          href="https://unipass.customs.go.kr"
          target="_blank"
          rel="noopener noreferrer"
          class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-95"
        >
          <ExternalLink class="w-4 h-4 text-indigo-400" />
          <span>관세청 유니패스 바로가기</span>
        </a>
      </div>
    </div>

    <!-- 공통 10단계 풀프로세스 스텝 바 (통관/배송 포커스) -->
    <OrderProcessStepper currentSection="customs" />

    <!-- ======================================================== -->
    <!-- 2. 통관 & 물류 4대 핵심 지표 카드 (컴팩트 슬림 디자인) -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- 1. 해상 운송중 -->
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between transition hover:border-gray-300 select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">해상 운송중 (선적)</span>
          <div class="text-lg font-bold text-gray-900 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.shipping }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
          <Ship class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 2. 세관 수입통관 -->
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between transition hover:border-gray-300 select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">세관 수입통관</span>
          <div class="text-lg font-bold text-orange-600 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.customs }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-700 flex items-center justify-center shrink-0">
          <ShieldAlert class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 3. 한·중 FTA C/O -->
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between transition hover:border-gray-300 select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">한·중 FTA C/O 적용</span>
          <div class="text-lg font-bold text-indigo-600 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.fta }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0">
          <Award class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 4. 국내 배송중/완료 -->
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between transition hover:border-gray-300 select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">국내 배송 / 완료</span>
          <div class="text-lg font-bold text-emerald-600 font-mono tracking-tight mt-0.5">
            {{ summaryCounts.delivered }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
          <Truck class="w-3.5 h-3.5" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 실시간 H B/L 통관 및 배송 목록 테이블 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <!-- 테이블 필터 바 -->
      <div class="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/50">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-bold text-gray-900">실시간 통관 & 배송 트래킹</h2>
          <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-mono font-bold">
            {{ filteredLogistics.length }}건
          </span>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1 sm:w-64">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              v-model="searchQuery"
              placeholder="B/L 번호, 주문번호, 송장번호 검색"
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <select
            v-model="statusFilter"
            class="px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white font-medium text-gray-700 cursor-pointer focus:outline-none"
          >
            <option value="all">전체 상태</option>
            <option value="sailing">해상 운송중</option>
            <option value="customs">수입통관 진행</option>
            <option value="cleared">통관 수리완료</option>
            <option value="delivery">국내 배송중</option>
          </select>
        </div>
      </div>

      <!-- 리스트 테이블 -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">B/L 및 주문정보</th>
              <th class="py-3 px-4">수입 품목 및 규격</th>
              <th class="py-3 px-4">선박 / 항구 스케줄</th>
              <th class="py-3 px-4">Uni-Pass 통관 단계</th>
              <th class="py-3 px-4">FTA C/O</th>
              <th class="py-3 px-4">국내 운송장</th>
              <th class="py-3 px-4 text-right">상세조회</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="item in filteredLogistics"
              :key="item.id"
              class="hover:bg-slate-50/80 transition"
            >
              <!-- B/L & 주문번호 -->
              <td class="py-3 px-4">
                <div class="font-mono font-bold text-indigo-600 flex items-center gap-1">
                  <span>{{ item.hblNo }}</span>
                  <button
                    @click="copyText(item.hblNo, 'H B/L 번호가 복사되었습니다.')"
                    class="text-gray-400 hover:text-gray-600 transition"
                    title="복사"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
                <div class="text-[11px] text-gray-500 font-mono mt-0.5">
                  {{ item.orderNo }}
                </div>
              </td>

              <!-- 품목 정보 -->
              <td class="py-3 px-4">
                <div class="font-bold text-gray-900 line-clamp-1 max-w-[200px]">
                  {{ item.productName }}
                </div>
                <div class="text-[11px] text-gray-500 mt-0.5">
                  {{ item.quantity }}개 | {{ item.weightKg }}kg | {{ item.cbm }} CBM
                </div>
              </td>

              <!-- 선박/항구 스케줄 -->
              <td class="py-3 px-4">
                <div class="font-medium text-gray-800">
                  {{ item.vesselName }}
                </div>
                <div class="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <span>{{ item.departurePort }} ➔ {{ item.arrivalPort }}</span>
                  <span class="font-mono text-slate-400">({{ item.arrivalDate }})</span>
                </div>
              </td>

              <!-- Uni-Pass 통관 진행단계 뱃지 -->
              <td class="py-3 px-4">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" :class="getCustomsBadgeClass(item.customsStep)">
                  <span class="w-1.5 h-1.5 rounded-full" :class="getCustomsDotClass(item.customsStep)"></span>
                  <span>{{ item.customsStepName }}</span>
                </div>
                <div class="text-[10px] text-gray-400 mt-1 font-mono">
                  신고번호: {{ item.declarationNo || '-' }}
                </div>
              </td>

              <!-- FTA C/O 발급 상태 -->
              <td class="py-3 px-4">
                <span
                  v-if="item.ftaStatus === 'approved'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200"
                >
                  <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                  <span>적용완료 (0%)</span>
                </span>
                <span
                  v-else-if="item.ftaStatus === 'applying'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200"
                >
                  <Clock class="w-3 h-3 text-amber-600" />
                  <span>발급심사중</span>
                </span>
                <span
                  v-else
                  class="text-[10px] text-gray-400"
                >
                  미신청 (기본세율)
                </span>
              </td>

              <!-- 국내 운송장 링크 -->
              <td class="py-3 px-4">
                <div v-if="item.trackingNo">
                  <div class="font-bold text-gray-800">{{ item.courierCompany }}</div>
                  <a
                    :href="item.trackingUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[11px] text-indigo-600 hover:underline font-mono flex items-center gap-1 mt-0.5"
                  >
                    <span>{{ item.trackingNo }}</span>
                    <ExternalLink class="w-3 h-3" />
                  </a>
                </div>
                <div v-else class="text-[11px] text-gray-400">
                  세관 반출 대기
                </div>
              </td>

              <!-- 액션 버튼 -->
              <td class="py-3 px-4 text-right">
                <button
                  type="button"
                  @click="openDetailModal(item)"
                  class="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 font-bold text-xs transition"
                >
                  상세보기
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 한·중 FTA C/O 원산지증명서 발급 신청 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="showFtaModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Award class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900">한·중 FTA 원산지증명서(C/O) 신청</h3>
              <p class="text-xs text-gray-500">협정관세 적용을 통해 수입 관세를 대폭 절감합니다.</p>
            </div>
          </div>
          <button @click="showFtaModal = false" class="text-gray-400 hover:text-gray-600 p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="submitFtaApplication" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">대상 발주번호 선택</label>
            <select
              v-model="ftaForm.orderNo"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              <option value="" disabled>발주 건을 선택하세요</option>
              <option v-for="ord in mockLogisticsList" :key="ord.orderNo" :value="ord.orderNo">
                {{ ord.orderNo }} ({{ ord.productName.slice(0, 20) }}...)
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">HS CODE (6~10자리)</label>
              <input
                type="text"
                v-model="ftaForm.hsCode"
                placeholder="예: 6204.42.0000"
                required
                class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">예상 기본관세 ➔ FTA 관세</label>
              <input
                type="text"
                value="8.0% ➔ 0.0% (관세 면제)"
                readonly
                class="w-full px-3.5 py-2 rounded-xl bg-gray-50 text-indigo-700 font-bold border border-gray-200"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">중국 현지 제조사 영문 상호</label>
            <input
              type="text"
              v-model="ftaForm.manufacturer"
              placeholder="예: YIWU JINHAO TRADE CO., LTD."
              required
              class="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div class="p-3 bg-indigo-50 rounded-xl text-indigo-800 text-[11px] space-y-1">
            <div class="font-bold flex items-center gap-1">
              <ShieldCheck class="w-3.5 h-3.5" />
              <span>EUCHS 관세사 C/O 원스톱 발급 대행</span>
            </div>
            <p class="text-indigo-700">
              중국 현지 세관(CCPIT) 전자 원산지증명서 발급 후 한국 관세청 유니패스 시스템에 전자 통보(CO-PASS)됩니다.
            </p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showFtaModal = false"
              class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
            >
              C/O 발급 신청하기
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. H B/L 통관 상세 프로세스 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="selectedDetail"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <span class="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold font-mono">
              H B/L: {{ selectedDetail.hblNo }}
            </span>
            <h3 class="text-lg font-bold text-gray-900 mt-1">
              {{ selectedDetail.productName }}
            </h3>
          </div>
          <button @click="selectedDetail = null" class="text-gray-400 hover:text-gray-600 p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 6단계 통관 타임라인 -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-gray-700">관세청 유니패스 실시간 통관 진행 타임라인</h4>
          <div class="relative border-l-2 border-indigo-200 ml-4 space-y-4 py-1 text-xs">
            <div
              v-for="(step, idx) in clearanceSteps"
              :key="step.key"
              class="relative pl-6"
            >
              <div
                class="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center"
                :class="idx <= getStepIndex(selectedDetail.customsStep) ? 'border-indigo-600 text-indigo-600' : 'border-gray-300 text-gray-300'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="idx <= getStepIndex(selectedDetail.customsStep) ? 'bg-indigo-600' : 'bg-gray-300'"></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="font-bold" :class="idx <= getStepIndex(selectedDetail.customsStep) ? 'text-gray-900' : 'text-gray-400'">
                  {{ step.label }}
                </span>
                <span class="text-[10px] font-mono text-gray-400">
                  {{ idx <= getStepIndex(selectedDetail.customsStep) ? step.date : '-' }}
                </span>
              </div>
              <p class="text-[11px] text-gray-500 mt-0.5">{{ step.desc }}</p>
            </div>
          </div>
        </div>

        <!-- 화물 제원 정보 그리드 -->
        <div class="p-4 bg-gray-50 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span class="text-gray-400 text-[10px]">선적항 / 입항지</span>
            <div class="font-bold text-gray-800">{{ selectedDetail.departurePort }} ➔ {{ selectedDetail.arrivalPort }}</div>
          </div>
          <div>
            <span class="text-gray-400 text-[10px]">선박명 (Vessel)</span>
            <div class="font-bold text-gray-800">{{ selectedDetail.vesselName }}</div>
          </div>
          <div>
            <span class="text-gray-400 text-[10px]">실측 총중량 / 부피</span>
            <div class="font-bold text-gray-800">{{ selectedDetail.weightKg }}kg / {{ selectedDetail.cbm }} CBM</div>
          </div>
          <div>
            <span class="text-gray-400 text-[10px]">국내 택배/화물사</span>
            <div class="font-bold text-indigo-600">{{ selectedDetail.courierCompany || '세관통관중' }}</div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <a
            :href="`https://unipass.customs.go.kr/csp/index.do`"
            target="_blank"
            rel="noopener noreferrer"
            class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            <ExternalLink class="w-3.5 h-3.5 text-indigo-400" />
            <span>유니패스 원문 조회</span>
          </a>
          <button
            @click="selectedDetail = null"
            class="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Ship,
  Truck,
  ShieldAlert,
  Award,
  Search,
  ExternalLink,
  Copy,
  CheckCircle2,
  Clock,
  FileCheck,
  ShieldCheck,
  X
} from 'lucide-vue-next'
import OrderProcessStepper from '@/components/dashboard/OrderProcessStepper.vue'

const route = useRoute()

// 검색 및 필터 상태
const searchQuery = ref('')
const statusFilter = ref('all')
const showFtaModal = ref(false)
const selectedDetail = ref(null)

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'shipping') {
    statusFilter.value = 'delivery'
  } else {
    statusFilter.value = 'all'
  }
}, { immediate: true })

const ftaForm = ref({
  orderNo: '',
  hsCode: '6204.42.0000',
  manufacturer: 'YIWU JINHAO APPAREL CO., LTD.'
})

// 샘플 B/L 통관 및 국내 배송 데이터
const mockLogisticsList = ref([
  {
    id: 1,
    hblNo: 'EUCHS240821001',
    orderNo: 'ORD-20260824-001',
    productName: '프렌치 린넨 반팔 루즈핏 블라우스 여름 셔츠 (500장)',
    quantity: 500,
    weightKg: 125.4,
    cbm: 0.85,
    departurePort: '위해(Weihai)항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-23',
    vesselName: 'NEW GOLDEN BRIDGE VII',
    customsStep: 'cleared',
    customsStepName: '수입신고 수리완료',
    declarationNo: '12345-26-100293U',
    ftaStatus: 'approved',
    courierCompany: 'CJ대한통운',
    trackingNo: '682910482910',
    trackingUrl: 'https://www.cjlogistics.com'
  },
  {
    id: 2,
    hblNo: 'EUCHS240821002',
    orderNo: 'ORD-20260824-002',
    productName: '304 스테인리스 이중 진공 보온 텀블러 500ml (300개)',
    quantity: 300,
    weightKg: 95.0,
    cbm: 0.62,
    departurePort: '위해(Weihai)항',
    arrivalPort: '평택(Pyeongtaek)항',
    arrivalDate: '2026-08-24',
    vesselName: 'GRAND PEACE',
    customsStep: 'customs',
    customsStepName: '세관 심사진행중',
    declarationNo: '12345-26-100341U',
    ftaStatus: 'applying',
    courierCompany: '경동택배(화물)',
    trackingNo: '',
    trackingUrl: ''
  },
  {
    id: 3,
    hblNo: 'EUCHS240821003',
    orderNo: 'ORD-20260824-003',
    productName: '마그네틱 15W 고속 3in1 무선충전 스탠드 거치대 (200개)',
    quantity: 200,
    weightKg: 48.2,
    cbm: 0.38,
    departurePort: '이우 ➔ 위해항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-25 (예정)',
    vesselName: 'ORIENTAL PEARL VIII',
    customsStep: 'sailing',
    customsStepName: '해상 적재 운송중',
    declarationNo: '',
    ftaStatus: 'none',
    courierCompany: '',
    trackingNo: '',
    trackingUrl: ''
  },
  {
    id: 4,
    hblNo: 'EUCHS240820008',
    orderNo: 'ORD-20260822-004',
    productName: '초경량 접이식 알루미늄 캠핑 릴렉스 체어 (150세트)',
    quantity: 150,
    weightKg: 210.0,
    cbm: 1.45,
    departurePort: '위해(Weihai)항',
    arrivalPort: '인천(Incheon)항',
    arrivalDate: '2026-08-22',
    vesselName: 'NEW GOLDEN BRIDGE V',
    customsStep: 'delivery',
    customsStepName: '국내 배송중 (배송출발)',
    declarationNo: '12345-26-099812U',
    ftaStatus: 'approved',
    courierCompany: '경동택배(화물)',
    trackingNo: '882019481920',
    trackingUrl: 'https://kdexp.com'
  }
])

const summaryCounts = computed(() => {
  return {
    shipping: mockLogisticsList.value.filter(i => i.customsStep === 'sailing').length,
    customs: mockLogisticsList.value.filter(i => i.customsStep === 'customs').length,
    fta: mockLogisticsList.value.filter(i => i.ftaStatus === 'approved').length,
    delivered: mockLogisticsList.value.filter(i => i.customsStep === 'delivery' || i.customsStep === 'cleared').length
  }
})

const filteredLogistics = computed(() => {
  return mockLogisticsList.value.filter(item => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchesSearch = !q ||
      item.hblNo.toLowerCase().includes(q) ||
      item.orderNo.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.trackingNo.includes(q)

    const matchesStatus = statusFilter.value === 'all' || item.customsStep === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const clearanceSteps = [
  { key: 'sailing', label: '1. 입항 적하목록 제출 및 적재', date: '08-23 09:00', desc: '중국 현지 세관 반출 및 정기선 선적 완료' },
  { key: 'arrival', label: '2. 입항보고 및 하선신고', date: '08-23 18:30', desc: '인천/평택항 선박 입항 및 보세창고 이송' },
  { key: 'bonded', label: '3. 보세구역 반입완료', date: '08-24 08:15', desc: '세관 지정 장치장 입고 및 검근' },
  { key: 'customs', label: '4. 수입신고서 접수 및 심사', date: '08-24 10:20', desc: '관세사 관부가세 고지 및 FTA 협정세율 심사' },
  { key: 'cleared', label: '5. 수입신고 수리 (통관완료)', date: '08-24 14:00', desc: '세관 통관 면허 발급 및 반출 승인' },
  { key: 'delivery', label: '6. 보세창고 반출 및 국내배송', date: '08-24 16:30', desc: 'CJ대한통운 / 경동화물 인계 및 집하' }
]

const getStepIndex = (stepKey) => {
  if (stepKey === 'sailing') return 0
  if (stepKey === 'customs') return 3
  if (stepKey === 'cleared') return 4
  if (stepKey === 'delivery') return 5
  return 2
}

const getCustomsBadgeClass = (step) => {
  switch (step) {
    case 'cleared':
    case 'delivery':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'customs':
      return 'bg-orange-50 text-orange-700 border border-orange-200'
    case 'sailing':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getCustomsDotClass = (step) => {
  switch (step) {
    case 'cleared':
    case 'delivery':
      return 'bg-emerald-500'
    case 'customs':
      return 'bg-orange-500'
    case 'sailing':
      return 'bg-blue-500'
    default:
      return 'bg-gray-400'
  }
}

const copyText = (txt, msg) => {
  navigator.clipboard?.writeText(txt)
  alert(msg || '복사되었습니다.')
}

const openFtaModal = () => {
  showFtaModal.value = true
}

const submitFtaApplication = () => {
  alert(`[${ftaForm.value.orderNo}] 한·중 FTA C/O 발급 신청이 정상 접수되었습니다. (영업일 기준 24시간 내 심사 완료)`)
  showFtaModal.value = false
}

const openDetailModal = (item) => {
  selectedDetail.value = item
}
</script>
