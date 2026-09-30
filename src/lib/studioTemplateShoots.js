/**
 * 촬영 세트 템플릿 (1차 패션·잡화 10개) — 한 벌로 찍은 예시 사진 4장(대표·연출·확대·사용 장면)으로 만든 긴 상세페이지 (DOM·DB 없음)
 * node 테스트: scripts/test-studio-template-shoots.mjs (+ heroes·sections·gallery 테스트가 전체 목록으로 본다)
 *
 * ★ 모양은 studioTemplates.js 맨 위 설명과 같다 ({ key, label, desc, gap, sections } + category·mood·swatch·tone).
 *   첫 구간 = 780×1040(3:4) 첫 화면 — 대표 사진 + 큰 제목(높이의 30~42%) · 작은 영문 라벨 · 부제. 구도는 이 파일의 HEROES (기존 첫 화면 9구도와 다른 모양).
 *   아래 섹션 = studioTemplateSections의 종류 (모양 번호는 studioTemplates가 갤러리 순서로 정한다 — planSectionStyles).
 *   패션 = 소재 확대·착용 장면·사이즈 자리(표는 넣지 않음 — 고객이 [요소] → [사이즈표]에서 고른다)·관리 안내·구성
 * * ★ 사진 4장을 모두 한 번씩 쓴다. 사진 자리 번호는 페이지 위에서부터 0,1,2,3 (고객 사진이 위에서부터 차례로 들어간다).
 *   samplePins = 자리 순서대로 이 세트의 예시 사진 id (studioSamples.assignSamples — 이 템플릿만 그 사진을 쓴다)
 * ★ 문구는 판매자가 고쳐 쓰는 자리표시 — 인증·효능·수치처럼 사실 확인이 필요한 말은 넣지 않는다.
 *   배치·색·문구는 이 프로젝트에서 새로 정한 것 (다른 편집 프로그램·쇼핑몰의 템플릿·문구를 옮기지 않음). 글꼴은 허용 목록(studioFonts)만.
 */
import { HERO_H, heroTitleSize } from './studioTemplateHeroes.js'
import { W, WHITE, textH, textUnits, section, lowerTheme, SHIP, RETURN } from './studioTemplateSections.js'

const H = HERO_H
const LS = -0.02
const HEAVY = { pretendard: 900, 'noto-sans-kr': 900, 'noto-serif-kr': 900, 'nanum-myeongjo': 800, 'nanum-gothic': 800, 'gowun-batang': 700 }
const LH = { 'gowun-batang': 1.14, 'noto-serif-kr': 1.12, 'nanum-myeongjo': 1.12 }

// ── 첫 화면 조각 ──
function title(text, font, ink, x, y, w, target, o = {}) {
  const lh = o.lh ?? LH[font] ?? 1.06
  const size = heroTitleSize(text, font, w, target, lh)
  const { lh: _l, ...rest } = o
  return {
    part: { type: 'text', x, y, w, text, fontSize: size, fontWeight: HEAVY[font] ?? 400, color: ink, fontFamily: font, align: 'left', lineHeight: lh, letterSpacing: LS, ...rest },
    h: textH(text, size, lh), size,
  }
}
const label = (text, color, x, y, w = 500, align = 'left') => ({ type: 'text', x, y, w, text, fontSize: 18, fontWeight: 700, color, fontFamily: 'cinzel', align, lineHeight: 1.3, letterSpacing: 0.3 })
function sub(text, color, x, y, w, align = 'left', size = 22) {
  return { part: { type: 'text', x, y, w, text, fontSize: size, fontWeight: 400, color, fontFamily: 'pretendard', align, lineHeight: 1.5 }, h: textH(text, size, 1.5) }
}
const photo = (x, y, w, h, o = {}) => ({ type: 'image', slot: 'P', sample: 'product', x, y, w, h, ...o })
const rect = (x, y, w, h, fill, o = {}) => ({ type: 'shape', shape: 'rect', x, y, w, h, fill, ...o })
/** 배지 — 도형 + 글자 한 묶음 */
function badge(b, x, y, d) {
  if (!b) return []
  const lines = b.text.split('\n')
  const size = Math.max(14, Math.min(Math.floor((d * 0.6) / Math.max(...lines.map(l => textUnits(l, 'black-han-sans')))), Math.floor((d * 0.5) / (lines.length * 1.08))))
  const th = textH(b.text, size, 1.08)
  return [
    { type: 'shape', group: 'hb', shape: b.shape ?? 'burst', x, y, w: d, h: d, fill: b.fill },
    { type: 'text', group: 'hb', x: x + 8, y: y + Math.round((d - th) / 2), w: d - 16, text: b.text, fontSize: size, fontWeight: 400, color: b.ink, fontFamily: 'black-han-sans', align: 'center', lineHeight: 1.08 },
  ]
}

