/**
 * 엑셀 대량발주 — 업로드 파일 파서 + 양식 다운로드
 *
 * 기존 utils/excelHandler.js의 parseOrderExcel과는 별개다.
 * 그쪽은 내상품리스트 레거시 경로(localStorage) 전용이고 검증이 느슨하다
 * (URL 없어도 통과, 수량 없으면 1로 채움). 이번 기능은 그 두 가지를 모두 막아야 해서
 * 새로 쓴다. 기존 함수는 건드리지 않는다.
 *
 * ★ xlsx는 동적 import — 장바구니 화면 진입만으로 1MB 넘는 라이브러리를 받지 않게 한다.
 *   실제 로드는 "양식 다운로드" 또는 "파일 선택" 시점에만 일어난다.
 */

// 확장자를 붙여 두면 Vite 외에 순수 node로도 이 모듈을 불러 테스트할 수 있다
// (data/guideData.js 도 같은 방식)
import { extractOfferIdLoose } from './offerId.js'

// ── 제한 (서버 호출 전에 클라이언트에서 막는다) ──────────────────────────────
export const MAX_ROWS = 200              // 줄 수
export const MAX_UNIQUE_OFFERS = 30      // 서로 다른 상품(offerId) 수

// 표준 양식 헤더
const HEADER_URL = '1688 상품 URL (필수)'
const HEADER_QTY = '수량 (필수)'
const HEADER_OPT = '옵션 (선택: 색상/사이즈)'

/** 헤더 매칭 후보 — 고객이 양식을 조금 바꿔도 읽히도록 */
const URL_KEYS = ['1688 상품 url', '상품 url', '1688 url', 'url', '링크', 'link', '주소', '상품주소', '상품링크']
const QTY_KEYS = ['수량', 'quantity', 'qty', '개수', 'count']
const OPT_KEYS = ['옵션', 'option', 'sku', '색상', '규격', '사이즈', 'spec']

/**
 * 행 객체에서 후보 키 중 하나에 해당하는 값을 꺼낸다.
 * 1순위 정확 일치 → 2순위 부분 포함 (헤더에 "(필수)" 같은 꼬리표가 붙어 있어도 매칭)
 */
function pickCell(row, keys) {
  const rowKeys = Object.keys(row)
  for (const k of keys) {
    const exact = rowKeys.find(rk => rk.trim().toLowerCase() === k)
    if (exact && row[exact] !== undefined && row[exact] !== null && String(row[exact]).trim() !== '') {
      return String(row[exact]).trim()
    }
  }
  for (const k of keys) {
    const partial = rowKeys.find(rk => rk.trim().toLowerCase().includes(k))
    if (partial && row[partial] !== undefined && row[partial] !== null && String(row[partial]).trim() !== '') {
      return String(row[partial]).trim()
    }
  }
  return ''
}

/**
 * 수량 검증 — 1 이상의 정수만 통과.
 * ★ 기본값으로 채우지 않는다 (CLAUDE.md 3-9). 빈칸·0·음수·소수·글자는 전부 오류.
 * @returns {{ value: number|null, error: string|null }}
 */
export function parseQuantityCell(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return { value: null, error: '수량을 입력해 주세요' }

  // 엑셀에서 "100개", "1,000" 같은 표기가 올 수 있어 쉼표만 제거하고 판정한다.
  // (단위 글자까지 허용하면 "1개 2박스" 같은 모호한 값이 통과한다)
  const cleaned = s.replace(/,/g, '')
  if (!/^\d+$/.test(cleaned)) {
    return { value: null, error: '수량은 1 이상의 정수만 입력해 주세요' }
  }
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 1) {
    return { value: null, error: '수량은 1 이상이어야 합니다' }
  }
  return { value: n, error: null }
}

/** 안내 줄(※로 시작) 판정 */
function isGuideRow(values) {
  return values.some(v => String(v || '').trim().startsWith('※'))
}

/**
 * 시트 JSON 배열 → 줄별 결과.
 * 순수 함수 — 파일 없이 테스트 가능하도록 xlsx 파싱과 분리했다.
 *
 * @param {Array<Object>} rawRows - XLSX.utils.sheet_to_json 결과
 * @returns {{ rows: Array, fatalErrors: string[], uniqueOfferIds: string[] }}
 *   rows: [{ rowNo, rawUrl, offerId, quantity, optionText, errors: string[] }]
 *   fatalErrors: 제한 초과 등 "표를 못 띄우는" 전체 오류 (있으면 서버 호출 금지)
 */
