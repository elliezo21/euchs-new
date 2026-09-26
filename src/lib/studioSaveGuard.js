/**
 * 스튜디오 나가기 보호·AI 결과 자동 다시 저장 규칙 — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-save-guard.mjs)
 *
 * ★ "저장 안 된 것"은 unsavedReasons 하나로만 판단한다. 편집기의 beforeunload(새로고침·탭 닫기·다른 사이트로 이동)가 이 함수를 본다.
 *   하나라도 있으면 브라우저 기본 "사이트에서 나가시겠습니까?" 창을 띄우고, 없으면 막지 않는다(항상 막지 않는다).
 * ★ AI 결과 조각 저장이 실패하면 2초 → 5초 → 10초 뒤 자동으로 다시 올린다(총 3번, 업로드만 — AI 재계산 없음).
 *   다시 해도 소용없는 실패(크기·개수 한도, 파일 이상, 권한·로그인·만료 등)는 기다리지 않고 바로 [다시 저장] 카드를 띄운다.
 */

export const AI_SAVE_RETRY_DELAYS = [2000, 5000, 10000]

// 다시 하면 될 수 있는 실패 — 네트워크·서버 일시 문제 (api/studio-upload.js·studioApi.callStudioApi·studioAiPatch 코드)
export const RETRYABLE_SAVE_CODES = ['network', 'internal', 'storage_error', 'sign_failed', 'upload_failed', 'not_uploaded']

/** 다시 시도할 실패인지 — 위 목록 + 서버 5xx(JSON이 아닌 응답은 http_5xx). 코드가 없거나 모르는 코드는 다시 하지 않는다 */
export function isRetryableSaveError(code) {
  const c = String(code || '')
  return RETRYABLE_SAVE_CODES.includes(c) || /^http_5\d\d$/.test(c)
}

/**
 * 실패한 뒤 몇 ms 뒤에 다시 올릴지. null = 다시 하지 않음(카드를 띄운다)
 * @param {string} code 실패 코드 (err.code)
 * @param {number} attempt 이미 다시 시도한 횟수 (처음 실패 = 0)
 */
export function nextRetryDelay(code, attempt) {
  if (!isRetryableSaveError(code)) return null
  return Number.isInteger(attempt) && attempt >= 0 && attempt < AI_SAVE_RETRY_DELAYS.length ? AI_SAVE_RETRY_DELAYS[attempt] : null
}

/**
 * 저장 안 된 것 목록 (빈 배열 = 나가도 잃는 것 없음)
 * @param {{
 *   aiFailed?: number,     // 저장 못 한 AI 결과 ([다시 저장] 카드)
 *   aiPending?: number,    // AI 결과 올리는 중·자동 다시 저장 대기
 *   aiBusy?: boolean,      // AI가 채우는 중 (결과가 아직 없음)
 *   editUnsaved?: boolean, // 사진 edit 저장이 안 끝남 (디바운스 대기·요청 중·실패·충돌 — createEditSaver.hasUnsaved)
 *   pageUnsaved?: boolean, // 페이지(page) 저장이 안 끝남 (usePageSession.hasUnsaved)
 *   draft?: boolean,       // 지우기 화면의 실행 전 영역(칠한 곳) — 저장하지 않는 초안이라 나가면 사라진다
 *   uploading?: boolean,   // [사진 추가]에서 사진을 올리는 중 (useStudioUpload)
 *   baking?: number,       // 지운 사진을 굽는 중·차례 기다림·자동 재시도 대기 (useBakeQueue.pendingCount)
 * }} s
 * @returns {string[]} 'aiFailed' | 'aiPending' | 'aiBusy' | 'edit' | 'page' | 'draft' | 'uploading' | 'baking'
 */
export function unsavedReasons(s = {}) {
  const out = []
  if (s.aiFailed > 0) out.push('aiFailed')
  if (s.aiPending > 0) out.push('aiPending')
  if (s.aiBusy) out.push('aiBusy')
  if (s.editUnsaved) out.push('edit')
  if (s.pageUnsaved) out.push('page')
  if (s.draft) out.push('draft')
  if (s.uploading) out.push('uploading')
  if (s.baking > 0) out.push('baking')
  return out
}

/** beforeunload 처리 — 저장 안 된 것이 있을 때만 막는다. 막았으면 true */
export function guardBeforeUnload(e, reasons) {
  if (!reasons.length) return false
  e.preventDefault()
  e.returnValue = '' // 크롬·사파리는 문구를 무시하고 브라우저 기본 문구를 쓴다
  return true
}

/**
 * 지우기 화면을 닫을 때 history를 어떻게 정리할지 (③-3)
 *   'back'    — 바로 앞 history 항목이 지우기 없는 이 편집기 주소 → router.back()으로 지우기 항목을 걷어낸다
 *   'replace' — 아니면(주소로 바로 들어옴·새 탭) router.replace로 주소에서 erase만 뺀다 (편집기를 떠나지 않게)
 * @param {string|null} backPath history.state.back (vue-router가 기록한 바로 앞 주소)
 * @param {string} editorPath 지우기 query를 뺀 편집기 주소 (fullPath)
 */
export function eraseCloseMode(backPath, editorPath) {
  return typeof backPath === 'string' && backPath === editorPath ? 'back' : 'replace'
}

/** 상단 "저장됨"에 마우스를 올리면 보이는 문구 — "오전 8:40에 저장됨" (이 창에서 아직 저장한 적 없으면 불러온 그대로라는 뜻) */
export function savedTitle(at) {
  if (!Number.isFinite(at)) return '불러온 내용이 모두 저장돼 있어요'
  return `${new Date(at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}에 저장됨`
}
