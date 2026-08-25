import * as XLSX from 'xlsx';

/**
 * 바이어용 1688 대량 발주 표준 엑셀 양식 다운로드
 * 샘플 2행 포함, 헤더: 한글상품명 | 1688 URL | 옵션명 | 수량 | 카테고리 | 사입 요청사항
 */
export function downloadBulkOrderTemplate() {
  const headerRow = [
    '한글상품명/관리명',
    '1688 제품 URL (필수)',
    '옵션명(색상/사이즈)',
    '수량(개, 필수)',
    '카테고리',
    '사입 요청사항',
  ];
  const sample1 = [
    '미니멀 USB 탁상선풍기',
    'https://detail.1688.com/offer/7123456789.html',
    '화이트 / 3단 풍속',
    200,
    '가전/생활용품',
    '완충 포장 필수, 박스당 20개 내장',
  ];
  const sample2 = [
    '스테인리스 진공 텀블러 500ml',
    'https://detail.1688.com/offer/6987654321.html',
    '매트 블랙 / 보온 12h',
    500,
    '주방/식기',
    '로고 없이 무지 납품 요청',
  ];
  const guideRow = [
    '※ 이 행은 삭제 후 입력하세요',
    '※ 1688 상품 상세페이지 전체 URL을 붙여넣으세요',
    '※ 색상·사이즈 등 정확한 옵션명 입력',
    '※ 숫자만 입력 (최소 발주량 확인 필수)',
    '※ 자유롭게 입력 (예: 의류, 생활용품)',
    '※ 특이 포장·라벨·검수 요청사항',
  ];

  const sheetData = [headerRow, sample1, sample2, guideRow];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 컬럼 너비
  ws['!cols'] = [
    { wch: 28 }, // 상품명
    { wch: 46 }, // URL
    { wch: 22 }, // 옵션
    { wch: 14 }, // 수량
    { wch: 18 }, // 카테고리
    { wch: 32 }, // 요청사항
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '1688_대량발주_양식');
  XLSX.writeFile(wb, 'EUCHS_1688_대량발주_표준양식.xlsx');
}

/**
 * EUCHS 공식 견적서 형태의 엑셀(.xlsx) 파일 생성 및 다운로드
 *
 * @param {Array<Object>} items - 견적 상품 목록
 * @param {Object} [buyerInfo={}] - 바이어/발주자 정보
 * @param {string} [buyerInfo.companyName] - 회사/상호명
 * @param {string} [buyerInfo.buyerName] - 담당자명
 * @param {string} [buyerInfo.phone] - 연락처
 * @param {string} [buyerInfo.email] - 이메일
 * @param {string} [buyerInfo.customsCode] - 개인통관고유부호/사업자통관부호
 * @param {string} [buyerInfo.memo] - 견적 메모
 */
