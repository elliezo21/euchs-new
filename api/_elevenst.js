/**
 * 11번가 Open API — 중계 호출·오류 번역 (2026-09-30 연결 · 2026-10-01 상품 보내기)
 * 쿠팡(api/_coupang.js coupangCall)과 같은 방식을 그대로 쓴다:
 *   고정 IP 중계 {MARKETPLACE_RELAY_URL}/11st{path}?{query} + 헤더 x-relay-secret · 재시도 없음 · 같은 서킷 브레이커(breakerFor) · 같은 준비 문제 문구
 *
 * [인증 — 11번가 오픈API] 요청 헤더 openapikey: {발급받은 키}. 응답은 EUC-KR XML (2026-10-01 공식 문서·실제 카테고리 응답으로 확인)
 * [연결 확인] 출고지 주소 조회 GET /rest/areaservice/outboundarea (apiSeq 1014) — 읽기 전용, 셀러 키가 맞아야 응답
 * [중계] relay.js에 11st → 11번가 API 주소 + openapikey 헤더 넘기기가 있어야 한다
 *
 * 상품 보내기 (2026-10-01) — 근거는 api/_elevenstFields.js 머리 주석
 *   등록  POST /rest/prodservices/product  헤더 openapikey · 본문 XML(<?xml version="1.0" encoding="EUC-KR"?>, Content-Type text/xml, EUC-KR 바이트) — 공식 예제
 *         성공 <ClientMessage><resultCode>200|210</resultCode><productNo>…</productNo><message>…</message> · 실패 resultCode 500 + message · 400 = 하루 500개 한도 초과
 *         인증 오류 <AuthMessage><resultCode>100|200|300</resultCode> (300 = Seller API 미승인)
 *   대표 이미지(prdImage01) = 11번가가 내려받아 600×600으로 저장(문서 — Content-Type이 이미지여야 함, jpg·jpeg·png·webp)
 *   상세(htmlDetail) 안 이미지는 복사 여부가 문서에 없고 이미지 업로드 API도 없다
 *     → 2026-10-01 실전 등록에서 11번가가 상세 이미지를 복사하지 않고 우리 주소를 그대로 불러 쓰는 것을 확인
 *     → 상세 이미지 주소 = 판매용 공개 창고의 영구 주소(api/_marketImages.js publishMarketImages). 주소 고르기는 elevenstDetailImageUrls 한 곳
 */
import { breakerFor, NOT_READY_MESSAGE, RELAY_IP } from './_coupang.js'
import {
  NOTICE_VALUE_MAX, noticeItemsFor, noticeTypeOf, kcFor, originFor, VAT_TYPES, DELIVERY_FEE_TYPES, feeHasBase, PRODUCT_NAME_MAX, PRICE_MAX, is10Won,
  bundleDeliveryYn, SETTLEMENT_ERROR_RE, SETTLEMENT_MESSAGE, SALE_PERIOD_CLF, SALE_END_DAY, kstDaySlash,
} from './_elevenstFields.js'
import { elevenstOptionRows } from './_marketOptions.js'

export const ELEVENST_PATHS = {
  outbound: '/rest/areaservice/outboundarea', // 출고지 주소 조회 (apiSeq 1014)
  inbound: '/rest/areaservice/inboundarea', // 반품/교환지 주소 조회 (apiSeq 1015)
  product: '/rest/prodservices/product', // 상품 등록 POST (apiSeq 1003)
  stopDisplay: prdNo => `/rest/prodstatservice/stat/stopdisplay/${prdNo}`, // 판매중지 PUT (apiSeq 1631)
}
// 카테고리 전체 조회 (apiSeq 1001) — "API Key 값은 필요하지 않습니다"(문서) → 중계·키 없이 바로 부른다 (2026-10-01 실제 응답: EUC-KR XML 약 3MB)
export const ELEVENST_CATEGORY_URL = 'https://api.11st.co.kr/rest/cateservice/category'
const RELAY_TIMEOUT_MS = 25000

export class ElevenstError extends Error {
  constructor(code, message, { status = 0, raw = '' } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.raw = String(raw || '').slice(0, 300)
  }
}

/**
 * 11번가 응답·HTTP 상태 → 오류 (null = 성공) — 연결 확인용
 * 11번가는 HTTP 200에 XML 결과 코드로 실패를 주기도 한다 — 음수 result_code·"인증"·"키" 문구를 실패로 본다
 */
