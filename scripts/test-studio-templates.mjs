// 템플릿(15단계) 테스트 — node scripts/test-studio-templates.mjs
// 슬롯 채우기(사진이 많을 때·적을 때·0장) · readPage 통과 · 내 템플릿 변환(imageId → slot) · 사진 edit를 안 건드림
import {
  STUDIO_TEMPLATES, templateByKey, templateSlots, templateProblems, buildTemplatePage, pageToTemplate, templatePreviewPage,
  templateFontList, templatePageHeight,
} from '../src/lib/studioTemplates.js'
import { fitTextItem } from '../src/lib/studioText.js'
import { readPage, buildInitialPage, checkPageSize, isValidImageItem, itemBounds, pageImageIds } from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(58)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const measure = (s, font) => [...s].length * font.fontSize * 0.5
const photo = (id, w = 800, h = 1000) => ({ id, width: w, height: h })
const photos = n => Array.from({ length: n }, (_, i) => photo(`img${i}`, 800 + i * 10, 600 + i * 50))
const imageIds = page => page.sections.flatMap(s => s.items.filter(isValidImageItem).map(it => it.imageId))
const allItems = page => page.sections.flatMap(s => s.items)
// readPage 결과가 입력과 같은지 (그대로 통과 = 모양·기본값이 이미 정리돼 있음)
function readsBack(page) {
  const { page: back, problems } = readPage(clonePage(page), 'tpl')
  return problems.length === 0 && JSON.stringify(back) === JSON.stringify(page)
}
const clonePage = p => JSON.parse(JSON.stringify(p))

// ── 1. 샘플 템플릿 모양 ──
eq('기본 템플릿 3개 + 카테고리 템플릿 (에셋 채우기)', [STUDIO_TEMPLATES.filter(t => t.category === 'common').map(t => t.key), STUDIO_TEMPLATES.length > 3], [['basic', 'point', 'size'], true])
eq('key 중복 없음', new Set(STUDIO_TEMPLATES.map(t => t.key)).size, STUDIO_TEMPLATES.length)
for (const tpl of STUDIO_TEMPLATES) {
  eq(`${tpl.key}: 모양 문제 없음`, templateProblems(tpl), [])
  eq(`${tpl.key}: 사진 자리 0부터 빈 번호 없이`, templateSlots(tpl), templateSlots(tpl).map((_, i) => i))
  eq(`${tpl.key}: 이름·설명 있음`, !!tpl.label && !!tpl.desc, true)
  eq(`${tpl.key}: 글꼴 목록 = 글자 조각 수`, templateFontList(tpl).length, tpl.sections.flatMap(s => s.items || []).filter(p => p.type === 'text').length)
}
eq('templateByKey', [templateByKey('basic')?.key, templateByKey('없음')], ['basic', null])

// ── 2. 슬롯 채우기 + readPage 통과 (사진 0장·적을 때·딱 맞을 때·많을 때) ──
for (const tpl of STUDIO_TEMPLATES) {
  const slots = templateSlots(tpl).length
  for (const n of [0, 1, slots - 1, slots, slots + 3]) {
    const imgs = photos(n)
    const r = buildTemplatePage(tpl, imgs, measure)
    const tag = `${tpl.key} 사진 ${n}장/자리 ${slots}`
    eq(`${tag}: readPage 그대로 통과`, readsBack(r.page), true)
    eq(`${tag}: 저장 크기 한도 안`, checkPageSize(r.page).ok, true)
    eq(`${tag}: 넣은 사진 수`, [r.placed, r.extra, r.emptySlots], [Math.min(n, slots), Math.max(0, n - slots), Math.max(0, slots - n)])
    // 빈 사진 요소 없음 — 모든 사진 요소는 실제 사진 id
    eq(`${tag}: 빈 사진 요소 없음`, allItems(r.page).filter(it => it.type === 'image').every(it => isValidImageItem(it) && imgs.some(p => p.id === it.imageId)), true)
    eq(`${tag}: slot 칸이 페이지에 남지 않음`, allItems(r.page).some(it => 'slot' in it || 'group' in it), false)
    eq(`${tag}: 쓸 사진이 모두 한 번 이상 들어감`, [...new Set(imageIds(r.page))].sort(), imgs.map(p => p.id).sort())
    eq(`${tag}: 구간 id·요소 id 중복 없음`, (() => {
      const ids = [...r.page.sections.map(s => s.id), ...allItems(r.page).map(it => it.id)]
      return new Set(ids).size === ids.length
    })(), true)
    eq(`${tag}: 빈 구간 없음`, r.page.sections.every(s => s.items.length > 0), true)
    eq(`${tag}: parked 비어 있음`, r.page.parked, [])
  }
}

