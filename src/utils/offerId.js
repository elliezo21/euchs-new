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

/**
 * 엑셀 붙여넣기 전용 — 느슨한 offerId 추출.
 *
 * ★ extractOfferId는 몰 검색·홈 딥링크가 쓰는 함수라 결과가 바뀌면 안 된다.
 *   그래서 고치지 않고 별도 함수를 둔다. 엑셀은 고객이 1688 앱·모바일·브라우저에서
 *   제각각 복사해 붙이므로 더 많은 형태를 받아줘야 한다.
 *
 * extractOfferId 대비 추가로 처리하는 것:
 *   · 앞뒤 공백, 따옴표("'), 엑셀이 URL 앞에 붙이는 작은따옴표
 *   · `.html` 없는 `/offer/123`, `.htm`으로 끝나는 형태
 *   · m.1688.com / detail.1688.com / 호스트 없는 경로
 *   · 쿼리스트링·해시가 붙은 URL (?spm=... #anchor)
 *   · offer_id= / id= 파라미터
 *
 * 처리하지 못하는 것 (null 반환 → 호출측에서 오류 줄로 표시):
 *   · qr.1688.com 등 단축·공유 링크 (서버가 리다이렉트를 따라가야 풀림)
 *   · 상점(winport) URL — 상품 ID가 없음
 *
 * @param {*} rawInput - 엑셀 셀 값 (문자열이 아닐 수도 있음)
 * @returns {string|null} 9~16자리 offerId 문자열, 실패 시 null
 */
export function extractOfferIdLoose(rawInput) {
  if (rawInput === null || rawInput === undefined) return null

  // 엑셀 셀은 숫자로 들어올 수 있다 (URL이 아니라 ID만 적은 경우)
  let s = String(rawInput).trim()
  // 앞뒤 따옴표 제거 (엑셀에서 텍스트 강제 시 붙는 경우 포함)
  s = s.replace(/^['"`]+/, '').replace(/['"`]+$/, '').trim()
  if (!s) return null

  // 단축·공유 링크는 여기서 풀 수 없다 — 숫자를 주워 담으면 엉뚱한 상품이 되므로 막는다
  if (/qr\.1688\.com|s\.1688\.com\/selloffer|winport|shop\.1688\.com/i.test(s)) return null

  const patterns = [
    /offer\/(\d{9,16})(?:\.html?|\b)/i,   // /offer/123.html, /offer/123.htm, /offer/123
    /[?&]offerId=(\d{9,16})\b/i,
    /[?&]itemId=(\d{9,16})\b/i,
    /[?&]offer_id=(\d{9,16})\b/i,
    /[?&]id=(\d{9,16})\b/i,
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m) return m[1]
  }

  // 순수 숫자만 적은 경우
  if (/^\d{9,16}$/.test(s)) return s

  return null
}
