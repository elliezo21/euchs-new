/**
 * 스튜디오 API 공통 헬퍼 (파일명이 _로 시작하므로 Vercel 라우트로 노출되지 않는다)
 *
 * 모든 스튜디오 API는 handler 첫 줄에서 studioGuard()를 부른다.
 * 검사 순서 (바꾸지 말 것):
 *   1. 스위치   STUDIO_ENABLED 가 'admin' | 'all' 이 아니면 503 studio_disabled
 *   2. 토큰     api/bulk-item-detail.js의 verifyUserToken() 재사용 → 실패 시 401 unauthorized
 *   3. admin    관리자·스태프만 (DB 함수 is_admin_or_staff()와 같은 조건) → 아니면 403 not_admin
 *   4. all      studio_entitlements 행 + valid_until 유효 → 아니면 403 no_entitlement
 *   5. 소유권   loadOwnedRow() — 남의 행이면 404 (403이면 존재 여부가 샌다)
 *
 * 에러 응답 형식은 하나: { code, message }. 프런트는 code로 분기한다.
 *
 * 환경변수 (전부 VITE_ 없이 — VITE_를 붙이면 브라우저 번들에 실려 나간다):
 *   STUDIO_ENABLED               off | admin | all  (없으면 off)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ONEBOUND_KEY, ONEBOUND_SECRET
 *   STUDIO_ONEBOUND_DAILY_CAP    스튜디오 전체 OneBound 하루 상한 (기본 100)
 *   MODELSTUDIO_API_KEY, MODELSTUDIO_BASE_URL, STUDIO_MT_PER_MINUTE  (번역 API에서 사용 — Phase 1-4 이후)
 */

import { verifyUserToken } from './bulk-item-detail.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// is_admin_or_staff()의 role 조건과 같은 목록
const ADMIN_ROLES = ['super_admin', 'staff', 'admin']

const DEFAULT_ONEBOUND_DAILY_CAP = 100
const DEFAULT_MAX_IMAGES = 50

/**
 * 프로젝트당 최대 이미지 장수 — studio-upload(prepare)와 studio-ingest가 같은 값을 쓴다.
 * 환경변수 STUDIO_MAX_IMAGES (없으면 50). 요청 시점에 읽는다
 * (로컬 dev 프록시는 process.env를 요청마다 주입하므로 모듈 로드 시점에 고정하면 안 된다).
 */
export function studioMaxImages() {
  const raw = process.env.STUDIO_MAX_IMAGES
  if (raw === undefined || raw === '') return DEFAULT_MAX_IMAGES
  const n = Number(raw)
  if (Number.isInteger(n) && n > 0) return n
  console.warn(`[studio] STUDIO_MAX_IMAGES 값이 양의 정수가 아님 — 기본값 ${DEFAULT_MAX_IMAGES} 사용`)
  return DEFAULT_MAX_IMAGES
}

/** 스튜디오 환경설정 — 값은 절대 로그로 찍지 않는다 */
export function getStudioConfig() {
  let oneboundDailyCap = DEFAULT_ONEBOUND_DAILY_CAP
  const rawCap = process.env.STUDIO_ONEBOUND_DAILY_CAP
  if (rawCap !== undefined && rawCap !== '') {
    const n = Number(rawCap)
    if (Number.isInteger(n) && n >= 0) oneboundDailyCap = n
    else console.warn(`[studio] STUDIO_ONEBOUND_DAILY_CAP 값이 정수가 아님 — 기본값 ${DEFAULT_ONEBOUND_DAILY_CAP} 사용`)
  }
  return {
    mode: process.env.STUDIO_ENABLED || 'off',
    supabaseUrl: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    oneboundKey: process.env.ONEBOUND_KEY || '',
    oneboundSecret: process.env.ONEBOUND_SECRET || '',
    oneboundDailyCap,
    modelstudioApiKey: process.env.MODELSTUDIO_API_KEY || '',
    modelstudioBaseUrl: process.env.MODELSTUDIO_BASE_URL || '',
    mtPerMinute: process.env.STUDIO_MT_PER_MINUTE || '',
  }
}

/** 통일된 에러 응답 */
export function sendError(res, status, code, message) {
  return res.status(status).json({ code, message: message || code })
}

/**
 * service_role로 Supabase REST 호출. 실패는 throw (호출부가 원인을 로그로 남기고 응답을 정한다).
 * @returns {Promise<any>} JSON 본문 (return=minimal이면 null)
 */
