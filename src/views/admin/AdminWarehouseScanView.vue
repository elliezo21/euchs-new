<template>
  <div class="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
    <!-- 복원 로딩 오버레이 -->
    <Transition enter-active-class="transition-opacity duration-150" leave-active-class="transition-opacity duration-300" enter-from-class="opacity-0" leave-to-class="opacity-0">
      <div v-if="isRestoring" class="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900">
        <div class="flex flex-col items-center gap-5">
          <div class="w-14 h-14 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center">
            <i class="fas fa-circle-notch animate-spin text-teal-400 text-2xl"></i>
          </div>
          <div class="text-center">
            <p class="font-bold text-white text-base">이전 작업 불러오는 중...</p>
            <p class="text-slate-400 text-xs mt-1">촬영한 내용을 복원하고 있습니다</p>
          </div>
        </div>
      </div>
    </Transition>
    <!-- 헤더 -->
    <div class="px-4 pt-4 pb-3 border-b border-slate-700/60 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-md"><i class="fas fa-barcode text-white text-base"></i></div>
        <div>
          <div class="font-black text-white text-sm">이우 창고 입고 스캔</div>
          <div class="text-[11px] text-slate-400 font-mono">중국 택배 운송장(运单号) 바코드 스캔</div>
        </div>
      </div>
      <router-link to="/admin" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition flex items-center gap-1.5">
        <i class="fas fa-arrow-left text-xs"></i><span>대시보드</span>
      </router-link>
    </div>
    <!-- 메인 -->
    <div class="flex-1 flex flex-col items-center justify-start pt-6 pb-10 px-4 space-y-5 max-w-lg mx-auto w-full">
      <div class="w-full space-y-2">
        <label class="block text-xs font-bold text-slate-400 tracking-wide uppercase">운송장 번호 입력 (스캐너 또는 수동 입력)</label>
        <div class="relative">
          <input ref="scanInputRef" v-model="scanInput" type="text" inputmode="numeric" placeholder="바코드를 스캔하거나 운송장번호를 입력하세요" class="w-full px-4 py-4 bg-slate-800 border-2 rounded-2xl text-white placeholder-slate-500 text-base font-mono focus:outline-none transition border-slate-600 focus:border-teal-500 focus:bg-slate-800/80" :class="scanStatus === 'error' ? 'border-rose-500' : scanStatus === 'success' ? 'border-teal-500' : ''" @keydown.enter.prevent="handleScan" @input="scanStatus = 'idle'" autofocus />
          <button v-if="scanInput" type="button" @click="clearInput" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"><i class="fas fa-xmark text-lg"></i></button>
        </div>
        <div v-if="scanStatus === 'error'" class="flex items-center gap-2 text-rose-400 text-xs font-bold px-1">
          <i class="fas fa-circle-exclamation"></i><span>{{ errorMessage }}</span>
          <a href="/admin/orders" class="ml-auto text-rose-300 hover:text-white underline underline-offset-2 font-bold transition">수동 검색 →</a>
        </div>
        <div v-else-if="scanStatus === 'searching'" class="flex items-center gap-2 text-teal-400 text-xs font-bold px-1"><i class="fas fa-circle-notch animate-spin"></i><span>주문 매칭 중...</span></div>
        <div v-else class="text-[11px] text-slate-500 px-1">Enter 키 또는 스캐너 입력 시 자동 검색 · 블루투스/유선 스캐너 모두 지원</div>
      </div>
      <button type="button" @click="handleScan" :disabled="!scanInput.trim() || scanStatus === 'searching'" class="w-full py-4 rounded-2xl font-black text-base transition active:scale-95 shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed bg-teal-600 hover:bg-teal-500 text-white">
        <i class="fas fa-magnifying-glass text-lg"></i><span>운송장 조회</span>
      </button>
      <div class="w-full space-y-2">
        <button type="button" @click="toggleCamera" class="w-full py-3.5 rounded-2xl font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2.5 border-2 border-slate-600 hover:border-teal-500 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white" :class="isCameraOpen ? 'border-teal-500 text-teal-400' : ''">
          <i :class="isCameraOpen ? 'fas fa-video-slash' : 'fas fa-camera'" class="text-base"></i>
          <span>{{ isCameraOpen ? '카메라 스캔 중지' : '카메라로 스캔' }}</span>
        </button>
        <div v-show="isCameraOpen" class="w-full rounded-2xl overflow-hidden border-2 border-teal-500/40 bg-slate-800"><div id="qr-reader" class="w-full"></div></div>
      </div>
      <div class="w-full flex items-center gap-3">
        <div class="flex-1 h-px bg-slate-700"></div><span class="text-[11px] text-slate-500 font-mono">최근 스캔 이력</span><div class="flex-1 h-px bg-slate-700"></div>
      </div>
      <div class="w-full space-y-2">
        <div v-if="scanHistory.length === 0" class="text-center py-6 text-slate-500 text-xs"><i class="fas fa-clock-rotate-left text-2xl mb-2 block"></i>스캔 이력이 없습니다</div>
        <div v-for="(item, idx) in scanHistory" :key="idx" class="flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-mono" :class="item.success ? 'bg-teal-900/30 border-teal-700/40 text-teal-300' : 'bg-rose-900/30 border-rose-700/40 text-rose-400'">
          <i :class="item.success ? 'fas fa-check-circle text-teal-400' : 'fas fa-times-circle text-rose-400'"></i>
          <span class="flex-1 truncate">{{ item.trackingNo }}</span>
          <span class="text-[10px] opacity-60">{{ item.time }}</span>
          <span v-if="item.success" class="text-[10px] text-teal-400 font-bold">{{ item.orderNo }}</span>
        </div>
      </div>
    </div>
    <AdminWarehouseModal v-model="showWarehouseModal" :application="warehouseModalTarget" @saved="handleWarehouseSaved" @camera-triggered="handleCameraTriggered" @modal-closed="handleModalClosed" />
    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="translate-y-4 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition-all duration-200 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-4 opacity-0">
      <div v-if="toast.show" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold min-w-[300px] max-w-[480px]" :class="toast.type === 'success' ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'">
        <span class="text-lg shrink-0">{{ toast.type === 'success' ? '✅' : '⚠️' }}</span>
        <span class="flex-1 leading-snug">{{ toast.message }}</span>
        <button type="button" @click="toast.show = false" class="ml-2 p-1 rounded-lg hover:bg-white/20 transition shrink-0"><i class="fas fa-times"></i></button>
      </div>
    </Transition>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import AdminWarehouseModal from '@/components/admin/AdminWarehouseModal.vue';
