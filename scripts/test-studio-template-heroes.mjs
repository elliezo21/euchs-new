// 템플릿 첫 화면·안내/이벤트·예시 사진 나누기·갤러리 순서 테스트 — node scripts/test-studio-template-heroes.mjs
// 첫 구간 3:4 · 큰 제목 30~40% · 하트 자리 비움 · 글자 넘침·자리 밖·겹침 없음 · 구간 수·표 유지 · 안내·이벤트 22개(사진 0~1)
// · 대표 사진이 카드끼리 겹치지 않음 · 한 템플릿 안 같은 사진 없음 · 바로 옆 카드 바탕색 계열이 다름 · 새 카테고리 사진이 이름 규칙으로 배정됨
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  STUDIO_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_MOODS, TEMPLATE_COLORS, templateSlots, templateSlotTypes, templateProblems, buildTemplatePage,
  coverSlotIndexes, assignTemplateSamples, galleryOrder, GALLERY_COLUMNS, AUTO_BASE_TEMPLATE, templateFontList, templatesOf,
} from '../src/lib/studioTemplates.js'
import { HERO_H, HERO_W, HERO_TITLE_MIN, HERO_TITLE_MAX, HERO_TITLE_SIZE, HEART_ZONE, HERO_SPECS, HERO_COMPS, withHero } from '../src/lib/studioTemplateHeroes.js'
import { EVENT_TEMPLATES } from '../src/lib/studioTemplateEvents.js'
import { textLinesOf, itemBounds, isValidImageItem, readPage, PAGE_WIDTH } from '../src/lib/studioPage.js'
import { isValidTextItem, textStyleOf } from '../src/lib/studioText.js'
import { isValidAssetItem, isAssetPath } from '../src/lib/studioAsset.js'
import { isFontKey, fontByKey } from '../src/lib/studioFonts.js'
import { isSampleItem, readSamples, sampleCategoriesOf, assignSamples, TEMPLATE_SAMPLE_CHAIN } from '../src/lib/studioSamples.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const HERE = path.dirname(fileURLToPath(import.meta.url))
// 넉넉한 글자 폭 (글꼴마다 [한글·전각, 그 밖]) — 실제 글꼴보다 조금 넓게
const FACTOR = {
  pretendard: [0.95, 0.62], 'noto-sans-kr': [0.95, 0.62], 'gowun-batang': [0.96, 0.62], 'noto-serif-kr': [0.96, 0.62], 'nanum-myeongjo': [0.96, 0.62],
  'gasoek-one': [1.1, 0.78], 'east-sea-dokdo': [0.82, 0.52], cinzel: [1.0, 0.84], 'black-han-sans': [1.0, 0.66], 'do-hyeon': [1.0, 0.62],
}
const WIDE = /[ᄀ-ᇿ㄰-㆏가-힣一-鿿　-〿＀-￯]/
function measure(s, style) {
  const [k, l] = FACTOR[style.fontFamily] ?? [1, 0.68]
  let w = 0
  for (const ch of s) w += (ch === ' ' ? 0.3 : WIDE.test(ch) ? k : l) * style.fontSize
  return w
}
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'public', 'studio-assets', 'manifest.json'), 'utf8'))
const samples = readSamples(manifest.samples).samples
const assetFiles = new Set(manifest.items.map(i => i.file))

/** 글자의 실제 잉크 네모 (정렬·줄 폭·자간 반영) */
function inkBox(it) {
  const lines = textLinesOf(it, measure)
  const ls = (it.letterSpacing ?? 0) * it.fontSize
  const w = Math.max(...lines.map(l => measure(l, it) + ls * [...l].length), 1)
  const x = it.align === 'left' ? it.x : it.align === 'right' ? it.x + it.w - w : it.x + (it.w - w) / 2
  return itemBounds({ ...it, x, w })
}
const hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5
const isPhoto = it => isValidImageItem(it) || isSampleItem(it)

