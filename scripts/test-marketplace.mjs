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
process.env.TRANSLATION_CACHE_ENABLED = 'true' // 번역 캐시 "조회"만 (가짜 표) — 번역 API는 부르지 않는다

const { loadEncKey, encryptSecret, decryptSecret, makeImageToken, verifyImageToken } = await import('../api/_marketplaceCrypto.js')
const C = await import('../api/_coupang.js')
const F = await import('../api/_coupangFields.js')
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
{
  // 고객 문구에 내부 사정 없음 — 쿠팡·중계가 줄 수 있는 상태를 모두 번역해 본다
  const BAN = /관리자|서버|암호화|키 설정|환경변수|중계|relay|ENC_KEY/i
  const all = [[0, ''], [401, 'relay secret mismatch'], [401, 'Invalid signature'], [403, 'Not allowed IP'], [403, 'Access denied'], [403, 'vendor'], [403, 'x'], [404, ''], [429, ''], [400, ''], [500, ''], [503, ''], [418, '']]
  eq('오류 번역: 고객 문구에 내부 용어 없음', all.map(([s, t]) => C.translateCoupangError(s, t).message).filter(m => BAN.test(m)), [])
  eq('우리 쪽 준비 문제 = 같은 문구', [...new Set([C.translateCoupangError(0).message, C.translateCoupangError(401, 'relay secret mismatch').message])], ['지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'])
  eq('IP 미등록: 고객이 직접 확인하는 안내', C.translateCoupangError(403, 'Not allowed IP').message, '쿠팡 Wing에 IP 3.39.196.112가 등록됐는지 확인해 주세요. 등록 후 최대 30분 뒤 반영돼요.')
}
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
// 인증·구비서류·택1 묶음이 있는 카테고리 (항목 보강 테스트용)
const META2 = { data: {
  isAllowSingleItem: false, allowedOfferConditions: ['NEW'],
  attributes: [
    { attributeTypeName: '색상', required: 'MANDATORY', exposed: 'EXPOSED', dataType: 'STRING', groupNumber: 'NONE' },
    { attributeTypeName: '사이즈', required: 'MANDATORY', exposed: 'EXPOSED', dataType: 'STRING', groupNumber: '1' },
    { attributeTypeName: '신발 사이즈', required: 'MANDATORY', exposed: 'EXPOSED', dataType: 'NUMBER', basicUnit: 'mm', usableUnits: ['mm', 'cm'], groupNumber: '1' },
    { attributeTypeName: '소재', required: 'OPTIONAL', exposed: 'NONE', dataType: 'STRING', groupNumber: 'NONE' },
  ],
  noticeCategories: [
    { noticeCategoryName: '의류', noticeCategoryDetailNames: [{ noticeCategoryDetailName: '제품 소재', required: 'MANDATORY' }, { noticeCategoryDetailName: '제조국', required: 'MANDATORY' }] },
    { noticeCategoryName: '구두/신발', noticeCategoryDetailNames: [{ noticeCategoryDetailName: '치수', required: 'MANDATORY' }, { noticeCategoryDetailName: '제조국(원산지)', required: 'MANDATORY' }, { noticeCategoryDetailName: 'A/S 책임자와 전화번호', required: 'OPTIONAL' }] },
  ],
  requiredDocumentNames: [{ templateName: '수입신고필증', required: 'MANDATORY_OVERSEAS_PURCHASED' }, { templateName: '병행수입 확인서', required: 'MANDATORY_PARALLEL_IMPORTED' }, { templateName: '기타서류', required: 'OPTIONAL' }],
  certifications: [{ certificationType: 'NOT_REQUIRED', name: '인증대상아님', dataType: 'NONE', required: 'OPTIONAL' }, { certificationType: 'KC_HOUSEHOLD_CONFIRM', name: '생활용품 안전확인', dataType: 'CODE', required: 'MANDATORY' }, { certificationType: 'PRESENTED_IN_DETAIL_PAGE', name: '상세페이지 별도표기', dataType: 'NONE', required: 'OPTIONAL' }],
} }
// OneBound item_get 원본 모양 (1688에서 가져온 작업의 저장된 상품 정보)
const ITEM_1688 = {
  title: '女士拖鞋', props: [{ name: '材质', value: 'EVA' }],
  props_list: { '0:0': '颜色:黑色', '0:1': '颜色:白色', '1:0': '尺码:36-37' },
  props_img: { '0:0': '//cbu01.alicdn.com/img/ibank/O1CN01black.jpg_.webp', '0:1': '//cbu01.alicdn.com/img/ibank/O1CN01white.jpg' },
  skus: { sku: [
    { sku_id: '5001', properties: '0:0;1:0', price: '12.50', quantity: 120 },
    { sku_id: '5002', properties: '0:1;1:0', price: '13.00', quantity: 0 },
    { sku_id: '5003', properties: '', properties_name: '0:0:颜色:黑色;1:9:尺码:40-41', price: '', quantity: '5' },
  ] },
}
const BASE = {
  account: { vendor_id: 'A00012345', seller_login_id: 'wingid' }, template: C.validateTemplate(T, PLACES).value, places: PLACES, categoryCode: '56137', saleMode: 'domestic',
  productName: '매일 쓰는 머그', brand: '이유씨', brandId: 'KR-77', items: [{ name: '블랙', originalPrice: 12000, salePrice: 9900, stock: 50, sku: 'MUG-BK', gtin: '', attributes: { 색상: '블랙' } }],
  notices: [{ noticeCategoryName: '기타 재화', noticeCategoryDetailName: '품명 및 모델명', content: '머그' }],
  repImageUrl: 'https://www.euchs.co.kr/api/marketplace?t=x', detailImageUrls: ['https://www.euchs.co.kr/api/marketplace?t=y'], saleStartedAt: '2026-09-28T00:00:00',
}
{
  const b = C.buildProductBody(BASE)
  eq('상품 본문 만들기 성공', b.ok, true)
  eq('requested:true · vendorId · vendorUserId', [b.body.requested, b.body.vendorId, b.body.vendorUserId], [true, 'A00012345', 'wingid'])
  eq('브랜드 = 상품 레벨 brand + brandId · 제조사는 비우면 안 보냄', [b.body.brand, b.body.brandId, 'manufacture' in b.body], ['이유씨', 'KR-77', false])
  eq('품번 = items[].externalVendorSku', b.body.items[0].externalVendorSku, 'MUG-BK')
  eq('GTIN 없음 → emptyBarcode true + 사유', [b.body.items[0].emptyBarcode, !!b.body.items[0].emptyBarcodeReason, 'barcode' in b.body.items[0]], [true, true, false])
  const g = C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], gtin: '8801234567893' }] })
  eq('GTIN 있음 → items[].barcode · emptyBarcode false', [g.body.items[0].barcode, g.body.items[0].emptyBarcode], ['8801234567893', false])
  eq('브랜드 없음 → 통과 · brand·brandId·manufacture를 보내지 않음', (() => { const r = C.buildProductBody({ ...BASE, brand: '', brandId: '' }); return [r.ok, 'brand' in r.body, 'brandId' in r.body, 'manufacture' in r.body] })(), [true, false, false, false])
  eq('브랜드 이름만 있고 brandId가 없음·이상함 → 거절', [C.buildProductBody({ ...BASE, brandId: '' }).ok, C.buildProductBody({ ...BASE, brandId: 'a b' }).ok, C.buildProductBody({ ...BASE, brandId: '' }).message], [false, false, F.BRAND_NOT_FOUND])
  eq('브랜드 없음 + 제조사만 → 제조사만 보냄', (() => { const r = C.buildProductBody({ ...BASE, brand: '', brandId: '', manufacture: '이유씨컴퍼니' }); return [r.body.manufacture, 'brand' in r.body] })(), ['이유씨컴퍼니', false])
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
eq('출고지·반품지 정리', [C.normalizeOutbound([{ outboundShippingPlaceCode: 100, shippingPlaceName: '창고', usable: true, remoteInfos: [{ remoteInfoId: 1, deliveryCode: 'CJGLS', jeju: 5000, notJeju: 2500, usable: true }, { remoteInfoId: 2, deliveryCode: 'HANJIN', jeju: 1, notJeju: 1, usable: false }], placeAddresses: [{ addressType: 'ROADNAME', returnZipCode: '1', returnAddress: '주소', returnAddressDetail: '상세', companyContactNumber: '02' }] }])[0], C.normalizeReturnCenters([{ returnCenterCode: '200', shippingPlaceName: '반품', deliverCode: 'CJGLS', deliverName: 'CJ', placeAddresses: [] }])[0].address.deliverCode],
  [{ kind: 'outbound', place_code: '100', name: '창고', usable: true, address: { zip: '1', address: '주소', addressDetail: '상세', contact: '02', remote: [{ code: 'CJGLS', jeju: 5000, notJeju: 2500 }] } }, 'CJGLS'])

