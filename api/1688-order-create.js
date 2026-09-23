/**
 * Vercel Serverless Function: /api/1688-order-create
 * OneBound 1688global alibaba.trade.fastCreateOrder 프록시
 *
 * ⚠️  경고: 이 함수는 실제 1688 판매자에게 진짜 주문을 발송하고
 *           실제 결제가 연동되는 기능입니다.
 *           반드시 프론트엔드에서 "정말 발주하시겠습니까?" 확인 모달을
 *           거친 후에만 호출해야 합니다.
 *
 * 엔드포인트: https://api-gw.onebound.cn/1688global/custom
 * method:     com.alibaba.trade/alibaba.trade.fastCreateOrder
 *
 * 인증 (이중 체계):
 *   1. [관리자 JWT 검증] Authorization: Bearer <supabase-access-token>
 *      → supabase.auth.getUser(token) + user_roles 테이블 권한 확인
 *      → 관리자/스태프(super_admin, staff, admin)가 아니면 401
 *   2. [confirmToken] 브라우저 확인 모달 거쳤음을 증명하는 토큰 (하위 방어선)
 *
 * 환경변수 (Vercel 대시보드 → Project Settings → Environment Variables):
 *   SUPABASE_URL              = https://kkqxdvytjcwqiditkqay.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = <service_role key>  ← 절대 브라우저 번들에 노출 금지
 *   ONEBOUND_KEY, ONEBOUND_SECRET, ONEBOUND_SESSION
 *
 * RPC 권한:
 *   claim_purchase_slot / release_purchase_slot 은 service_role 전용
 *   (supabase/lock_purchase_slot_rpc.sql 실행 후)
 */


import { callItemDetail, readCache } from './bulk-item-detail.js'

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'
const ADDRESS_ID = '6402758024' // 圆圆A45 — 청양류 C구 38동 1층 이우, 기본 배송지

// 프론트엔드 확인 절차를 거쳤음을 증명하는 confirmToken 기대값
const EXPECTED_CONFIRM_TOKEN = 'EUCHS_ORDER_CONFIRMED'

// 품목당 발주 수량 상한 — 오타(0 추가 등) 방어용.
// 2026-09-23 999 → 100000 상향: 수량 1000 초과 주문 3건(5000·4000·4000)이 전부 이 상한에 막혀
// 자동발주 실패했고, createOrder.preview는 4000개를 정상 처리했다(1688 쪽 제약이 아님).
const MAX_ORDER_QTY = 100000

/** 수량이 발주 가능한 값인지 — 1 이상 MAX_ORDER_QTY 이하 정수 */
// export: verifySingleSkuOffers와 같은 이유 — 실제 발주 없이 검증하기 위함
export function isValidOrderQty(q) {
  return Number.isInteger(q) && q >= 1 && q <= MAX_ORDER_QTY
}

export function describeInvalidQty(raw) {
  const q = Number(raw)
  if (Number.isInteger(q) && q > MAX_ORDER_QTY) {
    return `수량 ${q}개가 발주 상한 ${MAX_ORDER_QTY}개를 초과합니다`
  }
  return `수량(quantity)이 유효하지 않습니다: ${raw} (1~${MAX_ORDER_QTY} 정수여야 합니다)`
}

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache',
}

// ── Supabase 헬퍼 ──────────────────────────────────────────────────────────────
//
// 【RPC 호출 — service_role key 전용】
//   claim_purchase_slot / release_purchase_slot 은 service_role 전용으로 잠겨 있다.
//   (supabase/lock_purchase_slot_rpc.sql 실행 후 anon/authenticated 차단)
//   → 서버리스 함수만 SUPABASE_SERVICE_ROLE_KEY를 알고 있으므로
//     외부에서 브라우저 콘솔을 통해 직접 호출하는 것이 불가능해진다.
//
// 【관리자 JWT 검증】
//   브라우저가 Authorization: Bearer <access_token> 헤더로 세션 토큰을 전달하면
//   서버가 service_role key로 만든 Admin 클라이언트의 auth.getUser(token)로
//   토큰 유효성을 검증하고, user_roles 테이블에서 권한(super_admin/staff/admin)을 확인.
//   이는 기존 is_admin_or_staff() 함수와 동일한 판정 기준이다.
//
// 【필요 환경변수】
//   SUPABASE_URL              — Vercel 환경변수로 등록 필요
//   SUPABASE_SERVICE_ROLE_KEY — Vercel 환경변수로 등록 필요 (절대 브라우저 노출 금지)

function getServiceRoleConfig() {
  const url            = process.env.SUPABASE_URL            || process.env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return { url, serviceRoleKey }
}

/**
 * Supabase REST RPC 호출 헬퍼 (service_role key 사용)
 * claim_purchase_slot / release_purchase_slot 은 service_role 전용이므로
 * anon key로 호출하면 403 반환됨.
 * @param {string} fnName RPC 함수명
 * @param {object} args   인자 객체 (snake_case)
 * @returns {{ data: any, error: string|null }}
 */
