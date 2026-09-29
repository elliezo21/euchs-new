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
} from '../api/_orderAddressTag.js'

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

// ── 9. 발주 API 핸들러 — 가짜 fetch로 1688에 나가려던 본문을 가로챔 ──
const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
let captured = []
let savedAddrOk = true
globalThis.fetch = async (url) => {
  const u = String(url)
  if (u.startsWith('http://mock.local/auth/v1/user')) return json({ id: 'admin-1', email: 'admin@test' })
  if (u.startsWith('http://mock.local/rest/v1/rpc/is_admin_or_staff')) return json(true)
  if (u.startsWith('http://mock.local/rest/v1/rpc/claim_group_purchase_slot')) return json({ ok: true })
  if (u.startsWith('http://mock.local/rest/v1/rpc/claim_purchase_slot')) return json({ ok: true })
  if (u.startsWith('http://mock.local/rest/v1/rpc/release_')) return json({ ok: true })
  if (u.startsWith('http://mock.local/rest/v1/orders?')) {
    return json([{ id: ORDER_ID, order_number: ONO, user_id: USER_ID }])
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

// ── 10. 수동발주 주소 조회 API — 자동발주와 같은 글자, 휴대폰은 안 돌려줌 ──
const { default: addrHandler } = await import('../api/1688-order-address.js')
const a = await new Promise((resolve) => {
  const res = {
    statusCode: 200, setHeader() {},
    status(c) { this.statusCode = c; return this },
    json(b) { resolve({ status: this.statusCode, body: b }) },
    end() { resolve({ status: this.statusCode, body: null }) },
  }
  addrHandler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { orderId: ORDER_ID } }, res)
})
eq('수동 주소: 자동발주와 같은 주소', a.body?.address, `${BASE} ${ONO} 천공상사`)
eq('수동 주소: 받는 사람·지역', [a.body?.fullName, a.body?.region], ['圆圆A45', '浙江省 金华市 义乌市'])
eq('수동 주소: 휴대폰 안 돌려줌', JSON.stringify(a.body).includes('13800000000'), false)

console.log(`\n${pass} PASS / ${fail} FAIL`)
process.exit(fail ? 1 : 0)
