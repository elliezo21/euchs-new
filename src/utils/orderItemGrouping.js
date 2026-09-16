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
