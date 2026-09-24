/**
 * Vercel Serverless Function: /api/bulk-item-detail
 * 엑셀 대량발주 전용 1688 상품 상세 조회 창구 (로그인 필수)
 *
 * 기존 /api/1688-item-detail과의 차이:
 *   · 로그인한 사용자만 호출 가능 (기존 엔드포인트는 인증이 없어 누구나 호출 가능)
 *   · 여러 offerId를 한 번에 처리 + 서버 안에서 동시 호출 수 제한
 *   · product_cache(서버 공용 캐시)를 앞단에 둬 OneBound 실호출을 줄임
 *   · 고객당 하루 실호출 상한 적용
 *
 * ★ OneBound 호출 자체는 기존 api/1688-item-detail.js의 default handler를
 *   "그대로 import해서 in-process로" 호출한다. 파라미터·엔드포인트(1688global)·
 *   타임아웃(7초)·에러 판정이 한 벌로 유지되도록 코드를 복사하지 않았다.
 *   (fetchDetail/isErrorResponse는 그 파일에서 export되지 않아 개별 import가 불가능하고,
 *    그 파일을 고치는 것은 이번 범위 밖이라 handler 재사용 방식을 택했다)
 *
 * POST { offerIds: string[] }   ← 최대 MAX_IDS_PER_REQUEST개
 * →    { results: { [offerId]: { status:'ok'|'error'|'limit', payload?, error_code?, cached:boolean } } }
 *
 * 환경변수 (api/home-section-cache.js와 동일):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  ← service_role 키는 절대 브라우저 번들에 노출 금지
 *   ONEBOUND_KEY, ONEBOUND_SECRET            ← 기존 handler가 process.env에서 읽음
 */

import itemDetailHandler from './1688-item-detail.js'

// ── 한 요청에 담을 수 있는 최대 상품 수 ──────────────────────────────────────
// 근거: 최악의 경우(전부 캐시 미스 + 전부 OneBound 7초 타임아웃)
//       ceil(8 / 4) = 2웨이브 × 7초 = 14초 + 캐시/DB 오버헤드 ≈ 16초.
//       vercel.json에서 이 함수의 maxDuration을 60초로 선언했으므로 약 3.7배 여유.
const MAX_IDS_PER_REQUEST = 8

// 서버 안에서 동시에 나가는 OneBound 호출 수
const FETCH_CONCURRENCY = 4

// 캐시 유효기간
const OK_TTL_MS = 6 * 60 * 60 * 1000   // 6시간
const ERROR_TTL_MS = 30 * 60 * 1000    // 30분 — 같은 실패 상품 재호출 방지

// 고객당 하루 OneBound 실호출 상한 (캐시 적중은 세지 않음)
const DAILY_CALL_LIMIT = 200

// 만료 캐시 정리
const CLEANUP_PROBABILITY = 0.05       // 요청 20건당 1번꼴
const CLEANUP_BATCH = 200

const OFFER_ID_RE = /^\d{9,16}$/

function getServiceRoleConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return { url, serviceRoleKey }
}

/**
 * 로그인 사용자 검증 — api/home-section-cache.js verifyAdminToken의 앞부분과 같은 방식.
 * 관리자 여부는 보지 않는다(일반 고객이 쓰는 기능).
 * ※ export: api/verify-business.js가 같은 로그인 검증을 그대로 쓴다.
 * @returns {{ ok: boolean, userId: string|null, error: string|null }}
 */