// ── 첫 화면 구도 9가지 — 모두 { items } (바탕색은 spec.bg) ──
const HEROES = {
  /** 액자 선 — 사진 전면 + 안쪽 가는 테두리 + 왼쪽 위 명조 제목 */
  frame(s) {
    const t = title(s.title, s.font, s.ink, 60, 140, 600, s.target ?? 0.33)
    const sb = sub(s.sub, s.subInk ?? s.ink, 62, 140 + t.h + 22, 540)
    return [photo(0, 0, W, H), rect(24, 24, W - 48, H - 48, '', { strokeWidth: 2, strokeColor: s.frame ?? WHITE }), label(s.label, s.labelInk ?? s.ink, 62, 76), t.part, sb.part]
  },
  /** 캡슐 창 — 단색 바탕 · 가운데 큰 제목 · 긴 캡슐 모양 사진 + 가는 윤곽 */
  capsule(s) {
    const t = title(s.title, s.font, s.ink, 40, 140, 700, s.target ?? 0.31, { align: 'center' })
    const sb = sub(s.sub, s.subInk ?? s.ink, 70, 140 + t.h + 18, 640, 'center')
    const pw = s.pw ?? 360, py = sb.part.y + sb.h + 44, ph = H - 64 - py, px = (W - pw) / 2
    return [
      { type: 'line', x: 190, y: 95, w: 60, strokeWidth: 2, color: s.accent },
      { type: 'line', x: 530, y: 95, w: 60, strokeWidth: 2, color: s.accent },
      label(s.label, s.labelInk ?? s.accent, 40, 84, 700, 'center'),
      t.part, sb.part,
      rect(px - 16, py - 16, pw + 32, ph + 32, '', { strokeWidth: 2, strokeColor: s.accent, radius: (pw + 32) / 2 }),
      photo(px, py, pw, ph, { radius: pw / 2 }),
      ...badge(s.badge, px + pw - 50, py + ph - 150, 130),
    ]
  },
  /** 테이프 제목 — 줄마다 색 띠 위에 굵은 제목 (사진 전면, 또는 위 단색 + 아래 사진 띠) */
  tape(s) {
    const lines = s.title.split('\n')
    const font = s.font
    const maxU = Math.max(...lines.map(l => textUnits(l, font)))
    const size = Math.min(Math.floor((0.33 * H) / lines.length), Math.floor(520 / maxU))
    const th = Math.round(size * 1.2), gap = 14
    const items = [s.photoY ? photo(0, s.photoY, W, H - s.photoY) : photo(0, 0, W, H), label(s.label, s.labelInk ?? s.tapeInk, 56, 96)]
    let y = 140
    lines.forEach((l, i) => {
      const tw = Math.ceil(textUnits(l, font) * size) + 48
      items.push(
        { type: 'shape', group: `tp${i}`, shape: 'rect', x: 50, y, w: tw, h: th, fill: s.tape },
        { type: 'text', group: `tp${i}`, x: 74, y: y + Math.round((th - size) / 2), w: 620, text: l, fontSize: size, fontWeight: HEAVY[font] ?? 400, color: s.tapeInk, fontFamily: font, align: 'left', lineHeight: 1, letterSpacing: LS },
      )
      y += th + gap
    })
    const sb = sub(s.sub, s.subInk, 74, y + 10, 560, 'left', 20)
    const sw = Math.ceil(textUnits(s.sub, 'pretendard') * 20) + 48
    items.push({ type: 'shape', group: 'ts', shape: 'rect', x: 50, y: y + 2, w: sw, h: sb.h + 16, fill: s.subBg, radius: Math.round((sb.h + 16) / 2) }, { ...sb.part, group: 'ts' })
    return items
  },
  /** 세로 제목 — 한 글자씩 세로로 쌓은 제목 기둥 + 큰 세로 사진 (side = 제목 쪽) */
  vertical(s) {
    const left = (s.side ?? 'left') === 'left'
    const colW = 170, colX = left ? 50 : W - 50 - colW, px = left ? 250 : 50
    const t = title(s.title, s.font, s.ink, colX, 170, colW, s.target ?? 0.38, { align: 'center', lh: 1.08 })
    const sb = sub(s.sub, s.subInk ?? s.ink, px, 150 + 760 + 26, 480, left ? 'left' : 'right', 20)
    return [
      photo(px, 150, 480, 760, s.radius ? { radius: s.radius } : {}),
      label(s.label, s.labelInk ?? s.accent, 50, 84, 520),
      t.part,
      rect(colX + colW / 2 - 22, 170 + t.h + 28, 44, 3, s.accent),
      sb.part,
    ]
  },
  /** 기울인 사진 카드 — 가운데 큰 제목 + 흰 테두리 카드 한 장 + 별 스티커 */
  tilt(s) {
    const t = title(s.title, s.font, s.ink, 40, 140, 700, s.target ?? 0.31, { align: 'center' })
    const sb = sub(s.sub, s.subInk ?? s.ink, 70, 140 + t.h + 18, 640, 'center')
    const py = sb.part.y + sb.h + 58, ph = H - 84 - py, pw = 450
    return [
      label(s.label, s.labelInk ?? s.ink, 40, 84, 700, 'center'),
      t.part, sb.part,
      { type: 'shape', shape: 'star', x: 70, y: py + 40, w: 54, h: 54, fill: s.accent },
      { type: 'shape', shape: 'star', x: 656, y: py + ph - 90, w: 40, h: 40, fill: s.accent2 ?? s.accent },
      photo((W - pw) / 2, py, pw, ph, { borderWidth: 14, borderColor: WHITE, shadow: 30, rotation: s.rot ?? -4 }),
      ...badge(s.badge, (W + pw) / 2 - 40, py - 40, 120),
    ]
  },
  /** 잡지 표지 — 사진 전면 + 가운데 명조 제목 + 아래 반투명 알약 부제 */
  cover(s) {
    const t = title(s.title, s.font, s.ink, 40, 150, 700, s.target ?? 0.32, { align: 'center' })
    const sb = sub(s.sub, s.subInk ?? s.ink, 100, H - 112, 580, 'center', 21)
    return [
      photo(0, 0, W, H),
      { type: 'line', x: 150, y: 101, w: 90, strokeWidth: 2, color: s.ink },
      { type: 'line', x: 540, y: 101, w: 90, strokeWidth: 2, color: s.ink },
      label(s.label, s.labelInk ?? s.ink, 40, 90, 700, 'center'),
      t.part,
      { type: 'shape', group: 'cv', shape: 'rect', x: 90, y: H - 128, w: 600, h: sb.h + 32, fill: WHITE, fillOpacity: 0.82, radius: Math.round((sb.h + 32) / 2) },
      { ...sb.part, group: 'cv' },
    ]
  },
  /** 짙은 포스터 — 사진 전면 + 왼쪽 강조 막대 + 아주 굵은 제목 + 아래 권호 */
  posterDark(s) {
    const t = title(s.title, s.font, s.ink, 88, 140, 620, s.target ?? 0.34)
    const sb = sub(s.sub, s.subInk ?? s.ink, 90, 140 + t.h + 22, 560)
    return [
      photo(0, 0, W, H),
      ...(s.shade ? [rect(0, 0, W, 640, '#000000', { fillOpacity: s.shade })] : []),
      rect(56, 146, 10, t.h - 12, s.accent),
      label(s.label, s.labelInk ?? s.accent, 88, 96),
      t.part, sb.part,
      label(s.issue, s.labelInk ?? s.accent, 56, H - 76, 400),
    ]
  },
  /** 잡지 면 — 왼쪽 맞춤 큰 제목 · 아래 사진 한 장 + 옆 단 목차 (side = 사진 쪽) */
  magazine(s) {
    const t = title(s.title, s.font, s.ink, 56, 140, 668, s.target ?? 0.32)
    const py = 140 + t.h + 40, ph = H - 60 - py
    const left = (s.side ?? 'left') === 'left'
    const px = left ? 56 : W - 56 - 400, cx0 = left ? 486 : 56
    const sb = sub(s.sub, s.subInk ?? s.ink, cx0, py, 238, 'left', 19)
    const items = [rect(56, 124, 668, 2, s.ink), label(s.label, s.labelInk ?? s.accent, 56, 88), t.part, photo(px, py, 400, ph), sb.part]
    let y = py + sb.h + 28
    s.lines.forEach((l, i) => {
      items.push(rect(cx0, y, 238, 1, s.line ?? s.ink))
      items.push({ type: 'text', x: cx0, y: y + 14, w: 238, text: `0${i + 1}`, fontSize: 16, fontWeight: 700, color: s.accent, fontFamily: 'cinzel', align: 'left', lineHeight: 1.3 })
      items.push({ type: 'text', x: cx0, y: y + 40, w: 238, text: l, fontSize: 18, fontWeight: 700, color: s.ink, fontFamily: 'pretendard', align: 'left', lineHeight: 1.45 })
      y += 40 + textH(l, 18, 1.45) + 22
    })
    return items
  },
  /** 팝 제목 — 굵은 제목에 두꺼운 테두리 + 터지는 배지 (사진 전면, 또는 위 단색 + 아래 사진 띠) */
  pop(s) {
    const t = title(s.title, s.font, s.ink, 40, 146, 700, s.target ?? 0.31, { align: 'center', strokeWidth: s.strokeWidth ?? 10, strokeColor: s.stroke })
    const sb = sub(s.sub, s.subInk, 70, 146 + t.h + 12, 640, 'center')
    const items = [
      s.photoY ? photo(0, s.photoY, W, H - s.photoY) : photo(0, 0, W, H),
      label(s.label, s.labelInk ?? s.ink, 40, 96, 700, 'center'),
      t.part, sb.part,
      ...badge(s.badge, s.badgeX ?? 60, s.badgeY ?? (s.photoY ? s.photoY + 40 : 560), 150),
    ]
    return items
  },
}
export const SHOOT_HERO_COMPS = Object.keys(HEROES)

