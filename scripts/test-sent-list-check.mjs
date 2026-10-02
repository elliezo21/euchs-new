// 판매처 > [보낸 상품] — 실제로 그려 보고 확인 (2026-10-02) — node scripts/test-sent-list-check.mjs
//   1) 판매처 상태 자동 확인이 실패하면 "마지막 확인" 옆에 "확인 실패 · 다시 시도" (판매처 이름·서버 문구는 마우스를 올렸을 때만 — title)
//      예전에는 자동 확인 오류를 로그로만 남겨, 로컬처럼 서버가 판매처 키를 못 읽으면(enc_not_ready) 시각만 멈춰 있었다
//   2) 운영 중단 판매처(MARKETS off — 카페24)는 관리자·스태프에게도 칩·필터·상태 카드 숫자·이력·마지막 확인 시각에 없음
// 방법: vite로 StudioSendList를 묶고(vue는 밖에서) jsdom에 실제로 붙인다. 서버 호출(callStudioApi)·로그인(auth)·보내기 창만 가짜 —
//   studioMarketplace.js(listSends·syncSends — 카페24 기록을 빼는 곳)는 진짜를 쓴다. 로그인·DB·판매처·시크릿을 쓰지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(64)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

const API_STUB = '\0sent-list-api-stub', AUTH_STUB = '\0sent-list-auth-stub', MODAL_STUB = '\0sent-list-modal-stub'
const stubPlugin = {
  name: 'sent-list-test',
  enforce: 'pre',
  resolveId(id) {
    // vite 별칭(@ → src)이 먼저 풀리는 경우가 있어 풀린 경로로도 맞춘다
    const p = String(id).replace(/\\/g, '/').replace(/^.*\/src\//, '@/')
    if (/^@\/lib\/studioApi(\.js)?$/.test(p)) return API_STUB
    if (/^@\/lib\/auth(\.js)?$/.test(p)) return AUTH_STUB
    if (p === '@/components/studio/StudioSendModal.vue') return MODAL_STUB
    return null
  },
  load(id) {
    // 서버 응답은 테스트가 globalThis.__api(action, body)로 정한다
    if (id === API_STUB) return `
      export async function callStudioApi(name, body) { globalThis.__calls.push(body.action); return globalThis.__api(body.action, body) }
      export const studioErrorMessage = (area, code) => '잠시 후 다시 시도해 주세요. (' + code + ')'`
    if (id === AUTH_STUB) return 'export const isAdminOrStaff = { value: true } // 관리자·스태프로 — 카페24가 관리자에게도 안 보이는지'
    if (id === MODAL_STUB) return 'export default { name: "StudioSendModalStub", render: () => null }'
    return null
  },
}

fs.mkdirSync(path.join(root, 'node_modules', '.cache'), { recursive: true })
const workDir = fs.mkdtempSync(path.join(root, 'node_modules', '.cache', 'euchs-sent-list-'))
const outDir = path.join(workDir, 'out')
const entry = path.join(workDir, 'entry-src.js')
fs.writeFileSync(entry, `export { default as SendList } from '@/components/studio/StudioSendList.vue'\n`)

// jsdom 전역 — vue(runtime-dom)를 불러오기 전에
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'http://localhost/studio/channels/sent', pretendToBeVisual: true })
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'MouseEvent', 'Event', 'CustomEvent', 'getComputedStyle', 'requestAnimationFrame', 'CSS']) {
  if (k in dom.window) Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true })
}
if (!globalThis.CSS) globalThis.CSS = { escape: s => String(s) }
// vue(runtime-dom)는 불러올 때 document를 한 번 붙잡는다 — 빌드보다 먼저 jsdom 위에서 불러 둔다
const { createApp, nextTick } = await import('vue')
// vite·plugin-vue는 그 뒤에 (먼저 불러오면 그 안에서 vue가 document 없이 한 번 불러와진다)
const { build } = await import('vite')
const { default: vue } = await import('@vitejs/plugin-vue')

let built = null
try {
  await build({
    root, configFile: false, mode: 'production', logLevel: 'error',
    plugins: [stubPlugin, vue()],
    resolve: { alias: { '@': path.join(root, 'src') } },
    build: { lib: { entry, formats: ['es'], fileName: () => 'entry.mjs' }, outDir, emptyOutDir: true, minify: false, rollupOptions: { external: ['vue'] } },
  })
  built = await import(pathToFileURL(path.join(outDir, 'entry.mjs')).href)
} catch (e) {
  console.error('빌드·불러오기 실패:', e)
}
eq('운영 방식으로 묶은 보낸 상품 목록을 불러옴', typeof built?.SendList, 'object')

