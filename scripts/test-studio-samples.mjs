// 예시 사진 테스트 — node scripts/test-studio-samples.mjs
// 파일·목록(54장) · 자리 종류·고르기 · 템플릿 적용(고객 사진 먼저, 남는 자리 = 예시 사진) · 내 사진으로 바꾸기 · 내 템플릿 변환 · 편집기 확인창·표시
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  parseSampleName, readSamples, pickSamples, sampleCategoryOf, defaultSlotType, isSampleItem, sampleItemsOf, sampleThumbPath,
  SAMPLE_CATEGORIES, SAMPLE_TYPES, SAMPLE_THUMB_SIZE,
} from '../src/lib/studioSamples.js'
import { readAssetManifest, isValidAssetItem } from '../src/lib/studioAsset.js'
import { STUDIO_TEMPLATES, templateByKey, templateSlots, templateSlotTypes, buildTemplatePage, pageToTemplate, templatePreviewPage } from '../src/lib/studioTemplates.js'
import { readPage, replaceSampleWithImage, isValidImageItem, findItem, PAGE_WIDTH } from '../src/lib/studioPage.js'
import { imageSize } from './build-studio-assets-manifest.mjs'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..', 'public', 'studio-assets')
const read = p => fs.readFileSync(path.join(HERE, '..', p), 'utf8')
const measure = (s, font) => [...s].length * font.fontSize * 0.5
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))
const manifest = readAssetManifest(raw)
const samples = manifest.samples

// ── 1. 파일·목록 ──
{
  eq('manifest 문제 없음', manifest.problems, [])
  eq('예시 사진 259장 (1차 54 + 2차 70 + 촬영 세트 76 + 3차 패션 59) · kind sample', [samples.length, samples.every(s => s.kind === 'sample')], [259, true])
  const HAVE = ['apparel', 'bag', 'living'] // 1차 (18장씩)
  // 촬영 세트 (studioTemplateShoots — 한 벌 4장, 이름 끝 번호 = 세트 번호: 의류 07~09 · 가방 07~14 · 식품 09~11 · 건강식품·선물 09 · 유아·캠핑·인테리어 01)
  const SET_NO = { apparel: [7, 19], bag: [7, 19], food: [9, 11], health: [9, 9], gift: [9, 9], baby: [1, 1], camping: [1, 1], interior: [1, 1] }
  const isSet = s => { const r = SET_NO[s.category]; const n = Number(parseSampleName(s.file.slice(8, -5))?.no); return !!r && n >= r[0] && n <= r[1] }
  eq('카테고리별 장수 — 1차 18장씩 · 2차 8장씩(전자 6 — 브랜드 닮은 2장 뺌) · 촬영 세트 4장씩', SAMPLE_CATEGORIES.map(c => samples.filter(s => s.category === c).length), [69, 70, 18, 8, 20, 12, 8, 6, 8, 8, 8, 12, 4, 4, 4])
  eq('촬영 세트 135장 = 세트 34개 × 4장 − 1 (니트 착용 사진은 뺌)', [samples.filter(isSet).length, new Set(samples.filter(isSet).map(s => `${s.category}-${parseSampleName(s.file.slice(8, -5)).no}`)).size], [135, 34])
  eq('2차 사진: 원본 크기를 긴 변 1044로 줄임 (1차와 비슷한 무게)', samples.filter(s => !HAVE.includes(s.category) && !isSet(s)).every(s => Math.max(s.w, s.h) === 1044), true)
  eq('촬영 세트: 3:4 · 긴 변 1044 이하 (자국·글자를 잘라 낸 3장은 더 작음)', samples.filter(isSet).filter(s => Math.abs(s.h / s.w - 4 / 3) > 0.01 || Math.max(s.w, s.h) > 1044).map(s => s.id), [])
  eq('브랜드 닮은 두 장은 넣지 않음', samples.some(s => /wireless-earbuds|earbuds-in-hand/.test(s.file)), false)
  eq('종류 (의류·가방 = 제품·연출·확대 / 생활 = 제품·연출·손)', HAVE.map(c => [...new Set(samples.filter(s => s.category === c).map(s => s.type))].sort()), [['detail', 'product', 'scene'], ['detail', 'product', 'scene'], ['hand', 'product', 'scene']])
  eq('에셋 목록(items)에는 예시 사진 없음', manifest.items.some(i => i.file.startsWith('samples/')), false)
  eq('webp 파일·크기·비율이 목록과 같음', samples.filter(s => {
    const f = path.join(ROOT, s.file)
    if (!fs.existsSync(f) || !s.file.endsWith('.webp')) return true
    const z = imageSize(fs.readFileSync(f), 'webp')
    return !z || z.w !== s.w || z.h !== s.h || Math.abs(s.ratio - s.h / s.w) > 0.001
  }).map(s => s.file), [])
  eq('썸네일: samples/thumbs, 긴 변 400', samples.filter(s => {
    const f = path.join(ROOT, s.thumb || '')
    if (s.thumb !== sampleThumbPath(s.file) || !fs.existsSync(f)) return true
    const z = imageSize(fs.readFileSync(f), 'webp')
    return !z || Math.max(z.w, z.h) !== SAMPLE_THUMB_SIZE
  }).map(s => s.file), [])
  eq('원본 png는 저장소에 없음', fs.readdirSync(path.join(ROOT, 'samples')).some(n => n.endsWith('.png')), false)
  eq('목록이 폴더와 같음 (studio:assets --check)', (() => {
    try { execFileSync(process.execPath, [path.join(HERE, 'build-studio-assets-manifest.mjs'), '--check'], { stdio: 'pipe' }); return true } catch { return false }
  })(), true)
  eq('이름 읽기', [parseSampleName('euchs-sample_bag_detail_zipper-pull_06'), parseSampleName('euchs-sample_shoe_product_x_01')], [{ category: 'bag', type: 'detail', slug: 'zipper-pull', no: '06' }, null])
  eq('이상한 항목은 빼고 사유', readSamples([{ id: 'a', kind: 'sample', category: 'apparel', type: 'product', file: '../x.webp', w: 1, h: 1 }, { id: 'b', kind: 'sample', category: 'shoe', type: 'product', file: 'samples/b.webp', w: 1, h: 1 }]).problems.length, 2)
}

