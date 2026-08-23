import * as XLSX from 'xlsx';

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
