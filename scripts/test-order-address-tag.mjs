// 1688 발주서 받는 주소 표시("주문번호 고객명") 테스트 — node scripts/test-order-address-tag.mjs
// 규칙 api/_orderAddressTag.js + 서버 조립 api/_1688OrderAddress.js + 발주 API 요청 본문(api/1688-order-create.js).
// ★ 실제 1688·Supabase 호출 없음: fetch 전체를 가짜로 바꾸고 가짜 키만 쓴다. 발주 요청은 가로채서 본문만 읽는다.
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.ONEBOUND_KEY = 'test-key'
process.env.ONEBOUND_SECRET = 'test-secret'
process.env.ONEBOUND_SESSION = 'test-session'

import {
  ADDRESS_MAX_CHARS, cleanTagText, customerLabelOf, tagAddress, taggedAddressParam, buildFastCreateOrderArgs,
  ORDER_NAME_KEY, SELLER_NAME_KEY, sellerGroupKeyOf, isGroupLocked, isOrderNameLocked, resolveTagName,
  applyAddressNames, groupKeyForOrderItems, describeGroupTag,
} from '../api/_orderAddressTag.js'
import { getSellerGroupKey } from '../src/utils/sellerGrouping.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
function throws(name, fn, part) {
  let msg = null
  try { fn() } catch (e) { msg = e.message }
  const ok = msg !== null && (!part || msg.includes(part))
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} ${ok ? '' : `에러 ${JSON.stringify(msg)}  기대 포함 ${JSON.stringify(part)}`}`)
}
const len = s => Array.from(s).length

// 2026-09-29 receiveAddress.get 실측 한 줄 (휴대폰은 가짜)
const SAVED = {
  id: 6402758024,
  fullName: '圆圆A45',
  address: '江东 街道 青岩刘C区38栋1楼1号仓库A45',
  post: '322000',
  mobilePhone: '13800000000',
  addressCode: '330782',
  addressCodeText: '浙江省 金华市 义乌市',
  isDefault: false,
}
const BASE = SAVED.address
const ONO = 'EUC-20260928-9487'

// ── 1. 고객명 규칙 ─────────────────────────────────────────────
eq('상호가 있으면 상호', customerLabelOf({ company_name: '천공상사', name: '조해성' }), '천공상사')
eq('상호가 비면 가입 이름', customerLabelOf({ company_name: '  ', name: '문세란' }), '문세란')
eq('둘 다 없으면 빈 값', customerLabelOf(null), '')

// ── 2. 일반 ───────────────────────────────────────────────────
const n = tagAddress(BASE, ONO, '천공상사')
eq('일반: 주소 뒤에 "주문번호 고객명"', n.address, `${BASE} ${ONO} 천공상사`)
eq('일반: tag', n.tag, `${ONO} 천공상사`)
eq('일반: 줄이지 않음', n.customerCut, false)

// ── 3. 긴 이름 — 고객명만 줄이고 주문번호는 그대로 ────────────
const longName = '가'.repeat(200)
const l = tagAddress(BASE, ONO, longName)
eq('긴 이름: 전체 길이 = 상한', len(l.address), ADDRESS_MAX_CHARS)
eq('긴 이름: 주문번호 온전', l.address.includes(` ${ONO} `), true)
eq('긴 이름: 줄였다고 표시', l.customerCut, true)
eq('긴 이름: 앞부분은 기본 주소 그대로', l.address.startsWith(BASE + ' '), true)
const tight = tagAddress(BASE, ONO, '천공상사', { max: len(BASE) + 1 + len(ONO) })
eq('자리가 주문번호까지만: 고객명 빼고 주문번호만', tight.address, `${BASE} ${ONO}`)
throws('주문번호도 못 들어가면 에러(자르지 않음)', () => tagAddress(BASE, ONO, 'x', { max: len(BASE) + 5 }), '주문번호만으로')

// ── 4. 이미 붙은 주소 — 두 번 붙이지 않음 ─────────────────────
const once = tagAddress(n.address, ONO, '천공상사')
eq('같은 주문 표시가 이미 있음: 한 번만', once.address, n.address)
const other = tagAddress(`${BASE} EUC-20260101-0001 옛고객`, ONO, '천공상사')
eq('다른 주문 표시가 붙어 있음: 떼고 새로', other.address, `${BASE} ${ONO} 천공상사`)
eq('EUCHS 같은 글자는 표시로 안 봄', tagAddress('青岩刘C区38栋1楼1号仓库EUCHS', ONO, 'A').address, `青岩刘C区38栋1楼1号仓库EUCHS ${ONO} A`)

// ── 5. 이모지·막힐 수 있는 문자 제거 ──────────────────────────
eq('이모지 제거', cleanTagText('천공😀상사🎉'), '천공상사')
eq('ZWJ 이모지·제어문자 제거', cleanTagText('A👨‍👩‍👧B\u0007C'), 'ABC')
eq('허용 부호는 남김', cleanTagText('(주) 이유씨 & Co.'), '(주) 이유씨 & Co.')
eq('상호의 이모지도 제거', customerLabelOf({ company_name: '🌸무니🌸' }), '무니')
eq('이모지 뺀 뒤 표시', tagAddress(BASE, ONO, '무니😀샵').tag, `${ONO} 무니샵`)
eq('이모지만 있는 이름 = 주문번호만', tagAddress(BASE, ONO, '😀😀').tag, ONO)

// ── 6. 입력 검사 ──────────────────────────────────────────────
throws('주문번호 형식 틀림', () => tagAddress(BASE, 'EUC-1790579874538', 'A'), '형식')
throws('주문번호 없음', () => tagAddress(BASE, '', 'A'), '형식')
throws('기본 주소 없음', () => tagAddress('', ONO, 'A'), '비어')

// ── 7. 저장 주소 → addressParam ──────────────────────────────
const p = taggedAddressParam(SAVED, { orderNumber: ONO, customer: '천공상사' })
eq('addressParam 칸', p.addressParam, {
  fullName: '圆圆A45', mobile: '13800000000', postCode: '322000',
  provinceText: '浙江省', cityText: '金华市', areaText: '义乌市',
  address: `${BASE} ${ONO} 천공상사`,
})
eq('addressId는 넣지 않음', 'addressId' in p.addressParam, false)
eq('townName 있으면 townText', taggedAddressParam({ ...SAVED, townName: '江东街道' }, { orderNumber: ONO, customer: 'A' }).addressParam.townText, '江东街道')
throws('지역 3칸이 아니면 에러', () => taggedAddressParam({ ...SAVED, addressCodeText: '浙江省 金华市' }, { orderNumber: ONO }), '省·市·区')
throws('휴대폰 없으면 에러', () => taggedAddressParam({ ...SAVED, mobilePhone: '' }, { orderNumber: ONO }), 'mobilePhone')

// ── 8. 요청 본문 만들기 ───────────────────────────────────────
const args = buildFastCreateOrderArgs({
  addressParam: p.addressParam,
  cargos: [{ numIid: 111, specId: 'abc', quantity: '3' }, { numIid: '222', specId: '', quantity: 5 }],
})
eq('본문: flow·주소·품목', args, {
  flow: 'general',
  addressParam: p.addressParam,
  cargoParamList: [{ offerId: '111', specId: 'abc', quantity: 3 }, { offerId: '222', quantity: 5 }],
})
eq('본문 JSON에 표시가 들어감', JSON.stringify(args).includes(`${ONO} 천공상사`), true)

// ── 8-b. 판매자 그룹 키 = src/utils/sellerGrouping.js 와 같은 규칙 ──
for (const it of [
  { sellerId: 'S1', num_iid: '1' }, { sellerId: '  ', num_iid: '2' }, { num_iid: '', itemId: '3' },
  { id: 4 }, {}, { sellerId: '_sopid@BBB0fc524' },
]) eq(`그룹 키 대조 ${JSON.stringify(it)}`, sellerGroupKeyOf(it), getSellerGroupKey(it))

// ── 8-c. 이름 우선순위 4가지 ─────────────────────────────────
const PROFILE = { company_name: '천공상사', name: '중국구매대행배대지및상품개발종합물류' }
const A = 'seller:SA', B = 'seller:SB'
const base2 = () => [
  { sellerId: 'SA', num_iid: '111' }, { sellerId: 'SA', num_iid: '112' }, { sellerId: 'SB', num_iid: '222' },
]
eq('우선 4: 가입 이름 (상호 없음)', resolveTagName({ items: base2(), groupKey: A, profile: { company_name: '', name: '문세란' } }), { name: '문세란', source: 'name' })
eq('우선 3: 회원 상호', resolveTagName({ items: base2(), groupKey: A, profile: PROFILE }), { name: '천공상사', source: 'company' })
const withOrder = applyAddressNames(base2(), { orderName: '김위챗' })
eq('우선 2: 주문 전체 이름 > 상호', resolveTagName({ items: withOrder, groupKey: A, profile: PROFILE }), { name: '김위챗', source: 'order' })
const withSeller = applyAddressNames(withOrder, { groupKey: B, sellerName: '박위챗' })
eq('우선 1: 판매자별 이름 > 주문 전체', resolveTagName({ items: withSeller, groupKey: B, profile: PROFILE }), { name: '박위챗', source: 'seller' })
eq('판매자별 이름은 그 판매자만', resolveTagName({ items: withSeller, groupKey: A, profile: PROFILE }), { name: '김위챗', source: 'order' })
eq('판매자별 이름 = 그 판매자 모든 품목에', withSeller.filter(it => it[SELLER_NAME_KEY] === '박위챗').length, 1)
eq('주문 전체 이름 = 모든 품목에', withOrder.every(it => it[ORDER_NAME_KEY] === '김위챗'), true)
const cleared = applyAddressNames(withSeller, { groupKey: B, sellerName: '  ' })
eq('판매자별 이름 비우면 키 지움 → 주문 전체로', [SELLER_NAME_KEY in cleared[2], resolveTagName({ items: cleared, groupKey: B, profile: PROFILE }).source], [false, 'order'])
eq('저장 이름도 이모지 제거', applyAddressNames(base2(), { orderName: '김😀위챗' })[0][ORDER_NAME_KEY], '김위챗')
eq('원본 배열은 안 바뀜', base2().some(it => ORDER_NAME_KEY in it), false)

// ── 8-d. 잠금 ────────────────────────────────────────────────
const partly = base2(); partly[2].purchaseNo = '3316454079245011656'
eq('발주된 판매자 잠금', [isGroupLocked(partly, B), isGroupLocked(partly, A)], [true, false])
throws('잠긴 판매자 이름 바꾸기 = 에러', () => applyAddressNames(partly, { groupKey: B, sellerName: 'x' }), '이미 1688에 발주')
eq('일부만 발주됨 → 주문 전체 이름은 안 잠김', isOrderNameLocked(partly), false)
const froze = applyAddressNames(partly, { orderName: '김위챗', profile: PROFILE })
eq('주문 전체 이름 바꿔도 발주된 판매자 표시는 그대로(굳힘)', resolveTagName({ items: froze, groupKey: B, profile: PROFILE }), { name: '천공상사', source: 'seller' })
eq('안 발주된 판매자는 새 이름', resolveTagName({ items: froze, groupKey: A, profile: PROFILE }).name, '김위챗')
const allDone = base2().map(it => ({ ...it, purchaseNo: 'P' }))
eq('모두 발주됨 → 주문 전체 이름 잠김', isOrderNameLocked(allDone), true)
throws('모두 발주됨 → 주문 전체 이름 저장 에러', () => applyAddressNames(allDone, { orderName: 'x' }), '모든 판매자')
const exclDone = base2(); exclDone[2].purchaseNo = 'P'; exclDone[0].excluded = true; exclDone[1].excluded = true
eq('제외된 판매자는 잠금 판정에서 뺌', isOrderNameLocked(exclDone), true)
eq('describeGroupTag 잠금·표시', (({ locked, tag, source }) => ({ locked, tag, source }))(describeGroupTag({ items: partly, groupKey: B, profile: PROFILE, orderNumber: ONO })),
  { locked: true, tag: `${ONO} 천공상사`, source: 'company' })
eq('describeGroupTag 완성 주소', describeGroupTag({ items: withSeller, groupKey: B, profile: PROFILE, orderNumber: ONO, baseAddress: BASE }).address, `${BASE} ${ONO} 박위챗`)

// ── 8-e. 서버가 발주 품목의 판매자를 DB items에서 정함 ───────
eq('itemIndices → 판매자', groupKeyForOrderItems(base2(), { itemIndices: [0, 1] }), A)
eq('numIid → 판매자', groupKeyForOrderItems(base2(), { numIid: '222' }), B)
throws('판매자 두 곳에 걸치면 에러', () => groupKeyForOrderItems(base2(), { itemIndices: [0, 2] }), '판매자 2곳')
throws('없는 품목 번호 에러', () => groupKeyForOrderItems(base2(), { itemIndices: [9] }), '없는 품목')
throws('없는 상품 에러', () => groupKeyForOrderItems(base2(), { numIid: '999' }), '없습니다')

// ── 9. 발주 API 핸들러 — 가짜 fetch로 1688에 나가려던 본문을 가로챔 ──
const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
let captured = []
let savedAddrOk = true
// 가짜 DB 주문 items — 판매자 SA(111·222), SB(333)
let dbItems = [
  { sellerId: 'SA', num_iid: '111', specId: 's1' },
  { sellerId: 'SA', num_iid: '222', specId: 's2' },
  { sellerId: 'SB', num_iid: '333', specId: 's3' },
]
globalThis.fetch = async (url) => {
  const u = String(url)
  if (u.startsWith('http://mock.local/auth/v1/user')) return json({ id: 'admin-1', email: 'admin@test' })
  if (u.startsWith('http://mock.local/rest/v1/rpc/is_admin_or_staff')) return json(true)
  if (u.startsWith('http://mock.local/rest/v1/rpc/claim_group_purchase_slot')) return json({ ok: true })
  if (u.startsWith('http://mock.local/rest/v1/rpc/claim_purchase_slot')) return json({ ok: true })
  if (u.startsWith('http://mock.local/rest/v1/rpc/release_')) return json({ ok: true })
  if (u.startsWith('http://mock.local/rest/v1/orders?')) {
    return json([{ id: ORDER_ID, order_number: ONO, user_id: USER_ID, items: dbItems }])
  }
  if (u.startsWith('http://mock.local/rest/v1/profiles?')) return json([{ company_name: '천공상사', name: '조해성' }])
  if (u.startsWith('https://api-gw.onebound.cn/1688global/custom?')) {
    const q = new URL(u).searchParams
    const method = q.get('method')
    if (q.get('key') !== 'test-key') throw new Error('가짜 키가 아님 — 중단')
    if (method === 'com.alibaba.trade/alibaba.trade.receiveAddress.get') {
      return savedAddrOk ? json({ error_code: '0000', response: { receiveAddressItems: [SAVED] } })
        : json({ error_code: '5000', reason: 'mock fail' })
    }
    if (method === 'com.alibaba.trade/alibaba.trade.fastCreateOrder') {
      captured.push(JSON.parse(q.get('_o_args')))
      return json({ error_code: '0000', response: { orderId: 'MOCK-1688-1' } })
    }
  }
  throw new Error(`테스트가 모르는 요청 — 막음: ${u.slice(0, 80)}`)
}

const { default: handler } = await import('../api/1688-order-create.js')
function run(body) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      status(c) { this.statusCode = c; return this },
      json(b) { resolve({ status: this.statusCode, body: b }) },
      end() { resolve({ status: this.statusCode, body: null }) },
    }
    handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body }, res)
  })
}

// 그룹 모드
captured = []
const g = await run({
  items: [{ numIid: '111', specId: 's1', quantity: 2 }, { numIid: '222', specId: 's2', quantity: 3 }],
  itemIndices: [0, 1], orderNumber: ONO, orderId: ORDER_ID, confirmToken: 'EUCHS_ORDER_CONFIRMED',
})
eq('그룹: 성공 응답', [g.status, g.body?.success], [200, true])
eq('그룹: 1688로 나간 주소에 표시', captured[0]?.addressParam?.address, `${BASE} ${ONO} 천공상사`)
eq('그룹: addressId 없음', captured[0] && 'addressId' in captured[0].addressParam, false)
eq('그룹: 품목 2개', captured[0]?.cargoParamList?.length, 2)

// 단건 모드 (개별 재시도 — orderId 없이 orderNumber만)
captured = []
const s = await run({ numIid: '333', specId: 's3', quantity: 1, orderNumber: ONO, confirmToken: 'EUCHS_ORDER_CONFIRMED' })
eq('단건: 성공 응답', [s.status, s.body?.success], [200, true])
eq('단건: 1688로 나간 주소에 표시', captured[0]?.addressParam?.address, `${BASE} ${ONO} 천공상사`)

// 저장 주소 조회 실패 → 발주 요청 자체를 보내지 않음
captured = []
savedAddrOk = false
const f = await run({ numIid: '333', specId: 's3', quantity: 1, orderNumber: ONO, confirmToken: 'EUCHS_ORDER_CONFIRMED' })
eq('주소 실패: 발주 중단 코드', [f.status, f.body?.code], [502, 'ADDRESS_BUILD_FAILED'])
eq('주소 실패: 1688 발주 요청 0건', captured.length, 0)
savedAddrOk = true

// 주문번호가 DB와 다르면 발주하지 않음
captured = []
const m = await run({ numIid: '333', specId: 's3', quantity: 1, orderNumber: 'EUC-20260101-0001', orderId: ORDER_ID, itemIndex: 0, confirmToken: 'EUCHS_ORDER_CONFIRMED' })
eq('주문번호 불일치: 발주 중단', [m.body?.code, captured.length], ['ADDRESS_BUILD_FAILED', 0])

// ── 9-b. 판매자별 다른 이름이 각 발주 요청에 들어감 ──────────
dbItems = applyAddressNames(applyAddressNames(dbItems, { orderName: '김위챗' }), { groupKey: 'seller:SB', sellerName: '박위챗' })
captured = []
await run({
  items: [{ numIid: '111', specId: 's1', quantity: 2 }, { numIid: '222', specId: 's2', quantity: 3 }],
  itemIndices: [0, 1], orderNumber: ONO, orderId: ORDER_ID, confirmToken: 'EUCHS_ORDER_CONFIRMED',
})
await run({ numIid: '333', specId: 's3', quantity: 1, orderNumber: ONO, confirmToken: 'EUCHS_ORDER_CONFIRMED' })
await run({ numIid: '333', specId: 's3', quantity: 1, orderNumber: ONO, orderId: ORDER_ID, itemIndex: 2, confirmToken: 'EUCHS_ORDER_CONFIRMED' })
eq('판매자 SA(그룹) 요청 = 주문 전체 이름', captured[0]?.addressParam?.address, `${BASE} ${ONO} 김위챗`)
eq('판매자 SB(개별 재시도·numIid) 요청 = 판매자별 이름', captured[1]?.addressParam?.address, `${BASE} ${ONO} 박위챗`)
eq('판매자 SB(단건·itemIndex) 요청 = 판매자별 이름', captured[2]?.addressParam?.address, `${BASE} ${ONO} 박위챗`)

// ── 10. 수동발주 재료 API — 회원 상호·이름 + 기본 배송지, 휴대폰은 안 돌려줌 ──
const { default: addrHandler } = await import('../api/1688-order-address.js')
const callAddr = (body) => new Promise((resolve) => {
  const res = {
    statusCode: 200, setHeader() {},
    status(c) { this.statusCode = c; return this },
    json(b) { resolve({ status: this.statusCode, body: b }) },
    end() { resolve({ status: this.statusCode, body: null }) },
  }
  addrHandler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body }, res)
})
const a = await callAddr({ orderId: ORDER_ID, withAddress: true })
eq('재료: 회원 상호·이름', a.body?.profile, { company_name: '천공상사', name: '조해성' })
eq('재료: 기본 배송지', a.body?.base, { address: BASE, fullName: '圆圆A45', region: '浙江省 金华市 义乌市', postCode: '322000' })
eq('재료: 휴대폰 안 돌려줌', JSON.stringify(a.body).includes('13800000000'), false)
const a2 = await callAddr({ orderId: ORDER_ID })
eq('재료: withAddress 없으면 1688 안 부름(base 없음)', 'base' in (a2.body || {}), false)
// 수동 [복사] 글자 = 자동발주 요청 글자 (같은 함수 조합)
eq('수동 [복사] = 자동발주 (판매자 SB)', describeGroupTag({ items: dbItems, groupKey: 'seller:SB', profile: a.body.profile, orderNumber: ONO, baseAddress: a.body.base.address }).address, captured[1]?.addressParam?.address)
eq('수동 [복사] = 자동발주 (판매자 SA)', describeGroupTag({ items: dbItems, groupKey: 'seller:SA', profile: a.body.profile, orderNumber: ONO, baseAddress: a.body.base.address }).address, captured[0]?.addressParam?.address)

console.log(`\n${pass} PASS / ${fail} FAIL`)
process.exit(fail ? 1 : 0)
