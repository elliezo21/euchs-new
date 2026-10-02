/**
 * 판매처 상태 확인 — 공통 규칙 (2026-10-02, 순수 — 서버 api/marketplace.js sync와 화면 src/lib/studioSentList.js가 같이 쓴다)
 * 판매처에 상품을 등록·수정·삭제하는 호출은 없다 — 조회만.
 *
 * [확인한 판매처 — 공식 문서]
 *   쿠팡       GET 등록상품 조회 (PATHS.product — 예전 sync 그대로) · statusName '상품삭제' = 삭제 — 승인 대기·전송 중·반려 기록만 하나씩(반려 사유 histories도)
 *              GET 상품 목록 페이징 조회 (같은 경로 seller-products + 쿼리 — developers.coupang.com/hc/ko/articles/360033645034, 2026-10-02 확인)
 *                vendorId 필수 · nextToken(첫 쪽은 비움) · maxPerPage 최대 100 · status = IN_REVIEW·SAVED·APPROVING·APPROVED·PARTIAL_APPROVED·DENIED·DELETED(상품삭제)
 *                응답 code·message·nextToken·data[].sellerProductId·statusName. 상품번호 여러 개로 거르는 칸은 없다(sellerProductId 하나만)
 *                → 승인 완료 기록의 삭제 확인 = status=DELETED 목록을 쪽마다 훑어 우리 상품번호와 맞춘다 (판매자의 삭제 상품 수 ÷ 100번)
 *              호출 한도: 문서 숫자 없음 — 429 = 잠시 후 / 403 "Access denied" = IP 10분 차단 → 5초 안 오류 20건이면 10분 멈춤(breakerFor, developers.coupang.com FAQ 권고)
 *   계정 식별값(보낼 때 기록 · 확인 때 지금 연결된 계정과 비교 — 다르거나 기록이 없으면 "삭제됨"으로 바꾸지 않는다)
 *              쿠팡 = 업체코드 vendorId (marketplace_accounts.vendor_id — 모든 쿠팡 호출의 X-Requested-By·목록 조회 필수값)
 *              스마트스토어 = 계정 정보 조회 GET /external/v1/seller/account 응답 accountUid (문서 get-account-info-by-account-no-sellers:
 *                "계정 정보를 조회하는 API입니다. 조회 대상 판매자 번호에 대한 인증 토큰이 필요합니다." 응답 accountId·accountUid·grade — API 그룹 "판매자정보")
 *   스마트스토어 POST /external/v1/products/search (상품 목록 조회 search-product) — searchKeywordType PRODUCT_NO + originProductNos, 페이지당 최대 500건(문서 size 설명)
 *              응답 contents[].originProductNo · channelProducts[].statusType (WAIT·SALE·OUTOFSTOCK·UNADMISSION·REJECTION·SUSPENSION·CLOSE·PROHIBITION·DELETE)
 *              검색 결과에 없는 상품 = GET /external/v2/products/origin-products/{originProductNo} (read-origin-product-product) — 404 code NOT_FOUND "데이터 없음" 또는 statusType DELETE = 삭제
 *              호출 한도: 문서 "제약 사항" — API·애플리케이션 단위 토큰 버킷, 숫자는 유동적(응답 헤더 GNCP-GW-RateLimit-*), 넘으면 429 GW.RATE_LIMIT
 *              (문서 위치 apicenter.commerce.naver.com/docs/commerce-api/current/search-product · read-origin-product-product · /docs/restriction)
 *   11번가    GET /rest/prodmarketservice/sellerprodcode/{sellerPrdCd} (판매자상품코드로 조회 — 응답 prdNo·selStatCd·selStatNm)
 *              (11번가 OPEN API 개발가이드 — 해성 계정으로 채팅 Claude가 2026-10-02 열람. 여러 개 조회 POST …/prodmarketservice/prodmarket는 일 500개 한도라 쓰지 않는다)
 *              selStatCd: 101 승인대기 · 102 승인전 · 103 판매중 · 104 품절 · 105 전시중지 · 106 판매정상종료 · 108 판매금지
 *              판정은 응답 prdNo가 우리 기록의 상품번호와 같을 때만 (판매자 상품코드는 중복 가능). 코드가 없는 예전 기록·응답에 없는 상품은 판정하지 않는다
 *              호출 한도: 문서에서 숫자를 확인하지 못함 → 한 번 요청에 서로 다른 코드 ELEVENST_LOOKUP_MAX개까지 (같은 breakerFor)
 *   지그재그  product_summary_list(product_id_list 최대 100 — DIRECT 샵 전용) → sales_status·display_status · 목록에 없으면 product(id) (문서: 상품이 없으면 null)
 *              CLOSED(문서 "삭제") = 삭제됨 · 그 밖 = 등록 완료(원문 "판매중 · 노출") — 규칙 api/_zigzagFields.js zigzagStatusOf (2026-10-02)
 *              계정 식별값 = 스토어 ID(Query.shop shop_id — 연결 때 marketplace_accounts.market_account에 저장)
 * [확인 못 함 — 넣지 않음] 카페24: 조회 API를 이 작업에서 확인하지 않았다 (고객에게 숨긴 판매처)
 */

