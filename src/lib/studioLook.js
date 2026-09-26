/**
 * 사진 필터·직접 조정 (6-2단계) — 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-look.mjs)
 *
 * ★ 저장 위치: 사진 데이터 studio_images.edit 안의 look 칸 (지우기 레이어 layers와 나란히 — 템플릿을 바꿔도 남는다).
 *     edit = { v: 2, layers: [...지우기...], look: { filter, brightness, contrast, saturation, warmth, sharpness } }
 *   look이 없거나 모두 기본값이면 look 칸을 두지 않는다 (예전 사진과 같은 모양).
 *   withLook은 layers를 건드리지 않는다 — 지우기 결과(AI 조각 경로 등)가 그대로 남는다.
 * ★ 값은 단순한 숫자 (조정 -100~100 정수, filter = 아래 LOOK_FILTERS의 id) — 내보내기(13단계)에서 캔버스로 같은 값을 적용한다.
 * ★ 원본 사진·5단계 최종 JPG에는 넣지 않는다. 화면은 CSS filter(+ 온도·선명도는 SVG 필터)로만 보여 준다.
 */

export const ADJUST_KEYS = ['brightness', 'contrast', 'saturation', 'warmth', 'sharpness']
export const ADJUST_LABELS = { brightness: '밝기', contrast: '대비', saturation: '채도', warmth: '온도', sharpness: '선명도' }
export const ADJUST_MIN = -100
export const ADJUST_MAX = 100

/**
 * 필터 = 조정값 묶음 (+ 흑백·세피아 정도). 이름은 우리가 지은 것.
 * gray·sepia는 0~100, 나머지는 조정과 같은 -100~100 (사용자 조정과 더해진다)
 */
export const LOOK_FILTERS = [
  { id: 'none', label: '그대로', params: {} },
  { id: 'clear', label: '말끔', params: { brightness: 8, contrast: 6, saturation: 6 } },
  { id: 'vivid', label: '또렷', params: { contrast: 14, saturation: 30, sharpness: 20 } },
  { id: 'soft', label: '포근', params: { brightness: 6, contrast: -14, saturation: -10 } },
  { id: 'sunny', label: '햇살', params: { brightness: 5, warmth: 30, saturation: 8 } },
  { id: 'dawn', label: '새벽', params: { warmth: -28, contrast: 4, saturation: -6 } },
  { id: 'mono', label: '흑백', params: { gray: 100, contrast: 10 } },
  { id: 'faded', label: '바랜 사진', params: { sepia: 35, contrast: -10, saturation: -15, brightness: 4 } },
]
const FILTER_IDS = new Set(LOOK_FILTERS.map(f => f.id))

export function defaultLook() {
  return { filter: 'none', brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpness: 0 }
}

const clampAdj = v => Math.max(ADJUST_MIN, Math.min(ADJUST_MAX, Math.round(Number(v))))

/** 어떤 값이 와도 올바른 look (빠진 칸·잘못된 값 = 기본값) */
export function normalizeLook(look) {
  const out = defaultLook()
  if (!look || typeof look !== 'object') return out
  if (FILTER_IDS.has(look.filter)) out.filter = look.filter
  for (const k of ADJUST_KEYS) if (Number.isFinite(Number(look[k])) && look[k] !== null && look[k] !== '') out[k] = clampAdj(look[k])
  return out
}

export function isDefaultLook(look) {
  const n = normalizeLook(look)
  return n.filter === 'none' && ADJUST_KEYS.every(k => n[k] === 0)
}

/** edit → look (없으면 기본값) */
export function readLook(edit) {
  return normalizeLook(edit && typeof edit === 'object' ? edit.look : null)
}

/**
 * edit에 look을 넣은 새 edit — layers·다른 칸은 그대로 (같은 값). 기본값이면 look 칸을 뺀다.
 * @param {object} edit 지우기 저장이 만든 edit (buildEdit 결과)
 */
export function withLook(edit, look) {
  const base = edit && typeof edit === 'object' && !Array.isArray(edit) ? edit : {}
  const { look: _old, ...rest } = base
  return isDefaultLook(look) ? rest : { ...rest, look: normalizeLook(look) }
}

/** 필터 + 조정을 더한 최종 숫자 (조정은 -100~100으로 자름, gray·sepia 0~100) */
export function lookValues(look) {
  const n = normalizeLook(look)
  const p = LOOK_FILTERS.find(f => f.id === n.filter)?.params || {}
  const out = {}
  for (const k of ADJUST_KEYS) out[k] = clampAdj((p[k] || 0) + n[k])
  out.gray = Math.max(0, Math.min(100, p.gray || 0))
  out.sepia = Math.max(0, Math.min(100, p.sepia || 0))
  return out
}

/** 온도·선명도는 CSS에 없어서 SVG 필터가 필요한지 */
export function needsSvgFilter(look) {
  const v = lookValues(look)
  return v.warmth !== 0 || v.sharpness !== 0
}

/**
 * SVG 필터 값 — 온도: 빨강·파랑 채널 비율(feColorMatrix), 선명도: 3×3 선명 커널(feConvolveMatrix, 양수만)
 * @returns {{ matrix: string, kernel: string|null }}
 */
export function svgFilterParams(look) {
  const v = lookValues(look)
  const f = n => String(Math.round(n * 1000) / 1000)
  const t = v.warmth / 100 * 0.12 // 온도 ±100 → 빨강 +12%·파랑 -12% (반대도)
  const matrix = `${f(1 + t)} 0 0 0 0  0 1 0 0 0  0 0 ${f(1 - t)} 0 0  0 0 0 1 0`
  let kernel = null
  if (v.sharpness > 0) {
    const a = v.sharpness / 100 * 0.6
    kernel = `0 ${f(-a)} 0 ${f(-a)} ${f(1 + 4 * a)} ${f(-a)} 0 ${f(-a)} 0`
  }
  return { matrix, kernel }
}

/**
 * CSS filter 문자열 (화면 표시용). svgId가 있고 온도·선명도가 있으면 url(#svgId)를 앞에 붙인다.
 * 선명도 음수(부드럽게)는 blur로 보인다.
 */
export function lookCss(look, svgId = null) {
  const v = lookValues(look)
  const parts = []
  if (svgId && needsSvgFilter(look)) parts.push(`url(#${svgId})`)
  if (v.brightness) parts.push(`brightness(${(1 + v.brightness / 100).toFixed(3)})`)
  if (v.contrast) parts.push(`contrast(${(1 + v.contrast / 100).toFixed(3)})`)
  if (v.saturation) parts.push(`saturate(${(1 + v.saturation / 100).toFixed(3)})`)
  if (v.gray) parts.push(`grayscale(${(v.gray / 100).toFixed(3)})`)
  if (v.sepia) parts.push(`sepia(${(v.sepia / 100).toFixed(3)})`)
  if (v.sharpness < 0) parts.push(`blur(${(-v.sharpness / 100 * 1.2).toFixed(2)}px)`)
  return parts.join(' ')
}