export function translateElevenst(status, text = '') {
  const t = String(text || '')
  if (status === 0) return { code: 'relay_unreachable', message: NOT_READY_MESSAGE }
  if (status === 401 && /relay/i.test(t)) return { code: 'relay_denied', message: NOT_READY_MESSAGE }
  if (/허용되지 않은 IP|not allowed ip|ip.*(차단|허용)/i.test(t)) return { code: 'ip_not_allowed', message: `11번가 오픈API에 서버 IP ${RELAY_IP}가 등록됐는지 확인해 주세요.` }
  if (status === 401 || status === 403 || /openapikey|api ?key|인증.*(실패|오류)|유효하지 않은.*키/i.test(t)) return { code: 'bad_key', message: 'API 키가 맞지 않아요. 11번가에서 발급한 키를 다시 확인해 주세요.' }
  if (status === 429) return { code: 'rate_limited', message: '11번가 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 500) return { code: 'market_server', message: '11번가가 응답하지 않아요. 잠시 후 다시 시도해 주세요.' }
  if (status >= 400) return { code: 'market_error', message: `11번가 요청이 실패했어요 (HTTP ${status}).` }
  const rc = /<(?:\w+:)?result_?code>\s*(-?\d+)\s*</i.exec(t)
  if (rc && Number(rc[1]) < 0) return { code: 'market_rejected', message: '11번가가 요청을 거절했어요. 키와 서버 IP 등록을 확인해 주세요.' }
  return null
}

/**
 * 11번가 호출 (중계 경유). 성공 = 응답 본문(XML 글자). 실패 = ElevenstError throw (재시도 없음)
 * 응답은 EUC-KR — 바이트로 받아 Content-Type·XML 선언의 문자셋으로 읽는다
 * @param {{ relayUrl, relaySecret, apiKey, breakerKey, fetchImpl? }} c
 * @param {{ method, path, query?, body?:Buffer, contentType?, translate? }} req  translate = 오류 번역(기본 = 연결 확인용 translateElevenst)
 */
export async function elevenstCall(c, { method, path, query = '', body, contentType, translate = translateElevenst }) {
  if (!c.relayUrl || !c.relaySecret) throw new ElevenstError('relay_not_configured', NOT_READY_MESSAGE)
  const breaker = breakerFor(`11st:${c.breakerKey || ''}`)
  const left = breaker.blockedFor()
  if (left > 0) throw new ElevenstError('breaker_open', `11번가 오류가 잦아 잠시 멈췄어요. ${Math.ceil(left / 60000)}분 뒤 다시 시도해 주세요.`)
  const url = `${c.relayUrl.replace(/\/$/, '')}/11st${path}${query ? `?${query}` : ''}`
  const headers = { 'openapikey': c.apiKey, 'Accept': 'application/xml', 'x-relay-secret': c.relaySecret }
  if (body !== undefined) headers['Content-Type'] = contentType || 'text/xml'
  const fetchImpl = c.fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS)
  let r, text
  try {
    r = await fetchImpl(url, { method, headers, body, signal: controller.signal })
    text = typeof r.arrayBuffer === 'function' ? decodeXmlBytes(Buffer.from(await r.arrayBuffer()), r.headers?.get?.('content-type')) : await r.text()
  } catch (e) {
    breaker.recordError()
    throw new ElevenstError('relay_unreachable', NOT_READY_MESSAGE, { status: 0, raw: e?.name === 'AbortError' ? 'timeout' : e?.message })
  } finally {
    clearTimeout(timer)
  }
  const tr = translate(r.status, text)
  if (tr) {
    breaker.recordError()
    throw new ElevenstError(tr.code, tr.message, { status: r.status, raw: String(text || '').replace(/[0-9a-f]{24,}/gi, '[hex]') })
  }
  breaker.recordOk()
  return text
}

/** 키 확인 — 출고지 주소 조회가 되면 연결된 것으로 본다 */
export async function verifyElevenstKey(c) {
  await elevenstCall(c, { method: 'GET', path: ELEVENST_PATHS.outbound })
  return true
}

