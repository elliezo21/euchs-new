// 작업 복사본(16단계) 서버 API 테스트 — node scripts/test-studio-upload-copy.mjs
// api/studio-upload.js의 project_copy를 handler 그대로 부르고, Supabase(인증·REST·Storage)는 가짜 fetch + 메모리 표로 흉내 낸다
// (test-studio-upload-final.mjs와 같은 방식). 시크릿·운영 DB·로그인 토큰을 쓰지 않는다.
// 확인: 성공(새 행·새 경로·파일 복사·원본 불변) / 완성 JPG 없음 / 원본 파일 없음·Storage 오류 → 반쯤 된 복사본 정리 / 남의·지운·만료 작업 / 규칙 밖 경로
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

const UID = '11111111-1111-4111-8111-111111111111'
const OTHER = '99999999-9999-4999-8999-999999999999'
const PID = '22222222-2222-4222-8222-222222222222'
const IA = '33333333-3333-4333-8333-333333333333'
const IB = '44444444-4444-4444-8444-444444444444'
const PATCH = `${UID}/${PID}/patches/${IA}/f_abc123_0123456789abcdef.png`

let projects, images, files, failCopyOf
function reset() {
  projects = [{
    id: PID, user_id: UID, source_type: '1688', offer_id: '1081981728994', source_url: 'https://detail.1688.com/offer/1081981728994.html',
    title: '후드티', title_zh: '卫衣', desc_source: 'desc_img', status: 'ingesting', expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    extended_count: 0, deleted_at: null, page_version: 9,
    page: { v: 1, width: 780, gap: 0, parked: [IB], sections: [{ id: 's1', height: 585, bg: '#fff', items: [{ id: 'i1', type: 'image', imageId: IA, x: 0, y: 0, w: 780, h: 585 }] }] },
  }]
  images = [
    { id: IA, project_id: PID, user_id: UID, kind: 'gallery', sort_order: 0, source_url: 'https://x/a.jpg', source_key: 'a', ingest_status: 'done', included: true,
      mode: 'original', mt_status: 'none', original_path: `${UID}/${PID}/orig/${IA}.jpg`, edit_version: 3, final_rendered_version: 3,
      edit: { v: 2, erase_v: 3, layers: [{ id: 'f_abc123', type: 'fill', method: 'ai', pad: 4, x: 1, y: 1, w: 5, h: 5, ai: { key: '0123456789abcdef', model: 'm', engine: 'wasm', patch: { path: PATCH, x: 0, y: 0, w: 5, h: 5 } } }] } },
    { id: IB, project_id: PID, user_id: UID, kind: 'upload', sort_order: 1, source_url: null, source_key: `upload:${IB}`, ingest_status: 'done', included: false,
      mode: 'original', mt_status: 'none', original_path: `${UID}/${PID}/orig/${IB}.png`, edit_version: 0, final_rendered_version: null, upload_name: '내사진.png',
      edit: { v: 2, layers: [{ id: 'c_q8w2e4r6t0y1', type: 'cover', x: 1, y: 1, w: 5, h: 5, sx: 10, sy: 1, feather: 8 }] } },
  ]
  files = new Map([
    [`${UID}/${PID}/orig/${IA}.jpg`, 'A'], [`${UID}/${PID}/orig/${IB}.png`, 'B'], [PATCH, 'P'], [`${UID}/${PID}/final/${IA}_v3.jpg`, 'F'],
  ])
  failCopyOf = null
}
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const eqv = (q, col) => { const m = new RegExp(`[?&]${col}=eq\\.([^&]+)`).exec(q); return m ? m[1] : null }

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname)
  const q = decodeURIComponent(u.search)
  const method = opts.method || 'GET'
  const body = opts.body ? JSON.parse(opts.body) : null
  if (p === '/auth/v1/user') return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'admin@test.local' }) : json({ msg: 'bad' }, 401)
  if (p === '/rest/v1/user_roles') return json([{ role: 'admin' }])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/studio_projects') {
    if (method === 'GET') {
      const rows = projects.filter(r => r.id === eqv(q, 'id') && r.user_id === eqv(q, 'user_id') && (!q.includes('deleted_at=is.null') || r.deleted_at === null))
      return json(rows.map(r => ({ ...r })))
    }
    if (method === 'POST') { projects.push({ ...body }); return new Response(null, { status: 201 }) }
    if (method === 'PATCH') { for (const r of projects) if (r.id === eqv(q, 'id') && r.user_id === eqv(q, 'user_id')) Object.assign(r, body); return new Response(null, { status: 204 }) }
    if (method === 'DELETE') {
      const id = eqv(q, 'id')
      projects = projects.filter(r => r.id !== id)
      images = images.filter(r => r.project_id !== id) // on delete cascade
      return new Response(null, { status: 204 })
    }
  }
  if (p === '/rest/v1/studio_images') {
    if (method === 'GET') return json(images.filter(r => r.project_id === eqv(q, 'project_id') && r.user_id === eqv(q, 'user_id')).map(r => JSON.parse(JSON.stringify(r))))
    if (method === 'POST') { for (const r of body) images.push({ ...r }); return new Response(null, { status: 201 }) }
    if (method === 'PATCH') {
      const ids = /id=in\.\(([^)]*)\)/.exec(q)[1].split(',')
      for (const r of images) if (ids.includes(r.id)) Object.assign(r, body)
      return new Response(null, { status: 204 })
    }
  }
  if (p === '/storage/v1/object/copy' && method === 'POST') {
    if (body.bucketId !== 'studio') return json({ error: 'bad bucket' }, 400)
    if (failCopyOf && body.sourceKey === failCopyOf) return json({ statusCode: '500', error: 'internal', message: 'boom' }, 500)
    if (!files.has(body.sourceKey)) return json({ statusCode: '404', error: 'not_found', message: 'Object not found' }, 400)
    if (files.has(body.destinationKey)) return json({ statusCode: '409', error: 'Duplicate' }, 400)
    files.set(body.destinationKey, files.get(body.sourceKey))
    return json({ Key: `studio/${body.destinationKey}` })
  }
  if (p === '/storage/v1/object/studio' && method === 'DELETE') { for (const k of body.prefixes) files.delete(k); return json([]) }
  throw new Error(`가짜 fetch에 없는 요청: ${method} ${p}${q}`)
}

