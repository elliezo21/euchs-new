/**
 * 도형·선 요소 (11-1단계) — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-shape.mjs)
 *
 * ★ 도형 = 공통 칸(id, x, y, w, h, rotation, opacity, flipX, flipY, locked, hidden, groupId?) + type: 'shape' +
 *     shape        'rect' | 'ellipse' | 'triangle' | 'star' | 'diamond' | 'hexagon' | 'burst' | 'ribbon' | 'arrow' | 'check' | 'bubble'
 *                  (에셋 채우기: 뒤 7개 추가 — 모두 이 파일에서 직접 그린 path, 외부 그림 파일 없음)
 *     fill         '#rrggbb' 또는 '' (= 채우기 없음) · fillOpacity 0~1
 *     strokeWidth  0~40 (px, 정수, 0 = 테두리 없음) · strokeColor '#rrggbb'
 *     radius       0~400 (px, 정수 — rect만 쓴다. 둥근 네모의 바깥 모서리 반지름)
 * ★ 선 = 공통 칸 + type: 'line'. 저장은 공통 방식 그대로 — x·y·w = 선 길이의 가로 네모, rotation = 선 각도(가운데 축),
 *     h = 누르기 쉬운 두께 영역(굵기·끝 모양에 맞춰 자동, lineHitHeight — 손으로 정하지 않는다). 선은 네모 가운데 가로줄.
 *     strokeWidth  1~40 (px, 정수) · color '#rrggbb' · dash 'solid' | 'dashed' | 'dotted' · startCap·endCap 'none' | 'arrow' | 'dot'
 *   그래서 이동·회전·정렬·복제·그룹·레이어가 다른 요소와 똑같이 통한다. 끝 점 손잡이는 moveLineEnd.
 * ★ 그리는 규칙은 shapePaintSpec·linePaintSpec 하나 — 화면(SVG <path d>)과 내보내기(캔버스 new Path2D(d), 13단계)가 같은 d를 쓴다.
 *   모든 좌표는 요소 기준 페이지 px (요소 왼쪽 위 = 0,0). 뒤집기·회전·투명도는 바깥(요소)이 맡는다.
 */

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round2 = v => Math.round(v * 100) / 100
const n2 = v => String(round2(v)) // path 숫자 (소수 둘째 자리)

export const SHAPES = ['rect', 'ellipse', 'triangle', 'star', 'diamond', 'hexagon', 'burst', 'ribbon', 'arrow', 'check', 'bubble']
export const SHAPE_LABELS = {
  rect: '네모', ellipse: '원', triangle: '세모', star: '별',
  diamond: '마름모', hexagon: '육각형', burst: '톱니 원', ribbon: '리본', arrow: '화살표 도형', check: '체크', bubble: '말풍선',
}
export const SHAPE_DEFAULTS = { shape: 'rect', fill: '#111111', fillOpacity: 1, strokeWidth: 0, strokeColor: '#000000', radius: 0 }
export const SHAPE_LIMITS = { fillOpacity: [0, 1], strokeWidth: [0, 40], radius: [0, 400] }
export const SHAPE_KEYS = Object.keys(SHAPE_DEFAULTS)

export const LINE_DASHES = ['solid', 'dashed', 'dotted']
export const LINE_CAPS = ['none', 'arrow', 'dot']
export const LINE_DEFAULTS = { strokeWidth: 4, color: '#111111', dash: 'solid', startCap: 'none', endCap: 'none' }
export const LINE_LIMITS = { strokeWidth: [1, 40] }
export const LINE_KEYS = Object.keys(LINE_DEFAULTS)
export const LINE_MIN_LENGTH = 20 // 끝 점을 끌어도 이보다 짧아지지 않는다 (페이지 px)
export const LINE_HIT_MIN = 24    // 선을 누를 수 있는 최소 두께 영역 (페이지 px, 짝수)

// ── 검사·정리 ──

