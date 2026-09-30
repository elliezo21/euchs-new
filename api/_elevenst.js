/**
 * 11번가 Open API — 중계 호출·오류 번역 (2026-09-30, 연결까지만. 상품 보내기는 다음 작업)
 * 쿠팡(api/_coupang.js coupangCall)과 같은 방식을 그대로 쓴다:
 *   고정 IP 중계 {MARKETPLACE_RELAY_URL}/11st{path}?{query} + 헤더 x-relay-secret · 재시도 없음 · 같은 서킷 브레이커(breakerFor) · 같은 준비 문제 문구
 *
 * [인증 — 11번가 오픈API] 요청 헤더 openapikey: {발급받은 키}. 응답은 XML  [확인 필요 — 11번가 오픈API 문서로 대조]
 * [연결 확인] 출고지 주소 조회 GET /rest/areaservice/outboundarea — 읽기 전용, 셀러 키가 맞아야 응답  [확인 필요 — 경로·오류 형식]
 * [중계] relay.js에 11st → 11번가 API 주소 + openapikey 헤더 넘기기가 있어야 한다 (보고서에 추가할 줄)
 */
import { breakerFor, NOT_READY_MESSAGE, RELAY_IP } from './_coupang.js'

export const ELEVENST_PATHS = { outbound: '/rest/areaservice/outboundarea' }
const RELAY_TIMEOUT_MS = 25000

export class ElevenstError extends Error {
  constructor(code, message, { status = 0, raw = '' } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.raw = String(raw || '').slice(0, 300)
  }
}

/**
 * 11번가 응답·HTTP 상태 → 오류 (null = 성공)
 * 11번가는 HTTP 200에 XML 결과 코드로 실패를 주기도 한다 — 음수 result_code·"인증"·"키" 문구를 실패로 본다  [확인 필요 — 실제 오류 응답으로 대조]
 */
export function translateElevenst(status, text = '') {
  const t = String(text || '')
  if (status === 0) return { code: 'relay_unreachable', message: NOT_READY_MESSAGE }
  if (status === 401 && /relay/i.test(t)) return { code: 'relay_denied', message: NOT_READY_MESSAGE }
  if (/허용되지 않은 IP|not allowed ip|ip.*(차단|허용)/i.test(t)) return { code: 'ip_not_allowed', message: `11번가 오픈API에 서버 IP ${RELAY_IP}가 등록됐는지 확인해 주세요.` }
  if (status === 401 || status === 403 || /openapikey|api ?key|인증.*(실패|오류)|유효하지 않은.*키/i.test(t)) return { code: 'bad_key', message: 'API 키가 맞지 않아요. 11번가에서 발급한 키를 다시 확인해 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '11번가 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 500) return { code: 'market_server', message: '11번가가 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 400) return { code: 'market_error', message: `11번가 요청이 실패했어요 (HTTP ${status}).` }
  const rc = /<(?:\w+:)?result_?code>\s*(-?\d+)\s*</i.exec(t)
  if (rc && Number(rc[1]) < 0) return { code: 'market_rejected', message: '11번가가 요청을 거절했어요. 키와 서버 IP 등록을 확인해 주세요.' }
  return null
}

/**
 * 11번가 호출 (중계 경유). 성공 = 응답 본문(XML 글자). 실패 = ElevenstError throw (재시도 없음)
 * @param {{ relayUrl, relaySecret, apiKey, breakerKey, fetchImpl? }} c
 * @param {{ method, path, query? }} req
 */
export async function elevenstCall(c, { method, path, query = '' }) {
  if (!c.relayUrl || !c.relaySecret) throw new ElevenstError('relay_not_configured', NOT_READY_MESSAGE)
  const breaker = breakerFor(`11st:${c.breakerKey || ''}`)
  const left = breaker.blockedFor()
  if (left > 0) throw new ElevenstError('breaker_open', `11번가 오류가 잦아 잠시 멈췄어요. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)
  const url = `${c.relayUrl.replace(/\/$/, '')}/11st${path}${query ? `?${query}` : ''}`
  const headers = { 'openapikey': c.apiKey, 'Accept': 'application/xml', 'x-relay-secret': c.relaySecret }
  const fetchImpl = c.fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS)
  let r, text
  try {
    r = await fetchImpl(url, { method, headers, signal: controller.signal })
    text = await r.text()
  } catch (e) {
    breaker.recordError()
    throw new ElevenstError('relay_unreachable', NOT_READY_MESSAGE, { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  const tr = translateElevenst(r.status, text)
  if (tr) {
    breaker.recordError()
    throw new ElevenstError(tr.code, tr.message, { status: r.status, raw: String(text || '').replace(/[0-9a-f]{24,}/gi, '[hex]') })
  }
  breaker.recordOk()
  return text
}

/** 키 확인 — 출고지 주소 조회가 되면 연결된 것으로 본다 */
export async function verifyElevenstKey(c) {
  await elevenstCall(c, { method: 'GET', path: ELEVENST_PATHS.outbound })
  return true
}
