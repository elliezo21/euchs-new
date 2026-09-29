// 캔버스 위 조작 테스트 — node scripts/test-studio-canvas-ui.mjs
// [요소] 종류 전환 · 작업판 위 가로 도구줄(종류별 버튼) · 크기·회전·불투명도 슬라이더 · 왼쪽 패널 · 섹션 빈 곳 선택 · 섹션 사이 추가 · 섹션 도구줄 · 미니뷰 끌기 · 안내 순서 · 지우기 화면 · 코드 연결
import fs from 'node:fs'
import {
  ELEMENT_TABS, elementTabOf, selectBarButtons, sizeFactor, SIZE_PCT, ROTATE_DEG, blankPressTarget, sectionBarButtons,
  sectionGapSlots, sectionAddArgs, insertIndexFromY, orderAfterDrop, SECTION_ADD_HINT,
} from '../src/lib/studioCanvasUi.js'
import {
  layoutSections, addSection, reorderSections, emptyPage, moveSection, duplicateSection, removeSection,
  addElementItem, addTextItem, findItem, scaleItemsFrom, setLocked,
} from '../src/lib/studioPage.js'
import { GUIDE_KEYS, readGuideHidden, writeGuideHidden } from '../src/lib/studioGuide.js'
import { LABELS } from '../src/lib/studioHistory.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const measure = (s, style) => [...s].reduce((n, ch) => n + style.fontSize * (/[가-힯]/.test(ch) ? 1 : ch === ' ' ? 0.25 : 0.5), 0) // test-studio-text와 같은 가짜 폭
// 줄바꿈은 LF로 맞춰 읽는다 — Windows에서 CRLF로 풀린 파일도 같은 결과가 나오게 (git autocrlf)
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

// ── [요소] 종류 전환 ──
eq('종류 = 도형·배지·꾸밈·표·이미지 순서', ELEMENT_TABS.map(t => t.label), ['도형', '배지', '꾸밈', '표', '이미지'])
eq('처음(기억 없음) = 첫 종류', elementTabOf(null), 'shape')
eq('기억한 종류 그대로', [elementTabOf('badge'), elementTabOf('table')], ['badge', 'table'])
eq('모르는 값 = 첫 종류', elementTabOf('nope'), 'shape')
{
  const panel = read('src/components/studio/StudioElementPanel.vue')
  eq('패널: 종류 버튼이 맨 위(목록 칸 밖)', panel.indexOf('data-element-tabs') < panel.indexOf('data-element-list'), true)
  eq('패널: 목록 칸만 스크롤 (flex-1 min-h-0 overflow-y-auto)', /class="flex-1 min-h-0 overflow-y-auto" data-element-list/.test(panel), true)
  eq('패널: 종류마다 한 묶음만 (도형 / 배지 / 꾸밈 / 이미지 / 표)', [/v-if="current === 'shape'"/.test(panel), /v-else-if="current === 'badge'"/.test(panel), /v-else-if="current === 'decor'"/.test(panel), /v-else-if="current === 'asset'"/.test(panel), /v-else data-table-group/.test(panel)], [true, true, true, true, true])
  eq('패널: 누르면 update:tab (편집기가 기억)', /\$emit\('update:tab', t\.key\)/.test(panel), true)
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: v-model:tab="elementTab" (패널이 새로 만들어져도 기억)', /v-model:tab="elementTab"/.test(ed), true)
}

