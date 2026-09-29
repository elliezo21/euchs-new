/**
 * 강조 배지 (11-2단계) — 데이터만 (DOM 없음, node 테스트: scripts/test-studio-table.mjs의 배지 부분)
 *
 * ★ 배지는 새 요소 type이 아니다: 도형(11-1 shape) 1개 + 글자(10-1 text) 1~2개를 같은 groupId로 묶어 넣는다 (studioPage.addItemGroup).
 *   그래서 넣은 뒤에는 그룹 조작(이동·복제·풀기)·레이어에서 구성원 골라 색 바꾸기·글자 더블클릭 고치기가 다른 요소와 똑같이 된다.
 * ★ 프리셋 = { key, label, w, h, parts } — w·h = 배지 네모(페이지 px), parts = 뒤 → 앞 순서.
 *     도형 part: { type: 'shape', x, y, w, h, shape, fill, strokeWidth?, strokeColor?, radius? } (배지 네모 기준 좌표)
 *     글자 part: { type: 'text', text, cy, w, fontFamily, fontSize, fontWeight, color, letterSpacing? } — 가로 가운데, 세로 가운데 = cy
 * ★ 이름·색 조합은 상세페이지용으로 우리가 새로 정한 것 (다른 편집 프로그램의 배지 디자인·이름을 옮기지 않음).
 *   글꼴은 허용 목록(studioFonts.STUDIO_FONTS)만.
 */

const WHITE = '#ffffff'
const txt = (text, cy, w, fontSize, extra = {}) => ({ type: 'text', text, cy, w, fontSize, fontFamily: 'noto-sans-kr', fontWeight: 800, color: WHITE, align: 'center', lineHeight: 1.2, ...extra })

