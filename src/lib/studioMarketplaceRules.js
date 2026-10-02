/**
 * 판매처 연동 — 화면 규칙 (순수 함수 → scripts/test-marketplace.mjs가 그대로 부른다)
 * import는 서버와 같이 쓰는 순수 파일뿐 (api/_elevenstFields.js — 11번가 공개 스위치 · api/_marketUpdate.js — 다시 보내기 = 수정 규칙)
 */
import { ELEVENST_SEND_PUBLIC } from '../../api/_elevenstFields.js'
import { REAPPROVAL_MARKETS, LIVE_SEND_STATUSES } from '../../api/_marketUpdate.js'

// 우리 쪽 준비 문제 — 고객에게는 "지금은 연결할 수 없어요…" 한 줄만, 빨간 경고로 띄우지 않는다 (원인은 서버 로그)
export const NOT_READY_CODES = ['marketplace_sql_missing', 'enc_not_ready', 'relay_not_configured', 'relay_unreachable', 'relay_denied', 'cafe24_not_ready']
export const isNotReady = code => NOT_READY_CODES.includes(code)

// 고객이 Wing에서 직접 고칠 수 있는 오류 — 문구 옆에 [연결 방법 보기]를 붙인다
export const GUIDE_CODES = ['ip_not_allowed', 'bad_key', 'bad_vendor', 'key_expired']
export const needsGuide = code => GUIDE_CODES.includes(code)

// 설정 화면 탭 (순서 = 화면 순서). route = 자식 라우트 이름, legacy = 예전 라우트 이름(redirect로 남김)
// soon = 탭 내용이 아직 "준비 중이에요" 껍데기 → 탭 이름 옆에 "준비 중" 배지 (화면이 생기면 뺀다)
// 판매처 연결·배송·반품 템플릿은 2026-09-30 사이드바 [판매처](CHANNEL_TABS)로 옮김 — 예전 주소는 router에서 새 탭으로 redirect
export const SETTINGS_TABS = [
  { key: 'assets', label: '저장값', route: 'studio-settings-assets', legacy: 'studio-assets', soon: true },
  { key: 'glossary', label: '용어집', route: 'studio-settings-glossary', legacy: 'studio-glossary', soon: true },
]

// 판매처 화면 탭 (2026-09-30 — 만드는 곳(내 작업)과 보내는 곳(판매처)을 나눔). route = 자식 라우트 이름 (/studio/channels/<key>)
// moved = 예전 주소(라우트 이름) — 새 탭으로 redirect
export const CHANNEL_TABS = [
  { key: 'send', label: '보내기', route: 'studio-channels-send' },
  { key: 'sent', label: '보낸 상품', route: 'studio-channels-sent' },
  { key: 'defaults', label: '기본 설정', route: 'studio-channels-defaults', moved: ['studio-settings-shipping'] },
  { key: 'connect', label: '연결', route: 'studio-channels-connect', moved: ['studio-settings-marketplace', 'studio-marketplace'] },
]

