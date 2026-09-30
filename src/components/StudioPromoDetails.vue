<template>
  <!-- 홈 스튜디오 소개 ②~⑤ (2026-09-30) — 알림 띠(StudioPromoBand) 바로 아래. 색 = 띠의 코랄·주황에 맞춘 연한 살구 바탕 -->
  <section ref="root" class="more" :class="{ 'is-paused': paused }" aria-labelledby="studio-more-flow" data-studio-more>
    <!-- ② 한 번 만들고, 여러 곳에 보내요 -->
    <div class="wrap">
      <p class="kicker">EUCHS STUDIO</p>
      <h3 id="studio-more-flow" class="h">한 번 만들고, 여러 곳에 보내요</h3>
      <div class="flow" data-studio-flow>
        <div class="node">
          <span class="node-ic"><Link2 :size="22" :stroke-width="2.2" /></span>
          <b>1688 상품 주소</b>
          <span class="url">detail.1688.com/offer/…</span>
        </div>
        <span class="arrow" aria-hidden="true"><i /></span>
        <div class="node node-main">
          <span class="node-ic is-main"><Sparkles :size="22" :stroke-width="2.2" /></span>
          <b>EUCHS 스튜디오</b>
          <span class="tags"><em>글자 지우기</em><em>템플릿</em><em>사이즈표</em></span>
        </div>
        <span class="arrow" aria-hidden="true"><i /></span>
        <ul class="node node-brands" aria-label="판매처">
          <li v-for="b in BRANDS" :key="b.key" class="mini" :title="b.name" :data-flow-brand="b.key">
            <img v-if="b.src" :src="b.src" :width="b.w" :height="b.h" :alt="b.name" loading="lazy" decoding="async" />
            <b v-else>{{ b.name }}</b>
          </li>
        </ul>
      </div>
      <ol class="steps">
        <li><span>1</span>1688 상품 주소를 붙여넣으면 사진과 옵션을 한 번에 가져와요.</li>
        <li><span>2</span>사진 속 글자를 지우고, 템플릿으로 상세페이지 초안을 만들어요.</li>
        <li><span>3</span>완성한 페이지를 연결한 판매처로 바로 보내요.</li>
      </ol>
    </div>

    <!-- ③ 편집기 미리보기 — 실제 편집기 화면 녹화 3개 (소리 없음·자동 재생·반복·컨트롤 없음) -->
    <div class="wrap demo" data-studio-demo>
      <h3 class="h">스튜디오에서 이렇게 만들어요</h3>
      <div class="demo-grid">
        <div class="player">
          <div class="tabs" role="tablist" aria-label="편집기 영상">
            <button
              v-for="(v, k) in VIDEOS" :key="v.key" type="button" role="tab" class="tab" :class="{ on: k === cur }"
              :aria-selected="k === cur" :data-demo-tab="v.key" @click="go(k)"
            >{{ v.label }}</button>
          </div>
          <div class="screen-box">
            <!-- 보일 때만 그 영상 하나를 불러온다(active) — 다른 영상은 탭·화살표를 누를 때 -->
            <video
              v-if="active" ref="videoEl" :key="VIDEOS[cur].key" class="vid" :poster="VIDEOS[cur].poster"
              muted autoplay loop playsinline disablepictureinpicture preload="auto" :aria-label="VIDEOS[cur].label" :data-demo-video="VIDEOS[cur].key"
            >
              <source :src="VIDEOS[cur].webm" type="video/webm" />
              <source :src="VIDEOS[cur].mp4" type="video/mp4" />
            </video>
            <img v-else class="vid" :src="VIDEOS[cur].poster" width="1280" height="720" alt="" loading="lazy" decoding="async" />
            <button type="button" class="nav prev" aria-label="이전 영상" data-demo-prev @click="go(cur - 1)"><ChevronLeft :size="22" :stroke-width="2.4" /></button>
            <button type="button" class="nav next" aria-label="다음 영상" data-demo-next @click="go(cur + 1)"><ChevronRight :size="22" :stroke-width="2.4" /></button>
          </div>
        </div>
        <ul class="feats">
          <li v-for="f in FEATURES" :key="f.key" class="feat" :data-demo-feature="f.key">
            <span class="feat-ic"><component :is="f.icon" :size="20" :stroke-width="2.2" /></span>
            <span><b>{{ f.title }}<small v-if="f.note" class="more">{{ f.note }}</small></b><em>{{ f.desc }}</em></span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ④ 숫자 한 줄 -->
    <div class="wrap">
      <ul class="stats" data-studio-stats>
        <li data-studio-stat-templates><b>100+</b>무료 템플릿<small class="more">계속 추가 예정</small></li>
        <li><b>10</b>판매처</li>
        <li><b>무료</b>이유씨 구매 고객</li>
      </ul>
    </div>

    <!-- ⑤ 마지막 버튼 — 띠의 [스튜디오 둘러보기]와 같은 곳 -->
    <div class="wrap end">
      <router-link :to="STUDIO_PATH" class="cta" data-studio-more-cta @click="trackStudioCta('home_band_more')">스튜디오 둘러보기 →</router-link>
    </div>
  </section>
