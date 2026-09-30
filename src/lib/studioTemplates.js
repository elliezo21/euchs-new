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
 *     asset  { type: 'asset', asset: 파일 경로, x, y, w, h, fit? }  에셋 이미지 (고객 사진 자리가 아님 — 사진 수와 상관없이 늘 들어간다)
 *   구간의 bgImage: { asset, fit } (선택) = 섹션 배경 이미지 — 적용할 때 그대로 옮긴다 (studioAsset.js)
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
  isValidImageItem, itemStyleOf, ITEM_STYLE_DEFAULTS, fitHeight,
} from './studioPage.js'
import { defaultSlotType, SAMPLE_TYPES, SAMPLE_LABEL, sampleCategoriesOf, assignSamples } from './studioSamples.js'
import { normalizeTextItem, fitTextItem, textStyleOf } from './studioText.js'
import { normalizeShapeItem, normalizeLineItem } from './studioShape.js'
import { normalizeTableItem } from './studioTable.js'
import { normalizeAssetItem, sectionBgImageOf } from './studioAsset.js'
import { isSampleItem } from './studioSamples.js'
import { CATEGORY_KEYS, buildCategoryTemplate, TEMPLATE_CATEGORIES, TEMPLATE_MOODS, TEMPLATE_COLORS, templateColorOf } from './studioTemplateSets.js'
import { LOOK_KEYS, buildLookTemplate } from './studioTemplateLooks.js'
import { EVENT_KEYS, EVENT_TONES, buildEventTemplate } from './studioTemplateEvents.js'
import { SHOOT_KEYS, SHOOT_TONES, buildShootTemplate } from './studioTemplateShoots.js'
import { withHero, HERO_SPECS } from './studioTemplateHeroes.js'
import { section, lowerTheme, planSectionStyles, recordSections, SECTION_VARIANTS } from './studioTemplateSections.js'

export { TEMPLATE_CATEGORIES, TEMPLATE_MOODS, TEMPLATE_COLORS }

export const TEMPLATE_VERSION = 1
export const TEMPLATE_NAME_MAX = 50 // 내 템플릿 이름 (studio_assets.name 제약과 같은 1~50자)

const clone = v => JSON.parse(JSON.stringify(v))

// ── 샘플 템플릿 3개 (카테고리 '기본') + 카테고리별 템플릿(studioTemplateSets.js — 에셋 채우기) ──
const INK = '#1f2937'
const t = (x, y, w, text, fontSize, fontWeight, color, extra = {}) => ({ type: 'text', x, y, w, text, fontSize, fontWeight, color, fontFamily: 'noto-sans-kr', align: 'center', lineHeight: 1.3, ...extra })

// 기본 템플릿의 안내 글·사이즈표 칸 (원클릭 틀 = 예전 모양, 갤러리 틀 = 섹션 모양 — 내용은 같다)
const BASIC_NOTICE = '· 화면에 따라 색이 조금 다르게 보일 수 있어요.\n· 재는 방법에 따라 크기가 1~3cm 다를 수 있어요.\n· 궁금한 점은 문의를 남겨 주시면 빠르게 답해 드려요.'
const SIZE_CELLS = [['사이즈', '가슴', '어깨', '총장', '소매'], ...['S', 'M', 'L', 'XL'].map(s => [s, '-', '-', '-', '-'])]
const SIZE_NOTE = '단위: cm · 재는 방법에 따라 1~3cm 차이가 날 수 있어요.'

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
          t(100, 130, 580, BASIC_NOTICE, 19, 400, '#57534e', { align: 'left', lineHeight: 1.8 }),
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
            cells: SIZE_CELLS,
          },
          t(90, 355, 600, SIZE_NOTE, 17, 400, '#777777'),
        ],
      },
      { photo: 3 },
    ],
  },
]
// 기본 3개의 거르기 값 (분위기 — studioTemplateSets.TEMPLATE_MOODS. 색은 모든 템플릿이 첫 화면 tone으로 — buildOne의 templateColorOf)
// sampleCategories = 예시 사진 카테고리 차례 (알맞은 템플릿 카테고리가 없는 식품·건강식품·스포츠 사진을 기본 템플릿에서 쓴다 — size는 옷 치수표라 의류)
const BASE_META = {
  basic: { mood: 'clean', swatch: '#c9a86a', sampleCategories: ['food', 'health', 'apparel', 'bag', 'living'] },
  point: { mood: 'bold', swatch: '#14213d', sampleCategories: ['sports', 'health', 'apparel', 'bag', 'living'] },
  size: { mood: 'clean', swatch: '#2a9d8f', sampleCategories: ['apparel'] },
}
/**
 * 원클릭 자동 제작이 쓰는 기본 틀 = 예전 'basic' 모양 그대로 (대표 사진 → 소개 글 → 사진들 → 구매 전 안내).
 * 갤러리의 'basic'은 큰 제목 첫 화면으로 바뀌었지만, 원클릭은 소개 글 구간에 상품명 초안을 넣으므로 예전 모양을 쓴다 (studioAutoBuild).
 */