const isBox = it => !!it && typeof it.id === 'string' && [it.x, it.y, it.w, it.h].every(Number.isFinite) && it.w > 0 && it.h > 0
/** 그릴 수 있는 도형 요소 */
export function isValidShapeItem(it) { return isBox(it) && it.type === 'shape' }
/** 그릴 수 있는 선 요소 */
export function isValidLineItem(it) { return isBox(it) && it.type === 'line' }

/** 칸 하나 고쳐 읽기 (잘못된 값 = undefined → 기본값·무시) */
function cleanField(k, v) {
  switch (k) {
    case 'shape': return SHAPES.includes(v) ? v : undefined
    case 'fill': return v === '' ? '' : typeof v === 'string' && HEX_COLOR.test(v) ? v.toLowerCase() : undefined
    case 'strokeColor':
    case 'color': return typeof v === 'string' && HEX_COLOR.test(v) ? v.toLowerCase() : undefined
    case 'fillOpacity': return Number.isFinite(v) ? round2(clamp(v, 0, 1)) : undefined
    case 'radius': return Number.isFinite(v) ? Math.round(clamp(v, ...SHAPE_LIMITS.radius)) : undefined
    case 'dash': return LINE_DASHES.includes(v) ? v : undefined
    case 'startCap':
    case 'endCap': return LINE_CAPS.includes(v) ? v : undefined
    default: return undefined
  }
}
/** 굵기는 도형(0~40)과 선(1~40)의 범위가 달라 따로 */
const cleanWidth = (v, [lo, hi]) => (Number.isFinite(v) ? Math.round(clamp(v, lo, hi)) : undefined)

/** 도형 칸을 채운 복사본 — 빠지거나 잘못된 값은 기본값. 공통 칸·다른 칸은 그대로 (readPage에서도 거친다) */
export function normalizeShapeItem(it) {
  if (!it || typeof it !== 'object') return it
  const out = { ...it }
  for (const k of SHAPE_KEYS) {
    const v = k === 'strokeWidth' ? cleanWidth(it[k], SHAPE_LIMITS.strokeWidth) : cleanField(k, it[k])
    out[k] = v ?? SHAPE_DEFAULTS[k]
  }
  return out
}
/** 선 칸을 채운 복사본 + h를 굵기·끝 모양에 맞춘다(가운데 제자리) */
export function normalizeLineItem(it) {
  if (!it || typeof it !== 'object') return it
  const out = { ...it }
  for (const k of LINE_KEYS) {
    const v = k === 'strokeWidth' ? cleanWidth(it[k], LINE_LIMITS.strokeWidth) : cleanField(k, it[k])
    out[k] = v ?? LINE_DEFAULTS[k]
  }
  return Number.isFinite(out.y) && Number.isFinite(out.h) ? fitLineItem(out) : out
}

/** 도형 속성 바꾸기 — patch의 도형 칸만(잘못된 값 무시). 안 바뀌면 입력 그대로 */
export function patchShapeItem(it, patch) {
  const next = { ...it }
  for (const k of SHAPE_KEYS) {
    if (!patch || !(k in patch)) continue
    const v = k === 'strokeWidth' ? cleanWidth(patch[k], SHAPE_LIMITS.strokeWidth) : cleanField(k, patch[k])
    if (v !== undefined) next[k] = v
  }
  return SHAPE_KEYS.every(k => next[k] === it[k]) ? it : next
}
/** 선 속성 바꾸기 — patch의 선 칸만. 굵기·끝 모양이 바뀌면 h를 다시 맞춘다(가운데 제자리). 안 바뀌면 입력 그대로 */
export function patchLineItem(it, patch) {
  const next = { ...it }
  for (const k of LINE_KEYS) {
    if (!patch || !(k in patch)) continue
    const v = k === 'strokeWidth' ? cleanWidth(patch[k], LINE_LIMITS.strokeWidth) : cleanField(k, patch[k])
    if (v !== undefined) next[k] = v
  }
  return LINE_KEYS.every(k => next[k] === it[k]) ? it : fitLineItem(next)
}

