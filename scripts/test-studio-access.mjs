// 스튜디오 사용 자격(2026-09-28) 테스트 — node scripts/test-studio-access.mjs
// STUDIO_ENABLED=all 에서 api/_studio.js studioGuard가 관리자·스태프 또는 "결제 확인 이후" 주문 1건 이상만 통과시키는지.
// 판정은 _studioBg.isBgEligible(ORDER_OK_STATUSES) 그대로. Supabase는 가짜 fetch (시크릿·운영 DB·로그인 토큰 안 씀)
process.env.STUDIO_ENABLED = 'all'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

import fs from 'node:fs'
import { ORDER_OK_STATUSES } from '../api/_studioBg.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

const USERS = {
  'tok-staff': { id: '11111111-1111-4111-8111-111111111111', role: 'staff', orders: [], ent: false },
  'tok-buyer': { id: '22222222-2222-4222-8222-222222222222', role: null, orders: ['purchasing'], ent: false },
  'tok-beta': { id: '33333333-3333-4333-8333-333333333333', role: null, orders: ['completed'], ent: true },
  'tok-quote': { id: '44444444-4444-4444-8444-444444444444', role: null, orders: ['quote_pending', 'cancelled'], ent: true },
  'tok-none': { id: '55555555-5555-4555-8555-555555555555', role: null, orders: [], ent: false },
}
const byId = id => Object.values(USERS).find(u => u.id === id)
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const val = (q, col, op = 'eq') => { const m = new RegExp(`[?&]${col}=${op}\\.([^&]+)`).exec(q); return m ? m[1] : null }
let orderQueries = []

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname)
  const q = decodeURIComponent(u.search)
  if (p === '/auth/v1/user') {
    const t = String(opts.headers.Authorization || '').replace('Bearer ', '')
    return USERS[t] ? json({ id: USERS[t].id, email: `${t}@test.local` }) : json({ msg: 'bad' }, 401)
  }
  if (p === '/rest/v1/user_roles') {
    const m = /user_id\.eq\.([0-9a-f-]{36})/.exec(q) || /user_id=eq\.([0-9a-f-]{36})/.exec(q)
    const who = m && byId(m[1])
    return json(who?.role ? [{ role: who.role }] : [])
  }
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/orders') {
    orderQueries.push(q)
    const who = byId(val(q, 'user_id'))
    const allowed = /status=in\.\(([^)]*)\)/.exec(q)[1].split(',')
    return json((who?.orders || []).filter(s => allowed.includes(s)).map((s, i) => ({ id: `o${i}` })))
  }
  if (p === '/rest/v1/studio_entitlements') return json(byId(val(q, 'user_id'))?.ent ? [{ user_id: val(q, 'user_id') }] : [])
  throw new Error(`가짜 fetch에 없는 요청: ${opts.method || 'GET'} ${p}${q}`)
}

const { studioGuard } = await import('../api/_studio.js')
const { default: upload } = await import('../api/studio-upload.js')
const { default: ingest } = await import('../api/studio-ingest.js')
const { default: product } = await import('../api/studio-product.js')
const mkRes = () => ({ code: 200, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this }, setHeader() {} })
async function guard(token) {
  const res = mkRes()
  const ctx = await studioGuard({ method: 'POST', headers: { authorization: `Bearer ${token}` } }, res)
  return { ctx, res }
}

