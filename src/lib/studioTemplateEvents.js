/**
 * 안내·이벤트 템플릿 22개 (카테고리 'event') — 코드 데이터 (DOM·DB 없음, node 테스트: scripts/test-studio-template-heroes.mjs)
 *
 * ★ 모양은 studioTemplates.js 맨 위 설명과 같다 ({ key, label, desc, gap, sections } + category·mood·color·swatch·tone).
 *   첫 구간 = 780×1040(3:4) 첫 화면 — 큰 제목(높이의 30~40%) · 작은 영문 라벨 · 부제 · 배지·에셋(우리 그림) — 제품 사진 없음.
 *   그 아래 구간 = 기간·조건 줄, 순서, 혜택 카드, 확인 목록, 안내 글 — 모양은 studioTemplateSections(section — 템플릿마다 다른 모양), 사진 구간만 여기서.
 * ★ 제품 사진 자리는 0~1개 (신상·특가·1+1·사은품·선물세트·품절 임박만 1개 — 첫 화면에는 두지 않는다).
 * ★ 문구는 고객이 바꿔 쓰는 자리표시: 가게 이름 [가게 이름], 날짜 [0월 0일], 금액 [0,000]원, 비율 [00]%.
 *   인증·효능·수치처럼 사실 확인이 필요한 말은 넣지 않는다. 배치·색·문구는 이 프로젝트에서 새로 정한 것.
 */
import { TPL_BLOCKS } from './studioTemplateSets.js'
import { HERO_H, HERO_TITLE_TOP, heroTitleSize } from './studioTemplateHeroes.js'
import { section, heading, lowerTheme } from './studioTemplateSections.js'

const { W, WHITE, textH, T, sec } = TPL_BLOCKS
const H = HERO_H
const LS = -0.02
const HEAVY = { pretendard: 900, 'noto-sans-kr': 900, 'noto-serif-kr': 900, 'gowun-batang': 700, 'nanum-myeongjo': 800 }
const LH = { 'gowun-batang': 1.14, 'noto-serif-kr': 1.12 }
const cx = w => Math.round((W - w) / 2)

const A = {
  giftbox: 'objects/euchs-obj_common_giftbox_01.png',       // 913×906
  bag: 'objects/euchs-obj_common_shoppingbag_01.png',       // 727×1200
  check: 'objects/euchs-obj_common_check-badge_01.png',     // 1065×1121
  ribbon: 'objects/euchs-obj_common_ribbon-wave_01.png',    // 1200×556
  sparkle: 'objects/euchs-obj_common_sparkle-stars_01.png', // 940×881
  confetti: 'decor/confetti.svg',                           // 600×300
  giftSvg: 'objects/gift-box.svg',                          // 400×400
  podium: 'objects/euchs-obj_common_podium-pastel_01.png',  // 1153×419
}
const RATIO = { [A.giftbox]: 906 / 913, [A.bag]: 1200 / 727, [A.check]: 1121 / 1065, [A.ribbon]: 556 / 1200, [A.sparkle]: 881 / 940, [A.confetti]: 300 / 600, [A.giftSvg]: 1, [A.podium]: 419 / 1153 }
const art = (file, x, y, w, label) => ({ type: 'asset', asset: file, x, y, w, h: Math.round(w * RATIO[file]), fit: 'contain', label })

// ── 첫 화면 조각 ──
const LABEL_H = textH('A', 18, 1.3)
const label = (text, color, y, o = {}) => ({ type: 'text', x: o.x ?? 50, y, w: o.w ?? 680, text, fontSize: 18, fontWeight: 700, color, fontFamily: 'cinzel', align: o.align ?? 'center', lineHeight: 1.3, letterSpacing: 0.3 })
function title(s, y, o = {}) {
  const font = s.font
  const lh = o.lh ?? LH[font] ?? 1.06
  const w = o.w ?? 680
  const size = heroTitleSize(s.title, font, w, o.target ?? 0.34, lh)
  return {
    part: { type: 'text', x: o.x ?? cx(w), y, w, text: s.title, fontSize: size, fontWeight: HEAVY[font] ?? 400, color: s.ink, fontFamily: font, align: o.align ?? 'center', lineHeight: lh, letterSpacing: LS, ...(s.titleStroke ? { strokeWidth: 3, strokeColor: s.titleStroke } : {}) },
    h: textH(s.title, size, lh),
  }
}
function subText(text, color, y, o = {}) {
  const size = o.size ?? 23
  return { part: { type: 'text', x: o.x ?? 70, y, w: o.w ?? 640, text, fontSize: size, fontWeight: o.weight ?? 400, color, fontFamily: 'pretendard', align: o.align ?? 'center', lineHeight: 1.5 }, h: textH(text, size, 1.5) }
}
function badge(b, x, y, d) {
  if (!b) return []
  const lines = b.text.split('\n')
  const size = Math.min(Math.floor((d * 0.62) / Math.max(...lines.map(l => [...l].length * (/[가-힣]/.test(l) ? 1 : 0.7)))), Math.floor((d * 0.5) / (lines.length * 1.08)))
  const th = textH(b.text, size, 1.08)
  return [
    { type: 'shape', group: 'eb', shape: b.shape ?? 'burst', x, y, w: d, h: d, fill: b.fill },
    { type: 'text', group: 'eb', x: x + 6, y: y + Math.round((d - th) / 2), w: d - 12, text: b.text, fontSize: size, fontWeight: 400, color: b.ink, fontFamily: 'black-han-sans', align: 'center', lineHeight: 1.08 },
  ]
}