// ── 도형 그리기 ──

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// 별: 꼭짓점 5개, 안쪽 반지름 = 바깥의 0.45배. 단위 별을 자기 네모에 맞춘 뒤 요소 네모로 늘린다(늘리면 그대로 늘어남)
const STAR_POINTS = (() => {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.45
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const x0 = Math.min(...xs), y0 = Math.min(...ys), sw = Math.max(...xs) - x0, sh = Math.max(...ys) - y0
  return pts.map(([x, y]) => [(x - x0) / sw, (y - y0) / sh]) // 0~1
})()

// 꼭짓점 도형 (0~1 좌표 — 요소 네모에 맞춰 늘린다). 모두 직접 정한 좌표
const BURST_POINTS = (() => { // 톱니 원: 꼭짓점 16개, 안쪽 반지름 = 바깥의 0.84배
  const pts = []
  for (let i = 0; i < 32; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.42
    const a = -Math.PI / 2 + (i * Math.PI) / 16
    pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)])
  }
  return pts
})()
const POLYGONS = {
  diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  hexagon: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  burst: BURST_POINTS,
  ribbon: [[0, 0], [1, 0], [0.93, 0.5], [1, 1], [0, 1], [0.07, 0.5]],            // 양 끝이 파인 가로 띠
  arrow: [[0, 0.3], [0.6, 0.3], [0.6, 0], [1, 0.5], [0.6, 1], [0.6, 0.7], [0, 0.7]], // 오른쪽을 가리킴 (방향은 회전으로)
  check: [[0, 0.56], [0.15, 0.4], [0.38, 0.63], [0.85, 0.1], [1, 0.26], [0.38, 0.94]],
}
const BUBBLE_BODY = 0.78   // 말풍선: 위쪽 몸통 높이 비율 (아래는 꼬리)
const BUBBLE_RADIUS = 0.22 // 몸통 모서리 반지름 = 짧은 변의 이 비율

/**
 * 도형 path (SVG d) — 요소 네모 w×h 안을 사방으로 inset만큼 줄인 네모에 그린다.
 * 테두리를 안쪽으로 그리기 위해: inset = 테두리 두께의 절반 → 가운데 기준으로 그린 선의 바깥 가장자리가 정확히 w×h에 닿는다.
 */
export function shapePath(it, inset = 0) {
  const i = Math.max(0, Math.min(inset, it.w / 2, it.h / 2))
  const x0 = i, y0 = i, x1 = it.w - i, y1 = it.h - i
  const w = x1 - x0, h = y1 - y0
  switch (it.shape) {
    case 'ellipse': {
      const rx = w / 2, ry = h / 2, cy = y0 + ry
      return `M${n2(x0)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 0 ${n2(x1)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 0 ${n2(x0)} ${n2(cy)}Z`
    }
    case 'triangle':
      return `M${n2(x0 + w / 2)} ${n2(y0)}L${n2(x1)} ${n2(y1)}L${n2(x0)} ${n2(y1)}Z`
    case 'star':
      return STAR_POINTS.map(([px, py], k) => `${k ? 'L' : 'M'}${n2(x0 + px * w)} ${n2(y0 + py * h)}`).join('') + 'Z'
    case 'diamond': case 'hexagon': case 'burst': case 'ribbon': case 'arrow': case 'check':
      return POLYGONS[it.shape].map(([px, py], k) => `${k ? 'L' : 'M'}${n2(x0 + px * w)} ${n2(y0 + py * h)}`).join('') + 'Z'
    case 'bubble': { // 둥근 몸통 + 왼쪽 아래 꼬리 (한 줄로 이어 그린다)
      const by = y0 + h * BUBBLE_BODY
      const r = Math.min(w, by - y0) * BUBBLE_RADIUS
      const a = `A${n2(r)} ${n2(r)} 0 0 1`
      return `M${n2(x0 + r)} ${n2(y0)}H${n2(x1 - r)}${a} ${n2(x1)} ${n2(y0 + r)}V${n2(by - r)}${a} ${n2(x1 - r)} ${n2(by)}`
        + `H${n2(x0 + w * 0.4)}L${n2(x0 + w * 0.18)} ${n2(y1)}L${n2(x0 + w * 0.22)} ${n2(by)}`
        + `H${n2(x0 + r)}${a} ${n2(x0)} ${n2(by - r)}V${n2(y0 + r)}${a} ${n2(x0 + r)} ${n2(y0)}Z`
    }
    default: { // rect — 바깥 모서리 반지름이 radius가 되게, 안쪽 path는 radius - inset
      const r = Math.max(0, Math.min((it.radius || 0) - i, w / 2, h / 2))
      if (r <= 0) return `M${n2(x0)} ${n2(y0)}H${n2(x1)}V${n2(y1)}H${n2(x0)}Z`
      const a = `A${n2(r)} ${n2(r)} 0 0 1`
      return `M${n2(x0 + r)} ${n2(y0)}H${n2(x1 - r)}${a} ${n2(x1)} ${n2(y0 + r)}V${n2(y1 - r)}${a} ${n2(x1 - r)} ${n2(y1)}`
        + `H${n2(x0 + r)}${a} ${n2(x0)} ${n2(y1 - r)}V${n2(y0 + r)}${a} ${n2(x0 + r)} ${n2(y0)}Z`
    }
  }
}

