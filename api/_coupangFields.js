/**
 * 쿠팡 보내기 항목 규칙 — 순수 함수만 (import·process.env 없음). 서버(api/_coupang.js·api/marketplace.js)와 화면(StudioSendModal)이 같은 파일을 쓴다.
 * 테스트: scripts/test-marketplace.mjs
 *
 * [근거 — 쿠팡 상품 생성 API developers.coupang.com/hc/ko/articles/360033877853, 2026-09-28 확인]
 *   deliveryMethod   SEQUENCIAL(일반배송) · COLD_FRESH · MAKE_ORDER · AGENT_BUY(구매대행) · VENDOR_DIRECT
 *   overseasPurchased OVERSEAS_PURCHASED / NOT_OVERSEAS_PURCHASED(기본) — items[]
 *   pccNeeded        "해외구매대행 상품인 경우 반드시 true" — items[]
 *   outboundShippingPlaceCode "해외구매대행(AGENT_BUY) 선택시 해외주소지만 입력가능함"
 *   searchTags       "1개의 검색어 당 20자 이내로, 최대 20개 … !@#$%^&*-+;:'. 외의 특수문자는 입력불가" — items[]
 *   displayProductName 노출상품명 100자 "[brand]+[generalProductName]과 동일하게 입력할 것을 권장"
 *   generalProductName 제품명 "구매옵션 정보(사이즈, 색상 등)를 포함하지 않는 상품명"
 *   attributes       attributeTypeName 25자 · attributeValueName 30자(단위 포함) · "구매옵션의 모든 값이 중복될 경우 등록 불가"
 *   certifications   필요 없으면 certificationType "NOT_REQUIRED" · certificationCode ""
 *   requiredDocuments templateName(카테고리 메타) · vendorDocumentPath 150자 · 5MB 이하 (PDF, HWP, DOC, DOCX, TXT, PNG, JPG, JPEG)
 *   adultOnly ADULT_ONLY/EVERYONE · taxType TAX/FREE · parallelImported PARALLEL_IMPORTED/NOT_PARALLEL_IMPORTED
 *   offerCondition NEW·REFURBISHED·USED_BEST·USED_GOOD·USED_NORMAL (생성 후 변경 불가) · unionDeliveryType UNION_DELIVERY/NOT_UNION_DELIVERY
 *   maximumBuyForPerson 제한 없음 = 0 · maximumBuyForPersonPeriod 제한 없음 = 1 · items 최대 200
 * [근거 — 카테고리 메타 developers.coupang.com/ko/api/categories/category-metadata-query]
 *   attributes.exposed EXPOSED = 구매옵션 / NONE = 검색옵션 · groupNumber = 택1 묶음 · requiredDocumentNames.required
 *   MANDATORY·OPTIONAL·MANDATORY_PARALLEL_IMPORTED·MANDATORY_OVERSEAS_PURCHASED · certifications.dataType CODE/NONE · required MANDATORY/RECOMMEND/OPTIONAL
 */

// ── 판매 방식 (기본값 없음 — 고객이 반드시 고른다) ──
export const AGENT_DEFAULT_DAYS = 10 // 해외구매대행 출고 소요일 기본 (문서에 제한 없음 — 우리 템플릿 범위 1~30 안에서 고객이 고친다)
export const OUTBOUND_DAYS_MIN = 1
export const OUTBOUND_DAYS_MAX = 30
export const SALE_MODES = {
  domestic: { label: '국내 재고 판매', deliveryMethod: 'SEQUENCIAL', overseasPurchased: 'NOT_OVERSEAS_PURCHASED', pccNeeded: false },
  agent: { label: '해외구매대행', deliveryMethod: 'AGENT_BUY', overseasPurchased: 'OVERSEAS_PURCHASED', pccNeeded: true },
}
export const isSaleMode = m => Object.prototype.hasOwnProperty.call(SALE_MODES, String(m))
/** 판매 방식을 고른 직후의 출고 소요일 — 국내 = 템플릿 값, 해외구매대행 = 템플릿 값과 AGENT_DEFAULT_DAYS 중 큰 값 */
export function defaultOutboundDays(mode, templateDays) {
  const t = Number.isInteger(Number(templateDays)) ? Number(templateDays) : null
  if (mode === 'agent') return Math.min(OUTBOUND_DAYS_MAX, Math.max(t ?? 0, AGENT_DEFAULT_DAYS))
  return t
}

