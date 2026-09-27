// 배경 지우기(17-1) 서버 흐름 테스트 — node scripts/test-studio-upload-bg.mjs
// api/studio-upload.js의 bg_status / bg_remove를 handler 그대로 부르고, Supabase(인증·REST·Storage)와 fal은 가짜 fetch로 흉내 낸다.
// (test-studio-upload-final.mjs와 같은 방식) 시크릿·운영 DB·로그인 토큰·실제 fal을 쓰지 않는다.
import { encodeRgbaPng, decodePng, maskOf } from '../api/_studioPng.js'

process.env.STUDIO_ENABLED = 'all'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

const UID = '11111111-1111-4111-8111-111111111111'
const OTHER = '99999999-9999-4999-8999-999999999999'
const PID = '22222222-2222-4222-8222-222222222222'
const IMG = '33333333-3333-4333-8333-333333333333'
const OTHER_IMG = '44444444-4444-4444-8444-444444444444'
const BIG_IMG = '55555555-5555-4555-8555-555555555555'
const ORIG_PATH = `${UID}/${PID}/orig/${IMG}.jpg`
const W = 4, H = 2

// ── 상태 (테스트마다 바꾼다) ──
const S = {
  admin: false, orders: [], entitled: true, table: 'ok', // table: 'ok' | 'missing' | 'denied'
  usage: [], nextUsageId: 1, files: new Map(), fal: 'ok', falCalls: [], signCalls: [], uploads: [],
}
function reset(o = {}) {
  Object.assign(S, { admin: false, orders: [{ id: 'o1', status: 'purchasing' }], entitled: true, table: 'ok', usage: [], nextUsageId: 1, files: new Map(), fal: 'ok', falCalls: [], signCalls: [], uploads: [] }, o)
  process.env.FAL_KEY = 'fake-fal-key'
  delete process.env.STUDIO_BG_MODEL
  delete process.env.STUDIO_BG_DAILY_LIMIT
}

// 가짜 fal 결과: 알파 = [255,0,128,255 / 0,255,64,0], 색은 일부러 원본과 다른 값 (색은 쓰면 안 된다)
const ALPHA = [255, 0, 128, 255, 0, 255, 64, 0]
const FAL_PNG = encodeRgbaPng(new Uint8Array(ALPHA.flatMap(a => [9, 9, 9, a])), W, H)