// ── 아래 섹션 흐름 (종류 순서 — 모양 번호는 v) ──
// 사진 자리 이름: P 대표(첫 화면) · S 연출(사진 2) · D 확대(사진 3) · U 사용 장면(사진 4) — 다 만든 뒤 위에서부터 0,1,2,3으로 바꾼다
const SAMPLE_OF = { P: 'product', S: 'scene', D: 'detail', U: 'scene' }
const notice = (c, th, v) => section('notice', v.notice, { title: c.noticeTitle ?? '구매 전에 확인해 주세요', notices: c.notices, boxes: [SHIP, RETURN] }, th)
const FLOWS = {
  // 패션 — 문장 → 연출 → 특징 → 소재 확대 → 착용 장면 → 사이즈 자리 → 관리 → 구성 → 안내
  fashionA: (c, th, v) => [
    section('statement', v.statement, c.statement, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('points', v.points, c.points, th),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('story', v.story, { ...c.use, slot: 'U', sample: c.useSample ?? 'scene' }, th),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('care', v.care, c.care, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ],
  // 패션 — 착용 장면이 먼저 (사진 → 문장 → 확대 → 특징 → 연출) → 관리 → 사이즈 자리 → 구성 → 안내
  fashionB: (c, th, v) => [
    section('story', v.story, { ...c.use, slot: 'U', sample: c.useSample ?? 'scene' }, th),
    section('statement', v.statement, c.statement, th),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('points', v.points, c.points, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('care', v.care, c.care, th),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ],
  // 패션 — 확대부터 (소재 → 특징 → 연출 → 문장 → 착용 장면) → 사이즈 자리 → 구성 → 관리 → 안내
  fashionC: (c, th, v) => [
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('points', v.points, c.points, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('statement', v.statement, c.statement, th),
    section('story', v.story, { ...c.use, slot: 'U', sample: c.useSample ?? 'scene' }, th),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('contents', v.contents, c.contents, th),
    section('care', v.care, c.care, th),
    notice(c, th, v),
  ],
}
const FLOW_DESC = {
  fashionA: '대표 사진 → 브랜드 문장 → 연출 → 특징 3가지 → 소재 확대 → 착용 장면 → 사이즈 자리 → 관리 → 구성 → 안내',
  fashionB: '대표 사진 → 착용 장면 → 브랜드 문장 → 소재 확대 → 특징 3가지 → 연출 → 관리 → 사이즈 자리 → 구성 → 안내',
  fashionC: '대표 사진 → 소재 확대 → 특징 3가지 → 연출 → 브랜드 문장 → 착용 장면 → 사이즈 자리 → 구성 → 관리 → 안내',
}

// ── 문구 ──
const P = (title, desc) => ({ title, desc })
const N = (t, d) => ({ t, d })
const K = (k, t) => ({ k, t })
const FASHION_NOTICE = '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 재는 방법에 따라 1~3cm 차이가 날 수 있어요.\n· 궁금한 점은 문의를 남겨 주세요.'
const SHOE_NOTICE = '· 발볼·발등에 따라 신는 느낌이 다를 수 있어요.\n· 실내에서 먼저 신어 본 뒤 교환을 신청해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.'
const SHOE_CARE = { title: '오래 신는 관리법', items: [K('마른천', '먼지는 마른 천으로\n닦아 주세요'), K('그늘', '젖으면 그늘에서\n말려 주세요'), K('모양', '종이를 넣어\n모양을 잡아 주세요'), K('크림', '가죽 크림으로\n가끔 닦아 주세요')] }
const SHOE_SIZE = { title: '사이즈 안내', chips: ['단위 mm', '발 길이 기준', '반 치수 차이'], note: '발볼이 넓다면 반 치수 크게 골라 주세요.' }
const CLOTH_SIZE = { title: '사이즈 안내', chips: ['단위 cm', '평평하게 재요', '1~3cm 차이'], note: '가지고 있는 옷과 비교해 골라 주세요.' }
const CLOTH_CARE = { title: '세탁·관리 안내', items: [K('30°', '미지근한 물에\n세탁해 주세요'), K('단독', '처음에는 따로\n세탁해 주세요'), K('그늘', '뒤집어서 그늘에\n말려 주세요'), K('다림', '낮은 온도로\n다려 주세요')] }
const MORE = ['[구성품 이름]', '[수량]']

const COPY = {
  pumps: {
    statement: { label: 'DESIGN NOTE', text: '매일 신고 싶은 구두는 발이 먼저 알아봐요', sub: '굽 높이와 앞코 모양처럼 디자인 포인트를 적어 주세요.' },
    scene: { title: '어떤 옷에도 잘 어울려요', lead: '함께 입으면 좋은 옷차림을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '편안함을 더한 세 가지', items: [P('부드러운 가죽', '가죽 종류와 촉감을\n적어 주세요'), P('안정적인 굽', '굽 높이와 모양을\n적어 주세요'), P('폭신한 깔창', '깔창 소재를\n적어 주세요')] },
    zoom: { title: '가까이에서 본 가죽', notes: [N('매끈한 표면', '가죽 표면의 느낌을 적어 주세요.'), N('꼼꼼한 마감', '바느질과 마감을 적어 주세요.'), N('편한 안쪽', '안감 소재를 적어 주세요.')] },
    use: { label: 'ON THE STREET', title: '출근길부터 저녁 약속까지', desc: '신고 걸었을 때의 느낌을 한두 줄로 적어 주세요.' },
    size: SHOE_SIZE, care: SHOE_CARE,
    contents: { title: '구성', items: [['구두', '1켤레'], ['보관 주머니', '1개'], MORE] },
    notices: SHOE_NOTICE,
  },
  boots: {
    statement: { label: 'CRAFT NOTE', text: '추운 날에도 발끝은 따뜻하고 단단하게', sub: '가죽과 밑창의 장점을 적어 주세요.' },
    scene: { title: '따뜻한 계절의 옷차림', lead: '코트, 니트처럼 어울리는 옷을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '겨울에 더 좋은 이유', items: [P('단단한 가죽', '가죽 두께와 촉감을\n적어 주세요'), P('미끄럼 방지', '밑창 무늬를\n적어 주세요'), P('편한 지퍼', '신고 벗는 방법을\n적어 주세요')] },
    zoom: { title: '바느질까지 꼼꼼하게', notes: [N('두꺼운 가죽', '가죽 종류를 적어 주세요.'), N('튼튼한 박음질', '바느질 방식을 적어 주세요.'), N('옆 지퍼', '지퍼 위치와 길이를 적어 주세요.')] },
    use: { label: 'HOW TO WEAR', title: '앉아서 쉽게 신어요', desc: '신고 벗을 때 편한 점을 적어 주세요.' },
    size: SHOE_SIZE, care: SHOE_CARE,
    contents: { title: '구성', items: [['부츠', '1켤레'], ['보관 주머니', '1개'], MORE] },
    notices: SHOE_NOTICE,
  },
  sandals: {
    statement: { label: 'SUMMER NOTE', text: '바닷가에서도 도심에서도 가볍게 걸어요', sub: '무게와 끈 모양의 장점을 적어 주세요.' },
    scene: { title: '여름 가방 속 필수품', lead: '함께 챙기면 좋은 물건을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '여름에 딱 좋은 세 가지', items: [P('가벼운 무게', '한 짝 무게를\n적어 주세요'), P('조절 버클', '끈 길이 조절을\n적어 주세요'), P('푹신한 바닥', '바닥 소재를\n적어 주세요')] },
    zoom: { title: '버클과 끈을 가까이', notes: [N('금빛 버클', '버클 소재를 적어 주세요.'), N('부드러운 끈', '끈 소재와 폭을 적어 주세요.'), N('도톰한 바닥', '바닥 두께를 적어 주세요.')] },
    use: { label: 'BEACH WALK', title: '맨발에 닿는 편안함', desc: '신었을 때 느낌을 한두 줄로 적어 주세요.' },
    size: SHOE_SIZE, care: { title: '관리 방법', items: [K('물기', '젖으면 물기를\n닦아 주세요'), K('그늘', '그늘에서\n말려 주세요'), K('모래', '모래는 털어서\n보관해 주세요'), K('보관', '통풍이 잘 되는 곳에\n두세요')] },
    contents: { title: '구성', items: [['샌들', '1켤레'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: SHOE_NOTICE,
  },
  jewelry: {
    statement: { label: 'FINE DETAIL', text: '작은 빛 하나가 하루의 분위기를 바꿔요', sub: '소재와 디자인 이야기를 적어 주세요.' },
    scene: { title: '화장대 위에 두어도 예뻐요', lead: '함께 두면 좋은 소품이나 보관 방법을 알려 주세요.', caption: '사진 아래에 구성과 색상을 적어 주세요.' },
    points: { title: '매일 하기 좋은 이유', items: [P('은은한 빛', '도금·소재를\n적어 주세요'), P('가벼운 착용', '무게를\n적어 주세요'), P('어디든 어울림', '어울리는 옷차림을\n적어 주세요')] },
    zoom: { title: '진주를 가까이에서', notes: [N('동그란 진주', '진주 크기를 적어 주세요.'), N('가는 체인', '체인 길이를 적어 주세요.'), N('튼튼한 고리', '여밈 방식을 적어 주세요.')] },
    use: { label: 'EVERYDAY', title: '손끝까지 반짝이게', desc: '착용했을 때의 느낌을 적어 주세요.' },
    size: { title: '사이즈 안내', chips: ['단위 cm', '체인 길이', '반지 호수'], note: '반지 호수는 가지고 있는 반지로 재어 보세요.' },
    care: { title: '오래 빛나는 관리법', items: [K('물기', '물에 닿으면 바로\n닦아 주세요'), K('향수', '향수·화장품은\n먼저 바른 뒤에'), K('따로', '하나씩 따로\n보관해 주세요'), K('천', '부드러운 천으로\n닦아 주세요')] },
    contents: { title: '구성', items: [['목걸이', '1개'], ['귀걸이', '1쌍'], ['보관 상자', '1개']] },
    notices: '· 조명에 따라 색이 조금 다르게 보일 수 있어요.\n· 금속 알레르기가 있다면 소재를 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  socks: {
    statement: { label: 'COZY TIME', text: '발끝이 포근하면 하루가 부드러워져요', sub: '소재와 두께를 적어 주세요.' },
    scene: { title: '다섯 가지 색을 골라요', lead: '색상 이름과 어울리는 옷을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '신을수록 좋은 이유', items: [P('폭신한 두께', '두께와 촉감을\n적어 주세요'), P('조이지 않는 목', '발목 밴드를\n적어 주세요'), P('보들보들 소재', '소재 비율을\n적어 주세요')] },
    zoom: { title: '짜임을 가까이에서', notes: [N('촘촘한 짜임', '짜임 방식을 적어 주세요.'), N('도톰한 바닥', '바닥 두께를 적어 주세요.'), N('편한 발목', '발목 길이를 적어 주세요.')] },
    use: { label: 'AT HOME', title: '집에서 보내는 느린 오후', desc: '신었을 때 느낌을 한두 줄로 적어 주세요.' },
    size: { title: '사이즈 안내', chips: ['단위 mm', '발 길이 기준', '프리 사이즈'], note: '신발 사이즈를 기준으로 골라 주세요.' },
    care: CLOTH_CARE,
    contents: { title: '구성', items: [['양말', '[0]켤레'], ['색상', '[0]가지'], MORE] },
    notices: FASHION_NOTICE,
  },
  hat: {
    statement: { label: 'COLOR PLAY', text: '모자 하나, 스카프 하나로 옷차림에 색을 더해요', sub: '색상과 소재를 적어 주세요.' },
    scene: { title: '고르는 재미가 있는 색', lead: '색상 이름과 어울리는 옷을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '포인트가 되는 이유', items: [P('선명한 색', '색상 이름을\n적어 주세요'), P('부드러운 소재', '소재와 두께를\n적어 주세요'), P('여러 연출', '쓰는 방법을\n적어 주세요')] },
    zoom: { title: '소재를 가까이에서', notes: [N('폭신한 울', '소재를 적어 주세요.'), N('매끄러운 실크', '스카프 소재를 적어 주세요.'), N('선명한 무늬', '무늬 이름을 적어 주세요.')] },
    use: { label: 'STREET STYLE', title: '골목길 산책에도 한 끗', desc: '쓰고 나갔을 때 느낌을 적어 주세요.' },
    size: { title: '사이즈 안내', chips: ['단위 cm', '머리 둘레', '스카프 크기'], note: '머리 둘레를 재어 골라 주세요.' },
    care: { title: '관리 방법', items: [K('손세탁', '찬물에 가볍게\n손세탁해 주세요'), K('모양', '모양을 잡아\n말려 주세요'), K('그늘', '그늘에서\n말려 주세요'), K('보관', '눌리지 않게\n보관해 주세요')] },
    contents: { title: '구성', items: [['모자', '1개'], ['스카프', '1장'], MORE] },
    notices: FASHION_NOTICE,
  },
  umbrella: {
    statement: { label: 'RAINY DAY', text: '비 오는 날에도 걸음이 가벼워지는 우산', sub: '크기와 무게의 장점을 적어 주세요.' },
    scene: { title: '빗길 위에서 펼쳐 보세요', lead: '펼쳤을 때 크기를 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '믿고 쓰는 이유', items: [P('넉넉한 크기', '펼친 지름을\n적어 주세요'), P('튼튼한 살대', '살대 수와 소재를\n적어 주세요'), P('물이 잘 빠짐', '원단을\n적어 주세요')] },
    zoom: { title: '손잡이를 가까이에서', notes: [N('나무 손잡이', '손잡이 소재를 적어 주세요.'), N('금속 마감', '마감 소재를 적어 주세요.'), N('물 빠지는 원단', '원단을 적어 주세요.')] },
    use: { label: 'CITY WALK', title: '빗속 산책도 여유롭게', desc: '쓰고 걸었을 때 느낌을 적어 주세요.' },
    size: { title: '크기 안내', chips: ['단위 cm', '펼친 지름', '접은 길이'], note: '펼친 지름과 접은 길이를 함께 적어 주세요.' },
    care: { title: '관리 방법', items: [K('펼쳐', '쓴 뒤에는 펼쳐서\n말려 주세요'), K('그늘', '그늘에서\n말려 주세요'), K('살대', '살대를 억지로\n꺾지 마세요'), K('보관', '마른 뒤 접어서\n보관해 주세요')] },
    contents: { title: '구성', items: [['우산', '1개'], ['우산 덮개', '1개'], MORE] },
    notices: FASHION_NOTICE,
  },
  keyring: {
    statement: { label: 'MY GOODS', text: '가방에 하나 달면 매일 보는 즐거움이 생겨요', sub: '모양과 색상 이야기를 적어 주세요.' },
    scene: { title: '같이 모으면 더 예뻐요', lead: '함께 쓰기 좋은 문구·소품을 알려 주세요.', caption: '사진 아래에 모양과 색상을 적어 주세요.' },
    points: { title: '달고 싶은 이유', items: [P('선명한 색', '색상 이름을\n적어 주세요'), P('가벼운 무게', '크기와 무게를\n적어 주세요'), P('튼튼한 고리', '고리 소재를\n적어 주세요')] },
    zoom: { title: '고리를 가까이에서', notes: [N('반짝이는 고리', '고리 소재를 적어 주세요.'), N('맑은 아크릴', '두께를 적어 주세요.'), N('튼튼한 연결', '연결 방식을 적어 주세요.')] },
    use: { label: 'ON MY BAG', title: '가방 지퍼에 톡', desc: '달았을 때 모습을 한두 줄로 적어 주세요.' },
    size: { title: '크기 안내', chips: ['단위 cm', '고리 포함', '1~2mm 차이'], note: '고리를 뺀 크기도 함께 적어 주세요.' },
    care: { title: '관리 방법', items: [K('천', '부드러운 천으로\n닦아 주세요'), K('열', '뜨거운 곳을\n피해 주세요'), K('보호', '보호 필름을\n떼고 써 주세요'), K('따로', '긁히지 않게\n따로 보관해요')] },
    contents: { title: '구성', items: [['키링', '1개'], ['고리', '1개'], MORE] },
    notices: '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 만드는 방식에 따라 작은 흠이 있을 수 있어요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  pajama: {
    statement: { label: 'SLEEP WELL', text: '잠들기 전 가장 편한 옷을 입는 시간', sub: '소재와 핏의 장점을 적어 주세요.' },
    scene: { title: '걸어 두어도 예쁜 옷', lead: '색상 이름과 소재를 알려 주세요.', caption: '사진 아래에 착용 사이즈를 적어 주세요.' },
    points: { title: '편하게 잠드는 이유', items: [P('부드러운 소재', '소재와 두께를\n적어 주세요'), P('넉넉한 핏', '핏을\n적어 주세요'), P('쉬운 세탁', '세탁 방법을\n적어 주세요')] },
    zoom: { title: '단추와 테두리를 가까이', notes: [N('자개 느낌 단추', '단추 소재를 적어 주세요.'), N('테두리 장식', '장식 방식을 적어 주세요.'), N('도톰한 원단', '원단 두께를 적어 주세요.')] },
    use: { label: 'SLOW MORNING', title: '창가에서 맞는 느린 아침', desc: '입었을 때 느낌을 한두 줄로 적어 주세요.' },
    size: CLOTH_SIZE, care: CLOTH_CARE,
    contents: { title: '구성', items: [['상의', '1장'], ['하의', '1장'], MORE] },
    notices: FASHION_NOTICE,
  },
  jacket: {
    statement: { label: 'RIDER MOOD', text: '입을수록 몸에 맞게 길드는 가죽 자켓', sub: '가죽 종류와 핏을 적어 주세요.' },
    scene: { title: '청바지 하나면 완성', lead: '함께 입으면 좋은 옷차림을 알려 주세요.', caption: '사진 아래에 착용 사이즈를 적어 주세요.' },
    points: { title: '오래 입게 되는 이유', items: [P('단단한 가죽', '가죽 종류를\n적어 주세요'), P('여유 있는 핏', '핏을\n적어 주세요'), P('튼튼한 지퍼', '지퍼 소재를\n적어 주세요')] },
    zoom: { title: '지퍼와 단추를 가까이', notes: [N('굵은 지퍼', '지퍼 소재를 적어 주세요.'), N('금속 단추', '단추 소재를 적어 주세요.'), N('자연스러운 주름', '가죽 결을 적어 주세요.')] },
    use: { label: 'CITY NIGHT', title: '비 오는 밤거리에도', desc: '입고 나갔을 때 느낌을 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '가죽 관리 안내', items: [K('전문', '세탁은 가죽 전문점에\n맡겨 주세요'), K('물기', '젖으면 마른 천으로\n닦아 주세요'), K('걸기', '넓은 옷걸이에\n걸어 주세요'), K('통풍', '통풍이 잘 되는 곳에\n두세요')] },
    contents: { title: '구성', items: [['자켓', '1벌'], ['보관 커버', '1개'], MORE] },
    notices: FASHION_NOTICE,
  },
  dress: {
    statement: { label: 'LINEN STORY', text: '햇살 좋은 날, 바람이 통하는 한 벌', sub: '소재와 핏의 장점을 적어 주세요.' },
    scene: { title: '단정하게 걸어 둔 모습', lead: '길이와 핏을 알려 주세요.', caption: '사진 아래에 착용 사이즈를 적어 주세요.' },
    points: { title: '여름에 손이 가는 이유', items: [P('시원한 린넨', '소재 비율을\n적어 주세요'), P('여유로운 핏', '핏과 길이를\n적어 주세요'), P('쉬운 코디', '어울리는 옷을\n적어 주세요')] },
    zoom: { title: '원단과 단추를 가까이', notes: [N('린넨 결', '원단 짜임을 적어 주세요.'), N('나무 단추', '단추 소재를 적어 주세요.'), N('깔끔한 박음질', '마감 방식을 적어 주세요.')] },
    use: { label: 'SUNSET WALK', title: '들꽃 사이를 걷는 저녁', desc: '입고 걸었을 때 느낌을 적어 주세요.' },
    size: CLOTH_SIZE, care: CLOTH_CARE,
    contents: { title: '구성', items: [['원피스', '1벌'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
}

// ── 템플릿 ──
// hero.bg = 첫 화면 바탕 — 사진이 첫 화면 전체를 덮는 구도(tone 'photo')는 그 사진의 평균색(거르기 색 = templateColorOf 규칙)
// pins = [대표, 연출, 확대, 사용 장면] 예시 사진 id (manifest samples — 이 세트 사진)
const pin = (cat, no, slugs, types = ['product', 'scene', 'detail', 'scene']) => slugs.map((s, i) => `sample-${cat}-${types[i]}-${s}-${no}`)
const B = (text, fill, ink, shape) => ({ text, fill, ink, ...(shape ? { shape } : {}) })
const LIST = [
  // ── 1차: 패션·잡화 10개 ──
  {
    key: 'shoot-pumps', category: 'bags', name: '구두', mood: 'clean', tone: 'photo', flow: 'fashionA', copy: 'pumps', body: 'pretendard',
    pins: pin('bag', '07', ['beige-pumps', 'pumps-linen-table', 'pumps-leather', 'pumps-street-walk']),
    hero: { comp: 'frame', bg: '#d6cbbc', font: 'noto-serif-kr', ink: '#3a2e25', accent: '#8a6a4f', title: '발끝까지\n우아하게', sub: '하루 종일 편한 신는 느낌을 적어 주세요', label: 'ELEGANT STEP' },
  },
  {
    key: 'shoot-boots', category: 'bags', name: '부츠', mood: 'premium', tone: 'black', flow: 'fashionB', copy: 'boots', body: 'noto-sans-kr',
    pins: pin('bag', '08', ['brown-boots', 'boots-fireplace', 'boots-zipper-stitch', 'boots-wearing']),
    hero: { comp: 'capsule', bg: '#17110c', font: 'noto-serif-kr', ink: '#f3e6d3', subInk: '#cbbba5', accent: '#c49a62', title: '겨울을\n걷는\n부츠', sub: '가죽과 밑창의 장점을 적어 주세요', label: 'WINTER BOOTS' },
  },
  {
    key: 'shoot-sandals', category: 'bags', name: '샌들', mood: 'friendly', tone: 'photo', flow: 'fashionC', copy: 'sandals', body: 'pretendard',
    pins: pin('bag', '09', ['leather-sandals', 'sandals-beach-mat', 'sandal-buckle', 'sandals-boardwalk']),
    hero: { comp: 'tape', bg: '#99bdc6', font: 'black-han-sans', tape: '#ffffff', tapeInk: '#0b3a5b', accent: '#0b6e99', labelInk: '#0b3a5b', subBg: '#0b3a5b', subInk: '#ffffff', title: '여름엔\n가볍게', sub: '가장 편한 점을 한 줄로 적어 주세요', label: 'SUMMER SANDAL' },
  },
  {
    key: 'shoot-jewelry', category: 'bags', name: '주얼리', mood: 'premium', tone: 'beige', flow: 'fashionA', copy: 'jewelry', body: 'noto-sans-kr',
    pins: pin('bag', '10', ['pearl-set', 'jewelry-dish', 'pearl-pendant', 'bracelet-ring-hand']),
    hero: { comp: 'vertical', side: 'left', bg: '#f4ece2', font: 'nanum-myeongjo', ink: '#4a3524', accent: '#b08a5a', title: '은\n은\n하\n게', sub: '소재와 디자인을 한 줄로 적어 주세요', label: 'FINE JEWELRY' },
  },
  {
    key: 'shoot-socks', category: 'bags', name: '양말', mood: 'friendly', tone: 'purple', flow: 'fashionB', copy: 'socks', body: 'pretendard',
    pins: pin('bag', '11', ['pastel-socks-stack', 'socks-flatlay', 'socks-rib-knit', 'socks-cozy-feet']),
    hero: { comp: 'tilt', bg: '#e6dcf3', font: 'do-hyeon', ink: '#3b2a5c', accent: '#f4a6c0', accent2: '#8fc7e8', title: '폭신한\n발끝', sub: '두께와 촉감을 한 줄로 적어 주세요', label: 'SOFT SOCKS', badge: B('5가지\n색상', '#3b2a5c', '#ffffff') },
  },
  {
    key: 'shoot-pajama', category: 'apparel', name: '파자마', mood: 'soft', tone: 'photo', flow: 'fashionC', copy: 'pajama', body: 'noto-sans-kr',
    pins: pin('apparel', '07', ['sage-pajama', 'pajama-hanger', 'pajama-button-piping', 'pajama-morning']),
    hero: { comp: 'cover', bg: '#c9c3b3', font: 'gowun-batang', ink: '#3d4a36', subInk: '#3d4a36', accent: '#6b7f5e', title: '포근한\n밤의 옷', sub: '입었을 때 느낌을 한 줄로 적어 주세요', label: 'SLEEP WEAR' },
  },
  {
    key: 'shoot-leather-jacket', category: 'apparel', name: '남성 가죽 자켓', mood: 'bold', tone: 'photo', flow: 'fashionA', copy: 'jacket', body: 'pretendard',
    pins: pin('apparel', '08', ['leather-jacket-rack', 'jacket-flatlay', 'jacket-zipper', 'jacket-city-night']),
    hero: { comp: 'posterDark', bg: '#1e2c2e', font: 'gasoek-one', ink: '#ffffff', subInk: '#d5dadc', accent: '#e8553d', title: '거칠고\n멋있게', sub: '가죽과 핏의 장점을 적어 주세요', label: 'LEATHER JACKET', issue: 'VOL 01' },
  },
  {
    key: 'shoot-linen-dress', category: 'apparel', name: '린넨 원피스', mood: 'clean', tone: 'blue', flow: 'fashionB', copy: 'dress', body: 'noto-sans-kr',
    pins: pin('apparel', '09', ['linen-dress', 'dress-mannequin', 'dress-button', 'dress-meadow-walk']),
    hero: { comp: 'magazine', side: 'left', bg: '#e6eef6', font: 'noto-serif-kr', ink: '#1d3557', accent: '#3a7bbf', line: '#9fb7d0', title: '바람이\n머무는\n원피스', sub: '소재와 핏을\n적어 주세요', label: 'LINEN DRESS', lines: ['시원한\n린넨 소재', '여유로운\n긴 기장', '[색상 이름]\n한 가지'] },
  },
  {
    key: 'shoot-hat-scarf', category: 'bags', name: '모자·스카프', mood: 'bold', tone: 'blue', flow: 'fashionC', copy: 'hat', body: 'pretendard',
    pins: pin('bag', '12', ['beret-scarf', 'hats-flatlay', 'beret-silk-texture', 'beret-street']),
    hero: { comp: 'pop', bg: '#246fd6', photoY: 540, font: 'black-han-sans', ink: '#ffffff', accent: '#1f5fc4', stroke: '#0d2b6b', strokeWidth: 8, subInk: '#eaf1ff', labelInk: '#ffe14d', title: '컬러로\n포인트', sub: '색상과 소재를 한 줄로 적어 주세요', label: 'COLOR POINT', badge: B('NEW', '#ffe14d', '#0d2b6b'), badgeX: 580, badgeY: 600 },
  },
  {
    key: 'shoot-umbrella', category: 'bags', name: '우산', mood: 'clean', tone: 'gray', flow: 'fashionA', copy: 'umbrella', body: 'pretendard',
    pins: pin('bag', '13', ['navy-umbrella', 'umbrella-wet-street', 'umbrella-handle', 'umbrella-rain-walk']),
    hero: { comp: 'vertical', side: 'right', bg: '#e8eaed', font: 'pretendard', ink: '#1f2d4a', accent: '#2f4a7a', radius: 24, title: '비\n오\n는\n날', sub: '크기와 무게를 한 줄로 적어 주세요', label: 'RAINY DAY' },
  },
]

const CAT_LABEL = { bags: '잡화·가방', apparel: '의류' }

/** 이 파일의 템플릿 key·바탕 계열 (목록 순서) — 갤러리 순서·섹션 모양은 studioTemplates.js가 정한 뒤 buildShootTemplate으로 만든다 */
export const SHOOT_KEYS = LIST.map(e => e.key)
export const SHOOT_TONES = Object.fromEntries(LIST.map(e => [e.key, e.tone]))

const isPhotoSec = s => !!s && s.photo !== undefined
const slotsIn = s => (isPhotoSec(s) ? [s.photo] : (s.items || []).filter(p => p.type === 'image' && p.slot !== undefined).map(p => p.slot))
const renumber = (s, f) => (isPhotoSec(s) ? { ...s, photo: f(s.photo) } : { ...s, items: s.items.map(p => (p.type === 'image' && p.slot !== undefined ? { ...p, slot: f(p.slot) } : p)) })

/**
 * 촬영 세트 템플릿 하나 — sv = 아래 섹션 모양 번호들 (studioTemplateSections.planSectionStyles), 없으면 모두 0번 모양.
 * 아래 섹션 색·글꼴 = 첫 화면을 따른다 (lowerTheme). 사진 자리 P·S·D·U → 페이지 위에서부터 0,1,2,3 (samplePins도 같은 차례로)
 */
export function buildShootTemplate(key, sv = {}) {
  const e = LIST.find(x => x.key === key)
  if (!e) return null
  const s = e.hero
  const th = lowerTheme({ bg: s.bg, ink: s.ink, accent: s.accent, badge: s.badge, font: s.font }, { body: e.body })
  const hero = { height: H, bg: s.bg, items: HEROES[s.comp](s) }
  const sections = [hero, ...FLOWS[e.flow](COPY[e.copy], th, sv)]
  const order = [...new Set(sections.flatMap(slotsIn))]
  const pack = new Map(order.map((n, i) => [n, i]))
  const pinOf = { P: e.pins[0], S: e.pins[1], D: e.pins[2], U: e.pins[3] }
  return {
    key: e.key, category: e.category, label: `${CAT_LABEL[e.category]} · ${e.name}`, desc: FLOW_DESC[e.flow], gap: 0, mood: e.mood, swatch: s.accent, tone: e.tone, heroComp: s.comp,
    samplePins: order.map(n => pinOf[n]),
    sections: sections.map(sec => renumber(sec, n => pack.get(n))).map(sec => (isPhotoSec(sec) ? sec : { ...sec, items: sec.items.map(p => (p.type === 'image' && Number.isInteger(p.slot) ? { ...p, sample: p.sample ?? SAMPLE_OF[order[p.slot]] } : p)) })),
  }
}
