// 흰 배경·단색 배경 무료 지우기 (2026-09-29) 순수 함수 테스트 — node scripts/test-studio-bg-local.mjs
// 단색 판정 · 흰 배경 제거 뒤 투명 비율 · 단색 아님 판정 · 테두리에서만 채움 · 가장자리 부드럽게 · 저장 모양(bg_remove와 같음)
import fs from 'fs'
import {
  analyzeBorder, localBackgroundMask, floodFromBorder, boxBlur, transparentRatio, LOCAL_BG_MODEL, BORDER_SHARE,
} from '../src/lib/studioBgLocal.js'
import { readBg, bgFromServer, applyMaskToRgba } from '../src/lib/studioBg.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)?.slice(0, 160)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const near = (a, b, d) => Math.abs(a - b) <= d

// ── 가짜 사진 만들기 ──
function image(W, H, bg) {
  const d = new Uint8ClampedArray(W * H * 4)
  for (let p = 0; p < W * H; p++) { const c = typeof bg === 'function' ? bg(p % W, (p / W) | 0) : bg; d.set([c[0], c[1], c[2], c[3] ?? 255], p * 4) }
  return d
}
function rect(d, W, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) d.set([c[0], c[1], c[2], 255], (y * W + x) * 4)
}
let seed = 7
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const WHITE = [255, 255, 255]

// ── 1. 단색 판정 ──
{
  const W = 200, H = 150
  const white = image(W, H, WHITE)
  rect(white, W, 50, 40, 100, 70, [180, 40, 40])
  const a = analyzeBorder(white, W, H)
  eq('흰 배경 → 단색 · 배경색 흰색 · 테두리 전부 같음', [a.solid, a.color, a.share], [true, WHITE, 1])

  // JPG 잡티 (±6) 섞인 흰색도 단색
  const noisy = image(W, H, () => { const v = 255 - Math.round(rnd() * 6); return [v, v, 255 - Math.round(rnd() * 6)] })
  const b = analyzeBorder(noisy, W, H)
  eq('잡티 섞인 흰색 → 단색', [b.solid, b.share >= BORDER_SHARE, b.color.every(v => v >= 248)], [true, true, true])

  // 연회색 단색 배경 (흰색 아닌 단색)
  const gray = image(W, H, [228, 230, 232])
  rect(gray, W, 60, 30, 80, 90, [20, 90, 160])
  const g = analyzeBorder(gray, W, H)
  eq('연회색 단색 배경 → 단색 · 그 색', [g.solid, g.color], [true, [228, 230, 232]])

  // 제품이 테두리 일부에 닿아도(8% 미만) 단색
  const touch = image(W, H, WHITE)
  rect(touch, W, 0, 60, 40, 20, [10, 10, 10]) // 왼쪽 테두리 20px
  eq('제품이 테두리에 조금 닿음 → 여전히 단색', analyzeBorder(touch, W, H).solid, true)

  // 투명 PNG (테두리가 이미 투명)
  const clear = image(W, H, [0, 0, 0, 0])
  rect(clear, W, 50, 50, 50, 50, [200, 100, 0])
  const c = analyzeBorder(clear, W, H)
  eq('테두리가 이미 투명 → 단색으로 봄(clear)', [c.solid, c.clear], [true, true])
}

