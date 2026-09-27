/**
 * 원클릭 AI 자동 제작 (원클릭 1단계) — 순수 함수 + 순서 진행기 (DOM·DB 없음, node 테스트: scripts/test-studio-autobuild.mjs)
 *
 * ★ 흐름 (해성 결정 2026-09-27): 사진 고르기 → 글자 찾기(OCR) + 자동 지우기(LaMa) → 템플릿 배치 → 글자 초안 → 편집기에서 검수.
 *   결과는 수동 편집과 같은 저장 형식이다 — 지운 곳 = studio_images.edit.layers의 AI 지우기 레이어(+ patches/ PNG),
 *   페이지 = studio_projects.page(템플릿 적용과 같은 buildTemplatePage). 그래서 편집기가 곧 검수 화면이고, 원클릭 전용 편집 화면은 없다.
 *   돈이 드는 외부 AI(fal 배경 지우기·AI 배경)는 부르지 않는다. 브라우저 무료 기능(OCR·LaMa)만.
 *
 * ★ 자동 지우기 = "글자만"(띠·상자까지 지우기는 고객이 고르는 기능 — 이번 단계 아님):
 *   한자가 1자 이상인 OCR 줄 → 그 줄 네모(축 정렬) → 지우기 레이어 { type:'fill', method:'ai', pad: AUTO_PAD, auto: true }.
 *   메우는 범위 = 사방 max(pad, k) — 편집기 [AI로 지우기]와 같은 계산(studioFillPlan·aiGeometry, 랩 "base" 규칙과 같음: 줄 상자 + k).
 *   가까운 줄은 합친다(mergeRects — 합친 네모가 따로일 때보다 MERGE_SLACK배 이상 커지면 합치지 않음 → 줄 사이 사진을 덜 지운다).
 *   한 조각이 너무 크면 나눈다(splitRect — 메우는 범위 가로·세로 PIECE_MAX 이하. 계획 메모 "20MB 넘는 조각은 나눠서"),
 *   저장 때 그래도 크면(patch_too_large) 긴 쪽으로 반씩 나눠 다시(splitLayer, 두 번까지).
 *   auto: true = 원클릭이 넣은 레이어 표시 — [원본으로]가 이것만 뺀다(고객이 직접 칠한 레이어는 그대로). 계산 key(ownKey)에는 안 들어간다.
 *
 * ★ 사진 표시(edit.auto — studio_images.edit 안, DB 스키마 변경 없음):
 *   { v: 1, status, reason?, lines, han, ratio, px, left?, at }
 *     status 'erased'(지움) | 'clean'(찾은 한자 없음) | 'textHeavy'(글자 많음 — 지우지 않고 페이지에서 뺌) | 'failed'(실패 — 원본 그대로, 사유 reason)
 *            | 'textLeft'(review-1: 고객이 전에 손으로 지운 사진 — 자동 지우기는 안 하고, 지우지 않은 곳에 한자가 남음. left = 남은 줄 수)
 *     px = 표시를 남길 때의 픽셀 레이어(지우기·덮기) 수 — 그 뒤 고객이 레이어를 더하거나 빼면 "확인 필요"가 풀린다(reviewMark)
 *   사진 이력에는 넣지 않는다(되돌려도 표시는 남는다). 레이어만 이력 — "자동 지우기" 한 칸, [원본으로] 한 칸(Ctrl+Z로 되돌림).
 *   "확인 필요"는 문제 있는 사진에만: 지우기 실패 · 글자 많음 · 글자 남음 (review-1 — 잘 지운 사진에는 아무 표시도 없음)
 *
 * ★ 선별 규칙·기준값은 이 파일 상수 (근거는 원클릭 1단계 보고서 3장):
 *   처리 순서 = 대표(1688 갤러리 첫 장) → 내 사진 → 상세 사진(순서 그대로) → 나머지 갤러리. 준비 끝(done) + 안 쓸 사진 아님(included)만.
 *   너무 작은 사진(짧은 변 < MIN_SIDE) 제외 · 거의 같은 사진(dHash 64비트 차이 ≤ DUP_BITS) 제외 · 처리 상한 PROCESS_MAX장(나머지는 목록에만).
 *   글자 많음 = 한자 줄 네모가 사진 면적의 TEXT_HEAVY_RATIO 이상 또는 한자 TEXT_HEAVY_HAN자 이상 (또는 지울 조각이 AUTO_MAX_LAYERS 넘음).
 */
import { aiK } from './studioAi/aiGeometry.js'
import { writeRect } from './studioFillPlan.js'
import { buildTemplatePage, templateByKey } from './studioTemplates.js'
import { normalizeTableItem, tableHeight, TABLE_CELL_MAX } from './studioTable.js'

