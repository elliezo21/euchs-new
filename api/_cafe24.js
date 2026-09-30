/**
 * 카페24 — 우리 앱 "EUCHS 스튜디오"(카페24 개발자센터에 우리가 만든 앱)로 OAuth 연결 (2026-09-30 앱 방식 — 예전 "고객이 만든 앱" 방식은 걷어냄)
 * 고객은 쇼핑몰 ID만 넣고 카페24 동의 화면에서 동의한다. Client ID·Secret은 우리 것 하나 — 서버 환경변수 CAFE24_CLIENT_ID·CAFE24_CLIENT_SECRET에서만 읽는다
 * (화면·로그·오류 문구에 절대 넣지 않는다). 토큰은 쿠팡·11번가·스마트스토어와 같은 표(marketplace_accounts)·같은 암호화로 저장.
 *
 * [확인한 곳 — 공식 문서 apidocs.cafe24.com/docs/guide/oauth2-authentication]
 *   동의(코드)  GET  https://{mall_id}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id&state&redirect_uri&scope  (브라우저에서만, 코드 1분·1회)
 *   토큰        POST https://{mall_id}.cafe24api.com/api/v2/oauth/token
 *               헤더 Authorization: Basic base64(client_id:client_secret) · Content-Type: application/x-www-form-urlencoded
 *               본문 grant_type=authorization_code&code&redirect_uri   /   갱신 grant_type=refresh_token&refresh_token
 *   응답        access_token · expires_at · refresh_token · refresh_token_expires_at · client_id · mall_id · user_id · scopes[] · issued_at · shop_no
 *   수명        access 2시간 · refresh 2주 — 갱신하면 새 refresh_token이 오고 예전 것은 폐기된다(그래서 받은 즉시 저장)
 * [App URL — 쇼핑몰 관리자에서 앱을 열 때] 카페24가 App URL에 쿼리를 붙여 연다. 예(카페24 앱스토어 앱의 실제 주소):
 *   ?lang=ko_KR&mall_id=…&nation=KR&shop_no=1&timestamp=1622602765&user_id=…&user_name=…&user_type=P&hmac=…
 *   hmac = base64( HMAC-SHA256( 키 = Client Secret, 글 = 받은 쿼리 원문에서 hmac 칸만 뺀 것 ) ) — 공개 예제 두 곳(PHP·JS)이 같은 방식
 *   [확인 필요] 개발자센터 공식 페이지는 화면이 스크립트로 그려져 원문을 읽지 못함 — 위 방식은 공개 예제 기준. timestamp 허용 범위(±2시간)도 공식 확인 필요
 * [확인 필요] expires_at·refresh_token_expires_at에 시간대 표시가 없다 — 한국 시각(+09:00)으로 읽는다
 * [확인 필요] 오류 응답 본문 모양 — OAuth 표준({ error, error_description })으로 읽는다
 * [고정 IP] 문서에 호출 IP 제한이 없다 → 중계를 거치지 않고 서버에서 바로 부른다
 */
import crypto from 'crypto'
import { breakerFor, NOT_READY_MESSAGE } from './_coupang.js'

// 돌아오는 주소 — 카페24 앱 설정(Redirect URI)에 등록한 두 값과 글자 하나까지 같아야 한다 (심사 반려 1위).
// 동의를 시작한 도메인에 맞춰 고르고, 고른 것을 state에 담아 토큰 교환 때 같은 값을 쓴다.
// CAFE24_REDIRECT_URI(www)는 가이드 파일(src/lib/studioMarketGuides.js)과 같은 값 — 테스트가 대조
export const CAFE24_REDIRECT_URIS = { w: 'https://www.euchs.co.kr/studio/channels/connect', a: 'https://euchs.co.kr/studio/channels/connect' }
export const CAFE24_REDIRECT_URI = CAFE24_REDIRECT_URIS.w
/** 브라우저 주소의 origin → 등록된 돌아오는 주소 열쇠 (비www 운영 도메인만 'a', 나머지는 모두 www) */
export const redirectKeyFor = origin => String(origin || '').replace(/\/$/, '') === 'https://euchs.co.kr' ? 'a' : 'w'
// 앱 권한 — 상품 읽기·쓰기, 상품분류 읽기 (앱 설정과 같은 3개)
export const CAFE24_SCOPES = ['mall.read_product', 'mall.write_product', 'mall.read_category']
export const STATE_PREFIX = 'c24' // 연결 탭에 돌아온 ?code=&state= 중 우리 것만 (구글·카카오 로그인이 돌아올 때 붙는 ?code=와 섞이지 않게)
const STATE_TTL_SEC = 10 * 60
const LAUNCH_TTL_SEC = 2 * 3600 // App URL timestamp 허용 범위 [확인 필요 — 공식 값]
const TIMEOUT_MS = 25000

