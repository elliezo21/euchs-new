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
  {
    // 출고지≠반품지 (2026-10-01 점검) — 출고지·반품지는 쿠팡 API 두 개에서 따로 받아(kind) 템플릿 두 칸에 따로 저장 → 본문도 각각. 서로의 주소가 섞이지 않음
    const MP = [
      { kind: 'outbound', place_code: '100', name: '3PL 창고', address: { zip: '17000', address: '경기 용인 창고', addressDetail: 'B동', contact: '031-000-0000' } },
      { kind: 'outbound', place_code: '101', name: '사무실 출고', address: { zip: '61000', address: '광주 사무실', addressDetail: '2층', contact: '062-000-0000' } },
      { kind: 'return', place_code: '200', name: '판매자 사무실', address: { zip: '61000', address: '광주 북구 사무실', addressDetail: '3층', contact: '062-111-1111', deliverCode: 'CJGLS', deliverName: 'CJ대한통운' } },
      { kind: 'return', place_code: '201', name: '창고 반품', address: { zip: '17000', address: '경기 용인 창고', addressDetail: 'B동', contact: '031-000-0000', deliverCode: 'CJGLS', deliverName: 'CJ대한통운' } },
    ]
    const tv = C.validateTemplate({ ...T, outbound_place_code: '100', return_center_code: '200' }, MP)
    const mb = C.buildProductBody({ ...BASE, template: tv.value, places: MP })
    eq('쿠팡 출고지≠반품지: 템플릿 출고지 100(창고)·반품지 200(사무실) → 본문 outboundShippingPlaceCode 100 · returnCenterCode 200 · 반품 주소·연락처 = 반품지 것', [tv.ok, mb.ok, mb.body.outboundShippingPlaceCode, mb.body.returnCenterCode, mb.body.returnChargeName, mb.body.returnAddress, mb.body.returnZipCode, mb.body.companyContactNumber], [true, true, 100, '200', '판매자 사무실', '광주 북구 사무실', '61000', '062-111-1111'])
    eq('쿠팡: 출고지 코드를 반품지 칸에 넣은 템플릿(kind가 다름)은 저장 거절', [C.validateTemplate({ ...T, outbound_place_code: '200', return_center_code: '200' }, MP).ok, C.validateTemplate({ ...T, outbound_place_code: '100', return_center_code: '100' }, MP).ok], [false, false])
  }
  eq('대표 이미지 + 상세 이미지 · 상세 내용', [b.body.items[0].images.map(i => i.imageType), b.body.items[0].contents[0].contentDetails.length], [['REPRESENTATION', 'DETAIL'], 1])
  eq('판매가 > 정가 → 거절', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], salePrice: 13000 }] }).ok, false)
  eq('가격 없음 → 거절 (임의 숫자로 채우지 않음)', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], salePrice: null, originalPrice: null }] }).ok, false)
  eq('재고 100000 → 거절', C.buildProductBody({ ...BASE, items: [{ ...BASE.items[0], stock: 100000 }] }).ok, false)
  eq('본문에 키·서명 없음', /access[-_]?key|secret|signature|authorization/i.test(JSON.stringify(b.body)), false)
}
eq('쿠팡 상태 → 우리 상태', ['심사중', '승인대기중', '승인완료', '부분승인완료', '승인반려', '상품삭제', ''].map(C.mapCoupangStatus), ['approval_pending', 'approval_pending', 'approved', 'approved', 'rejected', 'deleted', 'approval_pending'])
eq('출고지·반품지 정리', [C.normalizeOutbound([{ outboundShippingPlaceCode: 100, shippingPlaceName: '창고', usable: true, remoteInfos: [{ remoteInfoId: 1, deliveryCode: 'CJGLS', jeju: 5000, notJeju: 2500, usable: true }, { remoteInfoId: 2, deliveryCode: 'HANJIN', jeju: 1, notJeju: 1, usable: false }], placeAddresses: [{ addressType: 'ROADNAME', returnZipCode: '1', returnAddress: '주소', returnAddressDetail: '상세', companyContactNumber: '02' }] }])[0], C.normalizeReturnCenters([{ returnCenterCode: '200', shippingPlaceName: '반품', deliverCode: 'CJGLS', deliverName: 'CJ', placeAddresses: [] }])[0].address.deliverCode],
  [{ kind: 'outbound', place_code: '100', name: '창고', usable: true, address: { zip: '1', address: '주소', addressDetail: '상세', contact: '02', remote: [{ code: 'CJGLS', jeju: 5000, notJeju: 2500 }] } }, 'CJGLS'])

// ── 8. handler (가짜 Supabase + 가짜 중계) ──
const UID = '11111111-1111-4111-8111-111111111111'
const PID = '22222222-2222-4222-8222-222222222222'
const EID = '44444444-4444-4444-8444-444444444444'
globalThis.__createOnly = true // 예전 테스트 = 새 등록 길 (위 fetch 주석) — '다시 보내기 = 수정' 묶음에서만 끈다
const db = { marketplace_accounts: [], marketplace_places: [], marketplace_templates: [], marketplace_sends: [], studio_exports: [], studio_images: [], studio_projects: [], studio_product_snapshots: [], translation_cache: [], orders: [] }
const files = new Map()
const marketImages = { files: new Map(), copies: [] }
let relay ={ mode: 'ok', calls: [] }
let seq = 0
const newId = () => `${String(++seq).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
function jpg(w, h) { return Buffer.from([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xFF, 0xD9]) }
function match(row, q) {
  for (const [k, v] of new URLSearchParams(q)) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue
    if (v.startsWith('eq.')) { if (String(row[k]) !== v.slice(3)) return false }
    else if (v === 'not.is.null') { if (row[k] == null) return false }
    else if (v.startsWith('gte.')) { if (!(String(row[k] ?? '') >= v.slice(4))) return false } // ISO 시각 비교 (보내는 중 가드 2026-10-01)
    else if (v.startsWith('in.(')) { if (!v.slice(4, -1).split(',').map(x => x.replace(/^"|"$/g, '')).includes(String(row[k]))) return false }
  }
  return true
}
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const method = opts.method || 'GET'
  if (u.host === 'relay.local') {
    // 본문: JSON이면 객체로(쿠팡) — 스마트스토어 토큰(form-urlencoded)·이미지 업로드(multipart)는 원문 그대로 raw에
    const isJson = /json/i.test(String(opts.headers?.['Content-Type'] || 'application/json'))
    relay.calls.push({ path: u.pathname, query: u.search, method, headers: opts.headers, body: opts.body && isJson ? JSON.parse(opts.body) : null, raw: opts.body && !isJson ? Buffer.from(opts.body) : null })
    if (opts.headers['x-relay-secret'] !== 'test-relay-secret') return json({ error: 'relay secret mismatch' }, 401)
    if (u.pathname.startsWith('/smartstore/')) return smartstoreRelay(u, method, opts)
    if (u.pathname.startsWith('/11st/')) return elevenstRelay(u, method, opts)
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
    // 상품 목록 페이징 조회 (2026-10-02 삭제 확인) — relay.deletedIds를 2쪽으로 나눠 준다 (첫 쪽 nextToken '2')
    if (p === C.PATHS.products && method === 'GET') {
      const q = new URLSearchParams(u.search), ids = relay.deletedIds || [], half = Math.ceil(ids.length / 2)
      relay.listQueries = [...(relay.listQueries || []), u.search]
      const page = q.get('nextToken') === '2' ? ids.slice(half) : ids.slice(0, half)
      return json({ code: 'SUCCESS', message: '', nextToken: q.get('nextToken') === '2' || ids.length < 2 ? '' : '2', data: page.map(id => ({ sellerProductId: Number(id), sellerProductName: 'x', statusName: '상품삭제' })) })
    }
    // 옵션별 가격·정가·재고 변경 (승인 완료 상품 — 2026-10-02 다시 보내기 = 수정). relay.itemFail = 실패시킬 종류('prices'|'quantities'|'original-prices')
    const vi = /\/vendor-items\/(\d+)\/(prices|quantities|original-prices)\/(\d+)$/.exec(p)
    if (vi && method === 'PUT') return relay.itemFail === vi[2] ? json({ code: 'ERROR', message: '가격 변경 비율이 허용 범위를 벗어났습니다.' }, 400) : json({ code: 'SUCCESS', message: '변경을 완료했습니다.', data: null })
    if (p === C.PATHS.products && method === 'PUT') return relay.mode === 'put-fail' ? json({ code: 'ERROR', message: '필수 속성 누락' }, 400) : json({ code: '200', message: '', data: { code: 'SUCCESS', message: '', data: 1234567890 } })
    if (p === C.PATHS.approval('1234567890') && method === 'PUT' && (relay.status || '승인대기중') !== '임시저장') return json({ code: 'ERROR', message: "'임시저장' 상태의 상품만 승인 요청 가능합니다." }, 400)
    if (p === C.PATHS.approval('1234567890') && method === 'PUT') return relay.mode === 'approval-fail' ? json({ code: 'ERROR', message: '상품 정보가 등록 또는 수정되고 있습니다. 잠시 후 다시 조회해 주시기 바랍니다.' }, 400) : json({ code: 'SUCCESS', message: '1234567890 승인 요청되었습니다.', data: '1234567890' })
    // 등록상품 조회 (querying-product — 응답 data.vendorId · 오류 원문 "다른 업체…조회할 수 없습니다"·"…의 데이터가 없습니다") — relay.products[번호]가 있으면 그 응답
    const pm = /\/seller-products\/(\d+)$/.exec(p)
    if (pm && method === 'GET' && relay.products?.[pm[1]]) {
      const o = relay.products[pm[1]]
      if (o.raw) return json({ code: 'ERROR', message: o.raw }, 400)
      return json({ code: 'SUCCESS', data: { sellerProductId: Number(pm[1]), vendorId: o.vendorId ?? 'A00012345', statusName: o.statusName ?? relay.status ?? '승인대기중', items: o.items || [] } })
    }
    if (p === C.PATHS.product('1234567890')) return json({ code: 'SUCCESS', data: { sellerProductId: 1234567890, vendorId: 'A00012345', statusName: relay.status || '승인대기중', items: [{ sellerProductItemId: 777001, vendorItemId: null, itemName: '블랙', externalVendorSku: 'MUG-BK' }] } })
    if (p === C.PATHS.histories('1234567890')) return json({ code: 'SUCCESS', data: [{ status: '승인요청', comment: '' }, { status: '승인반려', comment: '대표 이미지에 글자가 있습니다' }] })
    return json({ message: 'no route' }, 404)
  }
  // 11번가 카테고리 공개 조회 (키·중계 없음) — 가짜 EUC-KR XML
  if (u.host === 'api.11st.co.kr') { st11.categoryCalls++; return eucXml(ST11_CATEGORY_XML) }
  const p = decodeURIComponent(u.pathname)
  if (p === '/auth/v1/user') return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'admin@test.local' }) : json({ msg: 'bad' }, 401)
  // __asCustomer = 관리자 아닌 주문 고객 (2026-10-01 카페24 숨김 확인용 — 'all' 모드 + 결제 주문 1건)
  if (p === '/rest/v1/user_roles') return json(globalThis.__asCustomer ? [] : [{ role: 'admin' }])
  if (p === '/rest/v1/orders' && globalThis.__asCustomer) return json([{ id: 'order-1' }])
  if (p === '/rest/v1/profiles') return json([])
  if (p.startsWith('/storage/v1/object/sign/')) return json({ signedURL: `/object/sign/${p.slice(24)}?token=t` })
  // 판매용 공개 창고 (2026-10-01 — api/_marketImages.js): 버킷 간 복사(storage-js copy destinationBucket) · 정리(remove)
  if (p === '/storage/v1/object/copy' && method === 'POST') {
    const b = JSON.parse(opts.body)
    marketImages.copies.push(b)
    if (b.bucketId !== 'studio' || b.destinationBucket !== 'market-images') return json({ statusCode: '400', error: 'bad', message: 'wrong bucket' }, 400)
    if (!files.has(b.sourceKey)) return json({ statusCode: '404', error: 'not_found', message: 'Object not found' }, 400)
    if (marketImages.files.has(b.destinationKey)) return json({ statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }, 400)
    marketImages.files.set(b.destinationKey, files.get(b.sourceKey))
    return json({ Key: `market-images/${b.destinationKey}` })
  }
  if (p === '/storage/v1/object/market-images' && method === 'DELETE') {
    const gone = JSON.parse(opts.body).prefixes
    for (const k of gone) marketImages.files.delete(k)
    return json(gone.map(name => ({ name })))
  }
  if (p.startsWith('/storage/v1/object/studio/')) {
    const key = p.slice('/storage/v1/object/studio/'.length)
    if (method === 'POST') { files.set(key, Buffer.from(opts.body)); return json({ Key: key }) }
    return files.has(key) ? new Response(files.get(key), { status: 200 }) : json({ statusCode: '404', error: 'not_found' }, 400)
  }
  const table = p.replace('/rest/v1/', '')
  const rows = db[table]
  if (!rows) return json({ message: 'no table' }, 404)
  const body = opts.body ? JSON.parse(opts.body) : null
  if (method === 'GET') {
    // 2026-10-02 다시 보내기 = 수정 — 같은 내 상품을 여러 번 보내 새 등록 길(검사·이미지·실패 기록)을 보는 예전 테스트는 __createOnly 동안
    // "살아 있는 상품 찾기"(api/marketplace.js liveSendRows·existingInMarkets) 결과를 비운다. 수정 길은 아래 '다시 보내기 = 수정' 묶음이 __createOnly 없이 본다
    if (globalThis.__createOnly && table === 'marketplace_sends' && /status=in\.%28registered%2Capproved%2Capproval_pending%29|status=in\.\(registered,approved,approval_pending\)/.test(u.search)) return json([])
    let hit = rows.filter(r => match(r, u.search))
    const q = new URLSearchParams(u.search), sel = q.get('select') || ''
    // JSON 경로 select(별칭:칸->a->b)를 쓰는 조회만 PostgREST처럼 순서·개수·모양을 맞춘다 (스마트스토어 마지막 주소) — 다른 조회는 예전 그대로
    const path = /^(\w+):(\w+)((?:->\w+)+)$/.exec(sel)
    if (path) {
      if (q.get('order') === 'created_at.desc') hit = hit.slice().reverse()
      if (q.get('limit')) hit = hit.slice(0, Number(q.get('limit')))
      const keys = path[3].split('->').filter(Boolean)
      return json(hit.map(r => ({ [path[1]]: keys.reduce((o, k) => (o == null ? null : o[k] ?? null), r[path[2]]) })))
    }
    // 여러 칸 + JSON 경로(별칭:칸->a->>b) select = 보낸 상품 목록(2026-10-02 LIST_SELECT) — PostgREST처럼 칸을 골라 주고 offset·limit 쪽 나누기
    if (table === 'marketplace_sends' && sel.includes(',') && sel.includes('->')) {
      const off = Number(q.get('offset') || 0), lim = q.get('limit') ? Number(q.get('limit')) : Infinity
      hit = hit.slice(off, off + lim)
      const parts = sel.split(',')
      return json(hit.map(r => Object.fromEntries(parts.map(part => {
        const m = /^(\w+):(\w+)((?:->>?\w+)+)$/.exec(part)
        if (!m) return [part, r[part] ?? null]
        let v = r[m[2]]
        for (const [, txt, k] of m[3].matchAll(/->(>?)(\w+)/g)) {
          v = v == null ? null : (v[k] ?? null)
          if (txt && v != null) v = typeof v === 'object' ? JSON.stringify(v) : String(v)
        }
        return [m[1], v]
      }))))
    }
    return json(hit)
  }
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
  eq('동기화: 승인반려 + 사유(histories.comment 원문)', [rejected.status, rejected.marketStatus, rejected.reason], ['rejected', '승인반려', '대표 이미지에 글자가 있습니다'])
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
      base.status = 'rejected'; base.reason = '도서산간배송 출고지에 등록된 택배사만 선택할 수 있습니다.'; base.market_status = '승인반려'
      const pre = await post('send_prepare', { resendId: base.id })
      eq('send_prepare(resendId): 그 전송의 값으로 채울 재료 · 같은 내 상품', [pre.statusCode, pre.body.resend.sendId, pre.body.resend.sellerProductId, pre.body.resend.reason, pre.body.resend.form.productName, pre.body.export.id === base.export_id], [200, base.id, '1234567890', base.reason, '매일 쓰는 머그', true])
      eq('남의 전송·없는 전송 → 404', (await post('send_prepare', { resendId: '99999999-9999-4999-8999-999999999999' })).statusCode, 404)
      const count = db.marketplace_sends.length
      const statusBefore = relay.status
      const REASON = base.reason
      const productCalls = () => relay.calls.map(c => [c.method, c.path.replace(/^\/coupang/, '')]).filter(c => c[1].includes('/seller-products'))
      const putOf = () => relay.calls.find(c => c.method === 'PUT' && c.path.endsWith('/seller-products'))
      const reject = () => { base.status = 'rejected'; base.reason = REASON; base.market_status = '승인반려' }

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
  eq('보내기 창: 브랜드는 선택("브랜드 없음" 기본 체크) · 품번 필수 · GTIN 선택', [/브랜드 \*/.test(modal), /data-mk-s-no-brand/.test(modal), /noBrand: true, brand: '', brandId: ''/.test(modal), /품번 \*/.test(modal), /GTIN\(바코드 8~14자리\) 선택/.test(modal), /자체브랜드명/.test(modal)], [false, true, true, true, true, false])
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
  // 2026-10-02 [보내기] 탭은 [내 상품]으로 합침 · [보낸 상품] → "전송 기록"
  eq('판매처 탭 3개 · 순서', R.CHANNEL_TABS.map(t => t.label), ['전송 기록', '기본 설정', '연결'])
  eq('판매처 탭마다 라우트 /studio/channels/<key> (누구나 구경 — STUDIO_PUBLIC)', R.CHANNEL_TABS.map(t => new RegExp(`path: '${t.key}',\\s*name: '${esc(t.route)}',[\\s\\S]{0,160}?meta: \\{ \\.\\.\\.STUDIO_PUBLIC`).test(router)), [true, true, true])
  eq('/studio/channels → [전송 기록] · 부모도 같은 meta · 예전 보내기 주소 = [내 상품](?export → ?send)', [router.includes("path: '', name: 'studio-channels', redirect: { name: 'studio-channels-sent' }"), /path: 'channels',[\s\S]{0,120}?meta: \{ \.\.\.STUDIO_PUBLIC/.test(router), /path: 'send', name: 'studio-channels-send', redirect: to => \(\{ name: 'studio-projects', query: [^\n]*\{ send: to\.query\.export \}/.test(router)], [true, true, true])
  eq('[기본 설정] = StudioShippingView · [연결] = StudioMarketplaceView (그대로 재사용)', [/name: 'studio-channels-defaults',\s*component: \(\) => import\('\.\.\/views\/studio\/StudioShippingView\.vue'\)/.test(router), /name: 'studio-channels-connect',\s*component: \(\) => import\('\.\.\/views\/studio\/StudioMarketplaceView\.vue'\)/.test(router)], [true, true])
  eq('예전 주소 3개 → 판매처 탭으로 redirect (이름 유지)', [
    router.includes("{ path: 'marketplace', name: 'studio-settings-marketplace', redirect: { name: 'studio-channels-connect' } }"),
    router.includes("{ path: 'shipping', name: 'studio-settings-shipping', redirect: { name: 'studio-channels-defaults' } }"),
    router.includes("{ path: 'marketplace', name: 'studio-marketplace', redirect: { name: 'studio-channels-connect' } }"),
    R.CHANNEL_TABS.flatMap(t => (t.moved || []).map(n => new RegExp(`name: '${esc(n)}', redirect: \\{ name: '${esc(t.route)}' \\}`).test(router))).every(Boolean),
  ], [true, true, true, true])
  eq('예전 설정 화면에 판매처 라우트(컴포넌트) 없음', /name: 'studio-settings-(marketplace|shipping)',\s*component/.test(router), false)
  const menu = /const menuItems = \[([\s\S]*?)\n\]/.exec(layout)[1]
  eq('사이드바 메인 = 스튜디오 소개·내 상품·템플릿·판매처 4개 (2026-10-02 내 작업 → 내 상품)', [...menu.matchAll(/label: '([^']+)'/g)].map(m => m[1]), ['스튜디오 소개', '내 상품', '템플릿', '판매처'])
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
  // "카페24 관리자" = 카페24 쇼핑몰 관리 화면의 이름(2026-09-30 카페24 보내기 문구) — 우리 내부 관리자를 뜻하지 않으므로 검사에서 뺀다
  const shown = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '').replace(/:relay-ip|relayIp/g, '').replace(/카페24 관리자/g, '') }
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
  eq('내 상품 화면: 목록은 StudioProductList 하나(예전 최근 작업·내 상품 카드 없음) · 화면 자체는 보내기 창을 직접 안 씀', [/StudioSendList|StudioSendModal|sendToMarketplace/.test(home), /<StudioProductList v-if="loggedIn" \/>/.test(home), /StudioRecentProjects|StudioExportList/.test(home)], [false, true, false])
  eq('내 상품(내 작업) = [다시 받기] + "판매처에서 보내기 →"(이 상품을 골라 둔 보내기 탭)만', [/'다시 받기'/.test(listShown), /:to="\{ name: 'studio-channels-send', query: \{ export: x\.id \} \}"[^>]*>판매처에서 보내기 →</.test(listShown), /StudioSendModal|sendToMarketplace|판매처로 보내기/.test(list)], [true, true, false])
  eq('내 상품 배지·고르기는 판매처 > 보내기(pick)에서만', [/v-if="pick && sendsOf\[x\.id\]"/.test(listShown), /v-if="!pick" class="flex flex-col gap-1"/.test(listShown), /<StudioExportList pick :selected-id="selectedId" :sends="sends"/.test(sendView)], [true, true, true])
  eq('보내기 탭: 예전 진입 그대로 (sendToMarketplace → StudioSendModal) · ?export= 로 골라 둠', [/const r = await sendToMarketplace\(exportId\)/.test(sendView), /<StudioSendModal :open="sendOpen" :prepare="sendPrepare"/.test(sendView), /route\.query\.export/.test(sendView)], [true, true, true])
  eq('보내기 탭: 연결 전 = 자물쇠 + [연결하기](연결 탭) · "준비 중" 글자 없음', [/<Lock /.test(shown('src/views/studio/StudioChannelSendView.vue')), /:to="\{ name: 'studio-channels-connect' \}"[^>]*>연결하기</.test(shown('src/views/studio/StudioChannelSendView.vue')), /준비 중/.test(shown('src/views/studio/StudioChannelSendView.vue'))], [true, true, false])
  eq('보낸 상품 탭 = StudioSendList 그대로 · 연결 화면에는 없음', [/<StudioSendList v-if="loggedIn" ref="sendList" :exports="exportItems"/.test(sentView), /<StudioSendList|<StudioShippingTemplates/.test(read('src/views/studio/StudioMarketplaceView.vue'))], [true, false])
  eq('판매처 화면: 로그아웃 구독', ['src/components/studio/StudioSendList.vue', 'src/views/studio/StudioShippingView.vue', 'src/views/studio/StudioChannelSendView.vue', 'src/views/studio/StudioChannelSentView.vue', 'src/components/studio/StudioExportList.vue'].map(p => /euchs-auth-changed/.test(read(p))), [true, true, true, true, true])
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기 [작업 저장] 뒤 [판매처로 보내기] = [내 상품]에서 그 상품의 보내기 창 (?send=) · 편집기 안 보내기 창 없음', [/router\.push\(\{ name: 'studio-projects', query: \{ send: exportId \} \}\)/.test(ed), /StudioSendModal|sendToMarketplace/.test(ed)], [true, false])
  eq('예전 설정 링크 이름이 남은 곳 = 보내기 창·쿠팡 섹션뿐 (redirect로 새 탭)', [...['src/components/studio/StudioExportList.vue', 'src/components/studio/StudioSendList.vue', 'src/components/studio/StudioShippingTemplates.vue', 'src/views/studio/StudioShippingView.vue', 'src/views/studio/StudioMarketplaceView.vue', 'src/views/studio/StudioChannelSendView.vue'].filter(p => /studio-settings-(marketplace|shipping)/.test(read(p)))], [])
  // 판매처 줄 (보내기 탭)
  const on = R.channelRows({ coupang: { connected: true } }), off = R.channelRows({ coupang: { connected: false } })
  // S3-3: 연결할 수 있는 곳(쿠팡·스마트스토어·11번가)은 연결 상태, 나머지는 "예정"(planned) — 카페24는 심사 승인 전(CAFE24_PUBLIC false) 관리자만 연결 상태
  // 2026-09-30 카페24 보내기: 이미 연결된 카페24는 일반 고객도 connected([카페24로 보내기]) — 쇼핑몰 관리자에서 앱을 열어 연결한 사람
  // 2026-10-01 카페24 앱 심사 반려 → 고객 화면에는 카페24 줄 자체가 없음(연결돼 있어도) · 관리자·스태프는 지금처럼(locked/connected)
  // 2026-10-02 카페24 운영 중단 → MARKETS의 off 한 곳: 관리자·스태프도 줄 없음(연결돼 있어도)
  const KEYED = ['coupang', 'smartstore', '11st', 'zigzag', 'cafe24'] // 2026-10-02 지그재그 = 키 연결
  const CUST = R.MARKETS.filter(m => !m.off)
  const offStates = CUST.map(m => (KEYED.includes(m.key) ? 'locked' : 'planned'))
  eq('판매처 줄 = MARKETS에서 운영 중단(off) 뺀 8곳·같은 순서 · 연결된 쿠팡만 connected · 키 연결 판매처는 연결 전 locked · 나머지 = planned · 스마트스토어는 연결되면 connected · 카페24는 연결돼 있어도 줄 없음 / 관리자도 같은 8곳 · 카페24 줄 없음', [on.map(r => r.key), on.map(r => r.state), off.map(r => r.state), R.channelRows().map(r => r.state), R.channelRows({ smartstore: { connected: true } })[1].state, R.channelRows({ cafe24: { connected: true } }).some(r => r.key === 'cafe24'), R.channelRows({}, { admin: true }).map(r => r.state), R.channelRows({ cafe24: { connected: true } }, { admin: true }).some(r => r.key === 'cafe24')], [CUST.map(m => m.key), ['connected', ...offStates.slice(1)], offStates, offStates, 'connected', false, offStates, false])
  eq('카페24 운영 중단 = MARKETS 항목 off 하나 · OFF_MARKETS = cafe24 · 관리자 전용 없음 · 누구나 보는 목록(PUBLIC_MARKETS)에 없음 · connectFor 고객·관리자 모두 null(예정 아님) · CAFE24_PUBLIC 스위치 없음', [R.MARKETS.find(m => m.key === 'cafe24').off, R.OFF_MARKETS, R.ADMIN_ONLY_MARKETS, R.PUBLIC_MARKETS.some(m => m.key === 'cafe24'), R.connectFor(R.MARKETS.find(m => m.key === 'cafe24')), R.connectFor(R.MARKETS.find(m => m.key === 'cafe24'), { admin: true }), R.marketVisible('cafe24', { admin: true }), R.marketVisible('coupang'), R.PLANNED_MARKETS.includes('cafe24'), 'CAFE24_PUBLIC' in R], [true, ['cafe24'], [], false, null, null, false, true, false, false])
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
  eq('판매처 목록·순서 (보내기 = 쿠팡·스마트스토어·11번가(2026-10-01)·지그재그(2026-10-02)·카페24, 나머지는 soon)', [R.MARKETS.map(m => m.name), R.MARKETS.filter(m => !m.soon).map(m => m.key)], [['쿠팡', '스마트스토어', '11번가', 'G마켓·옥션', '에이블리', '지그재그', '카페24', '메이크샵', '고도몰'], ['coupang', 'smartstore', '11st', 'zigzag', 'cafe24']])
  const mkView = read('src/views/studio/StudioMarketplaceView.vue'), landing = read('src/views/studio/StudioLandingView.vue')
  const screenTextOf = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '') }
  eq('연결 탭·랜딩 둘 다 공용 목록을 씀 (따로 적은 목록 없음) · 연결 신청 화면 없음(S3-3)', [/<StudioMarketRequests/.test(mkView), /const PLANNED = MARKETS\.filter\(m => m\.connect === 'planned'\)/.test(mkView), /import \{ PUBLIC_MARKETS as MARKETS \} from '@\/lib\/studioMarketplaceRules'/.test(landing), /v-for="m in MARKETS"/.test(landing), /'카페24'|'고도몰'|'메이크샵'/.test(mkView + landing)], [false, true, true, true, false])

  // ── 판매처 연결 2단계 (2026-09-30): 11번가 키 연결 · 가이드 (연결 신청은 S3-3에서 걷어냄 → "예정") ──
  {
    const G = await import('../src/lib/studioMarketGuides.js')
    const E = await import('../api/_elevenst.js')
    const api = read('api/marketplace.js'), el = read('api/_elevenst.js'), card = read('src/components/studio/StudioElevenstCard.vue')
    const sql = read('docs/sql/2026-09-30-marketplace-11st-requests.sql')
    eq('연결 방법: 쿠팡·스마트스토어·11번가·지그재그(2026-10-02)·카페24 = 키 · 나머지 4곳 = 예정 · 보내기도 같은 5곳', [R.MARKETS.filter(m => m.connect === 'key').map(m => m.key), R.PLANNED_MARKETS, R.MARKETS.filter(m => !m.soon).map(m => m.key), R.PLANNED_LABEL, 'REQUEST_MARKETS' in R, 'requestProblems' in R], [['coupang', 'smartstore', '11st', 'zigzag', 'cafe24'], ['gmarket', 'ably', 'makeshop', 'godomall'], ['coupang', 'smartstore', '11st', 'zigzag', 'cafe24'], '예정', false, false])
    eq('서버: 연결 신청 action·표 없음 · SQL에 marketplace_requests 만들기 없음', [/connect_request|REQUEST_MARKETS|marketplace_requests/.test(api), /create table public\.marketplace_requests/.test(sql), /marketplace_requests/.test(read('src/lib/studioMarketplace.js') + read('src/lib/studioMarketLinks.js'))], [false, false, false])
    const on = R.channelRows({ coupang: { connected: true }, '11st': { connected: true }, ably: { connected: true }, cafe24: { connected: true } })
    // 연결된 곳은 연결 방법(planned)보다 먼저 — 에이블리처럼 "예정"인 곳도 값이 오면 linked(2026-10-02 지그재그가 연결 판매처가 되어 예시를 에이블리로). 카페24는 2026-10-01부터 고객에게 줄 자체가 없음(연결돼 있어도)
    eq('보내기 탭 줄(고객): 쿠팡 = 보내기 · 11번가 = 보내기(공개 — ELEVENST_SEND_PUBLIC true) · 카페24 줄 없음(연결돼 있어도) · 예정 판매처는 값이 안 오면 예정', Object.fromEntries(on.map(r => [r.key, r.state])), { coupang: 'connected', smartstore: 'locked', '11st': 'connected', gmarket: 'planned', ably: 'linked', zigzag: 'locked', makeshop: 'planned', godomall: 'planned' })
    const onAdmin = R.channelRows({ cafe24: { connected: true } }, { admin: true })
    // 2026-10-02 카페24 운영 중단(MARKETS off): 고객·관리자·스태프 모두 줄·카드 없음(connectFor null). MARKETS의 connect 값은 그대로(코드 보존)
    eq('카페24 숨김: MARKETS off 하나 · 고객 = null · 관리자 = null · MARKETS 자체는 key 그대로 · 관리자 연결돼 있어도 줄 없음 · 고객 줄 없음', [R.MARKETS.find(m => m.key === 'cafe24').connect, R.connectFor(R.MARKETS.find(m => m.key === 'cafe24')), R.connectFor(R.MARKETS.find(m => m.key === 'cafe24'), { admin: true }), R.connectFor(R.MARKETS.find(m => m.key === '11st')), onAdmin.some(r => r.key === 'cafe24'), R.channelRows({}).some(r => r.key === 'cafe24')], ['key', null, null, 'key', false, false])
    {
      const mk = read('src/views/studio/StudioMarketplaceView.vue'), sv = read('src/views/studio/StudioChannelSendView.vue'), sm = read('src/components/studio/StudioSendModal.vue')
      eq('화면: 카페24 카드는 판매처 목록 규칙(marketVisible — off면 누구에게도 안 보임) · 보내기 탭·보내기 창 줄에 관리자 여부 전달 · 관리자 판정 = auth.isAdminOrStaff(서버 ctx.isAdmin = is_admin_or_staff와 같은 범위)',
        [/<StudioCafe24Card v-if="showCafe24" \/>/.test(mk), /const showCafe24 = computed\(\(\) => marketVisible\('cafe24', \{ admin: isAdminOrStaff\.value \}\)\)/.test(mk), /cafe24Entry|hasCafe24Launch/.test(mk), /channelRows\(linkStates\([^)]*\), \{ admin: isAdminOrStaff\.value \}\)/.test(sv), /marketRows\(\{[^}]*\}[^,]*, \{ admin: isAdminOrStaff\.value \}\)/.test(sm), [mk, sv, sm].every(s => /import \{[^}]*isAdminOrStaff[^}]*\} from '@\/lib\/auth'/.test(s))],
        [true, true, false, true, true, true])
    }
    eq('11번가 키 입력 검사', [R.elevenstKeyProblems({ sellerId: 'seller', apiKey: 'abcd1234efgh' }), R.elevenstKeyProblems({ sellerId: '', apiKey: 'short' }), R.elevenstKeyProblems({ sellerId: 'a', apiKey: 'has space 123' })], [[], ['11번가 셀러 ID', 'API 키'], ['API 키']])
    // 2026-09-30 합니다체: 단계 끝 = "~하세요."(명령형) 또는 "~니다."(설명) — 예전 "~요."(대화체) 규칙에서 바꿈
    // 스마트스토어 단계 한 줄은 명사형(2026-10-01 실제 화면 기준) — 덧붙임(warn·note)이 합니다체
    eq('가이드: 단계 5~8개 · 짧은 명령형·합니다체(끝이 "세요." 또는 "니다.") · IP = 중계 IP · 연결 신청 가이드 없음', [G.ELEVENST_GUIDE.length, G.SMARTSTORE_GUIDE.length, G.CAFE24_GUIDE.length, [...G.ELEVENST_GUIDE, ...G.CAFE24_GUIDE, ...G.SMARTSTORE_STEPS.flatMap(s => [s.warn, s.note].filter(Boolean))].every(s => /(세요|니다)\.( \(메뉴 이름 확인 필요\))?$/.test(s)), G.RELAY_IP === C.RELAY_IP, G.ELEVENST_GUIDE.some(s => s.includes('3.39.196.112')), 'requestGuide' in G], [8, 8, 5, true, true, true, false])
    eq('가이드: 메뉴 이름을 모르는 곳은 표시 · 목록으로 뽑힘 (11번가·스마트스토어는 실제 화면으로 확인 → 표시 없음 · 카페24는 우리 앱 방식이라 메뉴 안내 없음)', G.menuChecks().map(x => x.market), [])
    eq('카페24 가이드 = 우리 앱 방식 (쇼핑몰 ID → 대표 운영자 로그인 → 권한 동의 → "연결됨") · 다른 방법 한 줄 · 옛 개발자센터·Client ID 안내 없음', [G.CAFE24_GUIDE, G.CAFE24_GUIDE_ALT, /개발자센터|Client ID|Client Secret|Redirect URI/.test(G.CAFE24_GUIDE.join(' ') + G.CAFE24_GUIDE_ALT), /v-for="\(s, i\) in CAFE24_GUIDE"/.test(read('src/components/studio/StudioCafe24Card.vue'))],
      [['[연결하기]를 누르고 카페24 쇼핑몰 ID를 넣으세요.', '주소가 myshop.cafe24.com이면 쇼핑몰 ID는 myshop입니다.', '카페24 화면이 열리면 쇼핑몰 대표 운영자 계정으로 로그인하세요.', '상품 읽기·쓰기, 상품분류 읽기 권한에 동의하세요.', '스튜디오로 돌아와 "연결됨"이 표시되면 연결이 완료됩니다.'], '다른 방법: 카페24 쇼핑몰 관리자에서 EUCHS 스튜디오 앱을 열면 쇼핑몰 ID 없이 바로 연결됩니다.', false, true])
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
      {
        // 2026-10-01 실제 화면 기준 다시 씀 — 캡처 9장(public/studio-guide/smartstore) · "확인 필요" 없음 · API 그룹 2개(전부 선택 아님)
        const St = G.SMARTSTORE_STEPS, all = St.flatMap(s => [s.text, s.warn, s.note, ...(s.copies || []).map(c => c.value)]).filter(Boolean).join('\n')
        const imgs = [...new Set(St.flatMap(s => s.imgs))].sort()
        const ssGuide = read('src/components/studio/StudioSmartstoreGuide.vue')
        eq('스마트스토어 가이드: 8단계 · 캡처 01~09 모두 쓰고 파일 있음(300KB 이하) · 마지막 단계만 캡처 없음', [St.length, imgs, imgs.every(p => { try { const n = fs.statSync(new URL(`../public${p}`, import.meta.url)).size; return n > 0 && n <= 300 * 1024 } catch { return false } }), St.map(s => s.imgs.length > 0)],
          [8, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `/studio-guide/smartstore/0${n}.png`), true, [true, true, true, true, true, true, true, false]])
        eq('스마트스토어 가이드: 확인 필요 표시 없음 · "전부 선택" 없음 · 그룹 = 상품/N배송·판매자정보 · IP 단계 = 반드시 [추가] 굵게 + 경고 · 로그인 단계 = 대표 계정 굵게 + 센터 주소',
          [all.includes(G.MENU_CHECK), /전부 선택/.test(all), St[4].text, St[3].text.includes(St[3].strong), St[3].strong, !!St[3].warn, St[0].strong, St[0].link, G.SMARTSTORE_API_CENTER_URL],
          [false, false, 'API 그룹 "상품/N배송", "판매자정보" [추가]', true, '입력 후 반드시 [추가]', true, '대표(통합매니저) 계정으로 로그인', true, 'https://apicenter.commerce.naver.com/ko/basic/main'])
        eq('스마트스토어 가이드: 복사 값 = 이름·설명·IP · SMARTSTORE_GUIDE = 단계 한 줄', [St.flatMap(s => s.copies || []).map(c => [c.label, c.value]), G.SMARTSTORE_GUIDE[3]],
          [[['이름', 'EUCHS 스튜디오'], ['설명', '상세페이지 제작 후 내 스토어 상품 등록'], ['IP', '3.39.196.112']], 'API 호출 IP 3.39.196.112 입력 후 반드시 [추가] (목록에 들어가야 함)'])
        eq('연결 창: 단계 안내 컴포넌트 · 복사 버튼 · 크게 보기 · 센터 링크 새 창', [/<StudioSmartstoreGuide \/>/.test(ssCard), /data-mk-ss-copy/.test(ssGuide), /data-mk-ss-zoom[\s>]/.test(ssGuide), /:href="SMARTSTORE_API_CENTER_URL" target="_blank" rel="noopener noreferrer"/.test(ssGuide)], [true, true, true, true])
      }
      eq('화면: 카드 = 관문 · 시크릿은 password 칸 · ID 끝 4자리만 · 연결 탭에 카드', [/await studioGate\('\/studio\/channels\/connect\?link=smartstore'\)/.test(ssCard), /type="password"[^>]*data-mk-ss-f-secret/.test(ssCard), /•••• \{\{ acc\.key_last4 \}\}/.test(ssCard), /<StudioSmartstoreCard \/>/.test(mkView)], [true, true, true, true])
      eq('보내기 탭: 스마트스토어 연결되면 보낼 수 있음(2026-10-01 — 예전 "연결됨"만)', R.channelRows({ smartstore: { connected: true } }).find(r => r.key === 'smartstore').state, 'connected')
    }
    // ── 카페24 — 우리 앱 "EUCHS 스튜디오" + 쇼핑몰 ID + 동의 화면 (2026-09-30 앱 방식, 가짜 응답만) ──
    {
      const K = await import('../api/_cafe24.js')
      const L = await import('../src/lib/studioCafe24Launch.js')
      const c24 = read('api/_cafe24.js'), c24Card = read('src/components/studio/StudioCafe24Card.vue'), appSql = read('docs/sql/2026-09-30-cafe24-app-mode.sql')
      const ENC = Buffer.alloc(32, 7), UID = '11111111-2222-3333-4444-555555555555', NOW = 1790000000
      eq('돌아오는 주소 = 등록한 두 값(www·비www) · 가이드와 서버가 같은 값(www) · 접속 도메인에 맞춰 고름', [K.CAFE24_REDIRECT_URIS, G.CAFE24_REDIRECT_URI === K.CAFE24_REDIRECT_URI, K.redirectKeyFor('https://www.euchs.co.kr'), K.redirectKeyFor('https://euchs.co.kr'), K.redirectKeyFor('https://euchs.co.kr/'), K.redirectKeyFor('http://localhost:5176'), K.redirectKeyFor(undefined)], [{ w: 'https://www.euchs.co.kr/studio/channels/connect', a: 'https://euchs.co.kr/studio/channels/connect' }, true, 'w', 'a', 'a', 'w', 'w'])
      eq('앱 값 = 서버 환경변수 CAFE24_CLIENT_ID·SECRET에서만 · 없으면 null', [K.appCredentials({ CAFE24_CLIENT_ID: ' CID ', CAFE24_CLIENT_SECRET: 'SEC' }), K.appCredentials({ CAFE24_CLIENT_ID: 'CID' }), K.appCredentials({})], [{ clientId: 'CID', clientSecret: 'SEC' }, null, null])
      const au = new URL(K.authorizeUrl({ mallId: 'myshop', clientId: 'CID12345', state: 'c24.x', redirectUri: K.CAFE24_REDIRECT_URIS.a }))
      eq('동의 주소 = 공식 형식 · 권한 3개(공백 구분) · 주소에 시크릿 없음 · 고른 돌아오는 주소 그대로', [au.origin + au.pathname, au.searchParams.get('response_type'), au.searchParams.get('client_id'), au.searchParams.get('redirect_uri'), au.searchParams.get('scope'), au.searchParams.get('state')], ['https://myshop.cafe24api.com/api/v2/oauth/authorize', 'code', 'CID12345', 'https://euchs.co.kr/studio/channels/connect', 'mall.read_product mall.write_product mall.read_category', 'c24.x'])
      let hostErr = '', redirErr = false
      try { K.authorizeUrl({ mallId: 'evil.com/x', clientId: 'a', state: 's' }) } catch (e) { hostErr = e.code }
      try { K.authorizeUrl({ mallId: 'myshop', clientId: 'a', state: 's', redirectUri: 'https://evil.example/cb' }) } catch { redirErr = true }
      eq('쇼핑몰 ID = 영문 소문자·숫자만 (주소 조작 막음) · 입력 정리 · 등록 안 된 돌아오는 주소는 안 만듦', [hostErr, redirErr, K.isMallId('myshop01'), K.isMallId('My-Shop'), K.normalizeMallId(' MyShop.cafe24.com/admin '), K.normalizeMallId('https://myshop.cafe24.com')], ['invalid_input', true, true, false, 'myshop', 'myshop'])
      const st = K.makeState(ENC, UID, 'myshop', 'a', NOW)
      eq('state: 쇼핑몰 ID·돌아오는 주소를 담고 서명 · 이 사용자·10분 안만 · 다른 사용자·만료·위조(쇼핑몰 바꿔치기 포함)·다른 키는 거절', [st.startsWith('c24.'), K.verifyState(ENC, st, UID, NOW + 60), K.verifyState(ENC, st, '99999999-2222-3333-4444-555555555555', NOW), K.verifyState(ENC, st, UID, NOW + 601), K.verifyState(ENC, st.slice(0, -2) + 'AA', UID, NOW), K.verifyState(ENC, st.replace('.myshop.', '.evilshop.'), UID, NOW), K.verifyState(Buffer.alloc(32, 8), st, UID, NOW), K.verifyState(ENC, '', UID, NOW)], [true, { mallId: 'myshop', redirectUri: 'https://euchs.co.kr/studio/channels/connect' }, null, null, null, null, null, null])
      // App URL hmac — 쿼리 원문에서 hmac 칸만 빼고 Client Secret으로 HMAC-SHA256 → base64
      const SEC = 'APPSECRET9'
      const body = `lang=ko_KR&mall_id=myshop&nation=KR&shop_no=1&timestamp=${NOW}&user_id=myshop&user_name=%EB%8C%80%ED%91%9C%20%EA%B4%80%EB%A6%AC%EC%9E%90&user_type=P`
      const sig = crypto.createHmac('sha256', SEC).update(body).digest('base64')
      const good = `${body}&hmac=${encodeURIComponent(sig)}`
      eq('App URL hmac: 맞으면 쇼핑몰 ID · 틀린 서명·다른 시크릿·칸 바꿔치기·시각 지남·hmac 없음·쇼핑몰 ID 이상 = 거절', [
        K.verifyLaunch(SEC, good, NOW + 10), K.verifyLaunch(SEC, `?${good}`, NOW), K.verifyLaunch(SEC, `${body}&hmac=${sig}`, NOW).ok,
        K.verifyLaunch('OTHER', good, NOW).reason, K.verifyLaunch(SEC, good.replace('mall_id=myshop', 'mall_id=evilshop'), NOW).reason,
        K.verifyLaunch(SEC, good, NOW + 3 * 3600).reason, K.verifyLaunch(SEC, body, NOW).reason, K.verifyLaunch(SEC, good.replace('mall_id=myshop', 'mall_id=a.b'), NOW).reason, K.verifyLaunch('', good, NOW).reason,
      ], [{ ok: true, mallId: 'myshop' }, { ok: true, mallId: 'myshop' }, true, 'bad_hmac', 'bad_hmac', 'bad_time', 'no_hmac', 'bad_mall', 'no_hmac'])
      // 쿼리 원문 붙잡기 — 라우터가 주소를 다시 쓰기 전에
      const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) } }
      const s1 = mem(), s2 = mem()
      const cap = [L.captureCafe24Launch({ pathname: '/studio/channels/connect', search: `?${good}` }, s1), L.captureCafe24Launch({ pathname: '/studio/channels/connect', search: '?code=a&state=c24.x' }, s2), L.captureCafe24Launch({ pathname: '/mall', search: `?${good}` }, s2)]
      eq('App URL 원문 붙잡기: 연결 탭 + hmac·mall_id일 때만 · 원문 그대로 한 번만 꺼냄 · 30분 지나면 버림', [cap, L.hasCafe24Launch(s1), L.takeCafe24Launch(s1) === good, L.takeCafe24Launch(s1), (L.captureCafe24Launch({ pathname: '/studio/channels/connect', search: `?${good}` }, s2), L.takeCafe24Launch(s2, Date.now() + 31 * 60000))], [[true, false, false], true, true, null, null])
      eq('라우터가 만들어지기 전에 붙잡음 (router/index.js가 먼저 불러옴)', /import '\.\.\/lib\/studioCafe24Launch'/.test(read('src/router/index.js')), true)
      const calls = []
      const fake = (status, text) => async (url, opt) => { calls.push({ url, opt }); return { ok: status < 400, status, text: async () => text } }
      const OK = JSON.stringify({ access_token: 'AT', expires_at: '2026-10-01T14:00:00.000', refresh_token: 'RT', refresh_token_expires_at: '2026-10-15T12:00:00.000', client_id: 'CID12345', mall_id: 'myshop', user_id: 'u', scopes: ['mall.read_product', 'mall.write_product', 'mall.read_category'], issued_at: '2026-10-01T12:00:00.000', shop_no: '1' })
      const base = { mallId: 'myshop', clientId: 'CID12345', clientSecret: 'SECRET999', breakerKey: 'ok' }
      const tok = await K.exchangeCode({ ...base, fetchImpl: fake(200, OK) }, 'CODE1', K.CAFE24_REDIRECT_URIS.a)
      const b1 = new URLSearchParams(calls[0].opt.body)
      eq('코드 교환(가짜 응답): 공식 주소 · Basic(우리 client_id:secret) · form · 동의 때와 같은 돌아오는 주소 · 시크릿은 본문에 없음 · 시각은 한국 시각으로 읽음', [calls[0].url, calls[0].opt.method, calls[0].opt.headers.Authorization, calls[0].opt.headers['Content-Type'], [...b1.entries()], calls[0].opt.body.includes('SECRET999'), tok.accessToken, tok.refreshToken, tok.accessExpiresAt, tok.refreshExpiresAt, tok.mallId, K.missingScopes(tok.scopes)], ['https://myshop.cafe24api.com/api/v2/oauth/token', 'POST', `Basic ${Buffer.from('CID12345:SECRET999').toString('base64')}`, 'application/x-www-form-urlencoded', [['grant_type', 'authorization_code'], ['code', 'CODE1'], ['redirect_uri', 'https://euchs.co.kr/studio/channels/connect']], false, 'AT', 'RT', '2026-10-01T05:00:00.000Z', '2026-10-15T03:00:00.000Z', 'myshop', []])
      await K.refreshAccess({ ...base, breakerKey: 'rf', fetchImpl: fake(200, OK) }, 'RT-OLD')
      eq('갱신 = grant_type refresh_token + 예전 refresh 토큰 (새 토큰을 받는다)', [...new URLSearchParams(calls[1].opt.body).entries()], [['grant_type', 'refresh_token'], ['refresh_token', 'RT-OLD']])
      const codes = [], msgs = []
      for (const [s, t, k] of [[401, '{"error":"invalid_client"}', 'a'], [400, '{"error":"invalid_grant","error_description":"code expired"}', 'b'], [400, '{"error":"invalid_request","error_description":"redirect_uri mismatch"}', 'c'], [200, '{"access_token":"x"}', 'd'], [429, '', 'e'], [503, '', 'f']]) {
        try { await K.exchangeCode({ ...base, breakerKey: k, fetchImpl: fake(s, t) }, 'C') } catch (e) { codes.push(e.code); msgs.push(e.message) }
      }
      let down = ''
      try { await K.exchangeCode({ ...base, breakerKey: 'g', fetchImpl: async () => { throw new Error('down') } }, 'C') } catch (e) { down = e.code }
      eq('토큰 오류: 우리 앱 값·돌아오는 주소 문제 = "잠시 후 다시"(고객 문구에 Client ID·Secret·주소 없음) · 동의 시간 지남 · 응답 모양 이상 · 너무 잦음 · 장애 · 끊김', [[...codes, down], msgs[0], msgs[2], msgs.some(m => /Client|Secret|Redirect|cafe24api/i.test(m))], [['cafe24_not_ready', 'code_expired', 'cafe24_not_ready', 'market_bad_json', 'rate_limited', 'market_server', 'market_unreachable'], C.NOT_READY_MESSAGE, C.NOT_READY_MESSAGE, false])
      eq('권한이 빠지면 목록 · 갱신 시점 = refresh 만료 7일 안(지난 건 아님)', [K.missingScopes(['mall.read_product']), K.needsRefresh(new Date(Date.now() + 3 * 86400000).toISOString()), K.needsRefresh(new Date(Date.now() + 10 * 86400000).toISOString()), K.needsRefresh(new Date(Date.now() - 1000).toISOString())], [['mall.write_product', 'mall.read_category'], true, false, false])
      eq('카페24 = 중계 안 거침(IP 제한 없음) · 같은 브레이커 · 토큰은 로그에서 가림 · 앱 값은 환경변수에서만(코드에 값 없음)', [/relayUrl|x-relay-secret/.test(c24), /breakerFor\(`cafe24:/.test(c24), /"\$1":"\[가림\]"/.test(c24), /env\.CAFE24_CLIENT_ID/.test(c24) && /env\.CAFE24_CLIENT_SECRET/.test(c24), /VITE_CAFE24/.test(c24 + api + c24Card)], [false, true, true, true, false])
      const fin = /async function cafe24Finish[\s\S]*?\n\}/.exec(api)[0], beg = /async function cafe24Begin[\s\S]*?\n\}/.exec(api)[0], lau = /async function cafe24Launch[\s\S]*?\n\}/.exec(api)[0], keep = /async function keepCafe24Alive[\s\S]*?\n\}/.exec(api)[0]
      eq('서버: 시작은 DB 쓰기 없음 · App URL은 hmac 확인 뒤에만 동의 주소 · 끝낼 때 state 확인·쇼핑몰 대조·권한 확인·토큰만 암호화 저장(고객 앱 값 없음)', [
        /sb\(/.test(beg), /verifyLaunch\(app\.clientSecret/.test(lau), lau.indexOf('if (!v.ok)') < lau.indexOf('cafe24Authorize('), /'bad_launch'/.test(lau),
        /const st = verifyState\(encKey, body\.state, ctx\.userId\)/.test(fin), /tok\.mallId !== st\.mallId/.test(fin), /missingScopes\(tok\.scopes\)/.test(fin), /exchangeCode\(\{ mallId: st\.mallId, \.\.\.app, breakerKey: ctx\.userId \}, code, st\.redirectUri\)/.test(api),
        /access_key_enc: null, secret_key_enc: null/.test(api), /oauth_enc: encryptSecret\(JSON\.stringify\(\{ access_token: tok\.accessToken, refresh_token: tok\.refreshToken \}\), encKey\)/.test(api), /status: 'pending'/.test(api), /clientSecret: decryptSecret/.test(api),
        /oauth_enc|secret_key_enc|access_key_enc|key_last4/.test(/function cafe24Public[\s\S]*?\n\}/.exec(api)[0]), /2026-09-30-cafe24-app-mode\.sql 실행 필요/.test(fin),
        /refreshAccess\(\{ mallId: row\.seller_login_id, \.\.\.app/.test(keep), /e\.code === 'code_expired'/.test(keep), /'bad_key'/.test(keep),
      ], [false, true, true, true, true, true, true, true, true, true, false, false, false, true, true, true, false])
      eq('서버: 판매처 연결 action에 cafe24_launch (studioGuard 뒤)', [api.includes("body.action === 'cafe24_launch'"), api.indexOf('const ctx = await studioGuard(req, res)') < api.indexOf("body.action === 'cafe24_launch'")], [true, true])
      eq('SQL(앱 방식): 미실행 · 예전 카페24 규칙·pending 빼기 · 카페24만 access_key_enc 비움 · 토큰 필수·앱 값 없음 · 새 표·GRANT 없음 · 되돌리기', [
        /상태: 미실행/.test(appSql), /drop constraint if exists marketplace_accounts_cafe24_fields/.test(appSql), /drop constraint if exists marketplace_accounts_pending_cafe24/.test(appSql),
        /alter column access_key_enc drop not null/.test(appSql), /check \(market = 'cafe24' or access_key_enc is not null\)/.test(appSql),
        /access_key_enc is null and secret_key_enc is null\s+and oauth_enc is not null and access_expires_at is not null and expires_at is not null/.test(appSql),
        /status in \('connected', 'invalid', 'expired'\)\);/.test(appSql), /create table|grant /i.test(appSql.replace(/--.*$/gm, '')), /\/\* 되돌리기[\s\S]*alter column access_key_enc set not null/.test(appSql),
      ], [true, true, true, true, true, true, true, false, true])
      eq('쇼핑몰 ID 검사(고객 입력은 이것 하나) · 돌아온 주소 판별(c24. state만) · App URL 판별', [R.cafe24MallProblems({ mallId: 'myshop' }), R.cafe24MallProblems({ mallId: 'MyShop.cafe24.com' }), R.cafe24MallProblems({ mallId: 'My Shop' }), 'cafe24KeyProblems' in R, R.isCafe24Return({ code: 'a', state: 'c24.x' }), R.isCafe24Return({ error: 'access_denied', state: 'c24.x' }), R.isCafe24Return({ code: 'a' }), R.isCafe24Return({ code: 'a', state: 'naver' }), R.isCafe24Launch({ mall_id: 'a', hmac: 'x' }), R.isCafe24Launch({ mall_id: 'a' }), R.isNotReady('cafe24_not_ready')], [[], [], ['쇼핑몰 ID'], false, true, true, false, false, true, false, true])
      eq('화면: 카드 = 관문 · 입력 칸은 쇼핑몰 ID 하나(Client ID·Secret 칸·개발자센터 안내 없음) · 돌아오면 code·state를 주소에서 뗌 · App URL 칸도 뗌 · 연결 탭에 카드', [/await studioGate\('\/studio\/channels\/connect\?link=cafe24'\)/.test(c24Card), (c24Card.match(/<input /g) || []).length, /data-mk-c24-f-mall/.test(c24Card), /Client ID|Client Secret|client_secret|type="password"|개발자센터/.test(c24Card), /const \{ code, state, error, error_description, \.\.\.rest \} = q\s+router\.replace\(\{ query: rest \}\)/.test(c24Card), /for \(const k of CAFE24_LAUNCH_KEYS\) delete rest\[k\]/.test(c24Card), /<StudioCafe24Card v-if="showCafe24" \/>/.test(mkView)], [true, 1, true, false, true, true, true])
    }
    {
      // 연결 탭 깜빡임 (2026-09-30 운영) — auth.js가 같은 사용자로 euchs-auth-changed를 다시 보낼 때(탭 복귀 SIGNED_IN·TOKEN_REFRESHED) 상태를 비우지 않는다
      const links = read('src/lib/studioMarketLinks.js')
      eq('상태 모듈: 로그인 전 안 부름 · 로그아웃·다른 사용자면 비움 · 같은 사용자면 비우지 않고 다시 읽기만 · 다시 읽기 실패해도 보여 주던 값 유지', [
        /if \(!uid\) \{ reset\(\); return \}/.test(links), /addEventListener\('euchs-auth-changed', e => onAuthChangedForLinks\(e\.detail\?\.user\)\)/.test(links),
        /if \(!uid \|\| \(uid !== shownUid && uid !== loadingUid\)\) reset\(\)/.test(links), /if \(shownUid && shownUid !== uid\) reset\(\)/.test(links), // 2026-09-30: 같은 사용자를 읽는 중이면 비우지 않음(요청 한 번)
        /addEventListener\('euchs-auth-changed', e => \{ reset\(\);/.test(links), /catch \(e\) \{[\s\S]*?marketLinks\.error = e\.message[\s\S]*?\}/.test(links) && !/catch \(e\) \{[^}]*Object\.assign\(marketLinks, blank\(\)\)/.test(links),
      ], [true, true, true, true, false, true])
    }
  }
  const screenText = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '').replace(/카페24 관리자/g, '') } // "카페24 관리자" = 카페24 화면 이름 — 허용
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
  eq('화면 이름 (2026-10-02): 사이드바 "내 상품" · 판매처 탭 "전송 기록" · 내 상품 화면 제목 "내 상품"', [/label: '내 상품'/.test(read('src/layouts/StudioLayout.vue')), /<h2 class="st-h-section">전송 기록<\/h2>/.test(read('src/components/studio/StudioSendList.vue')), /<h1 class="st-h-page">내 상품<\/h1>/.test(read('src/views/studio/StudioHomeView.vue'))], [true, true, true])
  eq('변수·DB 이름은 그대로 (studio_exports · exportId · exports_list)', [/studio_exports/.test(read('api/studio-upload.js')), /exportId/.test(read('src/components/studio/StudioSendCoupang.vue')), /exports_list/.test(read('api/studio-upload.js'))], [true, true, true])

  // 3-2 보낼 판매처
  const rowsOn = R.marketRows({ coupang: { connected: true } }), rowsOff = R.marketRows({ coupang: { connected: false } })
  eq('판매처 줄(고객) = PUBLIC_MARKETS 8곳·같은 순서 (카페24 없음) · 관리자도 같은 8곳 (운영 중단 off)', [rowsOn.map(r => r.name), rowsOn.map(r => r.key), R.marketRows({}, { admin: true }).map(r => r.key)], [R.PUBLIC_MARKETS.map(m => m.name), R.PUBLIC_MARKETS.map(m => m.key), R.MARKETS.filter(m => !m.off).map(m => m.key)])
  // S3-3: 보내기 창도 보내기 탭과 같은 규칙(channelRows) — 키 연결 판매처는 연결 상태, 나머지 5곳 = "예정"(planned). "준비 중"(soon) 없음
  eq('줄 상태: 연결됨 = connected · 연결 전 = locked · 스마트스토어·11번가·지그재그 = 연결 전 locked · 카페24 = 고객·관리자 모두 줄 없음(연결돼 있어도 — off) · 나머지 5곳 = planned', [rowsOn[0].state, rowsOff[0].state, R.marketRows()[0].state, Object.fromEntries(rowsOn.slice(1).map(r => [r.key, r.state])), R.marketRows({ cafe24: { connected: true } }).some(r => r.key === 'cafe24'), R.marketRows({ cafe24: { connected: true } }, { admin: true }).some(r => r.key === 'cafe24'), R.marketRows === R.channelRows], ['connected', 'locked', 'locked', { smartstore: 'locked', '11st': 'locked', gmarket: 'planned', ably: 'planned', zigzag: 'locked', makeshop: 'planned', godomall: 'planned' }, false, false, true])
  eq('처음 체크: 연결된 곳만 체크 · 연결 전이면 아무것도 체크 안 됨', [R.checkedMarkets(rowsOn, R.defaultChecked(rowsOn)), R.checkedMarkets(rowsOff, R.defaultChecked(rowsOff))], [['coupang'], []])
  eq('체크할 수 없는 줄은 값이 들어와도 보내지 않음', [R.checkedMarkets(rowsOn, { coupang: true, smartstore: true, cafe24: true }), R.checkedMarkets(rowsOff, { coupang: true })], [['coupang'], []])
  eq('버튼 글자: 1곳 = 이름 · 0곳·여러 곳 = "선택한 판매처로 보내기"', [R.sendButtonLabel(['coupang']), R.sendButtonLabel([]), R.sendButtonLabel(['coupang', 'smartstore']), R.sendButtonLabel(['11st']), R.sendButtonLabel(['smartstore'])], ['쿠팡으로 보내기', '선택한 판매처로 보내기', '선택한 판매처로 보내기', '11번가로 보내기', '스마트스토어로 보내기'])
  const shell = read('src/components/studio/StudioSendModal.vue')
  const shellShown = shell.slice(shell.indexOf('<template>'), shell.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  eq('보내기 창: "판매처 *"가 맨 위(번호 없음) · 체크박스 줄 · 자물쇠 + [연결하기] · "예정" 배지(준비 중 없음 — S3-3)', [/<h4 class="st-h-card">판매처 \*<\/h4>/.test(shellShown) && !/0\. 보낼 판매처/.test(shellShown), shellShown.indexOf('data-mk-s-markets') < shellShown.indexOf('<component :is="SECTIONS[key]"'), /type="checkbox" :disabled="r\.state !== 'connected'/.test(shellShown), /<Lock /.test(shellShown), /:to="\{ name: 'studio-settings-marketplace' \}"[^>]*>연결하기</.test(shellShown), /v-else-if="r\.state === 'planned'" class="st-badge shrink-0"[^>]*>\{\{ PLANNED_LABEL \}\}</.test(shellShown) && !/준비 중/.test(shellShown)], [true, true, true, true, true, true])
  eq('보내기 창: 체크 0개 → 빠짐 목록 "판매처" · 버튼은 빠짐이 있으면 꺼짐', [/if \(!picked\.value\.length\) return \['판매처'\]/.test(shell), /:disabled="!canSend" data-mk-s-send/.test(shellShown)], [true, true])
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
  eq('판매처별 섹션 컴포넌트 분리: 쿠팡 항목은 쿠팡 섹션에만 · 체크됐을 때만 보임 · 카페24 섹션 추가(2026-09-30) · 스마트스토어·11번가 섹션 추가(2026-10-01)', [/const SECTIONS = \{ coupang: StudioSendCoupang, smartstore: StudioSendSmartstore, '11st': StudioSendElevenst, cafe24: StudioSendCafe24, zigzag: StudioSendZigzag \}/.test(shell), /v-show="picked\.includes\(key\)"/.test(shellShown), /data-mk-s-mode-pick|saleMode|noticeItems/.test(shell), /defineExpose\(\{ missing, busy, done, submit(, sendError)?(, applyPreset, pickedCategory)? \}\)/.test(read('src/components/studio/StudioSendCoupang.vue'))], [true, true, false, true])
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
  eq('배지 색: 승인 대기·판매처에서 삭제됨 회색 · 승인·등록됨(카페24) 초록 · 반려·실패 빨강', R.SEND_BADGE_CLASS, { sending: 'st-badge', approval_pending: 'st-badge', approved: 'st-badge st-badge-ok', registered: 'st-badge st-badge-ok', rejected: 'st-badge st-badge-danger', failed: 'st-badge st-badge-danger', deleted: 'st-badge', ended: 'st-badge' })
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
  eq('1 창 폭: 보내기 창 = 화면 폭 90%(최대 1400px) · 다른 창의 wide는 그대로', [/<StudioModal :open="open" :title="prepare\?\.resend \? '수정 후 다시 보내기' : '판매처로 보내기'" full /.test(shell), modalBox.includes("full ? 'w-[90vw] max-w-[1400px]' : wide ? 'w-full max-w-2xl' : 'w-full max-w-md'")], [true, true])
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
  eq('3 화면: 옵션 표는 koreanizeSkus를 씀 · 빈 옵션 이름을 상품명으로 채우지 않음 · 가져온 글자는 칸 아래·placeholder', [cp.includes('const kr = koreanizeSkus(list, { valueMax: ATTR_VALUE_MAX, nameMax: 150 })'), /items\[0\]\.name = f\.value\.productName/.test(cp), /data-mk-s-origin/.test(cp), /:placeholder="it\.originals\[t\.key\] \|\| /.test(cp)], [true, false, true, true])

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
  eq('화면: "브랜드 없음" 체크(기본) · 체크면 입력 꺼짐 · [브랜드 검색] · 여러 개면 선택 · 경고 한 줄', [/type="checkbox" data-mk-s-no-brand/.test(shown), /:disabled="f\.noBrand" placeholder="브랜드 이름" data-mk-s-brand/.test(shown), /data-mk-s-brand-find/.test(shown), /v-if="!f\.noBrand && brandChoices\.length > 1"[^>]*data-mk-s-brand-pick/.test(shown), /data-mk-s-brand-warn/.test(shown), shown.includes('상품명에 브랜드명이 포함된 경우 "브랜드 없음"을 해제하고 브랜드를 입력하세요.')], [true, true, true, true, true, true])
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
  eq('화면: "옵션 이름" 열은 기본 숨김 · [옵션 이름 직접 입력] 링크 · 보낼 때 자동 이름', [/<th v-if="f\.manualNames">옵션 이름 \*<\/th>/.test(shown), /<td v-if="f\.manualNames" class="c-name"/.test(shown), /manualNames: false/.test(cp), /data-mk-s-names-toggle/.test(shown), shown.includes("'옵션 이름 직접 입력'"), cp.includes('name: itemNames.value[i],'), cp.includes('const autoNames = computed(() => autoItemNames(f.value.items.map(buyValuesOf)))')], [true, true, true, true, true, true, true])

  // 옵션 종류 2개 — 종류 수만큼 맞추기·열, 줄은 SKU 수만큼
  const two = F.extractSkus1688(ITEM_1688)
  const pairOf = zh => ({ zh, ko: null })
  const kr2 = F.koreanizeSkus(two.rows.map(r => ({ values: r.values.map(v => ({ name: pairOf(v.name), value: pairOf(v.value) })) })))
  eq('옵션 종류 2개(색상+사이즈): 종류 2 · 줄 = SKU 수 · 자동 이름', [kr2.types.map(t => t.label), kr2.rows.length, F.autoItemNames(kr2.rows.map(r => kr2.types.map(t => r.opt[t.key])))], [['색상', '사이즈'], 3, ['블랙 / 36-37', '화이트 / 36-37', '블랙 / 40-41']])
  eq('화면: 맞추기 줄·표 열이 옵션 종류 수만큼 (v-for)', [/<div v-for="t in f\.optionTypes" :key="t\.key" class="flex flex-wrap items-center gap-2 text-\[13px\]">/.test(shown), /<th v-for="t in f\.optionTypes" :key="t\.key">/.test(shown), /<td v-for="\(t, ti\) in f\.optionTypes" :key="t\.key"/.test(shown), /f\.value\.items = list\.map\(/.test(cp)], [true, true, true, true])
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
  eq('보낸 상품 목록(2026-10-02): 사유 칸 = 기록된 사유 그대로 · 실패·반려 최근 기록에만 [수정 후 재전송](fixAction) · 보내면 목록 다시 읽기 · 로그아웃 때 비움', [/:data-mk-send-reason="s\.id">\{\{ s\.reason \}\}</.test(sl), /<button v-if="fixAction\(p, s\)"[^>]*data-mk-send-resend/.test(sl), sl.includes("const FIX_LABEL = '수정 후 재전송'"), /@sent="onResent"/.test(sl), /resendPrepare\.value = null/.test(sl)], [true, true, true, true, true])
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

// ── 19. 카페24 상품 보내기 (2026-09-30) — api/_cafe24.js 순수 함수 · 화면·서버 배선 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const K = await import('../api/_cafe24.js')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const api = read('api/marketplace.js'), sec = read('src/components/studio/StudioSendCafe24.vue'), shell = read('src/components/studio/StudioSendModal.vue')
  const sv = read('src/views/studio/StudioChannelSendView.vue'), sl = read('src/components/studio/StudioSendList.vue'), lib = read('src/lib/studioMarketplace.js'), sql = read('docs/sql/2026-09-30-marketplace-sends-cafe24.sql')
  // 본문 — 진열·판매 안 함 · 필수 = 상품명·supply_price(판매가와 같게) · 상세 = 올린 경로 <img>
  const b = K.buildCafe24Product({ productName: '  매일 쓰는\n머그  ', price: 12900, categoryNo: 27, detailPaths: ['https://m.cafe24.com/web/upload/NNEditor/01.jpg', 'https://m.cafe24.com/web/upload/NNEditor/02.jpg'] })
  // 2026-09-30 운영 422 "[Product image] Wrong image path": NNEditor 경로는 detail_image에 못 넣는다 → 등록 본문에 대표 이미지 없음 (전용 API로 뒤에)
  eq('카페24 본문: 진열 F·판매 F · 상품명 정리 · price = supply_price(문자열) · 옵션 없음 · 대표 이미지(detail_image·image_upload_type) 없음 · 분류 1개(recommend F·new F)', [b.ok, b.body.request.display, b.body.request.selling, b.body.request.product_name, b.body.request.price, b.body.request.supply_price, b.body.request.has_option, 'image_upload_type' in b.body.request, 'detail_image' in b.body.request, b.body.request.add_category_no], [true, 'F', 'F', '매일 쓰는 머그', '12900', '12900', 'F', false, false, [{ category_no: 27, recommend: 'F', new: 'F' }]])
  eq('상세 HTML: 올린 경로를 순서대로 <img> · alt = 상품명 + 번호 · 스크립트·우리 토큰 주소 없음', [(b.body.request.description.match(/<img /g) || []).length, /alt="매일 쓰는 머그 상세 1"/.test(b.body.request.description), /api\/marketplace\?t=|<script/.test(b.body.request.description), b.body.request.description.indexOf('01.jpg') < b.body.request.description.indexOf('02.jpg')], [2, true, false, true])
  eq('카페24 본문: 분류를 안 고르면 add_category_no 없음(미분류) · 상품명 없음·판매가 소수·상세 이미지 없음·분류 음수는 거절', [
    'add_category_no' in K.buildCafe24Product({ productName: 'a', price: 0, detailPaths: ['x'] }).body.request,
    K.buildCafe24Product({ productName: '', price: 1, detailPaths: ['x'] }).ok, K.buildCafe24Product({ productName: 'a', price: 12.5, detailPaths: ['x'] }).ok,
    K.buildCafe24Product({ productName: 'a', price: 1, detailPaths: [] }).ok, K.buildCafe24Product({ productName: 'a', price: 1, categoryNo: -1, detailPaths: ['x'] }).ok,
  ], [false, false, false, false, false])
  // 진열 선택 (2026-09-30): display 'T'|'F'만, 기본 'F'. 'T'면 selling도 'T'
  const dOn = K.buildCafe24Product({ productName: 'a', price: 1, detailPaths: ['x'], display: 'T' }), dOff = K.buildCafe24Product({ productName: 'a', price: 1, detailPaths: ['x'], display: 'F' }), dNone = K.buildCafe24Product({ productName: 'a', price: 1, detailPaths: ['x'] })
  eq('진열상태: 진열함 = display T·selling T · 진열안함 = F·F · 없으면 F·F · 다른 값은 거절', [[dOn.body.request.display, dOn.body.request.selling], [dOff.body.request.display, dOff.body.request.selling], [dNone.body.request.display, dNone.body.request.selling], K.buildCafe24Product({ productName: 'a', price: 1, detailPaths: ['x'], display: 'Y' }).ok, K.buildCafe24Product({ productName: 'a', price: 1, detailPaths: ['x'], display: true }).ok, [K.isDisplayFlag('T'), K.isDisplayFlag('F'), K.isDisplayFlag('t'), K.isDisplayFlag('')]], [['T', 'T'], ['F', 'F'], ['F', 'F'], false, false, [true, true, false, false]])
  eq('서버·화면: body.display를 검사(isDisplayFlag)해 buildCafe24Product에 넘기고 응답에 display · 목록(publicSend)에 보낸 진열상태 · 섹션 라디오 진열안함(기본 F)/진열함 + 한 줄 안내 · 요약 표 진열상태·판매상태 · 결과 "등록되었습니다"', [
    /if \(!isDisplayFlag\(display\)\) return sendError\(res, 400, 'invalid_input'/.test(read('api/marketplace.js')), /buildCafe24Product\(\{ productName, price, categoryNo, detailPaths, display \}\)/.test(read('api/marketplace.js')), /status: 'registered', display, adminUrl/.test(read('api/marketplace.js')),
    /display: c24 \? \(s\.c24_display === 'T' \? 'T' : 'F'\) : null/.test(read('api/marketplace.js')) && read('api/marketplace.js').includes("'c24_display:request_json->body->request->>display'"), // 2026-10-02 목록은 칸만 골라 읽음(LIST_SELECT)
    /data-mk-c24-display-off/.test(sec) && /data-mk-c24-display-on/.test(sec) && sec.includes("fit: 'contain', display: 'F'"), /진열함을 선택하면 등록 즉시 쇼핑몰에 노출됩니다\./.test(sec),
    /label: '진열상태', value: DISPLAY_LABEL\[f\.value\.display\]/.test(sec) && /label: '판매상태', value: SELLING_LABEL\[f\.value\.display\]/.test(sec), /등록되었습니다\. 상품번호 \{\{ done\.productNo \}\} · \{\{ DISPLAY_LABEL\[f\.display\] \}\}/.test(sec), sec.includes('display: f.value.display,'),
    /진열상태: \{\{ s\.display === 'T' \? '진열함' : '진열안함' \}\}/.test(sl),
  ], [true, true, true, true, true, true, true, true, true, true])
  // 문구 원칙(2026-09-30 해성): 번호 없는 명사 항목명 · 결과 "~되었습니다" · 창 두 개 같은 말투 · 긴 안내 상자 없음
  const cpShown = read('src/components/studio/StudioSendCoupang.vue'), secShown = sec
  // 템플릿 글자만(주석 제외). 고정 문구 "잠시 후 다시 시도해 주세요."(규칙 6)와 로그인 전 안내 카드(StudioLoginNeeded — 창 밖)는 검사에서 뺀다
  const tplText = t => t.slice(t.indexOf('<template>'), t.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '').replace(/잠시 후 다시 시도해 주세요\./g, '').replace(/<StudioLoginNeeded[^>]*>/g, '')
  eq('문구: 쿠팡·카페24 섹션에 "1. 2." 번호 항목명 없음 · 대화체(~어요/~예요/~해요/~돼요/주세요) 없음 · 결과는 "~되었습니다" · 요약 제목 "등록 정보 확인" 두 창 · 빈 값 "미입력"', [
    /<h4 class="st-h-card">\d+\. /.test(cpShown) || /<h4 class="st-h-card">\d+\. /.test(secShown),
    [cpShown, secShown, shell, sv, sl].map(tplText).filter(t => /(어요|예요|해요|돼요|아요|워요|네요|줘요)[.!]|주세요/.test(t)).length,
    /등록 및 승인 요청되었습니다\./.test(cpShown) && /등록되었습니다\. 상품번호/.test(secShown) && /카페24에 등록되었습니다\./.test(sv) && /에 전송되었습니다\./.test(sv),
    (tplText(cpShown).match(/등록 정보 확인/g) || []).length + (tplText(secShown).match(/등록 정보 확인/g) || []).length, /'미입력'/.test(cpShown) && /'미입력'/.test(secShown) && !/비어 있음/.test(cpShown + secShown),
  ], [false, 0, true, 2, true])
  // ③ 대표 이미지 전용 API (POST /products/{product_no}/images) — 문서 요청 예시 = data URI, 필수 image_upload_type, 응답 image.detail_image = /web/product/big/…
  const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10])
  const ri = K.buildCafe24ProductImage(jpg)
  eq('대표 이미지 본문: image_upload_type A · detail_image = data:image/jpeg;base64,… · 빈 버퍼·버퍼 아님은 거절', [ri.ok, ri.body.request.image_upload_type, ri.body.request.detail_image, Object.keys(ri.body.request), K.buildCafe24ProductImage(Buffer.alloc(0)).ok, K.buildCafe24ProductImage('x').ok], [true, 'A', `data:image/jpeg;base64,${jpg.toString('base64')}`, ['image_upload_type', 'detail_image'], false, false])
  eq('대표 이미지 응답: image.detail_image 경로 · 모양 틀리면 null', [K.productImagePath({ image: { shop_no: 1, product_no: 20, detail_image: 'https://m/web/product/big/201801/a.jpeg', list_image: 'x' } }), K.productImagePath({ image: [{ detail_image: 'x' }] }), K.productImagePath({ image: { detail_image: '' } }), K.productImagePath(null)], ['https://m/web/product/big/201801/a.jpeg', null, null, null])
  // 2026-09-30 운영 3차: 정상 응답(product.product_no 숫자)을 /^d{1,20}$/(백슬래시 빠짐)가 떨어뜨림 → 순수 함수 productNoOf를 실제 값으로 검사
  eq('상품 번호 읽기: 숫자(integer) · 문자열 · 없음/null/빈 문자열 · 숫자 모양 아님·소수·음수는 null · 항상 문자열로', [
    K.productNoOf({ product: { shop_no: 1, product_no: 28, product_code: 'P00000BB' } }), K.productNoOf({ product: { product_no: '29' } }), K.productNoOf({ product: { product_no: ' 30 ' } }),
    K.productNoOf({ product: { product_code: 'P00000BB' } }), K.productNoOf({ product: { product_no: null } }), K.productNoOf({ product: { product_no: '' } }), K.productNoOf({}), K.productNoOf(null),
    K.productNoOf({ product: { product_no: 'P28' } }), K.productNoOf({ product: { product_no: 28.5 } }), K.productNoOf({ product: { product_no: -1 } }), typeof K.productNoOf({ product: { product_no: 28 } }),
  ], ['28', '29', '30', null, null, null, null, null, null, null, null, 'string'])
  const c24send2 = /async function cafe24Send[\s\S]*?\n\}/.exec(read('api/marketplace.js'))[0]
  eq('서버: product_no는 productNoOf로만 읽음(손으로 쓴 정규식 없음) · 없으면 rawProductNo·productNoType을 기록에 남김 · 전체 파일에 백슬래시 빠진 /^d{ 없음', [
    /const productNo = productNoOf\(r\)/.test(c24send2), /\^\\?d\{1,20\}/.test(c24send2), /rawProductNo: rawNo/.test(c24send2), /productNoType: typeof r\?\.product\?\.product_no/.test(c24send2), /\/\^d\{/.test(read('api/marketplace.js')),
  ], [true, false, true, true, false])
  const at = k => c24send2.indexOf(k)
  eq('서버 순서: 상세 업로드(products/images) → 상품 등록(대표 없이) → registered 기록 → 대표 이미지(products/{no}/images) · ③ 실패해도 registered 그대로 + repImageError 안내 + result_json.repImage(이유·shape) · 갱신 실패 응답 중복 없음 · 본문 로그 없음', [
    at("path: '/products/images'") < at("path: '/products'"), at("path: '/products'") < at("status: 'registered'"), at("status: 'registered'") < at('path: `/products/${productNo}/images`'),
    /detailImagePath/.test(c24send2), /buildCafe24ProductImage\(rep\.buf\)/.test(c24send2), /result_json: \{ \.\.\.resultJson, repImage \}/.test(c24send2),
    /const repImageError = repImage\.ok \? null : `상품은 등록되었으나 대표 이미지 업로드에 실패했습니다\. 카페24 관리자에서 등록하세요\. \(사유: /.test(c24send2), /if \(alreadyResponded\) return/.test(c24send2), /JSON\.stringify\(ri?\)\.slice/.test(c24send2),
    /data-mk-c24-rep-error/.test(read('src/components/studio/StudioSendCafe24.vue')), /r\.repImageError/.test(read('src/views/studio/StudioChannelSendView.vue')),
  ], [true, true, true, false, true, true, true, true, false, true, true])
  eq('HTML 이스케이프: 상품명·경로의 < > " 가 그대로 들어가지 않음', /<b>|"x"/.test(K.detailHtml(['https://x/a.jpg?a="x"'], '<b>머그</b>')), false)
  eq('분류 응답 정리: full_category_name {1..4} → " > " · 번호 없는 줄 뺌 · 업로드 응답 → 경로 배열(모양 틀리면 null)', [
    K.normalizeCategories({ categories: [{ category_no: 27, category_depth: 2, parent_category_no: 1, category_name: '컵', full_category_name: { 1: '주방', 2: '컵', 3: null, 4: null } }, { category_no: 'x', category_name: '없음' }] }),
    K.uploadedPaths({ image: [{ path: 'https://a/1.jpg' }, { path: 'https://a/2.jpg' }] }), K.uploadedPaths({ image: [{ path: '' }] }), K.uploadedPaths({}),
  ], [[{ no: 27, depth: 2, parentNo: 1, name: '컵', fullName: '주방 > 컵' }], ['https://a/1.jpg', 'https://a/2.jpg'], null, null])
  // 2026-09-30 운영 실패(2회 모두 upload 200 → market_bad_json): 문서가 어긋남 — 응답 스키마 image = 객체 { path }, 예시 image = [{ path }]. 둘 다 받는다
  eq('업로드 응답: 문서 예시(image 배열) · 문서 스키마(image 객체 하나) · images 키 · 경로 문자열 · 빈 배열·경로 없음·null은 null', [
    K.uploadedPaths({ image: [{ path: 'https://m.cafe24.com/web/upload/NNEditor/20180130/a.png' }] }), K.uploadedPaths({ image: { path: '/web/upload/NNEditor/20180130/a.png' } }),
    K.uploadedPaths({ images: [{ path: 'https://a/1.jpg' }] }), K.uploadedPaths({ image: ['https://a/1.jpg'] }), K.uploadedPaths({ image: [] }), K.uploadedPaths({ image: { url: 'x' } }), K.uploadedPaths(null), K.uploadedPaths(''),
  ], [['https://m.cafe24.com/web/upload/NNEditor/20180130/a.png'], ['/web/upload/NNEditor/20180130/a.png'], ['https://a/1.jpg'], ['https://a/1.jpg'], null, null, null, null])
  const longPath = 'https://m.cafe24.com/web/upload/NNEditor/20180130/' + 'x'.repeat(80) + '.png'
  eq('응답 모양 기록: 키 이름·종류·길이·첫 원소 키·path 앞 40자만 — 값(경로 전체·base64·토큰)은 없음', [
    K.responseShape({ image: [{ path: longPath }, { path: 'b' }], access_token: 'SECRET' }), K.responseShape({ image: { path: '/web/x.png', extra: 1 } }), K.responseShape(null), K.responseShape([1, 2]), K.responseShape('text'),
    JSON.stringify(K.responseShape({ image: [{ path: longPath }], access_token: 'SECRET' })).includes('SECRET'), JSON.stringify(K.responseShape({ image: [{ path: longPath }] })).includes('x'.repeat(41)),
  ], [{ type: 'object', keys: ['image', 'access_token'], imageType: 'array', len: 2, firstKeys: ['path'], path40: longPath.slice(0, 40) }, { type: 'object', keys: ['image'], imageType: 'object', firstKeys: ['path', 'extra'], path40: '/web/x.png' }, { type: 'null' }, { type: 'array', len: 2 }, { type: 'string' }, false, false])
  eq('서버: 업로드 실패·성공 모두 result_json.shape에 모양 기록 · 원문 본문(JSON.stringify(r))은 기록·로그에 안 남김 · uploadShape는 c24Fail보다 먼저 선언', [
    (read("api/marketplace.js").match(/shape: uploadShape/g) || []).length >= 2, /JSON\.stringify\(r\)\.slice/.test(/async function cafe24Send[\s\S]*?\n\}/.exec(read('api/marketplace.js'))[0]),
    read('api/marketplace.js').indexOf('let uploadShape = null') < read('api/marketplace.js').indexOf('const c24Fail = async'), /raw: `shape=\$\{JSON\.stringify\(shape\)\}`/.test(read('api/marketplace.js')),
  ], [true, false, true, true])
  const now = Date.parse('2026-09-30T09:00:00Z')
  eq('access 갱신 시점: 지났거나 5분 안에 지나면 · 넉넉하면 아니오 · 값이 없으면 갱신', [K.accessNeedsRefresh('2026-09-30T08:59:00Z', now), K.accessNeedsRefresh('2026-09-30T09:04:00Z', now), K.accessNeedsRefresh('2026-09-30T09:06:00Z', now), K.accessNeedsRefresh(null, now)], [true, true, false, true])
  eq('Admin API 오류 → 고객 문구: 401 = 다시 연결 · 403 = 권한 · 429 · 422 = 카페24 문구 그대로 · 500 · 끊김 · 성공은 null · 내부 용어 없음', (() => {
    const all = [[401, ''], [403, ''], [429, ''], [422, '{"error":{"code":422,"message":"상품명은 필수입니다."}}'], [500, ''], [0, ''], [200, '']].map(([s, t]) => K.translateCafe24Api(s, t))
    return [all.map(x => x && x.code), all[3].message.includes('상품명은 필수입니다.'), all.filter(Boolean).some(x => /관리자|서버|암호화|중계|토큰/.test(x.message))]
  })(), [['token_invalid', 'scope_denied', 'rate_limited', 'market_rejected', 'market_server', 'market_unreachable', null], true, false])
  eq('버전 헤더는 환경변수 CAFE24_API_VERSION(yyyy-mm-dd)이 있을 때만 · 코드에 날짜 없음', [K.apiVersionHeader({ CAFE24_API_VERSION: '2025-06-01' }), K.apiVersionHeader({ CAFE24_API_VERSION: 'latest' }), K.apiVersionHeader({}), /X-Cafe24-Api-Version'\] = ver/.test(read('api/_cafe24.js'))], ['2025-06-01', null, null, true])
  eq('관리 화면 주소: 쇼핑몰 ID·상품 번호가 올바를 때만', [K.cafe24AdminProductUrl('myshop', 28), K.cafe24AdminProductUrl('My Shop', 28), K.cafe24AdminProductUrl('myshop', 'x')], ['https://myshop.cafe24.com/disp/admin/shop1/product/ProductRegister?product_no=28', null, null])
  // 화면 규칙
  eq('"카페24로" 조사: 숫자로 끝나는 이름 · 버튼 글자', [R.withRo('카페24'), R.withRo('11번가'), R.withRo('쿠팡'), R.withRo('G마켓·옥션'), R.sendButtonLabel(['cafe24'])], ['카페24로', '11번가로', '쿠팡으로', 'G마켓·옥션으로', '카페24로 보내기'])
  // 누른 판매처만 처음 체크 — 2026-10-02 카페24 운영 중단(off) 뒤로는 스마트스토어로 확인 (관리자 기준 — 관리자도 카페24 칸 없음)
  const both = R.channelRows({ coupang: { connected: true }, smartstore: { connected: true }, cafe24: { connected: true } }, { admin: true })
  const visibleKeys = R.MARKETS.filter(m => !m.off).map(m => m.key)
  eq('처음 체크(관리자): 누른 판매처만(market) · 다시 보내기는 쿠팡만 · 없으면 연결된 곳 모두 · 연결 안 된 곳을 눌러 열면 체크 안 됨 · 카페24로 열어도 카페24 칸 없음', [R.initialChecked(both, { market: 'smartstore' }), R.initialChecked(both, { resend: true }), R.initialChecked(both), R.initialChecked(R.channelRows({ coupang: { connected: true } }, { admin: true }), { market: 'smartstore' }).smartstore, 'cafe24' in R.initialChecked(both, { market: 'cafe24' })], [{ ...Object.fromEntries(visibleKeys.map(k => [k, false])), smartstore: true }, { ...Object.fromEntries(visibleKeys.map(k => [k, false])), coupang: true }, R.defaultChecked(both), false, false])
  eq('처음 체크(고객): 카페24로 열어도 카페24 칸 자체가 없음 · 아무것도 체크 안 됨', (() => { const c = R.initialChecked(R.channelRows({ coupang: { connected: true }, cafe24: { connected: true } }), { market: 'cafe24' }); return ['cafe24' in c, Object.values(c).some(Boolean)] })(), [false, false])
  eq('보내기 창: market prop → initialChecked · 카페24 섹션 = 같은 모양(missing·busy·done·submit) · 판매가는 정수 검사 · 분류는 선택(못 읽어도 보냄)', [
    /market: \{ type: String, default: '' \}/.test(shell), shell.includes("initialChecked(rows.value, { market: props.market, resend: !!props.prepare.resend, sent: sentMap.value })") /* 2026-10-01 sent = 이미 보낸 판매처 */,
    /defineExpose\(\{ missing, busy, done, submit(, sendError)?(, applyPreset, pickedCategory)? \}\)/.test(sec), sec.includes('Number.isInteger(f.value.price) && f.value.price >= 0'), /<option :value="null">미분류<\/option>/.test(sec), sec.includes('catError.value = e.message'),
    /진열함을 선택하면 등록 즉시 쇼핑몰에 노출됩니다\./.test(sec) && /등록 정보 확인/.test(sec) && !/진열 안 함 · 판매 안 함 상태로 등록돼요/.test(sec), /sendCafe24Product\(\{/.test(sec) && /listCafe24Categories\(\)/.test(sec),
  ], [true, true, true, true, true, true, true, true])
  eq('보내기 탭: [카페24로 보내기] = 같은 버튼(sendButtonLabel) · 창에 market 전달 · 등록 뒤 "등록되었습니다" + 관리자 링크 (코드 보존 — 운영 중단으로 화면에 줄 없음) · 보낸 상품의 [판매처에서 보기]는 없앰', [
    /:market="sendMarket"/.test(sv), sv.includes("sendMarket.value = market"), /카페24에 등록되었습니다\./.test(sv), /data-ch-admin-link/.test(sv), !/data-mk-send-admin|판매처에서 보기/.test(sl) /* 2026-10-02 카페24 전용이라 없앰 */, /s\.market === 'cafe24' && s\.status === 'registered'/.test(sl),
    read('src/lib/studioMarketplaceRules.js').includes("registered: '등록 완료'") /* 2026-10-02 상태 문구 한 곳 */, lib.includes("call('cafe24_send', payload)"), lib.includes("call('cafe24_categories')"),
  ], [true, true, true, true, true, true, true, true, true])
  // 서버 배선 — 쿠팡 흐름은 그대로
  const c24send = /async function cafe24Send[\s\S]*?\n\}/.exec(api)[0], cred = /async function cafe24Credentials[\s\S]*?\n\}/.exec(api)[0]
  eq('서버: action cafe24_categories·cafe24_send (studioGuard 뒤) · 토큰 갱신 = access 만료 5분 전·강제 · 새 refresh 바로 저장 · invalid_grant면 expired + 다시 연결 · 기록은 카페24를 부르기 전에 만들고 규칙 없으면 503', [
    api.includes("body.action === 'cafe24_send'"), api.includes("body.action === 'cafe24_categories'"), api.indexOf('const ctx = await studioGuard(req, res)') < api.indexOf("body.action === 'cafe24_send'"),
    /force \|\| accessNeedsRefresh\(row\.access_expires_at\)/.test(cred), /await saveCafe24Token\(ctx, encKey, mallId, fresh\)/.test(cred), /status: 'expired'/.test(cred), /'key_expired'/.test(cred),
    c24send.indexOf("market: CAFE24, status: 'sending'") < c24send.indexOf("path: '/products/images'"), /marketplace_sql_missing/.test(c24send), /2026-09-30-marketplace-sends-cafe24\.sql/.test(c24send),
    /display, selling: display,/.test(read('api/_cafe24.js')), /status: 'registered'/.test(c24send), /api\/marketplace\?t=/.test(c24send),
  ], [true, true, true, true, true, true, true, true, true, true, true, true, false])
  eq('서버: 응답·기록에 토큰 없음 (access_token은 헤더로만) · 상태 확인 = 판매처 공통 checkMarket(2026-10-02 — 쿠팡 전용 sync 대신) · 목록 = 관리자 쿠팡+카페24+스마트스토어+11번가 / 고객 쿠팡+스마트스토어+11번가 (2026-10-01)', [
    /access_token|refresh_token|oauth_enc/.test(c24send), /Bearer \$\{c\.accessToken\}/.test(read('api/_cafe24.js')), /market=eq\.\$\{market\}&seller_product_id=not\.is\.null&status=in\.\(\$\{CHECK_STATUSES\.join\(','\)\}\)/.test(api),
    api.includes('const markets = cafe24Allowed(ctx) ? `${MARKET},${CAFE24},${SMARTSTORE},${ELEVENST},${ZIGZAG}` : `${MARKET},${SMARTSTORE},${ELEVENST},${ZIGZAG}`') && /market=in\.\(\$\{markets\}\)&order=created_at\.desc/.test(api), /market: MARKET, status: 'sending', request_json: \{\} \}/.test(api),
  ], [false, true, true, true, true])
  eq('SQL: marketplace_sends market에 cafe24 · status에 registered · 새 표·GRANT 없음 · 미실행 표시', [/check \(market in \('coupang', 'cafe24'\)\)/.test(sql), /'registered'\)\)/.test(sql), /create table|grant /.test(sql), /상태: 미실행/.test(sql)], [true, true, false, true])
}

// ── 연결 탭 "연결 전" 깜빡임 + 문구 합니다체 (2026-09-30 운영) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const P = R.linkPhase
  eq('단계: 읽음 = ready(오류가 있어도) · 로그인 확인 중 = checking · 로그인 전 = guest · 로그인 + 읽는 중 = checking · 로그인 + 한 번도 못 읽음 = failed', [
    P({ loaded: true, loggedIn: true, error: 'x' }), P({ authLoading: true }), P({}), P({ loggedIn: true }), P({ loggedIn: true, error: '잠시 후 다시 시도해 주세요.' }),
  ], ['ready', 'checking', 'guest', 'checking', 'failed'])
  eq('못 읽음 문구', R.LINK_LOAD_FAILED, '연결 상태를 불러오지 못했습니다.')
  // 2026-09-30 운영: 주문 없는 계정(studioGuard 403 not_customer)이 'failed'로 보여 [다시 시도]만 반복 → 'locked'로 구분 (자격 판정은 서버 그대로)
  const U = { loggedIn: true }
  eq('자격: not_customer(403) = locked · 500·네트워크(코드 없음)·준비 문제 = failed · 정상 응답 = ready · 허용 명단 계정(서버가 통과시켜 정상 응답) = ready · 로그인 확인 중이면 코드가 있어도 checking', [
    P({ ...U, error: '스튜디오는 EUCHS에서 주문하신 고객님께 무료로 열려 있어요.', code: 'not_customer' }),
    P({ ...U, error: '잠시 후 다시 시도해 주세요.', code: 'server_error' }), P({ ...U, error: 'Failed to fetch' }), P({ ...U, error: '지금은 연결할 수 없어요.', code: 'relay_unreachable' }),
    P({ ...U, loaded: true }), P({ ...U, loaded: true, error: 'x', code: 'not_customer' }), P({ authLoading: true, error: 'x', code: 'not_customer' }), P({ error: 'x', code: 'not_customer' }),
  ], ['locked', 'failed', 'failed', 'failed', 'ready', 'ready', 'checking', 'guest'])
  const mk = read('src/views/studio/StudioMarketplaceView.vue'), pend = read('src/components/studio/StudioLinkPending.vue'), links = read('src/lib/studioMarketLinks.js'), sv = read('src/views/studio/StudioChannelSendView.vue')
  const cards = ['StudioElevenstCard', 'StudioSmartstoreCard', 'StudioCafe24Card'].map(n => read(`src/components/studio/${n}.vue`))
  // "연결 전" 배지·[연결하기] 앞에 자리표시(v-else-if waiting)가 먼저 온다 — 읽기 전에는 "연결 전"이 그려지지 않는다
  const pendBeforeOff = t => { const a = t.search(/<StudioLinkPending v-else-if="(waiting|cpWaiting)" part="badge"/), b = t.indexOf('<span v-else class="st-badge ml-auto">연결 전</span>'); return a > 0 && b > a }
  eq('카드 4개: 배지 자리 = 자리표시가 "연결 전"보다 먼저 · 본문도 자리표시(다시 시도 = 다시 읽기) · 쿠팡 "불러오는 중…" 줄 없음 · 못 읽은 채 [쿠팡 연결하기] 보이던 조건 없음', [
    [mk, ...cards].map(pendBeforeOff), cards.every(t => /<StudioLinkPending v-else-if="waiting" :phase="phase" @retry="loadMarketLinks" \/>/.test(t)), /<StudioLinkPending v-else-if="cpWaiting" :phase="cpPhase" @retry="load" \/>/.test(mk),
    /불러오는 중…/.test(mk), /v-else-if="st \|\| loadError \|\| !loggedIn"/.test(mk),
  ], [[true, true, true, true], true, true, false, false])
  eq('자리표시: 확인 중 = 스켈레톤(버튼 없음) · 못 읽음 = 고정 문구 + [다시 시도] · 단계는 linkPhase 하나(auth 로딩 포함) · 다시 시도하면 오류를 비워 확인 중으로', [
    /phase === 'checking'" class="st-skeleton/.test(pend), /\{\{ LINK_LOAD_FAILED \}\}/.test(pend) && /data-mk-link-retry @click="\$emit\('retry'\)">다시 시도</.test(pend),
    /linkPhase\(\{ authLoading: isAuthLoading\.value/.test(links), /if \(!marketLinks\.loaded && marketLinks\.code !== NOT_CUSTOMER\) \{ marketLinks\.error = ''; marketLinks\.code = '' \}/.test(links), (links.match(/linkPhase\(/g) || []).length, /export function linkPhase/.test(read('src/lib/studioMarketplaceRules.js')) && (read('src/lib/studioMarketplaceRules.js').match(/export function linkPhase/g) || []).length,
  ], [true, true, true, true, 1, 1])
  eq('보내기 탭: 잠긴 줄은 읽는 중·못 읽음이면 자물쇠·[연결하기] 대신 자리표시 · 못 읽으면 목록 아래 [다시 시도] · 원인 줄은 읽은 뒤 실패에만', [
    /<StudioLinkPending v-else-if="rowWaiting\(r\)" part="badge"/.test(sv), sv.indexOf('rowWaiting(r)') > 0 && sv.indexOf('rowWaiting(r)') < sv.lastIndexOf(':data-ch-connect="r.key"'),
    /<StudioLinkPending v-if="rowsFailed" phase="failed" @retry="retryRows" \/>/.test(sv), /v-if="statusError && status"/.test(sv), /r\.state === 'locked' && \['checking', 'failed'\]\.includes\(rowPhase\(r\.key\)\)/.test(sv),
  ], [true, true, true, true, true])
  const acc = read('src/lib/studioAccess.js'), lay = read('src/layouts/StudioLayout.vue')
  eq('locked 화면: 서버 코드를 단계로 넘김(쿠팡·11번가 등·보내기 탭 쿠팡 줄) · 카드는 자리표시가 아니라 "연결 전"+[연결하기](관문이 안내 창) · 탭 위 안내 한 번 = 스튜디오 안내 창과 같은 상수 · 몰 버튼 /mall · [다시 시도] 없음', [
    /code: loadCode\.value/.test(mk) && /loadCode\.value = e\.code/.test(mk), /code: marketLinks\.code/.test(links) && /marketLinks\.code = e\.code/.test(links), /code: statusCode\.value/.test(sv) && /statusCode\.value = e\.code/.test(sv),
    /const waiting = computed\(\(\) => phase\.value === 'checking' \|\| phase\.value === 'failed'\)/.test(cards[0]), /const noAccess = computed\(\(\) => cpPhase\.value === 'locked' \|\| marketLinksPhase\.value === 'locked'\)/.test(mk),
    (mk.match(/data-mk-no-access[\s>]/g) || []).length, /\{\{ STUDIO_NO_ACCESS_TITLE \}\}[\s\S]*\{\{ STUDIO_NO_ACCESS_BODY \}\}[\s\S]*to="\/mall"[^>]*>\{\{ STUDIO_NO_ACCESS_MALL \}\}/.test(mk),
    /\{\{ STUDIO_NO_ACCESS_BODY \}\}/.test(lay) && /\{\{ STUDIO_NO_ACCESS_MALL \}\}/.test(lay), /export const STUDIO_NO_ACCESS_BODY = '/.test(acc),
    /다시 시도/.test(mk.slice(mk.indexOf('data-mk-no-access'), mk.indexOf('</section>', mk.indexOf('data-mk-no-access')))),
  ], [true, true, true, true, true, 1, true, true, true, false])
  eq('자격 판정은 화면에 없음 — 서버 studioGuard·isBgEligible·허용 명단을 화면이 부르거나 흉내 내지 않음', /isBgEligible|STUDIO_ALLOW_EMAILS|isAllowListed/.test(mk + links + sv + read('src/lib/studioMarketplaceRules.js')), false)
  // 연결 탭 화면 글자(템플릿 + 알림·안내 문자열) — 대화체 없음. 서버 오류 문구(e.message)는 이 작업 범위 밖
  const G = await import('../src/lib/studioMarketGuides.js')
  const tpl = t => t.slice(t.indexOf('<template>'), t.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  const strs = t => (t.slice(t.indexOf('<script setup>')).replace(/^\s*\/\/.*$/gm, '').match(/'[^'\n]*[가-힣][^'\n]*'|`[^`\n]*[가-힣][^`\n]*`/g) || []).join('\n')
  const guideVue = read('src/components/studio/StudioMarketplaceGuide.vue')
  const talk = /(어요|예요|해요|돼요|아요|워요|네요|줘요|까요|에요)[.!?]|주세요/
  eq('문구: 연결 탭 카드·확인창·성공/실패·쿠팡 가이드·가이드 단계에 대화체 없음 · 탭 위 한 줄 합니다체', [
    [mk, ...cards, guideVue, read('src/components/studio/StudioSmartstoreGuide.vue')].filter(t => talk.test(tpl(t)) || talk.test(strs(t))).length,
    [...G.ELEVENST_GUIDE, ...Object.values(G.ELEVENST_STEP_NOTES), ...G.SMARTSTORE_STEPS.flatMap(s => [s.text, s.warn, s.note].filter(Boolean)), ...G.CAFE24_GUIDE, G.CAFE24_GUIDE_ALT].filter(s => talk.test(s)).length,
    mk.includes('완성한 상세페이지를 판매처에 바로 등록할 수 있습니다. 가이드를 참고하여 직접 연결하세요.'),
    mk.includes('쿠팡 Wing에서 발급한 OPEN API 키를 입력하면 상품을 바로 등록할 수 있습니다.'),
  ], [0, 0, true, true])
}

// ── 보내기 창 여는 속도 (2026-09-30 운영: "여는 중…" 10~18초) — 창 먼저 · 준비는 창 안에서 · 같은 화면 안에서 다시 받지 않기 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const sv = read('src/views/studio/StudioChannelSendView.vue'), sl = read('src/components/studio/StudioSendList.vue')
  const shell = read('src/components/studio/StudioSendModal.vue'), sec = read('src/components/studio/StudioSendCafe24.vue')
  const shellTpl = shell.slice(shell.indexOf('<template>'), shell.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  const body = (src, head) => { const i = src.indexOf(head); return i < 0 ? '' : src.slice(i, src.indexOf('\n}\n', i)) }
  const open = body(sv, 'async function openSend(market)')
  eq('보내기 탭: 창을 먼저 연다 (sendOpen = true가 관문·준비 데이터보다 앞) · 관문과 준비 데이터를 같이 시작 · 로그인 전이면 서버를 부르지 않음', [
    open.indexOf('sendOpen.value = true') > 0 && open.indexOf('sendOpen.value = true') < open.lastIndexOf('await studioGate(resume)'),
    open.indexOf('if (!fresh) loadPrepare(exportId)') > 0 && open.indexOf('if (!fresh) loadPrepare(exportId)') < open.lastIndexOf('await studioGate(resume)'),
    /if \(!\(await studioGate\(resume\)\)\) \{ prepareSeq\+\+; sendOpen\.value = false \}/.test(open),
    open.indexOf('if (!loggedIn.value) { await studioGate(resume); return }') > 0 && open.indexOf('if (!loggedIn.value)') < open.indexOf('loadPrepare('),
    /await sendToMarketplace/.test(open),
  ], [true, true, true, true, false])
  eq('보내기 탭: 같은 상품은 10분 안에 다시 받지 않음 · 보낸 뒤·로그아웃·사용자 바뀜이면 버림 · 늦은 응답은 버림', [
    sv.includes('const PREPARE_KEEP_MS = 10 * 60 * 1000'), /Date\.now\(\) - kept\.at < PREPARE_KEEP_MS \? kept\.prepare : null/.test(open),
    /function onSent\(r\) \{\s+prepared\.delete\(sendExportId\.value\)/.test(sv), /prepared\.clear\(\)\s+prepareSeq\+\+/.test(sv), /if \(uid !== prev\) prepared\.clear\(\)/.test(sv),
    /if \(my === prepareSeq\) sendPrepare\.value = r\.prepare/.test(sv), /if \(my === prepareSeq\) sendLoadError\.value = e\.message/.test(sv),
  ], [true, true, true, true, true, true, true])
  eq('창: 준비 데이터 없음 = "상품 정보 불러오는 중…" + 자리표시 · 못 받음 = 이유 + [다시 시도](retry) · "준비 중" 글자 없음 · 두 진입 모두 load-error·retry 연결', [
    /data-mk-s-loading[\s\S]*상품 정보 불러오는 중…[\s\S]*st-skeleton/.test(shellTpl), /v-else-if="loadError"[\s\S]*\{\{ loadError \}\}[\s\S]*data-mk-s-load-retry @click="\$emit\('retry'\)"/.test(shellTpl), /준비 중/.test(shellTpl),
    /defineEmits\(\['close', 'sent', 'retry'\]\)/.test(shell), /loadError: \{ type: String, default: '' \}/.test(shell),
    /:load-error="sendLoadError"[^>]*@retry="loadPrepare\(sendExportId\)"/.test(sv), /:load-error="resendError"[^>]*@retry="loadFix"/.test(sl),
  ], [true, true, false, true, true, true, true])
  eq('창: 준비 데이터가 늦게 와도 그때 섹션을 만들고 처음 체크를 정함 (prepare.markets를 본 뒤)', [
    /watch\(\(\) => props\.open, v => \{ if \(v\) resetForPrepare\(\) \}\)/.test(shell), /watch\(\(\) => props\.prepare, \(p, old\) => \{ if \(props\.open && p && p !== old\) resetForPrepare\(\) \}\)/.test(shell),
    shell.includes('checked.value = props.prepare ? initialChecked(rows.value, { market: props.market, resend: !!props.prepare.resend, sent: sentMap.value }) : {}'),
  ], [true, true, true])
  const resend = body(sl, 'function openFix(p, s)')
  eq('다시 보내기: 창을 먼저 열고(기다리지 않음) 창 안에서 받음 · 로그아웃이면 늦은 응답 버림', [/resendOpen\.value = true\s+loadFix\(\)/.test(resend), /await/.test(resend), /resendSeq\+\+/.test(body(sl, 'function clear()'))], [true, false, true])
  eq('카페24 분류: 창이 들고 있는 목록(sendCache)을 같이 씀 · 받는 중이면 같은 요청 · 실패는 기억 안 함 · 로그인 바뀜이면 비움', [
    /const sendCache = inject\(SEND_CACHE_KEY, null\)/.test(sec), /if \(!sendCache\.cafe24Categories\) \{\s+const p = listCafe24Categories\(\)/.test(sec), /delete sendCache\.cafe24Categories/.test(sec),
    /const done = sendCache\?\.cafe24CategoriesDone\s+if \(done\)/.test(sec), /provide\(SEND_CACHE_KEY, sendCache\)/.test(shell), /addEventListener\('euchs-auth-changed', clearSendCache\)/.test(shell) && /removeEventListener\('euchs-auth-changed', clearSendCache\)/.test(shell),
  ], [true, true, true, true, true, true])
  // 보내는 내용은 그대로 — 카페24 submit 본문(요청 칸 7개)·쿠팡 섹션·창 submit 순서
  eq('보내는 내용 그대로: 카페24 요청 칸 7개 · 창은 고른 판매처 차례로 submit()', [
    body(sec, 'async function submit()').includes("exportId: props.prepare.export.id, productName: String(f.value.productName).trim(), price: f.value.price,\n      categoryNo: f.value.categoryNo ?? null, repImageId: f.value.repImageId, fit: f.value.fit, display: f.value.display,"),
    /const keys = picked\.value\.filter\(k => !sections\[k\]\?\.done\)[\s\S]*for \(const key of keys\) \{\s+const s = sections\[key\]\s+if \(!s\) continue\s+const r = await s\.submit\(\)/.test(shell), // 2026-10-01: 등록된 곳(done)은 keys에서 미리 뺀다
  ], [true, true])
}

// ── 20. 스마트스토어 상품 보내기 (2026-10-01) — 가짜 중계 응답으로 보내는 요청을 고정한다 (실제 네이버 호출 없음) ──
// 가짜 네이버(중계 /smartstore 뒤). ssRelay.mode로 실패를 흉내 낸다
var ssRelay = { mode: 'ok', uploads: 0 }
function smartstoreRelay(u, method, opts) {
  const p = u.pathname.replace(/^\/smartstore/, '')
  if (p === '/external/v1/oauth2/token' && method === 'POST') return json({ access_token: 'ss-access-token', expires_in: 10800, token_type: 'Bearer' })
  if (opts.headers.Authorization !== 'Bearer ss-access-token') return json({ code: 'GW.AUTHN', message: '요청을 보낼 권한이 없습니다.' }, 401)
  if (p === '/external/v1/categories' && method === 'GET') return json([
    { wholeCategoryName: '생활/건강>주방용품>잔/컵>머그컵', id: '50000999', name: '머그컵', last: true },
    { wholeCategoryName: '생활/건강>주방용품', id: '50000100', name: '주방용품', last: false },
    { wholeCategoryName: '가구/인테리어>수납', id: '50000555', name: '수납', last: true },
  ])
  if (p === '/external/v1/seller/addressbooks-for-page' && method === 'GET') {
    const page = Number(new URLSearchParams(u.search).get('page'))
    const A = (no, name, type, overseas = false) => ({ addressBookNo: no, name, addressType: type, baseAddress: overseas ? '항주' : '광주 북구', detailAddress: '1층', address: overseas ? '중국 항주 1층' : '광주 북구 1층', phoneNumber1: '010-0000-0000', overseasAddress: overseas })
    return json(page === 1 ? { addressBooks: [A(101, '본사', 'REPRESENTATIVE'), A(102, '물류창고', 'RELEASE')], page: 1, totalPage: 2 } : { addressBooks: [A(103, '반품센터', 'REFUND_OR_EXCHANGE'), A(104, '항주 창고', 'RELEASE', true)], page: 2, totalPage: 2 })
  }
  if (p === '/external/v1/product-images/upload' && method === 'POST') {
    if (ssRelay.mode === 'upload-fail') return json({ code: 'BAD_REQUEST', message: '올바른 이미지 파일이 아닙니다.' }, 400)
    const raw = Buffer.from(opts.body), boundary = /boundary=(\S+)/.exec(opts.headers['Content-Type'])[1]
    const parts = raw.toString('latin1').split(`--${boundary}`).filter(x => x.includes('name="imageFiles"'))
    // sameUrl = 네이버처럼 같은 바이트면 같은 주소 (운영: 내보낸 03·14·15가 같은 파일 → 같은 주소)
    return json({ images: parts.map(x => ({ url: ssRelay.sameUrl ? `https://shop-phinf.pstatic.net/same/${crypto.createHash('md5').update(Buffer.from(x.slice(x.indexOf('\r\n\r\n') + 4, -2), 'latin1')).digest('hex').slice(0, 12)}.jpg` : `https://shop-phinf.pstatic.net/test/${++ssRelay.uploads}.jpg` })) })
  }
  if (p === '/external/v2/products' && method === 'POST') {
    if (ssRelay.mode === 'reject') return json({ code: 'BAD_REQUEST', message: '상품 등록 실패', invalidInputs: [{ name: 'originProduct.leafCategoryId', type: 'NotNull', message: '카테고리를 입력해주세요.' }] }, 400)
    // 운영 1차(2026-10-01) — 해외 출고지(104)인데 관부가세가 없으면 400. invalidInputs는 운영 응답 그대로, 맨 위 message는 테스트용 가짜
    const pb = JSON.parse(opts.body)
    if (pb.originProduct?.deliveryInfo?.claimDeliveryInfo?.shippingAddressId === 104 && !pb.originProduct?.detailAttribute?.customsTaxType) {
      return json({ code: 'BAD_REQUEST', message: '상품 등록 요청 정보가 올바르지 않습니다.', invalidInputs: [{ name: 'originProduct.detailAttribute.customsTaxType', type: 'customsTaxType.required.overseas', message: '출고지가 해외 주소인 경우 해외 상품에 해당하므로 관부가세 입력이 필수입니다.' }] }, 400)
    }
    // int64 — JS 안전 정수를 넘는 번호도 글자 그대로 읽는지
    return new Response('{"originProductNo":9007199254740993,"smartstoreChannelProductNo":12345678901,"originProduct":{"statusType":"SALE"}}', { status: 200, headers: { 'Content-Type': 'application/json;charset=UTF-8' } })
  }
  // 계정 정보 조회 (2026-10-02 계정 식별값) — accountUid = ssRelay.accountUid (기본 'uid-A')
  if (p === '/external/v1/seller/account' && method === 'GET') return json({ accountId: 'mystore', accountUid: ssRelay.accountUid || 'uid-A', grade: 'BIG_POWER' })
  // 상태 확인 (2026-10-02) — ssRelay.products = { 원상품번호: statusType | 'GONE'(원상품 조회 404 NOT_FOUND) }. 목록 조회는 GONE·HIDDEN을 돌려주지 않는다
  if (p === '/external/v1/products/search' && method === 'POST') {
    const b = JSON.parse(opts.body), map = ssRelay.products || {}
    ssRelay.searchBodies = [...(ssRelay.searchBodies || []), b]
    return json({ contents: (b.originProductNos || []).map(String).filter(no => map[no] && !['GONE', 'HIDDEN'].includes(map[no])).map(no => ({ originProductNo: Number(no), channelProducts: [{ originProductNo: Number(no), channelProductNo: Number(no) + 1, channelServiceType: 'STOREFARM', statusType: map[no], channelProductDisplayStatusType: 'ON' }] })), page: 1, size: b.size, totalElements: 0 })
  }
  const op = /^\/external\/v2\/products\/origin-products\/(\d+)$/.exec(p)
  // 원상품 수정 (2026-10-02 다시 보내기 = 수정) — 본문을 ssRelay.puts에 남기고 등록과 같은 모양으로 응답(채널상품번호는 ssRelay.putChannel 또는 그대로)
  if (op && method === 'PUT') {
    if (ssRelay.mode === 'put-reject') return json({ code: 'BAD_REQUEST', message: '상품 수정 실패', invalidInputs: [{ name: 'originProduct.name', type: 'Size', message: '상품명이 너무 깁니다.' }] }, 400)
    ssRelay.puts = [...(ssRelay.puts || []), { no: op[1], body: JSON.parse(opts.body) }]
    return new Response(`{"originProductNo":${op[1]},"smartstoreChannelProductNo":${ssRelay.putChannel || '12345678901'}}`, { status: 200, headers: { 'Content-Type': 'application/json;charset=UTF-8' } })
  }
  // 원상품 조회 — ssRelay.full[번호] = 판매처에 있는 상품 전체(수정 테스트). 없으면 상태 확인용 간단 응답
  if (op && method === 'GET' && ssRelay.full?.[op[1]]) return json(ssRelay.full[op[1]])
  if (op && method === 'GET') {
    const st = (ssRelay.products || {})[op[1]]
    if (st === 'GONE' || st == null) return json({ code: 'NOT_FOUND', message: '데이터 없음', timestamp: '2026-10-02T00:00:00Z' }, 404)
    return json({ originProduct: { statusType: st === 'HIDDEN' ? 'SUSPENSION' : st, name: 'x' } })
  }
  return json({ code: 'GW.NOT_FOUND', message: 'no route' }, 404)
}
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const S = await import('../api/_smartstore.js')
  const SF = await import('../api/_smartstoreFields.js')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const { default: sharp } = await import('sharp')

  // 1) 등록 본문 — 문서 필수 칸만 · 화면 값 그대로 · 모르는 칸 없음
  const IN = {
    productName: ' 매일 쓰는\n머그 ', salePrice: 12900, stock: 30, leafCategoryId: '50000999', repUrl: 'https://shop-phinf.pstatic.net/a/rep.jpg', detailUrls: ['https://shop-phinf.pstatic.net/a/1.jpg', 'https://shop-phinf.pstatic.net/a/2.jpg'], display: 'SUSPENSION',
    delivery: { company: 'CJGLS', feeType: 'FREE', returnFee: 3000, exchangeFee: 6000, shippingAddressId: 102, returnAddressId: 103 },
    afterService: { phone: '010-1234-5678', guide: '상세페이지 참조' }, origin: { code: '03' }, notice: { itemName: '머그컵', modelName: 'MUG-01', manufacturer: '이유씨' },
  }
  const b = S.buildSmartstoreProduct(IN)
  eq('스마트스토어 본문: 전체 모양 고정 (등록 = statusType SALE · 전시중지 · 네이버쇼핑 등록 false · 기타 재화 고시 · 원산지 03 · 무료배송 · 주소록 번호)', b, { ok: true, body: {
    originProduct: {
      statusType: 'SALE', leafCategoryId: '50000999', name: '매일 쓰는 머그',
      detailContent: '<div style="text-align:center"><img src="https://shop-phinf.pstatic.net/a/1.jpg" alt="매일 쓰는 머그 상세 1" style="max-width:100%;height:auto;display:block;margin:0 auto" /><img src="https://shop-phinf.pstatic.net/a/2.jpg" alt="매일 쓰는 머그 상세 2" style="max-width:100%;height:auto;display:block;margin:0 auto" /></div>',
      images: { representativeImage: { url: 'https://shop-phinf.pstatic.net/a/rep.jpg' } }, salePrice: 12900, stockQuantity: 30,
      deliveryInfo: { deliveryType: 'DELIVERY', deliveryAttributeType: 'NORMAL', deliveryCompany: 'CJGLS', deliveryFee: { deliveryFeeType: 'FREE' }, claimDeliveryInfo: { returnDeliveryFee: 3000, exchangeDeliveryFee: 6000, shippingAddressId: 102, returnAddressId: 103 } },
      detailAttribute: {
        afterServiceInfo: { afterServiceTelephoneNumber: '010-1234-5678', afterServiceGuideContent: '상세페이지 참조' }, originAreaInfo: { originAreaCode: '03' }, minorPurchasable: true,
        productInfoProvidedNotice: { productInfoProvidedNoticeType: 'ETC', etc: { itemName: '머그컵', modelName: 'MUG-01', manufacturer: '이유씨', customerServicePhoneNumber: '010-1234-5678' } },
      },
    },
    smartstoreChannelProduct: { naverShoppingRegistration: false, channelProductDisplayStatusType: 'SUSPENSION' },
  } })
  const paid = S.buildSmartstoreProduct({ ...IN, display: 'ON', delivery: { ...IN.delivery, feeType: 'PAID', baseFee: 3000 }, origin: { code: '04', content: '중국' } })
  eq('유료배송 = PAID + baseFee + PREPAID · 원산지 직접 입력 = 04 + content · 전시중 = ON', [paid.body.originProduct.deliveryInfo.deliveryFee, paid.body.originProduct.detailAttribute.originAreaInfo, paid.body.smartstoreChannelProduct.channelProductDisplayStatusType], [{ deliveryFeeType: 'PAID', baseFee: 3000, deliveryFeePayType: 'PREPAID' }, { originAreaCode: '04', content: '중국' }, 'ON'])
  // 조건부 무료 (2026-10-01) — create-product-product 문서 deliveryFee: deliveryFeeType CONDITIONAL_FREE · freeConditionalAmount(max 999999990) · baseFee(max 100000)
  const cond = S.buildSmartstoreProduct({ ...IN, delivery: { ...IN.delivery, feeType: 'CONDITIONAL_FREE', baseFee: 3000, freeOver: 30000 } })
  const condBad = d => S.buildSmartstoreProduct({ ...IN, delivery: { ...IN.delivery, feeType: 'CONDITIONAL_FREE', ...d } })
  eq('조건부 무료 = CONDITIONAL_FREE + baseFee + freeConditionalAmount + PREPAID (문서 칸만) · 나머지 본문은 무료일 때와 같음', [cond.body.originProduct.deliveryInfo.deliveryFee, { ...cond.body.originProduct, deliveryInfo: { ...cond.body.originProduct.deliveryInfo, deliveryFee: null } }],
    [{ deliveryFeeType: 'CONDITIONAL_FREE', baseFee: 3000, freeConditionalAmount: 30000, deliveryFeePayType: 'PREPAID' }, { ...b.body.originProduct, deliveryInfo: { ...b.body.originProduct.deliveryInfo, deliveryFee: null } }])
  eq('조건부 무료 거절: 기준 금액 없음·0·소수·상한 초과 · 기본 배송비 없음·상한 초과 (임의 값으로 채우지 않음) · 상한 그대로는 통과', [
    condBad({ baseFee: 3000 }).message, condBad({ baseFee: 3000, freeOver: 0 }).ok, condBad({ baseFee: 3000, freeOver: 1.5 }).ok, condBad({ baseFee: 3000, freeOver: 999999991 }).ok,
    condBad({ freeOver: 30000 }).message, condBad({ baseFee: 100001, freeOver: 30000 }).ok, condBad({ baseFee: 100000, freeOver: 999999990 }).ok, S.FREE_CONDITIONAL_MAX,
  ], ['무료배송 기준 금액은 1~999,999,990원 정수로 입력하세요.', false, false, false, '기본 배송비는 1~100,000원 정수로 입력하세요.', false, true, 999999990])
  eq('배송비 종류: 문서 enum 중 3개만(수량별·구간별·모르는 값 거절) · 무료·유료 본문은 예전 그대로(freeConditionalAmount 없음)', [
    SF.SS_FEE_TYPES, S.buildSmartstoreProduct({ ...IN, delivery: { ...IN.delivery, feeType: 'UNIT_QUANTITY_PAID', baseFee: 3000 } }).ok, S.buildSmartstoreProduct({ ...IN, delivery: { ...IN.delivery, feeType: 'X' } }).message,
    'freeConditionalAmount' in paid.body.originProduct.deliveryInfo.deliveryFee, S.buildSmartstoreProduct({ ...IN, delivery: { ...IN.delivery, freeOver: 30000 } }).body.originProduct.deliveryInfo.deliveryFee,
    S.buildSmartstoreProduct({ ...IN, delivery: { ...IN.delivery, feeType: 'PAID', baseFee: 3000, freeOver: 30000 } }).body.originProduct.deliveryInfo.deliveryFee,
  ], [['FREE', 'PAID', 'CONDITIONAL_FREE'], false, '배송비 종류를 선택하세요.', false, { deliveryFeeType: 'FREE' }, { deliveryFeeType: 'PAID', baseFee: 3000, deliveryFeePayType: 'PREPAID' }])
  const mkSrc = read('api/marketplace.js')
  eq('서버 화면 값 → 재료(smartstoreInput): 기준 금액은 조건부 무료일 때만 넘김 · 기본 배송비는 유료·조건부일 때만', /baseFee: d\.feeType === 'PAID' \|\| d\.feeType === 'CONDITIONAL_FREE' \? num\(d\.baseFee\) : undefined, \.\.\.\(d\.feeType === 'CONDITIONAL_FREE' \? \{ freeOver: num\(d\.freeOver\) \} : \{\}\)/.test(mkSrc), true)
  const bad = o => S.buildSmartstoreProduct({ ...IN, ...o }).ok
  eq('본문 거절: 판매가 0·소수 · 재고 음수·빈값 · 카테고리 없음 · 전시 WAIT · 택배사 모름 · 유료인데 배송비 없음 · 주소 없음 · A/S 없음 · 04인데 원산지 없음 · 고시 빈칸 · 이미지 없음 (임의 값으로 채우지 않음)', [
    bad({ salePrice: 0 }), bad({ salePrice: 12.5 }), bad({ stock: -1 }), bad({ stock: NaN }), bad({ leafCategoryId: '' }), bad({ display: 'WAIT' }), bad({ display: undefined }),
    bad({ delivery: { ...IN.delivery, company: 'XX' } }), bad({ delivery: { ...IN.delivery, feeType: 'PAID' } }), bad({ delivery: { ...IN.delivery, shippingAddressId: null } }),
    bad({ afterService: { phone: '', guide: 'x' } }), bad({ origin: { code: '04' } }), bad({ origin: { code: '02' } }), bad({ notice: { ...IN.notice, modelName: ' ' } }), bad({ repUrl: '' }), bad({ detailUrls: [] }),
  ], Array(16).fill(false))
  eq('재고 0은 그대로(품절로 등록 — 문서) · 상세 HTML에 우리 토큰 주소·스크립트 없음 · 이스케이프', [S.buildSmartstoreProduct({ ...IN, stock: 0 }).body.originProduct.stockQuantity, /api\/marketplace\?t=|<script/.test(b.body.originProduct.detailContent), /<b>|"x"/.test(S.ssDetailHtml(['https://x/a.jpg?a="x"'], '<b>머그</b>'))], [0, false, false])
  eq('공용 값: 전시 상태 = 문서 ON·SUSPENSION(기본 SUSPENSION) · 택배사 5곳 = 문서 코드 · 서버가 같은 파일을 다시 내보냄', [SF.DISPLAY_STATUSES, SF.SS_DELIVERY_COMPANIES.map(c => c.code), S.DISPLAY_STATUSES === SF.DISPLAY_STATUSES, S.SS_DELIVERY_COMPANIES === SF.SS_DELIVERY_COMPANIES], [['SUSPENSION', 'ON'], ['CJGLS', 'HYUNDAI', 'HANJIN', 'KGB', 'EPOST'], true, true])

  // 2) 응답·업로드 규칙
  eq('응답 읽기: 카테고리는 리프만·전체 이름 순 · 주소록 번호·유형 · 기본 출고지 RELEASE·반품지 REFUND_OR_EXCHANGE', [
    S.normalizeSsCategories([{ wholeCategoryName: 'B>b', id: '2', name: 'b', last: true }, { wholeCategoryName: 'A', id: '1', name: 'A', last: false }, { wholeCategoryName: 'A>a', id: '3', name: 'a', last: true }, { id: 'x', last: true }]).map(c => c.id),
    S.normalizeAddressBooks({ addressBooks: [{ addressBookNo: 7, name: 'n', addressType: 'RELEASE', address: '주소' }, { addressBookNo: 'x' }] }),
    S.defaultAddress([{ id: 1, type: 'REPRESENTATIVE' }, { id: 2, type: 'RELEASE' }, { id: 3, type: 'REFUND_OR_EXCHANGE' }], 'shipping'), S.defaultAddress([{ id: 2, type: 'RELEASE' }, { id: 3, type: 'REFUND_OR_EXCHANGE' }], 'return'), S.defaultAddress([], 'return'),
  ], [['3', '2'], [{ id: 7, name: 'n', type: 'RELEASE', address: '주소', phone: '', overseas: false }], 2, 3, null])
  {
    // 출고지≠반품지 (2026-10-01 운영: 출고지 기본이 "반품교환지"로 잡힘) — 유형 값 = 문서 enum AddressBookType.sellers 8개
    const A = (id, type, overseas = false) => ({ id, type, overseas })
    const P = SF.pickSmartstoreAddress
    const ened = [A(1, 'REFUND_OR_EXCHANGE'), A(2, 'GENERAL'), A(3, 'RELEASE', true)]
    eq('주소 유형 = 문서 enum 8개 그대로', Object.keys(SF.ADDRESS_TYPES), ['REPRESENTATIVE', 'BUSINESS', 'GENERAL', 'RELEASE', 'REFUND_OR_EXCHANGE', 'LOGISTICS_CENTER_RELEASE', 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE', 'OVERSEAS_BANK'])
    // 이니드 주소록 (2026-10-01 운영) — 상품출고지(일반)·반품교환지(반품/교환지)·물류센터 출고지·물류센터 반품/교환지·해외 항주
    const ENID = [A(11, 'REFUND_OR_EXCHANGE'), A(12, 'GENERAL'), A(13, 'LOGISTICS_CENTER_RELEASE'), A(14, 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE'), A(15, 'RELEASE', true)]
    eq('이니드 주소록이면 출고지 기본값 = 상품출고지(일반 12) · 반품지 = 반품교환지(11) · 물류센터 주소는 맨 뒤', [P(ENID, 'shipping'), P(ENID, 'return')], [12, 11])
    eq('출고지≠반품지 기본값: 출고지 RELEASE·반품지 REFUND_OR_EXCHANGE(서로 다름) · 용도 유형 없으면 용도 미지정(일반·사업장) · 그다음 물류센터 · 반품지에 출고지 전용 주소를 먼저 넣지 않음', [
      [P([A(1, 'REFUND_OR_EXCHANGE'), A(2, 'RELEASE')], 'shipping'), P([A(1, 'REFUND_OR_EXCHANGE'), A(2, 'RELEASE')], 'return')],
      [P(ened, 'shipping'), P(ened, 'return')],
      [P([A(3, 'LOGISTICS_CENTER_RELEASE'), A(1, 'RELEASE')], 'shipping'), P([A(4, 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE'), A(1, 'REFUND_OR_EXCHANGE')], 'return')],
      [P([A(3, 'LOGISTICS_CENTER_RELEASE'), A(4, 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE')], 'shipping'), P([A(3, 'LOGISTICS_CENTER_RELEASE'), A(4, 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE')], 'return')],
      [P([A(1, 'REFUND_OR_EXCHANGE'), A(3, 'LOGISTICS_CENTER_RELEASE')], 'shipping'), P([A(2, 'RELEASE'), A(4, 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE')], 'return')],
      P([A(1, 'RELEASE'), A(2, 'REPRESENTATIVE')], 'return'),
    ], [[2, 1], [2, 1], [1, 1], [3, 4], [3, 4], 2])
    eq('기본값 예외: 용도 값이 없으면 예전 그대로(국내 첫째) · 해외만 있으면 목록 첫째 · 정산 계좌(OVERSEAS_BANK)는 고르지 않음 · 빈 목록 null', [
      P([A(7, ''), A(8, '')], 'shipping'), P([A(7, ''), A(8, '')], 'return'), P([A(5, 'RELEASE', true), A(6, 'REFUND_OR_EXCHANGE', true)], 'return'),
      P([A(9, 'OVERSEAS_BANK'), A(2, 'GENERAL')], 'shipping'), P([A(9, 'OVERSEAS_BANK')], 'return'), P([], 'shipping'), S.defaultAddress(null, 'return'),
    ], [7, 7, 5, 2, null, null, null])
    eq('마지막에 보낸 주소: 목록에 있으면 출고지·반품지 각각 그것(해외여도 — 고객이 고른 것) · 없으면 규칙 · 서버 defaultAddress도 같은 함수', [
      P(ened, 'shipping', 1), P(ened, 'return', 2), P(ened, 'shipping', 3), P(ened, 'shipping', 99), P([A(9, 'OVERSEAS_BANK'), A(2, 'GENERAL')], 'shipping', 9),
      S.defaultAddress(ened, 'shipping', { shipping: 1, return: 2 }), S.defaultAddress(ened, 'return', { shipping: 1, return: 2 }), S.defaultAddress(ened, 'return', null),
    ], [1, 2, 3, 2, 2, 1, 2, 1])
    eq('마지막 주소 읽기: claimDeliveryInfo 두 번호 · 없거나 이상하면 null', [SF.lastAddressesOf({ shippingAddressId: 102, returnAddressId: 103 }), SF.lastAddressesOf(null), SF.lastAddressesOf({ shippingAddressId: '102', returnAddressId: -1 })], [{ shipping: 102, return: 103 }, { shipping: null, return: null }, { shipping: null, return: null }])
  }
  eq('주소록 해외 여부 = 문서 칸 overseasAddress(boolean) 그대로 · true일 때만 해외', S.normalizeAddressBooks({ addressBooks: [{ addressBookNo: 1, overseasAddress: true }, { addressBookNo: 2, overseasAddress: false }, { addressBookNo: 3 }, { addressBookNo: 4, overseasAddress: 'true' }] }).map(a => a.overseas), [true, false, false, false])
  // 관부가세 (2026-10-01 운영 1차 400 customsTaxType.required.overseas)
  const OVS = { ...IN, delivery: { ...IN.delivery, shippingAddressId: 104, shippingOverseas: true } }
  eq('관부가세: 문서 값 3개 · 해외 출고지 + 값 없음 = 거절 · 해외 + 값 = detailAttribute.customsTaxType · 국내 = 칸 없음(운영 2차 성공 본문 그대로) · 문서 밖 값 거절', [
    SF.CUSTOMS_TAX_TYPES.map(t => t.code), S.buildSmartstoreProduct(OVS).ok, S.buildSmartstoreProduct({ ...OVS, customsTaxType: '' }).ok,
    S.buildSmartstoreProduct({ ...OVS, customsTaxType: 'EXCLUDED' }).body.originProduct.detailAttribute.customsTaxType, 'customsTaxType' in b.body.originProduct.detailAttribute,
    S.buildSmartstoreProduct({ ...IN, customsTaxType: 'FREE' }).ok, S.buildSmartstoreProduct(OVS).message,
  ], [['NOT_APPLICABLE', 'INCLUDED', 'EXCLUDED'], false, false, 'EXCLUDED', false, false, '해외 출고지는 관부가세를 선택하세요.'])
  eq('같은 그림 재사용 = 그대로: 같은 주소가 여러 번이면 상세 HTML에 순서대로 모두(합치지 않음)', (S.ssDetailHtml(['https://x/a.jpg', 'https://x/b.jpg', 'https://x/b.jpg', 'https://x/b.jpg'], '머그').match(/<img src="https:\/\/x\/(a|b)\.jpg"/g) || []).map(t => t.slice(-6, -1)), ['a.jpg', 'b.jpg', 'b.jpg', 'b.jpg'])
  eq('보내기 문구 합니다체: 본문 검사 문구에 대화체 없음', [{}, { productName: '' }, { salePrice: 0 }, { stock: -1 }, { leafCategoryId: '' }, { display: 'X' }, { delivery: { ...IN.delivery, company: 'X' } }, { delivery: { ...IN.delivery, feeType: 'PAID' } }, { origin: { code: '04' } }, { notice: {} }, { customsTaxType: 'X' }].map(o => S.buildSmartstoreProduct({ ...IN, ...o }).message).filter(m => m && /(어요|예요|해요|돼요|아요|워요|네요|줘요)[.!]|주세요/.test(m)), [])
  // 등록 템플릿(2026-10-01) — 마켓 공용 값(api/_listingTemplates.js) ↔ 스마트스토어 칸(api/_smartstoreFields.js). 없는 칸·다른 뜻은 넣지 않는다
  {
    const L = await import('../api/_listingTemplates.js')
    const P = L.normalizeProductData({ origin: { type: 'overseas', place: '베트남' }, maker: ' (주)이유씨 ', country: '베트남', brand: '이유홈', asContact: '02-000-0000', asGuide: 'A/S', returnGuide: '반품', kc: { living: { choice: 'none' } }, notice: { type: '의류', items: { 색상: '블랙' } } })
    eq('상품정보 템플릿 → 스마트스토어 칸: 제조자 → manufacturer · 전화 → asPhone · A/S 안내 · 해외 → 04 + 나라 이름 · 브랜드·제조국·반품 안내·KC·고시 유형은 칸이 없어 안 씀', SF.smartstoreFormFromProduct(P),
      { form: { manufacturer: '(주)이유씨', asPhone: '02-000-0000', asGuide: 'A/S', originCode: '04', originContent: '베트남' }, notes: [] })
    eq('원산지: 상세설명 참조 → 03 · 국내는 안 덮음([모름] 04에 국내 지역) · 해외인데 나라 없음은 안 덮음 · 빈 템플릿은 아무 칸도 안 덮음', [
      SF.smartstoreFormFromProduct({ origin: { type: 'refer' } }).form, SF.smartstoreFormFromProduct({ origin: { type: 'domestic', place: '서울' } }).form, SF.smartstoreFormFromProduct({ origin: { type: 'overseas', place: '' } }).form, SF.smartstoreFormFromProduct(L.blankProductData()).form,
    ], [{ originCode: '03', originContent: '' }, {}, {}, {}])
    const long = SF.smartstoreFormFromProduct({ asGuide: '가'.repeat(301) }), just = SF.smartstoreFormFromProduct({ asGuide: '가'.repeat(300) })
    eq('A/S 안내 300자 넘음 = 안 덮고 안내(자르지 않음) · 300자는 그대로', ['asGuide' in long.form, long.notes, just.form.asGuide.length], [false, [SF.AS_GUIDE_LONG_NOTE], 300])
    eq('배송 템플릿 → 스마트스토어 칸: 무료 FREE · 고정 PAID + baseFee · 반품(편도)·교환(왕복) · 제주·도서산간은 칸이 없어 안 씀 · 빈 금액은 안 덮음', [
      SF.smartstoreFormFromShipping({ feeType: 'free', fee: 3000, returnFee: 3000, exchangeFee: 6000, jejuFee: 3000 }), SF.smartstoreFormFromShipping({ feeType: 'fixed', fee: 2500 }), SF.smartstoreFormFromShipping({ feeType: 'fixed', fee: null, returnFee: null }), SF.smartstoreFormFromShipping({}),
    ], [{ form: { feeType: 'FREE', baseFee: null, freeOver: null, returnFee: 3000, exchangeFee: 6000 }, notes: [] }, { form: { feeType: 'PAID', baseFee: 2500, freeOver: null }, notes: [] }, { form: { feeType: 'PAID', baseFee: null, freeOver: null }, notes: [] }, { form: {}, notes: [] }])
    eq('조건부 무료 → CONDITIONAL_FREE + 기본 배송비 + 기준 금액 (네이버 문서 enum) · 금액이 비면 빈칸 그대로(임의 숫자 없음)', [
      SF.smartstoreFormFromShipping({ feeType: 'conditional', fee: 3000, freeOver: 30000, returnFee: 3000, exchangeFee: 6000 }), SF.smartstoreFormFromShipping({ feeType: 'conditional' }).form,
    ], [{ form: { feeType: 'CONDITIONAL_FREE', baseFee: 3000, freeOver: 30000, returnFee: 3000, exchangeFee: 6000 }, notes: [] }, { feeType: 'CONDITIONAL_FREE', baseFee: null, freeOver: null }])
    const sc = { feeType: 'CONDITIONAL_FREE', baseFee: 3000, freeOver: 50000, returnFee: 3000, exchangeFee: 6000 }
    eq('조건부 무료 칸 → 템플릿(conditional) → 칸: 같은 값', [SF.shippingTemplateFromSmartstoreForm(sc), SF.smartstoreFormFromShipping(L.normalizeShippingData(SF.shippingTemplateFromSmartstoreForm(sc))).form],
      [{ feeType: 'conditional', fee: 3000, freeOver: 50000, jejuFee: null, islandFee: null, returnFee: 3000, exchangeFee: 6000 }, sc])
    const sf = { feeType: 'PAID', baseFee: 3000, returnFee: 3000, exchangeFee: 6000, manufacturer: '이유씨', asPhone: '010-1', asGuide: '안내', originCode: '04', originContent: '중국' }
    eq('스마트스토어 칸 → 템플릿 → 칸: 같은 값 (마켓 공용 이름 fixed · overseas)', [SF.shippingTemplateFromSmartstoreForm(sf).feeType, SF.smartstoreFormFromShipping(L.normalizeShippingData(SF.shippingTemplateFromSmartstoreForm(sf))).form, SF.productTemplateFromSmartstoreForm(sf).origin, SF.smartstoreFormFromProduct(L.normalizeProductData(SF.productTemplateFromSmartstoreForm(sf))).form],
      ['fixed', { feeType: 'PAID', baseFee: 3000, freeOver: null, returnFee: 3000, exchangeFee: 6000 }, { type: 'overseas', place: '중국' }, { manufacturer: '이유씨', asPhone: '010-1', asGuide: '안내', originCode: '04', originContent: '중국' }])
    eq('칸 → 템플릿: 무료 free(금액 없음) · 상세설명 03 → refer · 저장 검사 통과', [SF.shippingTemplateFromSmartstoreForm({ feeType: 'FREE', baseFee: 100, returnFee: 0, exchangeFee: 0 }), SF.productTemplateFromSmartstoreForm({ originCode: '03' }).origin, L.validateListingTemplate('product', 'x', SF.productTemplateFromSmartstoreForm(sf)).ok, L.validateListingTemplate('shipping', 'x', SF.shippingTemplateFromSmartstoreForm(sf)).ok],
      [{ feeType: 'free', fee: null, freeOver: null, jejuFee: null, islandFee: null, returnFee: 0, exchangeFee: 0 }, { type: 'refer', place: '' }, true, true])
    const ssv = read('src/components/studio/StudioSendSmartstore.vue')
    const submitSrc = ssv.slice(ssv.indexOf('async function submit()'), ssv.indexOf('defineExpose'))
    eq('스마트스토어 섹션 배선: 공용 템플릿 목록은 11번가와 같은 sendCache 키 · 보내는 값(submit)은 칸(f)만 읽고 템플릿을 직접 보내지 않음 · 칸 처음 값 = 템플릿 처음 값', [
      /cached\('listingTemplates', listListingTemplates\)/.test(ssv), /\blt\./.test(submitSrc),
      /const shippingBase = \(\) => \(\{ feeType: 'FREE', baseFee: null, freeOver: null, returnFee: null, exchangeFee: null \}\)/.test(ssv), /const productBase = \(\) => \(\{ asPhone: '', asGuide: DETAIL_REF, originCode: '03', originContent: '', manufacturer: '' \}\)/.test(ssv),
      /company: SS_DELIVERY_COMPANIES\[0\]\.code, feeType: 'FREE', baseFee: null, returnFee: null, exchangeFee: null,\n  freeOver: null,/.test(ssv), /asPhone: '', asGuide: DETAIL_REF, originCode: '03', originContent: '',/.test(ssv), /itemName: '', modelName: '', manufacturer: '',/.test(ssv),
    ], [true, false, true, true, true, true, true])
    eq('기본 설정 화면 이름: 공용 = "공용 등록 템플릿"(11번가·스마트스토어) · 쿠팡 = "쿠팡 배송/반품 템플릿"(쿠팡 보내기 창 빠짐 목록 "배송/반품 템플릿"과 같은 말)', [read('src/components/studio/StudioListingTemplates.vue').includes('공용 등록 템플릿'), read('src/components/studio/StudioShippingTemplates.vue').includes('<h3 class="st-h-card">쿠팡 배송/반품 템플릿</h3>')], [true, true])
  }
  eq('등록 응답 번호: int64를 글자 그대로(정밀도 손실 없음) · 없으면 null · 업로드 응답 장 수가 다르면 null', [
    S.productNosOf('{"originProductNo":9007199254740993,"smartstoreChannelProductNo":12}'), S.productNosOf('{"x":1}'),
    S.uploadedImageUrls({ images: [{ url: 'a' }, { url: 'b' }] }, 2), S.uploadedImageUrls({ images: [{ url: 'a' }] }, 2), S.uploadedImageUrls({ images: [{ url: '' }] }, 1), S.uploadedImageUrls(null, 1),
  ], [{ originProductNo: '9007199254740993', channelProductNo: '12' }, { originProductNo: null, channelProductNo: null }, ['a', 'b'], null, null, null])
  eq('업로드 묶음: 한 요청 10장 이하 · 본문 상한(중계 5MB 안) 이하 · 순서 그대로', [
    S.planUploads(Array(23).fill(1000)).map(g => g.length), S.planUploads([2000000, 2000000, 2000000]).map(g => g.length), S.planUploads([4400000, 200000, 100]), S.UPLOAD_BODY_MAX < 5 * 1024 * 1024, S.UPLOAD_FILES_MAX,
  ], [[10, 10, 3], [2, 1], [[0], [1, 2]], true, 10])
  {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 1, 2]), jp = Buffer.from([0xFF, 0xD8, 0xFF, 9])
    const mp = S.buildImageMultipart([{ buf: jp, mime: 'image/jpeg' }, { buf: png, mime: 'image/png' }], 'BND')
    const txt = mp.body.toString('latin1')
    eq('multipart: 칸 이름 imageFiles 반복 · 장마다 실제 형식 Content-Type·확장자 · boundary 머리·끝', [mp.contentType, (txt.match(/name="imageFiles"/g) || []).length, /filename="01\.jpg"\r\nContent-Type: image\/jpeg/.test(txt), /filename="02\.png"\r\nContent-Type: image\/png/.test(txt), txt.endsWith('--BND--\r\n'), mp.body.includes(png) && mp.body.includes(jp)], ['multipart/form-data; boundary=BND', 2, true, true, true, true])
    eq('실제 형식은 바이트로 (JPG·PNG·GIF · 그 밖은 null)', [S.imageMime(jp), S.imageMime(png), S.imageMime(Buffer.from('GIF89a')), S.imageMime(Buffer.from('RIFFxxxxWEBP'))], ['image/jpeg', 'image/png', 'image/gif', null])
  }
  eq('오류 번역: 400 = 판매처 문구(invalidInputs의 message) · 401 = 다시 연결 · 403 = API 그룹 · IP · 중계 = 준비 문구 · 성공 null · 내부 용어 없음', (() => {
    const all = [[400, '{"code":"BAD_REQUEST","message":"상품 등록 실패","invalidInputs":[{"name":"originProduct.name","message":"상품명을 입력해주세요."}]}'], [401, '{"code":"GW.AUTHN"}'], [403, ''], [403, 'GW.IP_NOT_ALLOWED'], [0, ''], [401, 'relay secret mismatch'], [429, ''], [500, ''], [200, '']].map(([s, t]) => S.translateSmartstoreApi(s, t))
    return [all.map(x => x && x.code), all[0].message, all.filter(Boolean).some(x => /관리자|서버|암호화|중계|relay|토큰/i.test(x.message))]
  })(), [['market_rejected', 'token_invalid', 'scope_denied', 'ip_not_allowed', 'relay_unreachable', 'relay_denied', 'rate_limited', 'market_server', null], '판매처에서 요청을 거절했습니다: 상품명을 입력해주세요.', false])
  eq('오류 문구 합니다체: 운영 1차 응답 → "판매처에서 등록을 거절했습니다: …" · invalidInputs 없으면 message · 둘 다 없으면 HTTP 번호 · 대화체 없음', (() => {
    const op = '{"code":"BAD_REQUEST","invalidInputs":[{"name":"originProduct.detailAttribute.customsTaxType","type":"customsTaxType.required.overseas","message":"출고지가 해외 주소인 경우 해외 상품에 해당하므로 관부가세 입력이 필수입니다."}]}'
    const all = [[400, op, '등록'], [400, '{"message":"이미지 오류"}', '요청'], [400, '', '등록'], [401, '', '요청'], [403, '', '요청'], [429, '', '요청'], [500, '', '요청']].map(([s, t, w]) => S.translateSmartstoreApi(s, t, w).message)
    return [all[0], all[1], all[2], all.filter(m => /(어요|예요|해요|돼요|아요|워요|네요|줘요)[.!]/.test(m)).length]
  })(), ['판매처에서 등록을 거절했습니다: 출고지가 해외 주소인 경우 해외 상품에 해당하므로 관부가세 입력이 필수입니다.', '판매처에서 요청을 거절했습니다: 이미지 오류', '판매처에서 등록을 거절했습니다. (HTTP 400)', 0])

  // 3) handler — 가짜 Supabase + 가짜 중계(/smartstore)
  const SPID = '66666666-6666-4666-8666-666666666666', SEID = '77777777-7777-4777-8777-777777777777', SIMG = '88888888-8888-4888-8888-888888888888'
  const folder = `${UID}/${SPID}/exports/20261001-090000-ss01`
  db.studio_projects.push({ id: SPID, user_id: UID, title: '머그' })
  db.studio_exports.push({ id: SEID, user_id: UID, project_id: SPID, folder, title: '매일 쓰는 머그', format: 'jpg', mode: 'sections', files: [{ key: '01', name: 'a_01.jpg', path: `${folder}/01.jpg`, width: 780, height: 900 }, { key: '02', name: 'a_02.png', path: `${folder}/02.png`, width: 780, height: 400 }] })
  db.studio_images.push({ id: SIMG, user_id: UID, project_id: SPID, original_path: `${UID}/${SPID}/orig/m.png`, width: 800, height: 600, sort_order: 0, included: true, ingest_status: 'done' })
  files.set(`${UID}/${SPID}/orig/m.png`, await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 0, g: 120, b: 200 } } }).png().toBuffer())
  files.set(`${folder}/01.jpg`, await sharp({ create: { width: 780, height: 900, channels: 3, background: { r: 250, g: 250, b: 250 } } }).jpeg().toBuffer())
  files.set(`${folder}/02.png`, await sharp({ create: { width: 780, height: 400, channels: 3, background: { r: 10, g: 10, b: 10 } } }).png().toBuffer())
  const SS_SALT = '$2a$10$abcdefghijklmnopqrstuv'
  const UI = {
    exportId: SEID, productName: '매일 쓰는 머그', salePrice: 12900, stock: 30, leafCategoryId: '50000999', categoryName: '생활/건강>주방용품>잔/컵>머그컵', repImageId: SIMG, fit: 'contain',
    delivery: { company: 'CJGLS', feeType: 'FREE', baseFee: null, returnFee: 3000, exchangeFee: 6000, shippingAddressId: 102, returnAddressId: 103 },
    afterService: { phone: '010-1234-5678', guide: '상세페이지 참조' }, origin: { code: '03' }, notice: { itemName: '머그컵', modelName: 'MUG-01', manufacturer: '이유씨' },
  }
  eq('연결 전 → 409 not_connected (카테고리·주소록·보내기 모두) · 기록 안 만듦', [(await post('smartstore_categories')).body.code, (await post('smartstore_addresses')).body.code, (await post('smartstore_send', UI)).body.code, db.marketplace_sends.filter(s => s.market === 'smartstore').length], ['not_connected', 'not_connected', 'not_connected', 0])
  db.marketplace_accounts.push({ id: newId(), user_id: UID, market: 'smartstore', seller_login_id: '내 스토어 애플리케이션', vendor_id: null, access_key_enc: encryptSecret('ss-app-id-1', K), secret_key_enc: encryptSecret(SS_SALT, K), key_last4: 'id-1', expires_at: null, status: 'connected' })

  relay.calls = []
  const cats = await post('smartstore_categories')
  eq('카테고리: 토큰(중계 /smartstore + 공식 경로) → GET /v1/categories?last=true · 리프만', [cats.statusCode, cats.body.categories.map(c => c.id), relay.calls.map(c => `${c.method} ${c.path}${c.query}`)], [200, ['50000555', '50000999'], ['POST /smartstore/external/v1/oauth2/token', 'GET /smartstore/external/v1/categories?last=true']])
  eq('네이버 호출 헤더: Bearer 토큰 · 중계 비밀 · 시크릿·서명은 상품 API 요청에 없음', [relay.calls[1].headers.Authorization, relay.calls[1].headers['x-relay-secret'], JSON.stringify(relay.calls[1]).includes(SS_SALT)], ['Bearer ss-access-token', 'test-relay-secret', false])
  relay.calls = []
  const ad = await post('smartstore_addresses')
  eq('주소록: 페이지 끝까지(totalPage) · 기본 출고지 102(RELEASE)·반품지 103(REFUND_OR_EXCHANGE) · 보낸 적 없으면 last 비어 있음', [ad.statusCode, ad.body.addresses.map(a => a.id), ad.body.defaults, relay.calls.filter(c => c.path.endsWith('addressbooks-for-page')).map(c => c.query), ad.body.addresses.filter(a => a.overseas).map(a => a.id), ad.body.last], [200, [101, 102, 103, 104], { shipping: 102, return: 103 }, ['?page=1', '?page=2'], [104], { shipping: null, return: null }])

  // 입력이 틀리면 네이버를 부르지 않고 기록도 안 만든다
  relay.calls = []
  const nSend = db.marketplace_sends.length
  const iv = await post('smartstore_send', { ...UI, stock: '' })
  eq('재고 비움 → 400 · 네이버 호출 0 · 기록 안 만듦 (0으로 채우지 않음)', [iv.statusCode, iv.body.code, relay.calls.length, db.marketplace_sends.length], [400, 'invalid_input', 0, nSend])
  eq('전시 상태가 문서 밖 값(WAIT) → 400 · 대표 사진 남의 것 → 400', [(await post('smartstore_send', { ...UI, display: 'WAIT' })).statusCode, (await post('smartstore_send', { ...UI, repImageId: newId() })).body.code], [400, 'rep_image_invalid'])

  // SQL 실행 전(market 규칙에 smartstore 없음)이면 네이버에 올리기 전에 503
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, o = {}) => (new URL(url).pathname === '/rest/v1/marketplace_sends' && (o.method || 'GET') === 'POST' && JSON.parse(o.body).market === 'smartstore'
    ? json({ code: '23514', message: 'new row for relation "marketplace_sends" violates check constraint "marketplace_sends_market_check"' }, 400) : realFetch(url, o))
  relay.calls = []
  const gap = await post('smartstore_send', UI)
  globalThis.fetch = realFetch
  eq('SQL 실행 전 → 503 marketplace_sql_missing · 이미지 업로드·상품 등록 호출 없음', [gap.statusCode, gap.body.code, relay.calls.filter(c => /upload|v2\/products/.test(c.path)).length], [503, 'marketplace_sql_missing', 0])

  // 보내는 중 가드 (2026-10-01 중복 등록 방지): 같은 상품·같은 판매처의 'sending'이 2분 안에 있으면 409 · 네이버 호출·기록 없음
  const busyRow = { id: newId(), user_id: UID, export_id: UI.exportId, market: 'smartstore', status: 'sending', created_at: new Date().toISOString(), request_json: {} }
  db.marketplace_sends.push(busyRow)
  relay.calls = []
  const nBusy = db.marketplace_sends.length
  const busy = await post('smartstore_send', UI)
  eq('보내는 중 가드: 2분 안 sending → 409 send_in_progress · 안내 문구 · 네이버 호출 0 · 기록 안 만듦', [busy.statusCode, busy.body.code, busy.body.message, relay.calls.length, db.marketplace_sends.length], [409, 'send_in_progress', '이 상품을 이 판매처로 보내는 중입니다. 잠시 후 [보낸 상품]에서 결과를 확인하세요.', 0, nBusy])
  busyRow.created_at = new Date(Date.now() - 3 * 60 * 1000).toISOString() // 2분 지난 sending(끊긴 기록)은 막지 않음 → 아래 성공 보내기가 그대로 간다

  // 성공 — 저장된 계정값이 없는 첫 보내기 (앞 실패 시도들이 계정값을 저장했을 수 있어 비운다)
  for (const a of db.marketplace_accounts) if (a.user_id === UID && a.market === 'smartstore') a.market_account = null
  relay.calls = []
  ssRelay.uploads = 0
  const ok = await post('smartstore_send', UI)
  db.marketplace_sends.splice(db.marketplace_sends.indexOf(busyRow), 1)
  const rec = db.marketplace_sends.at(-1)
  const ups = relay.calls.filter(c => c.path.endsWith('/product-images/upload')), prod = relay.calls.find(c => c.path.endsWith('/external/v2/products'))
  eq('보내기 성공: 200 registered · 원상품번호(int64 글자 그대로)·채널상품번호 · 기본 전시중지', [ok.statusCode, ok.body.status, ok.body.originProductNo, ok.body.channelProductNo, ok.body.display], [200, 'registered', '9007199254740993', '12345678901', 'SUSPENSION'])
  eq('기록: market smartstore · registered · seller_product_id = 원상품번호 · result_json = 두 번호 + 전시상태', [rec.market, rec.status, rec.seller_product_id, rec.result_json], ['smartstore', 'registered', '9007199254740993', { originProductNo: '9007199254740993', channelProductNo: '12345678901', display: 'SUSPENSION' }])
  // 2026-10-02: 보낸 계정 기록 — 저장된 계정값이 없을 때만 계정 정보 조회 1번(조회만). 다시 보내기 = 수정 대상 확인에 계정값이 필요해 이미지 업로드 앞에서 읽는다
  eq('순서: 토큰 → (첫 보내기만) 계정 정보 조회 → 이미지 업로드 → 상품 등록', relay.calls.map(c => c.path.replace('/smartstore/external', '')), ['/v1/oauth2/token', '/v1/seller/account', '/v1/product-images/upload', '/v2/products'])
  {
    const raw = ups[0].raw.toString('latin1')
    eq('이미지 업로드: multipart · 대표(JPG) + 상세 2장(JPG·PNG 실제 형식) = 한 요청 3장 · 본문 상한 이하', [/^multipart\/form-data; boundary=/.test(ups[0].headers['Content-Type']), (raw.match(/name="imageFiles"/g) || []).length, [...raw.matchAll(/Content-Type: (image\/\w+)/g)].map(m => m[1]), ups[0].raw.length <= S.UPLOAD_BODY_MAX], [true, 3, ['image/jpeg', 'image/jpeg', 'image/png'], true])
    const repBuf = ups[0].raw.subarray(ups[0].raw.indexOf(Buffer.from('\r\n\r\n')) + 4)
    const meta = await sharp(repBuf.subarray(0, repBuf.indexOf(Buffer.from('\r\n--')))).metadata()
    eq('대표 이미지 = 서버가 원본으로 만든 정사각형 1000 JPG', [meta.format, meta.width, meta.height], ['jpeg', 1000, 1000])
  }
  eq('상품 등록 본문 = buildSmartstoreProduct(화면 값 + 네이버가 준 주소) 그대로 · 대표 = 첫 주소 · 상세 = 나머지 · JSON', [prod.headers['Content-Type'], prod.body, rec.request_json.body], ['application/json', S.buildSmartstoreProduct({ ...IN, productName: UI.productName, repUrl: 'https://shop-phinf.pstatic.net/test/1.jpg', detailUrls: ['https://shop-phinf.pstatic.net/test/2.jpg', 'https://shop-phinf.pstatic.net/test/3.jpg'] }).body, prod.body])
  eq('기록·응답에 키·시크릿·토큰 없음', /ss-app-id-1|abcdefghijklmnopqrstuv|ss-access-token|test-relay-secret/.test(JSON.stringify(rec) + JSON.stringify(ok.body)), false)
  const listed = (await post('sends_list')).body.sends.find(s => s.id === rec.id)
  eq('보낸 상품 목록: 스마트스토어 줄 · 상품명 · 카테고리 · 전시상태 · 채널상품번호 · request_json 원문 없음', [listed.market, listed.status, listed.productName, listed.categoryName, listed.ssDisplay, listed.channelProductNo, 'request_json' in listed, 'result_json' in listed], ['smartstore', 'registered', '매일 쓰는 머그', '생활/건강>주방용품>잔/컵>머그컵', 'SUSPENSION', '12345678901', false, false])

  // 옵션(조합형, 2026-10-01) — 화면이 options를 보내면 optionInfo + 상품 재고 = 옵션 재고 합계. 빈 재고는 0으로 채우지 않고 네이버를 부르기 전에 400
  {
    const OPT = { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'M'], addPrice: 0, stock: 5 }, { values: ['화이트', 'L'], addPrice: 1000, stock: 7 }] }
    relay.calls = []
    const n0 = db.marketplace_sends.length
    const empty = await post('smartstore_send', { ...UI, options: { ...OPT, rows: [{ ...OPT.rows[0], stock: '' }] } })
    const far = await post('smartstore_send', { ...UI, options: { ...OPT, rows: [{ ...OPT.rows[0], addPrice: 7000 }] } })
    eq('옵션 재고 비움·추가금액 범위 밖 → 400 + 고객 문구 · 네이버 호출 0 · 기록 안 만듦', [empty.statusCode, empty.body.code, empty.body.message, far.statusCode, far.body.message, relay.calls.length, db.marketplace_sends.length],
      [400, 'invalid_input', '판매할 옵션의 재고 수량을 0~99,999,999 사이 정수로 입력하세요.', 400, '옵션 추가금액은 판매가 12,900원 기준 -6,450원 ~ +6,450원 사이로 입력하세요.', 0, n0])
    const good = await post('smartstore_send', { ...UI, stock: 12, options: OPT })
    const sent = relay.calls.find(c => c.path.endsWith('/external/v2/products')).body.originProduct
    eq('옵션 보내기: 200 · 등록 본문 optionInfo(조합형 문서 칸만) · stockQuantity = 합계 12 · 기록 request_json에도 그대로', [good.statusCode, sent.stockQuantity, sent.detailAttribute.optionInfo, db.marketplace_sends.at(-1).request_json.body.originProduct.detailAttribute.optionInfo], [200, 12, {
      optionCombinationGroupNames: { optionGroupName1: '색상', optionGroupName2: '사이즈' },
      optionCombinations: [{ optionName1: '블랙', optionName2: 'M', stockQuantity: 5, price: 0, usable: true }, { optionName1: '화이트', optionName2: 'L', stockQuantity: 7, price: 1000, usable: true }],
      useStockManagement: true,
    }, sent.detailAttribute.optionInfo])
  }

  // 네이버 거절·업로드 실패 → failed + 네이버 문구
  ssRelay.mode = 'reject'
  const rj = await post('smartstore_send', UI)
  eq('등록 거절 → failed 기록 + 판매처 문구(invalidInputs) · "판매처에서 등록을 거절했습니다:"', [rj.statusCode, rj.body.code, rj.body.message, db.marketplace_sends.at(-1).status, db.marketplace_sends.at(-1).result_json.step], [502, 'market_rejected', '판매처에서 등록을 거절했습니다: 카테고리를 입력해주세요.', 'failed', 'product'])
  ssRelay.mode = 'upload-fail'
  relay.calls = []
  const uf = await post('smartstore_send', UI)
  eq('업로드 실패 → failed · 상품 등록은 부르지 않음 · "판매처에서 요청을 거절했습니다:"', [uf.body.code, uf.body.message, db.marketplace_sends.at(-1).status, db.marketplace_sends.at(-1).result_json.step, relay.calls.some(c => c.path.endsWith('/v2/products'))], ['market_rejected', '판매처에서 요청을 거절했습니다: 올바른 이미지 파일이 아닙니다.', 'failed', 'upload', false])
  ssRelay.mode = 'ok'

  // 관부가세 (운영 1차 재현) — 해외 출고지(104)
  {
    const OV = { ...UI, delivery: { ...UI.delivery, shippingAddressId: 104 } }
    const op = await post('smartstore_send', OV) // 예전 화면처럼 관부가세 없이 · 해외 표시 없이 → 네이버가 거절 (운영 1차와 같은 문구)
    eq('운영 1차 재현: 해외 출고지 + 관부가세 없음 → 판매처 거절 문구 그대로 · failed', [op.statusCode, op.body.message, db.marketplace_sends.at(-1).status], [502, '판매처에서 등록을 거절했습니다: 출고지가 해외 주소인 경우 해외 상품에 해당하므로 관부가세 입력이 필수입니다.', 'failed'])
    relay.calls = []
    const n0 = db.marketplace_sends.length
    const miss = await post('smartstore_send', { ...OV, delivery: { ...OV.delivery, shippingOverseas: true } })
    eq('화면이 해외라고 알리고 관부가세가 없음 → 400 · 네이버 호출·기록 없음', [miss.statusCode, miss.body.message, relay.calls.length, db.marketplace_sends.length], [400, '해외 출고지는 관부가세를 선택하세요.', 0, n0])
    relay.calls = []
    const okOv = await post('smartstore_send', { ...OV, delivery: { ...OV.delivery, shippingOverseas: true }, customsTaxType: 'EXCLUDED' })
    const pOv = relay.calls.find(c => c.path.endsWith('/external/v2/products'))
    eq('해외 출고지 + 관부가세 → 등록 · 본문 detailAttribute.customsTaxType = 고른 값 · 다른 칸은 국내와 같음', [okOv.statusCode, pOv.body.originProduct.detailAttribute.customsTaxType, (() => {
      const x = structuredClone(pOv.body); delete x.originProduct.detailAttribute.customsTaxType; x.originProduct.deliveryInfo.claimDeliveryInfo.shippingAddressId = 102
      const norm = o => JSON.stringify(o).replace(/test\/\d+\.jpg/g, 'test/N.jpg')
      return norm(x) === norm(prod.body)
    })()], [200, 'EXCLUDED', true])
    eq('국내 출고지 본문에는 customsTaxType 칸 없음 (운영 2차 성공 본문)', 'customsTaxType' in prod.body.originProduct.detailAttribute, false)
  }

  // 같은 그림 재사용 (운영: 내보낸 03·14·15가 같은 파일) — 장마다 그대로 올리고, 네이버가 같은 주소를 주면 상세에 같은 주소가 여러 번 (지금 동작 고정)
  {
    const SEID2 = '99999999-9999-4999-8999-999999999999', f2 = `${UID}/${SPID}/exports/20261001-100000-ss02`
    const blank = await sharp({ create: { width: 780, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } } }).jpeg().toBuffer()
    const keys = ['01', '02', '03', '04']
    db.studio_exports.push({ id: SEID2, user_id: UID, project_id: SPID, folder: f2, title: '같은 그림', format: 'jpg', mode: 'sections', files: keys.map(k => ({ key: k, name: `b_${k}.jpg`, path: `${f2}/${k}.jpg`, width: 780, height: 400 })) })
    files.set(`${f2}/01.jpg`, files.get(`${folder}/01.jpg`))
    for (const k of ['02', '03', '04']) files.set(`${f2}/${k}.jpg`, blank) // 같은 바이트 3장
    ssRelay.sameUrl = true
    relay.calls = []
    const sr = await post('smartstore_send', { ...UI, exportId: SEID2 })
    ssRelay.sameUrl = false
    const up = relay.calls.find(c => c.path.endsWith('/product-images/upload')), pr = relay.calls.find(c => c.path.endsWith('/external/v2/products'))
    const srcs = [...pr.body.originProduct.detailContent.matchAll(/<img src="([^"]+)"/g)].map(m => m[1])
    eq('같은 그림: 합치지 않고 장마다 업로드(대표 + 4장 = 5) · 상세 4장 순서 그대로 · 02·03·04 = 같은 주소 · 01과는 다름', [sr.statusCode, (up.raw.toString('latin1').match(/name="imageFiles"/g) || []).length, srcs.length, srcs[1] === srcs[2] && srcs[2] === srcs[3], srcs[0] !== srcs[1]], [200, 5, 4, true, true])
  }

  // 마지막에 보낸 출고지·반품지 기억 (2026-10-01) — 새 DB 칸 없이 등록 성공한 보내기의 본문에서 읽는다 · 출고지≠반품지 각각
  {
    const sent = await post('smartstore_send', { ...UI, delivery: { ...UI.delivery, shippingAddressId: 101, returnAddressId: 102 } })
    const ad2 = await post('smartstore_addresses')
    eq('마지막 등록 성공(출고지 101 사업장 · 반품지 102 출고지 유형) → 다음 주소록의 last·기본값이 그대로 (용도 규칙보다 먼저)', [sent.statusCode, ad2.body.last, ad2.body.defaults], [200, { shipping: 101, return: 102 }, { shipping: 101, return: 102 }])
    ssRelay.mode = 'reject'
    await post('smartstore_send', { ...UI, delivery: { ...UI.delivery, shippingAddressId: 103, returnAddressId: 103 } })
    ssRelay.mode = 'ok'
    const ad3 = await post('smartstore_addresses')
    eq('등록에 실패한 보내기는 기억하지 않음 (last 그대로 101·102)', [db.marketplace_sends.at(-1).status, ad3.body.last], ['failed', { shipping: 101, return: 102 }])
    const realFetch2 = globalThis.fetch
    globalThis.fetch = async (url, o = {}) => (new URL(url).pathname === '/rest/v1/marketplace_sends' && (o.method || 'GET') === 'GET' ? json({ message: 'boom' }, 500) : realFetch2(url, o))
    const ad4 = await post('smartstore_addresses')
    globalThis.fetch = realFetch2
    eq('기록 조회가 실패해도 주소록은 보임 · 기억 없이 기본 규칙(102·103)', [ad4.statusCode, ad4.body.addresses.length, ad4.body.last, ad4.body.defaults], [200, 4, { shipping: null, return: null }, { shipping: 102, return: 103 }])
    eq('화면: 주소록 응답 last로 기본값 · 공용 규칙 pickSmartstoreAddress 하나 · 보낸 뒤 같은 화면의 목록(sendCache)에도 기억', [
      /pickSmartstoreAddress\(addresses\.value, 'shipping', r\.last\?\.shipping \?\? null\)/.test(read('src/components/studio/StudioSendSmartstore.vue')),
      /pickSmartstoreAddress\(addresses\.value, 'return', r\.last\?\.return \?\? null\)/.test(read('src/components/studio/StudioSendSmartstore.vue')),
      /function pickDefaultAddress/.test(read('src/components/studio/StudioSendSmartstore.vue')),
      read('src/components/studio/StudioSendSmartstore.vue').includes('last: { shipping: v.shippingAddressId, return: v.returnAddressId }'),
    ], [true, true, false, true])
    const ssv = read('src/components/studio/StudioSendSmartstore.vue')
    eq('주소록 새로고침: 창의 목록(sendCache)을 버리고 다시 받음 · 고른 주소가 새 목록에 있으면 유지 · 주소록 관리 = 스마트스토어센터 새 탭 · 주소록은 읽기만(GET) · 배송 NORMAL 그대로', [
      /delete sendCache\.smartstoreAddresses; delete sendCache\.smartstoreAddressesDone/.test(ssv), /if \(!kept\(f\.value\.shippingAddressId\)\)/.test(ssv), SF.SMARTSTORE_CENTER_URL,
      /:href="SMARTSTORE_CENTER_URL" target="_blank" rel="noopener noreferrer"/.test(ssv),
      [...read('api/marketplace.js').matchAll(/smartstoreApi\(cred, \{ method: '(\w+)', path: SS_PATHS\.addressBooks/g)].map(m => m[1]), /deliveryAttributeType: 'NORMAL'/.test(read('api/_smartstore.js')),
    ], [true, true, 'https://sell.smartstore.naver.com/', true, ['GET'], true])
  }

  // 화면 배선
  const shell = read('src/components/studio/StudioSendModal.vue'), sec = read('src/components/studio/StudioSendSmartstore.vue'), lib = read('src/lib/studioMarketplace.js'), api = read('api/marketplace.js'), sv = read('src/views/studio/StudioChannelSendView.vue'), sl = read('src/components/studio/StudioSendList.vue')
  const tpl = t => t.slice(t.indexOf('<template>'), t.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  eq('보내기 창: 스마트스토어 섹션 = 같은 모양(missing·busy·done·submit) · 연결되면 체크 가능(soon 없음) · 버튼 "스마트스토어로 보내기"', [
    /smartstore: StudioSendSmartstore/.test(shell), /defineExpose\(\{ missing, busy, done, submit(, sendError)?(, applyPreset, pickedCategory)? \}\)/.test(sec), 'soon' in R.MARKETS.find(m => m.key === 'smartstore'),
    R.channelRows({ smartstore: { connected: true } }).find(r => r.key === 'smartstore').state, R.sendButtonLabel(['smartstore']),
  ], [true, true, false, 'connected', '스마트스토어로 보내기'])
  eq('섹션: 판매 상태 기본 전시중지(DISPLAY_STATUSES[0]) · 라디오 전시중지/전시중 · 판매상태는 판매중으로 등록 안내 · 요약 표에 판매상태·전시상태 · 공용 파일만 import(서버 모듈 안 씀)', [
    sec.includes('display: DISPLAY_STATUSES[0], // 기본 전시중지'), /data-mk-ss-display-off \/> 전시중지/.test(sec) && /data-mk-ss-display-on \/> 전시중/.test(sec), sec.includes('네이버 등록 규칙상 판매상태는 판매중으로 등록됩니다. 전시중지 상품은 스토어에 노출되지 않습니다.'),
    /label: '판매상태', value: '판매중'/.test(sec) && /label: '전시상태', value: DISPLAY_LABEL\[v\.display\]/.test(sec), /from '\.\.\/\.\.\/\.\.\/api\/_smartstoreFields\.js'/.test(sec), /api\/_smartstore\.js'/.test(sec),
  ], [true, true, true, true, true, false])
  eq('섹션 문구: 합니다체·명사형 (대화체 없음) · 결과 "등록되었습니다" · 빈 값 "미입력" · 카테고리·주소록은 sendCache로 한 번만', [
    /(어요|예요|해요|돼요|아요|워요|네요|줘요|까요|에요)[.!?]|주세요/.test(tpl(sec)), /'등록되었습니다\.' \}\} 원상품번호/.test(sec), /'미입력'/.test(sec),
    /const sendCache = inject\(SEND_CACHE_KEY, null\)/.test(sec) && /cached\('smartstoreCategories', listSmartstoreCategories\)/.test(sec) && /cached\('smartstoreAddresses', listSmartstoreAddresses\)/.test(sec),
  ], [false, true, true, true])
  eq('섹션(2026-10-01 운영 반영): 관부가세 칸은 해외 출고지(주소록 overseas)일 때만 · 기본값 없음 · 빠짐 목록 · 해외일 때만 보냄 · 실패 사유는 섹션 맨 위 + 스크롤', [
    /<label v-if="shippingOverseas"[^>]*data-mk-ss-customs-box/.test(sec), /const shippingOverseas = computed\(\(\) => addresses\.value\.find\(a => a\.id === f\.value\.shippingAddressId\)\?\.overseas === true\)/.test(sec),
    sec.includes("customsTaxType: '', // 해외 출고지일 때만 보이고 필수 — 기본값 없음"), sec.includes("if (shippingOverseas.value && !v.customsTaxType) out.push('관부가세')"),
    sec.includes('...(shippingOverseas.value ? { customsTaxType: v.customsTaxType } : {})'), sec.includes('shippingOverseas: shippingOverseas.value }'),
    tpl(sec).indexOf('data-mk-ss-error') > 0 && tpl(sec).indexOf('data-mk-ss-error') < tpl(sec).indexOf('data-mk-ss-name'), /errorEl\.value\?\.scrollIntoView\?\.\(/.test(sec), /role="alert"/.test(sec),
  ], [true, true, true, true, true, true, true, true, true])
  eq('배선: 라이브러리 action 3개 · 서버 action 3개(studioGuard 뒤) · 보내기 탭 결과 문구 · 보낸 상품 카드 전시상태', [
    ["call('smartstore_categories')", "call('smartstore_addresses')", "call('smartstore_send', payload)"].every(x => lib.includes(x)),
    ['smartstore_categories', 'smartstore_addresses', 'smartstore_send'].every(a => api.includes(`body.action === '${a}'`)), api.indexOf('const ctx = await studioGuard(req, res)') < api.indexOf("body.action === 'smartstore_send'"),
    sv.includes('스마트스토어에 등록되었습니다.'), /data-mk-send-ss-display/.test(sl),
  ], [true, true, true, true, true])
  const ssSend = /async function smartstoreSend[\s\S]*?\n\}/.exec(api)[0]
  eq('서버 순서: 입력 검사 → 대표 사진 → 토큰 → 기록(sending) → 업로드 → 등록 → registered · 우리 토큰 주소(?t=) 안 씀 · SQL 파일 이름', [
    ssSend.indexOf('buildSmartstoreProduct({ ...input, repUrl') < ssSend.indexOf('squareFromImage'), ssSend.indexOf('squareFromImage') < ssSend.indexOf('smartstoreCredentials'), ssSend.indexOf('smartstoreCredentials') < ssSend.indexOf("market: SMARTSTORE, status: 'sending'"),
    ssSend.indexOf("status: 'sending'") < ssSend.indexOf('uploadSmartstoreImages('), ssSend.indexOf('uploadSmartstoreImages(') < ssSend.indexOf('SS_PATHS.products'), /makeImageToken|urlOf\(/.test(ssSend), /2026-10-01-marketplace-sends-smartstore\.sql/.test(ssSend),
  ], [true, true, true, true, true, false, true])
  const sql = read('docs/sql/2026-10-01-marketplace-sends-smartstore.sql')
  eq('SQL: market에 coupang·cafe24 유지 + smartstore · 되돌리기 있음 · 새 표·GRANT 없음 · 미실행 표시', [/check \(market in \('coupang', 'cafe24', 'smartstore'\)\)/.test(sql), /-- alter table public\.marketplace_sends add constraint marketplace_sends_market_check check \(market in \('coupang', 'cafe24'\)\);/.test(sql), /create table|grant /i.test(sql.replace(/GRANT 변경 없음/g, '')), /상태: 미실행/.test(sql)], [true, true, false, true])
  // 쿠팡·카페24 보내기는 그대로 — 이 작업이 그 파일들을 바꾸지 않았다 (본문 값은 위 7·19번 묶음이 고정)
  eq('범위: 쿠팡·카페24 보내기 코드에 스마트스토어가 섞이지 않음', [/smartstore/i.test(read('api/_coupang.js') + read('api/_coupangFields.js') + read('api/_cafe24.js') + read('src/components/studio/StudioSendCoupang.vue') + read('src/components/studio/StudioSendCafe24.vue')), /async function send\(ctx[\s\S]*?\n\}/.exec(api)[0].includes('smartstore'), /async function cafe24Send[\s\S]*?\n\}/.exec(api)[0].includes('smartstore')], [false, false, false])
}

// ── 카페24 고객에게 숨김 (2026-10-01 카페24 앱 심사 반려) — 서버도 막는다 · 관리자·스태프는 그대로 ──
{
  // 같은 사용자에게 카페24 계정·보낸 기록이 있다고 둔다 (이미 연결·전송한 고객의 화면이 깨지지 않는지)
  if (!db.marketplace_accounts.some(a => a.user_id === UID && a.market === 'cafe24')) db.marketplace_accounts.push({ id: newId(), user_id: UID, market: 'cafe24', seller_login_id: 'myshop', status: 'connected', expires_at: new Date(Date.now() + 10 * 86400000).toISOString() })
  db.marketplace_sends.push({ id: newId(), created_at: new Date().toISOString(), user_id: UID, export_id: EID, market: 'cafe24', status: 'registered', seller_product_id: '28', request_json: {}, result_json: { productNo: 28 } })
  const adminSends = (await post('sends_list')).body.sends
  const adminStatus = (await post('market_status')).body
  globalThis.__asCustomer = true
  process.env.STUDIO_ENABLED = 'all'
  try {
    const actions = ['cafe24_begin', 'cafe24_launch', 'cafe24_finish', 'disconnect_cafe24', 'cafe24_categories', 'cafe24_send']
    const nAcc = db.marketplace_accounts.length, nSend = db.marketplace_sends.length
    const got = []
    for (const a of actions) { const r = await post(a, { mall_id: 'myshop', exportId: EID }); got.push([r.statusCode, r.body?.code]) }
    eq('고객: 카페24 action 6개 모두 403 market_unavailable · 계정·기록을 바꾸지 않음 · 카페24 계정 그대로(지우지 않음)', [got, db.marketplace_accounts.length, db.marketplace_sends.length, db.marketplace_accounts.some(a => a.user_id === UID && a.market === 'cafe24')], [actions.map(() => [403, 'market_unavailable']), nAcc, nSend, true])
    const st = (await post('market_status')).body
    eq('고객: market_status의 카페24 = 연결 안 됨(계정이 있어도) · 11번가·스마트스토어 값은 그대로 나옴', [st.cafe24, 'elevenst' in st && 'smartstore' in st], [{ connected: false, account: null }, true])
    const cs = (await post('sends_list'))
    eq('고객: 보낸 상품 목록에 카페24 기록 없음 · 쿠팡·스마트스토어 기록은 그대로 · 오류 없음', [cs.statusCode, cs.body.sends.some(s => s.market === 'cafe24'), cs.body.sends.length === adminSends.filter(s => s.market !== 'cafe24').length], [200, false, true])
    eq('고객: 다른 판매처 요청은 막지 않음 (status·smartstore_addresses 정상)', [(await post('status')).statusCode, (await post('smartstore_addresses')).statusCode], [200, 200])
  } finally {
    globalThis.__asCustomer = false
    process.env.STUDIO_ENABLED = 'admin'
  }
  eq('관리자·스태프: 카페24 기록·연결 상태 그대로 보임 (테스트몰 유지)', [adminSends.some(s => s.market === 'cafe24'), adminStatus.cafe24.connected], [true, true])
  eq('관리자: 카페24 action은 거절하지 않음 (403 market_unavailable 아님)', (await post('cafe24_categories')).body?.code !== 'market_unavailable', true)
}

// ── 21. 11번가 상품 보내기 (2026-10-01) — 가짜 중계·가짜 카테고리 응답으로 보내는 XML을 고정한다 (실제 11번가 호출 없음) ──
// 가짜 11번가(중계 /11st 뒤). st11.mode로 실패를 흉내 낸다. 응답은 실제처럼 EUC-KR 바이트
var st11 = { mode: 'ok', categoryCalls: 0 }
var E11 = null
function eucXml(xml, status = 200) { return new Response(E11.encodeEucKr(xml).buf, { status, headers: { 'Content-Type': 'application/xml;charset=euc-kr' } }) }
// 2026-10-01 실제 카테고리 응답 모양 그대로 (ns2:categorys > ns2:category: depth·dispNm·dispNo·leafYn·parentDispNo) — 값은 줄임
var ST11_CATEGORY_XML = '<?xml version="1.0" encoding="euc-kr" standalone="yes"?><ns2:categorys xmlns:ns2="http://skt.tmall.business.openapi.spring.service.client.domain/">'
  + '<ns2:category><depth>1</depth><dispNm>주방용품</dispNm><dispNo>100</dispNo><leafYn>N</leafYn><parentDispNo>0</parentDispNo></ns2:category>'
  + '<ns2:category><depth>2</depth><dispNm>컵</dispNm><dispNo>110</dispNo><leafYn>N</leafYn><parentDispNo>100</parentDispNo></ns2:category>'
  + '<ns2:category><depth>3</depth><dispNm>머그컵</dispNm><dispNo>1017898</dispNo><leafYn>Y</leafYn><parentDispNo>110</parentDispNo></ns2:category>'
  + '<ns2:category><depth>1</depth><dispNm>가구</dispNm><dispNo>200</dispNo><leafYn>Y</leafYn><parentDispNo>0</parentDispNo></ns2:category></ns2:categorys>'
// 출고지·반품지 응답 — 문서(1014·1015) 모양: ns2:inOutAddresss > ns2:inOutAddress + ns2:result_message
const st11Addr = (rows, msg = 'SUCCESS') => `<?xml version="1.0" encoding="euc-kr" standalone="yes"?><ns2:inOutAddresss xmlns:ns2="http://skt.tmall.business.openapi.spring.service.client.domain/">${rows.map(r => `<ns2:inOutAddress><addr>${r.addr}</addr><addrNm>${r.nm}</addrNm><addrSeq>${r.seq}</addrSeq><gnrlTlphnNo>02-000-0000</gnrlTlphnNo><memNo>777</memNo><prtblTlphnNo>010-0000-0000</prtblTlphnNo><rcvrNm>담당</rcvrNm></ns2:inOutAddress>`).join('')}<ns2:result_message>${msg}</ns2:result_message></ns2:inOutAddresss>`
function elevenstRelay(u, method, opts) {
  const p = u.pathname.replace(/^\/11st/, '')
  if (opts.headers.openapikey !== '11st-key-ABCD1234') return eucXml('<?xml version="1.0" encoding="euc-kr"?><AuthMessage><resultCode>100</resultCode><message>인증 실패</message></AuthMessage>')
  if (st11.mode === 'unapproved') return eucXml('<?xml version="1.0" encoding="euc-kr"?><AuthMessage><resultCode>300</resultCode><message>미승인</message></AuthMessage>')
  if (p === '/rest/areaservice/outboundarea' && method === 'GET') return eucXml(st11Addr([{ seq: '11', nm: '3PL 창고', addr: '경기 용인 창고' }, { seq: '12', nm: '사무실 출고', addr: '광주 북구' }]))
  if (p === '/rest/areaservice/inboundarea' && method === 'GET') return eucXml(st11.mode === 'addr-fail' ? st11Addr([], 'FAIL') : st11Addr([{ seq: '21', nm: '반품센터', addr: '광주 북구 2층' }, { seq: '22', nm: '창고 반품', addr: '경기 용인 창고' }]))
  if (p === '/rest/prodservices/product' && method === 'POST') {
    if (st11.mode === 'reject') return eucXml('<?xml version="1.0" encoding="euc-kr"?><ClientMessage><resultCode>500</resultCode><message>카테고리 번호가 올바르지 않습니다.</message></ClientMessage>')
    if (st11.mode === 'limit') return eucXml('<?xml version="1.0" encoding="euc-kr"?><ClientMessage><resultCode>400</resultCode><message>일일 등록 한도 초과</message></ClientMessage>')
    return eucXml('<?xml version="1.0" encoding="euc-kr"?><ClientMessage><resultCode>200</resultCode><productNo>3456789012</productNo><message>상품 등록 완료</message></ClientMessage>')
  }
  if (/^\/rest\/prodstatservice\/stat\/stopdisplay\/\d+$/.test(p) && method === 'PUT') return eucXml('<?xml version="1.0" encoding="euc-kr"?><ClientMessage><resultCode>200</resultCode><message>판매중지</message></ClientMessage>')
  // 2026-10-02 판매자 상품코드 조회 (st11.byCode[코드] = [{ prdNo, cd, nm }]) · 상품수정 PUT (st11.puts에 본문 — mode 'put-reject'면 거절)
  if (/^\/rest\/prodmarketservice\/sellerprodcode\/[0-9a-f]{32}$/.test(p) && method === 'GET') {
    const list = (st11.byCode || {})[p.split('/').pop()] || []
    return eucXml(`<?xml version="1.0" encoding="euc-kr" standalone="yes"?><ns2:products xmlns:ns2="http://skt.tmall.business.openapi.spring.service.client.domain/">${list.map(x => `<ns2:product><prdNo>${x.prdNo}</prdNo><prdNm>상품</prdNm><selStatCd>${x.cd}</selStatCd><selStatNm>${x.nm}</selStatNm></ns2:product>`).join('')}</ns2:products>`)
  }
  if (/^\/rest\/prodservices\/product\/\d+$/.test(p) && method === 'PUT') {
    ;(st11.puts ||= []).push({ prdNo: p.split('/').pop(), raw: Buffer.from(opts.body) })
    if (st11.mode === 'put-reject') return eucXml('<?xml version="1.0" encoding="euc-kr"?><ClientMessage><resultCode>500</resultCode><message>판매가는 최대 50%까지 인상할 수 있습니다.</message></ClientMessage>')
    return eucXml(`<?xml version="1.0" encoding="euc-kr"?><ClientMessage><resultCode>200</resultCode><productNo>${p.split('/').pop()}</productNo><message>상품 수정 완료</message></ClientMessage>`)
  }
  return eucXml('<?xml version="1.0" encoding="euc-kr"?><ClientMessage><resultCode>500</resultCode><message>no route</message></ClientMessage>', 404)
}
{
  E11 = await import('../api/_elevenst.js')
  const F = await import('../api/_elevenstFields.js')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const talk = /(어요|예요|해요|돼요|아요|워요|네요|줘요|까요|에요)[.!?]/ // '잠시 후 다시 시도해 주세요.'는 우리 쪽 문제 표준 문구(CLAUDE.md)라 허용
  const dec = buf => new TextDecoder('euc-kr').decode(buf)

  // 1) 공용 값 — 공식 표 그대로
  eq('고시 유형 11개 · 코드 = 셀러오피스 표 · 기본 891045 기타 재화', [F.NOTICE_TYPES.map(t => t.code), F.DEFAULT_NOTICE_TYPE, F.noticeTypeOf('891045').name], [['891045', '891011', '891012', '891013', '891014', '891015', '891016', '891027', '891033', '891035', '1149547'], '891045', '기타 재화'])
  eq('기타 재화 항목 코드 5개 (표 그대로) · 의류 891011 항목 9개 (표 그대로)', [F.noticeTypeOf('891045').items.map(i => i[0]), F.noticeTypeOf('891011').items.map(i => i[0])], [['11800', '11905', '23760413', '23759100', '23756033'], ['11835', '23756520', '23759095', '23760437', '23759468', '23760034', '23760386', '11905', '23759308']])
  eq('고시 값: 제조자·제조국·전화번호만 판매자 값, 나머지 "상세페이지 참조" · 제조국 기본 = 원산지 표 이름 · 무거운 유형 = 어린이제품·생활화학제품', [
    F.noticeItemsFor('891045', { maker: '이유씨', country: '중국', phone: '010-1' }).map(i => [i.code, i.name]), F.NOTICE_COUNTRY_DEFAULT === F.ORIGIN_CHINA.name, F.HEAVY_NOTICE_TYPES, F.noticeItemsFor('999', {}),
  ], [[['11800', '상세페이지 참조'], ['11905', '이유씨'], ['23760413', '010-1'], ['23759100', '중국'], ['23756033', '상세페이지 참조']], true, ['891033', '1149547'], null])
  eq('KC: 그룹 4개(01~04 — 문서 값) · 그룹별 허용 대상여부 = 01:01·02·03 / 02:01·03 / 03:01·03 / 04:04·05 · 인증유형 코드 = 문서 그대로', [F.KC_GROUPS.map(g => g.code), Object.fromEntries(Object.entries(F.KC_CHOICES).map(([g, cs]) => [g, cs.map(c => c.obj).sort()])), Object.fromEntries(Object.entries(F.KC_CERT_TYPES).map(([g, ts]) => [g, ts.map(t => t[0])]))],
    [['01', '02', '03', '04'], { '01': ['01', '02', '02', '03'], '02': ['01', '03'], '03': ['01', '03'], '04': ['04', '05'] }, { '01': ['101', '103', '124', '123', '102', '104', '127', '132'], '02': ['128', '129', '130', '134'], '03': ['105', '135'], '04': ['133', '136'] }])
  {
    const ALL = { '01': 'agent', '02': 'none', '03': 'none', '04': 'none' }
    const r = F.kcFor(ALL)
    const c = F.kcFor({ ...ALL, '01': 'cert', '04': 'cert' }, { '01': { type: '102', key: ' HU07123-12001 ' }, '04': { type: '133', key: 'CB12-34' } })
    eq('KC: 기본값 없음 — 하나라도 안 고르면 합니다체로 막음 · 4개 그룹 모두 보냄 · 면제 = 02 + 면제유형 · 04 대상 아님 = 05', [F.kcFor({}).message, F.kcFor({ '01': 'agent', '02': 'none', '03': 'none' }).message, r.groups, r.certs],
      ['KC 인증 "전기용품·생활용품 KC인증" 항목을 선택하세요.', 'KC 인증 "생활화학 및 살생물제품" 항목을 선택하세요.', [{ crtfGrpTypCd: '01', crtfGrpObjClfCd: '02', crtfGrpExptTypCd: '02' }, { crtfGrpTypCd: '02', crtfGrpObjClfCd: '03' }, { crtfGrpTypCd: '03', crtfGrpObjClfCd: '03' }, { crtfGrpTypCd: '04', crtfGrpObjClfCd: '05' }], []])
    eq('KC 인증대상: 대상여부 01(04그룹은 04) + ProductCert(인증유형·인증번호) · 인증유형이 그 그룹 것이 아니면 막음 · 번호 없으면 막음', [c.groups.map(g => g.crtfGrpObjClfCd), c.certs, F.kcFor({ ...ALL, '02': 'cert' }, { '02': { type: '102', key: 'x' } }).message, F.kcFor({ ...ALL, '03': 'cert' }, { '03': { type: '105', key: ' ' } }).message],
      [['01', '03', '03', '04'], [{ certTypeCd: '102', certKey: 'HU07123-12001' }, { certTypeCd: '133', certKey: 'CB12-34' }], 'KC 인증 "어린이제품 KC인증"의 인증유형을 선택하세요.', 'KC 인증 "방송통신기자재 KC인증"의 인증번호를 입력하세요.'])
    eq('원산지: 기본 해외·중국 · 국내+지역 · 해외+국가 · 상세설명 참조(03 + 원산지명) · 목록 밖 코드는 null', [F.originFor({ kind: F.ORIGIN_CHINA.orgnTypCd, code: F.ORIGIN_CHINA.orgnTypDtlsCd }), F.originFor({ kind: '01', code: '1009' }), F.originFor({ kind: '03' }), F.originFor({ kind: '02', code: '9999' }), F.originFor({ kind: '01', code: '1287' })],
      [{ orgnTypCd: '02', orgnTypDtlsCd: '1287', label: '해외 · 중국' }, { orgnTypCd: '01', orgnTypDtlsCd: '1009', label: '국내 · 서울' }, { orgnTypCd: '03', orgnNmVal: '상세설명 참조', label: '상세설명 참조' }, null, null])
    eq('공개 스위치: ELEVENST_SEND_PUBLIC true — 고객도 연결돼 있으면 보내기 · 관리자·스태프도 보내기', [F.ELEVENST_SEND_PUBLIC, R.channelRows({ '11st': { connected: true } }).find(x => x.key === '11st').state, R.channelRows({ '11st': { connected: true } }, { admin: true }).find(x => x.key === '11st').state, R.sendableFor(R.MARKETS.find(m => m.key === 'coupang'))], [true, 'connected', 'connected', true])
  }
  eq('주소 기본: 마지막에 쓴 주소가 목록에 있으면 그것 · 없으면 목록 첫째 · 빈 목록 null', [F.pickElevenstAddress([{ id: '11' }, { id: '12' }], '12'), F.pickElevenstAddress([{ id: '11' }, { id: '12' }], '99'), F.pickElevenstAddress([{ id: '11' }, { id: '12' }]), F.pickElevenstAddress([])], ['12', '11', '11', null])

  // 2) 응답 읽기
  eq('카테고리: 최하위만 · 전체 이름(상위>하위) · 이름 순', E11.normalizeElevenstCategories(ST11_CATEGORY_XML), [{ id: '200', name: '가구', wholeName: '가구' }, { id: '1017898', name: '머그컵', wholeName: '주방용품>컵>머그컵' }])
  eq('주소록: inOutAddress → 번호·이름·주소·전화 · result_message가 SUCCESS가 아니면 null(실패)', [E11.normalizeElevenstAddresses(st11Addr([{ seq: '11', nm: '창고', addr: '용인' }])), E11.normalizeElevenstAddresses(st11Addr([], 'FAIL'))], [[{ id: '11', name: '창고', address: '용인', phone: '02-000-0000', receiver: '담당' }], null])
  eq('등록 응답: 200·210 + productNo = 성공 · 500 = 실패 · 번호 없으면 실패', [
    E11.parseClientMessage('<ClientMessage><resultCode>210</resultCode><productNo>12</productNo><message>m</message></ClientMessage>').ok,
    E11.parseClientMessage('<ClientMessage><resultCode>500</resultCode><message>사유</message></ClientMessage>'), E11.parseClientMessage('<ClientMessage><resultCode>200</resultCode></ClientMessage>').ok,
  ], [true, { ok: false, code: '500', productNo: null, message: '사유' }, false])
  {
    const T = (s, t, w) => E11.translateElevenstApi(s, t, w)
    const all = [T(200, '<AuthMessage><resultCode>300</resultCode></AuthMessage>'), T(200, '<AuthMessage><resultCode>100</resultCode></AuthMessage>'), T(200, '<ClientMessage><resultCode>400</resultCode></ClientMessage>', '등록'), T(200, '<ClientMessage><resultCode>500</resultCode><message>카테고리 오류</message></ClientMessage>', '등록'), T(503, ''), T(0, ''), T(200, '<ClientMessage><resultCode>200</resultCode></ClientMessage>')]
    eq('오류 번역(합니다체): 300 = Seller API 미승인 · 100 = 인증 실패 · 400 = 하루 500개 한도 · 500 = 판매처 문구 · 대화체 없음 (중계 준비 문구는 모든 판매처 공용이라 제외)', [all.map(x => x && x.code), all[3].message, all.filter(Boolean).filter(x => !/^relay_/.test(x.code) && talk.test(x.message)).length], [['not_approved', 'bad_key', 'daily_limit', 'market_rejected', 'market_server', 'relay_unreachable', null], '판매처에서 등록을 거절했습니다: 카테고리 오류', 0])
    // 2026-10-01 실전 거절 원문 — 정산계좌 인증 (화면 문구만 바꾸고 원문은 result_json에)
    const raw = '<ClientMessage><resultCode>500</resultCode><message>상품등록실패 : 추가정보가 인증되지 않아 정산대금 수령방법 및 입금계좌를 확인할 수 없습니다. 셀러오피스 상품등록 페이지에서 정산대금 수령방법 및 입금계좌를 인증해주세요.</message></ClientMessage>'
    const st = T(200, raw, '등록'), st2 = T(200, '<ClientMessage><resultCode>500</resultCode><message>입금계좌 확인 불가</message></ClientMessage>', '등록')
    const mj = read('api/marketplace.js')
    eq('정산계좌 오류: "정산대금"·"입금계좌"가 있으면 고객 문구 바꿈(code settlement_unverified) · 다른 500은 그대로 · 등록 응답 경로도 같은 규칙 + 원문은 result_json.message · 준비 사항 안내 한 줄', [st.code, st.message, st2.code, all[3].code, /const settle = SETTLEMENT_ERROR_RE\.test\(cm\.message\)/.test(mj), /result_json: \{ code: cm\.code, step: 'product', message: cm\.message \}/.test(mj), /result_json: \{ code: e\.code, status: e\.status, step: 'product', raw: e\.raw \}/.test(mj), /data-mk-11st-prep-settle>11번가 셀러오피스에서 정산대금 수령방법·입금계좌 인증이 완료되어 있어야 합니다\.</.test(read('src/components/studio/StudioSendElevenst.vue'))],
      ['settlement_unverified', '11번가 정산계좌 인증이 필요합니다. 셀러오피스 상품등록 페이지에서 정산대금 수령방법과 입금계좌를 인증한 뒤 다시 보내십시오.', 'settlement_unverified', 'market_rejected', true, true, true, true])
  }

  // 3) 등록 본문 — 공식 필수 항목 · EUC-KR · 해외 항목 없음
  const IN = {
    productName: '매일 쓰는 머그', categoryId: '1017898', price: 12900, stock: 30, repUrl: 'https://www.euchs.co.kr/api/marketplace?t=rep', detailUrls: ['https://www.euchs.co.kr/api/marketplace?t=01', 'https://www.euchs.co.kr/api/marketplace?t=02'],
    vat: '01', origin: { kind: '02', code: '1287' }, kc: { '01': 'cert', '02': 'none', '03': 'none', '04': 'none' }, kcCerts: { '01': { type: '102', key: 'HU07123-12001' } },
    delivery: { feeType: '01', jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000, outAddr: '11', inAddr: '22' },
    asDetail: '상세페이지 참조', rtngExchDetail: '상세페이지 참조', notice: { type: '891045', maker: '이유씨', country: '중국', phone: '010-1234-5678' },
  }
  const b = E11.buildElevenstProduct(IN)
  const x = b.ok ? dec(b.buf) : ''
  const tags = [...x.matchAll(/<([A-Za-z0-9]+)>/g)].map(m => m[1]).filter((t, i, a) => a.indexOf(t) === i)
  eq('등록 본문: EUC-KR 바이트 · XML 선언 EUC-KR · 바이트를 되읽으면 같은 글자', [b.ok, x.startsWith('<?xml version="1.0" encoding="EUC-KR"?><Product>'), x === b.xml], [true, true, true])
  eq('등록 본문: 문서 필수 칸 모두 · 순서 고정', tags, ['Product', 'selMthdCd', 'dispCtgrNo', 'prdTypCd', 'prdNm', 'brand', 'rmaterialTypCd', 'orgnTypCd', 'orgnTypDtlsCd', 'suplDtyfrPrdClfCd', 'prdStatCd', 'minorSelCnYn', 'prdImage01', 'htmlDetail', 'ProductCertGroup', 'crtfGrpTypCd', 'crtfGrpObjClfCd', 'ProductCert', 'certTypeCd', 'certKey', 'selPrdClfCd', 'aplBgnDy', 'aplEndDy', 'selPrc', 'prdSelQty', 'dlvCnAreaCd', 'dlvWyCd', 'dlvCstInstBasiCd', 'bndlDlvCnYn', 'dlvCstPayTypCd', 'jejuDlvCst', 'islandDlvCst', 'addrSeqOut', 'addrSeqIn', 'rtngdDlvCst', 'exchDlvCst', 'asDetail', 'rtngExchDetail', 'dlvClf', 'ProductNotification', 'type', 'item', 'code', 'name'])
  eq('등록 본문 값: 고정가 01 · 일반배송 01 · 상품명 CDATA · 브랜드 없음 = 알수없음 · 원산지 해외 02 + 중국 1287 · 새상품 · 택배 · 전국 · 선결제 · 업체배송 02 · 출고지 11 · 반품지 22 · 고시 891045 + 5항목', [
    E11.xmlTag(x, 'selMthdCd'), E11.xmlTag(x, 'prdTypCd'), /<prdNm><!\[CDATA\[매일 쓰는 머그\]\]><\/prdNm>/.test(x), E11.xmlTag(x, 'brand'), E11.xmlTag(x, 'orgnTypCd'), E11.xmlTag(x, 'orgnTypDtlsCd'), E11.xmlTag(x, 'prdStatCd'),
    E11.xmlTag(x, 'dlvWyCd'), E11.xmlTag(x, 'dlvCnAreaCd'), E11.xmlTag(x, 'dlvCstPayTypCd'), E11.xmlTag(x, 'dlvClf'), E11.xmlTag(x, 'addrSeqOut'), E11.xmlTag(x, 'addrSeqIn'), E11.xmlTag(x, 'type'), (x.match(/<item>/g) || []).length,
  ], ['01', '01', true, '알수없음', '02', '1287', '01', '01', '01', '03', '02', '11', '22', '891045', 5])
  {
    // 2026-10-01 실전 거절 "판매시작일(aplBgnDy)이 누락되었습니다." — 문서 apiSeq 1003: 0:100 직접입력 · YYYY/MM/DD · 2999/12/31(최대 3년)
    const k = new Date(Date.now() + 9 * 3600 * 1000), today = `${k.getUTCFullYear()}/${String(k.getUTCMonth() + 1).padStart(2, '0')}/${String(k.getUTCDate()).padStart(2, '0')}`
    const late = dec(E11.buildElevenstProduct({ ...IN, now: new Date('2026-10-01T15:30:00Z') }).buf) // UTC 15:30 = KST 다음 날 00:30
    eq('판매기간: selPrdClfCd 0:100 · aplBgnDy = KST 오늘 YYYY/MM/DD · aplEndDy 2999/12/31 · selTermUseYn 없음 · UTC 저녁이면 KST 다음 날 · summary 같은 값',
      [E11.xmlTag(x, 'selPrdClfCd'), E11.xmlTag(x, 'aplBgnDy'), E11.xmlTag(x, 'aplEndDy'), /selTermUseYn/.test(x), E11.xmlTag(late, 'aplBgnDy'), F.kstDaySlash(new Date('2026-10-01T14:59:00Z')), b.summary.aplBgnDy, b.summary.aplEndDy],
      ['0:100', today, '2999/12/31', false, '2026/10/02', '2026/10/01', today, '2999/12/31'])
  }
  eq('KC: ProductCertGroup 4개(01 인증대상 01 · 02·03 대상 아님 03 · 04 대상 아님 05) · ProductCert 1개(102 + 인증번호 CDATA)', [E11.xmlBlocks(x, 'ProductCertGroup').map(g => `${E11.xmlTag(g, 'crtfGrpTypCd')}:${E11.xmlTag(g, 'crtfGrpObjClfCd')}`), E11.xmlBlocks(x, 'ProductCert').map(c => `${E11.xmlTag(c, 'certTypeCd')}:${E11.xmlTag(c, 'certKey')}`), /<certKey><!\[CDATA\[HU07123-12001\]\]><\/certKey>/.test(x)], [['01:01', '02:03', '03:03', '04:05'], ['102:HU07123-12001'], true])
  {
    const ko = dec(E11.buildElevenstProduct({ ...IN, origin: { kind: '01', code: '1009' } }).buf), rf = dec(E11.buildElevenstProduct({ ...IN, origin: { kind: '03' } }).buf)
    eq('원산지 바꾸기: 국내 서울 = 01 + 1009 · 상세설명 참조 = 03 + orgnNmVal(지역 코드 없음) · 잘못된 원산지 = 거절(합니다체)', [E11.xmlTag(ko, 'orgnTypCd'), E11.xmlTag(ko, 'orgnTypDtlsCd'), E11.xmlTag(rf, 'orgnTypCd'), E11.xmlTag(rf, 'orgnNmVal'), /orgnTypDtlsCd/.test(rf), E11.buildElevenstProduct({ ...IN, origin: { kind: '02', code: '0' } }).message], ['01', '1009', '03', '상세설명 참조', false, '원산지를 선택하세요.'])
  }
  eq('국내 셀러: 해외 항목 없음 · 발송마감 템플릿은 값이 있을 때만 · 무료배송이면 dlvCst1 없음', [/abrdBuyPlace|forAbrdBuyClf|outsideYnOut|outsideYnIn|importFeeCd|hsCode|globalOutAddrSeq/.test(x), /dlvSendCloseTmpltNo/.test(x), /dlvSendCloseTmpltNo>77</.test(dec(E11.buildElevenstProduct({ ...IN, delivery: { ...IN.delivery, sendCloseTmplt: '77' } }).buf)), /dlvCst1/.test(x)], [false, false, true, false])
  eq('상세설명: 이미지 주소를 위에서 아래로 · 상세 이미지 주소는 한 함수(elevenstDetailImageUrls)에서', [(E11.xmlTag(x, 'htmlDetail').match(/<img src="https:\/\/www\.euchs\.co\.kr\/api\/marketplace\?t=0\d"/g) || []).length, E11.elevenstDetailImageUrls({ files: [{ key: '01' }, { key: '02' }], urlOf: k => `u/${k}` })], [2, ['u/01', 'u/02']])
  {
    const bad = o => E11.buildElevenstProduct({ ...IN, ...o })
    const cases = [
      { productName: '' }, { productName: '가'.repeat(101) }, { categoryId: '' }, { price: 12905 }, { price: 0 }, { stock: 0 }, { stock: NaN }, { repUrl: '' }, { detailUrls: [] }, { vat: '' }, { kc: {} }, { origin: {} }, { kcCerts: {} },
      { delivery: { ...IN.delivery, feeType: '02' } }, { delivery: { ...IN.delivery, jejuFee: NaN } }, { delivery: { ...IN.delivery, returnFee: 3005 } }, { delivery: { ...IN.delivery, outAddr: '' } },
      { asDetail: ' ' }, { rtngExchDetail: '' }, { notice: { ...IN.notice, type: '999' } }, { notice: { ...IN.notice, maker: '' } }, { notice: { ...IN.notice, maker: '가'.repeat(51) } }, { productName: '머그 똠' },
    ].map(o => bad(o))
    eq('필수 항목 누락·잘못된 값 → 거절(임의 값으로 채우지 않음) · 문구는 합니다체 · 재고 0 거절 · 10원 단위 · 고시 50자 · EUC-KR 밖 글자 거절', [cases.every(r => r.ok === false), cases.filter(r => talk.test(r.message)).length, cases[5].message, cases[3].message, cases[22].message],
      [true, 0, '재고 수량은 1개 이상 입력하세요. (11번가는 재고 0으로 등록할 수 없습니다)', '판매가는 10원 단위로 입력하세요. (10억 원 미만)', '11번가에 보낼 수 없는 글자가 있습니다: 똠 — 상품명·안내 문구에서 빼고 다시 보내세요.'])
  }

  // 3-1) 조건부 무료(03) · 고시 나머지 항목 (2026-10-01 등록 템플릿)
  {
    const c = E11.buildElevenstProduct({ ...IN, delivery: { ...IN.delivery, feeType: '03', fee: 3000, freeOver: 30000 } })
    const cx = c.ok ? dec(c.buf) : ''
    const ctags = [...cx.matchAll(/<([A-Za-z0-9]+)>/g)].map(m => m[1])
    eq('조건부 무료: dlvCstInstBasiCd 03 · dlvCst1 3000 · PrdFrDlvBasiAmt 30000 (dlvCst1 바로 뒤) · 고정 배송비(02)는 PrdFrDlvBasiAmt 없음', [c.ok, E11.xmlTag(cx, 'dlvCstInstBasiCd'), E11.xmlTag(cx, 'dlvCst1'), E11.xmlTag(cx, 'PrdFrDlvBasiAmt'), ctags[ctags.indexOf('dlvCst1') + 1], /PrdFrDlvBasiAmt/.test(dec(E11.buildElevenstProduct({ ...IN, delivery: { ...IN.delivery, feeType: '02', fee: 3000, freeOver: 30000 } }).buf))], [true, '03', '3000', '30000', 'PrdFrDlvBasiAmt', false])
    // 2026-10-01 실전 거절 "상품 조건무 무료일 경우 묶음배송이 불가능합니다. <bndlDlvCnYn/> 를 N으로 설정해주세요."
    const fx = dec(E11.buildElevenstProduct({ ...IN, delivery: { ...IN.delivery, feeType: '02', fee: 3000 } }).buf)
    eq('묶음배송: 조건부 무료(03) = bndlDlvCnYn N · 무료(01)·고정(02) = Y · summary도 같은 값 · 등록 정보 확인 표 "묶음배송 불가(조건부 무료)"', [E11.xmlTag(cx, 'bndlDlvCnYn'), E11.xmlTag(x, 'bndlDlvCnYn'), E11.xmlTag(fx, 'bndlDlvCnYn'), c.summary.bndlDlvCnYn, b.summary.bndlDlvCnYn, F.bundleDeliveryYn('03'), F.BUNDLE_OFF_NOTE, /label: '묶음배송', value: bundleDeliveryYn\(v\.feeType\) === 'N' \? BUNDLE_OFF_NOTE/.test(read('src/components/studio/StudioSendElevenst.vue'))],
      ['N', 'Y', 'Y', 'N', 'Y', 'N', '묶음배송 불가(조건부 무료)', true])
    const bad = [{ feeType: '03', fee: 3000 }, { feeType: '03', fee: 3000, freeOver: 30005 }, { feeType: '03', freeOver: 30000 }, { feeType: '04', fee: 3000 }].map(d => E11.buildElevenstProduct({ ...IN, delivery: { ...IN.delivery, ...d } }))
    eq('조건부 무료 검사: 기준 금액 없음·10원 단위 아님 → 거절 · 기본 배송비 없음 → 거절 · 모르는 종류 → 거절 (합니다체)', [bad.map(r => r.ok), bad.map(r => r.message), bad.filter(r => talk.test(r.message)).length], [[false, false, false, false], ['무료배송 기준 금액을 10원 단위로 입력하세요.', '무료배송 기준 금액을 10원 단위로 입력하세요.', '기본 배송비를 10원 단위로 입력하세요.', '배송비 종류를 선택하세요.'], 0])
    const ni = E11.buildElevenstProduct({ ...IN, notice: { ...IN.notice, items: { 11800: '머그컵 MG-1', 99999: '다른 유형 항목' } } })
    eq('고시 나머지 항목: 판매자 값이 있으면 그 값 · 그 유형이 아닌 코드는 안 씀 · 50자 넘으면 거절', [E11.xmlBlocks(dec(ni.buf), 'item').map(b => `${E11.xmlTag(b, 'code')}:${E11.xmlTag(b, 'name')}`), E11.buildElevenstProduct({ ...IN, notice: { ...IN.notice, items: { 11800: '가'.repeat(51) } } }).ok],
      [['11800:머그컵 MG-1', '11905:이유씨', '23760413:010-1234-5678', '23759100:중국', '23756033:상세페이지 참조'], false])
  }

  // 3-2) 등록 템플릿 — 마켓 공용 값(api/_listingTemplates.js) ↔ 11번가 칸(api/_elevenstFields.js)
  {
    const L = await import('../api/_listingTemplates.js')
    const P = { origin: { type: 'overseas', place: '베트남' }, maker: ' (주)이유씨 ', country: '베트남', brand: '', asContact: '02-000-0000', asGuide: 'A/S', returnGuide: '반품',
      kc: { living: { choice: 'cert', certType: '[전기용품] 안전인증', certNo: 'HU-1' }, kids: { choice: 'none' }, radio: { choice: 'none' }, chemical: { choice: 'cert', certType: '[생활화학 및 살생물제품] 자가검사번호', certNo: 'CB-9' } },
      notice: { type: '의류', items: { 색상: '블랙', 치수: 'FREE', '제조자/수입자': '무시됨' } } }
    const form = F.elevenstFormFromProduct(L.normalizeProductData(P))
    eq('상품정보 템플릿 → 11번가 칸: 원산지 이름 → 코드(베트남 1265) · 전화 → phone · KC 뜻 키 → 그룹 코드 · 인증유형 이름 → 코드 · 고시 이름 → 891011 + 나머지 항목 코드 · 빈 브랜드는 안 덮음', [
      form.originKind, form.originCode, form.maker, form.phone, form.asDetail, form.rtngExchDetail, form.kc, form.kcCerts['01'], form.kcCerts['04'], form.noticeType, form.noticeItems, 'brand' in form,
    ], ['02', '1265', '(주)이유씨', '02-000-0000', 'A/S', '반품', { '01': 'cert', '02': 'none', '03': 'none', '04': 'cert' }, { type: '102', key: 'HU-1' }, { type: '133', key: 'CB-9' }, '891011', { 11835: '블랙', 23760034: 'FREE' }, false])
    eq('원산지: 11번가 목록에 없는 나라는 코드 빈칸(다른 나라로 바꾸지 않음) · 국내 서울 1009 · 상세설명 참조 03 · KC를 하나도 안 고른 템플릿은 KC를 안 덮음', [
      F.elevenstFormFromProduct({ origin: { type: 'overseas', place: '네팔' } }).originCode, F.elevenstFormFromProduct({ origin: { type: 'domestic', place: '서울' } }).originCode, F.elevenstFormFromProduct({ origin: { type: 'refer' } }).originKind, 'kc' in F.elevenstFormFromProduct(L.blankProductData()),
    ], ['', '1009', '03', false])
    eq('배송 템플릿 → 11번가 칸: 무료 01 · 고정 02 · 조건부 무료 03 + 기준 금액 · 빈 금액은 안 덮음', [
      F.elevenstFormFromShipping({ feeType: 'free', fee: 3000, returnFee: 3000 }), F.elevenstFormFromShipping({ feeType: 'fixed', fee: 3000 }), F.elevenstFormFromShipping({ feeType: 'conditional', fee: 3000, freeOver: 50000, jejuFee: 3000 }),
    ], [{ feeType: '01', fee: null, freeOver: null, returnFee: 3000 }, { feeType: '02', fee: 3000, freeOver: null }, { feeType: '03', fee: 3000, freeOver: 50000, jejuFee: 3000 }])
    // 칸 → 템플릿 → 칸 되돌리기가 같은 값
    const f0 = { ...form, brand: '이유홈', maker: '(주)이유씨', country: '베트남' }
    const back = F.elevenstFormFromProduct(L.normalizeProductData(F.productTemplateFromElevenstForm(f0)))
    eq('11번가 칸 → 상품정보 템플릿 → 칸: 같은 값 (원산지·KC·인증·고시 항목)', [back.originCode, back.kc, back.kcCerts['04'], back.noticeType, back.noticeItems, back.brand], [f0.originCode, f0.kc, f0.kcCerts['04'], f0.noticeType, f0.noticeItems, '이유홈'])
    const sf = { feeType: '03', fee: 3000, freeOver: 30000, jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000 }
    eq('11번가 칸 → 배송 템플릿 (마켓 공용 이름 conditional) → 칸: 같은 값', [F.shippingTemplateFromElevenstForm(sf).feeType, F.elevenstFormFromShipping(F.shippingTemplateFromElevenstForm(sf))], ['conditional', sf])
    eq('기본 템플릿 고르기: 종류마다 is_default · 없으면 null', [L.pickDefaultTemplate([{ id: 'a', kind: 'product' }, { id: 'b', kind: 'product', is_default: true }, { id: 'c', kind: 'shipping', is_default: true }], 'product').id, L.pickDefaultTemplate([{ id: 'a', kind: 'product' }], 'product'), L.pickDefaultTemplate(null, 'shipping')], ['b', null, null])
    eq('저장 검사: 이름 필수·50자 · 금액 10원 단위 · 빈 금액은 허용 · 문구 합니다체 · 이름 겹치면 (2)', [
      L.validateListingTemplate('product', ' ', {}).message, L.validateListingTemplate('shipping', '배송', { feeType: 'conditional', fee: 3000, freeOver: 30005 }).message, L.validateListingTemplate('shipping', '배송', { feeType: 'fixed' }).ok, L.validateListingTemplate('etc', 'x', {}).ok,
      L.uniqueTemplateName('기본', [{ kind: 'product', name: '기본' }, { kind: 'product', name: '기본 (2)' }], 'product'), L.uniqueTemplateName('기본', [{ kind: 'shipping', name: '기본' }], 'product'),
    ], ['템플릿 이름을 입력하세요.', '무료 기준 금액: 10원 단위로 입력하세요.', true, false, '기본 (3)', '기본'])
    const sp = L.sampleTemplate('product')
    eq('예시 템플릿 "중국산 생활잡화": 해외·중국 · 제조국 중국 · 고시 기타 재화 · KC 비움(판매자 판단) · 금액 비움 → 11번가 칸 변환 가능', [sp.name, sp.data.origin, sp.data.country, sp.data.notice.type, Object.values(sp.data.kc).every(v => !v.choice), L.sampleTemplate('shipping').data.fee, F.elevenstFormFromProduct(sp.data).originCode],
      ['중국산 생활잡화', { type: 'overseas', place: '중국' }, '중국', '기타 재화', true, null, '1287'])
    const shown = t => t.slice(t.indexOf('<template>'), t.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')
    const screens = ['src/components/studio/StudioListingTemplates.vue', 'src/components/studio/StudioListingTemplateForm.vue']
    eq('관리 화면 문구 합니다체(대화체 없음) · 내부 용어 없음 · 로그아웃 때 비움(clear) · 기본 설정 탭에 붙음', [screens.filter(p => talk.test(shown(read(p))) || /관리자|서버|SQL/.test(shown(read(p)))), /listingRef\.value\?\.clear\(\)/.test(read('src/views/studio/StudioShippingView.vue')), /<StudioListingTemplates v-if="showListing"/.test(read('src/views/studio/StudioShippingView.vue'))], [[], true, true])
    const sv = read('src/views/studio/StudioShippingView.vue')
    eq('등록 템플릿 카드: 11번가 보내기와 같은 스위치(ELEVENST_SEND_PUBLIC true) — 고객도 카드 있음 · 관리자·스태프도 있음 · 판정은 isAdminOrStaff + 로그인',
      [F.ELEVENST_SEND_PUBLIC, R.listingTemplatesShown(), R.listingTemplatesShown({ admin: false }), R.listingTemplatesShown({ admin: true }), /showListing = computed\(\(\) => loggedIn\.value && listingTemplatesShown\(\{ admin: isAdminOrStaff\.value \}\)\)/.test(sv)],
      [true, true, true, true, true])
    const sql = read('docs/sql/2026-10-01-marketplace-listing-templates.sql')
    eq('SQL: 새 표 + RLS + 본인 행 정책 4개 + authenticated GRANT · anon 없음 · 기본 1개 인덱스 · 기존 쿠팡 표 안 건드림', [/create table public\.marketplace_listing_templates/.test(sql), /enable row level security/.test(sql), (sql.match(/create policy/g) || []).length, /grant select, insert, delete on table public\.marketplace_listing_templates to authenticated/.test(sql), /grant [^;]*to anon/.test(sql), /where is_default/.test(sql), /alter table public\.marketplace_templates|drop table if exists public\.marketplace_templates/.test(sql)], [true, true, 4, true, false, true, false])
  }

  // 4) handler — 가짜 Supabase + 가짜 중계(/11st) + 가짜 카테고리
  const PID11 = 'aaaaaaaa-1111-4111-8111-111111111111', EID11 = 'bbbbbbbb-2222-4222-8222-222222222222', IMG11 = 'cccccccc-3333-4333-8333-333333333333'
  const folder11 = `${UID}/${PID11}/exports/20261001-150000-st01`
  const { default: sharp } = await import('sharp')
  db.studio_projects.push({ id: PID11, user_id: UID, title: '머그' })
  db.studio_exports.push({ id: EID11, user_id: UID, project_id: PID11, folder: folder11, title: '매일 쓰는 머그', format: 'jpg', mode: 'sections', files: [{ key: '01', name: 'a_01.jpg', path: `${folder11}/01.jpg`, width: 780, height: 900 }, { key: '02', name: 'a_02.jpg', path: `${folder11}/02.jpg`, width: 780, height: 400 }] })
  db.studio_images.push({ id: IMG11, user_id: UID, project_id: PID11, original_path: `${UID}/${PID11}/orig/m.png`, width: 800, height: 600, sort_order: 0, included: true, ingest_status: 'done' })
  files.set(`${UID}/${PID11}/orig/m.png`, await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 0, g: 120, b: 200 } } }).png().toBuffer())
  files.set(`${folder11}/01.jpg`, await sharp({ create: { width: 780, height: 900, channels: 3, background: { r: 250, g: 250, b: 250 } } }).jpeg().toBuffer())
  files.set(`${folder11}/02.jpg`, await sharp({ create: { width: 780, height: 400, channels: 3, background: { r: 10, g: 10, b: 10 } } }).jpeg().toBuffer())
  const UI11 = {
    exportId: EID11, productName: '매일 쓰는 머그', brand: '', categoryId: '1017898', categoryName: '주방용품>컵>머그컵', price: 12900, stock: 30, repImageId: IMG11, fit: 'contain',
    vat: '01', minorOk: true, origin: { kind: '02', code: '1287' }, kc: { '01': 'agent', '02': 'none', '03': 'none', '04': 'none' },
    delivery: { feeType: '01', fee: null, jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000, outAddr: '12', inAddr: '22' },
    asDetail: '상세페이지 참조', rtngExchDetail: '상세페이지 참조', notice: { type: '891045', maker: '이유씨', country: '중국', phone: '010-1234-5678' },
  }
  db.marketplace_accounts = db.marketplace_accounts.filter(a => !(a.user_id === UID && a.market === '11st'))
  eq('연결 전 → 409 not_connected (카테고리·주소록·보내기 모두) · 기록 안 만듦', [(await post('elevenst_categories')).body.code, (await post('elevenst_addresses')).body.code, (await post('elevenst_send', UI11)).body.code, db.marketplace_sends.filter(s => s.market === '11st').length], ['not_connected', 'not_connected', 'not_connected', 0])
  db.marketplace_accounts.push({ id: newId(), user_id: UID, market: '11st', seller_login_id: 'zozo', vendor_id: null, access_key_enc: encryptSecret('11st-key-ABCD1234', K), secret_key_enc: null, key_last4: '1234', expires_at: null, status: 'connected' })

  relay.calls = []
  const cats = await post('elevenst_categories')
  eq('카테고리: 11번가 공개 조회(중계·키 없음) · 최하위만 · 전체 이름', [cats.statusCode, cats.body.categories.map(c => `${c.id}:${c.wholeName}`), relay.calls.length, st11.categoryCalls], [200, ['200:가구', '1017898:주방용품>컵>머그컵'], 0, 1])
  relay.calls = []
  const ad = await post('elevenst_addresses')
  eq('주소록: 출고지·반품지 두 번 조회(중계 /11st + openapikey, GET만 — 읽기만) · EUC-KR 읽기 · 보낸 적 없으면 목록 첫째', [ad.statusCode, ad.body.outAddresses.map(a => `${a.id}:${a.name}`), ad.body.inAddresses.map(a => `${a.id}:${a.name}`), ad.body.last, ad.body.defaults, relay.calls.map(c => `${c.method} ${c.path}`), relay.calls.every(c => c.headers.openapikey === '11st-key-ABCD1234' && c.headers['x-relay-secret'] === 'test-relay-secret')],
    [200, ['11:3PL 창고', '12:사무실 출고'], ['21:반품센터', '22:창고 반품'], { out: null, in: null }, { out: '11', in: '21' }, ['GET /11st/rest/areaservice/outboundarea', 'GET /11st/rest/areaservice/inboundarea'], true])
  st11.mode = 'addr-fail'
  const adFail = await post('elevenst_addresses')
  st11.mode = 'ok'
  eq('주소록 result_message가 SUCCESS가 아니면 502 · 합니다체', [adFail.statusCode, adFail.body.message], [502, '판매처 주소록을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.'])

  relay.calls = []
  const nSend = db.marketplace_sends.length
  const iv = await post('elevenst_send', { ...UI11, stock: 0 })
  eq('재고 0 → 400 · 11번가 호출 0 · 기록 안 만듦', [iv.statusCode, iv.body.code, relay.calls.length, db.marketplace_sends.length], [400, 'invalid_input', 0, nSend])
  // SQL 실행 전(market 규칙에 11st 없음)이면 11번가에 보내기 전에 503
  {
    const realFetch = globalThis.fetch
    globalThis.fetch = async (url, o = {}) => (new URL(url).pathname === '/rest/v1/marketplace_sends' && (o.method || 'GET') === 'POST' && JSON.parse(o.body).market === '11st'
      ? json({ code: '23514', message: 'new row for relation "marketplace_sends" violates check constraint "marketplace_sends_market_check"' }, 400) : realFetch(url, o))
    relay.calls = []
    const gap = await post('elevenst_send', UI11)
    globalThis.fetch = realFetch
    eq('SQL 실행 전 → 503 marketplace_sql_missing · 상품 등록 호출 없음', [gap.statusCode, gap.body.code, relay.calls.filter(c => /prodservices/.test(c.path)).length], [503, 'marketplace_sql_missing', 0])
  }
  // 보내는 중 가드 (2026-10-01): 스마트스토어와 같은 규칙 · 다른 판매처(스마트스토어)의 sending은 11번가를 막지 않음
  const busy11 = { id: newId(), user_id: UID, export_id: UI11.exportId, market: '11st', status: 'sending', created_at: new Date().toISOString(), request_json: {} }
  const otherMarket = { ...busy11, id: newId(), market: 'smartstore' }
  db.marketplace_sends.push(busy11, otherMarket)
  relay.calls = []
  const nBusy11 = db.marketplace_sends.length
  const b11 = await post('elevenst_send', UI11)
  eq('11번가 보내는 중 가드: 2분 안 sending → 409 send_in_progress · 11번가 호출 0 · 기록 안 만듦', [b11.statusCode, b11.body.code, relay.calls.length, db.marketplace_sends.length], [409, 'send_in_progress', 0, nBusy11])
  db.marketplace_sends.splice(db.marketplace_sends.indexOf(busy11), 1) // 남은 것 = 스마트스토어 sending → 아래 성공 보내기가 그대로 간다
  relay.calls = []
  const ok = await post('elevenst_send', { ...UI11, testStop: true }) // 관리자 계정(가짜 user_roles admin) — 판매중지까지
  db.marketplace_sends.splice(db.marketplace_sends.indexOf(otherMarket), 1)
  const rec = db.marketplace_sends.at(-1)
  const prod = relay.calls.find(c => c.path.endsWith('/rest/prodservices/product'))
  const sentXml = prod ? dec(prod.raw) : ''
  eq('보내기 성공: 200 registered · 상품번호 · 관리자 테스트 판매중지 = PUT stopdisplay/{상품번호}', [ok.statusCode, ok.body.status, ok.body.productNo, ok.body.stopped, relay.calls.map(c => `${c.method} ${c.path}`)], [200, 'registered', '3456789012', true, ['POST /11st/rest/prodservices/product', 'PUT /11st/rest/prodstatservice/stat/stopdisplay/3456789012']])
  eq('보낸 본문: Content-Type text/xml · EUC-KR 바이트 = buildElevenstProduct 결과 · 대표 이미지 = 우리 이미지 주소(토큰) · 상세 = 내 상품 2장', [prod.headers['Content-Type'], sentXml === rec.request_json.xml, /^https:\/\/www\.euchs\.co\.kr\/api\/marketplace\?t=/.test(E11.xmlTag(sentXml, 'prdImage01')), (E11.xmlTag(sentXml, 'htmlDetail').match(/<img /g) || []).length, E11.xmlTag(sentXml, 'addrSeqOut'), E11.xmlTag(sentXml, 'addrSeqIn')], ['text/xml', true, true, 2, '12', '22'])
  {
    // 상세 이미지 영구 주소 (2026-10-01): studio → market-images 버킷 복사 · 공개 주소 · 토큰 주소 없음 · 기록 request_json.publicImages
    const pi = rec.request_json.publicImages
    const srcs = [...E11.xmlTag(sentXml, 'htmlDetail').matchAll(/<img src="([^"]+)"/g)].map(x => x[1])
    eq('상세 이미지 = 공개 창고 영구 주소({무작위 32자}/{key}.jpg) · 토큰 주소(?t=) 없음 · 버킷 간 복사(destinationBucket) 2번 · 경로에 회원·작업 ID 없음',
      [srcs, srcs.some(s => s.includes('?t=')), marketImages.copies.slice(-2).map(c => `${c.bucketId}:${c.sourceKey}→${c.destinationBucket}:${c.destinationKey}`), /^[0-9a-f]{32}$/.test(pi.folder), pi.paths.some(x => x.includes(UID) || x.includes(PID11))],
      [[`http://mock.local/storage/v1/object/public/market-images/${pi.folder}/01.jpg`, `http://mock.local/storage/v1/object/public/market-images/${pi.folder}/02.jpg`], false,
        [`studio:${folder11}/01.jpg→market-images:${pi.folder}/01.jpg`, `studio:${folder11}/02.jpg→market-images:${pi.folder}/02.jpg`], true, false])
    eq('기록: request_json에 publicImages { bucket, folder, paths } 추가 · 예전 키(xml·files·summary·categoryName) 그대로 · 공개 창고에 실제로 2장',
      [Object.keys(rec.request_json).sort(), pi.bucket, pi.paths, rec.request_json.files['01'], pi.paths.every(x => marketImages.files.has(x))],
      [['categoryName', 'files', 'publicImages', 'summary', 'xml'], 'market-images', [`${pi.folder}/01.jpg`, `${pi.folder}/02.jpg`], `${folder11}/01.jpg`, true])
    eq('상세 이미지 주소 함수: 주소 없는 번호가 있으면 throw (조용히 빼지 않음)', (() => { try { E11.elevenstDetailImageUrls({ files: [{ key: '01' }, { key: '02' }], urlOf: k => ({ '01': 'u/01' })[k] }); return 'no throw' } catch (e) { return e.message } })(), '11번가 상세 이미지 02번 주소 없음')
  }
  {
    // 복사가 하나라도 실패 → 토큰 주소로 바꾸지 않고 멈춤 · 11번가 등록 호출 없음 · 기록 failed · 이번에 복사한 것은 지움
    const keep = files.get(`${folder11}/02.jpg`)
    files.delete(`${folder11}/02.jpg`)
    relay.calls = []
    const before = marketImages.files.size
    const bad = await quiet(() => post('elevenst_send', UI11))
    files.set(`${folder11}/02.jpg`, keep)
    const brec = db.marketplace_sends.at(-1)
    eq('공개 창고 복사 실패 → 500 market_images_failed · 원인(번호·오류) 문구 · 11번가 호출 0 · 기록 failed · 남은 복사본 없음',
      [bad.statusCode, bad.body.code, /02번 이미지 복사 실패: Object not found/.test(bad.body.message), relay.calls.length, brec.status, brec.result_json?.step, marketImages.files.size - before],
      [500, 'market_images_failed', true, 0, 'failed', 'images', 0])
  }
  eq('기록: market 11st · registered · seller_product_id = 상품번호 · 요약(주소·상품명) · 키·중계 비밀 없음', [rec.market, rec.status, rec.seller_product_id, rec.request_json.summary.prdNm, rec.request_json.summary.addrSeqOut, /11st-key-ABCD1234|test-relay-secret/.test(JSON.stringify(rec) + JSON.stringify(ok.body))], ['11st', 'registered', '3456789012', '매일 쓰는 머그', '12', false])
  {
    const t = new URL(E11.xmlTag(sentXml, 'prdImage01')).searchParams.get('t')
    const res = mockRes()
    await quiet(() => handler({ method: 'GET', url: `/api/marketplace?t=${t}`, headers: {} }, res))
    eq('대표 이미지 주소: 11번가가 내려받을 때 Content-Type image/jpeg (문서 — 이미지 형식이어야 다운로드)', [res.statusCode, res.headers['content-type']], [200, 'image/jpeg'])
  }
  const ad2 = await post('elevenst_addresses')
  eq('마지막에 보낸 주소 기억(출고지 12 · 반품지 22 — 목록 첫째가 아님) · 새 DB 칸 없음(보내기 기록에서)', [ad2.body.last, ad2.body.defaults], [{ out: '12', in: '22' }, { out: '12', in: '22' }])
  const listed = (await post('sends_list')).body.sends.find(s => s.id === rec.id)
  eq('보낸 상품 목록: 11번가 줄 · 상품명 · 카테고리', [listed?.market, listed?.status, listed?.productName, listed?.categoryName], ['11st', 'registered', '매일 쓰는 머그', '주방용품>컵>머그컵'])
  {
    // 등록 템플릿 (2026-10-01): 화면이 보낸 조건부 무료·고시 나머지 항목이 서버(elevenstInput)를 거쳐 XML까지 (가짜 중계 — 실제 11번가 호출 없음)
    relay.calls = []
    const cond = await post('elevenst_send', { ...UI11, delivery: { ...UI11.delivery, feeType: '03', fee: '3000', freeOver: 30000 }, notice: { ...UI11.notice, items: { 11800: '머그컵 MG-1', bad: 'x', 23756033: 5 } } })
    const cx = dec(relay.calls.find(c => c.path.endsWith('/rest/prodservices/product'))?.raw || Buffer.alloc(0))
    eq('서버 경유 조건부 무료: 03 · dlvCst1 3000 · PrdFrDlvBasiAmt 30000 · 고시 품명 항목 = 판매자 값(글자가 아닌 값·이상한 코드는 버림)', [cond.statusCode, E11.xmlTag(cx, 'dlvCstInstBasiCd'), E11.xmlTag(cx, 'dlvCst1'), E11.xmlTag(cx, 'PrdFrDlvBasiAmt'), E11.xmlBlocks(cx, 'item').map(b => E11.xmlTag(b, 'name'))[0], E11.xmlBlocks(cx, 'item').map(b => E11.xmlTag(b, 'name'))[4]], [200, '03', '3000', '30000', '머그컵 MG-1', '상세페이지 참조'])
  }
  {
    // 옵션(싱글옵션, 2026-10-01): 화면이 options를 보내면 서버(elevenstInput)를 거쳐 XML까지. 빈 재고·0원 옵션 없음은 11번가를 부르기 전에 400
    const OPT = { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'M'], addPrice: 0, stock: 5 }, { values: ['화이트', 'L'], addPrice: '1000', stock: 7 }] }
    relay.calls = []
    const n0 = db.marketplace_sends.length
    const empty = await post('elevenst_send', { ...UI11, options: { ...OPT, rows: [{ ...OPT.rows[0], stock: '' }] } })
    const noZero = await post('elevenst_send', { ...UI11, options: { ...OPT, rows: [{ ...OPT.rows[1] }] } })
    eq('11번가 옵션 재고 비움 · 0원 옵션 없음 → 400 + 고객 문구 · 11번가 호출 0 · 기록 안 만듦', [empty.statusCode, empty.body.message, noZero.statusCode, noZero.body.message, relay.calls.filter(c => c.path.includes('/rest/')).length, db.marketplace_sends.length],
      [400, '판매할 옵션의 재고 수량을 1개 이상 정수로 입력하세요. (11번가는 판매 옵션 재고 0으로 등록할 수 없습니다)', 400, '11번가는 추가금액 0원인 옵션이 1개 이상 있어야 합니다.', 0, n0])
    const good = await post('elevenst_send', { ...UI11, stock: 12, options: OPT })
    const ox = dec(relay.calls.find(c => c.path.endsWith('/rest/prodservices/product'))?.raw || Buffer.alloc(0))
    eq('서버 경유 옵션: 200 · optSelectYn Y · txtColCnt 1 · colTitle 색상/사이즈 · 옵션 2줄 · prdSelQty = 합계 12 · 기록 summary.options', [good.statusCode, E11.xmlTag(ox, 'optSelectYn'), E11.xmlTag(ox, 'txtColCnt'), E11.xmlTag(ox, 'colTitle'), E11.xmlBlocks(ox, 'ProductOption').map(b => [E11.xmlTag(b, 'useYn'), E11.xmlTag(b, 'colOptPrice'), E11.xmlTag(b, 'colValue0'), E11.xmlTag(b, 'colCount')]), E11.xmlTag(ox, 'prdSelQty'), db.marketplace_sends.at(-1).request_json.summary.options],
      [200, 'Y', '1', '색상/사이즈', [['Y', '0', '블랙/M', '5'], ['Y', '1000', '화이트/L', '7']], '12', { colTitle: '색상/사이즈', count: 2 }])
  }

  // 실패
  st11.mode = 'reject'
  const rj = await post('elevenst_send', UI11)
  eq('등록 거절(resultCode 500) → failed + 판매처 문구(합니다체)', [rj.statusCode, rj.body.code, rj.body.message, db.marketplace_sends.at(-1).status], [502, 'market_rejected', '판매처에서 등록을 거절했습니다: 카테고리 번호가 올바르지 않습니다.', 'failed'])
  st11.mode = 'limit'
  const lim = await post('elevenst_send', UI11)
  st11.mode = 'unapproved'
  const una = await post('elevenst_send', UI11)
  st11.mode = 'ok'
  eq('하루 한도(400) · Seller API 미승인(AuthMessage 300) → 문구 · 기록 failed', [lim.body.code, una.body.code, una.body.message], ['daily_limit', 'not_approved', '11번가 Seller API 승인이 필요합니다. 셀러오피스에서 Open API 승인 상태를 확인하세요.'])
  const adAfterFail = await post('elevenst_addresses')
  eq('실패한 보내기는 주소를 기억하지 않음 (12·22 그대로)', adAfterFail.body.last, { out: '12', in: '22' })

  // 고객(관리자 아님) — 공개(ELEVENST_SEND_PUBLIC true, 2026-10-01)라 11번가 조회·보내기가 된다. "등록 직후 판매중지"는 고객이 보내도 무시(관리자·스태프만)
  globalThis.__asCustomer = true
  process.env.STUDIO_ENABLED = 'all'
  try {
    relay.calls = []
    const nBefore = db.marketplace_sends.length
    const got = []
    let sent = null
    for (const a of ['elevenst_categories', 'elevenst_addresses', 'elevenst_send']) { const r = await post(a, { ...UI11, testStop: true }); got.push([r.statusCode, r.body?.code ?? null]); if (a === 'elevenst_send') sent = r.body }
    eq('고객(공개): elevenst_* 3개 모두 200 · 보내기 기록 1건 · testStop을 보내도 판매중지 안 함(stopped false · 판매중지 호출 없음) · 연결 상태(market_status) 그대로', [got, db.marketplace_sends.length - nBefore, sent?.stopped, relay.calls.filter(c => c.path.includes('/stopdisplay/')).length, (await post('market_status')).body.elevenst.connected], [[[200, null], [200, null], [200, null]], 1, false, 0, true])
  } finally {
    globalThis.__asCustomer = false
    process.env.STUDIO_ENABLED = 'admin'
  }

  // 화면 배선
  const shell = read('src/components/studio/StudioSendModal.vue'), sec = read('src/components/studio/StudioSendElevenst.vue'), lib = read('src/lib/studioMarketplace.js')
  const tpl = t => t.slice(t.indexOf('<template>'), t.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  const shown = tpl(sec)
  eq('보내기 창: 11번가 섹션 = 같은 모양(missing·busy·done·submit) · 관리자는 연결되면 체크 가능(connected) · 버튼 "11번가로 보내기"', [/'11st': StudioSendElevenst/.test(shell), /defineExpose\(\{ missing, busy, done, submit(, sendError)?(, applyPreset, pickedCategory)? \}\)/.test(sec), R.channelRows({ '11st': { connected: true } }, { admin: true }).find(r => r.key === '11st').state, R.sendButtonLabel(['11st'])], [true, true, 'connected', '11번가로 보내기'])
  eq('섹션: 금액 기본값 없음(빈칸) · KC 기본값 없음 · 고시 기본 891045 · 제조국 기본 = 공용 상수 · 관리자만 테스트 판매중지 · 공용 파일만 import', [
    sec.includes('feeType: \'01\', fee: null, jejuFee: null, islandFee: null, returnFee: null, exchangeFee: null'), sec.includes("kc: Object.fromEntries(KC_GROUPS.map(g => [g.code, '']))"), sec.includes('noticeType: DEFAULT_NOTICE_TYPE'), sec.includes('country: NOTICE_COUNTRY_DEFAULT'),
    /<label v-if="isAdminOrStaff"[^>]*data-mk-11st-teststop/.test(shown), /from '\.\.\/\.\.\/\.\.\/api\/_elevenstFields\.js'/.test(sec), /api\/_elevenst\.js'/.test(sec),
  ], [true, true, true, true, true, true, false])
  eq('섹션: 사전 준비 안내 · KC 판매자 책임 · 무거운 고시 유형 안내 · 주소록 관리(셀러오피스 새 탭)·새로고침 · 실패하면 해당 칸으로 스크롤', [
    /data-mk-11st-prep/.test(shown), /법적 책임은 판매자에게 있습니다/.test(shown), /data-mk-11st-notice-heavy/.test(shown), /:href="SELLER_OFFICE_URL" target="_blank" rel="noopener noreferrer" class="st-btn ml-auto" data-mk-11st-addr-manage>주소록 관리/.test(shown), /주소록 새로고침/.test(shown), /function scrollToProblem/.test(sec),
  ], [true, true, true, true, true, true])
  eq('문구 합니다체: 섹션 화면 글자에 대화체 없음 · "준비 중"·"곧" 없음', [talk.test(shown.replace(/<[^>]+>/g, ' ')), /준비 중|곧 /.test(shown)], [false, false])
  eq('클라이언트 함수 3개 · 서버 action 3개', [/call\('elevenst_categories'\)/.test(lib), /call\('elevenst_addresses'\)/.test(lib), /call\('elevenst_send', payload\)/.test(lib), ['elevenst_categories', 'elevenst_addresses', 'elevenst_send'].every(a => read('api/marketplace.js').includes(`body.action === '${a}'`))], [true, true, true, true])
  eq('범위: 11번가 주소록은 읽기만 — 주소 등록·수정 API 경로 없음', /registerOutAddress|updateOutAddress|registerRtnAddress|updateRtnAddress|addOutAddrBasiDlvCst/.test(read('api/_elevenst.js') + read('api/marketplace.js')), false)
}

// ── 판매처 공용 옵션 (2026-10-01) — api/_marketOptions.js · 스마트스토어 조합형 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const O = await import('../api/_marketOptions.js')
  const S = await import('../api/_smartstore.js')
  const pair = (zh, ko = null) => ({ zh, ko })
  const SKUS = [
    { skuId: '1', values: [{ name: pair('颜色', '색상'), value: pair('黑色', '블랙') }, { name: pair('尺码', '사이즈'), value: pair('M', 'M') }], priceCny: 12.5, stock: 300 },
    { skuId: '2', values: [{ name: pair('颜色', '색상'), value: pair('白色', '화이트') }, { name: pair('尺码', '사이즈'), value: pair('L', 'L') }], priceCny: 13, stock: 0 },
    { skuId: '3', values: [{ name: pair('颜色', '색상'), value: pair('奇怪花纹') }, { name: pair('尺码', '사이즈'), value: pair('L', 'L') }], priceCny: null, stock: null },
  ]
  const m = O.marketOptionsFromSource(SKUS)
  eq('원천 → 공용 모양: 옵션 종류 한글 · 값 = 쿠팡 옵션 표와 같은 koreanizeSkus 값 · 번역 안 된 값은 빈칸 · 원문 · 추가금액 0 · 재고 비움(1688 재고는 참고만)', [m.groupNames, m.rows.map(r => r.values), m.rows.map(r => r.originals), m.rows.map(r => [r.addPrice, r.stock, r.use, r.stock1688])],
    [['색상', '사이즈'], [['블랙', 'M'], ['화이트', 'L'], ['', 'L']], [['黑色', 'M'], ['白色', 'L'], ['奇怪花纹', 'L']], [[0, null, true, 300], [0, null, true, 0], [0, null, true, null]]])
  {
    const F2 = await import('../api/_coupangFields.js')
    const kr = F2.koreanizeSkus(SKUS)
    eq('공용 값 = 쿠팡 옵션 표 값(koreanizeSkus opt) 그대로 — 같은 원천·같은 규칙', m.rows.map(r => r.values), kr.rows.map(r => kr.types.map(t => r.opt[t.key] || '')))
  }
  eq('옵션 없는 상품 → 빈 모양 (단일상품)', [O.marketOptionsFromSource([]), O.marketOptionsFromSource(undefined)], [{ groupNames: [], rows: [] }, { groupNames: [], rows: [] }])
  eq('번역 없는 옵션 종류 이름은 중국어를 넣지 않고 빈칸 (같은 뜻 묶음이면 표준 이름)', [O.marketOptionsFromSource([{ values: [{ name: pair('颜色分类'), value: pair('黑', '블랙') }] }]).groupNames, O.marketOptionsFromSource([{ values: [{ name: pair('奇怪属性'), value: pair('甲', '갑') }] }]).groupNames], [['색상'], ['']])

  const P = { enabled: true, groupNames: [' 색상 ', '사이즈'], rows: [{ values: ['블랙', 'M'], addPrice: 0, stock: 5, use: true }, { values: ['화이트', 'L'], addPrice: 500, stock: 3, use: false }] }
  eq('보낼 모양: 판매할 줄만 · 글자 정리 · 옵션 끔/줄 0개 = null(단일상품)', [O.optionsPayload(P), O.optionsPayload({ ...P, enabled: false }), O.optionsPayload({ ...P, rows: [] }), O.optionsPayload({ ...P, rows: P.rows.map(r => ({ ...r, use: false })) })],
    [{ groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'M'], addPrice: 0, stock: 5 }] }, null, null, null])

  eq('옵션가 범위 [2차 출처]: 2천 미만 0~+100% · 1만 미만 -50~+100% · 1만 이상 -50~+50% · 판매가 없음 = null', [O.ssOptionPriceRange(1500), O.ssOptionPriceRange(5000), O.ssOptionPriceRange(12900), O.ssOptionPriceRange(null), O.ssOptionPriceRange(0)],
    [{ min: 0, max: 1500 }, { min: -2500, max: 5000 }, { min: -6450, max: 6450 }, null, null])
  const OK = { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'M'], addPrice: 0, stock: 5 }, { values: ['화이트', 'L'], addPrice: 1000, stock: 0 }] }
  const pr = (o, price = 12900) => O.smartstoreOptionProblems({ ...OK, ...o }, price)
  eq('옵션 검사: 정상 = 없음 · 재고 0 허용(그 옵션 품절)', pr({}), [])
  eq('옵션 검사: 종류 4개(조합형 최대 3 — 문서) · 종류 이름 빈칸·겹침 · 값 빈칸 · 같은 조합 두 번 · 재고 비움/음수/소수 · 추가금액 비움 · 범위 밖 · 줄 0개', [
    pr({ groupNames: ['a', 'b', 'c', 'd'], rows: [{ values: ['1', '2', '3', '4'], addPrice: 0, stock: 1 }] }), pr({ groupNames: ['색상', ''] }), pr({ groupNames: ['색상', '색상'] }),
    pr({ rows: [{ values: ['블랙', ''], addPrice: 0, stock: 1 }] }), pr({ rows: [OK.rows[0], { ...OK.rows[0] }] }),
    pr({ rows: [{ ...OK.rows[0], stock: NaN }] }), pr({ rows: [{ ...OK.rows[0], stock: -1 }] }), pr({ rows: [{ ...OK.rows[0], stock: 1.5 }] }),
    pr({ rows: [{ ...OK.rows[0], addPrice: NaN }] }), pr({ rows: [{ ...OK.rows[0], addPrice: -7000 }] }), pr({ rows: [] }),
  ].map(x => x.length), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  eq('옵션 검사 문구: 고객이 알아볼 합니다체 · 대화체 없음', [pr({ rows: [{ ...OK.rows[0], addPrice: 7000 }] })[0], pr({ groupNames: ['a', 'b', 'c', 'd'], rows: [{ values: ['1', '2', '3', '4'], addPrice: 0, stock: 1 }] })[0],
    [pr({ groupNames: ['색상', ''] }), pr({ rows: [OK.rows[0], { ...OK.rows[0] }] }), pr({ rows: [{ ...OK.rows[0], stock: NaN }] })].flat().filter(x => /(어요|예요|해요|돼요|아요|워요|네요|줘요)[.!]|주세요/.test(x)).length],
    ['옵션 추가금액은 판매가 12,900원 기준 -6,450원 ~ +6,450원 사이로 입력하세요.', '스마트스토어 옵션 종류는 3개까지 등록할 수 있습니다. (지금 4개)', 0])

  const IN = {
    productName: '머그', salePrice: 12900, stock: 30, leafCategoryId: '50000999', repUrl: 'https://shop-phinf.pstatic.net/a/rep.jpg', detailUrls: ['https://shop-phinf.pstatic.net/a/1.jpg'], display: 'SUSPENSION',
    delivery: { company: 'CJGLS', feeType: 'FREE', returnFee: 3000, exchangeFee: 6000, shippingAddressId: 102, returnAddressId: 103 },
    afterService: { phone: '010-1234-5678', guide: '상세페이지 참조' }, origin: { code: '03' }, notice: { itemName: '머그컵', modelName: 'MUG-01', manufacturer: '이유씨' },
  }
  const one = S.buildSmartstoreProduct(IN), withNull = S.buildSmartstoreProduct({ ...IN, options: null }), opt = S.buildSmartstoreProduct({ ...IN, stock: undefined, options: OK })
  eq('옵션 없음(null·없음) = 예전 단일상품 본문과 똑같음 · optionInfo 없음', [JSON.stringify(withNull) === JSON.stringify(one), 'optionInfo' in one.body.originProduct.detailAttribute], [true, false])
  eq('옵션 있음: optionInfo 조합형(문서 칸만) · useStockManagement true(미입력이면 9,999 — 문서) · stockQuantity = 합계 · 단일 재고 칸은 안 봄', [opt.ok, opt.body.originProduct.stockQuantity, opt.body.originProduct.detailAttribute.optionInfo], [true, 5, {
    optionCombinationGroupNames: { optionGroupName1: '색상', optionGroupName2: '사이즈' },
    optionCombinations: [{ optionName1: '블랙', optionName2: 'M', stockQuantity: 5, price: 0, usable: true }, { optionName1: '화이트', optionName2: 'L', stockQuantity: 0, price: 1000, usable: true }],
    useStockManagement: true,
  }])
  eq('옵션 문서 밖 칸 없음 (단독형·표준형·직접입력형·정렬·SKU 안 보냄)', Object.keys(opt.body.originProduct.detailAttribute.optionInfo).sort(), ['optionCombinationGroupNames', 'optionCombinations', 'useStockManagement'])
  eq('옵션 종류 1개 = optionGroupName1·optionName1만', S.buildSmartstoreProduct({ ...IN, options: { groupNames: ['색상'], rows: [{ values: ['블랙'], addPrice: 0, stock: 2 }] } }).body.originProduct.detailAttribute.optionInfo.optionCombinations, [{ optionName1: '블랙', stockQuantity: 2, price: 0, usable: true }])
  eq('옵션이 틀리면 본문 거절(임의 값으로 채우지 않음) — 서버 검사 = 화면 검사 함수', [S.buildSmartstoreProduct({ ...IN, options: { ...OK, rows: [{ ...OK.rows[0], stock: NaN }] } }).message, S.buildSmartstoreProduct({ ...IN, options: { groupNames: [], rows: [] } }).ok], ['판매할 옵션의 재고 수량을 0~99,999,999 사이 정수로 입력하세요.', false])

  // 화면 연결 — 스마트스토어 섹션만 옵션 영역을 쓴다 (11번가는 근거 확정 전이라 보류 · 쿠팡은 손대지 않음)
  const ss = read('src/components/studio/StudioSendSmartstore.vue'), area = read('src/components/studio/StudioSendOptions.vue')
  eq('스마트스토어 섹션: 옵션 영역(늘 그림 — 가져온 옵션이 없으면 꺼진 채) · 같은 원천(prepare.source.skus) · 화면 검사 = 서버 함수 · 옵션을 쓸 때만 options 보냄 · 재고 칸 대신 합계', [
    /<StudioSendOptions v-show="showOwn\('stock'\)" :model="opts"/.test(ss), ss.includes('const opts = ref(emptyOptionEditor())') && ss.includes(':skus="prepare.source?.skus || []"') && ss.includes(':ordered="prepare.ordered || []"'), /smartstoreOptionProblems\(/.test(ss), /\.\.\.\(optionsOut\.value \? \{ options: optionsOut\.value \} : \{\}\)/.test(ss), /<label v-if="!useOptions"( v-show="showOwn\('stock'\)")? class="block">/.test(ss), /const useOptions = computed\(\(\) => opts\.value\.enabled\)/.test(ss),
  ], [true, true, true, true, true, true])
  eq('옵션 영역(2026-10-02): 옵션 사용 끄기 · 종류 추가·삭제 · 값 입력·[추가]·Enter · 칩 ⓧ · 선택 삭제·일괄입력·되살리기 · 추가금액·재고 칸 · 가져온 원문 · 1688 재고는 툴팁만 · "판매" 체크 없음', [
    /data-mk-opt-enabled/.test(area), /data-mk-opt-group-add[^>]*>옵션 종류 추가</.test(area), /data-mk-opt-group-remove[^>]*>삭제</.test(area), /data-mk-opt-value-input[^>]*@keydown\.enter\.prevent="onAddValues\(g\)"/.test(area), /data-mk-opt-value-add[^>]*>추가</.test(area), /data-mk-opt-chip-remove/.test(area),
    /data-mk-opt-delete[^>]*>선택 삭제</.test(area), /data-mk-opt-bulk-price-apply[^>]*>추가금액 일괄입력</.test(area), /data-mk-opt-bulk-stock-apply[^>]*>재고 일괄입력</.test(area), /data-mk-opt-restore[^>]*>삭제한 조합 되살리기</.test(area),
    /data-mk-opt-price/.test(area), /data-mk-opt-stock/.test(area), /가져온 옵션:/.test(area), /`1688 재고 \$\{r\.stock1688\}`/.test(area), /data-mk-opt-use|판매 안 함/.test(area),
  ], [true, true, true, true, true, true, true, true, true, true, true, true, true, true, false])
  eq('옵션 영역 문구: 합니다체 · 대화체 없음 (화면·편집 안내 문구)', /(어요|예요|해요|돼요|아요|워요|네요|줘요)|주세요/.test(area.slice(0, area.indexOf('<style')) + read('src/lib/studioOptionEditor.js')), false)
  eq('쿠팡 섹션·서버는 공용 옵션을 쓰지 않음 (쿠팡 출력 그대로)', /StudioSendOptions|_marketOptions/.test(read('src/components/studio/StudioSendCoupang.vue') + read('api/_coupang.js') + read('api/_coupangFields.js')), false)

  // ── 11번가 싱글옵션 (공식 예제 singleOption1.txt) ──
  const E11 = await import('../api/_elevenst.js')
  const dec = buf => new TextDecoder('euc-kr').decode(buf)
  const NOW = new Date('2026-10-01T03:00:00Z')
  const EIN = {
    productName: '매일 쓰는 머그', categoryId: '1017898', price: 12900, stock: 30, repUrl: 'https://x/rep.jpg', detailUrls: ['https://x/01.jpg'],
    vat: '01', origin: { kind: '02', code: '1287' }, kc: { '01': 'none', '02': 'none', '03': 'none', '04': 'none' },
    delivery: { feeType: '01', jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000, outAddr: '11', inAddr: '22' },
    asDetail: '상세페이지 참조', rtngExchDetail: '상세페이지 참조', notice: { type: '891045', maker: '이유씨', country: '중국', phone: '010-1234-5678' }, now: NOW,
  }
  const plain = E11.buildElevenstProduct(EIN), plainNull = E11.buildElevenstProduct({ ...EIN, options: null })
  eq('11번가 옵션 없음(null·없음) = 예전 XML과 바이트까지 같음 · 옵션 태그 없음 · summary 예전 모양', [plain.ok, Buffer.compare(plain.buf, plainNull.buf), /optSelectYn|txtColCnt|colTitle|ProductOption|colValue0/.test(plain.xml), 'options' in plain.summary], [true, 0, false, false])
  const OPT1 = { groupNames: ['색상'], rows: [{ values: ['블랙'], addPrice: 0, stock: 10 }, { values: ['화이트'], addPrice: 1000, stock: 5 }] }
  const OPT2 = { groupNames: ['색상', '사이즈'], rows: [{ values: ['블루', 'XL'], addPrice: 0, stock: 10 }, { values: ['블랙', 'M'], addPrice: 500, stock: 3 }] }
  const g1 = E11.buildElevenstProduct({ ...EIN, stock: undefined, options: OPT1 }), g2 = E11.buildElevenstProduct({ ...EIN, options: OPT2 })
  const block = xml => xml.slice(xml.indexOf('<selPrc>'), xml.indexOf('</prdSelQty>') + '</prdSelQty>'.length)
  eq('11번가 옵션 XML(종류 1개): 공식 예제 모양 그대로 · selPrc 뒤 prdSelQty 앞 · prdSelQty = 합계 · prdExposeClfCd·colSellerStockCd·멀티옵션 칸 없음', [g1.ok, block(g1.xml), /prdExposeClfCd|colSellerStockCd|optionAllQty|optionAllAddPrc|optMixYn|ProductRootOption/.test(g1.xml)], [true,
    '<selPrc>12900</selPrc><optSelectYn>Y</optSelectYn><txtColCnt>1</txtColCnt><colTitle>색상</colTitle><ProductOption><useYn>Y</useYn><colOptPrice>0</colOptPrice><colValue0>블랙</colValue0><colCount>10</colCount></ProductOption><ProductOption><useYn>Y</useYn><colOptPrice>1000</colOptPrice><colValue0>화이트</colValue0><colCount>5</colCount></ProductOption><prdSelQty>15</prdSelQty>', false])
  eq('11번가 옵션 XML(종류 2개): "/"로 합쳐 한 칸 (색상/사이즈 · 블루/XL) · 단일 재고 칸은 안 봄 · EUC-KR로 돌려 읽어도 같음', [block(dec(g2.buf)), g2.summary.prdSelQty, g2.summary.options],
    ['<selPrc>12900</selPrc><optSelectYn>Y</optSelectYn><txtColCnt>1</txtColCnt><colTitle>색상/사이즈</colTitle><ProductOption><useYn>Y</useYn><colOptPrice>0</colOptPrice><colValue0>블루/XL</colValue0><colCount>10</colCount></ProductOption><ProductOption><useYn>Y</useYn><colOptPrice>500</colOptPrice><colValue0>블랙/M</colValue0><colCount>3</colCount></ProductOption><prdSelQty>13</prdSelQty>', 13, { colTitle: '색상/사이즈', count: 2 }])
  eq('11번가 옵션 넣어도 다른 요소 그대로 (옵션 블록만 빼면 옵션 없는 XML과 같음, prdSelQty 값 제외)', g2.xml.replace(/<optSelectYn>[\s\S]*<\/ProductOption>/, '').replace(/<prdSelQty>\d+<\/prdSelQty>/, ''), plain.xml.replace(/<prdSelQty>\d+<\/prdSelQty>/, ''))

  eq('11번가 옵션가 범위: -50% ~ +100% · 판매가 없음 = null', [O.elevenstOptionPriceRange(12900), O.elevenstOptionPriceRange(10), O.elevenstOptionPriceRange(null)], [{ min: -6450, max: 12900 }, { min: -5, max: 10 }, null])
  eq('11번가 옵션값 길이 단위: 한글 2 · 영문·숫자·기호 1 (한글 25자 = 영문 50자)', [O.elevenstValueUnits('블랙/M'), O.elevenstValueUnits('가'.repeat(25)), O.elevenstValueUnits('a'.repeat(50))], [6, 50, 50])
  const ep = (o, price = 12900) => O.elevenstOptionProblems({ ...OPT2, ...o }, price)
  eq('11번가 옵션 검사: 정상 = 없음', ep({}), [])
  eq('11번가 옵션 검사 문구', [
    ep({ rows: [{ ...OPT2.rows[1] }] })[0],
    ep({ rows: [{ ...OPT2.rows[0], stock: 0 }] })[0],
    ep({ rows: [OPT2.rows[0], { ...OPT2.rows[0], addPrice: 100 }] })[0],
    ep({ rows: [OPT2.rows[0], { ...OPT2.rows[1], addPrice: -7000 }] })[0],
    ep({ rows: [OPT2.rows[0], { ...OPT2.rows[1], addPrice: 13000 }] })[0],
    ep({ groupNames: ['아주 긴 색상 종류 이름입니다', '사이즈 종류 이름'] })[0],
    ep({ rows: [{ ...OPT2.rows[0], values: ['가'.repeat(24), 'XL'] }] })[0],
    ep({ rows: [{ ...OPT2.rows[0], values: ['블루|네이비', 'XL'] }] })[0],
    ep({ groupNames: ['색상#', '사이즈'] })[0],
    ep({ rows: [{ ...OPT2.rows[0], values: ['블루', ''] }] })[0],
  ], [
    '11번가는 추가금액 0원인 옵션이 1개 이상 있어야 합니다.',
    '판매할 옵션의 재고 수량을 1개 이상 정수로 입력하세요. (11번가는 판매 옵션 재고 0으로 등록할 수 없습니다)',
    '같은 옵션값이 두 번 있습니다. 옵션값을 다르게 하거나 한 줄을 판매 안 함으로 바꾸세요.',
    '옵션 추가금액은 판매가 12,900원 기준 -6,450원 ~ +12,900원 사이로 입력하세요.',
    '옵션 추가금액은 판매가 12,900원 기준 -6,450원 ~ +12,900원 사이로 입력하세요.',
    '11번가 옵션명은 25자까지입니다. 옵션 종류 이름을 줄이세요. (지금 "아주 긴 색상 종류 이름입니다/사이즈 종류 이름" 26자)',
    `11번가 옵션값은 한글 25자(영문·숫자 50자)까지입니다: "${'가'.repeat(24)}/XL"`,
    '옵션값에 11번가가 받지 않는 특수문자가 있습니다: |',
    '옵션 종류 이름에 11번가가 받지 않는 특수문자가 있습니다: #',
    '판매할 옵션의 옵션값을 모두 입력하세요.',
  ])
  eq('11번가 옵션 검사 문구: 대화체 없음', [ep({ rows: [{ ...OPT2.rows[1] }] }), ep({ rows: [{ ...OPT2.rows[0], stock: NaN }] }), ep({ groupNames: [] })].flat().filter(x => /(어요|예요|해요|돼요|아요|워요|네요|줘요)[.!]|주세요/.test(x)).length, 0)
  eq('11번가: 옵션이 틀리면 본문 거절 · EUC-KR로 못 바꾸는 글자(옵션) → 거절 + 옵션 문구', [E11.buildElevenstProduct({ ...EIN, options: { ...OPT2, rows: [{ ...OPT2.rows[1] }] } }).message, E11.buildElevenstProduct({ ...EIN, options: { ...OPT2, rows: [{ ...OPT2.rows[0], values: ['블루😀', 'XL'] }] } }).message],
    ['11번가는 추가금액 0원인 옵션이 1개 이상 있어야 합니다.', '11번가에 보낼 수 없는 글자가 옵션에 있습니다: 😀 — 옵션 이름·값에서 빼고 다시 보내세요.'])
  eq('판매 안 함 줄은 보내지 않음(품절 N으로 보내지 않음) · useYn은 늘 Y', [O.optionsPayload({ enabled: true, groupNames: ['색상'], rows: [{ values: ['블랙'], addPrice: 0, stock: 1, use: true }, { values: ['화이트'], addPrice: 0, stock: 1, use: false }] }).rows.length, /<useYn>N</.test(g1.xml + g2.xml)], [1, false])

  const el11 = read('src/components/studio/StudioSendElevenst.vue')
  eq('11번가 섹션: 옵션 영역(같은 컴포넌트) · 같은 원천 · 화면 검사 = 서버 함수 · 옵션 쓸 때만 options · 재고 칸 대신 합계 · 규칙 안내 · 요약 "옵션" 줄', [
    /<StudioSendOptions :model="opts"[^>]*:note="OPTION_NOTE"/.test(el11), el11.includes('const opts = ref(emptyOptionEditor())') && el11.includes(':skus="prepare.source?.skus || []"'), /elevenstOptionProblems\(/.test(el11), /\.\.\.\(optionsOut\.value \? \{ options: optionsOut\.value \} : \{\}\)/.test(el11), /<label v-if="!useOptions"( v-show="showOwn\('stock'\)")? class="block">/.test(el11), /0원인 옵션이 1개 이상/.test(el11), /label: '옵션', value: optionsSummary\.value/.test(el11),
  ], [true, true, true, true, true, true, true])
}

// ── 옵션 편집 (2026-10-02) — src/lib/studioOptionEditor.js · 옵션 종류 줄 + 옵션값 칩 → 조합 목록 자동 생성 (공통 정보·스마트스토어·11번가) ──
{
  const E = await import('../src/lib/studioOptionEditor.js')
  const O = await import('../api/_marketOptions.js')
  const S = await import('../api/_smartstore.js')
  const E11 = await import('../api/_elevenst.js')
  const names = m => m.rows.map(r => r.values.join('/'))
  const fresh = () => { const m = E.emptyOptionEditor(); m.enabled = true; return m }
  const group = (m, name, text) => { E.addGroup(m); const g = m.groups[m.groups.length - 1]; E.setGroupName(m, g.id, name); if (text) E.addValues(m, g.id, text); return g }

  // 조합 생성 1·2·3종류
  const m1 = fresh(); group(m1, '색상', '블랙, 레드')
  eq('조합(종류 1개): 값마다 한 줄 · 종류 이름 · 추가금액 0 · 재고 빈칸 · use true', [m1.groupNames, names(m1), m1.rows.map(r => [r.addPrice, r.stock, r.use])], [['색상'], ['블랙', '레드'], [[0, null, true], [0, null, true]]])
  const m2 = fresh(); group(m2, '색상', '블랙, 레드'); group(m2, '사이즈', 'Small, Large')
  eq('조합(종류 2개): 블랙·레드 × Small·Large = 4줄 (첫 종류가 바깥)', [m2.groupNames, names(m2)], [['색상', '사이즈'], ['블랙/Small', '블랙/Large', '레드/Small', '레드/Large']])
  const m3 = fresh(); group(m3, '색상', '블랙, 레드'); group(m3, '사이즈', 'S, M, L'); group(m3, '재질', '면, 린넨')
  eq('조합(종류 3개): 2×3×2 = 12줄 · 첫 줄·끝 줄', [m3.rows.length, names(m3)[0], names(m3)[11]], [12, '블랙/S/면', '레드/L/린넨'])
  eq('옵션 종류 최대 3개: 4번째는 추가 안 함 + 안내', [E.addGroup(m3), m3.groups.length], [{ ok: false, message: '옵션 종류는 3개까지 추가할 수 있습니다.' }, 3])
  const mEmpty = fresh(); group(mEmpty, '색상', '블랙'); group(mEmpty, '사이즈')
  eq('값이 없는 종류는 조합에 안 들어감(종류 줄만) · 보낼 종류 이름에도 없음', [mEmpty.groupNames, names(mEmpty)], [['색상'], ['블랙']])

  // 값 추가·삭제 뒤 기존 줄 값 유지
  m2.rows[0].addPrice = 500; m2.rows[0].stock = 7; m2.rows[0].checked = true; m2.rows[3].stock = 2
  E.addValues(m2, m2.groups[0].id, '화이트')
  eq('값 추가 → 조합 다시 만듦 · 같은 조합 줄의 추가금액·재고·선택 유지 · 새 줄은 0·빈칸', [names(m2), m2.rows.map(r => [r.addPrice, r.stock, r.checked])],
    [['블랙/Small', '블랙/Large', '레드/Small', '레드/Large', '화이트/Small', '화이트/Large'], [[500, 7, true], [0, null, false], [0, null, false], [0, 2, false], [0, null, false], [0, null, false]]])
  E.removeValue(m2, m2.groups[1].id, m2.groups[1].values.find(v => v.label === 'Small').id)
  eq('칩 ⓧ(Small) → 그 값이 든 조합만 빠짐 · 남은 줄 값 유지', [names(m2), m2.rows.map(r => r.stock)], [['블랙/Large', '레드/Large', '화이트/Large'], [null, 2, null]])
  const rg = m2.groups[0].values.find(v => v.label === '레드')
  eq('칩 이름 고치기: 줄 값 유지 · 같은 종류 안 중복·빈 값은 고치지 않음', [E.renameValue(m2, m2.groups[0].id, rg.id, '와인'), names(m2)[1], m2.rows[1].stock, E.renameValue(m2, m2.groups[0].id, rg.id, '블랙').message, E.renameValue(m2, m2.groups[0].id, rg.id, '  ').message],
    [{ ok: true, message: '' }, '와인/Large', 2, '이미 있는 옵션값입니다: 블랙', '옵션값을 입력하세요.'])
  E.setGroupName(m2, m2.groups[1].id, '크기')
  eq('종류 이름 바꾸기 → 보낼 이름만 바뀌고 줄은 그대로', [m2.groupNames, m2.rows[1].stock], [['색상', '크기'], 2])
  E.removeGroup(m2, m2.groups[1].id)
  eq('종류 줄 [삭제] → 그 종류 없이 조합 다시 만듦', [m2.groupNames, names(m2)], [['색상'], ['블랙', '와인', '화이트']])

  // 쉼표·중복
  const mc = fresh(); const gc = group(mc, '사이즈')
  eq('쉼표로 여러 값: "S, M, L" → 칩 3개 · 빈 토막 무시', [E.addValues(mc, gc.id, 'S, M,, L ,').added, gc.values.map(v => v.label)], [['S', 'M', 'L'], ['S', 'M', 'L']])
  eq('같은 종류 안 중복 값(대소문자·띄어쓰기 무시)은 추가 안 함 + 문구 · 입력 안 중복도 한 번만', [E.addValues(mc, gc.id, 'm, XL, xl'), gc.values.map(v => v.label)],
    [{ ok: true, message: '이미 있는 옵션값은 추가하지 않았습니다: m, xl', added: ['XL'], skipped: ['m', 'xl'] }, ['S', 'M', 'L', 'XL']])
  eq('전부 중복 · 빈 입력 = 추가 없음 + 문구', [E.addValues(mc, gc.id, 'S').ok, E.addValues(mc, gc.id, 'S').message, E.addValues(mc, gc.id, ' , ').message], [false, '이미 있는 옵션값은 추가하지 않았습니다: S', '옵션값을 입력하세요.'])
  const big = fresh(); group(big, 'a', Array.from({ length: 10 }, (_, i) => `a${i}`).join(',')); group(big, 'b', Array.from({ length: 10 }, (_, i) => `b${i}`).join(','))
  const gBig = group(big, 'c', Array.from({ length: 10 }, (_, i) => `c${i}`).join(','))
  eq('조합 1,000개(화면 한도)를 넘기는 값 추가는 막음 + 문구 · 목록 그대로', [E.addValues(big, gBig.id, 'c10').message, big.rows.length], ['조합이 1,000개를 넘습니다. 옵션값 수를 줄여 입력하세요.', 1000])

  // 선택 삭제·되살리기
  const md = fresh(); group(md, '색상', '블랙, 레드'); group(md, '사이즈', 'S, M')
  md.rows[1].addPrice = 300; md.rows[1].stock = 4
  md.rows[1].checked = true; md.rows[2].checked = true
  eq('[선택 삭제]: 선택 없으면 막음 + 문구', E.deleteChecked(fresh()), { ok: false, message: '삭제할 조합을 선택하세요.' })
  E.deleteChecked(md)
  eq('[선택 삭제] → 목록·보낼 모양에서 빠짐(판매 안 함 표시가 아니라 실제로 없음) · 되살리기 대상 2개', [names(md), O.optionsPayload(md).rows.map(r => r.values.join('/')), E.restorableCount(md)], [['블랙/S', '레드/M'], ['블랙/S', '레드/M'], 2])
  E.addValues(md, md.groups[1].id, 'L')
  eq('값을 더해도 지운 조합은 다시 안 나옴 · 새 조합만 생김', names(md), ['블랙/S', '블랙/L', '레드/M', '레드/L'])
  E.restoreDeleted(md)
  eq('[삭제한 조합 되살리기] → 지울 때의 추가금액·재고로 돌아옴 · 선택 풀림 · 되살리기 대상 0', [names(md), md.rows.map(r => [r.addPrice, r.stock, r.checked]), E.restorableCount(md)],
    [['블랙/S', '블랙/M', '블랙/L', '레드/S', '레드/M', '레드/L'], [[0, null, false], [300, 4, false], [0, null, false], [0, null, false], [0, null, false], [0, null, false]], 0])
  md.rows[0].checked = true; E.deleteChecked(md)
  E.removeValue(md, md.groups[1].id, md.groups[1].values.find(v => v.label === 'S').id)
  eq('지운 조합의 값 칩을 빼면 되살리기 대상에서도 정리', E.restorableCount(md), 0)

  // 일괄입력
  const mb = fresh(); group(mb, '색상', '블랙, 레드, 화이트')
  E.bulkSet(mb, 'stock', 10)
  eq('[재고 일괄입력] 선택 없음 → 전체', mb.rows.map(r => r.stock), [10, 10, 10])
  mb.rows[1].checked = true
  E.bulkSet(mb, 'addPrice', 1000)
  eq('[추가금액 일괄입력] 선택 있음 → 선택한 줄만', mb.rows.map(r => r.addPrice), [0, 1000, 0])
  eq('일괄입력 값 검사: 재고 음수·소수 · 추가금액 빈칸 = 막음 + 문구 · 음수 추가금액은 됨', [E.bulkSet(mb, 'stock', -1).message, E.bulkSet(mb, 'stock', 1.5).message, E.bulkSet(mb, 'addPrice', null).message, E.bulkSet(mb, 'addPrice', -500).ok, mb.rows.map(r => [r.addPrice, r.stock])],
    ['재고 수량을 0 이상 정수로 입력하세요.', '재고 수량을 0 이상 정수로 입력하세요.', '추가금액을 정수(원)로 입력하세요.', true, [[0, 10], [-500, 10], [0, 10]]])
  E.checkAll(mb, true)
  eq('전체 선택 · 해제', [mb.rows.every(r => r.checked), (E.checkAll(mb, false), mb.rows.some(r => r.checked))], [true, false])

  // 1688 원천 미리 채우기 — 없는 조합 제외
  const pair = (zh, ko = null) => ({ zh, ko })
  const SKUS = [
    { skuId: '1', values: [{ name: pair('颜色', '색상'), value: pair('黑色', '블랙') }, { name: pair('尺码', '사이즈'), value: pair('M', 'M') }], priceCny: 12.5, stock: 300 },
    { skuId: '2', values: [{ name: pair('颜色', '색상'), value: pair('白色', '화이트') }, { name: pair('尺码', '사이즈'), value: pair('L', 'L') }], priceCny: 13, stock: 0 },
    { skuId: '3', values: [{ name: pair('颜色', '색상'), value: pair('奇怪花纹') }, { name: pair('尺码', '사이즈'), value: pair('L', 'L') }], priceCny: null, stock: null },
  ]
  const ms = E.optionEditorFromSource(SKUS)
  eq('1688 미리 채우기: 옵션 사용 켬 · 종류 이름 · 값 칩(원문마다 하나, 번역 없으면 빈 칩 + 원문) · 1688에 없는 조합 3개는 처음부터 뺌',
    [ms.enabled, ms.groups.map(g => [g.name, g.values.map(v => [v.label, v.original])]), names(ms), E.excludedComboCount(ms)],
    [true, [['색상', [['블랙', '黑色'], ['화이트', '白色'], ['', '奇怪花纹']]], ['사이즈', [['M', 'M'], ['L', 'L']]]], ['블랙/M', '화이트/L', '/L'], 3])
  {
    const src = O.marketOptionsFromSource(SKUS)
    eq('미리 채운 줄 = 예전 공용 원천과 같은 값·원문·추가금액·재고·1688 참고값', ms.rows.map(r => [r.values, r.originals, r.addPrice, r.stock, r.use, r.stock1688, r.priceCny]), src.rows.map(r => [r.values, r.originals, r.addPrice, r.stock, r.use, r.stock1688, r.priceCny]))
  }
  eq('옵션 없는 상품 → 옵션 꺼짐·종류 없음·줄 없음 · 보낼 모양 null(단일상품)', [E.optionEditorFromSource([]).enabled, E.optionEditorFromSource(undefined).groups, E.optionEditorFromSource([]).rows, O.optionsPayload(E.optionEditorFromSource([]))], [false, [], [], null])
  ms.rows[0].stock = 5
  E.addGroup(ms); E.setGroupName(ms, ms.groups[2].id, '재질'); E.addValues(ms, ms.groups[2].id, '면')
  eq('종류를 더해도 1688에 없는 조합은 계속 빠짐 · 같은 조합이 아니면 새 줄', [names(ms), ms.rows.map(r => r.stock)], [['블랙/M/면', '화이트/L/면', '/L/면'], [null, null, null]])
  E.removeGroup(ms, ms.groups[2].id)
  const blank = ms.groups[0].values.find(v => !v.label)
  E.renameValue(ms, ms.groups[0].id, blank.id, '꽃무늬')
  eq('빈 칩에 한글 넣기 → 그 줄 값이 채워지고 원문 표시 유지', [names(ms), ms.rows[2].originals], [['블랙/M', '화이트/L', '꽃무늬/L'], ['奇怪花纹', 'L']])

  // 보낼 모양 불변 — 서버·판매처 변환은 예전 그대로
  ms.rows.forEach((r, i) => { r.stock = [5, 3, 2][i]; r.addPrice = [0, 1000, 0][i] })
  const pl = O.optionsPayload(ms)
  eq('보낼 모양 = 예전과 같음 { groupNames, rows:[{ values, addPrice, stock }] } (편집 칸 없음)', pl, { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'M'], addPrice: 0, stock: 5 }, { values: ['화이트', 'L'], addPrice: 1000, stock: 3 }, { values: ['꽃무늬', 'L'], addPrice: 0, stock: 2 }] })
  const IN = {
    productName: '머그', salePrice: 12900, leafCategoryId: '50000999', repUrl: 'https://shop-phinf.pstatic.net/a/rep.jpg', detailUrls: ['https://shop-phinf.pstatic.net/a/1.jpg'], display: 'SUSPENSION',
    delivery: { company: 'CJGLS', feeType: 'FREE', returnFee: 3000, exchangeFee: 6000, shippingAddressId: 102, returnAddressId: 103 },
    afterService: { phone: '010-1234-5678', guide: '상세페이지 참조' }, origin: { code: '03' }, notice: { itemName: '머그컵', modelName: 'MUG-01', manufacturer: '이유씨' },
  }
  const ssb = S.buildSmartstoreProduct({ ...IN, options: pl })
  eq('편집한 옵션 → 스마트스토어 조합형 본문(변환 함수 그대로) · 재고 = 합계', [ssb.ok, ssb.body.originProduct.stockQuantity, ssb.body.originProduct.detailAttribute.optionInfo.optionCombinations.map(c => [c.optionName1, c.optionName2, c.price, c.stockQuantity])],
    [true, 10, [['블랙', 'M', 0, 5], ['화이트', 'L', 1000, 3], ['꽃무늬', 'L', 0, 2]]])
  const EIN = {
    productName: '매일 쓰는 머그', categoryId: '1017898', price: 12900, repUrl: 'https://x/rep.jpg', detailUrls: ['https://x/01.jpg'],
    vat: '01', origin: { kind: '02', code: '1287' }, kc: { '01': 'none', '02': 'none', '03': 'none', '04': 'none' },
    delivery: { feeType: '01', jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000, outAddr: '11', inAddr: '22' },
    asDetail: '상세페이지 참조', rtngExchDetail: '상세페이지 참조', notice: { type: '891045', maker: '이유씨', country: '중국', phone: '010-1234-5678' }, now: new Date('2026-10-02T03:00:00Z'),
  }
  const eb = E11.buildElevenstProduct({ ...EIN, options: pl })
  eq('편집한 옵션 → 11번가 싱글옵션 XML(변환 함수 그대로) · "/"로 합침 · 합계', [eb.ok, eb.summary.options, eb.summary.prdSelQty, /<colValue0>꽃무늬\/L<\/colValue0>/.test(eb.xml)], [true, { colTitle: '색상/사이즈', count: 3 }, 10, true])
  eq('판매처 검사는 공용 함수 그대로: 빈 칩이 남으면 "옵션값을 모두 입력" · 11번가 0원 옵션 필수', [
    O.smartstoreOptionProblems(O.optionsPayload(E.optionEditorFromSource(SKUS)), 12900).filter(x => /옵션값을 모두/.test(x)).length,
    O.elevenstOptionProblems({ ...pl, rows: pl.rows.map(r => ({ ...r, addPrice: 100 })) }, 12900).includes('11번가는 추가금액 0원인 옵션이 1개 이상 있어야 합니다.'),
  ], [1, true])

  // 복사(공통 정보 ↔ 섹션) — 서로 안 바뀜
  const cp = E.cloneOptionEditor(ms)
  cp.groups[0].values[0].label = 'x'; cp.rows[0].stock = 99; cp.excluded[0][0] = 'zz'
  eq('편집 모양 복사: 종류·칩·줄·제외 목록이 원본과 따로', [ms.groups[0].values[0].label, ms.rows[0].stock, ms.excluded[0][0] === 'zz', cp.seq === ms.seq], ['블랙', 5, false, true])
  eq('공통 정보 복사 함수 = 편집 모양 복사', (await import('../src/lib/studioSendCommon.js')).cloneOptions === E.cloneOptionEditor, true)
}

// ── 22. 여러 판매처 한 번에 보내기 — 공통 정보 (2026-10-01) · src/lib/studioSendCommon.js (2026-10-02 쿠팡도 공통 정보 — 쿠팡 규칙은 studioCoupangLink, 24번 묶음) ──
{
  const SC = await import('../src/lib/studioSendCommon.js')
  const O = await import('../api/_marketOptions.js')
  eq('공통 정보 대상 = 쿠팡·스마트스토어·11번가·지그재그 (카페24 아님 — 2026-10-02 쿠팡·지그재그 포함)', SC.COMMON_MARKETS, ['coupang', 'smartstore', '11st', 'zigzag'])
  eq('공통 정보를 쓰는 때: 대상 2곳 이상 · 1곳만이면 예전 그대로 · 쿠팡+1곳도 공통 · 다시 보내기는 아님', [
    SC.commonActive(['smartstore']), SC.commonActive(['11st']), SC.commonActive(['coupang', 'smartstore']), SC.commonActive(['smartstore', '11st']), SC.commonActive(['coupang', 'smartstore', '11st']),
    SC.commonActive(['smartstore', '11st'], { resend: true }), SC.commonActive([]), SC.commonActive(undefined),
  ], [false, false, true, true, true, false, false, false])
  eq('쿠팡만 1곳 = 예전 그대로(쿠팡 칸에서 직접) · 쿠팡+지그재그 = 공통 · 카페24는 공통 대상 아님', [SC.commonActive(['coupang']), SC.commonActive(['coupang', 'zigzag']), SC.commonActive(['coupang', 'cafe24'])], [false, true, false])
  eq('지그재그 칸 이름 = 스마트스토어와 같음(productName·price·stock) · commonPatch로 옮김', SC.commonPatch('zigzag', { productName: 'a', price: 1000, stock: 3, opts: { enabled: false, groups: [], groupNames: [], rows: [] }, repImageId: 'i', fit: 'contain' }).form, { productName: 'a', price: 1000, stock: 3, repImageId: 'i', fit: 'contain' })
  eq('추가금액 범위: 쿠팡은 범위 규칙이 없어 빼고 계산 (쿠팡+스마트스토어 = 스마트스토어 범위)', [SC.commonOptionRange(['coupang', 'smartstore'], 12900), SC.commonOptionRange(['smartstore'], 12900), SC.commonOptionRange(['coupang'], 12900)].map(x => JSON.stringify(x)), [JSON.stringify(SC.commonOptionRange(['smartstore'], 12900)), JSON.stringify(SC.commonOptionRange(['smartstore'], 12900)), 'null'])

  const pair = (zh, ko = null) => ({ zh, ko })
  // 옵션별 가격이 다른 상품(3-8 첫째 — 1081981728994 모양): 줄마다 1688 가격이 다르다 → 원화 추가금액은 고객이 줄마다 넣는다(1688 위안은 원화로 바꾸지 않음)
  const SKUS = [
    { skuId: '1', values: [{ name: pair('颜色', '색상'), value: pair('黑色', '블랙') }], priceCny: 12.5, stock: 300 },
    { skuId: '2', values: [{ name: pair('颜色', '색상'), value: pair('白色', '화이트') }], priceCny: 18, stock: 0 },
  ]
  const PREP = { export: { projectTitle: '매일 쓰는 머그', title: 'x' }, source: { title: { ko: '머그' }, skus: SKUS }, images: [{ id: 'img0', kind: 'desc', sortOrder: 0 }, { id: 'img2', kind: 'upload', sortOrder: 0 }, { id: 'img1', kind: 'gallery', sortOrder: 1 }] }
  const c0 = SC.commonFromPrepare(PREP)
  {
    // 2026-10-02: 옵션은 처음부터 채우지 않는다(사입 셀러 — 실제로 들여온 옵션만) · 대표 이미지 = 1688 대표 사진 첫 후보
    eq('처음 공통 값 = 섹션 처음 값과 같은 규칙: 상품명 한글(작업 이름) · 판매가·재고 비움 · 옵션 비움(꺼진 채) · 대표 이미지 = 첫 후보(1688 대표 사진) · 여백 채우기', [c0.productName, c0.price, c0.stock, c0.opts.enabled, c0.opts.groupNames, c0.opts.rows, c0.repImageId, c0.fit],
      ['매일 쓰는 머그', null, null, false, [], [], 'img1', 'contain'])
    // 아래 테스트는 [1688 옵션 불러오기]로 전부 가져온 뒤의 모양으로 (StudioSendOptions onPick = replaceOptionEditor(optionEditorFromSource))
    const OE = await import('../src/lib/studioOptionEditor.js')
    OE.replaceOptionEditor(c0.opts, OE.optionEditorFromSource(SKUS))
    const src = O.marketOptionsFromSource(SKUS)
    eq('[1688 옵션 불러오기] 뒤: 같은 객체가 바뀜 · 같은 원천(종류·값·원문·추가금액·재고)', [c0.opts.enabled, c0.opts.groupNames, c0.opts.rows.map(r => [r.values, r.originals, r.addPrice, r.stock, r.use])], [true, src.groupNames, src.rows.map(r => [r.values, r.originals, r.addPrice, r.stock, r.use])])
  }
  eq('처음 공통 값: 사진·옵션 없는 상품 = 대표 이미지 null · 옵션 꺼짐·줄 없음(단일상품)', [SC.commonFromPrepare({ export: {}, images: [] }).repImageId, SC.commonFromPrepare({ export: {} }).opts.enabled, SC.commonFromPrepare({ export: {} }).opts.rows, O.optionsPayload(SC.commonFromPrepare({ export: {} }).opts)], [null, false, [], null])

  // 공통 가격 → 판매처 칸 (3-8: 금액을 바꾸지 않는다 — 반올림·자르기·임의 숫자 없음)
  const C = { ...c0, productName: '머그컵 350ml', price: 12900, stock: 30, repImageId: 'img2', fit: 'cover' }
  C.opts.rows[0].addPrice = 0; C.opts.rows[0].stock = 10
  C.opts.rows[1].addPrice = 1500; C.opts.rows[1].stock = 4
  const ss = SC.commonPatch('smartstore', C), e11 = SC.commonPatch('11st', C)
  eq('스마트스토어 칸: productName·salePrice·stock·repImageId·fit 그대로', ss.form, { productName: '머그컵 350ml', salePrice: 12900, stock: 30, repImageId: 'img2', fit: 'cover' })
  eq('11번가 칸: productName·price·stock·repImageId·fit 그대로 (판매가 칸 이름만 다름)', e11.form, { productName: '머그컵 350ml', price: 12900, stock: 30, repImageId: 'img2', fit: 'cover' })
  eq('옵션별 가격이 다른 상품: 줄마다 자기 추가금액·재고 유지 (스마트스토어·11번가 같음)', [ss.opts.rows.map(r => [r.values, r.addPrice, r.stock]), e11.opts.rows.map(r => [r.values, r.addPrice, r.stock])],
    [[[['블랙'], 0, 10], [['화이트'], 1500, 4]], [[['블랙'], 0, 10], [['화이트'], 1500, 4]]])
  eq('보낼 모양까지: 판매처 검사 함수 통과 (스마트스토어 조합형 · 11번가 싱글옵션 · 같은 공통 값)', [O.smartstoreOptionProblems(O.optionsPayload(ss.opts), ss.form.salePrice), O.elevenstOptionProblems(O.optionsPayload(e11.opts), e11.form.price)], [[], []])
  eq('금액은 그대로 넘김: 12,345원 → 11번가 12345 (10원 단위로 반올림하지 않음 — 섹션 빠짐 목록이 "판매가 (10원 단위)"로 막음) · 빈칸은 빈칸', [
    SC.commonPatch('11st', { ...C, price: 12345 }).form.price, SC.commonPatch('smartstore', { ...C, price: null }).form.salePrice, SC.commonPatch('11st', { ...C, price: '' }).form.price, SC.commonPatch('11st', { ...C, stock: 0 }).form.stock,
  ], [12345, null, '', 0])
  eq('옵션은 복사본: 섹션이 고쳐도 공통 값·다른 판매처 값이 안 바뀜', (() => { ss.opts.rows[0].addPrice = 999; ss.opts.groupNames[0] = 'x'; ss.opts.rows[0].values[0] = 'y'; return [C.opts.rows[0].addPrice, C.opts.groupNames[0], C.opts.rows[0].values[0], e11.opts.rows[0].addPrice] })(), [0, '색상', '블랙', 0])
  eq('옵션 단순 상품(옵션 1개) · 옵션 끔 = 그대로 넘김', [SC.commonPatch('smartstore', { ...C, opts: { enabled: false, groupNames: ['색상'], rows: [{ values: ['블랙'], originals: ['黑色'], addPrice: 0, stock: 5, use: true }] } }).opts.enabled, O.optionsPayload(SC.commonPatch('11st', { ...C, opts: { enabled: false, groupNames: [], rows: [] } }).opts)], [false, null])
  eq('이 판매처만 다르게: 켠 묶음은 넣지 않음 (상품명 · 판매가 · 재고·옵션 = opts null · 대표 이미지)', [
    SC.commonPatch('11st', C, { name: true }).form, SC.commonPatch('11st', C, { price: true }).form, SC.commonPatch('smartstore', C, { stock: true }), SC.commonPatch('smartstore', C, { image: true }).form,
  ], [{ price: 12900, stock: 30, repImageId: 'img2', fit: 'cover' }, { productName: '머그컵 350ml', stock: 30, repImageId: 'img2', fit: 'cover' }, { form: { productName: '머그컵 350ml', salePrice: 12900, repImageId: 'img2', fit: 'cover' }, opts: null }, { productName: '머그컵 350ml', salePrice: 12900, stock: 30 }])
  eq('공통 대상이 아닌 판매처(쿠팡)는 오류로 멈춤 (조용히 넘어가지 않음)', (() => { try { SC.commonPatch('coupang', C); return 'no-throw' } catch (e) { return /쿠팡|coupang/.test(e.message) } })(), true)

  // ── 보내기 결과 표 · 실패한 판매처만 다시 보내기 ──
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  eq('결과 줄: MARKETS 순서 · 성공 = 상품번호·서버 status · 실패 = 섹션 사유 그대로 · 사유 없으면 안내 · 아직 = 대기', R.sendResultRows(['11st', 'coupang', 'smartstore', 'gmarket'], {
    smartstore: { ok: true, id: 123, status: 'registered' }, coupang: { ok: true, id: '999', status: 'approval_pending' }, '11st': { ok: false, reason: ' 판매처에서 등록을 거절했습니다: x ' },
  }).map(r => [r.key, r.state, r.id, r.status, r.reason]), [
    ['coupang', 'ok', '999', 'approval_pending', ''], ['smartstore', 'ok', '123', 'registered', ''], ['11st', 'fail', '', 'failed', '판매처에서 등록을 거절했습니다: x'], ['gmarket', 'wait', '', '', ''],
  ])
  eq('결과 줄: 실패 사유가 비면 "사유는 아래 판매처 칸에 표시됩니다."', R.sendResultRows(['11st'], { '11st': { ok: false, reason: '' } })[0].reason, R.SEND_RESULT_FAIL_HINT)
  eq('버튼 글자: 1곳 = 예전 그대로(실패했어도) · 2곳 이상 + 실패 남음 = "실패 건 재전송" · 실패 없음 = 예전 · 다시 보내기 = "다시 승인 요청"', [
    R.bulkSendLabel(['smartstore'], ['smartstore'], false), R.bulkSendLabel(['smartstore', '11st'], ['11st'], false), R.bulkSendLabel(['smartstore', '11st'], [], false), R.bulkSendLabel(['coupang'], ['coupang'], true), R.bulkSendLabel(['coupang', '11st'], [], false),
  ], ['스마트스토어로 보내기', '실패 건 재전송', '선택한 판매처로 보내기', '다시 승인 요청', '선택한 판매처로 보내기'])
  const modal = read('src/components/studio/StudioSendModal.vue')
  eq('창 배선: 등록된 곳(done)은 건너뛰고 나머지만 보냄 · 결과 표는 2곳 이상일 때만 · 실패 사유 = 섹션 sendError · 실패해도 다음 판매처 계속', [
    /const keys = picked\.value\.filter\(k => !sections\[k\]\?\.done\)/.test(modal), /runKeys\.value = picked\.value\.length > 1 \? \[\.\.\.picked\.value\] : \[\]/.test(modal), /reason: s\.sendError/.test(modal), /for \(const key of keys\)/.test(modal), /<section v-if="resultRows\.length"[^>]*data-mk-s-results>/.test(modal),
  ], [true, true, true, true, true])
  // ── 이미 보냄 (막지 않고 표시 + 처음 체크에서 뺌) · 다시 보내기 = 판매처에 있는 상품 수정(2026-10-02 — 예전 "중복 등록" 확인 문구는 걷어냄) ──
  const LAST = [{ market: 'coupang', status: 'approval_pending' }, { market: 'smartstore', status: 'registered', sellerProductId: '111' }, { market: '11st', status: 'failed' }, { status: 'approved' }]
  eq('이미 보냄 = 보내는 중·승인 대기·승인·등록됨 (반려·실패는 아님) · 판매처 칸 없는 예전 기록 = 쿠팡', [Object.keys(R.alreadySent(LAST)).sort(), Object.keys(R.alreadySent([{ market: '11st', status: 'rejected' }, { market: 'smartstore', status: 'sending' }])), R.alreadySent(undefined), R.ALREADY_SENT_STATUSES],
    [['coupang', 'smartstore'], ['smartstore'], {}, ['sending', 'approval_pending', 'approved', 'registered']])
  const ROWS3 = [{ key: 'coupang', state: 'connected' }, { key: 'smartstore', state: 'connected' }, { key: '11st', state: 'connected' }, { key: 'gmarket', state: 'planned' }]
  const SENT = R.alreadySent([{ market: 'smartstore', status: 'registered' }])
  eq('처음 체크: sent 없으면 예전과 같음 · [일괄 전송](판매처 없이)은 이미 보낸 곳을 뺌 · 판매처 버튼은 이미 보냈어도 체크(2026-10-02) · 다시 보내기는 sent를 안 봄', [
    JSON.stringify(R.initialChecked(ROWS3, {})) === JSON.stringify(R.defaultChecked(ROWS3)), R.initialChecked(ROWS3, { market: '11st' }),
    R.initialChecked(ROWS3, { sent: SENT }), R.initialChecked(ROWS3, { market: 'smartstore', sent: SENT }), R.initialChecked(ROWS3, { resend: true, sent: R.alreadySent([{ market: 'coupang', status: 'approved' }]) }),
  ], [true, { coupang: false, smartstore: false, '11st': true, gmarket: false },
    { coupang: true, smartstore: false, '11st': true, gmarket: false }, { coupang: false, smartstore: true, '11st': false, gmarket: false }, { coupang: true, smartstore: false, '11st': false, gmarket: false }])
  {
    // 두 진입 경로 — 처음 체크는 예전 그대로. 이미 판매처에 있는 상품(send_prepare.existing)은 확인 문구 대신 "수정" 안내, 수정 API가 없는 판매처(11번가)는 막음
    const pick = ch => Object.keys(ch).filter(k => ch[k])
    const viaButton = pick(R.initialChecked(ROWS3, { market: 'smartstore', sent: SENT }))
    const viaBulk = pick(R.initialChecked(ROWS3, { sent: SENT }))
    eq('처음 체크: [스마트스토어로 보내기] = 이미 등록 완료여도 체크 · [일괄 전송] = 이미 전송된 곳 뺌', [viaButton, viaBulk], [['smartstore'], ['coupang', '11st']])
    const EX = { smartstore: { mode: 'modify', sendId: 's1', sellerProductId: '111', status: 'registered', extra: 0 }, coupang: { mode: 'modify', sendId: 'c1', sellerProductId: '222', status: 'approved', extra: 2 }, '11st': { mode: 'manual', sendId: 'e1', sellerProductId: '333', status: 'registered', extra: 0 } }
    eq('수정 안내: 스마트스토어 = "판매처에 있는 상품을 수정합니다" · 쿠팡 = + "수정 후 쿠팡 승인을 다시 받습니다" · 11번가 = 판매처에서 직접 수정(상품번호) · 없는 판매처 = null', [
      R.existingNote('smartstore', EX), R.existingNote('coupang', EX), R.existingNote('11st', EX), R.existingNote('smartstore', {}), R.existingNote('smartstore', null),
    ], [{ mode: 'modify', lines: ['판매처에 있는 상품을 수정합니다'] }, { mode: 'modify', lines: ['판매처에 있는 상품을 수정합니다', '수정 후 쿠팡 승인을 다시 받습니다'] }, { mode: 'manual', lines: ['판매처에 등록된 상품이 있습니다(상품번호 333). 판매처에서 직접 수정하세요.'] }, null, null])
    eq('막는 판매처 = 체크됐고 수정 API가 없는데 이미 상품이 있는 곳(이번 창에서 등록한 곳 제외) · 빠짐 목록 문구', [
      R.manualEditKeys(['smartstore', '11st'], EX), R.manualEditKeys(['smartstore'], EX), R.manualEditKeys(['11st'], EX, ['11st']), R.manualEditMissing('11번가'),
    ], [['11st'], [], [], '11번가 판매처에서 직접 수정 (이미 등록된 상품)'])
    eq('버튼 글자: 보낼 곳이 모두 수정 = "변경사항 전송" · 새 등록이 섞이면 예전 그대로 · 다시 보내기(반려 고치기)는 "다시 승인 요청" · 이번 창에서 끝난 곳은 빼고 판단', [
      R.bulkSendLabel(['smartstore'], [], false, EX), R.bulkSendLabel(['smartstore', 'coupang'], [], false, EX), R.bulkSendLabel(['smartstore', '11st'], [], false, EX), R.bulkSendLabel(['smartstore'], [], false, {}),
      R.bulkSendLabel(['coupang'], [], true, EX), R.bulkSendLabel(['smartstore', '11st'], [], false, { smartstore: EX.smartstore }, ['11st']),
    ], ['변경사항 전송', '변경사항 전송', '선택한 판매처로 보내기', '스마트스토어로 보내기', '다시 승인 요청', '변경사항 전송'])
    const m = read('src/components/studio/StudioSendModal.vue')
    eq('창: 예전 중복 확인(중복 등록·선택 해제·sentOk·duplicateConfirmKeys) 없음 · 안내 = existingNote · 막는 판매처는 빠짐 목록 · 버튼 = bulkSendLabel(…existing)', [
      /중복 등록|sentOk|duplicateConfirmKeys|sentConfirmText|data-mk-s-sent-ok/.test(m.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '')), /existingNote\(k, existing\.value\)/.test(m), /for \(const key of manualKeys\.value\) out\.push\(manualEditMissing\(nameOf\(key\)\)\)/.test(m),
      /bulkSendLabel\(picked\.value, failedKeys\.value, !!props\.prepare\?\.resend, existing\.value, doneKeys\.value\)/.test(m), /props\.prepare\?\.resend \? \{\} : props\.prepare\?\.existing \|\| \{\}/.test(m),
    ], [false, true, true, true, true])
    eq('규칙 파일: 예전 중복 확인 함수 없음', ['duplicateConfirmKeys', 'sentConfirmText'].filter(k => k in R), [])
  }
  {
    // 상태 문구 한 곳 (2026-10-02) — 보내기 탭 줄 배지·내 상품 배지·보낸 상품 카드·보내기 창 배지·결과 표가 모두 sendStatusLabel
    const scr = ['src/views/studio/StudioChannelSendView.vue', 'src/components/studio/StudioExportList.vue', 'src/components/studio/StudioSendList.vue', 'src/components/studio/StudioSendModal.vue'].map(f => read(f))
    eq('상태 문구 통일: 등록 완료·승인 완료·승인 대기·전송 중·실패·반려 · 모르는 값은 그대로 · 화면 4곳 모두 sendStatusLabel · 따로 둔 표(SEND_STATUS_LABEL[ ]·SENT_BADGE_LABEL) 없음 · studioMarketplace는 다시 내보내기만', [
      ['registered', 'approved', 'approval_pending', 'sending', 'failed', 'rejected', 'weird'].map(R.sendStatusLabel), scr.map(s => /sendStatusLabel\(/.test(s)), scr.some(s => /SEND_STATUS_LABEL\[|SENT_BADGE_LABEL|RESULT_STATE_LABEL/.test(s)),
      /export const SEND_STATUS_LABEL/.test(read('src/lib/studioMarketplace.js')), /SEND_STATUS_LABEL, sendStatusLabel/.test(read('src/lib/studioMarketplace.js')),
    ], [['등록 완료', '승인 완료', '승인 대기', '전송 중', '실패', '반려', 'weird'], [true, true, true, true], false, false, true])
  }
  eq('업무용어: 배지 = 상태만(등록 완료·승인 대기·승인 완료·전송 중) · 수정 안내 · 결과 표 상태 · [실패 건 재전송]·[변경사항 전송]', [
    R.SEND_STATUS_LABEL, R.UPDATE_NOTE, R.reapprovalNote('coupang'), R.RESULT_WAIT_LABEL, R.RETRY_FAILED_LABEL, R.UPDATE_SEND_LABEL,
  ], [{ sending: '전송 중', approval_pending: '승인 대기', approved: '승인 완료', registered: '등록 완료', rejected: '반려', failed: '실패', deleted: '판매처에서 삭제됨', ended: '판매처에서 판매 종료' }, '판매처에 있는 상품을 수정합니다', '수정 후 쿠팡 승인을 다시 받습니다', '대기', '실패 건 재전송', '변경사항 전송'])
  {
    // 이번 작업에서 새로 넣은 고객 문구 — 합니다체 · "~요" 끝 없음 · 예전 문구 없음
    const strip = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    const files = ['src/components/studio/StudioSendModal.vue', 'src/components/studio/StudioSendCommon.vue', 'src/views/studio/StudioChannelSendView.vue', 'src/lib/studioSendCommon.js']
    const shown = files.map(f => strip(read(f))).join('\n') + '\n' + [R.SEND_RESULT_FAIL_HINT, ...Object.values(R.SEND_STATUS_LABEL), R.UPDATE_NOTE, R.reapprovalNote('coupang'), R.manualEditNote('1')].join('\n')
    eq('새 문구에 예전 표현 없음(이미 보냄·그래도 다시 보내기·체크 해제·보내기 결과·실패한 판매처 다시 보내기·여러 판매처로 한 번에 보내기)', ['이미 보냄', '그래도 다시 보내기', '체크 해제', '보내기 결과', '실패한 판매처 다시 보내기', '여러 판매처로 한 번에 보내기'].filter(w => shown.includes(w)), [])
    eq('새 문구 "~요" 끝 없음 (공통 정보 칸·창 확인 문구·결과 표·[일괄 전송] 안내)', [read('src/components/studio/StudioSendCommon.vue'), R.SEND_RESULT_FAIL_HINT, (await import('../src/lib/studioSendCommon.js')).COUPANG_COMMON_NOTE].map(strip).join('\n').match(/[가-힣]+요[.!"<\s]/g), null)
    eq('보내기 탭 진입 버튼 [일괄 전송] · 안내 합니다체', [/'일괄 전송'/.test(read('src/views/studio/StudioChannelSendView.vue')), read('src/views/studio/StudioChannelSendView.vue').includes('판매처별 항목만 따로 입력합니다.')], [true, true])
  }
  const view = read('src/views/studio/StudioChannelSendView.vue')
  eq('창 배선: 보내기 탭이 그 상품의 판매처별 최근 전송을 넘김 · 막는 판매처는 빠짐 목록(보내기 꺼짐) · 브라우저 confirm/alert 없음 · 다시 보내기 창은 안 씀', [
    /:sent="sentOfOpen"/.test(view), /sendsByExport\(sends\.value\)\[sendExportId\.value\]/.test(view), /for \(const key of manualKeys\.value\) out\.push\(/.test(modal), /window\.confirm|window\.alert|\bconfirm\(|\balert\(/.test(modal), /props\.prepare\?\.resend \? \{\} : alreadySent\(props\.sent\)/.test(modal), /sent: sentMap\.value/.test(modal),
  ], [true, true, true, false, true, true])
  // ── 공통 정보 화면 연결 (스마트스토어·11번가만 · 쿠팡은 자기 칸) ──
  eq('공통 옵션 추가금액 범위 = 두 판매처 범위가 겹치는 곳 (12,900원: 스마트스토어 ±6,450 · 11번가 -6,450~+12,900 → -6,450~+6,450) · 판매가 없음 = null · 1곳이면 그 판매처 범위', [
    SC.commonOptionRange(['smartstore', '11st'], 12900), SC.commonOptionRange(['smartstore', '11st'], 5000), SC.commonOptionRange(['smartstore', '11st'], null), SC.commonOptionRange(['11st'], 12900), SC.commonOptionRange(['coupang'], 12900),
  ], [{ min: -6450, max: 6450 }, { min: -2500, max: 5000 }, null, { min: -6450, max: 12900 }, null])
  {
    const ssv = read('src/components/studio/StudioSendSmartstore.vue'), e11v = read('src/components/studio/StudioSendElevenst.vue'), cpv = read('src/components/studio/StudioSendCoupang.vue')
    eq('창: 공통 정보는 대상 2곳 이상일 때만(commonActive) · common은 쿠팡·스마트스토어·11번가 섹션에 · 쿠팡 섹션도 common을 받음(2026-10-02)', [
      /useCommon = computed\(\(\) => !!common\.value && commonActive\(picked\.value, \{ resend: !!props\.prepare\?\.resend \}\)\)/.test(modal), /v-bind="COMMON_MARKETS\.includes\(key\) \? \{ common: useCommon \? common : null \} : \{\}"/.test(modal), /common: \{ type: Object, default: null \}/.test(cpv),
    ], [true, true, true])
    eq('섹션: 공통 값은 commonPatch로 자기 f·opts에 옮김(빠짐 목록·요약·보내기는 예전 그대로) · 보낸 뒤(done)는 안 옮김 · submit 본문은 공통 정보를 직접 안 봄', [
      /commonPatch\('smartstore', props\.common, own\)/.test(ssv), /commonPatch\('11st', props\.common, own\)/.test(e11v), [ssv, e11v].every(s => /if \(!props\.common \|\| done\.value\) return/.test(s)), [ssv, e11v].every(s => !/props\.common/.test(s.slice(s.indexOf('async function submit()'), s.indexOf('async function submit()') + 3000))),
    ], [true, true, true, true])
  }
  eq('보내기 탭: [여러 판매처로 한 번에 보내기] = 보낼 수 있는 곳 2곳 이상일 때만 · 판매처 없이 창을 엶(= 연결된 곳 모두 체크, 이미 보낸 곳 뺌) · 판매처별 버튼은 그대로', [
    /<div v-if="sendableCount > 1"[^>]*data-ch-send-all-box>/.test(view), /data-ch-send-all @click="openSend\(''\)"/.test(view), /sendableCount = computed\(\(\) => rows\.value\.filter\(r => r\.state === 'connected'\)\.length\)/.test(view),
    /opening\.value = market \|\| ALL/.test(view), /:data-ch-send="r\.key" @click="openSend\(r\.key\)"/.test(view),
  ], [true, true, true, true, true])
  {
    const api = read('api/marketplace.js')
    const fn = name => api.slice(api.indexOf(`async function ${name}(`), api.indexOf('\n}\n', api.indexOf(`async function ${name}(`)))
    eq('보내는 중 가드 범위: 스마트스토어·11번가 send에만(토큰·자격 확인 전) · 쿠팡 send·카페24 send에는 없음(다음 단계)', [
      fn('smartstoreSend').indexOf('sendInProgress(ctx, ex.id, SMARTSTORE)') > -1 && fn('smartstoreSend').indexOf('sendInProgress(') < fn('smartstoreSend').indexOf('smartstoreCredentials('),
      fn('elevenstSend').indexOf('sendInProgress(ctx, ex.id, ELEVENST)') > -1 && fn('elevenstSend').indexOf('sendInProgress(') < fn('elevenstSend').indexOf('elevenstCredentials('),
      /sendInProgress/.test(fn('send')), /sendInProgress/.test(fn('cafe24Send')),
    ], [true, true, false, false])
  }
  eq('섹션 4개 모두 sendError를 내놓음 (창 결과 표용 — 읽기만)', ['Coupang', 'Smartstore', 'Elevenst', 'Cafe24'].map(n => /defineExpose\(\{ missing, busy, done, submit, sendError(, applyPreset, pickedCategory)? \}\)/.test(read(`src/components/studio/StudioSend${n}.vue`))), [true, true, true, true])
}

// ── 보낸 상품 목록형 (2026-10-02) — studioSentList.js 순수 함수 + 화면 규칙 ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const SL = await import('../src/lib/studioSentList.js')
  const now = Date.parse('2026-10-02T03:00:00Z') // 한국 시각 10월 2일 12시
  const sends = [
    { id: 'a1', exportId: 'A', market: 'coupang', status: 'approval_pending', sellerProductId: '111', productName: '여름 원피스', createdAt: '2026-10-02T01:00:00Z' },
    { id: 'a2', exportId: 'A', market: 'smartstore', status: 'registered', sellerProductId: '222', channelProductNo: '9001', productName: '여름 원피스', createdAt: '2026-09-30T00:00:00Z' },
    { id: 'a3', exportId: 'A', market: 'smartstore', status: 'failed', sellerProductId: null, productName: null, reason: '이미지 오류', createdAt: '2026-09-20T00:00:00Z' },
    { id: 'b1', exportId: 'B', market: '11st', status: 'failed', sellerProductId: null, productName: '가방', reason: '카테고리 오류', createdAt: '2026-09-01T00:00:00Z' },
    { id: 'c1', exportId: 'C', market: 'coupang', status: 'rejected', sellerProductId: '333', productName: 'Apple 케이스', reason: '이미지', createdAt: '2026-09-26T00:00:00Z' },
    { id: 'd1', exportId: 'D', status: 'approved', sellerProductId: '444', productName: '나무 도마', createdAt: '2026-06-01T00:00:00Z' },
    { id: 'e1', exportId: null, market: 'smartstore', status: 'sending', productName: '전송중 상품', createdAt: '2026-10-02T02:00:00Z' },
  ]
  const P = SL.groupSentProducts(sends)
  const A = P.find(p => p.key === 'A')
  const keys = list => list.map(p => p.key)
  const f = o => keys(SL.filterSentProducts(P, { now, ...o }))
  eq('보낸 상품: 상품별로 묶음(최근 전송순) · 판매처마다 최근 기록 1건 · 상품명 = 이름 있는 최근 기록 · 판매처 없는 예전 기록 = 쿠팡 · 내 상품 id 없으면 기록 하나가 상품 하나', [
    keys(P), A.history.map(s => s.id), Object.fromEntries(Object.entries(A.byMarket).map(([k, s]) => [k, s.id])), A.productName, P.find(p => p.key === 'D').byMarket.coupang?.id, P[0].exportId,
  ], [['send:e1', 'A', 'C', 'B', 'D'], ['a1', 'a2', 'a3'], { coupang: 'a1', smartstore: 'a2' }, '여름 원피스', 'd1', null])
  eq('상태 카드 4개 = 전체·등록·승인 완료·승인 대기·실패·반려 · 숫자 = 그 상태가 판매처 칸(최근 기록)에 하나라도 있는 상품 수 · 지난 실패(뒤에 등록됨)는 안 셈', [
    SL.STATUS_GROUPS.map(g => g.label), SL.statusCounts(P), SL.STATUS_FILTERS.map(g => g.key),
  ], [['전체', '등록·승인 완료', '승인 대기', '실패·반려'], { all: 5, done: 2, pending: 1, failed: 2 }, ['all', 'done', 'pending', 'failed', 'sending', 'deleted', 'ended']])
  eq('상태 거르기: 실패·반려 · 전송 중 · 등록·승인 완료 · 승인 대기', [f({ status: 'failed' }), f({ status: 'sending' }), f({ status: 'done' }), f({ status: 'pending' })], [['C', 'B'], ['send:e1'], ['A', 'D'], ['A']])
  eq('판매처 거르기: 그 판매처 기록이 있는 상품만 · 판매처 + 상태는 같은 기록(스마트스토어 지난 실패는 안 걸림) · 쿠팡 + 등록·승인 완료', [f({ market: 'smartstore' }), f({ market: 'smartstore', status: 'failed' }), f({ market: 'coupang', status: 'done' }), f({ market: '11st' })], [['send:e1', 'A'], [], ['D'], ['B']])
  eq('보낸 기간: 오늘(한국 날짜) · 최근 7·30·90일 · 전체 · 판매처 + 기간도 같은 기록', [f({ period: 'today' }), f({ period: '7' }), f({ period: '30' }), f({ period: '90' }), f({ period: 'all' }).length, f({ market: 'smartstore', period: 'today' }), SL.kstDay('2026-10-01T15:30:00Z')], [['send:e1', 'A'], ['send:e1', 'A', 'C'], ['send:e1', 'A', 'C'], ['send:e1', 'A', 'C', 'B'], 5, ['send:e1'], '2026-10-02'])
  eq('검색: 상품명(대소문자 무시·앞뒤 공백 무시) · 판매처 상품번호(어느 기록이든, 스마트스토어 채널상품번호 포함) · 빈 검색 = 전체', [
    f({ field: 'name', text: ' 원피스 ' }), f({ field: 'name', text: 'apple' }), f({ field: 'no', text: '9001' }), f({ field: 'no', text: '33' }), f({ field: 'no', text: '원피스' }), f({ field: 'name', text: '' }).length,
  ], [['A'], ['C'], ['A'], ['C'], [], 5])
  eq('정렬: 최근 전송순 · 상품명순(가나다) · 원래 배열은 그대로', [keys(SL.sortSentProducts([...P].reverse(), 'recent')), keys(SL.sortSentProducts(P.filter(p => p.key !== 'C'), 'name')), keys(P)], [['send:e1', 'A', 'C', 'B', 'D'], ['B', 'D', 'A', 'send:e1'], ['send:e1', 'A', 'C', 'B', 'D']])
  const many = Array.from({ length: 45 }, (_, i) => i)
  eq('페이지: 20·50·100 (기본 50) · 넘친 페이지 = 끝 · 없는 크기 = 50', [SL.PAGE_SIZES, SL.DEFAULT_PAGE_SIZE, SL.pageSlice(many, 3, 20).items.length, SL.pageSlice(many, 9, 20).page, SL.pageSlice(many, 1, 7).items.length, SL.pageSlice([], 1, 20)], [[20, 50, 100], 50, 5, 3, 45, { items: [], page: 1, pages: 1 }])
  eq('칩 색 묶음: 완료 ok · 승인 대기·전송 중 wait · 실패·반려 bad', ['registered', 'approved', 'approval_pending', 'sending', 'failed', 'rejected', 'x'].map(SL.chipTone), ['ok', 'ok', 'wait', 'wait', 'bad', 'bad', ''])
  const B = P.find(p => p.key === 'B'), C = P.find(p => p.key === 'C')
  const lone = { key: 'send:z', exportId: null, byMarket: { smartstore: { id: 'z', market: 'smartstore', status: 'failed' } } }
  const noPid = { key: 'Q', exportId: 'Q', byMarket: { coupang: { id: 'q', market: 'coupang', status: 'rejected', sellerProductId: null } } }
  eq('[수정 후 재전송]: 쿠팡 반려 + 상품번호 = resend(예전 다시 승인 요청 길) · 그 밖 실패·반려 = send(그 판매처만 체크) · 지난 실패·완료·내 상품 id 없음 = 없음', [
    SL.fixAction(C, C.byMarket.coupang), SL.fixAction(B, B.byMarket['11st']), SL.fixAction(noPid, noPid.byMarket.coupang), SL.fixAction(A, A.history[2]), SL.fixAction(A, A.byMarket.coupang), SL.fixAction(lone, lone.byMarket.smartstore),
  ], ['resend', 'send', 'send', '', '', ''])
  const sl = read('src/components/studio/StudioSendList.vue'), slib = read('src/lib/studioSentList.js')
  const tpl = sl.slice(sl.indexOf('<template>'), sl.lastIndexOf('</template>'))
  eq('화면: 표 칸 = 상품·판매처 현황·최근 전송·펼치기(판매처별 칸 없음) · 칩 = marketChips(PC·폰 같은 값) · 문구 표 없음 · "미등록" 없음 · 칩 색 값 · 상태 카드 = 상태 고르기와 같은 값', [
    (tpl.match(/<th[ >]/g) || []).length - (tpl.match(/<table class="w-full sl-hist"[\s\S]*?<\/thead>/)?.[0].match(/<th[ >]/g) || []).length, /판매처 현황<\/th>/.test(tpl), 'SENT_COLUMNS' in SL, /SENT_COLUMNS/.test(sl),
    /const chipMap = computed\(\(\) => Object\.fromEntries\(paged\.value\.items\.map\(p => \[p\.key, marketChips\(p\)\]\)\)\)/.test(sl), (tpl.match(/v-for="c in chipMap\[p\.key\]\.chips"/g) || []).length,
    /SEND_STATUS_LABEL|const \w+_LABEL = \{/.test(sl + slib), /미등록/.test(sl), ['#DCFCE7', '#166534', '#FEF3C7', '#92400E', '#FEE2E2', '#991B1B'].every(c => sl.includes(c)), /function pickStatusCard\(key\) \{ status\.value = status\.value === key && key !== 'all' \? 'all' : key \}/.test(sl),
  ], [4, true, false, false, true, 2, false, false, true, true])
  eq('문구: 버튼 = "수정 후 재전송"(PC 이력·폰 카드 같은 FIX_LABEL) · 이력 칸 이름 "실패 사유" · 폰 실패 줄 "판매처 이름: 실패 사유" · 스튜디오 화면에 "고쳐서 재전송" 없음 · 상품번호는 이력 표에만', [
    (tpl.match(/: FIX_LABEL \}\}/g) || []).length, /<th>실패 사유<\/th>/.test(tpl), /\{\{ sentMarketName\(s\.market\) \}\}: \{\{ s\.reason \|\| '-' \}\}/.test(tpl), /고쳐서 재전송/.test(sl + slib), (tpl.match(/sellerProductId/g) || []).length,
  ], [2, true, true, false, 1])
  // 판매처 7곳 가짜 데이터 — 판매처 목록(MARKETS)에 있는 곳 중 메이크샵·고도몰은 보낸 적 없음
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const seven = [['coupang', 'approved'], ['smartstore', 'failed'], ['11st', 'registered'], ['gmarket', 'approval_pending'], ['ably', 'rejected'], ['zigzag', 'sending'], ['cafe24', 'registered']]
    .map(([market, status], i) => ({ id: `m${i}`, exportId: 'X', market, status, productName: '7곳 상품', reason: status === 'failed' || status === 'rejected' ? `${market} 사유` : null, createdAt: `2026-10-0${1 + (i % 2)}T00:00:00Z` }))
  const X = SL.groupSentProducts(seven)[0]
  const ch = SL.marketChips(X)
  eq('칩 (a) 순서: 실패·반려 → 승인 대기·전송 중 → 완료, 같은 묶음 안은 판매처 목록 순서 · 문구 = 판매처 이름 + sendStatusLabel · 실패 칩 title = 사유', [
    SL.marketChips(X, { max: 99 }).chips.map(c => c.label), ch.chips.map(c => c.tone), ch.chips[0].title, ch.chips[2].title,
  ], [['스마트스토어 실패', '에이블리 반려', 'G마켓·옥션 승인 대기', '지그재그 전송 중', '쿠팡 승인 완료', '11번가 등록 완료', '카페24 등록 완료'], ['bad', 'bad', 'wait', 'wait'], 'smartstore 사유', SL.UNCHECKED_NOTE])
  eq('칩 (b) 7곳 = 4개 + "+3" · "+3" title = 나머지 판매처와 상태 전부 · 5곳 이하면 다 보이고 "+N" 없음', [
    ch.chips.length, ch.more, SL.marketChips(SL.groupSentProducts(seven.slice(0, 5))[0]).chips.length, SL.marketChips(SL.groupSentProducts(seven.slice(0, 5))[0]).more, SL.CHIP_MAX,
  ], [4, { count: 3, label: '+3', title: '쿠팡 승인 완료\n11번가 등록 완료\n카페24 등록 완료' }, 5, null, 5])
  eq('칩 (c) 보낸 적 없는 판매처 제외(메이크샵·고도몰 없음) · 판매처마다 최근 기록 1건(같은 판매처 두 번 = 칩 하나, 최근 상태)', [
    [...ch.chips.map(c => c.market), ...ch.more.title.split('\n')].some(x => /makeshop|godomall|메이크샵|고도몰/.test(x)), ch.chips.length + ch.more.count,
    SL.marketChips(SL.groupSentProducts([...seven, { id: 'm9', exportId: 'X', market: 'smartstore', status: 'registered', createdAt: '2026-10-02T05:00:00Z' }])[0], { max: 99 }).chips.filter(c => c.market === 'smartstore').map(c => c.label),
  ], [false, 7, ['스마트스토어 등록 완료']])
  const planned = R.MARKETS.filter(m => m.connect === 'planned').map(m => m.key)
  const optsBefore = SL.marketFilterOptions({ admin: false }), optsAdmin = SL.marketFilterOptions({ admin: true })
  R.MARKETS.push({ key: 'kakaostyle', name: '카카오스타일', connect: 'key' }) // 목록에 판매처가 늘었을 때 — 잠깐 넣었다 뺀다
  const optsAdded = SL.marketFilterOptions({ admin: false }).map(m => m.key)
  const addedChip = SL.marketChips(SL.groupSentProducts([{ id: 'k1', exportId: 'K', market: 'kakaostyle', status: 'registered', createdAt: '2026-10-02T00:00:00Z' }])[0]).chips[0].label
  R.MARKETS.pop()
  eq('칩 (d) 판매처 필터 선택지 = 판매처 목록(marketsFor) 순서에서 "예정"(planned) 뺀 것 · 운영 중단(off) 카페24는 관리자에게도 없음 · 목록에 판매처를 더하면 필터·칩에 그대로 나옴', [
    optsBefore.map(m => m.key), optsBefore.map(m => m.name), optsAdmin.map(m => m.key).includes('cafe24'), optsBefore.some(m => planned.includes(m.key)),
    optsBefore.map(m => m.key).join() === R.marketsFor({ admin: false }).filter(m => m.connect !== 'planned').map(m => m.key).join(), optsAdded.at(-1), addedChip, /<option v-for="m in marketOptions"/.test(tpl), /'(coupang|smartstore|11st)'\s*[,\]]/.test(slib),
  ], [['coupang', 'smartstore', '11st', 'zigzag'], ['쿠팡', '스마트스토어', '11번가', '지그재그'], false, false, true, 'kakaostyle', '카카오스타일 등록 완료', true, false])
  eq('화면: 필터·검색·정렬·페이지는 화면 안에서만(localStorage 없음) · 새로고침 = 기존 syncSends만 · 수정 후 재전송 = 기존 창(sendToMarketplace·resendToMarketplace) · [판매처에서 보기] 없음(카페24 전용이었음 — 2026-10-02) · 폰 44px', [
    /localStorage|sessionStorage/.test(sl + slib), /await syncSends\(since\)/.test(sl), /callStudioApi|fetch\(/.test(sl + slib), /fixHow\.value === 'resend' \? await resendToMarketplace\(id\) : await sendToMarketplace\(fixExportId\.value\)/.test(sl),
    /<StudioSendModal [^>]*:market="fixMarket" :sent="fixSent"/.test(tpl), !/s\.adminUrl|판매처에서 보기/.test(tpl), /@media \(max-width: 767\.98px\) \{\s+\.sl-tap \{ height: 44px; min-height: 44px; \}/.test(sl),
  ], [false, true, false, true, true, true, true])
  eq('화면: PC 표(md 이상)·폰 카드(md 미만) · 폰 [필터] 펼치기 · 펼친 줄 = 그 상품의 모든 기록 · 로그아웃 구독', [
    /class="hidden md:block st-card overflow-hidden" data-sl-table/.test(tpl), /class="md:hidden flex flex-col gap-3" data-sl-cards/.test(tpl), /:class="filtersOpen \? 'flex' : 'hidden md:flex'"/.test(tpl), /<tr v-for="s in p\.history"/.test(tpl), /euchs-auth-changed/.test(sl),
  ], [true, true, true, true, true])
}

// ── 판매처 상태 자동 확인 (2026-10-02) — 서버 판매처 공통 sync · 삭제됨 · 100건 한도 없음 · 화면 규칙(개수·10분) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const MS = await import('../api/_marketStatus.js')
  const SL = await import('../src/lib/studioSentList.js')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  // 순수 규칙
  eq('상태 확인 판매처 = 공식 문서로 조회 API를 확인한 곳(쿠팡·스마트스토어·11번가 2026-10-02) · 카페24 없음 · 대상 상태 · 삭제·판매 종료 값', [MS.STATUS_CHECK_MARKETS, MS.CHECK_STATUSES, MS.DELETED, MS.ENDED, MS.CHECK_BATCH, MS.AUTO_CHECK_MS], [['coupang', 'smartstore', '11st', 'zigzag'], ['registered', 'approved', 'approval_pending', 'sending', 'rejected'], 'deleted', 'ended', { coupang: 500, smartstore: 500, '11st': 30, zigzag: 100 }, 600000])
  eq('쿠팡 호출 줄이기: 하나씩 = 승인 대기·전송 중·반려만(30까지) · 승인 완료 = 삭제 목록(100개씩·20쪽까지) · 목록 쿼리 · 응답 읽기 · 계정 판정', [
    MS.COUPANG_SINGLE_MAX, MS.SINGLE_CHECK_STATUSES, MS.COUPANG_PAGE_SIZE, MS.COUPANG_DELETED_PAGES_MAX, MS.coupangDeletedQuery('A00012345'), MS.coupangDeletedQuery('A00012345', 'tok'),
    (p => [[...p.ids], p.next])(MS.coupangListPage({ code: 'SUCCESS', nextToken: '', data: [{ sellerProductId: 11 }, { sellerProductId: 'x' }, { sellerProductId: 12 }] })), MS.coupangListPage({ nextToken: 5, data: [] }).next,
    [MS.accountJudge('A1', 'A1'), MS.accountJudge('A1', 'B2'), MS.accountJudge(null, 'A1'), MS.accountJudge('A1', null), MS.accountJudge(' ', 'A1')], MS.smartstoreAccountOf({ accountId: 'x', accountUid: 'u-1' }), MS.smartstoreAccountOf({ accountId: 'x' }),
  ], [30, ['approval_pending', 'sending', 'rejected'], 100, 20, 'vendorId=A00012345&status=DELETED&maxPerPage=100', 'vendorId=A00012345&status=DELETED&maxPerPage=100&nextToken=tok', [['11', '12'], ''], '5', ['same', 'other', 'unknown', 'unknown', 'unknown'], 'u-1', null])
  eq('스마트스토어 statusType → 기록: DELETE = 삭제됨 · 그 밖 문서 값 = 등록 완료 + 원문 · 모르는 값 = null', [MS.smartstoreStatusOf('DELETE'), MS.smartstoreStatusOf('SALE'), MS.smartstoreStatusOf('SUSPENSION'), MS.smartstoreStatusOf('WEIRD'), MS.smartstoreStatusOf(undefined)],
    [{ status: 'deleted', raw: '삭제' }, { status: 'registered', raw: '판매 중' }, { status: 'registered', raw: '판매 중지' }, null, null])
  eq('목록 조회 본문 = PRODUCT_NO + 원상품번호(안전한 정수만) + size = 개수(최대 500) · 응답 → 번호별 statusType(STOREFARM 먼저)', [
    MS.smartstoreSearchBody(['5001', 'x', '9007199254740993', '5002']),
    [...MS.smartstoreSearchStatuses({ contents: [{ originProductNo: 5001, channelProducts: [{ channelServiceType: 'WINDOW', statusType: 'SUSPENSION' }, { channelServiceType: 'STOREFARM', statusType: 'SALE' }] }, { originProductNo: 5002, channelProducts: [] }] })],
  ], [{ searchKeywordType: 'PRODUCT_NO', originProductNos: [5001, 5002], page: 1, size: 2 }, [['5001', 'SALE']]])
  eq('삭제 판단(404) = 본문 code가 정확히 NOT_FOUND일 때만 · since = ISO만, 앞으로의 시각은 지금', [MS.isSsNotFound(404, '{"code":"NOT_FOUND","message":"데이터 없음"}'), MS.isSsNotFound(404, '{"code":"GW.NOT_FOUND"}'), MS.isSsNotFound(400, '{"code":"NOT_FOUND"}'),
    MS.checkSince('2026-10-02T01:00:00.000Z', Date.parse('2026-10-02T02:00:00Z')), MS.checkSince('2099-01-01T00:00:00Z', Date.parse('2026-10-02T02:00:00Z')), MS.checkSince('어제', Date.parse('2026-10-02T02:00:00Z'))],
    [true, false, false, '2026-10-02T01:00:00.000Z', '2026-10-02T02:00:00.000Z', '2026-10-02T02:00:00.000Z'])
  // 화면 규칙 — 살아 있는 상품 개수·삭제됨·지원 안 하는 판매처 안내
  const T = (id, market, status, at, extra = {}) => ({ id, exportId: 'P', market, status, sellerProductId: `${id.length + 1000}`, productName: '상품', createdAt: at, ...extra })
  const four = SL.groupSentProducts([T('s1', 'smartstore', 'registered', '2026-10-01T01:00:00Z'), T('s2', 'smartstore', 'registered', '2026-10-01T02:00:00Z'), T('s3', 'smartstore', 'registered', '2026-10-01T03:00:00Z'), T('s4', 'smartstore', 'registered', '2026-10-01T04:00:00Z'), T('s0', 'smartstore', 'deleted', '2026-10-01T00:30:00Z'), T('c1', 'coupang', 'approved', '2026-10-01T05:00:00Z')])[0]
  const failLast = SL.groupSentProducts([T('s1', 'smartstore', 'registered', '2026-10-01T01:00:00Z'), T('s2', 'smartstore', 'registered', '2026-10-01T02:00:00Z'), T('s3', 'smartstore', 'failed', '2026-10-01T03:00:00Z')])[0]
  // 2026-10-02 다시 보내기 = 수정 — 판매처마다 칩 1개("N건" 없음). 예전 중복 등록은 칩 title 안내로만. 칩 = 살아 있는 상품(서버가 수정하는 그 상품)이 있으면 그것
  const sm = c => [c.label, c.more, c.title]
  eq('칩: 판매처마다 1개 · "N건" 없음 · 더 있는 살아 있는 상품 수는 title 안내 · 최근 기록이 실패여도 살아 있는 상품이 있으면 그 상품 칩', [
    SL.marketChips(four).chips.map(sm), SL.liveCount(four, 'smartstore'), SL.extraCount(four, 'smartstore'), SL.marketChips(failLast).chips.map(sm), failLast.byMarket.smartstore.id,
  ], [[['쿠팡 승인 완료', 0, ''], ['스마트스토어 등록 완료', 3, '같은 상품이 판매처에 3개 더 있습니다. 판매처에서 정리해 주세요']], 4, 3, [['스마트스토어 등록 완료', 1, '같은 상품이 판매처에 1개 더 있습니다. 판매처에서 정리해 주세요']], 's2'])
  {
    const pend = SL.groupSentProducts([T('c1', 'coupang', 'approval_pending', '2026-10-01T01:00:00Z'), T('c2', 'coupang', 'approved', '2026-10-01T02:00:00Z', { accountMismatch: true })])[0]
    eq('살아 있는 상품 = 등록 완료·승인 완료·승인 대기 · 다른 계정 상품은 세지 않음 · 칩은 지금 계정 상품', [SL.LIVE_STATUSES, SL.liveCount(pend, 'coupang'), pend.byMarket.coupang.id, SL.marketChips(pend).chips[0].more], [['registered', 'approved', 'approval_pending'], 1, 'c1', 0])
    const bx = R.sendsByExport([{ id: 'a', exportId: 'X', market: 'smartstore', status: 'registered', createdAt: '2026-10-01T01:00:00Z' }, { id: 'b', exportId: 'X', market: 'smartstore', status: 'failed', createdAt: '2026-10-01T02:00:00Z' }, { id: 'c', exportId: 'X', market: '11st', status: 'failed', createdAt: '2026-10-01T02:00:00Z' }])
    eq('내 상품 배지·보내기 창 "이미 보냄"(sendsByExport)도 같은 규칙: 살아 있는 상품 먼저, 없으면 최근', bx.X.map(s => [s.market, s.id]), [['smartstore', 'a'], ['11st', 'c']])
  }
  const gone = SL.groupSentProducts([T('d1', 'coupang', 'deleted', '2026-10-01T01:00:00Z', { exportId: 'G' }), T('o1', 'smartstore', 'registered', '2026-10-01T01:00:00Z', { exportId: 'H' }), T('o2', 'coupang', 'deleted', '2026-10-01T02:00:00Z', { exportId: 'H' })])
  eq('삭제됨: 회색(gone) · 칩 순서 완료 뒤 · 상태 카드에서 완료로 안 셈 · 상태 고르기 "판매처에서 삭제됨" · [수정 후 재전송] 없음', [
    SL.chipTone('deleted'), SL.marketChips(gone.find(p => p.key === 'H')).chips.map(c => c.tone), SL.statusCounts(gone), keys2(SL.filterSentProducts(gone, { status: 'deleted' })), SL.STATUS_FILTERS.find(g => g.key === 'deleted').label, SL.fixAction(gone[0], gone[0].history[0]),
  ], ['gone', ['ok', 'gone'], { all: 2, done: 1, pending: 0, failed: 0 }, ['H', 'G'], '판매처에서 삭제됨', ''])
  function keys2(list) { return list.map(p => p.key) }
  const st11 = SL.groupSentProducts([T('e1', '11st', 'registered', '2026-10-01T01:00:00Z'), T('e2', 'smartstore', 'registered', '2026-10-01T01:00:00Z'), T('g1', 'gmarket', 'registered', '2026-10-01T01:00:00Z')])[0]
  eq('상태 자동 확인을 지원하지 않는 판매처 칩 title = 안내 한 줄 (지원하는 판매처 — 11번가 포함 2026-10-02 — 는 없음)', SL.marketChips(st11).chips.map(c => [c.market, c.title]), [['smartstore', ''], ['11st', ''], ['gmarket', '이 판매처는 상태 자동 확인을 지원하지 않습니다']])
  eq('판매 종료(ended): 회색(gone) · 상태 고르기 "판매처에서 판매 종료" · 칩 짧은 표기 "판매 종료"', [SL.chipTone('ended'), SL.STATUS_FILTERS.find(g => g.key === 'ended').label, R.sendStatusLabel('ended', { short: true })], ['gone', '판매처에서 판매 종료', '판매 종료'])
  // 10분 규칙
  const now = Date.parse('2026-10-02T01:30:00Z')
  const S = (market, status, synced, pid = '123') => ({ id: `${market}-${status}-${synced}`, market, status, sellerProductId: pid, lastSyncedAt: synced })
  eq('자동 확인(10분): 확인 대상 중 확인 안 했거나 10분 넘은 기록이 있으면 · 5분 전 확인 = 안 함 · 지원 안 하는 판매처·실패·삭제됨·상품번호 없음은 대상 아님', [
    SL.needsAutoCheck([S('coupang', 'approved', '2026-10-02T01:25:00Z')], now), SL.needsAutoCheck([S('coupang', 'approved', '2026-10-02T01:19:00Z')], now), SL.needsAutoCheck([S('smartstore', 'registered', null)], now),
    SL.needsAutoCheck([S('gmarket', 'registered', null), S('coupang', 'failed', null), S('coupang', 'deleted', null), S('11st', 'ended', null), S('coupang', 'approved', null, null)], now), SL.needsAutoCheck([], now),
    SL.needsAutoCheck([S('11st', 'registered', null)], now),
  ], [false, true, true, false, false, true])
  eq('마지막 확인 = 기록 중 가장 최근 lastSyncedAt · "10/2 10:20"(한국 시각) · 없으면 "-" · 멈출 오류', [
    SL.lastCheckedAt([S('coupang', 'approved', '2026-10-02T01:20:00Z'), S('smartstore', 'registered', '2026-10-02T00:10:00Z'), S('11st', 'registered', null)]), SL.fmtCheckedAt('2026-10-02T01:20:00Z'), SL.fmtCheckedAt(null), SL.lastCheckedAt([]),
    SL.checkShouldStop([{ code: 'market_rejected' }]), SL.checkShouldStop([{ code: 'breaker_open' }]),
  ], ['2026-10-02T01:20:00.000Z', '10/2 10:20', '-', null, false, true])
  // 100건 넘는 데이터 — 상품 400개 · 기록 3,000건에서도 상품·카드 숫자가 빠지지 않음
  const big = Array.from({ length: 3000 }, (_, i) => ({ id: `b${i}`, exportId: `X${i % 400}`, market: ['coupang', 'smartstore', '11st'][i % 3], status: ['registered', 'failed', 'approval_pending', 'approved', 'deleted'][i % 5], productName: `상품 ${i % 400}`, createdAt: new Date(Date.parse('2026-09-01T00:00:00Z') + i * 60000).toISOString() }))
  const bigP = SL.groupSentProducts(big), bigC = SL.statusCounts(bigP)
  eq('100건 넘는 데이터: 기록 3,000건 → 상품 400개 · 이력 합계 3,000 · 카드 숫자 = 거르기 결과 개수 · 페이지 8쪽(50개씩)', [
    bigP.length, bigP.reduce((n, p) => n + p.history.length, 0), [bigC.done, bigC.pending, bigC.failed].map((n, i) => n === SL.filterSentProducts(bigP, { status: ['done', 'pending', 'failed'][i] }).length), SL.pageSlice(bigP, 1, 50).pages,
  ], [400, 3000, [true, true, true], 8])

  // 서버 — 판매처 공통 sync (쿠팡 + 스마트스토어, 조회만) · 삭제됨 · 목록 100건 한도 없음
  const keepSends = db.marketplace_sends, keepAcc = db.marketplace_accounts.slice(), keepStatus = relay.status, keepMode = relay.mode
  relay.mode = 'ok'
  if (!db.marketplace_accounts.some(a => a.user_id === UID && a.market === 'coupang')) await post('connect', CONNECT) // 앞 묶음이 연결을 끊었다 — 출고지·반품지 조회로 키 확인(가짜 중계)
  const coupangOn = db.marketplace_accounts.some(a => a.user_id === UID && a.market === 'coupang')
  // 보낼 때 계정 기록 — 앞 묶음에서 실제로 보낸 기록(쿠팡 = 업체코드 · 스마트스토어 = 계정 정보 조회 accountUid)
  eq('보낼 때 계정 기록: 쿠팡 = vendorId(업체코드) · 스마트스토어 = 계정 정보 조회 accountUid', [
    keepSends.find(r => r.market === 'coupang' && r.seller_product_id)?.market_account, keepSends.find(r => r.market === 'smartstore' && r.status === 'registered')?.market_account,
  ], ['A00012345', 'uid-A'])
  const ssAcc = db.marketplace_accounts.find(a => a.user_id === UID && a.market === 'smartstore')
  if (ssAcc) ssAcc.market_account = null // 저장된 계정값이 없을 때 → 계정 정보 조회 1번 후 저장
  else db.marketplace_accounts.push({ id: newId(), user_id: UID, market: 'smartstore', seller_login_id: '내 스토어 애플리케이션', vendor_id: null, access_key_enc: encryptSecret('ss-app-id-1', K), secret_key_enc: encryptSecret('$2a$10$abcdefghijklmnopqrstuv', K), key_last4: 'id-1', expires_at: null, status: 'connected', market_account: null })
  ssRelay.accountUid = 'uid-A'
  const at = m => new Date(Date.parse('2026-10-01T00:00:00Z') + m * 60000).toISOString()
  const row = (id, market, status, pid, m, extra = {}) => ({ id, user_id: UID, export_id: 'E-SYNC', market, status, seller_product_id: pid, market_status: null, market_account: null, reason: null, last_synced_at: null, created_at: at(m), request_json: {}, ...extra })
  const V = 'A00012345'
  db.marketplace_sends = [
    row('k-c1', 'coupang', 'approved', '1234567890', 1, { market_account: V, request_json: { body: { sellerProductName: '쿠팡 상품' } } }),
    row('k-c2', 'coupang', 'approved', '1234567891', 2, { market_account: 'A00099999' }), // 다른 계정
    row('k-c3', 'coupang', 'approved', '1234567892', 3), // 계정 기록 없음 (예전 기록) — 등록상품 조회 vendorId = 지금 업체코드 → 계정 채우고 판정(상품삭제)
    row('k-c5', 'coupang', 'approved', '1234567893', 3), // 계정 기록 없음 — 조회 "다른 업체" → 채우지 않음·판정 안 함·오류 아님
    row('k-c6', 'coupang', 'approved', '1234567894', 3), // 계정 기록 없음 — 조회 "데이터가 없습니다" → 채우지 않음·판정 안 함(지운 상품인지 다른 계정인지 모름)
    row('k-c4', 'coupang', 'approval_pending', '1234567890', 4, { market_account: V }),
    row('k-s1', 'smartstore', 'registered', '5001', 5, { market_account: 'uid-A', request_json: { body: { originProduct: { name: '스스 상품' } } } }),
    row('k-s2', 'smartstore', 'registered', '5002', 6, { market_account: 'uid-A' }), row('k-s3', 'smartstore', 'registered', '5003', 7, { market_account: 'uid-A' }), row('k-s4', 'smartstore', 'registered', '5004', 8, { market_account: 'uid-A' }),
    row('k-s6', 'smartstore', 'registered', '5006', 9), // 계정 기록 없음 + 목록 조회에 없음 → 채우지 않음·판정 안 함(원상품 조회도 안 함)
    row('k-s7', 'smartstore', 'registered', '5007', 10), // 계정 기록 없음 + 목록 조회(이 스토어 토큰)에 있음 → 이 스토어 상품 → 계정 채우고 판정(DELETE = 삭제됨)
    row('k-s8', 'smartstore', 'registered', '5008', 11, { market_account: 'uid-B' }), // 다른 계정 — 조회하지 않음
    row('k-s5', 'smartstore', 'failed', null, 12), row('k-e1', '11st', 'registered', '7001', 13),
  ]
  relay.status = '승인완료'
  relay.deletedIds = ['1234567890', '1234567892', '999']
  relay.products = { 1234567892: { statusName: '상품삭제' }, 1234567893: { raw: '업체[A00012345]는 다른 업체[A0011***5]의 상품을 조회할 수 없습니다.' }, 1234567894: { raw: '상품(1234567894)의 데이터가 없습니다.' } }
  relay.listQueries = []
  ssRelay.products = { 5001: 'SALE', 5002: 'SUSPENSION', 5003: 'GONE', 5004: 'DELETE', 5006: 'GONE', 5007: 'DELETE', 5008: 'GONE' }
  ssRelay.searchBodies = []
  relay.calls = []
  const sy = await post('sync', { since: new Date().toISOString() })
  const byId = Object.fromEntries(db.marketplace_sends.map(r => [r.id, r]))
  const IDS = ['k-c1', 'k-c2', 'k-c3', 'k-c5', 'k-c6', 'k-c4', 'k-s1', 'k-s2', 'k-s3', 'k-s4', 'k-s6', 'k-s7', 'k-s8', 'k-s5', 'k-e1']
  const ssCalls = relay.calls.filter(c => c.path.startsWith('/smartstore/')).map(c => `${c.method} ${c.path.replace('/smartstore', '')}`)
  const cpCalls = relay.calls.filter(c => c.path.startsWith('/coupang/')).map(c => `${c.method} ${c.path.replace('/coupang', '') === C.PATHS.products ? 'list' : 'product'}`)
  eq('sync: 계정 같음 = 삭제 판정(쿠팡 삭제 목록·스마트스토어 404·DELETE) · 계정 다름 = 판정 안 함(상태 그대로) · 계정 기록 없음 = 판매처 응답으로 이 계정 상품임이 확인될 때만 채우고 판정 · 진행 중 쿠팡은 하나씩 · 실패·11번가 그대로', [
    coupangOn, sy.statusCode, sy.body.more, Array.isArray(sy.body.sends), sy.body.errors, IDS.map(id => [byId[id].status, byId[id].market_status]),
  ], [true, 200, false, true, [], [['deleted', '상품삭제'], ['approved', null], ['deleted', '상품삭제'], ['approved', null], ['approved', null], ['approved', '승인완료'],
    ['registered', '판매 중'], ['registered', '판매 중지'], ['deleted', '삭제'], ['deleted', '삭제'], ['registered', null], ['deleted', '삭제'], ['registered', null], ['failed', null], ['registered', null]]])
  eq('계정 채우기: 쿠팡 vendorId 같음 → 채움 · "다른 업체"·"데이터가 없습니다" → 비워 둠 · 스마트스토어 목록 조회에 있음 → 채움 · 없음 → 비워 둠 · 다른 계정 기록은 그대로', ['k-c3', 'k-c5', 'k-c6', 'k-s6', 'k-s7', 'k-s8', 'k-c2'].map(id => byId[id].market_account), [V, null, null, null, 'uid-A', 'uid-B', 'A00099999'])
  eq('sync 호출: 쿠팡 = 진행 중 1개 + 계정 기록 없는 3개만 하나씩 + 삭제 목록 2쪽(vendorId·DELETED·100개씩) · 스마트스토어 = 토큰 + 계정 정보 1번 + 목록 조회 1(다른 계정 번호 뺌) + 같은 계정의 없는 상품만 원상품 조회 · 등록·수정·삭제 호출 없음', [
    cpCalls, relay.listQueries.map(q => Object.fromEntries(new URLSearchParams(q))), ssCalls, ssRelay.searchBodies[0]?.originProductNos, relay.calls.some(c => ['PUT', 'DELETE', 'PATCH'].includes(c.method)),
    db.marketplace_accounts.find(a => a.user_id === UID && a.market === 'smartstore').market_account,
  ], [['GET product', 'GET product', 'GET product', 'GET product', 'GET list', 'GET list'], [{ vendorId: V, status: 'DELETED', maxPerPage: '100' }, { vendorId: V, status: 'DELETED', maxPerPage: '100', nextToken: '2' }],
    ['POST /external/v1/oauth2/token', 'GET /external/v1/seller/account', 'POST /external/v1/products/search', 'GET /external/v2/products/origin-products/5003'], [5001, 5002, 5003, 5004, 5006, 5007], false, 'uid-A'])
  eq('목록: 판매처 원문(marketStatus) · 다른 계정 = accountMismatch(쿠팡·스마트스토어) · 기록 없음은 아님 · 상품명은 판매처별 위치에서 · request_json 없음', [
    sy.body.sends.find(s => s.id === 'k-s1').marketStatus, ['k-c1', 'k-c2', 'k-c3', 'k-s8', 'k-s6'].map(id => sy.body.sends.find(s => s.id === id).accountMismatch),
    sy.body.sends.find(s => s.id === 'k-c1').productName, sy.body.sends.find(s => s.id === 'k-s1').productName, 'request_json' in sy.body.sends[0], 'coupangStatus' in sy.body.sends[0],
  ], ['판매 중', [false, true, false, true, false], '쿠팡 상품', '스스 상품', false, false])
  // 스마트스토어를 다시 연결하면 저장해 둔 계정값을 비운다 (다른 스토어일 수 있다)
  eq('서버: 스마트스토어 (다시) 연결 = 계정값 비움 · 보내기 성공 뒤 계정 기록(실패해도 보내기는 성공)', [/await resetSmartstoreAccountKey\(ctx\)/.test(read('api/marketplace.js')), /await recordSmartstoreAccount\(ctx, sendId, cred\)/.test(read('api/marketplace.js')), (read('api/marketplace.js').match(/await recordSendAccount\(ctx, sendId, cred\.row\.vendor_id\)/g) || []).length], [true, true, 2])
  // DB에 'deleted'가 아직 없으면(SQL 실행 전) 상태는 그대로 · 원문·확인 시각만
  db.marketplace_sends = [row('k-c9', 'coupang', 'approved', '1234567890', 1, { market_account: V })]
  const realFetch3 = globalThis.fetch
  globalThis.fetch = async (url, o = {}) => (new URL(url).pathname === '/rest/v1/marketplace_sends' && o.method === 'PATCH' && JSON.parse(o.body).status === 'deleted'
    ? json({ code: '23514', message: 'new row for relation "marketplace_sends" violates check constraint "marketplace_sends_status_check"' }, 400) : realFetch3(url, o))
  const sy2 = await post('sync', {})
  globalThis.fetch = realFetch3
  eq('SQL 실행 전: deleted 저장이 막히면 상태는 그대로(승인 완료) + 원문 "상품삭제" + 확인 시각 · 오류로 끝나지 않음', [sy2.statusCode, db.marketplace_sends[0].status, db.marketplace_sends[0].market_status, !!db.marketplace_sends[0].last_synced_at], [200, 'approved', '상품삭제', true])
  // 칸 이름 SQL 실행 전 — 목록·상태 확인은 503 "잠시 후 다시"(원인 로그)
  const realFetch5 = globalThis.fetch
  globalThis.fetch = async (url, o = {}) => (new URL(url).pathname === '/rest/v1/marketplace_sends' && (o.method || 'GET') === 'GET' && /market_status/.test(decodeURIComponent(new URL(url).search))
    ? json({ code: '42703', message: 'column marketplace_sends.market_status does not exist' }, 400) : realFetch5(url, o))
  const pre = [await post('sends_list'), await post('sync', {})]
  globalThis.fetch = realFetch5
  eq('칸 이름 SQL 실행 전: 목록·상태 확인 = 503 marketplace_sql_missing', pre.map(r => [r.statusCode, r.body.code]), [[503, 'marketplace_sql_missing'], [503, 'marketplace_sql_missing']])
  // 묶음 나누기 — 한 번에 판매처마다 CHECK_BATCH까지, 남으면 more true + 목록 없음
  MS.CHECK_BATCH.coupang = 1
  relay.status = '승인완료'
  db.marketplace_sends = [row('k-m1', 'coupang', 'approved', '1234567890', 1), row('k-m2', 'coupang', 'approved', '1234567890', 2)]
  const sy3 = await post('sync', {})
  MS.CHECK_BATCH.coupang = 30
  eq('묶음: 쿠팡 대상이 한 번 묶음보다 많으면 more true · 목록은 보내지 않음(끝날 때 한 번)', [sy3.body.more, 'sends' in sy3.body], [true, false])
  // 목록 100건 한도 없음 — 2,500건 = 1,000씩 3번
  db.marketplace_sends = Array.from({ length: 2500 }, (_, i) => row(`L${i}`, 'coupang', 'failed', null, i, { export_id: `E${i % 300}` }))
  let listGets = 0
  const realFetch4 = globalThis.fetch
  globalThis.fetch = async (url, o = {}) => { const u2 = new URL(url); if (u2.pathname === '/rest/v1/marketplace_sends' && (o.method || 'GET') === 'GET' && u2.searchParams.get('offset') != null) listGets++; return realFetch4(url, o) }
  const big2 = await post('sends_list')
  globalThis.fetch = realFetch4
  eq('sends_list: 100건 한도 없음 — 2,500건 전부 · 1,000건씩 3번 · 같은 줄 두 번 없음', [big2.body.sends.length, listGets, new Set(big2.body.sends.map(s => s.id)).size], [2500, 3, 2500])
  db.marketplace_sends = keepSends
  db.marketplace_accounts = keepAcc
  relay.status = keepStatus
  relay.mode = keepMode

  // 화면
  const sl = read('src/components/studio/StudioSendList.vue'), view = read('src/views/studio/StudioChannelSentView.vue')
  const shown = s => s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  const NAMES = /쿠팡|스마트스토어|11번가|카페24|G마켓|옥션|에이블리|지그재그|메이크샵|고도몰/
  eq('화면: 판매처 전용 버튼·안내 없음(보이는 글자에 판매처 이름 없음) · "판매처 상태 마지막 확인" + [지금 확인] · 누르는 동안 "확인 중…" · 판매처 상태 원문 줄', [
    NAMES.test(shown(sl) + shown(view)), /쿠팡 상태 새로고침/.test(sl), /판매처 상태 마지막 확인: \{\{ fmtCheckedAt\(checkedAt\) \}\}/.test(sl), /\{\{ syncing \? '확인 중…' : '지금 확인' \}\}/.test(sl), /판매처 상태: \{\{ s\.marketStatus \}\}/.test(sl),
  ], [false, false, true, true, true])
  // 2026-10-02 자동 확인 실패를 로그로만 남기던 것 → 자동·[지금 확인] 모두 "마지막 확인" 옆 "확인 실패 · [다시 시도]" (실제 그려 보기는 scripts/test-sent-list-check.mjs)
  eq('화면: 탭을 열면 10분 규칙으로 자동 확인(화면당 10분에 한 번까지) · 묶음마다 같은 since · 멈출 오류면 그만 · 끝나면 목록 한 번 · 자동도 오류를 화면에 · 예약 실행 없음', [
    /if \(auto && needsAutoCheck\(sends\.value\) && Date\.now\(\) - autoAt > AUTO_CHECK_MS\)/.test(sl), /const since = new Date\(\)\.toISOString\(\)/.test(sl) && /await syncSends\(since\)/.test(sl), /if \(!r\.more \|\| checkShouldStop\(errs\)\) break/.test(sl),
    /if \(!listed\) await load\(\{ auto: false \}\)/.test(sl), /if \(my === checkSeq\) syncErrors\.value = errs/.test(sl) && !/manual/.test(sl.slice(sl.indexOf('<script setup>'))), /"crons"/.test(read('vercel.json')),
  ], [true, true, true, true, true, false])
  {
    const SL2 = await import('../src/lib/studioSentList.js')
    const NR = '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'
    eq('확인 실패 표시(checkFailInfo): 오류 없으면 null · "확인 실패" · title = "판매처 이름: 문구"(같은 줄 한 번) · 판매처 없으면 문구만 · 모두 준비 문제면 회색(soft) · 하나라도 고객 오류면 soft 아님', [
      SL2.checkFailInfo([]), SL2.checkFailInfo(null),
      SL2.checkFailInfo([{ market: 'coupang', code: 'enc_not_ready', message: NR }, { market: 'coupang', code: 'enc_not_ready', message: NR }, { market: 'smartstore', code: 'enc_not_ready', message: NR }]),
      SL2.checkFailInfo([{ code: 'network_error', message: '네트워크 오류' }]).title,
      SL2.checkFailInfo([{ market: 'coupang', code: 'enc_not_ready', message: NR }, { market: 'smartstore', id: 's1', code: 'bad_key', message: '키 확인' }]).soft,
      [SL2.CHECK_FAIL_LABEL, SL2.CHECK_RETRY_LABEL],
    ], [null, null, { label: '확인 실패', title: `쿠팡: ${NR}\n스마트스토어: ${NR}`, soft: true }, '네트워크 오류', false, ['확인 실패', '다시 시도']])
    eq('화면: "마지막 확인" 옆 한 줄 = checkFail.label · 다시 시도 = runCheck · 판매처 이름·문구는 title만 · 예전 목록 아래 오류 줄 없음', [
      /<span v-if="checkFail && !syncing"[^>]*:title="checkFail\.title" data-sl-check-fail>\{\{ checkFail\.label \}\} ·/.test(sl), /data-sl-check-retry @click="runCheck\(\)">\{\{ CHECK_RETRY_LABEL \}\}/.test(sl), /data-sl-check-error|일부 상품의 상태를 확인하지 못했습니다/.test(sl),
    ], [true, true, false])
    // 카페24 운영 중단 — 보낸 기록은 받는 곳 한 곳(listSends·syncSends)에서 visibleSends로 뺀다 · 상태 확인 대상에도 없음
    const mk = read('src/lib/studioMarketplace.js')
    const mixed = [{ id: 'a', exportId: 'E1', market: 'coupang', status: 'approved' }, { id: 'b', exportId: 'E2', market: 'cafe24', status: 'registered' }, { id: 'c', exportId: 'E1', status: 'approved' }, { id: 'd', exportId: 'E3', market: 'smartstore', status: 'registered' }]
    eq('카페24 숨김(보낸 기록): visibleSends = off 판매처 기록만 뺌(판매처 칸 없는 예전 기록 = 쿠팡 그대로) · 받는 곳 = listSends·syncSends 한 곳 · 상태 확인 판매처에 off 없음 · 상태 카드 숫자에서 빠짐', [
      R.visibleSends(mixed).map(s => s.id), R.visibleSends(null),
      /const withVisibleSends = r => \(Array\.isArray\(r\?\.sends\) \? \{ \.\.\.r, sends: visibleSends\(r\.sends\) \} : r\)/.test(mk), /export const listSends = async \(\) => withVisibleSends\(await call\('sends_list'\)\)/.test(mk), /export const syncSends = async \(since\) => withVisibleSends\(await call\('sync'/.test(mk),
      MS.STATUS_CHECK_MARKETS.filter(m => R.OFF_MARKETS.includes(m)),
      SL2.statusCounts(SL2.groupSentProducts(R.visibleSends(mixed))).all, SL2.statusCounts(SL2.groupSentProducts(mixed)).all,
    ], [['a', 'c', 'd'], [], true, true, true, [], 2, 3])
    eq('카페24 숨김(그 밖): 홈 배지·소개 칩·판매처 필터 선택지(관리자 포함)에 없음 · 연결 화면 카드 = marketVisible 한 곳', [
      (await import('../src/data/homeStudioBrands.js')).HOME_BRANDS.some(b => b.key === 'cafe24'), R.PUBLIC_MARKETS.some(m => m.key === 'cafe24'),
      SL2.marketFilterOptions({ admin: true }).some(m => m.key === 'cafe24'),
      /const showCafe24 = computed\(\(\) => marketVisible\('cafe24', \{ admin: isAdminOrStaff\.value \}\)\)/.test(read('src/views/studio/StudioMarketplaceView.vue')), R.marketVisible('cafe24', { admin: true }),
    ], [false, false, false, true, false])
  }
  eq('SQL 파일: status에 deleted · 미실행 표시 · 새 표·GRANT 없음', (s => [/'registered', 'deleted'\)\)/.test(s), /상태: 미실행/.test(s), /create table|grant /i.test(s.replace(/GRANT·RLS/g, ''))])(read('docs/sql/2026-10-02-marketplace-sends-deleted.sql')), [true, true, false])
  eq('상태 문구 한 곳: deleted = 긴 표기 "판매처에서 삭제됨"(이력 표·필터) / 짧은 표기 "삭제됨"(판매처 이름 칩) · 짧은 표기가 없는 상태는 같음 · 이미 보냄에 안 들어감', [
    R.sendStatusLabel('deleted'), R.sendStatusLabel('deleted', { short: true }), R.sendStatusLabel('registered', { short: true }), ['registered', 'deleted'].map(R.sendStatusLabel), R.ALREADY_SENT_STATUSES.includes('deleted'),
  ], ['판매처에서 삭제됨', '삭제됨', '등록 완료', ['등록 완료', '판매처에서 삭제됨'], false])
  const del = SL.groupSentProducts([{ id: 'x1', exportId: 'Z', market: 'smartstore', status: 'deleted', productName: 'a', createdAt: '2026-10-01T00:00:00Z' }])[0]
  const mis = SL.groupSentProducts([{ id: 'x2', exportId: 'Y', market: 'coupang', status: 'approved', sellerProductId: '123', accountMismatch: true, productName: 'a', createdAt: '2026-10-01T00:00:00Z' }])[0]
  eq('칩: 삭제됨 = "스마트스토어 삭제됨" · 이력 표·필터 = 긴 표기 · 다른 계정 칩 title = 안내 · 다른 계정 기록은 자동 확인 대상 아님', [
    SL.marketChips(del).chips[0].label, SL.STATUS_FILTERS.find(g => g.key === 'deleted').label, SL.marketChips(mis).chips[0].title, SL.isCheckTarget(mis.history[0]), SL.needsAutoCheck(mis.history, Date.now()),
    /sendStatusLabel\(s\.status\)/.test(read('src/components/studio/StudioSendList.vue')),
  ], ['스마트스토어 삭제됨', '판매처에서 삭제됨', '지금 연결된 계정과 다른 계정으로 보낸 상품이라 상태를 확인할 수 없습니다', false, false, true])
}

// ── 23. 다시 보내기 = 판매처에 있는 상품 수정 (2026-10-02) — api/_marketUpdate.js 순수 함수 + 서버(가짜 쿠팡·네이버·11번가, 실제 호출 없음) ──
{
  const U = await import('../api/_marketUpdate.js')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const { default: sharp } = await import('sharp')
  // 1) 순수 함수
  const S = (id, status, pid, account, at) => ({ id, status, sellerProductId: pid, account, createdAt: at })
  const plan = (rows, m, acc) => { const p = U.updatePlan(rows, m, acc); return [p.mode, p.target?.id ?? null, p.candidates.map(c => c.id), p.extra] }
  eq('updatePlan: 살아 있는 상품 없음(실패·삭제됨·반려·전송 중·번호 없음) → 새로 등록', plan([S('a', 'failed', null, 'V', '2026-10-01'), S('b', 'deleted', '1', 'V', '2026-10-02'), S('c', 'rejected', '2', 'V', '2026-10-03'), S('d', 'sending', null, 'V', '2026-10-04'), S('e', 'registered', null, 'V', '2026-10-05')], 'coupang', 'V'), ['create', null, [], 0])
  eq('updatePlan: 살아 있는 상품 = 등록 완료·승인 완료·승인 대기 → 가장 최근 것을 수정 · 나머지 수 = extra · 같은 계정이 먼저 · 다른 계정은 후보에서 뺌',
    plan([S('a', 'approved', '1', 'V', '2026-10-01'), S('b', 'approval_pending', '2', 'V', '2026-10-03'), S('c', 'registered', '3', null, '2026-10-04'), S('d', 'approved', '4', 'OTHER', '2026-10-05')], 'coupang', 'V'), ['modify', 'b', ['b', 'a', 'c'], 2])
  eq('updatePlan: 지금 계정을 모르면(null) 다른 계정 판정 없이 최근순 · 11번가 = modify(2026-10-02) · 목록 밖 판매처 = 새로 등록', [
    plan([S('a', 'registered', '1', 'X', '2026-10-01'), S('b', 'registered', '2', 'Y', '2026-10-02')], 'smartstore', null), plan([S('e', 'registered', '7', null, '2026-10-01')], '11st', null), plan([S('k', 'registered', '9', null, '2026-10-01')], 'gmarket', null),
  ], [['modify', 'b', ['b', 'a'], 1], ['modify', 'e', ['e'], 0], ['create', null, [], 0]])
  eq('쿠팡 주인: vendorId 같음 mine · 다름 other · "다른 업체…조회할 수 없습니다" other · "…의 데이터가 없습니다" none · "등록 또는 수정되고 있습니다" unknown · vendorId 없음 unknown', [
    U.coupangOwnerOf({ ok: true, data: { vendorId: 'A1' } }, 'A1'), U.coupangOwnerOf({ ok: true, data: { vendorId: 'A2' } }, 'A1'),
    U.coupangOwnerOf({ ok: false, raw: '{"code":"ERROR","message":"업체[A00123456]는 다른 업체[A0011***5]의 상품을 조회할 수 없습니다."}' }, 'A1'), U.coupangOwnerOf({ ok: false, raw: '상품(123456789)의 데이터가 없습니다.' }, 'A1'),
    U.coupangOwnerOf({ ok: false, raw: '상품 정보가 등록 또는 수정되고 있습니다. 잠시 후 다시 조회해 주시기 바랍니다.' }, 'A1'), U.coupangOwnerOf({ ok: true, data: {} }, 'A1'),
  ], ['mine', 'other', 'other', 'none', 'unknown', 'unknown'])
  eq('스마트스토어 주인: 조회됨 mine · 404 NOT_FOUND none(지운 것인지 다른 스토어인지 모름) · GW.NOT_FOUND·500 unknown', [
    U.smartstoreOwnerOf({ ok: true, json: { originProduct: {} } }), U.smartstoreOwnerOf({ ok: false, status: 404, raw: '{"code":"NOT_FOUND","message":"데이터 없음"}' }), U.smartstoreOwnerOf({ ok: false, status: 404, raw: '{"code":"GW.NOT_FOUND"}' }), U.smartstoreOwnerOf({ ok: false, status: 500, raw: '' }),
  ], ['mine', 'none', 'unknown', 'unknown'])
  const OURS = [{ itemName: '블랙', sellerProductItemId: 1, vendorItemId: 11, salePrice: 8900, originalPrice: 12000, maximumBuyCount: 40 }, { itemName: '화이트', sellerProductItemId: 2, vendorItemId: 22, salePrice: 9900, originalPrice: 15000, maximumBuyCount: 5 }, { itemName: '레드(새 옵션)', salePrice: 9900, originalPrice: 12000, maximumBuyCount: 5 }]
  const THEIRS = [{ sellerProductItemId: 1, vendorItemId: 11, salePrice: 9900, originalPrice: 12000, maximumBuyCount: 50 }, { sellerProductItemId: 2, vendorItemId: 22, salePrice: 9900, originalPrice: 12000, maximumBuyCount: 5 }]
  const ch = U.coupangPriceStockChanges(OURS, THEIRS)
  eq('쿠팡 가격·재고 변경: 바뀐 칸만 · 옵션 id(vendorItemId) 없는 새 옵션은 빠짐 · 정가를 올리면 정가 먼저(판매가 > 정가 순간 없음)', [ch.map(c => [c.vendorItemId, c.salePrice, c.originalPrice, c.stock]), ch.map(U.coupangChangeOrder)],
    [[[11, 8900, undefined, 40], [22, undefined, 15000, undefined]], [['salePrice', 'stock'], ['originalPrice']]])
  eq('쿠팡 정가 내림 + 판매가 내림 = 판매가 먼저 · 10원 단위 검사', [U.coupangChangeOrder({ salePrice: 5000, originalPrice: 6000, before: { originalPrice: 12000 } }), U.coupangPriceProblem([{ itemName: '블랙', salePrice: 8905 }]), U.coupangPriceProblem([{ itemName: '블랙', salePrice: 8900, stock: 3 }])],
    [['salePrice', 'originalPrice'], '옵션 "블랙"의 판매가는 10원 단위로 입력하세요. (승인 완료된 상품의 가격 변경 규칙)', ''])
  eq('쿠팡 수정 방법: 승인 완료 아님 = 늘 상품 수정 · 승인 완료 + 내용 같음 + 가격·재고만 = 옵션별 API · 바뀐 것 없음 = none · 내용 바뀜 = 상품 수정', [
    U.coupangUpdateWay({ approved: false, sameContent: true, changes: [] }), U.coupangUpdateWay({ approved: true, sameContent: true, changes: [{}] }), U.coupangUpdateWay({ approved: true, sameContent: true, changes: [] }), U.coupangUpdateWay({ approved: true, sameContent: false, changes: [{}] }),
    U.isCoupangApproved('승인완료'), U.isCoupangApproved('부분승인완료'), U.isCoupangApproved('승인대기중'),
  ], ['modify', 'price_stock', 'none', 'modify', true, true, false])
  const KB = { sellerProductName: 'a', saleStartedAt: '2026-10-01T00:00:00', requested: true, items: [{ itemName: '블랙', salePrice: 1, originalPrice: 2, maximumBuyCount: 3, images: [{ vendorPath: 'https://x?t=1' }], contents: [{ c: 'https://x?t=2' }], attributes: [1] }] }
  eq('쿠팡 내용 표식: 가격·재고·옵션 id·이미지 주소(토큰)·판매 시작일은 무시 · 이름·이미지 원본이 바뀌면 다름', [
    U.coupangContentKey(KB, { rep: 'h1' }) === U.coupangContentKey({ ...KB, saleStartedAt: 'x', sellerProductId: 9, items: [{ ...KB.items[0], salePrice: 9, maximumBuyCount: 9, sellerProductItemId: 7, vendorItemId: 8, images: [{ vendorPath: 'https://x?t=9' }] }] }, { rep: 'h1' }),
    U.coupangContentKey(KB, { rep: 'h1' }) === U.coupangContentKey({ ...KB, sellerProductName: 'b' }, { rep: 'h1' }), U.coupangContentKey(KB, { rep: 'h1' }) === U.coupangContentKey(KB, { rep: 'h2' }),
  ], [true, false, false])
  const CUR = {
    originProduct: { statusType: 'OUTOFSTOCK', name: '예전', leafCategoryId: '1', detailContent: 'old', salePrice: 1, stockQuantity: 0, images: { representativeImage: { url: 'old' }, optionalImages: [{ url: 'keep' }] },
      deliveryInfo: { deliveryType: 'DELIVERY', deliveryBundleGroupUsable: true, claimDeliveryInfo: { returnDeliveryCompanyPriorityType: 'PRIMARY', returnDeliveryFee: 1 } },
      detailAttribute: { sellerCodeInfo: { sellerManagementCode: 'KEEP' }, seoInfo: { sellerTags: [{ text: '머그' }] }, optionInfo: { optionSimple: [{ groupName: 'x', name: 'y' }], optionCombinationSortType: 'CREATE', optionCombinations: [{ id: 11, optionName1: '블랙', stockQuantity: 1, price: 0 }, { id: 12, optionName1: '화이트', stockQuantity: 1, price: 0 }] } } },
    smartstoreChannelProduct: { channelProductDisplayStatusType: 'ON', naverShoppingRegistration: true, channelProductName: '채널명' }, windowChannelProduct: { channelNo: 1 },
  }
  const OURSS = { originProduct: { statusType: 'SALE', leafCategoryId: '2', name: '새 이름', detailContent: 'new', images: { representativeImage: { url: 'new' } }, salePrice: 9900, stockQuantity: 15,
    deliveryInfo: { deliveryType: 'DELIVERY', deliveryAttributeType: 'NORMAL', deliveryCompany: 'CJGLS', deliveryFee: { deliveryFeeType: 'FREE' }, claimDeliveryInfo: { returnDeliveryFee: 3000, exchangeDeliveryFee: 6000, shippingAddressId: 1, returnAddressId: 2 } },
    detailAttribute: { afterServiceInfo: { afterServiceTelephoneNumber: '1' }, originAreaInfo: { originAreaCode: '03' }, minorPurchasable: true, productInfoProvidedNotice: { productInfoProvidedNoticeType: 'ETC' },
      optionInfo: { optionCombinationGroupNames: { optionGroupName1: '색상' }, optionCombinations: [{ optionName1: '블랙', stockQuantity: 10, price: 0, usable: true }, { optionName1: '레드', stockQuantity: 5, price: 0, usable: true }], useStockManagement: true } } },
    smartstoreChannelProduct: { naverShoppingRegistration: false, channelProductDisplayStatusType: 'SUSPENSION' } }
  const mg = U.mergeSmartstoreUpdate(CUR, OURSS)
  const mo = mg.body.originProduct
  eq('스마트스토어 병합: 우리 칸만 덮음(이름·카테고리·상세·대표·가격·재고·배송비·고시) · 조회한 칸 유지(추가 이미지·판매자 코드·태그·묶음배송·반품 택배사) · 품절 → SALE', [
    mg.ok, mo.name, mo.leafCategoryId, mo.images, mo.salePrice, mo.stockQuantity, mo.statusType, mo.detailAttribute.sellerCodeInfo, mo.detailAttribute.seoInfo, mo.deliveryInfo.deliveryBundleGroupUsable, mo.deliveryInfo.claimDeliveryInfo,
  ], [true, '새 이름', '2', { representativeImage: { url: 'new' }, optionalImages: [{ url: 'keep' }] }, 9900, 15, 'SALE', { sellerManagementCode: 'KEEP' }, { sellerTags: [{ text: '머그' }] }, true,
    { returnDeliveryCompanyPriorityType: 'PRIMARY', returnDeliveryFee: 3000, exchangeDeliveryFee: 6000, shippingAddressId: 1, returnAddressId: 2 }])
  eq('스마트스토어 병합: 옵션은 옵션값으로 조회한 id와 짝(블랙 = 11 유지) · 새 값(레드)은 id 없이 · 우리가 뺀 값(화이트)은 없음 · 단독형은 뺌(조합형과 함께 못 씀) · 전시 상태·채널 칸은 판매처 값 그대로 · 윈도 채널 유지', [
    mo.detailAttribute.optionInfo.optionCombinations.map(c => [c.id ?? null, c.optionName1]), 'optionSimple' in mo.detailAttribute.optionInfo, mo.detailAttribute.optionInfo.optionCombinationSortType, mg.body.smartstoreChannelProduct, mg.body.windowChannelProduct, mg.display, mg.optionIds,
  ], [[[11, '블랙'], [null, '레드']], false, 'CREATE', { channelProductDisplayStatusType: 'ON', naverShoppingRegistration: true, channelProductName: '채널명' }, { channelNo: 1 }, 'ON', [11, null]])
  eq('스마트스토어 병합: 판매 중지는 그대로 · 우리가 옵션을 안 쓰면 옵션 정보 뺌 · 수정할 수 없는 상태(판매 금지 등) = market_state · 조회 결과가 이상하면 거절', [
    U.mergeSmartstoreUpdate({ ...CUR, originProduct: { ...CUR.originProduct, statusType: 'SUSPENSION' } }, OURSS).body.originProduct.statusType,
    'optionInfo' in U.mergeSmartstoreUpdate(CUR, { ...OURSS, originProduct: { ...OURSS.originProduct, detailAttribute: { ...OURSS.originProduct.detailAttribute, optionInfo: undefined } } }).body.originProduct.detailAttribute,
    U.mergeSmartstoreUpdate({ ...CUR, originProduct: { ...CUR.originProduct, statusType: 'PROHIBITION' } }, OURSS).code, U.mergeSmartstoreUpdate({}, OURSS).ok, CUR.originProduct.name,
  ], ['SUSPENSION', false, 'market_state', false, '예전'])

  // 2) 서버 — 같은 내 상품을 다시 보내면 (이 묶음만 __createOnly를 끈다)
  globalThis.__createOnly = false
  relay.mode = 'ok'; relay.products = {}; relay.itemFail = ''; relay.status = '승인대기중'
  if (!db.marketplace_accounts.some(a => a.user_id === UID && a.market === 'coupang')) await post('connect', CONNECT)
  const tpl = (await post('template_save', { template: { ...T, name: '수정 테스트' } })).body.template
  const UPID = 'dddddddd-1111-4111-8111-111111111111', UEID = 'eeeeeeee-2222-4222-8222-222222222222', UIMG = 'ffffffff-3333-4333-8333-333333333333'
  const ufolder = `${UID}/${UPID}/exports/20261002-100000-up01`
  db.studio_projects.push({ id: UPID, user_id: UID, title: '수정 머그' })
  db.studio_exports.push({ id: UEID, user_id: UID, project_id: UPID, folder: ufolder, title: '수정 머그', format: 'jpg', mode: 'sections', files: [{ key: '01', name: 'u_01.jpg', path: `${ufolder}/01.jpg`, width: 780, height: 900 }] })
  db.studio_images.push({ id: UIMG, user_id: UID, project_id: UPID, original_path: `${UID}/${UPID}/orig/u.png`, width: 800, height: 600, sort_order: 0, included: true, ingest_status: 'done' })
  files.set(`${UID}/${UPID}/orig/u.png`, await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 120, b: 60 } } }).png().toBuffer())
  files.set(`${ufolder}/01.jpg`, await sharp({ create: { width: 780, height: 900, channels: 3, background: { r: 240, g: 240, b: 240 } } }).jpeg().toBuffer())
  const CP = { exportId: UEID, templateId: tpl.id, categoryCode: '56137', categoryName: '머그컵', saleMode: 'domestic', productName: '수정 머그', brand: '', notices: BASE.notices, repImageId: UIMG, fit: 'contain',
    items: [{ name: '블랙', originalPrice: 12000, salePrice: 9900, stock: 50, sku: 'MUG-BK', attributes: { 색상: '블랙' } }] }
  const mine = () => db.marketplace_sends.filter(r => r.export_id === UEID && r.market === 'coupang')
  const cpPaths = () => relay.calls.filter(c => c.path.startsWith('/coupang/')).map(c => `${c.method} ${c.path.replace('/coupang', '').replace('/v2/providers/seller_api/apis/api/v1/marketplace', '')}`).filter(x => !/category-related-metas/.test(x))
  relay.calls = []
  const c1 = await post('send', CP)
  eq('쿠팡 살아 있는 상품 없음 → 상품 생성(POST) · 기록 1개 · 업체코드 기록', [c1.statusCode, c1.body.status, !!c1.body.updated, cpPaths(), mine().length, mine()[0].market_account, !!mine()[0].request_json.contentKey], [200, 'approval_pending', false, ['POST /seller-products'], 1, 'A00012345', true])
  const pre1 = await post('send_prepare', { exportId: UEID })
  eq('보내기 창 재료: existing.coupang = 수정 · 상품번호 · 다른 판매처 없음', [pre1.body.existing.coupang && { ...pre1.body.existing.coupang, sendId: !!pre1.body.existing.coupang.sendId }, Object.keys(pre1.body.existing)], [{ mode: 'modify', sendId: true, sellerProductId: '1234567890', status: 'approval_pending', extra: 0, optionLinks: [], itemNames: ['블랙'] }, ['coupang']])
  // 승인 대기 상품을 다시 보냄 → 상품 수정(PUT) · 옵션 id 유지 · 같은 기록
  relay.products = { 1234567890: { statusName: '승인대기중', items: [{ sellerProductItemId: 777001, vendorItemId: null, itemName: '블랙', externalVendorSku: 'MUG-BK', salePrice: 9900, originalPrice: 12000, maximumBuyCount: 50 }] } }
  relay.calls = []
  const c2 = await post('send', { ...CP, productName: '수정 머그 2' })
  const put2 = relay.calls.find(c => c.method === 'PUT' && c.path.endsWith('/seller-products'))
  eq('쿠팡 승인 대기 상품 다시 보내기 → 등록상품 조회 → 상품 수정(PUT) · 상품 생성 없음 · 새 기록 없음 · "승인 대기" · 회차 1(modify)', [
    c2.statusCode, c2.body.updated, c2.body.way, c2.body.status, cpPaths(), mine().length, mine()[0].request_json.revisions.map(r => [r.n, r.via, r.approval]),
  ], [200, true, 'modify', 'approval_pending', ['GET /seller-products/1234567890', 'PUT /seller-products'], 1, [[1, 'modify', true]]])
  eq('쿠팡 수정 본문: 같은 sellerProductId · 기존 옵션 sellerProductItemId 유지(빠지면 새 옵션) · requested true(다시 승인 요청) · 고친 이름', [put2.body.sellerProductId, put2.body.items.map(i => [i.itemName, i.sellerProductItemId, i.vendorItemId]), put2.body.requested, put2.body.sellerProductName], [1234567890, [['블랙', 777001, null]], true, '수정 머그 2'])
  // 승인 완료 + 가격·재고만 바뀜 → 옵션별 API만 (다시 승인 없음)
  mine()[0].status = 'approved'
  relay.products = { 1234567890: { statusName: '승인완료', items: [{ sellerProductItemId: 777001, vendorItemId: 880001, itemName: '블랙', externalVendorSku: 'MUG-BK', salePrice: 9900, originalPrice: 12000, maximumBuyCount: 50 }] } }
  relay.calls = []
  const c3 = await post('send', { ...CP, productName: '수정 머그 2', items: [{ ...CP.items[0], salePrice: 8900, stock: 40 }] })
  eq('쿠팡 승인 완료 + 가격·재고만 → 옵션별 가격·재고 API(PUT vendor-items) · 상품 수정 안 함 · 상태 "승인 완료" 그대로 · 회차(price_stock, 바꾼 칸)', [
    c3.statusCode, c3.body.way, c3.body.status, cpPaths(), mine()[0].status, mine().at(-1).request_json.revisions.at(-1).via, mine()[0].request_json.revisions.at(-1).changes.map(c => [c.field, c.value]),
  ], [200, 'price_stock', 'approved', ['GET /seller-products/1234567890', 'PUT /vendor-items/880001/prices/8900', 'PUT /vendor-items/880001/quantities/40'], 'approved', 'price_stock', [['salePrice', 8900], ['stock', 40]]])
  relay.products[1234567890].items[0] = { ...relay.products[1234567890].items[0], salePrice: 8900, maximumBuyCount: 40 }
  relay.calls = []
  const c4 = await post('send', { ...CP, productName: '수정 머그 2', items: [{ ...CP.items[0], salePrice: 8900, stock: 40 }] })
  eq('쿠팡 바뀐 것 없음 → 조회만 · 수정·변경 호출 없음 · 회차 안 늘어남', [c4.statusCode, c4.body.way, c4.body.unchanged, cpPaths(), mine()[0].request_json.revisions.length], [200, 'none', true, ['GET /seller-products/1234567890'], 2])
  relay.calls = []
  const c5 = await post('send', { ...CP, productName: '수정 머그 2', items: [{ ...CP.items[0], salePrice: 8905, stock: 40 }] })
  eq('쿠팡 승인 완료 가격 변경이 10원 단위 아님 → 400 · 변경 호출 없음 · 기록 그대로', [c5.statusCode, c5.body.code, cpPaths(), mine()[0].request_json.revisions.length, mine()[0].request_json.body.items[0].salePrice], [400, 'invalid_input', ['GET /seller-products/1234567890'], 2, 8900])
  relay.calls = []
  relay.itemFail = 'prices'
  const c5b = await post('send', { ...CP, productName: '수정 머그 2', items: [{ ...CP.items[0], salePrice: 7900, stock: 40 }] })
  relay.itemFail = ''
  eq('쿠팡 옵션별 가격 변경을 쿠팡이 거절 → 쿠팡 문구 그대로 · 기록(보내려던 본문)은 예전 그대로', [c5b.statusCode, c5b.body.message.includes('가격 변경 비율'), mine()[0].request_json.body.items[0].salePrice, mine()[0].request_json.revisions.length], [502, true, 8900, 2])
  relay.calls = []
  const c6 = await post('send', { ...CP, productName: '이름 바꿈', items: [{ ...CP.items[0], salePrice: 7900, stock: 40 }] })
  const put6 = relay.calls.find(c => c.method === 'PUT' && c.path.endsWith('/seller-products'))
  eq('쿠팡 승인 완료 + 내용 바뀜 → 상품 수정(옵션 id·vendorItemId 유지) + 바뀐 가격은 옵션별 API(상품 수정으로는 안 바뀜 — 문서) · "승인 대기"', [
    c6.body.way, c6.body.status, cpPaths(), put6.body.items.map(i => [i.sellerProductItemId, i.vendorItemId]), mine()[0].status, mine().length,
  ], ['modify', 'approval_pending', ['GET /seller-products/1234567890', 'PUT /seller-products', 'PUT /vendor-items/880001/prices/7900'], [[777001, 880001]], 'approval_pending', 1])
  // 예전 중복 기록 — 가장 최근 것을 수정 · 나머지 수 extra
  const nowIso = Date.parse(mine()[0].created_at)
  db.marketplace_sends.push({ id: newId(), user_id: UID, export_id: UEID, market: 'coupang', status: 'approved', seller_product_id: '1234567800', market_account: 'A00012345', created_at: new Date(nowIso - 86400000).toISOString(), request_json: {} })
  relay.calls = []
  const c7 = await post('send', { ...CP, productName: '이름 바꿈 2' })
  eq('쿠팡 살아 있는 상품 2개(예전 중복) → 가장 최근 것만 수정 · extra 1 · 보내기 창 existing.extra 1', [c7.body.sellerProductId, c7.body.extra, cpPaths().filter(x => x.startsWith('GET')), (await post('send_prepare', { exportId: UEID })).body.existing.coupang.extra], ['1234567890', 1, ['GET /seller-products/1234567890'], 1])
  // 같은 작업의 다른 결과물(2026-10-02 [내 상품] 한 줄 = 작업) — 예전 결과물로 보낸 쿠팡 상품을 새로 등록하지 않고 수정한다 (projectExportIds)
  {
    const UEID2 = newId()
    db.studio_exports.push({ id: UEID2, user_id: UID, project_id: UPID, folder: `${ufolder}-2`, title: '수정 머그', format: 'jpg', mode: 'sections', files: [{ key: '01', name: 'u2_01.jpg', path: `${ufolder}-2/01.jpg`, width: 780, height: 900 }] })
    const before = db.marketplace_sends.filter(r => r.market === 'coupang').length
    const pre = await post('send_prepare', { exportId: UEID2 })
    relay.calls = []
    const c8 = await post('send', { ...CP, exportId: UEID2, productName: '이름 바꿈 3' })
    eq('같은 작업의 새 결과물로 보내기 → 보내기 창 existing = 수정 · 상품 생성(POST) 없음 · 같은 쿠팡 상품 수정 · 새 기록 없음', [
      pre.body.existing.coupang?.mode, c8.statusCode, c8.body.sellerProductId, cpPaths().includes('POST /seller-products'), db.marketplace_sends.filter(r => r.market === 'coupang').length === before,
    ], ['modify', 200, '1234567890', false, true])
    db.studio_exports = db.studio_exports.filter(e => e.id !== UEID2)
  }
  // 계정 기록이 없는 예전 기록 — 판매처 조회로 확인 (같은 계정으로 확인된 기록이 먼저라 예전 중복은 잠시 삭제됨으로)
  const dup = mine().find(r => r.seller_product_id === '1234567800')
  dup.status = 'deleted'
  const top = mine().find(r => r.seller_product_id === '1234567890')
  top.market_account = null
  relay.calls = []
  const c8 = await post('send', { ...CP, productName: '이름 바꿈 3' })
  eq('쿠팡 계정 기록 없는 기록: 조회 vendorId = 지금 업체코드 → 계정 채우고 수정', [c8.body.updated, top.market_account, mine().length], [true, 'A00012345', 2])
  top.market_account = null
  relay.products[1234567890] = { raw: '상품 정보가 등록 또는 수정되고 있습니다. 잠시 후 다시 조회해 주시기 바랍니다.' }
  relay.calls = []
  const c9 = await post('send', { ...CP, productName: '이름 바꿈 4' })
  eq('쿠팡 계정 기록 없는 기록 + 판단 못 함("등록 또는 수정되고 있습니다") → 502 · 새로 등록하지 않음 · 채우지 않음', [c9.statusCode, c9.body.message.includes('등록 또는 수정되고 있습니다'), cpPaths().some(x => x === 'POST /seller-products'), mine().length, top.market_account], [502, true, false, 2, null])
  relay.products[1234567890] = { raw: '업체[A00012345]는 다른 업체[A0011***5]의 상품을 조회할 수 없습니다.' }
  relay.products[1234567800] = { raw: '상품(1234567800)의 데이터가 없습니다.' }
  dup.status = 'approved'
  relay.calls = []
  const c10 = await post('send', { ...CP, productName: '새 계정 머그' })
  eq('쿠팡 후보가 모두 다른 계정·데이터 없음 → 새로 등록(POST) · 예전 기록은 삭제됨으로 바꾸지 않음', [c10.statusCode, !!c10.body.updated, cpPaths().filter(x => !x.startsWith('GET')), mine().length, mine().filter(r => r.status === 'deleted').length], [200, false, ['POST /seller-products'], 3, 0])
  for (const r of mine()) r.status = 'deleted'
  relay.products = {}
  relay.calls = []
  const c11 = await post('send', { ...CP, productName: '다시 등록' })
  eq('쿠팡 삭제됨만 → 새로 등록 · 조회 없음', [!!c11.body.updated, cpPaths()], [false, ['POST /seller-products']])
  for (const r of mine()) r.status = 'deleted'
  db.marketplace_sends.push({ id: newId(), user_id: UID, export_id: UEID, market: 'coupang', status: 'approved', seller_product_id: '1234567811', market_account: 'A00099999', created_at: new Date().toISOString(), request_json: {} })
  relay.calls = []
  const c12 = await post('send', { ...CP, productName: '다른 계정 뒤' })
  eq('쿠팡 다른 계정(업체코드 다름)으로 보낸 상품만 → 지금 계정에 새로 등록 · 그 상품은 조회·수정하지 않음', [!!c12.body.updated, cpPaths()], [false, ['POST /seller-products']])
  // 반려 [수정 후 재전송] 길은 예전 그대로 (16번 묶음) — 수정 실패면 보내려던 본문을 되돌린다
  for (const r of mine()) r.status = 'deleted'

  // 스마트스토어
  if (!db.marketplace_accounts.some(a => a.user_id === UID && a.market === 'smartstore')) db.marketplace_accounts.push({ id: newId(), user_id: UID, market: 'smartstore', seller_login_id: '내 스토어 애플리케이션', vendor_id: null, access_key_enc: encryptSecret('ss-app-id-1', K), secret_key_enc: encryptSecret('$2a$10$abcdefghijklmnopqrstuv', K), key_last4: 'id-1', expires_at: null, status: 'connected' })
  const ssAcc = db.marketplace_accounts.find(a => a.user_id === UID && a.market === 'smartstore')
  ssAcc.market_account = 'uid-A'; ssRelay.accountUid = 'uid-A'; ssRelay.mode = 'ok'; ssRelay.full = {}; ssRelay.puts = []; ssRelay.putChannel = ''
  const SSU = {
    exportId: UEID, productName: '수정 머그', salePrice: 12900, stock: 30, leafCategoryId: '50000999', categoryName: '머그컵', repImageId: UIMG, fit: 'contain',
    delivery: { company: 'CJGLS', feeType: 'FREE', baseFee: null, returnFee: 3000, exchangeFee: 6000, shippingAddressId: 102, returnAddressId: 103 },
    afterService: { phone: '010-1234-5678', guide: '상세페이지 참조' }, origin: { code: '03' }, notice: { itemName: '머그컵', modelName: 'MUG-01', manufacturer: '이유씨' },
    options: { groupNames: ['색상'], rows: [{ values: ['블랙'], addPrice: 0, stock: 10 }, { values: ['화이트'], addPrice: 0, stock: 5 }] },
  }
  const ssMine = () => db.marketplace_sends.filter(r => r.export_id === UEID && r.market === 'smartstore')
  const ssPaths = () => relay.calls.filter(c => c.path.startsWith('/smartstore/')).map(c => `${c.method} ${c.path.replace('/smartstore/external', '')}`)
  relay.calls = []
  const s1 = await post('smartstore_send', SSU)
  eq('스마트스토어 살아 있는 상품 없음 → 상품 등록(POST) · 기록 1개 · 계정 기록', [s1.statusCode, !!s1.body.updated, ssPaths(), ssMine().length, ssMine()[0].market_account], [200, false, ['POST /v1/oauth2/token', 'POST /v1/product-images/upload', 'POST /v2/products'], 1, 'uid-A'])
  const NO = '9007199254740993'
  ssRelay.full[NO] = {
    originProduct: { statusType: 'SALE', name: '수정 머그', leafCategoryId: '50000999', images: { representativeImage: { url: 'https://shop-phinf.pstatic.net/old.jpg' }, optionalImages: [{ url: 'https://shop-phinf.pstatic.net/keep.jpg' }] }, salePrice: 12900, stockQuantity: 15,
      deliveryInfo: { deliveryType: 'DELIVERY', deliveryAttributeType: 'NORMAL', deliveryCompany: 'CJGLS', deliveryBundleGroupUsable: true, claimDeliveryInfo: { returnDeliveryFee: 3000 } },
      detailAttribute: { sellerCodeInfo: { sellerManagementCode: 'KEEP-1' }, optionInfo: { optionCombinationGroupNames: { optionGroupName1: '색상' }, optionCombinations: [{ id: 501, optionName1: '블랙', stockQuantity: 10, price: 0 }, { id: 502, optionName1: '화이트', stockQuantity: 5, price: 0 }] } } },
    smartstoreChannelProduct: { channelProductDisplayStatusType: 'ON', naverShoppingRegistration: false },
  }
  relay.calls = []
  const s2 = await post('smartstore_send', { ...SSU, productName: '수정 머그 새 이름', options: { groupNames: ['색상'], rows: [{ values: ['블랙'], addPrice: 0, stock: 7 }, { values: ['레드'], addPrice: 0, stock: 3 }] } })
  const pb = ssRelay.puts.at(-1)?.body
  eq('스마트스토어 다시 보내기 → 원상품 조회 → 이미지 업로드 → 원상품 수정(PUT) 순서 · 상품 등록(POST) 없음 · 새 기록 없음', [s2.statusCode, s2.body.updated, ssPaths(), ssMine().length, s2.body.sendId === ssMine()[0].id], [200, true, ['POST /v1/oauth2/token', `GET /v2/products/origin-products/${NO}`, 'POST /v1/product-images/upload', `PUT /v2/products/origin-products/${NO}`], 1, true])
  eq('스마트스토어 수정 본문: 조회한 칸 유지(추가 이미지·판매자 코드·묶음배송) · 우리 칸 반영(이름·재고 합계·새 대표 이미지) · 옵션 id 유지(블랙 501) · 새 값(레드) id 없음 · 화이트 뺌 · 전시 상태는 판매처 값(ON)', [
    pb.originProduct.images.optionalImages, pb.originProduct.detailAttribute.sellerCodeInfo, pb.originProduct.deliveryInfo.deliveryBundleGroupUsable, pb.originProduct.name, pb.originProduct.stockQuantity, /shop-phinf\.pstatic\.net\/test\//.test(pb.originProduct.images.representativeImage.url),
    pb.originProduct.detailAttribute.optionInfo.optionCombinations.map(c => [c.id ?? null, c.optionName1, c.stockQuantity]), pb.smartstoreChannelProduct.channelProductDisplayStatusType, s2.body.display,
  ], [[{ url: 'https://shop-phinf.pstatic.net/keep.jpg' }], { sellerManagementCode: 'KEEP-1' }, true, '수정 머그 새 이름', 10, true, [[501, '블랙', 7], [null, '레드', 3]], 'ON', 'ON'])
  eq('스마트스토어 기록: 같은 기록에 회차 이력(modify · 채널상품번호 유지 · 옵션 id) · 목록 상품명·전시 상태 = 새 값', [ssMine()[0].request_json.revisions.map(r => [r.n, r.via, r.channelProductNo, r.optionIds]), ssMine()[0].result_json.channelProductNo, ssMine()[0].request_json.body.originProduct.name, ssMine()[0].request_json.body.smartstoreChannelProduct.channelProductDisplayStatusType, ssMine()[0].status],
    [[[1, 'modify', '12345678901', [501, null]]], '12345678901', '수정 머그 새 이름', 'ON', 'registered'])
  ssRelay.full[NO].originProduct.statusType = 'SUSPENSION'
  await post('smartstore_send', SSU)
  eq('스마트스토어 판매 중지 상품 → 판매 중지 그대로 수정', ssRelay.puts.at(-1).body.originProduct.statusType, 'SUSPENSION')
  ssRelay.full[NO].originProduct.statusType = 'PROHIBITION'
  relay.calls = []
  const s3 = await post('smartstore_send', SSU)
  eq('스마트스토어 수정할 수 없는 상태(판매 금지) → 409 market_state · 상태 이름 안내 · 이미지 업로드·수정·등록 없음', [s3.statusCode, s3.body.code, s3.body.message.includes("'판매 금지'"), ssPaths().filter(x => !/oauth2|origin-products\/\d+$/.test(x) || x.startsWith('PUT'))], [409, 'market_state', true, []])
  ssRelay.full[NO].originProduct.statusType = 'SALE'
  ssRelay.mode = 'put-reject'
  const s4 = await post('smartstore_send', SSU)
  ssRelay.mode = 'ok'
  eq('스마트스토어 수정을 판매처가 거절 → "판매처에서 수정을 거절했습니다: …" · 기록 그대로(회차 안 늘어남·새 기록 없음)', [s4.statusCode, s4.body.message, ssMine().length, ssMine()[0].request_json.revisions.length], [502, '판매처에서 수정을 거절했습니다: 상품명이 너무 깁니다.', 1, 2])
  // 계정 기록 없는 예전 기록 + 판매처에 없음(404) → 새로 등록 (삭제됨으로 바꾸지 않음)
  ssMine()[0].market_account = null
  delete ssRelay.full[NO]
  ssRelay.products = {}
  relay.calls = []
  const s5 = await post('smartstore_send', SSU)
  eq('스마트스토어 계정 기록 없는 기록 + 원상품 조회 404 → 새로 등록 · 예전 기록 상태·계정 그대로', [!!s5.body.updated, ssPaths().includes('POST /v2/products'), ssMine().length, ssMine()[0].status, ssMine()[0].market_account], [false, true, 2, 'registered', null])
  // 계정 기록 없는 기록 + 조회됨(이 스토어 토큰) → 계정 채우고 수정
  for (const r of ssMine()) r.status = 'deleted'
  ssMine()[0].status = 'registered'
  ssRelay.full[NO] = { originProduct: { statusType: 'SALE', name: 'x', images: { representativeImage: { url: 'o' } }, detailAttribute: {}, deliveryInfo: {} }, smartstoreChannelProduct: { channelProductDisplayStatusType: 'SUSPENSION', naverShoppingRegistration: false } }
  const s6 = await post('smartstore_send', SSU)
  eq('스마트스토어 계정 기록 없는 기록 + 조회됨 → 계정 채우고 수정', [s6.body.updated, ssMine()[0].market_account], [true, 'uid-A'])
  for (const r of ssMine()) r.status = 'deleted'
  relay.calls = []
  const s7 = await post('smartstore_send', SSU)
  eq('스마트스토어 삭제됨만 → 새로 등록 · 원상품 조회 없음', [!!s7.body.updated, ssPaths().some(x => x.startsWith('GET /v2/products/origin-products'))], [false, false])

  const dec = buf => new TextDecoder('euc-kr').decode(buf)
  // 11번가 (2026-10-02) — 다시 보내기 = 상품수정 PUT (전체 덮어쓰기 · 등록과 같은 본문 + cuponcheck=S · 판매자 상품코드로 주인 확인)
  const st11Before = relay.calls.length
  const e11Rows = () => db.marketplace_sends.filter(r => r.export_id === UEID && r.market === '11st')
  const e11Paths = () => relay.calls.filter(c => c.path.startsWith('/11st/')).map(c => `${c.method} ${c.path.replace('/11st', '')}`)
  const CODE = UEID.replace(/-/g, '')
  db.marketplace_sends.push({ id: newId(), user_id: UID, export_id: UEID, market: '11st', status: 'registered', seller_product_id: '7001', created_at: new Date().toISOString(), request_json: { summary: { prdNm: '예전 이름', selPrc: 12900 }, files: { rep: 'old/rep.jpg' } } })
  if (!db.marketplace_accounts.some(a => a.user_id === UID && a.market === '11st')) db.marketplace_accounts.push({ id: newId(), user_id: UID, market: '11st', seller_login_id: 'zozo', vendor_id: null, access_key_enc: encryptSecret('11st-key-ABCD1234', K), secret_key_enc: null, key_last4: '1234', expires_at: null, status: 'connected' })
  const E11U = {
    exportId: UEID, productName: '수정 머그', brand: '', categoryId: '1017898', categoryName: '주방용품>컵>머그컵', price: 12900, stock: 30, repImageId: UIMG, fit: 'contain',
    vat: '01', minorOk: true, origin: { kind: '02', code: '1287' }, kc: { '01': 'agent', '02': 'none', '03': 'none', '04': 'none' },
    delivery: { feeType: '01', fee: null, jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000, outAddr: '12', inAddr: '22' },
    asDetail: '상세페이지 참조', rtngExchDetail: '상세페이지 참조', notice: { type: '891045', maker: '이유씨', country: '중국', phone: '010-1234-5678' },
  }
  const pre2 = await post('send_prepare', { exportId: UEID })
  eq('보내기 창 재료: existing["11st"] = modify(상품번호) · 안내 "판매처에 있는 상품을 수정합니다" · 빠짐 목록 없음 · 버튼 "변경사항 전송"', [pre2.body.existing['11st']?.mode, pre2.body.existing['11st']?.sellerProductId, R.existingNote('11st', pre2.body.existing).lines, R.manualEditKeys(['11st'], pre2.body.existing), R.bulkSendLabel(['11st'], [], false, pre2.body.existing)],
    ['modify', '7001', ['판매처에 있는 상품을 수정합니다'], [], '변경사항 전송'])
  relay.calls = []
  st11.puts = []
  const e1 = await post('elevenst_send', E11U)
  const put1 = st11.puts.at(-1)
  const putXml = put1 ? dec(put1.raw) : ''
  eq('11번가 판매자 상품코드 없는 예전 기록 → 조회 없이 상품수정 PUT /rest/prodservices/product/7001 · 등록(POST) 없음 · 새 기록 없음 · updated',
    [e1.statusCode, e1.body.updated, e1.body.productNo, e11Paths(), e11Rows().length], [200, true, '7001', ['PUT /rest/prodservices/product/7001'], 1])
  const tagsOf = x => [...x.matchAll(/<([A-Za-z][\w]*)>/g)].map(m => m[1])
  const regBuilt = E11.buildElevenstProduct({ ...E11U, price: 12900, stock: 30, repUrl: 'https://x/r.jpg', detailUrls: ['https://x/1.jpg'], sellerPrdCd: CODE })
  eq('수정 본문 = 등록 본문과 같은 칸 전부 + cuponcheck=S(기존 즉시할인 유지) · 출고지·반품지 주소코드 포함(12·22) · 판매자 상품코드 = 내 상품 id 32자 · EUC-KR text/xml',
    [tagsOf(putXml).filter(t => t !== 'cuponcheck'), E11.xmlTag(putXml, 'cuponcheck'), E11.xmlTag(putXml, 'addrSeqOut'), E11.xmlTag(putXml, 'addrSeqIn'), E11.xmlTag(putXml, 'sellerPrdCd'), relay.calls.find(c => c.method === 'PUT')?.headers['Content-Type']],
    [tagsOf(regBuilt.xml), 'S', '12', '22', CODE, 'text/xml'])
  eq('등록 본문(새 등록)에는 cuponcheck 없음 · 판매자 상품코드 자리 = 부가세 코드 바로 앞', [E11.xmlTag(regBuilt.xml, 'cuponcheck'), tagsOf(regBuilt.xml)[tagsOf(regBuilt.xml).indexOf('sellerPrdCd') + 1]], [null, 'suplDtyfrPrdClfCd'])
  eq('11번가 수정 기록: 같은 기록에 회차 이력(modify · 코드) · summary 새 값(이름·코드) · 대표 이미지 = 그 기록의 회차 파일(토큰이 이 기록 files.rep를 읽음) · 상태 그대로',
    [e11Rows()[0].request_json.revisions.map(r => [r.n, r.via, r.sellerPrdCd]), e11Rows()[0].request_json.summary.prdNm, e11Rows()[0].request_json.summary.sellerPrdCd, /_rep_r1\.jpg$/.test(e11Rows()[0].request_json.files.rep), e11Rows()[0].status, e11Rows()[0].result_json.step],
    [[[1, 'modify', CODE]], '수정 머그', CODE, true, 'registered', 'update'])
  // 코드가 생긴 뒤 — 조회로 주인 확인 → 판매중(103) = 수정
  st11.byCode = { [CODE]: [{ prdNo: '9999', cd: '103', nm: '판매중' }, { prdNo: '7001', cd: '104', nm: '품절' }] }
  relay.calls = []
  const e2 = await post('elevenst_send', { ...E11U, productName: '두 번째 이름' })
  eq('판매자 상품코드 있는 기록 → 코드 조회(GET) → 우리 상품번호(7001, 품절) 있음 → 수정 PUT · 회차 2', [e2.statusCode, e2.body.updated, e11Paths(), e11Rows()[0].request_json.revisions.length],
    [200, true, [`GET /rest/prodmarketservice/sellerprodcode/${CODE}`, 'PUT /rest/prodservices/product/7001'], 2])
  // 판매처가 수정을 거절 → 문구 그대로 · 기록(요청 본문·대표 이미지 파일) 되돌림
  const beforeReject = JSON.stringify(e11Rows()[0].request_json)
  st11.mode = 'put-reject'
  const e3 = await post('elevenst_send', { ...E11U, price: 99900 })
  st11.mode = 'ok'
  eq('수정 거절 → 502 "판매처에서 수정을 거절했습니다: …"(11번가 문구 그대로) · 기록 되돌림(회차·본문·files 그대로) · 새 기록 없음',
    [e3.statusCode, e3.body.message, JSON.stringify(e11Rows()[0].request_json) === beforeReject, e11Rows().length], [502, '판매처에서 수정을 거절했습니다: 판매가는 최대 50%까지 인상할 수 있습니다.', true, 1])
  // 판매정상종료(106) — 살아 있지 않음 → 새로 등록 · 예전 기록 상태는 보내기에서 바꾸지 않는다(상태 확인이 바꾼다)
  st11.byCode = { [CODE]: [{ prdNo: '7001', cd: '106', nm: '판매정상종료' }] }
  relay.calls = []
  const e4 = await post('elevenst_send', E11U)
  const newRec = e11Rows().find(r => r.seller_product_id === '3456789012')
  eq('조회 결과 106 판매정상종료 → 수정하지 않고 새로 등록(POST) · 새 기록에 같은 판매자 상품코드 · 예전 기록 상태 그대로', [e4.statusCode, !!e4.body.updated, e11Paths(), e11Rows().length, newRec?.request_json.summary.sellerPrdCd, e11Rows()[0].status],
    [200, false, [`GET /rest/prodmarketservice/sellerprodcode/${CODE}`, 'POST /rest/prodservices/product'], 2, CODE, 'registered'])
  for (const r of e11Rows()) r.status = 'deleted'
  relay.calls = []
  const e5 = await post('elevenst_send', E11U)
  eq('11번가 삭제됨만 → 조회 없이 새로 등록', [e5.statusCode, !!e5.body.updated, e11Paths()], [200, false, ['POST /rest/prodservices/product']])
  st11.byCode = {}
  // 11번가 상태 확인 (2026-10-02) — 판매자 상품코드 조회 · 응답 prdNo가 우리 기록과 같을 때만 판정
  {
    const MS2 = await import('../api/_marketStatus.js')
    eq('11번가 상태 매핑: 101·102 승인 대기 · 103 판매중·104 품절·105 전시중지 = 등록 완료(원문 그대로) · 106·108 = 판매 종료(ended) · 모르는 값 null · 원문 없으면 표 이름',
      ['101', '102', '103', '104', '105', '106', '108', '107'].map(c => MS2.elevenstStatusOf(c, c === '104' ? '품절' : '')),
      [{ status: 'approval_pending', raw: '승인대기' }, { status: 'approval_pending', raw: '승인전' }, { status: 'registered', raw: '판매중' }, { status: 'registered', raw: '품절' }, { status: 'registered', raw: '전시중지' }, { status: 'ended', raw: '판매정상종료' }, { status: 'ended', raw: '판매금지' }, null])
    const one = '<?xml version="1.0" encoding="euc-kr"?><ns2:product xmlns:ns2="x"><selStatCd>103</selStatCd><prdNo>11</prdNo><selStatNm>판매중</selStatNm></ns2:product>'
    const many = '<a><b><prdNo>11</prdNo><selStatCd>103</selStatCd><selStatNm>판매중</selStatNm></b><b><prdNo>12</prdNo><selStatCd>106</selStatCd><selStatNm>판매정상종료</selStatNm></b></a>'
    eq('조회 응답 읽기: 상품 하나(칸 순서 무관) · 여럿(prdNo마다 나눔) · 상품 없음 = [] · 상품번호로 우리 기록 찾기', [E11.parseSellerCodeProducts(one), E11.parseSellerCodeProducts(many).map(p => [p.prdNo, p.selStatCd]), E11.parseSellerCodeProducts('<ClientMessage><resultCode>200</resultCode></ClientMessage>'), MS2.elevenstProductOf(E11.parseSellerCodeProducts(many), '12')?.selStatCd, MS2.elevenstProductOf([], '1')],
      [[{ prdNo: '11', selStatCd: '103', selStatNm: '판매중' }], [['11', '103'], ['12', '106']], [], '106', null])
    eq('11번가 주인: 코드 없음 = legacy(확인 없이 수정 시도) · 우리 번호 있음 = mine · 106·108 = none(새로 등록) · 응답에 없음 = none · 조회 실패 = unknown(보내기 멈춤)', [
      U.elevenstOwnerOf({ ok: true, products: [] }, '1', null), U.elevenstOwnerOf({ ok: true, products: [{ prdNo: '1', selStatCd: '105' }] }, '1', CODE), U.elevenstOwnerOf({ ok: true, products: [{ prdNo: '1', selStatCd: '108' }] }, '1', CODE),
      U.elevenstOwnerOf({ ok: true, products: [{ prdNo: '2', selStatCd: '103' }] }, '1', CODE), U.elevenstOwnerOf({ ok: false }, '1', CODE),
    ], ['legacy', 'mine', 'none', 'none', 'unknown'])
    eq('판매자 상품코드 = 내 상품 id 하이픈 뺀 32자 · 이상한 값은 null · 등록 본문이 이상한 코드를 거절', [E11.elevenstSellerCode(UEID), E11.elevenstSellerCode('x'), E11.buildElevenstProduct({ ...E11U, repUrl: 'u', detailUrls: ['u'], sellerPrdCd: 'bad code' }).message], [CODE, null, '판매자 상품코드가 올바르지 않습니다.'])

    const keep = db.marketplace_sends
    const CODE2 = 'ab'.repeat(16)
    const r11 = (id, pid, status, code) => ({ id, user_id: UID, export_id: UEID, market: '11st', status, seller_product_id: pid, market_status: null, market_account: null, reason: null, last_synced_at: null, created_at: new Date().toISOString(), request_json: code ? { summary: { prdNm: '머그', sellerPrdCd: code } } : { summary: { prdNm: '예전' } } })
    db.marketplace_sends = [r11('t1', '7001', 'registered', CODE), r11('t2', '7002', 'registered', CODE), r11('t3', '7005', 'registered', null), r11('t4', '7003', 'registered', CODE), r11('t5', '7004', 'approval_pending', CODE2)]
    st11.byCode = { [CODE]: [{ prdNo: '7001', cd: '106', nm: '판매정상종료' }, { prdNo: '7002', cd: '105', nm: '전시중지' }], [CODE2]: [{ prdNo: '7004', cd: '103', nm: '판매중' }] }
    relay.calls = []
    const sy = await post('sync', {})
    const by = Object.fromEntries(db.marketplace_sends.map(r => [r.id, r]))
    eq('sync 11번가: 106 → 판매 종료(ended, 원문) · 105 → 등록 완료 + 원문 "전시중지" · 코드 없는 예전 기록 = 판정 안 함 · 응답에 없는 상품 = 판정 안 함 · 승인 대기 → 103 등록 완료 · 모두 확인 시각',
      [sy.statusCode, sy.body.errors, ['t1', 't2', 't3', 't4', 't5'].map(id => [by[id].status, by[id].market_status, !!by[id].last_synced_at])],
      [200, [], [['ended', '판매정상종료', true], ['registered', '전시중지', true], ['registered', null, true], ['registered', null, true], ['registered', '판매중', true]]])
    eq('sync 11번가 호출 = 서로 다른 코드마다 GET 1번 · 수정·삭제 호출 없음', [e11Paths().sort(), relay.calls.some(c => c.path.startsWith('/11st/') && c.method !== 'GET')], [[`GET /rest/prodmarketservice/sellerprodcode/${CODE}`, `GET /rest/prodmarketservice/sellerprodcode/${CODE2}`].sort(), false])
    eq('보낸 상품 목록: 판매 종료 = 살아 있지 않음(다시 보내면 새로 등록) · 문구 "판매처에서 판매 종료"', [U.LIVE_SEND_STATUSES.includes('ended'), R.sendStatusLabel('ended'), sy.body.sends.find(s => s.id === 't1').marketStatus], [false, '판매처에서 판매 종료', '판매정상종료'])
    // SQL 실행 전 — ended를 DB check가 거절하면 상태는 그대로 + 원문·확인 시각만
    db.marketplace_sends = [r11('t9', '7001', 'registered', CODE)]
    const realFetch6 = globalThis.fetch
    globalThis.fetch = async (url, o = {}) => (new URL(url).pathname === '/rest/v1/marketplace_sends' && o.method === 'PATCH' && JSON.parse(o.body).status === 'ended'
      ? json({ code: '23514', message: 'new row for relation "marketplace_sends" violates check constraint "marketplace_sends_status_check"' }, 400) : realFetch6(url, o))
    const sy2 = await post('sync', {})
    globalThis.fetch = realFetch6
    eq('SQL 실행 전: ended 저장이 막히면 상태 그대로(등록 완료) + 원문 "판매정상종료" + 확인 시각 · 오류로 끝나지 않음', [sy2.statusCode, db.marketplace_sends[0].status, db.marketplace_sends[0].market_status, !!db.marketplace_sends[0].last_synced_at], [200, 'registered', '판매정상종료', true])
    db.marketplace_sends = keep
    st11.byCode = {}
  }
  void st11Before

  // ── 지그재그(카카오스타일) (2026-10-02) — 가짜 GraphQL 서버 · 서명·x-solution·주소 · 연결 오류 문구 · 생성 → 갱신 → 재고만 → 바뀐 것 없음 · 상태 확인 ──
  {
    const Z = await import('../api/_zigzag.js')
    const ZF = await import('../api/_zigzagFields.js')
    const schema = read('docs/vendor/zigzag-openapi.graphql')
    // 스키마 input 칸: { 이름: { type, required, deprecated } } — 필수 = "!"로 끝나는 타입(FAQ)
    const inputFields = name => {
      const m = new RegExp(`\\ninput ${name} \\{([\\s\\S]*?)\\n\\}`).exec(schema)
      if (!m) throw new Error(`스키마에 input ${name} 없음`)
      const out = {}
      for (const line of m[1].split('\n')) {
        const f = /^\s{2}(\w+)(?:\([^)]*\))?:\s*([^@\s][^@]*?)\s*(@deprecated.*)?$/.exec(line)
        if (f) out[f[1]] = { type: f[2].trim(), required: f[2].trim().endsWith('!'), deprecated: !!f[3] }
      }
      return out
    }
    const reqOf = name => Object.entries(inputFields(name)).filter(([, v]) => v.required && !v.deprecated).map(([k]) => k).sort()
    // 보낸 입력의 모든 칸이 스키마에 있는지(지어낸 칸 없음) + 필수 칸이 다 있는지 — 중첩 input까지
    const NESTED = { CreateProductInput: { essentials: 'ProductEssentialInput', option_list: 'ProductOptionInput', item_list: 'ItemInput', image_list: 'ProductImageInput', category: 'ProductCategoryInput', site_list: 'ProductSiteInput', address: 'CatalogProductAddressInput', trait_list: 'ProductTraitInput' },
      UpdateProductInput: { essentials: 'ProductEssentialInput', option_list: 'ProductOptionInput', item_list: 'ItemInput', image_list: 'ProductImageInput', category: 'ProductCategoryInput', site_list: 'ProductSiteInput', address: 'CatalogProductAddressInput', trait_list: 'ProductTraitInput' },
      ProductOptionInput: { value_list: 'ProductOptionValueInput' }, ItemInput: { attribute_list: 'ItemAttributeInput', inventory: 'ItemInventoryInput', site_list: 'ItemSiteInput' },
      ProductSiteInput: { shipping_fee: 'CatalogProductShippingFeeInput' }, CatalogProductShippingFeeInput: { area_fee: 'CatalogProductShippingAreaFeeInput', return_fee: 'CatalogProductShippingReturnFeeInput' } }
    const schemaProblems = (obj, type, path = type) => {
      const fields = inputFields(type), out = []
      for (const k of Object.keys(obj)) if (!fields[k]) out.push(`${path}.${k} 스키마에 없음`); else if (fields[k].deprecated) out.push(`${path}.${k} deprecated`)
      for (const k of reqOf(type)) if (obj[k] == null) out.push(`${path}.${k} 필수 없음`)
      for (const [k, sub] of Object.entries(NESTED[type] || {})) {
        if (obj[k] == null) continue
        for (const [i, v] of (Array.isArray(obj[k]) ? obj[k] : [obj[k]]).entries()) out.push(...schemaProblems(v, sub, `${path}.${k}[${i}]`))
      }
      return out
    }
    eq('스키마: CreateProductInput 필수(!) 칸 = 상품명·설명·고시 코드·판매/노출 상태·옵션·품목·이미지·카테고리·사이트 (FAQ: ! 가 필수)', reqOf('CreateProductInput'),
      ['category', 'description', 'display_status', 'essential_code', 'image_list', 'item_list', 'name', 'option_list', 'sales_status', 'site_list'].sort())

    // 서명 — 문서 예제와 같은 계산(HMAC-SHA1(secret, signedDate + '.' + 공백 정리한 query) hex) · 헤더 모양
    const q = 'query GetShop {\n  shop {   shop_id\n shop_name } }'
    const want = crypto.createHmac('sha1', 'secret-key').update(`1700000000000.${q.replace(/\s+/g, ' ')}`).digest('hex')
    eq('서명: 문서 예제 계산과 같음 · 헤더 = "CEA algorithm=HmacSHA256, access-key=…, signed-date=…, signature=…" · 공백만 다른 query는 같은 서명',
      [Z.zigzagAuthorization('access-key', 'secret-key', q, 1700000000000), Z.zigzagAuthorization('access-key', 'secret-key', 'query GetShop { shop { shop_id shop_name } }', 1700000000000) === Z.zigzagAuthorization('access-key', 'secret-key', q, 1700000000000)],
      [`CEA algorithm=HmacSHA256, access-key=access-key, signed-date=1700000000000, signature=${want}`, true])
    eq('설정: x-solution 없으면 null(부르지 않음) · 주소 기본 = 운영 · KAKAOSTYLE_API_URL이 있으면 그 주소(테스트 서버)', [
      Z.zigzagConfig({}), Z.zigzagConfig({ KAKAOSTYLE_X_SOLUTION: 'euchs' }), Z.zigzagConfig({ KAKAOSTYLE_X_SOLUTION: 'euchs', KAKAOSTYLE_API_URL: 'https://openapi.alpha.zigzag.kr/1/graphql' }).url,
    ], [null, { url: 'https://openapi.zigzag.kr/1/graphql', solution: 'euchs' }, 'https://openapi.alpha.zigzag.kr/1/graphql'])
    eq('연결 오류 문구(판매처 errors.message 기준): 권한 → 상품조회·상품갱신 안내 · 키·서명 → 키 확인 · 입점 → 입점 안내 · 모르는 문구 → 판매처 원문 그대로 · 본문 없는 401 → 키·권한',
      [['GET-PRODUCT permission denied'], ['Invalid signature'], ['access-key not found'], ['shop is not approved'], ['입점 심사중인 스토어입니다'], ['알 수 없는 오류 A1']].map(m => Z.classifyZigzagError(200, m).code).concat([Z.classifyZigzagError(200, ['알 수 없는 오류 A1']).message, Z.classifyZigzagError(401, []).code]),
      ['no_permission', 'bad_key', 'bad_key', 'shop_not_ready', 'shop_not_ready', 'market_rejected', '판매처 응답: 알 수 없는 오류 A1', 'bad_key'])

    // 가짜 지그재그 서버 — 문서 응답 모양(카테고리 asset_list · 고시 템플릿 values.values)
    const zz = { calls: [], mode: 'ok', products: {}, nextId: 100129206, nextSub: 900 }
    const CAT = { id: '1527', name: 'root_category', asset_list: [], children: [{ id: '4195', name: '패션의류', asset_list: [{ key: 'essential_codes', values: { values: ['FASHION', 'ETC'] } }], children: [{ id: '4705', name: '여성 패션의류', asset_list: [], children: [
      { id: '4366', name: '롱코트', asset_list: [{ key: 'applicable_types', values: { values: [{ entry_type: 'CRAWLING_API', fulfillment_type: 'MERCHANT' }, { entry_type: 'DIRECT', fulfillment_type: 'MERCHANT' }] } }], children: [] },
      { id: '4367', name: '직진전용', asset_list: [{ key: 'applicable_types', values: { values: [{ entry_type: 'DIRECT', fulfillment_type: 'ZIGZIN' }] } }], children: [] }] }] }] }
    const TPL = [{ id: '1', code: 'FASHION', name: '패션', values: { values: [{ key: 'material', name: '제품소재', type: 'text' }, { key: 'date_of_production', name: '제조년월', type: 'date' }, { key: 'country_of_manufacturer', name: '제조국', type: 'text', value: '한국' }, { key: 'phone_number', name: '전화번호', type: 'text', enable_shop_info: true }] } }]
    const realFetchZ = globalThis.fetch
    globalThis.fetch = async (url, o = {}) => {
      const u = new URL(url)
      if (!/zigzag\.kr$/.test(u.host)) return realFetchZ(url, o)
      const b = JSON.parse(o.body)
      zz.calls.push({ url: String(url), headers: o.headers, body: b })
      const err = m => json({ errors: [{ message: m }], data: null })
      if (zz.mode === 'bad_key') return err('Invalid signature')
      if (zz.mode === 'no_perm') return err('UPDATE-PRODUCT permission denied')
      if (zz.mode === 'not_entered') return err('입점이 완료되지 않은 스토어입니다')
      if (zz.mode === 'odd') return err('INTERNAL_X something')
      const qy = b.query
      if (/GetShop/.test(qy)) return json({ data: { shop: { shop_id: '777', shop_name: '이유씨 스토어', allowed_brand_list: [{ brand_id: '322', brand_name: '이유씨' }], site_country_list: [{ site: 'ZIGZAG', site_name: '지그재그', country_code: 'KR', country_name: '한국' }], attribute_list: [] } } })
      if (/GetCategory/.test(qy)) return json({ data: { category: CAT } })
      if (/GetAllEssentialTemplate/.test(qy)) return json({ data: { getAllEssentialTemplate: TPL } })
      if (/shop_shipping_address_list/.test(qy)) return json({ data: { shop_shipping_address_list: { total_count: 2, item_list: [{ id: '12528', shop_id: '777', name: '반품센터', postcode: '1', address: '광주', address_detail: '2층', shipping_company: 'CJ', is_default: false }, { id: '12529', shop_id: '777', name: '본사', postcode: '1', address: '서울', shipping_company: 'CJ', is_default: true }] } } })
      if (/GetProductSummaryList/.test(qy)) return json({ data: { product_summary_list: { item_list: b.variables.input.product_id_list.filter(id => zz.products[id]?.summary).map(id => ({ id, ...zz.products[id].summary })) } } })
      if (/GetProduct\(/.test(qy)) return json({ data: { product: zz.products[b.variables.id]?.full ?? null } })
      const sub = () => String(zz.nextSub++)
      if (/createProduct/.test(qy)) {
        const id = String(zz.nextId++), inp = b.variables.input
        zz.products[id] = { summary: { sales_status: 'ON_SALE', display_status: inp.display_status }, full: {
          id, sales_status: 'ON_SALE', display_status: inp.display_status, category: { id: sub(), category_id: inp.category.category_id },
          option_list: inp.option_list.map(op => ({ id: sub(), name: op.name, value_list: op.value_list.map(v => ({ id: sub(), value: v.value })) })),
          item_list: inp.item_list.map(it => ({ id: sub(), deleted: false, attribute_list: it.attribute_list, inventory: { quantity: it.inventory.quantity } })), image_list: [{ id: sub(), image_type: 'MAIN', origin_url: inp.image_list[0].origin_url }] } }
        return json({ data: { createProduct: id } })
      }
      if (/updateProduct/.test(qy)) return json({ data: { updateProduct: true } })
      if (/updateItemAvailableStockQuantity/.test(qy)) {
        for (const c of b.variables.input) { const it = zz.products[c.product_id]?.full.item_list.find(x => x.id === c.item_id); if (it) it.inventory.quantity = c.quantity }
        return json({ data: { updateItemAvailableStockQuantity: true } })
      }
      return err('no route')
    }
    const zzRows = () => db.marketplace_sends.filter(r => r.export_id === UEID && r.market === 'zigzag')
    const zzOps = () => zz.calls.map(c => (/mutation/.test(c.body.query) ? /createProduct|updateProduct|updateItemAvailableStockQuantity/.exec(c.body.query)[0] : /query (\w+)/.exec(c.body.query)?.[1]))

    // 연결
    const keepSol = process.env.KAKAOSTYLE_X_SOLUTION, keepUrl = process.env.KAKAOSTYLE_API_URL
    delete process.env.KAKAOSTYLE_X_SOLUTION
    delete process.env.KAKAOSTYLE_API_URL
    const zc0 = await post('connect_zigzag', { access_key: 'zz-access-ABCD', secret_key: 'zz-secret-0000' })
    eq('x-solution 환경변수 없음 → 503 "잠시 후 다시" · 지그재그 호출 없음 · 저장 없음', [zc0.statusCode, zc0.body.code, zz.calls.length, db.marketplace_accounts.some(a => a.market === 'zigzag')], [503, 'zigzag_not_ready', 0, false])
    process.env.KAKAOSTYLE_X_SOLUTION = 'euchs'
    const errs = []
    for (const mode of ['bad_key', 'no_perm', 'not_entered', 'odd']) { zz.mode = mode; const r = await post('connect_zigzag', { access_key: 'zz-access-ABCD', secret_key: 'zz-secret-0000' }); errs.push([r.statusCode, r.body.code, r.body.message]) }
    zz.mode = 'ok'
    eq('연결 실패 문구: 키 오류 · 권한 부족(상품조회·상품갱신) · 입점 미완료 · 모르는 응답 = 판매처 원문 · 저장 없음', [errs, db.marketplace_accounts.some(a => a.market === 'zigzag')],
      [[[502, 'bad_key', Z.ZIGZAG_ERRORS.bad_key], [502, 'no_permission', Z.ZIGZAG_ERRORS.no_permission], [502, 'shop_not_ready', Z.ZIGZAG_ERRORS.shop_not_ready], [502, 'market_rejected', '판매처 응답: INTERNAL_X something']], false])
    zz.calls = []
    const zc = await post('connect_zigzag', { access_key: 'zz-access-ABCD', secret_key: 'zz-secret-0000' })
    const acc = db.marketplace_accounts.find(a => a.user_id === UID && a.market === 'zigzag')
    const h = zz.calls[0]?.headers || {}
    const sd = /signed-date=(\d+)/.exec(h.Authorization || '')?.[1]
    eq('연결 성공: 스토어 정보 조회 1번 · 주소 = 운영 기본 · 헤더 x-solution=euchs · 서명 = 문서 계산 · 저장(스토어 ID = 계정 식별값 · 이름 · 끝 4자리 · 키는 암호문) · 화면 값에 키 없음', [
      zc.statusCode, zz.calls.length, zz.calls[0].url, h['x-solution'], h.Authorization === `CEA algorithm=HmacSHA256, access-key=zz-access-ABCD, signed-date=${sd}, signature=${crypto.createHmac('sha1', 'zz-secret-0000').update(`${sd}.${zz.calls[0].body.query}`).digest('hex')}`,
      acc.market_account, acc.seller_login_id, acc.key_last4, /^v1:/.test(acc.access_key_enc) && /^v1:/.test(acc.secret_key_enc), zc.body.zigzag, /zz-secret|zz-access/.test(JSON.stringify(zc.body)), 'solution' in (zz.calls[0].body.variables || {}),
    ], [200, 1, 'https://openapi.zigzag.kr/1/graphql', 'euchs', true, '777', '이유씨 스토어', 'ABCD', true, { connected: true, account: { shop_name: '이유씨 스토어', key_last4: 'ABCD', status: 'connected', last_checked_at: acc.last_checked_at, last_error: null } }, false, false])
    process.env.KAKAOSTYLE_API_URL = 'https://openapi.alpha.zigzag.kr/1/graphql'
    zz.calls = []
    const meta = await post('zigzag_meta')
    process.env.KAKAOSTYLE_API_URL = ''
    eq('보내기 창 재료: 테스트 주소(KAKAOSTYLE_API_URL)로 호출 · 카테고리 최하위 중 등록형 스토어배송(DIRECT·MERCHANT)만 · 고시 코드 물려받음 · 고시 템플릿 · 반송지 · 판매 채널', [
      [...new Set(zz.calls.map(c => c.url))], meta.body.categories, meta.body.templates[0].fields.map(f => [f.key, f.type, f.preset, f.shopInfo]), meta.body.addresses.map(a => a.id), meta.body.shop.zigzagKr, meta.body.shop.brands,
    ], [['https://openapi.alpha.zigzag.kr/1/graphql'], [{ id: '4366', name: '롱코트', wholeName: '패션의류>여성 패션의류>롱코트', essentialCodes: ['FASHION', 'ETC'] }],
      [['material', 'text', null, false], ['date_of_production', 'date', null, false], ['country_of_manufacturer', 'text', '한국', false], ['phone_number', 'text', null, true]], ['12528', '12529'], true, [{ id: '322', name: '이유씨' }]])
    eq('고시 처음 값: 제조국 중국 · 날짜 = 오늘(한국) · 나머지 "상품 상세페이지 참조" (템플릿 기본값 "한국"은 쓰지 않음)', ZF.essentialDefaults(meta.body.templates[0].fields, new Date('2026-10-02T03:00:00Z')),
      { material: '상품 상세페이지 참조', date_of_production: '2026-10-02', country_of_manufacturer: '중국', phone_number: '상품 상세페이지 참조' })

    // 보내기 — 새로 등록
    const FIELDS = meta.body.templates[0].fields.map(f => ({ key: f.key, name: f.name }))
    const ZZU = {
      exportId: UEID, productName: '롱코트 이유씨', price: 59000, listPrice: null, stock: null, categoryId: '4366', categoryName: '패션의류>여성 패션의류>롱코트',
      options: { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'S'], addPrice: 0, stock: 3 }, { values: ['블랙', 'M'], addPrice: 1000, stock: 0 }] },
      essentialCode: 'FASHION', essentialFields: FIELDS, essentials: { material: '폴리', date_of_production: '2026-10-02', country_of_manufacturer: '중국', phone_number: '010-1234-5678' },
      display: 'HIDDEN', repImageId: UIMG, fit: 'contain',
      delivery: { feeType: 'FREE', baseFee: 0, freeOver: null, jejuFee: 3000, isolatedFee: 5000, returnFee: 3000, partialReturnFee: 2500, exchangeFee: 6000, shippingDays: 3, bundle: 'CONSOLIDATED', returnId: '12528' },
      taxType: 'TAX', parallel: 'NOT_PARALLEL_IMPORTED', overseas: false, brandId: null,
    }
    zz.calls = []
    const z1 = await post('zigzag_send', ZZU)
    const cin = zz.calls.find(c => /createProduct/.test(c.body.query))?.body.variables.input
    eq('지그재그 새 등록: 200 registered · 상품 ID · 호출 순서(상품 기록 없음 → createProduct) · 기록 1개(상품번호·계정 = 스토어 ID)', [z1.statusCode, z1.body.status, z1.body.productId, zzOps(), zzRows().length, zzRows()[0].seller_product_id, zzRows()[0].market_account],
      [200, 'registered', '100129206', ['createProduct'], 1, '100129206', '777'])
    eq('생성 입력 = 스키마 칸만(지어낸 칸·deprecated 칸 없음) · 필수(!) 칸 모두 있음 (중첩 input까지)', schemaProblems(cin, 'CreateProductInput'), [])
    eq('생성 입력 값: 옵션 2종 · 품목 = 조합(가격 = 판매가 + 추가금액 · 재고 0 = 품절) · 대표 이미지 MAIN = 공개 창고 주소 · 상세 = 공개 주소 <img> · 무료배송 base_fee 0·부분 반품비 partial · 스토어배송·일반배송 · 반송지 · 관리코드 = 내 상품 id · solution 칸 없음', [
      cin.option_list, cin.item_list.map(it => [it.attribute_list.map(a => a.value).join('/'), it.site_list[0].original_price, it.inventory.quantity, it.sales_status]), /\/market-images\/[0-9a-f]{32}\/rep\.jpg$/.test(cin.image_list[0].origin_url),
      (cin.description.match(/<img src="[^"]*\/market-images\/[0-9a-f]{32}\/\d+\.jpg"/g) || []).length, cin.site_list[0].shipping_fee, [cin.fulfillment_type, cin.shipping_type, cin.shipping_days, cin.address, cin.bundle_type], cin.external_code, 'solution' in cin, cin.site_list[0].original_price,
    ], [[{ name: '색상', value_list: [{ value: '블랙' }] }, { name: '사이즈', value_list: [{ value: 'S' }, { value: 'M' }] }], [['블랙/S', 59000, 3, 'ON_SALE'], ['블랙/M', 60000, 0, 'SOLD_OUT']], true, db.studio_exports.find(e => e.id === UEID).files.length,
      { fee_type: 'FREE', base_fee: 0, area_fee: { jeju: 3000, isolated: 5000 }, return_fee: { total: 3000, partial: 2500 }, exchange_fee: 6000 }, ['MERCHANT', 'GENERAL', 3, { return_id: '12528' }, 'CONSOLIDATED'], UEID, false, 59000])
    // 부분 반품 배송비 (2026-10-02 운영: 무료배송에 partial이 없으면 지그재그가 거절)
    const zzD = d => ZF.buildZigzagProduct({ ...ZZU, delivery: { ...ZZU.delivery, ...d }, repUrl: 'u', detailUrls: ['u'] })
    eq('부분 반품비: 무료·조건부 무료 = 필수(없으면 거절) · 보내면 return_fee.partial · 고정 배송비 = partial 칸 없음(예전 그대로)', [
      zzD({ partialReturnFee: NaN }).ok, zzD({ partialReturnFee: NaN }).message, zzD({ feeType: 'CONDITIONAL_FREE', baseFee: 3000, freeOver: 50000, partialReturnFee: undefined }).ok,
      zzD({ feeType: 'CONDITIONAL_FREE', baseFee: 3000, freeOver: 50000 }).input.site_list[0].shipping_fee.return_fee, zzD({ feeType: 'CHARGED', baseFee: 3000, partialReturnFee: NaN }).input.site_list[0].shipping_fee.return_fee,
      zzD({ partialReturnFee: 0 }).input.site_list[0].shipping_fee.return_fee,
    ], [false, '부분 반품 배송비를 입력하세요.', false, { total: 3000, partial: 2500 }, { total: 3000 }, { total: 3000, partial: 0 }])
    const zzv = read('src/components/studio/StudioSendZigzag.vue')
    eq('부분 반품비 화면: 무료·조건부 무료일 때 반품 배송비 옆 칸 · 기본값 = 반품 배송비(직접 고치기 전까지 따라감) · 빠짐 목록 · 보낼 값', [
      zzv.includes('<label v-if="needsPartialReturn(f.feeType)" class="block"><span class="st-desc-sm block mb-1">부분 반품 배송비'), zzv.indexOf('data-mk-zz-partial-return-fee') > zzv.indexOf('data-mk-zz-return-fee') && zzv.indexOf('data-mk-zz-partial-return-fee') < zzv.indexOf('data-mk-zz-exchange-fee'),
      zzv.includes('watch(() => f.value.returnFee, v => { if (!partialTouched.value) f.value.partialReturnFee = v })'), zzv.includes("out.push('부분 반품 배송비')"), zzv.includes('partialReturnFee: v.partialReturnFee'),
      read('api/marketplace.js').includes('partialReturnFee: num(d.partialReturnFee)'),
    ], [true, true, true, true, true, true])
    eq('auditor: 셀러 로그인 아이디(이메일)를 넘기면 입력에 들어감 · 비면 칸 없음', [ZF.buildZigzagProduct({ ...ZZU, repUrl: 'u', detailUrls: ['u'], auditor: 'seller@test.local' }).input.auditor, 'auditor' in ZF.buildZigzagProduct({ ...ZZU, repUrl: 'u', detailUrls: ['u'], auditor: '' }).input], ['seller@test.local', false])

    // 다시 보내기 — 판매처에 있는 상품 갱신 (id 짝짓기)
    const pre3 = await post('send_prepare', { exportId: UEID })
    eq('보내기 창 재료: existing.zigzag = modify(상품번호) · 안내 "판매처에 있는 상품을 수정합니다" · 버튼 "변경사항 전송"', [pre3.body.existing.zigzag?.mode, pre3.body.existing.zigzag?.sellerProductId, R.existingNote('zigzag', pre3.body.existing).lines, R.bulkSendLabel(['zigzag'], [], false, pre3.body.existing)],
      ['modify', '100129206', ['판매처에 있는 상품을 수정합니다'], '변경사항 전송'])
    const full = zz.products['100129206'].full
    zz.calls = []
    const z2 = await post('zigzag_send', { ...ZZU, productName: '롱코트 새 이름', options: { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'S'], addPrice: 0, stock: 3 }, { values: ['블랙', 'L'], addPrice: 0, stock: 2 }] } })
    const uin = zz.calls.find(c => /updateProduct/.test(c.body.query))?.body.variables.input
    eq('갱신: 상품 조회 → updateProduct · 생성 없음 · 새 기록 없음 · 회차 1', [z2.statusCode, z2.body.updated, z2.body.way, zzOps(), zzRows().length, zzRows()[0].request_json.revisions.length], [200, true, 'modify', ['GetProduct', 'updateProduct'], 1, 1])
    eq('갱신 입력 = 스키마 칸만 · 필수 칸 모두 · 관리코드(external_code) 없음(갱신 입력에 칸 없음)', [schemaProblems(uin, 'UpdateProductInput'), 'external_code' in uin], [[], false])
    eq('갱신 id 짝짓기: 상품 id · 옵션(이름)·옵션 값(값) id · 품목(속성 조합) id — 새 조합(블랙/L)은 id 없음 · 빠진 조합(블랙/M)은 보내지 않음 · 대표 이미지·카테고리 id', [
      uin.id, uin.option_list.map(o => [o.id ?? null, o.name, o.value_list.map(v => [v.id ?? null, v.value])]), uin.item_list.map(it => [it.id ?? null, it.attribute_list.map(a => a.value).join('/')]), uin.image_list[0].id, uin.category,
    ], ['100129206', [[full.option_list[0].id, '색상', [[full.option_list[0].value_list[0].id, '블랙']]], [full.option_list[1].id, '사이즈', [[full.option_list[1].value_list[0].id, 'S'], [null, 'L']]]],
      [[full.item_list[0].id, '블랙/S'], [null, '블랙/L']], full.image_list[0].id, { id: full.category.id, category_id: '4366' }])
    // 판매처 쪽 상품을 우리 갱신 결과로 맞춘다(가짜 서버) — 다음 보내기가 재고만 바뀐 경우를 본다
    full.item_list = [{ id: full.item_list[0].id, deleted: false, attribute_list: [{ name: '색상', value: '블랙' }, { name: '사이즈', value: 'S' }], inventory: { quantity: 3 } }, { id: '999', deleted: false, attribute_list: [{ name: '색상', value: '블랙' }, { name: '사이즈', value: 'L' }], inventory: { quantity: 2 } }]
    zz.calls = []
    const z3 = await post('zigzag_send', { ...ZZU, productName: '롱코트 새 이름', options: { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'S'], addPrice: 0, stock: 7 }, { values: ['블랙', 'L'], addPrice: 0, stock: 2 }] } })
    eq('재고만 바뀜 → updateItemAvailableStockQuantity(바뀐 품목만) · 상품 갱신·이미지 올리기 없음 · 회차 2(way stock)', [z3.body.way, zzOps(), zz.calls.at(-1).body.variables.input, zzRows()[0].request_json.revisions.at(-1).way],
      ['stock', ['GetProduct', 'updateItemAvailableStockQuantity'], [{ product_id: '100129206', item_id: full.item_list[0].id, quantity: 7 }], 'stock'])
    zz.calls = []
    const z4 = await post('zigzag_send', { ...ZZU, productName: '롱코트 새 이름', options: { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'S'], addPrice: 0, stock: 7 }, { values: ['블랙', 'L'], addPrice: 0, stock: 2 }] } })
    eq('바뀐 것 없음 → 조회만 · 수정 호출 없음 · 회차 그대로', [z4.body.way, zzOps(), zzRows()[0].request_json.revisions.length], ['none', ['GetProduct'], 2])
    zz.calls = []
    await post('zigzag_send', { ...ZZU, productName: '롱코트 새 이름', options: { groupNames: ['색상', '사이즈'], rows: [{ values: ['블랙', 'S'], addPrice: 0, stock: 0 }, { values: ['블랙', 'L'], addPrice: 0, stock: 2 }] } })
    eq('재고가 0이 되면(품절로 바뀜) 재고 API가 아니라 상품 갱신(품목 판매 상태 함께)', zzOps(), ['GetProduct', 'updateProduct'])
    // 판매처에서 지운 상품(조회 null) → 새로 등록
    zz.products['100129206'].full = null
    zz.calls = []
    const z5 = await post('zigzag_send', ZZU)
    eq('판매처에 없는 상품(조회 null) → 새로 등록 · 예전 기록 상태 그대로(삭제 판정은 상태 확인이)', [!!z5.body.updated, zzOps(), zzRows().length, zzRows()[0].status], [false, ['GetProduct', 'createProduct'], 2, 'registered'])

    // 상태 확인
    const keepRows = db.marketplace_sends
    const zrow = (id, pid, account) => ({ id, user_id: UID, export_id: UEID, market: 'zigzag', status: 'registered', seller_product_id: pid, market_status: null, market_account: account, reason: null, last_synced_at: null, created_at: new Date().toISOString(), request_json: {} })
    db.marketplace_sends = [zrow('z1', '201', '777'), zrow('z2', '202', '777'), zrow('z3', '203', '777'), zrow('z4', '204', null), zrow('z5', '205', '888')]
    zz.products = { 201: { summary: { sales_status: 'ON_SALE', display_status: 'VISIBLE' } }, 202: { summary: { sales_status: 'CLOSED', display_status: 'HIDDEN' } }, 204: { summary: { sales_status: 'SOLD_OUT', display_status: 'HIDDEN' } } }
    zz.calls = []
    const zs = await post('sync', {})
    const zb = Object.fromEntries(db.marketplace_sends.map(r => [r.id, r]))
    eq('sync 지그재그: 판매중·노출 = 등록 완료 + 원문 · CLOSED = 삭제됨 · 목록에 없음 + 같은 계정 → 상품 조회 null = 삭제됨 · 계정 기록 없음 + 목록에 있음 → 계정 채우고 판정 · 다른 계정 = 조회 안 함',
      [zs.statusCode, zs.body.errors, ['z1', 'z2', 'z3', 'z4', 'z5'].map(id => [zb[id].status, zb[id].market_status, zb[id].market_account]), zz.calls.map(c => [/query (\w+)/.exec(c.body.query)[1], c.body.variables?.input?.product_id_list || c.body.variables?.id])],
      [200, [], [['registered', '판매중 · 노출', '777'], ['deleted', '삭제', '777'], ['deleted', '삭제', '777'], ['registered', '품절 · 숨김', '777'], ['registered', null, '888']], [['GetProductSummaryList', ['201', '202', '203', '204']], ['GetProduct', '203']]])
    eq('상태 매핑 표: 준비중·판매중·품절·판매중단 = 등록 완료 · CLOSED = 삭제됨 · 모르는 값 null', ['PREPARING', 'ON_SALE', 'SOLD_OUT', 'SUSPENDED', 'CLOSED', 'X'].map(s => ZF.zigzagStatusOf(s, 'VISIBLE')),
      [{ status: 'registered', raw: '준비중 · 노출' }, { status: 'registered', raw: '판매중 · 노출' }, { status: 'registered', raw: '품절 · 노출' }, { status: 'registered', raw: '판매중단 · 노출' }, { status: 'deleted', raw: '삭제' }, null])
    db.marketplace_sends = keepRows
    globalThis.fetch = realFetchZ
    if (keepSol == null) delete process.env.KAKAOSTYLE_X_SOLUTION; else process.env.KAKAOSTYLE_X_SOLUTION = keepSol
    if (keepUrl == null) delete process.env.KAKAOSTYLE_API_URL; else process.env.KAKAOSTYLE_API_URL = keepUrl
    // 화면 — 판매처 목록 한 곳으로 연결 카드·보내기 섹션·안내문
    const card = read('src/components/studio/StudioZigzagCard.vue'), G = await import('../src/lib/studioMarketGuides.js')
    eq('연결 안내문 = 해성이 준 글 그대로 · 카드가 안내 상수를 그림 · 버튼 [연결] · 보내기 섹션 등록 · 연결 탭에 카드', [
      G.ZIGZAG_GUIDE_TITLE, G.ZIGZAG_GUIDE_PREP, G.ZIGZAG_GUIDE.length, G.ZIGZAG_GUIDE[3], G.ZIGZAG_GUIDE_NOTES,
      /\{\{ ZIGZAG_GUIDE_TITLE \}\}/.test(card) && /v-for="\(s, i\) in ZIGZAG_GUIDE"/.test(card), /busy === 'connect' \? '확인 중…' : '연결'/.test(card), /zigzag: StudioSendZigzag/.test(read('src/components/studio/StudioSendModal.vue')), /<StudioZigzagCard \/>/.test(read('src/views/studio/StudioMarketplaceView.vue')),
    ], ['지그재그 연결 방법', '준비: 지그재그(카카오스타일)에 입점이 끝난 스토어여야 연결할 수 있습니다.', 5, '발급 창에 나온 Access Key와 Secret Key를 복사해 아래 칸에 붙여 넣습니다. Secret Key는 발급 창을 닫으면 다시 볼 수 없습니다. 반드시 따로 보관해 주세요.',
      ['인증키는 스토어마다 따로 발급됩니다.', '인증키를 다시 발급했다면 이 화면에서 새 키로 다시 연결해 주세요.'], true, true, true, true])
    eq('시크릿: 지그재그 코드에 키 값·주소 하드코딩 없음(주소는 환경변수 기본값 한 곳) · 로그에 키 없음', [/x-solution['"]?\s*:\s*['"]euchs/.test(read('api/_zigzag.js')), (read('api/_zigzag.js').match(/= 'https:\/\/openapi\./g) || []).length, /console\.\w+\([^)]*(accessKey|secretKey|secret_key|access_key)/.test(read('api/marketplace.js'))], [false, 1, false])
  }
  // 3) 화면 배선
  const cpv = read('src/components/studio/StudioSendCoupang.vue'), ssv = read('src/components/studio/StudioSendSmartstore.vue'), api = read('api/marketplace.js')
  eq('화면: 쿠팡 결과 문구(수정·가격·재고만·바뀐 것 없음·옵션별 변경 실패) · 스마트스토어 "판매처에 있는 상품을 수정했습니다." · 합니다체', [
    cpv.includes('판매처에 있는 상품을 수정하고 승인 요청했습니다.'), cpv.includes('판매처에 있는 상품의 가격·재고를 변경했습니다.'), cpv.includes('변경된 내용이 없어 판매처에 전송하지 않았습니다.'), /data-mk-s-price-error/.test(cpv), ssv.includes("'판매처에 있는 상품을 수정했습니다.'"),
  ], [true, true, true, true, true])
  eq('화면: 11번가 결과 문구 "판매처에 있는 상품을 수정했습니다." · 서버에 예전 막기(edit_in_market) 없음', [read('src/components/studio/StudioSendElevenst.vue').includes("'판매처에 있는 상품을 수정했습니다.'"), api.includes('edit_in_market')], [true, false])
  eq('서버: 판매처 3곳 모두 보내기 전에 findUpdateTarget · 판매처 수정 호출은 이 작업의 경로만(원상품 수정·상품 수정·옵션별 변경) · 삭제 API 없음', [
    ['async function send(', 'async function smartstoreSend(', 'async function elevenstSend('].map(f => { const b = api.slice(api.indexOf(f)); return b.indexOf('findUpdateTarget(') > 0 && b.indexOf('findUpdateTarget(') < b.indexOf("status: 'sending'") }),
    /method: 'DELETE', path/.test(api),
  ], [[true, true, true], false])
  globalThis.__createOnly = true
}

// ── 24. 쿠팡 ↔ 공통 정보 (2026-10-02) — src/lib/studioCoupangLink.js 순수 함수 · 서버 기록(request_json.optionLinks)·send_prepare.existing 배선 ──
{
  const L = await import('../src/lib/studioCoupangLink.js')
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const F = await import('../api/_coupangFields.js')
  const ATTRS = [
    { name: '색상', required: true, exposed: true, dataType: 'STRING', unit: '', units: [] },
    { name: '사이즈', required: false, exposed: true, dataType: 'STRING', unit: '', units: [] },
    { name: '수량', required: true, exposed: true, dataType: 'NUMBER', unit: '개', units: ['개', '세트'] },
    { name: '소재', required: false, exposed: false, dataType: 'STRING', unit: '', units: [] },
  ]
  // 옵션별 판매가 = 공통 판매가 + 추가금액 (반올림·임의 숫자 없음)
  const common = { price: 12900, stock: null, opts: { enabled: true, groupNames: ['컬러', '사이즈'], rows: [
    { key: 'a', values: ['블랙', 'M'], originals: ['黑色', 'M'], addPrice: 0, stock: 5, use: true },
    { key: 'b', values: ['블랙', 'L'], originals: ['黑色', 'L'], addPrice: 1000, stock: 0, use: true },
    { key: 'c', values: ['화이트', 'M'], originals: ['白色', 'M'], addPrice: -500, stock: 2, use: true },
    { key: 'd', values: ['화이트', 'L'], originals: ['白色', 'L'], addPrice: 0, stock: 1, use: false },
  ] } }
  const r1 = L.commonCoupangRows(common)
  eq('옵션별 쿠팡 판매가 = 공통 판매가 + 추가금액 · 재고 그대로(0 = 0) · 판매 안 함 줄 빠짐', [r1.groupNames, r1.rows.map(r => [r.key, r.salePrice, r.stock])], [['컬러', '사이즈'], [['a', 12900, 5], ['b', 13900, 0], ['c', 12400, 2]]])
  eq('공통 판매가가 비면 판매가 null(빠짐 목록 "판매가") — 임의 숫자로 채우지 않음 · 추가금액이 비면 그 줄만 null', [
    L.commonCoupangRows({ ...common, price: null }).rows.map(r => r.salePrice), L.commonCoupangRows({ ...common, opts: { ...common.opts, rows: [{ ...common.opts.rows[0], addPrice: '' }] } }).rows[0].salePrice,
    L.commonCoupangRows({ ...common, price: 500, opts: { ...common.opts, rows: [{ ...common.opts.rows[0], addPrice: -500 }] } }).rows[0].salePrice,
  ], [[null, null, null], null, null])
  eq('옵션을 안 쓰면 줄 하나(single) = 공통 판매가·재고 · 옵션을 켰는데 조합 0개면 줄 0개', [L.commonCoupangRows({ price: 9900, stock: 30, opts: { enabled: false, groupNames: [], rows: [] } }), L.commonCoupangRows({ price: 9900, stock: 30, opts: { enabled: true, groupNames: ['색상'], rows: [] } }).rows.length],
    [{ groupNames: [], rows: [{ key: 'single', values: [], originals: [], salePrice: 9900, stock: 30 }] }, 0])
  // 자동 연결
  eq('자동 연결: 같은 이름 그대로 · 같은 뜻(컬러→색상) · 못 맞추면 빈칸', [L.autoLinks(['색상', '사이즈'], ATTRS), L.autoLinks(['컬러', '사이즈'], ATTRS), L.autoLinks(['무늬'], ATTRS)], [{ 색상: '색상', 사이즈: '사이즈' }, { 컬러: '색상', 사이즈: '사이즈' }, { 무늬: '' }])
  eq('연결 우선순위: 화면에서 고른 것 → 지난번 보낸 연결 → 자동 · 카테고리에 없는 이름은 버림 · 한 쿠팡 옵션에 두 종류 안 이음', [
    L.autoLinks(['컬러'], ATTRS, { 컬러: '사이즈' }), L.autoLinks(['컬러'], ATTRS, { 컬러: '사이즈' }, { 컬러: '색상' }), L.autoLinks(['컬러'], ATTRS, { 컬러: '없는옵션' }), L.autoLinks(['컬러', '색깔'], ATTRS), L.autoLinks(['컬러'], [], { 컬러: '색상' }),
  ], [{ 컬러: '사이즈' }, { 컬러: '색상' }, { 컬러: '색상' }, { 컬러: '색상', 색깔: '' }, { 컬러: '색상' }])
  // 필수 누락 · 막기
  eq('연결 빠짐: 연결 안 된 종류 · 같은 쿠팡 옵션 두 번 · 카테고리에 없는 이름 → 보내기 막음', [
    L.linkProblems(['컬러', '사이즈'], { 컬러: '색상', 사이즈: '' }, ATTRS), L.linkProblems(['컬러', '사이즈'], { 컬러: '색상', 사이즈: '색상' }, ATTRS), L.linkProblems(['컬러'], { 컬러: '모양' }, ATTRS), L.linkProblems(['컬러', '사이즈'], { 컬러: '색상', 사이즈: '사이즈' }, ATTRS),
  ], [['쿠팡 옵션 연결: "사이즈"에 맞는 쿠팡 옵션'], ['쿠팡 옵션 연결: 옵션 종류마다 서로 다른 쿠팡 옵션'], ['쿠팡 옵션 연결: "모양"은 이 카테고리의 쿠팡 옵션이 아님'], []])
  const rows = L.linkRows(ATTRS, { 컬러: '색상' }, n => n === '사이즈')
  eq('연결 표: 구매옵션(EXPOSED)만 · 이어짐 / 옵션별로 입력 / 필수인데 빔(빨강) · 단위형 안내', rows.map(r => [r.name, r.required, r.from, r.state, r.hint]), [
    ['색상', true, '컬러', 'linked', ''], ['사이즈', false, '', 'fill', ''], ['수량', true, '', 'empty', '숫자+단위만 입력 (예: 1개 · 단위 개·세트)'],
  ])
  // 단위형
  const Q = ATTRS[2]
  eq('단위형(NUMBER): 숫자 · 숫자+허용 단위만 통과 · 띄어쓰기·다른 단위·글자 막음 · 문자형은 늘 통과', [
    ['1', '1개', '2세트', '1.5개', '1 개', '1팩', '한개', '개1', ''].map(v => L.unitValueOk(v, Q)), L.unitValueOk('아무 값', ATTRS[0]),
  ], [[true, true, true, true, false, false, false, false, true], true])
  // 연결 기록 · 옵션 구성 변경
  eq('연결 기록: 화면·서버 같은 정리(cleanOptionLinks) — 빈 값·같은 from 두 번 빼기 · 50자 · 10개', [
    L.linksPayload({ 컬러: '색상', 사이즈: '', ' 무늬 ': ' 패턴 ' }), F.cleanOptionLinks([{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: '', to: 'x' }, null]), F.cleanOptionLinks(Array.from({ length: 15 }, (_, i) => ({ from: `f${i}`, to: 't' }))).length, F.cleanOptionLinks([{ from: 'x'.repeat(80), to: 'y' }])[0].from.length,
    L.linksFromSaved([{ from: '컬러', to: '색상' }, { from: '', to: 'x' }]),
  ], [[{ from: '컬러', to: '색상' }, { from: '무늬', to: '패턴' }], [{ from: 'a', to: 'b' }], 10, 50, { 컬러: '색상' }])
  eq('옵션 구성 변경: 옵션 이름 묶음이 다르면 true(순서 무관) · 지난 옵션을 모르면 false', [
    L.optionSetChanged(['블랙', '화이트'], ['화이트', '블랙']), L.optionSetChanged(['블랙'], ['블랙', '화이트']), L.optionSetChanged(['블랙 / M'], ['블랙 / L']), L.optionSetChanged([], ['블랙']), L.optionSetChanged(undefined, ['블랙']),
  ], [false, true, true, false, false])
  eq('문구: 확인 문구 = 지시 문구 그대로 · 합니다체', [L.OPTION_CHANGE_NOTE, /요[.!]?$/.test(L.COMMON_ITEMS_NOTE)], ['쿠팡에서는 옵션을 바꾸면 기존 옵션의 리뷰·판매 이력이 이어지지 않을 수 있습니다.', false])
  // 배선
  const cpv = read('src/components/studio/StudioSendCoupang.vue'), api = read('api/marketplace.js')
  eq('배선: 쿠팡 섹션이 common을 받아 commonCoupangRows로 옵션 줄을 만듦 · 연결 빠짐·단위·옵션 구성 확인이 빠짐 목록에 · 보낼 때 optionLinks', [
    /commonCoupangRows\(c\)/.test(cpv), /linkProblems\(/.test(cpv), /unitValueOk\(val, am\)/.test(cpv), /OPTION_CHANGE_MISSING/.test(cpv), /optionLinks: linksPayload\(/.test(cpv),
  ], [true, true, true, true, true])
  eq('배선: 서버가 연결을 request_json.optionLinks에 저장 · send_prepare.existing.coupang에 optionLinks·itemNames', [
    /optionLinks: cleanOptionLinks\(body\.optionLinks\)/.test(api), /out\[m\]\.optionLinks = cleanOptionLinks\(plan\.target\.option_links\)/.test(api), /out\[m\]\.itemNames = /.test(api),
  ], [true, true, true])
}

// ── 25. 판매처별 상세 이미지 장 수 (2026-10-02 운영: 50장 → 스마트스토어·11번가가 서버에서 거절, 빠짐 목록은 비어 있었음) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const DL = await import('../api/_marketDetailLimits.js')
  const SS = await import('../api/_smartstore.js')
  eq('상한: 스마트스토어·11번가 30 (우리 상한) · 쿠팡·지그재그 없음 · 서버 상수 = 같은 파일', [DL.DETAIL_IMAGE_LIMITS, SS.DETAIL_IMAGE_MAX], [{ smartstore: 30, '11st': 30 }, 30])
  eq('넘으면 { max, over } · 30장 이하·상한 없는 판매처 = null', [DL.detailImageOver('smartstore', 50), DL.detailImageOver('11st', 31), DL.detailImageOver('11st', 30), DL.detailImageOver('coupang', 50), DL.detailImageOver('zigzag', 500)],
    [{ max: 30, over: 20 }, { max: 30, over: 1 }, null, null, null])
  eq('빠짐 문구: 몇 장 초과인지 · 서버 문구는 예전 그대로', [DL.detailImageMissing(50, { max: 30, over: 20 }), DL.detailImageServerMessage(30)], ['상세 이미지 30장까지 보낼 수 있어요 (지금 50장 · 20장 초과)', '상세 이미지는 30장까지 보낼 수 있습니다.'])
  const api = read('api/marketplace.js'), sm = read('src/components/studio/StudioSendModal.vue'), bm = read('src/components/studio/StudioBulkSendModal.vue')
  eq('배선: 서버 스마트스토어·11번가 = detailImageOver · 보내기 창 빠짐 목록(판매처 이름 앞에) · 여러 상품 보내기 준비 판정', [
    api.includes('detailImageOver(SMARTSTORE, ex.files.length)'), api.includes('detailImageOver(ELEVENST, ex.files.length)'), api.includes('DETAIL_IMAGE_MAX'),
    sm.includes('detailImageOver(key, count)') && sm.includes('out.push(`${nameOf(key)} · ${detailImageMissing(count, over)}`)'), bm.includes('detailImageOver(m, count)') && bm.includes('list.push(detailImageMissing(count, over))'),
  ], [true, true, false, true, true])
  const B = await import('../src/lib/studioBulkSend.js')
  eq('여러 상품 보내기: 상한을 넘은 판매처는 준비 안 됨 · 이유에 판매처 이름', B.readiness({ smartstore: [DL.detailImageMissing(50, DL.detailImageOver('smartstore', 50))], coupang: [] }, ['coupang', 'smartstore']),
    { ready: false, reasons: ['스마트스토어 · 상세 이미지 30장까지 보낼 수 있어요 (지금 50장 · 20장 초과)'] })
  // 실패 표시 (2026-10-02 운영: 실패한 3곳이 맨 위 판매처 줄에 아무 표시 없음) — 보내기 전 검사 실패는 전송 기록을 만들지 않는다(기존 설계 그대로) → 창에서 보인다
  eq('실패 표시: 맨 위 판매처 줄 = 이번 결과가 실패면 sendStatusLabel(\'failed\') 배지(기록 배지보다 먼저) · 결과 표 = status failed · 여러 상품 보내기 결과 표도 같은 문구', [
    sm.includes(`<span v-if="failedNow(r.key)" :class="SEND_BADGE_CLASS.failed" class="shrink-0" :data-mk-s-market-failed="r.key">{{ sendStatusLabel('failed') }}</span>`), sm.indexOf('failedNow(r.key)') < sm.indexOf('v-else-if="sentMap[r.key]"'),
    sm.includes('const failedNow = key => !!results.value[key] && !results.value[key].ok && !sections[key]?.done'),
    (await import('../src/lib/studioMarketplaceRules.js')).sendResultRows(['smartstore'], { smartstore: { ok: false, reason: '상세 이미지는 30장까지 보낼 수 있습니다.' } })[0].status, bm.includes("sendStatusLabel('failed')"),
  ], [true, true, true, 'failed', true])
  eq('보내기 전 검사 실패는 기록 없음(기존 설계): 스마트스토어·11번가 장 수 검사가 전송 기록(sending) 만들기보다 앞', [
    api.indexOf('detailImageOver(SMARTSTORE') < api.indexOf("market: SMARTSTORE, status: 'sending'"), api.indexOf('detailImageOver(ELEVENST') < api.indexOf("market: ELEVENST, status: 'sending'"),
  ], [true, true])
}

// ── 26. 스마트스토어 옵션값 금지 문자 (2026-10-02 운영: 네이버가 \ * ? " < > / 가 든 옵션값을 "등록불가 특수문자"로 거절) ──
{
  const MO = await import('../api/_marketOptions.js')
  const row = v => ({ values: [v], addPrice: 0, stock: 1 })
  const p = vals => ({ groupNames: ['색상'], rows: vals.map(row) })
  eq('금지 문자 7개 모두 잡음 · 겹치면 한 번 · 문구 = "옵션값에 쓸 수 없는 문자(…)"', [
    MO.smartstoreOptionProblems(p(['블랙*', '화이트*', 'a/b', 'c\\d', '"e"', '<f>', 'g?']), 10000),
  ], [['옵션값에 쓸 수 없는 문자(* / \\ " < > ?)']])
  eq('보통 글자·하이픈·괄호·쉼표는 통과 · 옵션 종류 이름은 검사 안 함(응답에 없음)', [
    MO.smartstoreOptionProblems(p(['블랙-L (95)', 'M,L']), 10000), MO.smartstoreOptionProblems({ groupNames: ['색상/무늬'], rows: [row('블랙')] }, 10000),
  ], [[], []])
  eq('서버도 같은 검사로 거절 (smartstoreOptionInfo)', MO.smartstoreOptionInfo(p(['블랙*']), 10000), { ok: false, message: '옵션값에 쓸 수 없는 문자(*)' })
}

// ── 27. 보내기 창 열기 속도 · 대표 이미지 후보 (2026-10-02 운영: 창 열기 약 20초 · 1688 상세 설명 사진까지 50장) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const R = await import('../src/lib/studioMarketplaceRules.js')
  const imgs = [
    { id: 'd0', kind: 'desc', sortOrder: 0 }, { id: 'g1', kind: 'gallery', sortOrder: 1 }, { id: 'u0', kind: 'upload', sortOrder: 9 }, { id: 'g0', kind: 'gallery', sortOrder: 0, included: false }, { id: 'd1', kind: 'desc', sortOrder: 1 },
  ]
  eq('대표 이미지 후보 = 1688 대표 사진(순서대로) → 내 사진 · 상세 설명 사진 뺌', R.repImageCandidates(imgs).map(x => x.id), ['g0', 'g1', 'u0'])
  eq('처음 고를 대표 이미지 = 후보 중 [사용] 사진 먼저 · 후보가 없으면 null(상세 설명 사진으로 채우지 않음)', [R.defaultRepImageId(imgs), R.defaultRepImageId([{ id: 'd0', kind: 'desc' }]), R.defaultRepImageId(null)], ['g1', null, null])
  const api = read('api/marketplace.js')
  const sp = api.slice(api.indexOf('async function sendPrepare'), api.indexOf('async function categoryPredict'))
  eq('서버: 사진 서명을 동시에(SIGN_POOL) · kind·sortOrder를 응답에 · 원천·기존 상품·지난 값도 동시에', [
    /const SIGN_POOL = \d+/.test(api), sp.includes('runSignPool(') && !/for \(const im of[^\n]*\n[^\n]*await storageSignDownload/.test(sp), sp.includes('kind: im.kind, sortOrder: im.sort_order'),
    sp.includes('await Promise.all([loadSource(ctx, projRows?.[0]?.offer_id), existingP, prevRowsP, loadOrdered(ctx, projRows?.[0]?.offer_id)])'),
  ], [true, true, true, true])
  const secs = ['Common', 'Coupang', 'Smartstore', 'Elevenst', 'Zigzag', 'Cafe24'].map(n => read(`src/components/studio/StudioSend${n}.vue`))
  eq('화면: 대표 이미지 그리드 6곳 = repImages · 처음 값 = defaultRepImageId · 사진은 loading="lazy" · 쿠팡 옵션 사진 고르기는 사진 전부', [
    secs.every(s => s.includes('v-for="im in repImages"') && !/v-for="im in prepare\.images"[^>]*repImageId === im\.id/.test(s)), secs.every(s => !s.includes('prepare?.images?.[0]?.id')),
    secs.every(s => (s.match(/<img /g) || []).length === (s.match(/<img [^>]*loading="lazy"/g) || []).length), secs[1].includes('v-for="im in prepare.images" :key="im.id" type="button" class="aspect-square rounded-[6px]'),
  ], [true, true, true, true])
  const cats = ['Smartstore', 'Elevenst', 'Zigzag'].map(n => read(`src/components/studio/StudioSend${n}.vue`))
  eq('카테고리: 검색했을 때만 목록을 그림(고른 카테고리는 늘 보임) · 검색 전 안내 한 줄', cats.map(s => s.includes("const list = catQuery.value.trim() ? catMatches.value.slice(0, CAT_SHOWN) : []") && s.includes('data-mk-cat-hint')), [true, true, true])
}

// ── 28. 옵션 불러오기 (2026-10-02 — 사입 셀러: 옵션은 처음부터 채우지 않고 [주문한 옵션 불러오기]·[1688 옵션 불러오기]로만) ──
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const OD = await import('../api/_marketOrdered.js')
  const SO = await import('../src/lib/studioSourceOptions.js')
  const OFFER = '123456789012'
  // 주문 줄 모양 = cartWriter.js(옵션 하나마다 한 줄: num_iid·specId·skus[{color,size,quantity}]) · 예전 주문은 num_iid 없이 itemId만
  const rows = [
    { items: [{ num_iid: OFFER, itemId: OFFER, specId: 'spB', sku: '블랙 / M', skus: [{ color: '블랙', size: 'M', quantity: 30 }], quantity: 30 }, { num_iid: '999999999', specId: 'zz', skus: [{ color: '빨강', size: '', quantity: 5 }] }] },
    { items: [{ itemId: OFFER, specId: 'spB', skus: [{ color: '블랙', size: 'M', quantity: 20 }] }, { num_iid: OFFER, specId: '', skus: [{ color: '화이트', size: 'L', quantity: 10 }] }] },
    { items: [{ num_iid: OFFER, specId: 'gone', skus: [{ color: '핑크', size: 'S', quantity: 2 }] }] },
    { items: null },
  ]
  const ordered = OD.orderedOptionsOf(rows, OFFER)
  eq('주문한 옵션: 이 상품(num_iid·itemId)만 · 같은 spec_id 수량 합 · spec_id 없으면 글자로 · 다른 상품·빈 items 무시', ordered,
    [{ specId: 'spB', color: '블랙', size: 'M', quantity: 50 }, { specId: '', color: '화이트', size: 'L', quantity: 10 }, { specId: 'gone', color: '핑크', size: 'S', quantity: 2 }])
  eq('상품 번호가 없으면 빈 목록', [OD.orderedOptionsOf(rows, ''), OD.orderedOptionsOf(null, OFFER)], [[], []])
  const SK = [
    { skuId: '1', specId: 'spA', values: [{ name: { zh: '颜色', ko: '색상' }, value: { zh: '黑色', ko: '블랙' } }, { name: { zh: '尺码', ko: '사이즈' }, value: { zh: 'S', ko: null } }] },
    { skuId: '2', specId: 'spB', values: [{ name: { zh: '颜色', ko: '색상' }, value: { zh: '黑色', ko: '블랙' } }, { name: { zh: '尺码', ko: '사이즈' }, value: { zh: 'M', ko: null } }] },
    { skuId: '3', specId: 'spC', values: [{ name: { zh: '颜色', ko: '색상' }, value: { zh: '白色', ko: '화이트' } }, { name: { zh: '尺码', ko: '사이즈' }, value: { zh: 'L', ko: null } }] },
  ]
  const r = SO.orderedSkus(SK, ordered)
  eq('주문 옵션 → 1688 옵션 줄: spec_id로 정확히 · 없으면 글자(원문·한글)로 · 못 찾은 것은 지어내지 않고 missing', [r.skus.map(s => s.skuId), r.quantity, r.missing], [['2', '3'], { 0: 50, 1: 10 }, [{ color: '핑크', size: 'S', quantity: 2 }]])
  eq('못 찾은 주문 옵션 안내 한 줄 · 없으면 빈 글자', [SO.orderedMissingNote(r.missing), SO.orderedMissingNote([])], ['주문한 옵션 1개는 지금 1688 옵션 목록에서 찾지 못했습니다: 핑크 / S', ''])
  eq('[1688 옵션 불러오기] = 체크한 줄만(순서 그대로) · 줄 글자 = 한글(없으면 원문) · 원문', [SO.pickSkus(SK, [2, 0]).map(s => s.skuId), SO.pickSkus(SK, []).length, SO.skuLabel(SK[0])], [['1', '3'], 0, { text: '블랙 / S', original: '黑色 / S' }])
  const OE = await import('../src/lib/studioOptionEditor.js')
  const m = OE.emptyOptionEditor()
  const same = m
  OE.replaceOptionEditor(m, OE.optionEditorFromSource(r.skus))
  eq('불러오면 같은 객체가 그 옵션으로 · 주문한 조합만(나머지 조합은 목록 밖)', [m === same, m.enabled, m.groupNames, m.rows.map(x => x.values.join('/')), OE.excludedComboCount(m)], [true, true, ['색상', '사이즈'], ['블랙/M', '화이트/L'], 2])
  eq('1688 원천 줄에 spec_id (OneBound sk.spec_id — 주문 기록 specId와 같은 값)', F.extractSkus1688({ skus: { sku: [{ sku_id: '9', spec_id: 'abc', properties: '1:2', price: '3', quantity: 1 }] }, props_list: { '1:2': '颜色:黑色' } }).rows[0].specId, 'abc')
  const api = read('api/marketplace.js')
  eq('서버: send_prepare.ordered = 이 사용자·결제 확인된 주문(ORDER_OK_STATUSES)·최근 200건 · 원천 skus에 specId', [
    api.includes("orders?select=items&user_id=eq.${ctx.userId}&status=in.(${ORDER_OK_STATUSES.join(',')})&order=created_at.desc&limit=${ORDERED_ORDERS_MAX}"), api.includes('return orderedOptionsOf(rows, String(offerId))'), api.includes('skus: skus.rows.map(r => ({ skuId: r.skuId, specId: r.specId,'), OD.ORDERED_ORDERS_MAX,
  ], [true, true, true, 200])
  db.orders.push({ id: 'o1', user_id: UID, status: 'paid', created_at: '2026-10-01', items: [{ num_iid: OFFER, specId: 'x1', skus: [{ color: '블랙', size: '', quantity: 9 }] }] }, { id: 'o2', user_id: UID, status: 'quote_pending', created_at: '2026-10-01', items: [{ num_iid: OFFER, specId: 'x2', skus: [{ color: '화이트', size: '', quantity: 1 }] }] })
  const sp = await post('send_prepare', { exportId: EID })
  eq('send_prepare(가짜 DB): 결제 확인된 주문만 ordered에', [sp.statusCode, (sp.body.ordered || []).map(o => o.specId)], [200, ['x1']])
  // 화면 기본값
  const secs = { ss: read('src/components/studio/StudioSendSmartstore.vue'), e11: read('src/components/studio/StudioSendElevenst.vue'), zz: read('src/components/studio/StudioSendZigzag.vue'), cp: read('src/components/studio/StudioSendCoupang.vue') }
  eq('기본은 빈칸: 스마트스토어·11번가·지그재그 emptyOptionEditor · 공통 정보 emptyOptionEditor · 쿠팡 init에서 fillFromSource 안 부름 · [불러오기] → onPickSource', [
    [secs.ss, secs.e11, secs.zz].every(s => s.includes('const opts = ref(emptyOptionEditor())') && !s.includes('optionEditorFromSource(')), read('src/lib/studioSendCommon.js').includes('opts: emptyOptionEditor(),'),
    !/^\s*fillFromSource\(\)/m.test(secs.cp), secs.cp.includes('@pick="onPickSource"') && secs.cp.includes('function onPickSource({ skus }) {'),
  ], [true, true, true, true])
  eq('쿠팡 필수 구매옵션 안내: "쿠팡은 이 카테고리에 ○○ 옵션이 필수입니다" · 빠짐 목록에도 · 값을 지어내 넣지 않음', [
    secs.cp.includes('out.push(`쿠팡은 이 카테고리에 ${members.map(x => x.name).join(\' 또는 \')} 옵션이 필수입니다`)'), secs.cp.includes('out.push(...requiredOptionNotes.value)'), secs.cp.includes('const attrs = (meta.value?.attributes || []).filter(a => a.required && a.exposed)'),
  ], [true, true, true])
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
