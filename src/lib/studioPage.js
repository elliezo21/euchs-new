/**
 * 스튜디오 페이지 문서(studio_projects.page) — 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-page.mjs)
 *
 * ★ page v1 모양 (페이지 픽셀 좌표, 폭 = page.width)
 *   {
 *     v: 1, width: 780, gap: 0,
 *     sections: [ { id: 's_…', height, bg: '#ffffff',
 *       items: [ { id: 'i_…', type: 'image', imageId, x, y, w, h, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false } ] } ],
 *     parked: [ imageId, … ]
 *   }
 *   구간 순서 = sections 배열 순서(위 → 아래). 구간 사이 간격 = gap(px).
 *   아이템 좌표는 그 구간의 왼쪽 위 기준. 구간 밖으로 나간 부분은 보이지 않는다(구간이 잘라낸다).
 *   앞뒤 순서 = items 배열 순서 (뒤가 앞에 보인다). 모르는 type 아이템(글자·도형 등 다음 단계)은 그리지 않고 보존한다.
 *   parked = 페이지에서 뺀 사진 (사진 자체는 지우지 않는다. studio_images.included와는 별개 — 결정 13)
 * ★ 사진 주소는 저장하지 않는다 (서명 주소는 만료). imageId만.
 * ★ 지운 결과는 페이지가 아니라 사진(studio_images.edit)에 있다 → 템플릿을 바꿔도 지운 사진이 남는다.
 * ★ 저장은 page_version 낙관적 잠금 (studioProjects.saveProjectPage). DB 제약: object + 'v' 키, 1,000,000바이트 이하.
 * ★ 모든 바꾸기 함수는 새 문서를 돌려주고 입력을 바꾸지 않는다. 할 수 없는 요청이면 입력을 그대로 돌려준다(=== 비교로 알 수 있음).
 */

export const PAGE_VERSION = 1
export const PAGE_WIDTH = 780 // 쿠팡 (결정 17). 폭은 이 값 하나로만 쓴다
export const PAGE_WIDTH_LABEL = '쿠팡'
export const PAGE_MAX_BYTES = 1000000 // DB 제약 studio_projects_page_size와 같은 값
export const SECTION_BG = '#ffffff'
export const SECTION_MAX = 200
export const SECTION_H_MIN = 20
export const SECTION_H_MAX = 20000
export const ITEM_MIN_VISIBLE = 40 // 옮길 때 구간 안에 최소한 남아 있어야 하는 폭·높이 (구간 밖으로 사라지지 않게)

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const clone = v => JSON.parse(JSON.stringify(v))

export function newPageId(prefix) {
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  let s = `${prefix}_`
  for (const n of buf) s += ID_CHARS[n % ID_CHARS.length]
  return s
}

// ── 만들기 ──

export function emptyPage(width = PAGE_WIDTH) {
  return { v: PAGE_VERSION, width, gap: 0, sections: [], parked: [] }
}

/** 크기를 아는 사진인지 (DB width/height) */
export function hasSize(img) {
  return !!img && Number.isInteger(img.width) && Number.isInteger(img.height) && img.width > 0 && img.height > 0
}

/** 폭 안에 사진 비율 그대로 꽉 채웠을 때의 높이 (정수, 구간 높이 범위 안) */
export function fitHeight(width, imgW, imgH) {
  return Math.min(SECTION_H_MAX, Math.max(SECTION_H_MIN, Math.round(width * imgH / imgW)))
}

export function newImageItem(imageId, x, y, w, h) {
  return { id: newPageId('i'), type: 'image', imageId, x, y, w, h, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }
}

/** 사진 한 장이 폭에 꽉 찬 구간 */
export function imageSection(img, width = PAGE_WIDTH) {
  const h = fitHeight(width, img.width, img.height)
  return { id: newPageId('s'), height: h, bg: SECTION_BG, items: [newImageItem(img.id, 0, 0, width, h)] }
}

/**
 * 기본 배치 = 사진 1장 → 구간 1개 (폭에 꽉 차게, 구간 높이 = 폭 × 세로/가로)
 * @param {{ id, width, height }[]} images 넣을 사진 (이 순서대로). 크기를 모르는 사진은 넣지 않고 사유를 남긴다
 */
export function buildInitialPage(images, width = PAGE_WIDTH) {
  const page = emptyPage(width)
  for (const img of images) {
    if (!hasSize(img)) {
      console.error('[studioPage] 크기를 모르는 사진 — 기본 배치에서 뺌:', img?.id, img?.width, img?.height)
      continue
    }
    if (page.sections.length >= SECTION_MAX) {
      console.error(`[studioPage] 구간 ${SECTION_MAX}개 초과 — 나머지 사진은 기본 배치에서 뺌:`, img.id)
      break
    }
    page.sections.push(imageSection(img, width))
  }
  return page
}

