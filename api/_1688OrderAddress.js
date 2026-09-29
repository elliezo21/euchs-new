/**
 * 1688 발주용 받는 주소 만들기 (서버 전용) — 자동발주·수동발주 주소 조회가 같이 쓴다.
 *
 * 1) 1688 저장 주소: alibaba.trade.receiveAddress.get (읽기 전용 — 주문을 만들지 않는다)
 *    에서 기본 배송지 WAREHOUSE_ADDRESS_ID 한 줄을 고른다.
 * 2) 주문·고객: orders(id 또는 order_number) → profiles.company_name / profiles.name
 * 3) 규칙은 api/_orderAddressTag.js 한 곳 (taggedAddressParam)
 *
 * 실패하면 에러를 던진다 — 호출측은 표시 없이 발주하지 않고 그대로 실패시킨다.
 */
import { taggedAddressParam, customerLabelOf } from './_orderAddressTag.js'

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'
/** 圆圆A45 — 이우 청양류 C구 38동 1층 창고. 발주·미리보기·운임 조회가 모두 이 주소 */
export const WAREHOUSE_ADDRESS_ID = '6402758024'

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache',
}

/** 1688 계정 저장 주소 중 addressId 한 줄 */
export async function fetchSavedAddress(addressId = WAREHOUSE_ADDRESS_ID) {
  const key = process.env.ONEBOUND_KEY || ''
  const secret = process.env.ONEBOUND_SECRET || ''
  const session = process.env.ONEBOUND_SESSION || ''
  if (!key || !secret || !session) {
    throw new Error('API 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION)')
  }
  const params = new URLSearchParams({
    key, secret, session,
    method: 'com.alibaba.trade/alibaba.trade.receiveAddress.get',
    _o_args: JSON.stringify({}),
    lang: 'zh-CN',
  })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  let data
  try {
    const r = await fetch(`${ONEBOUND_BASE_URL}/1688global/custom?${params}`, {
      method: 'GET', headers: FETCH_HEADERS, signal: ctrl.signal,
    })
    data = await r.json()
  } catch (e) {
    throw new Error(`1688 저장 주소 조회 실패: ${e.name === 'AbortError' ? '타임아웃 (12초)' : e.message}`)
  } finally {
    clearTimeout(timer)
  }
  const code = String(data?.error_code || '').trim()
  if (code && code !== '0' && code !== '0000') {
    throw new Error(`1688 저장 주소 조회 오류: ${data?.reason || data?.error || code}`)
  }
  const items = data?.response?.receiveAddressItems
  if (!Array.isArray(items)) throw new Error('1688 저장 주소 응답에 receiveAddressItems가 없습니다.')
  const found = items.find(a => String(a?.id) === String(addressId))
  if (!found) throw new Error(`1688 저장 주소에서 기본 배송지(${addressId})를 찾지 못했습니다.`)
  return found
}

async function restGet(path) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceRoleKey) throw new Error('Supabase 환경변수 미설정 (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  })
  const body = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`DB 조회 실패 (${r.status}): ${body?.message || ''}`)
  return Array.isArray(body) ? body : []
}

/**
 * 주문번호와 고객명(상호 → 가입 이름). orderId가 있으면 id로, 없으면 order_number로 찾는다.
 * 주문번호는 브라우저가 보낸 값이 아니라 DB 값을 쓴다.
 */
export async function fetchOrderCustomer({ orderId, orderNumber }) {
  const filter = orderId
    ? `id=eq.${encodeURIComponent(orderId)}`
    : `order_number=eq.${encodeURIComponent(String(orderNumber || ''))}`
  if (!orderId && !orderNumber) throw new Error('주문 id·주문번호가 없습니다.')
  const orders = await restGet(`orders?${filter}&select=id,order_number,user_id&limit=2`)
  if (orders.length !== 1) throw new Error(`주문을 찾지 못했습니다 (${orderId || orderNumber}).`)
  const order = orders[0]
  if (orderNumber && order.order_number !== orderNumber) {
    throw new Error(`주문번호가 DB와 다릅니다 (요청 ${orderNumber} / DB ${order.order_number}).`)
  }
  let profile = null
  if (order.user_id) {
    const rows = await restGet(`profiles?id=eq.${encodeURIComponent(order.user_id)}&select=company_name,name&limit=1`)
    profile = rows[0] || null
  }
  const customer = customerLabelOf(profile)
  if (!customer) {
    console.warn('[1688-order-address] 고객 상호·이름이 없어 주문번호만 붙입니다:', { orderNumber: order.order_number })
  }
  return { orderId: order.id, orderNumber: order.order_number, customer }
}

/** 자동발주·수동발주 주소 조회 공통: 표시를 붙인 addressParam */
export async function buildOrderAddress({ orderId, orderNumber }) {
  const [saved, info] = await Promise.all([
    fetchSavedAddress(WAREHOUSE_ADDRESS_ID),
    fetchOrderCustomer({ orderId, orderNumber }),
  ])
  const built = taggedAddressParam(saved, { orderNumber: info.orderNumber, customer: info.customer })
  if (built.customerCut) {
    console.warn('[1688-order-address] 글자 수 상한 때문에 고객명을 줄였습니다:', {
      orderNumber: info.orderNumber, customer: info.customer, used: built.customer,
    })
  }
  return { ...built, orderId: info.orderId, orderNumber: info.orderNumber }
}
