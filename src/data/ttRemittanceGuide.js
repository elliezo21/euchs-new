/**
 * T/T 해외송금(USD) 1차 결제 안내 문구 — 데이터로만 분리 (bulkOrderGuide.js와 같은 방식)
 *
 * 쓰는 곳: src/components/dashboard/TtRemittanceModal.vue, TtReceiptStep.vue, TtApplicationFormExample.vue
 * ※ 문구 원칙: 긍정형만. "불법 아님/환치기 아님/n영업일 소요" 같은 표현을 넣지 않는다.
 *   세무(부가세·원가처리) 문구는 명의·세무사 검수 전이라 넣지 않는다.
 *   송금 수수료는 '송금인 부담(OUR)'으로 명기한다(해성 2026-09-24 결정 — 이전 '문구 넣지 않음' 결정을 바꿈).
 *   은행 앱(휴대폰) 송금은 근거가 없어 언급하지 않는다 — 처음은 은행 창구, 등록 후는 기업 인터넷뱅킹(PC).
 * ※ 수취인·은행 정보 값은 api/_ttRemittance.js(서버 응답 fixed)에서 화면이 채운다. 여기엔 라벨·설명만 둔다.
 */

/** 탭 (처음 = 은행 방문 / 등록 후 = 집·사무실 PC). 모달을 열 때마다 first로 시작한다. */
export const TT_TABS = [
  { key: 'first', label: '① 처음 보내요 · 은행 방문' },
  { key: 'pc', label: '② 등록했어요 · 집·사무실 PC' },
]

/** 탭 버튼 아래 한 줄 */
export const TT_TAB_HINT = '🏦 처음 한 번만 은행에 가시면, 다음부터는 집·사무실에서 PC로 보내실 수 있어요.'

/** 탭 ① 처음 보내요 · 은행 방문 — 단계 제목·설명 */
export const TT_FIRST_STEPS = {
  print: {
    title: '인보이스 출력하기',
    desc: '출력해서 은행에 가져가세요.',
  },
  docs: {
    title: '준비물 챙기기',
    items: ['대표자 신분증', '사업자등록증', '출력한 인보이스', '출금할 사업자 통장'],
  },
  form: {
    title: '창구에서 신청서 쓰기',
    desc: "창구에서 '수입대금 T/T 송금이요'라고 말하고 인보이스를 내세요. 신청서는 아래 예시를 보고 쓰시면 돼요. 송금 수수료는 '송금인 부담(OUR)'에 체크하세요.",
    button: '신청서 작성 예시 보기',
  },
  register: {
    text: "✔ 이때 '다음부터 인터넷뱅킹으로 해외송금(수입대금)하고 싶어요'라고 등록도 같이 요청하세요.",
    button: '다음부터는 ② 탭을 보세요 →',
  },
}

/** 탭 ② 등록했어요 · 집·사무실 PC */
export const TT_PC_NOTICE = "은행 창구에서 해외송금(수입대금) 인터넷 등록을 마친 분만 가능해요. 기업 인터넷뱅킹(PC)에서 해외송금 메뉴로 들어가세요. 은행마다 메뉴 이름이 달라요(예: IBK기업은행 '무역대전송금')."

export const TT_PC_STEPS = {
  pdf: { title: '인보이스 PDF 받기', desc: '은행이 증빙 첨부를 요구하면 이 파일을 올리세요.' },
  fields: { title: '칸별로 입력하기', desc: '은행 화면의 칸에 아래 값을 그대로 복사해 넣으세요.' },
}

/**
 * 탭 ② 칸별 값 목록 (위에서부터 순서대로).
 * key: 화면이 실제 값을 채우는 키 (TtRemittanceModal pcFieldValue)
 * copy: 복사 버튼 여부 / note: 칸 아래 설명 / tip: ⓘ 눌렀을 때 설명
 */
