/**
 * [내 상품] 목록 규칙 (2026-10-02) — 순수 함수 (scripts/test-studio-product-list.mjs가 그대로 부른다 · import는 상대 경로)
 *
 * [한 줄 = 작업(studio_projects) 하나] — 근거(0단계 조사):
 *   작업 1개 → 결과물(studio_exports) 0~여러 개. [작업 저장](source 'save')은 작업마다 하나이고 다시 저장하면 같은 id의 내용만 바뀐다
 *   (api/studio-upload.js export_save_commit · savePatchFrom). [다운로드]는 받을 때마다 새 결과물(source 'download').
 *   판매처 전송(marketplace_sends)은 결과물 id(export_id)에 붙는다 → 결과물 기준으로 줄을 만들면 같은 상품이 두 줄이 된다.
 *   그래서 작업 기준 한 줄 + 그 작업의 모든 결과물에 붙은 전송을 모은다(서버 exports_list perProject → exportIds).
 *   보낼 결과물 = 작업의 지금 결과물(save 우선, 없으면 가장 최근 download — api/_studioExports.js currentExportsByProject).
 *   서버도 같은 작업의 예전 결과물로 보낸 상품을 "이미 있는 상품"으로 찾아 수정한다(api/marketplace.js projectExportIds).
 * [만들기 상태 stage] — 2026-10-02부터 [작업 저장] = 작업 내용만 저장 + 저장한 시각(studio_projects.last_exported_at, 서버 work_save).
 *   상세 이미지(결과물)는 뒤에서·보낼 때 만든다(src/lib/studioProductImages.js) → 결과물이 아직 없어도 저장 시각이 있으면 "보내기 전"
 *   draft   작성 중 — 결과물도 저장 시각도 없음([작업 저장] 전). 보내기 체크 불가 · 할 일 [이어서 편집]
 *   ready   보내기 전 — [작업 저장]을 했고(또는 예전 결과물이 있고) 판매처로 보낸 기록이 없음 · 칩 "아직 안 보냄"
 *   sent    보냄 — 보낸 기록이 있고 보낸 뒤 바뀐 것이 없음
 *   changed 변경사항 미전송 — 판매처에 살아 있는 상품(등록·승인·승인 대기)이 있는데 그 상품을 마지막으로 보낸 뒤(sentAt) [작업 저장]을 다시 함
 *     · 저장한 때 = 저장 시각(없으면 예전 결과물 시각 createdAt). 서버는 바뀐 것 없이 다시 누르면 시각을 그대로 둔다(상세 이미지 내용 열쇠가 같으면)
 *     · 판매가·재고는 보내기 창에서만 넣고 상품에 따로 저장하지 않아 "가격만 바꿈"은 알 수 없다
 *     · 편집기에서 고치고 [작업 저장]을 안 했으면 changed가 아니다
 * [탭] 전체 · 작성 중 · 보내기 전 · 판매처에 올라감(등록 완료·승인 완료가 하나라도) · 확인 필요(실패·반려·승인 대기가 하나라도 또는 변경사항 미전송)
 */
import { MARKETS, OFF_MARKETS } from './studioMarketplaceRules.js'
import { LIVE_SEND_STATUSES } from '../../api/_marketUpdate.js'
import { fixAction } from './studioSentList.js'
import { hasUntranslated } from '../../api/_coupangFields.js'

export const STAGE_LABEL = { draft: '작성 중', ready: '보내기 전', sent: '보냄', changed: '변경사항 미전송' }
export const STAGE_BADGE = { draft: 'st-badge st-badge-outline', ready: 'st-badge st-badge-accent', sent: 'st-badge st-badge-ok', changed: 'st-badge st-badge-danger' }
export const NOT_SENT_CHIP = '아직 안 보냄'
export const DRAFT_LOCK_NOTE = '편집을 끝내야 보낼 수 있습니다'
export const PRODUCT_TABS = [
  { key: 'all', label: '전체' },
  { key: 'draft', label: '작성 중' },
  { key: 'ready', label: '보내기 전' },
  { key: 'live', label: '판매처에 올라감' },
  { key: 'check', label: '확인 필요', alert: true },
]
export const LIVE_ON_STATUSES = ['registered', 'approved'] // "판매처에 올라감" — 실제로 판매처에 걸린 상태
export const CHECK_STATUSES = ['failed', 'rejected', 'approval_pending'] // "확인 필요" — 실패·반려·승인 대기
export const ACTION = {
  edit: '이어서 편집',
  send: '판매처로 보내기',
  update: '변경사항 전송',
  fix: '수정 후 재전송',
}

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const time = v => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0 }
const rank = key => { const i = MARKETS.findIndex(m => m.key === key); return i < 0 ? MARKETS.length : i }

