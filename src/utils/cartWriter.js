/**
 * 장바구니 쓰기 공용 로직 (순수 함수 모음).
 *
 * ProductDetailModal.vue의 saveSelectedItemsToCart()에서 UI 의존 부분
 * (ref 읽기 / 토스트 / emit / 모달 닫기 / 선택 상태 초기화)을 제외한
 * 순수 로직만 "그대로" 옮긴 것이다. 조건문·폴백·순서·변수명 의미를 바꾸지 않았다.
 *
 * 목적: 엑셀 대량발주가 엑셀 전용 담기 경로를 새로 만들지 않고
 * 상세모달과 물리적으로 같은 코드를 타게 하기 위함.
 * (MOQ 합계 검증 / 재고 상한 클램핑 / 기존 행 병합 / 저장 / 이벤트 디스패치)
 *
 * ※ 토스트는 이 파일에서 띄우지 않는다. 실패 사유와 문구를 결과 객체에 담아 돌려주고,
 *   호출한 화면이 자기 방식(토스트·표 등)으로 표시한다.
 * ※ MOQ 판정 함수는 src/utils/moq.js의 것을 import해서 쓴다 (복제 금지).
 */

import { sumQty, resolveMoq } from './moq'

/**
 * localStorage에서 장바구니 배열을 읽는다.
 * 원본: ProductDetailModal.saveSelectedItemsToCart 내부 (cached → JSON.parse → 배열 아니면 [])
 *
 * @param {string} cartKey - getCartStorageKey()로 얻은 사용자 격리 키
 * @returns {Array<object>} 장바구니 행 배열 (없으면 빈 배열)
 */
export function readCart(cartKey) {
  const cached = localStorage.getItem(cartKey)
  let cart = cached ? JSON.parse(cached) : []
  if (!Array.isArray(cart)) cart = []
  return cart
}

/**
 * 1688 최소 주문 수량(min_num) 담기 시점 검증.
 *
 * ★ 같은 1688 상품(offerId) "합계" 기준.
 *   1688은 SKU별 최소수량 필드가 없고 min_num/mix_number(混批) 모두 offer 단위이므로
 *   옵션을 섞어 합계로 MOQ를 채우는 것이 정상 주문이다.
 *   장바구니에 이미 담긴 같은 상품 수량도 합계에 포함한다(인자로 받은 cart에서 그대로 읽음).
 *   ※ 발주는 체크된 행만 나가므로 최종 방어선은 CartView.openOrderModal의 발주 가드다.
 *
 * ※ 기존 행 매칭은 moq.js의 offerGroupKey가 아니라 `String(c.num_iid || '') === offerIdStr`
 *   그대로 쓴다. offerGroupKey는 num_iid가 빈 행을 `row:{id}` 단독 그룹으로 분리하는데,
 *   원본 코드는 그런 행을 합계에서 그냥 제외했다. 바꾸면 동작이 달라진다.
 *
 * @param {object}  params
 * @param {Array}   params.cart      - readCart()로 읽은 현재 장바구니
 * @param {string|number} params.offerId - 1688 상품 ID (num_iid)
 * @param {number}  params.addingQty - 이번에 담으려는 수량 합계
 * @param {*}       params.minOrder  - 1688 min_num 원본값 (resolveMoq가 정규화)
 * @returns {{ ok: boolean, moq: number, offerTotal: number, message: string, messageType: string }}
 */
export function checkOfferMoq({ cart, offerId, addingQty, minOrder }) {
  const mo = resolveMoq(minOrder)
  const offerIdStr = String(offerId || '')
  const alreadyInCart = sumQty(cart.filter(c => String(c.num_iid || '') === offerIdStr))
  const offerTotal = addingQty + alreadyInCart

  if (offerTotal < mo) {
    return {
      ok: false,
      moq: mo,
      offerTotal,
      message: `⚠️ 최소 주문 수량은 ${mo}개입니다. 옵션 수량 합계를 ${mo}개 이상으로 맞춰주세요. (현재 ${offerTotal}개)`,
      messageType: 'warning',
    }
  }

  return { ok: true, moq: mo, offerTotal, message: '', messageType: '' }
}