// ── 8. handler (가짜 Supabase + 가짜 중계) ──
const UID = '11111111-1111-4111-8111-111111111111'
const PID = '22222222-2222-4222-8222-222222222222'
const EID = '44444444-4444-4444-8444-444444444444'
const db = { marketplace_accounts: [], marketplace_places: [], marketplace_templates: [], marketplace_sends: [], studio_exports: [], studio_images: [], studio_projects: [], studio_product_snapshots: [], translation_cache: [] }
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
    else if (v.startsWith('in.(')) { if (!v.slice(4, -1).split(',').map(x => x.replace(/^"|"$/g, '')).includes(String(row[k]))) return false }
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
    if (p === C.PATHS.outbound) return json({ content: [{ outboundShippingPlaceCode: 100, shippingPlaceName: '출고지A', usable: true, remoteInfos: relay.remoteInfos || [{ remoteInfoId: 581487, deliveryCode: 'CJGLS', jeju: 5000, notJeju: 2500, usable: true }], placeAddresses: [{ addressType: 'ROADNAME', returnZipCode: '61000', returnAddress: '광주', returnAddressDetail: '1층', companyContactNumber: '010' }] }] })
    if (p === C.PATHS.returnCenters('A00012345')) return json({ code: 200, data: { content: [{ returnCenterCode: '200', shippingPlaceName: '반품지A', deliverCode: 'CJGLS', deliverName: 'CJ대한통운', usable: true, placeAddresses: [{ addressType: 'ROADNAME', returnZipCode: '61000', returnAddress: '광주 북구', returnAddressDetail: '1층', companyContactNumber: '010' }] }] } })
    if (p === C.PATHS.predict) return json({ code: 200, data: { autoCategorizationPredictionResultType: 'SUCCESS', predictedCategoryId: '56137', predictedCategoryName: '머그컵' } })
    if (p === C.PATHS.brandSearch && method === 'POST') {
      const name = JSON.parse(opts.body).brandName
      const B = (brandId, brandName) => ({ brandId, brandName, brandLogoUrl: '', isUIDRequired: false, allowedUIDTypes: [] })
      const items = name === '이유씨' ? [B('KR-77', '이유씨')] : name === '머그' ? [B('KR-1', '머그나라'), B('KR-2', '머그하우스')] : []
      return json({ code: 'SUCCESS', message: '', data: { page: 1, countPerPage: 10, totalCount: items.length, items } })
    }
    if (p === C.PATHS.categoryMeta('56137')) return json({ code: 'SUCCESS', ...META })
    if (p === C.PATHS.categoryMeta('77777')) return json({ code: 'SUCCESS', ...META2 })
    if (p === C.PATHS.products && method === 'POST') return json({ code: 'SUCCESS', message: '', data: 1234567890 })
    if (p === C.PATHS.products && method === 'PUT') return relay.mode === 'put-fail' ? json({ code: 'ERROR', message: '필수 속성 누락' }, 400) : json({ code: '200', message: '', data: { code: 'SUCCESS', message: '', data: 1234567890 } })
    if (p === C.PATHS.approval('1234567890') && method === 'PUT' && (relay.status || '승인대기중') !== '임시저장') return json({ code: 'ERROR', message: "'임시저장' 상태의 상품만 승인 요청 가능합니다." }, 400)
    if (p === C.PATHS.approval('1234567890') && method === 'PUT') return relay.mode === 'approval-fail' ? json({ code: 'ERROR', message: '상품 정보가 등록 또는 수정되고 있습니다. 잠시 후 다시 조회해 주시기 바랍니다.' }, 400) : json({ code: 'SUCCESS', message: '1234567890 승인 요청되었습니다.', data: '1234567890' })
    if (p === C.PATHS.product('1234567890')) return json({ code: 'SUCCESS', data: { sellerProductId: 1234567890, statusName: relay.status || '승인대기중', items: [{ sellerProductItemId: 777001, vendorItemId: null, itemName: '블랙', externalVendorSku: 'MUG-BK' }] } })
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
  eq('중계 비밀 없음 → 고객 문구는 준비 문제 한 줄만', n.body.message, C.NOT_READY_MESSAGE)
  {
    const keepEnc = process.env.MARKETPLACE_ENC_KEY
    process.env.MARKETPLACE_ENC_KEY = ''
    const e = await post('connect', CONNECT)
    eq('암호화 키 없음 → enc_not_ready · 같은 문구 · 저장 안 함', [e.statusCode, e.body.code, e.body.message, db.marketplace_accounts.length], [503, 'enc_not_ready', C.NOT_READY_MESSAGE, 0])
    process.env.MARKETPLACE_ENC_KEY = keepEnc
  }
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
  const SEND = { exportId: EID, templateId: tid, categoryCode: '56137', categoryName: '머그컵', saleMode: 'domestic', productName: '매일 쓰는 머그', brand: '이유씨', items: BASE.items, notices: BASE.notices, repImage: { dataBase64: jpg(1000, 1000).toString('base64') } }
  eq('대표 이미지 정사각형 아님 → 400', (await post('send', { ...SEND, repImage: { dataBase64: jpg(1000, 800).toString('base64') } })).body.code, 'rep_image_invalid')
  eq('대표 이미지 499px → 400', (await post('send', { ...SEND, repImage: { dataBase64: jpg(499, 499).toString('base64') } })).body.code, 'rep_image_invalid')
  const before = db.marketplace_sends.length
  const miss = await post('send', { ...SEND, items: [{ ...BASE.items[0], attributes: {} }] })
  eq('카테고리 필수 속성 빠짐 → 400 required_missing · 기록 안 만듦', [miss.body.code, miss.body.message.includes('색상'), db.marketplace_sends.length], ['required_missing', true, before])
  const nb = await post('send', { ...SEND, brand: '없는브랜드' })
  eq('쿠팡에 없는 브랜드 → 400 brand_not_found · 안내 문구 · 기록 안 만듦', [nb.statusCode, nb.body.code, nb.body.message, db.marketplace_sends.length], [400, 'brand_not_found', F.BRAND_NOT_FOUND, before])
  const nm = await post('send', { ...SEND, brand: '머그' })
  eq('같은 검색에 브랜드 여러 개 + 고르지 않음 → 400 brand_choose · 고르면(brandId) 통과 준비', [nm.statusCode, nm.body.code, (await post('send', { ...SEND, brand: '머그', brandId: 'KR-9' })).body.code], [400, 'brand_choose', 'brand_not_found'])
  eq('브랜드 찾기: 결과 목록 · 없으면 빈 목록 · 이름 없으면 400', [(await post('brand_search', { brandName: '머그' })).body.brands.map(x => [x.brandId, x.brandName]), (await post('brand_search', { brandName: '없는브랜드' })).body.brands, (await post('brand_search', { brandName: ' ' })).statusCode], [[['KR-1', '머그나라'], ['KR-2', '머그하우스']], [], 400])

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
  eq('처리현황 목록', (await post('sends_list')).body.sends.map(s => s.status).sort(), ['approval_pending', 'failed']) // 브랜드 확인은 기록을 만들기 전에 끝난다 (없는 브랜드는 기록 없음)
  relay.status = '승인반려'
  const sy = await post('sync')
  const rejected = sy.body.sends.find(s => s.sellerProductId === '1234567890')
  eq('동기화: 승인반려 + 사유(histories.comment 원문)', [rejected.status, rejected.coupangStatus, rejected.reason], ['rejected', '승인반려', '대표 이미지에 글자가 있습니다'])
  relay.status = '승인완료'
  eq('동기화: 승인완료', (await post('sync')).body.sends.find(s => s.sellerProductId === '1234567890').status, 'approved')
  eq('처리현황 응답에 request_json 원문 없음', 'request_json' in (await post('sends_list')).body.sends[0], false)

  // ── 17. 사진 주소 만료 (2026-09-29 운영: 창을 15분 넘게 열어 두면 "사진을 불러오지 못했어요 (HTTP 400)") — 보낼 때 서버가 원본을 직접 읽는다 ──
  {
    const { default: sharp } = await import('sharp')
    const im = db.studio_images[0]
    const before17 = files.get(im.original_path)
    // 가로로 긴 사진 1200×600: 위 절반 빨강 · 아래 절반 파랑
    files.set(im.original_path, await sharp({ create: { width: 1200, height: 600, channels: 3, background: { r: 0, g: 0, b: 200 } } }).composite([{ input: await sharp({ create: { width: 1200, height: 300, channels: 3, background: { r: 200, g: 0, b: 0 } } }).png().toBuffer(), top: 0, left: 0 }]).png().toBuffer())
    const px = async (buf, x, y) => [...(await sharp(buf).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer())].slice(0, 3)
    const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 14)
    const repOf = () => files.get([...files.keys()].filter(k => /\/marketplace\/[0-9a-f-]+_rep\.jpg$/.test(k)).at(-1))
    const realFetch = globalThis.fetch
    let signCalls = 0
    globalThis.fetch = (url, o) => { if (decodeURIComponent(new URL(url).pathname).startsWith('/storage/v1/object/sign/')) signCalls++; return realFetch(url, o) }
    const { repImage, ...NOIMG } = SEND
    const byId = await post('send', { ...NOIMG, repImageId: im.id, fit: 'contain' })
    const rep1 = repOf(), m1 = await sharp(rep1).metadata()
    eq('대표 이미지: 사진 id만 보내면 서버가 원본을 읽어 정사각형 1000 JPG로 만듦 (흰 여백으로 채우기)', [byId.statusCode, m1.format, m1.width, m1.height, near(await px(rep1, 500, 100), [255, 255, 255]), near(await px(rep1, 500, 400), [200, 0, 0]), near(await px(rep1, 500, 600), [0, 0, 200]), near(await px(rep1, 500, 900), [255, 255, 255])], [200, 'jpeg', 1000, 1000, true, true, true, true])
    await post('send', { ...NOIMG, repImageId: im.id, fit: 'cover' })
    eq('가운데 자르기: 흰 여백 없음', [near(await px(repOf(), 500, 100), [200, 0, 0]), near(await px(repOf(), 500, 900), [0, 0, 200])], [true, true])
    const opt = await post('send', { ...NOIMG, repImageId: im.id, optionImages: [{ key: 'r01', imageId: im.id }], items: [{ ...BASE.items[0], imageKey: 'r01' }] })
    const optFile = files.get([...files.keys()].filter(k => /\/marketplace\/[0-9a-f-]+_r01\.jpg$/.test(k)).at(-1))
    eq('옵션 사진도 사진 id로 — 서버가 만든 정사각형 1000 JPG', [opt.statusCode, (await sharp(optFile).metadata()).width, (await sharp(optFile).metadata()).height], [200, 1000, 1000])
    eq('보내는 동안 서명 주소를 쓰지 않음 (서버가 Storage에서 직접 읽음 — 만료될 주소가 없음)', signCalls, 0)
    globalThis.fetch = realFetch
    const n18 = db.marketplace_sends.length
    const other = newId()
    db.studio_images.push({ id: other, user_id: newId(), project_id: PID, original_path: im.original_path, width: 1, height: 1, sort_order: 9, included: true, ingest_status: 'done' })
    eq('없는 사진·남의 사진·이상한 id → 400 rep_image_invalid · 기록 안 만듦', [(await post('send', { ...NOIMG, repImageId: newId() })).body.code, (await post('send', { ...NOIMG, repImageId: other })).body.code, (await post('send', { ...NOIMG, repImageId: 'x' })).body.code, (await post('send', { ...NOIMG, repImageId: im.id, optionImages: [{ key: 'r01', imageId: newId() }] })).body.code, db.marketplace_sends.length], ['rep_image_invalid', 'rep_image_invalid', 'rep_image_invalid', 'rep_image_invalid', n18])
    db.studio_images.pop()
    eq('예전 방식(이미 만든 정사각형 JPG)도 그대로 받음', (await post('send', SEND)).statusCode, 200)
    const readSrc = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
    const cp17 = readSrc('src/components/studio/StudioSendCoupang.vue')
    eq('화면: 보낼 때 사진 주소로 사진을 받지 않음 · 사진 id만 보냄', [/makeSquareJpeg/.test(cp17), /imageOf\([^)]*\)\.url[^\n]*(fetch|dataBase64)/.test(cp17), cp17.includes('repImageId: v.repImageId, fit: v.fit, optionImages, searchTags: v.tags,'), cp17.includes('optionImages.push({ key, imageId: id })'), /dataBase64: await/.test(cp17.slice(cp17.indexOf('async function submit()')))], [false, false, true, true, false])
    eq('상세 이미지는 쿠팡이 받을 때 서버가 Storage에서 읽음 (서명 주소 아님)', [/storageDownload\(cfg, BUCKET, path\)/.test(readSrc('api/marketplace.js')), /storageSignDownload\([^)]*\)/.test(readSrc('api/marketplace.js').slice(readSrc('api/marketplace.js').indexOf('async function send('), readSrc('api/marketplace.js').indexOf('async function resend(')))], [true, false])
    if (before17) files.set(im.original_path, before17); else files.delete(im.original_path)
  }

  // ── 16. 고쳐서 다시 보내기 — 서버 (가짜 쿠팡) ──
  {
    const row = () => db.marketplace_sends.find(s => s.seller_product_id === '1234567890')
    const base = row()
    if (!base) { eq('다시 보낼 전송 기록이 있음', false, true) } else {
      const SEND2 = { ...SEND, exportId: undefined, productName: '매일 쓰는 머그 (고침)' }
      base.status = 'approval_pending'
      eq('반려가 아닌 전송은 다시 보낼 수 없음 → 409 not_rejected', [(await post('send_prepare', { resendId: base.id })).body.code, (await post('send', { ...SEND2, resendId: base.id })).body.code], ['not_rejected', 'not_rejected'])
      base.status = 'rejected'; base.reason = '도서산간배송 출고지에 등록된 택배사만 선택할 수 있습니다.'; base.coupang_status = '승인반려'
      const pre = await post('send_prepare', { resendId: base.id })
      eq('send_prepare(resendId): 그 전송의 값으로 채울 재료 · 같은 내 상품', [pre.statusCode, pre.body.resend.sendId, pre.body.resend.sellerProductId, pre.body.resend.reason, pre.body.resend.form.productName, pre.body.export.id === base.export_id], [200, base.id, '1234567890', base.reason, '매일 쓰는 머그', true])
      eq('남의 전송·없는 전송 → 404', (await post('send_prepare', { resendId: '99999999-9999-4999-8999-999999999999' })).statusCode, 404)
      const count = db.marketplace_sends.length
      const statusBefore = relay.status
      const REASON = base.reason
      const productCalls = () => relay.calls.map(c => [c.method, c.path.replace(/^\/coupang/, '')]).filter(c => c[1].includes('/seller-products'))
      const putOf = () => relay.calls.find(c => c.method === 'PUT' && c.path.endsWith('/seller-products'))
      const reject = () => { base.status = 'rejected'; base.reason = REASON; base.coupang_status = '승인반려' }

      // 쿠팡 상태 = 승인반려 (운영에서 거절된 경우) → 상품 수정 한 번(requested true), 승인 요청 API는 부르지 않는다
      relay.status = '승인반려'
      relay.calls = []
      relay.mode = 'put-fail'
      const bad = await post('send', { ...SEND2, resendId: base.id })
      eq('상품 수정 실패 → 기록은 "반려" 그대로 · 새 기록 없음 · 승인 요청을 부르지 않음 · 회차 이력 없음', [bad.statusCode, row().status, db.marketplace_sends.length, relay.calls.some(c => c.path.endsWith('/approvals')), (row().request_json.revisions || []).length], [502, 'rejected', count, false, 0])
      relay.calls = []
      relay.mode = 'ok'
      const ok2 = await post('send', { ...SEND2, resendId: base.id })
      const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
      eq('승인반려 상품: 상품 조회 → 상품 수정(PUT) 한 번 · 승인 요청 API·상품 생성(POST)은 부르지 않음', [productCalls(), relay.calls.some(c => c.path.endsWith('/approvals')), relay.calls.some(c => c.method === 'POST' && c.path.endsWith('/seller-products'))], [[['GET', C.PATHS.product('1234567890')], ['PUT', C.PATHS.products]], false, false])
      eq('승인반려 상품의 수정 본문: requested true · 같은 sellerProductId · 옵션 id · 고친 이름', [putOf().body.requested, putOf().body.sellerProductId, putOf().body.items[0].sellerProductItemId, putOf().body.items[0].vendorItemId, putOf().body.sellerProductName], [true, 1234567890, 777001, null, '매일 쓰는 머그 (고침)'])
      eq('성공: 같은 기록이 "승인 대기"로 · 반려 사유 지움 · 새 기록 없음 · 회차 이력(방법 = 수정 한 번)', [ok2.statusCode, ok2.body.resend, ok2.body.status, ok2.body.sendId === base.id, row().status, row().reason, db.marketplace_sends.length, row().request_json.revisions.map(r => [r.n, r.via, r.coupangStatus, r.approval, r.previousReason === REASON])], [200, true, 'approval_pending', true, 'approval_pending', null, count, [[1, 'modify', '승인반려', true, true]]])

      // 쿠팡 상태가 무엇이든 같은 길 — 상품 수정 한 번(requested true), 승인 요청 API는 부르지 않는다
      for (const st of ['임시저장', '승인완료', '부분승인완료', '']) {
        reject(); relay.status = st; relay.calls = []
        const rr = await post('send', { ...SEND2, resendId: base.id })
        eq(`쿠팡 상태 "${st || '(빈 값 → 승인대기중)'}": 수정 한 번(requested true) · 승인 요청 API 안 부름 · "승인 대기"`, [rr.statusCode, productCalls(), putOf().body.requested, relay.calls.some(c => c.path.endsWith('/approvals')), row().status], [200, [['GET', C.PATHS.product('1234567890')], ['PUT', C.PATHS.products]], true, false, 'approval_pending'])
      }
      eq('회차 이력: 전부 via "modify" · 새 기록 없음 · 그때의 쿠팡 상태를 적음', [row().request_json.revisions.map(r => [r.n, r.via, r.approval]), db.marketplace_sends.length, row().request_json.revisions.map(r => r.coupangStatus)], [[[1, 'modify', true], [2, 'modify', true], [3, 'modify', true], [4, 'modify', true], [5, 'modify', true]], count, ['승인반려', '임시저장', '승인완료', '부분승인완료', '승인대기중']])
      // 수정 API가 거절하면 쿠팡 문구 그대로 · 기록은 "반려" 그대로
      reject(); relay.status = '임시저장'; relay.calls = []; relay.mode = 'put-fail'
      const no = await post('send', { ...SEND2, resendId: base.id })
      eq('수정 API 거절 → 쿠팡 문구 그대로 · "반려" 그대로 · 회차 이력 안 늘어남 · 승인 요청 API 안 부름', [no.statusCode, no.body.code, no.body.message.includes('필수 속성 누락'), row().status, row().request_json.revisions.length, relay.calls.some(c => c.path.endsWith('/approvals'))], [502, 'coupang_rejected', true, 'rejected', 5, false])
      relay.mode = 'ok'
      eq('목록에 수정 회차가 보임', (await post('sends_list')).body.sends.find(s => s.id === base.id).revision, 5)
      eq('호출 경로에 승인 요청 API가 없음', [/PATHS\.approval\(/.test(read('api/marketplace.js')), /approval_failed/.test(read('api/marketplace.js'))], [false, false])
      relay.status = statusBefore
      base.status = 'approved' // 뒤 테스트를 위해 되돌림
      eq('키·서명이 기록에 없음', /access[-_]?key|secret|signature|authorization/i.test(JSON.stringify(row().request_json)), false)
    }
  }


  // ── 항목 보강 (coupang-fields) — 판매 방식·이름·태그·옵션 이미지·인증·구비서류 ──
  {
    const lastBody = () => relay.calls.filter(c => c.method === 'POST' && c.path.endsWith('/seller-products')).at(-1)?.body
    const n0 = db.marketplace_sends.length
    const nm = await post('send', { ...SEND, saleMode: undefined })
    eq('판매 방식 없음 → 400 sale_mode_missing · 기록 안 만듦 (기본값 없음)', [nm.statusCode, nm.body.code, db.marketplace_sends.length], [400, 'sale_mode_missing', n0])
    eq('판매 방식 이상한 값 → 400', (await post('send', { ...SEND, saleMode: 'overseas' })).body.code, 'sale_mode_missing')

    relay.calls = []
    const ag = await post('send', {
      ...SEND, saleMode: 'agent', outboundDays: 12, displayName: '이유씨 머그컵 세라믹', generalName: '머그컵 세라믹', modelNo: 'EU-MUG-01',
      searchTags: ['머그컵', '머그컵', '나이키 머그', '커피잔<b>', '가'.repeat(21), '홈카페'], advanced: { taxType: 'FREE', maxPerPerson: 3, maxPerPersonDays: 7 },
      optionImages: [{ key: 'r01', dataBase64: jpg(1000, 1000).toString('base64') }], items: [{ ...BASE.items[0], imageKey: 'r01' }],
    })
    const b = lastBody()
    eq('해외구매대행 보내기 성공', [ag.statusCode, ag.body.status], [200, 'approval_pending'])
    eq('해외구매대행: AGENT_BUY · OVERSEAS_PURCHASED · pccNeeded true · 출고 12일', [b.deliveryMethod, b.items[0].overseasPurchased, b.items[0].pccNeeded, b.items[0].outboundShippingTimeDay], ['AGENT_BUY', 'OVERSEAS_PURCHASED', true, 12])
    eq('등록상품명·노출상품명·제품명·모델번호', [b.sellerProductName, b.displayProductName, b.generalProductName, b.items[0].modelNo], ['매일 쓰는 머그', '이유씨 머그컵 세라믹', '머그컵 세라믹', 'EU-MUG-01'])
    eq('검색태그: 중복·남의 상표·21자 빼고 허용 밖 글자 정리', b.items[0].searchTags, ['머그컵', '커피잔 b', '홈카페'])
    eq('고급 설정: 면세 · 1인 7일에 3개 · 나머지 기본값', [b.items[0].taxType, b.items[0].maximumBuyForPerson, b.items[0].maximumBuyForPersonPeriod, b.items[0].adultOnly, b.items[0].parallelImported, b.items[0].offerCondition, b.unionDeliveryType], ['FREE', 3, 7, 'EVERYONE', 'NOT_PARALLEL_IMPORTED', 'NEW', 'NOT_UNION_DELIVERY'])
    const optUrl = b.items[0].images[0].vendorPath
    eq('옵션 대표 이미지 = 그 옵션의 주소(r01) · 200자 이하', [/\.r01\./.test(optUrl), optUrl.length <= 200], [true, true])
    eq('인증 안 고름 → NOT_REQUIRED 한 줄 · 구비서류 칸 없음', [b.items[0].certifications, 'requiredDocuments' in b], [[{ certificationType: 'NOT_REQUIRED', certificationCode: '' }], false])
    eq('옵션 이미지 저장됨', [...files.keys()].some(k => /\/marketplace\/[0-9a-f-]+_r01\.jpg$/.test(k)), true)
    eq('옵션 이미지 없는 key를 가리킴 → 400', (await post('send', { ...SEND, items: [{ ...BASE.items[0], imageKey: 'r09' }] })).statusCode, 400)
    eq('옵션 이미지 7장 → 400', (await post('send', { ...SEND, optionImages: Array.from({ length: 7 }, (_, i) => ({ key: `r0${i + 1}`, dataBase64: jpg(1000, 1000).toString('base64') })) })).statusCode, 400)
    eq('출고 소요일 31 → 400', (await post('send', { ...SEND, outboundDays: 31 })).statusCode, 400)
    eq('고급 설정 이상한 값 → 400', (await post('send', { ...SEND, advanced: { taxType: 'NONE' } })).statusCode, 400)

    // 인증·구비서류가 있는 카테고리 (77777)
    const pdf = Buffer.from('%PDF-1.4\n%test\n').toString('base64')
    const S2 = {
      ...SEND, categoryCode: '77777', saleMode: 'agent',
      items: [{ ...BASE.items[0], name: '블랙 250', attributes: { 색상: '블랙', '신발 사이즈': '250', 소재: '가죽' } }, { ...BASE.items[0], name: '블랙 260', sku: 'S-260', attributes: { 색상: '블랙', '신발 사이즈': '260' } }],
      notices: [{ noticeCategoryName: '구두/신발', noticeCategoryDetailName: '치수', content: '상세페이지 참조' }, { noticeCategoryName: '구두/신발', noticeCategoryDetailName: '제조국(원산지)', content: '중국' }],
    }
    const m1 = await post('send', S2)
    eq('필수 인증·구매대행 필수 서류가 비면 → required_missing', [m1.body.code, m1.body.message.includes('생활용품 안전확인'), m1.body.message.includes('수입신고필증'), m1.body.message.includes('병행수입 확인서')], ['required_missing', true, true, false])
    const m2 = await post('send', { ...S2, saleMode: 'domestic', advanced: { parallelImported: 'PARALLEL_IMPORTED' }, certifications: [{ type: 'KC_HOUSEHOLD_CONFIRM', code: '' }] })
    eq('국내 + 병행수입 → 병행수입 서류 필수 · 인증번호 빠짐', [m2.body.message.includes('병행수입 확인서'), m2.body.message.includes('수입신고필증'), m2.body.message.includes('인증번호')], [true, false, true])
    eq('고른 고시 분류(구두/신발)의 필수 항목으로 검사', (await post('send', { ...S2, notices: [S2.notices[0]], certifications: [{ type: 'KC_HOUSEHOLD_CONFIRM', code: 'CB061R001-0001' }], documents: [{ templateName: '수입신고필증', dataBase64: pdf }] })).body.message, '필수 항목이 비어 있어요: 상품고시 "제조국(원산지)"')
    eq('택1 묶음(사이즈 또는 신발 사이즈) 둘 다 비면 → 빠짐', (await post('send', { ...S2, items: [{ ...BASE.items[0], attributes: { 색상: '블랙' } }] })).body.message.includes('"사이즈" 또는 "신발 사이즈"'), true)
    eq('구비서류 형식이 다름 → 400 document_invalid', (await post('send', { ...S2, documents: [{ templateName: '수입신고필증', dataBase64: Buffer.from('hello').toString('base64') }] })).body.code, 'document_invalid')
    relay.calls = []
    const ok2 = await post('send', { ...S2, certifications: [{ type: 'KC_HOUSEHOLD_CONFIRM', code: 'CB061R001-0001' }], documents: [{ templateName: '수입신고필증', dataBase64: pdf }] })
    const b2 = lastBody()
    eq('인증·서류 채우면 보내기 성공', [ok2.statusCode, b2.items.length], [200, 2])
    eq('인증정보 = 고른 종류 + 인증번호', b2.items[0].certifications, [{ certificationType: 'KC_HOUSEHOLD_CONFIRM', certificationCode: 'CB061R001-0001' }])
    eq('구비서류 = templateName + 우리 도메인 주소(150자 이하)', [b2.requiredDocuments.length, b2.requiredDocuments[0].templateName, b2.requiredDocuments[0].vendorDocumentPath.startsWith('https://www.euchs.co.kr/api/marketplace?t='), b2.requiredDocuments[0].vendorDocumentPath.length <= 150], [1, '수입신고필증', true, true])
    eq('숫자 옵션 값에 단위 붙임 · 검색옵션은 exposed NONE', [b2.items[0].attributes.find(a => a.attributeTypeName === '신발 사이즈').attributeValueName, b2.items[0].attributes.find(a => a.attributeTypeName === '소재').exposed, 'exposed' in b2.items[0].attributes[0]], ['250mm', 'NONE', false])
    eq('고시 = 고른 분류 · 제조국', b2.items[0].notices.map(n => [n.noticeCategoryName, n.noticeCategoryDetailName, n.content]), [['구두/신발', '치수', '상세페이지 참조'], ['구두/신발', '제조국(원산지)', '중국']])
    const getDoc = async t => { const res = mockRes(); await quiet(() => handler({ method: 'GET', url: `/api/marketplace?t=${t}`, headers: {} }, res)); return res }
    const doc = await getDoc(b2.requiredDocuments[0].vendorDocumentPath.split('t=')[1])
    eq('구비서류 전달: 200 · application/pdf', [doc.statusCode, doc.headers['content-type']], [200, 'application/pdf'])
    eq('기록(request_json)에 키·서명·비밀 없음 (보강 뒤)', /fake-(access|secret)-key|signature|x-relay-secret|test-relay-secret|CEA /i.test(JSON.stringify(db.marketplace_sends.at(-1))), false)
    const dup = await post('send', { ...S2, certifications: [{ type: 'KC_HOUSEHOLD_CONFIRM', code: 'C' }], documents: [{ templateName: '수입신고필증', dataBase64: pdf }], items: [S2.items[0], { ...S2.items[0], name: '블랙 250 (2)', sku: 'S-2' }] })
    eq('구매옵션 값이 모두 같은 옵션 두 개 → 400', [dup.statusCode, dup.body.message.includes('구매옵션 값이 다른 옵션과 같아요')], [400, true])

    // 보내기 준비: 1688에서 가져온 작업이면 옵션 줄 + 번역 캐시의 한국어 (외부 호출 없음)
    eq('1688 작업이 아니면 source = null', (await post('send_prepare', { exportId: EID })).body.source, null)
    db.studio_projects[0].offer_id = '123456789012'
    db.studio_product_snapshots.push({ offer_id: '123456789012', status: 'ok', item: ITEM_1688 })
    db.translation_cache.push(...[['颜色', '색상'], ['黑色', '블랙'], ['尺码', '사이즈'], ['女士拖鞋', '여성 슬리퍼']].map(([source_text, translated_text]) => ({ source_lang: 'zh-CN', target_lang: 'ko', source_text, translated_text })))
    db.studio_images[0].source_url = 'https://cbu01.alicdn.com/img/ibank/O1CN01black.jpg'
    relay.calls = []
    const sp2 = await post('send_prepare', { exportId: EID })
    const src = sp2.body.source
    eq('source: 옵션 3줄 · 번역은 캐시에 있는 것만', [src.from, src.skus.length, src.skuTotal, src.title.ko, src.skus[0].values.map(v => [v.name.ko, v.value.ko]), src.skus[1].values[0].value], ['1688', 3, 3, '여성 슬리퍼', [['색상', '블랙'], ['사이즈', null]], { zh: '白色', ko: null }])
    eq('source: 가격은 1688 원본(위안) 그대로 · 가격 없는 줄은 null (임의 숫자 없음) · 재고 0은 0', [src.skus.map(s => s.priceCny), src.skus.map(s => s.stock)], [[12.5, 13, null], [120, 0, 5]])
    eq('source: 원화 가격 칸을 만들지 않음', /krw|salePrice|originalPrice/i.test(JSON.stringify(src)), false)
    eq('연결됨 send_prepare: markets.coupang.connected true', sp2.body.markets, { coupang: { connected: true } })
    eq('send_prepare는 쿠팡을 부르지 않음 · 사진에 sourceUrl', [relay.calls.length, sp2.body.images[0].sourceUrl, sp2.body.limits], [0, 'https://cbu01.alicdn.com/img/ibank/O1CN01black.jpg', { optionImages: 6, documents: 5, documentBytes: 3145728 }])
    eq('옵션 사진 맞추기: 1688 옵션 사진 → 작업 사진', [F.matchOptionImage(src.skus[0].imageUrl, sp2.body.images), F.matchOptionImage(src.skus[1].imageUrl, sp2.body.images)], [sp2.body.images[0].id, null])
  }

  // 해제
  const sendsBefore = db.marketplace_sends.length
  await post('disconnect')
  eq('연결 해제: 계정·출고지·템플릿 삭제, 전송 기록은 남김', [db.marketplace_accounts.length, db.marketplace_places.length, db.marketplace_templates.length, db.marketplace_sends.length, sendsBefore >= 3], [0, 0, 0, sendsBefore, true])
  eq('해제 뒤 보내기 → not_connected', (await post('send', SEND)).body.code, 'not_connected')
  {
    // 연결 전에도 보내기 창은 열린다 — 판매처 줄이 자물쇠 + [연결하기]로 보이게 markets를 준다
    const un = await post('send_prepare', { exportId: EID })
    eq('연결 전 send_prepare: 200 · markets.coupang.connected false', [un.statusCode, un.body.connected, un.body.markets], [200, false, { coupang: { connected: false } }])
    eq('보낸 상품 목록에 판매처(market)', [...new Set((await post('sends_list')).body.sends.map(s => s.market))], ['coupang'])
  }
  eq('모르는 action → 400', (await post('nope')).statusCode, 400)
}