// ── 고급 설정 (기본값) ──
export const ENUMS = {
  parallelImported: ['NOT_PARALLEL_IMPORTED', 'PARALLEL_IMPORTED'],
  taxType: ['TAX', 'FREE'],
  adultOnly: ['EVERYONE', 'ADULT_ONLY'],
  offerCondition: ['NEW', 'REFURBISHED', 'USED_BEST', 'USED_GOOD', 'USED_NORMAL'],
  unionDeliveryType: ['NOT_UNION_DELIVERY', 'UNION_DELIVERY'],
}
export const ENUM_LABEL = {
  NOT_PARALLEL_IMPORTED: '병행수입 아님', PARALLEL_IMPORTED: '병행수입', TAX: '과세', FREE: '면세',
  EVERYONE: '누구나', ADULT_ONLY: '19세 이상만', NEW: '새 상품', REFURBISHED: '리퍼', USED_BEST: '중고(최상)', USED_GOOD: '중고(상)', USED_NORMAL: '중고(중)',
  NOT_UNION_DELIVERY: '묶음배송 안 함', UNION_DELIVERY: '묶음배송',
}
export function advancedDefaults() {
  return { parallelImported: 'NOT_PARALLEL_IMPORTED', taxType: 'TAX', adultOnly: 'EVERYONE', offerCondition: 'NEW', unionDeliveryType: 'NOT_UNION_DELIVERY', maxPerPerson: 0, maxPerPersonDays: 1 }
}
/** @returns {{ ok:true, value } | { ok:false, message }} */
export function normalizeAdvanced(a = {}) {
  const d = advancedDefaults()
  const out = {}
  for (const k of Object.keys(ENUMS)) {
    const v = a[k] == null || a[k] === '' ? d[k] : String(a[k])
    if (!ENUMS[k].includes(v)) return { ok: false, message: '고급 설정 값을 다시 골라 주세요.' }
    out[k] = v
  }
  const per = a.maxPerPerson == null || a.maxPerPerson === '' ? 0 : Number(a.maxPerPerson)
  const days = a.maxPerPersonDays == null || a.maxPerPersonDays === '' ? 1 : Number(a.maxPerPersonDays)
  if (!Number.isInteger(per) || per < 0 || per > 99999) return { ok: false, message: '1인 구매 제한 수량은 0(제한 없음)~99999예요.' }
  if (!Number.isInteger(days) || days < 1 || days > 365) return { ok: false, message: '1인 구매 제한 기간은 1~365일이에요.' }
  out.maxPerPerson = per
  out.maxPerPersonDays = per === 0 ? 1 : days // 제한 없음 = 0 · 기간 1 (문서)
  return { ok: true, value: out }
}
/** 할인율(%) — 정가·판매가가 올바를 때만. 같으면 0 ("쿠팡가"로 노출) */
export function discountRate(original, sale) {
  const o = Number(original), s = Number(sale)
  if (!(o > 0) || !(s > 0) || s > o) return null
  return Math.round((1 - s / o) * 100)
}