const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const tableErr = () => (S.table === 'missing'
  ? json({ code: 'PGRST205', message: "Could not find the table 'public.studio_ai_usage' in the schema cache" }, 404)
  : json({ code: '42501', message: 'permission denied for table studio_ai_usage' }, 403))

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname)
  const q = decodeURIComponent(u.search)
  const method = opts.method || 'GET'
  // fal
  if (u.host === 'fal.run') {
    S.falCalls.push({ url, headers: opts.headers, body: JSON.parse(opts.body) })
    if (S.fal === 'fail') return json({ detail: 'boom' }, 500)
    if (S.fal === 'timeout') return json({ detail: 'timeout' }, 504)
    if (S.fal === 'badpng') return json({ image: { url: 'data:image/png;base64,' + Buffer.from('nope').toString('base64') } })
    return json({ image: { url: `data:image/png;base64,${FAL_PNG.toString('base64')}`, width: W, height: H } })
  }
  if (p === '/auth/v1/user') {
    return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'seller@test.local' }) : json({ msg: 'bad' }, 401)
  }
  if (p === '/rest/v1/user_roles') return json(S.admin ? [{ role: 'admin' }] : [])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/studio_entitlements') return json(S.entitled ? [{ user_id: UID }] : [])
  if (p === '/rest/v1/orders') {
    if (!q.includes(`user_id=eq.${UID}`)) return json([])
    const list = /status=in\.\(([^)]*)\)/.exec(q)?.[1].split(',') || []
    return json(S.orders.filter(o => list.includes(o.status)).slice(0, 1))
  }
  if (p === '/rest/v1/studio_projects') {
    return json(q.includes(`id=eq.${PID}`) && q.includes(`user_id=eq.${UID}`) ? [{ id: PID, expires_at: new Date(Date.now() + 86400000).toISOString() }] : [])
  }
  if (p === '/rest/v1/studio_images') {
    if (!q.includes(`user_id=eq.${UID}`)) return json([])
    if (q.includes('select=original_path')) return json(q.includes(`id=eq.${IMG}`) ? [{ original_path: ORIG_PATH }] : q.includes(`id=eq.${BIG_IMG}`) ? [{ original_path: `${UID}/${PID}/orig/${BIG_IMG}.jpg` }] : [])
    if (!q.includes(`project_id=eq.${PID}`)) return json([])
    if (q.includes(`id=eq.${IMG}`)) return json([{ id: IMG, width: W, height: H, ingest_status: 'done' }])
    if (q.includes(`id=eq.${BIG_IMG}`)) return json([{ id: BIG_IMG, width: 5000, height: 800, ingest_status: 'done' }])
    return json([]) // OTHER_IMG: 이 사용자·작업의 사진이 아님
  }
  if (p === '/rest/v1/studio_ai_usage') {
    if (S.table !== 'ok') return tableErr()
    if (method === 'GET') {
      let rows = S.usage.filter(r => q.includes(`user_id=eq.${r.user_id}`))
      if (q.includes('status=eq.pending')) rows = rows.filter(r => r.status === 'pending' && q.includes(`image_id=eq.${r.image_id}`))
      if (q.includes('status=in.(ok,pending)')) rows = rows.filter(r => r.status === 'ok' || r.status === 'pending')
      return json(rows.map(r => ({ id: r.id })))
    }
    if (method === 'POST') {
      const row = { id: S.nextUsageId++, ...JSON.parse(opts.body) }
      S.usage.push(row)
      return json([{ id: row.id }], 201)
    }
    const id = Number(/id=eq\.(\d+)/.exec(q)?.[1])
    if (method === 'DELETE') { S.usage = S.usage.filter(r => r.id !== id); return new Response(null, { status: 204 }) }
    if (method === 'PATCH') { const r = S.usage.find(x => x.id === id); Object.assign(r, JSON.parse(opts.body)); return new Response(null, { status: 204 }) }
  }
  if (p === '/storage/v1/object/list/studio' && method === 'POST') {
    const { prefix } = JSON.parse(opts.body)
    return json([...S.files.keys()].filter(k => k.startsWith(prefix + '/')).map(k => ({ name: k.slice(prefix.length + 1), id: 'x' })))
  }
  if (p.startsWith('/storage/v1/object/sign/studio/') && method === 'POST') {
    const path = p.slice('/storage/v1/object/sign/studio/'.length)
    S.signCalls.push({ path, expiresIn: JSON.parse(opts.body).expiresIn })
    return json({ signedURL: `/object/sign/studio/${path}?token=signed` })
  }
  if (p.startsWith('/storage/v1/object/studio/') && method === 'POST') {
    const path = p.slice('/storage/v1/object/studio/'.length)
    if (S.files.has(path)) return json({ statusCode: '409', error: 'Duplicate' }, 400)
    S.files.set(path, Buffer.from(opts.body))
    S.uploads.push({ path, type: opts.headers['Content-Type'], upsert: opts.headers['x-upsert'] })
    return json({ Key: path })
  }
  throw new Error(`가짜 fetch에 없는 요청: ${method} ${u.host}${p}`)
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(52)} ${JSON.stringify(got)?.slice(0, 180)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const quiet = async fn => { const e = console.error, w = console.warn, l = console.log; console.error = console.warn = console.log = () => {}; try { return await fn() } finally { console.error = e; console.warn = w; console.log = l } }
const status = () => quiet(() => call({ action: 'bg_status' }))
const remove = (o = {}) => quiet(() => call({ action: 'bg_remove', projectId: PID, imageId: IMG, ...o }))

// ── bg_status ──
reset()
eq('주문 고객 → ready', (await status()).body, { ready: true, reason: null, model: 'birefnet-v2' })
reset({ orders: [] })
eq('주문 없음 → not_eligible', (await status()).body.reason, 'not_eligible')
reset({ orders: [{ id: 'o', status: 'cancelled' }, { id: 'o2', status: 'quote_pending' }, { id: 'o3', status: 'rejected' }] })
eq('취소·견적·반려만 → not_eligible', (await status()).body.reason, 'not_eligible')
reset({ orders: [], admin: true })
eq('관리자(전체 공개 모드) → ready', (await status()).body.ready, true)
reset(); process.env.FAL_KEY = ''
eq('키 없음 → no_key (준비 중)', (await status()).body.reason, 'no_key')
reset({ table: 'missing' })
eq('사용 기록 테이블 없음 → no_table', (await status()).body.reason, 'no_table')
reset({ table: 'denied' })
eq('GRANT 없음(403) → no_table', (await status()).body.reason, 'no_table')
reset({ orders: [] }); process.env.FAL_KEY = ''
eq('자격이 먼저 (키 없어도 주문 안 한 사람은 잠금 문구)', (await status()).body.reason, 'not_eligible')
eq('로그인 없음 → 401', (await quiet(() => call({ action: 'bg_status' }, null))).code, 401)

// ── bg_remove 정상 ──
reset()
{
  const r = await remove()
  const MASK = `${UID}/${PID}/bg/${IMG}/mask_${r.body.key}.png`
  eq('정상 → 200 · 경로·모델·크기', [r.code, r.body.path, r.body.model, r.body.width, r.body.height, r.body.reused], [200, MASK, 'birefnet-v2', W, H, false])
  const fc = S.falCalls[0]
  eq('fal: birefnet v2 끝점 · X-Fal-Store-IO 0 · Key', [fc.url, fc.headers['X-Fal-Store-IO'], fc.headers.Authorization], ['https://fal.run/fal-ai/birefnet/v2', '0', 'Key fake-fal-key'])
  eq('fal 입력 = 우리 서명 주소(본인 원본) · sync_mode', fc.body, { image_url: `http://mock.local/storage/v1/object/sign/studio/${ORIG_PATH}?token=signed`, sync_mode: true })
  eq('서명 주소 = 본인 원본 경로·5분', S.signCalls, [{ path: ORIG_PATH, expiresIn: 300 }])
  const m = maskOf(decodePng(S.files.get(MASK)))
  eq('저장한 마스크 = 알파 값만 (8비트 회색, 원본 크기)', [m.from, m.width, m.height, Array.from(m.mask)], ['gray', W, H, ALPHA])
  eq('업로드: PNG · 덮어쓰기 안 함', [S.uploads[0].type, S.uploads[0].upsert], ['image/png', 'false'])
  eq('사용 기록: ok 1건 · 비용 추정 · 모델', [S.usage.length, S.usage[0].status, S.usage[0].kind, S.usage[0].model, typeof S.usage[0].cost_usd, S.usage[0].image_id], [1, 'ok', 'bg_remove', 'fal-ai/birefnet/v2', 'number', IMG])
  // 같은 원본·같은 모델 → 다시 부르지 않음
  const again = await remove()
  eq('다시 누름 → 저장된 마스크 그대로(외부 호출·기록 없음)', [again.code, again.body.reused, S.falCalls.length, S.usage.length], [200, true, 1, 1])
}

// ── 모델 전환 ──
reset(); process.env.STUDIO_BG_MODEL = 'bria-rmbg2'
{
  const r = await remove()
  eq('bria-rmbg2 → Bria 끝점 · 장당 비용', [r.body.model, S.falCalls[0].url, S.falCalls[0].headers['X-Fal-Store-IO'], S.usage[0].cost_usd], ['bria-rmbg2', 'https://fal.run/fal-ai/bria/background/remove', '0', 0.018])
  eq('모델이 다르면 다른 마스크 key', r.body.key.length === 16, true)
}

// ── 막히는 경우 ──
reset()
{
  const r = await remove({ imageId: OTHER_IMG })
  eq('남의/없는 사진 → 404 · 서명 주소 안 만듦 · fal 안 부름', [r.code, S.signCalls.length, S.falCalls.length], [404, 0, 0])
  const r2 = await remove({ projectId: '66666666-6666-4666-8666-666666666666' })
  eq('남의 작업 → 404', [r2.code, S.signCalls.length], [404, 0])
}
reset({ orders: [] })
eq('주문 안 한 고객 → 403 bg_not_eligible · 호출 없음', [(await remove()).body.code, S.falCalls.length, S.signCalls.length], ['bg_not_eligible', 0, 0])
reset(); process.env.FAL_KEY = ''
eq('키 없음 → 503 bg_not_ready', [(await remove()).code, S.falCalls.length], [503, 0])
reset({ table: 'missing' })
eq('테이블 없음 → 503 bg_not_ready(오류로 안 멈춤)', [(await remove()).body.code, S.falCalls.length], ['bg_not_ready', 0])
reset()
eq('긴 변 4096 초과 → bg_too_large', [(await remove({ imageId: BIG_IMG })).body.code, S.falCalls.length], ['bg_too_large', 0])
reset({ usage: [{ id: 99, user_id: UID, image_id: IMG, kind: 'bg_remove', status: 'pending' }] })
eq('같은 사진 처리 중 → 409 bg_busy', [(await remove()).code, S.falCalls.length], [409, 0])
reset(); process.env.STUDIO_BG_DAILY_LIMIT = '2'
S.usage = [{ id: 1, user_id: UID, image_id: OTHER_IMG, status: 'ok' }, { id: 2, user_id: UID, image_id: OTHER_IMG, status: 'ok' }]
eq('하루 안전 한도 초과 → 429 bg_daily_limit', [(await remove()).body.code, S.falCalls.length, S.usage.length], ['bg_daily_limit', 0, 2])
S.usage = [{ id: 1, user_id: UID, image_id: OTHER_IMG, status: 'ok' }]
eq('한도 안이면 통과', (await remove()).code, 200)

// ── fal 실패 → 기록 안 남김 ──
reset({ fal: 'fail' })
eq('fal 실패 → 502 bg_failed · 기록 지움 · 파일 없음', [(await remove()).body.code, S.usage.length, S.files.size], ['bg_failed', 0, 0])
reset({ fal: 'timeout' })
eq('fal 시간 초과 → 504 bg_timeout · 기록 지움', [(await remove()).code, S.usage.length], [504, 0])
reset({ fal: 'badpng' })
eq('결과가 PNG가 아님 → bg_failed · 기록 지움', [(await remove()).body.code, S.usage.length, S.files.size], ['bg_failed', 0, 0])

// ── 관리자 전용 모드에서도 (관리자는 늘 허용) ──
reset({ orders: [], admin: true }); process.env.STUDIO_ENABLED = 'admin'
eq('관리자 모드 · 주문 없어도 관리자 → 200', (await remove()).code, 200)
process.env.STUDIO_ENABLED = 'all'

// ── 업로드 이름 규칙: 지우기 조각은 기존 f_ 그대로 — bg 경로는 조각 확인이 받지 않는다 ──
reset()
eq('patch_confirm에 bg 경로 → invalid_input', (await quiet(() => call({ action: 'patch_confirm', projectId: PID, imageId: IMG, path: `${UID}/${PID}/patches/${IMG}/mask_0123456789abcdef.png` }))).body.code, 'invalid_input')

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