import { fetchOrdersFromSupabase, getStoredOrders } from '@/utils/orderStorage';
import { normalizeOrderStatus } from '@/lib/orderPipeline';

const RESTORE_KEY = 'euchs_scan_restore';

const scanInputRef = ref(null);
const scanInput = ref('');
const scanStatus = ref('idle');
const errorMessage = ref('');
const isCameraOpen = ref(false);
const scanHistory = ref([]);

const showWarehouseModal = ref(false);
const warehouseModalTarget = ref(null);
const isRestoring = ref(false);

const toast = ref({ show: false, type: 'success', message: '' });
let _toastTimer = null;
let html5QrCode = null;

// ── sessionStorage 저장/복원/정리 ─────────────────────────────
// 카메라 버튼 클릭 직전 AdminWarehouseModal이 emit('camera-triggered', snapshot)으로
// 전달한 5-A 폼 전체 스냅샷을 sessionStorage에 저장.
// 저장 내용: orderId, orderNo, tab, arrivalItems(수량/verified/사진/동영상),
//            inspectionNote, inspectionNoteId, arrivalVasItems
function handleCameraTriggered(snapshot) {
  try {
    sessionStorage.setItem(RESTORE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('[WarehouseScan] sessionStorage 저장 실패:', e);
  }
}

// 정리 시점: (1) @saved 저장 완료, (2) @modal-closed 닫기
// 이 두 시점 외에는 삭제하지 않음 (연속 촬영 중 데이터 소실 방지)
function clearRestoreState() {
  try { sessionStorage.removeItem(RESTORE_KEY); } catch (_) {}
}

// ── 스캔 처리 ─────────────────────────────────────────────────
async function handleScan() {
  const trackingNo = scanInput.value.trim();
  if (!trackingNo) return;

  scanStatus.value = 'searching';
  errorMessage.value = '';

  try {
    let orders = [];
    try {
      orders = await fetchOrdersFromSupabase({ isAdmin: true });
    } catch (dbErr) {
      console.warn('[WarehouseScan] DB fetch failed, using local cache:', dbErr);
      orders = getStoredOrders();
    }
    if (!Array.isArray(orders)) orders = [];

    let matchedOrder = null;
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      const idx = items.findIndex(
        item => item.chinaTrackingNo && String(item.chinaTrackingNo).trim() === trackingNo
      );
      if (idx !== -1) { matchedOrder = order; break; }
    }

    if (!matchedOrder) {
      scanStatus.value = 'error';
      errorMessage.value = `운송장 번호 "${trackingNo}" 와 일치하는 주문이 없습니다. 송장번호가 입력된 주문인지 확인하세요.`;
      addHistory(trackingNo, false, '');
      return;
    }

    scanStatus.value = 'success';
    addHistory(trackingNo, true, matchedOrder.orderNumber || matchedOrder.id);
    openWarehouseModal(matchedOrder);

  } catch (err) {
    console.error('[WarehouseScan] 매칭 오류:', err);
    scanStatus.value = 'error';
    errorMessage.value = `조회 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`;
  }
}

