/**
 * 판매처로 보낸 기록 → 그 판매처에 마지막으로 보낸 판매가·재고·카테고리 (2026-10-02 여러 상품 한 번에 보내기 — send_prepare.previous)
 * 순수 함수 (scripts/test-studio-bulk-send.mjs가 그대로 부른다). DB 칸을 새로 만들지 않고 보낸 본문(request_json)에서 읽는다.
 *   쿠팡       body.items[].salePrice(가장 작은 값 = 옵션 추가금 없는 판매가) · items가 1개면 maximumBuyCount · body.displayCategoryCode
 *   스마트스토어 body.originProduct.salePrice · stockQuantity · leafCategoryId   (api/_smartstore.js buildSmartstoreProduct)
 *   11번가     summary.selPrc · prdSelQty · dispCtgrNo                          (api/_elevenst.js summary)
 *   지그재그    summary.price · stock · categoryId                               (api/_zigzagFields.js summary)
 *   카테고리 이름 = request_json.categoryName (모든 판매처 공통)
 * 판매처마다 한 건: 살아 있는 상품(등록·승인·승인 대기) 중 가장 최근, 없으면 값이 있는 가장 최근 기록
 */
import { LIVE_SEND_STATUSES } from './_marketUpdate.js'

export const PREVIOUS_SELECT = [
  'id', 'market', 'status', 'created_at', 'category_name:request_json->>categoryName',
  'cp_items:request_json->body->items', 'cp_cat:request_json->body->>displayCategoryCode',
  'ss_price:request_json->body->originProduct->>salePrice', 'ss_stock:request_json->body->originProduct->>stockQuantity', 'ss_cat:request_json->body->originProduct->>leafCategoryId',
  'e_price:request_json->summary->>selPrc', 'e_stock:request_json->summary->>prdSelQty', 'e_cat:request_json->summary->>dispCtgrNo',
  'z_price:request_json->summary->>price', 'z_stock:request_json->summary->>stock', 'z_cat:request_json->summary->>categoryId',
].join(',')

const int = v => { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return Number.isInteger(n) ? n : null }
const str = v => (v === null || v === undefined ? '' : String(v).trim())
const time = v => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0 }

/** 기록 한 줄 → { price, stock, category } (값이 하나도 없으면 null) */
export function previousFromRow(r) {
  const m = r?.market || 'coupang'
  let price = null, stock = null, cat = ''
  if (m === 'coupang') {
    const items = Array.isArray(r.cp_items) ? r.cp_items : []
    const prices = items.map(it => int(it?.salePrice)).filter(n => n > 0)
    price = prices.length ? Math.min(...prices) : null
    stock = items.length === 1 ? int(items[0]?.maximumBuyCount) : null
    cat = str(r.cp_cat)
  } else if (m === 'smartstore') { price = int(r.ss_price); stock = int(r.ss_stock); cat = str(r.ss_cat) }
  else if (m === '11st') { price = int(r.e_price); stock = int(r.e_stock); cat = str(r.e_cat) }
  else if (m === 'zigzag') { price = int(r.z_price); stock = int(r.z_stock); cat = str(r.z_cat) }
  else return null
  if (!(price > 0)) price = null
  if (!(stock >= 0)) stock = null
  const category = cat ? { id: cat, name: str(r.category_name) } : null
  return price === null && stock === null && !category ? null : { price, stock, category }
}

/**
 * @param {object[]} rows PREVIOUS_SELECT로 읽은 기록 (이 작업의 결과물 전부)
 * @returns {{ [market]: { price, stock, category:{ id, name }|null, at, status } }}
 */
export function previousOf(rows) {
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean).sort((a, b) => time(b.created_at) - time(a.created_at))
  const out = {}
  for (const live of [true, false]) {
    for (const r of list) {
      const m = r.market || 'coupang'
      if (out[m] || LIVE_SEND_STATUSES.includes(r.status) !== live) continue
      const v = previousFromRow(r)
      if (v) out[m] = { ...v, at: r.created_at, status: r.status }
    }
  }
  return out
}
