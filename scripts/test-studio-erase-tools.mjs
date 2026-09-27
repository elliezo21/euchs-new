// 지우기 화면 포토샵식 — node scripts/test-studio-erase-tools.mjs
// 단축키(studioEraseKeys) · 선택 되돌리기(studioSelection — 브러시 한 획·사각형 한 번 단위, 적용과 섞여도 누른 순서대로)
// · 삭제 → 투명(studioFillPlan method 'clear') · 작업 바 자리 · 코드 연결(세션·캔버스·화면·편집기)
import fs from 'node:fs'
import { eraseKeyAction, stepBrush, workBarPosition, isTypingTarget, BRUSH_STEP } from '../src/lib/studioEraseKeys.js'
import { createSelHistory, pushSel, dropSelFuture, undoPlan, redoPlan } from '../src/lib/studioSelection.js'
import { fillOnCrop, fillPlan, cropRect, fillArea } from '../src/lib/studioFillPlan.js'
import { toolForLayer } from '../src/lib/studioCover.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(58)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const K = (key, extra = {}) => ({ key, code: '', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...extra })

// ── 1. 단축키 ──
{
  const sel = { hasSelection: true }
  eq('M · B · S = 사각형 선택 · 브러시(칠하기) · 주변으로 덮기', [eraseKeyAction(K('m')), eraseKeyAction(K('b')), eraseKeyAction(K('s'))],
    [{ action: 'tool', tool: 'marquee' }, { action: 'tool', tool: 'brush', mode: 'add' }, { action: 'tool', tool: 'cover' }])
  eq('E = 브러시 덜어내기', eraseKeyAction(K('e')), { action: 'brushMode', mode: 'sub' })
  eq('한글 입력 상태도 같은 자리 키로 (ㅡ = KeyM)', eraseKeyAction(K('ㅡ', { code: 'KeyM' })), { action: 'tool', tool: 'marquee' })
  eq(`[ / ] = 브러시 크기 -${BRUSH_STEP} / +${BRUSH_STEP}`, [eraseKeyAction(K('[')), eraseKeyAction(K(']'))], [{ action: 'brushSize', delta: -10 }, { action: 'brushSize', delta: 10 }])
  eq('Delete·Backspace = 삭제 (선택 있을 때만)', [eraseKeyAction(K('Delete'), sel), eraseKeyAction(K('Backspace'), sel), eraseKeyAction(K('Delete'))], [{ action: 'delete' }, { action: 'delete' }, null])
  eq('Shift+Delete = AI로 지우기', eraseKeyAction(K('Delete', { shiftKey: true }), sel), { action: 'ai' })
  eq('Enter = AI로 지우기 (선택 있을 때) · 버튼 위 Enter는 버튼 몫', [eraseKeyAction(K('Enter'), sel), eraseKeyAction(K('Enter')), eraseKeyAction(K('Enter'), { ...sel, onButton: true })], [{ action: 'ai' }, null, null])
  eq('Esc · Ctrl+D · Cmd+D = 선택 해제', [eraseKeyAction(K('Escape')), eraseKeyAction(K('d', { ctrlKey: true, code: 'KeyD' })), eraseKeyAction(K('d', { metaKey: true, code: 'KeyD' }))],
    [{ action: 'deselect' }, { action: 'deselect' }, { action: 'deselect' }])
  eq('Ctrl+Z·Ctrl+M 등 다른 조합·Alt는 안 받음 (되돌리기는 편집기)', [eraseKeyAction(K('z', { ctrlKey: true, code: 'KeyZ' })), eraseKeyAction(K('m', { altKey: true })), eraseKeyAction(K('M', { shiftKey: true }))], [null, null, null])
  eq('입력 칸에 커서 = 모든 단축키 무시', ['m', 'Delete', 'Escape', '['].map(k => eraseKeyAction(K(k), { typing: true, hasSelection: true })), [null, null, null, null])
  eq('입력 칸 판정 (input·textarea·select·편집 가능)', [isTypingTarget({ tagName: 'INPUT' }), isTypingTarget({ tagName: 'TEXTAREA' }), isTypingTarget({ tagName: 'DIV', isContentEditable: true }), isTypingTarget({ tagName: 'BUTTON' })], [true, true, true, false])
  eq('브러시 크기 한 단계 (범위 안)', [stepBrush(40, 10, 4, 300), stepBrush(8, -10, 4, 300), stepBrush(295, 10, 4, 300)], [50, 4, 300])
}