async function callRpc(fnName, args) {
  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    return { data: null, error: 'Supabase 환경변수 미설정 (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' }
  }
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: {
        'apikey':        serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(args),
    })
    const data = await r.json()
    if (!r.ok) {
      return { data: null, error: data?.message || `HTTP ${r.status}` }
    }
    return { data, error: null }
  } catch (e) {
    return { data: null, error: e.message }
  }
}

/**
 * 1688 원본에서 "SKU 없는 단품"인지 재확인한다.
 *
 * ★ 왜 서버가 다시 확인하는가 (2026-09-23):
 *   단품은 1688이 spec_id를 아예 주지 않으므로 specId가 빈 것이 정상이다.
 *   반대로 "옵션 상품인데 specId가 빈" 행은 잘못된 옵션으로 발주될 위험이 있어 막아야 한다.
 *   이 둘은 브라우저가 보낸 값만으로는 구분할 수 없고(구 주문에는 표식 자체가 없다),
 *   발주는 되돌릴 수 없으므로 판정 근거를 서버가 원본에서 직접 확보한다.
 *
 * 판정 기준은 api1688.js fetch1688ProductById의 rawSkus 추출부와 같다 — 원본 skus.sku 길이 0.
 * 조회 창구도 엑셀 대량발주와 같은 것을 쓴다(product_cache 우선 → 미스일 때만 OneBound 실호출).
 *
 * @param {string[]} offerIds
 * @returns {Promise<Map<string, { isSingleSku: boolean, error: string|null }>>}
 *          error가 있으면 판정 실패 — 호출측은 발주하지 말고 그대로 실패시켜야 한다.
 *
 * ※ export 이유: 이 판정은 실제 발주를 내보내지 않고 검증할 방법이 달리 없다.
 *   (핸들러로 확인하려면 관리자 세션으로 진짜 발주를 걸어야 한다)
 */
export async function verifySingleSkuOffers(offerIds) {
  const ids = [...new Set(offerIds.map(id => String(id || '').trim()).filter(Boolean))]
  const out = new Map()
  if (ids.length === 0) return out

  const judge = (data) => {
    const skuArr =
      (data?.skus && Array.isArray(data.skus.sku)) ? data.skus.sku
        : Array.isArray(data?.skus) ? data.skus
          : (data?.sku && Array.isArray(data.sku.sku)) ? data.sku.sku
            : (data?.sku && Array.isArray(data.sku)) ? data.sku
              : null
    // skus 키 자체가 없으면 "SKU 없음"으로 단정할 수 없다 — 판정 실패로 돌린다.
    if (skuArr === null) return null
    return skuArr.length === 0
  }

  const { url, serviceRoleKey } = getServiceRoleConfig()
  const cached = (url && serviceRoleKey) ? await readCache(ids, url, serviceRoleKey) : new Map()

  for (const id of ids) {
    const row = cached.get(id)
    if (row?.status === 'ok' && row.payload) {
      const verdict = judge(row.payload)
      if (verdict !== null) {
        out.set(id, { isSingleSku: verdict, error: null })
        continue
      }
    }

    try {
      const resp = await callItemDetail(id)
      if (!resp?.success || !resp.data) {
        out.set(id, { isSingleSku: false, error: `1688 상품 조회 실패 (${resp?.error_code || resp?.message || '원인 미상'})` })
        continue
      }
      const verdict = judge(resp.data)
      if (verdict === null) {
        out.set(id, { isSingleSku: false, error: '1688 응답에 SKU 정보가 없어 단품 여부를 판정할 수 없습니다.' })
        continue
      }
      out.set(id, { isSingleSku: verdict, error: null })
    } catch (e) {
      out.set(id, { isSingleSku: false, error: `1688 상품 조회 예외: ${e.message}` })
    }
  }

  return out
}

/**
 * 긴급 공지 INSERT — 1688 발주 CRITICAL 장애 시 관리자 대시보드 배너로 노출
 * notices 테이블 (title, content, category, is_pinned, is_important) INSERT
 * 실패해도 예외를 밖으로 던지지 않음 — 마지막 보루는 console.error
 */
async function insertCriticalNotice({ china1688OrderId, orderId, itemIndices, errorMsg }) {
  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) return
  try {
    await fetch(`${url}/rest/v1/notices`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        title: `🚨 [CRITICAL] 1688 발주 DB 기록 실패 — 수동 확인 필요`,
        content: [
          `1688 orderId: ${china1688OrderId}`,
          `orders.id: ${orderId}`,
          `itemIndices: [${(itemIndices || []).join(', ')}]`,
          `오류: ${errorMsg}`,
          `시각: ${new Date().toISOString()}`,
        ].join('\n'),
        category: 'system',
        is_pinned: true,
        is_important: true,
        created_at: new Date().toISOString(),
      }),
    })
  } catch (noticeErr) {
    // notices INSERT도 실패(DB 완전 장애) → 콘솔에만 남김
    console.error('[1688-order-create] 🚨🚨 notices INSERT 실패 (DB 완전 불가):', noticeErr.message)
  }
}

