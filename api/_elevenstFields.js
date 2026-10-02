/**
 * 11번가 상품 보내기 — 화면(StudioSendElevenst.vue)과 서버(api/_elevenst.js)가 같이 쓰는 값 (순수 — import 없음, 브라우저 번들에 들어가도 된다)
 * 근거 (2026-10-01):
 *   상품등록 apiSeq 1003 — 채팅 Claude가 openapi.11st.co.kr(로그인) 공식 문서에서 확인 + npm @10xtf/11st-seller-mcp v0.0.12 스키마(공식 문구와 같음)
 *   상품정보제공고시 유형·항목 코드 — soffice.11st.co.kr 공식 팝업에서 채팅 Claude가 옮긴 표 (값은 띄어쓰기 포함 50자 이내)
 *   원산지 지역 코드 — https://i.011st.com/openapi/area.xlsx (1287 = 중국)
 *   출고지·반품지 조회(1014·1015) 응답 — ns2:inOutAddress(addr, addrNm, addrSeq, gnrlTlphnNo, prtblTlphnNo, rcvrNm, memNo). 해외 여부·기본 주소 칸 없음 → 국내 주소로 본다
 */

// 상품정보제공고시 — 자주 쓰는 유형만 (코드·항목은 공식 표 그대로). 첫째가 기본(기타 재화)
export const NOTICE_TYPES = [
  { code: '891045', name: '기타 재화', items: [['11800', '품명 및 모델명'], ['11905', '제조자/수입자'], ['23760413', 'A/S 책임자와 전화번호 또는 소비자상담 관련 전화번호'], ['23759100', '제조국 또는 원산지'], ['23756033', '법에 의한 인증·허가 등을 받았음을 확인할 수 있는 경우 그에 대한 사항']] },
  { code: '891011', name: '의류', items: [['11835', '색상'], ['23756520', '세탁방법 및 취급시 주의사항'], ['23759095', '제조국'], ['23760437', 'A/S 책임자와 전화번호'], ['23759468', '제품 소재'], ['23760034', '치수'], ['23760386', '품질보증기준'], ['11905', '제조자/수입자'], ['23759308', '제조연월']] },
  { code: '891012', name: '구두/신발', items: [['11835', '색상'], ['11905', '제조자/수입자'], ['23759095', '제조국'], ['40748371', '제품 주소재'], ['23760034', '치수'], ['23760386', '품질보증기준'], ['23760437', 'A/S 책임자와 전화번호'], ['23759972', '취급시 주의사항']] },
  { code: '891013', name: '가방', items: [['11835', '색상'], ['11848', '소재'], ['11905', '제조자/수입자'], ['11908', '종류'], ['23760437', 'A/S 책임자와 전화번호'], ['23759095', '제조국'], ['23759972', '취급시 주의사항'], ['23760386', '품질보증기준'], ['11932', '크기,용량,형태']] },
  { code: '891014', name: '패션잡화 (모자 / 벨트 / 액세서리 등)', items: [['11848', '소재'], ['11905', '제조자/수입자'], ['11908', '종류'], ['23760437', 'A/S 책임자와 전화번호'], ['23759972', '취급시 주의사항'], ['23760034', '치수'], ['23760386', '품질보증기준'], ['23759095', '제조국']] },
  { code: '891015', name: '침구류/커튼', items: [['11835', '색상'], ['11905', '제조자/수입자'], ['17461', '제품구성'], ['23756520', '세탁방법 및 취급시 주의사항'], ['23760437', 'A/S 책임자와 전화번호'], ['23759468', '제품 소재'], ['23760034', '치수'], ['23760386', '품질보증기준'], ['23759095', '제조국']] },
  { code: '891016', name: '가구 (침대 / 소파 / 싱크대 / DIY제품 등)', items: [['11835', '색상'], ['11905', '제조자/수입자'], ['11932', '크기,용량,형태'], ['23756017', '배송·설치비용'], ['23759095', '제조국'], ['469865457', '재공급(리퍼브) 가구의 경우 재공급 사유 및 하자 부위에 관한 정보'], ['23760386', '품질보증기준'], ['23760437', 'A/S 책임자와 전화번호'], ['23760470', 'KC 인증정보'], ['3125646', '구성품'], ['37089196', '품명'], ['23759652', '주요 소재']] },
  { code: '891027', name: '주방용품', items: [['11800', '품명 및 모델명'], ['11900', '재질'], ['11905', '제조자/수입자'], ['11932', '크기,용량,형태'], ['37088317', '"수입식품안전관리 특별법"에 따른 수입기구 또는 용기ㆍ포장의 경우 "수입식품안전관리 특별법에 따른 수입신고를 필함"의 문구'], ['23759938', '동일모델의 출시년월'], ['23760386', '품질보증기준'], ['23760437', 'A/S 책임자와 전화번호'], ['3125646', '구성품'], ['23759095', '제조국']] },
  { code: '891033', name: '어린이제품', items: [['11800', '품명 및 모델명'], ['11835', '색상'], ['11900', '재질'], ['11905', '제조자/수입자'], ['2361085', '사용연령 또는 권장사용연령'], ['23759095', '제조국'], ['469867873', '크기,체중의 한계 (착용 또는 탑승용 어린이제품과 같이 크기ㆍ체중에 제한이 있는 품목의 경우 반드시 표시)'], ['23760223', '크기, 중량'], ['23760386', '품질보증기준'], ['23760437', 'A/S 책임자와 전화번호'], ['23760454', 'KC 인증정보'], ['40747702', '취급방법 및 취급시 주의사항, 안전표시 (주의, 경고 등)'], ['23759938', '동일모델의 출시년월']] },
  { code: '891035', name: '스포츠용품', items: [['11800', '품명 및 모델명'], ['11835', '색상'], ['11900', '재질'], ['11905', '제조자/수입자'], ['17461', '제품구성'], ['23760454', 'KC 인증정보'], ['23759095', '제조국'], ['23759938', '동일모델의 출시년월'], ['23760223', '크기, 중량'], ['23760386', '품질보증기준'], ['23760437', 'A/S 책임자와 전화번호'], ['23756377', '상품별 세부 사양']] },
  { code: '1149547', name: '생활화학제품', items: [['176316020', '품목 및 제품명'], ['176316074', '용도(표백제의 경우 계열을 함께 표시) 및 제형'], ['176316124', '제조연월 및 유통기한 (유통기한의 경우 해당 없는 제품은 생략 가능)'], ['176316199', '중량ㆍ용량ㆍ매수ㆍ크기'], ['176316337', '효과·효능 (승인대상 제품에 한함)'], ['23756754', '소비자상담 관련 전화번호'], ['176316410', '어린이 보호포장 대상 제품 유무'], ['176316456', '제품에 사용된 화학물질 명칭'], ['176316505', '사용상 주의사항'], ['176316535', '안전기준적합확인신고번호 또는 안전확인대상생활화학제품승인번호'], ['176316383', '수입자(수입제품에 한함), 제조국 및 제조사']] },
]
export const DEFAULT_NOTICE_TYPE = '891045'
export const NOTICE_VALUE_MAX = 50 // 공식 표: 값은 띄어쓰기 포함 50자 이내
export const NOTICE_DEFAULT_VALUE = '상세페이지 참조'
// 판매자가 고치는 칸 — 나머지 항목은 "상세페이지 참조"로 보낸다
export const NOTICE_MAKER_CODES = ['11905'] // 제조자/수입자
export const NOTICE_COUNTRY_CODES = ['23759100', '23759095'] // 제조국 (또는 원산지)
export const NOTICE_PHONE_CODES = ['23760413', '23760437', '23756754'] // A/S·상담 전화번호
export const NOTICE_COUNTRY_DEFAULT = '중국'
// 법적 표시가 무거운 유형 — 고르면 판매자 책임 안내를 보인다
export const HEAVY_NOTICE_TYPES = ['891033', '1149547']
export const noticeTypeOf = code => NOTICE_TYPES.find(t => t.code === code) || null

