/**
 * 보내기 창 "공통 정보" (2026-10-01) — 여러 판매처에 같은 값을 한 번만 넣는다. 순수 함수 → scripts/test-marketplace.mjs가 그대로 부른다
 *
 * [대상] 스마트스토어·11번가만 (COMMON_MARKETS). 쿠팡은 옵션 줄마다 가격·정가·품번을 따로 쓰는 모양이라 이번 단계에서는 자기 칸 그대로(다음 단계에서 연결)
 * [언제] 공통 대상 판매처를 2곳 이상 체크했고 다시 보내기(resend)가 아닐 때만 (commonActive) — 판매처 1곳만 보내면 예전과 똑같이 섹션 칸에 넣는다
 * [공통 칸] 상품명 · 판매가 · 재고·옵션 · 대표 이미지(COMMON_GROUPS). 카테고리·배송·주소·고시·KC 등은 판매처 전용 — 섹션에 그대로
 * [값 옮기기] commonPatch — 공통 값을 그 판매처 섹션의 칸 이름으로만 바꾼다. 금액은 바꾸지 않는다(반올림·자르기·임의 숫자 없음).
 *   판매처 규칙(11번가 10원 단위·재고 1개 이상·상품명 글자 수 등)은 섹션의 빠짐 목록(missing)과 서버가 예전대로 검사한다
 * [판매처별로 다르게] own = { name|price|stock|image: true } — 켠 묶음은 공통 값을 넣지 않는다(섹션 칸에서 따로 고친다)
 */
import { pickKoreanName } from '../../api/_coupangFields.js'
import { marketOptionsFromSource, ssOptionPriceRange, elevenstOptionPriceRange } from '../../api/_marketOptions.js'

export const COMMON_MARKETS = ['smartstore', '11st']
export const COMMON_GROUPS = [
  { key: 'name', label: '상품명' },
  { key: 'price', label: '판매가' },
  { key: 'stock', label: '재고·옵션' },
  { key: 'image', label: '대표 이미지' },
]
// 판매처 섹션의 칸 이름 (섹션 f의 key) — 판매가 칸 이름만 다르다
export const COMMON_FIELDS = {
  smartstore: { name: 'productName', price: 'salePrice', stock: 'stock' },
  '11st': { name: 'productName', price: 'price', stock: 'stock' },
}
export const COUPANG_COMMON_NOTE = '쿠팡은 아래 쿠팡 칸에서 따로 입력합니다.'

/** 공통 정보를 쓸지 — 공통 대상 판매처를 2곳 이상 체크 · 다시 보내기가 아님 */
export const commonMarkets = picked => (Array.isArray(picked) ? picked : []).filter(k => COMMON_MARKETS.includes(k))
export const commonActive = (picked, { resend = false } = {}) => !resend && commonMarkets(picked).length >= 2

/**
 * 공통 옵션 추가금액 범위 — 체크한 판매처 범위가 모두 겹치는 곳(어느 판매처에도 통과하는 값). 범위 규칙은 판매처 함수 그대로(api/_marketOptions.js)
 * @returns {{ min, max } | null}  판매가가 없거나 판매처가 없으면 null
 */
const RANGE_OF = { smartstore: ssOptionPriceRange, '11st': elevenstOptionPriceRange }
export function commonOptionRange(markets, price) {
  const list = commonMarkets(markets).map(k => RANGE_OF[k](price))
  if (!list.length || list.some(r => !r)) return null
  return { min: Math.max(...list.map(r => r.min)), max: Math.min(...list.map(r => r.max)) }
}

/** 옵션 모양 복사 (공통 ↔ 섹션이 서로의 줄을 고치지 않게) */
export function cloneOptions(o) {
  return {
    enabled: o?.enabled !== false,
    groupNames: [...(Array.isArray(o?.groupNames) ? o.groupNames : [])],
    rows: (Array.isArray(o?.rows) ? o.rows : []).map(r => ({ ...r, values: [...(r.values || [])], originals: [...(r.originals || [])] })),
  }
}

/**
 * 처음 공통 값 — 판매처 섹션의 처음 값과 같은 규칙 (상품명 한글만 · 금액·재고 비움 · 옵션 = 같은 원천 · 대표 이미지 = 첫 사진)
 * @param {object} prepare send_prepare 응답
 */
export function commonFromPrepare(prepare) {
  return {
    productName: pickKoreanName([prepare?.export?.projectTitle, prepare?.export?.title, prepare?.source?.title?.ko]),
    price: null, stock: null,
    opts: { enabled: true, ...marketOptionsFromSource(prepare?.source?.skus) },
    repImageId: prepare?.images?.[0]?.id ?? null, fit: 'contain',
  }
}

/**
 * 공통 값 → 그 판매처 섹션에 넣을 값
 * @param {'smartstore'|'11st'} market
 * @param {object} common commonFromPrepare 모양
 * @param {{ name?:boolean, price?:boolean, stock?:boolean, image?:boolean }} own 이 판매처만 다르게 쓰는 묶음
 * @returns {{ form: object, opts: object|null }}  form = 섹션 f에 덮을 칸 · opts = 섹션 옵션(재고·옵션 묶음을 따로 쓰면 null)
 */
export function commonPatch(market, common, own = {}) {
  const fields = COMMON_FIELDS[market]
  if (!fields) throw new Error(`공통 정보를 쓰지 않는 판매처: ${market}`)
  const form = {}
  if (!own.name) form[fields.name] = common.productName
  if (!own.price) form[fields.price] = common.price
  if (!own.stock) form[fields.stock] = common.stock
  if (!own.image) { form.repImageId = common.repImageId; form.fit = common.fit }
  return { form, opts: own.stock ? null : cloneOptions(common.opts) }
}
