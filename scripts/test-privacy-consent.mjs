// 개인정보 동의 창 판정 + /api/privacy-consent 단위 테스트 — node scripts/test-privacy-consent.mjs
import fs from 'fs'
import { needsPrivacyConsent, PRIVACY_VERSION } from '../src/lib/privacyConsent.js'
import { PRIVACY_VERSION as SERVER_VERSION } from '../api/_privacyConsent.js'
import handler from '../api/privacy-consent.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}

// ── 1. 판정 ──
const uid = '11111111-2222-3333-4444-555555555555'
const base = { user: { id: uid }, profile: { id: uid, privacy_agreed_at: null }, isStaff: false, authLoading: false, path: '/mall' }
eq('동의 기록 없는 일반 회원 → 띄움', needsPrivacyConsent(base), true)
eq('동의 기록 있으면 안 띄움', needsPrivacyConsent({ ...base, profile: { id: uid, privacy_agreed_at: '2026-09-28T05:00:00Z' } }), false)
eq('관리자·스태프 제외', needsPrivacyConsent({ ...base, isStaff: true }), false)
eq('로그인 확인 중이면 안 띄움', needsPrivacyConsent({ ...base, authLoading: true }), false)
eq('로그아웃 상태 안 띄움', needsPrivacyConsent({ ...base, user: null }), false)
eq('회원 정보를 아직 못 읽었으면 안 띄움', needsPrivacyConsent({ ...base, profile: null }), false)
eq('다른 계정의 회원 정보가 남아 있으면 안 띄움', needsPrivacyConsent({ ...base, profile: { id: '99999999-2222-3333-4444-555555555555', privacy_agreed_at: null } }), false)
eq('Supabase 계정이 아닌 로컬 세션(naver_xxx) 안 띄움', needsPrivacyConsent({ ...base, user: { id: 'naver_123' }, profile: { id: 'naver_123' } }), false)
eq('/privacy 화면에서는 안 띄움(처리방침 읽기)', needsPrivacyConsent({ ...base, path: '/privacy' }), false)
eq('스튜디오 화면에서도 띄움', needsPrivacyConsent({ ...base, path: '/studio/projects' }), true)

// ── 2. 판 값: 화면·서버·가입 창이 같은 값 ──
eq('화면 판 = 서버 판', PRIVACY_VERSION, SERVER_VERSION)
{
  const login = fs.readFileSync(new URL('../src/components/LoginModal.vue', import.meta.url), 'utf8')
  eq('가입 창은 공용 PRIVACY_VERSION을 불러 씀', /import \{ PRIVACY_VERSION \} from '\.\.\/lib\/privacyConsent'/.test(login) && !/const PRIVACY_VERSION =/.test(login), true)
  const pp = fs.readFileSync(new URL('../src/views/PrivacyPolicyView.vue', import.meta.url), 'utf8')
  eq('/privacy에 [해성 확인] 표시 없음', /class="pp-check"/.test(pp), false)
}

// ── 3. API (fetch 가짜) ──
function mockRes() {
  const r = { statusCode: 0, body: null }
  r.status = (c) => { r.statusCode = c; return { json: (b) => { r.body = b } } }
  return r
}
async function run({ token = 'tok', patchRows, getRows, patchFail = false, userOk = true }) {
  const calls = []
  globalThis.fetch = async (url, opt = {}) => {
    calls.push({ url: String(url), method: opt.method || 'GET', body: opt.body ? JSON.parse(opt.body) : undefined })
    if (String(url).endsWith('/auth/v1/user')) {
      return userOk ? new Response(JSON.stringify({ id: uid }), { status: 200 }) : new Response('{}', { status: 401 })
    }
    if (opt.method === 'PATCH') {
      if (patchFail) return new Response('boom', { status: 500 })
      return new Response(JSON.stringify(patchRows), { status: 200 })
    }
    return new Response(JSON.stringify(getRows || []), { status: 200 })
  }
  process.env.SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  const res = mockRes()
  const origErr = console.error
  console.error = () => {}
  try {
    await handler({ method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: {} }, res)
  } finally {
    console.error = origErr
  }
  return { res, calls }
}

{
  const before = Date.now()
  const { res, calls } = await run({ patchRows: [{ privacy_agreed_at: '2026-09-28T05:00:00Z', privacy_version: '2026-09-28' }] })
  const patch = calls.find(c => c.method === 'PATCH')
  eq('동의 → 200 ok', [res.statusCode, res.body.ok], [200, true])
  eq('PATCH는 본인 행 + 아직 동의 안 한 행만', patch.url.includes(`profiles?id=eq.${uid}&privacy_agreed_at=is.null`), true)
  eq('기록 칸은 두 개만', Object.keys(patch.body).sort(), ['privacy_agreed_at', 'privacy_version'])
  eq('판 = 서버 상수', patch.body.privacy_version, SERVER_VERSION)
  const t = Date.parse(patch.body.privacy_agreed_at)
  eq('동의 시각 = 서버 시각(지금)', t >= before - 1000 && t <= Date.now() + 1000, true)
}
{
  const { res, calls } = await run({ patchRows: [], getRows: [{ privacy_agreed_at: '2026-01-01T00:00:00Z', privacy_version: 'old' }] })
  eq('이미 동의한 회원 → 덮지 않고 기존 값', [res.statusCode, res.body.privacy_agreed_at], [200, '2026-01-01T00:00:00Z'])
  eq('이미 동의했으면 PATCH 한 번뿐', calls.filter(c => c.method === 'PATCH').length, 1)
}
{
  const { res } = await run({ patchRows: [], getRows: [] })
  eq('회원 정보 행 없음 → 404 profile_missing', [res.statusCode, res.body.code], [404, 'profile_missing'])
}
{
  const { res, calls } = await run({ token: '', patchRows: [] })
  eq('토큰 없음 → 401, DB 호출 없음', [res.statusCode, calls.filter(c => c.url.includes('/rest/')).length], [401, 0])
}
{
  const { res, calls } = await run({ userOk: false, patchRows: [] })
  eq('잘못된 토큰 → 401, DB 호출 없음', [res.statusCode, calls.filter(c => c.url.includes('/rest/')).length], [401, 0])
}
{
  const { res } = await run({ patchFail: true })
  eq('DB 실패 → 500 internal', [res.statusCode, res.body.code], [500, 'internal'])
}
{
  const res = mockRes()
  await handler({ method: 'GET', headers: {} }, res)
  eq('GET → 405', res.statusCode, 405)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
