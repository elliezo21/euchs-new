// [내 상품] 목록 규칙 (2026-10-02) — node scripts/test-studio-product-list.mjs
// src/lib/studioProductList.js(만들기 상태·탭·할 일·작업 단위 묶기) + api/_studioExports.js currentExportsByProject + 화면 배선(소스 검사)
import fs from 'node:fs'
import * as P from '../src/lib/studioProductList.js'
import { currentExportsByProject } from '../api/_studioExports.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(64)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── 서버: 작업마다 지금 결과물 하나 ──
{
  const rows = [
    { id: 'd1', project_id: 'A', source: 'download', created_at: '2026-10-01T01:00:00Z', files: [1], file_count: 1 },
    { id: 's1', project_id: 'A', source: 'save', created_at: '2026-09-30T01:00:00Z', files: [1], file_count: 1 },
    { id: 'd2', project_id: 'A', source: 'download', created_at: '2026-10-02T01:00:00Z', files: [1], file_count: 1 },
    { id: 'b1', project_id: 'B', source: 'download', created_at: '2026-09-29T01:00:00Z', files: [1], file_count: 1 },
    { id: 'b2', project_id: 'B', created_at: '2026-10-02T05:00:00Z', files: [1], file_count: 1 }, // source 칸 없는 예전 줄 = download
  ]
  const g = currentExportsByProject(rows)
  eq('작업마다 한 줄 · [작업 저장]이 있으면 그것 · 없으면 가장 최근 · 모든 결과물 id(최근순) · 지금 결과물이 최근인 작업 먼저', g.map(x => [x.current.id, x.ids]), [['b2', ['b2', 'b1']], ['s1', ['d2', 'd1', 's1']]])
  // 2026-10-02: 상세 이미지를 뒤에서 만드는 중(파일이 다 못 들어온 [작업 저장] 줄)은 지금 결과물이 아니다 — 카드(다 든 것) 그대로
  const g2 = currentExportsByProject([
    { id: 'c1', project_id: 'C', source: 'save', created_at: '2026-10-01T01:00:00Z', files: [1, 2], file_count: 2 },
    { id: 'c2', project_id: 'C', source: 'save', created_at: '2026-10-02T01:00:00Z', files: [1], file_count: 3 },
    { id: 'e1', project_id: 'E', source: 'save', created_at: '2026-10-02T01:00:00Z', files: [1], file_count: 3 }, // 만드는 중뿐 — 결과물 없음(줄 없음)
  ])
  eq('만드는 중(파일 덜 든 [작업 저장] 줄)은 지금 결과물이 아님 · 카드 그대로 · 만드는 중뿐이면 줄 없음', g2.map(x => [x.current.id, x.ids]), [['c1', ['c2', 'c1']]])
  eq('빈 값·작업 없는 줄은 건너뜀', currentExportsByProject([null, { id: 'x' }, { project_id: 'P' }]).length, 0)
}