export const AUTO_BASE_TEMPLATE = { ...BASE_TEMPLATES[0], category: 'common', ...BASE_META.basic }

/**
 * 갤러리 순서 — 목록 순서를 되도록 지키되, 바로 옆 카드(앞 칸)와 바로 위 카드(cols칸 앞)의 바탕색 계열(tone)이 같지 않게 뒤로 미룬다.
 * 피할 수 없으면(남은 것이 모두 같은 계열) 그대로 둔다.
 */
export const GALLERY_COLUMNS = 5 // 1440px 폭 갤러리 한 줄 카드 수 (StudioTemplatesView .st-gal-grid)
/** after = 이미 순서가 정해진 앞 카드들 (그 뒤에 이어 붙일 때 — 결과에는 list만) */
export function galleryOrder(list, cols = GALLERY_COLUMNS, after = []) {
  const rest = [...list]
  const out = [...after]
  const clash = t => {
    const n = out.length
    return (n > 0 && out[n - 1].tone === t.tone) || (n >= cols && out[n - cols].tone === t.tone)
  }
  while (rest.length) {
    const i = rest.findIndex(t => !clash(t))
    out.push(rest.splice(i < 0 ? 0 : i, 1)[0])
  }
  return out.slice(after.length)
}

/**
 * 기본 템플릿 하나 (갤러리용) — 첫 구간 = 큰 제목 첫 화면, 구매 전 안내(basic)·사이즈 안내(size)는 섹션 모양(sv)으로.
 * point의 POINT 구간(배지 그룹·사진 자리)은 예전 모양 그대로 (내 템플릿 변환·적용 흐름을 테스트가 이 모양으로 본다)
 */
function buildBaseTemplate(key, sv = {}) {
  const raw = BASE_TEMPLATES.find(x => x.key === key)
  const th = lowerTheme(HERO_SPECS[key], { body: 'noto-sans-kr' })
  const sections = raw.sections.map((s, i) => {
    if (key === 'basic' && i === 5) return section('notice', sv.notice, { title: '구매 전에 확인해 주세요', notices: BASIC_NOTICE }, th)
    if (key === 'size' && i === 3) return section('table', sv.table, { title: '사이즈 안내', cells: SIZE_CELLS, note: SIZE_NOTE, w: 600, chips: ['단위 cm', '평평하게 재요', '1~3cm 차이'] }, th)
    return s
  })
  return withHero({ ...raw, category: 'common', ...BASE_META[key], sections })
}

// 목록: 기본 3 → 카테고리 템플릿 17 → 새 템플릿 18 → 안내·이벤트 22, 첫 구간 = 큰 제목 첫 화면(studioTemplateHeroes).
// 그 뒤에 촬영 세트 템플릿 19 (studioTemplateShoots — 앞 60개의 순서·모양을 바꾸지 않게 이어 붙인다)
// 순서 먼저(galleryOrder — 첫 화면 바탕 계열만 본다) → 그 순서로 아래 섹션 모양을 정하고(planSectionStyles — 앞에서부터 차례로 정해 뒤에 붙여도 앞은 그대로) → 템플릿을 만든다
const BASE_KEYS = BASE_TEMPLATES.map(x => x.key)
const toneOf = key => HERO_SPECS[key]?.tone ?? EVENT_TONES[key] ?? SHOOT_TONES[key]
const withTone = keys => keys.map(key => ({ key, tone: toneOf(key) }))
const ORDER_60 = galleryOrder(withTone([...BASE_KEYS, ...CATEGORY_KEYS, ...LOOK_KEYS, ...EVENT_KEYS]))
const ORDER = [...ORDER_60, ...galleryOrder(withTone(SHOOT_KEYS), GALLERY_COLUMNS, ORDER_60)].map(x => x.key)
/** 템플릿마다 아래 섹션 모양 번호 { 종류: 번호 } (studioTemplateSections.SECTION_VARIANTS) — 테스트·보고서용 */
const builderOf = key => (BASE_KEYS.includes(key) ? buildBaseTemplate : CATEGORY_KEYS.includes(key) ? buildCategoryTemplate : LOOK_KEYS.includes(key) ? buildLookTemplate
  : SHOOT_KEYS.includes(key) ? buildShootTemplate : buildEventTemplate)
