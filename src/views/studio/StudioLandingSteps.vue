<template>
  <!-- 랜딩 "세 단계면 끝나요" 카드 3장 — 카드마다 3~4초 반복 시연(CSS 키프레임). 랜딩(StudioLandingView)에서만 쓴다.
       기본 CSS = 시연이 끝난 모습 → 움직임 줄이기·화면 밖이면 그 한 장면으로 멈춰 보인다.
       화면에 보이면 is-playing을 붙여 처음부터 반복, 완전히 나가면 뗀다(IntersectionObserver). 탭이 다시 보이면 처음부터 다시 튼다. -->
  <ol class="steps">
    <li v-for="(s, i) in STEPS" :key="s.title" ref="itemRefs" class="step-item" :data-step="i" data-reveal>
      <div class="step">
        <span class="step-bg-no" aria-hidden="true">{{ stepNo(i) }}</span>
        <span class="step-no">{{ stepNo(i) }}</span>
        <h3 class="step-h">{{ s.title }}</h3>
        <p class="step-p">{{ s.desc }}</p>

        <div class="demo" :class="{ 'is-playing': playing[i] && !restarting }" role="img" :aria-label="s.demoAlt" :data-demo="s.key">
          <!-- 01 가져오기: 주소가 한 글자씩 → 상품 카드 3장이 톡톡 -->
          <div v-if="s.key === 'import'" class="demo-stage" aria-hidden="true">
            <div class="d1-bar">
              <Link class="w-3.5 h-3.5" :stroke-width="2.4" />
              <span class="d1-url">{{ DEMO_URL }}</span>
              <span class="d1-caret" />
            </div>
            <div v-for="p in IMPORT_PHOTOS" :key="p" class="d1-tile">
              <img :src="p" alt="" width="400" height="400" loading="lazy" decoding="async" />
              <span class="d1-line" /><span class="d1-line is-price" />
            </div>
          </div>

          <!-- 02 다듬기: 지우개가 지나가면 얹은 글자와 누런 바탕이 사라지고 흰 배경 사진으로 (사진 원본은 그대로, 글자·바탕색은 코드로 얹음) -->
          <div v-else-if="s.key === 'edit'" class="demo-stage" aria-hidden="true">
            <div class="d2-photo">
              <img :src="EDIT_PHOTO" alt="" width="400" height="400" loading="lazy" decoding="async" />
              <div class="d2-before">
                <img :src="EDIT_PHOTO" alt="" width="400" height="400" loading="lazy" decoding="async" />
                <span class="d2-tint" />
                <span class="d2-stamp">特价</span>
                <span class="d2-band">包邮 · 爆款</span>
              </div>
              <span class="d2-tag is-before">원본</span>
              <span class="d2-tag is-after">완성</span>
            </div>
            <div class="d2-sweep"><span class="d2-bar" /><span class="d2-eraser"><Eraser class="w-3.5 h-3.5" :stroke-width="2.4" /></span></div>
          </div>

          <!-- 03 올리기: 긴 상세페이지가 섹션별로 잘려 → 판매처 칩으로 날아가 꽂힘 → ✓ -->
          <div v-else class="demo-stage" aria-hidden="true">
            <div class="d3-page">
              <div v-for="(sec, k) in PAGE_SECTIONS" :key="k" class="d3-sec" :class="{ 'is-photo': sec.photo }" :style="sec.style">
                <img v-if="sec.photo" :src="sec.photo" alt="" width="400" height="400" loading="lazy" decoding="async" />
                <template v-else><span class="d3-line" /><span class="d3-line is-short" /></template>
              </div>
              <span v-for="y in CUT_LINES" :key="y" class="d3-cut" :style="{ top: `${y}px` }" />
            </div>
            <span v-for="(m, k) in SEND_TO" :key="m" class="mk-chip d3-chip" :class="`is-${k + 1}`">
              {{ m }}<span class="d3-check"><Check class="w-2.5 h-2.5" :stroke-width="3.5" /></span>
            </span>
          </div>
        </div>
        <p class="step-tags">{{ s.tags.join(' · ') }}</p>
      </div>
    </li>
  </ol>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Link, Eraser, Check } from 'lucide-vue-next'

