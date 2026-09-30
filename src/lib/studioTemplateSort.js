/**
 * 템플릿 목록 정렬 (추천순·최신순) + NEW 표시 — 템플릿 갤러리·편집기 [템플릿] 패널이 같이 쓴다. 순수 함수.
 *
 * ★ 추천순(기본) = RECOMMENDED_TEMPLATES에 있는 것 먼저(그 순서) → 나머지는 기본 목록 순서(STUDIO_TEMPLATES).
 * ★ 최신순 = 추가한 날짜(TEMPLATE_ADDED, KST) 최신 먼저, 같은 날이면 추천순.
 * ★ NEW = 추가한 지 NEW_DAYS일 안 (날짜 자정 KST부터 셈).
 * 거르기(카테고리·분위기·색·내 보관함)는 studioTemplates.filterTemplates — 거른 목록을 여기서 정렬한다.
 */
import { STUDIO_TEMPLATES } from './studioTemplates.js'
import { TEMPLATE_ADDED } from '../data/studioTemplateAdded.js'
import { RECOMMENDED_TEMPLATES } from '../data/studioTemplateRecommended.js'

export const TEMPLATE_SORTS = [{ key: 'recommended', label: '추천순' }, { key: 'latest', label: '최신순' }]
export const DEFAULT_TEMPLATE_SORT = 'recommended'
export const NEW_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/** 'YYYY-MM-DD' → 그날 0시(KST) ms. 모양이 다르면 NaN */
export function addedMs(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00+09:00`) : NaN
}

/** 템플릿을 추가한 날 0시(KST) ms — 날짜가 없거나 이상하면 NaN (테스트가 모든 기본 템플릿에 있는지 본다) */
export function templateAddedMs(tpl, added = TEMPLATE_ADDED) {
  return addedMs(added[tpl?.key])
}

/** 추가한 지 NEW_DAYS일 안이면 true */
export function isNewTemplate(tpl, now = Date.now(), added = TEMPLATE_ADDED) {
  const t = templateAddedMs(tpl, added)
  return Number.isFinite(t) && now >= t && now - t < NEW_DAYS * DAY_MS
}

/**
 * 정렬한 새 배열 (list는 바꾸지 않음). sort = 'recommended' | 'latest' (모르면 추천순)
 * @param {{ recommended?: string[], base?: object[], added?: Record<string,string> }} opts 테스트용
 */
export function sortTemplates(list, sort = DEFAULT_TEMPLATE_SORT, { recommended = RECOMMENDED_TEMPLATES, base = STUDIO_TEMPLATES, added = TEMPLATE_ADDED } = {}) {
  const rec = new Map(recommended.map((k, i) => [k, i]))
  const baseAt = new Map(base.map((t, i) => [t.key, i]))
  const rank = t => (rec.has(t.key) ? rec.get(t.key) : recommended.length + (baseAt.get(t.key) ?? base.length))
  const byRec = (a, b) => rank(a) - rank(b)
  const out = [...list]
  if (sort === 'latest') {
    const ms = t => { const v = templateAddedMs(t, added); return Number.isFinite(v) ? v : -Infinity }
    return out.sort((a, b) => ms(b) - ms(a) || byRec(a, b))
  }
  return out.sort(byRec)
}