export function buildRowsFromSheetJson(rawRows) {
  const rows = []
  const fatalErrors = []

  const list = Array.isArray(rawRows) ? rawRows : []

  list.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return

    const values = Object.values(row)
    // 완전 빈 줄 건너뛰기
    if (values.every(v => String(v ?? '').trim() === '')) return
    // 양식에 들어 있는 ※ 안내 줄 건너뛰기
    if (isGuideRow(values)) return

    const rawUrl = pickCell(row, URL_KEYS)
    const rawQty = pickCell(row, QTY_KEYS)
    const optionText = pickCell(row, OPT_KEYS)

    const errors = []

    // URL
    let offerId = null
    if (!rawUrl) {
      errors.push('URL을 확인해 주세요')
    } else {
      offerId = extractOfferIdLoose(rawUrl)
      if (!offerId) errors.push('URL을 확인해 주세요')
    }

    // 수량
    const qtyResult = parseQuantityCell(rawQty)
    if (qtyResult.error) errors.push(qtyResult.error)

    rows.push({
      rowNo: idx + 2,           // 사람이 보는 엑셀 줄 번호 (1줄은 헤더)
      rawUrl,
      offerId,
      quantity: qtyResult.value,
      optionText,
      errors,
    })
  })

  // ── 제한 검사 — 서버를 부르기 전에 막는다 ──
  if (rows.length > MAX_ROWS) {
    fatalErrors.push(`줄이 너무 많습니다. 한 번에 최대 ${MAX_ROWS}줄까지 올릴 수 있습니다. (현재 ${rows.length}줄)`)
  }
  const uniqueOfferIds = [...new Set(rows.map(r => r.offerId).filter(Boolean))]
  if (uniqueOfferIds.length > MAX_UNIQUE_OFFERS) {
    fatalErrors.push(`상품 종류가 너무 많습니다. 한 번에 최대 ${MAX_UNIQUE_OFFERS}개까지 올릴 수 있습니다. (현재 ${uniqueOfferIds.length}개)`)
  }
  if (rows.length === 0) {
    fatalErrors.push('읽을 수 있는 줄이 없습니다. 표준 양식을 내려받아 작성한 뒤 올려 주세요.')
  }

  return { rows, fatalErrors, uniqueOfferIds }
}

/**
 * 업로드된 엑셀 파일 파싱 (xlsx 동적 import).
 * @param {File|Blob} file
 * @returns {Promise<{ rows, fatalErrors, uniqueOfferIds }>}
 */
export async function parseBulkOrderExcel(file) {
  if (!file) throw new Error('업로드할 파일이 선택되지 않았습니다.')
  if (!(file instanceof Blob)) throw new Error('유효하지 않은 파일 객체 형식입니다.')
  if (file.size === 0) throw new Error('파일의 용량이 0바이트인 빈 파일입니다.')

  const XLSX = await import('xlsx')

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  if (!workbook?.SheetNames?.length) {
    throw new Error('엑셀 파일 내에 유효한 시트가 존재하지 않습니다.')
  }

  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!worksheet) return { rows: [], fatalErrors: ['첫 번째 시트를 읽지 못했습니다.'], uniqueOfferIds: [] }

  // raw:false → 셀을 문자열로 받아 엑셀의 숫자 서식(1.0E+11 등) 왜곡을 피한다
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false })
  return buildRowsFromSheetJson(rawRows)
}

/**
 * 표준 양식 다운로드 (xlsx 동적 import).
 * 칸 3개 — URL(필수) / 수량(필수) / 옵션(선택).
 */
export async function downloadBulkTemplate() {
  const XLSX = await import('xlsx')

  const header = [HEADER_URL, HEADER_QTY, HEADER_OPT]
  const samples = [
    // 같은 상품을 색상별로 여러 줄에 적는 예시 (대량발주에서 가장 흔한 형태)
    ['https://detail.1688.com/offer/1081981728994.html', 100, '자주빛 헤어밴드'],
    ['https://detail.1688.com/offer/1081981728994.html', 50, '빨간색과 파란색 헤어밴드'],
    // 옵션을 비워 두면 업로드 후 화면에서 고르는 예시
    ['https://detail.1688.com/offer/1051826478228.html', 200, ''],
  ]
  const guide = [
    '※ 이 줄은 지우고 입력하세요. 1688 상품 상세페이지 주소를 그대로 붙여넣으면 됩니다.',
    '※ 숫자만 입력 (1 이상). 비우면 오류로 표시됩니다.',
    '※ 비워 두면 업로드 후 화면에서 옵션을 고를 수 있습니다.',
  ]

  const ws = XLSX.utils.aoa_to_sheet([header, ...samples, guide])
  ws['!cols'] = [{ wch: 52 }, { wch: 14 }, { wch: 30 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '대량발주')
  XLSX.writeFile(wb, 'EUCHS_대량발주_양식.xlsx')
}