// ── 2. 흰 배경 제거 뒤 투명 비율 ──
{
  const W = 200, H = 150
  const d = image(W, H, WHITE)
  rect(d, W, 50, 40, 100, 70, [180, 40, 40]) // 제품 = 100×70 = 7000px (전체 30000px 중 23.3%)
  const r = localBackgroundMask(d, W, H)
  eq('흰 배경 지우기 → ok', r.ok, true)
  const want = 1 - (100 * 70) / (W * H)
  // 가장자리를 부드럽게 해서 경계 1~2px은 0도 255도 아님 → 투명 비율은 조금 작다
  eq('투명 비율 ≈ 1 − 제품 면적 (가장자리 2px 안)', near(transparentRatio(r.mask), want, (2 * 2 * (100 + 70) * 2) / (W * H)), true)
  eq('지운 배경 비율(부드럽게 하기 전) = 정확히 1 − 제품', near(r.bgShare, want, 1e-9), true)
  eq('제품 가운데 = 255 · 모서리 배경 = 0', [r.mask[75 * W + 100], r.mask[0], r.mask[W * H - 1]], [255, 0, 0])
  // 가장자리 1~2px만 중간값
  const edgeRow = 75 * W
  const mid = []
  for (let x = 45; x <= 55; x++) mid.push(r.mask[edgeRow + x])
  eq('가장자리: 바깥 0 → 안쪽 255 사이 1~2px만 중간값', [mid[0], mid[10], mid.filter(v => v > 0 && v < 255).length >= 1 && mid.filter(v => v > 0 && v < 255).length <= 4], [0, 255, true])

  // 마스크를 사진에 씌우면 제품 색은 그대로·배경은 투명 (studioBg.applyMaskToRgba — 저장 뒤 화면·내보내기와 같은 길)
  const px = new Uint8ClampedArray(d)
  const m4 = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < r.mask.length; i++) m4[i * 4] = r.mask[i]
  applyMaskToRgba(px, m4, 4)
  const at = (x, y) => Array.from(px.slice((y * W + x) * 4, (y * W + x) * 4 + 4))
  eq('씌운 결과: 제품 색·알파 그대로 / 배경 알파 0', [at(100, 75), at(5, 5)[3]], [[180, 40, 40, 255], 0])

  // 잡티 섞인 흰 배경도 거의 다 지움
  const n = image(W, H, () => { const v = 255 - Math.round(rnd() * 10); return [v, v, v] })
  rect(n, W, 60, 50, 80, 50, [30, 120, 60])
  const rn = localBackgroundMask(n, W, H)
  eq('잡티 흰 배경 → ok · 투명 비율 ≈ 1 − 제품', [rn.ok, near(transparentRatio(rn.mask), 1 - 4000 / 30000, 0.03)], [true, true])
}

// ── 3. 단색 아님 판정 (돈이 드는 AI로 자동으로 보내지 않는다 — 화면이 [AI로 정밀하게 지우기]를 따로) ──
{
  const W = 200, H = 150
  const grad = image(W, H, (x, y) => [Math.round((x / W) * 255), Math.round((y / H) * 255), 128]) // 그러데이션 배경
  eq('그러데이션 배경 → 단색 아님', [analyzeBorder(grad, W, H).solid, localBackgroundMask(grad, W, H).reason], [false, 'not_solid'])
  const photo = image(W, H, () => [Math.round(rnd() * 255), Math.round(rnd() * 255), Math.round(rnd() * 255)]) // 사진 배경(무늬)
  eq('무늬 배경 → 단색 아님', localBackgroundMask(photo, W, H), { ok: false, reason: 'not_solid', share: analyzeBorder(photo, W, H).share })
  const half = image(W, H, (x) => (x < W / 2 ? WHITE : [40, 40, 40])) // 왼쪽 흰색·오른쪽 검정
  eq('반반 배경 → 단색 아님', localBackgroundMask(half, W, H).ok, false)
  const blank = image(W, H, WHITE) // 제품이 없음
  eq('전부 흰색(제품 없음) → no_product', localBackgroundMask(blank, W, H).reason, 'no_product')
  const FW = 400, FH = 400
  const full = image(FW, FH, WHITE)
  rect(full, FW, 1, 1, FW - 2, FH - 2, [90, 60, 30]) // 테두리 1px만 흰색(전체의 1%) → 지울 배경이 거의 없음
  eq('배경이 테두리 한 줄뿐 → no_background', localBackgroundMask(full, FW, FH).reason, 'no_background')
  eq('작거나 잘못된 크기 → 단색 아님', [localBackgroundMask(new Uint8ClampedArray(8), 2, 1).ok, localBackgroundMask(new Uint8ClampedArray(4), 5, 5).ok], [false, false])
}