const settle = async () => { for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 0)); await nextTick() } }

const ago = min => new Date(Date.now() - min * 60000).toISOString()
// 확인 대상 2건(쿠팡 2시간 전 확인 · 스마트스토어 확인한 적 없음) + 카페24 1건(1분 전 확인 — 빠지지 않으면 "마지막 확인"이 이 시각이 된다)
const SENDS = () => [
  { id: 'c1', exportId: 'E1', market: 'coupang', sellerProductId: '1001', status: 'approved', productName: '머그컵', lastSyncedAt: ago(120), createdAt: ago(600) },
  { id: 's1', exportId: 'E2', market: 'smartstore', sellerProductId: '2002', status: 'registered', productName: '수건', lastSyncedAt: null, createdAt: ago(500) },
  { id: 'k1', exportId: 'E3', market: 'cafe24', sellerProductId: '3003', status: 'registered', productName: '카페24 상품', adminUrl: 'https://example.cafe24.com/admin', display: 'T', lastSyncedAt: ago(1), createdAt: ago(400) },
]
const NOT_READY = '지금은 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'

/** 붙이고 → 자동 확인까지 기다린다 */
async function mountWith(api) {
  globalThis.__calls = []
  globalThis.__api = api
  document.body.innerHTML = '<div id="app"></div>'
  const app = createApp(built.SendList)
  app.config.warnHandler = () => {} // router-link 전역 부품 없음 경고는 대상이 아님
  const errs = []
  app.config.errorHandler = e => errs.push(e)
  const err = console.error
  if (!process.env.DEBUG_SENT) console.error = () => {} // 실패 로그는 일부러 나는 것 — 화면 표시만 본다
  app.mount('#app')
  await settle()
  console.error = err
  return { app, errs, el: document.querySelector('[data-mk-sends]') }
}
const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()

