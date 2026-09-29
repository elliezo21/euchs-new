/**
 * 관리자 주문 화면 — 1688 받는 주소에 붙는 이름(주문 전체·판매자별) 불러오기·저장.
 * 규칙(우선순위·잠금·글자 정리)은 api/_orderAddressTag.js 한 곳 — 자동발주와 같은 파일을 import 한다.
 *
 * 저장 위치: orders.items[] 각 품목 객체의 ORDER_NAME_KEY / SELLER_NAME_KEY (스키마 변경 없음)
 */
import { ref, watch } from 'vue'
import { supabase, isValidUUID } from '@/lib/supabase'
import { applyAddressNames, ORDER_NAME_KEY, SELLER_NAME_KEY } from '../../api/_orderAddressTag.js'

/** 주문의 DB uuid — 화면 주문 객체는 dbId 또는 id에 들고 있다 */
export function orderDbId(order) {
  const id = order?.dbId || order?.id
  return id && isValidUUID(String(id)) ? String(id) : null
}

/** /api/1688-order-address — 회원 상호·이름(+ withAddress면 1688 기본 배송지) */
export async function fetchAddressMaterials(orderId, { withAddress = false } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/1688-order-address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ orderId, withAddress }),
  })
  const text = await res.text()
  let data = null
  try { data = JSON.parse(text) } catch {
    console.error('[orderAddressNames] JSON 아닌 응답:', res.status, text.slice(0, 300))
  }
  if (!data?.success) {
    throw new Error(data?.message || `주소 표시 재료 조회 실패 (HTTP ${res.status})`)
  }
  return data
}

/**
 * 모달에 열린 주문의 회원 상호·이름 — 주문이 바뀌면 다시 읽는다.
 * @param {import('vue').Ref<object|null>} orderRef
 */
export function useOrderAddressProfile(orderRef) {
  const profile = ref(null)
  const error = ref('')
  const loading = ref(false)
  let seq = 0

  async function load() {
    const id = orderDbId(orderRef.value)
    const my = ++seq
    profile.value = null
    error.value = ''
    if (!id) return
    loading.value = true
    try {
      const data = await fetchAddressMaterials(id)
      if (my === seq) profile.value = data.profile
    } catch (e) {
      console.error('[orderAddressNames] 회원 상호·이름 조회 실패:', e)
      if (my === seq) error.value = e.message
    } finally {
      if (my === seq) loading.value = false
    }
  }

  watch(() => orderDbId(orderRef.value), load, { immediate: true })
  return { profile, error, loading, reload: load }
}

/**
 * 이름 저장 — DB의 최신 items를 다시 읽어 이름 키만 바꿔 쓴다.
 * (화면이 들고 있는 items로 덮어쓰면, 그 사이 서버가 기록한 1688 주문번호 등을 지울 수 있다)
 * 잠금 판정도 DB 값 기준 (applyAddressNames가 잠겼으면 에러).
 * 성공하면 화면 주문 객체의 items에도 이름 키만 반영한다 — 다른 칸(아직 저장 안 한 편집)은 건드리지 않는다.
 *
 * @param {object} order  화면 주문 객체 (activeOrder.value)
 * @param {{ orderName?: string, groupKey?: string, sellerName?: string }} patch
 * @param {object|null} profile  { company_name, name } — 주문 전체 이름을 바꿀 때 발주된 판매자 이름 굳히기에 필요
 * @param {object[]} [alsoItems] 같은 주문의 다른 화면 사본 items (목록의 주문 객체 등)
 */
export async function saveAddressNames(order, patch, profile, alsoItems = []) {
  const id = orderDbId(order)
  if (!id) throw new Error('DB 주문 id가 없어 저장할 수 없습니다.')

  const { data: row, error: readErr } = await supabase
    .from('orders').select('items').eq('id', id).single()
  if (readErr) throw readErr
  const dbItems = Array.isArray(row?.items) ? row.items : []

  const next = applyAddressNames(dbItems, { ...patch, profile })

  const { data: updated, error: writeErr } = await supabase
    .from('orders')
    .update({ items: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (writeErr) throw writeErr
  if (!updated || updated.length === 0) {
    throw new Error(`DB 저장 실패: 주문(${order.orderNumber || id})을 찾을 수 없거나 권한이 없습니다. (0 rows affected)`)
  }

  const copyKeys = (target) => {
    if (!Array.isArray(target)) return
    next.forEach((it, i) => {
      if (!target[i]) return
      for (const k of [ORDER_NAME_KEY, SELLER_NAME_KEY]) {
        if (it[k]) target[i][k] = it[k]
        else delete target[i][k]
      }
    })
  }
  copyKeys(order.items)
  for (const arr of alsoItems) if (arr !== order.items) copyKeys(arr)
  return next
}
