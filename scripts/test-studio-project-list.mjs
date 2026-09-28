// 내 작업 목록(거르기·찾기·정렬·폴더) + 랜딩 버튼·1688 주소 줄·[다운로드]/[작업 저장]·베타 표시 — node scripts/test-studio-project-list.mjs
// 순수 함수는 그대로 부르고, 화면·SQL은 파일 글자로 확인한다. DB·로그인·시크릿을 쓰지 않는다.
import fs from 'node:fs'
import * as L from '../src/lib/studioProjectList.js'
import * as B from '../src/lib/studioBeta.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(64)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const shown = p => { const s = read(p); return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '') }

// ── 1. 폴더 ──
const F1 = 'f1111111-1111-4111-8111-111111111111', F2 = 'f2222222-2222-4222-8222-222222222222', GONE = 'f9999999-9999-4999-8999-999999999999'
const folders = [{ id: F1, name: '여름 신상', sort: 0 }, { id: F2, name: '주방', sort: 1 }]
const P = (id, o = {}) => ({ id, title: null, title_zh: null, source_type: '1688', offer_id: null, folder_id: null, created_at: '2026-09-01T00:00:00Z', updated_at: null, expires_at: '2026-12-01T00:00:00Z', doneCount: 0, ...o })
const list = [
  P('a', { title: '여성 슬리퍼', title_zh: '女士拖鞋', offer_id: '123456789012', folder_id: F1, created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-27T00:00:00Z', doneCount: 14 }),
  P('b', { title: null, title_zh: '陶瓷马克杯', folder_id: F2, created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-21T00:00:00Z' }),
  P('c', { title: '머그컵 10', source_type: 'upload', created_at: '2026-09-25T00:00:00Z' }),
  P('d', { title: '머그컵 2', source_type: 'upload', folder_id: GONE, created_at: '2026-09-05T00:00:00Z', updated_at: '2026-09-28T00:00:00Z' }),
]
eq('폴더 거르기: 전체 · 폴더 없음 · 폴더', [L.filterProjects(list, { folder: L.FOLDER_ALL }).map(p => p.id), L.filterProjects(list, { folder: L.FOLDER_NONE }).map(p => p.id), L.filterProjects(list, { folder: F1 }).map(p => p.id), L.filterProjects(list, { folder: F2 }).map(p => p.id)], [['a', 'b', 'c', 'd'], ['c'], ['a'], ['b']])
eq('폴더마다 작업 수 (지워진 폴더를 가리키면 "폴더 없음"에 셈)', L.folderCounts(list, folders), { all: 4, none: 2, [F1]: 1, [F2]: 1 })
eq('폴더 수: 목록이 비어도', L.folderCounts([], folders), { all: 0, none: 0, [F1]: 0, [F2]: 0 })
eq('폴더 이름: 앞뒤 공백 정리 · 빈 값 · 41자 · 같은 이름(띄어쓰기·대소문자 무시)', [L.checkFolderName('  가을   옷 ', folders), L.checkFolderName('  ', folders).ok, L.checkFolderName('가'.repeat(41), folders).ok, L.checkFolderName('여름신상', folders).message, L.checkFolderName('가'.repeat(40), folders).ok], [{ ok: true, name: '가을 옷' }, false, false, '같은 이름의 폴더가 있어요.', true])
eq('이름 바꾸기: 자기 이름 그대로는 통과 · 다른 폴더 이름과 같으면 거절', [L.checkFolderName('여름 신상', folders, F1).ok, L.checkFolderName('주방', folders, F1).ok], [true, false])
eq('폴더 100개면 더 못 만듦 (이름 바꾸기는 됨)', [L.checkFolderName('새 폴더', Array.from({ length: 100 }, (_, i) => ({ id: `x${i}`, name: `폴더${i}` }))).ok, L.checkFolderName('새 이름', Array.from({ length: 100 }, (_, i) => ({ id: `x${i}`, name: `폴더${i}` })), 'x3').ok], [false, true])
eq('폴더 삭제는 비어 있을 때만', [L.canDeleteFolder(F1, L.folderCounts(list, folders)), L.canDeleteFolder(F1, L.folderCounts([list[1]], folders)), L.canDeleteFolder(null, {})], [false, true, false])
eq('여러 개 이동: 이미 그 폴더에 있는 것은 뺌 · 폴더 없음으로도', [L.idsToMove(list, ['a', 'b', 'c'], F1), L.idsToMove(list, ['a', 'c'], null), L.idsToMove(list, [], F1), L.idsToMove(list, ['zzz'], F1)], [['b', 'c'], ['a'], [], []])

// ── 2. 검색·출처·정렬 ──
eq('검색: 제목', L.filterProjects(list, { query: '머그컵' }).map(p => p.id), ['c', 'd'])
eq('검색: 1688 상품명(title_zh)·상품번호', [L.filterProjects(list, { query: '马克杯' }).map(p => p.id), L.filterProjects(list, { query: '1234567' }).map(p => p.id)], [['b'], ['a']])
eq('검색: 띄어쓰기·대소문자 무시 · 낱말 모두 들어 있어야', [L.filterProjects(list, { query: '여성슬리퍼' }).map(p => p.id), L.filterProjects(list, { query: '머그컵 10' }).map(p => p.id), L.filterProjects(list, { query: '머그컵 슬리퍼' }).map(p => p.id), L.filterProjects(list, { query: '   ' }).length], [['a'], ['c'], [], 4])
eq('출처 칩(전체/1688/내 사진) 그대로 · 폴더·검색과 같이', [L.SOURCE_FILTERS.map(f => f.label), L.filterProjects(list, { source: 'upload' }).map(p => p.id), L.filterProjects(list, { source: '1688', folder: F2 }).map(p => p.id), L.filterProjects(list, { source: 'upload', query: '2' }).map(p => p.id)], [['전체', '1688', '내 사진'], ['c', 'd'], ['b'], ['d']])
eq('정렬 3가지', L.SORTS.map(s => s.label), ['최근 수정', '이름', '만든 날'])
eq('최근 수정 (수정 시각이 없으면 만든 날)', L.sortProjects(list, 'updated').map(p => p.id), ['d', 'a', 'c', 'b'])
eq('이름 (가나다 · 숫자는 숫자로 2 → 10 · 제목 없으면 1688 상품명으로)', L.sortProjects(list, 'name').map(p => L.titleOf(p)).filter(t => /[가-힣]/.test(t)), ['머그컵 2', '머그컵 10', '여성 슬리퍼'])
eq('만든 날 (최근 먼저)', L.sortProjects(list, 'created').map(p => p.id), ['c', 'b', 'a', 'd'])
eq('정렬은 원래 배열을 바꾸지 않음', [L.sortProjects(list, 'name') !== list, list.map(p => p.id)], [true, ['a', 'b', 'c', 'd']])
eq('수백 개: 300개에서 찾기·폴더·정렬', (() => { const big = Array.from({ length: 300 }, (_, i) => P(`p${i}`, { title: `상품 ${i}`, folder_id: i % 3 === 0 ? F1 : null, created_at: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString() })); const r = L.sortProjects(L.filterProjects(big, { folder: F1, query: '상품 2' }), 'created'); return [r.length, r.every(p => p.folder_id === F1 && p.title.includes('2')), r[0].title, L.folderCounts(big, folders)[F1]] })(), [47, true, '상품 297', 100])

// ── 3. 카드 글자 ──
const NOW = new Date('2026-09-28T12:00:00+09:00')
eq('카드 아래: "사진 N장 · N일 전" (마지막으로 고친 때 기준)', [L.cardMeta(list[0], NOW), L.cardMeta(list[2], NOW), L.cardMeta(P('x', { updated_at: '2026-09-28T01:00:00Z', doneCount: 3 }), NOW), L.cardMeta(P('y', { updated_at: '2026-09-27T01:00:00Z', doneCount: 1 }), NOW)], ['사진 14장 · 1일 전'.replace('1일 전', '어제'), '사진 0장 · 3일 전', '사진 3장 · 오늘', '사진 1장 · 어제'])
eq('보관 남은 일', [L.keepLabel('2026-10-08T12:00:00+09:00', NOW.getTime()), L.keepLabel('2026-09-28T20:00:00+09:00', NOW.getTime()), L.keepLabel('2026-09-01T00:00:00Z', NOW.getTime()), L.keepLabel('x', NOW.getTime())], ['10일', '오늘까지', '끝남', ''])
eq('만든 날 표시 (KST)', [L.dateLabel('2026-09-27T15:30:00Z'), L.dateLabel('x')], ['2026.09.28', ''])
eq('출처·제목', [L.sourceLabel(list[0]), L.sourceLabel(list[2]), L.titleOf(list[1]), L.titleOf(P('z'))], ['1688', '내 사진', '陶瓷马克杯', '제목 없음'])
eq('처음 보이는 수 = 12 (데스크톱 6칸 × 2줄)', L.FIRST_ROWS, 12)

// ── 4. 목록 화면 ──
{
  const v = read('src/components/studio/StudioRecentProjects.vue'), t = shown('src/components/studio/StudioRecentProjects.vue')
  const css = read('src/styles/studio-tokens.css')
  eq('작은 카드 격자: 폰 2 · 데스크톱(1024) 6 · 1400px 이상 8', [/\.st-grid-compact \{[^}]*repeat\(2,/.test(css), /min-width: 1024px\) \{ \.studio-root \.st-grid-compact \{ grid-template-columns: repeat\(6,/.test(css), /min-width: 1400px\) \{ \.studio-root \.st-grid-compact \{ grid-template-columns: repeat\(8,/.test(css)], [true, true, true])
  eq('카드: 정사각 썸네일 · 제목 1줄 말줄임 · 작은 글씨', [/\.pj-thumb \{[^}]*aspect-ratio: 1 \/ 1/.test(v), /class="mt-1\.5 block text-\[13px\] font-bold st-ink truncate"/.test(t), /<div class="st-desc-sm truncate">\{\{ cardMeta\(p\) \}\}<\/div>/.test(t)], [true, true, true])
  eq('보기 전환 [격자]/[목록] · 목록 = 표(썸네일 48px·제목·출처·사진 수·만든 날·보관 남은 일·[열기])', [L.VIEWS.map(x => x.label), /data-projects-view-pick/.test(t), [...t.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map(m => m[1]), /\.pj-thumb48 \{[^}]*width: 48px; height: 48px/.test(v), />열기<\/router-link>/.test(t)], [['격자', '목록'], true, ['제목', '출처', '사진', '만든 날', '보관 남은 일'], true, true])
  eq('폴더 줄: 전체 · 폴더 없음 · 사용자 폴더 · 만들기·이름 바꾸기·삭제', [/:data-projects-folder="FOLDER_ALL"/.test(t), /:data-projects-folder="FOLDER_NONE"/.test(t), /v-for="f in folders"/.test(t), /data-projects-folder-new/.test(t), /data-projects-folder-rename/.test(t), /data-projects-folder-delete/.test(t)], [true, true, true, true, true, true])
  eq('폴더 삭제 버튼은 비어 있을 때만 켜짐', /:disabled="!canDeleteFolder\(currentFolder\.id, counts\)"/.test(t), true)
  eq('카드 ⋯ "폴더로 이동" · 여러 개 골라 한 번에 이동', [(t.match(/data-card-move/g) || []).length, /data-projects-select-toggle/.test(t), /data-projects-bulk-move @click="openMove\(\[\.\.\.selected\]\)"/.test(t)], [2, true, true])
  eq('검색칸 · 정렬 · 출처 칩 유지', [/v-model="query"[^>]*data-projects-search/.test(t), /v-model="sort"[^>]*data-projects-sort/.test(t), /v-for="f in SOURCE_FILTERS"/.test(t)], [true, true, true])
  eq('SQL 실행 전이면 폴더 자리를 그리지 않음 (목록은 그대로)', [/<div v-if="foldersReady"[^>]*data-projects-folders/.test(t), /v-if="foldersReady" type="button" class="pj-menu" data-card-move/.test(t), /folder: foldersReady\.value \? folder\.value : FOLDER_ALL/.test(v)], [true, true, true])
  eq('로그아웃 구독 — 폴더·고른 것도 비움', [/euchs-auth-changed/.test(v), /folders\.value = \[\]/.test(v), /selected\.value = new Set\(\)/.test(v)], [true, true, true])
  eq('내 상품·보낸 상품도 같은 작은 카드', [/class="st-grid-compact" data-export-grid/.test(shown('src/components/studio/StudioExportList.vue')), /class="st-grid-compact" data-mk-sends-grid/.test(shown('src/components/studio/StudioSendList.vue')), (shown('src/components/studio/StudioExportList.vue') + shown('src/components/studio/StudioSendList.vue')).match(/st-thumb-sq/g).length], [true, true, 2])
  const fo = read('src/lib/studioFolders.js'), pj = read('src/lib/studioProjects.js')
  eq('폴더 저장: 본인 행만 (user_id 조건을 빼지 않음) · 지우기 전에 DB로 다시 셈', [(fo.match(/\.eq\('user_id', uid\)/g) || []).length >= 5, /count: 'exact', head: true/.test(fo), /\.is\('deleted_at', null\)/.test(fo)], [true, true, true])
  eq('폴더는 몰과 연결하지 않음 (몰 코드·표를 부르지 않음)', /savedProducts|orderedProducts|saved_products|category/i.test(fo.replace(/\/\*[\s\S]*?\*\//g, '')), false)
  eq('SQL 실행 전: 칸이 없으면 폴더 없이 읽고 원인을 남김', [/error\.code === '42703'/.test(pj), /console\.error\('\[studioProjects\] studio_projects\.folder_id 칸이 없음/.test(pj), /isFolderSchemaMissing\(error\)/.test(fo), /return \{ ready: false, folders: \[\] \}/.test(fo)], [true, true, true, true])
}

// ── 5. SQL 파일 (실행은 해성이) ──
{
  const sql = read('docs/sql/2026-09-28-studio-folders.sql')
  const body = sql.slice(sql.indexOf('begin;'), sql.indexOf('commit;'))
  eq('새 표 studio_folders: id·user_id·name·sort·created_at', ['id', 'user_id', 'name', 'sort', 'created_at'].map(c => new RegExp(`\\n  ${c}\\s+`).test(body)), [true, true, true, true, true])
  eq('RLS 켬 · 정책 4개(본인 행) · anon 권한 없음', [/alter table public\.studio_folders enable row level security/.test(body), (body.match(/create policy "studio_folders /g) || []).length, /revoke all on table public\.studio_folders from anon, authenticated/.test(body), / to anon/.test(body)], [true, 4, true, false])
  eq('정책은 기존 studio_projects와 같은 방식 (본인 또는 관리자 읽기 · 본인만 쓰기)', [/for select to authenticated using \(user_id = \(select auth\.uid\(\)\) or \(select public\.is_admin_or_staff\(\)\)\)/.test(body), (body.match(/user_id = \(select auth\.uid\(\)\)/g) || []).length >= 5], [true, true])
  eq('새 표 GRANT를 같은 SQL 안에 · 바꿀 수 있는 칸은 name·sort만', [/grant select, insert, delete on table public\.studio_folders to authenticated/.test(body), /grant update \(name, sort\) on table public\.studio_folders to authenticated/.test(body), /grant select, insert, update, delete on table public\.studio_folders to service_role/.test(body)], [true, true, true])
  eq('studio_projects.folder_id + 남의 폴더를 못 넣는 외래 키 + 칸 권한', [/add column folder_id uuid/.test(body), /foreign key \(folder_id, user_id\) references public\.studio_folders \(id, user_id\)/.test(body), /on delete set null \(folder_id\)/.test(body), /grant update \(folder_id\) on table public\.studio_projects to authenticated/.test(body)], [true, true, true, true])
  eq('studio_projects 기존 정책·칸은 건드리지 않음', /drop policy|alter policy|create policy "studio_projects|drop column|alter column/.test(body), false)
  eq('studio_exports.source (download 기본 · save)', /add column source text not null default 'download' check \(source in \('download', 'save'\)\)/.test(body), true)
  eq('확인 쿼리·되돌리기(주석) 포함 · 상태 = 미실행', [/-- 확인 \(읽기 전용/.test(sql), /\/\*\s*begin;[\s\S]*drop table if exists public\.studio_folders;[\s\S]*\*\//.test(sql), /상태: 미실행/.test(sql)], [true, true, true])
}

// ── 6. 랜딩 상단 버튼 ──
{
  const land = read('src/views/studio/StudioLandingView.vue'), t = shown('src/views/studio/StudioLandingView.vue')
  const nav = t.slice(t.indexOf('<header'), t.indexOf('</header>'))
  eq('상단: [내 작업]·[로그인] 없음 · [무료로 시작하기] 하나 · 로그인 여부로 갈리지 않음', [/내 작업|로그인/.test(nav), (nav.match(/무료로 시작하기/g) || []).length, /v-if="currentUser"|v-else/.test(nav), /currentUser|openLoginModal/.test(land)], [false, 1, false, false])
  eq('히어로에도 [무료로 시작하기] · 누르면 작업 홈으로 (로그인 전이면 가드가 로그인 창)', [(t.match(/data-land-start @click="start"/g) || []).length >= 2, /function start\(\) \{\s*router\.push\(\{ name: 'studio-projects' \}\)/.test(land)], [true, true])
}

// ── 7. 1688 주소 입력줄 ──
{
  const home = read('src/views/studio/StudioHomeView.vue'), t = shown('src/views/studio/StudioHomeView.vue')
  const hex = /\.url-input \{[^}]*border: 1\.5px solid #([0-9a-f]{6})/i.exec(home)?.[1] || ''
  const lum = hex ? [0, 2, 4].reduce((s, i) => s + parseInt(hex.slice(i, i + 2), 16), 0) : 999
  eq('입력칸: 흰 바탕 · 테두리 #CBD5E1보다 진함 · 포커스 파란 테두리', [/\.url-input \{[^}]*background: #fff/.test(home), lum <= 0xcb + 0xd5 + 0xe1, /\.url-input:focus \{ border-color: var\(--st-accent\)/.test(home)], [true, true, true])
  eq('라벨 "1688 주소" 진한 글씨(늘 보임) · placeholder 읽히는 회색 · [가져오기] 파란 채움', [/<label for="studio-url-input" class="url-label">/.test(t), /\.url-label \{[^}]*font-weight: 800; color: var\(--st-ink\)/.test(home), /hidden sm:inline/.test(t.slice(t.indexOf('data-url-row'), t.indexOf('data-url-submit'))), /\.url-input::placeholder \{ color: #64748b; \}/.test(home), /class="st-btn st-btn-primary url-btn"/.test(t)], [true, true, false, true, true])
  eq('폰에서는 한 줄 전체 폭', /@media \(max-width: 639px\) \{\s*\.url-label, \.url-input, \.url-btn \{ flex: 1 1 100%; width: 100%; \}/.test(home), true)
}

// ── 8. 편집기 [다운로드] · [작업 저장] ──
{
  const ed = read('src/views/studio/StudioEditorView.vue'), top = shown('src/views/studio/StudioEditorView.vue')
  const modal = read('src/components/studio/StudioExportModal.vue'), mt = shown('src/components/studio/StudioExportModal.vue')
  eq('상단: [작업 저장](보조)이 [다운로드](파란 채움) 왼쪽 · [내보내기] 없음', [top.indexOf('data-top-save') > 0 && top.indexOf('data-top-save') < top.indexOf('data-top-export'), /class="st-btn" :disabled="[^"]*" data-top-save @click="openSave">/.test(top), /class="st-btn st-btn-primary"[^>]*data-top-export[^>]*@click="openExport">[^<]*<Download[^>]*\/> 다운로드<\/button>/.test(top), />\s*내보내기\s*</.test(top)], [true, true, true, false])
  eq('[작업 저장] = 같은 창을 save-only로 · 받지 않음', [/exportSaveOnly\.value = true/.test(ed), /:save-only="exportSaveOnly"/.test(top), /if \(!props\.saveOnly\) download\(out\.blob, name\)/.test(modal), /source: props\.saveOnly \? 'save' : undefined/.test(modal)], [true, true, true, true])
  eq('저장 뒤 작은 창: "내 상품에 저장됐어요" + [판매처로 보내기]·[내 작업으로 가기]·[계속 편집]', [/내 상품에 저장됐어요/.test(mt), /data-export-saved-send[^>]*>판매처로 보내기</.test(mt), /data-export-saved-home[^>]*>내 작업으로 가기</.test(mt), /data-export-saved-continue[^>]*>계속 편집</.test(mt), /:wide="!saveOnly"/.test(mt)], [true, true, true, true, true])
  eq('전부 보관됐을 때만 내 상품 카드로 확정 (일부만 된 결과물로 예전 카드를 바꾸지 않음)', [/a\.state !== 'saved' \|\| a\.saved !== total/.test(modal), /await commitSave\(archiveId\)/.test(modal)], [true, true])
  eq('[다운로드] 창: 받으면 내 상품에도 보관 (예전 그대로) · 창 이름 "다운로드"', [/await archiveOne\(file, out\.blob, name\)/.test(modal), /:title="saveOnly \? '작업 저장' : '다운로드'"/.test(mt)], [true, true])
  eq('자동저장 표시("저장됨")는 그대로', /저장됨/.test(ed), true)
  eq('내 상품 카드 [다시 받기]는 그대로', /'다시 받기'/.test(read('src/components/studio/StudioExportList.vue')), true)
  // 화면에 보이는 "내보내기" — 주석·로그·개발용 비교 화면을 빼고 0건
  const files = (function walk(dir) { return fs.readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(vue|js)$/.test(e.name) ? [`${dir}/${e.name}`] : []) })('src')
  const strip = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/console\.\w+\([^\n]*/g, '')
  const left = files.filter(p => !p.includes('__harness__') && p !== 'src/components/studio/StudioExportCompare.vue' && !/^src\/(views\/dashboard|utils)\//.test(p) && /내보내기/.test(strip(read(p))))
  eq('스튜디오 화면 글자에 "내보내기" 없음 (주석·로그·개발용 비교 화면·몰 제외)', left, [])
  eq('진행 단계 ③ · 가이드 문구', [/label: '다운로드'/.test(read('src/lib/studioSteps.js')), /\[다운로드\]로 이미지를 받아/.test(read('src/data/studioEditorGuide.js')), /\[작업 저장\]/.test(read('src/data/studioEditorGuide.js'))], [true, true, true])
}

// ── 9. 베타 표시 ──
{
  const land = read('src/views/studio/StudioLandingView.vue'), lay = read('src/layouts/StudioLayout.vue')
  eq('문구는 한 곳(studioBeta.js)', [B.BETA_BADGE, B.BETA_NOTE, B.heroEyebrow()], ['BETA', '베타 기간에는 무료로 쓸 수 있어요. 요금이 생기면 시작 전에 미리 알려 드려요.', { lead: 'EUCHS 상세페이지 작업실 · 베타', free: '구매 고객 무료' }])
  eq('히어로 윗줄 = "EUCHS 상세페이지 작업실 · 베타 · 구매 고객 무료"', `${B.heroEyebrow().lead} · ${B.heroEyebrow().free}`, 'EUCHS 상세페이지 작업실 · 베타 · 구매 고객 무료')
  eq('랜딩·사이드바가 같은 상수를 씀 (화면에 직접 쓴 글자 없음)', [/from '@\/lib\/studioBeta'/.test(land), /from '@\/lib\/studioBeta'/.test(lay), /베타 기간에는|>BETA<|· 베타 ·/.test(land + lay)], [true, true, false])
  eq('로고 옆 배지: 랜딩 상단 1 · 사이드바 2(넓은 화면·좁은 화면 서랍)', [(shown('src/views/studio/StudioLandingView.vue').match(/data-beta-badge/g) || []).length, (shown('src/layouts/StudioLayout.vue').match(/data-beta-badge/g) || []).length], [1, 2])
  eq('안내 한 줄: 랜딩 "이용 안내" · 사이드바 "이유씨 고객 혜택" 카드', [/이용 안내<\/h2>[\s\S]{0,200}data-beta-note>\{\{ BETA_NOTE \}\}/.test(land), /이유씨 고객 혜택<\/div>[\s\S]{0,400}data-beta-note>\{\{ BETA_NOTE \}\}/.test(lay)], [true, true])
  eq('날짜·"곧"·"준비 중" 없음', /\d{4}|\d+월|\d+일|곧|준비 중/.test(`${B.BETA_BADGE}${B.BETA_WORD}${B.BETA_NOTE}${B.heroEyebrow().lead}`), false)
}

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