// 사진이 많을 때 — 남는 사진은 기본 배치 규칙(사진 1장 → 구간 1개)으로 뒤에 붙는다
{
  const tpl = templateByKey('basic')
  const slots = templateSlots(tpl).length
  const imgs = photos(slots + 2)
  const r = buildTemplatePage(tpl, imgs, measure)
  const tail = r.page.sections.slice(-2)
  const want = buildInitialPage(imgs.slice(slots)).sections
  eq('많을 때: 뒤 두 구간 = 기본 배치와 같은 모양(높이·사진·자리)', tail.map(s => [s.height, s.bg, s.items.map(it => [it.imageId, it.x, it.y, it.w, it.h])]),
    want.map(s => [s.height, s.bg, s.items.map(it => [it.imageId, it.x, it.y, it.w, it.h])]))
  eq('많을 때: 자리 순서 = 목록 순서 (0번 자리 = 첫 사진)', r.page.sections[0].items[0].imageId, 'img0')
}
// 사진이 적을 때 — 빈 꽉 찬 구간은 구간째, 자리 구간의 사진 요소만 빠짐
{
  const tpl = templateByKey('point')
  const r = buildTemplatePage(tpl, photos(2), measure)
  const withText = tpl.sections.filter(s => !Number.isInteger(s.photo)).length
  eq('적을 때(point, 2장): 글자 구간은 남고 빈 대표 사진 구간(3번)은 빠짐', r.page.sections.length, withText + 1)
  const p2 = r.page.sections.find(s => s.items.some(it => it.type === 'text' && it.text === '두 번째 장점을 적어 주세요'))
  eq('적을 때: POINT 2 구간은 사진 요소만 빠지고 글자·배지는 남음', p2.items.map(it => it.type), ['shape', 'text', 'text'])
  const size = buildTemplatePage(templateByKey('size'), photos(1), measure)
  eq('적을 때(size, 1장): 사진 둘 나란히 구간은 구간째 빠짐', size.page.sections.some(s => s.items.length && s.items.every(it => it.type === 'image') && s.items[0].w === 360), false)
}
// 0장 — 글자·도형·표만
{
  for (const tpl of STUDIO_TEMPLATES) {
    const r = buildTemplatePage(tpl, [], measure)
    eq(`${tpl.key} 0장: 사진 요소 없음·구간 1개 이상`, [imageIds(r.page).length, r.page.sections.length > 0], [0, true])
  }
}
// 크기를 모르는 사진은 넣지 않는다 (기본 배치와 같은 규칙)
{
  const warn = console.error; console.error = () => {}
  const r = buildTemplatePage(templateByKey('basic'), [photo('a'), { id: 'nosize', width: null, height: null }, photo('b')], measure)
  console.error = warn
  eq('크기 모르는 사진 건너뜀 → 다음 사진이 다음 자리', imageIds(r.page), ['a', 'b'])
}

// ── 3. 그룹·글자 높이 ──
{
  const r = buildTemplatePage(templateByKey('point'), photos(4), measure)
  const grouped = allItems(r.page).filter(it => it.groupId)
  const gids = new Set(grouped.map(it => it.groupId))
  eq('point: 배지 그룹 3개(BEST·POINT 1·POINT 2), 각 2개', [gids.size, [...gids].map(g => grouped.filter(it => it.groupId === g).length)], [3, [2, 2, 2]])
  const again = buildTemplatePage(templateByKey('point'), photos(4), measure)
  eq('다시 적용하면 새 groupId (앞 적용과 안 섞임)', allItems(again.page).filter(it => it.groupId).some(it => gids.has(it.groupId)), false)
  const txt = allItems(r.page).filter(it => it.type === 'text')
  eq('글자 높이 = 글자에 맞춘 값 (fitTextItem 그대로)', txt.every(it => fitTextItem(it, measure) === it), true)
}
// 샘플 템플릿: 요소가 구간 안에 들어감 (정사각 사진 기준 — 가짜 측정)
for (const tpl of STUDIO_TEMPLATES) {
  const r = buildTemplatePage(tpl, photos(templateSlots(tpl).length), measure)
  const out = []
  for (const s of r.page.sections) for (const it of s.items) {
    const b = itemBounds(it)
    if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > r.page.width + 0.5 || b.y + b.h > s.height + 0.5) out.push(`${it.type}:${it.text ?? ''}`)
  }
  eq(`${tpl.key}: 모든 요소가 구간 안`, out, [])
}

// ── 4. 사진 edit를 안 건드림 (적용은 id·width·height만 읽는다) ──
{
  const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o) }
  const rows = photos(5).map((p, i) => deepFreeze({
    ...p, ingest_status: 'done', included: true, edit_version: 3 + i, final_rendered_version: 2,
    edit: { v: 1, layers: [{ id: `l${i}`, type: 'cover', x: 1, y: 2, w: 3, h: 4 }], look: { filter: 'warm' }, crop: { x: 0, y: 0, w: 10, h: 10 }, cuts: [], erase_v: 2 },
  }))
  const before = JSON.stringify(rows)
  let threw = false
  try { for (const tpl of STUDIO_TEMPLATES) buildTemplatePage(tpl, rows, measure) } catch (e) { threw = e.message }
  eq('사진 행이 얼어 있어도 오류 없음 (쓰지 않음)', threw, false)
  eq('적용 뒤 사진 행(edit 포함) 그대로', JSON.stringify(rows), before)
  const r = buildTemplatePage(templateByKey('basic'), rows, measure)
  eq('페이지에 edit·layers·look·crop 칸이 들어가지 않음', JSON.stringify(r.page).match(/"(edit|layers|look|crop|cuts|erase_v)"/), null)
}

