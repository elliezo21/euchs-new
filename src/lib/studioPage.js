/**
 * 스튜디오 페이지 문서(studio_projects.page) — 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-page.mjs)
 *
 * ★ page v1 모양 (페이지 픽셀 좌표, 폭 = page.width)
 *   {
 *     v: 1, width: 780, gap: 0,
 *     sections: [ { id: 's_…', height, bg: '#ffffff',
 *       items: [ { id: 'i_…', type: 'image', imageId, x, y, w, h, rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false } ] } ],
 *   rotation = 도(°), 가운데를 축으로 시계 방향, -180 초과 ~ 180 이하. x·y·w·h는 돌리기 전 네모 (돌림은 화면에서 transform으로만).
 *   6-1단계에서 rotation이 생겼다 — 예전에 저장된 페이지에 없는 칸은 readPage가 기본값으로 채운다(normalizeItem, v는 1 그대로).
 *   회전·뒤집기·투명도는 페이지 요소 속성일 뿐, 사진 파일(원본·5단계 최종 JPG)에는 넣지 않는다.
 *   groupId(선택 칸, 9단계) = 그룹 이름 'g_…' — 같은 값의 요소끼리 한 그룹. 칸이 없으면 그룹 아님 (v는 1 그대로).
 *     한 그룹은 한 구간 안에서만, 구성원 2개 이상. 어긋난 groupId(1개만 남음·구간을 넘음)는 읽을 때·바꾼 뒤 cleanGroups가 없앤다.
 *   글자 요소(10-1단계) = type 'text' + 공통 칸 + text·fontFamily·fontSize·fontWeight·color·align·lineHeight·letterSpacing
 *     (모양·범위·기본값은 studioText.js 맨 위). h는 줄 수 × fontSize × lineHeight로 자동 — 손으로 정하지 않는다.
 *     readPage가 normalizeTextItem으로 빠진 칸·잘못된 값을 기본값으로 채운다 (v는 1 그대로).
 *     parked: [ imageId, … ]
 *   }
 *   구간 순서 = sections 배열 순서(위 → 아래). 구간 사이 간격 = gap(px).
 *   아이템 좌표는 그 구간의 왼쪽 위 기준. 구간 밖으로 나간 부분은 보이지 않는다(구간이 잘라낸다).
 *   앞뒤 순서 = items 배열 순서 (뒤가 앞에 보인다). 모르는 type 아이템(도형 등 다음 단계)은 그리지 않고 보존한다.
 *   parked = 페이지에서 뺀 사진 (사진 자체는 지우지 않는다. studio_images.included와는 별개 — 결정 13)
 * ★ 사진 주소는 저장하지 않는다 (서명 주소는 만료). imageId만.
 * ★ 지운 결과는 페이지가 아니라 사진(studio_images.edit)에 있다 → 템플릿을 바꿔도 지운 사진이 남는다.
 * ★ 저장은 page_version 낙관적 잠금 (studioProjects.saveProjectPage). DB 제약: object + 'v' 키, 1,000,000바이트 이하.
 * ★ 모든 바꾸기 함수는 새 문서를 돌려주고 입력을 바꾸지 않는다. 할 수 없는 요청이면 입력을 그대로 돌려준다(=== 비교로 알 수 있음).
 */
import { isValidTextItem, normalizeTextItem, patchTextItem, fitTextItem, textStyleOf, wrapLines, TEXT_LIMITS } from './studioText.js'
import {
  isValidShapeItem, isValidLineItem, normalizeShapeItem, normalizeLineItem, patchShapeItem, patchLineItem, fitLineItem, moveLineEnd,
} from './studioShape.js'

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
  return { id: newPageId('i'), type: 'image', imageId, x, y, w, h, rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }
}

/** 공통 속성 기본값 — 예전 페이지(칸 없음)도 이 값으로 읽는다 */
export const ITEM_DEFAULTS = { rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }

/**
 * 요소 꾸미기 (6-2 — 놓인 자리마다 다를 수 있어 사진이 아니라 페이지 요소에 둔다). 없으면 = 꾸미기 없음.
 *   borderWidth 0~40 px, borderColor '#rrggbb', radius 0~400 px, shadow 0~100 (그림자 세기)
 */
export const ITEM_STYLE_DEFAULTS = { borderWidth: 0, borderColor: '#ffffff', radius: 0, shadow: 0 }
export const ITEM_STYLE_LIMITS = { borderWidth: [0, 40], radius: [0, 400], shadow: [0, 100] }
const HEX_COLOR = /^#[0-9a-f]{6}$/i

/** 빠진 공통 속성을 기본값으로 채운 복사본 (모양이 잘못된 값도 기본값으로). 다른 칸은 그대로 */
export function normalizeItem(it) {
  if (!it || typeof it !== 'object') return it
  const out = { ...it }
  if (!Number.isFinite(out.rotation)) out.rotation = ITEM_DEFAULTS.rotation
  if (!Number.isFinite(out.opacity) || out.opacity < 0 || out.opacity > 1) out.opacity = ITEM_DEFAULTS.opacity
  for (const k of ['flipX', 'flipY', 'locked', 'hidden']) if (typeof out[k] !== 'boolean') out[k] = ITEM_DEFAULTS[k]
  return out
}

/** 꾸미기 값 (빠지거나 잘못된 값 = 없음) — 화면·내보내기에서 읽을 때 */
export function itemStyleOf(it) {
  const out = { ...ITEM_STYLE_DEFAULTS }
  for (const [k, [lo, hi]] of Object.entries(ITEM_STYLE_LIMITS)) {
    if (Number.isFinite(it?.[k])) out[k] = Math.max(lo, Math.min(hi, Math.round(it[k])))
  }
  if (typeof it?.borderColor === 'string' && HEX_COLOR.test(it.borderColor)) out.borderColor = it.borderColor.toLowerCase()
  return out
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

/** 화면에 그리는 요소 (사진·글자·도형·선 — 11-1). 그 밖의 type은 보존만 */
export function isDrawableItem(it) {
  return isValidImageItem(it) || isValidTextItem(it) || isValidShapeItem(it) || isValidLineItem(it)
}

/** type별 칸 정리 (readPage) — 공통 칸은 normalizeItem, 글자·도형·선은 그 칸도 */
const NORMALIZE_BY_TYPE = { text: normalizeTextItem, shape: normalizeShapeItem, line: normalizeLineItem }

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
      if (it.type === 'text' && !isValidTextItem(it)) console.error('[studioPage] 잘못된 글자 아이템 — 그리지 않고 보존:', projectId, s.id, it)
      if ((it.type === 'shape' && !isValidShapeItem(it)) || (it.type === 'line' && !isValidLineItem(it))) console.error('[studioPage] 잘못된 도형·선 아이템 — 그리지 않고 보존:', projectId, s.id, it)
    }
  }
  const page = clone(raw)
  // 예전 페이지: 회전 등 빠진 칸을 기본값으로. 글자 요소(10-1)는 글자 칸도 (글꼴·크기 등 잘못된 값 → 기본값)
  // 11-1: 도형·선도 같은 방식 (NORMALIZE_BY_TYPE)
  for (const s of page.sections) {
    s.items = s.items.map(it => {
      const n = normalizeItem(it)
      const byType = NORMALIZE_BY_TYPE[n?.type]
      return byType ? byType(n) : n
    })
  }
  return { page: cleanGroups(page), problems: [] } // 9단계: 어긋난 그룹(1개만·구간을 넘음)은 풀어서 읽는다
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