/**
 * 선택된 SKU 목록 → 장바구니 행 배열 생성.
 * 각 SKU(색상+사이즈+수량 조합)를 독립적인 별도 행으로 만들어 옵션 혼재를 방지한다.
 *
 * 가격·재고·specId 조회는 호출측이 콜백으로 넘긴다 — 상세모달은 자기 computed를,
 * 엑셀은 fetch1688ProductById 응답을 각각 바인딩하면 된다.
 *
 * @param {object}   params
 * @param {object}   params.baseItem        - 모든 행이 공유하는 상품 스냅샷(제목/이미지/seller/freight 등)
 * @param {Array}    params.selectedSkus    - [{ color, size, quantity, specId? }, ...]
 * @param {string|number} params.offerId    - 1688 상품 ID (행 id 생성 및 num_iid에 사용)
 * @param {number}   params.minOrder        - resolveMoq로 정규화된 MOQ
 * @param {boolean}  params.hasOptions      - 담을 당시 화면에 실제 선택 가능한 옵션이 있었는지
 * @param {boolean}  params.isSkuPriced     - SKU별 가격 상품 여부
 * @param {Array}    params.priceTiers      - 수량 구간 테이블 (isSkuPriced=true면 무시됨)
 * @param {number}   params.exchangeRate    - 적용 환율 (KRW 환산용)
 * @param {Function} params.resolveUnitPrice- (sku) => number, 이 줄의 단가(CNY)
 * @param {Function} params.resolveStock    - (color, size) => number | Infinity
 * @param {Function} params.resolveSpecId   - (color, size) => string (32자리 hex 또는 '')
 * @param {Function} params.resolveImageUrl - (color, size) => string, 그 옵션의 이미지 ('' 가능)
 * @returns {Array<object>} 장바구니 행 배열
 */
export function buildCartRowsFromSkus({
  baseItem,
  selectedSkus,
  offerId,
  minOrder,
  hasOptions,
  isSkuPriced,
  priceTiers,
  exchangeRate,
  resolveUnitPrice,
  resolveStock,
  resolveSpecId,
  resolveImageUrl,
}) {
  return selectedSkus.map((sku, idx) => {
    const colorStr = String(sku.color || '').trim()
    const sizeStr = String(sku.size || '').trim()
    const optionParts = [colorStr, sizeStr].filter(p => p && p !== '-' && p !== 'undefined')
    const optionText = optionParts.length ? optionParts.join(' / ') : '기본 옵션'
    // 저장 직전에도 재고 상한으로 한 번 더 클램핑 (직접 입력 후 바로 담기 버튼 누른 경우 방어)
    const stockLimit = resolveStock(colorStr, sizeStr)
    const skuQty = stockLimit === Infinity
      ? Math.max(1, Number(sku.quantity) || 1)
      : Math.min(stockLimit, Math.max(1, Number(sku.quantity) || 1))
    const skuId = `${offerId}_${colorStr || 'default'}_${sizeStr || 'none'}_${Date.now()}_${idx}`
    // 이 행의 단가 — 화면에 표시된 값과 동일한 출처(rowUnitPrice). 전역 단가 사용 금지.
    const unitCny = Number(resolveUnitPrice(sku))

    return {
      ...baseItem,
      id: skuId,
      // ── 행 이미지 (표시 전용) ──────────────────────────────────────────
      // 이 행의 SKU 이미지 → (없으면) 같은 색상의 옵션 썸네일 → (없으면) 상품 대표 이미지.
      // 앞의 두 단계는 resolveImageUrl이 담당하고, 마지막 폴백만 여기서 처리한다.
      // ★ 결정은 이 함수 안에서 끝난다 — 호출측이 행마다 이미지를 따로 넣지 않아도 된다.
      //   (baseItem.imageUrl은 "담을 당시 상세창에 떠 있던 큰 사진" 하나뿐이라,
      //    여러 옵션을 한 번에 담으면 모든 행이 같은 사진을 공유하는 문제가 있었다)
      imageUrl: resolveImageUrl(colorStr, sizeStr) || baseItem.imageUrl,
      // 옵션 독립 필드 (CartView에서 개별 렌더링용)
      color: colorStr,
      size: sizeStr,
      optionName: optionText,
      sku: optionText,
      // ── 1688 발주 API 필수 필드 ──
      // specId: 선택된 SKU의 spec_id(32자리 hex). 발주 시 400 방지.
      specId: sku.specId || resolveSpecId(colorStr, sizeStr),
      // num_iid: 1688 상품 숫자 ID. baseItem.itemId와 동일하지만 발주 쪽 명시적 필드명으로도 저장.
      num_iid: String(offerId || ''),
      // minOrder: 1688 최소 주문 수량 — CartView 수량 조절 시 하한으로 사용
      minOrder,
      // hasOptions: 담을 당시 화면에 실제 선택 가능한 옵션이 있었는지.
      //   CartView 발주 가드가 "옵션 미선택 행"과 "진짜 단품"을 구분하는 데 사용한다.
      //   (장바구니 행 데이터만으로는 구분할 수 없어 담기 시점에 기록해 둔다)
      //   기준은 rawHasOptions(원본)가 아니라 realColorOptions다. 1688이 무SKU 단품에도
      //   색상명 없는 skus 1개를 주는 경우 rawHasOptions=true가 되어 발주 가드가
      //   진짜 단품을 오차단한다. "옵션이 있는데 파싱이 비어 미선택으로 담기는" 결함은
      //   호출측 첫 번째 가드(rawHasOptions && !parsedHasOptions)가 막는다.
      hasOptions,
      // 수량 및 단가 (각 SKU 행 독립)
      quantity: skuQty,
      // 재고 상한 — CartView 수량 조절 시 활용. 미파악이면 undefined (상한 없음)
      stock: stockLimit === Infinity ? undefined : stockLimit,
      priceCny: unitCny,
      price: unitCny,
      // ── 가격 출처 스냅샷 (CartView 수량 변경 시 구간 단가 재계산용) ──
      //   isSkuPriced=true  : SKU별 가격 상품 → 수량이 바뀌어도 이 줄의 단가는 고정
      //   isSkuPriced=false : 수량 구간 상품 → priceTiers로 재계산 가능
      //   ※ 장바구니에 담긴 뒤에는 1688 원본을 다시 부를 수 없다(일 500회 호출 제한).
      //     그래서 재계산에 필요한 구간 정보를 담는 시점에 함께 저장한다.
      isSkuPriced,
      priceTiers: isSkuPriced
        ? []
        : priceTiers.map(t => ({ minQuantity: t.minQuantity, price: t.price })),
      totalPriceRmb: Number((skuQty * unitCny).toFixed(2)),
      totalPriceKrw: Math.round(skuQty * unitCny * exchangeRate),
      // 단일 SKU 스냅샷 (skus 배열도 이 행만 포함)
      skus: [{ color: colorStr, size: sizeStr, quantity: skuQty }],
      createdAt: new Date().toISOString(),
    }
  })
}

