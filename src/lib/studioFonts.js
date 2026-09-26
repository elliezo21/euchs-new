/**
 * 스튜디오 글자 폰트 (10-1단계) — 허용 목록 + 편집기에서만 불러오기 + 캔버스 측정
 *
 * ★ 허용 목록은 상업용 무료 한글 폰트만. 라이선스 = Google Fonts 저장소 google/fonts의 ofl/<폰트>/METADATA.pb `license: "OFL"`
 *   (SIL Open Font License 1.1 — 상업 사용·웹 삽입·이미지 내보내기 가능, 폰트 파일 자체 판매만 금지). 2026-09-26 확인.
 * ★ 폰트 스타일시트는 사이트 전체(index.html)가 아니라 편집기가 열릴 때 한 번만 붙인다 (몰·ERP 화면 속도에 영향 없게).
 *   Noto Sans KR은 index.html이 이미 전역으로 불러오므로(300~900) 다시 붙이지 않는다.
 * ★ 한글 폰트는 글자 범위(unicode-range)별로 나뉘어 있어서, 그릴 글자를 넘겨 그 조각까지 받은 뒤에 잰다 (fontsReadyNow·loadFontsFor).
 * 목록·계산 함수는 DOM이 없어도 된다(node 테스트). document·canvas는 함수 안에서만 쓴다.
 */

// weights = 이 편집기에서 고를 수 있는 굵기 (그 폰트가 실제로 가진 값만 — METADATA.pb 기준)
export const STUDIO_FONTS = [
  { key: 'noto-sans-kr', label: 'Noto Sans KR', family: 'Noto Sans KR', fallback: 'sans-serif', weights: [400, 700, 800, 900], license: 'SIL OFL 1.1', global: true },
  { key: 'noto-serif-kr', label: 'Noto Serif KR', family: 'Noto Serif KR', fallback: 'serif', weights: [400, 700, 900], license: 'SIL OFL 1.1' },
  { key: 'nanum-gothic', label: '나눔고딕', family: 'Nanum Gothic', fallback: 'sans-serif', weights: [400, 700, 800], license: 'SIL OFL 1.1' },
  { key: 'nanum-myeongjo', label: '나눔명조', family: 'Nanum Myeongjo', fallback: 'serif', weights: [400, 700, 800], license: 'SIL OFL 1.1' },
  { key: 'black-han-sans', label: '검은고딕', family: 'Black Han Sans', fallback: 'sans-serif', weights: [400], license: 'SIL OFL 1.1' },
  { key: 'do-hyeon', label: '도현', family: 'Do Hyeon', fallback: 'sans-serif', weights: [400], license: 'SIL OFL 1.1' },
]
export const FONT_DEFAULT_KEY = 'noto-sans-kr'
export const WEIGHT_LABELS = { 400: '보통', 700: '굵게', 800: '더 굵게', 900: '가장 굵게' }

const BY_KEY = new Map(STUDIO_FONTS.map(f => [f.key, f]))
export function fontByKey(key) { return BY_KEY.get(key) || null }
export function isFontKey(key) { return BY_KEY.has(key) }
/** CSS font-family 값 (따옴표 + 대체 글꼴) */
export function cssFamilyOf(key) {
  const f = fontByKey(key)
  return f ? `"${f.family}", ${f.fallback}` : 'sans-serif'
}
/** 그 폰트가 가진 굵기 중 w에 가장 가까운 값 (같은 거리면 굵은 쪽) */
export function nearestWeight(key, w) {
  const ws = fontByKey(key)?.weights || [400]
  let best = ws[0]
  for (const x of ws) if (Math.abs(x - w) < Math.abs(best - w) || (Math.abs(x - w) === Math.abs(best - w) && x > best)) best = x
  return best
}
/** 캔버스·document.fonts용 글꼴 한 줄 ("700 40px "Nanum Gothic", sans-serif") */
export function fontSpec({ fontFamily, fontWeight, fontSize }) {
  return `${fontWeight} ${fontSize}px ${cssFamilyOf(fontFamily)}`
}