// ── 5. 모양이 어긋난 템플릿 ──
{
  const warn = console.error; console.error = () => {}
  eq('sections 없음 → null', buildTemplatePage({}, photos(1), measure), null)
  eq('사진 자리 번호 없는 사진 조각 → null', buildTemplatePage({ sections: [{ height: 100, bg: '#ffffff', items: [{ type: 'image', x: 0, y: 0, w: 10, h: 10 }] }] }, photos(1), measure), null)
  eq('구간 0개 → null', buildTemplatePage({ sections: [] }, photos(1), measure), null)
  console.error = warn
  eq('모르는 요소는 보존', buildTemplatePage({ sections: [{ height: 100, bg: '#ffffff', items: [{ type: 'sticker', x: 1, y: 2, w: 3, h: 4, foo: 1 }] }] }, [], measure).page.sections[0].items.map(it => [it.type, it.foo]), [['sticker', 1]])
}

// ── 6. 내 템플릿 변환 (imageId → slot) ──
{
  const base = buildTemplatePage(templateByKey('point'), photos(6), measure).page
  const tpl = pageToTemplate(base, '  내 틀  ')
  eq('이름 앞뒤 공백 정리', tpl.name, '내 틀')
  eq('변환 결과 모양 문제 없음', templateProblems(tpl), [])
  eq('imageId·id·groupId 없음', /"(imageId|id|groupId)"/.test(JSON.stringify(tpl)), false)
  eq('slot 번호 = 페이지 위에서부터 사진 순서', templateSlots(tpl), pageImageIds(base).map((_, i) => i))
  eq('꽉 찬 사진 구간은 { photo }로', tpl.sections.filter(s => Number.isInteger(s.photo)).length, base.sections.filter(s => s.items.length === 1 && s.items[0].type === 'image' && s.items[0].w === 780).length)
  eq('배지 그룹은 group 이름으로 유지', tpl.sections.flatMap(s => s.items || []).filter(p => p.group).length, 6)
  // 다시 적용하면 같은 사진이면 같은 페이지 모양 (id만 다름)
  const back = buildTemplatePage(tpl, photos(6), measure).page
  const shape = p => p.sections.map(s => [s.height, s.bg, s.items.map(it => { const { id, groupId, ...r } = it; return [Object.fromEntries(Object.entries(r).sort()), !!groupId] })])
  eq('내 템플릿 → 같은 사진으로 적용 = 원래 페이지와 같은 모양', shape(back), shape(base))
  eq('다시 적용한 페이지도 readPage 통과', readsBack(back), true)
  // 같은 사진을 두 번 쓴 페이지 → 같은 slot
  const twice = clonePage(base)
  const firstSec = twice.sections.find(s => s.items.some(it => it.type === 'image' && it.w === 660))
  firstSec.items.find(it => it.type === 'image').imageId = 'img0'
  const t2 = pageToTemplate(twice, 'x')
  eq('같은 사진 두 번 = 같은 slot 번호', t2.sections.flatMap(s => Number.isInteger(s.photo) ? [s.photo] : (s.items || []).filter(p => p.type === 'image').map(p => p.slot)).filter(n => n === 0).length, 2)
  // 다른 작업(다른 사진)에 쓰기
  const other = buildTemplatePage(tpl, [photo('x1'), photo('x2')], measure).page
  eq('다른 작업 사진 2장으로 적용 → 그 사진만, readPage 통과', [[...new Set(imageIds(other))], readsBack(other)], [['x1', 'x2'], true])
  // 꾸민 사진(회전·테두리)·잠금은 { photo }로 줄이지 않고 그대로 담는다
  const styled = clonePage(base)
  const full = styled.sections.find(s => s.items.length === 1 && s.items[0].type === 'image' && s.items[0].w === 780)
  full.items[0].borderWidth = 6
  full.items[0].locked = true
  const t3 = pageToTemplate(styled, 'y')
  const kept = t3.sections.flatMap(s => s.items || []).find(p => p.type === 'image' && p.borderWidth === 6)
  eq('꾸민 꽉 찬 사진은 자리 요소로(테두리·잠금 유지)', [!!kept, kept?.locked, Number.isInteger(kept?.slot)], [true, true, true])
  eq('이름 50자로 자름', pageToTemplate(base, 'ㄱ'.repeat(80)).name.length, 50)
}

// ── 7. 미리보기 ──
{
  for (const tpl of STUDIO_TEMPLATES) {
    const p = templatePreviewPage(tpl, [], measure)
    eq(`${tpl.key} 미리보기(사진 없음): 자리마다 가짜 사진`, imageIds(p).length >= templateSlots(tpl).length, true)
    eq(`${tpl.key} 미리보기 높이 양수`, templatePageHeight(p) > 0, true)
  }
  const p = templatePreviewPage(templateByKey('basic'), photos(9), measure)
  eq('미리보기(사진 많음): 남는 사진은 붙이지 않음', imageIds(p).length, templateSlots(templateByKey('basic')).length)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
