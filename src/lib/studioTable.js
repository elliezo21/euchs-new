/**
 * 사이즈표 요소 (11-2단계) — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-table.mjs)
 *
 * ★ 표 = 공통 칸(id, x, y, w, h, rotation, opacity, flipX, flipY, locked, hidden, groupId?) + type: 'table' +
 *     cells        문자열 2차원 배열 [행][열] — 행 1~20, 열 1~10, 모든 행의 칸 수가 같다. 칸 글자는 한 줄(줄바꿈·탭 = 공백), 칸당 30자까지
 *     headerRow    true | false — 첫 줄을 제목 줄로 (제목 줄 바탕·글자 색, 굵게)
 *     fontFamily   허용 목록의 키 (studioFonts.STUDIO_FONTS — 글자 요소와 같은 목록·규칙)
 *     fontSize     8~80 (페이지 px, 정수 — 글자 요소는 8~400이지만 표는 행 높이가 글자 크기를 따라가서 80까지)
 *     color        '#rrggbb' 칸 글자 색 · headerBg·headerColor 제목 줄 바탕·글자 색 · cellBg 칸 바탕
 *     borderColor  '#rrggbb' · borderWidth 0~6 (px, 정수, 0 = 선 없음)
 *     align        'left' | 'center'(기본) | 'right'
 * ★ 모양 규칙:
 *   - 열 폭 = w ÷ 열 수 (모두 같게). 최소 폭 = 열 수 × TABLE_MIN_COL_W
 *   - 행 높이 = round(fontSize × TABLE_ROW_RATIO(2.2)), h = 행 수 × 행 높이 — 늘 자동 (손으로 높이를 정하지 않는다)
 *   - 굵기는 칸이 아니라 규칙: 제목 줄 = 그 폰트의 700에 가까운 굵기, 나머지 = 400에 가까운 굵기 (nearestWeight)
 *   - 칸 글자는 한 줄. 칸 안 폭(열 폭 - 양옆 여백 fontSize×0.5)보다 길면 뒤를 잘라 "…"를 붙인다(뒤 공백은 뺌).
 *     "…"도 안 들어가면 빈칸. 폭은 글자 요소와 같은 measure(캔버스 measureText, studioFonts.createTextMeasure)로 잰다
 *   - 선: 칸 경계마다 두께 borderWidth의 띠. 가운데 기준이되 요소 네모(w×h) 밖으로 나가지 않게 안쪽으로 맞춘다(바깥 테두리는 안쪽으로)
 * ★ 그리는 규칙은 tablePaintSpec 하나 — 화면(StudioTableView의 SVG rect·text)과 내보내기(캔버스, 13단계)가 같은 값을 쓴다.
 *   캔버스: fills·lines = fillRect, texts = font 지정 → textAlign(anchor: start/middle/end → left/center/right) → textBaseline 'middle' → fillText(text, x, y)
 */
import { FONT_DEFAULT_KEY, isFontKey, nearestWeight } from './studioFonts.js'

export const TABLE_DEFAULTS = {
  headerRow: true, fontFamily: FONT_DEFAULT_KEY, fontSize: 18, color: '#333333',
  headerBg: '#f1f3f6', headerColor: '#111111', borderColor: '#d5d9e0', borderWidth: 1, cellBg: '#ffffff', align: 'center',
}
export const TABLE_LIMITS = { rows: [1, 20], cols: [1, 10], fontSize: [8, 80], borderWidth: [0, 6] }
export const TABLE_CELL_MAX = 30     // 칸당 글자 수
export const TABLE_ROW_RATIO = 2.2   // 행 높이 = 글자 크기 × 이 값
export const TABLE_PAD_RATIO = 0.5   // 칸 양옆 여백 = 글자 크기 × 이 값
export const TABLE_MIN_COL_W = 24    // 열 하나의 최소 폭 (페이지 px)
export const TABLE_ALIGNS = ['left', 'center', 'right']
/** 표 모양 칸 (속성 칸이 바꾸는 것 — cells는 따로) */
export const TABLE_STYLE_KEYS = Object.keys(TABLE_DEFAULTS)
export const TABLE_ELLIPSIS = '…'
const DEFAULT_CELLS = [['', ''], ['', '']]

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const COLOR_KEYS = new Set(['color', 'headerBg', 'headerColor', 'borderColor', 'cellBg'])
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))
const round2 = v => Math.round(v * 100) / 100

