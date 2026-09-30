// 촬영 세트 템플릿 테스트 — node scripts/test-studio-template-shoots.mjs
// 세트 사진 4장을 한 번씩 · 정해 둔 예시 사진(samplePins)이 manifest에 있고 그 템플릿만 씀 · 첫 화면 + 섹션 5개 이상 · 카테고리별 섹션 구성
// · 사이즈표를 넣지 않음(자리만) · 앞 60개 템플릿 순서 그대로 · 분위기·구도 골고루 · 금지 문구 없음
// · 3차 패션 15벌: 앞 79개 뒤에 이어 붙음 · 새 첫 화면 구도만 · 소재 안내(fabric)·사이즈 자리·세탁/관리 · 니트는 사진 3장(착용 사진 뺌)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_TEMPLATES, SHOOT_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_MOODS, templateSlots, templateSlotTypes, assignTemplateSamples, buildTemplatePage, coverSlotIndexes } from '../src/lib/studioTemplates.js'
import { SHOOT_KEYS, SHOOT_KEY_BATCHES, SHOOT_HERO_COMPS } from '../src/lib/studioTemplateShoots.js'
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
const NEW3 = SHOOT_KEY_BATCHES[1]
const OLD13 = SHOOT_HERO_COMPS.slice(0, 13)
eq('촬영 세트 34개 (1·2차 19 + 3차 15) · 목록 맨 뒤에 이어 붙음 (앞 60개 그대로)', [SHOOT_TEMPLATES.length, SHOOT_KEY_BATCHES.map(b => b.length), STUDIO_TEMPLATES.slice(60).every(t => SHOOT_KEYS.includes(t.key))], [34, [19, 15], true])
eq('3차 15개 = 앞 79개 뒤 (1·2차 19개 뒤에 이어 붙음)', STUDIO_TEMPLATES.slice(79).map(t => t.key).sort(), [...NEW3].sort())
eq('3차 = 의류 10 · 잡화 5', ['apparel', 'bags'].map(c => NEW3.filter(k => STUDIO_TEMPLATES.find(t => t.key === k).category === c).length), [10, 5])
eq('3차 첫 화면 = 새 구도 9가지만 (1·2차 13구도 안 씀)', [...new Set(SHOOT_TEMPLATES.filter(t => NEW3.includes(t.key)).map(t => t.heroComp))].filter(c => OLD13.includes(c)), [])
eq('카테고리가 목록에 있음 (패션 = 의류·잡화·가방 칩)', SHOOT_TEMPLATES.filter(t => !TEMPLATE_CATEGORIES.some(c => c.key === t.category)).map(t => t.key), [])
eq('새 칩: 식품·건강식품·선물세트·유아·캠핑·인테리어', ['food', 'health', 'gift', 'baby', 'camping', 'interior'].map(k => TEMPLATE_CATEGORIES.find(c => c.key === k)?.label), ['식품', '건강식품', '선물세트', '유아', '캠핑', '인테리어'])
eq('분위기 5가지 모두 3개 이상', TEMPLATE_MOODS.map(m => SHOOT_TEMPLATES.filter(t => t.mood === m.key).length >= 3), TEMPLATE_MOODS.map(() => true))
eq('첫 화면 구도 22가지 모두 쓰고 한 구도는 2번까지', (() => {
  const n = new Map(); SHOOT_TEMPLATES.forEach(t => { const c = t.heroComp; n.set(c, (n.get(c) ?? 0) + 1) })
  return [SHOOT_HERO_COMPS.every(c => n.has(c)), Math.max(...n.values()) <= 2]
})(), [true, true])