// ── 2. 자리 종류·고르기 ──
{
  eq('기본 종류: 첫 자리 = 제품, 다음 연출·확대·제품', [0, 1, 2, 3, 4].map(defaultSlotType), ['product', 'scene', 'detail', 'product', 'scene'])
  eq('템플릿 카테고리 → 예시 사진 카테고리 (사진이 있는 가장 가까운 것)', ['apparel-look', 'bags-daily', 'living-basic', 'kitchen-bold', 'basic', 'beauty-mood', 'toys-play', 'event-review'].map(k => sampleCategoryOf(templateByKey(k), samples)), ['apparel', 'bag', 'living', 'kitchen', 'food', 'beauty', 'toy', 'sports'])
  eq('선물 템플릿(사은품·명절 선물세트) = 명절 선물 사진부터', ['event-free-gift', 'event-gift-set'].map(k => sampleCategoryOf(templateByKey(k), samples)), ['gift', 'gift'])
  eq('새 이름 읽기 (뷰티·전자·완구 …) · 모르는 이름은 null', [parseSampleName('euchs-sample_beauty_product_cream-jar_01')?.category, parseSampleName('euchs-sample_digital_scene_desk_02')?.category, parseSampleName('euchs-sample_shoe_product_x_01')], ['beauty', 'digital', null])
  const pick = pickSamples(['product', 'product', 'detail', 'scene'], samples, 'living')
  eq('같은 종류 두 자리 = 다른 사진 · 생활 확대 → 손 연출로', [pick[0].id !== pick[1].id, pick.map(s => s.type)], [true, ['product', 'product', 'hand', 'scene']])
  eq('사진이 없는 카테고리 = null', pickSamples(['product'], samples, 'none'), [null])
  eq('모든 템플릿: 자리마다 종류가 있음', STUDIO_TEMPLATES.every(t => templateSlotTypes(t).length === templateSlots(t).length && templateSlotTypes(t).every(x => SAMPLE_TYPES.includes(x))), true)
}