// 판매처 목록 — 연결 탭·보내기 탭·보내기 창·랜딩 칩이 같은 목록·같은 순서를 쓴다
// connect = 연결 방법: 'key' = 고객이 직접 발급한 키·앱으로 연결(쿠팡·11번가·스마트스토어·카페24) · 'planned' = 아직 연결할 수 없음 → 화면에 "예정" 한 단어만
//   (S3-3, 2026-09-30: 업체 등록·제휴 없이 고객 키만으로 되는 곳만 연결한다. 연결 신청 기능은 걷어냄 — 버튼·입력 칸·안내 문구 없음)
// soon = 연결은 되지만 아직 상품 보내기를 못 함 (지금은 없음). 보내기 되는 곳 = 쿠팡·카페24(2026-09-30)·스마트스토어·11번가(2026-10-01)
export const MARKETS = [
  { key: 'coupang', name: '쿠팡', connect: 'key' },
  { key: 'smartstore', name: '스마트스토어', connect: 'key' }, // 2026-09-30 S3-2 — 고객이 만든 내 스토어 애플리케이션 ID·시크릿. 2026-10-01 보내기 = 서버 smartstore_send
  { key: '11st', name: '11번가', connect: 'key' }, // 2026-10-01 보내기 = 서버 elevenst_send
  { key: 'gmarket', name: 'G마켓·옥션', soon: true, connect: 'planned' },
  { key: 'ably', name: '에이블리', soon: true, connect: 'planned' }, // 판매자 API 토큰은 있지만 공개 API 문서가 없어 주소·인증을 확인할 수 없음 (S3-3 조사)
  { key: 'zigzag', name: '지그재그', soon: true, connect: 'planned' },
  // 2026-09-30 — 우리 앱 "EUCHS 스튜디오" + 쇼핑몰 ID + 카페24 동의 화면. 보내기 = 서버 cafe24_send
  // 2026-10-02 운영 중단 → off: 관리자·스태프 포함 누구에게도 안 보임 (코드·DB 기록은 그대로 — 다시 켜려면 off만 뺀다)
  { key: 'cafe24', name: '카페24', connect: 'key', off: true },
  { key: 'makeshop', name: '메이크샵', soon: true, connect: 'planned' },
  { key: 'godomall', name: '고도몰', soon: true, connect: 'planned' },
]
/** 아직 연결할 수 없는 판매처 key — 화면에는 "예정" 한 단어만 */
export const PLANNED_MARKETS = MARKETS.filter(m => m.connect === 'planned').map(m => m.key)
export const PLANNED_LABEL = '예정'
/** 보내기 창(StudioSendModal)이 판매처 섹션에 내려주는 "같은 화면 안에서 다시 받지 않는 목록" provide 키 (2026-09-30 — 카페24 상품 분류) */
export const SEND_CACHE_KEY = 'studio-send-cache'

// 보이는 범위 — MARKETS 항목의 설정 두 가지로만 정한다 (화면마다 판매처 이름으로 거르지 않는다)
//   off: true       = 운영 중단 — 누구에게도(관리자·스태프 포함) 안 보임: 판매처 목록·보내기 줄·보낸 상품(칩·필터·상태 카드·이력)·연결 화면·소개·홈
//   adminOnly: true = 관리자·스태프에게만 (지금은 없음)
//   서버: cafe24_* 요청은 api/marketplace.js cafe24Allowed(관리자·스태프만) 그대로 · 상태 확인(api/_marketStatus.js STATUS_CHECK_MARKETS)에 카페24 없음
/** 운영 중단 판매처 key — 누구에게도 보이지 않는다 */
export const OFF_MARKETS = MARKETS.filter(m => m.off).map(m => m.key)
/** 관리자·스태프에게만 보이는 판매처 key */
export const ADMIN_ONLY_MARKETS = MARKETS.filter(m => m.adminOnly).map(m => m.key)
/** 이 판매처가 이 사람에게 보이는지 */
export const marketVisible = (key, { admin = false } = {}) => !OFF_MARKETS.includes(key) && (admin || !ADMIN_ONLY_MARKETS.includes(key))
/** 이 사람에게 보일 판매처 목록 (MARKETS 순서) */
export const marketsFor = ({ admin = false } = {}) => MARKETS.filter(m => marketVisible(m.key, { admin }))
/** 소개·홈처럼 누구나 보는 화면의 판매처 목록 */
export const PUBLIC_MARKETS = marketsFor({ admin: false })
/**
 * 보낸 기록에서 운영 중단 판매처(off) 기록을 뺀다 — 서버 응답을 받는 곳(studioMarketplace listSends·syncSends) 한 곳에서만.
 * 보낸 상품 칩·필터·상태 카드 숫자·이력·마지막 확인 시각·내 상품 배지가 모두 이 목록을 쓴다. 관리자 전용(adminOnly)은 서버가 사람마다 거른다
 */
