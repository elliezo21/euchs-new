/**
 * translationStatus.js
 * 번역 서비스 상태 공유 모듈 (Vue reactive)
 *
 * 목적:
 *   - 파파고 번역 API 호출 결과를 앱 전역에서 공유
 *   - 관리자 대시보드에서 번역 서비스 상태를 배지(정상/오류)로 표시
 *   - 번역 실패가 "조용히 숨겨지지" 않도록 가시화 (AGENTS.md 준수)
 *
 * 사용:
 *   import { translationStatus, markTranslationSuccess, markTranslationError } from '@/services/translationStatus'
 *
 * 상태 필드:
 *   - ok:        boolean — 마지막 번역 성공 여부
 *   - checked:   boolean — 번역이 최소 1회 시도된 이후 true (배지 표시 조건)
 *   - errorMsg:  string  — 마지막 실패 이유 (성공 시 '')
 *   - errorAt:   string  — 마지막 실패 시각 ISO 문자열 (성공 시 '')
 *   - successAt: string  — 마지막 성공 시각 ISO 문자열
 *   - totalErrors: number — 앱 세션 내 누적 실패 횟수
 */

import { ref } from 'vue'

const STORAGE_KEY = 'euchs_translation_status'

// ── 초기 상태 로드 (localStorage → 페이지 새로고침 후에도 관리자 확인 가능) ──
function loadPersistedStatus() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ok:           parsed.ok           ?? true,
        checked:      parsed.checked      ?? false,
        errorMsg:     parsed.errorMsg     ?? '',
        errorAt:      parsed.errorAt      ?? '',
        successAt:    parsed.successAt    ?? '',
        totalErrors:  parsed.totalErrors  ?? 0,
      }
    }
  } catch (e) {
    // 파싱 실패는 무시하고 기본값 사용
  }
  return { ok: true, checked: false, errorMsg: '', errorAt: '', successAt: '', totalErrors: 0 }
}

function persistStatus(status) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  } catch (e) {
    // localStorage 불가 환경(e.g. 시크릿 모드 풀 시) 무시
  }
}

export const translationStatus = ref(loadPersistedStatus())

/**
 * 번역 성공 시 호출
 * @param {number} [count=1] - 성공 번역 건수
 */
export function markTranslationSuccess(count = 1) {
  const now = new Date().toISOString()
  translationStatus.value = {
    ...translationStatus.value,
    ok:        true,
    checked:   true,
    errorMsg:  '',
    errorAt:   '',
    successAt: now,
  }
  persistStatus(translationStatus.value)
}

/**
 * 번역 실패 시 호출
 * @param {string} reason - 실패 이유 (로그/배지에 표시)
 */
export function markTranslationError(reason = '알 수 없는 오류') {
  const now = new Date().toISOString()
  translationStatus.value = {
    ok:          false,
    checked:     true,
    errorMsg:    reason,
    errorAt:     now,
    successAt:   translationStatus.value.successAt,
    totalErrors: (translationStatus.value.totalErrors || 0) + 1,
  }
  persistStatus(translationStatus.value)
  // 서버 로그 용도 (클라이언트 콘솔에도 명확하게 남김)
  console.error(
    `[번역 서비스] ❌ 번역 실패 기록됨 — ${reason} | 누적 실패: ${translationStatus.value.totalErrors}회 | ${now}`
  )
}

/**
 * 상태 초기화 (관리자가 직접 리셋할 때 사용)
 */
export function resetTranslationStatus() {
  translationStatus.value = { ok: true, checked: false, errorMsg: '', errorAt: '', successAt: '', totalErrors: 0 }
  persistStatus(translationStatus.value)
}