/** 줄 목록 카드 (첫 화면 — 기간·대상 같은 두세 줄) */
function heroRows(rows, s, y) {
  const rowH = 58
  const h = rows.length * rowH + 36
  const items = [{ type: 'shape', shape: 'rect', x: 90, y, w: 600, h, fill: s.card ?? WHITE, fillOpacity: s.cardOpacity ?? 1, radius: 26 }]
  rows.forEach(([k, v], i) => {
    const ty = y + 18 + i * rowH + Math.round((rowH - textH('가', 20, 1.4)) / 2)
    items.push({ type: 'text', x: 126, y: ty, w: 120, text: k, fontSize: 20, fontWeight: 800, color: s.accent, fontFamily: 'pretendard', align: 'left', lineHeight: 1.4 })
    items.push({ type: 'text', x: 256, y: ty, w: 404, text: v, fontSize: 20, fontWeight: 400, color: s.cardInk ?? '#1f2328', fontFamily: 'pretendard', align: 'left', lineHeight: 1.4 })
  })
  return { items, h }
}

// 첫 화면 구도 5가지 — 모두 { bg, bgImage?, items }
/** card: 큰 제목 → 부제 → 기간·조건 카드 → 아래 에셋·배지 */
function heroCard(s) {
  const top = 84
  const t = title(s, HERO_TITLE_TOP)
  const sub = subText(s.sub, s.subInk ?? s.ink, t.part.y + t.h + 18)
  const cy = sub.part.y + sub.h + 40
  const rows = heroRows(s.rows, s, cy)
  const low = cy + rows.h + 24
  const room = H - 40 - low
  const aw = Math.min(200, Math.round(room / (RATIO[s.asset] ?? 1)))
  return {
    items: [
      label(s.label, s.labelInk ?? s.ink, top), t.part, sub.part, ...rows.items,
      ...(s.asset && room > 90 ? [art(s.asset, W - 90 - aw, low + Math.round((room - Math.round(aw * RATIO[s.asset])) / 2), aw, s.assetLabel)] : []),
      ...(room > 110 ? badge(s.badge, 100, low + Math.round((room - 120) / 2), 120) : []),
    ],
  }
}
/** asset: 큰 제목 → 부제 → 큰 에셋 그림 (가운데 아래) + 왼쪽 아래 배지 */
function heroAsset(s) {
  const top = 84
  const t = title(s, HERO_TITLE_TOP)
  const sub = subText(s.sub, s.subInk ?? s.ink, t.part.y + t.h + 18)
  const room = H - 50 - (sub.part.y + sub.h + 30)
  const aw = Math.min(s.assetW ?? 340, Math.floor(room / RATIO[s.asset]))
  const ah = Math.round(aw * RATIO[s.asset])
  return {
    items: [
      label(s.label, s.labelInk ?? s.ink, top), t.part, sub.part,
      art(s.asset, cx(aw), H - 50 - ah, aw, s.assetLabel),
      ...badge(s.badge, 50, H - 60 - 140, 140),
    ],
  }
}
/** number: 아주 큰 숫자·영문 한두 줄(제목) → 굵은 한 줄 → 부제 → 아래 에셋 */
function heroNumber(s) {
  const top = 84
  const t = title(s, HERO_TITLE_TOP, { target: 0.36, lh: 1.0, w: 700 })
  const head = subText(s.head, s.headInk ?? s.ink, t.part.y + t.h + 20, { size: 44, weight: 800 })
  head.part.fontFamily = s.headFont ?? 'pretendard'
  head.part.fontWeight = s.headFont === 'black-han-sans' ? 400 : 800
  head.part.lineHeight = 1.25
  head.h = textH(s.head, 44, 1.25)
  const sub = subText(s.sub, s.subInk ?? s.ink, head.part.y + head.h + 16)
  const low = sub.part.y + sub.h + 24
  const room = H - 40 - low
  const aw = s.asset ? Math.min(s.assetW ?? 360, Math.floor(room / RATIO[s.asset])) : 0
  return {
    items: [
      label(s.label, s.labelInk ?? s.ink, top), t.part, head.part, sub.part,
      ...(s.asset && room > 80 ? [art(s.asset, cx(aw), low + Math.round((room - Math.round(aw * RATIO[s.asset])) / 2), aw, s.assetLabel)] : []),
    ],
  }
}
/** frame: 두 줄 테두리 안에 가운데 제목 + 장식 선 + 부제 + 가게 이름 자리 */
function heroFrame(s) {
  const t = title(s, 0, { w: 620 })
  const sub = subText(s.sub, s.subInk ?? s.ink, 0, { w: 580, x: cx(580) })
  const block = LABEL_H + 36 + t.h + 36 + 24 + 36 + sub.h
  let y = Math.round((H - block) / 2) - 20
  const items = [
    { type: 'shape', shape: 'rect', x: 36, y: 36, w: W - 72, h: H - 72, fill: '', strokeWidth: 3, strokeColor: s.accent },
    { type: 'shape', shape: 'rect', x: 52, y: 52, w: W - 104, h: H - 104, fill: '', strokeWidth: 1, strokeColor: s.accent },
    label(s.label, s.labelInk ?? s.accent, y),
  ]
  y += LABEL_H + 36
  t.part.y = y
  items.push(t.part)
  y += t.h + 36
  items.push(
    { type: 'line', group: 'eo', x: 250, y: y + 11, w: 120, strokeWidth: 2, color: s.accent },
    { type: 'shape', group: 'eo', shape: 'diamond', x: 382, y: y + 4, w: 16, h: 16, fill: s.accent },
    { type: 'line', group: 'eo', x: 410, y: y + 11, w: 120, strokeWidth: 2, color: s.accent },
  )
  y += 24 + 36
  sub.part.y = y
  items.push(sub.part)
  items.push({ type: 'text', x: 140, y: H - 150, w: 500, text: s.store ?? '[가게 이름]', fontSize: 20, fontWeight: 700, color: s.labelInk ?? s.accent, fontFamily: 'pretendard', align: 'center', lineHeight: 1.4, letterSpacing: 0.2 })
  if (s.asset) items.push(art(s.asset, cx(120), 92, 120, s.assetLabel))
  return { items }
}
/** ticket: 큰 제목 → 부제 → 쿠폰 모양 카드(금액·기한) → 아래 배지 */
function heroTicket(s) {
  const top = 84
  const t = title(s, HERO_TITLE_TOP, { target: 0.33 })
  const sub = subText(s.sub, s.subInk ?? s.ink, t.part.y + t.h + 16)
  const ty = sub.part.y + sub.h + 36
  const th = 230
  const amount = { type: 'text', x: 130, y: ty + 70, w: 520, text: s.amount, fontSize: 64, fontWeight: 900, color: s.accent, fontFamily: 'pretendard', align: 'center', lineHeight: 1.15 }
  const items = [
    { type: 'shape', shape: 'rect', x: 90, y: ty, w: 600, h: th, fill: s.card ?? WHITE, radius: 24 },
    { type: 'shape', shape: 'ellipse', x: 62, y: ty + th / 2 - 28, w: 56, h: 56, fill: s.bg },
    { type: 'shape', shape: 'ellipse', x: 662, y: ty + th / 2 - 28, w: 56, h: 56, fill: s.bg },
    { type: 'text', x: 130, y: ty + 28, w: 520, text: s.coupon, fontSize: 21, fontWeight: 800, color: s.cardInk ?? '#1f2328', fontFamily: 'pretendard', align: 'center', lineHeight: 1.4 },
    amount,
    { type: 'text', x: 130, y: ty + 70 + textH(s.amount, 64, 1.15) + 14, w: 520, text: s.until, fontSize: 18, fontWeight: 400, color: '#6b7280', fontFamily: 'pretendard', align: 'center', lineHeight: 1.4 },
    label(s.label, s.labelInk ?? s.ink, top), t.part, sub.part,
  ]
  const low = ty + th + 20
  const room = H - 40 - low
  if (room > 120) items.push(...badge(s.badge, s.asset ? 110 : cx(130), low + Math.round((room - 130) / 2), 130))
  if (s.asset && room > 100) {
    const aw = Math.min(170, Math.floor(room / RATIO[s.asset]))
    items.push(art(s.asset, W - 110 - aw, low + Math.round((room - Math.round(aw * RATIO[s.asset])) / 2), aw, s.assetLabel))
  }
  return { items }
}
const HEROES = { card: heroCard, asset: heroAsset, number: heroNumber, frame: heroFrame, ticket: heroTicket }