// ── 2. 선택 되돌리기 ──
{
  const s1 = { id: 'f_a', strokes: 1 }, s2 = { id: 'f_a', strokes: 2 }, s3 = { id: 'f_a', strokes: 3 }
  let h = createSelHistory()
  h = pushSel(h, 0, null, s1); h = pushSel(h, 0, s1, s2); h = pushSel(h, 0, s2, s3) // 브러시 3번
  let p = undoPlan(h, 0, false); eq('브러시 3번 → Ctrl+Z → 2번째까지', [p.kind, p.draft], ['sel', s2]); h = p.next
  p = undoPlan(h, 0, false); eq('Ctrl+Z 한 번 더 → 1번만 남음', p.draft, s1); h = p.next
  h = pushSel(h, 0, s1, null) // Esc 해제
  eq('해제 뒤 새 칸을 쌓으면 다시 하기는 버림', h.future.length, 0)
  p = undoPlan(h, 0, false); eq('Esc로 해제 → Ctrl+Z → 선택 되살아남', p.draft, s1); h = p.next
  p = redoPlan(h, 0, false); eq('Ctrl+Shift+Z → 다시 해제', [p.kind, p.draft], ['sel', null])
  eq('같은 값이면 칸을 안 쌓음', pushSel(createSelHistory(), 0, s1, { ...s1 }).past.length, 0)
  // 적용(사진 이력)과 섞기: 선택(0) → 적용(0→1) → 선택(1)
  let g = createSelHistory()
  g = pushSel(g, 0, null, s1)
  g = pushSel(g, 1, null, s2) // 적용 뒤 새 선택
  p = undoPlan(g, 1, true); eq('적용 뒤 선택 → 먼저 그 선택', [p.kind, p.draft], ['sel', null]); g = p.next
  p = undoPlan(g, 1, true); eq('그다음 = 적용 되돌리기(사진 이력)', p.kind, 'hist')
  p = undoPlan(g, 0, true); eq('사진 이력 0으로 간 뒤 = 적용 전 선택', [p.kind, p.draft], ['sel', null]); g = p.next
  p = redoPlan(g, 0, true); eq('다시: 선택 → 적용 → 적용 뒤 선택 (누른 순서)', [p.kind, p.draft], ['sel', s1]); g = p.next
  p = redoPlan(g, 0, true); eq('다시 2: 사진 이력', p.kind, 'hist')
  p = redoPlan(g, 1, true); eq('다시 3: 적용 뒤 선택', [p.kind, p.draft], ['sel', s2])
  eq('사진 이력에 새 칸 = 선택 다시 하기 버림', dropSelFuture({ past: [], future: [{}] }).future.length, 0)
  eq('할 것 없음 = null', [undoPlan(createSelHistory(), 0, false), redoPlan(createSelHistory(), 0, false)], [null, null])
}

// ── 3. 삭제 → 투명 ──
{
  const W = 40, H = 40
  const pix = (w, h, v = 200) => ({ data: new Uint8ClampedArray(w * h * 4).fill(v), width: w, height: h })
  const rect = { id: 'f_c', type: 'fill', x: 10, y: 10, w: 8, h: 6, pad: 0, method: 'clear' }
  const crop = cropRect(rect, W, H)
  const r = fillOnCrop(pix(crop.w, crop.h), crop, rect, W, H)
  const alphas = [...r.data.data].filter((_, i) => i % 4 === 3)
  eq('사각형 삭제 = 선택 영역 전부 알파 0 · 색 값은 그대로', [r.ok, r.area, alphas.every(a => a === 0), r.data.data[0]], [true, { x: 10, y: 10, w: 8, h: 6 }, true, 200])
  const brush = { id: 'f_b', type: 'fill', shape: 'brush', x: 10, y: 10, w: 11, h: 5, pad: 0, method: 'clear', brush: { strokes: [{ mode: 'add', size: 1, pts: [10, 12, 20, 12] }] } } // 상자 5줄 중 가운데 한 줄만 칠함
  const bc = cropRect(brush, W, H)
  const rb = fillOnCrop(pix(bc.w, bc.h), bc, brush, W, H)
  const ab = [...rb.data.data].filter((_, i) => i % 4 === 3)
  eq('브러시 삭제 = 칠한 모양만 투명', [rb.ok, ab.includes(0), ab.includes(200)], [true, true, true])
  eq('삭제는 가장자리 여유 없음 (pad 0 → 메우는 범위 = 선택)', fillArea(rect, W, H), { x: 10, y: 10, w: 8, h: 6 })
  eq('계산 key에 방식(clear) — 같은 자리 단색과 결과를 섞지 않음', fillPlan([rect], W, H)[0].key !== fillPlan([{ ...rect, method: 'solid' }], W, H)[0].key, true)
  // 앞 삭제 결과(투명)를 뒤 레이어가 그대로 이어받는다 (pastePrior 알파 포함)
  const next = { id: 'f_d', type: 'fill', x: 12, y: 12, w: 2, h: 2, pad: 0, method: 'clear' }
  const nc = cropRect(next, W, H)
  const rn = fillOnCrop(pix(nc.w, nc.h), nc, next, W, H, [r])
  eq('겹친 앞 삭제의 투명이 이어짐 (알파 포함 덮어쓰기)', rn.ok, true)
}

