/**
 * 새 템플릿 18개 (2026-09-29 1차) — [의류] [잡화·가방] [생활용품] × 짜임새 6가지. 코드 데이터 (DOM·DB 없음, node 테스트: scripts/test-studio-template-looks.mjs)
 *
 * ★ 모양은 studioTemplates.js 맨 위 설명과 같다 ({ key, label, desc, gap, sections } + category·mood·color·swatch). 조각 규칙은 studioTemplateSets.TPL_BLOCKS.
 * ★ 짜임새: 밝은 미니멀 · 따뜻한 감성 · 선명한 강조 · 고급 모노톤 · 내추럴 · 트렌디 — 카테고리마다 색·첫 화면 구도·제목 글꼴·구간 순서를 바꿔 서로 다르게.
 *   글꼴 = 새 글꼴 5종(프리텐다드·가석원·고운바탕·동해독도·Cinzel) 위주, 에셋 = public/studio-assets (배경·소품·연출 배경).
 * ★ 사진 자리 4~6개(첫 화면이 겹침 구도면 뒷 사진 자리만큼 더 — 최대 8), 자리마다 어울리는 예시 사진 종류(sample: product·scene·detail·hand — studioSamples). 사이즈표·상세정보 표는 넣지 않는다.
 * ★ 첫 구간은 studioTemplateHeroes.withHero가 큰 제목 첫 화면(780×1040)으로 바꾼다 — 아래 짜임새의 첫 구간(hero)은 그 자리표시.
 * ★ 배치·색·문구는 이 프로젝트에서 새로 정한 것 (다른 편집 프로그램·쇼핑몰의 템플릿·문구·그림을 옮기지 않음).
 *   문구는 판매자가 고쳐 쓰는 예시 — 인증·효능·수치 같은 사실 확인이 필요한 말은 넣지 않는다.
 * ★ 글자 줄은 직접 나눴다(\n) — 줄마다 폭 안에 들어가는지 테스트가 넉넉한 폭 재기로 본다 (글자 넘침·사진 겹침·자리 밖 없음).
 */
import { TPL_BLOCKS } from './studioTemplateSets.js'
import { withHero } from './studioTemplateHeroes.js'

const { W, WHITE, textH, T, ornament, checks, boxes2, sec, SHIP, RETURN } = TPL_BLOCKS

const F = { sans: 'pretendard', display: 'gasoek-one', serif: 'gowun-batang', hand: 'east-sea-dokdo', latin: 'cinzel' }
const A = {
  tape: 'decor/euchs-deco_common_tape_01.png',          // 1200×605
  brush: 'decor/euchs-deco_common_brush-stroke_01.png', // 1200×378
  torn: 'decor/euchs-deco_common_torn-paper_01.png',    // 1200×460
  frame: 'decor/euchs-deco_common_round-frame_01.png',  // 1200×1198
  leaf: 'decor/leaf-branch.svg',                        // 300×400
  sparkle: 'objects/euchs-obj_common_sparkle-stars_01.png', // 940×881
  leaves: 'objects/euchs-obj_health_green-leaves_01.png',   // 856×813
  hanger: 'objects/euchs-obj_apparel_hanger_01.png',        // 1200×623
  drape: 'objects/euchs-obj_apparel_fabric-drape_01.png',   // 1063×996
  silk: 'objects/euchs-obj_apparel_silk-fold_01.png',       // 1200×854
  leather: 'objects/euchs-obj_bag_leather-swatch_01.png',   // 1104×1104
  herbs: 'objects/euchs-obj_kitchen_herbs_01.png',          // 1112×720
  ribbon: 'objects/euchs-obj_common_ribbon-wave_01.png',    // 1200×556
}
const PROP = { apparel: A.hanger, bags: A.leather, living: A.herbs } // 카테고리 소품 그림 (미니멀 인용 구간)
const cx = w => Math.round((W - w) / 2)

// ── 조각 (block = { h, make(y, gid) }) ──

function photoPart(slot, x, y, w, h, o = {}) {
  const { sample, radius = 0, border = 0, borderColor = WHITE, shadow = 0, rotation = 0 } = o
  return {
    type: 'image', slot, x, y, w, h, ...(sample ? { sample } : {}), ...(radius ? { radius } : {}),
    ...(border ? { borderWidth: border, borderColor } : {}), ...(shadow ? { shadow } : {}), ...(rotation ? { rotation } : {}),
  }
}
/** 사진 자리 하나 (기본 가운데) */
function P(slot, h, o = {}) {
  const { w = 660, x = cx(w), ...rest } = o
  return { h, make: y => [photoPart(slot, x, y, w, h, rest)] }
}
/** 사진 자리 여러 개 나란히 (같은 폭) — list = [{ slot, sample }] */
function Prow(list, h, o = {}) {
  const { tw = 700, gap = 20, ...rest } = o
  const w = Math.floor((tw - gap * (list.length - 1)) / list.length)
  const x0 = cx(w * list.length + gap * (list.length - 1))
  return { h, make: y => list.map((p, i) => photoPart(p.slot, x0 + i * (w + gap), y, w, h, { ...rest, sample: p.sample })) }
}
/** 사진 한 장이 폭에 꽉 찬 구간 */
const full = (slot, sample, bg) => ({ photo: slot, sample, ...(bg ? { bg } : {}) })
/** 그림 (에셋) — 자리가 정해진 요소 */
const art = (file, x, y, w, h, label) => ({ type: 'asset', asset: file, x, y, w, h, fit: 'contain', ...(label ? { label } : {}) })
/** 높이를 차지하지 않는 요소 (구간 위쪽 기준 자리) */
const pin = make => ({ h: 0, make: (_y, gid) => make(gid) })

