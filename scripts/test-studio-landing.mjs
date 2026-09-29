// 스튜디오 랜딩 테스트 — node scripts/test-studio-landing.mjs
// 사진 설정 한 곳(모든 장면 키·짝 맞음·1688 사진 없음) · gsap은 랜딩 모션 파일에서만(동적 import) · 주소 구조(대문 누구나·작업 홈 보호)
import fs from 'node:fs'
import { LANDING_MEDIA } from '../src/data/studioLandingMedia.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(60)} ${ok ? '' : `${JSON.stringify(got)}  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const isImg = v => typeof v === 'string' && (v.startsWith('data:image/') || /^\/studio-landing\/[\w.-]+\.(webp|png|jpg|svg)$/.test(v))

// ── 1. 사진 설정 ──
const M = LANDING_MEDIA
eq('장면 키 6개', Object.keys(M), ['hero', 'erase', 'background', 'oneClick', 'editor', 'export'])
eq('히어로·지우기: 원본·지운 뒤 짝', [M.hero.before, M.hero.after, M.erase.before, M.erase.after].every(isImg), true)
eq('원본과 지운 뒤는 다른 그림', [M.hero.before !== M.hero.after, M.erase.before !== M.erase.after], [true, true])
eq('글자 자리: % 안(0~100)', M.erase.boxes.every(b => b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0 && b.x + b.w <= 100 && b.y + b.h <= 100), true)
eq('배경: 원래·제품만·AI 배경 사진 + 단색', [isImg(M.background.original), isImg(M.background.cutout), isImg(M.background.aiBackground), /^#[0-9a-f]{6}$/i.test(M.background.solidColor)], [true, true, true, true])
eq('원클릭 사진 5장 · 각 원본·지운 뒤', [M.oneClick.photos.length, M.oneClick.photos.every(p => isImg(p.before) && isImg(p.after))], [5, true])
eq('편집·내보내기 사진', [isImg(M.editor.photo), M.export.pagePhotos.length, M.export.pagePhotos.every(isImg)], [true, 3, true])
const all = JSON.stringify(M)
eq('1688·알리 사진 주소 없음 (alicdn·1688.com)', /alicdn|1688\.com|cbu01/.test(all), false)
eq('밖 주소 사진 없음 (http로 시작하는 값 없음)', /"https?:\/\//.test(all), false)

// ── 2. gsap은 랜딩 모션 파일에만 ──
const srcFiles = []
const walk = d => { for (const f of fs.readdirSync(new URL(`../${d}`, import.meta.url), { withFileTypes: true })) { const p = `${d}/${f.name}`; f.isDirectory() ? walk(p) : /\.(js|vue|mjs)$/.test(f.name) && srcFiles.push(p) } }
walk('src')
const gsapUsers = srcFiles.filter(p => /from ['"]gsap|import\(['"]gsap/.test(read(p)))
eq('gsap을 부르는 파일 = studioLandingMotion.js 하나', gsapUsers, ['src/lib/studioLandingMotion.js'])
const motionUsers = srcFiles.filter(p => p !== 'src/lib/studioLandingMotion.js' && /studioLandingMotion/.test(read(p)))
eq('모션 파일을 부르는 곳 = 랜딩 하나', motionUsers, ['src/views/studio/StudioLandingView.vue'])
const landing = read('src/views/studio/StudioLandingView.vue')
eq('랜딩은 모션 파일을 동적 import (정적 import 아님)', [/await import\(['"]@\/lib\/studioLandingMotion['"]\)/.test(landing), /^import .*studioLandingMotion/m.test(landing)], [true, false])
eq('움직임 줄이기면 모션을 불러오지 않음 (첫 그리기부터 정지)', /const isStatic = ref\(!!window\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)\.matches\)/.test(landing) && /if \(isStatic\.value\) return/.test(landing), true)
eq('판매처 이름은 글자만 (로고 이미지 없음) · 쿠팡만 활성, 나머지 3곳 "준비 중" 배지', /import \{ MARKETS \} from '@\/lib\/studioMarketplaceRules'/.test(landing) && !/const MARKETS =/.test(landing) && /<span v-if="m\.soon" class="mk-soon">준비 중<\/span>/.test(landing) && !/logo[^"]*\.(png|svg|webp)/i.test(landing), true)
eq("페이지에 '중국'이라는 글자가 없음 (랜딩·사진 설정·임시 그림·모션)",
  ['src/views/studio/StudioLandingView.vue', 'src/data/studioLandingMedia.js', 'src/data/studioLandingPlaceholders.js', 'src/lib/studioLandingMotion.js'].filter(p => read(p).includes('중국')), [])
{
  // 스튜디오는 중국 상품 전용이 아니다 (해성 결정) — 고객에게 보이는 문구에 "중국"·"중문"·"한자"를 쓰지 않는다.
  // 대상 = 스튜디오 화면·부품·스튜디오 lib·data·스튜디오 composable·레이아웃. 주석(/* */, //, <!-- -->)은 빼고 본다 (코드 설명은 그대로 둬도 됨)
  const stripComments = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
  const studioFiles = srcFiles.filter(p =>
    /^src\/(views|components)\/studio\//.test(p) || /^src\/lib\/studio/.test(p) || /^src\/data\/studio/.test(p) ||
    p === 'src/layouts/StudioLayout.vue' || (/^src\/composables\//.test(p) && /studio/i.test(read(p))))
  const hits = studioFiles.flatMap(p => stripComments(read(p)).split('\n').map((l, i) => [p, i + 1, l]).filter(([, , l]) => /중국|중문|한자/.test(l)).map(([p, n, l]) => `${p}:${n} ${l.trim().slice(0, 60)}`))
  eq(`스튜디오 화면 파일 전체(${studioFiles.length}개, 주석 제외)에 '중국'·'중문'·'한자' 없음`, hits, [])
}
eq('랜딩 히어로 버튼 = [사용법 보기] → 만드는 순서로 이동', /@click="scrollToSteps">사용법 보기</.test(landing) && /ref="stepsRef" id="steps"/.test(landing), true)
eq('여는 시점을 약속하는 문구 없음 (지금 바로·먼저 알려·지금 시작)', /지금 바로|먼저 알려|지금 시작/.test(landing), false)
// 쿠팡 타일 설명은 한 줄만, 사정 설명 문구 없음 (해성 지시 2026-09-28 — push 전 마지막 수정)
eq('쿠팡 타일 설명 = 한 줄', /쿠팡으로 바로 보내기<\/h3>\s*<p class="tile-p">상세페이지·상품명·검색태그·옵션·가격·대표이미지·고시정보·배송정보까지 한 번에 보내요\.<\/p>/.test(landing), true)
eq('랜딩 화면 글자(주석 제외)에 "곧"·"준비 중이라"·"관리자"·"이어서 준비" 없음', /곧|준비 중이라|관리자|이어서 준비/.test(landing.slice(landing.indexOf('<template>'), landing.indexOf('<script')).replace(/<!--[\s\S]*?-->/g, '') + landing.slice(landing.indexOf('<script'), landing.indexOf('<style')).replace(/\/\/.*$/gm, '')), false)
eq('이용 안내 카드: 무료 · 이유씨컴퍼니 고객 / 준비 중 · 일반 고객', [/>무료</.test(landing), /이유씨컴퍼니 고객</.test(landing), />준비 중</.test(landing), /일반 고객</.test(landing), /준비 중이에요/.test(landing)], [true, true, true, true, true])
{
  const motion = read('src/lib/studioLandingMotion.js').replace(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm, '') // 주석 빼고
  eq('화면 고정 없음 = pin-spacer 0개 (pin·scrub 없음)', [/\bpin\s*:/.test(motion), /\bscrub\s*:/.test(motion)], [false, false])
  eq('snap·휠 가로채기·부드러운 스크롤 없음', /snap|addEventListener\('wheel'|lenis/i.test(motion + landing), false)
  eq('보이면 재생 · 완전히 나가면 되돌림 (장면 4개 + 떠오름)', [
    (motion.match(/playWhenSeen\((hero|erase|oc|ex),/g) || []).length,
    /start: PLAY_AT, end: PLAY_BACK_AT, onEnter: play, onEnterBack: play/.test(motion),
    /start: 'top bottom', end: 'bottom top',\s*onLeave:[^\n]*reset\(\)[\s\S]{0,60}onLeaveBack:[^\n]*reset\(\)/.test(motion),
    /playWhenSeen\(el, timelinePlayer\(tl\)\)/.test(motion),
  ], [4, true, true, true])
}
{
  // 영상 칸 — 기본은 비어 있음 → 코드 애니메이션
  const scenes = ['hero', 'erase', 'background', 'oneClick', 'editor', 'export']
  eq("장면마다 video 칸 = '' (비어 있음) · poster 사진 있음", scenes.map(k => [M[k].video, isImg(M[k].poster)]), scenes.map(() => ['', true]))
  // 영상 자리 = 글자 지우기 타일(erase). 첫 화면 편집기 틀(editor)은 2026-09-29 그림 배경으로 바뀌며 빠짐(editor 사진 설정은 남김)
  eq('video가 비어 있으면 코드 그림 (지우기 타일: v-if 영상 / v-else 코드)', /<SceneVideo v-if="M\.erase\.video"[^>]*\/>\s*<div v-else/.test(landing), true)
  eq('영상 속성: autoplay·muted·loop·playsinline·preload metadata·poster', /autoplay: true, muted: true, loop: true, playsinline: true,\s*preload: 'metadata'/.test(landing) && /poster: props\.media\.poster/.test(landing), true)
  eq('움직임 줄이기면 영상 대신 poster 정지 사진', /props\.still\s*\?\s*h\('img', \{ src: props\.media\.poster/.test(landing) && /:still="isStatic"/.test(landing), true)
  const motion = read('src/lib/studioLandingMotion.js')
  eq('영상: 화면 밖 pause · 다시 들어오면 처음부터 play', /video\.currentTime = 0\s*const p = video\.play\(\)/.test(motion) && /reset: \(\) => \{ video\.pause\(\); video\.currentTime = 0 \}/.test(motion), true)
}
{
  // 첫 화면 그림 배경 (2026-09-29) — webp 두 장 · lazy 없음 · 미리 불러오기 · 원본 png는 저장소에 없음
  const tpl = landing.slice(0, landing.indexOf('<script'))
  const hero = /<section class="land-hero">([\s\S]*?)<\/section>/.exec(tpl)?.[1] || ''
  const webp = p => { try { const b = fs.readFileSync(new URL(`../public${p}`, import.meta.url)); return b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' } catch { return false } }
  eq('그림 파일 = public/studio-landing/hero-pc.webp·hero-mobile.webp (진짜 webp)', [webp('/studio-landing/hero-pc.webp'), webp('/studio-landing/hero-mobile.webp')], [true, true])
  eq('원본 hero_clean.png는 저장소에 없음', fs.existsSync(new URL('../public/studio-landing/hero_clean.png', import.meta.url)), false)
  eq('640px 이상 = PC 그림 · 아래 = 모바일 그림 (picture 한 개)', [/pc: '\/studio-landing\/hero-pc\.webp'/.test(landing), /mobile: '\/studio-landing\/hero-mobile\.webp'/.test(landing), /pcMedia: '\(min-width: 640px\)'/.test(landing), /<source :media="HERO_IMG\.pcMedia" :srcset="HERO_IMG\.pc"/.test(hero)], [true, true, true, true])
  eq('첫 화면 그림: lazy 없음 · fetchpriority high · 미리 불러오기 link', [/loading="lazy"/.test(hero), /<img :src="HERO_IMG\.mobile"[^>]*fetchpriority="high"/.test(hero), /rel: 'preload', as: 'image'/.test(landing), /HERO_PRELOAD\.forEach\(link => link\.remove\(\)\)/.test(landing)], [false, true, true, true])
  eq('첫 화면 버튼 = 흰 바탕 [무료로 시작하기] · 흰 테두리 [사용법 보기]', [/land-btn-white[^"]*" data-land-start @click="start"/.test(hero), /land-btn-line[^"]*" data-land-howto @click="scrollToSteps"/.test(hero)], [true, true])
  eq('첫 화면 BETA 배지·판매처 칩 = 기존 값 그대로 (BETA_BADGE·MARKETS)', [/\{\{ BETA_BADGE \}\}/.test(hero), /v-for="m in MARKETS"/.test(hero)], [true, true])
  eq('첫 화면에 편집기 모형·상태 카드 없음 · hero 장면 표시 없음', [/land-win|land-status|data-hero-tip/.test(tpl), /data-scene="hero"/.test(tpl)], [false, false])
}
eq('금지 과장 표현 없음',/업계 최고|100%|최저가|1위/.test(landing.replace(/<style[\s\S]*<\/style>/, '')), false)

// ── 3. 주소 구조 ──
const router = read('src/router/index.js')
const landingRoute = /path: '',\s*name: 'studio-landing',[\s\S]*?meta: \{([^}]*)\}/.exec(router)
eq('/studio 랜딩 = 보호 meta 없음 (누구나)', !!landingRoute && !/STUDIO_PROTECTED|requiresAuth/.test(landingRoute[1]), true)
eq('/studio/projects = 보호 (작업 홈)', /name: 'studio-projects',[\s\S]*?meta: \{ \.\.\.STUDIO_PROTECTED/.test(router), true)
const home = read('src/views/studio/StudioHomeView.vue')
eq('작업 홈에 최근 작업·새 소식', [/StudioRecentProjects/.test(home), /getStudioNotices\(\)/.test(home)], [true, true])
eq('랜딩 [무료로 시작하기] = 작업 홈으로 (가드가 로그인 처리)', /function start\(\) \{\s*router\.push\(\{ name: 'studio-projects' \}\)/.test(landing), true)
// ── 4. 범용 문구 (스튜디오는 1688 전용이 아님 — 2026-09-28) ──
{
  const tpl = landing.slice(0, landing.indexOf('<script'))
  const visible = tpl.split('\n').filter(l => !/^\s*<!--/.test(l)).join('\n')
  // 2026-09-28 재디자인(해성 지시): "1688에서 바로" 타일·상태 카드·편집기 사진 칸에는 1688을 쓴다. 큰 제목·부제에는 없음
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(visible)?.[1] || ''
  const lead = /class="land-lead"[^>]*>([\s\S]*?)<\/p>/.exec(visible)?.[1] || ''
  eq('큰 제목·부제에 "1688" 없음', [h1, lead].some(t => t.includes('1688')), false)
  eq('큰 제목 = "만들고, 다듬고, 바로 올리세요." (한 가지 색)', /<h1 class="land-h1"[^>]*>만들고, 다듬고,<br \/>바로 올리세요\.<\/h1>/.test(visible), true)
}
// ── 5. 닮은 점 체크리스트 (2026-09-28 재디자인 — 다른 랜딩과 닮지 않게) ──
{
  const style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(landing)[1]
  const tpl = landing.slice(0, landing.indexOf('<script'))
  const visibleText = tpl.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')
  eq('검은 배경 없음 (편집기 어두운 토큰·st-dark 안 씀, 바탕 = 밝은 색)', [/st-dark|--st-bg|#0c0d10/.test(landing), /--l-bg: #f7f8fb/.test(style) && /background: var\(--l-bg\)/.test(style)], [false, true])
  eq('알약 배지 없음 (999px·rounded-full·점 달린 제목 위 배지)', /999px|rounded-full|kicker[^{]*\{[^}]*border-radius/.test(landing), false)
  eq('제목 일부만 색칠 없음 (h1 안에 em·span 없음, 글자 그라데이션 없음)', [/<h1[^>]*>[^<]*(<br \/>[^<]*)*<\/h1>/.test(tpl), /background-clip:\s*text/.test(style)], [true, false])
  eq('빛 번짐 배경 없음 (glow·radial 번짐·blur)', /glow|closest-side|filter:\s*blur|backdrop-filter/.test(landing), false)
  eq('주 버튼 = 파랑 (주황 주 버튼 없음)', /\.land-btn-primary \{ background: var\(--l-blue\)/.test(style) && !/land-btn-primary[^}]*orange/.test(style), true)
  eq('영문 대문자 소제목 없음 (uppercase·EUCHS 말고 대문자 단어)', [/uppercase/.test(landing), (visibleText.match(/\b[A-Z]{4,}\b/g) || []).filter(w => w !== 'EUCHS')], [false, []])
  const header = read('src/components/Header.vue')
  eq('파랑 = 메인 [무역대행 신청](blue-600 #2563eb) · 주황 = [1688 소싱몰](orange-500 #f97316)', [
    /to="\/apply"\s*class="[^"]*bg-blue-600/.test(header), /--l-blue: #2563eb/.test(style),
    /to="\/mall"\s*class="[^"]*from-orange-500/.test(header), /--l-orange: #f97316/.test(style),
  ], [true, true, true, true])
  eq('주황은 "구매 고객 무료" 강조에만 (주황 타일 1개·무료 글자)', (tpl.match(/land-orange|tile-orange|is-free/g) || []).length, 4)
  eq('새 소식에 지난 예정 소식("편집기가 곧 나와요") 없음', read('src/lib/studioNotices.js').includes('편집기가 곧 나와요'), false)
}
const layout = read('src/layouts/StudioLayout.vue')
eq('랜딩은 전체 화면(사이드바 없음)', /FULL_SCREEN = new Set\(\[[^\]]*'studio-landing'/.test(layout), true)

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