// ── 만들기 상태 4가지 ──
const EX = (id, at, extra = {}) => ({ id, projectId: extra.projectId || 'p', createdAt: at, exportIds: extra.exportIds || [id], title: extra.title || '', previewUrl: null })
const SEND = (id, market, status, at, extra = {}) => ({ id, exportId: extra.exportId || 'e1', market, status, createdAt: at, sentAt: extra.sentAt || at, ...extra })
{
  eq('작성 중 = 결과물 없음', P.productStage(null, {}), 'draft')
  eq('보내기 전 = 결과물 있고 보낸 기록 없음', P.productStage(EX('e1', '2026-10-01T00:00:00Z'), {}), 'ready')
  eq('보냄 = 보낸 뒤 결과물이 안 바뀜', P.productStage(EX('e1', '2026-10-01T00:00:00Z'), { coupang: SEND('s', 'coupang', 'approved', '2026-10-01T02:00:00Z') }), 'sent')
  eq('변경사항 미전송 = 살아 있는 상품을 보낸 뒤 결과물을 다시 저장', P.productStage(EX('e1', '2026-10-02T00:00:00Z'), { coupang: SEND('s', 'coupang', 'approved', '2026-10-01T02:00:00Z') }), 'changed')
  eq('수정 회차(sentAt)가 저장보다 늦으면 보냄 (다시 보낸 뒤)', P.productStage(EX('e1', '2026-10-02T00:00:00Z'), { coupang: SEND('s', 'coupang', 'approved', '2026-10-01T02:00:00Z', { sentAt: '2026-10-02T03:00:00Z' }) }), 'sent')
  eq('실패·반려만 있으면 다시 저장해도 변경사항 미전송 아님(살아 있는 상품이 없음) — 보냄 + 확인 필요', P.productStage(EX('e1', '2026-10-02T00:00:00Z'), { coupang: SEND('s', 'coupang', 'failed', '2026-10-01T02:00:00Z') }), 'sent')
  // 2026-10-02 [작업 저장] = 작업 내용만 + 저장 시각(studio_projects.last_exported_at) — 상세 이미지(결과물)는 뒤에서·보낼 때 만든다
  eq('저장 시각만 있고 결과물이 아직 없음 = 보내기 전(보낼 때 만든다) · 고를 수 있음', [P.productStage(null, {}, '2026-10-02T00:00:00Z'), P.canPick({ stage: 'ready', exportId: null }), P.canPick({ stage: 'draft', exportId: null })], ['ready', true, false])
  eq('변경사항 미전송 = 보낸 뒤 [작업 저장](저장 시각) — 결과물 시각이 아니라', [
    P.productStage(EX('e1', '2026-10-01T00:00:00Z'), { coupang: SEND('s', 'coupang', 'approved', '2026-10-01T02:00:00Z') }, '2026-10-02T00:00:00Z'),
    P.productStage(EX('e1', '2026-10-03T00:00:00Z'), { coupang: SEND('s', 'coupang', 'approved', '2026-10-01T02:00:00Z') }, '2026-10-01T00:00:00Z'), // 보낼 때 다시 만든 결과물은 저장이 아님
  ], ['changed', 'sent'])
  eq('다른 계정으로 보낸 상품은 변경사항 판정에서 뺌', P.productStage(EX('e1', '2026-10-02T00:00:00Z'), { coupang: SEND('s', 'coupang', 'approved', '2026-10-01T02:00:00Z', { accountMismatch: true }) }), 'sent')
}

// ── 작업 단위로 묶기 · 탭 ──
const projects = [
  { id: 'p1', title: '도트 헤어핀', title_zh: '发夹', source_type: '1688', updated_at: '2026-10-02T09:00:00Z' }, // 작성 중
  { id: 'p2', title: null, title_zh: '女士拖鞋', source_type: '1688', updated_at: '2026-10-02T08:00:00Z' }, // 보내기 전
  { id: 'p3', title: '머그컵', source_type: 'upload', updated_at: '2026-10-02T07:00:00Z' }, // 보냄 (예전 다운로드 결과물로 보냄)
  { id: 'p4', title: '변경 상품', source_type: '1688', updated_at: '2026-10-02T06:00:00Z' }, // 변경사항 미전송
  { id: 'p5', title: '실패 상품', source_type: '1688', updated_at: '2026-10-02T05:00:00Z' }, // 실패
  { id: 'p6', title: '대기 상품', source_type: '1688', updated_at: '2026-10-02T04:00:00Z' }, // 승인 대기
]
const exportsList = [
  EX('x2', '2026-10-01T00:00:00Z', { projectId: 'p2', title: '슬리퍼 저장 이름' }),
  EX('x3', '2026-10-01T00:00:00Z', { projectId: 'p3', exportIds: ['x3', 'x3old'] }),
  EX('x4', '2026-10-02T00:00:00Z', { projectId: 'p4' }),
  EX('x5', '2026-10-01T00:00:00Z', { projectId: 'p5' }),
  EX('x6', '2026-10-01T00:00:00Z', { projectId: 'p6' }),
]
const sends = [
  SEND('s3', 'smartstore', 'registered', '2026-10-01T05:00:00Z', { exportId: 'x3old' }),
  SEND('s3b', 'coupang', 'approved', '2026-10-01T06:00:00Z', { exportId: 'x3' }),
  SEND('s4', 'coupang', 'approved', '2026-10-01T05:00:00Z', { exportId: 'x4' }),
  SEND('s5', 'coupang', 'rejected', '2026-10-01T05:00:00Z', { exportId: 'x5', sellerProductId: '123' }),
  SEND('s5b', '11st', 'failed', '2026-10-01T06:00:00Z', { exportId: 'x5' }),
  SEND('s6', 'coupang', 'approval_pending', '2026-10-01T05:00:00Z', { exportId: 'x6' }),
  SEND('s9', 'cafe24', 'registered', '2026-10-01T05:00:00Z', { exportId: 'x2' }), // 운영 중단 판매처(off) — 안 보임
  SEND('s10', 'coupang', 'approved', '2026-10-01T05:00:00Z', { exportId: 'unknown' }), // 지운 작업 — 목록에 없음
]
const rows = P.buildProducts({ projects, exports: exportsList, sends })
const by = Object.fromEntries(rows.map(r => [r.id, r]))
eq('한 줄 = 작업 하나 (같은 작업의 예전 결과물로 보낸 기록도 한 줄에)', [rows.length, Object.keys(by.p3.byMarket).sort()], [6, ['coupang', 'smartstore']])
eq('만들기 상태: 작성 중 · 보내기 전 · 보냄 · 변경사항 미전송 · (실패) 보냄 · (승인 대기) 보냄', ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(id => by[id].stage), ['draft', 'ready', 'sent', 'changed', 'sent', 'sent'])
eq('운영 중단 판매처(카페24) 기록은 빼고 · 지운 작업의 기록은 목록에 없음', [Object.keys(by.p2.byMarket), by.p2.stage], [[], 'ready'])
eq('탭: 판매처에 올라감 = 등록·승인 완료 · 확인 필요 = 실패·반려·승인 대기·변경사항 미전송', [rows.filter(r => P.inTab(r, 'live')).map(r => r.id), rows.filter(r => P.inTab(r, 'check')).map(r => r.id)], [['p3', 'p4'], ['p4', 'p5', 'p6']])
eq('탭 개수', P.tabCounts(rows), { all: 6, draft: 1, ready: 1, live: 2, check: 3 })
eq('탭 목록·순서·확인 필요만 빨간 숫자', [P.PRODUCT_TABS.map(t => t.label), P.PRODUCT_TABS.filter(t => t.alert).map(t => t.key)], [['전체', '작성 중', '보내기 전', '판매처에 올라감', '확인 필요'], ['check']])