// ── 검색태그 ──
export const TAG_MAX = 20
export const TAG_LEN = 20
const TAG_BAD_CHARS = /[^\p{L}\p{N} !@#$%^&*\-+;:'.]/gu // 문서가 허용한 특수문자 밖
const ALL_SPECIAL = /[^\p{L}\p{N} ]/gu
const HAN = /\p{Script=Han}/u
// 남의 상표 — 자기 브랜드가 아니면 태그로 쓰지 않는다 (소문자·붙여쓰기로 비교)
export const BRAND_WORDS = [
  '나이키', 'nike', '아디다스', 'adidas', '뉴발란스', 'newbalance', '퓨마', 'puma', '컨버스', 'converse', '반스', 'vans', '크록스', 'crocs', '노스페이스', 'northface',
  '샤넬', 'chanel', '구찌', 'gucci', '루이비통', 'louisvuitton', '프라다', 'prada', '에르메스', 'hermes', '디올', 'dior', '버버리', 'burberry', '발렌시아가', 'balenciaga', '몽클레어', 'moncler',
  '애플', 'apple', '아이폰', 'iphone', '에어팟', 'airpods', '삼성', 'samsung', '갤럭시', 'galaxy', '다이슨', 'dyson', '소니', 'sony', '닌텐도', 'nintendo', '샤오미', 'xiaomi',
  '레고', 'lego', '디즈니', 'disney', '산리오', 'sanrio', '헬로키티', 'hellokitty', '포켓몬', 'pokemon', '카카오프렌즈', '라인프렌즈', '스타벅스', 'starbucks', '이케아', 'ikea', '무인양품', 'muji', '유니클로', 'uniqlo', '자라', 'zara',
]
export const BANNED_WORDS = ['짝퉁', '레플리카', '이미테이션', '가품', '정품'] // 진위를 말하는 단어 — 태그로 쓰지 않는다
const squash = s => String(s || '').toLowerCase().replace(/\s+/g, '')

/**
 * 태그 정리 — 허용 밖 특수문자 빼기 · 20자 · 중복 · 남의 상표 · 금칙어 · 20개
 * @param {string[]} list @param {{ brand?:string, strict?:boolean }} o  strict = 특수문자 전부 빼기 (추천용)
 * @returns {{ tags:string[], removed:[{ tag, reason }] }}
 */
export function cleanSearchTags(list, { brand = '', strict = false } = {}) {
  const tags = [], removed = [], seen = new Set()
  const own = squash(brand)
  for (const raw of Array.isArray(list) ? list : []) {
    const src = String(raw ?? '').trim()
    if (!src) continue
    const t = src.replace(strict ? ALL_SPECIAL : TAG_BAD_CHARS, ' ').replace(/\s+/g, ' ').trim()
    if (!t) { removed.push({ tag: src, reason: '쓸 수 없는 글자' }); continue }
    if (t.length > TAG_LEN) { removed.push({ tag: src, reason: `${TAG_LEN}자 넘음` }); continue }
    const key = squash(t)
    if (seen.has(key)) { removed.push({ tag: src, reason: '중복' }); continue }
    if (key !== own && BRAND_WORDS.some(b => key.includes(b))) { removed.push({ tag: src, reason: '다른 회사 상표' }); continue }
    if (BANNED_WORDS.some(b => key.includes(b))) { removed.push({ tag: src, reason: '쓸 수 없는 단어' }); continue }
    if (tags.length >= TAG_MAX) { removed.push({ tag: src, reason: `${TAG_MAX}개 넘음` }); continue }
    seen.add(key)
    tags.push(t)
  }
  return { tags, removed }
}

// 상품명에서 빼는 말 (꾸밈말·거래 조건) — 검색 키워드가 아니다
const FILLER = ['신상', '신상품', '핫딜', '특가', '세일', '할인', '무료배송', '당일발송', '최저가', '인기', '추천', '베스트', '도매', '공장', '직판', '직송', '국경간', '크로스보더', '대량', '맞춤', '제작', '가능', '지원', '신제품', '새로운', '고품질', '핫', '폭발', '인기상품', '해외', '수출', '전용', '용']
const isWord = w => w.length >= 2 && w.length <= TAG_LEN && !HAN.test(w) && !/^\d+$/.test(w) && !/^20\d\d(년|년형)?$/.test(w) && !FILLER.includes(w)
/** 글 → 낱말 (한글·영문·숫자만, 꾸밈말·연도·한 글자 뺌, 순서 유지·중복 뺌) */
export function keywordsOf(text) {
  const out = []
  for (const w of String(text || '').replace(ALL_SPECIAL, ' ').split(/\s+/)) {
    if (isWord(w) && !out.some(x => squash(x) === squash(w))) out.push(w)
  }
  return out
}

/**
 * 검색태그 추천 (규칙 기반 — 외부 호출 없음)
 * @param {{ title?:string, categoryName?:string, attrs?:[{ name, value }], brand?:string }} src  모두 한국어
 * 순서: 카테고리 끝 낱말 → 상품명 낱말 → 이웃한 두 낱말 붙임 → 속성 값
 */
export function suggestSearchTags({ title = '', categoryName = '', attrs = [], brand = '' } = {}) {
  const cat = keywordsOf(String(categoryName).split(/[>/]/).pop())
  const words = keywordsOf(title).filter(w => squash(w) !== squash(brand))
  const pairs = []
  for (let i = 0; i + 1 < words.length && pairs.length < 6; i++) {
    const p = `${words[i]}${words[i + 1]}`
    if (p.length <= TAG_LEN) pairs.push(p)
  }
  const attrWords = []
  for (const a of Array.isArray(attrs) ? attrs : []) for (const w of keywordsOf(a?.value)) if (attrWords.length < 8) attrWords.push(w)
  return cleanSearchTags([...cat, ...words, ...pairs, ...attrWords], { brand, strict: true }).tags
}

// ── 상품명 ──
export const NAME_MAX = 100
const cut = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '').trim() || t.slice(0, n) }
/**
 * 제품명 추천 — 상품명에서 꾸밈말·옵션 값(색상·사이즈 …)을 뺀다. 카테고리 끝 낱말(검색 키워드)을 앞에 둔다.
 * @param {{ title, categoryName?, optionValues?:string[] }} src
 */
