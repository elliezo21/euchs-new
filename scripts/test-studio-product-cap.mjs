// 1688 상품 가져오기 1인 하루 상한(2026-09-28) 테스트 — node scripts/test-studio-product-cap.mjs
// api/studio-product.js handler 그대로 + 가짜 fetch(인증·주문·studio_usage·DB 함수·OneBound). 시크릿·운영 DB·로그인 토큰 안 씀.
// 확인: 29·30번째 허용 / 31번째 거절 / 동시 요청 / 한국 자정 초기화 / 관리자·스태프 무제한 / 전체 하루 상한 같은 문구 / 몰 경로는 안 셈
process.env.STUDIO_ENABLED = 'all'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.ONEBOUND_KEY = 'fake-key'
process.env.ONEBOUND_SECRET = 'fake-secret'

import fs from 'node:fs'
import { kstDayStartIso } from '../api/_studioBg.js'
import { productUserDailyCap, overBefore, overAfter, DEFAULT_USER_DAILY_CAP, RETRY_LATER } from '../api/_studioProductCap.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

// ── 순수 함수 ──
eq('기본 상한 30 · 환경변수로 바꿈 · 이상한 값은 기본', [productUserDailyCap({}), productUserDailyCap({ STUDIO_ONEBOUND_USER_DAILY_CAP: '5' }), productUserDailyCap({ STUDIO_ONEBOUND_USER_DAILY_CAP: 'x' })], [30, 5, 30])
eq('예약 전: 29번 썼으면 통과 · 30번 썼으면 막음', [overBefore(29, 30), overBefore(30, 30)], [false, true])
eq('예약 뒤: 내 것까지 30이면 통과 · 31이면 막음', [overAfter(30, 30), overAfter(31, 30)], [false, true])
eq('문구에 한도·횟수·소진 없음', /한도|횟수|소진/.test(RETRY_LATER), false)

// ── 가짜 Supabase + OneBound ──
const BUYER = '22222222-2222-4222-8222-222222222222'
const STAFF = '11111111-1111-4111-8111-111111111111'
const TOKENS = { 'tok-buyer': BUYER, 'tok-staff': STAFF }
let usage, nextId, oneboundCalls, entitlementQueries
const GLOBAL_CAP = 100
function reset(rows = []) { usage = rows.map((r, i) => ({ id: i + 1, kind: 'onebound_item_get', status: 'ok', ...r })); nextId = usage.length + 1; oneboundCalls = 0; entitlementQueries = 0 }
const dayStart = new Date(kstDayStartIso())
const today = () => new Date(dayStart.getTime() + 60 * 1000).toISOString()
const yesterday = () => new Date(dayStart.getTime() - 60 * 1000).toISOString()
const fill = (userId, n, at = today) => Array.from({ length: n }, () => ({ user_id: userId, created_at: at() }))

const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const val = (q, col, op) => { const m = new RegExp(`[?&]${col}=${op}\\.([^&]+)`).exec(q); return m ? m[1] : null }
const tick = () => new Promise(r => setTimeout(r, 0))

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname)
  const q = decodeURIComponent(u.search)
  const method = opts.method || 'GET'
  const body = opts.body ? JSON.parse(opts.body) : null
  await tick() // 동시 요청이 서로 끼어들게
  if (u.hostname === 'api-gw.onebound.cn') { oneboundCalls++; return json({ error: 'item-not-found', error_code: '2000', item: { _ddf: 'x' } }) }
  if (p === '/auth/v1/user') {
    const id = TOKENS[String(opts.headers.Authorization || '').replace('Bearer ', '')]
    return id ? json({ id, email: `${id.slice(0, 4)}@test.local` }) : json({ msg: 'bad' }, 401)
  }
  if (p === '/rest/v1/user_roles') return json(q.includes(STAFF) ? [{ role: 'staff' }] : [])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/orders') return json(q.includes(BUYER) ? [{ id: 'o1' }] : [])
  if (p === '/rest/v1/studio_entitlements') { entitlementQueries++; return json([]) }
  if (p === '/rest/v1/studio_product_snapshots') return method === 'GET' ? json([]) : new Response(null, { status: 201 })
  if (p === '/rest/v1/rpc/studio_try_reserve_onebound') {
    const dayMs = Date.parse(kstDayStartIso())
    const globalToday = usage.filter(r => Date.parse(r.created_at) >= dayMs).length
    if (globalToday >= body.p_global_cap) return json([{ reservation_id: null, reason: 'global_limit' }])
    if (body.p_skip_user_cap !== true) return json([{ reservation_id: null, reason: 'no_entitlement' }]) // 운영 함수: 이용권 행 0개
    const row = { id: nextId++, user_id: body.p_user, kind: 'onebound_item_get', status: 'reserved', created_at: new Date().toISOString() }
    usage.push(row)
    return json([{ reservation_id: row.id, reason: 'ok' }])
  }
  if (p === '/rest/v1/studio_usage') {
    if (method === 'GET') {
      const sinceMs = Date.parse(val(q, 'created_at', 'gte')), upTo = val(q, 'id', 'lte') // 시각은 값으로 비교 (PostgREST와 같게)
      const rows = usage.filter(r => r.user_id === val(q, 'user_id', 'eq') && r.kind === val(q, 'kind', 'eq') && Date.parse(r.created_at) >= sinceMs && (upTo === null || r.id <= Number(upTo)))
        .sort((a, b) => a.id - b.id).slice(0, Number(/limit=(\d+)/.exec(q)[1]))
      return json(rows.map(r => ({ id: r.id })))
    }
    if (method === 'DELETE') { const id = Number(val(q, 'id', 'eq')); usage = usage.filter(r => !(r.id === id && r.status === 'reserved')); return new Response(null, { status: 204 }) }
    if (method === 'PATCH') { const id = Number(val(q, 'id', 'eq')); for (const r of usage) if (r.id === id && r.status === 'reserved') Object.assign(r, body); return new Response(null, { status: 204 }) }
  }
  throw new Error(`가짜 fetch에 없는 요청: ${method} ${u.hostname}${p}${q}`)
}

