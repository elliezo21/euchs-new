/**
 * 판매처 연동 — 화면 규칙 (순수 함수, import 없음 → scripts/test-marketplace.mjs가 그대로 부른다)
 */

// 우리 쪽 준비 문제 — 고객에게는 "지금은 연결할 수 없어요…" 한 줄만, 빨간 경고로 띄우지 않는다 (원인은 서버 로그)
export const NOT_READY_CODES = ['marketplace_sql_missing', 'enc_not_ready', 'relay_not_configured', 'relay_unreachable', 'relay_denied']
export const isNotReady = code => NOT_READY_CODES.includes(code)

// 고객이 Wing에서 직접 고칠 수 있는 오류 — 문구 옆에 [연결 방법 보기]를 붙인다
export const GUIDE_CODES = ['ip_not_allowed', 'bad_key', 'bad_vendor', 'key_expired']
export const needsGuide = code => GUIDE_CODES.includes(code)

// 설정 화면 탭 (순서 = 화면 순서). route = 자식 라우트 이름, legacy = 예전 라우트 이름(redirect로 남김)
// soon = 탭 내용이 아직 "준비 중이에요" 껍데기 → 탭 이름 옆에 "준비 중" 배지 (화면이 생기면 뺀다)
export const SETTINGS_TABS = [
  { key: 'marketplace', label: '판매처 연결', route: 'studio-settings-marketplace', legacy: 'studio-marketplace' },
  { key: 'shipping', label: '배송·반품 템플릿', route: 'studio-settings-shipping' },
  { key: 'assets', label: '저장값', route: 'studio-settings-assets', legacy: 'studio-assets', soon: true },
  { key: 'glossary', label: '용어집', route: 'studio-settings-glossary', legacy: 'studio-glossary', soon: true },
]

// 판매처 목록 — 설정 > 판매처 연결과 랜딩 칩이 같은 목록·같은 순서를 쓴다. soon = 이름 + "준비 중" 배지만 (부가 설명 문구 없음)
export const MARKETS = [
  { key: 'coupang', name: '쿠팡' },
  { key: 'smartstore', name: '스마트스토어', soon: true },
  { key: '11st', name: '11번가', soon: true },
  { key: 'gmarket', name: 'G마켓·옥션', soon: true },
  { key: 'ably', name: '에이블리', soon: true },
  { key: 'zigzag', name: '지그재그', soon: true },
  { key: 'cafe24', name: '카페24', soon: true },
  { key: 'makeshop', name: '메이크샵', soon: true },
  { key: 'godomall', name: '고도몰', soon: true },
]

/**
 * 보내기 창 "보낼 판매처" 줄 — MARKETS와 같은 순서.
 * state: 'connected'(체크 가능) | 'locked'(열려 있지만 연결 전 — 자물쇠 + [연결하기]) | 'soon'("준비 중" 배지만)
 * @param {{ [key:string]: { connected?:boolean } }} connected  서버 send_prepare.markets
 */
export function marketRows(connected = {}) {
  return MARKETS.map(m => ({ key: m.key, name: m.name, state: m.soon ? 'soon' : connected?.[m.key]?.connected === true ? 'connected' : 'locked' }))
}
/** 처음 체크 — 연결된 판매처는 모두 체크 (1곳이면 그 1곳) */
export const defaultChecked = rows => Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => [r.key, r.state === 'connected']))
/** 체크된 판매처 key (연결된 것만 — 체크할 수 없는 줄은 값이 있어도 뺀다) */
export const checkedMarkets = (rows, checked) => (Array.isArray(rows) ? rows : []).filter(r => r.state === 'connected' && checked?.[r.key] === true).map(r => r.key)
/** 섹션을 만들어 둘 판매처 — 연결돼 있고 섹션 컴포넌트가 있는 곳. 체크 여부와 상관없다(체크는 보이기만 바꾼다 → 넣은 값이 남는다) */
export const sectionKeys = (rows, have) => (Array.isArray(rows) ? rows : []).filter(r => r.state === 'connected' && (have || []).includes(r.key)).map(r => r.key)
/** "쿠팡으로" / "11번가로" — 받침(ㄹ 제외)이 있으면 '으로' */
export function withRo(name) {
  const s = String(name || '')
  const c = s.charCodeAt(s.length - 1)
  if (c >= 0xAC00 && c <= 0xD7A3) { const jong = (c - 0xAC00) % 28; return `${s}${jong === 0 || jong === 8 ? '로' : '으로'}` }
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

// 상태 배지 — 색: 전송 중·승인 대기 = 회색, 승인 = 초록, 반려·실패 = 빨강
export const SEND_BADGE_CLASS = { sending: 'st-badge', approval_pending: 'st-badge', approved: 'st-badge st-badge-ok', rejected: 'st-badge st-badge-danger', failed: 'st-badge st-badge-danger' }
/**
 * 내 상품 id → 판매처별 가장 최근 전송 (MARKETS 순서). 안 보낸 판매처는 목록에 없다.
 * @returns {{ [exportId]: [send] }}
 */
export function sendsByExport(sends) {
  const latest = {}
  for (const s of Array.isArray(sends) ? sends : []) {
    if (!s?.exportId) continue
    const market = s.market || 'coupang' // 예전 기록에는 판매처 칸이 응답에 없었다 — 그때는 쿠팡뿐
    const slot = (latest[s.exportId] ||= {})
    const cur = slot[market]
    if (!cur || new Date(s.createdAt).getTime() > new Date(cur.createdAt).getTime()) slot[market] = { ...s, market }
  }
  const order = MARKETS.map(m => m.key)
  return Object.fromEntries(Object.entries(latest).map(([id, slot]) => [id, Object.values(slot).sort((a, b) => order.indexOf(a.market) - order.indexOf(b.market))]))
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