// ── 이름 하나 · 출처 ──
// 2026-10-02: 이름 순서 = 작업 이름 → 1688 제목 한글(번역 캐시 titlesKo) → 1688 원래 제목 → 저장할 때 이름(작업 이름·제목이 다 없을 때만)
eq('상품 이름 = 작업 이름 → 1688 제목 한글 → 1688 원래 제목 → 저장할 때 이름 (화면마다 같은 값)', [
  by.p1.name, by.p2.name, P.buildProducts({ projects, exports: exportsList, sends, titlesKo: { p2: '여성 슬리퍼', p1: '헤어핀' } }).filter(r => r.id === 'p1' || r.id === 'p2').map(r => r.name),
  P.productName({ title_zh: '发夹' }, null), P.productName({ title_zh: '发夹' }, null, '헤어핀'), P.productName({}, { title: '저장 이름' }), P.productName({}, null),
], ['도트 헤어핀', '女士拖鞋', ['도트 헤어핀', '여성 슬리퍼'], '发夹', '헤어핀', '저장 이름', '이름 없는 상품'])
{
  const fs = await import('node:fs')
  const up = fs.readFileSync(new URL('../api/studio-upload.js', import.meta.url), 'utf8'), lv = fs.readFileSync(new URL('../src/components/studio/StudioProductList.vue', import.meta.url), 'utf8')
  eq('배선: 서버 exports_list(perProject)가 titlesKo(번역 캐시만 — title_zh) · 표 준비 전에도 · 목록이 buildProducts에 넘김 · 로그아웃이면 비움', [
    up.includes('const ko = await lookupCachedTranslations(list.map(r => r.title_zh.trim()), CACHE_SOURCE_LANG, CACHE_TARGET_LANG)'), up.includes("return res.status(200).json({ ready: false, items: [], titlesKo })"), up.includes('return res.status(200).json({ ready: true, items, titlesKo })'),
    lv.includes('titlesKo: titlesKo.value })'), /sends\.value = \[\]\s+titlesKo\.value = \{\}/.test(lv),
  ], [true, true, true, true, true])
}
eq('출처: 1688 상품 / 내 사진 (DB에 찜·주문 구분 없음)', [by.p1.source, by.p3.source], ['1688 상품', '내 사진'])

