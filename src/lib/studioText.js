/**
 * 글자 요소 (10-1단계, 꾸미기·프리셋·스타일 복사 10-2단계) — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-text.mjs)
 *
 * ★ 글자 요소 = 공통 칸(id, type: 'text', x, y, w, h, rotation, opacity, flipX, flipY, locked, hidden, groupId?) +
 *     text          문자열 (\n = 줄바꿈)
 *     fontFamily    허용 목록의 키 (studioFonts.STUDIO_FONTS — 예: 'noto-sans-kr')
 *     fontSize      8~400 (페이지 px, 정수)
 *     fontWeight    그 폰트가 가진 굵기만 (예: 400·700·800)
 *     color         '#rrggbb' (소문자)
 *     align         'left' | 'center' | 'right'
 *     lineHeight    0.8~3.0 (글자 크기의 배수, 소수 둘째 자리)
 *     letterSpacing -0.2~1.0 (em = 글자 크기의 배수, 소수 둘째 자리)
 *   꾸미기 (10-2단계 — 기본값은 모두 "없음"이라 10-1에 저장된 글자는 모양이 그대로):
 *     strokeWidth   0~20 (px, 정수, 0 = 테두리 없음) · strokeColor '#rrggbb' — 글자 바깥쪽으로 이만큼 보이는 테두리
 *     shadowX·shadowY -40~40 · shadowBlur 0~40 (px, 정수) · shadowColor '#rrggbb' · shadowOpacity 0~1 (0 = 그림자 없음)
 *     bgColor       '#rrggbb' 또는 '' (= 배경 없음) · bgOpacity 0~1 · bgPadding 0~60 · bgRadius 0~100 (px, 정수)
 *                   배경 = 요소 네모(w×h)를 bgPadding만큼 넓힌 둥근 네모
 *   테두리·그림자·배경은 줄바꿈·높이(h)에 영향을 주지 않는다 (textStyleOf에 없음). 그리는 규칙은 textPaintSpec 하나.
 * ★ h는 손으로 정하지 않는다 — 줄 수 × fontSize × lineHeight (textHeight). 폭(w)·글자·속성이 바뀌면 다시 맞춘다 (fitTextItem).
 * ★ 줄바꿈 계산은 wrapLines 하나 — 화면(DOM, 줄마다 한 줄씩 white-space: pre)과 내보내기(캔버스, 13단계)가 같은 결과를 쓴다.
 *   글자 폭은 measure(문자열, style)를 밖에서 받는다(브라우저 = 캔버스 measureText, 테스트 = 가짜). 자간은 여기서 더한다:
 *   한 줄 폭 = measure(줄) + letterSpacing × fontSize × 글자 수 (CSS letter-spacing처럼 마지막 글자 뒤에도 붙는다).
 */
import { FONT_DEFAULT_KEY, isFontKey, nearestWeight } from './studioFonts.js'

export const TEXT_DEFAULTS = {
  text: '', fontFamily: FONT_DEFAULT_KEY, fontSize: 40, fontWeight: 700, color: '#111111', align: 'center', lineHeight: 1.3, letterSpacing: 0,
  // 꾸미기 (10-2) — 모두 "없음"
  strokeWidth: 0, strokeColor: '#000000',
  shadowX: 0, shadowY: 0, shadowBlur: 0, shadowColor: '#000000', shadowOpacity: 0,
  bgColor: '', bgOpacity: 1, bgPadding: 0, bgRadius: 0,
}
export const TEXT_LIMITS = {
  fontSize: [8, 400], lineHeight: [0.8, 3], letterSpacing: [-0.2, 1],
  strokeWidth: [0, 20], shadowX: [-40, 40], shadowY: [-40, 40], shadowBlur: [0, 40], shadowOpacity: [0, 1],
  bgOpacity: [0, 1], bgPadding: [0, 60], bgRadius: [0, 100],
}
export const TEXT_ALIGNS = ['left', 'center', 'right']
export const TEXT_KEYS = Object.keys(TEXT_DEFAULTS)
/** 글자 모양 칸 = 글 내용(text)을 뺀 전부 — 스타일 복사·프리셋이 다루는 칸 (자리·크기·회전·잠금 등 공통 칸은 원래 없음) */
export const TEXT_STYLE_KEYS = TEXT_KEYS.filter(k => k !== 'text')
export const TEXT_MAX_LENGTH = 5000 // 한 요소의 글자 수 (페이지 문서 크기 제한 안에 머물게)
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const INT_KEYS = new Set(['fontSize', 'strokeWidth', 'shadowX', 'shadowY', 'shadowBlur', 'bgPadding', 'bgRadius'])
const DEC_KEYS = new Set(['lineHeight', 'letterSpacing', 'shadowOpacity', 'bgOpacity'])
const COLOR_KEYS = new Set(['color', 'strokeColor', 'shadowColor'])

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))
const round2 = v => Math.round(v * 100) / 100