export function suggestGeneralName({ title = '', categoryName = '', optionValues = [] } = {}) {
  const drop = new Set((Array.isArray(optionValues) ? optionValues : []).map(squash).filter(Boolean))
  const words = keywordsOf(title).filter(w => !drop.has(squash(w)))
  const lead = keywordsOf(String(categoryName).split(/[>/]/).pop()).filter(c => words.some(w => squash(w).includes(squash(c)) || squash(c).includes(squash(w))))
  const head = words.filter(w => lead.some(c => squash(w).includes(squash(c)) || squash(c).includes(squash(w))))
  return cut([...head, ...words.filter(w => !head.includes(w))].join(' '), NAME_MAX)
}
/** 노출상품명 추천 — 문서 권장 "[brand] + [generalProductName]" */
export function suggestDisplayName({ brand = '', generalName = '' } = {}) {
  const b = String(brand || '').trim(), g = String(generalName || '').trim()
  if (!g) return ''
  return cut(b && !squash(g).startsWith(squash(b)) ? `${b} ${g}` : g, NAME_MAX)
}

// ── 1688 옵션 → 쿠팡 옵션 ──
export const ITEMS_MAX = 200
export const STOCK_MAX = 99999
const str = v => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')
const absUrl = u => { const s = str(u); return !s ? '' : s.startsWith('//') ? `https:${s}` : s }

/**
 * OneBound item_get 원본(item) → 옵션 줄. skus.sku[] + props_list + props_img (src/services/api1688.js와 같은 기준)
 * 가격은 1688 원본(위안) 그대로 — 원화 판매가는 만들지 않는다(고객이 넣는다). 재고 0은 0 그대로.
 * @returns {{ rows:[{ skuId, values:[{ name, value }], priceCny:number|null, stock:number|null, imageUrl }], total:number }}  값은 원문(번역 전)
 */
export function extractSkus1688(item) {
  const out = { rows: [], total: 0 }
  if (!item || typeof item !== 'object') return out
  const skus = item.skus && Array.isArray(item.skus.sku) ? item.skus.sku : Array.isArray(item.skus) ? item.skus : []
  const pl = item.props_list && typeof item.props_list === 'object' && !Array.isArray(item.props_list) ? item.props_list : {}
  const pi = item.props_img || item.prop_imgs || {}
  const imgOf = id => absUrl(typeof pi === 'object' && !Array.isArray(pi) ? pi[id] : '')
  out.total = skus.length
  for (const sk of skus.slice(0, ITEMS_MAX)) {
    const ids = str(sk?.properties).split(';').map(s => s.trim()).filter(Boolean)
    let values = ids.map(id => { const s = str(pl[id]); const i = s.indexOf(':'); return i > 0 && i < s.length - 1 ? { name: s.slice(0, i).trim(), value: s.slice(i + 1).trim() } : null }).filter(Boolean)
    if (!values.length) {
      values = str(sk?.properties_name).split(';').map(pair => { const i = pair.lastIndexOf(':'); if (i <= 0) return null; const left = pair.slice(0, i); const j = left.lastIndexOf(':'); return { name: (j >= 0 ? left.slice(j + 1) : left).trim(), value: pair.slice(i + 1).trim() } }).filter(v => v && v.name && v.value)
    }
    if (!values.length) continue
    const price = sk?.price === undefined || sk?.price === null || sk?.price === '' ? null : parseFloat(String(sk.price).replace(/[^0-9.]/g, ''))
    const q = sk?.quantity === undefined || sk?.quantity === null || sk?.quantity === '' ? null : Number(sk.quantity)
    out.rows.push({
      skuId: str(sk?.sku_id), values,
      priceCny: Number.isFinite(price) && price > 0 ? price : null,
      stock: Number.isFinite(q) && q >= 0 ? Math.min(STOCK_MAX, Math.floor(q)) : null,
      imageUrl: ids.map(imgOf).find(Boolean) || '',
    })
  }
  return out
}

