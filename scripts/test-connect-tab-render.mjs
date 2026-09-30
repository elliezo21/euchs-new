// 판매처 > 연결 탭 — "빌드한 코드"를 브라우저 흉내(jsdom)에서 실제로 띄워 카드에 무엇이 그려지는지 — node scripts/test-connect-tab-render.mjs
// 2026-09-30 운영: 주문 없는 계정(서버 403 not_customer)에서 쿠팡 카드가 제목만 남고 비었다 — 소스 글자 검사로는 못 잡아 실제로 그려 본다.
// 방법: vite로 StudioMarketplaceView를 운영 방식(production)으로 묶고, jsdom에 붙여 onMounted(상태 읽기)까지 돌린다.
// 가짜로 바꾸는 것: 서버 호출(studioMarketplace)·로그인(auth)·라우터 — 로그인·DB·판매처·시크릿을 쓰지 않는다. 자격 판정(서버)은 흉내 내지 않고 응답 코드만 준다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

// 브라우저 흉내 — vue(runtime-dom)는 불러올 때 document를 잡아 두므로, vite·vue보다 먼저 전역을 둔다
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://www.euchs.co.kr/studio/channels/connect' })
for (const k of ['window', 'document', 'navigator', 'sessionStorage', 'localStorage', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'MutationObserver', 'getComputedStyle']) {
  try { Object.defineProperty(globalThis, k, { value: k === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[k], configurable: true, writable: true }) } catch (e) { console.warn('전역을 두지 못함:', k, e.message) }
}
const { build } = await import('vite')
const vue = (await import('@vitejs/plugin-vue')).default

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(64)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

// globalThis.__MK = { status: 'ok'|코드, links: 'ok'|코드 } — 코드면 그 code로 실패(서버 오류 모양 그대로: err.code)
const STUBS = {
  '@/lib/studioMarketplace': `
    const reply = (kind, ok) => { globalThis.__CALLS[kind] = (globalThis.__CALLS[kind] || 0) + 1; const c = globalThis.__MK[kind]; if (c === 'ok') return Promise.resolve(ok()); const e = new Error(c === 'not_customer' ? '스튜디오는 EUCHS에서 주문하신 고객님께 무료로 열려 있어요.' : '잠시 후 다시 시도해 주세요.'); e.code = c === 'network' ? undefined : c; return Promise.reject(e) }
    export const getMarketplaceStatus = () => reply('status', () => ({ connected: false, places: [], relayIp: '3.39.196.112' }))
    export const getMarketLinks = () => reply('links', () => ({ elevenst: { connected: false }, smartstore: { connected: false }, cafe24: { connected: false } }))
    const never = () => Promise.reject(new Error('테스트에서는 부르지 않는다'))
    export const connectCoupang = never, disconnectCoupang = never, refreshPlaces = never, connectElevenst = never, disconnectElevenst = never, connectSmartstore = never, disconnectSmartstore = never, beginCafe24 = never, launchCafe24 = never, finishCafe24 = never, disconnectCafe24 = never
    export const expiryState = () => ({ level: 'ok', label: '' }), fmtDate = s => String(s || '')
    export const isNotReady = () => false, needsGuide = () => false`,
  '@/lib/auth': `
    import { ref, computed } from 'vue'
    export const currentUser = ref({ id: 'u1' })
    export const isAuthLoading = ref(false)
    globalThis.__AUTH = { currentUser, isAuthLoading }
    export const isSuperAdmin = computed(() => false)
    export const openLoginModal = () => {}`,
  'vue-router': `
    import { reactive } from 'vue'
    const route = reactive({ query: {}, path: '/studio/channels/connect', fullPath: '/studio/channels/connect' })
    export const useRoute = () => route
    export const useRouter = () => ({ replace: () => {}, push: () => {} })`,
}
const stubPlugin = {
  name: 'connect-tab-test', enforce: 'pre',
  // '@/lib/auth'·'../lib/auth'·'./auth.js' 등 어떤 경로로 불러도 같은 가짜 (진짜 auth.js가 섞이면 supabase가 뜬다)
  resolveId(id) {
    if (STUBS[id]) return '\0stub:' + id
    const m = /(?:^|\/)lib\/(auth|studioMarketplace)(?:\.js)?$|^\.\/(auth|studioMarketplace)(?:\.js)?$/.exec(id)
    return m ? '\0stub:@/lib/' + (m[1] || m[2]) : null
  },
  load(id) { return id.startsWith('\0stub:') ? STUBS[id.slice(6)] : null },
}