export const AUTO_VERSION = 1
export const PROCESS_MAX = 30          // 한 번에 처리할 사진 수 (나머지는 원본으로 목록에만)
export const MIN_SIDE = 300            // 짧은 변이 이보다 작으면 페이지에 넣지 않음 (아이콘·작은 조각)
export const DUP_BITS = 5              // dHash 64비트 중 다른 비트가 이 이하면 거의 같은 사진
export const TEXT_HEAVY_RATIO = 0.22   // 한자 줄 네모 넓이 / 사진 넓이
export const TEXT_HEAVY_HAN = 100      // 한자 수
export const AUTO_MAX_LAYERS = 40      // 사진 한 장에 원클릭이 넣는 지우기 레이어 최대 (studioEdit.MAX_LAYERS 60 — 고객이 더 칠할 자리를 남김)
export const PIECE_MAX = 1024          // 지우기 조각 하나(메우는 범위)의 가로·세로 최대 px
export const MERGE_SLACK = 1.3         // 합친 조각 넓이 ≤ 따로 넓이 합 × 이 값일 때만 합친다
export const AUTO_PAD = 4              // = studioEdit.PAD_DEFAULT (편집기 새 영역 기본값과 같게 — 테스트로 고정)
export const SPLIT_DEPTH_MAX = 2       // 저장 때 너무 커서 나누기(splitLayer) 최대 횟수
export const AUTO_TEMPLATE_KEY = 'basic'
export const AUTO_GAP = 30             // review-1: 원클릭 페이지의 구간 간격(px, 폭 780 기준 — 기존 [구간 간격] page.gap 그대로. 직접 만들기 기본값 0은 그대로)
export const LEFT_COVER_MIN = 0.5      // 글자 남음: 한자 줄 네모가 이미 있는 지우기·덮기 범위에 이 비율 미만으로 덮였으면 "남음"

// ── 한자 판정 (랩 lib/common.js와 같은 범위: CJK 통합 한자 + 확장 A + 호환 한자. 전각 구두점·숫자는 한자가 아님) ──
const HAN_RE = /[㐀-䶿一-鿿豈-﫿]/g
export function hanCount(s) { return (String(s ?? '').match(HAN_RE) || []).length }
export function isChineseLine(line) { return hanCount(line?.text) >= 1 }

// ── 네모 ──
const area = r => r.w * r.h
function clampRect(x0, y0, x1, y1, W, H) {
  const x = Math.max(0, Math.min(W, Math.floor(x0))), y = Math.max(0, Math.min(H, Math.floor(y0)))
  const xe = Math.max(0, Math.min(W, Math.ceil(x1))), ye = Math.max(0, Math.min(H, Math.ceil(y1)))
  return { x, y, w: xe - x, h: ye - y }
}
function grow(r, k, W, H) { return clampRect(r.x - k, r.y - k, r.x + r.w + k, r.y + r.h + k, W, H) }
function overlaps(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h }
function union(a, b) {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/** OCR 줄(네 꼭짓점) → 축 정렬 네모 (원본 안으로, 정수) */
export function lineRect(line, W, H) {
  const xs = line.box.map(p => p[0]), ys = line.box.map(p => p[1])
  return clampRect(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), W, H)
}

/**
 * 글자 양 — 한자 줄 수·한자 수·한자 줄 네모가 덮는 넓이 비율(겹침은 한 번만: 4px 격자)
 * @returns {{ lines: number, han: number, ratio: number }}
 */
export function textStats(lines, W, H) {
  const zh = (lines || []).filter(isChineseLine)
  const G = 4, gw = Math.max(1, Math.ceil(W / G)), gh = Math.max(1, Math.ceil(H / G))
  const grid = new Uint8Array(gw * gh)
  let han = 0
  for (const l of zh) {
    han += hanCount(l.text)
    const r = lineRect(l, W, H)
    const x0 = Math.floor(r.x / G), x1 = Math.ceil((r.x + r.w) / G), y0 = Math.floor(r.y / G), y1 = Math.ceil((r.y + r.h) / G)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) grid[y * gw + x] = 1
  }
  let n = 0
  for (const v of grid) n += v
  return { lines: zh.length, han, ratio: +(n / (gw * gh)).toFixed(4) }
}

/** 글자 많음 — 지워도 쓰기 어려운 사진 (검수에서 빼기·교체를 먼저 권한다) */
export function isTextHeavy(stats) {
  return stats.ratio >= TEXT_HEAVY_RATIO || stats.han >= TEXT_HEAVY_HAN
}

/**
 * 가까운 줄 합치기 — 넓힌 범위(사방 k)가 겹치고, 합친 네모(넓힌 것)가 따로 넓이 합 × MERGE_SLACK 이하일 때만. 더 합칠 게 없을 때까지
 * @param {{x,y,w,h}[]} rects  @returns 새 배열 (위 → 아래, 왼 → 오른 순)
 */
export function mergeRects(rects, k, W, H) {
  let list = rects.filter(r => r.w > 0 && r.h > 0).map(r => ({ ...r }))
  for (let changed = true; changed;) {
    changed = false
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const gi = grow(list[i], k, W, H), gj = grow(list[j], k, W, H)
        if (!overlaps(gi, gj)) continue
        const u = union(list[i], list[j])
        if (area(grow(u, k, W, H)) > MERGE_SLACK * (area(gi) + area(gj))) continue
        list = [...list.slice(0, i), u, ...list.slice(i + 1, j), ...list.slice(j + 1)]
        changed = true
        break outer
      }
    }
  }
  return list.sort((a, b) => a.y - b.y || a.x - b.x)
}

