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


const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'
const ADDRESS_ID = '6402758024' // 圆圆A45 — 청양류 C구 38동 1층 이우, 기본 배송지

// 프론트엔드 확인 절차를 거쳤음을 증명하는 confirmToken 기대값
const EXPECTED_CONFIRM_TOKEN = 'EUCHS_ORDER_CONFIRMED'

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

  // ── 필수 파라미터 엄격 검증 ───────────────────────────────────────────
  if (!numIid || !specId || !quantity || !orderNumber) {
    console.warn('[1688-order-create] ⛔ 필수 파라미터 누락:', {
      hasNumIid: !!numIid,
      hasSpecId: !!specId,
      hasQuantity: !!quantity,
      hasOrderNumber: !!orderNumber,
      timestamp: new Date().toISOString(),
    })
    return res.status(400).json({
      success: false,
      message: '필수 파라미터 누락: numIid(상품ID), specId(SKU ID), quantity(수량), orderNumber(EUCHS 주문번호)가 모두 필요합니다.',
    })
  }

  // quantity 숫자 유효성 검증
  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
    return res.status(400).json({
      success: false,
      message: `수량(quantity)이 유효하지 않습니다: ${quantity} (1~999 정수여야 합니다)`,
    })
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
    cargoParamList: [{ offerId: String(numIid), specId: String(specId), quantity: qty }],
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
