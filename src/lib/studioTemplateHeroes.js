/**
 * 템플릿 첫 화면(히어로) — 코드 데이터 + 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-template-heroes.mjs)
 *
 * ★ 갤러리 카드 = 첫 구간 전체(3:4). 그래서 첫 구간은 780×1040(3:4) 한 장으로 짠다.
 *   원칙: 큰 제목이 주인공(첫 구간 높이의 30~40%) · 부제·배지·작은 영문 라벨 · 템플릿마다 다른 바탕(진한 단색·밝은 단색·질감·사진 전면·그러데이션·반반)
 *   · 구도 돌려 쓰기(제목 위+사진 아래 / 사진 전면+제목 / 좌우 분할 / 원형 사진 / 사진 겹침 / 떠 있는 사진+큰 그림자 / 사진 띠 / 포스터).
 * ★ 카드 오른쪽 위(하트 버튼 자리 HEART_ZONE)에는 배지·글자를 두지 않는다 (바탕·사진만).
 * ★ withHero(tpl): 템플릿의 첫 구간을 이 파일의 첫 화면으로 바꾼다. key·카테고리·구간 수는 그대로.
 *   첫 화면의 큰 사진 = 사진 자리 0 (대표). 나머지 구간이 0번 자리를 쓰고 있었으면 새 번호로 옮긴다(한 템플릿 안에서 같은 사진 반복 없음).
 *   겹침 구도의 뒷 사진은 새 번호 — 다 붙인 뒤 번호를 0부터 빈틈없이 다시 매긴다.
 * ★ 배치·색·문구는 이 프로젝트에서 새로 정한 것 (다른 편집 프로그램의 템플릿·문구를 옮기지 않음). 글꼴은 허용 목록(studioFonts)만.
 *   문구는 판매자가 고쳐 쓰는 예시 — 인증·효능·수치 같은 사실 확인이 필요한 말은 넣지 않는다.
 */

export const HERO_W = 780
export const HERO_H = 1040
export const HERO_TITLE_MIN = 0.3 // 큰 제목 높이 ÷ 첫 구간 높이
export const HERO_TITLE_MAX = 0.42
export const HERO_TITLE_SIZE = 72 // 이 크기 이상 글자 = 큰 제목 (테스트가 비율을 잰다)
// 카드 하트 버튼이 덮는 곳 (페이지 px — 카드 폭 ≈ 250px 기준 하트 32px + 여백 10px → × 3.1)
export const HEART_ZONE = { x: HERO_W - 136, y: 0, w: 136, h: 136 }
export const HERO_TITLE_TOP = 140 // 가운데 맞춤 큰 제목의 위 끝 (첫 줄이 하트 자리 아래에서 시작)

const W = HERO_W
const H = HERO_H
const WHITE = '#ffffff'
const TITLE_LS = -0.02
const textH = (text, size, lh) => Math.ceil(text.split('\n').length * size * lh)

// 넉넉한 글자 폭 (크기를 정할 때 — 실제 글꼴보다 넓게): [한글·전각, 그 밖]
const WIDTH_K = { 'gasoek-one': [1.1, 0.78], 'east-sea-dokdo': [0.82, 0.52], cinzel: [1.0, 0.84] }
const WIDE = /[ᄀ-ᇿ㄰-㆏가-힣一-鿿　-〿＀-￯]/
function lineUnits(line, font) {
  const [k, l] = WIDTH_K[font] ?? [1, 0.68]
  let n = 0
  for (const ch of line) n += ch === ' ' ? 0.35 : WIDE.test(ch) ? k : l
  return n + TITLE_LS * [...line].length
}
// 글꼴마다 쓰는 굵기 (허용 목록에 있는 값)
const HEAVY = { pretendard: 900, 'noto-sans-kr': 900, 'noto-serif-kr': 900, 'nanum-myeongjo': 800, 'nanum-gothic': 800, 'gowun-batang': 700 }
const LH = { 'gowun-batang': 1.14, 'noto-serif-kr': 1.12, 'nanum-myeongjo': 1.12 }

