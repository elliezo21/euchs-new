// AI 배경(17-4) 테스트 — node scripts/test-studio-bg-gen.mjs
// A) 순수: 프리셋 key 대조 · 저장 모양 · 예전 데이터 · 모드 전환 재사용 · 맞춤 · 복사 · 공급자 요청 모양 · 한국 자정
// B) 서버 흐름: bg_gen_status / bg_generate 를 handler 그대로 — Supabase·fal은 가짜 fetch (실제 fal·DB·시크릿 안 씀)
//    1인 3회 · 전체 한도 · 실패 미차감 · 동시 요청 · 관리자 제외 · 자격 · 마스크 필요 · SQL 전 오류
import { BG_GEN_PRESETS as CLIENT_PRESETS, BG_GEN_FREE_PER_DAY as CLIENT_FREE } from '../src/lib/studioBgGen.js'
import {
  readBg, withBg, bgActive, bgViewKey, bgMark, bgAiUnder, aiFitSource, aiFromServer, bgPaintColor, bgMaskSource, withRefined,
} from '../src/lib/studioBg.js'
import { rewriteEdit } from '../api/_studioCopy.js'
import { bgGenProviderConfig, generateBackground, DEFAULT_BG_GEN_MODEL, removeBackground } from '../api/_studioBgProvider.js'
import { BG_GEN_PRESETS, BG_GEN_FREE_PER_DAY, bgGenDailyLimit, bgAiKey, isKindCheckError } from '../api/_studioBgGen.js'
import { kstDayStartIso } from '../api/_studioBg.js'
import { encodeRgbaPng } from '../api/_studioPng.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(56)} ${JSON.stringify(got)?.slice(0, 170)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const quiet = async fn => { const e = console.error, w = console.warn, l = console.log; console.error = console.warn = console.log = () => {}; try { return await fn() } finally { console.error = e; console.warn = w; console.log = l } }

// ══ A. 순수 ══
eq('프리셋 key: 화면 = 서버 (같은 순서 상관없이)', CLIENT_PRESETS.map(p => p.key).sort(), Object.keys(BG_GEN_PRESETS).sort())
eq('프리셋 6~8개 · 한국어 이름 · 영어 프롬프트', [CLIENT_PRESETS.length >= 6 && CLIENT_PRESETS.length <= 8, CLIENT_PRESETS.every(p => /[가-힣]/.test(p.label)), Object.values(BG_GEN_PRESETS).every(t => /^[\x20-\x7e]+$/.test(t))], [true, true, true])
eq('1인 하루 무료 3회 (화면 = 서버)', [BG_GEN_FREE_PER_DAY, CLIENT_FREE], [3, 3])
eq('전체 한도 기본 50 · 환경변수 · 이상한 값은 기본', [bgGenDailyLimit({}), bgGenDailyLimit({ STUDIO_BG_GEN_DAILY_LIMIT: '7' }), await quiet(() => bgGenDailyLimit({ STUDIO_BG_GEN_DAILY_LIMIT: 'x' }))], [50, 7, 50])
eq('한국 자정: 9/27 23:59:59 KST → 9/27', kstDayStartIso(new Date('2026-09-27T14:59:59Z')), '2026-09-27T00:00:00+09:00')
eq('한국 자정: 9/28 00:00:00 KST → 9/28 (날이 바뀜)', kstDayStartIso(new Date('2026-09-27T15:00:00Z')), '2026-09-28T00:00:00+09:00')
eq('한국 자정: UTC 자정(KST 09시)은 경계가 아님', kstDayStartIso(new Date('2026-09-28T00:00:00Z')), '2026-09-28T00:00:00+09:00')

