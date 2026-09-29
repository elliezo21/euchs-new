// 검수 2묶음 테스트 — node scripts/test-studio-review2.mjs
// 덮기 고르면 도구 · Ctrl+A 막기 · 페이지 칸만 스크롤 · 지우기 가이드 탭당 한 번 · [구간 배경색과 같게] 기준 · 붓 크기 단계표 ·
// 원클릭 안내 띠(원클릭 페이지 표시·닫음 기억)
import { toolForLayer } from '../src/lib/studioCover.js'
import { blocksBrowserSelectAll, isTypingTarget, scrollPlan, SCROLL_MARGIN } from '../src/lib/studioViewNav.js'
import { readGuideShown, writeGuideShown, readGuideHidden } from '../src/lib/studioGuide.js'
import { sectionBgChoice, PAGE_DEFAULT_BG } from '../src/lib/studioBg.js'
import { stepBrushSize, BRUSH_LADDER } from '../src/lib/studioBgRefine.js'
import { withDraftMark, isAutoPage, readNoticeClosed, writeNoticeClosed, NOTICE_KEY_PREFIX } from '../src/lib/studioAutoBuild.js'
import { SECTION_BG } from '../src/lib/studioPage.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
function memStorage(throwing = false) {
  const m = new Map()
  return {
    getItem: k => { if (throwing) throw new Error('막힘'); return m.has(k) ? m.get(k) : null },
    setItem: (k, v) => { if (throwing) throw new Error('막힘'); m.set(k, String(v)) },
    removeItem: k => { if (throwing) throw new Error('막힘'); m.delete(k) },
    m,
  }
}

// ── 12-2 덮기 레이어를 고르면 도구 ──
eq('덮기 레이어 → [덮기]', toolForLayer({ type: 'cover' }, 'brush'), 'cover')
eq('지우기 레이어 → [사각형 선택] (브러시·주변으로 덮기에서)', [toolForLayer({ type: 'fill' }, 'brush'), toolForLayer({ type: 'fill' }, 'cover')], ['marquee', 'marquee'])
eq('고른 것 없음·모르는 종류 → 그대로', [toolForLayer(null, 'brush'), toolForLayer({ type: 'text' }, 'rect')], ['brush', 'rect'])

// ── 16 Ctrl+A ──
const key = (extra, target = { tagName: 'DIV' }) => ({ code: 'KeyA', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, target, ...extra })
eq('Ctrl+A(입력칸 밖) → 브라우저 전체 선택 막음', blocksBrowserSelectAll(key({})), true)
eq('Cmd+A도', blocksBrowserSelectAll(key({ ctrlKey: false, metaKey: true })), true)
eq('입력칸·글자칸·편집 가능 요소 안에서는 그대로', [blocksBrowserSelectAll(key({}, { tagName: 'INPUT' })), blocksBrowserSelectAll(key({}, { tagName: 'TEXTAREA' })), blocksBrowserSelectAll(key({}, { tagName: 'DIV', isContentEditable: true }))], [false, false, false])
eq('다른 키·Shift·Alt 조합은 안 막음', [blocksBrowserSelectAll(key({ code: 'KeyC' })), blocksBrowserSelectAll(key({ shiftKey: true })), blocksBrowserSelectAll(key({ altKey: true })), blocksBrowserSelectAll(key({ ctrlKey: false }))], [false, false, false, false])
eq('글자 치는 곳 판단', [isTypingTarget({ tagName: 'SELECT' }), isTypingTarget({ tagName: 'BUTTON' }), isTypingTarget(null)], [true, false, false])

// ── 17-1 미니뷰 누르기 → 페이지 칸만 스크롤, 멀면 바로 ──
const V = 800
eq('start: 구간 맨 위로(여백), 가까우면 부드럽게', scrollPlan({ elTop: 900, elHeight: 500, scrollTop: 0, viewHeight: V, block: 'start' }), { top: 900 - SCROLL_MARGIN, behavior: 'smooth' })
eq('start: 화면 2배보다 멀면 바로 (사진이 줄줄이 지나가지 않게)', scrollPlan({ elTop: 6000, elHeight: 500, scrollTop: 0, viewHeight: V, block: 'start' }).behavior, 'auto')
eq('nearest: 이미 다 보이면 움직이지 않음', scrollPlan({ elTop: 100, elHeight: 300, scrollTop: 0, viewHeight: V, block: 'nearest' }), null)
eq('nearest: 아래로 넘치면 아래 끝이 보이게', scrollPlan({ elTop: 700, elHeight: 300, scrollTop: 0, viewHeight: V, block: 'nearest' }), { top: 700 + 300 - V + SCROLL_MARGIN, behavior: 'smooth' })
eq('nearest: 위로 벗어나면 위 끝이 보이게', scrollPlan({ elTop: 100, elHeight: 300, scrollTop: 500, viewHeight: V, block: 'nearest' }).top, 100 - SCROLL_MARGIN)
eq('위 끝보다 위로는 안 감', scrollPlan({ elTop: 5, elHeight: 300, scrollTop: 500, viewHeight: V, block: 'start' }).top, 0)

