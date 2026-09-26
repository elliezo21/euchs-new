// 작업 복사본(16단계) 계획 테스트 — node scripts/test-studio-copy.mjs
// 1) 이름  2) 경로 바꾸기(원본·AI 조각·완성 JPG)  3) edit 안 경로  4) 페이지 안 사진 id  5) 전체 계획(파일을 같이 쓰지 않음)
import {
  copyTitle, newOrigPath, newPatchPath, finalPath, rewriteEdit, rewritePage, buildCopyPlan, COPY_IMAGE_FIELDS, TITLE_MAX,
} from '../api/_studioCopy.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(50)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
function throws(name, fn) {
  let t = false
  try { fn() } catch (e) { t = e.code === 'copy_bad_path' }
  eq(name, t, true)
}

const U = 'uid-1', P = 'proj-old', Q = 'proj-new'
// ── 1. 이름 ──
eq('이름 + (복사본)', copyTitle({ title: '후드티 상세' }), '후드티 상세 (복사본)')
eq('이름 없으면 1688 제목', copyTitle({ title: null, title_zh: '连帽卫衣' }), '连帽卫衣 (복사본)')
eq('둘 다 없으면 "제목 없음"', copyTitle({}), '제목 없음 (복사본)')
{
  const long = copyTitle({ title: '가'.repeat(100) })
  eq('100자 넘으면 앞을 줄여 100자', [Array.from(long).length, long.endsWith(' (복사본)')], [TITLE_MAX, true])
  const emoji = copyTitle({ title: '😀'.repeat(99) })
  eq('이모지를 반으로 자르지 않음 (글자 수 100)', [Array.from(emoji).length, /\uD83D$/.test(emoji.replace(' (복사본)', ''))], [TITLE_MAX, false])
}

// ── 2. 경로 ──
const ids = { uid: U, fromProject: P, toProject: Q, fromImage: 'img-a', toImage: 'img-A' }
eq('원본 경로', newOrigPath(`${U}/${P}/orig/img-a.jpg`, ids), `${U}/${Q}/orig/img-A.jpg`)
eq('원본 경로 png 확장자 유지', newOrigPath(`${U}/${P}/orig/img-a.png`, ids), `${U}/${Q}/orig/img-A.png`)
throws('다른 사용자 폴더면 복사 안 함', () => newOrigPath(`other/${P}/orig/img-a.jpg`, ids))
throws('다른 작업 폴더면 복사 안 함', () => newOrigPath(`${U}/proj-x/orig/img-a.jpg`, ids))
throws('다른 사진 파일이면 복사 안 함', () => newOrigPath(`${U}/${P}/orig/img-b.jpg`, ids))
eq('AI 조각 경로 (파일 이름 그대로)', newPatchPath(`${U}/${P}/patches/img-a/f_abc123_0123456789abcdef.png`, ids), `${U}/${Q}/patches/img-A/f_abc123_0123456789abcdef.png`)
throws('AI 조각이 다른 사진 폴더면 복사 안 함', () => newPatchPath(`${U}/${P}/patches/img-b/f_x_1.png`, ids))
throws('AI 조각 경로에 하위 폴더가 있으면 복사 안 함', () => newPatchPath(`${U}/${P}/patches/img-a/x/f.png`, ids))
eq('완성 JPG 경로 규칙', finalPath(U, Q, 'img-A', 7), `${U}/${Q}/final/img-A_v7.jpg`)

