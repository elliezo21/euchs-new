/**
 * 여러 상품 한 번에 보내기 (2026-10-02) — 순수 함수 (scripts/test-studio-bulk-send.mjs가 그대로 부른다 · import는 상대 경로)
 *
 * [흐름] [내 상품]에서 여러 개 체크 → 보내기 화면(StudioBulkSendModal)
 *   1) 보낼 판매처(연결된 곳만) + 판매처마다 카테고리 묶음(저장한 묶음 / 직접 고르기) → 적용 결과
 *   2) 공통 정보: 판매가(상품별 기존값 / 같은 비율로 올리기·내리기) · 재고(그대로 / 같은 수량) · 템플릿
 *   3) 상품마다 준비 완료 / 수정 필요 + 이유 — 이유는 판매처 섹션의 빠짐 목록 그대로(예전 보내기 창과 같은 검사)
 *   4) [준비된 x개만 보내기] — 판매처 순서대로 한 건씩(동시에 보내지 않음) + 판매처마다 다음 건까지 쉬는 시간
 *   5) 결과: 상품 × 판매처 한 줄씩
 * [이미 판매처에 있는 상품] 각 판매처 섹션의 submit()이 예전과 같은 서버 길을 탄다 → 서버가 "수정"으로 보낸다(새로 등록하지 않음 — api/_marketUpdate.js)
 * [금액] 비율 조정만 반올림한다(10원 단위 — 11번가 10원 단위 규칙과 쿠팡 가격 변경 10원 단위 검사를 함께 통과하는 값). 기존값이 없으면 null(수정 필요 — 임의 숫자 없음)
 */
import { MARKETS } from './studioMarketplaceRules.js'

export const BULK_MAX = 30 // 한 번에 보낼 상품 수 — 상품마다 판매처 섹션을 하나씩 띄우므로 화면이 버틸 수 있는 수
/**
 * 판매처마다 다음 건까지 쉬는 시간(ms) — 한 건을 보낼 때 서버가 판매처를 여러 번 부른다(카테고리 메타·이미지·등록·조회).
 * 쿠팡 초당 5회 · 네이버(스마트스토어) 초당 2회(해성 확인) 안에 들도록 건 사이를 띄운다. 모르는 판매처는 기본값
 */
export const BULK_GAP_MS = { coupang: 1000, smartstore: 1500, '11st': 1000, zigzag: 1000 }
export const BULK_GAP_DEFAULT_MS = 1500
export const gapOf = market => BULK_GAP_MS[market] ?? BULK_GAP_DEFAULT_MS

export const PRICE_MODES = [{ key: 'keep', label: '상품별 기존값 그대로' }, { key: 'rate', label: '같은 비율로 올리기·내리기' }]
export const STOCK_MODES = [{ key: 'keep', label: '그대로' }, { key: 'same', label: '같은 수량' }]
export const BUNDLE_DIRECT = '' // 카테고리 묶음 선택 "직접 고르기"
export const RATE_MIN = -90
export const RATE_MAX = 300

const time = v => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0 }
const int = v => (Number.isInteger(v) ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : null)

/**
 * 판매가 — keep = 기존값 그대로 · rate = 기존값 × (1 + rate/100)을 10원 단위로 반올림
 * @param {number|null} base 이 상품의 기존 판매가 (send_prepare.previous — 없으면 null)
 * @returns {number|null}  null = 정할 수 없음(수정 필요)
 */
export function bulkPrice(base, mode = 'keep', rate = 0) {
  const b = int(base)
  if (!(b > 0)) return null
  if (mode !== 'rate') return b
  const r = Number(rate)
  if (!Number.isFinite(r) || r < RATE_MIN || r > RATE_MAX) return null
  const v = Math.round((b * (100 + r)) / 1000) * 10
  return v > 0 ? v : null
}
/** 재고 — keep = 기존값(없으면 null) · same = n */
export function bulkStock(prev, mode = 'keep', n = null) {
  if (mode === 'same') return Number.isInteger(n) && n >= 0 ? n : null
  const p = int(prev)
  return p !== null && p >= 0 ? p : null
}