/**
 * 고시 항목 값 — 판매자가 넣은 제조자·제조국·전화번호를 해당 항목에, 나머지는 "상세페이지 참조"
 * @param {string} type @param {{ maker?, country?, phone? }} v
 * @returns {{ code, label, name }[] | null}  유형이 목록에 없으면 null
 */
export function noticeItemsFor(type, v = {}) {
  const t = noticeTypeOf(type)
  if (!t) return null
  const items = v.items && typeof v.items === 'object' ? v.items : {} // 나머지 항목을 판매자가 고친 값 { [code]: 값 } (2026-10-01 등록 템플릿) — 비면 "상세페이지 참조"
  const pick = (code) => {
    if (NOTICE_MAKER_CODES.includes(code)) return v.maker
    if (NOTICE_COUNTRY_CODES.includes(code)) return v.country
    if (NOTICE_PHONE_CODES.includes(code)) return v.phone
    return String(items[code] ?? '').trim() || NOTICE_DEFAULT_VALUE
  }
  return t.items.map(([code, label]) => ({ code, label, name: String(pick(code) ?? '').replace(/\s+/g, ' ').trim() }))
}

// KC 인증정보 — 상품등록 문서(apiSeq 1003)에서 채팅 Claude가 직접 읽은 값 (2026-10-01). 4개 그룹 모두 판매자가 고른다(기본값 없음)
//   문서: "인증정보 입력이 필수인 카테고리일 경우 01, 02, 03, 04의 인증정보를 모두 입력해주세요." → 4개 그룹을 늘 보낸다
//   ProductCertGroup: crtfGrpTypCd 01 전기용품/생활용품 KC · 02 어린이제품 KC · 03 방송통신기자재 KC · 04 생활화학 및 살생물제품
//                     crtfGrpObjClfCd 01 KC인증대상 · 02 KC면제대상 · 03 KC인증대상 아님 · 04 생활화학 및 살생물제품 대상 · 05 생활화학 및 살생물제품 대상 아님
//                     그룹별 허용: 01 → 01·02·03 / 02 → 01·03 / 03 → 01·03 / 04 → 04·05
//                     crtfGrpExptTypCd(면제일 때): 02 구매대행면제대상 · 03 병행수입면제대상
//   ProductCert(인증대상일 때): certTypeCd + certKey(인증번호)
// key = 등록 템플릿의 뜻 키 (api/_listingTemplates.js KC_KEYS)
export const KC_GROUPS = [
  { code: '01', name: '전기용품·생활용품 KC인증', key: 'living' },
  { code: '02', name: '어린이제품 KC인증', key: 'kids' },
  { code: '03', name: '방송통신기자재 KC인증', key: 'radio' },
  { code: '04', name: '생활화학 및 살생물제품', key: 'chemical' },
]
// cert = 인증대상 → 인증유형 + 인증번호 입력
export const KC_CHOICES = {
  '01': [{ key: 'cert', label: 'KC인증 대상', obj: '01', cert: true }, { key: 'agent', label: 'KC면제 대상 (구매대행)', obj: '02', expt: '02' }, { key: 'parallel', label: 'KC면제 대상 (병행수입)', obj: '02', expt: '03' }, { key: 'none', label: 'KC인증 대상 아님', obj: '03' }],
  '02': [{ key: 'cert', label: 'KC인증 대상', obj: '01', cert: true }, { key: 'none', label: 'KC인증 대상 아님', obj: '03' }],
  '03': [{ key: 'cert', label: 'KC인증 대상', obj: '01', cert: true }, { key: 'none', label: 'KC인증 대상 아님', obj: '03' }],
  '04': [{ key: 'cert', label: '생활화학 및 살생물제품 대상', obj: '04', cert: true }, { key: 'none', label: '생활화학 및 살생물제품 대상 아님', obj: '05' }],
}
// 인증유형(certTypeCd) — 그룹별로 고를 수 있는 것 (문서 코드 그대로. 131 해당없음은 대상 아님으로 고르므로 쓰지 않는다)
export const KC_CERT_TYPES = {
  '01': [['101', '[생활용품] 안전인증'], ['103', '[생활용품] 안전확인'], ['124', '[생활용품] 공급자적합성확인'], ['123', '[생활용품] 어린이보호포장'], ['102', '[전기용품] 안전인증'], ['104', '[전기용품] 안전확인'], ['127', '[전기용품] 공급자적합성확인'], ['132', '[전기용품/생활용품] 상품상세설명 참조']],
  '02': [['128', '[어린이제품] 안전인증'], ['129', '[어린이제품] 안전확인'], ['130', '[어린이제품] 공급자적합성확인'], ['134', '[어린이제품] 상품상세설명 참조']],
  '03': [['105', '[방송통신기자재] 적합성평가'], ['135', '[방송통신기자재] 상품상세설명 참조']],
  '04': [['133', '[생활화학 및 살생물제품] 자가검사번호'], ['136', '[생활화학 및 살생물제품] 상품상세설명 참조']],
}
export const KC_CERT_KEY_MAX = 50
/**
 * 화면 선택 → 보낼 인증정보
 * @param {{ [group]: key }} sel  @param {{ [group]: { type, key } }} certs  인증대상인 그룹의 인증유형·인증번호
 * @returns {{ ok:true, groups, certs } | { ok:false, message }}  문구는 합니다체
 */
