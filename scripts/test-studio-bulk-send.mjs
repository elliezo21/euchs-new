// 여러 상품 한 번에 보내기 + 카테고리 묶음 (2026-10-02) — node scripts/test-studio-bulk-send.mjs
// src/lib/studioBulkSend.js(준비 판정·준비된 것만 보내기·이미 있는 상품은 수정·순서대로 보내기·묶음 적용) + api/_marketPrevious.js + 배선(소스 검사)
import fs from 'node:fs'
import * as B from '../src/lib/studioBulkSend.js'
import { previousOf, previousFromRow, PREVIOUS_SELECT } from '../api/_marketPrevious.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(64)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── 판매가·재고 일괄 ──
eq('판매가 기존값 그대로 · 비율(10원 단위 반올림) · 기존값 없으면 null(수정 필요 — 임의 숫자 없음)', [
  B.bulkPrice(12900, 'keep'), B.bulkPrice(12900, 'rate', 10), B.bulkPrice(12900, 'rate', -15), B.bulkPrice(9999, 'rate', 0), B.bulkPrice(null, 'keep'), B.bulkPrice(null, 'rate', 10), B.bulkPrice('15000', 'keep'), B.bulkPrice(10000, 'rate', 999),
], [12900, 14190, 10970, 10000, null, null, 15000, null])
eq('재고 그대로(기존값) · 같은 수량 · 0도 값', [B.bulkStock(7, 'keep'), B.bulkStock(null, 'keep'), B.bulkStock(7, 'same', 50), B.bulkStock(7, 'same', 0), B.bulkStock(7, 'same', null)], [7, null, 50, 0, null])
{
  const c = { price: null, stock: null, opts: { enabled: true, rows: [{ stock: null }, { stock: 3 }] } }
  B.applyBulkCommon(c, { price: 9900, stock: 20, stockMode: 'same' })
  const d = { price: 1, stock: 5, opts: { enabled: true, rows: [{ stock: 1 }] } }
  B.applyBulkCommon(d, { price: 2000, stock: 9, stockMode: 'keep' })
  eq('공통 정보에 넣기: 같은 수량 = 모든 옵션 재고 · 그대로 = 옵션 재고는 안 건드림', [c.price, c.opts.rows.map(r => r.stock), d.price, d.stock, d.opts.rows[0].stock], [9900, [20, 20], 2000, 5, 1])
}
eq('기존값 = 가장 최근에 보낸 판매처의 값 (가격·재고 따로)', B.latestPrevious({ coupang: { price: 10000, stock: null, at: '2026-10-01T00:00:00Z' }, smartstore: { price: 11000, stock: 30, at: '2026-10-02T00:00:00Z' } }), { price: 11000, stock: 30 })

// ── 서버: 보낸 기록 → 판매처마다 기존 판매가·재고·카테고리 ──
{
  const rows = [
    { market: 'coupang', status: 'approved', created_at: '2026-10-01T00:00:00Z', category_name: '슬리퍼', cp_cat: '80297', cp_items: [{ salePrice: 13900, maximumBuyCount: 5 }, { salePrice: 12900, maximumBuyCount: 3 }] },
    { market: 'coupang', status: 'failed', created_at: '2026-10-02T00:00:00Z', cp_items: [{ salePrice: 8000, maximumBuyCount: 1 }], cp_cat: '1' }, // 살아 있는 기록이 먼저
    { market: 'smartstore', status: 'registered', created_at: '2026-09-30T00:00:00Z', ss_price: '15000', ss_stock: '40', ss_cat: '50000803', category_name: '패션잡화>슬리퍼' },
    { market: '11st', status: 'failed', created_at: '2026-09-30T00:00:00Z', e_price: '15000', e_stock: '9', e_cat: '1012345' },
    { market: 'zigzag', status: 'registered', created_at: '2026-09-29T00:00:00Z', z_price: 16000, z_stock: 0, z_cat: 'Z12' },
  ]
  const p = previousOf(rows)
  eq('기존값: 쿠팡 = 가장 작은 옵션 판매가 · 옵션 여러 개면 재고 모름 · 살아 있는 기록 먼저 · 카테고리 이름', p.coupang && [p.coupang.price, p.coupang.stock, p.coupang.category, p.coupang.status], [12900, null, { id: '80297', name: '슬리퍼' }, 'approved'])
  eq('기존값: 스마트스토어·11번가(실패 기록도 값이 있으면)·지그재그(재고 0도 값)', [p.smartstore.price, p.smartstore.stock, p.smartstore.category.id, p['11st'].price, p['11st'].status, p.zigzag.stock, p.zigzag.category.id], [15000, 40, '50000803', 15000, 'failed', 0, 'Z12'])
  eq('값이 하나도 없는 기록·모르는 판매처는 null', [previousFromRow({ market: 'coupang', cp_items: [] }), previousFromRow({ market: 'cafe24' })], [null, null])
  eq('읽는 칸: 판매처마다 본문 경로 (DB 칸 새로 없음)', ['cp_items:request_json->body->items', 'ss_price:request_json->body->originProduct->>salePrice', 'e_price:request_json->summary->>selPrc', 'z_price:request_json->summary->>price'].every(c => PREVIOUS_SELECT.includes(c)), true)
}