// ── 검사·정리 ──

const isBox = it => !!it && typeof it.id === 'string' && [it.x, it.y, it.w, it.h].every(Number.isFinite) && it.w > 0 && it.h > 0
/** 그릴 수 있는 표 요소 (cells 모양까지) */
export function isValidTableItem(it) {
  return isBox(it) && it.type === 'table' && Array.isArray(it.cells) && it.cells.length > 0
    && it.cells.every(r => Array.isArray(r) && r.length === it.cells[0].length && r.length > 0 && r.every(c => typeof c === 'string'))
}

/** 칸 글자 한 개 고쳐 읽기 — 한 줄(줄바꿈·탭 = 공백), TABLE_CELL_MAX자까지. 문자열이 아니면 숫자만 글자로, 그 밖은 빈칸 */
export function cleanCellText(v) {
  const s = typeof v === 'string' ? v : Number.isFinite(v) ? String(v) : ''
  return [...s.replace(/[\r\n\t]+/g, ' ')].slice(0, TABLE_CELL_MAX).join('')
}

/** cells 고쳐 읽기 — 행 1~20·열 1~10으로 자르고, 짧은 행은 빈칸으로 채운다. 배열이 아니거나 비었으면 undefined */
export function cleanCells(v) {
  if (!Array.isArray(v) || v.length === 0) return undefined
  const rows = v.slice(0, TABLE_LIMITS.rows[1]).map(r => (Array.isArray(r) ? r : []))
  const cols = clamp(Math.max(...rows.map(r => r.length)), TABLE_LIMITS.cols)
  return rows.map(r => Array.from({ length: cols }, (_, c) => cleanCellText(r[c])))
}

/** 모양 칸 한 개 고쳐 읽기 (잘못된 값 = undefined) */
function cleanStyleField(k, v) {
  if (k === 'headerRow') return typeof v === 'boolean' ? v : undefined
  if (k === 'fontFamily') return isFontKey(v) ? v : undefined
  if (k === 'align') return TABLE_ALIGNS.includes(v) ? v : undefined
  if (k === 'fontSize' || k === 'borderWidth') return Number.isFinite(v) ? Math.round(clamp(v, TABLE_LIMITS[k])) : undefined
  if (COLOR_KEYS.has(k)) return typeof v === 'string' && HEX_COLOR.test(v) ? v.toLowerCase() : undefined
  return undefined
}

export const tableRows = it => it.cells.length
export const tableCols = it => it.cells[0].length
/** 행 높이 (정수) */
export function tableRowHeight(it) { return Math.max(1, Math.round(it.fontSize * TABLE_ROW_RATIO)) }
/** 표 높이 = 행 수 × 행 높이 */
export function tableHeight(it) { return tableRows(it) * tableRowHeight(it) }
/** 최소 폭 = 열 수 × 최소 열 폭 */
export function tableMinWidth(it) { return tableCols(it) * TABLE_MIN_COL_W }

/** w를 최소 폭 이상, h를 자동 값으로. 같으면 입력 그대로 */
export function fitTableItem(it) {
  const w = Number.isFinite(it.w) ? Math.max(tableMinWidth(it), Math.round(it.w)) : it.w
  const h = tableHeight(it)
  return w === it.w && h === it.h ? it : { ...it, w, h }
}

/** 표 칸을 채운 복사본 — 빠지거나 잘못된 값은 기본값, cells는 모양을 맞추고, w·h를 맞춘다. 공통 칸·다른 칸은 그대로 (readPage에서도 거친다) */
export function normalizeTableItem(it) {
  if (!it || typeof it !== 'object') return it
  const out = { ...it, cells: cleanCells(it.cells) ?? DEFAULT_CELLS.map(r => [...r]) }
  for (const k of TABLE_STYLE_KEYS) out[k] = cleanStyleField(k, it[k]) ?? TABLE_DEFAULTS[k]
  return fitTableItem(out)
}

