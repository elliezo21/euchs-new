// 내보내기 엔진 테스트 (13-1단계) — node scripts/test-studio-export.mjs (가짜 캔버스)
import {
  exportPlan, canvasFits, CANVAS_LIMITS, sectionPixelSize, stackLayout, fileBaseName, exportFileName, sectionDrawList, imageIdsOf, fontNeedsOf,
  deviceVec, coverSource, photoDecor, textLineLayout, lookColorSteps, applyLookPixels, boxSizesForGauss,
  renderSection, renderPage, canvasToBlob, ExportError, EXPORT_FORMATS, GAP_COLOR, sliceRanges, renderSlice, SLICE_MAX_PX, SLICE_MIN_PX, SLICE_MAX_BYTES, JPG_QUALITY_STEPS, canvasToBlobUnder,
} from '../src/lib/studioExport.js'
import fs from 'node:fs'
import { normalizeTextItem } from '../src/lib/studioText.js'
import { normalizeShapeItem, normalizeLineItem } from '../src/lib/studioShape.js'
import { normalizeTableItem } from '../src/lib/studioTable.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol

// ── 가짜 캔버스: 부른 그리기를 log에 적는다 ──
const measure = (s, font) => [...s].length * font.fontSize * 0.5
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
    clip: () => rec('clip'),
    fill: p => rec('fill', ctx.fillStyle, p?.d ?? 'path'),
    stroke: p => rec('stroke', ctx.strokeStyle, p?.d ?? 'path'),
    setLineDash: d => rec('dash', d),
    fillText: (t, x, y) => rec('fillText', ctx.fillStyle, t, x, y),
    strokeText: (t, x, y) => rec('strokeText', ctx.strokeStyle, t, x, y),
    measureText: t => { const size = Number(/(\d+(?:\.\d+)?)px/.exec(ctx.font)[1]); return { width: [...t].length * size * 0.5, fontBoundingBoxAscent: size * 0.9, fontBoundingBoxDescent: size * 0.2 } },
    getImageData: (x, y, pw, ph) => ({ data: new Uint8ClampedArray(pw * ph * 4) }),
    putImageData: () => rec('putImageData'),
  }
  return { tag, width: w, height: h, getContext: () => ctx, toBlob: cb => cb(null) }
}
function fakeDeps(log, { fail = null, fontsOk = true } = {}) {
  let n = 0
  return {
    created: [],
    createCanvas(w, h) { const c = fakeCanvas(w, h, log, `c${n++}`); this.created.push(c); return c },
    Path2D: class { constructor(d) { this.d = d } },
    async getImage(id) { if (id === fail) throw new Error('사진 파일을 받지 못했어요'); return { source: { tag: `SRC-${id}` }, width: 1000, height: 500, notes: id === 'img-2' ? ['AI 결과 일부를 불러오지 못했어요'] : [] } },
    lookOf: () => null,
    measure,
    fontCalls: [],
    async prepareFonts(list) { this.fontCalls.push(list.length); return fontsOk },
  }
}

const base = { rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }
const img = (id, imageId, extra = {}) => ({ id, type: 'image', imageId, x: 0, y: 0, w: 780, h: 400, ...base, ...extra })
const text = (id, extra = {}) => normalizeTextItem({ id, type: 'text', text: '안녕', x: 100, y: 50, w: 400, h: 52, ...base, ...extra })
const shape = (id, extra = {}) => normalizeShapeItem({ id, type: 'shape', shape: 'rect', x: 10, y: 10, w: 100, h: 50, fill: '#ff0000', ...base, ...extra })
const line = (id, extra = {}) => normalizeLineItem({ id, type: 'line', x: 10, y: 200, w: 200, h: 24, ...base, ...extra })
const table = (id, extra = {}) => normalizeTableItem({ id, type: 'table', x: 20, y: 250, w: 300, h: 1, cells: [['사이즈', '가슴'], ['S', '90']], ...base, ...extra })
const page = sections => ({ v: 1, width: 780, gap: 0, parked: [], sections })

