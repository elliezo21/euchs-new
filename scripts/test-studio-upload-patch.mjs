// AI 결과 조각 저장 API 테스트 — node scripts/test-studio-upload-patch.mjs
// api/studio-upload.js의 patch_prepare / patch_confirm을 handler 그대로 부르고, Supabase(인증·REST·Storage)는
// 가짜 fetch로 흉내 낸다. 시크릿·운영 DB·로그인 토큰을 쓰지 않는다.
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

const UID = '11111111-1111-4111-8111-111111111111'
const OTHER = '99999999-9999-4999-8999-999999999999'
const PID = '22222222-2222-4222-8222-222222222222'
const IMG = '33333333-3333-4333-8333-333333333333'
const IMG_PENDING = '44444444-4444-4444-8444-444444444444'
const FOLDER = `${UID}/${PID}/patches/${IMG}`
const ORIG = { width: 800, height: 600 }

const files = new Map()   // storage path → Buffer
let removed = []

function png(w, h, extra = 0) {
  const b = Buffer.alloc(33 + extra)
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
  if (p === '/rest/v1/studio_images') {
    if (!q.includes(`project_id=eq.${PID}`) || !q.includes(`user_id=eq.${UID}`)) return json([])
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
const prep = (o = {}) => call({ action: 'patch_prepare', projectId: PID, imageId: IMG, layerId: 'f_abc123', key: '0123456789abcdef', width: 216, height: 56, size: 20000, ...o })
const conf = (path, o = {}) => call({ action: 'patch_confirm', projectId: PID, imageId: IMG, path, ...o })
const PATH = `${FOLDER}/f_abc123_0123456789abcdef.png`

// ── patch_prepare ──
{
  const r = await prep()
  eq('prepare 정상 → 경로·토큰', [r.code, r.body.path, typeof r.body.token], [200, PATH, 'string'])
  eq('로그인 없음 → 401', (await call({ action: 'patch_prepare', projectId: PID, imageId: IMG }, null)).code, 401)
  eq('layerId 형식', [(await prep({ layerId: 'f_ABC123' })).body.code, (await prep({ layerId: '../x' })).body.code], ['invalid_input', 'invalid_input'])
  eq('key 형식', (await prep({ key: '0123' })).body.code, 'invalid_input')
  eq('크기 5MB 초과', (await prep({ size: 5 * 1024 * 1024 + 1 })).body.code, 'patch_too_large')
  eq('크기 0', (await prep({ size: 0 })).body.code, 'patch_too_large')
  eq('원본보다 큼', (await prep({ width: 801 })).body.code, 'invalid_input')
  eq('남의/없는 프로젝트 → 404', (await prep({ projectId: '55555555-5555-4555-8555-555555555555' })).code, 404)
  eq('다른 프로젝트의 이미지 → 404', (await prep({ imageId: '66666666-6666-4666-8666-666666666666' })).code, 404)
  eq('done 아닌 이미지 → 404', (await prep({ imageId: IMG_PENDING })).code, 404)
  files.set(PATH, png(216, 56))
  const ex = await prep()
  eq('이미 있으면 exists (멱등)', [ex.code, ex.body], [200, { exists: true, path: PATH }])
  files.clear()
  for (let i = 0; i < 120; i++) files.set(`${FOLDER}/f_${String(i).padStart(6, '0')}_0123456789abcdef.png`, png(1, 1))
  eq('120개 → patch_limit', (await prep()).body.code, 'patch_limit')
  files.set(PATH, png(216, 56))
  eq('120개라도 같은 경로는 exists', (await prep()).body.exists, true)
  files.clear()
}

// ── patch_confirm ──
{
  files.set(PATH, png(216, 56))
  eq('confirm 정상', (await conf(PATH)).body, { ok: true, width: 216, height: 56 })
  eq('confirm 파일 남아 있음', files.has(PATH), true)

  removed = []
  files.set(PATH, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0]))
  const j = await conf(PATH)
  eq('PNG 아닌 파일 → 거부 + 삭제', [j.code, j.body.code, removed], [400, 'patch_invalid', [PATH]])

  removed = []
  files.set(PATH, png(801, 56))
  eq('원본보다 큰 PNG → 거부 + 삭제', [(await conf(PATH)).body.code, removed], ['patch_invalid', [PATH]])

  removed = []
  files.set(PATH, png(216, 56, 5 * 1024 * 1024))
  eq('5MB 넘는 파일 → 거부 + 삭제', [(await conf(PATH)).body.code, removed], ['patch_too_large', [PATH]])

  removed = []
  const otherPath = `${OTHER}/${PID}/patches/${IMG}/f_abc123_0123456789abcdef.png`
  files.set(otherPath, png(10, 10))
  const o = await conf(otherPath)
  eq('남의 경로 → 거부, 삭제 안 함', [o.code, o.body.code, removed, files.has(otherPath)], [400, 'invalid_input', [], true])
  eq('다른 사진 폴더 → 거부', (await conf(`${UID}/${PID}/patches/${IMG_PENDING}/f_abc123_0123456789abcdef.png`)).body.code, 'invalid_input')
  eq('경로 조작(..) → 거부', (await conf(`${FOLDER}/../../orig/x.png`)).body.code, 'invalid_input')
  eq('이름 형식 다름 → 거부', (await conf(`${FOLDER}/f_abc123_0123456789abcdef.jpg`)).body.code, 'invalid_input')
  eq('orig 폴더 → 거부', (await conf(`${UID}/${PID}/orig/${IMG}.png`)).body.code, 'invalid_input')
  files.clear()
  eq('없는 파일 → not_uploaded', (await conf(PATH)).body.code, 'not_uploaded')
  eq('모르는 action', (await call({ action: 'patch_x' })).body.code, 'invalid_input')
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
