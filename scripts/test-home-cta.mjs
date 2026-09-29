// 홈 스튜디오 알림 칸·모바일 하단 고정 바 (2026-09-29) — node scripts/test-home-cta.mjs
// 숨김 경로 · 카톡 주소 통일 · GA 이벤트(gtag 있을 때만) · 문구 규칙("무료"는 사입 조건과 함께, "중국어" 없음) · 배치 위치
import fs from 'fs'
import path from 'path'
import { KAKAO_CHAT_URL, STUDIO_PATH, showStickyCta, trackStudioCta } from '../src/lib/homeCta.js'
import { MARKETS } from '../src/lib/studioMarketplaceRules.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)?.slice(0, 160)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
    const p = path.posix.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.(vue|js)$/.test(e.name)) out.push(p)
  }
  return out
}

// ── 1. 하단 고정 바 숨김 경로 ──
eq('보이는 경로 (홈·몰·계산기·서비스)', ['/', '/mall', '/tools/calculator', '/services/fulfillment'].map(showStickyCta), [true, true, true, true])
eq('숨기는 경로 (관리자·대시보드·마이페이지·스튜디오·로그인 + 아래 경로)',
  ['/admin', '/admin/login', '/dashboard', '/dashboard/orders', '/mypage', '/my-page/x', '/studio', '/studio/projects', '/login'].map(showStickyCta),
  [false, false, false, false, false, false, false, false, false])
eq('비슷한 이름은 숨기지 않음 (/studios·/login-help)', [showStickyCta('/studios'), showStickyCta('/login-help')], [true, true])

// ── 2. 카톡 주소 통일 (https) — 스튜디오 파일은 고치지 않는 규칙이라 제외 ──
eq('카톡 주소 = https 채팅', [KAKAO_CHAT_URL, STUDIO_PATH], ['https://pf.kakao.com/_xmQWsK/chat', '/studio'])
{
  const files = walk('src').filter(p => !p.startsWith('src/views/studio/') && !p.startsWith('src/lib/studio') && !p.startsWith('src/components/studio/') && !p.startsWith('src/__harness__/'))
  const bad = []
  for (const p of files) {
    for (const m of read(p).matchAll(/https?:\/\/pf\.kakao\.com[^\s"'`)]*/g)) if (m[0] !== KAKAO_CHAT_URL) bad.push(`${p}: ${m[0]}`)
  }
  eq('src(스튜디오 제외)의 카톡 링크가 모두 https 채팅 주소', bad, [])
}

// ── 3. GA 이벤트 — gtag가 있을 때만 ──
{
  const calls = []
  globalThis.window = {}
  trackStudioCta('home_band')
  eq('gtag 없으면 아무것도 안 함 (오류 없음)', calls, [])
  globalThis.window.gtag = (...a) => calls.push(a)
  trackStudioCta('home_band'); trackStudioCta('sticky')
  eq('gtag 있으면 studio_cta_click + location', calls, [['event', 'studio_cta_click', { location: 'home_band' }], ['event', 'studio_cta_click', { location: 'sticky' }]])
  delete globalThis.window
}

// ── 4. 알림 칸 문구·배치 ──
{
  const band = read('src/components/StudioPromoBand.vue')
  const shown = band.slice(band.indexOf('<template>'), band.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  const text = shown.replace(/<[^>]+>/g, ' ')
  eq('"무료"는 "이유씨컴퍼니에서 사입하면"과 같은 문장에', text.split(/[.!?]/).filter(s => s.includes('무료')).every(s => s.includes('이유씨컴퍼니에서 사입하면')), true)
  eq('고객 문구에 "중국어"·"고시정보" 없음', /중국어|고시정보/.test(text), false)
  eq('제목·배지·설명', ['NEW · AI 스튜디오', '1688 링크 하나로 상세페이지부터 마켓 등록까지', '이유씨컴퍼니에서 사입하면 상세페이지 제작·판매처 등록 도구를 무료로 써요.'].every(s => shown.includes(s)), true)
  eq('판매처 칩 = 스튜디오 MARKETS 그대로(9곳)', [/v-for="m in MARKETS"/.test(band), /from '@\/lib\/studioMarketplaceRules'/.test(band), MARKETS.map(m => m.name)],
    [true, true, ['쿠팡', '스마트스토어', '11번가', 'G마켓·옥션', '에이블리', '지그재그', '카페24', '메이크샵', '고도몰']])
  eq('그림: lazy · 폭·높이 · hero-pc / 모바일 hero-mobile', [/loading="lazy"/.test(band), /width="1920" height="1047"/.test(band), /\/studio-landing\/hero-pc\.webp/.test(band), /\/studio-landing\/hero-mobile\.webp/.test(band)], [true, true, true, true])
  eq('[스튜디오 둘러보기] → /studio + GA home_band · 카톡 = <a href> 새 창(adPixels가 kakao_click)', [/trackStudioCta\('home_band'\)/.test(band), /:href="KAKAO_CHAT_URL" target="_blank"/.test(band)], [true, true])
  eq('움직임 줄이기면 효과 없음', /prefers-reduced-motion: reduce/.test(band), true)
  const home = read('src/views/HomeView.vue')
  const iSearch = home.indexOf('한글로 검색'), iBand = home.indexOf('<StudioPromoBand />'), iFeed = home.indexOf('실시간 비즈니스 데이터')
  eq('홈: 검색 칸 → 스튜디오 칸 → 실시간 데이터 칸 순서', iSearch > 0 && iSearch < iBand && iBand < iFeed, true)
  const sticky = read('src/components/MobileStickyCta.vue')
  eq('하단 바: md 이상 숨김 · GA sticky', [/class="md:hidden"/.test(sticky), /trackStudioCta\('sticky'\)/.test(sticky)], [true, true])
  const app = read('src/App.vue')
  eq('App: 바가 보이면 QuickMenu를 올림', [/:raised="stickyCtaVisible"/.test(app), /<MobileStickyCta v-if="stickyCtaVisible" \/>/.test(app)], [true, true])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
