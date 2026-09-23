/**
 * 1688 가격 출처 판정 공용 유틸 — Single Source of Truth
 * ※ 공용 파일: 함수는 옵션 인자로만 확장하고, 기본 동작(옵션 생략 시 결과)은 바꾸지 않는다.
 *
 * ══════════════════════════════════════════════════════════════════
 * 1688 가격 규칙 (2026-09-21 offerId=1081981728994 item_get 실측으로 확정):
 *
 *   SKU별 price가 서로 다르면  → SKU 가격이 기준. price_range 구간 단가는 쓰지 않는다.
 *     (예: 紫黄发箍 ¥5.5 / 蝴蝶结发夹 ¥4.2 / 爱心发夹 ¥4.9,
 *      상품레벨 price=4.2, price_range=[[2,"4.2"]] → 구간 단가를 쓰면 전 옵션이 ¥4.2로 잘못 잡힘)
 *
 *   SKU 가격이 전부 같거나 없으면 → price_range 구간 단가(수량별 도매가)가 기준.
 * ══════════════════════════════════════════════════════════════════
 */

/**
 * SKU별 가격 상품인지 판정 — 가격 출처를 가르는 유일한 기준.
 * 유효 가격(>0)이 2종류 이상이면 true.
 *
 * @param {Array} skus - [{ price }, ...] (api1688.js parsedSkus 또는 장바구니 스냅샷)
 * @returns {boolean}
 */
export function isSkuPricedSkus(skus) {
  if (!Array.isArray(skus) || skus.length === 0) return false
  const prices = skus.map(s => Number(s?.price) || 0).filter(v => v > 0)
  if (prices.length === 0) return false
  return (Math.max(...prices) - Math.min(...prices)) > 0.001
}

/**
 * 수량 구간 단가 테이블에서 주어진 수량에 적용될 단가를 고른다.
 * 구간은 minQuantity(또는 minQty) 오름차순 정렬돼 있다고 가정하지 않고 내부에서 정렬한다.
 *
 * @param {Array} tiers - [{ minQuantity|minQty, price }, ...]
 * @param {number} qty  - 판정 기준 수량 (같은 1688 상품의 옵션 합계 수량)
 * @returns {number|null} 적용 단가(CNY). 구간 정보가 없으면 null.
 */
export function resolveTierUnitPrice(tiers, qty) {
  if (!Array.isArray(tiers) || tiers.length === 0) return null

  const normalized = tiers
    .map(t => ({
      minQty: Number(t?.minQuantity ?? t?.minQty ?? 1) || 1,
      price: Number(t?.price) || 0,
    }))
    .filter(t => t.price > 0)
    .sort((a, b) => a.minQty - b.minQty)

  if (normalized.length === 0) return null

  const q = Number(qty) || 0
  for (let i = normalized.length - 1; i >= 0; i--) {
    if (q >= normalized[i].minQty) return normalized[i].price
  }
  // 최소 구간 미만 수량 → 첫 구간 단가 (1688도 MOQ 미만은 주문 자체가 불가)
  return normalized[0].price
}

/**
 * 같은 1688 상품(num_iid) 행들의 "가격 출처"를 그룹 단위로 판정한다.
 *
 * ★ 반드시 그룹 단위로 판정해야 하는 이유 (2026-09-21 실측):
 *   같은 상품이라도 담긴 시점에 따라 행마다 저장 상태가 다르다.
 *   - 새로 담은 행: priceTiers 3구간 보유
 *   - 구 장바구니 행 / 옵션 팝업으로 만든 행: priceTiers 빈 배열
 *   행 단위로 판정하면 구 행만 재계산에서 빠져 같은 상품인데 줄마다 단가가 달라진다.
 *   수량 구간 테이블은 1688 상품(offer) 단위 값이므로 그룹 내에서 공유하는 것이 맞다.
 *
 * @param {Array} rows - 같은 offerGroupKey로 묶인 장바구니 행들
 * @returns {{ skuPriced: boolean, tiers: Array|null }}
 *   skuPriced=true  → SKU별 가격 상품. 재계산하지 않는다.
 *   tiers=Array     → 그룹 공통 수량 구간 테이블
 *   tiers=null      → 구간 정보를 알 수 없음 (화면에 '단가 확인 필요' 표시 대상)
 */
