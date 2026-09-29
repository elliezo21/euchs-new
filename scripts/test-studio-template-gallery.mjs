// 템플릿 고르기 화면 테스트 — node scripts/test-studio-template-gallery.mjs
// 거르기 값(분위기·색)·카드 글자·거르기 함수 · [이 템플릿으로 시작] 기억 규칙 · 내 보관함 SQL·표 없음 처리 · 화면 연결(메뉴·라우트·패널·미리보기·캐시)
import fs from 'node:fs'
import {
  STUDIO_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_MOODS, TEMPLATE_COLORS, templateByKey, filterTemplates,
  templateName, templateCardTitle, templateSectionCount, templateMoodLabel,
} from '../src/lib/studioTemplates.js'
import {
  savePendingTemplate, readPendingTemplate, clearPendingTemplate, pendingFitsProject, PENDING_TEMPLATE_KEY, PENDING_TTL_MS,
} from '../src/lib/studioTemplateStart.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const memStore = () => {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }
}

// ── 1. 거르기 값 ──
{
  const moods = new Set(TEMPLATE_MOODS.map(m => m.key)), colors = new Set(TEMPLATE_COLORS.map(c => c.key)), cats = new Set(TEMPLATE_CATEGORIES.map(c => c.key))
  eq('템플릿 20개', STUDIO_TEMPLATES.length, 20)
  eq('모든 템플릿: 카테고리·분위기·색이 목록 안', STUDIO_TEMPLATES.filter(t => !cats.has(t.category) || !moods.has(t.mood) || !colors.has(t.color)).map(t => t.key), [])
  eq('모든 템플릿: 대표색 #rrggbb', STUDIO_TEMPLATES.every(t => /^#[0-9a-f]{6}$/i.test(t.swatch)), true)
  eq('분위기마다 1개 이상', TEMPLATE_MOODS.map(m => STUDIO_TEMPLATES.some(t => t.mood === m.key)), TEMPLATE_MOODS.map(() => true))
  eq('색마다 1개 이상', TEMPLATE_COLORS.map(c => STUDIO_TEMPLATES.some(t => t.color === c.key)), TEMPLATE_COLORS.map(() => true))
}

// ── 2. 카드 글자 ──
{
  eq('이름: "카테고리 · " 앞머리를 뺌', [templateName(templateByKey('apparel-look')), templateName(templateByKey('electronics-spec')), templateName(templateByKey('basic'))], ['룩북', '사양표', '기본 상세'])
  eq('카드 글자 "카테고리 | 이름"', [templateCardTitle(templateByKey('apparel-look')), templateCardTitle(templateByKey('basic')), templateCardTitle(templateByKey('fullset-sample'))], ['의류 | 룩북', '기본 | 기본 상세', '풀세트 | 샘플'])
  eq('섹션 수 = 템플릿 구간 수', [templateSectionCount(templateByKey('basic')), templateSectionCount(templateByKey('fullset-sample')), templateSectionCount(null)], [6, 11, 0])
  eq('분위기 이름', [templateMoodLabel(templateByKey('kitchen-bold')), templateMoodLabel(templateByKey('beauty-mood')), templateMoodLabel({})], ['강렬한', '감성', ''])
}

// ── 3. 거르기 ──
{
  eq('조건 없음 = 전부(목록 순서)', filterTemplates({}).map(t => t.key), STUDIO_TEMPLATES.map(t => t.key))
  eq("'all'·빈 값은 안 봄", filterTemplates({ category: 'all', mood: '', color: null }).length, 20)
  eq('카테고리', filterTemplates({ category: 'kitchen' }).map(t => t.key), ['kitchen-bold', 'kitchen-check'])
  eq('카테고리 + 분위기', filterTemplates({ category: 'kitchen', mood: 'bold' }).map(t => t.key), ['kitchen-bold'])
  eq('색', filterTemplates({ color: 'pink' }).map(t => t.key), ['beauty-mood', 'toys-basic'])
  eq('내 보관함(keys) — Set·배열 모두, 목록 순서', [filterTemplates({ keys: new Set(['pets-mood', 'basic']) }).map(t => t.key), filterTemplates({ keys: ['size'] }).map(t => t.key)], [['basic', 'pets-mood'], ['size']])
  eq('내 보관함 비었음 = 0개', filterTemplates({ keys: new Set() }).length, 0)
  eq('맞는 것 없음 = 빈 목록', filterTemplates({ category: 'pets', color: 'mono' }), [])
}

// ── 4. [이 템플릿으로 시작] 기억 (sessionStorage) ──
{
  const s = memStore()
  const t0 = 1_800_000_000_000
  eq('저장 → 읽기', [savePendingTemplate(s, 'kitchen-bold', t0), readPendingTemplate(s, t0 + 1000)], [true, { key: 'kitchen-bold', at: t0 }])
  eq('30분 지나면 잊음', readPendingTemplate(s, t0 + PENDING_TTL_MS + 1), null)
  eq('저장소 없음 = null·false', [readPendingTemplate(null), savePendingTemplate(null, 'x')], [null, false])
  s.setItem(PENDING_TEMPLATE_KEY, '{깨진')
  const errs = []
  const origErr = console.error
  console.error = (...a) => errs.push(a.join(' '))
  const broken = readPendingTemplate(s, t0)
  console.error = origErr
  eq('깨진 값 = null + 원인 로그', [broken, errs.length], [null, 1])
  savePendingTemplate(s, 'basic', t0)
  clearPendingTemplate(s)
  eq('지우기', readPendingTemplate(s, t0), null)
  const p = { key: 'basic', at: t0 }
  eq('고른 뒤에 만든 작업만 (서버 시각 여유 1분)', [
    pendingFitsProject(p, new Date(t0 + 5000).toISOString()),
    pendingFitsProject(p, new Date(t0 - 30_000).toISOString()),
    pendingFitsProject(p, new Date(t0 - 3_600_000).toISOString()),
    pendingFitsProject(p, 'x'), pendingFitsProject(null, new Date(t0).toISOString()),
  ], [true, true, false, false, false])
  const editor = read('src/views/studio/StudioEditorView.vue')
  eq('편집기: 불러오기 끝에 기억한 템플릿 → 시작 화면이면 askTemplate(같은 길)', [
    /startPendingTemplate\(\) \/\/ 템플릿 갤러리/.test(editor),
    /clearPendingTemplate\(store\)\s*\n\s*askTemplate\(pending\.key\)/.test(editor),
    /if \(!canStartBlank\(usableImagesNow\(\)\.length\)\) return/.test(editor),
  ], [true, true, true])
}

// ── 5. 내 보관함 — 계정 저장(표) · 표가 없으면 멈춤 ──
{
  const sql = read('docs/sql/2026-09-29-studio-template-favorites.sql')
  eq('SQL: 새 표 + RLS + 정책 3 + GRANT(authenticated select·insert·delete, anon 없음)', [
    /create table public\.studio_template_favorites/.test(sql), /enable row level security/.test(sql),
    (sql.match(/^create policy /gm) || []).length,
    /grant select, insert, delete on table public\.studio_template_favorites to authenticated;/.test(sql),
    /revoke all on table public\.studio_template_favorites from anon, authenticated;/.test(sql),
    /to anon/.test(sql.replace(/from anon/g, '')),
  ], [true, true, 3, true, true, false])
  const keyRe = new RegExp(/check \(template_key ~ '([^']+)'\)/.exec(sql)[1])
  eq('SQL key 검사가 모든 템플릿 key를 받음', STUDIO_TEMPLATES.filter(t => !keyRe.test(t.key)).map(t => t.key), [])
  const fav = read('src/lib/studioTemplateFavorites.js')
  eq('저장 = supabase 표 (브라우저 저장소 안 씀) · user_id 조건', [/from\(TABLE\)/.test(fav), /localStorage|sessionStorage/.test(fav.replace(/\/\*[\s\S]*?\*\//g, '')), /\.eq\('user_id', uid\)/.test(fav)], [true, false, true])
  eq('표 없음(42P01·PGRST205) → ready false + console.error', [/\['42P01', 'PGRST205'\]/.test(fav), /favorites\.ready = false/.test(fav), /console\.error\('\[studioTemplateFavorites\] studio_template_favorites를 쓸 수 없음/.test(fav)], [true, true, true])
  eq('ready가 아니면 하트 동작 안 함 · 로그아웃 구독', [/favorites\.ready !== true/.test(fav), /euchs-auth-changed/.test(fav)], [true, true])
  const card = read('src/components/studio/StudioTemplateCard.vue')
  eq('카드: 하트는 보이되 ready가 아니면 눌리지 않음', /:disabled="favReady !== true \|\| favBusy"/.test(card), true)
}

// ── 6. 화면 연결 ──
{
  const layout = read('src/layouts/StudioLayout.vue'), router = read('src/router/index.js')
  eq('사이드바 [템플릿] = 갤러리 링크 · "준비 중" 배지 없음', [/\{ name: 'studio-templates', label: '템플릿'/.test(layout), /준비 중/.test(layout)], [true, false])
  eq('라우트 /studio/templates (STUDIO_PROTECTED)', /path: 'templates',\s*name: 'studio-templates',[\s\S]{0,120}meta: \{ \.\.\.STUDIO_PROTECTED/.test(router), true)
  const panel = read('src/components/studio/StudioTemplatePanel.vue')
  eq('패널: 탭 2개 · 개수 · 카테고리·분위기 거르기 · 2줄 격자', [/전체 템플릿/.test(panel) && /내 보관함/.test(panel), /data-template-count/.test(panel), /data-template-filter="category"/.test(panel) && /data-template-filter="mood"/.test(panel), /'grid-cols-2'/.test(panel)], [true, true, true, true])
  eq('패널: 카드 누르기 = 미리보기만, [이 템플릿 쓰기]에서만 apply', [/@open="previewKey = \$event"/.test(panel), (panel.match(/emit\('apply'/g) || []).length, /action-label="이 템플릿 쓰기"/.test(panel)], [true, 1, true])
  const gallery = read('src/views/studio/StudioTemplatesView.vue')
  eq('갤러리: 카테고리 칩·분위기·색·큰 카드·[이 템플릿으로 시작]', [/data-gallery-categories/.test(gallery), /data-gallery-moods/.test(gallery), /data-gallery-colors/.test(gallery), /\blarge\b/.test(gallery), /action-label="이 템플릿으로 시작"/.test(gallery)], [true, true, true, true, true])
  eq('갤러리: 데스크톱 4~5열', [/repeat\(4, minmax\(0, 1fr\)\)/.test(gallery), /repeat\(5, minmax\(0, 1fr\)\)/.test(gallery)], [true, true])
  eq('갤러리: 로그아웃 구독', /euchs-auth-changed/.test(gallery), true)
  const card = read('src/components/studio/StudioTemplateCard.vue')
  eq('카드: 표지·"카테고리 | 이름"·섹션 수·하트', [/data-template-cover/.test(card), /templateCardTitle/.test(card), /섹션 \{\{ sections \}\}개/.test(card), /data-template-fav/.test(card)], [true, true, true, true])
  const prev = read('src/components/studio/StudioTemplatePreview.vue')
  eq('미리보기: [닫기]·쓰기 버튼·전체 그림 스크롤·Esc', [/data-template-preview-close/.test(prev), /data-template-preview-use/.test(prev), /overflow-y: auto/.test(prev), /e\.key === 'Escape'/.test(prev)], [true, true, true, true])
  const thumbs = read('src/lib/studioTemplateThumbs.js')
  eq('그림: 내보내기 엔진(renderPage)·적용과 같은 문서(templatePreviewPage) · key별 캐시', [/import \{ renderPage, canvasToBlob \} from '\.\/studioExport\.js'/.test(thumbs), /templatePreviewPage\(tpl, \[\], measure\)/.test(thumbs), /if \(cache\.has\(key\)\) return cache\.get\(key\)/.test(thumbs)], [true, true, true])
  eq('그림: 글꼴을 받은 뒤에 재고 그림', thumbs.indexOf('loadFontsFor(templateFontList(tpl))') < thumbs.indexOf('templatePreviewPage(tpl, [], measure)'), true)
  const home = read('src/views/studio/StudioHomeView.vue')
  eq('내 작업: 고른 템플릿 안내 + [템플릿 없이 시작]', [/data-pending-template/.test(home), /cancelPendingTemplate/.test(home)], [true, true])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