// 템플릿마다 쓰는 섹션 종류 (모양 0번으로 한 번 만들어 모은다) — 쓰는 템플릿끼리 모양을 고르게 나누려고
const USES = new Map(ORDER.map(key => [key, new Set(recordSections(() => builderOf(key)(key, {})).styles.map(s => s.split(':')[0]))]))
export const SECTION_STYLE_PLAN = planSectionStyles(ORDER, GALLERY_COLUMNS, key => USES.get(key))
// sectionStyles = 이 템플릿이 쓴 아래 섹션 모양 ['종류:번호', …] (페이지 문서에는 들어가지 않는다 — 템플릿 목록 칸)
const buildOne = key => {
  const { value, styles } = recordSections(() => builderOf(key)(key, SECTION_STYLE_PLAN.get(key)))
  // 거르기 색 = 카드에 보이는 첫 화면 바탕 계열 (tone, 사진 덮개 구도는 첫 화면 바탕색 = 덮개·사진 평균색) — 템플릿 파일마다 손으로 적던 색은 쓰지 않는다
  return { ...value, tone: toneOf(key), color: templateColorOf(toneOf(key), value.sections[0].bg), sectionStyles: styles }
}
const built = ORDER.map(buildOne)
// 아래 섹션 모양 조합이 앞 템플릿과 완전히 같으면 — 쓴 종류 하나를 옆·위 카드와 겹치지 않는 다른 모양으로 옮겨 다시 만든다
{
  const seen = new Set()
  const neighborsOf = i => [i - 1, i + 1, i - GALLERY_COLUMNS, i + GALLERY_COLUMNS].filter(j => j >= 0 && j < ORDER.length && (Math.abs(i - j) !== 1 || Math.floor(i / GALLERY_COLUMNS) === Math.floor(j / GALLERY_COLUMNS)))
  built.forEach((t, i) => {
    let sig = t.sectionStyles.join('|')
    const kinds = [...new Set(t.sectionStyles.map(s => s.split(':')[0]))]
    for (let k = 0; sig && seen.has(sig) && k < kinds.length * 8; k++) {
      const kind = kinds[k % kinds.length]
      const plan = SECTION_STYLE_PLAN.get(t.key)
      const n = SECTION_VARIANTS[kind].make.length
      const avoid = new Set(neighborsOf(i).map(j => SECTION_STYLE_PLAN.get(ORDER[j])[kind]))
      const step = Math.floor(k / kinds.length) + 1
      const next = [...Array(n).keys()].map(s => (plan[kind] + step + s) % n).find(v => v !== plan[kind] && !avoid.has(v))
      if (next === undefined) continue
      plan[kind] = next
      built[i] = buildOne(t.key)
      sig = built[i].sectionStyles.join('|')
    }
    seen.add(sig)
  })
}
export const STUDIO_TEMPLATES = built
const byKeys = keys => keys.map(k => STUDIO_TEMPLATES.find(t => t.key === k))
/** 파일별 묶음 (그 파일의 목록 순서) — 테스트가 묶음마다 규칙을 본다 */
export const CATEGORY_TEMPLATES = byKeys(CATEGORY_KEYS)
export const LOOK_TEMPLATES = byKeys(LOOK_KEYS)
export const EVENT_TEMPLATES = byKeys(EVENT_KEYS)
export const SHOOT_TEMPLATES = byKeys(SHOOT_KEYS)
/** 그 카테고리의 템플릿 (모르는 카테고리면 빈 목록) */
export function templatesOf(category) { return STUDIO_TEMPLATES.filter(t => t.category === category) }