// ── 편집기에서만: Google Fonts 스타일시트 한 번 붙이기 ──
const LINK_ID = 'studio-fonts-css'
const CSS_URL = 'https://fonts.googleapis.com/css2?'
  + STUDIO_FONTS.filter(f => !f.global)
    .map(f => `family=${f.family.replace(/ /g, '+')}${f.weights.length > 1 || f.weights[0] !== 400 ? `:wght@${f.weights.join(';')}` : ''}`)
    .join('&')
  + '&display=swap'
let cssPromise = null
let cssReady = false

/** 스타일시트를 붙이고 불러오기가 끝나면 풀린다 (두 번째부터는 같은 약속). 실패하면 reject — 부르는 쪽이 알린다 */
export function ensureStudioFonts() {
  if (cssPromise) return cssPromise
  cssPromise = new Promise((resolve, reject) => {
    const old = document.getElementById(LINK_ID)
    if (old && old.dataset.loaded === '1') { cssReady = true; resolve(); return }
    const link = old || document.createElement('link')
    link.addEventListener('load', () => { link.dataset.loaded = '1'; cssReady = true; resolve() }, { once: true })
    link.addEventListener('error', () => {
      cssPromise = null // 다음에 다시 시도할 수 있게
      link.remove()
      reject(new Error('글꼴 스타일시트를 불러오지 못함'))
    }, { once: true })
    if (!old) {
      link.id = LINK_ID
      link.rel = 'stylesheet'
      link.href = CSS_URL
      document.head.appendChild(link)
    }
  })
  return cssPromise
}

/** 이 글자들(style + text)을 그릴 폰트 조각이 지금 준비돼 있는지 — 스타일시트 전에는 check가 참을 돌려주므로 따로 본다 */
export function fontsReadyNow(list) {
  if (typeof document === 'undefined' || !document.fonts) return false
  return list.every(({ style, text }) => {
    const f = fontByKey(style.fontFamily)
    if (!f) return true
    if (!f.global && !cssReady) return false
    return document.fonts.check(fontSpec(style), sampleOf(text))
  })
}
/** 필요한 폰트 조각을 받는다. 모두 준비되면 true, 못 받은 것이 있으면 false (이유는 console.warn) */
export async function loadFontsFor(list) {
  if (typeof document === 'undefined' || !document.fonts) return false
  if (list.some(({ style }) => !fontByKey(style.fontFamily)?.global)) await ensureStudioFonts()
  await Promise.all(list.map(({ style, text }) => document.fonts.load(fontSpec(style), sampleOf(text))))
  const ok = fontsReadyNow(list)
  if (!ok) console.warn('[studioFonts] 글꼴 조각을 받지 못함 — 대체 글꼴로 잼:', list.map(x => fontSpec(x.style)))
  return ok
}
const sampleOf = text => (typeof text === 'string' && text.trim() !== '' ? text : '가A')

/** 글꼴을 새로 받았을 때 (측정 캐시 비우기·다시 그리기용). 돌려준 함수를 부르면 구독 끝 */
export function onFontsChanged(cb) {
  if (typeof document === 'undefined' || !document.fonts) return () => {}
  document.fonts.addEventListener('loadingdone', cb)
  return () => document.fonts.removeEventListener('loadingdone', cb)
}

/**
 * 캔버스 measureText로 글자 폭(자간 빼고, 페이지 px)을 재는 함수 — studioText.wrapLines의 measure로 넘긴다.
 * 같은 글꼴·글자는 캐시. 글꼴을 새로 받으면 clear()로 비운다 (받기 전 값은 대체 글꼴 폭이므로)
 */
export function createTextMeasure() {
  let ctx = null
  const cache = new Map()
  function measure(str, style) {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d')
    const font = fontSpec(style)
    const k = `${font}\n${str}`
    let w = cache.get(k)
    if (w === undefined) {
      if (ctx.font !== font) ctx.font = font
      w = ctx.measureText(str).width
      if (cache.size > 5000) cache.clear()
      cache.set(k, w)
    }
    return w
  }
  measure.clear = () => cache.clear()
  return measure
}
