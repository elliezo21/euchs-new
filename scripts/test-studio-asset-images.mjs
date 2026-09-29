// 에셋 이미지 테스트 — node scripts/test-studio-asset-images.mjs
// 경로 검사 · 예전 페이지 그대로 읽기 · 에셋 요소·섹션 배경 이미지 넣기/빼기/복제 · 놓는 네모 계산 · 목록(manifest) · 내보내기(가짜 캔버스) · 복사본 · 풀세트 템플릿
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isAssetPath, assetUrl, isValidAssetItem, normalizeAssetItem, assetLabel, sectionBgImageOf, assetPlacement, assetInsertSize, assetFieldsOf,
  readAssetManifest, pageAssetPaths, ASSET_INSERT_MAX, assetThumbUrl, filterAssets,
} from '../src/lib/studioAsset.js'
import {
  readPage, emptyPage, addSection, addElementItem, setSectionBgImage, setSectionBg, duplicateSection, duplicateItems, copyItems, pasteItems, removeItems,
  moveItems, setItemRect, setRotation, findItem, isDrawableItem, isValidImageItem, itemBounds, pageImageIds, checkPageSize, buildInitialPage, PAGE_WIDTH,
} from '../src/lib/studioPage.js'
import { renderSection, renderPage, assetPathsOf, ExportError } from '../src/lib/studioExport.js'
import { templateByKey, templatesOf, templateSlots, templateProblems, buildTemplatePage, pageToTemplate, TEMPLATE_CATEGORIES } from '../src/lib/studioTemplates.js'
import { isValidTextItem, wrapLines, textStyleOf } from '../src/lib/studioText.js'
import { createHistory, push, undo } from '../src/lib/studioHistory.js'
import { rewritePage, rewriteEdit } from '../api/_studioCopy.js'
import { readBg, withBg, bgActive, bgMark, bgViewKey, bgLibUnder, bgAiUnder, bgPaintColor, libFromEntry, BG_MODES, libFitSource, aiFitSource, maskBottomRow } from '../src/lib/studioBg.js'
import { imageSize } from './build-studio-assets-manifest.mjs'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const quiet = fn => { const e = console.error; console.error = () => {}; try { return fn() } finally { console.error = e } }
const quietAsync = async fn => { const e = console.error; console.error = () => {}; try { return await fn() } finally { console.error = e } }
const clone = v => JSON.parse(JSON.stringify(v))
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'studio-assets')
const WIDE = /[ᄀ-ᇿ　-〿㄰-㆏一-鿿가-힯＀-￯]/
const measure = (s, st) => [...s].reduce((n, ch) => n + (WIDE.test(ch) ? 1 : ch === ' ' ? 0.35 : 0.68), 0) * st.fontSize
const photos = n => Array.from({ length: n }, (_, i) => ({ id: `img${i}`, width: 1000, height: 1000 }))

// ── 1. 경로 검사 ──
{
  eq('쓸 수 있는 경로', ['objects/gift-box.svg', 'backgrounds/soft-peach.svg', 'a/b/c_1.png', 'x/y.webp', 'x/y.jpeg'].map(isAssetPath), [true, true, true, true, true])
  eq('못 쓰는 경로 (폴더 밖·다른 사이트·대문자·확장자·폴더 없음)', [
    '../secret.svg', 'objects/../../x.svg', 'https://evil.example/x.svg', '//evil.example/x.svg', '/objects/x.svg', 'objects\\x.svg',
    'Objects/X.svg', 'objects/x.gif', 'objects/x.svg?x=1', 'x.svg', 'objects/.hidden.svg', '', null, 12, 'objects/' + 'a'.repeat(200) + '.svg', 'data:image/svg+xml,x', 'javascript:alert(1)',
  ].map(isAssetPath).some(Boolean), false)
  eq('주소 = 같은 사이트 /studio-assets/ 아래', [assetUrl('objects/gift-box.svg'), assetUrl('../x.svg')], ['/studio-assets/objects/gift-box.svg', null])
}

// ── 2. 예전 페이지는 그대로 읽힌다 (에셋 칸이 없던 때의 데이터) ──
{
  const old = buildInitialPage(photos(3))
  const back = readPage(clone(old), 'p')
  eq('예전 페이지(사진만): readPage 결과가 입력과 같음 · 문제 없음', [back.problems, JSON.stringify(back.page) === JSON.stringify(old)], [[], true])
  eq('예전 페이지: 섹션에 bgImage 칸이 생기지 않음 · 에셋 경로 없음', [back.page.sections.some(s => 'bgImage' in s), pageAssetPaths(back.page)], [false, []])
  const tpl = buildTemplatePage(templateByKey('point'), photos(4), measure).page
  const tb = readPage(clone(tpl), 'p')
  eq('예전 템플릿 페이지(글자·도형·그룹): 그대로', JSON.stringify(tb.page) === JSON.stringify(tpl), true)
  // 회전 칸이 없던 더 옛 페이지
  const older = { v: 1, width: 780, gap: 0, parked: [], sections: [{ id: 's1', height: 400, bg: '#ffffff', items: [{ id: 'i1', type: 'image', imageId: 'a', x: 0, y: 0, w: 780, h: 400 }] }] }
  eq('더 옛 페이지(공통 칸 없음): 기본값만 채움', readPage(clone(older), 'p').page.sections[0].items[0], { id: 'i1', type: 'image', imageId: 'a', x: 0, y: 0, w: 780, h: 400, rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false })
}

