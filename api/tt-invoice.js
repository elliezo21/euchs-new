/**
 * Vercel Serverless Function: /api/tt-invoice
 * T/T 해외송금(USD) 1차 결제용 PROFORMA INVOICE 발행 — 로그인 필수, 주문 당사자만
 *
 * POST { orderId }   (orders.id uuid)
 * →    { success: true, invoice: 스냅샷, fixed: 수취 고정정보, seal: 도장 PNG base64 }
 *      { success: false, reason: 'bad_request'|'not_found'|'forbidden'|'status'|'amount'|'amount_changed'|'items'|'rate_unavailable'|'unavailable' }
 *
 * ★ 발행 시점 고정: orders.tt_invoice가 이미 있으면 그 스냅샷을 그대로 돌려준다(환율 재조회·재계산 없음).
 *   새로 발행할 때도 "tt_invoice is null" 조건으로만 기록해 동시 요청이 서로 덮지 않게 한다.
 * ★ orders.tt_invoice는 DB 트리거(guard_order_payment_fields)가 고객 브라우저의 쓰기를 막으므로
 *   여기(service_role)에서만 기록한다.
 * ★ BUYER(송금인) 정보는 고객이 수정할 수 있으므로 스냅샷에 넣지 않는다 — 화면이 profiles에서 읽는다.
 *
 * ── 관리자 action (POST { action, orderId, ... }) — 관리자·스태프만 (is_admin_or_staff) ──
 *   admin_get          : 스냅샷(없으면 null — 관리자는 발행하지 않는다) + 수취 고정정보 + 도장 + 주문 고객 BUYER 정보
 *   admin_update_lines : { descriptions: string[] } 품목 줄의 영문 품명만 교체 (수량·단가·금액·줄 수·환율·총액은 그대로)
 *   admin_update_buyer : { companyNameEn, addressEn, addressDetailEn } 주문 고객 profiles의 영문 3칸만 수정
 *   admin_reset        : 결제대기(quote_confirmed)일 때만 tt_invoice = null + orders.tt_invoice_log 배열에 초기화 기록 1건 추가
 *   ★ body에 금액·환율 등 다른 값을 넣어 보내도 읽지 않는다(위 키만 사용).
 *
 * 환경변수: SUPABASE_URL(또는 VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import { verifyUserToken } from './bulk-item-detail.js'
import { fetchHanaUsdSendRate, HANA_SEND_RATE_TYPE, krwToUsdCents, buildInvoiceLines, kstDateStr } from './_ttInvoice.js'
import { TT_REMITTANCE_FIXED } from './_ttRemittance.js'
import { TT_SEAL_PNG_BASE64 } from './_ttSeal.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ORDER_COLUMNS = 'id,order_no,order_number,user_id,status,total_price_krw,first_payment,items,tt_invoice,tt_invoice_log'
const BUYER_COLUMNS = 'company_name,company_name_en,business_number,business_address_en,business_address_detail_en,phone'
const ADMIN_ACTIONS = ['admin_get', 'admin_update_lines', 'admin_update_buyer', 'admin_reset']
// 품목 영문 품명: PDF 영문 전용 — 영문·숫자·공백·, . - & ( ) / '
const LINE_DESC_RE = /^[A-Za-z0-9 ,.\-&()/']{1,60}$/
// BUYER 영문 칸: 고객 수정(TtRemittanceModal EN_ALLOWED_RE)과 같은 규칙 — 영문·숫자·공백·, . - & ( ) / ' #
const BUYER_EN_RE = /^[A-Za-z0-9 ,.\-&()/'#]*$/

function getServiceRoleConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return { url, serviceRoleKey }
}

async function readOrder(orderId, url, serviceRoleKey) {
  const r = await fetch(`${url}/rest/v1/orders?select=${ORDER_COLUMNS}&id=eq.${encodeURIComponent(orderId)}`, {
    headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(`orders 조회 실패: ${err?.message || r.status}`)
  }
  const rows = await r.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

/** tt_invoice가 비어 있을 때만 기록. @returns {Promise<number>} 기록된 행 수 (0 = 다른 요청이 먼저 기록함) */
async function saveInvoiceIfEmpty(orderId, invoice, url, serviceRoleKey) {
  const r = await fetch(`${url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&tt_invoice=is.null`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ tt_invoice: invoice }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(`orders.tt_invoice 기록 실패: ${err?.message || r.status}`)
  }
  const rows = await r.json()
  return Array.isArray(rows) ? rows.length : 0
}

