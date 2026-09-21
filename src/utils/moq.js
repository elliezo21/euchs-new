/**
 * 1688 최소 주문 수량(MOQ) 판정 공용 유틸.
 *
 * ★ 판정 기준: "옵션(SKU) 개별 수량"이 아니라 "같은 1688 상품(offerId) 수량 합계".
 *   근거(2026-09-21 offerId=965629045344 OneBound item_get 실측):
 *     - item.min_num = 2, item.mix_number = 2 (混批 = 옵션 혼합 시 최소 합계)
 *     - sku 객체 스키마(price/quantity/sku_id/spec_id/properties…)에 최소수량 필드 없음
 *       → SKU별 MOQ는 이 API로 표현 자체가 불가능
 *
 * 그룹 키는 num_iid 하나로 확정한다(itemId는 구 데이터에서 합성 SKU 키나
 * '1688-item' 리터럴로 폴백되어 그룹핑 키로 쓸 수 없음).
 */

/** 수량 합계 (문자열/누락 수량은 0으로 취급) */
export function sumQty(rows) {
  return rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
}

/**
 * MOQ 값 정규화. 숫자가 아니거나 1 미만이면 1, 그 외는 값 그대로.
 * ※ 상한(예: >10000 → 1) 폴백을 두지 않는다 — 이상값에서 가드가 조용히 꺼지는 구멍이 됨.
 */
export function resolveMoq(raw) {
  const mo = parseInt(raw ?? '1', 10)
  if (!Number.isFinite(mo) || mo < 1) return 1
  return mo
}

/**
 * 장바구니 행들을 같은 1688 상품끼리 묶는 키.
 * num_iid가 빈 구 데이터 행은 그 행 단독 그룹으로 분리한다
 * (빈 키로 서로 다른 상품이 뭉쳐 MOQ를 잘못 충족시키는 오판 방지).
 */
export function offerGroupKey(row) {
  const numIid = String(row?.num_iid || '').trim()
  return numIid ? `offer:${numIid}` : `row:${row?.id || ''}`
}