// ── 3. 에셋 요소 ──
const entry = { id: 'objects-gift-box', category: 'objects', label: '선물 상자', file: 'objects/gift-box.svg', w: 400, h: 400, use: 'item' }
{
  eq('넣을 때 크기: 그림 비율 그대로, 긴 변 최대', [assetInsertSize({ w: 1200, h: 600 }), assetInsertSize({ w: 200, h: 100 }), assetInsertSize({ w: 300, h: 900 })],
    [{ w: ASSET_INSERT_MAX, h: ASSET_INSERT_MAX / 2 }, { w: 200, h: 100 }, { w: ASSET_INSERT_MAX / 3, h: ASSET_INSERT_MAX }])
  const p0 = addSection(emptyPage(), { height: 600 })
  const sid = p0.sections[0].id
  const r = addElementItem(p0, sid, assetFieldsOf(entry))
  const it = findItem(r.page, r.itemId).item
  eq('넣기: 섹션 가운데 · 에셋 칸 · 공통 칸 기본값', [it.type, it.asset, it.fit, it.label, it.x, it.y, it.w, it.h, it.rotation, it.opacity, it.hidden],
    ['asset', 'objects/gift-box.svg', 'contain', '선물 상자', 190, 100, 400, 400, 0, 1, false])
  eq('그릴 수 있는 요소 · 사진 요소는 아님 · 레이어 이름', [isValidAssetItem(it), isDrawableItem(it), isValidImageItem(it), assetLabel(it)], [true, true, false, '이미지 · 선물 상자'])
  eq('사진 목록·parked와 무관', [pageImageIds(r.page), r.page.parked], [[], []])
  eq('이상한 경로는 넣지 않음', addElementItem(p0, sid, { type: 'asset', asset: '../x.svg', w: 10, h: 10 }).itemId, null)
  // 기존 image 요소 조작 그대로: 이동·크기·회전·복제·복사/붙여넣기·삭제
  const moved = findItem(moveItems(r.page, [it.id], 30, -20), it.id).item
  eq('이동', [moved.x, moved.y], [220, 80])
  const sized = findItem(setItemRect(r.page, it.id, { w: 200, h: 100 }), it.id).item
  eq('크기 (자유 — 그림은 fit대로 자리 안에)', [sized.w, sized.h, sized.asset], [200, 100, 'objects/gift-box.svg'])
  eq('회전', findItem(setRotation(r.page, [it.id], 45), it.id).item.rotation, 45)
  const d = duplicateItems(r.page, [it.id])
  eq('복제: 에셋 칸 그대로, 새 id', [findItem(d.page, d.ids[0]).item.asset, d.ids[0] !== it.id, d.page.sections[0].items.length], ['objects/gift-box.svg', true, 2])
  const pasted = pasteItems(r.page, sid, copyItems(r.page, [it.id]))
  eq('복사·붙여넣기', findItem(pasted.page, pasted.ids[0]).item.asset, 'objects/gift-box.svg')
  eq('삭제 — parked에 아무것도 안 들어감', [removeItems(r.page, [it.id]).sections[0].items.length, removeItems(r.page, [it.id]).parked], [0, []])
  // 저장 → 읽기
  const back = readPage(clone(r.page), 'p')
  eq('저장한 페이지를 다시 읽으면 그대로', [back.problems, JSON.stringify(back.page) === JSON.stringify(r.page)], [[], true])
  // 잘못된 값
  const bad = quiet(() => readPage({ ...clone(r.page), sections: [{ ...clone(r.page.sections[0]), items: [{ id: 'x1', type: 'asset', asset: 'https://evil.example/a.svg', x: 0, y: 0, w: 10, h: 10 }, { id: 'x2', type: 'asset', asset: 'objects/gift-box.svg', fit: 'stretch', label: 7, x: 0, y: 0, w: 10, h: 10 }] }] }, 'p'))
  const [b1, b2] = bad.page.sections[0].items
  eq('다른 사이트 주소 = 그리지 않고 보존', [isDrawableItem(b1), b1.asset, assetUrl(b1.asset)], [false, 'https://evil.example/a.svg', null])
  eq('이상한 fit·label = 기본값으로 읽음', [b2.fit, 'label' in b2, isDrawableItem(b2)], ['contain', false, true])
  eq('normalize: 긴 이름은 자름', [...normalizeAssetItem({ label: '가'.repeat(80) }).label].length, 40)
  // 되돌리기
  let h = createHistory(p0)
  h = push(h, r.page, '이미지 넣기')
  eq('되돌리기 한 번 = 넣기 전', undo(h).edit.sections[0].items.length, 0)
}

// ── 4. 섹션 배경 이미지 ──
{
  const p0 = addSection(addSection(emptyPage(), { height: 500, bg: '#f1f2f4' }), { height: 300 })
  const [s1, s2] = p0.sections.map(s => s.id)
  const a = setSectionBgImage(p0, s1, 'backgrounds/soft-peach.svg')
  eq('넣기: bgImage 칸 · 배경색은 그대로 · 다른 섹션은 그대로', [a.sections[0].bgImage, a.sections[0].bg, 'bgImage' in a.sections[1], a.sections[1] === p0.sections[1]], [{ asset: 'backgrounds/soft-peach.svg', fit: 'cover' }, '#f1f2f4', false, true])
  eq('읽기', [sectionBgImageOf(a.sections[0]), sectionBgImageOf(a.sections[1]), sectionBgImageOf({ bgImage: { asset: '../x.svg' } }), sectionBgImageOf({ bgImage: 'x' })], [{ asset: 'backgrounds/soft-peach.svg', fit: 'cover' }, null, null, null])
  eq('같은 값이면 문서 그대로', setSectionBgImage(a, s1, 'backgrounds/soft-peach.svg') === a, true)
  eq('이상한 경로·없는 섹션이면 문서 그대로', [setSectionBgImage(p0, s1, 'http://x/y.svg') === p0, setSectionBgImage(p0, 'nope', 'backgrounds/soft-peach.svg') === p0], [true, true])
  const b = setSectionBgImage(a, s1, 'backgrounds/dot-grid.svg')
  eq('바꾸기', b.sections[0].bgImage.asset, 'backgrounds/dot-grid.svg')
  const c = setSectionBgImage(a, s1, null)
  eq('빼기: 칸이 없어짐 (예전 섹션과 같은 모양)', ['bgImage' in c.sections[0], JSON.stringify(c) === JSON.stringify(p0)], [false, true])
  eq('없는데 빼기 = 문서 그대로', setSectionBgImage(p0, s2, null) === p0, true)
  eq('배경색을 바꿔도 배경 이미지는 남음', setSectionBg(a, s1, '#000000').sections[0].bgImage.asset, 'backgrounds/soft-peach.svg')
  const dup = duplicateSection(a, s1)
  eq('섹션 복제: 배경 이미지도', dup.page.sections.find(s => s.id === dup.sectionId).bgImage, { asset: 'backgrounds/soft-peach.svg', fit: 'cover' })
  const back = readPage(clone(a), 'p')
  eq('저장한 페이지를 다시 읽으면 그대로', [back.problems, JSON.stringify(back.page) === JSON.stringify(a)], [[], true])
  eq('페이지에 쓰인 에셋 경로 (배경 + 요소, 중복 없이)', pageAssetPaths(addElementItem(addElementItem(a, s1, assetFieldsOf(entry)).page, s2, assetFieldsOf(entry)).page), ['backgrounds/soft-peach.svg', 'objects/gift-box.svg'])
  eq('저장 크기 한도 안', checkPageSize(a).ok, true)
}

