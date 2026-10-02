// 원클릭 1단계 글자 초안용 상품 사실 테스트 — node scripts/test-studio-facts.mjs
// _studioFacts(제목·속성·옵션 뽑기) + api/studio-upload.js product_facts를 handler 그대로 부르고 Supabase는 가짜 fetch로 흉내 낸다.
// 확인: 번역 캐시에 있는 한국어만 붙음 · 외부 호출 없음(OneBound·파파고·fal 주소가 오면 가짜 fetch가 실패시킴) · 남의 작업 404 · 1688 아닌 작업 · 스냅샷 없음
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.TRANSLATION_CACHE_ENABLED = 'true'

import { extractFacts, factTexts, withKo } from '../api/_studioFacts.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(56)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

const ITEM = {
  title: '三层滑动鸡蛋收纳盒',
  props: [{ name: '材质', value: 'PP' }, { name: '材质', value: 'PP' }, { name: '品牌', value: '' }, { name: '风格', value: '简约' }],
  props_list: { '0:0': '颜色:白色', '0:1': '颜色:灰色', '1:0': '尺码:S', '0:0x': '颜色:白色', bad: '콜론없음' },
}

// ── 1. 뽑기 (순수) ──
const f = extractFacts(ITEM)
eq('제목', f.title, '三层滑动鸡蛋收纳盒')
eq('속성: 빈 값·중복 뺌', f.attrs, [{ name: '材质', value: 'PP' }, { name: '风格', value: '简约' }])
eq('옵션: 첫 ":" 기준 · 같은 pid끼리 · 값 중복 뺌', f.options, [{ name: '颜色', values: ['白色', '灰色'] }, { name: '尺码', values: ['S'] }])
eq('캐시에서 찾을 원문 (중복 없음)', factTexts(f).length, 10)
const ko = new Map([['三层滑动鸡蛋收纳盒', '3단 슬라이드 계란 보관함'], ['材质', '재질'], ['颜色', '색상'], ['白色', '화이트'], ['尺码', '尺码']])
const k = withKo(f, ko)
eq('한국어: 캐시에 있는 것만 · 원문과 같으면 null', [k.title.ko, k.attrs[0].name.ko, k.attrs[0].value.ko, k.options[0].values.map(v => v.ko), k.options[1].name.ko], ['3단 슬라이드 계란 보관함', '재질', null, ['화이트', null], null])
eq('item 없음 → 빈 사실', extractFacts(null), { title: '', attrs: [], options: [] })