export function kcFor(sel = {}, certs = {}) {
  const groups = [], out = []
  for (const g of KC_GROUPS) {
    const c = (KC_CHOICES[g.code] || []).find(x => x.key === sel?.[g.code])
    if (!c) return { ok: false, message: `KC 인증 "${g.name}" 항목을 선택하세요.` }
    groups.push({ crtfGrpTypCd: g.code, crtfGrpObjClfCd: c.obj, ...(c.expt ? { crtfGrpExptTypCd: c.expt } : {}) })
    if (c.cert) {
      const type = String(certs?.[g.code]?.type ?? '')
      const key = String(certs?.[g.code]?.key ?? '').replace(/\s+/g, ' ').trim()
      if (!(KC_CERT_TYPES[g.code] || []).some(([code]) => code === type)) return { ok: false, message: `KC 인증 "${g.name}"의 인증유형을 선택하세요.` }
      if (!key) return { ok: false, message: `KC 인증 "${g.name}"의 인증번호를 입력하세요.` }
      if ([...key].length > KC_CERT_KEY_MAX) return { ok: false, message: `KC 인증번호는 ${KC_CERT_KEY_MAX}자까지 입력할 수 있습니다.` }
      out.push({ certTypeCd: type, certKey: key })
    }
  }
  return { ok: true, groups, certs: out }
}