export const NO_NAME = '이름 없는 상품'
/**
 * 화면에 보일 상품 이름 하나 (2026-10-02 ②-1) — 후보 중 처음 나오는 한국어 이름. 중국어(번역 안 된 한자)가 든 후보는 건너뛴다. 없으면 '이름 없는 상품'
 *   화면 표시용이다 — 판매처 상품명 입력칸에는 넣지 않는다(보내기 창 상품명은 빈칸 시작)
 */
export function koreanDisplayName(cands) {
  for (const c of Array.isArray(cands) ? cands : []) { const t = clean(c); if (t && !hasUntranslated(t)) return t }
  return NO_NAME
}
/**
 * 상품 이름 하나 — 화면마다 같은 이름 ([내 상품] 목록·여러 상품 보내기 목록·보내기 창 제목·편집기 위쪽)
 * 셀러가 붙인 작업 이름(studio_projects.title) → 1688 제목 한글(titleKo — 번역 캐시, 서버 exports_list titlesKo) → '이름 없는 상품'
 *   1688 원래 제목(title_zh)·결과물 이름(studio_exports.title — 저장할 때의 작업 이름이라 중국어일 수 있다)은 보이지 않는다(2026-10-02 ②-1 — 중국어 원문 표시 안 함).
 *   작업 이름이라도 중국어가 들어 있으면(예: 1688 상품 복사본 "原标题 복사본") 건너뛴다
 */
export function productName(project, ex = null, titleKo = '') {
  return koreanDisplayName([project?.title, titleKo])
}
/** 출처 — DB에는 1688 상품(source_type '1688')과 내 사진('upload')만 있다(찜·주문·주소 붙여넣기는 구분이 저장되지 않음) */
export const sourceLabelOf = project => (project?.source_type === 'upload' ? '내 사진' : '1688 상품')

/** 마지막으로 판매처에 보낸 시각 (서버 publicSend.sentAt — 없으면 기록을 만든 때) */
export const sentAtOf = s => Math.max(time(s?.sentAt), time(s?.createdAt))
const isLive = s => !!s && LIVE_SEND_STATUSES.includes(s.status) && !s.accountMismatch

/** 판매처마다 기록 1건 — 살아 있는 상품(다른 계정 아님) 중 가장 최근, 없으면 가장 최근 기록 (보낸 상품 칩 groupSentProducts와 같은 규칙) */
export function byMarketOf(history) {
  const list = [...(Array.isArray(history) ? history : [])].sort((a, b) => time(b.createdAt) - time(a.createdAt))
  const out = {}
  for (const s of list) if (isLive(s) && !out[s.market]) out[s.market] = s
  for (const s of list) if (!out[s.market]) out[s.market] = s
  return out
}

/**
 * 만들기 상태
 * @param {{ createdAt }|null} ex 작업의 지금 결과물
 * @param {{ [market]: send }} byMarket
 * @param {string|null} savedAt [작업 저장]을 누른 시각 (studio_projects.last_exported_at — 2026-10-02부터 [작업 저장]은 작업 내용만 저장하고 이 시각을 남긴다)
 *   결과물도 저장 시각도 없으면 작성 중. "저장한 때" = 저장 시각(없으면 예전처럼 결과물 시각)
 */
export function productStage(ex, byMarket, savedAt = null) {
  if (!ex && !savedAt) return 'draft'
  const recs = Object.values(byMarket || {})
  if (!recs.length) return 'ready'
  const saved = savedAt ? time(savedAt) : time(ex.createdAt)
  if (recs.some(s => isLive(s) && sentAtOf(s) < saved)) return 'changed'
  return 'sent'
}

/**
 * 작업·결과물·전송 → 목록 줄
 * @param {{ projects:object[], exports:object[], sends:object[], titlesKo?:object }} o  titlesKo = 작업 id → 1688 제목 한글 (exports_list perProject)
 *   projects = studio_projects 줄(listMyProjects) · exports = exports_list perProject 응답 items(작업마다 하나 + exportIds) · sends = sends_list(visibleSends 뒤)
 * @returns {object[]}  { id, project, export, exportId, name, source, history, byMarket, stage, live, needsCheck, updatedAt }
 */
