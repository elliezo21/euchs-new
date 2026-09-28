// 스튜디오 → 쿠팡 연동(2~3단계) 테스트 — node scripts/test-marketplace.mjs
// api/marketplace.js handler를 그대로 부르고, Supabase(인증·REST·Storage)와 쿠팡 중계는 가짜 fetch + 메모리 표로 흉내 낸다.
// 시크릿·운영 DB·로그인 토큰·실제 쿠팡을 쓰지 않는다 (아래 키는 테스트용 가짜 값).
import crypto from 'node:crypto'
import fs from 'node:fs'
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.MARKETPLACE_ENC_KEY = Buffer.alloc(32, 7).toString('base64')
process.env.MARKETPLACE_RELAY_URL = 'http://relay.local'
process.env.MARKETPLACE_RELAY_SECRET = 'test-relay-secret'

const { loadEncKey, encryptSecret, decryptSecret, makeImageToken, verifyImageToken } = await import('../api/_marketplaceCrypto.js')
const C = await import('../api/_coupang.js')
const { default: handler } = await import('../api/marketplace.js')

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(64)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const quiet = async fn => { if (process.env.LOUD) return fn(); const o = [console.error, console.warn, console.info]; console.error = console.warn = console.info = () => {}; try { return await fn() } finally { [console.error, console.warn, console.info] = o } }

// ── 1. 암호화 ──
const K = loadEncKey()
{
  const enc = encryptSecret('secret-value-1234', K)
  const p = enc.split(':')
  eq('저장 형식 v1:iv12:암호문:tag16', [p[0], Buffer.from(p[1], 'base64').length, Buffer.from(p[3], 'base64').length, p.length], ['v1', 12, 16, 4])
  eq('복호화 = 원문', decryptSecret(enc, K), 'secret-value-1234')
  eq('같은 값도 매번 다른 암호문(iv)', encryptSecret('a', K) !== encryptSecret('a', K), true)
  eq('암호문에 원문이 없음', enc.includes('secret-value'), false)
  let threw = false
  try { decryptSecret(`${p[0]}:${p[1]}:${Buffer.from('x' + Buffer.from(p[2], 'base64').toString('binary').slice(1), 'binary').toString('base64')}:${p[3]}`, K) } catch { threw = true }
  eq('암호문이 바뀌면 복호화 실패(GCM)', threw, true)
  let bad = false
  try { loadEncKey(Buffer.alloc(16).toString('base64')) } catch { bad = true }
  eq('암호화 키가 32바이트가 아니면 거절', bad, true)
}

// ── 2. 이미지 토큰 ──
const SID = '33333333-3333-4333-8333-333333333333'
{
  const t = makeImageToken(K, SID, 'rep', 1000)
  eq('토큰 확인 → sendId·key', verifyImageToken(K, t, 1000), { sendId: SID, key: 'rep' })
  eq('30분 뒤 만료', [!!verifyImageToken(K, t, 1000 + 1800), verifyImageToken(K, t, 1000 + 1801)], [true, null])
  eq('위조(key 바꿈)·다른 키 → null', [verifyImageToken(K, t.replace('.rep.', '.all.'), 1000), verifyImageToken(Buffer.alloc(32, 9), t, 1000)], [null, null])
  eq('이상한 토큰 → null', [verifyImageToken(K, '', 1), verifyImageToken(K, 'a.b.c.d', 1), verifyImageToken(K, null, 1)], [null, null, null])
  const url = `https://www.euchs.co.kr/api/marketplace?t=${makeImageToken(K, SID, '0012')}`
  eq('이미지 주소 200자 이하 (쿠팡 vendorPath 제한)', url.length <= 200, true)
}

// ── 3. 서명 ──
{
  eq("signed-date = yyMMdd'T'HHmmss'Z' UTC", C.signedDate(new Date('2026-09-28T06:03:12.345Z')), '260928T060312Z')
  const a = C.ceaAuthorization({ accessKey: 'AK', secretKey: 'SK', method: 'get', path: '/v2/x', query: 'a=1&b=2', date: '260928T060312Z' })
  const want = crypto.createHmac('sha256', 'SK').update('260928T060312ZGET/v2/xa=1&b=2').digest('hex')
  eq('서명 = HMAC-SHA256(date+METHOD+path+query) hex', a, `CEA algorithm=HmacSHA256, access-key=AK, signed-date=260928T060312Z, signature=${want}`)
  eq('Authorization에 Secret Key 없음', a.includes('SK,') || a.endsWith('SK'), false)
}