// ── 카테고리 묶음 적용 ──
{
  const prods = [{ previous: { coupang: { category: { id: '80297', name: '슬리퍼' } } } }, { previous: {} }, { previous: {} }]
  const bundle = { id: 'b1', market: 'coupang', name: '여성 슬리퍼', categoryId: '80297', categoryName: '패션>슬리퍼' }
  eq('카테고리: 묶음을 고르면 묶음 · 직접 고르기면 이 상품을 그 판매처에 보낼 때 썼던 카테고리 · 둘 다 없으면 null(직접)', [
    B.categoryFor('coupang', prods[1].previous, bundle), B.categoryFor('coupang', prods[0].previous, null), B.categoryFor('coupang', prods[1].previous, null),
  ], [{ id: '80297', name: '패션>슬리퍼', from: 'bundle' }, { id: '80297', name: '슬리퍼', from: 'previous' }, null])
  eq('판매처 줄 적용 결과: "3개 모두 적용" / "2개 직접 골라야 함"', [B.applySummary('coupang', prods, bundle).text, B.applySummary('coupang', prods, null).text], ['3개 모두 적용', '2개 직접 골라야 함'])
  eq('카테고리 목록에서 id 찾기 — 숫자·글자 섞여도', [B.matchCategory([{ id: 50000803 }, { id: '7' }], '50000803')?.id, B.matchCategory([{ id: '7' }], 7)?.id, B.matchCategory([], '1'), B.matchCategory([{ id: 1 }], '')], [50000803, '7', null, null])
  eq('묶음 이름: 비면 안 됨 · 40자 · 같은 판매처 안 중복(띄어쓰기·대소문자 무시) · 다른 판매처는 같은 이름 가능', [
    B.checkBundleName('', [], 'coupang').ok, B.checkBundleName('x'.repeat(41), [], 'coupang').ok, B.checkBundleName('여성 슬리퍼', [bundle], 'coupang').ok, B.checkBundleName('여성슬리퍼', [bundle], 'smartstore'), B.checkBundleName('  새  묶음 ', [], 'coupang'),
  ], [false, false, false, { ok: true, name: '여성슬리퍼' }, { ok: true, name: '새 묶음' }])
  eq('판매처의 묶음만 이름순', B.bundlesOf([{ market: 'coupang', name: '나' }, { market: '11st', name: '가' }, { market: 'coupang', name: '가' }], 'coupang').map(b => b.name), ['가', '나'])
}

// ── 준비 판정 · 준비된 것만 보내기 · 이미 있는 상품은 수정 ──
eq('준비 판정: 판매처 빠짐 목록을 모아 판매처 이름을 앞에 · 섹션이 아직 없으면 불러오는 중 · 판매처 0곳이면 준비 아님', [
  B.readiness({ coupang: [], smartstore: [] }, ['coupang', 'smartstore']), B.readiness({ coupang: ['카테고리', '쿠팡 옵션 연결: "컬러"에 맞는 쿠팡 옵션'], smartstore: [] }, ['coupang', 'smartstore']), B.readiness({ coupang: null }, ['coupang']), B.readiness({}, []).ready,
], [{ ready: true, reasons: [] }, { ready: false, reasons: ['쿠팡 · 카테고리', '쿠팡 · 쿠팡 옵션 연결: "컬러"에 맞는 쿠팡 옵션'] }, { ready: false, reasons: ['쿠팡 · 불러오는 중'] }, false])
{
  const prods = [
    { id: 'a', ready: true, existing: { coupang: { mode: 'modify' } } },
    { id: 'b', ready: false, existing: {} },
    { id: 'c', ready: true, existing: {} },
  ]
  const jobs = B.planJobs(prods, ['smartstore', 'coupang'])
  eq('보낼 일: 준비된 상품만 · 판매처 순서(쿠팡 → 스마트스토어)대로 묶음 · 판매처에 있는 상품 = 수정(update)', jobs.map(j => `${j.market}:${j.productId}:${j.kind}`), ['coupang:a:update', 'coupang:c:create', 'smartstore:a:create', 'smartstore:c:create'])
  eq('이미 보낸 줄은 다시 안 보냄 (실패한 줄만 다시)', B.planJobs(prods, ['coupang'], new Set(['a:coupang'])).map(j => j.productId), ['c'])
}

