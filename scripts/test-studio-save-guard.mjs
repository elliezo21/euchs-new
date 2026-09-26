// 나가기 보호·자동 다시 저장 규칙 테스트 — node scripts/test-studio-save-guard.mjs
import {
  unsavedReasons, guardBeforeUnload, isRetryableSaveError, nextRetryDelay, eraseCloseMode, savedTitle, AI_SAVE_RETRY_DELAYS,
} from '../src/lib/studioSaveGuard.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const ev = () => ({ defaultPrevented: false, returnValue: undefined, preventDefault() { this.defaultPrevented = true } })

// ── 저장 안 된 것 ──
eq('아무것도 없음 → 빈 목록', unsavedReasons({ aiFailed: 0, aiPending: 0, aiBusy: false, editUnsaved: false, pageUnsaved: false, draft: false, uploading: false }), [])
eq('인자 없음 → 빈 목록', unsavedReasons(), [])
eq('저장 못 한 AI 결과', unsavedReasons({ aiFailed: 1 }), ['aiFailed'])
eq('AI 올리는 중·자동 재시도 대기', unsavedReasons({ aiPending: 2 }), ['aiPending'])
eq('AI 채우는 중', unsavedReasons({ aiBusy: true }), ['aiBusy'])
eq('사진 edit 저장 안 끝남', unsavedReasons({ editUnsaved: true }), ['edit'])
eq('페이지 저장 안 끝남', unsavedReasons({ pageUnsaved: true }), ['page'])
eq('칠한 곳(초안)', unsavedReasons({ draft: true }), ['draft'])
eq('사진 올리는 중', unsavedReasons({ uploading: true }), ['uploading'])
eq('여러 개', unsavedReasons({ aiFailed: 1, editUnsaved: true, pageUnsaved: true }), ['aiFailed', 'edit', 'page'])

// ── beforeunload ──
{
  const a = ev(); const r = guardBeforeUnload(a, [])
  eq('저장 다 됨 → 막지 않음', [r, a.defaultPrevented, a.returnValue], [false, false, undefined])
  const b = ev(); const r2 = guardBeforeUnload(b, ['aiFailed'])
  eq('저장 안 된 것 있음 → 막음', [r2, b.defaultPrevented, b.returnValue], [true, true, ''])
}

// ── 자동 다시 저장 ──
eq('간격 2초 → 5초 → 10초', AI_SAVE_RETRY_DELAYS, [2000, 5000, 10000])
eq('네트워크 실패: 1·2·3번째 → 2·5·10초', [0, 1, 2].map(i => nextRetryDelay('network', i)), [2000, 5000, 10000])
eq('3번 다 실패하면 null (카드)', nextRetryDelay('network', 3), null)
for (const c of ['network', 'internal', 'storage_error', 'sign_failed', 'upload_failed', 'not_uploaded', 'http_500', 'http_502', 'http_504']) {
  eq(`다시 시도: ${c}`, isRetryableSaveError(c), true)
}
for (const c of ['patch_too_large', 'patch_limit', 'patch_invalid', 'patch_too_large+delete_failed', 'invalid_input', 'project_expired',
  'not_found', 'unauthorized', 'not_admin', 'no_entitlement', 'studio_disabled', 'server_misconfigured', 'http_400', 'http_404', '', undefined]) {
  eq(`바로 카드: ${c}`, [isRetryableSaveError(c), nextRetryDelay(c, 0)], [false, null])
}

// ── 지우기 화면 닫기 ──
eq('바로 앞이 편집기 → back', eraseCloseMode('/studio/p/p1', '/studio/p/p1'), 'back')
eq('주소로 바로 들어옴(앞 없음) → replace', eraseCloseMode(null, '/studio/p/p1'), 'replace')
eq('앞이 다른 화면 → replace', eraseCloseMode('/studio/projects', '/studio/p/p1'), 'replace')
eq('앞이 다른 사진 지우기 → replace', eraseCloseMode('/studio/p/p1?erase=a', '/studio/p/p1'), 'replace')

// ── 저장 시각 (상단 "저장됨"에 마우스) ──
eq('오전 8:40에 저장됨', savedTitle(new Date(2026, 8, 26, 8, 40, 12).getTime()), '오전 8:40에 저장됨')
eq('오후 7:25에 저장됨', savedTitle(new Date(2026, 8, 26, 19, 25, 6).getTime()), '오후 7:25에 저장됨')
eq('아직 저장 안 함', savedTitle(null), '불러온 내용이 모두 저장돼 있어요')

console.log(`\n${pass} 통과 / ${fail} 실패`)
if (fail) process.exit(1)
