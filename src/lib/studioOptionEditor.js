/**
 * 보내기 창 옵션 편집 (2026-10-02) — 옵션 종류 줄 + 옵션값 칩 → 조합 목록 자동 생성. 순수 함수 → scripts/test-marketplace.mjs가 그대로 부른다
 *
 * [화면] StudioSendOptions.vue (공통 정보·스마트스토어·11번가가 같이 씀 — 쿠팡은 카테고리별 옵션 종류라 따로)
 * [모양] 판매처 공용 모양(api/_marketOptions.js)에 편집용 칸을 더한 것
 *   { enabled, groups:[{ id, name, values:[{ id, label, original }] }],
 *     groupNames, rows:[{ key, ids, values, originals, addPrice, stock, use:true, checked, stock1688, priceCny }],
 *     excluded:[ids[]], deleted:[{ ids, addPrice, stock }], seq }
 *   groupNames·rows는 groups에서 만든 결과(rebuildRows) — 보낼 때는 예전 그대로 optionsPayload(groupNames·rows)만 읽는다(서버·판매처 변환 그대로)
 *   종류 = 값이 1개 이상 있는 종류만 조합에 들어간다(값 없는 종류 줄은 화면에만)
 *   조합 key = 값 칩 id를 정렬해 이은 것 — 값을 더하거나 빼도 같은 조합 줄의 추가금액·재고·선택은 그대로
 *   excluded = 1688에 실제 SKU가 없는 조합(처음부터 뺌) · deleted = [선택 삭제]로 뺀 조합(되살리기 대상)
 *     둘 다 "이 칩들을 모두 가진 조합은 빼기" — 종류를 더해도 뺀 조합이 다시 나오지 않는다
 */
import { marketOptionsFromSource } from '../../api/_marketOptions.js'

export const OPTION_GROUP_MAX = 3 // 스마트스토어 조합형 최대 3개(api/_marketOptions.js SS_OPTION_GROUP_MAX와 같은 값) — 화면에서 종류 줄 상한
export const OPTION_COMBO_MAX = 1000 // 화면 한도(판매처 규칙 아님) — 표가 너무 길어져 창이 멈추지 않게
export const OPTION_VALUE_LEN = 50 // 값 칸 입력 길이 상한(화면). 판매처 글자 수 검사는 판매처 함수 그대로

const clean = s => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase()
const keyOf = ids => [...ids].sort().join(',')
const nextId = (m, p) => { m.seq = (m.seq || 0) + 1; return `${p}${m.seq}` }
const has = (combo, part) => part.every(id => combo.includes(id))

/** 빈 편집 모양 (옵션 없는 상품) */
export function emptyOptionEditor() {
  return { enabled: false, groups: [], groupNames: [], rows: [], excluded: [], deleted: [], seq: 0 }
}

/** 값이 있는 종류들의 전체 조합 (첫 종류가 바깥) → [[칩, 칩…], …] */
function combos(groups) {
  const used = groups.filter(g => g.values.length)
  if (!used.length) return []
  return used.reduce((acc, g) => acc.flatMap(c => g.values.map(v => [...c, v])), [[]])
}

/** 조합 수 (만들기 전에 한도 확인용) */
export const comboCount = groups => {
  const used = groups.filter(g => g.values.length)
  return used.length ? used.reduce((n, g) => n * g.values.length, 1) : 0
}

/**
 * groups → groupNames·rows 다시 만들기 (모양을 그대로 고친다). 같은 조합 줄은 추가금액·재고·선택·1688 참고값 유지
 * 삭제 목록(deleted)에서 칩이 사라진 항목은 정리한다(되살릴 수 없는 조합)
 */
