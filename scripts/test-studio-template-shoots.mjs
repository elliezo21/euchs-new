// 촬영 세트 템플릿 테스트 — node scripts/test-studio-template-shoots.mjs
// 세트 사진 4장을 한 번씩 · 정해 둔 예시 사진(samplePins)이 manifest에 있고 그 템플릿만 씀 · 첫 화면 + 섹션 5개 이상 · 카테고리별 섹션 구성
// · 사이즈표를 넣지 않음(자리만) · 앞 60개 템플릿 순서 그대로 · 분위기·구도 골고루 · 금지 문구 없음
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_TEMPLATES, SHOOT_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_MOODS, templateSlots, templateSlotTypes, assignTemplateSamples, buildTemplatePage, coverSlotIndexes } from '../src/lib/studioTemplates.js'
import { SHOOT_KEYS, SHOOT_HERO_COMPS } from '../src/lib/studioTemplateShoots.js'
import { readSamples, isSampleItem } from '../src/lib/studioSamples.js'
import { readPage, PAGE_WIDTH } from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..', 'public', 'studio-assets')
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))
const samples = readSamples(manifest.samples).samples
const byId = new Map(samples.map(s => [s.id, s]))
const measure = (s, st) => [...s].length * st.fontSize * 0.9
const kinds = t => t.sectionStyles.map(s => s.split(':')[0])

const FASHION = ['bags', 'apparel']
const FOODISH = ['food', 'health', 'gift']
const LIVINGISH = ['baby', 'camping', 'interior']

// ── 1. 목록 ──
eq('촬영 세트 10개 (1차 패션·잡화) · 목록 맨 뒤에 이어 붙음 (앞 60개 그대로)', [SHOOT_TEMPLATES.length, STUDIO_TEMPLATES.slice(60).every(t => SHOOT_KEYS.includes(t.key))], [10, true])
eq('카테고리가 목록에 있음 (패션 = 의류·잡화·가방 칩)', SHOOT_TEMPLATES.filter(t => !TEMPLATE_CATEGORIES.some(c => c.key === t.category)).map(t => t.key), [])
eq('패션·잡화 = 기존 칩(의류·잡화·가방)', [...new Set(SHOOT_TEMPLATES.map(t => t.category))].sort(), ['apparel', 'bags'])
eq('분위기 5가지 모두 1개 이상', TEMPLATE_MOODS.map(m => SHOOT_TEMPLATES.some(t => t.mood === m.key)), TEMPLATE_MOODS.map(() => true))
eq('첫 화면 구도 9가지 모두 쓰고 한 구도는 2번까지', (() => {
  const n = new Map(); SHOOT_TEMPLATES.forEach(t => { const c = t.heroComp; n.set(c, (n.get(c) ?? 0) + 1) })
  return [SHOOT_HERO_COMPS.every(c => n.has(c)), Math.max(...n.values()) <= 2]
})(), [true, true])

// ── 2. 템플릿마다 ──
const assigned = assignTemplateSamples(samples)
for (const t of SHOOT_TEMPLATES) {
  const k = t.key
  eq(`${k}: 사진 자리 4개(0~3) · 자리마다 한 번씩`, [templateSlots(t), t.sections.flatMap(s => (s.items || []).filter(p => p.type === 'image').map(p => p.slot)).sort()], [[0, 1, 2, 3], [0, 1, 2, 3]])
  eq(`${k}: 첫 화면에 대표 사진(0) · 섹션 5개 이상`, [coverSlotIndexes(t), t.sections.length - 1 >= 5], [[0], true])
  eq(`${k}: 정해 둔 예시 사진 4장 = manifest에 있음 · 서로 다름`, [t.samplePins.length, t.samplePins.every(id => byId.has(id)), new Set(t.samplePins).size], [4, true, 4])
  eq(`${k}: 대표 자리 = 제품 사진`, byId.get(t.samplePins[0])?.type, 'product')
  eq(`${k}: 나눔 결과 = 정해 둔 사진 그대로`, assigned.get(k).map(s => s?.id), t.samplePins)
  eq(`${k}: 자리 종류 = 사진 종류`, templateSlotTypes(t).map((ty, i) => ty === byId.get(t.samplePins[i]).type || (ty === 'scene' && byId.get(t.samplePins[i]).type === 'hand') || (ty === 'hand' && byId.get(t.samplePins[i]).type === 'scene')), [true, true, true, true])
  eq(`${k}: 표(사이즈표 등) 요소 없음`, t.sections.flatMap(s => s.items || []).filter(p => p.type === 'table').length, 0)
  const need = FASHION.includes(t.category) ? ['zoom', 'story', 'sizeSlot', 'care', 'contents']
    : FOODISH.includes(t.category) ? ['ingredient', 'storage', 'contents'] : ['story', 'points', 'contents']
  eq(`${k}: 카테고리 섹션 (${need.join('·')})`, need.filter(x => !kinds(t).includes(x)), [])
  const r = buildTemplatePage(t, [], measure, PAGE_WIDTH, { samples: assigned.get(k) })
  eq(`${k}: 사진 없이 적용 = 예시 사진 4장 · readPage 통과`, [r.samples, r.emptySlots, readPage(JSON.parse(JSON.stringify(r.page)), 't').problems], [4, 0, []])
  eq(`${k}: 예시 사진 = 이 세트 사진`, r.page.sections.flatMap(s => s.items).filter(isSampleItem).map(it => it.asset).sort(), t.samplePins.map(id => byId.get(id).file).sort())
}

// ── 3. 사진은 이 템플릿만 · 문구 ──
{
  const pins = new Set(SHOOT_TEMPLATES.flatMap(t => t.samplePins))
  const others = STUDIO_TEMPLATES.filter(t => !SHOOT_KEYS.includes(t.key)).flatMap(t => assigned.get(t.key).map(s => s?.id)).filter(id => pins.has(id))
  eq('촬영 세트 사진을 다른 템플릿이 쓰지 않음', others, [])
  eq('세트 사진 40장이 모두 어느 템플릿엔가', pins.size, 40)
  const text = JSON.stringify(SHOOT_TEMPLATES)
  eq('문구에 "중국어"·"준비 중"·다른 회사 이름 없음', /중국어|준비 ?중|1688|쿠팡|네이버|미리캔버스|캔바|canva|망고보드/i.test(text), false)
  eq('사이즈 자리 안내 = [요소] → [사이즈표]', /\[요소\] → \[사이즈표\]/.test(text), true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
