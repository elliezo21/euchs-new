/**
 * 등록 템플릿(설정값 묶음) — 마켓 공용 값 (2026-10-01, 순수 — import 없음, 브라우저 번들에 들어가도 된다)
 * 두 종류 (업계 표준 방식 — 상품정보 묶음 + 배송 묶음):
 *   product  상품정보 템플릿: 원산지·제조자/수입자·제조국·브랜드·A/S 연락처·A/S 안내·반품/교환 안내·KC 4개 그룹·상품정보고시
 *   shipping 배송 템플릿:     배송비 방식(무료·고정·조건부 무료)·제주/도서산간 추가비·반품(편도)·교환(왕복) 배송비
 * 출고지·반품지는 넣지 않는다 — 마켓별 주소록 + "마지막 사용 기억" 그대로
 *
 * 값은 마켓 코드가 아니라 뜻으로 담는다 (원산지 = 이름, KC = 뜻 키, 고시 = 유형 이름 + 항목 이름).
 * 마켓 코드로 바꾸는 일은 마켓 파일에서만 (11번가 = api/_elevenstFields.js elevenstFormFromTemplate·templateFromElevenstForm)
 * 저장 표 = public.marketplace_listing_templates (docs/sql/2026-10-01-marketplace-listing-templates.sql — data jsonb 한 칸)
 */

export const TEMPLATE_KINDS = [
  { key: 'product', name: '상품정보 템플릿' },
  { key: 'shipping', name: '배송 템플릿' },
]
export const TEMPLATE_NAME_MAX = 50
export const TEXT_MAX = 50 // 고시 칸과 같은 길이 (제조자·제조국·브랜드·연락처)
export const GUIDE_MAX = 1000 // A/S 안내·반품/교환 안내
export const FEE_MAX = 1000000

// 원산지 종류 — place = 나라·지역 이름(마켓 파일이 자기 코드로 바꾼다)
export const ORIGIN_TYPES = [{ key: 'overseas', name: '해외' }, { key: 'domestic', name: '국내' }, { key: 'refer', name: '상세설명 참조' }]
// KC 그룹(법 분류 — 마켓 공통) · 고르는 값은 뜻 키
export const KC_KEYS = [
  { key: 'living', name: '전기용품·생활용품 KC인증' },
  { key: 'kids', name: '어린이제품 KC인증' },
  { key: 'radio', name: '방송통신기자재 KC인증' },
  { key: 'chemical', name: '생활화학 및 살생물제품' },
]
export const KC_CHOICE_KEYS = ['cert', 'agent', 'parallel', 'none'] // 인증대상 · 면제(구매대행) · 면제(병행수입) · 대상 아님
// 배송비 방식
export const SHIP_FEE_TYPES = [{ key: 'free', name: '무료' }, { key: 'fixed', name: '고정 배송비' }, { key: 'conditional', name: '조건부 무료' }]

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
/** 금액 — 정수만, 아니면 null (빈칸). 임의 숫자로 채우지 않는다 */
const won = v => (v === '' || v == null ? null : Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : null)

export function blankProductData() {
  return {
    origin: { type: '', place: '' }, maker: '', country: '', brand: '', asContact: '', asGuide: '', returnGuide: '',
    kc: Object.fromEntries(KC_KEYS.map(g => [g.key, { choice: '', certType: '', certNo: '' }])),
    notice: { type: '', items: {} },
  }
}
export function blankShippingData() {
  return { feeType: '', fee: null, freeOver: null, jejuFee: null, islandFee: null, returnFee: null, exchangeFee: null }
}

/** 저장·적용 전 정리 — 모르는 칸은 버리고, 글자는 길이를 자르고, 금액은 정수 또는 null */
export function normalizeProductData(raw) {
  const r = obj(raw), o = obj(r.origin), k = obj(r.kc), n = obj(r.notice)
  const out = blankProductData()
  out.origin = { type: ORIGIN_TYPES.some(t => t.key === o.type) ? o.type : '', place: o.type === 'refer' ? '' : str(o.place, 20) }
  for (const f of ['maker', 'country', 'brand', 'asContact']) out[f] = str(r[f], TEXT_MAX)
  out.asGuide = str(r.asGuide, GUIDE_MAX)
  out.returnGuide = str(r.returnGuide, GUIDE_MAX)
  for (const g of KC_KEYS) {
    const v = obj(k[g.key])
    const choice = KC_CHOICE_KEYS.includes(v.choice) ? v.choice : ''
    out.kc[g.key] = { choice, certType: choice === 'cert' ? str(v.certType, 60) : '', certNo: choice === 'cert' ? str(v.certNo, TEXT_MAX) : '' }
  }
  const items = {}
  for (const [label, value] of Object.entries(obj(n.items)).slice(0, 40)) {
    const l = str(label, 200), v = str(value, TEXT_MAX)
    if (l && v) items[l] = v
  }
  out.notice = { type: str(n.type, 60), items }
  return out
}
export function normalizeShippingData(raw) {
  const r = obj(raw)
  const feeType = SHIP_FEE_TYPES.some(t => t.key === r.feeType) ? r.feeType : ''
  return {
    feeType,
    fee: feeType === 'fixed' || feeType === 'conditional' ? won(r.fee) : null,
    freeOver: feeType === 'conditional' ? won(r.freeOver) : null,
    jejuFee: won(r.jejuFee), islandFee: won(r.islandFee), returnFee: won(r.returnFee), exchangeFee: won(r.exchangeFee),
  }
}
export const normalizeTemplateData = (kind, raw) => (kind === 'shipping' ? normalizeShippingData(raw) : normalizeProductData(raw))