export async function verifyUserToken(token, url, serviceRoleKey) {
  if (!token) return { ok: false, userId: null, error: '인증 토큰 없음' }
  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${token}` },
    })
    if (!userRes.ok) return { ok: false, userId: null, error: '유효하지 않은 세션 토큰' }
    const userData = await userRes.json()
    if (!userData?.id) return { ok: false, userId: null, error: '세션에서 user_id 추출 실패' }
    return { ok: true, userId: userData.id, error: null }
  } catch (e) {
    return { ok: false, userId: null, error: e.message }
  }
}

/** Asia/Seoul 기준 YYYY-MM-DD (UTC로 두면 한국 09:00에 날짜가 바뀌어 고객이 혼란스러움) */
function seoulDateStr() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

// ── payload 축소 ────────────────────────────────────────────────────────────
// 클라이언트의 기존 파서(api1688.js fetch1688ProductById)가 "실제로 읽는 필드만" 남긴다.
// 제외: desc / description / detail_html / desc_img (상세설명 HTML — 상품당 수십 KB)
const PAYLOAD_KEYS = [
  // 식별·제목
  'num_iid', 'title', 'subject', 'Title',
  // 가격·MOQ
  'price', 'Price', 'priceKrw', 'min_num', 'minOrder', 'min_order',
  'price_range', 'quantity_prices', 'step_prices', 'priceRange',
  // 대표 이미지
  'pic_url', 'picUrl', 'MainPictureUrl', 'image', 'imageUrl',
  // 옵션(SKU)
  'props_list', 'props_img', 'prop_imgs', 'sku_props', 'skus', 'sku',
  // 판매자
  'seller_info', 'sellerInfo', 'nick', 'shopName', 'sellerName',
  'seller_id', 'sellerId', 'user_num_id', 'shop_id', 'company',
  // 운임·판매지표
  'freight', 'express_fee', 'deliveryFee', 'shipping_fee',
  'sold_count', 'volume', 'sales', 'repurchaseRate',
]

// 갤러리 이미지 배열은 개수를 제한해서 담는다 (색상 이미지 추출에 쓰이므로 버리진 않음)
const IMAGE_ARRAY_KEYS = ['item_imgs', 'images', 'imgList', 'itemImages', 'PictureList', 'pic_urls', 'picUrls']
const MAX_IMAGES = 20

/**
 * "실제로 존재하는 상품인지" 판정 — 저장 전 필수 검사.
 *
 * ★ 왜 필요한가 (2026-09-22 실측):
 *   없는 상품(num_iid=999999999999)을 조회하면 OneBound는
 *     error_code: "2000", error: "item-not-found"
 *   를 주면서도 item을 `{_ddf, format_check}` 스텁 객체로 함께 내려보낸다.
 *   기존 api/1688-item-detail.js의 isErrorResponse는 `if (data.item || ...) return false`가
 *   error_code 검사보다 먼저라, 이 스텁 때문에 "정상"으로 판정하고 success:true를 반환한다.
 *   그대로 믿으면 빈 payload({})가 status 'ok'로 6시간 캐시되어,
 *   고객에게는 "제목 없음·가격 0·옵션 없음"인 유령 상품이 정상처럼 보인다.
 *
 *   기존 엔드포인트는 이번 범위에서 수정 금지이므로, 이 창구에서 한 겹 더 검사한다.
 *
 * 판정 기준 (파서가 실제로 쓰는 필드로만):
 *   ① num_iid가 요청한 offerId와 같고
 *   ② 제목(title/subject/Title)이 비어 있지 않고
 *   ③ 가격 또는 옵션(SKU/props_list) 중 하나라도 있을 것
 *
 * ※ export: api/studio-product.js가 같은 기준으로 유령 상품을 걸러낸다.
 * @returns {boolean}
 */
export function isRealProduct(data, offerId) {
  if (!data || typeof data !== 'object') return false

  // ① num_iid 일치
  const numIid = String(data.num_iid ?? '').replace(/[^0-9]/g, '')
  if (!numIid || numIid !== String(offerId)) return false

  // ② 제목
  const title = String(data.title || data.subject || data.Title || '').trim()
  if (!title) return false

  // ③ 가격 또는 옵션
  const priceNum = parseFloat(String(data.price ?? data.Price ?? '').replace(/[^0-9.]/g, ''))
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0

  // skus 추출 4분기는 api1688.js fetch1688ProductById의 rawSkus 추출부와 같은 기준
  const skuArr =
    (data.skus && Array.isArray(data.skus.sku)) ? data.skus.sku
      : Array.isArray(data.skus) ? data.skus
        : (data.sku && Array.isArray(data.sku.sku)) ? data.sku.sku
          : (data.sku && Array.isArray(data.sku)) ? data.sku
            : []
  const propsCount = (data.props_list && typeof data.props_list === 'object' && !Array.isArray(data.props_list))
    ? Object.keys(data.props_list).length
    : 0
  const hasOptions = skuArr.length > 0 || propsCount > 0

  return hasPrice || hasOptions
}

function shrinkPayload(data) {
  if (!data || typeof data !== 'object') return null
  const out = {}
  for (const k of PAYLOAD_KEYS) {
    if (data[k] !== undefined && data[k] !== null) out[k] = data[k]
  }
  for (const k of IMAGE_ARRAY_KEYS) {
    const v = data[k]
    if (Array.isArray(v)) out[k] = v.slice(0, MAX_IMAGES)
    else if (v !== undefined && v !== null) out[k] = v
  }
  return out
}

/**
 * 기존 /api/1688-item-detail handler를 in-process로 호출.
 * Vercel req/res 모양만 흉내 내고 실제 로직은 그 파일 것을 그대로 쓴다.
 *
 * ※ export: api/1688-order-create.js가 단품 여부를 원본으로 재확인할 때 같은 창구를 쓴다.
 *   (조회 경로가 갈라지면 캐시·타임아웃·에러 판정이 달라진다)
 */
export async function callItemDetail(offerId) {
  const req = { method: 'GET', query: { itemId: offerId }, headers: {} }
  let body = null
  const shim = {
    setHeader() { /* CORS 헤더 — in-process 호출에서는 의미 없음 */ },
    status() {
      return {
        json(b) { body = b },
        end() { },
      }
    },
  }
  await itemDetailHandler(req, shim)
  return body
}

/** 배열을 concurrency개씩 나눠 순차 실행 */
async function runWithConcurrency(items, concurrency, worker) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency)
    const settled = await Promise.all(slice.map(worker))
    results.push(...settled)
  }
  return results
}

// ── product_cache 조회/저장 ─────────────────────────────────────────────────
// ※ readCache export: api/1688-order-create.js의 단품 재확인이 같은 캐시를 먼저 본다
//   (OneBound 일 500회 제한 — 발주 때문에 실호출이 늘지 않게 한다)
export async function readCache(offerIds, url, serviceRoleKey) {
  const map = new Map()
  if (offerIds.length === 0) return map
  try {
    const inList = offerIds.join(',')
    const qs = `select=offer_id,status,payload,error_code,expires_at&offer_id=in.(${inList})&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`
    const r = await fetch(`${url}/rest/v1/product_cache?${qs}`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      console.warn('[bulk-item-detail] 캐시 조회 실패 — 전부 미스로 처리:', err?.message || r.status)
      return map
    }
    for (const row of (await r.json()) || []) map.set(String(row.offer_id), row)
  } catch (e) {
    console.warn('[bulk-item-detail] 캐시 조회 예외 — 전부 미스로 처리:', e.message)
  }
  return map
}

async function writeCache(rows, url, serviceRoleKey) {
  if (rows.length === 0) return
  try {
    const r = await fetch(`${url}/rest/v1/product_cache?on_conflict=offer_id`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      // 캐시 저장 실패는 조회 결과 반환을 막지 않는다 (home_section_cache와 같은 원칙).
      console.warn('[bulk-item-detail] 캐시 저장 실패 — 결과는 그대로 반환합니다:', err?.message || r.status)
    }
  } catch (e) {
    console.warn('[bulk-item-detail] 캐시 저장 예외 — 결과는 그대로 반환합니다:', e.message)
  }
}

// ── 하루 실호출 사용량 ──────────────────────────────────────────────────────
async function readUsage(userId, url, serviceRoleKey) {
  try {
    const qs = `select=api_calls&user_id=eq.${userId}&usage_date=eq.${seoulDateStr()}`
    const r = await fetch(`${url}/rest/v1/bulk_fetch_usage?${qs}`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
    })
    if (!r.ok) {
      console.warn('[bulk-item-detail] 사용량 조회 실패 — 0으로 간주:', r.status)
      return 0
    }
    const rows = await r.json()
    return Number(rows?.[0]?.api_calls) || 0
  } catch (e) {
    console.warn('[bulk-item-detail] 사용량 조회 예외 — 0으로 간주:', e.message)
    return 0
  }
}

/**
 * 사용량 원자적 증가 — DB의 increment_bulk_fetch_usage RPC 사용.
 *
 * ★ 읽고-더해서-쓰는 방식은 동시 요청에서 덜 센다. 클라이언트가 동시 2요청을 보내므로
 *   실제로 발생할 수 있어 RPC(단일 UPDATE ... api_calls + p_n)로 바꿨다.
 *   RPC는 service_role 전용이며 증가 후 총합을 돌려준다.
 */
async function addUsage(userId, delta, url, serviceRoleKey) {
  if (delta <= 0) return
  try {
    const r = await fetch(`${url}/rest/v1/rpc/increment_bulk_fetch_usage`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user: userId, p_date: seoulDateStr(), p_n: delta }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      console.warn('[bulk-item-detail] 사용량 기록 실패:', err?.message || r.status)
    }
  } catch (e) {
    console.warn('[bulk-item-detail] 사용량 기록 예외:', e.message)
  }
}

/** 만료된 지 하루 지난 캐시를 제한된 개수만 정리. 실패해도 요청은 계속된다. */
async function cleanupExpired(url, serviceRoleKey) {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const listRes = await fetch(
      `${url}/rest/v1/product_cache?select=offer_id&expires_at=lt.${encodeURIComponent(cutoff)}&limit=${CLEANUP_BATCH}`,
      { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
    )
    if (!listRes.ok) return
    const rows = await listRes.json()
    if (!Array.isArray(rows) || rows.length === 0) return
    const ids = rows.map(r => r.offer_id).join(',')
    const delRes = await fetch(`${url}/rest/v1/product_cache?offer_id=in.(${ids})`, {
      method: 'DELETE',
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
    })
    if (delRes.ok) console.log(`[bulk-item-detail] 만료 캐시 ${rows.length}건 정리`)
  } catch (e) {
    console.warn('[bulk-item-detail] 만료 캐시 정리 실패(무시):', e.message)
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { url, serviceRoleKey } = getServiceRoleConfig()
  if (!url || !serviceRoleKey) {
    console.error('[bulk-item-detail] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 누락')
    return res.status(500).json({ success: false, message: 'Supabase 서버 환경변수 미설정' })
  }

  // ── 1. 로그인 검증 ──
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const auth = await verifyUserToken(bearerToken, url, serviceRoleKey)
  if (!auth.ok) {
    console.warn('[bulk-item-detail] 인증 실패:', auth.error)
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  // ── 2. 입력 검증 ──
  const body = req.body || {}
  const rawIds = Array.isArray(body.offerIds) ? body.offerIds : null
  if (!rawIds) {
    return res.status(400).json({ success: false, message: 'offerIds 배열이 필요합니다.' })
  }
  const offerIds = [...new Set(rawIds.map(v => String(v || '').trim()))].filter(v => OFFER_ID_RE.test(v))
  if (offerIds.length === 0) {
    return res.status(400).json({ success: false, message: '유효한 상품 ID가 없습니다.' })
  }
  if (offerIds.length > MAX_IDS_PER_REQUEST) {
    return res.status(400).json({
      success: false,
      message: `한 번에 최대 ${MAX_IDS_PER_REQUEST}개까지 조회할 수 있습니다.`,
    })
  }

  // ── 캐시 무시 옵션 ──────────────────────────────────────────────────────
  // ★ 왜 추가했나 (2026-09-22 실측):
  //   OneBound의 item-not-found(우리 코드 not_found)는 "확정"이 아니다.
  //   offer 1056078604236은 14:54 조회에서 not_found였는데 15:32 재조회에서는
  //   제목·SKU 300개가 정상으로 내려왔다(같은 요청의 3개 상품이 동시에 실패 →
  //   OneBound 일시 장애 구간). 그런데 실패 결과는 product_cache에 30분(ERROR_TTL_MS)
  //   저장되므로, 고객이 "바로주문"을 눌러 실시간으로 다시 확인하려 해도
  //   그 30분 동안은 캐시된 실패가 그대로 돌아온다.
  //   → 고객이 발주를 막힌 그 순간에만, 캐시를 건너뛰고 실제로 한 번 더 확인할 수 있어야 한다.
  //
  //   적용 범위와 안전장치(일반 조회와 동일하게 유지):
  //     · 로그인 검증을 통과한 뒤에만 도달한다 (위 1번 단계)
  //     · 하루 실호출 상한(DAILY_CALL_LIMIT)과 사용량 기록을 똑같이 적용한다
  //     · 조회 결과는 캐시에 upsert되어 다음 요청부터는 최신 값이 쓰인다
  //   CartView의 판매 종료 재확인 경로에서만 true로 보낸다(대량 업로드는 false).
  const forceRefresh = body.forceRefresh === true

  const results = {}

  // ── 3. 캐시 조회 (적중은 실호출로 세지 않음) ──
  const cacheMap = forceRefresh ? new Map() : await readCache(offerIds, url, serviceRoleKey)
  if (forceRefresh) {
    console.log(`[bulk-item-detail] forceRefresh 요청 — 캐시를 건너뛰고 ${offerIds.length}건을 다시 조회합니다. user=${auth.userId}`)
  }
  const missIds = []
  for (const id of offerIds) {
    const row = cacheMap.get(id)
    if (!row) { missIds.push(id); continue }
    if (row.status === 'ok') {
      // ★ 옛 오염 행 방어 — 이 검사가 없던 시절 빈 payload({})가 status 'ok'로 저장됐다.
      //   기준을 못 넘으면 캐시 미스로 취급해 다시 조회하고, 그 결과로 행을 덮어쓴다(upsert).
      if (!isRealProduct(row.payload, id)) {
        console.warn(`[bulk-item-detail] ${id}: 캐시에 빈/불완전한 payload가 있어 재조회합니다.`)
        missIds.push(id)
        continue
      }
      results[id] = { status: 'ok', payload: row.payload, cached: true }
    } else {
      results[id] = { status: 'error', error_code: row.error_code || 'unknown', cached: true }
    }
  }

  // ── 4. 하루 상한 확인 — 넘는 만큼은 호출하지 않고 limit으로 표시 ──
  let toFetch = missIds
  if (missIds.length > 0) {
    const used = await readUsage(auth.userId, url, serviceRoleKey)
    const remaining = Math.max(0, DAILY_CALL_LIMIT - used)
    if (remaining < missIds.length) {
      toFetch = missIds.slice(0, remaining)
      // 상한 초과분 — 고객에게는 숫자를 노출하지 않고 코드만 내려준다.
      for (const id of missIds.slice(remaining)) {
        results[id] = { status: 'limit', cached: false }
      }
      console.warn(`[bulk-item-detail] 하루 상한 도달 user=${auth.userId} used=${used} 요청=${missIds.length} 처리=${toFetch.length}`)
    }

    // ── 5. OneBound 실호출 (동시 실행 수 제한) ──
    if (toFetch.length > 0) {
      const cacheRows = []
      const now = Date.now()

      const fetched = await runWithConcurrency(toFetch, FETCH_CONCURRENCY, async (id) => {
        try {
          const resp = await callItemDetail(id)
          if (resp?.success === true && resp.data) {
            // ★ success:true를 그대로 믿지 않는다 — 없는 상품도 스텁 item과 함께 성공으로 온다.
            if (!isRealProduct(resp.data, id)) {
              console.warn(
                `[bulk-item-detail] ${id}: 실제 상품이 아님 — not_found로 처리합니다.`,
                { oneboundErrorCode: resp?.raw?.error_code, oneboundError: resp?.raw?.error }
              )
              return { id, status: 'error', error_code: 'not_found' }
            }
            return { id, status: 'ok', payload: shrinkPayload(resp.data) }
          }
          // OneBound가 명시적으로 실패를 반환 (삭제된 상품, 조회 불가 등)
          return { id, status: 'error', error_code: String(resp?.error_code || 'unknown') }
        } catch (e) {
          // 타임아웃·네트워크 오류 — 일시적이므로 캐시하지 않는다
          console.warn(`[bulk-item-detail] ${id} 조회 예외(캐시 안 함):`, e.message)
          return { id, status: 'error', error_code: 'fetch_failed', transient: true }
        }
      })

      for (const f of fetched) {
        if (f.status === 'ok') {
          results[f.id] = { status: 'ok', payload: f.payload, cached: false }
          cacheRows.push({
            offer_id: f.id,
            status: 'ok',
            payload: f.payload,
            error_code: null,
            fetched_at: new Date(now).toISOString(),
            expires_at: new Date(now + OK_TTL_MS).toISOString(),
          })
        } else {
          results[f.id] = { status: 'error', error_code: f.error_code, cached: false }
          if (!f.transient) {
            cacheRows.push({
              offer_id: f.id,
              status: 'error',
              payload: null,
              error_code: f.error_code,
              fetched_at: new Date(now).toISOString(),
              expires_at: new Date(now + ERROR_TTL_MS).toISOString(),
            })
          }
        }
      }

      await writeCache(cacheRows, url, serviceRoleKey)

      // 실제로 나간 호출 수만 사용량에 더한다 (캐시 적중·limit 제외). RPC로 원자적 증가.
      await addUsage(auth.userId, toFetch.length, url, serviceRoleKey)
    }
  }

  // ── 6. 만료 캐시 정리 (가끔, 실패는 무시) ──
  if (Math.random() < CLEANUP_PROBABILITY) {
    await cleanupExpired(url, serviceRoleKey)
  }

  return res.status(200).json({ success: true, results })
}