</template>

<script setup>
/**
 * 홈 스튜디오 소개 ②~⑤. 영상 = public/studio-demo/ (실제 편집기를 가짜 상품·테스트 계정으로 녹화 — 고객 정보·키 없음)
 * 영상 규칙: 소리 없음·자동 재생·반복·컨트롤 바 없음. 이 칸이 화면 가까이 올 때 지금 영상 하나만 불러오고(active),
 *   다른 영상은 탭·화살표를 누를 때 불러온다(폰에서도 첫 영상만 먼저). 화면 밖·숨은 탭이면 멈춤. 움직임 줄이기면 자동 재생 없이 포스터
 */
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Link2, Sparkles, ChevronLeft, ChevronRight, Eraser, LayoutTemplate, Ruler, Send } from 'lucide-vue-next'
import { STUDIO_PATH, trackStudioCta } from '@/lib/homeCta'
import { HOME_BRANDS, brandLogo } from '@/data/homeStudioBrands'

const BRANDS = HOME_BRANDS.map(b => ({ ...b, src: brandLogo(b) }))
const D = '/studio-demo/'
const VIDEOS = [
  { key: 'oneclick', label: '1688 링크로 초안', mp4: `${D}oneclick.mp4`, webm: `${D}oneclick.webm`, poster: `${D}oneclick-poster.jpg` },
  { key: 'erase', label: 'AI 글자 지우기', mp4: `${D}erase.mp4`, webm: `${D}erase.webm`, poster: `${D}erase-poster.jpg` },
  { key: 'send', label: '템플릿 → 판매처 보내기', mp4: `${D}send.mp4`, webm: `${D}send.webm`, poster: `${D}send-poster.jpg` },
]
const FEATURES = [
  { key: 'erase', icon: Eraser, title: 'AI 글자 지우기', desc: '사진 속 글자를 네모로 감싸면 AI가 지워요' },
  { key: 'templates', icon: LayoutTemplate, title: '무료 템플릿 100+', note: '계속 추가 예정', desc: '고르면 내 사진이 알맞은 자리에 들어가요' },
  { key: 'size', icon: Ruler, title: '사이즈표·소재·세탁 안내 칸', desc: '표와 안내 칸을 눌러서 바로 채워요' },
  { key: 'send', icon: Send, title: '판매처로 바로 보내기', desc: '완성한 페이지를 연결한 판매처로 보내요' },
]

const root = ref(null)
const videoEl = ref(null)
const cur = ref(0)
const active = ref(false)  // 영상 불러오기 시작 (칸이 화면 가까이 왔을 때)
const paused = ref(true)
let visible = false
let reduced = false
let io = null

function playNow() {
  const v = videoEl.value
  if (!v) return
  v.muted = true // 자동 재생 규칙 — 속성만으로는 막히는 브라우저가 있다
  if (reduced || !visible || document.visibilityState !== 'visible') { v.pause(); return }
  const p = v.play()
  if (p?.catch) p.catch(e => console.warn('[StudioPromoDetails] 영상 자동 재생이 막힘:', e?.name || e))
}
async function go(k) {
  cur.value = (k + VIDEOS.length) % VIDEOS.length
  active.value = true
  await nextTick()
  playNow()
}
function sync() {
  paused.value = !(visible && document.visibilityState === 'visible')
  if (videoEl.value) { if (paused.value || reduced) videoEl.value.pause(); else playNow() }
}
function onVisibility() { sync() }

