// 보내기 창 — "빌드한 코드"에서 setup이 예외 없이 도는지 — node scripts/test-send-modal-setup.mjs
// 운영 빌드에서만 나던 오류(ReferenceError: Cannot access 'X' before initialization)를 잡는다.
// 방법: vite로 StudioSendModal·StudioSendCoupang을 운영 방식(production)으로 묶어 임시 폴더에 만들고, 그 결과를 불러 실제로 그려 본다(서버 렌더).
// 서버 호출 파일(studioMarketplace)만 가짜로 바꾼다 — 로그인·DB·쿠팡·시크릿을 쓰지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(64)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}

const API_STUB = '\0studio-marketplace-stub'
const stubPlugin = {
  name: 'send-modal-test',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@/lib/studioMarketplace') return API_STUB
    return null
  },
  load(id) {
    if (id === API_STUB) return `
      const never = () => Promise.reject(new Error('테스트에서는 서버를 부르지 않는다'))
      export const predictCategory = never, getCategoryMeta = never, sendProduct = never, makeSquareJpeg = never, fileToBase64 = never
      export const REP_SIZE = 1000, SEND_BODY_MAX = 4000000
      export const readSaleMode = () => '', rememberSaleMode = () => {}`
    return null
  },
}

// 임시 폴더는 node_modules 안에 — 묶은 결과가 vue를 node_modules에서 찾아야 한다 (git에 안 들어감)
fs.mkdirSync(path.join(root, 'node_modules', '.cache'), { recursive: true })
const workDir = fs.mkdtempSync(path.join(root, 'node_modules', '.cache', 'euchs-send-modal-'))
const outDir = path.join(workDir, 'out')
const entry = path.join(workDir, 'entry-src.js')
fs.writeFileSync(entry, `export { default as Modal } from '@/components/studio/StudioSendModal.vue'
export { default as Coupang } from '@/components/studio/StudioSendCoupang.vue'
`)
// 브라우저 전역 흉내 (불러올 때 window를 보는 파일이 있다) — 값이 아니라 자리만
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis
let built = null
try {
  await build({
    root, configFile: false, mode: 'production', logLevel: 'error',
    plugins: [stubPlugin, vue()],
    resolve: { alias: { '@': path.join(root, 'src') } },
    build: { ssr: entry, outDir, emptyOutDir: true, minify: false, rollupOptions: { output: { entryFileNames: 'entry.mjs', format: 'es' } } },
    ssr: { noExternal: ['lucide-vue-next'] },
  })
  built = await import(pathToFileURL(path.join(outDir, 'entry.mjs')).href)
} catch (e) {
  console.error('빌드·불러오기 실패:', e)
}
eq('운영 방식으로 묶은 보내기 창을 불러옴', [typeof built?.Modal, typeof built?.Coupang], ['object', 'object'])

const { createSSRApp, h } = await import('vue')
const { renderToString } = await import('vue/server-renderer')

const PREPARE = (connected, source = null) => ({
  connected, markets: { coupang: { connected } },
  export: { id: '44444444-4444-4444-8444-444444444444', title: '매일 쓰는 머그', files: [{ key: '01', name: 'a_01.jpg', width: 780, height: 900 }] },
  images: [{ id: 'img1', url: 'https://example.test/a.jpg', width: 800, height: 800, included: true, sourceUrl: 'https://cbu01.alicdn.com/img/ibank/O1CN01black.jpg' }],
  templates: [{ id: 't1', name: '기본', is_default: true, outbound_shipping_time_day: 2 }],
  places: [], source, limits: { optionImages: 6, documents: 5, documentBytes: 3145728 },
})
const SOURCE = {
  from: '1688', offerId: '123456789012', title: { zh: '女士拖鞋', ko: '여성 슬리퍼' }, attrs: [{ name: { zh: '材质', ko: '소재' }, value: { zh: 'EVA', ko: 'EVA' } }], options: [], skuTotal: 2,
  skus: [
    { skuId: '5001', values: [{ name: { zh: '颜色', ko: '색상' }, value: { zh: '黑色', ko: '블랙' } }], priceCny: 12.5, stock: 120, imageUrl: '//cbu01.alicdn.com/img/ibank/O1CN01black.jpg_.webp' },
    { skuId: '5002', values: [{ name: { zh: '颜色', ko: '색상' }, value: { zh: '白色', ko: '화이트' } }], priceCny: 13, stock: 0, imageUrl: '' },
  ],
}