/** 우리 앱 값 (서버 환경변수). 없으면 null — 부르는 쪽이 "준비 안 됨"(원인 로그) */
export function appCredentials(env = process.env) {
  const clientId = String(env.CAFE24_CLIENT_ID || '').trim(), clientSecret = String(env.CAFE24_CLIENT_SECRET || '').trim()
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

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

/** 카페24 동의 화면 주소 (브라우저가 연다) — redirectUri는 CAFE24_REDIRECT_URIS 값 중 하나만 */
export function authorizeUrl({ mallId, clientId, state, redirectUri = CAFE24_REDIRECT_URI, scopes = CAFE24_SCOPES }) {
  if (!Object.values(CAFE24_REDIRECT_URIS).includes(redirectUri)) throw new Error('등록되지 않은 돌아오는 주소')
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId, state, redirect_uri: redirectUri, scope: scopes.join(' ') }) // 문서: "공백으로 구분" (URL에서는 +)
  return `${hostOf(mallId)}/api/v2/oauth/authorize?${q.toString()}`
}

// ── state — 누가·어느 쇼핑몰·어느 돌아오는 주소로 시작한 연결인지 (위조·만료 검사). HMAC 키는 MARKETPLACE_ENC_KEY에서 파생(이미지 토큰과 다른 용도 글자) ──
// 모양: c24.{사용자 32hex}.{만료 36진}.{nonce}.{쇼핑몰 ID}.{w|a}.{서명} — 시작할 때 DB에 아무것도 쓰지 않는다(쇼핑몰 ID는 서명된 state 안에)
const stateKey = encKey => crypto.createHmac('sha256', encKey).update('cafe24-oauth-state').digest()
const stateSig = (encKey, msg) => crypto.createHmac('sha256', stateKey(encKey)).update(msg).digest('base64url').slice(0, 22)
export function makeState(encKey, userId, mallId, redirectKey = 'w', nowSec = Math.floor(Date.now() / 1000)) {
  const uid = String(userId).replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(uid) || !isMallId(mallId) || !CAFE24_REDIRECT_URIS[redirectKey]) throw new Error('state 재료가 올바르지 않음')
  const exp = (nowSec + STATE_TTL_SEC).toString(36)
  const nonce = crypto.randomBytes(9).toString('base64url')
  const body = `${STATE_PREFIX}.${uid}.${exp}.${nonce}.${mallId}.${redirectKey}`
  return `${body}.${stateSig(encKey, body)}`
}
/** @returns {{ mallId, redirectUri } | null} 이 사용자가 10분 안에 시작한 연결이면 그때 고른 쇼핑몰 ID·돌아오는 주소 */
export function verifyState(encKey, state, userId, nowSec = Math.floor(Date.now() / 1000)) {
  const parts = String(state || '').split('.')
  if (parts.length !== 7 || parts[0] !== STATE_PREFIX) return null
  const [, uid, exp36, nonce, mallId, rk, s] = parts
  if (uid !== String(userId).replace(/-/g, '').toLowerCase() || !/^[0-9a-z]{1,8}$/.test(exp36) || !/^[A-Za-z0-9_-]{8,16}$/.test(nonce) || !isMallId(mallId) || !CAFE24_REDIRECT_URIS[rk]) return null
  if (parseInt(exp36, 36) < nowSec) return null
  const want = stateSig(encKey, parts.slice(0, 6).join('.'))
  if (s.length !== want.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))) return null
  return { mallId, redirectUri: CAFE24_REDIRECT_URIS[rk] }
}

