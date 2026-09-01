<template>
  <!-- ======================================================== -->
  <!-- 1688 수입 발주서 작성 & 통관/배송/VAS 설정 모달 (공통)  -->
  <!-- ======================================================== -->

  <!-- ① 발주 설정 모달 -->
  <!--
    z-[130]: 헤더(z-[100]) + 하단 고정바(z-40) 모두 위로 올라감
    overlay: pt-20 pb-28 = 상단 헤더(~5rem) + 하단 바(~7rem) 높이만큼 여백 확보
    모달 박스: max-h-full + overflow-y-auto 로 overlay 안에서 독립 스크롤
  -->
  <div
    v-if="isOpen && !showSuccessModal"
    class="fixed inset-0 z-[130] flex items-start justify-center pt-20 pb-28 px-4 bg-black/70 backdrop-blur-xs animate-fade-in h-full"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-3xl max-w-3xl w-full shadow-2xl max-h-full overflow-hidden flex flex-col">
      <div class="p-6 sm:p-8 space-y-6 overflow-y-auto text-sm text-gray-700 flex-1 custom-modal-scroll">
        <!-- 모달 헤더 -->
        <div class="flex items-center justify-between pb-4 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <FileText class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-lg sm:text-xl font-black text-gray-900">
                  1688 수입 발주서 작성 &amp; 설정
                </h3>
                <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                  1. 견적요청 단계
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">
                통관 방식, 국내 배송 방식, 현지 창고 부가서비스(VAS)를 선택 후 최종 제출합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="handleClose"
            class="text-gray-400 hover:text-gray-900 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer shrink-0"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 1. 통관 방식 선택 (버튼 토글) -->
        <div class="space-y-3">
          <label class="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
            <ShieldCheck class="w-4 h-4 text-blue-600" />
            <span>수입 통관 방식 선택</span>
            <span class="text-rose-500 font-normal text-xs">*필수</span>
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- 사업자 통관 -->
            <button
              type="button"
              @click="orderConfig.customsType = 'business'"
              class="p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
              :class="orderConfig.customsType === 'business'
                ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300'"
            >
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition"
                :class="orderConfig.customsType === 'business' ? 'border-amber-600 bg-amber-600' : 'border-gray-300'"
              >
                <div v-if="orderConfig.customsType === 'business'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <div class="space-y-1">
                <div class="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Building2 class="w-4 h-4 text-amber-600" />
                  <span>사업자 통관 (B2B 수입)</span>
                  <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black">추천</span>
                </div>
                <p class="text-xs text-gray-500 leading-snug">
                  정식 수입신고필증 발급, 부가세 매입세액 공제 및 비용 처리
                </p>
              </div>
            </button>

            <!-- 개인 통관 -->
            <button
              type="button"
              @click="orderConfig.customsType = 'personal'"
              class="p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
              :class="orderConfig.customsType === 'personal'
                ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300'"
            >
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition"
                :class="orderConfig.customsType === 'personal' ? 'border-amber-600 bg-amber-600' : 'border-gray-300'"
              >
                <div v-if="orderConfig.customsType === 'personal'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <div class="space-y-1">
                <div class="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <User class="w-4 h-4 text-gray-600" />
                  <span>개인 통관 (자가사용)</span>
                </div>
                <p class="text-xs text-gray-500 leading-snug">
                  개인통관고유부호(PCCC) 기반 자가소비용 간이 수입 통관
                </p>
              </div>
            </button>
          </div>
        </div>

        <!-- 2. 국내 배송 방식 선택 (버튼 토글) -->
        <div class="space-y-3">
          <label class="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
            <Truck class="w-4 h-4 text-emerald-600" />
            <span>국내 배송 / 입고 방식</span>
            <span class="text-rose-500 font-normal text-xs">*필수</span>
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- 일반 수입배송 -->
            <button
              type="button"
              @click="orderConfig.shippingType = 'general'"
              class="p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
              :class="orderConfig.shippingType === 'general'
                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300'"
            >
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition"
                :class="orderConfig.shippingType === 'general' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'"
              >
                <div v-if="orderConfig.shippingType === 'general'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <div class="space-y-1">
                <div class="font-bold text-gray-900 text-sm">일반 수입배송 (직배송)</div>
                <p class="text-xs text-gray-500 leading-snug">
                  화주 사업장/창고 주소지로 택배 또는 경동화물 직배송
                </p>
              </div>
            </button>

            <!-- 쿠팡 로켓그로스 입고 -->
            <button
              type="button"
              @click="orderConfig.shippingType = 'rocket'"
              class="p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
              :class="orderConfig.shippingType === 'rocket'
                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300'"
            >
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition"
                :class="orderConfig.shippingType === 'rocket' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'"
              >
                <div v-if="orderConfig.shippingType === 'rocket'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <div class="space-y-1">
                <div class="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <span>🚀 쿠팡 로켓그로스 입고</span>
                  <span class="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-black">직납</span>
                </div>
                <p class="text-xs text-gray-500 leading-snug">
                  바코드 부착/파레트 래핑 후 지정 FC센터 밀크런 트럭 직납
                </p>
              </div>
            </button>
          </div>
        </div>

        <!-- 3. 현지 창고 부가서비스 (VAS) 6종 체크박스 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
              <PackageCheck class="w-4 h-4 text-purple-600" />
              <span>현지 물류센터 부가서비스 (VAS)</span>
            </label>
            <span class="text-xs text-gray-400">다중 선택 가능</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <label
              v-for="vas in vasOptions"
              :key="vas.id"
              class="p-3 rounded-xl border transition flex items-start gap-2 cursor-pointer select-none"
              :class="orderConfig.vasServices.includes(vas.id)
                ? 'bg-purple-50/60 border-purple-400 text-purple-900'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'"
            >
              <input
                type="checkbox"
                :value="vas.id"
                v-model="orderConfig.vasServices"
                class="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-0.5 shrink-0"
              />
              <div class="min-w-0">
                <div class="font-bold text-xs leading-tight">{{ vas.label }}</div>
                <div class="text-[11px] text-gray-400 leading-tight mt-0.5">{{ vas.desc }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 4. 바이어 & 수취인 배송지 정보 (실시간 확인 및 편집) -->
        <div class="space-y-4 p-4 sm:p-5 bg-slate-50 border border-gray-200 rounded-2xl">
          <div class="flex items-center justify-between border-b border-gray-200 pb-3">
            <span class="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <Building2 class="w-4 h-4 text-amber-600" />
              <span>바이어 및 수취인 배송 정보</span>
            </span>
            <span class="text-xs text-gray-400">발주서 및 통관 서류에 자동 반영</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-semibold text-gray-600 block mb-1.5">상호명 (회사명)</label>
              <input
                type="text"
                v-model="orderConfig.companyName"
                placeholder="예: 이유씨글로벌파트너스"
                class="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-600 block mb-1.5">성명 (담당자명)</label>
              <input
                type="text"
                v-model="orderConfig.buyerName"
                placeholder="예: 홍길동"
                class="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-600 block mb-1.5">연락처 (휴대폰)</label>
              <input
                type="text"
                v-model="orderConfig.phone"
                placeholder="010-0000-0000"
                class="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium font-mono"
              />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-600 block mb-1.5">통관부호 (PCCC / 사업자번호)</label>
              <input
                type="text"
                v-model="orderConfig.customsCode"
                placeholder="P로 시작하는 13자리 또는 사업자번호"
                class="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium font-mono"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="text-xs font-semibold text-gray-600 block mb-1.5">국내 배송지 주소</label>
              <input
                type="text"
                v-model="orderConfig.address"
                placeholder="수령지 기본 주소 및 상세 주소"
                class="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="text-xs font-semibold text-gray-600 block mb-1.5">발주 요청 메모 (선택)</label>
              <input
                type="text"
                v-model="orderConfig.memo"
                placeholder="검수 요청사항 또는 물류 특이사항을 입력해 주세요."
                class="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
              />
            </div>
          </div>
        </div>

        <!-- 5. 선택 품목 요약 박스 -->
        <div class="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div>
            <span class="text-gray-600 font-medium text-sm">발주 대상 품목</span>
            <div class="font-bold text-gray-900 font-mono text-base mt-1">
              총 {{ items.length }}종 ({{ totalQuantity }}개)
            </div>
          </div>
          <div class="text-right">
            <span class="text-gray-600 font-medium text-sm">1688 예상 상품대금</span>
            <div class="text-lg font-black text-amber-600 font-mono mt-1">
              ₩{{ formatNumber(totalKrw) }}원
              <span class="text-sm text-gray-400 font-normal ml-1">(¥{{ totalCny.toFixed(2) }})</span>
            </div>
          </div>
        </div>

        <!-- 모달 하단 액션 버튼 -->
        <div class="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            @click="handleClose"
            class="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition cursor-pointer text-sm"
          >
            취소
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="isSubmitting || items.length === 0"
            class="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm transition shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <Send v-else class="w-4 h-4" />
            <span>{{ isSubmitting ? '발주서 접수 중...' : '수입 발주서 최종 제출 (견적 요청)' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ② 발주 완료 모달 (alert() 대체) -->
  <!--
    z-[130]: 동일한 z-index 레이어, 설정 모달이 닫힌 뒤 표시됨
    overlay: pt-20 pb-28 으로 헤더/하단바 overlap 방지
  -->
  <div
    v-if="isOpen && showSuccessModal"
    class="fixed inset-0 z-[130] flex items-start justify-center pt-20 pb-28 px-4 bg-black/70 backdrop-blur-xs animate-fade-in h-full"
  >
    <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl text-sm text-gray-700 max-h-full overflow-hidden flex flex-col">
      <div class="p-6 sm:p-8 overflow-y-auto flex-1 custom-modal-scroll">
        <!-- 헤더: 체크 아이콘 + 완료 문구 -->
        <div class="flex flex-col items-center text-center pb-5 border-b border-gray-100">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4 shadow-md">
            <CheckCircle2 class="w-9 h-9 text-white" />
          </div>
          <h3 class="text-xl font-black text-gray-900 leading-tight">발주 접수 완료!</h3>
          <p class="text-xs text-gray-500 mt-1.5">수입 발주서가 정상 접수되어 견적 심사가 시작됩니다.</p>
        </div>

        <!-- 발주 정보 요약 -->
        <div class="mt-5 space-y-3">
          <!-- 발주번호 -->
          <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
            <span class="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <FileText class="w-4 h-4" />
              발주번호
            </span>
            <span class="font-black text-base text-amber-800 font-mono tracking-wider">
              {{ successOrderData.orderNumber }}
            </span>
          </div>

          <!-- 상세 정보 그리드 -->
          <div class="bg-slate-50 border border-gray-200 rounded-2xl divide-y divide-gray-100">
            <!-- 발주 상태 -->
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs text-gray-500 font-medium">발주 상태</span>
              <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200">
                견적 대기
              </span>
            </div>

            <!-- 주문 일시 -->
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs text-gray-500 font-medium">주문 일시</span>
              <span class="font-semibold text-gray-800 font-mono text-xs">{{ successOrderData.createdAtDisplay }}</span>
            </div>

            <!-- 주문 상품 -->
            <div class="px-4 py-3">
              <div class="flex items-start justify-between gap-3">
                <span class="text-xs text-gray-500 font-medium shrink-0">주문 상품</span>
                <div class="text-right">
                  <template v-if="successOrderData.items.length === 1">
                    <span class="font-semibold text-gray-800 text-xs leading-snug block">
                      {{ successOrderData.items[0].name }}
                    </span>
                  </template>
                  <template v-else-if="successOrderData.items.length <= 3">
                    <span
                      v-for="(item, idx) in successOrderData.items"
                      :key="idx"
                      class="font-semibold text-gray-800 text-xs leading-snug block"
                    >
                      {{ item.name }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="font-semibold text-gray-800 text-xs leading-snug block">
                      {{ successOrderData.items[0].name }}
                    </span>
                    <span class="text-[11px] text-gray-400 mt-0.5 block">
                      외 {{ successOrderData.items.length - 1 }}개 상품
                    </span>
                  </template>
                </div>
              </div>
            </div>

            <!-- 총 주문 수량 -->
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs text-gray-500 font-medium">총 주문 수량</span>
              <span class="font-bold text-gray-800 font-mono text-sm">{{ formatNumber(successOrderData.totalQty) }}개</span>
            </div>

            <!-- 위안화 총액 -->
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs text-gray-500 font-medium">위안화 총액 (CNY)</span>
              <span class="font-bold text-gray-800 font-mono text-sm">¥{{ successOrderData.totalCny }}</span>
            </div>

            <!-- 결제 예상 금액 -->
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs text-gray-500 font-medium">결제 예상 금액 (KRW)</span>
              <span class="font-black text-amber-600 font-mono text-base">₩{{ formatNumber(successOrderData.totalKrw) }}원</span>
            </div>
          </div>

          <!-- 안내 메시지 -->
          <div class="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3.5 text-xs text-blue-700 leading-snug">
            <strong>견적 산출 완료 시</strong> 카카오톡 알림톡으로 안내드립니다.<br>
            평균 산출 소요시간: <strong>당일(1~2시간내)</strong> 품절 상품 퀄리티를 종합적으로 확인 후
          </div>
        </div>

        <!-- 하단 액션 버튼 2개 -->
        <div class="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            @click="handleContinueShopping"
            class="flex-1 px-4 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition cursor-pointer text-sm text-center"
          >
            계속 쇼핑하기
          </button>
          <button
            type="button"
            @click="handleGoToOrders"
            class="flex-1 px-4 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <ArrowRight class="w-4 h-4" />
            주문 내역으로 이동
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  FileText,
  X,
  ShieldCheck,
  Building2,
  User,
  Truck,
  PackageCheck,
  Send,
  Loader2,
  CheckCircle2,
  ArrowRight
} from 'lucide-vue-next';
import { currentUser, getCartStorageKey } from '@/lib/auth';
import { saveNewOrder } from '@/utils/orderStorage';
import { sendOrderStatusAlimtalk } from '@/services/notificationService';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  items: {
    type: Array,
    default: () => []
  },
  exchangeRate: {
    type: Number,
    default: 226.19
  }
});

const emit = defineEmits(['close', 'submitted']);
const router = useRouter();

const isSubmitting = ref(false);

// ─── 완료 모달 상태 ───────────────────────────────────────────
const showSuccessModal = ref(false);
const successOrderData = ref({
  orderNumber: '',
  createdAtDisplay: '',
  items: [],          // [{ name: string }]
  totalQty: 0,
  totalCny: '0.00',
  totalKrw: 0
});
// ──────────────────────────────────────────────────────────────

const vasOptions = [
  { id: 'fta_co', label: '한-중 FTA C/O', desc: '원산지증명서 발급 (관세 0~4% 감면)' },
  { id: 'inspect_precision', label: '정밀 검수 (유료)', desc: '전수 외관/불량/수량 정밀 체크' },
  { id: 'origin_label', label: '원산지 라벨링', desc: 'MADE IN CHINA 스티커/봉제/불박' },
  { id: 'barcode', label: '바코드 부착', desc: '쿠팡 바코드 및 상품 SKU 라벨링' },
  { id: 'opp_repack', label: 'OPP 재포장', desc: '개별 투명 비닐 깔끔 재포장' },
  { id: 'cushion_pack', label: '특수 완충 포장', desc: '파손 방지용 에어캡/보강 패키징' }
];

const orderConfig = ref({
  customsType: 'business',
  shippingType: 'general',
  vasServices: ['fta_co'],
  companyName: '',
  buyerName: '',
  phone: '',
  email: '',
  customsCode: '',
  address: '',
  memo: ''
});

// 바이어 폼 기본값 채우기
const syncUserInfo = () => {
  const user = currentUser.value;
  orderConfig.value = {
    customsType: 'business',
    shippingType: 'general',
    vasServices: orderConfig.value.vasServices?.length ? orderConfig.value.vasServices : ['fta_co'],
    companyName: user?.companyName || user?.company_name || '이유씨글로벌파트너스',
    buyerName: user?.name || user?.displayName || '이유씨 바이어',
    phone: user?.phone || '010-9373-1214',
    email: user?.email || 'buyer@euchs.com',
    customsCode: user?.customsCode || user?.pccc || 'P240012345678',
    address: user?.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층',
    memo: ''
  };
};

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      syncUserInfo();
      showSuccessModal.value = false;
      // 모달 오픈 시 배경 스크롤 잠금
      document.body.style.overflow = 'hidden';
    } else {
      // 모달 닫힐 때 배경 스크롤 복원
      document.body.style.overflow = '';
    }
  },
  { immediate: true }
);

