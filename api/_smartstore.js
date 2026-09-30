/**
 * 네이버 커머스API(스마트스토어) — 전자서명·중계 호출·오류 번역 (2026-09-30, 연결까지만. 상품 보내기는 다음 작업)
 * 11번가(api/_elevenst.js)·쿠팡과 같은 방식: 고정 IP 중계 {MARKETPLACE_RELAY_URL}/smartstore{path} + 헤더 x-relay-secret · 재시도 없음 · 같은 서킷 브레이커(breakerFor)
 *
 * [인증 토큰 — 확인한 곳]
 *   POST https://api.commerce.naver.com/external/v1/oauth2/token  (호스트·경로: 공식 저장소 github.com/commerce-api-naver/commerce-api 토론 #1915·#611)
 *   본문 application/x-www-form-urlencoded 만 (2025-02부터 — 공식 공지 #1729)
 *   client_id · timestamp(밀리초 13자리, 호출 시각 기준 5분 안 — 공식 답변 #357) · client_secret_sign · grant_type=client_credentials · type=SELF
 *   type=SELF: "내 스토어 애플리케이션"은 SELF만, account_id 없음 (공식 답변 #780)
 *   허용 안 된 IP = HTTP 403 GW.IP_NOT_ALLOWED "호출이 허용되지 않은 IP입니다." (공식 답변 #2291)
 * [전자서명 — 확인 필요] password = client_id + "_" + timestamp → bcrypt(password, salt = client_secret) → base64
 *   공식 문서 페이지(apicenter.commerce.naver.com/docs)는 직접 열어 보지 못했다. 공식 저장소 토론 #611의 사용자 코드(토큰 발급 성공 후 상품 조회까지 된 코드)와 같다
 * [연결 확인] 토큰이 발급되면 애플리케이션 ID·시크릿·호출 IP가 맞는 것으로 본다 — 따로 가벼운 조회 API를 부르지 않는다
 *   (토큰 발급에도 IP 제한이 걸리는지는 확인 필요 — 안 걸리면 IP 문제는 첫 보내기 때 드러난다)
 */
import bcrypt from 'bcryptjs'
import { breakerFor, NOT_READY_MESSAGE, RELAY_IP } from './_coupang.js'

export const SMARTSTORE_PATHS = { token: '/external/v1/oauth2/token' }
const RELAY_TIMEOUT_MS = 25000

export class SmartstoreError extends Error {
  constructor(code, message, { status = 0, raw = '' } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.raw = String(raw || '').slice(0, 300)
  }
}

/** 시크릿이 bcrypt salt 모양인지 ($2a$·$2b$·$2y$ + 비용 2자리 + $ + 22자) — 아니면 네이버를 부르지 않고 알린다 */
export const isBcryptSalt = s => /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{22}/.test(String(s || ''))

/**
 * client_secret_sign = base64( bcrypt(client_id + "_" + timestamp, salt = client_secret) )  [확인 필요 — 위 주석]
 * @param {string} clientId @param {string} clientSecret @param {number} timestamp 밀리초
 */
export function smartstoreSign(clientId, clientSecret, timestamp) {
  const hashed = bcrypt.hashSync(`${clientId}_${timestamp}`, clientSecret)
  return Buffer.from(hashed, 'utf8').toString('base64')
}

/**
 * 네이버 응답 → 오류 (null = 성공). 오류 본문은 JSON { code, message } 모양 [확인 필요 — GW.IP_NOT_ALLOWED 외 코드]
 */
export function translateSmartstore(status, text = '') {
  const t = String(text || '')
  if (status === 0) return { code: 'relay_unreachable', message: NOT_READY_MESSAGE }
  if (status === 401 && /relay/i.test(t)) return { code: 'relay_denied', message: NOT_READY_MESSAGE }
  if (/IP_NOT_ALLOWED|허용되지 않은 IP/i.test(t)) return { code: 'ip_not_allowed', message: `커머스API센터의 애플리케이션에 API 호출 IP ${RELAY_IP}가 등록됐는지 확인해 주세요.` }
  if (/timestamp/i.test(t)) return { code: 'market_rejected', message: '네이버가 요청 시각을 받지 않았어요. 잠시 후 다시 시도해 주세요.' }
  if (status === 401 || status === 403 || /invalid_client|client_secret|client_id|GW\.AUTHN|인증/i.test(t)) return { code: 'bad_key', message: '애플리케이션 ID·시크릿이 맞지 않아요. 커머스API센터에서 다시 복사해 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '네이버 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 500) return { code: 'market_server', message: '네이버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 400) return { code: 'market_rejected', message: `네이버가 요청을 거절했어요 (HTTP ${status}).` }
  return null
}

/**
 * 인증 토큰 발급 (중계 경유) — 성공 = { access_token, expires_in }. 실패 = SmartstoreError throw (재시도 없음)
 * 토큰은 연결 확인에만 쓰고 저장하지 않는다
 * @param {{ relayUrl, relaySecret, clientId, clientSecret, breakerKey, now?, fetchImpl? }} c
 */
export async function smartstoreToken(c) {
  if (!c.relayUrl || !c.relaySecret) throw new SmartstoreError('relay_not_configured', NOT_READY_MESSAGE)
  if (!isBcryptSalt(c.clientSecret)) throw new SmartstoreError('bad_key', '애플리케이션 시크릿 모양이 맞지 않아요. 커머스API센터에서 시크릿을 그대로 복사해 주세요.')
  const breaker = breakerFor(`smartstore:${c.breakerKey || ''}`)
  const left = breaker.blockedFor()
  if (left > 0) throw new SmartstoreError('breaker_open', `네이버 오류가 잦아 잠시 멈췄어요. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)
  const timestamp = (c.now || Date.now)()
  const form = new URLSearchParams({
    client_id: c.clientId, timestamp: String(timestamp), client_secret_sign: smartstoreSign(c.clientId, c.clientSecret, timestamp),
    grant_type: 'client_credentials', type: 'SELF',
  })
  const url = `${c.relayUrl.replace(/\/$/, '')}/smartstore${SMARTSTORE_PATHS.token}`
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'x-relay-secret': c.relaySecret }
  const fetchImpl = c.fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS)
  let r, text
  try {
    r = await fetchImpl(url, { method: 'POST', headers, body: form.toString(), signal: controller.signal })
    text = await r.text()
  } catch (e) {
    breaker.recordError()
    throw new SmartstoreError('relay_unreachable', NOT_READY_MESSAGE, { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  const scrub = s => String(s || '').replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"[가림]"').replace(/[0-9a-f]{24,}/gi, '[hex]')
  const tr = translateSmartstore(r.status, text)
  if (tr) {
    breaker.recordError()
    throw new SmartstoreError(tr.code, tr.message, { status: r.status, raw: scrub(text) })
  }
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* 아래에서 모양 검사 */ }
  if (!json || typeof json.access_token !== 'string' || !json.access_token) {
    breaker.recordError()
    throw new SmartstoreError('market_bad_json', '네이버 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.', { status: r.status, raw: scrub(text) })
  }
  breaker.recordOk()
  return { access_token: json.access_token, expires_in: json.expires_in }
}
