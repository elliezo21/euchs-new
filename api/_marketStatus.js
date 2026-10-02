/**
 * 판매처 상태 확인 — 공통 규칙 (2026-10-02, 순수 — 서버 api/marketplace.js sync와 화면 src/lib/studioSentList.js가 같이 쓴다)
 * 판매처에 상품을 등록·수정·삭제하는 호출은 없다 — 조회만.
 *
 * [확인한 판매처 — 공식 문서]
 *   쿠팡       GET 등록상품 조회 (PATHS.product — 예전 sync 그대로) · statusName '상품삭제' = 삭제
 *              호출 한도: 문서 숫자 없음 — 429 = 잠시 후 / 403 "Access denied" = IP 10분 차단 → 5초 안 오류 20건이면 10분 멈춤(breakerFor, developers.coupang.com FAQ 권고)
 *   스마트스토어 POST /external/v1/products/search (상품 목록 조회 search-product) — searchKeywordType PRODUCT_NO + originProductNos, 페이지당 최대 500건(문서 size 설명)
 *              응답 contents[].originProductNo · channelProducts[].statusType (WAIT·SALE·OUTOFSTOCK·UNADMISSION·REJECTION·SUSPENSION·CLOSE·PROHIBITION·DELETE)
 *              검색 결과에 없는 상품 = GET /external/v2/products/origin-products/{originProductNo} (read-origin-product-product) — 404 code NOT_FOUND "데이터 없음" 또는 statusType DELETE = 삭제
 *              호출 한도: 문서 "제약 사항" — API·애플리케이션 단위 토큰 버킷, 숫자는 유동적(응답 헤더 GNCP-GW-RateLimit-*), 넘으면 429 GW.RATE_LIMIT
 *              (문서 위치 apicenter.commerce.naver.com/docs/commerce-api/current/search-product · read-origin-product-product · /docs/restriction)
 * [확인 못 함 — 넣지 않음] 11번가: 상품 상태 조회 API 문서(openapi.11st.co.kr)가 로그인 뒤에만 열려 이 작업에서 확인하지 못했다
 *                         카페24: 조회 API를 이 작업에서 확인하지 않았다 (고객에게 숨긴 판매처)
 */

/** 상태를 자동으로 확인하는 판매처 — 공식 문서로 조회 API를 확인한 곳만. 화면은 이 목록에 없는 판매처 칩에 "지원하지 않습니다" 안내 */
export const STATUS_CHECK_MARKETS = ['coupang', 'smartstore']
/** 확인할 기록 상태 — 살아 있거나 판매처에서 진행 중인 것. 실패(failed)·삭제됨(deleted)은 다시 보지 않는다 */
export const CHECK_STATUSES = ['registered', 'approved', 'approval_pending', 'sending', 'rejected']
/** 판매처에서 지워진 상품 — 새 상태 값 (DB check는 docs/sql/2026-10-02-marketplace-sends-deleted.sql) */
export const DELETED = 'deleted'
/** 한 번 요청에 판매처마다 확인할 기록 수 — 쿠팡 = 상품마다 1번 호출(예전 SYNC_MAX 그대로) · 스마트스토어 = 목록 조회 1번(문서 최대 500) */
export const CHECK_BATCH = { coupang: 30, smartstore: 500 }
/** 스마트스토어 검색 결과에 없는 상품을 한 번 요청에서 하나씩 조회하는 최대 수 — 404가 서킷 브레이커(5초 20건)를 넘기지 않게 */
export const SS_SINGLE_MAX = 10
/** 화면 자동 확인 간격 — 마지막 확인이 이보다 오래됐으면 탭을 열 때 확인한다 */
export const AUTO_CHECK_MS = 10 * 60 * 1000

export const SS_SEARCH_PATH = '/external/v1/products/search'
export const ssOriginProductPath = no => `/external/v2/products/origin-products/${no}`
/** 스마트스토어 statusType → 화면 원문 (문서 설명 그대로) */
export const SS_STATUS_LABEL = { WAIT: '판매 대기', SALE: '판매 중', OUTOFSTOCK: '품절', UNADMISSION: '승인 대기', REJECTION: '승인 거부', SUSPENSION: '판매 중지', CLOSE: '판매 종료', PROHIBITION: '판매 금지', DELETE: '삭제' }

/**
 * 스마트스토어 statusType → 우리 기록 { status, raw }. DELETE = 삭제됨, 그 밖의 문서 값 = 등록 완료(상품이 있음). 모르는 값 = null(기록을 바꾸지 않음)
 */
export function smartstoreStatusOf(statusType) {
  const t = String(statusType || '')
  if (!(t in SS_STATUS_LABEL)) return null
  return { status: t === 'DELETE' ? DELETED : 'registered', raw: SS_STATUS_LABEL[t] }
}
/** 목록 조회 본문 — 원상품번호로 (번호는 int64 — 안전한 정수만) */
export function smartstoreSearchBody(nos) {
  const list = (Array.isArray(nos) ? nos : []).map(n => Number(n)).filter(n => Number.isSafeInteger(n) && n > 0)
  return { searchKeywordType: 'PRODUCT_NO', originProductNos: list, page: 1, size: Math.max(1, Math.min(500, list.length)) }
}
/** 목록 조회 응답 → Map(원상품번호 글자 → statusType). 채널 상품은 스마트스토어(STOREFARM)를 먼저, 없으면 첫째 */
export function smartstoreSearchStatuses(json) {
  const out = new Map()
  for (const c of Array.isArray(json?.contents) ? json.contents : []) {
    const no = c?.originProductNo != null ? String(c.originProductNo) : ''
    const chs = Array.isArray(c?.channelProducts) ? c.channelProducts : []
    const ch = chs.find(x => x?.channelServiceType === 'STOREFARM') || chs[0]
    if (/^\d{1,20}$/.test(no) && typeof ch?.statusType === 'string') out.set(no, ch.statusType)
  }
  return out
}
/** 원상품 조회 오류가 "데이터 없음"(문서: 404 code NOT_FOUND)인지 — 본문 code가 정확히 NOT_FOUND일 때만(GW.… 같은 다른 404와 구분) */
export const isSsNotFound = (status, raw) => status === 404 && /"code"\s*:\s*"NOT_FOUND"/.test(String(raw || ''))

/** 쿠팡 전체·판매처 전체를 멈추는 오류 — 이 판매처는 이번 확인을 그만둔다 (기록마다 오류와 구분) */
export const STOP_CODES = ['breaker_open', 'rate_limited', 'access_denied', 'relay_not_configured', 'relay_unreachable', 'relay_denied', 'ip_not_allowed', 'bad_key', 'token_invalid', 'not_connected', 'key_expired', 'decrypt_failed', 'enc_not_ready']

/** sync 요청의 since(확인 시작 시각) — ISO 글자만, 앞으로의 시각은 지금으로 */
export function checkSince(v, now = Date.now()) {
  const t = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? Date.parse(v) : NaN
  return new Date(Number.isFinite(t) && t <= now ? t : now).toISOString()
}

// ── 목록(sends_list) — 100건 한도 없이 페이지로 끝까지 읽는다 ──
/** 한 번에 읽는 줄 수 (Supabase REST 기본 최대 1000줄) · 최대 페이지 (= 20,000건 — 넘으면 앞부분만 + 로그) */
export const LIST_PAGE = 1000
export const LIST_PAGES_MAX = 20