// 계산 헬퍼
function getItemUnitPriceCny(item) {
  return Number(item.priceCny || item.price || 15);
}

function getItemSubtotalCny(item) {
  return getItemUnitPriceCny(item) * (Number(item.quantity) || 1);
}

function getItemSubtotalKrw(item) {
  return Math.round(getItemSubtotalCny(item) * props.exchangeRate);
}

function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR');
}

/** ISO 문자열 → "YYYY.MM.DD HH:MM" 한국 로컬 표시 */
function formatDateTimeKo(isoStr) {
  try {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoStr || '';
  }
}

const totalQuantity = computed(() => {
  return props.items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
});

const totalCny = computed(() => {
  return props.items.reduce((sum, it) => sum + getItemSubtotalCny(it), 0);
});

const totalKrw = computed(() => {
  return props.items.reduce((sum, it) => sum + getItemSubtotalKrw(it), 0);
});

const handleClose = () => {
  if (isSubmitting.value) return;
  showSuccessModal.value = false;
  emit('close');
};

// "계속 쇼핑하기" — 완료 모달 + OrderConfigModal 닫기, 현재 화면 유지
const handleContinueShopping = () => {
  showSuccessModal.value = false;
  emit('close');
};

// "주문 내역으로 이동" — 모달 닫고 발주 목록(견적 대기 탭)으로 이동
const handleGoToOrders = () => {
  showSuccessModal.value = false;
  emit('close');
  router.push('/dashboard/orders?tab=quote_pending');
};

