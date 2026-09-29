<template>
  <!-- 홈 스튜디오 알림 칸 (2026-09-29) — 1688 검색 칸과 "실시간 비즈니스 데이터" 칸 사이. 광고 방문자가 눈에 띄는 그림 칸을 잘 누른다(간이관세 계산기)는 통계에 맞춤 -->
  <section
    ref="root" class="promo" :class="{ 'will-rise': rising, 'is-in': shown }"
    aria-labelledby="studio-promo-title" data-studio-promo
  >
    <!-- 그림: PC = 오른쪽 절반(왼쪽으로 갈수록 바탕에 녹아듦), 모바일 = 위에 세로 그림. 첫 화면 아래라 lazy, 폭·높이 지정 -->
    <div class="promo-pic" aria-hidden="true">
      <picture>
        <source media="(max-width: 639.98px)" srcset="/studio-landing/hero-mobile.webp" width="780" height="975" />
        <img src="/studio-landing/hero-pc.webp" width="1920" height="1047" alt="" loading="lazy" decoding="async" data-studio-promo-img />
      </picture>
    </div>

    <div class="promo-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="promo-copy">
        <span class="promo-badge">NEW · AI 스튜디오</span>
        <h2 id="studio-promo-title" class="promo-title">1688 링크 하나로 상세페이지부터 마켓 등록까지</h2>
        <p class="promo-lead">이유씨컴퍼니에서 사입하면 상세페이지 제작·판매처 등록 도구를 무료로 써요.</p>
        <!-- 판매처 칩 — 스튜디오 설정(studioMarketplaceRules.MARKETS)을 그대로 읽는다. 스튜디오 랜딩처럼 아직 연결 전인 곳은 "준비 중" -->
        <ul class="promo-mk" aria-label="판매처" data-studio-promo-markets>
          <li v-for="m in MARKETS" :key="m.key" :class="{ 'is-soon': m.soon }">
            {{ m.name }}<span v-if="m.soon" class="promo-mk-soon">준비 중</span>
          </li>
        </ul>
        <div class="promo-btns">
          <router-link :to="STUDIO_PATH" class="promo-btn promo-btn-studio" data-studio-promo-cta @click="trackStudioCta('home_band')">
            스튜디오 둘러보기 <i class="fas fa-arrow-right text-sm" aria-hidden="true"></i>
          </router-link>
          <a :href="KAKAO_CHAT_URL" target="_blank" rel="noopener noreferrer" class="promo-btn promo-btn-kakao" data-studio-promo-kakao>
            <i class="fas fa-comment" aria-hidden="true"></i> 카톡으로 물어보기
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 들어올 때 글이 살짝 떠오르는 효과 한 번 — CSS 전환만 쓴다 (움직임 줄이기 설정이면 없음).
 * 탭이 숨겨졌다 돌아오면(visibilitychange)·전환이 끝나면(transitionend) will-rise를 빼서 늘 끝난 모습으로 둔다 → 반투명으로 멈추지 않음.
 * JS가 돌기 전·IntersectionObserver가 없으면 처음부터 끝난 모습(will-rise를 붙이지 않음).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { MARKETS } from '@/lib/studioMarketplaceRules'
import { KAKAO_CHAT_URL, STUDIO_PATH, trackStudioCta } from '@/lib/homeCta'

const root = ref(null)
const rising = ref(false) // 떠오르기 전 모습을 쓰는 중
const shown = ref(false)
let io = null

function settle() {
  rising.value = false
  document.removeEventListener('visibilitychange', onVisible)
}
function onVisible() {
  if (document.visibilityState === 'visible' && shown.value) settle()
}
function onTransitionEnd(e) {
  if (e.target.classList?.contains('promo-copy')) settle()
}

