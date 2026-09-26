/**
 * 글자 요소 (10-1단계) — 순수 함수 (DOM 없음, node 테스트: scripts/test-studio-text.mjs)
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
 * ★ h는 손으로 정하지 않는다 — 줄 수 × fontSize × lineHeight (textHeight). 폭(w)·글자·속성이 바뀌면 다시 맞춘다 (fitTextItem).
 * ★ 줄바꿈 계산은 wrapLines 하나 — 화면(DOM, 줄마다 한 줄씩 white-space: pre)과 내보내기(캔버스, 13단계)가 같은 결과를 쓴다.
 *   글자 폭은 measure(문자열, style)를 밖에서 받는다(브라우저 = 캔버스 measureText, 테스트 = 가짜). 자간은 여기서 더한다:
 *   한 줄 폭 = measure(줄) + letterSpacing × fontSize × 글자 수 (CSS letter-spacing처럼 마지막 글자 뒤에도 붙는다).
 */
import { FONT_DEFAULT_KEY, isFontKey, nearestWeight } from './studioFonts.js'

export const TEXT_DEFAULTS = {
  text: '', fontFamily: FONT_DEFAULT_KEY, fontSize: 40, fontWeight: 700, color: '#111111', align: 'center', lineHeight: 1.3, letterSpacing: 0,
}
export const TEXT_LIMITS = { fontSize: [8, 400], lineHeight: [0.8, 3], letterSpacing: [-0.2, 1] }
export const TEXT_ALIGNS = ['left', 'center', 'right']
export const TEXT_KEYS = Object.keys(TEXT_DEFAULTS)
export const TEXT_MAX_LENGTH = 5000 // 한 요소의 글자 수 (페이지 문서 크기 제한 안에 머물게)
const HEX_COLOR = /^#[0-9a-f]{6}$/i

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))
const round2 = v => Math.round(v * 100) / 100

/** 새 글자 요소 기본값 (넣기 버튼) — 제목·부제목·본문 */
export const TEXT_PRESETS = {
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
    case 'fontSize': return Number.isFinite(v) ? Math.round(clamp(v, TEXT_LIMITS.fontSize)) : undefined
    case 'fontWeight': return Number.isFinite(v) ? nearestWeight(fontFamily, v) : undefined
    case 'color': return typeof v === 'string' && HEX_COLOR.test(v) ? v.toLowerCase() : undefined
    case 'align': return TEXT_ALIGNS.includes(v) ? v : undefined
    case 'lineHeight': return Number.isFinite(v) ? round2(clamp(v, TEXT_LIMITS.lineHeight)) : undefined
    case 'letterSpacing': return Number.isFinite(v) ? round2(clamp(v, TEXT_LIMITS.letterSpacing)) : undefined
    default: return undefined
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
