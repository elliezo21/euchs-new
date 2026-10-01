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
      export const predictCategory = never, searchBrand = never, getCategoryMeta = never, sendProduct = never, makeSquareJpeg = never, fileToBase64 = never
      export const REP_SIZE = 1000, SEND_BODY_MAX = 4000000
      export const readSaleMode = () => '', rememberSaleMode = () => {}
      export const listCafe24Categories = never, sendCafe24Product = never, isNotReady = () => false
      export const listSmartstoreCategories = never, listSmartstoreAddresses = never, sendSmartstoreProduct = never`
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
export { default as Cafe24 } from '@/components/studio/StudioSendCafe24.vue'
export { default as Smartstore } from '@/components/studio/StudioSendSmartstore.vue'
export { SEND_CACHE_KEY } from '@/lib/studioMarketplaceRules'
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

  // ── 보내기 창 고치기 4건 (2026-09-28) — 운영 방식으로 묶은 코드를 실제로 그려 확인 ──
  const ZH = '跨境新款黑色波点发夹女士发饰'
  const val = (html, attr) => (new RegExp('<input[^>]*' + attr + '[^>]*>').exec(html)?.[0].match(/ value="([^"]*)"/)?.[1]) ?? ''
  const RAW = {
    from: '1688', offerId: '123456789012', title: { zh: ZH, ko: null }, skuTotal: 2, options: [],
    attrs: [{ name: { zh: '主要下游平台', ko: '주요 판매 플랫폼' }, value: { zh: 'x', ko: '타오바오 경동 이베이 아마존 소원' } }, { name: { zh: '产地', ko: '산지' }, value: { zh: '义乌', ko: '이우' } }],
    skus: [
      { skuId: '1', values: [{ name: { zh: '颜色', ko: null }, value: { zh: '黑色波点发夹', ko: null } }], priceCny: 3.2, stock: 10, imageUrl: '' },
      { skuId: '2', values: [{ name: { zh: '颜色', ko: null }, value: { zh: '红色条纹发夹', ko: null } }], priceCny: 3.2, stock: 10, imageUrl: '' },
    ],
  }
  const withTitle = (src, title, projectTitle) => { const p = PREPARE(true, src); p.export.title = title; p.export.projectTitle = projectTitle; return p }

  const m1 = await render(built.Modal, { open: true, prepare: PREPARE(true, SOURCE) })
  eq('1 창 폭: 화면 폭 90% · 최대 1400px (예전 max-w-2xl 아님)', [/data-modal-size="full"/.test(m1.html), m1.html.includes('w-[90vw] max-w-[1400px]'), /max-w-2xl/.test(m1.html)], [true, true, false])
  eq('1 옵션 표: 가로 스크롤 상자 없음 · 칸마다 이름표(카드형에서 보임) · 모든 칸이 그려짐', [/overflow-x-auto/.test(m1.html), ['사진', '색상', '1688 가격', '정가(원) *', '판매가(원) *', '할인', '재고 수량 *', '품번 *', 'GTIN'].filter(l => !m1.html.includes('data-label="' + l + '"')), /data-mk-s-items-mode="table"/.test(m1.html)], [false, [], true])

  const n1 = await render(built.Coupang, { prepare: withTitle(RAW, ZH, ZH) })
  eq('2 상품명: 작업 이름·가져온 제목이 모두 번역 전이면 세 칸 다 빈칸 + placeholder (예외 없음)', [n1.error, val(n1.html, 'data-mk-s-name'), val(n1.html, 'data-mk-s-general'), val(n1.html, 'data-mk-s-display'), /placeholder="상품명을 입력하세요"[^>]*data-mk-s-name/.test(n1.html)], [null, '', '', '', true])
  const n2 = await render(built.Coupang, { prepare: withTitle(RAW, ZH, '도트 헤어핀 모음') })
  const n3 = await render(built.Coupang, { prepare: withTitle({ ...RAW, title: { zh: ZH, ko: '여성 도트 헤어핀' } }, ZH, ZH) })
  eq('2 상품명: 작업의 한글 이름 · 없으면 가져온 제목의 한글', [val(n2.html, 'data-mk-s-name'), val(n3.html, 'data-mk-s-name')], ['도트 헤어핀 모음', '여성 도트 헤어핀'])
  eq('2 화면 어디에도 번역 전 제목이 값으로 들어가지 않음', [n1, n2, n3].map(r => new RegExp('value="[^"]*' + ZH).test(r.html)), [false, false, false])

  eq('3 옵션: "옵션 이름" 열 없음(자동) · 색상값 "블랙"·"레드" · 옵션 종류 이름 "색상" · 자동 이름 "블랙, 레드"', [(n1.html.match(/data-mk-s-item-name="\d+"/g) || []).length, /data-label="옵션 이름/.test(n1.html), /value="블랙"/.test(n1.html), /value="레드"/.test(n1.html), /data-label="색상"/.test(n1.html), /data-mk-s-names-auto[^>]*>옵션 이름: 블랙, 레드</.test(n1.html), /data-mk-s-names-toggle[^>]*>옵션 이름 직접 입력</.test(n1.html)], [0, false, true, true, true, true, true])
  eq('브랜드: "브랜드 없음"이 처음부터 체크 · 브랜드 입력 꺼짐 · 요약 표 "브랜드 없음" · 경고 한 줄', [/<input[^>]*data-mk-s-no-brand[^>]*checked|<input[^>]*checked[^>]*data-mk-s-no-brand/.test(n1.html), /<input[^>]*disabled[^>]*data-mk-s-brand(?![-\w])|<input[^>]*data-mk-s-brand(?![-\w])[^>]*disabled/.test(n1.html), /data-mk-s-preview-row="브랜드"[\s\S]{0,200}브랜드 없음/.test(n1.html), /data-mk-s-brand-warn/.test(n1.html)], [true, true, true, true])
  const TWO = { ...RAW, skuTotal: 4, skus: ['黑色', '白色'].flatMap((c, ci) => ['M', 'L'].map((z, zi) => ({ skuId: String(ci * 2 + zi + 1), values: [{ name: { zh: '颜色', ko: null }, value: { zh: c, ko: null } }, { name: { zh: '尺码', ko: null }, value: { zh: z, ko: null } }], priceCny: 9, stock: 1, imageUrl: '' }))) }
  const n5 = await render(built.Coupang, { prepare: PREPARE(true, TWO) })
  eq('옵션 종류 2개: 맞추기 2줄 · 표 열 2개(색상·사이즈) · 줄 4개 · 자동 이름 "블랙 / M"', [n5.error, (n5.html.match(/data-mk-s-option-map="/g) || []).length, /<th[^>]*>색상<\/th>/.test(n5.html) && /<th[^>]*>사이즈<\/th>/.test(n5.html), (n5.html.match(/data-mk-s-item="/g) || []).length, /옵션 이름: 블랙 \/ M, 블랙 \/ L, 화이트 \/ M …/.test(n5.html)], [null, 2, true, 4, true])
  eq('3 옵션: 입력 값에 번역 전 글자 없음', /value="[^"]*\p{Script=Han}/u.test(n1.html), false)
  const n4 = await render(built.Coupang, { prepare: PREPARE(true, { ...RAW, skus: [{ skuId: '1', values: [{ name: { zh: '款式', ko: null }, value: { zh: '蝴蝶发夹', ko: null } }], priceCny: 1, stock: 1, imageUrl: '' }] }) })
  eq('3 옵션: 한글로 못 옮긴 값은 빈칸 · 가져온 글자는 칸 아래와 placeholder에만', [n4.error, val(n4.html, 'data-mk-s-item-name'), /data-mk-s-origin="0:0"[^>]*>가져온 옵션: 蝴蝶发夹</.test(n4.html), /placeholder="蝴蝶发夹"/.test(n4.html)], [null, '', true, true])

  eq('4 태그 추천: 가져온 상품 속성의 말(이우·타오바오·경동·이베이·아마존·소원)이 화면에 없음', ['이우', '타오바오', '경동', '이베이', '아마존', '소원'].filter(w => n3.html.includes(w)), [])
  eq('4 태그 추천: 상품명에서 나온 말은 있음', ['헤어핀', '도트'].filter(w => !n3.html.includes(w)), [])

  // ── 쿠팡 승인반려 대응 (2026-09-28): 고쳐서 다시 보내기 · 상세 이미지 요약 · 템플릿 택배사 ──
  const FORM = {
    saleMode: 'agent', outboundDays: 10, productName: '도트 헤어핀 3종', displayName: '', generalName: '도트 헤어핀', noBrand: true, brand: '', brandId: '', manufacture: '', modelNo: '',
    categoryCode: '56137', tags: ['헤어핀', '도트'], noticeCategory: '기타 재화', notices: { 품명: '헤어핀' }, certifications: [], advanced: { taxType: 'TAX' }, optionTypes: ['색상'],
    items: [{ name: '블랙', originalPrice: 5000, salePrice: 3900, stock: 20, sku: 'HP-BK', gtin: '', attributes: { 색상: '블랙' } }, { name: '레드', originalPrice: 5000, salePrice: 3900, stock: 15, sku: 'HP-RD', gtin: '', attributes: { 색상: '레드' } }],
  }
  const RESEND = { sendId: '66666666-6666-4666-8666-666666666666', sellerProductId: '16397573540', reason: '도서산간배송 출고지에 등록된 택배사만 선택할 수 있습니다.', revision: 0, form: FORM, categoryName: '헤어핀' }
  const rp = { ...PREPARE(true, RAW), resend: RESEND }
  const r1 = await render(built.Modal, { open: true, prepare: rp })
  eq('다시 보내기 창: 예외 없음 · 제목 · 버튼 "다시 승인 요청" · 쿠팡 상품 번호와 반려 사유 안내', [r1.error, />수정 후 다시 보내기</.test(r1.html), /data-mk-s-send[^>]*>다시 승인 요청</.test(r1.html), /data-mk-s-resend-note/.test(r1.html) && r1.html.includes("16397573540") && r1.html.includes('반려 사유: 도서산간배송')], [null, true, true, true])
  const r2 = await render(built.Coupang, { prepare: rp })
  eq('다시 보내기: 그 전송의 값으로 채워짐 (이름·옵션·가격·재고·품번 · 가져온 상품 값이 아님)', [r2.error, val(r2.html, 'data-mk-s-name'), (r2.html.match(/data-mk-s-item="/g) || []).length, val(r2.html, 'data-mk-s-item-name="0"'), val(r2.html, 'data-mk-s-price="0"'), val(r2.html, 'data-mk-s-stock="1"'), val(r2.html, 'data-mk-s-sku="1"'), val(r2.html, 'data-mk-s-days')], [null, '도트 헤어핀 3종', 2, '블랙', '3900', '15', 'HP-RD', '10'])
  eq('요약 표: "상세 이미지 1장 (쿠팡 규격 맞춤)"', /data-mk-s-preview-row="상세 이미지"[\s\S]{0,200}상세 이미지 1장 \(쿠팡 규격 맞춤\)/.test(n1.html), true)
  const longP = PREPARE(true, SOURCE); longP.export.files = [{ key: '01', name: 'a_01.jpg', width: 780, height: 300 }, { key: '02', name: 'a_02.jpg', width: 780, height: 7000 }]
  eq('요약 표: 짧은 장 1 + 긴 장(2조각) = 3장', /상세 이미지 3장 \(쿠팡 규격 맞춤\)/.test((await render(built.Coupang, { prepare: longP })).html), true)
  const badT = PREPARE(true, SOURCE)
  badT.templates = [{ id: 't1', name: '기본 무료배송', is_default: true, outbound_shipping_time_day: 2, outbound_place_code: '100', delivery_company_code: 'CJGLS', remote_area_deliverable: true }]
  badT.places = [{ kind: 'outbound', place_code: '100', name: '출고지', address: { remote: [{ code: 'HANJIN' }] } }]
  const bt = await render(built.Coupang, { prepare: badT })
  const okT = { ...badT, places: [{ kind: 'outbound', place_code: '100', name: '출고지', address: { remote: [{ code: 'CJGLS' }] } }] }
  eq('템플릿의 택배사가 출고지의 도서산간 택배사와 다르면 예외 없이 그려짐 (빠짐 목록은 아래 창 테스트)', [bt.error, (await render(built.Coupang, { prepare: okT })).error], [null, null])

  // ── 2026-09-29: 판매 방식 기본값 · 태그 추천 ──
  const dm = await render(built.Coupang, { prepare: PREPARE(true, SOURCE) })
  eq('판매 방식: 기억한 값이 없으면 "국내 재고 판매"가 골라진 채 열림 · 빠짐 목록에 판매 방식 없음 · 해외구매대행은 보조 카드', [dm.error, /aria-pressed="true"[^>]*data-mk-s-mode-pick="domestic"|data-mk-s-mode-pick="domestic"[^>]*aria-pressed="true"/.test(dm.html), /aria-pressed="true"[^>]*data-mk-s-mode-pick="agent"/.test(dm.html), /<button[^>]*class="[^"]*is-sub[^"]*"[^>]*data-mk-s-mode-pick="agent"/.test(dm.html), /<button[^>]*class="[^"]*is-sub[^"]*"[^>]*data-mk-s-mode-pick="domestic"/.test(dm.html), val(dm.html, 'data-mk-s-days')], [null, true, false, true, false, '2'])

  const e = await render(built.Modal, { open: true, prepare: null })
  eq('보내기 창 (준비 데이터 없음): 예외 없음 · 보내기 버튼 꺼짐', [e.error, /<button[^>]*disabled[^>]*data-mk-s-send|<button[^>]*data-mk-s-send[^>]*disabled/.test(e.html)], [null, true])

  // ── 보내기 창 여는 속도 (2026-09-30): 창을 먼저 열고 준비 데이터는 창 안에서 ──
  eq('준비 데이터 없음 = "상품 정보 불러오는 중…" + 자리표시 · 판매처 줄·섹션 없음 · 오류 줄 없음', [/data-mk-s-loading/.test(e.html), e.html.includes('상품 정보 불러오는 중…'), /st-skeleton/.test(e.html), /data-mk-s-market="/.test(e.html), /data-mk-s-load-error/.test(e.html)], [true, true, true, false, false])
  const le = await render(built.Modal, { open: true, prepare: null, loadError: '잠시 후 다시 시도해 주세요.' })
  eq('준비 데이터를 못 받음 = 이유 + [다시 시도] · 불러오는 중 표시 없음 · 보내기 버튼 꺼짐', [le.error, /data-mk-s-load-error[\s\S]*잠시 후 다시 시도해 주세요\.[\s\S]*data-mk-s-load-retry/.test(le.html), /data-mk-s-loading/.test(le.html), /<button[^>]*disabled[^>]*data-mk-s-send|<button[^>]*data-mk-s-send[^>]*disabled/.test(le.html)], [null, true, false, true])
  const withData = await render(built.Modal, { open: true, prepare: PREPARE(true), loadError: '' })
  eq('준비 데이터가 있으면 불러오는 중·오류 표시 없음', [withData.error, /data-mk-s-loading|data-mk-s-load-error/.test(withData.html)], [null, false])
  const { provide: vueProvide } = await import('vue')
  const cache = { cafe24CategoriesDone: { categories: [{ no: 25, depth: 2, parentNo: 24, name: '상의', fullName: '의류 > 상의' }] } }
  const c24 = await render({ setup: () => { vueProvide(built.SEND_CACHE_KEY, cache); return () => h(built.Cafe24, { prepare: PREPARE(true) }) } }, {})
  eq('카페24 섹션: 창의 목록(sendCache)을 받아 운영 방식 빌드에서 예외 없이 그려짐', [c24.error, /data-mk-c24-name/.test(c24.html)], [null, true])
  // 스마트스토어 섹션 (2026-10-01) — 카테고리·주소록을 창의 목록(sendCache)에서 받아 그린다
  const ssCache = { smartstoreCategoriesDone: { categories: [{ id: '50000999', name: '머그컵', wholeName: '생활/건강>주방용품>잔/컵>머그컵' }] }, smartstoreAddressesDone: { addresses: [{ id: 102, name: '물류창고', type: 'RELEASE', address: '광주 북구 1층', phone: '' }, { id: 103, name: '반품센터', type: 'REFUND_OR_EXCHANGE', address: '광주 북구 2층', phone: '' }], defaults: { shipping: 102, return: 103 } } }
  const ss = await render({ setup: () => { vueProvide(built.SEND_CACHE_KEY, ssCache); return () => h(built.Smartstore, { prepare: PREPARE(true) }) } }, {})
  const checked = (html, attr) => new RegExp('<input[^>]*' + attr + '[^>]*checked|<input[^>]*checked[^>]*' + attr).test(html)
  eq('스마트스토어 섹션: 운영 방식 빌드에서 예외 없이 그려짐 · 상품명 한글 기본값 · 카테고리 목록 · 기본 출고지·반품지 골라짐 · 판매 상태 전시중지 체크', [ss.error, val(ss.html, 'data-mk-ss-name'), (ss.html.includes('생활/건강&gt;주방용품&gt;잔/컵&gt;머그컵') || ss.html.includes('생활/건강>주방용품>잔/컵>머그컵')), /data-mk-ss-shipping[^>]*>(?:(?!<\/select>)[\s\S])*<option[^>]*value="102"[^>]*selected/.test(ss.html), /data-mk-ss-return[^>]*>(?:(?!<\/select>)[\s\S])*<option[^>]*value="103"[^>]*selected/.test(ss.html), checked(ss.html, 'data-mk-ss-display-off'), checked(ss.html, 'data-mk-ss-display-on')], [null, '매일 쓰는 머그', true, true, true, true, false])
  eq('스마트스토어 섹션: 요약 표 판매상태 판매중·전시상태 전시중지 · 가격·재고는 빈칸(임의 숫자 없음)', [/data-mk-ss-preview-row="판매상태"[\s\S]{0,200}판매중/.test(ss.html), /data-mk-ss-preview-row="전시상태"[\s\S]{0,200}전시중지/.test(ss.html), val(ss.html, 'data-mk-ss-price'), val(ss.html, 'data-mk-ss-stock')], [true, true, '', ''])
}

try { fs.rmSync(workDir, { recursive: true, force: true }) } catch (e) { console.warn('임시 폴더를 지우지 못함:', workDir, e.message) }
console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