export function templateByKey(key) { return STUDIO_TEMPLATES.find(x => x.key === key) ?? null }

// ── 템플릿 고르기 (갤러리·[템플릿] 패널) — 목록·거르기·표시 글자 ──

const CATEGORY_LABEL = new Map(TEMPLATE_CATEGORIES.map(c => [c.key, c.label]))
const MOOD_LABEL = new Map(TEMPLATE_MOODS.map(m => [m.key, m.label]))
/** 카테고리 이름 (모르면 빈 글자) */
export function templateCategoryLabel(tpl) { return CATEGORY_LABEL.get(tpl?.category) ?? '' }
/** 분위기 이름 (모르면 빈 글자) */
export function templateMoodLabel(tpl) { return MOOD_LABEL.get(tpl?.mood) ?? '' }
/** 카드 이름 — label 앞의 "카테고리 · "를 뺀 것 (카드는 "카테고리 | 이름"으로 보여 준다) */
export function templateName(tpl) {
  const label = String(tpl?.label ?? '')
  const cat = templateCategoryLabel(tpl)
  return cat && label.startsWith(`${cat} · `) ? label.slice(cat.length + 3) : label
}
/** 카드 글자 "카테고리 | 이름" */
export function templateCardTitle(tpl) {
  const cat = templateCategoryLabel(tpl)
  return cat ? `${cat} | ${templateName(tpl)}` : templateName(tpl)
}
/** 섹션 수 (사진 자리가 다 찼을 때 — 템플릿 구간 수 그대로) */
export function templateSectionCount(tpl) { return Array.isArray(tpl?.sections) ? tpl.sections.length : 0 }

/**
 * 거르기 — 값이 비어 있으면('' | null | 'all') 그 조건은 보지 않는다. keys(Set 또는 배열)가 있으면 그 템플릿만 (내 보관함).
 * 순서는 STUDIO_TEMPLATES(목록) 순서 그대로.
 * @param {{ category?, mood?, color?, keys? }} f
 */
export function filterTemplates(f = {}, list = STUDIO_TEMPLATES) {
  const on = v => v !== undefined && v !== null && v !== '' && v !== 'all'
  const keys = f.keys ? new Set(f.keys) : null
  return list.filter(t => (!on(f.category) || t.category === f.category)
    && (!on(f.mood) || t.mood === f.mood)
    && (!on(f.color) || t.color === f.color)
    && (!keys || keys.has(t.key)))
}

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

/**
 * 자리마다 어울리는 예시 사진 종류 (templateSlots 순서) — 구간 { photo, sample } 또는 사진 조각 { slot, sample }에 적은 값,
 * 없으면 studioSamples.defaultSlotType (첫 자리 = 제품)
 */
export function templateSlotTypes(tpl) {
  const typeOf = new Map()
  const note = (n, t) => { if (SAMPLE_TYPES.includes(t) && !typeOf.has(n)) typeOf.set(n, t) }
  for (const s of tpl.sections) {
    if (isPhotoSection(s)) note(s.photo, s.sample)
    else for (const p of s.items || []) if (isSlotPart(p)) note(p.slot, p.sample)
  }
  return templateSlots(tpl).map((n, i) => typeOf.get(n) ?? defaultSlotType(i))
}

/** 첫 구간(갤러리 카드 표지)에 있는 사진 자리의 차례 번호들 (templateSlots 안의 자리) */
export function coverSlotIndexes(tpl) {
  const first = tpl.sections[0]
  const inCover = new Set(isPhotoSection(first) ? [first.photo] : (first?.items || []).filter(isSlotPart).map(p => p.slot))
  return templateSlots(tpl).map((n, i) => (inCover.has(n) ? i : -1)).filter(i => i >= 0)
}

/**
 * 템플릿마다 자리별 예시 사진 — 갤러리 전체를 한 번에 나눠 준다 (studioSamples.assignSamples).
 * 대표 사진(첫 자리)은 카드끼리 겹치지 않게, 한 템플릿 안에서는 같은 사진을 두 번 쓰지 않게, 카테고리는 이름 규칙(sampleCategoriesOf)으로.
 * @returns {Map<string, (object|null)[]>} key → 자리 순서대로 예시 사진
 */
