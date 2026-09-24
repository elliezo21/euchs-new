/**
 * T/T 해외송금(USD) 1차 결제 안내 문구 — 데이터로만 분리 (bulkOrderGuide.js와 같은 방식)
 *
 * 쓰는 곳: src/components/dashboard/TtRemittanceModal.vue
 * ※ 문구 원칙: 긍정형만. "불법 아님/환치기 아님/n영업일 소요" 같은 표현을 넣지 않는다.
 *   세무(부가세·원가처리) 문구는 명의·세무사 검수 전이라 넣지 않는다.
 * ※ 수취인 이름은 api/_ttRemittance.js의 beneficiary.name과 같아야 한다. 화면에서 그 값을 넣어 완성한다.
 */

/** A. T/T란 */
export const TT_INTRO = {
  title: 'T/T 해외송금이란?',
  desc: '은행을 통해 해외 공급처로 수입대금을 보내는 무역 표준 결제 방식이에요. 은행 송금확인증이 발급되어 거래 기록이 깔끔하게 남아요.',
}

/** A. 결제 순서 */
export const TT_STEPS = [
  { no: 1, text: '아래 인보이스(PDF)를 내려받아 출력해 주세요.' },
  { no: 2, text: '거래 은행 창구나 은행 앱에서 해외송금을 신청해 주세요.' },
  { no: 3, text: '송금 후 받은 외국환 거래 계산서(송금확인증)를 1:1 상담으로 보내주세요.' },
  { no: 4, text: '송금이 확인되는 즉시 발주를 진행해요.' },
]

/** A. 송금 기한 */
export const TT_DEADLINE = '인보이스는 미결제 시 영업일 기준 5일 이내 자동 폐기됩니다.'

/**
 * B. 은행 입력 가이드.
 * valueKey가 있으면 화면이 실제 값을 넣고 복사 버튼을 단다:
 *   usdTotal(송금 금액) / invoiceNo(송금 메시지 = 주문번호, API의 invoice.invoiceNo) / beneficiaryName(수취인 이름)
 */
export const TT_BANK_GUIDE = [
  { label: '송금 통화', value: '미국 달러(USD)', note: '반드시 미국 달러로 보내주세요. 중국 위안(RMB)으로 보내시면 안 돼요.', emphasis: true },
  { label: '송금 금액', valueKey: 'usdTotal', note: '인보이스 금액과 똑같이 입력해 주세요.', emphasis: true, copy: true },
  { label: '송금 사유', value: '사전송금방식 통관수입대금', copy: true },
  { label: '송금 메시지', valueKey: 'invoiceNo', note: '은행 송금 화면의 메시지(송금 메모) 칸에 주문번호를 적어 주세요. 입금 확인이 빨라져요.', copy: true },
  { label: '송금인 이름', value: '회사(상호) 영문명', note: '대표자 개인 이름이 아닌 회사 영문 상호로 입력해 주세요.' },
  { label: '수취인 이름', valueKey: 'beneficiaryName', note: '"TRADING FIRM"까지 모두 입력해 주세요. 칸이 모자라면 남은 글자를 주소칸 앞에 이어 적고, 그다음 주소를 적어요.', copy: true },
  { label: '수취은행·SWIFT·계좌번호·중계은행', value: '인보이스에 적힌 그대로', note: '아래 인보이스 미리보기에서 복사할 수 있어요.' },
]

/** B. 보관 안내 */
export const TT_KEEP_NOTICE = '인보이스와 송금확인증은 5년간 보관을 권해요.'

/** D. BUYER 확인 문구 */
export const TT_BUYER_CHECK = '송금인(BUYER) 영문 상호와 주소가 은행에 등록된 정보와 같은지 확인해 주세요.'

/** 실패 사유별 안내 (/api/tt-invoice reason) */
export const TT_ERROR_MESSAGES = {
  rate_unavailable: '환율 정보를 불러오지 못했어요. 잠시 후 다시 시도하거나 1:1 상담으로 문의해 주세요.',
  status: '견적이 확정된 주문만 T/T 인보이스를 발행할 수 있어요. 주문 상태를 확인해 주세요.',
  amount: '결제 금액 확인이 필요해요. 1:1 상담으로 문의해 주세요.',
  amount_changed: '인보이스 발행 후 견적 금액이 바뀌었어요. 1:1 상담으로 문의해 주시면 새 인보이스를 안내해 드려요.',
  items: '주문 품목 정보 확인이 필요해요. 1:1 상담으로 문의해 주세요.',
  forbidden: '본인 주문만 인보이스를 발행할 수 있어요.',
  not_found: '주문 정보를 찾지 못했어요. 새로고침 후 다시 시도해 주세요.',
  not_logged_in: '로그인이 필요해요. 다시 로그인한 뒤 시도해 주세요.',
  unavailable: '인보이스를 불러오지 못했어요. 잠시 후 다시 시도하거나 1:1 상담으로 문의해 주세요.',
}
