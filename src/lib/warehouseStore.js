/**
 * EUCHS B2B Warehouse & Inspection Shared State Store
 * 이우 물류센터 입고, 실측 계근(kg, CBM), 정밀 검수 실사 사진 및 상태 관리
 * Supabase orders 테이블 및 전역 orderStorage와 실시간 동기화됩니다.
 *
 * measuredData 스키마 (v2):
 * {
 *   items: [{ itemIdx, itemId, quantityArrived, verified, arrivalPhotos, verifiedAt }],
 *   allItemsVerified: boolean,
 *   box: { lengthCm, widthCm, heightCm, weightKg, cartons, totalPcs, measureMode, cbm, settledAt },
 *   // 하위 호환 flat 필드 (레거시 참조 코드용)
 *   weightKg, cbm, cartons, totalPcs, defectCount, inspectionDate
 * }
 */
import { getWarehouseInboundsFromOrders, getStoredOrders, saveStoredOrders, updateOrderStatus } from '@/utils/orderStorage';

const STORAGE_KEY = 'euchs_warehouse_inbounds_data';

export const DEFAULT_INBOUNDS = [];

export function loadStoredInbounds() {
  try {
    const list = getWarehouseInboundsFromOrders();
    if (Array.isArray(list)) {
      return list;
    }
  } catch (e) {
    console.warn('[WarehouseStore] Failed to load stored inbounds:', e);
  }
  return [];
}

export function saveStoredInbounds(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('euchs-warehouse-update'));
  } catch (e) {
    console.error('[WarehouseStore] Failed to save inbounds:', e);
  }
}

/**
 * measuredData 구버전(flat) → 신버전(items/box) 정규화
 * 이미 신버전이면 그대로 반환, 구버전이면 변환
 */
export function normalizeMeasuredData(md, orderItems = []) {
  if (!md || typeof md !== 'object') return null;

  // 신버전: items 배열이 있음
  if (Array.isArray(md.items)) return md;

  // 구버전 flat → 신버전으로 래핑 (읽기 전용 변환)
  const isCompleted = (md.cbm > 0 || md.weightKg > 0);
  return {
    items: orderItems.map((item, idx) => ({
      itemIdx: idx,
      itemId: item.id || '',
      quantityArrived: item.quantity || 0,
      verified: isCompleted || item.excluded || false,
      arrivalPhotos: [],
      verifiedAt: isCompleted ? (md.inspectionDate || null) : null,
    })),
    allItemsVerified: isCompleted,
    box: {
      lengthCm: md.lengthCm || 0,
      widthCm: md.widthCm || 0,
      heightCm: md.heightCm || 0,
      weightKg: md.weightKg || 0,
      cartons: md.cartons || 1,
      totalPcs: md.totalPcs || 0,
      measureMode: md.measureMode || 'carton',
      cbm: md.cbm || 0,
      settledAt: md.inspectionDate || null,
    },
    // 레거시 flat 복사
    weightKg: md.weightKg || 0,
    cbm: md.cbm || 0,
    cartons: md.cartons || 1,
    totalPcs: md.totalPcs || 0,
    defectCount: md.defectCount || 0,
    inspectionDate: md.inspectionDate || null,
  };
}

/**
 * WMS 입고/실측/검수 데이터 저장 및 주문 테이블(orders) 연동
 *
 * updates 파라미터:
 *   - measuredData: 신버전 또는 구버전 measuredData 객체 (선택)
 *   - measuredWeightKg, measuredCbm, boxCount: 레거시 flat 방식으로도 받음 (5-B 저장 시)
 *   - secondPayment: 2차 정산 금액 객체
 *   - inspectionStatus, inspectionNote, inspectionPhotos: 기존 필드
 */