/** 메우는 범위(사방 k)가 PIECE_MAX를 넘으면 격자로 나눈다 (나눈 조각은 원래 네모를 빈틈없이 덮는다) */
export function splitRect(r, k, max = PIECE_MAX) {
  const inner = Math.max(1, max - 2 * k)
  const nx = Math.max(1, Math.ceil(r.w / inner)), ny = Math.max(1, Math.ceil(r.h / inner))
  if (nx === 1 && ny === 1) return [{ ...r }]
  const out = []
  for (let j = 0; j < ny; j++) {
    const y0 = r.y + Math.round((r.h * j) / ny), y1 = r.y + Math.round((r.h * (j + 1)) / ny)
    for (let i = 0; i < nx; i++) {
      const x0 = r.x + Math.round((r.w * i) / nx), x1 = r.x + Math.round((r.w * (i + 1)) / nx)
      if (x1 > x0 && y1 > y0) out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })
    }
  }
  return out
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
/** 지우기 레이어 id — studioEdit.newFillId와 같은 모양 'f_' + 6자 (서버 patch 경로 규칙 /^f_[a-z0-9]{6}$/) */
export function autoFillId() {
  const buf = new Uint32Array(6)
  globalThis.crypto.getRandomValues(buf)
  let s = 'f_'
  for (const n of buf) s += ID_CHARS[n % ID_CHARS.length]
  return s
}

/**
 * OCR 줄 → 원클릭 지우기 레이어 (계산 전 — ai 없음)
 * @returns {{ layers: object[], tooMany: boolean }}  tooMany = 조각이 AUTO_MAX_LAYERS를 넘음 (글자 많음으로 친다)
 */
export function planAutoLayers(lines, W, H, idOf = autoFillId) {
  const k = aiK(W, H)
  const rects = (lines || []).filter(isChineseLine).map(l => lineRect(l, W, H)).filter(r => r.w > 0 && r.h > 0)
  const pieces = mergeRects(rects, k, W, H).flatMap(r => splitRect(r, k))
  if (pieces.length > AUTO_MAX_LAYERS) return { layers: [], tooMany: true }
  return { layers: pieces.map(r => ({ id: idOf(), type: 'fill', x: r.x, y: r.y, w: r.w, h: r.h, pad: AUTO_PAD, method: 'ai', auto: true })), tooMany: false }
}

/** 저장 때 너무 큰 조각(patch_too_large) — 긴 쪽으로 반씩 나눈 두 레이어 (새 id, ai 없음). 더 못 나누면 null */
export function splitLayer(l, idOf = autoFillId) {
  const vertical = l.h >= l.w
  const len = vertical ? l.h : l.w
  if (len < 2) return null
  const a = Math.floor(len / 2)
  const { ai: _ai, ...base } = l
  return vertical
    ? [{ ...base, id: idOf(), h: a }, { ...base, id: idOf(), y: l.y + a, h: l.h - a }]
    : [{ ...base, id: idOf(), w: a }, { ...base, id: idOf(), x: l.x + a, w: l.w - a }]
}

// ── 사진 표시 (edit.auto) ──
export const AUTO_STATUSES = ['erased', 'clean', 'textHeavy', 'failed', 'textLeft']
export function readAuto(edit) {
  const a = edit && typeof edit === 'object' ? edit.auto : null
  if (!a || typeof a !== 'object' || a.v !== AUTO_VERSION || !AUTO_STATUSES.includes(a.status)) return null
  return { ...a }
}
/** edit에 표시를 붙이거나(값) 뗀다(null) — 다른 칸은 그대로 */
export function withAuto(edit, auto) {
  const { auto: _old, ...rest } = edit || {}
  return auto ? { ...rest, auto: { ...auto } } : rest
}
export function hasAutoLayers(layers) { return (layers || []).some(l => l?.auto === true) }
/** [원본으로] — 원클릭이 넣은 레이어만 뺀다 (고객이 직접 칠한 것·덮기는 그대로). 뺄 게 없으면 입력 그대로 */
export function withoutAutoLayers(layers) {
  const next = (layers || []).filter(l => l?.auto !== true)
  return next.length === (layers || []).length ? layers : next
}

const pixelCount = layers => (layers || []).filter(l => l && (l.type === 'fill' || l.type === 'cover')).length
export const PROBLEM_TEXT = { failed: '지우기 실패', textHeavy: '글자 많음', textLeft: '글자 남음' }

/**
 * 목록·사진 칸·안내 띠 표시 — 사진 하나
 * @param auto readAuto 결과  @param layers 지금 레이어
 * @returns {{ problem: 'failed'|'textHeavy'|'textLeft'|null, problemText, reason, canRevert } | null}
 *   problem("확인 필요") = 지우기 실패·글자 남음(표시를 남긴 뒤 레이어 수가 그대로일 때만 — 고객이 고치면 풀림) · 글자 많음(표시 그대로)
 *   canRevert = 원클릭이 지운 레이어가 있음([원본으로] 버튼용) — 배지는 아니다
 */
export function reviewMark(auto, layers) {
  if (!auto) return null
  const canRevert = hasAutoLayers(layers)
  const px = Number.isInteger(auto.px) ? auto.px : 0
  let problem = null
  if (auto.status === 'textHeavy') problem = 'textHeavy'
  else if ((auto.status === 'failed' || auto.status === 'textLeft') && pixelCount(layers) === px) problem = auto.status
  if (!problem && !canRevert) return null
  const reason = problem === 'failed' ? String(auto.reason || '')
    : problem === 'textLeft' ? `지우지 않은 곳에 글자 ${auto.left ?? ''}줄이 남아 있어요`
      : problem === 'textHeavy' ? '글자가 많아 지워도 비어 보이기 쉬워요' : ''
  return { problem, problemText: problem ? PROBLEM_TEXT[problem] : '', reason, canRevert }
}