/** 한 구간의 문제 — 자리 밖 · 글자 넘침 · 겹침 (같은 묶음 · 구간을 채운 바탕 사진 · 배지 글자는 봐줌) */
function sectionProblems(s, width, tag) {
  const out = []
  const groupsWithShape = new Set(s.items.filter(it => it.type === 'shape' && it.groupId).map(it => it.groupId))
  const solid = []
  for (const it of s.items) {
    const b = itemBounds(it)
    if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > width + 0.5 || b.y + b.h > s.height + 0.5) out.push(`${tag}: 자리 밖 ${it.type} ${it.text ?? it.asset ?? ''}`)
    if (isValidTextItem(it)) {
      if (textLinesOf(it, measure).length !== it.text.split('\n').length) out.push(`${tag}: 글자 넘침 "${it.text}"`)
      solid.push({ kind: 'text', g: it.groupId, b: inkBox(it), it, badge: groupsWithShape.has(it.groupId) })
    } else if (isPhoto(it)) {
      const bgPhoto = it.w * it.h >= width * s.height * 0.95
      if (!bgPhoto) solid.push({ kind: 'photo', g: it.groupId, b, it })
    } else if (isValidAssetItem(it)) solid.push({ kind: 'asset', g: it.groupId, b, it })
  }
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const p = solid[i], q = solid[j]
    if (p.g && p.g === q.g) continue
    if ((p.badge && q.kind === 'photo') || (q.badge && p.kind === 'photo')) continue // 사진 모서리에 붙인 배지
    if (hit(p.b, q.b)) out.push(`${tag}: ${p.kind}·${q.kind} 겹침 ${p.it.text ?? p.it.asset ?? p.it.slot ?? ''} / ${q.it.text ?? q.it.asset ?? q.it.slot ?? ''}`)
  }
  return out
}

// HEAD(바꾸기 전) 구간 수·표 수 — 첫 화면을 바꿔도 그대로여야 한다
const BEFORE = { basic: [6, 0], point: [5, 0], size: [5, 1], 'apparel-look': [7, 1], 'apparel-basic': [8, 1], 'bags-daily': [8, 1], 'bags-check': [9, 1], 'kitchen-bold': [8, 1], 'kitchen-check': [9, 1], 'living-basic': [8, 1], 'living-bold': [8, 1], 'beauty-mood': [7, 1], 'beauty-check': [9, 1], 'electronics-bold': [8, 1], 'electronics-spec': [8, 1], 'toys-play': [9, 1], 'toys-basic': [8, 1], 'pets-bold': [8, 1], 'pets-mood': [7, 1], 'fullset-sample': [11, 3], 'apparel-minimal': [9, 0], 'apparel-warm': [10, 0], 'apparel-vivid': [8, 0], 'apparel-mono': [9, 0], 'apparel-natural': [10, 0], 'apparel-trendy': [8, 0], 'bags-minimal': [8, 0], 'bags-warm': [10, 0], 'bags-vivid': [8, 0], 'bags-mono': [9, 0], 'bags-natural': [10, 0], 'bags-trendy': [8, 0], 'living-minimal': [8, 0], 'living-warm': [11, 0], 'living-vivid': [8, 0], 'living-mono': [9, 0], 'living-natural': [10, 0], 'living-trendy': [8, 0] }

// ── 1. 개수·카테고리 ──
{
  eq('전체 60개 이상 (예전 38 + 안내·이벤트 22)', [STUDIO_TEMPLATES.length >= 60, STUDIO_TEMPLATES.length, EVENT_TEMPLATES.length], [true, 60, 22])
  eq('예전 38개 key가 모두 남아 있음', Object.keys(BEFORE).filter(k => !STUDIO_TEMPLATES.some(t => t.key === k)), [])
  eq('key 겹침 없음', new Set(STUDIO_TEMPLATES.map(t => t.key)).size, STUDIO_TEMPLATES.length)
  eq('카테고리 "안내·이벤트" = 22개', [TEMPLATE_CATEGORIES.find(c => c.key === 'event')?.label, templatesOf('event').length], ['안내·이벤트', 22])
  const moods = new Set(TEMPLATE_MOODS.map(m => m.key)), colors = new Set(TEMPLATE_COLORS.map(c => c.key))
  eq('모든 템플릿: 분위기·색·바탕 계열(tone) 있음', STUDIO_TEMPLATES.filter(t => !moods.has(t.mood) || !colors.has(t.color) || typeof t.tone !== 'string').map(t => t.key), [])
  eq('첫 화면 사양 = 예전 38개 모두', Object.keys(HERO_SPECS).sort(), Object.keys(BEFORE).sort())
  eq('구도 9가지 모두 씀', HERO_COMPS.filter(c => !Object.values(HERO_SPECS).some(s => s.comp === c)), [])
}

