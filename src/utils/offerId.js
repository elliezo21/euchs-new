/**
 * 1688 URL / 상품 ID 입력값에서 offerId(num_iid)를 추출하는 공용 유틸.
 *
 * MallView.vue(URL 붙여넣기 검색)와 HomeView.vue(메인 검색 → /mall?offerId= 딥링크)에
 * 똑같이 복붙돼 있던 정규식을 한 곳으로 모은 것이다.
 * 엑셀 대량발주도 같은 판정을 써야 하므로 세 번째 복제본을 만들지 않기 위함.
 *
 * ⚠️ 이번 이동에서는 패턴을 "한 글자도" 보강하지 않았다.
 *    (.htm, 앞뒤 공백 trim, qr.1688.com 단축링크, .html 없는 /offer/{id} 등은 여전히 미지원)
 *    엑셀 붙여넣기 대응을 위한 패턴 보강은 2단계에서 별도로 진행한다.
 *
 * 지원하는 형태 (판정 순서 그대로):
 *   1) detail.1688.com/offer/{id}.html  (m.1688.com 등 호스트 무관, 쿼리스트링 허용)
 *   2) ...?offerId={id} / &offerId={id}
 *   3) ...?itemId={id}  / &itemId={id}
 *   4) 순수 9~16자리 숫자 문자열
 */

/**
 * @param {string} rawInput - 이미 trim된 사용자 입력 문자열
 * @returns {string|null} 추출된 offerId 문자열, 판정 실패 시 null
 */
export function extractOfferId(rawInput) {
  const urlMatch = rawInput.match(/offer\/(\d+)\.html/) || rawInput.match(/[?&]offerId=(\d+)/) || rawInput.match(/[?&]itemId=(\d+)/)
  // 순수 9~16자리 숫자(상품 ID) 체크
  const isNumericId = /^\d{9,16}$/.test(rawInput)

  return urlMatch ? urlMatch[1] : (isNumericId ? rawInput : null)
}
