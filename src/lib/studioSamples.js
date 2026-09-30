/**
 * 예시 사진 (템플릿 사진 자리를 채우는 우리 사진) — 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-samples.mjs)
 *
 * ★ 파일: public/studio-assets/samples/<이름>.webp (+ samples/thumbs/<이름>.webp 긴 변 400) — scripts/build-studio-samples.mjs 가 원본 png에서 만든다.
 *   목록: manifest.json의 samples 칸 (에셋 목록 items와 따로 — [요소] → [이미지] 목록에 나오지 않는다)
 *     { id, kind: 'sample', category: SAMPLE_CATEGORIES 중 하나, type: product|scene|detail|hand, label, file, thumb, w, h, ratio(세로/가로) }
 *   템플릿 ↔ 사진 카테고리는 이름 규칙(TEMPLATE_SAMPLE_CHAIN) — 새 카테고리 사진을 넣고 npm run studio:assets만 돌리면 그 카테고리 템플릿이 그 사진을 쓴다.
 *   갤러리·적용의 사진 나누기는 assignSamples 하나 (카드끼리 대표 사진이 겹치지 않게, 한 템플릿 안에서 같은 사진 반복 없음).
 * ★ 템플릿 사진 자리마다 어울리는 종류(product = 첫 화면·제품, scene = 생활 연출, detail = 확대, hand = 손으로 쓰는 모습)를 적을 수 있다
 *   (studioTemplates.templateSlotTypes). 갤러리 그림·미리보기는 그 카테고리의 예시 사진으로 자리를 채워 그린다.
 * ★ 템플릿을 적용할 때 고객 사진이 모자라면 남은 자리에 예시 사진을 에셋 요소로 둔다:
 *     { type: 'asset', asset: 'samples/….webp', fit: 'cover', sample: true, label: '예시 사진', radius? }
 *   편집기는 "예시" 표시를 붙이고, [다운로드]·[작업 저장](→ 판매처로 보내기) 전에 "예시 사진이 n장 남아 있어요"를 묻는다
 *   (예시 사진이 모르게 판매 페이지에 나가지 않게). [내 사진으로 바꾸기] = 자리·크기 그대로 고객 사진 요소로 (studioPage.replaceSampleWithImage).
 */
import { isAssetPath } from './studioAsset.js'

export const SAMPLE_DIR = 'samples'
// 예시 사진 카테고리 (파일 이름 euchs-sample_<카테고리>_… — 지금 사진이 있는 것 = apparel·bag·living).
// 뒤 9개는 사진이 들어오면 바로 쓰는 이름 (주방·식품·건강식품·뷰티·전자·완구·반려동물·스포츠·명절 선물) — 에셋 목록 카테고리 이름과 같게
// 끝 3개(유아·캠핑·인테리어)는 촬영 세트 템플릿(studioTemplateShoots) 사진 — 그 템플릿이 사진을 정해 두고 쓴다(samplePins)
export const SAMPLE_CATEGORIES = ['apparel', 'bag', 'living', 'kitchen', 'food', 'health', 'beauty', 'digital', 'toy', 'pet', 'sports', 'gift', 'baby', 'camping', 'interior']
export const SAMPLE_TYPES = ['product', 'scene', 'detail', 'hand']
export const SAMPLE_TYPE_LABELS = { product: '제품', scene: '연출', detail: '확대', hand: '손 연출' }
export const SAMPLE_LABEL = '예시 사진'
export const SAMPLE_THUMB_SIZE = 400

const NAME = new RegExp(`^euchs-sample_(${SAMPLE_CATEGORIES.join('|')})_(product|scene|detail|hand)_([a-z0-9-]+)_(\\d{2})$`)
/** 'euchs-sample_apparel_product_beige-knit-hanger_01' → { category, type, slug, no } (모양이 다르면 null) */
export function parseSampleName(base) {
  const m = NAME.exec(String(base ?? ''))
  return m ? { category: m[1], type: m[2], slug: m[3], no: m[4] } : null
}
/** 'samples/x.webp' → 'samples/thumbs/x.webp' */
export function sampleThumbPath(file) {
  const name = String(file).split('/').pop().replace(/\.[a-z0-9]+$/, '')
  return `${SAMPLE_DIR}/thumbs/${name}.webp`
}