/** 큰 제목 글자 크기 — 높이 목표(target × 첫 구간)와 폭 중 작은 쪽 */
export function heroTitleSize(text, font, w, target, lh = LH[font] ?? 1.06) {
  const lines = String(text).split('\n')
  const byH = Math.floor((target * H) / (lines.length * lh))
  const byW = Math.floor(Math.min(...lines.map(l => (w * 0.97) / lineUnits(l, font))))
  return Math.max(12, Math.min(byH, byW))
}
function titlePart(text, font, color, x, y, w, target, o = {}) {
  const lh = o.lh ?? LH[font] ?? 1.06
  const size = o.size ?? heroTitleSize(text, font, w, target, lh)
  const { size: _s, lh: _l, ...rest } = o
  return {
    part: { type: 'text', x, y, w, text, fontSize: size, fontWeight: HEAVY[font] ?? 400, color, fontFamily: font, align: 'center', lineHeight: lh, letterSpacing: TITLE_LS, ...rest },
    h: textH(text, size, lh),
  }
}
const label = (text, color, x, y, w, align = 'center') => ({ type: 'text', x, y, w, text, fontSize: 18, fontWeight: 700, color, fontFamily: 'cinzel', align, lineHeight: 1.3, letterSpacing: 0.3 })
const LABEL_H = textH('A', 18, 1.3)
function subPart(text, color, x, y, w, align = 'center', size = 23) {
  return { part: { type: 'text', x, y, w, text, fontSize: size, fontWeight: 400, color, fontFamily: 'pretendard', align, lineHeight: 1.5 }, h: textH(text, size, 1.5) }
}
function photo(slot, x, y, w, h, o = {}) {
  const { sample, radius = 0, border = 0, borderColor = WHITE, shadow = 0, rotation = 0 } = o
  return {
    type: 'image', slot, x, y, w, h, ...(sample ? { sample } : {}), ...(radius ? { radius } : {}),
    ...(border ? { borderWidth: border, borderColor } : {}), ...(shadow ? { shadow } : {}), ...(rotation ? { rotation } : {}),
  }
}
const rect = (x, y, w, h, fill, o = {}) => ({ type: 'shape', shape: 'rect', x, y, w, h, fill, ...o })

/**
 * 배지 — 도형 + 글자 한 묶음(group 'hb'). b = { text, shape: burst|ellipse|star|hexagon|pill|ribbon, fill, ink, font? }
 * 원형 도형은 d×d, pill·ribbon은 w×h. 글자 크기는 도형 안 폭에 맞춘다.
 */
function badge(b, x, y, d, h = d) {
  if (!b) return []
  const round = !['pill', 'ribbon'].includes(b.shape)
  const w = d
  const hh = round ? d : h
  const font = b.font ?? 'black-han-sans'
  const inner = round ? w * (b.shape === 'star' ? 0.5 : 0.66) : w - hh * 0.8
  const lines = b.text.split('\n')
  const lh = 1.08
  const maxU = Math.max(...lines.map(l => lineUnits(l, font) - TITLE_LS * [...l].length))
  const size = Math.max(12, Math.min(Math.floor(inner / maxU), Math.floor((hh * (round ? 0.52 : 0.62)) / (lines.length * lh)), b.size ?? 999))
  const th = textH(b.text, size, lh)
  const shape = b.shape === 'pill'
    ? { type: 'shape', group: 'hb', shape: 'rect', x, y, w, h: hh, fill: b.fill, radius: Math.floor(hh / 2) }
    : { type: 'shape', group: 'hb', shape: b.shape, x, y, w, h: hh, fill: b.fill }
  const ty = y + Math.round((hh - th) / 2) + (b.shape === 'star' ? Math.round(hh * 0.05) : 0)
  return [shape, { type: 'text', group: 'hb', x: x + 6, y: ty, w: w - 12, text: b.text, fontSize: size, fontWeight: HEAVY[font] ?? 400, color: b.ink, fontFamily: font, align: 'center', lineHeight: lh }]
}

// ── 구도 ──
// 모두 { bg, bgImage?, items } (높이 = HERO_H). 사진 자리: 0 = 대표, 'x1'·'x2' = 겹침 구도의 뒷 사진 (withHero가 새 번호로)

/** 1. 제목 위 + 사진 아래 (bleed = 사진이 폭·아래 끝까지) */
function stack(s) {
  const items = []
  const top = 84
  const t = titlePart(s.title, s.font, s.ink, 50, HERO_TITLE_TOP, 680, 0.34)
  const subY = t.part.y + t.h + 18
  const sub = subPart(s.sub, s.subInk ?? s.ink, 70, subY, 640)
  const py = subY + sub.h + 36
  const ph = s.bleed ? photo(0, 0, py, W, H - py, { sample: s.sample }) : photo(0, 80, py, 620, H - py - 60, { sample: s.sample, radius: 28, shadow: 24 })
  items.push(ph, label(s.label, s.labelInk ?? s.ink, 50, top, 680), t.part, sub.part)
  items.push(...badge(s.badge, s.bleed ? 590 : 600, py - 72, 150))
  return { items }
}

/** 2. 사진 전면 + 어두운 덮개 + 제목 얹기 (왼쪽 아래) */
function overlay(s) {
  const shade = s.shade ?? '#000000'
  const t = titlePart(s.title, s.font, WHITE, 56, 0, 668, 0.34, { align: 'left' })
  const sub = subPart(s.sub, '#f1f2f4', 56, 0, 668, 'left')
  const subY = H - 92 - sub.h
  const titleY = subY - 22 - t.h
  t.part.y = titleY
  sub.part.y = subY
  return {
    items: [
      photo(0, 0, 0, W, H, { sample: s.sample }),
      rect(0, 0, W, H, shade, { fillOpacity: s.dim ?? 0.22 }),
      rect(0, Math.round(H * 0.45), W, H - Math.round(H * 0.45), shade, { fillOpacity: 0.34 }),
      label(s.label, s.labelInk ?? WHITE, 56, titleY - 30 - LABEL_H, 500, 'left'),
      t.part, sub.part,
      ...badge(s.badge, 56, 56, 176, 56),
    ],
  }
}