// ── 5. 놓는 네모 (화면 object-fit과 같은 결과) ──
{
  eq('contain: 가로로 긴 그림을 정사각 자리에', assetPlacement(400, 200, 300, 300, 'contain'), { sx: 0, sy: 0, sw: 400, sh: 200, dx: 0, dy: 75, dw: 300, dh: 150 })
  eq('contain: 세로로 긴 그림', assetPlacement(100, 400, 300, 200, 'contain'), { sx: 0, sy: 0, sw: 100, sh: 400, dx: 125, dy: 0, dw: 50, dh: 200 })
  eq('cover: 정사각 그림을 가로로 긴 자리에 (위아래를 자름)', assetPlacement(780, 780, 780, 390, 'cover'), { sx: 0, sy: 195, sw: 780, sh: 390, dx: 0, dy: 0, dw: 780, dh: 390 })
  eq('cover: 세로로 긴 자리 (좌우를 자름)', assetPlacement(780, 780, 390, 780, 'cover'), { sx: 195, sy: 0, sw: 390, sh: 780, dx: 0, dy: 0, dw: 390, dh: 780 })
  eq('크기를 모르면 null', [assetPlacement(0, 10, 10, 10), assetPlacement(10, 10, 0, 10)], [null, null])
}

// ── 6. 목록 (manifest.json) ──
const manifestRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))
const manifest = readAssetManifest(manifestRaw)
{
  eq('실제 manifest.json: 문제 없음', manifest.problems, [])
  eq('카테고리 (오브제·장식·배경·연출 배경·이미지 자리)', manifest.categories.map(c => [c.key, c.label, c.items.length > 0]), [['objects', '오브제', true], ['decor', '장식', true], ['backgrounds', '배경', true], ['scenes', '연출 배경', true], ['placeholder', '이미지 자리', true]])
  eq('항목마다 파일이 있고 크기가 맞음', manifest.items.filter(i => {
    const f = path.join(ROOT, i.file)
    if (!fs.existsSync(f)) return true
    const s = imageSize(fs.readFileSync(f), i.file.split('.').pop())
    return !s || s.w !== i.w || s.h !== i.h
  }).map(i => i.file), [])
  eq('배경·연출 배경 폴더 = 배경용, 나머지 = 요소용', [...new Set(manifest.items.map(i => `${i.category}:${i.use}`))].sort(), ['backgrounds:bg', 'decor:item', 'objects:item', 'placeholder:item', 'scenes:bg'])
  eq('폴더의 그림이 모두 목록에 있음', (() => {
    const onDisk = fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'thumbs').flatMap(d => fs.readdirSync(path.join(ROOT, d.name)).map(n => `${d.name}/${n}`)).sort()
    return JSON.stringify(onDisk) === JSON.stringify(manifest.items.map(i => i.file).sort())
  })(), true)
  // 샘플 그림은 직접 만든 SVG — 바깥 파일·주소·스크립트가 없다 (캔버스에 그려도 안전)
  eq('SVG 안에 바깥 주소·스크립트·글자 없음', manifest.items.filter(i => i.file.endsWith('.svg')).filter(i => {
    const s = fs.readFileSync(path.join(ROOT, i.file), 'utf8').replace('xmlns="http://www.w3.org/2000/svg"', '')
    return /https?:|href|<script|<image|<text|<foreignObject|@import/i.test(s)
  }).map(i => i.file), [])
  const bad = readAssetManifest({ v: 1, categories: [{ key: 'a', label: '가' }, { key: 'a', label: '겹침' }, { key: 'B!', label: 'x' }], items: [
    { id: 'ok', category: 'a', label: '정상', file: 'a/ok.png', w: 10, h: 10, use: 'item' },
    { id: 'ok', category: 'a', label: 'id 겹침', file: 'a/ok2.png', w: 10, h: 10, use: 'item' },
    { id: 'p', category: 'a', label: '경로', file: '../x.png', w: 10, h: 10, use: 'item' },
    { id: 'c', category: 'none', label: '카테고리', file: 'a/c.png', w: 10, h: 10, use: 'item' },
    { id: 's', category: 'a', label: '크기', file: 'a/s.png', w: 0, h: 10, use: 'item' },
    { id: 'u', category: 'a', label: 'use', file: 'a/u.png', w: 10, h: 10, use: 'x' },
    { id: 'l', category: 'a', label: '', file: 'a/l.png', w: 10, h: 10, use: 'item' },
  ] })
  eq('어긋난 항목만 빼고 나머지는 씀', [bad.items.map(i => i.id), bad.categories.map(c => c.key), bad.problems.length], [['ok'], ['a'], 8])
  eq('모양이 아예 다르면 빈 목록', [readAssetManifest(null).items, readAssetManifest([]).categories, readAssetManifest(null).groups], [[], [], []])
  // 묶음·썸네일·출처 (Flow 그림)
  eq('묶음: 그림이 있는 것만 · 목록 순서', [manifest.groups.map(g => g.key), manifest.groups.every(g => g.count > 0)], [['common', 'apparel', 'bag', 'kitchen', 'living', 'beauty', 'digital', 'toy', 'pet', 'health'], true])
  eq('그림 수: 전체 117 · 묶음 있는 것 105 · 썸네일 있는 것 105', [manifest.items.length, manifest.items.filter(i => i.group).length, manifest.items.filter(i => i.thumb).length], [117, 105, 105])
  eq('썸네일 파일이 모두 있고 긴 변 240px 이하 WebP', manifest.items.filter(i => i.thumb).filter(i => {
    const f = path.join(ROOT, i.thumb)
    if (!fs.existsSync(f)) return true
    const s = imageSize(fs.readFileSync(f), 'webp')
    return !s || Math.max(s.w, s.h) > 240 || Math.abs((s.w / s.h) / (i.w / i.h) - 1) > 0.03
  }).map(i => i.thumb), [])
  eq('썸네일 주소: 있으면 thumbs/, 없으면(svg) 원본', [assetThumbUrl(manifest.items.find(i => i.thumb)).startsWith('/studio-assets/thumbs/'), assetThumbUrl({ file: 'objects/gift-box.svg' }), assetThumbUrl({ file: 'objects/a.png', thumb: '../x.webp' })], [true, '/studio-assets/objects/gift-box.svg', '/studio-assets/objects/a.png'])
  eq('출처·이용 조건 설명', [[...new Set(manifest.items.map(i => i.source).filter(Boolean))], typeof manifest.license['ai-generated']], [['ai-generated'], 'string'])
  eq('거르기: 묶음 · 종류 · 쓰임', [
    filterAssets(manifest.items, { group: 'apparel' }).length, filterAssets(manifest.items, { category: 'scenes' }).length,
    filterAssets(manifest.items, { group: 'kitchen', category: 'scenes' }).map(i => i.use), filterAssets(manifest.items, { use: 'bg' }).length,
    filterAssets(manifest.items, {}).length, filterAssets(manifest.items, { group: 'living', category: 'objects' }).length,
  ], [8, 18, ['bg', 'bg'], 58, 117, 0])
  const odd = readAssetManifest({ v: 1, categories: [{ key: 'a', label: '가' }], groups: [{ key: 'g1', label: '묶음' }, { key: 'g1', label: '겹침' }], items: [
    { id: 'x', category: 'a', label: '썸네일 이상', file: 'a/x.png', thumb: 'http://evil.example/t.webp', group: 'nope', w: 10, h: 10, use: 'item' },
    { id: 'y', category: 'a', label: '정상', file: 'a/y.png', thumb: 'thumbs/y.webp', group: 'g1', source: 's', w: 10, h: 10, use: 'bg' },
  ] })
  eq('이상한 썸네일·없는 묶음은 그 칸만 빼고 그림은 씀', [odd.items.map(i => [i.id, i.thumb ?? null, i.group ?? null, i.source ?? null]), odd.groups, odd.problems.length], [[['x', null, null, null], ['y', 'thumbs/y.webp', 'g1', 's']], [{ key: 'g1', label: '묶음', count: 1 }], 3])
  eq('크기 읽기: PNG·SVG(viewBox만)', [
    imageSize(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from('IHDR'), Buffer.from([0, 0, 3, 12, 0, 0, 1, 144])]), 'png'),
    imageSize(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"></svg>'), 'svg'),
    imageSize(Buffer.from('not an image'), 'png'),
  ], [{ w: 780, h: 400 }, { w: 120, h: 80 }, null])
}