// ── 2. 템플릿마다 ──
const assigned = assignTemplateSamples(samples)
for (const t of SHOOT_TEMPLATES) {
  const k = t.key
  const n = k === 'shoot-cable-knit' ? 3 : 4 // 니트는 착용 사진(knit_01_4)을 쓰지 않는다
  const ns = [...Array(n).keys()]
  eq(`${k}: 사진 자리 ${n}개 · 자리마다 한 번씩`, [templateSlots(t), t.sections.flatMap(s => (s.items || []).filter(p => p.type === 'image').map(p => p.slot)).sort()], [ns, ns])
  eq(`${k}: 첫 화면에 대표 사진(0) · 섹션 5개 이상`, [coverSlotIndexes(t), t.sections.length - 1 >= 5], [[0], true])
  eq(`${k}: 정해 둔 예시 사진 ${n}장 = manifest에 있음 · 서로 다름`, [t.samplePins.length, t.samplePins.every(id => byId.has(id)), new Set(t.samplePins).size], [n, true, n])
  eq(`${k}: 대표 자리 = 제품 사진`, byId.get(t.samplePins[0])?.type, 'product')
  eq(`${k}: 나눔 결과 = 정해 둔 사진 그대로`, assigned.get(k).map(s => s?.id), t.samplePins)
  eq(`${k}: 자리 종류 = 사진 종류`, templateSlotTypes(t).map((ty, i) => ty === byId.get(t.samplePins[i]).type || (ty === 'scene' && byId.get(t.samplePins[i]).type === 'hand') || (ty === 'hand' && byId.get(t.samplePins[i]).type === 'scene')), ns.map(() => true))
  eq(`${k}: 표(사이즈표 등) 요소 없음`, t.sections.flatMap(s => s.items || []).filter(p => p.type === 'table').length, 0)
  const need = NEW3.includes(k) ? ['zoom', ...(n === 4 ? ['story'] : []), 'fabric', 'sizeSlot', 'care', 'contents']
    : FASHION.includes(t.category) ? ['zoom', 'story', 'sizeSlot', 'care', 'contents']
    : FOODISH.includes(t.category) ? ['ingredient', 'storage', 'contents'] : ['story', 'points', 'contents']
  eq(`${k}: 카테고리 섹션 (${need.join('·')})`, need.filter(x => !kinds(t).includes(x)), [])
  const r = buildTemplatePage(t, [], measure, PAGE_WIDTH, { samples: assigned.get(k) })
  eq(`${k}: 사진 없이 적용 = 예시 사진 ${n}장 · readPage 통과`, [r.samples, r.emptySlots, readPage(JSON.parse(JSON.stringify(r.page)), 't').problems], [n, 0, []])
  eq(`${k}: 예시 사진 = 이 세트 사진`, r.page.sections.flatMap(s => s.items).filter(isSampleItem).map(it => it.asset).sort(), t.samplePins.map(id => byId.get(id).file).sort())
}

// ── 3. 사진은 이 템플릿만 · 문구 ──
{
  const pins = new Set(SHOOT_TEMPLATES.flatMap(t => t.samplePins))
  const others = STUDIO_TEMPLATES.filter(t => !SHOOT_KEYS.includes(t.key)).flatMap(t => assigned.get(t.key).map(s => s?.id)).filter(id => pins.has(id))
  eq('촬영 세트 사진을 다른 템플릿이 쓰지 않음', others, [])
  eq('세트 사진 135장이 모두 어느 템플릿엔가 (1·2차 76 + 3차 59)', pins.size, 135)
  eq('니트 착용 사진(앞뒤가 바뀐 사진)은 넣지 않음 — 니트 세트 사진 3장', samples.filter(s => s.category === 'apparel' && /_11.webp$/.test(s.file)).length, 3)
  const text = JSON.stringify(SHOOT_TEMPLATES)
  eq('문구에 "중국어"·"준비 중"·다른 회사 이름 없음', /중국어|준비 ?중|1688|쿠팡|네이버|미리캔버스|캔바|canva|망고보드/i.test(text), false)
  eq('사이즈 자리 안내 = [요소] → [사이즈표]', /\[요소\] → \[사이즈표\]/.test(text), true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