// ── 4. 오류 번역 ──
eq('403 Not allowed IP → IP 등록 안내', [C.translateCoupangError(403, '{"message":"Not allowed IP"}').code, C.translateCoupangError(403, 'Not allowed IP').message.includes('3.39.196.112'), C.translateCoupangError(403, 'Not allowed IP').message.includes('30분')], ['ip_not_allowed', true, true])
eq('403 Access denied → 잠시 막힘', C.translateCoupangError(403, 'Sorry! Access denied').code, 'access_denied')
eq('401 → 키 확인', C.translateCoupangError(401, '{"message":"Invalid signature"}').code, 'bad_key')
eq('중계 401 → 중계 설정', C.translateCoupangError(401, '{"error":"relay secret mismatch"}').code, 'relay_denied')
eq('429 → 잠시 후', C.translateCoupangError(429, '').code, 'rate_limited')
eq('400 → 쿠팡 문구 포함', C.translateCoupangError(400, '{"message":"필수값 누락"}').message.includes('필수값 누락'), true)
eq('네트워크 → 중계 연결 실패', C.translateCoupangError(0).code, 'relay_unreachable')
eq('원문 정리: 긴 hex 가림', C.scrubRaw(`sig=${'a'.repeat(64)} x`), 'sig=[hex] x')

// ── 5. 서킷 브레이커 ──
{
  let now = 0
  const b = C.createBreaker(() => now)
  for (let i = 0; i < 19; i++) b.recordError()
  eq('5초 안 오류 19건 = 아직 열림 아님', b.blockedFor(), 0)
  b.recordError()
  eq('20건째 → 10분 멈춤', b.blockedFor(), C.BREAKER_OPEN_MS)
  now = C.BREAKER_OPEN_MS + 1
  eq('10분 뒤 다시 통과', b.blockedFor(), 0)
  const b2 = C.createBreaker(() => now)
  for (let i = 0; i < 25; i++) { now += 300; b2.recordError() } // 5초 창에 17건쯤만
  eq('느리게 나는 오류(5초에 20건 미만)는 멈추지 않음', b2.blockedFor(), 0)
  const b3 = C.createBreaker(() => 0)
  for (let i = 0; i < 19; i++) b3.recordError()
  b3.recordOk()
  b3.recordError()
  eq('성공하면 오류 수 초기화', b3.blockedFor(), 0)
}

// ── 6. 템플릿 검증 ──
const PLACES = [
  { kind: 'outbound', place_code: '100', name: '출고지A', address: { zip: '61000', address: '광주', addressDetail: '1층', contact: '010-0000-0000' } },
  { kind: 'return', place_code: '200', name: '반품지A', address: { zip: '61000', address: '광주 북구', addressDetail: '1층', contact: '010-0000-0000', deliverCode: 'CJGLS', deliverName: 'CJ대한통운' } },
]
const T = { name: '기본', delivery_charge_type: 'FREE', delivery_charge: 0, free_ship_over_amount: 0, delivery_charge_on_return: 3000, return_charge: 3000, exchange_charge: 6000, outbound_shipping_time_day: 2, delivery_company_code: 'cjgls', outbound_place_code: '100', return_center_code: '200' }
{
  const v = C.validateTemplate(T, PLACES)
  eq('무료배송 템플릿 통과 · 택배사 대문자', [v.ok, v.value?.delivery_company_code, v.value?.remote_area_deliverable], [true, 'CJGLS', true])
  eq('조건부 무료 기준 100원 단위 아님 → 거절', C.validateTemplate({ ...T, delivery_charge_type: 'CONDITIONAL_FREE', delivery_charge: 3000, free_ship_over_amount: 30050 }, PLACES).ok, false)
  eq('조건부 무료 기준 30,000 → 통과', C.validateTemplate({ ...T, delivery_charge_type: 'CONDITIONAL_FREE', delivery_charge: 3000, free_ship_over_amount: 30000 }, PLACES).value?.free_ship_over_amount, 30000)
  eq('무료배송인데 배송비 있음 → 거절', C.validateTemplate({ ...T, delivery_charge: 3000 }, PLACES).ok, false)
  eq('초도배송비 > 반품비 150% → 거절', C.validateTemplate({ ...T, return_charge: 4600 }, PLACES).ok, false)
  eq('초도배송비 = 150% → 통과', C.validateTemplate({ ...T, return_charge: 4500 }, PLACES).ok, true)
  eq('없는 출고지 → 거절', C.validateTemplate({ ...T, outbound_place_code: '999' }, PLACES).ok, false)
  eq('음수 금액 → 거절', C.validateTemplate({ ...T, delivery_charge_on_return: -1 }, PLACES).ok, false)
  eq('이름 51자 → 거절', C.validateTemplate({ ...T, name: 'a'.repeat(51) }, PLACES).ok, false)
}

