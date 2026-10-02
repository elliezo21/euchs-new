/**
 * 판매처 공용 옵션 (2026-10-01) — 화면(보내기 창 옵션 영역)과 서버가 같이 쓰는 순수 함수 (import는 순수 파일 _coupangFields.js 하나 — 브라우저 번들에 들어가도 된다)
 *
 * [원천] 쿠팡 옵션 표와 같은 원천·같은 한글 규칙
 *   studio_product_snapshots.raw->item (1688 OneBound item_get) → _coupangFields.extractSkus1688 → 번역 캐시(send_prepare.source.skus — 값마다 { zh, ko })
 *   → _coupangFields.koreanizeSkus (옵션 종류·값의 한글. 번역 안 된 글자는 넣지 않고 빈칸)
 *   쿠팡 섹션(StudioSendCoupang)은 지금처럼 koreanizeSkus를 바로 쓴다 — 쿠팡 코드·출력은 바꾸지 않았다
 * [공용 모양] { groupNames:['색상','사이즈'], rows:[{ values:['블랙','M'], originals:['黑色','M'], addPrice:0, stock:null, use:true, stock1688, priceCny }] }
 *   addPrice = 기본 판매가에 더하는 금액(원). 기본 0 — 1688 위안 가격은 원화로 바꾸지 않는다(참고용 priceCny만)
 *   stock = 내 재고 — 비워 둔다(1688 판매자 재고는 내 재고가 아니다. 쿠팡과 같은 규칙). 고객이 넣는다
 *   보낼 때는 use=true 줄만 { groupNames, rows:[{ values, addPrice, stock }] } (optionsPayload)
 *
 * [스마트스토어 — 조합형 옵션] 공식 문서 apicenter.commerce.naver.com/docs/commerce-api/current/create-product-product (2026-10-01 OpenAPI 원문 확인)
 *   originProduct.detailAttribute.optionInfo
 *     optionCombinationGroupNames { optionGroupName1(필수), optionGroupName2, optionGroupName3 }  — "최대 등록 가능한 옵션 개수는 조합형은 3개"
 *     optionCombinations[] { optionName1(필수)·2·3, stockQuantity(int32, max 99999999, 미입력 0), price(옵션가 int32, max 999999990, 미입력 0), usable(기본 true) }
 *     useStockManagement — "입력하지 않거나 false로 지정하면 수량이 9,999로 설정됩니다" → 옵션별 재고를 쓰려면 true (공식 토론 #605 답변도 true 권장)
 *     "표준형·단독형·조합형 옵션은 함께 사용할 수 없습니다" → 조합형만 보낸다
 *   originProduct.stockQuantity "상품 등록 시 필수" → 옵션이 있으면 판매할 옵션 재고 합계
 *   [2차 출처 — 공식 API 문서에는 없음] 옵션가 범위(스마트스토어센터 규칙): 판매가 2,000원 미만 0~+100% · 2,000~10,000원 미만 -50%~+100% · 10,000원 이상 -50%~+50%
 *     네이버가 어차피 거절하는 값을 보내기 전에 알아볼 문구로 막는다. 운영에서 다른 결과가 나오면 SS_OPTION_PRICE_RULE 하나만 고친다
 *   [모름 — 막지 않음] 옵션명·옵션값 글자 수 상한은 공식 API 문서에 없다
 *   [운영 실측 2026-10-02 — 공식 문서에는 없음] 옵션값에 \ * ? " < > / 가 있으면 네이버가 "등록불가 특수문자"로 거절 → SS_OPTION_VALUE_BAD (옵션 종류 이름은 응답에 없어 검사하지 않는다)
 *
 * [11번가 — 싱글옵션] 공식 개발가이드 상품등록(categoryNo=81 · apiSeq=1003) + 공식 예제 http://openapi.11st.co.kr/example/singleOption1.txt (2026-10-01 채팅 Claude 확인)
 *   <optSelectYn>Y</optSelectYn> <txtColCnt>1</txtColCnt>(옵션 등록 시 1 고정) <colTitle>색상/사이즈</colTitle>
 *   <ProductOption><useYn>Y</useYn><colOptPrice>0</colOptPrice><colValue0>블루/XL</colValue0><colCount>10</colCount></ProductOption> 반복
 *   멀티옵션(optionAllQty·optionAllAddPrc)은 "API로 옵션별 재고·옵션가 설정 불가(일괄만)" → 쓰지 않는다. 옵션 종류가 여럿이면 예제처럼 "/"로 합쳐 한 칸
 *   colTitle 공백 포함 25자 · 특수문자 & ; " % < > # † 불가
 *   colValue0 한글 25자 / 영문·숫자 50자 · 상품 안에서 중복 불가 · 특수문자 & ; " % < > # † | 불가
 *   colOptPrice 기본 판매가의 +100% ~ -50% · 옵션가 0원인 옵션이 반드시 1개 이상
 *   colCount useYn=N(품절)일 때만 0 가능 → 판매할 옵션은 1개 이상. 판매 안 함 줄은 보내지 않는다(품절 N으로 보내지 않음)
 *   prdSelQty "옵션이 있을 경우 입력값과 상관없이 옵션수량 총합으로 자동계산" → 판매할 옵션 재고 합계
 *   prdExposeClfCd(옵션값 노출 순서)는 "생략 시 등록순" → 보내지 않는다 · colSellerStockCd(셀러재고번호)는 예제 두 번째 옵션에 없음(선택) + 우리 쪽에 값 근거 없음 → 보내지 않는다
 */