onMounted(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce || typeof IntersectionObserver !== 'function' || !root.value) return
  rising.value = true
  root.value.addEventListener('transitionend', onTransitionEnd)
  document.addEventListener('visibilitychange', onVisible)
  io = new IntersectionObserver(entries => {
    if (!entries.some(en => en.isIntersecting)) return
    shown.value = true
    io.disconnect()
    io = null
    if (document.visibilityState !== 'visible') settle() // 숨은 탭에서 보였으면 전환 없이 바로 끝난 모습
  }, { threshold: 0.2 })
  io.observe(root.value)
})
onBeforeUnmount(() => {
  io?.disconnect()
  root.value?.removeEventListener('transitionend', onTransitionEnd)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<style scoped>
/* 바탕 = 스튜디오 랜딩 첫 화면의 진한 보라(#2a1a6e) → 남보라 → 아래 "실시간 비즈니스 데이터" 칸(slate-900 #0f172a)으로 이어짐 */
.promo {
  position: relative; overflow: hidden; color: #fff; isolation: isolate;
  background: linear-gradient(180deg, #2a1a6e 0%, #2a2176 38%, #1d1a57 72%, #0f172a 100%);
}
.promo-inner { position: relative; z-index: 1; }
.promo-copy { padding: 24px 0 36px; }
.promo-badge {
  display: inline-flex; align-items: center; padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 800; letter-spacing: 0.02em;
  color: #fde68a; background: rgba(245, 158, 11, 0.16); border: 1px solid rgba(245, 158, 11, 0.5);
}
.promo-title {
  margin-top: 14px; font-size: clamp(24px, 3.2vw, 40px); font-weight: 900; line-height: 1.25; letter-spacing: -0.03em;
  color: #fff; word-break: keep-all; text-shadow: 0 2px 16px rgba(20, 10, 60, 0.35);
}
.promo-lead { margin-top: 12px; font-size: clamp(14.5px, 1.3vw, 17px); line-height: 1.6; color: rgba(255, 255, 255, 0.9); word-break: keep-all; }
.promo-mk { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 6px; }
.promo-mk li {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 7px; font-size: 12.5px; font-weight: 700; white-space: nowrap;
  color: #fff; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4);
}
.promo-mk li.is-soon { color: rgba(255, 255, 255, 0.82); background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.22); }
.promo-mk-soon { padding: 0 5px; border-radius: 4px; font-size: 10.5px; background: rgba(255, 255, 255, 0.16); }
.promo-btns { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
.promo-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 26px; border-radius: 14px;
  font-size: 16px; font-weight: 900; transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}
.promo-btn:active { transform: scale(0.97); }
.promo-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.promo-btn-studio { background: #f59e0b; color: #1f1403; box-shadow: 0 10px 26px rgba(245, 158, 11, 0.35); }
.promo-btn-studio:hover { background: #fbbf24; }
.promo-btn-kakao { background: #fee500; color: #191919; }
.promo-btn-kakao:hover { background: #fde047; }

/* 모바일: 그림이 위(세로 그림 — 얼굴이 보이게 위쪽 기준), 아래로 바탕에 녹아듦 */
.promo-pic { position: relative; height: 280px; overflow: hidden; }
.promo-pic picture, .promo-pic img { display: block; width: 100%; height: 100%; }
.promo-pic img { object-fit: cover; object-position: 60% 22%; }
.promo-pic {
  -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 62%, transparent 100%);
}

/* 들어올 때 살짝 떠오름 (JS가 will-rise를 붙였을 때만) */
.will-rise .promo-copy { opacity: 0; transform: translateY(18px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
.will-rise.is-in .promo-copy { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .will-rise .promo-copy { opacity: 1; transform: none; transition: none; }
}

/* 640px 이상: 그림 = 오른쪽 절반 배경, 글 = 왼쪽. 높이 약 380~420px */
@media (min-width: 640px) {
  .promo { display: flex; align-items: center; min-height: 380px; }
  .promo-inner { width: 100%; }
  .promo-copy { max-width: 58%; padding: 34px 0 38px; }
  .promo-btns { flex-direction: row; flex-wrap: wrap; }
  .promo-pic { position: absolute; top: 0; bottom: 0; left: 40%; right: 0; height: auto; z-index: 0; }
  /* 그림 아래쪽 흰 물결이 보이지 않게 위쪽 74%만 보이도록 크게 — 얼굴(그림 가로 80%·세로 35%)은 가운데쯤 */
  .promo-pic picture { position: absolute; inset: 0; }
  .promo-pic img { position: absolute; top: 0; left: 0; width: 100%; height: 135%; object-position: 80% 0; }
  /* 왼쪽으로 갈수록·아래로 갈수록 바탕에 녹아듦 (두 덮개를 겹침) */
  .promo-pic {
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.55) 22%, #000 48%), linear-gradient(0deg, transparent 0%, #000 26%);
    -webkit-mask-composite: source-in;
    mask-image: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.55) 22%, #000 48%), linear-gradient(0deg, transparent 0%, #000 26%);
    mask-composite: intersect;
  }
}
@media (min-width: 1024px) {
  .promo { min-height: 400px; }
  .promo-copy { max-width: 54%; }
  .promo-pic { left: 42%; }
  /* 넓은 화면: 그림을 더 키우고 오른쪽 끝을 기준으로 — 얼굴이 화면 오른쪽 끝(떠 있는 영상 창 자리)보다 안쪽에 오게 */
  .promo-pic img { height: 150%; object-position: 100% 0; }
}
</style>
