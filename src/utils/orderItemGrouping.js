/**
 * 주문 품목(order.items[]) 그룹핑 공용 유틸
 *
 * - resolveProductGroupIdentity: OrderDetailModal.vue / OrderManageView.vue / WarehouseView.vue
 *   3곳의 getGroupedOrderItems()가 공통으로 쓰던 groupKey 산출 로직만 추출한 것.
 *   (itemId → productUrl → productName 우선순위 fallback)
 *   SKU 세부 처리 / 제외품목(excluded) 처리 / 환율 계산 등 나머지 로직은
 *   각 파일마다 실제 동작이 달라 그대로 남아있음 — 이 함수는 groupKey 계산만 대신함.
 *
 * - getPurchaseGroupKey / groupItemsByPurchase: 중국 내륙 배송(구매진행) 표시용,
 *   1688 구매번호(purchaseNo) 기준 그룹핑. AdminOrderManageView.vue의
 *   adminTrackingGroups computed와 동일한 grouping 원칙(purchaseNo 동일 = 같은 배송건)을
 *   고객 화면에서도 재사용하기 위해 신설.
 */

export function resolveProductGroupIdentity(it, fallbackName) {
  const prodId = it.itemId || (it.id && !String(it.id).includes('_') ? it.id : null) || '';
  const prodUrl = it.productUrl || it.url || it.detailUrl || it.link || '';
  const prodName = it.productName || it.titleKo || it.name || it.titleZh || fallbackName;
  const groupKey = prodId ? `id_${prodId}` : (prodUrl ? `url_${prodUrl}` : `name_${prodName}`);
  return { groupKey, prodId, prodUrl, prodName };
}

export function getPurchaseGroupKey(item) {
  const purchaseNo = (item?.purchaseNo || '').trim();
  return purchaseNo || null;
}

export function groupItemsByPurchase(items) {
  if (!Array.isArray(items)) return [];
  const groupsMap = new Map();
  items.forEach((item, idx) => {
    if (!item || item.excluded) return;
    const key = getPurchaseGroupKey(item);
    if (!key) return;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { purchaseNo: key, primaryItem: item, items: [] });
    }
    groupsMap.get(key).items.push({ item, idx });
  });
  return Array.from(groupsMap.values());
}

// 快递100 "배달완료" 상태 텍스트 — api/kuaidi100-track.js STATE_LABEL_MAP['3']와
// 동일한 문자열이어야 매칭되므로 값을 바꾸지 말 것.
const CHINA_DELIVERED_STATUS_TEXT = '배달완료';

// 상품(item) 단위로 중국 내륙 택배 배지 표시용 라벨/색상을 계산.
// WarehouseView.vue / OrderDetailModal.vue의 상품별 인라인 배지가 공용으로 사용.
export function getChinaTrackingBadge(item) {
  const trackingNo = item?.chinaTrackingNo || '';
  if (!trackingNo) {
    return {
      label: '판매자 발송준비중',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
    };
  }
  const carrier = item.chinaCarrier || '택배사 확인중';
  const status = item.chinaLogisticsStatus || '배송중';
  const isDelivered = status === CHINA_DELIVERED_STATUS_TEXT;
  return {
    label: `${carrier} · ${status}`,
    badgeClass: isDelivered
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-blue-50 text-blue-700 border border-blue-200',
  };
}
