/**
 * 판매처 > [보낸 상품] 목록 규칙 (2026-10-02 카드형 → 목록형) — 순수 함수 (scripts/test-marketplace.mjs가 그대로 부른다)
 *
 * 재료 = 서버 sends_list 응답(api/marketplace.js publicSend — 전송 기록 1건 = 1줄, created_at 최근순 · 2026-10-02부터 한도 없이 전부).
 *   쿠팡 다시 승인 요청은 같은 기록을 고친다(revision) · 스마트스토어·11번가·카페24는 보낼 때마다 새 기록.
 * 상품 1개 = 내 상품(exportId) 1개. 판매처 현황 칩·상태 분류는 판매처마다 가장 최근 기록 1건만 본다(sendsByExport와 같은 규칙).
 * 상태 문구는 studioMarketplaceRules.sendStatusLabel 한 곳 — 여기에는 문구 표를 두지 않는다(묶음 이름만).
 * import는 상대 경로(node 테스트가 그대로 부른다)
 */
import { MARKETS, marketsFor, canResend, sendStatusLabel, badgeReason } from './studioMarketplaceRules.js'
import { STATUS_CHECK_MARKETS, CHECK_STATUSES, AUTO_CHECK_MS } from '../../api/_marketStatus.js'

// 판매처 이름·순서·필터 선택지는 판매처 목록 한 곳(studioMarketplaceRules.MARKETS · 보이는 범위 marketsFor)에서만 읽는다 —
// 목록에 판매처가 늘면 칩·필터에 그대로 나온다. 판매처마다 표 칸을 만들지 않는다 (2026-10-02)
export const sentMarketName = key => MARKETS.find(m => m.key === key)?.name || String(key || '')
const marketRank = key => { const i = MARKETS.findIndex(m => m.key === key); return i < 0 ? MARKETS.length : i }
/**
 * 판매처 필터 선택지 — marketsFor 순서 그대로. 아직 연결할 수 없는 곳(connect 'planned')은 보낸 기록이 생길 수 없어 뺀다
 * @returns {[{ key, name }]}
 */
export const marketFilterOptions = ({ admin = false } = {}) => marketsFor({ admin }).filter(m => m.connect !== 'planned').map(m => ({ key: m.key, name: m.name }))

/** 상태 묶음 — 위 카드 4개(all·done·pending·failed) + 상태 고르기에만 있는 '전송 중'(sending)·'판매처에서 삭제됨'(deleted — 완료로 세지 않는다) */
export const STATUS_GROUPS = [
  { key: 'all', label: '전체', statuses: null },
  { key: 'done', label: '등록·승인 완료', statuses: ['registered', 'approved'] },
  { key: 'pending', label: '승인 대기', statuses: ['approval_pending'] },
  { key: 'failed', label: '실패·반려', statuses: ['failed', 'rejected'] },
]
export const STATUS_FILTERS = [...STATUS_GROUPS, { key: 'sending', label: '전송 중', statuses: ['sending'] }, { key: 'deleted', label: sendStatusLabel('deleted'), statuses: ['deleted'] }]
const statusesOf = key => STATUS_FILTERS.find(g => g.key === key)?.statuses || null

export const PERIODS = [
  { key: 'all', label: '전체', days: 0 },
  { key: 'today', label: '오늘', days: 0 },
  { key: '7', label: '최근 7일', days: 7 },
  { key: '30', label: '최근 30일', days: 30 },
  { key: '90', label: '최근 90일', days: 90 },
]
export const SORTS = [{ key: 'recent', label: '최근 전송순' }, { key: 'name', label: '상품명순' }]
export const SEARCH_FIELDS = [{ key: 'name', label: '상품명' }, { key: 'no', label: '판매처 상품번호' }]
export const PAGE_SIZES = [20, 50, 100]
export const DEFAULT_PAGE_SIZE = 50

/** 칩 색 묶음 — 'ok' 등록·승인 완료 · 'wait' 승인 대기·전송 중 · 'bad' 실패·반려 · 'gone' 판매처에서 삭제됨(회색) · '' 그 밖 */
export function chipTone(status) {
  if (status === 'registered' || status === 'approved') return 'ok'
  if (status === 'approval_pending' || status === 'sending') return 'wait'
  if (status === 'failed' || status === 'rejected') return 'bad'
  if (status === 'deleted') return 'gone'
  return ''
}

