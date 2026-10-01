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