// ── 검사 ──

/** 화면에서 그릴 수 있는 사진 아이템인지 (모양이 어긋나면 그리지 않고 보존만) */
export function isValidImageItem(it) {
  return !!it && it.type === 'image' && typeof it.id === 'string' && typeof it.imageId === 'string' && it.imageId !== ''
    && [it.x, it.y, it.w, it.h].every(Number.isFinite) && it.w > 0 && it.h > 0
}

/**
 * 문서 모양 검사. 아이템 하나가 이상한 것은 문서 오류가 아니다 (그 아이템만 그리지 않음)
 * @returns {string[]} 문제 목록 (빈 배열 = 정상)
 */
export function pageProblems(page) {
  if (!page || typeof page !== 'object' || Array.isArray(page)) return ['page가 객체가 아님']
  const out = []
  if (!('v' in page)) out.push('v 없음')
  else if (page.v !== PAGE_VERSION) out.push(`v가 ${PAGE_VERSION}이 아님: ${page.v}`)
  if (!Number.isInteger(page.width) || page.width < 1) out.push(`width가 양의 정수가 아님: ${page.width}`)
  if (!Number.isInteger(page.gap) || page.gap < 0) out.push(`gap이 0 이상 정수가 아님: ${page.gap}`)
  if (!Array.isArray(page.parked) || page.parked.some(x => typeof x !== 'string')) out.push('parked가 문자열 배열이 아님')
  if (!Array.isArray(page.sections)) return [...out, 'sections가 배열이 아님']
  const sids = new Set()
  const iids = new Set()
  page.sections.forEach((s, i) => {
    if (!s || typeof s.id !== 'string') { out.push(`구간 ${i}: id 없음`); return }
    if (sids.has(s.id)) out.push(`구간 ${i}: id 중복 ${s.id}`)
    sids.add(s.id)
    if (!Number.isInteger(s.height) || s.height < 1) out.push(`구간 ${i}: height가 양의 정수가 아님 ${s.height}`)
    if (typeof s.bg !== 'string') out.push(`구간 ${i}: bg가 문자열이 아님`)
    if (!Array.isArray(s.items)) { out.push(`구간 ${i}: items가 배열이 아님`); return }
    for (const it of s.items) {
      if (!it || typeof it.id !== 'string') { out.push(`구간 ${i}: id 없는 아이템`); continue }
      if (iids.has(it.id)) out.push(`구간 ${i}: 아이템 id 중복 ${it.id}`)
      iids.add(it.id)
    }
  })
  return out
}

/**
 * DB의 page → 화면에 쓸 문서 (복사본). null이면 null, 모양이 어긋나면 사유와 함께 null
 * @returns {{ page: object|null, problems: string[] }}
 */
export function readPage(raw, projectId) {
  if (raw === null || raw === undefined) return { page: null, problems: [] }
  const problems = pageProblems(raw)
  if (problems.length) {
    console.error('[studioPage] 페이지 문서 모양이 어긋남:', projectId, problems)
    return { page: null, problems }
  }
  for (const s of raw.sections) {
    for (const it of s.items) {
      if (it.type === 'image' && !isValidImageItem(it)) console.error('[studioPage] 잘못된 사진 아이템 — 그리지 않고 보존:', projectId, s.id, it)
    }
  }
  return { page: clone(raw), problems: [] }
}

// jsonb::text가 더 붙이는 공백 수 — 키마다 ": "의 공백 1칸, 객체 키 사이·배열 원소 사이 ", "의 공백 1칸
function jsonbSpaces(v) {
  if (Array.isArray(v)) return Math.max(0, v.length - 1) + v.reduce((n, x) => n + jsonbSpaces(x), 0)
  if (v && typeof v === 'object') {
    const vals = Object.values(v).filter(x => x !== undefined)
    return vals.length + Math.max(0, vals.length - 1) + vals.reduce((n, x) => n + jsonbSpaces(x), 0)
  }
  return 0
}

/**
 * 저장 크기 (바이트) — DB 제약과 같은 기준: octet_length(page::text).
 * jsonb를 글자로 바꾸면 ": "·", " 뒤에 공백이 붙어 JSON.stringify보다 크다 (실측: 압축 37바이트 → jsonb 글자 45바이트)
 */
export function pageBytes(page) {
  return new TextEncoder().encode(JSON.stringify(page)).length + jsonbSpaces(page)
}

/** 저장해도 되는 크기인지 */
export function checkPageSize(page) {
  const bytes = pageBytes(page)
  return { ok: bytes <= PAGE_MAX_BYTES, bytes, max: PAGE_MAX_BYTES }
}

// ── 찾기·배치 계산 ──

