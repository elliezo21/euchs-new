// 알림톡 발송 전 검사 단위 테스트 — node scripts/test-alimtalk-guard.mjs
import fs from 'fs'
import { isKoreanMobile, parseExcludeIds, maskPhone, alimtalkSkipReason } from '../api/_alimtalkGuard.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}

// ── 1. 휴대폰 번호 형식 (숫자만 넘어옴) ──
eq('010 11자리', isKoreanMobile('01012345678'), true)
eq('011 10자리', isKoreanMobile('0111234567'), true)
eq('019 11자리', isKoreanMobile('01912345678'), true)
eq('010 10자리는 아님', isKoreanMobile('0101234567'), false)
eq('012는 아님', isKoreanMobile('01212345678'), false)
eq('180 시작은 아님', isKoreanMobile('18012345678'), false)
eq('유선 02는 아님', isKoreanMobile('0212345678'), false)
eq('12자리는 아님', isKoreanMobile('010123456789'), false)
eq('빈 값은 아님', isKoreanMobile(''), false)

// ── 2. 제외 목록 ──
eq('쉼표·공백 정리', [...parseExcludeIds(' a , b,,c ')], ['a', 'b', 'c'])
eq('없으면 빈 집합', parseExcludeIds(undefined).size, 0)
const ex = parseExcludeIds('11111111-1111-1111-1111-111111111111')
eq('제외 회원 → 안 보냄', alimtalkSkipReason({ userId: '11111111-1111-1111-1111-111111111111', digits: '01012345678', excludeIds: ex }), { ok: false, status: 'skipped_excluded_user' })
eq('다른 회원 → 보냄', alimtalkSkipReason({ userId: '22222222-2222-2222-2222-222222222222', digits: '01012345678', excludeIds: ex }), { ok: true })
eq('userId 없어도 번호 맞으면 보냄', alimtalkSkipReason({ userId: undefined, digits: '01012345678', excludeIds: ex }), { ok: true })
eq('번호 형식 틀리면 안 보냄', alimtalkSkipReason({ userId: 'x', digits: '18012345678', excludeIds: ex }), { ok: false, status: 'skipped_invalid_phone' })
eq('제외 목록 비어 있으면 누구나 보냄', alimtalkSkipReason({ userId: '11111111-1111-1111-1111-111111111111', digits: '01012345678', excludeIds: new Set() }), { ok: true })
eq('로그용 가림', maskPhone('01012345678'), '*******5678')

// ── 3. 코드에 실제 제외 id를 적지 않음 ──
{
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  for (const f of ['../api/send-alimtalk.js', '../api/_alimtalkGuard.js']) {
    eq(`${f.slice(3)}에 user_id 값 없음`, uuid.test(fs.readFileSync(new URL(f, import.meta.url), 'utf8')), false)
  }
}

// ── 4. 호출하는 곳이 userId를 같이 보냄 (전수) ──
{
  const files = [
    '../src/views/admin/AdminOrderManageView.vue',
    '../src/components/admin/AdminWarehouseModal.vue',
    '../src/lib/auth.js',
    '../src/components/dashboard/OrderConfigModal.vue',
  ]
  for (const f of files) {
    const src = fs.readFileSync(new URL(f, import.meta.url), 'utf8')
    const calls = src.split("fetch('/api/send-alimtalk'").slice(1).map(s => s.slice(0, 400))
    eq(`${f.split('/').pop()} — 모든 호출(${calls.length}곳)에 userId`, calls.every(c => /userId:/.test(c)), true)
  }
  // 창고 모달은 app.user_id를 쓰므로, 창을 여는 두 곳이 user_id를 넘겨야 한다
  for (const f of ['../src/views/admin/AdminOrderManageView.vue', '../src/views/admin/AdminWarehouseScanView.vue']) {
    const src = fs.readFileSync(new URL(f, import.meta.url), 'utf8')
    eq(`${f.split('/').pop()} — 창고 모달 appLike에 user_id`, /const appLike = \{[\s\S]{0,120}user_id:/.test(src), true)
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