fs.mkdirSync(path.join(root, 'node_modules', '.cache'), { recursive: true })
const workDir = fs.mkdtempSync(path.join(root, 'node_modules', '.cache', 'euchs-connect-tab-'))
const entry = path.join(workDir, 'entry-src.js')
fs.writeFileSync(entry, `export { default as View } from '@/views/studio/StudioMarketplaceView.vue'\n`)

let built = null
try {
  await build({
    root, configFile: false, mode: 'production', logLevel: 'error',
    plugins: [stubPlugin, vue()],
    resolve: { alias: { '@': path.join(root, 'src') } },
    build: { lib: { entry, formats: ['es'], fileName: () => 'entry.mjs' }, outDir: path.join(workDir, 'out'), emptyOutDir: true, minify: false, rollupOptions: { external: ['vue'] } },
  })
  built = await import(pathToFileURL(path.join(workDir, 'out', 'entry.mjs')).href)
} catch (e) {
  console.error('빌드·불러오기 실패:', e)
}
eq('운영 방식으로 묶은 연결 탭을 불러옴', typeof built?.View, 'object')

const { createApp, h, nextTick } = await import('vue')
const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim()

/** status·links 응답을 정해 띄우고 카드 모양을 돌려준다. 모듈 상태(studioMarketLinks)가 남지 않게 한 번에 한 경우만 — 경우마다 새로 묶지 않고 앱만 새로 */
const settle = async () => { for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 5)); await nextTick() } }
async function mount(mk, { before, after } = {}) {
  globalThis.__MK = mk
  globalThis.__CALLS = {}
  globalThis.__AUTH.currentUser.value = { id: 'u1' }
  globalThis.__AUTH.isAuthLoading.value = false
  if (before) before()
  document.body.innerHTML = '<div id="app"></div>'
  const errors = []
  const app = createApp({ render: () => h(built.View) })
  app.config.errorHandler = e => { errors.push(`${e.name}: ${e.message}`) }
  app.config.warnHandler = m => { if (!/router-link|Failed to resolve component/.test(m)) errors.push('warn: ' + m) }
  app.component('router-link', { props: ['to'], render() { return h('a', { 'data-to': typeof this.to === 'string' ? this.to : JSON.stringify(this.to) }, this.$slots.default?.()) } })
  const err = console.error
  console.error = () => {} // 화면이 남기는 원인 로그(console.error)는 이 테스트의 대상이 아니다
  try {
    app.mount('#app')
    await settle()
    if (after) { await after(); await settle() }
  } finally { console.error = err }
  const card = key => document.querySelector(`[data-mk-card="${key}"]`)
  const cp = card('coupang')
  const out = {
    errors,
    notice: document.querySelectorAll('[data-mk-no-access]').length,
    coupang: {
      badge: text(cp?.querySelector('.st-badge')),
      desc: !!cp && /OPEN API 키를 입력하면/.test(text(cp)),
      connect: !!cp?.querySelector('[data-mk-connect-open]'),
      guide: !!cp?.querySelector('[data-mk-guide-open]'),
      checking: !!cp?.querySelector('[data-mk-link-checking], [data-mk-link-phase="checking"]'),
      failed: !!cp?.querySelector('[data-mk-link-failed]'),
    },
    others: ['11st', 'smartstore', 'cafe24'].map(k => ({ key: k, off: /연결 전/.test(text(card(k)?.querySelector('.flex'))), failed: !!card(k)?.querySelector('[data-mk-link-failed]') })),
    retry: document.querySelectorAll('[data-mk-link-retry]').length,
    calls: { ...globalThis.__CALLS },
  }
  app.unmount()
  return out
}

