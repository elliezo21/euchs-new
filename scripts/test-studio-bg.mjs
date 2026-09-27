// 배경 지우기(17-1) 순수 함수 테스트 — node scripts/test-studio-bg.mjs
// 마스크 합성(제품 색 불변) · PNG 읽기/쓰기 · 알파만 뽑기 · edit.bg 읽기/쓰기 · 공급자(fal) 요청 모양·모델 전환·실패 · 주문 상태 목록 · 복사 경로
// fal은 부르지 않는다 (가짜 fetch). 시크릿을 쓰지 않는다.
import fs from 'fs'
import {
  applyMaskToRgba, readBg, withBg, bgActive, bgViewKey, bgMark, bgFromServer, bgPaintColor, normalizeBgColor, BG_COLOR_SWATCHES,
} from '../src/lib/studioBg.js'
import { decodePng, maskOf, encodeGrayPng, encodeRgbaPng, resizeGray } from '../api/_studioPng.js'
import {
  bgProviderConfig, falHeaders, removeBackground, BgProviderError, BG_MODELS, DEFAULT_BG_MODEL, FAL_RUN_BASE,
} from '../api/_studioBgProvider.js'
import { ORDER_OK_STATUSES, bgMaskKey, buildMaskPng, kstDayStartIso, bgDailyLimit } from '../api/_studioBg.js'
import { rewriteEdit, buildCopyPlan, newBgPath } from '../api/_studioCopy.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)?.slice(0, 160)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
async function throwsCode(name, fn, code) {
  try { await fn(); eq(name, 'throw 안 함', code) } catch (e) { eq(name, e.code || e.message, code) }
}

// ── 1. 알파만 곱한다 — 제품 색(R·G·B)은 절대 바뀌지 않는다 ──
{
  const N = 64
  const rgba = new Uint8ClampedArray(N * 4)
  const mask = new Uint8ClampedArray(N * 4)
  for (let i = 0; i < N; i++) {
    rgba[i * 4] = (i * 37) & 255; rgba[i * 4 + 1] = (i * 91) & 255; rgba[i * 4 + 2] = (i * 13) & 255; rgba[i * 4 + 3] = 255
    const m = i % 4 === 0 ? 255 : i % 4 === 1 ? 0 : i % 4 === 2 ? 128 : 7
    mask[i * 4] = m; mask[i * 4 + 1] = m; mask[i * 4 + 2] = m; mask[i * 4 + 3] = 255
  }
  const before = Array.from(rgba)
  applyMaskToRgba(rgba, mask, 4)
  let colorSame = true, alphaOk = true, productSame = true
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) if (rgba[i * 4 + k] !== before[i * 4 + k]) colorSame = false
    const m = mask[i * 4]
    if (rgba[i * 4 + 3] !== Math.round(255 * m / 255)) alphaOk = false
    if (m === 255) for (let k = 0; k < 4; k++) if (rgba[i * 4 + k] !== before[i * 4 + k]) productSame = false
  }
  eq('R·G·B는 모든 픽셀에서 그대로', colorSame, true)
  eq('A = A × 마스크 / 255', alphaOk, true)
  eq('마스크 255(제품) 픽셀은 네 값 모두 그대로', productSame, true)
  // 원래 반투명한 원본 (PNG 원본) — 알파끼리 곱한다
  const px = new Uint8ClampedArray([10, 20, 30, 200])
  applyMaskToRgba(px, new Uint8ClampedArray([128]), 1)
  eq('반투명 원본 × 마스크 128 (stride 1)', Array.from(px), [10, 20, 30, 100])
  await throwsCode('마스크가 사진보다 작으면 throw', () => applyMaskToRgba(new Uint8ClampedArray(8), new Uint8ClampedArray(4), 4), '마스크 크기가 사진과 달라요')
}