// ── AdminWarehouseModal 열기 ───────────────────────────────────
function openWarehouseModal(order) {
  const appLike = {
    id: order.id,
    orderNo: order.orderNumber,
    customer_name: order.buyerInfo?.companyName || order.buyerInfo?.buyerName || order.buyerName || '',
    phone: order.buyerInfo?.phone || order.buyerPhone || '',
    service_type: 'purchasing',
    initialTab: 'arrival',
    vas_services: (order.vas_services?.length ? order.vas_services : null) || (order.vasServices?.length ? order.vasServices : null) || [],
    vasServices:  (order.vasServices?.length  ? order.vasServices  : null) || (order.vas_services?.length ? order.vas_services : null) || [],
    warehouseVasApplied: order.warehouseVasApplied || [],
    vasApplied: order.vasApplied || [],
    total_amount: order.totalPriceKrw || order.total_amount || 0,
    details: {
      inboundId: order.id,
      inboundNo: order.inboundNo || order.orderNumber,
      items: order.items || [],
      measuredData: order.measuredData,
      inspectionPhotos: order.inspectionPhotos || order.inspection_photos || [],
      inspectionNote: order.inspectionNote || '',
      issueDetails: order.issueDetails,
      issueStatus: order.issueStatus,
      vas_services: (order.vas_services?.length ? order.vas_services : null) || (order.vasServices?.length ? order.vasServices : null) || [],
      vasServices:  (order.vasServices?.length  ? order.vasServices  : null) || (order.vas_services?.length ? order.vas_services : null) || [],
      vasApplied:   order.vasApplied || [],
      warehouseVasApplied: order.warehouseVasApplied || [],
    },
  };
  warehouseModalTarget.value = appLike;
  showWarehouseModal.value = true;
}

// ── @saved 콜백 ───────────────────────────────────────────────
function handleWarehouseSaved(payload) {
  const label = payload.tab === 'box' ? '5-B CBM 정산' : payload.tab === 'issue' ? '5-C 이슈' : '5-A 도착검수';
  showToast(`[${payload.orderNo || '주문'}] ${label} 저장 완료 — 연속 스캔 준비됨`, 'success');
  clearRestoreState(); // ★ 저장 완료 시 sessionStorage 정리
  clearInput();
  nextTick(() => { scanInputRef.value?.focus(); });
}

// ── @modal-closed 콜백 (닫기 버튼으로 그냥 닫은 경우) ─────────
function handleModalClosed() {
  clearRestoreState(); // ★ 닫기 시 sessionStorage 정리
}