const { default: handler } = await import('../api/studio-upload.js')
async function call(body, token = 'good-token') {
  const res = { code: 0, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
  await handler({ method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '' }, body }, res)
  return res
}
const copy = (projectId = PID) => call({ action: 'project_copy', projectId })

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(50)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const snapshotSource = () => JSON.stringify({ p: projects.filter(r => r.id === PID), i: images.filter(r => r.project_id === PID), f: [...files].filter(([k]) => k.includes(PID)) })

// ── 1. 성공 ──
reset()
{
  const before = snapshotSource()
  const r = await copy()
  const np = r.body.projectId
  const row = projects.find(x => x.id === np)
  const imgs = images.filter(x => x.project_id === np)
  eq('성공 200 · 사진 2 · 파일 4 · 빠진 것 0', [r.code, r.body.images, r.body.files, r.body.missing], [200, 2, 4, 0])
  eq('새 작업: 이름·숨김 풀림·page_version 0·보관 기간 같음', [row.title, row.deleted_at, row.page_version, row.expires_at === projects[0].expires_at], ['후드티 (복사본)', null, 0, true])
  eq('새 사진 행: 새 id·새 작업·순서·kind·included 그대로', imgs.map(x => [x.id !== IA && x.id !== IB, x.project_id, x.sort_order, x.kind, x.included]), [[true, np, 0, 'gallery', true], [true, np, 1, 'upload', false]])
  const [na, nb] = imgs
  eq('page 안 사진 id = 새 id (요소·빼둔 사진)', [row.page.sections[0].items[0].imageId, row.page.parked], [na.id, [nb.id]])
  eq('원본 경로 = 새 작업 폴더', [na.original_path, nb.original_path], [`${UID}/${np}/orig/${na.id}.jpg`, `${UID}/${np}/orig/${nb.id}.png`])
  eq('edit 안 AI 조각 경로 = 새 폴더, 덮기 그대로', [na.edit.layers[0].ai.patch.path, nb.edit.layers[0]], [`${UID}/${np}/patches/${na.id}/f_abc123_0123456789abcdef.png`, images.find(x => x.id === IB).edit.layers[0]])
  eq('완성 JPG 버전 그대로 + 파일도 새 경로에', [na.final_rendered_version, files.get(`${UID}/${np}/final/${na.id}_v3.jpg`)], [3, 'F'])
  eq('새 파일 4개 모두 새 작업 폴더', [...files.keys()].filter(k => k.includes(np)).length, 4)
  eq('원본 작업·사진·파일은 그대로', snapshotSource(), before)
  // 복사본을 지워도(행 삭제) 원본 파일이 남는지 — 파일을 같이 쓰지 않음
  for (const k of [...files.keys()]) if (k.includes(np)) files.delete(k)
  eq('복사본 파일을 지워도 원본 파일 4개 그대로', [...files.keys()].filter(k => k.includes(PID)).length, 4)
}