export const TT_PC_FIELDS = [
  { key: 'currency', label: '송금 통화', note: '중국 위안(RMB)으로 보내시면 안 돼요.', emphasis: true },
  { key: 'usdTotal', label: '송금 금액', copy: true, emphasis: true },
  { key: 'feeBearer', label: '수수료 부담', emphasis: true, note: "인보이스 금액이 그대로 도착하도록 'OUR(송금인 전액 부담)'을 선택하세요." },
  { key: 'reason', label: '송금 사유', copy: true },
  { key: 'senderName', label: '송금인 이름', copy: true, note: '회사 영문 상호로 입력하세요 (대표자 개인 이름 아님).' },
  { key: 'beneficiaryName', label: '수취인 이름', copy: true, tip: '칸이 모자라면 남은 글자를 주소칸 앞에 이어 적고, 그다음 주소를 적어요.' },
  { key: 'beneficiaryAddress', label: '수취인 주소', copy: true },
  { key: 'beneficiaryBankName', label: '수취은행 이름', copy: true },
  { key: 'beneficiaryBankSwift', label: 'SWIFT 코드', copy: true },
  { key: 'accountNo', label: '계좌번호', copy: true },
  { key: 'beneficiaryBankAddress', label: '수취은행 주소', copy: true },
  { key: 'intermediaryBankName', label: '중계은행 이름', copy: true },
  { key: 'intermediaryBankSwift', label: '중계은행 SWIFT', copy: true },
  { key: 'invoiceNo', label: '송금 메시지', copy: true, note: '메시지(송금 메모) 칸에 주문번호를 적으면 입금 확인이 빨라져요.' },
]

/** 탭 ② 칸 값 중 고정 문구 */
export const TT_CURRENCY_TEXT = '미국 달러 (USD)'
export const TT_REMIT_REASON = '사전송금방식 통관수입대금'
export const TT_FEE_BEARER_TEXT = '송금인 부담 (OUR)'

/** 송금확인증 보내기 단계 (탭 ①·② 공통 — TtReceiptStep.vue) */
export const TT_RECEIPT_STEP = {
  title: '송금확인증 보내기',
  desc: "은행에서 받은 '외국환 거래 계산서'를 사진 찍어 보내주세요. 송금이 확인되는 즉시 발주를 진행해요.",
  button: '송금확인증 보내기 (1:1 상담)',
  // 개인정보 가림 처리된 예시 이미지 (public/ 아래). 항상 표시, 로드 실패 시에만 숨긴다.
  exampleImage: '/images/tt/tt_receipt_example.jpg',
  exampleAlt: '외국환 거래 계산서 예시 (개인정보 가림)',
}

/** 신청서 작성 예시 (TtApplicationFormExample.vue) — 라벨만. 값은 주문 데이터로 채운다. */
export const TT_FORM_EXAMPLE = {
  title: '해외송금(외화송금) 신청서 작성 예시',
  notice: '은행마다 양식 모양은 조금 달라요. 같은 뜻의 칸을 찾아 아래처럼 쓰시면 돼요.',
  printButton: '출력',
  closeButton: '닫기',
  sections: {
    applicant: '① 신청인',
    remittance: '② 송금 내용',
    beneficiary: '③ 수취인',
    bank: '④ 수취인 거래은행',
    reason: '⑤ 지급 사유',
  },
  labels: {
    nameKo: '성명(한글)',
    nameEn: '성명(영문)',
    bizNo: '사업자등록번호',
    account: '출금계좌',
    address: '주소',
    tel: '전화',
    method: '송금방법',
    amount: '통화·금액',
    feeBearer: '수수료 부담',
    beneficiaryName: '성명(업체명)',
    beneficiaryAddress: '주소',
    swift: 'SWIFT BIC',
    accountNo: '계좌번호',
    bankName: '은행명',
    bankAddress: '은행 주소',
    intermediary: '중계은행',
    reason: '지급사유',
    customsCleared: '물품 통관 여부',
    receiveDate: '수령예정일',
    destination: '물품 도착지',
    goods: '거래품목',
    message: '송금 메시지',
  },
  values: {
    account: '출금할 사업자 통장 계좌번호',
    method: '☑ 전신송금(T/T)',
    feeBearer: '☑ 송금인 부담 (OUR)',
    feeBearerHint: '중계은행 수수료까지 보내는 분이 부담해요. 인보이스 금액이 그대로 도착해요.',
    customsCleared: '☑ 아니오 (사전송금)',
    receiveDate: '☑ 1년 이내',
    receiveDateHint: '예정일 칸이 있으면 송금하는 날 + 15일',
    destination: '☑ 한국 (통관)',
  },
}