/** 구간 위치: rows [{ id, top, height }] + 전체 높이 (gap 포함) */
export function layoutSections(page) {
  let top = 0
  const rows = page.sections.map((s, i) => {
    if (i > 0) top += page.gap
    const r = { id: s.id, top, height: s.height }
    top += s.height
    return r
  })
  return { rows, total: top }
}

/** @returns {{ section, sectionIndex, item, itemIndex } | null} */
export function findItem(page, itemId) {
  for (let si = 0; si < page.sections.length; si++) {
    const items = page.sections[si].items
    const ii = items.findIndex(it => it.id === itemId)
    if (ii >= 0) return { section: page.sections[si], sectionIndex: si, item: items[ii], itemIndex: ii }
  }
  return null
}

/** 페이지에 쓰인 사진 id (중복 없이, 위에서부터) */
export function pageImageIds(page) {
  const out = []
  const seen = new Set()
  for (const s of page?.sections || []) {
    for (const it of s.items || []) {
      if (isValidImageItem(it) && !seen.has(it.imageId)) { seen.add(it.imageId); out.push(it.imageId) }
    }
  }
  return out
}

/** 이 사진이 들어 있는 첫 아이템 id (없으면 null) */
export function firstItemOfImage(page, imageId) {
  for (const s of page?.sections || []) {
    const it = (s.items || []).find(x => isValidImageItem(x) && x.imageId === imageId)
    if (it) return it.id
  }
  return null
}

function mapSections(page, fn) {
  return { ...page, sections: page.sections.map(fn) }
}

// ── 구간 바꾸기 ──

/**
 * 구간 추가
 * @param {{ height?: number, bg?: string, at?: number }} opts at = 넣을 위치(없으면 맨 아래)
 */
export function addSection(page, { height = 400, bg = SECTION_BG, at } = {}) {
  if (page.sections.length >= SECTION_MAX) return page
  if (!Number.isInteger(height) || height < SECTION_H_MIN || height > SECTION_H_MAX) return page
  const s = { id: newPageId('s'), height, bg, items: [] }
  const i = Number.isInteger(at) ? Math.max(0, Math.min(page.sections.length, at)) : page.sections.length
  const sections = [...page.sections]
  sections.splice(i, 0, s)
  return { ...page, sections }
}

/** 구간 삭제 — 그 구간의 사진은 parked로 옮긴다 (사진을 잃지 않게) */
export function removeSection(page, sectionId) {
  const s = page.sections.find(x => x.id === sectionId)
  if (!s) return page
  let parked = page.parked
  for (const it of s.items) if (isValidImageItem(it)) parked = addParked(parked, it.imageId)
  const rest = page.sections.filter(x => x.id !== sectionId)
  return { ...page, sections: rest, parked: dropPlaced(parked, rest) }
}

/** 구간 순서 바꾸기 (toIndex = 옮긴 뒤 위치) */
export function moveSection(page, sectionId, toIndex) {
  const from = page.sections.findIndex(x => x.id === sectionId)
  if (from < 0 || !Number.isInteger(toIndex)) return page
  const to = Math.max(0, Math.min(page.sections.length - 1, toIndex))
  if (to === from) return page
  const sections = [...page.sections]
  const [s] = sections.splice(from, 1)
  sections.splice(to, 0, s)
  return { ...page, sections }
}

export function setSectionHeight(page, sectionId, height) {
  if (!Number.isInteger(height) || height < SECTION_H_MIN || height > SECTION_H_MAX) return page
  if (!page.sections.some(x => x.id === sectionId && x.height !== height)) return page
  return mapSections(page, s => (s.id === sectionId ? { ...s, height } : s))
}

export function setGap(page, gap) {
  if (!Number.isInteger(gap) || gap < 0 || gap > 400 || gap === page.gap) return page
  return { ...page, gap }
}

// ── 아이템 바꾸기 ──

/** 아이템 추가 (맨 앞에 보이게 = 배열 끝) */
export function addItem(page, sectionId, item) {
  if (!item || typeof item.id !== 'string' || findItem(page, item.id)) return page
  if (!page.sections.some(s => s.id === sectionId)) return page
  const next = mapSections(page, s => (s.id === sectionId ? { ...s, items: [...s.items, clone(item)] } : s))
  return item.type === 'image' ? { ...next, parked: page.parked.filter(x => x !== item.imageId) } : next
}

export function removeItem(page, itemId) {
  if (!findItem(page, itemId)) return page
  return mapSections(page, s => (s.items.some(it => it.id === itemId) ? { ...s, items: s.items.filter(it => it.id !== itemId) } : s))
}

/**
 * 옮길 수 있는 위치로 맞춘다 — 구간 안에서만. 사진이 구간보다 크면(기본 배치처럼 꽉 찬 사진) 구간 밖으로 나간 부분은 잘려 보이고,
 * 최소 ITEM_MIN_VISIBLE px는 구간 안에 남는다. 정수로 맞춘다.
 */
