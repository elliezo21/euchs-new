/**
 * EUCHS B2B Platform - 1688 수입 원가 및 국내 판매 예상 마진 계산 유틸리티
 */

/**
 * 1688 수입 원가 및 국내 판매 예상 마진 자동 계산 함수
 *
 * @param {Object} params
 * @param {number} params.productPriceCny - 1688 상품 단가 (CNY)
 * @param {number} [params.quantity=1] - 구매 수량
 * @param {number} params.exchangeRate - 적용 환율 (CNY -> KRW, e.g. 195)
 * @param {number} [params.cbm=0.1] - 화물 부피 (CBM)
 * @param {number} [params.shippingRatePerCbm=85000] - CBM당 해운비 (KRW)
 * @param {number} [params.tariffRate=0.08] - 관세율 (기본 8%)
 * @param {number} [params.vatRate=0.10] - 부가세율 (기본 10%)
 * @param {number} [params.agencyFeeRate=0.05] - 구매/수입 대행 수수료율 (기본 5%)
 * @param {number} [params.targetSellingPriceKrw=0] - 개당 국내 판매 예정가 (KRW)
 * @returns {Object} 계산 요약(summary) 및 마진 정보(margin)
 */
export function calculateImportCost({
  productPriceCny = 0,
  quantity = 1,
  exchangeRate = 195,
  cbm = 0.1,
  shippingRatePerCbm = 85000,
  tariffRate = 0.08,
  vatRate = 0.10,
  agencyFeeRate = 0.05,
  targetSellingPriceKrw = 0,
} = {}) {
  const qty = Math.max(1, Number(quantity) || 1);
  const priceCny = Math.max(0, Number(productPriceCny) || 0);
  const exRate = Math.max(0, Number(exchangeRate) || 0);
  const cargoCbm = Math.max(0, Number(cbm) || 0);
  const shipRate = Math.max(0, Number(shippingRatePerCbm) || 0);
  const tRate = Math.max(0, Number(tariffRate) || 0);
  const vRate = Math.max(0, Number(vatRate) || 0);
  const aRate = Math.max(0, Number(agencyFeeRate) || 0);
  const targetPrice = Math.max(0, Number(targetSellingPriceKrw) || 0);

  // 1. 상품대 계산
  const itemTotalCny = Number((priceCny * qty).toFixed(2));
  const itemPriceKrw = Math.round(priceCny * exRate);
  const itemTotalKrw = Math.round(itemTotalCny * exRate);

  // 2. 해운 운임 및 대행 수수료
  const shippingFeeKrw = Math.round(cargoCbm * shipRate);
  const agencyFeeKrw = Math.round(itemTotalKrw * aRate);

  // 3. 과세가격 (CIF = 상품대금 + 운임) 및 세금
  const cifKrw = itemTotalKrw + shippingFeeKrw;
  const tariffKrw = Math.round(cifKrw * tRate);
  const vatKrw = Math.round((cifKrw + tariffKrw) * vRate);

  // 4. 총 도착원가(DDP) 및 개당 도착원가
  const totalDdpKrw = itemTotalKrw + shippingFeeKrw + tariffKrw + vatKrw + agencyFeeKrw;
  const unitDdpKrw = Math.round(totalDdpKrw / qty);

  // 5. 마진 분석
  const unitMarginKrw = targetPrice > 0 ? targetPrice - unitDdpKrw : 0;
  const totalMarginKrw = unitMarginKrw * qty;
  const marginRate = targetPrice > 0
    ? Number(((unitMarginKrw / targetPrice) * 100).toFixed(2))
    : 0;

  return {
    summary: {
      productPriceCny: priceCny,
      quantity: qty,
      exchangeRate: exRate,
      cbm: cargoCbm,
      itemTotalCny,
      itemPriceKrw,
      itemTotalKrw,
      shippingFeeKrw,
      cifKrw,
      tariffKrw,
      vatKrw,
      agencyFeeKrw,
      totalDdpKrw,
      unitDdpKrw,
    },
    margin: {
      targetSellingPriceKrw: targetPrice,
      unitMarginKrw,
      totalMarginKrw,
      marginRate,
    },
  };
}

/**
 * 금액 포맷팅 헬퍼 함수
 * @param {number} value
 * @param {string} [currency='KRW'] - 'KRW' | 'CNY'
 * @returns {string}
 */
export function formatCurrency(value, currency = 'KRW') {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (currency === 'CNY') {
    return `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₩${Math.round(value).toLocaleString('ko-KR')}`;
}