/**
 * 관리자 세션 토큰 검증
 * Authorization: Bearer <token> 헤더를 받아 다음 두 단계로 검증:
 *   1. GET /auth/v1/user — 유효한 Supabase 세션인지 확인, 이메일 추출
 *   2. RPC is_admin_or_staff() 호출 — DB에 정의된 단일 판정 함수 재사용
 *
 * 【is_admin_or_staff() 호출 시 인증 헤더 설계】
 *   - apikey: serviceRoleKey   → Supabase가 함수 실행을 허용하는 신원 헤더
 *   - Authorization: Bearer <사용자 access_token> → auth.uid() / auth.jwt() 컨텍스트
 *   service_role key를 Authorization Bearer로 넣으면 함수 내부의
 *   "OR (auth.jwt()->>'role' = 'service_role')" 절이 발동해 항상 true가 되므로 절대 금지.
 *
 * 【is_admin_or_staff() 함수 시그니처 — admin_roles_schema.sql L24】
 *   CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
 *   RETURNS BOOLEAN  — 파라미터 없음
 *   SECURITY DEFINER
 *   → 내부적으로 auth.uid() / auth.jwt()->>'email' 로 user_roles 조회
 *
 * 【권한 상태 — 실측 확인 (2026-09-13)】
 *   anon key Bearer로 호출 → false (anon은 uid/email이 없으므로)
 *   service_role key Bearer로 호출 → true (내부 OR 절 발동)
 *   사용자 access_token Bearer로 호출 → 해당 사용자의 권한 반환 (정상 동작)
 *   → 별도 GRANT 수정 불필요. 현행 권한 상태로 정상 동작.
 *
 * @param {string} token  사용자 access_token (req.headers.authorization에서 추출)
 * @returns {{ ok: boolean, error: string|null, email: string|null }}
 */
async function verifyAdminToken(token) {
  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    return { ok: false, error: 'Supabase 환경변수 미설정', email: null }
  }
  if (!token) {
    return { ok: false, error: '인증 토큰 없음', email: null }
  }

  try {
    // 1단계: auth/v1/user — 토큰 유효성 검증 + 이메일 추출 (로그용)
    // apikey = service_role key (이 엔드포인트 호출 권한)
    // Authorization Bearer = 검증 대상 사용자 토큰
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: {
        'apikey':        serviceRoleKey,
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!userRes.ok) {
      return { ok: false, error: '유효하지 않은 세션 토큰', email: null }
    }
    const userData = await userRes.json()
    const email = userData?.email || null

    if (!userData?.id) {
      return { ok: false, error: '세션에서 user_id 추출 실패', email: null }
    }

    // 2단계: is_admin_or_staff() RPC — DB 단일 판정 함수 재사용
    // ⚠️  핵심: apikey=serviceRoleKey (RPC 호출 허용), Authorization Bearer=token (사용자 컨텍스트)
    //    Bearer에 token(사용자 JWT)을 넣어야 DB 함수 내부의 auth.uid()/auth.jwt()가
    //    검증 대상 사용자 기준으로 평가된다.
    //    service_role key를 Bearer로 넣으면 함수 내 OR 절이 발동해 항상 true → 절대 금지.
    const rpcRes = await fetch(`${url}/rest/v1/rpc/is_admin_or_staff`, {
      method:  'POST',
      headers: {
        'apikey':        serviceRoleKey,   // RPC 호출 허용
        'Authorization': `Bearer ${token}`, // 사용자 컨텍스트 — auth.uid() 기준
        'Content-Type':  'application/json',
      },
      body: '{}',  // is_admin_or_staff()는 파라미터 없음
    })

    if (!rpcRes.ok) {
      const errBody = await rpcRes.json().catch(() => ({}))
      return { ok: false, error: `is_admin_or_staff RPC 오류: ${errBody?.message || rpcRes.status}`, email }
    }

    const isAdmin = await rpcRes.json()  // BOOLEAN → true / false

    if (!isAdmin) {
      return { ok: false, error: '관리자/스태프 권한 없음', email }
    }

    return { ok: true, error: null, email }
  } catch (e) {
    return { ok: false, error: e.message, email: null }
  }
}