const props = defineProps({
  still: { type: Boolean, default: false }, // 움직임 줄이기·모션 못 불러옴 = 끝난 모습 한 장면만
})

const STEPS = [
  { key: 'import', title: '가져오기', desc: '상품 링크, 찜한 상품, 주문한 상품, 내 사진 어디서든 시작해요.', tags: ['상품 링크', '주문한 상품', '내 사진'], demoAlt: '상품 주소를 넣으면 상품 사진이 한 번에 들어오는 모습' },
  { key: 'edit', title: '다듬기', desc: '필요 없는 글자와 배경을 AI로 정리하고, 원클릭으로 페이지 초안을 받아요.', tags: ['AI로 지우기', '배경 바꾸기', '원클릭 초안'], demoAlt: '사진 위 글자와 배경이 지워져 깔끔한 흰 배경 사진이 되는 모습' },
  { key: 'send', title: '올리기', desc: '섹션별 여러 장 또는 한 장으로 길게 받아 판매처에 올려요.', tags: ['JPG · PNG', '내 상품에 보관'], demoAlt: '상세페이지가 섹션별로 나뉘어 판매처로 보내지는 모습' },
]
const stepNo = i => String(i + 1).padStart(2, '0')

// 샘플 사진 = public/studio-assets/samples/thumbs (예시 사진 54장의 400px 썸네일 — 새로 만든 그림·밖 주소 없음)
const SAMPLE = name => `/studio-assets/samples/thumbs/euchs-sample_${name}.webp`
const IMPORT_PHOTOS = [SAMPLE('bag_product_leather-tote_01'), SAMPLE('living_product_steel-tumbler_06'), SAMPLE('living_product_ceramic-mug_03')]
const EDIT_PHOTO = SAMPLE('apparel_product_sweatshirt-white-bg_06')
// 타이핑 글자 수 = CSS d1-type의 steps(25)·25ch와 같아야 한다 (테스트가 대조)
const DEMO_URL = 'https://detail.1688.com/…'
// 상세페이지 모형 (px — 날아가는 거리 --dx·--dy는 이 자리와 칩 자리로 계산한 값)
const PAGE_SECTIONS = [
  { photo: IMPORT_PHOTOS[0], style: { top: '0px', height: '44px', '--drop': '0px', '--dx': '101px', '--dy': '19px', animationDelay: '0s' } },
  { style: { top: '46px', height: '22px', '--drop': '4px', '--dx': '126px', '--dy': '42px', animationDelay: '0.12s' } },
  { photo: EDIT_PHOTO, style: { top: '70px', height: '44px', '--drop': '8px', '--dx': '101px', '--dy': '-51px', animationDelay: '0.24s' } },
  { style: { top: '116px', height: '22px', '--drop': '12px', '--dx': '126px', '--dy': '-28px', animationDelay: '0.36s' } },
]
const CUT_LINES = [45, 69, 115]
const SEND_TO = ['쿠팡', '스마트스토어']

const itemRefs = ref([])
const playing = ref(STEPS.map(() => false))
const restarting = ref(false)
let io = null

function onEnterLeave(entries) {
  for (const e of entries) {
    const i = Number(e.target.dataset.step)
    if (e.isIntersecting && e.intersectionRatio >= 0.35) playing.value[i] = true
    else if (!e.isIntersecting) playing.value[i] = false // 완전히 나가면 멈춤(끝난 모습) → 다시 들어오면 처음부터
  }
}

// 탭이 숨겨졌다 돌아오면 재생 중인 시연을 처음부터 다시 (중간 장면에 멈춘 채로 남지 않게) — 클래스를 한 프레임 뗐다 붙임
function onVisibility() {
  if (document.visibilityState !== 'visible' || !playing.value.some(Boolean)) return
  restarting.value = true
  requestAnimationFrame(() => requestAnimationFrame(() => { restarting.value = false }))
}