/**
 * 이 상품의 기존값 — 판매처로 보낸 기록에서 (서버 send_prepare.previous = { [market]: { price, stock, category:{ id, name }, at } })
 * 가장 최근에 보낸 판매처의 값
 */
export function latestPrevious(previous) {
  const list = Object.entries(previous || {}).filter(([, v]) => v && typeof v === 'object').sort((a, b) => time(b[1].at) - time(a[1].at))
  const withPrice = list.find(([, v]) => int(v.price) > 0)
  const withStock = list.find(([, v]) => int(v.stock) !== null)
  return { price: withPrice ? int(withPrice[1].price) : null, stock: withStock ? int(withStock[1].stock) : null }
}

/**
 * 공통 정보에 일괄 값 넣기 — 상품 하나의 common(commonFromPrepare 모양)을 고친다
 * @param {object} common @param {{ price:number|null, stock:number|null, stockMode:'keep'|'same' }} v
 */
export function applyBulkCommon(common, { price = null, stock = null, stockMode = 'keep' } = {}) {
  common.price = price
  if (stockMode === 'same' || !common.opts?.enabled) common.stock = stock
  if (stockMode === 'same' && common.opts?.enabled) for (const r of common.opts.rows || []) r.stock = stock
  return common
}

/** 카테고리 목록에서 id로 찾기 (판매처마다 id가 숫자·글자로 섞여 온다 — 글자로 비교) */
export const matchCategory = (list, id) => (id == null || id === '' ? null : (Array.isArray(list) ? list : []).find(c => String(c?.id) === String(id)) || null)

/**
 * 판매처 하나의 카테고리 — 묶음을 골랐으면 묶음, 아니면(직접 고르기) 이 상품을 그 판매처에 보낼 때 썼던 카테고리
 * @returns {{ id, name, from:'bundle'|'previous' } | null}  null = 직접 골라야 함
 */
export function categoryFor(market, previous, bundle) {
  if (bundle?.categoryId) return { id: String(bundle.categoryId), name: bundle.categoryName || '', from: 'bundle' }
  const c = previous?.[market]?.category
  return c?.id ? { id: String(c.id), name: c.name || '', from: 'previous' } : null
}
/**
 * 판매처 줄의 적용 결과 — "3개 모두 적용" / "1개 직접 골라야 함"
 * @param {object[]} products [{ previous }] · @param {object|null} bundle
 */
export function applySummary(market, products, bundle) {
  const list = Array.isArray(products) ? products : []
  const manual = list.filter(p => !categoryFor(market, p.previous, bundle)).length
  return { applied: list.length - manual, manual, text: manual ? `${manual}개 직접 골라야 함` : `${list.length}개 모두 적용` }
}

/**
 * 상품 하나의 준비 판정 — 체크한 판매처 섹션의 빠짐 목록을 모은다 (판매처 이름을 앞에)
 * @param {{ [market]: string[] }} missingByMarket 섹션 missing (섹션이 아직 없으면 null)
 * @param {string[]} markets 체크한 판매처
 * @returns {{ ready:boolean, reasons:string[] }}
 */
export function readiness(missingByMarket, markets) {
  const name = key => MARKETS.find(m => m.key === key)?.name || key
  const reasons = []
  for (const m of Array.isArray(markets) ? markets : []) {
    const list = missingByMarket?.[m]
    if (!Array.isArray(list)) { reasons.push(`${name(m)} · 불러오는 중`); continue }
    for (const x of list) reasons.push(`${name(m)} · ${x}`)
  }
  return { ready: reasons.length === 0 && (markets || []).length > 0, reasons }
}