// 글자 — 글꼴·굵기를 정해 둔 짧은 이름
const eyebrow = (text, color, o = {}) => T(text, 15, 700, color, { font: F.latin, letterSpacing: 0.25, lh: 1.3, ...o })
const head = (text, size, color, o = {}) => T(text, size, 800, color, { font: F.sans, lh: 1.28, ...o })
const serifHead = (text, size, color, o = {}) => T(text, size, 700, color, { font: F.serif, lh: 1.35, ...o })
const display = (text, size, color, o = {}) => T(text, size, 400, color, { font: F.display, lh: 1.2, ...o })
const hand = (text, size, color, o = {}) => T(text, size, 400, color, { font: F.hand, lh: 1.25, ...o })
const body = (text, color, o = {}) => T(text, 19, 400, color, { font: F.sans, lh: 1.7, ...o })
const small = (text, color, o = {}) => T(text, 16, 400, color, { font: F.sans, lh: 1.6, ...o })

/** 가는 선 (가운데) */
const rule = (color, w = 48, h = 2) => ({ h, make: y => [{ type: 'shape', shape: 'rect', x: cx(w), y, w, h, fill: color }] })

/** 키워드 알약 여러 개 (가운데 한 줄) */
function chips(words, o = {}) {
  const { size = 17, fill = WHITE, ink = '#1f2328', stroke = null, font = F.sans, h = 42, gap = 12, radius = 21 } = o
  const ws = words.map(t => Math.round([...t].length * size * 1.0 + 40))
  const total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1)
  return {
    h,
    make: (y, gid) => {
      let x = cx(total)
      return words.flatMap((t, i) => {
        const g = gid(), w = ws[i], px = x
        x += w + gap
        return [
          { type: 'shape', group: g, shape: 'rect', x: px, y, w, h, fill, radius, ...(stroke ? { strokeWidth: 1.5, strokeColor: stroke } : {}) },
          { type: 'text', group: g, x: px + 8, y: y + Math.round((h - textH(t, size, 1.2)) / 2), w: w - 16, text: t, fontSize: size, fontWeight: 700, color: ink, fontFamily: font, align: 'center', lineHeight: 1.2 },
        ]
      })
    },
  }
}

/** 포인트 카드 3장 — 번호(글꼴 따로) + 제목 + 설명 두 줄 */
function pointCards(items, th, o = {}) {
  const { cardBg = WHITE, h = 236, num = n => `0${n}`, numFont = F.latin, titleFont = F.sans, numColor = th.accent, radius = 18, stroke = null } = o
  return {
    h,
    make: y => items.flatMap((it, i) => {
      const x = 40 + i * 240
      return [
        { type: 'shape', shape: 'rect', x, y, w: 220, h, fill: cardBg, radius, ...(stroke ? { strokeWidth: 1, strokeColor: stroke } : {}) },
        { type: 'text', x: x + 12, y: y + 30, w: 196, text: num(i + 1), fontSize: 30, fontWeight: numFont === F.latin ? 700 : 400, color: numColor, fontFamily: numFont, align: 'center', lineHeight: 1.2 },
        { type: 'text', x: x + 12, y: y + 92, w: 196, text: it.title, fontSize: 21, fontWeight: titleFont === F.sans ? 800 : 700, color: th.ink, fontFamily: titleFont, align: 'center', lineHeight: 1.3 },
        { type: 'text', x: x + 12, y: y + 136, w: 196, text: it.desc, fontSize: 16, fontWeight: 400, color: th.sub, fontFamily: F.sans, align: 'center', lineHeight: 1.6 },
      ]
    }),
  }
}

/** 포인트 줄 목록 — 왼쪽 번호(Cinzel 로마 숫자 등) · 제목 · 설명 한 줄, 줄 사이 가는 선 */
function pointLines(items, th, o = {}) {
  const { num = n => ['I', 'II', 'III', 'IV'][n - 1], numColor = th.accent, line = th.line, titleFont = F.sans, x = 90, w = 600 } = o
  const row = 112
  return {
    h: items.length * row,
    make: y => items.flatMap((it, i) => {
      const top = y + i * row
      return [
        { type: 'shape', shape: 'rect', x, y: top, w, h: 1, fill: line },
        { type: 'text', x, y: top + 26, w: 80, text: num(i + 1), fontSize: 26, fontWeight: 700, color: numColor, fontFamily: F.latin, align: 'left', lineHeight: 1.2 },
        { type: 'text', x: x + 90, y: top + 22, w: w - 90, text: it.title, fontSize: 23, fontWeight: titleFont === F.sans ? 800 : 700, color: th.ink, fontFamily: titleFont, align: 'left', lineHeight: 1.3 },
        { type: 'text', x: x + 90, y: top + 60, w: w - 90, text: it.desc.replace(/\n/g, ' '), fontSize: 17, fontWeight: 400, color: th.sub, fontFamily: F.sans, align: 'left', lineHeight: 1.5 },
      ]
    }),
  }
}

/** 손글씨 메모 — 테이프 그림 + 동해독도 글씨 (종이 네모 위) */
function note(text, th, o = {}) {
  const { paper = '#fffdf6', ink = th.ink, size = 38, w = 520, rotation = -2 } = o
  const th2 = textH(text, size, 1.25)
  const h = th2 + 96
  return {
    h: h + 24,
    make: (y, gid) => {
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'rect', x: cx(w), y: y + 24, w, h, fill: paper, radius: 6, shadow: 0, rotation },
        { type: 'text', group: g, x: cx(w) + 30, y: y + 24 + 52, w: w - 60, text, fontSize: size, fontWeight: 400, color: ink, fontFamily: F.hand, align: 'center', lineHeight: 1.25, rotation },
        { ...art(A.tape, cx(140), y, 140, 70, '테이프'), group: g }, // 메모에 붙인 테이프 — 메모와 한 묶음
      ]
    },
  }
}