onMounted(() => {
  reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.addEventListener('visibilitychange', onVisibility)
  if (typeof IntersectionObserver !== 'function') { visible = true; active.value = true; nextTick(sync); return }
  io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (en.target.dataset.demoWatch === 'near' && en.isIntersecting && !active.value) { active.value = true; nextTick(sync) }
      if (en.target.dataset.demoWatch === 'seen') { visible = en.isIntersecting; sync() }
    }
  }, { rootMargin: '300px 0px', threshold: [0, 0.2] })
  const box = root.value.querySelector('[data-studio-demo]')
  box.dataset.demoWatch = 'near'
  root.value.dataset.demoWatch = 'seen'
  io.observe(box)
  io.observe(root.value)
})
onBeforeUnmount(() => {
  io?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.more {
  --coral: #ff6b4a; --orange: #ff9d45; --ink: #1f2433; --sub: #5d6272;
  background: linear-gradient(180deg, #fff1ea 0%, #fff8f3 55%, #ffffff 100%);
  padding: 56px 7% 64px; color: var(--ink);
}
.wrap { max-width: 1180px; margin: 0 auto; }
.wrap + .wrap { margin-top: 64px; }
.kicker { font-size: 13px; font-weight: 800; letter-spacing: 0.12em; color: var(--coral); margin: 0 0 8px; }
.h { font-size: clamp(22px, 2.4vw, 34px); font-weight: 900; letter-spacing: -0.02em; margin: 0 0 24px; word-break: keep-all; }

/* ② 흐름 그림 */
.flow { display: grid; grid-template-columns: minmax(0, 1fr) 64px minmax(0, 1.1fr) 64px minmax(0, 1.4fr); align-items: center; gap: 0; }
.node {
  background: #fff; border-radius: 20px; padding: 22px 20px; min-height: 150px; display: flex; flex-direction: column; justify-content: center; gap: 8px;
  box-shadow: 0 10px 30px rgba(255, 107, 74, 0.12), 0 0 0 1px rgba(255, 107, 74, 0.12);
}
.node b { font-size: 17px; font-weight: 800; }
.node-ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: #fff1ea; color: var(--coral); }
.node-ic.is-main { background: linear-gradient(135deg, var(--coral), var(--orange)); color: #fff; }
.node-main { background: linear-gradient(160deg, #fff, #fff4ec); box-shadow: 0 14px 34px rgba(255, 107, 74, 0.22), 0 0 0 2px rgba(255, 107, 74, 0.35); }
.url { display: inline-block; align-self: flex-start; font-size: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--sub); background: #f5f6f8; border-radius: 999px; padding: 5px 10px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tags em { font-style: normal; font-size: 12px; font-weight: 700; color: #b8452d; background: #ffe8de; border-radius: 999px; padding: 4px 9px; }
.node-brands { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; list-style: none; margin: 0; }
.mini { aspect-ratio: 1; border-radius: 50%; background: #fff; display: grid; place-items: center; box-shadow: 0 3px 10px rgba(31, 36, 51, 0.1), 0 0 0 1px #f0e6e1; }
.mini img { width: 70%; height: auto; max-height: 56%; object-fit: contain; }
.mini b { max-width: 86%; font-size: 10.5px; font-weight: 800; color: #2b2f3a; text-align: center; line-height: 1.15; word-break: keep-all; letter-spacing: -0.04em; }
.arrow { position: relative; height: 4px; margin: 0 8px; background-image: linear-gradient(90deg, var(--coral) 50%, transparent 50%); background-size: 12px 4px; border-radius: 2px; }
.arrow::after { content: ''; position: absolute; right: -6px; top: 50%; width: 10px; height: 10px; border-top: 3px solid var(--coral); border-right: 3px solid var(--coral); transform: translateY(-50%) rotate(45deg); }
.arrow i { position: absolute; left: 0; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: var(--orange); box-shadow: 0 0 0 4px rgba(255, 157, 69, 0.25); animation: travel 2.4s ease-in-out infinite; }
@keyframes travel { 0% { left: 0; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: calc(100% - 10px); opacity: 0; } }
.steps { list-style: none; margin: 26px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.steps li { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; font-weight: 600; line-height: 1.55; color: var(--ink); word-break: keep-all; }
.steps span { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 800; color: #fff; background: var(--coral); margin-top: 1px; }

/* ③ 영상 */
.demo-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; align-items: center; }
.tabs { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.tab { font-size: 14px; font-weight: 700; color: var(--sub); background: #fff; border-radius: 999px; padding: 9px 16px; box-shadow: 0 0 0 1px #f0e2da; transition: background 0.2s ease, color 0.2s ease; }
.tab.on { background: var(--ink); color: #fff; box-shadow: none; }
.tab:focus-visible, .nav:focus-visible, .cta:focus-visible { outline: 3px solid var(--coral); outline-offset: 2px; }
.screen-box { position: relative; border-radius: 16px; overflow: hidden; background: #0c0d10; aspect-ratio: 16 / 9; box-shadow: 0 24px 50px rgba(31, 36, 51, 0.22), 0 0 0 6px #fff; }
.vid { display: block; width: 100%; height: 100%; object-fit: cover; }
.nav { position: absolute; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: rgba(255, 255, 255, 0.92); color: var(--ink); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25); transition: transform 0.15s ease; }
.nav:hover { transform: translateY(-50%) scale(1.06); }
.prev { left: 12px; }
.next { right: 12px; }
.feats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.feat { display: flex; gap: 12px; align-items: flex-start; background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 6px 20px rgba(255, 107, 74, 0.1), 0 0 0 1px rgba(255, 107, 74, 0.12); }
.feat-ic { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: #fff1ea; color: var(--coral); }
.feat b { display: block; font-size: 15px; font-weight: 800; }
.feat em { display: block; font-style: normal; font-size: 13px; color: var(--sub); line-height: 1.5; margin-top: 2px; word-break: keep-all; }

/* ④ 숫자 한 줄 */
.stats { list-style: none; margin: 0; padding: 22px 12px; display: grid; grid-template-columns: repeat(3, 1fr); background: linear-gradient(100deg, #ff6b6b, #ffa64d); border-radius: 20px; color: #fff; }
.stats li { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 14px; font-weight: 700; color: #fff3ee; }
.stats li + li { border-left: 1px solid rgba(255, 255, 255, 0.35); }
.stats b { font-size: clamp(26px, 3vw, 40px); font-weight: 900; color: #fff; letter-spacing: -0.02em; line-height: 1.1; }
.stats .more { font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.8); }
.feat .more { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--sub); }

/* ⑤ 마지막 버튼 */
.end { display: flex; justify-content: center; }
.wrap.end { margin-top: 36px; }
.cta { display: inline-flex; align-items: center; justify-content: center; min-height: 54px; padding: 14px 34px; border-radius: 14px; background: #141830; color: #fff; font-size: 17px; font-weight: 800; transition: transform 0.15s ease, filter 0.15s ease; }
.cta:hover { filter: brightness(1.15); }
.cta:active { transform: scale(0.97); }

/* 화면 밖·숨은 탭: 움직임 멈춤 */
.is-paused .arrow i { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .arrow i { animation: none; opacity: 0; }
}

/* 761~1279px: 오른쪽 아래 QuickMenu 자리 · 1280px 이상: 오른쪽 9:16 영상 창 자리 (띠와 같은 여백) */
@media (min-width: 760px) { .more { padding-right: 64px; } }
@media (min-width: 1280px) { .more { padding-right: 180px; } }
@media (max-width: 1099.98px) {
  .demo-grid { grid-template-columns: 1fr; }
  .feats { display: grid; grid-template-columns: 1fr 1fr; }
}
/* 폰(760px 미만): 흐름은 세로로 · 점 움직임 없음 · 설명·기능은 한 줄씩 */
@media (max-width: 759.98px) {
  .more { padding: 40px 16px 48px; }
  .wrap + .wrap { margin-top: 44px; }
  .flow { grid-template-columns: 1fr; gap: 0; }
  .node { min-height: 0; padding: 18px; }
  .arrow { width: 4px; height: 34px; margin: 6px auto; background-image: linear-gradient(180deg, var(--coral) 50%, transparent 50%); background-size: 4px 12px; }
  .arrow::after { right: auto; left: 50%; top: auto; bottom: -6px; transform: translateX(-50%) rotate(135deg); }
  .arrow i { display: none; }
  .steps { grid-template-columns: 1fr; gap: 10px; }
  .tab { font-size: 13px; padding: 8px 12px; }
  .nav { width: 36px; height: 36px; }
  .prev { left: 8px; }
  .next { right: 8px; }
  .feats { grid-template-columns: 1fr; }
  .feat { padding: 14px; }
  .stats { padding: 18px 6px; }
  .stats li { font-size: 12.5px; text-align: center; }
  .cta { width: 100%; }
}
</style>
