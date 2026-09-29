/**
 * 꾸밈 요소 (에셋 채우기) — 데이터만 (DOM 없음, node 테스트: scripts/test-studio-assets.mjs)
 *
 * ★ 강조 배지(studioBadge.js)와 같은 방식: 새 요소 type 없이 도형·글자·선을 같은 groupId로 묶어 넣는다 (studioPage.addItemGroup).
 *   넣은 뒤에는 그룹 조작·구성원 색 바꾸기·글자 더블클릭 고치기가 다른 요소와 똑같이 된다. 색은 모두 넣은 뒤 바꿀 수 있는 기본색.
 * ★ 프리셋 = { key, kind, label, w, h, parts } — kind = 패널 묶음(DECOR_KINDS), w·h = 묶음 네모(페이지 px), parts = 뒤 → 앞 순서.
 *     도형 part: { type: 'shape', x, y, w, h, shape, fill, … }
 *     글자 part: { type: 'text', text, cy, w, x?, … } — x가 없으면 가로 가운데
 *     선 part:   { type: 'line', x, cy, w, strokeWidth, color, dash?, startCap?, endCap? }
 * ★ 모양·이름·색 조합은 이 프로젝트에서 새로 정한 것. 그림은 모두 studioShape의 path(직접 그린 것) — 외부 그림 파일 없음.
 *   글꼴은 허용 목록(studioFonts.STUDIO_FONTS)만.
 */
import { BADGE_PRESETS } from './studioBadge.js'

export const DECOR_KINDS = [
  { key: 'icon', label: '체크·번호' },
  { key: 'bubble', label: '말풍선' },
  { key: 'divider', label: '구분선' },
  { key: 'arrow', label: '화살표' },
]

const WHITE = '#ffffff'
const INK = '#111111'
const txt = (text, cy, w, fontSize, extra = {}) => ({ type: 'text', text, cy, w, fontSize, fontFamily: 'noto-sans-kr', fontWeight: 800, color: WHITE, align: 'center', lineHeight: 1.2, ...extra })
const line = (x, cy, w, extra = {}) => ({ type: 'line', x, cy, w, strokeWidth: 2, color: '#9aa1ac', ...extra })

// 번호 원 1~3 (같은 모양, 숫자만 다름 — 넣은 뒤 숫자를 고쳐 4, 5…로 쓴다)
const numberDot = n => ({
  key: `num-dot-${n}`, kind: 'icon', label: `번호 원 ${n}`, w: 72, h: 72,
  parts: [
    { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 72, h: 72, fill: '#2f6fed' },
    txt(String(n), 36, 60, 34, { fontWeight: 900 }),
  ],
})
const stepPill = n => ({
  key: `step-${n}`, kind: 'icon', label: `STEP ${n}`, w: 150, h: 46,
  parts: [
    { type: 'shape', shape: 'rect', x: 0, y: 0, w: 150, h: 46, fill: WHITE, strokeWidth: 3, strokeColor: INK, radius: 23 },
    txt(`STEP ${n}`, 23, 130, 20, { color: INK, letterSpacing: 0.06 }),
  ],
})

