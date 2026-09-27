/**
 * 스튜디오 랜딩 스크롤 모션 — GSAP + ScrollTrigger (GSAP Standard "no charge" License, 상업 사용 무료).
 * ★ 이 파일은 StudioLandingView가 동적 import로만 불러온다 → gsap은 랜딩 청크에만 들어간다(편집기·ERP 번들에 안 섞임).
 * ★ 화면(.vue)의 기본 CSS = 각 장면의 "끝난 모습". 여기서는 fromTo로 시작 모습을 정해 움직인다(fromTo는 만들 때 바로 시작 모습을 그림).
 *   그래서 움직임 줄이기 설정이거나 이 파일을 못 불러와도 내용은 다 보인다.
 * ★ transform·opacity 위주 (지우기 쓸기만 clip-path 한 장). 켜짐 표시는 CSS 변수 --on(0~1)을 opacity에 씀.
 *
 * 넓은 화면(768px 이상): 장면마다 화면에 고정(pin)하고 스크롤 = 진행.
 * 좁은 화면: 고정 없이, 장면이 보이면 한 번 재생(가볍게 — 흩어진 거리 줄임).
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const DESKTOP = '(min-width: 768px)'
const MOBILE = '(max-width: 767px)'
const SCATTER = [[-420, -60, -14], [380, -140, 11], [-360, 220, 8], [420, 160, -9], [-60, 320, 5]]

/** @param {HTMLElement} root 랜딩 최상위 요소 @returns {() => void} 정리 함수 */
export function startLandingMotion(root) {
  const mm = gsap.matchMedia(root)
  mm.add({ desktop: DESKTOP, mobile: MOBILE }, ctx => {
    const desktop = !!ctx.conditions.desktop
    const $ = sel => root.querySelector(sel)
    const $$ = sel => Array.from(root.querySelectorAll(sel))
    const turnOn = (tl, el, at) => tl.fromTo(el, { '--on': 0 }, { '--on': 1, duration: 0.25 }, at)

    // 장면 타임라인 — 넓은 화면은 고정 + 스크럽, 좁은 화면은 보이면 재생
    // 고정 거리 = 화면 높이 × vh배 (0.6~0.8 — 예전 1,300~1,600px 고정은 휠을 굴려도 멈춘 것처럼 느껴졌다).
    // scrub: true = 스크롤과 화면이 지연 없이 같이 움직임. 장면 안 순서·내용은 같고 진행만 빨라짐.
    const scene = (el, vh) => gsap.timeline({
      defaults: { ease: desktop ? 'none' : 'power2.out', duration: 1 },
      scrollTrigger: desktop
        ? { trigger: el, start: 'top top', end: () => `+=${Math.round(window.innerHeight * vh)}`, scrub: true, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
        : { trigger: el, start: 'top 72%', toggleActions: 'play none none none', invalidateOnRefresh: true },
    }).timeScale(desktop ? 1 : 1.6)

    // ── 1. 히어로 등장 (스크롤 없이 한 번) ──
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo($$('[data-hero-in]'), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.09 })
      .fromTo($('[data-hero-visual]'), { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 1 }, 0.15)

    // ── 2. 글자 지우기: 글자 찾기 네모 → 빛줄기가 훑으며 지움 ──
    const erase = $('[data-scene="erase"]')
    if (erase) {
      const q = s => erase.querySelector(s)
      const boxes = $$('[data-erase-box]')
      scene(erase, 0.65)
        .fromTo(boxes, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, stagger: 0.25, duration: 0.6 }, 0.1)
        .fromTo(q('[data-erase-line]'), { xPercent: 0, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.2 }, 1.1)
        .fromTo(q('[data-erase-top]'), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: 2 }, 1.3)
        .to(q('[data-erase-line]'), { xPercent: 100, duration: 2 }, 1.3)
        .to(boxes, { opacity: 0, duration: 0.4, stagger: 0.45 }, 1.5)
        .to(q('[data-erase-line]'), { opacity: 0, duration: 0.2 }, 3.3)
        .fromTo(q('[data-erase-done]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 3.3)
    }

    // ── 3. 배경: 원래 배경 → 투명 → 단색 → AI 배경 (제품은 그대로) ──
    const bg = $('[data-scene="bg"]')
    if (bg) {
      const L = k => bg.querySelector(`[data-bg-layer="${k}"]`)
      const s = $$('[data-bg-step]')
      const tl = scene(bg, 0.7)
      tl.fromTo(L('orig'), { opacity: 1 }, { opacity: 0, duration: 0.8 }, 0.5)
        .fromTo(s[0], { '--on': 1 }, { '--on': 0, duration: 0.25 }, 0.5)
      turnOn(tl, s[1], 0.5)
      tl.fromTo(L('color'), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.8)
        .to(s[1], { '--on': 0, duration: 0.25 }, 1.8)
      turnOn(tl, s[2], 1.8)
      tl.fromTo(L('ai'), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 3.1)
        .to(s[2], { '--on': 0, duration: 0.25 }, 3.1)
      turnOn(tl, s[3], 3.1)
      tl.to({}, { duration: 0.6 })
    }

    // ── 4. 원클릭: 흩어진 사진이 날아와 긴 상세페이지로 쌓임 + 진행 단계 ──
    const oc = $('[data-scene="oneclick"]')
    if (oc) {
      const cards = $$('[data-oc-card]')
      const steps = $$('[data-oc-step]')
      const k = desktop ? 1 : 0.4
      const sc = (i, j) => SCATTER[i % SCATTER.length][j] * (j === 2 ? 1 : k)
      const tl = scene(oc, 0.8)
      tl.fromTo(cards,
        { x: i => sc(i, 0), y: i => sc(i, 1), rotation: i => sc(i, 2), scale: 0.82, opacity: 0 },
        { x: i => sc(i, 0), y: i => sc(i, 1), rotation: i => sc(i, 2), scale: 0.82, opacity: 1, duration: 0.4, stagger: 0.08 }, 0)
        .to(cards, { x: 0, y: 0, rotation: 0, scale: 1, duration: 1.1, stagger: 0.28, ease: desktop ? 'power1.inOut' : 'power3.out' }, 0.7)
        .fromTo($$('[data-oc-before]'), { opacity: 1 }, { opacity: 0, duration: 0.5, stagger: 0.28 }, 1.5)
        .fromTo(oc.querySelector('[data-oc-title]'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5 }, 2.9)
        .fromTo(oc.querySelector('[data-oc-bar]'), { scaleX: 0 }, { scaleX: 1, duration: 3.4 }, 0.2)
      ;[0.2, 1.2, 2.4, 3.1].forEach((at, i) => steps[i] && turnOn(tl, steps[i], at))
    }

    // ── 5. 편집: 편집기 모형이 떠오르고 도구가 차례로 켜짐 ──
    const ed = $('[data-scene="editor"]')
    if (ed) {
      const tools = $$('[data-ed-tool]')
      const caps = $$('[data-ed-cap]')
      const tl = scene(ed, 0.7)
      tl.fromTo(ed.querySelector('[data-ed-win]'),
        { y: desktop ? 90 : 40, opacity: 0, rotationX: desktop ? 10 : 0 },
        { y: 0, opacity: 1, rotationX: 0, duration: 1 }, 0)
      tools.forEach((t, i) => {
        const at = 1 + i * 0.7
        turnOn(tl, t, at)
        tl.fromTo(caps[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }, at)
        if (i < tools.length - 1) tl.to(t, { '--on': 0, duration: 0.25 }, at + 0.6).to(caps[i], { opacity: 0, y: -8, duration: 0.2 }, at + 0.55)
      })
      tl.to({}, { duration: 0.5 })
    }

    // ── 6. 내보내기: 완성 페이지 사본이 판매처 이름으로 흘러감 ──
    const ex = $('[data-scene="export"]')
    if (ex) {
      const sheets = $$('[data-ex-sheet]')
      const markets = $$('[data-ex-market]')
      const origin = ex.querySelector('[data-ex-origin]')
      const delta = i => {
        const a = origin.getBoundingClientRect()
        const b = markets[i].getBoundingClientRect()
        return { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2) }
      }
      const tl = scene(ex, 0.6)
      tl.fromTo(ex.querySelector('[data-ex-page]'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0)
      sheets.forEach((s, i) => {
        if (!markets[i]) return
        const at = 0.7 + i * 0.45
        tl.fromTo(s, { x: 0, y: 0, scale: 1, opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.1 }, at)
          .to(s, { x: () => delta(i).x, y: () => delta(i).y, scale: 0.35, duration: 0.9, ease: desktop ? 'power1.inOut' : 'power2.inOut' }, at)
          .to(s, { opacity: 0, duration: 0.15 }, at + 0.85)
        turnOn(tl, markets[i], at + 0.85)
      })
      tl.to({}, { duration: 0.4 })
    }

    // ── 7·8. 혜택·마지막 안내: 보이면 떠오름 ──
    $$('[data-reveal]').forEach(el => {
      gsap.fromTo(el, { y: 36, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
      })
    })
  })

  // 사진·글꼴이 다 들어온 뒤 위치 다시 계산 (고정 구간 길이가 어긋나지 않게)
  const refresh = () => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  document.fonts?.ready?.then(refresh).catch(e => console.error('[StudioLanding] 글꼴 준비 확인 실패:', e))

  return () => {
    window.removeEventListener('load', refresh)
    mm.revert()
  }
}