function ok(res, invoice) {
  // 관리자 user id(editedBy)는 고객 응답에 싣지 않는다
  const { editedBy, ...forCustomer } = invoice || {}
  return res.status(200).json({ success: true, invoice: forCustomer, fixed: TT_REMITTANCE_FIXED, seal: TT_SEAL_PNG_BASE64 })
}

/**
 * 관리자 세션 토큰 검증 (api/1688-order-create.js의 verifyAdminToken과 동일 로직 — 그 함수는 export되지 않아
 * api/home-section-cache.js처럼 같은 로직을 둔다). is_admin_or_staff RPC는 Bearer에 "사용자 토큰"을 넣어야
 * 사용자 기준으로 판정된다(service_role key를 Bearer로 넣으면 항상 true — 절대 금지).
 */
async function verifyAdminToken(token, url, serviceRoleKey) {
  if (!token) return { ok: false, error: '인증 토큰 없음' }
  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${token}` },
    })
    if (!userRes.ok) return { ok: false, error: '유효하지 않은 세션 토큰' }
    const userData = await userRes.json()
    if (!userData?.id) return { ok: false, error: '세션에서 user_id 추출 실패' }

    const rpcRes = await fetch(`${url}/rest/v1/rpc/is_admin_or_staff`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (!rpcRes.ok) {
      const errBody = await rpcRes.json().catch(() => ({}))
      return { ok: false, error: `is_admin_or_staff RPC 오류: ${errBody?.message || rpcRes.status}` }
    }
    const isAdmin = await rpcRes.json()
    if (!isAdmin) return { ok: false, error: '관리자/스태프 권한 없음', userId: userData.id }
    return { ok: true, userId: userData.id, email: userData.email || '' }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function readBuyer(userId, url, serviceRoleKey) {
  const r = await fetch(`${url}/rest/v1/profiles?select=${BUYER_COLUMNS}&id=eq.${encodeURIComponent(userId)}`, {
    headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(`profiles 조회 실패: ${err?.message || r.status}`)
  }
  const rows = await r.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

/**
 * 초기화 기록 각 항목의 by(관리자 user id)로 profiles.email을 조회해 byEmail을 붙인다 (service_role, 응답 전용).
 * 조회 실패·없음이면 byEmail = null (화면은 "확인 필요"). DB 저장값은 바꾸지 않는다.
 */
async function withAdminEmails(log, url, serviceRoleKey) {
  if (log.length === 0) return []
  const ids = [...new Set(log.map(e => e?.by).filter(id => typeof id === 'string' && UUID_RE.test(id)))]
  const emailById = new Map()
  if (ids.length > 0) {
    try {
      const r = await fetch(`${url}/rest/v1/profiles?select=id,email&id=in.(${ids.map(encodeURIComponent).join(',')})`, {
        headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
      })
      if (r.ok) {
        for (const row of await r.json()) if (row?.email) emailById.set(row.id, row.email)
      } else {
        const err = await r.json().catch(() => ({}))
        console.error(`[tt-invoice] 초기화 기록 관리자 이메일 조회 실패: ${err?.message || r.status}`)
      }
    } catch (e) {
      console.error('[tt-invoice] 초기화 기록 관리자 이메일 조회 오류:', e)
    }
  }
  return log.map(e => ({ ...e, byEmail: emailById.get(e?.by) || null }))
}

/** PostgREST PATCH (service_role). filters는 추가 조건 문자열. @returns {Promise<number>} 수정된 행 수 */
async function patchRows(table, filters, patch, url, serviceRoleKey) {
  const r = await fetch(`${url}/rest/v1/${table}?${filters}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(patch),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(`${table} 수정 실패: ${err?.message || r.status}`)
  }
  const rows = await r.json()
  return Array.isArray(rows) ? rows.length : 0
}

