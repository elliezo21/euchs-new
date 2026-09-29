/**
 * 스튜디오 랜딩 모션 — GSAP + ScrollTrigger (GSAP Standard "no charge" License, 상업 사용 무료).
 * ★ 이 파일은 StudioLandingView가 동적 import로만 불러온다 → gsap은 랜딩 청크에만 들어간다(편집기·ERP 번들에 안 섞임).
 * ★ 화면(.vue)의 기본 CSS = 각 장면의 "끝난 모습". 여기서는 fromTo로 시작 모습을 정해 움직인다(fromTo는 만들 때 바로 시작 모습을 그림).
 *   그래서 움직임 줄이기 설정이거나 이 파일을 못 불러와도 내용은 다 보인다.
 * ★ transform·opacity 위주 (지우기 쓸기만 clip-path). 켜짐 표시는 CSS 변수 --on(0~1).
 *
 * 재생 방식 (모든 화면 너비 같음 — 화면 고정(pin)·스크롤 양에 묶인 진행(scrub) 없음, 스크롤은 그냥 내려간다):
 *   장면이 화면에 약 30% 들어오면 그 장면 타임라인을 처음부터 자동 재생(2~3초) → 끝난 모습으로 멈춤.
 *   장면이 화면 밖으로 완전히 나가면(위·아래 어느 쪽이든) 시작 모습으로 되돌려 두고, 다시 들어오면 처음부터 다시 재생.
 *   장면 그림 자리에 영상(studioLandingMedia의 video)이 있으면 타임라인 대신 영상을 같은 규칙으로 재생·멈춤.
 *
 * 장면 (2026-09-28 재디자인): hero(편집기 화면 — 지우기·배경·섹션 순서 말풍선, 2026-09-29부터 첫 화면에 없음) · erase(큰 타일 원본/완성) ·
 *   oneclick(남색 타일 단계) · export(판매처 이름) + 떠오름(data-reveal)
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const PLAY_AT = 'top 70%'    // 그림 자리 윗변이 화면 아래에서 30% 올라오면 = 약 30% 들어옴
const PLAY_BACK_AT = 'bottom 30%' // 위로 올라올 때: 아랫변이 화면 위에서 30% 내려오면

/**
 * 보이면 재생 · 완전히 나가면 되돌림 — 타임라인이든 영상이든 같은 규칙.
 * @param {HTMLElement} el 장면 요소
 * @param {{ play: () => void, reset: () => void }} player
 */
function playWhenSeen(el, player) {
  let armed = true // 처음이거나, 화면 밖으로 완전히 나갔다 온 뒤에만 재생
  // self.isActive = 지금 정말 보이는 중일 때만 (Home/End·[사용법 보기]처럼 한 번에 건너뛰면 지나친 장면에도
  // onEnter가 불린다 — 그때 재생해 버리면 화면 밖에서 끝나고, 정작 도착했을 때 다시 재생되지 않는다)
  const play = self => { if (armed && self.isActive) { armed = false; player.play() } }
  // 재생 기준 = 장면의 그림 자리(data-scene-visual)
  const visual = el.querySelector('[data-scene-visual]') || el
  ScrollTrigger.create({ trigger: visual, start: PLAY_AT, end: PLAY_BACK_AT, onEnter: play, onEnterBack: play })
  const seen = ScrollTrigger.create({
    trigger: el, start: 'top bottom', end: 'bottom top',
    onLeave: () => { armed = true; player.reset() },
    onLeaveBack: () => { armed = true; player.reset() },
  })
  if (!seen.isActive) player.reset() // 처음부터 화면 밖이면 시작 모습(영상은 멈춤)
}

function timelinePlayer(tl) {
  return { play: () => tl.restart(), reset: () => tl.pause(0) }
}

function videoPlayer(video) {
  return {
    play: () => {
      video.currentTime = 0
      const p = video.play()
      if (p?.catch) p.catch(e => console.error('[StudioLanding] 장면 영상을 재생하지 못했어요:', video.currentSrc, e))
    },
    reset: () => { video.pause(); video.currentTime = 0 },
  }
}