/** 모양 바꾸기 — patch의 모양 칸만(잘못된 값 무시). 글자 크기가 바뀌면 h 다시. 안 바뀌면 입력 그대로 */
export function patchTableItem(it, patch) {
  const next = { ...it }
  for (const k of TABLE_STYLE_KEYS) {
    if (!patch || !(k in patch)) continue
    const v = cleanStyleField(k, patch[k])
    if (v !== undefined) next[k] = v
  }
  return TABLE_STYLE_KEYS.every(k => next[k] === it[k]) ? it : fitTableItem(next)
}

// ── 칸·행·열 바꾸기 (요소 하나 — 할 수 없거나 안 바뀌면 입력 그대로) ──

/** 칸 하나 글자 */
export function setTableCell(it, r, c, text) {
  if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= tableRows(it) || c >= tableCols(it)) return it
  const t = cleanCellText(text)
  if (it.cells[r][c] === t) return it
  return { ...it, cells: it.cells.map((row, i) => (i === r ? row.map((v, j) => (j === c ? t : v)) : row)) }
}
/** 맨 아래에 빈 행 */
export function addTableRow(it) {
  if (tableRows(it) >= TABLE_LIMITS.rows[1]) return it
  return fitTableItem({ ...it, cells: [...it.cells, Array.from({ length: tableCols(it) }, () => '')] })
}
/** 맨 아래 행 빼기 (1행은 남는다) */
export function removeTableRow(it) {
  if (tableRows(it) <= TABLE_LIMITS.rows[0]) return it
  return fitTableItem({ ...it, cells: it.cells.slice(0, -1) })
}
/** 맨 오른쪽에 빈 열 (폭은 그대로 — 최소 폭보다 좁아지면 넓힌다) */
export function addTableCol(it) {
  if (tableCols(it) >= TABLE_LIMITS.cols[1]) return it
  return fitTableItem({ ...it, cells: it.cells.map(r => [...r, '']) })
}
/** 맨 오른쪽 열 빼기 (1열은 남는다) */
export function removeTableCol(it) {
  if (tableCols(it) <= TABLE_LIMITS.cols[0]) return it
  return fitTableItem({ ...it, cells: it.cells.map(r => r.slice(0, -1)) })
}
/**
 * 편집 한 번 — op = { kind: 'cell', r, c, text } | { kind: 'addRow' | 'removeRow' | 'addCol' | 'removeCol' }
 * 모르는 op·할 수 없으면 입력 그대로
 */
export function editTableItem(it, op) {
  switch (op?.kind) {
    case 'cell': return setTableCell(it, op.r, op.c, op.text)
    case 'addRow': return addTableRow(it)
    case 'removeRow': return removeTableRow(it)
    case 'addCol': return addTableCol(it)
    case 'removeCol': return removeTableCol(it)
    default: return it
  }
}

// ── 그리기 ──

/** 칸 글자를 maxW 안에 한 줄로 — 넘치면 뒤를 잘라 "…" (뒤 공백은 뺌). "…"도 안 들어가면 '' */
export function fitCellText(text, font, maxW, measure) {
  if (text === '' || !(maxW > 0)) return ''
  const fits = s => measure(s, font) <= maxW + 0.01 // 소수점 오차 (wrapLines와 같게)
  if (fits(text)) return text
  const chars = [...text]
  while (chars.length) {
    chars.pop()
    const head = chars.join('').trimEnd()
    if (head && fits(head + TABLE_ELLIPSIS)) return head + TABLE_ELLIPSIS
  }
  return fits(TABLE_ELLIPSIS) ? TABLE_ELLIPSIS : ''
}

/** 칸 글자 모양 (measure·캔버스 font에 넘김). header = 제목 줄 */
export function tableFontOf(it, header) {
  return { fontFamily: it.fontFamily, fontSize: it.fontSize, fontWeight: nearestWeight(it.fontFamily, header ? 700 : 400), letterSpacing: 0 }
}

