// 로그인 복귀 주소·세션 만료 판정 테스트 — node scripts/test-auth-redirect.mjs
import {
  isSafeRedirectPath, isDashboardPath, isPostLoginTarget, loginSuccessDest, oauthReturnDest, dropsRedirectOnClose,
  isStudioPath, oauthRedirectTarget, landedInStudio,
} from '../src/lib/authRedirect.js'
import { shouldClearStaleLocalUser, shouldPromptLoginAfterClear } from '../src/lib/authSession.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(48)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

// ── 1. 우선 복귀 대상 판정 ──
eq('대시보드 경로 판정',
  ['/dashboard', '/dashboard/orders', '/dashboard?tab=a', '/dashboards', '/dash', '/mall'].map(isDashboardPath),
  [true, true, true, false, false, false])
eq('우선 복귀 대상: 보호 화면만',
  ['/dashboard/orders', '/studio/p/abc', '/studio', '/mall', '/', '/admin'].map(isPostLoginTarget),
  [true, true, false, false, false, false])
eq('우선 복귀 대상: 외부·이상 주소 거부',
  ['//evil.com/dashboard', '/\\evil.com', 'https://evil.com/dashboard', '/dashboard\n', null, ''].map(isPostLoginTarget),
  [false, false, false, false, false, false])
eq('안전성 검사 유지', ['/a', '//a', '/\\a', 'a'].map(isSafeRedirectPath), [true, false, false, false])

// ── 2. 이메일(모달) 로그인 성공 뒤 이동 ──
eq('홈에서 대시보드 저장 → 대시보드', loginSuccessDest('/dashboard/orders', '/', '/'), '/dashboard/orders')
eq('/mall에 머문 채 대시보드 저장 → 대시보드', loginSuccessDest('/dashboard/orders', '/mall', '/mall'), '/dashboard/orders')
eq('스튜디오 대문에서 편집기 저장 → 편집기', loginSuccessDest('/studio/p/x', '/studio', '/studio'), '/studio/p/x')
eq('이미 그 화면 → 이동 없음', loginSuccessDest('/studio/p/x', '/studio/p/x', '/studio/p/x'), null)
eq('저장 없음 + 홈 → /mall (예전 그대로)', loginSuccessDest(null, '/', '/'), '/mall')
eq('저장 없음 + /login → /mall (예전 그대로)', loginSuccessDest(null, '/login', '/login'), '/mall')
eq('저장 없음 + 서비스 화면 → 머묾 (예전 그대로)', loginSuccessDest(null, '/mall', '/mall?q=1'), null)
eq('외부 주소 저장 + 홈 → /mall', loginSuccessDest('//evil.com', '/', '/'), '/mall')
eq('외부 주소 저장 + 서비스 화면 → 머묾', loginSuccessDest('https://evil.com', '/mall', '/mall'), null)

// ── 3. 구글·카카오 OAuth 복귀 (홈에 착지) ──
eq('가드가 / 로 보냄(returnUrl "/") → 대시보드', oauthReturnDest('/dashboard/orders', '/'), '/dashboard/orders')
eq('/mall에서 로그인 + 대시보드 저장 → 대시보드', oauthReturnDest('/dashboard/orders', '/mall'), '/dashboard/orders')
eq('스튜디오 대문 + 편집기 저장 → 편집기', oauthReturnDest('/studio/p/x', '/studio'), '/studio/p/x')
eq('저장 없음 + 홈에서 로그인 → /mall', oauthReturnDest(null, '/'), '/mall')
eq('저장 없음 + /?x 에서 로그인 → /mall', oauthReturnDest(null, '/?ref=a'), '/mall')
eq('저장 없음 + 상품화면에서 로그인 → 그 화면', oauthReturnDest(null, '/mall?q=cup'), '/mall?q=cup')
eq('외부 주소 저장 → 무시하고 returnUrl', oauthReturnDest('//evil.com', '/guide'), '/guide')

// ── 3-1. 로그인 창 닫힘 사유별 복귀 주소 처리 ──
eq('직접 닫기(X·바깥·Esc) → 버림', dropsRedirectOnClose('user_dismiss'), true)
eq('로그인 성공 자동 닫힘 → 유지', dropsRedirectOnClose('login_success'), false)
eq('구글·카카오로 떠남 → 유지', dropsRedirectOnClose('oauth_redirect'), false)
eq('알 수 없는 사유 → 유지', dropsRedirectOnClose(undefined), false)

