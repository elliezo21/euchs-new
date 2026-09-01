<template>
  <!-- ======================================================== -->
  <!-- 1688 수입 발주서 작성 & 통관/배송/VAS 설정 모달 (공통) -->
  <!-- ======================================================== -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto text-xs text-gray-700">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-200">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
            <FileText class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base sm:text-lg font-black text-gray-900">
                1688 수입 발주서 작성 & 설정
              </h3>
              <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                1. 견적요청 단계
              </span>
            </div>
            <p class="text-[11px] text-gray-500 mt-0.5">
              통관 방식, 국내 배송 방식, 현지 창고 부가서비스(VAS)를 선택 후 최종 제출합니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="handleClose"
          class="text-gray-400 hover:text-gray-900 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 1. 통관 방식 선택 (버튼 토글) -->
      <div class="space-y-2.5">
        <label class="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
          <ShieldCheck class="w-4 h-4 text-blue-600" />
          <span>수입 통관 방식 선택</span>
          <span class="text-rose-500 font-normal">*필수</span>
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <!-- 사업자 통관 -->
          <button
            type="button"
            @click="orderConfig.customsType = 'business'"
            class="p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
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
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <Building2 class="w-3.5 h-3.5 text-amber-600" />
                <span>사업자 통관 (B2B 수입)</span>
                <span class="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black">추천</span>
              </div>
              <p class="text-[11px] text-gray-500 leading-snug">
                정식 수입신고필증 발급, 부가세 매입세액 공제 및 비용 처리
              </p>
            </div>
          </button>

          <!-- 개인 통관 -->
          <button
            type="button"
            @click="orderConfig.customsType = 'personal'"
            class="p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
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
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <User class="w-3.5 h-3.5 text-gray-600" />
                <span>개인 통관 (자가사용)</span>
              </div>
              <p class="text-[11px] text-gray-500 leading-snug">
                개인통관고유부호(PCCC) 기반 자가소비용 간이 수입 통관
              </p>
            </div>
          </button>
        </div>
      </div>

      <!-- 2. 국내 배송 방식 선택 (버튼 토글) -->
      <div class="space-y-2.5">
        <label class="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
          <Truck class="w-4 h-4 text-emerald-600" />
          <span>국내 배송 / 입고 방식</span>
          <span class="text-rose-500 font-normal">*필수</span>
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <!-- 일반 수입배송 -->
          <button
            type="button"
            @click="orderConfig.shippingType = 'general'"
            class="p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
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
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <span>일반 수입배송 (직배송)</span>
              </div>
              <p class="text-[11px] text-gray-500 leading-snug">
                화주 사업장/창고 주소지로 택배 또는 경동화물 직배송
              </p>
            </div>
          </button>

          <!-- 쿠팡 로켓그로스 입고 -->
          <button
            type="button"
            @click="orderConfig.shippingType = 'rocket'"
            class="p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer"
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
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <span>🚀 쿠팡 로켓그로스 입고</span>
                <span class="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-black">직납</span>
              </div>
              <p class="text-[11px] text-gray-500 leading-snug">
                바코드 부착/파레트 래핑 후 지정 FC센터 밀크런 트럭 직납
              </p>
            </div>
          </button>
        </div>
      </div>

      <!-- 3. 현지 창고 부가서비스 (VAS) 6종 체크박스 -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <label class="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
            <PackageCheck class="w-4 h-4 text-purple-600" />
            <span>현지 물류센터 부가서비스 (VAS)</span>
          </label>
          <span class="text-[11px] text-gray-400">필요한 서비스를 다중 선택하세요</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label
            v-for="vas in vasOptions"
            :key="vas.id"
            class="p-2.5 rounded-xl border transition flex items-start gap-2 cursor-pointer select-none"
            :class="orderConfig.vasServices.includes(vas.id)
              ? 'bg-purple-50/60 border-purple-400 text-purple-900'
              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'"
          >
            <input
              type="checkbox"
              :value="vas.id"
              v-model="orderConfig.vasServices"
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-0.5"
            />
            <div class="min-w-0">
              <div class="font-bold text-[11px] leading-tight">{{ vas.label }}</div>
              <div class="text-[10px] text-gray-400 leading-tight mt-0.5">{{ vas.desc }}</div>
            </div>
          </label>
        </div>
      </div>

      <!-- 4. 바이어 & 수취인 배송지 정보 (실시간 확인 및 편집) -->
      <div class="space-y-3 p-4 bg-slate-50 border border-gray-200 rounded-2xl">
        <div class="flex items-center justify-between border-b border-gray-200 pb-2">
          <span class="font-bold text-gray-900 text-xs flex items-center gap-1.5">
            <Building2 class="w-3.5 h-3.5 text-amber-600" />
            <span>바이어 및 수취인 배송 정보</span>
          </span>
          <span class="text-[10px] text-gray-400">발주서 및 통관 서류에 자동 반영</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-[11px] font-semibold text-gray-600 block mb-1">상호명 (회사명)</label>
            <input
              type="text"
              v-model="orderConfig.companyName"
              placeholder="예: 이유씨글로벌파트너스"
              class="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
            />
          </div>
          <div>
            <label class="text-[11px] font-semibold text-gray-600 block mb-1">성명 (담당자명)</label>
            <input
              type="text"
              v-model="orderConfig.buyerName"
              placeholder="예: 홍길동"
              class="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
            />
          </div>
          <div>
            <label class="text-[11px] font-semibold text-gray-600 block mb-1">연락처 (휴대폰)</label>
            <input
              type="text"
              v-model="orderConfig.phone"
              placeholder="010-0000-0000"
              class="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium font-mono"
            />
          </div>
          <div>
            <label class="text-[11px] font-semibold text-gray-600 block mb-1">통관부호 (PCCC / 사업자번호)</label>
            <input
              type="text"
              v-model="orderConfig.customsCode"
              placeholder="P로 시작하는 13자리 또는 사업자번호"
              class="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium font-mono"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="text-[11px] font-semibold text-gray-600 block mb-1">국내 배송지 주소</label>
            <input
              type="text"
              v-model="orderConfig.address"
              placeholder="수령지 기본 주소 및 상세 주소"
              class="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="text-[11px] font-semibold text-gray-600 block mb-1">발주 요청 메모 (선택)</label>
            <input
              type="text"
              v-model="orderConfig.memo"
              placeholder="검수 요청사항 또는 물류 특이사항을 입력해 주세요."
              class="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 outline-none bg-white font-medium"
            />
          </div>
        </div>
      </div>

      <!-- 5. 선택 품목 요약 박스 -->
      <div class="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
        <div>
          <span class="text-gray-600 font-medium">발주 대상 품목</span>
          <div class="font-bold text-gray-900 font-mono text-sm mt-0.5">
            총 {{ items.length }}종 ({{ totalQuantity }}개)
          </div>
        </div>
        <div class="text-right">
          <span class="text-gray-600 font-medium">1688 예상 상품대금</span>
          <div class="text-base font-black text-amber-600 font-mono">
            ₩{{ formatNumber(totalKrw) }}원
            <span class="text-xs text-gray-400 font-normal ml-1">(¥{{ totalCny.toFixed(2) }})</span>
          </div>
        </div>
      </div>

      <!-- 모달 하단 액션 버튼 -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition cursor-pointer"
        >
          취소
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="isSubmitting || items.length === 0"
          class="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm transition shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          <Send v-else class="w-4 h-4" />
          <span>{{ isSubmitting ? '발주서 접수 중...' : '수입 발주서 최종 제출 (견적 요청)' }}</span>
        </button>
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
  Loader2
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
  emit('close');
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

    const newOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      inboundNo: `INB-YW-${dateCompact}-${randomSuffix}`,
      createdAt: new Date().toISOString(), // ISO 형식 통일 (크로스 브라우저 정렬 보장)
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
    emit('close');

    alert(
      `선택된 ${targetItems.length}개 품목의 수입 발주서가 정상 접수되었습니다!\n(발주번호: ${finalOrderNumber})\n주문/발주 통합 관리(1. 견적대기) 화면으로 이동합니다.`
    );
    router.push('/dashboard/orders?tab=quote');
  } catch (error) {
    console.error('Submit order error:', error);
    alert('발주서 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>
