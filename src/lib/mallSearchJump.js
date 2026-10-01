// 메인(홈) 1688 검색창·인기 키워드 → 몰 (2026-10-01)
// 모바일에서 몰이 열리면 "검색어 / 정렬" 상자(로딩 중에도 보임)를 몰 고정 메뉴 바로 아래로 한 번 옮긴다.
// 표시는 라우터 state(history.state)로만 넘긴다 — 주소에 남기지 않아 링크 공유로는 이동하지 않고,
// 몰이 표시를 읽는 즉시 지워서 새로고침·뒤로가기·앞으로가기로 같은 기록에 돌아와도 다시 이동하지 않는다.

export const MALL_JUMP_STATE_KEY = 'euchsMallJump'

// 몰의 모바일 배치 기준 = 왼쪽 사이드바가 사라지는 Tailwind lg(1024px) 미만 (MallView aside `hidden lg:flex`)
export const MALL_MOBILE_QUERY = '(max-width: 1023px)'

// 고정 메뉴 아래쪽과 상자 사이 여백(px)
export const MALL_JUMP_GAP = 8

// 상품 로딩이 끝난 뒤에도 이만큼은 위쪽 배너 높이 변화에 맞춰 자리를 지킨다(ms)
// 실제 폰(느린 망)은 위쪽 배너·카테고리 그림이 상품보다 늦게 뜰 수 있어 넉넉히 — 손가락이 닿으면 그 즉시 끝남
export const MALL_JUMP_SETTLE_MS = 8000
// 아무리 길어도 이 시간이 지나면 자리 지키기를 끝낸다(ms) — 검색 타임아웃 30초 + 여유
export const MALL_JUMP_MAX_MS = 35000

// 사용자가 직접 화면을 움직이기 시작하면 자리 지키기를 바로 끝낸다
export const USER_INPUT_EVENTS = ['touchstart', 'wheel', 'keydown', 'mousedown', 'pointerdown']

/** HomeView → router.push의 state */
export const homeSearchState = () => ({ [MALL_JUMP_STATE_KEY]: true })

/** history.state에 표시가 있으면 true — 읽는 즉시 표시를 지운다(다른 state 칸은 그대로) */
export function takeMallJumpFlag(hist) {
  const st = hist?.state
  if (!st || st[MALL_JUMP_STATE_KEY] !== true) return false
  hist.replaceState({ ...st, [MALL_JUMP_STATE_KEY]: false }, '')
  return true
}

/** 상자 윗변이 고정 메뉴 아래 + 여백에 오게 하는 스크롤 값 */
export function jumpTarget({ scrollY, anchorTop, headerHeight, gap = MALL_JUMP_GAP }) {
  return Math.max(0, Math.round(scrollY + anchorTop - headerHeight - gap))
}

/**
 * 자리 지키기 — 시작하면 바로 한 번 옮기고, 끝날 때까지
 * 페이지 높이가 바뀌거나(위쪽 배너 늦게 그려짐) 다른 스크롤(라우터의 맨 위 부드러운 스크롤)이 끼어들면 다시 맞춘다.
 * getAnchor()·getHeader()는 그 순간의 요소(없으면 null)를 돌려준다.
 */
export function createMallJumpPin({ win, doc, getAnchor, getHeader, gap = MALL_JUMP_GAP, settleMs = MALL_JUMP_SETTLE_MS, maxMs = MALL_JUMP_MAX_MS }) {
  let active = false
  let ro = null
  let settleTimer = null
  let maxTimer = null

  const scrollToY = (y) => {
    // html의 scroll-behavior: smooth 때문에 부드럽게 가다 멈추지 않게 이 순간만 즉시 이동
    const el = doc.documentElement
    const prev = el.style.scrollBehavior
    el.style.scrollBehavior = 'auto'
    win.scrollTo(0, y)
    el.style.scrollBehavior = prev
  }

  const pin = () => {
    if (!active) return
    const anchor = getAnchor()
    const header = getHeader()
    if (!anchor || !header) return
    const y = jumpTarget({
      scrollY: win.scrollY,
      anchorTop: anchor.getBoundingClientRect().top,
      headerHeight: header.offsetHeight,
      gap
    })
    if (Math.abs(win.scrollY - y) > 1) scrollToY(y)
  }

  const onUserInput = () => stop()

  function stop() {
    if (!active) return
    active = false
    win.removeEventListener('scroll', pin)
    for (const ev of USER_INPUT_EVENTS) win.removeEventListener(ev, onUserInput, true)
    if (ro) { ro.disconnect(); ro = null }
    if (settleTimer) { win.clearTimeout(settleTimer); settleTimer = null }
    if (maxTimer) { win.clearTimeout(maxTimer); maxTimer = null }
  }

  function start() {
    if (active) return
    active = true
    win.addEventListener('scroll', pin, { passive: true })
    for (const ev of USER_INPUT_EVENTS) win.addEventListener(ev, onUserInput, { capture: true, passive: true })
    if (typeof win.ResizeObserver === 'function') {
      ro = new win.ResizeObserver(pin)
      ro.observe(doc.body)
    }
    maxTimer = win.setTimeout(stop, maxMs)
    pin()
  }

  /** 상품 로딩이 끝났을 때 — 잠시 더 지킨 뒤 끝낸다 */
  function settle() {
    if (!active) return
    pin()
    if (settleTimer) win.clearTimeout(settleTimer)
    settleTimer = win.setTimeout(stop, settleMs)
  }

  return { start, pin, settle, stop, isActive: () => active }
}