// ── 2. 서버 product_facts ──
const UID = '11111111-1111-4111-8111-111111111111'
const PID = '22222222-2222-4222-8222-222222222222'
const PID2 = '33333333-3333-4333-8333-333333333333'
const OTHER = '44444444-4444-4444-8444-444444444444'
const projects = [
  { id: PID, user_id: UID, offer_id: '1081981728994', deleted_at: null },
  { id: PID2, user_id: UID, offer_id: null, deleted_at: null },
  { id: OTHER, user_id: '99999999-9999-4999-8999-999999999999', offer_id: '1081981728994', deleted_at: null },
]
let snapshots = [{ offer_id: '1081981728994', status: 'ok', item: ITEM }]
const cache = [['三层滑动鸡蛋收纳盒', '3단 슬라이드 계란 보관함'], ['材质', '재질'], ['PP', 'PP'], ['颜色', '색상'], ['白色', '화이트'], ['灰色', '그레이']]
const seen = []
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const eqv = (q, col) => { const m = new RegExp(`[?&]${col}=eq\\.([^&]+)`).exec(q); return m ? m[1] : null }
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  if (u.host !== 'mock.local') throw new Error(`외부 호출 금지: ${u.host}`)
  const p = decodeURIComponent(u.pathname), q = decodeURIComponent(u.search)
  seen.push(p)
  if (p === '/auth/v1/user') return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'admin@test.local' }) : json({ msg: 'bad' }, 401)
  if (p === '/rest/v1/user_roles') return json([{ role: 'admin' }])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/studio_projects') return json(projects.filter(r => r.id === eqv(q, 'id') && r.user_id === eqv(q, 'user_id') && r.deleted_at === null))
  if (p === '/rest/v1/studio_product_snapshots') {
    eq('스냅샷: raw 전체가 아니라 item만 읽음', q.includes('item:raw->item'), true)
    return json(snapshots.filter(s => s.offer_id === eqv(q, 'offer_id')))
  }
  if (p === '/rest/v1/translation_cache') {
    const list = /source_text=in\.\((.*)\)/.exec(q)[1]
    return json(cache.filter(([s]) => list.includes(`"${s}"`)).map(([source_text, translated_text]) => ({ source_text, translated_text })))
  }
  throw new Error(`가짜 fetch에 없는 요청: ${opts.method || 'GET'} ${p}${q}`)
}
const { default: handler } = await import('../api/studio-upload.js')
async function call(body, token = 'good-token') {
  const res = { code: 0, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
  await handler({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body }, res)
  return res
}

{
  const r = await call({ action: 'product_facts', projectId: PID })
  const fx = r.body.facts
  eq('성공 200 · 원문 수 · 한국어 수', [r.code, r.body.texts, r.body.translated], [200, 10, 6])
  eq('제목·옵션 한국어', [fx.title.ko, fx.options[0].name.ko, fx.options[0].values.map(v => v.ko), fx.options[1].values[0].ko], ['3단 슬라이드 계란 보관함', '색상', ['화이트', '그레이'], null])
  eq('외부 호출 없음 (Supabase REST·인증만)', [...new Set(seen)].every(x => x.startsWith('/rest/v1/') || x === '/auth/v1/user'), true)
}
eq('남의 작업 → 404', (await call({ action: 'product_facts', projectId: OTHER })).code, 404)
eq('없는 작업 → 404', (await call({ action: 'product_facts', projectId: 'nope' })).code, 404)
eq('1688 아닌 작업(내 사진만) → facts null · no_offer', (await call({ action: 'product_facts', projectId: PID2 })).body, { facts: null, reason: 'no_offer', texts: 0, translated: 0 })
snapshots = []
eq('스냅샷 없음 → facts null · no_snapshot', (await call({ action: 'product_facts', projectId: PID })).body.reason, 'no_snapshot')
snapshots = [{ offer_id: '1081981728994', status: 'error', item: null }]
eq('스냅샷이 오류 → no_snapshot', (await call({ action: 'product_facts', projectId: PID })).body.reason, 'no_snapshot')
eq('로그인 없음 → 401', (await call({ action: 'product_facts', projectId: PID }, 'bad')).code, 401)

// ── title_ko (2026-10-02 ②-1) — 편집기 위쪽 상품 이름용 1688 제목 한글 (번역 캐시만) ──
projects[0].title_zh = '三层滑动鸡蛋收纳盒'
projects[1].title_zh = '没有翻译的标题'
{
  seen.length = 0
  const r = await call({ action: 'title_ko', projectId: PID })
  eq('title_ko: 작업의 title_zh → 번역 캐시 한국어 · 외부 호출 없음', [r.code, r.body, [...new Set(seen)].every(x => x.startsWith('/rest/v1/') || x === '/auth/v1/user')], [200, { titleKo: '3단 슬라이드 계란 보관함' }, true])
}
eq('title_ko: 캐시에 없으면 빈 글자(중국어를 돌려주지 않음) · 남의 작업 404 · 로그인 없음 401', [
  (await call({ action: 'title_ko', projectId: PID2 })).body, (await call({ action: 'title_ko', projectId: OTHER })).code, (await call({ action: 'title_ko', projectId: PID }, 'bad')).code,
], [{ titleKo: '' }, 404, 401])

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
