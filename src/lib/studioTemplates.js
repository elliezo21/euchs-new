/**
 * 템플릿 (15단계) — 코드 데이터 + 순수 함수 (DOM·DB 없음, node 테스트: scripts/test-studio-templates.mjs)
 *
 * ★ 템플릿 = 페이지 문서(studioPage.js 맨 위)와 같은 모양의 구간 목록 + "사진 자리"(slot).
 *   { key, label, desc, gap, sections: [ 구간 ] }
 *   구간 두 가지:
 *     { photo: n, bg? }                         사진 자리 n 한 장이 폭에 꽉 찬 구간 (기본 배치 imageSection과 같은 규칙 — 높이 = 사진 비율)
 *     { height, bg, items: [ 요소 조각 ] }       자리·크기가 정해진 구간
 *   요소 조각 = 페이지 요소에서 id를 뺀 것 (공통 칸·꾸미기 칸은 그대로). type별:
 *     image  { type: 'image', slot: n, x, y, w, h, … }  imageId 대신 사진 자리 번호. 채우기(cover)로 그린다(페이지와 같음)
 *     text   { type: 'text', x, y, w, text, … }          h는 적용할 때 글자에 맞춘다 (measure)
 *     shape · line · table                               h 자동 규칙은 페이지와 같음 (선·표)
 *     그 밖의 type                                        모르는 요소 — 그대로 옮긴다 (페이지 규칙: 그리지 않고 보존)
 *   group: '이름' (선택) = 같은 구간 안에서 같은 이름끼리 한 그룹 (적용할 때마다 새 groupId — 강조 배지처럼)
 * ★ 적용(buildTemplatePage): 쓸 사진(준비 끝 + 안 쓸 사진 아님, 목록 순서)을 사진 자리 번호가 작은 것부터 차례로 넣는다.
 *   사진이 자리보다 많으면 남는 사진은 기본 배치 규칙(사진 1장 → 구간 1개)으로 뒤에 붙인다.
 *   사진이 자리보다 적으면 빈 자리의 사진 요소는 빼고(빈 사진 요소를 저장하지 않는다), 꽉 찬 사진 구간({ photo })은 구간째 뺀다.
 *   자리 구간에서 사진 요소만 있었는데 모두 빠졌으면 그 구간도 뺀다 (빈 칸만 남지 않게).
 * ★ 페이지만 만든다 — 사진 편집 결과(studio_images.edit: 지우기·덮기·자르기·필터)는 사진에 있어 읽지도 바꾸지도 않는다.
 *   사진에서 쓰는 값은 id·width·height뿐 (자른 사진은 부르는 쪽이 자른 크기를 넘긴다 — 편집기 sizedRow).
 * ★ 샘플 템플릿의 배치·색·문구는 이 프로젝트에서 새로 정한 것 (다른 편집 프로그램의 템플릿을 옮기지 않음).
 *   글꼴은 허용 목록(studioFonts.STUDIO_FONTS)만, 외부 파일(사진·폰트)을 새로 쓰지 않는다.
 * ★ 내 템플릿(pageToTemplate): 지금 페이지 → 같은 모양의 템플릿. 사진 요소는 imageId를 지우고 slot 번호로 (다른 작업에 쓸 수 있게).
 *   저장 위치는 DB 스키마 결정 뒤 (15단계 보고서 — studio_assets의 kind 제약 때문에 SQL 승인 필요).
 */
import {
  PAGE_WIDTH, SECTION_BG, SECTION_MAX, newPageId, hasSize, imageSection, normalizeItem, cleanGroups, emptyPage,
  isValidImageItem, itemStyleOf, ITEM_STYLE_DEFAULTS,
} from './studioPage.js'
import { normalizeTextItem, fitTextItem, textStyleOf } from './studioText.js'
import { normalizeShapeItem, normalizeLineItem } from './studioShape.js'
import { normalizeTableItem } from './studioTable.js'
import { CATEGORY_TEMPLATES, TEMPLATE_CATEGORIES } from './studioTemplateSets.js'

export { TEMPLATE_CATEGORIES }

export const TEMPLATE_VERSION = 1
export const TEMPLATE_NAME_MAX = 50 // 내 템플릿 이름 (studio_assets.name 제약과 같은 1~50자)