export const visibleSends = sends => (Array.isArray(sends) ? sends : []).filter(s => !OFF_MARKETS.includes(s?.market || 'coupang'))
/** 이 사람에게 보일 연결 방법 — MARKETS의 connect (보이지 않는 판매처는 null) */
export const connectFor = (m, { admin = false } = {}) => (m && marketVisible(m.key, { admin }) ? m.connect : null)

/**
 * 카페24 입력 검사 — 우리 앱 방식이라 고객이 넣는 값은 쇼핑몰 ID 하나 (영문 소문자·숫자 — 서버 api/_cafe24.js isMallId·normalizeMallId와 같은 식)
 */
export const normalizeCafe24MallId = s => String(s || '').trim().toLowerCase().replace(/\.cafe24\.com.*$/, '').replace(/^https?:\/\//, '')
export const cafe24MallProblems = ({ mallId = '' } = {}) => (/^[a-z0-9]{3,20}$/.test(normalizeCafe24MallId(mallId)) ? [] : ['쇼핑몰 ID'])
/** 연결 탭에 돌아온 주소가 카페24 동의 결과인지 (?code=&state=c24.… 또는 ?error=&state=c24.…) — 구글·카카오 로그인의 ?code=와 구분 */
export const isCafe24Return = q => typeof q?.state === 'string' && q.state.startsWith('c24.') && (typeof q.code === 'string' || typeof q.error === 'string')
/** 쇼핑몰 관리자에서 우리 앱을 열어 App URL로 들어왔는지 (?mall_id=…&timestamp=…&hmac=…) */
export const isCafe24Launch = q => typeof q?.hmac === 'string' && typeof q?.mall_id === 'string'
/** App URL로 붙어 오는 칸 — 확인을 시작하면 주소에서 뗀다 (예: lang·mall_id·nation·shop_no·timestamp·user_id·user_name·user_type·hmac) */
export const CAFE24_LAUNCH_KEYS = ['lang', 'mall_id', 'nation', 'shop_no', 'timestamp', 'user_id', 'user_name', 'user_type', 'is_multi_shop', 'hmac']
/**
 * 스마트스토어 키 입력 검사 — 애플리케이션 ID(공백 없음 4~200자)·시크릿(bcrypt salt 모양 "$2a$…" — 서버 api/_smartstore.js isBcryptSalt와 같은 식)
 */
export function smartstoreKeyProblems({ clientId = '', clientSecret = '' } = {}) {
  const out = []
  if (!/^[\x21-\x7e]{4,200}$/.test(String(clientId || '').trim())) out.push('애플리케이션 ID')
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{22}/.test(String(clientSecret || '').trim())) out.push('애플리케이션 시크릿')
  return out
}
/** 11번가 키 입력 검사 — 셀러 ID·API 키 (공백 없는 영문·숫자·기호 8~200자) */
export function elevenstKeyProblems({ sellerId = '', apiKey = '' } = {}) {
  const out = []
  const id = String(sellerId || '').trim(), key = String(apiKey || '').trim()
  if (!id || id.length > 100) out.push('11번가 셀러 ID')
  if (!/^[\x21-\x7e]{8,200}$/.test(key)) out.push('API 키')
  return out
}

/**
 * 판매처 줄 — 보내기 탭·보내기 창 "보낼 판매처"가 같이 쓴다. MARKETS와 같은 순서.
 * state: 'connected'(보낼 수 있음 — 체크 가능) | 'linked'(연결됨 — 보내기는 아직: 11번가) | 'locked'(연결 전 — 자물쇠 + [연결하기]) | 'planned'("예정" 한 단어만)
 * "준비 중" 글자는 쓰지 않는다
 * @param {{ [key:string]: { connected?:boolean } }} connected  쿠팡 = 서버 status/send_prepare.markets, 나머지 = studioMarketLinks.linkStates
 * @param {{ admin?: boolean }} who  관리자·스태프면 adminOnly 판매처 줄도 · off 판매처는 누구에게도 줄이 없음(연결돼 있어도 — marketsFor)
 */