/**
 * 글자 남음 — 이미 있는 지우기·덮기 레이어가 쓰는 범위(studioFillPlan.writeRect)에 덮이지 않은 한자 줄 (4px 격자로 덮인 비율)
 * @returns 남은 줄 배열
 */
export function leftoverLines(lines, layers, W, H) {
  const zh = (lines || []).filter(isChineseLine)
  if (!zh.length) return []
  const G = 4, gw = Math.max(1, Math.ceil(W / G)), gh = Math.max(1, Math.ceil(H / G))
  const grid = new Uint8Array(gw * gh)
  for (const l of layers || []) {
    if (!l || (l.type !== 'fill' && l.type !== 'cover')) continue
    const r = writeRect(l, W, H)
    for (let y = Math.floor(r.y / G); y < Math.ceil((r.y + r.h) / G); y++) for (let x = Math.floor(r.x / G); x < Math.ceil((r.x + r.w) / G); x++) grid[y * gw + x] = 1
  }
  return zh.filter(line => {
    const r = lineRect(line, W, H)
    let n = 0, c = 0
    for (let y = Math.floor(r.y / G); y < Math.ceil((r.y + r.h) / G); y++) for (let x = Math.floor(r.x / G); x < Math.ceil((r.x + r.w) / G); x++) { n++; c += grid[y * gw + x] }
    return n > 0 && c / n < LEFT_COVER_MIN
  })
}

// ── 사진 고르기 ──
const KIND_RANK = { upload: 1, desc: 2, gallery: 3 }
/**
 * 처리 순서 — 대표(갤러리 첫 장) → 내 사진 → 상세 사진 → 나머지 갤러리. 같은 종류 안은 목록 순서 그대로.
 * 준비 끝 + 안 쓸 사진 아님만. @param rows 편집기 목록 순서의 사진 행
 */
export function orderCandidates(rows) {
  const ok = (rows || []).filter(r => r && r.ingest_status === 'done' && r.included !== false)
  const hero = ok.find(r => r.kind === 'gallery') || null
  const rest = ok.filter(r => r !== hero).map((r, i) => ({ r, i })).sort((a, b) => (KIND_RANK[a.r.kind] ?? 9) - (KIND_RANK[b.r.kind] ?? 9) || a.i - b.i).map(x => x.r)
  return hero ? [hero, ...rest] : rest
}
export function isTooSmall(row) {
  return !Number.isInteger(row?.width) || !Number.isInteger(row?.height) || Math.min(row.width, row.height) < MIN_SIDE
}

/** 9×8 회색값(72개, 0~255) → dHash 16자리 16진수 (옆 칸보다 밝으면 1) */
export function dHashFromGray(gray) {
  if (!gray || gray.length !== 72) throw new Error(`dHash 입력은 9×8=72개여야 해요 (${gray?.length})`)
  let hex = ''
  for (let y = 0; y < 8; y++) {
    let byte = 0
    for (let x = 0; x < 8; x++) byte = (byte << 1) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1 : 0)
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex
}
export function hashDistance(a, b) {
  let d = 0
  for (let i = 0; i < 16; i += 2) {
    let v = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16)
    while (v) { d += v & 1; v >>= 1 }
  }
  return d
}

// ── 순서 진행기 ──
export class AutoStop extends Error { constructor() { super('멈춤'); this.name = 'AutoStop' } }
/** 모델을 받지 못함 등 — 사진 한 장의 실패가 아니라 원클릭 전체를 멈춘다 (진행 화면에 이유를 보이고 멈춤, review-1) */
export class AutoFatal extends Error { constructor(msg) { super(msg); this.name = 'AutoFatal' } }
const yieldTick = () => new Promise(r => setTimeout(r, 0))

/**
 * 원클릭 사진 처리 — 한 장씩 차례로 (느린 PC·탭 멈춤 방지: 무거운 계산은 워커, 사진 사이마다 한 틱 쉼).
 * 한 장이 실패하면 그 사진은 원본으로 두고 사유를 남긴 뒤 다음 장으로 (조용히 삼키지 않음 — result.reason + console.error는 부르는 쪽).
 * [멈추기]: shouldStop()이 true면 지금 사진의 남은 일을 하지 않고(그 사진은 원본 그대로 'stopped') 끝낸다. 끝낸 사진 결과는 그대로.
 *
 * @param {{
 *   rows: object[],                                       편집기 목록 순서 사진 행
 *   userLayersOf: (row) => object[],                      이미 있는 지우기·덮기 레이어 (고객 작업 — 자동 지우기는 안 하고 글자 남음만 본다)
 *   loadPixels: (row) => Promise<{ imageData, hash }>,    원본 픽셀 + dHash
 *   ocr: (imageData) => Promise<{ lines }>,               글자 찾기
 *   erase: (row, layers, ctx: { shouldStop }) => Promise<object[]>,  지우기 계산·저장 → ai가 붙은 레이어 (멈추면 AutoStop)
 *   commit: (row, { layers, auto }) => void,              사진에 반영 (편집기 세션 — 저장·이력)
 *   onProgress?: (p) => void, shouldStop?: () => boolean, now?: () => number,
 * }} deps
 * @returns {Promise<{ results: object[], stopped: boolean }>}
 *   results[i] = { id, status, reason?, placed, ms?, stats? } — status: erased|clean|textHeavy|failed|kept|textLeft|small|dup|overLimit|stopped
 *   placed(페이지에 넣음) = erased·clean·failed·kept·textLeft. 글자 많음은 페이지에서 빼고 목록에만(review-1)
 *   AutoFatal은 잡지 않고 그대로 던진다 (원클릭 전체 멈춤)
 */
