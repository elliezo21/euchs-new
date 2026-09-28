// 완성작 보관(2026-09-28) 서버 API 테스트 — node scripts/test-studio-upload-exports.mjs
// api/studio-upload.js의 export_* 를 handler 그대로 부르고, Supabase(인증·REST·Storage)는 가짜 fetch + 메모리 표로 흉내 낸다
// (test-studio-upload-copy.mjs와 같은 방식). 시크릿·운영 DB·로그인 토큰을 쓰지 않는다.
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

import {
  exportStamp, exportKey, cleanExportName, upsertExportFile, STAMP_RE, KEY_RE,
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
let projects, exportsRows, files, tableMissing, seq
function reset() {
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
    if (method === 'GET') {
      let rows = exportsRows.filter(r => r.user_id === eqv(q, 'user_id') && (!eqv(q, 'id') || r.id === eqv(q, 'id')))
      if (q.includes('order=created_at.desc')) rows = [...rows].reverse()
      return json(JSON.parse(JSON.stringify(rows)))
    }
    if (method === 'POST') {
      const row = { id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${seq++}`, created_at: new Date().toISOString(), thumb_path: null, ...body }
      exportsRows.push(row)
      return json([row], 201)
    }
    if (method === 'PATCH') {
      for (const r of exportsRows) if (r.id === eqv(q, 'id') && r.user_id === eqv(q, 'user_id')) Object.assign(r, body)
      return new Response(null, { status: 204 })
    }
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

console.log(`\n${pass} 통과 · ${fail} 실패`)
process.exit(fail ? 1 : 0)
