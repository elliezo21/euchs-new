// 템플릿 고르기 화면 테스트 — node scripts/test-studio-template-gallery.mjs
// 거르기 값(분위기·색)·카드 글자·거르기 함수 · 내 보관함 SQL·표 없음 처리 · 화면 연결(메뉴·라우트·패널·미리보기·캐시)
import fs from 'node:fs'
import {
  STUDIO_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_MOODS, TEMPLATE_COLORS, templateByKey, filterTemplates,
  templateName, templateCardTitle, templateSectionCount, templateMoodLabel,
} from '../src/lib/studioTemplates.js'
import { templateColorOf } from '../src/lib/studioTemplateSets.js'
import { HERO_SPECS } from '../src/lib/studioTemplateHeroes.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── 1. 거르기 값 ──
{
  const moods = new Set(TEMPLATE_MOODS.map(m => m.key)), colors = new Set(TEMPLATE_COLORS.map(c => c.key)), cats = new Set(TEMPLATE_CATEGORIES.map(c => c.key))
  eq('템플릿 94개 (기본 3 · 카테고리 17 · 새 템플릿 18 · 안내·이벤트 22 · 촬영 세트 34)', STUDIO_TEMPLATES.length, 94)
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
  eq("'all'·빈 값은 안 봄", filterTemplates({ category: 'all', mood: '', color: null }).length, 94)
  eq('카테고리', filterTemplates({ category: 'kitchen' }).map(t => t.key), ['kitchen-bold', 'kitchen-check'])
  eq('카테고리 + 분위기', filterTemplates({ category: 'kitchen', mood: 'bold' }).map(t => t.key), ['kitchen-bold'])
  eq('색 (목록 순서 — 갤러리 순서)', filterTemplates({ color: 'pink' }).map(t => t.key), STUDIO_TEMPLATES.filter(t => t.color === 'pink').map(t => t.key))
  // 색 = 카드에 보이는 첫 화면 바탕 계열(tone — 사진 덮개 구도는 덮개 색) 한 곳에서 (studioTemplateSets.templateColorOf)
  eq('색 — 분홍 템플릿', filterTemplates({ color: 'pink' }).map(t => t.key).sort(), ['apparel-trendy', 'beauty-mood', 'event-benefits', 'event-photo-review', 'shoot-baby', 'shoot-hair-accessory'])
  eq('색 — 보라 템플릿 (뷰티 | 체크리스트는 초록이 아님)', filterTemplates({ color: 'purple' }).map(t => t.key).sort(), ['beauty-check', 'event-free-gift', 'event-restock', 'living-basic', 'shoot-socks'])
  eq('색 — 초록에 보라·파랑 없음', filterTemplates({ color: 'green' }).filter(t => ['purple', 'blue', 'pink'].includes(t.tone)).map(t => t.key), [])
  eq('색 = tone 규칙 (94개 전부 — 사진 덮개 구도는 첫 화면 바탕색)', STUDIO_TEMPLATES.filter(t => t.color !== templateColorOf(t.tone, t.sections[0].bg)).map(t => t.key), [])
  eq('첫 화면 바탕색 = 첫 화면 사양의 bg (예전 38개)', STUDIO_TEMPLATES.filter(t => HERO_SPECS[t.key] && HERO_SPECS[t.key].bg !== t.sections[0].bg).map(t => t.key), [])
  eq('사진 덮개 구도 = 덮개 색', ['basic', 'bags-check', 'pets-bold', 'apparel-mono', 'living-warm'].map(k => templateByKey(k).color), ['mono', 'green', 'green', 'mono', 'warm'])
  eq('내 보관함(keys) — Set·배열 모두, 목록 순서', [filterTemplates({ keys: new Set(['pets-mood', 'basic']) }).map(t => t.key), filterTemplates({ keys: ['size'] }).map(t => t.key)], [['basic', 'pets-mood'], ['size']])
  eq('내 보관함 비었음 = 0개', filterTemplates({ keys: new Set() }).length, 0)
  eq('맞는 것 없음 = 빈 목록', filterTemplates({ category: 'pets', color: 'mono' }), [])
}

