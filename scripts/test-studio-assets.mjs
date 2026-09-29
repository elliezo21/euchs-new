// 에셋 채우기 테스트 — node scripts/test-studio-assets.mjs
// 카테고리 템플릿(구성·문구가 폭 안·겹침 없음) · 새 도형 path · 꾸밈 요소 · 배지 · 글자 스타일 묶음 · 표 틀
import { STUDIO_TEMPLATES, TEMPLATE_CATEGORIES, templatesOf, templateSlots, templateProblems, buildTemplatePage } from '../src/lib/studioTemplates.js'
import { CATEGORY_TEMPLATES } from '../src/lib/studioTemplateSets.js'
import { readPage, buildGroupItems, addItemGroup, emptyPage, addSection, itemBounds, findItem, groupMemberIds, PAGE_WIDTH } from '../src/lib/studioPage.js'
import { SHAPES, SHAPE_LABELS, ELEMENT_KINDS, shapePath, shapePaintSpec, normalizeShapeItem, isValidShapeItem, isValidLineItem, elementLabel } from '../src/lib/studioShape.js'
import { DECOR_PRESETS, DECOR_KINDS, decorPresetByKey, groupPresetByKey, presetTextParts } from '../src/lib/studioDecor.js'
import { BADGE_PRESETS } from '../src/lib/studioBadge.js'
import { TEXT_STYLE_PRESETS, TEXT_STYLE_GROUPS, styleGroupOf, isValidTextItem, wrapLines, textStyleOf } from '../src/lib/studioText.js'
import { TABLE_TEMPLATES, TABLE_GROUPS, tableGroupOf, tableFieldsOf, normalizeTableItem, TABLE_CELL_MAX } from '../src/lib/studioTable.js'
import { isFontKey, fontByKey } from '../src/lib/studioFonts.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
// 넉넉한 가짜 글자 폭: 한글·전각 = 크기 × 1.0, 공백 0.35, 그 밖(영문·숫자·부호) 0.68 — 실제 글꼴보다 넓게 잡아 넘침을 미리 찾는다
const WIDE = /[ᄀ-ᇿ　-〿㄰-㆏一-鿿가-힯＀-￯]/
const measure = (s, st) => [...s].reduce((n, ch) => n + (WIDE.test(ch) ? 1 : ch === ' ' ? 0.35 : 0.68), 0) * st.fontSize
const photos = n => Array.from({ length: n }, (_, i) => ({ id: `img${i}`, width: 1000, height: 1000 }))
const HEX = /^#[0-9a-f]{6}$/