/** 연결돼 있을 때 이 사람이 보낼 수 있는지 — soon이 아니고, 11번가는 공개 전(ELEVENST_SEND_PUBLIC false)이면 관리자·스태프만 (2026-10-01) */
export const sendableFor = (m, { admin = false } = {}) => !!m && !m.soon && (m.key !== '11st' || ELEVENST_SEND_PUBLIC || admin)
/** [기본 설정] 탭 "등록 템플릿" 카드 — 지금 쓰는 곳이 11번가 보내기뿐이라 같은 스위치: 공개 전이면 관리자·스태프만 (2026-10-01) */
export const listingTemplatesShown = ({ admin = false } = {}) => ELEVENST_SEND_PUBLIC || admin === true
export function channelRows(connected = {}, { admin = false } = {}) {
  return marketsFor({ admin }).map(m => {
    const on = connected?.[m.key]?.connected === true
    const state = on ? (sendableFor(m, { admin }) ? 'connected' : 'linked') : connectFor(m, { admin }) === 'planned' ? 'planned' : 'locked'
    return { key: m.key, name: m.name, state }
  })
}
/**
 * 연결 상태 표시 단계 (2026-09-30 운영 — 불러오는 동안 모든 카드가 "연결 전"으로 보였다가 "연결됨"으로 바뀌던 깜빡임)
 *   'ready' 한 번이라도 읽음 · 'checking' 로그인 확인 중이거나 읽는 중 · 'failed' 한 번도 못 읽음(네트워크·500 등) · 'guest' 로그인 전
 *   'locked' 주문 자격 없음 — 서버 studioGuard가 403 not_customer (2026-09-30 운영: 이것이 'failed'로 보여 [다시 시도]만 반복됐다)
 * "연결 전"·[연결하기]는 'ready'(연결 안 됨)·'guest'·'locked'에서 보인다 — [연결하기]는 studioGate가 막고 주문 고객 안내 창을 연다.
 * 'failed'는 "연결 전"으로 떨어뜨리지 않고 LINK_LOAD_FAILED + [다시 시도]. 자격 판정은 서버에만 있다 — 여기서는 응답 코드만 읽는다
 */
export const NOT_CUSTOMER = 'not_customer'
export function linkPhase({ authLoading = false, loggedIn = false, loaded = false, error = '', code = '' } = {}) {
  if (loaded) return 'ready'
  if (authLoading) return 'checking'
  if (!loggedIn) return 'guest'
  if (code === NOT_CUSTOMER) return 'locked'
  return error ? 'failed' : 'checking'
}
export const LINK_LOAD_FAILED = '연결 상태를 불러오지 못했습니다.'
/** 보내기 창 "보낼 판매처" 줄 — channelRows와 같은 규칙 (S3-3에서 "준비 중" 배지 없앰) */
export const marketRows = channelRows
/** 처음 체크 — 연결된 판매처는 모두 체크 (1곳이면 그 1곳) */
export const defaultChecked = rows => Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => [r.key, r.state === 'connected']))
/** 체크된 판매처 key (연결된 것만 — 체크할 수 없는 줄은 값이 있어도 뺀다) */
export const checkedMarkets = (rows, checked) => (Array.isArray(rows) ? rows : []).filter(r => r.state === 'connected' && checked?.[r.key] === true).map(r => r.key)
/** 섹션을 만들어 둘 판매처 — 연결돼 있고 섹션 컴포넌트가 있는 곳. 체크 여부와 상관없다(체크는 보이기만 바꾼다 → 넣은 값이 남는다) */
export const sectionKeys = (rows, have) => (Array.isArray(rows) ? rows : []).filter(r => r.state === 'connected' && (have || []).includes(r.key)).map(r => r.key)
/** "쿠팡으로" / "11번가로" / "카페24로" — 받침(ㄹ 제외)이 있으면 '으로'. 끝이 숫자면 읽는 소리(영·일·이·삼·사·오·육·칠·팔·구)로 판정 */
const DIGIT_EUL = { 0: '으로', 1: '로', 2: '로', 3: '으로', 4: '로', 5: '로', 6: '으로', 7: '로', 8: '로', 9: '로' }
export function withRo(name) {
  const s = String(name || '')
  const last = s[s.length - 1] || ''
  const c = last.charCodeAt(0)
  if (c >= 0xAC00 && c <= 0xD7A3) { const jong = (c - 0xAC00) % 28; return `${s}${jong === 0 || jong === 8 ? '로' : '으로'}` }
  if (DIGIT_EUL[last]) return `${s}${DIGIT_EUL[last]}`
  return `${s}(으)로`
}
/** [보내기] 버튼 글자 — 1곳이면 그 이름, 아니면 "선택한 판매처로 보내기" */
export function sendButtonLabel(keys) {
  const list = Array.isArray(keys) ? keys : []
  const one = list.length === 1 ? MARKETS.find(m => m.key === list[0]) : null
  return one ? `${withRo(one.name)} 보내기` : '선택한 판매처로 보내기'
}