// ── 9. 코드 규칙 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const server = ['api/marketplace.js', 'api/_coupang.js', 'api/_marketplaceCrypto.js'].map(read).join('\n')
  eq('서버: 키를 로그로 찍지 않음 (console에 accessKey·secretKey·encKey 없음)', /console\.\w+\([^)]*(accessKey|secretKey|access_key|secret_key|encKey|relaySecret)/.test(server), false)
  eq('서버: 시크릿 하드코딩 없음 (환경변수로만)', /MARKETPLACE_(ENC_KEY|RELAY_SECRET)\s*=\s*['"]/.test(server), false)
  eq('서버: 모든 POST는 studioGuard 뒤', /const ctx = await studioGuard\(req, res\)\s*\n\s*if \(!ctx\) return/.test(read('api/marketplace.js')), true)
  const client = ['src/lib/studioMarketplace.js', 'src/views/studio/StudioMarketplaceView.vue', 'src/components/studio/StudioSendModal.vue', 'src/components/studio/StudioSendCoupang.vue', 'src/components/studio/StudioMarketplaceGuide.vue', 'src/components/studio/StudioShippingTemplates.vue', 'src/components/studio/StudioSendList.vue'].map(read).join('\n')
  eq('화면: VITE_ 시크릿·Tailwind dark: 없음', [/VITE_MARKETPLACE|import\.meta\.env\.[A-Z_]*(KEY|SECRET)/.test(client), /\sdark:/.test(client)], [false, false])
  const guide = read('src/components/studio/StudioMarketplaceGuide.vue')
  eq('가이드: 캡처 5장 · "[추가] 버튼" 강조 2곳(04·05) · IP 복사', [[1, 2, 3, 4, 5].every(n => guide.includes(`/studio-guide/coupang/0${n}.png`) && fs.existsSync(new URL(`../public/studio-guide/coupang/0${n}.png`, import.meta.url))), (guide.match(/반드시 \[추가\] 버튼/g) || []).length, guide.includes("label: 'IP'")], [true, 2, true])
  const modal = read('src/components/studio/StudioSendCoupang.vue')
  eq('보내기 창: 브랜드는 선택("브랜드 없음" 기본 체크) · 품번 필수 · GTIN 선택', [/브랜드 \*/.test(modal), /data-mk-s-no-brand/.test(modal), /noBrand: true, brand: '', brandId: ''/.test(modal), /품번 \*/.test(modal), /GTIN\(바코드 숫자 8~14자리\)은 선택/.test(modal), /자체브랜드명/.test(modal)], [false, true, true, true, true, false])
  eq('판매처 화면: 로그아웃 구독', /euchs-auth-changed/.test(read('src/views/studio/StudioMarketplaceView.vue')), true)
}

// ── 10. 설정 메뉴·고객 문구·보낸 상품 (2026-09-28 ui-settings) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const router = read('src/router/index.js')
  const layout = read('src/layouts/StudioLayout.vue')
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  eq('설정 탭 2개 · 순서 (판매처 연결·배송·반품 템플릿은 [판매처]로 옮김)', R.SETTINGS_TABS.map(t => t.label), ['저장값', '용어집'])
  eq('설정 탭마다 라우트 (STUDIO_PROTECTED)', R.SETTINGS_TABS.map(t => new RegExp(`name: '${esc(t.route)}',[\\s\\S]{0,160}?meta: \\{ \\.\\.\\.STUDIO_PROTECTED`).test(router)), [true, true])
  eq('/studio/settings → 첫 탭', router.includes("path: '', name: 'studio-settings', redirect: { name: 'studio-settings-assets' }"), true)
  eq('예전 주소 2개(저장값·용어집) → 해당 탭으로 redirect', R.SETTINGS_TABS.filter(t => t.legacy).map(t => router.includes(`path: '${t.key}', name: '${t.legacy}', redirect: { name: '${t.route}' }`)), [true, true])
  // 판매처 메뉴 (2026-09-30) — 보내기 | 보낸 상품 | 기본 설정 | 연결
  eq('판매처 탭 4개 · 순서', R.CHANNEL_TABS.map(t => t.label), ['보내기', '보낸 상품', '기본 설정', '연결'])
  eq('판매처 탭마다 라우트 /studio/channels/<key> (누구나 구경 — STUDIO_PUBLIC)', R.CHANNEL_TABS.map(t => new RegExp(`path: '${t.key}',\\s*name: '${esc(t.route)}',[\\s\\S]{0,160}?meta: \\{ \\.\\.\\.STUDIO_PUBLIC`).test(router)), [true, true, true, true])
  eq('/studio/channels → [보내기] · 부모도 같은 meta', [router.includes("path: '', name: 'studio-channels', redirect: { name: 'studio-channels-send' }"), /path: 'channels',[\s\S]{0,120}?meta: \{ \.\.\.STUDIO_PUBLIC/.test(router)], [true, true])
  eq('[기본 설정] = StudioShippingView · [연결] = StudioMarketplaceView (그대로 재사용)', [/name: 'studio-channels-defaults',\s*component: \(\) => import\('\.\.\/views\/studio\/StudioShippingView\.vue'\)/.test(router), /name: 'studio-channels-connect',\s*component: \(\) => import\('\.\.\/views\/studio\/StudioMarketplaceView\.vue'\)/.test(router)], [true, true])
  eq('예전 주소 3개 → 판매처 탭으로 redirect (이름 유지)', [
    router.includes("{ path: 'marketplace', name: 'studio-settings-marketplace', redirect: { name: 'studio-channels-connect' } }"),
    router.includes("{ path: 'shipping', name: 'studio-settings-shipping', redirect: { name: 'studio-channels-defaults' } }"),
    router.includes("{ path: 'marketplace', name: 'studio-marketplace', redirect: { name: 'studio-channels-connect' } }"),
    R.CHANNEL_TABS.flatMap(t => (t.moved || []).map(n => new RegExp(`name: '${esc(n)}', redirect: \\{ name: '${esc(t.route)}' \\}`).test(router))).every(Boolean),
  ], [true, true, true, true])
  eq('예전 설정 화면에 판매처 라우트(컴포넌트) 없음', /name: 'studio-settings-(marketplace|shipping)',\s*component/.test(router), false)
  const menu = /const menuItems = \[([\s\S]*?)\n\]/.exec(layout)[1]
  eq('사이드바 메인 = 스튜디오 소개·내 작업·템플릿·판매처 4개', [...menu.matchAll(/label: '([^']+)'/g)].map(m => m[1]), ['스튜디오 소개', '내 작업', '템플릿', '판매처'])
  eq('사이드바 [판매처] = 탭 어디에서나 켜짐', [/name: 'studio-channels', label: '판매처', icon: Store, prefix: 'studio-channels'/.test(menu), /String\(route\.name \|\| ''\)\.startsWith\(item\.prefix\)/.test(layout)], [true, true])
  eq('사이드바 아래 [설정] 1개 (계정 영역 위)', [(layout.match(/name: 'studio-settings'/g) || []).length, layout.indexOf('data-studio-nav-settings') < layout.indexOf('<!-- 계정 -->')], [1, true])

  eq('설정 탭 "준비 중" 배지 = 저장값·용어집만', [R.SETTINGS_TABS.filter(t => t.soon).map(t => t.key), /v-if="t\.soon" class="st-badge[^"]*"[^>]*>준비 중</.test(read('src/views/studio/StudioSettingsView.vue'))], [['assets', 'glossary'], true])
  {
    // 스튜디오 공통 오류 문구 (merge-before-push) — 주석을 뺀 문구 전체에 내부 사정·오류 코드가 없어야 한다
    const api = read('src/lib/studioApi.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/console\.error\(.*\)/g, '')
    eq('스튜디오 오류 문구에 "관리자·알 수 없는 오류·코드:·서버 설정" 없음', /관리자|알 수 없는 오류|코드:|서버 설정|설정 필요/.test(api), false)
    const A = await import('../src/lib/studioApi.js').catch(e => ({ importError: e.message }))
    // studioApi.js는 '@/lib/supabase'를 불러 node에서 바로 못 읽는다 → 글자로 확인
    if (A.importError) eq('표에 없는 코드 = 고정 문구 + console.error (글자 확인)', [/if \(msg\) return msg\s+console\.error\(/.test(read('src/lib/studioApi.js')), read('src/lib/studioApi.js').includes("export const FALLBACK_MESSAGE = '잠시 후 다시 시도해 주세요. 계속되면 고객센터로 문의해 주세요.'")], [true, true])
    else eq('표에 없는 코드 = 고정 문구', A.studioErrorMessage('upload', 'zzz_unknown'), '잠시 후 다시 시도해 주세요. 계속되면 고객센터로 문의해 주세요.')
  }

  // 고객 화면 문구 — 템플릿(주석 제외)·오류 문구 표·서버 응답에 내부 용어가 없어야 한다
  const BAN = /관리자|서버|암호화|키 설정|환경변수|중계|relay|ENC_KEY|RELAY/
  const screens = ['src/views/studio/StudioMarketplaceView.vue', 'src/views/studio/StudioShippingView.vue', 'src/views/studio/StudioSettingsView.vue', 'src/views/studio/StudioChannelsView.vue', 'src/views/studio/StudioChannelSendView.vue', 'src/views/studio/StudioChannelSentView.vue', 'src/components/studio/StudioSendModal.vue', 'src/components/studio/StudioSendCoupang.vue', 'src/components/studio/StudioMarketplaceGuide.vue', 'src/components/studio/StudioShippingTemplates.vue', 'src/components/studio/StudioSendList.vue', 'src/components/studio/StudioExportList.vue']
  // relayIp는 값(IP 숫자)을 넘기는 속성 이름 — 화면에 글자로 보이지 않는다
  const shown = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '').replace(/:relay-ip|relayIp/g, '') }
  eq('화면 템플릿에 내부 용어 없음', screens.filter(p => BAN.test(shown(p))), [])
  const table = /const MARKETPLACE = \{([\s\S]*?)\n\}/.exec(read('src/lib/studioApi.js'))[1].replace(/\/\/.*$/gm, '').replace(/^\s*\w+:/gm, '')
  eq('오류 문구 표(marketplace)에 내부 용어 없음', BAN.test(table), false)
  const sent = [...read('api/marketplace.js').matchAll(/sendError\(res, \d+, '\w+', (['"`])(.*?)\1\)/g)].map(m => m[2])
  eq('서버가 돌려주는 문구(글자로 쓴 것)에 내부 용어 없음', [sent.length > 20, sent.filter(m => BAN.test(m))], [true, []])
  eq('판매처 화면: 준비 안 됨 빨간 안내 없음', /data-mk-not-ready|ready\.enc|ready\.relay/.test(read('src/views/studio/StudioMarketplaceView.vue')), false)
  eq('준비 문제 코드 = 회색 · 고객이 고칠 오류 = 가이드 링크', [R.isNotReady('enc_not_ready'), R.isNotReady('relay_not_configured'), R.isNotReady('ip_not_allowed'), R.needsGuide('ip_not_allowed'), R.needsGuide('bad_key'), R.needsGuide('key_expired'), R.needsGuide('rate_limited')], [true, true, false, true, true, true, false])
  eq('서버·화면 준비 문제 코드가 어긋나지 않음', C.NOT_READY_CODES.filter(c => !R.isNotReady(c)), [])

  // 완성작 배지 — 완성작마다 가장 최근 전송
  const S = (id, exportId, status, createdAt) => ({ id, exportId, status, createdAt })
  const m = R.latestSendByExport([S('a', 'E1', 'failed', '2026-09-28T01:00:00Z'), S('c', 'E1', 'rejected', '2026-09-28T03:00:00Z'), S('b', 'E2', 'approved', '2026-09-28T02:00:00Z'), S('d', null, 'failed', '2026-09-28T04:00:00Z')])
  eq('배지: 완성작마다 최신 1건 (순서 무관 · exportId 없는 건 뺌)', [m.E1.id, m.E2.id, Object.keys(m).length], ['c', 'b', 2])
  eq('배지: 목록이 비거나 이상해도 빈 값', [R.latestSendByExport([]), R.latestSendByExport(null)], [{}, {}])

  const guide = read('src/components/studio/StudioMarketplaceGuide.vue')
  eq('가이드: 이미지 크게 보기(닫기 버튼) · Esc', [/data-mk-guide-zoom-open/.test(guide), /data-mk-guide-zoom-close/.test(guide), /e\.key !== 'Escape'/.test(guide), /removeEventListener\('keydown', onKey\)/.test(guide)], [true, true, true, true])
  // 만드는 곳(내 작업)과 보내는 곳(판매처) 나누기 (2026-09-30)
  const home = read('src/views/studio/StudioHomeView.vue'), sendView = read('src/views/studio/StudioChannelSendView.vue'), sentView = read('src/views/studio/StudioChannelSentView.vue')
  const list = read('src/components/studio/StudioExportList.vue'), listShown = shown('src/components/studio/StudioExportList.vue')
  eq('내 작업: 보낸 상품·보내기 없음 · 내 상품 칸만', [/StudioSendList|StudioSendModal|sendToMarketplace|sends/.test(home), /<StudioExportList \/>/.test(home)], [false, true])
  eq('내 상품(내 작업) = [다시 받기] + "판매처에서 보내기 →"(이 상품을 골라 둔 보내기 탭)만', [/'다시 받기'/.test(listShown), /:to="\{ name: 'studio-channels-send', query: \{ export: x\.id \} \}"[^>]*>판매처에서 보내기 →</.test(listShown), /StudioSendModal|sendToMarketplace|판매처로 보내기/.test(list)], [true, true, false])
  eq('내 상품 배지·고르기는 판매처 > 보내기(pick)에서만', [/v-if="pick && sendsOf\[x\.id\]"/.test(listShown), /v-if="!pick" class="flex flex-col gap-1"/.test(listShown), /<StudioExportList pick :selected-id="selectedId" :sends="sends"/.test(sendView)], [true, true, true])
  eq('보내기 탭: 예전 진입 그대로 (sendToMarketplace → StudioSendModal) · ?export= 로 골라 둠', [/const r = await sendToMarketplace\(picked\.value\.id\)/.test(sendView), /<StudioSendModal :open="sendOpen" :prepare="sendPrepare"/.test(sendView), /route\.query\.export/.test(sendView)], [true, true, true])
  eq('보내기 탭: 연결 전 = 자물쇠 + [연결하기](연결 탭) · "준비 중" 글자 없음', [/<Lock /.test(shown('src/views/studio/StudioChannelSendView.vue')), /:to="\{ name: 'studio-channels-connect' \}"[^>]*>연결하기</.test(shown('src/views/studio/StudioChannelSendView.vue')), /준비 중/.test(shown('src/views/studio/StudioChannelSendView.vue'))], [true, true, false])
  eq('보낸 상품 탭 = StudioSendList 그대로 · 연결 화면에는 없음', [/<StudioSendList v-if="loggedIn" ref="sendList" :exports="exportItems"/.test(sentView), /<StudioSendList|<StudioShippingTemplates/.test(read('src/views/studio/StudioMarketplaceView.vue'))], [true, false])
  eq('판매처 화면: 로그아웃 구독', ['src/components/studio/StudioSendList.vue', 'src/views/studio/StudioShippingView.vue', 'src/views/studio/StudioChannelSendView.vue', 'src/views/studio/StudioChannelSentView.vue', 'src/components/studio/StudioExportList.vue'].map(p => /euchs-auth-changed/.test(read(p))), [true, true, true, true, true])
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기 [작업 저장] 뒤 [판매처로 보내기] = 보내기 탭으로 (방금 저장한 상품) · 편집기 안 보내기 창 없음', [/router\.push\(\{ name: 'studio-channels-send', query: \{ export: exportId \} \}\)/.test(ed), /StudioSendModal|sendToMarketplace/.test(ed)], [true, false])
  eq('예전 설정 링크 이름이 남은 곳 = 보내기 창·쿠팡 섹션뿐 (redirect로 새 탭)', [...['src/components/studio/StudioExportList.vue', 'src/components/studio/StudioSendList.vue', 'src/components/studio/StudioShippingTemplates.vue', 'src/views/studio/StudioShippingView.vue', 'src/views/studio/StudioMarketplaceView.vue', 'src/views/studio/StudioChannelSendView.vue'].filter(p => /studio-settings-(marketplace|shipping)/.test(read(p)))], [])
  // 판매처 줄 (보내기 탭)
  const on = R.channelRows({ coupang: { connected: true } }), off = R.channelRows({ coupang: { connected: false } })
  // S3-3: 연결할 수 있는 곳(쿠팡·스마트스토어·11번가·카페24)은 연결 상태, 나머지 5곳은 "예정"(planned)
  const KEYED = ['coupang', 'smartstore', '11st', 'cafe24']
  const offStates = R.MARKETS.map(m => (KEYED.includes(m.key) ? 'locked' : 'planned'))
  eq('판매처 줄 = MARKETS 9곳·같은 순서 · 연결된 쿠팡만 connected · 키 연결 판매처는 연결 전 locked · 나머지 = planned(준비 중 없음) · 스마트스토어·카페24는 연결되면 linked', [on.map(r => r.key), on.map(r => r.state), off.map(r => r.state), R.channelRows().map(r => r.state), R.channelRows({ smartstore: { connected: true } })[1].state, R.channelRows({ cafe24: { connected: true } }).find(r => r.key === 'cafe24').state], [R.MARKETS.map(m => m.key), ['connected', ...offStates.slice(1)], offStates, offStates, 'linked', 'linked'])
}

// ── 11. 쿠팡 항목 규칙 (api/_coupangFields.js — 화면과 서버가 같이 쓰는 순수 함수) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const rules = read('api/_coupangFields.js').replace(/\/\*[\s\S]*?\*\//g, '') // 주석 빼고
  eq('규칙 파일: import·process.env·fetch 없음 (브라우저에서도 그대로 씀)', [/^import /m.test(rules), /process\.env|fetch\(/.test(rules)], [false, false])

  // 판매 방식
  eq('판매 방식 두 가지 · 문서 값', [Object.keys(F.SALE_MODES), F.SALE_MODES.domestic, F.SALE_MODES.agent].map(x => JSON.stringify(x)), [
    '["domestic","agent"]',
    '{"label":"국내 재고 판매","deliveryMethod":"SEQUENCIAL","overseasPurchased":"NOT_OVERSEAS_PURCHASED","pccNeeded":false}',
    '{"label":"해외구매대행","deliveryMethod":"AGENT_BUY","overseasPurchased":"OVERSEAS_PURCHASED","pccNeeded":true}',
  ])
  eq('기본값 없음: 빈 값·모르는 값은 판매 방식이 아님', [F.isSaleMode(''), F.isSaleMode(undefined), F.isSaleMode('overseas'), F.isSaleMode('agent')], [false, false, false, true])
  eq('출고 소요일 기본: 국내 = 템플릿 값 · 구매대행 = 길게(10) · 템플릿이 더 길면 그 값', [F.defaultOutboundDays('domestic', 2), F.defaultOutboundDays('agent', 2), F.defaultOutboundDays('agent', 14), F.defaultOutboundDays('agent', 99)], [2, 10, 14, 30])
  eq('판매 방식 없음 → 본문 안 만듦', [C.buildProductBody({ ...BASE, saleMode: undefined }).ok, C.buildProductBody({ ...BASE, saleMode: '' }).message], [false, '판매 방식을 골라 주세요. (국내 재고 판매 / 해외구매대행)'])
  const dm = C.buildProductBody(BASE).body
  eq('국내 재고: SEQUENCIAL · NOT_OVERSEAS_PURCHASED · pccNeeded false · 출고 = 템플릿', [dm.deliveryMethod, dm.items[0].overseasPurchased, dm.items[0].pccNeeded, dm.items[0].outboundShippingTimeDay], ['SEQUENCIAL', 'NOT_OVERSEAS_PURCHASED', false, 2])

  // 요청 본문 스냅샷 (해외구매대행 + 새 칸 전부)
  const full = C.buildProductBody({
    ...BASE, saleMode: 'agent', outboundDays: 10, displayName: '이유씨 세라믹 머그컵', generalName: '세라믹 머그컵', manufacture: '이유씨컴퍼니', modelNo: 'EU-MUG-01',
    searchTags: ['머그컵', '홈카페'], advanced: { taxType: 'TAX', adultOnly: 'EVERYONE', offerCondition: 'NEW', parallelImported: 'NOT_PARALLEL_IMPORTED', unionDeliveryType: 'UNION_DELIVERY', maxPerPerson: 2, maxPerPersonDays: 30 },
    certifications: [{ type: 'KC_HOUSEHOLD_CONFIRM', code: 'CB-1' }], documents: [{ templateName: '수입신고필증', url: 'https://www.euchs.co.kr/api/marketplace?t=d' }],
    items: [{ ...BASE.items[0], imageUrl: 'https://www.euchs.co.kr/api/marketplace?t=r' }],
  })
  eq('요청 본문 스냅샷 (해외구매대행)', full.body, {
    displayCategoryCode: 56137, sellerProductName: '매일 쓰는 머그', vendorId: 'A00012345', saleStartedAt: '2026-09-28T00:00:00', saleEndedAt: '2099-12-31T23:59:59',
    displayProductName: '이유씨 세라믹 머그컵', brand: '이유씨', brandId: 'KR-77', manufacture: '이유씨컴퍼니',
    deliveryMethod: 'AGENT_BUY', deliveryCompanyCode: 'CJGLS', deliveryChargeType: 'FREE', deliveryCharge: 0, freeShipOverAmount: 0, deliveryChargeOnReturn: 3000,
    remoteAreaDeliverable: 'Y', unionDeliveryType: 'UNION_DELIVERY',
    returnCenterCode: '200', returnChargeName: '반품지A', companyContactNumber: '010-0000-0000', returnZipCode: '61000', returnAddress: '광주 북구', returnAddressDetail: '1층',
    returnCharge: 3000, outboundShippingPlaceCode: 100, vendorUserId: 'wingid', requested: true,
    items: [{
      itemName: '블랙', originalPrice: 12000, salePrice: 9900, maximumBuyCount: 50, maximumBuyForPerson: 2, maximumBuyForPersonPeriod: 30,
      externalVendorSku: 'MUG-BK', emptyBarcode: true, emptyBarcodeReason: '바코드가 없는 상품(품번으로 식별)',
      outboundShippingTimeDay: 10, unitCount: 1, adultOnly: 'EVERYONE', taxType: 'TAX', parallelImported: 'NOT_PARALLEL_IMPORTED', overseasPurchased: 'OVERSEAS_PURCHASED', pccNeeded: true,
      certifications: [{ certificationType: 'KC_HOUSEHOLD_CONFIRM', certificationCode: 'CB-1' }],
      images: [{ imageOrder: 0, imageType: 'REPRESENTATION', vendorPath: 'https://www.euchs.co.kr/api/marketplace?t=r' }, { imageOrder: 1, imageType: 'DETAIL', vendorPath: 'https://www.euchs.co.kr/api/marketplace?t=y' }],
      attributes: [{ attributeTypeName: '색상', attributeValueName: '블랙' }],
      contents: [{ contentsType: 'IMAGE_NO_SPACE', contentDetails: [{ content: 'https://www.euchs.co.kr/api/marketplace?t=y', detailType: 'IMAGE' }] }],
      notices: [{ noticeCategoryName: '기타 재화', noticeCategoryDetailName: '품명 및 모델명', content: '머그' }],
      searchTags: ['머그컵', '홈카페'], offerCondition: 'NEW', modelNo: 'EU-MUG-01',
    }],
    generalProductName: '세라믹 머그컵',
    requiredDocuments: [{ templateName: '수입신고필증', vendorDocumentPath: 'https://www.euchs.co.kr/api/marketplace?t=d' }],
  })
  eq('노출상품명 비우면 등록상품명 · 제품명·모델번호·서류 칸은 비우면 안 보냄', [dm.displayProductName, 'generalProductName' in dm, 'modelNo' in dm.items[0], 'requiredDocuments' in dm], ['매일 쓰는 머그', false, false, false])
  eq('노출상품명 101자 → 거절', C.buildProductBody({ ...BASE, displayName: '가'.repeat(101) }).ok, false)
  eq('옵션 201개 → 거절 · 200개 통과', [C.buildProductBody({ ...BASE, items: Array.from({ length: 201 }, (_, i) => ({ ...BASE.items[0], name: `옵션${i}`, attributes: { 색상: `색${i}` } })) }).ok, C.buildProductBody({ ...BASE, items: Array.from({ length: 200 }, (_, i) => ({ ...BASE.items[0], name: `옵션${i}`, attributes: { 색상: `색${i}` } })) }).body.items.length], [false, 200])
  eq('옵션 이름이 같음 → 거절', C.buildProductBody({ ...BASE, items: [BASE.items[0], { ...BASE.items[0], attributes: { 색상: '화이트' } }] }).ok, false)
  eq('옵션 값 31자 → 거절', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], attributes: { 색상: '가'.repeat(31) } }] }).ok, false)
  eq('옵션마다 자기 가격 유지 (섞어 담아도 줄마다)', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], salePrice: 9900, originalPrice: 12000 }, { ...BASE.items[0], name: '화이트', sku: 'MUG-WH', salePrice: 11900, originalPrice: 11900, attributes: { 색상: '화이트' } }] }).body.items.map(i => [i.itemName, i.originalPrice, i.salePrice]), [['블랙', 12000, 9900], ['화이트', 11900, 11900]])

  // 고급 설정
  eq('고급 설정 기본값', F.advancedDefaults(), { parallelImported: 'NOT_PARALLEL_IMPORTED', taxType: 'TAX', adultOnly: 'EVERYONE', offerCondition: 'NEW', unionDeliveryType: 'NOT_UNION_DELIVERY', maxPerPerson: 0, maxPerPersonDays: 1 })
  eq('1인 제한 없음(0)이면 기간은 1 (문서)', F.normalizeAdvanced({ maxPerPerson: 0, maxPerPersonDays: 30 }).value.maxPerPersonDays, 1)
  eq('고급 설정: 모르는 값·음수 → 거절', [F.normalizeAdvanced({ adultOnly: 'KIDS' }).ok, F.normalizeAdvanced({ maxPerPerson: -1 }).ok, F.normalizeAdvanced({ maxPerPerson: 1.5 }).ok], [false, false, false])
  eq('할인율: 정가 12,000 · 판매가 9,900 = 18% / 같으면 0 / 판매가가 크면 없음 / 값 없으면 없음', [F.discountRate(12000, 9900), F.discountRate(9900, 9900), F.discountRate(9000, 9900), F.discountRate(null, 9900)], [18, 0, null, null])

  // 검색태그
  const many = Array.from({ length: 25 }, (_, i) => `태그${i}`)
  eq('태그 20개까지', [F.cleanSearchTags(many).tags.length, F.cleanSearchTags(many).removed.length, F.cleanSearchTags(many).removed[0].reason], [20, 5, '20개 넘음'])
  eq('태그 20자까지 (20자 통과 · 21자 뺌)', [F.cleanSearchTags(['가'.repeat(20)]).tags.length, F.cleanSearchTags(['가'.repeat(21)]).removed[0].reason], [1, '20자 넘음'])
  eq('태그 중복(대소문자·띄어쓰기 무시)', F.cleanSearchTags(['Home Cafe', 'homecafe', '홈카페', '홈 카페']).tags, ['Home Cafe', '홈카페'])
  eq('문서가 허용한 특수문자는 남김 · 그 밖은 뺌', F.cleanSearchTags(["3.5mm", 'A+B', '50%', '<b>굵게</b>', '머그(대)', '#홈카페']).tags, ['3.5mm', 'A+B', '50%', 'b 굵게 b', '머그 대', '#홈카페'])
  eq('추천용(strict)은 특수문자 전부 뺌', F.cleanSearchTags(['3.5mm', '#홈카페'], { strict: true }).tags, ['3 5mm', '홈카페'])
  eq('남의 상표 뺌 · 자기 브랜드는 남김', [F.cleanSearchTags(['나이키 운동화', 'NIKE', '디즈니컵', '운동화']).tags, F.cleanSearchTags(['이케아'], { brand: '이케아' }).tags, F.cleanSearchTags(['나이키 운동화']).removed[0].reason], [['운동화'], ['이케아'], '다른 회사 상표'])
  eq('쓸 수 없는 단어(정품·레플리카 등) 뺌', F.cleanSearchTags(['정품 머그', '레플리카', '머그']).tags, ['머그'])
  eq('본문에도 같은 규칙 (서버가 다시 정리)', C.buildProductBody({ ...BASE, searchTags: [...many, '샤넬'] }).body.items[0].searchTags.length, 20)
  const sug = F.suggestSearchTags({ title: '2026 신상 여성 여름 슬리퍼 EVA 미끄럼방지 욕실화 도매', categoryName: '패션잡화>여성신발>슬리퍼', options: ['블랙', '中国'], brand: '이유씨' })
  eq('태그 추천: 카테고리 끝 낱말이 맨 앞 · 꾸밈말·연도 없음 · 번역 안 된 글자 없음', [sug[0], sug.includes('신상'), sug.includes('도매'), sug.includes('2026'), sug.some(t => /\p{Script=Han}/u.test(t)), sug.includes('여성'), sug.includes('여성여름'), sug.length <= 20, sug.every(t => t.length <= 20)], ['슬리퍼', false, false, false, false, true, true, true, true])

  // 상품명 추천
  eq('제품명 추천: 꾸밈말·옵션 값 빼고 검색 키워드(카테고리 끝 낱말)를 앞에', F.suggestGeneralName({ title: '신상 여성 여름 슬리퍼 블랙 250', categoryName: '여성신발>슬리퍼', optionValues: ['블랙', '250'] }), '슬리퍼 여성 여름')
  eq('노출상품명 추천 = 브랜드 + 제품명 (문서 권장) · 100자', [F.suggestDisplayName({ brand: '이유씨', generalName: '슬리퍼 여성 여름' }), F.suggestDisplayName({ brand: '이유씨', generalName: '이유씨 슬리퍼' }), F.suggestDisplayName({ brand: '이유씨', generalName: '' }), F.suggestDisplayName({ brand: '이유씨', generalName: '가나다 '.repeat(40) }).length <= 100], ['이유씨 슬리퍼 여성 여름', '이유씨 슬리퍼', '', true])

  // 1688 옵션
  const sk = F.extractSkus1688(ITEM_1688)
  eq('1688 옵션 줄: 옵션 값 · 가격(위안) · 재고 · 옵션 사진', sk.rows.map(r => [r.skuId, r.values.map(v => `${v.name}=${v.value}`).join(','), r.priceCny, r.stock, r.imageUrl]), [
    ['5001', '颜色=黑色,尺码=36-37', 12.5, 120, 'https://cbu01.alicdn.com/img/ibank/O1CN01black.jpg_.webp'],
    ['5002', '颜色=白色,尺码=36-37', 13, 0, 'https://cbu01.alicdn.com/img/ibank/O1CN01white.jpg'],
    ['5003', '颜色=黑色,尺码=40-41', null, 5, ''],
  ])
  eq('1688 옵션 200개까지 · 전체 수는 따로', (() => { const r = F.extractSkus1688({ props_list: { '0:0': '颜色:黑' }, skus: { sku: Array.from({ length: 230 }, () => ({ properties: '0:0', price: '1' })) } }); return [r.rows.length, r.total] })(), [200, 230])
  eq('옵션 없는 상품·이상한 값 → 빈 목록', [F.extractSkus1688({ skus: { sku: [] } }).rows, F.extractSkus1688(null).rows, F.extractSkus1688({ skus: 'x' }).rows], [[], [], []])
  const attrs2 = C.summarizeCategoryMeta(META2).attributes
  eq('옵션 종류 맞추기: 번역·원문 → 쿠팡 구매옵션', [F.mapOptionName(['색상', '颜色'], attrs2), F.mapOptionName(['颜色分类'], attrs2), F.mapOptionName(['사이즈', '尺码'], attrs2), F.mapOptionName(['컬러'], attrs2), F.mapOptionName(['香味'], attrs2), F.mapOptionName(['소재'], attrs2)], ['색상', '색상', '사이즈', '색상', '', '소재'])
  eq('사진 주소 열쇠: 프로토콜·크기 꼬리·쿼리 뗌', [F.imageKey('//cbu01.alicdn.com/a/b.jpg_.webp'), F.imageKey('https://cbu01.alicdn.com/a/b.jpg?x=1'), F.imageKey('http://cbu01.alicdn.com/a/b.400x400.jpg'), F.imageKey('')], ['cbu01.alicdn.com/a/b.jpg', 'cbu01.alicdn.com/a/b.jpg', 'cbu01.alicdn.com/a/b.jpg', ''])
  eq('번역 안 된 글자 찾기', [F.hasUntranslated('블랙 黑色'), F.hasUntranslated('블랙 250mm'), F.hasUntranslated('')], [true, false, false])

  // 고시·인증·서류
  const s2 = C.summarizeCategoryMeta(META2)
  eq('메타 요약: 인증(코드 필요)·구비서류 규칙·택1 묶음·상품 상태', [s2.certifications.map(c => [c.type, c.required, c.needsCode]), s2.documents, s2.attributes.map(a => [a.name, a.group, a.exposed]), s2.offerConditions, s2.singleItem], [
    [['NOT_REQUIRED', false, false], ['KC_HOUSEHOLD_CONFIRM', true, true], ['PRESENTED_IN_DETAIL_PAGE', false, false]],
    [{ templateName: '수입신고필증', rule: 'MANDATORY_OVERSEAS_PURCHASED' }, { templateName: '병행수입 확인서', rule: 'MANDATORY_PARALLEL_IMPORTED' }, { templateName: '기타서류', rule: 'OPTIONAL' }],
    [['색상', '', true], ['사이즈', '1', true], ['신발 사이즈', '1', true], ['소재', '', false]], ['NEW'], false,
  ])
  eq('옛 메타(인증·서류 칸 없음)도 그대로 읽음', [C.summarizeCategoryMeta(META).documents, C.summarizeCategoryMeta(META).certifications, C.summarizeCategoryMeta(META).attributes[0].group], [[], [], ''])
  eq('고를 수 있는 인증 = NOT_REQUIRED 빼고', F.realCerts(s2.certifications).map(c => c.type), ['KC_HOUSEHOLD_CONFIRM', 'PRESENTED_IN_DETAIL_PAGE'])
  eq('구비서류 필수 조건', [F.docRequired('MANDATORY', {}), F.docRequired('OPTIONAL', { saleMode: 'agent' }), F.docRequired('MANDATORY_OVERSEAS_PURCHASED', { saleMode: 'agent' }), F.docRequired('MANDATORY_OVERSEAS_PURCHASED', { saleMode: 'domestic' }), F.docRequired('MANDATORY_PARALLEL_IMPORTED', { parallelImported: 'PARALLEL_IMPORTED' }), F.docRequired('MANDATORY_PARALLEL_IMPORTED', { parallelImported: 'NOT_PARALLEL_IMPORTED' })], [true, false, true, false, true, false])
  eq('택1 묶음: 하나만 채우면 통과', C.missingRequired(s2, { attributes: { 색상: '블랙', 사이즈: 'M' }, skipProduct: true }), [])
  eq('고시 기본값: 1688 상품이면 제조국·원산지만 · 아니면 없음', [F.noticeDefaults(s2.notices[1].items, { is1688: true }), F.noticeDefaults(s2.notices[1].items, { is1688: false }), F.noticeDefaults(s2.notices[0].items, { is1688: true })], [{ '제조국(원산지)': '중국' }, {}, { 제조국: '중국' }])
  eq('"상세페이지 참조" = 문서 예시 표현 그대로', F.NOTICE_SEE_DETAIL, '상세페이지 참조')

  // 보내기 전 요약
  const pv = F.previewRows({ saleMode: 'agent', outboundDays: 10, productName: '머그', displayName: '', brand: '이유씨', categoryCode: '56137', categoryName: '머그컵', tags: ['머그컵', '홈카페'], items: [{ salePrice: 9900 }, { salePrice: 11900 }], noticeCategory: '기타 재화', notices: { a: '1', b: '' }, certifications: [], documents: [], advanced: { maxPerPerson: 2, maxPerPersonDays: 30 }, templateName: '기본' })
  const row = l => pv.find(r => r.label === l)?.value
  eq('요약 표: 판매 방식·배송방법·통관부호·이름·태그·가격 범위·구매 제한', [row('판매 방식'), row('배송방법'), row('개인통관고유부호'), row('출고 소요일'), row('노출상품명'), row('제조사'), row('검색태그'), row('옵션'), row('판매가'), row('상품정보고시'), row('인증정보'), row('1인 구매 제한'), row('제품명')], ['해외구매대행', 'AGENT_BUY', '받음', '10일', '머그', '', '머그컵, 홈카페', '2개', '9,900원 ~ 11,900원', '기타 재화 · 1항목', '해당 없음', '30일에 2개', ''])
  eq('요약 표: 판매 방식을 안 고르면 빈 칸 (기본값 없음)', [F.previewRows({}).find(r => r.label === '판매 방식').value, F.previewRows({}).find(r => r.label === '배송방법').value], ['', ''])

  // 화면
  const modal = read('src/components/studio/StudioSendCoupang.vue')
  const shown = modal.slice(modal.indexOf('<template>'), modal.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  eq('보내기 창: 판매 방식 고르기 · 기본값 없음(처음 값 빈 칸) · 빠짐 목록', [/data-mk-s-mode-pick/.test(shown), /saleMode: '', outboundDays: null/.test(modal), /out\.push\('판매 방식 \(국내 재고 판매 \/ 해외구매대행\)'\)/.test(modal)], [true, true, true])
  eq('보내기 창: 이름 3칸·모델번호·태그 칩·고급 설정 접기·요약 표', [/data-mk-s-display/.test(shown), /data-mk-s-general/.test(shown), /data-mk-s-model/.test(shown), /<StudioTagChips /.test(shown), /data-mk-s-advanced-toggle/.test(shown), /advancedOpen = ref\(false\)/.test(modal), /data-mk-s-preview/.test(shown)], [true, true, true, true, true, true, true])
  eq('보내기 창: 옵션 표·옵션 종류 맞추기·옵션 사진·고시 전체·인증·서류', [/data-mk-s-items/.test(shown), /data-mk-s-option-map/.test(shown), /data-mk-s-item-image/.test(shown), /v-for="n in noticeItems"/.test(shown), /data-mk-s-cert-row/.test(shown), /data-mk-s-doc-row/.test(shown)], [true, true, true, true, true, true])
  eq('보내기 창: 금액을 임의 숫자로 채우지 않음 (1688 가격 → 판매가 계산 없음)', [/priceCny\s*\*/.test(modal), /salePrice\s*=\s*[^=]*priceCny/.test(modal), /originalPrice: null, salePrice: null/.test(modal), /'확인 필요'/.test(modal)], [false, false, true, true])
  eq('보내기 창·태그 칩: 규칙은 공용 파일에서', [/from '\.\.\/\.\.\/\.\.\/api\/_coupangFields\.js'/.test(modal), /from '\.\.\/\.\.\/\.\.\/api\/_coupangFields\.js'/.test(read('src/components/studio/StudioTagChips.vue'))], [true, true])
  // 판매처 목록 — 설정·랜딩이 같은 목록·같은 순서, 사정 설명 문구 없음
  const R = await import('../src/lib/studioMarketplaceRules.js')
  eq('판매처 목록·순서 (쿠팡만 연결 가능, 나머지는 준비 중)', [R.MARKETS.map(m => m.name), R.MARKETS.filter(m => !m.soon).map(m => m.key)], [['쿠팡', '스마트스토어', '11번가', 'G마켓·옥션', '에이블리', '지그재그', '카페24', '메이크샵', '고도몰'], ['coupang']])
  const mkView = read('src/views/studio/StudioMarketplaceView.vue'), landing = read('src/views/studio/StudioLandingView.vue')
  const screenTextOf = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '') }
  eq('연결 탭·랜딩 둘 다 공용 목록을 씀 (따로 적은 목록 없음) · 연결 신청 화면 없음(S3-3)', [/<StudioMarketRequests/.test(mkView), /const PLANNED = MARKETS\.filter\(m => m\.connect === 'planned'\)/.test(mkView), /import \{ MARKETS \} from '@\/lib\/studioMarketplaceRules'/.test(landing), /v-for="m in MARKETS"/.test(landing), /'카페24'|'고도몰'|'메이크샵'/.test(mkView + landing)], [false, true, true, true, false])

  // ── 판매처 연결 2단계 (2026-09-30): 11번가 키 연결 · 가이드 (연결 신청은 S3-3에서 걷어냄 → "예정") ──
  {
    const G = await import('../src/lib/studioMarketGuides.js')
    const E = await import('../api/_elevenst.js')
    const api = read('api/marketplace.js'), el = read('api/_elevenst.js'), card = read('src/components/studio/StudioElevenstCard.vue')
    const sql = read('docs/sql/2026-09-30-marketplace-11st-requests.sql')
    eq('연결 방법: 쿠팡·스마트스토어·11번가·카페24 = 키 · 나머지 5곳 = 예정 · 보내기는 쿠팡만', [R.MARKETS.filter(m => m.connect === 'key').map(m => m.key), R.PLANNED_MARKETS, R.MARKETS.filter(m => !m.soon).map(m => m.key), R.PLANNED_LABEL, 'REQUEST_MARKETS' in R, 'requestProblems' in R], [['coupang', 'smartstore', '11st', 'cafe24'], ['gmarket', 'ably', 'zigzag', 'makeshop', 'godomall'], ['coupang'], '예정', false, false])
    eq('서버: 연결 신청 action·표 없음 · SQL에 marketplace_requests 만들기 없음', [/connect_request|REQUEST_MARKETS|marketplace_requests/.test(api), /create table public\.marketplace_requests/.test(sql), /marketplace_requests/.test(read('src/lib/studioMarketplace.js') + read('src/lib/studioMarketLinks.js'))], [false, false, false])
    const on = R.channelRows({ coupang: { connected: true }, '11st': { connected: true }, zigzag: { connected: true }, cafe24: { connected: true } })
    eq('보내기 탭 줄: 쿠팡 = 보내기 · 11번가·카페24 = 연결됨(보내기 없음) · 예정 판매처는 값이 와도 예정', Object.fromEntries(on.map(r => [r.key, r.state])), { coupang: 'connected', smartstore: 'locked', '11st': 'linked', gmarket: 'planned', ably: 'planned', zigzag: 'planned', cafe24: 'linked', makeshop: 'planned', godomall: 'planned' })
    eq('11번가 키 입력 검사', [R.elevenstKeyProblems({ sellerId: 'seller', apiKey: 'abcd1234efgh' }), R.elevenstKeyProblems({ sellerId: '', apiKey: 'short' }), R.elevenstKeyProblems({ sellerId: 'a', apiKey: 'has space 123' })], [[], ['11번가 셀러 ID', 'API 키'], ['API 키']])
    eq('가이드: 단계 5~8개 · 짧은 명령형(끝이 "요.") · IP = 중계 IP · 연결 신청 가이드 없음', [G.ELEVENST_GUIDE.length, G.SMARTSTORE_GUIDE.length, G.CAFE24_GUIDE.length, [...G.ELEVENST_GUIDE, ...G.SMARTSTORE_GUIDE, ...G.CAFE24_GUIDE].every(s => /요\.( \(메뉴 이름 확인 필요\))?$/.test(s)), G.RELAY_IP === C.RELAY_IP, G.ELEVENST_GUIDE.some(s => s.includes('3.39.196.112')), 'requestGuide' in G], [8, 8, 8, true, true, true, false])
    eq('가이드: 메뉴 이름을 모르는 곳은 표시 · 목록으로 뽑힘 (11번가는 실제 화면으로 확인 → 표시 없음)', G.menuChecks().map(x => x.market), ['smartstore', 'smartstore', 'smartstore', 'smartstore', 'cafe24', 'cafe24', 'cafe24', 'cafe24', 'cafe24'])
    // 사진 가이드 (2026-09-30) — 판매처별 목록 한 곳 · 파일이 실제로 있고 가벼움 · 단계와 짝
    {
      const ph = G.guidePhotos('11st')
      const size = p => { try { return fs.statSync(new URL(`../public${p}`, import.meta.url)).size } catch { return -1 } }
      eq('11번가 사진 8장 = 단계 8개와 1:1 · 파일 있음 · 큰 사진 400KB 이하 · 썸네일 30KB 이하', [ph.length, ph.map(p => p.step), ph.every(p => size(p.src) > 0 && size(p.src) <= 400 * 1024), ph.every(p => size(p.thumb) > 0 && size(p.thumb) <= 30 * 1024), ph.every(p => p.alt)], [8, [0, 1, 2, 3, 4, 5, 6, 7], true, true, true])
      eq('사진 없는 판매처 = 빈 목록 · 단계 → 사진 번호', [G.guidePhotos('smartstore'), G.guidePhotos('cafe24'), G.photoIndexForStep('11st', 2), G.photoIndexForStep('smartstore', 0)], [[], [], 2, -1])
      eq('11번가 가이드: 확인 필요 표시 없음 · IP 3칸 · 셀링툴 비워 둬도 됨', [G.ELEVENST_GUIDE.some(s => s.includes(G.MENU_CHECK)), /3칸 모두 3\.39\.196\.112/.test(G.ELEVENST_GUIDE[2]), /셀링툴 업체 선택 칸은 비워/.test(G.ELEVENST_STEP_NOTES[2])], [false, true, true])
      eq('11번가 연결 창: 사진 가이드 컴포넌트 · 단계 [사진] 링크 · IP [복사]', [/<StudioGuidePhotos ref="photos" market="11st"/.test(card), /data-mk-11st-step-photo/.test(card), /data-mk-11st-copy-ip/.test(card)], [true, true, true])
    }
    eq('11번가 호출 = 쿠팡과 같은 중계(/11st 접두어 + x-relay-secret) · 같은 브레이커·준비 문제 문구', [/`\$\{c\.relayUrl\.replace\(\/\\\/\$\/, ''\)\}\/11st\$\{path\}/.test(el), /'x-relay-secret': c\.relaySecret/.test(el), /import \{ breakerFor, NOT_READY_MESSAGE, RELAY_IP \} from '\.\/_coupang\.js'/.test(el), /'openapikey': c\.apiKey/.test(el)], [true, true, true, true])
    {
      const calls = []
      const fake = (status, text) => async (url, opt) => { calls.push({ url, h: opt.headers }); return { ok: status < 400, status, text: async () => text } }
      const base = { relayUrl: 'https://relay.example/', relaySecret: 'S', apiKey: 'KEY12345', breakerKey: 't1' }
      await E.verifyElevenstKey({ ...base, fetchImpl: fake(200, '<ns2:outboundAreas><outboundArea/></ns2:outboundAreas>') })
      const errs = []
      for (const [st, tx] of [[401, 'unauthorized'], [200, '<result_code>-1</result_code><result_message>인증 실패</result_message>'], [0, ''], [403, '허용되지 않은 IP입니다']]) {
        try { await E.verifyElevenstKey({ ...base, breakerKey: `t${st}${tx.length}`, fetchImpl: st === 0 ? async () => { throw new Error('down') } : fake(st, tx) }) } catch (e) { errs.push(e.code) }
      }
      eq('11번가 키 확인(가짜 응답): 주소·헤더 · 성공/키 틀림/거절/중계 끊김/IP', [calls[0].url, calls[0].h.openapikey, calls[0].h['x-relay-secret'], errs], ['https://relay.example/11st/rest/areaservice/outboundarea', 'KEY12345', 'S', ['bad_key', 'bad_key', 'relay_unreachable', 'ip_not_allowed']])
      let noRelay = ''
      try { await E.verifyElevenstKey({ ...base, relayUrl: '' }) } catch (e) { noRelay = e.code }
      eq('중계 설정이 없으면 호출하지 않음', noRelay, 'relay_not_configured')
    }
    eq('서버: 11번가 키는 쿠팡과 같은 표·암호화 · 응답에는 끝 4자리만', [/market: ELEVENST, seller_login_id: login, vendor_id: null,\s*access_key_enc: encryptSecret\(key, encKey\)/.test(api), /const ELEVENST_PUBLIC = 'seller_login_id,key_last4,status,last_checked_at,last_error,created_at'/.test(api), /access_key_enc|api_key/.test(/async function marketStatus[\s\S]*?\n\}/.exec(api)[0])], [true, true, false])
    eq('서버: SQL 실행 전이면 503 marketplace_sql_missing + 원인 로그 (조용히 삼키지 않음)', [(api.match(/sendError\(res, 503, 'marketplace_sql_missing', NOT_READY_MESSAGE\)/g) || []).length >= 3, /2026-09-30-marketplace-11st-requests\.sql 실행 필요/.test(api)], [true, true])
    eq('서버: 판매처 연결 action · 모두 studioGuard 뒤 · 연결 신청 action 없음', [...['market_status', 'connect_11st', 'disconnect_11st', 'connect_smartstore', 'disconnect_smartstore', 'cafe24_begin', 'cafe24_finish', 'disconnect_cafe24'].map(a => api.includes(`body.action === '${a}'`)), api.includes("body.action === 'connect_request'"), api.indexOf('const ctx = await studioGuard(req, res)') < api.indexOf("body.action === 'cafe24_begin'")], [true, true, true, true, true, true, true, true, false, true])
    eq('SQL: 쿠팡 칸 규칙 유지 · 새 표 없음(GRANT 불필요) · 미실행 · 되돌리기', [/check \(market <> 'coupang' or \(vendor_id is not null and secret_key_enc is not null and expires_at is not null\)\)/.test(sql), /create table/i.test(sql), /상태: 미실행/.test(sql), /\/\* 되돌리기/.test(sql), / to anon/.test(sql)], [true, false, true, true, false])
    eq('화면: [연결하기] = 작업 시작 관문 · 로그인 뒤 ?link=11st로 이어서', /await studioGate\('\/studio\/channels\/connect\?link=11st'\)/.test(card), true)
    eq('화면: 연결 탭에 "준비 중" 없음 · 예정 판매처 = 이름 + "예정"만(버튼·입력 칸 없음) · 키는 password 칸 · 끝 4자리만', [/준비 중/.test(screenTextOf('src/components/studio/StudioElevenstCard.vue') + screenTextOf('src/views/studio/StudioMarketplaceView.vue') + screenTextOf('src/components/studio/StudioCafe24Card.vue')), /<li v-for="m in PLANNED"[^>]*>\s*<span[^>]*>\{\{ m\.name \}\}<\/span>\s*<span class="st-badge[^"]*">\{\{ PLANNED_LABEL \}\}<\/span>\s*<\/li>/.test(mkView), /type="password"[^>]*data-mk-11st-f-key/.test(card), /•••• \{\{ acc\.key_last4 \}\}/.test(card)], [false, true, true, true])
    // ── 스마트스토어 키 연결 (2026-09-30 S3-2) ──
    {
      const S = await import('../api/_smartstore.js')
      const bc = (await import('bcryptjs')).default
      const ss = read('api/_smartstore.js'), ssCard = read('src/components/studio/StudioSmartstoreCard.vue')
      const SALT = bc.genSaltSync(4) // 가짜 시크릿 (bcrypt salt 모양)
      const sign = S.smartstoreSign('app-id-1', SALT, 1643961623299)
      const decoded = Buffer.from(sign, 'base64').toString('utf8')
      eq('전자서명 = base64(bcrypt(client_id + "_" + timestamp, salt = 시크릿)) · 같은 입력이면 같은 값', [decoded.startsWith(SALT), bc.compareSync('app-id-1_1643961623299', decoded), S.smartstoreSign('app-id-1', SALT, 1643961623299) === sign, S.smartstoreSign('app-id-1', SALT, 1643961623300) === sign], [true, true, true, false])
      const calls = []
      const fake = (status, text) => async (url, opt) => { calls.push({ url, opt }); return { ok: status < 400, status, text: async () => text } }
      const base = { relayUrl: 'https://relay.example', relaySecret: 'S', clientId: 'app-id-1', clientSecret: SALT, now: () => 1790000000000 }
      const tok = await S.smartstoreToken({ ...base, breakerKey: 'ok', fetchImpl: fake(200, '{"access_token":"tok","expires_in":10800,"token_type":"Bearer"}') })
      const body = new URLSearchParams(calls[0].opt.body)
      eq('토큰 발급(가짜 응답): 중계 /smartstore + 공식 경로 · form-urlencoded · client_credentials · SELF · 13자리 timestamp · 시크릿은 보내지 않음', [
        calls[0].url, calls[0].opt.method, calls[0].opt.headers['Content-Type'], calls[0].opt.headers['x-relay-secret'],
        [...body.keys()], body.get('grant_type'), body.get('type'), body.get('timestamp').length, calls[0].opt.body.includes(SALT.slice(7)), tok.access_token,
      ], ['https://relay.example/smartstore/external/v1/oauth2/token', 'POST', 'application/x-www-form-urlencoded', 'S', ['client_id', 'timestamp', 'client_secret_sign', 'grant_type', 'type'], 'client_credentials', 'SELF', 13, false, 'tok'])
      const codes = []
      for (const [st, tx, k] of [[403, '{"code":"GW.IP_NOT_ALLOWED","message":"호출이 허용되지 않은 IP입니다."}', 'a'], [401, '{"code":"GW.AUTHN"}', 'b'], [400, '{"message":"invalid_client"}', 'c'], [200, '{"nope":1}', 'd'], [500, 'x', 'e']]) {
        try { await S.smartstoreToken({ ...base, breakerKey: k, fetchImpl: fake(st, tx) }) } catch (e) { codes.push(e.code) }
      }
      let badSalt = '', relay = ''
      const n = calls.length
      try { await S.smartstoreToken({ ...base, clientSecret: 'not-a-bcrypt-salt', fetchImpl: fake(200, '{}') }) } catch (e) { badSalt = e.code }
      try { await S.smartstoreToken({ ...base, relayUrl: '' }) } catch (e) { relay = e.code }
      eq('토큰 오류: IP 막힘 · 키 틀림 · 응답 모양 이상 · 네이버 장애 / 시크릿 모양이 틀리면·중계 설정이 없으면 부르지 않음', [codes, badSalt, relay, calls.length === n], [['ip_not_allowed', 'bad_key', 'bad_key', 'market_bad_json', 'market_server'], 'bad_key', 'relay_not_configured', true])
      eq('같은 중계·브레이커·준비 문구 재사용 · 토큰은 로그에서 가림', [/import \{ breakerFor, NOT_READY_MESSAGE, RELAY_IP \} from '\.\/_coupang\.js'/.test(ss), /breakerFor\(`smartstore:/.test(ss), /"access_token":"\[가림\]"/.test(ss)], [true, true, true])
      eq('서버: 스마트스토어 = 같은 표·같은 암호화(ID·시크릿 둘 다) · 상태 응답에 ID 끝 4자리만', [/market: SMARTSTORE, seller_login_id: '내 스토어 애플리케이션', vendor_id: null,\s*access_key_enc: encryptSecret\(id, encKey\), secret_key_enc: encryptSecret\(secret, encKey\)/.test(api), /smartstore: s \? \{ connected: true, account: \{ key_last4: s\.key_last4, status: s\.status/.test(api), ['connect_smartstore', 'disconnect_smartstore'].every(a => api.includes(`body.action === '${a}'`))], [true, true, true])
      eq('SQL: market 체크에 smartstore·cafe24 · 스마트스토어는 시크릿 필수', [/check \(market in \('coupang', '11st', 'smartstore', 'cafe24'\)\)/.test(sql), /check \(market <> 'smartstore' or secret_key_enc is not null\)/.test(sql)], [true, true])
      eq('스마트스토어 입력 검사 (시크릿 = bcrypt salt 모양)', [R.smartstoreKeyProblems({ clientId: 'abcd1234', clientSecret: SALT }), R.smartstoreKeyProblems({ clientId: '', clientSecret: 'plain-secret' })], [[], ['애플리케이션 ID', '애플리케이션 시크릿']])
      eq('가이드: 8단계 · 중계 IP · 확인한 메뉴 "내 스토어 애플리케이션" · IP 다음에 API 그룹 전부 선택(S3-3)', [G.SMARTSTORE_GUIDE.length, G.SMARTSTORE_GUIDE.some(s => s.includes('3.39.196.112')), G.SMARTSTORE_GUIDE.every(s => /요\.( \(메뉴 이름 확인 필요\))?$/.test(s)), G.SMARTSTORE_GUIDE[1], G.SMARTSTORE_GUIDE.findIndex(s => /API 그룹을 전부 선택/.test(s)) === G.SMARTSTORE_GUIDE.findIndex(s => s.includes('3.39.196.112')) + 1], [8, true, true, '내 스토어 애플리케이션 메뉴로 들어가세요.', true])
      eq('화면: 카드 = 관문 · 시크릿은 password 칸 · ID 끝 4자리만 · 연결 탭에 카드', [/await studioGate\('\/studio\/channels\/connect\?link=smartstore'\)/.test(ssCard), /type="password"[^>]*data-mk-ss-f-secret/.test(ssCard), /•••• \{\{ acc\.key_last4 \}\}/.test(ssCard), /<StudioSmartstoreCard \/>/.test(mkView)], [true, true, true, true])
      eq('보내기 탭: 스마트스토어 연결되면 "연결됨"(보내기 없음)', R.channelRows({ smartstore: { connected: true } }).find(r => r.key === 'smartstore').state, 'linked')
    }
    // ── 카페24 — 고객이 만든 앱 + 동의 화면 (2026-09-30 S3-3, 가짜 응답만) ──
    {
      const K = await import('../api/_cafe24.js')
      const c24 = read('api/_cafe24.js'), c24Card = read('src/components/studio/StudioCafe24Card.vue')
      const ENC = Buffer.alloc(32, 7), UID = '11111111-2222-3333-4444-555555555555', NOW = 1790000000
      eq('돌아오는 주소 = 운영 도메인 연결 탭 · 가이드와 서버가 같은 값 · 가이드에 그대로 적힘', [K.CAFE24_REDIRECT_URI, G.CAFE24_REDIRECT_URI === K.CAFE24_REDIRECT_URI, G.CAFE24_GUIDE.some(s => s.includes(K.CAFE24_REDIRECT_URI))], ['https://www.euchs.co.kr/studio/channels/connect', true, true])
      const au = new URL(K.authorizeUrl({ mallId: 'myshop', clientId: 'CID12345', state: 'c24.x' }))
      eq('동의 주소 = 공식 형식 · 권한 3개(공백 구분) · 주소에 시크릿 없음', [au.origin + au.pathname, au.searchParams.get('response_type'), au.searchParams.get('client_id'), au.searchParams.get('redirect_uri'), au.searchParams.get('scope'), au.searchParams.get('state')], ['https://myshop.cafe24api.com/api/v2/oauth/authorize', 'code', 'CID12345', K.CAFE24_REDIRECT_URI, 'mall.read_product mall.write_product mall.read_category', 'c24.x'])
      let hostErr = ''
      try { K.authorizeUrl({ mallId: 'evil.com/x', clientId: 'a', state: 's' }) } catch (e) { hostErr = e.code }
      eq('쇼핑몰 ID = 영문 소문자·숫자만 (주소 조작 막음) · 입력 정리', [hostErr, K.isMallId('myshop01'), K.isMallId('My-Shop'), K.normalizeMallId(' MyShop.cafe24.com/admin '), K.normalizeMallId('https://myshop.cafe24.com')], ['invalid_input', true, false, 'myshop', 'myshop'])
      const st = K.makeState(ENC, UID, NOW)
      eq('state: 이 사용자·10분 안만 통과 · 다른 사용자·만료·위조·다른 키는 거절 · c24. 로 시작', [st.startsWith('c24.'), K.verifyState(ENC, st, UID, NOW + 60), K.verifyState(ENC, st, '99999999-2222-3333-4444-555555555555', NOW), K.verifyState(ENC, st, UID, NOW + 601), K.verifyState(ENC, st.slice(0, -2) + 'AA', UID, NOW), K.verifyState(Buffer.alloc(32, 8), st, UID, NOW), K.verifyState(ENC, '', UID, NOW)], [true, true, false, false, false, false, false])
      const calls = []
      const fake = (status, text) => async (url, opt) => { calls.push({ url, opt }); return { ok: status < 400, status, text: async () => text } }
      const OK = JSON.stringify({ access_token: 'AT', expires_at: '2026-10-01T14:00:00.000', refresh_token: 'RT', refresh_token_expires_at: '2026-10-15T12:00:00.000', client_id: 'CID12345', mall_id: 'myshop', user_id: 'u', scopes: ['mall.read_product', 'mall.write_product', 'mall.read_category'], issued_at: '2026-10-01T12:00:00.000', shop_no: '1' })
      const base = { mallId: 'myshop', clientId: 'CID12345', clientSecret: 'SECRET999', breakerKey: 'ok' }
      const tok = await K.exchangeCode({ ...base, fetchImpl: fake(200, OK) }, 'CODE1')
      const b1 = new URLSearchParams(calls[0].opt.body)
      eq('코드 교환(가짜 응답): 공식 주소 · Basic(client_id:secret) · form · 시크릿은 본문에 없음 · 시각은 한국 시각으로 읽음', [calls[0].url, calls[0].opt.method, calls[0].opt.headers.Authorization, calls[0].opt.headers['Content-Type'], [...b1.entries()], calls[0].opt.body.includes('SECRET999'), tok.accessToken, tok.refreshToken, tok.accessExpiresAt, tok.refreshExpiresAt, tok.mallId, K.missingScopes(tok.scopes)], ['https://myshop.cafe24api.com/api/v2/oauth/token', 'POST', `Basic ${Buffer.from('CID12345:SECRET999').toString('base64')}`, 'application/x-www-form-urlencoded', [['grant_type', 'authorization_code'], ['code', 'CODE1'], ['redirect_uri', K.CAFE24_REDIRECT_URI]], false, 'AT', 'RT', '2026-10-01T05:00:00.000Z', '2026-10-15T03:00:00.000Z', 'myshop', []])
      await K.refreshAccess({ ...base, breakerKey: 'rf', fetchImpl: fake(200, OK) }, 'RT-OLD')
      eq('갱신 = grant_type refresh_token + 예전 refresh 토큰 (새 토큰을 받는다)', [...new URLSearchParams(calls[1].opt.body).entries()], [['grant_type', 'refresh_token'], ['refresh_token', 'RT-OLD']])
      const codes = []
      for (const [s, t, k] of [[401, '{"error":"invalid_client"}', 'a'], [400, '{"error":"invalid_grant","error_description":"code expired"}', 'b'], [400, '{"error":"invalid_request","error_description":"redirect_uri mismatch"}', 'c'], [200, '{"access_token":"x"}', 'd'], [429, '', 'e'], [503, '', 'f']]) {
        try { await K.exchangeCode({ ...base, breakerKey: k, fetchImpl: fake(s, t) }, 'C') } catch (e) { codes.push(e.code) }
      }
      let down = ''
      try { await K.exchangeCode({ ...base, breakerKey: 'g', fetchImpl: async () => { throw new Error('down') } }, 'C') } catch (e) { down = e.code }
      eq('토큰 오류: 키 틀림 · 동의 시간 지남 · 돌아오는 주소 다름 · 응답 모양 이상 · 너무 잦음 · 장애 · 끊김', [...codes, down], ['bad_key', 'code_expired', 'bad_redirect', 'market_bad_json', 'rate_limited', 'market_server', 'market_unreachable'])
      eq('권한이 빠지면 목록 · 갱신 시점 = refresh 만료 7일 안(지난 건 아님)', [K.missingScopes(['mall.read_product']), K.needsRefresh(new Date(Date.now() + 3 * 86400000).toISOString()), K.needsRefresh(new Date(Date.now() + 10 * 86400000).toISOString()), K.needsRefresh(new Date(Date.now() - 1000).toISOString())], [['mall.write_product', 'mall.read_category'], true, false, false])
      eq('카페24 = 중계 안 거침(IP 제한 없음) · 같은 브레이커 · 토큰은 로그에서 가림', [/relayUrl|x-relay-secret/.test(c24), /breakerFor\(`cafe24:/.test(c24), /"\$1":"\[가림\]"/.test(c24)], [false, true, true])
      eq('서버: 앱 값·토큰 모두 암호화 · 동의 전 pending · 상태 응답에 쇼핑몰 ID·끝 4자리만', [
        /market: CAFE24, seller_login_id: mallId, vendor_id: null,\s*access_key_enc: encryptSecret\(id, encKey\), secret_key_enc: encryptSecret\(secret, encKey\)/.test(api),
        /status: 'pending'/.test(api), /oauth_enc: encryptSecret\(JSON\.stringify\(\{ access_token: tok\.accessToken, refresh_token: tok\.refreshToken \}\), encKey\)/.test(api),
        /const CAFE24_PUBLIC = 'seller_login_id,key_last4,status,expires_at,last_checked_at,last_error,created_at'/.test(api),
        /oauth_enc|secret_key_enc|access_key_enc/.test(/function cafe24Public[\s\S]*?\n\}/.exec(api)[0]),
        /if \(!verifyState\(encKey, body\.state, ctx\.userId\)\)/.test(api), /missingScopes\(tok\.scopes\)/.test(api), /tok\.mallId !== cred\.call\.mallId/.test(api),
      ], [true, true, true, true, false, true, true, true])
      eq('SQL: 토큰 칸 · pending · 카페24 필수 칸 체크 · 되돌리기에 칸 삭제', [/add column oauth_enc text check \(oauth_enc is null or oauth_enc like 'v1:%'\)/.test(sql), /add column access_expires_at timestamptz/.test(sql), /status in \('connected', 'invalid', 'expired', 'pending'\)/.test(sql), /check \(market <> 'cafe24' or \(secret_key_enc is not null and \(status = 'pending' or \(oauth_enc is not null/.test(sql), /drop column if exists oauth_enc/.test(sql)], [true, true, true, true, true])
      eq('카페24 입력 검사 · 돌아온 주소 판별(c24. state만 — 로그인 ?code=와 안 섞임)', [R.cafe24KeyProblems({ mallId: 'myshop', clientId: 'CID12345', clientSecret: 'SECRET999' }), R.cafe24KeyProblems({ mallId: 'My Shop', clientId: 'x', clientSecret: '' }), R.isCafe24Return({ code: 'a', state: 'c24.x' }), R.isCafe24Return({ error: 'access_denied', state: 'c24.x' }), R.isCafe24Return({ code: 'a' }), R.isCafe24Return({ code: 'a', state: 'naver' })], [[], ['쇼핑몰 ID', 'Client ID', 'Client Secret'], true, true, false, false])
      eq('화면: 카드 = 관문 · Secret은 password 칸 · 끝 4자리만 · 돌아오면 code·state를 주소에서 뗌 · 연결 탭에 카드', [/await studioGate\('\/studio\/channels\/connect\?link=cafe24'\)/.test(c24Card), /type="password"[^>]*data-mk-c24-f-secret/.test(c24Card), /•••• \{\{ acc\.key_last4 \}\}/.test(c24Card), /const \{ code, state, error, error_description, \.\.\.rest \} = q\s+router\.replace\(\{ query: rest \}\)/.test(c24Card), /<StudioCafe24Card \/>/.test(mkView)], [true, true, true, true, true])
    }
    eq('상태 모듈: 로그인 전 안 부름 · 로그아웃이면 비움', [/if \(!currentUser\.value\?\.id\) \{ reset\(\); return \}/.test(read('src/lib/studioMarketLinks.js')), /addEventListener\('euchs-auth-changed', e => \{ reset\(\); if \(e\.detail\?\.user\) loadMarketLinks\(\) \}\)/.test(read('src/lib/studioMarketLinks.js'))], [true, true])
  }
  const screenText = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '') }
  const customer = ['src/views/studio/StudioMarketplaceView.vue', 'src/views/studio/StudioShippingView.vue', 'src/views/studio/StudioSettingsView.vue', 'src/views/studio/StudioChannelsView.vue', 'src/views/studio/StudioChannelSendView.vue', 'src/views/studio/StudioChannelSentView.vue', 'src/views/studio/StudioLandingView.vue', 'src/components/studio/StudioSendModal.vue', 'src/components/studio/StudioSendCoupang.vue', 'src/components/studio/StudioTagChips.vue', 'src/components/studio/StudioShippingTemplates.vue', 'src/components/studio/StudioMarketplaceGuide.vue', 'src/components/studio/StudioSendList.vue', 'src/components/studio/StudioExportList.vue']
  eq('고객 화면에 "이어서 준비"·"부터 열려"·"곧"·"관리자" 없음', customer.filter(p => /이어서 준비|부터 열려|곧|관리자/.test(screenText(p))), [])
  eq('판매 방식 기억 = 템플릿마다 · 브라우저에만', [/studio-mk-sale-mode:\$\{id\}/.test(read('src/lib/studioMarketplace.js')), /rememberSaleMode\(f\.value\.templateId, key\)/.test(modal)], [true, true])
}

// ── 12. "내 상품" 명칭 · 보낼 판매처 체크 목록 · 판매처별 상태 배지 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const walk = dir => fs.readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(vue|js|mjs|css)$/.test(e.name) ? [`${dir}/${e.name}`] : [])

  // 3-1 명칭
  const left = [...walk('src'), ...walk('api')].filter(p => read(p).includes('완성작'))
  eq('"완성작"이 남은 파일 = 계정 탈퇴 API 주석 1곳뿐 (화면·스튜디오 서버 0건)', left, ['api/account-withdraw.js'])
  const list = read('src/components/studio/StudioExportList.vue')
  eq('내 작업 화면 영역 제목 = "내 상품"(판매처 > 보내기에서는 "보낼 상품 고르기") · 사이드바 "내 작업"·"보낸 상품"은 그대로', [/<h2 class="st-h-section">\{\{ pick \? '보낼 상품 고르기' : '내 상품' \}\}<\/h2>/.test(list), /label: '내 작업'/.test(read('src/layouts/StudioLayout.vue')), /<h2 class="st-h-section">보낸 상품<\/h2>/.test(read('src/components/studio/StudioSendList.vue'))], [true, true, true])
  eq('변수·DB 이름은 그대로 (studio_exports · exportId · exports_list)', [/studio_exports/.test(read('api/studio-upload.js')), /exportId/.test(read('src/components/studio/StudioSendCoupang.vue')), /exports_list/.test(read('api/studio-upload.js'))], [true, true, true])

  // 3-2 보낼 판매처
  const rowsOn = R.marketRows({ coupang: { connected: true } }), rowsOff = R.marketRows({ coupang: { connected: false } })
  eq('판매처 줄 = MARKETS와 같은 9곳·같은 순서', [rowsOn.map(r => r.name), rowsOn.map(r => r.key)], [R.MARKETS.map(m => m.name), R.MARKETS.map(m => m.key)])
  // S3-3: 보내기 창도 보내기 탭과 같은 규칙(channelRows) — 키 연결 판매처는 연결 상태, 나머지 5곳 = "예정"(planned). "준비 중"(soon) 없음
  eq('줄 상태: 연결됨 = connected · 연결 전 = locked · 스마트스토어·11번가·카페24 = 연결 상태(연결되면 linked) · 나머지 5곳 = planned', [rowsOn[0].state, rowsOff[0].state, R.marketRows()[0].state, Object.fromEntries(rowsOn.slice(1).map(r => [r.key, r.state])), R.marketRows({ cafe24: { connected: true } }).find(r => r.key === 'cafe24').state, R.marketRows === R.channelRows], ['connected', 'locked', 'locked', { smartstore: 'locked', '11st': 'locked', gmarket: 'planned', ably: 'planned', zigzag: 'planned', cafe24: 'locked', makeshop: 'planned', godomall: 'planned' }, 'linked', true])
  eq('처음 체크: 연결된 곳만 체크 · 연결 전이면 아무것도 체크 안 됨', [R.checkedMarkets(rowsOn, R.defaultChecked(rowsOn)), R.checkedMarkets(rowsOff, R.defaultChecked(rowsOff))], [['coupang'], []])
  eq('체크할 수 없는 줄은 값이 들어와도 보내지 않음', [R.checkedMarkets(rowsOn, { coupang: true, smartstore: true, cafe24: true }), R.checkedMarkets(rowsOff, { coupang: true })], [['coupang'], []])
  eq('버튼 글자: 1곳 = 이름 · 0곳·여러 곳 = "선택한 판매처로 보내기"', [R.sendButtonLabel(['coupang']), R.sendButtonLabel([]), R.sendButtonLabel(['coupang', 'smartstore']), R.sendButtonLabel(['11st']), R.sendButtonLabel(['smartstore'])], ['쿠팡으로 보내기', '선택한 판매처로 보내기', '선택한 판매처로 보내기', '11번가로 보내기', '스마트스토어로 보내기'])
  const shell = read('src/components/studio/StudioSendModal.vue')
  const shellShown = shell.slice(shell.indexOf('<template>'), shell.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  eq('보내기 창: "0. 보낼 판매처"가 맨 위 · 체크박스 줄 · 자물쇠 + [연결하기] · "예정" 배지(준비 중 없음 — S3-3)', [/0\. 보낼 판매처/.test(shellShown), shellShown.indexOf('data-mk-s-markets') < shellShown.indexOf('<component :is="SECTIONS[key]"'), /type="checkbox" :disabled="r\.state !== 'connected'/.test(shellShown), /<Lock /.test(shellShown), /:to="\{ name: 'studio-settings-marketplace' \}"[^>]*>연결하기</.test(shellShown), /v-else-if="r\.state === 'planned'" class="st-badge shrink-0"[^>]*>\{\{ PLANNED_LABEL \}\}</.test(shellShown) && !/준비 중/.test(shellShown)], [true, true, true, true, true, true])
  eq('보내기 창: 체크 0개 → 빠짐 목록 "보낼 판매처" · 버튼은 빠짐이 있으면 꺼짐', [/if \(!picked\.value\.length\) return \['보낼 판매처'\]/.test(shell), /:disabled="!canSend" data-mk-s-send/.test(shellShown)], [true, true])
  eq('재발 방지: 준비 데이터가 없거나 고른 판매처의 섹션이 안 떠 있으면 [보내기] 꺼짐 · 섹션 오류는 한 줄만', [
    shell.includes('const canSend = computed(() => !!props.prepare && sectionsReady.value && !sectionError.value && !sending.value && !sectionBusy.value && missing.value.length === 0)'),
    shell.includes('const sectionsReady = computed(() => picked.value.length > 0 && picked.value.every(key => !!SECTIONS[key] && !!sections[key]))'),
    shell.includes('onErrorCaptured(') && /sectionError\.value = true\s+return false/.test(shell), shell.includes('if (!canSend.value) return'),
    /<p v-if="sectionFailed"[^>]*data-mk-s-section-error>잠시 후 다시 시도해 주세요\.<\/p>/.test(shellShown),
  ], [true, true, true, true, true])
  {
    const cp = read('src/components/studio/StudioSendCoupang.vue')
    eq('쿠팡 섹션: uid를 f보다 먼저 선언 (선언 전에 쓰지 않음)', [cp.indexOf('let uid = 0') > 0, cp.indexOf('let uid = 0') < cp.indexOf('const f = ref(blank())')], [true, true])
    eq('재고 수량: 기본값 비움(1688 재고를 넣지 않음) · 필수 · 빠짐 목록 "재고 수량" · 일괄 입력 · maximumBuyCount', [
      cp.includes('stock: null, stock1688: null'), cp.includes('it.stock = row.stock'), cp.includes('out.push(`${tag}재고 수량`)'),
      cp.includes('<th class="c-stock">재고 수량 *</th>'), cp.includes('data-mk-s-bulk-stock'), cp.includes('if (Number.isInteger(b.stock) && b.stock >= 0) it.stock = b.stock'),
      cp.includes('stock: it.stock, sku: it.sku'), read('api/_coupang.js').includes('maximumBuyCount: stock'),
    ], [true, false, true, true, true, true, true, true])
    eq('서버: 재고가 비면 본문을 만들지 않음 (임의 숫자로 채우지 않음) · 0과 37은 그대로', [C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], stock: null }] }).ok, C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], stock: '' }] }).ok, C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], stock: 0 }] }).body.items[0].maximumBuyCount, C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], stock: 37 }] }).body.items[0].maximumBuyCount], [false, false, 0, 37])
  }
  eq('판매처별 섹션 컴포넌트 분리: 쿠팡 항목은 쿠팡 섹션에만 · 체크됐을 때만 보임', [/const SECTIONS = \{ coupang: StudioSendCoupang \}/.test(shell), /v-show="picked\.includes\(key\)"/.test(shellShown), /data-mk-s-mode-pick|saleMode|noticeItems/.test(shell), /defineExpose\(\{ missing, busy, done, submit \}\)/.test(read('src/components/studio/StudioSendCoupang.vue'))], [true, true, false, true])
  {
    // 체크를 풀었다 다시 켜도 값이 남는다 — 섹션은 체크와 상관없이 만들어 두고(v-show로 가리기만), 빠짐·보내기는 체크된 것만
    const on = R.marketRows({ coupang: { connected: true } })
    eq('체크를 풀어도 섹션은 그대로(값 유지): 만들 섹션은 체크와 무관 · v-show로 가림 · 보내기는 체크된 것만', [
      R.sectionKeys(on, ['coupang']), R.checkedMarkets(on, { coupang: false }), R.checkedMarkets(on, { coupang: true }), R.sectionKeys(R.marketRows({ coupang: { connected: false } }), ['coupang']), R.sectionKeys(on, []),
      /v-for="key in mounted"/.test(shellShown), /<component :is="SECTIONS\[key\]" v-show="picked\.includes\(key\)"/.test(shellShown), /<component[^>]*v-if=/.test(shellShown), /v-for="key in picked"/.test(shellShown), /for \(const key of picked\.value\)/.test(shell),
    ], [['coupang'], [], ['coupang'], [], [], true, true, false, false, true])
  }
  eq('연결 전에도 창을 연다 (not_connected로 돌려보내지 않음)', /status: 'not_connected'/.test(read('src/lib/studioMarketplace.js')), false)

  // 3-3 상태 배지
  const S = (id, exportId, market, status, createdAt, reason) => ({ id, exportId, market, status, createdAt, reason })
  const by = R.sendsByExport([
    S('a', 'E1', 'coupang', 'failed', '2026-09-28T01:00:00Z', '대표 이미지에 글자가 있습니다'), S('b', 'E1', 'coupang', 'approval_pending', '2026-09-28T03:00:00Z'),
    S('c', 'E1', 'smartstore', 'rejected', '2026-09-28T02:00:00Z', '카테고리가 맞지 않습니다'), S('d', 'E2', undefined, 'approved', '2026-09-28T02:00:00Z'), S('e', null, 'coupang', 'failed', '2026-09-28T04:00:00Z'),
  ])
  eq('배지 줄: 판매처마다 최신 1건 · MARKETS 순서 · 안 보낸 판매처는 없음', [by.E1.map(s => [s.market, s.id, s.status]), by.E2.map(s => [s.market, s.id]), Object.keys(by)], [[['coupang', 'b', 'approval_pending'], ['smartstore', 'c', 'rejected']], [['coupang', 'd']], ['E1', 'E2']])
  eq('배지 줄: 목록이 비거나 이상해도 빈 값', [R.sendsByExport([]), R.sendsByExport(null)], [{}, {}])
  eq('배지 색: 승인 대기 회색 · 승인 초록 · 반려·실패 빨강', R.SEND_BADGE_CLASS, { sending: 'st-badge', approval_pending: 'st-badge', approved: 'st-badge st-badge-ok', rejected: 'st-badge st-badge-danger', failed: 'st-badge st-badge-danger' })
  eq('초록 배지 색 = 스튜디오 토큰', /\.studio-root \.st-badge-ok \{[^}]*var\(--st-success\)/.test(read('src/styles/studio-tokens.css')), true)
  eq('툴팁: 반려·실패만 · 기록된 사유 그대로', [R.badgeReason(by.E1[1]), R.badgeReason(by.E1[0]), R.badgeReason({ status: 'approved', reason: 'x' }), R.badgeReason({ status: 'failed', reason: null }), R.badgeReason(null)], ['카테고리가 맞지 않습니다', '', '', '', ''])
  const listShown = list.slice(list.indexOf('<template>'), list.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  eq('내 상품 카드(판매처 > 보내기): 판매처별 배지 줄 · 툴팁 · 누르면 [보낸 상품] 탭 그 줄로', [/v-for="s in sendsOf\[x\.id\]"/.test(listShown), /:title="badgeReason\(s\) \|\| undefined"/.test(listShown), /@click\.stop="\$emit\('goto-send', s\.id\)"/.test(listShown), /@goto-send="gotoSent"/.test(read('src/views/studio/StudioChannelSendView.vue')), /name: 'studio-channels-sent', query: \{ focus: String\(id\) \}/.test(read('src/views/studio/StudioChannelSendView.vue')), /sendList\.value\?\.focus\(hit\.id\)/.test(read('src/views/studio/StudioChannelSentView.vue')), /defineExpose\(\{ load, clear, focus \}\)/.test(read('src/components/studio/StudioSendList.vue'))], [true, true, true, true, true, true, true])

  // 공통 — 고객 화면 문구
  const shownOf = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '') }
  {
    // 후속: 편집기·배경 쪽까지 — src·api 전체에 사정 설명 문구가 없다 (grep -rn "준비하고\|곧 \|관리자에게\|쿠팡부터" src api 와 같은 검사)
    const hits = [...walk('src'), ...walk('api')].filter(p => /준비하고|곧 |관리자에게|쿠팡부터/.test(read(p)))
    eq('src·api 전체에 "준비하고"·"곧 "·"관리자에게"·"쿠팡부터" 0건', hits, [])
    // S3-3: 예고 문구 금지의 예외는 판매처 "예정" 한 단어뿐 — 스튜디오 화면·규칙 파일에서 '예정' 글자는 PLANNED_LABEL 한 곳 (+ 예전부터 있던 새 소식 분류 이름)
    const noComment = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    const studioFiles = [...walk('src/views/studio'), ...walk('src/components/studio'), ...walk('src/lib').filter(p => /\/studio[^/]*\.js$/.test(p))]
    const yejeong = studioFiles.filter(p => /예정/.test(noComment(read(p)))).sort()
    eq('스튜디오에서 "예정" 글자 = 판매처 PLANNED_LABEL 한 곳 (+ 새 소식 분류 이름) · 화면은 PLANNED_LABEL로만', [yejeong, (noComment(read('src/lib/studioMarketplaceRules.js')).match(/예정/g) || []).length], [['src/lib/studioMarketplaceRules.js', 'src/views/studio/StudioHomeView.vue', 'src/views/studio/StudioLandingView.vue'], 1])
    const bg = read('src/components/studio/StudioBgPanel.vue')
    eq('배경합성 패널: 쓸 수 없는 상태면 버튼·안내를 그리지 않음', [/data-bg-soon|data-bg-gen-soon|data-bg(-gen)?-status="not_ready"/.test(bg), (bg.match(/reason === 'no_key' \|\| (status|genStatus)\.reason === 'no_table'" \/>/g) || []).length], [false, 2])
    const ed = read('src/views/studio/StudioEditorView.vue')
    eq('편집기 막대: 아직 없는 [저장값]은 그리지 않음 (hidden) · 나머지 6개', [/v-for="t in RAIL_SHOWN"/.test(ed), /key: 'saved',[^\n]*hidden: true/.test(ed), /const RAIL_SHOWN = RAIL\.filter\(r => !r\.hidden\)/.test(ed), (/const RAIL = \[([\s\S]*?)\n\]/.exec(ed)[1].match(/key: '/g) || []).length - 1], [true, true, true, 6])
    eq('템플릿 패널: 내 템플릿 칸 없음 · 진행 단계 표시줄: 예고 글자 없음', [/data-my-templates/.test(read('src/components/studio/StudioTemplatePanel.vue')), /data-step-soon/.test(read('src/components/studio/StudioStepBar.vue'))], [false, false])
    const up = read('api/studio-upload.js')
    eq('배경 서버 문구: 쓸 수 없는 상태 = "잠시 후 다시 시도해 주세요."', [...up.matchAll(/sendError\(res, 503, '(bg_not_ready|bg_gen_sql_missing)', '([^']*)'\)/g)].map(m => m[2]).filter(t => t !== '잠시 후 다시 시도해 주세요.'), [])
  }
  const screens = ['src/components/studio/StudioSendModal.vue', 'src/components/studio/StudioSendCoupang.vue', 'src/components/studio/StudioExportList.vue', 'src/components/studio/StudioSendList.vue', 'src/components/studio/StudioTagChips.vue', 'src/views/studio/StudioMarketplaceView.vue', 'src/views/studio/StudioShippingView.vue', 'src/views/studio/StudioSettingsView.vue', 'src/views/studio/StudioLandingView.vue']
  eq('고객 화면에 "관리자에게"·"곧"·"준비하고 있어요"·"쿠팡부터" 없음', screens.filter(p => /관리자에게|곧|준비하고 있|쿠팡부터/.test(shownOf(p))), [])
  const api = read('src/lib/studioApi.js')
  const tableOf = name => new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\}`).exec(api)[1].replace(/\/\/.*$/gm, '')
  eq('오류 문구 표(내 상품 보관·판매처·공통)에 "준비하고 있어요"·"곧"·"관리자" 없음', ['EXPORT', 'MARKETPLACE', 'COMMON'].filter(n => /준비하고 있|곧|관리자/.test(tableOf(n))), [])
}

// ── 13. 보내기 창 고치기 4건 (2026-09-28 운영 확인): 창 폭·옵션 표 / 상품명 한글 / 옵션 한글화 / 태그 추천 재료 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const cp = read('src/components/studio/StudioSendCoupang.vue'), shell = read('src/components/studio/StudioSendModal.vue'), modalBox = read('src/components/studio/StudioModal.vue')

  // 1) 창 폭 · 옵션 표
  eq('1 창 폭: 보내기 창 = 화면 폭 90%(최대 1400px) · 다른 창의 wide는 그대로', [/<StudioModal :open="open" :title="prepare\?\.resend \? '고쳐서 다시 보내기' : '판매처로 보내기'" full /.test(shell), modalBox.includes("full ? 'w-[90vw] max-w-[1400px]' : wide ? 'w-full max-w-2xl' : 'w-full max-w-md'")], [true, true])
  eq('1 옵션 표: 가로 스크롤 없음 · 칸 폭 고정 배치 · 입력 칸은 칸 폭에 맞춤', [/overflow-x-auto[^"]*"[^>]*>\s*<table class="opt-table"/.test(cp), /\.opt-table \{[^}]*table-layout: fixed/.test(cp), /\.opt-in \{ width: 100%; min-width: 0;/.test(cp), /class="st-input w-\[\d+px\]"[^>]*data-mk-s-(stock|sku|price|opt)=/.test(cp)], [false, true, true, false])
  const fixedCss = ['c-img', 'c-price', 'c-price', 'c-rate', 'c-stock', 'c-sku', 'c-gtin', 'c-del'].reduce((n, c) => n + Number(new RegExp(`\\.opt-table \\.${c} \\{ width: (\\d+)px`).exec(cp)?.[1] || NaN), 0)
  eq('1 옵션 표: 화면의 고정 칸 폭 합 = 규칙 파일 숫자', [fixedCss, Number(/\.opt-table \.c-cny \{ width: (\d+)px/.exec(cp)?.[1])], [R.OPTION_FIXED_PX, R.OPTION_CNY_PX])
  eq('1 표/카드: 1440·1280 화면(옵션 종류 1개·1688 가격) = 표 · 폰 390 = 카드 · 자리가 모자라면 카드', [
    R.optionTableMode({ width: 1236, viewport: 1440, flexCols: 2, hasCny: true }), R.optionTableMode({ width: 1092, viewport: 1280, flexCols: 2, hasCny: true }),
    R.optionTableMode({ width: 303, viewport: 390, flexCols: 2, hasCny: true }), R.optionTableMode({ width: 1092, viewport: 1280, flexCols: 7, hasCny: true }), R.optionTableMode({ width: 1236, viewport: 1440, flexCols: 4, hasCny: true }),
  ], ['table', 'table', 'cards', 'cards', 'table'])
  eq('1 표/카드: 자리 폭을 모르면(가려진 섹션) 화면 폭으로 어림 · 아무것도 모르면 표', [R.optionTableMode({ width: 0, viewport: 1440, flexCols: 2, hasCny: true }), R.optionTableMode({ width: 0, viewport: 800, flexCols: 2, hasCny: true }), R.optionTableMode({})], ['table', 'cards', 'table'])
  eq('1 표일 때 늘어나는 칸은 최소 폭 이상', [R.optionTableNeed({ flexCols: 2, hasCny: true }) <= 1092, (1092 - R.OPTION_FIXED_PX - R.OPTION_CNY_PX) / 2 >= R.OPTION_FLEX_MIN], [true, true])
  eq('1 카드형: 옵션 1개 = 카드 1장 · 칸마다 이름표(data-label) · 표 머리 숨김', [/\.opt-wrap\.is-cards tr \{ display: grid;/.test(cp), /td\[data-label\]::before \{ content: attr\(data-label\)/.test(cp), /\.opt-wrap\.is-cards thead \{ display: none; \}/.test(cp), (cp.match(/<td[^>]*data-label="/g) || []).length >= 9, /:class="\{ 'is-cards': optMode === 'cards' \}"/.test(cp)], [true, true, true, true, true])

  // 2) 상품명 기본값 = 한글만
  const ZH_TITLE = '跨境新款黑色波点发夹女士发饰'
  eq('2 상품명 기본값: 작업의 한글 이름 먼저 · 없으면 가져온 제목의 한글 · 그것도 없으면 빈칸', [
    F.pickKoreanName(['도트 헤어핀 모음', ZH_TITLE, '물방울 헤어핀']), F.pickKoreanName([ZH_TITLE, ZH_TITLE, '물방울 헤어핀']), F.pickKoreanName([ZH_TITLE, ZH_TITLE, null]), F.pickKoreanName(['헤어핀 发夹', '', undefined]), F.pickKoreanName(null),
  ], ['도트 헤어핀 모음', '물방울 헤어핀', '', '', ''])
  eq('2 상품명 기본값 100자까지', F.pickKoreanName(['가나다 '.repeat(40)]).length <= 100, true)
  eq('2 세 이름 중 하나라도 번역 안 된 글자가 있으면 막음', [F.namesNeedKorean({ productName: '헤어핀', displayName: '', generalName: '' }), F.namesNeedKorean({ productName: ZH_TITLE }), F.namesNeedKorean({ productName: '헤어핀', displayName: '이유씨 发夹' }), F.namesNeedKorean({ productName: '헤어핀', generalName: '发夹' }), F.namesNeedKorean()], [false, true, true, true, false])
  eq('2 화면: 기본값은 pickKoreanName(작업 이름 → 내 상품 이름 → 가져온 제목 한글) · 빠짐 목록 "상품명 한글" · placeholder', [
    cp.includes('f.value.productName = pickKoreanName([p?.export?.projectTitle, p?.export?.title, source.value?.title?.ko])'), cp.includes("if (namesBad.value) out.push('상품명 한글')"),
    /:placeholder="NAME_HINT" data-mk-s-name/.test(cp), /p\.ko \|\| p\.zh/.test(cp), /String\(p\?\.export\?\.title \|\| ''\)/.test(cp),
  ], [true, true, true, false, false])
  eq('2 서버: 번역 안 된 글자가 남은 이름은 본문을 만들지 않음 (등록상품명·노출상품명·제품명)', [C.buildProductBody({ ...BASE, productName: ZH_TITLE }).ok, C.buildProductBody({ ...BASE, displayName: '이유씨 发夹' }).ok, C.buildProductBody({ ...BASE, generalName: '发夹' }).ok, C.buildProductBody({ ...BASE, productName: ZH_TITLE }).message, C.buildProductBody({ ...BASE }).ok], [false, false, false, '상품명을 한글로 고쳐 주세요.', true])
  eq('2 서버: send_prepare가 작업의 지금 이름(projectTitle)을 준다', read('api/marketplace.js').includes("projectTitle: projRows?.[0]?.title || ''"), true)

  // 3) 옵션 이름·색상값 한글화
  eq('3 옵션 글자 읽기: 색 + 무늬 (사전에 없는 말은 버리고 표시)', [F.readOptionText('黑色波点发夹'), F.readOptionText('红色条纹'), F.readOptionText('藏青色'), F.readOptionText('36-37'), F.readOptionText('XL'), F.readOptionText('2个装'), F.readOptionText('A款'), F.readOptionText('发夹')], [
    { label: '블랙 도트', color: '블랙', complete: false }, { label: '레드 스트라이프', color: '레드', complete: true }, { label: '네이비', color: '네이비', complete: true },
    { label: '36-37', color: '', complete: true }, { label: 'XL', color: '', complete: true }, { label: '2개', color: '', complete: false }, { label: 'A타입', color: '', complete: true }, { label: '', color: '', complete: false },
  ])
  eq('3 한 글자 색은 색 종류 칸에서만', [F.readOptionText('黑', { colorType: true }).color, F.readOptionText('黑').color, F.readOptionText('白发夹', { colorType: true }).label], ['블랙', '', '화이트'])
  eq('3 번역문에서 색 이름만', [F.colorNameOf('검은색 물방울 무늬 헤어핀'), F.colorNameOf('진한 파란색 줄무늬'), F.colorNameOf('헤어핀'), F.colorNameOf('')], ['블랙', '네이비', '', ''])
  eq('3 옵션 종류: 색 종류인지 · 번역이 없으면 표준 이름', [F.isColorOption(['색상', '颜色']), F.isColorOption(['颜色分类']), F.isColorOption(['尺码']), F.optionTypeKo([null, '颜色'].filter(Boolean)), F.optionTypeKo(['컬러', '颜色']), F.optionTypeKo(['香味'])], [true, true, false, '색상', '컬러', ''])
  const V = (n, nk, v, vk) => ({ name: { zh: n, ko: nk }, value: { zh: v, ko: vk } })
  const kr = F.koreanizeSkus([
    { values: [V('颜色', null, '黑色波点发夹', null), V('尺码', '사이즈', '36-37', null)] },
    { values: [V('颜色', null, '红色条纹发夹', null), V('尺码', '사이즈', '38-39', null)] },
    { values: [V('颜色', null, '藏青色', '남색'), V('尺码', '사이즈', '38-39', null)] },
  ])
  eq('3 가져온 옵션 → 한글 기본값: 옵션 이름 "블랙 도트 36-37" · 색상값은 색 이름만 · 가져온 글자는 따로', [kr.types.map(t => [t.key, t.label, t.isColor]), kr.rows], [
    [['颜色', '색상', true], ['尺码', '사이즈', false]],
    [{ name: '블랙 도트 36-37', opt: { 颜色: '블랙', 尺码: '36-37' }, original: '黑色波点发夹 36-37' }, { name: '레드 스트라이프 38-39', opt: { 颜色: '레드', 尺码: '38-39' }, original: '红色条纹发夹 38-39' }, { name: '네이비 38-39', opt: { 颜色: '네이비', 尺码: '38-39' }, original: '藏青色 38-39' }],
  ])
  const same = F.koreanizeSkus([{ values: [V('颜色', '색상', '黑色波点', null)] }, { values: [V('颜色', '색상', '黑色条纹', null)] }, { values: [V('颜色', '색상', '黑色发夹', '검은색 헤어핀')] }, { values: [V('颜色', '색상', '黑色发圈', null)] }, { values: [V('颜色', '색상', '奶茶色', null)] }])
  eq('3 색 이름이 겹치면 색 + 무늬로 (구매옵션 값이 같으면 등록 불가) · 사전 글자가 겹치면 번역 캐시 · 둘 다 없으면 빈칸', same.rows.map(r => [r.name, r.opt['颜色']]), [['블랙 도트', '블랙 도트'], ['블랙 스트라이프', '블랙 스트라이프'], ['검은색 헤어핀', '검은색 헤어핀'], ['', ''], ['', '']])
  eq('3 어디에도 번역 안 된 글자를 넣지 않음', [...kr.rows, ...same.rows].some(r => F.hasUntranslated(r.name) || Object.values(r.opt).some(F.hasUntranslated)), false)
  eq('3 번역 캐시의 한글에 번역 안 된 글자가 섞였으면 쓰지 않음', F.koreanizeSkus([{ values: [V('款式', null, '蝴蝶发夹', '나비 发夹')] }]).rows[0], { name: '', opt: { 款式: '' }, original: '蝴蝶发夹' })
  eq('3 값 30자·이름 150자', (() => { const r = F.koreanizeSkus([{ values: [V('款式', '스타일', '发夹', '가'.repeat(40))] }]).rows[0]; return [r.opt['款式'].length, r.name.length] })(), [30, 40])
  eq('3 화면: 옵션 표는 koreanizeSkus를 씀 · 빈 옵션 이름을 상품명으로 채우지 않음 · 가져온 글자는 칸 아래·placeholder', [cp.includes('const kr = koreanizeSkus(s.skus, { valueMax: ATTR_VALUE_MAX, nameMax: 150 })'), /items\[0\]\.name = f\.value\.productName/.test(cp), /data-mk-s-origin/.test(cp), /:placeholder="it\.originals\[t\.key\] \|\| /.test(cp)], [true, false, true, true])

  // 4) 검색태그 추천
  const bad = ['이우', '타오바오', '경동', '이베이', '아마존', '소원']
  const tg = F.suggestSearchTags({ title: '이우 여성 도트 헤어핀 타오바오 아마존 인기', categoryName: '패션잡화>헤어액세서리>헤어핀', options: ['블랙 도트', '레드', 'XL', '36-37', '소원', '경동'], brand: '이유씨' })
  eq('4 태그 추천: 지명·플랫폼 이름·뜻 없는 말 없음 (운영에서 나온 6개)', bad.filter(b => tg.some(t => t.includes(b))), [])
  eq('4 태그 추천: 상품명·카테고리·옵션에서 나온 말만', [tg[0], tg.includes('여성'), tg.includes('도트'), tg.includes('블랙'), tg.includes('레드'), tg.includes('XL'), tg.some(t => /\d/.test(t))], ['헤어핀', true, true, true, true, false, false])
  eq('4 태그 추천: 가져온 상품의 속성(attrs)은 재료가 아님', [F.suggestSearchTags({ title: '도트 헤어핀', attrs: [{ name: '주요 판매 플랫폼', value: '이베이 아마존 소원' }, { name: '산지', value: '이우' }, { name: '소재', value: '합금' }] }), /attrs: koAttrs|source\.value\?\.attrs/.test(cp), cp.includes('options: [...new Set(optionValueList())]')], [['도트', '헤어핀', '도트헤어핀'], false, true])
  eq('4 플랫폼 이름은 고객이 직접 넣어도 뺌(남의 상표와 같게) · 서버도 같은 규칙', [F.cleanSearchTags(['타오바오 헤어핀', 'Amazon', '알리익스프레스', '헤어핀']).tags, F.cleanSearchTags(['테무']).removed[0].reason, C.buildProductBody({ ...BASE, searchTags: ['헤어핀', '이베이'] }).body.items[0].searchTags], [['헤어핀'], '다른 회사 상표', ['헤어핀']])
  eq('4 지명·뜻 없는 말은 추천에서만 뺌 (통째로 같을 때만 — "소원팔찌"는 남음)', [F.suggestSearchTags({ title: '소원팔찌 이우 기타 중국' }), F.cleanSearchTags(['소원팔찌', '제주']).tags], [['소원팔찌'], ['소원팔찌', '제주']])
  eq('4 규칙은 api/_coupangFields.js 한 곳 (화면·태그 칩에 따로 적은 목록 없음)', [/타오바오|이베이|아마존/.test(cp + read('src/components/studio/StudioTagChips.vue')), F.PLATFORM_WORDS.includes('타오바오') && F.SUGGEST_DROP_WORDS.includes('이우')], [false, true])
}

// ── 14. 브랜드는 선택(brandId) · 옵션 이름 자동 생성 (2026-09-28 운영 거절 "브랜드 ID가 필요합니다") ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const cp = read('src/components/studio/StudioSendCoupang.vue')
  const shown = cp.slice(cp.indexOf('<template>'), cp.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')

  // 브랜드
  eq('브랜드 검색 경로 = 문서(58230017410841)', C.PATHS.brandSearch, '/v2/providers/seller_api/apis/api/v1/marketplace/brands/search')
  const found = F.normalizeBrands({ code: 'SUCCESS', data: { totalCount: 3, items: [{ brandId: 'KR-5', brandName: 'NIKE', isUIDRequired: true, allowedUIDTypes: ['GTIN', 'MPN'] }, { brandId: 'KR-5', brandName: 'NIKE' }, { brandId: '', brandName: '이름만' }, { brandId: 'KR-6', brandName: 'NIKE KIDS' }] } })
  eq('브랜드 검색 응답 읽기: brandId·이름·UID 필요 여부 · 중복·이상한 줄 뺌', [found, F.normalizeBrands(null), F.normalizeBrands({ data: { items: 'x' } })], [[{ brandId: 'KR-5', brandName: 'NIKE', uidRequired: true, uidTypes: ['GTIN', 'MPN'] }, { brandId: 'KR-6', brandName: 'NIKE KIDS', uidRequired: false, uidTypes: [] }], [], []])
  eq('브랜드 고르기: 0개 = 없음 · 이름이 통째로 같은 하나 = 그것 · 하나뿐 = 그것 · 아니면 고객이 고름', [F.pickBrand([], 'x').state, F.pickBrand(found, 'nike').brand.brandId, F.pickBrand([found[1]], '나이키').brand.brandId, F.pickBrand(found, 'nik').state, F.pickBrand(found, 'nik').brands.length], ['none', 'KR-5', 'KR-6', 'many', 2])
  eq('안내 문구 (쿠팡에 없는 브랜드)', F.BRAND_NOT_FOUND, '쿠팡에 등록된 브랜드가 아니에요. 브랜드 없음으로 보내거나 Wing 브랜드 관리에서 먼저 등록해 주세요.')
  eq('상품명에 알려진 브랜드 이름이 있는지', [F.brandWordIn('나이키 스타일 운동화', ''), F.brandWordIn('도트 헤어핀', '여성 헤어핀'), F.brandWordIn()], ['나이키', '', ''])
  eq('화면: "브랜드 없음" 체크(기본) · 체크면 입력 꺼짐 · [브랜드 찾기] · 여러 개면 고르기 · 경고 한 줄', [/type="checkbox" data-mk-s-no-brand/.test(shown), /:disabled="f\.noBrand" placeholder="브랜드 이름" data-mk-s-brand/.test(shown), /data-mk-s-brand-find/.test(shown), /v-if="!f\.noBrand && brandChoices\.length > 1"[^>]*data-mk-s-brand-pick/.test(shown), /data-mk-s-brand-warn/.test(shown), shown.includes('상품명에 브랜드 이름이 들어 있으면 "브랜드 없음"을 풀고 브랜드를 넣어 주세요.')], [true, true, true, true, true, true])
  eq('화면: 브랜드 없음이면 brand·brandId를 비워 보냄 · 빠짐 목록에 브랜드 필수 없음 · 없는 브랜드면 보내기 막음', [cp.includes("brand: brandOut.value, brandId: v.noBrand ? '' : v.brandId, manufacture: v.manufacture,"), cp.includes("const brandOut = computed(() => (f.value.noBrand ? '' : f.value.brand))"), /out\.push\('브랜드 \(없으면 자체브랜드명\)'\)/.test(cp), cp.includes("else if (brandNote.value === BRAND_NOT_FOUND) out.push('쿠팡에 등록된 브랜드')"), cp.includes('if (!v.noBrand) {')], [true, true, false, true, true])
  eq('요약 표: 브랜드 없음 / 브랜드 (brandId) · 제조사는 넣은 것만', [F.previewRows({ noBrand: true, brand: 'x' }).find(r => r.label === '브랜드').value, F.previewRows({ brand: '이유씨', brandId: 'KR-77' }).find(r => r.label === '브랜드').value, F.previewRows({ brand: '이유씨' }).find(r => r.label === '제조사').value], ['브랜드 없음', '이유씨 (KR-77)', ''])

  // 옵션 이름 자동
  eq('옵션 이름: 색상만 → "블랙" · 색상+사이즈 → "블랙 / M"', [F.autoItemNames([['블랙'], ['화이트']]), F.autoItemNames([['블랙', 'M'], ['블랙', 'L']])], [['블랙', '화이트'], ['블랙 / M', '블랙 / L']])
  eq('옵션 이름: 같은 이름이 또 나오면 뒤에 번호 · 빈 값은 건너뜀 · 값이 없으면 빈 이름', [F.autoItemNames([['블랙'], ['블랙'], ['블랙'], ['', ' M '], [], [null]]), F.autoItemNames(null)], [['블랙', '블랙 2', '블랙 3', 'M', '', ''], []])
  eq('옵션 이름 150자까지 (번호가 붙어도)', F.autoItemNames([['가'.repeat(200)], ['가'.repeat(200)]]).map(n => [n.length, n.endsWith(' 2')]), [[150, false], [150, true]])
  eq('서버: 옵션 이름을 안 보내면 구매옵션 값으로 만듦 · 보낸 이름은 그대로', [
    C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], name: '', attributes: { 색상: '블랙', 사이즈: 'M' } }, { ...BASE.items[0], name: '', sku: 'B', attributes: { 색상: '블랙', 사이즈: 'L' } }] }).body.items.map(i => i.itemName),
    C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], name: '내가 쓴 이름' }] }).body.items[0].itemName,
    C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], name: '', attributes: {} }] }).ok,
  ], [['블랙 / M', '블랙 / L'], '내가 쓴 이름', false])
  eq('서버: 검색옵션(노출 안 함)은 옵션 이름에 안 넣음', C.buildProductBody({ ...BASE, attributeMeta: [{ name: '색상', exposed: true }, { name: '소재', exposed: false }], items: [{ ...BASE.items[0], name: '', attributes: { 색상: '블랙', 소재: '면' } }] }).body.items[0].itemName, '블랙')
  eq('화면: "옵션 이름" 열은 기본 숨김 · [옵션 이름 직접 쓰기] 링크 · 보낼 때 자동 이름', [/<th v-if="f\.manualNames">옵션 이름 \*<\/th>/.test(shown), /<td v-if="f\.manualNames" class="c-name"/.test(shown), /manualNames: false/.test(cp), /data-mk-s-names-toggle/.test(shown), shown.includes("'옵션 이름 직접 쓰기'"), cp.includes('name: itemNames.value[i],'), cp.includes('const autoNames = computed(() => autoItemNames(f.value.items.map(buyValuesOf)))')], [true, true, true, true, true, true, true])

  // 옵션 종류 2개 — 종류 수만큼 맞추기·열, 줄은 SKU 수만큼
  const two = F.extractSkus1688(ITEM_1688)
  const pairOf = zh => ({ zh, ko: null })
  const kr2 = F.koreanizeSkus(two.rows.map(r => ({ values: r.values.map(v => ({ name: pairOf(v.name), value: pairOf(v.value) })) })))
  eq('옵션 종류 2개(색상+사이즈): 종류 2 · 줄 = SKU 수 · 자동 이름', [kr2.types.map(t => t.label), kr2.rows.length, F.autoItemNames(kr2.rows.map(r => kr2.types.map(t => r.opt[t.key])))], [['색상', '사이즈'], 3, ['블랙 / 36-37', '화이트 / 36-37', '블랙 / 40-41']])
  eq('화면: 맞추기 줄·표 열이 옵션 종류 수만큼 (v-for)', [/<div v-for="t in f\.optionTypes" :key="t\.key" class="flex flex-wrap items-center gap-2 text-\[13px\]">/.test(shown), /<th v-for="t in f\.optionTypes" :key="t\.key">/.test(shown), /<td v-for="\(t, ti\) in f\.optionTypes" :key="t\.key"/.test(shown), /f\.value\.items = s\.skus\.map\(/.test(cp)], [true, true, true, true])
}