/** 말풍선 + 글자 */
function bubble(text, fill, ink, o = {}) {
  const { w = 420, size = 30, font = F.hand } = o
  const h = Math.max(120, textH(text, size, 1.25) + 60)
  return {
    h,
    make: (y, gid) => {
      const g = gid()
      return [
        { type: 'shape', group: g, shape: 'bubble', x: cx(w), y, w, h, fill },
        { type: 'text', group: g, x: cx(w) + 24, y: y + Math.round((h * 0.82 - textH(text, size, 1.25)) / 2), w: w - 48, text, fontSize: size, fontWeight: font === F.sans ? 800 : 400, color: ink, fontFamily: font, align: 'center', lineHeight: 1.25 },
      ]
    },
  }
}

/** 둥근 확대 사진 + 옆 글 (사진 왼쪽 / 오른쪽) */
function zoom(slot, sample, title, desc, th, o = {}) {
  const { side = 'left', d = 280, titleFont = F.sans, ring = null } = o
  const px = side === 'left' ? 70 : W - 70 - d
  const tx = side === 'left' ? px + d + 50 : 70
  const tw = W - 70 - d - 50 - 70
  const tH = textH(title, 26, 1.3), dH = textH(desc, 17, 1.6)
  const inner = tH + 16 + dH
  return {
    h: d,
    make: y => {
      const ty = y + Math.round((d - inner) / 2)
      return [
        ...(ring ? [{ type: 'shape', shape: 'ellipse', x: px - 10, y: y - 10, w: d + 20, h: d + 20, fill: ring }] : []),
        photoPart(slot, px, y, d, d, { sample, radius: d / 2 }),
        { type: 'text', x: tx, y: ty, w: tw, text: title, fontSize: 26, fontWeight: titleFont === F.sans ? 800 : 700, color: th.ink, fontFamily: titleFont, align: 'left', lineHeight: 1.3 },
        { type: 'text', x: tx, y: ty + tH + 16, w: tw, text: desc, fontSize: 17, fontWeight: 400, color: th.sub, fontFamily: F.sans, align: 'left', lineHeight: 1.6 },
      ]
    },
  }
}

/**
 * 반반 첫 화면 — 한쪽 글(블록 목록), 한쪽 사진. 높이 = 위·아래 여백 + 글과 사진 중 높은 쪽 (둘 다 세로 가운데)
 * text(col) = col { x, w, align }에 맞춘 블록 목록을 돌려주는 함수
 */
function split(bg, text, ph, o = {}) {
  const { top = 80, bottom = 80, gap = 40, bgImage = null, deco = () => [] } = o
  const side = ph.side ?? 'right'
  const px = side === 'left' ? 40 : W - 40 - ph.w
  const col = side === 'left' ? { x: px + ph.w + gap, w: W - 60 - (px + ph.w + gap), align: 'left' } : { x: 60, w: px - gap - 60, align: 'left' }
  const blocks = text(col)
  const tH = blocks.reduce((n, b) => n + (typeof b === 'number' ? b : b.h), 0)
  const inner = Math.max(tH, ph.h)
  let n = 0
  const gid = () => `g${++n}`
  const items = [...deco(gid)]
  let y = top + Math.round((inner - tH) / 2)
  for (const b of blocks) {
    if (typeof b === 'number') { y += b; continue }
    items.push(...b.make(y, gid))
    y += b.h
  }
  items.push(photoPart(ph.slot, px, top + Math.round((inner - ph.h) / 2), ph.w, ph.h, ph))
  return { height: top + inner + bottom, bg, ...(bgImage ? { bgImage: { asset: bgImage, fit: 'cover' } } : {}), items }
}
const colText = (col, o = {}) => ({ x: col.x, w: col.w, align: col.align, ...o })

/** 구매 전 안내 + 배송·교환 상자 */
const noticeSec = (c, th, bg, o = {}) => sec(bg, [
  T(c.noticeTitle, 28, o.serif ? 700 : 800, th.ink, { font: o.serif ? F.serif : F.sans, lh: 1.3 }), 28,
  T(c.notices, 17, 400, th.sub, { font: F.sans, w: 620, align: 'left', lh: 1.8 }), 40,
  boxes2([SHIP, RETURN], th, { boxBg: o.boxBg ?? WHITE }),
])

// ── 색 ──
const theme = (o) => ({ ink: '#1f2328', sub: '#4b5563', muted: '#7b818c', line: '#dfe2e6', onAccent: WHITE, soft: '#f5f5f4', dark: '#15171b', ...o })