/**
 * 넣기 버튼 3종(제목·부제목·본문)의 새 글자 기본값 — 10-1의 TEXT_PRESETS를 10-2에서 이름만 바꿈
 * (아래 스타일 프리셋 TEXT_STYLE_PRESETS와 헷갈리지 않게)
 */
export const TEXT_INSERT_KINDS = {
  title: { text: '제목을 입력하세요', fontSize: 56, fontWeight: 800, lineHeight: 1.25, w: 640 },
  subtitle: { text: '부제목을 입력하세요', fontSize: 32, fontWeight: 700, lineHeight: 1.3, w: 600 },
  body: { text: '본문을 입력하세요.\n여러 줄로 쓸 수 있어요.', fontSize: 22, fontWeight: 400, lineHeight: 1.6, w: 560 },
}

/** 화면에서 그릴 수 있는 글자 요소인지 (모양이 어긋나면 그리지 않고 보존만) */
export function isValidTextItem(it) {
  return !!it && it.type === 'text' && typeof it.id === 'string' && typeof it.text === 'string'
    && [it.x, it.y, it.w, it.h].every(Number.isFinite) && it.w > 0 && it.h > 0
}

/** 글자 칸 한 개를 고쳐 읽는다 (잘못된 값 = undefined → 기본값을 쓰게) */
function cleanTextField(k, v, fontFamily) {
  switch (k) {
    case 'text': return typeof v === 'string' ? v.replace(/\r\n?/g, '\n').slice(0, TEXT_MAX_LENGTH) : undefined
    case 'fontFamily': return isFontKey(v) ? v : undefined
    case 'fontWeight': return Number.isFinite(v) ? nearestWeight(fontFamily, v) : undefined
    case 'align': return TEXT_ALIGNS.includes(v) ? v : undefined
    case 'bgColor': return v === '' ? '' : typeof v === 'string' && HEX_COLOR.test(v) ? v.toLowerCase() : undefined // '' = 배경 없음
    default:
      if (INT_KEYS.has(k)) return Number.isFinite(v) ? Math.round(clamp(v, TEXT_LIMITS[k])) : undefined
      if (DEC_KEYS.has(k)) return Number.isFinite(v) ? round2(clamp(v, TEXT_LIMITS[k])) : undefined
      if (COLOR_KEYS.has(k)) return typeof v === 'string' && HEX_COLOR.test(v) ? v.toLowerCase() : undefined
      return undefined
  }
}

/**
 * 글자 칸을 채운 복사본 — 빠지거나 잘못된 값은 기본값, 굵기는 그 폰트가 가진 값으로. 공통 칸·다른 칸은 그대로 (readPage에서도 거친다)
 */
export function normalizeTextItem(it) {
  if (!it || typeof it !== 'object') return it
  const out = { ...it }
  out.fontFamily = cleanTextField('fontFamily', it.fontFamily) ?? TEXT_DEFAULTS.fontFamily
  for (const k of TEXT_KEYS) {
    if (k === 'fontFamily') continue
    const v = cleanTextField(k, it[k], out.fontFamily)
    out[k] = v ?? (k === 'fontWeight' ? nearestWeight(out.fontFamily, TEXT_DEFAULTS.fontWeight) : TEXT_DEFAULTS[k])
  }
  return out
}