/**
 * 도형을 그릴 값 — 화면(SVG)·캔버스 공용. 순서: 채우기 → 테두리 (같은 path d).
 *   d      path (테두리가 있으면 두께 절반만큼 안으로 줄인 것 — 테두리가 w×h 밖으로 나가지 않는다)
 *   fill   'rgba(…)' 또는 null (채우기 없음·진하기 0)
 *   stroke { width, color, join } 또는 null — join: 네모는 'miter'(각진 모서리가 정확히 네모에 닿음),
 *          세모·별은 'round'(뾰족한 꼭짓점의 miter가 네모 밖으로 튀어나가지 않게), 원은 상관없음('round')
 * 캔버스: const p = new Path2D(d); fillStyle=fill; ctx.fill(p); lineWidth=width; lineJoin=join; strokeStyle=color; ctx.stroke(p)
 */
export function shapePaintSpec(it) {
  const sw = it.strokeWidth > 0 ? Math.min(it.strokeWidth, it.w / 2, it.h / 2) : 0
  return {
    d: shapePath(it, sw / 2),
    fill: it.fill && it.fillOpacity > 0 ? rgba(it.fill, it.fillOpacity) : null,
    stroke: sw > 0 ? { width: sw, color: it.strokeColor, join: it.shape === 'rect' ? 'miter' : 'round' } : null,
  }
}

// ── 선 그리기 ──

/** 끝 모양 크기 (굵기에 비례) — 화살표: 길이·반폭, 점: 반지름 */
export function capSize(sw) {
  return { arrowLen: sw * 3 + 8, arrowHalf: sw * 1.6 + 5, dotR: sw * 1.2 + 3 }
}
/** 선을 누를 수 있는 두께 영역 h — 굵기·끝 모양을 다 담고, 최소 LINE_HIT_MIN, 짝수(가운데가 정수 좌표에 오게) */
export function lineHitHeight(it) {
  const c = capSize(it.strokeWidth)
  const half = Math.max(it.strokeWidth / 2,
    [it.startCap, it.endCap].includes('arrow') ? c.arrowHalf : 0,
    [it.startCap, it.endCap].includes('dot') ? c.dotR : 0)
  return Math.max(LINE_HIT_MIN, 2 * Math.ceil(half + 4))
}
/** h를 lineHitHeight로 — 가운데(y + h/2) 제자리. 같으면 입력 그대로 */
export function fitLineItem(it) {
  const h = lineHitHeight(it)
  if (h === it.h) return it
  return { ...it, h, y: Math.round(it.y + it.h / 2 - h / 2) }
}