/** 3. 좌우 분할 — 한쪽 색 바탕 + 세로로 쌓은 큰 제목, 한쪽 사진 (side = 사진 쪽) */
function split(s) {
  const pw = 370
  const right = (s.side ?? 'right') === 'right'
  const px = right ? W - pw : 0
  const cx = right ? 44 : pw + 40
  const cw = W - pw - 84
  const t = titlePart(s.title, s.font, s.ink, cx, 150, cw, 0.36, { align: 'left' })
  const sub = subPart(s.sub, s.subInk ?? s.ink, cx, t.part.y + t.h + 30, cw, 'left', 21)
  return {
    items: [
      photo(0, px, 0, pw, H, { sample: s.sample }),
      label(s.label, s.labelInk ?? s.ink, cx, 96, cw, 'left'),
      rect(cx, 96 + LABEL_H + 14, 44, 5, s.accent ?? s.ink),
      t.part, sub.part,
      ...badge(s.badge, right ? W - pw - 70 : pw - 70, 820, 140),
    ],
  }
}

/** 4. 원형 사진 — 큰 제목 위, 둥근 사진 + 테두리 고리, 부제는 사진 아래 알약 */
function circle(s) {
  const t = titlePart(s.title, s.font, s.ink, 40, HERO_TITLE_TOP, 700, 0.32, { lh: s.font === 'gowun-batang' ? 1.08 : 1.02 })
  const d = 480
  const cy = H - d - 74
  const pill = { w: 420, h: 60 }
  const subSize = 21
  const subText = s.sub
  return {
    items: [
      { type: 'shape', shape: 'ellipse', x: (W - d) / 2 - 16, y: cy - 16, w: d + 32, h: d + 32, fill: '', strokeWidth: 3, strokeColor: s.accent ?? s.ink },
      photo(0, (W - d) / 2, cy, d, d, { sample: s.sample, radius: d / 2 }),
      label(s.label, s.labelInk ?? s.ink, 40, 84, 700),
      t.part,
      { type: 'shape', group: 'hs', shape: 'rect', x: (W - pill.w) / 2, y: cy + d - 34, w: pill.w, h: pill.h, fill: s.pillFill ?? s.ink, radius: 30 },
      { type: 'text', group: 'hs', x: (W - pill.w) / 2 + 14, y: cy + d - 34 + Math.round((pill.h - textH(subText, subSize, 1.3)) / 2), w: pill.w - 28, text: subText, fontSize: subSize, fontWeight: 700, color: s.pillInk ?? WHITE, fontFamily: 'pretendard', align: 'center', lineHeight: 1.3 },
      ...badge(s.badge, 594, cy - 40, 140),
    ],
  }
}

/** 5. 사진 두세 장 겹침 — 큰 제목 위, 기울인 사진 (흰 테두리·그림자, 한 묶음) */
function collage(s) {
  const t = titlePart(s.title, s.font, s.ink, 40, HERO_TITLE_TOP, 700, 0.32)
  const sub = subPart(s.sub, s.subInk ?? s.ink, 70, t.part.y + t.h + 14, 640)
  const top = sub.part.y + sub.h + 40
  const o = { border: 10, borderColor: s.frame ?? WHITE, shadow: 34 }
  const three = s.three !== false
  const back = three
    ? [
      { ...photo('x1', 70, top + 34, 260, 330, { ...o, sample: s.sample2 ?? 'scene', rotation: -9 }), group: 'hc' },
      { ...photo('x2', 450, top + 30, 260, 330, { ...o, sample: s.sample3 ?? 'detail', rotation: 8 }), group: 'hc' },
    ]
    : [{ ...photo('x1', 360, top + 20, 320, 380, { ...o, sample: s.sample2 ?? 'scene', rotation: 7 }), group: 'hc' }]
  const front = three
    ? { ...photo(0, 245, top, 290, 370, { ...o, sample: s.sample, rotation: -3 }), group: 'hc' }
    : { ...photo(0, 110, top + 10, 320, 380, { ...o, sample: s.sample, rotation: -5 }), group: 'hc' }
  return {
    items: [
      ...back, front,
      label(s.label, s.labelInk ?? s.ink, 40, 84, 700),
      t.part, sub.part,
      ...badge(s.badge, 40, H - 170, 140),
    ],
  }
}

