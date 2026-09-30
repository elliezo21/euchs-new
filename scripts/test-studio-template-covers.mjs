// 템플릿 표지(미리 만든 그림)·정렬·NEW 테스트 — node scripts/test-studio-template-covers.mjs
// 표지가 모든 기본 템플릿에 있고 최신인지(템플릿이 바뀌었는데 npm run studio:covers를 안 돌렸으면 실패) · 추가한 날짜 · 추천 목록 · 추천순/최신순 · NEW
import fs from 'node:fs'
import { STUDIO_TEMPLATES } from '../src/lib/studioTemplates.js'
import { TEMPLATE_ADDED } from '../src/data/studioTemplateAdded.js'
import { RECOMMENDED_TEMPLATES } from '../src/data/studioTemplateRecommended.js'
import { sortTemplates, isNewTemplate, addedMs, TEMPLATE_SORTS, DEFAULT_TEMPLATE_SORT, NEW_DAYS } from '../src/lib/studioTemplateSort.js'
import { coverHashes, coverProblems, readCoverIndex, coverFileOf, COVER_WIDTH, COVER_HEIGHT } from './studio-covers-lib.mjs'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const keys = STUDIO_TEMPLATES.map(t => t.key)

// ── 1. 표지 — 모든 기본 템플릿에 있고 최신 ──
{
  const hashes = coverHashes()
  const index = readCoverIndex()
  const problems = coverProblems(index, hashes)
  eq('표지: 문제 없음 (빠짐·옛것 — 있으면 npm run studio:covers)', problems, [])
  eq('표지: 기본 템플릿 수와 같음', Object.keys(index.items || {}).length, STUDIO_TEMPLATES.length)
  eq('표지: 480×640', [index.width, index.height], [COVER_WIDTH, COVER_HEIGHT])
  eq('표지: 해시 = 두 번 계산해도 같음', [...coverHashes()].every(([k, h]) => hashes.get(k) === h), true)
  // 옛것 막기 — 템플릿 내용이 바뀐 것처럼 해시를 바꾸면 검사가 잡는다
  const k0 = keys[0]
  const changed = new Map(hashes)
  changed.set(k0, 'f'.repeat(64))
  eq('옛 표지: 템플릿이 바뀌면 걸림', coverProblems(index, changed).some(p => p.includes(k0) && p.includes('다시 만들지 않음')), true)
  const missing = { ...index, items: { ...index.items } }
  delete missing.items[k0]
  eq('옛 표지: 표지가 빠지면 걸림', coverProblems(missing, hashes).some(p => p === `표지 없음: ${k0}`), true)
  eq('파일 이름 = key + 해시 앞 8자', coverFileOf('abc', '0123456789abcdef'), 'studio-covers/abc-01234567.webp')
  const sizes = Object.values(index.items).map(it => it.bytes)
  eq('표지 한 장 100KB 이하', sizes.every(b => b > 0 && b <= 100 * 1024), true)
}

// ── 2. 추가한 날짜 · 추천 목록 ──
{
  eq('날짜: 모든 기본 템플릿에 있음', keys.filter(k => !Number.isFinite(addedMs(TEMPLATE_ADDED[k]))), [])
  eq('날짜: 없는 템플릿 날짜 없음', Object.keys(TEMPLATE_ADDED).filter(k => !keys.includes(k)), [])
  eq('날짜: 처음 94개는 모두 같은 지난 날짜 → NEW 없음', STUDIO_TEMPLATES.filter(t => isNewTemplate(t, Date.parse('2026-10-01T12:00:00+09:00'))).map(t => t.key), [])
  eq('추천 목록: 있는 템플릿만·중복 없음', [RECOMMENDED_TEMPLATES.every(k => keys.includes(k)), new Set(RECOMMENDED_TEMPLATES).size === RECOMMENDED_TEMPLATES.length], [true, true])
}

