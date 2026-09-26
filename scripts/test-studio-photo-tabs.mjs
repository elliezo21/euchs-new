// [사진] 목록 탭 테스트 (7단계) — node scripts/test-studio-photo-tabs.mjs
import { SOURCE_1688, SOURCE_MINE, sourceOf, usageOf, defaultSource, filterImages, tabCounts, tabOf } from '../src/lib/studioPhotoTabs.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

const IMGS = [
  { id: 'g1', kind: 'gallery', included: true },
  { id: 'd1', kind: 'desc', included: true },
  { id: 'u1', kind: 'upload', included: true },
  { id: 'd2', kind: 'desc', included: false },
  { id: 'u2', kind: 'upload', included: false },
  { id: 'g2', kind: 'gallery' },               // included 없음 = 사용
]
const ids = list => list.map(i => i.id)

eq('출처: gallery·desc = 1688, upload = 내 사진', IMGS.map(sourceOf), ['1688', '1688', 'mine', '1688', 'mine', '1688'])
eq('모르는 kind → null (어느 탭에도 없음)', sourceOf({ id: 'x', kind: 'weird' }), null)
eq('쓰임: false만 안 씀', IMGS.map(usageOf), ['used', 'used', 'used', 'unused', 'unused', 'used'])

eq('기본 탭: 1688 사진이 있으면 1688', defaultSource(IMGS), SOURCE_1688)
eq('기본 탭: 1688 없으면 내 사진', defaultSource(IMGS.filter(i => i.kind === 'upload')), SOURCE_MINE)
eq('기본 탭: 사진 없음 → 내 사진', defaultSource([]), SOURCE_MINE)

eq('1688 · 사용 (원래 순서)', ids(filterImages(IMGS, SOURCE_1688, 'used')), ['g1', 'd1', 'g2'])
eq('1688 · 안 쓸 사진', ids(filterImages(IMGS, SOURCE_1688, 'unused')), ['d2'])
eq('내 사진 · 안 쓸 사진 (두 필터 함께)', ids(filterImages(IMGS, SOURCE_MINE, 'unused')), ['u2'])
eq('내 사진 · 사용', ids(filterImages(IMGS, SOURCE_MINE, 'used')), ['u1'])

eq('개수: 1688 탭 기준', tabCounts(IMGS, SOURCE_1688), { 1688: 4, mine: 2, used: 3, unused: 1 })
eq('개수: 내 사진 탭 기준', tabCounts(IMGS, SOURCE_MINE), { 1688: 4, mine: 2, used: 1, unused: 1 })
eq('개수: 모르는 kind는 세지 않음', tabCounts([{ id: 'x', kind: 'weird' }], SOURCE_MINE), { 1688: 0, mine: 0, used: 0, unused: 0 })

eq('사진이 보이는 탭 (페이지에서 고르면 그 탭으로)', [tabOf(IMGS[3]), tabOf(IMGS[2])], [{ source: '1688', usage: 'unused' }, { source: 'mine', usage: 'used' }])
eq('입력 순서 그대로 (번호는 전체 순서)', ids(IMGS), ['g1', 'd1', 'u1', 'd2', 'u2', 'g2'])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
