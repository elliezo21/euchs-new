/**
 * 보내기 창 옵션 불러오기 (2026-10-02) — 순수 함수 → scripts/test-marketplace.mjs가 그대로 부른다
 *
 * 고객은 1688에서 대량 사입해 파는 셀러 — 1688 옵션 전체가 아니라 실제로 들여온 옵션만 판다.
 *   그래서 옵션은 처음부터 채우지 않는다(빈칸 — 셀러가 직접 입력) · 버튼을 누를 때만 가져온다
 *   [주문한 옵션 불러오기] = 이 고객이 이유씨에서 주문한 옵션만 (send_prepare.ordered — api/_marketOrdered.js) — 주문서 옵션 이름·수량 그대로(orderedOptions, 1688 목록과 맞추지 않음)
 *     재고 칸 처음 값 = 그 옵션의 주문 수량(셀러가 산 수량 — 2026-10-02 ②-1). 같은 옵션을 여러 번 주문했으면 합친다(orderedMergeNote로 안내). 셀러가 고칠 수 있다
 *   [1688 옵션 불러오기]   = 1688 옵션 전체 목록에서 체크한 것만 (처음 체크 없음)
 * [1688 옵션 불러오기] 결과 = send_prepare.source.skus와 같은 모양의 부분 목록 → optionEditorFromSource(스마트스토어·11번가·지그재그·공통 정보)·쿠팡 fillFromSource
 * [주문한 옵션 불러오기] 결과 = orderedOptions { groupNames, rows } → optionEditorFromOrdered·쿠팡 fillFromOrdered
 */
const str = v => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')
const norm = s => str(s).replace(/\s+/g, '').toLowerCase()
const EMPTY_PART = new Set(['', '-', 'undefined', 'null', '기본 옵션'])
const HAN = /\p{Script=Han}/u

/**
 * 옵션 줄 한 개의 글자 — text = 화면에 보일 글자(값의 한글, 한글이 없으면 한자가 없는 원문 — 예: "M") · original = 가져온 원문(데이터용, 화면에 안 보임)
 *   중국어(한자)는 text에 넣지 않는다 (2026-10-02 ②-1 보완 — 셀러 화면에 1688 원문을 보이지 않음)
 */
export function skuLabel(sku) {
  const vals = Array.isArray(sku?.values) ? sku.values : []
  return {
    text: vals.map(v => str(v?.value?.ko) || (HAN.test(str(v?.value?.zh)) ? '' : str(v?.value?.zh))).filter(Boolean).join(' / '),
    original: vals.map(v => str(v?.value?.zh)).filter(Boolean).join(' / '),
  }
}

/** 체크한 줄만 (source 순서 그대로) */
export const pickSkus = (skus, checkedIdx) => {
  const want = new Set(Array.isArray(checkedIdx) ? checkedIdx : [])
  return (Array.isArray(skus) ? skus : []).filter((_, i) => want.has(i))
}

/**
 * [주문한 옵션 불러오기] (2026-10-02 ②-1 보완) — 주문서(orders.items[].skus)의 옵션 이름·수량을 그대로 옵션 목록으로. 1688 옵션 목록과 맞추지 않는다
 *   (셀러가 산 옵션은 1688에 지금 있든 없든 셀러 창고에 있다 · 주문서 글자와 1688 목록 번역이 달라 맞추기가 실패했다 — 예: "0551 블랙 한 쌍" vs "0551 검정색 한 쌍")
 *   옵션 종류: 주문서 color가 있으면 "색상", size가 있으면 "사이즈"(둘 다 있으면 2단) — 장바구니·주문서 칸 이름(color·size, src/utils/cartWriter.js) 그대로
 *   같은 옵션 이름(띄어쓰기·대소문자 무시)이 여러 주문에 있으면 수량을 더하고 주문 번호를 모은다 · 순서 = 주문서에 처음 나온 순
 * @param {object[]} ordered send_prepare.ordered [{ specId, color, size, quantity, orders }]
 * @returns {{ groupNames:string[], rows:[{ values:string[], quantity:number, orders:string[] }] }}  옵션 이름이 하나도 없으면 줄 0개
 */
export const ORDERED_GROUP_NAMES = { color: '색상', size: '사이즈' }
export function orderedOptions(ordered) {
  const list = (Array.isArray(ordered) ? ordered : []).map(o => ({
    color: EMPTY_PART.has(str(o?.color)) ? '' : str(o?.color), size: EMPTY_PART.has(str(o?.size)) ? '' : str(o?.size),
    quantity: Number.isFinite(Number(o?.quantity)) && Number(o?.quantity) > 0 ? Math.floor(Number(o.quantity)) : 0,
    orders: (Array.isArray(o?.orders) ? o.orders : []).map(str).filter(Boolean),
  })).filter(o => o.color || o.size)
  const parts = ['color', 'size'].filter(k => list.some(o => o[k]))
  const rows = []
  const byKey = new Map()
  for (const o of list) {
    const values = parts.map(k => o[k])
    const key = values.map(norm).join('\u0001')
    const prev = byKey.get(key)
    if (prev) { prev.quantity += o.quantity; for (const no of o.orders) if (!prev.orders.includes(no)) prev.orders.push(no); continue }
    const row = { values, quantity: o.quantity, orders: [...new Set(o.orders)] }
    byKey.set(key, row)
    rows.push(row)
  }
  return { groupNames: parts.map(k => ORDERED_GROUP_NAMES[k]), rows }
}

/**
 * 여러 주문을 합친 옵션 안내 한 줄 — 주문 2건 이상이 든 옵션만. 없으면 ''
 * @param {{ rows:[{ values, quantity, orders }] }} r orderedOptions 결과
 */
export function orderedMergeNote(r) {
  const merged = (r?.rows || []).map(x => ({ label: x.values.filter(Boolean).join(' / ') || '옵션', qty: x.quantity || 0, orders: x.orders || [] })).filter(x => x.orders.length > 1)
  if (!merged.length) return ''
  const shown = merged.slice(0, 3).map(x => `${x.label} ${x.qty.toLocaleString('ko-KR')}개(주문 ${x.orders.join(', ')})`)
  return `같은 옵션을 여러 번 주문해 수량을 합쳤습니다: ${shown.join(' · ')}${merged.length > 3 ? ` 외 ${merged.length - 3}개` : ''}`
}