export function exportQuoteToExcel(items = [], buyerInfo = {}) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const quoteNumber = `EUCHS-Q-${Date.now().toString().slice(-6)}`;
    const safeItems = Array.isArray(items) ? items : [];

    // 1. 견적서 상단 헤더 및 바이어 정보 구성
    const headerData = [
      ['EUCHS B2B 공식 수입 대행 견적서 (Official Quotation)'],
      [],
      ['견적번호', quoteNumber, '', '견적일자', today],
      ['업체/고객명', buyerInfo.companyName || buyerInfo.buyerName || '일반 고객', '', '담당자/연락처', `${buyerInfo.buyerName || '-'} / ${buyerInfo.phone || '-'}`],
      ['이메일', buyerInfo.email || '-', '', '통관부호', buyerInfo.customsCode || '-'],
      ['비고/안내', buyerInfo.memo || '도착 후 국내 배송비 별도 / 환율 및 관부가세는 수입 통관 시점에 확정됩니다.'],
      [],
      // 테이블 컬럼 헤더
      ['No', '1688 상품명', '상품 URL/ID', '옵션(SKU)', '수량', '단가(CNY)', '합계(CNY)', '예상 CBM', '비고']
    ];

    // 2. 품목 데이터 매핑
    let totalQty = 0;
    let totalCny = 0;
    let totalCbm = 0;

    const itemRows = safeItems.map((item, index) => {
      const qty = Number(item.quantity) || 1;
      const priceCny = Number(item.priceCny || item.unitPriceCny || item.productPriceCny) || 0;
      const itemTotal = Number((qty * priceCny).toFixed(2));
      const cbm = Number(item.cbm || item.estimatedCbm) || 0;

      totalQty += qty;
      totalCny += itemTotal;
      totalCbm += cbm;

      return [
        index + 1,
        item.name || item.productName || item.title || '1688 상품',
        item.url || item.productUrl || item.offerId || item.id || '',
        item.sku || item.optionName || item.option || '기본',
        qty,
        priceCny,
        itemTotal,
        cbm,
        item.remark || item.memo || ''
      ];
    });

    // 3. 합계 요약 행
    const totalRow = [
      '합계',
      '',
      '',
      '',
      totalQty,
      '',
      Number(totalCny.toFixed(2)),
      Number(totalCbm.toFixed(3)),
      `총 품목 수: ${safeItems.length}`
    ];

    // 4. 워크시트 생성 및 컬럼 너비 설정
    const sheetData = [...headerData, ...itemRows, totalRow];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 36 }, // 1688 상품명
      { wch: 30 }, // 상품 URL/ID
      { wch: 22 }, // 옵션(SKU)
      { wch: 10 }, // 수량
      { wch: 14 }, // 단가(CNY)
      { wch: 14 }, // 합계(CNY)
      { wch: 12 }, // 예상 CBM
      { wch: 24 }  // 비고
    ];

    // 5. 워크북 생성 및 파일 다운로드
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EUCHS_견적서');

    const fileName = `EUCHS_견적서_${buyerInfo.companyName || buyerInfo.buyerName || 'Customer'}_${today}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('견적서 엑셀 내보내기 실패:', errorMsg);
    throw new Error(`견적서 엑셀 생성 중 오류가 발생했습니다: ${errorMsg}`);
  }
}

/**
 * [1688 URL, 수량, 옵션 등] 엑셀 파일을 업로드 받아 JSON 배열로 변환하는 Promise 파서
 *
 * @param {File|Blob} file - 사용자가 업로드한 엑셀 파일 (.xlsx, .xls, .csv)
 * @returns {Promise<Array<Object>>} 정규화된 상품 목록 데이터 배열
 */
export function parseOrderExcel(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('업로드할 파일이 선택되지 않았습니다.'));
    }

    if (!(file instanceof Blob || file instanceof File)) {
      return reject(new Error('유효하지 않은 파일 객체 형식입니다.'));
    }

    if (file.size === 0) {
      return reject(new Error('파일의 용량이 0바이트인 빈 파일입니다.'));
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (!e.target || !e.target.result) {
          return reject(new Error('파일 바이너리 데이터를 읽어오지 못했습니다.'));
        }

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          return reject(new Error('엑셀 파일 내에 유효한 시트가 존재하지 않습니다.'));
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          return resolve([]);
        }

        // 엑셀 시트 데이터를 JSON 행 객체 배열로 추출
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!Array.isArray(rawJson) || rawJson.length === 0) {
          return resolve([]);
        }

        // 헤더 컬럼 유연한 정규화 매핑 (한글/영문 다양한 헤더 지원)
        const parsedItems = rawJson
          .map((row, index) => {
            if (!row || typeof row !== 'object') return null;

            const getVal = (keys) => {
              for (const k of keys) {
                const matchedKey = Object.keys(row).find(
                  (rk) => rk.trim().toLowerCase() === k.toLowerCase()
                );
                if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                  return String(row[matchedKey]).trim();
                }
              }
              return '';
            };

            const url = getVal(['1688 URL', '상품 URL/ID', '상품 URL', 'URL', '링크', 'link', 'offerId', 'id']);
            const productName = getVal(['1688 상품명', '상품명', '제품명', 'name', 'title', 'productName']);
            const sku = getVal(['옵션(SKU)', '옵션명', '옵션', 'sku', 'spec', 'option']);
            const rawQty = getVal(['수량', 'quantity', 'qty', 'count']);
            const rawPrice = getVal(['단가(CNY)', '단가', '가격', 'price', 'priceCny', 'unitPrice']);
            const rawCbm = getVal(['예상 CBM', 'CBM', '부피', 'cbm']);
            const remark = getVal(['비고', '메모', '요청사항', 'remark', 'memo']);

            const quantity = Number(rawQty.replace(/[^0-9.]/g, '')) || 1;
            const priceCny = Number(rawPrice.replace(/[^0-9.]/g, '')) || 0;
            const cbm = Number(rawCbm.replace(/[^0-9.]/g, '')) || 0;

            // 유효 데이터 검증 (URL, 상품명, SKU, 가격 중 하나라도 유의미한 값이 있는 경우)
            if (!url && !productName && !sku && priceCny === 0) {
              return null;
            }

            return {
              no: index + 1,
              productName: productName || (url ? `1688 상품 (${url.slice(0, 25)}...)` : `상품 #${index + 1}`),
              productUrl: url,
              sku: sku || '기본',
              quantity: Math.max(1, quantity),
              priceCny: Math.max(0, priceCny),
              totalCny: Number((Math.max(1, quantity) * Math.max(0, priceCny)).toFixed(2)),
              cbm: Math.max(0, cbm),
              remark
            };
          })
          .filter((item) => item !== null);

        resolve(parsedItems);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        reject(new Error(`엑셀 파일 파싱 중 오류가 발생했습니다: ${errorMessage}`));
      }
    };

    reader.onerror = (err) => {
      const errorMsg = err && err.target && err.target.error ? err.target.error.message : '알 수 없는 파일 읽기 오류';
      reject(new Error(`파일 읽기 실패: ${errorMsg}`));
    };

    reader.onabort = () => {
      reject(new Error('파일 읽기 작업이 중단되었습니다.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// ============================================================
// 관리자 전용 엑셀 내보내기 유틸리티 (Admin Excel Export Utils)
// ============================================================

/** 날짜 포맷 헬퍼 YYYY-MM-DD */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** 파일명/시트명에 사용할 수 없는 특수문자 안전 치환 */
function sanitizeFileName(str) {
  return String(str || '').replace(/[\\/:*?"<>|]/g, '_').trim() || 'ORDER';
}
function sanitizeSheetName(str) {
  return String(str || '').replace(/[\\/?*:[\]]/g, '_').trim().slice(0, 31) || 'Sheet';
}

/**
 * 1688 공장 발주용 사입 엑셀 다운로드
 * @param {Object} order - 주문 객체 (items[], buyerInfo, orderNumber 등)
 */
export function exportAdmin1688PurchaseExcel(order) {
  if (!order) throw new Error('order 객체가 없습니다.');
  const items = Array.isArray(order.items) ? order.items : [];
  const today = todayStr();
  const orderId = order.orderNumber || order.id || 'UNKNOWN';

  // 헤더 메타 블록
  const headerRows = [
    ['1688 공장 사입 발주서 (Admin Purchase Order)'],
    [],
    ['주문번호', orderId, '', '발주일', today],
    ['바이어', order.buyerInfo?.companyName || order.buyerInfo?.buyerName || '이유씨글로벌', '', '연락처', order.buyerInfo?.phone || '-'],
    ['담당자 메모', order.adminMemo || order.buyerInfo?.memo || ''],
    [],
    // 컬럼 헤더
    ['NO', '1688 상품링크', '상품명(중문/한글)', '옵션규격(SKU)', '발주수량(개)', '단가(¥ CNY)', '합계(¥ CNY)', '특이사항 / 사입메모'],
  ];

  let totalQty = 0;
  let totalCny = 0;

  const itemRows = items
    .filter(i => !i.excluded)
    .map((item, idx) => {
      // 1688 원본 링크 조합
      let url = item.productUrl || item.source_url || item.detailUrl || '';
      if (!url) {
        const rawId = item.num_iid || item.itemId || item.id || '';
        const cleanId = String(rawId).replace(/[^0-9]/g, '');
        if (cleanId.length >= 7) url = `https://detail.1688.com/offer/${cleanId}.html`;
        else url = 'https://www.1688.com';
      }

      const qty     = Number(item.quantity || 1);
      const price   = Number(item.priceCny || 0);
      const subtotal = Number((qty * price).toFixed(2));

      totalQty += qty;
      totalCny += subtotal;

      const name = item.productName || item.titleZh || item.title || item.name || '1688 상품';
      const sku  = item.sku || item.selectedOption || item.optionName || item.option || '기본';

      return [
        idx + 1,
        url,
        name,
        sku,
        qty,
        price,
        subtotal,
        item.remark || item.memo || '',
      ];
    });

  const totalRow = ['합계', '', `총 ${itemRows.length}품목`, '', totalQty, '', Number(totalCny.toFixed(2)), ''];

  const sheetData = [...headerRows, ...itemRows, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 5 },  // NO
    { wch: 42 }, // 1688 링크
    { wch: 34 }, // 상품명
    { wch: 24 }, // SKU
    { wch: 12 }, // 수량
    { wch: 14 }, // 단가
    { wch: 14 }, // 합계
    { wch: 26 }, // 메모
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '1688_사입발주서');
  const safeOrderId = sanitizeFileName(orderId);
  const fileName = `1688_발주서_${safeOrderId}_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

/**
 * 종합 수입 주문서 / 세무 정산용 엑셀 다운로드
 * @param {Object} order - 주문 객체
 * @param {number} [exchangeRate=226.19] - 적용 환율
 */
export function exportAdminMasterOrderExcel(order, exchangeRate = 226.19) {
  if (!order) throw new Error('order 객체가 없습니다.');
  const items = Array.isArray(order.items) ? order.items : [];
  const today = todayStr();
  const orderId  = order.orderNumber || order.id || 'UNKNOWN';
  const buyer    = order.buyerInfo || {};
  const buyerName = buyer.companyName || buyer.buyerName || '이유씨글로벌';

  // 상단 메타 블록
  const headerRows = [
    ['EUC 수입 종합 주문서 / 세무 정산서 (Import Master Order Sheet)'],
    [],
    ['주문번호',       orderId,                             '',  '접수일자',              order.createdAt || today],
    ['바이어 상호명',  buyerName,                           '',  '담당자 성명',            buyer.buyerName || '-'],
    ['연락처',         buyer.phone || '-',                  '',  '이메일',                buyer.email || '-'],
    ['PCCC (개인통관부호)', buyer.customsCode || buyer.pccc || '-', '', '사업자등록번호',   buyer.bizNo || buyer.businessNumber || '-'],
    ['국내 배송지',    buyer.address || '-',                '',  '배송 요청메모',          buyer.memo || '-'],
    ['적용 환율 (₩/¥)', `1 CNY = ${exchangeRate} KRW`,    '',  '대행수수료율',           '8%'],
    [],
    // 품목 컬럼 헤더
    [
      'NO', '상품명(한글/중문)', '옵션(SKU)',
      '수량(개)', '단가(¥ CNY)', '단가(₩ KRW)',
      '상품소계(₩)', '관·부가세 예상(₩)', '대행수수료 8%(₩)', '최종 공급가액(₩)',
    ],
  ];

  let totalQty     = 0;
  let totalKrw     = 0;
  let totalTax     = 0;
  let totalFee     = 0;
  let totalFinal   = 0;

  const AGY_RATE = 0.08;
  const TAX_RATE = 0.18; // 관세+부가세 합산 예상 (13% 관세 + 5% 부가세 평균 기준)

  const itemRows = items
    .filter(i => !i.excluded)
    .map((item, idx) => {
      const qty      = Number(item.quantity || 1);
      const priceCny = Number(item.priceCny || 0);
      const priceKrw = Math.round(priceCny * exchangeRate);
      const subKrw   = priceKrw * qty;
      const taxKrw   = Math.round(subKrw * TAX_RATE);
      const feeKrw   = Math.round(subKrw * AGY_RATE);
      const finalKrw = subKrw + taxKrw + feeKrw;

      totalQty   += qty;
      totalKrw   += subKrw;
      totalTax   += taxKrw;
      totalFee   += feeKrw;
      totalFinal += finalKrw;

      const name = item.productName || item.titleZh || item.title || item.name || '1688 상품';
      const sku  = item.sku || item.selectedOption || item.optionName || '기본';

      return [
        idx + 1,
        name,
        sku,
        qty,
        priceCny,
        priceKrw,
        subKrw,
        taxKrw,
        feeKrw,
        finalKrw,
      ];
    });

  const totalRow = [
    '합계', `총 ${itemRows.length}품목`, '',
    totalQty, '', '',
    totalKrw, totalTax, totalFee, totalFinal,
  ];

  const summaryRows = [
    [],
    ['[비용 정산 요약]'],
    ['1. 1688 상품대 합계 (KRW)',             totalKrw],
    ['2. 관·부가세 합계 예상 (KRW)',           totalTax],
    ['3. EUCHS 대행수수료 8% (KRW)',           totalFee],
    ['★ 최종 총액 (DDP 예상, KRW)',             totalFinal],
    [],
    ['※ 본 견적은 인천세관 수입신고 시 최종 확정됩니다. 환율 변동에 따라 차이가 있을 수 있습니다.'],
  ];

  const sheetData = [...headerRows, ...itemRows, totalRow, ...summaryRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 5 },  // NO
    { wch: 34 }, // 상품명
    { wch: 22 }, // SKU
    { wch: 10 }, // 수량
    { wch: 12 }, // 단가(CNY)
    { wch: 14 }, // 단가(KRW)
    { wch: 16 }, // 소계(KRW)
    { wch: 16 }, // 관부가세
    { wch: 16 }, // 수수료
    { wch: 18 }, // 최종
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'EUC_수입주문서');
  const safeOrderId = sanitizeFileName(orderId);
  const safeBuyerName = sanitizeFileName(buyerName);
  const fileName = `EUC_수입발주서_${safeOrderId}_${safeBuyerName}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

/**
 * 여러 주문을 하나의 엑셀 파일로 통합 다운로드 (관리자 일괄 처리용)
 * @param {Array<Object>} orders - 주문 객체 배열
 * @param {number} [exchangeRate=226.19] - 적용 환율
 */
export function exportAdminBulkOrderExcel(orders, exchangeRate = 226.19) {
  if (!Array.isArray(orders) || orders.length === 0) throw new Error('주문 목록이 비어 있습니다.');
  const today   = todayStr();
  const AGY_RATE = 0.08;

  const wb = XLSX.utils.book_new();

  // ① 시트 1: 전체 주문 요약 목록
  const summaryHeader = [
    ['EUC 통합 발주 요약서 (Bulk Order Summary)'],
    [`추출일: ${today}  |  총 ${orders.length}건`],
    [],
    ['NO', '주문번호', '접수일', '바이어', 'PCCC', '품목수', '총수량', '상품대(¥)', '상품대(₩)', '수수료8%(₩)', '합계(₩)', '진행단계'],
  ];

  let grandTotalKrw = 0;
  let grandTotalFee = 0;

  const summaryRows = orders.map((order, idx) => {
    const items  = (order.items || []).filter(i => !i.excluded);
    const totalCny = items.reduce((s, i) => s + Number(i.priceCny||0)*Number(i.quantity||1), 0);
    const totalQty = items.reduce((s, i) => s + Number(i.quantity||1), 0);
    const totalKrw = Math.round(totalCny * exchangeRate);
    const feeKrw   = Math.round(totalKrw * AGY_RATE);
    const finalKrw = totalKrw + feeKrw;
    const buyer    = order.buyerInfo || {};

    grandTotalKrw += totalKrw;
    grandTotalFee += feeKrw;

    return [
      idx + 1,
      order.orderNumber || order.id,
      order.createdAt || '-',
      buyer.companyName || buyer.buyerName || '-',
      buyer.customsCode || buyer.pccc || '-',
      items.length,
      totalQty,
      Number(totalCny.toFixed(2)),
      totalKrw,
      feeKrw,
      finalKrw,
      order.status || '-',
    ];
  });

  const summaryTotal = ['합계', `${orders.length}건`, '', '', '', '', '', '', grandTotalKrw, grandTotalFee, grandTotalKrw + grandTotalFee, ''];

  const summarySheet = XLSX.utils.aoa_to_sheet([...summaryHeader, ...summaryRows, summaryTotal]);
  summarySheet['!cols'] = [
    {wch:5},{wch:20},{wch:14},{wch:20},{wch:16},{wch:8},{wch:8},{wch:12},{wch:14},{wch:14},{wch:14},{wch:14},
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, '통합요약');

  // ② 시트 2~: 주문별 품목 상세
  orders.forEach((order, oIdx) => {
    const items    = (order.items || []).filter(i => !i.excluded);
    const orderId  = order.orderNumber || order.id || `ORDER-${oIdx+1}`;
    const buyer    = order.buyerInfo || {};
    const rawSheetName = `주문${oIdx+1}_${String(orderId).slice(-8)}`;
    const sheetName = sanitizeSheetName(rawSheetName);

    const rows = [
      [`주문번호: ${orderId}  /  바이어: ${buyer.companyName || buyer.buyerName || '-'}  /  PCCC: ${buyer.customsCode || '-'}`],
      [],
      ['NO', '상품명', '옵션(SKU)', '수량', '단가(¥)', '단가(₩)', '소계(₩)', '수수료8%(₩)', '1688 링크'],
    ];

    items.forEach((item, idx) => {
      let url = item.productUrl || item.source_url || item.detailUrl || '';
      if (!url) {
        const rawId = item.num_iid || item.itemId || item.id || '';
        const cleanId = String(rawId).replace(/[^0-9]/g, '');
        if (cleanId.length >= 7) url = `https://detail.1688.com/offer/${cleanId}.html`;
      }
      const qty    = Number(item.quantity || 1);
      const pCny   = Number(item.priceCny || 0);
      const pKrw   = Math.round(pCny * exchangeRate);
      const subKrw = pKrw * qty;
      const feeKrw = Math.round(subKrw * AGY_RATE);

      rows.push([
        idx + 1,
        item.productName || item.name || '1688 상품',
        item.sku || item.selectedOption || '기본',
        qty,
        pCny,
        pKrw,
        subKrw,
        feeKrw,
        url,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:5},{wch:32},{wch:22},{wch:8},{wch:12},{wch:12},{wch:14},{wch:14},{wch:40}];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fileName = `EUC_통합발주서_${orders.length}건_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

