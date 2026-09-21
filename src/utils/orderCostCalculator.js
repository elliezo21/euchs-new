/**
 * EUCHS 주문/장바구니 원가 계산 공용 유틸 — Single Source of Truth
 *
 * ══════════════════════════════════════════════════════════════════
 * ── 확정 계산 공식 (2026-09-09, 전체 시스템 단일 원칙) ────────────
 *
 *   상품대금(KRW) = Σ Math.round(단가(CNY) × 수량 × 환율)
 *     → 품목별로 krwFromCny(단가×수량, 환율)을 각각 구한 뒤 합산
 *     → CNY를 먼저 전부 더한 뒤 마지막에 1번만 환산하는 방식 금지
 *
 *   수수료(KRW) = Math.max(Math.round(상품대금(KRW) × 수수료율), 10,000)
 *     → 수수료 기준: 상품대금만 (택배비 제외)
 *
 *   택배비(KRW) = krwFromCny(택배비CNY, 환율)
 *
 *   총액(KRW) = 상품대금 + 택배비 + 수수료 (+ 해운비, 있으면)
 *
 * ── 수량 우선순위 (skus 구조 대응) ────────────────────────────────
 *   item에 skus 배열이 있고 합계 > 0이면 → Σ sku.quantity (옵션별 합계)
 *   없으면 → item.quantity
 *
 * ── 수수료 정책 ────────────────────────────────────────────────────
 *   수수료 = 상품대금 합계 × 수수료율 (택배비 제외), 최소 ₩10,000
 *
 * ── 수량기반 택배비 추정 ───────────────────────────────────────────
 *   ≤ 10개 → ¥6 / ≤ 30개 → ¥8 / ≤ 100개 → ¥10 / 초과 → ¥12
 *
 * ── 택배비 우선순위 ────────────────────────────────────────────────
 *   1순위: 관리자 수동 입력 (order.chinaFreightRmb / firstPayment.chinaFreightRmb)
 *   2순위: seller 그룹별 실측 운임 (order.sellerFreightRmb — 발주서 접수 시 배열 호출 합산)
 *   3순위: 1688 등록 운임 (item.freight × qty 합산, 0=包邮 유효)
 *   4순위: 수량 기반 추정
 *
 * ── 환율 우선순위 (스냅샷 정책) ───────────────────────────────────
 *   quote_confirmed 이상: snapshotExchangeRate 우선 (DB 고정값)
 *   quote_pending: 최신 settings.exchange_rate 사용
 * ══════════════════════════════════════════════════════════════════
 */

import { normalizeOrderStatus } from '@/lib/orderPipeline';

// ─── 확정 공식 핵심 헬퍼 ──────────────────────────────────────────────────────
/**
 * CNY → KRW 환산 — 프로젝트 유일한 환산 진입점.
 * 반드시 단가×수량을 먼저 계산한 CNY값으로 호출, 반환값들을 합산.
 * @param {number} cnyAmount - CNY 금액 (단가×수량)
 * @param {number} rate - KRW/CNY 환율
 * @returns {number} 원화 정수 (Math.round)
 */
export function krwFromCny(cnyAmount, rate) {
  return Math.round(Number(cnyAmount) * Number(rate));
}

/**
 * 아이템의 실제 수량 반환 — skus 구조 우선
 * skus 배열이 있고 합계 > 0이면 옵션별 quantity 합계, 없으면 item.quantity
 * @param {Object} item
 * @returns {number}
 */
export function resolveItemQty(item) {
  // ★ skus 우선 — DB 원본 확인으로 확정 (2026-09-09)
  // item.quantity는 CartView 스테퍼가 skus와 미동기화 상태일 수 있어 신뢰 불가
  // skus 배열이 있고 합계 > 0이면 → Σ sku.quantity 사용
  // skus 없거나 합계 0이면 → item.quantity 폴백
  if (Array.isArray(item.skus) && item.skus.length > 0) {
    const skuSum = item.skus.reduce((s, sk) => s + (Number(sk.quantity || sk.qty) || 0), 0);
    if (skuSum > 0) return skuSum;
  }
  return Number(item.quantity || item.qty || item.orderQty) || 1;
}


