/**
 * 카테고리별 상세페이지 템플릿 (에셋 채우기) — 코드 데이터 (DOM·DB 없음, node 테스트: scripts/test-studio-assets.mjs)
 *
 * ★ 모양은 studioTemplates.js 맨 위 설명과 같다 ({ key, label, desc, gap, sections }) + category(TEMPLATE_CATEGORIES의 key).
 *   이 파일은 studioTemplates.js를 불러오지 않는다(거꾸로 studioTemplates.js가 이 목록을 STUDIO_TEMPLATES 뒤에 붙인다).
 * ★ 폭 780px 기준(studioPage.PAGE_WIDTH — 내보내기 1배 780·2배 1560과 같은 값). 구간 높이는 안에 든 조각 높이를 더해 정한다.
 *   글자 높이 = 줄 수 × 크기 × 줄간격 (studioText.textHeight와 같은 식) — 문구는 줄마다 폭 안에 들어가게 직접 줄을 나눴다(\n).
 * ★ 구성 흐름: 눈길 끄는 제목 → 핵심 포인트 3개 → 상세 사진 → 사이즈·스펙표 → 사용법 → 구매 전 안내·배송 안내.
 *   짜임새 4가지(클래식·짙은 첫 화면·매거진·체크리스트) × 카테고리별 색·문구. 배치·색·문구 모두 이 프로젝트에서 새로 정한 것
 *   (다른 편집 프로그램·쇼핑몰의 템플릿·문구·그림을 옮기지 않음). 도형은 studioShape의 직접 그린 path, 글꼴은 허용 목록만.
 * ★ 문구는 판매자가 고쳐 쓰는 자리표시 — 사실 확인이 필요한 말(인증·효능·수치)은 넣지 않고 "적어 주세요"로 둔다.
 */

export const TEMPLATE_CATEGORIES = [
  { key: 'common', label: '기본' },
  { key: 'apparel', label: '의류' },
  { key: 'bags', label: '잡화·가방' },
  { key: 'kitchen', label: '주방' },
  { key: 'living', label: '생활용품' },
  { key: 'beauty', label: '뷰티' },
  { key: 'electronics', label: '전자·소형가전' },
  { key: 'toys', label: '완구' },
  { key: 'pets', label: '반려동물' },
  { key: 'fullset', label: '풀세트' }, // 에셋 이미지(받침대·배경 그림)까지 들어간 긴 구성 (지금은 샘플 1개)
]

const W = 780
const WHITE = '#ffffff'
const textH = (text, size, lh) => Math.ceil(text.split('\n').length * size * lh)

// ── 조각 (block) = { h, make(y, gid) → 요소 조각[] }. 숫자 = 그만큼 띄우기 ──

