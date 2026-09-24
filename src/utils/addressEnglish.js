/**
 * 사업장 주소 영문 표기 공용 헬퍼
 * 쓰는 곳: AccountSettingsView(통관정보 사업장 주소), TtRemittanceModal(T/T 인보이스 BUYER 주소)
 */

/**
 * 상세주소 → 영문 상세 (단순 패턴만). 규칙에 안 맞으면 '' (고객이 직접 입력).
 *   "1층"→"1F", "지하1층"/"B1층"→"B1F", "101호"→"#101",
 *   "101동 202호"→"#202, Bldg 101", "2층 201호"→"#201, 2F"
 */
export function convertDetailToEnglish(detail) {
  const s = String(detail || '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  const floorEn = (basement, n) => `${basement ? 'B' : ''}${Number(n)}F`
  let m
  if ((m = s.match(/^(지하\s*|B)?(\d+)\s*층$/i))) return floorEn(m[1], m[2])
  if ((m = s.match(/^(\d+)\s*호$/))) return `#${m[1]}`
  if ((m = s.match(/^(\d+)\s*동\s*(\d+)\s*호$/))) return `#${m[2]}, Bldg ${m[1]}`
  if ((m = s.match(/^(지하\s*|B)?(\d+)\s*층\s*(\d+)\s*호$/i))) return `#${m[3]}, ${floorEn(m[1], m[2])}`
  return ''
}

const INVOICE_BUYER_COUNTRY = 'Republic of Korea'

/**
 * T/T 인보이스 BUYER 주소 표시값: "{영문상세}, {영문도로명}, Republic of Korea"
 * DB에는 국가명을 저장하지 않고 표시할 때만 붙인다. 이미 끝이 Korea면(예: "..., Korea.") 중복으로 붙이지 않는다.
 * 쓰는 곳: TtRemittanceModal(고객), AdminTtInvoicePanel(관리자) — 미리보기·PDF 공통
 */
export function formatInvoiceBuyerAddress(roadEn, detailEn) {
  const raw = formatEnglishAddress(roadEn, detailEn)
  if (!raw) return ''
  return /\bkorea[\s.]*$/i.test(raw) ? raw : `${raw}, ${INVOICE_BUYER_COUNTRY}`
}

/** 영문 최종 표기: "{영문상세}, {영문도로명}" (도로명이 없으면 '') */
export function formatEnglishAddress(roadEn, detailEn) {
  const road = String(roadEn || '').trim()
  const detail = String(detailEn || '').trim()
  if (!road) return ''
  return detail ? `${detail}, ${road}` : road
}