// ── 3. 정렬 ──
{
  const base = ['a', 'b', 'c', 'd'].map(key => ({ key }))
  const added = { a: '2026-09-01', b: '2026-09-20', c: '2026-09-01', d: '2026-09-20' }
  const ks = l => l.map(t => t.key)
  eq('기본 = 추천순', [DEFAULT_TEMPLATE_SORT, TEMPLATE_SORTS.map(s => s.label)], ['recommended', ['추천순', '최신순']])
  eq('추천순: 추천 목록이 비면 기본 순서 그대로', ks(sortTemplates([...base].reverse(), 'recommended', { recommended: [], base, added })), ['a', 'b', 'c', 'd'])
  eq('추천순: 추천 목록 먼저(그 순서) → 나머지 기본 순서', ks(sortTemplates(base, 'recommended', { recommended: ['c', 'a'], base, added })), ['c', 'a', 'b', 'd'])
  eq('최신순: 날짜 최신 먼저, 같으면 추천순', ks(sortTemplates(base, 'latest', { recommended: ['d', 'c'], base, added })), ['d', 'b', 'c', 'a'])
  eq('거른 목록도 같은 규칙 (없는 것은 건너뜀)', ks(sortTemplates([base[3], base[0]], 'recommended', { recommended: ['a'], base, added })), ['a', 'd'])
  eq('실제 목록: 추천순 = 지금 순서 (추천 목록 비어 있음)', RECOMMENDED_TEMPLATES.length ? true : ks(sortTemplates(STUDIO_TEMPLATES)).join() === keys.join(), true)
  eq('정렬은 원래 배열을 바꾸지 않음', (() => { const l = [...base].reverse(); sortTemplates(l, 'recommended', { recommended: [], base, added }); return ks(l) })(), ['d', 'c', 'b', 'a'])
}

// ── 4. NEW (추가한 지 14일 안) ──
{
  const added = { x: '2026-09-20' }
  const at = s => Date.parse(`${s}+09:00`)
  const t = { key: 'x' }
  eq('NEW 14일', NEW_DAYS, 14)
  eq('NEW: 그날 0시·13일 23시 / 14일째 0시·그 전날·날짜 없음', [
    isNewTemplate(t, at('2026-09-20T00:00:00'), added), isNewTemplate(t, at('2026-10-03T23:00:00'), added),
    isNewTemplate(t, at('2026-10-04T00:00:00'), added), isNewTemplate(t, at('2026-09-19T23:00:00'), added), isNewTemplate({ key: 'y' }, at('2026-09-21T00:00:00'), added),
  ], [true, true, false, false, false])
}

// ── 5. 화면 연결 ──
{
  const card = read('src/components/studio/StudioTemplateCard.vue')
  eq('카드: 기본 템플릿 = 미리 만든 그림·loading lazy·width/height', [
    /builtInCoverUrl\(props\.tpl\.key\)/.test(card), /loading="lazy"/.test(card), /:width="COVER_W" :height="COVER_H"/.test(card), /data-template-cover-img/.test(card),
  ], [true, true, true, true])
  eq('카드: 기본 템플릿은 화면에서 그리지 않음 (onMounted에서 바로 끝)', /if \(builtIn\.value\) \{ checkBuiltIn\(\); return \}/.test(card), true)
  eq('카드: NEW 표시', [/isNewTemplate\(props\.tpl\)/.test(card), /data-template-new>NEW</.test(card)], [true, true])
  const gallery = read('src/views/studio/StudioTemplatesView.vue')
  const panel = read('src/components/studio/StudioTemplatePanel.vue')
  eq('갤러리: 거른 뒤 정렬 + 추천순/최신순 선택', [/sortTemplates\(filterTemplates\(/.test(gallery), /data-gallery-sort=/.test(gallery)], [true, true])
  eq('패널: 거른 뒤 정렬 + 정렬 선택', [/sortTemplates\(filterTemplates\(/.test(panel), /data-template-filter="sort"/.test(panel)], [true, true])
  const covers = read('src/lib/studioTemplateCovers.js')
  eq('표지 목록은 JSON 한 곳 (src/data/studioTemplateCovers.json)', /import COVERS from '\.\.\/data\/studioTemplateCovers\.json'/.test(covers), true)
  eq('npm run studio:covers', JSON.parse(read('package.json')).scripts['studio:covers'], 'node scripts/build-studio-covers.mjs')
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