const clone = v => JSON.parse(JSON.stringify(v))

// ── 샘플 템플릿 3개 (카테고리 '기본') + 카테고리별 템플릿(studioTemplateSets.js — 에셋 채우기) ──
const INK = '#1f2937'
const t = (x, y, w, text, fontSize, fontWeight, color, extra = {}) => ({ type: 'text', x, y, w, text, fontSize, fontWeight, color, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.3, ...extra })

const BASE_TEMPLATES = [
  {
    key: 'basic', label: '기본 상세', desc: '대표 사진 → 상품 소개 글 → 사진 목록 → 구매 전 안내', gap: 0,
    sections: [
      { photo: 0 },
      {
        height: 400, bg: '#ffffff',
        items: [
          t(70, 70, 640, '상품 이름을 적어 주세요', 44, 800, INK, { lineHeight: 1.25 }),
          { type: 'line', x: 350, y: 148, w: 80, strokeWidth: 3, color: '#c9a86a' },
          t(90, 205, 600, '상품의 장점을 적어 주세요.\n누가, 언제 쓰면 좋은지 한두 줄로 알려 주면 좋아요.', 22, 400, '#4b5563', { lineHeight: 1.7 }),
        ],
      },
      { photo: 1 },
      { photo: 2 },
      { photo: 3 },
      {
        height: 330, bg: '#f5f5f4',
        items: [
          t(70, 60, 640, '구매 전에 확인해 주세요', 28, 800, INK),
          t(100, 130, 580, '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 재는 방법에 따라 크기가 1~3cm 다를 수 있어요.\n· 궁금한 점은 문의를 남겨 주시면 빠르게 답해 드려요.', 19, 400, '#57534e', { align: 'left', lineHeight: 1.8 }),
        ],
      },
    ],
  },
  {
    key: 'point', label: '포인트 강조', desc: '큰 제목과 배지 → 대표 사진 → 장점 두 가지를 사진과 함께', gap: 0,
    sections: [
      {
        height: 340, bg: '#14213d',
        items: [
          t(60, 110, 520, '한눈에 들어오는\n큰 제목을 적어 주세요', 48, 900, '#ffffff', { align: 'left', lineHeight: 1.25 }),
          t(60, 250, 520, '제품을 한 문장으로 소개해 주세요', 22, 400, '#e5e7eb', { align: 'left' }),
          { type: 'shape', group: 'best', shape: 'ellipse', x: 600, y: 36, w: 130, h: 130, fill: '#fca311' },
          t(610, 80, 110, 'BEST', 36, 400, '#14213d', { group: 'best', fontFamily: 'black-han-sans', lineHeight: 1.2 }),
        ],
      },
      { photo: 0 },
      {
        height: 640, bg: '#ffffff',
        items: [
          { type: 'shape', group: 'p1', shape: 'rect', x: 310, y: 50, w: 160, h: 44, fill: '#fca311', radius: 22 },
          t(320, 59, 140, 'POINT 1', 20, 800, '#14213d', { group: 'p1', lineHeight: 1.3 }),
          t(70, 120, 640, '첫 번째 장점을 적어 주세요', 34, 800, '#14213d'),
          { type: 'image', slot: 1, x: 60, y: 190, w: 660, h: 400, radius: 16 },
        ],
      },
      {
        height: 640, bg: '#f8f9fb',
        items: [
          { type: 'shape', group: 'p2', shape: 'rect', x: 310, y: 50, w: 160, h: 44, fill: '#fca311', radius: 22 },
          t(320, 59, 140, 'POINT 2', 20, 800, '#14213d', { group: 'p2', lineHeight: 1.3 }),
          t(70, 120, 640, '두 번째 장점을 적어 주세요', 34, 800, '#14213d'),
          { type: 'image', slot: 2, x: 60, y: 190, w: 660, h: 400, radius: 16 },
        ],
      },
      { photo: 3 },
    ],
  },
  {
    key: 'size', label: '사이즈표 포함', desc: '대표 사진 → 설명 → 사진 두 장 나란히 → 사이즈 안내', gap: 0,
    sections: [
      { photo: 0 },
      {
        height: 320, bg: '#ffffff',
        items: [
          t(70, 60, 640, '상품 설명', 36, 800, '#222222'),
          { type: 'shape', shape: 'rect', x: 365, y: 125, w: 50, h: 4, fill: '#2a9d8f' },
          t(90, 165, 600, '소재, 두께, 신축성처럼\n직접 입었을 때 느낌을 적어 주세요.', 21, 400, '#555555', { lineHeight: 1.7 }),
        ],
      },
      {
        height: 500, bg: '#ffffff',
        items: [
          { type: 'image', slot: 1, x: 20, y: 20, w: 360, h: 460 },
          { type: 'image', slot: 2, x: 400, y: 20, w: 360, h: 460 },
        ],
      },
      {
        height: 450, bg: '#f7f7f5',
        items: [
          t(70, 50, 640, '사이즈 안내', 34, 800, '#222222'),
          {
            type: 'table', x: 90, y: 125, w: 600, headerBg: '#2a9d8f', headerColor: '#ffffff', borderColor: '#d6dedb',
            cells: [['사이즈', '가슴', '어깨', '총장', '소매'], ...['S', 'M', 'L', 'XL'].map(s => [s, '-', '-', '-', '-'])],
          },
          t(90, 355, 600, '단위: cm · 재는 방법에 따라 1~3cm 차이가 날 수 있어요.', 17, 400, '#777777'),
        ],
      },
      { photo: 3 },
    ],
  },
]
export const STUDIO_TEMPLATES = [...BASE_TEMPLATES.map(t => ({ ...t, category: 'common' })), ...CATEGORY_TEMPLATES]
/** 그 카테고리의 템플릿 (모르는 카테고리면 빈 목록) */
export function templatesOf(category) { return STUDIO_TEMPLATES.filter(t => t.category === category) }

