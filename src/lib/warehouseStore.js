/**
 * EUCHS B2B Warehouse & Inspection Shared State Store
 * 이우 물류센터 입고, 실측 계근(kg, CBM), 정밀 검수 실사 사진 및 상태 관리
 */
import { getWarehouseInboundsFromOrders, getStoredOrders, saveStoredOrders } from '@/utils/orderStorage';

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

export function updateStoredInboundItem(inboundId, updates) {
  const list = loadStoredInbounds();
  const idx = list.findIndex(i => i.id === inboundId || i.inboundNo === inboundId || i.orderNo === inboundId);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      ...updates
    };
    saveStoredInbounds(list);
    return list[idx];
  }
  return null;
}