// ── 4. 작업 바 자리 ──
{
  const view = { w: 1000, h: 700 }, bar = { w: 400, h: 40 }
  eq('선택 아래 가운데', workBarPosition({ x: 300, y: 100, w: 200, h: 100 }, view, bar), { left: 200, top: 210 })
  eq('아래 자리 없으면 위 (확대 막대 64px 비움)', workBarPosition({ x: 300, y: 500, w: 200, h: 120 }, view, bar), { left: 200, top: 450 })
  eq('화면 밖으로 안 나감 (왼쪽·오른쪽)', [workBarPosition({ x: -50, y: 100, w: 60, h: 50 }, view, bar).left, workBarPosition({ x: 980, y: 100, w: 60, h: 50 }, view, bar).left], [8, 592])
  eq('선택이 화면을 꽉 채우면 화면 위쪽 안쪽에', workBarPosition({ x: 0, y: -100, w: 1000, h: 1000 }, view, bar).top, 8)
}

// ── 5. 코드 연결 ──
{
  const session = read('src/composables/useEraseSession.js')
  const canvas = read('src/components/studio/StudioCanvas.vue')
  const screen = read('src/components/studio/StudioEraseScreen.vue')
  const editor = read('src/views/studio/StudioEditorView.vue')
  eq('도구: 사각형 선택(M)·브러시(B)·주변으로 덮기(S) + 툴팁에 단축키', ["key: 'marquee', label: '사각형 선택'", "label: '브러시'", "label: '주변으로 덮기'", '사각형 선택 (M)', '브러시 (B)', '주변으로 덮기 (S)'].every(t => screen.includes(t)), true)
  eq('레이어를 고르면 지우기 → 사각형 선택', toolForLayer({ type: 'fill' }, 'brush'), 'marquee')
  eq('삭제·AI·단색: 왼쪽 패널·작업 바·단축키가 같은 세션 함수(executeFill)', [/function deleteSelection\(\) \{ const d = draftSel\(\); if \(d\) executeFill\(d\.id, 'clear'\) \}/.test(screen), /data-method="clear"[\s\S]{0,120}@click="deleteSelection"/.test(screen), /data-bar="delete" @click="deleteSelection"/.test(screen), /a\.action === 'delete'\) deleteSelection\(\)/.test(screen)], [true, true, true, true])
  eq('선택 해제: 패널·작업 바·단축키·빈 곳 누르기가 같은 deselect', [/selectedIsDraft \? deselect\(\)/.test(screen), /data-bar="deselect" @click="deselect"/.test(screen), /a\.action === 'deselect'\) deselect\(\)/.test(screen), /@deselect="deselect"/.test(screen), /tool\.value === 'marquee'\) emit\('deselect'\)/.test(canvas)], [true, true, true, true, true])
  eq('캔버스 안내 문구', screen.includes('선택 영역 · Delete 삭제 · Esc 해제'), true)
  eq('선택 이력: 브러시 한 획·사각형 한 번·해제마다 한 칸', [/recordSel\(before, layer\) \/\/ 브러시 한 획/.test(session), /recordSel\(canvasDraft\.value, layer\) \/\/ 사각형 한 번/.test(session), /recordSel\(cur, null\)\s*discardDraft\(\)/.test(session)], [true, true, true])
  eq('삭제 레이어 = method clear·pad 0·이력 "삭제"', /method === 'clear' \? \{ pad: 0 \} : \{\}[\s\S]{0,200}LABELS\.clearPixels/.test(session), true)
  eq('삭제 화면 = destination-out 뚫기 + 사진 자리 체크무늬', [/globalCompositeOperation: gco/.test(canvas), /'destination-out'/.test(canvas), /data-erase-checker/.test(canvas)], [true, true, true])
  eq('삭제가 있으면 완성 JPG를 만들지 않음 (투명 유지)', /if \(hasClearLayer\(layers\)\) \{ bakeQueue\.clear\(id\); return \}/.test(editor), true)
  eq('입력 칸 타이핑 중 단축키 무시 (캔버스)', /eraseKeyAction\(e, \{ typing,/.test(canvas), true)
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
