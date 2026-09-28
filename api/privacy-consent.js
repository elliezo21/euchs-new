/**
 * Vercel Serverless Function: /api/privacy-consent — [필수] 개인정보 수집·이용 동의 기록 (로그인 필수, 본인만)
 *
 * POST {} → { ok:true, privacy_agreed_at, privacy_version }
 *   간편 로그인(구글·카카오·네이버)으로 가입했거나 이 기능 전에 가입해 동의 기록이 없는 회원이
 *   로그인 뒤 동의 창(src/components/PrivacyConsentGate.vue)에서 [동의]를 누르면 부른다.
 *   - 동의 시각은 서버 시각(브라우저가 보낸 값은 받지 않는다), 판은 서버 상수 PRIVACY_VERSION(api/_privacyConsent.js)
 *   - 이미 기록이 있으면 덮지 않고 그 값을 돌려준다(첫 동의 시각 유지 — privacy_agreed_at=is.null 조건)
 *   - 쓰기는 service_role만 (profiles 행 id = 토큰의 사용자)
 * 환경변수: SUPABASE_URL(또는 VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY — 값은 로그로 찍지 않는다
 */
import { verifyUserToken } from './bulk-item-detail.js'
import { PRIVACY_VERSION } from './_privacyConsent.js'

function send(res, status, code, message) {
  return res.status(status).json({ ok: false, code, message })
}

async function rest(url, key, path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (prefer) headers.Prefer = prefer
  const r = await fetch(`${url}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await r.text()
  if (!r.ok) throw new Error(`${method} ${path.split('?')[0]} ${r.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, 'method_not_allowed', 'POST만 허용됩니다.')
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) {
    console.error('[privacy-consent] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    return send(res, 500, 'server_misconfigured', '서버 설정 오류')
  }
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const auth = await verifyUserToken(token, url, key)
  if (!auth.ok) return send(res, 401, 'unauthorized', '로그인이 필요합니다.')
  const uid = auth.userId

  try {
    const updated = await rest(url, key, `profiles?id=eq.${uid}&privacy_agreed_at=is.null&select=privacy_agreed_at,privacy_version`, {
      method: 'PATCH',
      body: { privacy_agreed_at: new Date().toISOString(), privacy_version: PRIVACY_VERSION },
      prefer: 'return=representation',
    })
    if (Array.isArray(updated) && updated[0]) {
      return res.status(200).json({ ok: true, ...updated[0] })
    }
    // 0행 = 이미 동의했거나 회원 정보 행이 없음
    const rows = await rest(url, key, `profiles?id=eq.${uid}&select=privacy_agreed_at,privacy_version&limit=1`)
    const row = Array.isArray(rows) ? rows[0] : null
    if (row?.privacy_agreed_at) return res.status(200).json({ ok: true, ...row })
    console.error('[privacy-consent] 회원 정보 행이 없어 동의를 기록하지 못함:', uid)
    return send(res, 404, 'profile_missing', '회원 정보를 찾지 못했어요. 고객센터(010-9373-1214)로 알려 주세요.')
  } catch (e) {
    console.error('[privacy-consent] 동의 기록 실패:', uid, e.message)
    return send(res, 500, 'internal', '동의를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
}