export function resolveGroupPricing(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { skuPriced: false, tiers: null }
  }

  // 한 행이라도 SKU별 가격 상품으로 기록됐으면 그 상품은 SKU별 가격 상품이다.
  if (rows.some(r => r?.isSkuPriced === true)) {
    return { skuPriced: true, tiers: null }
  }

  // 그룹 내에서 가장 정보량이 많은(구간 수가 많은) 테이블을 대표로 삼는다.
  let best = null
  for (const r of rows) {
    const t = r?.priceTiers
    if (!Array.isArray(t) || t.length === 0) continue
    const valid = t.filter(x => Number(x?.price) > 0)
    if (valid.length === 0) continue
    if (!best || valid.length > best.length) best = valid
  }

  return { skuPriced: false, tiers: best }
}

/**
 * specId가 빈 행이 "단품 후보"인지 — 행에 남은 표식만으로 판정한다(최종 판정은 서버가 1688 원본으로).
 *   isSingleSku: api1688.js가 원본 skus.sku 길이 0으로 확정한 값 (주문 품목에 남음)
 *   hasOptions : 담기 시점에 선택 가능한 옵션이 있었는지 (장바구니 행에 남음)
 * 둘 중 하나라도 "옵션 상품"을 가리키면 후보가 아니다. 둘 다 없으면(구 행) 후보 — 서버 재확인 대상.
 *
 * @param {object} row
 * @returns {boolean}
 */
export function isSingleSkuCandidate(row) {
  if (row?.isSingleSku === false || row?.hasOptions === true) return false
  return true
}

/**
 * 1688 발주/운임 조회용 cargoParamList를 조립한다.
 * 같은 offerId+specId가 여러 행으로 나뉘어 있으면 수량을 합산해 1건으로 만든다.
 *
 * ★ 중복 제거가 필요한 이유 (2026-09-21 실측):
 *   장바구니 행 병합 키가 번역된 표시 문자열(color/size)이라, 같은 SKU라도
 *   번역 결과가 달라지면 별도 행으로 쌓인다(예: "M[5~8근 권장]" vs "M[建议5-8斤]").
 *   그 상태로 cargoParamList를 만들면 같은 specId가 중복 전송되어
 *   alibaba.createOrder.preview가 빈 결과를 반환한다.
 *
 * ★ 옵션 인자로만 확장한다. 기본 동작(options 생략) 변경 금지 — 운임을 수십 번 고쳐 온 함수다.
 *
 * allowSingleSku=true (2026-09-23 추가):
 *   단품(1688 원본 skus.sku 길이 0)은 1688이 spec_id를 주지 않아 specId가 빈 것이 정상이다.
 *   이런 행을 { offerId, quantity }로 넣는다(specId 키 생략 — api/1688-order-create.js
 *   cargoParamList 조립과 같은 형태, 1081424348445 ×4000 → sumCarriage ¥274.30 실측).
 *   같은 offerId 단품 행은 수량을 합산한다.
 *   - 단품 후보: isSingleSku===true / hasOptions===false / 두 표식 모두 없음(구 행 — 서버가 원본으로 재확인)
 *   - 제외: isSingleSku===false 또는 hasOptions===true (옵션 상품인데 specId가 빈 행)
 *
 * @param {Array} rows - 장바구니/주문 품목 배열
 * @param {Function} qtyOf - 행에서 수량을 뽑는 함수
 * @param {{ allowSingleSku?: boolean }} [options]
 * @returns {{ cargoList: Array, mergedCount: number }} mergedCount = 합쳐진 중복 건수
 */
export function buildCargoParamList(rows, qtyOf, { allowSingleSku = false } = {}) {
  const map = new Map()
  let mergedCount = 0

  for (const it of (Array.isArray(rows) ? rows : [])) {
    const offerId = String(it?.num_iid || it?.itemId || '').trim()
    const specId = String(it?.specId || '').trim()
    if (!offerId) continue
    if (!specId) {
      if (!allowSingleSku || !isSingleSkuCandidate(it)) continue
      // 단품 — specId 키 없이 offerId 단위로 합산
      const key = `${offerId}__single`
      const qty = Math.max(1, parseInt(qtyOf(it), 10) || 1)
      if (map.has(key)) {
        map.get(key).quantity += qty
        mergedCount++
      } else {
        map.set(key, { offerId, quantity: qty })
      }
      continue
    }

    const key = `${offerId}_${specId}`
    const qty = Math.max(1, parseInt(qtyOf(it), 10) || 1)
    if (map.has(key)) {
      map.get(key).quantity += qty
      mergedCount++
    } else {
      map.set(key, { offerId, specId, quantity: qty })
    }
  }

  return { cargoList: Array.from(map.values()), mergedCount }
}