/**
 * 구간 순서 한 번에 바꾸기 (8-2 [순서 변경] 화면) — orderedIds 순서대로 다시 놓는다.
 * 지금 구간 id와 개수·구성이 정확히 같을 때만(빠진 id·남는 id·중복 없음). 아니면·순서가 같으면 입력 그대로
 */
export function reorderSections(page, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length !== page.sections.length) return page
  const byId = new Map(page.sections.map(s => [s.id, s]))
  if (new Set(orderedIds).size !== orderedIds.length || !orderedIds.every(id => byId.has(id))) return page
  if (orderedIds.every((id, i) => page.sections[i].id === id)) return page
  return { ...page, sections: orderedIds.map(id => byId.get(id)) }
}

/** 순서 목록 안에서 id 하나를 toIndex 자리로 (8-2 [순서 변경] 화면의 끌기·버튼). 못 하면(없는 id·같은 자리) 입력 그대로 */
export function moveInOrder(ids, id, toIndex) {
  const from = ids.indexOf(id)
  if (from < 0 || !Number.isInteger(toIndex)) return ids
  const to = Math.max(0, Math.min(ids.length - 1, toIndex))
  if (to === from) return ids
  const out = [...ids]
  out.splice(from, 1)
  out.splice(to, 0, id)
  return out
}

export function setSectionHeight(page, sectionId, height) {
  if (!Number.isInteger(height) || height < SECTION_H_MIN || height > SECTION_H_MAX) return page
  if (!page.sections.some(x => x.id === sectionId && x.height !== height)) return page
  return mapSections(page, s => (s.id === sectionId ? { ...s, height } : s))
}

export const GAP_MAX = 400
export function setGap(page, gap) {
  if (!Number.isInteger(gap) || gap < 0 || gap > GAP_MAX || gap === page.gap) return page
  return { ...page, gap }
}

/**
 * 구간 복제 (8-1) — 바로 아래에 같은 구간. 새 구간 id, 안의 요소도 새 id.
 * 잠긴 요소는 잠금을 풀어 둔다 (6-1 복제·붙여넣기와 같은 규칙 — 새로 만든 것을 바로 옮길 수 있게). 모르는 type 요소도 그대로 복사.
 * @returns {{ page, sectionId: string|null }} 할 수 없으면(없는 구간·SECTION_MAX) page 그대로, sectionId null
 */
export function duplicateSection(page, sectionId) {
  const i = page.sections.findIndex(s => s.id === sectionId)
  if (i < 0 || page.sections.length >= SECTION_MAX) return { page, sectionId: null }
  const src = page.sections[i]
  const gidMap = new Map() // 9단계: 복사한 구간의 그룹은 새 groupId로 (원본 그룹과 섞이지 않게)
  const newGid = gid => { if (!gidMap.has(gid)) gidMap.set(gid, newPageId('g')); return gidMap.get(gid) }
  const copy = {
    ...clone(src),
    id: newPageId('s'),
    items: src.items.map(it => {
      if (!it || typeof it !== 'object') return clone(it)
      const n = { ...clone(it), id: newPageId('i'), ...('locked' in it ? { locked: false } : {}) }
      return hasGroup(it) ? { ...n, groupId: newGid(it.groupId) } : n
    }),
  }
  const sections = [...page.sections]
  sections.splice(i + 1, 0, copy)
  return { page: { ...page, sections, parked: dropPlaced(page.parked, sections) }, sectionId: copy.id }
}