/** 글자 한 덩이 (기본 가운데) */
function T(text, size, weight, color, o = {}) {
  const { w = 640, lh = 1.35, align = 'center', font = 'noto-sans-kr', x = Math.round((W - w) / 2), ...rest } = o
  return {
    h: textH(text, size, lh),
    make: y => [{ type: 'text', x, y, w, text, fontSize: size, fontWeight: weight, color, fontFamily: font, align, lineHeight: lh, ...rest }],
  }
}
/** 짧은 막대 */
const bar = (color, w = 56, h = 4) => ({ h, make: y => [{ type: 'shape', shape: 'rect', x: Math.round((W - w) / 2), y, w, h, fill: color, radius: Math.floor(h / 2) }] })
/** 선 — 마름모 — 선 */
const ornament = color => ({
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
function pill(text, fill, ink, o = {}) {
  const { w = 180, h = 44, size = 19, x = Math.round((W - w) / 2), shape = 'rect' } = o
  return {
    h,
    make: (y, gid) => {
      const group = gid()
      return [
        { type: 'shape', group, shape, x, y, w, h, fill, radius: shape === 'rect' ? Math.floor(h / 2) : 0 },
        { type: 'text', group, x: x + 10, y: y + Math.round((h - textH(text, size, 1.2)) / 2), w: w - 20, text, fontSize: size, fontWeight: 800, color: ink, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.2, letterSpacing: 0.06 },
      ]
    },
  }
}
/** 사진 자리 (가운데, 둥근 모서리) */
const photo = (slot, h, o = {}) => {
  const { w = 660, radius = 16, x = Math.round((W - w) / 2) } = o
  return { h, make: y => [{ type: 'image', slot, x, y, w, h, radius }] }
}
/** 사진 두 장 나란히 */
const photoPair = (a, b, h, radius = 12) => ({
  h,
  make: y => [
    { type: 'image', slot: a, x: 40, y, w: 340, h, radius },
    { type: 'image', slot: b, x: 400, y, w: 340, h, radius },
  ],
})
/** 표 (행 높이 = round(글자 크기 × 2.2) — studioTable.tableRowHeight와 같은 식) */
function table(cells, th, o = {}) {
  const { w = 640, fontSize = 18 } = o
  return {
    h: cells.length * Math.round(fontSize * 2.2),
    make: y => [{
      type: 'table', x: Math.round((W - w) / 2), y, w, fontSize, cells: cells.map(r => [...r]),
      headerBg: th.accent, headerColor: th.onAccent, borderColor: th.line, color: th.ink,
    }],
  }
}
/** 카드 3개 나란히 — 번호 원 + 제목 + 설명 두 줄. label(n) = 원 안 글자 */
function cards3(items, th, o = {}) {
  const { cardBg = WHITE, h = 250, label = n => String(n), dot = 56 } = o
  return {
    h,
    make: (y, gid) => items.flatMap((it, i) => {
      const x = 40 + i * 240
      const group = gid()
      return [
        { type: 'shape', shape: 'rect', x, y, w: 220, h, fill: cardBg, radius: 18 },
        { type: 'shape', group, shape: 'ellipse', x: x + 110 - dot / 2, y: y + 28, w: dot, h: dot, fill: th.accent },
        { type: 'text', group, x: x + 110 - dot / 2, y: y + 28 + Math.round((dot - textH('1', 24, 1.2)) / 2), w: dot, text: label(i + 1), fontSize: 24, fontWeight: 900, color: th.onAccent, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.2 },
        { type: 'text', x: x + 12, y: y + 106, w: 196, text: it.title, fontSize: 22, fontWeight: 800, color: th.ink, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.3 },
        { type: 'text', x: x + 12, y: y + 148, w: 196, text: it.desc, fontSize: 16, fontWeight: 400, color: th.sub, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.6 },
      ]
    }),
  }
}
/** 세로 번호 목록 — 번호 원 + 제목 + 설명 한 줄 */
function numberList(items, th) {
  const row = 104
  return {
    h: items.length * row - 24,
    make: (y, gid) => items.flatMap((it, i) => {
      const top = y + i * row
      const group = gid()
      return [
        { type: 'shape', group, shape: 'ellipse', x: 70, y: top + 8, w: 60, h: 60, fill: th.accent },
        { type: 'text', group, x: 70, y: top + 8 + Math.round((60 - textH('1', 26, 1.2)) / 2), w: 60, text: String(i + 1), fontSize: 26, fontWeight: 900, color: th.onAccent, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.2 },
        { type: 'text', x: 156, y: top + 6, w: 554, text: it.title, fontSize: 24, fontWeight: 800, color: th.ink, fontFamily: 'noto-sans-kr', align: 'left', lineHeight: 1.3 },
        { type: 'text', x: 156, y: top + 44, w: 554, text: it.desc.replace(/\n/g, ' '), fontSize: 18, fontWeight: 400, color: th.sub, fontFamily: 'noto-sans-kr', align: 'left', lineHeight: 1.5 },
      ]
    }),
  }
}
/** 체크 줄 — 체크 원 + 한 줄 글 */
function checks(lines, th, ink) {
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
function boxes2(items, th, o = {}) {
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
const fixed = make => ({ h: 0, make: (_y, gid) => make(gid) })

/** 에셋 이미지 (우리 그림 — studioAsset). 자리가 정해진 조각 (높이를 차지하지 않는다) */
const asset = (file, x, y, w, h, o = {}) => fixed(() => [{ type: 'asset', asset: file, x, y, w, h, fit: 'contain', ...o }])

/** 구간 조립 — 위 여백 + 조각들 + 아래 여백 = 구간 높이. bgImage = 섹션 배경 이미지(에셋 파일 경로) */
function sec(bg, blocks, o = {}) {
  const { top = 72, bottom = 72, bgImage = null } = o
  let y = top
  let n = 0
  const gid = () => `g${++n}`
  const items = []
  for (const b of blocks) {
    if (typeof b === 'number') { y += b; continue }
    items.push(...b.make(y, gid))
    y += b.h
  }
  return { height: y + bottom, bg, ...(bgImage ? { bgImage: { asset: bgImage, fit: 'cover' } } : {}), items }
}

// ── 공통 문구 ──
const SHIP = { title: '배송 안내', body: '· 결제 후 출고까지 걸리는 날을\n  적어 주세요.\n· 배송비와 묶음 배송 기준을\n  적어 주세요.' }
const RETURN = { title: '교환·반품 안내', body: '· 받은 날부터 며칠 안에 신청할 수\n  있는지 적어 주세요.\n· 교환·반품 배송비 기준을\n  적어 주세요.' }

/** 큰 제목 글꼴 (색 묶음이 명조면 명조) */
const heading = (_c, th) => ({ font: th.serif ? 'noto-serif-kr' : 'noto-sans-kr', weight: 900 })
/** 구간 제목 */
const title = (text, th, size = 34) => T(text, size, th.serif ? 700 : 800, th.ink, { font: th.serif ? 'noto-serif-kr' : 'noto-sans-kr', lh: 1.3 })
const eyebrow = (text, color) => T(text, 17, 800, color, { letterSpacing: 0.2, lh: 1.3 })

// ── 짜임새 4가지 ──

/** 1. 클래식 — 대표 사진 → 제목 → 포인트 카드 → 사진 → 설명 사진 → 표 → 사용법 → 안내 */
function classic(c, th) {
  const h = heading(c, th)
  return [
    { photo: 0 },
    sec(WHITE, [eyebrow(c.eyebrow, th.accent), 18, T(c.headline, 46, h.weight, th.ink, { font: h.font, w: 680, lh: 1.3 }), 26, bar(th.accent), 26, T(c.lead, 21, 400, th.sub, { w: 640, lh: 1.7 })]),
    sec(th.soft, [title(c.pointsTitle, th), 40, cards3(c.points, th)]),
    { photo: 1 },
    sec(WHITE, [title(c.detailTitle, th), 16, T(c.detailLead, 19, 400, th.sub, { lh: 1.6 }), 36, photo(2, 440), 20, T(c.caption, 17, 400, th.muted, { lh: 1.5 })]),
    sec(th.soft, [title(c.tableTitle, th), 36, table(c.table, th, { w: c.tableW }), 22, T(c.tableNote, 17, 400, th.muted, { lh: 1.5 })]),
    sec(WHITE, [title(c.howTitle, th), 40, cards3(c.steps, th, { cardBg: th.soft })]),
    sec(th.soft, [title(c.noticeTitle, th, 30), 28, T(c.notices, 18, 400, th.sub, { w: 620, align: 'left', lh: 1.8 }), 44, boxes2([SHIP, RETURN], th)]),
  ]
}

/** 2. 짙은 첫 화면 — 짙은 제목 띠 + 배지 → 대표 사진 → 포인트마다 사진 → 표 → 사용 순서 → 안내 */
function bold(c, th) {
  const h = heading(c, th)
  const pointSec = (p, i, bg) => sec(bg, [
    pill(`POINT ${i + 1}`, th.accent, th.onAccent, { w: 160 }), 22,
    T(p.title, 34, 800, th.ink, { lh: 1.3 }), 14,
    T(p.desc.replace(/\n/g, ' '), 20, 400, th.sub, { lh: 1.6 }), 36,
    photo(i + 1, 420),
  ], { top: 64, bottom: 64 })
  return [
    sec(th.dark, [
      fixed(gid => {
        const group = gid()
        return [
          { type: 'shape', group, shape: 'burst', x: 604, y: 40, w: 136, h: 136, fill: th.accent },
          { type: 'text', group, x: 614, y: 40 + Math.round((136 - textH(c.badge, 26, 1.25)) / 2), w: 116, text: c.badge, fontSize: 26, fontWeight: 900, color: th.onAccent, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.25 },
        ]
      }),
      T(c.eyebrow, 17, 800, th.accentOnDark, { w: 520, x: 60, align: 'left', letterSpacing: 0.2, lh: 1.3 }), 20,
      T(c.headline, 48, h.weight, WHITE, { font: h.font, w: 530, x: 60, align: 'left', lh: 1.28 }), 24,
      T(c.lead, 20, 400, th.onDark, { w: 600, x: 60, align: 'left', lh: 1.7 }),
    ], { top: 84, bottom: 80 }),
    { photo: 0 },
    ...c.points.map((p, i) => pointSec(p, i, i % 2 ? th.soft : WHITE)),
    sec(WHITE, [title(c.tableTitle, th), 36, table(c.table, th, { w: c.tableW }), 22, T(c.tableNote, 17, 400, th.muted, { lh: 1.5 })]),
    sec(th.soft, [title(c.howTitle, th), 44, numberList(c.steps, th)]),
    sec(WHITE, [title(c.noticeTitle, th, 30), 28, T(c.notices, 18, 400, th.sub, { w: 620, align: 'left', lh: 1.8 }), 44, boxes2([SHIP, RETURN], th, { boxBg: th.soft })]),
  ]
}

/** 3. 매거진 — 대표 사진 → 명조 제목 → 사진 두 장 → 이야기 + 사진 → 체크 → 표 → 안내 */
function magazine(c, th) {
  const serif = { font: 'noto-serif-kr' }
  return [
    { photo: 0 },
    sec(th.soft, [eyebrow(c.eyebrow, th.accent), 22, T(c.headline, 44, 900, th.ink, { ...serif, w: 680, lh: 1.35 }), 30, ornament(th.accent), 30, T(c.lead, 20, 400, th.sub, { font: 'nanum-myeongjo', w: 640, lh: 1.8 })], { top: 84, bottom: 84 }),
    sec(WHITE, [photoPair(1, 2, 460), 22, T(c.caption, 17, 400, th.muted, { lh: 1.5 })], { top: 40, bottom: 56 }),
    sec(WHITE, [T(c.detailTitle, 32, 700, th.ink, { ...serif, lh: 1.3 }), 18, T(c.detailLead, 19, 400, th.sub, { lh: 1.7 }), 36, photo(3, 440, { radius: 0 })], { top: 40 }),
    sec(th.soft, [T(c.pointsTitle, 32, 700, th.ink, { ...serif, lh: 1.3 }), 40, checks(c.checks, th)]),
    sec(WHITE, [T(c.tableTitle, 32, 700, th.ink, { ...serif, lh: 1.3 }), 36, table(c.table, th, { w: c.tableW }), 22, T(c.tableNote, 17, 400, th.muted, { lh: 1.5 })]),
    sec(th.soft, [T(c.noticeTitle, 28, 700, th.ink, { ...serif, lh: 1.3 }), 28, T(c.notices, 18, 400, th.sub, { w: 620, align: 'left', lh: 1.8 }), 44, boxes2([SHIP, RETURN], th)]),
  ]
}

/** 4. 체크리스트 — 색 띠 제목 + 리본 → 추천 체크 → 사진 → 포인트 카드 → 사진 + 말풍선 → 표 → 사용 순서 → 안내 */
function checklist(c, th) {
  const h = heading(c, th)
  return [
    sec(th.accent, [pill(c.badge.replace(/\n/g, ' '), th.dark, WHITE, { w: 240, h: 50, size: 20, shape: 'ribbon' }), 26, T(c.headline, 46, h.weight, th.onAccent, { font: h.font, w: 680, lh: 1.3 }), 22, T(c.lead, 20, 400, th.onAccent, { w: 640, lh: 1.7 })], { top: 76, bottom: 76 }),
    sec(WHITE, [title(c.checksTitle, th), 40, checks(c.checks, th)]),
    { photo: 0 },
    sec(th.soft, [title(c.pointsTitle, th), 40, cards3(c.points, th)]),
    { photo: 1 },
    sec(WHITE, [
      {
        h: 110,
        make: (y, gid) => {
          const group = gid()
          return [
            { type: 'shape', group, shape: 'bubble', x: 210, y, w: 360, h: 110, fill: th.soft },
            { type: 'text', group, x: 225, y: y + Math.round((86 - textH(c.bubble, 22, 1.3)) / 2), w: 330, text: c.bubble, fontSize: 22, fontWeight: 800, color: th.ink, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.3 },
          ]
        },
      }, 28, photo(2, 440), 20, T(c.caption, 17, 400, th.muted, { lh: 1.5 }),
    ], { top: 56 }),
    sec(th.soft, [title(c.tableTitle, th), 36, table(c.table, th, { w: c.tableW }), 22, T(c.tableNote, 17, 400, th.muted, { lh: 1.5 })]),
    sec(WHITE, [title(c.howTitle, th), 40, cards3(c.steps, th, { cardBg: th.soft, label: n => `${n}` })]),
    sec(th.soft, [title(c.noticeTitle, th, 30), 28, T(c.notices, 18, 400, th.sub, { w: 620, align: 'left', lh: 1.8 }), 44, boxes2([SHIP, RETURN], th)]),
  ]
}

// 풀세트에 쓰는 에셋 이미지 (public/studio-assets — manifest.json에 있는 파일. 파일 경로만 바꾸면 템플릿 코드는 그대로)
const FULL = {
  heroBg: 'backgrounds/euchs-bg_common_wide-gold-ivory_01.jpg',
  podium: 'objects/euchs-obj_common_podium-white_01.png',        // 1200×616
  sparkle: 'objects/euchs-obj_common_sparkle-stars_01.png',       // 940×881
  check: 'objects/euchs-obj_common_check-badge_01.png',           // 1065×1121
  endBg: 'backgrounds/euchs-bg_living_beige-plaster_01.jpg',
}

/**
 * 5. 풀세트 — 첫 화면(배경 이미지 + 오브제) → 대표 사진 → 공감 → 핵심 포인트 3 → 상세 사진 → 사진 두 장 → 소재·스펙 → 비교 →
 *    사용법 → 사이즈·옵션 → 구매 전 안내 → 배송·교환 (12구간). 에셋 이미지 = 첫 화면 배경·받침대·반짝임, 공감·비교 구간 장식, 끝 구간 배경
 */
function fullset(c, th) {
  const h = heading(c, th)
  return [
    sec(th.soft, [
      asset(FULL.podium, 440, 318, 300, 154, { label: '흰 받침대' }),
      asset(FULL.sparkle, 640, 96, 96, 90, { label: '반짝이 별' }),
      T(c.eyebrow, 17, 800, th.accent, { w: 370, x: 60, align: 'left', letterSpacing: 0.2, lh: 1.3 }), 20,
      T(c.headline, 44, h.weight, th.ink, { font: h.font, w: 370, x: 60, align: 'left', lh: 1.3 }), 24,
      T(c.lead, 20, 400, th.sub, { w: 370, x: 60, align: 'left', lh: 1.7 }),
    ], { top: 110, bottom: 110, bgImage: FULL.heroBg }),
    { photo: 0 },
    sec(WHITE, [
      asset(FULL.check, 626, 24, 114, 120, { label: '체크 뱃지' }),
      T(c.worryTitle, 34, th.serif ? 700 : 800, th.ink, { font: th.serif ? 'noto-serif-kr' : 'noto-sans-kr', w: 440, lh: 1.3 }), 40, checks(c.worries, th),
    ]),
    sec(th.soft, [title(c.pointsTitle, th), 40, cards3(c.points, th)]),
    sec(WHITE, [title(c.detailTitle, th), 16, T(c.detailLead, 19, 400, th.sub, { lh: 1.6 }), 36, photo(1, 440), 20, T(c.caption, 17, 400, th.muted, { lh: 1.5 })]),
    sec(WHITE, [photoPair(2, 3, 440)], { top: 0, bottom: 72 }),
    sec(th.soft, [title(c.tableTitle, th), 36, table(c.table, th, { w: c.tableW }), 22, T(c.tableNote, 17, 400, th.muted, { lh: 1.5 })]),
    sec(WHITE, [
      asset(FULL.sparkle, 40, 30, 110, 103, { label: '반짝이 별' }),
      T(c.compareTitle, 34, th.serif ? 700 : 800, th.ink, { font: th.serif ? 'noto-serif-kr' : 'noto-sans-kr', w: 440, lh: 1.3 }), 36, table(c.compare, th, { w: 640 }), 22, T(c.compareNote, 17, 400, th.muted, { lh: 1.5 }),
    ]),
    sec(th.soft, [title(c.howTitle, th), 40, cards3(c.steps, th, { cardBg: WHITE })]),
    sec(WHITE, [title(c.optionTitle, th), 36, table(c.options, th, { w: 640 }), 22, T(c.optionNote, 17, 400, th.muted, { lh: 1.5 })]),
    sec(th.soft, [title(c.noticeTitle, th, 30), 28, T(c.notices, 18, 400, th.sub, { w: 620, align: 'left', lh: 1.8 })]),
    sec('#efe6dc', [title('배송·교환 안내', th, 30), 36, boxes2([SHIP, RETURN], th, { boxBg: WHITE })], { bgImage: FULL.endBg }),
  ]
}

const BUILD = { classic, bold, magazine, checklist, fullset }
const FLOW = {
  classic: '대표 사진 → 제목 → 포인트 3개 → 상세 사진 → 표 → 사용법 → 구매 전 안내·배송',
  bold: '짙은 제목 띠 → 대표 사진 → 포인트마다 사진 → 표 → 사용 순서 → 구매 전 안내·배송',
  magazine: '대표 사진 → 명조 제목 → 사진 두 장 → 이야기 → 체크 3줄 → 표 → 안내·배송',
  checklist: '색 띠 제목 → 추천 체크 → 사진 → 포인트 3개 → 말풍선 사진 → 표 → 사용법 → 안내·배송',
  fullset: '첫 화면 → 공감 → 포인트 3개 → 상세 사진 → 소재·스펙 → 비교 → 사용법 → 사이즈·옵션 → 구매 전 안내 → 배송·교환',
}

// ── 색 (모두 넣은 뒤 바꿀 수 있는 기본색) ──
const theme = (accent, onAccent, soft, dark, o = {}) => ({
  accent, onAccent, soft, dark, ink: '#1f2328', sub: '#4b5563', muted: '#7b818c', line: '#d9dde3', onDark: '#d8dce3', accentOnDark: accent, serif: false, ...o,
})
const TH = {
  sand: theme('#a9805b', WHITE, '#f6f1ea', '#2b2118', { ink: '#2b2118', sub: '#5c5148', muted: '#8a7f75', line: '#e2d9cd', serif: true, accentOnDark: '#d9b892' }),
  navy: theme('#1f3a68', WHITE, '#f1f4f9', '#14213d', { accentOnDark: '#9db8e8' }),
  olive: theme('#5d6b3c', WHITE, '#f3f4ec', '#2a3019', { accentOnDark: '#c3cf9a' }),
  camel: theme('#b5651d', WHITE, '#faf3ea', '#3a2413', { accentOnDark: '#e8b37c' }),
  tomato: theme('#d9480f', WHITE, '#fff4ec', '#2b1a12', { accentOnDark: '#ffa877' }),
  teal: theme('#0f766e', WHITE, '#eef7f5', '#0b3b37', { accentOnDark: '#7fd6cb' }),
  sky: theme('#2f6fed', WHITE, '#f0f5ff', '#12224a', { accentOnDark: '#9dbcff' }),
  slate: theme('#475569', WHITE, '#f3f5f7', '#1e293b', { accentOnDark: '#b6c2d2' }),
  rose: theme('#c2557a', WHITE, '#fdf1f4', '#3d1a27', { ink: '#33202a', sub: '#6a5560', muted: '#94818a', line: '#efd9e0', serif: true, accentOnDark: '#f0a8c0' }),
  mint: theme('#2a9d8f', WHITE, '#eefaf7', '#123f3a', { accentOnDark: '#8fe0d4' }),
  graphite: theme('#111827', WHITE, '#f3f4f6', '#0b0f19', { accentOnDark: '#9aa6bd' }),
  electric: theme('#4f46e5', WHITE, '#f1f0ff', '#1b1840', { accentOnDark: '#b3aeff' }),
  sun: theme('#f59f00', '#2b1d00', '#fff8e6', '#3a2a00', { accentOnDark: '#ffd166' }),
  berry: theme('#e64980', WHITE, '#fff0f5', '#3d1226', { accentOnDark: '#ff9dbf' }),
  leaf: theme('#2f9e44', WHITE, '#eefaf0', '#15391d', { accentOnDark: '#9be3a8' }),
  cocoa: theme('#8d5b3e', WHITE, '#f8f1ec', '#2e1c12', { ink: '#2e1c12', sub: '#5f4a3e', muted: '#8d7a6e', line: '#e6d8cd', serif: true, accentOnDark: '#d9ab8d' }),
}

// ── 카테고리별 문구 (두 템플릿이 같이 쓰는 것) ──
const dash = n => Array.from({ length: n }, () => '-')
const COPY = {
  apparel: {
    pointsTitle: '입을수록 좋은 이유',
    points: [
      { title: '편안한 핏', desc: '몸에 닿는 느낌을\n적어 주세요' },
      { title: '부드러운 소재', desc: '소재와 두께를\n적어 주세요' },
      { title: '쉬운 관리', desc: '세탁 방법을\n적어 주세요' },
    ],
    checksTitle: '이런 분께 잘 맞아요',
    checks: ['매일 편하게 입을 옷을 찾는 분', '체형을 자연스럽게 살리고 싶은 분', '계절이 바뀔 때 입기 좋은 옷'],
    detailTitle: '가까이에서 본 모습', detailLead: '봉제선, 단추, 안감처럼 눈여겨볼 곳을 알려 주세요.', caption: '사진 아래에 색상 이름이나 착용 사이즈를 적어 주세요.',
    bubble: '키와 착용 사이즈를\n적어 주세요',
    tableTitle: '사이즈 안내', tableW: 640,
    table: [['사이즈', '가슴', '어깨', '총장', '소매'], ...['S', 'M', 'L', 'XL'].map(s => [s, ...dash(4)])],
    tableNote: '단위: cm · 재는 방법에 따라 1~3cm 차이가 날 수 있어요.',
    howTitle: '오래 입는 관리법',
    steps: [
      { title: '세탁', desc: '세탁 방법을\n적어 주세요' },
      { title: '건조', desc: '말리는 방법을\n적어 주세요' },
      { title: '보관', desc: '보관 방법을\n적어 주세요' },
    ],
    noticeTitle: '구매 전에 확인해 주세요',
    notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 처음 세탁할 때는 단독 세탁을 권해 드려요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  bags: {
    pointsTitle: '들수록 마음에 드는 이유',
    points: [
      { title: '넉넉한 수납', desc: '들어가는 물건을\n적어 주세요' },
      { title: '가벼운 무게', desc: '무게와 소재를\n적어 주세요' },
      { title: '튼튼한 마감', desc: '손잡이와 지퍼를\n소개해 주세요' },
    ],
    checksTitle: '이런 날에 들기 좋아요',
    checks: ['출근길에 가볍게 들고 싶은 날', '짐이 많은 주말 나들이', '옷차림에 포인트를 주고 싶은 날'],
    detailTitle: '안쪽까지 꼼꼼하게', detailLead: '안주머니, 지퍼, 끈 길이 조절처럼 쓰임새를 알려 주세요.', caption: '사진 아래에 색상 이름이나 수납 예시를 적어 주세요.',
    bubble: '이만큼 들어가요',
    tableTitle: '크기 안내', tableW: 600,
    table: [['구분', '가로', '세로', '폭'], ['크기(cm)', ...dash(3)], ['끈 길이', ...dash(3)], ['무게(g)', ...dash(3)]],
    tableNote: '단위: cm · 재는 방법에 따라 1~2cm 차이가 날 수 있어요.',
    howTitle: '오래 쓰는 관리법',
    steps: [
      { title: '닦기', desc: '닦는 방법을\n적어 주세요' },
      { title: '말리기', desc: '젖었을 때 방법을\n적어 주세요' },
      { title: '보관', desc: '보관 방법을\n적어 주세요' },
    ],
    noticeTitle: '구매 전에 확인해 주세요',
    notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 소재 특성으로 작은 주름이 있을 수 있어요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  kitchen: {
    pointsTitle: '주방이 편해지는 이유',
    points: [
      { title: '손쉬운 사용', desc: '쓰는 방법을\n적어 주세요' },
      { title: '간편한 세척', desc: '씻는 방법을\n적어 주세요' },
      { title: '알맞은 크기', desc: '크기와 용량을\n적어 주세요' },
    ],
    checksTitle: '이런 분께 추천해요',
    checks: ['요리 시간을 줄이고 싶은 분', '설거지가 간편했으면 하는 분', '주방을 깔끔하게 쓰고 싶은 분'],
    detailTitle: '이렇게 쓰여요', detailLead: '실제로 쓰는 모습과 함께 장점을 알려 주세요.', caption: '사진 아래에 용량이나 구성품을 적어 주세요.',
    bubble: '이럴 때 편해요',
    tableTitle: '제품 정보', tableW: 600,
    table: [['항목', '내용'], ...['소재', '크기', '용량', '구성품', '제조국'].map(s => [s, '-'])],
    tableNote: '쓸 수 있는 열원·식기세척기 사용 여부를 적어 주세요.',
    howTitle: '사용 순서',
    steps: [
      { title: '첫 세척', desc: '처음 쓰기 전 할 일을\n적어 주세요' },
      { title: '사용', desc: '쓰는 방법을\n적어 주세요' },
      { title: '세척·보관', desc: '씻고 말리는 법을\n적어 주세요' },
    ],
    noticeTitle: '사용할 때 확인해 주세요',
    notices: '· 처음 쓰기 전에 깨끗이 씻어 주세요.\n· 뜨거울 때는 손잡이를 잡아 주세요.\n· 어린이 손이 닿지 않는 곳에 보관해 주세요.',
  },
  living: {
    pointsTitle: '매일 쓰기 좋은 이유',
    points: [
      { title: '간편한 사용', desc: '쓰는 방법을\n적어 주세요' },
      { title: '깔끔한 정리', desc: '정리되는 모습을\n적어 주세요' },
      { title: '튼튼한 소재', desc: '소재와 두께를\n적어 주세요' },
    ],
    checksTitle: '이런 곳에 두면 좋아요',
    checks: ['자주 쓰는 물건이 많은 거실', '좁아서 정리가 필요한 공간', '손이 자주 가는 현관과 욕실'],
    detailTitle: '자세히 살펴보기', detailLead: '크기감이 느껴지는 사진과 함께 쓰임새를 알려 주세요.', caption: '사진 아래에 색상 이름이나 놓은 장소를 적어 주세요.',
    bubble: '이렇게 놓아 보세요',
    tableTitle: '제품 정보', tableW: 600,
    table: [['항목', '내용'], ...['소재', '크기', '무게', '구성품', '제조국'].map(s => [s, '-'])],
    tableNote: '단위와 재는 기준을 함께 적어 주세요.',
    howTitle: '사용 순서',
    steps: [
      { title: '준비', desc: '꺼내서 할 일을\n적어 주세요' },
      { title: '설치', desc: '놓는 방법을\n적어 주세요' },
      { title: '관리', desc: '닦는 방법을\n적어 주세요' },
    ],
    noticeTitle: '구매 전에 확인해 주세요',
    notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 놓을 자리의 크기를 먼저 재 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  beauty: {
    pointsTitle: '매일 손이 가는 이유',
    points: [
      { title: '산뜻한 사용감', desc: '바른 느낌을\n적어 주세요' },
      { title: '편한 용기', desc: '용기와 용량을\n적어 주세요' },
      { title: '은은한 향', desc: '향을 한 줄로\n적어 주세요' },
    ],
    checksTitle: '이런 분께 추천해요',
    checks: ['가볍게 바르는 제품을 찾는 분', '들고 다니기 편한 크기가 좋은 분', '선물할 제품을 찾는 분'],
    detailTitle: '제형을 가까이에서', detailLead: '발랐을 때 모습과 질감을 사진으로 보여 주세요.', caption: '사진 아래에 색상 이름이나 호수를 적어 주세요.',
    bubble: '이렇게 발라요',
    tableTitle: '제품 정보', tableW: 600,
    table: [['항목', '내용'], ...['용량', '사용 기한', '전성분', '제조국'].map(s => [s, '-'])],
    tableNote: '전성분은 제품 포장에 적힌 그대로 옮겨 주세요.',
    howTitle: '사용 순서',
    steps: [
      { title: '준비', desc: '바르기 전 할 일을\n적어 주세요' },
      { title: '사용', desc: '바르는 양과 방법을\n적어 주세요' },
      { title: '마무리', desc: '다음 단계를\n적어 주세요' },
    ],
    noticeTitle: '사용할 때 확인해 주세요',
    notices: '· 피부에 맞지 않으면 사용을 멈춰 주세요.\n· 직사광선을 피해 서늘한 곳에 보관해 주세요.\n· 어린이 손이 닿지 않는 곳에 보관해 주세요.',
  },
  electronics: {
    pointsTitle: '써 보면 아는 편리함',
    points: [
      { title: '간단한 조작', desc: '버튼과 사용법을\n적어 주세요' },
      { title: '넉넉한 사용', desc: '사용 시간을\n적어 주세요' },
      { title: '가벼운 크기', desc: '크기와 무게를\n적어 주세요' },
    ],
    checksTitle: '이런 분께 추천해요',
    checks: ['처음 써도 쉬운 제품을 찾는 분', '들고 다니며 쓰고 싶은 분', '책상 위를 깔끔하게 쓰고 싶은 분'],
    detailTitle: '구석구석 살펴보기', detailLead: '버튼, 단자, 표시등처럼 자주 쓰는 곳을 알려 주세요.', caption: '사진 아래에 구성품이나 색상 이름을 적어 주세요.',
    bubble: '버튼 하나로 켜요',
    tableTitle: '제품 사양', tableW: 600,
    table: [['항목', '내용'], ...['모델명', '크기·무게', '정격 전압', '충전 방식', '구성품', '인증 번호'].map(s => [s, '-'])],
    tableNote: '사양과 인증 정보는 제품 표기 그대로 적어 주세요.',
    howTitle: '사용 순서',
    steps: [
      { title: '충전·연결', desc: '전원 연결 방법을\n적어 주세요' },
      { title: '켜기', desc: '켜는 방법을\n적어 주세요' },
      { title: '보관', desc: '쓰고 난 뒤 할 일을\n적어 주세요' },
    ],
    noticeTitle: '안전하게 사용해 주세요',
    notices: '· 물기가 있는 곳에서는 사용을 피해 주세요.\n· 정해진 전압과 충전기를 사용해 주세요.\n· 이상이 느껴지면 사용을 멈추고 문의해 주세요.',
  },
  toys: {
    pointsTitle: '아이가 좋아하는 이유',
    points: [
      { title: '즐거운 놀이', desc: '노는 방법을\n적어 주세요' },
      { title: '둥근 마감', desc: '모서리와 소재를\n적어 주세요' },
      { title: '쉬운 정리', desc: '보관 방법을\n적어 주세요' },
    ],
    checksTitle: '이런 아이에게 추천해요',
    checks: ['손으로 만들기를 좋아하는 아이', '역할 놀이를 즐기는 아이', '친구와 함께 놀기 좋아하는 아이'],
    detailTitle: '이렇게 놀아요', detailLead: '노는 모습과 함께 구성품을 하나씩 보여 주세요.', caption: '사진 아래에 구성품 이름과 개수를 적어 주세요.',
    bubble: '함께 놀아요',
    tableTitle: '제품 정보', tableW: 600,
    table: [['항목', '내용'], ...['사용 연령', '소재', '크기', '구성품', '인증 번호', '제조국'].map(s => [s, '-'])],
    tableNote: '사용 연령과 인증 정보는 제품 표기 그대로 적어 주세요.',
    howTitle: '노는 순서',
    steps: [
      { title: '꺼내기', desc: '구성품 확인 방법을\n적어 주세요' },
      { title: '놀기', desc: '노는 방법을\n적어 주세요' },
      { title: '정리', desc: '정리하는 방법을\n적어 주세요' },
    ],
    noticeTitle: '안전하게 놀아 주세요',
    notices: '· 작은 부품은 입에 넣지 않게 살펴 주세요.\n· 사용 연령을 확인하고 보호자와 함께해 주세요.\n· 포장재는 바로 치워 주세요.',
  },
  pets: {
    pointsTitle: '우리 아이가 좋아하는 이유',
    points: [
      { title: '편안한 착용', desc: '닿는 느낌을\n적어 주세요' },
      { title: '쉬운 세척', desc: '씻는 방법을\n적어 주세요' },
      { title: '튼튼한 소재', desc: '소재와 마감을\n적어 주세요' },
    ],
    checksTitle: '이런 아이에게 추천해요',
    checks: ['산책을 좋아하는 아이', '새 물건에 금방 익숙해지는 아이', '털 관리가 필요한 아이'],
    detailTitle: '가까이에서 본 모습', detailLead: '착용한 모습과 함께 몸무게·사이즈를 알려 주세요.', caption: '사진 아래에 모델 아이의 몸무게와 사이즈를 적어 주세요.',
    bubble: '몸무게와 사이즈를\n적어 주세요',
    tableTitle: '사이즈 안내', tableW: 660,
    table: [['사이즈', '목둘레', '가슴둘레', '등길이', '몸무게'], ...['S', 'M', 'L', 'XL'].map(s => [s, ...dash(4)])],
    tableNote: '단위: cm · 가슴둘레를 기준으로 넉넉하게 골라 주세요.',
    howTitle: '사이즈 재는 법',
    steps: [
      { title: '목둘레', desc: '목줄 자리를\n재 주세요' },
      { title: '가슴둘레', desc: '가장 넓은 곳을\n재 주세요' },
      { title: '등길이', desc: '목부터 꼬리 앞까지\n재 주세요' },
    ],
    noticeTitle: '구매 전에 확인해 주세요',
    notices: '· 아이가 물어뜯지 않게 살펴 주세요.\n· 처음에는 짧게 써 보며 익숙해지게 해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
}

// 풀세트 샘플 문구 (생활용품 문구를 바탕으로, 풀세트에만 있는 구간을 더함)
COPY.fullset = {
  ...COPY.living,
  worryTitle: '이런 점이 아쉬우셨나요?',
  worries: ['쓰던 물건이 금방 망가졌던 분', '크기가 맞지 않아 불편했던 분', '관리하기 번거로웠던 분'],
  tableTitle: '소재·스펙',
  compareTitle: '한눈에 비교해 보세요', compareNote: '비교 기준과 측정 방법을 함께 적어 주세요.',
  compare: [['구분', '기본형', '고급형'], ...['크기', '무게', '구성', '추천 대상'].map(s => [s, '-', '-'])],
  optionTitle: '사이즈·옵션',
  options: [['옵션', '크기(cm)', '색상', '구성'], ...['A', 'B', 'C'].map(s => [s, '-', '-', '-'])],
  optionNote: '옵션 이름은 주문 화면의 옵션 이름과 같게 적어 주세요.',
}

// ── 템플릿 16개 (카테고리 8 × 2) + 풀세트 샘플 1개 ──
const LIST = [
  ['apparel', 'apparel-look', '의류 · 룩북', 'magazine', 'sand', { eyebrow: 'NEW SEASON', headline: '매일 입고 싶은\n편안한 한 벌', lead: '어떤 날, 어떤 옷과 입으면 좋은지\n한두 줄로 소개해 주세요.' }],
  ['apparel', 'apparel-basic', '의류 · 사이즈 안내', 'classic', 'navy', { eyebrow: 'DAILY WEAR', headline: '핏이 좋아\n손이 자주 가는 옷', lead: '소재와 핏의 장점을\n한두 줄로 소개해 주세요.' }],
  ['bags', 'bags-daily', '잡화·가방 · 데일리', 'classic', 'camel', { eyebrow: 'DAILY BAG', headline: '가볍게 들고\n넉넉하게 담아요', lead: '언제 들기 좋은 가방인지\n한두 줄로 소개해 주세요.' }],
  ['bags', 'bags-check', '잡화·가방 · 체크리스트', 'checklist', 'olive', { badge: 'NEW ARRIVAL', headline: '어디에나 어울리는\n든든한 가방', lead: '수납과 무게의 장점을\n한두 줄로 소개해 주세요.' }],
  ['kitchen', 'kitchen-bold', '주방 · 포인트 강조', 'bold', 'tomato', { eyebrow: 'KITCHEN', badge: '주방\n추천', headline: '요리가 쉬워지는\n주방 도구', lead: '어떤 요리에 쓰면 좋은지\n한두 줄로 소개해 주세요.' }],
  ['kitchen', 'kitchen-check', '주방 · 체크리스트', 'checklist', 'teal', { badge: 'KITCHEN PICK', headline: '설거지까지 간편한\n주방 살림', lead: '쓰기 편한 점을\n한두 줄로 소개해 주세요.' }],
  ['living', 'living-basic', '생활용품 · 기본', 'classic', 'sky', { eyebrow: 'HOME LIVING', headline: '집이 깔끔해지는\n작은 변화', lead: '어디에 두고 쓰면 좋은지\n한두 줄로 소개해 주세요.' }],
  ['living', 'living-bold', '생활용품 · 포인트 강조', 'bold', 'slate', { eyebrow: 'HOME LIVING', badge: '살림\n추천', headline: '매일 쓰는 물건은\n편해야 하니까', lead: '생활이 편해지는 점을\n한두 줄로 소개해 주세요.' }],
  ['beauty', 'beauty-mood', '뷰티 · 감성', 'magazine', 'rose', { eyebrow: 'BEAUTY', headline: '하루를 가볍게 여는\n나만의 루틴', lead: '사용감과 향을\n한두 줄로 소개해 주세요.' }],
  ['beauty', 'beauty-check', '뷰티 · 체크리스트', 'checklist', 'mint', { badge: 'DAILY ROUTINE', headline: '산뜻하게 바르고\n편안하게 마무리', lead: '언제 쓰면 좋은지\n한두 줄로 소개해 주세요.' }],
  ['electronics', 'electronics-bold', '전자·소형가전 · 포인트 강조', 'bold', 'graphite', { eyebrow: 'SMART LIFE', badge: '인기\n상품', headline: '버튼 하나로\n편해지는 일상', lead: '가장 큰 장점을\n한두 줄로 소개해 주세요.' }],
  ['electronics', 'electronics-spec', '전자·소형가전 · 사양표', 'classic', 'electric', { eyebrow: 'SMART LIFE', headline: '작지만 든든한\n생활 가전', lead: '어디서 쓰면 좋은지\n한두 줄로 소개해 주세요.' }],
  ['toys', 'toys-play', '완구 · 놀이', 'checklist', 'sun', { badge: 'PLAY TIME', headline: '놀면서 자라는\n즐거운 시간', lead: '어떤 놀이를 할 수 있는지\n한두 줄로 소개해 주세요.' }],
  ['toys', 'toys-basic', '완구 · 기본', 'classic', 'berry', { eyebrow: 'PLAY TIME', headline: '아이 손에 꼭 맞는\n놀이 친구', lead: '아이가 좋아할 점을\n한두 줄로 소개해 주세요.' }],
  ['pets', 'pets-bold', '반려동물 · 포인트 강조', 'bold', 'leaf', { eyebrow: 'FOR MY PET', badge: '산책\n필수', headline: '우리 아이를 위한\n편안한 선택', lead: '아이에게 좋은 점을\n한두 줄로 소개해 주세요.' }],
  ['pets', 'pets-mood', '반려동물 · 감성', 'magazine', 'cocoa', { eyebrow: 'FOR MY PET', headline: '함께하는 하루가\n더 포근하게', lead: '어떤 아이에게 잘 맞는지\n한두 줄로 소개해 주세요.' }],
  ['fullset', 'fullset-sample', '풀세트 · 샘플', 'fullset', 'sky', { eyebrow: 'BRAND STORY', headline: '첫 화면에서\n마음을 잡는\n한 문장', lead: '누구에게 왜 좋은지\n두 줄로 소개해 주세요.' }],
]

export const CATEGORY_TEMPLATES = LIST.map(([category, key, label, kind, th, head]) => ({
  key, category, label, desc: FLOW[kind], gap: 0,
  sections: BUILD[kind]({ ...COPY[category], ...head }, TH[th]),
}))