{
  const s = await guard('tok-staff')
  eq('스태프(주문 없음) → 통과 · 셀러 상한 건너뜀', [!!s.ctx, s.ctx?.isAdmin, s.ctx?.skipUserCap], [true, true, true])
  const b = await guard('tok-buyer')
  eq('결제 뒤 주문 고객(이용권 없음) → 통과 · 1인 하루 상한 적용', [!!b.ctx, b.ctx?.isAdmin, b.ctx?.skipUserCap], [true, false, false])
  const e = await guard('tok-beta')
  eq('주문 고객 + 이용권 행 → 통과 · 1인 하루 상한 적용(이용권과 관계없음)', [!!e.ctx, e.ctx?.skipUserCap], [true, false])
  const qn = await guard('tok-quote')
  eq('견적 요청·취소만 있는 고객(이용권 행 있어도) → 403 not_customer', [qn.ctx, qn.res.code, qn.res.body?.code], [null, 403, 'not_customer'])
  const n = await guard('tok-none')
  eq('주문 없음 → 403 + 한국어 안내', [n.res.code, n.res.body?.message], [403, '스튜디오는 EUCHS에서 주문하신 고객님께 무료로 열려 있어요.'])
  eq('주문 조회 = 결제 확인 이후 상태 목록 그대로 (ORDER_OK_STATUSES)', orderQueries.every(q => q.includes(`status=in.(${ORDER_OK_STATUSES.join(',')})`)), true)
}

// 스튜디오 API 3개 모두 같은 관문 — 화면을 건너뛰고 직접 불러도 막힌다
for (const [name, h] of [['studio-upload', upload], ['studio-ingest', ingest], ['studio-product', product]]) {
  const res = mkRes()
  await h({ method: 'POST', headers: { authorization: 'Bearer tok-none' }, body: { action: 'access' } }, res)
  eq(`${name} 직접 호출(주문 없음) → 403 not_customer`, [res.code, res.body?.code], [403, 'not_customer'])
}
{
  const res = mkRes()
  await upload({ method: 'POST', headers: { authorization: 'Bearer tok-buyer' }, body: { action: 'access' } }, res)
  eq('access(주문 고객) → 200 ok', [res.code, res.body?.ok, res.body?.staff], [200, true, false])
}

