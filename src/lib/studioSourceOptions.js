/**
 * 보내기 창 옵션 불러오기 (2026-10-02) — 순수 함수 → scripts/test-marketplace.mjs가 그대로 부른다
 *
 * 고객은 1688에서 대량 사입해 파는 셀러 — 1688 옵션 전체가 아니라 실제로 들여온 옵션만 판다.
 *   그래서 옵션은 처음부터 채우지 않는다(빈칸 — 셀러가 직접 입력) · 버튼을 누를 때만 가져온다
 *   [주문한 옵션 불러오기] = 이 고객이 이유씨에서 주문한 옵션만 (send_prepare.ordered — api/_marketOrdered.js)
 *   [1688 옵션 불러오기]   = 1688 옵션 전체 목록에서 체크한 것만 (처음 체크 없음)
 * 결과는 send_prepare.source.skus와 같은 모양의 부분 목록 → 기존 optionEditorFromSource(스마트스토어·11번가·지그재그·공통 정보)·쿠팡 fillFromSource가 그대로 받는다
 */
const str = v => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')
const norm = s => str(s).replace(/\s+/g, '').toLowerCase()
const EMPTY_PART = new Set(['', '-', 'undefined', 'null', '기본 옵션'])

/** 옵션 줄 한 개의 글자 — 값의 한글(없으면 가져온 글자) · 가져온 글자 */
export function skuLabel(sku) {
  const vals = Array.isArray(sku?.values) ? sku.values : []
  return {
    text: vals.map(v => str(v?.value?.ko) || str(v?.value?.zh)).filter(Boolean).join(' / '),
    original: vals.map(v => str(v?.value?.zh)).filter(Boolean).join(' / '),
  }
}

/** 체크한 줄만 (source 순서 그대로) */
export const pickSkus = (skus, checkedIdx) => {
  const want = new Set(Array.isArray(checkedIdx) ? checkedIdx : [])
  return (Array.isArray(skus) ? skus : []).filter((_, i) => want.has(i))
}

/**
 * 주문한 옵션 → 1688 옵션 줄. specId(발주용 1688 spec_id)가 같으면 그 줄 · 없으면 주문 글자(색상·사이즈)가 그 줄의 값(원문·한글)과 모두 같은 줄
 * @param {object[]} skus send_prepare.source.skus @param {object[]} ordered send_prepare.ordered
 * @returns {{ skus:object[], quantity:{ [index]: number }, missing:[{ color, size, quantity }] }}  missing = 1688 옵션에서 찾지 못한 주문 옵션(지어내지 않고 알린다)
 */
export function orderedSkus(skus, ordered) {
  const list = Array.isArray(skus) ? skus : []
  const texts = list.map(s => new Set((Array.isArray(s?.values) ? s.values : []).flatMap(v => [norm(v?.value?.zh), norm(v?.value?.ko)]).filter(Boolean)))
  const quantity = {}
  const missing = []
  for (const o of Array.isArray(ordered) ? ordered : []) {
    let i = o?.specId ? list.findIndex(s => str(s?.specId) && str(s.specId) === str(o.specId)) : -1
    if (i < 0) {
      const parts = [o?.color, o?.size].map(str).filter(p => !EMPTY_PART.has(p)).map(norm)
      if (parts.length) i = list.findIndex((s, k) => (s?.values?.length || 0) === parts.length && parts.every(p => texts[k].has(p)))
    }
    if (i < 0) { missing.push({ color: str(o?.color), size: str(o?.size), quantity: Number(o?.quantity) || 0 }); continue }
    quantity[i] = (quantity[i] || 0) + (Number(o?.quantity) || 0)
  }
  const idx = Object.keys(quantity).map(Number).sort((a, b) => a - b)
  return { skus: idx.map(i => list[i]), quantity: Object.fromEntries(idx.map((i, k) => [k, quantity[i]])), missing }
}

/** 못 찾은 주문 옵션 안내 한 줄 */
export const orderedMissingNote = missing => (missing?.length ? `주문한 옵션 ${missing.length}개는 지금 1688 옵션 목록에서 찾지 못했습니다: ${missing.map(m => [m.color, m.size].filter(Boolean).join(' / ') || '이름 없음').join(', ')}` : '')
