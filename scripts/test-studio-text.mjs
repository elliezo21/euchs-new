// 글자 요소 테스트 (10-1단계) — node scripts/test-studio-text.mjs
import {
  normalizeTextItem, patchTextItem, wrapLines, textHeight, lineWidth, fitTextItem, textStyleOf, textLabel, isValidTextItem,
  TEXT_DEFAULTS, TEXT_INSERT_KINDS, TEXT_STYLE_KEYS, TEXT_STYLE_PRESETS, textPaintSpec, textStyleValues, presetPatch, stylePresetByKey,
} from '../src/lib/studioText.js'
import { STUDIO_FONTS, nearestWeight, fontSpec, cssFamilyOf } from '../src/lib/studioFonts.js'
import {
  readPage, addTextItem, setTextProps, setTextContent, resizeTextItem, setItemRect, moveItems, duplicateItems, removeItems,
  findItem, isDrawableItem, textLinesOf, TEXT_MIN_WIDTH,
} from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

// 가짜 측정: 한글 = 글자 크기 1배, 공백 = 0.25배, 그 밖(영문·숫자·부호) = 0.5배
const measure = (s, style) => [...s].reduce((n, ch) => n + style.fontSize * (/[가-힯]/.test(ch) ? 1 : ch === ' ' ? 0.25 : 0.5), 0)
const st = (extra = {}) => ({ ...textStyleOf(normalizeTextItem({ type: 'text' })), fontSize: 10, lineHeight: 1.5, ...extra })

// ── 1. 기본값·잘못된 값 ──
{
  const n = normalizeTextItem({ id: 't', type: 'text', x: 0, y: 0, w: 100, h: 10 })
  eq('기본값 채우기', [n.text, n.fontFamily, n.fontSize, n.fontWeight, n.color, n.align, n.lineHeight, n.letterSpacing],
    ['', 'noto-sans-kr', 40, 700, '#111111', 'center', 1.3, 0])
  const bad = normalizeTextItem({ type: 'text', text: 5, fontFamily: 'comic', fontSize: 9999, fontWeight: 'x', color: 'red', align: 'justify', lineHeight: 0.1, letterSpacing: 5 })
  eq('잘못된 값 → 기본값·범위 안', [bad.text, bad.fontFamily, bad.fontSize, bad.fontWeight, bad.color, bad.align, bad.lineHeight, bad.letterSpacing],
    ['', 'noto-sans-kr', 400, 700, '#111111', 'center', 0.8, 1])
  eq('없는 굵기 → 그 폰트의 가까운 굵기 (검은고딕 700 → 400)', normalizeTextItem({ type: 'text', fontFamily: 'black-han-sans', fontWeight: 700 }).fontWeight, 400)
  eq('기본 굵기도 폰트에 맞춤 (도현 굵기 없음 → 400)', normalizeTextItem({ type: 'text', fontFamily: 'do-hyeon' }).fontWeight, 400)
  eq('색은 소문자로, 줄바꿈 \\r\\n → \\n', (({ color, text }) => [color, text])(normalizeTextItem({ type: 'text', color: '#AABBCC', text: 'a\r\nb' })), ['#aabbcc', 'a\nb'])
  eq('공통 칸·다른 칸은 그대로', (({ rotation, groupId }) => [rotation, groupId])(normalizeTextItem({ type: 'text', rotation: 30, groupId: 'g_1' })), [30, 'g_1'])
  eq('그릴 수 있는 글자 요소', [isValidTextItem({ id: 'a', type: 'text', text: '', x: 0, y: 0, w: 1, h: 1 }), isValidTextItem({ id: 'a', type: 'text', x: 0, y: 0, w: 1, h: 1 })], [true, false])
}

// ── 2. 속성 바꾸기 ──
{
  const t = normalizeTextItem({ type: 'text', text: '가', fontWeight: 800 })
  eq('글꼴 바꾸면 굵기를 새 폰트에 맞춤 (800 → 도현 400)', patchTextItem(t, { fontFamily: 'do-hyeon' }).fontWeight, 400)
  eq('같은 값이면 입력 그대로', patchTextItem(t, { align: 'center' }) === t, true)
  eq('잘못된 patch 값은 무시', patchTextItem(t, { color: 'blue', align: 'middle' }) === t, true)
  eq('크기는 범위 안·정수', patchTextItem(t, { fontSize: 3.6 }).fontSize, 8)
}

