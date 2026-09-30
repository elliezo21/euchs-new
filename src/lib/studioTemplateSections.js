/**
 * 템플릿 아래 섹션 모양 — 조각(block) + 섹션 종류별 모양 여러 가지 + 모양 고르기 (DOM·DB 없음, node 테스트: scripts/test-studio-template-sections.mjs)
 *
 * ★ 섹션 "종류"(포인트·상세컷·표·관리법·구매 전 안내·추천·후기 …)는 템플릿 파일이 내용과 함께 정하고, "모양"은 이 파일이 그린다.
 *   종류마다 모양 3~6가지 (SECTION_VARIANTS). 어떤 모양을 쓸지는 planSectionStyles가 갤러리 순서로 한 번에 정한다:
 *   바로 옆·바로 위 카드와 같은 종류면 다른 모양, 덜 쓴 모양부터 → 템플릿마다 아래 섹션 모양 조합이 달라진다.
 * ★ 색·글꼴은 그 템플릿 첫 화면을 따른다 (lowerTheme — 첫 화면 바탕·글자·강조색·제목 글꼴에서 뽑는다).
 * ★ 바꾸는 것은 배치·색·장식뿐. 글자 내용·표 칸(cells)·사진 자리 수는 섹션마다 그대로 (예전 흐름·자리 번호가 그대로).
 * ★ 조각 = { h, make(y, gid) → 요소 조각[] }, 숫자 = 그만큼 띄우기, sec(bg, blocks, o) = 구간 하나 (studioTemplates.js 맨 위 모양).
 *   글자 줄은 넉넉한 폭(wrapText — 한글 1em)으로 나눈다 → 실제 글꼴로도 줄이 늘지 않는다 (테스트가 같은 폭으로 잰다).
 * ★ 배치·색·문구는 이 프로젝트에서 새로 정한 것 (다른 편집 프로그램의 템플릿·문구·그림을 옮기지 않음). 도형은 studioShape의 직접 그린 path.
 */

export const W = 780
export const WHITE = '#ffffff'
export const textH = (text, size, lh) => Math.ceil(String(text).split('\n').length * size * lh)
const cx = w => Math.round((W - w) / 2)

// ── 글자 폭 (넉넉하게) · 줄 나누기 ──
const UNIT = { 'gasoek-one': [1.1, 0.78], 'east-sea-dokdo': [0.82, 0.52], cinzel: [1.0, 0.84] }
const WIDE = /[ᄀ-ᇿ㄰-㆏가-힣一-鿿　-〿＀-￯]/
export function textUnits(s, font) {
  const [k, l] = UNIT[font] ?? [1, 0.68]
  let n = 0
  for (const ch of s) n += ch === ' ' ? 0.35 : WIDE.test(ch) ? k : l
  return n
}
/** 폭 안에 들어가게 띄어쓰기에서 줄을 나눈다 (이미 있는 줄바꿈은 그대로). 한 낱말이 폭보다 길면 그 낱말은 한 줄 */
export function wrapText(text, size, width, font = 'noto-sans-kr') {
  const max = (width * 0.96) / size
  return String(text).split('\n').map(line => {
    const words = line.split(' ')
    const out = []
    let cur = ''
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w
      if (cur && textUnits(next, font) > max) { out.push(cur); cur = w } else cur = next
    }
    out.push(cur)
    return out.join('\n')
  }).join('\n')
}

// ── 색 ──
const HEX = /^#[0-9a-f]{6}$/i
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const hex = a => `#${a.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`
export const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t))
/** 밝기 0~1 (sRGB 상대 휘도) */
export function lum(h) {
  const [r, g, b] = rgb(h).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const SERIF = new Set(['gowun-batang', 'noto-serif-kr', 'nanum-myeongjo'])
// 제목 글꼴 → 굵기 (허용 목록에 있는 값)
const HEAD_W = { pretendard: 800, 'noto-sans-kr': 800, 'nanum-gothic': 800, 'noto-serif-kr': 700, 'gowun-batang': 700, 'nanum-myeongjo': 800 }

/**
 * 아래 섹션 색 묶음 — 첫 화면(spec: bg·ink·accent·badge·font)에서 뽑는다. base = 템플릿이 원래 쓰던 색 묶음(빈 칸만 채움)
 * accent 강조(도형·표 머리) · accentText 흰 바탕 위 강조 글자 · onAccent 강조 위 글자 · ink 제목·본문 · soft 연한 바탕 · dark 짙은 바탕
 * bright 짙은 바탕 위 강조 · font 섹션 제목 글꼴(첫 화면 제목과 같음) · body 본문 글꼴
 */
export function lowerTheme(spec, base = {}) {
  const ok = c => typeof c === 'string' && HEX.test(c)
  const bg = ok(spec?.bg) ? spec.bg : '#ffffff'
  const heroDark = lum(bg) < 0.2
  const cand = [spec?.accent, spec?.badge?.fill, spec?.pillFill, spec?.ink, base.accent].filter(c => ok(c) && lum(c) < 0.8)
  const accent = cand[0] ?? '#1f2328'
  const ink = heroDark ? (lum(bg) < 0.06 ? bg : mix(bg, '#000000', 0.45)) : (ok(spec?.ink) && lum(spec.ink) < 0.15 ? spec.ink : '#1f2328')
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
  return {
    ...base,
    accent,
    accentText: lum(accent) > 0.3 ? mix(accent, '#000000', 0.5) : accent,
    onAccent: cr(accent, WHITE) >= cr(accent, ink) ? WHITE : ink, // 강조 위 글자 = 흰색·본문색 중 대비가 큰 쪽
    ink,
    sub: mix(ink, '#ffffff', 0.3),
    muted: mix(ink, '#ffffff', 0.48),
    line: mix(ink, '#ffffff', 0.84),
    soft: heroDark ? mix(accent, '#ffffff', 0.9) : mix(bg, '#ffffff', 0.55),
    dark: lum(ink) < 0.08 ? ink : mix(ink, '#000000', 0.4),
    bright: lum(accent) > 0.25 ? accent : mix(accent, '#ffffff', 0.55),
    font: spec?.font && spec.font !== 'cinzel' ? spec.font : (base.font ?? 'noto-sans-kr'),
    body: base.body ?? 'noto-sans-kr',
  }
}

// ── 조각 ──

/** 글자 한 덩이 (기본 가운데) */
export function T(text, size, weight, color, o = {}) {
  const { w = 640, lh = 1.35, align = 'center', font = 'noto-sans-kr', x = cx(w), ...rest } = o
  return {
    h: textH(text, size, lh),
    make: y => [{ type: 'text', x, y, w, text, fontSize: size, fontWeight: weight, color, fontFamily: font, align, lineHeight: lh, ...rest }],
  }
}
/** 짧은 막대 */
export const bar = (color, w = 56, h = 4) => ({ h, make: y => [{ type: 'shape', shape: 'rect', x: cx(w), y, w, h, fill: color, radius: Math.floor(h / 2) }] })
/** 선 — 마름모 — 선 */
export const ornament = color => ({
  h: 24,
  make: (y, gid) => {
    const group = gid()
    return [
      { type: 'line', group, x: 250, y: y + 11, w: 120, strokeWidth: 2, color },
      { type: 'shape', group, shape: 'diamond', x: 382, y: y + 4, w: 16, h: 16, fill: color },
      { type: 'line', group, x: 410, y: y + 11, w: 120, strokeWidth: 2, color },
    ]
  },
})
/** 알약 라벨 (도형 + 글자 그룹) */
export function pill(text, fill, ink, o = {}) {
  const { w = 180, h = 44, size = 19, x = cx(w), shape = 'rect', font = 'noto-sans-kr' } = o
  return {
    h,
    make: (y, gid) => {
      const group = gid()
      return [
        { type: 'shape', group, shape, x, y, w, h, fill, radius: shape === 'rect' ? Math.floor(h / 2) : 0 },
        { type: 'text', group, x: x + 10, y: y + Math.round((h - textH(text, size, 1.2)) / 2), w: w - 20, text, fontSize: size, fontWeight: font === 'noto-sans-kr' ? 800 : 700, color: ink, fontFamily: font, align: 'center', lineHeight: 1.2, letterSpacing: 0.06 },
      ]
    },
  }
}
/** 사진 자리 (가운데, 둥근 모서리) */
export const photo = (slot, h, o = {}) => {
  const { w = 660, radius = 16, x = cx(w), sample } = o
  return { h, make: y => [{ type: 'image', slot, x, y, w, h, ...(radius ? { radius } : {}), ...(sample ? { sample } : {}) }] }
}
/** 사진 두 장 나란히 */
export const photoPair = (a, b, h, radius = 12) => ({
  h,
  make: y => [
    { type: 'image', slot: a, x: 40, y, w: 340, h, radius },
    { type: 'image', slot: b, x: 400, y, w: 340, h, radius },
  ],
})
/** 표 (행 높이 = round(글자 크기 × 2.2) — studioTable.tableRowHeight와 같은 식) */
export function table(cells, th, o = {}) {
  const { w = 640, fontSize = 18, x = cx(w), headerBg = th.accent, headerColor = th.onAccent, borderColor = th.line, cellBg, borderWidth, align } = o
  return {
    h: cells.length * Math.round(fontSize * 2.2),
    make: y => [{
      type: 'table', x, y, w, fontSize, cells: cells.map(r => [...r]),
      headerBg, headerColor, borderColor, color: th.ink,
      ...(cellBg ? { cellBg } : {}), ...(borderWidth !== undefined ? { borderWidth } : {}), ...(align ? { align } : {}),
    }],
  }
}
/**
 * 카드 나란히 (2~4장) — 번호 원 + 제목 + 설명(있으면). 폭에 맞춰 줄을 나누고 가장 긴 카드에 높이를 맞춘다. label(n) = 원 안 글자
 * items = [{ title, desc? }]
 */
export function cards3(items, th, o = {}) {
  const { cardBg = WHITE, label = n => String(n), dot = 56, stroke = null } = o
  const n = items.length
  const gap = 20
  const cw = Math.floor((700 - gap * (n - 1)) / n)
  const x0 = cx(cw * n + gap * (n - 1))
  const ts = n > 3 ? 19 : 22
  const body = th.body ?? 'noto-sans-kr'
  const tt = items.map(it => wrapText(one(it.title), ts, cw - 24, body))
  const dd = items.map(it => (it.desc ? wrapText(one(it.desc), 16, cw - 24, body) : ''))
  const tH = Math.max(...tt.map(t => textH(t, ts, 1.3)))
  const dH = Math.max(0, ...dd.map(d => (d ? textH(d, 16, 1.6) : 0)))
  const h = 28 + dot + 22 + tH + (dH ? 12 + dH : 0) + 30
  return {
    h,
    make: (y, gid) => items.flatMap((it, i) => {
      const x = x0 + i * (cw + gap)
      const group = gid()
      const ty = y + 28 + dot + 22
      return [
        { type: 'shape', shape: 'rect', x, y, w: cw, h, fill: cardBg, radius: 18, ...(stroke ? { strokeWidth: 1, strokeColor: stroke } : {}) },
        { type: 'shape', group, shape: 'ellipse', x: x + Math.round(cw / 2 - dot / 2), y: y + 28, w: dot, h: dot, fill: th.accent },
        { type: 'text', group, x: x + Math.round(cw / 2 - dot / 2), y: y + 28 + Math.round((dot - textH('1', 24, 1.2)) / 2), w: dot, text: label(i + 1), fontSize: 24, fontWeight: 900, color: th.onAccent, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.2 },
        { type: 'text', x: x + 12, y: ty, w: cw - 24, text: tt[i], fontSize: ts, fontWeight: 800, color: th.ink, fontFamily: body, align: 'center', lineHeight: 1.3 },
        ...(dd[i] ? [{ type: 'text', x: x + 12, y: ty + tH + 12, w: cw - 24, text: dd[i], fontSize: 16, fontWeight: 400, color: th.sub, fontFamily: body, align: 'center', lineHeight: 1.6 }] : []),
      ]
    }),
  }
}
/** 세로 번호 목록 — 번호 원 + 제목 + 설명(있으면). 줄마다 높이는 글에 맞춘다 */
export function numberList(items, th) {
  const body = th.body ?? 'noto-sans-kr'
  const rows = items.map(it => {
    const t = wrapText(one(it.title), 24, 554, body)
    const d = it.desc ? wrapText(one(it.desc), 18, 554, body) : ''
    const tH = textH(t, 24, 1.3)
    return { t, d, tH, h: Math.max(76, tH + (d ? 8 + textH(d, 18, 1.5) : 0)) }
  })
  const gap = 28
  return {
    h: rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1),
    make: (y, gid) => {
      let top = y
      return rows.flatMap((r, i) => {
        const group = gid()
        const out = [
          { type: 'shape', group, shape: 'ellipse', x: 70, y: top + 8, w: 60, h: 60, fill: th.accent },
          { type: 'text', group, x: 70, y: top + 8 + Math.round((60 - textH('1', 26, 1.2)) / 2), w: 60, text: String(i + 1), fontSize: 26, fontWeight: 900, color: th.onAccent, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.2 },
          { type: 'text', x: 156, y: top + (r.d ? 6 : Math.round((76 - r.tH) / 2)), w: 554, text: r.t, fontSize: 24, fontWeight: 800, color: th.ink, fontFamily: body, align: 'left', lineHeight: 1.3 },
          ...(r.d ? [{ type: 'text', x: 156, y: top + 6 + r.tH + 8, w: 554, text: r.d, fontSize: 18, fontWeight: 400, color: th.sub, fontFamily: body, align: 'left', lineHeight: 1.5 }] : []),
        ]
        top += r.h + gap
        return out
      })
    },
  }
}
/** 체크 줄 — 체크 원 + 한 줄 글 */
export function checks(lines, th, ink) {
  const row = 66
  return {
    h: lines.length * row - 22,
    make: (y, gid) => lines.flatMap((text, i) => {
      const top = y + i * row
      const group = gid()
      return [
        { type: 'shape', group, shape: 'ellipse', x: 110, y: top, w: 44, h: 44, fill: th.accent },
        { type: 'shape', group, shape: 'check', x: 121, y: top + 13, w: 22, h: 18, fill: th.onAccent },
        { type: 'text', x: 174, y: top + Math.round((44 - textH(text, 23, 1.3)) / 2), w: 500, text, fontSize: 23, fontWeight: 700, color: ink ?? th.ink, fontFamily: 'noto-sans-kr', align: 'left', lineHeight: 1.3 },
      ]
    }),
  }
}
/** 상자 두 개 나란히 (배송 안내 · 교환·반품 안내) */
export function boxes2(items, th, o = {}) {
  const { boxBg = WHITE, h = 230 } = o
  return {
    h,
    make: y => items.flatMap((it, i) => {
      const x = 40 + i * 360
      return [
        { type: 'shape', shape: 'rect', x, y, w: 340, h, fill: boxBg, strokeWidth: 1, strokeColor: th.line, radius: 16 },
        { type: 'text', x: x + 24, y: y + 26, w: 292, text: it.title, fontSize: 21, fontWeight: 800, color: th.ink, fontFamily: 'noto-sans-kr', align: 'left', lineHeight: 1.3 },
        { type: 'text', x: x + 24, y: y + 70, w: 292, text: it.body, fontSize: 16, fontWeight: 400, color: th.sub, fontFamily: 'noto-sans-kr', align: 'left', lineHeight: 1.75 },
      ]
    }),
  }
}
/** 자리가 정해진 조각 (구간 위쪽 기준 — 높이를 차지하지 않는다) */
export const fixed = make => ({ h: 0, make: (_y, gid) => make(gid) })
/** 에셋 이미지 (우리 그림 — studioAsset). 자리가 정해진 조각 */
export const asset = (file, x, y, w, h, o = {}) => fixed(() => [{ type: 'asset', asset: file, x, y, w, h, fit: 'contain', ...o }])