/**
 * 속성 바꾸기 — patch의 글자 칸만(잘못된 값은 무시). 글꼴을 바꾸면 굵기를 새 폰트가 가진 값으로 맞춘다.
 * @returns 새 요소 (h는 그대로 — fitTextItem으로 맞춘다). 바뀐 칸이 없으면 입력 그대로
 */
export function patchTextItem(it, patch) {
  const fontFamily = cleanTextField('fontFamily', patch?.fontFamily) ?? it.fontFamily
  const next = { ...it, fontFamily }
  for (const k of TEXT_KEYS) {
    if (k === 'fontFamily' || !patch || !(k in patch)) continue
    const v = cleanTextField(k, patch[k], fontFamily)
    if (v !== undefined) next[k] = v
  }
  next.fontWeight = nearestWeight(fontFamily, next.fontWeight)
  return TEXT_KEYS.every(k => next[k] === it[k]) ? it : next
}

/** 줄바꿈·그리기에 쓰는 글자 모양 (요소에서) */
export function textStyleOf(it) {
  return {
    fontFamily: it.fontFamily, fontSize: it.fontSize, fontWeight: it.fontWeight,
    lineHeight: it.lineHeight, letterSpacing: it.letterSpacing, align: it.align, color: it.color,
  }
}

// ── 줄바꿈 ──
// 끊는 단위(토막): 한글·한자·전각 글자는 한 글자씩(뒤에 붙은 닫는 문장부호는 같이), 영문·숫자 등은 공백까지 한 단어, 공백은 따로
const CJK = '\\u1100-\\u11FF\\u3000-\\u303F\\u3130-\\u318F\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uAC00-\\uD7AF\\uF900-\\uFAFF\\uFF00-\\uFFEF'
const CLOSE = '.,!?%)\\]}"\'’”…·:;~'
const TOKEN = new RegExp(`[${CJK}][${CLOSE}]*|[ \\t]+|[^ \\t${CJK}]+`, 'gu')

/** 줄 폭 (자간 포함) */
export function lineWidth(str, style, measure) {
  if (str === '') return 0
  return measure(str, style) + (style.letterSpacing || 0) * style.fontSize * [...str].length
}

/**
 * 줄바꿈 계산 — 화면과 내보내기가 같이 쓰는 하나뿐인 함수.
 *   \n = 강제 줄바꿈(빈 줄 유지), 한글은 글자 단위, 영문·숫자는 단어 단위, 폭보다 긴 단어는 글자 단위로 끊는다.
 *   줄 끝 공백은 폭에 치지 않고 줄에서 뺀다 (줄 앞 공백은 문단 첫 줄만 남는다).
 * @param {string} text  @param {object} style textStyleOf  @param {number} width 요소 폭 (페이지 px)
 * @param {(s: string, style: object) => number} measure 자간 뺀 글자 폭
 * @returns {string[]} 줄 목록 (최소 1줄)
 */
export function wrapLines(text, style, width, measure) {
  const out = []
  const fits = s => lineWidth(s.trimEnd(), style, measure) <= width + 0.01 // 소수점 오차
  for (const para of String(text ?? '').split('\n')) {
    const tokens = para.match(TOKEN) || []
    let line = ''
    let wrapped = false // 이 문단에서 한 번이라도 넘겼는지
    const push = () => { out.push(line.trimEnd()); line = ''; wrapped = true }
    for (const tok of tokens) {
      if (/^[ \t]+$/.test(tok)) {
        if (line !== '' || !wrapped) line += tok // 넘긴 줄 맨 앞 공백은 버림 (문단 맨 앞 공백은 둔다)
        continue
      }
      if (fits(line + tok)) { line += tok; continue }
      if (line.trim() !== '') push()
      else line = '' // 공백만 있던 줄 — 공백을 버리고 단어부터
      if (fits(tok)) { line = tok; continue }
      // 한 줄보다 긴 단어 — 글자 단위로 (한 줄에 최소 한 글자)
      for (const ch of tok) {
        if (line !== '' && !fits(line + ch)) push()
        line += ch
      }
    }
    push()
  }
  return out
}