// 원산지 — 기본 해외·중국. 판매자가 바꿀 수 있다 (2026-10-01)
//   orgnTypCd 01 국내 + 국내 지역 코드 / 02 해외 + 국가 코드 (코드 = area.xlsx) / 03 기타 + 원산지명(상세설명 참조)
export const ORIGIN_KINDS = [{ code: '02', name: '해외' }, { code: '01', name: '국내' }, { code: '03', name: '상세설명 참조' }]
export const ORIGIN_DOMESTIC = [['1009', '서울'], ['1002', '경기'], ['1011', '인천'], ['1001', '강원'], ['1015', '충남'], ['1016', '충북'], ['1007', '대전'], ['1004', '경북'], ['1003', '경남'], ['1006', '대구'], ['1008', '부산'], ['1010', '울산'], ['1012', '전남'], ['1013', '전북'], ['1005', '광주'], ['1014', '제주']]
export const ORIGIN_COUNTRIES = [['1287', '중국'], ['1265', '베트남'], ['1284', '인도네시아'], ['1293', '태국'], ['1283', '인도'], ['1285', '일본'], ['1405', '미국'], ['1264', '방글라데시'], ['1290', '캄보디아'], ['1262', '미얀마'], ['1298', '필리핀'], ['1259', '말레이시아'], ['1393', '터키'], ['1389', '이탈리아'], ['1357', '독일']]
export const ORIGIN_REFER_NAME = '상세설명 참조'
export const ORIGIN_CHINA = { orgnTypCd: '02', orgnTypDtlsCd: '1287', name: '중국' } // 기본값
/** 화면 선택 { kind, code } → 원산지 칸 · 표시 이름. 잘못되면 null */
export function originFor(o = {}) {
  if (o.kind === '03') return { orgnTypCd: '03', orgnNmVal: ORIGIN_REFER_NAME, label: ORIGIN_REFER_NAME }
  const list = o.kind === '01' ? ORIGIN_DOMESTIC : o.kind === '02' ? ORIGIN_COUNTRIES : null
  const hit = list && list.find(([code]) => code === String(o.code ?? ''))
  if (!hit) return null
  return { orgnTypCd: o.kind, orgnTypDtlsCd: hit[0], label: `${o.kind === '01' ? '국내' : '해외'} · ${hit[1]}` }
}