/**
 * "판매처 현황" 칩 — 이 상품을 실제로 보낸 판매처만(판매처마다 가장 최근 기록 1건). PC 표·폰 카드가 같이 쓴다
 * 순서: 실패·반려 → 승인 대기·전송 중 → 완료 → 판매처에서 삭제됨 → 그 밖, 같은 묶음 안은 판매처 목록 순서
 * max개까지 다 보이고, 넘치면 (max−1)개 + "+N" 칩 — title = 나머지 "판매처 이름 상태"를 줄마다
 * @returns {{ chips:[{ id, market, status, tone, name, label, title, live }], more: null | { count, label, title } }}
 *   label = "판매처 이름 + sendStatusLabel(status)" (+ " N건" — 완료 칩이고 그 판매처에 살아 있는 상품이 2개 이상일 때 · liveCount)
 *   title = 실패·반려 사유(badgeReason) + 상태 자동 확인을 지원하지 않는 판매처면 UNCHECKED_NOTE (줄바꿈으로)
 */
export const CHIP_MAX = 5
const TONE_ORDER = ['bad', 'wait', 'ok', 'gone', '']
/** 살아 있는 상품 = 등록 완료·승인 완료 (판매처에서 삭제됨·실패·반려·대기는 아님) */
export const LIVE_STATUSES = ['registered', 'approved']
/** 같은 작업으로 이 판매처에 살아 있는 상품 수 — 그 판매처의 모든 기록 중 LIVE_STATUSES */
export const liveCount = (p, market) => (Array.isArray(p?.history) ? p.history : []).filter(s => s.market === market && LIVE_STATUSES.includes(s.status)).length
/** 상태 자동 확인을 지원하는 판매처인지 (api/_marketStatus.js STATUS_CHECK_MARKETS 한 곳) */
export const statusCheckable = market => STATUS_CHECK_MARKETS.includes(market)
export const UNCHECKED_NOTE = '이 판매처는 상태 자동 확인을 지원하지 않습니다'
export function marketChips(p, { max = CHIP_MAX } = {}) {
  const all = Object.values(p?.byMarket || {}).map(s => {
    const name = sentMarketName(s.market)
    const tone = chipTone(s.status)
    const live = liveCount(p, s.market)
    const label = `${name} ${sendStatusLabel(s.status)}${tone === 'ok' && live >= 2 ? ` ${live}건` : ''}`
    const title = [badgeReason(s), statusCheckable(s.market) ? '' : UNCHECKED_NOTE].filter(Boolean).join('\n')
    return { id: s.id, market: s.market, status: s.status, tone, name, label, title, live }
  }).sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone) || marketRank(a.market) - marketRank(b.market) || String(a.market).localeCompare(String(b.market)))
  if (all.length <= max) return { chips: all, more: null }
  const rest = all.slice(max - 1)
  return { chips: all.slice(0, max - 1), more: { count: rest.length, label: `+${rest.length}`, title: rest.map(c => c.label).join('\n') } }
}
/** 실패·반려인 판매처별 최근 기록 (판매처 목록 순서) — 폰 카드 "판매처 이름: 실패 사유" + [수정 후 재전송] */
export const failedLatest = p => Object.values(p?.byMarket || {}).filter(s => chipTone(s.status) === 'bad').sort((a, b) => marketRank(a.market) - marketRank(b.market))

const timeOf = iso => { const t = new Date(iso).getTime(); return Number.isFinite(t) ? t : 0 }
/** 한국 시각 날짜 'YYYY-MM-DD' (없거나 이상하면 '') */
export const kstDay = iso => { const t = timeOf(iso); return t ? new Date(t + 9 * 3600000).toISOString().slice(0, 10) : '' }
const marketOf = s => s.market || 'coupang' // 예전 기록에는 판매처 칸이 응답에 없었다 — 그때는 쿠팡뿐 (sendsByExport와 같은 규칙)