/** 6. 떠 있는 사진 + 큰 그림자 — 큰 제목 위, 뒤에 둥근 색 덩어리, 바닥 그림자 */
function cutout(s) {
  const t = titlePart(s.title, s.font, s.ink, 40, HERO_TITLE_TOP, 700, 0.33)
  const sub = subPart(s.sub, s.subInk ?? s.ink, 70, t.part.y + t.h + 14, 640)
  const py = sub.part.y + sub.h + 64
  const size = Math.min(420, H - 64 - py) // 뒤 색 덩어리(사진 + 위아래 60)가 구간 안에
  const d = size + 120
  return {
    items: [
      { type: 'shape', shape: 'ellipse', x: Math.round((W - d) / 2), y: py - 60, w: d, h: d, fill: s.blob ?? '#ffffff', fillOpacity: s.blobOpacity ?? 0.55 },
      { type: 'shape', shape: 'ellipse', x: Math.round((W - size * 0.86) / 2), y: py + size + 10, w: Math.round(size * 0.86), h: 36, fill: '#000000', fillOpacity: 0.2 },
      photo(0, Math.round((W - size) / 2), py, size, size, { sample: s.sample, radius: 36, shadow: 80 }),
      label(s.label, s.labelInk ?? s.ink, 40, 84, 700),
      t.part, sub.part,
      ...badge(s.badge, Math.round((W + size) / 2) - 70, py - 50, 140),
    ],
  }
}

/** 7. 사진 띠 — 제목 첫 줄 / 폭 가득한 사진 띠 / 제목 둘째 줄 */
function band(s) {
  const [a, b] = s.title.split('\n')
  const lh = 1.02
  const size = Math.min(heroTitleSize(a, s.font, 700, 0.17, lh), heroTitleSize(b, s.font, 700, 0.17, lh))
  const one = textH('가', size, lh)
  const subH = textH('가', 22, 1.5)
  const y1 = HERO_TITLE_TOP
  const y2 = H - 30 - subH - 12 - one
  const pTop = y1 + one + 22
  const pBot = y2 - 22
  const base = { type: 'text', w: 700, x: 40, fontSize: size, fontWeight: HEAVY[s.font] ?? 400, color: s.ink, fontFamily: s.font, align: 'center', lineHeight: lh, letterSpacing: TITLE_LS }
  return {
    items: [
      photo(0, 0, pTop, W, pBot - pTop, { sample: s.sample }),
      label(s.label, s.labelInk ?? s.ink, 40, 84, 700),
      { ...base, y: y1, text: a },
      { ...base, y: y2, text: b },
      { type: 'text', x: 70, y: H - 30 - subH, w: 640, text: s.sub, fontSize: 22, fontWeight: 400, color: s.subInk ?? s.ink, fontFamily: 'pretendard', align: 'center', lineHeight: 1.5 },
      ...badge(s.badge, 40, pTop + 26, 140),
    ],
  }
}

/** 8. 포스터 — 왼쪽 맞춤 큰 제목 3줄, 오른쪽 아래 사진 + 뒤로 비킨 색 블록 */
function poster(s) {
  const t = titlePart(s.title, s.font, s.ink, 56, 64 + LABEL_H + 20, 668, 0.33, { align: 'left' })
  const sub = subPart(s.sub, s.subInk ?? s.ink, 56, t.part.y + t.h + 16, 640, 'left', 22)
  const size = 400
  const py = H - size - 90
  return {
    items: [
      rect(W - 56 - size + 40, py + 40, size, size, s.accent ?? s.ink, s.blockRadius ? { radius: s.blockRadius } : {}),
      photo(0, W - 56 - size, py, size, size, { sample: s.sample, ...(s.blockRadius ? { radius: s.blockRadius } : {}) }),
      label(s.label, s.labelInk ?? s.ink, 56, 64, 600, 'left'),
      t.part, sub.part,
      ...badge(s.badge, 70, H - 90 - 170, 160),
    ],
  }
}

// 풀세트 받침대 (1200×616) — 제품을 세울 선 = 윗면 가운데보다 조금 앞 (studioTemplateSets 예전 값과 같음)
export const PODIUM_TOP = 260 / 616
/** 9. 받침대 — 큰 제목 위, 흰 받침대 위에 대표 사진, 반짝이 별 (에셋) */
function podium(s) {
  const t = titlePart(s.title, s.font, s.ink, 40, HERO_TITLE_TOP, 700, 0.33)
  const sub = subPart(s.sub, s.subInk ?? s.ink, 70, t.part.y + t.h + 14, 640)
  const pw = 520
  const ph = Math.round((pw * 616) / 1200)
  const px = (W - pw) / 2
  const py = H - 50 - ph
  const stand = Math.round(py + ph * PODIUM_TOP)
  const size = 270
  return {
    items: [
      // 받침대 + 올라선 사진 = 한 묶음 (같이 옮긴다). 사진이 받침대 다음 — 받침대 위에 그려진다
      { type: 'asset', group: 'hp', asset: s.podium, x: px, y: py, w: pw, h: ph, fit: 'contain', label: '흰 받침대' },
      { ...photo(0, (W - size) / 2, stand - size, size, size, { sample: s.sample }), group: 'hp' },
      { type: 'asset', asset: s.sparkle, x: 610, y: stand - size - 10, w: 110, h: 103, fit: 'contain', label: '반짝이 별' },
      label(s.label, s.labelInk ?? s.ink, 40, 84, 700),
      t.part, sub.part,
    ],
  }
}