// ── 3. 줄바꿈 ──
{
  eq('한 줄에 들어감', wrapLines('안녕 hello', st(), 1000, measure), ['안녕 hello'])
  eq('한글은 글자 단위로 끊음 (폭 35 = 3글자)', wrapLines('가나다라마바', st(), 35, measure), ['가나다', '라마바'])
  eq('영문은 단어 단위 (hello world, 폭 30)', wrapLines('hello world', st(), 30, measure), ['hello', 'world'])
  eq('한글·영문 섞임', wrapLines('가격 price 할인', st(), 36, measure), ['가격', 'price', '할인'])
  eq('폭보다 긴 단어는 글자 단위', wrapLines('abcdefghij', st(), 20, measure), ['abcd', 'efgh', 'ij'])
  eq('\\n = 강제 줄바꿈', wrapLines('가\n나', st(), 1000, measure), ['가', '나'])
  eq('빈 줄 유지', wrapLines('가\n\n나', st(), 1000, measure), ['가', '', '나'])
  eq('빈 글자 = 빈 줄 1개', wrapLines('', st(), 100, measure), [''])
  eq('넘긴 줄 앞 공백은 버리고 줄 끝 공백은 뺌', wrapLines('abc def', st(), 16, measure), ['abc', 'def'])
  eq('문단 맨 앞 공백은 둠', wrapLines('  가', st(), 1000, measure), ['  가'])
  eq('닫는 문장부호는 앞 글자와 같이 (요. 는 안 떨어짐)', wrapLines('가나요.', st(), 25, measure), ['가나', '요.'])
  eq('폭이 한 글자보다 좁아도 한 줄에 한 글자', wrapLines('가나', st(), 3, measure), ['가', '나'])
  // 자간: 0.5em × 10px × 글자 수 → 한글 한 글자 = 10 + 5
  eq('자간 포함 폭 (가나 = 20 + 2×5)', lineWidth('가나', st({ letterSpacing: 0.5 }), measure), 30)
  eq('자간이 있으면 더 일찍 넘김 (폭 35: 3글자 → 2글자)', wrapLines('가나다라', st({ letterSpacing: 0.5 }), 35, measure), ['가나', '다라'])
  eq('음수 자간이면 더 들어감', wrapLines('가나다라', st({ letterSpacing: -0.2 }), 35, measure), ['가나다라'])
}

// ── 4. 높이 ──
{
  eq('높이 = 줄 수 × 크기 × 줄간격 (올림)', textHeight(['a', 'b', 'c'], { fontSize: 10, lineHeight: 1.25 }), 38)
  eq('빈 줄 목록도 1줄 높이', textHeight([], { fontSize: 10, lineHeight: 1 }), 10)
  const t = fitTextItem(normalizeTextItem({ id: 't', type: 'text', text: '가나다라마바', fontSize: 10, lineHeight: 1.5, x: 0, y: 0, w: 35, h: 1 }), measure)
  eq('fitTextItem → 2줄 = 30', t.h, 30)
  eq('레이어 이름 "글자 · 앞 10자"', [textLabel({ text: '첫째 줄\n둘째 줄 입니다 길게' }), textLabel({ text: '  ' })], ['글자 · 첫째 줄 둘째 줄 …', '글자'])
}

// ── 5. 폰트 목록 ──
{
  eq('폰트 11개(예전 6 + 새 5) 모두 우리 도메인, 모두 SIL OFL', [STUDIO_FONTS.length, STUDIO_FONTS.filter(f => f.local).length, STUDIO_FONTS.every(f => f.license === 'SIL OFL 1.1')], [11, 11, true])
  eq('가까운 굵기 (나눔고딕 900 → 800, 500 → 400)', [nearestWeight('nanum-gothic', 900), nearestWeight('nanum-gothic', 500)], [800, 400])
  eq('캔버스 글꼴 한 줄', fontSpec({ fontFamily: 'nanum-gothic', fontWeight: 700, fontSize: 40 }), '700 40px "Nanum Gothic", sans-serif')
  eq('모르는 폰트 → sans-serif', cssFamilyOf('x'), 'sans-serif')
}

