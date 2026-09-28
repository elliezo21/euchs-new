/**
 * Vercel Serverless Function: /api/account-withdraw — 회원 탈퇴 (로그인 필수, 본인만)
 *
 * POST { action:'check' }                       → { ok, blockers:[{ code, message, count, orders? }] }
 * POST { action:'withdraw', confirm:'탈퇴합니다' } → { ok:true } 또는 { ok:false, blockers } / 오류 { code, message }
 *
 * 탈퇴하면 (판정은 api/_accountWithdraw.js evaluateWithdrawal — 진행 중 주문·환불 대기·예치금이 있으면 막는다):
 *   1. account_withdrawals에 탈퇴 기록(개인정보 없이 user_id·시각·상태만)을 남긴다
 *   2. Storage studio 버킷의 {uid}/ 아래 파일(스튜디오 사진·완성작)을 모두 지운다
 *   3. 로그인 계정을 완전히 지운다(DELETE /auth/v1/admin/users/{id} — @supabase/auth-js 2.112.3 deleteUser와 같은 호출)
 *      → 외래키 CASCADE로 profiles(이름·전화·주소·통관부호·사업자 정보·예치금 칸), 찜 목록, 최근 본 상품,
 *        스튜디오 작업·사진 기록·설정·사용 기록, 관리자 역할이 함께 지워진다
 *      → applications·withdraw_requests는 SET NULL(기록은 남고 회원 연결만 끊김)
 *      → orders·transactions·deposit_requests는 회원 외래키가 없어 그대로 남는다 = 전자상거래법 5년 보관용 기록
 *      (외래키 동작은 2026-09-28 운영 DB pg_constraint 읽기 전용 조회로 확인)
 *   4. 기록을 done으로 바꾼다. 2·3에서 실패하면 failed + 원인을 남기고 500 — 다시 시도하면 이어서 한다(같은 순서, 이미 지운 것은 건너뜀)
 *
 * 테이블 account_withdrawals가 없으면(SQL docs/sql/2026-09-28-account-withdrawal.sql 실행 전) 503 withdraw_sql_missing — 아무것도 지우지 않는다.
 * 환경변수: SUPABASE_URL(또는 VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY — 값은 로그로 찍지 않는다
 */
import { verifyUserToken } from './bulk-item-detail.js'
import { evaluateWithdrawal, splitListing, CONFIRM_WORD } from './_accountWithdraw.js'

const STUDIO_BUCKET = 'studio'
const LIST_LIMIT = 1000
const REMOVE_BATCH = 100

function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
}
function send(res, status, code, message, extra = {}) {
  return res.status(status).json({ ok: false, code, message, ...extra })
}

/** service_role REST 호출 — 실패는 throw(err.status 포함) */
async function rest(cfg, path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (prefer) headers.Prefer = prefer
  const r = await fetch(`${cfg.url}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await r.text()
  if (!r.ok) {
    const err = new Error(`${method} ${path.split('?')[0]} ${r.status}: ${text.slice(0, 200)}`)
    err.status = r.status
    throw err
  }
  return text ? JSON.parse(text) : null
}

/** is_admin_or_staff는 사용자 토큰으로 불러야 그 사용자 기준으로 판정된다(service_role로 부르면 항상 true) */
async function isStaff(cfg, token) {
  const r = await fetch(`${cfg.url}/rest/v1/rpc/is_admin_or_staff`, {
    method: 'POST',
    headers: { apikey: cfg.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!r.ok) throw new Error(`is_admin_or_staff ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return (await r.json()) === true
}

async function judge(cfg, token, uid) {
  const [staff, orders, profiles, withdrawRequests, depositRequests] = await Promise.all([
    isStaff(cfg, token),
    rest(cfg, `orders?select=order_number,status,refund_completed&user_id=eq.${uid}`),
    rest(cfg, `profiles?select=balance,held_balance&id=eq.${uid}&limit=1`),
    rest(cfg, `withdraw_requests?select=status&user_id=eq.${uid}&status=eq.pending`),
    rest(cfg, `deposit_requests?select=status&user_id=eq.${uid}&status=eq.pending`),
  ])
  const result = evaluateWithdrawal({
    isStaff: staff,
    orders: orders || [],
    profile: Array.isArray(profiles) && profiles[0] ? profiles[0] : null,
    withdrawRequests: withdrawRequests || [],
    depositRequests: depositRequests || [],
  })
  if (result.unknownStatuses.length) {
    console.error('[account-withdraw] 모르는 주문 상태 값 — 진행 중으로 보고 탈퇴를 막음:', uid, result.unknownStatuses)
  }
  return result
}

/** studio 버킷 {uid}/ 아래 모든 파일 경로 (폴더를 따라 내려간다) */
async function listAll(cfg, prefix) {
  const out = []
  const queue = [prefix]
  while (queue.length) {
    const p = queue.shift()
    for (let offset = 0; ; offset += LIST_LIMIT) {
      const r = await fetch(`${cfg.url}/storage/v1/object/list/${STUDIO_BUCKET}`, {
        method: 'POST',
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: p, limit: LIST_LIMIT, offset, sortBy: { column: 'name', order: 'asc' } }),
      })
      const text = await r.text()
      if (!r.ok) throw new Error(`storage list ${r.status}: ${text.slice(0, 200)}`)
      const rows = JSON.parse(text)
      const { files, folders } = splitListing(p, rows)
      out.push(...files)
      queue.push(...folders)
      if (!Array.isArray(rows) || rows.length < LIST_LIMIT) break
    }
  }
  return out
}