// 1차 실패 재현(로그 04:25): 카카오 로그인이 복귀 주소를 쓰고 지움 → 로그아웃 → 구글 로그인 = 저장 없음 → /mall
eq('카카오 복귀: 저장 주소 사용', oauthReturnDest('/dashboard/orders', '/'), '/dashboard/orders')
eq('이어서 구글(저장 이미 사용됨) → /mall', oauthReturnDest(null, '/'), '/mall')

// ── 4. 세션 만료 시 화면용 캐시 정리 판정 ──
const base = { hasSession: false, errorRetryable: false, hasCachedUser: true, isAdminToken: false, isDemo: false }
eq('세션 없음 + 캐시 있음 → 정리', shouldClearStaleLocalUser(base), true)
eq('세션 있음(갱신 성공 포함) → 유지', shouldClearStaleLocalUser({ ...base, hasSession: true }), false)
eq('네트워크 오류로 확인 불가 → 유지', shouldClearStaleLocalUser({ ...base, errorRetryable: true }), false)
eq('캐시 없음(비로그인 방문자) → 할 일 없음', shouldClearStaleLocalUser({ ...base, hasCachedUser: false }), false)
eq('관리자 토큰 → 유지(관리자 경로 불변)', shouldClearStaleLocalUser({ ...base, isAdminToken: true }), false)
eq('데모 세션 → 유지', shouldClearStaleLocalUser({ ...base, isDemo: true }), false)

// ── 5. 캐시 정리 뒤 로그인 창 (다른 탭 로그아웃 포함) — 보호 화면에서만 ──
eq('보호 화면 → 창 띄움',
  ['/dashboard', '/dashboard/orders', '/dashboard/orders?tab=a', '/studio/p/x', '/studio/projects'].map(shouldPromptLoginAfterClear),
  [true, true, true, true, true])
eq('공개 화면 → 안 띄움',
  ['/', '/mall', '/mall?q=cup', '/studio', '/guide', '/admin'].map(shouldPromptLoginAfterClear),
  [false, false, false, false, false, false])

// ── 스튜디오에서 시작한 구글·카카오 로그인 → 스튜디오로 바로 (2026-09-30) ──
const O = 'https://www.euchs.co.kr'
eq('스튜디오 경로 판정 (대문 포함)', ['/studio', '/studio/templates', '/studio?x=1', '/studios', '/mall', '/'].map(isStudioPath), [true, true, true, false, false, false])
eq('스튜디오 밖에서 시작 → 예전 그대로 홈', [oauthRedirectTarget(O, '/mall', null), oauthRedirectTarget(O, '/', '/dashboard/orders'), oauthRedirectTarget(O, '/guide', '/studio/projects')], [`${O}/`, `${O}/`, `${O}/`])
eq('스튜디오에서 시작 + 하려던 동작 저장 → 그 주소로 바로', [oauthRedirectTarget(O, '/studio', '/studio/projects'), oauthRedirectTarget(O, '/studio/templates', '/studio/templates?start=basic')], [`${O}/studio/projects`, `${O}/studio/templates?start=basic`])
eq('스튜디오에서 시작 + 저장 없음 → 시작한 화면', [oauthRedirectTarget(O, '/studio', null), oauthRedirectTarget(O, '/studio/channels/connect', '')], [`${O}/studio`, `${O}/studio/channels/connect`])
eq('저장값이 스튜디오 밖·이상한 주소면 쓰지 않음', [oauthRedirectTarget(O, '/studio', '/dashboard/orders'), oauthRedirectTarget(O, '/studio', '//evil.com'), oauthRedirectTarget(O, '/studio', 'https://evil.com/studio')], [`${O}/studio`, `${O}/studio`, `${O}/studio`])
eq('돌아와서: 스튜디오에 착지 = 그대로 · 홈 착지 = 예전 처리', ['/studio/projects', '/studio', '/', '/mall'].map(landedInStudio), [true, true, false, false])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