export function clampItemPosition(item, section, width, x, y) {
  const minVisW = Math.min(ITEM_MIN_VISIBLE, item.w)
  const minVisH = Math.min(ITEM_MIN_VISIBLE, item.h)
  const lo = (size, span, vis) => Math.min(0, span - size, vis - size)
  const hi = (size, span, vis) => Math.max(0, span - size, span - vis)
  const cx = Math.max(lo(item.w, width, minVisW), Math.min(hi(item.w, width, minVisW), Math.round(x)))
  const cy = Math.max(lo(item.h, section.height, minVisH), Math.min(hi(item.h, section.height, minVisH), Math.round(y)))
  return { x: cx, y: cy }
}

/** 아이템 옮기기 (그 구간 안에서만 — clampItemPosition). 잠긴 아이템은 옮기지 않는다 */
export function moveItem(page, itemId, x, y) {
  const f = findItem(page, itemId)
  if (!f || f.item.locked || !Number.isFinite(x) || !Number.isFinite(y)) return page
  const p = clampItemPosition(f.item, f.section, page.width, x, y)
  if (p.x === f.item.x && p.y === f.item.y) return page
  return mapSections(page, s => (s.id === f.section.id
    ? { ...s, items: s.items.map(it => (it.id === itemId ? { ...it, x: p.x, y: p.y } : it)) } : s))
}

/**
 * 앞뒤 순서 (그 구간 안에서)
 * @param {'front'|'back'|'forward'|'backward'} where front=맨 앞, back=맨 뒤, forward=한 칸 앞, backward=한 칸 뒤
 */
export function reorderItem(page, itemId, where) {
  const f = findItem(page, itemId)
  if (!f) return page
  const n = f.section.items.length
  const to = where === 'front' ? n - 1 : where === 'back' ? 0 : where === 'forward' ? f.itemIndex + 1 : where === 'backward' ? f.itemIndex - 1 : null
  if (to === null || to < 0 || to >= n || to === f.itemIndex) return page
  const items = [...f.section.items]
  const [it] = items.splice(f.itemIndex, 1)
  items.splice(to, 0, it)
  return mapSections(page, s => (s.id === f.section.id ? { ...s, items } : s))
}

function addParked(parked, imageId) {
  return parked.includes(imageId) ? parked : [...parked, imageId]
}
// 페이지에 아직 남아 있는 사진은 parked에 두지 않는다 (같은 사진을 두 번 넣었다가 하나만 뺀 경우)
function dropPlaced(parked, sections) {
  const placed = new Set()
  for (const s of sections) for (const it of s.items) if (isValidImageItem(it)) placed.add(it.imageId)
  return parked.filter(id => !placed.has(id))
}

/** 빼두기 — 이 사진 아이템을 페이지에서 빼고 parked에 넣는다 (구간은 남는다) */
export function parkItem(page, itemId) {
  const f = findItem(page, itemId)
  if (!f || !isValidImageItem(f.item)) return page
  const next = removeItem(page, itemId)
  return { ...next, parked: dropPlaced(addParked(page.parked, f.item.imageId), next.sections) }
}

/**
 * 다시 넣기 — parked에서 빼고 페이지에 넣는다
 *   sectionId가 있으면 그 구간 맨 위에 폭에 꽉 차게, 없으면 맨 아래에 사진 1장 구간을 새로 만든다
 * @param {{ id, width, height }} img
 */
export function unparkImage(page, img, sectionId = null) {
  if (!img || !page.parked.includes(img.id) || !hasSize(img)) return page
  const parked = page.parked.filter(x => x !== img.id)
  if (sectionId) {
    if (!page.sections.some(s => s.id === sectionId)) return page
    const h = Math.round(page.width * img.height / img.width)
    const next = addItem(page, sectionId, newImageItem(img.id, 0, 0, page.width, h))
    return { ...next, parked }
  }
  if (page.sections.length >= SECTION_MAX) return page
  return { ...page, sections: [...page.sections, imageSection(img, page.width)], parked }
}

// ── 보기 배율 (화면에서만, 저장하지 않음) ──
export const ZOOM_PRESETS = [0.5, 0.75, 1]

/** 가운데 영역 폭에 페이지(+양옆 여백)가 들어가는 배율 — 1% 단위로 내림, 20%~100% */
export function fitZoom(areaWidth, pageWidth, sideGutter) {
  if (!(areaWidth > 0) || !(pageWidth > 0)) return 1
  const z = Math.floor(((areaWidth - 2 * sideGutter) / pageWidth) * 100) / 100
  return Math.min(1, Math.max(0.2, z))
}