// ── 수량 기반 택배비 추정 기준 ────────────────────────────────────────────────
const FREIGHT_TIERS = [
  { maxQty: 10,  rmb: 6  },
  { maxQty: 30,  rmb: 8  },
  { maxQty: 100, rmb: 10 },
];
const FREIGHT_DEFAULT_RMB = 12;

/**
 * 수량 기반 중국 내륙 택배비 추정 (¥)
 */
export function estimateFreightRmb(totalQty) {
  for (const tier of FREIGHT_TIERS) {
    if (totalQty <= tier.maxQty) return tier.rmb;
  }
  return FREIGHT_DEFAULT_RMB;
}

/**
 * 주문에 적용할 환율 결정 (스냅샷 정책)
 */
export function resolveExchangeRate(order, settingsRate) {
  const status = normalizeOrderStatus(order?.status);
  const isPreApproval = (status === 'quote_pending' || !status);
  if (!isPreApproval) {
    const snapshot = order?.snapshotExchangeRate ?? order?.firstPayment?.snapshotExchangeRate;
    if (snapshot !== undefined && snapshot !== null && !isNaN(Number(snapshot))) {
      return Number(snapshot);
    }
  }
  return settingsRate != null ? Number(settingsRate) : null;
}

/**
 * 장바구니 아이템 목록의 CNY 총액 계산 (환율 무관, 순수 CNY 합계)
 * @param {Array} items - { priceCny|price, quantity } 배열
 * @returns {number} CNY 합계 (소수점 유지)
 */
export function sumItemsCny(items) {
  if (!Array.isArray(items)) return 0;
  return items
    .filter(i => !i.excluded)
    .reduce((sum, i) => {
      const p = Number(i.priceCny || i.price || i.unitPriceCny) || 0;
      const q = resolveItemQty(i);
      return sum + p * q;
    }, 0);
}

/**
 * 장바구니 단순 합계 계산 — 상품대금만 (수수료/택배비/해운비 미포함)
 * CartView, OrderConfigModal, ProductDetailModal 의 단순 소계/합계 표시용
 *
 * 반올림 원칙: CNY 전체 합계 → 마지막 1번 환산
 *
 * @param {Array} items - 장바구니 아이템 배열
 * @param {number} rate - 적용 환율 (KRW/CNY)
 * @returns {{ totalCny: number, totalKrw: number, totalQty: number }}
 */
export function calcCartTotal(items, rate) {
  const activeItems = (items || []).filter(i => !i.excluded);
  let totalCny = 0;
  let totalKrw = 0;
  let totalQty = 0;
  for (const i of activeItems) {
    const p = Number(i.priceCny || i.price || i.unitPriceCny) || 0;
    const q = resolveItemQty(i);
    const subtotalCny = p * q;
    totalCny += subtotalCny;
    totalKrw += krwFromCny(subtotalCny, rate);  // 확정 공식: 품목별 반올림 후 합산
    totalQty += q;
  }
  return {
    totalCny: Number(totalCny.toFixed(2)),
    totalKrw,
    totalQty,
  };
}

/**
 * 장바구니/발주모달 단계의 예상 총액 계산 (수수료, 현지택배비 포함)
 * 주문 객체 생성 전이므로 calcOrderCost({ items, status: 'quote_pending' }, settings)를 직접 호출하여 동일한 계산 SSOT 보장.
 *
 * @param {Array}  items             - 장바구니/발주 아이템 배열
 * @param {Object} settings          - { exchange_rate, agency_fee_rate, sea_cbm_rate }
 * @param {number|null} sellerFreightRmb - seller 그룹 배치 호출 결과 운임(CNY). null이면 item.freight 합산→추정 폴백.
 * @returns {Object} calcOrderCost 반환 객체 (itemTotalKrw, chinaFreightKrw, agencyFeeKrw, chargeableKrw 등)
 */
export function calcCartEstimatedCost(items, settings = {}, sellerFreightRmb = null) {
  const pseudoOrder = {
    status: 'quote_pending',
    items: Array.isArray(items) ? items : [],
    // sellerFreightRmb: 배치 호출 성공 시 2순위로 반영 (null이면 3순위 item.freight 합산으로 흐름)
    ...(sellerFreightRmb !== null && sellerFreightRmb !== undefined ? { sellerFreightRmb } : {}),
  };
  return calcOrderCost(pseudoOrder, settings);
}