// ── 할 일 · 고르기 ──
eq('할 일: 작성 중 = 이어서 편집 · 보내기 전·보냄 = 판매처로 보내기 · 변경사항 = 변경사항 전송 · 실패 = 수정 후 재전송', ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(id => P.rowAction(by[id]).label), ['이어서 편집', '판매처로 보내기', '판매처로 보내기', '변경사항 전송', '수정 후 재전송', '판매처로 보내기'])
eq('수정 후 재전송: 쿠팡 반려 + 쿠팡 상품번호 = 같은 쿠팡 상품 고치기(resend) · 그 밖 실패 = 그 판매처만 체크한 보내기 창', [P.rowAction(by.p5).how, P.rowAction(by.p5).send.id, P.rowAction({ ...by.p5, byMarket: { '11st': by.p5.byMarket['11st'] } }).how], ['resend', 's5', 'send'])
eq('작성 중은 고를 수 없음 · 고른 요약 = 새로 보내기 / 변경사항 전송', [P.canPick(by.p1), P.canPick(by.p2), P.pickSummary([by.p1, by.p2, by.p3, by.p4])], [false, true, { total: 3, fresh: 2, update: 1 }])
eq('문구 = 지시 문구', [P.DRAFT_LOCK_NOTE, P.NOT_SENT_CHIP, P.STAGE_LABEL], ['편집을 끝내야 보낼 수 있습니다', '아직 안 보냄', { draft: '작성 중', ready: '보내기 전', sent: '보냄', changed: '변경사항 미전송' }])

// ── 화면 배선 (소스 검사) ──
{
  const v = read('src/components/studio/StudioProductList.vue'), home = read('src/views/studio/StudioHomeView.vue'), layout = read('src/layouts/StudioLayout.vue')
  eq('줄: 상품 이름 = 편집 열기 링크 · 체크 = 보내기 고르기(작성 중은 꺼짐 + 마우스 올리면 안내)', [
    /<router-link :to="editorTo\(r\)"[^>]*:data-product-name="r\.id">\{\{ r\.name \}\}<\/router-link>/.test(v), /:disabled="!canPick\(r\)"/.test(v), /:title="canPick\(r\) \? '' : DRAFT_LOCK_NOTE"/.test(v),
  ], [true, true, true])
  eq('줄: 판매처 현황 칩 = 보낸 상품과 같은 함수(marketChips) · 안 보냄 칩 · 할 일 버튼 · 수정일', [/marketChips\(r\)/.test(v), /NOT_SENT_CHIP/.test(v), /data-product-action/.test(v), /dateLabel\(r\.updatedAt\)/.test(v)], [true, true, true, true])
  eq('폰(768px 미만) = 카드 목록 · 누르는 것 44px 이상', [/@media \(max-width: 767px\)[\s\S]*\.pl-table-wrap \{ display: none; \}[\s\S]*\.pl-cards \{ display: block; \}/.test(v), /\.pl-tap \{ min-height: 44px; min-width: 44px; \}/.test(v)], [true, true])
  eq('로그아웃 구독 · 개인 데이터 비움 (CLAUDE.md 2-9)', [/window\.addEventListener\('euchs-auth-changed', onStudioAuthChanged\)/.test(v), /projects\.value = \[\]\s+exportsList\.value = \[\]\s+sends\.value = \[\]/.test(v)], [true, true])
  eq('홈 = "내 상품" 제목 + 새 상품 만들기 줄(찜·주문·내 사진·1688 주소 그대로) + 목록 · 사이드바 [+ 새 상품 만들기]', [
    /<h1 class="st-h-page">내 상품<\/h1>/.test(home), /<h2 class="st-h-card">새 상품 만들기<\/h2>/.test(home), /goPick\('saved'\)/.test(home) && /goPick\('ordered'\)/.test(home) && /@click="openUpload"/.test(home) && /data-url-submit/.test(home), /<StudioProductList v-if="loggedIn" \/>/.test(home), /\/> 새 상품 만들기/.test(layout),
  ], [true, true, true, true, true])
  eq('예전 보내기 주소·편집기 [판매처로 보내기] → ?send=<결과물 id>로 보내기 창', [/route\.query\.send/.test(v), /openSendFor\(r, \{\}\)/.test(v)], [true, true])
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