// 공개 스위치 — 11번가 보내기를 일반 고객에게 보일지 (2026-10-01)
//   false = 관리자·스태프에게만 보내기(보내기 탭·보내기 창). 고객은 연결은 그대로, 보내기 줄은 "연결됨"만. 서버도 고객의 elevenst_* 요청을 거절
//   실전 테스트 통과 후 이 값 하나만 true → 2026-10-01 true (실등록 9652340990 상세 영구 주소 · 9652421632 옵션 확인). "등록 직후 판매중지"는 이 값과 상관없이 관리자·스태프만
export const ELEVENST_SEND_PUBLIC = true
// 부가세 — 01 과세 · 02 면세 (면세 선택 시 세무·법률 책임은 판매자 — 문서)
export const VAT_TYPES = [{ code: '01', name: '과세상품' }, { code: '02', name: '면세상품' }]
// 배송비 종류 — 01 무료 · 02 고정 배송비(dlvCst1) · 03 조건부 무료(dlvCst1 + 무료 기준 금액 PrdFrDlvBasiAmt) — 2026-10-01 등록 템플릿에서 03 추가
//   key = 등록 템플릿의 배송비 방식 (api/_listingTemplates.js SHIP_FEE_TYPES)
export const DELIVERY_FEE_TYPES = [{ code: '01', name: '무료', key: 'free' }, { code: '02', name: '고정 배송비', key: 'fixed' }, { code: '03', name: '조건부 무료', key: 'conditional' }]
export const feeHasBase = code => code === '02' || code === '03' // 기본 배송비(dlvCst1)를 받는 종류
// 묶음배송(bndlDlvCnYn) — 조건부 무료(03)는 N이어야 한다. 무료·고정은 Y (2026-10-01 실전 거절: "상품 조건무 무료일 경우 묶음배송이 불가능합니다. <bndlDlvCnYn/> 를 N으로 설정해주세요.")
export const bundleDeliveryYn = code => (code === '03' ? 'N' : 'Y')
export const BUNDLE_OFF_NOTE = '묶음배송 불가(조건부 무료)'
// 판매기간 — 문서(apiSeq 1003): selPrdClfCd 0:100 = 직접입력(고정가판매일 때만) · aplBgnDy 판매시작일 YYYY/MM/DD · aplEndDy 2999/12/31 = 최대 3년으로 처리
//   selTermUseYn은 보내지 않는다(문서상 Y = 항목삭제 표시 — 직접입력과 충돌) (2026-10-01 실전 거절: "판매시작일(aplBgnDy)이 누락되었습니다.")
export const SALE_PERIOD_CLF = '0:100'
export const SALE_END_DAY = '2999/12/31'
/** 보내는 날 한국시간 날짜 'YYYY/MM/DD' */
export function kstDaySlash(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000)
  return `${k.getUTCFullYear()}/${String(k.getUTCMonth() + 1).padStart(2, '0')}/${String(k.getUTCDate()).padStart(2, '0')}`
}
// 정산계좌 인증 — 11번가가 등록을 거절할 때 message에 이 말이 들어 있다 (2026-10-01 실전 거절). 원문은 기록에 그대로 남기고 화면 문구만 바꾼다
export const SETTLEMENT_ERROR_RE = /정산대금|입금계좌/
export const SETTLEMENT_MESSAGE = '11번가 정산계좌 인증이 필요합니다. 셀러오피스 상품등록 페이지에서 정산대금 수령방법과 입금계좌를 인증한 뒤 다시 보내십시오.'
export const PRODUCT_NAME_MAX = 100 // 입력 칸 글자 수 상한(화면) — 실제 검사는 아래 바이트
/**
 * 상품명 100바이트 (2026-10-02 ②-1)
 * [근거] 11번가 판매자 공지(셀러오피스 공지 ntceNo=856211 "모바일 최적화 상품정보 제공을 위한 상품등록/수정 정책개편" — 셀러오피스·파트너오피스·오픈API 공통):
 *   상품명 "한글 50자, 영문/숫자 100자까지 입력 가능" = 100바이트(한글 2바이트·영문/숫자 1바이트).
 *   ※ 공지 본문은 셀러오피스 로그인이 필요해 검색 결과 요약으로 확인했다 — 원문 대조는 해성 계정으로 할 것(보고서에 적음)
 * [세는 법] 11번가로 보내는 XML은 EUC-KR(api/_elevenst.js encodeEucKr — 한글·한자·기호 등 ASCII 밖 글자는 모두 2바이트, ASCII는 1바이트)과 같게 센다.
 *   EUC-KR로 못 바꾸는 글자는 등록 때 따로 막는다(encodeEucKr bad) — 여기서는 2바이트로 센다
 */