export default async function handler(req, res) {
  // CORS — Authorization 헤더 허용 추가 (관리자 세션 토큰 전달용)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 요청만 허용됩니다.' })
  }

  // ── 안전장치 0: 관리자 JWT 검증 ────────────────────────────────────────
  // Authorization: Bearer <supabase-access-token> 헤더 필수.
  // verifyAdminToken이 Supabase auth.getUser + user_roles 조회를 수행한다.
  // 유효한 관리자/스태프 세션이 없으면 즉시 401 반환.
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const adminCheck = await verifyAdminToken(bearerToken)

  if (!adminCheck.ok) {
    console.warn('[1688-order-create] ⛔ 관리자 인증 실패 — 발주 차단:', {
      error: adminCheck.error,
      hasToken: !!bearerToken,
      timestamp: new Date().toISOString(),
    })
    return res.status(401).json({
      success: false,
      message: `관리자 인증 실패: ${adminCheck.error}`,
      code: 'UNAUTHORIZED',
    })
  }

  // 인증 통과 — 이후 로그에 관리자 이메일 기록
  const adminEmail = adminCheck.email

  // ── 안전장치 1: confirmToken 검증 ──────────────────────────────────────
  const { numIid, specId, quantity, orderNumber, orderId, itemIndex, confirmToken } = req.body || {}

  if (!confirmToken || confirmToken !== EXPECTED_CONFIRM_TOKEN) {
    console.warn('[1688-order-create] ⛔ confirmToken 불일치 — 발주 차단:', {
      orderNumber: orderNumber || '(없음)',
      numIid: numIid || '(없음)',
      receivedToken: confirmToken ? '(값 있으나 불일치)' : '(없음)',
      timestamp: new Date().toISOString(),
    })
    return res.status(403).json({
      success: false,
      message: '발주 확인 토큰이 없거나 올바르지 않습니다. 확인 절차를 거쳐 다시 시도하세요.',
    })
  }

  // ══════════════════════════════════════════════════════════════
  // ── 그룹 모드 분기 (items[] 배열이 있을 때) ──────────────────
  // 같은 sellerId 품목들을 1688 주문 1건으로 묶어 발주
  // ══════════════════════════════════════════════════════════════
  const { items: groupItems, itemIndices: groupItemIndices } = req.body || {}

  if (Array.isArray(groupItems) && groupItems.length > 0) {
    // ── 그룹 파라미터 검증 ─────────────────────────────────────
    if (!orderNumber || !orderId || !Array.isArray(groupItemIndices) || groupItemIndices.length === 0) {
      return res.status(400).json({
        success: false,
        message: '그룹 발주 모드: orderNumber, orderId, itemIndices 배열이 모두 필요합니다.',
      })
    }
    if (groupItems.length !== groupItemIndices.length) {
      return res.status(400).json({
        success: false,
        message: 'items 배열과 itemIndices 배열의 길이가 일치해야 합니다.',
      })
    }
    for (const it of groupItems) {
      const q = Number(it.quantity)
      if (!it.numIid) {
        return res.status(400).json({
          success: false,
          message: `그룹 품목 파라미터 오류: numIid=${it.numIid} specId=${it.specId} quantity=${it.quantity}`,
        })
      }
      if (!isValidOrderQty(q)) {
        return res.status(400).json({
          success: false,
          message: `상품 ${it.numIid}: ${describeInvalidQty(it.quantity)}`,
        })
      }
    }

    // ── specId 없는 품목: 단품인지 원본으로 재확인 ─────────────
    // 단품(1688이 spec_id를 주지 않는 상품)만 통과시키고, 옵션 상품은 여기서 막는다.
    // 잠금(claim)을 잡기 전에 판정한다 — 막힐 품목으로 슬롯을 점유하지 않기 위함.
    const noSpecOfferIds = groupItems
      .filter(it => !String(it.specId || '').trim())
      .map(it => String(it.numIid))
    const singleSkuVerdicts = await verifySingleSkuOffers(noSpecOfferIds)

    for (const it of groupItems) {
      if (String(it.specId || '').trim()) continue
      const v = singleSkuVerdicts.get(String(it.numIid))
      if (!v || v.error) {
        return res.status(400).json({
          success: false,
          message: `상품 ${it.numIid}: ${v?.error || '단품 여부 확인 실패'} — 자동발주를 중단했습니다. 잠시 후 재시도하거나 수동발주로 처리해주세요.`,
        })
      }
      if (!v.isSingleSku) {
        return res.status(400).json({
          success: false,
          message: `상품 ${it.numIid}: 옵션 상품인데 옵션(specId) 정보가 없어 자동발주 불가 — 수동발주로 처리`,
        })
      }
    }

    // ── 환경변수 로드 ───────────────────────────────────────────
    const OB_KEY     = process.env.ONEBOUND_KEY     || ''
    const OB_SECRET  = process.env.ONEBOUND_SECRET  || ''
    const OB_SESSION = process.env.ONEBOUND_SESSION || ''

    if (!OB_KEY || !OB_SECRET || !OB_SESSION) {
      return res.status(500).json({
        success: false,
        message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)',
      })
    }

    // ── 그룹 잠금: claim_group_purchase_slot ────────────────────
    const { data: claimResult, error: claimError } = await callRpc('claim_group_purchase_slot', {
      p_order_id:     orderId,
      p_item_indices: groupItemIndices,
    })

    if (claimError) {
      console.warn('[1688-order-create][GROUP] ⚠️ claim_group_purchase_slot RPC 오류:', {
        euchs_orderNumber: orderNumber,
        orderId,
        groupItemIndices,
        error: claimError,
        timestamp: new Date().toISOString(),
      })
      return res.status(500).json({ success: false, message: 'DB 잠금 RPC 오류: ' + claimError })
    }

    const { ok: claimOk, code: claimCode, message: claimMsg, purchaseNo: existingPno } = claimResult || {}

    if (!claimOk) {
      console.warn('[1688-order-create][GROUP] ⛔ 그룹 잠금 차단 (Abort):', {
        euchs_orderNumber: orderNumber,
        orderId,
        groupItemIndices,
        code: claimCode,
        claimMsg,
        timestamp: new Date().toISOString(),
      })
      return res.status(409).json({
        success: false,
        message: claimMsg || '그룹 내 품목 중 이미 발주 중이거나 완료된 건이 있어 전체 발주를 중단합니다.',
        code: claimCode || 'GROUP_ABORT',
        ...(existingPno ? { purchaseNo: existingPno } : {}),
      })
    }

    // ── cargoParamList 다건 조립 ────────────────────────────────
    // 단품(위에서 원본으로 확인됨)은 specId 키를 아예 넣지 않는다.
    //   2026-09-23 alibaba.createOrder.preview 실측: offerId+quantity만 보내면 정상 응답
    //   (offer 1081424348445 ×4000 → error_code 0000, finalUnitPrice 0.7, sumCarriage ¥274.30).
    //   빈 문자열도 같은 결과였으나, 키를 생략하는 쪽이 의도를 분명히 드러낸다.
    const cargoParamList = groupItems.map(it => {
      const spec = String(it.specId || '').trim()
      return {
        offerId:  String(it.numIid),
        ...(spec ? { specId: spec } : {}),
        quantity: Number(it.quantity),
      }
    })

    const oArgsGroup = {
      flow: 'general',
      addressParam: { addressId: ADDRESS_ID },
      cargoParamList,
    }

    const paramsGroup = new URLSearchParams({
      key:     OB_KEY,
      secret:  OB_SECRET,
      method:  'com.alibaba.trade/alibaba.trade.fastCreateOrder',
      session: OB_SESSION,
      _o_args: JSON.stringify(oArgsGroup),
      lang:    'zh-CN',
    })

    const targetUrlGroup = `${ONEBOUND_BASE_URL}/1688global/custom?${paramsGroup.toString()}`

    console.log('[1688-order-create][GROUP] 🚀 그룹 발주 시도:', {
      euchs_orderNumber: orderNumber,
      adminEmail,
      orderId,
      groupItemIndices,
      cargoCount: cargoParamList.length,
      timestamp: new Date().toISOString(),
    })

    // ── 12초 타임아웃 ───────────────────────────────────────────
    const ctrlGroup = new AbortController()
    const timerGroup = setTimeout(() => ctrlGroup.abort(), 12000)

    let resDataGroup = null
    try {
      const r = await fetch(targetUrlGroup, {
        method: 'GET',
        headers: FETCH_HEADERS,
        signal: ctrlGroup.signal,
      })
      clearTimeout(timerGroup)

      try {
        resDataGroup = await r.json()
      } catch (je) {
        // JSON 파싱 실패 → pending 롤백
        await callRpc('release_group_purchase_slot', {
          p_order_id:     orderId,
          p_item_indices: groupItemIndices,
          p_success:      false,
          p_error_msg:    '원바운드 JSON 파싱 실패',
        })
        return res.status(502).json({ success: false, message: '원바운드 API 응답 파싱 실패' })
      }
    } catch (fetchErr) {
      clearTimeout(timerGroup)

      const isTimeout = fetchErr.name === 'AbortError'
      const errLabel = isTimeout ? '타임아웃 (12초)' : fetchErr.message

      console.warn(`[1688-order-create][GROUP] ${isTimeout ? '⏱️' : '❌'} 1688 API 오류 — unknown_ordered 처리:`, {
        euchs_orderNumber: orderNumber,
        orderId,
        groupItemIndices,
        error: errLabel,
        timestamp: new Date().toISOString(),
      })

      // ── unknown_ordered: pending 롤백 후 subStatus 덮어씌우기 ─
      // 1) 먼저 pending 롤백 (release_group_purchase_slot p_success=false)
      await callRpc('release_group_purchase_slot', {
        p_order_id:     orderId,
        p_item_indices: groupItemIndices,
        p_success:      false,
        p_error_msg:    `unknown_ordered — ${errLabel}`,
      })
      // 2) subStatus를 unknown_ordered로 재UPDATE (단순 JSONB patch)
      //    mark_group_manual_check를 purchaseNo='' 로 호출하여 status만 변경
      await callRpc('mark_group_manual_check', {
        p_order_id:     orderId,
        p_item_indices: groupItemIndices,
        p_purchase_no:  '',
        p_error_msg:    `unknown_ordered — 1688 주문 생성 여부 불확실: ${errLabel}`,
      })
      // 실제 subStatus 값을 unknown_ordered로 쓰기 위해 별도 SQL UPDATE 필요하나,
      // mark_group_manual_check는 manual_check_required를 쓴다.
      // → 대신 notices INSERT로 관리자에게 알리고, 화면에서 manual_check_required 뱃지로 표시.
      //   (unknown_ordered와 manual_check_required 모두 needs_attention 필터에 포함됨)
      await insertCriticalNotice({
        china1688OrderId: '(불확실 — 타임아웃)',
        orderId,
        itemIndices: groupItemIndices,
        errorMsg: `unknown_ordered: ${errLabel}`,
      })

      return res.status(504).json({
        success: false,
        message: `1688 API 오류 (${errLabel}) — 주문 생성 여부 불확실. 관리자 화면에서 수동 확인 필요.`,
        code: 'UNKNOWN_ORDERED',
      })
    }

    // ── 그룹 응답 분석 ─────────────────────────────────────────
    const errCodeGroup = String(resDataGroup?.error_code || '').trim()
    const errMsgGroup  = resDataGroup?.reason || resDataGroup?.error || ''
    const isErrGroup   = errCodeGroup && errCodeGroup !== '0' && errCodeGroup !== '0000'

    console.log('[1688-order-create][GROUP] 원바운드 응답:', {
      euchs_orderNumber: orderNumber,
      error_code: resDataGroup?.error_code,
      reason: resDataGroup?.reason,
      hasResponse: !!resDataGroup?.response,
      orderId: resDataGroup?.response?.orderId || null,
      timestamp: new Date().toISOString(),
    })

    if (isErrGroup) {
      // 1688 명확한 에러 → pending 롤백 (재시도 허용)
      await callRpc('release_group_purchase_slot', {
        p_order_id:     orderId,
        p_item_indices: groupItemIndices,
        p_success:      false,
        p_error_msg:    errMsgGroup || `OneBound 오류 (${errCodeGroup})`,
      })
      return res.status(200).json({
        success: false,
        message: errMsgGroup || `OneBound 오류 (code: ${errCodeGroup})`,
        code: errCodeGroup,
        raw: resDataGroup,
      })
    }

    // ── 그룹 발주 성공 ─────────────────────────────────────────
    const respGroup       = resDataGroup?.response || {}
    const china1688OrderId = respGroup?.orderId || respGroup?.result?.orderId || null

    console.log('[1688-order-create][GROUP] ✅ 그룹 발주 성공:', {
      euchs_orderNumber: orderNumber,
      china_orderId: china1688OrderId,
      groupItemIndices,
      cargoCount: cargoParamList.length,
      timestamp: new Date().toISOString(),
    })

    // ── DB 기록: release_group_purchase_slot ────────────────────
    // ⚠️ 여기서부터 1688 API를 절대 재호출하지 않음 (이중 발주 방지)
    const { data: releaseResult, error: releaseError } = await callRpc('release_group_purchase_slot', {
      p_order_id:     orderId,
      p_item_indices: groupItemIndices,
      p_success:      true,
      p_purchase_no:  String(china1688OrderId || ''),
    })

    if (releaseError || !releaseResult?.ok) {
      const dbErrMsg = releaseError || releaseResult?.message || 'release_group_purchase_slot 실패'

      console.error('[1688-order-create][GROUP] 🚨 CRITICAL — DB 반영 실패 (1688 발주는 성공):', {
        china1688OrderId,
        orderId,
        groupItemIndices,
        error: dbErrMsg,
        timestamp: new Date().toISOString(),
      })

      // manual_check_required 표시 시도
      await callRpc('mark_group_manual_check', {
        p_order_id:     orderId,
        p_item_indices: groupItemIndices,
        p_purchase_no:  String(china1688OrderId || ''),
        p_error_msg:    `DB 반영 실패: ${dbErrMsg}`,
      })

      // 관리자 대시보드 배너 INSERT 시도
      await insertCriticalNotice({
        china1688OrderId: String(china1688OrderId || ''),
        orderId,
        itemIndices: groupItemIndices,
        errorMsg: dbErrMsg,
      })

      // 1688 주문은 생성됐으므로 success:true 반환 (클라이언트가 warning 처리)
      return res.status(200).json({
        success: true,
        orderId: china1688OrderId,
        warning: 'DB_UPDATE_FAILED — 수동 확인 필요 (이중 발주 방지를 위해 API 재시도 금지)',
      })
    }

    return res.status(200).json({
      success: true,
      orderId: china1688OrderId,
      raw: resDataGroup,
    })
  }
  // ══════════════════════════════════════════════════════════════
  // ── 이하 기존 단건 모드 (items[] 없음) — 코드 변경 없음 ──────
  // ══════════════════════════════════════════════════════════════

  // ── 필수 파라미터 엄격 검증 ───────────────────────────────────────────
  if (!numIid || !quantity || !orderNumber) {
    console.warn('[1688-order-create] ⛔ 필수 파라미터 누락:', {
      hasNumIid: !!numIid,
      hasSpecId: !!specId,
      hasQuantity: !!quantity,
      hasOrderNumber: !!orderNumber,
      timestamp: new Date().toISOString(),
    })
    return res.status(400).json({
      success: false,
      message: '필수 파라미터 누락: numIid(상품ID), quantity(수량), orderNumber(EUCHS 주문번호)가 모두 필요합니다.',
    })
  }

  // quantity 숫자 유효성 검증 — 아래 단품 재확인(OneBound 호출 가능)보다 먼저 본다
  const qty = Number(quantity)
  if (!isValidOrderQty(qty)) {
    return res.status(400).json({
      success: false,
      message: `상품 ${numIid}: ${describeInvalidQty(quantity)}`,
    })
  }

  // ── specId가 없으면 단품인지 원본으로 재확인 (그룹 모드와 같은 규칙) ──
  // 잠금(claim_purchase_slot)을 잡기 전에 판정한다.
  const singleSpec = String(specId || '').trim()
  if (!singleSpec) {
    const verdicts = await verifySingleSkuOffers([String(numIid)])
    const v = verdicts.get(String(numIid))
    if (!v || v.error) {
      return res.status(400).json({
        success: false,
        message: `상품 ${numIid}: ${v?.error || '단품 여부 확인 실패'} — 자동발주를 중단했습니다. 잠시 후 재시도하거나 수동발주로 처리해주세요.`,
      })
    }
    if (!v.isSingleSku) {
      return res.status(400).json({
        success: false,
        message: `상품 ${numIid}: 옵션 상품인데 옵션(specId) 정보가 없어 자동발주 불가 — 수동발주로 처리`,
      })
    }
  }

  // ── 안전장치 3: SECURITY DEFINER RPC 기반 멱등성 가드 ───────────────────
  // claim_purchase_slot RPC가 단일 트랜잭션 안에서
  //   FOR UPDATE 행 잠금 → 상태 검증 → UPDATE 를 원자적으로 수행한다.
  //
  // orderId / itemIndex가 없으면 가드 없이 진행 (executeItemAutoOrder 하위호환)
  const hasDbIdempotency = orderId && typeof itemIndex === 'number' && itemIndex >= 0
  let slotClaimed = false

  if (hasDbIdempotency) {
    const { data: claimResult, error: claimError } = await callRpc('claim_purchase_slot', {
      p_order_id:   orderId,
      p_item_index: itemIndex,
    })

    if (claimError) {
      // RPC 호출 자체 실패 (네트워크 오류, 함수 미배포 등) — 로그만 남기고 진행
      console.warn('[1688-order-create] ⚠️ claim_purchase_slot RPC 오류 — 가드 없이 진행:', {
        euchs_orderNumber: orderNumber,
        error: claimError,
        timestamp: new Date().toISOString(),
      })
    } else {
      const { ok, code, message: claimMsg, purchaseNo: existingPurchaseNo } = claimResult || {}

      if (!ok) {
        // 멱등성 가드 차단: ALREADY_DONE 또는 IN_PROGRESS
        console.warn('[1688-order-create] ⛔ claim_purchase_slot 차단:', {
          euchs_orderNumber: orderNumber,
          orderId,
          itemIndex,
          code,
          claimMsg,
          timestamp: new Date().toISOString(),
        })
        return res.status(409).json({
          success: false,
          message: claimMsg || '중복 발주 차단',
          code: code || 'DUPLICATE_ORDER',
          ...(existingPurchaseNo ? { purchaseNo: existingPurchaseNo } : {}),
        })
      }

      // ok === true → 슬롯 점유 성공
      slotClaimed = true
    }
  }

  // ── 환경변수에서만 인증정보 로드 ─────────────────────────────────────
  const OB_KEY     = process.env.ONEBOUND_KEY     || ''
  const OB_SECRET  = process.env.ONEBOUND_SECRET  || ''
  const OB_SESSION = process.env.ONEBOUND_SESSION || ''

  if (!OB_KEY || !OB_SECRET || !OB_SESSION) {
    console.error('[1688-order-create] ❌ 환경변수 누락:', {
      hasKey: !!OB_KEY,
      hasSecret: !!OB_SECRET,
      hasSession: !!OB_SESSION,
      timestamp: new Date().toISOString(),
    })
    if (slotClaimed) {
      await callRpc('release_purchase_slot', {
        p_order_id: orderId, p_item_index: itemIndex,
        p_success: false, p_error_msg: 'API 인증 환경변수 누락',
      })
    }
    return res.status(500).json({
      success: false,
      message: 'API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)',
    })
  }

  // ── _o_args 조립 ──────────────────────────────────────────────────────
  const oArgs = {
    flow: 'general',
    addressParam: { addressId: ADDRESS_ID },
    // 단품은 specId 키를 넣지 않는다 (그룹 모드와 같은 규칙 — 위 재확인을 통과한 경우만 도달)
    cargoParamList: [{ offerId: String(numIid), ...(singleSpec ? { specId: singleSpec } : {}), quantity: qty }],
  }

  // ── Query string 조립 ────────────────────────────────────────────────
  const params = new URLSearchParams({
    key: OB_KEY,
    secret: OB_SECRET,
    method: 'com.alibaba.trade/alibaba.trade.fastCreateOrder',
    session: OB_SESSION,
    _o_args: JSON.stringify(oArgs),
    lang: 'zh-CN',
  })

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`

  // ── 안전장치 2: 발주 시도 로그 ──────────────────────────────────────
  console.log('[1688-order-create] 🚀 발주 시도 시작:', {
    euchs_orderNumber: orderNumber,
    adminEmail,        // ← 누가 발주 요청했는지 추적
    numIid: String(numIid),
    specId: String(specId),
    quantity: qty,
    addressId: ADDRESS_ID,
    orderId: orderId || '(없음)',
    itemIndex: itemIndex ?? '(없음)',
    dbIdempotencyActive: slotClaimed,
    timestamp: new Date().toISOString(),
    url: targetUrl
      .replace(/secret=[^&]+/, 'secret=***')
      .replace(/session=[^&]+/, 'session=***'),
  })

  // ── 12초 타임아웃 ────────────────────────────────────────────────────
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  let resData = null
  try {
    const r = await fetch(targetUrl, {
      method: 'GET',
      headers: FETCH_HEADERS,
      signal: controller.signal,
    })
    clearTimeout(timer)

    try {
      resData = await r.json()
    } catch (je) {
      console.warn('[1688-order-create] ⚠️ JSON 파싱 실패:', {
        euchs_orderNumber: orderNumber,
        error: je.message,
        timestamp: new Date().toISOString(),
      })
      if (slotClaimed) {
        await callRpc('release_purchase_slot', {
          p_order_id: orderId, p_item_index: itemIndex,
          p_success: false, p_error_msg: '원바운드 JSON 파싱 실패',
        })
      }
      return res.status(502).json({
        success: false,
        message: '원바운드 API 응답을 JSON으로 파싱할 수 없습니다.',
      })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn('[1688-order-create] ⏱️ 요청 타임아웃 (12초 초과):', {
        euchs_orderNumber: orderNumber,
        numIid: String(numIid),
        timestamp: new Date().toISOString(),
      })
      // 타임아웃: 1688에 주문이 이미 생성됐을 수도 있으므로 purchase_pending으로 복구
      if (slotClaimed) {
        await callRpc('release_purchase_slot', {
          p_order_id: orderId, p_item_index: itemIndex,
          p_success: false, p_error_msg: '원바운드 API 타임아웃 (12초)',
        })
      }
      return res.status(504).json({ success: false, message: '원바운드 API 요청 타임아웃 (12초)' })
    }
    console.error('[1688-order-create] ❌ fetch 오류:', {
      euchs_orderNumber: orderNumber,
      error: err.message,
      timestamp: new Date().toISOString(),
    })
    if (slotClaimed) {
      await callRpc('release_purchase_slot', {
        p_order_id: orderId, p_item_index: itemIndex,
        p_success: false, p_error_msg: err.message,
      })
    }
    return res.status(502).json({ success: false, message: '원바운드 API 통신 오류: ' + err.message })
  }

  // ── 응답 분석 ────────────────────────────────────────────────────────
  const errorCode = String(resData?.error_code || '').trim()
  const errorMsg  = resData?.reason || resData?.error || ''
  const isError   = errorCode && errorCode !== '0' && errorCode !== '0000'

  console.log('[1688-order-create] 원바운드 응답 수신:', {
    euchs_orderNumber: orderNumber,
    numIid: String(numIid),
    specId: String(specId),
    quantity: qty,
    error_code: resData?.error_code,
    error: resData?.error,
    reason: resData?.reason,
    hasResponse: !!resData?.response,
    orderId: resData?.response?.orderId || resData?.response?.result?.orderId || null,
    timestamp: new Date().toISOString(),
  })

  // ── 에러 판정 ────────────────────────────────────────────────────────
  if (isError) {
    console.warn('[1688-order-create] ❌ 발주 실패 (API 에러 응답):', {
      euchs_orderNumber: orderNumber,
      numIid: String(numIid),
      specId: String(specId),
      quantity: qty,
      error_code: errorCode,
      reason: errorMsg,
      timestamp: new Date().toISOString(),
    })
    // 실패: purchase_pending 롤백 — 재시도 허용
    if (slotClaimed) {
      await callRpc('release_purchase_slot', {
        p_order_id: orderId, p_item_index: itemIndex,
        p_success: false,
        p_error_msg: errorMsg || `OneBound 오류 (${errorCode})`,
      })
    }
    return res.status(200).json({
      success: false,
      message: errorMsg || `OneBound 오류 (code: ${errorCode})`,
      code: errorCode,
      raw: resData,
    })
  }

  // ── 성공: orderId 추출 ───────────────────────────────────────────────
  const responseData = resData?.response || {}
  const china1688OrderId = responseData?.orderId || responseData?.result?.orderId || null

  console.log('[1688-order-create] ✅ 발주 성공:', {
    euchs_orderNumber: orderNumber,
    china_orderId: china1688OrderId,
    numIid: String(numIid),
    specId: String(specId),
    quantity: qty,
    timestamp: new Date().toISOString(),
  })

  // 성공: release_purchase_slot RPC로 purchase_done + purchaseNo DB 기록
  if (slotClaimed) {
    await callRpc('release_purchase_slot', {
      p_order_id:    orderId,
      p_item_index:  itemIndex,
      p_success:     true,
      p_purchase_no: String(china1688OrderId || ''),
    })
  }

  return res.status(200).json({
    success: true,
    orderId: china1688OrderId,
    raw: resData,
  })
}