// ── 3. edit 안 경로 ──
{
  const edit = {
    v: 2, erase_v: 5, look: { filter: 'warm' }, crop: { x: 1, y: 2, w: 30, h: 40 },
    layers: [
      { id: 'f_aaaaaa', type: 'fill', method: 'ai', ai: { key: '0123456789abcdef', model: 'm', engine: 'wasm', patch: { path: `${U}/${P}/patches/img-a/f_aaaaaa_0123456789abcdef.png`, x: 0, y: 0, w: 5, h: 5 } } },
      { id: 'f_bbbbbb', type: 'fill', method: 'solid' },
      { id: 'c_cccccc', type: 'cover', x: 1, y: 1, w: 5, h: 5, sx: 10, sy: 1, feather: 8 },
    ],
  }
  const before = JSON.stringify(edit)
  const r = rewriteEdit(edit, ids)
  eq('edit: AI 조각 경로가 새 경로로', r.edit.layers[0].ai.patch.path, `${U}/${Q}/patches/img-A/f_aaaaaa_0123456789abcdef.png`)
  eq('edit: 복사할 조각 1개', r.files, [{ from: `${U}/${P}/patches/img-a/f_aaaaaa_0123456789abcdef.png`, to: `${U}/${Q}/patches/img-A/f_aaaaaa_0123456789abcdef.png` }])
  eq('edit: 나머지(erase_v·look·crop·덮기) 그대로', [r.edit.erase_v, r.edit.look, r.edit.crop, r.edit.layers[2]], [5, edit.look, edit.crop, edit.layers[2]])
  eq('edit: 원본 edit는 바꾸지 않음', JSON.stringify(edit), before)
  eq('edit: 레이어 없는 edit', rewriteEdit({ v: 2, layers: [] }, ids), { edit: { v: 2, layers: [] }, files: [] })
}

// ── 4. 페이지 안 사진 id ──
{
  const page = {
    v: 1, width: 780, gap: 0, parked: ['img-b', 'zzz'],
    sections: [
      { id: 's1', height: 100, bg: '#fff', items: [{ id: 'i1', type: 'image', imageId: 'img-a', x: 0, y: 0, w: 780, h: 100 }, { id: 't1', type: 'text', text: 'img-a' }] },
      { id: 's2', height: 100, bg: '#fff', items: [{ id: 'i2', type: 'image', imageId: 'img-b', x: 0, y: 0, w: 390, h: 100, groupId: 'g1' }] },
    ],
  }
  const before = JSON.stringify(page)
  const r = rewritePage(page, new Map([['img-a', 'img-A'], ['img-b', 'img-B']]))
  eq('페이지: 사진 요소 imageId 바뀜', r.page.sections.map(s => s.items.filter(i => i.type === 'image').map(i => i.imageId)), [['img-A'], ['img-B']])
  eq('페이지: 글자 요소는 그대로', r.page.sections[0].items[1], page.sections[0].items[1])
  eq('페이지: 빼둔 사진(parked)도 바뀜, 모르는 id는 그대로', r.page.parked, ['img-B', 'zzz'])
  eq('페이지: 모르는 id 알림', r.unknown, ['zzz'])
  eq('페이지: 요소 id·그룹·구간 그대로', [r.page.sections[1].items[0].id, r.page.sections[1].items[0].groupId, r.page.sections.map(s => s.id)], ['i2', 'g1', ['s1', 's2']])
  eq('페이지: 원본 page는 바꾸지 않음', JSON.stringify(page), before)
  eq('페이지: null이면 null (시작 화면이 뜨는 작업)', rewritePage(null, new Map()), { page: null, unknown: [] })
}