/**
 * 보낼 일 목록 — 준비된 상품 × 체크한 판매처, 판매처 순서(MARKETS)대로 묶는다(한 판매처를 끝내고 다음 판매처)
 * 이미 보낸 줄(done)은 빼고, 판매처에 이미 있는 상품이면 kind 'update'(서버가 수정으로 보냄)
 * @param {[{ id, ready, existing:{ [market]:{ mode } } }]} products @param {string[]} markets @param {Set<string>} done 'productId:market'
 */
export function planJobs(products, markets, done = new Set()) {
  const order = MARKETS.map(m => m.key).filter(k => (markets || []).includes(k))
  const jobs = []
  for (const market of order) {
    for (const p of Array.isArray(products) ? products : []) {
      if (!p.ready || done.has(`${p.id}:${market}`)) continue
      jobs.push({ productId: p.id, market, kind: p.existing?.[market]?.mode === 'modify' ? 'update' : 'create' })
    }
  }
  return jobs
}

/**
 * 한 건씩 차례로 보낸다 — 동시에 보내지 않는다. 같은 판매처의 다음 건까지 gapOf(market)만큼 쉰다
 * @param {object[]} jobs planJobs 결과 · @param {(job)=>Promise<{ ok, id?, status?, reason?, updated? }>} run
 * @param {{ sleep?:(ms)=>Promise, onStep?:(i, job, result)=>void, stop?:()=>boolean }} o
 * @returns {Promise<object[]>} 결과 (jobs 순서) — 멈추면(stop) 남은 건은 결과 없음
 */
export async function runQueue(jobs, run, { sleep = ms => new Promise(r => setTimeout(r, ms)), onStep = () => {}, stop = () => false } = {}) {
  const out = []
  let prev = null
  for (let i = 0; i < jobs.length; i++) {
    if (stop()) break
    const job = jobs[i]
    if (prev && prev.market === job.market) await sleep(gapOf(job.market))
    let r
    try { r = await run(job) } catch (e) { r = { ok: false, reason: e?.message || String(e) } }
    out.push({ ...job, ...r })
    onStep(i, job, r)
    prev = job
  }
  return out
}

/** 아래 막대 글자 — "판매처 N곳 × 상품 M개 · 준비 완료 x · 수정 필요 y" */
export const barText = ({ markets = 0, products = 0, ready = 0, fix = 0 } = {}) => `판매처 ${markets}곳 × 상품 ${products}개 · 준비 완료 ${ready} · 수정 필요 ${fix}`
export const sendReadyLabel = n => `준비된 ${n}개만 보내기`

// ── 카테고리 묶음 (studio_category_bundles — 판매처마다 이름 붙인 카테고리) ──
export const BUNDLE_NAME_MAX = 40
export const BUNDLES_MAX = 200
export const BUNDLE_MARKETS = ['coupang', 'smartstore', '11st', 'zigzag'] // 카테고리를 고르는 판매처 (SQL check와 같은 목록)
/** 묶음 이름 검사 → { ok, name } | { ok:false, message } — 같은 판매처 안에서 이름이 겹치지 않게 */
export function checkBundleName(name, bundles, market) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim()
  if (!n) return { ok: false, message: '묶음 이름을 입력하세요.' }
  if (n.length > BUNDLE_NAME_MAX) return { ok: false, message: `묶음 이름은 ${BUNDLE_NAME_MAX}자까지입니다.` }
  const list = (Array.isArray(bundles) ? bundles : []).filter(b => b.market === market)
  if (list.some(b => b.name.replace(/\s+/g, '').toLowerCase() === n.replace(/\s+/g, '').toLowerCase())) return { ok: false, message: '같은 이름의 묶음이 있습니다.' }
  if (list.length >= BUNDLES_MAX) return { ok: false, message: `묶음은 판매처마다 ${BUNDLES_MAX}개까지 저장할 수 있습니다.` }
  return { ok: true, name: n }
}
/** 판매처의 묶음 목록 (이름순) */
export const bundlesOf = (bundles, market) => (Array.isArray(bundles) ? bundles : []).filter(b => b.market === market).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