const KEY = /^[a-z0-9][a-z0-9_-]*$/
/** manifest.json의 samples → 쓸 수 있는 목록 (이상한 항목은 빼고 사유) */
export function readSamples(raw) {
  const samples = [], problems = []
  const ids = new Set()
  for (const e of Array.isArray(raw) ? raw : []) {
    const why = !e || typeof e !== 'object' ? '객체가 아님'
      : !KEY.test(String(e.id ?? '')) || ids.has(e.id) ? 'id'
        : e.kind !== 'sample' ? 'kind'
          : !SAMPLE_CATEGORIES.includes(e.category) ? 'category'
            : !SAMPLE_TYPES.includes(e.type) ? 'type'
              : !isAssetPath(e.file) || !e.file.startsWith(`${SAMPLE_DIR}/`) ? '파일 경로'
                : !(Number.isFinite(e.w) && Number.isFinite(e.h) && e.w > 0 && e.h > 0) ? '크기' : null
    if (why) { problems.push(`예시 사진을 뺌 (${why}): ${JSON.stringify(e?.id ?? e?.file ?? e)}`); continue }
    ids.add(e.id)
    samples.push({
      id: e.id, kind: 'sample', category: e.category, type: e.type, label: typeof e.label === 'string' && e.label ? e.label : SAMPLE_LABEL,
      file: e.file, ...(isAssetPath(e.thumb) ? { thumb: e.thumb } : {}), w: e.w, h: e.h, ratio: Math.round((e.h / e.w) * 10000) / 10000,
    })
  }
  return { samples, problems }
}

/**
 * 템플릿 카테고리 → 예시 사진 카테고리 차례 (앞 = 가장 가까움). 이름으로만 정한다:
 * 그 카테고리 사진이 manifest에 생기면(예: 'beauty') 코드를 고치지 않아도 그 사진부터 쓰고, 없으면 뒤의 가까운 사진으로 임시로 채운다.
 * 표에 없는 템플릿 카테고리 = [그 이름, 끝 s를 뗀 이름, 생활용품].
 */
export const TEMPLATE_SAMPLE_CHAIN = {
  apparel: ['apparel'],
  bags: ['bag'],
  living: ['living'],
  kitchen: ['kitchen', 'living'],
  beauty: ['beauty', 'bag', 'living'],       // 화장대·소품 연출이 가까움
  electronics: ['digital', 'living', 'bag'],
  toys: ['toy', 'living', 'apparel'],
  pets: ['pet', 'living', 'apparel'],
  fullset: ['living'],
  common: ['apparel', 'bag', 'living'],
  event: ['sports', 'health', 'living', 'bag', 'apparel'], // 상품 한 장 자리(신상·특가·1+1·품절 임박) — 알맞은 템플릿 카테고리가 없는 사진부터. 선물 템플릿은 sampleCategories로 따로
  food: ['food', 'kitchen', 'living'],
  health: ['health', 'food', 'living'],
  sports: ['sports', 'apparel', 'bag'],
  gift: ['gift', 'living', 'bag'],
  baby: ['baby', 'toy', 'living'],
  camping: ['camping', 'sports', 'living'],
  interior: ['interior', 'living'],
}
/**
 * 이 템플릿이 쓸 예시 사진 카테고리 차례 — 템플릿에 sampleCategories(배열)를 적었으면 그것, 아니면 카테고리 이름 규칙.
 * sampleCategory(하나)를 적은 템플릿은 그것부터.
 */