export async function sb(cfg, path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    'apikey': cfg.serviceRoleKey,
    'Authorization': `Bearer ${cfg.serviceRoleKey}`,
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (prefer) headers['Prefer'] = prefer
  const r = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  if (!r.ok) {
    let msg = text
    try { msg = JSON.parse(text)?.message || text } catch { /* 본문이 JSON이 아님 — text 그대로 사용 */ }
    const err = new Error(`${method} ${path.split('?')[0]} ${r.status}: ${msg}`)
    err.status = r.status
    throw err
  }
  return text ? JSON.parse(text) : null
}

/**
 * JWT payload의 email 클레임 — DB의 auth.jwt()->>'email'과 같은 값.
 * verifyUserToken()으로 서명·유효성이 확인된 토큰에만 쓴다.
 */
function jwtEmail(token) {
  try {
    const part = token.split('.')[1] || ''
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const email = JSON.parse(json)?.email
    return typeof email === 'string' && email ? email : null
  } catch (e) {
    console.warn('[studio] JWT email 클레임 해석 실패:', e.message)
    return null
  }
}

/** PostgREST or=() 안에 넣을 값 — 점·쉼표가 섞인 이메일은 큰따옴표로 감싼다 */
function orValue(v) {
  return `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * 관리자·스태프 판정 — 운영 DB의 is_admin_or_staff() 정의와 같은 조건 (2026-09-24 pg_get_functiondef로 확인):
 *   EXISTS user_roles WHERE (user_id = auth.uid() OR email = auth.jwt()->>'email') AND role IN (super_admin, staff, admin)
 *   OR EXISTS profiles WHERE (id = auth.uid() OR email = auth.jwt()->>'email') AND role IN (super_admin, staff, admin)
 *   OR auth.jwt()->>'role' = 'service_role'   ← 사용자 토큰만 받으므로 해당 없음
 * ※ supabase/admin_roles_schema.sql의 옛 정의에는 profiles 조건이 없다. 운영 정의를 따른다.
 */
async function isAdminOrStaff(cfg, userId, email) {
  const roleIn = `role=in.(${ADMIN_ROLES.join(',')})`
  const urCond = email ? `or=(user_id.eq.${userId},email.eq.${orValue(email)})` : `user_id=eq.${userId}`
  const pfCond = email ? `or=(id.eq.${userId},email.eq.${orValue(email)})` : `id=eq.${userId}`
  const [ur, pf] = await Promise.all([
    sb(cfg, `user_roles?select=role&${roleIn}&${encodeURI(urCond)}&limit=1`),
    sb(cfg, `profiles?select=role&${roleIn}&${encodeURI(pfCond)}&limit=1`),
  ])
  return (Array.isArray(ur) && ur.length > 0) || (Array.isArray(pf) && pf.length > 0)
}

/** 유효한 이용권 행이 있는가 (valid_until null = 무기한) */
async function hasEntitlement(cfg, userId) {
  const now = encodeURIComponent(new Date().toISOString())
  const rows = await sb(cfg,
    `studio_entitlements?select=user_id&user_id=eq.${userId}&or=(valid_until.is.null,valid_until.gt.${now})&limit=1`)
  return Array.isArray(rows) && rows.length > 0
}

/**
 * 공통 관문. 통과하면 ctx를 돌려주고, 막히면 응답을 이미 보낸 뒤 null을 돌려준다.
 *   const ctx = await studioGuard(req, res); if (!ctx) return
 * @returns {Promise<null | { cfg, userId, email, isAdmin, mode, skipUserCap }>}
 */
export async function studioGuard(req, res, { method = 'POST' } = {}) {
  const cfg = getStudioConfig()

  // 1. 스위치
  if (cfg.mode !== 'admin' && cfg.mode !== 'all') {
    sendError(res, 503, 'studio_disabled', '스튜디오가 꺼져 있습니다.')
    return null
  }

  if (req.method !== method) {
    sendError(res, 405, 'method_not_allowed', `${method}만 허용됩니다.`)
    return null
  }

  if (!cfg.supabaseUrl || !cfg.serviceRoleKey) {
    console.error('[studio] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    sendError(res, 500, 'server_misconfigured', '서버 설정 오류')
    return null
  }

  // 2. 토큰 — 기존 verifyUserToken 그대로
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const auth = await verifyUserToken(token, cfg.supabaseUrl, cfg.serviceRoleKey)
  if (!auth.ok) {
    console.warn('[studio] 인증 실패:', auth.error)
    sendError(res, 401, 'unauthorized', '로그인이 필요합니다.')
    return null
  }
  const userId = auth.userId
  const email = jwtEmail(token)

  try {
    if (cfg.mode === 'admin') {
      // 3. 관리자 전용 모드
      const isAdmin = await isAdminOrStaff(cfg, userId, email)
      if (!isAdmin) {
        sendError(res, 403, 'not_admin', '관리자만 사용할 수 있습니다.')
        return null
      }
      // 관리자 테스트는 이용권 행이 없으므로 셀러 하루 상한은 건너뛴다(전체 하루 상한은 그대로 적용)
      return { cfg, userId, email, isAdmin: true, mode: cfg.mode, skipUserCap: true }
    }

    // 4. 전체 공개 모드 — 이용권 필수
    const ok = await hasEntitlement(cfg, userId)
    if (!ok) {
      sendError(res, 403, 'no_entitlement', '스튜디오 이용 권한이 없습니다.')
      return null
    }
    return { cfg, userId, email, isAdmin: false, mode: cfg.mode, skipUserCap: false }
  } catch (e) {
    console.error('[studio] 권한 조회 실패:', e.message)
    sendError(res, 500, 'internal', '권한 확인 중 오류가 발생했습니다.')
    return null
  }
}

/**
 * 5. 소유권 — id의 행을 읽되 user_id가 요청자와 다르면 없는 것처럼 null.
 * 호출부는 null이면 404 { code:'not_found' }로 응답한다 (403 금지: 존재 여부가 샌다).
 * studio_projects는 삭제 표시(deleted_at)된 행도 없는 것으로 본다.
 */
export async function loadOwnedRow(ctx, table, id, select = '*') {
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null
  const extra = table === 'studio_projects' ? '&deleted_at=is.null' : ''
  const rows = await sb(ctx.cfg,
    `${table}?select=${select}&id=eq.${id}&user_id=eq.${ctx.userId}${extra}&limit=1`)
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

// ── Storage (service_role) ──────────────────────────────────────────────────
// 엔드포인트는 @supabase/storage-js 소스(createSignedUploadUrl / download / remove)와 같다.
const STORAGE_DOWNLOAD_TIMEOUT_MS = 20000

/**
 * 1회용 서명 업로드 URL의 token 발급. x-upsert를 보내지 않으므로 같은 경로 덮어쓰기는 불가(409, 실측).
 * 토큰은 경로에 묶여 있어 다른 경로에는 쓸 수 없다(400 Invalid signature, 실측).
 * @returns {Promise<string>} token
 */
export async function storageSignUpload(cfg, bucket, path) {
  const r = await fetch(`${cfg.supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'apikey': cfg.serviceRoleKey,
      'Authorization': `Bearer ${cfg.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`storage sign ${r.status}: ${text.slice(0, 200)}`)
  const rel = JSON.parse(text)?.url
  const token = rel ? new URL(`${cfg.supabaseUrl}/storage/v1${rel}`).searchParams.get('token') : null
  if (!token) throw new Error('storage sign: 응답에 token 없음')
  return token
}

/**
 * 파일 받기. 없으면 { found:false } (Storage는 없는 파일에 400 + statusCode '404' 또는 404를 준다).
 * 그 밖의 실패는 throw.
 * @returns {Promise<{ found:true, buf:Buffer } | { found:false }>}
 */
export async function storageDownload(cfg, bucket, path) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STORAGE_DOWNLOAD_TIMEOUT_MS)
  try {
    const r = await fetch(`${cfg.supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      headers: { 'apikey': cfg.serviceRoleKey, 'Authorization': `Bearer ${cfg.serviceRoleKey}` },
      signal: controller.signal,
    })
    if (r.ok) return { found: true, buf: Buffer.from(await r.arrayBuffer()) }
    const text = await r.text()
    let body = null
    try { body = JSON.parse(text) } catch { /* JSON이 아닌 오류 본문 — 아래에서 text로 보고 */ }
    if (r.status === 404 || String(body?.statusCode) === '404' || body?.error === 'not_found') return { found: false }
    throw new Error(`storage download ${r.status}: ${text.slice(0, 200)}`)
  } finally {
    clearTimeout(timer)
  }
}

/** 파일 삭제 (여러 개). 실패는 throw */
export async function storageRemove(cfg, bucket, paths) {
  if (paths.length === 0) return
  const r = await fetch(`${cfg.supabaseUrl}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: {
      'apikey': cfg.serviceRoleKey,
      'Authorization': `Bearer ${cfg.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: paths }),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`storage remove ${r.status}: ${text.slice(0, 200)}`)
  }
}