// ── 1. 카테고리 템플릿 ──
{
  const cats = TEMPLATE_CATEGORIES.filter(c => !['common', 'fullset', 'event'].includes(c.key)) // 풀세트는 test-studio-asset-images.mjs, 안내·이벤트는 test-studio-template-heroes.mjs
  eq('카테고리 8개 (의류·잡화/가방·주방·생활용품·뷰티·전자/소형가전·완구·반려동물)', cats.map(c => c.key), ['apparel', 'bags', 'kitchen', 'living', 'beauty', 'electronics', 'toys', 'pets'])
  // 에셋 채우기 템플릿만 (새 템플릿 18개 — studioTemplateLooks — 는 test-studio-template-looks.mjs가 본다)
  const setOf = k => templatesOf(k).filter(t => !/-(minimal|warm|vivid|mono|natural|trendy)$/.test(t.key))
  eq('카테고리마다 템플릿 2~3개 (에셋 채우기 템플릿)', cats.map(c => setOf(c.key).length >= 2 && setOf(c.key).length <= 3), cats.map(() => true))
  eq('기본 카테고리 = 예전 3개', templatesOf('common').map(t => t.key), ['basic', 'point', 'size'])
  eq('모든 템플릿의 카테고리가 목록에 있음', STUDIO_TEMPLATES.every(t => TEMPLATE_CATEGORIES.some(c => c.key === t.category)), true)
  eq('key·이름 겹침 없음', [new Set(STUDIO_TEMPLATES.map(t => t.key)).size, new Set(STUDIO_TEMPLATES.map(t => t.label)).size], [STUDIO_TEMPLATES.length, STUDIO_TEMPLATES.length])
  for (const tpl of CATEGORY_TEMPLATES.filter(t => t.category !== 'fullset')) {
    const tag = tpl.key
    eq(`${tag}: 모양 문제 없음`, templateProblems(tpl), [])
    eq(`${tag}: 구간 7~12개`, tpl.sections.length >= 7 && tpl.sections.length <= 12, true)
    eq(`${tag}: 사진 자리 0부터 빈 번호 없이 3개 이상`, [templateSlots(tpl).every((n, i) => n === i), templateSlots(tpl).length >= 3], [true, true])
    const parts = tpl.sections.flatMap(s => s.items || [])
    eq(`${tag}: 표 1개 이상 · 글자 글꼴은 허용 목록 · 굵기는 그 글꼴이 가진 값`, [
      parts.some(p => p.type === 'table'),
      parts.filter(p => p.type === 'text').every(p => isFontKey(p.fontFamily) && fontByKey(p.fontFamily).weights.includes(p.fontWeight)),
    ], [true, true])
    eq(`${tag}: 색은 모두 #rrggbb (바꿀 수 있는 기본색)`, [
      tpl.sections.every(s => s.bg === undefined || HEX.test(s.bg)),
      parts.every(p => ['color', 'fill', 'strokeColor', 'headerBg', 'headerColor', 'borderColor'].every(k => p[k] === undefined || p[k] === '' || HEX.test(p[k]))),
    ], [true, true])
    eq(`${tag}: 표 칸 글자 ${TABLE_CELL_MAX}자 이하`, parts.filter(p => p.type === 'table').every(p => p.cells.flat().every(c => [...c].length <= TABLE_CELL_MAX)), true)

    const r = buildTemplatePage(tpl, photos(templateSlots(tpl).length), measure)
    const back = readPage(JSON.parse(JSON.stringify(r.page)), 'tpl')
    eq(`${tag}: readPage 그대로 통과`, [back.problems.length, JSON.stringify(back.page) === JSON.stringify(r.page)], [0, true])
    // 글자: 직접 나눈 줄 그대로 (넉넉한 폭으로 재도 자동 줄바꿈이 생기지 않음) + 구간 안
    const wrapped = [], outside = [], overlap = []
    for (const s of r.page.sections) {
      for (const it of s.items) {
        const b = itemBounds(it)
        if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > PAGE_WIDTH + 0.5 || b.y + b.h > s.height + 0.5) outside.push(`${it.type}:${it.text ?? it.shape ?? ''}`)
        if (isValidTextItem(it) && wrapLines(it.text, textStyleOf(it), it.w, measure).length !== it.text.split('\n').length) wrapped.push(it.text)
      }
      // 글자끼리 겹치지 않음 (같은 구간)
      const texts = s.items.filter(isValidTextItem)
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], b = texts[j]
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap.push(`${a.text} × ${b.text}`)
      }
    }
    eq(`${tag}: 글자가 폭 안 (자동 줄바꿈 없음)`, wrapped, [])
    eq(`${tag}: 모든 요소가 구간 안`, outside, [])
    eq(`${tag}: 글자끼리 겹침 없음`, overlap, [])
    eq(`${tag}: 그룹은 2개 이상씩`, (() => {
      const gids = r.page.sections.flatMap(s => s.items).filter(it => it.groupId).map(it => it.groupId)
      return [...new Set(gids)].every(g => gids.filter(x => x === g).length >= 2)
    })(), true)
    const none = buildTemplatePage(tpl, [], measure)
    eq(`${tag}: 사진 0장 — 사진 요소 없음·빈 구간 없음`, [none.page.sections.flatMap(s => s.items).some(it => it.type === 'image'), none.page.sections.every(s => s.items.length > 0)], [false, true])
  }
  eq('문구에 다른 회사·판매처 이름 없음', /1688|쿠팡|네이버|미리캔버스|캔바|canva|amazon|shopify/i.test(JSON.stringify(CATEGORY_TEMPLATES)), false)
}