// 허용 명단 STUDIO_ALLOW_EMAILS (2026-09-30 — 카페24 앱 심사 계정). 이메일은 검증된 토큰(JWT payload)에서만 읽는다
{
  const { isAllowListed, allowEmails } = await import('../api/_studioBg.js')
  // 가짜 JWT (서명은 가짜 /auth/v1/user가 토큰 문자열로 확인) — payload의 email만 _studio.js jwtEmail이 읽는다
  const jwt = email => `h.${Buffer.from(JSON.stringify({ sub: 'x', email })).toString('base64url')}.s`
  const REVIEW = jwt('elliezo21+cafe24review@gmail.com'), REVIEW_UP = jwt('ElLieZo21+Cafe24Review@Gmail.com'), OUT = jwt('someone@test.local')
  USERS[REVIEW] = { id: '66666666-6666-4666-8666-666666666666', role: null, orders: [], ent: false }
  USERS[REVIEW_UP] = { id: '77777777-7777-4777-8777-777777777777', role: null, orders: [], ent: false }
  USERS[OUT] = { id: '88888888-8888-4888-8888-888888888888', role: null, orders: [], ent: false }
  const LIST = '  Elliezo21+Cafe24Review@gmail.com ,other@x.com,, '

  process.env.STUDIO_ALLOW_EMAILS = LIST
  eq('명단 읽기: 쉼표 구분 · 공백 정리 · 소문자 · 빈 칸·@ 없는 값 버림', [allowEmails(), allowEmails({ STUDIO_ALLOW_EMAILS: '' }), allowEmails({}), allowEmails({ STUDIO_ALLOW_EMAILS: 'not-an-email, a@b.c' })], [['elliezo21+cafe24review@gmail.com', 'other@x.com'], [], [], ['a@b.c']])
  eq('판정: 대소문자·공백 무시 · 명단 밖·빈 값·문자열 아님은 거짓', [isAllowListed('ELLIEZO21+CAFE24REVIEW@GMAIL.COM '), isAllowListed('other@x.com'), isAllowListed('someone@test.local'), isAllowListed(''), isAllowListed(null), isAllowListed({ email: 'other@x.com' })], [true, true, false, false, false, false])
  const r = await guard(REVIEW)
  eq('명단 이메일(주문 없음·일반 role) → 통과 · 관리자 혜택 없음(isAdmin·skipUserCap false)', [!!r.ctx, r.ctx?.isAdmin, r.ctx?.skipUserCap, r.ctx?.email], [true, false, false, 'elliezo21+cafe24review@gmail.com'])
  const ru = await guard(REVIEW_UP)
  eq('토큰 이메일 대소문자가 달라도 통과', [!!ru.ctx, ru.ctx?.isAdmin], [true, false])
  const o = await guard(OUT)
  eq('명단 밖 일반 사용자(주문 없음) → 403 not_customer 그대로', [o.ctx, o.res.code, o.res.body?.code], [null, 403, 'not_customer'])
  {
    const res = mkRes()
    await upload({ method: 'POST', headers: { authorization: `Bearer ${OUT}` }, body: { action: 'access', email: 'elliezo21+cafe24review@gmail.com' }, query: { email: 'elliezo21+cafe24review@gmail.com' } }, res)
    eq('요청 본문·쿼리에 명단 이메일을 넣어도 무시 → 403', [res.code, res.body?.code], [403, 'not_customer'])
  }
  {
    const res = mkRes()
    await upload({ method: 'POST', headers: { authorization: `Bearer ${REVIEW}` }, body: { action: 'access' } }, res)
    eq('access(명단 이메일) → 200 ok · staff false', [res.code, res.body?.ok, res.body?.staff], [200, true, false])
  }
  process.env.STUDIO_ALLOW_EMAILS = ''
  const e1 = await guard(REVIEW)
  eq('빈 변수 → 기존 동작 그대로(주문 없으면 403)', [e1.ctx, e1.res.code], [null, 403])
  delete process.env.STUDIO_ALLOW_EMAILS
  const e2 = await guard(REVIEW)
  eq('변수 없음 → 기존 동작 그대로(주문 없으면 403) · 주문 고객은 그대로 통과', [e2.ctx, e2.res.code, !!(await guard('tok-buyer')).ctx], [null, 403, true])
  // admin 모드는 명단과 상관없이 관리자·스태프만
  process.env.STUDIO_ALLOW_EMAILS = LIST
  process.env.STUDIO_ENABLED = 'admin'
  const a = await guard(REVIEW)
  eq("'admin' 모드: 명단 이메일도 403 not_admin (바뀌지 않음)", [a.ctx, a.res.code, a.res.body?.code], [null, 403, 'not_admin'])
  process.env.STUDIO_ENABLED = 'all'
  delete process.env.STUDIO_ALLOW_EMAILS
  const src = fs.readFileSync(new URL('../api/_studioBg.js', import.meta.url), 'utf8'), guardSrc = fs.readFileSync(new URL('../api/_studio.js', import.meta.url), 'utf8')
  eq('배선: 명단 판정은 isBgEligible 안 한 곳(관문·배경 지우기·AI 배경 같은 결과) · 이메일은 ctx.email(jwtEmail)만 · 요청 본문 이메일을 읽지 않음 · VITE_ 없음', [
    /if \(isAllowListed\(ctx\.email\)\) return true/.test(src), /const email = jwtEmail\(token\)/.test(guardSrc), /body\??\.email|query\??\.email/.test(guardSrc + src), /VITE_STUDIO_ALLOW/.test(guardSrc + src),
  ], [true, true, false, false])
}

