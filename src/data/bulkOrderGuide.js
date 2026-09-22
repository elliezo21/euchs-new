/**
 * 엑셀 대량발주 안내 문구 — 데이터로만 분리.
 *
 * 지금은 업로드 모달 상단 안내 카드가 쓰지만, 나중에 가이드 팝업·가이드봇이
 * 같은 내용을 재사용할 수 있도록 화면 코드와 떼어 둔다.
 * (src/data/guideData.js와 같은 자리·같은 방식)
 *
 * ※ 숫자(상품 30개 / 200줄)는 utils/bulkExcelParser.js의 MAX_UNIQUE_OFFERS·MAX_ROWS와
 *   맞춰야 한다. 화면에서 그 상수를 넣어 문장을 완성하므로 여기엔 자리표시자를 쓴다.
 */

/** ① 3단계 그림 안내 */
export const BULK_ORDER_STEPS = [
  {
    no: 1,
    icon: '📥',
    title: '양식 받기',
    desc: '아래 버튼으로 엑셀 양식을 내려받으세요.',
  },
  {
    no: 2,
    icon: '✏️',
    title: 'URL·수량 적기',
    desc: '1688 상품 주소와 수량만 채우면 됩니다.',
  },
  {
    no: 3,
    icon: '🛒',
    title: '올리고 담기',
    desc: '올린 뒤 확인 화면에서 보고 장바구니에 담습니다.',
  },
]

/** ② 작은 예시 표 — 헤더 */
export const BULK_ORDER_EXAMPLE_HEADERS = ['1688 상품 URL', '수량', '옵션']

/** ② 작은 예시 표 — 본문 (같은 상품 색상별 여러 줄 + 옵션 비운 줄) */
export const BULK_ORDER_EXAMPLE_ROWS = [
  { url: 'detail.1688.com/offer/1081981728994.html', qty: '100', option: '자주빛 헤어밴드', note: '같은 상품을' },
  { url: 'detail.1688.com/offer/1081981728994.html', qty: '50', option: '빨간색과 파란색 헤어밴드', note: '색상별로 여러 줄' },
  { url: 'detail.1688.com/offer/1051826478228.html', qty: '200', option: '', note: '옵션은 비워도 됩니다' },
]

/**
 * ③ 핵심 규칙 — {maxOffers}, {maxRows}는 화면에서 치환한다.
 */
export const BULK_ORDER_RULES = [
  '1688 상품 주소와 수량만 있으면 됩니다.',
  '옵션은 비워도 괜찮아요 — 다음 화면에서 고를 수 있습니다.',
  '한 번에 상품 {maxOffers}개, 총 {maxRows}줄까지 올릴 수 있어요.',
  '없는 상품·품절 옵션은 자동으로 알려드립니다.',
]

/** 규칙 문장의 자리표시자를 실제 숫자로 치환 */
export function formatBulkOrderRules(maxOffers, maxRows) {
  return BULK_ORDER_RULES.map(r =>
    r.replace('{maxOffers}', String(maxOffers)).replace('{maxRows}', String(maxRows))
  )
}

/** 고객에게 보여줄 상태 배지 정의 — 확인 표가 사용 */
export const BULK_ROW_STATUS = {
  ok: { label: '정상', icon: '✅', tone: 'emerald' },
  option_needed: { label: '옵션 선택 필요', icon: '⚠️', tone: 'amber' },
  moq: { label: '최소수량 미달', icon: '⚠️', tone: 'amber' },
  soldout: { label: '품절', icon: '⚠️', tone: 'amber' },
  error: { label: '오류', icon: '❌', tone: 'red' },
}