export function rebuildRows(m) {
  const alive = new Set(m.groups.flatMap(g => g.values.map(v => v.id)))
  m.deleted = m.deleted.filter(d => d.ids.every(id => alive.has(id)))
  m.excluded = m.excluded.filter(ids => ids.every(id => alive.has(id)))
  const before = new Map(m.rows.map(r => [r.key, r]))
  const used = m.groups.filter(g => g.values.length)
  m.groupNames = used.map(g => g.name)
  m.rows = combos(m.groups)
    .map(chips => ({ chips, ids: chips.map(v => v.id) }))
    .filter(({ ids }) => !m.excluded.some(x => has(ids, x)) && !m.deleted.some(d => has(ids, d.ids)))
    .map(({ chips, ids }) => {
      const key = keyOf(ids)
      const old = before.get(key)
      return {
        key, ids,
        values: chips.map(v => v.label),
        originals: chips.map(v => v.original || ''),
        addPrice: old ? old.addPrice : 0,
        stock: old ? old.stock : null,
        use: true,
        checked: old ? old.checked === true : false,
        stock1688: old ? old.stock1688 : null,
        priceCny: old ? old.priceCny : null,
      }
    })
  return m
}

/**
 * send_prepare.source.skus → 편집 모양. 종류·값은 칩으로 미리 채우고, 1688에 실제 SKU가 없는 조합은 처음부터 뺀다
 * 값 칩은 1688 원문 값마다 하나(같은 한글로 읽혀도 따로 — 1688 SKU를 말없이 합치지 않는다). 번역 안 된 값은 빈 칩(고객이 눌러 넣는다)
 * 옵션 사용 = 가져온 옵션이 있을 때만 처음부터 켬
 * 1688 가격·재고는 넣지 않는다 (stock1688·priceCny = null — 칸은 예전 모양을 위해 남김)
 */
export function optionEditorFromSource(skus) {
  const src = marketOptionsFromSource(skus)
  const m = emptyOptionEditor()
  if (!src.rows.length) return m
  m.groups = src.groupNames.map(name => ({ id: nextId(m, 'g'), name, values: [] }))
  const chipOf = src.groupNames.map(() => new Map()) // 종류마다 원문(없으면 한글) → 칩
  const sourceRows = src.rows.map(r => {
    const ids = m.groups.map((g, gi) => {
      const label = clean(r.values[gi]), original = clean(r.originals[gi])
      const k = original || `ko:${label}`
      if (!chipOf[gi].has(k)) { const v = { id: nextId(m, 'v'), label, original }; chipOf[gi].set(k, v); g.values.push(v) }
      return chipOf[gi].get(k).id
    })
    return { ids, row: r }
  })
  // 1688 SKU가 없는 조합 = 전체 조합 − 원천 줄
  const present = new Set(sourceRows.map(s => keyOf(s.ids)))
  m.excluded = combos(m.groups).map(c => c.map(v => v.id)).filter(ids => !present.has(keyOf(ids)))
  // 옵션 이름·값만 가져온다 — 1688 가격·재고는 쓰지 않는다(2026-10-02 ②-1: 재고는 셀러가 산 수량 — 비워 둔다). 같은 조합이 두 번이면 첫 줄
  m.rows = []
  for (const s of sourceRows) {
    const key = keyOf(s.ids)
    if (m.rows.some(r => r.key === key)) continue
    m.rows.push({ key, ids: s.ids, addPrice: 0, stock: null, checked: false, stock1688: null, priceCny: null })
  }
  m.enabled = true
  return rebuildRows(m)
}

/**
 * 편집 모양을 그 자리에서 바꾼다 (화면이 들고 있는 같은 객체 — [주문한 옵션 불러오기]·[1688 옵션 불러오기], 2026-10-02)
 * @param {object} m 바꿀 모양(그대로 고친다) @param {object} next 새 모양(optionEditorFromSource 등)
 */
export function replaceOptionEditor(m, next) {
  const n = cloneOptionEditor(next)
  for (const k of Object.keys(m)) if (!(k in n)) delete m[k]
  Object.assign(m, n)
  return m
}