// 화면 쪽: all일 때만 가드가 묻고, 안내 창 문구·몰 버튼
{
  const router = fs.readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8')
  eq('라우터: all 모드에서만 자격 확인', /STUDIO_MODE === 'all' && isStudioProtectedPath\(to\.path\)[\s\S]{0,200}checkStudioAccess/.test(router), true)
  const layout = fs.readFileSync(new URL('../src/layouts/StudioLayout.vue', import.meta.url), 'utf8')
  eq('레이아웃: 안내 창 + [이유씨 몰에서 사입하기] → /mall', [layout.includes(':open="studioNoAccessOpen"'), layout.includes('>이유씨 몰에서 사입하기</button>'), /router\.push\('\/mall'\)/.test(layout)], [true, true, true])
  const access = fs.readFileSync(new URL('../src/lib/studioAccess.js', import.meta.url), 'utf8')
  eq('안내 제목 문구', access.includes("'EUCHS에서 사입하면 스튜디오는 무료예요'"), true)

  // 누구나 구경, 작업 시작할 때만 (2026-09-30)
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const gate = read('src/lib/studioGate.js')
  eq('관문: 판정은 checkStudioAccess 그대로 (새 판정 없음 — 서버·주문 표를 직접 부르지 않음)', [/import \{ checkStudioAccess, studioNoAccessOpen \} from '@\/lib\/studioAccess'/.test(gate), /supabase|orders|callStudioApi/.test(gate.replace(/\/\*[\s\S]*?\*\//g, ''))], [true, false])
  eq('관문: 로그인 전 = 목적지 저장 + 로그인 창 · 주문 없음 = 안내 창 · 있음 = 진행', [/if \(!currentUser\.value\?\.id\) \{ askLogin\(resumePath\); return false \}/.test(gate), /sessionStorage\.setItem\(AUTH_REDIRECT_KEY, resumePath\)/.test(gate), /openLoginModal\('login'\)/.test(gate), /if \(access === 'not_customer'\) \{ studioNoAccessOpen\.value = true; return false \}/.test(gate), /if \(access === 'ok'\) return true/.test(gate)], [true, true, true, true, true])
  const PUB = ['projects', 'templates', 'channels', 'send', 'sent', 'defaults', 'connect']
  eq('누구나 보는 라우트 = 내 작업·템플릿·판매처(탭 4개) · 작업 화면(새로 만들기·편집기)·설정은 보호 그대로', [
    PUB.map(p => new RegExp(`path: '${p}',[\\s\\S]{0,140}?meta: \\{ \\.\\.\\.STUDIO_PUBLIC`).test(router)),
    ['new', 'p/:projectId', 'settings'].map(p => new RegExp(`path: '${p.replace(/[/:]/g, m => '\\' + m)}',[\\s\\S]{0,140}?meta: \\{ \\.\\.\\.STUDIO_PROTECTED`).test(router)),
  ], [PUB.map(() => true), [true, true, true]])
  // 잠금 위치 (2026-09-30 2차) — 첫 화면·메뉴에서는 잠그지 않고 작업 버튼에서만
  const home = read('src/views/studio/StudioHomeView.vue')
  eq('첫 화면 [무료로 시작하기] = 템플릿 (관문 없음)', [/function start\(\) \{\s*router\.push\(\{ name: 'studio-templates' \}\)/.test(read('src/views/studio/StudioLandingView.vue')), /studioGate|openLoginModal/.test(read('src/views/studio/StudioLandingView.vue'))], [true, false])
  eq('가드 3-2: 주소로 바로 들어온 잠금은 첫 화면이 아니라 [템플릿]으로', /if \(access === 'not_customer'\) \{[\s\S]{0,400}?else next\(\{ name: 'studio-templates' \}\)/.test(router), true)
  eq('사이드바 [새로 만들기] = 관문 뒤에 (로그인 뒤 ?start=new로 이어서)', [/data-studio-nav-new @click="startNew"/.test(read('src/layouts/StudioLayout.vue')), /if \(await studioGate\('\/studio\/projects\?start=new#start'\)\) router\.push/.test(read('src/layouts/StudioLayout.vue'))], [true, true])
  eq('내 작업: 로그인 전 개인 데이터 안 부름 · 안내 카드', [/<template v-if="loggedIn">\s*<!--[^>]*-->\s*<StudioRecentProjects/.test(home), /<StudioLoginNeeded v-else/.test(home), /if \(loggedIn\.value\) loadCollages\(\)/.test(home)], [true, true, true])
  eq('내 작업: [1688 가져오기]·[내 사진으로] = 관문 · 로그인 뒤 이어서도 관문을 한 번 더', [/if \(!\(await studioGate\(`\/studio\/projects\?start=url&url=/.test(home), /if \(!\(await studioGate\('\/studio\/projects\?start=upload#start'\)\)\) return/.test(home), /watch\(\(\) => \[route\.query\.start, currentUser\.value\?\.id\][\s\S]{0,400}?if \(!\(await studioGate\(route\.fullPath\)\)\) return/.test(home)], [true, true, true])
  eq('로그인 전 판매처 화면은 DB를 부르지 않음', [
    /if \(!loggedIn\.value\) return \/\/ 로그인 전에는 부르지 않는다/.test(read('src/views/studio/StudioChannelSendView.vue')),
    /if \(loggedIn\.value\) loadExports\(\)/.test(read('src/views/studio/StudioChannelSentView.vue')) && /<StudioSendList v-if="loggedIn"/.test(read('src/views/studio/StudioChannelSentView.vue')),
    /if \(loggedIn\.value\) load\(\)/.test(read('src/views/studio/StudioShippingView.vue')),
    /if \(!loggedIn\.value\) return \/\/ 로그인 전에는 연결 상태를 부르지 않는다/.test(read('src/views/studio/StudioMarketplaceView.vue')),
  ], [true, true, true, true])
  eq('작업 시작 버튼 = 관문 (판매처 연결·보내기)', [/await studioGate\('\/studio\/channels\/connect\?connect=1'\)/.test(read('src/views/studio/StudioMarketplaceView.vue')), /await studioGate\(`\/studio\/channels\/send\?export=/.test(read('src/views/studio/StudioChannelSendView.vue'))], [true, true])
  const lay = read('src/layouts/StudioLayout.vue')
  eq('[설정] 메뉴 숨김 (주소·라우트는 그대로)', [/const SHOW_SETTINGS_NAV = false/.test(lay), /v-if="SHOW_SETTINGS_NAV"/.test(lay), /path: 'settings',/.test(router)], [true, true, true])
  eq('스크롤: 다른 페이지 → 스튜디오 = 바로 맨 위 (뒤로가기 복원은 먼저)', [/if \(savedPosition\) \{\s*return savedPosition\s*\} else if \(enteringStudio\(to, from\)\) \{[\s\S]*?return \{ top: 0, behavior: 'instant' \}/.test(router), router.includes("const enteringStudio = (to, from) => !to.hash && isStudioPath(to.path) && !!from.name && !isStudioPath(from.path)")], [true, true])
  const header = fs.readFileSync(new URL('../src/components/Header.vue', import.meta.url), 'utf8')
  eq('메인 메뉴: all = 누구나 · admin = 관리자·스태프만', /showStudioMenu = computed\(\(\) => STUDIO_MODE === 'all' \|\| \(STUDIO_MODE === 'admin' && isAdminOrStaff\.value\)\)/.test(header), true)
  // 2026-09-28 "AI 스튜디오" 알약·메가메뉴·모바일 카드는 HeaderStudioNav.vue로 — 노출 조건은 Header.vue 두 곳 그대로
  eq('메인 메뉴: PC·모바일 둘 다 같은 조건', (header.match(/<HeaderStudioNav v-if="showStudioMenu" variant="(desktop|mobile)"/g) || []).length, 2)
  const studioNav = fs.readFileSync(new URL('../src/components/HeaderStudioNav.vue', import.meta.url), 'utf8')
  eq('메인 메뉴: 알약·[무료로 시작하기]·모바일 카드 모두 /studio', (studioNav.match(/to="\/studio"/g) || []).length, 3)
  eq('메인 메뉴: 움직임 줄이기면 도는 빛·반짝임 끔', /prefers-reduced-motion: reduce\)[\s\S]*\.hsn-ring-spin \{ animation: none; \}/.test(studioNav), true)
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
process.exit(fail ? 1 : 0)