export function templateByKey(key) { return STUDIO_TEMPLATES.find(x => x.key === key) ?? null }

// ── 검사 ──

const isPhotoSection = s => !!s && Number.isInteger(s.photo) && s.photo >= 0
const isSlotPart = p => !!p && p.type === 'image' && Number.isInteger(p.slot) && p.slot >= 0

/**
 * 템플릿 모양 검사 (내 템플릿을 DB에서 읽을 때도) — @returns {string[]} 문제 목록 (빈 배열 = 정상)
 */
export function templateProblems(tpl) {
  if (!tpl || typeof tpl !== 'object' || Array.isArray(tpl)) return ['템플릿이 객체가 아님']
  const out = []
  if (!Array.isArray(tpl.sections)) return ['sections가 배열이 아님']
  if (tpl.sections.length === 0) out.push('섹션이 없음')
  if (tpl.sections.length > SECTION_MAX) out.push(`섹션이 ${SECTION_MAX}개를 넘음`)
  if (tpl.gap !== undefined && (!Number.isInteger(tpl.gap) || tpl.gap < 0)) out.push(`gap이 0 이상 정수가 아님: ${tpl.gap}`)
  tpl.sections.forEach((s, i) => {
    if (isPhotoSection(s)) return
    if (!s || !Number.isInteger(s.height) || s.height < 1) out.push(`섹션 ${i}: height가 양의 정수가 아님`)
    if (!Array.isArray(s?.items)) { out.push(`섹션 ${i}: items가 배열이 아님`); return }
    s.items.forEach((p, j) => {
      if (!p || typeof p !== 'object' || typeof p.type !== 'string') out.push(`섹션 ${i} 요소 ${j}: type 없음`)
      else if (p.type === 'image' && !isSlotPart(p)) out.push(`섹션 ${i} 요소 ${j}: 사진 자리 번호 없음`)
    })
  })
  return out
}

/** 사진 자리 번호들 (작은 것부터, 중복 없이) — 이 순서대로 쓸 사진이 들어간다 */
export function templateSlots(tpl) {
  const set = new Set()
  for (const s of tpl.sections) {
    if (isPhotoSection(s)) set.add(s.photo)
    else for (const p of s.items || []) if (isSlotPart(p)) set.add(p.slot)
  }
  return [...set].sort((a, b) => a - b)
}