/** 맨 아래 접이식 */
export const TT_INTRO = {
  title: 'T/T 해외송금이란?',
  desc: '은행을 통해 해외 공급처로 수입대금을 보내는 무역 표준 결제 방식이에요. 은행 송금확인증이 발급되어 거래 기록이 깔끔하게 남아요.',
}
export const TT_DEADLINE = '인보이스는 미결제 시 영업일 기준 5일 이내 자동 폐기됩니다.'
export const TT_KEEP_NOTICE = '인보이스와 송금확인증은 5년간 보관을 권해요.'

/** 인보이스 미리보기 위 BUYER 확인 문구 */
export const TT_BUYER_CHECK = '송금인(BUYER) 영문 상호와 주소가 은행에 등록된 정보와 같은지 확인해 주세요.'

/** 화면 1단계 (탭 ①·② 공통) — 영문 상호·주소 확인 */
export const TT_BUYER_STEP = {
  title: '영문 상호·주소 확인하기',
  desc: '인보이스의 BUYER(회사 영문명·주소)가 은행에 등록된 정보와 같은지 확인하세요. 다르면 바로 고칠 수 있어요.',
}

/** BUYER 수정 버튼과 옆 말풍선 */
export const TT_BUYER_EDIT = {
  button: '영문 상호·주소 수정하기',
}

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

/** 인보이스 환율 종류(orders.tt_invoice.rateType) → 화면 이름. hana_base 는 2026-09-24 오전까지 발행분 */
export const TT_RATE_TYPE_LABELS = Object.freeze({
  hana_base: '하나은행 매매기준율',
  hana_tt_send: '하나은행 송금 보낼 때 환율',
})
export function ttRateTypeLabel(rateType) {
  const label = TT_RATE_TYPE_LABELS[rateType]
  if (!label) {
    console.error('[ttRemittanceGuide] 알 수 없는 환율 종류(rateType):', rateType)
    return '환율 종류 확인 필요'
  }
  return label
}

