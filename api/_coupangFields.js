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
// 다른 판매 플랫폼 이름 — 남의 상표와 같게 다룬다 (1688 속성 "주요 판매 플랫폼"에서 태그로 딸려 오던 말)
export const PLATFORM_WORDS = [
  '타오바오', 'taobao', '티몰', 'tmall', '알리익스프레스', 'aliexpress', '알리바바', 'alibaba', '1688', '이베이', 'ebay', '아마존', 'amazon',
  '테무', 'temu', '쉬인', 'shein', '핀둬둬', '라자다', 'lazada', '쇼피', 'shopee', '징동', '틱톡', 'tiktok', '도우인',
]
// 태그 추천에서 빼는 말 — 낱말이 통째로 같을 때만 (고객이 직접 넣는 것은 막지 않는다)
//   지명(상품이 아니라 산지·판매 지역) · 플랫폼 이름의 번역 찌꺼기(경동 = 京东, 소원 = wish) · 뜻 없는 말
export const SUGGEST_DROP_WORDS = [
  '이우', '광저우', '선전', '심천', '항저우', '닝보', '원저우', '둥관', '동관', '포산', '산터우', '취안저우', '샤먼', '칭다오', '쑤저우', '상하이', '베이징', '톈진', '충칭', '청두', '우한',
  '저장', '저장성', '광둥', '광둥성', '광동', '광동성', '푸젠', '푸젠성', '복건', '복건성', '장쑤', '장쑤성', '산둥', '산둥성', '허베이', '허난',
  '중국', '중국산', '대륙', '본토', '홍콩', '대만', '일본', '미국', '유럽', '한국', '러시아', '중동', '아프리카', '남미', '북미', '동남아', '동남아시아',
  '경동', '소원', '위시', 'wish', '독립몰', '독립사이트', '독립역',
  '기타', '없음', '있음', '예', '아니오', '아니요', '기본', '일반', '표준', '보통', '해당없음', '불가', '제품', '상품', '물품', '재고', '현물', '브랜드',
]
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
    if (key !== own && (BRAND_WORDS.some(b => key.includes(b)) || PLATFORM_WORDS.some(b => key.includes(b)))) { removed.push({ tag: src, reason: '다른 회사 상표' }); continue }
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

const DROP_SET = new Set(SUGGEST_DROP_WORDS.map(squash))
const SIZE_WORD = /^(x{0,4}[sml]|\d*xl|free|f)$/i // 옵션 값의 사이즈 표기 — 검색 키워드가 아니다
const tagWord = w => !DROP_SET.has(squash(w))
/**
 * 검색태그 추천 (규칙 기반 — 외부 호출 없음)
 * @param {{ title?:string, categoryName?:string, options?:string[], brand?:string }} src  모두 한국어
 * 재료는 상품명·카테고리·옵션 값뿐 — 1688 상품 속성(산지·주요 판매 플랫폼·판매 지역 …)은 쓰지 않는다 (2026-09-28 운영: "이우, 타오바오, 경동, 이베이, 아마존, 소원"이 들어감)
 * 순서: 카테고리 끝 낱말 → 상품명 낱말 → 이웃한 두 낱말 붙임 → 옵션 값.  지명·플랫폼 이름·뜻 없는 말은 뺀다
 */