const U = 'uid-1', P = 'proj-1', I = 'img-1'
const MASK = { path: `${U}/${P}/bg/${I}/mask_0123456789abcdef.png`, key: '0123456789abcdef', model: 'birefnet-v2', w: 800, h: 600 }
const REF = { path: `${U}/${P}/bg/${I}/refined_fedcba9876543210.png`, key: 'fedcba9876543210', w: 800, h: 600 }
const AI = { path: `${U}/${P}/bg/${I}/ai_aaaaaaaaaaaaaaaa.png`, key: 'aaaaaaaaaaaaaaaa', w: 1024, h: 768, preset: 'marble', model: 'bria-replace' }
{
  const old = readBg({ bg: { mask: MASK, mode: 'color', color: '#f9e4e8', refined: REF } })
  eq('예전 데이터(ai 없음) 그대로', [old.mode, 'ai' in old, bgAiUnder(old), bgMark(old)], ['color', false, null, '배경 단색 · 다듬음'])
  const b = readBg({ bg: { mask: MASK, mode: 'ai', refined: REF, ai: AI } })
  eq('AI 배경 읽기', b.ai, AI)
  eq('확정 저장 모양 (withBg)', withBg({ v: 2 }, b).bg, { mask: { ...MASK }, mode: 'ai', refined: { ...REF }, ai: { ...AI } })
  eq('AI 모드: 합성함·아래 그림·색 없음·표시', [bgActive(b), bgAiUnder(b), bgPaintColor(b), bgMark(b)], [true, { path: AI.path, w: 1024, h: 768 }, null, 'AI 배경 · 다듬음'])
  eq('AI 모드도 제품 마스크는 다듬은 것 우선', bgMaskSource(b).path, REF.path)
  eq('화면 key에 마스크 + AI 그림', bgViewKey(b), `|bg:${REF.path}|ai:${AI.path}`)
  // 모드 전환 — ai는 남는다 (다시 고르면 같은 그림 — 돈 안 듦)
  for (const mode of ['transparent', 'color', 'none']) {
    const m = readBg(withBg({}, { ...b, mode, color: '#ffffff' }))
    eq(`[${mode}]로 바꿔도 ai 기억 · 아래 그림 없음`, [m.ai?.path, bgAiUnder(m)], [AI.path, null])
  }
  const back = readBg(withBg({}, { ...readBg(withBg({}, { ...b, mode: 'transparent' })), mode: 'ai' }))
  eq('다시 [AI 배경] → 같은 그림 (새 파일·요청 없음)', bgAiUnder(back)?.path, AI.path)
  eq('다듬기 바꿔도 ai 유지 (withRefined)', withRefined(b, null).ai, AI)
  eq('서버 응답 → bg.ai', aiFromServer({ path: AI.path, key: AI.key, w: 1024, h: 768, preset: 'marble', model: 'bria-replace', left: 2 }), AI)
  const bad = (name, ai, mode = 'transparent') => {
    const r = await_quiet(() => readBg({ bg: { mask: MASK, mode, ai } }))
    return r
  }
  const await_quiet = fn => { const e = console.error; console.error = () => {}; try { return fn() } finally { console.error = e } }
  eq('이상한 ai(다른 사진 폴더) → 빼고 읽음', 'ai' in bad('', { ...AI, path: `${U}/${P}/bg/img-2/ai_aaaaaaaaaaaaaaaa.png` }), false)
  eq('이상한 ai(확장자) → 빼고 읽음', 'ai' in bad('', { ...AI, path: `${U}/${P}/bg/${I}/ai_aaaaaaaaaaaaaaaa.gif` }), false)
  eq('모드 ai인데 ai 없음 → 투명으로 읽음 (오류 로그)', bad('', null, 'ai').mode, 'transparent')
}
eq('맞춤: 비율 같으면 전체를 늘림', aiFitSource(1024, 768, 800, 600), { sx: 0, sy: 0, sw: 1024, sh: 768 })
eq('맞춤: 비율 다르면 가운데 잘라 채움(안 찌그러짐)', aiFitSource(1000, 1000, 800, 400), { sx: 0, sy: 250, sw: 1000, sh: 500 })
{
  const ids = { uid: U, fromProject: P, toProject: 'proj-2', fromImage: I, toImage: 'img-9' }
  const { edit, files } = rewriteEdit({ bg: { mask: MASK, mode: 'ai', refined: REF, ai: AI } }, ids)
  eq('복사: 마스크·다듬음·AI 그림 셋 다', files.map(f => f.to.split('/').pop()), ['mask_0123456789abcdef.png', 'refined_fedcba9876543210.png', 'ai_aaaaaaaaaaaaaaaa.png'])
  eq('복사: edit.bg.ai 경로 새 폴더', edit.bg.ai.path, `${U}/proj-2/bg/img-9/ai_aaaaaaaaaaaaaaaa.png`)
}
{
  eq('공급자: 기본 bria-replace · 키 없으면 준비 안 됨', [DEFAULT_BG_GEN_MODEL, bgGenProviderConfig({}).ready, bgGenProviderConfig({ FAL_KEY: 'k' }).model.endpoint], ['bria-replace', false, 'fal-ai/bria/background/replace'])
  eq('공급자: 모르는 모델 이름 → 기본', (await quiet(() => bgGenProviderConfig({ STUDIO_BG_GEN_MODEL: 'nope', FAL_KEY: 'k' }))).modelKey, 'bria-replace')
  const calls = []
  const png = encodeRgbaPng(new Uint8Array(16).fill(200), 2, 2)
  const fakeFetch = async (url, opts) => { calls.push({ url, headers: opts.headers, body: JSON.parse(opts.body) }); return new Response(JSON.stringify({ images: [{ url: `data:image/png;base64,${png.toString('base64')}`, width: 2, height: 2 }], seed: 1 }), { status: 200 }) }
  const r = await generateBackground({ falKey: 'k', modelKey: 'bria-replace', imageUrl: 'https://s/x', prompt: 'on marble', fetchImpl: fakeFetch })
  eq('요청: 끝점 · Key · X-Fal-Store-IO 0', [calls[0].url, calls[0].headers.Authorization, calls[0].headers['X-Fal-Store-IO']], ['https://fal.run/fal-ai/bria/background/replace', 'Key k', '0'])
  eq('요청 본문: image_url·prompt·num_images 1·sync_mode (그 밖 없음)', calls[0].body, { image_url: 'https://s/x', prompt: 'on marble', num_images: 1, sync_mode: true })
  eq('응답 images[0] → 바이트 · 비용 $0.04', [r.buf.equals(png), r.via, r.costUsd], [true, 'data', 0.04])
  const bad = async () => new Response(JSON.stringify({ image: { url: 'data:image/png;base64,AA' } }), { status: 200 })
  let code = null
  try { await generateBackground({ falKey: 'k', modelKey: 'bria-replace', imageUrl: 'u', prompt: 'p', fetchImpl: bad }) } catch (e) { code = e.code }
  eq('응답에 images 없음 → bg_failed', code, 'bg_failed')
  eq('17-1 removeBackground는 그대로 있음', typeof removeBackground, 'function')
}
eq('결과 key = sha256 앞 16자', bgAiKey(Buffer.from('abc')), 'ba7816bf8f01cfea')
eq('SQL 전 오류 판별', [isKindCheckError({ status: 400, message: 'POST studio_ai_usage 400: new row for relation "studio_ai_usage" violates check constraint "studio_ai_usage_kind_check"' }), isKindCheckError({ status: 400, message: 'other' })], [true, false])