// ── 아래 구간 조각 (block = { h, make(y, gid) }) ──
const secTitle = (text, th) => heading(text, th) // 섹션 제목 = 첫 화면 제목 글꼴 (studioTemplateSections)

/** 줄 목록 (카드 안 — 항목 · 내용) — 사진 구간 안에서만 (정보 줄 구간은 섹션 모양 rows) */
function rows(list, th) {
  const rowH = 62
  const h = list.length * rowH + 32
  return {
    h,
    make: y => [
      { type: 'shape', shape: 'rect', x: 70, y, w: 640, h, fill: th.card, radius: 20, strokeWidth: 1, strokeColor: th.line },
      ...list.flatMap(([k, v], i) => {
        const ty = y + 16 + i * rowH + Math.round((rowH - textH('가', 20, 1.4)) / 2)
        return [
          { type: 'text', x: 106, y: ty, w: 150, text: k, fontSize: 20, fontWeight: 800, color: th.accent, fontFamily: 'pretendard', align: 'left', lineHeight: 1.4 },
          { type: 'text', x: 270, y: ty, w: 410, text: v, fontSize: 20, fontWeight: 400, color: th.ink, fontFamily: 'pretendard', align: 'left', lineHeight: 1.4 },
        ]
      }),
    ],
  }
}
/** 사진 자리 하나 (제품 사진 — 0~1개) */
const photo = h => ({ h, make: y => [{ type: 'image', slot: 0, sample: 'product', x: 110, y, w: 560, h, radius: 24, shadow: 20 }] })

// ── 22개 ──
const theme = (accent, soft, o = {}) => ({ accent, soft, onAccent: WHITE, ink: '#1f2328', sub: '#4b5563', line: '#e3e5e8', card: WHITE, ...o })
const NOTE = '· 이벤트 내용은 사정에 따라 바뀔 수 있어요.\n· 궁금한 점은 문의를 남겨 주시면 빠르게 답해 드려요.'
const B = (text, fill, ink, shape) => ({ text, fill, ink, ...(shape ? { shape } : {}) })

