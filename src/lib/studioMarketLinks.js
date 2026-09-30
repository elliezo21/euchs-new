/**
 * 11번가·스마트스토어 연결 · 연결 신청 상태 (2026-09-30) — 판매처 > 연결 탭과 > 보내기 탭이 같이 본다 (서버 action market_status 한 번)
 * 로그인 전에는 부르지 않는다. 로그아웃(euchs-auth-changed)이면 비우고, 로그인이면 다시 읽는다 (CLAUDE.md 2-9)
 */
import { reactive } from 'vue'
import { currentUser } from '@/lib/auth'
import { getMarketLinks, isNotReady } from '@/lib/studioMarketplace'

// loaded: 한 번이라도 읽음 · error: 못 읽은 이유(고객 문구) · soft: 우리 쪽 준비 문제(회색)
export const marketLinks = reactive({ loaded: false, loading: false, error: '', soft: false, elevenst: { connected: false, account: null }, smartstore: { connected: false, account: null }, requests: {}, requestsReady: true })

let seq = 0
let listening = false
function reset() {
  seq++
  Object.assign(marketLinks, { loaded: false, loading: false, error: '', soft: false, elevenst: { connected: false, account: null }, smartstore: { connected: false, account: null }, requests: {}, requestsReady: true })
}
/** 서버 응답(market_status 모양)을 그대로 넣는다 — 연결·신청 action도 같은 모양을 돌려준다 */
export function applyMarketLinks(d) {
  if (!d) return
  marketLinks.elevenst = d.elevenst || { connected: false, account: null }
  marketLinks.smartstore = d.smartstore || { connected: false, account: null }
  marketLinks.requests = d.requests || {}
  marketLinks.requestsReady = d.requestsReady !== false
  marketLinks.loaded = true
  marketLinks.error = ''
}
export async function loadMarketLinks() {
  if (!listening && typeof window !== 'undefined') {
    listening = true
    window.addEventListener('euchs-auth-changed', e => { reset(); if (e.detail?.user) loadMarketLinks() })
  }
  if (!currentUser.value?.id) { reset(); return }
  const my = ++seq
  marketLinks.loading = true
  try {
    const d = await getMarketLinks()
    if (my === seq) applyMarketLinks(d)
  } catch (e) {
    if (my !== seq) return
    console.error('[studioMarketLinks] 연결 상태 조회 실패:', e.code, e)
    marketLinks.error = e.message
    marketLinks.soft = isNotReady(e.code)
  } finally {
    if (my === seq) marketLinks.loading = false
  }
}
/** 보내기 탭 판매처 줄(channelRows)에 넣을 값 */
export function linkStates(coupangConnected) {
  const out = { coupang: { connected: coupangConnected === true }, '11st': { connected: marketLinks.elevenst?.connected === true }, smartstore: { connected: marketLinks.smartstore?.connected === true } }
  for (const [k, v] of Object.entries(marketLinks.requests || {})) if (!out[k]) out[k] = { requested: v?.status === 'requested' || v?.status === 'connected' } // 키 연결 판매처는 덮지 않는다
  return out
}
