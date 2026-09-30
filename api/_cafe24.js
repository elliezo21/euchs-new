/**
 * 카페24 — 고객이 직접 만든 앱(Client ID·Secret)으로 OAuth 연결 (2026-09-30 S3-3, 연결까지만. 상품 보내기는 다음 작업)
 * 쿠팡·11번가·스마트스토어와 같은 표(marketplace_accounts)·같은 암호화. 다른 점: 키 하나로 끝나지 않고 카페24 동의 화면을 거쳐 토큰을 받는다.
 *
 * [확인한 곳 — 공식 문서 apidocs.cafe24.com/docs/guide/oauth2-authentication]
 *   동의(코드)  GET  https://{mall_id}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id&state&redirect_uri&scope  (브라우저에서만, 코드 1분·1회)
 *   토큰        POST https://{mall_id}.cafe24api.com/api/v2/oauth/token
 *               헤더 Authorization: Basic base64(client_id:client_secret) · Content-Type: application/x-www-form-urlencoded
 *               본문 grant_type=authorization_code&code&redirect_uri   /   갱신 grant_type=refresh_token&refresh_token
 *   응답        access_token · expires_at · refresh_token · refresh_token_expires_at · client_id · mall_id · user_id · scopes[] · issued_at · shop_no
 *   수명        access 2시간 · refresh 2주 — 갱신하면 새 refresh_token이 오고 예전 것은 폐기된다(그래서 받은 즉시 저장)
 *   호출 한도   10분 3,000회 · 넘으면 429
 * [다른 업체 안내와 대조] 제디(zediagent.com/guide/connect/cafe24 "직접 입력 방식") — 개발자센터에서 앱을 만들고 Client ID·Secret → 브라우저 동의 → 1분 안 코드.
 *   개인 블로그 안내(seheeopark.rbind.io) — 자기 쇼핑몰용 앱은 심사 없이 바로 동의까지 된다.
 * [확인 필요] expires_at·refresh_token_expires_at에 시간대 표시가 없다 — 한국 시각(+09:00)으로 읽는다
 * [확인 필요] 오류 응답 본문 모양 — OAuth 표준({ error, error_description })으로 읽는다
 * [고정 IP] 문서에 호출 IP 제한이 없다 → 중계를 거치지 않고 서버에서 바로 부른다 (쇼핑몰마다 주소가 달라 중계 대상으로 두기도 어렵다)
 */
import crypto from 'crypto'
import { breakerFor } from './_coupang.js'

// 우리 쪽 돌아오는 주소 — 고객이 카페24 앱의 Redirect URI에 그대로 넣는다 (src/lib/studioMarketGuides.js CAFE24_REDIRECT_URI와 같은 값 — 테스트가 대조)
export const CAFE24_REDIRECT_URI = 'https://www.euchs.co.kr/studio/channels/connect'
// 고객이 앱에서 고를 권한 — 상품 읽기·쓰기, 상품분류 읽기 (문서 표기 READ_PRODUCT·WRITE_PRODUCT·READ_CATEGORY)
export const CAFE24_SCOPES = ['mall.read_product', 'mall.write_product', 'mall.read_category']
export const STATE_PREFIX = 'c24' // 연결 탭에 돌아온 ?code=&state= 중 우리 것만 (구글·카카오 로그인이 돌아올 때 붙는 ?code=와 섞이지 않게)
const STATE_TTL_SEC = 10 * 60
const TIMEOUT_MS = 25000

export class Cafe24Error extends Error {
  constructor(code, message, { status = 0, raw = '' } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.raw = String(raw || '').slice(0, 300)
  }
}

/** 쇼핑몰 ID — 주소 앞부분({mall_id}.cafe24api.com)에 들어가므로 영문 소문자·숫자만 [확인 필요 — 카페24 ID 길이 규칙] */
export const isMallId = s => /^[a-z0-9]{3,20}$/.test(String(s || ''))
export const normalizeMallId = s => String(s || '').trim().toLowerCase().replace(/\.cafe24\.com.*$/, '').replace(/^https?:\/\//, '')
const hostOf = mallId => {
  if (!isMallId(mallId)) throw new Cafe24Error('invalid_input', '쇼핑몰 ID가 올바르지 않아요.')
  return `https://${mallId}.cafe24api.com`
}

/** 카페24 동의 화면 주소 (브라우저가 연다) */
export function authorizeUrl({ mallId, clientId, state, redirectUri = CAFE24_REDIRECT_URI, scopes = CAFE24_SCOPES }) {
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId, state, redirect_uri: redirectUri, scope: scopes.join(' ') }) // 문서: "공백으로 구분" (URL에서는 +)
  return `${hostOf(mallId)}/api/v2/oauth/authorize?${q.toString()}`
}

// ── state — 누가 시작한 연결인지 (위조·만료 검사). HMAC 키는 MARKETPLACE_ENC_KEY에서 파생(이미지 토큰과 다른 용도 글자) ──
const stateKey = encKey => crypto.createHmac('sha256', encKey).update('cafe24-oauth-state').digest()
const stateSig = (encKey, msg) => crypto.createHmac('sha256', stateKey(encKey)).update(msg).digest('base64url').slice(0, 22)
export function makeState(encKey, userId, nowSec = Math.floor(Date.now() / 1000)) {
  const uid = String(userId).replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(uid)) throw new Error('state 재료가 올바르지 않음')
  const exp = (nowSec + STATE_TTL_SEC).toString(36)
  const nonce = crypto.randomBytes(9).toString('base64url')
  const body = `${STATE_PREFIX}.${uid}.${exp}.${nonce}`
  return `${body}.${stateSig(encKey, body)}`
}
/** @returns {boolean} 이 사용자가 10분 안에 시작한 연결인지 */
export function verifyState(encKey, state, userId, nowSec = Math.floor(Date.now() / 1000)) {
  const parts = String(state || '').split('.')
  if (parts.length !== 5 || parts[0] !== STATE_PREFIX) return false
  const [, uid, exp36, nonce, s] = parts
  if (uid !== String(userId).replace(/-/g, '').toLowerCase() || !/^[0-9a-z]{1,8}$/.test(exp36) || !/^[A-Za-z0-9_-]{8,16}$/.test(nonce)) return false
  if (parseInt(exp36, 36) < nowSec) return false
  const want = stateSig(encKey, parts.slice(0, 4).join('.'))
  return s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))
}