// ── 카테고리별 문구 ──
const COPY = {
  apparel: {
    chips: ['#데일리룩', '#레이어드', '#출근룩'],
    pointsTitle: '입을수록 좋은 이유',
    points: [
      { title: '부드러운 촉감', desc: '소재 느낌을\n적어 주세요' },
      { title: '편안한 핏', desc: '핏과 길이를\n적어 주세요' },
      { title: '쉬운 코디', desc: '어울리는 옷을\n적어 주세요' },
    ],
    checksTitle: '이런 분께 추천해요',
    checks: ['출근룩이 고민인 분', '편하게 입을 옷을 찾는 분', '선물할 옷을 고르는 분'],
    story: '처음 입었을 때의 느낌을\n두세 줄로 들려주세요.\n입은 모습이 떠오르게요.',
    quote: '"편한데 예쁜 옷,\n그 한 벌을 찾았어요."',
    caption: '사진 아래에 색상 이름을 적어 주세요.',
    zoomTitle: '가까이 보면\n더 좋아요',
    zoomDesc: '짜임과 마감처럼\n자세히 보여 줄 곳을\n적어 주세요.',
    note: '직접 입어 보고\n골랐어요!',
    bubble: '이 색 정말\n잘 어울려요',
    statement: '지금 입기\n딱 좋은 옷',
    closing: 'EVERYDAY WEAR',
    closingSub: '오늘도 편안한 하루 되세요',
    noticeTitle: '구매 전에 확인해 주세요',
    notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 처음 세탁할 때는 단독 세탁을 권해 드려요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  bags: {
    chips: ['#데일리백', '#출근가방', '#선물추천'],
    pointsTitle: '들수록 마음에 드는 이유',
    points: [
      { title: '넉넉한 수납', desc: '들어가는 물건을\n적어 주세요' },
      { title: '가벼운 무게', desc: '무게와 소재를\n적어 주세요' },
      { title: '튼튼한 마감', desc: '손잡이와 지퍼를\n소개해 주세요' },
    ],
    checksTitle: '이런 날에 들기 좋아요',
    checks: ['가볍게 들고 나가는 출근길', '짐이 많은 주말 나들이', '옷차림에 포인트를 주는 날'],
    story: '이 가방을 만든 이유를\n두세 줄로 들려주세요.\n어디에 들고 가면 좋은지도요.',
    quote: '"매일 들어도\n질리지 않는 가방"',
    caption: '사진 아래에 색상이나 수납 예시를 적어 주세요.',
    zoomTitle: '마감을\n가까이에서',
    zoomDesc: '가죽 결, 바느질처럼\n자세히 보여 줄 곳을\n적어 주세요.',
    note: '제가 매일\n드는 가방이에요',
    bubble: '이만큼\n들어가요',
    statement: '어디든 함께\n가볍게',
    closing: 'DAILY BAG',
    closingSub: '가벼운 발걸음을 응원해요',
    noticeTitle: '구매 전에 확인해 주세요',
    notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 소재 특성으로 작은 주름이 있을 수 있어요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  living: {
    chips: ['#살림템', '#정리정돈', '#집꾸미기'],
    pointsTitle: '매일 쓰기 좋은 이유',
    points: [
      { title: '간편한 사용', desc: '쓰는 방법을\n적어 주세요' },
      { title: '깔끔한 정리', desc: '정리되는 모습을\n적어 주세요' },
      { title: '튼튼한 소재', desc: '소재와 두께를\n적어 주세요' },
    ],
    checksTitle: '이런 곳에 두면 좋아요',
    checks: ['자주 쓰는 물건이 많은 주방', '좁아서 정리가 필요한 공간', '손이 자주 가는 거실 선반'],
    story: '이 물건을 쓰는 하루를\n두세 줄로 들려주세요.\n집이 어떻게 달라지는지도요.',
    quote: '"작은 물건 하나로\n집이 달라졌어요."',
    caption: '사진 아래에 크기나 놓은 장소를 적어 주세요.',
    zoomTitle: '손에 쥐어 보면\n알아요',
    zoomDesc: '손잡이, 뚜껑처럼\n직접 써 보면 좋은 점을\n적어 주세요.',
    note: '주방이 한결\n깔끔해졌어요',
    bubble: '이렇게\n써 보세요',
    statement: '매일 쓰는 물건은\n편해야 하니까',
    closing: 'HOME LIVING',
    closingSub: '집에서 보내는 시간을 더 좋게',
    noticeTitle: '구매 전에 확인해 주세요',
    notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 놓을 자리의 크기를 먼저 재 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
}

// ── 짜임새 6가지 (v = 카테고리마다 다른 구도 0·1·2) ──

/** 1. 밝은 미니멀 — 흰 바탕·넓은 여백·Cinzel 작은 제목 + 프리텐다드 */
function minimal(c, h, th, v) {
  const intro = [eyebrow(h.eyebrow, th.accent), 18, head(h.title, 42, th.ink, { w: 660 }), 22, rule(th.accent), 22, body(h.lead, th.sub, { w: 620 })]
  const hero = v === 0
    ? [full(0, 'product'), sec(WHITE, intro, { top: 80, bottom: 40 })]
    : v === 1
      ? [sec(th.soft, [...intro, 40, P(0, 560, { w: 560, sample: 'product', shadow: 18 })], { top: 90, bottom: 90 })]
      : [split(WHITE, col => [
        eyebrow(h.eyebrow, th.accent, colText(col)), 16, head(h.title, 34, th.ink, colText(col)), 20,
        body(h.lead, th.sub, colText(col, { lh: 1.7 })),
      ], { slot: 0, sample: 'product', w: 380, h: 460 }, { top: 80, bottom: 80 })]
  return [
    ...hero,
    sec(WHITE, [chips(c.chips, { fill: th.soft, ink: th.ink })], { top: v === 0 ? 0 : 60, bottom: 72 }),
    sec(th.soft, [Prow([{ slot: 1, sample: 'scene' }, { slot: 2, sample: v === 2 ? 'hand' : 'detail' }], 420, { tw: 700 }), 20, small(c.caption, th.muted)], { top: 60, bottom: 60 }),
    sec(WHITE, [head(c.pointsTitle, 32, th.ink), 30, pointLines(c.points, th, { num: n => `0${n}` })], { bottom: 60 }),
    full(3, 'scene'),
    sec(WHITE, [zoom(4, v === 2 ? 'hand' : 'detail', c.zoomTitle, c.zoomDesc, th, { side: v === 1 ? 'right' : 'left' })]),
    sec(th.soft, [pin(() => [art(PROP[h.cat], 610, 150, 130, 110, '소품')]), serifHead(c.quote, 30, th.ink, { w: 640, lh: 1.5 })], { top: 90, bottom: 90 }),
    noticeSec(c, th, WHITE, { boxBg: th.soft }),
  ]
}

/** 2. 따뜻한 감성 — 베이지 배경 그림·고운바탕 제목·둥근 사진·손글씨 메모 */
function warm(c, h, th, v, a) {
  const heroText = col => [
    eyebrow(h.eyebrow, th.accent, colText(col)), 16, serifHead(h.title, 36, th.ink, colText(col)), 20,
    body(h.lead, th.sub, colText(col)),
  ]
  const hero = v === 2
    ? [sec(th.soft, [eyebrow(h.eyebrow, th.accent), 18, serifHead(h.title, 40, th.ink, { w: 640 }), 22, ornament(th.accent), 22, body(h.lead, th.sub, { w: 600 })], { top: 110, bottom: 110, bgImage: a.bg }),
      full(0, 'product')]
    : [split(th.soft, heroText, { slot: 0, sample: 'product', w: 340, h: 440, radius: 170, side: v === 1 ? 'left' : 'right' }, { top: 90, bottom: 90, bgImage: a.bg })]
  return [
    ...hero,
    sec(WHITE, [serifHead(c.quote, 30, th.ink, { w: 640, lh: 1.55 }), 20, small(h.quoteBy, th.muted)], { top: 90, bottom: 90 }),
    full(1, 'scene'),
    sec(th.soft, [serifHead(c.pointsTitle, 32, th.ink), 36, pointCards(c.points, th, { num: n => `${n}`, numFont: F.hand, titleFont: F.serif })]),
    sec(WHITE, [Prow([{ slot: 2, sample: a.close }, { slot: 3, sample: 'product' }], 400, { radius: 24 }), 20, small(c.caption, th.muted)], { top: 60, bottom: 60 }),
    sec(th.soft, [note(c.note, th)], { top: 60, bottom: 70 }),
    sec(WHITE, [serifHead(c.checksTitle, 32, th.ink), 36, checks(c.checks, th)]),
    full(4, 'scene'),
    sec(th.soft, [eyebrow(c.closing, th.accent), 14, serifHead(c.closingSub, 30, th.ink)], { top: 90, bottom: 90, bgImage: a.bg }),
    noticeSec(c, th, WHITE, { serif: true, boxBg: th.soft }),
  ]
}

/** 3. 선명한 강조 — 진한 한 색 바탕·가석원 큰 제목·톱니 배지·흰 테두리 사진 */
function vivid(c, h, th, v) {
  const badge = pin(gid => {
    const g = gid()
    const bx = v === 1 ? 44 : 596
    return [
      { type: 'shape', group: g, shape: 'burst', x: bx, y: 40, w: 140, h: 140, fill: th.pop },
      { type: 'text', group: g, x: bx + 15, y: 40 + Math.round((140 - textH(h.badge, 24, 1.2)) / 2), w: 110, text: h.badge, fontSize: 24, fontWeight: 400, color: th.onPop, fontFamily: F.display, align: 'center', lineHeight: 1.2 },
    ]
  })
  const align = v === 1 ? { align: 'left', x: 60, w: 520 } : { w: 680 }
  const shift = v === 1 ? {} : { x: cx(680) }
  return [
    sec(th.accent, [badge, pin(() => [art(A.sparkle, v === 1 ? 620 : 60, 50, 100, 94, '반짝이 별')]), eyebrow(h.eyebrow, th.onAccent, { ...align, ...shift, w: align.w }), 20, display(h.title, 58, th.onAccent, { ...align, ...shift, w: align.w, lh: 1.18 }), 24,
      body(h.lead, th.onAccent, { ...align, ...shift, w: align.w })], { top: v === 1 ? 190 : 200, bottom: 90 }),
    sec(th.soft, [P(0, 560, { w: 560, sample: 'product', border: 12, borderColor: WHITE, shadow: 30 })], { top: 70, bottom: 70 }),
    sec(th.dark, [display(c.pointsTitle, 34, WHITE), 36, pointCards(c.points, { ...th, ink: WHITE, sub: '#c9ced6' }, { cardBg: '#23262c', num: n => `0${n}`, numFont: F.display, numColor: th.pop })]),
    full(1, 'scene'),
    sec(WHITE, [Prow([{ slot: 2, sample: th.close }, { slot: 3, sample: 'product' }, { slot: 4, sample: th.close }], 260, { tw: 700, gap: 14, radius: 12 }), 22, small(c.caption, th.muted)], { top: 60, bottom: 60 }),
    sec(th.soft, [head(c.checksTitle, 32, th.ink), 36, checks(c.checks, th)]),
    sec(th.accent, [display(c.statement, 54, th.onAccent, { w: 680, lh: 1.2 }), 30, chips(c.chips, { fill: th.onAccent, ink: th.accent, font: F.sans })], { top: 90, bottom: 90 }),
    noticeSec(c, th, WHITE, { boxBg: th.soft }),
  ]
}

/** 4. 고급 모노톤 — 짙은 바탕(또는 밝은 회색)·Cinzel·가는 금색 선·얇은 테두리 사진 */
function mono(c, h, th, v, a) {
  const lite = v === 2
  const ink = lite ? th.ink : WHITE
  const sub = lite ? th.sub : '#b9bec7'
  const T2 = { ...th, ink, sub, line: lite ? th.line : '#3a3f47' }
  const base = lite ? th.soft : th.dark
  return [
    sec(base, [...(a.prop ? [pin(() => [art(a.prop, 620, 330, 140, 140, '소품')])] : []), eyebrow(h.eyebrow, th.accent, { letterSpacing: 0.4 }), 22, head(h.title, 40, ink, { w: 640, lh: 1.35 }), 26, rule(th.accent, 64, 1), 26, body(h.lead, sub, { w: 600 })],
      { top: 130, bottom: 120, ...(a.bg ? { bgImage: a.bg } : {}) }),
    full(0, 'product', base),
    sec(base, [eyebrow('DETAILS', th.accent, { letterSpacing: 0.4 }), 30, Prow([{ slot: 1, sample: a.close }, { slot: 2, sample: 'product' }], 330, { tw: 680, gap: 20, border: 2, borderColor: th.accent })], { top: 80, bottom: 80 }),
    sec(base, [ornament(th.accent), 30, serifHead(c.story, 24, ink, { w: 600, lh: 1.8 })], { top: 80, bottom: 90 }),
    full(3, 'scene', base),
    sec(base, [eyebrow('POINTS', th.accent, { letterSpacing: 0.4 }), 16, head(c.pointsTitle, 30, ink), 30, pointLines(c.points, T2, { numColor: th.accent })], { top: 80, bottom: 60 }),
    sec(base, [zoom(4, a.close, c.zoomTitle, c.zoomDesc, T2, { side: v === 1 ? 'right' : 'left', ring: th.accent })], { top: 90, bottom: 90 }),
    sec(lite ? WHITE : '#22252b', [T(c.noticeTitle, 26, 700, ink, { font: F.sans, lh: 1.3 }), 26, T(c.notices, 16, 400, sub, { font: F.sans, w: 620, align: 'left', lh: 1.8 }), 36,
      boxes2([SHIP, RETURN], T2, { boxBg: lite ? th.soft : '#2c3037' })]),
    sec(base, [eyebrow(c.closing, th.accent, { letterSpacing: 0.4 }), 14, small(c.closingSub, sub)], { top: 100, bottom: 100, ...(a.bg ? { bgImage: a.bg } : {}) }),
  ]
}

/** 5. 내추럴 — 연한 초록·나뭇잎 그림·둥근 모서리·손글씨 한 줄 */
function natural(c, h, th, v, a) {
  const leaf = pin(() => [art(A.leaf, v === 1 ? 20 : 620, 24, 130, 173, '나뭇잎 가지')])
  return [
    sec(th.soft, [leaf, hand(h.handLine, 34, th.accent), 10, head(h.title, 40, th.ink, { w: 620 }), 20, body(h.lead, th.sub, { w: 600 })], { top: 100, bottom: 70 }),
    sec(th.soft, [P(0, 600, { w: 640, sample: 'product', radius: 28 })], { top: 0, bottom: 80 }),
    sec(WHITE, [chips(c.chips, { fill: WHITE, ink: th.accent, stroke: th.accent })], { top: 60, bottom: 60 }),
    sec(th.soft, [head(c.pointsTitle, 32, th.ink), 36, pointCards(c.points, th, { num: n => `0${n}`, radius: 28 })]),
    sec(WHITE, [Prow([{ slot: 1, sample: 'scene' }, { slot: 2, sample: a.close }], 440, { radius: 28 }), 20, small(c.caption, th.muted)], { top: 60, bottom: 60 }),
    sec(WHITE, [note(c.note, th, { paper: '#f6f8f1', rotation: 2 })], { top: 20, bottom: 70 }),
    full(3, 'scene'),
    sec(th.soft, [head(c.checksTitle, 32, th.ink), 36, checks(c.checks, th)]),
    sec(th.soft, [hand(c.closingSub, 40, th.ink, { w: 640 })], { top: 110, bottom: 110, bgImage: a.bg }),
    noticeSec(c, th, WHITE, { boxBg: th.soft }),
  ]
}

/** 6. 트렌디 — 두 가지 선명한 색·기울인 사진·별 스티커·테이프·말풍선·사진 네 칸 */
function trendy(c, h, th, v) {
  const tilt = v === 1 ? -4 : 4
  return [
    split(th.soft, col => [
      hand(h.handLine, 32, th.accent, colText(col)), 8, display(h.title, 46, th.ink, colText(col, { lh: 1.18 })), 20, body(h.lead, th.sub, colText(col)),
    ], { slot: 0, sample: 'product', w: 330, h: 400, border: 12, borderColor: WHITE, shadow: 26, rotation: tilt, side: v === 1 ? 'left' : 'right' }, {
      top: 100, bottom: 100,
      deco: gid => {
        const g = gid()
        const sx = v === 1 ? 630 : 40
        return [
          { type: 'shape', group: g, shape: 'star', x: sx, y: 20, w: 110, h: 105, fill: th.pop },
          { type: 'text', group: g, x: sx + 18, y: 20 + Math.round((105 - textH('HOT', 22, 1.2)) / 2) + 4, w: 74, text: 'HOT', fontSize: 22, fontWeight: 400, color: th.onPop, fontFamily: F.display, align: 'center', lineHeight: 1.2 },
        ]
      },
    }),
    sec(th.ink, [chips(c.chips, { fill: th.pop, ink: th.onPop, font: F.display, size: 18 })], { top: 40, bottom: 40 }),
    full(1, 'scene'),
    sec(WHITE, [display(h.gridTitle, 36, th.ink), 30,
      Prow([{ slot: 2, sample: th.close }, { slot: 3, sample: 'product' }], 330, { tw: 680, gap: 20, radius: 16 }), 20,
      Prow([{ slot: 4, sample: 'scene' }, { slot: 5, sample: th.close }], 330, { tw: 680, gap: 20, radius: 16 })], { top: 72, bottom: 72 }),
    sec(th.soft, [display(c.pointsTitle, 32, th.ink), 36, pointCards(c.points, th, { cardBg: WHITE, num: n => `#${n}`, numFont: F.display, numColor: th.accent, radius: 24 })]),
    sec(WHITE, [pin(() => [art(A.sparkle, 620, 24, 96, 90, '반짝이 별')]), bubble(c.bubble, th.pop, th.onPop, { w: 400 })], { top: 70, bottom: 60 }),
    sec(th.soft, [display(c.checksTitle, 30, th.ink), 36, checks(c.checks, th)]),
    noticeSec(c, th, WHITE, { boxBg: th.soft }),
  ]
}

// ── 18개 ──
const APPAREL_BG = 'backgrounds/euchs-bg_apparel_beige-linen_01.jpg'
const LOOKS = [
  // 의류
  ['apparel', 'apparel-minimal', '미니멀 화이트', 'minimal', 0, 'clean', 'mono',
    theme({ accent: '#1f2328', soft: '#f4f4f2', line: '#e2e3e5' }), {},
    { eyebrow: 'NEW ARRIVAL', title: '매일 손이 가는\n기본 니트', lead: '부드러운 촉감과 깔끔한 핏을\n한두 줄로 소개해 주세요.' }],
  ['apparel', 'apparel-warm', '따뜻한 감성', 'warm', 0, 'soft', 'warm',
    theme({ accent: '#a9805b', soft: '#f6f0e8', ink: '#2b2118', sub: '#5c5148', muted: '#8a7f75', line: '#e2d9cd' }), { bg: APPAREL_BG, close: 'detail' },
    { eyebrow: 'COZY DAYS', title: '포근하게\n감싸는 옷', lead: '어떤 날 입으면\n좋은지 적어 주세요.', quoteBy: '— 먼저 입어 본 고객의 한마디' }],
  ['apparel', 'apparel-vivid', '선명한 강조', 'vivid', 0, 'bold', 'cool',
    theme({ accent: '#2448d8', soft: '#eef2ff', dark: '#10162e', pop: '#ffd23f', onPop: '#10162e', close: 'detail' }), {},
    { eyebrow: 'SEASON PICK', title: '이번 시즌\n필수 아이템', lead: '가장 자랑하고 싶은 점을\n한 줄로 적어 주세요.', badge: '신상\n입고' }],
  ['apparel', 'apparel-mono', '모노 프리미엄', 'mono', 0, 'premium', 'mono',
    theme({ accent: '#c9a86a', dark: '#16181c', soft: '#f1efec' }), { bg: 'backgrounds/euchs-bg_common_wide-navy-charcoal_01.jpg', close: 'detail' },
    { eyebrow: 'CLASSIC LINE', title: '단정한 실루엣,\n오래 입는 옷', lead: '소재와 만듦새를\n차분하게 소개해 주세요.' }],
  ['apparel', 'apparel-natural', '내추럴 데일리', 'natural', 0, 'friendly', 'green',
    theme({ accent: '#5d7a4a', soft: '#f1f5ec', line: '#dbe4d2' }), { bg: 'backgrounds/euchs-bg_health_botanical-shadow_01.jpg', close: 'detail' },
    { handLine: '오늘의 추천', title: '가볍게 걸치는\n내추럴 무드', lead: '어떤 날 입으면 좋은지\n한두 줄로 적어 주세요.' }],
  ['apparel', 'apparel-trendy', '트렌디 스티커', 'trendy', 0, 'bold', 'pink',
    theme({ accent: '#e0457b', soft: '#fff0f5', ink: '#1d1320', pop: '#ffe14d', onPop: '#1d1320', close: 'detail' }), {},
    { handLine: '요즘 이거 입어요', title: '딱 요즘\n입기 좋은 옷', lead: '컬러와 핏의 매력을\n한 줄로 적어 주세요.', gridTitle: '컬러별로 골라 보세요' }],
  // 잡화·가방
  ['bags', 'bags-minimal', '미니멀 화이트', 'minimal', 1, 'clean', 'warm',
    theme({ accent: '#8a6a4f', soft: '#f7f4f0', line: '#e6e0d8' }), {},
    { eyebrow: 'DAILY BAG', title: '가볍게 들고\n어디든 함께', lead: '언제 들기 좋은 가방인지\n한두 줄로 소개해 주세요.' }],
  ['bags', 'bags-warm', '따뜻한 감성', 'warm', 1, 'soft', 'warm',
    theme({ accent: '#b5651d', soft: '#faf3ea', ink: '#3a2413', sub: '#6b5443', muted: '#8f7b6b', line: '#eadccd' }), { bg: 'backgrounds/euchs-bg_bag_camel-shadow_01.jpg', close: 'detail' },
    { eyebrow: 'MY FAVORITE', title: '손에 익는\n부드러운 가죽', lead: '가방을 들었을 때 느낌을\n적어 주세요.', quoteBy: '— 매일 들고 다니는 분의 이야기' }],
  ['bags', 'bags-vivid', '선명한 강조', 'vivid', 1, 'bold', 'warm',
    theme({ accent: '#e4572e', soft: '#fff3ee', dark: '#23140f', pop: '#1f2328', onPop: WHITE, close: 'detail' }), {},
    { eyebrow: 'HOT ITEM', title: '들기만 해도\n포인트 완성', lead: '가장 자랑하고 싶은 점을\n한 줄로 적어 주세요.', badge: '인기\n색상' }],
  ['bags', 'bags-mono', '모노 프리미엄', 'mono', 1, 'premium', 'mono',
    theme({ accent: '#d6c3a1', dark: '#101010', soft: '#f1efec' }), { bg: null, close: 'detail', prop: A.leather },
    { eyebrow: 'SIGNATURE', title: '오래 들수록\n멋이 나는 가방', lead: '소재와 바느질을\n차분하게 소개해 주세요.' }],
  ['bags', 'bags-natural', '내추럴 데일리', 'natural', 1, 'friendly', 'green',
    theme({ accent: '#6b7a3a', soft: '#f3f4ec', line: '#dfe2cf' }), { bg: 'backgrounds/euchs-bg_bag_travertine_01.jpg', close: 'detail' },
    { handLine: '주말엔 이 가방', title: '가볍게 떠나는\n주말 나들이', lead: '어디에 들고 가면 좋은지\n한두 줄로 적어 주세요.' }],
  ['bags', 'bags-trendy', '트렌디 스티커', 'trendy', 1, 'bold', 'cool',
    theme({ accent: '#1c64f2', soft: '#fffbe0', ink: '#111827', pop: '#1c64f2', onPop: WHITE, close: 'detail' }), {},
    { handLine: '요즘 제일 많이 드는', title: '들기 좋은\n미니 백', lead: '크기와 컬러의 매력을\n한 줄로 적어 주세요.', gridTitle: '이렇게 들어 보세요' }],
  // 생활용품
  ['living', 'living-minimal', '미니멀 화이트', 'minimal', 2, 'clean', 'cool',
    theme({ accent: '#3b6e8f', soft: '#f2f5f7', line: '#dde4ea' }), {},
    { eyebrow: 'HOME ESSENTIAL', title: '매일 쓰는\n작은 물건', lead: '어디에 두고 쓰면 좋은지\n적어 주세요.' }],
  ['living', 'living-warm', '따뜻한 감성', 'warm', 2, 'soft', 'warm',
    theme({ accent: '#9c6b4a', soft: '#f7f1ea', ink: '#2e211a', sub: '#5f4d42', muted: '#8d7b70', line: '#e7dbcf' }), { bg: 'backgrounds/euchs-bg_living_beige-plaster_01.jpg', close: 'hand' },
    { eyebrow: 'SLOW MORNING', title: '천천히 즐기는\n우리 집 아침', lead: '이 물건과 함께하는 하루를\n한두 줄로 소개해 주세요.', quoteBy: '— 먼저 써 본 고객의 한마디' }],
  ['living', 'living-vivid', '선명한 강조', 'vivid', 2, 'bold', 'green',
    theme({ accent: '#0f8a5f', soft: '#ecf8f2', dark: '#0d231b', pop: '#ffcf33', onPop: '#0d231b', close: 'hand' }), {},
    { eyebrow: 'LIVING PICK', title: '살림이 쉬워지는\n똑똑한 선택', lead: '가장 편해진 점을\n한 줄로 적어 주세요.', badge: '살림\n추천' }],
  ['living', 'living-mono', '모노 프리미엄', 'mono', 2, 'premium', 'mono',
    theme({ accent: '#8c7a62', dark: '#1b1b1b', soft: '#efedea', ink: '#1f1d1a', sub: '#5b5750', line: '#dcd8d2' }), { bg: 'backgrounds/euchs-bg_living_greige-arch_01.jpg', close: 'hand' },
    { eyebrow: 'QUIET LIVING', title: '조용하게 빛나는\n생활의 도구', lead: '소재와 쓰임새를\n차분하게 소개해 주세요.' }],
  ['living', 'living-natural', '내추럴 데일리', 'natural', 2, 'friendly', 'green',
    theme({ accent: '#4f7a5a', soft: '#eef4ef', line: '#d6e3d9' }), { bg: 'backgrounds/euchs-bg_living_oak-minimal_01.jpg', close: 'hand' },
    { handLine: '초록이 있는 집', title: '자연스럽게\n어울리는 살림', lead: '어떤 공간에 두면 좋은지\n한두 줄로 적어 주세요.' }],
  ['living', 'living-trendy', '트렌디 스티커', 'trendy', 2, 'bold', 'pink',
    theme({ accent: '#ff6b4a', soft: '#eafaf6', ink: '#1a2b2a', pop: '#ff6b4a', onPop: WHITE, close: 'hand' }), {},
    { handLine: '집꾸미기 필수템', title: '보는 재미\n쓰는 재미', lead: '컬러와 쓰임새의 매력을\n한 줄로 적어 주세요.', gridTitle: '이렇게 써 보세요' }],
]

const BUILD = { minimal, warm, vivid, mono, natural, trendy }
const DESC = {
  minimal: '흰 바탕 · 넓은 여백 · 사진 두 장 · 포인트 줄 · 확대 사진 · 한 줄 인용',
  warm: '베이지 배경 그림 · 고운바탕 제목 · 둥근 사진 · 손글씨 메모 · 체크',
  vivid: '진한 색 바탕 · 가석원 큰 제목 · 톱니 배지 · 흰 테두리 사진 · 사진 세 장',
  mono: '짙은 바탕 · Cinzel · 가는 금색 선 · 테두리 사진 · 이야기 · 확대 사진',
  natural: '연한 초록 · 나뭇잎 그림 · 둥근 사진 · 키워드 · 손글씨 메모',
  trendy: '두 가지 선명한 색 · 기울인 사진 · 별 스티커 · 사진 네 칸 · 말풍선',
}

// 첫 구간 = 큰 제목 첫 화면 (studioTemplateHeroes — 구간 수·key·카테고리 그대로)
export const LOOK_TEMPLATES = LOOKS.map(([category, key, name, kind, v, mood, color, th, a, h]) => {
  const label = `${{ apparel: '의류', bags: '잡화·가방', living: '생활용품' }[category]} · ${name}`
  return withHero({
    key, category, label, desc: DESC[kind], gap: 0, mood, color, swatch: th.accent,
    sections: BUILD[kind](COPY[category], { ...h, cat: category }, th, v, a),
  })
})