// ── 5. 전체 계획 ──
{
  const project = {
    id: P, source_type: '1688', offer_id: '1081981728994', source_url: 'https://detail.1688.com/offer/1081981728994.html',
    title: '후드티', title_zh: '卫衣', desc_source: 'desc_img', status: 'ingesting', expires_at: '2026-10-20T00:00:00Z', extended_count: 1,
    page: { v: 1, width: 780, gap: 0, parked: [], sections: [{ id: 's1', height: 10, bg: '#fff', items: [{ id: 'i1', type: 'image', imageId: 'img-a', x: 0, y: 0, w: 10, h: 10 }] }] },
  }
  const base = Object.fromEntries(COPY_IMAGE_FIELDS.map(k => [k, null]))
  const images = [
    { ...base, id: 'img-a', kind: 'gallery', sort_order: 0, source_key: 'k1', ingest_status: 'done', included: true, mode: 'original', mt_status: 'none',
      edit_version: 4, final_rendered_version: 4, original_path: `${U}/${P}/orig/img-a.jpg`,
      edit: { v: 2, layers: [{ id: 'f_aaaaaa', type: 'fill', method: 'ai', ai: { patch: { path: `${U}/${P}/patches/img-a/f_aaaaaa_0123456789abcdef.png` } } }], erase_v: 4 } },
    { ...base, id: 'img-b', kind: 'desc', sort_order: 1, source_key: 'k2', ingest_status: 'done', included: false, mode: 'original', mt_status: 'none',
      edit_version: 0, final_rendered_version: null, original_path: `${U}/${P}/orig/img-b.png`, edit: { v: 2, layers: [] } },
    { ...base, id: 'img-c', kind: 'desc', sort_order: 2, source_key: 'k3', ingest_status: 'pending', included: true, mode: 'original', mt_status: 'none',
      edit_version: 0, final_rendered_version: null, original_path: null, edit: { v: 2, layers: [] } },
  ]
  const before = JSON.stringify({ project, images })
  let n = 0
  const plan = buildCopyPlan({ uid: U, project, images, newProjectId: Q, newImageId: () => `new-${++n}`, hiddenAt: 'T' })
  eq('계획: 새 작업 행 (이름·보관 기간·숨김·page_version 0)', [plan.projectRow.id, plan.projectRow.title, plan.projectRow.expires_at, plan.projectRow.extended_count, plan.projectRow.deleted_at, plan.projectRow.page_version],
    [Q, '후드티 (복사본)', '2026-10-20T00:00:00Z', 1, 'T', 0])
  eq('계획: 페이지 사진 id = 새 id', plan.projectRow.page.sections[0].items[0].imageId, 'new-1')
  eq('계획: 사진 행 3개 (준비 안 된 사진도 행은 그대로)', plan.imageRows.map(r => [r.id, r.project_id, r.user_id, r.sort_order, r.kind, r.included, r.ingest_status]),
    [['new-1', Q, U, 0, 'gallery', true, 'done'], ['new-2', Q, U, 1, 'desc', false, 'done'], ['new-3', Q, U, 2, 'desc', true, 'pending']])
  eq('계획: 사진 행 경로 = 새 작업 폴더', plan.imageRows.map(r => r.original_path), [`${U}/${Q}/orig/new-1.jpg`, `${U}/${Q}/orig/new-2.png`, null])
  eq('계획: edit·버전 그대로 옮김 (완성 JPG 버전 포함)', [plan.imageRows[0].edit_version, plan.imageRows[0].final_rendered_version, plan.imageRows[0].edit.erase_v], [4, 4, 4])
  eq('계획: 사진 행 edit 안 조각 경로도 새 폴더', plan.imageRows[0].edit.layers[0].ai.patch.path, `${U}/${Q}/patches/new-1/f_aaaaaa_0123456789abcdef.png`)
  eq('계획: 복사할 파일 (원본 2 · 조각 1 · 완성 1)', plan.files.map(f => [f.kind, f.from, f.to, f.required]), [
    ['orig', `${U}/${P}/orig/img-a.jpg`, `${U}/${Q}/orig/new-1.jpg`, true],
    ['patch', `${U}/${P}/patches/img-a/f_aaaaaa_0123456789abcdef.png`, `${U}/${Q}/patches/new-1/f_aaaaaa_0123456789abcdef.png`, false],
    ['final', `${U}/${P}/final/img-a_v4.jpg`, `${U}/${Q}/final/new-1_v4.jpg`, false],
    ['orig', `${U}/${P}/orig/img-b.png`, `${U}/${Q}/orig/new-2.png`, true],
  ])
  eq('계획: 새 경로는 모두 새 작업 폴더 (같이 쓰는 파일 없음)', plan.files.every(f => f.to.startsWith(`${U}/${Q}/`) && f.from.startsWith(`${U}/${P}/`)), true)
  eq('계획: 새 행에 옛 사진 id·옛 작업 경로가 남지 않음', /img-[abc]|proj-old/.test(JSON.stringify(plan.imageRows)) || /img-[abc]"|proj-old/.test(JSON.stringify(plan.projectRow.page)), false)
  eq('계획: 원본 작업·사진 데이터는 바꾸지 않음', JSON.stringify({ project, images }), before)
  eq('계획: page가 없는 작업 → 복사본도 page 없음', buildCopyPlan({ uid: U, project: { ...project, page: null }, images: [], newProjectId: Q, newImageId: () => 'x', hiddenAt: 'T' }).projectRow.page, null)
  throws('계획: 규칙에 안 맞는 경로가 하나라도 있으면 전체 중단', () => buildCopyPlan({
    uid: U, project, images: [{ ...images[0], original_path: `${U}/other/orig/img-a.jpg` }], newProjectId: Q, newImageId: () => 'x', hiddenAt: 'T',
  }))
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
