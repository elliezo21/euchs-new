/**
 * 쿠팡 ↔ 공통 정보 연결 (2026-10-02) — 순수 함수 → scripts/test-marketplace.mjs가 그대로 부른다
 *
 * [왜] 판매가·재고·옵션을 공통 정보에 한 번 넣으면 쿠팡에도 들어가게 한다. 쿠팡 칸에는 쿠팡에만 있는 것(옵션 이름 연결·정가·품번·GTIN·필수 속성)만 남긴다.
 * [쿠팡 규칙 — 공식] 카테고리 메타정보 조회(attributes: attributeTypeName · required MANDATORY/OPTIONAL · exposed EXPOSED=구매옵션/NONE=검색옵션 · groupNumber · dataType · basicUnit · usableUnits)
 *   2024-10-10부터 메타에 정의된 구매옵션 이름만 받는다(구매옵션 입력 변경 공지 2024-09-09) — 필수 누락·정의 밖 옵션 이름은 등록 실패 또는 노출 제한.
 *   쿠팡에는 "추가금" 개념이 없다 → 옵션(items[]) 하나마다 salePrice. 그래서 옵션별 쿠팡 판매가 = 공통 판매가 + 그 옵션의 추가금액.
 * [연결] 공통 옵션 종류 이름(예: 컬러) → 쿠팡 구매옵션 이름(예: 색상). 순서: 지난번 이 상품을 쿠팡에 보낼 때 쓴 연결 → 이름이 같거나 같은 뜻(mapOptionName) → 빈칸(고객이 고른다)
 * [단위형] dataType NUMBER — 값은 숫자 또는 숫자+허용 단위(usableUnits, 없으면 basicUnit)만. 숫자만 넣으면 서버가 기본 단위를 붙인다(api/_coupang.js buildProductBody — 예전 그대로)
 * [금액] 반올림·자르기·임의 숫자 없음. 공통 판매가나 추가금액이 비면 그 옵션의 판매가는 null → 빠짐 목록 "판매가"
 */
import { mapOptionName, cleanOptionLinks } from '../../api/_coupangFields.js'

export const COUPANG_LINK_TITLE = '쿠팡 옵션 연결'
export const OPTION_CHANGE_NOTE = '쿠팡에서는 옵션을 바꾸면 기존 옵션의 리뷰·판매 이력이 이어지지 않을 수 있습니다.'
export const OPTION_CHANGE_CONFIRM = '옵션 구성 변경을 확인했습니다'
export const OPTION_CHANGE_MISSING = '쿠팡 옵션 구성 변경 확인'
export const COMMON_ITEMS_NOTE = '판매가·재고·옵션은 위 공통 정보 값을 사용합니다. 쿠팡 판매가 = 공통 판매가 + 옵션 추가금액입니다.'
export const LINK_EMPTY = '연결 안 됨'
export const LINK_FILL = '옵션별로 입력'
export const SINGLE_KEY = 'single'

const clean = s => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * 공통 정보 → 쿠팡 옵션 줄
 * @param {{ price, stock, opts:{ enabled, groupNames, rows:[{ key, values, originals, addPrice, stock, use }] } }} common  commonFromPrepare 모양
 * @returns {{ groupNames:string[], rows:[{ key, values:string[], originals:string[], salePrice:number|null, stock }] }}
 *   옵션을 안 쓰면 줄 하나(key 'single') · 옵션을 켰는데 조합이 0개면 줄 0개(빠짐 목록 "판매할 옵션")
 */
export function commonCoupangRows(common) {
  const base = Number.isInteger(common?.price) && common.price > 0 ? common.price : null
  const o = common?.opts
  if (!o || o.enabled === false) return { groupNames: [], rows: [{ key: SINGLE_KEY, values: [], originals: [], salePrice: base, stock: common?.stock ?? null }] }
  const rows = (Array.isArray(o.rows) ? o.rows : []).filter(r => r && r.use !== false)
  return {
    groupNames: (Array.isArray(o.groupNames) ? o.groupNames : []).map(clean),
    rows: rows.map((r, i) => ({
      key: String(r.key ?? `row${i}`),
      values: (Array.isArray(r.values) ? r.values : []).map(clean),
      originals: (Array.isArray(r.originals) ? r.originals : []).map(clean),
      salePrice: base !== null && Number.isInteger(r.addPrice) && base + r.addPrice > 0 ? base + r.addPrice : null,
      stock: r.stock ?? null,
    })),
  }
}

/**
 * 공통 옵션 종류 → 쿠팡 구매옵션 이름
 * @param {string[]} groupNames 공통 옵션 종류 이름
 * @param {{ name, exposed, required }[]} attributes 카테고리 메타 (없으면 [] — 그때는 저장된 연결만)
 * @param {{ [group]: string }} saved 지난번 이 상품을 쿠팡에 보낼 때의 연결 (request_json.optionLinks)
 * @param {{ [group]: string }} current 화면에서 이미 고른 값 (메타를 다시 받아도 고객이 고른 것은 그대로)
 * @returns {{ [group]: string }}  못 맞춘 종류는 '' · 한 쿠팡 옵션에 두 종류를 잇지 않는다
 */