// ── 4. [이 템플릿으로 시작] = 사진 없이 빈 작업 (test-studio-project-blank.mjs가 서버·편집기 연결을 본다) ──

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
  eq('라우트 /studio/templates = 누구나 구경 (STUDIO_PUBLIC — admin 모드면 보호 그대로)', [/path: 'templates',\s*name: 'studio-templates',[\s\S]{0,120}meta: \{ \.\.\.STUDIO_PUBLIC/.test(router), router.includes("const STUDIO_PUBLIC = STUDIO_MODE === 'admin' ? STUDIO_PROTECTED : {}")], [true, true])
  const gal = read('src/views/studio/StudioTemplatesView.vue')
  eq('[이 템플릿으로 시작] = 작업 시작 관문 뒤에 · 로그인하면 ?start=key로 이어서', [/if \(!\(await studioGate\(`\/studio\/templates\?start=\$\{encodeURIComponent\(key\)\}`\)\)\) \{ previewKey\.value = ''; return \}\s+const \{ projectId \} = await createBlankProject/.test(gal), /watch\(\(\) => \[route\.query\.start, currentUser\.value\?\.id\]/.test(gal)], [true, true])
  const panel = read('src/components/studio/StudioTemplatePanel.vue')
  eq('패널: 탭 2개 · 개수 · 카테고리·분위기 거르기 · 2줄 격자', [/전체 템플릿/.test(panel) && /내 보관함/.test(panel), /data-template-count/.test(panel), /data-template-filter="category"/.test(panel) && /data-template-filter="mood"/.test(panel), /'grid-cols-2'/.test(panel)], [true, true, true, true])
  eq('패널: 카드 누르기 = 미리보기만, [이 템플릿 쓰기]에서만 apply', [/@open="previewKey = \$event"/.test(panel), (panel.match(/emit\('apply'/g) || []).length, /action-label="이 템플릿 쓰기"/.test(panel)], [true, 1, true])
  const gallery = read('src/views/studio/StudioTemplatesView.vue')
  eq('갤러리: 카테고리 칩·분위기·색·큰 카드·[이 템플릿으로 시작]', [/data-gallery-categories/.test(gallery), /data-gallery-moods/.test(gallery), /data-gallery-colors/.test(gallery), /\blarge\b/.test(gallery), /'이 템플릿으로 시작'/.test(gallery)], [true, true, true, true, true])
  eq('갤러리: 데스크톱 4~5열', [/repeat\(4, minmax\(0, 1fr\)\)/.test(gallery), /repeat\(5, minmax\(0, 1fr\)\)/.test(gallery)], [true, true])
  eq('갤러리: 로그아웃 구독', /euchs-auth-changed/.test(gallery), true)
  const card = read('src/components/studio/StudioTemplateCard.vue')
  eq('카드: 표지·"카테고리 | 이름"·섹션 수·하트', [/data-template-cover/.test(card), /templateCardTitle/.test(card), /섹션 \{\{ sections \}\}개/.test(card), /data-template-fav/.test(card)], [true, true, true, true])
  const prev = read('src/components/studio/StudioTemplatePreview.vue')
  eq('미리보기: [닫기]·쓰기 버튼·전체 그림 스크롤·Esc', [/data-template-preview-close/.test(prev), /data-template-preview-use/.test(prev), /overflow-y: auto/.test(prev), /e\.key === 'Escape'/.test(prev)], [true, true, true, true])
  const thumbs = read('src/lib/studioTemplateThumbs.js')
  eq('그림: 내보내기 엔진(renderPage)·적용과 같은 문서(templatePreviewPage) · key별 캐시', [/import \{ renderPage, canvasToBlob \} from '\.\/studioExport\.js'/.test(thumbs), /templatePreviewPage\(tpl, \[\], measure, samples\)/.test(thumbs), /if \(cache\.has\(key\)\) return cache\.get\(key\)/.test(thumbs)], [true, true, true])
  eq('그림: 글꼴을 받은 뒤에 재고 그림', thumbs.indexOf('loadFontsFor(templateFontList(tpl))') < thumbs.indexOf('templatePreviewPage(tpl, [], measure, samples)'), true)
  eq('내 작업: 예전 기억해 두기 안내 줄 없음', /data-pending-template/.test(read('src/views/studio/StudioHomeView.vue')), false)
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
