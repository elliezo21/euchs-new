// 지운 사진 굽기(final) 저장 API 테스트 — node scripts/test-studio-upload-final.mjs
// api/studio-upload.js의 final_prepare / final_confirm을 handler 그대로 부르고, Supabase(인증·REST·Storage)는
// 가짜 fetch로 흉내 낸다 (test-studio-upload-patch.mjs와 같은 방식). 시크릿·운영 DB·로그인 토큰을 쓰지 않는다.
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

const UID = '11111111-1111-4111-8111-111111111111'
const OTHER = '99999999-9999-4999-8999-999999999999'
const PID = '22222222-2222-4222-8222-222222222222'
const IMG = '33333333-3333-4333-8333-333333333333'
const IMG_PENDING = '44444444-4444-4444-8444-444444444444'
const FOLDER = `${UID}/${PID}/final`
const ORIG = { width: 800, height: 600 }

const files = new Map()   // storage path → Buffer
let removed = []
let editVersion = 7
let finalRendered = null
const patches = []

/** 가로·세로만 읽히는 최소 JPEG (SOI + SOF0) */
function jpeg(w, h, extra = 0) {
  const b = Buffer.alloc(4 + 17 + extra)
  b[0] = 0xFF; b[1] = 0xD8; b[2] = 0xFF; b[3] = 0xC0
  b.writeUInt16BE(17, 4); b[6] = 8
  b.writeUInt16BE(h, 7); b.writeUInt16BE(w, 9)
  return b
}
function png(w, h) {
  const b = Buffer.alloc(33)
  b.writeUInt32BE(0x89504E47, 0); b.writeUInt32BE(0x0D0A1A0A, 4)
  b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'ascii')
  b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20)
  return b
}
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname)
  const q = decodeURIComponent(u.search)
  const method = opts.method || 'GET'
  if (p === '/auth/v1/user') {
    return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'admin@test.local' }) : json({ msg: 'bad' }, 401)
  }
  if (p === '/rest/v1/user_roles') return json([{ role: 'admin' }])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/studio_projects') {
    return json(q.includes(`id=eq.${PID}`) && q.includes(`user_id=eq.${UID}`) ? [{ id: PID, expires_at: new Date(Date.now() + 86400000).toISOString() }] : [])
  }
  if (p === '/rest/v1/studio_images' && method === 'PATCH') {
    const body = JSON.parse(opts.body)
    patches.push({ q, body })
    const ok = q.includes(`id=eq.${IMG}`) && q.includes(`user_id=eq.${UID}`) && q.includes(`edit_version=eq.${editVersion}`)
    if (ok) finalRendered = body.final_rendered_version
    return json(ok ? [{ id: IMG, final_rendered_version: finalRendered }] : [])
  }
  if (p === '/rest/v1/studio_images') {
    if (!q.includes(`user_id=eq.${UID}`)) return json([])
    if (q.includes('select=edit_version')) return json(q.includes(`id=eq.${IMG}`) ? [{ edit_version: editVersion }] : [])
    if (!q.includes(`project_id=eq.${PID}`)) return json([])
    if (q.includes(`id=eq.${IMG}`)) return json([{ id: IMG, ...ORIG, ingest_status: 'done' }])
    if (q.includes(`id=eq.${IMG_PENDING}`)) return json([{ id: IMG_PENDING, ...ORIG, ingest_status: 'pending' }])
    return json([])
  }
  if (p === '/storage/v1/object/list/studio' && method === 'POST') {
    const { prefix } = JSON.parse(opts.body)
    const names = [...files.keys()].filter(k => k.startsWith(prefix + '/') && !k.slice(prefix.length + 1).includes('/'))
      .map(k => ({ name: k.slice(prefix.length + 1), id: 'obj-' + k.length }))
    return json(names)
  }
  if (p.startsWith('/storage/v1/object/upload/sign/studio/') && method === 'POST') {
    const path = p.slice('/storage/v1/object/upload/sign/studio/'.length)
    return json({ url: `/object/upload/sign/studio/${path}?token=tok-${path.length}` })
  }
  if (p === '/storage/v1/object/studio' && method === 'DELETE') {
    const { prefixes } = JSON.parse(opts.body)
    for (const k of prefixes) { files.delete(k); removed.push(k) }
    return json([])
  }
  if (p.startsWith('/storage/v1/object/studio/') && method === 'GET') {
    const path = p.slice('/storage/v1/object/studio/'.length)
    const b = files.get(path)
    return b ? new Response(b, { status: 200 }) : json({ statusCode: '404', error: 'not_found' }, 400)
  }
  throw new Error(`가짜 fetch에 없는 요청: ${method} ${p}`)
}