// ── 2. 새 도형 ──
{
  const added = ['diamond', 'hexagon', 'burst', 'ribbon', 'arrow', 'check', 'bubble']
  eq('도형 11개 (예전 4 + 새 7)', SHAPES, ['rect', 'ellipse', 'triangle', 'star', ...added])
  eq('도형마다 이름', SHAPES.every(s => typeof SHAPE_LABELS[s] === 'string' && SHAPE_LABELS[s]), true)
  for (const shape of added) {
    const it = normalizeShapeItem({ id: 's', type: 'shape', shape, x: 0, y: 0, w: 200, h: 120, strokeWidth: 6 })
    const d = shapePath(it)
    const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0]))
    eq(`${shape}: 닫힌 path · 숫자 모두 정상`, [d.startsWith('M'), d.endsWith('Z'), nums.every(Number.isFinite)], [true, true, true])
    // 꼭짓점(M·L·H·V 좌표)이 네모 밖으로 나가지 않는다 — 호(A)의 반지름 숫자는 빼고 본다
    const pts = [...d.replace(/A[^A-Za-z]*/g, m => ` ${m.trim().split(/[ ,]+/).slice(-2).join(' ')} `).matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0]))
    eq(`${shape}: 좌표가 네모 안`, pts.every(v => v >= -0.01 && v <= 200.01), true)
    const spec = shapePaintSpec(it)
    eq(`${shape}: 테두리 = round · 안쪽으로 줄인 path`, [spec.stroke.join, spec.d !== d], ['round', true])
    eq(`${shape}: 레이어 이름`, [isValidShapeItem(it), elementLabel(it)], [true, `도형 · ${SHAPE_LABELS[shape]}`])
  }
  eq('예전 도형 path는 그대로', [shapePath({ shape: 'rect', w: 100, h: 50 }), shapePath({ shape: 'triangle', w: 100, h: 50 })], ['M0 0H100V50H0Z', 'M50 0L100 50L0 50Z'])
  eq('넣기 종류 key 겹침 없음', new Set(ELEMENT_KINDS.map(k => k.key)).size, ELEMENT_KINDS.length)
}

// ── 3. 꾸밈 요소 (체크·번호·말풍선·구분선·화살표) + 배지 ──
{
  eq('꾸밈 묶음 4개', DECOR_KINDS.map(k => k.key), ['icon', 'bubble', 'divider', 'arrow'])
  eq('묶음마다 3개 이상', DECOR_KINDS.map(k => DECOR_PRESETS.filter(d => d.kind === k.key).length >= 3), [true, true, true, true])
  const all = [...BADGE_PRESETS, ...DECOR_PRESETS]
  eq('배지·꾸밈 key 겹침 없음 (같은 넣기 길을 쓴다)', new Set(all.map(p => p.key)).size, all.length)
  eq('이름 겹침 없음', new Set(all.map(p => p.label)).size, all.length)
  eq('글꼴은 허용 목록만', all.every(p => presetTextParts(p).every(t => isFontKey(t.fontFamily))), true)
  eq('새 배지: 빠른 출고·검수 완료·NEW·BEST·무료배송', ['same-day', 'local-check', 'new-ribbon', 'best-hex', 'free-ship-ribbon'].map(k => groupPresetByKey(k)?.kind), ['badge', 'badge', 'badge', 'badge', 'badge'])
  eq('배지 문구 (2026-09-28 해성 지시): "검수 완료"·"빠른 출고" — 예전 문구 없음', [
    groupPresetByKey('local-check').preset.parts.filter(p => p.type === 'text').map(p => p.text), groupPresetByKey('same-day').preset.parts.filter(p => p.type === 'text').map(p => p.text),
    /국내 검수|당일출고|당일 출고/.test(JSON.stringify(BADGE_PRESETS)),
  ], [['검수 완료'], ['빠른', '출고'], false])
  eq('찾기: 꾸밈 / 없는 key', [groupPresetByKey('check-circle')?.kind, decorPresetByKey('bubble-fill')?.kind, groupPresetByKey('nope')], ['decor', 'bubble', null])
  for (const p of DECOR_PRESETS) {
    const items = buildGroupItems(p, p.parts, measure)
    const valid = items.every(it => isValidShapeItem(it) || isValidTextItem(it) || isValidLineItem(it))
    // 선은 누르기 쉬운 두께(24px)라 위아래로 조금 나갈 수 있다 — 가로만 본다
    const inside = items.every(it => {
      const b = itemBounds(it)
      return b.x >= -0.5 && b.x + b.w <= p.w + 0.5 && (isValidLineItem(it) || (b.y >= -0.5 && b.y + b.h <= p.h + 0.5))
    })
    const oneLine = items.filter(isValidTextItem).every(it => wrapLines(it.text, textStyleOf(it), it.w, measure).length === it.text.split('\n').length)
    eq(`꾸밈 "${p.label}": 요소 정상·네모 안·글자 폭 안`, [items.length, valid, inside, oneLine], [p.parts.length, true, true, true])
  }
  for (const p of BADGE_PRESETS.slice(8)) {
    const items = buildGroupItems(p, p.parts, measure)
    const oneLine = items.filter(isValidTextItem).every(it => wrapLines(it.text, textStyleOf(it), it.w, measure).length === 1)
    eq(`새 배지 "${p.label}": 글자가 한 줄`, oneLine, true)
  }
  // 넣기
  const p0 = addSection(emptyPage(), { height: 600 })
  const sid = p0.sections[0].id
  const line = decorPresetByKey('divider-diamond')
  const r = addItemGroup(p0, sid, line, line.parts, measure)
  const added = r.ids.map(id => findItem(r.page, id).item)
  eq('구분선 넣기: 선·도형·선 한 그룹', [added.map(it => it.type), groupMemberIds(r.page, r.ids[0]).length], [['line', 'shape', 'line'], 3])
  eq('구분선: 선과 마름모의 세로 가운데가 같음', added.map(it => it.y + it.h / 2), [added[0].y + added[0].h / 2, added[0].y + added[0].h / 2, added[0].y + added[0].h / 2])
  const back = readPage(JSON.parse(JSON.stringify(r.page)), 'p')
  eq('readPage 뒤에도 그대로', [back.problems.length, JSON.stringify(back.page) === JSON.stringify(r.page)], [0, true])
  const chk = decorPresetByKey('check-line')
  const rc = addItemGroup(p0, sid, chk, chk.parts, measure)
  const t = rc.ids.map(id => findItem(rc.page, id).item).find(isValidTextItem)
  eq('체크 한 줄: 글자는 왼쪽 맞춤 자리(x 지정)', [t.align, t.x - findItem(rc.page, rc.ids[0]).item.x], ['left', 62])
  const one = decorPresetByKey('arrow-right')
  const ro = addItemGroup(p0, sid, one, one.parts, measure)
  eq('요소 1개짜리는 그룹 없음', [ro.ids.length, 'groupId' in findItem(ro.page, ro.ids[0]).item], [1, false])
  // 배지(예전 방식 — 글자 x 없음)는 가로 가운데 그대로
  const b = BADGE_PRESETS[0]
  const bi = buildGroupItems(b, b.parts, measure)
  eq('배지 글자는 가로 가운데 그대로', bi.filter(isValidTextItem).map(it => it.x + it.w / 2), bi.filter(isValidTextItem).map(() => b.w / 2))
}