const LIST = [
  {
    key: 'event-review', name: '리뷰 이벤트', mood: 'friendly', tone: 'yellow', th: theme('#b45309', '#fff8db'),
    hero: { comp: 'card', bg: '#ffe14d', font: 'black-han-sans', ink: '#2a2000', accent: '#b45309', title: '리뷰 쓰고\n선물\n받아 가세요', sub: '[가게 이름] 고객님께 드리는 감사 선물', label: 'REVIEW EVENT', rows: [['기간', '[0월 0일] ~ [0월 0일]'], ['대상', '상품을 받은 모든 고객님'], ['선물', '[선물 이름]']], asset: A.giftbox, assetLabel: '선물상자', badge: B('EVENT', '#2a2000', '#ffe14d') },
    body: (th, sv) => [
      section('steps', sv.steps, { title: '참여 방법', items: ['상품을 받고 사용해 보세요', '리뷰에 솔직한 후기를 남겨 주세요', '당첨 소식은 [0월 0일]에 알려 드려요'].map(title => ({ title })) }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 한 분당 한 번만 참여할 수 있어요.\n· 당첨 안내는 주문한 연락처로 드려요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-photo-review', name: '포토리뷰 적립금', mood: 'friendly', tone: 'pink', th: theme('#d6336c', '#fff0f5'),
    hero: { comp: 'ticket', bg: '#ffc9d9', font: 'pretendard', ink: '#4a0f24', accent: '#d6336c', title: '사진 리뷰\n남기면\n적립금', sub: '사진 한 장이면 충분해요', label: 'PHOTO REVIEW', coupon: '포토 리뷰 적립금', amount: '[0,000]원', until: '[0월 0일]까지 남긴 리뷰', badge: B('사진\n한 장', '#d6336c', WHITE), asset: A.sparkle, assetLabel: '반짝이 별' },
    body: (th, sv) => [
      section('steps', sv.steps, { title: '이렇게 남겨 주세요', items: ['상품이 잘 보이게 사진을 찍어요', '사진과 함께 후기를 남겨요', '적립금은 [0]일 안에 들어가요'].map(title => ({ title })) }, th),
      section('rows', sv.rows, { title: '적립 기준', rows: [['글 리뷰', '[000]원'], ['사진 리뷰', '[0,000]원'], ['베스트 리뷰', '[0,000]원 더']] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 상품과 관계없는 사진은 적립되지 않아요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-shipping', name: '배송 안내', mood: 'clean', tone: 'blue', th: theme('#1c64f2', '#eef4ff'),
    hero: { comp: 'frame', bg: '#d7ecff', bgImage: 'backgrounds/euchs-bg_common_wide-free-shipping_01.jpg', font: 'pretendard', ink: '#0b2a5b', accent: '#1c64f2', title: '빠르고\n안전하게\n보내 드려요', sub: '[가게 이름]의 배송 안내예요', label: 'SHIPPING INFO' },
    body: (th, sv) => [
      section('rows', sv.rows, { title: '배송 한눈에 보기', rows: [['출고', '[오후 0시] 전 주문은 오늘 출발'], ['택배사', '[택배사 이름]'], ['배송비', '[0,000]원 · [00,000]원 이상 무료'], ['묶음 배송', '같은 날 주문은 한 번에 보내요']] }, th),
      section('steps', sv.steps, { title: '배송 순서', items: ['주문을 확인해요', '꼼꼼히 포장해요', '택배사에 맡겨요', '문 앞까지 도착해요'].map(title => ({ title })) }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 주말·공휴일에는 출고하지 않아요.\n· 제주·도서산간 지역은 배송비가 더 들 수 있어요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-holiday-cutoff', name: '명절 배송 마감', mood: 'premium', tone: 'beige', th: theme('#9a3412', '#fbf3e6'),
    hero: { comp: 'card', bg: '#f6ecdc', bgImage: 'backgrounds/euchs-bg_common_wide-korean-holiday_01.jpg', font: 'noto-serif-kr', ink: '#3b1d0e', accent: '#9a3412', title: '명절 전\n배송은\n여기까지', sub: '연휴 전에 받으시려면 서둘러 주세요', label: 'HOLIDAY NOTICE', rows: [['주문 마감', '[0월 0일] [오후 0시]'], ['출고 재개', '[0월 0일]부터'], ['문의 답변', '[0월 0일]부터 차례로']], asset: A.giftSvg, assetLabel: '선물 상자', badge: B('마감\n임박', '#9a3412', WHITE) },
    body: (th, sv) => [
      section('rows', sv.rows, { title: '연휴 일정', rows: [['마지막 출고', '[0월 0일]'], ['휴무', '[0월 0일] ~ [0월 0일]'], ['출고 재개', '[0월 0일]']] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 연휴에는 택배사 사정으로 늦어질 수 있어요.\n· 마감 뒤 주문은 연휴가 끝나고 차례로 보내요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-dayoff', name: '휴무 안내', mood: 'soft', tone: 'blue', th: theme('#3b6e8f', '#eef4f8'),
    hero: { comp: 'frame', bg: '#dcebf5', bgImage: 'backgrounds/euchs-bg_common_wide-winter_01.jpg', font: 'gowun-batang', ink: '#1f3446', accent: '#3b6e8f', title: '잠시\n쉬어\n갑니다', sub: '휴무 동안 받은 주문은 쉬고 나서 차례로 보내요', label: 'HOLIDAY', asset: A.sparkle, assetLabel: '반짝이 별' },
    body: (th, sv) => [
      section('rows', sv.rows, { title: '휴무 일정', rows: [['휴무 기간', '[0월 0일] ~ [0월 0일]'], ['출고 재개', '[0월 0일]부터'], ['문의 답변', '[0월 0일]부터 차례로']] }, th),
      sec(th.soft, [T('기다려 주셔서 고마워요', 30, 700, th.ink, { font: 'gowun-batang', lh: 1.3 }), 20, T('[가게 이름] 드림', 20, 400, th.sub, { font: 'pretendard', lh: 1.4 })], { top: 90, bottom: 90 }),
    ],
  },
  {
    key: 'event-new-arrival', name: '신상 입고', mood: 'bold', tone: 'black', th: theme('#111111', '#f4f4f2', { onAccent: '#ffe14d' }),
    hero: { comp: 'number', bg: '#111111', font: 'black-han-sans', ink: WHITE, labelInk: '#ffe14d', label: 'NEW ARRIVAL', title: 'NEW\nIN', head: '새 상품이 들어왔어요', headInk: '#ffe14d', sub: '[0월 0일] 입고 · 수량이 넉넉하지 않아요', asset: A.sparkle, assetW: 200, assetLabel: '반짝이 별' },
    body: (th, sv) => [
      sec(WHITE, [secTitle('이번 주 새 상품', th), 36, photo(560), 22, T('[상품 이름] · [00,000]원', 22, 700, th.ink, { font: 'pretendard', lh: 1.4 })]),
      section('steps', sv.steps, { title: '입고 소식 받기', items: ['[가게 이름]을 찜해 주세요', '새 상품 소식을 가장 먼저 받아요'].map(title => ({ title })) }, th),
    ],
  },
  {
    key: 'event-today-deal', name: '오늘만 특가', mood: 'bold', tone: 'orange', th: theme('#e8590c', '#fff4e6'),
    hero: { comp: 'number', bg: '#ff7a1a', font: 'black-han-sans', ink: WHITE, titleStroke: '#b8400a', labelInk: '#fff1e0', label: 'TODAY ONLY', title: '오늘만\n특가', head: '[0월 0일] 하루만 이 가격', headInk: '#2b1200', sub: '준비한 수량이 다 나가면 끝나요', asset: A.bag, assetW: 150, assetLabel: '쇼핑백' },
    body: (th, sv) => [
      sec(WHITE, [secTitle('오늘의 특가 상품', th), 36, photo(520), 30, rows([['원래 가격', '[00,000]원'], ['오늘 가격', '[00,000]원 ([00]% 할인)']], th)]),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 특가는 [0월 0일] 밤 12시까지예요.\n· 다른 할인과 함께 쓸 수 없어요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-sale', name: '할인 기획전', mood: 'bold', tone: 'red', th: theme('#d6293e', '#fff1f2'),
    hero: { comp: 'number', bg: '#e03a2f', bgImage: 'backgrounds/euchs-bg_common_wide-sale-event_01.jpg', font: 'black-han-sans', ink: WHITE, titleStroke: '#9f1d14', labelInk: '#fff4e0', label: 'SALE EVENT', title: 'UP TO\n[00]%', head: '[기획전 이름] 기획전', headFont: 'black-han-sans', headInk: '#9f1d14', subInk: '#7a1410', sub: '[0월 0일] ~ [0월 0일]', asset: A.ribbon, assetW: 360, assetLabel: '리본' },
    body: (th, sv) => [
      section('perks', sv.perks, { title: '기획전 혜택', perks: [{ big: '[00]%', desc: '기획전 상품\n추가 할인' }, { big: '무료', desc: '[00,000]원 이상\n무료 배송' }, { big: '증정', desc: '먼저 주문한\n[00]분께 선물' }] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 할인은 기획전 기간에만 적용돼요.\n· 일부 상품은 할인에서 빠질 수 있어요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-one-plus-one', name: '1+1 행사', mood: 'friendly', tone: 'green', th: theme('#1f7a4d', '#effaf3'),
    hero: { comp: 'number', bg: '#1f4d3a', font: 'black-han-sans', ink: '#ffe14d', labelInk: '#bff0d4', label: 'ONE PLUS ONE', title: '1+1', head: '하나 사면 하나 더', headInk: WHITE, sub: '[0월 0일]까지 · 준비한 수량이 다 나가면 끝나요', asset: A.giftbox, assetW: 240, assetLabel: '선물상자' },
    body: (th, sv) => [
      sec(WHITE, [secTitle('1+1 상품', th), 36, photo(520), 30, rows([['행사 기간', '[0월 0일] ~ [0월 0일]'], ['담는 방법', '하나만 담아도 두 개가 가요']], th)]),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 같은 상품으로 하나 더 보내 드려요.\n· 교환·반품은 두 개를 함께 보내 주세요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-free-gift', name: '사은품 증정', samples: ['gift', 'health', 'food'], mood: 'soft', tone: 'purple', th: theme('#6d3fc0', '#f5f0ff'),
    hero: { comp: 'asset', bg: '#3b2a5a', font: 'pretendard', ink: WHITE, subInk: '#e2d9f5', labelInk: '#cdb8ff', title: '구매하면\n선물이\n따라가요', sub: '[00,000]원 이상 주문하신 분께 드려요', label: 'FREE GIFT', asset: A.giftbox, assetW: 330, assetLabel: '선물상자', badge: B('선물\n증정', '#ffd23f', '#3b2a5a') },
    body: (th, sv) => [
      sec(WHITE, [secTitle('함께 드리는 선물', th), 36, photo(520), 22, T('[사은품 이름]', 22, 700, th.ink, { font: 'pretendard', lh: 1.4 })]),
      section('rows', sv.rows, { title: '받는 조건', rows: [['기간', '[0월 0일] ~ [0월 0일]'], ['조건', '[00,000]원 이상 주문'], ['수량', '먼저 주문한 [000]분']] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 사은품은 고를 수 없고 바꿔 드리지 않아요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-gift-set', name: '명절 선물세트', samples: ['gift', 'food', 'health'], mood: 'premium', tone: 'red', th: theme('#8a1c2c', '#fbf1ee', { ink: '#2b1216' }),
    hero: { comp: 'asset', bg: '#5a1a2b', font: 'noto-serif-kr', ink: '#f3d9a4', subInk: '#f0e2e5', labelInk: '#f3d9a4', title: '마음을\n전하는\n선물세트', sub: '추석·설 선물, 정성껏 포장해서 보내 드려요', label: 'GIFT SET', asset: A.ribbon, assetW: 420, assetLabel: '리본' },
    body: (th, sv) => [
      sec(WHITE, [secTitle('선물세트 구성', th), 36, photo(520), 22, T('[세트 이름] · [구성품]', 22, 700, th.ink, { font: 'pretendard', lh: 1.4 })]),
      section('rows', sv.rows, { title: '주문 안내', rows: [['주문 마감', '[0월 0일]'], ['포장', '선물 포장 · 쇼핑백 함께'], ['받는 분', '다른 주소로 보낼 수 있어요']] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 명절 전에는 배송이 몰려 늦어질 수 있어요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-black-friday', name: '블랙프라이데이', mood: 'bold', tone: 'black', th: theme('#e5484d', '#f4f4f5', { ink: '#111111' }),
    hero: { comp: 'number', bg: '#0b0b0b', font: 'black-han-sans', ink: WHITE, labelInk: '#ff5a5f', label: 'BIG SALE', title: 'BLACK\nFRIDAY', head: '1년에 한 번, 가장 큰 할인', headInk: '#ff5a5f', sub: '[0월 0일] ~ [0월 0일] · 최대 [00]%', asset: A.sparkle, assetW: 180, assetLabel: '반짝이 별' },
    body: (th, sv) => [
      section('perks', sv.perks, { title: '이번에만 드리는 혜택', perks: [{ big: '[00]%', desc: '모든 상품\n추가 할인' }, { big: '무료', desc: '기간 동안\n배송비 없음' }, { big: '2배', desc: '적립금\n두 배로' }] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 할인은 기간 안에 결제한 주문에만 적용돼요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-year-end', name: '연말 감사 세일', mood: 'premium', tone: 'green', th: theme('#1f5a44', '#f1f6f3'),
    hero: { comp: 'frame', bg: '#173a2e', font: 'gowun-batang', ink: '#f3d9a4', subInk: '#dfeae4', accent: '#d9b877', title: '올해도\n정말\n고마웠어요', sub: '한 해 동안 함께해 주신 마음에 감사 세일로 답해요', label: 'THANK YOU', store: '[가게 이름] 드림', asset: A.sparkle, assetLabel: '반짝이 별' },
    body: (th, sv) => [
      section('perks', sv.perks, { title: '감사 세일 혜택', perks: [{ big: '[00]%', desc: '연말 감사\n할인' }, { big: '선물', desc: '[00,000]원 이상\n작은 선물' }, { big: '카드', desc: '손글씨\n감사 카드' }] }, th),
      sec(th.soft, [T('새해에도 잘 부탁드려요', 30, 700, th.ink, { font: 'gowun-batang', lh: 1.3 }), 18, T('[0월 0일] ~ [0월 0일]', 20, 400, th.sub, { font: 'pretendard', lh: 1.4 })], { top: 90, bottom: 90 }),
    ],
  },
  {
    key: 'event-return', name: '교환·반품 안내', mood: 'clean', tone: 'gray', th: theme('#374151', '#f3f4f6'),
    hero: { comp: 'card', bg: '#e5e7eb', font: 'pretendard', ink: '#111827', accent: '#374151', title: '교환·반품\n이렇게\n도와드려요', sub: '받은 날부터 [0]일 안에 신청해 주세요', label: 'RETURN GUIDE', rows: [['신청 기간', '받은 날부터 [0]일 안'], ['배송비', '[0,000]원 (단순 변심)'], ['보낼 곳', '[주소를 적어 주세요]']], asset: A.check, assetLabel: '체크 뱃지' },
    body: (th, sv) => [
      section('steps', sv.steps, { title: '신청 순서', items: ['주문 내역에서 교환·반품을 눌러요', '상품을 처음 포장처럼 싸요', '기사님이 가지러 가요', '확인 뒤 교환·환불해 드려요'].map(title => ({ title })) }, th),
      section('recommend', sv.recommend, { title: '이럴 때는 어려워요', lines: ['사용하거나 씻은 상품', '받은 날부터 [0]일이 지난 상품', '포장·택을 버린 상품'] }, th),
    ],
  },
  {
    key: 'event-before-order', name: '주문 전 확인사항', mood: 'friendly', tone: 'orange', th: theme('#c2410c', '#fff4ec'),
    hero: { comp: 'frame', bg: '#ffe4cc', bgImage: 'backgrounds/euchs-bg_common_wide-autumn_01.jpg', font: 'black-han-sans', ink: '#3b1a05', accent: '#c2410c', title: '주문 전에\n꼭\n확인해요', sub: '받고 나서 아쉽지 않게 한 번만 읽어 주세요', label: 'CHECK LIST', asset: A.check, assetLabel: '체크 뱃지' },
    body: (th, sv) => [
      section('recommend', sv.recommend, { title: '주문 전 확인', lines: ['사이즈와 색을 한 번 더 확인했나요?', '받는 주소와 연락처가 맞나요?', '옵션을 빠짐없이 골랐나요?'] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 재는 방법에 따라 크기가 1~3cm 다를 수 있어요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-size-exchange', name: '사이즈 교환 안내', mood: 'clean', tone: 'green', th: theme('#0f766e', '#eefaf7'),
    hero: { comp: 'card', bg: '#cdeee3', font: 'pretendard', ink: '#0b3b37', accent: '#0f766e', title: '사이즈가\n안 맞으면\n바꿔 드려요', sub: '같은 상품, 다른 사이즈로 한 번 바꿀 수 있어요', label: 'SIZE EXCHANGE', rows: [['신청 기간', '받은 날부터 [0]일 안'], ['배송비', '[0,000]원'], ['횟수', '주문 한 건에 한 번']], badge: B('한 번\n무료', '#0f766e', WHITE), asset: A.giftSvg, assetLabel: '선물 상자' },
    body: (th, sv) => [
      section('steps', sv.steps, { title: '교환 순서', items: ['원하는 사이즈를 문의로 남겨요', '받은 상품을 다시 싸서 보내요', '새 사이즈를 보내 드려요'].map(title => ({ title })) }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 입었던 흔적이 있으면 바꿔 드리기 어려워요.\n· 원하는 사이즈가 없으면 환불로 도와드려요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-how-to-order', name: '이용 순서 안내', mood: 'friendly', tone: 'blue', th: theme('#2f6fed', '#f0f5ff'),
    hero: { comp: 'asset', bg: '#cfe0ff', font: 'black-han-sans', ink: '#12224a', accent: '#2f6fed', title: '처음이어도\n쉬운\n주문 방법', sub: '네 단계면 주문이 끝나요', label: 'HOW TO ORDER', asset: A.bag, assetW: 190, assetLabel: '쇼핑백', badge: B('STEP\n4', '#2f6fed', WHITE) },
    body: (th, sv) => [
      section('steps', sv.steps, { title: '주문 순서', items: ['마음에 드는 상품을 골라요', '옵션과 수량을 정해요', '받는 곳을 적고 결제해요', '출고 소식을 기다려요'].map(title => ({ title })) }, th),
      section('rows', sv.rows, { title: '도움이 필요하면', rows: [['문의', '[문의 방법을 적어 주세요]'], ['답변 시간', '[평일 오전 0시 ~ 오후 0시]']] }, th),
    ],
  },
  {
    key: 'event-authentic', name: '정품 안내', mood: 'premium', tone: 'gray', th: theme('#334155', '#f1f5f9'),
    hero: { comp: 'asset', bg: '#2b3440', font: 'pretendard', ink: WHITE, subInk: '#d5dbe3', labelInk: '#c7d2fe', title: '믿고\n살 수\n있어요', sub: '[가게 이름]이 직접 확인하고 보내요', label: 'AUTHENTIC', asset: A.check, assetW: 260, assetLabel: '체크 뱃지' },
    body: (th, sv) => [
      section('steps', sv.steps, { title: '이렇게 확인해요', items: ['들여올 때 [확인 방법]을 봐요', '보내기 전에 한 번 더 살펴요', '[확인 자료]를 함께 보내 드려요'].map(title => ({ title })) }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 확인 방법과 자료는 판매자가 사실대로 적어 주세요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-restock', name: '재입고 알림', mood: 'soft', tone: 'purple', th: theme('#7048e8', '#f3f0ff'),
    hero: { comp: 'number', bg: '#e5dbff', bgImage: 'backgrounds/euchs-bg_beauty_lilac-water_01.jpg', font: 'black-han-sans', ink: '#3b2a78', labelInk: '#5f3dc4', label: 'BACK IN STOCK', title: 'RE\nSTOCK', head: '기다리던 상품이 다시 왔어요', headInk: '#3b2a78', sub: '[0월 0일] 재입고 · 수량이 넉넉하지 않아요', asset: A.sparkle, assetW: 170, assetLabel: '반짝이 별' },
    body: (th, sv) => [
      section('rows', sv.rows, { title: '다시 들어온 상품', rows: [['[상품 이름]', '[색상] · [사이즈]'], ['[상품 이름]', '[색상] · [사이즈]'], ['[상품 이름]', '[색상] · [사이즈]']] }, th),
      section('steps', sv.steps, { title: '다음 소식 받기', items: ['[가게 이름]을 찜해 주세요', '재입고 소식을 먼저 받아요'].map(title => ({ title })) }, th),
    ],
  },
  {
    key: 'event-soldout-soon', name: '품절 임박', mood: 'bold', tone: 'red', th: theme('#c92a2a', '#fff5f5'),
    hero: { comp: 'number', bg: '#e5484d', font: 'black-han-sans', ink: WHITE, titleStroke: '#a51d22', labelInk: '#ffe3e3', label: 'ALMOST GONE', title: '품절\n임박', head: '남은 수량 [00]개', headInk: '#ffe14d', sub: '다음 입고는 아직 정해지지 않았어요', asset: A.bag, assetW: 140, assetLabel: '쇼핑백' },
    body: (th, sv) => [
      sec(WHITE, [secTitle('남은 수량이 얼마 없어요', th), 36, photo(520), 30, rows([['남은 수량', '[00]개'], ['가격', '[00,000]원']], th)]),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 결제 순서대로 보내 드려요.\n· 품절되면 주문이 취소될 수 있어요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-benefits', name: '구매 혜택 모음', mood: 'friendly', tone: 'pink', th: theme('#c2255c', '#fff0f6'),
    hero: { comp: 'ticket', bg: '#ffd6e7', font: 'black-han-sans', ink: '#4a0f2a', accent: '#c2255c', title: '놓치면\n아쉬운\n혜택 모음', sub: '[가게 이름]에서 드리는 혜택을 모았어요', label: 'BENEFITS', coupon: '첫 구매 할인 쿠폰', amount: '[0,000]원', until: '[0월 0일]까지 사용', badge: B('혜택\n3가지', '#c2255c', WHITE), asset: A.giftSvg, assetLabel: '선물 상자' },
    body: (th, sv) => [
      section('perks', sv.perks, { title: '받을 수 있는 혜택', perks: [{ big: '쿠폰', desc: '첫 구매\n[0,000]원 할인' }, { big: '무료', desc: '[00,000]원 이상\n무료 배송' }, { big: '적립', desc: '구매 금액의\n[0]% 적립' }] }, th),
      section('notice', sv.notice, { title: '꼭 확인해 주세요', notices: `· 쿠폰은 한 주문에 하나만 쓸 수 있어요.\n${NOTE}` }, th),
    ],
  },
  {
    key: 'event-membership', name: '회원 가입 혜택', mood: 'friendly', tone: 'yellow', th: theme('#b7791f', '#fffbeb'),
    hero: { comp: 'asset', bg: '#ffe98f', bgImage: 'backgrounds/euchs-bg_toy_yellow-mint_01.jpg', font: 'pretendard', ink: '#2b2000', labelInk: '#8a5a00', title: '가입하면\n바로 드리는\n혜택', sub: '[가게 이름] 회원이 되어 주세요', label: 'WELCOME', asset: A.bag, assetW: 180, assetLabel: '쇼핑백', badge: B('가입\n혜택', '#2b2000', '#ffe98f') },
    body: (th, sv) => [
      section('steps', sv.steps, { title: '가입 순서', items: ['[가게 이름]을 찜해 주세요', '회원 가입을 눌러요', '쿠폰함에서 혜택을 확인해요'].map(title => ({ title })) }, th),
      section('perks', sv.perks, { title: '회원 혜택', perks: [{ big: '쿠폰', desc: '가입 즉시\n[0,000]원' }, { big: '생일', desc: '생일 달\n특별 쿠폰' }, { big: '소식', desc: '새 상품 소식\n가장 먼저' }] }, th),
    ],
  },
]

const DESC = {
  card: '큰 제목 · 기간·조건 카드 · 에셋 → 참여 방법 → 확인 사항',
  ticket: '큰 제목 · 쿠폰 모양 카드 → 순서 → 기준 → 확인 사항',
  frame: '두 줄 테두리 · 가운데 큰 제목 · 가게 이름 → 한눈에 보기 → 순서',
  number: '아주 큰 숫자·영문 · 굵은 한 줄 · 에셋 → 상품 → 확인 사항',
  asset: '큰 제목 · 큰 에셋 그림 · 배지 → 순서·조건 → 확인 사항',
}

function buildHero(s) {
  const make = HEROES[s.comp]
  const { items } = make(s)
  return { height: H, bg: s.bg, ...(s.bgImage ? { bgImage: { asset: s.bgImage, fit: 'cover' } } : {}), items }
}

/** 이 파일의 템플릿 key·바탕 계열 (목록 순서) — 갤러리 순서·섹션 모양은 studioTemplates.js가 정한 뒤 buildEventTemplate으로 만든다 */
export const EVENT_KEYS = LIST.map(e => e.key)
export const EVENT_TONES = Object.fromEntries(LIST.map(e => [e.key, e.tone]))

/**
 * 안내·이벤트 템플릿 하나 — sv = 아래 섹션 모양 번호들 (studioTemplateSections.planSectionStyles), 없으면 모두 0번 모양.
 * 아래 섹션 색·글꼴 = 첫 화면을 따른다 (lowerTheme — 강조색은 이 템플릿 색 묶음의 accent)
 */
export function buildEventTemplate(key, sv = {}) {
  const e = LIST.find(x => x.key === key)
  if (!e) return null
  const th = lowerTheme({ ...e.hero, accent: e.th.accent }, { ...e.th, body: 'pretendard' })
  return {
    key: e.key, category: 'event', label: `안내·이벤트 · ${e.name}`, desc: DESC[e.hero.comp], gap: 0, mood: e.mood, swatch: e.th.accent, tone: e.tone, // 거르기 색 = studioTemplates가 tone으로 (templateColorOf)
    ...(e.samples ? { sampleCategories: e.samples } : {}), // 선물 템플릿 = 명절 선물·식품·건강식품 사진 (알맞은 템플릿 카테고리가 없는 사진)
    sections: [buildHero(e.hero), ...e.body(th, sv)],
  }
}