/**
 * 표를 그릴 값 — 화면(SVG)·캔버스 공용. 좌표는 요소 기준 페이지 px (요소 왼쪽 위 = 0,0). 그리는 순서: fills → lines → texts.
 *   fills [{ x, y, w, h, color }]  행마다 바탕 (제목 줄 = headerBg, 나머지 = cellBg)
 *   lines [{ x, y, w, h, color }]  칸 경계 띠 (borderWidth 0이면 없음). 세로선 먼저, 가로선 나중
 *   texts [{ text, x, y, anchor, font, color }]  y = 행 가운데(글자 가운데 기준 — SVG dominant-baseline central = 캔버스 textBaseline 'middle'),
 *          anchor 'start' | 'middle' | 'end' (정렬 left·center·right). text는 fitCellText로 자른 것, 빈칸은 뺀다
 * @param {(s: string, font: object) => number} measure 글자 폭 (자간 없음)
 */
export function tablePaintSpec(it, measure) {
  const rows = tableRows(it), cols = tableCols(it)
  const W = it.w, rowH = tableRowHeight(it), H = rows * rowH, colW = W / cols
  const bw = Math.min(it.borderWidth, colW / 2, rowH / 2)
  const pad = it.fontSize * TABLE_PAD_RATIO
  const fills = []
  for (let r = 0; r < rows; r++) {
    fills.push({ x: 0, y: r * rowH, w: round2(W), h: rowH, color: it.headerRow && r === 0 ? it.headerBg : it.cellBg })
  }
  const lines = []
  if (bw > 0) {
    for (let j = 0; j <= cols; j++) lines.push({ x: round2(clamp(j * colW - bw / 2, [0, W - bw])), y: 0, w: bw, h: H, color: it.borderColor })
    for (let i = 0; i <= rows; i++) lines.push({ x: 0, y: round2(clamp(i * rowH - bw / 2, [0, H - bw])), w: round2(W), h: bw, color: it.borderColor })
  }
  const texts = []
  const anchor = it.align === 'left' ? 'start' : it.align === 'right' ? 'end' : 'middle'
  const maxW = colW - pad * 2 - bw
  for (let r = 0; r < rows; r++) {
    const header = it.headerRow && r === 0
    const font = tableFontOf(it, header)
    for (let c = 0; c < cols; c++) {
      const text = fitCellText(it.cells[r][c], font, maxW, measure)
      if (text === '') continue
      const x0 = c * colW
      const x = anchor === 'start' ? x0 + pad + bw / 2 : anchor === 'end' ? x0 + colW - pad - bw / 2 : x0 + colW / 2
      texts.push({ text, x: round2(x), y: round2(r * rowH + rowH / 2), anchor, font, color: header ? it.headerColor : it.color })
    }
  }
  return { w: round2(W), h: H, fills, lines, texts }
}

// ── [요소] 패널 "사이즈표" 기본 틀 (11-2) — 숫자 칸은 "-" (고객이 채운다) ──
const dash = n => Array.from({ length: n }, () => '-')
export const TABLE_TEMPLATES = [
  { key: 'top', label: '상의', w: 600, cells: [['사이즈', '가슴', '어깨', '총장', '소매'], ...['S', 'M', 'L', 'XL'].map(s => [s, ...dash(4)])] },
  { key: 'bottom', label: '하의', w: 600, cells: [['사이즈', '허리', '엉덩이', '허벅지', '총장'], ...['S', 'M', 'L', 'XL'].map(s => [s, ...dash(4)])] },
  { key: 'shoes', label: '신발', w: 360, cells: [['사이즈(mm)', '발볼'], ...['230', '240', '250', '260', '270'].map(s => [s, '-'])] },
]
export function tableTemplateByKey(key) { return TABLE_TEMPLATES.find(t => t.key === key) ?? null }
/** 기본 틀로 넣을 새 표 칸 (공통 칸·자리는 넣는 쪽이) */
export function tableFieldsOf(template) {
  return { type: 'table', w: template.w, cells: template.cells.map(r => [...r]) }
}

/** 레이어 목록 이름 */
export function tableLabel() { return '사이즈표' }