// ── 3. 템플릿 적용 ──
{
  const tpl = templateByKey('point')
  const smp = pickSamples(templateSlotTypes(tpl), samples, sampleCategoryOf(tpl))
  const none = buildTemplatePage(tpl, [], measure, PAGE_WIDTH, { samples: smp })
  const all = none.page.sections.flatMap(s => s.items)
  eq('사진 0장: 자리마다 예시 사진 · 빠진 자리 없음', [none.samples, none.emptySlots, all.filter(isSampleItem).length], [templateSlots(tpl).length, 0, templateSlots(tpl).length])
  eq('예시 사진 요소 = 에셋·채움·표시·이름', all.filter(isSampleItem).every(it => isValidAssetItem(it) && it.fit === 'cover' && it.sample === true && it.label === '예시 사진'), true)
  eq('사진 자리 꾸미기(모서리) 유지', all.filter(isSampleItem).some(it => it.radius === 16), true)
  eq('readPage를 그대로 통과 (sample 칸 유지)', (() => { const r = readPage(JSON.parse(JSON.stringify(none.page)), 't'); return r.problems.length === 0 && sampleItemsOf(r.page).length === none.samples })(), true)
  const two = buildTemplatePage(tpl, [{ id: 'p0', width: 800, height: 800 }, { id: 'p1', width: 800, height: 600 }], measure, PAGE_WIDTH, { samples: smp })
  eq('고객 사진 2장: 앞 두 자리 = 고객 사진, 나머지 = 예시 사진', [two.placed, two.samples, two.page.sections.flatMap(s => s.items).filter(isValidImageItem).map(it => it.imageId)], [2, templateSlots(tpl).length - 2, ['p0', 'p1']])
  eq('예시 사진 없이 부르면 예전처럼 빈 자리를 뺌', buildTemplatePage(tpl, [], measure).samples, 0)
  eq('갤러리 그림 문서 = 예시 사진으로 적용한 모양', JSON.stringify(templatePreviewPage(tpl, [], measure, smp).sections.map(s => s.items.map(i => i.asset || i.type))), JSON.stringify(none.page.sections.map(s => s.items.map(i => i.asset || i.type))))
  const hidden = { ...none.page, sections: none.page.sections.map((s, i) => (i === 1 ? { ...s, items: s.items.map(it => (isSampleItem(it) ? { ...it, hidden: true } : it)) } : s)) }
  eq('숨긴 예시 사진은 세지 않음 (내보내지 않으니)', sampleItemsOf(hidden).length < none.samples, true)

  // 내 사진으로 바꾸기
  const first = sampleItemsOf(none.page).find(x => x.item.radius === 16).item
  const rep = replaceSampleWithImage(none.page, first.id, 'myphoto')
  const it = findItem(rep, first.id).item
  eq('내 사진으로 바꾸기: 사진 요소 · 자리·크기·모서리 그대로', [isValidImageItem(it), it.imageId, it.x, it.y, it.w, it.h, it.radius, 'asset' in it, 'sample' in it], [true, 'myphoto', first.x, first.y, first.w, first.h, 16, false, false])
  eq('예시 사진이 아니면 그대로', [replaceSampleWithImage(rep, first.id, 'x') === rep, replaceSampleWithImage(none.page, first.id, '') === none.page], [true, true])

  // 내 템플릿 변환: 예시 사진 = 사진 자리
  const back = pageToTemplate(none.page, '내 것')
  eq('내 템플릿: 예시 사진은 사진 자리로', [back.sections.flatMap(s => s.items || []).some(p => p.type === 'asset' && p.sample), templateSlots(back).length], [false, none.samples])
}

// ── 4. 화면 연결 ──
{
  const editor = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: [다운로드]·[작업 저장] 전에 확인 (guardSamples)', [/function openExport\(\) \{[\s\S]{0,300}guardSamples\(/.test(editor), /function openSave\(\) \{[\s\S]{0,300}guardSamples\(/.test(editor)], [true, true])
  eq('확인창 문구 "예시 사진이 n장 남아 있어요" · [예시 사진 보기]·[그대로 계속]', [/`예시 사진이 \$\{sampleAsk\.n\}장 남아 있어요`/.test(editor), /data-sample-ask-show/.test(editor), /data-sample-ask-continue/.test(editor)], [true, true, true])
  eq('편집기 적용: 예시 사진으로 남은 자리 채움', /buildTemplatePage\(tpl, templateImages\.value, textMeasure, PAGE_WIDTH, \{ samples \}\)/.test(editor), true)
  eq('예시 사진 → 사진 바꾸기 창 (replaceSampleWithImage)', /replaceSampleWithImage\(page\.value, sample\.id, imageId\)/.test(editor), true)
  const pv = read('src/components/studio/StudioPageView.vue')
  eq('페이지: "예시" 표시 (편집 화면에만)', /v-if="isSampleItem\(it\) && !it\.hidden" class="st-sample-badge"[^>]*>예시</.test(pv), true)
  const ex = read('src/lib/studioExport.js')
  eq('내보내기: 예시 사진은 사진과 같은 그리기(drawPhoto — 채움·꾸미기)', /isValidAssetItem\(it\) && isSampleItem\(it\)\) \{ const img = env\.assets\?\.get\(it\.asset\); if \(img\) drawPhoto/.test(ex), true)
  const ui = await import('../src/lib/studioCanvasUi.js')
  eq('도구줄: 예시 사진이면 [내 사진으로 바꾸기]', ui.selectBarButtons({ kinds: new Set(['other']), photo: false, sample: true }).left.some(b => b.key === 'sampleReplace' && b.label === '내 사진으로 바꾸기'), true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