/** 상태를 자동으로 확인하는 판매처 — 공식 문서로 조회 API를 확인한 곳만. 화면은 이 목록에 없는 판매처 칩에 "지원하지 않습니다" 안내 */
export const STATUS_CHECK_MARKETS = ['coupang', 'smartstore', '11st', 'zigzag']
/** 확인할 기록 상태 — 살아 있거나 판매처에서 진행 중인 것. 실패(failed)·삭제됨(deleted)·판매 종료(ended)는 다시 보지 않는다 */
export const CHECK_STATUSES = ['registered', 'approved', 'approval_pending', 'sending', 'rejected']
/** 판매처에서 지워진 상품 — 새 상태 값 (DB check·칸 이름은 docs/sql/2026-10-02-marketplace-sends-deleted.sql) */
export const DELETED = 'deleted'
/**
 * 판매처에서 판매가 끝난 상품(지워지지는 않음) — 11번가 106 판매정상종료·108 판매금지 (2026-10-02 새 상태 값 — DB check는 docs/sql/2026-10-02-marketplace-sends-ended.sql)
 * 살아 있는 상품이 아니다 → 다시 보내면 새로 등록한다(api/_marketUpdate.js LIVE_SEND_STATUSES에 없음)
 */
export const ENDED = 'ended'
/** 상태 확인으로 새로 쓰는 값 — SQL 실행 전이면 DB check가 거절한다(상태는 두고 원문·확인 시각만 저장) */
export const NEW_CHECK_STATUSES = [DELETED, ENDED]
/** 한 번 요청에 판매처마다 꺼내 볼 기록 수 — 쿠팡 = 승인 완료는 삭제 목록 훑기로 한꺼번에(하나씩 조회는 COUPANG_SINGLE_MAX까지) · 스마트스토어 = 목록 조회 1번(문서 최대 500) · 11번가 = 코드마다 1번 */
export const CHECK_BATCH = { coupang: 500, smartstore: 500, '11st': 30, zigzag: 100 }
/** 11번가 — 한 번 요청에 부르는 서로 다른 판매자 상품코드 수 (넘으면 다음 요청에서) */
export const ELEVENST_LOOKUP_MAX = 30
/** 11번가 selStatCd → 화면 원문 (문서 표 그대로) */
export const ELEVENST_STATUS_LABEL = { 101: '승인대기', 102: '승인전', 103: '판매중', 104: '품절', 105: '전시중지', 106: '판매정상종료', 108: '판매금지' }
/**
 * 11번가 selStatCd → 우리 기록 { status, raw } (raw = 응답 selStatNm, 없으면 위 표). 모르는 값 = null(기록을 바꾸지 않음)
 * 103 판매중 · 104 품절 · 105 전시중지 = 등록 완료(상품이 살아 있음 — 원문은 market_status) · 101·102 = 승인 대기 · 106·108 = 판매 종료(살아 있지 않음)
 */
export function elevenstStatusOf(selStatCd, selStatNm = '') {
  const code = String(selStatCd ?? '').trim()
  if (!(code in ELEVENST_STATUS_LABEL)) return null
  const raw = (String(selStatNm || '').trim() || ELEVENST_STATUS_LABEL[code]).slice(0, 40)
  if (code === '101' || code === '102') return { status: 'approval_pending', raw }
  if (code === '106' || code === '108') return { status: ENDED, raw }
  return { status: 'registered', raw }
}
/**
 * 11번가 조회 결과에서 우리 기록의 상품 찾기 — 상품번호가 같은 것만 (판매자 상품코드는 중복 가능)
 * @param {{ prdNo, selStatCd, selStatNm }[]} products parseSellerCodeProducts 결과 · @returns {object|null}
 */