/** 글자 높이 = 줄 수 × fontSize × lineHeight (올림, 정수) */
export function textHeight(lines, style) {
  return Math.max(1, Math.ceil(Math.max(1, lines.length) * style.fontSize * style.lineHeight))
}

/** 요소의 h를 지금 글자·폭에 맞춘다. 같으면 입력 그대로 */
export function fitTextItem(it, measure) {
  const style = textStyleOf(it)
  const h = textHeight(wrapLines(it.text, style, it.w, measure), style)
  return h === it.h ? it : { ...it, h }
}

/** 레이어 목록 이름 — "글자 · 앞 10자" (줄바꿈은 공백으로) */
export function textLabel(it) {
  const s = String(it?.text ?? '').replace(/\s+/g, ' ').trim()
  const head = [...s].slice(0, 10).join('')
  return head ? `글자 · ${head}${[...s].length > 10 ? '…' : ''}` : '글자'
}

// ── 꾸미기 그리기 규칙 (10-2) — 화면(StudioTextView)과 내보내기(캔버스, 13단계)가 같이 쓴다 ──
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/**
 * 글자 요소를 그릴 값 — 없는 꾸미기는 null. 좌표·크기는 요소 기준 페이지 px (요소 왼쪽 위 = 0,0).
 *   fill   글자 색
 *   stroke { width, color } — 글자 바깥쪽으로 width만큼 보이는 테두리. 캔버스: lineWidth = width × 2로 strokeText 한 뒤 그 위에 fillText
 *          (선의 안쪽 절반은 채우기가 덮는다). 이음새는 miter(캔버스 기본 = 화면 -webkit-text-stroke와 같음)
 *   shadow { x, y, blur, color } — 테두리+글자를 합친 모양 하나의 그림자. blur = 캔버스 shadowBlur·CSS drop-shadow 흐림(둘 다 표준편차 = blur/2).
 *          캔버스: 테두리+글자를 한 장에 그린 뒤 그 장을 shadow를 켜고 한 번에 그린다(테두리·글자 그림자가 겹쳐 진해지지 않게)
 *   bg     { x, y, w, h, radius, color } — 요소 네모를 bgPadding만큼 넓힌 둥근 네모 (radius는 짧은 변 절반까지)
 * 그리는 순서: 배경 → 그림자 → 테두리 → 채우기. 뒤집기(flipX·flipY)는 그림자 방향까지 통째로 뒤집는다(화면과 같게 — 캔버스는 다 그린 장을 뒤집어 붙임)
 */
export function textPaintSpec(it) {
  const pad = it.bgPadding || 0
  const bw = it.w + pad * 2, bh = it.h + pad * 2
  return {
    fill: it.color,
    stroke: it.strokeWidth > 0 ? { width: it.strokeWidth, color: it.strokeColor } : null,
    shadow: it.shadowOpacity > 0 && (it.shadowX || it.shadowY || it.shadowBlur)
      ? { x: it.shadowX, y: it.shadowY, blur: it.shadowBlur, color: rgba(it.shadowColor, it.shadowOpacity) } : null,
    bg: it.bgColor && it.bgOpacity > 0
      ? { x: -pad, y: -pad, w: bw, h: bh, radius: Math.min(it.bgRadius || 0, bw / 2, bh / 2), color: rgba(it.bgColor, it.bgOpacity) } : null,
  }
}

// ── 스타일 복사·프리셋 (10-2) ──

/** 글자 모양 칸만 뽑는다 (스타일 복사) — 글 내용·자리·크기·회전·잠금 등은 없음 */
export function textStyleValues(it) {
  return Object.fromEntries(TEXT_STYLE_KEYS.map(k => [k, it[k]]))
}

// 프리셋이 정하지 않는 꾸미기는 "없음"으로 (앞 스타일의 테두리·그림자가 남지 않게). 크기·정렬·줄간격은 고른 글자 것을 그대로 둔다
const PRESET_RESET = {
  letterSpacing: 0, strokeWidth: 0, strokeColor: '#000000', shadowX: 0, shadowY: 0, shadowBlur: 0, shadowColor: '#000000', shadowOpacity: 0,
  bgColor: '', bgOpacity: 1, bgPadding: 0, bgRadius: 0,
}
/**
 * 스타일 프리셋 — 상세페이지용으로 우리가 정한 조합 (이름·조합 모두 새로 만듦).
 * style = 글꼴·굵기·색·꾸미기, size = 새 글자로 넣을 때 크기, sample = 견본·새 글자 문구, swatchBg = 견본 바탕(글자가 잘 보이게)
 */