// ── App URL (쇼핑몰 관리자에서 우리 앱을 열 때) — hmac 검증 ──
/**
 * @param {string} rawQuery 브라우저가 받은 쿼리 원문 ('?' 빼고, 인코딩 그대로 — 다시 만들면 글자가 바뀌어 hmac이 틀린다)
 * @returns {{ ok: true, mallId } | { ok: false, reason: 'no_hmac'|'bad_mall'|'bad_time'|'bad_hmac' }}
 */
export function verifyLaunch(clientSecret, rawQuery, nowSec = Math.floor(Date.now() / 1000)) {
  const raw = String(rawQuery || '').replace(/^\?/, '')
  const segs = raw.split('&').filter(Boolean)
  const hmacSegs = segs.filter(s => s.startsWith('hmac='))
  if (hmacSegs.length !== 1 || !clientSecret) return { ok: false, reason: 'no_hmac' }
  const q = new URLSearchParams(raw)
  const mallId = String(q.get('mall_id') || '')
  if (!isMallId(mallId)) return { ok: false, reason: 'bad_mall' }
  const ts = Number(q.get('timestamp'))
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > LAUNCH_TTL_SEC) return { ok: false, reason: 'bad_time' }
  let given
  try { given = Buffer.from(decodeURIComponent(hmacSegs[0].slice(5)), 'utf8') } catch { return { ok: false, reason: 'bad_hmac' } }
  const msg = segs.filter(s => !s.startsWith('hmac=')).join('&') // 원래 순서 그대로, hmac 칸만 뺌
  const want = Buffer.from(crypto.createHmac('sha256', clientSecret).update(msg, 'utf8').digest('base64'), 'utf8')
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return { ok: false, reason: 'bad_hmac' }
  return { ok: true, mallId }
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
  // 앱 값·돌아오는 주소는 우리 것 — 고객이 고칠 수 없으므로 "잠시 후 다시" 한 줄(원인은 부르는 쪽이 console.error)
  if (/invalid_client|client_id|client_secret|unauthorized_client/i.test(t) || status === 401) return { code: 'cafe24_not_ready', reason: 'app_key', message: NOT_READY_MESSAGE }
  if (/redirect_uri/i.test(t)) return { code: 'cafe24_not_ready', reason: 'redirect_uri', message: NOT_READY_MESSAGE }
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
    throw new Cafe24Error(tr.code, tr.message, { status: r.status, raw: `${tr.reason ? `[${tr.reason}] ` : ''}${scrub(text)}` })
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

/** 동의 뒤 받은 코드 → 토큰 (코드는 1분·1회). redirectUri = 동의 주소에 넣었던 값 그대로(state에서 꺼낸 것) */
export const exchangeCode = (c, code, redirectUri = CAFE24_REDIRECT_URI) => tokenCall(c, { grant_type: 'authorization_code', code: String(code || ''), redirect_uri: redirectUri })
/** 갱신 — 새 refresh_token이 오고 예전 것은 폐기되므로 부르는 쪽이 바로 저장해야 한다 */
export const refreshAccess = (c, refreshToken) => tokenCall(c, { grant_type: 'refresh_token', refresh_token: String(refreshToken || '') })

export const REFRESH_BEFORE_DAYS = 7
/** 연결 유지 — refresh 만료가 7일 안으로 남았고 아직 안 지났으면 갱신할 때 */
export const needsRefresh = (refreshExpiresAt, now = Date.now()) => {
  const t = new Date(refreshExpiresAt || 0).getTime()
  return Number.isFinite(t) && t > now && t - now < REFRESH_BEFORE_DAYS * 86400000
}