async function handleAdmin(req, res, action, url, serviceRoleKey) {
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const admin = await verifyAdminToken(bearerToken, url, serviceRoleKey)
  if (!admin.ok) {
    console.warn(`[tt-invoice] 관리자 action 거부 action=${action}: ${admin.error}`)
    // 로그인 자체가 안 된 경우는 401, 로그인은 됐지만 관리자가 아니면 403
    const notLoggedIn = ['인증 토큰 없음', '유효하지 않은 세션 토큰', '세션에서 user_id 추출 실패'].includes(admin.error)
    return res.status(notLoggedIn ? 401 : 403).json({ success: false, reason: notLoggedIn ? 'not_logged_in' : 'forbidden' })
  }

  const body = req.body || {}
  const orderId = String(body.orderId || '').trim()
  if (!UUID_RE.test(orderId)) return res.status(400).json({ success: false, reason: 'bad_request' })

  const order = await readOrder(orderId, url, serviceRoleKey)
  if (!order) return res.status(404).json({ success: false, reason: 'not_found' })
  const snap = order.tt_invoice || null
  const tag = `action=${action} order=${orderId} admin=${admin.email || admin.userId}`

  // ── admin_get ──
  if (action === 'admin_get') {
    const buyer = order.user_id ? await readBuyer(order.user_id, url, serviceRoleKey) : null
    return res.status(200).json({
      success: true,
      invoice: snap,
      amountChanged: !!snap && Number(snap.krwTotal) !== Number(order.total_price_krw),
      status: order.status,
      totalPriceKrw: order.total_price_krw,
      fixed: TT_REMITTANCE_FIXED,
      seal: TT_SEAL_PNG_BASE64,
      buyer,
      // 초기화 기록 — 관리자 응답에만 (고객 응답 ok()에는 넣지 않는다). byEmail은 응답에만 붙이고 DB에는 없다
      ttInvoiceLog: await withAdminEmails(Array.isArray(order.tt_invoice_log) ? order.tt_invoice_log : [], url, serviceRoleKey),
    })
  }

  // ── admin_update_lines: 품명만 교체 ──
  if (action === 'admin_update_lines') {
    if (!snap || !Array.isArray(snap.lines)) return res.status(200).json({ success: false, reason: 'no_invoice' })
    const descriptions = body.descriptions
    if (!Array.isArray(descriptions) || descriptions.length !== snap.lines.length) {
      return res.status(400).json({ success: false, reason: 'line_count', expected: snap.lines.length })
    }
    const cleaned = descriptions.map(d => (typeof d === 'string' ? d.replace(/\s+/g, ' ').trim() : ''))
    const badIdx = cleaned.findIndex(d => !LINE_DESC_RE.test(d))
    if (badIdx >= 0) return res.status(400).json({ success: false, reason: 'bad_description', index: badIdx })

    const next = {
      ...snap,
      lines: snap.lines.map((l, i) => ({ ...l, description: cleaned[i] })),
      editedAt: new Date().toISOString(),
      editedBy: admin.userId,
    }
    // 그 사이 초기화·재발행됐으면 issuedAt이 달라져 0행 → 덮어쓰지 않는다
    const n = await patchRows('orders', `id=eq.${encodeURIComponent(orderId)}&tt_invoice->>issuedAt=eq.${encodeURIComponent(snap.issuedAt)}`,
      { tt_invoice: next }, url, serviceRoleKey)
    if (n === 0) {
      console.warn(`[tt-invoice] 품명 수정 0행(초기화·재발행됨) ${tag}`)
      return res.status(200).json({ success: false, reason: 'conflict' })
    }
    console.log(`[tt-invoice] 품명 수정 ${tag}: ${snap.lines.map(l => l.description).join('|')} → ${cleaned.join('|')}`)
    return res.status(200).json({ success: true, invoice: next })
  }

  // ── admin_update_buyer: 주문 고객 profiles의 영문 3칸만 ──
  if (action === 'admin_update_buyer') {
    if (!order.user_id) return res.status(200).json({ success: false, reason: 'not_found' })
    const norm = v => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
    const companyNameEn = norm(body.companyNameEn).toUpperCase()
    const addressEn = norm(body.addressEn)
    const addressDetailEn = norm(body.addressDetailEn)
    if (!companyNameEn || companyNameEn.length > 100 || !addressEn || addressEn.length > 200 || addressDetailEn.length > 100) {
      return res.status(400).json({ success: false, reason: 'bad_buyer' })
    }
    if (![companyNameEn, addressEn, addressDetailEn].every(v => BUYER_EN_RE.test(v))) {
      return res.status(400).json({ success: false, reason: 'bad_buyer' })
    }
    // 인증 관련 칸(is_business_verified, verification_status, business_number 등)은 보내지 않는다
    const n = await patchRows('profiles', `id=eq.${encodeURIComponent(order.user_id)}`, {
      company_name_en: companyNameEn,
      business_address_en: addressEn,
      business_address_detail_en: addressDetailEn,
      updated_at: new Date().toISOString(),
    }, url, serviceRoleKey)
    if (n === 0) return res.status(200).json({ success: false, reason: 'not_found' })
    console.log(`[tt-invoice] BUYER 수정 ${tag} user=${order.user_id}`)
    return res.status(200).json({ success: true, buyer: await readBuyer(order.user_id, url, serviceRoleKey) })
  }

  // ── admin_reset: 결제대기에서만, tt_invoice = null + tt_invoice_log에 기록 1건 추가 (한 번의 UPDATE) ──
  if (action === 'admin_reset') {
    if (order.status !== 'quote_confirmed') return res.status(200).json({ success: false, reason: 'status', status: order.status })
    if (!snap) return res.status(200).json({ success: false, reason: 'no_invoice' })
    const entry = {
      at: new Date().toISOString(),
      // 관리자 이메일은 저장하지 않는다 — orders 행은 고객 브라우저도 읽으므로 user id만 둔다(admin_get에서 이메일을 붙여 응답)
      by: admin.userId,
      prevUsd: snap.usdTotal,
      prevRate: snap.rate,
      prevKrw: snap.krwTotal,
      prevIssuedAt: snap.issuedAt,
      prevLines: Array.isArray(snap.lines) ? snap.lines : [],
    }
    // 읽어 둔 로그 배열 끝에 붙여 통째로 쓴다. tt_invoice_log는 초기화(이 action)에서만 바뀌고,
    // 초기화는 "tt_invoice->>issuedAt = 읽은 값" 조건이 걸려 있어 그 사이 다른 초기화·재발행이 있었다면
    // 이 UPDATE는 0행이 된다(→ conflict). 따라서 읽은 뒤 로그가 바뀐 상태를 덮어쓰는 일은 없다.
    const prevLog = Array.isArray(order.tt_invoice_log) ? order.tt_invoice_log : []
    const n = await patchRows('orders',
      `id=eq.${encodeURIComponent(orderId)}&status=eq.quote_confirmed&tt_invoice->>issuedAt=eq.${encodeURIComponent(snap.issuedAt)}`,
      { tt_invoice: null, tt_invoice_log: [...prevLog, entry] }, url, serviceRoleKey)
    if (n === 0) {
      console.warn(`[tt-invoice] 초기화 0행(상태 변경 또는 재발행됨) ${tag}`)
      return res.status(200).json({ success: false, reason: 'conflict' })
    }
    console.log(`[tt-invoice] 초기화 ${tag} 이전 USD ${snap.usdTotal} @ ${snap.rate} (issuedAt ${snap.issuedAt})`)
    return res.status(200).json({ success: true })
  }

  return res.status(400).json({ success: false, reason: 'bad_request' })
}

