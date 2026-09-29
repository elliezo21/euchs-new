// 새 템플릿 18개 테스트 — node scripts/test-studio-template-looks.mjs
// 개수·구간 수·사진 자리 수·거르기 값 · 새 글꼴·에셋 사용 · 표 없음 · 서로 다른 모양 · 적용했을 때 글자 넘침·자리 밖·사진 겹침 없음
// 글자 폭은 넉넉하게 잰다 (글꼴마다 한글·영문 글자 폭 비율 — 실제 글꼴보다 조금 넓게)
import { STUDIO_TEMPLATES, TEMPLATE_MOODS, TEMPLATE_COLORS, templateSlots, templateSlotTypes, buildTemplatePage, templateProblems } from '../src/lib/studioTemplates.js'
import { LOOK_TEMPLATES } from '../src/lib/studioTemplateLooks.js'
import { textLinesOf, itemBounds, isValidImageItem, readPage, PAGE_WIDTH } from '../src/lib/studioPage.js'
import { isValidTextItem } from '../src/lib/studioText.js'
import { isValidAssetItem, isAssetPath } from '../src/lib/studioAsset.js'
import { isSampleItem, pickSamples, sampleCategoryOf, readSamples } from '../src/lib/studioSamples.js'
import fs from 'node:fs'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const FACTOR = {
  'pretendard': [0.95, 0.62], 'noto-sans-kr': [0.95, 0.62], 'gowun-batang': [0.96, 0.62], 'noto-serif-kr': [0.96, 0.62],
  'gasoek-one': [1.1, 0.78], 'east-sea-dokdo': [0.82, 0.52], 'cinzel': [1.0, 0.84],
}
const WIDE = /[ᄀ-ᇿ㄰-㆏가-힣一-鿿　-〿＀-￯]/
function measure(s, style) {
  const [k, l] = FACTOR[style.fontFamily] ?? [1, 0.65]
  let w = 0
  for (const ch of s) w += (ch === ' ' ? 0.3 : WIDE.test(ch) ? k : l) * style.fontSize
  return w
}
const NEW_FONTS = ['pretendard', 'gasoek-one', 'gowun-batang', 'east-sea-dokdo', 'cinzel']
const manifest = JSON.parse(fs.readFileSync(new URL('../public/studio-assets/manifest.json', import.meta.url), 'utf8'))
const samples = readSamples(manifest.samples).samples
const assetFiles = new Set(manifest.items.map(i => i.file))
const photos = n => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, width: 800 + (i % 3) * 200, height: 800 + (i % 2) * 260 }))

/** 글자 요소의 실제 글자 네모 (정렬·줄 폭 반영) */
function inkBox(it) {
  const lines = textLinesOf(it, measure)
  const ls = (it.letterSpacing ?? 0) * it.fontSize
  const w = Math.max(...lines.map(l => measure(l, it) + ls * [...l].length), 1)
  const x = it.align === 'left' ? it.x : it.align === 'right' ? it.x + it.w - w : it.x + (it.w - w) / 2
  return itemBounds({ ...it, x, w })
}
const hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5

function layoutProblems(page) {
  const out = []
  for (const [si, s] of page.sections.entries()) {
    const solid = []
    for (const it of s.items) {
      const b = itemBounds(it)
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > page.width + 0.5 || b.y + b.h > s.height + 0.5) out.push(`섹션 ${si}: 자리 밖 ${it.type} ${JSON.stringify(b)}`)
      if (isValidTextItem(it)) {
        const lines = textLinesOf(it, measure)
        if (lines.length !== it.text.split('\n').length) out.push(`섹션 ${si}: 글자 넘침(줄이 늘어남) "${it.text}" ${lines.length}줄`)
        solid.push({ kind: 'text', g: it.groupId, b: inkBox(it), it })
      } else if (isValidImageItem(it) || isSampleItem(it)) solid.push({ kind: 'photo', g: it.groupId, b, it })
      else if (isValidAssetItem(it)) solid.push({ kind: 'asset', g: it.groupId, b, it })
    }
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
      const p = solid[i], q = solid[j]
      if (p.g && p.g === q.g) continue // 같은 묶음(배지·메모) 안은 겹쳐도 된다
      if (p.kind === 'text' && q.kind === 'text') { if (hit(p.b, q.b)) out.push(`섹션 ${si}: 글자끼리 겹침 "${p.it.text}" / "${q.it.text}"`); continue }
      if (hit(p.b, q.b)) out.push(`섹션 ${si}: ${p.kind}·${q.kind} 겹침 ${p.it.text ?? p.it.asset ?? p.it.slot ?? ''} / ${q.it.text ?? q.it.asset ?? ''}`)
    }
  }
  return out
}