// 보내기 창 옵션 표 — 칸이 잘리지 않게: 표에 필요한 폭이 자리보다 크거나 폰이면 카드형(옵션 1개 = 카드 1장)으로 바꾼다. 가로 스크롤은 쓰지 않는다
//   고정 칸(px): 사진 52 · 정가 96 · 판매가 96 · 할인 52 · 재고 수량 84 · 품번 164 · GTIN 136 · 빼기 44 (+ 1688 가격 80)
//   늘어나는 칸: 옵션 이름 + 옵션 종류·속성 칸 — 칸마다 최소 OPTION_FLEX_MIN
export const OPTION_FIXED_PX = 52 + 96 + 96 + 52 + 84 + 164 + 136 + 44
export const OPTION_CNY_PX = 80
export const OPTION_FLEX_MIN = 104
export const OPTION_PHONE_PX = 640
/**
 * @param {{ width:number(표 자리 폭 px — 모르면 0), viewport:number, flexCols:number(옵션 이름 포함), hasCny:boolean }} o
 * @returns {'table'|'cards'}
 */
export function optionTableMode({ width = 0, viewport = 0, flexCols = 2, hasCny = false } = {}) {
  if (viewport > 0 && viewport < OPTION_PHONE_PX) return 'cards'
  const room = width > 0 ? width : viewport > 0 ? Math.min(viewport * 0.9, 1400) - 60 : 0 // 창 = 화면 폭 90%(최대 1400) − 안쪽 여백
  if (!(room > 0)) return 'table'
  return room < optionTableNeed({ flexCols, hasCny }) ? 'cards' : 'table'
}
export const optionTableNeed = ({ flexCols = 2, hasCny = false } = {}) => OPTION_FIXED_PX + (hasCny ? OPTION_CNY_PX : 0) + Math.max(1, flexCols) * OPTION_FLEX_MIN