export async function runAutoPipeline(deps) {
  const { rows, userLayersOf, loadPixels, ocr, erase, commit } = deps
  const onProgress = deps.onProgress || (() => {})
  const shouldStop = deps.shouldStop || (() => false)
  const now = deps.now || (() => Date.now())
  const order = orderCandidates(rows)
  const results = []
  const hashes = []
  const took = []
  let processed = 0
  let stopped = false
  const total = Math.min(order.length, PROCESS_MAX)
  const report = (current, stage) => {
    const avg = took.length ? took.reduce((a, b) => a + b, 0) / took.length : null
    onProgress({ stage, current, done: processed, total, samples: took.length, avgMs: avg, etaMs: avg === null ? null : Math.round(avg * Math.max(0, total - processed)), results })
  }
  for (const row of order) {
    if (stopped || shouldStop()) { stopped = true; results.push({ id: row.id, status: 'stopped', placed: false }); continue }
    if (isTooSmall(row)) { results.push({ id: row.id, status: 'small', placed: false }); continue }
    if (processed >= PROCESS_MAX) { results.push({ id: row.id, status: 'overLimit', placed: false }); continue }
    const t0 = now()
    let prepMs = 0 // 이 사진 처리 중 AI 준비(LaMa 모델 받기·세션)를 기다린 시간 — 남은 시간 평균에서 뺀다
    report(row.id, 'load')
    await yieldTick()
    let res
    try {
      const px = await loadPixels(row)
      if (px.hash && hashes.some(h => hashDistance(h, px.hash) <= DUP_BITS)) {
        res = { id: row.id, status: 'dup', placed: false }
      } else {
        if (px.hash) hashes.push(px.hash)
        const own = userLayersOf(row) || []
        report(row.id, 'ocr')
        if (shouldStop()) throw new AutoStop()
        const { lines } = await ocr(px.imageData)
        const W = row.width, H = row.height
        const stats = textStats(lines, W, H)
        const base = { v: AUTO_VERSION, lines: stats.lines, han: stats.han, ratio: stats.ratio, px: own.length }
        if (own.length) {
          // 고객이 이미 고친 사진 — 자동 지우기는 하지 않고, 지우지 않은 곳에 한자가 남았는지만 본다 (review-1)
          const left = leftoverLines(lines, own, W, H).length
          res = left
            ? { id: row.id, status: 'textLeft', placed: true, stats, auto: { ...base, status: 'textLeft', left } }
            : { id: row.id, status: 'kept', placed: true, stats, auto: { ...base, status: 'clean' } }
        } else {
          const plan = planAutoLayers(lines, W, H)
          if (isTextHeavy(stats) || plan.tooMany) {
            res = { id: row.id, status: 'textHeavy', placed: false, stats, auto: { ...base, status: 'textHeavy' } } // 페이지에서 빼고 목록에만
          } else if (plan.layers.length === 0) {
            res = { id: row.id, status: 'clean', placed: true, stats, auto: { ...base, status: 'clean' } }
          } else {
            report(row.id, 'erase')
            if (shouldStop()) throw new AutoStop()
            const layers = await erase(row, plan.layers, { shouldStop, addPrepMs: ms => { prepMs += Math.max(0, ms) } })
            res = { id: row.id, status: 'erased', placed: true, stats, layers, auto: { ...base, status: 'erased' } }
          }
        }
      }
    } catch (e) {
      if (e instanceof AutoFatal || e?.name === 'AutoFatal') throw e
      if (e instanceof AutoStop || e?.name === 'AutoStop') {
        stopped = true
        results.push({ id: row.id, status: 'stopped', placed: false })
        continue
      }
      const reason = e?.message || String(e)
      const px0 = (userLayersOf(row) || []).length
      res = { id: row.id, status: 'failed', placed: true, reason, auto: { v: AUTO_VERSION, status: 'failed', reason: reason.slice(0, 200), lines: 0, han: 0, ratio: 0, px: px0 } }
    }
    if (res.status !== 'dup') { processed++; took.push(Math.max(0, now() - t0 - prepMs)) }
    res.ms = now() - t0
    if (res.auto) {
      res.auto.at = new Date(now()).toISOString()
      commit(row, { layers: res.layers || null, auto: res.auto })
    }
    results.push(res)
    report(row.id, 'done')
  }
  return { results, stopped }
}

// ── 남은 시간 표시 ──
// 평균은 AI 준비 시간을 뺀 실제 사진 처리 시간만(runAutoPipeline took). 처리한 사진이 ETA_MIN_SAMPLES장 미만이면 숫자를 보이지 않는다.
// 한 번 보인 분보다 늘어나지 않게(줄어들기만) — 앞 사진이 빨랐다가 느린 사진이 와도 숫자가 뛰지 않게.
export const ETA_MIN_SAMPLES = 2
export const ETA_CALCULATING = '시간을 계산하고 있어요'
export const ETA_PREPARING = 'AI를 준비하고 있어요'

/**
 * @param {number|null} prevMin 지금까지 보인 분 (null = 아직 숫자 안 보임, 0 = "1분 안에")
 * @param {{ etaMs: number|null, samples: number }} p runAutoPipeline onProgress 값
 * @returns {{ min: number|null, text: string }}
 */