async function removeFiles(cfg, paths) {
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const r = await fetch(`${cfg.url}/storage/v1/object/${STUDIO_BUCKET}`, {
      method: 'DELETE',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths.slice(i, i + REMOVE_BATCH) }),
    })
    if (!r.ok) throw new Error(`storage remove ${r.status}: ${(await r.text()).slice(0, 200)}`)
  }
}

/** 로그인 계정 완전 삭제 — 이미 없으면(404) 끝난 것으로 본다 */
async function deleteAuthUser(cfg, uid) {
  const r = await fetch(`${cfg.url}/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ should_soft_delete: false }),
  })
  if (r.ok || r.status === 404) return
  throw new Error(`auth delete ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, 'method_not_allowed', 'POST만 허용됩니다.')
  const cfg = config()
  if (!cfg.url || !cfg.key) {
    console.error('[account-withdraw] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    return send(res, 500, 'server_misconfigured', '서버 설정 오류')
  }
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const auth = await verifyUserToken(token, cfg.url, cfg.key)
  if (!auth.ok) return send(res, 401, 'unauthorized', '로그인이 필요합니다.')
  const uid = auth.userId
  const body = req.body && typeof req.body === 'object' ? req.body : {}

  try {
    const verdict = await judge(cfg, token, uid)
    if (body.action === 'check') return res.status(200).json({ ok: verdict.ok, blockers: verdict.blockers })
    if (body.action !== 'withdraw') return send(res, 400, 'invalid_input', "action은 'check' 또는 'withdraw'여야 합니다.")
    if (body.confirm !== CONFIRM_WORD) return send(res, 400, 'confirm_required', `확인 문구 "${CONFIRM_WORD}"를 입력해 주세요.`)
    if (!verdict.ok) return res.status(409).json({ ok: false, code: 'blocked', blockers: verdict.blockers })

    // 1. 탈퇴 기록 (표가 없으면 아무것도 지우지 않고 멈춘다)
    let recordId
    try {
      const rows = await rest(cfg, 'account_withdrawals', {
        method: 'POST', body: { user_id: uid, status: 'started' }, prefer: 'return=representation',
      })
      recordId = rows?.[0]?.id
    } catch (e) {
      if (e.status === 404 || e.status === 401 || e.status === 403) {
        console.error('[account-withdraw] account_withdrawals를 쓸 수 없음(표·GRANT — docs/sql/2026-09-28-account-withdrawal.sql 실행 전) — 탈퇴 중단:', e.message)
        return send(res, 503, 'withdraw_sql_missing', '탈퇴 기능을 준비하고 있어요. 고객센터(010-9373-1214)로 요청해 주세요.')
      }
      throw e
    }

    try {
      // 2. 스튜디오 파일
      const files = await listAll(cfg, uid)
      await removeFiles(cfg, files)
      // 3. 로그인 계정 (CASCADE로 회원 정보·부가 데이터 파기)
      await deleteAuthUser(cfg, uid)
      // 4. 끝
      await rest(cfg, `account_withdrawals?id=eq.${recordId}`, {
        method: 'PATCH', body: { status: 'done', completed_at: new Date().toISOString(), files_deleted: files.length }, prefer: 'return=minimal',
      })
      return res.status(200).json({ ok: true })
    } catch (e) {
      console.error('[account-withdraw] 탈퇴 처리 중 실패:', uid, e.message)
      await rest(cfg, `account_withdrawals?id=eq.${recordId}`, {
        method: 'PATCH', body: { status: 'failed', error: String(e.message).slice(0, 500) }, prefer: 'return=minimal',
      }).catch(pe => console.error('[account-withdraw] 실패 기록도 못 남김:', recordId, pe.message))
      return send(res, 500, 'withdraw_failed', '탈퇴를 끝내지 못했어요. 잠시 후 다시 시도하거나 고객센터로 알려 주세요.')
    }
  } catch (e) {
    console.error('[account-withdraw] 처리 실패:', body.action, e.message)
    return send(res, 500, 'internal', '처리 중 오류가 발생했습니다.')
  }
}
