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

/**
 * 플레이스홀더 판매자 이름 목록 (표시 이름 후보에서 제외)
 * — 이 값들은 실제 공급사 이름이 아닌 폴백 기본값.
 * CartView.vue(장바구니 카드)와 AdminOrderManageView.vue(관리자 발주 상세 모달)가 공유.
 */
export const SELLER_PLACEHOLDER_NAMES = ['1688 공급사', '1688 공급처', '1688 인증 직영 제조공장'];

/**
 * 판매자 카드 표시 이름 결정.
 * sellerName / company가 플레이스홀더가 아니면 그대로 사용, 아니면 "판매자 {seq}"
 */
export function getSellerDisplayName(item, seq) {
  const raw = item.sellerName || item.company || '';
  if (raw && !SELLER_PLACEHOLDER_NAMES.includes(raw)) return raw;
  return `판매자 ${seq}`;
}