// ── 2. 첫 화면 (60개 모두) ──
for (const tpl of STUDIO_TEMPLATES) {
  const k = tpl.key
  const hero = tpl.sections[0]
  eq(`${k}: 모양 검사 통과 · 사진 자리 0부터 빈틈없이`, [templateProblems(tpl), templateSlots(tpl).every((n, i) => n === i)], [[], true])
  eq(`${k}: 첫 구간 780×1040 (3:4)`, [PAGE_WIDTH === HERO_W, hero.height], [true, HERO_H])
  const r = buildTemplatePage(tpl, [], measure, PAGE_WIDTH, { samples: templateSlotTypes(tpl).map(() => ({ file: 'samples/x.webp', w: 891, h: 891 })) })
  const page = r.page
  const first = page.sections[0]
  const big = first.items.filter(it => isValidTextItem(it) && it.fontSize >= HERO_TITLE_SIZE)
  const ratio = big.reduce((n, it) => n + it.h, 0) / first.height
  eq(`${k}: 큰 제목 = 첫 구간 높이의 30~42%`, [big.length > 0, ratio >= HERO_TITLE_MIN && ratio <= HERO_TITLE_MAX], [true, true])
  eq(`${k}: 부제·작은 영문 라벨 있음 · 빈 글자 없음`, [
    first.items.some(it => isValidTextItem(it) && it.fontFamily === 'cinzel' && it.fontSize < 30 && /^[A-Z0-9 &]+$/.test(it.text)),
    first.items.some(it => isValidTextItem(it) && it.fontSize >= 18 && it.fontSize < 60 && it.fontFamily !== 'cinzel'),
    tpl.sections.flatMap(s => s.items || []).filter(p => p.type === 'text' && !(typeof p.text === 'string' && /\S/.test(p.text))).length,
  ], [true, true, 0])
  const zone = first.items.filter(it => (isValidTextItem(it) && hit(inkBox(it), HEART_ZONE)) || (it.type === 'shape' && it.groupId && hit(itemBounds(it), HEART_ZONE)))
  eq(`${k}: 카드 하트 자리(오른쪽 위)에 글자·배지 없음`, zone.map(it => it.text ?? it.shape), [])
  eq(`${k}: 첫 구간 — 자리 밖·글자 넘침·겹침 없음`, sectionProblems(first, page.width, '첫 구간'), [])
  eq(`${k}: 글꼴은 허용 목록 · 굵기는 그 글꼴이 가진 값`, templateFontList(tpl).every(f => isFontKey(f.style.fontFamily) && fontByKey(f.style.fontFamily).weights.includes(f.style.fontWeight)), true)
  const assets = [...tpl.sections.flatMap(s => s.items || []).filter(p => p.type === 'asset').map(p => p.asset), ...tpl.sections.map(s => s.bgImage?.asset).filter(Boolean)]
  eq(`${k}: 에셋은 모두 목록에 있는 파일`, assets.filter(a => !isAssetPath(a) || !assetFiles.has(a)), [])
  const back = readPage(JSON.parse(JSON.stringify(page)), 't')
  eq(`${k}: readPage 그대로 통과`, [back.problems, JSON.stringify(back.page) === JSON.stringify(page)], [[], true])
  if (BEFORE[k]) {
    eq(`${k}: 구간 수·표 수 그대로`, [tpl.sections.length, tpl.sections.flatMap(s => s.items || []).filter(p => p.type === 'table').length], BEFORE[k])
    eq(`${k}: 첫 화면에 대표 사진(0번 자리)`, coverSlotIndexes(tpl).includes(0), true)
  }
}