// 판매처 전송 상태 문구 — 고객 화면은 모두 이 한 곳(sendStatusLabel)을 쓴다 (2026-10-02 통일: 보내기 탭 줄 배지·보낸 상품 카드·내 상품 배지·보내기 창 배지·결과 표)
// 상태 값(DB marketplace_sends.status)은 그대로, 문구만. registered = 카페24·스마트스토어·11번가(승인 절차 없음 — 등록 즉시 끝)
// deleted = 판매처에서 상품이 지워진 것을 상태 확인으로 알게 됨 (2026-10-02 — api/_marketStatus.js DELETED)
// ended = 판매처에서 판매가 끝남(11번가 판매정상종료·판매금지 — 상품은 남아 있지만 살아 있지 않음, 2026-10-02 api/_marketStatus.js ENDED)
export const SEND_STATUS_LABEL = { sending: '전송 중', approval_pending: '승인 대기', approved: '승인 완료', registered: '등록 완료', rejected: '반려', failed: '실패', deleted: '판매처에서 삭제됨', ended: '판매처에서 판매 종료' }
/** 짧은 표기 — 판매처 이름과 붙여 쓰는 칩("스마트스토어 삭제됨")용. 없는 상태는 긴 표기와 같다 */
export const SEND_STATUS_SHORT = { deleted: '삭제됨', ended: '판매 종료' }
/**
 * 상태 → 문구 (짧은·긴 표기 모두 여기 한 곳). 목록에 없는 값은 원래 값 그대로(예전 화면과 같음)
 * @param {{ short?: boolean }} o  short = 판매처 이름 + 상태 칩 · 기본(긴 표기) = 이력 표 상태 칸·필터 선택지·배지
 */
export const sendStatusLabel = (status, { short = false } = {}) => (short && SEND_STATUS_SHORT[status]) || SEND_STATUS_LABEL[status] || String(status ?? '')
// 상태 배지 — 색: 전송 중·승인 대기·판매처에서 삭제됨 = 회색, 승인 완료·등록 완료 = 초록, 반려·실패 = 빨강
export const SEND_BADGE_CLASS = { sending: 'st-badge', approval_pending: 'st-badge', approved: 'st-badge st-badge-ok', registered: 'st-badge st-badge-ok', rejected: 'st-badge st-badge-danger', failed: 'st-badge st-badge-danger', deleted: 'st-badge', ended: 'st-badge' }
/**
 * 처음 체크할 판매처 — 특정 판매처 버튼([카페24로 보내기])으로 열었으면 그곳만, 다시 보내기면 쿠팡만, 아니면 연결된 곳 모두(defaultChecked)
 * sent = 이 상품을 이미 보낸 판매처(alreadySent) — [일괄 전송]·판매처 없이 열면 처음 체크에서 뺀다(2026-10-01 중복 등록 방지).
 *   특정 판매처 버튼([○○로 보내기])으로 열었으면 이미 보냈어도 그 판매처를 체크한다 — 보내면 판매처에 있는 상품을 수정한다(2026-10-02 existingNote).
 *   다시 보내기(resend)에는 쓰지 않는다
 */