// ── EUC-KR ──
// 11번가 서버가 읽는 EUC-KR(KS X 1001) 안의 글자만 보낸다 — Node의 'euc-kr' 해석기는 더 넓은 CP949라, 거꾸로 표를 만들 때 KS X 1001 범위(0xA1~0xFE × 0xA1~0xFE)만 쓴다
let EUCKR_MAP = null
function euckrMap() {
  if (EUCKR_MAP) return EUCKR_MAP
  const dec = new TextDecoder('euc-kr', { fatal: true })
  const m = new Map()
  const two = new Uint8Array(2)
  for (let a = 0xA1; a <= 0xFE; a++) {
    for (let b = 0xA1; b <= 0xFE; b++) {
      two[0] = a; two[1] = b
      let ch
      try { ch = dec.decode(two) } catch { continue } // 비어 있는 자리 — 표에 넣지 않는다
      if (ch.length === 1 && !m.has(ch)) m.set(ch, (a << 8) | b)
    }
  }
  EUCKR_MAP = m
  return m
}
/** 글자 → EUC-KR 바이트. 못 바꾸는 글자는 bad에 (보내지 않고 고객에게 알린다) */
export function encodeEucKr(str) {
  const map = euckrMap()
  const out = []
  const bad = new Set()
  for (const ch of String(str ?? '')) {
    const cp = ch.codePointAt(0)
    if (cp < 0x80) { out.push(cp); continue }
    const v = map.get(ch)
    if (v == null) { bad.add(ch); continue }
    out.push(v >> 8, v & 0xFF)
  }
  return { buf: Buffer.from(out), bad: [...bad] }
}
/** 응답 바이트 → 글자 (Content-Type·XML 선언에 euc-kr이 있으면 EUC-KR, 아니면 UTF-8) */
export function decodeXmlBytes(buf, contentType = '') {
  const head = buf.subarray(0, 120).toString('latin1')
  const euc = /euc-kr|ks_c_5601|cp949/i.test(String(contentType || '')) || /encoding=["']?(euc-kr|ks_c_5601|cp949)/i.test(head)
  return new TextDecoder(euc ? 'euc-kr' : 'utf-8').decode(buf)
}

// ── XML 읽기·쓰기 (단순한 모양만 — 11번가 응답·우리 본문) ──
const unXml = s => String(s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&')
/** <태그>값</태그> 첫째 (이름공간 접두어 무시) */
export function xmlTag(xml, tag) {
  const m = new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)</(?:\\w+:)?${tag}>`).exec(String(xml || ''))
  return m ? unXml(m[1]).trim() : null
}
/** 같은 이름 블록 전부 (이름공간 접두어 무시) */
export function xmlBlocks(xml, tag) {
  const re = new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'g')
  const out = []
  let m
  while ((m = re.exec(String(xml || '')))) out.push(m[1])
  return out
}
const escXml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** CDATA — 안에 "]]>"가 있으면 나눠 담는다 */
export const cdata = s => `<![CDATA[${String(s ?? '').split(']]>').join(']]]]><![CDATA[>')}]]>`
const el = (tag, v) => `<${tag}>${escXml(v)}</${tag}>`
const elC = (tag, v) => `<${tag}>${cdata(v)}</${tag}>`

// ── 응답 읽기 ──
/** 카테고리 전체 응답 → 최하위만 [{ id, name, wholeName }] (전체 이름 순). 문서: 최하위 카테고리만 등록 가능 */
export function normalizeElevenstCategories(xml) {
  const all = xmlBlocks(xml, 'category').map(b => ({ id: xmlTag(b, 'dispNo'), name: xmlTag(b, 'dispNm') || '', parent: xmlTag(b, 'parentDispNo'), leaf: xmlTag(b, 'leafYn') === 'Y' }))
    .filter(c => /^\d{1,20}$/.test(String(c.id || '')))
  const byId = new Map(all.map(c => [c.id, c]))
  const whole = c => { const names = []; let cur = c, guard = 0; while (cur && guard++ < 10) { names.unshift(cur.name); cur = byId.get(cur.parent) } return names.join('>') }
  return all.filter(c => c.leaf).map(c => ({ id: c.id, name: c.name, wholeName: whole(c) })).sort((a, b) => a.wholeName.localeCompare(b.wholeName, 'ko'))
}
/** 출고지·반품지 응답 → [{ id, name, address, phone, receiver }] · result_message가 있고 SUCCESS가 아니면 null(실패) */
export function normalizeElevenstAddresses(xml) {
  const msg = xmlTag(xml, 'result_message')
  if (msg != null && !/^success$/i.test(msg)) return null
  return xmlBlocks(xml, 'inOutAddress').map(b => ({
    id: xmlTag(b, 'addrSeq') || '', name: xmlTag(b, 'addrNm') || '', address: xmlTag(b, 'addr') || '',
    phone: xmlTag(b, 'gnrlTlphnNo') || xmlTag(b, 'prtblTlphnNo') || '', receiver: xmlTag(b, 'rcvrNm') || '',
  })).filter(a => /^\d{1,20}$/.test(a.id))
}
/** 등록 응답 <ClientMessage> → { ok, code, productNo, message } */
export function parseClientMessage(xml) {
  const code = xmlTag(xml, 'resultCode')
  const productNo = xmlTag(xml, 'productNo')
  const message = xmlTag(xml, 'message') || ''
  const ok = (code === '200' || code === '210') && /^\d{1,20}$/.test(String(productNo || ''))
  return { ok, code, productNo: ok ? productNo : null, message }
}

/**
 * 상품 API 오류 → 고객 문구 (합니다체 — 스마트스토어와 같은 모양). null = 성공 모양(등록은 부르는 쪽이 parseClientMessage로 다시 본다)
 * @param {string} what 무엇을 거절했는지 — 등록 = '등록', 나머지 = '요청'
 */
export function translateElevenstApi(status, text = '', what = '요청') {
  const t = String(text || '')
  if (status === 0) return { code: 'relay_unreachable', message: NOT_READY_MESSAGE }
  if (status === 401 && /relay/i.test(t)) return { code: 'relay_denied', message: NOT_READY_MESSAGE }
  if (/허용되지 않은 IP|not allowed ip|ip.*(차단|허용)/i.test(t)) return { code: 'ip_not_allowed', message: `11번가 오픈API에 서버 IP ${RELAY_IP}가 등록되어 있는지 확인하세요.` }
  if (/<(?:\w+:)?AuthMessage[\s>]/.test(t)) {
    if (xmlTag(t, 'resultCode') === '300') return { code: 'not_approved', message: '11번가 Seller API 승인이 필요합니다. 셀러오피스에서 Open API 승인 상태를 확인하세요.' }
    return { code: 'bad_key', message: '11번가 인증에 실패했습니다. [연결] 탭에서 API 키를 다시 연결하세요.' }
  }
  if (status === 401 || status === 403) return { code: 'bad_key', message: '11번가 인증에 실패했습니다. [연결] 탭에서 API 키를 다시 연결하세요.' }
  if (status === 429) return { code: 'rate_limited', message: '판매처 요청이 많아 잠시 멈췄습니다. 잠시 후 다시 시도해 주세요.' }
  if (status >= 500) return { code: 'market_server', message: '판매처가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.' }
  if (status >= 400) return { code: 'market_rejected', message: `판매처에서 ${what}을 거절했습니다. (HTTP ${status})` }
  const rc = xmlTag(t, 'resultCode')
  if (rc === '400') return { code: 'daily_limit', message: '11번가 하루 상품 등록 한도(500개)를 넘었습니다. 내일 다시 시도하세요.' }
  if (rc === '500') { const m = xmlTag(t, 'message'); if (SETTLEMENT_ERROR_RE.test(m || '')) return { code: 'settlement_unverified', message: SETTLEMENT_MESSAGE }; return { code: 'market_rejected', message: m ? `판매처에서 ${what}을 거절했습니다: ${m.slice(0, 500)}` : `판매처에서 ${what}을 거절했습니다.` } }
  return null
}

// ── 상세설명 ──
/**
 * 상세 이미지 주소 — 판매용 공개 창고의 영구 주소(publishMarketImages 결과 urls)를 key 순서대로.
 * 우리 이미지 주소(토큰 30분)는 쓰지 않는다 — 11번가가 상세 이미지를 복사하지 않아 30분 뒤 깨진다 (2026-10-01 실전 확인)
 * 주소가 없는 key가 있으면 throw (빈 자리를 조용히 빼지 않는다)
 * @param {{ files:{ key }[], urlOf:(key)=>string }} p @returns {string[]}
 */
export function elevenstDetailImageUrls({ files, urlOf }) {
  return (Array.isArray(files) ? files : []).filter(f => f && typeof f.key === 'string').map(f => {
    const u = urlOf(f.key)
    if (typeof u !== 'string' || !u) throw new Error(`11번가 상세 이미지 ${f.key}번 주소 없음`)
    return u
  })
}
/** 상세설명 HTML — 이미지만 위에서 아래로 (alt = 상품명 + 번호). 글자·스크립트·외부 링크 없음 */
export function elevenstDetailHtml(urls, productName) {
  const name = escXml(String(productName || '상품')).replace(/"/g, '&quot;')
  return `<div style="text-align:center">${(Array.isArray(urls) ? urls : []).filter(Boolean).map((u, i) => `<img src="${escXml(u).replace(/"/g, '&quot;')}" alt="${name} 상세 ${i + 1}" style="max-width:100%;height:auto;display:block;margin:0 auto" />`).join('')}</div>`
}

// ── 등록 본문 ──
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
/**
 * 상품 등록 XML (EUC-KR 바이트). 화면에서 받은 값만 — 국내 셀러라 해외 항목(abrdBuyPlace·forAbrdBuyClf·outsideYn*·importFeeCd·hsCode 등)은 넣지 않는다.
 * 발송마감 템플릿(dlvSendCloseTmpltNo)은 문서상 선택입력 — 값이 있을 때만
 * @param {{ productName, brand?, categoryId, price, stock, repUrl, detailUrls:string[], vat:'01'|'02', minorOk?:boolean, origin:{ kind:'01'|'02'|'03', code? },
 *           kc:{ [group]: key }, kcCerts?:{ [group]: { type, key } }, delivery:{ feeType:'01'|'02'|'03', fee?, freeOver?(03), jejuFee, islandFee, returnFee, exchangeFee, outAddr, inAddr, sendCloseTmplt? },
 *           asDetail, rtngExchDetail, notice:{ type, maker, country, phone, items?:{ [code]: 값 } },
 *           options?:{ groupNames, rows:[{ values, addPrice, stock }] } | null }} p   options = 싱글옵션(_marketOptions.optionsPayload) — 있으면 stock 대신 옵션 재고 합계
 * @returns {{ ok:true, xml, buf, summary } | { ok:false, message }}
 */
export function buildElevenstProduct(p) {
  const name = clean(p?.productName, 1000)
  if (!name) return { ok: false, message: '상품명을 입력하세요.' }
  if ([...name].length > PRODUCT_NAME_MAX) return { ok: false, message: `상품명은 ${PRODUCT_NAME_MAX}자까지 입력할 수 있습니다.` }
  const cat = String(p?.categoryId ?? '')
  if (!/^\d{1,20}$/.test(cat)) return { ok: false, message: '카테고리를 선택하세요.' }
  if (!is10Won(p?.price, 10, PRICE_MAX)) return { ok: false, message: '판매가는 10원 단위로 입력하세요. (10억 원 미만)' }
  // 옵션(싱글옵션 한 칸) — 있으면 prdSelQty = 판매할 옵션 재고 합계 (규칙·근거 api/_marketOptions.js). 없으면 예전 그대로
  let opt = null
  if (p?.options != null) {
    opt = elevenstOptionRows(p.options, p.price)
    if (!opt.ok) return { ok: false, message: opt.message }
    const bad = encodeEucKr([opt.title, ...opt.rows.map(r => r.value)].join('')).bad
    if (bad.length) return { ok: false, message: `11번가에 보낼 수 없는 글자가 옵션에 있습니다: ${bad.slice(0, 5).join(' ')} — 옵션 이름·값에서 빼고 다시 보내세요.` }
  } else if (!Number.isInteger(p?.stock) || p.stock < 1 || p.stock > 99999999) return { ok: false, message: '재고 수량은 1개 이상 입력하세요. (11번가는 재고 0으로 등록할 수 없습니다)' }
  const stock = opt ? opt.stockTotal : p.stock
  if (typeof p?.repUrl !== 'string' || !p.repUrl) return { ok: false, message: '대표 이미지를 준비하지 못했습니다.' }
  if (!Array.isArray(p?.detailUrls) || !p.detailUrls.length) return { ok: false, message: '상세 이미지를 준비하지 못했습니다.' }
  if (!VAT_TYPES.some(v => v.code === p?.vat)) return { ok: false, message: '부가세 구분을 선택하세요.' }
  const kc = kcFor(p?.kc, p?.kcCerts)
  if (!kc.ok) return { ok: false, message: kc.message }
  const origin = originFor(p?.origin)
  if (!origin) return { ok: false, message: '원산지를 선택하세요.' }
  const d = p?.delivery || {}
  if (!DELIVERY_FEE_TYPES.some(t => t.code === d.feeType)) return { ok: false, message: '배송비 종류를 선택하세요.' }
  if (feeHasBase(d.feeType) && !is10Won(d.fee, 10, 1000000)) return { ok: false, message: '기본 배송비를 10원 단위로 입력하세요.' }
  if (d.feeType === '03' && !is10Won(d.freeOver, 10, PRICE_MAX)) return { ok: false, message: '무료배송 기준 금액을 10원 단위로 입력하세요.' }
  if (!is10Won(d.jejuFee, 0, 1000000) || !is10Won(d.islandFee, 0, 1000000)) return { ok: false, message: '제주·도서산간 추가 배송비를 10원 단위로 입력하세요.' }
  if (!is10Won(d.returnFee, 0, 1000000) || !is10Won(d.exchangeFee, 0, 1000000)) return { ok: false, message: '반품·교환 배송비를 10원 단위로 입력하세요.' }
  const outAddr = String(d.outAddr ?? ''), inAddr = String(d.inAddr ?? '')
  if (!/^\d{1,20}$/.test(outAddr) || !/^\d{1,20}$/.test(inAddr)) return { ok: false, message: '출고지·반품지를 선택하세요.' }
  const tmplt = d.sendCloseTmplt == null || d.sendCloseTmplt === '' ? null : String(d.sendCloseTmplt)
  if (tmplt != null && !/^\d{1,20}$/.test(tmplt)) return { ok: false, message: '발송마감 템플릿 번호가 올바르지 않습니다.' }
  const asDetail = clean(p?.asDetail, 2000), rtng = clean(p?.rtngExchDetail, 2000)
  if (!asDetail) return { ok: false, message: 'A/S 안내를 입력하세요.' }
  if (!rtng) return { ok: false, message: '반품/교환 안내를 입력하세요.' }
  const n = p?.notice || {}
  if (!noticeTypeOf(n.type)) return { ok: false, message: '상품정보제공고시 유형을 선택하세요.' }
  const items = noticeItemsFor(n.type, n)
  const emptyItem = items.find(it => !it.name)
  if (emptyItem) return { ok: false, message: `상품정보제공고시 "${emptyItem.label}" 값을 입력하세요.` }
  const longItem = items.find(it => [...it.name].length > NOTICE_VALUE_MAX)
  if (longItem) return { ok: false, message: `상품정보제공고시 "${longItem.label}" 값은 ${NOTICE_VALUE_MAX}자까지 입력할 수 있습니다.` }
  const brand = clean(p?.brand, 100) || '알수없음' // 문서: 브랜드가 없으면 "알수없음"
  const saleBegin = kstDaySlash(p?.now instanceof Date ? p.now : new Date()) // now = 테스트용 (부르는 쪽은 안 넘김)

  const xml = [
    '<?xml version="1.0" encoding="EUC-KR"?>',
    '<Product>',
    el('selMthdCd', '01'), // 고정가판매
    el('dispCtgrNo', cat),
    el('prdTypCd', '01'), // 일반배송상품
    elC('prdNm', name),
    elC('brand', brand),
    el('rmaterialTypCd', '04'), // 원산지 의무 표시대상 아님(가공식품 원재료가 아님) — 원산지는 아래 orgnTypCd로 표시
    el('orgnTypCd', origin.orgnTypCd), // 01 국내 · 02 해외 (+ 지역 코드 — area.xlsx) · 03 기타 (+ 원산지명)
    ...(origin.orgnTypDtlsCd ? [el('orgnTypDtlsCd', origin.orgnTypDtlsCd)] : [elC('orgnNmVal', origin.orgnNmVal)]),
    el('suplDtyfrPrdClfCd', p.vat),
    el('prdStatCd', '01'), // 새상품
    el('minorSelCnYn', p.minorOk === false ? 'N' : 'Y'),
    el('prdImage01', p.repUrl),
    elC('htmlDetail', elevenstDetailHtml(p.detailUrls, name)),
    ...kc.groups.map(g => `<ProductCertGroup>${el('crtfGrpTypCd', g.crtfGrpTypCd)}${el('crtfGrpObjClfCd', g.crtfGrpObjClfCd)}${g.crtfGrpExptTypCd ? el('crtfGrpExptTypCd', g.crtfGrpExptTypCd) : ''}</ProductCertGroup>`),
    ...kc.certs.map(c => `<ProductCert>${el('certTypeCd', c.certTypeCd)}${elC('certKey', c.certKey)}</ProductCert>`), // 인증대상 그룹만
    el('selPrdClfCd', SALE_PERIOD_CLF), // 판매기간 직접입력 (고정가판매 selMthdCd 01) — selTermUseYn은 안 보냄
    el('aplBgnDy', saleBegin), // 판매시작일 = 보내는 날 한국시간
    el('aplEndDy', SALE_END_DAY), // 2999/12/31 = 11번가가 최대 3년으로 처리
    el('selPrc', String(p.price)),
    // 옵션 블록 — 공식 Product 요소 순서상 할인·포인트 항목 뒤, prdSelQty 앞 (공식 예제 singleOption1.txt 모양 그대로)
    ...(opt ? [
      el('optSelectYn', 'Y'), el('txtColCnt', '1'), el('colTitle', opt.title),
      ...opt.rows.map(r => `<ProductOption>${el('useYn', 'Y')}${el('colOptPrice', String(r.addPrice))}${el('colValue0', r.value)}${el('colCount', String(r.stock))}</ProductOption>`),
    ] : []),
    el('prdSelQty', String(stock)),
    el('dlvCnAreaCd', '01'), // 전국
    el('dlvWyCd', '01'), // 택배
    ...(tmplt != null ? [el('dlvSendCloseTmpltNo', tmplt)] : []),
    el('dlvCstInstBasiCd', d.feeType),
    ...(feeHasBase(d.feeType) ? [el('dlvCst1', String(d.fee))] : []), // 02 고정 · 03 조건부 무료의 기본 배송비
    ...(d.feeType === '03' ? [el('PrdFrDlvBasiAmt', String(d.freeOver))] : []), // 03 조건부 무료 — 이 금액 이상이면 무료
    el('bndlDlvCnYn', bundleDeliveryYn(d.feeType)), // 03 조건부 무료 = N (11번가 규칙)
    el('dlvCstPayTypCd', '03'), // 선결제
    el('jejuDlvCst', String(d.jejuFee)),
    el('islandDlvCst', String(d.islandFee)),
    el('addrSeqOut', outAddr),
    el('addrSeqIn', inAddr),
    el('rtngdDlvCst', String(d.returnFee)),
    el('exchDlvCst', String(d.exchangeFee)),
    elC('asDetail', asDetail),
    elC('rtngExchDetail', rtng),
    el('dlvClf', '02'), // 업체배송
    `<ProductNotification>${el('type', n.type)}${items.map(it => `<item>${el('code', it.code)}${elC('name', it.name)}</item>`).join('')}</ProductNotification>`,
    '</Product>',
  ].join('')
  const enc = encodeEucKr(xml)
  if (enc.bad.length) return { ok: false, message: `11번가에 보낼 수 없는 글자가 있습니다: ${enc.bad.slice(0, 5).join(' ')} — 상품명·안내 문구에서 빼고 다시 보내세요.` }
  const summary = { prdNm: name, dispCtgrNo: cat, selPrc: p.price, prdSelQty: stock, addrSeqOut: outAddr, addrSeqIn: inAddr, dlvCstInstBasiCd: d.feeType, bndlDlvCnYn: bundleDeliveryYn(d.feeType), aplBgnDy: saleBegin, aplEndDy: SALE_END_DAY, noticeType: n.type, origin: origin.label, kc: kc.groups, certTypes: kc.certs.map(c => c.certTypeCd) }
  if (opt) summary.options = { colTitle: opt.title, count: opt.rows.length } // 옵션이 있을 때만 (없으면 기록 모양 예전 그대로)
  return { ok: true, xml, buf: enc.buf, summary }
}
/** 마지막 등록의 { out, in } 주소 번호 (기록 request_json.summary) — 없거나 이상하면 null */
export const lastElevenstAddresses = summary => ({
  out: /^\d{1,20}$/.test(String(summary?.addrSeqOut ?? '')) ? String(summary.addrSeqOut) : null,
  in: /^\d{1,20}$/.test(String(summary?.addrSeqIn ?? '')) ? String(summary.addrSeqIn) : null,
})
