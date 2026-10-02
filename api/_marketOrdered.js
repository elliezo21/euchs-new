/**
 * 이 고객이 이유씨에서 주문한 1688 옵션 (2026-10-02 — 보내기 창 [주문한 옵션 불러오기]). 순수 함수 — 서버(send_prepare)가 부르고 scripts/test-marketplace.mjs가 그대로 부른다
 *
 * [근거 — 실제 칸] orders(user_id uuid · status text · items jsonb · created_at — 운영 DB information_schema로 확인 2026-10-02)
 *   order_number = 주문(발주) 번호 — 예전부터 쓰는 칸(api/account-withdraw.js select·AdminWarehouseModal eq). 어떤 주문을 합쳤는지 안내에 쓴다(2026-10-02 ②-1)
 *   orders.items[] 한 줄 = 장바구니 한 줄(src/utils/cartWriter.js — 옵션 하나마다 한 줄) → 주문 확정(OrderConfigModal.vue orderItems)
 *     num_iid / itemId = 1688 상품 번호(offer_id) · specId = 1688 SKU spec_id(발주용) · sku = "색상 / 사이즈" 글자
 *     skus = [{ color, size, quantity }] (그 줄의 옵션) · quantity = 줄 수량(skus 수량 합)
 *   결제가 확인된 주문만 = _studioBg.ORDER_OK_STATUSES (orderPipeline 코드 3 이상과 같은 목록)
 * [잇기] studio_projects.offer_id = 1688 상품 번호 · 1688 저장본(studio_product_snapshots.raw.item.skus.sku[].spec_id)과 specId로 정확히 맞춘다(화면 studioSourceOptions)
 */
const str = v => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')
const int = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 }

/**
 * @param {object[]} rows orders 줄 ({ order_number, items })
 * @param {string} offerId 1688 상품 번호
 * @returns {[{ specId, color, size, quantity, orders }]}  같은 옵션(specId, 없으면 색상·사이즈 글자)끼리 수량을 더함 · 주문 순서(처음 나온 순)
 *   orders = 그 옵션이 든 주문 번호(겹치지 않게, 나온 순) — 셀러가 산 수량 = 재고 칸 처음 값 (보내기 창 [주문한 옵션 불러오기])
 */
export function orderedOptionsOf(rows, offerId) {
  const id = str(offerId)
  if (!id) return []
  const out = new Map()
  for (const o of Array.isArray(rows) ? rows : []) {
    const no = str(o?.order_number)
    for (const it of Array.isArray(o?.items) ? o.items : []) {
      if (!it || (str(it.num_iid) !== id && str(it.itemId) !== id)) continue
      const specId = str(it.specId)
      const parts = Array.isArray(it.skus) && it.skus.length ? it.skus : [{ color: it.color, size: it.size, quantity: it.quantity }]
      for (const p of parts) {
        const color = str(p?.color), size = str(p?.size)
        const qty = int(p?.quantity ?? p?.qty)
        // specId는 그 줄 하나의 옵션 — 한 줄에 옵션이 여럿(예전 모양)이면 글자로만 잇는다
        const key = specId && parts.length === 1 ? `s:${specId}` : `t:${color}|${size}`
        const prev = out.get(key)
        if (prev) { prev.quantity += qty; if (no && !prev.orders.includes(no)) prev.orders.push(no) }
        else out.set(key, { specId: parts.length === 1 ? specId : '', color, size, quantity: qty, orders: no ? [no] : [] })
      }
    }
  }
  return [...out.values()].filter(x => x.specId || x.color || x.size)
}
export const ORDERED_ORDERS_MAX = 200 // 최근 주문 몇 건까지 볼지 (주문 화면이 한 번에 읽는 양과 비슷하게)