export function suggestSearchTags({ title = '', categoryName = '', options = [], brand = '' } = {}) {
  const cat = keywordsOf(String(categoryName).split(/[>/]/).pop()).filter(tagWord)
  const words = keywordsOf(title).filter(w => squash(w) !== squash(brand) && tagWord(w))
  const pairs = []
  for (let i = 0; i + 1 < words.length && pairs.length < 6; i++) {
    const p = `${words[i]}${words[i + 1]}`
    if (p.length <= TAG_LEN) pairs.push(p)
  }
  const optWords = []
  for (const o of Array.isArray(options) ? options : []) for (const w of keywordsOf(o)) if (optWords.length < 8 && tagWord(w) && !SIZE_WORD.test(w) && !/\d/.test(w)) optWords.push(w)
  return cleanSearchTags([...cat, ...words, ...pairs, ...optWords], { brand, strict: true }).tags
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

// ── 옵션 이름 자동 생성 (items[].itemName) ──
// API는 itemName이 필수지만 Wing은 구매옵션 값만 넣으면 이름을 만들어 준다 — 우리도 같게: 구매옵션 값을 " / "로 잇는다
export const ITEM_NAME_MAX = 150
export const ITEM_NAME_JOIN = ' / '
/**
 * @param {string[][]} rows 옵션마다 구매옵션 값 (옵션 종류 순서대로)
 * @returns {string[]} 옵션 이름 — 색상만 "블랙", 색상+사이즈 "블랙 / M". 같은 이름이 또 나오면 뒤에 번호("블랙 2"). 값이 하나도 없으면 ''
 */
export function autoItemNames(rows) {
  const used = new Set(), out = []
  for (const row of Array.isArray(rows) ? rows : []) {
    const base = (Array.isArray(row) ? row : []).map(v => String(v ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(ITEM_NAME_JOIN).slice(0, ITEM_NAME_MAX).trim()
    if (!base) { out.push(''); continue }
    let name = base
    for (let n = 2; used.has(name); n++) { const tail = ` ${n}`; name = `${base.slice(0, ITEM_NAME_MAX - tail.length).trim()}${tail}` }
    used.add(name)
    out.push(name)
  }
  return out
}

// ── 브랜드 ──
// [근거] 상품 생성 API(360033877853): brand(선택) "한글/영어 표준이름 … 띄어쓰기 및 특수문자 없이" · brandId(선택) "고유 브랜드 식별자 (예: KR-5)" · manufacture(선택)
// [근거] 브랜드 검색 API(58230017410841): POST …/marketplace/brands/search  본문 { brandName(필수), countPerPage(기본 10·최대 10), page }
//        → data.items[] { brandId, brandName, brandLogoUrl, isUIDRequired, allowedUIDTypes } · data.totalCount
// 브랜드 이름을 쓰려면 brandId를 같이 보낸다. 브랜드가 없는 상품은 brand·brandId를 보내지 않는다 (2026-05-22 브랜드 관리 강화 — 해성 확인)
export const BRAND_MAX = 50
export const BRAND_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/
export const BRAND_NOT_FOUND = '쿠팡에 등록된 브랜드가 아니에요. 브랜드 없음으로 보내거나 Wing 브랜드 관리에서 먼저 등록해 주세요.'
/** 브랜드 검색 응답 → [{ brandId, brandName, uidRequired, uidTypes }] (이상한 줄·중복 뺌) */
export function normalizeBrands(res) {
  const list = res?.data?.items ?? res?.items ?? []
  const out = []
  for (const b of Array.isArray(list) ? list : []) {
    const brandId = str(b?.brandId), brandName = str(b?.brandName)
    if (!BRAND_ID_RE.test(brandId) || !brandName || out.some(x => x.brandId === brandId)) continue
    out.push({ brandId, brandName, uidRequired: b?.isUIDRequired === true, uidTypes: (Array.isArray(b?.allowedUIDTypes) ? b.allowedUIDTypes : []).map(str).filter(Boolean) })
  }
  return out
}
/**
 * 검색 결과에서 보낼 브랜드 고르기
 * @returns {{ state:'none' } | { state:'one', brand } | { state:'many', brands }}  이름이 통째로 같은 것이 하나면 그것, 결과가 하나면 그것, 아니면 고객이 고른다
 */
export function pickBrand(brands, name) {
  const list = Array.isArray(brands) ? brands : []
  if (!list.length) return { state: 'none' }
  const exact = list.filter(b => squash(b.brandName) === squash(name))
  if (exact.length === 1) return { state: 'one', brand: exact[0] }
  if (list.length === 1) return { state: 'one', brand: list[0] }
  return { state: 'many', brands: list }
}
/** 상품명에 널리 알려진 브랜드 이름이 들어 있는지 (브랜드 없음으로 보내려 할 때 경고) — 있으면 그 말, 없으면 '' */
export function brandWordIn(...names) {
  const s = squash(names.join(' '))
  return BRAND_WORDS.find(b => s.includes(b)) || ''
}

// ── 도서산간 택배사 (출고지에 등록된 것만) ──
// [근거] 출고지 조회 API 응답 content[].remoteInfos[] { remoteInfoId, deliveryCode(택배사 코드), jeju, notJeju, usable }
// [근거] 쿠팡 반려 사유(2026-09-28): "도서산간배송 출고지에 등록된 택배사만 선택할 수 있습니다."
export const REMOTE_NONE_NOTE = 'Wing 출고지 관리에서 도서산간 택배사를 등록하면 켤 수 있어요'
export const REMOTE_COURIER_NOTE = '도서산간 배송을 켜면 고른 출고지에 등록된 택배사만 고를 수 있어요'
export const TEMPLATE_COURIER_FIX = '배송·반품 템플릿의 택배사가 출고지에 등록된 도서산간 택배사와 달라요. 설정 > 배송·반품 템플릿에서 템플릿을 열어 다시 저장해 주세요.'
/** 출고지 응답의 remoteInfos → 저장할 목록 (쓸 수 있는 것만, 중복 뺌) */
export function normalizeRemoteInfos(list) {
  const out = []
  for (const r of Array.isArray(list) ? list : []) {
    const code = str(r?.deliveryCode).toUpperCase()
    if (!code || r?.usable === false || out.some(x => x.code === code)) continue
    out.push({ code, jeju: Number(r?.jeju) || 0, notJeju: Number(r?.notJeju) || 0 })
  }
  return out
}
/** 저장된 출고지(marketplace_places 행) → 도서산간 택배사 코드. 아직 읽은 적이 없으면(예전에 저장한 출고지) null = 모름 */
export function remoteCouriersOf(place) {
  const r = place?.address?.remote
  return Array.isArray(r) ? r.map(x => str(x?.code).toUpperCase()).filter(Boolean) : null
}
/**
 * 템플릿의 택배사·도서산간 검사 — 템플릿 화면·템플릿 저장·보내기가 같은 규칙
 * @param {{ place, remoteOn:boolean, company:string }} v
 * @returns {{ known:boolean, couriers:string[], canRemote:boolean, ok:boolean, reason:''|'none'|'courier' }}
 *   known = 출고지의 도서산간 택배사를 읽은 적이 있음 · canRemote = 도서산간 배송을 켤 수 있음 · ok = 지금 값으로 보내도 됨
 */
export function courierRule({ place, remoteOn = false, company = '' } = {}) {
  const couriers = remoteCouriersOf(place)
  if (couriers === null) return { known: false, couriers: [], canRemote: true, ok: true, reason: '' }
  if (!couriers.length) return { known: true, couriers, canRemote: false, ok: !remoteOn, reason: remoteOn ? 'none' : '' }
  const hit = couriers.includes(str(company).toUpperCase())
  return { known: true, couriers, canRemote: true, ok: !remoteOn || hit, reason: remoteOn && !hit ? 'courier' : '' }
}

// ── 상세 이미지 규격 (기타이미지 DETAIL) ──
// [근거] 쿠팡 반려 사유(2026-09-28): "기타이미지(DETAIL) 이미지는 최대 10M 이미지, 최소 500&500, 최대 5000*5000 길이를 만족해야합니다."
export const DETAIL_MIN = 500
export const DETAIL_MAX = 5000
export const DETAIL_MAX_BYTES = 10 * 1024 * 1024
const splitSizes = (len, max) => { const n = Math.max(1, Math.ceil(len / max)), base = Math.floor(len / n), out = []; for (let i = 0; i < n; i++) out.push(i === n - 1 ? len - base * (n - 1) : base); return out }
/**
 * 내 상품 한 장 → 쿠팡에 보낼 조각들
 *   한 변이 5000을 넘으면 같은 크기로 나눈다(조각마다 5000 이하) → 조각의 너비·높이가 500보다 작으면 흰 바탕 가운데에 놓아 500 이상으로
 * @param {{ key:string, width:number, height:number }} file
 * @returns {[{ key, src, x, y, w, h, outW, outH, changed }]}  key = 조각 열쇠('01' 그대로 또는 '01p1'..) · x,y,w,h = 원본에서 잘라낼 곳 · outW,outH = 보낼 크기
 *   크기를 모르면(width·height 없음) 그대로 한 장(changed false)
 */
export function detailImagePlan(file) {
  const key = str(file?.key), W = Math.floor(Number(file?.width)), H = Math.floor(Number(file?.height))
  if (!(W > 0) || !(H > 0)) return [{ key, src: key, x: 0, y: 0, w: 0, h: 0, outW: 0, outH: 0, changed: false }]
  const cols = splitSizes(W, DETAIL_MAX), rows = splitSizes(H, DETAIL_MAX)
  const many = cols.length * rows.length > 1
  const out = []
  let y = 0
  for (const h of rows) {
    let x = 0
    for (const w of cols) {
      const outW = Math.max(w, DETAIL_MIN), outH = Math.max(h, DETAIL_MIN)
      out.push({ key: many ? `${key}p${out.length + 1}` : key, src: key, x, y, w, h, outW, outH, changed: many || outW !== w || outH !== h })
      x += w
    }
    y += h
  }
  return out
}
/** 내 상품 전체 → 조각 목록 (장 순서 그대로) */
export const detailImagePlans = files => (Array.isArray(files) ? files : []).flatMap(detailImagePlan)
/** 요약 표 글자 — "상세 이미지 N장 (쿠팡 규격 맞춤)" */
export const detailImageLabel = files => { const n = detailImagePlans(files).length; return n ? `상세 이미지 ${n}장 (쿠팡 규격 맞춤)` : '' }

// ── 반려 상품 다시 보내기 — 보냈던 본문(쿠팡 상품 생성 본문) → 보내기 창 값 ──
/**
 * @param {object} body marketplace_sends.request_json.body  @returns {object|null} 보내기 창 값(템플릿·대표 이미지·옵션 사진은 없음 — 고객이 다시 고른다)
 */
export function formFromBody(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.items) || !body.items.length) return null
  const first = body.items[0] || {}
  const mode = Object.keys(SALE_MODES).find(k => SALE_MODES[k].deliveryMethod === body.deliveryMethod) || ''
  const types = []
  for (const it of body.items) for (const a of Array.isArray(it?.attributes) ? it.attributes : []) {
    const n = str(a?.attributeTypeName)
    if (n && !types.includes(n)) types.push(n)
  }
  const notices = {}
  for (const n of Array.isArray(first.notices) ? first.notices : []) if (n?.noticeCategoryDetailName) notices[n.noticeCategoryDetailName] = str(n.content)
  const d = advancedDefaults()
  const pick = (k, v) => (ENUMS[k].includes(v) ? v : d[k])
  return {
    saleMode: mode, outboundDays: Number.isInteger(first.outboundShippingTimeDay) ? first.outboundShippingTimeDay : null,
    productName: str(body.sellerProductName), displayName: str(body.displayProductName) === str(body.sellerProductName) ? '' : str(body.displayProductName), generalName: str(body.generalProductName),
    noBrand: !str(body.brand), brand: str(body.brand), brandId: str(body.brandId), manufacture: str(body.manufacture), modelNo: str(first.modelNo),
    categoryCode: body.displayCategoryCode == null ? '' : String(body.displayCategoryCode),
    tags: (Array.isArray(first.searchTags) ? first.searchTags : []).map(str).filter(Boolean),
    noticeCategory: str(first.notices?.[0]?.noticeCategoryName), notices,
    certifications: (Array.isArray(first.certifications) ? first.certifications : []).filter(c => c?.certificationType && c.certificationType !== CERT_NONE).map(c => ({ type: str(c.certificationType), code: str(c.certificationCode) })),
    advanced: {
      parallelImported: pick('parallelImported', first.parallelImported), taxType: pick('taxType', first.taxType), adultOnly: pick('adultOnly', first.adultOnly),
      offerCondition: pick('offerCondition', first.offerCondition), unionDeliveryType: pick('unionDeliveryType', body.unionDeliveryType),
      maxPerPerson: Number.isInteger(first.maximumBuyForPerson) ? first.maximumBuyForPerson : 0, maxPerPersonDays: Number.isInteger(first.maximumBuyForPersonPeriod) ? first.maximumBuyForPersonPeriod : 1,
    },
    optionTypes: types,
    items: body.items.map(it => ({
      name: str(it?.itemName), originalPrice: Number(it?.originalPrice) > 0 ? Number(it.originalPrice) : null, salePrice: Number(it?.salePrice) > 0 ? Number(it.salePrice) : null,
      stock: Number.isInteger(it?.maximumBuyCount) ? it.maximumBuyCount : null, sku: str(it?.externalVendorSku), gtin: str(it?.barcode),
      attributes: Object.fromEntries((Array.isArray(it?.attributes) ? it.attributes : []).filter(a => a?.attributeTypeName).map(a => [str(a.attributeTypeName), str(a.attributeValueName)])),
    })),
  }
}
/**
 * 다시 승인 요청 방법 — 쿠팡 상태와 상관없이 늘 상품 수정 한 번(requested true). 승인 요청 API는 부르지 않는다
 * [근거] 상품 수정(승인필요) requested: "true : 저장 및 자동으로 판매 승인 요청"
 * [근거] 운영 응답(2026-09-29): 승인 요청 API는 상품 조회가 "승인반려"일 때도 "임시저장"일 때도 "'임시저장' 상태의 상품만 승인 요청 가능합니다."로 거절
 *        → 상품 조회의 상태와 승인 요청 API의 판단이 달라서 상태로 나누지 않는다
 * @returns {{ requested:true, callApproval:false, via:'modify' }}
 */
export function resendPlan() {
  return { requested: true, callApproval: false, via: 'modify' }
}

/**
 * 상품 수정 본문에 넣을 옵션 id 맞추기 — 쿠팡 상품 조회(data.items)에서 품번(externalVendorSku) → 옵션 이름 순으로 찾는다
 * [근거] 상품 수정(승인필요): sellerProductId(필수) · items[].sellerProductItemId(기존 옵션 수정 시 필수, 새 옵션은 넣지 않음) · items[].vendorItemId(임시저장 상태면 null)
 * @returns {[{ sellerProductItemId, vendorItemId } | null]}  우리 옵션 순서대로. 못 찾은 옵션(새 옵션)은 null
 */
export function matchItemIds(ours, theirs) {
  const pool = (Array.isArray(theirs) ? theirs : []).filter(t => t && t.sellerProductItemId != null).map(t => ({ ...t, used: false }))
  return (Array.isArray(ours) ? ours : []).map(o => {
    const sku = str(o?.externalVendorSku ?? o?.sku), name = str(o?.itemName ?? o?.name)
    const hit = pool.find(t => !t.used && sku && str(t.externalVendorSku) === sku) || pool.find(t => !t.used && name && str(t.itemName) === name)
    if (!hit) return null
    hit.used = true
    return { sellerProductItemId: hit.sellerProductItemId, vendorItemId: hit.vendorItemId ?? null }
  })
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

// ── 상품명 기본값 (한글만) ──
/** 후보 중 처음 나오는 "한글로 된" 이름 — 번역 안 된 글자가 남은 후보는 건너뛴다. 없으면 '' (화면은 빈칸 + placeholder) */
export function pickKoreanName(cands) {
  for (const c of Array.isArray(cands) ? cands : []) {
    const t = typeof c === 'string' ? c.replace(/\s+/g, ' ').trim() : ''
    if (t && !hasUntranslated(t)) return cut(t, NAME_MAX)
  }
  return ''
}
/** 등록상품명·노출상품명·제품명 중 번역 안 된 글자가 남은 칸이 있는지 */
export const namesNeedKorean = ({ productName = '', displayName = '', generalName = '' } = {}) => [productName, displayName, generalName].some(hasUntranslated)

// ── 옵션 값 한글화 (규칙 기반 — 외부 호출 없음) ──
// 색 이름 — [표준 이름, 원문·같은 뜻의 말]. 긴 말부터 맞춘다
const COLOR_WORDS = [
  ['로즈골드', ['玫瑰金', '로즈골드']], ['네이비', ['藏青色', '藏青', '藏蓝色', '藏蓝', '海军蓝', '深蓝色', '深蓝', '네이비', '남색', '감청색', '진한 파란색', '짙은 파란색']],
  ['스카이블루', ['天蓝色', '天蓝', '浅蓝色', '浅蓝', '스카이블루', '하늘색', '연한 파란색']], ['로열블루', ['宝蓝色', '宝蓝', '로열블루']],
  ['와인', ['酒红色', '酒红', '와인색', '와인', '버건디']], ['로즈핑크', ['玫红色', '玫红', '로즈핑크', '장미색']], ['핑크', ['粉红色', '粉红', '粉色', '핑크', '분홍색', '분홍']],
  ['다크그린', ['墨绿色', '墨绿', '深绿色', '深绿', '다크그린', '짙은 녹색', '진한 녹색']], ['카키', ['军绿色', '军绿', '卡其色', '卡其', '카키색', '카키']], ['민트', ['薄荷绿', '薄荷色', '민트색', '민트']],
  ['다크그레이', ['深灰色', '深灰', '다크그레이', '짙은 회색', '진한 회색']], ['라이트그레이', ['浅灰色', '浅灰', '라이트그레이', '연한 회색']],
  ['라이트퍼플', ['浅紫色', '浅紫', '라이트퍼플', '연보라']], ['아이보리', ['米白色', '米白', '아이보리', '미색']], ['베이지', ['米色', '杏色', '베이지', '살구색']],
  ['카멜', ['驼色', '카멜']], ['샴페인', ['香槟色', '香槟', '샴페인']], ['브라운', ['咖啡色', '咖色', '棕色', '褐色', '브라운', '갈색', '커피색']],
  ['블랙', ['黑色', '블랙', '검정색', '검은색', '검정', '흑색']], ['화이트', ['白色', '화이트', '흰색', '하얀색', '백색']], ['레드', ['大红色', '大红', '红色', '레드', '빨간색', '빨강', '적색']],
  ['블루', ['蓝色', '블루', '파란색', '파랑', '청색']], ['그린', ['绿色', '그린', '녹색', '초록색', '초록']], ['옐로우', ['黄色', '옐로우', '옐로', '노란색', '노랑']],
  ['오렌지', ['橙色', '橘色', '오렌지', '주황색', '주황']], ['퍼플', ['紫色', '퍼플', '보라색', '보라']], ['그레이', ['灰色', '그레이', '회색']],
  ['실버', ['银色', '실버', '은색']], ['골드', ['金色', '골드', '금색']], ['투명', ['透明色', '透明', '투명']], ['멀티컬러', ['彩色', '멀티컬러', '여러 색']],
]
// 색 종류 칸에서만 맞추는 한 글자 색 (다른 칸에서는 다른 뜻일 수 있다)
const COLOR_SINGLE = [['블랙', '黑'], ['화이트', '白'], ['레드', '红'], ['블루', '蓝'], ['그린', '绿'], ['옐로우', '黄'], ['핑크', '粉'], ['퍼플', '紫'], ['그레이', '灰'], ['오렌지', '橙'], ['브라운', '棕'], ['실버', '银'], ['골드', '金']]
// 무늬·크기·묶음 — 원문 → 한글
const OPTION_WORDS = [
  ['蝴蝶结', '리본'], ['波点', '도트'], ['圆点', '도트'], ['条纹', '스트라이프'], ['格子', '체크'], ['格纹', '체크'], ['碎花', '잔꽃'], ['印花', '프린트'], ['花朵', '플라워'], ['豹纹', '레오파드'],
  ['纯色', '무지'], ['爱心', '하트'], ['心形', '하트'], ['星星', '별'], ['珍珠', '진주'], ['加大', '특대'], ['大号', '라지'], ['中号', '미디엄'], ['小号', '스몰'], ['均码', '프리사이즈'],
  ['套装', '세트'], ['加厚', '두꺼운'], ['加绒', '기모'], ['长款', '롱'], ['短款', '숏'],
]
const UNIT_WORDS = { 个: '개', 件: '개', 只: '개', 条: '개', 支: '개', 枚: '개', 片: '장', 张: '장', 双: '켤레', 对: '쌍', 包: '팩', 套: '세트', 盒: '박스', 瓶: '병' }
const COLOR_DICT = COLOR_WORDS.flatMap(([ko, list]) => list.map(w => [w, ko, true]))
const bySize = (a, b) => b[0].length - a[0].length
const DICT = [...COLOR_DICT, ...OPTION_WORDS.map(([w, ko]) => [w, ko, false])].sort(bySize)
const DICT_COLOR_TYPE = [...DICT, ...COLOR_SINGLE.map(([ko, w]) => [w, ko, true])].sort(bySize)
const ASCII_RUN = /^[A-Za-z0-9][A-Za-z0-9.+\-/*~]*/

/** 옵션 종류 이름(번역·원문)이 색 종류인지 */
export function isColorOption(names) {
  const colors = OPTION_ALIASES.find(([k]) => k === '색상')[1].map(squash)
  return (Array.isArray(names) ? names : [names]).map(squash).filter(Boolean).some(c => colors.some(x => c === x || c.includes(x)))
}
/** 옵션 종류 이름의 한글 — 번역이 없으면 같은 뜻 묶음의 표준 이름(颜色 → 색상). 못 찾으면 '' */
export function optionTypeKo(names) {
  const list = (Array.isArray(names) ? names : [names]).map(s => String(s || '').trim()).filter(Boolean)
  const ko = list.find(n => !hasUntranslated(n))
  if (ko) return ko
  for (const n of list) { const g = OPTION_ALIASES.find(([, al]) => al.some(x => squash(x) === squash(n))); if (g) return g[0] }
  return ''
}
/**
 * 옵션 값 원문 → 사전으로 읽은 한글.  黑色波点发夹 → { label: '블랙 도트', color: '블랙', complete: false(发夹는 사전에 없음) }
 * 영문·숫자(36-37, XL)는 그대로, "2个" → "2개", "A款" → "A타입". 사전에 없는 글자는 버린다(complete = false)
 * @param {string} text @param {{ colorType?:boolean }} o  colorType = 색 종류 칸 (한 글자 색 黑·白도 읽는다)
 */
export function readOptionText(text, { colorType = false } = {}) {
  const s = String(text || '').trim()
  const dict = colorType ? DICT_COLOR_TYPE : DICT
  const parts = []
  let color = '', complete = true, i = 0
  while (i < s.length) {
    const rest = s.slice(i)
    const hit = dict.find(([w]) => rest.startsWith(w))
    if (hit) {
      if (hit[2] && !color) color = hit[1]
      if (parts[parts.length - 1] !== hit[1]) parts.push(hit[1])
      i += hit[0].length
      if (hit[2] && s[i] === '色') i++ // "黑色" 뒤에 남은 色
      continue
    }
    const run = ASCII_RUN.exec(rest)
    if (run) {
      const next = s[i + run[0].length]
      if (next === '款') { parts.push(`${run[0]}타입`); i += run[0].length + 1; continue }
      if (/^\d+$/.test(run[0]) && UNIT_WORDS[next]) { parts.push(`${run[0]}${UNIT_WORDS[next]}`); i += run[0].length + 1; continue }
      parts.push(run[0]); i += run[0].length
      continue
    }
    if (HAN.test(s[i])) { complete = false; i++; continue }
    const word = /^(?:(?!\p{Script=Han})[\p{L}\p{N}])+/u.exec(rest) // 한글 등 — 이어진 글자를 한 낱말로
    if (word) { parts.push(word[0]); i += word[0].length; continue }
    i++
  }
  return { label: parts.join(' ').trim(), color, complete }
}
/** 글(번역·원문)에서 색 이름만 — '검은색 물방울 헤어핀' → '블랙'. 없으면 '' */
export function colorNameOf(text, { colorType = false } = {}) {
  const s = String(text || '')
  let best = null
  for (const [w, ko] of colorType ? [...COLOR_DICT, ...COLOR_SINGLE.map(([k, x]) => [x, k])] : COLOR_DICT) {
    const at = s.indexOf(w)
    if (at >= 0 && (!best || at < best.at || (at === best.at && w.length > best.len))) best = { at, len: w.length, ko }
  }
  return best ? best.ko : ''
}
/**
 * 가져온 옵션 줄(send_prepare.source.skus — 값마다 { zh, ko }) → 옵션 표의 한글 기본값
 *   옵션 이름에 들어갈 말(label): ① 사전으로 읽은 말("블랙 도트") — 같은 종류의 다른 값과 겹치지 않을 때  ② 번역 캐시의 한글  ③ 없으면 '' (고객이 넣는다)
 *   색 종류 칸의 값: 색 이름만("블랙") — 다른 값과 겹치면 label  (문서: 구매옵션 값이 전부 같으면 등록 불가)
 *   번역 안 된 글자는 어디에도 넣지 않는다.
 * @returns {{ types:[{ key, label, names:string[], isColor }], rows:[{ name, opt:{ [key]:string }, original }] }}
 */
export function koreanizeSkus(skus, { valueMax = 30, nameMax = 150 } = {}) {
  const list = Array.isArray(skus) ? skus : []
  const types = []
  const values = new Map() // key → Map(zh → { zh, ko })
  for (const row of list) for (const v of row?.values || []) {
    const key = str(v?.name?.zh) || str(v?.name?.ko)
    const zh = str(v?.value?.zh) || str(v?.value?.ko)
    if (!key || !zh) continue
    if (!values.has(key)) {
      const names = [v.name.ko, v.name.zh].map(str).filter(Boolean)
      types.push({ key, label: optionTypeKo(names) || key, names, isColor: isColorOption(names) })
      values.set(key, new Map())
    }
    if (!values.get(key).has(zh)) values.get(key).set(zh, { zh, ko: str(v.value.ko) })
  }
  const text = new Map() // key → Map(zh → { label, value })
  for (const t of types) {
    const vals = [...values.get(t.key).values()]
    const read = vals.map(v => readOptionText(v.zh, { colorType: t.isColor }))
    const koOf = v => (v.ko && !hasUntranslated(v.ko) ? v.ko : '')
    const count = (arr, x) => arr.filter(y => y && squash(y) === squash(x)).length
    const dictLabels = read.map(r => r.label)
    const labels = vals.map((v, i) => (dictLabels[i] && count(dictLabels, dictLabels[i]) === 1 ? dictLabels[i] : koOf(v)))
    const colors = vals.map((v, i) => (t.isColor ? read[i].color || colorNameOf(koOf(v)) : ''))
    const out = new Map()
    vals.forEach((v, i) => out.set(v.zh, { label: labels[i], value: (colors[i] && count(colors, colors[i]) === 1 ? colors[i] : labels[i]).slice(0, valueMax) }))
    text.set(t.key, out)
  }
  const rows = list.map(row => {
    const opt = {}, names = [], original = []
    for (const v of row?.values || []) {
      const key = str(v?.name?.zh) || str(v?.name?.ko)
      const zh = str(v?.value?.zh) || str(v?.value?.ko)
      const hit = text.get(key)?.get(zh)
      if (!hit) continue
      opt[key] = hit.value
      names.push(hit.label)
      original.push(zh)
    }
    return { name: names.every(Boolean) ? names.join(' ').slice(0, nameMax) : '', opt, original: original.join(' ') }
  })
  return { types, rows }
}

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
    ['브랜드', f.noBrand || !f.brand ? '브랜드 없음' : `${f.brand}${f.brandId ? ` (${f.brandId})` : ''}`, 'brand · brandId'],
    ['제조사', f.manufacture, 'manufacture'],
    ['모델번호', f.modelNo, 'modelNo'],
    ['카테고리', f.categoryCode ? `${f.categoryName || ''} #${f.categoryCode}`.trim() : '', 'displayCategoryCode'],
    ['검색태그', (f.tags || []).join(', '), 'searchTags'],
    ['옵션', items.length ? `${items.length}개${items[0]?.name ? ` (${items.slice(0, 3).map(i => i.name).filter(Boolean).join(', ')}${items.length > 3 ? ' …' : ''})` : ''}` : '', 'items · itemName'],
    ['판매가', priceText, 'salePrice'],
    ['상세 이미지', detailImageLabel(f.detailFiles), 'images(DETAIL) · contents'],
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