/** 구간 조립 — 위 여백 + 조각들 + 아래 여백 = 구간 높이. bgImage = 섹션 배경 이미지(에셋 파일 경로). tail(h, gid) = 높이가 정해진 뒤 붙일 요소 */
export function sec(bg, blocks, o = {}) {
  const { top = 72, bottom = 72, bgImage = null, tail = null } = o
  let y = top
  let n = 0
  const gid = () => `g${++n}`
  const items = []
  for (const b of blocks) {
    if (typeof b === 'number') { y += b; continue }
    items.push(...b.make(y, gid))
    y += b.h
  }
  const height = y + bottom
  if (tail) items.push(...tail(height, gid))
  return { height, bg, ...(bgImage ? { bgImage: { asset: bgImage, fit: 'cover' } } : {}), items }
}

// 공통 안내 문구
export const SHIP = { title: '배송 안내', body: '· 결제 후 출고까지 걸리는 날을\n  적어 주세요.\n· 배송비와 묶음 배송 기준을\n  적어 주세요.' }
export const RETURN = { title: '교환·반품 안내', body: '· 받은 날부터 며칠 안에 신청할 수\n  있는지 적어 주세요.\n· 교환·반품 배송비 기준을\n  적어 주세요.' }

// ── 섹션 모양 ──
const headW = f => HEAD_W[f] ?? 400
/** 섹션 제목 (첫 화면 제목 글꼴) — 폭에 맞춰 줄 나눔 */
export const heading = (text, th, o = {}) => {
  const size = o.size ?? 32
  const w = o.w ?? 660
  return T(wrapText(text, size, w, th.font), size, headW(th.font), o.color ?? th.ink, { font: th.font, lh: SERIF.has(th.font) ? 1.35 : 1.28, w, ...(o.x !== undefined ? { x: o.x, align: o.align ?? 'left' } : {}) })
}
const latin = (text, color, o = {}) => T(text, 15, 700, color, { font: 'cinzel', letterSpacing: 0.3, lh: 1.3, ...o })
const one = s => String(s).replace(/\n/g, ' ')
/** 가운데 텍스트 조각 (본문 글꼴, 폭에 맞춰 줄 나눔) */
const bodyT = (text, th, o = {}) => {
  const size = o.size ?? 18
  const w = o.w ?? 620
  return T(wrapText(one(text), size, w, th.body), size, o.weight ?? 400, o.color ?? th.sub, { font: th.body, lh: o.lh ?? 1.6, w, ...(o.x !== undefined ? { x: o.x, align: o.align ?? 'left' } : {}) })
}
const txt = (x, y, w, text, size, weight, color, font, o = {}) => ({ type: 'text', x, y, w, text, fontSize: size, fontWeight: weight, color, fontFamily: font, align: 'left', lineHeight: 1.4, ...o })
const rect = (x, y, w, h, fill, o = {}) => ({ type: 'shape', shape: 'rect', x, y, w, h, fill, ...o })

/** 포인트 3개 — { title, items: [{ title, desc }] } */
const POINTS = [
  // 0 아이콘 카드 3개
  (d, th) => sec(th.soft, [heading(d.title, th), 40, cards3(d.items, th)]),
  // 1 큰 번호 세로 목록 (가는 선 사이)
  (d, th) => sec(WHITE, [latin('POINTS', th.accentText), 12, heading(d.title, th), 30, {
    h: d.items.length * 112,
    make: y => d.items.flatMap((it, i) => {
      const top = y + i * 112
      return [
        rect(90, top, 600, 1, th.line),
        txt(90, top + 22, 90, `0${i + 1}`, 34, 700, th.accentText, 'cinzel', { lineHeight: 1.2 }),
        txt(190, top + 20, 500, it.title, 23, 800, th.ink, th.body, { lineHeight: 1.3 }),
        txt(190, top + 58, 500, one(it.desc), 17, 400, th.sub, th.body, { lineHeight: 1.5 }),
      ]
    }),
  }], { bottom: 56 }),
  // 2 체크 목록 (제목 + 설명 두 줄)
  (d, th) => sec(th.soft, [heading(d.title, th), 36, {
    h: d.items.length * 98 - 20,
    make: (y, gid) => d.items.flatMap((it, i) => {
      const top = y + i * 98
      const g = gid()
      return [
        rect(70, top - 8, 640, 86, WHITE, { radius: 18 }),
        { type: 'shape', group: g, shape: 'ellipse', x: 96, y: top + 12, w: 44, h: 44, fill: th.accent },
        { type: 'shape', group: g, shape: 'check', x: 107, y: top + 25, w: 22, h: 18, fill: th.onAccent },
        txt(162, top + 4, 520, it.title, 21, 800, th.ink, th.body, { lineHeight: 1.3 }),
        txt(162, top + 38, 520, one(it.desc), 16, 400, th.sub, th.body, { lineHeight: 1.5 }),
      ]
    }),
  }]),
  // 3 배지 격자 (짙은 바탕 · 육각 배지)
  (d, th) => sec(th.dark, [heading(d.title, th, { color: WHITE }), 40, {
    h: 232,
    make: (y, gid) => d.items.flatMap((it, i) => {
      const x = 40 + i * 240
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'hexagon', x: x + 50, y, w: 120, h: 104, fill: th.bright },
        txt(x + 50, y + Math.round((104 - textH('0', 30, 1.2)) / 2), 120, `0${i + 1}`, 30, 700, th.dark, 'cinzel', { align: 'center', lineHeight: 1.2, group: g }),
        txt(x + 10, y + 128, 200, it.title, 21, 800, WHITE, th.body, { align: 'center', lineHeight: 1.3 }),
        txt(x + 12, y + 166, 196, it.desc, 16, 400, mix(th.dark, '#ffffff', 0.72), th.body, { align: 'center', lineHeight: 1.6 }),
      ]
    }),
  }]),
  // 4 큰 숫자 강조 (좌우 번갈아)
  (d, th) => sec(WHITE, [heading(d.title, th), 36, {
    h: d.items.length * 130 - 20,
    make: y => d.items.flatMap((it, i) => {
      const top = y + i * 130
      const left = i % 2 === 0
      return [
        txt(left ? 70 : 560, top - 6, 150, `0${i + 1}`, 76, 400, th.accentText, 'black-han-sans', { align: left ? 'left' : 'right', lineHeight: 1.1 }),
        txt(left ? 240 : 70, top + 8, 470, it.title, 25, 800, th.ink, th.body, { align: left ? 'left' : 'right', lineHeight: 1.3 }),
        txt(left ? 240 : 70, top + 50, 470, one(it.desc), 17, 400, th.sub, th.body, { align: left ? 'left' : 'right', lineHeight: 1.5 }),
      ]
    }),
  }]),
  // 5 강조색 띠 + 흰 줄 카드
  (d, th) => sec(th.accent, [heading(d.title, th, { color: th.onAccent }), 34, {
    h: d.items.length * 108 - 16,
    make: (y, gid) => d.items.flatMap((it, i) => {
      const top = y + i * 108
      const g = gid()
      return [
        rect(70, top, 640, 92, WHITE, { radius: 18 }),
        { type: 'shape', group: g, shape: 'ellipse', x: 94, y: top + 20, w: 52, h: 52, fill: th.dark },
        txt(94, top + 20 + Math.round((52 - textH('1', 22, 1.2)) / 2), 52, String(i + 1), 22, 900, WHITE, 'noto-sans-kr', { align: 'center', lineHeight: 1.2, group: g }),
        txt(166, top + 14, 520, it.title, 21, 800, th.ink, th.body, { lineHeight: 1.3 }),
        txt(166, top + 48, 520, one(it.desc), 16, 400, th.sub, th.body, { lineHeight: 1.5 }),
      ]
    }),
  }]),
]