export async function updateStoredInboundItem(inboundId, updates) {
  const orders = getStoredOrders();
  const targetOrder = orders.find(o =>
    o.id === inboundId ||
    o.orderNumber === inboundId ||
    o.inboundNo === inboundId ||
    String(o.dbId) === String(inboundId)
  );

  // measuredData 병합: updates.measuredData 우선, 없으면 기존 + flat 필드
  let measuredData;
  if (updates.measuredData && typeof updates.measuredData === 'object') {
    // 신버전 measuredData 직접 전달된 경우
    const newMd = updates.measuredData;
    const box = newMd.box || {};
    measuredData = {
      ...newMd,
      // 레거시 flat 필드 동기화 (읽기 호환용)
      weightKg: box.weightKg ?? newMd.weightKg ?? targetOrder?.measuredData?.weightKg ?? 0,
      cbm: Number((box.cbm ?? newMd.cbm ?? targetOrder?.measuredData?.cbm ?? 0).toFixed(4)),
      cartons: box.cartons ?? newMd.cartons ?? targetOrder?.measuredData?.cartons ?? 1,
      totalPcs: box.totalPcs ?? newMd.totalPcs ?? targetOrder?.measuredData?.totalPcs ?? 0,
      defectCount: newMd.defectCount ?? targetOrder?.measuredData?.defectCount ?? 0,
      inspectionDate: newMd.inspectionDate || targetOrder?.measuredData?.inspectionDate || new Date().toLocaleString('ko-KR'),
    };
  } else {
    // 구버전 flat 방식 (AdminWarehouseView.vue 레거시 경로)
    const cbm = Number(updates.measuredCbm || targetOrder?.measuredData?.cbm || 0);
    const weightKg = Number(updates.measuredWeightKg || targetOrder?.measuredData?.weightKg || 0);
    const boxCount = Number(updates.boxCount || targetOrder?.measuredData?.cartons || 1);
    const existingMd = targetOrder?.measuredData || {};

    measuredData = {
      // 기존 신버전 필드 유지 (있으면)
      ...(Array.isArray(existingMd.items) ? { items: existingMd.items, allItemsVerified: existingMd.allItemsVerified } : {}),
      box: {
        ...(existingMd.box || {}),
        weightKg,
        cbm: Number(cbm.toFixed(4)),
        cartons: boxCount,
      },
      // 레거시 flat 필드
      weightKg,
      cbm: Number(cbm.toFixed(4)),
      cartons: boxCount,
      totalPcs: existingMd.totalPcs || targetOrder?.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0,
      defectCount: updates.issueDetails
        ? Object.values(updates.issueDetails).reduce((s, v) => s + (Number(v) || 0), 0)
        : (existingMd.defectCount || 0),
      inspectionDate: existingMd.inspectionDate || new Date().toLocaleString('ko-KR'),
    };
  }

  // 2차 결제 청구액 계산 (secondPayment가 직접 전달되지 않은 경우 자동 계산)
  const cbmForCalc = measuredData.cbm || measuredData.box?.cbm || 0;
  const shippingFeeKrw = Math.round(Math.max(0.05, cbmForCalc) * 85000);
  const itemTotalKrw = Number(targetOrder?.totalPriceKrw || 0);
  const customsFeeKrw = Math.round(itemTotalKrw * 0.18);

  const secondPayment = updates.secondPayment || {
    shippingFeeKrw,
    customsFeeKrw,
    vasFeeKrw: 0,
    totalSecondPaymentKrw: (shippingFeeKrw + customsFeeKrw) || 133000,
  };

  // 진행 상태 매핑
  let nextOrderStatus = 'inspection_done';
  const s = updates.inspectionStatus;
  if (s === 'defect_found') nextOrderStatus = 'defect_found';
  else if (s === 'ready_to_ship') nextOrderStatus = 'shipping_ready';
  else if (s === 'pending_inbound') nextOrderStatus = 'purchasing';
  else if (s === 'inbound_weighed' || s === 'warehouse_in') nextOrderStatus = 'warehouse_in';
  else if (s === 'arrival_done' || s === 'arrival_checking') nextOrderStatus = 'warehouse_in';
  else if (s === 'inspection_done') nextOrderStatus = 'inspection_done';

  const extraData = {
    measuredData,
    inspectionPhotos: updates.inspectionPhotos || targetOrder?.inspectionPhotos || [],
    secondPayment,
    inspectionStatus: updates.inspectionStatus || 'inspected',
    inspectionNote: updates.inspectionNote || '',
    issueDetails: updates.issueDetails || targetOrder?.issueDetails,
    issueStatus: updates.issueStatus || targetOrder?.issueStatus,
  };

  if (targetOrder) {
    await updateOrderStatus(targetOrder.id, nextOrderStatus, extraData);
  }

  const list = loadStoredInbounds();
  const idx = list.findIndex(i =>
    i.id === inboundId || i.inboundNo === inboundId || i.orderNo === inboundId
  );
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      ...updates,
      measuredData,
      secondPayment,
      inspectionPhotos: extraData.inspectionPhotos,
    };
    saveStoredInbounds(list);
    return list[idx];
  }
  return null;
}