export const DECOR_PRESETS = [
  // ── 체크·번호 ──
  {
    key: 'check-circle', kind: 'icon', label: '체크 원', w: 72, h: 72,
    parts: [
      { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 72, h: 72, fill: '#16a34a' },
      { type: 'shape', shape: 'check', x: 18, y: 21, w: 36, h: 30, fill: WHITE },
    ],
  },
  {
    key: 'check-box', kind: 'icon', label: '체크 네모', w: 72, h: 72,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 72, h: 72, fill: WHITE, strokeWidth: 4, strokeColor: INK, radius: 14 },
      { type: 'shape', shape: 'check', x: 17, y: 20, w: 38, h: 32, fill: '#e53935' },
    ],
  },
  {
    key: 'check-line', kind: 'icon', label: '체크 한 줄', w: 520, h: 56,
    parts: [
      { type: 'shape', shape: 'ellipse', x: 0, y: 6, w: 44, h: 44, fill: '#16a34a' },
      { type: 'shape', shape: 'check', x: 11, y: 19, w: 22, h: 18, fill: WHITE },
      txt('장점을 한 줄로 적어 주세요', 28, 450, 26, { x: 62, color: INK, fontWeight: 700, align: 'left' }),
    ],
  },
  numberDot(1), numberDot(2), numberDot(3),
  stepPill(1), stepPill(2), stepPill(3),
  {
    key: 'num-square', kind: 'icon', label: '번호 네모', w: 72, h: 72,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 72, h: 72, fill: INK, radius: 16 },
      txt('01', 36, 64, 30, { fontFamily: 'do-hyeon', fontWeight: 400, color: '#ffe14d' }),
    ],
  },
  // ── 말풍선 ──
  {
    key: 'bubble-fill', kind: 'bubble', label: '채운 말풍선', w: 360, h: 170,
    parts: [
      { type: 'shape', shape: 'bubble', x: 0, y: 0, w: 360, h: 170, fill: '#2f6fed' },
      txt('이런 점이 좋아요', 66, 320, 30),
    ],
  },
  {
    key: 'bubble-line', kind: 'bubble', label: '테두리 말풍선', w: 360, h: 170,
    parts: [
      { type: 'shape', shape: 'bubble', x: 0, y: 0, w: 360, h: 170, fill: WHITE, strokeWidth: 4, strokeColor: INK },
      txt('자주 묻는 질문이에요', 66, 320, 28, { color: INK }),
    ],
  },
  {
    key: 'bubble-soft', kind: 'bubble', label: '연한 말풍선', w: 420, h: 200,
    parts: [
      { type: 'shape', shape: 'bubble', x: 0, y: 0, w: 420, h: 200, fill: '#fff4d6' },
      txt('한 번 써 보면\n계속 찾게 돼요', 78, 380, 28, { color: '#5b3d00', lineHeight: 1.4 }),
    ],
  },
  {
    key: 'bubble-right', kind: 'bubble', label: '오른쪽 꼬리 말풍선', w: 360, h: 170,
    parts: [
      { type: 'shape', shape: 'bubble', x: 0, y: 0, w: 360, h: 170, fill: '#111111', flipX: true },
      txt('이렇게 써 보세요', 66, 320, 30, { color: '#ffe14d' }),
    ],
  },
  // ── 구분선 ──
  {
    key: 'divider-dot', kind: 'divider', label: '점 구분선', w: 600, h: 24,
    parts: [
      line(0, 12, 270),
      { type: 'shape', shape: 'ellipse', x: 294, y: 6, w: 12, h: 12, fill: '#9aa1ac' },
      line(330, 12, 270),
    ],
  },
  {
    key: 'divider-diamond', kind: 'divider', label: '마름모 구분선', w: 600, h: 24,
    parts: [
      line(0, 12, 270, { color: '#c9a86a' }),
      { type: 'shape', shape: 'diamond', x: 291, y: 3, w: 18, h: 18, fill: '#c9a86a' },
      line(330, 12, 270, { color: '#c9a86a' }),
    ],
  },
  {
    key: 'divider-title', kind: 'divider', label: '제목 구분선', w: 640, h: 44,
    parts: [
      line(0, 22, 200, { color: INK }),
      txt('DETAIL', 22, 200, 24, { color: INK, letterSpacing: 0.2 }),
      line(440, 22, 200, { color: INK }),
    ],
  },
  {
    key: 'divider-dash', kind: 'divider', label: '점선 구분선', w: 600, h: 24,
    parts: [
      line(0, 12, 600, { dash: 'dashed' }),
    ],
  },
  {
    key: 'divider-bar', kind: 'divider', label: '짧은 막대', w: 80, h: 6,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 80, h: 6, fill: '#2f6fed', radius: 3 },
    ],
  },
  // ── 화살표 ──
  {
    key: 'arrow-down', kind: 'arrow', label: '아래 화살표', w: 100, h: 100,
    parts: [
      { type: 'shape', shape: 'arrow', x: 0, y: 15, w: 100, h: 70, fill: '#2f6fed', rotation: 90 },
    ],
  },
  {
    key: 'arrow-right', kind: 'arrow', label: '오른쪽 화살표', w: 140, h: 80,
    parts: [
      { type: 'shape', shape: 'arrow', x: 0, y: 0, w: 140, h: 80, fill: '#111111' },
    ],
  },
  {
    key: 'arrow-circle', kind: 'arrow', label: '원 화살표', w: 84, h: 84,
    parts: [
      { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 84, h: 84, fill: '#111111' },
      { type: 'shape', shape: 'arrow', x: 20, y: 26, w: 44, h: 32, fill: WHITE },
    ],
  },
  {
    key: 'arrow-before-after', kind: 'arrow', label: '전 → 후', w: 420, h: 64,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 8, w: 130, h: 48, fill: '#e5e7eb', radius: 24 },
      txt('사용 전', 32, 120, 22, { x: 5, color: '#374151' }),
      { type: 'shape', shape: 'arrow', x: 160, y: 12, w: 100, h: 40, fill: '#9aa1ac' },
      { type: 'shape', shape: 'rect', x: 290, y: 8, w: 130, h: 48, fill: '#2f6fed', radius: 24 },
      txt('사용 후', 32, 120, 22, { x: 295 }),
    ],
  },
]

export function decorPresetByKey(key) { return DECOR_PRESETS.find(d => d.key === key) ?? null }

/** 묶음 넣기 프리셋 찾기 — 강조 배지 또는 꾸밈 요소. @returns {{ preset, kind: 'badge' | 'decor' } | null} */
export function groupPresetByKey(key) {
  const badge = BADGE_PRESETS.find(b => b.key === key)
  if (badge) return { preset: badge, kind: 'badge' }
  const decor = decorPresetByKey(key)
  return decor ? { preset: decor, kind: 'decor' } : null
}
/** 프리셋의 글자 part들 (넣기 전에 글꼴 조각을 받을 때) */
export function presetTextParts(preset) { return preset.parts.filter(p => p.type === 'text') }