/** 사용법·관리법 3단계 — { title, items: [{ title, desc }] } */
const STEPS = [
  // 0 번호 카드
  (d, th) => sec(WHITE, [heading(d.title, th), 40, cards3(d.items, th, { cardBg: th.soft })]),
  // 1 가로 타임라인
  (d, th) => {
    const n = d.items.length
    const step = Math.floor(660 / n)
    const tw = step - 16
    const tt = d.items.map(it => wrapText(one(it.title), 20, tw, th.body))
    const dd = d.items.map(it => (it.desc ? wrapText(one(it.desc), 16, tw, th.body) : ''))
    const tH = Math.max(...tt.map(t => textH(t, 20, 1.3)))
    const dH = Math.max(0, ...dd.map(t => (t ? textH(t, 16, 1.6) : 0)))
    return sec(th.soft, [latin('HOW TO', th.accentText), 12, heading(d.title, th), 44, {
      h: 78 + tH + (dH ? 10 + dH : 0),
      make: (y, gid) => [
        { type: 'line', x: 60 + Math.round(step / 2), y: y + 19, w: step * (n - 1), strokeWidth: 3, color: th.accent },
        ...d.items.flatMap((it, i) => {
          const c = 60 + Math.round(step * (i + 0.5))
          const g = gid()
          return [
            { type: 'shape', group: g, shape: 'ellipse', x: c - 30, y: y - 10, w: 60, h: 60, fill: th.accent },
            txt(c - 30, y - 10 + Math.round((60 - textH('1', 24, 1.2)) / 2), 60, String(i + 1), 24, 900, th.onAccent, 'noto-sans-kr', { align: 'center', lineHeight: 1.2, group: g }),
            txt(c - Math.round(tw / 2), y + 70, tw, tt[i], 20, 800, th.ink, th.body, { align: 'center', lineHeight: 1.3 }),
            ...(dd[i] ? [txt(c - Math.round(tw / 2), y + 80 + tH, tw, dd[i], 16, 400, th.sub, th.body, { align: 'center', lineHeight: 1.6 })] : []),
          ]
        }),
      ],
    }])
  },
  // 2 번호 세로 목록
  (d, th) => sec(WHITE, [heading(d.title, th), 44, numberList(d.items, th)]),
  // 3 화살표로 잇는 상자
  (d, th) => {
    const n = d.items.length
    const ga = 34
    const bw = Math.floor((720 - ga * (n - 1)) / n)
    const x0 = cx(bw * n + ga * (n - 1))
    const tt = d.items.map(it => wrapText(one(it.title), n > 3 ? 19 : 22, bw - 24, th.body))
    const dd = d.items.map(it => (it.desc ? wrapText(one(it.desc), 16, bw - 24, th.body) : ''))
    const ts = n > 3 ? 19 : 22
    const tH = Math.max(...tt.map(t => textH(t, ts, 1.3)))
    const dH = Math.max(0, ...dd.map(t => (t ? textH(t, 16, 1.6) : 0)))
    const bh = 66 + tH + (dH ? 12 + dH : 0) + 30
    return sec(th.soft, [heading(d.title, th), 40, {
      h: bh,
      make: y => d.items.flatMap((it, i) => {
        const x = x0 + i * (bw + ga)
        return [
          rect(x, y, bw, bh, WHITE, { radius: 18, strokeWidth: 2, strokeColor: th.accent }),
          txt(x + 10, y + 26, bw - 20, `STEP ${i + 1}`, 15, 700, th.accentText, 'cinzel', { align: 'center', lineHeight: 1.3, letterSpacing: 0.2 }),
          txt(x + 12, y + 66, bw - 24, tt[i], ts, 800, th.ink, th.body, { align: 'center', lineHeight: 1.3 }),
          ...(dd[i] ? [txt(x + 12, y + 78 + tH, bw - 24, dd[i], 16, 400, th.sub, th.body, { align: 'center', lineHeight: 1.6 })] : []),
          ...(i < n - 1 ? [{ type: 'shape', shape: 'arrow', x: x + bw + 4, y: y + Math.round(bh / 2) - 14, w: ga - 8, h: 28, fill: th.accent }] : []),
        ]
      }),
    }])
  },
  // 4 STEP 꼬리표 줄 (왼쪽 막대)
  (d, th) => {
    const rows = d.items.map(it => {
      const t = wrapText(one(it.title), 22, 440, th.body)
      const ds = it.desc ? wrapText(one(it.desc), 17, 570, th.body) : ''
      return { t, ds, h: Math.max(34, textH(t, 22, 1.3)) + (ds ? 14 + textH(ds, 17, 1.5) : 0) }
    })
    return sec(WHITE, [heading(d.title, th), 40, {
      h: rows.reduce((s, r) => s + r.h, 0) + 28 * (rows.length - 1),
      make: (y, gid) => {
        let top = y
        return rows.flatMap((r, i) => {
          const g = gid()
          const out = [
            rect(90, top, 6, r.h, th.accent, { radius: 3 }),
            { type: 'shape', group: g, shape: 'rect', x: 120, y: top, w: 110, h: 34, fill: th.soft, radius: 17 },
            txt(120, top + Math.round((34 - textH('S', 15, 1.2)) / 2), 110, `STEP 0${i + 1}`, 15, 700, th.accentText, 'cinzel', { align: 'center', lineHeight: 1.2, group: g }),
            txt(250, top + 2, 440, r.t, 22, 800, th.ink, th.body, { lineHeight: 1.3 }),
            ...(r.ds ? [txt(120, top + Math.max(34, textH(r.t, 22, 1.3)) + 14, 570, r.ds, 17, 400, th.sub, th.body, { lineHeight: 1.5 })] : []),
          ]
          top += r.h + 28
          return out
        })
      },
    }])
  },
]

/** 표 (크기·스펙) — { title, cells, note, w, chips? } — 칸 내용·폭은 그대로, 둘레 모양만 */
const TABLES = [
  // 0 강조색 제목 줄
  (d, th) => sec(th.soft, [heading(d.title, th), 36, table(d.cells, th, { w: d.w }), 22, bodyT(d.note, th, { size: 17, color: th.muted })]),
  // 1 흰 카드 안 표 (짙은 제목 줄)
  (d, th) => {
    const tb = table(d.cells, th, { w: d.w, headerBg: th.dark, headerColor: WHITE, cellBg: WHITE })
    return sec(th.soft, [heading(d.title, th), 36, {
      h: tb.h + 56,
      make: (y, gid) => [rect(cx(d.w + 56), y, d.w + 56, tb.h + 56, WHITE, { radius: 22 }), ...tb.make(y + 28, gid)],
    }, 22, bodyT(d.note, th, { size: 17, color: th.muted })])
  },
  // 2 치수선 도식 + 표
  (d, th) => sec(WHITE, [heading(d.title, th), 34, {
    h: 196,
    make: (y, gid) => {
      const g = gid()
      return [
        rect(260, y + 36, 240, 140, th.soft, { radius: 10, strokeWidth: 2, strokeColor: th.ink }),
        { type: 'line', group: g, x: 260, y: y + 8, w: 240, strokeWidth: 2, color: th.accent, startCap: 'arrow', endCap: 'arrow' },
        txt(330, y - 22, 100, '가로', 16, 700, th.accentText, th.body, { align: 'center', lineHeight: 1.3, group: g }),
        { type: 'line', group: `${g}v`, x: 454, y: y + 94, w: 140, strokeWidth: 2, color: th.accent, startCap: 'arrow', endCap: 'arrow', rotation: 90 },
        txt(546, y + 94, 80, '세로', 16, 700, th.accentText, th.body, { lineHeight: 1.3, group: `${g}v` }),
      ]
    },
  }, 26, table(d.cells, th, { w: d.w, headerBg: th.ink, headerColor: WHITE, borderColor: th.line }), 22, bodyT(d.note, th, { size: 17, color: th.muted })], { top: 80 }),
  // 3 정보 칩 가로줄 + 표 (연한 제목 줄)
  (d, th) => {
    const chips = d.chips ?? ['단위 확인', '표기 그대로', '재는 법 안내']
    return sec(WHITE, [heading(d.title, th), 28, {
      h: 44,
      make: (y, gid) => chips.flatMap((c, i) => {
        const x = 90 + i * 206
        const g = gid()
        return [
          { type: 'shape', group: g, shape: 'rect', x, y, w: 190, h: 44, fill: th.soft, radius: 22 },
          { type: 'shape', group: g, shape: 'ellipse', x: x + 12, y: y + 12, w: 20, h: 20, fill: th.accent },
          txt(x + 38, y + Math.round((44 - textH('가', 16, 1.3)) / 2), 142, c, 16, 700, th.ink, th.body, { lineHeight: 1.3, group: g }),
        ]
      }),
    }, 30, table(d.cells, th, { w: d.w, headerBg: th.soft, headerColor: th.accentText, borderColor: th.line }), 22, bodyT(d.note, th, { size: 17, color: th.muted })])
  },
  // 4 두꺼운 테두리 표 (왼쪽 맞춤 제목 + 막대)
  (d, th) => sec(th.soft, [{ h: 6, make: y => [rect(cx(d.w), y, 56, 6, th.accent, { radius: 3 })] }, 18, heading(d.title, th, { x: cx(d.w), w: d.w }), 30,
    table(d.cells, th, { w: d.w, headerBg: WHITE, headerColor: th.accentText, borderColor: th.accent, borderWidth: 2, cellBg: WHITE, align: 'left' }), 22,
    bodyT(d.note, th, { size: 17, color: th.muted, x: cx(d.w), w: d.w })]),
]

/** 구매 전 안내 (+ 배송·교환 상자) — { title, notices, boxes?: [SHIP, RETURN] } */
const noticeLines = n => String(n).split('\n').map(l => l.replace(/^·\s*/, '')).filter(Boolean)
const NOTICES = [
  // 0 글 + 상자 두 개
  (d, th, o) => sec(o.bg ?? th.soft, [heading(d.title, th, { size: 28 }), 28, T(d.notices, 18, 400, th.sub, { font: th.body, w: 620, align: 'left', lh: 1.8 }),
    ...(d.boxes ? [44, boxes2(d.boxes, th, { boxBg: o.boxBg ?? WHITE })] : [])], o.sec),
  // 1 주의 상자 (! 원) + 상자 두 줄
  (d, th, o) => {
    const lines = T(d.notices, 18, 400, th.sub, { font: th.body, w: 540, x: 150, align: 'left', lh: 1.8 })
    return sec(o.bg ?? WHITE, [{
      h: lines.h + 110,
      make: (y, gid) => {
        const g = gid()
        return [
          rect(60, y, 660, lines.h + 110, WHITE, { radius: 20, strokeWidth: 2, strokeColor: th.accent }),
          { type: 'shape', group: g, shape: 'ellipse', x: 90, y: y + 30, w: 40, h: 40, fill: th.accent },
          txt(90, y + 30 + Math.round((40 - textH('!', 24, 1.2)) / 2), 40, '!', 24, 900, th.onAccent, 'noto-sans-kr', { align: 'center', lineHeight: 1.2, group: g }),
          txt(150, y + 32, 540, one(d.title), 24, headW(th.font), th.ink, th.font, { lineHeight: 1.3 }),
          ...lines.make(y + 82, gid),
        ]
      },
    }, ...(d.boxes ? [30, {
      h: 2 * 150 + 16,
      make: y => d.boxes.flatMap((b, i) => {
        const top = y + i * 166
        return [
          rect(60, top, 660, 150, th.soft, { radius: 16 }),
          txt(88, top + 24, 170, b.title, 20, 800, th.accentText, th.body, { lineHeight: 1.3 }),
          txt(270, top + 22, 420, b.body.replace(/\n {2}/g, ' '), 16, 400, th.sub, th.body, { lineHeight: 1.7 }),
        ]
      }),
    }] : [])], o.sec)
  },
  // 2 아이콘 목록 + 머리띠 상자
  (d, th, o) => {
    const ls = noticeLines(d.notices)
    return sec(o.bg ?? th.soft, [heading(d.title, th, { size: 28 }), 30, {
      h: ls.length * 54 - 14,
      make: (y, gid) => ls.flatMap((l, i) => {
        const g = gid()
        return [
          { type: 'shape', group: g, shape: 'diamond', x: 96, y: y + i * 54 + 9, w: 18, h: 18, fill: th.accent },
          txt(130, y + i * 54, 560, l, 18, 400, th.ink, th.body, { lineHeight: 1.5, group: g }),
        ]
      }),
    }, ...(d.boxes ? [40, {
      h: 250,
      make: y => d.boxes.flatMap((b, i) => {
        const x = 40 + i * 360
        return [
          rect(x, y, 340, 250, WHITE, { radius: 16 }),
          rect(x, y, 340, 56, th.accent, { radius: 16 }),
          txt(x + 24, y + Math.round((56 - textH('가', 20, 1.3)) / 2), 292, b.title, 20, 800, th.onAccent, th.body, { lineHeight: 1.3 }),
          txt(x + 24, y + 80, 292, b.body, 16, 400, th.sub, th.body, { lineHeight: 1.75 }),
        ]
      }),
    }] : [])], o.sec)
  },
  // 3 묻고 답하기 (FAQ)
  (d, th, o) => {
    const qa = [
      ['구매 전에 무엇을 확인하면 좋을까요?', noticeLines(d.notices).join('\n')],
      ...(d.boxes ? d.boxes.map(b => [b.title === '배송 안내' ? '배송은 어떻게 되나요?' : '교환·반품은 어떻게 하나요?', b.body.replace(/\n {2}/g, ' ').split('\n').map(l => l.replace(/^·\s*/, '')).join('\n')]) : []),
    ]
    return sec(o.bg ?? WHITE, [latin('FAQ', th.accentText), 12, heading(d.title, th, { size: 28 }), 36, ...qa.flatMap(([q, a], i) => {
      const at = wrapText(a, 17, 560, th.body)
      return [...(i ? [30] : []), {
        h: 48 + textH(at, 17, 1.7),
        make: (y, gid) => {
          const g = gid()
          return [
            { type: 'shape', group: g, shape: 'ellipse', x: 80, y, w: 40, h: 40, fill: th.accent },
            txt(80, y + Math.round((40 - textH('Q', 20, 1.2)) / 2), 40, 'Q', 20, 900, th.onAccent, 'noto-sans-kr', { align: 'center', lineHeight: 1.2, group: g }),
            txt(136, y + 6, 560, q, 20, 800, th.ink, th.body, { lineHeight: 1.3 }),
            txt(136, y + 48, 560, at, 17, 400, th.sub, th.body, { lineHeight: 1.7 }),
          ]
        },
      }]
    })], o.sec)
  },
  // 4 말풍선 + 알약 머리 상자
  (d, th, o) => {
    const body = T(d.notices, 18, 400, th.ink, { font: th.body, w: 560, x: 110, align: 'left', lh: 1.8 })
    const bh = body.h + 150
    return sec(o.bg ?? th.soft, [heading(d.title, th, { size: 28 }), 30, {
      h: bh,
      make: (y, gid) => {
        const g = gid()
        return [
          { type: 'shape', group: g, shape: 'bubble', x: 70, y, w: 640, h: bh, fill: WHITE },
          ...body.make(y + 52, gid).map(p => ({ ...p, group: g })),
        ]
      },
    }, ...(d.boxes ? [36, {
      h: 250,
      make: (y, gid) => d.boxes.flatMap((b, i) => {
        const x = 40 + i * 360
        const g = gid()
        return [
          rect(x, y + 22, 340, 228, WHITE, { radius: 16, strokeWidth: 1, strokeColor: th.line }),
          { type: 'shape', group: g, shape: 'rect', x: x + 24, y, w: 170, h: 44, fill: th.dark, radius: 22 },
          txt(x + 24, y + Math.round((44 - textH('가', 18, 1.3)) / 2), 170, b.title, 18, 800, WHITE, th.body, { align: 'center', lineHeight: 1.3, group: g }),
          txt(x + 24, y + 70, 292, b.body, 16, 400, th.sub, th.body, { lineHeight: 1.75 }),
        ]
      }),
    }] : [])], o.sec)
  },
]