// ── 3. 안내·이벤트 ──
for (const tpl of EVENT_TEMPLATES) {
  const k = tpl.key
  eq(`${k}: 사진 자리 0~1개 · 첫 화면에는 사진 없음`, [templateSlots(tpl).length <= 1, coverSlotIndexes(tpl).length], [true, 0])
  eq(`${k}: 우리 에셋(그림·배경) 1개 이상`, tpl.sections.flatMap(s => s.items || []).some(p => p.type === 'asset') || tpl.sections.some(s => s.bgImage), true)
  const page = buildTemplatePage(tpl, [{ id: 'p0', width: 900, height: 900 }], measure).page
  eq(`${k}: 모든 구간 — 자리 밖·글자 넘침·겹침 없음`, page.sections.flatMap((s, i) => sectionProblems(s, page.width, `구간 ${i}`)), [])
  eq(`${k}: 자리표시 글([가게 이름]·[0월 0일]·[0,000]원 등) 있음`, /\[[^\]]+\]/.test(JSON.stringify(tpl.sections)), true)
}
eq('안내·이벤트: 문구에 다른 회사·판매처 이름·"중국어" 없음', /1688|쿠팡|네이버|미리캔버스|캔바|canva|amazon|shopify|중국어/i.test(JSON.stringify([EVENT_TEMPLATES, HERO_SPECS])), false)

// ── 4. 예시 사진 나누기 ──
{
  const map = assignTemplateSamples(samples)
  const reps = STUDIO_TEMPLATES.filter(t => coverSlotIndexes(t).includes(0)).map(t => [t.key, map.get(t.key)[0]?.id])
  const count = new Map()
  reps.forEach(([, id]) => count.set(id, (count.get(id) ?? 0) + 1))
  eq('대표 사진이 겹치는 카드 0개', reps.filter(([, id]) => !id || count.get(id) > 1).map(([k]) => k), [])
  const coverIds = STUDIO_TEMPLATES.flatMap(t => coverSlotIndexes(t).map(i => map.get(t.key)[i]?.id))
  eq('첫 화면에 보이는 사진 전체도 카드끼리 겹치지 않음', coverIds.length - new Set(coverIds).size, 0)
  eq('한 템플릿 안에서 같은 사진 반복 없음 · 빈 자리 없음', STUDIO_TEMPLATES.filter(t => {
    const ids = map.get(t.key).map(s => s?.id)
    return ids.some(x => !x) || new Set(ids).size !== ids.length
  }).map(t => t.key), [])
  eq('의류·가방 템플릿 = 그 카테고리 사진만', STUDIO_TEMPLATES.filter(t => ['apparel', 'bags'].includes(t.category)).filter(t => map.get(t.key).some(s => s.category !== { apparel: 'apparel', bags: 'bag' }[t.category])).map(t => t.key), [])
  eq('사진 없는 카테고리 → 가까운 사진 (뷰티=가방·전자=생활·완구=생활·반려=생활)', ['beauty', 'electronics', 'toys', 'pets'].map(c => sampleCategoriesOf({ category: c })[1]), ['bag', 'living', 'living', 'living'])
  eq('나눔 결과가 늘 같음 (다시 불러도)', JSON.stringify([...assignTemplateSamples(samples)].map(([k, v]) => [k, v.map(s => s?.id)])), JSON.stringify([...map].map(([k, v]) => [k, v.map(s => s?.id)])))
  // 새 카테고리 사진이 manifest에 생기면 — 이름 규칙으로 그 카테고리 템플릿이 먼저 쓴다
  const beauty = ['product', 'scene', 'detail'].flatMap(type => [1, 2, 3].map(n => ({ id: `b-${type}-${n}`, kind: 'sample', category: 'beauty', type, file: `samples/euchs-sample_beauty_${type}_x_0${n}.webp`, w: 891, h: 891 })))
  const withBeauty = assignTemplateSamples([...samples, ...beauty])
  eq('뷰티 사진이 생기면 뷰티 템플릿 대표 = 뷰티 사진', templatesOf('beauty').map(t => withBeauty.get(t.key)[0]?.category), templatesOf('beauty').map(() => 'beauty'))
  eq('이름 규칙 표: 식품·건강식품·뷰티·전자·완구·반려동물·주방·스포츠·명절 선물', ['food', 'health', 'beauty', 'electronics', 'toys', 'pets', 'kitchen', 'sports', 'gift'].map(c => sampleCategoriesOf({ category: c })[0]), ['food', 'health', 'beauty', 'digital', 'toy', 'pet', 'kitchen', 'sports', 'gift'])
  eq('표에 없는 카테고리 = 그 이름 → 끝 s 뗀 이름 → 생활', sampleCategoriesOf({ category: 'gifts' }), ['gift', 'living'])
  eq('사진이 모자라면 그 자리는 비움 (같은 사진 두 번 안 씀)', assignSamples([{ key: 'a', chain: ['living'], types: ['product', 'product'], cover: [0] }], samples.filter(s => s.category === 'living').slice(0, 1)).get('a').map(s => s?.id ?? null), [samples.find(s => s.category === 'living').id, null])
  eq('차례표의 카테고리는 모두 알려진 이름', Object.values(TEMPLATE_SAMPLE_CHAIN).flat().every(c => typeof c === 'string' && /^[a-z]+$/.test(c)), true)
}

