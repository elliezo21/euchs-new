// 홈 스튜디오 알림 칸·모바일 하단 고정 바 (2026-09-29) — node scripts/test-home-cta.mjs
// 숨김 경로 · 카톡 주소 통일 · GA 이벤트(gtag 있을 때만) · 문구 규칙("무료"는 사입 조건과 함께, "중국어" 없음) · 배치 위치
import fs from 'fs'
import path from 'path'
import { KAKAO_CHAT_URL, STUDIO_PATH, MALL_PATH, showStickyCta, trackStudioCta, trackMallCta } from '../src/lib/homeCta.js'
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
  calls.length = 0
  trackMallCta('home_band')
  eq('[1688 소싱몰 가기] → mall_cta_click + location', calls, [['event', 'mall_cta_click', { location: 'home_band' }]])
  delete globalThis.window.gtag
  trackMallCta('home_band')
  eq('gtag 없으면 mall_cta_click도 안 보냄', calls.length, 1)
  delete globalThis.window
}

// ── 4. 알림 칸 문구·배치 ──
{
  const band = read('src/components/StudioPromoBand.vue')
  const shown = band.slice(band.indexOf('<template>'), band.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  const text = shown.replace(/<[^>]+>/g, ' ')
  eq('"무료"는 "이유씨컴퍼니에서 사입하면"과 같은 문장에', text.split(/[.!?]/).filter(s => s.includes('무료')).every(s => s.includes('이유씨컴퍼니에서 사입하면')), true)
  eq('고객 문구에 "중국어"·"고시정보" 없음', /중국어|고시정보/.test(text), false)
  eq('배지·제목(두 줄)·설명 (움직이는 시안 문구)', ['NEW · AI 스튜디오', '중국 수입부터<br />상세페이지·판매처 등록까지', '1688 링크 하나로 상세페이지를 만들어 쿠팡·스마트스토어에 바로 보내요.', '이유씨컴퍼니에서 사입하면 스튜디오 무료.'].every(s => shown.includes(s)), true)
  eq('판매처 칩 = 스튜디오 MARKETS 그대로 읽기(9곳)', [/v-for="\(m, k\) in MARKETS"/.test(band), /import \{ MARKETS \} from '@\/lib\/studioMarketplaceRules'/.test(band), MARKETS.map(m => m.name)],
    [true, true, ['쿠팡', '스마트스토어', '11번가', 'G마켓·옥션', '에이블리', '지그재그', '카페24', '메이크샵', '고도몰']])
  eq('홈 칸: 9곳 모두 ✓ · "준비 중" 없음 · soon 값을 안 씀', [/<i aria-hidden="true">✓<\/i>/.test(band), /준비 중/.test(text), /m\.soon|\.soon\b/.test(band.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, ''))], [true, false, false])
  eq('반짝임 = 9곳을 차례로 (pingKeys = MARKETS 전체)', [/const pingKeys = MARKETS\.map\(m => m\.key\)/.test(band), /pingKeys\[pingSeq % pingKeys\.length\]/.test(band)], [true, true])
  eq('버튼: [스튜디오 둘러보기] → /studio + studio_cta_click / [1688 소싱몰 가기] → /mall + mall_cta_click',
    [/:to="STUDIO_PATH"[^>]*@click="trackStudioCta\('home_band'\)"/.test(band), /:to="MALL_PATH"[^>]*@click="trackMallCta\('home_band'\)"/.test(band), MALL_PATH, STUDIO_PATH], [true, true, '/mall', '/studio'])
  eq('이 칸에서 카톡 버튼·예전 보라 그림(hero-pc) 뺌', [/KAKAO_CHAT_URL|pf\.kakao/.test(band), /studio-landing/.test(band)], [false, false])
  {
    const files = ['ship', 'boxes', 'frame', 'sparkles', 'tiles', 'bag', 'laptop-beauty', 'laptop-pet', 'laptop-kitchen', 'phone-beauty', 'phone-pet', 'phone-kitchen']
    const missing = files.filter(f => !fs.existsSync(new URL(`../public/home-studio-band/${f}.webp`, import.meta.url)))
    const imgs = [...shown.matchAll(/<img[\s\S]*?\/>/g)].map(m => m[0])
    eq('그림 12개 = public/home-studio-band/ · 모든 <img> lazy + width·height', [missing, imgs.length > 0 && imgs.every(t => /loading="lazy"/.test(t) && /:?width="/.test(t) && /:?height="/.test(t))], [[], true])
  }
  eq('움직임 줄이기: 움직임 없이 완성 장면(✓ 표시)', [/prefers-reduced-motion: reduce\)'\)\.matches\) \{\s*still\.value = true\s*showAllChecks\(\)/.test(band), /@media \(prefers-reduced-motion: reduce\)/.test(band), /\.is-still \.chip\.on i \{ animation: none; transform: scale\(1\); \}/.test(band)], [true, true, true])
  eq('보일 때만 움직임 (IntersectionObserver + 숨은 탭 멈춤) · 글·그림 opacity 0으로 기다리지 않음',
    [/new IntersectionObserver/.test(band), /visibilitychange/.test(band), /\.copy[^{]*\{[^}]*opacity:\s*0/.test(band)], [true, true, false])
  const home = read('src/views/HomeView.vue')
  const iSearch = home.indexOf('한글로 검색'), iBand = home.indexOf('<StudioPromoBand />'), iFeed = home.indexOf('실시간 비즈니스 데이터')
  eq('홈: 검색 칸 → 스튜디오 칸 → 실시간 데이터 칸 순서', iSearch > 0 && iSearch < iBand && iBand < iFeed, true)
  const sticky = read('src/components/MobileStickyCta.vue')
  eq('하단 바: md 이상 숨김 · GA sticky', [/class="md:hidden"/.test(sticky), /trackStudioCta\('sticky'\)/.test(sticky)], [true, true])
  const app = read('src/App.vue')
  eq('App: 바가 보이면 QuickMenu를 올림', [/:raised="stickyCtaVisible"/.test(app), /<MobileStickyCta v-if="stickyCtaVisible" \/>/.test(app)], [true, true])
  // 2026-09-30: 모바일(768px 미만) 영상 창이 스튜디오 칸 버튼을 가리지 않게 — 버튼이 보이는 동안 왼쪽 밖으로. PC(768px 이상)는 그대로
  const vw = read('src/components/VideoWidget9x16.vue')
  const vwStyle = /<style[^>]*>([\s\S]*?)<\/style>/.exec(vw)?.[1] || ''
  const yieldRule = /@media \(max-width: 767\.98px\) \{[\s\S]*?\.vw-yield \{([^}]*)\}/.exec(vwStyle)?.[1] || ''
  eq('영상 창: 스튜디오 칸 두 버튼을 관찰 (칸의 data 속성 그대로)', [/'\[data-studio-promo-cta\], \[data-studio-promo-mall\]'/.test(vw), /data-studio-promo-cta/.test(band) && /data-studio-promo-mall/.test(band), /new IntersectionObserver/.test(vw), /ctaObserver\?\.disconnect\(\)/.test(vw)], [true, true, true, true])
  eq('영상 창 비켜 두기 = 768px 미만 CSS에만 (translateX·누를 수 없음)', [/translateX\(calc\(-100% - 24px\)\)/.test(yieldRule), /pointer-events: none/.test(yieldRule), (vwStyle.match(/\.vw-yield/g) || []).length, /:class="\{ 'vw-yield': yieldToCta \}"/.test(vw)], [true, true, 1, true])
}

// ── 5. 스튜디오 소개 크게 넓힘 (2026-09-30): 판매처 배지 10곳 · ②~⑤ 자세한 소개 · 편집기 녹화 영상 ──
{
  const { HOME_BRANDS, brandLogo } = await import('../src/data/homeStudioBrands.js')
  const band = read('src/components/StudioPromoBand.vue'), more = read('src/components/StudioPromoDetails.vue')
  const shownOf = s => s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
  eq('판매처 배지 10곳 (G마켓·옥션 나눔) · 로고 파일은 public/brand에 있음 · 못 받은 곳은 이름만(출처 없음)',
    [HOME_BRANDS.map(b => b.key), HOME_BRANDS.filter(b => b.logo).every(b => fs.existsSync(new URL(`../public${brandLogo(b)}`, import.meta.url)) && /^https?:\/\//.test(b.src)), HOME_BRANDS.filter(b => !b.logo).every(b => !b.src)],
    [['coupang', 'smartstore', '11st', 'gmarket', 'auction', 'ably', 'zigzag', 'cafe24', 'makeshop', 'godomall'], true, true])
  eq('띠: 배지·점선이 무대 안 · 둥둥(float)도 보일 때만 움직이고 움직임 줄이기면 멈춤 · 폰은 로고 배지만',
    [/v-for="b in BADGES"[^>]*data-band-badge/.test(shownOf(band).replace(/\s+/g, ' ')), /\.is-paused [^{]*\.float/.test(band), /\.is-still [^{]*\.float/.test(band), /\.badge\.m-hide \{ display: none; \}/.test(band)], [true, true, true, true])
  eq('자세한 소개가 띠 바로 아래 · 마지막 버튼 = 같은 스튜디오 주소 · GA studio_cta_click',
    [/<\/section>\s*<StudioPromoDetails \/>/.test(band), /:to="STUDIO_PATH"[^>]*@click="trackStudioCta\('home_band_more'\)"[^>]*>스튜디오 둘러보기 →/.test(more)], [true, true])
  const vid = /<video[\s\S]*?>/.exec(more)?.[0] || ''
  eq('영상: 소리 없음·자동 재생·반복·인라인·컨트롤 없음 · webm+mp4 · 포스터 · 보일 때만 불러옴(active)',
    [['muted', 'autoplay', 'loop', 'playsinline'].every(a => new RegExp(`\\s${a}[\\s>]`).test(vid)), /controls/.test(vid), /v-if="active"/.test(vid), /type="video\/webm"/.test(more) && /type="video\/mp4"/.test(more), /:poster=/.test(vid)], [true, false, true, true, true])
  const files = ['oneclick', 'erase', 'send'].flatMap(n => [`${n}.mp4`, `${n}.webm`, `${n}-poster.jpg`])
  const sizes = files.map(f => { try { return fs.statSync(new URL(`../public/studio-demo/${f}`, import.meta.url)).size } catch { return -1 } })
  eq('영상 3개 × mp4·webm·포스터 = public/studio-demo · 영상은 3MB 이하', [sizes.every(s => s > 0), files.filter((f, i) => !f.endsWith('.jpg') && sizes[i] > 3 * 1024 * 1024)], [true, []])
  const t = shownOf(more).replace(/<[^>]+>/g, ' ')
  eq('자세한 소개 문구: "중국어"·"준비 중" 없음 · 숫자 한 줄(무료 템플릿 100+ 계속 추가 예정·10·이유씨 구매 고객 무료)', [/중국어|준비 중/.test(t), /100\+\s*무료 템플릿\s*계속 추가 예정[\s\S]*10[\s\S]*판매처[\s\S]*무료[\s\S]*이유씨 구매 고객/.test(t)], [false, true])
  eq('템플릿 개수 문구 = "무료 템플릿 100+" · 옆에 "계속 추가 예정" (예전 94 없음)', [/title: '무료 템플릿 100\+', note: '계속 추가 예정'/.test(more), /\b94\b/.test(t) || /템플릿 94/.test(more)], [true, false])
}

console.log(`\n통과 ${pass} / 실패 ${fail}`)
process.exit(fail ? 1 : 0)