export function assignTemplateSamples(samples, list = STUDIO_TEMPLATES) {
  return assignSamples(list.map(t => ({ key: t.key, chain: sampleCategoriesOf(t), types: templateSlotTypes(t), cover: coverSlotIndexes(t), ...(t.samplePins ? { pins: t.samplePins } : {}) })), samples)
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
  const { slot: _slot, group: _group, id: _id, sample: _sample, ...fields } = part
  const id = newPageId('i')
  switch (part.type) {
    case 'image': return normalizeItem({ ...fields, id, type: 'image', imageId })
    case 'text': {
      const n = normalizeTextItem(normalizeItem({ ...fields, id, type: 'text', h: 1 }))
      return fitTextItem(n, measure)
    }
    case 'shape': return normalizeShapeItem(normalizeItem({ ...fields, id }))
    // 선 높이는 굵기에 맞춰 자동(가운데 기준) — 템플릿 조각은 h 없음(= 선 한 줄 두께 2 기준), 내 템플릿(페이지에서 온 조각)은 h가 있어 그 가운데 그대로
    case 'line': return normalizeLineItem(normalizeItem({ ...fields, id, h: Number.isFinite(fields.h) ? fields.h : 2 }))
    case 'table': return normalizeTableItem(normalizeItem({ ...fields, id, h: 1 }))
    case 'asset': return normalizeAssetItem(normalizeItem({ ...fields, id }))
    default: return { ...clone(fields), id, type: part.type } // 모르는 요소 — 보존
  }
}

/** 예시 사진 요소 (studioSamples — 에셋 요소 + sample: true). 사진 조각의 자리·꾸미기(모서리·테두리·그림자)는 그대로 둔다 */
function sampleItem(sample, fields) {
  return normalizeAssetItem(normalizeItem({
    ...fields, id: newPageId('i'), type: 'asset', asset: sample.file, fit: 'cover', sample: true, label: SAMPLE_LABEL,
  }))
}

/**
 * 템플릿으로 새 페이지 문서를 만든다.
 * @param {object} tpl 템플릿 (STUDIO_TEMPLATES 하나 또는 내 템플릿)
 * @param {{ id, width, height }[]} images 쓸 사진 (목록 순서, 자른 사진은 자른 크기). 크기를 모르는 사진은 빼고 사유를 남긴다
 * @param {(s: string, style: object) => number} measure 글자 폭 재기 (글자 높이를 정하려고)
 * @param {{ samples?: ({ file, w, h }|null)[] }} opts samples = 자리 순서(templateSlots)대로 예시 사진 (studioSamples.pickSamples).
 *   고객 사진이 모자란 자리는 예시 사진 요소로 채운다 (없으면 예전처럼 그 자리를 뺀다)
 * @returns {{ page, placed: number, extra: number, slots: number, emptySlots: number, samples: number } | null} 모양이 어긋난 템플릿이면 null
 *   samples = 예시 사진으로 채운 자리 수, emptySlots = 사진도 예시 사진도 없어 뺀 자리 수
 */