export const elevenstProductOf = (products, prdNo) => (Array.isArray(products) ? products : []).find(p => String(p?.prdNo) === String(prdNo ?? '')) || null
/** 쿠팡에서 하나씩 조회하는 기록(승인 대기·전송 중·반려) — 한 번 요청에 최대 (예전 SYNC_MAX 그대로) */
export const COUPANG_SINGLE_MAX = 30
/** 하나씩 조회하는 상태 · 삭제 목록으로 확인하는 상태(살아 있는 상품) */
export const SINGLE_CHECK_STATUSES = ['approval_pending', 'sending', 'rejected']
export const LIVE_CHECK_STATUSES = ['approved', 'registered']
/** 쿠팡 삭제 상품 목록 — 쪽당 100(문서 최대) · 한 번 요청에 최대 쪽 수(넘으면 못 본 쪽의 삭제는 다음 확인 때 — 찾지 못한 것은 "삭제됨"으로 바꾸지 않는다) */
export const COUPANG_PAGE_SIZE = 100
export const COUPANG_DELETED_PAGES_MAX = 20
/** 상품 목록 페이징 조회 쿼리 (삭제 상품만) — vendorId 필수, 첫 쪽은 nextToken 없음 */
export function coupangDeletedQuery(vendorId, nextToken = '') {
  const q = new URLSearchParams({ vendorId: String(vendorId || ''), status: 'DELETED', maxPerPage: String(COUPANG_PAGE_SIZE) })
  if (nextToken) q.set('nextToken', String(nextToken))
  return q.toString()
}
/** 목록 응답 → { ids:Set(등록상품ID 글자), next:'' | 다음 쪽 키 } */
export function coupangListPage(json) {
  const ids = new Set()
  for (const x of Array.isArray(json?.data) ? json.data : []) if (x?.sellerProductId != null && /^\d{1,20}$/.test(String(x.sellerProductId))) ids.add(String(x.sellerProductId))
  const next = json?.nextToken != null && String(json.nextToken) !== '' ? String(json.nextToken) : ''
  return { ids, next }
}

// ── 계정 ──
export const SS_ACCOUNT_PATH = '/external/v1/seller/account'
/** 계정 정보 조회 응답 → accountUid 글자(1~100자) 또는 null */
export const smartstoreAccountOf = json => (typeof json?.accountUid === 'string' && json.accountUid.trim() && json.accountUid.length <= 100 ? json.accountUid.trim() : null)
/**
 * 보낸 계정 ↔ 지금 연결된 계정 — 'same'(둘 다 있고 같음) · 'other'(둘 다 있고 다름) · 'unknown'(어느 한쪽이 없음 — 예전 기록·계정값을 못 읽음)
 * "삭제됨" 판정은 'same'일 때만. 'other'는 확인하지 않는다(다른 계정의 상품은 지금 연결로 조회되지 않는다)
 */
export function accountJudge(sentAccount, currentAccount) {
  const a = typeof sentAccount === 'string' ? sentAccount.trim() : '', b = typeof currentAccount === 'string' ? currentAccount.trim() : ''
  if (!a || !b) return 'unknown'
  return a === b ? 'same' : 'other'
}
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
export const STOP_CODES = ['breaker_open', 'rate_limited', 'access_denied', 'relay_not_configured', 'relay_unreachable', 'relay_denied', 'ip_not_allowed', 'bad_key', 'token_invalid', 'not_connected', 'key_expired', 'decrypt_failed', 'enc_not_ready', 'not_approved']

/** sync 요청의 since(확인 시작 시각) — ISO 글자만, 앞으로의 시각은 지금으로 */
export function checkSince(v, now = Date.now()) {
  const t = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? Date.parse(v) : NaN
  return new Date(Number.isFinite(t) && t <= now ? t : now).toISOString()
}

// ── 목록(sends_list) — 100건 한도 없이 페이지로 끝까지 읽는다 ──
/** 한 번에 읽는 줄 수 (Supabase REST 기본 최대 1000줄) · 최대 페이지 (= 20,000건 — 넘으면 앞부분만 + 로그) */
export const LIST_PAGE = 1000
export const LIST_PAGES_MAX = 20