// ── 6. 페이지 조작 ──
const P = { v: 1, width: 780, gap: 0, parked: [], sections: [{ id: 's1', height: 400, bg: '#ffffff', items: [] }] }
{
  const r = addTextItem(P, 's1', { ...TEXT_INSERT_KINDS.title, fontSize: 20 }, measure)
  const t = findItem(r.page, r.itemId).item
  eq('넣기 → 구간 가운데, 높이 자동', [t.type, t.x, t.w, t.h, t.y], ['text', 70, 640, 25, 188])
  eq('입력 문서는 그대로', P.sections[0].items.length, 0)
  eq('그릴 수 있는 요소', isDrawableItem(t), true)
  eq('없는 구간이면 넣지 않음', addTextItem(P, 'x', {}, measure).itemId, null)

  const p2 = setTextProps(r.page, [t.id], { fontSize: 40 }, measure)
  const t2 = findItem(p2, t.id).item
  eq('크기 바꾸면 높이 다시 (위쪽 제자리)', [t2.fontSize, t2.h, t2.y], [40, 50, 188])
  eq('사진 요소는 글자 속성에 안 바뀜', setTextProps({ ...P, sections: [{ ...P.sections[0], items: [{ id: 'i', type: 'image', imageId: 'A', x: 0, y: 0, w: 10, h: 10, rotation: 0, opacity: 1, flipX: false, flipY: false, locked: false, hidden: false }] }] }, ['i'], { fontSize: 40 }, measure).sections[0].items[0].fontSize, undefined)

  const p3 = setTextContent(r.page, t.id, '가\n나\n다', measure)
  eq('고치기 → 3줄 높이', findItem(p3, t.id).item.h, 75)
  eq('같은 글자면 문서 그대로', setTextContent(r.page, t.id, t.text, measure) === r.page, true)
  eq('줄 목록 (화면과 같은 함수)', textLinesOf(findItem(p3, t.id).item, measure), ['가', '나', '다'])

  // 좌우 손잡이: 폭만, 줄바꿈 다시
  const pe = resizeTextItem(p3, t.id, 'e', -600, 0, measure)
  const te = findItem(pe, t.id).item
  eq('오른쪽 손잡이 → 폭만 바뀌고 왼쪽·위 제자리', [te.x, te.y, te.w, te.fontSize], [70, 188, 40, 20])
  const pw = resizeTextItem(r.page, t.id, 'e', -560, 0, measure)
  // '제목을 입력하세요' 20px, 폭 80 = 한글 4글자 → 제목을 / 입력하세 / 요 = 3줄 × 25
  eq('좁히면 줄이 늘고 높이 자동', [findItem(pw, t.id).item.w, findItem(pw, t.id).item.h], [80, 75])
  eq('위아래 손잡이는 없음', resizeTextItem(r.page, t.id, 'n', 0, 50, measure) === r.page, true)
  eq('최소 폭', findItem(resizeTextItem(r.page, t.id, 'w', 5000, 0, measure), t.id).item.w, TEXT_MIN_WIDTH)
  // 모서리: 크기와 폭을 같이
  const pc = resizeTextItem(r.page, t.id, 'se', 640, 0, measure)
  const tc = findItem(pc, t.id).item
  eq('모서리 → 글자 크기·폭 두 배, 왼쪽 위 제자리', [tc.fontSize, tc.w, tc.x, tc.y], [40, 1280, 70, 188])
  const pn = resizeTextItem(r.page, t.id, 'nw', 320, 0, measure)
  const tn = findItem(pn, t.id).item
  eq('왼쪽 위 모서리 → 오른쪽 아래가 제자리', [tn.fontSize, tn.w, tn.x + tn.w, tn.y + tn.h], [10, 320, t.x + t.w, t.y + t.h])

  // 돌린 글자: 오른쪽 손잡이로 좁혀도 요소의 왼쪽 위 꼭짓점(화면 위치)은 제자리
  const corner = o => { const a = o.rotation * Math.PI / 180, cx = o.x + o.w / 2, cy = o.y + o.h / 2; return [Math.round(cx + (-o.w / 2) * Math.cos(a) - (-o.h / 2) * Math.sin(a)), Math.round(cy + (-o.w / 2) * Math.sin(a) + (-o.h / 2) * Math.cos(a))] }
  const rot = { ...r.page, sections: [{ ...r.page.sections[0], items: [{ ...t, rotation: 30 }] }] }
  const pr30 = resizeTextItem(rot, t.id, 'e', -560, 0, measure)
  const t30 = findItem(pr30, t.id).item
  eq('돌린 글자 좁히기 → 줄 늘고 왼쪽 위 꼭짓점 제자리(±1)', [t30.h > t.h, Math.abs(corner(t30)[0] - corner({ ...t, rotation: 30 })[0]) <= 1, Math.abs(corner(t30)[1] - corner({ ...t, rotation: 30 })[1]) <= 1], [true, true, true])

  // 숫자 칸: 가로를 바꾸면 세로는 자동, 세로 입력은 무시
  const pr = setItemRect(r.page, t.id, { w: 80, h: 999 }, measure)
  eq('숫자 칸 가로 → 세로 자동', [findItem(pr, t.id).item.w, findItem(pr, t.id).item.h], [80, 75])
  eq('측정 없이 부르면 세로 그대로', findItem(setItemRect(r.page, t.id, { h: 999 }), t.id).item.h, 25)

  // 공통 조작은 사진과 같게
  eq('옮기기', findItem(moveItems(r.page, [t.id], 10, 5), t.id).item.x, 80)
  const d = duplicateItems(r.page, [t.id])
  eq('복제 → 글자 칸 그대로', findItem(d.page, d.ids[0]).item.text, t.text)
  eq('삭제 → parked에 안 들어감', removeItems(r.page, [t.id]).parked, [])
  const locked = setTextProps(r.page, [t.id], {}, measure)
  eq('빈 patch → 그대로', locked === r.page, true)
}