export function initialChecked(rows, { market = '', resend = false, sent = {} } = {}) {
  const only = market || (resend ? 'coupang' : '')
  if (only) return Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => [r.key, r.key === only && r.state === 'connected']))
  return Object.fromEntries(Object.entries(defaultChecked(rows)).map(([k, v]) => [k, v && !sent?.[k]]))
}
// ── 다시 보내기 = 판매처에 있는 상품 수정 (2026-10-02 — 예전 "중복 등록하시겠습니까?" 확인을 걷어냄) ──
// 판매처마다 이미 있는 상품 = 서버 send_prepare.existing (규칙 api/_marketUpdate.js updatePlan — 서버가 보낼 때 같은 규칙으로 수정 대상을 고른다)
//   mode 'modify' = 판매처에 있는 상품을 수정(새 상품을 만들지 않음) · 'manual' = 수정 API가 없는 판매처 → 판매처에서 직접 수정, 보내기 막음
export const UPDATE_NOTE = '판매처에 있는 상품을 수정합니다'
/** 수정하면 승인을 다시 받는 판매처(REAPPROVAL_MARKETS)의 한 줄 — 판매처 이름은 MARKETS에서 */
export const reapprovalNote = key => `수정 후 ${MARKETS.find(m => m.key === key)?.name || key} 승인을 다시 받습니다`
export const manualEditNote = no => `판매처에 등록된 상품이 있습니다${no ? `(상품번호 ${no})` : ''}. 판매처에서 직접 수정하세요.`
/** 빠짐 목록 한 줄 — 수정 API가 없는 판매처에 이미 상품이 있어 보낼 수 없음 */
export const manualEditMissing = name => `${name} 판매처에서 직접 수정 (이미 등록된 상품)`
export const UPDATE_SEND_LABEL = '변경사항 전송'
/** 창 안 판매처 줄 안내 { mode, lines:[] } — 이미 있는 상품이 없으면 null */
export function existingNote(key, existing) {
  const e = existing?.[key]
  if (!e) return null
  if (e.mode === 'manual') return { mode: 'manual', lines: [manualEditNote(e.sellerProductId)] }
  if (e.mode !== 'modify') return null
  return { mode: 'modify', lines: [UPDATE_NOTE, ...(REAPPROVAL_MARKETS.includes(key) ? [reapprovalNote(key)] : [])] }
}
/** 체크했지만 보낼 수 없는 판매처(이미 상품이 있고 수정 API가 없음) — 이번 창에서 등록된 곳은 뺀다 */
export const manualEditKeys = (picked, existing, doneKeys = []) => (Array.isArray(picked) ? picked : []).filter(k => existing?.[k]?.mode === 'manual' && !doneKeys.includes(k))
/** "이미 보냄"으로 치는 상태 — 보내는 중·승인 대기·승인·등록됨. 반려·실패는 다시 보내도 중복이 아니다 */
export const ALREADY_SENT_STATUSES = ['sending', 'approval_pending', 'approved', 'registered']
/**
 * 이 상품을 이미 보낸 판매처 (2026-10-01)
 * @param {object[]} lastSends 이 내 상품의 판매처별 가장 최근 전송 (sendsByExport(sends)[exportId])
 * @returns {{ [market]: send }}
 */
export function alreadySent(lastSends) {
  const out = {}
  for (const s of Array.isArray(lastSends) ? lastSends : []) {
    const market = s?.market || 'coupang' // 예전 기록 규칙 = sendsByExport와 같음
    if (ALREADY_SENT_STATUSES.includes(s?.status)) out[market] = s
  }
  return out
}
/**
 * 내 상품 id → 판매처별 전송 1건 (MARKETS 순서). 안 보낸 판매처는 목록에 없다.
 * 살아 있는 상품(등록 완료·승인 완료·승인 대기, 다른 계정 아님)이 있으면 그중 가장 최근 — 다시 보내면 서버가 수정하는 그 상품(2026-10-02, api/_marketUpdate.js).
 * 없으면 가장 최근 전송 (보낸 상품 칩 studioSentList.groupSentProducts와 같은 규칙)
 * @returns {{ [exportId]: [send] }}
 */
export function sendsByExport(sends) {
  const latest = {}
  const live = s => LIVE_SEND_STATUSES.includes(s.status) && !s.accountMismatch
  for (const s of Array.isArray(sends) ? sends : []) {
    if (!s?.exportId) continue
    const market = s.market || 'coupang' // 예전 기록에는 판매처 칸이 응답에 없었다 — 그때는 쿠팡뿐
    const slot = (latest[s.exportId] ||= {})
    const cur = slot[market]
    const better = !cur || (live(s) && !live(cur)) || (live(s) === live(cur) && new Date(s.createdAt).getTime() > new Date(cur.createdAt).getTime())
    if (better) slot[market] = { ...s, market }
  }
  const order = MARKETS.map(m => m.key)
  return Object.fromEntries(Object.entries(latest).map(([id, slot]) => [id, Object.values(slot).sort((a, b) => order.indexOf(a.market) - order.indexOf(b.market))]))
}
/** [고쳐서 다시 보내기]를 보일 전송 — 반려됐고 쿠팡 상품 번호가 있는 것 */
export const canResend = s => !!s && s.status === 'rejected' && /^\d+$/.test(String(s.sellerProductId || ''))
/** [보내기] 버튼 글자 — 다시 보내기면 "다시 승인 요청" */
export const sendActionLabel = (keys, resend) => (resend ? '다시 승인 요청' : sendButtonLabel(keys))