// ── 4. 글자 스타일 묶음 ──
{
  eq('묶음 6개 (헤드라인·서브·본문·강조·가격·주의 문구)', TEXT_STYLE_GROUPS.map(g => g.label), ['헤드라인', '서브', '본문', '강조', '가격', '주의 문구'])
  eq('묶음마다 3개 이상', TEXT_STYLE_GROUPS.map(g => TEXT_STYLE_PRESETS.filter(p => styleGroupOf(p) === g.key).length >= 3), [true, true, true, true, true, true])
  eq('모든 프리셋이 묶음 안', TEXT_STYLE_PRESETS.every(p => TEXT_STYLE_GROUPS.some(g => g.key === styleGroupOf(p))), true)
  eq('글꼴·굵기 = 허용 목록에 있는 값', TEXT_STYLE_PRESETS.every(p => isFontKey(p.style.fontFamily) && fontByKey(p.style.fontFamily).weights.includes(p.style.fontWeight)), true)
  eq('예전 프리셋 10개는 값 그대로 (앞 10개)', TEXT_STYLE_PRESETS.slice(0, 10).map(p => p.key), ['outline-white', 'highlight-yellow', 'soft-shadow', 'sale-red', 'calm-note', 'premium-serif', 'navy-pill', 'heavy-black', 'mint-point', 'red-outline-pop'])
}

// ── 5. 표 틀 ──
{
  eq('표 묶음 2개', TABLE_GROUPS.map(g => g.label), ['사이즈표', '비교표·스펙표'])
  eq('묶음별 개수 (사이즈표 7 · 비교표·스펙표 4)', TABLE_GROUPS.map(g => TABLE_TEMPLATES.filter(t => tableGroupOf(t) === g.key).length), [7, 4])
  eq('key 겹침 없음', new Set(TABLE_TEMPLATES.map(t => t.key)).size, TABLE_TEMPLATES.length)
  eq('틀마다 정리해도 칸 그대로 · 폭은 페이지 안', TABLE_TEMPLATES.every(t => {
    const it = normalizeTableItem({ id: 'x', x: 0, y: 0, h: 1, ...tableFieldsOf(t) })
    return JSON.stringify(it.cells) === JSON.stringify(t.cells) && it.w <= PAGE_WIDTH
  }), true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