/**
 * 저장 전 검사 — 템플릿은 일부만 채워도 된다(빈칸은 보낼 때 채움). 이름·금액 모양만 본다
 * @returns {{ ok:true, value:{ kind, name, data } } | { ok:false, message }}  문구는 합니다체
 */
export function validateListingTemplate(kind, name, data) {
  if (!TEMPLATE_KINDS.some(k => k.key === kind)) return { ok: false, message: '템플릿 종류를 선택하세요.' }
  const nm = str(name, TEMPLATE_NAME_MAX + 1)
  if (!nm) return { ok: false, message: '템플릿 이름을 입력하세요.' }
  if ([...nm].length > TEMPLATE_NAME_MAX) return { ok: false, message: `템플릿 이름은 ${TEMPLATE_NAME_MAX}자까지 입력할 수 있습니다.` }
  const d = normalizeTemplateData(kind, data)
  if (kind === 'shipping') {
    const r = obj(data)
    const fields = [['fee', '배송비'], ['freeOver', '무료 기준 금액'], ['jejuFee', '제주 추가 배송비'], ['islandFee', '도서산간 추가 배송비'], ['returnFee', '반품 배송비'], ['exchangeFee', '교환 배송비']]
    for (const [f, label] of fields) {
      const given = r[f] !== '' && r[f] != null && !(f === 'fee' && !['fixed', 'conditional'].includes(d.feeType)) && !(f === 'freeOver' && d.feeType !== 'conditional')
      if (given && (d[f] == null || d[f] % 10 !== 0 || d[f] > FEE_MAX)) return { ok: false, message: `${label}: 10원 단위로 입력하세요.` }
    }
  }
  return { ok: true, value: { kind, name: nm, data: d } }
}

/** 창을 열 때 고를 템플릿 — 그 종류의 기본 템플릿, 없으면 null(아무것도 고르지 않음) */
export function pickDefaultTemplate(list, kind) {
  const all = (Array.isArray(list) ? list : []).filter(t => t && t.kind === kind)
  return all.find(t => t.is_default === true) || null
}
/** 이름 겹침 피하기 — "이름 (2)", "이름 (3)" … (복사·새로 저장) */
export function uniqueTemplateName(name, list, kind) {
  const taken = new Set((Array.isArray(list) ? list : []).filter(t => t && t.kind === kind).map(t => t.name))
  const base = str(name, TEMPLATE_NAME_MAX) || '새 템플릿'
  if (!taken.has(base)) return base
  for (let i = 2; i < 1000; i++) {
    const suffix = ` (${i})`
    const n = `${[...base].slice(0, TEMPLATE_NAME_MAX - suffix.length).join('')}${suffix}`
    if (!taken.has(n)) return n
  }
  return base
}

// 템플릿이 하나도 없는 판매자에게 권하는 예시 (저장하지 않는다 — 고쳐서 [저장]해야 생긴다)
//   KC는 판매자가 직접 판단해야 하므로 비워 둔다. 금액·연락처·제조자도 판매자마다 달라 비워 둔다(임의 숫자 없음)
export const SAMPLE_TEMPLATE = {
  product: {
    name: '중국산 생활잡화',
    data: {
      origin: { type: 'overseas', place: '중국' }, maker: '', country: '중국', brand: '', asContact: '',
      asGuide: '제품 하자 시 수령 후 7일 이내 판매자 연락처로 문의',
      returnGuide: '수령 후 7일 이내 반품·교환 가능. 단순 변심 시 왕복 배송비 구매자 부담',
      notice: { type: '기타 재화', items: {} },
    },
  },
  shipping: {
    name: '기본 택배',
    data: { feeType: 'fixed' },
  },
}
export const sampleTemplate = kind => {
  const s = SAMPLE_TEMPLATE[kind]
  return s ? { kind, name: s.name, data: normalizeTemplateData(kind, s.data) } : null
}
