/**
 * EUCHS B2B 수입대행 공식 견적서 XLSX 엑셀 생성 및 다운로드 유틸리티
 */
import * as XLSX from 'xlsx';

/**
 * 장바구니/발주 대기 품목을 공식 B2B 견적서 엑셀(.xlsx) 파일로 출력 및 다운로드
 *
 * @param {Array<Object>} items - 견적 대상 상품 목록
 * @param {Object} [buyerInfo={}] - 바이어/발주자 정보
 * @param {string} [buyerInfo.companyName] - 회사/상호명
 * @param {string} [buyerInfo.buyerName] - 담당자명
 * @param {string} [buyerInfo.phone] - 연락처
 * @param {string} [buyerInfo.email] - 이메일
 * @param {string} [buyerInfo.customsCode] - 통관고유부호
 * @param {number} [exchangeRate=226.19] - 적용 환율 (KRW/CNY)
 * @param {number} [agencyFeeRate=0.08] - 대행 수수료율 (기본 8%)
 */
export function exportQuoteExcel(items = [], buyerInfo = {}, exchangeRate = 226.19, agencyFeeRate = 0.08) {
  if (!XLSX || !XLSX.utils) {
    throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const dateCompact = `${yyyy}${mm}${dd}`;
  const quoteNumber = `EUCHS-Q-${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`;

  const safeItems = Array.isArray(items) ? items : [];

  // 품목별 계산 및 합계 산출
  let totalQty = 0;
  let totalProductCny = 0;
  let totalProductKrw = 0;

  const itemRows = safeItems.map((item, index) => {
    const qty = Number(item.quantity || item.orderQty) || 1;
    const priceCny = Number(item.priceCny || item.price || item.unitPriceCny || item.productPriceCny) || 0;
    const priceKrw = Math.round(priceCny * exchangeRate);
    const subtotalKrw = priceKrw * qty;
    const subtotalCny = Number((priceCny * qty).toFixed(2));
    const orderNo = item.orderNumber || item.orderNo || `ORD-${dateCompact}-${String(index + 1).padStart(3, '0')}`;
    const offerId = item.id || item.offerId || item.itemId || '-';
    const name = item.titleKo || item.name || item.productName || item.title || item.titleZh || '1688 상품';
    const sku = item.selectedOption || item.sku || item.optionName || item.option || '기본';

    totalQty += qty;
    totalProductCny += subtotalCny;
    totalProductKrw += subtotalKrw;

    return [
      index + 1,
      orderNo,
      name,
      String(offerId),
      sku,
      qty,
      priceCny,
      priceKrw,
      subtotalKrw,
      item.remark || item.memo || ''
    ];
  });

  const agencyFeeKrw = Math.round(totalProductKrw * agencyFeeRate);
  const estimatedShippingKrw = Math.max(85000, Math.round(totalQty * 1200));
  const grandTotalKrw = totalProductKrw + agencyFeeKrw + estimatedShippingKrw;

  // 상단 메타 헤더 블록 구성
  const headerData = [
    ['EUCHS B2B 공식 수입 대행 견적서 (Official Quotation)'],
    [],
    ['견적 관리번호', quoteNumber, '', '견적 발행일자', dateStr],
    ['바이어 상호명', buyerInfo.companyName || '(주)이유씨 글로벌 바이어', '', '담당자 / 연락처', `${buyerInfo.buyerName || '담당자'} / ${buyerInfo.phone || '010-1234-5678'}`],
    ['이메일', buyerInfo.email || 'buyer@euchs.co.kr', '', '개인/사업자통관부호', buyerInfo.customsCode || 'P123456789012'],
    ['적용 고시환율', `1 CNY = ${exchangeRate.toFixed(2)} KRW`, '', '대행 수수료율', `${(agencyFeeRate * 100).toFixed(1)}%`],
    ['총 발주 품목수', `${safeItems.length}개 품목 (총 ${totalQty.toLocaleString()}개)`, '', '최종 견적 총액(₩)', grandTotalKrw],
    ['비고 / 안내사항', '본 견적서는 1688 실시간 상품대 및 예상 해운비/수수료를 포함하며, 최종 관부가세는 인천/평택 세관 수입신고 시 확정됩니다.'],
    [],
    // 테이블 컬럼 헤더
    ['No', '발주번호', '1688 상품명', '상품 ID', '선택 옵션(SKU)', '수량', '단가(CNY)', '단가(KRW)', '품목 소계(KRW)', '비고']
  ];

  // 하단 합계 요약 행
  const totalRow = [
    '합계 요약',
    '',
    `총 ${safeItems.length}개 품목`,
    '',
    '',
    totalQty,
    Number(totalProductCny.toFixed(2)),
    '',
    totalProductKrw,
    `수수료: ₩${agencyFeeKrw.toLocaleString()}`
  ];

  const feeSummaryRows = [
    [],
    ['[견적 비용 상세 정산서]'],
    ['1. 1688 상품대 총액 (KRW)', totalProductKrw],
    ['2. EUCHS 수입대행 수수료 (8%)', agencyFeeKrw],
    ['3. 현지 물류 및 해운선적 기본비용', estimatedShippingKrw],
    ['★ 최종 수입 견적 총액 (DDP 기준 예상)', grandTotalKrw]
  ];

  const sheetData = [...headerData, ...itemRows, totalRow, ...feeSummaryRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 20 }, // 발주번호
    { wch: 38 }, // 1688 상품명
    { wch: 18 }, // 상품 ID
    { wch: 24 }, // 선택 옵션(SKU)
    { wch: 10 }, // 수량
    { wch: 14 }, // 단가(CNY)
    { wch: 14 }, // 단가(KRW)
    { wch: 16 }, // 품목 소계(KRW)
    { wch: 24 }  // 비고
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'EUCHS_수입견적서');

  const fileName = `EUCHS_수입견적서_${dateCompact}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}