/**
 * 옵션(color+size) 하나에 해당하는 이미지를 고른다 — 장바구니 행 썸네일용 공용 규칙.
 *
 * 매칭 순서는 ProductDetailModal의 getSkuStock / getSkuSpecId와 동일하게 맞춘다
 * (같은 조합이 화면·장바구니에서 서로 다른 값을 보지 않도록).
 *   1. color + size 정확 매칭
 *   2. size만 매칭 (단일 색상 상품)
 *   3. color만 매칭 (단일 규격 상품)
 *   4. 단일 SKU 상품 — 첫 번째 행
 *   5. 같은 색상의 옵션 썸네일 (1차 옵션 버튼에 쓰는 것과 같은 출처)
 *   실패 시 '' — 호출측이 상품 대표 이미지로 폴백한다.
 *
 * ※ 표시 전용 값이다. 금액·specId 판정에는 쓰이지 않는다.
 * ※ skus[].imageUrl / colorValues[].imageUrl 모두 api1688.js의 normalizeImg를 이미
 *   거친 값이라 여기서 재정규화하지 않는다.
 *
 * @param {object}  params
 * @param {Array}   params.skus         - 파싱된 SKU 배열 [{color, size, imageUrl}, ...]
 * @param {Array}   params.colorValues  - 색상 옵션 목록 [{name, imageUrl}, ...] (없으면 [])
 * @param {string}  params.color
 * @param {string}  params.size
 * @returns {string} 이미지 URL 또는 ''
 */
export function resolveSkuImageUrl({ skus, colorValues, color, size }) {
  const list = Array.isArray(skus) ? skus : []
  const colors = Array.isArray(colorValues) ? colorValues : []

  const cStr = String(color || '').trim()
  const sStr = String(size || '').trim()

  if (list.length > 0) {
    // 1. color + size 정확 매칭
    if (cStr && sStr) {
      const match = list.find(sk => String(sk.color || '').trim() === cStr && String(sk.size || '').trim() === sStr)
      if (match?.imageUrl) return String(match.imageUrl)
    }
    // 2. size만 매칭 (단일 색상 상품)
    if (sStr) {
      const match = list.find(sk => String(sk.size || '').trim() === sStr)
      if (match?.imageUrl) return String(match.imageUrl)
    }
    // 3. color만 매칭 (단일 규격 상품)
    if (cStr) {
      const match = list.find(sk => String(sk.color || '').trim() === cStr)
      if (match?.imageUrl) return String(match.imageUrl)
    }
    // 4. 단일 SKU 상품 — 첫 번째 행
    if (list.length === 1 && list[0].imageUrl) return String(list[0].imageUrl)
  }

  // 5. 색상 버튼 썸네일과 같은 출처
  if (cStr) {
    const opt = colors.find(c => String(c.name || '').trim() === cStr)
    if (opt?.imageUrl) return String(opt.imageUrl)
  }

  return ''
}