/** 템플릿 글자 조각의 글꼴 목록 (적용 전에 글꼴 조각을 받을 때 — studioFonts.loadFontsFor 입력) */
export function templateFontList(tpl) {
  const out = []
  for (const s of tpl.sections) for (const p of s.items || []) {
    if (p?.type !== 'text') continue
    const n = normalizeTextItem({ ...p })
    out.push({ style: textStyleOf(n), text: n.text })
  }
  return out
}

// ── 적용 ──

/** 요소 조각 → 페이지 요소 (새 id). 사진 조각은 imageId를 받아야 만든다 */
function partToItem(part, imageId, measure) {
  const { slot: _slot, group: _group, id: _id, ...fields } = part
  const id = newPageId('i')
  switch (part.type) {
    case 'image': return normalizeItem({ ...fields, id, type: 'image', imageId })
    case 'text': {
      const n = normalizeTextItem(normalizeItem({ ...fields, id, type: 'text', h: 1 }))
      return fitTextItem(n, measure)
    }
    case 'shape': return normalizeShapeItem(normalizeItem({ ...fields, id }))
    case 'line': return normalizeLineItem(normalizeItem({ ...fields, id, h: 2 }))
    case 'table': return normalizeTableItem(normalizeItem({ ...fields, id, h: 1 }))
    default: return { ...clone(fields), id, type: part.type } // 모르는 요소 — 보존
  }
}

/**
 * 템플릿으로 새 페이지 문서를 만든다.
 * @param {object} tpl 템플릿 (STUDIO_TEMPLATES 하나 또는 내 템플릿)
 * @param {{ id, width, height }[]} images 쓸 사진 (목록 순서, 자른 사진은 자른 크기). 크기를 모르는 사진은 빼고 사유를 남긴다
 * @param {(s: string, style: object) => number} measure 글자 폭 재기 (글자 높이를 정하려고)
 * @returns {{ page, placed: number, extra: number, slots: number, emptySlots: number } | null} 모양이 어긋난 템플릿이면 null
 */
export function buildTemplatePage(tpl, images, measure, width = PAGE_WIDTH) {
  const problems = templateProblems(tpl)
  if (problems.length) {
    console.error('[studioTemplates] 템플릿 모양이 어긋나 적용하지 않음:', tpl?.key || tpl?.name, problems)
    return null
  }
  const photos = []
  for (const img of images || []) {
    if (hasSize(img)) photos.push(img)
    else console.error('[studioTemplates] 크기를 모르는 사진 — 템플릿에 넣지 않음:', img?.id, img?.width, img?.height)
  }
  const slots = templateSlots(tpl)
  const photoOfSlot = new Map(slots.map((n, i) => [n, photos[i] ?? null]))
  const page = emptyPage(width)
  page.gap = Number.isInteger(tpl.gap) ? tpl.gap : 0
  for (const s of tpl.sections) {
    if (page.sections.length >= SECTION_MAX) break
    if (isPhotoSection(s)) {
      const img = photoOfSlot.get(s.photo)
      if (!img) continue // 빈 자리 — 구간째 뺀다
      const sec = imageSection(img, width)
      if (typeof s.bg === 'string') sec.bg = s.bg
      page.sections.push(sec)
      continue
    }
    const gids = new Map() // 조각 group 이름 → 이번 적용의 새 groupId
    const items = []
    for (const part of s.items) {
      let imageId = null
      if (part.type === 'image') {
        const img = photoOfSlot.get(part.slot)
        if (!img) continue // 빈 자리의 사진 요소는 빼고 저장하지 않는다
        imageId = img.id
      }
      let it = partToItem(part, imageId, measure)
      if (typeof part.group === 'string' && part.group !== '') {
        if (!gids.has(part.group)) gids.set(part.group, newPageId('g'))
        it = { ...it, groupId: gids.get(part.group) }
      }
      items.push(it)
    }
    if (s.items.length > 0 && items.length === 0) continue // 사진 자리만 있던 구간이 모두 비었다 — 구간째 뺀다
    page.sections.push({ id: newPageId('s'), height: s.height, bg: typeof s.bg === 'string' ? s.bg : SECTION_BG, items })
  }
  const extras = photos.slice(slots.length)
  let extra = 0
  for (const img of extras) {
    if (page.sections.length >= SECTION_MAX) {
      console.error(`[studioTemplates] 구간 ${SECTION_MAX}개 초과 — 남은 사진은 붙이지 않음:`, img.id)
      break
    }
    page.sections.push(imageSection(img, width))
    extra++
  }
  const placed = Math.min(slots.length, photos.length)
  return { page: cleanGroups(page), placed, extra, slots: slots.length, emptySlots: slots.length - placed }
}

