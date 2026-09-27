/**
 * 스튜디오 랜딩 모션 — GSAP + ScrollTrigger (GSAP Standard "no charge" License, 상업 사용 무료).
 * ★ 이 파일은 StudioLandingView가 동적 import로만 불러온다 → gsap은 랜딩 청크에만 들어간다(편집기·ERP 번들에 안 섞임).
 * ★ 화면(.vue)의 기본 CSS = 각 장면의 "끝난 모습". 여기서는 fromTo로 시작 모습을 정해 움직인다(fromTo는 만들 때 바로 시작 모습을 그림).
 *   그래서 움직임 줄이기 설정이거나 이 파일을 못 불러와도 내용은 다 보인다.
 * ★ transform·opacity 위주 (지우기 쓸기만 clip-path 한 장). 켜짐 표시는 CSS 변수 --on(0~1)을 opacity에 씀.
 *
 * 재생 방식 (모든 화면 너비 같음 — 화면 고정(pin)·스크롤 양에 묶인 진행(scrub) 없음, 스크롤은 그냥 내려간다):
 *   장면이 화면에 약 30% 들어오면 그 장면 타임라인을 처음부터 자동 재생(2~3초) → 끝난 모습으로 멈춤.
 *   장면이 화면 밖으로 완전히 나가면(위·아래 어느 쪽이든) 시작 모습으로 되돌려 두고, 다시 들어오면 처음부터 다시 재생.
 *   장면 그림 자리에 영상(studioLandingMedia의 video)이 있으면 타임라인 대신 영상을 같은 규칙으로 재생·멈춤.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const DESKTOP = '(min-width: 768px)'
const MOBILE = '(max-width: 767px)'
const SCATTER = [[-420, -60, -14], [380, -140, 11], [-360, 220, 8], [420, 160, -9], [-60, 320, 5]]
const PLAY_AT = 'top 70%'    // 장면 윗변이 화면 아래에서 30% 올라오면 = 약 30% 들어옴
const PLAY_BACK_AT = 'bottom 30%' // 위로 올라올 때: 장면 아랫변이 화면 위에서 30% 내려오면

/**
 * 보이면 재생 · 완전히 나가면 되돌림 — 타임라인이든 영상이든 같은 규칙.
 * @param {HTMLElement} el 장면 요소
 * @param {{ play: () => void, reset: () => void }} player
 */