/**
 * 전송 기록 → 상품 목록 (최근 전송순)
 * @returns {[{ key, exportId, productName, latestAt, history:[send], byMarket:{ [market]: send } }]}
 *   key = 내 상품 id (내 상품 id가 없는 기록은 기록 하나가 상품 하나 — 'send:<id>')
 *   productName = 이력 중 상품명이 있는 가장 최근 기록의 productName (보내다 실패한 기록은 상품명이 비어 있을 수 있다)
 *   history = 그 상품의 모든 기록(최근순) · byMarket = 판매처마다 가장 최근 기록
 */
export function groupSentProducts(sends) {
  const map = new Map()
  for (const raw of Array.isArray(sends) ? sends : []) {
    if (!raw?.id) continue
    const s = { ...raw, market: marketOf(raw) }
    const key = s.exportId ? String(s.exportId) : `send:${s.id}`
    if (!map.has(key)) map.set(key, { key, exportId: s.exportId || null, history: [] })
    map.get(key).history.push(s)
  }
  const out = []
  for (const p of map.values()) {
    p.history.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
    const byMarket = {}
    for (const s of p.history) if (!byMarket[s.market]) byMarket[s.market] = s
    const named = p.history.find(s => typeof s.productName === 'string' && s.productName.trim())
    out.push({ ...p, byMarket, productName: named ? named.productName.trim() : '', latestAt: p.history[0]?.createdAt || null })
  }
  return out.sort((a, b) => timeOf(b.latestAt) - timeOf(a.latestAt))
}

/** 판매처별 최근 기록 중 상태가 묶음에 드는 것이 하나라도 있는지 */
const hasStatus = (p, key) => { const want = statusesOf(key); return !want || Object.values(p.byMarket).some(s => want.includes(s.status)) }
/** 상태 카드 숫자 — 그 상태가 판매처 칸(판매처별 최근 기록)에 하나라도 있는 상품 수 */
export function statusCounts(products) {
  const list = Array.isArray(products) ? products : []
  return Object.fromEntries(STATUS_GROUPS.map(g => [g.key, list.filter(p => hasStatus(p, g.key)).length]))
}

function inPeriod(iso, period, now) {
  if (!period || period === 'all') return true
  const t = timeOf(iso)
  if (!t) return false
  if (period === 'today') return kstDay(iso) === kstDay(new Date(now).toISOString())
  const days = PERIODS.find(x => x.key === period)?.days
  return !days || t >= now - days * 86400000
}
const norm = v => String(v ?? '').trim().toLowerCase()

/**
 * 거르기 — 판매처·상태·보낸 기간은 같은 기록 하나(판매처별 최근 기록)가 모두 맞아야 한다. 검색은 상품 단위
 * @param {{ market?:string, status?:string, period?:string, field?:'name'|'no', text?:string, now?:number }} f
 *   field 'name' = 상품명에 들어 있음(대소문자 무시) · 'no' = 이 상품의 어느 기록이든 판매처 상품번호(스마트스토어는 채널상품번호도)에 들어 있음
 */
export function filterSentProducts(products, { market = '', status = 'all', period = 'all', field = 'name', text = '', now = Date.now() } = {}) {
  const want = statusesOf(status)
  const q = norm(text)
  return (Array.isArray(products) ? products : []).filter(p => {
    const recs = market ? (p.byMarket[market] ? [p.byMarket[market]] : []) : Object.values(p.byMarket)
    if (!recs.some(s => (!want || want.includes(s.status)) && inPeriod(s.createdAt, period, now))) return false
    if (!q) return true
    if (field === 'no') return p.history.some(s => [s.sellerProductId, s.channelProductNo].some(v => v != null && norm(v).includes(q)))
    return norm(p.productName).includes(q)
  })
}

/** 정렬 — 'recent' 최근 전송순 · 'name' 상품명순(가나다, 같으면 최근 전송순). 원래 배열은 그대로 */
export function sortSentProducts(products, sort = 'recent') {
  const list = [...(Array.isArray(products) ? products : [])]
  const byRecent = (a, b) => timeOf(b.latestAt) - timeOf(a.latestAt)
  if (sort === 'name') return list.sort((a, b) => (a.productName || '').localeCompare(b.productName || '', 'ko') || byRecent(a, b))
  return list.sort(byRecent)
}

