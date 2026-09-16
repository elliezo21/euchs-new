/**
 * 판매자 그룹 키 생성 함수.
 * CartView.vue(sellerGroups/calcSellerBatchFreight)와
 * AdminOrderManageView.vue(executeStartPurchasing)가 공유하는 그룹핑 기준.
 * ① sellerId 있으면 seller:{sellerId}
 * ② 없으면 item:{num_iid} — num_iid 우선 (itemId → id 폴백)
 *
 * 주의: sellerId/num_iid/itemId/id가 전부 없으면 'item:' (빈 접미사)을 반환한다.
 * AdminOrderManageView.vue는 이 극단 케이스를 독립 그룹(null)으로 별도 처리한다.
 */
export function getSellerGroupKey(item) {
  const sid = (item.sellerId || '').trim();
  if (sid) return `seller:${sid}`;
  const numIid = String(item.num_iid || item.itemId || item.id || '').trim();
  return `item:${numIid}`;
}
