<template>
  <!-- 홈 스튜디오 알림 칸 (2026-09-29 해성이 고른 움직이는 시안 — 코랄→주황) — 1688 검색 칸과 "실시간 비즈니스 데이터" 칸 사이.
       배치(% 위치·크기)·빛줄기 경로·움직임 순서는 시안(euchs-band-assets/reference-mockup.html) 그대로. 그림 = public/home-studio-band/ -->
  <section
    ref="root" class="band" :class="{ 'is-paused': paused, 'is-still': still }"
    aria-labelledby="studio-band-title" data-studio-promo
  >
    <div class="copy">
      <span class="pill">NEW · AI 스튜디오</span>
      <h2 id="studio-band-title" class="title">중국 수입부터<br />상세페이지·판매처 등록까지</h2>
      <p class="lead">
        1688 링크 하나로 상세페이지를 만들어 쿠팡·스마트스토어에 바로 보내요.<br />
        이유씨컴퍼니에서 사입하면 스튜디오 무료.
      </p>
      <!-- 판매처 칩 — 스튜디오 설정(studioMarketplaceRules.MARKETS)에서 이름·순서만 읽는다. 홈 칸은 soon 값을 쓰지 않고
           9곳 모두 초록 ✓ (2026-09-29 해성 지시 — 처음 한 번 차례로 톡, 그 뒤 계속) -->
      <ul class="chips" aria-label="판매처" data-studio-promo-markets>
        <li
          v-for="(m, k) in MARKETS" :key="m.key" class="chip"
          :class="{ on: checked[k], ping: pingKey === m.key }"
          :style="{ color: chipColor(m.key) }" :data-market="m.key"
        >
          {{ m.name }}
          <i aria-hidden="true">✓</i>
        </li>
      </ul>
      <div class="btns">
        <router-link :to="STUDIO_PATH" class="btn btn-studio" data-studio-promo-cta @click="trackStudioCta('home_band')">
          스튜디오 둘러보기 →
        </router-link>
        <router-link :to="MALL_PATH" class="btn btn-mall" data-studio-promo-mall @click="trackMallCta('home_band')">
          1688 소싱몰 가기 →
        </router-link>
      </div>
    </div>

    <!-- 오른쪽 그림 무대 (880:460) — 빛줄기 · 둥둥 떠 있는 그림 · 노트북 → 휴대폰으로 날아가는 카드 -->
    <div class="stage" aria-hidden="true" data-studio-promo-stage>
      <svg ref="trailSvg" class="trail" viewBox="0 0 880 460" preserveAspectRatio="none">
        <path class="glow" :d="TRAIL" />
        <path class="dash" :d="TRAIL" />
        <circle r="9" fill="#fff"><animateMotion dur="2.4s" repeatCount="indefinite" :path="TRAIL" /></circle>
      </svg>
      <img
        v-for="o in PROPS" :key="o.key" :class="['obj', o.anim]" :src="img(o.file)" :width="o.w" :height="o.h"
        :style="{ left: `${o.left}%`, top: `${o.top}%`, width: `${o.width}%` }" alt="" loading="lazy" decoding="async"
      />
      <div class="screen" style="left: 37%; top: 34%; width: 33%; aspect-ratio: 620 / 519" data-band-laptop>
        <img
          v-for="(s, k) in SCREENS" :key="s" :class="{ show: k === lapIdx }" :src="img(`laptop-${s}.webp`)"
          width="620" height="519" alt="" loading="lazy" decoding="async"
        />
      </div>
      <div ref="fly" class="fly" :class="{ go: flying }" @animationend="flying = false" />
      <div class="screen bob3" style="left: 68%; top: 18%; width: 13.5%; aspect-ratio: 229 / 460" data-band-phone>
        <img
          v-for="(s, k) in SCREENS" :key="s" :class="{ show: k === phoneIdx }" :src="img(`phone-${s}.webp`)"
          width="229" height="460" alt="" loading="lazy" decoding="async"
        />
      </div>
      <img
        v-for="o in PROPS_FRONT" :key="o.key" :class="['obj', o.anim]" :src="img(o.file)" :width="o.w" :height="o.h"
        :style="{ left: `${o.left}%`, top: `${o.top}%`, width: `${o.width}%` }" alt="" loading="lazy" decoding="async"
      />
    </div>
  </section>