export const TEXT_STYLE_PRESETS = [
  { key: 'outline-white', label: '흰 글씨 검정 테두리', sample: '오늘 도착', size: 48, swatchBg: '#dfe2e7',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 900, color: '#ffffff', strokeWidth: 3, strokeColor: '#111111' } },
  { key: 'highlight-yellow', label: '노랑 형광펜', sample: '핵심 포인트', size: 36, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 800, color: '#111111', bgColor: '#ffe14d', bgPadding: 8, bgRadius: 2 } },
  { key: 'soft-shadow', label: '은은한 그림자', sample: '새로운 시작', size: 48, swatchBg: '#6b7380',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 800, color: '#ffffff', shadowY: 3, shadowBlur: 10, shadowOpacity: 0.45 } },
  { key: 'sale-red', label: '빨강 할인 딱지', sample: '30% 할인', size: 40, swatchBg: '#ffffff',
    style: { fontFamily: 'do-hyeon', fontWeight: 400, color: '#ffffff', bgColor: '#e53935', bgPadding: 12, bgRadius: 10 } },
  { key: 'calm-note', label: '차분한 설명', sample: '부드럽고 가벼워요', size: 24, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 400, color: '#4a4f57' } },
  { key: 'premium-serif', label: '고급 명조', sample: '정성을 담아', size: 40, swatchBg: '#f4efe6',
    style: { fontFamily: 'noto-serif-kr', fontWeight: 700, color: '#2b2118', letterSpacing: 0.04 } },
  { key: 'navy-pill', label: '남색 알약 라벨', sample: 'BEST', size: 28, swatchBg: '#ffffff',
    style: { fontFamily: 'nanum-gothic', fontWeight: 800, color: '#ffffff', letterSpacing: 0.06, bgColor: '#1f3a68', bgPadding: 10, bgRadius: 100 } },
  { key: 'heavy-black', label: '굵은 검정 한마디', sample: '튼튼해요', size: 56, swatchBg: '#ffffff',
    style: { fontFamily: 'black-han-sans', fontWeight: 400, color: '#111111', letterSpacing: -0.02 } },
  { key: 'mint-point', label: '민트 포인트', sample: '세탁기 사용 가능', size: 28, swatchBg: '#ffffff',
    style: { fontFamily: 'nanum-gothic', fontWeight: 800, color: '#0f766e', bgColor: '#e3f5f1', bgPadding: 8, bgRadius: 6 } },
  { key: 'red-outline-pop', label: '빨강 글씨 흰 테두리', sample: '한정 수량', size: 48, swatchBg: '#cfd3da',
    style: { fontFamily: 'do-hyeon', fontWeight: 400, color: '#e53935', strokeWidth: 4, strokeColor: '#ffffff', shadowY: 2, shadowBlur: 6, shadowOpacity: 0.25 } },
  // ── 에셋 채우기: 상세페이지 글 종류별 (헤드라인·서브·본문·강조·가격·주의 문구) ──
  { key: 'head-clean', group: 'headline', label: '또렷한 헤드라인', sample: '매일 쓰기 좋은', size: 56, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 900, color: '#111111', letterSpacing: -0.02 } },
  { key: 'head-serif', group: 'headline', label: '명조 헤드라인', sample: '오래 곁에 두는', size: 52, swatchBg: '#f4efe6',
    style: { fontFamily: 'noto-serif-kr', fontWeight: 900, color: '#2b2118' } },
  { key: 'sub-gray', group: 'sub', label: '회색 서브 문구', sample: '가볍고 튼튼한 소재', size: 30, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 700, color: '#4b5563' } },
  { key: 'sub-blue', group: 'sub', label: '파랑 서브 문구', sample: '이런 분께 추천해요', size: 30, swatchBg: '#ffffff',
    style: { fontFamily: 'nanum-gothic', fontWeight: 800, color: '#2f6fed' } },
  { key: 'sub-label', group: 'sub', label: '영문 작은 라벨', sample: 'PRODUCT INFO', size: 20, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 800, color: '#9aa1ac', letterSpacing: 0.2 } },
  { key: 'body-dark', group: 'body', label: '진한 본문', sample: '하루 종일 편안해요', size: 22, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 400, color: '#222222' } },
  { key: 'body-serif', group: 'body', label: '명조 본문', sample: '천천히 읽는 이야기', size: 22, swatchBg: '#f7f5f0',
    style: { fontFamily: 'nanum-myeongjo', fontWeight: 400, color: '#3f3a36' } },
  { key: 'body-caption', group: 'body', label: '작은 설명', sample: '사진 아래 설명', size: 17, swatchBg: '#ffffff',
    style: { fontFamily: 'nanum-gothic', fontWeight: 400, color: '#6b7280' } },
  { key: 'price-big', group: 'price', label: '큰 빨강 가격', sample: '19,900원', size: 60, swatchBg: '#ffffff',
    style: { fontFamily: 'black-han-sans', fontWeight: 400, color: '#e53935' } },
  { key: 'price-dark', group: 'price', label: '검정 가격', sample: '29,000원', size: 48, swatchBg: '#ffffff',
    style: { fontFamily: 'do-hyeon', fontWeight: 400, color: '#111111' } },
  { key: 'price-tag', group: 'price', label: '노랑 가격표', sample: '2개 묶음 특가', size: 32, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 900, color: '#111111', bgColor: '#ffe14d', bgPadding: 12, bgRadius: 8 } },
  { key: 'notice-box', group: 'notice', label: '회색 안내 상자', sample: '구매 전 확인', size: 20, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 400, color: '#57534e', bgColor: '#f1f0ee', bgPadding: 14, bgRadius: 8 } },
  { key: 'notice-amber', group: 'notice', label: '노랑 주의 상자', sample: '사용 전 읽어 보기', size: 20, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 700, color: '#7a4b00', bgColor: '#fff4d6', bgPadding: 14, bgRadius: 8 } },
  { key: 'notice-red', group: 'notice', label: '빨강 주의 문구', sample: '사용 전 꼭 확인', size: 22, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 700, color: '#c62828' } },
  { key: 'notice-small', group: 'notice', label: '작은 회색 안내', sample: '화면마다 색 차이', size: 17, swatchBg: '#ffffff',
    style: { fontFamily: 'noto-sans-kr', fontWeight: 400, color: '#6b7280' } },
]
/** 스타일 묶음 (왼쪽 [텍스트] 패널의 소제목 순서) */
export const TEXT_STYLE_GROUPS = [
  { key: 'headline', label: '헤드라인' },
  { key: 'sub', label: '서브' },
  { key: 'body', label: '본문' },
  { key: 'point', label: '강조' },
  { key: 'price', label: '가격' },
  { key: 'notice', label: '주의 문구' },
]
// 10-2 때 만든 프리셋 10개의 묶음 (프리셋 데이터는 그대로 두고 여기서만 나눈다)
const FIRST_PRESET_GROUP = {
  'outline-white': 'headline', 'soft-shadow': 'headline', 'heavy-black': 'headline', 'premium-serif': 'sub', 'calm-note': 'body',
  'highlight-yellow': 'point', 'navy-pill': 'point', 'mint-point': 'point', 'red-outline-pop': 'point', 'sale-red': 'price',
}
/** 프리셋의 묶음 키 (TEXT_STYLE_GROUPS) */
export function styleGroupOf(preset) { return preset.group ?? FIRST_PRESET_GROUP[preset.key] ?? 'point' }
export function stylePresetByKey(key) { return TEXT_STYLE_PRESETS.find(p => p.key === key) ?? null }
/** 프리셋을 적용할 patch (patchTextItem에 넘김) — 프리셋에 없는 꾸미기는 없음으로 */
export function presetPatch(preset) {
  return { ...PRESET_RESET, ...preset.style }
}