export function nextEta(prevMin, { etaMs, samples }) {
  if (!(samples >= ETA_MIN_SAMPLES) || etaMs === null || etaMs === undefined || !Number.isFinite(etaMs)) {
    return prevMin === null || prevMin === undefined ? { min: null, text: ETA_CALCULATING } : { min: prevMin, text: etaMinText(prevMin) }
  }
  const raw = etaMs < 60000 ? 0 : Math.max(1, Math.round(etaMs / 60000))
  const min = prevMin === null || prevMin === undefined ? raw : Math.min(prevMin, raw)
  return { min, text: etaMinText(min) }
}
function etaMinText(min) { return min === 0 ? '1분 안에 끝나요' : `약 ${min}분 남았어요` }

/** 진행 화면 남은 시간 칸 — AI(모델) 준비 중이면 숫자 대신 지금 하는 일 */
export function etaNote({ preparing, text }) { return preparing ? ETA_PREPARING : (text || ETA_CALCULATING) }

/** 요약 수 — 진행 화면·검수 안내 */
export function summarize(results) {
  const c = { erased: 0, clean: 0, textHeavy: 0, failed: 0, kept: 0, textLeft: 0, small: 0, dup: 0, overLimit: 0, stopped: 0, placed: 0 }
  for (const r of results || []) { c[r.status] = (c[r.status] || 0) + 1; if (r.placed) c.placed++ }
  return c
}

// ── 글자 초안 (1688 사실만 — 유료 AI 문장 없음, 번역 API 새 호출 없음) ──
// facts = 서버 product_facts: { title: { zh, ko }, attrs: [{ name:{zh,ko}, value:{zh,ko} }], options: [{ name:{zh,ko}, values:[{zh,ko}] }] }
// ko = 1688 공식 다국어 데이터가 번역 캐시에 있을 때만 (없으면 null → 그 사실은 쓰지 않는다. 중국어를 페이지에 넣지 않음)
const MATERIAL_ZH = /材质|面料|材料|成分|里料|填充物|主料/
/**
 * 제목 초안에서 빼는 단어 — 이 한 곳 (review-1). 띄어쓰기 단위로 "그 단어와 똑같은 토막"만 뺀다 (다른 단어 속 글자는 건드리지 않음).
 *   hype  과장 광고 표현 (사실만 남긴다)
 *   trade 도매·유통용 단어와 그 번역 — 1688 제목에 붙는 现货·批发·外贸·高版本·厂家·一件代发·跨境·爆款·源头·代发·货源 류
 * trade를 뺀 결과가 너무 짧으면(공백 뺀 TITLE_MIN_KEEP자 미만) trade는 빼지 않은 결과로 돌아간다 (상품명이 비지 않게)
 */
export const TITLE_DROP = {
  hype: ['최고급', '최고', '최상급', '최상', '최저가', '1위', '초특가', '특가', '대박', '완벽', '명품', '인기', '인기상품', '핫', '핫템', '폭발', '무료배송', '정품', '신상품', '신상', '신제품', '공장직판', '직판', '한정', '고급', '프리미엄', '초강력', '강력추천', '추천', '베스트', '당일발송', '빠른배송'],
  trade: [
    '재고', '현물', '현재고', '스팟', '도매', '도매가', '수출', '수출용', '대외무역', '외국무역', '외무', '무역', '버전', '고버전', '하이버전', '고급버전',
    '공장', '공장직송', '제조사', '제조업체', '원청', '대리발송', '일건대발', '위탁배송', '드롭쉬핑', '크로스보더', '국경간', '소싱', '폭발상품', '대량',
    '现货', '批发', '外贸', '高版本', '厂家', '一件代发', '跨境', '爆款', '源头', '代发', '货源',
  ],
}
export const TITLE_MIN_KEEP = 4
const dropTokens = (s, words) => s.split(' ').filter(t => t && !words.includes(t)).join(' ')
export const TITLE_MAX = 26
export const BODY_OPTION_VALUES_MAX = 8

function koOf(p) { return p && typeof p.ko === 'string' && p.ko.trim() && !hanCount(p.ko) ? p.ko.trim() : null }

