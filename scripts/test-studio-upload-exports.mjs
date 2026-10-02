// 완성작 보관(2026-09-28) 서버 API 테스트 — node scripts/test-studio-upload-exports.mjs
// api/studio-upload.js의 export_* 를 handler 그대로 부르고, Supabase(인증·REST·Storage)는 가짜 fetch + 메모리 표로 흉내 낸다
// (test-studio-upload-copy.mjs와 같은 방식). 시크릿·운영 DB·로그인 토큰을 쓰지 않는다.
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

import {
  exportStamp, exportKey, cleanExportName, upsertExportFile, STAMP_RE, KEY_RE, savePatchFrom, isSourceColumnMissing, EXPORT_SOURCES,
} from '../api/_studioExports.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

// ── 순수 함수 ──
eq('시각 폴더 = KST YYYYMMDD-HHmmss-xxxx', exportStamp(new Date('2026-09-28T00:03:12Z'), () => 'ab12'), '20260928-090312-ab12')
eq('시각 폴더 형식 검사', [STAMP_RE.test('20260928-090312-ab12'), STAMP_RE.test('../x')], [true, false])
eq('key: 섹션 번호 두 자리 · 한 장 = all', [exportKey(1), exportKey(12), exportKey(null), exportKey(0)], ['01', '12', 'all', null])
eq('key 형식', [KEY_RE.test('01'), KEY_RE.test('all'), KEY_RE.test('thumb'), KEY_RE.test('../01')], [true, true, false, false])
eq('받을 이름: 확장자 맞아야 · 경로 구분자 뺌', [cleanExportName('후드티_01.jpg', 'jpg'), cleanExportName('a/b_01.jpg', 'jpg'), cleanExportName('x.png', 'jpg')], ['후드티_01.jpg', 'ab_01.jpg', null])
eq('파일 칸: 같은 key는 바꾸고 01 → 02 → all 순', upsertExportFile([{ key: '02', n: 1 }, { key: 'all', n: 1 }], { key: '01', n: 2 }).map(f => f.key), ['01', '02', 'all'])
eq('파일 칸: 다시 시도 = 바꿈(늘지 않음)', upsertExportFile([{ key: '01', n: 1 }], { key: '01', n: 2 }), [{ key: '01', n: 2 }])

