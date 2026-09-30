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
 * ★ 첫 구간은 studioTemplateHeroes.withHero가 큰 제목 첫 화면(780×1040)으로 바꾼다 — 아래 짜임새의 첫 구간 자리는 그 자리표시.
 */
import { withHero, HERO_SPECS } from './studioTemplateHeroes.js'
import {
  W, WHITE, textH, T, bar, ornament, pill, checks, boxes2, fixed, asset, sec, SHIP, RETURN, section, lowerTheme,
} from './studioTemplateSections.js'

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
  // 촬영 세트 템플릿(studioTemplateShoots)으로 생긴 카테고리
  { key: 'food', label: '식품' },
  { key: 'health', label: '건강식품' },
  { key: 'gift', label: '선물세트' },
  { key: 'baby', label: '유아' },
  { key: 'camping', label: '캠핑' },
  { key: 'interior', label: '인테리어' },
  { key: 'fullset', label: '풀세트' }, // 에셋 이미지(받침대·배경 그림)까지 들어간 긴 구성 (지금은 샘플 1개)
  { key: 'event', label: '안내·이벤트' }, // 제품 사진 0~1장 — 리뷰·배송·할인·명절 안내 (studioTemplateEvents)
]

// 템플릿 고르기 거르기 (템플릿 갤러리·편집기 [템플릿] 패널). 분위기 = 짜임새에서, 색 = 색 묶음에서 정한다 (템플릿마다 하나)
export const TEMPLATE_MOODS = [
  { key: 'clean', label: '깔끔한' },
  { key: 'bold', label: '강렬한' },
  { key: 'soft', label: '감성' },
  { key: 'friendly', label: '친근한' },
  { key: 'premium', label: '고급스러운' },
]
// swatch = 거르기 칩에 그리는 대표색
export const TEMPLATE_COLORS = [
  { key: 'warm', label: '따뜻한 색', swatch: '#c9814a' },
  { key: 'cool', label: '푸른 색', swatch: '#2f6fed' },
  { key: 'green', label: '초록', swatch: '#2f9e44' },
  { key: 'pink', label: '분홍', swatch: '#e64980' },
  { key: 'purple', label: '보라', swatch: '#7c5cd6' },
  { key: 'mono', label: '무채색', swatch: '#475569' },
]
// 첫 화면 바탕 계열(tone — studioTemplateHeroes·studioTemplateEvents) → 거르기 색. 카드에 보이는 색 = 첫 화면 바탕이므로 색 분류는 여기서만 정한다
const TONE_COLOR = {
  yellow: 'warm', orange: 'warm', red: 'warm', beige: 'warm',
  blue: 'cool', green: 'green', pink: 'pink', purple: 'purple', black: 'mono', gray: 'mono',
}
/** 사진이 첫 화면을 덮는 구도(tone 'photo')는 덮개 바탕색(bg)의 색상으로 — 채도가 낮으면 무채색 */
function colorOfHex(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex ?? ''))
  if (!m) return null
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (s < 0.15) return 'mono'
  const h = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60
  if (h < 65 || h >= 345) return 'warm'
  if (h < 170) return 'green'
  if (h < 255) return 'cool'
  if (h < 300) return 'purple'
  return 'pink'
}
/** 템플릿 거르기 색 (TEMPLATE_COLORS의 key) — tone, 'photo'면 bg. 모르면 null (테스트가 잡는다) */
export function templateColorOf(tone, bg) {
  if (tone === 'photo') return colorOfHex(bg)
  return TONE_COLOR[tone] ?? null
}
const MOOD_OF_KIND = { classic: 'clean', bold: 'bold', magazine: 'soft', checklist: 'friendly', fullset: 'premium' }

const HERO = { photo: 0 } // 첫 구간 자리 — withHero가 큰 제목 첫 화면으로 바꾼다

/** 소개 글 구간 (영문 라벨 + 제목 + 막대/장식 + 설명) — 제목 글꼴·색은 첫 화면을 따른다 */
function intro(c, th, o = {}) {
  const serif = SERIF_FONTS.has(th.font)
  return sec(o.bg ?? WHITE, [
    T(c.eyebrow, 15, 700, th.accentText, { font: 'cinzel', letterSpacing: 0.3, lh: 1.3 }), 18,
    T(c.headline, 44, serif ? 700 : HEAD_WEIGHT[th.font] ?? 400, th.ink, { font: th.font, w: 680, lh: 1.3 }), 26,
    o.ornament ? ornament(th.accent) : bar(th.accent), 26,
    T(c.lead, 20, 400, th.sub, { w: 640, lh: 1.7 }),
  ], o.sec)
}
const SERIF_FONTS = new Set(['gowun-batang', 'noto-serif-kr', 'nanum-myeongjo'])
const HEAD_WEIGHT = { pretendard: 800, 'noto-sans-kr': 800, 'nanum-gothic': 800, 'noto-serif-kr': 700, 'gowun-batang': 700, 'nanum-myeongjo': 800 }