export function autoLinks(groupNames, attributes = [], saved = {}, current = {}) {
  const attrs = (Array.isArray(attributes) ? attributes : []).filter(a => a && a.name)
  const known = n => !attrs.length || attrs.some(a => a.name === n)
  const out = {}
  const used = new Set()
  const take = (g, n) => { if (n && !used.has(n) && known(n)) { out[g] = n; used.add(n); return true } return false }
  const groups = (Array.isArray(groupNames) ? groupNames : []).map(clean)
  for (const g of groups) take(g, clean(current?.[g]))
  for (const g of groups) if (!(g in out)) take(g, clean(saved?.[g]))
  if (attrs.length) for (const g of groups) if (!(g in out)) take(g, mapOptionName([g], attrs))
  for (const g of groups) if (!(g in out)) out[g] = ''
  return out
}

/** 단위형 값 검사 — NUMBER면 "숫자" 또는 "숫자+허용 단위"(공백 없이)만. 그 밖은 늘 통과. 빈 값은 여기서 보지 않는다(필수 검사가 따로) */
export function unitValueOk(value, attr) {
  const v = clean(value)
  if (!v || !attr || attr.dataType !== 'NUMBER') return true
  if (/^\d+(\.\d+)?$/.test(v)) return true
  const units = [...new Set([...(Array.isArray(attr.units) ? attr.units : []), attr.unit].filter(Boolean).map(String))]
  return units.some(u => v.endsWith(u) && /^\d+(\.\d+)?$/.test(v.slice(0, v.length - u.length)))
}
/** 단위형 안내 한 줄 — "숫자+단위만 (예: 1개)" */
export function unitHint(attr) {
  if (!attr || attr.dataType !== 'NUMBER') return ''
  const units = [...new Set([attr.unit, ...(Array.isArray(attr.units) ? attr.units : [])].filter(Boolean).map(String))]
  return units.length ? `숫자+단위만 입력 (예: 1${units[0]}${units.length > 1 ? ` · 단위 ${units.join('·')}` : ''})` : '숫자만 입력'
}

/**
 * 연결 표 — 쿠팡 구매옵션(EXPOSED)마다 한 줄: 공통 옵션 중 무엇이 이어졌는지, 필수인데 비었는지
 * @returns {[{ name, required, from:string, state:'linked'|'fill'|'empty', hint }]}
 *   linked = 공통 옵션 종류가 이어짐 · fill = 이어진 종류는 없지만 아래 옵션 표에서 옵션별로 넣음(필수 속성 칸) · empty = 필수인데 비어 있음(빨강)
 * @param {(name:string)=>boolean} filled 그 쿠팡 옵션이 모든 옵션 줄에 채워졌는지 (옵션 표 칸)
 */
export function linkRows(attributes, links, filled = () => false) {
  const from = Object.fromEntries(Object.entries(links || {}).filter(([, n]) => n).map(([g, n]) => [n, g]))
  return (Array.isArray(attributes) ? attributes : []).filter(a => a && a.name && a.exposed).map(a => {
    const g = from[a.name] || ''
    const state = g ? 'linked' : filled(a.name) ? 'fill' : a.required ? 'empty' : 'fill'
    return { name: a.name, required: !!a.required, from: g, state, hint: unitHint(a) }
  })
}

/**
 * 연결 빠짐 — 화면 빠짐 목록에 더한다(보내기 막음). 필수 속성 값 비움은 섹션의 옵션 줄 검사가 따로 한다
 * @returns {string[]}
 */
export function linkProblems(groupNames, links, attributes = []) {
  const out = []
  const groups = (Array.isArray(groupNames) ? groupNames : []).map(clean)
  groups.forEach((g, i) => { if (!clean(links?.[g])) out.push(`${COUPANG_LINK_TITLE}: "${g || `옵션 종류 ${i + 1}`}"에 맞는 쿠팡 옵션`) })
  const picked = groups.map(g => clean(links?.[g])).filter(Boolean)
  if (new Set(picked).size !== picked.length) out.push(`${COUPANG_LINK_TITLE}: 옵션 종류마다 서로 다른 쿠팡 옵션`)
  const attrs = Array.isArray(attributes) ? attributes : []
  if (attrs.length) for (const n of picked) if (!attrs.some(a => a.name === n)) out.push(`${COUPANG_LINK_TITLE}: "${n}"은 이 카테고리의 쿠팡 옵션이 아님`)
  return [...new Set(out)]
}

/** 보낼 연결 기록 — request_json.optionLinks [{ from, to }] (다시 보낼 때 그대로 쓴다). 정리 규칙은 서버와 같은 cleanOptionLinks */
export const linksPayload = links => cleanOptionLinks(Object.entries(links || {}).map(([from, to]) => ({ from, to })))
/** 기록 → { from: to } */
export const linksFromSaved = list => Object.fromEntries((Array.isArray(list) ? list : []).filter(x => x && x.from && x.to).map(x => [clean(x.from), clean(x.to)]))

/**
 * 쿠팡에 이미 있는 상품의 옵션 구성이 바뀌는지 — 옵션 이름 묶음이 다르면 true (순서는 보지 않는다). 지난 옵션을 모르면 false
 * @param {string[]} before 지난번 보낸 옵션 이름 (send_prepare.existing.coupang.itemNames) · @param {string[]} now 이번 옵션 이름
 */
export function optionSetChanged(before, now) {
  const a = (Array.isArray(before) ? before : []).map(clean).filter(Boolean)
  if (!a.length) return false
  const b = (Array.isArray(now) ? now : []).map(clean).filter(Boolean)
  if (a.length !== b.length) return true
  const sa = [...a].sort(), sb = [...b].sort()
  return sa.some((x, i) => x !== sb[i])
}