// ── 2. PNG 읽기·쓰기 · 알파만 뽑기 ──
{
  const W = 5, H = 3
  const rgba = new Uint8Array(W * H * 4)
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = 250; rgba[i * 4 + 1] = i; rgba[i * 4 + 2] = 3; rgba[i * 4 + 3] = i * 17 }
  const m = maskOf(decodePng(encodeRgbaPng(rgba, W, H)))
  eq('RGBA PNG → 마스크 = 알파 값만', [m.width, m.height, m.from, Array.from(m.mask)], [W, H, 'alpha', Array.from({ length: W * H }, (_, i) => i * 17)])
  const gray = new Uint8Array([0, 64, 128, 255, 1, 2])
  const g = decodePng(encodeGrayPng(gray, 3, 2))
  eq('회색 PNG 쓰기 → 읽기 그대로', [g.colorType, g.bitDepth, Array.from(maskOf(g).mask), maskOf(g).from], [0, 8, Array.from(gray), 'gray'])
  eq('크기 맞춤 같은 크기면 그대로', resizeGray(gray, 3, 2, 3, 2) === gray, true)
  const up = resizeGray(new Uint8Array([0, 255]), 2, 1, 4, 1)
  eq('크기 맞춤 양선형 (0,255 → 4칸)', Array.from(up), [0, 64, 191, 255])
  const built = buildMaskPng(encodeRgbaPng(rgba, W, H), 10, 6)
  const back = decodePng(built.png)
  eq('buildMaskPng: 원본 크기 8비트 회색으로 맞춤', [back.width, back.height, back.colorType, back.bitDepth, built.resized, built.from], [10, 6, 0, 8, true, 'alpha'])
  await throwsCode('PNG 아닌 바이트 → throw', () => decodePng(Buffer.from('not a png at all, definitely not a png')), 'PNG가 아닙니다')
  // RGB(알파 없음)는 마스크로 쓰지 않는다
  const rgbPng = (() => {
    const p = encodeRgbaPng(new Uint8Array(4), 1, 1)
    const d = decodePng(p); d.colorType = 2; d.channels = 3; return d
  })()
  await throwsCode('알파 없는 RGB → throw', () => maskOf(rgbPng), '결과 PNG에 투명 정보가 없습니다 (RGB)')
}

// ── 3. edit.bg 읽기·쓰기 ──
{
  const PATH = 'u1/p1/bg/i1/mask_0123456789abcdef.png'
  const bg = bgFromServer({ path: PATH, key: '0123456789abcdef', model: 'birefnet-v2', width: 800, height: 600 })
  eq('서버 응답 → bg (투명으로 시작)', bg, { mask: { path: PATH, key: '0123456789abcdef', model: 'birefnet-v2', w: 800, h: 600 }, mode: 'transparent' })
  const edit = { v: 2, layers: [{ id: 'f_aaaaaa' }], look: { filter: 'mono' }, crop: { x: 1, y: 1, w: 30, h: 30 }, erase_v: 3 }
  const e2 = withBg(edit, bg)
  eq('withBg: 다른 칸은 그대로', [e2.layers, e2.look, e2.crop, e2.erase_v], [edit.layers, edit.look, edit.crop, 3])
  eq('readBg(withBg) 그대로', readBg(e2), bg)
  eq('withBg(null) → bg 칸 없음', 'bg' in withBg(e2, null), false)
  eq('모드 none이면 적용 안 함·key 조각 없음', [bgActive({ ...bg, mode: 'none' }), bgViewKey({ ...bg, mode: 'none' }), bgMark({ ...bg, mode: 'none' })], [false, '', ''])
  eq('투명이면 적용·key 조각·표시', [bgActive(bg), bgViewKey(bg), bgMark(bg)], [true, `|bg:${PATH}`, '배경 지움'])
  const orig = console.error; console.error = () => {}
  eq('이상한 경로·크기 → null', [readBg({ bg: { mask: { path: '../x.png', w: 1, h: 1 } } }), readBg({ bg: { mask: { path: PATH, w: 0, h: 1 } } })], [null, null])
  console.error = orig
  eq('모르는 모드 → transparent', readBg({ bg: { mask: bg.mask, mode: 'weird' } }).mode, 'transparent')
}