// ── 7. readPage ──
{
  const raw = { ...P, sections: [{ ...P.sections[0], items: [{ id: 't', type: 'text', x: 0, y: 0, w: 100, h: 20, text: '가', fontSize: 'big' }] }] }
  const it = readPage(raw, 'p').page.sections[0].items[0]
  eq('readPage → 글자 칸 기본값 + 공통 칸 기본값', [it.fontSize, it.fontFamily, it.rotation, it.locked], [40, 'noto-sans-kr', 0, false])
  eq('원본은 그대로', raw.sections[0].items[0].fontSize, 'big')
}

// ── 8. 꾸미기 칸 (10-2) ──
{
  const plain = normalizeTextItem({ id: 't', type: 'text', text: '가', x: 0, y: 0, w: 100, h: 20 })
  eq('꾸미기 기본값 = 모두 없음', [plain.strokeWidth, plain.shadowOpacity, plain.bgColor, plain.bgOpacity, plain.bgPadding, plain.bgRadius],
    [0, 0, '', 1, 0, 0])
  eq('10-1 글자(꾸미기 칸 없음) → 그리기 값도 없음', (({ stroke, shadow, bg }) => [stroke, shadow, bg])(textPaintSpec(plain)), [null, null, null])
  const bad = normalizeTextItem({ type: 'text', strokeWidth: 99, strokeColor: 'black', shadowX: -100, shadowY: 3.6, shadowBlur: -5, shadowColor: '#ABCDEF',
    shadowOpacity: 2, bgColor: 'yellow', bgOpacity: -1, bgPadding: 100, bgRadius: 500 })
  eq('범위 밖·잘못된 값 → 자르거나 기본값', [bad.strokeWidth, bad.strokeColor, bad.shadowX, bad.shadowY, bad.shadowBlur, bad.shadowColor, bad.shadowOpacity, bad.bgColor, bad.bgOpacity, bad.bgPadding, bad.bgRadius],
    [20, '#000000', -40, 4, 0, '#abcdef', 1, '', 0, 60, 100])
  eq('배경 색 "" = 없음은 그대로 받음', normalizeTextItem({ type: 'text', bgColor: '' }).bgColor, '')
  const deco = normalizeTextItem({ id: 't', type: 'text', text: '가', x: 0, y: 0, w: 100, h: 20, strokeWidth: 3, strokeColor: '#FFFFFF',
    shadowX: 2, shadowY: 4, shadowBlur: 6, shadowColor: '#000000', shadowOpacity: 0.5, bgColor: '#FFE14D', bgOpacity: 0.8, bgPadding: 10, bgRadius: 100 })
  const ps = textPaintSpec(deco)
  eq('테두리 값', ps.stroke, { width: 3, color: '#ffffff' })
  eq('그림자 값 (색 + 진하기 → rgba)', ps.shadow, { x: 2, y: 4, blur: 6, color: 'rgba(0, 0, 0, 0.5)' })
  eq('배경 = 요소 네모를 여백만큼 넓힘, 모서리는 짧은 변 절반까지', ps.bg, { x: -10, y: -10, w: 120, h: 40, radius: 20, color: 'rgba(255, 225, 77, 0.8)' })
  eq('그림자 진하기 0 → 없음', textPaintSpec({ ...deco, shadowOpacity: 0 }).shadow, null)
  eq('그림자 위치·흐림이 모두 0 → 없음', textPaintSpec({ ...deco, shadowX: 0, shadowY: 0, shadowBlur: 0 }).shadow, null)
  eq('배경 진하기 0 → 없음', textPaintSpec({ ...deco, bgOpacity: 0 }).bg, null)

  // 꾸미기는 줄바꿈·높이에 영향 없음
  const t = fitTextItem({ ...plain, text: '가나다라마바', fontSize: 10, lineHeight: 1.5, w: 35 }, measure)
  eq('테두리·배경을 켜도 높이 그대로', fitTextItem({ ...t, strokeWidth: 20, bgPadding: 60 }, measure).h, t.h)
  const r = addTextItem(P, 's1', { text: '가', fontSize: 20 }, measure)
  const id = r.itemId
  const p2 = setTextProps(r.page, [id], { strokeWidth: 4, strokeColor: '#ff0000' }, measure)
  eq('속성 칸으로 테두리 켜기 → 자리·높이 그대로', (({ strokeWidth, strokeColor, x, y, h }) => [strokeWidth, strokeColor, x, y, h])(findItem(p2, id).item),
    [4, '#ff0000', findItem(r.page, id).item.x, findItem(r.page, id).item.y, findItem(r.page, id).item.h])

  // 스타일 복사·붙여넣기
  const src = { ...deco, text: '원본', fontFamily: 'nanum-gothic', fontWeight: 800, fontSize: 30, x: 5, y: 6, w: 70, rotation: 20, locked: true }
  const sv = textStyleValues(src)
  eq('복사 칸 = 글자 모양 전부 (글·자리·크기·회전·잠금 없음)', ['text', 'x', 'y', 'w', 'h', 'rotation', 'locked', 'id'].some(k => k in sv), false)
  eq('…모양 칸은 다 있음', Object.keys(sv).length === TEXT_STYLE_KEYS.length && TEXT_STYLE_KEYS.includes('bgRadius') && TEXT_STYLE_KEYS.includes('fontSize'), true)
  const pasted = setTextProps(r.page, [id], sv, measure)
  const pi = findItem(pasted, id).item
  eq('붙여넣기 → 모양만 바뀌고 글·자리·폭 그대로', [pi.text, pi.fontFamily, pi.fontSize, pi.strokeWidth, pi.bgColor, pi.w, pi.x, pi.rotation],
    ['가', 'nanum-gothic', 30, 3, '#ffe14d', findItem(r.page, id).item.w, findItem(r.page, id).item.x, 0])
  eq('…높이는 새 크기에 맞춤', pi.h, Math.ceil(30 * pi.lineHeight))

  // 스타일 프리셋
  eq('프리셋 10개 이상(10-2의 10개 + 에셋 채우기), 키·이름 겹침 없음', [TEXT_STYLE_PRESETS.length >= 10,
    new Set(TEXT_STYLE_PRESETS.map(p => p.key)).size === TEXT_STYLE_PRESETS.length, new Set(TEXT_STYLE_PRESETS.map(p => p.label)).size === TEXT_STYLE_PRESETS.length], [true, true, true])
  const allValid = TEXT_STYLE_PRESETS.every(p => {
    const n = normalizeTextItem({ type: 'text', ...presetPatch(p) })
    return Object.entries(presetPatch(p)).every(([k, v]) => n[k] === v)
  })
  eq('프리셋 값이 모두 범위 안·폰트가 가진 굵기', allValid, true)
  const withShadow = setTextProps(r.page, [id], { shadowY: 5, shadowBlur: 5, shadowOpacity: 0.5 }, measure)
  const pp = setTextProps(withShadow, [id], presetPatch(stylePresetByKey('highlight-yellow')), measure)
  const pv = findItem(pp, id).item
  eq('프리셋 적용 → 앞 그림자는 없어지고 배경이 생김, 크기·정렬 그대로', [pv.shadowOpacity, pv.bgColor, pv.fontSize, pv.align, pv.text], [0, '#ffe14d', 20, 'center', '가'])
  eq('없는 프리셋 키', stylePresetByKey('x'), null)
}

console.log(`\n${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