// 옵션 종류 이름 → 쿠팡 구매옵션 이름 (카테고리 메타의 이름과 맞춰 본다)
const OPTION_ALIASES = [
  ['색상', ['색상', '색깔', '컬러', '칼라', 'color', 'colour', '颜色', '颜色分类', '顏色']],
  ['사이즈', ['사이즈', '크기', '치수', 'size', '尺码', '尺寸', '规格', '規格', '型号', '码数']],
  ['수량', ['수량', '개수', '입수', '数量', '件数']],
  ['용량', ['용량', '容量', '净含量']],
  ['중량', ['중량', '무게', '重量']],
  ['길이', ['길이', '长度']],
  ['모델', ['모델', '기종', '款式', '型号规格']],
  ['재질', ['재질', '소재', '材质', '材料']],
]
/**
 * 옵션 종류(1688 이름·번역) → 카테고리 메타의 구매옵션 이름. 못 찾으면 '' (고객이 고른다)
 * @param {string[]} names 같은 옵션의 이름 후보(번역, 원문) @param {[{ name, exposed }]} attributes 메타 속성
 */
export function mapOptionName(names, attributes) {
  const list = (Array.isArray(attributes) ? attributes : []).filter(a => a && a.name)
  const buy = list.filter(a => a.exposed !== false)
  const cands = (Array.isArray(names) ? names : [names]).map(squash).filter(Boolean)
  for (const pool of [buy, list]) {
    for (const c of cands) { const hit = pool.find(a => squash(a.name) === c); if (hit) return hit.name }
    for (const c of cands) {
      const group = OPTION_ALIASES.find(([, al]) => al.some(x => squash(x) === c || c.includes(squash(x))))
      if (!group) continue
      const hit = pool.find(a => group[1].some(x => squash(a.name).includes(squash(x))) || squash(a.name).includes(squash(group[0])))
      if (hit) return hit.name
    }
  }
  return ''
}