const { default: handler } = await import('../api/studio-product.js')
const quiet = async fn => { const e = console.error, w = console.warn, l = console.log, i = console.info; console.error = console.warn = console.log = console.info = () => {}; try { return await fn() } finally { console.error = e; console.warn = w; console.log = l; console.info = i } }
async function fetchProduct(token = 'tok-buyer', offerId = '1081981728994') {
  const res = { code: 0, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
  await quiet(() => handler({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { offerId, forceRefresh: true } }, res))
  return res
}
const passed = r => r.code === 404 // 가짜 OneBound = 없는 상품 → 예약·호출까지 간 것 = 허용

// 29·30번째 허용, 31번째 거절
reset(fill(BUYER, 28))
const r29 = await fetchProduct()
const r30 = await fetchProduct()
eq('오늘 28번 쓴 뒤 → 29번째·30번째 허용 (OneBound 2번)', [passed(r29), passed(r30), oneboundCalls], [true, true, 2])
const r31 = await fetchProduct()
eq('31번째 → 429 user_limit · OneBound 안 부름', [r31.code, r31.body.code, oneboundCalls], [429, 'user_limit', 2])
eq('31번째 문구 = "잠시 후 다시 시도해 주세요."', r31.body.message, '잠시 후 다시 시도해 주세요.')
eq('막힌 요청은 기록을 남기지 않음 (오늘 30행)', usage.filter(r => r.user_id === BUYER).length, 30)
eq('이용권 행을 묻지 않음 (이용권과 관계없이 30)', entitlementQueries, 0)

// 동시 요청 — 29번 쓴 상태에서 3개를 한꺼번에 → 정확히 1개만
reset(fill(BUYER, 29))
const burst = await Promise.all([fetchProduct(), fetchProduct(), fetchProduct()])
eq('29번 쓴 뒤 동시 3번 → 1번만 허용 · 나머지 429 · 기록 30행', [burst.filter(passed).length, burst.filter(r => r.code === 429).length, usage.filter(r => r.user_id === BUYER).length, oneboundCalls], [1, 2, 30, 1])

// 한국 자정 초기화
reset(fill(BUYER, 30, yesterday))
eq('어제(한국 시간) 30번 → 오늘 첫 요청 허용', passed(await fetchProduct()), true)

// 관리자·스태프 무제한
reset(fill(STAFF, 40))
eq('스태프: 오늘 40번 써도 허용', passed(await fetchProduct('tok-staff')), true)

// 전체 하루 상한 — 같은 문구
reset([...fill(STAFF, GLOBAL_CAP - 1), ...fill(BUYER, 1)])
const g = await fetchProduct()
eq(`전체 하루 ${GLOBAL_CAP}회 → 429 global_limit · 같은 문구`, [g.code, g.body.code, g.body.message], [429, 'global_limit', '잠시 후 다시 시도해 주세요.'])
const gs = await fetchProduct('tok-staff')
eq('전체 상한은 스태프도 같음', [gs.code, gs.body.code], [429, 'global_limit'])

// 화면 문구 한 곳 — 1인·전체 같은 문장, 한도·횟수 말 없음
{
  const api = fs.readFileSync(new URL('../src/lib/studioApi.js', import.meta.url), 'utf8')
  const product = /const PRODUCT = \{([\s\S]*?)\n\}/.exec(api)[1]
  const line = k => new RegExp(`\\b${k}: '([^']*)'`).exec(product)?.[1]
  eq('화면: user_limit·global_limit·daily_limit 문구 같음', [line('user_limit'), line('global_limit'), line('daily_limit')], [RETRY_LATER, RETRY_LATER, RETRY_LATER])
  eq('서버 기본 상한 = 30', DEFAULT_USER_DAILY_CAP, 30)
}

// 몰 경로는 세지 않음 — 몰 1688 조회 API는 studio_usage·스튜디오 예약을 쓰지 않는다
{
  const mallApis = ['api/1688-item-detail.js', 'api/bulk-item-detail.js'].filter(f => fs.existsSync(new URL(`../${f}`, import.meta.url)))
  const hits = mallApis.filter(f => /studio_usage|studio_try_reserve|_studioProductCap/.test(fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')))
  eq(`몰 1688 조회 API(${mallApis.length}개)는 스튜디오 카운터를 안 씀`, hits, [])
  const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
  eq('로컬 몰 프록시(vite.config)도 스튜디오 카운터를 안 씀', /studio_usage|studio_try_reserve|_studioProductCap/.test(vite), false)
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
process.exit(fail ? 1 : 0)