export const PRODUCT_NAME_BYTES = 100
export const elevenstNameBytes = s => [...String(s ?? '')].reduce((n, ch) => n + (ch.codePointAt(0) < 0x80 ? 1 : 2), 0)
export const NAME_BYTES_OVER = `상품명: ${PRODUCT_NAME_BYTES}바이트(한글 약 ${PRODUCT_NAME_BYTES / 2}자)를 넘었습니다`
/** 남은 바이트 (넘으면 음수) */
export const nameBytesLeft = s => PRODUCT_NAME_BYTES - elevenstNameBytes(String(s ?? '').replace(/\s+/g, ' ').trim())
export const PRICE_MAX = 999999990 // 10억 원 미만 · 10원 단위
export const is10Won = (n, min = 0, max = PRICE_MAX) => Number.isInteger(n) && n >= min && n <= max && n % 10 === 0

/** 출고지·반품지 기본 — 마지막으로 등록에 성공한 상품의 주소(lastId)가 목록에 있으면 그것, 없으면 목록 첫째 (해외 여부 칸이 없어 모두 국내로 본다) */
export function pickElevenstAddress(list, lastId = null) {
  const all = Array.isArray(list) ? list.filter(a => a && a.id) : []
  if (lastId != null) { const hit = all.find(a => a.id === String(lastId)); if (hit) return hit.id }
  return all[0]?.id ?? null
}

// 판매자 사전 준비·주소 관리 — 셀러오피스 첫 화면 (주소 관리 화면의 고유 주소는 확인 안 됨)
export const SELLER_OFFICE_URL = 'https://soffice.11st.co.kr/'

// ── 등록 템플릿(마켓 공용 값 — api/_listingTemplates.js) ↔ 11번가 섹션 칸 (2026-10-01) ──
// 11번가 코드로 바꾸는 일은 여기서만. 템플릿에 값이 없는 칸은 돌려주지 않는다(화면이 기본값을 그대로 둔다)
const nameToCode = (list, name) => (list.find(([, n]) => n === String(name ?? '').trim()) || [])[0] || ''
const codeToName = (list, code) => (list.find(([c]) => c === String(code ?? '')) || [])[1] || ''
const certLabelToCode = (group, label) => nameToCode(KC_CERT_TYPES[group] || [], label)
const isWon = v => Number.isInteger(v) && v >= 0

/**
 * 상품정보 템플릿 data → 섹션 칸 (일부)
 * 원산지 나라·지역 이름이 11번가 목록에 없으면 originCode = ''(판매자가 고른다 — 다른 나라로 바꾸지 않는다)
 * @returns {object} f에 덮어쓸 칸만 — brand·maker·country·phone·asDetail·rtngExchDetail·originKind·originCode·kc·kcCerts·noticeType·noticeItems
 */