eq('새 템플릿 18개 · 전체 38개', [LOOK_TEMPLATES.length, STUDIO_TEMPLATES.length], [18, 38])
eq('카테고리마다 6개 (의류·잡화·가방·생활용품)', ['apparel', 'bags', 'living'].map(c => LOOK_TEMPLATES.filter(t => t.category === c).length), [6, 6, 6])
eq('key 겹침 없음 (전체)', new Set(STUDIO_TEMPLATES.map(t => t.key)).size, STUDIO_TEMPLATES.length)
const moods = new Set(TEMPLATE_MOODS.map(m => m.key)), colors = new Set(TEMPLATE_COLORS.map(c => c.key))
eq('분위기·색 값이 목록 안', LOOK_TEMPLATES.filter(t => !moods.has(t.mood) || !colors.has(t.color)).map(t => t.key), [])

const usedFonts = new Set()
for (const tpl of LOOK_TEMPLATES) {
  const k = tpl.key
  eq(`${k}: 모양 검사 통과`, templateProblems(tpl), [])
  eq(`${k}: 구간 8~12 · 사진 자리 4~6`, [tpl.sections.length >= 8 && tpl.sections.length <= 12, templateSlots(tpl).length >= 4 && templateSlots(tpl).length <= 6], [true, true])
  const parts = tpl.sections.flatMap(s => s.items || [])
  const fonts = new Set(parts.filter(p => p.type === 'text').map(p => p.fontFamily))
  fonts.forEach(f => usedFonts.add(f))
  eq(`${k}: 새 글꼴 2종 이상`, NEW_FONTS.filter(f => fonts.has(f)).length >= 2, true)
  const assets = [...parts.filter(p => p.type === 'asset').map(p => p.asset), ...tpl.sections.map(s => s.bgImage?.asset).filter(Boolean)]
  eq(`${k}: 에셋 1개 이상 · 모두 목록에 있는 파일`, [assets.length > 0, assets.every(a => isAssetPath(a) && assetFiles.has(a))], [true, true])
  eq(`${k}: 표 없음`, parts.some(p => p.type === 'table'), false)
  eq(`${k}: 자리마다 예시 사진 종류`, templateSlotTypes(tpl).length, templateSlots(tpl).length)
  // 적용 — 사진 없이(예시 사진) · 사진 6장
  const smp = pickSamples(templateSlotTypes(tpl), samples, sampleCategoryOf(tpl))
  const a = buildTemplatePage(tpl, [], measure, PAGE_WIDTH, { samples: smp })
  const b = buildTemplatePage(tpl, photos(6), measure, PAGE_WIDTH, { samples: smp })
  eq(`${k}: 사진 없이 적용 = 자리마다 예시 사진`, [a.samples, a.emptySlots], [templateSlots(tpl).length, 0])
  eq(`${k}: 예시 사진으로 적용 — 글자 넘침·자리 밖·겹침 없음`, layoutProblems(a.page), [])
  eq(`${k}: 고객 사진 6장으로 적용 — 글자 넘침·자리 밖·겹침 없음`, layoutProblems(b.page), [])
  eq(`${k}: readPage 그대로 통과`, (() => { const r = readPage(JSON.parse(JSON.stringify(b.page)), 't'); return r.problems.length === 0 && JSON.stringify(r.page) === JSON.stringify(b.page) })(), true)
}
eq('새 글꼴 5종을 모두 씀', NEW_FONTS.filter(f => !usedFonts.has(f)), [])
// 서로 다르게: 구간 배경색 순서 + 첫 구간 모양이 18개 모두 다름
const sig = t => JSON.stringify([t.sections.map(s => s.bg ?? `photo:${s.photo}`), t.sections[0].items?.map(p => p.type) ?? 'photo'])
eq('18개 모두 모양이 다름 (배경 순서·첫 화면)', new Set(LOOK_TEMPLATES.map(sig)).size, 18)
eq('같은 카테고리 6개의 제목 글꼴이 3종 이상', ['apparel', 'bags', 'living'].map(c => new Set(LOOK_TEMPLATES.filter(t => t.category === c).map(t => t.sections.flatMap(s => s.items || []).find(p => p.type === 'text' && p.fontSize >= 34)?.fontFamily)).size >= 3), [true, true, true])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