// 섹션 내용 묶음 (모양은 studioTemplateSections — v = 이 템플릿의 모양 번호들)
const pointsOf = c => ({ title: c.pointsTitle, items: c.points })
const stepsOf = c => ({ title: c.howTitle, items: c.steps })
const tableOf = c => ({ title: c.tableTitle, cells: c.table, note: c.tableNote, w: c.tableW, chips: c.tableChips })
const noticeOf = (c, boxes = [SHIP, RETURN]) => ({ title: c.noticeTitle, notices: c.notices, boxes })

// ── 짜임새 4가지 + 풀세트 (섹션 종류 순서만 정하고, 모양은 v로) ──

/** 1. 클래식 — 첫 화면 → 소개 → 포인트 → 사진 → 상세컷 → 표 → 사용법 → 안내 */
function classic(c, th, v) {
  return [
    HERO,
    intro(c, th),
    section('points', v.points, pointsOf(c), th),
    { photo: 1 },
    section('detail1', v.detail1, { title: c.detailTitle, lead: c.detailLead, caption: c.caption, slot: 2 }, th),
    section('table', v.table, tableOf(c), th),
    section('steps', v.steps, stepsOf(c), th),
    section('notice', v.notice, noticeOf(c), th),
  ]
}

/** 2. 짙은 첫 화면 — 첫 화면 → 대표 사진 → 포인트마다 사진 → 표 → 사용 순서 → 안내 */
function bold(c, th, v) {
  return [
    HERO,
    { photo: 0 },
    ...c.points.map((p, i) => section('pointPhoto', v.pointPhoto, { i, title: p.title, desc: p.desc, slot: i + 1 }, th, { bg: i % 2 ? th.soft : WHITE })),
    section('table', v.table, tableOf(c), th),
    section('steps', v.steps, stepsOf(c), th),
    section('notice', v.notice, noticeOf(c), th),
  ]
}

/** 3. 매거진 — 첫 화면 → 소개(장식 선) → 사진 두 장 → 상세컷 → 추천 → 표 → 안내 */
function magazine(c, th, v) {
  return [
    HERO,
    intro(c, th, { bg: th.soft, ornament: true, sec: { top: 84, bottom: 84 } }),
    section('detail2', v.detail2, { slots: [1, 2], caption: c.caption }, th),
    section('detail1', v.detail1, { title: c.detailTitle, lead: c.detailLead, slot: 3 }, th),
    section('recommend', v.recommend, { title: c.pointsTitle, lines: c.checks }, th),
    section('table', v.table, tableOf(c), th),
    section('notice', v.notice, noticeOf(c), th),
  ]
}

/** 4. 체크리스트 — 첫 화면 → 추천 → 사진 → 포인트 → 사진 → 한마디 상세컷 → 표 → 사용법 → 안내 */
function checklist(c, th, v) {
  return [
    HERO,
    section('recommend', v.recommend, { title: c.checksTitle, lines: c.checks }, th),
    { photo: 0 },
    section('points', v.points, pointsOf(c), th),
    { photo: 1 },
    section('detail1', v.detail1, { title: c.bubble, caption: c.caption, slot: 2 }, th),
    section('table', v.table, tableOf(c), th),
    section('steps', v.steps, stepsOf(c), th),
    section('notice', v.notice, noticeOf(c), th),
  ]
}

// 풀세트에 쓰는 에셋 이미지 (public/studio-assets — manifest.json에 있는 파일. 파일 경로만 바꾸면 템플릿 코드는 그대로)
// 첫 화면(배경·받침대·반짝이 별)은 studioTemplateHeroes의 받침대 구도(podium)가 그린다
const FULL = {
  sparkle: 'objects/euchs-obj_common_sparkle-stars_01.png',       // 940×881
  check: 'objects/euchs-obj_common_check-badge_01.png',           // 1065×1121
  endBg: 'backgrounds/euchs-bg_living_beige-plaster_01.jpg',
}
/** 섹션 아래쪽 모서리 장식 (글과 겹치지 않게 아래 여백을 늘리고 그 자리에) */
const cornerArt = (file, w, h, label, side = 'right') => ({
  pad: h + 20,
  items: height => [{ type: 'asset', asset: file, x: side === 'right' ? W - 40 - w : 40, y: height - h - 24, w, h, fit: 'contain', label }],
})