/** 사진 주소 비교용 열쇠 — 프로토콜·쿼리·크기 꼬리(.jpg_.webp, _400x400.jpg)를 뗀다 */
export function imageKey(url) {
  const s = str(url).replace(/^https?:/, '').replace(/^\/\//, '').split('?')[0].split('#')[0]
  return s.replace(/(\.(?:jpe?g|png|webp|gif))(?:_.*)$/i, '$1').replace(/\.(\d+x\d+)(\.(?:jpe?g|png|webp))$/i, '$2').toLowerCase()
}
/** 1688 옵션 사진 → 작업 사진(id). images = [{ id, sourceUrl }] */
export function matchOptionImage(optionUrl, images) {
  const k = imageKey(optionUrl)
  if (!k) return null
  const hit = (Array.isArray(images) ? images : []).find(im => im && im.sourceUrl && imageKey(im.sourceUrl) === k)
  return hit ? hit.id : null
}

/** 옵션 값에 한글로 옮겨지지 않은 글자가 남았는지 */
export const hasUntranslated = s => HAN.test(String(s || ''))

// ── 상품정보고시 ──
export const NOTICE_LEN = 200
export const NOTICE_SEE_DETAIL = '상세페이지 참조' // 문서 요청 예시에 쓰인 표현
export const ORIGIN_1688 = '중국'
const ORIGIN_RE = /제조국|원산지/
/** 고시 항목 자동 채움 — 1688 상품이면 제조국·원산지만. 나머지는 비워 둔다(고객이 채우거나 [상세페이지 참조로 채우기]) */
export function noticeDefaults(items, { is1688 = false } = {}) {
  const out = {}
  for (const it of Array.isArray(items) ? items : []) if (is1688 && it?.name && ORIGIN_RE.test(it.name)) out[it.name] = ORIGIN_1688
  return out
}

// ── 인증·구비서류 ──
export const CERT_NONE = 'NOT_REQUIRED'
export const DOC_MAX = 5
export const DOC_PATH_MAX = 150
/** 구비서류가 지금 조건에서 필수인지 */
export function docRequired(rule, { saleMode, parallelImported } = {}) {
  if (rule === 'MANDATORY') return true
  if (rule === 'MANDATORY_OVERSEAS_PURCHASED') return saleMode === 'agent'
  if (rule === 'MANDATORY_PARALLEL_IMPORTED') return parallelImported === 'PARALLEL_IMPORTED'
  return false
}
/** 메타의 인증 목록에서 고객이 고를 수 있는 것 (NOT_REQUIRED는 "해당 없음"으로 따로 다룬다) */
export const realCerts = certs => (Array.isArray(certs) ? certs : []).filter(c => c && c.type && c.type !== CERT_NONE)

// ── 보내기 전 요약 (화면 미리보기 표) ──
const won = n => (Number(n) > 0 ? `${Number(n).toLocaleString('ko-KR')}원` : '')
/**
 * @param {object} f  보내기 창 값 { saleMode, outboundDays, productName, displayName, generalName, brand, manufacture, modelNo, categoryCode, categoryName,
 *                    tags:[], advanced:{}, items:[{ name, originalPrice, salePrice, stock, sku, attributes:{} }], notices:{}, noticeCategory, certifications:[{ type, code }], documents:[{ templateName }], templateName }
 * @returns {[{ label, value, field }]}  field = 쿠팡 필드명
 */
export function previewRows(f = {}) {
  const mode = SALE_MODES[f.saleMode]
  const adv = { ...advancedDefaults(), ...(f.advanced || {}) }
  const items = Array.isArray(f.items) ? f.items : []
  const prices = items.map(i => Number(i.salePrice)).filter(n => n > 0)
  const priceText = !prices.length ? '' : Math.min(...prices) === Math.max(...prices) ? won(prices[0]) : `${won(Math.min(...prices))} ~ ${won(Math.max(...prices))}`
  const certs = (f.certifications || []).filter(c => c && c.type && c.type !== CERT_NONE)
  const rows = [
    ['판매 방식', mode ? mode.label : '', 'deliveryMethod · overseasPurchased · pccNeeded'],
    ['배송방법', mode ? mode.deliveryMethod : '', 'deliveryMethod'],
    ['개인통관고유부호', mode ? (mode.pccNeeded ? '받음' : '받지 않음') : '', 'pccNeeded'],
    ['출고 소요일', f.outboundDays ? `${f.outboundDays}일` : '', 'outboundShippingTimeDay'],
    ['등록상품명', f.productName, 'sellerProductName'],
    ['노출상품명', f.displayName || f.productName, 'displayProductName'],
    ['제품명', f.generalName, 'generalProductName'],
    ['브랜드', f.brand, 'brand'],
    ['제조사', f.manufacture || f.brand, 'manufacture'],
    ['모델번호', f.modelNo, 'modelNo'],
    ['카테고리', f.categoryCode ? `${f.categoryName || ''} #${f.categoryCode}`.trim() : '', 'displayCategoryCode'],
    ['검색태그', (f.tags || []).join(', '), 'searchTags'],
    ['옵션', items.length ? `${items.length}개` : '', 'items'],
    ['판매가', priceText, 'salePrice'],
    ['상품정보고시', f.noticeCategory ? `${f.noticeCategory} · ${Object.values(f.notices || {}).filter(v => String(v || '').trim()).length}항목` : '', 'notices'],
    ['인증정보', certs.length ? certs.map(c => c.name || c.type).join(', ') : '해당 없음', 'certifications'],
    ['구비서류', (f.documents || []).length ? f.documents.map(d => d.templateName).join(', ') : '없음', 'requiredDocuments'],
    ['과세', ENUM_LABEL[adv.taxType], 'taxType'],
    ['구매 대상', ENUM_LABEL[adv.adultOnly], 'adultOnly'],
    ['상품 상태', ENUM_LABEL[adv.offerCondition], 'offerCondition'],
    ['병행수입', ENUM_LABEL[adv.parallelImported], 'parallelImported'],
    ['묶음배송', ENUM_LABEL[adv.unionDeliveryType], 'unionDeliveryType'],
    ['1인 구매 제한', Number(adv.maxPerPerson) > 0 ? `${adv.maxPerPersonDays}일에 ${adv.maxPerPerson}개` : '제한 없음', 'maximumBuyForPerson · maximumBuyForPersonPeriod'],
    ['배송/반품 템플릿', f.templateName, 'deliveryChargeType …'],
  ]
  return rows.map(([label, value, field]) => ({ label, value: String(value ?? ''), field }))
}