/**
 * 주문 원가 계산 — 메인 함수 (주문서 존재하는 경우)
 * @param {Object} order
 * @param {Object} settings - { exchange_rate, agency_fee_rate, sea_cbm_rate }
 */
export function calcOrderCost(order, settings = {}) {
  const activeItems = (order?.items || []).filter(i => !i.excluded);
  if (activeItems.length === 0) {
    return {
      exchangeRate: Number(settings.exchange_rate) || 200.0,
      itemTotalCny: 0, itemTotalKrw: 0,
      chinaFreightRmb: 0, chinaFreightKrw: 0,
      agencyFeeKrw: 0, agencyFeeCny: 0,
      cbm: 0, shippingFeeKrw: 0, shippingFeeCny: 0, shippingConfirmed: false,
      chargeableKrw: 0, chargeableCny: 0,
      avgPriceCny: 0, totalQty: 0,
      tariffKrw: 0, vatKrw: 0, totalDdpKrw: 0, unitDdpKrw: 0,
    };
  }

  // 1. 환율
  const settingsRate = Number(settings.exchange_rate) || 200.0;
  const exchangeRate = resolveExchangeRate(order, settingsRate);
  const agencyRate = (Number(settings.agency_fee_rate) || 8.0) / 100;
  const seaCbmRate = Number(settings.sea_cbm_rate) || 98000;

  // 2. 상품 합계 — 확정 공식: 품목별 krwFromCny(단가×수량, 환율) → 합산
  //    수량: skus 배열 있으면 Σ sku.quantity, 없으면 item.quantity (resolveItemQty)
  let totalQty = 0;
  let itemTotalCny = 0;
  let itemTotalKrw = 0;
  activeItems.forEach(i => {
    const q = resolveItemQty(i);  // skus 구조 우선 수량
    const p = Number(i.priceCny || i.price || i.unitPriceCny) || 0;
    const subtotalCny = p * q;
    totalQty += q;
    itemTotalCny += subtotalCny;
    itemTotalKrw += krwFromCny(subtotalCny, exchangeRate);  // 확정 공식
  });
  const avgPriceCny = totalQty > 0 ? itemTotalCny / totalQty : 0;

  // 3. 중국 내륙 택배비 — 4단계 우선순위 (SSOT)
  //   1순위: 관리자 수동 입력값 (order.chinaFreightRmb / firstPayment.chinaFreightRmb)
  //   2순위: seller 그룹별 실측 운임 (order.sellerFreightRmb — 발주서 접수 시 배열 호출 합산)
  //   3순위: 1688 실비 (item.freight — "품목 수량 기준 총 배송비", 0=包邮 유효, null만 폴백)
  //          여러 품목 있으면 품목별 총 운임 단순 합산 (× qty 없음 — freight 자체가 이미 수량 반영값)
  //   4순위: 수량기반 추정치 (estimateFreightRmb — 1688이 freight를 아예 안 줄 때 최후 폴백)
  const customFreight =
    (order.chinaFreightRmb !== null && order.chinaFreightRmb !== undefined)
      ? Number(order.chinaFreightRmb)
      : (order.firstPayment?.chinaFreightRmb !== null && order.firstPayment?.chinaFreightRmb !== undefined)
        ? Number(order.firstPayment.chinaFreightRmb)
        : null;

  // seller 그룹별 실측 운임 — 발주서 접수 시 1688 createOrder.preview 배열 호출 합산값
  // (first_payment JSONB에 영속 — chinaFreightRmb와 동일한 저장 경로)
  const sellerFreight =
    (order.sellerFreightRmb !== null && order.sellerFreightRmb !== undefined)
      ? Number(order.sellerFreightRmb)
      : (order.firstPayment?.sellerFreightRmb !== null && order.firstPayment?.sellerFreightRmb !== undefined)
        ? Number(order.firstPayment.sellerFreightRmb)
        : null;

  let chinaFreightRmb;
  let chinaFreightOrigin; // 'custom' | '1688_seller' | '1688_exact' | 'estimated'
  if (customFreight !== null) {
    chinaFreightRmb = customFreight;
    chinaFreightOrigin = 'custom';
  } else if (sellerFreight !== null) {
    chinaFreightRmb = sellerFreight;
    chinaFreightOrigin = '1688_seller';
  } else {
    let itemFreightSum = 0;
    let allFreightKnown = true;
    for (const i of activeItems) {
      if (i.freight === null || i.freight === undefined) {
        allFreightKnown = false;
        break;
      }
      // ※ item.freight = 해당 품목의 수량 기준 총 배송비 (개당 단가가 아님)
      //    따라서 수량 곱셈 없이 단순 합산 (× resolveItemQty(i) 제거)
      itemFreightSum += Number(i.freight);
    }
    if (allFreightKnown) {
      chinaFreightRmb = Number(itemFreightSum.toFixed(2));
      chinaFreightOrigin = '1688_exact';
    } else {
      chinaFreightRmb = estimateFreightRmb(totalQty);
      chinaFreightOrigin = 'estimated';
    }
  }
  const chinaFreightKrw = krwFromCny(chinaFreightRmb, exchangeRate);  // 마지막 1번 환산

  // 4. 수수료 (상품대금 기준, 최소 ₩10,000)
  const rawFee = Math.round(itemTotalKrw * agencyRate);
  const agencyFeeKrw = Math.max(rawFee, 10000);

  // 5. 해운비 (실측 CBM 있을 때만)
  const md = order.measuredData || order.measured_data || {};
  const measuredCbm = Number(md.cbm || md.box?.cbm || 0);
  const shippingConfirmed = measuredCbm > 0;
  const cbm = shippingConfirmed ? Number(measuredCbm.toFixed(4)) : 0;
  const shippingFeeKrw = shippingConfirmed ? Math.round(cbm * seaCbmRate) : 0;

  // 6. 실제 청구액
  const chargeableKrw = itemTotalKrw + chinaFreightKrw + agencyFeeKrw + shippingFeeKrw;

  // 6-1. CNY 병기용 구성항목 — 화면에서 따로 더하거나 나누지 말고 여기 값을 쓸 것.
  //   수수료/해운비는 원화로 산출되는 항목이라 환율로 역산한다.
  //   총액 ¥ = 상품값 ¥ + 택배비 ¥ + 수수료 ¥ (+ 해운비 ¥)
  //   ※ itemTotalKrw는 품목별 반올림 합이므로 chargeableKrw와 chargeableCny×환율은
  //     반올림 오차(원 단위) 범위에서 다를 수 있다. 표시 전용 값이다.
  const agencyFeeCny = exchangeRate > 0 ? Number((agencyFeeKrw / exchangeRate).toFixed(2)) : 0;
  const shippingFeeCny = exchangeRate > 0 ? Number((shippingFeeKrw / exchangeRate).toFixed(2)) : 0;
  const chargeableCny = Number(
    (itemTotalCny + Number(chinaFreightRmb) + agencyFeeCny + shippingFeeCny).toFixed(2)
  );

  // 7. 참고용 DDP
  const dutiableValueKrw = itemTotalKrw + shippingFeeKrw;
  const tariffKrw = Math.round(dutiableValueKrw * 0.08);
  const vatKrw = Math.round((dutiableValueKrw + tariffKrw) * 0.10);
  const totalDdpKrw = chargeableKrw + tariffKrw + vatKrw;
  const unitDdpKrw = totalQty > 0 ? Math.round(totalDdpKrw / totalQty) : 0;

  return {
    exchangeRate,
    itemTotalCny: Number(itemTotalCny.toFixed(2)),
    itemTotalKrw,
    chinaFreightRmb,
    chinaFreightKrw,
    chinaFreightOrigin,  // 'custom' | '1688_seller' | '1688_exact' | 'estimated'
    agencyFeeKrw,
    agencyFeeCny,
    cbm,
    shippingFeeKrw,
    shippingFeeCny,
    shippingConfirmed,
    chargeableKrw,
    chargeableCny,
    avgPriceCny: Number(avgPriceCny.toFixed(2)),
    totalQty,
    tariffKrw,
    vatKrw,
    totalDdpKrw,
    unitDdpKrw,
  };
}