function playWhenSeen(el, player) {
  let armed = true // 처음이거나, 화면 밖으로 완전히 나갔다 온 뒤에만 재생
  // self.isActive = 지금 정말 보이는 중일 때만 (Home/End·[어떻게 되는지 보기]처럼 한 번에 건너뛰면 지나친 장면에도
  // onEnter가 불린다 — 그때 재생해 버리면 화면 밖에서 끝나고, 정작 도착했을 때 다시 재생되지 않는다)
  const play = self => { if (armed && self.isActive) { armed = false; player.play() } }
  // 재생 기준 = 장면의 그림 자리(data-scene-visual) — 좁은 화면은 글 아래에 그림이 있어, 장면 윗변 기준이면 그림이 보이기 전에 끝난다
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
  const mm = gsap.matchMedia(root)
  mm.add({ desktop: DESKTOP, mobile: MOBILE }, ctx => {
    const desktop = !!ctx.conditions.desktop
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

    // ── 히어로 등장 (페이지에 들어오자마자 한 번 — 전후 비교 반복은 CSS) ──
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo($$('[data-hero-in]'), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.09 })
      .fromTo($('[data-hero-visual]'), { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 1 }, 0.15)

    // ── 01 글자 지우기: 네모 톡톡(0.5초) → 빛줄기 쓸기(1초) → "원본은 그대로" (약 2초) ──
    const erase = sceneEl('erase')
    if (erase) {
      const q = s => erase.querySelector(s)
      const boxes = $$('[data-erase-box]')
      const tl = paused()
        .fromTo(boxes, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.2, stagger: 0.15, ease: 'back.out(2)' }, 0)
        .fromTo(q('[data-erase-line]'), { xPercent: 0, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.1 }, 0.6)
        .fromTo(q('[data-erase-top]'), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1, ease: 'power1.inOut' }, 0.65)
        .to(q('[data-erase-line]'), { xPercent: 100, duration: 1, ease: 'power1.inOut' }, 0.65)
        .to(boxes, { opacity: 0, duration: 0.2, stagger: 0.25 }, 0.75)
        .to(q('[data-erase-line]'), { opacity: 0, duration: 0.15 }, 1.65)
        .fromTo(q('[data-erase-done]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, 1.7)
      playWhenSeen(erase, timelinePlayer(tl))
    }

    // ── 02 배경: 원래 → 투명 → 단색 → AI, 약 0.7초마다 · 아래 4칸 같이 (약 2.2초) ──
    const bg = sceneEl('bg')
    if (bg) {
      const L = k => bg.querySelector(`[data-bg-layer="${k}"]`)
      const s = $$('[data-bg-step]')
      const tl = paused()
      tl.fromTo(s[0], { '--on': 1 }, { '--on': 0, duration: 0.15 }, 0.4)
        .fromTo(L('orig'), { opacity: 1 }, { opacity: 0, duration: 0.35 }, 0.4)
      turnOn(tl, s[1], 0.4)
      tl.to(s[1], { '--on': 0, duration: 0.15 }, 1.1)
        .fromTo(L('color'), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 1.1)
      turnOn(tl, s[2], 1.1)
      tl.to(s[2], { '--on': 0, duration: 0.15 }, 1.8)
        .fromTo(L('ai'), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 1.8)
      turnOn(tl, s[3], 1.8)
      playWhenSeen(bg, timelinePlayer(tl))
    }

    // ── 03 원클릭: 카드 5장이 0.3초 간격으로 날아와 쌓임 · 단계 체크 4개 · 진행 막대 (약 2.5초) ──
    const oc = sceneEl('oneclick')
    if (oc) {
      const cards = $$('[data-oc-card]')
      const steps = $$('[data-oc-step]')
      const k = desktop ? 1 : 0.4
      const sc = (i, j) => SCATTER[i % SCATTER.length][j] * (j === 2 ? 1 : k)
      const tl = paused()
        .fromTo(cards,
          { x: i => sc(i, 0), y: i => sc(i, 1), rotation: i => sc(i, 2), scale: 0.82, opacity: 0 },
          { x: i => sc(i, 0), y: i => sc(i, 1), rotation: i => sc(i, 2), scale: 0.82, opacity: 1, duration: 0.25, stagger: 0.05 }, 0)
        .to(cards, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.6, stagger: 0.3, ease: 'power3.out' }, 0.25)
        .fromTo($$('[data-oc-before]'), { opacity: 1 }, { opacity: 0, duration: 0.3, stagger: 0.3 }, 0.8)
        .fromTo(oc.querySelector('[data-oc-title]'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3 }, 2.0)
        .fromTo(oc.querySelector('[data-oc-bar]'), { scaleX: 0 }, { scaleX: 1, duration: 2.4, ease: 'none' }, 0.1)
      ;[0.2, 0.9, 1.6, 2.3].forEach((at, i) => steps[i] && turnOn(tl, steps[i], at))
      playWhenSeen(oc, timelinePlayer(tl))
    }

    // ── 04 편집기: 모형이 떠오르고 도구 5개가 0.5초 간격으로 켜지며 설명이 바뀜 (약 3초) ──
    const ed = sceneEl('editor')
    if (ed) {
      const tools = $$('[data-ed-tool]')
      const caps = $$('[data-ed-cap]')
      const tl = paused()
        .fromTo(ed.querySelector('[data-ed-win]'),
          { y: desktop ? 70 : 40, opacity: 0, rotationX: desktop ? 10 : 0 },
          { y: 0, opacity: 1, rotationX: 0, duration: 0.6, ease: 'power3.out' }, 0)
      tools.forEach((t, i) => {
        const at = 0.7 + i * 0.5
        turnOn(tl, t, at)
        tl.fromTo(caps[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.15 }, at)
        if (i < tools.length - 1) tl.to(t, { '--on': 0, duration: 0.15 }, at + 0.45).to(caps[i], { opacity: 0, y: -8, duration: 0.12 }, at + 0.4)
      })
      playWhenSeen(ed, timelinePlayer(tl))
    }

    // ── 05 내보내기: 사본이 쿠팡 → 카페24 → 고도몰 → 메이크샵으로 차례로, 도착하면 체크 (약 2.5초) ──
    const ex = sceneEl('export')
    if (ex) {
      const sheets = $$('[data-ex-sheet]')
      const markets = $$('[data-ex-market]')
      const origin = ex.querySelector('[data-ex-origin]')
      const delta = i => {
        const a = origin.getBoundingClientRect()
        const b = markets[i].getBoundingClientRect()
        return { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2) }
      }
      const tl = paused()
        .fromTo(ex.querySelector('[data-ex-page]'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0)
      sheets.forEach((s, i) => {
        if (!markets[i]) return
        const at = 0.5 + i * 0.45
        tl.fromTo(s, { x: 0, y: 0, scale: 1, opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.08 }, at)
          // 도착 자리는 재생할 때마다 다시 잰다 (창 크기가 바뀌어도 맞게)
          .to(s, { x: () => delta(i).x, y: () => delta(i).y, scale: 0.35, duration: 0.6, ease: 'power2.inOut' }, at)
          .to(s, { opacity: 0, duration: 0.1 }, at + 0.55)
        turnOn(tl, markets[i], at + 0.55)
      })
      playWhenSeen(ex, { play: () => { tl.invalidate(); tl.restart() }, reset: () => tl.pause(0) })
    }

    // ── 이용 안내·마지막 안내: 아래에서 살짝 떠오름 (다시 재생 규칙 같음) ──
    $$('[data-reveal]').forEach(el => {
      const tl = paused().fromTo(el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' })
      playWhenSeen(el, timelinePlayer(tl))
    })
  })

  // 사진·글꼴이 다 들어온 뒤 위치 다시 계산
  const refresh = () => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  document.fonts?.ready?.then(refresh).catch(e => console.error('[StudioLanding] 글꼴 준비 확인 실패:', e))

  return () => {
    window.removeEventListener('load', refresh)
    mm.revert()
  }
}