// ── 작업판 위 가로 도구줄 — 요소 종류별 버튼 ──
{
  const base = { photo: false, autoMark: null, anyLocked: false, allLocked: false, anyHidden: false, canGroup: false, canUngroup: false, headerRow: null, tableCount: 0 }
  const keys = s => { const r = selectBarButtons({ ...base, ...s }); return { left: r.left.map(b => b.key), right: r.right.map(b => b.key), r } }
  const COMMON = ['size', 'rotate', 'opacity', 'order', 'align']
  const photo = keys({ kinds: new Set(['image']), photo: true })
  eq('공통 [크기][회전][불투명도][앞뒤 순서][정렬]', photo.left.slice(0, 5), COMMON)
  eq('사진 + [사진 바꾸기][자르기][필터][꾸미기][지우기][원본 비교]', photo.left.slice(5), ['replace', 'crop', 'look', 'deco', 'erase', 'compare'])
  eq('오른쪽 [복제][잠금][숨기기][삭제]', photo.right, ['duplicate', 'lock', 'hide', 'delete'])
  eq('사진 [삭제] = 예전 [페이지에서 빼기] 명령 (사진은 목록에 남음)', photo.r.right.at(-1).cmd, 'removeFromPage')
  const erased = keys({ kinds: new Set(['image']), photo: true, fillCount: 3, photoInfo: '대표 사진 · 547×547px · 120KB · 지움 3' })
  eq('지운 적 있음 → [지우기] 바로 옆 [지우기 모두 되돌리기]', erased.left.slice(9, 11), ['erase', 'clearAll'])
  eq('사진 정보 = [지우기] 툴팁 둘째 줄', erased.r.left.find(b => b.key === 'erase').tip.split('\n')[1], '대표 사진 · 547×547px · 120KB · 지움 3')
  eq('지운 적 없음 → [지우기 모두 되돌리기] 숨김', keys({ kinds: new Set(['image']), photo: true, fillCount: 0 }).left.includes('clearAll'), false)
  {
    const ed = read('src/views/studio/StudioEditorView.vue'), sb = read('src/components/studio/StudioSelectBar.vue')
    eq('작업판 오른쪽 위 사진 정보 카드 없음', ed.includes('data-image-info'), false)
    eq('[지우기 모두 되돌리기] → 예전 확인창 (clearAllOpen)', [/@clear-all="clearAllOpen = true"/.test(ed), sb.includes("emit('clear-all')")], [true, true])
  }
  const auto = keys({ kinds: new Set(['image']), photo: true, autoMark: { problem: 'textLeft', canRevert: true } })
  eq('원클릭 확인 필요 → [직접 고치기] + [원본으로]', [auto.r.left.find(b => b.key === 'erase').label, auto.left.includes('autoRevert')], ['직접 고치기', true])
  const text = keys({ kinds: new Set(['text']) })
  eq('글자 + [글꼴][글자 크기][색][굵기][글자 정렬][글자 꾸미기]', text.left.slice(5), ['font', 'fontSize', 'textColor', 'weight', 'textAlign', 'textMore'])
  eq('글자 [삭제] = delete', text.r.right.at(-1).cmd, 'delete')
  eq('도형 + [모양][색][테두리]', keys({ kinds: new Set(['shape']) }).left.slice(5), ['shapeKind', 'fill', 'stroke'])
  eq('선 + [선 모양]', keys({ kinds: new Set(['line']) }).left.slice(5), ['line'])
  const table = keys({ kinds: new Set(['table']), tableCount: 1, headerRow: true })
  eq('표 + [행 추가][열 추가][첫 줄 제목][표 모양]', table.left.slice(5), ['addRow', 'addCol', 'header', 'tableMore'])
  eq('첫 줄 제목 켜짐 표시 · 표 여러 개면 행·열 추가 잠금', [table.r.left.find(b => b.key === 'header').pressed, keys({ kinds: new Set(['table']), tableCount: 2 }).r.left.find(b => b.key === 'addRow').disabled], [true, true])
  const badge = keys({ kinds: new Set(['shape', 'text']), canUngroup: true })
  eq('배지(도형+글자 그룹) = 두 종류 버튼 + [그룹 풀기]', [badge.left.includes('font'), badge.left.includes('fill'), badge.right], [true, true, ['duplicate', 'lock', 'hide', 'group', 'delete']])
  eq('묶을 수 있으면 [그룹]', keys({ kinds: new Set(['shape']), canGroup: true }).r.right.find(b => b.key === 'group').cmd, 'group')
  eq('툴팁 = 461c653 문구 유지', photo.r.right.map(b => b.tip), ['똑같은 것 하나 더 만들기 (Ctrl+D)', '실수로 움직이지 않게 고정', '지우지 않고 잠깐 안 보이게 (받는 이미지에서도 빠짐)', '삭제 (Delete)'])
  const locked = keys({ kinds: new Set(['shape']), anyLocked: true, allLocked: true, anyHidden: true })
  eq('잠김 → [잠금 풀기] · 숨김 → [보이기] · 모두 잠김 → 삭제·회전·정렬 잠금', [locked.r.right[1].cmd, locked.r.right[2].cmd, locked.r.right.at(-1).disabled, locked.r.left[1].disabled, locked.r.left[4].disabled], ['unlock', 'show', true, true, true])
  eq('[불투명도] 이름', photo.r.left[2].label, '불투명도')
  const bar = read('src/components/studio/StudioSelectBar.vue')
  const ALL_POPS = ['size', 'rotate', 'opacity', 'order', 'align', 'look', 'deco', 'font', 'textSize', 'textColor', 'weight', 'textAlign', 'textMore', 'shapeKind', 'fill', 'stroke', 'line', 'table']
  const pops = [...new Set(['image', 'text', 'shape', 'line', 'table'].flatMap(k => selectBarButtons({ ...base, kinds: new Set([k]), photo: k === 'image', tableCount: 1 }).left.filter(b => b.type === 'pop').map(b => b.pop)))]
  eq('펼침 칸 이름 = 도구줄이 그리는 칸 전부', pops.sort(), [...ALL_POPS].sort())
  eq('도구줄이 펼침 칸을 모두 그림 (슬라이더 3 · 순서 · 정렬 · 사진 look/deco · 글자 6 · 도형 4 · 표)',
    ["pop === 'size'", "pop === 'rotate'", "pop === 'opacity'", "pop === 'order'", "pop === 'align'", "pop === 'look' || pop === 'deco'", 'TEXT_PARTS[pop]', 'SHAPE_PARTS[pop]', "pop === 'table'"].every(k => bar.includes(k)), true)
}