// ══ B. 서버 흐름 ══
process.env.STUDIO_ENABLED = 'all'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
const UID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER = '99999999-9999-4999-8999-999999999999'
const PID = '22222222-2222-4222-8222-222222222222'
const IMG = '33333333-3333-4333-8333-333333333333'
const NOMASK_IMG = '44444444-4444-4444-8444-444444444444'
const ORIG = `${UID}/${PID}/orig/${IMG}.jpg`
const FOLDER = `${UID}/${PID}/bg/${IMG}`
const W = 4, H = 2
let AI_OUT = encodeRgbaPng(new Uint8Array(W * H * 4).fill(120), W, H)

const S = {}
function reset(o = {}) {
  Object.assign(S, { admin: false, orders: [{ status: 'purchasing' }], rows: [], nextId: 1, files: new Map(), fal: 'ok', falCalls: [], kindCheck: 'new', falDelay: 0, uploads: [] }, o)
  process.env.FAL_KEY = 'fake-fal-key'
  delete process.env.STUDIO_BG_GEN_MODEL
  delete process.env.STUDIO_BG_GEN_DAILY_LIMIT
}
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** 가짜 PostgREST — 이번 쿼리에 쓰는 필터만 (eq·gte·in·or(status.eq.ok,created_at.gte)·order=id.asc·limit) */
function filterRows(q) {
  const params = new URLSearchParams(q.startsWith('?') ? q.slice(1) : q)
  let rows = S.rows
  for (const [k, v] of params) {
    if (k === 'select' || k === 'limit' || k === 'order') continue
    if (k === 'or') {
      const m = /^\(status\.eq\.ok,created_at\.gte\.(.+)\)$/.exec(v)
      if (!m) throw new Error('모르는 or: ' + v)
      const t = new Date(m[1]).getTime()
      rows = rows.filter(r => r.status === 'ok' || new Date(r.created_at).getTime() >= t)
      continue
    }
    const [op, ...rest] = v.split('.')
    const val = rest.join('.')
    if (op === 'eq') rows = rows.filter(r => String(r[k]) === val)
    else if (op === 'gte') rows = rows.filter(r => new Date(r[k]).getTime() >= new Date(val).getTime())
    else if (op === 'in') { const list = val.replace(/^\(|\)$/g, '').split(','); rows = rows.filter(r => list.includes(String(r[k]))) }
    else throw new Error('모르는 필터: ' + k + '=' + v)
  }
  if (params.get('order') === 'id.asc') rows = [...rows].sort((a, b) => a.id - b.id)
  if (params.get('limit')) rows = rows.slice(0, Number(params.get('limit')))
  return rows
}

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname)
  const q = decodeURIComponent(u.search)
  const method = opts.method || 'GET'
  if (u.host === 'fal.run') {
    S.falCalls.push({ url, headers: opts.headers, body: JSON.parse(opts.body) })
    if (S.falDelay) await sleep(S.falDelay)
    if (S.fal === 'fail') return json({ detail: 'boom' }, 500)
    if (S.fal === 'timeout') return json({ detail: 'timeout' }, 504)
    return json({ images: [{ url: `data:image/png;base64,${AI_OUT.toString('base64')}`, width: W, height: H }], seed: 7 })
  }
  if (p === '/auth/v1/user') return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'seller@test.local' }) : json({ msg: 'bad' }, 401)
  if (p === '/rest/v1/user_roles') return json(S.admin ? [{ role: 'admin' }] : [])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/studio_entitlements') return json([{ user_id: UID }])
  if (p === '/rest/v1/orders') {
    const list = /status=in\.\(([^)]*)\)/.exec(q)?.[1].split(',') || []
    return json(S.orders.filter(o => list.includes(o.status)).slice(0, 1))
  }
  if (p === '/rest/v1/studio_projects') return json(q.includes(`id=eq.${PID}`) && q.includes(`user_id=eq.${UID}`) ? [{ id: PID, expires_at: new Date(Date.now() + 86400000).toISOString() }] : [])
  if (p === '/rest/v1/studio_images') {
    if (!q.includes(`user_id=eq.${UID}`)) return json([])
    const id = q.includes(`id=eq.${IMG}`) ? IMG : q.includes(`id=eq.${NOMASK_IMG}`) ? NOMASK_IMG : null
    if (!id) return json([])
    if (q.includes('select=original_path,edit')) {
      return json([{ original_path: `${UID}/${PID}/orig/${id}.jpg`, edit: id === IMG ? { v: 2, bg: { mask: { path: `${FOLDER}/mask_0123456789abcdef.png`, w: W, h: H }, mode: 'transparent' } } : { v: 2 } }])
    }
    return json([{ id, width: W, height: H, ingest_status: 'done' }])
  }
  if (p === '/rest/v1/studio_ai_usage') {
    if (method === 'GET') return json(filterRows(u.search).map(r => ({ id: r.id })))
    if (method === 'POST') {
      const b = JSON.parse(opts.body)
      if (b.kind === 'bg_generate' && S.kindCheck === 'old') {
        return json({ code: '23514', message: 'new row for relation "studio_ai_usage" violates check constraint "studio_ai_usage_kind_check"' }, 400)
      }
      const row = { id: S.nextId++, created_at: new Date().toISOString(), ...b }
      S.rows.push(row)
      return json([{ id: row.id }], 201)
    }
    const id = Number(/id=eq\.(\d+)/.exec(q)?.[1])
    if (method === 'DELETE') { S.rows = S.rows.filter(r => !(r.id === id && r.status === 'pending')); return new Response(null, { status: 204 }) }
    if (method === 'PATCH') { Object.assign(S.rows.find(r => r.id === id), JSON.parse(opts.body)); return new Response(null, { status: 204 }) }
  }
  if (p.startsWith('/storage/v1/object/sign/studio/') && method === 'POST') return json({ signedURL: `/object/sign/studio/${p.slice(31)}?token=s` })
  if (p === '/storage/v1/object/list/studio' && method === 'POST') {
    const { prefix } = JSON.parse(opts.body)
    return json([...S.files.keys()].filter(k => k.startsWith(prefix + '/')).map(k => ({ name: k.slice(prefix.length + 1) })))
  }
  if (p.startsWith('/storage/v1/object/studio/') && method === 'POST') {
    const path = p.slice('/storage/v1/object/studio/'.length)
    S.files.set(path, Buffer.from(opts.body))
    S.uploads.push({ path, type: opts.headers['Content-Type'] })
    return json({ Key: path })
  }
  throw new Error(`가짜 fetch에 없는 요청: ${method} ${u.host}${p}${q}`)
}

