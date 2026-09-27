// 캔버스 위 조작 테스트 — node scripts/test-studio-canvas-ui.mjs
// [요소] 종류 전환 · 요소 도구줄(버튼·자리) · [⋯] 팝오버 · 섹션 사이 추가 · 섹션 도구줄 · 미니뷰 끌어서 순서 변경 · 안내 한 줄 · 코드 연결
import fs from 'node:fs'
import {
  ELEMENT_TABS, elementTabOf, itemBarButtons, floatBarPosition, unionBox, sectionBarButtons,
  sectionGapSlots, sectionAddArgs, insertIndexFromY, orderAfterDrop, SECTION_ADD_HINT,
} from '../src/lib/studioCanvasUi.js'
import { layoutSections, addSection, reorderSections, emptyPage, moveSection, duplicateSection, removeSection } from '../src/lib/studioPage.js'
import { GUIDE_KEYS, readGuideHidden, writeGuideHidden } from '../src/lib/studioGuide.js'
import { LABELS } from '../src/lib/studioHistory.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── [요소] 종류 전환 ──
eq('종류 = 도형·배지·사이즈표 순서', ELEMENT_TABS.map(t => t.label), ['도형', '배지', '사이즈표'])
eq('처음(기억 없음) = 첫 종류', elementTabOf(null), 'shape')
eq('기억한 종류 그대로', [elementTabOf('badge'), elementTabOf('table')], ['badge', 'table'])
eq('모르는 값 = 첫 종류', elementTabOf('nope'), 'shape')
{
  const panel = read('src/components/studio/StudioElementPanel.vue')
  eq('패널: 종류 버튼이 맨 위(목록 칸 밖)', panel.indexOf('data-element-tabs') < panel.indexOf('data-element-list'), true)
  eq('패널: 목록 칸만 스크롤 (flex-1 min-h-0 overflow-y-auto)', /class="flex-1 min-h-0 overflow-y-auto" data-element-list/.test(panel), true)
  eq('패널: 종류마다 한 묶음만 (도형 / 배지 / 사이즈표)', [/v-if="current === 'shape'"/.test(panel), /v-else-if="current === 'badge'"/.test(panel), /v-else class="px-4 pt-4 pb-4 space-y-3" data-table-group/.test(panel)], [true, true, true])
  eq('패널: 누르면 update:tab (편집기가 기억)', /\$emit\('update:tab', t\.key\)/.test(panel), true)
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: v-model:tab="elementTab" (패널이 새로 만들어져도 기억)', /v-model:tab="elementTab"/.test(ed), true)
}

// ── 요소 도구줄 버튼 ──
{
  const b = itemBarButtons({ anyLocked: false, allLocked: false, anyHidden: false })
  eq('버튼 순서 [복제][잠금][숨기기][앞으로][뒤로][삭제][⋯]', b.map(x => x.key), ['duplicate', 'lock', 'hide', 'forward', 'backward', 'delete', 'more'])
  eq('명령 = 기존 runCommand 이름', b.map(x => x.cmd), ['duplicate', 'lock', 'hide', 'order', 'order', 'delete', 'more'])
  eq('앞으로·뒤로 = order forward·backward', [b[3].args, b[4].args], [{ where: 'forward' }, { where: 'backward' }])
  eq('툴팁 문구', b.slice(0, 6).map(x => x.tip), [
    '똑같은 것 하나 더 만들기 (Ctrl+D)', '실수로 움직이지 않게 고정', '지우지 않고 잠깐 안 보이게 (내보내기에서도 빠짐)',
    '다른 요소보다 위로', '다른 요소보다 아래로', '삭제 (Delete)',
  ])
  eq('[⋯] 툴팁도 있음', !!b[6].tip, true)
  const l = itemBarButtons({ anyLocked: true, allLocked: true, anyHidden: true })
  eq('잠김 → [잠금 풀기] unlock · 숨김 → [보이기] show', [l[1].cmd, l[1].label, l[2].cmd, l[2].label], ['unlock', '잠금 풀기', 'show', '보이기'])
  eq('모두 잠김 → 삭제 잠금', l[5].disabled, true)
}