/**
 * 5. 풀세트 — 첫 화면(배경 이미지 + 받침대 위 대표 사진 — studioTemplateHeroes 'podium') → 공감 → 핵심 포인트 3 → 상세 사진 → 사진 두 장 → 소재·스펙 → 비교 →
 *    사용법 → 사이즈·옵션 → 구매 전 안내 → 배송·교환 (11구간). 에셋 이미지 = 첫 화면 배경·받침대·반짝임, 공감·비교 구간 장식, 끝 구간 배경
 *    대표 사진(자리 0)은 첫 화면 받침대 위에만 둔다 (같은 사진을 바로 아래 꽉 찬 구간에 한 번 더 넣지 않음)
 *    표 세 개는 같은 종류라 모양 번호를 하나씩 비켜 쓴다 (한 템플릿 안에서도 표 모양이 다르게)
 */
function fullset(c, th, v) {
  return [
    HERO,
    section('recommend', v.recommend, { title: c.worryTitle, lines: c.worries }, th, { corner: cornerArt(FULL.check, 114, 120, '체크 뱃지') }),
    section('points', v.points, pointsOf(c), th),
    section('detail1', v.detail1, { title: c.detailTitle, lead: c.detailLead, caption: c.caption, slot: 1 }, th),
    section('detail2', v.detail2, { slots: [2, 3] }, th),
    section('table', v.table, tableOf(c), th),
    section('table', v.table + 1, { title: c.compareTitle, cells: c.compare, note: c.compareNote, w: 640 }, th, { corner: cornerArt(FULL.sparkle, 110, 103, '반짝이 별', 'left') }),
    section('steps', v.steps, stepsOf(c), th),
    section('table', v.table + 2, { title: c.optionTitle, cells: c.options, note: c.optionNote, w: 640 }, th),
    section('notice', v.notice, noticeOf(c, null), th),
    sec('#efe6dc', [T('배송·교환 안내', 30, HEAD_WEIGHT[th.font] ?? 400, th.ink, { font: th.font, lh: 1.3 }), 36, boxes2([SHIP, RETURN], th, { boxBg: WHITE })], { bgImage: FULL.endBg }),
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
    tableTitle: '사이즈 안내', tableW: 640, tableChips: ['단위 cm', '평평하게 재요', '1~3cm 차이'],
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
    tableTitle: '크기 안내', tableW: 600, tableChips: ['단위 cm', '끈 길이 포함', '1~2cm 차이'],
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
    tableTitle: '제품 정보', tableW: 600, tableChips: ['표기 그대로', '열원 확인', '세척 방법'],
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
    tableTitle: '제품 정보', tableW: 600, tableChips: ['단위 확인', '놓을 자리 재기', '표기 그대로'],
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
    tableTitle: '제품 정보', tableW: 600, tableChips: ['표기 그대로', '사용 기한', '보관 방법'],
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
    tableTitle: '제품 사양', tableW: 600, tableChips: ['표기 그대로', '정격 전압', '인증 번호'],
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
    tableTitle: '제품 정보', tableW: 600, tableChips: ['사용 연령', '표기 그대로', '인증 번호'],
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
    tableTitle: '사이즈 안내', tableW: 660, tableChips: ['단위 cm', '가슴둘레 기준', '넉넉하게'],
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

/** 이 파일의 템플릿 key (목록 순서) — 갤러리 순서·섹션 모양은 studioTemplates.js가 정한 뒤 buildCategoryTemplate으로 만든다 */
export const CATEGORY_KEYS = LIST.map(r => r[1])

/**
 * 카테고리 템플릿 하나 — v = 섹션 모양 번호들 (studioTemplateSections.planSectionStyles), 없으면 모두 0번 모양.
 * 첫 구간 = 큰 제목 첫 화면 (studioTemplateHeroes — 구간 수·key·카테고리 그대로), 아래 섹션 색·글꼴 = 첫 화면을 따른다 (lowerTheme)
 */
export function buildCategoryTemplate(key, v = {}) {
  const row = LIST.find(r => r[1] === key)
  if (!row) return null
  const [category, , label, kind, th, head] = row
  const theme = lowerTheme(HERO_SPECS[key], TH[th])
  return withHero({
    key, category, label, desc: FLOW[kind], gap: 0, mood: MOOD_OF_KIND[kind], swatch: TH[th].accent, // 거르기 색은 studioTemplates가 첫 화면 tone으로 (templateColorOf)
    sections: BUILD[kind]({ ...COPY[category], ...head }, theme, v),
  })
}

// 조각 도구 — 다른 템플릿 모음(studioTemplateLooks.js·studioTemplateEvents.js)이 같은 조각 규칙으로 만들게 내보낸다 (실제 정의는 studioTemplateSections)
export const TPL_BLOCKS = { W, WHITE, textH, T, bar, ornament, pill, checks, boxes2, fixed, asset, sec, SHIP, RETURN }