const COMPS = { stack, overlay, split, circle, collage, cutout, band, poster, podium }
export const HERO_COMPS = Object.keys(COMPS)

/** 첫 화면 구간 (템플릿 구간 모양) */
export function buildHero(spec) {
  const make = COMPS[spec.comp]
  if (!make) throw new Error(`모르는 첫 화면 구도: ${spec.comp}`)
  const { items } = make(spec)
  // 장식 에셋 (왼쪽 위 빈 곳 — 하트 자리·제목과 안 겹침). 맨 뒤에 둔다
  const deco = spec.decoStar ? [{ type: 'asset', asset: SPARKLE, x: 40, y: 22, w: 100, h: 94, fit: 'contain', label: '반짝이 별' }] : []
  return { height: H, bg: spec.bg, ...(spec.bgImage ? { bgImage: { asset: spec.bgImage, fit: 'cover' } } : {}), items: [...deco, ...items] }
}
const SPARKLE = 'objects/euchs-obj_common_sparkle-stars_01.png' // 940×881

// ── 템플릿 38개의 첫 화면 ──
// tone = 바탕색 계열 (갤러리에서 바로 옆 카드끼리 겹치지 않게 순서를 정할 때 — studioTemplates.galleryOrder)
const B = (text, shape, fill, ink, font) => ({ text, shape, fill, ink, ...(font ? { font } : {}) })
export const HERO_SPECS = {
  // 기본
  basic: { comp: 'overlay', tone: 'photo', bg: '#1d1d1f', sample: 'scene', font: 'pretendard', title: '오늘의\n베스트\n아이템', sub: '많이 찾는 이유를 한 줄로 적어 주세요', label: 'BEST ITEM', badge: B('BEST', 'pill', '#ffd23f', '#111111') },
  point: { comp: 'poster', tone: 'yellow', bg: '#ffd23f', font: 'black-han-sans', ink: '#111111', title: '딱 필요한\n그 물건,\n여기 있어요', sub: '제품을 한 문장으로 소개해 주세요', label: 'POINT PICK', accent: '#111111', badge: B('BEST', 'burst', '#e5484d', WHITE) },
  size: { comp: 'split', tone: 'blue', bg: '#14213d', font: 'gasoek-one', ink: WHITE, accent: '#ffd23f', title: '사이즈\n고민은\n이제\n그만', sub: '치수를 꼼꼼히\n적어 두었어요', label: 'SIZE GUIDE', badge: B('S~XL', 'ellipse', '#ffd23f', '#14213d') },
  // 카테고리 템플릿
  'apparel-look': { comp: 'collage', tone: 'beige', bg: '#efe6da', bgImage: 'backgrounds/euchs-bg_apparel_beige-linen_01.jpg', font: 'gowun-batang', ink: '#2b2118', title: '이번 주\n데일리\n룩북', sub: '코디 포인트를 한 줄로 적어 주세요', label: 'LOOKBOOK', badge: B('NEW', 'star', '#2b2118', WHITE) },
  'apparel-basic': { comp: 'stack', bleed: true, tone: 'blue', bg: '#cfe3ff', font: 'pretendard', ink: '#0f1e46', title: '손이 가는\n데일리\n셔츠', sub: '소재와 핏의 장점을 적어 주세요', label: 'DAILY WEAR', badge: B('10%\nOFF', 'burst', '#0f1e46', WHITE) },
  'bags-daily': { comp: 'circle', tone: 'yellow', bg: '#f4c542', font: 'do-hyeon', ink: '#3a2413', accent: '#3a2413', title: '가볍게\n들어요', sub: '언제 들기 좋은지 적어 주세요', label: 'DAILY BAG', badge: B('NEW', 'burst', '#3a2413', WHITE) },
  'bags-check': { comp: 'overlay', tone: 'photo', bg: '#2a3019', sample: 'scene', font: 'gasoek-one', title: '어디든\n함께\n가는 가방', sub: '수납과 무게의 장점을 적어 주세요', label: 'EVERYDAY', badge: B('무료배송', 'pill', '#c3cf9a', '#2a3019') },
  'kitchen-bold': { comp: 'split', side: 'left', tone: 'red', bg: '#d9480f', font: 'black-han-sans', ink: WHITE, accent: '#ffd166', title: '요리가\n쉬워\n지는\n도구', sub: '어떤 요리에 좋은지\n적어 주세요', label: 'KITCHEN', badge: B('주방\n추천', 'ellipse', '#ffd166', '#2b1a12') },
  'kitchen-check': { comp: 'cutout', tone: 'green', bg: '#c9efe3', font: 'pretendard', ink: '#0b3b37', blob: '#ffffff', title: '설거지도\n간편하게', sub: '쓰기 편한 점을 한 줄로 적어 주세요', label: 'KITCHEN PICK', badge: B('1+1', 'burst', '#0f766e', WHITE) },
  'living-basic': { comp: 'stack', tone: 'purple', bg: '#e6dcff', font: 'pretendard', ink: '#2b2250', title: '정리가\n쉬워지는\n수납', sub: '어디에 두고 쓰면 좋은지 적어 주세요', label: 'HOME LIVING', badge: B('살림\n필수', 'burst', '#6c4ad8', WHITE) },
  'living-bold': { comp: 'band', tone: 'black', bg: '#15171b', font: 'black-han-sans', ink: WHITE, subInk: '#d8dce3', title: '살림템\n끝판왕', sub: '생활이 편해지는 점을 한 줄로 적어 주세요', label: 'HOME LIVING', badge: B('살림\n추천', 'burst', '#ffd23f', '#111111') },
  'beauty-mood': { comp: 'circle', tone: 'pink', bg: '#f7d6df', bgImage: 'backgrounds/euchs-bg_beauty_pink-silk-wave_01.jpg', font: 'gowun-batang', ink: '#4a1f2f', accent: '#c2557a', pillFill: '#c2557a', title: '나만의\n루틴', sub: '사용감과 향을 한 줄로 적어 주세요', label: 'BEAUTY', badge: B('NEW', 'burst', '#c2557a', WHITE) },
  'beauty-check': { comp: 'poster', tone: 'purple', bg: '#e3dcf5', bgImage: 'backgrounds/euchs-bg_beauty_lilac-water_01.jpg', font: 'pretendard', ink: '#2d2150', accent: '#9b87d8', blockRadius: 28, title: '산뜻하게\n바르고\n편안하게', sub: '언제 쓰면 좋은지 적어 주세요', label: 'DAILY ROUTINE', badge: B('10%\nOFF', 'burst', '#2d2150', WHITE) },
  'electronics-bold': { comp: 'cutout', tone: 'blue', bg: '#12224a', bgImage: 'backgrounds/euchs-bg_digital_navy-glow_01.jpg', font: 'pretendard', ink: WHITE, subInk: '#d8dce3', blob: '#4f6fb8', blobOpacity: 0.35, title: '버튼\n하나로', sub: '가장 큰 장점을 한 줄로 적어 주세요', label: 'SMART LIFE', badge: B('인기\n상품', 'burst', '#4f9dff', WHITE) },
  'electronics-spec': { comp: 'split', tone: 'gray', bg: '#dfe3e8', bgImage: 'backgrounds/euchs-bg_digital_silver-gradient_01.jpg', font: 'pretendard', ink: '#111827', accent: '#4f46e5', title: '작지만\n든든한\n생활\n가전', sub: '어디서 쓰면 좋은지\n적어 주세요', label: 'SMART LIFE', badge: B('NEW', 'ellipse', '#4f46e5', WHITE) },
  'toys-play': { comp: 'collage', tone: 'yellow', bg: '#fff1a8', bgImage: 'backgrounds/euchs-bg_toy_yellow-mint_01.jpg', font: 'do-hyeon', ink: '#3a2a00', title: '놀면서\n자라는\n시간', sub: '어떤 놀이를 할 수 있는지 적어 주세요', label: 'PLAY TIME', badge: B('신나요', 'star', '#ff6b4a', WHITE) },
  'toys-basic': { comp: 'stack', tone: 'orange', bg: '#ffd9c2', bgImage: 'backgrounds/euchs-bg_toy_peach-shapes_01.jpg', font: 'black-han-sans', ink: '#5a2a12', title: '아이 손에\n꼭 맞는\n놀이 친구', sub: '아이가 좋아할 점을 적어 주세요', label: 'PLAY TIME', badge: B('BEST', 'burst', '#e64980', WHITE) },
  'pets-bold': { comp: 'overlay', tone: 'photo', bg: '#15391d', sample: 'scene', font: 'pretendard', title: '우리 아이\n산책\n필수템', sub: '아이에게 좋은 점을 한 줄로 적어 주세요', label: 'FOR MY PET', badge: B('산책 필수', 'pill', '#9be3a8', '#15391d') },
  'pets-mood': { comp: 'stack', bleed: true, tone: 'beige', bg: '#f3e7d8', bgImage: 'backgrounds/euchs-bg_pet_cream-window_01.jpg', font: 'gowun-batang', ink: '#2e1c12', title: '함께라서\n더 포근한\n하루', sub: '어떤 아이에게 잘 맞는지 적어 주세요', label: 'FOR MY PET', badge: B('포근\n쿠션', 'burst', '#8d5b3e', WHITE) },
  'fullset-sample': { comp: 'podium', tone: 'beige', bg: '#f1f4f9', bgImage: 'backgrounds/euchs-bg_common_wide-gold-ivory_01.jpg', font: 'pretendard', ink: '#12224a', subInk: '#4b5563', title: '첫눈에\n반해요', sub: '누구에게 왜 좋은지 한 줄로 적어 주세요', label: 'BRAND STORY', podium: 'objects/euchs-obj_common_podium-white_01.png', sparkle: 'objects/euchs-obj_common_sparkle-stars_01.png' },
  // 새 템플릿 18개 (의류)
  'apparel-minimal': { comp: 'split', side: 'left', tone: 'gray', bg: '#ececea', font: 'pretendard', ink: '#1f2328', title: '기본에\n충실한\n니트\n한 벌', sub: '부드러운 촉감과 핏을\n소개해 주세요', label: 'NEW ARRIVAL', badge: B('NEW', 'ellipse', '#1f2328', WHITE) },
  'apparel-warm': { comp: 'circle', tone: 'orange', bg: '#f6dcc8', bgImage: 'backgrounds/euchs-bg_beauty_peach-glow_01.jpg', font: 'gowun-batang', ink: '#3a2413', accent: '#a9805b', pillFill: '#a9805b', title: '포근한\n니트', sub: '어떤 날 입으면 좋은지 적어 주세요', label: 'COZY DAYS', badge: B('BEST', 'burst', '#a9805b', WHITE) },
  'apparel-vivid': { comp: 'band', decoStar: true, tone: 'blue', bg: '#2448d8', font: 'gasoek-one', ink: WHITE, subInk: '#e4e9ff', title: '올 시즌\n필수템', sub: '가장 자랑하고 싶은 점을 적어 주세요', label: 'SEASON PICK', badge: B('신상\n입고', 'burst', '#ffd23f', '#10162e') },
  'apparel-mono': { comp: 'overlay', tone: 'photo', bg: '#16181c', sample: 'scene', dim: 0.3, font: 'noto-serif-kr', labelInk: '#e8d3a8', title: '단정한\n실루엣', sub: '소재와 만듦새를 차분하게 소개해 주세요', label: 'CLASSIC LINE', badge: B('PREMIUM', 'pill', '#c9a86a', '#16181c') },
  'apparel-natural': { comp: 'cutout', tone: 'green', bg: '#dfe9d3', font: 'pretendard', ink: '#2d4a22', blob: '#c7d8b4', blobOpacity: 0.9, title: '가볍게\n걸쳐요', sub: '어떤 날 입으면 좋은지 적어 주세요', label: 'NATURAL MOOD', badge: B('무료\n배송', 'burst', '#5d7a4a', WHITE) },
  'apparel-trendy': { comp: 'collage', tone: 'pink', bg: '#ff8fb1', font: 'gasoek-one', ink: '#1d1320', frame: '#fffdf6', title: '요즘\n이거\n입어요', sub: '컬러와 핏의 매력을 적어 주세요', label: 'HOT ITEM', badge: B('HOT', 'star', '#ffe14d', '#1d1320') },
  // 잡화·가방
  'bags-minimal': { comp: 'poster', tone: 'beige', bg: '#e8e1d6', bgImage: 'backgrounds/euchs-bg_bag_travertine_01.jpg', font: 'pretendard', ink: '#2b2118', accent: '#8a6a4f', title: '들수록\n손이 가는\n가방', sub: '언제 들기 좋은 가방인지 적어 주세요', label: 'DAILY BAG', badge: B('BEST', 'burst', '#2b2118', WHITE) },
  'bags-warm': { comp: 'split', tone: 'orange', bg: '#e8a36b', font: 'gowun-batang', ink: '#3a2413', title: '손에\n익는\n가죽\n가방', sub: '가방을 들었을 때\n느낌을 적어 주세요', label: 'MY FAVORITE', badge: B('인기\n색상', 'ellipse', '#3a2413', WHITE) },
  'bags-vivid': { comp: 'cutout', decoStar: true, tone: 'red', bg: '#e4572e', font: 'black-han-sans', ink: WHITE, subInk: '#fff1ea', blob: '#f08a67', blobOpacity: 0.8, title: '포인트\n완성', sub: '가장 자랑하고 싶은 점을 적어 주세요', label: 'HOT ITEM', badge: B('인기\n색상', 'burst', '#1f2328', WHITE) },
  'bags-mono': { comp: 'band', decoStar: true, tone: 'black', bg: '#101010', font: 'nanum-myeongjo', ink: WHITE, labelInk: '#d6c3a1', subInk: '#cfd3da', title: '시그니처\n레더백', sub: '소재와 바느질을 차분하게 소개해 주세요', label: 'SIGNATURE', badge: B('PREMIUM', 'pill', '#d6c3a1', '#101010') },
  'bags-natural': { comp: 'stack', bleed: true, tone: 'green', bg: '#dbe8cf', bgImage: 'backgrounds/euchs-bg_health_mint-leaf-bokeh_01.jpg', font: 'pretendard', ink: '#2a3019', title: '주말엔\n이 가방\n하나로', sub: '어디에 들고 가면 좋은지 적어 주세요', label: 'WEEKEND', badge: B('가벼운\n무게', 'burst', '#6b7a3a', WHITE) },
  'bags-trendy': { comp: 'collage', three: false, tone: 'blue', bg: '#1c64f2', font: 'gasoek-one', ink: WHITE, subInk: '#e4ecff', title: '요즘\n제일 많이\n드는 백', sub: '크기와 컬러의 매력을 적어 주세요', label: 'MINI BAG', badge: B('HOT', 'star', '#ffe14d', '#111111') },
  // 생활용품
  'living-minimal': { comp: 'stack', bleed: true, tone: 'gray', bg: '#eef1f4', font: 'pretendard', ink: '#1f2d3a', title: '매일 쓰는\n작은\n물건', sub: '어디에 두고 쓰면 좋은지 적어 주세요', label: 'HOME ESSENTIAL', badge: B('NEW', 'burst', '#3b6e8f', WHITE) },
  'living-warm': { comp: 'overlay', tone: 'photo', bg: '#2e211a', sample: 'scene', font: 'gowun-batang', shade: '#2e1a0e', title: '천천히\n즐기는\n아침', sub: '이 물건과 함께하는 하루를 적어 주세요', label: 'SLOW MORNING', badge: B('오늘 출발', 'pill', '#f7f1ea', '#2e211a') },
  'living-vivid': { comp: 'circle', decoStar: true, tone: 'green', bg: '#0f8a5f', font: 'gasoek-one', ink: WHITE, accent: '#ffcf33', pillFill: '#ffcf33', pillInk: '#0d231b', title: '살림이\n쉬워요', sub: '가장 편해진 점을 한 줄로 적어 주세요', label: 'LIVING PICK', badge: B('살림\n추천', 'burst', '#ffcf33', '#0d231b') },
  'living-mono': { comp: 'poster', tone: 'black', bg: '#1b1b1b', font: 'noto-serif-kr', ink: WHITE, subInk: '#cfcac2', labelInk: '#c8b89c', accent: '#8c7a62', title: '조용하게\n빛나는\n생활 도구', sub: '소재와 쓰임새를 차분하게 소개해 주세요', label: 'QUIET LIVING', badge: B('한정\n수량', 'burst', '#8c7a62', WHITE) },
  'living-natural': { comp: 'split', tone: 'green', bg: '#e3eee0', font: 'pretendard', ink: '#24402c', accent: '#4f7a5a', title: '초록이\n있는\n우리\n집', sub: '어떤 공간에 두면\n좋은지 적어 주세요', label: 'GREEN HOME', badge: B('NEW', 'ellipse', '#4f7a5a', WHITE) },
  'living-trendy': { comp: 'cutout', tone: 'yellow', bg: '#ffe66d', font: 'black-han-sans', ink: '#1a2b2a', blob: '#ffffff', blobOpacity: 0.6, title: '보는 재미\n쓰는 재미', sub: '컬러와 쓰임새의 매력을 적어 주세요', label: 'MUST HAVE', badge: B('1+1', 'burst', '#ff6b4a', WHITE) },
}