// ── 15. 쿠팡 승인반려 대응 (2026-09-28): 도서산간 택배사 · 상세 이미지 규격 · 고쳐서 다시 보내기 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const I = await import('../api/_coupangImage.js')
  const { default: sharp } = await import('sharp')

  // 1) 출고지에 등록된 도서산간 택배사
  eq('출고지 응답 remoteInfos 읽기: 쓸 수 있는 것만 · 중복 뺌 · 대문자', F.normalizeRemoteInfos([{ remoteInfoId: 1, deliveryCode: 'cjgls', jeju: 5000, notJeju: 2500, usable: true }, { deliveryCode: 'HANJIN', usable: false }, { deliveryCode: 'CJGLS', usable: true }, { deliveryCode: 'DIRECT', jeju: 0, notJeju: 0 }, null]), [{ code: 'CJGLS', jeju: 5000, notJeju: 2500 }, { code: 'DIRECT', jeju: 0, notJeju: 0 }])
  const P = remote => ({ kind: 'outbound', place_code: '100', address: remote === undefined ? { zip: '1' } : { zip: '1', remote } })
  eq('택배사 규칙: 등록된 택배사면 통과 · 아니면 막음 · 도서산간을 끄면 통과', [
    F.courierRule({ place: P([{ code: 'HANJIN' }, { code: 'LOTTE' }]), remoteOn: true, company: 'HANJIN' }).ok,
    F.courierRule({ place: P([{ code: 'HANJIN' }]), remoteOn: true, company: 'CJGLS' }),
    F.courierRule({ place: P([{ code: 'HANJIN' }]), remoteOn: false, company: 'CJGLS' }).ok,
  ], [true, { known: true, couriers: ['HANJIN'], canRemote: true, ok: false, reason: 'courier' }, true])
  eq('택배사 규칙: 등록된 것이 없으면 도서산간을 켤 수 없음 · 끄면 통과', [F.courierRule({ place: P([]), remoteOn: true, company: 'CJGLS' }), F.courierRule({ place: P([]), remoteOn: false, company: 'CJGLS' }).ok], [{ known: true, couriers: [], canRemote: false, ok: false, reason: 'none' }, true])
  eq('택배사 규칙: 출고지 정보를 아직 못 읽었으면(예전 저장분) 막지 않음', F.courierRule({ place: P(undefined), remoteOn: true, company: 'CJGLS' }), { known: false, couriers: [], canRemote: true, ok: true, reason: '' })
  eq('안내 문구', F.REMOTE_NONE_NOTE, 'Wing 출고지 관리에서 도서산간 택배사를 등록하면 켤 수 있어요')
  const TT = { name: 't', delivery_charge_type: 'FREE', delivery_charge: 0, free_ship_over_amount: 0, delivery_charge_on_return: 3000, return_charge: 3000, exchange_charge: 6000, outbound_shipping_time_day: 2, delivery_company_code: 'CJGLS', outbound_place_code: '100', return_center_code: '200', remote_area_deliverable: true }
  const PL = remote => [P(remote), { kind: 'return', place_code: '200', address: {} }]
  eq('템플릿 저장 검사: 다른 택배사 → 거절 · 등록된 택배사 → 통과 · 등록 없음 + 도서산간 켬 → 거절(이유 안내) · 끄면 통과', [
    C.validateTemplate(TT, PL([{ code: 'HANJIN' }])).ok, C.validateTemplate({ ...TT, delivery_company_code: 'HANJIN' }, PL([{ code: 'HANJIN' }])).ok,
    C.validateTemplate(TT, PL([])).ok, C.validateTemplate(TT, PL([])).message.includes(F.REMOTE_NONE_NOTE), C.validateTemplate({ ...TT, remote_area_deliverable: false }, PL([])).value.remote_area_deliverable,
  ], [false, true, false, true, false])
  const withRemote = remote => ({ ...BASE, places: BASE.places.map(p => (p.kind === 'outbound' ? { ...p, address: { ...p.address, remote } } : p)) })
  eq('보내기: 템플릿의 택배사가 출고지의 도서산간 택배사와 다르면 본문을 만들지 않음 · 같으면 통과', [C.buildProductBody(withRemote([{ code: 'HANJIN' }])).ok, C.buildProductBody(withRemote([{ code: 'HANJIN' }])).message, C.buildProductBody(withRemote([{ code: BASE.template.delivery_company_code }])).ok], [false, F.TEMPLATE_COURIER_FIX, true])
  const tpl = read('src/components/studio/StudioShippingTemplates.vue')
  eq('템플릿 화면: 택배사 선택지 = 규칙 함수 · 도서산간 끔 + 이유 한 줄 · 기존 템플릿을 열 때도 검사', [/v-for="\[code, name\] in courierChoices"/.test(tpl), /:disabled="!rule\.canRemote"/.test(tpl), /data-mk-template-remote-note/.test(tpl), /function startEdit\(t\) \{[\s\S]{0,200}applyCourierRule\(\)/.test(tpl), /courierRule\(/.test(tpl)], [true, true, true, true, true])

  // 2) 상세 이미지 규격
  eq('상세 이미지: 높이 300 → 500으로 채움 (한 장)', F.detailImagePlan({ key: '01', width: 780, height: 300 }), [{ key: '01', src: '01', x: 0, y: 0, w: 780, h: 300, outW: 780, outH: 500, changed: true }])
  eq('상세 이미지: 높이 7000 → 2조각 (3500 + 3500)', F.detailImagePlan({ key: '02', width: 780, height: 7000 }).map(p => [p.key, p.y, p.h, p.outW, p.outH, p.changed]), [['02p1', 0, 3500, 780, 3500, true], ['02p2', 3500, 3500, 780, 3500, true]])
  eq('상세 이미지: 규격 안이면 그대로 · 너비 300도 채움 · 높이 12001 → 3조각(빠지는 줄 없음) · 크기를 모르면 그대로', [
    F.detailImagePlan({ key: '03', width: 780, height: 5000 }).map(p => [p.key, p.changed]), F.detailImagePlan({ key: '04', width: 300, height: 900 })[0].outW,
    F.detailImagePlan({ key: '05', width: 1560, height: 12001 }).map(p => p.h), F.detailImagePlan({ key: '05', width: 1560, height: 12001 }).reduce((n, p) => n + p.h, 0), F.detailImagePlan({ key: '06' }).map(p => [p.key, p.changed]),
  ], [[['03', false]], 500, [4000, 4000, 4001], 12001, [['06', false]]])
  eq('상세 이미지: 모든 조각이 한 변 500~5000', [[780, 300], [780, 7000], [300, 300], [6000, 6000], [1560, 32767], [499, 5001]].every(([w, h]) => F.detailImagePlan({ key: '01', width: w, height: h }).every(p => p.outW >= 500 && p.outW <= 5000 && p.outH >= 500 && p.outH <= 5000)), true)
  eq('요약 표 "상세 이미지 N장 (쿠팡 규격 맞춤)" — 나눈 조각 수로', [F.detailImageLabel([{ key: '01', width: 780, height: 300 }, { key: '02', width: 780, height: 7000 }]), F.previewRows({ detailFiles: [{ key: '01', width: 780, height: 900 }] }).find(r => r.label === '상세 이미지').value, F.detailImageLabel([])], ['상세 이미지 3장 (쿠팡 규격 맞춤)', '상세 이미지 1장 (쿠팡 규격 맞춤)', ''])
  const red = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 0, b: 0 } } }).png().toBuffer()
  const short = await I.renderDetailPiece(await red(780, 300), F.detailImagePlan({ key: '01', width: 780, height: 300 })[0])
  const shortMeta = await sharp(short.buf).metadata()
  const px = async (buf, x, y) => [...(await sharp(buf).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer())].slice(0, 3)
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 12)
  eq('실제로 만든 그림: 780×300 → 780×500 JPG · 위아래는 흰색 · 가운데는 원래 그림', [shortMeta.width, shortMeta.height, shortMeta.format, near(await px(short.buf, 390, 20), [255, 255, 255]), near(await px(short.buf, 390, 480), [255, 255, 255]), near(await px(short.buf, 390, 250), [200, 0, 0])], [780, 500, 'jpeg', true, true, true])
  const tallSrc = await sharp({ create: { width: 780, height: 7000, channels: 3, background: { r: 0, g: 0, b: 200 } } }).composite([{ input: await red(780, 3500), top: 0, left: 0 }]).png().toBuffer()
  const tall = await Promise.all(F.detailImagePlan({ key: '02', width: 780, height: 7000 }).map(p => I.renderDetailPiece(tallSrc, p)))
  const tallMeta = await Promise.all(tall.map(t => sharp(t.buf).metadata()))
  eq('실제로 만든 그림: 780×7000 → 2조각(각 780×3500) · 첫 조각 = 위쪽 · 둘째 조각 = 아래쪽', [tall.length, tallMeta.map(m => [m.width, m.height]), near(await px(tall[0].buf, 10, 3400), [200, 0, 0]), near(await px(tall[1].buf, 10, 10), [0, 0, 200])], [2, [[780, 3500], [780, 3500]], true, true])
  const noisy = await sharp(Buffer.from(Array.from({ length: 600 * 600 * 3 }, (_, i) => (i * 2654435761) % 251)), { raw: { width: 600, height: 600, channels: 3 } }).png().toBuffer()
  const small = await I.shrinkBytes(noisy, { maxBytes: 150000 })
  eq('10MB 초과(여기서는 작은 상한으로 확인) → JPG 품질을 낮춰 상한 아래로', [small.buf.length <= 150000, small.quality < 90, small.tooBig, (await sharp(small.buf).metadata()).width], [true, true, false, 600])
  eq('대표 이미지는 그대로 (정사각 1000 — 계획·변환 대상이 아님)', [/pieces\[p\.key\]/.test(read('api/marketplace.js')), /renderDetailPiece\(rep|pieces\.rep/.test(read('api/marketplace.js'))], [true, false])
  eq('이미지 토큰: 조각 열쇠(01p1)를 받음 · 이상한 열쇠는 거절', (() => { const k = crypto.randomBytes(32); const id = '55555555-5555-4555-8555-555555555555'; let bad = false; try { makeImageToken(k, id, '01p') } catch { bad = true } return [verifyImageToken(k, makeImageToken(k, id, '02p2'))?.key, bad] })(), ['02p2', true])

  // 3) 반려 사유는 카드에 그대로 · 4) [고쳐서 다시 보내기]
  const R15 = await import('../src/lib/studioMarketplaceRules.js')
  const sl = read('src/components/studio/StudioSendList.vue'), cp15 = read('src/components/studio/StudioSendCoupang.vue')
  eq('보낸 상품 카드: 반려 사유 그대로 · 반려 항목에만 [고쳐서 다시 보내기] · 보내면 목록 다시 읽기 · 로그아웃 때 비움', [/\{\{ s\.status === 'rejected' \? '반려 사유: ' : '' \}\}\{\{ s\.reason \}\}/.test(sl), /<button v-if="canResend\(s\)"[^>]*data-mk-send-resend/.test(sl), sl.includes("'고쳐서 다시 보내기'"), /@sent="onResent"/.test(sl), /resendPrepare\.value = null/.test(sl)], [true, true, true, true, true])
  eq('[고쳐서 다시 보내기]는 반려 + 쿠팡 상품 번호가 있을 때만', [R15.canResend({ status: 'rejected', sellerProductId: '16397573540' }), R15.canResend({ status: 'rejected', sellerProductId: null }), R15.canResend({ status: 'failed', sellerProductId: '1' }), R15.canResend({ status: 'approval_pending', sellerProductId: '1' }), R15.canResend(null)], [true, false, false, false, false])
  eq('버튼 글자: 다시 보내기 = "다시 승인 요청" · 아니면 예전 그대로', [R15.sendActionLabel(['coupang'], true), R15.sendActionLabel(['coupang'], false), R15.sendActionLabel([], false)], ['다시 승인 요청', '쿠팡으로 보내기', '선택한 판매처로 보내기'])
  eq('쿠팡 섹션: 다시 보내기면 resendId를 같이 보냄 · 템플릿 택배사 검사 · 요약 표에 상세 이미지', [cp15.includes('...(resend.value ? { resendId: resend.value.sendId } : {}),'), cp15.includes("else if (!templateCourierOk.value) out.push('배송/반품 템플릿의 택배사 (판매처 > 기본 설정에서 다시 저장)')"), cp15.includes("detailFiles: props.prepare?.export?.files || []")], [true, true, true])

  // 4) 고쳐서 다시 보내기 — 호출 형식
  eq('쿠팡 경로: 상품 수정 = 상품 생성과 같은 경로(PUT) · 승인 요청 = …/{id}/approvals', [C.PATHS.products, C.PATHS.approval('16397573540')], ['/v2/providers/seller_api/apis/api/v1/marketplace/seller-products', '/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/16397573540/approvals'])
  const up = C.buildProductBody({ ...BASE, items: [BASE.items[0], { ...BASE.items[0], name: '화이트', sku: 'MUG-WH', attributes: { 색상: '화이트' } }], update: { sellerProductId: '16397573540', items: [{ sellerProductItemId: 9001, vendorItemId: null, itemName: '블랙', externalVendorSku: 'MUG-BK' }] } })
  eq('다시 승인 요청 방법: 쿠팡 상태와 상관없이 늘 수정 본문 requested true · 승인 요청 API 안 부름', ['임시저장', '승인반려', '승인완료', '', undefined].map(x => F.resendPlan(x)), Array(5).fill({ requested: true, callApproval: false, via: 'modify' }))
  eq('상품 수정 본문의 requested = 넘겨준 값', [C.buildProductBody({ ...BASE, update: { sellerProductId: '1', items: [], requested: true } }).body.requested, C.buildProductBody({ ...BASE, update: { sellerProductId: '1', items: [], requested: false } }).body.requested], [true, false])
  eq('상품 수정 본문: sellerProductId(숫자) · 기존 옵션에 sellerProductItemId·vendorItemId · 새 옵션에는 없음 · requested false(안 넘기면)', [up.ok, up.body.sellerProductId, up.body.requested, up.body.items.map(i => [i.itemName, i.sellerProductItemId, 'vendorItemId' in i ? i.vendorItemId : 'x'])], [true, 16397573540, false, [['블랙', 9001, null], ['화이트', undefined, 'x']]])
  eq('상품 생성 본문은 그대로: requested true · sellerProductId 없음', [C.buildProductBody(BASE).body.requested, 'sellerProductId' in C.buildProductBody(BASE).body], [true, false])
  eq('옵션 id 맞추기: 품번 먼저 · 없으면 옵션 이름 · 한 id를 두 번 쓰지 않음', F.matchItemIds([{ sku: 'A', name: '블랙' }, { sku: 'ZZ', name: '화이트' }, { sku: 'A', name: '블랙' }], [{ sellerProductItemId: 1, vendorItemId: 11, externalVendorSku: 'A', itemName: '블랙' }, { sellerProductItemId: 2, itemName: '화이트', externalVendorSku: 'W' }]), [{ sellerProductItemId: 1, vendorItemId: 11 }, { sellerProductItemId: 2, vendorItemId: null }, null])
  const form = F.formFromBody(C.buildProductBody({ ...BASE, saleMode: 'agent', outboundDays: 10, displayName: '이유씨 머그컵', generalName: '머그컵', manufacture: '이유씨컴퍼니', modelNo: 'M-1', searchTags: ['머그컵'], advanced: { maxPerPerson: 2, maxPerPersonDays: 30 } }).body)
  eq('보냈던 본문 → 보내기 창 값', [form.saleMode, form.outboundDays, form.productName, form.displayName, form.generalName, form.noBrand, form.brand, form.brandId, form.manufacture, form.modelNo, form.categoryCode, form.tags, form.optionTypes, form.items, form.notices, form.advanced.maxPerPerson, form.noticeCategory], ['agent', 10, '매일 쓰는 머그', '이유씨 머그컵', '머그컵', false, '이유씨', 'KR-77', '이유씨컴퍼니', 'M-1', '56137', ['머그컵'], ['색상'], [{ name: '블랙', originalPrice: 12000, salePrice: 9900, stock: 50, sku: 'MUG-BK', gtin: '', attributes: { 색상: '블랙' } }], { '품명 및 모델명': '머그' }, 2, '기타 재화'])
  eq('보냈던 본문이 없거나 이상하면 null · 브랜드 없이 보낸 것은 "브랜드 없음"', [F.formFromBody(null), F.formFromBody({ items: [] }), F.formFromBody(C.buildProductBody({ ...BASE, brand: '', brandId: '' }).body).noBrand], [null, null, true])
}