// ── 크기·회전·불투명도 슬라이더 ──
{
  eq('크기 범위 5~500%', SIZE_PCT, [5, 500])
  eq('회전 범위 -180~180°', ROTATE_DEG, [-180, 180])
  eq('% → 배율 (범위 밖은 자름)', [sizeFactor(100), sizeFactor(250), sizeFactor(1), sizeFactor(900)], [1, 2.5, 0.05, 5])
  let p = addSection(emptyPage(), { height: 1000 })
  const sid = p.sections[0].id
  let r = addElementItem(p, sid, { type: 'shape', shape: 'rect', w: 100, h: 50 })
  p = r.page; const sq = r.itemId
  const it = id => findItem(p2, id).item
  let p2 = scaleItemsFrom(p, [sq], 2, measure)
  const b0 = findItem(p, sq).item
  eq('크기 200% = 가로·세로 2배 (비율 유지)', [it(sq).w, it(sq).h], [200, 100])
  eq('…가운데 그대로', [it(sq).x + it(sq).w / 2, it(sq).y + it(sq).h / 2], [b0.x + b0.w / 2, b0.y + b0.h / 2])
  p2 = scaleItemsFrom(p, [sq], 0.5, measure)
  eq('크기 50%', [it(sq).w, it(sq).h], [50, 25])
  const t = addTextItem(p, sid, { text: '가나다', fontSize: 40, w: 200 }, measure)
  p2 = scaleItemsFrom(t.page, [t.itemId], 1.5, measure)
  eq('글자 = 글자 크기·폭 함께 (모서리 손잡이와 같음)', [it(t.itemId).fontSize, it(t.itemId).w], [60, 300])
  const lk = setLocked(p, [sq], true)
  eq('잠긴 요소는 그대로', scaleItemsFrom(lk, [sq], 2, measure) === lk, true)
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: scale = scaleItemsFrom + 이력 한 칸(합침)', /case 'scale': applyPage\(scaleItemsFrom\(args\.base, ids, args\.factor, textMeasure\), LABELS\.elResize, \{ mergeKey: 'scale' \}\)/.test(ed), true)
  eq('편집기: 회전 슬라이더 = 끄는 동안 이력 한 칸', /case 'rotation': applyPage\(setRotation\(p, ids, args\.deg\), LABELS\.elRotate, args\.merge \? \{ mergeKey: 'rotation' \}/.test(ed), true)
  const bar = read('src/components/studio/StudioSelectBar.vue')
  eq('불투명도 슬라이더 0~100 = opacity (합침)', /min="0" max="100"[^>]*data-sel-range="opacity" @input="\$emit\('command', 'opacity', \{ v: Number\(\$event\.target\.value\) \/ 100, merge: true \}\)"/.test(bar), true)
  eq('크기 = 연 때의 문서 기준', /if \(b\.pop === 'size'\) \{ sizeBase = props\.page; sizePct\.value = 100 \}/.test(bar), true)
}

// ── 왼쪽 패널 = 넣을 것만 · [X] · 가로 도구줄 자리 ──
{
  const ed = read('src/views/studio/StudioEditorView.vue')
  const rail = ed.slice(ed.indexOf('const RAIL = ['), ed.indexOf(']\n', ed.indexOf('const RAIL = [')))
  eq('왼쪽 메뉴 순서 템플릿→사진→텍스트→요소→섹션→배경합성→저장값', [...rail.matchAll(/key: '(\w+)'/g)].map(m => m[1]), ['template', 'photo', 'text', 'element', 'section', 'bg', 'saved'])
  eq('왼쪽에 "고른 요소 설정" 칸 없음', [ed.includes('data-selection-panels'), ed.includes('<StudioImageItemPanel'), ed.includes('<StudioTextItemPanel'), ed.includes('<StudioShapeItemPanel'), ed.includes('<StudioTableItemPanel'), ed.includes('<StudioTransformPanel')], [false, false, false, false, false, false])
  eq('왼쪽 패널 [X] 닫기 · 아이콘 = 다시 열기', [/data-material-close @click="leftOpen = false"/.test(ed), /@click="onRail\(t\.key\)"/.test(ed), /activeTool\.value = key\n  leftOpen\.value = true/.test(ed)], [true, true, true])
  eq('가로 도구줄 = 작업판 맨 위 고정, 스크롤 칸은 그 아래(top-12)', [/data-select-strip/.test(ed), /:class="page && !showStart \? 'top-12' : 'top-0'" data-page-scroll/.test(ed)], [true, true])
  eq('도구줄 숨김: 안 고름·글자/표 칸 입력·지우기·시작 화면', /selectedItemIds\.value\.length > 0 && !showStart\.value && !eraseOpen\.value && !textEdit\.value && !cellEdit\.value/.test(ed), true)
  eq('작업판 왼쪽 아래 되돌리기·다시 (같은 함수)', /data-canvas-action="undo" @click="undoAny"/.test(ed) && /data-canvas-action="redo" @click="redoAny"/.test(ed), true)
  const pv = read('src/components/studio/StudioPageView.vue')
  eq('요소 위 떠 있는 도구줄 없음 ([⋯] 팝오버 없음)', [pv.includes('<StudioItemToolbar'), ed.includes('StudioItemToolbar')], [false, false])
}

// ── 섹션 빈 곳 누르기 = 섹션 선택 ──
{
  eq('섹션 안 빈 곳 = 그 섹션 (요소가 있어도)', blankPressTarget({ shift: false, sectionId: 's2', sectionIds: ['s1', 's2'] }), { kind: 'section', sectionId: 's2' })
  eq('섹션 사이 간격·페이지 밖 = 선택 해제', blankPressTarget({ shift: false, sectionId: null, sectionIds: ['s1'] }), { kind: 'clear' })
  eq('Shift = 그대로 (여러 개 고르기 중)', blankPressTarget({ shift: true, sectionId: 's1', sectionIds: ['s1'] }), { kind: 'none' })
  eq('없는 섹션 id = 선택 해제', blankPressTarget({ shift: false, sectionId: 'zz', sectionIds: ['s1'] }), { kind: 'clear' })
  const pv = read('src/components/studio/StudioPageView.vue')
  eq('페이지: 빈 곳 떼기 → blankPressTarget → select-section', /const t = blankPressTarget\(/.test(pv) && /if \(t\.kind === 'section'\) emit\('select-section', t\.sectionId\)/.test(pv), true)
}

// ── 첫 진입 안내는 하나씩 ──
{
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('섹션 안내 = 가이드가 떠 있거나 곧 뜰 참이면 기다림', /&& !guide\.open && guideAutoReady\.value !== 'editor'\)/.test(ed), true)
  eq('"다시 보지 않기" = 가이드 창 안 체크 칸 (떠 있는 바 없음)', [/<template #footer>/.test(ed), /data-guide-hide @change="setGuideHidden\(\$event\.target\.checked\)"/.test(ed), ed.includes('<StudioGuideHideBar')], [true, true, false])
  const sg = read('src/components/common/SpotlightGuide.vue')
  eq('SpotlightGuide: footer 칸은 넣을 때만 (다른 화면 가이드는 그대로)', /<div v-if="\$slots\.footer"[^>]*><slot name="footer" \/><\/div>/.test(sg), true)
}

// ── 지우기 화면 ──
{
  const er = read('src/components/studio/StudioEraseScreen.vue')
  eq('안내 = CLAUDE.md 6번 확정 문구 (새 이름)', [er.includes('지울 곳을 [브러시]로 칠하거나 [사각형 선택]으로 감싼 뒤 [AI로 지우기] 또는 [단색]을 누르세요'), er.includes('사람·옷 위는 [주변으로 덮기]가 더 깔끔해요'), er.includes('(붓)'), er.includes('[덮기]가')], [true, true, false, false])
  eq('브러시 크기·칠하기/덜어내기 = [브러시] 도구일 때만', /v-if="canvasTool === 'brush'" class="mt-5" data-brush-controls/.test(er), true)
  const md = read('CLAUDE.md')
  eq('CLAUDE.md 확정 문구와 같음', md.includes('지울 곳을 [브러시]로 칠하거나 [사각형 선택]으로 감싼 뒤 [AI로 지우기] 또는 [단색]을 누르세요') && md.includes('사람·옷 위는 [주변으로 덮기]가 더 깔끔해요'), true)
}

// ── 섹션 사이 추가 ──
{
  let p = emptyPage()
  p = addSection(p, { height: 300 }); p = addSection(p, { height: 500 }); p = addSection(p, { height: 200 })
  const ids = p.sections.map(s => s.id)
  eq('자리 = 맨 위·사이 2곳·맨 아래 (gap 0)', sectionGapSlots(layoutSections(p)), [{ at: 0, y: 0 }, { at: 1, y: 300 }, { at: 2, y: 800 }, { at: 3, y: 1000 }])
  const g = { ...p, gap: 40 }
  eq('섹션 사이 간격이 있으면 그 가운데', sectionGapSlots(layoutSections(g)).map(s => s.y), [0, 320, 860, 1080])
  eq('섹션이 없으면 자리 없음', sectionGapSlots(layoutSections(emptyPage())), [])
  eq('맨 위 = 첫 섹션 위에', sectionAddArgs(ids, 0), { where: 'above', sectionId: ids[0] })
  eq('1번·2번 사이 = 1번 아래에', sectionAddArgs(ids, 1), { where: 'below', sectionId: ids[0] })
  eq('맨 아래 = 마지막 아래에', sectionAddArgs(ids, 3), { where: 'below', sectionId: ids[2] })
  eq('잘못된 자리 = null', [sectionAddArgs(ids, -1), sectionAddArgs(ids, 4), sectionAddArgs(ids, 1.5)], [null, null, null])
  // 편집기 runCommand('sectionAdd')와 같은 자리 계산 (above = i, below = i + 1) → addSection
  const run = (page, a) => {
    const i = page.sections.findIndex(s => s.id === a.sectionId)
    const at = a.where === 'end' || i < 0 ? page.sections.length : a.where === 'above' ? i : i + 1
    return { page: addSection(page, { at }), at }
  }
  const r1 = run(p, sectionAddArgs(ids, 1))
  eq('1번·2번 사이에 넣으면 새 섹션이 2번 자리', [r1.at, r1.page.sections[0].id, r1.page.sections[2].id, r1.page.sections[1].items.length], [1, ids[0], ids[1], 0])
  const r0 = run(p, sectionAddArgs(ids, 0))
  eq('맨 위에 넣으면 1번 자리', [r0.page.sections.length, r0.page.sections[1].id], [4, ids[0]])
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: 섹션 사이·미니뷰 [+] = 같은 onAddSectionAt → runCommand(sectionAdd)', /@add-at="onAddSectionAt"/.test(ed) && /runCommand\('sectionAdd', args\)/.test(ed), true)
  eq('sectionAdd 뒤 새 섹션을 고르고 보이게 (예전 그대로)', /if \(applyPage\(next, LABELS\.secAdd\)\) pickSection\(next\.sections\[at\]\.id, true\)/.test(ed), true)
  const pv = read('src/components/studio/StudioPageView.vue')
  eq('버튼 문구 [+ 여기에 섹션 추가]', pv.includes('여기에 섹션 추가'), true)
}

// ── 섹션 도구줄 ──
{
  const b = sectionBarButtons({ index: 0, count: 3, full: false })
  eq('버튼 [↑ 위로][↓ 아래로][복제][삭제]', b.map(x => x.label), ['위로', '아래로', '복제', '삭제'])
  eq('명령 = 기존 섹션 명령', b.map(x => [x.cmd, x.args || null]), [['sectionMove', { by: -1 }], ['sectionMove', { by: 1 }], ['sectionDuplicate', null], ['sectionDelete', null]])
  eq('맨 위 섹션 = 위로 잠금', [b[0].disabled, b[1].disabled], [true, false])
  const last = sectionBarButtons({ index: 2, count: 3, full: true })
  eq('맨 아래 = 아래로 잠금 · 가득 참 = 복제 잠금', [last[1].disabled, last[2].disabled], [true, true])
  eq('모든 버튼에 툴팁', b.every(x => !!x.tip), true)
  let p = emptyPage()
  p = addSection(p); p = addSection(p); p = addSection(p)
  const [a, bb, c] = p.sections.map(s => s.id)
  eq('위로 = moveSection(i-1)', moveSection(p, bb, 0).sections.map(s => s.id), [bb, a, c])
  eq('복제 = 바로 아래', (r => [r.page.sections.length, r.page.sections[2].id === r.sectionId])(duplicateSection(p, bb)), [4, true])
  eq('삭제 = removeSection', removeSection(p, bb).sections.map(s => s.id), [a, c])
  const pv = read('src/components/studio/StudioPageView.vue')
  eq('요소를 고르면 섹션 도구줄 안 뜸 (요소 도구줄 우선)', /props\.selectedIds\.length \|\| !props\.selectedSectionId/.test(pv), true)
}

// ── 미니뷰 끌어서 순서 변경 ──
{
  const cards = [{ top: 0, height: 100 }, { top: 112, height: 100 }, { top: 224, height: 100 }]
  eq('카드 가운데 위 = 그 카드 앞', [insertIndexFromY(cards, 10), insertIndexFromY(cards, 60), insertIndexFromY(cards, 170), insertIndexFromY(cards, 400)], [0, 1, 2, 3])
  const ids = ['a', 'b', 'c', 'd']
  eq('a를 c 앞(2)에 놓기 → b a c d', orderAfterDrop(ids, 'a', 2), ['b', 'a', 'c', 'd'])
  eq('d를 맨 위(0)에', orderAfterDrop(ids, 'd', 0), ['d', 'a', 'b', 'c'])
  eq('b를 맨 아래(4)에', orderAfterDrop(ids, 'b', 4), ['a', 'c', 'd', 'b'])
  eq('제자리(1 또는 2)면 그대로', [orderAfterDrop(ids, 'b', 1) === ids, orderAfterDrop(ids, 'b', 2) === ids], [true, true])
  eq('모르는 id면 그대로', orderAfterDrop(ids, 'z', 0) === ids, true)
  let p = emptyPage()
  p = addSection(p); p = addSection(p); p = addSection(p)
  const sids = p.sections.map(s => s.id)
  const next = reorderSections(p, orderAfterDrop(sids, sids[2], 0))
  eq('reorderSections로 적용 (예전 [순서 변경] 창과 같은 함수)', next.sections.map(s => s.id), [sids[2], sids[0], sids[1]])
  eq('이력 라벨 = "섹션 순서 변경"', LABELS.secReorder, '섹션 순서 변경')
  const mm = read('src/components/studio/StudioMiniMap.vue')
  eq('미니뷰: 카드 draggable + reorder 보냄', /draggable="true"/.test(mm) && /emit\('reorder', next\)/.test(mm), true)
  eq('미니뷰: 카드 사이 [+] = add-at', /\$emit\('add-at', i\)/.test(mm), true)
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: [순서 변경] 버튼 없음 → 안내 "끌어서 순서를 바꿀 수 있어요"', [ed.includes('data-reorder '), ed.includes('끌어서 순서를 바꿀 수 있어요')], [false, true])
  eq('편집기: [섹션 사이 간격] 버튼', ed.includes('섹션 사이 간격</button>'), true)
  eq('편집기: 미니뷰 reorder = reorderSections + secReorder', /applyPage\(reorderSections\(page\.value, ids\), LABELS\.secReorder\)/.test(ed), true)
}

// ── 안내 한 줄 (가이드 "다시 보지 않기"와 같은 저장) ──
{
  const m = new Map()
  const st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }
  eq('문구', SECTION_ADD_HINT, '섹션 사이에 마우스를 올리면 그 자리에 추가할 수 있어요')
  eq('처음 = 보임', readGuideHidden(st, 'sectionAdd'), false)
  writeGuideHidden(st, 'sectionAdd', true)
  eq('닫으면 다시 안 보임 (localStorage 키)', [readGuideHidden(st, 'sectionAdd'), m.get(GUIDE_KEYS.sectionAdd)], [true, '1'])
  eq('편집기 가이드 기억과 따로', readGuideHidden(st, 'editor'), false)
}

// ── 고객 문구 "구간" 0건 (주석·콘솔 제외) ──
{
  const files = [
    'src/views/studio/StudioEditorView.vue', 'src/views/studio/StudioLandingView.vue', 'src/components/studio/StudioPageView.vue',
    'src/components/studio/StudioSectionPanel.vue', 'src/components/studio/StudioMiniMap.vue', 'src/components/studio/StudioElementPanel.vue',
    'src/components/studio/StudioTextPanel.vue', 'src/components/studio/StudioSelectBar.vue', 'src/components/studio/StudioExportModal.vue',
    'src/components/studio/StudioPreview.vue', 'src/components/studio/StudioLayerPanel.vue', 'src/components/studio/StudioBgPanel.vue',
    'src/lib/studioHistory.js', 'src/lib/studioBg.js', 'src/lib/studioExport.js', 'src/data/studioEditorGuide.js', 'src/composables/usePageSession.js',
  ]
  const hits = []
  for (const f of files) {
    read(f).split('\n').forEach((line, i) => {
      const t = line.trim()
      if (!t.includes('구간') || /^(\/\/|\*|\/\*|<!--)/.test(t) || /console\.(error|warn|info|log)/.test(t)) return
      const code = t.replace(/\s\/\/\s.*$/, '') // 줄 끝 주석 (" // " 뒤)
      if (code.includes('구간')) hits.push(`${f}:${i + 1}`)
    })
  }
  eq('고객에게 보이는 "구간" 0건', hits, [])
  eq('랜딩에 "실측:" 0건', read('src/views/studio/StudioLandingView.vue').includes('실측:'), false)
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