// ── 템플릿에 첫 화면 붙이기 ──
const isPhotoSec = s => !!s && Number.isInteger(s.photo)
const slotsIn = s => (isPhotoSec(s) ? [s.photo] : (s.items || []).filter(p => p.type === 'image' && p.slot !== undefined).map(p => p.slot))
const renumber = (s, f) => (isPhotoSec(s) ? { ...s, photo: f(s.photo) } : { ...s, items: s.items.map(p => (p.type === 'image' && p.slot !== undefined ? { ...p, slot: f(p.slot) } : p)) })

/**
 * 첫 구간을 첫 화면으로 바꾼 템플릿 (spec 없으면 그대로). 구간 수·key·카테고리 그대로.
 * @returns 새 템플릿 객체 (+ tone)
 */
export function withHero(tpl, spec = HERO_SPECS[tpl.key]) {
  if (!spec) return tpl
  const hero = buildHero(spec)
  const rest = tpl.sections.slice(1)
  const nums = tpl.sections.flatMap(slotsIn).filter(Number.isInteger)
  let next = (nums.length ? Math.max(...nums) : -1) + 1
  const zeroTo = rest.some(s => slotsIn(s).includes(0)) ? next++ : null
  const moved = zeroTo === null ? rest : rest.map(s => renumber(s, n => (n === 0 ? zeroTo : n)))
  const extra = new Map()
  const heroSec = renumber(hero, n => (Number.isInteger(n) ? n : (extra.has(n) ? extra.get(n) : (extra.set(n, next++), extra.get(n)))))
  const sections = [heroSec, ...moved]
  // 번호 = 페이지 위에서부터 나오는 차례 (구간 안에서는 번호가 작은 것부터 — 첫 화면은 대표 0 → 겹침 뒷 사진).
  // 고객 사진이 위에서부터 차례로 들어가고, 내 템플릿 변환(pageToTemplate)의 번호 매김과도 같다
  const order = [...new Set(sections.flatMap(s => [...new Set(slotsIn(s))].sort((a, b) => a - b)))]
  const pack = new Map(order.map((n, i) => [n, i]))
  return { ...tpl, tone: spec.tone, sections: sections.map(s => renumber(s, n => pack.get(n))) }
}