/** 구간 배경색 (8-1) — '#rrggbb'만 (소문자로 저장). 같은 값·잘못된 값·없는 구간이면 그대로 */
export function setSectionBg(page, sectionId, color) {
  if (typeof color !== 'string' || !HEX_COLOR.test(color)) return page
  const bg = color.toLowerCase()
  if (!page.sections.some(s => s.id === sectionId && s.bg !== bg)) return page
  return mapSections(page, s => (s.id === sectionId ? { ...s, bg } : s))
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
  return cleanGroups(mapSections(page, s => (s.items.some(it => it.id === itemId) ? { ...s, items: s.items.filter(it => it.id !== itemId) } : s)))
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

// ── 목록에서 페이지로 넣기 (6-3) — [페이지에 넣기] 버튼·끌어다 놓기. 이미 페이지에 있는 사진도 한 번 더 넣을 수 있다 ──
export const DROP_WIDTH_RATIO = 0.5 // 끌어다 놓은 사진의 폭 = 페이지 폭의 절반 (비율 유지)
export const DRAG_IMAGE_TYPE = 'application/x-euchs-studio-image' // 목록 → 페이지 끌기의 dataTransfer 종류 (값 = 사진 id)

/** 요소가 하나도 없는 구간 (사진을 뺀 빈 구간) */
export function isEmptySection(s) {
  return !!s && Array.isArray(s.items) && s.items.length === 0
}

/**
 * [페이지에 넣기] — sectionId(지금 보이는 구간)가 비어 있으면 그 구간에 폭에 맞춰 넣고 구간 높이를 사진 비율에 맞춘다.
 * 아니면 그 구간 바로 아래에 사진 1장 구간을 새로 만든다 (첫 배치와 같은 규칙: 폭에 꽉 차게, 비율 유지).
 * sectionId가 없거나 없는 구간이면 맨 아래. parked에 있던 사진이면 parked에서 뺀다.
 * @param {{ id, width, height }} img
 * @returns {{ page, itemId: string|null }} 넣을 수 없으면 page 그대로, itemId null
 */
export function insertImageNear(page, img, sectionId = null) {
  if (!hasSize(img)) return { page, itemId: null }
  const idx = sectionId ? page.sections.findIndex(s => s.id === sectionId) : -1
  const parked = page.parked.filter(x => x !== img.id)
  if (idx >= 0 && isEmptySection(page.sections[idx])) {
    const h = fitHeight(page.width, img.width, img.height)
    const item = newImageItem(img.id, 0, 0, page.width, h)
    const sections = page.sections.map((s, i) => (i === idx ? { ...s, height: h, items: [item] } : s))
    return { page: { ...page, sections, parked }, itemId: item.id }
  }
  if (page.sections.length >= SECTION_MAX) return { page, itemId: null }
  const sec = imageSection(img, page.width)
  const sections = [...page.sections]
  sections.splice(idx >= 0 ? idx + 1 : sections.length, 0, sec)
  return { page: { ...page, sections, parked }, itemId: sec.items[0].id }
}

/**
 * 끌어다 놓기 — 놓은 구간의 놓은 자리(구간 좌표 x·y = 사진 가운데)에 페이지 폭의 절반 크기로(비율 유지) 맨 앞에 넣는다.
 * 빈 구간에 놓으면 [페이지에 넣기]처럼 폭에 맞춰 채운다. 구간 밖(sectionId 없음)에 놓으면 맨 아래 새 구간.
 * @returns {{ page, itemId: string|null }}
 */
export function dropImageAt(page, img, sectionId, x, y) {
  if (!hasSize(img)) return { page, itemId: null }
  const s = sectionId ? page.sections.find(v => v.id === sectionId) : null
  if (!s || isEmptySection(s)) return insertImageNear(page, img, s ? s.id : null)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { page, itemId: null }
  const w = Math.max(ITEM_MIN_SIZE, Math.round(page.width * DROP_WIDTH_RATIO))
  const h = Math.max(ITEM_MIN_SIZE, Math.round(w * img.height / img.width))
  const item = newImageItem(img.id, 0, 0, w, h)
  const p = clampItemPosition(item, s, page.width, x - w / 2, y - h / 2)
  const next = addItem(page, s.id, { ...item, x: p.x, y: p.y })
  return next === page ? { page, itemId: null } : { page: next, itemId: item.id }
}

// ── 공통 조작 (6-1단계) — 사진·글자·도형 모든 요소 공통. ids = 요소 id 배열 ──
// ★ 잠긴 요소(locked)는 이동·크기·회전·뒤집기·정렬·삭제·잘라내기를 하지 않는다 (선택·순서·투명도·숨기기·복제·복사는 된다).
// ★ 복제·붙여넣기로 만든 요소는 잠금을 풀어 둔다 (새로 만든 것을 바로 옮길 수 있게).
// ★ 요소를 구간 사이로 옮기지는 않는다 (구간을 바꾸려면 잘라내기 → 다른 구간에 붙여넣기).

export const ITEM_MIN_SIZE = 10  // 크기 조절 최소 가로·세로 (페이지 px)
export const PASTE_OFFSET = 20   // 복제·붙여넣기 때 살짝 옆으로 (페이지 px)

/** 조작할 수 있는 요소 (좌표가 숫자, 크기 양수) — 모르는 type도 좌표만 맞으면 조작한다 */
export function isTransformable(it) {
  return !!it && typeof it.id === 'string' && [it.x, it.y, it.w, it.h].every(Number.isFinite) && it.w > 0 && it.h > 0
}

/** 각도를 -180 초과 ~ 180 이하로 (소수 둘째 자리) */
export function normAngle(deg) {
  let a = ((Number(deg) % 360) + 360) % 360
  if (a > 180) a -= 360
  const r = Math.round(a * 100) / 100
  return r === 0 ? 0 : r // -0 없애기
}

/** 돌린 요소가 실제로 차지하는 네모 (구간 좌표, 축에 나란한 네모) */
export function itemBounds(it) {
  const t = (normAngle(it.rotation || 0) * Math.PI) / 180
  const c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t))
  const bw = it.w * c + it.h * s, bh = it.w * s + it.h * c
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh }
}

