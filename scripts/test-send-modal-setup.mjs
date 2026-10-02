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
const LT_STUB = '\0studio-listing-templates-stub' // 등록 템플릿(DB) — 목록은 sendCache로 넣는다
const stubPlugin = {
  name: 'send-modal-test',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@/lib/studioMarketplace') return API_STUB
    if (id === '@/lib/studioListingTemplates') return LT_STUB
    return null
  },
  load(id) {
    if (id === LT_STUB) return `
      const never = () => Promise.reject(new Error('테스트에서는 DB를 부르지 않는다'))
      export const listListingTemplates = never, createListingTemplate = never, updateListingTemplate = never, setDefaultListingTemplate = never, deleteListingTemplate = never
      export const isListingSchemaMissing = () => false`
    if (id === API_STUB) return `
      const never = () => Promise.reject(new Error('테스트에서는 서버를 부르지 않는다'))
      export const predictCategory = never, searchBrand = never, getCategoryMeta = never, sendProduct = never, makeSquareJpeg = never, fileToBase64 = never
      export const REP_SIZE = 1000, SEND_BODY_MAX = 4000000
      export const readSaleMode = () => '', rememberSaleMode = () => {}
      export const listCafe24Categories = never, sendCafe24Product = never, isNotReady = () => false
      export const listSmartstoreCategories = never, listSmartstoreAddresses = never, sendSmartstoreProduct = never
      export const listElevenstCategories = never, listElevenstAddresses = never, sendElevenstProduct = never
      export const getZigzagMeta = never, sendZigzagProduct = never
      export const SEND_STATUS_LABEL = { sending: '전송 중', approval_pending: '승인 대기', approved: '승인 완료', registered: '등록 완료', rejected: '반려', failed: '실패' }`
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
export { default as Elevenst } from '@/components/studio/StudioSendElevenst.vue'
export { default as Common } from '@/components/studio/StudioSendCommon.vue'
export { commonFromPrepare } from '@/lib/studioSendCommon'
export { SEND_CACHE_KEY } from '@/lib/studioMarketplaceRules'
export { userRole } from '@/lib/auth'
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
  eq('보내기 창(고객): 판매처 8줄(카페24 없음) + 쿠팡 섹션이 그려짐 · 화면 글자에 카페24 없음', [(c.html.match(/data-mk-s-market="/g) || []).length, /data-mk-send-coupang/.test(c.html), /data-mk-s-mode-pick/.test(c.html), /data-mk-s-market="cafe24"|카페24/.test(c.html)], [8, true, true, false])
  eq('보내기 창: 열 때는 결과 표 없음 (2026-10-01 결과 표는 2곳 이상 보낸 뒤에만)', /data-mk-s-results/.test(c.html), false)
  // 이미 보냄 (2026-10-01) — sent를 넘기면 그 판매처 줄에 배지 · 안 넘기면(예전) 배지 없음 · 다시 보내기 창은 안 씀
  const sentHtml = await render(built.Modal, { open: true, prepare: PREPARE(true, SOURCE), sent: [{ market: 'coupang', status: 'approval_pending', sellerProductId: '777' }] })
  eq('이미 전송됨: 쿠팡 줄에 상태만 "승인 대기" 배지 (2026-10-02 업무용어) · 예외 없음 · sent 없으면 배지 없음', [sentHtml.error, /data-mk-s-market-sent="coupang"[^>]*>승인 대기</.test(sentHtml.html), /data-mk-s-market-sent/.test(c.html)], [null, true, false])
  const regHtml = await render(built.Modal, { open: true, prepare: PREPARE(true, SOURCE), sent: [{ market: 'coupang', status: 'registered' }] })
  eq('이미 전송됨: 등록 완료 기록 = "등록 완료" 배지', /data-mk-s-market-sent="coupang"[^>]*>등록 완료</.test(regHtml.html), true)
  const failedSent = await render(built.Modal, { open: true, prepare: PREPARE(true, SOURCE), sent: [{ market: 'coupang', status: 'rejected' }] })
  eq('이미 보냄: 반려된 기록은 배지 없음', /data-mk-s-market-sent/.test(failedSent.html), false)
  built.userRole.value = 'staff'
  const cAdmin = await render(built.Modal, { open: true, prepare: PREPARE(true, SOURCE) })
  built.userRole.value = 'user'
  eq('보내기 창(관리자·스태프): 판매처 8줄 · 카페24 줄 없음 (2026-10-02 운영 중단 — MARKETS off)', [cAdmin.error, (cAdmin.html.match(/data-mk-s-market="/g) || []).length, /data-mk-s-market="cafe24"/.test(cAdmin.html)], [null, 8, false])

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
  eq('스마트스토어 섹션: 국내 출고지면 관부가세 칸·요약 줄 없음', [/data-mk-ss-customs/.test(ss.html), /data-mk-ss-preview-row="관부가세"/.test(ss.html)], [false, false])
  // 옵션(조합형, 2026-10-01) — 가져온 상품에 옵션이 있으면 옵션 영역 · 없으면 예전 그대로 단일상품
  const sso = await render({ setup: () => { vueProvide(built.SEND_CACHE_KEY, ssCache); return () => h(built.Smartstore, { prepare: PREPARE(true, SOURCE) }) } }, {})
  eq('스마트스토어 섹션(옵션 있는 상품): 예외 없이 그려짐 · 옵션 영역 · 옵션 사용 체크 · 줄 수 = 가져온 옵션 수 · 재고 칸 대신 합계 · 옵션 재고 빈칸 · 추가금액 0 · 값 = 한글', [
    sso.error, /data-mk-opt-table/.test(sso.html), checked(sso.html, 'data-mk-opt-enabled'), (sso.html.match(/data-mk-opt-row="/g) || []).length, /data-mk-ss-stock-total/.test(sso.html), /data-mk-ss-stock /.test(sso.html), val(sso.html, 'data-mk-opt-stock="0"'), val(sso.html, 'data-mk-opt-price="0"'), /data-mk-opt-value="0-0"[^>]*>블랙</.test(sso.html),
  ], [null, true, true, SOURCE.skus.length, true, false, '', '0', true])
  // 옵션 편집 (2026-10-02) — 옵션 종류 줄·값 칩·조합 목록 도구
  eq('옵션 편집 화면: 종류 줄 1개(이름 "색상") · 값 칩 블랙·화이트 · [옵션 종류 추가]·[추가]·[삭제] · 옵션 목록 (총 2개) · [선택 삭제]·[추가금액 일괄입력]·[재고 일괄입력] · 되살리기는 지운 뒤에만 · 가져온 옵션 원문', [
    (sso.html.match(/data-mk-opt-group-row="/g) || []).length, val(sso.html, 'data-mk-opt-group="0"'), (sso.html.match(/data-mk-opt-chip="/g) || []).length, /data-mk-opt-chip="블랙"/.test(sso.html) && /data-mk-opt-chip="화이트"/.test(sso.html),
    /data-mk-opt-group-add[^>]*>옵션 종류 추가</.test(sso.html), /data-mk-opt-value-add="0"[^>]*>추가</.test(sso.html), /data-mk-opt-group-remove="0"[^>]*>삭제</.test(sso.html),
    /data-mk-opt-total[^>]*>옵션 목록 \(총 2개\)</.test(sso.html), /data-mk-opt-delete[^>]*>선택 삭제</.test(sso.html), /data-mk-opt-bulk-price-apply[^>]*>추가금액 일괄입력</.test(sso.html), /data-mk-opt-bulk-stock-apply[^>]*>재고 일괄입력</.test(sso.html), /data-mk-opt-restore/.test(sso.html), /가져온 옵션: 黑色/.test(sso.html),
  ], [1, '색상', 2, true, true, true, true, true, true, true, true, false, true])
  eq('스마트스토어 섹션(옵션 없는 상품): 옵션 영역은 "옵션 사용" 꺼진 채(직접 켜서 종류·값 추가) · 옵션 표 없음 · 단일 재고 칸 · 요약 표 옵션 "없음 (단일상품)"', [/data-mk-opt-enabled/.test(ss.html), checked(ss.html, 'data-mk-opt-enabled'), /data-mk-opt-off/.test(ss.html), /data-mk-opt-table/.test(ss.html), /data-mk-ss-stock-total/.test(ss.html), /data-mk-ss-preview-row="옵션"[\s\S]{0,200}없음 \(단일상품\)/.test(ss.html)], [true, false, true, false, false, true])
  // 출고지·반품지 기본값 = 국내 주소 우선 (2026-10-01 운영 1차: 주소록 첫 번째 해외(항주)가 기본으로 잡혀 관부가세 400)
  const HZ = { id: 104, name: '항주 창고', type: 'RELEASE', address: '항주 1층', phone: '', overseas: true }
  const GJ = { id: 102, name: '광주 창고', type: 'RELEASE', address: '광주 북구 1층', phone: '', overseas: false }
  const RT = { id: 103, name: '반품센터', type: 'REFUND_OR_EXCHANGE', address: '광주 북구 2층', phone: '', overseas: false }
  const BIZ = { id: 101, name: '본사', type: 'REPRESENTATIVE', address: '광주 북구 3층', phone: '', overseas: false }
  const HZR = { id: 105, name: '항주 반품', type: 'REFUND_OR_EXCHANGE', address: '항주 2층', phone: '', overseas: true }
  const withAddr = (addresses, defaults) => ({ ...ssCache, smartstoreAddressesDone: { addresses, defaults } })
  const renderAddr = cache => render({ setup: () => { vueProvide(built.SEND_CACHE_KEY, cache); return () => h(built.Smartstore, { prepare: PREPARE(true) }) } }, {})
  const sel = (html, attr, id) => new RegExp(attr + '[^>]*>(?:(?!<\\/select>)[\\s\\S])*<option[^>]*value="' + id + '"[^>]*selected').test(html)
  // 운영과 같은 순서(해외 첫 번째) + 서버 기본값이 해외를 가리켜도 화면은 국내를 고른다
  const a1 = await renderAddr(withAddr([HZ, HZR, GJ, RT], { shipping: 104, return: 105 }))
  eq('기본값: 해외가 목록 첫 번째여도 국내 출고지(102)·국내 반품지(103) · 해외 주소는 목록에 그대로 · 관부가세 칸 없음', [a1.error, sel(a1.html, 'data-mk-ss-shipping', 102), sel(a1.html, 'data-mk-ss-return', 103), a1.html.includes('항주 창고 (출고지) · 해외'), /data-mk-ss-customs/.test(a1.html)], [null, true, true, true, false])
  const a2 = await renderAddr(withAddr([HZ, BIZ, RT], { shipping: 104, return: 103 }))
  eq('기본값: 국내 출고지 용도 주소가 없으면 국내 첫 번째(본사 101) · 반품지는 국내 반품/교환지(103)', [sel(a2.html, 'data-mk-ss-shipping', 101), sel(a2.html, 'data-mk-ss-return', 103), /data-mk-ss-customs/.test(a2.html)], [true, true, false])
  const a3 = await renderAddr(withAddr([HZ, GJ, BIZ], { shipping: 104, return: null }))
  eq('기본값: 국내 반품/교환지가 없으면 출고지 용도가 아닌 국내 주소(본사 101) — 반품지 자리에 출고지(102)를 먼저 넣지 않음 (2026-10-01 출고지≠반품지)', [sel(a3.html, 'data-mk-ss-shipping', 102), sel(a3.html, 'data-mk-ss-return', 101)], [true, true])
  const a3b = await renderAddr(withAddr([HZ, GJ], { shipping: 104, return: null }))
  eq('기본값: 국내가 출고지 하나뿐이면 반품지도 그것(102 — 예전 동작 그대로)', sel(a3b.html, 'data-mk-ss-return', 102), true)
  // 출고지≠반품지 판매자 (2026-10-01 운영: 이니드 주소록 — 출고지 기본이 "반품교환지"로 잡힘). 유형 값은 문서 enum
  const E = (id, name, type, overseas = false) => ({ id, name, type, address: `${name} 주소`, phone: '', overseas })
  const ER = E(201, '반품교환지', 'REFUND_OR_EXCHANGE'), EG = E(202, '상품출고지', 'GENERAL'), ELR = E(203, '물류센터 출고지', 'LOGISTICS_CENTER_RELEASE'), ELF = E(204, '물류센터 반품', 'LOGISTICS_CENTER_REFUND_OR_EXCHANGE'), EH = E(205, '항주', 'RELEASE', true)
  const e1 = await renderAddr(withAddr([ER, EG, EH], {}))
  eq('출고지≠반품지: 반품교환지가 목록 첫째여도 출고지 = 일반(202) · 반품지 = 반품/교환지(201) · 서로 다름', [e1.error, sel(e1.html, 'data-mk-ss-shipping', 202), sel(e1.html, 'data-mk-ss-return', 201)], [null, true, true])
  const e2 = await renderAddr(withAddr([ER, EG, ELR, ELF, EH], {}))
  eq('이니드 주소록이면 출고지 기본값 = 상품출고지(일반 202) — 물류센터 출고지(203)는 맨 뒤 · 반품지 = 반품교환지(201)', [sel(e2.html, 'data-mk-ss-shipping', 202), sel(e2.html, 'data-mk-ss-return', 201)], [true, true])
  const e2b = await renderAddr(withAddr([ER, ELR, ELF, EH], {}))
  eq('용도 미지정 주소가 없으면 물류센터: 출고지 203 · 반품지는 반품/교환지 201', [sel(e2b.html, 'data-mk-ss-shipping', 203), sel(e2b.html, 'data-mk-ss-return', 201)], [true, true])
  eq('주소록 관리(스마트스토어센터 새 탭)·주소록 새로고침 버튼 · 쿠팡과 같은 st-btn', [/<a[^>]*href="https:\/\/sell\.smartstore\.naver\.com\/"[^>]*target="_blank"[^>]*data-mk-ss-addr-manage[^>]*>주소록 관리<\/a>/.test(e2.html), /<button[^>]*class="st-btn"[^>]*data-mk-ss-addr-refresh[^>]*>주소록 새로고침<\/button>/.test(e2.html)], [true, true])
  const e3 = await renderAddr({ ...ssCache, smartstoreAddressesDone: { addresses: [ER, EG, ELR, ELF, EH], last: { shipping: 202, return: 204 } } })
  eq('마지막에 보낸 주소(last)가 목록에 있으면 그것 — 출고지 202·반품지 204 각각', [sel(e3.html, 'data-mk-ss-shipping', 202), sel(e3.html, 'data-mk-ss-return', 204)], [true, true])
  const e4 = await renderAddr({ ...ssCache, smartstoreAddressesDone: { addresses: [ER, EG, EH], last: { shipping: 999, return: 204 } } })
  eq('마지막 주소가 지금 주소록에 없으면 기본 규칙 (202 · 201)', [sel(e4.html, 'data-mk-ss-shipping', 202), sel(e4.html, 'data-mk-ss-return', 201)], [true, true])
  // 국내 주소가 하나도 없을 때만 첫 번째(해외) → 관부가세 칸이 보이고 선택 전(기본값 없음)
  const ovCache = withAddr([HZ, HZR], { shipping: 104, return: 105 })
  const ov = await renderAddr(ovCache)
  eq('국내 주소가 없을 때만 목록 첫 번째(해외 104) — 출고지·반품지 둘 다', [sel(ov.html, 'data-mk-ss-shipping', 104), sel(ov.html, 'data-mk-ss-return', 104)], [true, true])
  eq('스마트스토어 섹션: 해외 출고지면 관부가세 칸(필수 · 3개 + 선택 안 함) · 출고지 이름에 "해외" · 요약 줄 미입력', [ov.error, /data-mk-ss-customs-box/.test(ov.html), (ov.html.match(/<option[^>]*value="(NOT_APPLICABLE|INCLUDED|EXCLUDED)"/g) || []).length, /data-mk-ss-customs[^-][\s\S]{0,200}<option value=""[^>]*selected/.test(ov.html) || /<option value="" selected[^>]*>관부가세 선택/.test(ov.html), ov.html.includes('항주 창고 (출고지) · 해외'), /data-mk-ss-preview-row="관부가세"[\s\S]{0,200}미입력/.test(ov.html)], [null, true, 3, true, true, true])

  // ── 등록 템플릿 (2026-10-01) — 11번가와 같은 공용 템플릿. 템플릿을 안 쓰면 칸·요약이 예전과 같아야 한다 ──
  const renderLt = list => render({ setup: () => { vueProvide(built.SEND_CACHE_KEY, { ...ssCache, listingTemplatesDone: { ready: true, templates: list } }); return () => h(built.Smartstore, { prepare: PREPARE(true) }) } }, {})
  const selSs = (html, attr, id) => new RegExp(attr + '[^>]*>(?:(?!<\\/select>)[\\s\\S])*<option[^>]*value="' + id + '"[^>]*selected').test(html)
  const afterLt = html => html.slice(html.indexOf('data-mk-ss-name')) // 템플릿 칸 아래 = 상품명부터 끝까지 (칸·요약 표 전부)
  const SP1 = { id: 'sp1', kind: 'product', name: '중국산', is_default: true, data: { origin: { type: 'overseas', place: '베트남' }, maker: '(주)이유씨 수입', country: '베트남', brand: '이유홈', asContact: '02-000-0000', asGuide: 'A/S 안내 문구', returnGuide: '반품 안내', kc: {}, notice: { type: '기타 재화', items: {} } } }
  const SP2 = { id: 'sp2', kind: 'product', name: '국내', is_default: false, data: { origin: { type: 'domestic', place: '서울' }, maker: '이유씨' } }
  const SS1 = { id: 'ss1', kind: 'shipping', name: '조건부', is_default: true, data: { feeType: 'conditional', fee: 3000, freeOver: 30000, jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000 } }
  const SS2 = { id: 'ss2', kind: 'shipping', name: '무료', is_default: false, data: { feeType: 'free', returnFee: 4000 } }
  const SS3 = { id: 'ss3', kind: 'shipping', name: '고정', is_default: true, data: { feeType: 'fixed', fee: 3000, returnFee: 3500, exchangeFee: 7000 } }
  eq('스마트스토어 등록 템플릿: 목록이 없으면(표 없음 — SQL 전) 템플릿 칸을 그리지 않음', /data-mk-ss-templates/.test(ss.html), false)
  const lt0 = await renderLt([SP2, SS2])
  eq('스마트스토어 등록 템플릿: 기본 템플릿이 없으면 아무것도 고르지 않음 · 칸·요약 표 HTML이 템플릿 없을 때와 글자 하나까지 같음(예전 그대로)', [lt0.error, /data-mk-ss-templates/.test(lt0.html), selSs(lt0.html, 'data-mk-ss-lt="product"', ''), selSs(lt0.html, 'data-mk-ss-lt="shipping"', ''), afterLt(lt0.html) === afterLt(ss.html)], [null, true, true, true, true])
  eq('스마트스토어 처음 값(템플릿 없음): 무료 · 반품·교환 빈칸 · A/S 전화 빈칸 · A/S 안내 "상세페이지 참조" · 원산지 상세설명 · 제조자 빈칸', [checked(ss.html, 'data-mk-ss-fee-free'), val(ss.html, 'data-mk-ss-return-fee'), val(ss.html, 'data-mk-ss-exchange-fee'), val(ss.html, 'data-mk-ss-as-phone'), val(ss.html, 'data-mk-ss-as-guide'), checked(ss.html, 'data-mk-ss-origin-detail'), val(ss.html, 'data-mk-ss-manufacturer')], [true, '', '', '', '상세페이지 참조', true, ''])
  const lt1 = await renderLt([SP2, SP1, SS2, SS3])
  eq('스마트스토어 등록 템플릿 적용(기본 자동 선택): 제조자·A/S 전화·A/S 안내 · 원산지 해외 → 직접 입력 "베트남" · 고정 배송비 → 유료 3,000 · 반품 3,500·교환 7,000 · 요약 표', [
    lt1.error, selSs(lt1.html, 'data-mk-ss-lt="product"', 'sp1'), selSs(lt1.html, 'data-mk-ss-lt="shipping"', 'ss3'), val(lt1.html, 'data-mk-ss-manufacturer'), val(lt1.html, 'data-mk-ss-as-phone'), val(lt1.html, 'data-mk-ss-as-guide'),
    checked(lt1.html, 'data-mk-ss-origin-direct'), val(lt1.html, 'data-mk-ss-origin-content'), checked(lt1.html, 'data-mk-ss-fee-paid'), val(lt1.html, 'data-mk-ss-base-fee'), val(lt1.html, 'data-mk-ss-return-fee'), val(lt1.html, 'data-mk-ss-exchange-fee'),
    /data-mk-ss-preview-row="배송비"[\s\S]{0,200}3,000원 \(선결제\)/.test(lt1.html), /data-mk-ss-lt-note/.test(lt1.html),
  ], [null, true, true, '(주)이유씨 수입', '02-000-0000', 'A/S 안내 문구', true, '베트남', true, '3000', '3500', '7000', true, false])
  eq('스마트스토어 등록 템플릿: 출고지·반품지·택배사는 템플릿과 상관없이 예전 규칙(102·103·CJ대한통운)', [selSs(lt1.html, 'data-mk-ss-shipping', 102), selSs(lt1.html, 'data-mk-ss-return', 103), selSs(lt1.html, 'data-mk-ss-company', 'CJGLS')], [true, true, true])
  const lt2 = await renderLt([SP1, SS1])
  eq('스마트스토어 등록 템플릿 — 조건부 무료: [조건부 무료] 체크 · 기본 3,000 · 30,000원 이상 무료 · 안내 줄 없음 · 요약 표 · 반품·교환 · 제주·도서산간 칸 없음', [
    lt2.error, checked(lt2.html, 'data-mk-ss-fee-cond'), checked(lt2.html, 'data-mk-ss-fee-free'), checked(lt2.html, 'data-mk-ss-fee-paid'), val(lt2.html, 'data-mk-ss-base-fee'), val(lt2.html, 'data-mk-ss-free-over'), /data-mk-ss-lt-note/.test(lt2.html),
    /data-mk-ss-preview-row="배송비"[\s\S]{0,200}3,000원 · 30,000원 이상 무료 \(선결제\)/.test(lt2.html), val(lt2.html, 'data-mk-ss-return-fee'), val(lt2.html, 'data-mk-ss-exchange-fee'), /data-mk-ss-jeju|data-mk-ss-island/.test(lt2.html),
  ], [null, true, false, false, '3000', '30000', false, true, '3000', '6000', false])
  eq('스마트스토어 처음 값: 배송비 무료 · 기준 금액 칸 없음(조건부 무료일 때만)', [checked(ss.html, 'data-mk-ss-fee-free'), checked(ss.html, 'data-mk-ss-fee-cond'), /data-mk-ss-free-over/.test(ss.html)], [true, false, false])
  const lt3 = await renderLt([{ ...SP2, is_default: true }, { ...SS2, is_default: true }])
  eq('스마트스토어 등록 템플릿: 국내 원산지는 안 덮음(상세설명 그대로) · 무료 → 무료 · 반품 4,000 · 교환은 처음 값(빈칸)', [lt3.error, checked(lt3.html, 'data-mk-ss-origin-detail'), val(lt3.html, 'data-mk-ss-manufacturer'), checked(lt3.html, 'data-mk-ss-fee-free'), val(lt3.html, 'data-mk-ss-return-fee'), val(lt3.html, 'data-mk-ss-exchange-fee')], [null, true, '이유씨', true, '4000', ''])
  const lt4 = await renderLt([{ ...SP1, data: { ...SP1.data, asGuide: '가'.repeat(301) } }])
  eq('스마트스토어 등록 템플릿: A/S 안내가 300자를 넘으면 안 덮고(자르지 않음) 안내 한 줄', [val(lt4.html, 'data-mk-ss-as-guide'), /data-mk-ss-lt-note="product"[^>]*>[^<]*300자/.test(lt4.html)], ['상세페이지 참조', true])
  const lt5 = await renderLt([])
  eq('스마트스토어: 템플릿이 하나도 없으면 [기본 설정] 안내 한 줄 · 저장 버튼 2개(상품정보·배송)', [/data-mk-ss-lt-empty/.test(lt5.html), (lt5.html.match(/data-mk-ss-lt-save="/g) || []).length], [true, 2])
}

if (built?.Elevenst) {
  // 11번가 섹션 (2026-10-01) — 카테고리·주소록을 창의 목록(sendCache)에서 받아 그린다
  const { provide: vueProvide2 } = await import('vue')
  const A = (id, name) => ({ id, name, address: name + ' 주소', phone: '', receiver: '' })
  const cache11 = last => ({ elevenstCategoriesDone: { categories: [{ id: '1017898', name: '머그컵', wholeName: '주방용품>컵>머그컵' }] }, elevenstAddressesDone: { outAddresses: [A('11', '3PL 창고'), A('12', '사무실 출고')], inAddresses: [A('21', '반품센터'), A('22', '창고 반품')], last } })
  const render11 = cache => render({ setup: () => { vueProvide2(built.SEND_CACHE_KEY, cache); return () => h(built.Elevenst, { prepare: PREPARE(true) }) } }, {})
  const sel11 = (html, attr, id) => new RegExp(attr + '[^>]*>(?:(?!<\\/select>)[\\s\\S])*<option[^>]*value="' + id + '"[^>]*selected').test(html)
  const a = await render11(cache11({ out: null, in: null }))
  eq('11번가 섹션: 운영 방식 빌드에서 예외 없이 그려짐 · 상품명 한글 기본값 · 보낸 적 없으면 출고지·반품지 = 목록 첫째', [a.error, /data-mk-11st-name[^>]*value="매일 쓰는 머그"|value="매일 쓰는 머그"[^>]*data-mk-11st-name/.test(a.html), sel11(a.html, 'data-mk-11st-out', '11'), sel11(a.html, 'data-mk-11st-in', '21')], [null, true, true, true])
  const b = await render11(cache11({ out: '12', in: '22' }))
  eq('11번가 섹션: 마지막에 보낸 주소(12·22)가 목록에 있으면 그것', [sel11(b.html, 'data-mk-11st-out', '12'), sel11(b.html, 'data-mk-11st-in', '22')], [true, true])
  // 옵션(싱글옵션, 2026-10-01) — 가져온 상품에 옵션이 있으면 옵션 영역 · 없으면 예전 그대로
  const o11 = await render({ setup: () => { vueProvide2(built.SEND_CACHE_KEY, cache11({ out: null, in: null })); return () => h(built.Elevenst, { prepare: PREPARE(true, SOURCE) }) } }, {})
  const inVal = (html, attr) => (new RegExp('<input[^>]*' + attr + '[^>]*>').exec(html)?.[0].match(/ value="([^"]*)"/)?.[1]) ?? ''
  eq('11번가 섹션(옵션 있는 상품): 예외 없이 그려짐 · 옵션 영역 · 줄 수 = 가져온 옵션 수 · 재고 칸 대신 합계 · 0원 옵션 안내 · 옵션 재고 빈칸 · 추가금액 0', [
    o11.error, /data-mk-opt-table/.test(o11.html), (o11.html.match(/data-mk-opt-row="/g) || []).length, /data-mk-11st-stock-total/.test(o11.html), /data-mk-11st-stock /.test(o11.html), /data-mk-opt-note[^>]*>[^<]*0원인 옵션이 1개 이상/.test(o11.html), inVal(o11.html, 'data-mk-opt-stock="0"'), inVal(o11.html, 'data-mk-opt-price="0"'),
  ], [null, true, SOURCE.skus.length, true, false, true, '', '0'])
  eq('11번가 섹션(옵션 없는 상품): 옵션 영역은 "옵션 사용" 꺼진 채 · 옵션 표 없음 · 단일 재고 칸 · 요약 표 옵션 "없음 (단일상품)"', [/data-mk-opt-off/.test(a.html), /data-mk-opt-table/.test(a.html), /data-mk-11st-stock /.test(a.html), /data-mk-11st-preview-row="옵션"[\s\S]{0,200}없음 \(단일상품\)/.test(a.html)], [true, false, true, true])
  eq('11번가 섹션(옵션 있는 상품): 같은 옵션 편집 화면(종류 줄·칩·옵션 목록 도구)', [(o11.html.match(/data-mk-opt-group-row="/g) || []).length, (o11.html.match(/data-mk-opt-chip="/g) || []).length, /data-mk-opt-total[^>]*>옵션 목록 \(총 2개\)</.test(o11.html), /data-mk-opt-bulk-stock-apply/.test(o11.html)], [1, 2, true, true])
  eq('11번가 섹션: KC 기본값 없음(네 그룹 모두 "선택" · 인증번호 칸 없음) · 원산지 기본 해외·중국(1287) · 고시 기본 기타 재화 · 금액 칸 빈칸 · 관리자 아니면 테스트 판매중지 없음', [
    ['01', '02', '03', '04'].every(g => sel11(a.html, 'data-mk-11st-kc-group="' + g + '"', '')), /data-mk-11st-kc-key/.test(a.html), sel11(a.html, 'data-mk-11st-origin-kind', '02'), sel11(a.html, 'data-mk-11st-origin-code', '1287'),
    sel11(a.html, 'data-mk-11st-notice-type', '891045'), /data-mk-11st-price[^>]*value="\d/.test(a.html), /data-mk-11st-teststop/.test(a.html),
  ], [true, false, true, true, true, false, false])
  built.userRole.value = 'staff'
  const c = await render11(cache11({ out: null, in: null }))
  built.userRole.value = 'user'
  eq('11번가 섹션(관리자·스태프): 테스트 판매중지 칸 보임', [c.error, /data-mk-11st-teststop/.test(c.html)], [null, true])

  // ── 공통 정보 (2026-10-01) — 스마트스토어·11번가를 함께 보낼 때 창이 common을 넘긴다. 안 넘기면 예전 그대로 ──
  const val = (html, attr) => (new RegExp('<input[^>]*' + attr + '[^>]*>').exec(html)?.[0].match(/ value="([^"]*)"/)?.[1]) ?? ''
  const ssCacheC = { smartstoreCategoriesDone: { categories: [] }, smartstoreAddressesDone: { addresses: [] } }
  const COMMON = () => { const c = built.commonFromPrepare(PREPARE(true, SOURCE)); c.productName = '공통 머그'; c.price = 12900; c.repImageId = 'img1'; c.fit = 'cover'; c.opts.rows[0].stock = 7; c.opts.rows[1].stock = 3; c.opts.rows[1].addPrice = 1000; return c }
  const withC = (comp, cache, common) => render({ setup: () => { vueProvide2(built.SEND_CACHE_KEY, cache); return () => h(comp, { prepare: PREPARE(true, SOURCE), common }) } }, {})
  const hidden = (html, attr) => new RegExp('<(label|div)[^>]*style="display:none;?"[^>]*>(?:(?!</(label|div)>)[\\s\\S])*' + attr).test(html)
  const ssNo = await withC(built.Smartstore, ssCacheC, null), ssYes = await withC(built.Smartstore, ssCacheC, COMMON())
  eq('스마트스토어 섹션(common 없음): 예전 그대로 — 공통 안내 없음 · 가려진 칸 없음', [ssNo.error, /data-mk-ss-common/.test(ssNo.html), /display:none/.test(ssNo.html)], [null, false, false])
  eq('스마트스토어 섹션(common 있음): 안내 + [이 판매처만 다르게] 4개 · 칸에 공통 값(이름·판매가·옵션 재고·추가금액) · 상품명·판매가·옵션·대표 이미지 칸은 가려짐 · 카테고리·배송은 보임', [
    ssYes.error, /data-mk-ss-common/.test(ssYes.html), (ssYes.html.match(/data-mk-ss-own="/g) || []).length, val(ssYes.html, 'data-mk-ss-name'), val(ssYes.html, 'data-mk-ss-price'), val(ssYes.html, 'data-mk-opt-stock="0"'), val(ssYes.html, 'data-mk-opt-price="1"'),
    hidden(ssYes.html, 'data-mk-ss-name'), hidden(ssYes.html, 'data-mk-ss-price'), hidden(ssYes.html, 'data-mk-ss-images'), /<div[^>]*style="display:none;?"[^>]*data-mk-ss-options|data-mk-ss-options[^>]*style="display:none/.test(ssYes.html), hidden(ssYes.html, 'data-mk-ss-category-box'),
    /data-mk-ss-preview-row="판매가"[\s\S]{0,200}12,900원/.test(ssYes.html), /data-mk-ss-preview-row="재고 수량"[\s\S]{0,200}10개 \(옵션 재고 합계\)/.test(ssYes.html),
  ], [null, true, 4, '공통 머그', '12900', '7', '1000', true, true, true, true, false, true, true])
  const cache11C = { elevenstCategoriesDone: { categories: [] }, elevenstAddressesDone: { outAddresses: [], inAddresses: [] } }
  const e11No = await withC(built.Elevenst, cache11C, null), e11Yes = await withC(built.Elevenst, cache11C, COMMON())
  eq('11번가 섹션(common 없음): 예전 그대로 — 공통 안내 없음 · 가려진 칸 없음', [e11No.error, /data-mk-11st-common/.test(e11No.html), /display:none/.test(e11No.html)], [null, false, false])
  eq('11번가 섹션(common 있음): 안내 + 4개 · 칸에 공통 값(price 칸) · 상품명·판매가·대표 이미지 가려짐 · 브랜드는 보임 · 요약 표 판매가', [
    e11Yes.error, /data-mk-11st-common/.test(e11Yes.html), (e11Yes.html.match(/data-mk-11st-own="/g) || []).length, val(e11Yes.html, 'data-mk-11st-name'), val(e11Yes.html, 'data-mk-11st-price'), val(e11Yes.html, 'data-mk-opt-price="1"'),
    hidden(e11Yes.html, 'data-mk-11st-name'), hidden(e11Yes.html, 'data-mk-11st-price'), hidden(e11Yes.html, 'data-mk-11st-images'), hidden(e11Yes.html, 'data-mk-11st-brand'), /data-mk-11st-preview-row="판매가"[\s\S]{0,200}12,900원/.test(e11Yes.html),
  ], [null, true, 4, '공통 머그', '12900', '1000', true, true, true, false, true])
  const cm = await render(built.Common, { common: COMMON(), prepare: PREPARE(true, SOURCE), markets: ['smartstore', '11st'], coupang: true })
  eq('공통 정보 칸: 예외 없음 · 상품명·판매가·옵션 표(공용 영역)·대표 이미지 · 쿠팡 안내 한 줄 · 추가금액 범위 = 두 판매처가 겹치는 곳(-6,450 ~ +6,450)', [
    cm.error, val(cm.html, 'data-mk-cm-name'), val(cm.html, 'data-mk-cm-price'), /data-mk-opt-table/.test(cm.html), /data-mk-cm-images/.test(cm.html), /data-mk-cm-coupang[^>]*>쿠팡은 아래 쿠팡 칸에서 따로 입력합니다\.</.test(cm.html), /data-mk-opt-range[^>]*>추가금액은 -6,450원 ~ \+6,450원/.test(cm.html), /data-mk-cm-desc[^>]*>[^<]*스마트스토어·11번가/.test(cm.html),
  ], [null, '공통 머그', '12900', true, true, true, true, true])
  const cmNoCp = await render(built.Common, { common: COMMON(), prepare: PREPARE(true, SOURCE), markets: ['smartstore', '11st'], coupang: false })
  eq('공통 정보 칸: 쿠팡을 체크하지 않으면 쿠팡 안내 없음', /data-mk-cm-coupang/.test(cmNoCp.html), false)

  // ── 등록 템플릿 (2026-10-01) — 기본 템플릿 자동 선택 · 고르면 칸이 채워짐 · 조건부 무료 ──
  const val11 = (html, attr) => (new RegExp('<input[^>]*' + attr + '[^>]*>').exec(html)?.[0].match(/ value="([^"]*)"/)?.[1]) ?? ''
  const chk11 = (html, attr) => new RegExp('<input[^>]*' + attr + '[^>]*checked|<input[^>]*checked[^>]*' + attr).test(html)
  eq('등록 템플릿: 목록이 없으면(표 없음 — SQL 전) 템플릿 칸을 그리지 않음', /data-mk-11st-templates/.test(a.html), false)
  const P1 = { id: 'p1', kind: 'product', name: '중국산 생활잡화', is_default: true, data: {
    origin: { type: 'overseas', place: '베트남' }, maker: '(주)이유씨 수입', country: '베트남', brand: '이유홈', asContact: '고객센터 02-000-0000', asGuide: 'A/S 안내 문구', returnGuide: '반품 안내 문구',
    kc: { living: { choice: 'cert', certType: '[생활용품] 안전확인', certNo: 'CB-1' }, kids: { choice: 'none' }, radio: { choice: 'none' }, chemical: { choice: 'none' } },
    notice: { type: '기타 재화', items: { '품명 및 모델명': '머그컵 MG-1' } } } }
  const P2 = { id: 'p2', kind: 'product', name: '국내 상품', is_default: false, data: { origin: { type: 'domestic', place: '서울' } } }
  const S1 = { id: 's1', kind: 'shipping', name: '조건부 무료', is_default: true, data: { feeType: 'conditional', fee: 3000, freeOver: 30000, jejuFee: 3000, islandFee: 5000, returnFee: 3000, exchangeFee: 6000 } }
  const S2 = { id: 's2', kind: 'shipping', name: '무료', is_default: false, data: { feeType: 'free', returnFee: 4000 } }
  const ltCache = list => ({ ...cache11({ out: null, in: null }), listingTemplatesDone: { ready: true, templates: list } })
  const t1 = await render11(ltCache([P2, P1, S2, S1]))
  eq('등록 템플릿: 기본 템플릿(상품정보 p1·배송 s1)이 자동 선택됨', [t1.error, /data-mk-11st-templates/.test(t1.html), sel11(t1.html, 'data-mk-11st-lt="product"', 'p1'), sel11(t1.html, 'data-mk-11st-lt="shipping"', 's1')], [null, true, true, true])
  eq('등록 템플릿 적용: 브랜드·제조자·제조국·전화·A/S·반품 안내 · 원산지 해외 베트남(1265) · KC 01 인증대상 103 + 번호 · 고시 기타 재화 + 품명 항목', [
    val11(t1.html, 'data-mk-11st-brand'), val11(t1.html, 'data-mk-11st-maker'), val11(t1.html, 'data-mk-11st-country'), val11(t1.html, 'data-mk-11st-phone'), val11(t1.html, 'data-mk-11st-as'), val11(t1.html, 'data-mk-11st-rtng'),
    sel11(t1.html, 'data-mk-11st-origin-kind', '02'), sel11(t1.html, 'data-mk-11st-origin-code', '1265'),
    sel11(t1.html, 'data-mk-11st-kc-group="01"', 'cert'), sel11(t1.html, 'data-mk-11st-kc-type="01"', '103'), val11(t1.html, 'data-mk-11st-kc-key="01"'), sel11(t1.html, 'data-mk-11st-kc-group="04"', 'none'),
    sel11(t1.html, 'data-mk-11st-notice-type', '891045'), val11(t1.html, 'data-mk-11st-notice-item="11800"'),
  ], ['이유홈', '(주)이유씨 수입', '베트남', '고객센터 02-000-0000', 'A/S 안내 문구', '반품 안내 문구', true, true, true, true, 'CB-1', true, true, '머그컵 MG-1'])
  eq('등록 템플릿 적용: 배송비 조건부 무료(03) · 기본 3,000 · 30,000원 이상 무료 · 제주·도서산간·반품·교환 · 요약 표', [
    chk11(t1.html, 'data-mk-11st-fee-cond'), val11(t1.html, 'data-mk-11st-base-fee'), val11(t1.html, 'data-mk-11st-free-over'), val11(t1.html, 'data-mk-11st-jeju'), val11(t1.html, 'data-mk-11st-island'), val11(t1.html, 'data-mk-11st-return-fee'), val11(t1.html, 'data-mk-11st-exchange-fee'),
    /data-mk-11st-preview-row="배송비"[\s\S]{0,200}3,000원 · 30,000원 이상 무료/.test(t1.html),
  ], [true, '3000', '30000', '3000', '5000', '3000', '6000', true])
  eq('등록 템플릿: 출고지·반품지는 템플릿과 상관없이 주소록 첫째(마지막 사용 기억 규칙 그대로)', [sel11(t1.html, 'data-mk-11st-out', '11'), sel11(t1.html, 'data-mk-11st-in', '21')], [true, true])
  const t2 = await render11(ltCache([P2, S2]))
  eq('기본 템플릿이 없으면 아무것도 고르지 않음 · 칸은 처음 값(중국·무료·금액 빈칸)', [t2.error, sel11(t2.html, 'data-mk-11st-lt="product"', ''), sel11(t2.html, 'data-mk-11st-lt="shipping"', ''), sel11(t2.html, 'data-mk-11st-origin-code', '1287'), chk11(t2.html, 'data-mk-11st-fee-free'), val11(t2.html, 'data-mk-11st-return-fee')], [null, true, true, true, true, ''])
  const t3 = await render11(ltCache([]))
  eq('템플릿이 하나도 없으면 [기본 설정] 안내 한 줄 · 저장 버튼 2개(상품정보·배송)', [/data-mk-11st-lt-empty/.test(t3.html), (t3.html.match(/data-mk-11st-lt-save="/g) || []).length], [true, 2])
}

try { fs.rmSync(workDir, { recursive: true, force: true }) } catch (e) { console.warn('임시 폴더를 지우지 못함:', workDir, e.message) }
console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