onMounted(() => {
  if (props.still) return
  if (typeof IntersectionObserver !== 'function') {
    console.error('[StudioLanding] IntersectionObserver가 없어 단계 시연을 끝난 모습으로 보여요')
    return
  }
  io = new IntersectionObserver(onEnterLeave, { threshold: [0, 0.35] })
  itemRefs.value.forEach(el => io.observe(el))
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  io?.disconnect()
  io = null
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
/* 색은 랜딩 루트(.st-land)의 --l-*·--hero-* 변수를 그대로 쓴다. 판매처 칩 모양(.mk-chip)도 랜딩 첫 화면과 같은 규칙(부모 StudioLandingView) */
.steps { margin-top: 40px; display: grid; grid-template-columns: 1fr; gap: 44px; }
@media (min-width: 1024px) { .steps { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; } }

/* 카드 사이 순서 화살표 — 쌓였을 때 ↓, 한 줄(1024px 이상)이면 → */
.step-item { position: relative; }
.step-item:not(:last-child)::after {
  content: '↓'; position: absolute; z-index: 2; left: 50%; bottom: -37px; width: 30px; height: 30px; margin-left: -15px;
  display: flex; align-items: center; justify-content: center; border-radius: 50%;
  background: #fff; border: 1px solid var(--l-line); color: var(--hero-mid); font-size: 15px; font-weight: 900;
  box-shadow: 0 4px 12px rgba(42, 26, 110, 0.1);
}
@media (min-width: 1024px) {
  .step-item:not(:last-child)::after { content: '→'; left: auto; right: -35px; bottom: auto; top: 50%; margin: -15px 0 0; }
}

.step {
  position: relative; height: 100%; overflow: hidden; border: 1px solid var(--l-line); border-radius: 20px; padding: 28px; background: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.step:hover { transform: translateY(-5px); box-shadow: 0 18px 40px rgba(42, 26, 110, 0.14); }
/* 위쪽 얇은 보라 띠 — 첫 화면 그러데이션 색 */
.step::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 5px; background: linear-gradient(90deg, var(--hero-top), var(--hero-mid), var(--hero-meet)); }
.step-bg-no {
  position: absolute; top: 6px; right: 18px; font-size: 88px; font-weight: 900; line-height: 1; letter-spacing: -0.04em;
  color: var(--hero-mid); opacity: 0.09; pointer-events: none; user-select: none;
}
.step-no, .step-h, .step-p, .demo, .step-tags { position: relative; }
.step-no { font-size: 14px; font-weight: 800; color: var(--l-blue); }
.step-h { margin-top: 8px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--l-ink); }
.step-p { margin-top: 8px; font-size: 15px; line-height: 1.6; color: var(--l-ink-2); word-break: keep-all; }
.step-tags { margin-top: 12px; font-size: 12.5px; font-weight: 600; color: var(--l-ink-2); }

/* 시연 화면 — 첫 화면과 같은 보라 바탕, 안쪽 무대는 고정 240×150 (날아가는 거리를 px로 맞추려고) */
.demo {
  margin-top: 22px; height: 172px; border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(160deg, var(--hero-top), var(--hero-mid) 70%, #6a6fc9);
}
.demo-stage { position: relative; width: 240px; height: 150px; flex: none; }

/* ── 01 가져오기 (4초) ── */
.d1-bar {
  position: absolute; left: 0; right: 0; top: 8px; height: 32px; padding: 0 10px; border-radius: 8px;
  display: flex; align-items: center; gap: 6px; background: #fff; color: var(--hero-mid); box-shadow: 0 6px 16px rgba(20, 10, 60, 0.25);
}
.d1-url {
  display: block; width: 25ch; overflow: hidden; white-space: nowrap; flex: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; color: var(--l-ink);
}
.d1-caret { width: 1.5px; height: 14px; background: var(--hero-mid); opacity: 0; flex: none; }
.d1-tile {
  position: absolute; top: 54px; width: 70px; padding: 5px; border-radius: 10px; background: #fff;
  box-shadow: 0 8px 18px rgba(20, 10, 60, 0.3);
}
.d1-tile:nth-of-type(2) { left: 4px; }
.d1-tile:nth-of-type(3) { left: 85px; }
.d1-tile:nth-of-type(4) { left: 166px; }
.d1-tile img { display: block; width: 60px; height: 60px; border-radius: 6px; object-fit: cover; }
.d1-line { display: block; height: 5px; margin-top: 5px; border-radius: 3px; background: #e6e9f0; }
.d1-line.is-price { width: 55%; background: var(--hero-mid); opacity: 0.55; }
.demo.is-playing .d1-url { animation: d1-type 4s infinite both; }
.demo.is-playing .d1-caret { animation: d1-blink 0.8s steps(1) infinite; }
.demo.is-playing .d1-tile { animation: d1-pop 4s infinite both; }
.demo.is-playing .d1-tile:nth-of-type(3) { animation-delay: 0.25s; }
.demo.is-playing .d1-tile:nth-of-type(4) { animation-delay: 0.5s; }
@keyframes d1-type {
  0%, 6% { width: 0; animation-timing-function: steps(25, end); }
  42%, 90% { width: 25ch; }
  94%, 100% { width: 0; }
}
@keyframes d1-blink { 0% { opacity: 1; } 50% { opacity: 0; } }
@keyframes d1-pop {
  0%, 46% { opacity: 0; transform: translateY(10px) scale(0.6); }
  52% { opacity: 1; transform: translateY(-3px) scale(1.06); }
  56%, 88% { opacity: 1; transform: none; }
  93%, 100% { opacity: 0; transform: translateY(4px) scale(0.96); }
}

/* ── 02 다듬기 (3.6초) ── 끝난 모습 = 흰 배경 사진 + "완성" */
.d2-photo {
  position: absolute; left: 50px; top: 5px; width: 140px; height: 140px; border-radius: 10px; overflow: hidden; background: #fff;
  box-shadow: 0 10px 24px rgba(20, 10, 60, 0.35);
}
.d2-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.d2-before { position: absolute; inset: 0; opacity: 0; }
.d2-tint { position: absolute; inset: 0; background: #e3cda6; mix-blend-mode: multiply; }
.d2-stamp {
  position: absolute; top: 10px; right: 8px; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: #e11d2e; color: #fff; font-size: 13px; font-weight: 900; transform: rotate(-12deg);
}
.d2-band {
  position: absolute; left: 0; right: 0; bottom: 12px; padding: 3px 0; text-align: center;
  background: #fde047; color: #d11a2a; font-size: 14px; font-weight: 900; letter-spacing: 0.04em;
}
.d2-tag {
  position: absolute; top: 8px; left: 8px; padding: 2px 7px; border-radius: 6px; font-size: 11px; font-weight: 800;
  background: #fff; color: var(--l-ink); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
.d2-tag.is-before { opacity: 0; }
.d2-tag.is-after { color: var(--l-blue); }
.d2-sweep { position: absolute; left: 50px; top: 5px; width: 0; height: 140px; opacity: 0; pointer-events: none; }
.d2-bar {
  position: absolute; top: -5px; bottom: -5px; left: -1.5px; width: 3px; border-radius: 2px; background: #fff;
  box-shadow: 0 0 10px 3px rgba(165, 180, 252, 0.9);
}
.d2-eraser {
  position: absolute; top: 50%; left: -14px; width: 28px; height: 28px; margin-top: -14px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; background: #fff; color: var(--hero-mid);
  box-shadow: 0 4px 12px rgba(20, 10, 60, 0.35);
}
.demo.is-playing .d2-before { animation: d2-before 3.6s infinite both; }
.demo.is-playing .d2-sweep { animation: d2-sweep 3.6s infinite both; }
.demo.is-playing .d2-tag.is-before { animation: d2-tag-before 3.6s infinite both; }
.demo.is-playing .d2-tag.is-after { animation: d2-tag-after 3.6s infinite both; }
@keyframes d2-before {
  0%, 16% { clip-path: inset(0 0 0 0); opacity: 1; animation-timing-function: ease-in-out; }
  62%, 88% { clip-path: inset(0 0 0 100%); opacity: 1; }
  89% { clip-path: inset(0 0 0 0); opacity: 0; }
  100% { clip-path: inset(0 0 0 0); opacity: 1; }
}
@keyframes d2-sweep {
  0%, 14% { transform: translateX(0); opacity: 0; }
  16% { transform: translateX(0); opacity: 1; animation-timing-function: ease-in-out; }
  62% { transform: translateX(140px); opacity: 1; }
  66%, 100% { transform: translateX(140px); opacity: 0; }
}
@keyframes d2-tag-before { 0%, 56% { opacity: 1; } 60%, 94% { opacity: 0; } 100% { opacity: 1; } }
@keyframes d2-tag-after {
  0%, 60% { opacity: 0; transform: translateY(-4px); }
  66%, 88% { opacity: 1; transform: none; }
  92%, 100% { opacity: 0; }
}

/* ── 03 올리기 (4.2초) ── 끝난 모습 = 페이지 그대로 + 두 칩에 ✓ */
.d3-page { position: absolute; left: 22px; top: 6px; width: 74px; height: 138px; }
.d3-page::before { content: ''; position: absolute; inset: -4px; border-radius: 6px; background: rgba(255, 255, 255, 0.12); }
.d3-sec { position: absolute; left: 0; width: 74px; border-radius: 3px; background: #fff; overflow: hidden; padding: 5px 6px; }
.d3-sec.is-photo { padding: 0; }
.d3-sec img { display: block; width: 100%; height: 100%; object-fit: cover; }
.d3-line { display: block; height: 4px; border-radius: 2px; background: #d9dce8; }
.d3-line + .d3-line { margin-top: 4px; }
.d3-line.is-short { width: 60%; background: var(--hero-mid); opacity: 0.5; }
.d3-cut { position: absolute; left: -6px; right: -6px; height: 0; border-top: 1.5px dashed #fff; opacity: 0; }
.d3-chip { position: absolute; left: 128px; }
.d3-chip.is-1 { top: 34px; }
.d3-chip.is-2 { top: 92px; }
.d3-check {
  width: 15px; height: 15px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: #16a34a; color: #fff;
}
.demo.is-playing .d3-sec { animation: d3-slice 4.2s infinite both; }
.demo.is-playing .d3-cut { animation: d3-cut 4.2s infinite both; }
.demo.is-playing .d3-chip { animation: d3-chip 4.2s infinite both; }
.demo.is-playing .d3-check { animation: d3-check 4.2s infinite both; }
.demo.is-playing .d3-chip.is-2, .demo.is-playing .d3-chip.is-2 .d3-check { animation-delay: 0.36s; }
@keyframes d3-slice {
  0%, 12% { transform: none; opacity: 1; }
  24%, 32% { transform: translateY(var(--drop)); opacity: 1; }
  52% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 1; }
  56% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
  57%, 66% { transform: none; opacity: 0; }
  76%, 100% { transform: none; opacity: 1; } /* ✓가 떠 있는 동안 페이지가 제자리에 돌아옴 = 끝난 모습 */
}
@keyframes d3-cut { 0%, 8% { opacity: 0; } 14%, 30% { opacity: 1; } 36%, 100% { opacity: 0; } }
@keyframes d3-chip {
  0%, 50% { background-color: rgba(255, 255, 255, 0.08); }
  56%, 90% { background-color: rgba(255, 255, 255, 0.28); }
  96%, 100% { background-color: rgba(255, 255, 255, 0.08); }
}
@keyframes d3-check {
  0%, 51% { opacity: 0; transform: scale(0); }
  56% { opacity: 1; transform: scale(1.25); }
  60%, 90% { opacity: 1; transform: scale(1); }
  95%, 100% { opacity: 0; transform: scale(0); }
}

/* 움직임 줄이기 = 끝난 모습 한 장면 (is-playing이 붙어도 멈춤) */
@media (prefers-reduced-motion: reduce) {
  .demo * { animation: none !important; }
  .step { transition: none; }
  .step:hover { transform: none; }
}
</style>
