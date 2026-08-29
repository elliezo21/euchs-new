/**
 * EUCHS B2B Warehouse & Inspection Shared State Store
 * 이우 물류센터 입고, 실측 계근(kg, CBM), 정밀 검수 실사 사진 및 상태 관리
 * Supabase orders 테이블 및 전역 orderStorage와 실시간 동기화됩니다.
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
 * WMS 입고/실측/검수 데이터 저장 및 주문 테이블(orders) 연동
 */
export async function updateStoredInboundItem(inboundId, updates) {
  const orders = getStoredOrders();
  const targetOrder = orders.find(o => o.id === inboundId || o.orderNumber === inboundId || o.inboundNo === inboundId || String(o.dbId) === String(inboundId));

  const cbm = Number(updates.measuredCbm || targetOrder?.measuredData?.cbm || 0);
  const weightKg = Number(updates.measuredWeightKg || targetOrder?.measuredData?.weightKg || 0);
  const boxCount = Number(updates.boxCount || targetOrder?.measuredData?.cartons || 1);

  // 2차 결제 청구액 계산 (국제 해운비 + 관부가세)
  const shippingFeeKrw = Math.round(Math.max(0.05, cbm) * 85000);
  const itemTotalKrw = Number(targetOrder?.totalPriceKrw || 0);
  const customsFeeKrw = Math.round(itemTotalKrw * 0.18);
  const totalSecondPaymentKrw = (shippingFeeKrw + customsFeeKrw) || 133000;

  const measuredData = {
    weightKg,
    cbm: Number(cbm.toFixed(4)),
    cartons: boxCount,
    totalPcs: targetOrder?.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 100,
    defectCount: updates.issueDetails ? Object.values(updates.issueDetails).reduce((s, v) => s + (Number(v) || 0), 0) : 0,
    inspectionDate: new Date().toLocaleString('ko-KR')
  };

  const secondPayment = {
    shippingFeeKrw,
    customsFeeKrw,
    vasFeeKrw: 0,
    totalSecondPaymentKrw
  };

  // 진행 상태 매핑 (passed, defect_found, ready_to_ship 등)
  let nextOrderStatus = 'inspection_done';
  if (updates.inspectionStatus === 'defect_found') {
    nextOrderStatus = 'defect_found';
  } else if (updates.inspectionStatus === 'ready_to_ship') {
    nextOrderStatus = 'shipping_ready';
  } else if (updates.inspectionStatus === 'pending_inbound') {
    nextOrderStatus = 'purchasing';
  } else if (updates.inspectionStatus === 'inbound_weighed') {
    nextOrderStatus = 'warehouse_in';
  }

  const extraData = {
    measuredData,
    inspectionPhotos: updates.inspectionPhotos || targetOrder?.inspectionPhotos || [],
    secondPayment,
    inspectionStatus: updates.inspectionStatus || 'inspected',
    inspectionNote: updates.inspectionNote || '',
    issueDetails: updates.issueDetails || targetOrder?.issueDetails,
    issueStatus: updates.issueStatus || targetOrder?.issueStatus
  };

  if (targetOrder) {
    await updateOrderStatus(targetOrder.id, nextOrderStatus, extraData);
  }

  const list = loadStoredInbounds();
  const idx = list.findIndex(i => i.id === inboundId || i.inboundNo === inboundId || i.orderNo === inboundId);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      ...updates,
      measuredData,
      secondPayment,
      inspectionPhotos: extraData.inspectionPhotos
    };
    saveStoredInbounds(list);
    return list[idx];
  }
  return null;
}