// ── 가짜 Supabase ──
const UID = '11111111-1111-4111-8111-111111111111'
const OTHER = '99999999-9999-4999-8999-999999999999'
const PID = '22222222-2222-4222-8222-222222222222'
let projects, exportsRows, files, tableMissing, seq, sourceMissing, sendsRows, patchFails
function reset() {
  sourceMissing = false // true = SQL(studio-folders) 실행 전 — studio_exports.source 칸이 없음
  sendsRows = []        // marketplace_sends
  patchFails = false
  projects = [{ id: PID, user_id: UID, title: '후드티', deleted_at: null }]
  exportsRows = []
  files = new Map()
  tableMissing = false
  seq = 0
}
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const eqv = (q, col) => { const m = new RegExp(`[?&]${col}=eq\\.([^&]+)`).exec(q); return m ? m[1] : null }
function png(w, h, pad = 0) {
  const b = Buffer.alloc(33 + pad)
  b.writeUInt32BE(0x89504E47, 0); b.writeUInt32BE(0x0D0A1A0A, 4); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'ascii')
  b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20)
  return b
}
function jpg(w, h) {
  return Buffer.from([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xFF, 0xD9])
}

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname)
  const q = decodeURIComponent(u.search)
  const method = opts.method || 'GET'
  const body = opts.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : null
  if (p === '/auth/v1/user') return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'admin@test.local' }) : json({ msg: 'bad' }, 401)
  if (p === '/rest/v1/user_roles') return json([{ role: 'admin' }])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/studio_projects' && method === 'GET') {
    return json(projects.filter(r => r.id === eqv(q, 'id') && r.user_id === eqv(q, 'user_id') && (!q.includes('deleted_at=is.null') || r.deleted_at === null)))
  }
  if (p === '/rest/v1/studio_exports') {
    if (tableMissing) return json({ code: '42P01', message: 'relation "public.studio_exports" does not exist' }, 404)
    const noSource = () => json({ code: '42703', message: 'column studio_exports.source does not exist' }, 400)
    const neq = /[?&]id=neq\.([^&]+)/.exec(q)?.[1] || null
    if (method === 'GET') {
      if (sourceMissing && /source/.test(q)) return noSource()
      let rows = exportsRows.filter(r => r.user_id === eqv(q, 'user_id') && (!eqv(q, 'id') || r.id === eqv(q, 'id'))
        && (!eqv(q, 'project_id') || r.project_id === eqv(q, 'project_id')) && (!eqv(q, 'source') || (r.source || 'download') === eqv(q, 'source')) && (!neq || r.id !== neq))
      if (q.includes('order=created_at.desc')) rows = [...rows].reverse()
      return json(JSON.parse(JSON.stringify(rows)))
    }
    if (method === 'POST') {
      if (sourceMissing && 'source' in body) return json({ code: 'PGRST204', message: "Could not find the 'source' column of 'studio_exports' in the schema cache" }, 400)
      const row = { id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${seq++}`, created_at: new Date(Date.now() + seq).toISOString(), thumb_path: null, source: 'download', ...body }
      exportsRows.push(row)
      return json([row], 201)
    }
    if (method === 'PATCH') {
      if (patchFails && 'stamp' in body) return json({ message: 'boom' }, 500)
      for (const r of exportsRows) if (r.id === eqv(q, 'id') && r.user_id === eqv(q, 'user_id')) Object.assign(r, body)
      return new Response(null, { status: 204 })
    }
    if (method === 'DELETE') {
      exportsRows = exportsRows.filter(r => !(r.id === eqv(q, 'id') && r.user_id === eqv(q, 'user_id')))
      return new Response(null, { status: 204 })
    }
  }
  if (p === '/rest/v1/marketplace_sends' && method === 'GET') {
    const since = /created_at=gte\.([^&]+)/.exec(q)?.[1]
    return json(sendsRows.filter(r => r.export_id === eqv(q, 'export_id') && r.user_id === eqv(q, 'user_id') && (!since || r.created_at >= since)))
  }
  if (p === '/storage/v1/object/list/studio' && method === 'POST') {
    const pre = `${body.prefix}/`
    return json([...files.keys()].filter(k => k.startsWith(pre) && !k.slice(pre.length).includes('/')).map(k => ({ id: k, name: k.slice(pre.length) })))
  }
  if (p.startsWith('/storage/v1/object/upload/sign/studio/') && method === 'POST') {
    return json({ url: `/object/upload/sign/studio/${p.slice('/storage/v1/object/upload/sign/studio/'.length)}?token=tok123` })
  }
  if (p.startsWith('/storage/v1/object/sign/studio/') && method === 'POST') {
    const key = p.slice('/storage/v1/object/sign/studio/'.length)
    if (!files.has(key)) return json({ statusCode: '404', error: 'not_found' }, 400)
    return json({ signedURL: `/object/sign/studio/${key}?token=read` })
  }
  if (p.startsWith('/storage/v1/object/studio/') && method === 'GET') {
    const key = p.slice('/storage/v1/object/studio/'.length)
    return files.has(key) ? new Response(files.get(key), { status: 200 }) : json({ statusCode: '404', error: 'not_found' }, 400)
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

// ── 섹션별 두 장 보관 → 목록 → 다시 받기 ──
{
  reset()
  const b = await call({ action: 'export_begin', projectId: PID, title: '후드티', format: 'jpg', scale: 1, mode: 'sections', count: 2 })
  eq('시작 → 200 · 행 1개', [b.code, exportsRows.length], [200, 1])
  const ex = exportsRows[0]
  eq('폴더 = {uid}/{projectId}/exports/{stamp}', ex.folder, `${UID}/${PID}/exports/${b.body.stamp}`)
  const id = b.body.exportId
  const p1 = await call({ action: 'export_file_prepare', exportId: id, key: '01', size: 23 })
  eq('파일 준비 → 경로·토큰', [p1.code, p1.body.path, p1.body.token], [200, `${ex.folder}/01.jpg`, 'tok123'])
  const c0 = await call({ action: 'export_file_confirm', exportId: id, key: '01', path: p1.body.path, name: '후드티_01.jpg' })
  eq('안 올리고 확인 → not_uploaded', [c0.code, c0.body.code], [400, 'not_uploaded'])
  files.set(p1.body.path, jpg(780, 1200))
  const c1 = await call({ action: 'export_file_confirm', exportId: id, key: '01', path: p1.body.path, name: '후드티_01.jpg' })
  eq('확인 → 기록 1장 (가로세로·받을 이름)', [c1.code, exportsRows[0].files.map(f => [f.key, f.name, f.width, f.height])], [200, [['01', '후드티_01.jpg', 780, 1200]]])
  const again = await call({ action: 'export_file_prepare', exportId: id, key: '01', size: 23 })
  eq('같은 파일 다시 준비 → exists (업로드 생략)', again.body.exists, true)
  const p2 = await call({ action: 'export_file_prepare', exportId: id, key: '02', size: 23 })
  files.set(p2.body.path, png(780, 900)) // JPG로 시작했는데 PNG
  const bad = await call({ action: 'export_file_confirm', exportId: id, key: '02', path: p2.body.path, name: '후드티_02.jpg' })
  eq('형식이 다르면 → export_invalid + 파일 지움', [bad.code, bad.body.code, files.has(p2.body.path), exportsRows[0].files.length], [400, 'export_invalid', false, 1])
  files.set(p2.body.path, jpg(780, 900))
  await call({ action: 'export_file_confirm', exportId: id, key: '02', path: p2.body.path, name: '후드티_02.jpg' })
  const p3 = await call({ action: 'export_file_prepare', exportId: id, key: '03', size: 23 })
  eq('알린 수(2장)보다 많으면 → invalid_input', [p3.code, p3.body.code], [400, 'invalid_input'])
  eq('한 장 모드 key(all)를 섹션별에 → invalid_input', (await call({ action: 'export_file_prepare', exportId: id, key: 'all', size: 23 })).body.code, 'invalid_input')
  eq('20MB 넘으면 → export_too_large', (await call({ action: 'export_file_prepare', exportId: id, key: '02', size: 20 * 1024 * 1024 + 1 })).body.code, 'export_too_large')
  const pt = await call({ action: 'export_file_prepare', exportId: id, key: 'thumb', size: 23 })
  files.set(pt.body.path, jpg(360, 480))
  await call({ action: 'export_file_confirm', exportId: id, key: 'thumb', path: pt.body.path })
  eq('미리보기 = thumb_path (파일 수에 안 셈)', [exportsRows[0].thumb_path, exportsRows[0].files.length], [`${ex.folder}/thumb.jpg`, 2])

  const l = await call({ action: 'exports_list' })
  eq('목록: 1개 · 2장 · 미리보기 주소', [l.body.ready, l.body.items.length, l.body.items[0].count, !!l.body.items[0].previewUrl, l.body.items[0].title], [true, 1, 2, true, '후드티'])
  const d = await call({ action: 'export_download', exportId: id })
  eq('다시 받기: 파일 2개 · 원래 이름 · 서명 주소', [d.body.files.map(f => f.name), d.body.files.every(f => f.url.includes('/object/sign/studio/'))], [['후드티_01.jpg', '후드티_02.jpg'], true])
}

// ── 남의 것·표 없음·입력 ──
{
  reset()
  const b = await call({ action: 'export_begin', projectId: PID, title: 't', format: 'png', scale: 2, mode: 'long', count: 1 })
  exportsRows[0].user_id = OTHER
  eq('남의 보관 기록 → 404', (await call({ action: 'export_download', exportId: b.body.exportId })).code, 404)
  eq('남의 작업으로 시작 → 404', (await call({ action: 'export_begin', projectId: '33333333-3333-4333-8333-333333333333', title: 't', format: 'jpg', scale: 1, mode: 'sections', count: 1 })).code, 404)
  eq('한 장 모드인데 count 2 → invalid_input', (await call({ action: 'export_begin', projectId: PID, title: 't', format: 'jpg', scale: 1, mode: 'long', count: 2 })).body.code, 'invalid_input')
  eq('모르는 형식 → invalid_input', (await call({ action: 'export_begin', projectId: PID, title: 't', format: 'gif', scale: 1, mode: 'sections', count: 1 })).body.code, 'invalid_input')
  tableMissing = true
  const m = await call({ action: 'export_begin', projectId: PID, title: 't', format: 'jpg', scale: 1, mode: 'sections', count: 1 })
  eq('표 없음 → 503 export_sql_missing (받기는 브라우저가 그대로)', [m.code, m.body.code], [503, 'export_sql_missing'])
  const ml = await call({ action: 'exports_list' })
  eq('표 없음 목록 → 200 ready:false', [ml.code, ml.body.ready], [200, false])
  eq('로그인 안 함 → 401', (await call({ action: 'exports_list' }, null)).code, 401)
}

// ── [작업 저장] — 작업마다 카드 하나. 다시 저장하면 그 카드를 새 결과물로 바꾼다 (카드가 늘지 않는다) ──
async function saveOnce(title, heights) {
  const b = await call({ action: 'export_begin', projectId: PID, title, format: 'jpg', scale: 1, mode: 'sections', count: heights.length, source: 'save' })
  if (b.code !== 200) return { begin: b }
  for (let i = 0; i < heights.length; i++) {
    const key = String(i + 1).padStart(2, '0')
    const p = await call({ action: 'export_file_prepare', exportId: b.body.exportId, key, size: 23 })
    files.set(p.body.path, jpg(780, heights[i]))
    await call({ action: 'export_file_confirm', exportId: b.body.exportId, key, path: p.body.path, name: `${title}_${key}.jpg` })
  }
  const t = await call({ action: 'export_file_prepare', exportId: b.body.exportId, key: 'thumb', size: 23 })
  files.set(t.body.path, jpg(360, 480))
  await call({ action: 'export_file_confirm', exportId: b.body.exportId, key: 'thumb', path: t.body.path })
  return { begin: b, commit: await call({ action: 'export_save_commit', exportId: b.body.exportId }) }
}
const quiet = async fn => { const o = [console.error, console.warn, console.info, console.log]; console.error = console.warn = console.info = console.log = () => {}; try { return await fn() } finally { [console.error, console.warn, console.info, console.log] = o } }
{
  reset()
  eq('보관 종류 = download · save', EXPORT_SOURCES, ['download', 'save'])
  eq('갱신 값: id·user_id·project_id는 안 바꾸고 결과물 칸만', Object.keys(savePatchFrom({ id: 'x', user_id: 'u', project_id: 'p', source: 'save', stamp: 's', folder: 'f', title: 't', format: 'jpg', scale: 1, mode: 'sections', file_count: 1, files: [], thumb_path: null, created_at: 'c' })).sort(), ['created_at', 'file_count', 'files', 'folder', 'format', 'mode', 'scale', 'stamp', 'thumb_path', 'title'])

  const first = await quiet(() => saveOnce('후드티', [1200, 900]))
  const firstId = first.commit.body.exportId
  const firstFolder = exportsRows[0].folder
  eq('첫 저장 → 카드 1개 · source save · 갱신 아님', [first.commit.code, first.commit.body.updated, exportsRows.length, exportsRows[0].source, firstId === first.begin.body.exportId], [200, false, 1, 'save', true])

  // 판매처로 보낸 기록이 있는 내 상품 (2시간 전에 보냄)
  sendsRows.push({ id: 's1', user_id: UID, export_id: firstId, created_at: new Date(Date.now() - 2 * 3600000).toISOString() })
  const second = await quiet(() => saveOnce('후드티 v2', [1300, 950, 700]))
  eq('다시 저장 → 카드는 여전히 1개 (중복 카드 없음) · id 그대로 · 갱신됨', [second.commit.code, exportsRows.length, exportsRows[0].id, second.commit.body.exportId, second.commit.body.updated], [200, 1, firstId, firstId, true])
  eq('결과물은 새것: 제목·3장·새 폴더·미리보기', [exportsRows[0].title, exportsRows[0].files.map(f => [f.key, f.height]), exportsRows[0].folder !== firstFolder, exportsRows[0].thumb_path === `${exportsRows[0].folder}/thumb.jpg`, exportsRows[0].file_count], ['후드티 v2', [['01', 1300], ['02', 950], ['03', 700]], true, true, 3])
  eq('보낸 기록은 그대로 (같은 내 상품 id를 가리킴)', sendsRows.map(s => [s.id, s.export_id === exportsRows[0].id]), [['s1', true]])
  eq('예전 파일은 지움 · 새 파일은 있음', [[...files.keys()].filter(k => k.startsWith(`${firstFolder}/`)).length, [...files.keys()].filter(k => k.startsWith(`${exportsRows[0].folder}/`)).length], [0, 4])
  const l = await call({ action: 'exports_list' })
  eq('목록: 카드 1개 · 3장', [l.body.items.length, l.body.items[0].id, l.body.items[0].count, l.body.items[0].title], [1, firstId, 3, '후드티 v2'])
  const d = await call({ action: 'export_download', exportId: firstId })
  eq('[다시 받기] = 새 결과물', d.body.files.map(f => f.name), ['후드티 v2_01.jpg', '후드티 v2_02.jpg', '후드티 v2_03.jpg'])

  // 방금(1시간 안) 판매처로 보냈으면 예전 파일을 남긴다 — 판매처가 아직 내려받는 중일 수 있다
  const folder2 = exportsRows[0].folder
  sendsRows.push({ id: 's2', user_id: UID, export_id: firstId, created_at: new Date(Date.now() - 5 * 60000).toISOString() })
  await quiet(() => saveOnce('후드티 v3', [1000]))
  eq('방금 보낸 내 상품 → 예전 파일 남김 · 카드 1개 · 1장', [[...files.keys()].filter(k => k.startsWith(`${folder2}/`)).length, exportsRows.length, exportsRows[0].files.length, exportsRows[0].id], [4, 1, 1, firstId])

  // [다운로드]는 받을 때마다 새 카드 (예전 그대로) — [작업 저장] 카드를 건드리지 않는다
  const dl = await call({ action: 'export_begin', projectId: PID, title: '후드티', format: 'jpg', scale: 1, mode: 'sections', count: 1 })
  eq('[다운로드] 보관 = 새 줄 · source download', [exportsRows.length, exportsRows[1].source, exportsRows[1].id !== firstId], [2, 'download', true])
  // [내 상품] 목록(2026-10-02 perProject) — 작업마다 한 줄 · [작업 저장] 결과물 우선 · source·exportIds
  const pp1 = await call({ action: 'exports_list', perProject: true })
  eq('[내 상품] 목록(perProject): 작업 1개 = 1줄 · 지금 결과물 = [작업 저장] · source save · exportIds에 포함 (파일 없는 보관은 뺌)', [pp1.code, pp1.body.items.length, pp1.body.items[0].id, pp1.body.items[0].source, pp1.body.items[0].exportIds], [200, 1, firstId, 'save', [firstId]])
  eq('[다운로드] 기록으로 저장 마무리 → 400',(await call({ action: 'export_save_commit', exportId: dl.body.exportId })).code, 400)
  eq('모르는 source → 400', (await call({ action: 'export_begin', projectId: PID, title: 't', format: 'jpg', scale: 1, mode: 'sections', count: 1, source: 'x' })).code, 400)
  const empty = await call({ action: 'export_begin', projectId: PID, title: 't', format: 'jpg', scale: 1, mode: 'sections', count: 1, source: 'save' })
  eq('파일 없이 저장 마무리 → not_uploaded (예전 카드 그대로)', [(await call({ action: 'export_save_commit', exportId: empty.body.exportId })).body.code, exportsRows.find(r => r.id === firstId).title], ['not_uploaded', '후드티 v3'])
  exportsRows = exportsRows.filter(r => r.id !== empty.body.exportId && r.id !== dl.body.exportId)

  // 갱신이 실패하면 방금 만든 기록을 되살린다 (결과물을 잃지 않는다)
  patchFails = true
  const f = await quiet(() => saveOnce('후드티 v4', [800]))
  eq('갱신 실패 → 500 · 예전 카드 그대로 · 방금 기록은 되살림', [f.commit.code, exportsRows.find(r => r.id === firstId).title, exportsRows.some(r => r.id === f.begin.body.exportId && r.title === '후드티 v4')], [500, '후드티 v3', true])
  patchFails = false

  // 남의 것
  exportsRows.find(r => r.id === firstId).user_id = OTHER
  eq('남의 내 상품으로 저장 마무리 → 404', (await call({ action: 'export_save_commit', exportId: firstId })).code, 404)
}
{
  // SQL 실행 전 (source 칸 없음) — [작업 저장]만 막히고 [다운로드] 보관은 그대로
  reset()
  sourceMissing = true
  eq('칸 없음 판정', [isSourceColumnMissing({ status: 400, message: "POST studio_exports 400: Could not find the 'source' column" }), isSourceColumnMissing({ status: 400, message: 'other' }), isSourceColumnMissing({ status: 500, message: 'source' })], [true, false, false])
  const s = await quiet(() => call({ action: 'export_begin', projectId: PID, title: 't', format: 'jpg', scale: 1, mode: 'sections', count: 1, source: 'save' }))
  eq('칸 없음: [작업 저장] 시작 → 503 · 고객 문구는 한 줄 · 줄 안 만듦', [s.code, s.body.code, s.body.message, exportsRows.length], [503, 'export_sql_missing', '잠시 후 다시 시도해 주세요.', 0])
  const d = await call({ action: 'export_begin', projectId: PID, title: 't', format: 'jpg', scale: 1, mode: 'sections', count: 1 })
  eq('칸 없음: [다운로드] 보관은 그대로 (source 칸을 보내지 않음)', [d.code, exportsRows.length, 'source' in JSON.parse(JSON.stringify({ ...exportsRows[0], source: undefined }))], [200, 1, false])
  eq('칸 없음: 저장 마무리 → 503', (await quiet(() => call({ action: 'export_save_commit', exportId: d.body.exportId }))).code, 503)
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
process.exit(fail ? 1 : 0)