// ── 내 템플릿 (지금 페이지 → 템플릿) ──

/** 사진 1장이 폭에 꽉 찬 구간인지 — 기본 모양 그대로(회전·투명도·뒤집기·잠금·숨김·꾸미기 없음)일 때만 { photo }로 줄인다 */
function isPlainPhotoSection(s, pageWidth) {
  if (s.items.length !== 1) return false
  const it = s.items[0]
  if (!isValidImageItem(it)) return false
  const n = normalizeItem(it)
  const style = itemStyleOf(it)
  return it.x === 0 && it.y === 0 && it.w === pageWidth && it.h === s.height && !n.rotation && n.opacity === 1
    && !n.flipX && !n.flipY && !n.locked && !n.hidden && Object.keys(ITEM_STYLE_DEFAULTS).every(k => style[k] === ITEM_STYLE_DEFAULTS[k])
    && s.bg === SECTION_BG
}

/**
 * 지금 페이지를 내 템플릿으로 — 사진 요소는 imageId를 지우고 slot 번호로 (같은 사진 = 같은 번호, 위에서부터 0,1,2…).
 * 글자·도형·선·표·배지(그룹)는 그대로. 요소 id·구간 id·parked는 담지 않는다(적용할 때 새로 만든다). groupId는 group 이름으로.
 * 사진 id가 없는 사진 요소(그리지 못하는 것)는 담지 않는다.
 * @returns {{ v, name, width, gap, sections }}
 */
export function pageToTemplate(page, name) {
  const slotOf = new Map()
  const slotFor = imageId => {
    if (!slotOf.has(imageId)) slotOf.set(imageId, slotOf.size)
    return slotOf.get(imageId)
  }
  const groupNames = new Map()
  const sections = []
  for (const s of page.sections) {
    if (isPlainPhotoSection(s, page.width)) { sections.push({ photo: slotFor(s.items[0].imageId) }); continue }
    const items = []
    for (const it of s.items) {
      if (!it || typeof it !== 'object') continue
      if (it.type === 'image' && !isValidImageItem(it)) continue
      const { id: _id, imageId, groupId, ...rest } = clone(it)
      const part = it.type === 'image' ? { ...rest, slot: slotFor(imageId) } : rest
      if (typeof groupId === 'string' && groupId !== '') {
        if (!groupNames.has(groupId)) groupNames.set(groupId, `g${groupNames.size + 1}`)
        part.group = groupNames.get(groupId)
      }
      items.push(part)
    }
    sections.push({ height: s.height, bg: s.bg, items })
  }
  return { v: TEMPLATE_VERSION, name: String(name ?? '').trim().slice(0, TEMPLATE_NAME_MAX), width: page.width, gap: page.gap, sections }
}

// ── 미리보기 (왼쪽 [템플릿] 패널 카드) ──

/** 미리보기용 가짜 사진 크기 (사진이 없을 때 자리 모양 — 정사각형) */
export const PREVIEW_PHOTO = { width: 780, height: 780 }

/**
 * 카드 미리보기 문서 — 쓸 사진이 있으면 그 사진(자리 수까지만, 남는 사진은 붙이지 않음), 없으면 정사각 가짜 사진 자리.
 * 그리는 쪽(StudioSectionThumb)은 화면용 작은 사진이 없으면 흐린 자리표시를 그린다.
 */
export function templatePreviewPage(tpl, images, measure) {
  const slots = templateSlots(tpl)
  const real = (images || []).filter(hasSize).slice(0, slots.length)
  const fill = slots.map((n, i) => real[i] ?? { id: `slot-${n}`, ...PREVIEW_PHOTO })
  return buildTemplatePage(tpl, fill, measure)?.page ?? null
}

/** 페이지 전체 높이 (구간 높이 + 간격) — 카드 미리보기 배율을 정할 때 */
export function templatePageHeight(page) {
  return page.sections.reduce((n, s) => n + s.height, 0) + Math.max(0, page.sections.length - 1) * page.gap
}