export function sampleCategoriesOf(tpl) {
  const cat = String(tpl?.category ?? '')
  const base = Array.isArray(tpl?.sampleCategories) && tpl.sampleCategories.length ? tpl.sampleCategories : (TEMPLATE_SAMPLE_CHAIN[cat] ?? [cat, cat.replace(/s$/, ''), 'living'])
  const first = SAMPLE_CATEGORIES.includes(tpl?.sampleCategory) ? [tpl.sampleCategory] : []
  return [...new Set([...first, ...base].filter(c => SAMPLE_CATEGORIES.includes(c)))]
}
/** 차례 중 사진이 실제로 있는 첫 카테고리 (samples를 안 주면 차례의 첫 카테고리) */
export function sampleCategoryOf(tpl, samples = null) {
  const chain = sampleCategoriesOf(tpl)
  if (!samples) return chain[0] ?? 'living'
  return chain.find(c => samples.some(s => s.category === c)) ?? chain[0] ?? 'living'
}
/** 종류를 적지 않은 자리 — 첫 자리 = 제품, 그다음은 연출 → 확대 → 제품 차례 */
export function defaultSlotType(order) {
  return order === 0 ? 'product' : ['scene', 'detail', 'product'][(order - 1) % 3]
}
// 그 카테고리에 그 종류가 없을 때 (의류·가방 = 손 연출 없음, 생활용품 = 확대 없음)
const FALLBACK = {
  product: ['product', 'scene', 'detail', 'hand'],
  scene: ['scene', 'product', 'hand', 'detail'],
  detail: ['detail', 'hand', 'product', 'scene'],
  hand: ['hand', 'detail', 'scene', 'product'],
}
/**
 * 자리마다 예시 사진 고르기 — 같은 종류가 여러 자리면 목록 순서대로 다른 사진 (다 쓰면 처음부터 다시).
 * @param {string[]} types 자리 순서대로 종류
 * @returns {(object|null)[]} 자리 순서대로 예시 사진 (그 카테고리에 사진이 하나도 없으면 null)
 */
export function pickSamples(types, samples, category) {
  const pool = (samples || []).filter(s => s.category === category)
  const used = new Map()
  return (types || []).map(t => {
    for (const k of FALLBACK[t] ?? FALLBACK.product) {
      const list = pool.filter(s => s.type === k)
      if (!list.length) continue
      const n = used.get(k) ?? 0
      used.set(k, n + 1)
      return list[n % list.length]
    }
    return null
  })
}

const lessThan = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
  return false
}
/**
 * 여러 템플릿에 예시 사진을 한 번에 나눠 준다 — 갤러리 카드가 서로 다른 사진을 쓰게.
 * @param {{ key, chain: string[], types: string[], cover: number[], pins?: (string|null)[] }[]} entries
 *   chain = 예시 사진 카테고리 차례(sampleCategoriesOf), types = 자리 순서대로 종류, cover = 첫 구간(카드 표지)에 있는 자리 차례
 *   pins = 자리 순서대로 정해 둔 사진 id (촬영 세트 템플릿 — 한 벌로 찍은 사진을 그 템플릿만 쓴다)
 * 규칙 (앞이 먼저):
 *   · 정해 둔 사진(pins)은 그 자리에 먼저 넣고, 다른 템플릿은 그 사진을 고르지 않는다 (그래서 나머지 템플릿의 나눔은 pins가 없을 때와 같다)
 *   · 한 템플릿 안에서는 같은 사진을 두 번 쓰지 않는다 (사진이 모자라면 그 자리는 null — 부르는 쪽이 빈 자리로 둔다)
 *   · 대표(첫 자리)와 표지의 다른 자리는 다른 템플릿 표지에 이미 쓴 사진을 피한다 — 피할 수 없을 때만 다시 쓴다
 *   · 표지 아닌 자리는 아직 안 쓴 사진 먼저(차례 안에서) → 그다음 카테고리 가까운 순서 → 종류가 맞는 순서(FALLBACK) → 덜 쓴 사진 → 목록 순서
 *   · 고르는 차례: 표지의 대표 전부 → 표지 나머지 → 나머지 자리 (첫 구간에 사진이 없는 안내·이벤트 템플릿은 나머지 자리로). 템플릿은 쓸 수 있는 카테고리가 적은 것부터 (넓게 고를 수 있는 템플릿이 남는 사진을 가져간다)
 * @returns {Map<string, (object|null)[]>}
 */