// ── 2. 완성 JPG가 Storage에 없음 → 복사본은 final 비움 (편집기가 다시 만든다) ──
reset()
{
  files.delete(`${UID}/${PID}/final/${IA}_v3.jpg`)
  const r = await copy()
  const na = images.find(x => x.project_id === r.body.projectId && x.sort_order === 0)
  eq('완성 JPG 없음 → 성공, 빠진 것 1, 복사본 final_rendered_version null', [r.code, r.body.missing, na.final_rendered_version], [200, 1, null])
}

// ── 3. 원본 사진 파일 없음 → 실패 + 반쯤 된 복사본 정리 ──
reset()
{
  const before = snapshotSource()
  files.delete(`${UID}/${PID}/orig/${IB}.png`)
  const r = await copy()
  eq('원본 파일 없음 → 500 copy_failed', [r.code, r.body.code], [500, 'copy_failed'])
  eq('새 작업·사진 행이 남지 않음', [projects.length, images.length], [1, 2])
  eq('복사한 파일이 남지 않음', [...files.keys()].filter(k => !k.includes(PID)).length, 0)
  eq('원본은 그대로 (지운 파일 말고)', JSON.parse(snapshotSource()).i, JSON.parse(before).i)
}

// ── 4. Storage 오류(500) 중간에 → 정리 ──
reset()
{
  failCopyOf = PATCH
  const r = await copy()
  eq('Storage 오류 → 500 copy_failed', [r.code, r.body.code], [500, 'copy_failed'])
  eq('정리: 새 행 0 · 새 파일 0 · 원본 파일 4', [projects.length, images.length, [...files.keys()].filter(k => !k.includes(PID)).length, files.size], [1, 2, 0, 4])
}

// ── 5. 남의·지운·만료 작업, 로그인 ──
reset()
{
  eq('로그인 없음 → 401', (await call({ action: 'project_copy', projectId: PID }, null)).code, 401)
  eq('없는 작업 → 404', (await copy('55555555-5555-4555-8555-555555555555')).code, 404)
  projects[0].user_id = OTHER
  eq('남의 작업 → 404', (await copy()).code, 404)
  reset(); projects[0].deleted_at = new Date().toISOString()
  eq('지운 작업 → 404', (await copy()).code, 404)
  reset(); projects[0].expires_at = new Date(Date.now() - 1000).toISOString()
  const r = await copy()
  eq('보관 기간 끝남 → 400 project_expired, 아무것도 안 만듦', [r.code, r.body.code, projects.length], [400, 'project_expired', 1])
}

// ── 6. 규칙 밖 경로 → 복사하지 않음 ──
reset()
{
  images[1].original_path = `${UID}/other-project/orig/${IB}.png`
  const r = await copy()
  eq('규칙 밖 경로 → 500 copy_bad_path, 아무것도 안 만듦', [r.code, r.body.code, projects.length, images.length, files.size], [500, 'copy_bad_path', 1, 2, 4])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