export function buildTemplatePage(tpl, images, measure, width = PAGE_WIDTH, { samples = null } = {}) {
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
  const okSample = v => !!v && typeof v.file === 'string' && v.w > 0 && v.h > 0
  const sampleOfSlot = new Map(slots.map((n, i) => [n, !photos[i] && okSample(samples?.[i]) ? samples[i] : null]))
  const page = emptyPage(width)
  page.gap = Number.isInteger(tpl.gap) ? tpl.gap : 0
  for (const s of tpl.sections) {
    if (page.sections.length >= SECTION_MAX) break
    if (isPhotoSection(s)) {
      const img = photoOfSlot.get(s.photo)
      const sm = img ? null : sampleOfSlot.get(s.photo)
      if (!img && !sm) continue // 빈 자리 — 구간째 뺀다
      let sec
      if (img) sec = imageSection(img, width)
      else {
        const h = fitHeight(width, sm.w, sm.h)
        sec = { id: newPageId('s'), height: h, bg: SECTION_BG, items: [sampleItem(sm, { x: 0, y: 0, w: width, h })] }
      }
      if (typeof s.bg === 'string') sec.bg = s.bg
      page.sections.push(sec)
      continue
    }
    const gids = new Map() // 조각 group 이름 → 이번 적용의 새 groupId
    const items = []
    for (const part of s.items) {
      let imageId = null
      let it
      if (part.type === 'image') {
        const img = photoOfSlot.get(part.slot)
        const sm = img ? null : sampleOfSlot.get(part.slot)
        if (!img && !sm) continue // 빈 자리의 사진 요소는 빼고 저장하지 않는다
        if (img) imageId = img.id
        else {
          const { slot: _s, group: _g, id: _i, sample: _t, type: _ty, ...fields } = part
          it = sampleItem(sm, fields)
        }
      }
      it ??= partToItem(part, imageId, measure)
      if (typeof part.group === 'string' && part.group !== '') {
        if (!gids.has(part.group)) gids.set(part.group, newPageId('g'))
        it = { ...it, groupId: gids.get(part.group) }
      }
      items.push(it)
    }
    if (s.items.length > 0 && items.length === 0) continue // 사진 자리만 있던 구간이 모두 비었다 — 구간째 뺀다
    const bgImage = sectionBgImageOf(s)
    page.sections.push({ id: newPageId('s'), height: s.height, bg: typeof s.bg === 'string' ? s.bg : SECTION_BG, ...(bgImage ? { bgImage } : {}), items })
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
  const sampled = [...sampleOfSlot.values()].filter(Boolean).length
  return { page: cleanGroups(page), placed, extra, slots: slots.length, emptySlots: slots.length - placed - sampled, samples: sampled }
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
    && s.bg === SECTION_BG && !('bgImage' in s)
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
      let part, groupId
      if (isSampleItem(it)) {
        // 예시 사진 = 사진 자리 (다른 작업에서 고객 사진이 들어가게)
        const { id: _id, asset: _a, fit: _f, sample: _s, label: _l, groupId: g, ...rest } = clone(it)
        part = { ...rest, type: 'image', slot: slotFor(`sample:${it.id}`) }
        groupId = g
      } else {
        const { id: _id, imageId, groupId: g, ...rest } = clone(it)
        part = it.type === 'image' ? { ...rest, slot: slotFor(imageId) } : rest
        groupId = g
      }
      if (typeof groupId === 'string' && groupId !== '') {
        if (!groupNames.has(groupId)) groupNames.set(groupId, `g${groupNames.size + 1}`)
        part.group = groupNames.get(groupId)
      }
      items.push(part)
    }
    const bgImage = sectionBgImageOf(s)
    sections.push({ height: s.height, bg: s.bg, ...(bgImage ? { bgImage } : {}), items })
  }
  return { v: TEMPLATE_VERSION, name: String(name ?? '').trim().slice(0, TEMPLATE_NAME_MAX), width: page.width, gap: page.gap, sections }
}

// ── 미리보기 (왼쪽 [템플릿] 패널 카드) ──

/** 미리보기용 가짜 사진 크기 (사진이 없을 때 자리 모양 — 정사각형) */
export const PREVIEW_PHOTO = { width: 780, height: 780 }

/**
 * 카드 미리보기 문서 — 쓸 사진이 있으면 그 사진(자리 수까지만, 남는 사진은 붙이지 않음).
 * 남은 자리: samples(자리 순서대로 예시 사진 — studioSamples.pickSamples)가 있으면 예시 사진 요소(적용할 때와 같은 모양),
 * 없으면 정사각 가짜 사진 자리(id 'slot-n' — 그리는 쪽이 회색 자리표시로).
 */
export function templatePreviewPage(tpl, images, measure, samples = null) {
  const slots = templateSlots(tpl)
  const real = (images || []).filter(hasSize).slice(0, slots.length)
  if (samples) return buildTemplatePage(tpl, real, measure, PAGE_WIDTH, { samples })?.page ?? null
  const fill = slots.map((n, i) => real[i] ?? { id: `slot-${n}`, ...PREVIEW_PHOTO })
  return buildTemplatePage(tpl, fill, measure)?.page ?? null
}

/** 페이지 전체 높이 (구간 높이 + 간격) — 카드 미리보기 배율을 정할 때 */
export function templatePageHeight(page) {
  return page.sections.reduce((n, s) => n + s.height, 0) + Math.max(0, page.sections.length - 1) * page.gap
}