/**
 * 이미 발행된 스냅샷 반환. 발행 뒤 관리자가 견적 금액을 바꿨으면(스냅샷 원화 ≠ 현재 원화)
 * 옛 금액의 인보이스를 내주지 않는다 — 재계산도 하지 않고 확인 필요로 돌려준다.
 */
function respondWithSnapshot(res, order, userId) {
  const snap = order.tt_invoice
  if (Number(snap?.krwTotal) !== Number(order.total_price_krw)) {
    console.error(`[tt-invoice] 발행된 인보이스 금액과 현재 확정 금액이 다름 order=${order.id} user=${userId} snapshot=${snap?.krwTotal} now=${order.total_price_krw}`)
    return res.status(200).json({ success: false, reason: 'amount_changed' })
  }
  return ok(res, snap)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    console.error('[tt-invoice] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    return res.status(500).json({ success: false, reason: 'unavailable', message: 'Supabase 서버 환경변수 미설정' })
  }

  // ── 0. 관리자 action ──
  const action = req.body?.action
  if (action !== undefined) {
    if (!ADMIN_ACTIONS.includes(action)) return res.status(400).json({ success: false, reason: 'bad_request' })
    try {
      return await handleAdmin(req, res, action, url, serviceRoleKey)
    } catch (e) {
      console.error(`[tt-invoice] 관리자 action 처리 오류 action=${action}:`, e)
      return res.status(500).json({ success: false, reason: 'unavailable' })
    }
  }

  // ── 1. 로그인 검증 (api/juso-english.js와 같은 방식) ──
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const auth = await verifyUserToken(bearerToken, url, serviceRoleKey)
  if (!auth.ok) {
    console.warn('[tt-invoice] 인증 실패:', auth.error)
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const orderId = String(req.body?.orderId || '').trim()
  if (!UUID_RE.test(orderId)) return res.status(400).json({ success: false, reason: 'bad_request' })

  try {
    // ── 2. 주문 조회·권한·상태 ──
    const order = await readOrder(orderId, url, serviceRoleKey)
    if (!order) return res.status(404).json({ success: false, reason: 'not_found' })
    if (order.user_id !== auth.userId) {
      console.warn(`[tt-invoice] 남의 주문 요청 차단 order=${orderId} owner=${order.user_id} user=${auth.userId}`)
      return res.status(403).json({ success: false, reason: 'forbidden' })
    }
    if (order.status !== 'quote_confirmed') {
      return res.status(200).json({ success: false, reason: 'status', status: order.status })
    }
    const krwTotal = Number(order.total_price_krw)
    if (!Number.isInteger(krwTotal) || krwTotal <= 0) {
      console.error(`[tt-invoice] 확정 금액(total_price_krw) 이상 order=${orderId}: ${order.total_price_krw}`)
      return res.status(200).json({ success: false, reason: 'amount' })
    }
    // 예치금 결제 RPC(process_first_payment)와 같은 확인: 견적 확정 금액과 주문 금액이 다르면 발행하지 않는다
    const confirmedRaw = order.first_payment?.firstPaymentKrw
    if (confirmedRaw !== undefined && confirmedRaw !== null && confirmedRaw !== '' && Number(confirmedRaw) !== krwTotal) {
      console.error(`[tt-invoice] 확정 견적 금액 불일치 order=${orderId}: total_price_krw=${krwTotal} firstPaymentKrw=${confirmedRaw}`)
      return res.status(200).json({ success: false, reason: 'amount' })
    }

    // ── 3. 이미 발행됐으면 그 스냅샷 그대로 ──
    if (order.tt_invoice) return respondWithSnapshot(res, order, auth.userId)

    // ── 4. 새로 발행: 환율 ──
    const rate = await fetchHanaUsdSendRate()
    if (!rate.ok) {
      console.error(`[tt-invoice] 하나은행 USD 송금 환율 조회 실패 order=${orderId}: ${rate.error}`)
      return res.status(200).json({ success: false, reason: 'rate_unavailable' })
    }

    // ── 5. 금액·품목 줄 ──
    const usdCents = krwToUsdCents(krwTotal, rate.rate)
    if (usdCents === null) {
      console.error(`[tt-invoice] USD 환산 불가 order=${orderId} krw=${krwTotal} rate=${rate.rate}`)
      return res.status(200).json({ success: false, reason: 'amount' })
    }
    const built = buildInvoiceLines(order.items, usdCents)
    if (!built.ok) {
      console.error(`[tt-invoice] 품목 줄 생성 실패 order=${orderId}: ${built.error}`)
      return res.status(200).json({ success: false, reason: 'items' })
    }

    const now = new Date()
    const invoice = {
      version: 1,
      invoiceNo: order.order_no || order.order_number,
      issuedAt: now.toISOString(),
      issueDateKst: kstDateStr(now),
      krwTotal,
      rate: rate.rate,
      baseRate: rate.baseRate,
      rateType: HANA_SEND_RATE_TYPE,
      rateSource: 'mibank',
      rateAsOf: rate.rateAsOf,
      usdTotal: usdCents / 100,
      lines: built.lines,
    }
    if (!invoice.invoiceNo) {
      console.error(`[tt-invoice] 주문번호(order_no) 없음 order=${orderId}`)
      return res.status(200).json({ success: false, reason: 'unavailable' })
    }

    // ── 6. 스냅샷 저장 (비어 있을 때만). 0행이면 동시 요청이 먼저 기록 → 그 값을 다시 읽어 돌려준다 ──
    const saved = await saveInvoiceIfEmpty(orderId, invoice, url, serviceRoleKey)
    if (saved === 0) {
      const again = await readOrder(orderId, url, serviceRoleKey)
      if (!again?.tt_invoice) {
        console.error(`[tt-invoice] 기록 0행인데 스냅샷도 없음 order=${orderId}`)
        return res.status(200).json({ success: false, reason: 'unavailable' })
      }
      return respondWithSnapshot(res, again, auth.userId)
    }
    console.log(`[tt-invoice] 발행 order=${orderId} krw=${krwTotal} rate=${rate.rate}(${rate.rateAsOf}) base=${rate.baseRate} usd=${invoice.usdTotal} lines=${built.lines.length}`)
    return ok(res, invoice)
  } catch (e) {
    console.error(`[tt-invoice] 처리 오류 order=${orderId} user=${auth.userId}:`, e)
    return res.status(500).json({ success: false, reason: 'unavailable' })
  }
}