export function elevenstFormFromProduct(data = {}) {
  const out = {}
  for (const [from, to] of [['brand', 'brand'], ['maker', 'maker'], ['country', 'country'], ['asContact', 'phone'], ['asGuide', 'asDetail'], ['returnGuide', 'rtngExchDetail']]) {
    const v = String(data?.[from] ?? '').trim()
    if (v) out[to] = v
  }
  const o = data?.origin || {}
  if (o.type === 'refer') { out.originKind = '03'; out.originCode = '' }
  else if (o.type === 'overseas') { out.originKind = '02'; out.originCode = nameToCode(ORIGIN_COUNTRIES, o.place) }
  else if (o.type === 'domestic') { out.originKind = '01'; out.originCode = nameToCode(ORIGIN_DOMESTIC, o.place) }
  const kc = data?.kc || {}
  if (KC_GROUPS.some(g => kc[g.key]?.choice)) {
    out.kc = {}
    out.kcCerts = {}
    for (const g of KC_GROUPS) {
      const v = kc[g.key] || {}
      const ok = (KC_CHOICES[g.code] || []).some(c => c.key === v.choice)
      out.kc[g.code] = ok ? v.choice : ''
      out.kcCerts[g.code] = { type: ok && v.choice === 'cert' ? certLabelToCode(g.code, v.certType) : '', key: ok && v.choice === 'cert' ? String(v.certNo ?? '').trim() : '' }
    }
  }
  const t = NOTICE_TYPES.find(x => x.name === String(data?.notice?.type ?? '').trim())
  if (t) {
    out.noticeType = t.code
    const items = data.notice.items || {}
    out.noticeItems = Object.fromEntries(t.items.filter(([code]) => ![...NOTICE_MAKER_CODES, ...NOTICE_COUNTRY_CODES, ...NOTICE_PHONE_CODES].includes(code))
      .map(([code, label]) => [code, String(items[label] ?? '').trim()]).filter(([, v]) => v))
  }
  return out
}
/** 배송 템플릿 data → 섹션 칸 (일부) — feeType·fee·freeOver·jejuFee·islandFee·returnFee·exchangeFee */
export function elevenstFormFromShipping(data = {}) {
  const out = {}
  const t = DELIVERY_FEE_TYPES.find(x => x.key === data?.feeType)
  if (t) {
    out.feeType = t.code
    out.fee = feeHasBase(t.code) && isWon(data.fee) ? data.fee : null
    out.freeOver = t.code === '03' && isWon(data.freeOver) ? data.freeOver : null
  }
  for (const f of ['jejuFee', 'islandFee', 'returnFee', 'exchangeFee']) if (isWon(data?.[f])) out[f] = data[f]
  return out
}
/** 섹션 칸 → 상품정보 템플릿 data (마켓 공용 값 — [현재 값으로 새 템플릿 저장]) */
export function productTemplateFromElevenstForm(f = {}) {
  const t = noticeTypeOf(f.noticeType)
  const s = v => String(v ?? '').trim()
  return {
    origin: f.originKind === '03' ? { type: 'refer', place: '' } : { type: f.originKind === '01' ? 'domestic' : 'overseas', place: codeToName(f.originKind === '01' ? ORIGIN_DOMESTIC : ORIGIN_COUNTRIES, f.originCode) },
    maker: s(f.maker), country: s(f.country), brand: s(f.brand), asContact: s(f.phone), asGuide: s(f.asDetail), returnGuide: s(f.rtngExchDetail),
    kc: Object.fromEntries(KC_GROUPS.map(g => {
      const choice = f.kc?.[g.code] || ''
      return [g.key, { choice, certType: choice === 'cert' ? codeToName(KC_CERT_TYPES[g.code] || [], f.kcCerts?.[g.code]?.type) : '', certNo: choice === 'cert' ? s(f.kcCerts?.[g.code]?.key) : '' }]
    })),
    notice: t ? { type: t.name, items: Object.fromEntries(t.items.map(([code, label]) => [label, s(f.noticeItems?.[code])]).filter(([, v]) => v && v !== NOTICE_DEFAULT_VALUE)) } : { type: '', items: {} },
  }
}
/** 섹션 칸 → 배송 템플릿 data */
export function shippingTemplateFromElevenstForm(f = {}) {
  const t = DELIVERY_FEE_TYPES.find(x => x.code === f.feeType)
  const n = v => (Number.isInteger(v) && v >= 0 ? v : null)
  return {
    feeType: t?.key || '', fee: t && feeHasBase(t.code) ? n(f.fee) : null, freeOver: t?.code === '03' ? n(f.freeOver) : null,
    jejuFee: n(f.jejuFee), islandFee: n(f.islandFee), returnFee: n(f.returnFee), exchangeFee: n(f.exchangeFee),
  }
}