/** 이런 분께 추천 (체크 3줄) — { title, lines } */
const RECOMMEND = [
  // 0 체크 원
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 40, checks(d.lines, th)], o.sec),
  // 1 알약 줄
  (d, th, o) => sec(o.bg ?? th.soft, [latin('RECOMMEND', th.accentText), 12, heading(d.title, th), 36, {
    h: d.lines.length * 76 - 16,
    make: (y, gid) => d.lines.flatMap((l, i) => {
      const g = gid()
      const top = y + i * 76
      return [
        { type: 'shape', group: g, shape: 'rect', x: 110, y: top, w: 560, h: 60, fill: WHITE, radius: 30, strokeWidth: 2, strokeColor: th.accent },
        { type: 'shape', group: g, shape: 'check', x: 140, y: top + 21, w: 22, h: 18, fill: th.accent },
        txt(176, top + Math.round((60 - textH('가', 20, 1.3)) / 2), 470, l, 20, 700, th.ink, th.body, { lineHeight: 1.3, group: g }),
      ]
    }),
  }], o.sec),
  // 2 카드 3장 (위에 체크 원)
  (d, th, o) => sec(o.bg ?? th.soft, [heading(d.title, th), 40, {
    h: 210,
    make: (y, gid) => d.lines.flatMap((l, i) => {
      const x = 40 + i * 240
      const g = gid()
      const t = wrapText(l, 19, 186, th.body)
      return [
        rect(x, y, 220, 210, WHITE, { radius: 18 }),
        { type: 'shape', group: g, shape: 'ellipse', x: x + 84, y: y + 26, w: 52, h: 52, fill: th.accent },
        { type: 'shape', group: g, shape: 'check', x: x + 98, y: y + 43, w: 24, h: 19, fill: th.onAccent },
        txt(x + 17, y + 100, 186, t, 19, 700, th.ink, th.body, { align: 'center', lineHeight: 1.45 }),
      ]
    }),
  }], o.sec),
  // 3 형광펜 줄 (가운데)
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 36, {
    h: d.lines.length * 70 - 22,
    make: y => d.lines.flatMap((l, i) => {
      const top = y + i * 70
      const w = Math.min(620, Math.round(textUnits(l, th.body) * 22) + 40)
      return [
        rect(cx(w), top + 22, w, 20, th.accent, { fillOpacity: 0.22, radius: 4 }),
        txt(70, top, 640, l, 22, 700, th.ink, th.body, { align: 'center', lineHeight: 1.3 }),
      ]
    }),
  }], o.sec),
  // 4 말풍선 좌우
  (d, th, o) => sec(o.bg ?? th.soft, [heading(d.title, th), 36, {
    h: d.lines.length * 118 - 18,
    make: (y, gid) => d.lines.flatMap((l, i) => {
      const x = i % 2 === 0 ? 70 : 250
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'bubble', x, y: y + i * 118, w: 460, h: 100, fill: i % 2 === 0 ? WHITE : th.accent },
        txt(x + 24, y + i * 118 + Math.round((82 - textH('가', 20, 1.3)) / 2), 412, l, 20, 700, i % 2 === 0 ? th.ink : th.onAccent, th.body, { align: 'center', lineHeight: 1.3, group: g }),
      ]
    }),
  }], o.sec),
]