if (built?.SendList) {
  // ── 1) 자동 확인 실패 — 서버는 200 + 판매처마다 오류 (로컬에 MARKETPLACE_ENC_KEY가 없을 때 실제로 나던 응답) ──
  const a = await mountWith(async (action) => {
    if (action === 'sends_list') return { ok: true, data: { sends: SENDS() } }
    if (action === 'sync') return { ok: true, data: { errors: [{ market: 'coupang', code: 'enc_not_ready', message: NOT_READY }, { market: 'smartstore', code: 'enc_not_ready', message: NOT_READY }], more: false, sends: SENDS() } }
    return { ok: false, code: 'unexpected' }
  })
  const failA = a.el.querySelector('[data-sl-check-fail]')
  eq('자동 확인: 탭을 열면 목록 → 확인 요청이 나감', globalThis.__calls, ['sends_list', 'sync'])
  eq('자동 확인 실패: "마지막 확인" 옆에 "확인 실패 · 다시 시도" 한 줄 · 화면 글자에 판매처 이름·서버 문구 없음', [!!failA, text(failA), /쿠팡|스마트스토어|연결할 수 없어요/.test(text(a.el.querySelector('[data-sl-check]')))], [true, '확인 실패 · 다시 시도', false])
  eq('마우스를 올리면(title) 판매처 이름 + 서버 문구 · 우리 쪽 준비 문제라 회색', [failA?.getAttribute('title'), failA?.classList.contains('st-muted')], [`쿠팡: ${NOT_READY}\n스마트스토어: ${NOT_READY}`, true])
  eq('[지금 확인] 버튼은 그대로', text(a.el.querySelector('[data-mk-sync]')), '지금 확인')
  eq('예전 목록 아래 오류 줄 없음', !!a.el.querySelector('[data-sl-check-error]'), false)
  // 카페24 (운영 중단 off) — 관리자로 붙였는데도 없음
  const optionTexts = [...a.el.querySelectorAll('[data-sl-filter-market] option')].map(o => o.textContent.trim())
  eq('카페24: 관리자·스태프에게도 판매처 필터·칩·화면 글자에 없음 · [판매처에서 보기] 없음', [optionTexts, a.el.querySelectorAll('[data-sl-chip="cafe24"]').length, /카페24/.test(text(a.el)), !!a.el.querySelector('[data-mk-send-admin]'), /판매처에서 보기/.test(text(a.el))], [['전체', '쿠팡', '스마트스토어', '11번가'], 0, false, false, false])
  const cardNum = key => text(a.el.querySelector(`[data-sl-status-card="${key}"] .sl-card-num`))
  eq('카페24: 상태 카드 숫자에서 빠짐 (전체 2 · 완료 2) · 상품 수 2개', [cardNum('all'), cardNum('done'), text(a.el.querySelector('[data-sl-count]'))], ['2', '2', '상품 2개'])
  const checkedAtText = text(a.el.querySelector('[data-sl-checked-at]'))
  const kst = iso => { const k = new Date(new Date(iso).getTime() + 9 * 3600000); return `${k.getUTCMonth() + 1}/${k.getUTCDate()} ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}` }
  eq('카페24: "마지막 확인" 시각에도 안 들어감 (쿠팡 2시간 전 기록 기준)', checkedAtText, `판매처 상태 마지막 확인: ${kst(SENDS()[0].lastSyncedAt)}`)
  // 이력 펼치기 — 카페24 줄 없음
  a.el.querySelector('[data-sl-open="E1"]')?.click()
  await settle()
  eq('이력 펼치기: 카페24 기록 없음 · 카페24 상품 줄 없음', [!!a.el.querySelector('[data-mk-send="k1"]'), !!a.el.querySelector('[data-sl-product="E3"]')], [false, false])

  // ── [다시 시도] → 이번에는 성공: 실패 줄이 사라지고 "마지막 확인"이 바뀐다 ──
  const fresh = new Date().toISOString()
  globalThis.__api = async (action) => {
    if (action === 'sync') return { ok: true, data: { errors: [], more: false, sends: SENDS().map(s => (s.market === 'cafe24' ? s : { ...s, lastSyncedAt: fresh })) } }
    if (action === 'sends_list') return { ok: true, data: { sends: SENDS() } }
    return { ok: false, code: 'unexpected' }
  }
  globalThis.__calls = []
  failA?.querySelector('[data-sl-check-retry]')?.click()
  await settle()
  eq('[다시 시도] = 확인 요청 1번 → 성공하면 실패 줄이 사라지고 마지막 확인 시각이 바뀜', [globalThis.__calls, !!a.el.querySelector('[data-sl-check-fail]'), text(a.el.querySelector('[data-sl-checked-at]'))], [['sync'], false, `판매처 상태 마지막 확인: ${kst(fresh)}`])
  eq('화면 오류 없음', a.errs.map(e => e.message), [])
  a.app.unmount()

  // ── 2) 고객이 고칠 오류(bad_key) = 빨간 글자 · 요청 자체가 실패(판매처 없음) = 문구만 ──
  const b = await mountWith(async (action) => {
    if (action === 'sends_list') return { ok: true, data: { sends: SENDS() } }
    if (action === 'sync') return { ok: true, data: { errors: [{ market: 'smartstore', code: 'bad_key', message: '키를 확인하세요.' }, { market: 'smartstore', code: 'bad_key', message: '키를 확인하세요.' }], more: false, sends: SENDS() } }
    return { ok: false, code: 'unexpected' }
  })
  const failB = b.el.querySelector('[data-sl-check-fail]')
  eq('고객이 고칠 오류: 빨간 글자 · 같은 줄은 한 번', [failB?.classList.contains('st-danger-text'), failB?.getAttribute('title')], [true, '스마트스토어: 키를 확인하세요.'])
  b.app.unmount()
  const c = await mountWith(async (action) => {
    if (action === 'sends_list') return { ok: true, data: { sends: SENDS() } }
    if (action === 'sync') return { ok: false, code: 'network_error', data: { message: '네트워크 연결을 확인해 주세요.' } }
    return { ok: false, code: 'unexpected' }
  })
  const failC = c.el.querySelector('[data-sl-check-fail]')
  eq('요청 자체가 실패해도 조용히 넘어가지 않음 · title = 문구만', [text(failC), failC?.getAttribute('title')], ['확인 실패 · 다시 시도', '네트워크 연결을 확인해 주세요.'])
  c.app.unmount()

  // ── 3) 10분 안에 확인한 기록뿐이면 자동 확인을 부르지 않고 실패 줄도 없음 ──
  const d = await mountWith(async (action) => {
    if (action === 'sends_list') return { ok: true, data: { sends: SENDS().map(s => ({ ...s, lastSyncedAt: ago(2) })) } }
    return { ok: false, code: 'unexpected' }
  })
  eq('10분 안에 확인했으면 목록만 · 실패 줄 없음', [globalThis.__calls, !!d.el.querySelector('[data-sl-check-fail]')], [['sends_list'], false])
  d.app.unmount()
}

fs.rmSync(workDir, { recursive: true, force: true })
console.log(`\n${pass} 통과 · ${fail} 실패`)
process.exit(fail ? 1 : 0)