// ── 요소 도구줄 자리 ──
{
  const view = { x: 0, y: 0, w: 1000, h: 800 }, bar = { w: 300, h: 36 }
  const up = floatBarPosition({ box: { x: 400, y: 300, w: 200, h: 100 }, bar, view, above: 48 })
  eq('공간이 있으면 위쪽 · 가로 가운데 · 회전 손잡이 위로', up, { left: 350, top: 300 - 48 - 36, side: 'above' })
  const down = floatBarPosition({ box: { x: 400, y: 40, w: 200, h: 100 }, bar, view, above: 48, below: 16 })
  eq('위가 모자라면 아래쪽 (손잡이 밑으로)', down, { left: 350, top: 156, side: 'below' })
  const left = floatBarPosition({ box: { x: -80, y: 300, w: 100, h: 50 }, bar, view })
  eq('화면 왼쪽 밖으로 안 나감', left.left, 8)
  const right = floatBarPosition({ box: { x: 950, y: 300, w: 100, h: 50 }, bar, view })
  eq('화면 오른쪽 밖으로 안 나감', right.left, 1000 - 8 - 300)
  const scrolled = floatBarPosition({ box: { x: 400, y: 1250, w: 200, h: 100 }, bar, view: { x: 0, y: 1200, w: 1000, h: 800 }, above: 48 })
  eq('스크롤한 화면 기준 (위쪽 모자람 → 아래)', scrolled.side, 'below')
  const huge = floatBarPosition({ box: { x: 0, y: -100, w: 1000, h: 2000 }, bar, view })
  eq('위아래 모두 모자람(아주 큰 요소) → 보이는 영역 안 위쪽', [huge.side, huge.top], ['inside', 8])
  const table = floatBarPosition({ box: { x: 400, y: 50, w: 200, h: 100 }, bar, view, above: 48, below: 52 })
  eq('표 = 아래쪽이면 [+ 줄] 밑으로', table.top, 50 + 100 + 52)
  eq('여러 개 = 감싸는 상자', unionBox([{ x: 10, y: 20, w: 30, h: 40 }, { x: 100, y: 5, w: 10, h: 10 }]), { x: 10, y: 5, w: 100, h: 55 })
  eq('없으면 null', unionBox([]), null)
}

// ── [⋯] 팝오버 · 도구줄 연결 ──
{
  const tb = read('src/components/studio/StudioItemToolbar.vue')
  eq('팝오버 = StudioTransformPanel (위치·크기·각도·투명도·회전·뒤집기·정렬)', /<StudioTransformPanel/.test(tb), true)
  eq('팝오버 명령도 편집기로 그대로', /@command="\(n, a\) => \$emit\('command', n, a\)"/.test(tb), true)
  eq('Esc = 팝오버만 닫기 (먼저 잡음)', /moreOpen\.value && e\.key === 'Escape'/.test(tb) && /addEventListener\('keydown', onKey, true\)/.test(tb), true)
  eq('고른 것이 바뀌면 닫힘', /watch\(\(\) => props\.selectedIds\.join\(','\), \(\) => \{ moreOpen\.value = false \}\)/.test(tb), true)
  const tp = read('src/components/studio/StudioTransformPanel.vue')
  eq('팝오버 칸: X·Y·가로·세로·각도·투명도', ['x', 'y', 'w', 'h'].every(k => tp.includes(`key: '${k}'`)) && tp.includes('data-num="rotation"') && tp.includes('data-num="opacity"'), true)
  eq('팝오버 칸: 90°·뒤집기·정렬 6개', ['rotate90', 'flipX', 'flipY'].every(k => tp.includes(`data-cmd="${k}"`)) && (tp.match(/where: '(left|hcenter|right|top|vcenter|bottom)'/g) || []).length, 6)
  eq('정렬 문구 = 섹션 기준', tp.includes("'정렬 (섹션 기준)'"), true)
  eq('도구줄로 옮긴 버튼(복제·잠금·숨기기·삭제)은 팝오버에 없음', ['data-cmd="duplicate"', 'data-cmd="delete"', "'lock')", "'hide')"].some(k => tp.includes(k)), false)
  const pv = read('src/components/studio/StudioPageView.vue')
  eq('도구줄 숨김: 끄는 중·박스 선택·글자 고치기·표 칸 입력', /draft\.value \|\| marquee\.value \|\| props\.textEdit \|\| props\.cellEdit\) return null/.test(pv), true)
  eq('회전 손잡이가 있으면 위로 48 (손잡이 34px 위)', /one\?\.handles && one\.rotate \? 48 : 30/.test(pv), true)
  const ed = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: 도구줄 명령 = runCommand (되돌리기·자동 저장 같은 길)', /@command="runCommand" @add-section="onAddSectionAt"/.test(ed), true)
  eq('왼쪽 "고른 요소" 블록 없음 (StudioTransformPanel을 패널에 안 씀)', ed.includes('<StudioTransformPanel'), false)
  eq('왼쪽: 탭 목록이 먼저, 고른 요소 설정은 그 아래', ed.indexOf('data-tool-area') < ed.indexOf('data-selection-panels'), true)
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
    'src/components/studio/StudioTextPanel.vue', 'src/components/studio/StudioTransformPanel.vue', 'src/components/studio/StudioExportModal.vue',
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