</template>

<script setup>
/**
 * 움직임 (시안 순서 그대로): 3.2초마다 노트북 화면이 다음 상품으로 서서히 바뀜 → 흰 카드가 노트북→휴대폰으로 날아감(1.1초)
 *   → 0.9초 뒤 휴대폰 화면도 같은 상품 → 1.1초 뒤 판매처 칩 하나가(9곳을 차례로) 살짝 튀어 오르며 흰 테두리로 반짝(0.9초).
 *   ✓는 처음 보일 때 한 번 차례로 톡(0.6초 + 0.18초씩) 뜨고 그 뒤로는 계속 떠 있다.
 * 규칙: 칸이 화면에 보일 때만 움직인다(IntersectionObserver) — 밖이거나 탭이 숨으면 멈춤(is-paused: CSS 움직임·SVG 멈춤, 타이머 끔).
 *   멈출 때는 늘 완성된 모습으로 맞춘다(휴대폰 = 노트북과 같은 상품, 날아가는 카드·반짝 없앰, ✓ 모두 표시) → 반투명·중간 상태로 서 있지 않음.
 *   글·그림은 처음부터 다 보인다(opacity 0으로 기다리지 않음). 움직임 줄이기면 움직임 없이 완성 장면(첫 화면 + ✓)만(is-still).
 */
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { MARKETS } from '@/lib/studioMarketplaceRules'
import { STUDIO_PATH, MALL_PATH, trackStudioCta, trackMallCta } from '@/lib/homeCta'

const BASE = '/home-studio-band/'
const img = f => `${BASE}${f}`
// 빛줄기 경로 (시안 viewBox 880×460)
const TRAIL = 'M60 380 C130 360 170 260 250 240 S380 330 470 320 S590 230 690 200'
// 노트북 뒤쪽 그림 (시안 순서·% 그대로). w·h = 파일 원래 크기(비율 — 화면 밀림 없게)
const PROPS = [
  { key: 'ship', file: 'ship.webp', w: 420, h: 356, left: 1, top: 72, width: 10.5, anim: 'bob2' },
  { key: 'boxes', file: 'boxes.webp', w: 420, h: 420, left: 8, top: 52, width: 12.5, anim: 'bob' },
  { key: 'frame', file: 'frame.webp', w: 400, h: 365, left: 23, top: 20, width: 18.5, anim: 'bob3' },
  { key: 'spark1', file: 'sparkles.webp', w: 420, h: 384, left: 17, top: 24, width: 5.5, anim: 'twinkle' },
]
// 휴대폰 앞쪽 그림 — 시안은 오른쪽 위에도 쇼핑백을 한 번 더 썼는데, 지시(배·상자·액자·쇼핑백·앱칸)대로 그 자리는 앱칸(tiles)
const PROPS_FRONT = [
  { key: 'spark2', file: 'sparkles.webp', w: 420, h: 384, left: 59, top: 11, width: 9, anim: 'twinkle' },
  { key: 'bag', file: 'bag.webp', w: 375, h: 420, left: 82, top: 62, width: 12.5, anim: 'bob' },
  { key: 'tiles', file: 'tiles.webp', w: 420, h: 412, left: 86, top: 6, width: 11, anim: 'bob2' },
]
const SCREENS = ['beauty', 'pet', 'kitchen']
// 판매처 글자색 — 시안의 5곳, 나머지는 진한 회색
const CHIP_COLORS = { coupang: '#e93834', smartstore: '#03c75a', '11st': '#ff0032', gmarket: '#50b43c', cafe24: '#285ae6' }
const chipColor = key => CHIP_COLORS[key] || '#50556e'
// 반짝임은 9곳을 차례로 한 곳씩 (노트북 화면 번호와 따로 세는 순번)
const pingKeys = MARKETS.map(m => m.key)
let pingSeq = 0