// ── 순서대로 보내기 — 동시에 안 보냄 · 같은 판매처 건 사이 쉬는 시간 · 멈추기 ──
{
  const log = []
  let running = 0, maxRunning = 0
  const run = async job => { running++; maxRunning = Math.max(maxRunning, running); log.push(`run ${job.market}:${job.productId}`); await Promise.resolve(); running--; return job.productId === 'x' ? { ok: false, reason: '카테고리 오류' } : { ok: true, id: '1', status: 'registered' } }
  const sleep = async ms => { log.push(`sleep ${ms}`) }
  const jobs = [{ productId: 'a', market: 'coupang' }, { productId: 'x', market: 'coupang' }, { productId: 'a', market: 'smartstore' }, { productId: 'c', market: 'smartstore' }]
  const out = await B.runQueue(jobs, run, { sleep })
  eq('한 건씩(동시 1건) · 같은 판매처 다음 건 전에 쉼(쿠팡 1000·스마트스토어 1500) · 판매처가 바뀔 때는 안 쉼', [maxRunning, log], [1, ['run coupang:a', 'sleep 1000', 'run coupang:x', 'run smartstore:a', 'sleep 1500', 'run smartstore:c']])
  eq('결과: 실패해도 다음 건 계속 · 실패 사유 그대로', out.map(r => [r.productId, r.market, r.ok, r.reason || '']), [['a', 'coupang', true, ''], ['x', 'coupang', false, '카테고리 오류'], ['a', 'smartstore', true, ''], ['c', 'smartstore', true, '']])
  let n = 0
  const stopped = await B.runQueue(jobs, async () => ({ ok: true }), { sleep: async () => {}, stop: () => n++ >= 2 })
  eq('[멈추기] — 남은 건은 보내지 않음', stopped.length, 2)
  const thrown = await B.runQueue([{ productId: 'a', market: 'zigzag' }], async () => { throw new Error('네트워크') }, { sleep: async () => {} })
  eq('보내다 예외 → 실패 한 줄(사유 = 예외 문구)', [thrown[0].ok, thrown[0].reason], [false, '네트워크'])
}
eq('아래 막대 글자 · 버튼 글자', [B.barText({ markets: 2, products: 5, ready: 3, fix: 2 }), B.sendReadyLabel(3)], ['판매처 2곳 × 상품 5개 · 준비 완료 3 · 수정 필요 2', '준비된 3개만 보내기'])

// ── 배선 (소스 검사) ──
{
  const modal = read('src/components/studio/StudioBulkSendModal.vue'), list = read('src/components/studio/StudioProductList.vue'), sql = read('docs/sql/2026-10-02-studio-category-bundles.sql')
  eq('판매처 섹션 4곳이 applyPreset·pickedCategory를 내놓음 (보내는 길은 예전 submit 그대로)', ['Coupang', 'Smartstore', 'Elevenst', 'Zigzag'].map(n => /defineExpose\(\{ missing, busy, done, submit, sendError, applyPreset, pickedCategory \}\)/.test(read(`src/components/studio/StudioSend${n}.vue`))), [true, true, true, true])
  eq('여러 상품 창: 판매처 = 연결된 곳만 · 준비 판정 = 섹션 빠짐 목록 · 보내기 = planJobs + runQueue + 섹션 submit', [
    /filter\(r => r\.state === 'connected' && SECTIONS\[r\.key\]\)/.test(modal), /readiness\(missingByMarket, left\)/.test(modal), /runQueue\(jobs, runJob/.test(modal), /const r = await s\.submit\(\)/.test(modal), /planJobs\(/.test(modal),
  ], [true, true, true, true, true])
  eq('여러 상품 창: 로그아웃 구독 · 섹션 목록(sendCache)을 창 안에서 같이 씀', [/window\.addEventListener\('euchs-auth-changed', onAuthChanged\)/.test(modal), /provide\(SEND_CACHE_KEY, sendCache\)/.test(modal)], [true, true])
  eq('[내 상품] 막대: 2개 이상 = 여러 상품 창 · 1개 = 예전 창 · 한 번에 30개까지', [/<StudioBulkSendModal v-if="bulk\.open"/.test(list), /if \(list\.length === 1\) \{ runAction\(list\[0\], \{ forceSend: true \}\); return \}/.test(list), B.BULK_MAX], [true, true, 30])
  eq('SQL: 새 표 · RLS 본인 행만(4개 정책) · authenticated select/insert/update/delete · anon 없음 · 판매처 목록 = BUNDLE_MARKETS', [
    /create table public\.studio_category_bundles/.test(sql), /enable row level security/.test(sql), (sql.match(/create policy "studio_category_bundles (select|insert|update|delete): own"/g) || []).length,
    /grant select, insert, update, delete on table public\.studio_category_bundles to authenticated;/.test(sql), /revoke all on table public\.studio_category_bundles from anon, authenticated;/.test(sql),
    /check \(market in \('coupang', 'smartstore', '11st', 'zigzag'\)\)/.test(sql), B.BUNDLE_MARKETS,
  ], [true, true, 4, true, true, true, ['coupang', 'smartstore', '11st', 'zigzag']])
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
