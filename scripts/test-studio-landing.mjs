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
eq('판매처 이름은 글자만 (로고 이미지 없음)', /MARKETS = \['쿠팡', '카페24', '고도몰', '메이크샵'\]/.test(landing) && !/logo[^"]*\.(png|svg|webp)/i.test(landing), true)
eq("페이지에 '중국'이라는 글자가 없음 (랜딩·사진 설정·임시 그림·모션)",
  ['src/views/studio/StudioLandingView.vue', 'src/data/studioLandingMedia.js', 'src/data/studioLandingPlaceholders.js', 'src/lib/studioLandingMotion.js'].filter(p => read(p).includes('중국')), [])
eq('여는 시점을 약속하는 문구 없음 (지금 바로·곧 열려요·먼저 알려)', /지금 바로|곧 열려|먼저 알려|지금 시작/.test(landing), false)
eq('이용 안내 카드: 무료 · 이유씨컴퍼니 고객 / 준비 중 · 일반 고객', [/>무료</.test(landing), /이유씨컴퍼니 고객</.test(landing), />준비 중</.test(landing), /일반 고객</.test(landing), /준비 중이에요/.test(landing)], [true, true, true, true, true])
{
  const motion = read('src/lib/studioLandingMotion.js').replace(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm, '') // 주석 빼고
  eq('화면 고정 없음 = pin-spacer 0개 (pin·scrub 없음)', [/\bpin\s*:/.test(motion), /\bscrub\s*:/.test(motion)], [false, false])
  eq('snap·휠 가로채기·부드러운 스크롤 없음', /snap|addEventListener\('wheel'|lenis/i.test(motion + landing), false)
  eq('보이면 재생 · 완전히 나가면 되돌림 (장면 5개 + 떠오름)', [
    (motion.match(/playWhenSeen\((erase|bg|oc|ed|ex),/g) || []).length,
    /start: PLAY_AT, end: PLAY_BACK_AT, onEnter: play, onEnterBack: play/.test(motion),
    /start: 'top bottom', end: 'bottom top',\s*onLeave:[^\n]*reset\(\)[\s\S]{0,60}onLeaveBack:[^\n]*reset\(\)/.test(motion),
    /playWhenSeen\(el, timelinePlayer\(tl\)\)/.test(motion),
  ], [5, true, true, true])
}
{
  // 영상 칸 — 기본은 비어 있음 → 코드 애니메이션
  const scenes = ['hero', 'erase', 'background', 'oneClick', 'editor', 'export']
  eq("장면마다 video 칸 = '' (비어 있음) · poster 사진 있음", scenes.map(k => [M[k].video, isImg(M[k].poster)]), scenes.map(() => ['', true]))
  eq('video가 비어 있으면 코드 애니메이션 (장면마다 v-if 영상 / v-else 코드)', scenes.every(k => new RegExp(`<SceneVideo v-if="M\\.${k}\\.video"[^>]*/>\\s*<div v-else`).test(landing)), true)
  eq('영상 속성: autoplay·muted·loop·playsinline·preload metadata·poster', /autoplay: true, muted: true, loop: true, playsinline: true,\s*preload: 'metadata'/.test(landing) && /poster: props\.media\.poster/.test(landing), true)
  eq('움직임 줄이기면 영상 대신 poster 정지 사진', /props\.still\s*\?\s*h\('img', \{ src: props\.media\.poster/.test(landing) && /:still="isStatic"/.test(landing), true)
  const motion = read('src/lib/studioLandingMotion.js')
  eq('영상: 화면 밖 pause · 다시 들어오면 처음부터 play', /video\.currentTime = 0\s*const p = video\.play\(\)/.test(motion) && /reset: \(\) => \{ video\.pause\(\); video\.currentTime = 0 \}/.test(motion), true)
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
const layout = read('src/layouts/StudioLayout.vue')
eq('랜딩은 전체 화면(사이드바 없음)', /FULL_SCREEN = new Set\(\[[^\]]*'studio-landing'/.test(layout), true)

console.log(`\n${pass} 통과 · ${fail} 실패`)
if (fail) process.exit(1)
