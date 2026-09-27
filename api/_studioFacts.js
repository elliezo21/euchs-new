/**
 * 원클릭 글자 초안용 1688 상품 사실 (원클릭 1단계) — 순수 함수 (node 테스트: scripts/test-studio-facts.mjs)
 *
 * 입력 = studio_product_snapshots.raw.item (스튜디오가 가져올 때 저장해 둔 OneBound item_get 원본, 중국어)
 *   title        상품명
 *   props        [{ name, value }]            상품 속성 (材质 = 소재 등)
 *   props_list   { "pid:vid": "이름:값" }     옵션(색상·사이즈 …) — 첫 ':' 기준으로 이름/값 (api/_crossborderKo.js·src/services/api1688.js와 같은 기준)
 * 한국어는 새로 번역하지 않는다 — 1688 공식 다국어 데이터가 채워 둔 번역 캐시(translation_cache)에 있는 것만 붙인다(없으면 ko: null).
 */

export const FACT_ATTRS_MAX = 30
export const FACT_OPTIONS_MAX = 10
export const FACT_VALUES_MAX = 60
export const FACT_TEXT_MAX = 200

const text = v => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')

/** item → { title, attrs: [{ name, value }], options: [{ name, values: [] }] } (중국어 원문, 빈 값·중복 뺌) */
export function extractFacts(item) {
  const out = { title: '', attrs: [], options: [] }
  if (!item || typeof item !== 'object') return out
  out.title = text(item.title).slice(0, FACT_TEXT_MAX)
  const seenAttr = new Set()
  for (const p of Array.isArray(item.props) ? item.props : []) {
    const name = text(p?.name).slice(0, FACT_TEXT_MAX), value = text(p?.value).slice(0, FACT_TEXT_MAX)
    if (!name || !value || seenAttr.has(`${name}\u0000${value}`)) continue
    seenAttr.add(`${name}\u0000${value}`)
    out.attrs.push({ name, value })
    if (out.attrs.length >= FACT_ATTRS_MAX) break
  }
  const pl = item.props_list && typeof item.props_list === 'object' && !Array.isArray(item.props_list) ? item.props_list : null
  if (pl) {
    const byPid = new Map()
    for (const [key, raw] of Object.entries(pl)) {
      const s = text(raw)
      const i = s.indexOf(':')
      if (i <= 0 || i === s.length - 1) continue
      const pid = String(key).split(':')[0]
      const name = s.slice(0, i).trim().slice(0, FACT_TEXT_MAX), value = s.slice(i + 1).trim().slice(0, FACT_TEXT_MAX)
      if (!byPid.has(pid)) {
        if (byPid.size >= FACT_OPTIONS_MAX) continue
        byPid.set(pid, { name, values: [] })
      }
      const o = byPid.get(pid)
      if (!o.values.includes(value) && o.values.length < FACT_VALUES_MAX) o.values.push(value)
    }
    out.options = [...byPid.values()].filter(o => o.values.length > 0)
  }
  return out
}

/** 번역 캐시에서 찾을 원문 목록 */
export function factTexts(f) {
  const set = new Set()
  if (f.title) set.add(f.title)
  for (const a of f.attrs) { set.add(a.name); set.add(a.value) }
  for (const o of f.options) { set.add(o.name); for (const v of o.values) set.add(v) }
  return [...set]
}

/** 원문 → { zh, ko } (캐시에 있으면 ko, 없거나 원문과 같으면 null) */
export function withKo(f, ko) {
  const pair = zh => {
    const t = ko.get(zh)
    return { zh, ko: typeof t === 'string' && t.trim() && t !== zh ? t.trim() : null }
  }
  return {
    title: f.title ? pair(f.title) : null,
    attrs: f.attrs.map(a => ({ name: pair(a.name), value: pair(a.value) })),
    options: f.options.map(o => ({ name: pair(o.name), values: o.values.map(pair) })),
  }
}