const STEP_MS = 3200
const root = ref(null)
const trailSvg = ref(null)
const lapIdx = ref(0)
const phoneIdx = ref(0)
const flying = ref(false)
const pingKey = ref(null)
const checked = reactive(MARKETS.map(() => false))
const paused = ref(true)   // 처음엔 멈춤 — 보일 때 시작
const still = ref(false)   // 움직임 줄이기
let visible = false
let started = false
let stepTimer = null
let timeouts = []
let io = null

const later = (fn, ms) => { timeouts.push(setTimeout(fn, ms)) }
function clearTimers() {
  clearInterval(stepTimer); stepTimer = null
  timeouts.forEach(clearTimeout); timeouts = []
}
function showAllChecks() { MARKETS.forEach((m, k) => { checked[k] = true }) }

function step() {
  lapIdx.value = (lapIdx.value + 1) % SCREENS.length
  flying.value = false
  requestAnimationFrame(() => { flying.value = true }) // 같은 클래스를 다시 붙여 날아가기를 처음부터
  const i = lapIdx.value
  later(() => { phoneIdx.value = i }, 900)
  if (pingKeys.length) {
    const key = pingKeys[pingSeq % pingKeys.length]
    pingSeq++
    later(() => { pingKey.value = key; later(() => { if (pingKey.value === key) pingKey.value = null }, 900) }, 1100)
  }
}

function play() {
  if (still.value || !paused.value) return
  paused.value = false
  trailSvg.value?.unpauseAnimations?.()
  if (!started) {
    started = true
    MARKETS.forEach((m, k) => { later(() => { checked[k] = true }, 600 + k * 180) })
  }
  stepTimer = setInterval(step, STEP_MS)
}
/** 멈춤 — 늘 완성된 모습으로 맞춘다 */
function pause() {
  clearTimers()
  paused.value = true
  trailSvg.value?.pauseAnimations?.()
  flying.value = false
  pingKey.value = null
  phoneIdx.value = lapIdx.value
  if (started) showAllChecks()
}
function sync() {
  if (visible && document.visibilityState === 'visible') play()
  else if (!paused.value) pause()
}
function onVisibility() { sync() }

