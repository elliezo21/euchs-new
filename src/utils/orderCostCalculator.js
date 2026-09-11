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
 *   2순위: 1688 등록 운임 (item.freight × qty 합산, 0=包邮 유효)
 *   3순위: 수량 기반 추정
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
 * @param {Array} items - 장바구니/발주 아이템 배열
 * @param {Object} settings - { exchange_rate, agency_fee_rate, sea_cbm_rate }
 * @returns {Object} calcOrderCost 반환 객체 (itemTotalKrw, chinaFreightKrw, agencyFeeKrw, chargeableKrw 등)
 */
export function calcCartEstimatedCost(items, settings = {}) {
  const pseudoOrder = {
    status: 'quote_pending',
    items: Array.isArray(items) ? items : []
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
      agencyFeeKrw: 0,
      cbm: 0, shippingFeeKrw: 0, shippingConfirmed: false,
      chargeableKrw: 0,
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

  // 3. 중국 내륙 택배비 — 3단계 우선순위
  //   1순위: 관리자 수동 입력값 (order.chinaFreightRmb / firstPayment.chinaFreightRmb)
  //   2순위: 1688 등록 운임 (item.freight × qty 합산, 0=包邮 유효, null만 폴백)
  //   3순위: 수량 기반 추정
  const customFreight =
    (order.chinaFreightRmb !== null && order.chinaFreightRmb !== undefined)
      ? Number(order.chinaFreightRmb)
      : (order.firstPayment?.chinaFreightRmb !== null && order.firstPayment?.chinaFreightRmb !== undefined)
        ? Number(order.firstPayment.chinaFreightRmb)
        : null;

  let chinaFreightRmb;
  if (customFreight !== null) {
    chinaFreightRmb = customFreight;
  } else {
    let itemFreightSum = 0;
    let allFreightKnown = true;
    for (const i of activeItems) {
      if (i.freight === null || i.freight === undefined) {
        allFreightKnown = false;
        break;
      }
      itemFreightSum += Number(i.freight) * resolveItemQty(i);  // 수량도 skus 우선
    }
    if (allFreightKnown) {
      chinaFreightRmb = Number(itemFreightSum.toFixed(2));
    } else {
      chinaFreightRmb = estimateFreightRmb(totalQty);
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
    agencyFeeKrw,
    cbm,
    shippingFeeKrw,
    shippingConfirmed,
    chargeableKrw,
    avgPriceCny: Number(avgPriceCny.toFixed(2)),
    totalQty,
    tariffKrw,
    vatKrw,
    totalDdpKrw,
    unitDdpKrw,
  };
}
