/**
 * 보내기 창 "공통 정보" (2026-10-01) — 여러 판매처에 같은 값을 한 번만 넣는다. 순수 함수 → scripts/test-marketplace.mjs가 그대로 부른다
 *
 * [대상] 쿠팡·스마트스토어·11번가 (COMMON_MARKETS). 쿠팡(2026-10-02)은 공통 판매가·재고·옵션을 옵션별 쿠팡 판매가(공통 판매가 + 추가금액)로 옮긴다 —
 *   쿠팡 쪽 옮기기·옵션 이름 연결 규칙은 src/lib/studioCoupangLink.js (쿠팡 칸에는 정가·품번·GTIN·필수 속성·옵션 이름 연결만 남는다)
 * [언제] 공통 대상 판매처를 1곳 이상 체크했고 다시 보내기(resend)가 아닐 때 (commonActive — 2026-10-02 ②-1: 1곳이어도 공통 정보에서 넣는다.
 *   대표 이미지를 고르는 곳을 공통 정보 한 곳으로 모으기 위해서다). 다시 보내기(쿠팡 반려 고치기)는 예전처럼 쿠팡 칸에서 직접
 * [공통 칸] 상품명 · 판매가 · 재고·옵션 · 대표 이미지. 카테고리·배송·주소·고시·KC 등은 판매처 전용 — 섹션에 그대로
 * [값 옮기기] commonPatch(스마트스토어·11번가·지그재그) — 공통 값을 그 판매처 섹션의 칸 이름으로만 바꾼다. 쿠팡은 studioCoupangLink.commonCoupangRows. 금액은 바꾸지 않는다(반올림·자르기·임의 숫자 없음).
 *   판매처 규칙(11번가 10원 단위·재고 1개 이상·상품명 바이트 등)은 섹션의 빠짐 목록(missing)과 서버가 예전대로 검사한다
 * [공통 정보 사용] use = { name|price|stock: true } (2026-10-02 ②-1 — 예전 "이 판매처만 다르게"(own)를 대신함). 처음에는 모두 켜짐(= 공통 값).
 *   끄면 그 판매처 칸이 열리고 공통 값을 넣지 않는다. 다시 켜면 공통 값으로 돌아가고, 꺼 둔 동안 넣은 값은 지우지 않고 넣어 둔다(stash — 다시 끄면 되살림).
 *   대표 이미지는 판매처별로 따로 고르지 않는다(공통 정보 한 곳 — 늘 공통 값)
 *   쿠팡은 판매가·재고·옵션이 옵션 표 한 벌이라 묶음 둘(상품명 · 판매가·재고·옵션 — COUPANG_GROUPS)
 */
import { ssOptionPriceRange, elevenstOptionPriceRange } from '../../api/_marketOptions.js'
import { emptyOptionEditor, cloneOptionEditor } from './studioOptionEditor.js'

export const COMMON_MARKETS = ['coupang', 'smartstore', '11st', 'zigzag'] // 2026-10-02 지그재그 — 같은 옵션 편집기(studioOptionEditor)·같은 칸 이름이라 그대로 옮긴다
// [공통 정보 사용] 체크 묶음 — 스마트스토어·11번가·지그재그
export const COMMON_GROUPS = [
  { key: 'name', label: '상품명' },
  { key: 'price', label: '판매가' },
  { key: 'stock', label: '재고·옵션' },
]
// 쿠팡 — 판매가·재고·옵션이 옵션 표 한 벌(옵션마다 판매가·재고)이라 한 묶음
export const COUPANG_GROUPS = [
  { key: 'name', label: '상품명' },
  { key: 'items', label: '판매가·재고·옵션' },
]
export const USE_COMMON_LABEL = '공통 정보 사용'
export const USE_COMMON_NOTE = '체크를 풀면 이 판매처만 다르게 입력합니다. 다시 체크하면 공통 정보 값으로 돌아갑니다(입력한 값은 남아 있습니다).'
/** 처음 [공통 정보 사용] — 모두 켜짐 */
export const initialUse = (groups = COMMON_GROUPS) => Object.fromEntries(groups.map(g => [g.key, true]))
// 판매처 섹션의 칸 이름 (섹션 f의 key) — 판매가 칸 이름만 다르다. 쿠팡은 옵션 줄마다 판매가라 여기에 없다(commonPatch 대상 아님)
export const COMMON_FIELDS = {
  smartstore: { name: 'productName', price: 'salePrice', stock: 'stock' },
  '11st': { name: 'productName', price: 'price', stock: 'stock' },
  zigzag: { name: 'productName', price: 'price', stock: 'stock' },
}
export const COUPANG_COMMON_NOTE = '쿠팡에는 옵션별 판매가(공통 판매가 + 추가금액)로 등록합니다. 쿠팡 옵션 이름 연결·정가·품번은 아래 쿠팡 칸에서 입력합니다.'