/** 1688 제목(한국어) → 짧은 상품명: 괄호·연도·과장 표현·도매 단어(TITLE_DROP)를 빼고 TITLE_MAX자 안에서 띄어쓰기 기준으로 자른다 */
export function summarizeTitle(ko) {
  if (typeof ko !== 'string') return null
  let s = ko.replace(/[【\[(（{<《][^】\])）}>》]*[】\])）}>》]/g, ' ').replace(/(^|\s)20\d\d(년|년형|년도)?(?=\s|$)/g, ' ')
  s = s.replace(/[!！~～★☆♥♡#]+/g, ' ').replace(/\s+/g, ' ').trim()
  s = dropTokens(s, TITLE_DROP.hype)
  const noTrade = dropTokens(s, TITLE_DROP.trade)
  if (noTrade.replace(/\s/g, '').length >= TITLE_MIN_KEEP) s = noTrade
  if (!s || hanCount(s)) return null
  if (s.length <= TITLE_MAX) return s
  const cut = s.slice(0, TITLE_MAX + 1)
  const sp = cut.lastIndexOf(' ')
  return (sp >= 8 ? cut.slice(0, sp) : s.slice(0, TITLE_MAX)).trim()
}

/**
 * 사실 → 초안 { title, body, options, missing }
 *   title  짧은 상품명 (없으면 null — 템플릿 문구 그대로)
 *   body   "소재: …" / "색상: A · B · C" 같은 사실 줄 (없으면 null)
 *   options 옵션표 행에 쓸 [{ name, values }] (한국어가 모두 있는 옵션만)
 *   missing 한국어가 없어 뺀 것 수 (보고·검수 안내용)
 */
export function buildDrafts(facts) {
  const out = { title: null, body: null, options: [], missing: 0 }
  if (!facts || typeof facts !== 'object') return out
  out.title = summarizeTitle(koOf(facts.title))
  if (facts.title?.zh && !out.title) out.missing++
  const lines = []
  for (const a of Array.isArray(facts.attrs) ? facts.attrs : []) {
    if (!MATERIAL_ZH.test(String(a?.name?.zh || ''))) continue
    const v = koOf(a.value)
    if (!v) { out.missing++; continue }
    const name = koOf(a.name) || '소재'
    lines.push(`${name}: ${v.slice(0, 40)}`)
    if (lines.length >= 2) break
  }
  for (const o of Array.isArray(facts.options) ? facts.options : []) {
    const name = koOf(o?.name)
    const values = (Array.isArray(o?.values) ? o.values : []).map(koOf)
    if (!name || values.length === 0 || values.some(v => !v)) { out.missing++; continue }
    out.options.push({ name, values })
    const shown = values.slice(0, BODY_OPTION_VALUES_MAX).join(' · ')
    lines.push(`${name}: ${shown}${values.length > BODY_OPTION_VALUES_MAX ? ` 외 ${values.length - BODY_OPTION_VALUES_MAX}가지` : ''}`)
  }
  out.body = lines.length ? lines.join('\n') : null
  return out
}

/** 옵션표 칸 — [['옵션', '고를 수 있는 것'], [이름, 값 · 값 …], …] (칸당 TABLE_CELL_MAX자 — 넘으면 다음 줄로 이어 씀, 20행까지) */
export function optionCells(options) {
  const rows = [['옵션', '고를 수 있는 것']]
  const max = TABLE_CELL_MAX - 2
  for (const o of options || []) {
    let cur = '', first = true
    const flush = () => { if (rows.length < 20) rows.push([first ? o.name.slice(0, TABLE_CELL_MAX) : '', cur]); first = false; cur = '' }
    for (const v of o.values) {
      const piece = v.slice(0, max)
      const next = cur ? `${cur} · ${piece}` : piece
      if (next.length > max && cur) { flush(); cur = piece } else cur = next
    }
    if (cur) flush()
  }
  return rows.length > 1 ? rows : null
}

const clone = v => JSON.parse(JSON.stringify(v))
const isPhoto = s => Number.isInteger(s?.photo)

/**
 * 원클릭 템플릿 — 샘플 템플릿(복제하지 않고 불러 씀)에서:
 *   ① 사진 자리를 사진 수만큼 늘림(마지막 사진 구간 뒤에 이어서 — 마무리 구간(구매 전 안내)은 맨 아래에 남게)
 *   ② 소개 구간(사진 없는 첫 글자 구간)의 가장 큰 글자 = 상품명, 가장 작은 글자 = 사실 줄 (초안이 있을 때만 바꿈)
 *   ③ 옵션이 있으면 마지막 사진 뒤에 옵션표 구간
 * @returns 템플릿 (templateProblems를 통과하는 모양)
 */
export function autoTemplate(base, photoCount, drafts) {
  const tpl = clone(base)
  tpl.gap = AUTO_GAP
  const lastPhotoIdx = tpl.sections.reduce((m, s, i) => (isPhoto(s) ? i : m), -1)
  const maxSlot = Math.max(-1, ...tpl.sections.filter(isPhoto).map(s => s.photo))
  const extra = []
  for (let n = maxSlot + 1; n < photoCount; n++) extra.push({ photo: n })
  const intro = tpl.sections.find(s => !isPhoto(s) && Array.isArray(s.items) && s.items.some(p => p.type === 'text'))
  if (intro && drafts) {
    const texts = intro.items.filter(p => p.type === 'text')
    const big = texts.reduce((a, b) => (b.fontSize > a.fontSize ? b : a))
    const small = texts.reduce((a, b) => (b.fontSize < a.fontSize ? b : a))
    if (drafts.title) big.text = drafts.title
    if (drafts.body && small !== big) small.text = drafts.body
  }
  const cells = drafts ? optionCells(drafts.options) : null
  const optionSection = cells ? optionTableSection(cells) : null
  const at = lastPhotoIdx >= 0 ? lastPhotoIdx + 1 : tpl.sections.length
  tpl.sections = [...tpl.sections.slice(0, at), ...extra, ...(optionSection ? [optionSection] : []), ...tpl.sections.slice(at)]
  return tpl
}

/** 옵션표 구간 (새 문구·색 — 다른 편집 프로그램 템플릿을 옮기지 않음) */
export function optionTableSection(cells) {
  const table = normalizeTableItem({
    type: 'table', id: 't', x: 90, y: 116, w: 600, h: 1, rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false,
    cells, headerRow: true, fontSize: 18, headerBg: '#374151', headerColor: '#ffffff', borderColor: '#d1d5db', align: 'left',
  })
  const { id: _id, h: _h, ...part } = table
  return {
    height: 116 + tableHeight(table) + 60, bg: '#ffffff',
    items: [
      { type: 'text', x: 70, y: 52, w: 640, text: '옵션 안내', fontSize: 30, fontWeight: 800, color: '#1f2937', fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.3 },
      part,
    ],
  }
}

/**
 * 원클릭 페이지 — 템플릿 적용(buildTemplatePage)과 같은 길. 페이지에 넣을 사진 = 처리 결과 placed, 처리 순서대로
 * @param photos 넣을 사진 [{ id, width, height }] (자른 사진은 자른 크기)  @param measure 글자 폭 재기
 * @returns {{ page, tpl, placed, extra }|null}
 */
export function buildAutoPage(photos, drafts, measure, templateKey = AUTO_TEMPLATE_KEY) {
  const base = templateByKey(templateKey)
  if (!base) return null
  const tpl = autoTemplate(base, photos.length, drafts)
  const r = buildTemplatePage(tpl, photos, measure)
  return r ? { ...r, tpl } : null
}

/**
 * 글자 초안 구간 id — 초안 글자(상품명·사실 줄)가 들어간 구간과 옵션표 구간. 이 구간을 고르면 "AI 초안은 확인 후 사용해 주세요"(review-1)
 * 편집기가 page.auto = { v: 1, drafts: [구간 id] }로 저장한다 (페이지 최상위 칸 — readPage·바꾸기 함수가 그대로 둔다)
 */
export function draftSectionIds(page, drafts) {
  if (!page || !drafts) return []
  const texts = new Set([drafts.title, drafts.body].filter(Boolean))
  return page.sections.filter(s => s.items.some(it => (it.type === 'text' && texts.has(it.text)) || (it.type === 'table' && it.cells?.[0]?.[0] === '옵션'))).map(s => s.id)
}
/**
 * 원클릭으로 만든 페이지 표시 — page.auto = { v: 1, drafts: [초안 구간 id], note? }
 *   note = 글자 초안을 만들지 못한 안내(안내 띠 둘째 줄). 검수 2묶음: 초안이 없어도 원클릭 페이지면 표시한다(안내 띠를 새로고침 뒤에도 보이려고)
 */
export function withDraftMark(page, ids, note = '') {
  return { ...page, auto: { v: AUTO_VERSION, drafts: [...ids], ...(note ? { note: String(note).slice(0, 200) } : {}) } }
}
/** 원클릭으로 만든 페이지인지 (안내 띠를 보일 수 있는지) */
export function isAutoPage(page) {
  return !!page?.auto && page.auto.v === AUTO_VERSION && Array.isArray(page.auto.drafts)
}

// ── 안내 띠 닫음 기억 (검수 2묶음 — 해성 결정 2) ──
// 닫기 전까지는 새로고침 뒤에도 보이고, 한 번 닫으면 그 작업에서는 다시 띄우지 않는다.
// "닫았음"은 보는 사람의 화면 상태라 페이지 문서에 넣지 않는다 — 넣으면 닫을 때마다 페이지 저장·page_version·이력 한 칸이 생기고
// 다른 창과 저장 충돌이 날 수 있다. 그래서 작업별 localStorage 키 하나(studioSteps의 단계 기억과 같은 방식). 읽지 못하면 띄운다.
export const NOTICE_KEY_PREFIX = 'studio-auto-notice-closed:'
export function readNoticeClosed(storage, projectId) {
  if (!storage || !projectId) return false
  try {
    return storage.getItem(NOTICE_KEY_PREFIX + projectId) === '1'
  } catch (e) {
    console.warn('[studioAutoBuild] 안내 띠 닫음 기억을 읽지 못함 (띠를 보임):', e.message)
    return false
  }
}
/** @param closed true = 닫음 기억 / false = 지움(새 원클릭이 끝나면 다시 보이게) @returns 기억했으면 true */
export function writeNoticeClosed(storage, projectId, closed) {
  if (!storage || !projectId) return false
  try {
    if (closed) storage.setItem(NOTICE_KEY_PREFIX + projectId, '1')
    else storage.removeItem(NOTICE_KEY_PREFIX + projectId)
    return true
  } catch (e) {
    console.warn('[studioAutoBuild] 안내 띠 닫음을 기억하지 못함 (이 창에서만):', e.message)
    return false
  }
}
export function isDraftSection(page, sectionId) {
  return !!sectionId && Array.isArray(page?.auto?.drafts) && page.auto.drafts.includes(sectionId)
}

/**
 * 안내 띠 [확인할 사진 보기] 순서 — 대표 사진(갤러리 첫 장)을 맨 앞, 나머지는 목록 순서
 * @param rows 목록 순서 사진 행  @param markOf id → reviewMark  @returns [{ id, problem, problemText, reason }]
 */
export function problemList(rows, markOf) {
  const ok = (rows || []).filter(r => r && r.ingest_status === 'done')
  const heroId = ok.find(r => r.kind === 'gallery')?.id ?? null
  const out = []
  for (const r of ok) {
    const m = markOf(r.id)
    if (m?.problem) out.push({ id: r.id, problem: m.problem, problemText: m.problemText, reason: m.reason })
  }
  return out.sort((a, b) => (b.id === heroId) - (a.id === heroId))
}

/** 상단 버튼 — 지금 작업에서 바로(페이지가 비어 있음) / 복사본에서 (페이지가 있음 — 원본은 절대 덮지 않는다) */
export function oneClickTarget({ isDefault, sectionCount }) {
  return isDefault || sectionCount === 0 ? 'here' : 'copy'
}