onMounted(() => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    still.value = true
    showAllChecks()
    trailSvg.value?.pauseAnimations?.()
    return
  }
  trailSvg.value?.pauseAnimations?.()
  document.addEventListener('visibilitychange', onVisibility)
  if (typeof IntersectionObserver !== 'function') { visible = true; sync(); return }
  io = new IntersectionObserver(entries => {
    visible = entries.some(en => en.isIntersecting)
    sync()
  }, { threshold: 0.15 })
  io.observe(root.value)
})
onBeforeUnmount(() => {
  io?.disconnect()
  clearTimers()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
/* 바탕: 코랄 → 주황 + 오른쪽 위 흰 빛 번짐 (시안 1). 글자 흰색 */
.band {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(0, 44fr) minmax(0, 56fr); align-items: center; gap: 12px; /* 시안 40:60 → 제목이 두 줄에 들게 44:56 */
  padding: 40px 0 40px 7%;
  background: linear-gradient(100deg, #ff6b6b, #ffa64d);
}
.band::before {
  content: ''; position: absolute; right: 8%; top: -30%; width: 45%; aspect-ratio: 1; border-radius: 50%;
  background: rgba(255, 255, 255, 0.28); filter: blur(60px); pointer-events: none;
}
.copy { position: relative; z-index: 2; min-width: 0; }
.pill { display: inline-block; background: #fff; color: #e0503c; font-weight: 700; font-size: 14px; border-radius: 999px; padding: 6px 14px; }
.title {
  color: #fff; font-weight: 900; font-size: clamp(22px, 2.7vw, 42px); line-height: 1.22; margin: 14px 0 12px;
  letter-spacing: -0.02em; word-break: keep-all; text-wrap: balance; text-shadow: 0 2px 12px rgba(150, 40, 20, 0.18);
}
.lead { color: #fff3ee; font-weight: 500; font-size: clamp(14px, 1.15vw, 17px); line-height: 1.6; margin: 0 0 14px; word-break: keep-all; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.chip {
  background: #fff; border-radius: 8px; padding: 5px 10px; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 5px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.chip i {
  font-style: normal; width: 16px; height: 16px; border-radius: 50%; background: #16a34a; color: #fff; font-size: 10px;
  display: grid; place-items: center; transform: scale(0);
}
.chip.on i { animation: pop 0.4s ease forwards; }
.chip.ping { transform: translateY(-3px); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9), 0 8px 18px rgba(20, 24, 48, 0.25); }
.btns { display: flex; flex-wrap: wrap; gap: 10px; }
.btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; border-radius: 12px; padding: 12px 20px; transition: transform 0.15s ease, filter 0.15s ease; }
.btn:hover { filter: brightness(1.08); }
.btn:active { transform: scale(0.97); }
.btn:focus-visible { outline: 3px solid #141830; outline-offset: 2px; }
.btn-studio { background: #141830; color: #fff; }
.btn-mall { background: #fff; color: #e0503c; }

/* 그림 무대 */
.stage { position: relative; aspect-ratio: 880 / 460; width: 100%; min-width: 0; z-index: 1; }
.obj, .screen img { filter: drop-shadow(8px 14px 14px rgba(20, 20, 40, 0.28)); }
.obj { position: absolute; height: auto; }
.trail { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.trail path { fill: none; stroke: #fff; stroke-width: 6; stroke-linecap: round; opacity: 0.85; stroke-dasharray: 14 12; animation: flow 1.2s linear infinite; }
.trail .glow { stroke-width: 18; opacity: 0.25; stroke-dasharray: none; filter: blur(6px); animation: none; }
.screen { position: absolute; }
.screen img { position: absolute; inset: 0; width: 100%; height: auto; opacity: 0; transition: opacity 0.6s ease; }
.screen img.show { opacity: 1; }
.bob { animation: bob 3.2s ease-in-out infinite; }
.bob2 { animation: bob 3.8s ease-in-out -1.2s infinite; }
.bob3 { animation: bob 2.8s ease-in-out -0.6s infinite; }
.twinkle { animation: twinkle 1.8s ease-in-out infinite; }
.fly { position: absolute; width: 7%; aspect-ratio: 1; border-radius: 8px; background: #fff; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2); left: 48%; top: 48%; opacity: 0; pointer-events: none; }
.fly.go { animation: fly 1.1s cubic-bezier(0.5, 0, 0.3, 1) forwards; }
@keyframes flow { to { stroke-dashoffset: -26; } }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4%); } }
@keyframes twinkle { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.18) rotate(12deg); } }
@keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.3); } 100% { transform: scale(1); } }
@keyframes fly { 0% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { opacity: 0; transform: translate(330%, -180%) scale(0.5); } }

/* 화면 밖·숨은 탭: 움직임 멈춤 (멈춘 자리 그대로 다 보임 — 날아가는 카드는 JS가 없앰) */
.is-paused .bob, .is-paused .bob2, .is-paused .bob3, .is-paused .twinkle, .is-paused .trail path { animation-play-state: paused; }
/* 움직임 줄이기: 움직임 없이 완성 장면 */
.is-still .bob, .is-still .bob2, .is-still .bob3, .is-still .twinkle, .is-still .trail path, .is-still .fly { animation: none; }
.is-still .chip.on i { animation: none; transform: scale(1); }
.is-still .screen img, .is-still .chip { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .band *, .band *::before { animation: none !important; transition: none !important; }
  .chip.on i { transform: scale(1); }
}

/* 761~1279px: 오른쪽 아래 QuickMenu 자리만큼 여백 */
@media (min-width: 760px) {
  .band { padding-right: 64px; }
}
/* 1280px 이상: 오른쪽에 떠 있는 9:16 영상 창(오른쪽 20~84px + 폭 140px)·QuickMenu와 휴대폰·노트북이 겹치지 않게 무대 오른쪽 여백 */
@media (min-width: 1280px) {
  .band { padding-right: 180px; }
}
/* 모바일(760px 미만): 그림 무대 위, 글·칩·버튼 아래, 버튼은 가로 꽉 차게 */
@media (max-width: 759.98px) {
  .band { grid-template-columns: 1fr; padding: 28px 16px; }
  .stage { order: -1; }
  .title { font-size: clamp(22px, 6.6vw, 30px); }
  .btns { flex-direction: column; }
  .btn { width: 100%; min-height: 50px; font-size: 16px; }
}
</style>