if (built?.View) {
  // 주문 자격 없음 — 두 호출 모두 403 not_customer (운영 실측 2026-09-30 22:03)
  const a = await mount({ status: 'not_customer', links: 'not_customer' })
  eq('locked: 오류 없이 그려짐', a.errors, [])
  eq('locked: 탭 위 주문 고객 안내 한 번', a.notice, 1)
  eq('locked: 쿠팡 카드 = "연결 전" 배지 + 설명 + [쿠팡 연결하기] + [연결 방법 보기] (비어 있지 않음)', [a.coupang.badge, a.coupang.desc, a.coupang.connect, a.coupang.guide, a.coupang.checking, a.coupang.failed], ['연결 전', true, true, true, false, false])
  eq('locked: 11번가·스마트스토어·카페24도 "연결 전" · [다시 시도] 없음', [a.others.map(o => o.off && !o.failed), a.retry], [[true, true, true], 0])

  // 불러오기 실패 — 500·네트워크
  const b = await mount({ status: 'server_error', links: 'server_error' })
  eq('failed(500): 카드마다 "불러오지 못했습니다 [다시 시도]" · "연결 전"·[연결하기] 없음 · 주문 고객 안내 없음', [b.errors, b.notice, b.coupang.failed, b.coupang.connect, b.coupang.badge, b.others.map(o => o.failed), b.retry], [[], 0, true, false, '', [true, true, true], 4])
  const n = await mount({ status: 'network', links: 'network' })
  eq('failed(네트워크 — 코드 없음): 같은 모양', [n.errors, n.notice, n.coupang.failed, n.coupang.connect, n.retry], [[], 0, true, false, 4])

  // 정상 응답 (주문 고객·관리자·허용 명단 계정 — 서버가 통과시킨 경우는 모두 이 모양)
  const c = await mount({ status: 'ok', links: 'ok' })
  eq('ready: 쿠팡 "연결 전" + 버튼 · 주문 고객 안내 없음 · [다시 시도] 없음', [c.errors, c.notice, c.coupang.badge, c.coupang.connect, c.coupang.guide, c.retry], [[], 0, '연결 전', true, true, 0])

  // 섞인 경우 — 쿠팡만 자격 없음 코드, 나머지는 정상(서버가 같은 관문이라 실제로는 드묾)
  const d = await mount({ status: 'not_customer', links: 'ok' })
  eq('쿠팡만 locked: 쿠팡 카드 "연결 전" + 버튼 · 안내 한 번', [d.errors, d.coupang.badge, d.coupang.connect, d.notice], [[], '연결 전', true, 1])

  // 운영 타이밍 — auth.js는 로그인 복원·탭 복귀·토큰 갱신 때 같은 사용자로 euchs-auth-changed를 다시 보낸다
  const authEvent = user => window.dispatchEvent(new window.CustomEvent('euchs-auth-changed', { detail: { user } }))
  const e1 = await mount({ status: 'not_customer', links: 'not_customer' }, { after: () => authEvent({ id: 'u1' }) })
  eq('locked + 같은 사용자 이벤트 뒤: 쿠팡 카드 "연결 전" + 버튼', [e1.errors, e1.coupang.badge, e1.coupang.connect, e1.coupang.guide, e1.notice], [[], '연결 전', true, true, 1])
  // 로그인 캐시가 없어 마운트 때는 로그인 전 → 복원 뒤 currentUser + 이벤트
  const e2 = await mount({ status: 'not_customer', links: 'not_customer' }, {
    before: () => { globalThis.__AUTH.currentUser.value = null; globalThis.__AUTH.isAuthLoading.value = true },
    after: () => { globalThis.__AUTH.currentUser.value = { id: 'u1' }; globalThis.__AUTH.isAuthLoading.value = false; authEvent({ id: 'u1' }) },
  })
  eq('locked + 로그인 복원이 마운트 뒤: 쿠팡 카드 "연결 전" + 버튼', [e2.errors, e2.coupang.badge, e2.coupang.connect, e2.coupang.guide, e2.notice], [[], '연결 전', true, true, 1])
  eq('로그인 복원 뒤 사용자 바뀜 + 이벤트가 겹쳐도 요청은 한 번씩 (쿠팡 status · 나머지 market_status)', [e2.calls.status, e2.calls.links], [1, 1])
  // 복원이 끝났는데 이벤트가 오지 않는 경우(currentUser만 바뀜)
  const e3 = await mount({ status: 'not_customer', links: 'not_customer' }, {
    before: () => { globalThis.__AUTH.currentUser.value = null; globalThis.__AUTH.isAuthLoading.value = true },
    after: () => { globalThis.__AUTH.currentUser.value = { id: 'u1' }; globalThis.__AUTH.isAuthLoading.value = false },
  })
  // 운영 실측(2026-09-30 22:03) 재현 경우 — 고치기 전에는 쿠팡 카드가 "확인 중"(글자로는 제목 "쿠팡"만)에 멈췄다
  eq('locked + 로그인 복원 뒤 이벤트 없음: 쿠팡 카드 "연결 전" + 버튼', [e3.errors, e3.coupang.badge, e3.coupang.connect, e3.coupang.guide, e3.coupang.checking, e3.notice], [[], '연결 전', true, true, false, 1])
  eq('locked + 로그인 복원 뒤 이벤트 없음: 11번가·스마트스토어·카페24도 "연결 전"', e3.others.map(o => o.off && !o.failed), [true, true, true])}

try { fs.rmSync(workDir, { recursive: true, force: true }) } catch (e) { console.warn('임시 폴더를 지우지 못함:', workDir, e.message) }
console.log(`\n${pass} 통과 · ${fail} 실패`)
process.exit(fail ? 1 : 0) // jsdom·vite가 남긴 타이머 때문에 스스로 끝나지 않는다