// ── 7. 내보내기 (가짜 캔버스) ──
function fakeCanvas(w, h, log, tag) {
  let transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const rec = (op, ...args) => log.push({ c: tag, op, args })
  const ctx = {
    font: '10px sans-serif', fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1,
    save: () => rec('save'), restore: () => rec('restore'),
    translate: (x, y) => rec('translate', x, y), rotate: r => rec('rotate', r), scale: (x, y) => rec('scale', x, y),
    setTransform: (...a) => { transform = typeof a[0] === 'object' ? { ...a[0] } : { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] }; rec('setTransform', ...a) },
    getTransform: () => ({ ...transform }),
    fillRect: (...a) => rec('fillRect', ctx.fillStyle, ...a),
    drawImage: (src, ...a) => rec('drawImage', src?.tag ?? src, ctx.globalAlpha, ...a),
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, arcTo: () => {}, closePath: () => {}, rect: () => {},
    clip: () => rec('clip'), fill: p => rec('fill', ctx.fillStyle, p?.d ?? 'path'), stroke: p => rec('stroke', ctx.strokeStyle, p?.d ?? 'path'),
    setLineDash: () => {}, fillText: (t, x, y) => rec('fillText', ctx.fillStyle, t, x, y), strokeText: () => {},
    measureText: t => ({ width: [...t].length * 5, fontBoundingBoxAscent: 9, fontBoundingBoxDescent: 2 }),
    getImageData: (x, y, pw, ph) => ({ data: new Uint8ClampedArray(pw * ph * 4) }), putImageData: () => {},
  }
  return { tag, width: w, height: h, getContext: () => ctx, toBlob: cb => cb(null) }
}
function fakeDeps(log, { assetFail = null, withAsset = true } = {}) {
  let n = 0
  const deps = {
    assetCalls: [], imageCalls: [],
    createCanvas(w, h) { return fakeCanvas(w, h, log, `c${n++}`) },
    Path2D: class { constructor(d) { this.d = d } },
    async getImage(id) { deps.imageCalls.push(id); return { source: { tag: `SRC-${id}` }, width: 1000, height: 500, notes: [] } },
    lookOf: () => null, measure: (s, f) => [...s].length * f.fontSize * 0.5,
    async prepareFonts() { return true },
  }
  if (withAsset) deps.getAsset = async p => { deps.assetCalls.push(p); if (p === assetFail) throw new Error('받지 못함'); return { source: { tag: `ASSET-${p}` }, width: 400, height: 200 } }
  return deps
}
const base = { rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }
const assetItem = (id, extra = {}) => ({ id, type: 'asset', asset: 'objects/gift-box.svg', fit: 'contain', x: 100, y: 50, w: 300, h: 300, ...base, ...extra })
const pageOf = sections => ({ v: 1, width: 780, gap: 0, parked: [], sections })
{
  const log = []
  const deps = fakeDeps(log)
  const p = pageOf([{ id: 's1', height: 390, bg: '#ffeedd', bgImage: { asset: 'backgrounds/soft-peach.svg', fit: 'cover' }, items: [
    { id: 'i1', type: 'image', imageId: 'a', x: 0, y: 0, w: 200, h: 100, ...base }, assetItem('a1'), assetItem('a2', { x: 400 }), assetItem('a3', { hidden: true, asset: 'decor/confetti.svg' }),
  ] }])
  await renderSection(p, 's1', deps, { scale: 2 })
  eq('에셋은 쓰인 것만·경로마다 한 번 (숨긴 요소는 안 받음)', deps.assetCalls, ['backgrounds/soft-peach.svg', 'objects/gift-box.svg'])
  eq('이 구간에 그릴 에셋 경로', assetPathsOf(p.sections[0]), ['backgrounds/soft-peach.svg', 'objects/gift-box.svg'])
  const main = log.filter(l => l.c === 'c0')
  const draws = main.filter(l => l.op === 'fillRect' || l.op === 'drawImage')
  eq('그리는 순서: 배경색 → 배경 이미지 → 사진 → 에셋 → 에셋', draws.map(l => (l.op === 'fillRect' ? `색 ${l.args[0]}` : l.args[0])), ['색 #ffeedd', 'ASSET-backgrounds/soft-peach.svg', 'SRC-a', 'ASSET-objects/gift-box.svg', 'ASSET-objects/gift-box.svg'])
  const bg = draws[1].args.slice(2)
  eq('배경 이미지 = 섹션(780×390)을 채움 (그림 400×200 → 비율 같아 전체)', bg, [0, 0, 400, 200, 0, 0, 780, 390])
  const a1 = draws[3].args.slice(2)
  eq('에셋 요소 = 자리(300×300) 안에 비율 그대로 (가운데)', a1, [0, 0, 400, 200, 0, 75, 300, 150])
  eq('2배로 내보내도 좌표는 페이지 px (배율은 캔버스 변환으로)', main.find(l => l.op === 'setTransform').args, [2, 0, 0, 2, 0, 0])
  // cover 요소 · 뒤집기 · 회전 · 투명도
  const log2 = []
  const p2 = pageOf([{ id: 's1', height: 400, bg: '#ffffff', items: [assetItem('a1', { fit: 'cover', flipX: true, rotation: 90, w: 200, h: 200 })] }])
  await renderSection(p2, 's1', fakeDeps(log2), {})
  const m2 = log2.filter(l => l.c === 'c0')
  eq('cover = 자리를 채움(좌우를 자름) · 회전·뒤집기는 요소째', [m2.find(l => l.op === 'drawImage').args.slice(2), m2.some(l => l.op === 'rotate'), m2.find(l => l.op === 'scale')?.args], [[100, 0, 200, 200, 0, 0, 200, 200], true, [-1, 1]])
  const log3 = []
  await renderSection(pageOf([{ id: 's1', height: 400, bg: '#ffffff', items: [assetItem('a1', { opacity: 0.5 })] }]), 's1', fakeDeps(log3), {})
  eq('투명도 = 따로 그린 장을 한 번에 붙임 (다른 요소와 같은 방식)', log3.filter(l => l.op === 'drawImage').map(l => [l.c, l.args[0], l.args[1]]), [['c1', 'ASSET-objects/gift-box.svg', 1], ['c0', 'c1', 0.5]])
  // 에셋이 없는 페이지는 getAsset을 부르지 않는다 (예전 페이지 내보내기 그대로)
  const log4 = []
  const d4 = fakeDeps(log4, { withAsset: false })
  await renderPage(pageOf([{ id: 's1', height: 100, bg: '#ffffff', items: [{ id: 'i1', type: 'image', imageId: 'a', x: 0, y: 0, w: 780, h: 100, ...base }] }]), ['s1'], d4, {})
  eq('에셋 없는 페이지: getAsset 없이도 내보내짐', [d4.imageCalls, log4.some(l => l.op === 'drawImage' && l.args[0] === 'SRC-a')], [['a'], true])
  // 실패
  const err = await quietAsync(() => renderSection(p, 's1', fakeDeps([], { assetFail: 'objects/gift-box.svg' }), {}).then(() => null, e => e))
  eq('에셋을 못 받으면 어느 섹션·어느 그림인지 알림', [err instanceof ExportError, err?.kind, err?.asset, err?.sectionId], [true, 'asset', 'objects/gift-box.svg', 's1'])
  const err2 = await quietAsync(() => renderSection(p, 's1', fakeDeps([], { withAsset: false }), {}).then(() => null, e => e))
  eq('받을 방법이 없으면(getAsset 없음) 조용히 빼지 않고 알림', err2 instanceof ExportError, true)
  // 이상한 경로의 요소는 그리지 않는다
  const log5 = []
  const d5 = fakeDeps(log5)
  await renderSection(pageOf([{ id: 's1', height: 100, bg: '#ffffff', bgImage: { asset: 'http://x/y.svg' }, items: [assetItem('a1', { asset: '../x.svg' })] }]), 's1', d5, {})
  eq('이상한 경로: 받지도 그리지도 않음', [d5.assetCalls, log5.some(l => l.op === 'drawImage')], [[], false])
}