/** 공통 정보를 쓸지 — 공통 대상 판매처를 1곳 이상 체크 · 다시 보내기가 아님 */
export const commonMarkets = picked => (Array.isArray(picked) ? picked : []).filter(k => COMMON_MARKETS.includes(k))
export const commonActive = (picked, { resend = false } = {}) => !resend && commonMarkets(picked).length >= 1

/**
 * 공통 옵션 추가금액 범위 — 체크한 판매처 범위가 모두 겹치는 곳(어느 판매처에도 통과하는 값). 범위 규칙은 판매처 함수 그대로(api/_marketOptions.js)
 * 쿠팡은 추가금 범위 규칙이 없다(옵션마다 판매가) → 범위 계산에서 뺀다
 * @returns {{ min, max } | null}  판매가가 없거나 범위가 있는 판매처가 없으면 null
 */
const RANGE_OF = { smartstore: ssOptionPriceRange, '11st': elevenstOptionPriceRange }
export function commonOptionRange(markets, price) {
  const list = commonMarkets(markets).filter(k => RANGE_OF[k]).map(k => RANGE_OF[k](price))
  if (!list.length || list.some(r => !r)) return null
  return { min: Math.max(...list.map(r => r.min)), max: Math.min(...list.map(r => r.max)) }
}

/** 옵션 모양 복사 (공통 ↔ 섹션이 서로의 줄을 고치지 않게) — 옵션 편집 모양(종류·칩·삭제 목록)까지 */
export const cloneOptions = cloneOptionEditor

/**
 * 처음 공통 값 — 모두 비워 둔다 (2026-10-02 ②-1 — 판매처에 올리는 값은 셀러가 정한다. 1688 제목·작업 이름·1688 가격·재고를 넣지 않고 대표 이미지도 미리 고르지 않는다)
 * @param {object} prepare send_prepare 응답
 */
export function commonFromPrepare(prepare) {
  return {
    productName: '',
    price: null, stock: null,
    opts: emptyOptionEditor(), // 옵션은 비워 둔다 (2026-10-02) — [주문한 옵션 불러오기]·[1688 옵션 불러오기]로만 가져온다
    repImageId: null, fit: 'contain', // 대표 이미지 후보(1688 대표 사진 + 내 사진 — repImageCandidates) 중 셀러가 고른다
  }
}

/**
 * 공통 값 → 그 판매처 섹션에 넣을 값
 * @param {'smartstore'|'11st'|'zigzag'} market
 * @param {object} common commonFromPrepare 모양
 * @param {{ name?:boolean, price?:boolean, stock?:boolean }} use [공통 정보 사용] — 빠진 칸은 켜짐(공통 값)으로 본다. 대표 이미지는 늘 공통 값
 * @returns {{ form: object, opts: object|null }}  form = 섹션 f에 덮을 칸 · opts = 섹션 옵션(재고·옵션 묶음을 따로 쓰면 null)
 */
export function commonPatch(market, common, use = {}) {
  const fields = COMMON_FIELDS[market]
  if (!fields) throw new Error(`commonPatch 대상이 아닌 판매처: ${market} (쿠팡은 studioCoupangLink.commonCoupangRows)`)
  const on = key => use[key] !== false
  const form = {}
  if (on('name')) form[fields.name] = common.productName
  if (on('price')) form[fields.price] = common.price
  if (on('stock')) form[fields.stock] = common.stock
  form.repImageId = common.repImageId
  form.fit = common.fit
  return { form, opts: on('stock') ? cloneOptions(common.opts) : null }
}

/**
 * [공통 정보 사용]을 다시 켤 때 — 그 묶음에서 이 판매처에 넣어 둔 값(지우지 않고 넣어 둔다 — 다시 끄면 되살린다)
 * @param {'smartstore'|'11st'|'zigzag'} market @param {'name'|'price'|'stock'} key @param {object} form 섹션 f @param {object} opts 섹션 옵션
 * @returns {{ form: object, opts: object|null }}
 */
export function stashGroup(market, key, form, opts) {
  const fields = COMMON_FIELDS[market]
  if (!fields?.[key]) throw new Error(`[공통 정보 사용] 묶음이 아님: ${market}·${key}`)
  return { form: { [fields[key]]: form?.[fields[key]] ?? null }, opts: key === 'stock' ? cloneOptions(opts) : null }
}