// ── 탭 리로드 후 복원 로직 ────────────────────────────────────
async function _tryRestoreFromCamera() {
  let saved;
  try {
    const raw = sessionStorage.getItem(RESTORE_KEY);
    if (!raw) return;
    saved = JSON.parse(raw);
  } catch (_) { return; }

  if (!saved?.orderId) return;

  isRestoring.value = true; // ① 로딩 오버레이 즉시 표시

  const TIMEOUT_MS = 10000;
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    isRestoring.value = false;
    clearRestoreState();
    showToast('이전 작업 복원 시간 초과 — 다시 스캔해주세요', 'error', 6000);
  }, TIMEOUT_MS);

  try {
    // ② DB 재조회
    let orders = [];
    try {
      orders = await fetchOrdersFromSupabase({ isAdmin: true });
    } catch (dbErr) {
      console.warn('[WarehouseScan] 복원용 DB fetch 실패, 로컬 캐시 fallback:', dbErr);
      orders = getStoredOrders();
    }
    if (!Array.isArray(orders)) orders = [];
    if (didTimeout) return;

    const order = orders.find(o => o.id === saved.orderId);
    if (!order) {
      clearTimeout(timeoutId);
      isRestoring.value = false;
      clearRestoreState();
      showToast('이전 작업 복원 실패 — 주문을 찾을 수 없습니다. 다시 스캔해주세요', 'error', 7000);
      return;
    }

    // ③ 복원 스냅샷의 arrivalItems를 measuredData.items로 주입
    // AdminWarehouseModal은 details.measuredData.items를 arrivalItems로 복원하므로
    // 이 경로를 통해 촬영 직전 입력값(수량/verified/사진/동영상)을 그대로 복구
    const restoredOrder = {
      ...order,
      measuredData: {
        ...(order.measuredData || {}),
        items: saved.arrivalItems?.length ? saved.arrivalItems : (order.measuredData?.items || []),
      },
      inspectionNote: saved.inspectionNote || order.inspectionNote || '',
    };

    openWarehouseModal(restoredOrder); // ④ 모달 열기

    clearTimeout(timeoutId);
    isRestoring.value = false;
    // ★ sessionStorage 유지 — 연속 촬영 가능 (저장/닫기 시에만 정리)
    showToast('이전 작업이 복원되었습니다', 'success', 3000);
    return true; // ★ 복원 성공 신호 — onMounted에서 scanInputRef.focus() 건너뜀

  } catch (err) {
    if (didTimeout) return;
    clearTimeout(timeoutId);
    isRestoring.value = false;
    clearRestoreState();
    console.error('[WarehouseScan] 복원 중 오류:', err);
    showToast(`이전 작업 복원 실패 — 다시 스캔해주세요 (${err.message || '오류'})`, 'error', 7000);
  }
}

// ── 카메라 스캔 (html5-qrcode) ───────────────────────────────
async function toggleCamera() {
  if (isCameraOpen.value) { await stopCamera(); } else { await startCamera(); }
}

async function startCamera() {
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    if (html5QrCode) { try { await html5QrCode.stop(); } catch (_) {} }
    html5QrCode = new Html5Qrcode('qr-reader');
    isCameraOpen.value = true;
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 160 } },
      (decodedText) => { scanInput.value = decodedText.trim(); scanStatus.value = 'idle'; stopCamera(); handleScan(); },
      (_errorMsg) => {}
    );
  } catch (err) {
    console.error('[WarehouseScan] 카메라 시작 실패:', err);
    showToast(`카메라를 시작할 수 없습니다: ${err.message || '권한을 확인해주세요'}`, 'error');
    isCameraOpen.value = false;
  }
}

async function stopCamera() {
  isCameraOpen.value = false;
  if (html5QrCode) { try { await html5QrCode.stop(); } catch (_) {} html5QrCode = null; }
  nextTick(() => { scanInputRef.value?.focus(); });
}

// ── 유틸 ──────────────────────────────────────────────────────
function clearInput() { scanInput.value = ''; scanStatus.value = 'idle'; errorMessage.value = ''; }

function addHistory(trackingNo, success, orderNo) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  scanHistory.value.unshift({ trackingNo, success, orderNo, time });
  if (scanHistory.value.length > 5) scanHistory.value.pop();
}

function showToast(message, type = 'success', durationMs = 4000) {
  if (_toastTimer) clearTimeout(_toastTimer);
  toast.value = { show: true, type, message };
  _toastTimer = setTimeout(() => { toast.value.show = false; }, durationMs);
}

// ── 생명주기 ──────────────────────────────────────────────────
onMounted(async () => {
  // ★ 정상 첫 진입: sessionStorage 없음 → 즉시 return (성능 영향 없음)
  // 카메라 복귀 후 탭 리로드: sessionStorage 감지 → 오버레이 → 복원
  const restored = await _tryRestoreFromCamera();

  // 복원 성공(모달 열림) 시에는 배경 입력창에 focus 주지 않음
  // — 모달 열린 채로 scanInputRef.focus()를 주면 안드로이드에서
  //   이후 카메라 input.click() 시 키보드가 올라오는 버그 원인이 됨
  if (!restored) {
    nextTick(() => { scanInputRef.value?.focus(); });
  }
});

onUnmounted(() => {
  if (_toastTimer) clearTimeout(_toastTimer);
  stopCamera();
});
</script>
