// 개인정보 동의 — 가입 창 [필수] 체크는 남고, 로그인 뒤 동의 창은 없음 — node scripts/test-privacy-consent.mjs
import fs from 'fs'
import * as P from '../src/lib/privacyConsent.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const exists = p => fs.existsSync(new URL(`../${p}`, import.meta.url))

// ── 1. 남긴 것: 가입 창 [필수] 체크 · /privacy · 푸터 링크 · 탈퇴 ──
{
  const login = read('src/components/LoginModal.vue')
  eq('처리방침 판 값', /^\d{4}-\d{2}-\d{2}$/.test(P.PRIVACY_VERSION), true)
  eq('가입 창은 공용 PRIVACY_VERSION을 불러 씀', /import \{ PRIVACY_VERSION \} from '\.\.\/lib\/privacyConsent'/.test(login) && !/const PRIVACY_VERSION =/.test(login), true)
  eq('가입 창: [필수] 동의 칸(privacy_agreed)이 있음', /privacy_agreed: false/.test(login) && /signupForm\.privacy_agreed/.test(login), true)
  eq('/privacy 화면·라우트가 있음', [exists('src/views/PrivacyPolicyView.vue'), /PrivacyPolicyView/.test(read('src/router/index.js'))], [true, true])
  eq('/privacy에 [해성 확인] 표시 없음', /class="pp-check"/.test(read('src/views/PrivacyPolicyView.vue')), false)
  eq('푸터에 /privacy 링크', /\/privacy/.test(read('src/components/Footer.vue')), true)
  eq('탈퇴 API·화면이 있음', [exists('api/account-withdraw.js'), exists('src/components/dashboard/WithdrawAccountModal.vue')], [true, true])
}

// ── 2. 없앤 것: 로그인 뒤 동의 창 · 동의 기록 API ──
{
  eq('동의 창·API 파일 없음', ['src/components/PrivacyConsentGate.vue', 'api/privacy-consent.js', 'api/_privacyConsent.js'].filter(exists), [])
  eq('동의 창 판정 함수 없음', 'needsPrivacyConsent' in P, false)
  eq('App.vue에 동의 창 없음', /PrivacyConsentGate/.test(read('src/App.vue')), false)
  eq('로컬 서버 설정에 동의 API 없음 · 탈퇴 API는 있음', [/privacy-consent|privacyConsentHandler/.test(read('vite.config.js')), /\/api\/account-withdraw/.test(read('vite.config.js'))], [false, true])

  // src·api 어디에도 동의 창·동의 API를 부르는 곳이 없어야 한다
  const hits = []
  const walk = dir => {
    for (const e of fs.readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`
      if (e.isDirectory()) walk(p)
      else if (/\.(vue|js|mjs|ts)$/.test(e.name) && /PrivacyConsentGate|needsPrivacyConsent|\/api\/privacy-consent/.test(read(p))) hits.push(p)
    }
  }
  walk('src')
  walk('api')
  eq('src·api에 동의 창·동의 API 참조 없음', hits, [])
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