/** @param {HTMLElement} root 랜딩 최상위 요소 @returns {() => void} 정리 함수 */
export function startLandingMotion(root) {
  const ctx = gsap.context(() => {
    const $ = sel => root.querySelector(sel)
    const $$ = sel => Array.from(root.querySelectorAll(sel))
    const turnOn = (tl, el, at, d = 0.15) => tl.fromTo(el, { '--on': 0 }, { '--on': 1, duration: d }, at)
    const paused = () => gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } })

    // 영상이 있는 장면 = 영상만 재생 규칙에 태운다 (코드 애니메이션 없음)
    const withVideo = new Set()
    $$('[data-scene]').forEach(el => {
      const v = el.querySelector('video[data-scene-video]')
      if (v) { withVideo.add(el); playWhenSeen(el, videoPlayer(v)) }
    })
    const sceneEl = name => { const el = $(`[data-scene="${name}"]`); return el && !withVideo.has(el) ? el : null }

    // ── 첫 화면 등장 (들어오자마자 한 번) — 글씨는 살짝 떠오름, 배경 그림은 제자리에서 서서히 나타남만 ──
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo($$('[data-hero-in]'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 })
    const heroVisual = $('[data-hero-visual]')
    if (heroVisual) heroTl.fromTo(heroVisual, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power1.out' }, 0)

    // ── 편집기 화면: 선택 네모 → 글자 지우기 쓸기 → 한글 제목 → 배경 바꾸기 → 섹션 순서 바꾸기 → 상태 카드 (약 3초) ──
    // 2026-09-29: 첫 화면이 그림 배경으로 바뀌어 data-scene="hero"가 없다 → 이 장면은 건너뜀(편집기 모형을 다시 넣으면 그대로 동작)
    const hero = sceneEl('hero')
    if (hero) {
      const q = s => hero.querySelector(s)
      const qa = s => Array.from(hero.querySelectorAll(s))
      const tips = qa('[data-hero-tip]')
      const cards = qa('[data-hero-card]')
      const miniA = q('[data-hero-mini="a"]')
      const miniB = q('[data-hero-mini="b"]')
      const tl = paused()
      if (q('[data-hero-select]')) {
        tl.fromTo(q('[data-hero-select]'), { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, 0.3)
          .fromTo(q('[data-hero-erase-top]'), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.9, ease: 'power1.inOut' }, 0.6)
          .to(q('[data-hero-select]'), { opacity: 0, duration: 0.2 }, 1.45)
          .fromTo(q('[data-hero-title]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, 1.5)
          .fromTo(q('[data-hero-bg-orig]'), { opacity: 1 }, { opacity: 0, duration: 0.4 }, 1.9)
      }
      if (tips[0]) tl.fromTo(tips[0], { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 }, 0.9)
      if (tips[1]) tl.fromTo(tips[1], { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 }, 1.9)
      // 섹션 순서 바꾸기: 미니 그림 두 장이 자리를 바꿔 지금 순서로 (끝난 모습 = 지금 순서)
      if (miniA && miniB) {
        tl.fromTo(miniA, { y: 70 }, { y: 0, duration: 0.5, ease: 'power2.inOut' }, 2.4)
          .fromTo(miniB, { y: -70 }, { y: 0, duration: 0.5, ease: 'power2.inOut' }, 2.4)
      }
      if (tips[2]) tl.fromTo(tips[2], { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 }, 2.5)
      cards.forEach((c, i) => tl.fromTo(c, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, 1.2 + i * 1.6))
      playWhenSeen(hero, timelinePlayer(tl))
    }

    // ── 글자 지우기 타일: 네모 톡톡 → 쓸기 → "완성" (약 2초) ──
    const erase = sceneEl('erase')
    if (erase) {
      const q = s => erase.querySelector(s)
      const boxes = Array.from(erase.querySelectorAll('[data-erase-box]'))
      const tl = paused()
        .fromTo(boxes, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.2, stagger: 0.15, ease: 'back.out(2)' }, 0)
        .fromTo(q('[data-erase-top]'), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1, ease: 'power1.inOut' }, 0.65)
        .to(boxes, { opacity: 0, duration: 0.2, stagger: 0.2 }, 0.8)
        .fromTo(q('[data-erase-done]'), { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.3 }, 1.6)
      playWhenSeen(erase, timelinePlayer(tl))
    }

    // ── 원클릭 타일: 단계 4개가 차례로 켜지고 진행 막대 (약 2.5초) ──
    const oc = sceneEl('oneclick')
    if (oc) {
      const steps = Array.from(oc.querySelectorAll('[data-oc-step]'))
      const tl = paused()
        .fromTo(oc.querySelector('[data-oc-bar]'), { scaleX: 0 }, { scaleX: 1, duration: 2.4, ease: 'none' }, 0.1)
      ;[0.3, 0.9, 1.5, 2.1].forEach((at, i) => steps[i] && turnOn(tl, steps[i], at))
      playWhenSeen(oc, timelinePlayer(tl))
    }

    // ── 판매처 타일: 쿠팡 칩이 켜짐 ("준비 중" 칩은 data-ex-market이 없어 꺼진 채 그대로) ──
    const ex = sceneEl('export')
    if (ex) {
      const markets = Array.from(ex.querySelectorAll('[data-ex-market]'))
      const tl = paused()
      markets.forEach((m, i) => turnOn(tl, m, 0.3 + i * 0.35, 0.2))
      playWhenSeen(ex, timelinePlayer(tl))
    }

    // ── 만드는 순서·이용 안내·새 소식·마지막 안내: 아래에서 살짝 떠오름 (다시 재생 규칙 같음) ──
    $$('[data-reveal]').forEach(el => {
      const tl = paused().fromTo(el, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
      playWhenSeen(el, timelinePlayer(tl))
    })
  }, root)

  // 사진·글꼴이 다 들어온 뒤 위치 다시 계산
  const refresh = () => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  document.fonts?.ready?.then(refresh).catch(e => console.error('[StudioLanding] 글꼴 준비 확인 실패:', e))

  return () => {
    window.removeEventListener('load', refresh)
    ctx.revert()
  }
}
