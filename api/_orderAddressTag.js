/**
 * 1688 발주서 받는 주소 뒤에 "우리 주문번호 + 고객명" 표시를 붙이는 규칙 — 한 곳.
 *
 * 쓰는 곳:
 *   - 서버 자동발주 api/1688-order-create.js (→ api/_1688OrderAddress.js)
 *   - 서버 수동발주 주소 조회 api/1688-order-address.js
 *   - 관리자 주문 화면 수동발주 팝업 (결과 글자를 그대로 보여 주고 복사)
 * 순수 함수만 둔다 (네트워크·DB 없음) — 브라우저와 서버가 같은 파일을 import 한다.
 *
 * 왜: 이우 창고에 들어오는 1688 택배에 누구 주문인지 보이게 하려는 보조 표시.
 *     (창고 입고 스캔과 함께 쓴다 — 스캔이 주 수단)
 *
 * 근거:
 *   - 1688 addressParam 칸(fullName·mobile·phone·postCode·provinceText·cityText·areaText·townText·address·districtCode·addressId)
 *     — 1688 공식 문서 alibaba.trade.fastCreateOrder (https://open.1688.com/api/apidocdetail.htm?aopApiCategory=trade_new&id=com.alibaba.trade:alibaba.trade.fastCreateOrder-1)
 *   - 2026-09-29 실측 alibaba.createOrder.preview (주문 생성 아님): addressId 방식과
 *     글자 칸 방식(address 끝에 "EUC-20260929-0000 테스트상사") 둘 다 error_code 0000, 운임 같음(27430 fen)
 *   - 같은 1688 계정 저장 주소에 이미 한글이 들어 있다(예: "…仓库A48(성창용)") — 한글은 받아 준다
 *   - 글자 수 제한: 공개 문서에서 확인하지 못함 → 우리 쪽 상한 ADDRESS_MAX_CHARS(보수적으로 잡음)
 */

/** 주소(address 칸) 전체 글자 수 상한 — 1688 공식 수치 미확인이라 우리 쪽에서 보수적으로 잡은 값 */
export const ADDRESS_MAX_CHARS = 100

/** 우리 주문번호 형식 — DB orders.order_number 실측(113건 모두 EUC-YYYYMMDD-NNNN, 17자) */
const ORDER_NO_RE = /^EUC-\d{8}-\d{4}$/
/** 주소 끝에 이미 붙은 표시(우리 주문번호부터 끝까지) — 다시 붙일 때 떼어 낸다 */
const TRAILING_TAG_RE = /\s*EUC-\d{8}-\d{4}(?:\s.*)?$/u

/**
 * 표시에 넣을 수 있는 글자만 남긴다.
 * 허용: 글자(한글·한자·영문 등)·숫자·공백·흔한 부호 몇 개. 그 밖(이모지·기호·제어문자 등)은 뺀다.
 * 1688이 정확히 무엇을 막는지는 공개 문서에 없어, 막힐 수 있는 것을 넓게 빼는 쪽을 택했다.
 */
export function cleanTagText(s) {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} \-_.()（）&·]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 고객명 = 사업자 상호가 있으면 상호, 없으면 가입 이름.
 * 실제 칸: profiles.company_name / profiles.name (DB 조회로 확정, 2026-09-29)
 */
export function customerLabelOf(profile) {
  const company = cleanTagText(profile?.company_name)
  if (company) return company
  return cleanTagText(profile?.name)
}

const lengthOf = (s) => Array.from(s).length
const takeChars = (s, n) => Array.from(s).slice(0, Math.max(0, n)).join('').trim()

/**
 * 받는 주소(address 칸) 뒤에 "주문번호 고객명"을 붙인다.
 *   - 주문번호는 절대 자르지 않는다. 넘치면 고객명만 줄이고, 그래도 넘치면 고객명을 뺀다.
 *   - 주문번호만으로도 상한을 넘으면 에러 (조용히 자르지 않는다).
 *   - 이미 뒤에 표시(EUC-…)가 있으면 떼고 한 번만 붙인다.
 * @returns {{ address: string, tag: string, customer: string, customerCut: boolean }}
 */