// ── 8. 복사본 (서버 api/_studioCopy.rewritePage) ──
{
  const p = pageOf([{ id: 's1', height: 400, bg: '#ffffff', bgImage: { asset: 'backgrounds/soft-peach.svg', fit: 'cover' }, items: [{ id: 'i1', type: 'image', imageId: 'old1', x: 0, y: 0, w: 100, h: 100, ...base }, assetItem('a1')] }])
  const r = rewritePage(p, new Map([['old1', 'new1']]))
  eq('복사본: 사진 id만 바뀌고 에셋 요소·배경 이미지는 그대로', [r.page.sections[0].items[0].imageId, r.page.sections[0].items[1], r.page.sections[0].bgImage, r.unknown], ['new1', p.sections[0].items[1], p.sections[0].bgImage, []])
}

// ── 9. 풀세트 템플릿 (에셋 이미지 자리 포함) ──
{
  eq('카테고리 "풀세트"에 샘플 1개', [TEMPLATE_CATEGORIES.some(c => c.key === 'fullset'), templatesOf('fullset').map(t => t.key)], [true, ['fullset-sample']])
  const tpl = templateByKey('fullset-sample')
  eq('모양 문제 없음 · 구간 8~12개 · 사진 자리 0부터', [templateProblems(tpl), tpl.sections.length >= 8 && tpl.sections.length <= 12, templateSlots(tpl)], [[], true, [0, 1, 2, 3]])
  const parts = tpl.sections.flatMap(s => s.items || [])
  const used = [...new Set([...parts.filter(p => p.type === 'asset').map(p => p.asset), ...tpl.sections.map(s => s.bgImage?.asset).filter(Boolean)])].sort()
  eq('에셋 이미지: 요소 4곳(받침대·반짝임 2·체크) + 섹션 배경 2곳 — 실제 그림(이미지 자리 표시 아님)', [parts.filter(p => p.type === 'asset').length, tpl.sections.filter(s => s.bgImage).length, used.some(f => f.startsWith('placeholder/')), used.some(f => /podium/.test(f))], [4, 2, false, true])
  eq('요소 자리 비율 = 그림 비율 (2% 안 — 자리 안에 빈틈 없이)', parts.filter(p => p.type === 'asset').filter(p => { const m = manifest.items.find(i => i.file === p.asset); return !m || Math.abs((p.w / p.h) / (m.w / m.h) - 1) > 0.02 }).map(p => p.asset), [])
  eq('쓰인 그림이 모두 목록(manifest)에 있음', used.every(f => manifest.items.some(i => i.file === f)), true)
  eq('표 3개 (소재·스펙 · 비교 · 사이즈·옵션)', parts.filter(p => p.type === 'table').length, 3)
  for (const n of [0, 2, 4, 7]) {
    const r = buildTemplatePage(tpl, photos(n), measure)
    const back = readPage(clone(r.page), 'tpl')
    const items = r.page.sections.flatMap(s => s.items)
    eq(`사진 ${n}장: readPage 그대로 · 에셋 요소 4개·배경 2곳은 사진 수와 상관없이`, [back.problems, JSON.stringify(back.page) === JSON.stringify(r.page), items.filter(isValidAssetItem).length, r.page.sections.filter(s => sectionBgImageOf(s)).length], [[], true, 4, 2])
    eq(`사진 ${n}장: 넣은 사진 수 · 빈 구간 없음 · slot 칸 안 남음`, [r.placed, r.extra, r.page.sections.every(s => s.items.length > 0), items.some(it => 'slot' in it || 'group' in it)], [Math.min(n, 4), Math.max(0, n - 4), true, false])
  }
  const r = buildTemplatePage(tpl, photos(4), measure)
  const wrapped = [], outside = [], overlap = []
  for (const s of r.page.sections) {
    for (const it of s.items) {
      const b = itemBounds(it)
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > PAGE_WIDTH + 0.5 || b.y + b.h > s.height + 0.5) outside.push(`${it.type}:${it.text ?? it.asset ?? ''}`)
      if (isValidTextItem(it) && wrapLines(it.text, textStyleOf(it), it.w, measure).length !== it.text.split('\n').length) wrapped.push(it.text)
    }
    const boxes = s.items.filter(it => isValidTextItem(it) || isValidAssetItem(it))
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap.push(`${a.text ?? a.asset} × ${b.text ?? b.asset}`)
    }
  }
  eq('글자가 폭 안 · 모든 요소가 섹션 안 · 글자와 이미지 자리가 겹치지 않음', [wrapped, outside, overlap], [[], [], []])
  eq('11구간 흐름 (사진 4장 — 대표 사진은 첫 화면 받침대 위에만)', r.page.sections.length, 11)
  // 첫 화면: 받침대 위 대표 사진 자리 — 밑면 = 받침대 윗면 선, 가로 = 받침대 가운데, 받침대보다 앞(뒤 순서), 반짝이와 안 겹침
  const hero = r.page.sections[0]
  const podium = hero.items.find(it => it.type === 'asset' && /podium/.test(it.asset))
  const heroImg = hero.items.find(it => it.type === 'image')
  const stand = Math.round(podium.y + podium.h * (260 / 616))
  eq('첫 화면 대표 사진: 밑면 = 받침대 윗면 선 · 받침대 가운데 · 받침대 뒤에 그림 · 첫 사진', [
    heroImg.y + heroImg.h, heroImg.x + heroImg.w / 2, podium.x + podium.w / 2, hero.items.indexOf(heroImg) > hero.items.indexOf(podium), heroImg.imageId,
  ], [stand, podium.x + podium.w / 2, podium.x + podium.w / 2, true, 'img0'])
  const others = hero.items.filter(it => it !== heroImg && it !== podium)
  eq('첫 화면 대표 사진 자리가 글자·반짝이와 겹치지 않음', others.filter(b => heroImg.x < b.x + b.w && b.x < heroImg.x + heroImg.w && heroImg.y < b.y + b.h && b.y < heroImg.y + heroImg.h).map(b => b.text ?? b.asset), [])
  eq('대표 사진이 페이지에 한 번만 (꽉 찬 구간으로 또 넣지 않음)', r.page.sections.flatMap(s => s.items).filter(it => it.imageId === 'img0').length, 1)
  eq('사진 0장: 첫 화면은 받침대만 남음 (구간은 그대로)', buildTemplatePage(tpl, photos(0), measure).page.sections[0].items.some(it => it.type === 'image'), false)
  // 내 템플릿 변환에도 에셋이 남는다
  const mine = pageToTemplate(r.page, '풀세트')
  const again = buildTemplatePage(mine, photos(4), measure).page
  const shape = p => p.sections.map(s => [s.height, s.bg, s.bgImage ?? null, s.items.map(it => { const { id, groupId, ...rest } = it; return [Object.fromEntries(Object.entries(rest).sort()), !!groupId] })])
  eq('페이지 → 내 템플릿 → 다시 적용 = 같은 모양 (에셋·배경 이미지 포함)', JSON.stringify(shape(again)) === JSON.stringify(shape(r.page)), true)
}