export const BADGE_PRESETS = [
  {
    key: 'best-seal', label: '베스트 원형', w: 150, h: 150,
    parts: [
      { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 150, h: 150, fill: '#1f3a68', strokeWidth: 5, strokeColor: WHITE },
      txt('BEST', 64, 120, 42, { fontFamily: 'black-han-sans', fontWeight: 400, letterSpacing: 0.04 }),
      txt('인기 상품', 102, 120, 16, { fontWeight: 700, color: '#cfe0ff' }),
    ],
  },
  {
    key: 'new-pill', label: 'NEW 알약', w: 170, h: 64,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 170, h: 64, fill: '#16a34a', radius: 32 },
      txt('NEW', 32, 150, 30, { fontWeight: 900, letterSpacing: 0.08 }),
    ],
  },
  {
    key: 'sale-star', label: '할인율 별', w: 200, h: 190,
    parts: [
      { type: 'shape', shape: 'star', x: 0, y: 0, w: 200, h: 190, fill: '#e53935' },
      txt('30%', 100, 110, 38, { fontFamily: 'black-han-sans', fontWeight: 400 }),
      txt('할인', 134, 80, 18),
    ],
  },
  {
    key: 'free-ship', label: '무료배송 딱지', w: 200, h: 68,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 200, h: 68, fill: WHITE, strokeWidth: 4, strokeColor: '#0f766e', radius: 14 },
      txt('무료배송', 34, 180, 28, { color: '#0f766e' }),
    ],
  },
  {
    key: 'one-plus-one', label: '1+1 원', w: 140, h: 140,
    parts: [
      { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 140, h: 140, fill: '#ffe14d' },
      txt('1+1', 70, 120, 52, { fontFamily: 'black-han-sans', fontWeight: 400, color: '#111111' }),
    ],
  },
  {
    key: 'limited-box', label: '한정 수량 네모', w: 190, h: 76,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 190, h: 76, fill: '#111111', radius: 4 },
      txt('한정 수량', 38, 170, 34, { fontFamily: 'do-hyeon', fontWeight: 400, color: '#ffe14d' }),
    ],
  },
  {
    key: 'pick-ring', label: '추천 테두리 원', w: 130, h: 130,
    parts: [
      { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 130, h: 130, fill: '', strokeWidth: 6, strokeColor: '#e53935' },
      txt('추천', 65, 110, 36, { fontWeight: 900, color: '#e53935' }),
    ],
  },
  {
    key: 'today-ship', label: '오늘 출발 알약', w: 210, h: 60,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 210, h: 60, fill: '#2f6fed', radius: 30 },
      txt('오늘 출발', 30, 190, 26),
    ],
  },
  // ── 에셋 채우기: 구매대행 셀러가 자주 쓰는 문구 (글자·색은 넣은 뒤 바꿀 수 있다) ──
  {
    key: 'same-day', label: '빠른 출고 톱니', w: 160, h: 160,
    parts: [
      { type: 'shape', shape: 'burst', x: 0, y: 0, w: 160, h: 160, fill: '#2f6fed' },
      txt('빠른', 62, 120, 34, { fontWeight: 900 }),
      txt('출고', 100, 120, 34, { fontWeight: 900 }),
    ],
  },
  {
    key: 'local-check', label: '검수 완료 딱지', w: 220, h: 68,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 220, h: 68, fill: '#0f766e', radius: 12 },
      txt('검수 완료', 34, 200, 26),
    ],
  },
  {
    key: 'new-ribbon', label: 'NEW 리본', w: 240, h: 64,
    parts: [
      { type: 'shape', shape: 'ribbon', x: 0, y: 0, w: 240, h: 64, fill: '#e53935' },
      txt('NEW ARRIVAL', 32, 190, 24, { fontWeight: 900, letterSpacing: 0.06 }),
    ],
  },
  {
    key: 'best-hex', label: 'BEST 육각형', w: 160, h: 140,
    parts: [
      { type: 'shape', shape: 'hexagon', x: 0, y: 0, w: 160, h: 140, fill: '#111111' },
      txt('BEST', 62, 120, 38, { fontFamily: 'black-han-sans', fontWeight: 400, color: '#ffe14d', letterSpacing: 0.04 }),
      txt('많이 찾는 상품', 98, 120, 14, { fontWeight: 700 }),
    ],
  },
  {
    key: 'hot-burst', label: 'HOT 톱니', w: 140, h: 140,
    parts: [
      { type: 'shape', shape: 'burst', x: 0, y: 0, w: 140, h: 140, fill: '#ff6b00' },
      txt('HOT', 70, 110, 40, { fontFamily: 'black-han-sans', fontWeight: 400 }),
    ],
  },
  {
    key: 'free-ship-ribbon', label: '무료배송 리본', w: 250, h: 60,
    parts: [
      { type: 'shape', shape: 'ribbon', x: 0, y: 0, w: 250, h: 60, fill: '#1f3a68' },
      txt('무료배송', 30, 200, 26),
    ],
  },
  {
    key: 'restock', label: '재입고 알약', w: 190, h: 60,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 190, h: 60, fill: '#ffffff', strokeWidth: 3, strokeColor: '#111111', radius: 30 },
      txt('재입고', 30, 170, 26, { color: '#111111' }),
    ],
  },
  {
    key: 'gift', label: '사은품 증정 원', w: 150, h: 150,
    parts: [
      { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 150, h: 150, fill: '#fde2e4', strokeWidth: 4, strokeColor: '#e5677a' },
      txt('사은품', 60, 130, 30, { fontWeight: 900, color: '#b4233c' }),
      txt('증정', 96, 130, 24, { color: '#b4233c' }),
    ],
  },
  {
    key: 'md-pick', label: 'MD 추천 마름모', w: 170, h: 170,
    parts: [
      { type: 'shape', shape: 'diamond', x: 0, y: 0, w: 170, h: 170, fill: '#6d28d9' },
      txt('MD', 70, 90, 34, { fontFamily: 'black-han-sans', fontWeight: 400 }),
      txt('추천', 104, 90, 20),
    ],
  },
  {
    key: 'point-tag', label: 'POINT 꼬리표', w: 170, h: 48,
    parts: [
      { type: 'shape', shape: 'rect', x: 0, y: 0, w: 170, h: 48, fill: '#111111', radius: 24 },
      txt('POINT 01', 24, 150, 20, { letterSpacing: 0.08 }),
    ],
  },
]

export function badgePresetByKey(key) { return BADGE_PRESETS.find(b => b.key === key) ?? null }
/** 배지 글자 part들 (넣기 전에 글꼴 조각을 받을 때) */
export function badgeTextParts(preset) { return preset.parts.filter(p => p.type === 'text') }