/** 시간대 없는 카페24 시각 → ISO (한국 시각으로 읽음 — 위 [확인 필요]) */
export function cafe24Time(s) {
  const t = String(s || '').trim()
  if (!t) return null
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(t) ? t : `${t}+09:00`)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}
/** 동의에서 빠진 권한 */
export const missingScopes = scopes => CAFE24_SCOPES.filter(s => !(Array.isArray(scopes) ? scopes : []).includes(s))

/** 카페24 오류 응답 → 고객 문구 (null = 성공) */
export function translateCafe24(status, text = '') {
  const t = String(text || '')
  if (status === 0) return { code: 'market_unreachable', message: '카페24가 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  if (status < 400) return null // 성공 본문에도 client_id 같은 글자가 있으므로 글자 검사는 오류 응답에만
  if (/invalid_client|client_id|client_secret|unauthorized_client/i.test(t) || status === 401) return { code: 'bad_key', message: 'Client ID·Secret이 맞지 않아요. 카페24 개발자센터에서 다시 복사해 주세요.' }
  if (/redirect_uri/i.test(t)) return { code: 'bad_redirect', message: `카페24 앱의 Redirect URI에 ${CAFE24_REDIRECT_URI} 를 그대로 넣었는지 확인해 주세요.` }
  if (/invalid_grant|expired|code/i.test(t) && status === 400) return { code: 'code_expired', message: '동의 시간이 지났어요. [연결하기]를 다시 눌러 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '카페24 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 500) return { code: 'market_server', message: '카페24가 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 400) return { code: 'market_rejected', message: `카페24가 요청을 거절했어요 (HTTP ${status}).` }
  return null
}

/** 토큰 응답 → 저장할 모양. 모양이 틀리면 null */
export function normalizeToken(json) {
  if (!json || typeof json.access_token !== 'string' || !json.access_token || typeof json.refresh_token !== 'string' || !json.refresh_token) return null
  const accessExpiresAt = cafe24Time(json.expires_at), refreshExpiresAt = cafe24Time(json.refresh_token_expires_at)
  if (!accessExpiresAt || !refreshExpiresAt) return null
  return { accessToken: json.access_token, refreshToken: json.refresh_token, accessExpiresAt, refreshExpiresAt, scopes: Array.isArray(json.scopes) ? json.scopes.map(String) : [], mallId: json.mall_id ? String(json.mall_id) : null }
}

/**
 * 토큰 요청 한 번 (코드 교환·갱신 공용). 재시도 없음. 실패 = Cafe24Error throw
 * @param {{ mallId, clientId, clientSecret, breakerKey, fetchImpl? }} c @param {Record<string,string>} form
 */
async function tokenCall(c, form) {
  const breaker = breakerFor(`cafe24:${c.breakerKey || ''}`)
  const left = breaker.blockedFor()
  if (left > 0) throw new Cafe24Error('breaker_open', `카페24 오류가 잦아 잠시 멈췄어요. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)
  const url = `${hostOf(c.mallId)}/api/v2/oauth/token`
  const headers = { 'Authorization': `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`, 'utf8').toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }
  const fetchImpl = c.fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let r, text
  try {
    r = await fetchImpl(url, { method: 'POST', headers, body: new URLSearchParams(form).toString(), signal: controller.signal })
    text = await r.text()
  } catch (e) {
    breaker.recordError()
    throw new Cafe24Error('market_unreachable', '카페24가 응답하지 않아요. 잠시 후 다시 시도해 주세요.', { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  const scrub = s => String(s || '').replace(/"(access_token|refresh_token)"\s*:\s*"[^"]*"/g, '"$1":"[가림]"')
  const tr = translateCafe24(r.status, text)
  if (tr) {
    breaker.recordError()
    throw new Cafe24Error(tr.code, tr.message, { status: r.status, raw: scrub(text) })
  }
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* 아래에서 모양 검사 */ }
  const tok = normalizeToken(json)
  if (!tok) {
    breaker.recordError()
    throw new Cafe24Error('market_bad_json', '카페24 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.', { status: r.status, raw: scrub(text) })
  }
  breaker.recordOk()
  return tok
}

/** 동의 뒤 받은 코드 → 토큰 (코드는 1분·1회) */
export const exchangeCode = (c, code, redirectUri = CAFE24_REDIRECT_URI) => tokenCall(c, { grant_type: 'authorization_code', code: String(code || ''), redirect_uri: redirectUri })
/** 갱신 — 새 refresh_token이 오고 예전 것은 폐기되므로 부르는 쪽이 바로 저장해야 한다 */
export const refreshAccess = (c, refreshToken) => tokenCall(c, { grant_type: 'refresh_token', refresh_token: String(refreshToken || '') })

export const REFRESH_BEFORE_DAYS = 7
/** 연결 유지 — refresh 만료가 7일 안으로 남았고 아직 안 지났으면 갱신할 때 */
export const needsRefresh = (refreshExpiresAt, now = Date.now()) => {
  const t = new Date(refreshExpiresAt || 0).getTime()
  return Number.isFinite(t) && t > now && t - now < REFRESH_BEFORE_DAYS * 86400000
}