/** 편집 모양 복사 (공통 정보 ↔ 판매처 섹션이 서로의 줄을 고치지 않게) */
export function cloneOptionEditor(o) {
  return {
    enabled: o?.enabled !== false,
    groups: (Array.isArray(o?.groups) ? o.groups : []).map(g => ({ ...g, values: g.values.map(v => ({ ...v })) })),
    groupNames: [...(Array.isArray(o?.groupNames) ? o.groupNames : [])],
    rows: (Array.isArray(o?.rows) ? o.rows : []).map(r => ({ ...r, ...(r.ids ? { ids: [...r.ids] } : {}), values: [...(r.values || [])], originals: [...(r.originals || [])] })),
    excluded: (Array.isArray(o?.excluded) ? o.excluded : []).map(ids => [...ids]),
    deleted: (Array.isArray(o?.deleted) ? o.deleted : []).map(d => ({ ...d, ids: [...d.ids] })),
    seq: Number.isInteger(o?.seq) ? o.seq : 0,
  }
}

// ── 편집 동작 — 모두 모양을 그대로 고치고 { ok, message } (message = 화면 안내 한 줄, 없으면 '') ──

/** [옵션 종류 추가] — 최대 3개. 새 줄은 이름·값이 비어 있다(값이 생기기 전에는 조합이 바뀌지 않는다) */
export function addGroup(m) {
  if (m.groups.length >= OPTION_GROUP_MAX) return { ok: false, message: `옵션 종류는 ${OPTION_GROUP_MAX}개까지 추가할 수 있습니다.` }
  m.groups.push({ id: nextId(m, 'g'), name: '', values: [] })
  return { ok: true, message: '' }
}

/** 종류 줄 [삭제] — 그 종류의 값도 함께 빠지고 조합을 다시 만든다 */
export function removeGroup(m, gid) {
  m.groups = m.groups.filter(g => g.id !== gid)
  rebuildRows(m)
  return { ok: true, message: '' }
}

/** 종류 이름 바꾸기 — 조합은 그대로, 표 머리·보낼 이름만 */
export function setGroupName(m, gid, name) {
  const g = m.groups.find(x => x.id === gid)
  if (g) g.name = String(name ?? '')
  m.groupNames = m.groups.filter(x => x.values.length).map(x => x.name)
  return { ok: true, message: '' }
}

/**
 * 옵션값 [추가] — 쉼표로 여러 개를 한 번에. 같은 종류 안 같은 값(대소문자·띄어쓰기 무시)은 넣지 않고 안내
 * @returns {{ ok, message, added:string[], skipped:string[] }}
 */
export function addValues(m, gid, text) {
  const g = m.groups.find(x => x.id === gid)
  if (!g) return { ok: false, message: '', added: [], skipped: [] }
  const parts = String(text ?? '').split(',').map(clean).filter(Boolean)
  if (!parts.length) return { ok: false, message: '옵션값을 입력하세요.', added: [], skipped: [] }
  const added = [], skipped = []
  for (const p of parts) {
    const label = p.slice(0, OPTION_VALUE_LEN)
    if (g.values.some(v => same(v.label, label)) || added.some(a => same(a, label))) skipped.push(label)
    else added.push(label)
  }
  if (added.length) {
    const next = m.groups.map(x => (x.id === gid ? { values: [...x.values, ...added] } : x))
    if (comboCount(next) > OPTION_COMBO_MAX) return { ok: false, message: `조합이 ${OPTION_COMBO_MAX.toLocaleString('ko-KR')}개를 넘습니다. 옵션값 수를 줄여 입력하세요.`, added: [], skipped }
    for (const label of added) g.values.push({ id: nextId(m, 'v'), label, original: '' })
    rebuildRows(m)
  }
  const message = skipped.length ? `이미 있는 옵션값은 추가하지 않았습니다: ${skipped.join(', ')}` : ''
  return { ok: added.length > 0, message, added, skipped }
}

