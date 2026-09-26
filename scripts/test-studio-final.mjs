// 완성 사진(final JPG) 유효 판단 테스트 (6-3) — node scripts/test-studio-final.mjs
import { eraseVersionOf, stampEraseVersion, usableFinalVersion, withoutEraseVersion, sameLayers } from '../src/lib/studioFinal.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(50)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}

const L1 = [{ id: 'f_aaaaaa', type: 'fill', x: 10, y: 20, w: 100, h: 40, method: 'solid', pad: 4 }]
const L2 = [...L1, { id: 'f_bbbbbb', type: 'fill', x: 200, y: 50, w: 80, h: 80, method: 'solid', pad: 4 }]

/** 브라우저 저장 흉내: row(서버 값)에 next를 저장 — useEraseSession의 save와 같은 순서(stamp → edit_version + 1) */
function save(row, next) {
  const edit = stampEraseVersion(next, row.edit, row.edit_version)
  return { ...row, edit, edit_version: row.edit_version + 1 }
}

// ── 1. 읽기 규칙 ──
eq('예전 edit(erase_v 없음) → edit_version', eraseVersionOf({ v: 2, layers: [] }, 23), 23)
eq('erase_v가 있으면 그 값', eraseVersionOf({ v: 2, layers: [], erase_v: 5 }, 23), 5)
eq('이상한 값(음수·큼·문자) → edit_version', [eraseVersionOf({ erase_v: -1 }, 9), eraseVersionOf({ erase_v: 10 }, 9), eraseVersionOf({ erase_v: '3' }, 9)], [9, 9, 9])
eq('edit_version을 모름 → null', eraseVersionOf({ erase_v: 1 }, null), null)

// ── 2. 필터만 바꾸면 완성 사진 유효 유지 ──
{
  let row = { edit: { v: 2, layers: [] }, edit_version: 0, final_rendered_version: null }
  row = save(row, { v: 2, layers: L1 })                 // v1 지우기
  eq('지우기 저장 → erase_v = 그 버전', [row.edit_version, row.edit.erase_v], [1, 1])
  eq('아직 굽기 전 → 쓸 완성 사진 없음', usableFinalVersion(row), null)
  row = { ...row, final_rendered_version: 1 }            // v1로 구움
  eq('구운 뒤 → v1 사용', usableFinalVersion(row), 1)
  row = save(row, { v: 2, layers: L1, look: { filter: 'mono' } })  // v2 흑백
  eq('필터 [흑백] 저장 → erase_v 그대로 1', [row.edit_version, row.edit.erase_v], [2, 1])
  eq('필터만 바꿈 → 완성 사진 유효 유지(v1)', usableFinalVersion(row), 1)
  row = save(row, { v: 2, layers: L1 })                 // v3 되돌리기(필터 없앰)
  eq('필터 되돌리기 → 여전히 v1 사용', [row.edit_version, usableFinalVersion(row)], [3, 1])
}

// ── 3. 지우기가 바뀌면 무효 ──
{
  let row = { edit: { v: 2, layers: L1, erase_v: 1 }, edit_version: 3, final_rendered_version: 1 }
  row = save(row, { v: 2, layers: L2 })
  eq('지우기 추가 → erase_v = 4, 완성 사진 무효', [row.edit.erase_v, usableFinalVersion(row)], [4, null])
  row = save(row, { v: 2, layers: L1 })                 // 되돌려서 v1과 같은 모양이 돼도
  eq('지우기를 되돌려도 보수적으로 무효(다시 구움)', [row.edit.erase_v, usableFinalVersion(row)], [5, null])
  row = { ...row, final_rendered_version: 5 }
  eq('다시 구운 v5 → 사용', usableFinalVersion(row), 5)
}

// ── 4. 예전 사진(erase_v 없음) ──
{
  const legacy = { edit: { v: 2, layers: L1 }, edit_version: 7, final_rendered_version: 7 }
  eq('예전 사진: 구운 버전 = edit_version → 사용', usableFinalVersion(legacy), 7)
  eq('예전 사진: 구운 버전 < edit_version → 무효(예전 규칙)', usableFinalVersion({ ...legacy, final_rendered_version: 6 }), null)
  const after = save(legacy, { v: 2, layers: L1, look: { brightness: 10 } })
  eq('예전 사진에 필터 저장 → erase_v = 7로 찍혀 계속 사용', [after.edit.erase_v, usableFinalVersion(after)], [7, 7])
  eq('final_rendered_version 없음 → null', usableFinalVersion({ ...legacy, final_rendered_version: null }), null)
  eq('구운 버전 > edit_version(이상) → null', usableFinalVersion({ ...legacy, final_rendered_version: 8 }), null)
}

// ── 5. 도우미 ──
eq('withoutEraseVersion: erase_v만 뗌', withoutEraseVersion({ v: 2, layers: L1, erase_v: 3, look: { filter: 'mono' } }), { v: 2, layers: L1, look: { filter: 'mono' } })
eq('withoutEraseVersion: 없으면 그대로', withoutEraseVersion({ v: 2, layers: [] }), { v: 2, layers: [] })
eq('sameLayers: 빈 값끼리 같음', [sameLayers(undefined, []), sameLayers(L1, L2)], [true, false])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
