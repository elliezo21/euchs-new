// 사진 없이 빈 작업 만들기(project_blank) 테스트 — node scripts/test-studio-project-blank.mjs
// api/studio-upload.js handler를 그대로 부르고 Supabase는 가짜 fetch + 메모리 표로 흉내 낸다 (test-studio-upload-copy.mjs와 같은 방식, 시크릿·운영 DB 없음)
// 확인: 성공(upload 작업·사진 행 없음·이름) · 하루 상한(사진 작업과 같이 셈) · 로그인 없음 · 화면 연결(갤러리 → ?template= → 편집기, 다른 길의 0장 규칙 유지)
process.env.STUDIO_ENABLED = 'admin'
process.env.SUPABASE_URL = 'http://mock.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.STUDIO_UPLOAD_DAILY_PROJECTS = '3'
import fs from 'node:fs'

const UID = '11111111-1111-4111-8111-111111111111'
let projects = [], imagesPosted = 0, seq = 0
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
const eqv = (q, col) => { const m = new RegExp(`[?&]${col}=eq\\.([^&]+)`).exec(q); return m ? m[1] : null }
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url)
  const p = decodeURIComponent(u.pathname), q = decodeURIComponent(u.search)
  const method = opts.method || 'GET'
  const body = opts.body ? JSON.parse(opts.body) : null
  if (p === '/auth/v1/user') return opts.headers.Authorization === 'Bearer good-token' ? json({ id: UID, email: 'admin@test.local' }) : json({ msg: 'bad' }, 401)
  if (p === '/rest/v1/user_roles') return json([{ role: 'admin' }])
  if (p === '/rest/v1/profiles') return json([])
  if (p === '/rest/v1/studio_projects') {
    if (method === 'GET') return json(projects.filter(r => r.user_id === eqv(q, 'user_id') && r.source_type === eqv(q, 'source_type')).map(r => ({ id: r.id })))
    if (method === 'POST') {
      const row = { ...body, id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, expires_at: new Date(Date.now() + 86400000).toISOString() }
      projects.push(row)
      return json([{ id: row.id, expires_at: row.expires_at }], 201)
    }
  }
  if (p === '/rest/v1/studio_images') { imagesPosted++; return new Response(null, { status: 201 }) }
  throw new Error(`가짜 fetch에 없는 요청: ${method} ${p}${q}`)
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(56)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

{
  const r = await call({ action: 'project_blank', title: '  의류 | 미니멀 화이트\u0007 ' })
  const row = projects.find(x => x.id === r.body?.projectId)
  eq('성공 200 · 새 작업 id', [r.code, !!row], [200, true])
  eq('upload 작업 · 내 계정 · 이름 정리 · page 없음', [row.source_type, row.user_id, row.title, 'page' in row, row.offer_id], ['upload', UID, '의류 | 미니멀 화이트', false, null])
  eq('사진 행은 만들지 않음', imagesPosted, 0)
  const r2 = await call({ action: 'project_blank' })
  eq('이름이 없으면 "새 작업 날짜"', /^새 작업 \d{4}-\d{2}-\d{2}$/.test(projects.find(x => x.id === r2.body.projectId).title), true)
  projects.push({ id: 'x', user_id: UID, source_type: 'upload' }) // 사진 올리기로 만든 작업도 같이 센다 (상한 3)
  const r3 = await call({ action: 'project_blank', title: 'a' })
  eq('하루 상한 = 사진 작업과 같이 셈 → 429 daily_limit', [r3.code, r3.body?.code], [429, 'daily_limit'])
  const r4 = await call({ action: 'project_blank' }, 'bad')
  eq('로그인 없음 → 401', r4.code, 401)
}

// 화면 연결
{
  const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const gallery = read('src/views/studio/StudioTemplatesView.vue')
  eq('갤러리: [이 템플릿으로 시작] = 빈 작업 만들고 편집기 ?template=', [/createBlankProject\(templateCardTitle\(tpl\)\)/.test(gallery), /router\.push\(\{ name: 'studio-editor', params: \{ projectId \}, query: \{ template: key \} \}\)/.test(gallery)], [true, true])
  const editor = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: 불러오기 끝에 주소 template → 시작 화면이면 askTemplate (0장 규칙 안 봄)', [/startTemplateFromRoute\(\) \/\//.test(editor), /function startTemplateFromRoute\(\) \{[\s\S]{0,600}askTemplate\(key\)/.test(editor), /function startTemplateFromRoute\(\) \{[\s\S]{0,600}canStartBlank/.test(editor)], [true, true, false])
  eq('편집기: 주소의 template은 한 번 쓰고 뗌', /const \{ template: _t, \.\.\.rest \} = route\.query\s*\n\s*router\.replace\(\{ query: rest \}\)/.test(editor), true)
  const start = read('src/components/studio/StudioStartScreen.vue')
  eq('다른 길(시작 화면)의 사진 0장 규칙은 그대로', /const canBlank = computed\(\(\) => canStartBlank\(props\.usableCount\)\)/.test(start), true)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