export function assignSamples(entries, samples) {
  const list = samples || []
  const present = new Set(list.map(s => s.category))
  const out = new Map(entries.map(e => [e.key, e.types.map(() => null)]))
  const mine = new Map(entries.map(e => [e.key, new Set()]))
  const uses = new Map()
  const onCover = new Set()
  const width = e => e.chain.filter(c => present.has(c)).length
  const order = entries.map((e, i) => ({ e, i })).sort((a, b) => width(a.e) - width(b.e) || a.i - b.i).map(x => x.e)
  const byId = new Map(list.map(s => [s.id, s]))
  const pinned = new Set(entries.flatMap(e => (e.pins || []).filter(id => byId.has(id))))
  for (const e of entries) {
    (e.pins || []).forEach((id, slot) => {
      if (id === null || id === undefined || slot >= e.types.length) return
      const s = byId.get(id)
      if (!s) { console.error('[studioSamples] 정해 둔 예시 사진이 목록에 없음 — 그 자리는 카테고리 사진으로:', e.key, id); return }
      out.get(e.key)[slot] = s
      mine.get(e.key).add(s.id)
      uses.set(s.id, (uses.get(s.id) ?? 0) + 1)
      if (e.cover.includes(slot)) onCover.add(s.id)
    })
  }
  const pick = (e, slot, cover) => {
    const ranks = FALLBACK[e.types[slot]] ?? FALLBACK.product
    let best = null, bestScore = null
    list.forEach((s, idx) => {
      const c = e.chain.indexOf(s.category)
      const t = ranks.indexOf(s.type)
      if (c < 0 || t < 0 || mine.get(e.key).has(s.id) || pinned.has(s.id)) return
      const n = uses.get(s.id) ?? 0
      // 표지 = 다른 표지에 쓴 사진 피하기 먼저 / 나머지 자리 = 아직 아무 템플릿도 안 쓴 사진 먼저 (차례 안의 카테고리에서 — 사진을 고르게 쓰게)
      const score = cover ? [onCover.has(s.id) ? 1 : 0, c, t, n, idx] : [n > 0 ? 1 : 0, c, t, n, idx]
      if (!best || lessThan(score, bestScore)) { best = s; bestScore = score }
    })
    if (!best) return
    out.get(e.key)[slot] = best
    mine.get(e.key).add(best.id)
    uses.set(best.id, (uses.get(best.id) ?? 0) + 1)
    if (cover) onCover.add(best.id)
  }
  for (const e of order) if (e.types.length && e.cover.includes(0) && !out.get(e.key)[0]) pick(e, 0, true)
  for (const e of order) for (const i of e.cover) if (i > 0 && i < e.types.length && !out.get(e.key)[i]) pick(e, i, true)
  for (const e of order) e.types.forEach((_, i) => { if (!out.get(e.key)[i]) pick(e, i, false) })
  return out
}

/** 페이지의 예시 사진 요소인지 */
export function isSampleItem(it) {
  return !!it && it.type === 'asset' && it.sample === true && typeof it.asset === 'string' && it.asset.startsWith(`${SAMPLE_DIR}/`)
}
/** 페이지에 남은 예시 사진 (숨긴 것은 내보내지 않으니 뺀다) — [{ sectionId, item }] 위에서부터 */
export function sampleItemsOf(page) {
  const out = []
  for (const s of page?.sections || []) for (const it of s.items || []) if (isSampleItem(it) && !it.hidden) out.push({ sectionId: s.id, item: it })
  return out
}