// ── 10. 라이브러리 배경 (에셋 이미지를 사진 배경으로 — AI 없음·무료) ──
{
  const mask = { path: 'uid/p1/bg/img-1/mask_0123456789abcdef.png', key: '0123456789abcdef', model: 'birefnet-v2', w: 800, h: 800 }
  const scene = manifest.items.find(i => i.category === 'scenes')
  const lib = libFromEntry(scene)
  eq('목록 항목 → bg.lib (경로·크기·이름·바닥선)', lib, { asset: scene.file, w: 1200, h: 1200, label: scene.label, groundY: scene.groundY })
  eq('쓸 수 없는 항목 = null', [libFromEntry({ file: '../x.jpg', w: 10, h: 10 }), libFromEntry({ file: 'scenes/a.jpg', w: 0, h: 10 }), libFromEntry(null)], [null, null, null])
  eq('모드 목록에 library', BG_MODES.includes('library'), true)
  const edit = withBg({ v: 2, layers: [], look: { filter: 'warm' } }, { mask, mode: 'library', lib, color: '#ffeedd', ai: { path: 'uid/p1/bg/img-1/ai_0123456789abcdef.png', key: '0123456789abcdef', w: 1024, h: 768, preset: 'studio', model: 'm' } })
  const bg = readBg(clone(edit))
  eq('저장 → 읽기: 모드·그림 그대로, 다른 칸(단색 색·AI 배경·필터)도 남음', [bg.mode, bg.lib, bg.color, !!bg.ai, edit.look], ['library', lib, '#ffeedd', true, { filter: 'warm' }])
  eq('합성에 쓰는 값: 아래 그림 = 라이브러리 (AI·단색 아님)', [bgActive(bg), bgLibUnder(bg), bgAiUnder(bg), bgPaintColor(bg), bgMark(bg)], [true, { asset: scene.file, w: 1200, h: 1200, groundY: scene.groundY }, null, null, '라이브러리 배경'])
  eq('그림을 바꾸면 화면 작은 사진을 다시 만든다 (key가 달라짐)', bgViewKey(bg) !== bgViewKey({ ...bg, lib: { ...lib, asset: 'scenes/other.jpg' } }) && bgViewKey(bg).includes(scene.file), true)
  eq('다른 모드로 바꿔도 고른 그림은 남고, 아래 그림으로는 안 쓴다', [readBg(withBg(edit, { ...bg, mode: 'transparent' })).lib, bgLibUnder({ ...bg, mode: 'transparent' }), bgLibUnder({ ...bg, mode: 'ai' })], [lib, null, null])
  const broken = quiet(() => readBg({ bg: { mask, mode: 'library', lib: { asset: 'https://evil.example/a.jpg', w: 10, h: 10 } } }))
  eq('이상한 경로의 라이브러리 배경 = 쓰지 않고 투명으로 읽음', [broken.mode, 'lib' in broken], ['transparent', false])
  eq('모드만 library이고 그림이 없으면 투명으로', quiet(() => readBg({ bg: { mask, mode: 'library' } })).mode, 'transparent')
  // 예전 데이터 (lib 칸 없음)
  const oldEdit = { bg: { mask, mode: 'ai', ai: { path: 'uid/p1/bg/img-1/ai_0123456789abcdef.png', key: '0123456789abcdef', w: 1024, h: 768, preset: 'studio', model: 'm' } } }
  const oldBg = readBg(clone(oldEdit))
  eq('예전 데이터: 그대로 읽히고 lib 칸이 생기지 않음 · 다시 저장해도 같음', [oldBg.mode, 'lib' in oldBg, JSON.stringify(withBg({}, oldBg).bg) === JSON.stringify(oldEdit.bg)], ['ai', false, true])
  eq('예전 데이터: 화면 key가 예전과 같음 (사진을 다시 만들지 않음)', bgViewKey(oldBg), `|bg:${mask.path}|ai:${oldEdit.bg.ai.path}`)
  // 복사본: 마스크·AI 배경 파일은 새 폴더로, 라이브러리 그림은 경로 그대로(복사할 파일 없음)
  const copied = rewriteEdit(edit, { uid: 'uid', fromProject: 'p1', toProject: 'p2', fromImage: 'img-1', toImage: 'img-9' })
  eq('복사본: 라이브러리 그림 경로 그대로 · 복사할 파일에 없음', [copied.edit.bg.lib, copied.edit.bg.mode, copied.files.some(f => f.from.includes('scenes/') || f.to.includes('scenes/'))], [lib, 'library', false])
}

