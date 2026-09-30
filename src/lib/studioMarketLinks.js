/**
 * 11번가·스마트스토어·카페24 연결 상태 (2026-09-30) — 판매처 > 연결 탭과 > 보내기 탭·보내기 창이 같이 본다 (서버 action market_status 한 번)
 * 로그인 전에는 부르지 않는다. 로그아웃(euchs-auth-changed)이면 비우고, 로그인이면 다시 읽는다 (CLAUDE.md 2-9)
 */
import { reactive, computed } from 'vue'
import { currentUser, isAuthLoading } from '@/lib/auth'
import { getMarketLinks, isNotReady } from '@/lib/studioMarketplace'
import { linkPhase } from '@/lib/studioMarketplaceRules'

const OFF = () => ({ connected: false, account: null })
const blank = () => ({ loaded: false, loading: false, error: '', soft: false, elevenst: OFF(), smartstore: OFF(), cafe24: OFF() })
// loaded: 한 번이라도 읽음 · error: 못 읽은 이유(고객 문구) · soft: 우리 쪽 준비 문제(회색)
export const marketLinks = reactive(blank())
/** 카드·보내기 줄 표시 단계 (studioMarketplaceRules.linkPhase) — 'ready'가 아니면 "연결 전"·[연결하기]를 그리지 않는다 */
export const marketLinksPhase = computed(() => linkPhase({ authLoading: isAuthLoading.value, loggedIn: !!currentUser.value?.id, loaded: marketLinks.loaded, error: marketLinks.error }))

let seq = 0
let listening = false
let shownUid = '' // 지금 화면 값이 누구 것인지 — 다른 사용자(또는 로그아웃)일 때만 비운다
function reset() {
  seq++
  shownUid = ''
  Object.assign(marketLinks, blank())
}
/**
 * euchs-auth-changed 처리. ★ auth.js는 세션이 있는 모든 인증 이벤트(탭으로 돌아올 때의 SIGNED_IN, 1시간마다 TOKEN_REFRESHED 등)에
 * 같은 사용자로 이 이벤트를 다시 보낸다 → 예전에는 그때마다 전부 "연결 전"으로 비웠다가 다시 읽어 카드가 연결 전 ↔ 연결됨으로 깜빡였다(2026-09-30 운영).
 * 같은 사용자면 비우지 않고 뒤에서 다시 읽기만 한다. 로그아웃·다른 사용자면 비운다(CLAUDE.md 2-9)
 */
export function onAuthChangedForLinks(user) {
  const uid = user?.id || ''
  if (!uid || uid !== shownUid) reset()
  if (uid) loadMarketLinks()
}
/** 서버 응답(market_status 모양)을 그대로 넣는다 — 연결·해제 action도 같은 모양을 돌려준다 */
export function applyMarketLinks(d) {
  if (!d) return
  marketLinks.elevenst = d.elevenst || OFF()
  marketLinks.smartstore = d.smartstore || OFF()
  marketLinks.cafe24 = d.cafe24 || OFF()
  marketLinks.loaded = true
  marketLinks.error = ''
  shownUid = currentUser.value?.id || ''
}
export async function loadMarketLinks() {
  if (!listening && typeof window !== 'undefined') {
    listening = true
    window.addEventListener('euchs-auth-changed', e => onAuthChangedForLinks(e.detail?.user))
  }
  const uid = currentUser.value?.id
  if (!uid) { reset(); return }
  if (shownUid && shownUid !== uid) reset()
  const my = ++seq
  marketLinks.loading = true
  if (!marketLinks.loaded) marketLinks.error = '' // [다시 시도] — 한 번도 못 읽은 상태면 다시 "확인 중"으로
  try {
    const d = await getMarketLinks()
    if (my === seq) { applyMarketLinks(d); shownUid = uid }
  } catch (e) {
    if (my !== seq) return
    // 다시 읽기가 실패해도 이미 보여 주던 같은 사용자의 연결 상태는 그대로 둔다(깜빡이지 않게) — 이유만 보여 준다
    console.error('[studioMarketLinks] 연결 상태 조회 실패:', e.code, e)
    marketLinks.error = e.message
    marketLinks.soft = isNotReady(e.code)
  } finally {
    if (my === seq) marketLinks.loading = false
  }
}
/** 보내기 탭 판매처 줄(channelRows)에 넣을 값 */
export function linkStates(coupangConnected) {
  return {
    coupang: { connected: coupangConnected === true },
    '11st': { connected: marketLinks.elevenst?.connected === true },
    smartstore: { connected: marketLinks.smartstore?.connected === true },
    cafe24: { connected: marketLinks.cafe24?.connected === true },
  }
}