// ── 14 지우기 가이드는 이 탭에서 한 번 ──
{
  const ss = memStorage()
  eq('처음엔 안 띄움 기록 없음', readGuideShown(ss, 'erase'), false)
  eq('띄운 뒤 기억 → 다시 안 띄움', [writeGuideShown(ss, 'erase'), readGuideShown(ss, 'erase')], [true, true])
  eq('편집기 가이드도 이 탭에서 한 번 (2026-09-29 — 닫으면 다시 안 띄움)', [readGuideShown(ss, 'editor'), writeGuideShown(ss, 'editor'), readGuideShown(ss, 'editor')], [false, true, true])
  { const s2 = memStorage(); writeGuideShown(s2, 'erase'); eq('편집기·지우기 기록은 따로', readGuideShown(s2, 'editor'), false) }
  eq('"다시 보지 않기"와 따로 (localStorage 값은 안 건드림)', readGuideHidden(memStorage(), 'erase'), false)
  eq('탭 저장소를 못 쓰면 창 안에서만 (오류 없이 false)', [readGuideShown(memStorage(true), 'erase'), writeGuideShown(memStorage(true), 'erase'), readGuideShown(null, 'erase')], [false, false, false])
}

// ── 17-2 [구간 배경색과 같게] 기준 ──
{
  const page = { sections: [{ id: 'a', bg: '#FFEEDD' }, { id: 'b', bg: '#112233' }, { id: 'c', bg: 'white' }] }
  eq('① 사진이 놓인 구간 (소문자로)', sectionBgChoice(page, { photoSectionId: 'a', selectedSectionId: 'b' }), { color: '#ffeedd', source: 'photo', sectionId: 'a', reason: '' })
  eq('② 페이지에 없는 사진 → 골라진 구간', sectionBgChoice(page, { selectedSectionId: 'b', inViewSectionId: 'a' }).source, 'selected')
  eq('③ 고른 구간도 없으면 보고 있는 구간', sectionBgChoice(page, { inViewSectionId: 'b' }), { color: '#112233', source: 'inView', sectionId: 'b', reason: '' })
  eq('④ 아무것도 없으면 페이지 기본 흰색 (잠그지 않음)', sectionBgChoice(page, {}), { color: '#ffffff', source: 'page', sectionId: null, reason: '' })
  eq('페이지 기본 = 새 구간 기본 배경', PAGE_DEFAULT_BG, SECTION_BG)
  const old = sectionBgChoice(page, { photoSectionId: 'c', selectedSectionId: 'a' })
  eq('기준 구간 색이 옛 형식 → 다른 구간으로 몰래 바꾸지 않고 잠금 + 이유', [old.color, old.sectionId, /예전 형식/.test(old.reason)], [null, 'c', true])
  eq('없는 구간 id는 건너뜀', sectionBgChoice(page, { photoSectionId: 'zz', inViewSectionId: 'a' }).sectionId, 'a')
}

// ── 17-3 붓 크기 [ ] 단계표 ──
eq('80 → ] → [ = 80 (예전 80 → 92 → 78)', stepBrushSize(stepBrushSize(80, 1, 2, 300), -1, 2, 300), 80)
eq('단계표 사이 값은 가까운 칸으로 (85 → ] 92 · [ 80)', [stepBrushSize(85, 1, 2, 300), stepBrushSize(85, -1, 2, 300)], [92, 80])
eq('끝에서 멈춤', [stepBrushSize(300, 1, 2, 300), stepBrushSize(2, -1, 2, 300)], [300, 2])
eq('여러 번 오르내려도 같은 자리', (() => { let v = 40; for (let i = 0; i < 5; i++) v = stepBrushSize(v, 1, 2, 300); for (let i = 0; i < 5; i++) v = stepBrushSize(v, -1, 2, 300); return v })(), 40)
eq('단계표는 오름차순·중복 없음', BRUSH_LADDER.every((v, i) => i === 0 || v > BRUSH_LADDER[i - 1]), true)

// ── 결정 2 원클릭 안내 띠 ──
{
  const page = { v: 1, width: 780, gap: 30, parked: [], sections: [] }
  const auto = withDraftMark(page, ['s1'], '글자는 템플릿 기본 문구예요')
  eq('원클릭 페이지 표시 → 띠를 보일 수 있음', [isAutoPage(auto), isAutoPage(page), isAutoPage(null)], [true, false, false])
  const ls = memStorage()
  eq('닫기 전 = 안 닫음', readNoticeClosed(ls, 'p1'), false)
  eq('닫으면 그 작업만 기억 (다른 작업은 그대로)', [writeNoticeClosed(ls, 'p1', true), readNoticeClosed(ls, 'p1'), readNoticeClosed(ls, 'p2'), ls.m.has(NOTICE_KEY_PREFIX + 'p1')], [true, true, false, true])
  eq('새 원클릭이 끝나면 지움 → 다시 보임', [writeNoticeClosed(ls, 'p1', false), readNoticeClosed(ls, 'p1')], [true, false])
  eq('저장소를 못 쓰면 띠를 보임(오류 없이)', [readNoticeClosed(memStorage(true), 'p1'), writeNoticeClosed(memStorage(true), 'p1', true), readNoticeClosed(null, 'p1')], [false, false, false])
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