// ── 1. 크기·한계·파일 목록 ──
{
  const p = { ...page([{ id: 's1', height: 400, bg: '#fff', items: [] }, { id: 's2', height: 300, bg: '#fff', items: [] }, { id: 's3', height: 20000, bg: '#fff', items: [] }]), gap: 12 }
  eq('구간 크기 1배·2배', [sectionPixelSize(p, p.sections[0], 1), sectionPixelSize(p, p.sections[1], 2)], [{ width: 780, height: 400 }, { width: 1560, height: 600 }])
  eq('한 장 높이 = 높이 합 + 사이 간격', stackLayout(p, p.sections.slice(0, 2)), { tops: [0, 412], height: 712 })
  // 여러 장 (2026-10-02): 섹션 1개 = 1장이 아니라 이어 붙여 세로 SLICE_MAX_PX마다 — s1(400) + 간격 12 + s3(20000) = 20412
  const a = exportPlan(p, { mode: 'sections', scale: 1, sectionIds: ['s1', 's3'] })
  eq('여러 장: 이어 붙여 2500px마다 · 장 번호 1부터 · 첫 경계(412)는 500px보다 짧아 안 씀 · 마지막 장도 500px 이상', a.files.map(f => [f.no, f.width, f.height, f.fits]),
    [[1, 780, 2500, true], [2, 780, 2500, true], [3, 780, 2500, true], [4, 780, 2500, true], [5, 780, 2500, true], [6, 780, 2500, true], [7, 780, 2500, true], [8, 780, 2412, true], [9, 780, 500, true]])
  eq('여러 장: 장마다 걸친 섹션 · 고른 섹션 전체(pick) · 범위', [a.files[0].sectionIds, a.files[1].sectionIds, a.files[0].pick, a.files[8].range], [['s1', 's3'], ['s3'], ['s1', 's3'], { y0: 19912, y1: 20412 }])
  const b = exportPlan(p, { mode: 'sections', scale: 2, sectionIds: ['s1', 's3'] })
  eq('여러 장 2배: 기준은 받을 이미지 px — 예전처럼 40000px 한 장이 아니라 나눠서 한계 안', [b.tooLarge.length, Math.max(...b.files.map(f => f.height)), b.files.reduce((n, f) => n + f.height, 0)], [0, 2500, 40824])
  const l = exportPlan(p, { mode: 'long', scale: 2, sectionIds: ['s1', 's2'] })
  eq('한 장: 1560 × (712×2), 번호 없음', l.files.map(f => [f.no, f.width, f.height, f.sectionIds]), [[null, 1560, 1424, ['s1', 's2']]])
  eq('한 장: 빈 선택 = 파일 없음', exportPlan(p, { mode: 'long', scale: 1, sectionIds: [] }).files, [])
  eq('캔버스 한계: 한 변 32767', [canvasFits(780, 32767), canvasFits(780, 32768)], [true, false])
  eq('캔버스 한계: 넓이 16384²', [canvasFits(16384, 16384), canvasFits(16384, 16385)], [true, false])
  eq('캔버스 한계: 0·소수는 안 됨', [canvasFits(0, 10), canvasFits(10.5, 10)], [false, false])
  eq('한계 값', CANVAS_LIMITS, { maxSide: 32767, maxArea: 268435456 })
}
{
  eq('파일 이름: 못 쓰는 글자 → _', fileBaseName('3단/슬라이드:계란*보관함?'), '3단_슬라이드_계란_보관함_')
  eq('파일 이름: 앞뒤 공백·점 빼기', fileBaseName('  .계란 보관함.  '), '계란 보관함')
  eq('파일 이름: 비면 상세페이지', [fileBaseName(''), fileBaseName(null), fileBaseName('///'.replace(/\//g, '.'))], ['상세페이지', '상세페이지', '상세페이지'])
  eq('파일 이름: 60자까지', [...fileBaseName('가'.repeat(80))].length, 60)
  eq('파일 이름: 구간별 _01.jpg / 한 장 _전체.png', [exportFileName('계란', { no: 1 }, 'jpg'), exportFileName('계란', { no: 12 }, 'jpg'), exportFileName('계란', { no: null }, 'png')], ['계란_01.jpg', '계란_12.jpg', '계란_전체.png'])
  eq('형식: JPG 품질 92, PNG', [EXPORT_FORMATS.jpg.mime, EXPORT_FORMATS.jpg.quality, EXPORT_FORMATS.png.mime], ['image/jpeg', 0.92, 'image/png'])
}

// ── 2. 그릴 것 ──
{
  const s = { id: 's1', height: 400, bg: '#abcdef', items: [img('a', 'img-1'), text('b'), shape('c', { hidden: true }), { id: 'x', type: 'sticker', x: 0, y: 0, w: 5, h: 5 }, line('d'), img('e', 'img-1'), table('f')] }
  eq('그릴 것: 배열 순서, 숨김·모르는 종류 빼기', sectionDrawList(s).map(i => i.id), ['a', 'b', 'd', 'e', 'f'])
  eq('필요한 사진 (중복 없이)', imageIdsOf([s]), ['img-1'])
  eq('글꼴 준비 목록 (글자 1 + 표 2)', fontNeedsOf([s]).length, 3)
}

// ── 3. 기하 ──
{
  const v = deviceVec(0, 10, { rotation: 90 }, 2)
  eq('그림자 오프셋: 90° 돌리면 아래 → 왼쪽, 배율 2', [near(v.x, -20), near(v.y, 0)], [true, true])
  const f = deviceVec(5, 0, { rotation: 0, flipX: true }, 1)
  eq('그림자 오프셋: 좌우 뒤집으면 반대', f.x, -5)
  eq('cover: 가로 사진을 정사각 자리에 = 가운데 잘라냄', coverSource(1000, 500, 100, 100), { sx: 250, sy: 0, sw: 500, sh: 500 })
  eq('cover: 비율 같으면 전부', coverSource(800, 400, 400, 200), { sx: 0, sy: 0, sw: 800, sh: 400 })
  const d = photoDecor(img('a', 'i', { borderWidth: 10, borderColor: '#FF0000', radius: 30, shadow: 50 }))
  eq('사진 꾸미기: 안쪽 테두리·안쪽 모서리', [d.bw, d.color, d.radius, d.innerRadius, d.content], [10, '#ff0000', 30, 20, { x: 10, y: 10, w: 760, h: 380 }])
  eq('사진 그림자 = 화면 box-shadow 값', [near(d.shadow.oy, 6), near(d.shadow.blur, 20), d.shadow.color], [true, true, 'rgba(0, 0, 0, 0.225)'])
  eq('꾸미기 없음 = 그림자 없음', photoDecor(img('a', 'i')).shadow, null)
}
{
  const it = text('t', { w: 200, fontSize: 20, lineHeight: 1.5, letterSpacing: 0.1, align: 'center' })
  const L = textLineLayout(it, ['가나다', '가'], measure, { ascent: 18, descent: 4 })
  // 줄 폭 = 3×10 + 0.1×20×3 = 36 → 가운데 (200-36)/2 = 82. 기준선 = (30 - 22)/2 + 18 = 22, 둘째 줄 +30
  eq('글자 줄: 가운데 정렬(자간 포함 폭)·반쪽 행간 기준선', L.map(l => [l.x, l.baseline, l.width]), [[82, 22, 36], [94, 52, 12]])
  eq('글자 줄: 오른쪽', textLineLayout({ ...it, align: 'right' }, ['가'], measure, { ascent: 18, descent: 4 })[0].x, 188)
  eq('글자 줄: 넘치는 줄은 왼쪽부터', textLineLayout({ ...it, w: 20 }, ['가나다'], measure, { ascent: 18, descent: 4 })[0].x, 0)
}

// ── 4. 필터·조정 픽셀 ──
{
  const px = (r, g, b) => new Uint8ClampedArray([r, g, b, 255])
  const run = (look, d = px(100, 100, 100), w = 1, h = 1) => { applyLookPixels(d, w, h, look); return [...d.slice(0, 3)] }
  eq('밝기 +100 = 2배', run({ brightness: 100 }), [200, 200, 200])
  eq('대비 +100 = 2배 - 127.5 (72.5 → 72, 짝수 쪽 반올림)', run({ contrast: 100 }, px(200, 100, 50)), [255, 72, 0])
  eq('채도 -100 = 회색 (0.213·0.715·0.072)', run({ saturation: -100 }, px(255, 0, 0)), [54, 54, 54])
  eq('흑백 필터 (gray 100 + 대비 10)', run({ filter: 'mono' }, px(255, 0, 0)).every((v, _, a) => v === a[0]), true)
  eq('온도 +100 = 빨강 ×1.12·파랑 ×0.88', run({ warmth: 100 }), [112, 100, 88])
  eq('단계마다 0~255 자름 (밝기 뒤 대비)', run({ brightness: 100, contrast: -50 }, px(200, 0, 0)), [191, 64, 64])
  const flat = new Uint8ClampedArray(3 * 3 * 4).fill(120)
  applyLookPixels(flat, 3, 3, { sharpness: 100 })
  eq('선명도: 고른 색은 그대로', [...flat.slice(0, 3)], [120, 120, 120])
  const dot = new Uint8ClampedArray(3 * 3 * 4).fill(0)
  dot[4 * 4] = 100; dot[4 * 4 + 1] = 100; dot[4 * 4 + 2] = 100
  applyLookPixels(dot, 3, 3, { sharpness: 50 })
  eq('선명도 +50: 가운데 = 100 × (1 + 4×0.3)', dot[16], 220)
  const blurFlat = new Uint8ClampedArray(20 * 20 * 4).fill(77)
  applyLookPixels(blurFlat, 20, 20, { sharpness: -100 }, 4)
  eq('흐림: 고른 색은 그대로', [blurFlat[0], blurFlat[400 * 4 - 4]], [77, 77])
  eq('가우스 근사 상자 크기 (sigma 3)', boxSizesForGauss(3), [5, 5, 7])
  eq('색 단계: 기본값이면 없음', lookColorSteps({ brightness: 0, contrast: 0, saturation: 0, gray: 0, sepia: 0 }).length, 0)
}

// ── 5. 구간 그리기 (가짜 캔버스) ──
{
  const log = []
  const deps = fakeDeps(log)
  const s = { id: 's1', height: 400, bg: '#abcdef', items: [img('a', 'img-1'), shape('c'), shape('h', { hidden: true, fill: '#00ff00' }), line('d'), text('b'), table('f'), shape('o', { opacity: 0.5, fill: '#0000ff' })] }
  const r = await renderSection(page([s]), 's1', deps, { scale: 2 })
  const main = log.filter(e => e.c === 'c0')
  eq('캔버스 크기 = 페이지 × 2', [r.canvas.width, r.canvas.height], [1560, 800])
  eq('맨 처음 = 구간 배경', [main[1].op, main[1].args[0], main[1].args.slice(1)], ['fillRect', '#abcdef', [0, 0, 780, 400]])
  const pos = pred => main.findIndex(pred)
  const iImg = pos(e => e.op === 'drawImage' && e.args[0] === 'SRC-img-1')
  const iShape = pos(e => e.op === 'fill' && e.args[0] === 'rgba(255, 0, 0, 1)')
  const iLine = pos(e => e.op === 'stroke' && e.args[0] === '#111111')
  const iText = pos(e => e.op === 'fillText' && e.args[1] === '안녕')
  const iTable = pos(e => e.op === 'fillText' && e.args[1] === '사이즈')
  const iOp = pos(e => e.op === 'drawImage' && e.args[1] === 0.5)
  eq('그리는 순서 = 배열 순서 (사진 < 도형 < 선 < 글자 < 표 < 반투명 도형)', [iImg, iShape, iLine, iText, iTable, iOp].every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])), true)
  eq('숨긴 요소는 안 그림', log.some(e => e.op === 'fill' && e.args[0] === 'rgba(0, 255, 0, 1)'), false)
  eq('투명도 = 따로 한 장에 그린 뒤 0.5로 붙임', log.some(e => e.c !== 'c0' && e.op === 'fill' && e.args[0] === 'rgba(0, 0, 255, 1)'), true)
  eq('사진 = cover로 잘라 자리에 (1000×500 → 780×400)', main[iImg].args.slice(2).map(v => Math.round(v * 10) / 10), [12.5, 0, 975, 500, -390, -200, 780, 400])
  eq('글꼴 준비를 부름', deps.fontCalls, [3])
}
// ── 5-2. 단색 배경 (17-2): 사진 자리를 색으로 먼저 채우고, 필터는 사진 장(따로 만든 캔버스)에만 ──
{
  const log = []
  const deps = { ...fakeDeps(log), lookOf: () => ({ brightness: 60, contrast: 20 }) }
  deps.created = []
  const orig = deps.getImage
  deps.getImage = async id => ({ ...(await orig(id)), bgColor: '#f3ebe0' })
  const s = { id: 's1', height: 400, bg: '#abcdef', items: [img('a', 'img-1', { borderWidth: 10, borderColor: '#000000' })] }
  await renderSection(page([s]), 's1', deps, { scale: 1 })
  const main = log.filter(e => e.c === 'c0')
  const iFill = main.findIndex(e => e.op === 'fillRect' && e.args[0] === '#f3ebe0')
  const iPhoto = main.findIndex(e => e.op === 'drawImage' && e.args[0] !== 'SRC-img-1' && typeof e.args[0] === 'string' && e.args[0].startsWith('c'))
  eq('단색: 사진 자리(테두리 안쪽)를 색으로 먼저', [iFill >= 0, main[iFill]?.args.slice(1)], [true, [10, 10, 760, 380]])
  eq('단색: 그 다음 필터 적용한 사진 장을 그림', iPhoto > iFill, true)
  eq('단색: 필터를 거는 사진 장에는 색을 안 칠함(필터가 색을 못 바꿈)', log.some(e => e.c !== 'c0' && (e.op === 'fillRect' || e.op === 'fill') && e.args[0] === '#f3ebe0'), false)
  eq('단색: 사진 장 = 원본 사진만 그림', log.filter(e => e.c === 'c1' && e.op === 'drawImage').map(e => e.args[0]), ['SRC-img-1'])
}
{
  const log = []
  const deps = fakeDeps(log)
  const s = { id: 's1', height: 400, bg: '#abcdef', items: [img('a', 'img-1')] }
  await renderSection(page([s]), 's1', deps, { scale: 1 })
  eq('단색 없음(예전 사진): 사진 자리 채우기 없음', log.filter(e => e.c === 'c0' && e.op === 'fillRect').length, 1)
}
// ── 5-3. AI 배경 (17-4): 아래 그림을 사진과 같은 자리(cover)에 먼저, 필터는 사진 장에만 ──
{
  const log = []
  const deps = { ...fakeDeps(log), lookOf: () => ({ brightness: 60 }) }
  const orig = deps.getImage
  deps.getImage = async id => ({ ...(await orig(id)), bgSource: 'AIBG-img-1' })
  const s = { id: 's1', height: 400, bg: '#abcdef', items: [img('a', 'img-1', { flipX: true })] }
  await renderSection(page([s]), 's1', deps, { scale: 1 })
  const main = log.filter(e => e.c === 'c0')
  const iBg = main.findIndex(e => e.op === 'drawImage' && e.args[0] === 'AIBG-img-1')
  const iPhoto = main.findIndex(e => e.op === 'drawImage' && typeof e.args[0] === 'string' && /^c\d/.test(e.args[0]))
  eq('AI 배경: 아래 그림을 먼저 그림', [iBg >= 0, iPhoto > iBg], [true, true])
  eq('AI 배경: 사진과 같은 cover 자리', main[iBg].args.slice(2).map(v => Math.round(v * 10) / 10), [12.5, 0, 975, 500, -390, -200, 780, 400])
  eq('AI 배경: 필터 거는 사진 장에는 안 들어감', log.filter(e => e.c !== 'c0' && e.op === 'drawImage').map(e => e.args[0]), ['SRC-img-1'])
}
{
  const log = []
  const deps = fakeDeps(log)
  const s = { id: 's1', height: 400, bg: '#abcdef', items: [img('a', 'img-1')] }
  await renderSection(page([s]), 's1', deps, { scale: 1 })
  eq('AI 배경 없음(예전 사진): 사진 한 번만 그림', log.filter(e => e.c === 'c0' && e.op === 'drawImage').length, 1)
}
{
  const log = []
  const deps = fakeDeps(log)
  const s = { id: 's1', height: 400, bg: '#ffffff', items: [text('b', { strokeWidth: 3, strokeColor: '#000000', shadowY: 4, shadowBlur: 6, shadowOpacity: 0.5, bgColor: '#ffff00', rotation: 90 })] }
  await renderSection(page([s]), 's1', deps, { scale: 2 })
  const main = log.filter(e => e.c === 'c0')
  eq('글자: 배경 먼저 칠함', main.some(e => e.op === 'fill' && e.args[0] === 'rgba(255, 255, 0, 1)'), true)
  eq('글자: 테두리 → 채우기는 그림자 장에', log.filter(e => e.c === 'c1').map(e => e.op).filter(o => o === 'strokeText' || o === 'fillText'), ['strokeText', 'fillText'])
  eq('글자: 그림자 장을 한 번에 붙임', main.filter(e => e.op === 'drawImage' && e.args[0] === 'c1').length, 1)
}
{
  const log = []
  const s = { id: 's1', height: 400, bg: '#fff', items: [img('a', 'img-9')] }
  let err = null
  try { await renderSection(page([s]), 's1', fakeDeps(log, { fail: 'img-9' }), { scale: 1 }) } catch (e) { err = e }
  eq('사진을 못 받으면 어느 구간·사진인지', [err instanceof ExportError, err?.kind, err?.sectionId, err?.imageId], [true, 'image', 's1', 'img-9'])
  let err2 = null
  try { await renderSection(page([{ id: 's1', height: 100, bg: '#fff', items: [text('b')] }]), 's1', fakeDeps([], { fontsOk: false }), { scale: 1 }) } catch (e) { err2 = e }
  eq('글꼴을 못 받으면 알림', err2?.kind, 'font')
  let err3 = null
  try { await renderSection(page([{ id: 's1', height: 20000, bg: '#fff', items: [] }]), 's1', fakeDeps([]), { scale: 2 }) } catch (e) { err3 = e }
  eq('너무 긴 구간 = tooLarge', err3?.kind, 'tooLarge')
  const r = await renderSection(page([{ id: 's1', height: 100, bg: '#fff', items: [img('a', 'img-2')] }]), 's1', fakeDeps([]), { scale: 1 })
  eq('사진 준비 알림은 notes로 (조용히 넘기지 않음)', r.notes.map(n => [n.sectionId, n.imageId]), [['s1', 'img-2']])
}

// ── 1-2. 여러 장으로 나누기 (2026-10-02) — sliceRanges 순수 함수 · 섹션 경계 우선 ──
{
  eq('기준(2500)·최소(500) = 쿠팡 상한 5000 안 · 쿠팡 최소 500 · 한 장 용량 3MB · JPG 품질 0.92부터 낮춤', [SLICE_MAX_PX, SLICE_MIN_PX, SLICE_MAX_PX <= 5000, SLICE_MAX_BYTES, JPG_QUALITY_STEPS[0], JPG_QUALITY_STEPS.every((q, i, a) => i === 0 || q < a[i - 1])], [2500, 500, true, 3145728, 0.92, true])
  eq('기준보다 짧으면 한 장 · 0이면 없음', [sliceRanges(2000, [800]), sliceRanges(0, [])], [[[0, 2000]], []])
  eq('경계 우선: 기준 안에서 가장 아래 섹션 경계에서 자름', sliceRanges(7000, [1000, 2500, 4000, 5500], { maxPx: 3000 }), [[0, 2500], [2500, 5500], [5500, 7000]])
  eq('섹션 하나가 기준보다 길면 그 안에서 자름 · 마지막 장도 500px 이상', [sliceRanges(10000, [], { maxPx: 3000 }), sliceRanges(9200, [], { maxPx: 3000 })], [[[0, 3000], [3000, 6000], [6000, 9000], [9000, 10000]], [[0, 3000], [3000, 6000], [6000, 8700], [8700, 9200]]])
  eq('마지막 장이 너무 짧아지는 경계는 안 씀', sliceRanges(3100, [3050], { maxPx: 3000 }), [[0, 2600], [2600, 3100]])
  // 무작위 섹션으로: 빈틈·겹침 없음 · 모두 기준 이하 · 최소 이상 · 경계가 기준 안에 있으면 섹션 안에서 자르지 않음
  let bad = 0
  for (let t = 0; t < 300; t++) {
    let y = 0
    const hs = Array.from({ length: 1 + (t % 60) }, (_, i) => 100 + ((t * 7919 + i * 104729) % 4500))
    const tops = hs.map(h => { const top = y; y += h; return top })
    const r = sliceRanges(y, tops.slice(1))
    const ok = r[0][0] === 0 && r[r.length - 1][1] === y && r.every((x, i) => (i === 0 || x[0] === r[i - 1][1]) && x[1] - x[0] <= SLICE_MAX_PX && (r.length === 1 || x[1] - x[0] >= SLICE_MIN_PX))
    if (!ok) bad++
  }
  eq('무작위 300개: 빈틈·겹침 없음 · 한 장 500~3000px', bad, 0)
  // 운영 사례 크기(섹션 50개) — 예전 50장
  const p50 = { ...page(Array.from({ length: 50 }, (_, i) => ({ id: `x${i}`, height: 900, bg: '#fff', items: [] }))), gap: 0 }
  const f50 = exportPlan(p50, { mode: 'sections', scale: 1, sectionIds: p50.sections.map(s => s.id) }).files
  eq('섹션 50개(900px) 1배: 50장 → 25장(한 장 = 섹션 2개) · 모두 섹션 경계에서 자름', [f50.length, f50.every(f => f.range.y0 % 900 === 0 && (f.range.y1 % 900 === 0))], [25, true])
}

// ── 1-3. 나눈 한 장 그리기 (renderSlice) ──
{
  const p = { ...page([{ id: 's1', height: 1000, bg: '#111111', items: [] }, { id: 's2', height: 4000, bg: '#222222', items: [] }, { id: 's3', height: 800, bg: '#333333', items: [] }]), gap: 0 }
  const files = exportPlan(p, { mode: 'sections', scale: 1, sectionIds: ['s1', 's2', 's3'] }).files
  eq('계획: [0,1000] 경계에서 · [1000,3500] 긴 s2 안에서 · [3500,5800] s2 나머지 + s3', files.map(f => [f.range.y0, f.range.y1, f.sectionIds]), [[0, 1000, ['s1']], [1000, 3500, ['s2']], [3500, 5800, ['s2', 's3']]])
  const log = [], deps = fakeDeps(log), cache = { entry: null }
  const out = []
  for (const f of files) out.push(await renderSlice(p, f, deps, { scale: 1, cache }))
  eq('장 크기 = 범위 높이', out.map(r => [r.canvas.width, r.canvas.height]), [[780, 1000], [780, 2500], [780, 2300]])
  eq('걸친 섹션은 한 번만 그림(cache) · 끝나면 남긴 그림 없음', [deps.created.filter(c => c.tag !== out[0].canvas.tag && c.tag !== out[1].canvas.tag && c.tag !== out[2].canvas.tag).length, cache.entry], [3, null])
  const draws = tag => log.filter(e => e.c === tag && e.op === 'drawImage').map(e => e.args.slice(2))
  eq('제자리에 붙임: 1장 s1 (0,0) · 2장 s2 (0,0) · 3장 s2를 위로 2500 올리고 s3 (0,1500)', [draws(out[0].canvas.tag), draws(out[1].canvas.tag), draws(out[2].canvas.tag)], [[[0, 0]], [[0, 0]], [[0, -2500], [0, 1500]]])
  const log2 = [], deps2 = fakeDeps(log2)
  for (const f of files) await renderSlice(p, f, deps2, { scale: 1 })
  eq('cache 없이도 같은 결과(걸친 섹션은 두 번 그림)', deps2.created.length, 3 + 4)
}

// ── 1-4. 나눈 한 장 3MB 맞춤 (canvasToBlobUnder) ──
{
  // 가짜 캔버스: 품질에 따라 크기가 달라지는 파일 (품질 0.92 = 5MB … 0.7 = 2.9MB)
  const sized = sizeOf => ({ width: 780, height: 2500, calls: [], toBlob(cb, mime, q) { this.calls.push([mime, q]); cb({ size: sizeOf(q), type: mime }) } })
  const MB = 1024 * 1024
  const c1 = sized(q => (q >= 0.92 ? 5 * MB : q >= 0.85 ? 3.5 * MB : q >= 0.78 ? 3.1 * MB : 2.9 * MB))
  const r1 = await canvasToBlobUnder(c1, 'jpg')
  eq('3MB 넘으면 품질을 0.92 → 0.85 → 0.78 → 0.7로 낮춰 3MB 이하에서 멈춤', [r1.quality, r1.blob.size <= SLICE_MAX_BYTES, c1.calls.map(x => x[1])], [0.7, true, [0.92, 0.85, 0.78, 0.7]])
  const c2 = sized(() => MB)
  const r2 = await canvasToBlobUnder(c2, 'jpg')
  eq('처음부터 3MB 이하면 품질 0.92 그대로 한 번만', [r2.quality, c2.calls.length], [0.92, 1])
  const c3 = sized(() => 4 * MB)
  const warns = [], ow = console.warn
  console.warn = (...a) => warns.push(a.join(' '))
  const r3 = await canvasToBlobUnder(c3, 'jpg')
  console.warn = ow
  eq('가장 낮은 품질로도 넘으면 그 파일 + console.warn (조용히 넘기지 않음)', [r3.quality, c3.calls.length, warns.length], [0.5, JPG_QUALITY_STEPS.length, 1])
  const c4 = sized(() => 9 * MB)
  const r4 = await canvasToBlobUnder(c4, 'png')
  eq('PNG는 품질을 낮출 수 없어 그대로 한 번', [r4.quality, c4.calls.length, c4.calls[0][0]], [null, 1, 'image/png'])
  // 그리기 함수는 2026-10-02부터 studioExportDeps.renderExportFile 하나 — 편집기([다운로드]·미리보기)와 편집기 밖(상세 이미지 뒤에서·보낼 때 만들기)이 같이 쓴다
  const deps = fs.readFileSync(new URL('../src/lib/studioExportDeps.js', import.meta.url), 'utf8')
  const ed = fs.readFileSync(new URL('../src/views/studio/StudioEditorView.vue', import.meta.url), 'utf8')
  const pi = fs.readFileSync(new URL('../src/lib/studioProductImages.js', import.meta.url), 'utf8')
  eq('배선: 나눈 한 장(file.range)만 canvasToBlobUnder · 한 장으로 길게·미리보기는 예전 그대로 · 편집기·편집기 밖 같은 함수', [
    deps.includes('const blob = file.range ? (await canvasToBlobUnder(out.canvas, format)).blob : await canvasToBlob(out.canvas, format)'),
    /renderExportFile\(page\.value, file, exportKit\.deps/.test(ed), /renderExportFile\(page, file, deps/.test(pi),
  ], [true, true, true])
}

// ── 6. 한 장으로 길게 ──
{
  const log = []
  const deps = fakeDeps(log)
  const p = { ...page([{ id: 's1', height: 100, bg: '#111111', items: [] }, { id: 's2', height: 50, bg: '#222222', items: [] }, { id: 's3', height: 70, bg: '#333333', items: [] }]), gap: 10 }
  const steps = []
  const r = await renderPage(p, ['s1', 's3'], deps, { scale: 2, onStep: (i, n, id) => steps.push([i, n, id]) })
  eq('한 장 크기 (100 + 10 + 70) × 2', [r.canvas.width, r.canvas.height], [1560, 360])
  eq('간격 = 흰색 바탕 먼저', log.filter(e => e.c === 'c0')[0].args.slice(0, 1), [GAP_COLOR])
  eq('구간을 제자리에 붙임 (0, 220)', log.filter(e => e.c === 'c0' && e.op === 'drawImage').map(e => e.args.slice(2)), [[0, 0], [0, 220]])
  eq('진행 알림 = 몇 번째 구간', steps, [[0, 2, 's1'], [1, 2, 's3']])
  let e1 = null
  try { await renderPage({ ...p, sections: Array.from({ length: 3 }, (_, i) => ({ id: `t${i}`, height: 20000, bg: '#fff', items: [] })) }, ['t0', 't1'], fakeDeps([]), { scale: 1 }) } catch (e) { e1 = e }
  eq('한 장이 캔버스 한계를 넘으면 tooLarge', e1?.kind, 'tooLarge')
  let e2 = null
  try { await canvasToBlob(fakeCanvas(1, 1, [], 'z'), 'jpg') } catch (e) { e2 = e }
  eq('파일을 못 만들면 encode 오류', e2?.kind, 'encode')
}

console.log(`\n${pass} PASS / ${fail} FAIL`)
if (fail) process.exit(1)