export const SEND_RESULT_FAIL_HINT = '사유는 아래 판매처 칸에 표시됩니다.'
/** 결과 표에서 아직 차례가 안 온 판매처 (상태 값이 아님) — 나머지 상태 칸은 sendStatusLabel */
export const RESULT_WAIT_LABEL = '대기'
/**
 * 여러 판매처로 보낸 결과 줄 (2026-10-01) — 보내기 창 아래 결과 표. 판매처 2곳 이상을 한 번에 보냈을 때만 그린다(1곳이면 예전처럼 섹션 안에만)
 * @param {string[]} keys 이번에 보낸 판매처 (MARKETS 순서로 정렬해 돌려준다)
 * @param {{ [key]: { ok:boolean, id?:string, status?:string, reason?:string } }} results  ok = 보냄(id = 판매처 상품번호, status = 서버 응답 status — 등록 완료/승인 대기) · ok false = 실패(reason = 섹션에 보인 사유 그대로)
 * @returns {[{ key, name, state:'ok'|'fail'|'wait', id, status, reason }]}  wait = 아직 차례가 안 옴(보내는 중)
 */
export function sendResultRows(keys, results = {}) {
  const want = new Set(Array.isArray(keys) ? keys : [])
  return MARKETS.filter(m => want.has(m.key)).map(m => {
    const r = results?.[m.key]
    if (!r) return { key: m.key, name: m.name, state: 'wait', id: '', status: '', reason: '' }
    if (r.ok) return { key: m.key, name: m.name, state: 'ok', id: String(r.id ?? ''), status: String(r.status ?? ''), reason: '' }
    return { key: m.key, name: m.name, state: 'fail', id: '', status: 'failed', reason: String(r.reason || '').trim() || SEND_RESULT_FAIL_HINT }
  })
}
/**
 * 보내기 창 버튼 글자 — 여러 곳을 보냈는데 실패한 곳이 남았으면 "실패 건 재전송"(누르면 등록된 곳은 건너뛴다). 그 밖은 예전 그대로(sendActionLabel)
 * @param {string[]} picked 체크된 판매처 · @param {string[]} failed 체크된 판매처 중 지난번에 실패한 곳(아직 등록 안 됨)
 */
export const RETRY_FAILED_LABEL = '실패 건 재전송'
/** existing = send_prepare.existing — 보낼 판매처(체크됨·아직 안 보냄)가 모두 "판매처에 있는 상품 수정"이면 "변경사항 전송" */
export function bulkSendLabel(picked, failed, resend, existing = null, doneKeys = []) {
  if (!resend && (picked?.length || 0) > 1 && (failed?.length || 0) > 0) return RETRY_FAILED_LABEL
  const left = (Array.isArray(picked) ? picked : []).filter(k => !doneKeys.includes(k))
  if (!resend && left.length && left.every(k => existing?.[k]?.mode === 'modify')) return UPDATE_SEND_LABEL
  return sendActionLabel(picked, resend)
}

/** 배지 툴팁 — 반려·실패일 때만, 판매처가 준 사유(기록된 reason) 그대로 */
export const badgeReason = s => (s && ['rejected', 'failed'].includes(s.status) && typeof s.reason === 'string' ? s.reason.trim() : '')

/** 내 상품 id → 그 상품의 가장 최근 전송 (판매처 구분 없이 1건 — 판매처별은 sendsByExport) */
export function latestSendByExport(sends) {
  const map = {}
  for (const s of Array.isArray(sends) ? sends : []) {
    if (!s?.exportId) continue
    const cur = map[s.exportId]
    if (!cur || new Date(s.createdAt).getTime() > new Date(cur.createdAt).getTime()) map[s.exportId] = s
  }
  return map
}