import { koreanizeSkus, hasUntranslated } from './_coupangFields.js'

const clean = s => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const str = v => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')

/**
 * send_prepare.source.skus → 공용 옵션. 옵션이 없으면 { groupNames:[], rows:[] }
 * 옵션 종류 이름 = koreanizeSkus 종류의 한글(label) — 번역이 없으면 빈칸(고객이 넣는다). 값 = 쿠팡 옵션 표의 구매옵션 값과 같은 값(opt[key])
 */
export function marketOptionsFromSource(skus) {
  const list = Array.isArray(skus) ? skus : []
  const kr = koreanizeSkus(list)
  const keys = kr.types.map(t => t.key)
  const groupNames = kr.types.map(t => (t.label && !hasUntranslated(t.label) ? clean(t.label) : '')) // 번역 안 된 글자는 넣지 않는다
  const rows = list.map((row, i) => {
    const zhOf = new Map()
    for (const v of row?.values || []) { const key = str(v?.name?.zh) || str(v?.name?.ko); if (key) zhOf.set(key, str(v?.value?.zh) || str(v?.value?.ko)) }
    return {
      values: keys.map(k => kr.rows[i]?.opt?.[k] || ''),
      originals: keys.map(k => zhOf.get(k) || ''),
      addPrice: 0, stock: null, use: true,
      stock1688: Number.isInteger(row?.stock) ? row.stock : null, priceCny: typeof row?.priceCny === 'number' ? row.priceCny : null,
    }
  })
  return { groupNames, rows }
}

/** 보낼 모양 — 판매할(use) 줄만, 글자 정리. 옵션을 안 쓰면(줄 0개) null → 단일상품 */
export function optionsPayload(opts) {
  if (!opts || opts.enabled === false) return null
  const rows = (Array.isArray(opts.rows) ? opts.rows : []).filter(r => r && r.use !== false)
  if (!rows.length) return null
  return {
    groupNames: (Array.isArray(opts.groupNames) ? opts.groupNames : []).map(clean),
    rows: rows.map(r => ({ values: (Array.isArray(r.values) ? r.values : []).map(clean), addPrice: r.addPrice, stock: r.stock })),
  }
}