const handleSubmit = async () => {
  const targetItems = props.items;
  if (!targetItems || targetItems.length === 0) {
    alert('발주 신청할 상품이 없습니다.');
    handleClose();
    return;
  }

  isSubmitting.value = true;

  try {
    const dateCompact = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `EUC-${dateCompact}-${randomSuffix}`;

    const cfg = orderConfig.value;
    const buyerInfo = {
      companyName: cfg.companyName || '이유씨글로벌파트너스',
      buyerName: cfg.buyerName || '이유씨 바이어',
      phone: cfg.phone || '010-9373-1214',
      email: cfg.email || 'buyer@euchs.com',
      customsCode: cfg.customsCode || 'P240012345678',
      address: cfg.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층',
      memo: cfg.memo || '',
      customsType: cfg.customsType,
      shippingType: cfg.shippingType,
      vasServices: cfg.vasServices,
      vas_services: cfg.vasServices,
      vasSummary: ''
    };

    // VAS 라벨 텍스트 매핑
    const vasLabels = cfg.vasServices.map((id) => {
      const found = vasOptions.find((v) => v.id === id);
      return found ? found.label : id;
    });
    buyerInfo.vasSummary = vasLabels.join(', ');

    const createdAt = new Date().toISOString();

    const newOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      inboundNo: `INB-YW-${dateCompact}-${randomSuffix}`,
      createdAt, // ISO 형식 통일 (크로스 브라우저 정렬 보장)
      status: 'quote_pending',
      customsType: cfg.customsType,
      customsClearanceType: cfg.customsType,
      shippingType: cfg.shippingType,
      shippingMethod: cfg.shippingType,
      vasServices: cfg.vasServices,
      vas_services: cfg.vasServices,
      vasOptions: cfg.vasServices,
      vasApplied: cfg.vasServices,
      vasSummary: vasLabels.join(', '),
      buyerInfo,
      items: targetItems.map((it) => ({
        productName: it.titleKo || it.productName || '',
        imageUrl: it.imageUrl || '',
        sku: it.sku || '',
        skus: it.skus || [],
        itemId: it.itemId || it.num_iid || '',
        productUrl: it.productUrl || it.detailUrl || '',
        titleKo: it.titleKo || it.productName || '',
        titleZh: it.titleZh || '',
        quantity: it.quantity || 1,
        priceCny: getItemUnitPriceCny(it),
        cbm: 0
      })),
      totalPriceKrw: targetItems.reduce((sum, it) => sum + getItemSubtotalKrw(it), 0),
      totalPriceRmb: targetItems.reduce((sum, it) => sum + getItemSubtotalCny(it), 0)
    };

    // 1. Supabase orders 테이블 및 전역 orderStorage에 영구 저장 (DB 실패 시 로컬스토리지 자동 폴백)
    const savedOrder = await saveNewOrder(newOrder);
    const finalOrderNumber = savedOrder?.orderNumber || orderNumber;

    // 2. 솔라피 알림톡 발송 (비동기 트리거, 오류 안전 방어)
    const customsLabel = cfg.customsType === 'business' ? '사업자통관' : '개인통관';
    const shipLabel = cfg.shippingType === 'rocket' ? '쿠팡로켓직납' : '일반직배송';
    sendOrderStatusAlimtalk({
      type: 'order_received',
      to: buyerInfo.phone,
      customerName: buyerInfo.buyerName,
      orderNo: finalOrderNumber,
      itemName: newOrder.items[0]?.productName || '1688 소싱 품목',
      extraInfo: `통관: ${customsLabel} / 배송: ${shipLabel}`
    }).catch(() => {});

    // 3. 사용자 장바구니에서 제출된 품목 제거
    try {
      const cartKey = getCartStorageKey();
      const rawCart = localStorage.getItem(cartKey);
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed)) {
          const submittedItemIds = new Set(targetItems.map((it) => it.id));
          const remainingCart = parsed.filter((it) => !submittedItemIds.has(it.id));
          localStorage.setItem(cartKey, JSON.stringify(remainingCart));
          // 전역 동기화 이벤트
          window.dispatchEvent(
            new CustomEvent('euchs:cart-updated', {
              detail: { count: remainingCart.length, items: remainingCart }
            })
          );
          window.dispatchEvent(
            new CustomEvent('euchs:cart_updated', {
              detail: { count: remainingCart.length, items: remainingCart }
            })
          );
        }
      }
    } catch (e) {
      console.warn('Cart cleanup after order submit notice:', e);
    }

    // 4. 전역 이벤트 통지
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(
      new CustomEvent('euchs-order-status-update', {
        detail: { appId: newOrder.id, status: 'quote_pending' }
      })
    );

    emit('submitted', { orderNumber: finalOrderNumber, items: targetItems });

    // 5. 완료 모달에 표시할 데이터 세팅 후 표시
    const computedTotalCny = targetItems.reduce((sum, it) => sum + getItemSubtotalCny(it), 0);
    const computedTotalKrw = targetItems.reduce((sum, it) => sum + getItemSubtotalKrw(it), 0);
    const computedTotalQty = targetItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

    successOrderData.value = {
      orderNumber: finalOrderNumber,
      createdAtDisplay: formatDateTimeKo(createdAt),
      items: targetItems.map((it) => ({
        name: it.titleKo || it.productName || '1688 상품'
      })),
      totalQty: computedTotalQty,
      totalCny: computedTotalCny.toFixed(2),
      totalKrw: computedTotalKrw
    };
    showSuccessModal.value = true;

  } catch (error) {
    console.error('Submit order error:', error);
    alert('발주서 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.custom-modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.custom-modal-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-modal-scroll::-webkit-scrollbar-track {
  background: transparent;
  margin: 12px 0;
}
.custom-modal-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
.custom-modal-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