/**
 * 선을 그릴 값 — 화면(SVG)·캔버스 공용. 좌표는 요소 기준 (선 = 가운데 가로줄 y = h/2, 0 → w).
 *   line  { d, width, color, dash: number[]|null, cap } — 끝 모양이 있는 쪽은 선을 그만큼 줄여 화살표 끝을 뚫고 나가지 않게
 *   caps  [{ d, color }] 화살표(세모)·점(원) — 채우기로 그린다
 * 점선: dashed = [굵기×3, 굵기×2] + butt / dotted = [0.01, 굵기×2] + round(길이 거의 0인 조각의 둥근 끝 = 점)
 * 캔버스: setLineDash(dash ?? []); lineCap=cap; ctx.stroke(new Path2D(line.d)); caps마다 ctx.fill(new Path2D(d))
 */
export function linePaintSpec(it) {
  const sw = it.strokeWidth, cy = it.h / 2, c = capSize(sw)
  const endInset = cap => (cap === 'arrow' ? c.arrowLen * 0.8 : cap === 'dot' ? c.dotR : 0)
  const dotted = it.dash === 'dotted'
  let sx = endInset(it.startCap), ex = it.w - endInset(it.endCap)
  if (dotted) { sx += sw / 2; ex -= sw / 2 } // 둥근 끝이 선 끝 밖으로 나가지 않게
  if (ex < sx) ex = sx
  const caps = []
  const arrow = (tipX, dir) => `M${n2(tipX)} ${n2(cy)}L${n2(tipX - dir * c.arrowLen)} ${n2(cy - c.arrowHalf)}L${n2(tipX - dir * c.arrowLen)} ${n2(cy + c.arrowHalf)}Z`
  const dot = cx => `M${n2(cx - c.dotR)} ${n2(cy)}A${n2(c.dotR)} ${n2(c.dotR)} 0 1 0 ${n2(cx + c.dotR)} ${n2(cy)}A${n2(c.dotR)} ${n2(c.dotR)} 0 1 0 ${n2(cx - c.dotR)} ${n2(cy)}Z`
  if (it.startCap === 'arrow') caps.push({ d: arrow(0, -1), color: it.color })
  if (it.startCap === 'dot') caps.push({ d: dot(c.dotR), color: it.color })
  if (it.endCap === 'arrow') caps.push({ d: arrow(it.w, 1), color: it.color })
  if (it.endCap === 'dot') caps.push({ d: dot(it.w - c.dotR), color: it.color })
  return {
    line: {
      d: `M${n2(sx)} ${n2(cy)}H${n2(ex)}`, width: sw, color: it.color,
      dash: it.dash === 'dashed' ? [sw * 3, sw * 2] : dotted ? [0.01, sw * 2] : null,
      cap: dotted ? 'round' : 'butt',
    },
    caps,
  }
}

// ── 선 끝 점 ──

/** 선 양 끝 점 (구간 좌표) — 가운데를 축으로 rotation만큼 돌린 가운데 가로줄의 두 끝 */
export function lineEnds(it) {
  const t = ((it.rotation || 0) * Math.PI) / 180
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2
  const dx = Math.cos(t) * it.w / 2, dy = Math.sin(t) * it.w / 2
  return { start: { x: cx - dx, y: cy - dy }, end: { x: cx + dx, y: cy + dy } }
}

/**
 * 끝 점 하나를 (px, py)로 옮긴 선 — 반대쪽 끝은 제자리. 길이·각도·x·y를 다시 계산한다.
 * @param {'start'|'end'} which  @param {{ snap?: boolean, min?: number }} opts snap = 15° 단위로 맞춤(Shift), min = 최소 길이
 * @returns {{ x, y, w, rotation }} (x·y·w 정수, 각도 -180 초과 ~ 180 이하 — 반대쪽 끝은 반올림 때문에 1px 안에서 제자리)
 */