// ── 7. 카테고리 메타·상품 본문 ──
const META = { data: { isAllowSingleItem: true, attributes: [{ attributeTypeName: '색상', required: 'MANDATORY', exposed: 'EXPOSED', dataType: 'STRING' }, { attributeTypeName: '수량', required: 'OPTIONAL', exposed: 'NONE', basicUnit: '개' }], noticeCategories: [{ noticeCategoryName: '기타 재화', noticeCategoryDetailNames: [{ noticeCategoryDetailName: '품명 및 모델명', required: 'MANDATORY' }, { noticeCategoryDetailName: 'A/S', required: 'OPTIONAL' }] }] } }
{
  const s = C.summarizeCategoryMeta(META)
  eq('메타 요약: 필수 속성·고시', [s.attributes.map(a => [a.name, a.required]), s.notices[0].items.map(i => [i.name, i.required]), s.singleItem], [[['색상', true], ['수량', false]], [['품명 및 모델명', true], ['A/S', false]], true])
  eq('필수값 빠짐 목록', C.missingRequired(s, { attributes: {}, notices: {} }), ['옵션·속성 "색상"', '상품고시 "품명 및 모델명"'])
  eq('필수값 채우면 빈 목록', C.missingRequired(s, { attributes: { 색상: '블랙' }, notices: { '품명 및 모델명': '머그' } }), [])
}
const BASE = {
  account: { vendor_id: 'A00012345', seller_login_id: 'wingid' }, template: C.validateTemplate(T, PLACES).value, places: PLACES, categoryCode: '56137',
  productName: '매일 쓰는 머그', brand: '이유씨', items: [{ name: '블랙', originalPrice: 12000, salePrice: 9900, stock: 50, sku: 'MUG-BK', gtin: '', attributes: { 색상: '블랙' } }],
  notices: [{ noticeCategoryName: '기타 재화', noticeCategoryDetailName: '품명 및 모델명', content: '머그' }],
  repImageUrl: 'https://www.euchs.co.kr/api/marketplace?t=x', detailImageUrls: ['https://www.euchs.co.kr/api/marketplace?t=y'], saleStartedAt: '2026-09-28T00:00:00',
}
{
  const b = C.buildProductBody(BASE)
  eq('상품 본문 만들기 성공', b.ok, true)
  eq('requested:true · vendorId · vendorUserId', [b.body.requested, b.body.vendorId, b.body.vendorUserId], [true, 'A00012345', 'wingid'])
  eq('브랜드 = 상품 레벨 brand · 제조사 기본 = 브랜드', [b.body.brand, b.body.manufacture], ['이유씨', '이유씨'])
  eq('품번 = items[].externalVendorSku', b.body.items[0].externalVendorSku, 'MUG-BK')
  eq('GTIN 없음 → emptyBarcode true + 사유', [b.body.items[0].emptyBarcode, !!b.body.items[0].emptyBarcodeReason, 'barcode' in b.body.items[0]], [true, true, false])
  const g = C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], gtin: '8801234567893' }] })
  eq('GTIN 있음 → items[].barcode · emptyBarcode false', [g.body.items[0].barcode, g.body.items[0].emptyBarcode], ['8801234567893', false])
  eq('브랜드 없음 → 거절(자체브랜드명 안내)', [C.buildProductBody({ ...BASE, brand: '' }).ok, C.buildProductBody({ ...BASE, brand: '' }).message.includes('자체브랜드명')], [false, true])
  eq('브랜드에 띄어쓰기·특수문자 → 거절', [C.buildProductBody({ ...BASE, brand: '이유 씨' }).ok, C.buildProductBody({ ...BASE, brand: 'EU-C' }).ok], [false, false])
  eq('품번 없음 → 거절', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], sku: '' }] }).ok, false)
  eq('GTIN 형식 틀림 → 거절', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], gtin: '12ab' }] }).ok, false)
  eq('반품지 주소는 places에서', [b.body.returnCenterCode, b.body.returnZipCode, b.body.returnAddress, b.body.returnChargeName], ['200', '61000', '광주 북구', '반품지A'])
  eq('대표 이미지 + 상세 이미지 · 상세 내용', [b.body.items[0].images.map(i => i.imageType), b.body.items[0].contents[0].contentDetails.length], [['REPRESENTATION', 'DETAIL'], 1])
  eq('판매가 > 정가 → 거절', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], salePrice: 13000 }] }).ok, false)
  eq('가격 없음 → 거절 (임의 숫자로 채우지 않음)', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], salePrice: null, originalPrice: null }] }).ok, false)
  eq('재고 100000 → 거절', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], stock: 100000 }] }).ok, false)
  eq('본문에 키·서명 없음', /access[-_]?key|secret|signature|authorization/i.test(JSON.stringify(b.body)), false)
}
eq('쿠팡 상태 → 우리 상태', ['심사중', '승인대기중', '승인완료', '부분승인완료', '승인반려', '상품삭제', ''].map(C.mapCoupangStatus), ['approval_pending', 'approval_pending', 'approved', 'approved', 'rejected', 'failed', 'approval_pending'])
eq('출고지·반품지 정리', [C.normalizeOutbound([{ outboundShippingPlaceCode: 100, shippingPlaceName: '창고', usable: true, placeAddresses: [{ addressType: 'ROADNAME', returnZipCode: '1', returnAddress: '주소', returnAddressDetail: '상세', companyContactNumber: '02' }] }])[0], C.normalizeReturnCenters([{ returnCenterCode: '200', shippingPlaceName: '반품', deliverCode: 'CJGLS', deliverName: 'CJ', placeAddresses: [] }])[0].address.deliverCode],
  [{ kind: 'outbound', place_code: '100', name: '창고', usable: true, address: { zip: '1', address: '주소', addressDetail: '상세', contact: '02' } }, 'CJGLS'])