// ── 3-2. 단색 배경 (17-2) — mode 'color' 읽기·쓰기·옛 데이터 호환 ──
{
  const PATH = 'u1/p1/bg/i1/mask_0123456789abcdef.png'
  const mask = { path: PATH, key: '0123456789abcdef', model: 'birefnet-v2', w: 800, h: 600 }
  const warn = console.warn; console.warn = () => {}
  eq('color 읽기 (대문자 → 소문자)', readBg({ bg: { mask, mode: 'color', color: '#F1F2F4' } }), { mask, mode: 'color', color: '#f1f2f4' })
  eq('잘못된 색 → 흰색', [readBg({ bg: { mask, mode: 'color', color: 'red' } }).color, readBg({ bg: { mask, mode: 'color' } }).color, readBg({ bg: { mask, mode: 'color', color: '#12345' } }).color], ['#ffffff', '#ffffff', '#ffffff'])
  console.warn = warn
  eq('옛 데이터(transparent·none, color 없음) 그대로', [readBg({ bg: { mask, mode: 'transparent' } }), readBg({ bg: { mask, mode: 'none' } })], [{ mask, mode: 'transparent' }, { mask, mode: 'none' }])
  const e = withBg({ v: 2, layers: [] }, { mask, mode: 'color', color: '#F9E4E8' })
  eq('withBg: color 저장(소문자)', e.bg, { mask, mode: 'color', color: '#f9e4e8' })
  eq('withBg: 잘못된 color는 저장 안 함', 'color' in withBg({}, { mask, mode: 'transparent', color: 'x' }).bg, false)
  eq('다른 모드로 바꿔도 색은 남음(돌아오면 그 색)', readBg(withBg({}, { mask, mode: 'transparent', color: '#e3eff9' })), { mask, mode: 'transparent', color: '#e3eff9' })
  const bg = { mask, mode: 'color', color: '#111111' }
  eq('단색: 마스크 적용·key 조각(색 없음 — 색을 바꿔도 사진 다시 안 만듦)', [bgActive(bg), bgViewKey(bg), bgViewKey({ ...bg, color: '#ffffff' })], [true, `|bg:${PATH}`, `|bg:${PATH}`])
  eq('깔 색: color 모드만', [bgPaintColor(bg), bgPaintColor({ ...bg, mode: 'transparent' }), bgPaintColor({ ...bg, mode: 'none' }), bgPaintColor(null)], ['#111111', null, null, null])
  eq('표시: 단색 = "배경 단색", 투명 = "배경 지움"', [bgMark(bg), bgMark({ ...bg, mode: 'transparent' })], ['배경 단색', '배경 지움'])
  eq('견본 6개 · 모두 #rrggbb', [BG_COLOR_SWATCHES.length, BG_COLOR_SWATCHES.every(s => normalizeBgColor(s.value) === s.value)], [6, true])
}

// ── 3-3. 단색 합성 — 사진 = 마스크로 투명, 그 아래 색 (source-over). 제품 픽셀 불변 · 배경 자리 = 고른 색 · 가장자리는 섞임 ──
{
  // 화면(상자 배경 + img)·내보내기(fillRect + drawImage) 모두 "색 위에 투명한 사진을 source-over"와 같다
  const over = (rgba, color) => { // 브라우저 합성식 (색은 불투명)
    const [cr, cg, cb] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
    const a = rgba[3] / 255
    return [Math.round(rgba[0] * a + cr * (1 - a)), Math.round(rgba[1] * a + cg * (1 - a)), Math.round(rgba[2] * a + cb * (1 - a)), 255]
  }
  const px = new Uint8ClampedArray([201, 162, 122, 255, 30, 60, 90, 255, 200, 100, 50, 255])
  applyMaskToRgba(px, new Uint8ClampedArray([255, 0, 128]), 1)
  const c = '#f3ebe0'
  eq('제품(마스크 255) = 원본 색 그대로', over(px.slice(0, 4), c), [201, 162, 122, 255])
  eq('배경(마스크 0) = 고른 색', over(px.slice(4, 8), c), [243, 235, 224, 255])
  eq('가장자리(마스크 128) = 제품과 색이 반씩', over(px.slice(8, 12), c), [Math.round(200 * 128 / 255 + 243 * 127 / 255), Math.round(100 * 128 / 255 + 235 * 127 / 255), Math.round(50 * 128 / 255 + 224 * 127 / 255), 255])
}