// ── 5. 갤러리 순서 ──
{
  const list = STUDIO_TEMPLATES
  const side = list.filter((t, i) => i > 0 && i % GALLERY_COLUMNS !== 0 && list[i - 1].tone === t.tone).map(t => t.key)
  const up = list.filter((t, i) => i >= GALLERY_COLUMNS && list[i - GALLERY_COLUMNS].tone === t.tone).map(t => t.key)
  eq(`바로 옆 카드 바탕색 계열 겹침 0곳 (${GALLERY_COLUMNS}열)`, side, [])
  eq(`바로 위 카드 바탕색 계열 겹침 0곳 (${GALLERY_COLUMNS}열)`, up, [])
  eq('순서만 바꿈 (빠진 것·늘어난 것 없음)', galleryOrder(list).map(t => t.key).sort(), list.map(t => t.key).sort())
  eq('피할 수 없으면 그대로', galleryOrder([{ key: 'a', tone: 'x' }, { key: 'b', tone: 'x' }]).map(t => t.key), ['a', 'b'])
}

// ── 6. 원클릭·예전 흐름 ──
{
  eq('원클릭 기본 틀 = 예전 basic 모양 (대표 사진 → 소개 글)', [AUTO_BASE_TEMPLATE.sections[0], AUTO_BASE_TEMPLATE.sections[1].items[0].text], [{ photo: 0 }, '상품 이름을 적어 주세요'])
  eq('withHero: 뒤 구간이 0번 자리를 쓰면 새 번호로 (한 템플릿 안 같은 사진 없음)', (() => {
    const t = withHero({ key: 'x', sections: [{ height: 10, bg: '#ffffff', items: [] }, { photo: 0 }, { photo: 1 }] }, { ...HERO_SPECS.basic })
    return templateSlots(t).length === 3 && t.sections[1].photo !== 0 && t.sections.length === 3
  })(), true)
}

// ── 7. 화면 — 표지 3:4 전체 · 하트 ──
{
  const thumbs = fs.readFileSync(path.join(HERE, '..', 'src', 'lib', 'studioTemplateThumbs.js'), 'utf8')
  eq('표지 = 첫 구간 전체를 3:4에 줄여 넣음 (윗부분만 자르지 않음)', [/const first = page\.sections\[0\]/.test(thumbs), /Math\.min\(1, coverH \/ secH\)/.test(thumbs)], [true, true])
  eq('예시 사진 = 갤러리 전체 나눔(assignTemplateSamples)', /assignTemplateSamples\(m\.samples\)/.test(thumbs), true)
  const card = fs.readFileSync(path.join(HERE, '..', 'src', 'components', 'studio', 'StudioTemplateCard.vue'), 'utf8')
  eq('하트: 반투명 흰 원 · 카드 모서리 안쪽', [/\.st-tcard-heart \{[^}]*background: rgba\(255, 255, 255, \.7\d?\)/.test(card), /\.st-tcard-heart \{[^}]*top: 10px; right: 10px/.test(card)], [true, true])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