// ── 8. handler (가짜 Supabase + 가짜 중계) ──
const UID = '11111111-1111-4111-8111-111111111111'
const PID = '22222222-2222-4222-8222-222222222222'
const EID = '44444444-4444-4444-8444-444444444444'
const db = { marketplace_accounts: [], marketplace_places: [], marketplace_templates: [], marketplace_sends: [], studio_exports: [], studio_images: [], studio_projects: [] }
const files = new Map()
let relay = { mode: 'ok', calls: [] }
let seq = 0
const newId = () => `${String(++seq).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
function jpg(w, h) { return Buffer.from([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xFF, 0xD9]) }
function match(row, q) {
  for (const [k, v] of new URLSearchParams(q)) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue
    if (v.startsWith('eq.')) { if (String(row[k]) !== v.slice(3)) return false }
    else if (v === 'not.is.null') { if (row[k] == null) return false }
    else if (v.startsWith('in.(')) { if (!v.slice(4, -1).split(',').includes(String(row[k]))) return false }
  }
  return true
}
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const method = opts.method || 'GET'
  if (u.host === 'relay.local') {
    relay.calls.push({ path: u.pathname, query: u.search, method, headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : null })
    if (opts.headers['x-relay-secret'] !== 'test-relay-secret') return json({ error: 'relay secret mismatch' }, 401)
    if (relay.mode === 'ip') return json({ code: 403, message: 'Not allowed IP' }, 403)
    if (relay.mode === 'reject' && method === 'POST' && u.pathname.endsWith('/seller-products')) return json({ code: 'ERROR', message: '카테고리 필수 속성 누락' }, 400)
    const p = u.pathname.replace(/^\/coupang/, '')
    if (p === C.PATHS.outbound) return json({ content: [{ outboundShippingPlaceCode: 100, shippingPlaceName: '출고지A', usable: true, placeAddresses: [{ addressType: 'ROADNAME', returnZipCode: '61000', returnAddress: '광주', returnAddressDetail: '1층', companyContactNumber: '010' }] }] })
    if (p === C.PATHS.returnCenters('A00012345')) return json({ code: 200, data: { content: [{ returnCenterCode: '200', shippingPlaceName: '반품지A', deliverCode: 'CJGLS', deliverName: 'CJ대한통운', usable: true, placeAddresses: [{ addressType: 'ROADNAME', returnZipCode: '61000', returnAddress: '광주 북구', returnAddressDetail: '1층', companyContactNumber: '010' }] }] } })
    if (p === C.PATHS.predict) return json({ code: 200, data: { autoCategorizationPredictionResultType: 'SUCCESS', predictedCategoryId: '56137', predictedCategoryName: '머그컵' } })
    if (p === C.PATHS.categoryMeta('56137')) return json({ code: 'SUCCESS', ...META })
    if (p === C.PATHS.products && method === 'POST') return json({ code: 'SUCCESS', message: '', data: 1234567890 })
    if (p === C.PATHS.product('1234567890')) return json({ code: 'SUCCESS', data: { statusName: relay.status || '승인대기중' } })
    if (p === C.PATHS.histories('1234567890')) return json({ code: 'SUCCESS', data: [{ status: '승인요청', comment: '' }, { status: '승인반려', comment: '대표 이미지에 글자가 있습니다' }] })
    return json({ message: 'no route' }, 404)
  }
  const p = decodeURIComponent(u.pathname)
  if (p === '/auth/v1/user') return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'admin@test.local' }) : json({ msg: 'bad' }, 401)
  if (p === '/rest/v1/user_roles') return json([{ role: 'admin' }])
  if (p === '/rest/v1/profiles') return json([])
  if (p.startsWith('/storage/v1/object/sign/')) return json({ signedURL: `/object/sign/${p.slice(24)}?token=t` })
  if (p.startsWith('/storage/v1/object/studio/')) {
    const key = p.slice('/storage/v1/object/studio/'.length)
    if (method === 'POST') { files.set(key, Buffer.from(opts.body)); return json({ Key: key }) }
    return files.has(key) ? new Response(files.get(key), { status: 200 }) : json({ statusCode: '404', error: 'not_found' }, 400)
  }
  const table = p.replace('/rest/v1/', '')
  const rows = db[table]
  if (!rows) return json({ message: 'no table' }, 404)
  const body = opts.body ? JSON.parse(opts.body) : null
  if (method === 'GET') return json(rows.filter(r => match(r, u.search)))
  if (method === 'POST') {
    const list = (Array.isArray(body) ? body : [body]).map(b => ({ id: newId(), created_at: new Date().toISOString(), ...b }))
    for (const n of list) {
      if (table === 'marketplace_accounts') { const i = rows.findIndex(r => r.user_id === n.user_id && r.market === n.market); if (i >= 0) { rows[i] = { ...rows[i], ...n, id: rows[i].id }; continue } }
      if (table === 'marketplace_templates' && rows.some(r => r.user_id === n.user_id && r.name === n.name)) return json({ message: 'duplicate' }, 409)
      rows.push(n)
    }
    return json(list, 201)
  }
  if (method === 'PATCH') { const hit = rows.filter(r => match(r, u.search)); hit.forEach(r => Object.assign(r, body)); return json(hit) }
  if (method === 'DELETE') { db[table] = rows.filter(r => !match(r, u.search)); return new Response(null, { status: 204 }) }
  return json({ message: 'unsupported' }, 400)
}
function mockRes() {
  const r = { statusCode: 0, body: null, headers: {}, raw: null }
  r.status = c => { r.statusCode = c; return { json: b => { r.body = b } } }
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v }
  r.end = b => { r.raw = b }
  return r
}
async function post(action, body = {}, token = 'good-token') {
  const res = mockRes()
  await quiet(() => handler({ method: 'POST', url: '/api/marketplace', headers: { authorization: `Bearer ${token}` }, body: { action, ...body } }, res))
  return res
}
const CONNECT = { seller_login_id: 'wingid', vendor_id: 'A00012345', access_key: 'fake-access-key-WXYZ', secret_key: 'fake-secret-key-0000', expires_at: new Date(Date.now() + 170 * 86400000).toISOString().slice(0, 10) }

{
  eq('로그인 없음 → 401 (studioGuard)', (await post('status', {}, 'bad')).statusCode, 401)
  const s0 = await post('status')
  eq('연결 전 status', [s0.statusCode, s0.body.connected, s0.body.ready, s0.body.relayIp], [200, false, { enc: true, relay: true }, '3.39.196.112'])

  // 중계 비밀 없음 → 명확한 오류, 저장 안 함
  const keep = process.env.MARKETPLACE_RELAY_SECRET
  process.env.MARKETPLACE_RELAY_SECRET = ''
  const n = await post('connect', CONNECT)
  eq('중계 비밀 없음 → relay_not_configured · 저장 안 함', [n.statusCode, n.body.code, db.marketplace_accounts.length], [502, 'relay_not_configured', 0])
  eq('중계 비밀 없을 때 status.ready.relay = false', (await post('status')).body.ready.relay, false)
  process.env.MARKETPLACE_RELAY_SECRET = keep

  relay.mode = 'ip'
  const ip = await post('connect', CONNECT)
  eq('403 Not allowed IP → 안내 문구 · 저장 안 함', [ip.body.code, ip.body.message.includes('3.39.196.112'), db.marketplace_accounts.length], ['ip_not_allowed', true, 0])
  relay.mode = 'ok'

  eq('업체코드 형식 틀림 → 400', (await post('connect', { ...CONNECT, vendor_id: 'A-1' })).statusCode, 400)
  eq('유효기간 181일 넘음 → 400', (await post('connect', { ...CONNECT, expires_at: new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10) })).statusCode, 400)

  relay.calls = []
  const c = await post('connect', CONNECT)
  const row = db.marketplace_accounts[0]
  eq('연결 성공 → connected · 출고지1 반품지1', [c.statusCode, c.body.connected, c.body.places.map(p => p.kind).sort()], [200, true, ['outbound', 'return']])
  eq('DB에는 암호문만 (v1:) · 끝 4자리', [row.access_key_enc.startsWith('v1:'), row.secret_key_enc.startsWith('v1:'), row.key_last4, JSON.stringify(row).includes('fake-secret-key'), JSON.stringify(row).includes('fake-access-key')], [true, true, 'WXYZ', false, false])
  eq('응답에 키·암호문 없음', /fake-(access|secret)-key|_enc|v1:/.test(JSON.stringify(c.body)), false)
  eq('중계 호출: /coupang + 쿠팡 path · CEA 서명 · 비밀 헤더', [relay.calls[0].path, relay.calls[0].headers.Authorization.startsWith('CEA algorithm=HmacSHA256, access-key=fake-access-key-WXYZ, signed-date='), relay.calls[0].headers['x-relay-secret'], relay.calls[0].headers['X-Requested-By']], [`/coupang${C.PATHS.outbound}`, true, 'test-relay-secret', 'A00012345'])
  {
    const call = relay.calls[0]
    const date = /signed-date=(\w+)/.exec(call.headers.Authorization)[1]
    const want = crypto.createHmac('sha256', 'fake-secret-key-0000').update(`${date}GET${C.PATHS.outbound}pageNum=1&pageSize=50`).digest('hex')
    eq('서명 path = 쿠팡 원래 path ("/coupang" 제외)', call.headers.Authorization.endsWith(`signature=${want}`), true)
  }

  // 키 교체 = 같은 행 갱신
  await post('connect', { ...CONNECT, access_key: 'fake-access-key-NEW1' })
  eq('키 교체 → 행 1개 그대로 · 끝 4자리 바뀜', [db.marketplace_accounts.length, db.marketplace_accounts[0].key_last4], [1, 'NEW1'])

  // 템플릿
  eq('템플릿 규칙 위반 → 400 template_invalid', (await post('template_save', { template: { ...T, free_ship_over_amount: 50, delivery_charge_type: 'CONDITIONAL_FREE', delivery_charge: 3000 } })).body.code, 'template_invalid')
  const ts = await post('template_save', { template: { ...T, is_default: true } })
  eq('템플릿 저장', [ts.statusCode, ts.body.template.name, db.marketplace_templates[0].user_id], [200, '기본', UID])
  eq('같은 이름 → 409', (await post('template_save', { template: T })).statusCode, 409)
  const tid = ts.body.template.id
  const tu = await post('template_save', { template: { ...T, id: tid, name: '기본2' } })
  eq('템플릿 수정', [tu.statusCode, db.marketplace_templates[0].name], [200, '기본2'])
  eq('템플릿 목록', (await post('templates_list')).body.templates.length, 1)

  // 보내기 준비
  db.studio_projects.push({ id: PID, user_id: UID, title: '머그' })
  db.studio_exports.push({ id: EID, user_id: UID, project_id: PID, folder: `${UID}/${PID}/exports/20260928-090312-ab12`, title: '매일 쓰는 머그', format: 'jpg', mode: 'sections', files: [{ key: '01', name: 'a_01.jpg', path: `${UID}/${PID}/exports/20260928-090312-ab12/01.jpg`, width: 780, height: 900, bytes: 10 }] })
  db.studio_images.push({ id: newId(), user_id: UID, project_id: PID, original_path: `${UID}/${PID}/orig/x.jpg`, width: 800, height: 800, sort_order: 0, included: true, ingest_status: 'done' })
  files.set(`${UID}/${PID}/exports/20260928-090312-ab12/01.jpg`, jpg(780, 900))
  const sp = await post('send_prepare', { exportId: EID })
  eq('보내기 준비: 완성작·사진·템플릿', [sp.statusCode, sp.body.connected, sp.body.export.files.length, sp.body.images.length, sp.body.templates.length], [200, true, 1, 1, 1])
  eq('남의/없는 완성작 → 404', (await post('send_prepare', { exportId: '55555555-5555-4555-8555-555555555555' })).statusCode, 404)
  eq('카테고리 추천', (await post('category_predict', { productName: '머그' })).body, { result: 'SUCCESS', categoryCode: '56137', categoryName: '머그컵' })
  eq('카테고리 메타', (await post('category_meta', { categoryCode: '56137' })).body.attributes.length, 2)

  // 보내기
  const SEND = { exportId: EID, templateId: tid, categoryCode: '56137', categoryName: '머그컵', productName: '매일 쓰는 머그', brand: '이유씨', items: BASE.items, notices: BASE.notices, repImage: { dataBase64: jpg(1000, 1000).toString('base64') } }
  eq('대표 이미지 정사각형 아님 → 400', (await post('send', { ...SEND, repImage: { dataBase64: jpg(1000, 800).toString('base64') } })).body.code, 'rep_image_invalid')
  eq('대표 이미지 499px → 400', (await post('send', { ...SEND, repImage: { dataBase64: jpg(499, 499).toString('base64') } })).body.code, 'rep_image_invalid')
  const before = db.marketplace_sends.length
  const miss = await post('send', { ...SEND, items: [{ ...BASE.items[0], attributes: {} }] })
  eq('카테고리 필수 속성 빠짐 → 400 required_missing · 기록 안 만듦', [miss.body.code, miss.body.message.includes('색상'), db.marketplace_sends.length], ['required_missing', true, before])
  const nb = await post('send', { ...SEND, brand: '' })
  eq('브랜드 없음 → 400 · 실패 기록', [nb.statusCode, db.marketplace_sends.at(-1).status], [400, 'failed'])

  relay.calls = []
  const ok = await post('send', SEND)
  const sent = db.marketplace_sends.at(-1)
  eq('보내기 성공 → 승인 대기 · 쿠팡 상품 ID', [ok.statusCode, ok.body.status, ok.body.sellerProductId, sent.status, !!sent.approval_requested_at], [200, 'approval_pending', '1234567890', 'approval_pending', true])
  eq('기록(request_json)에 키·서명·비밀 없음', /fake-(access|secret)-key|signature|x-relay-secret|test-relay-secret|CEA /i.test(JSON.stringify(sent)), false)
  const created = relay.calls.find(c => c.method === 'POST' && c.path.endsWith('/seller-products'))
  const vp = created.body.items[0].images[0].vendorPath
  eq('이미지 주소 = 우리 도메인 짧은 주소 (200자 이하)', [vp.startsWith('https://www.euchs.co.kr/api/marketplace?t='), vp.length <= 200, created.body.items[0].contents[0].contentDetails[0].content.length <= 200], [true, true, true])
  eq('상품 생성은 X-EXTENDED-TIMEOUT', created.headers['X-EXTENDED-TIMEOUT'], '90000')

  // 이미지 전달 (GET, 로그인 없음)
  const get = async t => { const res = mockRes(); await quiet(() => handler({ method: 'GET', url: `/api/marketplace?t=${t}`, headers: {} }, res)); return res }
  const img = await get(vp.split('t=')[1])
  eq('이미지 전달: 200 · image/jpeg · 바이트 그대로 (302 아님)', [img.statusCode, img.headers['content-type'], Buffer.isBuffer(img.raw) && img.raw.equals(jpg(1000, 1000))], [200, 'image/jpeg', true])
  eq('상세 이미지(완성작 01)도 전달', (await get(created.body.items[0].contents[0].contentDetails[0].content.split('t=')[1])).raw.equals(jpg(780, 900)), true)
  eq('토큰 없음·위조 → 404', [(await get('')).statusCode, (await get(vp.split('t=')[1].replace('.rep.', '.01.'))).statusCode], [404, 404])

  // 쿠팡 거절
  relay.mode = 'reject'
  const rj = await post('send', SEND)
  eq('쿠팡 400 → 실패 기록 + 쿠팡 문구', [rj.body.code, rj.body.message.includes('카테고리 필수 속성 누락'), db.marketplace_sends.at(-1).status], ['coupang_rejected', true, 'failed'])
  relay.mode = 'ok'

  // 처리현황·동기화
  eq('처리현황 목록', (await post('sends_list')).body.sends.map(s => s.status).sort(), ['approval_pending', 'failed', 'failed'])
  relay.status = '승인반려'
  const sy = await post('sync')
  const rejected = sy.body.sends.find(s => s.sellerProductId === '1234567890')
  eq('동기화: 승인반려 + 사유(histories.comment 원문)', [rejected.status, rejected.coupangStatus, rejected.reason], ['rejected', '승인반려', '대표 이미지에 글자가 있습니다'])
  relay.status = '승인완료'
  eq('동기화: 승인완료', (await post('sync')).body.sends.find(s => s.sellerProductId === '1234567890').status, 'approved')
  eq('처리현황 응답에 request_json 원문 없음', 'request_json' in (await post('sends_list')).body.sends[0], false)

  // 해제
  await post('disconnect')
  eq('연결 해제: 계정·출고지·템플릿 삭제, 전송 기록은 남김', [db.marketplace_accounts.length, db.marketplace_places.length, db.marketplace_templates.length, db.marketplace_sends.length], [0, 0, 0, 3])
  eq('해제 뒤 보내기 → not_connected', (await post('send', SEND)).body.code, 'not_connected')
  eq('모르는 action → 400', (await post('nope')).statusCode, 400)
}

// ── 9. 코드 규칙 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const server = ['api/marketplace.js', 'api/_coupang.js', 'api/_marketplaceCrypto.js'].map(read).join('\n')
  eq('서버: 키를 로그로 찍지 않음 (console에 accessKey·secretKey·encKey 없음)', /console\.\w+\([^)]*(accessKey|secretKey|access_key|secret_key|encKey|relaySecret)/.test(server), false)
  eq('서버: 시크릿 하드코딩 없음 (환경변수로만)', /MARKETPLACE_(ENC_KEY|RELAY_SECRET)\s*=\s*['"]/.test(server), false)
  eq('서버: 모든 POST는 studioGuard 뒤', /const ctx = await studioGuard\(req, res\)\s*\n\s*if \(!ctx\) return/.test(read('api/marketplace.js')), true)
  const client = ['src/lib/studioMarketplace.js', 'src/views/studio/StudioMarketplaceView.vue', 'src/components/studio/StudioSendModal.vue', 'src/components/studio/StudioMarketplaceGuide.vue', 'src/components/studio/StudioShippingTemplates.vue', 'src/components/studio/StudioSendList.vue'].map(read).join('\n')
  eq('화면: VITE_ 시크릿·Tailwind dark: 없음', [/VITE_MARKETPLACE|import\.meta\.env\.[A-Z_]*(KEY|SECRET)/.test(client), /\sdark:/.test(client)], [false, false])
  const guide = read('src/components/studio/StudioMarketplaceGuide.vue')
  eq('가이드: 캡처 5장 · "[추가] 버튼" 강조 2곳(04·05) · IP 복사', [[1, 2, 3, 4, 5].every(n => guide.includes(`/studio-guide/coupang/0${n}.png`) && fs.existsSync(new URL(`../public/studio-guide/coupang/0${n}.png`, import.meta.url))), (guide.match(/반드시 \[추가\] 버튼/g) || []).length, guide.includes("label: 'IP'")], [true, 2, true])
  const modal = read('src/components/studio/StudioSendModal.vue')
  eq('보내기 창: 브랜드·품번 필수, GTIN 선택', [/브랜드 \*/.test(modal), /품번 \*/.test(modal), /GTIN\(바코드, 선택\)/.test(modal), /자체브랜드명/.test(modal)], [true, true, true, true])
  eq('라우트·메뉴: studio-marketplace (STUDIO_PROTECTED)', [/name: 'studio-marketplace',[\s\S]*?meta: \{ \.\.\.STUDIO_PROTECTED/.test(read('src/router/index.js')), /name: 'studio-marketplace', label: '판매처 연결'/.test(read('src/layouts/StudioLayout.vue'))], [true, true])
  eq('판매처 화면: 로그아웃 구독', /euchs-auth-changed/.test(read('src/views/studio/StudioMarketplaceView.vue')), true)
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