export function moveLineEnd(it, which, px, py, { snap = false, min = LINE_MIN_LENGTH } = {}) {
  const ends = lineEnds(it)
  const fixed = which === 'start' ? ends.end : ends.start
  // 선의 방향 = 시작 → 끝. 시작 점을 옮기면 (고정된 끝 - 새 시작), 끝 점을 옮기면 (새 끝 - 고정된 시작)
  let vx = which === 'start' ? fixed.x - px : px - fixed.x
  let vy = which === 'start' ? fixed.y - py : py - fixed.y
  let deg = Math.atan2(vy, vx) * 180 / Math.PI
  if (!Number.isFinite(deg) || (vx === 0 && vy === 0)) deg = it.rotation || 0
  if (snap) deg = Math.round(deg / 15) * 15
  const len = Math.max(min, Math.round(Math.hypot(vx, vy)))
  const t = deg * Math.PI / 180
  vx = Math.cos(t) * len; vy = Math.sin(t) * len
  const start = which === 'start' ? { x: fixed.x - vx, y: fixed.y - vy } : fixed
  const cx = start.x + vx / 2, cy = start.y + vy / 2
  let a = ((deg % 360) + 360) % 360
  if (a > 180) a -= 360
  a = Math.round(a * 100) / 100
  return { x: Math.round(cx - len / 2), y: Math.round(cy - it.h / 2), w: len, rotation: a === 0 ? 0 : a }
}

// ── [요소] 패널 넣기 종류 (11-1) — 새 요소 기본값 (크기 = 페이지 px) ──
export const ELEMENT_KINDS = [
  { key: 'rect', label: '네모', fields: { type: 'shape', shape: 'rect', w: 240, h: 160 } },
  { key: 'rounded', label: '둥근 네모', fields: { type: 'shape', shape: 'rect', radius: 28, w: 240, h: 160 } },
  { key: 'ellipse', label: '원', fields: { type: 'shape', shape: 'ellipse', w: 200, h: 200 } },
  { key: 'triangle', label: '세모', fields: { type: 'shape', shape: 'triangle', w: 220, h: 190 } },
  { key: 'star', label: '별', fields: { type: 'shape', shape: 'star', w: 220, h: 210 } },
  { key: 'diamond', label: '마름모', fields: { type: 'shape', shape: 'diamond', w: 200, h: 200 } },
  { key: 'hexagon', label: '육각형', fields: { type: 'shape', shape: 'hexagon', w: 220, h: 190 } },
  { key: 'burst', label: '톱니 원', fields: { type: 'shape', shape: 'burst', w: 200, h: 200 } },
  { key: 'ribbon', label: '리본', fields: { type: 'shape', shape: 'ribbon', w: 280, h: 70 } },
  { key: 'block-arrow', label: '화살표 도형', fields: { type: 'shape', shape: 'arrow', w: 220, h: 120 } },
  { key: 'check', label: '체크', fields: { type: 'shape', shape: 'check', w: 120, h: 100 } },
  { key: 'bubble', label: '말풍선', fields: { type: 'shape', shape: 'bubble', w: 280, h: 180 } },
  { key: 'line', label: '선', fields: { type: 'line', w: 320 } },
  { key: 'dashed', label: '점선', fields: { type: 'line', w: 320, dash: 'dashed' } },
  { key: 'arrow', label: '화살표', fields: { type: 'line', w: 320, endCap: 'arrow' } },
]
export function elementKindByKey(key) { return ELEMENT_KINDS.find(k => k.key === key) ?? null }

/** 레이어 목록 이름 — "도형 · 네모" / "선" / "화살표" */
export function elementLabel(it) {
  if (it?.type === 'shape') return `도형 · ${SHAPE_LABELS[it.shape] ?? '네모'}`
  if (it?.type === 'line') return it.startCap === 'arrow' || it.endCap === 'arrow' ? '화살표' : '선'
  return '요소'
}