export function buildProducts({ projects = [], exports = [], sends = [], titlesKo = {} } = {}) {
  const exOf = new Map()
  const projectOfExport = new Map()
  for (const x of Array.isArray(exports) ? exports : []) {
    if (!x?.projectId) continue
    exOf.set(x.projectId, x)
    for (const id of Array.isArray(x.exportIds) && x.exportIds.length ? x.exportIds : [x.id]) projectOfExport.set(id, x.projectId)
  }
  const sendsOf = new Map()
  for (const raw of Array.isArray(sends) ? sends : []) {
    const market = raw?.market || 'coupang'
    if (!raw?.id || OFF_MARKETS.includes(market)) continue
    const pid = projectOfExport.get(raw.exportId)
    if (!pid) continue
    if (!sendsOf.has(pid)) sendsOf.set(pid, [])
    sendsOf.get(pid).push({ ...raw, market })
  }
  return (Array.isArray(projects) ? projects : []).map(p => {
    const ex = exOf.get(p.id) || null
    const history = (sendsOf.get(p.id) || []).sort((a, b) => time(b.createdAt) - time(a.createdAt))
    const byMarket = byMarketOf(history)
    const stage = productStage(ex, byMarket, p.last_exported_at || null)
    const recs = Object.values(byMarket)
    return {
      id: p.id, project: p, export: ex, exportId: ex?.id || null, name: productName(p, ex, titlesKo?.[p.id]), source: sourceLabelOf(p),
      history, byMarket, stage,
      live: recs.some(s => LIVE_ON_STATUSES.includes(s.status)),
      needsCheck: stage === 'changed' || recs.some(s => CHECK_STATUSES.includes(s.status)),
      updatedAt: p.updated_at || p.created_at || null,
    }
  })
}

/** 탭 거르기 */
export function inTab(row, tab) {
  if (!tab || tab === 'all') return true
  if (tab === 'draft' || tab === 'ready') return row.stage === tab
  if (tab === 'live') return row.live
  if (tab === 'check') return row.needsCheck
  return true
}
/** 탭마다 개수 */
export const tabCounts = rows => Object.fromEntries(PRODUCT_TABS.map(t => [t.key, (Array.isArray(rows) ? rows : []).filter(r => inTab(r, t.key)).length]))

/** 실패·반려인 판매처별 최근 기록 (판매처 목록 순서) */
export const failedOf = row => Object.values(row?.byMarket || {}).filter(s => s.status === 'failed' || s.status === 'rejected').sort((a, b) => rank(a.market) - rank(b.market))

/**
 * 할 일 버튼 하나
 * @returns {{ key:'edit'|'fix'|'update'|'send', label, send?:object, how?:'resend'|'send' }}
 *   fix = 실패·반려가 있음 — how 'resend'(쿠팡 반려 + 쿠팡 상품번호 → 그 상품을 고쳐 다시 승인 요청) | 'send'(그 판매처만 체크한 보내기 창)
 */
export function rowAction(row) {
  if (!row || row.stage === 'draft') return { key: 'edit', label: ACTION.edit }
  for (const s of failedOf(row)) {
    const how = fixAction({ exportId: row.exportId, byMarket: row.byMarket }, s)
    if (how) return { key: 'fix', label: ACTION.fix, send: s, how }
  }
  if (row.stage === 'changed') return { key: 'update', label: ACTION.update }
  return { key: 'send', label: ACTION.send }
}

/** 보내기에 고를 수 있는지 — 작성 중은 안 됨. 결과물(상세 이미지)이 아직 없어도 [작업 저장]을 했으면 보낼 때 만든다(exportId 없이 작업 id로) */
export const canPick = row => !!row && row.stage !== 'draft'
/** 고른 상품 요약 — "새로 보내기 a · 변경사항 전송 b" (변경사항 미전송 = b, 그 밖 = a) */
export function pickSummary(rows) {
  const list = (Array.isArray(rows) ? rows : []).filter(canPick)
  const update = list.filter(r => r.stage === 'changed').length
  return { total: list.length, fresh: list.length - update, update }
}