// ── 4. 공급자 설정 · 모델 전환 ──
{
  const warn = console.warn; console.warn = () => {}
  eq('기본 모델', [bgProviderConfig({}).modelKey, DEFAULT_BG_MODEL], ['birefnet-v2', 'birefnet-v2'])
  eq('키 없음 → ready false', bgProviderConfig({}).ready, false)
  eq('bria로 전환', [bgProviderConfig({ STUDIO_BG_MODEL: 'bria-rmbg2', FAL_KEY: 'k' }).model.endpoint, bgProviderConfig({ FAL_KEY: 'k' }).ready], ['fal-ai/bria/background/remove', true])
  eq('모르는 모델 → 기본값', bgProviderConfig({ STUDIO_BG_MODEL: 'xx' }).modelKey, 'birefnet-v2')
  console.warn = warn
  eq('비용 추정 birefnet 2.5초 / bria 장당', [BG_MODELS['birefnet-v2'].costUsd(2500), BG_MODELS['bria-rmbg2'].costUsd(9000)], [0.002, 0.018])
  eq('fal 머리: X-Fal-Store-IO 0 · Key 인증', [falHeaders('abc')['X-Fal-Store-IO'], falHeaders('abc').Authorization], ['0', 'Key abc'])
  eq('하루 한도 기본 300 · 환경변수', [bgDailyLimit({}), bgDailyLimit({ STUDIO_BG_DAILY_LIMIT: '5' })], [300, 5])
  eq('KST 하루 시작', kstDayStartIso(new Date('2026-09-27T16:30:00Z')), '2026-09-28T00:00:00+09:00')
  eq('마스크 key = 원본·모델마다 다름(16자)', [bgMaskKey('a/b/orig/c.jpg', 'x').length, bgMaskKey('a', 'x') !== bgMaskKey('a', 'y')], [16, true])
}

// ── 5. 공급자 요청 (가짜 fetch) — 끝점·머리·본문·data URI·주소·실패·시간 초과 ──
{
  const W = 2, H = 2
  const png = encodeRgbaPng(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 0, 7, 8, 9, 128, 1, 1, 1, 255]), W, H)
  const calls = []
  const ok = mode => async (url, opts = {}) => {
    calls.push({ url, opts })
    if (url.startsWith('https://v3.fal.media/')) return new Response(png, { status: 200 })
    const img = mode === 'data' ? `data:image/png;base64,${png.toString('base64')}` : 'https://v3.fal.media/files/x.png'
    return new Response(JSON.stringify({ image: { url: img, width: W, height: H } }), { status: 200 })
  }
  for (const key of ['birefnet-v2', 'bria-rmbg2']) {
    calls.length = 0
    const r = await removeBackground({ falKey: 'test-key', modelKey: key, imageUrl: 'https://mock.local/signed?token=t', fetchImpl: ok('data') })
    const c = calls[0]
    eq(`${key}: 끝점·머리·본문`, [c.url, c.opts.method, c.opts.headers['X-Fal-Store-IO'], c.opts.headers.Authorization, JSON.parse(c.opts.body)],
      [`${FAL_RUN_BASE}/${BG_MODELS[key].endpoint}`, 'POST', '0', 'Key test-key', { image_url: 'https://mock.local/signed?token=t', sync_mode: true }])
    eq(`${key}: data URI 결과 → 바이트`, [r.via, r.buf.equals(png), calls.length], ['data', true, 1])
  }
  calls.length = 0
  const warn = console.warn; console.warn = () => {}
  const r2 = await removeBackground({ falKey: 'k', modelKey: 'birefnet-v2', imageUrl: 'https://x', fetchImpl: ok('url') })
  console.warn = warn
  eq('sync_mode가 무시돼 주소가 오면 바로 받아 옴(인증 머리 없이)', [r2.via, r2.buf.equals(png), calls.length, calls[1].opts.headers], ['url', true, 2, undefined])
  await throwsCode('fal 500 → bg_failed', () => removeBackground({ falKey: 'k', modelKey: 'birefnet-v2', imageUrl: 'https://x', fetchImpl: async () => new Response('{"detail":"x"}', { status: 500 }) }), 'bg_failed')
  await throwsCode('fal 504 → bg_timeout', () => removeBackground({ falKey: 'k', modelKey: 'birefnet-v2', imageUrl: 'https://x', fetchImpl: async () => new Response('', { status: 504 }) }), 'bg_timeout')
  await throwsCode('응답에 image.url 없음 → bg_failed', () => removeBackground({ falKey: 'k', modelKey: 'birefnet-v2', imageUrl: 'https://x', fetchImpl: async () => new Response('{}', { status: 200 }) }), 'bg_failed')
  const hang = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e) }))
  await throwsCode('시간 초과 → bg_timeout', () => removeBackground({ falKey: 'k', modelKey: 'birefnet-v2', imageUrl: 'https://x', timeoutMs: 30, fetchImpl: hang }), 'bg_timeout')
  await throwsCode('키 없음 → 부르지 않음', () => removeBackground({ falKey: '', modelKey: 'birefnet-v2', imageUrl: 'https://x', fetchImpl: () => { throw new Error('불림') } }), 'bg_failed')
  eq('BgProviderError 종류', new BgProviderError('bg_failed', 'x') instanceof Error, true)
}

