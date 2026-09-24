/**
 * T/T 해외송금 인보이스(PROFORMA INVOICE) 수취 고정정보 — 해성 확정값 (글자 그대로, 임의 변경 금지)
 *
 * 파일명이 '_'로 시작하므로 Vercel 라우트로 노출되지 않는다. /api/tt-invoice 응답의 fixed로만 전달한다.
 * ※ 여기 값은 PDF(영문 폰트)에 그대로 찍히므로 한글을 넣지 않는다.
 */
export const TT_REMITTANCE_FIXED = Object.freeze({
  shipper: Object.freeze({
    name: 'YIWUSHI QIANGONG TRADING FIRM',
    address: 'Unit 1, Building 1, Houcheng District 2, Yiwu City, Zhejiang Province China',
    tel: '0086-19524077350',
  }),
  shippingCountry: 'CHINA',
  destinationCountry: 'KOREA',
  intro: 'We are pleased to issue proforma invoice as following terms and conditions.',
  amountTerm: 'FOB CHINA',
  portOfLading: 'yantai China',
  portOfDischarge: 'Incheon Korea',
  termsOfPayment: '50 days after import',
  bankCharges: 'All bank charges, including intermediary bank charges, are for the account of the remitter (OUR).',
  intermediaryBank: Object.freeze({
    name: 'STANDARD CHARTERED BANK,NEW YORK',
    swift: 'SCBLUS33XXX',
  }),
  beneficiaryBank: Object.freeze({
    name: 'ZHEJIANG CHOUZHOU COMMERCIAL BANK',
    swift: 'CZCBCN2X',
    address: 'YIWU LEYUAN (EAST), JIANGBIN ROAD, YIWU CITY ZHEJIANG PROVINCE, CHINA',
  }),
  beneficiary: Object.freeze({
    name: 'YIWUSHI QIANGONG TRADING FIRM',
    accountNo: '15609142110300024947',
    address: 'Unit 1, Building 1, Houcheng District 2, Yiwu City, Zhejiang Province CHINA',
  }),
  validity: 'This proforma invoice is valid for 5 business days from the date of issue. Unpaid invoices will be automatically void.',
})