/**
 * 담기 직전 최종 점검용 — 수량이 0으로 떨어진 행을 골라낸다.
 *
 * buildCartRowsFromSkus는 재고 상한으로 수량을 클램핑하므로, 재고가 0인 옵션은
 * 수량 0인 행이 되어 나온다. 그대로 저장하면 "성공 토스트 + 빈 행"이라는
 * 조용한 실패가 된다. 어느 화면이든 담기 전에 이 함수로 걸러 사용자에게 알려야 한다.
 *
 * ※ 판정만 하고 아무것도 막지 않는다 — 차단·문구는 호출측(모달/엑셀 확인 표) 책임.
 *
 * @param {Array<object>} rows - buildCartRowsFromSkus 결과
 * @returns {Array<object>} 수량이 1 미만인 행들 (없으면 빈 배열)
 */
export function findZeroQuantityRows(rows) {
  return rows.filter(r => !(Number(r.quantity) >= 1))
}

/**
 * 담기 직전 최종 점검용 — 단가가 유효하지 않은 행을 골라낸다.
 *
 * 판정 기준은 CartView.hasValidPrice와 동일하게 "유한한 수 & 0보다 큼"으로 맞춘다.
 * (CartView는 이 조건이 false인 행을 '가격 확인 필요'로 표시하고 발주를 차단한다)
 * 담기 단계에서 미리 막아 0원짜리 행이 장바구니에 들어가는 것 자체를 방지한다.
 *
 * @param {Array<object>} rows - buildCartRowsFromSkus 결과
 * @returns {Array<object>} priceCny가 유효하지 않은 행들 (없으면 빈 배열)
 */
export function findInvalidPriceRows(rows) {
  return rows.filter(r => {
    const p = Number(r.priceCny)
    return !(Number.isFinite(p) && p > 0)
  })
}

/**
 * 장바구니 기존 항목과 병합 후 localStorage 저장 + 갱신 이벤트 디스패치.
 * 동일 itemId+color+size 행은 qty 합산, 신규 옵션은 별도 행으로 선두 삽입.
 *
 * @param {object} params
 * @param {Array}  params.cart         - readCart()로 읽은 현재 장바구니 (이 배열을 직접 변경한다)
 * @param {Array}  params.newRows      - buildCartRowsFromSkus()가 만든 행 배열
 * @param {string} params.cartKey      - getCartStorageKey()로 얻은 사용자 격리 키
 * @param {number} params.exchangeRate - 합산 시 KRW 재계산에 쓰는 환율
 * @returns {{ count: number }} 저장 후 장바구니 행 수
 */
export function mergeAndSaveCart({ cart, newRows, cartKey, exchangeRate }) {
  for (const newRow of newRows) {
    const existIdx = cart.findIndex(c =>
      c.itemId === newRow.itemId &&
      String(c.color || '') === newRow.color &&
      String(c.size || '') === newRow.size
    )
    if (existIdx >= 0) {
      // 동일 옵션 행 존재 → qty 합산 후 재고 상한 클램핑
      const mergedQty = (Number(cart[existIdx].quantity) || 0) + newRow.quantity
      const cartStock = typeof cart[existIdx].stock === 'number' ? cart[existIdx].stock
        : typeof newRow.stock === 'number' ? newRow.stock
        : Infinity
      cart[existIdx].quantity = cartStock === Infinity ? mergedQty : Math.min(cartStock, mergedQty)
      cart[existIdx].totalPriceRmb = Number((cart[existIdx].quantity * cart[existIdx].priceCny).toFixed(2))
      cart[existIdx].totalPriceKrw = Math.round(cart[existIdx].quantity * cart[existIdx].priceCny * exchangeRate)
      // stock 필드 최신 정보로 갱신
      if (newRow.stock !== undefined) cart[existIdx].stock = newRow.stock
    } else {
      // 신규 옵션 행 → 독립 행으로 선두 삽입
      cart.unshift(newRow)
    }
  }

  localStorage.setItem(cartKey, JSON.stringify(cart))

  // Storage 이벤트 및 퀵메뉴/헤더 갱신 이벤트 디스패치
  window.dispatchEvent(new Event('storage'))
  window.dispatchEvent(new CustomEvent('euchs:cart-updated', { detail: { count: cart.length } }))
  window.dispatchEvent(new CustomEvent('euchs:cart_updated', { detail: { count: cart.length } }))

  return { count: cart.length }
}