// ── 6. 주문 상태 목록 = orderPipeline.js에서 결제 확인(3단계) 이후 값 전부 ──
{
  const src = fs.readFileSync(new URL('../src/lib/orderPipeline.js', import.meta.url), 'utf8')
  const statuses = new Function(`return ${/PIPELINE_STATUSES = (\[[\s\S]*?\n\]);/.exec(src)[1]}`)()
  const alias = new Function(`return ${/STATUS_ALIAS_MAP = (\{[\s\S]*?\n\});/.exec(src)[1]}`)()
  const codeOf = new Map(statuses.map(s => [s.key, s.code]))
  const want = Object.keys(alias).filter(k => (codeOf.get(alias[k]) || 0) >= 3).sort()
  eq('ORDER_OK_STATUSES = code ≥ 3인 원래 값 전부', [...ORDER_OK_STATUSES].sort(), want)
  eq('견적·취소·반려는 빠짐', ['quote_pending', 'quote_confirmed', 'pending', 'cancelled', 'rejected'].some(s => ORDER_OK_STATUSES.includes(s)), false)
}

// ── 7. 복사본: bg 마스크도 새 작업 폴더로 ──
{
  const ids = { uid: 'u', fromProject: 'p1', toProject: 'p2', fromImage: 'i1', toImage: 'i2' }
  const edit = { v: 2, layers: [{ id: 'f_aaaaaa', ai: { patch: { path: 'u/p1/patches/i1/f_aaaaaa_0123456789abcdef.png' } } }], bg: { mask: { path: 'u/p1/bg/i1/mask_0123456789abcdef.png', w: 1, h: 1 }, mode: 'transparent' } }
  const r = rewriteEdit(edit, ids)
  eq('rewriteEdit: bg 경로 바꿈', r.edit.bg.mask.path, 'u/p2/bg/i2/mask_0123456789abcdef.png')
  eq('rewriteEdit: 복사할 파일에 bg', r.files.map(f => [f.kind, f.to]), [['patch', 'u/p2/patches/i2/f_aaaaaa_0123456789abcdef.png'], ['bg', 'u/p2/bg/i2/mask_0123456789abcdef.png']])
  eq('원본 edit는 그대로', edit.bg.mask.path, 'u/p1/bg/i1/mask_0123456789abcdef.png')
  await throwsCode('남의 폴더 bg 경로 → copy_bad_path', () => newBgPath('x/p1/bg/i1/mask_0123456789abcdef.png', ids), 'copy_bad_path')
  await throwsCode('이름 규칙 밖 → copy_bad_path', () => newBgPath('u/p1/bg/i1/other.png', ids), 'copy_bad_path')
  const plan = buildCopyPlan({
    uid: 'u', project: { id: 'p1', page: null, expires_at: 'x', source_type: 'upload', desc_source: 'none', status: 'ready', title: 't' },
    images: [{ id: 'i1', original_path: 'u/p1/orig/i1.jpg', edit, final_rendered_version: null }],
    newProjectId: 'p2', newImageId: () => 'i2', hiddenAt: 'h',
  })
  eq('buildCopyPlan: bg 파일(없어도 되는 파일)', plan.files.filter(f => f.kind === 'bg').map(f => [f.from, f.to, f.required]),
    [['u/p1/bg/i1/mask_0123456789abcdef.png', 'u/p2/bg/i2/mask_0123456789abcdef.png', false]])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