function unionBounds(list) {
  const x0 = Math.min(...list.map(b => b.x)), y0 = Math.min(...list.map(b => b.y))
  const x1 = Math.max(...list.map(b => b.x + b.w)), y1 = Math.max(...list.map(b => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** ids에 든 요소만 fn(it, section)으로 바꾼다. 하나도 안 바뀌면 입력 그대로 */
function mapItems(page, ids, fn) {
  const set = new Set(ids)
  let changed = false
  const sections = page.sections.map(s => {
    let sc = false
    const items = s.items.map(it => {
      if (!set.has(it?.id) || !isTransformable(it)) return it
      const n = fn(it, s)
      if (n === it || JSON.stringify(n) === JSON.stringify(it)) return it
      sc = true
      return n
    })
    if (!sc) return s
    changed = true
    return { ...s, items }
  })
  return changed ? { ...page, sections } : page
}

/** 페이지 순서(위 구간 → 아래, 구간 안에서는 뒤 → 앞)대로 { section, item } */
function pickItems(page, ids) {
  const set = new Set(ids)
  const out = []
  for (const s of page.sections) for (const it of s.items) if (set.has(it?.id) && isTransformable(it)) out.push({ section: s, item: it })
  return out
}

/** 옮기기 (dx·dy 페이지 px) — 각자 그 구간 안에서만 (clampItemPosition). 잠긴 요소는 그대로 */
export function moveItems(page, ids, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return page
  return mapItems(page, ids, (it, s) => {
    if (it.locked) return it
    const p = clampItemPosition(it, s, page.width, it.x + dx, it.y + dy)
    return { ...it, x: p.x, y: p.y }
  })
}

/**
 * 손잡이로 크기 조절한 새 네모 — 반대쪽 손잡이(모서리·변)가 제자리에 있게. 돌린 요소도 요소 방향 기준으로 늘어난다.
 * @param {{x,y,w,h}} rect 돌리기 전 네모  @param {number} rotation 도
 * @param {'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'} handle  @param {number} dx,dy 끌어온 거리 (페이지 px, 화면 방향)
 * @param {{ keepRatio?: boolean, min?: number }} opts keepRatio: 모서리 손잡이에서 가로세로 비율 유지
 */
export function resizeRect(rect, rotation, handle, dx, dy, { keepRatio = false, min = ITEM_MIN_SIZE } = {}) {
  const sx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0
  const sy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0
  if (!sx && !sy) return { ...rect }
  const t = (normAngle(rotation || 0) * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t)
  const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos // 화면 방향 이동 → 요소 방향 이동
  let w = rect.w + sx * lx, h = rect.h + sy * ly
  if (keepRatio && sx && sy) {
    let k = Math.abs(w / rect.w - 1) >= Math.abs(h / rect.h - 1) ? w / rect.w : h / rect.h
    k = Math.max(k, min / rect.w, min / rect.h)
    w = rect.w * k; h = rect.h * k
  } else {
    w = Math.max(min, w); h = Math.max(min, h)
  }
  const toWorld = (vx, vy) => [vx * cos - vy * sin, vx * sin + vy * cos]
  const [ax, ay] = toWorld(-sx * rect.w / 2, -sy * rect.h / 2)
  const anchorX = rect.x + rect.w / 2 + ax, anchorY = rect.y + rect.h / 2 + ay // 제자리에 있을 점
  const [bx, by] = toWorld(sx * w / 2, sy * h / 2)
  const cx = anchorX + bx, cy = anchorY + by
  const W = Math.round(w), H = Math.round(h)
  return { x: Math.round(cx - W / 2), y: Math.round(cy - H / 2), w: W, h: H }
}

/**
 * 위치·크기 정하기 (숫자 입력·크기 조절). 최소 크기, 구간 안에 최소한 남게. 잠긴 요소는 그대로.
 * 글자 요소(10-1)는 h를 받지 않고 폭에 맞춰 다시 계산한다 — measure(글자 폭 재기)가 있을 때. 없으면 h 그대로
 */
export function setItemRect(page, id, rect, measure = null) {
  return mapItems(page, [id], (it, s) => {
    if (it.locked) return it
    const w = Number.isFinite(rect.w) ? Math.max(ITEM_MIN_SIZE, Math.round(rect.w)) : it.w
    let h = Number.isFinite(rect.h) ? Math.max(ITEM_MIN_SIZE, Math.round(rect.h)) : it.h
    if (isValidTextItem(it)) h = measure ? fitTextItem({ ...it, w }, measure).h : it.h
    if (isValidLineItem(it)) h = it.h // 11-1: 선의 h는 굵기에 맞춘 자동 값 (손으로 안 바꿈)
    const n = { ...it, w, h }
    const p = clampItemPosition(n, s, page.width, Number.isFinite(rect.x) ? rect.x : it.x, Number.isFinite(rect.y) ? rect.y : it.y)
    return { ...n, x: p.x, y: p.y }
  })
}

/** 각도 정하기 (도) */
export function setRotation(page, ids, deg) {
  if (!Number.isFinite(Number(deg))) return page
  return mapItems(page, ids, it => (it.locked ? it : { ...it, rotation: normAngle(deg) }))
}

/** 각도 더하기 (예: 90° 돌리기) */
export function rotateBy(page, ids, by) {
  if (!Number.isFinite(by)) return page
  return mapItems(page, ids, it => (it.locked ? it : { ...it, rotation: normAngle((it.rotation || 0) + by) }))
}

/** 뒤집기 @param {'x'|'y'} axis x = 좌우, y = 상하 */
export function flipItems(page, ids, axis) {
  const key = axis === 'x' ? 'flipX' : axis === 'y' ? 'flipY' : null
  if (!key) return page
  return mapItems(page, ids, it => (it.locked ? it : { ...it, [key]: !it[key] }))
}

/** 투명도 0~1 (0.01 단위) */
export function setOpacity(page, ids, v) {
  if (!Number.isFinite(v)) return page
  const o = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100
  return mapItems(page, ids, it => ({ ...it, opacity: o }))
}

/**
 * 꾸미기 바꾸기 (테두리·모서리·그림자) — patch의 칸만. 범위 밖 값은 자르고, 잘못된 색은 무시.
 * 기본값이 된 칸은 문서에서 뺀다 (예전 페이지와 같은 모양)
 */
export function setItemStyle(page, ids, patch) {
  const clean = {}
  for (const [k, [lo, hi]] of Object.entries(ITEM_STYLE_LIMITS)) {
    if (Number.isFinite(patch?.[k])) clean[k] = Math.max(lo, Math.min(hi, Math.round(patch[k])))
  }
  if (typeof patch?.borderColor === 'string' && HEX_COLOR.test(patch.borderColor)) clean.borderColor = patch.borderColor.toLowerCase()
  if (Object.keys(clean).length === 0) return page
  return mapItems(page, ids, it => {
    const n = { ...it, ...clean }
    for (const [k, v] of Object.entries(ITEM_STYLE_DEFAULTS)) if (n[k] === v) delete n[k]
    return n
  })
}

/** 이 사진이 들어 있는 요소 id 전부 */
export function itemIdsOfImage(page, imageId) {
  const out = []
  for (const s of page?.sections || []) for (const it of s.items || []) if (isValidImageItem(it) && it.imageId === imageId) out.push(it.id)
  return out
}

/**
 * 사진 바꾸기 — 자리·크기·회전·뒤집기·투명도·꾸미기는 그대로, 사진(imageId)만 바꾼다.
 * 빠진 사진이 페이지에 더는 없으면 parked로 (사진을 잃지 않게), 새 사진은 parked에서 뺀다. 잠긴 요소도 바꿀 수 있다(내용 교체일 뿐)
 */
export function replaceItemImage(page, itemId, imageId) {
  const f = findItem(page, itemId)
  if (!f || !isValidImageItem(f.item) || typeof imageId !== 'string' || imageId === '' || f.item.imageId === imageId) return page
  const oldId = f.item.imageId
  const sections = page.sections.map(s => (s.id === f.section.id
    ? { ...s, items: s.items.map(it => (it.id === itemId ? { ...it, imageId } : it)) } : s))
  const parked = dropPlaced(addParked(page.parked.filter(x => x !== imageId), oldId), sections)
  return { ...page, sections, parked }
}

export function setLocked(page, ids, locked) {
  return mapItems(page, ids, it => ({ ...it, locked: !!locked }))
}

export function setHidden(page, ids, hidden) {
  return mapItems(page, ids, it => ({ ...it, hidden: !!hidden }))
}

/**
 * 정렬 — 구간마다 따로: 그 구간에서 고른 것이 한 개면 구간 기준, 여러 개면 고른 것들을 감싸는 네모 기준. 돌린 요소는 실제 차지하는 네모로 맞춘다
 * @param {'left'|'hcenter'|'right'|'top'|'vcenter'|'bottom'} where
 */
export function alignItems(page, ids, where) {
  if (!['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'].includes(where)) return page
  const bySection = new Map()
  for (const { section, item } of pickItems(page, ids)) {
    if (item.locked) continue
    if (!bySection.has(section.id)) bySection.set(section.id, { section, items: [] })
    bySection.get(section.id).items.push(item)
  }
  const moves = new Map() // item id → { x, y }
  for (const { section, items } of bySection.values()) {
    const frame = items.length === 1 ? { x: 0, y: 0, w: page.width, h: section.height } : unionBounds(items.map(itemBounds))
    for (const it of items) {
      const b = itemBounds(it)
      let dx = 0, dy = 0
      if (where === 'left') dx = frame.x - b.x
      else if (where === 'hcenter') dx = frame.x + frame.w / 2 - (b.x + b.w / 2)
      else if (where === 'right') dx = frame.x + frame.w - (b.x + b.w)
      else if (where === 'top') dy = frame.y - b.y
      else if (where === 'vcenter') dy = frame.y + frame.h / 2 - (b.y + b.h / 2)
      else dy = frame.y + frame.h - (b.y + b.h)
      moves.set(it.id, { x: Math.round(it.x + dx), y: Math.round(it.y + dy) })
    }
  }
  return mapItems(page, [...moves.keys()], it => ({ ...it, ...moves.get(it.id) }))
}

/**
 * 앞뒤 순서 (구간마다, 고른 것들의 서로 순서는 유지)
 * @param {'front'|'back'|'forward'|'backward'} where front=맨 앞, back=맨 뒤, forward=한 칸 앞, backward=한 칸 뒤
 */
export function reorderItems(page, ids, where) {
  if (!['front', 'back', 'forward', 'backward'].includes(where)) return page
  const set = new Set(ids)
  let changed = false
  const sections = page.sections.map(s => {
    if (!s.items.some(it => set.has(it?.id))) return s
    let items
    if (where === 'front') items = [...s.items.filter(it => !set.has(it?.id)), ...s.items.filter(it => set.has(it?.id))]
    else if (where === 'back') items = [...s.items.filter(it => set.has(it?.id)), ...s.items.filter(it => !set.has(it?.id))]
    else {
      items = [...s.items]
      if (where === 'forward') {
        for (let i = items.length - 2; i >= 0; i--) if (set.has(items[i]?.id) && !set.has(items[i + 1]?.id)) [items[i], items[i + 1]] = [items[i + 1], items[i]]
      } else {
        for (let i = 1; i < items.length; i++) if (set.has(items[i]?.id) && !set.has(items[i - 1]?.id)) [items[i], items[i - 1]] = [items[i - 1], items[i]]
      }
    }
    if (items.every((it, i) => it === s.items[i])) return s
    changed = true
    return { ...s, items }
  })
  return changed ? { ...page, sections } : page
}

/** 삭제 — 잠긴 요소는 남긴다. 사진 요소는 parked로 (사진을 잃지 않게 — removeSection과 같은 규칙) */
export function removeItems(page, ids) {
  const set = new Set(pickItems(page, ids).filter(p => !p.item.locked).map(p => p.item.id))
  if (set.size === 0) return page
  let parked = page.parked
  const sections = page.sections.map(s => {
    if (!s.items.some(it => set.has(it?.id))) return s
    for (const it of s.items) if (set.has(it?.id) && isValidImageItem(it)) parked = addParked(parked, it.imageId)
    return { ...s, items: s.items.filter(it => !set.has(it?.id)) }
  })
  return cleanGroups({ ...page, sections, parked: dropPlaced(parked, sections) }) // 9단계: 1개만 남은 그룹은 풀린다
}

/** ids가 그룹 구성원 전부를 담고 있는 groupId들 (그룹을 통째로 복사·복제했는지 — 9단계) */
function wholeGroupIds(page, ids) {
  const set = new Set(ids)
  const all = new Map() // gid → [전부 담겼나]
  for (const s of page.sections) for (const it of s.items) {
    if (!hasGroup(it)) continue
    all.set(it.groupId, (all.get(it.groupId) ?? true) && set.has(it.id))
  }
  return new Set([...all].filter(([, whole]) => whole).map(([gid]) => gid))
}

/**
 * 복사 — 편집기 안 클립보드에 넣을 값 [{ sectionId, item }] (깊은 복사, 페이지 순서)
 * 9단계: 그룹을 통째로 복사하면 groupId를 남기고(붙여넣을 때 새 groupId로), 일부만 복사하면 groupId를 뗀다
 */
export function copyItems(page, ids) {
  const whole = wholeGroupIds(page, ids)
  return pickItems(page, ids).map(({ section, item }) => ({
    sectionId: section.id,
    item: hasGroup(item) && !whole.has(item.groupId) ? withoutGroup(clone(item)) : clone(item),
  }))
}

function placeCopy(page, section, item, offset) {
  const n = { ...clone(item), id: newPageId('i'), locked: false }
  const p = clampItemPosition(n, section, page.width, item.x + offset, item.y + offset)
  return { ...n, x: p.x, y: p.y }
}

/**
 * 붙여넣기 — sectionId 구간에 (다른 구간에서 복사한 것도 그 구간 좌표 그대로), offset만큼 옆으로
 * @returns {{ page, ids: string[] }} ids = 새로 생긴 요소 (붙여넣을 수 없으면 page 그대로, ids 빈 배열)
 */
export function pasteItems(page, sectionId, clip, offset = PASTE_OFFSET) {
  const section = page.sections.find(s => s.id === sectionId)
  if (!section || !Array.isArray(clip) || clip.length === 0) return { page, ids: [] }
  let next = page
  const ids = []
  const gidMap = new Map() // 9단계: 클립보드의 그룹(통째로 복사된 것) → 이번 붙여넣기의 새 groupId
  for (const c of clip) {
    if (!isTransformable(c?.item)) continue
    let n = placeCopy(page, section, c.item, offset)
    if (hasGroup(n)) {
      if (!gidMap.has(n.groupId)) gidMap.set(n.groupId, newPageId('g'))
      n = { ...n, groupId: gidMap.get(n.groupId) }
    }
    next = addItem(next, sectionId, n)
    ids.push(n.id)
  }
  return { page: cleanGroups(next), ids }
}

/** 복제 — 원본 바로 앞(위)에 살짝 옆으로. @returns {{ page, ids }} */
export function duplicateItems(page, ids, offset = PASTE_OFFSET) {
  const set = new Set(pickItems(page, ids).map(p => p.item.id))
  if (set.size === 0) return { page, ids: [] }
  // 9단계: 그룹을 통째로 복제하면 복사본끼리 새 groupId를 공유, 일부만이면 복사본은 그룹 없음
  const whole = wholeGroupIds(page, [...set])
  const gidMap = new Map()
  const regroup = n => {
    if (!hasGroup(n)) return n
    if (!whole.has(n.groupId)) return withoutGroup(n)
    if (!gidMap.has(n.groupId)) gidMap.set(n.groupId, newPageId('g'))
    return { ...n, groupId: gidMap.get(n.groupId) }
  }
  const newIds = []
  const sections = page.sections.map(s => {
    if (!s.items.some(it => set.has(it?.id))) return s
    const items = []
    for (const it of s.items) {
      items.push(it)
      if (set.has(it?.id)) { const n = regroup(placeCopy(page, s, it, offset)); newIds.push(n.id); items.push(n) }
    }
    return { ...s, items }
  })
  return { page: { ...page, sections }, ids: newIds }
}

// ── 그룹 (9단계) — 요소의 선택 칸 groupId. 없음 = 그룹 아님. 한 구간 안에서만, 구성원 2개 이상 ──
// 묶기·풀기·정리는 새 문서를 돌려주고, 할 수 없으면 입력 그대로 (다른 조작과 같은 규칙)

function hasGroup(it) {
  return !!it && typeof it === 'object' && typeof it.groupId === 'string' && it.groupId !== ''
}
function withoutGroup(it) {
  const { groupId: _drop, ...rest } = it
  return rest
}

/**
 * 그룹 정리 — 구성원이 1개만 남은 그룹·다른 구간에 걸친 groupId·문자열이 아닌 groupId를 없앤다.
 * readPage와 삭제·빼기·붙여넣기·묶기 뒤에 거친다. 바뀐 것이 없으면 입력 그대로
 */
export function cleanGroups(page) {
  const info = new Map() // gid → { sections: Set, n }
  for (const s of page.sections) for (const it of s.items) {
    if (!hasGroup(it)) continue
    if (!info.has(it.groupId)) info.set(it.groupId, { sections: new Set(), n: 0 })
    const g = info.get(it.groupId)
    g.sections.add(s.id)
    g.n++
  }
  const keep = it => hasGroup(it) && info.get(it.groupId).sections.size === 1 && info.get(it.groupId).n >= 2
  let changed = false
  const sections = page.sections.map(s => {
    let sc = false
    const items = s.items.map(it => {
      if (!it || typeof it !== 'object' || !('groupId' in it) || keep(it)) return it
      sc = true
      return withoutGroup(it)
    })
    if (!sc) return s
    changed = true
    return { ...s, items }
  })
  return changed ? { ...page, sections } : page
}

/** 같은 그룹 요소 id (페이지 순서). 그룹이 아니면 [itemId], 없는 요소면 [] */
export function groupMemberIds(page, itemId) {
  const f = findItem(page, itemId)
  if (!f) return []
  if (!hasGroup(f.item)) return [itemId]
  return f.section.items.filter(it => hasGroup(it) && it.groupId === f.item.groupId).map(it => it.id)
}

/** 고른 요소를 그룹 단위로 넓힌다 (페이지에서 누르기·박스 선택 — 그룹 요소 하나 = 그 그룹 전체). 페이지 순서 */
export function expandToGroups(page, ids) {
  const set = new Set()
  for (const id of ids) for (const m of groupMemberIds(page, id)) set.add(m)
  return pickItems(page, [...set]).map(p => p.item.id)
}

/** 이 요소들이 그룹에 속해 있는지 (풀기를 할 수 있는지) */
export function anyGrouped(page, ids) {
  return pickItems(page, ids).some(p => hasGroup(p.item))
}

/**
 * 묶을 수 있는지 — 'ok' | 'few'(2개 미만) | 'mixed'(다른 구간이 섞임) | 'same'(이미 그대로 한 그룹)
 */
export function groupCheck(page, ids) {
  const picks = pickItems(page, ids)
  if (picks.length < 2) return 'few'
  if (new Set(picks.map(p => p.section.id)).size > 1) return 'mixed'
  const gids = new Set(picks.map(p => (hasGroup(p.item) ? p.item.groupId : '')))
  if (gids.size === 1 && !gids.has('') && groupMemberIds(page, picks[0].item.id).length === picks.length) return 'same'
  return 'ok'
}

/**
 * 그룹으로 묶기 — 같은 구간의 요소 2개 이상에 새 groupId. 이미 다른 그룹에 속한 요소가 섞였으면 그 그룹은 풀고 새 그룹으로 합친다.
 * 구성원은 가장 앞에 있던 구성원 자리로 모인다(서로 앞뒤 순서는 그대로 — 레이어 목록에서 한 덩어리로 보이게).
 * 할 수 없으면(groupCheck가 'ok'가 아님) 입력 그대로
 */
export function groupItems(page, ids) {
  if (groupCheck(page, ids) !== 'ok') return page
  const picks = pickItems(page, ids)
  const section = picks[0].section
  const set = new Set(picks.map(p => p.item.id))
  const oldGids = new Set(picks.filter(p => hasGroup(p.item)).map(p => p.item.groupId))
  const gid = newPageId('g')
  const top = Math.max(...section.items.map((it, i) => (set.has(it?.id) ? i : -1)))
  const members = section.items.filter(it => set.has(it?.id)).map(it => ({ ...it, groupId: gid }))
  const others = []
  let insertAt = 0
  section.items.forEach((it, i) => {
    if (set.has(it?.id)) return
    others.push(hasGroup(it) && oldGids.has(it.groupId) ? withoutGroup(it) : it)
    if (i < top) insertAt++
  })
  const items = [...others.slice(0, insertAt), ...members, ...others.slice(insertAt)]
  return cleanGroups(mapSections(page, s => (s.id === section.id ? { ...s, items } : s)))
}

/** 그룹 풀기 — 고른 요소가 속한 그룹을 통째로 푼다. 그룹이 없으면 입력 그대로 */
export function ungroupItems(page, ids) {
  const gids = new Set(pickItems(page, ids).filter(p => hasGroup(p.item)).map(p => p.item.groupId))
  if (gids.size === 0) return page
  return mapSections(page, s => (s.items.some(it => hasGroup(it) && gids.has(it.groupId))
    ? { ...s, items: s.items.map(it => (hasGroup(it) && gids.has(it.groupId) ? withoutGroup(it) : it)) } : s))
}

/**
 * 앞뒤 순서를 자리로 (레이어 목록 끌기 — 9단계). ids = 옮길 덩어리(요소 하나 또는 그룹 전체, 같은 구간),
 * toIndex = 덩어리를 뺀 나머지 배열에서 넣을 자리(0 = 맨 뒤, 나머지 길이 = 맨 앞). 덩어리 안 순서는 그대로.
 * 구간이 섞였거나 없는 요소·같은 순서면 입력 그대로
 */
export function reorderItemTo(page, ids, toIndex) {
  const picks = pickItems(page, ids)
  if (picks.length === 0 || !Number.isInteger(toIndex) || new Set(picks.map(p => p.section.id)).size > 1) return page
  const section = picks[0].section
  const set = new Set(picks.map(p => p.item.id))
  const block = section.items.filter(it => set.has(it?.id))
  const rest = section.items.filter(it => !set.has(it?.id))
  const to = Math.max(0, Math.min(rest.length, toIndex))
  const items = [...rest.slice(0, to), ...block, ...rest.slice(to)]
  if (items.every((it, i) => it === section.items[i])) return page
  return mapSections(page, s => (s.id === section.id ? { ...s, items } : s))
}

/** 한 구간의 조작할 수 있는 요소 id (전체 선택) */
export function sectionItemIds(page, sectionId) {
  const s = page.sections.find(x => x.id === sectionId)
  return s ? s.items.filter(isTransformable).map(it => it.id) : []
}

/** 드래그 박스(페이지 좌표 — 구간 위치 포함)에 걸친 요소 id. 구간 밖으로 잘린 부분은 치지 않는다 */
export function itemsInBox(page, box) {
  const x0 = Math.min(box.x, box.x + box.w), x1 = Math.max(box.x, box.x + box.w)
  const y0 = Math.min(box.y, box.y + box.h), y1 = Math.max(box.y, box.y + box.h)
  const tops = new Map(layoutSections(page).rows.map(r => [r.id, r.top]))
  const out = []
  for (const s of page.sections) {
    const top = tops.get(s.id)
    for (const it of s.items) {
      if (!isTransformable(it)) continue
      const b = itemBounds(it)
      const bx0 = Math.max(0, b.x), bx1 = Math.min(page.width, b.x + b.w)
      const by0 = Math.max(0, b.y) + top, by1 = Math.min(s.height, b.y + b.h) + top
      if (bx0 < bx1 && by0 < by1 && bx0 < x1 && bx1 > x0 && by0 < y1 && by1 > y0) out.push(it.id)
    }
  }
  return out
}

/**
 * 옮길 때 달라붙기 — 고른 요소들이 한 구간 안에 있을 때만. 기준: 구간 왼쪽·가운데·오른쪽·위·가운데·아래,
 * 다른 요소(숨긴 것 빼고)의 가장자리·가운데. threshold 안(페이지 px)이면 붙이고 안내선을 돌려준다.
 * @returns {{ dx, dy, guides: { axis: 'x'|'y', pos: number, sectionId: string }[] }} pos = 구간 좌표
 */
export function snapMove(page, ids, dx, dy, threshold) {
  const moving = pickItems(page, ids).filter(p => !p.item.locked)
  const none = { dx, dy, guides: [] }
  if (moving.length === 0 || !(threshold > 0)) return none
  const section = moving[0].section
  if (moving.some(p => p.section.id !== section.id)) return none
  const movingIds = new Set(moving.map(p => p.item.id))
  const b = unionBounds(moving.map(p => itemBounds(p.item)))
  const bx = b.x + dx, by = b.y + dy
  const tx = [0, page.width / 2, page.width], ty = [0, section.height / 2, section.height]
  for (const it of section.items) {
    if (movingIds.has(it?.id) || !isTransformable(it) || it.hidden) continue
    const o = itemBounds(it)
    tx.push(o.x, o.x + o.w / 2, o.x + o.w)
    ty.push(o.y, o.y + o.h / 2, o.y + o.h)
  }
  const best = (mine, targets) => {
    let r = null
    for (const m of mine) for (const t of targets) {
      const d = t - m
      if (Math.abs(d) <= threshold && (!r || Math.abs(d) < Math.abs(r.d))) r = { d, t }
    }
    return r
  }
  const sx = best([bx, bx + b.w / 2, bx + b.w], tx)
  const sy = best([by, by + b.h / 2, by + b.h], ty)
  const guides = []
  if (sx) guides.push({ axis: 'x', pos: sx.t, sectionId: section.id })
  if (sy) guides.push({ axis: 'y', pos: sy.t, sectionId: section.id })
  return { dx: dx + (sx ? sx.d : 0), dy: dy + (sy ? sy.d : 0), guides }
}

// ── 글자 (10-1단계) — 모양·줄바꿈은 studioText.js. 높이(h)는 늘 글자에 맞춰 자동 (measure = 글자 폭 재기, 밖에서 받는다) ──
export const TEXT_MIN_WIDTH = 20 // 글자 요소 최소 폭 (페이지 px)

/** 새 글자 요소 — fields = 글자 칸 + x·y·w (빠진 값은 기본값). h는 글자에 맞춘다 */
export function newTextItem(fields, measure) {
  const n = normalizeTextItem(normalizeItem({ w: 400, x: 0, y: 0, ...fields, id: newPageId('i'), type: 'text', h: 1 }))
  return fitTextItem({ ...n, w: Math.max(TEXT_MIN_WIDTH, Math.round(n.w)) }, measure)
}

/**
 * 글자 넣기 — 그 구간 가운데에 맨 앞으로. @returns {{ page, itemId: string|null }} (없는 구간이면 page 그대로, itemId null)
 */
export function addTextItem(page, sectionId, fields, measure) {
  const s = page.sections.find(x => x.id === sectionId)
  if (!s) return { page, itemId: null }
  const it = newTextItem({ ...fields, w: Math.min(page.width, fields?.w ?? 400) }, measure)
  const p = clampItemPosition(it, s, page.width, (page.width - it.w) / 2, (s.height - it.h) / 2)
  const item = { ...it, x: p.x, y: p.y }
  const next = addItem(page, s.id, item)
  return next === page ? { page, itemId: null } : { page: next, itemId: item.id }
}

/**
 * 크기가 바뀐 요소의 자리 — 고정할 점(요소 기준 anchor, 가운데에서의 부호 -1·0·1)이 화면에서 제자리에 있게. 돌린 요소도 요소 방향 기준
 * @returns {{ x, y }} 새 w·h일 때의 x·y (정수)
 */
function anchoredPos(it, w2, h2, ax, ay) {
  const t = (normAngle(it.rotation || 0) * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t)
  const rot = (vx, vy) => [vx * cos - vy * sin, vx * sin + vy * cos]
  const [px, py] = rot(ax * it.w / 2, ay * it.h / 2)
  const [qx, qy] = rot(ax * w2 / 2, ay * h2 / 2)
  const cx = it.x + it.w / 2 + px - qx, cy = it.y + it.h / 2 + py - qy
  return { x: Math.round(cx - w2 / 2), y: Math.round(cy - h2 / 2) }
}

/** 글자 칸을 바꾸고 높이를 맞춘다 — 위쪽(왼쪽 위)이 제자리. 안 바뀌면 입력 그대로 */
function refitText(it, s, page, next, measure) {
  if (next === it) return it
  const f = fitTextItem(next, measure)
  const pos = anchoredPos(it, f.w, f.h, -1, -1)
  const p = clampItemPosition(f, s, page.width, pos.x, pos.y)
  return { ...f, x: p.x, y: p.y }
}

/**
 * 글자 속성 바꾸기 (글꼴·크기·굵기·색·정렬·줄간격·자간) — ids 중 글자 요소에만. 잘못된 값은 무시.
 * 잠긴 요소도 바꾼다(내용 바꾸기 — 사진 바꾸기와 같은 규칙). 높이는 다시 맞춘다
 */
export function setTextProps(page, ids, patch, measure) {
  return mapItems(page, ids, (it, s) => (isValidTextItem(it) ? refitText(it, s, page, patchTextItem(it, patch), measure) : it))
}

/** 글자 고치기 — 그 글자 요소의 text만 (높이 다시 맞춤). 같으면 입력 그대로 */
export function setTextContent(page, id, text, measure) {
  if (typeof text !== 'string') return page
  return mapItems(page, [id], (it, s) => (isValidTextItem(it) ? refitText(it, s, page, patchTextItem(it, { text }), measure) : it))
}

/**
 * 글자 요소 손잡이 — 좌우(e·w) = 폭만 바꾸고 줄바꿈 다시(높이 자동), 모서리 = 비율대로 글자 크기와 폭을 함께. 위아래(n·s)는 없음.
 * 반대쪽 변·모서리가 제자리에 있다 (좌우는 위쪽도 제자리). 잠긴 요소는 그대로
 * @param {number} dx,dy 끌어온 거리 (페이지 px, 화면 방향)
 */
export function resizeTextItem(page, id, handle, dx, dy, measure) {
  const corner = handle.length === 2
  if (!corner && handle !== 'e' && handle !== 'w') return page
  return mapItems(page, [id], (it, s) => {
    if (it.locked || !isValidTextItem(it)) return it
    const sx = handle.includes('e') ? 1 : -1
    const sy = handle.includes('n') ? -1 : 1 // 좌우 손잡이는 위쪽 고정
    let w, fontSize = it.fontSize
    if (corner) {
      // 비율 = 가로·세로 중 더 많이 바뀐 쪽 (resizeRect와 같은 규칙, 최소 크기는 글자 크기 범위로 — 높이 최소값을 걸지 않는다)
      const t = (normAngle(it.rotation || 0) * Math.PI) / 180
      const lx = dx * Math.cos(t) + dy * Math.sin(t), ly = -dx * Math.sin(t) + dy * Math.cos(t)
      const kw = (it.w + sx * lx) / it.w, kh = (it.h + sy * ly) / it.h
      const k = Math.abs(kw - 1) >= Math.abs(kh - 1) ? kw : kh
      const [lo, hi] = TEXT_LIMITS.fontSize
      fontSize = Math.min(hi, Math.max(lo, Math.round(it.fontSize * k)))
      w = Math.max(TEXT_MIN_WIDTH, Math.round(it.w * fontSize / it.fontSize))
    } else {
      const r = resizeRect(it, it.rotation || 0, handle, dx, dy, { min: TEXT_MIN_WIDTH })
      w = Math.max(TEXT_MIN_WIDTH, r.w)
    }
    const f = fitTextItem({ ...it, w, fontSize }, measure)
    const pos = anchoredPos(it, f.w, f.h, -sx, -sy)
    const p = clampItemPosition(f, s, page.width, pos.x, pos.y)
    return { ...f, x: p.x, y: p.y }
  })
}

// ── 도형·선 (11-1단계) — 모양·그리기 규칙은 studioShape.js ──

/**
 * 도형·선 넣기 — 그 구간 가운데에 맨 앞으로. fields = type('shape'|'line') + 그 칸 + w·h (빠진 값은 기본값, 선의 h는 자동)
 * @returns {{ page, itemId: string|null }} (없는 구간·모르는 type이면 page 그대로, itemId null)
 */
export function addElementItem(page, sectionId, fields) {
  const s = page.sections.find(x => x.id === sectionId)
  const byType = { shape: normalizeShapeItem, line: normalizeLineItem }[fields?.type]
  if (!s || !byType) return { page, itemId: null }
  const w = Math.max(ITEM_MIN_SIZE, Math.min(page.width, Math.round(fields.w ?? 200)))
  const h = fields.type === 'line' ? 2 : Math.max(ITEM_MIN_SIZE, Math.round(fields.h ?? 200)) // 선의 h는 normalizeLineItem이 맞춘다
  const it = byType(normalizeItem({ ...fields, x: 0, y: 0, w, h, id: newPageId('i') }))
  const p = clampItemPosition(it, s, page.width, (page.width - it.w) / 2, (s.height - it.h) / 2)
  const item = { ...it, x: p.x, y: p.y }
  const next = addItem(page, s.id, item)
  return next === page ? { page, itemId: null } : { page: next, itemId: item.id }
}

/** 도형 속성 바꾸기 (모양·채우기·테두리·모서리) — ids 중 도형에만. 잠긴 요소도(내용 바꾸기) */
export function setShapeProps(page, ids, patch) {
  return mapItems(page, ids, it => (isValidShapeItem(it) ? patchShapeItem(it, patch) : it))
}
/** 선 속성 바꾸기 (굵기·색·선 모양·끝 모양) — ids 중 선에만. 굵기·끝 모양이 바뀌면 h 자동(가운데 제자리) */
export function setLineProps(page, ids, patch) {
  return mapItems(page, ids, (it, s) => {
    if (!isValidLineItem(it)) return it
    const n = patchLineItem(it, patch)
    if (n === it) return it
    const p = clampItemPosition(n, s, page.width, n.x, n.y)
    return { ...n, x: p.x, y: p.y }
  })
}

/**
 * 선 끝 점 끌기 — (px, py) = 구간 좌표. 반대쪽 끝은 제자리 (moveLineEnd). 잠긴 선은 그대로
 * @param {'start'|'end'} which  @param {{ snap?: boolean }} opts snap = Shift (15° 단위)
 */
export function setLineEnd(page, id, which, px, py, opts = {}) {
  if (!Number.isFinite(px) || !Number.isFinite(py)) return page
  return mapItems(page, [id], (it, s) => {
    if (it.locked || !isValidLineItem(it)) return it
    const r = moveLineEnd(it, which, px, py, opts)
    const n = fitLineItem({ ...it, ...r })
    const p = clampItemPosition(n, s, page.width, n.x, n.y)
    return { ...n, x: p.x, y: p.y }
  })
}

/** 글자 요소의 줄 목록 (화면·미니뷰가 그릴 때 — 같은 wrapLines) */
export function textLinesOf(it, measure) {
  return wrapLines(it.text, textStyleOf(it), it.w, measure)
}

// ── 보기 배율 (화면에서만, 저장하지 않음) ──
export const ZOOM_PRESETS = [0.5, 0.75, 1]

/** 가운데 영역 폭에 페이지(+양옆 여백)가 들어가는 배율 — 1% 단위로 내림, 20%~100% */
export function fitZoom(areaWidth, pageWidth, sideGutter) {
  if (!(areaWidth > 0) || !(pageWidth > 0)) return 1
  const z = Math.floor(((areaWidth - 2 * sideGutter) / pageWidth) * 100) / 100
  return Math.min(1, Math.max(0.2, z))
}