/** 그려 보고 { html, error } — setup에서 예외가 나면 error에 담긴다 */
async function render(component, props) {
  const errors = []
  const app = createSSRApp({ render: () => h(component, props) })
  app.config.errorHandler = e => { errors.push(e) }
  app.config.warnHandler = () => {} // router-link 같은 전역 부품이 없다는 경고는 이 테스트의 대상이 아니다
  const ctx = {}
  let html = ''
  const warn = console.warn
  console.warn = () => {}
  try { html = await renderToString(app, ctx) } catch (e) { errors.push(e) } finally { console.warn = warn }
  return { html: html + Object.values(ctx.teleports || {}).join(''), error: errors[0] ? `${errors[0].name}: ${errors[0].message}` : null }
}

if (built?.Coupang && built?.Modal) {
  const a = await render(built.Coupang, { prepare: PREPARE(true) })
  eq('쿠팡 섹션 setup이 예외 없이 실행 (옵션 없는 작업)', a.error, null)
  eq('쿠팡 섹션이 그려짐: 판매 방식·옵션 표·요약', [/data-mk-s-mode-pick/.test(a.html), /data-mk-s-items/.test(a.html), /data-mk-s-preview/.test(a.html)], [true, true, true])

  const b = await render(built.Coupang, { prepare: PREPARE(true, SOURCE) })
  eq('쿠팡 섹션 setup이 예외 없이 실행 (1688 옵션 2개)', b.error, null)
  eq('옵션 2줄 · 1688 가격은 참고 표시', [(b.html.match(/data-mk-s-item="/g) || []).length, /12\.5위안/.test(b.html)], [2, true])
  eq('재고 수량 칸: 처음에는 비어 있음 (1688 재고를 넣지 않음)', [(b.html.match(/data-mk-s-stock="/g) || []).length, /data-mk-s-stock="\d+"[^>]*value="/.test(b.html)], [2, false])

  const c = await render(built.Modal, { open: true, prepare: PREPARE(true, SOURCE) })
  eq('보내기 창 setup이 예외 없이 실행 (연결됨)', c.error, null)
  eq('보내기 창: 판매처 9줄 + 쿠팡 섹션이 그려짐', [(c.html.match(/data-mk-s-market="/g) || []).length, /data-mk-send-coupang/.test(c.html), /data-mk-s-mode-pick/.test(c.html)], [9, true, true])

  const d = await render(built.Modal, { open: true, prepare: PREPARE(false) })
  eq('보내기 창 (연결 전): 예외 없음 · 쿠팡 섹션 없음 · 보내기 버튼 꺼짐', [d.error, /data-mk-send-coupang/.test(d.html), /<button[^>]*disabled[^>]*data-mk-s-send|<button[^>]*data-mk-s-send[^>]*disabled/.test(d.html)], [null, false, true])

  const e = await render(built.Modal, { open: true, prepare: null })
  eq('보내기 창 (준비 데이터 없음): 예외 없음 · 보내기 버튼 꺼짐', [e.error, /<button[^>]*disabled[^>]*data-mk-s-send|<button[^>]*data-mk-s-send[^>]*disabled/.test(e.html)], [null, true])
}

try { fs.rmSync(workDir, { recursive: true, force: true }) } catch (e) { console.warn('임시 폴더를 지우지 못함:', workDir, e.message) }
console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