const { default: handler } = await import('../api/studio-upload.js')

async function call(body, token = 'good-token') {
  const res = { code: 0, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
  await handler({ method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '' }, body }, res)
  return res
}

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(40)} ${JSON.stringify(got)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const prep = (o = {}) => call({ action: 'final_prepare', projectId: PID, imageId: IMG, version: 7, width: 800, height: 600, size: 300000, ...o })
const conf = (path, o = {}) => call({ action: 'final_confirm', projectId: PID, imageId: IMG, version: 7, path, ...o })
const PATH = `${FOLDER}/${IMG}_v7.jpg`

// ── final_prepare ──
{
  const r = await prep()
  eq('prepare 정상 → 버전 경로·토큰', [r.code, r.body.path, typeof r.body.token], [200, PATH, 'string'])
  eq('로그인 없음 → 401', (await call({ action: 'final_prepare', projectId: PID, imageId: IMG, version: 7 }, null)).code, 401)
  eq('version 형식', [(await prep({ version: 0 })).body.code, (await prep({ version: 'x' })).body.code], ['invalid_input', 'invalid_input'])
  eq('크기 20MB 초과', (await prep({ size: 20 * 1024 * 1024 + 1 })).body.code, 'final_too_large')
  eq('크기 12MB → 통과', (await prep({ size: 12 * 1024 * 1024 })).code, 200)
  eq('가로세로가 원본과 다름', [(await prep({ width: 799 })).body.code, (await prep({ height: 601 })).body.code], ['final_invalid', 'final_invalid'])
  eq('지금 edit_version과 다른 버전 → 409 final_stale', [(await prep({ version: 6 })).code, (await prep({ version: 6 })).body.code], [409, 'final_stale'])
  eq('남의/없는 프로젝트 → 404', (await prep({ projectId: '55555555-5555-4555-8555-555555555555' })).code, 404)
  eq('done 아닌 이미지 → 404', (await prep({ imageId: IMG_PENDING })).code, 404)
  files.set(PATH, jpeg(800, 600))
  const ex = await prep()
  eq('같은 버전 파일이 이미 있음 → exists', [ex.body.exists, ex.body.path], [true, PATH])
  files.delete(PATH)
}

// ── final_confirm ──
{
  eq('업로드 안 됨 → not_uploaded', (await conf(PATH)).body.code, 'not_uploaded')
  eq('다른 경로(남의 폴더) → 거부, 삭제 안 함', [(await conf(`${OTHER}/${PID}/final/${IMG}_v7.jpg`)).body.code, removed], ['invalid_input', []])
  eq('버전이 다른 경로 → 거부', (await conf(`${FOLDER}/${IMG}_v6.jpg`)).body.code, 'invalid_input')

  files.set(PATH, png(800, 600))
  eq('JPEG 아님(PNG) → 거부 + 삭제', [(await conf(PATH)).body.code, removed], ['final_invalid', [PATH]])
  removed = []
  files.set(PATH, jpeg(801, 600))
  eq('가로세로 다름 → 거부 + 삭제', [(await conf(PATH)).body.code, removed], ['final_invalid', [PATH]])
  removed = []
  files.set(PATH, jpeg(800, 600, 20 * 1024 * 1024))
  eq('20MB 넘는 파일 → 거부 + 삭제', [(await conf(PATH)).body.code, removed], ['final_too_large', [PATH]])
  removed = []

  files.set(PATH, jpeg(800, 600, 12 * 1024 * 1024))
  const ok = await conf(PATH)
  eq('정상 12MB JPEG → 통과 + 최신 기록', [ok.code, ok.body.ok, ok.body.recorded, finalRendered, removed], [200, true, true, 7, []])
  eq('기록 조건: 본인·그 사진·edit_version=7', patches.at(-1).q.includes(`user_id=eq.${UID}`) && patches.at(-1).q.includes('edit_version=eq.7'), true)

  // 그 사이 지우기가 바뀜(edit_version 8) → 옛 굽기는 최신으로 기록하지 않는다 (파일은 남김)
  finalRendered = null
  editVersion = 8
  const stale = await conf(PATH)
  eq('확인 중 그 사이 edit_version이 바뀜 → 통과는 하되 최신으로 기록 안 함', [stale.code, stale.body.recorded, finalRendered], [200, false, null])
  editVersion = 7
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
