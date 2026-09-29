/**
 * 예시 사진 (템플릿 사진 자리를 채우는 우리 사진) — 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-samples.mjs)
 *
 * ★ 파일: public/studio-assets/samples/<이름>.webp (+ samples/thumbs/<이름>.webp 긴 변 400) — scripts/build-studio-samples.mjs 가 원본 png에서 만든다.
 *   목록: manifest.json의 samples 칸 (에셋 목록 items와 따로 — [요소] → [이미지] 목록에 나오지 않는다)
 *     { id, kind: 'sample', category: apparel|bag|living, type: product|scene|detail|hand, label, file, thumb, w, h, ratio(세로/가로) }
 * ★ 템플릿 사진 자리마다 어울리는 종류(product = 첫 화면·제품, scene = 생활 연출, detail = 확대, hand = 손으로 쓰는 모습)를 적을 수 있다
 *   (studioTemplates.templateSlotTypes). 갤러리 그림·미리보기는 그 카테고리의 예시 사진으로 자리를 채워 그린다.
 * ★ 템플릿을 적용할 때 고객 사진이 모자라면 남은 자리에 예시 사진을 에셋 요소로 둔다:
 *     { type: 'asset', asset: 'samples/….webp', fit: 'cover', sample: true, label: '예시 사진', radius? }
 *   편집기는 "예시" 표시를 붙이고, [다운로드]·[작업 저장](→ 판매처로 보내기) 전에 "예시 사진이 n장 남아 있어요"를 묻는다
 *   (예시 사진이 모르게 판매 페이지에 나가지 않게). [내 사진으로 바꾸기] = 자리·크기 그대로 고객 사진 요소로 (studioPage.replaceSampleWithImage).
 */
import { isAssetPath } from './studioAsset.js'

export const SAMPLE_DIR = 'samples'
export const SAMPLE_CATEGORIES = ['apparel', 'bag', 'living']
export const SAMPLE_TYPES = ['product', 'scene', 'detail', 'hand']
export const SAMPLE_TYPE_LABELS = { product: '제품', scene: '연출', detail: '확대', hand: '손 연출' }
export const SAMPLE_LABEL = '예시 사진'
export const SAMPLE_THUMB_SIZE = 400

const NAME = /^euchs-sample_(apparel|bag|living)_(product|scene|detail|hand)_([a-z0-9-]+)_(\d{2})$/
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

// 템플릿 카테고리 → 예시 사진 카테고리 (예시 사진이 없는 카테고리는 생활용품 사진으로)
const CATEGORY_OF_TEMPLATE = { apparel: 'apparel', bags: 'bag', living: 'living', kitchen: 'living', fullset: 'living' }
export function sampleCategoryOf(tpl) {
  if (SAMPLE_CATEGORIES.includes(tpl?.sampleCategory)) return tpl.sampleCategory
  return CATEGORY_OF_TEMPLATE[tpl?.category] ?? 'living'
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
