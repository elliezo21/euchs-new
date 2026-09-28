/**
 * 스튜디오 사용 자격 (2026-09-28) — VITE_STUDIO_ENABLED = 'all'일 때만 라우터 가드가 쓴다. admin 모드는 예전 그대로(관리자만).
 *
 * 자격 판정은 서버에만 있다: api/_studio.js studioGuard → _studioBg.isBgEligible(관리자·스태프 또는 결제 확인 이후 주문 1건 이상).
 * 화면은 서버에 한 번 묻는다(action 'access'). 막히면 서버가 403 not_customer — 모든 스튜디오 API가 같은 관문이라 화면을 건너뛰어도 막힌다.
 *
 * 'ok'만 계정별로 기억한다(주문을 하고 오면 다음 이동에서 바로 열리게 'not_customer'는 기억하지 않음). 로그아웃·계정 바뀜이면 비운다.
 */
import { ref } from 'vue'
import { callStudioApi } from '@/lib/studioApi'

export const STUDIO_NO_ACCESS_TITLE = '스튜디오는 EUCHS에서 주문하신 고객님께 무료로 열려 있어요'

/** 안내 창 열림 — 라우터 가드가 켜고 StudioLayout이 보여 준다 (가드가 도는 순간 레이아웃이 아직 없을 수 있어 이벤트 대신 상태) */
export const studioNoAccessOpen = ref(false)

const okUsers = new Set()

/**
 * @param {string|null|undefined} userId 지금 로그인한 사람
 * @returns {Promise<'ok'|'not_customer'|'login'|'error'>}
 */
export async function checkStudioAccess(userId) {
  if (userId && okUsers.has(userId)) return 'ok'
  const r = await callStudioApi('studio-upload', { action: 'access' })
  if (r.ok) {
    if (userId) okUsers.add(userId)
    return 'ok'
  }
  if (r.code === 'not_customer') return 'not_customer'
  if (r.code === 'unauthorized') return 'login'
  console.error('[studioAccess] 스튜디오 자격 확인 실패:', r.status, r.code)
  return 'error'
}

export function clearStudioAccess() {
  okUsers.clear()
  studioNoAccessOpen.value = false
}

if (typeof window !== 'undefined') window.addEventListener('euchs-auth-changed', clearStudioAccess)
