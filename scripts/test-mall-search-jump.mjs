// 메인 1688 검색 → 몰 "검색어" 상자 자동 이동 (2026-10-01) — node scripts/test-mall-search-jump.mjs
import fs from 'fs'
import {
  MALL_JUMP_STATE_KEY, MALL_MOBILE_QUERY, MALL_JUMP_GAP, USER_INPUT_EVENTS,
  homeSearchState, takeMallJumpFlag, jumpTarget, createMallJumpPin
} from '../src/lib/mallSearchJump.js'

let pass = 0, fail = 0
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${JSON.stringify(got)?.slice(0, 160)}${ok ? '' : `  기대 ${JSON.stringify(want)}`}`)
}
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── 1. 표시 읽기·지우기 ──
{
  const hist = { state: { back: '/', current: '/mall?q=x', position: 3, ...homeSearchState() }, replaceState(s) { this.state = s } }
  eq('표시가 있으면 true', takeMallJumpFlag(hist), true)
  eq('읽은 뒤 표시는 지우고 라우터 칸은 그대로', hist.state, { back: '/', current: '/mall?q=x', position: 3, [MALL_JUMP_STATE_KEY]: false })
  eq('두 번째(새로고침·뒤로가기)는 false', takeMallJumpFlag(hist), false)
  eq('state 없음 = false', takeMallJumpFlag({ state: null, replaceState() { throw new Error('부르면 안 됨') } }), false)
  eq('다른 화면에서 온 몰 = false', takeMallJumpFlag({ state: { position: 1 }, replaceState() { throw new Error('x') } }), false)
}

// ── 2. 목표 위치 ──
eq('상자 윗변 = 메뉴 아래 + 여백', jumpTarget({ scrollY: 0, anchorTop: 700, headerHeight: 98 }), 700 - 98 - MALL_JUMP_GAP)
eq('이미 스크롤된 상태도 문서 기준', jumpTarget({ scrollY: 300, anchorTop: 400, headerHeight: 98, gap: 8 }), 594)
eq('음수 안 됨', jumpTarget({ scrollY: 0, anchorTop: 50, headerHeight: 98 }), 0)
eq('모바일 기준 = 몰 사이드바(lg) 미만', MALL_MOBILE_QUERY, '(max-width: 1023px)')

// ── 3. 자리 지키기 (가짜 창) ──
function fakeWin() {
  const listeners = {}
  const timers = []
  let roCb = null
  const win = {
    scrollY: 0,
    scrollCalls: [],
    scrollTo(x, y) { this.scrollCalls.push(y); this.scrollY = y },
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn) },
    removeEventListener(ev, fn) { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn) },
    fire(ev) { for (const fn of [...(listeners[ev] || [])]) fn() },
    count(ev) { return (listeners[ev] || []).length },
    setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length },
    clearTimeout(id) { if (timers[id - 1]) timers[id - 1].fn = () => {} },
    runTimer(ms) { for (const t of timers) if (t.ms === ms) t.fn() },
    ResizeObserver: class { constructor(cb) { roCb = cb } observe() {} disconnect() { roCb = null } },
    resize() { roCb?.() }
  }
  return win
}
const doc = { documentElement: { style: { scrollBehavior: '' } }, body: {} }
{
  const win = fakeWin()
  let docTop = 900 // 상자의 문서 기준 위치
  const anchor = { getBoundingClientRect: () => ({ top: docTop - win.scrollY }) }
  const header = { offsetHeight: 100 }
  const pin = createMallJumpPin({ win, doc, getAnchor: () => anchor, getHeader: () => header, gap: 8 })
  pin.start()
  eq('시작하면 바로 이동', win.scrollY, 792)
  eq('이동 뒤 scroll-behavior 원래대로', doc.documentElement.style.scrollBehavior, '')
  docTop = 1000; win.resize()
  eq('위 배너가 커지면 다시 맞춤', win.scrollY, 892)
  win.scrollY = 0; win.fire('scroll')
  eq('라우터 맨 위 스크롤이 끼어들면 되돌림', win.scrollY, 892)
  const n = win.scrollCalls.length
  win.fire('scroll')
  eq('같은 자리면 다시 안 부름', win.scrollCalls.length, n)
  win.fire('touchstart')
  eq('손가락이 닿으면 끝', pin.isActive(), false)
  eq('끝나면 듣기 해제', ['scroll', ...USER_INPUT_EVENTS].map(e => win.count(e)), [0, 0, 0, 0, 0, 0])
  docTop = 1200; win.resize(); win.fire('scroll')
  eq('끝난 뒤에는 안 움직임', win.scrollY, 892)
}
{
  const win = fakeWin()
  const anchor = { getBoundingClientRect: () => ({ top: 500 - win.scrollY }) }
  const pin = createMallJumpPin({ win, doc, getAnchor: () => anchor, getHeader: () => ({ offsetHeight: 100 }), gap: 8, settleMs: 2000, maxMs: 35000 })
  pin.settle()
  eq('시작 전 settle은 아무것도 안 함', pin.isActive(), false)
  pin.start(); pin.settle(); win.runTimer(2000)
  eq('로딩 끝 + 2초 뒤 끝', pin.isActive(), false)
  const win2 = fakeWin()
  const pin2 = createMallJumpPin({ win: win2, doc, getAnchor: () => null, getHeader: () => null, maxMs: 35000 })
  pin2.start()
  eq('요소가 없으면 스크롤 안 함', win2.scrollCalls, [])
  win2.runTimer(35000)
  eq('최대 시간 지나면 끝', pin2.isActive(), false)
}

// ── 4. 연결 위치 (소스) ──
{
  const home = read('src/views/HomeView.vue')
  eq('메인 검색어 이동에만 state', /query: \{ q: rawInput \}, state: homeSearchState\(\)/.test(home), true)
  eq('상품번호(offerId) 이동에는 state 없음', /router\.push\(\{ path: '\/mall', query: \{ offerId \} \}\)/.test(home), true)
  eq('표시는 주소(query)에 안 남김', /query: \{[^}]*euchsMallJump/.test(home), false)
  const mall = read('src/views/MallView.vue')
  eq('몰: 고정 메뉴·상자·스켈레톤 ref', ['ref="mallHeaderRef"', 'ref="searchResultBarRef"', 'ref="searchSkeletonRef"'].map(s => mall.includes(s)), [true, true, true])
  eq('몰: 모바일 기준·q 있을 때만', /takeMallJumpFlag\(window\.history\)/.test(mall) && /MALL_MOBILE_QUERY\)\.matches === true/.test(mall), true)
  eq('몰: 나갈 때 정리', mall.includes('searchJumpPin?.stop()'), true)
  const router = read('src/router/index.js')
  eq('라우터 scrollBehavior는 손대지 않음', router.includes('mallSearchJump'), false)
}

console.log(`\n${pass} PASS · ${fail} FAIL`)
if (fail) process.exit(1)