/** 페이지 나누기 — page는 1부터, 범위를 넘으면 끝 페이지로 */
export function pageSlice(list, page = 1, size = DEFAULT_PAGE_SIZE) {
  const all = Array.isArray(list) ? list : []
  const per = PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE
  const pages = Math.max(1, Math.ceil(all.length / per))
  const cur = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return { items: all.slice((cur - 1) * per, cur * per), page: cur, pages }
}

/** 이 기록에 [수정 후 재전송]을 보일지 — 실패·반려이고 그 판매처의 가장 최근 기록일 때만(뒤에 다시 보내 등록됐으면 옛 실패에는 없음) */
export const canFixResend = (p, s) => !!p && !!s && ['failed', 'rejected'].includes(s.status) && p.byMarket?.[s.market]?.id === s.id
/**
 * [수정 후 재전송]이 여는 길 — 둘 다 기존 보내기 창(StudioSendModal)
 *   'resend' = 쿠팡 반려 + 쿠팡 상품번호 있음 → 예전 [수정 후 다시 보내기]와 같은 길(resendToMarketplace — 같은 쿠팡 상품을 고쳐 다시 승인 요청)
 *   'send'   = 그 밖의 실패·반려 → 그 내 상품의 보내기 창을 그 판매처만 체크해서(sendToMarketplace + market)
 *   ''       = 버튼 없음 (실패·반려가 아니거나 최근 기록이 아님, 내 상품 id 없음)
 */
export function fixAction(p, s) {
  if (!canFixResend(p, s)) return ''
  if (s.market === 'coupang' && canResend(s)) return 'resend'
  return p.exportId ? 'send' : ''
}

// ── 판매처 상태 확인 (2026-10-02) — 서버 sync(판매처 공통)를 화면이 부르는 규칙. 예약 실행(cron) 없이 [보낸 상품] 탭을 열 때 ──
export { AUTO_CHECK_MS }
/** 한 번 확인에서 서버를 부르는 최대 횟수(묶음 수) · 묶음 사이 쉬는 시간 — 판매처 호출 한도·서킷 브레이커(5초 20건)를 넘기지 않게 */
export const CHECK_ROUNDS_MAX = 40
export const CHECK_ROUND_GAP_MS = 1500
/** 확인 대상 기록 — 자동 확인 판매처 + 판매처 상품번호 + 확인할 상태 (서버 checkMarket과 같은 조건) */
export const isCheckTarget = s => !!s && statusCheckable(s.market || 'coupang') && CHECK_STATUSES.includes(s.status) && /^\d{1,20}$/.test(String(s.sellerProductId || ''))
/** 화면의 "판매처 상태 마지막 확인" — 기록들의 lastSyncedAt 중 가장 최근 (없으면 null) */
export function lastCheckedAt(sends) {
  let best = 0
  for (const s of Array.isArray(sends) ? sends : []) { const t = timeOf(s?.lastSyncedAt); if (t > best) best = t }
  return best ? new Date(best).toISOString() : null
}
/** 탭을 열 때 자동으로 확인할지 — 확인 대상 중 한 번도 확인하지 않았거나 마지막 확인이 10분보다 오래된 기록이 있으면 */
export function needsAutoCheck(sends, now = Date.now()) {
  return (Array.isArray(sends) ? sends : []).some(s => isCheckTarget(s) && (!timeOf(s.lastSyncedAt) || now - timeOf(s.lastSyncedAt) > AUTO_CHECK_MS))
}
/** "10/2 10:20" (한국 시각) · 없으면 '-' */
export function fmtCheckedAt(iso) {
  const t = timeOf(iso)
  if (!t) return '-'
  const k = new Date(t + 9 * 3600000)
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()} ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`
}
/** 확인을 그만둘 오류(판매처 전체가 막힘)가 있는지 — 남은 묶음이 있어도 더 부르지 않는다 */
export const CHECK_STOP_CODES = ['breaker_open', 'rate_limited', 'access_denied']
export const checkShouldStop = errors => (Array.isArray(errors) ? errors : []).some(e => CHECK_STOP_CODES.includes(e?.code))