/** 후기 인용 — { quote, by, title? } (별점 + 짧은 글 자리표시) */
const stars = (n, x, y, size, fill, g) => Array.from({ length: n }, (_, i) => ({ type: 'shape', group: g, shape: 'star', x: x + i * (size + 8), y, w: size, h: size, fill }))
const REVIEWS = [
  // 0 별점 + 가운데 인용
  (d, th, o) => sec(o.bg ?? th.soft, [{ h: 30, make: (y, gid) => stars(5, cx(5 * 30 + 32), y, 30, th.accent, gid()) }, 26,
    T(d.quote, 28, headW(th.font), th.ink, { font: th.font, w: 640, lh: 1.5 }), 20, bodyT(d.by, th, { size: 16, color: th.muted })], o.sec),
  // 1 큰 따옴표 + 왼쪽 막대
  (d, th, o) => sec(o.bg ?? WHITE, [{
    h: 0, make: () => [txt(80, 40, 120, '“', 120, 700, th.accentText, 'noto-serif-kr', { lineHeight: 1 }), rect(90, 170, 4, 20, th.accent)],
  }, 88, T(d.quote, 28, headW(th.font), th.ink, { font: th.font, w: 560, x: 110, align: 'left', lh: 1.5 }), 20, bodyT(d.by, th, { size: 16, color: th.muted, x: 110, w: 560 })], { top: 72, ...o.sec }),
  // 2 후기 카드 두 장
  (d, th, o) => {
    const q = wrapText(one(d.quote).replace(/["“”]/g, ''), 18, 280, th.body)
    const cards = [q, wrapText('[두 번째 후기를\n적어 주세요]', 18, 280, th.body)]
    const ch = Math.max(...cards.map(c => textH(c, 18, 1.6))) + 110
    return sec(o.bg ?? th.soft, [heading(d.title ?? '먼저 써 본 분들의 후기', th, { size: 28 }), 34, {
      h: ch,
      make: (y, gid) => cards.flatMap((c, i) => {
        const x = 40 + i * 360
        return [
          rect(x, y, 340, ch, WHITE, { radius: 18 }),
          ...stars(5, x + 30, y + 28, 22, th.accent, gid()),
          txt(x + 30, y + 70, 280, c, 18, 700, th.ink, th.body, { lineHeight: 1.6 }),
          txt(x + 30, y + ch - 40, 280, i ? '— [고객 이름]' : one(d.by).replace(/^—\s*/, '— '), 14, 400, th.muted, th.body, { lineHeight: 1.4 }),
        ]
      }),
    }], o.sec)
  },
  // 3 강조색 띠
  (d, th, o) => sec(th.accent, [{ h: 26, make: (y, gid) => stars(5, cx(5 * 26 + 32), y, 26, th.onAccent, gid()) }, 24,
    T(d.quote, 28, headW(th.font), th.onAccent, { font: th.font, w: 640, lh: 1.5 }), 18, T(d.by, 16, 400, th.onAccent, { font: th.body, w: 640, lh: 1.5 })], o.sec),
]

/** 상세컷 1장 — { slot, sample?, title?, lead?, caption?, h? } */
const DETAIL1 = [
  // 0 제목·설명 → 둥근 사진 → 설명
  (d, th, o) => sec(o.bg ?? WHITE, [...(d.title ? [heading(d.title, th), 16] : []), ...(d.lead ? [bodyT(d.lead, th), 32] : []), photo(d.slot, d.h ?? 440, { sample: d.sample }),
    ...(d.caption ? [20, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { top: d.title ? 72 : 40, ...o.sec }),
  // 1 폭 가득 사진 + 아래 띠 글 (도형 + 글자 한 묶음)
  (d, th, o) => sec(o.bg ?? WHITE, [...(d.title ? [heading(d.title, th), 30] : []), {
    h: 500,
    make: (y, gid) => {
      const g = gid()
      const cap = wrapText(one(d.lead ?? d.caption ?? ''), 18, 560, th.body)
      const ch = textH(cap, 18, 1.5) + 36
      return [
        { type: 'image', slot: d.slot, x: 0, y, w: W, h: 500, ...(d.sample ? { sample: d.sample } : {}) },
        ...(cap ? [
          { type: 'shape', group: g, shape: 'rect', x: 40, y: y + 500 - ch - 30, w: 620, h: ch, fill: th.dark, fillOpacity: 0.86, radius: 12 },
          txt(70, y + 500 - ch - 12, 560, cap, 18, 400, WHITE, th.body, { lineHeight: 1.5, group: g }),
        ] : []),
      ]
    },
  }, ...(d.caption && d.lead ? [20, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { top: d.title ? 72 : 0, bottom: d.caption && d.lead ? 56 : 40, ...o.sec }),
  // 2 둥근 확대컷 + 화살표 설명
  (d, th, o) => {
    const title = d.title ? wrapText(d.title, 26, 280, th.font) : ''
    const lead = wrapText(one(d.lead ?? d.caption ?? ''), 17, 280, th.body)
    const tH = title ? textH(title, 26, 1.3) + 16 : 0
    const inner = tH + textH(lead, 17, 1.6)
    return sec(o.bg ?? th.soft, [{
      h: 380,
      make: (y, gid) => {
        const ty = y + Math.round((380 - inner) / 2)
        return [
          { type: 'shape', shape: 'ellipse', x: 50, y: y - 10, w: 400, h: 400, fill: WHITE },
          { type: 'image', slot: d.slot, x: 60, y, w: 380, h: 380, radius: 190, ...(d.sample ? { sample: d.sample } : {}) },
          { type: 'line', x: 440, y: ty + 16, w: 20, strokeWidth: 2, color: th.accent, endCap: 'arrow' },
          ...(title ? [txt(470, ty, 280, title, 26, headW(th.font), th.ink, th.font, { lineHeight: 1.3 })] : []),
          txt(470, ty + tH, 280, lead, 17, 400, th.sub, th.body, { lineHeight: 1.6 }),
        ]
      },
    }], { top: 70, bottom: 70, ...o.sec })
  },
  // 3 옆 글 + 세로 사진
  (d, th, o) => {
    const title = d.title ? wrapText(d.title, 28, 300, th.font) : ''
    const lead = wrapText(one(d.lead ?? ''), 17, 300, th.body)
    const cap = d.caption && d.lead ? wrapText(one(d.caption), 15, 300, th.body) : ''
    return sec(o.bg ?? WHITE, [{
      h: 480,
      make: () => [],
    }], {
      top: 64, bottom: 64, ...o.sec,
      tail: () => {
        const y0 = 64
        const tH = title ? textH(title, 28, 1.3) : 0
        const lH = lead ? textH(lead, 17, 1.6) : 0
        const cH = cap ? textH(cap, 15, 1.5) : 0
        const inner = tH + (title ? 30 : 0) + lH + (cap ? 20 + cH : 0)
        let ty = y0 + Math.round((480 - inner) / 2)
        const out = [{ type: 'image', slot: d.slot, x: 400, y: y0, w: 340, h: 480, radius: 20, ...(d.sample ? { sample: d.sample } : {}) }]
        if (title) { out.push(txt(50, ty, 310, title, 28, headW(th.font), th.ink, th.font, { lineHeight: 1.3 }), rect(50, ty + tH + 12, 40, 4, th.accent, { radius: 2 })); ty += tH + 30 }
        if (lead) { out.push(txt(50, ty, 310, lead, 17, 400, th.sub, th.body, { lineHeight: 1.6 })); ty += lH }
        if (cap) out.push(txt(50, ty + 20, 310, cap, 15, 400, th.muted, th.body, { lineHeight: 1.5 }))
        return out
      },
    })
  },
  // 4 두꺼운 틀 사진 + 아래 제목
  (d, th, o) => sec(o.bg ?? th.soft, [{
    h: 440, make: () => [{ type: 'image', slot: d.slot, x: 110, y: 64, w: 560, h: 440, borderWidth: 14, borderColor: WHITE, shadow: 24, ...(d.sample ? { sample: d.sample } : {}) }],
  }, 30, ...(d.title ? [heading(d.title, th, { size: 28 }), 12] : []), ...(d.lead ? [bodyT(d.lead, th)] : []), ...(d.caption && !d.lead ? [bodyT(d.caption, th, { size: 16, color: th.muted })] : [])],
  { top: 64, bottom: 64, ...o.sec }),
]

/** 상세컷 2장 — { slots: [a, b], samples?, caption?, title? } */
const DETAIL2 = [
  // 0 두 칸 나란히
  (d, th, o) => sec(o.bg ?? WHITE, [...(d.title ? [heading(d.title, th), 30] : []), {
    h: 460, make: y => d.slots.map((s, i) => ({ type: 'image', slot: s, x: 40 + i * 360, y, w: 340, h: 460, radius: 14, ...(d.samples?.[i] ? { sample: d.samples[i] } : {}) })),
  }, ...(d.caption ? [22, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { top: d.title ? 72 : 40, bottom: 56, ...o.sec }),
  // 1 비껴 겹친 두 장 (한 묶음)
  (d, th, o) => sec(o.bg ?? th.soft, [...(d.title ? [heading(d.title, th), 30] : []), {
    h: 560,
    make: (y, gid) => {
      const g = gid()
      return [
        { type: 'image', group: g, slot: d.slots[0], x: 50, y, w: 380, h: 470, borderWidth: 10, borderColor: WHITE, shadow: 20, ...(d.samples?.[0] ? { sample: d.samples[0] } : {}) },
        { type: 'image', group: g, slot: d.slots[1], x: 350, y: y + 90, w: 380, h: 470, borderWidth: 10, borderColor: WHITE, shadow: 30, ...(d.samples?.[1] ? { sample: d.samples[1] } : {}) },
      ]
    },
  }, ...(d.caption ? [26, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { top: d.title ? 72 : 56, bottom: 56, ...o.sec }),
  // 2 전·후 비교 (BEFORE / AFTER 알약 + 가운데 화살표)
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title ?? '한눈에 비교해 보세요', th, { size: 28 }), 30, {
    h: 440,
    make: (y, gid) => d.slots.flatMap((s, i) => {
      const x = 40 + i * 360
      const g = gid()
      return [
        { type: 'image', slot: s, x, y, w: 340, h: 440, radius: 14, ...(d.samples?.[i] ? { sample: d.samples[i] } : {}) },
        { type: 'shape', group: g, shape: 'rect', x: x + 16, y: y + 16, w: 116, h: 38, fill: i ? th.accent : th.dark, radius: 19 },
        txt(x + 16, y + 16 + Math.round((38 - textH('B', 15, 1.2)) / 2), 116, i ? 'AFTER' : 'BEFORE', 15, 700, i ? th.onAccent : WHITE, 'cinzel', { align: 'center', lineHeight: 1.2, group: g }),
      ]
    }),
  }, ...(d.caption ? [22, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { bottom: 56, ...o.sec }),
  // 3 큰 사진 + 작은 사진 (아래 맞춤)
  (d, th, o) => sec(o.bg ?? WHITE, [...(d.title ? [heading(d.title, th), 30] : []), {
    h: 500,
    make: y => [
      { type: 'image', slot: d.slots[0], x: 40, y, w: 440, h: 500, radius: 18, ...(d.samples?.[0] ? { sample: d.samples[0] } : {}) },
      { type: 'image', slot: d.slots[1], x: 500, y: y + 200, w: 240, h: 300, radius: 18, ...(d.samples?.[1] ? { sample: d.samples[1] } : {}) },
      ...(d.caption ? [txt(500, y + 10, 240, wrapText(one(d.caption), 16, 240, th.body), 16, 400, th.sub, th.body, { lineHeight: 1.6 })] : []),
      rect(500, y + 170, 40, 4, th.accent, { radius: 2 }),
    ],
  }], { top: d.title ? 72 : 48, bottom: 56, ...o.sec }),
]

/** 상세컷 3장 — { slots: [a, b, c], samples?, caption?, title? } */
const DETAIL3 = [
  // 0 세 장 한 줄
  (d, th, o) => sec(o.bg ?? WHITE, [...(d.title ? [heading(d.title, th), 30] : []), {
    h: 260, make: y => d.slots.map((s, i) => ({ type: 'image', slot: s, x: 40 + i * 240, y, w: 220, h: 260, radius: 12, ...(d.samples?.[i] ? { sample: d.samples[i] } : {}) })),
  }, ...(d.caption ? [22, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { top: d.title ? 72 : 60, bottom: 60, ...o.sec }),
  // 1 크기 다른 콜라주 (큰 한 장 + 작은 두 장)
  (d, th, o) => sec(o.bg ?? th.soft, [...(d.title ? [heading(d.title, th), 30] : []), {
    h: 540,
    make: y => [
      { type: 'image', slot: d.slots[0], x: 40, y, w: 440, h: 540, radius: 16, ...(d.samples?.[0] ? { sample: d.samples[0] } : {}) },
      { type: 'image', slot: d.slots[1], x: 500, y, w: 240, h: 260, radius: 16, ...(d.samples?.[1] ? { sample: d.samples[1] } : {}) },
      { type: 'image', slot: d.slots[2], x: 500, y: y + 280, w: 240, h: 260, radius: 16, ...(d.samples?.[2] ? { sample: d.samples[2] } : {}) },
    ],
  }, ...(d.caption ? [22, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { top: d.title ? 72 : 56, bottom: 56, ...o.sec }),
  // 2 구성품 한눈에 (둥근 사진 + 이름 자리표시)
  (d, th, o) => sec(o.bg ?? WHITE, [latin('WHAT’S IN THE BOX', th.accentText), 12, heading('구성품 한눈에', th), 36, {
    h: 270,
    make: y => d.slots.flatMap((s, i) => {
      const x = 60 + i * 230
      return [
        { type: 'shape', shape: 'ellipse', x: x - 6, y: y - 6, w: 212, h: 212, fill: th.soft },
        { type: 'image', slot: s, x, y, w: 200, h: 200, radius: 100, ...(d.samples?.[i] ? { sample: d.samples[i] } : {}) },
        txt(x - 10, y + 226, 220, `[구성품 ${i + 1}]`, 18, 700, th.ink, th.body, { align: 'center', lineHeight: 1.4 }),
      ]
    }),
  }, ...(d.caption ? [20, bodyT(d.caption, th, { size: 16, color: th.muted })] : [])], { bottom: 60, ...o.sec }),
]

/** 포인트마다 사진 (포인트 i번째 한 구간) — { i, title, desc, slot, sample? } */
const POINT_PHOTOS = [
  // 0 POINT 알약 → 제목 → 설명 → 사진
  (d, th, o) => sec(o.bg, [pill(`POINT ${d.i + 1}`, th.accent, th.onAccent, { w: 160 }), 22, heading(d.title, th, { size: 34 }), 14,
    bodyT(d.desc, th, { size: 20 }), 36, photo(d.slot, 420, { sample: d.sample })], { top: 64, bottom: 64 }),
  // 1 지그재그 (사진 · 글 좌우 번갈아 — 포인트 번호로)
  (d, th, o) => {
    const left = d.i % 2 === 0
    const title = wrapText(d.title, 28, 300, th.font)
    const desc = wrapText(one(d.desc), 17, 300, th.body)
    const tH = textH(title, 28, 1.3), dH = textH(desc, 17, 1.6)
    const inner = 56 + tH + 16 + dH
    const tx = left ? 430 : 50
    const y0 = 60 + Math.round((460 - inner) / 2)
    return {
      height: 580, bg: o.bg,
      items: [
        { type: 'image', slot: d.slot, x: left ? 40 : 400, y: 60, w: 340, h: 460, radius: 20, ...(d.sample ? { sample: d.sample } : {}) },
        txt(tx, y0, 300, `POINT 0${d.i + 1}`, 30, 700, th.accentText, 'cinzel', { lineHeight: 1.3 }),
        txt(tx, y0 + 56, 300, title, 28, headW(th.font), th.ink, th.font, { lineHeight: 1.3 }),
        txt(tx, y0 + 56 + tH + 16, 300, desc, 17, 400, th.sub, th.body, { lineHeight: 1.6 }),
      ],
    }
  },
  // 2 큰 번호 + 폭 가득 사진
  (d, th, o) => sec(o.bg, [{
    h: 96,
    make: () => [
      txt(60, 60, 150, `0${d.i + 1}`, 88, 400, th.accentText, 'black-han-sans', { lineHeight: 1.05 }),
      txt(210, 64, 510, wrapText(d.title, 28, 510, th.font), 28, headW(th.font), th.ink, th.font, { lineHeight: 1.3 }),
      txt(210, 110, 510, wrapText(one(d.desc), 17, 510, th.body), 17, 400, th.sub, th.body, { lineHeight: 1.5 }),
    ],
  }, 40, { h: 440, make: y => [{ type: 'image', slot: d.slot, x: 0, y, w: W, h: 440, ...(d.sample ? { sample: d.sample } : {}) }] }], { top: 60, bottom: 0 }),
  // 3 사진 위 제목 띠 (도형 + 글자 한 묶음) + 아래 설명
  (d, th, o) => sec(o.bg, [{
    h: 480,
    make: (y, gid) => {
      const g = gid()
      const t = `${d.i + 1}. ${d.title}`
      return [
        { type: 'image', slot: d.slot, x: 40, y, w: 700, h: 480, radius: 24, ...(d.sample ? { sample: d.sample } : {}) },
        { type: 'shape', group: g, shape: 'rect', x: 40, y: y + 380, w: 470, h: 70, fill: th.accent },
        txt(64, y + 380 + Math.round((70 - textH(t, 24, 1.3)) / 2), 430, t, 24, 800, th.onAccent, th.body, { lineHeight: 1.3, group: g }),
      ]
    },
  }, 26, bodyT(d.desc, th, { size: 19 })], { top: 60, bottom: 64 }),
]
/** 정보 줄 (이벤트 — 항목 · 내용) — { title, rows } */
const ROWS = [
  // 0 테두리 카드 안 줄
  (d, th, o) => sec(o.bg ?? th.soft, [heading(d.title, th), 32, {
    h: d.rows.length * 62 + 32,
    make: y => [
      rect(70, y, 640, d.rows.length * 62 + 32, th.card ?? WHITE, { radius: 20, strokeWidth: 1, strokeColor: th.line }),
      ...d.rows.flatMap(([k, v], i) => {
        const ty = y + 16 + i * 62 + Math.round((62 - textH('가', 20, 1.4)) / 2)
        return [txt(106, ty, 150, k, 20, 800, th.accentText, th.body), txt(270, ty, 410, v, 20, 400, th.ink, th.body)]
      }),
    ],
  }], o.sec),
  // 1 번갈아 칠한 줄
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 32, {
    h: d.rows.length * 64,
    make: y => d.rows.flatMap(([k, v], i) => {
      const top = y + i * 64
      const ty = top + Math.round((64 - textH('가', 20, 1.4)) / 2)
      return [
        ...(i % 2 === 0 ? [rect(70, top, 640, 64, th.soft, { radius: 10 })] : []),
        txt(100, ty, 160, k, 20, 800, th.ink, th.body), txt(280, ty, 400, v, 20, 400, th.sub, th.body),
      ]
    }),
  }], o.sec),
  // 2 강조색 항목 칸 + 흰 내용 칸
  (d, th, o) => sec(o.bg ?? th.soft, [latin('INFORMATION', th.accentText), 12, heading(d.title, th), 32, {
    h: d.rows.length * 74 - 12,
    make: (y, gid) => d.rows.flatMap(([k, v], i) => {
      const top = y + i * 74
      const g = gid()
      const ty = top + Math.round((62 - textH('가', 19, 1.4)) / 2)
      return [
        { type: 'shape', group: g, shape: 'rect', x: 70, y: top, w: 190, h: 62, fill: th.accent, radius: 12 },
        txt(80, ty, 170, k, 19, 800, th.onAccent, th.body, { align: 'center', group: g }),
        rect(270, top, 440, 62, WHITE, { radius: 12 }),
        txt(292, ty, 400, v, 19, 400, th.ink, th.body),
      ]
    }),
  }], o.sec),
  // 3 점선 아래줄 목록
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 30, {
    h: d.rows.length * 66,
    make: y => d.rows.flatMap(([k, v], i) => {
      const top = y + i * 66
      const ty = top + 14
      return [
        txt(90, ty, 200, k, 20, 800, th.ink, th.body), txt(300, ty, 390, v, 20, 400, th.sub, th.body, { align: 'right' }),
        { type: 'line', x: 90, y: top + 50, w: 600, strokeWidth: 2, color: th.line, dash: 'dotted' },
      ]
    }),
  }], o.sec),
]

/** 혜택 카드 3장 (이벤트) — { title, perks: [{ big, desc }] } */
const PERKS = [
  // 0 테두리 카드
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 36, {
    h: 220,
    make: y => d.perks.flatMap((p, i) => {
      const x = 40 + i * 240
      return [
        rect(x, y, 220, 220, th.card ?? WHITE, { radius: 20, strokeWidth: 1, strokeColor: th.line }),
        txt(x + 10, y + 40, 200, p.big, 38, 400, th.accentText, 'black-han-sans', { align: 'center', lineHeight: 1.15 }),
        txt(x + 14, y + 112, 192, p.desc, 17, 400, th.sub, th.body, { align: 'center', lineHeight: 1.6 }),
      ]
    }),
  }], o.sec),
  // 1 강조색 원 + 아래 글
  (d, th, o) => sec(o.bg ?? th.soft, [heading(d.title, th), 40, {
    h: 280,
    make: (y, gid) => d.perks.flatMap((p, i) => {
      const x = 40 + i * 240
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'ellipse', x: x + 30, y, w: 160, h: 160, fill: th.accent },
        txt(x + 30, y + Math.round((160 - textH('가', 34, 1.15)) / 2), 160, p.big, 34, 400, th.onAccent, 'black-han-sans', { align: 'center', lineHeight: 1.15, group: g }),
        txt(x + 14, y + 184, 192, p.desc, 17, 400, th.ink, th.body, { align: 'center', lineHeight: 1.6 }),
      ]
    }),
  }], o.sec),
  // 2 가로 줄 목록 (왼쪽 큰 말)
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 34, {
    h: d.perks.length * 110 - 14,
    make: y => d.perks.flatMap((p, i) => {
      const top = y + i * 110
      return [
        rect(70, top, 640, 96, th.soft, { radius: 18 }),
        txt(90, top + Math.round((96 - textH('가', 34, 1.15)) / 2), 200, p.big, 34, 400, th.accentText, 'black-han-sans', { align: 'center', lineHeight: 1.15 }),
        rect(300, top + 22, 2, 52, th.line),
        txt(326, top + Math.round((96 - textH(one(p.desc), 18, 1.5)) / 2), 360, one(p.desc), 18, 700, th.ink, th.body, { lineHeight: 1.5 }),
      ]
    }),
  }], o.sec),
  // 3 쿠폰 모양 (짙은 바탕)
  (d, th, o) => sec(th.dark, [heading(d.title, th, { color: WHITE }), 36, {
    h: 200,
    make: (y, gid) => d.perks.flatMap((p, i) => {
      const x = 40 + i * 240
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'rect', x, y, w: 220, h: 200, fill: WHITE, radius: 16 },
        { type: 'shape', group: g, shape: 'ellipse', x: x - 14, y: y + 86, w: 28, h: 28, fill: th.dark },
        { type: 'shape', group: g, shape: 'ellipse', x: x + 206, y: y + 86, w: 28, h: 28, fill: th.dark },
        txt(x + 10, y + 34, 200, p.big, 36, 400, th.accentText, 'black-han-sans', { align: 'center', lineHeight: 1.15, group: g }),
        txt(x + 20, y + 100, 180, p.desc, 16, 400, th.sub, th.body, { align: 'center', lineHeight: 1.6, group: g }),
      ]
    }),
  }], o.sec),
]

// ── 촬영 세트 템플릿(studioTemplateShoots)용 종류 — 기존 템플릿은 쓰지 않는다 (SECTION_VARIANTS 끝에 붙여 예전 모양 번호가 그대로) ──

/** 브랜드 문장 — { label, text, sub? } */
const STATEMENTS = [
  // 0 가운데 큰 문장 (연한 바탕)
  (d, th, o) => sec(o.bg ?? th.soft, [latin(d.label, th.accentText), 18, T(wrapText(d.text, 34, 640, th.font), 34, headW(th.font), th.ink, { font: th.font, lh: 1.5, w: 640 }), 26, bar(th.accent, 40, 3),
    ...(d.sub ? [24, bodyT(d.sub, th, { color: th.sub })] : [])], { top: 96, bottom: 96, ...o.sec }),
  // 1 짙은 띠 문장
  (d, th, o) => sec(th.dark, [latin(d.label, th.bright), 18, T(wrapText(d.text, 34, 640, th.font), 34, headW(th.font), WHITE, { font: th.font, lh: 1.5, w: 640 }), 26, bar(th.bright, 40, 3),
    ...(d.sub ? [24, bodyT(d.sub, th, { color: mix(th.dark, '#ffffff', 0.78) })] : [])], { top: 100, bottom: 100, ...o.sec }),
  // 2 왼쪽 막대 + 왼쪽 맞춤 문장
  (d, th, o) => {
    const t = wrapText(d.text, 32, 560, th.font)
    const s = d.sub ? wrapText(one(d.sub), 17, 560, th.body) : ''
    const tH = textH(t, 32, 1.45), sH = s ? textH(s, 17, 1.6) : 0
    const h = 20 + 14 + tH + (s ? 18 + sH : 0)
    return sec(o.bg ?? WHITE, [{
      h,
      make: () => [],
    }], {
      top: 88, bottom: 88, ...o.sec,
      tail: () => {
        const y = 88
        return [
          rect(90, y, 6, h, th.accent, { radius: 3 }),
          txt(122, y, 560, d.label, 15, 700, th.accentText, 'cinzel', { lineHeight: 1.3, letterSpacing: 0.3 }),
          txt(122, y + 34, 560, t, 32, headW(th.font), th.ink, th.font, { lineHeight: 1.45 }),
          ...(s ? [txt(122, y + 34 + tH + 18, 560, s, 17, 400, th.sub, th.body, { lineHeight: 1.6 })] : []),
        ]
      },
    })
  },
]

/** 사용 장면 (사진 한 장이 주인공) — { slot, sample?, label, title, desc } */
const STORIES = [
  // 0 폭·높이 가득 사진 + 아래 어둡게 + 흰 글
  (d, th) => {
    const H = 1040
    const title = wrapText(d.title, 34, 660, th.font)
    const desc = wrapText(one(d.desc), 18, 620, th.body)
    const tH = textH(title, 34, 1.35), dH = textH(desc, 18, 1.6)
    const dy = H - 76 - dH
    const ty = dy - 16 - tH
    return {
      height: H, bg: th.dark,
      items: [
        { type: 'image', slot: d.slot, x: 0, y: 0, w: W, h: H, ...(d.sample ? { sample: d.sample } : {}) },
        rect(0, 520, W, H - 520, '#000000', { fillOpacity: 0.42 }),
        txt(60, ty - 34, 400, d.label, 15, 700, '#f3f4f6', 'cinzel', { lineHeight: 1.3, letterSpacing: 0.3 }),
        txt(60, ty, 660, title, 34, headW(th.font), WHITE, th.font, { lineHeight: 1.35 }),
        txt(60, dy, 620, desc, 18, 400, '#eceef1', th.body, { lineHeight: 1.6 }),
      ],
    }
  },
  // 1 폭 가득 사진 + 왼쪽 위 흰 글 상자
  (d, th) => {
    const H = 900
    const title = wrapText(d.title, 28, 380, th.font)
    const desc = wrapText(one(d.desc), 16, 380, th.body)
    const tH = textH(title, 28, 1.35), dH = textH(desc, 16, 1.6)
    const bh = 32 + 20 + 12 + tH + 12 + dH + 32
    return {
      height: H, bg: th.soft,
      items: [
        { type: 'image', slot: d.slot, x: 0, y: 0, w: W, h: H, ...(d.sample ? { sample: d.sample } : {}) },
        rect(40, 40, 440, bh, WHITE, { fillOpacity: 0.9, radius: 18 }),
        txt(70, 72, 380, d.label, 15, 700, th.accentText, 'cinzel', { lineHeight: 1.3, letterSpacing: 0.3 }),
        txt(70, 104, 380, title, 28, headW(th.font), th.ink, th.font, { lineHeight: 1.35 }),
        txt(70, 104 + tH + 12, 380, desc, 16, 400, th.sub, th.body, { lineHeight: 1.6 }),
      ],
    }
  },
  // 2 넓은 사진 + 아래 두 칸 글 (제목 | 설명)
  (d, th, o) => {
    const title = wrapText(d.title, 28, 300, th.font)
    const desc = wrapText(one(d.desc), 17, 350, th.body)
    const tH = textH(title, 28, 1.35), dH = textH(desc, 17, 1.7)
    const low = 20 + 12 + Math.max(tH, dH)
    const H = 620 + 56 + low + 72
    return {
      height: H, bg: o.bg ?? WHITE,
      items: [
        { type: 'image', slot: d.slot, x: 0, y: 0, w: W, h: 620, ...(d.sample ? { sample: d.sample } : {}) },
        txt(60, 676, 300, d.label, 15, 700, th.accentText, 'cinzel', { lineHeight: 1.3, letterSpacing: 0.3 }),
        txt(60, 708, 300, title, 28, headW(th.font), th.ink, th.font, { lineHeight: 1.35 }),
        rect(390, 708, 2, Math.max(tH, dH), th.line),
        txt(420, 708, 350, desc, 17, 400, th.sub, th.body, { lineHeight: 1.7 }),
      ],
    }
  },
]

/** 소재·디테일 확대 — { slot, sample?, title, notes: [{ t, d }] (3개) } */
const ZOOMS = [
  // 0 세로 사진 + 오른쪽 설명 선 3개
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 36, {
    h: 540,
    make: (y, gid) => [
      { type: 'image', slot: d.slot, x: 40, y, w: 400, h: 540, radius: 20, ...(d.sample ? { sample: d.sample } : {}) },
      ...d.notes.flatMap((n, i) => {
        const ny = y + 30 + i * 180
        const g = gid()
        const ds = wrapText(one(n.d), 16, 250, th.body)
        return [
          { type: 'shape', shape: 'ellipse', x: 432, y: ny + 13, w: 16, h: 16, fill: th.accent },
          { type: 'line', x: 448, y: ny + 20, w: 30, strokeWidth: 2, color: th.accent },
          { type: 'shape', group: g, shape: 'ellipse', x: 484, y: ny, w: 42, h: 42, fill: th.accent },
          txt(484, ny + Math.round((42 - textH('1', 19, 1.2)) / 2), 42, String(i + 1), 19, 900, th.onAccent, 'noto-sans-kr', { align: 'center', lineHeight: 1.2, group: g }),
          txt(538, ny + 6, 210, n.t, 20, 800, th.ink, th.body, { lineHeight: 1.3 }),
          txt(484, ny + 56, 250, ds, 16, 400, th.sub, th.body, { lineHeight: 1.6 }),
        ]
      }),
    ],
  }], o.sec),
  // 1 넓은 사진 + 아래 설명 3칸
  (d, th, o) => {
    const cols = d.notes.map(n => ({ t: wrapText(n.t, 19, 210, th.body), d: wrapText(one(n.d), 15, 210, th.body) }))
    const ch = 30 + 8 + Math.max(...cols.map(c => textH(c.t, 19, 1.3))) + 8 + Math.max(...cols.map(c => textH(c.d, 15, 1.6)))
    return sec(o.bg ?? th.soft, [heading(d.title, th), 32, {
      h: 480, make: y => [{ type: 'image', slot: d.slot, x: 0, y, w: W, h: 480, ...(d.sample ? { sample: d.sample } : {}) }],
    }, 34, {
      h: ch,
      make: y => cols.flatMap((c, i) => {
        const x = 50 + i * 240
        const tH = textH(c.t, 19, 1.3)
        return [
          txt(x, y, 210, `0${i + 1}`, 24, 700, th.accentText, 'cinzel', { lineHeight: 1.25 }),
          rect(x, y + 34, 30, 2, th.accent),
          txt(x, y + 46, 210, c.t, 19, 800, th.ink, th.body, { lineHeight: 1.3 }),
          txt(x, y + 54 + tH, 210, c.d, 15, 400, th.sub, th.body, { lineHeight: 1.6 }),
        ]
      }),
    }], { top: 72, bottom: 64, ...o.sec })
  },
  // 2 짙은 바탕 + 정사각 사진 + 모서리 붙임 라벨 두 개
  (d, th, o) => {
    const [a, b, c] = d.notes
    const chip = (text, x, y, g) => [
      { type: 'shape', group: g, shape: 'rect', x, y, w: 230, h: 50, fill: th.bright, radius: 25 },
      txt(x + 12, y + Math.round((50 - textH('가', 17, 1.3)) / 2), 206, text, 17, 800, th.dark, th.body, { align: 'center', lineHeight: 1.3, group: g }),
    ]
    return sec(th.dark, [heading(d.title, th, { color: WHITE }), 36, {
      h: 540,
      make: (y, gid) => [
        { type: 'image', slot: d.slot, x: 130, y: y + 10, w: 520, h: 520, borderWidth: 2, borderColor: th.bright, ...(d.sample ? { sample: d.sample } : {}) },
        ...chip(a.t, 90, y + 40, gid()),
        ...chip(b.t, 460, y + 450, gid()),
      ],
    }, 34, T(c.t, 20, 800, WHITE, { font: th.body, w: 620, lh: 1.3 }), 10, bodyT(c.d, th, { size: 16, color: mix(th.dark, '#ffffff', 0.72) })], { top: 80, bottom: 80, ...o.sec })
  },
]

/** 사이즈 자리 (사이즈표는 넣지 않는다 — 고객이 [요소] → [사이즈표]에서 골라 넣는 자리) — { title, chips?, note? } */
const SIZE_SLOT = '[사이즈표 자리]'
const SIZE_HOW = '[요소] → [사이즈표]에서\n상의·하의·신발 틀을 골라 넣어 주세요'
/** 점선 네모 (선 4개 — 도형 테두리는 점선이 없어서) */
function dashBox(x, y, w, h, color, g) {
  const line = (lx, ly, len, rot) => ({ type: 'line', group: g, x: lx, y: ly, w: len, strokeWidth: 2, color, dash: 'dashed', ...(rot ? { rotation: 90 } : {}) })
  return [line(x, y, w), line(x, y + h - 2, w), line(x - h / 2 + 1, y + h / 2 - 1, h, true), line(x + w - h / 2 - 1, y + h / 2 - 1, h, true)]
}
/** 점선 네모 안 안내 두 줄 (가운데) */
function slotGuide(x, y, w, h, th) {
  const g1 = textH(SIZE_SLOT, 22, 1.3), g2 = textH(SIZE_HOW, 16, 1.6)
  const top = y + Math.round((h - g1 - 12 - g2) / 2)
  return [
    txt(x + 20, top, w - 40, SIZE_SLOT, 22, 800, th.sub, th.body, { align: 'center', lineHeight: 1.3 }),
    txt(x + 20, top + g1 + 12, w - 40, SIZE_HOW, 16, 400, th.muted, th.body, { align: 'center', lineHeight: 1.6 }),
  ]
}
const SIZE_SLOTS = [
  // 0 점선 자리 + 정보 칩 3개
  (d, th, o) => {
    const chips = d.chips ?? ['단위 cm', '평평하게 재요', '1~3cm 차이']
    return sec(o.bg ?? WHITE, [heading(d.title, th), 32, {
      h: 280, make: y => [...dashBox(70, y, 640, 280, th.muted), ...slotGuide(70, y, 640, 280, th)],
    }, 28, {
      h: 44,
      make: (y, gid) => chips.flatMap((c, i) => {
        const x = 90 + i * 206
        const g = gid()
        return [
          { type: 'shape', group: g, shape: 'rect', x, y, w: 190, h: 44, fill: th.soft, radius: 22 },
          { type: 'shape', group: g, shape: 'ellipse', x: x + 12, y: y + 12, w: 20, h: 20, fill: th.accent },
          txt(x + 38, y + Math.round((44 - textH('가', 16, 1.3)) / 2), 142, c, 16, 700, th.ink, th.body, { lineHeight: 1.3, group: g }),
        ]
      }),
    }], o.sec)
  },
  // 1 재는 법 그림 + 점선 자리
  (d, th, o) => sec(o.bg ?? th.soft, [heading(d.title, th), 36, {
    h: 300,
    make: (y, gid) => {
      const g = gid()
      return [
        rect(80, y + 80, 190, 150, WHITE, { radius: 10, strokeWidth: 2, strokeColor: th.ink }),
        { type: 'line', group: g, x: 80, y: y + 50, w: 190, strokeWidth: 2, color: th.accent, startCap: 'arrow', endCap: 'arrow' },
        txt(125, y + 14, 100, '가로', 16, 700, th.accentText, th.body, { align: 'center', lineHeight: 1.3, group: g }),
        { type: 'line', group: `${g}v`, x: 214, y: y + 154, w: 150, strokeWidth: 2, color: th.accent, startCap: 'arrow', endCap: 'arrow', rotation: 90 },
        txt(80, y + 250, 190, '재는 곳을 적어 주세요', 15, 400, th.muted, th.body, { align: 'center', lineHeight: 1.4 }),
        ...dashBox(330, y, 390, 300, th.muted, `${g}b`),
        ...slotGuide(330, y, 390, 300, th),
      ]
    },
  }, ...(d.note ? [24, bodyT(d.note, th, { size: 16, color: th.muted })] : [])], o.sec),
  // 2 흰 카드 안 점선 자리 (연한 바탕)
  (d, th, o) => {
    const note = d.note ? wrapText(one(d.note), 16, 560, th.body) : ''
    const nH = note ? textH(note, 16, 1.6) : 0
    const titleT = wrapText(d.title, 30, 560, th.font)
    const tH = textH(titleT, 30, 1.3)
    const ch = 40 + 20 + 12 + tH + 28 + 240 + (note ? 20 + nH : 0) + 40
    return sec(o.bg ?? th.soft, [{
      h: ch,
      make: y => [
        rect(50, y, 680, ch, WHITE, { radius: 24 }),
        txt(90, y + 40, 600, 'SIZE GUIDE', 15, 700, th.accentText, 'cinzel', { lineHeight: 1.3, letterSpacing: 0.3 }),
        txt(90, y + 72, 600, titleT, 30, headW(th.font), th.ink, th.font, { lineHeight: 1.3 }),
        ...dashBox(90, y + 72 + tH + 28, 600, 240, th.muted),
        ...slotGuide(90, y + 72 + tH + 28, 600, 240, th),
        ...(note ? [txt(90, y + 72 + tH + 28 + 240 + 20, 600, note, 16, 400, th.muted, th.body, { lineHeight: 1.6 })] : []),
      ],
    }], { top: 64, bottom: 64, ...o.sec })
  },
]

/** 세탁·관리 안내 — { title, items: [{ k: 아이콘 자리 짧은 말(3자까지), t: 설명 }] (4개) } */
const CARES = [
  // 0 동그라미 4개 + 아래 설명
  (d, th, o) => {
    const labels = d.items.map(it => wrapText(one(it.t), 16, 160, th.body))
    const lH = Math.max(...labels.map(l => textH(l, 16, 1.55)))
    return sec(o.bg ?? th.soft, [heading(d.title, th), 40, {
      h: 110 + 18 + lH,
      make: (y, gid) => d.items.flatMap((it, i) => {
        const c = 120 + i * 180
        const g = gid()
        return [
          { type: 'shape', group: g, shape: 'ellipse', x: c - 55, y, w: 110, h: 110, fill: WHITE, strokeWidth: 2, strokeColor: th.accent },
          txt(c - 50, y + Math.round((110 - textH('가', 22, 1.2)) / 2), 100, it.k, 22, 800, th.accentText, th.body, { align: 'center', lineHeight: 1.2, group: g }),
          txt(c - 80, y + 128, 160, labels[i], 16, 400, th.ink, th.body, { align: 'center', lineHeight: 1.55 }),
        ]
      }),
    }], o.sec)
  },
  // 1 2×2 카드
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 36, {
    h: 2 * 128 + 20,
    make: (y, gid) => d.items.flatMap((it, i) => {
      const x = 60 + (i % 2) * 340, top = y + Math.floor(i / 2) * 148
      const g = gid()
      const t = wrapText(one(it.t), 17, 200, th.body)
      return [
        rect(x, top, 320, 128, th.soft, { radius: 18 }),
        { type: 'shape', group: g, shape: 'rect', x: x + 22, y: top + 32, w: 64, h: 64, fill: th.accent, radius: 16 },
        txt(x + 22, top + 32 + Math.round((64 - textH('가', 17, 1.2)) / 2), 64, it.k, 17, 800, th.onAccent, th.body, { align: 'center', lineHeight: 1.2, group: g }),
        txt(x + 104, top + Math.round((128 - textH(t, 17, 1.5)) / 2), 200, t, 17, 700, th.ink, th.body, { lineHeight: 1.5 }),
      ]
    }),
  }], o.sec),
  // 2 알약 줄 목록 (점선 구분)
  (d, th, o) => sec(o.bg ?? WHITE, [latin('CARE', th.accentText), 12, heading(d.title, th), 34, {
    h: d.items.length * 76 - 16,
    make: (y, gid) => d.items.flatMap((it, i) => {
      const top = y + i * 76
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'rect', x: 90, y: top, w: 110, h: 40, fill: th.soft, radius: 20 },
        txt(90, top + Math.round((40 - textH('가', 16, 1.2)) / 2), 110, it.k, 16, 800, th.accentText, th.body, { align: 'center', lineHeight: 1.2, group: g }),
        txt(222, top + Math.round((40 - textH('가', 18, 1.4)) / 2), 470, one(it.t), 18, 400, th.ink, th.body, { lineHeight: 1.4 }),
        ...(i < d.items.length - 1 ? [{ type: 'line', x: 90, y: top + 56, w: 600, strokeWidth: 2, color: th.line, dash: 'dotted' }] : []),
      ]
    }),
  }], o.sec),
]

/** 구성 (사진 없이 글로) — { title, items: [[이름, 수량]] (3~4개) } */
const CONTENTS = [
  // 0 흰 카드 안 줄 목록
  (d, th, o) => sec(o.bg ?? th.soft, [heading(d.title, th), 32, {
    h: d.items.length * 66 + 28,
    make: y => [
      rect(90, y, 600, d.items.length * 66 + 28, WHITE, { radius: 20 }),
      ...d.items.flatMap(([k, v], i) => {
        const top = y + 14 + i * 66
        const ty = top + Math.round((66 - textH('가', 20, 1.4)) / 2)
        return [
          txt(126, ty, 330, k, 20, 700, th.ink, th.body),
          txt(456, ty, 200, v, 20, 700, th.accentText, th.body, { align: 'right' }),
          ...(i < d.items.length - 1 ? [{ type: 'line', x: 126, y: top + 65, w: 528, strokeWidth: 2, color: th.line, dash: 'dotted' }] : []),
        ]
      }),
    ],
  }], o.sec),
  // 1 더하기로 잇는 상자
  (d, th, o) => {
    const n = d.items.length
    const gap = 50
    const bw = Math.floor((700 - gap * (n - 1)) / n)
    const x0 = cx(bw * n + gap * (n - 1))
    const names = d.items.map(([k]) => wrapText(k, 18, bw - 24, th.body))
    const nH = Math.max(...names.map(t => textH(t, 18, 1.35)))
    const bh = 30 + 24 + 12 + nH + 10 + 22 + 28
    return sec(o.bg ?? WHITE, [heading(d.title, th), 36, {
      h: bh,
      make: y => d.items.flatMap(([, v], i) => {
        const x = x0 + i * (bw + gap)
        return [
          rect(x, y, bw, bh, th.soft, { radius: 18 }),
          txt(x + 12, y + 30, bw - 24, `0${i + 1}`, 18, 700, th.accentText, 'cinzel', { align: 'center', lineHeight: 1.3 }),
          txt(x + 12, y + 66, bw - 24, names[i], 18, 800, th.ink, th.body, { align: 'center', lineHeight: 1.35 }),
          txt(x + 12, y + 76 + nH, bw - 24, v, 15, 400, th.muted, th.body, { align: 'center', lineHeight: 1.4 }),
          ...(i < n - 1 ? [txt(x + bw, y + Math.round((bh - textH('+', 34, 1.2)) / 2), gap, '+', 34, 700, th.accentText, 'noto-sans-kr', { align: 'center', lineHeight: 1.2 })] : []),
        ]
      }),
    }], o.sec)
  },
  // 2 티켓 모양 (왼쪽 SET · 오른쪽 목록)
  (d, th, o) => {
    const lines = d.items.map(([k, v]) => `· ${k}  ${v}`).join('\n')
    const lH = textH(lines, 18, 1.8)
    const h = Math.max(170, lH + 64)
    const bg = o.bg ?? th.soft
    return sec(bg, [heading(d.title, th), 34, {
      h,
      make: y => [
        rect(60, y, 660, h, WHITE, { radius: 18, strokeWidth: 2, strokeColor: th.accent }),
        { type: 'shape', shape: 'ellipse', x: 44, y: y + h / 2 - 16, w: 32, h: 32, fill: bg },
        { type: 'shape', shape: 'ellipse', x: 704, y: y + h / 2 - 16, w: 32, h: 32, fill: bg },
        { type: 'line', x: 250 - h / 2 + 30, y: y + h / 2 - 1, w: h - 60, strokeWidth: 2, color: th.line, dash: 'dashed', rotation: 90 },
        txt(80, y + Math.round(h / 2) - 44, 150, 'SET', 40, 700, th.accentText, 'cinzel', { align: 'center', lineHeight: 1.2 }),
        txt(80, y + Math.round(h / 2) + 8, 150, '구성', 17, 700, th.ink, th.body, { align: 'center', lineHeight: 1.3 }),
        txt(290, y + Math.round((h - lH) / 2), 400, lines, 18, 400, th.ink, th.body, { lineHeight: 1.8 }),
      ],
    }], o.sec)
  },
]

/** 원재료·정보 (식품) — { title, rows: [[항목, 내용]] } */
const INGREDIENTS = [
  // 0 정보 라벨 상자 (굵은 위 막대)
  (d, th, o) => {
    const rh = 58
    const bh = 30 + textH('가', 26, 1.3) + 16 + 8 + 8 + d.rows.length * rh + 18
    return sec(o.bg ?? th.soft, [{
      h: bh,
      make: y => [
        rect(90, y, 600, bh, WHITE, { radius: 6, strokeWidth: 2, strokeColor: th.ink }),
        txt(118, y + 30, 544, one(d.title), 26, headW(th.font), th.ink, th.font, { lineHeight: 1.3 }),
        rect(118, y + 30 + textH('가', 26, 1.3) + 16, 544, 8, th.ink),
        ...d.rows.flatMap(([k, v], i) => {
          const top = y + 30 + textH('가', 26, 1.3) + 16 + 16 + i * rh
          const ty = top + Math.round((rh - textH('가', 18, 1.4)) / 2)
          return [
            txt(118, ty, 170, k, 18, 800, th.ink, th.body),
            txt(300, ty, 362, v, 18, 400, th.sub, th.body),
            ...(i < d.rows.length - 1 ? [rect(118, top + rh - 1, 544, 1, th.line)] : []),
          ]
        }),
      ],
    }], { top: 80, bottom: 80, ...o.sec })
  },
  // 1 큰 칸 두 개 + 줄 목록
  (d, th, o) => {
    const [a, b, ...rest] = d.rows
    const tiles = [[70, a, th.accent, th.onAccent], [390, b, th.soft, th.ink]]
    return sec(o.bg ?? WHITE, [latin('INGREDIENTS', th.accentText), 12, heading(d.title, th), 32, {
      h: 136,
      make: y => tiles.flatMap(([x, [k, v], fill, ink]) => [
        rect(x, y, 320, 136, fill, { radius: 20 }),
        txt(x + 26, y + 26, 268, k, 16, 700, ink, th.body, { lineHeight: 1.3 }),
        txt(x + 26, y + 58, 268, v, 26, 800, ink, th.body, { lineHeight: 1.3 }),
      ]),
    }, 24, {
      h: rest.length * 60,
      make: y => rest.flatMap(([k, v], i) => {
        const top = y + i * 60
        const ty = top + Math.round((60 - textH('가', 18, 1.4)) / 2)
        return [
          ...(i % 2 === 0 ? [rect(70, top, 640, 60, th.soft, { radius: 10 })] : []),
          txt(100, ty, 170, k, 18, 800, th.ink, th.body), txt(290, ty, 400, v, 18, 400, th.sub, th.body),
        ]
      }),
    }], o.sec)
  },
]

/** 보관법 (식품) — { title, items: [{ k: 냉장·냉동·실온, v: 온도 자리, t: 설명 }] (3개) } */
const STORAGES = [
  // 0 보관 태그 카드 (첫 칸 = 권하는 보관)
  (d, th, o) => sec(o.bg ?? WHITE, [heading(d.title, th), 36, {
    h: 230,
    make: y => d.items.flatMap((it, i) => {
      const x = 40 + i * 240
      const on = i === 0
      const t = wrapText(one(it.t), 16, 180, th.body)
      return [
        rect(x, y, 220, 230, on ? th.accent : WHITE, { radius: 20, ...(on ? {} : { strokeWidth: 2, strokeColor: th.line }) }),
        txt(x + 10, y + 30, 200, it.k, 34, 400, on ? th.onAccent : th.accentText, 'black-han-sans', { align: 'center', lineHeight: 1.2 }),
        txt(x + 10, y + 82, 200, it.v, 20, 800, on ? th.onAccent : th.ink, th.body, { align: 'center', lineHeight: 1.3 }),
        txt(x + 20, y + 128, 180, t, 16, 400, on ? th.onAccent : th.sub, th.body, { align: 'center', lineHeight: 1.55 }),
      ]
    }),
  }], o.sec),
  // 1 짙은 띠 + 번호 줄
  (d, th, o) => sec(th.dark, [latin('STORAGE', th.bright), 12, heading(d.title, th, { color: WHITE }), 36, {
    h: d.items.length * 96 - 20,
    make: (y, gid) => d.items.flatMap((it, i) => {
      const top = y + i * 96
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'ellipse', x: 90, y: top, w: 48, h: 48, fill: th.bright },
        txt(90, top + Math.round((48 - textH('1', 20, 1.2)) / 2), 48, String(i + 1), 20, 900, th.dark, 'noto-sans-kr', { align: 'center', lineHeight: 1.2, group: g }),
        txt(160, top + 2, 530, `${it.k} · ${it.v}`, 21, 800, WHITE, th.body, { lineHeight: 1.3 }),
        txt(160, top + 38, 530, one(it.t), 16, 400, mix(th.dark, '#ffffff', 0.74), th.body, { lineHeight: 1.5 }),
      ]
    }),
  }], o.sec),
]

/** 종류별 모양 (이름표는 보고서·테스트용) */
export const SECTION_VARIANTS = {
  points: { make: POINTS, names: ['아이콘 카드 3개', '큰 번호 세로 목록', '체크 목록', '배지 격자', '큰 숫자 강조', '강조색 띠 줄 카드'] },
  steps: { make: STEPS, names: ['번호 카드', '가로 타임라인', '번호 세로 목록', '화살표 상자', 'STEP 꼬리표 줄'] },
  table: { make: TABLES, names: ['강조색 제목 줄', '흰 카드 안 표', '치수선 도식 + 표', '정보 칩 + 표', '두꺼운 테두리 표'] },
  notice: { make: NOTICES, names: ['글 + 상자 두 개', '주의 상자', '아이콘 목록 + 머리띠 상자', '묻고 답하기', '말풍선'] },
  recommend: { make: RECOMMEND, names: ['체크 원', '알약 줄', '카드 3장', '형광펜 줄', '말풍선 좌우'] },
  review: { make: REVIEWS, names: ['별점 + 인용', '큰 따옴표', '후기 카드 두 장', '강조색 띠'] },
  detail1: { make: DETAIL1, names: ['둥근 사진 + 설명', '폭 가득 사진 + 글 띠', '둥근 확대컷 + 화살표', '옆 글 + 세로 사진', '두꺼운 틀 사진'] },
  detail2: { make: DETAIL2, names: ['두 칸 나란히', '비껴 겹친 두 장', '전·후 비교', '큰 사진 + 작은 사진'] },
  detail3: { make: DETAIL3, names: ['세 장 한 줄', '크기 다른 콜라주', '구성품 한눈에'] },
  pointPhoto: { make: POINT_PHOTOS, names: ['알약 + 사진 아래', '지그재그', '큰 번호 + 폭 가득 사진', '사진 위 제목 띠'] },
  rows: { make: ROWS, names: ['테두리 카드 줄', '번갈아 칠한 줄', '강조색 항목 칸', '점선 목록'] },
  perks: { make: PERKS, names: ['테두리 카드', '강조색 원', '가로 줄 목록', '쿠폰 모양'] },
  // 촬영 세트 템플릿용 (studioTemplateShoots) — 끝에 붙인다
  statement: { make: STATEMENTS, names: ['가운데 큰 문장', '짙은 띠 문장', '왼쪽 막대 문장'] },
  story: { make: STORIES, names: ['풀블리드 + 아래 글', '풀블리드 + 흰 글 상자', '넓은 사진 + 두 칸 글'] },
  zoom: { make: ZOOMS, names: ['사진 + 설명 선 3개', '넓은 사진 + 설명 3칸', '짙은 바탕 + 붙임 라벨'] },
  sizeSlot: { make: SIZE_SLOTS, names: ['점선 자리 + 정보 칩', '재는 법 그림 + 점선 자리', '카드 안 점선 자리'] },
  care: { make: CARES, names: ['동그라미 아이콘 4개', '2×2 카드', '알약 줄 목록'] },
  contents: { make: CONTENTS, names: ['점선 줄 목록', '더하기 상자', '티켓 모양'] },
  ingredient: { make: INGREDIENTS, names: ['정보 라벨 상자', '큰 칸 두 개 + 줄 목록'] },
  storage: { make: STORAGES, names: ['보관 태그 카드', '짙은 띠 번호 줄'] },
}
export const SECTION_KINDS = Object.keys(SECTION_VARIANTS)

/**
 * 섹션 하나 그리기 — kind 종류, v 모양 번호(종류의 모양 수로 나눈 나머지), d 내용, th 색 묶음(lowerTheme), o { bg, sec: sec() 옵션, boxBg }
 * 결과 구간에 모양 이름을 붙이지 않는다 (구간 모양 = 페이지 문서 모양 그대로) — 쓴 모양은 recordSections로 모은다 (템플릿 sectionStyles)
 */
export function section(kind, v, d, th, o = {}) {
  const set = SECTION_VARIANTS[kind]
  if (!set) throw new Error(`모르는 섹션 종류: ${kind}`)
  const n = set.make.length
  const i = Number.isInteger(v) ? ((v % n) + n) % n : 0
  recording?.push(`${kind}:${i}`)
  const out = set.make[i](d, th, o)
  // 모서리 장식 (o.corner = { pad, items(height) }) — 모양과 상관없이 아래 여백을 pad만큼 늘리고 그 자리에 둔다 (글과 겹치지 않게)
  if (o.corner) {
    out.height += o.corner.pad
    out.items.push(...o.corner.items(out.height))
  }
  return out
}

let recording = null
/** fn을 부르는 동안 쓴 섹션 모양 목록 ['종류:번호', …] (위에서부터) — 템플릿의 sectionStyles (갤러리 순서·테스트·보고서용) */
export function recordSections(fn) {
  const prev = recording
  recording = []
  try {
    const value = fn()
    return { value, styles: recording }
  } finally {
    recording = prev
  }
}

/**
 * 모양 고르기 — 갤러리 순서(order: key[])로 템플릿마다 { 종류: 모양 번호 }.
 * 규칙: 바로 앞 카드(옆)·cols칸 앞 카드(위)와 같은 모양을 피하고, 그중 지금까지 덜 쓴 모양 → 번호가 (자리 + 종류 차례)에서 가까운 것.
 * usesOf(key) = 그 템플릿이 실제로 쓰는 종류 (Set) — 주면 쓰는 템플릿끼리만 덜 쓴 모양을 센다 (모든 모양이 고르게 쓰이게)
 * @returns {Map<string, Record<string, number>>}
 */
export function planSectionStyles(order, cols = 5, usesOf = null) {
  const plan = new Map()
  const rows = []
  const used = Object.fromEntries(SECTION_KINDS.map(k => [k, new Array(SECTION_VARIANTS[k].make.length).fill(0)]))
  order.forEach((key, i) => {
    const pick = {}
    const uses = usesOf?.(key) ?? null
    SECTION_KINDS.forEach((k, ki) => {
      const n = SECTION_VARIANTS[k].make.length
      // 옆·위 카드가 이 종류를 쓸 때만 그 모양을 피한다 (안 쓰는 카드의 번호는 화면에 없다)
      const near = [i - 1, i - cols].filter(j => j >= 0 && (!usesOf || usesOf(order[j])?.has(k)))
      const avoid = new Set(near.map(j => rows[j]?.[k]).filter(v => v !== undefined))
      let best = -1, bestScore = null
      for (let s = 0; s < n; s++) {
        const v = (i + ki * 2 + s) % n
        if (avoid.has(v) && n > avoid.size) continue
        const score = used[k][v]
        if (best < 0 || score < bestScore) { best = v; bestScore = score }
      }
      pick[k] = best
      if (!uses || uses.has(k)) used[k][best]++
    })
    rows.push(pick)
    plan.set(key, pick)
  })
  return plan
}