// ── 4. 테두리와 이어진 곳만 지움 (제품 안 흰 부분은 남김) ──
{
  const W = 120, H = 120
  const d = image(W, H, WHITE)
  rect(d, W, 20, 20, 80, 80, [0, 0, 200]) // 파란 상자
  rect(d, W, 50, 50, 20, 20, WHITE)       // 상자 안 흰 창 (테두리와 안 이어짐)
  const r = localBackgroundMask(d, W, H)
  eq('제품 안 흰 부분은 남김(255)', [r.ok, r.mask[60 * W + 60]], [true, 255])
  const ok = new Uint8Array(9).fill(1); ok[4] = 0
  eq('floodFromBorder: 테두리 8칸 채움·가운데 안 채움', Array.from(floodFromBorder(ok, 3, 3)), [1, 1, 1, 1, 0, 1, 1, 1, 1])
  const ok2 = new Uint8Array([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) // 4×4 가운데쯤 한 칸 — 테두리와 안 이어짐
  ok2[5] = 1
  eq('floodFromBorder: 테두리와 떨어진 비슷한 색은 안 채움', Array.from(floodFromBorder(ok2, 4, 4)).reduce((a, b) => a + b, 0), 0)
  eq('boxBlur: 안쪽 255·바깥 0은 그대로', Array.from(boxBlur(new Uint8Array([255, 255, 255, 255]), 2, 2)), [255, 255, 255, 255])
}

// ── 5. 저장 모양 = AI 결과(bg_remove)와 같음 → 투명·단색·라이브러리·AI 배경·다듬기가 그대로 쓴다 ──
{
  const saved = { path: 'uid/p1/bg/img-1/mask_0123456789abcdef.png', key: '0123456789abcdef', model: LOCAL_BG_MODEL, width: 200, height: 150 }
  const bg = bgFromServer(saved)
  eq('bgFromServer 그대로 → 투명으로 시작', bg, { mask: { path: saved.path, key: saved.key, model: 'local', w: 200, h: 150 }, mode: 'transparent' })
  eq('readBg 통과 (경로 규칙 = AI 마스크와 같음)', readBg({ bg })?.mask?.model, 'local')
}

// ── 6. 연결: 편집기 [배경 지우기] 기본 = 무료 · AI는 [AI로 정밀하게 지우기]로만 ──
{
  const ed = fs.readFileSync(new URL('../src/views/studio/StudioEditorView.vue', import.meta.url), 'utf8')
  const panel = fs.readFileSync(new URL('../src/components/studio/StudioBgPanel.vue', import.meta.url), 'utf8')
  const fnBody = name => { // 함수 시작 ~ 맨 앞에 붙은 닫는 괄호 줄 (CRLF도)
    const i = ed.indexOf(`async function ${name}(`)
    const m = /\r?\n\}\r?\n/.exec(ed.slice(i))
    if (i < 0 || !m) throw new Error(`함수를 찾지 못함: ${name}`)
    return ed.slice(i, i + m.index)
  }
  eq('[배경 지우기](onBgRemove)는 외부 AI를 부르지 않음', [/requestBgRemove/.test(fnBody('onBgRemove')), /buildLocalMaskPng/.test(fnBody('onBgRemove')), /uploadBgLocalMask/.test(fnBody('onBgRemove'))], [false, true, true])
  eq('[AI로 정밀하게 지우기](onBgRemoveAi)만 requestBgRemove', /requestBgRemove\(/.test(fnBody('onBgRemoveAi')), true)
  eq('패널: [배경 지우기] = remove · [AI로 정밀하게 지우기] = remove-ai', [/data-bg-remove @click="\$emit\('remove'\)"/.test(panel), /data-bg-remove-ai\s+@click="\$emit\('remove-ai'\)"/.test(panel)], [true, true])
  eq('패널: 외부 AI 안내는 AI 버튼 칸에만', panel.indexOf('data-bg-notice') > panel.indexOf('data-bg-ai-remove-box'), true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