// ── 스마트스토어 ──
export const SS_OPTION_GROUP_MAX = 3 // 조합형 최대 3개 (문서)
export const SS_OPTION_STOCK_MAX = 99999999 // optionCombinations[].stockQuantity maximum (문서)
export const SS_OPTION_PRICE_ABS_MAX = 999999990 // optionCombinations[].price maximum (문서)
// 옵션가 범위 [2차 출처 — 머리 주석]: [판매가 미만 기준, 최소 %, 최대 %]
export const SS_OPTION_PRICE_RULE = [[2000, 0, 100], [10000, -50, 100], [Infinity, -50, 50]]
/** 판매가에 맞는 옵션가(추가금액) 범위 { min, max } (원 — 0쪽으로 내림). 판매가가 정수가 아니면 null */
export function ssOptionPriceRange(salePrice) {
  if (!Number.isInteger(salePrice) || salePrice < 1) return null
  const [, lo, hi] = SS_OPTION_PRICE_RULE.find(([under]) => salePrice < under)
  return { min: Math.ceil(salePrice * lo / 100), max: Math.floor(salePrice * hi / 100) }
}
const won = n => `${n.toLocaleString('ko-KR')}원`
export const SS_OPTION_VALUE_BAD = /[\\*?"<>/]/g // 운영 실측 — 머리 주석 (역슬래시 · 별표 · 물음표 · 큰따옴표 · 꺾쇠 · 슬래시)

/**
 * 스마트스토어 옵션 검사 — 고객이 알아볼 문구 목록 (빈 배열 = 보낼 수 있음). 화면 빠짐 목록과 서버가 같은 함수
 * @param {{ groupNames:string[], rows:[{ values:string[], addPrice, stock }] }} p  optionsPayload 결과 @param {number} salePrice 기본 판매가
 */
export function smartstoreOptionProblems(p, salePrice) {
  const out = []
  const names = Array.isArray(p?.groupNames) ? p.groupNames.map(clean) : []
  const rows = Array.isArray(p?.rows) ? p.rows : []
  if (!names.length || !rows.length) return ['판매할 옵션을 1개 이상 선택하세요.']
  if (names.length > SS_OPTION_GROUP_MAX) return [`스마트스토어 옵션 종류는 ${SS_OPTION_GROUP_MAX}개까지 등록할 수 있습니다. (지금 ${names.length}개)`]
  if (names.some(n => !n)) out.push('옵션 종류 이름(예: 색상)을 입력하세요.')
  else if (new Set(names).size !== names.length) out.push('옵션 종류 이름이 겹칩니다. 서로 다른 이름으로 입력하세요.')
  const range = ssOptionPriceRange(salePrice)
  const seen = new Set()
  let emptyValue = false, dup = false, badStock = false, badPrice = false, outOfRange = false
  for (const r of rows) {
    const vals = (Array.isArray(r?.values) ? r.values : []).map(clean)
    if (vals.length !== names.length || vals.some(v => !v)) emptyValue = true
    else { const k = JSON.stringify(vals); if (seen.has(k)) dup = true; seen.add(k) }
    if (!(Number.isInteger(r?.stock) && r.stock >= 0 && r.stock <= SS_OPTION_STOCK_MAX)) badStock = true
    if (!(Number.isInteger(r?.addPrice) && Math.abs(r.addPrice) <= SS_OPTION_PRICE_ABS_MAX)) badPrice = true
    else if (range && (r.addPrice < range.min || r.addPrice > range.max)) outOfRange = true
  }
  const ssBad = new Set()
  for (const r of rows) for (const v of Array.isArray(r?.values) ? r.values : []) for (const ch of String(v ?? '').match(SS_OPTION_VALUE_BAD) || []) ssBad.add(ch)
  if (ssBad.size) out.push(`옵션값에 쓸 수 없는 문자(${[...ssBad].join(' ')})`)
  if (emptyValue) out.push('판매할 옵션의 옵션값을 모두 입력하세요.')
  if (dup) out.push('같은 옵션값 조합이 두 번 있습니다. 옵션값을 다르게 하거나 한 줄을 판매 안 함으로 바꾸세요.')
  if (badStock) out.push(`판매할 옵션의 재고 수량을 0~${SS_OPTION_STOCK_MAX.toLocaleString('ko-KR')} 사이 정수로 입력하세요.`)
  if (badPrice) out.push('옵션 추가금액을 정수(원)로 입력하세요. (없으면 0)')
  else if (outOfRange) out.push(`옵션 추가금액은 판매가 ${won(salePrice)} 기준 ${won(range.min)} ~ +${won(range.max)} 사이로 입력하세요.`)
  const total = rows.reduce((s, r) => s + (Number.isInteger(r?.stock) ? r.stock : 0), 0)
  if (!badStock && total > SS_OPTION_STOCK_MAX) out.push(`옵션 재고 합계는 ${SS_OPTION_STOCK_MAX.toLocaleString('ko-KR')}개까지입니다.`)
  return out
}

/**
 * 스마트스토어 조합형 optionInfo (문서 칸만) + 상품 재고(판매할 옵션 재고 합계)
 * @returns {{ ok:true, optionInfo, stockTotal } | { ok:false, message }}
 */
export function smartstoreOptionInfo(p, salePrice) {
  const problems = smartstoreOptionProblems(p, salePrice)
  if (problems.length) return { ok: false, message: problems[0] }
  const names = p.groupNames.map(clean)
  const groupNames = Object.fromEntries(names.map((n, i) => [`optionGroupName${i + 1}`, n]))
  const optionCombinations = p.rows.map(r => ({
    ...Object.fromEntries(r.values.map((v, i) => [`optionName${i + 1}`, clean(v)])),
    stockQuantity: r.stock, price: r.addPrice, usable: true,
  }))
  return {
    ok: true,
    optionInfo: { optionCombinationGroupNames: groupNames, optionCombinations, useStockManagement: true },
    stockTotal: p.rows.reduce((s, r) => s + r.stock, 0),
  }
}

// ── 11번가 (싱글옵션) — 근거는 머리 주석 ──
export const ELEVENST_OPTION_JOIN = '/' // 공식 예제 "색상/사이즈" · "블루/XL"
export const ELEVENST_OPTION_TITLE_MAX = 25 // colTitle 공백 포함 25자
export const ELEVENST_OPTION_VALUE_UNITS = 50 // colValue0 한글 25자 / 영문·숫자 50자 → 영문·숫자·기호(ASCII) 1 · 그 밖(한글 등) 2로 세어 50
export const ELEVENST_OPTION_STOCK_MAX = 99999999 // prdSelQty 상한과 같게 (buildElevenstProduct)
const ELEVENST_TITLE_BAD = /[&;"%<>#†]/g
const ELEVENST_VALUE_BAD = /[&;"%<>#†|]/g
/** colValue0 길이 단위 — ASCII 1 · 그 밖 2 (한글 25자 = 50 = 영문 50자) */
export const elevenstValueUnits = s => [...String(s ?? '')].reduce((n, ch) => n + (ch.codePointAt(0) < 0x80 ? 1 : 2), 0)
/** 판매가에 맞는 옵션가 범위 { min, max } — -50% ~ +100%. 판매가가 정수가 아니면 null */
export function elevenstOptionPriceRange(price) {
  if (!Number.isInteger(price) || price < 1) return null
  return { min: -Math.floor(price / 2), max: price }
}
/** 공용 옵션(optionsPayload 결과) → 11번가 한 칸: { title, rows:[{ value, addPrice, stock }] } — 종류·값을 "/"로 잇는다 */
export function elevenstOptionMerge(p) {
  const names = (Array.isArray(p?.groupNames) ? p.groupNames : []).map(clean)
  return {
    title: names.join(ELEVENST_OPTION_JOIN),
    rows: (Array.isArray(p?.rows) ? p.rows : []).map(r => ({ value: (Array.isArray(r?.values) ? r.values : []).map(clean).join(ELEVENST_OPTION_JOIN), addPrice: r?.addPrice, stock: r?.stock })),
  }
}
const badChars = (s, re) => [...new Set(String(s).match(re) || [])].join(' ')

/**
 * 11번가 옵션 검사 — 고객이 알아볼 문구 목록 (빈 배열 = 보낼 수 있음). 화면 빠짐 목록과 서버가 같은 함수
 * EUC-KR로 못 바꾸는 글자 검사는 서버(buildElevenstProduct — encodeEucKr)가 한다
 * @param {{ groupNames:string[], rows:[{ values:string[], addPrice, stock }] }} p  optionsPayload 결과 @param {number} price 기본 판매가
 */
export function elevenstOptionProblems(p, price) {
  const out = []
  const names = Array.isArray(p?.groupNames) ? p.groupNames.map(clean) : []
  const rows = Array.isArray(p?.rows) ? p.rows : []
  if (!names.length || !rows.length) return ['판매할 옵션을 1개 이상 선택하세요.']
  if (names.some(n => !n)) out.push('옵션 종류 이름(예: 색상)을 입력하세요.')
  else if (new Set(names).size !== names.length) out.push('옵션 종류 이름이 겹칩니다. 서로 다른 이름으로 입력하세요.')
  const m = elevenstOptionMerge(p)
  if (names.every(Boolean)) {
    if ([...m.title].length > ELEVENST_OPTION_TITLE_MAX) out.push(`11번가 옵션명은 ${ELEVENST_OPTION_TITLE_MAX}자까지입니다. 옵션 종류 이름을 줄이세요. (지금 "${m.title}" ${[...m.title].length}자)`)
    const tb = badChars(m.title, ELEVENST_TITLE_BAD)
    if (tb) out.push(`옵션 종류 이름에 11번가가 받지 않는 특수문자가 있습니다: ${tb}`)
  }
  const range = elevenstOptionPriceRange(price)
  const seen = new Set()
  let emptyValue = false, dup = false, longValue = '', badValue = new Set(), badStock = false, badPrice = false, outOfRange = false
  rows.forEach((r, i) => {
    const vals = (Array.isArray(r?.values) ? r.values : []).map(clean)
    if (vals.length !== names.length || vals.some(v => !v)) emptyValue = true
    else {
      const v = m.rows[i].value
      if (seen.has(v)) dup = true
      seen.add(v)
      if (!longValue && elevenstValueUnits(v) > ELEVENST_OPTION_VALUE_UNITS) longValue = v
      for (const ch of String(v).match(ELEVENST_VALUE_BAD) || []) badValue.add(ch)
    }
    if (!(Number.isInteger(r?.stock) && r.stock >= 1 && r.stock <= ELEVENST_OPTION_STOCK_MAX)) badStock = true
    if (!Number.isInteger(r?.addPrice)) badPrice = true
    else if (range && (r.addPrice < range.min || r.addPrice > range.max)) outOfRange = true
  })
  if (emptyValue) out.push('판매할 옵션의 옵션값을 모두 입력하세요.')
  if (dup) out.push('같은 옵션값이 두 번 있습니다. 옵션값을 다르게 하거나 한 줄을 판매 안 함으로 바꾸세요.')
  if (longValue) out.push(`11번가 옵션값은 한글 25자(영문·숫자 50자)까지입니다: "${longValue}"`)
  if (badValue.size) out.push(`옵션값에 11번가가 받지 않는 특수문자가 있습니다: ${[...badValue].join(' ')}`)
  if (badStock) out.push('판매할 옵션의 재고 수량을 1개 이상 정수로 입력하세요. (11번가는 판매 옵션 재고 0으로 등록할 수 없습니다)')
  if (badPrice) out.push('옵션 추가금액을 정수(원)로 입력하세요. (없으면 0)')
  else {
    if (outOfRange) out.push(`옵션 추가금액은 판매가 ${won(price)} 기준 ${won(range.min)} ~ +${won(range.max)} 사이로 입력하세요.`)
    if (!rows.some(r => r?.addPrice === 0)) out.push('11번가는 추가금액 0원인 옵션이 1개 이상 있어야 합니다.')
  }
  const total = rows.reduce((s, r) => s + (Number.isInteger(r?.stock) ? r.stock : 0), 0)
  if (!badStock && total > ELEVENST_OPTION_STOCK_MAX) out.push(`옵션 재고 합계는 ${ELEVENST_OPTION_STOCK_MAX.toLocaleString('ko-KR')}개까지입니다.`)
  return out
}

/**
 * 11번가 옵션 → { ok:true, title, rows:[{ value, addPrice, stock }], stockTotal } | { ok:false, message }
 * XML은 api/_elevenst.js buildElevenstProduct가 만든다(글자 이스케이프·EUC-KR 한 곳)
 */
export function elevenstOptionRows(p, price) {
  const problems = elevenstOptionProblems(p, price)
  if (problems.length) return { ok: false, message: problems[0] }
  const m = elevenstOptionMerge(p)
  return { ok: true, title: m.title, rows: m.rows, stockTotal: m.rows.reduce((s, r) => s + r.stock, 0) }
}