/** 칩 ⓧ — 그 값이 든 조합이 빠진다 */
export function removeValue(m, gid, vid) {
  const g = m.groups.find(x => x.id === gid)
  if (g) g.values = g.values.filter(v => v.id !== vid)
  rebuildRows(m)
  return { ok: true, message: '' }
}

/** 칩 값 고치기 — 조합 줄(추가금액·재고)은 그대로. 빈 값·같은 종류 안 중복은 고치지 않고 안내 */
export function renameValue(m, gid, vid, text) {
  const g = m.groups.find(x => x.id === gid)
  const v = g?.values.find(x => x.id === vid)
  if (!v) return { ok: false, message: '' }
  const label = clean(text).slice(0, OPTION_VALUE_LEN)
  if (!label) return { ok: false, message: '옵션값을 입력하세요.' }
  if (g.values.some(x => x.id !== vid && same(x.label, label))) return { ok: false, message: `이미 있는 옵션값입니다: ${label}` }
  v.label = label
  rebuildRows(m)
  return { ok: true, message: '' }
}

/** [선택 삭제] — 선택한 조합을 목록·전송에서 뺀다(되살리기 대상으로 추가금액·재고를 기억) */
export function deleteChecked(m) {
  const gone = m.rows.filter(r => r.checked)
  if (!gone.length) return { ok: false, message: '삭제할 조합을 선택하세요.' }
  m.deleted.push(...gone.map(r => ({ ids: [...r.ids], addPrice: r.addPrice, stock: r.stock, stock1688: r.stock1688, priceCny: r.priceCny })))
  rebuildRows(m)
  return { ok: true, message: '' }
}

/** 되살릴 수 있는 삭제 항목 수 (rebuildRows가 칩이 사라진 항목을 정리하므로 남은 것은 모두 되살릴 수 있다) */
export const restorableCount = m => m.deleted.length

/** 1688에 SKU가 없어 목록에서 뺀 조합 수 (지금 칩 기준 — 안내 한 줄용) */
export const excludedComboCount = m => combos(m.groups).filter(c => { const ids = c.map(v => v.id); return m.excluded.some(x => has(ids, x)) }).length

/** [삭제한 조합 되살리기] — 지운 조합을 지울 때의 추가금액·재고로 되돌린다(선택은 풀림) */
export function restoreDeleted(m) {
  if (!m.deleted.length) return { ok: false, message: '' }
  const back = m.deleted
  m.deleted = []
  const keep = new Map(back.map(d => [keyOf(d.ids), d]))
  rebuildRows(m)
  for (const r of m.rows) {
    const d = keep.get(r.key)
    if (d) Object.assign(r, { addPrice: d.addPrice, stock: d.stock, stock1688: d.stock1688 ?? null, priceCny: d.priceCny ?? null, checked: false })
  }
  return { ok: true, message: '' }
}

/**
 * [추가금액 일괄입력]·[재고 일괄입력] — 선택한 줄이 있으면 그 줄만, 없으면 전체
 * @param {'addPrice'|'stock'} field @param {number} value 정수 (재고는 0 이상)
 */
export function bulkSet(m, field, value) {
  if (field !== 'addPrice' && field !== 'stock') throw new Error(`일괄입력 칸이 아님: ${field}`)
  if (!Number.isInteger(value) || (field === 'stock' && value < 0)) return { ok: false, message: field === 'stock' ? '재고 수량을 0 이상 정수로 입력하세요.' : '추가금액을 정수(원)로 입력하세요.' }
  const picked = m.rows.filter(r => r.checked)
  for (const r of picked.length ? picked : m.rows) r[field] = value
  return { ok: true, message: '' }
}

/** 조합 줄 선택 모두 켜기·끄기 */
export function checkAll(m, on) {
  for (const r of m.rows) r.checked = on === true
}