export function tagAddress(baseAddress, orderNumber, customer, { max = ADDRESS_MAX_CHARS } = {}) {
  const orderNo = String(orderNumber ?? '').trim()
  if (!ORDER_NO_RE.test(orderNo)) {
    throw new Error(`주문번호 형식이 올바르지 않습니다: "${orderNo}" (EUC-YYYYMMDD-NNNN)`)
  }
  const base = String(baseAddress ?? '').replace(TRAILING_TAG_RE, '').trim()
  if (!base) throw new Error('기본 받는 주소가 비어 있습니다.')

  const head = `${base} ${orderNo}`
  if (lengthOf(head) > max) {
    throw new Error(`주소(${lengthOf(base)}자)와 주문번호만으로 ${max}자를 넘습니다.`)
  }

  const name = cleanTagText(customer)
  const room = max - lengthOf(head) - 1 // 고객명 앞 공백 1자
  const fitted = lengthOf(name) <= room ? name : takeChars(name, room)
  const tag = fitted ? `${orderNo} ${fitted}` : orderNo
  return {
    address: `${base} ${tag}`,
    tag,
    customer: fitted,
    customerCut: fitted !== name,
  }
}

/**
 * 1688 저장 주소(alibaba.trade.receiveAddress.get 응답 receiveAddressItems[] 한 줄)를
 * fastCreateOrder addressParam 글자 칸으로 옮기고 address 끝에 표시를 붙인다.
 *
 * 응답 칸(2026-09-29 실측): id, fullName, address, post, mobilePhone, phone?, addressCode,
 *   addressCodeText("浙江省 金华市 义乌市"), isDefault, townCode?, townName?
 * addressId는 넣지 않는다 — 넣으면 1688이 저장 주소를 그대로 쓸 수 있어 표시가 빠질 수 있다
 * (addressId와 글자 칸을 함께 보냈을 때 무엇이 우선인지 공식 문서에 없음).
 */
export function taggedAddressParam(saved, { orderNumber, customer, max } = {}) {
  if (!saved) throw new Error('1688 저장 주소가 없습니다.')
  const regions = String(saved.addressCodeText || '').trim().split(/\s+/)
  const fullName = String(saved.fullName || '').trim()
  const mobile = String(saved.mobilePhone || '').trim()
  if (!fullName) throw new Error('1688 저장 주소에 받는 사람(fullName)이 없습니다.')
  if (!mobile) throw new Error('1688 저장 주소에 휴대폰(mobilePhone)이 없습니다.')
  if (regions.length !== 3 || regions.some(r => !r)) {
    throw new Error(`1688 저장 주소의 지역(addressCodeText)을 省·市·区로 나눌 수 없습니다: "${saved.addressCodeText}"`)
  }
  const tagged = tagAddress(saved.address, orderNumber, customer, max ? { max } : undefined)
  const [provinceText, cityText, areaText] = regions
  const post = String(saved.post || '').trim()
  const town = String(saved.townName || '').trim()
  const phone = String(saved.phone || '').trim()
  return {
    addressParam: {
      fullName,
      mobile,
      ...(phone ? { phone } : {}),
      ...(post ? { postCode: post } : {}),
      provinceText,
      cityText,
      areaText,
      ...(town ? { townText: town } : {}),
      address: tagged.address,
    },
    ...tagged,
  }
}

/**
 * fastCreateOrder _o_args 만들기 — 발주 요청 본문은 이 함수 하나로만 만든다(단건·그룹 공통).
 * 단품은 specId 키를 넣지 않는다 (2026-09-23 preview 실측 규칙 그대로).
 */
export function buildFastCreateOrderArgs({ addressParam, cargos }) {
  if (!addressParam?.address) throw new Error('addressParam.address가 없습니다.')
  return {
    flow: 'general',
    addressParam,
    cargoParamList: cargos.map(it => {
      const spec = String(it.specId || '').trim()
      return {
        offerId: String(it.numIid),
        ...(spec ? { specId: spec } : {}),
        quantity: Number(it.quantity),
      }
    }),
  }
}