/** T/T 창 사용가이드 (SpotlightGuide) — target 은 TtRemittanceModal 의 data-guide 값 */
export const TT_GUIDE_BADGE = '사용가이드'
export const TT_GUIDE_REPLAY = '사용가이드'
const TT_GUIDE_BUYER = { target: 'buyer', title: '먼저 회사 영문명·주소를 확인하세요', desc: '인보이스의 BUYER가 은행에 등록된 회사 영문명·주소와 같아야 해요. 다르면 [영문 상호·주소 수정하기]로 먼저 고치세요.', tip: '고친 내용은 인보이스와 PDF에 바로 반영돼요. 확인한 뒤에 PDF를 받으세요.' }
const TT_GUIDE_RECEIPT = { target: 'receipt', title: '송금 후 확인증을 보내 주세요', desc: "은행에서 받은 '외국환 거래 계산서'를 사진 찍어 1:1 상담으로 보내 주세요.", tip: '송금이 확인되는 즉시 발주를 진행해요.' }
const TT_GUIDE_AMOUNT = { target: 'amount', title: '보내실 금액이에요', desc: '은행에 이 달러 금액을 그대로 보내세요. [복사]를 누르면 금액이 복사돼요.', tip: '인보이스를 발행한 시각의 환율로 고정돼서 금액이 바뀌지 않아요.' }
const TT_GUIDE_CALC = { target: 'calc', title: '금액은 이렇게 계산돼요', desc: '원화 결제 금액을 하나은행 송금 보낼 때 환율로 나눈 금액이에요.', tip: '인보이스를 발행한 시각의 환율로 고정돼요.' }
export const TT_GUIDE_STEPS_FIRST = [
  TT_GUIDE_BUYER,
  { target: 'pdf', title: '인보이스를 출력하세요', desc: '영문 상호·주소를 확인했으면 PDF로 받아 출력해서 은행에 가져가세요.', tip: '은행 직원이 이 인보이스를 보고 송금을 처리해요.' },
  { target: 'docs', title: '은행에 가져갈 준비물', desc: '대표자 신분증, 사업자등록증, 출력한 인보이스, 출금할 사업자 통장을 챙기세요.' },
  { target: 'form-example', title: '신청서는 예시대로 쓰면 돼요', desc: '이 주문 정보로 미리 채운 신청서 예시를 볼 수 있어요. 출력해서 가져가셔도 돼요.', tip: "송금 수수료는 '송금인 부담(OUR)'에 체크하세요." },
  { target: 'register', title: '인터넷뱅킹 등록도 같이 요청하세요', desc: "창구에서 '다음부터 인터넷뱅킹으로 해외송금(수입대금)하고 싶어요'라고 등록도 같이 요청하세요." },
  TT_GUIDE_RECEIPT,
  TT_GUIDE_AMOUNT,
  TT_GUIDE_CALC,
  { target: 'tabs', title: '다음부터는 ② 탭으로', desc: '인터넷뱅킹 해외송금 등록을 마치시면, 다음부터는 ② 탭 안내대로 집·사무실 PC에서 보내실 수 있어요.' },
]
export const TT_GUIDE_STEPS_PC = [
  { target: 'pc-notice', title: '인터넷뱅킹 등록을 마친 분만', desc: '은행 창구에서 해외송금(수입대금) 인터넷 등록을 마치셨다면, 기업 인터넷뱅킹 해외송금 메뉴로 들어가세요.' },
  TT_GUIDE_BUYER,
  { target: 'pdf', title: '인보이스 PDF 받기', desc: '영문 상호·주소를 확인했으면 PDF를 받으세요. 은행이 증빙 첨부를 요구하면 이 파일을 올리세요.' },
  { target: 'pc-fields', title: '칸별로 복사해서 넣으세요', desc: '은행 화면의 칸에 이 목록의 값을 [복사] 버튼으로 그대로 넣으세요.', tip: "수수료 부담은 'OUR(송금인 전액 부담)'을 선택하세요." },
  TT_GUIDE_RECEIPT,
  TT_GUIDE_AMOUNT,
  TT_GUIDE_CALC,
  { target: 'tabs', title: '처음 보내실 땐 ① 탭', desc: '아직 인터넷뱅킹 등록 전이라면 ① 탭 안내대로 은행 창구에 한 번 가시면 돼요.' },
]
export const TT_GUIDE_STEPS_EDIT = [
  { target: 'edit-name', title: '회사 영문 상호', desc: '은행에 등록된 회사 영문 이름을 그대로 적으세요. 영문·숫자와 일부 기호만 쓸 수 있어요.', tip: '통장이나 사업자등록증의 영문명과 같게 적으면 돼요.' },
  { target: 'edit-search', title: '사업장 주소 검색', desc: '사업자등록증에 적힌 주소를 검색해서 고르면 영문 주소가 자동으로 채워져요.' },
  { target: 'edit-road', title: '영문 주소 확인', desc: '자동으로 채워진 영문 도로명 주소를 확인하세요. 필요하면 직접 고칠 수 있어요.' },
  { target: 'edit-detail', title: '영문 상세주소', desc: '층·호수를 영문으로 적으세요.', tip: '예: #201, 2F' },
  { target: 'edit-save', title: '저장하면 끝', desc: '[저장]을 누르면 인보이스와 PDF에 바로 반영돼요.' },
]
