/**
 * 촬영 세트 템플릿 34개 (1·2차 19 + 3차 패션 15) — 한 벌로 찍은 예시 사진 4장(대표·연출·확대·사용 장면, 니트만 3장)으로 만든 긴 상세페이지 (DOM·DB 없음)
 * node 테스트: scripts/test-studio-template-shoots.mjs (+ heroes·sections·gallery 테스트가 전체 목록으로 본다)
 *
 * ★ 모양은 studioTemplates.js 맨 위 설명과 같다 ({ key, label, desc, gap, sections } + category·mood·swatch·tone).
 *   첫 구간 = 780×1040(3:4) 첫 화면 — 대표 사진 + 큰 제목(높이의 30~42%) · 작은 영문 라벨 · 부제. 구도는 이 파일의 HEROES (기존 첫 화면 9구도와 다른 모양).
 *   아래 섹션 = studioTemplateSections의 종류 (모양 번호는 studioTemplates가 갤러리 순서로 정한다 — planSectionStyles).
 *   패션 = 소재 확대·착용 장면·사이즈 자리(표는 넣지 않음 — 고객이 [요소] → [사이즈표]에서 고른다)·관리 안내·구성
 *   식품 = 원재료·보관법·구성 / 유아·캠핑·인테리어 = 사용 장면·특징 3가지·구성품
 * ★ 사진 4장을 모두 한 번씩 쓴다. 사진 자리 번호는 페이지 위에서부터 0,1,2,3 (고객 사진이 위에서부터 차례로 들어간다).
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

/** 점선 네모 (선 4개 한 묶음 — 도형 테두리는 점선이 없어서) */
function dashRect(x, y, w, h, color, g) {
  const line = (lx, ly, len, rot) => ({ type: 'line', group: g, x: lx, y: ly, w: len, strokeWidth: 2, color, dash: 'dashed', ...(rot ? { rotation: 90 } : {}) })
  return [line(x, y, w), line(x, y + h - 2, w), line(x - h / 2 + 1, y + h / 2 - 1, h, true), line(x + w - h / 2 - 1, y + h / 2 - 1, h, true)]
}
/** 두 점을 잇는 선 (가운데 기준으로 돌린 선) */
function leg(x0, y0, x1, y1, color) {
  const len = Math.round(Math.hypot(x1 - x0, y1 - y0))
  return { type: 'line', x: Math.round((x0 + x1) / 2 - len / 2), y: Math.round((y0 + y1) / 2 - 1), w: len, strokeWidth: 2, color, rotation: Math.round((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI) }
}

// ── 첫 화면 구도 22가지 (1·2차 13 + 3차 9) — 모두 { items } (바탕색은 spec.bg) ──
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
    const gap = s.subBg ? 34 : 22
    const sb = sub(s.sub, s.subInk ?? s.ink, s.subBg ? 104 : 90, 140 + t.h + gap, 560)
    // subBg (선택) = 안내 글씨 뒤 반투명 띠 — 사진 속 물건(옷걸이 봉 등)과 제목에서 안내 글씨를 떼어 읽히게. 없으면 예전 그대로
    const sw = Math.ceil(textUnits(s.sub, 'pretendard') * 22) + 32
    return [
      photo(0, 0, W, H),
      ...(s.shade ? [rect(0, 0, W, 640, '#000000', { fillOpacity: s.shade })] : []),
      rect(56, 146, 10, t.h - 12, s.accent),
      label(s.label, s.labelInk ?? s.accent, 88, 96),
      t.part,
      ...(s.subBg ? [{ ...rect(88, sb.part.y - 8, sw, sb.h + 16, s.subBg, { fillOpacity: 0.72, radius: Math.round((sb.h + 16) / 2) }), group: 'pd' }, { ...sb.part, group: 'pd' }] : [sb.part]),
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
  /** 도장 — 사진 전면 + 왼쪽 위 제목 + 둥근 도장 배지 */
  stamp(s) {
    const t = title(s.title, s.font, s.ink, 60, 140, 680, s.target ?? 0.32)
    const sb = sub(s.sub, s.subInk ?? s.ink, 62, 140 + t.h + 18, 480)
    const d = 176, sx = 560, sy = s.stampY ?? 540
    const st = textH(s.stamp, 20, 1.3)
    return [
      photo(0, 0, W, H),
      label(s.label, s.labelInk ?? s.ink, 62, 96),
      t.part, sb.part,
      { type: 'shape', group: 'st', shape: 'ellipse', x: sx, y: sy, w: d, h: d, fill: s.stampFill, fillOpacity: 0.92 },
      { type: 'shape', group: 'st', shape: 'ellipse', x: sx + 10, y: sy + 10, w: d - 20, h: d - 20, fill: '', strokeWidth: 2, strokeColor: s.stampInk },
      { type: 'text', group: 'st', x: sx + 20, y: sy + Math.round((d - st) / 2), w: d - 40, text: s.stamp, fontSize: 20, fontWeight: 800, color: s.stampInk, fontFamily: 'pretendard', align: 'center', lineHeight: 1.3 },
    ]
  },
  /** 흰 안개 — 사진 전면 + 위쪽을 밝게 덮고 가운데 제목 · 아래 작은 영문 줄 */
  soft(s) {
    const t = title(s.title, s.font, s.ink, 40, 150, 700, s.target ?? 0.31, { align: 'center' })
    const sb = sub(s.sub, s.subInk ?? s.ink, 70, 150 + t.h + 16, 640, 'center')
    return [
      photo(0, 0, W, H),
      rect(0, 0, W, 560, WHITE, { fillOpacity: 0.5 }),
      label(s.label, s.labelInk ?? s.accent, 40, 96, 700, 'center'),
      t.part, sb.part,
      rect(W / 2 - 24, sb.part.y + sb.h + 22, 48, 3, s.accent),
    ]
  },
  /** 조명 — 짙은 바탕 · 은은한 빛 원 뒤 정사각 사진 + 금색 선 · 아래 큰 제목 */
  spotlight(s) {
    const ps = 450, px = (W - ps) / 2, py = 96
    const t = title(s.title, s.font, s.ink, 40, py + ps + 58, 700, s.target ?? 0.31, { align: 'center' })
    const sb = sub(s.sub, s.subInk ?? s.ink, 70, t.part.y + t.h + 16, 640, 'center', 21)
    return [
      { type: 'shape', shape: 'ellipse', x: px - 90, y: py - 70, w: ps + 180, h: ps + 140, fill: s.glow, fillOpacity: 0.22 },
      rect(px - 14, py - 14, ps + 28, ps + 28, '', { strokeWidth: 1, strokeColor: s.accent }),
      photo(px, py, ps, ps),
      label(s.label, s.labelInk ?? s.accent, 40, py + ps + 22, 700, 'center'),
      t.part, sb.part,
    ]
  },
  /** 액자 걸기 — 연한 바탕 · 가운데 제목 · 흰 여백 틀을 두른 사진 한 점 */
  mat(s) {
    const t = title(s.title, s.font, s.ink, 40, 140, 700, s.target ?? 0.31, { align: 'center' })
    const sb = sub(s.sub, s.subInk ?? s.ink, 70, 140 + t.h + 16, 640, 'center')
    const py = sb.part.y + sb.h + 46, ph = H - 70 - py, pw = Math.round(ph * 0.8)
    return [
      label(s.label, s.labelInk ?? s.accent, 40, 84, 700, 'center'),
      t.part, sb.part,
      photo((W - pw) / 2, py, pw, ph, { borderWidth: 26, borderColor: WHITE, shadow: 28 }),
      { type: 'line', x: 90, y: py + ph - 1, w: (W - pw) / 2 - 120, strokeWidth: 2, color: s.accent },
      { type: 'line', x: (W + pw) / 2 + 30, y: py + ph - 1, w: (W - pw) / 2 - 120, strokeWidth: 2, color: s.accent },
    ]
  },

  // ── 3차 (패션 15벌) — 세로로 긴 옷 = 옆 칸 제목(사진이 세로로 길게) · 아래쪽에 놓인 상품 = 사진 전면 + 위쪽 빈 곳에 제목 ──
  /** 옷걸이 봉 — 위쪽 가로 봉에 두 줄로 걸린 세로 사진 + 오른쪽 칸 제목 */
  rail(s) {
    const ry = 100, px = 24, pw = 460, py = 188, ph = H - 56 - py
    const cx0 = px + pw + 26, cw = W - 30 - cx0
    const t = title(s.title, s.font, s.ink, cx0, 340, cw, s.target ?? 0.31)
    const sb = sub(s.sub, s.subInk ?? s.ink, cx0, 340 + t.h + 24, cw, 'left', 19)
    const hx = px + pw / 2
    return [
      rect(24, ry, W - 48, 8, s.rod, { radius: 4 }),
      { type: 'shape', shape: 'ellipse', x: 12, y: ry - 8, w: 24, h: 24, fill: s.rod },
      { type: 'shape', shape: 'ellipse', x: W - 36, y: ry - 8, w: 24, h: 24, fill: s.rod },
      { type: 'shape', shape: 'ellipse', x: hx - 11, y: ry + 10, w: 22, h: 22, fill: '', strokeWidth: 3, strokeColor: s.rod },
      leg(hx, ry + 30, px + 40, py, s.rod), leg(hx, ry + 30, px + pw - 40, py, s.rod),
      photo(px, py, pw, ph, { shadow: 22 }),
      label(s.label, s.labelInk ?? s.accent, cx0, 300, cw),
      t.part, sb.part,
      rect(cx0, sb.part.y + sb.h + 26, 44, 3, s.accent),
    ]
  },
  /** 옷 라벨 — 왼쪽 세로 사진 + 오른쪽 박음질 라벨(제목 · 관리 표시 3개 · 부제) */
  careLabel(s) {
    const pw = 440, lx = pw + 32, lw = W - 28 - lx, ly = 160, lh = H - 70 - ly
    const tx = lx + 20, tw = lw - 40
    const t = title(s.title, s.font, s.ink, tx, ly + 96, tw, s.target ?? 0.31, { align: 'center' })
    const iy = ly + 96 + t.h + 52
    const sb = sub(s.sub, s.subInk ?? s.ink, tx, iy + 56 + 26, tw, 'center', 18)
    return [
      photo(0, 0, pw, H),
      rect(lx + 24, ly - 18, lw - 48, 18, s.accent, { radius: 4 }),
      rect(lx, ly, lw, lh, s.tag, { radius: 6 }),
      ...dashRect(lx + 12, ly + 12, lw - 24, lh - 24, s.accent, 'cl'),
      label(s.label, s.labelInk ?? s.accent, tx, ly + 46, tw, 'center'),
      t.part,
      rect(lx + lw / 2 - 20, ly + 96 + t.h + 22, 40, 3, s.accent),
      ...s.icons.flatMap((k, i) => {
        const x = tx + 8 + i * 80, g = `ci${i}`
        return [
          { type: 'shape', group: g, shape: 'ellipse', x, y: iy, w: 56, h: 56, fill: '', strokeWidth: 2, strokeColor: s.accent },
          { type: 'text', group: g, x: x - 4, y: iy + Math.round((56 - textH('가', 14, 1.2)) / 2), w: 64, text: k, fontSize: 14, fontWeight: 700, color: s.ink, fontFamily: 'pretendard', align: 'center', lineHeight: 1.2 },
        ]
      }),
      sb.part,
    ]
  },
  /** 행택 — 위에서 끈으로 내려온 큰 가격표 모양 카드(제목) + 오른쪽 세로 사진 (카드가 사진 가장자리를 살짝 덮음) */
  tag(s) {
    const px = 340, tx = 30, tw = 370, ty = 170, th = H - 90 - ty, hx = tx + tw / 2
    const t = title(s.title, s.font, s.tagInk, tx + 25, ty + 150, tw - 50, s.target ?? 0.31, { align: 'center', group: 'tg' })
    const sb = sub(s.sub, s.tagSub ?? s.tagInk, tx + 30, ty + 150 + t.h + 48, tw - 60, 'center', 19)
    return [
      photo(px, 0, W - px, H),
      { type: 'line', x: hx - (ty + 40) / 2, y: (ty + 40) / 2, w: ty + 40, strokeWidth: 2, color: s.string, rotation: 90 },
      { type: 'shape', group: 'tg', shape: 'rect', x: tx, y: ty, w: tw, h: th, fill: s.tag, radius: 28 },
      { type: 'shape', group: 'tg', shape: 'ellipse', x: hx - 20, y: ty + 28, w: 40, h: 40, fill: s.bg, strokeWidth: 3, strokeColor: s.accent },
      { ...label(s.label, s.labelInk ?? s.accent, tx, ty + 96, tw, 'center'), group: 'tg' },
      t.part,
      { type: 'shape', group: 'tg', shape: 'rect', x: hx - 22, y: ty + 150 + t.h + 22, w: 44, h: 3, fill: s.accent },
      { ...sb.part, group: 'tg' },
      { type: 'line', group: 'tg', x: tx + 30, y: ty + th - 70, w: tw - 60, strokeWidth: 2, color: s.accent, dash: 'dashed' },
    ]
  },
  /** 치수 도식 — 모눈 바탕 · 세로 사진 + 가로·세로 치수 화살표 · 오른쪽 칸 제목 */
  measure(s) {
    const items = []
    for (let x = 52; x < W; x += 52) items.push({ type: 'line', x: x - H / 2, y: H / 2 - 1, w: H, strokeWidth: 1, color: s.grid, rotation: 90 })
    for (let y = 52; y < H; y += 52) items.push({ type: 'line', x: 0, y, w: W, strokeWidth: 1, color: s.grid })
    const px = 96, py = 150, pw = 380, ph = 790
    const cx0 = px + pw + 30, cw = W - 30 - cx0
    const t = title(s.title, s.font, s.ink, cx0, 340, cw, s.target ?? 0.31)
    const sb = sub(s.sub, s.subInk ?? s.ink, cx0, 340 + t.h + 24, cw, 'left', 19)
    const chip = (x, y, w, text, g) => [
      { type: 'shape', group: g, shape: 'rect', x, y, w, h: 34, fill: s.bg, radius: 17, strokeWidth: 2, strokeColor: s.accent },
      { type: 'text', group: g, x, y: 34 / 2 + y - Math.round(textH('가', 15, 1.2) / 2), w, text, fontSize: 15, fontWeight: 700, color: s.accent, fontFamily: 'pretendard', align: 'center', lineHeight: 1.2 },
    ]
    const ay = py + ph + 34
    items.push(
      { type: 'line', x: 52 - ph / 2, y: py + ph / 2 - 1, w: ph, strokeWidth: 2, color: s.accent, startCap: 'arrow', endCap: 'arrow', rotation: 90 },
      ...chip(20, py + ph / 2 - 17, 64, '[00]', 'mv'),
      { type: 'line', x: px, y: ay, w: pw, strokeWidth: 2, color: s.accent, startCap: 'arrow', endCap: 'arrow' },
      ...chip(px + pw / 2 - 50, ay - 17, 100, '[00]cm', 'mh'),
      photo(px, py, pw, ph),
      label(s.label, s.labelInk ?? s.accent, cx0, 300, cw),
      t.part, sb.part,
      rect(cx0, sb.part.y + sb.h + 26, 44, 3, s.accent),
    )
    return items
  },
  /** L자 띠 — 사진 전면 + 위쪽 넓은 띠(제목) + 왼쪽 세로 띠(세로 영문 라벨) */
  corner(s) {
    const sw = 92, bh = s.bandH ?? 440
    const t = title(s.title, s.font, s.ink, sw + 44, 64, 500, s.target ?? 0.31)
    const sb = sub(s.sub, s.subInk ?? s.ink, sw + 46, 64 + t.h + 14, 480, 'left', 20)
    return [
      photo(0, 0, W, H),
      rect(0, 0, W, bh, s.band),
      rect(0, 0, sw, H, s.band),
      rect(sw, bh, W - sw, 6, s.accent),
      { ...label(s.label, s.labelInk ?? s.accent, sw / 2 - 180, H / 2 + 120, 360, 'center'), rotation: -90 },
      t.part, sb.part,
    ]
  },
  /** 박음질 상자 — 사진 전면 + 제목을 두른 점선 박음질 + 왼쪽 천 조각 · 부제는 제목 옆 */
  stitch(s) {
    const t = title(s.title, s.font, s.ink, 72, 100, 330, s.target ?? 0.31)
    const sb = sub(s.sub, s.subInk ?? s.ink, 432, 100 + t.h - 70, 190, 'left', 19)
    const bh = 100 + t.h + 18 - 36
    return [
      photo(0, 0, W, H),
      ...dashRect(40, 36, 600, bh, s.thread, 'sb'),
      rect(28, 110, 26, 130, s.accent, { radius: 4 }),
      label(s.label, s.labelInk ?? s.ink, 72, 58, 400),
      t.part, sb.part,
    ]
  },
  /** 색 견본 — 사진 전면 + 위쪽 빈 곳에 제목 · 오른쪽 위 색 동그라미 3개 */
  swatch(s) {
    const t = title(s.title, s.font, s.ink, 56, 96, 520, s.target ?? 0.31)
    const sb = sub(s.sub, s.subInk ?? s.ink, 58, 96 + t.h + 12, 500, 'left', 20)
    return [
      photo(0, 0, W, H),
      label(s.label, s.labelInk ?? s.ink, 58, 56),
      t.part, sb.part,
      ...s.chips.flatMap((c, i) => {
        const y = 170 + i * 96, g = `sw${i}`
        return [
          { type: 'shape', group: g, shape: 'ellipse', x: 624, y, w: 52, h: 52, fill: c, strokeWidth: 3, strokeColor: WHITE },
          { type: 'text', group: g, x: 600, y: y + 58, w: 100, text: s.chipLabel ?? '[색상]', fontSize: 14, fontWeight: 700, color: s.ink, fontFamily: 'pretendard', align: 'center', lineHeight: 1.2 },
        ]
      }),
    ]
  },
  /** 창틀 — 사진 전면 + 굵은 창틀 · 가로 창살 위쪽을 흐리게(제목은 왼쪽 칸 · 부제는 오른쪽 칸) */
  window(s) {
    const f = 26, tb = s.transom ?? 450, mx = W / 2 - 7
    const t = title(s.title, s.font, s.ink, 60, 92, mx - 76, s.target ?? 0.31)
    const sb = sub(s.sub, s.subInk ?? s.ink, mx + 44, tb - 150, W - f - mx - 70, 'left', 20)
    return [
      photo(0, 0, W, H),
      rect(0, 0, W, tb, s.veil, { fillOpacity: 0.8 }),
      rect(0, 0, W, f, s.frame), rect(0, H - f, W, f, s.frame), rect(0, 0, f, H, s.frame), rect(W - f, 0, f, H, s.frame),
      rect(0, tb, W, 16, s.frame), rect(mx, f, 14, tb - f, s.frame),
      { type: 'shape', shape: 'ellipse', x: W / 2 - 14, y: tb - 6, w: 28, h: 28, fill: s.accent },
      label(s.label, s.labelInk ?? s.ink, mx + 44, tb - 196, 300),
      t.part, sb.part,
    ]
  },
  /** 선반 — 벽에 단 선반 위 정사각 사진 + 위쪽 가운데 제목 */
  shelf(s) {
    const t = title(s.title, s.font, s.ink, 40, 140, 700, s.target ?? 0.31, { align: 'center' })
    const sb = sub(s.sub, s.subInk ?? s.ink, 70, 140 + t.h + 14, 640, 'center')
    const sy = H - 96, ps = sy - (sb.part.y + sb.h + 40), px = (W - ps) / 2
    return [
      label(s.label, s.labelInk ?? s.accent, 40, 84, 700, 'center'),
      t.part, sb.part,
      photo(px, sy - ps, ps, ps, { radius: 6, shadow: 18 }),
      rect(60, sy, W - 120, 20, s.board, { radius: 3 }),
      { type: 'shape', shape: 'triangle', x: 120, y: sy + 20, w: 40, h: 44, fill: s.board, rotation: 180 },
      { type: 'shape', shape: 'triangle', x: W - 160, y: sy + 20, w: 40, h: 44, fill: s.board, rotation: 180 },
    ]
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
  // 식품 — 문장 → 연출 → 원재료 → 확대 → 보관법 → 손질·포장 장면 → 구성 → 안내
  food: (c, th, v) => [
    section('statement', v.statement, c.statement, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('ingredient', v.ingredient, c.ingredient, th),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('storage', v.storage, c.storage, th),
    section('story', v.story, { ...c.use, slot: 'U', sample: 'hand' }, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ],
  // 식품 — 원재료가 먼저 (확대 → 원재료 → 문장 → 연출 → 드시는 법) → 보관법 → 장면 → 구성 → 안내
  foodB: (c, th, v) => [
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('ingredient', v.ingredient, c.ingredient, th),
    section('statement', v.statement, c.statement, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('steps', v.steps, c.steps, th),
    section('storage', v.storage, c.storage, th),
    section('story', v.story, { ...c.use, slot: 'U', sample: 'hand' }, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ],
  // 유아·캠핑·인테리어 — 문장 → 특징 3가지 → 사용 장면 → 확대 → 연출 → 추천 → 구성품 → 순서·관리 → 안내
  living: (c, th, v) => [
    section('statement', v.statement, c.statement, th),
    section('points', v.points, c.points, th),
    section('story', v.story, { ...c.use, slot: 'U', sample: 'hand' }, th),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('recommend', v.recommend, c.recommend, th),
    section('contents', v.contents, c.contents, th),
    c.steps ? section('steps', v.steps, c.steps, th) : section('care', v.care, c.care, th),
    notice(c, th, v),
  ],
  // ── 3차 (패션 15벌) — 모두 소재 안내(fabric) · 사이즈 자리 · 세탁·관리. 착용 사진이 없는 세트(니트)는 착용 장면을 뺀다 ──
  // 의류 — 착용 장면 → 소재 확대 → 소재 안내 → 특징 → 연출 → 사이즈 자리 → 세탁 → 구성 → 안내
  wearA: (c, th, v) => [
    use(c, th, v),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('fabric', v.fabric, c.fabric, th),
    section('points', v.points, c.points, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('care', v.care, c.care, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ].filter(Boolean),
  // 의류 — 문장 → 연출 → 소재 안내 → 소재 확대 → 특징 → 착용 장면 → 사이즈 자리 → 세탁 → 구성 → 안내
  wearB: (c, th, v) => [
    section('statement', v.statement, c.statement, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('fabric', v.fabric, c.fabric, th),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('points', v.points, c.points, th),
    use(c, th, v),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('care', v.care, c.care, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ].filter(Boolean),
  // 의류 — 소재 확대 → 소재 안내 → 착용 장면 → 추천 → 연출 → 사이즈 자리 → 세탁 → 구성 → 안내
  wearC: (c, th, v) => [
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('fabric', v.fabric, c.fabric, th),
    use(c, th, v),
    section('recommend', v.recommend, c.recommend, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('care', v.care, c.care, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ].filter(Boolean),
  // 잡화 — 연출 → 특징 → 확대 → 제품 정보 → 사용 장면 → 크기 자리 → 관리 → 구성 → 안내
  accA: (c, th, v) => [
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('points', v.points, c.points, th),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('fabric', v.fabric, c.fabric, th),
    use(c, th, v),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('care', v.care, c.care, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ].filter(Boolean),
  // 잡화 — 문장 → 사용 장면 → 확대 → 제품 정보 → 추천 → 연출 → 크기 자리 → 관리 → 구성 → 안내
  accB: (c, th, v) => [
    section('statement', v.statement, c.statement, th),
    use(c, th, v),
    section('zoom', v.zoom, { ...c.zoom, slot: 'D', sample: 'detail' }, th),
    section('fabric', v.fabric, c.fabric, th),
    section('recommend', v.recommend, c.recommend, th),
    section('detail1', v.detail1, { ...c.scene, slot: 'S', sample: 'scene' }, th),
    section('sizeSlot', v.sizeSlot, c.size, th),
    section('care', v.care, c.care, th),
    section('contents', v.contents, c.contents, th),
    notice(c, th, v),
  ].filter(Boolean),
}
/** 착용·사용 장면 (사진 4 — 없는 세트는 null) */
function use(c, th, v) {
  return c.use ? section('story', v.story, { ...c.use, slot: 'U', sample: c.useSample ?? 'scene' }, th) : null
}
const FLOW_DESC = {
  fashionA: '대표 사진 → 브랜드 문장 → 연출 → 특징 3가지 → 소재 확대 → 착용 장면 → 사이즈 자리 → 관리 → 구성 → 안내',
  fashionB: '대표 사진 → 착용 장면 → 브랜드 문장 → 소재 확대 → 특징 3가지 → 연출 → 관리 → 사이즈 자리 → 구성 → 안내',
  fashionC: '대표 사진 → 소재 확대 → 특징 3가지 → 연출 → 브랜드 문장 → 착용 장면 → 사이즈 자리 → 구성 → 관리 → 안내',
  food: '대표 사진 → 브랜드 문장 → 연출 → 원재료 → 확대 → 보관법 → 손질·포장 장면 → 구성 → 안내',
  foodB: '대표 사진 → 확대 → 원재료 → 브랜드 문장 → 연출 → 드시는 법 → 보관법 → 장면 → 구성 → 안내',
  living: '대표 사진 → 브랜드 문장 → 특징 3가지 → 사용 장면 → 확대 → 연출 → 추천 → 구성품 → 순서·관리 → 안내',
  wearA: '대표 사진 → 착용 장면 → 소재 확대 → 소재 안내 → 특징 3가지 → 연출 → 사이즈 자리 → 세탁·관리 → 구성 → 안내',
  wearB: '대표 사진 → 브랜드 문장 → 연출 → 소재 안내 → 소재 확대 → 특징 3가지 → 착용 장면 → 사이즈 자리 → 세탁·관리 → 구성 → 안내',
  wearC: '대표 사진 → 소재 확대 → 소재 안내 → 착용 장면 → 추천 → 연출 → 사이즈 자리 → 세탁·관리 → 구성 → 안내',
  accA: '대표 사진 → 연출 → 특징 3가지 → 확대 → 제품 정보 → 사용 장면 → 크기 자리 → 관리 → 구성 → 안내',
  accB: '대표 사진 → 브랜드 문장 → 사용 장면 → 확대 → 제품 정보 → 추천 → 연출 → 크기 자리 → 관리 → 구성 → 안내',
}
/** 착용 사진이 없는 세트의 흐름 설명 (착용 장면을 뺀 글) */
const flowDesc = e => (e.pins.length < 4 ? FLOW_DESC[e.flow].replace(' → 착용 장면', '') : FLOW_DESC[e.flow])

// ── 문구 ──
const P = (title, desc) => ({ title, desc })
const N = (t, d) => ({ t, d })
const K = (k, t) => ({ k, t })
const FASHION_NOTICE = '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 재는 방법에 따라 1~3cm 차이가 날 수 있어요.\n· 궁금한 점은 문의를 남겨 주세요.'
const SHOE_NOTICE = '· 발볼·발등에 따라 신는 느낌이 다를 수 있어요.\n· 실내에서 먼저 신어 본 뒤 교환을 신청해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.'
const FOOD_NOTICE = '· 받으신 날 바로 보관 방법대로 보관해 주세요.\n· 알레르기가 있다면 원재료를 꼭 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.'
const SHOE_CARE = { title: '오래 신는 관리법', items: [K('마른천', '먼지는 마른 천으로\n닦아 주세요'), K('그늘', '젖으면 그늘에서\n말려 주세요'), K('모양', '종이를 넣어\n모양을 잡아 주세요'), K('크림', '가죽 크림으로\n가끔 닦아 주세요')] }
const SHOE_SIZE = { title: '사이즈 안내', chips: ['단위 mm', '발 길이 기준', '반 치수 차이'], note: '발볼이 넓다면 반 치수 크게 골라 주세요.' }
const CLOTH_SIZE = { title: '사이즈 안내', chips: ['단위 cm', '평평하게 재요', '1~3cm 차이'], note: '가지고 있는 옷과 비교해 골라 주세요.' }
const CLOTH_CARE = { title: '세탁·관리 안내', items: [K('30°', '미지근한 물에\n세탁해 주세요'), K('단독', '처음에는 따로\n세탁해 주세요'), K('그늘', '뒤집어서 그늘에\n말려 주세요'), K('다림', '낮은 온도로\n다려 주세요')] }
const MORE = ['[구성품 이름]', '[수량]']
// 소재 안내 (3차) — 느낌 칸 3단계 · 표시한 칸(on)은 예시
const FEEL_STEPS = {
  thick: ['두께', ['얇음', '보통', '도톰']], stretch: ['신축성', ['없음', '약간', '좋음']], sheer: ['비침', ['없음', '약간', '있음']],
  weight: ['무게', ['가벼움', '보통', '묵직']], size: ['크기', ['작음', '보통', '넉넉']], firm: ['단단함', ['부드러움', '보통', '단단함']],
  room: ['수납', ['적음', '보통', '넉넉']], width: ['폭', ['좁음', '보통', '넓음']], tint: ['렌즈 색', ['연함', '보통', '진함']],
  rim: ['테 두께', ['얇음', '보통', '두꺼움']], hold: ['고정', ['가볍게', '보통', '단단히']],
}
const FEEL = Object.fromEntries(Object.entries(FEEL_STEPS).map(([key, [k, steps]]) => [key, on => ({ k, steps, on })]))
const CLOTH_FEEL = (thick, stretch, sheer) => [FEEL.thick(thick), FEEL.stretch(stretch), FEEL.sheer(sheer)]
const FAB = (mix, feel, title = '소재 안내') => ({ title, mix, feel, note: '표시한 칸은 예시예요. 상품에 맞는 칸으로 바꿔 주세요.' })

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
  croaker: {
    statement: { label: 'FROM THE SEA', text: '바닷바람에 말려 맛이 깊어졌어요', sub: '말리는 방법과 산지를 적어 주세요.' },
    scene: { title: '밥상에 올리기 좋게', lead: '어울리는 반찬과 요리를 알려 주세요.', caption: '사진 아래에 구성과 중량을 적어 주세요.' },
    ingredient: { title: '원재료 및 정보', rows: [['원재료명', '[원재료 이름]'], ['원산지', '[원산지]'], ['내용량', '[000]g · [00]마리'], ['보관 방법', '[냉동 보관]'], ['제조일', '[별도 표시]']] },
    zoom: { title: '결을 가까이에서', notes: [N('노릇한 빛깔', '색과 윤기를 적어 주세요.'), N('도톰한 살', '크기와 두께를 적어 주세요.'), N('깨끗한 손질', '손질 방법을 적어 주세요.')] },
    storage: { title: '이렇게 보관해 주세요', items: [{ k: '냉동', v: '[-18]℃ 이하', t: '오래 두고 드실 때' }, { k: '냉장', v: '[0~5]℃', t: '받은 뒤 [0]일 안에\n드실 때' }, { k: '해동', v: '냉장실에서', t: '먹기 전날\n옮겨 주세요' }] },
    use: { label: 'PACKED WITH CARE', title: '한 마리씩 꼼꼼하게 담아요', desc: '포장 방법과 배송 이야기를 적어 주세요.' },
    contents: { title: '구성', items: [['[상품 이름]', '[00]마리'], ['보냉 포장', '1개'], MORE] },
    notices: FOOD_NOTICE,
  },
  fruit: {
    statement: { label: 'FRESH PICK', text: '제철에 딴 과일을 가장 맛있을 때 보내요', sub: '산지와 수확 이야기를 적어 주세요.' },
    scene: { title: '잘랐을 때 더 맛있어 보여요', lead: '당도와 식감을 알려 주세요.', caption: '사진 아래에 품종과 크기를 적어 주세요.' },
    ingredient: { title: '상품 정보', rows: [['품종', '[품종 이름]'], ['원산지', '[산지]'], ['중량', '[0]kg · [00]과'], ['크기', '[중과·대과]'], ['수확 시기', '[0월]']] },
    zoom: { title: '껍질까지 싱싱하게', notes: [N('윤기 나는 껍질', '색과 윤기를 적어 주세요.'), N('단단한 과육', '식감을 적어 주세요.'), N('고른 크기', '크기 기준을 적어 주세요.')] },
    storage: { title: '보관 방법', items: [{ k: '냉장', v: '[0~5]℃', t: '비닐에 담아\n보관해 주세요' }, { k: '실온', v: '서늘한 곳', t: '[0]일 안에\n드셔 주세요' }, { k: '따로', v: '과일끼리', t: '다른 과일과\n떨어뜨려 두세요' }] },
    steps: { title: '맛있게 드시는 법', items: [P('씻기', '흐르는 물에\n씻어 주세요'), P('자르기', '먹기 좋게\n잘라 주세요'), P('차갑게', '조금 차갑게 두면\n더 맛있어요')] },
    use: { label: 'GIFT READY', title: '한 알씩 감싸서 담아요', desc: '포장과 배송 이야기를 적어 주세요.' },
    contents: { title: '구성', items: [['[품종 이름]', '[0]kg'], ['선물 상자', '1개'], MORE] },
    notices: '· 과일은 크기·색이 조금씩 다를 수 있어요.\n· 받으신 날 바로 상태를 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  coffee: {
    statement: { label: 'SLOW BREW', text: '한 잔을 천천히 내리는 동안 아침이 시작돼요', sub: '원두 이야기를 적어 주세요.' },
    scene: { title: '갓 볶은 원두를 담아요', lead: '볶는 날짜와 향을 알려 주세요.', caption: '사진 아래에 원두 이름과 중량을 적어 주세요.' },
    ingredient: { title: '원두 정보', rows: [['원두', '[원두 이름]'], ['산지', '[산지]'], ['볶음 정도', '[중간 볶음]'], ['향', '[향 설명]'], ['중량', '[000]g']] },
    zoom: { title: '볶은 원두를 가까이', notes: [N('고른 색', '볶은 정도를 적어 주세요.'), N('기름진 윤기', '향과 맛을 적어 주세요.'), N('신선한 향', '볶는 날짜를 적어 주세요.')] },
    storage: { title: '원두 보관법', items: [{ k: '밀폐', v: '공기 차단', t: '봉투를 꼭\n닫아 주세요' }, { k: '실온', v: '서늘한 곳', t: '햇빛을\n피해 주세요' }, { k: '빨리', v: '[0]주 안에', t: '볶은 뒤 빨리\n드셔 주세요' }] },
    steps: { title: '맛있게 내리는 법', items: [P('갈기', '[중간] 굵기로\n갈아 주세요'), P('뜸', '물을 조금 부어\n기다려 주세요'), P('내리기', '천천히 나눠\n부어 주세요')] },
    use: { label: 'HAND DRIP', title: '천천히 내리는 한 잔', desc: '내리는 방법과 맛을 적어 주세요.' },
    contents: { title: '구성', items: [['원두', '[000]g'], ['[구성품 이름]', '[수량]'], ['안내 카드', '1장']] },
    notices: FOOD_NOTICE,
  },
  health: {
    statement: { label: 'DAILY HABIT', text: '하루 한 번, 나를 챙기는 작은 습관', sub: '제품 이야기를 적어 주세요.' },
    scene: { title: '식탁 위에 두고 챙겨요', lead: '보관하기 좋은 자리를 알려 주세요.', caption: '사진 아래에 제품 이름과 용량을 적어 주세요.' },
    ingredient: { title: '제품 정보', rows: [['원료', '[원료 이름]'], ['내용량', '[00]정 · [0]개월분'], ['섭취 방법', '[하루 0번, 0정]'], ['보관 방법', '[서늘한 곳]'], ['제조원', '[제조원]']] },
    zoom: { title: '한 알을 가까이에서', notes: [N('작은 크기', '알 크기를 적어 주세요.'), N('맑은 색', '제형을 적어 주세요.'), N('편한 섭취', '먹는 방법을 적어 주세요.')] },
    storage: { title: '보관 방법', items: [{ k: '실온', v: '서늘한 곳', t: '햇빛을\n피해 주세요' }, { k: '밀폐', v: '뚜껑 닫기', t: '먹은 뒤 꼭\n닫아 주세요' }, { k: '손길', v: '어린이 주의', t: '손이 닿지 않는\n곳에 두세요' }] },
    steps: { title: '이렇게 드세요', items: [P('물 한 잔', '물과 함께\n드세요'), P('정해진 양', '표시된 양을\n지켜 주세요'), P('같은 시간', '매일 같은 때\n드시면 좋아요')] },
    use: { label: 'MORNING ROUTINE', title: '아침을 여는 한 알', desc: '드시는 때와 방법을 적어 주세요.' },
    contents: { title: '구성', items: [['[제품 이름]', '[00]정'], ['[구성품 이름]', '[수량]'], ['안내서', '1장']] },
    notices: '· 제품 표시 사항을 꼭 확인해 주세요.\n· 알레르기가 있다면 원료를 먼저 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  gift: {
    statement: { label: 'WITH HEART', text: '고마운 마음을 곱게 싸서 전해요', sub: '선물 구성 이야기를 적어 주세요.' },
    scene: { title: '열어 보는 순간까지 특별하게', lead: '상자와 구성을 알려 주세요.', caption: '사진 아래에 구성과 중량을 적어 주세요.' },
    ingredient: { title: '선물 구성 정보', rows: [['구성', '[구성품 이름]'], ['원산지', '[원산지]'], ['내용량', '[000]g × [0]개'], ['포장', '[보자기 포장]'], ['보관 방법', '[서늘한 곳]']] },
    zoom: { title: '매듭까지 정성스럽게', notes: [N('고운 보자기', '보자기 소재를 적어 주세요.'), N('단정한 매듭', '매듭 방식을 적어 주세요.'), N('든든한 상자', '상자 소재를 적어 주세요.')] },
    storage: { title: '보관 방법', items: [{ k: '실온', v: '서늘한 곳', t: '받으신 뒤\n바로 옮겨 주세요' }, { k: '냉장', v: '[0~5]℃', t: '연 뒤에는\n냉장 보관해요' }, { k: '기한', v: '[별도 표시]', t: '표시된 날까지\n드셔 주세요' }] },
    use: { label: 'GIVING', title: '두 손으로 건네는 마음', desc: '선물하기 좋은 날을 적어 주세요.' },
    contents: { title: '구성', items: [['선물 상자', '1개'], ['보자기', '1장'], ['쇼핑백', '1개']] },
    notices: '· 명절 즈음에는 배송이 늦어질 수 있어요.\n· 받는 분 주소와 연락처를 꼭 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  baby: {
    statement: { label: 'GENTLE TOUCH', text: '아기 피부에 처음 닿는 옷이니까 더 순하게', sub: '소재와 만든 방식을 적어 주세요.' },
    points: { title: '엄마 아빠가 고르는 이유', items: [P('부드러운 면', '소재를\n적어 주세요'), P('순한 마감', '봉제 방식을\n적어 주세요'), P('쉬운 입히기', '여밈 방식을\n적어 주세요')] },
    use: { label: 'EVERY DAY', title: '매일 개어 두는 작은 옷', desc: '입히고 벗기는 모습을 적어 주세요.' },
    zoom: { title: '바느질을 가까이에서', notes: [N('겉 박음질', '봉제 방식을 적어 주세요.'), N('도톰한 면', '원단 두께를 적어 주세요.'), N('순한 색', '염색 방식을 적어 주세요.')] },
    scene: { title: '아기 방에 걸어 두어도 예뻐요', lead: '색상 구성을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    recommend: { title: '이런 분께 추천해요', lines: ['출산 선물을 고르는 분', '부드러운 면 옷을 찾는 분', '세탁이 쉬운 옷이 필요한 분'] },
    contents: { title: '구성품', items: [['바디수트', '1장'], ['모자', '1개'], ['[구성품 이름]', '[수량]']] },
    care: { title: '세탁 안내', items: [K('30°', '미지근한 물에\n세탁해 주세요'), K('중성', '순한 세제를\n써 주세요'), K('단독', '처음에는 따로\n세탁해 주세요'), K('그늘', '그늘에서\n말려 주세요')] },
    notices: '· 처음 입히기 전에 한 번 세탁해 주세요.\n· 사용 연령과 사이즈를 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  camping: {
    statement: { label: 'OUTDOOR MOOD', text: '해가 지면 숲속 작은 불빛이 하루를 밝혀요', sub: '제품 이야기를 적어 주세요.' },
    points: { title: '캠핑에서 빛나는 이유', items: [P('은은한 불빛', '밝기 단계를\n적어 주세요'), P('튼튼한 몸체', '소재를\n적어 주세요'), P('쉬운 사용', '켜는 방법을\n적어 주세요')] },
    use: { label: 'BY THE FIRE', title: '모닥불 옆 따뜻한 한 잔', desc: '캠핑장에서 쓰는 모습을 적어 주세요.' },
    zoom: { title: '불빛을 가까이에서', notes: [N('따뜻한 빛', '빛 색을 적어 주세요.'), N('튼튼한 틀', '몸체 소재를 적어 주세요.'), N('걸기 쉬운 고리', '고리 모양을 적어 주세요.')] },
    scene: { title: '텐트 옆에 두면 완성', lead: '함께 쓰기 좋은 캠핑 용품을 알려 주세요.', caption: '사진 아래에 크기와 무게를 적어 주세요.' },
    recommend: { title: '이런 캠핑에 좋아요', lines: ['숲속 오토 캠핑을 즐기는 분', '감성 캠핑 소품을 찾는 분', '밤 시간을 오래 즐기는 분'] },
    contents: { title: '구성품', items: [['[제품 이름]', '1개'], ['보관 가방', '1개'], ['[구성품 이름]', '[수량]']] },
    steps: { title: '사용 순서', items: [P('꺼내기', '구성품을\n확인해 주세요'), P('켜기', '켜는 방법을\n적어 주세요'), P('보관', '다 쓴 뒤\n말려 두세요')] },
    notices: '· 불을 쓰는 제품은 주변을 꼭 살펴 주세요.\n· 텐트 안에서는 사용 방법을 지켜 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  interior: {
    statement: { label: 'HOME STYLING', text: '작은 소품 하나로 방 안의 공기가 달라져요', sub: '소재와 분위기를 적어 주세요.' },
    points: { title: '집에 두면 좋은 이유', items: [P('자연스러운 색', '색상 이름을\n적어 주세요'), P('손으로 빚은 결', '만든 방식을\n적어 주세요'), P('어디든 어울림', '어울리는 공간을\n적어 주세요')] },
    use: { label: 'EVENING', title: '초를 켜는 저녁 시간', desc: '공간에 두었을 때 분위기를 적어 주세요.' },
    zoom: { title: '유약의 결을 가까이', notes: [N('도톰한 유약', '유약 느낌을 적어 주세요.'), N('자연스러운 점', '무늬 이야기를 적어 주세요.'), N('묵직한 바닥', '무게를 적어 주세요.')] },
    scene: { title: '선반 위에 두어 보세요', lead: '함께 두면 좋은 소품을 알려 주세요.', caption: '사진 아래에 크기를 적어 주세요.' },
    recommend: { title: '이런 공간에 어울려요', lines: ['햇빛이 드는 창가', '작은 선반이 있는 거실', '향이 필요한 침실'] },
    contents: { title: '구성품', items: [['화병', '1개'], ['[구성품 이름]', '[수량]'], ['선물 포장', '[선택]']] },
    care: { title: '관리 방법', items: [K('천', '마른 천으로\n닦아 주세요'), K('물기', '물기는 바로\n닦아 주세요'), K('충격', '떨어뜨리지 않게\n조심해 주세요'), K('자리', '평평한 곳에\n두세요')] },
    notices: '· 손으로 만들어 모양과 색이 조금씩 달라요.\n· 조명에 따라 색이 다르게 보일 수 있어요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },

  // ── 3차: 패션 15벌 (소재 안내 fabric · 사이즈 자리 · 세탁·관리) ──
  blouse: {
    statement: { label: 'OFFICE DAILY', text: '리본 하나로 단정함과 부드러움을 함께 담았어요', sub: '소재와 핏의 장점을 적어 주세요.' },
    scene: { title: '반듯하게 개어 둔 모습', lead: '함께 입기 좋은 옷을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    fabric: FAB([['겉감', '[폴리 00% · 레이온 00%]'], ['안감', '[없음]'], ['색상', '[아이보리]']], CLOTH_FEEL(0, 1, 1)),
    zoom: { title: '소매 끝을 가까이', notes: [N('싸개 단추', '단추 모양을 적어 주세요.'), N('깔끔한 박음질', '마감 방식을 적어 주세요.'), N('부드러운 원단', '원단 이름을 적어 주세요.')] },
    points: { title: '손이 자주 가는 이유', items: [P('은은한 광택', '원단의 느낌을\n적어 주세요'), P('리본 칼라', '묶는 방법을\n적어 주세요'), P('단추 여밈', '단추 소재를\n적어 주세요')] },
    use: { label: 'BY THE WINDOW', title: '창가에 선 오후의 뒷모습', desc: '입었을 때 느낌을 한두 줄로 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('손세탁', '찬물에 가볍게\n손세탁해 주세요'), K('그늘', '그늘에서\n말려 주세요'), K('다림', '낮은 온도로\n다려 주세요'), K('걸기', '옷걸이에 걸어\n보관해 주세요')] },
    contents: { title: '구성', items: [['블라우스', '1장'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
  knit: {
    statement: { label: 'WARM KNIT', text: '꽈배기 무늬가 겨울 옷차림을 포근하게 해요', sub: '실 굵기와 짜임을 적어 주세요.' },
    scene: { title: '침대 위에 개어 둔 니트', lead: '색상 구성을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    fabric: FAB([['겉감', '[울 00% · 아크릴 00%]'], ['안감', '[없음]'], ['색상', '[색상 이름]']], CLOTH_FEEL(2, 1, 0)),
    zoom: { title: '단추와 짜임을 가까이', notes: [N('꽈배기 무늬', '무늬 이름을 적어 주세요.'), N('나무 단추', '단추 크기를 적어 주세요.'), N('포근한 실', '실 소재를 적어 주세요.')] },
    points: { title: '포근하게 입는 이유', items: [P('도톰한 짜임', '짜임 방식을\n적어 주세요'), P('나무 단추', '단추 소재를\n적어 주세요'), P('넉넉한 핏', '핏을\n적어 주세요')] },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('울코스', '울 코스로\n세탁해 주세요'), K('눕혀', '눕혀서\n말려 주세요'), K('보풀', '보풀은 살살\n떼어 주세요'), K('개기', '개어서\n보관해 주세요')] },
    contents: { title: '구성', items: [['가디건', '1장'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
  coat: {
    zoom: { title: '칼라를 가까이에서', notes: [N('단정한 칼라', '칼라 모양을 적어 주세요.'), N('촘촘한 모직', '원단 이름을 적어 주세요.'), N('겉 박음질', '마감 방식을 적어 주세요.')] },
    fabric: FAB([['겉감', '[울 00% · 폴리 00%]'], ['안감', '[폴리 100%]'], ['색상', '[카멜]']], [FEEL.thick(2), FEEL.weight(1), FEEL.stretch(0)]),
    use: { label: 'AUTUMN WALK', title: '낙엽 길을 걷는 오후', desc: '입고 걸었을 때 느낌을 한두 줄로 적어 주세요.' },
    recommend: { title: '이런 분께 추천해요', lines: ['오래 입을 기본 코트를 찾는 분', '출근과 주말에 함께 입을 분', '허리끈으로 핏을 바꾸고 싶은 분'] },
    scene: { title: '의자에 걸쳐 둔 코트', lead: '어울리는 옷차림을 알려 주세요.', caption: '사진 아래에 착용 사이즈를 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('전문', '드라이클리닝을\n맡겨 주세요'), K('솔질', '입은 뒤 옷솔로\n털어 주세요'), K('걸기', '두꺼운 옷걸이에\n걸어 주세요'), K('통풍', '통풍이 잘 되는\n곳에 두세요')] },
    contents: { title: '구성', items: [['코트', '1벌'], ['허리끈', '1개'], MORE] },
    notices: FASHION_NOTICE,
  },
  padding: {
    use: { label: 'SNOW WALK', title: '눈 내린 숲길에서도 든든하게', desc: '입고 나갔을 때 느낌을 한두 줄로 적어 주세요.' },
    zoom: { title: '지퍼와 누빔을 가까이', notes: [N('튼튼한 지퍼', '지퍼 소재를 적어 주세요.'), N('도톰한 누빔', '누빔 간격을 적어 주세요.'), N('매끈한 겉감', '겉감 소재를 적어 주세요.')] },
    fabric: FAB([['겉감', '[나일론 100%]'], ['충전재', '[충전재 이름]'], ['색상', '[블랙]']], [FEEL.thick(2), FEEL.weight(0), FEEL.stretch(0)]),
    points: { title: '겨울에 손이 가는 이유', items: [P('포근한 충전재', '충전재를\n적어 주세요'), P('가벼운 무게', '무게를\n적어 주세요'), P('모자 달린 목', '목 높이를\n적어 주세요')] },
    scene: { title: '창가 옷걸이에 걸어 둔 모습', lead: '함께 챙기면 좋은 소품을 알려 주세요.', caption: '사진 아래에 착용 사이즈를 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('세탁망', '세탁망에 넣어\n세탁해 주세요'), K('중성', '중성 세제를\n써 주세요'), K('두드려', '말린 뒤 두드려\n부풀려 주세요'), K('걸기', '접지 말고\n걸어 주세요')] },
    contents: { title: '구성', items: [['패딩', '1벌'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
  denim: {
    use: { label: 'CITY WALK', title: '운동화와 걷는 가벼운 하루', desc: '입고 걸었을 때 느낌을 한두 줄로 적어 주세요.' },
    zoom: { title: '리벳과 스티치를 가까이', notes: [N('구릿빛 리벳', '리벳 소재를 적어 주세요.'), N('주황 스티치', '실 색을 적어 주세요.'), N('탄탄한 데님', '원단 두께를 적어 주세요.')] },
    fabric: FAB([['겉감', '[면 00% · 스판 00%]'], ['워싱', '[미디엄 블루]'], ['핏', '[일자 핏]']], CLOTH_FEEL(1, 1, 0)),
    points: { title: '매일 입게 되는 이유', items: [P('편한 일자 핏', '핏을\n적어 주세요'), P('은은한 워싱', '색을\n적어 주세요'), P('튼튼한 박음질', '마감을\n적어 주세요')] },
    scene: { title: '세 가지 색으로 골라요', lead: '색상 이름을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('뒤집어', '뒤집어서\n세탁해 주세요'), K('단독', '처음에는 따로\n세탁해 주세요'), K('찬물', '찬물로\n세탁해 주세요'), K('그늘', '그늘에서\n말려 주세요')] },
    contents: { title: '구성', items: [['청바지', '1벌'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
  skirt: {
    statement: { label: 'GARDEN MOOD', text: '걸을 때마다 주름이 살랑이는 한 벌', sub: '길이와 소재를 적어 주세요.' },
    scene: { title: '침대 위에 펼쳐 둔 스커트', lead: '함께 입으면 좋은 옷을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    fabric: FAB([['겉감', '[폴리 100%]'], ['안감', '[있음]'], ['허리', '[밴드]']], CLOTH_FEEL(0, 1, 1)),
    zoom: { title: '주름을 가까이에서', notes: [N('고른 주름', '주름 간격을 적어 주세요.'), N('은은한 광택', '원단 느낌을 적어 주세요.'), N('가벼운 원단', '원단 무게를 적어 주세요.')] },
    points: { title: '입을수록 좋은 이유', items: [P('흐르는 주름', '주름 모양을\n적어 주세요'), P('편한 밴드', '허리 방식을\n적어 주세요'), P('긴 기장', '기장을\n적어 주세요')] },
    use: { label: 'GARDEN WALK', title: '꽃길을 걷는 오후', desc: '입고 걸었을 때 느낌을 한두 줄로 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('손세탁', '찬물에 가볍게\n손세탁해 주세요'), K('세탁망', '세탁망에 넣어\n주세요'), K('걸기', '걸어서\n말려 주세요'), K('주름', '주름을 따라\n말려 주세요')] },
    contents: { title: '구성', items: [['스커트', '1장'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
  slacks: {
    zoom: { title: '허리 여밈을 가까이', notes: [N('숨은 고리', '여밈 방식을 적어 주세요.'), N('반듯한 주름', '앞 주름을 적어 주세요.'), N('부드러운 결', '원단 느낌을 적어 주세요.')] },
    fabric: FAB([['겉감', '[폴리 00% · 레이온 00%]'], ['안감', '[없음]'], ['핏', '[와이드 핏]']], CLOTH_FEEL(1, 1, 0)),
    use: { label: 'OFFICE WALK', title: '로비를 걷는 출근길', desc: '입고 걸었을 때 느낌을 한두 줄로 적어 주세요.' },
    recommend: { title: '이런 분께 추천해요', lines: ['단정한 출근 바지를 찾는 분', '편한 와이드 핏을 좋아하는 분', '셔츠와 니트에 두루 입을 분'] },
    scene: { title: '책상 위에 개어 둔 모습', lead: '함께 입으면 좋은 옷을 알려 주세요.', caption: '사진 아래에 착용 사이즈를 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('세탁망', '세탁망에 넣어\n세탁해 주세요'), K('그늘', '그늘에서\n말려 주세요'), K('다림', '주름을 따라\n다려 주세요'), K('걸기', '바지 걸이에\n걸어 주세요')] },
    contents: { title: '구성', items: [['슬랙스', '1벌'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
  shirt: {
    zoom: { title: '칼라와 단추를 가까이', notes: [N('단정한 칼라', '칼라 모양을 적어 주세요.'), N('하얀 단추', '단추 소재를 적어 주세요.'), N('옥스퍼드 결', '원단 짜임을 적어 주세요.')] },
    fabric: FAB([['겉감', '[면 100%]'], ['짜임', '[옥스퍼드]'], ['색상', '[하늘색]']], CLOTH_FEEL(1, 0, 1)),
    use: { label: 'MORNING', title: '소매 단추를 채우는 아침', desc: '입었을 때 느낌을 한두 줄로 적어 주세요.' },
    recommend: { title: '이런 분께 추천해요', lines: ['매일 입을 기본 셔츠를 찾는 분', '넥타이 없이도 단정하고 싶은 분', '여러 색을 함께 고르는 분'] },
    scene: { title: '세 가지 색으로 쌓아 둔 모습', lead: '색상 이름을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('30°', '미지근한 물에\n세탁해 주세요'), K('단독', '처음에는 따로\n세탁해 주세요'), K('걸어', '옷걸이에 걸어\n말려 주세요'), K('다림', '칼라부터\n다려 주세요')] },
    contents: { title: '구성', items: [['셔츠', '1장'], MORE, ['[구성품 이름]', '[수량]']] },
    notices: FASHION_NOTICE,
  },
  active: {
    statement: { label: 'MOVE FREELY', text: '몸에 부드럽게 붙어 움직임이 가벼워요', sub: '소재와 신축성을 적어 주세요.' },
    scene: { title: '세 가지 색으로 골라요', lead: '색상 이름을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    fabric: FAB([['겉감', '[나일론 00% · 스판 00%]'], ['안감', '[없음]'], ['색상', '[라벤더 외 0색]']], CLOTH_FEEL(1, 2, 0)),
    zoom: { title: '박음질을 가까이에서', notes: [N('납작한 박음질', '박음질 방식을 적어 주세요.'), N('매끈한 겉면', '원단 느낌을 적어 주세요.'), N('탄탄한 밴드', '밴드 폭을 적어 주세요.')] },
    points: { title: '운동할 때 좋은 이유', items: [P('늘어나는 원단', '신축성을\n적어 주세요'), P('편한 허리', '허리 밴드를\n적어 주세요'), P('세트 구성', '구성을\n적어 주세요')] },
    use: { label: 'YOGA TIME', title: '매트 위에서 가볍게', desc: '입고 움직였을 때 느낌을 적어 주세요.' },
    size: CLOTH_SIZE,
    care: { title: '세탁·관리 안내', items: [K('찬물', '찬물로\n세탁해 주세요'), K('세탁망', '세탁망에 넣어\n주세요'), K('그늘', '그늘에서\n말려 주세요'), K('자연', '바람에\n말려 주세요')] },
    contents: { title: '구성', items: [['상의', '1장'], ['레깅스', '1장'], MORE] },
    notices: FASHION_NOTICE,
  },
  kids: {
    zoom: { title: '코듀로이를 가까이', notes: [N('도톰한 골', '골 굵기를 적어 주세요.'), N('동그란 주머니', '주머니 모양을 적어 주세요.'), N('부드러운 면', '소재를 적어 주세요.')] },
    fabric: FAB([['상의', '[면 00% · 아크릴 00%]'], ['하의', '[면 100%]'], ['색상', '[머스터드 · 네이비]']], CLOTH_FEEL(1, 1, 0)),
    use: { label: 'PARK DAY', title: '손잡고 걷는 공원 산책', desc: '입고 뛰놀았을 때 모습을 적어 주세요.' },
    recommend: { title: '이런 분께 추천해요', lines: ['아이 가을옷을 한 번에 고르는 분', '뛰놀기 편한 옷을 찾는 분', '선물할 아이 옷을 고르는 분'] },
    scene: { title: '옷걸이에 걸어 둔 아이 옷', lead: '색상 구성을 알려 주세요.', caption: '사진 아래에 사이즈를 적어 주세요.' },
    size: { title: '사이즈 안내', chips: ['단위 cm', '키 기준', '1~3cm 차이'], note: '아이 키와 몸무게를 기준으로 골라 주세요.' },
    care: { title: '세탁·관리 안내', items: [K('30°', '미지근한 물에\n세탁해 주세요'), K('중성', '순한 세제를\n써 주세요'), K('뒤집어', '뒤집어서\n세탁해 주세요'), K('그늘', '그늘에서\n말려 주세요')] },
    contents: { title: '구성', items: [['니트', '1장'], ['바지', '1장'], MORE] },
    notices: '· 처음 입히기 전에 한 번 세탁해 주세요.\n· 아이 키와 사이즈를 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  tote: {
    scene: { title: '카페 의자 위의 토트백', lead: '넣기 좋은 물건을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '매일 들게 되는 이유', items: [P('넉넉한 수납', '들어가는 물건을\n적어 주세요'), P('튼튼한 손잡이', '손잡이 길이를\n적어 주세요'), P('부드러운 가죽', '가죽 종류를\n적어 주세요')] },
    zoom: { title: '박음질을 가까이에서', notes: [N('꼼꼼한 박음질', '바느질 방식을 적어 주세요.'), N('자연스러운 결', '가죽 결을 적어 주세요.'), N('마감된 가장자리', '마감 방식을 적어 주세요.')] },
    fabric: FAB([['소재', '[소가죽]'], ['안감', '[면]'], ['여밈', '[지퍼]']], [FEEL.size(2), FEEL.weight(1), FEEL.firm(1)], '제품 정보'),
    use: { label: 'ON THE SHOULDER', title: '어깨에 메고 걷는 골목', desc: '들고 나갔을 때 느낌을 한두 줄로 적어 주세요.' },
    size: { title: '크기 안내', chips: ['단위 cm', '가로·세로·폭', '손잡이 길이'], note: '노트북·책이 들어가는지 함께 적어 주세요.' },
    care: { title: '관리 방법', items: [K('마른천', '마른 천으로\n닦아 주세요'), K('물기', '젖으면 바로\n닦아 주세요'), K('속지', '속을 채워\n보관해 주세요'), K('통풍', '통풍이 잘 되는\n곳에 두세요')] },
    contents: { title: '구성', items: [['토트백', '1개'], ['보관 주머니', '1개'], MORE] },
    notices: FASHION_NOTICE,
  },
  wallet: {
    statement: { label: 'LEATHER GOODS', text: '손에 쥐었을 때 딱 맞는 크기의 지갑', sub: '가죽과 수납 칸을 적어 주세요.' },
    use: { label: 'EVERY DAY', title: '카드 한 장을 꺼내는 순간', desc: '쓸 때 편한 점을 한두 줄로 적어 주세요.' },
    zoom: { title: '가장자리를 가까이', notes: [N('단단한 가장자리', '마감 방식을 적어 주세요.'), N('촘촘한 무늬', '가죽 무늬를 적어 주세요.'), N('꼼꼼한 박음질', '바느질을 적어 주세요.')] },
    fabric: FAB([['소재', '[소가죽]'], ['카드 칸', '[0]칸'], ['색상', '[블랙 외 0색]']], [FEEL.thick(0), FEEL.room(1), FEEL.weight(0)], '제품 정보'),
    recommend: { title: '이런 분께 추천해요', lines: ['얇은 지갑을 찾는 분', '가죽 선물을 고르는 분', '카드만 가볍게 챙기는 분'] },
    scene: { title: '책상 위에 늘어놓은 구성', lead: '색상과 종류를 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    size: { title: '크기 안내', chips: ['단위 cm', '가로·세로', '두께'], note: '접었을 때와 펼쳤을 때 크기를 적어 주세요.' },
    care: { title: '관리 방법', items: [K('마른천', '마른 천으로\n닦아 주세요'), K('물기', '젖으면 바로\n닦아 주세요'), K('습기', '습한 곳을\n피해 주세요'), K('크림', '가죽 크림으로\n가끔 닦아 주세요')] },
    contents: { title: '구성', items: [['지갑', '1개'], ['선물 상자', '1개'], MORE] },
    notices: FASHION_NOTICE,
  },
  belt: {
    scene: { title: '세 가지 색으로 골라요', lead: '어울리는 신발과 옷을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    points: { title: '오래 쓰게 되는 이유', items: [P('단단한 가죽', '가죽 종류를\n적어 주세요'), P('은빛 버클', '버클 소재를\n적어 주세요'), P('넉넉한 구멍', '구멍 수를\n적어 주세요')] },
    zoom: { title: '버클을 가까이에서', notes: [N('반짝이는 버클', '버클 소재를 적어 주세요.'), N('겉 박음질', '실 색을 적어 주세요.'), N('튼튼한 구멍', '구멍 간격을 적어 주세요.')] },
    fabric: FAB([['소재', '[소가죽]'], ['버클', '[금속]'], ['폭', '[0.0]cm']], [FEEL.width(1), FEEL.thick(1), FEEL.firm(2)], '제품 정보'),
    use: { label: 'DRESS UP', title: '셔츠 위로 단정하게', desc: '맸을 때 느낌을 한두 줄로 적어 주세요.' },
    size: { title: '길이 안내', chips: ['단위 cm', '버클 포함', '허리둘레 기준'], note: '가지고 있는 벨트와 길이를 비교해 주세요.' },
    care: { title: '관리 방법', items: [K('마른천', '마른 천으로\n닦아 주세요'), K('물기', '젖으면 바로\n닦아 주세요'), K('말아서', '둥글게 말아\n보관해 주세요'), K('크림', '가죽 크림으로\n가끔 닦아 주세요')] },
    contents: { title: '구성', items: [['벨트', '1개'], ['보관 상자', '1개'], MORE] },
    notices: FASHION_NOTICE,
  },
  sunglass: {
    statement: { label: 'SUMMER LIGHT', text: '햇살 좋은 날, 바다 앞에서 더 빛나요', sub: '렌즈와 테 이야기를 적어 주세요.' },
    use: { label: 'BY THE SEA', title: '파도 앞에서 잠시 쉬어 가요', desc: '썼을 때 느낌을 한두 줄로 적어 주세요.' },
    zoom: { title: '경첩을 가까이에서', notes: [N('튼튼한 경첩', '경첩 소재를 적어 주세요.'), N('얼룩무늬 테', '테 소재를 적어 주세요.'), N('맑은 렌즈', '렌즈 색을 적어 주세요.')] },
    fabric: FAB([['테', '[아세테이트]'], ['렌즈', '[렌즈 소재]'], ['색상', '[브라운]']], [FEEL.weight(0), FEEL.tint(1), FEEL.rim(2)], '제품 정보'),
    recommend: { title: '이런 분께 추천해요', lines: ['얼굴형에 맞는 테를 찾는 분', '여름 여행을 준비하는 분', '매일 쓸 선글라스를 찾는 분'] },
    scene: { title: '라탄 가방 위의 세 가지 색', lead: '색상 이름을 알려 주세요.', caption: '사진 아래에 색상 이름을 적어 주세요.' },
    size: { title: '크기 안내', chips: ['단위 mm', '렌즈 가로', '다리 길이'], note: '가지고 있는 안경과 크기를 비교해 주세요.' },
    care: { title: '관리 방법', items: [K('천', '전용 천으로\n닦아 주세요'), K('케이스', '케이스에 넣어\n보관해 주세요'), K('열', '뜨거운 차 안을\n피해 주세요'), K('물기', '물기는 바로\n닦아 주세요')] },
    contents: { title: '구성', items: [['선글라스', '1개'], ['케이스', '1개'], ['닦는 천', '1장']] },
    notices: '· 조명에 따라 색이 조금 다르게 보일 수 있어요.\n· 렌즈 정보는 상품 표시를 확인해 주세요.\n· 궁금한 점은 문의를 남겨 주세요.',
  },
  hairacc: {
    scene: { title: '쟁반 위에 모아 둔 헤어 소품', lead: '색상과 종류를 알려 주세요.', caption: '사진 아래에 구성과 색상을 적어 주세요.' },
    points: { title: '고르는 재미가 있는 이유', items: [P('여러 가지 색', '색상 구성을\n적어 주세요'), P('부드러운 벨벳', '소재를\n적어 주세요'), P('진주 장식', '장식을\n적어 주세요')] },
    zoom: { title: '진주와 벨벳을 가까이', notes: [N('동그란 진주', '진주 크기를 적어 주세요.'), N('포근한 벨벳', '소재를 적어 주세요.'), N('금빛 핀', '핀 소재를 적어 주세요.')] },
    fabric: FAB([['소재', '[벨벳 · 금속]'], ['장식', '[인조 진주]'], ['구성', '[0]종']], [FEEL.size(1), FEEL.hold(1), FEEL.weight(0)], '제품 정보'),
    use: { label: 'HAIR STYLING', title: '리본으로 묶은 뒷머리', desc: '했을 때 모습을 한두 줄로 적어 주세요.' },
    size: { title: '크기 안내', chips: ['단위 cm', '핀 길이', '밴드 지름'], note: '머리숱에 맞는 크기를 함께 적어 주세요.' },
    care: { title: '관리 방법', items: [K('손세탁', '찬물에 가볍게\n손세탁해 주세요'), K('그늘', '그늘에서\n말려 주세요'), K('따로', '하나씩 따로\n보관해 주세요'), K('물기', '금속은 물기를\n닦아 주세요')] },
    contents: { title: '구성', items: [['곱창 밴드', '[0]개'], ['헤어핀', '[0]개'], ['리본 핀', '[0]개']] },
    notices: FASHION_NOTICE,
  },
}

// ── 템플릿 19개 ──
// hero.bg = 첫 화면 바탕 — 사진이 첫 화면 전체를 덮는 구도(tone 'photo')는 그 사진의 평균색(거르기 색 = templateColorOf 규칙)
// pins = [대표, 연출, 확대, 사용 장면] 예시 사진 id (manifest samples — 이 세트 사진)
const pin = (cat, no, slugs, types = ['product', 'scene', 'detail', 'scene']) => slugs.map((s, i) => `sample-${cat}-${types[i]}-${s}-${no}`)
const FOOD_TYPES = ['product', 'scene', 'detail', 'hand']
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
    // 기본(0.34)이면 제목 아래가 안내 글씨·옷걸이 봉까지 내려와 겹쳐 보였다 (S3-3) → 제목 0.3(규칙 30~42% 안) + 안내 글씨는 제목과 더 떼고 어두운 띠 위에
    hero: { comp: 'posterDark', target: 0.3, subBg: '#0b1112', bg: '#1e2c2e', font: 'gasoek-one', ink: '#ffffff', subInk: '#d5dadc', accent: '#e8553d', title: '거칠고\n멋있게', sub: '가죽과 핏의 장점을 적어 주세요', label: 'LEATHER JACKET', issue: 'VOL 01' },
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
  // ── 2차: 9개 ──
  {
    key: 'shoot-dried-fish', category: 'food', name: '건어물', mood: 'friendly', tone: 'photo', flow: 'food', copy: 'croaker', body: 'pretendard',
    pins: pin('food', '09', ['dried-yellow-croaker', 'dried-anchovy-bowls', 'croaker-skin', 'fish-packing'], FOOD_TYPES),
    hero: { comp: 'stamp', bg: '#c2ab8e', font: 'do-hyeon', ink: '#3b2a17', accent: '#b5651d', title: '바다의\n맛 그대로', sub: '산지와 말리는 방법을 적어 주세요', label: 'FROM THE SEA', stamp: '[가게 이름]\n바다 직송', stampFill: '#fff8ee', stampInk: '#9a4a12' },
  },
  {
    key: 'shoot-supplement', category: 'health', name: '건강식품', mood: 'clean', tone: 'photo', flow: 'foodB', copy: 'health', body: 'pretendard',
    pins: pin('health', '09', ['supplement-bottle', 'tablets-herbs', 'omega-capsule', 'morning-supplement'], FOOD_TYPES),
    hero: { comp: 'soft', bg: '#dee8e0', font: 'pretendard', ink: '#1f4d3f', accent: '#2f8f6f', title: '매일의\n작은 습관', sub: '제품을 한 줄로 소개해 주세요', label: 'DAILY HEALTH' },
  },
  {
    key: 'shoot-holiday-gift', category: 'gift', name: '명절 선물', mood: 'premium', tone: 'red', flow: 'food', copy: 'gift', body: 'noto-sans-kr',
    pins: pin('gift', '09', ['bojagi-gift-box', 'lacquer-gift-box', 'bojagi-knot', 'gift-giving'], FOOD_TYPES),
    hero: { comp: 'spotlight', bg: '#2a1216', font: 'nanum-myeongjo', ink: '#f1d9a6', subInk: '#d9c2b0', accent: '#c9a45c', glow: '#b8434f', title: '마음을\n담은 선물', sub: '선물 구성을 한 줄로 적어 주세요', label: 'GIFT SET' },
  },
  {
    key: 'shoot-fruit', category: 'food', name: '제철 과일', mood: 'friendly', tone: 'photo', flow: 'foodB', copy: 'fruit', body: 'pretendard',
    pins: pin('food', '10', ['fruit-basket', 'apple-pear-board', 'apple-droplets', 'fruit-box-packing'], FOOD_TYPES),
    hero: { comp: 'pop', bg: '#d1c1aa', font: 'black-han-sans', ink: '#d62839', accent: '#d62839', stroke: '#ffffff', strokeWidth: 10, subInk: '#4a2a12', labelInk: '#8a2a1a', title: '제철 과일\n한 바구니', sub: '산지와 당도를 한 줄로 적어 주세요', label: 'FRESH FRUIT', badge: B('제철\n수확', '#d62839', '#ffffff'), badgeX: 590, badgeY: 590 },
  },
  {
    key: 'shoot-coffee', category: 'food', name: '원두 커피', mood: 'soft', tone: 'beige', flow: 'foodB', copy: 'coffee', body: 'noto-sans-kr',
    pins: pin('food', '11', ['coffee-bean-bag', 'coffee-bean-scoop', 'roasted-beans', 'pour-over'], FOOD_TYPES),
    hero: { comp: 'magazine', side: 'right', bg: '#ece1d2', font: 'gowun-batang', ink: '#3b2a1e', accent: '#8d5b3e', line: '#c9b39a', title: '천천히\n내리는\n아침', sub: '원두 이야기를\n적어 주세요', label: 'SLOW COFFEE', lines: ['[원두 이름]\n갓 볶은 원두', '[산지]\n한 곳의 맛', '[000]g\n한 봉'] },
  },
  {
    key: 'shoot-baby', category: 'baby', name: '유아복', mood: 'soft', tone: 'pink', flow: 'living', copy: 'baby', body: 'pretendard',
    pins: pin('baby', '01', ['baby-clothes-set', 'nursery-hanger', 'cotton-seam', 'folding-baby-clothes'], FOOD_TYPES),
    hero: { comp: 'capsule', pw: 440, bg: '#f9e4e4', font: 'gowun-batang', ink: '#5a3a3a', subInk: '#7a5a58', accent: '#d9918f', title: '순하고\n부드럽게', sub: '소재와 만든 방식을 적어 주세요', label: 'BABY CARE', badge: B('출산\n선물', '#d9918f', '#ffffff') },
  },
  {
    key: 'shoot-camping', category: 'camping', name: '캠핑 랜턴', mood: 'bold', tone: 'photo', flow: 'living', copy: 'camping', body: 'pretendard',
    pins: pin('camping', '01', ['lantern-table', 'forest-tent', 'lantern-glow', 'campfire-coffee'], FOOD_TYPES),
    hero: { comp: 'posterDark', bg: '#7c6749', shade: 0.46, font: 'pretendard', ink: '#ffffff', subInk: '#f1e6d6', accent: '#f2a93b', title: '숲에서\n보내는\n하룻밤', sub: '캠핑에서 좋은 점을 적어 주세요', label: 'CAMPING NIGHT', issue: 'OUTDOOR 01' },
  },
  {
    key: 'shoot-interior', category: 'interior', name: '인테리어 소품', mood: 'premium', tone: 'gray', flow: 'living', copy: 'interior', body: 'noto-sans-kr',
    pins: pin('interior', '01', ['dried-flower-vase', 'floating-shelf', 'ceramic-glaze', 'candle-lighting'], FOOD_TYPES),
    hero: { comp: 'mat', bg: '#ecebe8', font: 'noto-serif-kr', ink: '#2f2b27', subInk: '#5f5850', accent: '#9a8f82', title: '머물고\n싶은 집', sub: '소재와 분위기를 한 줄로 적어 주세요', label: 'HOME STYLING' },
  },
  {
    key: 'shoot-keyring', category: 'bags', name: '키링 굿즈', mood: 'bold', tone: 'photo', flow: 'fashionB', copy: 'keyring', body: 'pretendard',
    pins: pin('bag', '14', ['acrylic-keyrings', 'stationery-flatlay', 'keyring-clip', 'keyring-bag']),
    hero: { comp: 'tape', bg: '#e7cf65', font: 'gasoek-one', tape: '#111111', tapeInk: '#fff066', accent: '#111111', labelInk: '#111111', subBg: '#ffffff', subInk: '#111111', title: '가방에\n톡!', sub: '모양과 크기를 한 줄로 적어 주세요', label: 'KEYRING GOODS' },
  },
  // ── 3차: 패션 15벌 (batch 3 — 앞 19개 뒤에 이어 붙인다) ──
  // 세로로 긴 옷 = 옆 칸 제목 구도(치수 도식·옷걸이 봉·행택·옷 라벨) / 상품이 사진 아래쪽에 놓인 세트 = 사진 전면 + 위쪽 빈 곳 제목(박음질·색 견본·창틀·L자 띠) · 선반
  {
    key: 'shoot-bow-blouse', batch: 3, category: 'apparel', name: '리본 블라우스', mood: 'soft', tone: 'beige', flow: 'wearB', copy: 'blouse', body: 'noto-sans-kr',
    pins: pin('apparel', '10', ['ivory-bow-blouse', 'blouse-stone-table', 'blouse-cuff-button', 'blouse-window-back']),
    hero: { comp: 'measure', bg: '#efe7dc', grid: '#e3d8c9', font: 'nanum-myeongjo', target: 0.32, ink: '#3b2f26', accent: '#9a7550', title: '리본을\n묶는\n단정한\n하루', sub: '소재와 핏을\n적어 주세요', label: 'BOW BLOUSE' },
  },
  {
    key: 'shoot-cable-knit', batch: 3, category: 'apparel', name: '꽈배기 니트', mood: 'soft', tone: 'photo', flow: 'wearB', copy: 'knit', body: 'noto-sans-kr',
    pins: pin('apparel', '11', ['cable-cardigan-stool', 'knit-bed-flatlay', 'knit-wood-button']),
    hero: { comp: 'stitch', bg: '#baa387', font: 'gowun-batang', ink: '#3b2c1f', thread: '#6b4f36', accent: '#a8764f', title: '포근한\n겨울\n가디건', sub: '실과 짜임을\n적어 주세요', label: 'CABLE KNIT' },
  },
  {
    key: 'shoot-wool-coat', batch: 3, category: 'apparel', name: '울 코트', mood: 'premium', tone: 'orange', flow: 'wearC', copy: 'coat', body: 'noto-sans-kr',
    pins: pin('apparel', '12', ['camel-coat-mannequin', 'coat-armchair', 'coat-lapel', 'coat-autumn-walk']),
    hero: { comp: 'measure', bg: '#dcc7a7', grid: '#cfb893', font: 'noto-serif-kr', target: 0.32, ink: '#3a2a1c', accent: '#7a4e2d', title: '가을을\n닮은\n낙타색\n코트', sub: '원단과 핏을\n적어 주세요', label: 'WOOL COAT' },
  },
  {
    key: 'shoot-puffer', batch: 3, category: 'apparel', name: '패딩', mood: 'bold', tone: 'black', flow: 'wearA', copy: 'padding', body: 'pretendard',
    pins: pin('apparel', '13', ['black-puffer', 'puffer-window-rack', 'puffer-zipper', 'puffer-snow-walk']),
    hero: { comp: 'rail', bg: '#1a1d22', rod: '#9aa3ad', font: 'black-han-sans', ink: '#ffffff', subInk: '#c9ced6', accent: '#7fb2ff', title: '눈길도\n가볍게\n걷는\n패딩', sub: '보온과 무게를\n적어 주세요', label: 'DOWN JACKET' },
  },
  {
    key: 'shoot-daily-denim', batch: 3, category: 'apparel', name: '청바지', mood: 'friendly', tone: 'beige', flow: 'wearA', copy: 'denim', body: 'pretendard',
    pins: pin('apparel', '14', ['denim-bench', 'denim-stack', 'denim-rivet', 'denim-street-walk']),
    hero: { comp: 'tag', bg: '#f1ece2', tag: '#2c4566', tagInk: '#ffffff', tagSub: '#c9d6e8', string: '#2c4566', font: 'black-han-sans', ink: '#2c4566', accent: '#e0a458', title: '매일\n입는\n청바지', sub: '핏과 워싱을\n적어 주세요', label: 'DAILY DENIM' },
  },
  {
    key: 'shoot-pleats-skirt', batch: 3, category: 'apparel', name: '플리츠 스커트', mood: 'soft', tone: 'green', flow: 'wearB', copy: 'skirt', body: 'noto-sans-kr',
    pins: pin('apparel', '15', ['pleats-skirt-hanger', 'skirt-bed-flatlay', 'pleats-texture', 'skirt-garden-walk']),
    hero: { comp: 'careLabel', bg: '#dfe6d8', tag: '#fbfaf5', font: 'gowun-batang', ink: '#2f3d2b', accent: '#6f8a67', icons: ['손세탁', '그늘', '걸기'], title: '살랑\n이는\n주름', sub: '길이와 소재를\n적어 주세요', label: 'PLEATS SKIRT' },
  },
  {
    key: 'shoot-wide-slacks', batch: 3, category: 'apparel', name: '와이드 슬랙스', mood: 'clean', tone: 'gray', flow: 'wearC', copy: 'slacks', body: 'pretendard',
    pins: pin('apparel', '16', ['gray-slacks', 'slacks-desk', 'slacks-waist-hook', 'slacks-lobby-walk']),
    hero: { comp: 'careLabel', bg: '#d9d9d6', tag: '#ffffff', font: 'pretendard', ink: '#24272c', accent: '#4a4f57', icons: ['30°', '세탁망', '다림'], title: '매일\n입는\n회색\n슬랙스', sub: '핏과 기장을\n적어 주세요', label: 'WIDE SLACKS' },
  },
  {
    key: 'shoot-oxford-shirt', batch: 3, category: 'apparel', name: '남성 셔츠', mood: 'clean', tone: 'blue', flow: 'wearC', copy: 'shirt', body: 'noto-sans-kr',
    pins: pin('apparel', '17', ['oxford-shirt-folded', 'shirt-stack-stool', 'shirt-collar-button', 'shirt-cuff-hands']),
    hero: { comp: 'rail', bg: '#dde6f0', rod: '#5b6b80', font: 'noto-sans-kr', ink: '#1f3048', accent: '#3867a8', title: '단정한\n하루를\n여는\n셔츠', sub: '원단과 핏을\n적어 주세요', label: 'OXFORD SHIRT' },
  },
  {
    key: 'shoot-active-set', batch: 3, category: 'apparel', name: '요가복 세트', mood: 'bold', tone: 'photo', flow: 'wearB', copy: 'active', body: 'pretendard',
    pins: pin('apparel', '18', ['yoga-set-mat', 'active-flatlay', 'active-seam', 'leggings-mat-walk']),
    hero: { comp: 'swatch', bg: '#ab9ba8', font: 'black-han-sans', ink: '#3e2f5b', accent: '#6e55a8', chips: ['#b9a3e3', '#9fbfa6', '#1f1f24'], title: '매트\n위에서\n가볍게', sub: '신축성과 두께를 적어 주세요', label: 'ACTIVE WEAR' },
  },
  {
    key: 'shoot-kids-wear', batch: 3, category: 'apparel', name: '아동복', mood: 'friendly', tone: 'photo', flow: 'wearC', copy: 'kids', body: 'pretendard',
    pins: pin('apparel', '19', ['kids-outfit-rug', 'kids-clothes-rack', 'corduroy-pocket', 'kids-park-walk']),
    hero: { comp: 'swatch', bg: '#cbbd9b', font: 'do-hyeon', ink: '#4a3a12', accent: '#b07a1e', chips: ['#d9a23a', '#23355c', '#efe6d4'], title: '뛰놀기\n좋은\n가을옷', sub: '사이즈와 소재를 적어 주세요', label: 'KIDS WEAR' },
  },
  {
    key: 'shoot-leather-tote', batch: 3, category: 'bags', name: '가죽 토트백', mood: 'premium', tone: 'orange', flow: 'accA', copy: 'tote', body: 'noto-sans-kr',
    pins: pin('bag', '15', ['tan-tote-podium', 'tote-cafe-chair', 'tote-stitch', 'tote-street-shoulder']),
    hero: { comp: 'tag', bg: '#3b2a20', tag: '#f4ead9', tagInk: '#4a2e1c', tagSub: '#7a5a44', string: '#d8b98f', font: 'noto-serif-kr', ink: '#4a2e1c', accent: '#b0703f', title: '매일\n드는\n토트백', sub: '크기와 가죽을\n적어 주세요', label: 'LEATHER TOTE' },
  },
  {
    key: 'shoot-leather-wallet', batch: 3, category: 'bags', name: '가죽 지갑', mood: 'premium', tone: 'photo', flow: 'accB', copy: 'wallet', body: 'noto-sans-kr',
    pins: pin('bag', '16', ['black-wallets-slate', 'wallet-flatlay', 'wallet-edge', 'cardholder-hands']),
    hero: { comp: 'stitch', bg: '#23272b', font: 'nanum-myeongjo', ink: '#f3ece2', subInk: '#cfc6ba', thread: '#c9a77a', accent: '#b98a55', labelInk: '#c9a77a', title: '손에\n꼭 맞는\n지갑', sub: '가죽과 수납을\n적어 주세요', label: 'LEATHER WALLET' },
  },
  {
    key: 'shoot-leather-belt', batch: 3, category: 'bags', name: '가죽 벨트', mood: 'clean', tone: 'gray', flow: 'accA', copy: 'belt', body: 'pretendard',
    pins: pin('bag', '17', ['black-belt-stone', 'belts-flatlay', 'belt-buckle', 'belt-wearing']),
    hero: { comp: 'shelf', bg: '#e9e7e2', board: '#8b6b4e', font: 'pretendard', ink: '#26282b', accent: '#6b5440', title: '허리선을\n반듯하게', sub: '가죽과 버클을 한 줄로 적어 주세요', label: 'LEATHER BELT' },
  },
  {
    key: 'shoot-sunglasses', batch: 3, category: 'bags', name: '선글라스', mood: 'bold', tone: 'photo', flow: 'accB', copy: 'sunglass', body: 'pretendard',
    pins: pin('bag', '18', ['tortoise-sunglasses', 'sunglasses-beach-bag', 'sunglasses-hinge', 'sunglasses-beach-back']),
    hero: { comp: 'window', bg: '#1e5b86', veil: '#1e5b86', frame: '#f4efe6', font: 'black-han-sans', ink: '#ffffff', subInk: '#dbe9f5', labelInk: '#f2b134', accent: '#f2b134', title: '햇빛을\n가리는\n여름', sub: '렌즈와 테를\n적어 주세요', label: 'SUNGLASSES' },
  },
  {
    key: 'shoot-hair-accessory', batch: 3, category: 'bags', name: '헤어 액세서리', mood: 'friendly', tone: 'pink', flow: 'accA', copy: 'hairacc', body: 'pretendard',
    pins: pin('bag', '19', ['velvet-hair-set', 'scrunchie-tray', 'pearl-pin-scrunchie', 'ribbon-bun-back']),
    hero: { comp: 'corner', bg: '#c98f98', band: '#c98f98', font: 'gowun-batang', ink: '#4a1f2a', accent: '#7a2e3f', title: '고르는\n즐거움', sub: '색상과 소재를 한 줄로 적어 주세요', label: 'HAIR ACCESSORY' },
  },
]

const CAT_LABEL = { bags: '잡화·가방', apparel: '의류', food: '식품', health: '건강식품', gift: '선물세트', baby: '유아', camping: '캠핑', interior: '인테리어' }

/** 이 파일의 템플릿 key·바탕 계열 (목록 순서) — 갤러리 순서·섹션 모양은 studioTemplates.js가 정한 뒤 buildShootTemplate으로 만든다 */
export const SHOOT_KEYS = LIST.map(e => e.key)
/** 묶음별 key (앞 묶음 순서를 바꾸지 않게 묶음마다 갤러리 뒤에 이어 붙인다) — [1·2차 19개, 3차 15개] */
export const SHOOT_KEY_BATCHES = [LIST.filter(e => !e.batch).map(e => e.key), LIST.filter(e => e.batch === 3).map(e => e.key)]
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
    key: e.key, category: e.category, label: `${CAT_LABEL[e.category]} · ${e.name}`, desc: flowDesc(e), gap: 0, mood: e.mood, swatch: s.accent, tone: e.tone, heroComp: s.comp,
    samplePins: order.map(n => pinOf[n]),
    sections: sections.map(sec => renumber(sec, n => pack.get(n))).map(sec => (isPhotoSec(sec) ? sec : { ...sec, items: sec.items.map(p => (p.type === 'image' && Number.isInteger(p.slot) ? { ...p, sample: p.sample ?? SAMPLE_OF[order[p.slot]] } : p)) })),
  }
}
