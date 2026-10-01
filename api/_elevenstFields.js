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
  const pick = (code) => {
    if (NOTICE_MAKER_CODES.includes(code)) return v.maker
    if (NOTICE_COUNTRY_CODES.includes(code)) return v.country
    if (NOTICE_PHONE_CODES.includes(code)) return v.phone
    return NOTICE_DEFAULT_VALUE
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
export const KC_GROUPS = [
  { code: '01', name: '전기용품·생활용품 KC인증' },
  { code: '02', name: '어린이제품 KC인증' },
  { code: '03', name: '방송통신기자재 KC인증' },
  { code: '04', name: '생활화학 및 살생물제품' },
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
//   실전 테스트 통과 후 이 값 하나만 true
export const ELEVENST_SEND_PUBLIC = false
// 부가세 — 01 과세 · 02 면세 (면세 선택 시 세무·법률 책임은 판매자 — 문서)
export const VAT_TYPES = [{ code: '01', name: '과세상품' }, { code: '02', name: '면세상품' }]
// 배송비 종류 — 01 무료 · 02 고정 배송비(dlvCst1)
export const DELIVERY_FEE_TYPES = [{ code: '01', name: '무료' }, { code: '02', name: '고정 배송비' }]
export const PRODUCT_NAME_MAX = 100 // 상품명 100자
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