const { default: handler } = await import('../api/studio-upload.js')
async function call(body) {
  const res = { code: 0, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
  await handler({ method: 'POST', headers: { authorization: 'Bearer good-token' }, body }, res)
  return res
}
const gen = (o = {}) => quiet(() => call({ action: 'bg_generate', projectId: PID, imageId: IMG, preset: 'marble', ...o }))
const status = () => quiet(() => call({ action: 'bg_gen_status' }))
const dayStart = new Date(kstDayStartIso()).getTime()
const okRow = (at, user = UID) => ({ id: S.nextId++, user_id: user, kind: 'bg_generate', status: 'ok', created_at: new Date(at).toISOString() })

reset()
eq('상태: 주문 고객 → 남은 3/3 · 전체 50', (await status()).body, { ready: true, reason: null, staff: false, perDay: 3, left: 3, globalLeft: 50, model: 'bria-replace' })
{
  const r = await gen()
  eq('만들기 → 200 · 경로 ai_{sha16}.png · 크기 · 남은 2', [r.code, r.body.path, r.body.w, r.body.h, r.body.preset, r.body.model, r.body.left], [200, `${FOLDER}/ai_${bgAiKey(AI_OUT)}.png`, W, H, 'marble', 'bria-replace', 2])
  eq('fal 요청: Bria Replace · 프롬프트 = 프리셋 영어 · 1장', [S.falCalls[0].url, S.falCalls[0].body.prompt === BG_GEN_PRESETS.marble, S.falCalls[0].body.num_images, S.falCalls[0].headers['X-Fal-Store-IO']], ['https://fal.run/fal-ai/bria/background/replace', true, 1, '0'])
  eq('fal 입력 = 본인 원본 서명 주소', S.falCalls[0].body.image_url.includes(ORIG), true)
  eq('저장: 받은 바이트 그대로 · PNG', [S.files.get(r.body.path).equals(AI_OUT), S.uploads[0].type], [true, 'image/png'])
  eq('기록: ok 1건 · bg_generate · $0.04', [S.rows.length, S.rows[0].status, S.rows[0].kind, S.rows[0].cost_usd, S.rows[0].meta.preset], [1, 'ok', 'bg_generate', 0.04, 'marble'])
}
// 1인 3회
reset()
S.rows.push(okRow(Date.now() - 1000), okRow(Date.now() - 2000))
eq('2회 쓴 뒤 → 3번째 통과 · 남은 0', [(await gen()).body.left, S.rows.filter(r => r.status === 'ok').length], [0, 3])
const fourth = await gen()
eq('4번째 → 429 bg_gen_user_limit · fal 안 부름 · 기록 안 남김', [fourth.code, fourth.body.code, S.falCalls.length, S.rows.length], [429, 'bg_gen_user_limit', 1, 3])
eq('상태: 남은 0/3', (await status()).body.left, 0)
// 한국 자정
reset()
S.rows.push(okRow(dayStart - 60 * 1000), okRow(dayStart - 1), okRow(dayStart - 2 * 3600 * 1000))
eq('어제(KST 23:59) 3회는 안 셈 → 오늘 3/3', (await status()).body.left, 3)
S.rows.push(okRow(dayStart))
eq('오늘 00:00:00 KST 1회는 셈 → 2/3', (await status()).body.left, 2)
// 다른 사람 기록은 1인 횟수에 안 들어감
reset()
S.rows.push(okRow(Date.now(), OTHER_USER), okRow(Date.now(), OTHER_USER), okRow(Date.now(), OTHER_USER))
eq('다른 사람 3회 → 나는 3/3 · 전체는 47', [(await status()).body.left, (await status()).body.globalLeft], [3, 47])
// 실패는 미차감
for (const [mode, code, http] of [['fail', 'bg_gen_failed', 502], ['timeout', 'bg_gen_timeout', 504]]) {
  reset({ fal: mode })
  const r = await gen()
  eq(`fal ${mode} → ${http} ${code} · 기록 지움 · 파일 없음`, [r.code, r.body.code, S.rows.length, S.files.size], [http, code, 0, 0])
  eq(`fal ${mode} 뒤 남은 횟수 그대로 3`, (await status()).body.left, 3)
}
reset()
AI_OUT = Buffer.from('this is not an image')
eq('결과가 이미지가 아님 → bg_gen_failed · 기록 지움', [(await gen()).body.code, S.rows.length], ['bg_gen_failed', 0])
AI_OUT = encodeRgbaPng(new Uint8Array(W * H * 4).fill(120), W, H)
// 죽은 요청(2분 지난 pending)은 안 셈
reset()
S.rows.push({ id: S.nextId++, user_id: UID, kind: 'bg_generate', status: 'pending', created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), image_id: 'x' })
eq('3분 된 pending(죽은 요청)은 안 셈 → 3/3', (await status()).body.left, 3)
// 동시 요청: 2회 쓴 상태에서 두 번 동시에 → 한 번만 통과
reset({ falDelay: 30 })
S.rows.push(okRow(Date.now() - 1000), okRow(Date.now() - 2000))
{
  const [a, b] = await Promise.all([gen({ imageId: IMG }), gen({ imageId: IMG, preset: 'wood' })])
  const codes = [a.code, b.code].sort()
  eq('동시 2번 → 하나 200 · 하나 막힘 (409 처리 중 또는 429)', [codes[0], codes[1] === 409 || codes[1] === 429], [200, true])
  eq('동시 뒤 ok 기록 = 3 (한도 안 넘음)', S.rows.filter(r => r.status === 'ok').length, 3)
}
// 다른 사진 두 장 동시 (처리 중 막기와 무관하게 한도만) — 2회 쓴 상태
reset({ falDelay: 30 })
S.rows.push(okRow(Date.now() - 1000), okRow(Date.now() - 2000))
{
  const rs = await Promise.all([gen(), gen({ preset: 'wood' }), gen({ preset: 'living' })])
  eq('3번 동시 → 정확히 1번만 통과', rs.filter(r => r.code === 200).length, 1)
  eq('3번 동시 뒤 ok 기록 = 3 · pending 남음 없음', [S.rows.filter(r => r.status === 'ok').length, S.rows.filter(r => r.status === 'pending').length], [3, 0])
}
// 관리자: 1인 횟수 없음, 전체 한도에는 포함
reset({ admin: true, orders: [] })
S.rows.push(okRow(Date.now()), okRow(Date.now()), okRow(Date.now()))
eq('관리자 상태: staff · left 없음', [(await status()).body.staff, (await status()).body.left], [true, null])
eq('관리자: 오늘 3회 뒤에도 통과 · left null', [(await gen()).code, S.rows.length], [200, 4])
process.env.STUDIO_BG_GEN_DAILY_LIMIT = '4'
eq('관리자도 전체 한도(4)에 막힘 → bg_gen_global_limit', (await gen()).body.code, 'bg_gen_global_limit')
// 전체 한도 (고객)
reset()
process.env.STUDIO_BG_GEN_DAILY_LIMIT = '2'
S.rows.push(okRow(Date.now(), OTHER_USER), okRow(Date.now(), OTHER_USER))
const g2 = await gen()
eq('전체 한도 소진 → 429 bg_gen_global_limit · fal 안 부름 · 기록 안 남김', [g2.code, g2.body.code, S.falCalls.length, S.rows.length], [429, 'bg_gen_global_limit', 0, 2])
eq('상태: 전체 남은 0', (await status()).body.globalLeft, 0)
// 자격·조건
reset({ orders: [{ status: 'quote_pending' }] })
eq('주문 없음(견적만) → 상태 not_eligible · 만들기 403', [(await status()).body.reason, (await gen()).body.code, S.falCalls.length], ['not_eligible', 'bg_not_eligible', 0])
reset(); process.env.FAL_KEY = ''
eq('키 없음 → no_key · 503', [(await status()).body.reason, (await gen()).code], ['no_key', 503])
reset()
eq('배경을 안 지운 사진 → bg_gen_need_mask · fal 안 부름', [(await gen({ imageId: NOMASK_IMG })).body.code, S.falCalls.length, S.rows.length], ['bg_gen_need_mask', 0, 0])
eq('모르는 장면 → invalid_input', (await gen({ preset: 'moon' })).body.code, 'invalid_input')
reset({ kindCheck: 'old' })
{
  const errs = []
  const e0 = console.error; console.error = (...a) => errs.push(a.join(' '))
  const r = await call({ action: 'bg_generate', projectId: PID, imageId: IMG, preset: 'marble' })
  console.error = e0
  eq('SQL 전(kind 체크) → 503 bg_gen_sql_missing · fal 안 부름', [r.code, r.body.code, S.falCalls.length], [503, 'bg_gen_sql_missing', 0])
  eq('SQL 전 → 원인 로그 (17-4 보고서 9장 SQL)', errs.some(m => m.includes('kind 체크') && m.includes('9장')), true)
}
reset()
S.rows.push({ id: S.nextId++, user_id: UID, kind: 'bg_generate', status: 'pending', image_id: IMG, created_at: new Date().toISOString() })
eq('같은 사진 처리 중 → 409 bg_busy', [(await gen()).code, S.falCalls.length], [409, 0])

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