// ── 18. 판매 방식 기본값 · 태그 추천 (2026-09-29) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const cp = read('src/components/studio/StudioSendCoupang.vue')
  eq('판매 방식 처음 값: 기억한 값이 없으면 국내 재고 판매 · 있으면 그것 · 이상한 값이면 기본값', [F.DEFAULT_SALE_MODE, F.initialSaleMode(''), F.initialSaleMode(undefined), F.initialSaleMode('agent'), F.initialSaleMode('domestic'), F.initialSaleMode('overseas')], ['domestic', 'domestic', 'domestic', 'agent', 'domestic', 'domestic'])
  eq('화면: 처음 값 = initialSaleMode(기억한 값) · 해외구매대행은 보조 카드 · 국내 재고 판매가 먼저', [cp.includes("f.value.saleMode = initialSaleMode(f.value.templateId ? readSaleMode(f.value.templateId) : '')"), cp.includes("'is-sub': key !== DEFAULT_SALE_MODE"), Object.keys(F.SALE_MODES)], [true, true, ['domestic', 'agent']])
  eq('서버는 그대로: 판매 방식이 없으면 받지 않음', C.buildProductBody({ ...BASE, saleMode: undefined }).ok, false)

  const T = o => F.suggestSearchTags(o)
  const opts = ['블랙', '블루', '네이비', '반달', '대형', '블랙']
  const t1 = T({ title: '여성 헤어핀 블랙 블랙 블루 네이비 반달 대형', categoryName: '헤어액세서리>헤어핀', options: opts })
  eq('태그 추천: 옵션 값끼리·같은 말 반복을 붙이지 않음 (운영에서 나온 3개)', ['블랙블랙', '블루네이비', '반달대형'].filter(x => t1.includes(x)), [])
  eq('태그 추천: 옵션 값은 하나씩만 · 옵션 값이 낀 붙인 말 없음', [['블랙', '블루', '네이비', '반달', '대형'].every(x => t1.includes(x)), t1.filter(t => opts.some(o => t !== o && t.includes(o))), t1.filter(x => x === '블랙').length], [true, [], 1])
  eq('태그 추천: 붙인 말은 상품명에서 바로 옆에 있던 두 낱말만', [T({ title: '여성 여름 슬리퍼' }), T({ title: '여성 신상 슬리퍼' }).includes('여성슬리퍼'), T({ title: '도트 헤어핀 3종 세트' }).filter(x => x.length > 4)], [['여성', '여름', '슬리퍼', '여성여름', '여름슬리퍼'], false, ['도트헤어핀', '헤어핀3종']])
  eq('태그 추천: 세 낱말을 붙인 말 없음 · 같은 말 두 번 붙인 말 없음', [T({ title: '도트 도트 헤어핀 헤어핀' }), T({ title: '가을 겨울 니트 가디건' }).some(x => x === '가을겨울니트')], [['도트', '헤어핀', '도트헤어핀'], false])
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