// ── 11. 바닥선(groundY) — 바닥이 있는 연출 배경에서 제품 밑면을 바닥선에 맞춘다 ──
{
  const mask = { path: 'uid/p1/bg/img-1/mask_0123456789abcdef.png', key: '0123456789abcdef', model: 'birefnet-v2', w: 800, h: 800 }
  const scenes = manifest.items.filter(i => i.category === 'scenes')
  eq('연출 배경 18장 모두 바닥선 · 배경(뒷배경)은 없음 · 값은 0.5~0.95', [
    scenes.length, scenes.every(i => i.groundY >= 0.5 && i.groundY <= 0.95), manifest.items.filter(i => i.category !== 'scenes').some(i => 'groundY' in i),
  ], [18, true, false])
  eq('이상한 바닥선은 그 칸만 빼고 알림', (() => {
    const r = readAssetManifest({ v: 1, categories: [{ key: 'scenes', label: '연출' }], items: [0, 1, -0.2, '0.8', 0.8].map((g, n) => ({ id: `s${n}`, category: 'scenes', label: '가', file: `scenes/s${n}.jpg`, w: 10, h: 10, use: 'bg', groundY: g })) })
    return [r.items.map(i => i.groundY ?? null), r.problems.length]
  })(), [[null, null, null, null, 0.8], 4])
  const scene = scenes[0]
  const lib = libFromEntry(scene)
  eq('목록 항목 → bg.lib에 바닥선도 담김 · 합성 값에도', [lib.groundY, bgLibUnder({ mask, mode: 'library', lib }).groundY], [scene.groundY, scene.groundY])
  const noG = libFromEntry(manifest.items.find(i => i.category === 'backgrounds' && i.use === 'bg'))
  eq('바닥선 없는 그림 = groundY 칸 없음', ['groundY' in noG, 'groundY' in bgLibUnder({ mask, mode: 'library', lib: noG })], [false, false])
  const bgG = readBg(clone(withBg({}, { mask, mode: 'library', lib })))
  eq('저장 → 읽기: 바닥선 그대로 · 화면 key에 바닥선', [bgG.lib.groundY, bgViewKey(bgG).endsWith(`|lib:${scene.file}@${scene.groundY}`)], [scene.groundY, true])
  eq('예전 bg.lib(바닥선 없음) = key가 예전 모양 그대로', bgViewKey({ mask, mode: 'library', lib: { asset: scene.file, w: 1200, h: 1200 } }), `|bg:${mask.path}|lib:${scene.file}`)
  eq('이상한 바닥선이 저장돼 있으면 그 칸만 빼고 읽음', quiet(() => readBg({ bg: { mask, mode: 'library', lib: { asset: scene.file, w: 1200, h: 1200, groundY: 3 } } })).lib, { asset: scene.file, w: 1200, h: 1200 })
  // 합성 범위: 그림 안 바닥선이 사진 속 제품 밑면 자리로 온다
  const mapY = (s, H, gy) => ((gy - s.sy) / s.sh) * H // 그림 y → 사진 y
  const s1 = libFitSource(1200, 1200, 1000, 1000, 0.8, 900)
  eq('정사각 그림·정사각 사진: 바닥선(0.8) → 제품 밑면(900) · 찌그러지지 않음 · 그림 밖으로 안 나감', [Math.round(mapY(s1, 1000, 960)), Math.abs(s1.sw / s1.sh - 1) < 1e-9, s1.sx >= 0 && s1.sy >= 0 && s1.sx + s1.sw <= 1200.0001 && s1.sy + s1.sh <= 1200.0001], [900, true, true])
  const s2 = libFitSource(1200, 1200, 1600, 900, 0.72, 500)
  eq('가로로 긴 사진(여유 있음): 키우지 않고 위아래만 옮김', [Math.round(mapY(s2, 900, 0.72 * 1200)), Math.round(s2.sw), Math.round(s2.sx)], [500, 1200, 0])
  const s3 = libFitSource(1200, 1200, 1000, 1000, 0.8, 100) // 제품이 사진 맨 위쪽에 있음 — 2배까지만 키움
  eq('맞추기가 너무 멀면 채우기의 2배까지만 키우고 그림 안에서 멈춤', [1000 / s3.sw <= (1000 / 1200) * 2 + 1e-9, s3.sy >= 0 && s3.sy + s3.sh <= 1200.0001], [true, true])
  eq('바닥선·제품 밑면이 없으면 예전 가운데 맞춤과 같음', [libFitSource(1200, 1200, 1600, 900, undefined, 500), libFitSource(1200, 1200, 1600, 900, 0.8, null)], [aiFitSource(1200, 1200, 1600, 900), aiFitSource(1200, 1200, 1600, 900)])
  // 마스크 밑면
  const m = new Uint8Array(4 * 5 * 1) // 4×5, 한 픽셀 1바이트
  m[2 * 4 + 1] = 255; m[3 * 4 + 2] = 100 // 2번 줄에 제품, 3번 줄은 128 이하(제품 아님)
  eq('마스크 밑면 = 제품이 있는 가장 아래 줄 + 1 · 없으면 null', [maskBottomRow(m, 4, 5, 1), maskBottomRow(new Uint8Array(20), 4, 5, 1)], [3, null])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
